import json
import time
import logging
import uuid
import schedule
import subprocess
from paho.mqtt import client as mqtt_client
from datetime import datetime

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("SchedulerService") # Use a named logger for clarity

# --- Startup Banner ---
def print_startup_banner():
    """Print standardized startup banner"""
    print("\n" + "="*50)
    print("======= Automation Schedule =======")
    print("Initializing System...")
    print("="*50)

def print_success_banner():
    """Print success status banner"""
    print("\n" + "="*50)
    print("======= Automation Schedule =======")
    print("Success To Running")
    print("")

def print_broker_status(crud_status=False, control_status=False):
    """Print MQTT broker connection status"""
    if crud_status:
        print("MQTT Broker CRUD is Running")
    else:
        print("MQTT Broker CRUD connection failed")
    
    if control_status:
        print("MQTT Broker Control is Running")
    else:
        print("MQTT Broker Control connection failed")
    
    print("\n" + "="*34)
    print("Log print Data")
    print("")

def log_simple(message, level="INFO"):
    """Simple logging without timestamp for cleaner output"""
    if level == "ERROR":
        print(f"[ERROR] {message}")
    elif level == "SUCCESS":
        print(f"[OK] {message}")
    elif level == "WARNING":
        print(f"[WARN] {message}")
    else:
        print(f"[INFO] {message}")

# --- Global variables for configuration and MQTT clients ---
config = {}
installed_devices = []
client_control = None # For sending control commands to devices
client_crud = None    # For handling configuration CRUD operations
client_error_logger = None # Dedicated client for sending error logs to localhost

# --- Connection Status Tracking ---
crud_broker_connected = False
control_broker_connected = False

# --- Configuration File Paths ---
mqtt_config_file = '../MODULAR_I2C/JSON/Config/mqtt_config.json'
config_file = './JSON/automationSchedulerConfig.json'
installed_devices_file = '../MODULAR_I2C/JSON/Config/installed_devices.json'

# --- Error severity levels ---
ERROR_TYPE_CRITICAL = "CRITICAL"
ERROR_TYPE_MAJOR = "MAJOR"
ERROR_TYPE_MINOR = "MINOR"
ERROR_TYPE_WARNING = "WARNING" # Added for less severe issues

# --- Error Log Helper Function (to localhost) ---
ERROR_LOG_BROKER = "localhost"
ERROR_LOG_PORT = 1883
ERROR_LOG_TOPIC = "subrack/error/log"
ERROR_LOG_CLIENT_ID = f'scheduler-error-logger-{uuid.uuid4()}' # Unique ID for error logger

def on_error_logger_connect(client, userdata, flags, rc):
    if rc == 0:
        log_simple("Error Logger MQTT broker connected", "SUCCESS")
    else:
        log_simple(f"Error Logger MQTT broker connection failed (code {rc})", "ERROR")

def on_error_logger_disconnect(client, userdata, rc):
    if rc != 0:
        log_simple("Error Logger MQTT broker disconnected", "WARNING")
    else:
        log_simple("Error Logger disconnected normally", "INFO")

def init_error_logger_client():
    """Initializes and connects the dedicated error logging MQTT client."""
    global client_error_logger
    try:
        client_error_logger = mqtt_client.Client(ERROR_LOG_CLIENT_ID)
        client_error_logger.on_connect = on_error_logger_connect
        client_error_logger.on_disconnect = on_error_logger_disconnect
        client_error_logger.connect(ERROR_LOG_BROKER, ERROR_LOG_PORT, keepalive=60)
        client_error_logger.loop_start()
        logger.info(f"Initialized dedicated error logger client to {ERROR_LOG_BROKER}:{ERROR_LOG_PORT}")
    except Exception as e:
        logger.critical(f"Failed to initialize or connect dedicated error logger: {e}", exc_info=True)
        # Cannot send error log if the logger itself fails to initialize

# Helper function to send error log to MQTT
def send_error_log(function_name, error_detail, error_type, additional_info=None):
    """
    Sends an error message to the centralized error log service via MQTT.
    Uses the dedicated client_error_logger.
    """
    error_message = {
        "data": f"[{function_name}] {error_detail}",
        "type": error_type.upper(),
        "source": "SchedulerService",
        "Timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    if additional_info:
        error_message.update(additional_info)

    try:
        if client_error_logger and client_error_logger.is_connected():
            client_error_logger.publish(ERROR_LOG_TOPIC, json.dumps(error_message))
            logger.debug(f"Error log sent: {error_message}")
        else:
            logger.error(f"Error logger MQTT client not connected, unable to send log: {error_message}")
    except Exception as e:
        logger.error(f"Failed to publish error log (internal error): {e}", exc_info=True)
    
    # Also log to console for immediate visibility
    logger.error(f"Error in {function_name} ({error_type}): {error_detail}")

# --- Load MQTT configuration from file ---
def load_mqtt_config():
    try:
        with open(mqtt_config_file, 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        error_detail = f"MQTT config file not found: {mqtt_config_file}"
        send_error_log("load_mqtt_config", error_detail, ERROR_TYPE_CRITICAL)
        raise SystemExit(error_detail + ". Please create it.")
    except json.JSONDecodeError as e:
        error_detail = f"Error decoding MQTT config file: {e}"
        send_error_log("load_mqtt_config", error_detail, ERROR_TYPE_CRITICAL, {"file": mqtt_config_file})
        raise SystemExit(error_detail + ". Please check it.")
    except Exception as e:
        error_detail = f"Unexpected error loading MQTT config: {e}"
        send_error_log("load_mqtt_config", error_detail, ERROR_TYPE_CRITICAL, {"file": mqtt_config_file})
        raise SystemExit(error_detail)

mqtt_config = load_mqtt_config()

# Broker configurations
broker_control = mqtt_config.get('broker_address', 'localhost')
port = int(mqtt_config.get('broker_port', 1883))
username = mqtt_config.get("username", "")
password = mqtt_config.get("password", "")
topic_command = "command_control_scheduler"
topic_response = "response_control_scheduler"
restart_topic = "service/restart" # Not used directly for sending, but for general knowledge

client_id_control = f'python-mqtt-control-{uuid.uuid4()}'
client_id_crud = f'python-mqtt-crud-{uuid.uuid4()}'

# --- Load and save configuration functions ---
def load_config():
    global config
    try:
        with open(config_file, 'r') as file:
            config = json.load(file)
        logger.info(f"Configuration loaded from {config_file}")
        # Ensure 'devices' and 'autoControl' keys exist for robustness
        if 'devices' not in config:
            config['devices'] = []
            logger.warning("Config missing 'devices' key, initializing as empty list.")
            send_error_log("load_config", "Config missing 'devices' key.", ERROR_TYPE_WARNING, {"file": config_file})
        if 'autoControl' not in config:
            config['autoControl'] = True # Default to True if not present
            logger.warning("Config missing 'autoControl' key, initializing as True.")
            send_error_log("load_config", "Config missing 'autoControl' key.", ERROR_TYPE_WARNING, {"file": config_file})
    except FileNotFoundError:
        logger.warning(f"Config file not found: {config_file}. Creating a default config.")
        config = {"autoControl": True, "devices": []}
        save_config(config) # Create the file
        send_error_log("load_config", f"Config file not found, created default: {config_file}", ERROR_TYPE_WARNING, {"file": config_file})
    except json.JSONDecodeError as e:
        send_error_log("load_config", f"Failed to load config (JSON decode error): {e}", ERROR_TYPE_CRITICAL, {"file": config_file})
        logger.error(f"Failed to load config (JSON decode error): {e}. Using default empty config.")
        config = {"autoControl": True, "devices": []} # Fallback to default empty config
    except Exception as e:
        send_error_log("load_config", f"Failed to load config: {e}", ERROR_TYPE_CRITICAL, {"file": config_file})
        logger.error(f"Failed to load config: {e}")

def load_installed_devices():
    global installed_devices
    try:
        with open(installed_devices_file, 'r') as file:
            installed_devices = json.load(file)
        logger.info(f"Installed devices loaded from {installed_devices_file}")
    except FileNotFoundError:
        logger.warning(f"Installed devices file not found: {installed_devices_file}. Using empty device list.")
        installed_error_detail = f"Installed devices file not found: {installed_devices_file}"
        send_error_log("load_installed_devices", installed_error_detail, ERROR_TYPE_WARNING, {"file": installed_devices_file})
        installed_devices = []
    except json.JSONDecodeError as e:
        send_error_log("load_installed_devices", f"Failed to load installed devices (JSON decode error): {e}", ERROR_TYPE_MAJOR, {"file": installed_devices_file})
        logger.error(f"Failed to load installed devices (JSON decode error): {e}. Using empty device list.")
        installed_devices = []
    except Exception as e:
        send_error_log("load_installed_devices", f"Failed to load installed devices: {e}", ERROR_TYPE_MAJOR, {"file": installed_devices_file})
        logger.error(f"Failed to load installed devices: {e}")

def save_config(current_config):
    try:
        with open(config_file, 'w') as file:
            json.dump(current_config, file, indent=4)
        logger.info(f"Configuration saved to {config_file}")
    except Exception as e:
        send_error_log("save_config", f"Failed to save config: {e}", ERROR_TYPE_MAJOR, {"file": config_file})
        logger.error(f"Failed to save config: {e}")

def reload_schedule(client_control):
    try:
        load_config()  # Reload the configuration
        logger.info("Reloading schedule...")
        schedule.clear()  # Clear existing schedule
        schedule_control(client_control)  # Reschedule based on updated config
    except Exception as e:
        send_error_log("reload_schedule", f"Failed to reload schedule: {e}", ERROR_TYPE_MINOR)
        logger.error(f"Failed to reload schedule: {e}")

def restart_service():
    try:
        # Note: This command assumes your service is named 'scheduler_control.service'
        # and the user running this script has sudo privileges for systemctl.
        result = subprocess.run(["sudo", "systemctl", "restart", "scheduler_control.service"], check=True, capture_output=True, text=True)
        logger.info(f"Service restarted successfully. Output: {result.stdout.strip()}")
    except subprocess.CalledProcessError as e:
        error_detail = f"Failed to restart service: {e.stderr.strip()}"
        send_error_log("restart_service", error_detail, ERROR_TYPE_CRITICAL, {"command_output": e.stderr.strip()})
        logger.error(error_detail)
    except Exception as e:
        send_error_log("restart_service", f"Unexpected error during service restart: {e}", ERROR_TYPE_CRITICAL)
        logger.error(f"Unexpected error during service restart: {e}")

# --- MQTT Client Callbacks ---
def on_connect_crud(client, userdata, flags, rc):
    global crud_broker_connected
    try:
        if rc == 0:
            crud_broker_connected = True
            log_simple("CRUD MQTT broker connected", "SUCCESS")
            client.subscribe(topic_command)
            client.subscribe(topic_response)
        else:
            crud_broker_connected = False
            connect_reason = mqtt_client.connack_string(rc)
            log_simple(f"CRUD MQTT broker connection failed (code {rc})", "ERROR")
            raise ConnectionError(f"Failed to connect to CRUD broker, return code {rc}: {connect_reason}")
    except Exception as e:
        send_error_log("on_connect_crud", f"Connection error: {e}", ERROR_TYPE_CRITICAL, {"return_code": rc})

def on_disconnect_crud(client, userdata, rc):
    global crud_broker_connected
    crud_broker_connected = False
    if rc != 0:
        log_simple("CRUD MQTT broker disconnected", "WARNING")
        send_error_log("on_disconnect_crud", f"Unexpected disconnect: {rc}", ERROR_TYPE_WARNING, {"return_code": rc})
    else:
        log_simple("CRUD client disconnected normally", "INFO")

def on_connect_control(client, userdata, flags, rc):
    global control_broker_connected
    try:
        if rc == 0:
            control_broker_connected = True
            log_simple("Control MQTT broker connected", "SUCCESS")
        else:
            control_broker_connected = False
            connect_reason = mqtt_client.connack_string(rc)
            log_simple(f"Control MQTT broker connection failed (code {rc})", "ERROR")
            raise ConnectionError(f"Failed to connect to Control broker, return code {rc}: {connect_reason}")
    except Exception as e:
        send_error_log("on_connect_control", f"Connection error: {e}", ERROR_TYPE_CRITICAL, {"return_code": rc})

def on_disconnect_control(client, userdata, rc):
    global control_broker_connected
    control_broker_connected = False
    if rc != 0:
        log_simple("Control MQTT broker disconnected", "WARNING")
        send_error_log("on_disconnect_control", f"Unexpected disconnect: {rc}", ERROR_TYPE_WARNING, {"return_code": rc})
    else:
        log_simple("Control client disconnected normally", "INFO")

# --- MQTT Connection Function ---
def connect_mqtt(client_id, broker, port, username="", password="", on_connect_callback=None, on_disconnect_callback=None):
    try:
        client = mqtt_client.Client(client_id)
        if username and password:
            client.username_pw_set(username, password)
        if on_connect_callback:
            client.on_connect = on_connect_callback
        if on_disconnect_callback:
            client.on_disconnect = on_disconnect_callback
        
        client.reconnect_delay_set(min_delay=1, max_delay=120) # Add reconnect delay
        client.connect(broker, port, keepalive=60)
        return client
    except Exception as e:
        error_detail = f"Failed to connect to MQTT broker {broker}:{port} - {e}"
        send_error_log("connect_mqtt", error_detail, ERROR_TYPE_CRITICAL, {"broker": broker, "port": port})
        logger.error(error_detail)
        return None

def connect_mqtt_control():
    return connect_mqtt(client_id_control, broker_control, port, username, password, on_connect_control, on_disconnect_control)

def connect_mqtt_crud():
    return connect_mqtt(client_id_crud, broker_control, port, username, password, on_connect_crud, on_disconnect_crud)

# --- Message Handling ---
def on_message_crud(client, userdata, msg):
    try:
        message = json.loads(msg.payload.decode())
        handle_message(client, message)
    except json.JSONDecodeError as e:
        send_error_log("on_message_crud", f"JSON decode error: {e}", ERROR_TYPE_MINOR, {"topic": msg.topic, "payload_preview": msg.payload.decode()[:100]})
    except Exception as e:
        send_error_log("on_message_crud", f"Unhandled error: {e}", ERROR_TYPE_MAJOR, {"topic": msg.topic})

def handle_message(client, message):
    action = message.get('action')
    try:
        if action == 'get':
            publish_crud(client, json.dumps(config), topic_response)
        elif action in ['set', 'add', 'delete', 'update_autoControl']:
            modify_config(client, message)
            publish_response(client, f"{action.capitalize()} successful, restarting service...", True)
            restart_service() # This will cause the service to reload schedule on startup
        elif action == 'get_devices':
            send_available_devices(client)
        else:
            raise ValueError(f"Unknown action: {action}")
    except ValueError as e:
        send_error_log("handle_message", f"Invalid action or missing data: {e}", ERROR_TYPE_WARNING, {"action": action})
        publish_response(client, f"Failed to perform action '{action}': {str(e)}", False)
    except Exception as e:
        send_error_log("handle_message", f"Unhandled error processing message: {e}", ERROR_TYPE_MAJOR, {"action": action})
        publish_response(client, f"Failed to perform action '{action}' due to an internal error.", False)

def send_available_devices(client):
    try:
        if not installed_devices:
            logger.warning("No installed devices loaded. Sending empty list.")
            publish_crud(client, json.dumps({'availableDevices': []}), topic_response)
            send_error_log("send_available_devices", "No installed devices loaded.", ERROR_TYPE_WARNING)
            return

        available_devices_list = []
        for device in installed_devices:
            try:
                # Basic validation for required keys
                if not all(key in device.get('profile', {}) for key in ['name', 'part_number']) or \
                   not all(key in device.get('protocol_setting', {}) for key in ['address', 'device_bus']):
                    logger.warning(f"Skipping malformed device entry: {device.get('id', 'unknown_id')}")
                    send_error_log("send_available_devices", f"Malformed device entry skipped.", ERROR_TYPE_WARNING, {"device_id": device.get('id', 'unknown_id')})
                    continue

                controls = device.get('controls', [])
                if not isinstance(controls, list):
                    logger.warning(f"Invalid 'controls' structure for device: {device.get('name', 'unknown')}. Skipping controls.")
                    send_error_log("send_available_devices", f"Invalid controls structure for device.", ERROR_TYPE_WARNING, {"device_name": device.get('name', 'unknown')})
                    controls = [] # Treat as empty list if not a list

                processed_controls = []
                for control in controls:
                    # Validate required control keys
                    if all(key in control for key in ['pin', 'onTime', 'offTime']):
                        processed_controls.append({
                            'pin': control['pin'],
                            'customName': control.get('customName', f"Relay Pin {control['pin']}"),
                            'onTime': control['onTime'],
                            'offTime': control['offTime']
                        })
                    else:
                        logger.warning(f"Skipping malformed control for device {device['profile']['name']}: {control}")
                        send_error_log("send_available_devices", f"Malformed control entry skipped.", ERROR_TYPE_WARNING, {"device_name": device['profile']['name'], "control_data": control})

                available_device = {
                    'id': device.get('id', str(uuid.uuid4())), # Ensure ID exists
                    'name': device['profile']['name'],
                    'mac': device.get('mac', ''),
                    'address': device['protocol_setting']['address'],
                    'device_bus': device['protocol_setting']['device_bus'],
                    'part_number': device['profile']['part_number'],
                    'customName': device.get('customName', ''),
                    'controls': processed_controls
                }
                available_devices_list.append(available_device)
            except KeyError as e:
                send_error_log("send_available_devices (inner_loop_KeyError)", f"Missing key in device entry: {e}", ERROR_TYPE_MAJOR, {"device_data": device})
                logger.warning(f"Missing key in device entry during get_devices: {e} in {device.get('profile', {}).get('name', 'unknown')}")
            except Exception as e:
                send_error_log("send_available_devices (inner_loop_Exception)", f"Unexpected error processing device: {e}", ERROR_TYPE_MAJOR, {"device_data": device})

        publish_crud(client, json.dumps({'availableDevices': available_devices_list}), topic_response)
    except Exception as e:
        send_error_log("send_available_devices", f"Failed to send available devices: {e}", ERROR_TYPE_MAJOR)

def modify_config(client, message):
    action = message['action']
    device_data = message.get('data')

    try:
        if not device_data:
            raise ValueError("No 'data' provided in the message for modify_config.")

        if action == 'add' and not device_data.get('id'):
            device_data['id'] = str(uuid.uuid4())
        elif action != 'add' and not device_data.get('id'):
            raise ValueError("Device 'id' is required for 'set', 'delete', 'update_autoControl' actions.")

        if 'name' in device_data and installed_devices:
            matched_device = next(
                (dev for dev in installed_devices if dev.get('profile', {}).get('name') == device_data.get('name')),
                None
            )
            if matched_device:
                device_data['part_number'] = matched_device['profile']['part_number']
                device_data['address'] = matched_device['protocol_setting']['address']
                device_data['device_bus'] = matched_device['protocol_setting']['device_bus']
            else:
                logger.warning(f"Device with name '{device_data.get('name')}' not found in installed_devices. 'part_number', 'address', 'device_bus' might be missing.")
                send_error_log("modify_config", f"Device name not found in installed_devices: {device_data.get('name')}", ERROR_TYPE_WARNING, {"device_name": device_data.get('name')})

        if action == 'set':
            index = next((i for i, d in enumerate(config['devices']) if d['id'] == device_data['id']), None)
            if index is not None:
                config['devices'][index] = device_data
                logger.info(f"Updated device with ID: {device_data['id']}")
            else:
                logger.warning(f"Device with ID {device_data['id']} not found for 'set' action.")
                publish_response(client, f"Device with ID {device_data['id']} not found for update.", False)
                send_error_log("modify_config", f"Device not found for 'set' action: {device_data['id']}", ERROR_TYPE_WARNING, {"action": action, "device_id": device_data['id']})
                return
        elif action == 'add':
            if 'controls' in device_data and isinstance(device_data['controls'], list):
                for control in device_data['controls']:
                    if 'pin' in control and not control.get('customName'):
                        control['customName'] = f"Relay Pin {control['pin']}"
            config['devices'].append(device_data)
            logger.info(f"Added new device with ID: {device_data['id']}")
        elif action == 'delete':
            initial_len = len(config['devices'])
            config['devices'] = [d for d in config['devices'] if d['id'] != device_data['id']]
            if len(config['devices']) < initial_len:
                logger.info(f"Deleted device with ID: {device_data['id']}")
            else:
                logger.warning(f"Device with ID {device_data['id']} not found for 'delete' action.")
                publish_response(client, f"Device with ID {device_data['id']} not found for delete.", False)
                send_error_log("modify_config", f"Device not found for 'delete' action: {device_data['id']}", ERROR_TYPE_WARNING, {"action": action, "device_id": device_data['id']})
                return
        elif action == 'update_autoControl':
            if 'autoControl' in device_data and isinstance(device_data['autoControl'], bool):
                config['autoControl'] = device_data['autoControl']
                logger.info(f"Auto control status updated to: {config['autoControl']}")
            else:
                raise ValueError("Invalid 'autoControl' value. Must be boolean.")
        else:
            raise ValueError(f"Unknown action in modify_config: {action}")

        save_config(config)
    except ValueError as e:
        send_error_log("modify_config", f"Configuration modification failed: {e}", ERROR_TYPE_WARNING, {"action": action, "message_data": message})
        publish_response(client, f"Failed to perform {action}: {str(e)}", False)
    except Exception as e:
        send_error_log("modify_config", f"Unhandled error during configuration modification: {e}", ERROR_TYPE_MAJOR, {"action": action, "message_data": message})
        publish_response(client, f"Failed to perform {action}: {str(e)}", False)

def publish_crud(client, msg, topic):
    try:
        if client and client.is_connected():
            client.publish(topic, msg)
        else:
            logger.warning(f"CRUD client not connected, unable to publish to {topic}: {msg}")
            send_error_log("publish_crud", f"CRUD client disconnected, failed to publish.", ERROR_TYPE_WARNING, {"topic": topic, "message_preview": msg[:100]})
    except Exception as e:
        send_error_log("publish_crud", f"Failed to publish CRUD message: {e}", ERROR_TYPE_MAJOR, {"topic": topic})

def publish_control(client, msg, topic):
    try:
        if client and client.is_connected():
            client.publish(topic, msg)
        else:
            logger.warning(f"Control client not connected, unable to publish to {topic}: {msg}")
            send_error_log("publish_control", f"Control client disconnected, failed to publish.", ERROR_TYPE_WARNING, {"topic": topic, "message_preview": msg[:100]})
    except Exception as e:
        send_error_log("publish_control", f"Failed to publish control message: {e}", ERROR_TYPE_CRITICAL, {"topic": topic})

def publish_response(client, message, success):
    try:
        response = {
            "result": "success" if success else "error",
            "message": message
        }
        publish_crud(client, json.dumps(response), topic_response)
    except Exception as e:
        send_error_log("publish_response", f"Failed to publish response: {e}", ERROR_TYPE_MAJOR)

def parse_time(time_string):
    try:
        return datetime.strptime(time_string, '%I:%M %p') # Try AM/PM format first
    except ValueError:
        try:
            return datetime.strptime(time_string, '%H:%M') # Then 24-hour format
        except ValueError as e:
            raise ValueError(f"Invalid time format: {time_string}. Expected 'HH:MM' or 'HH:MM AM/PM'.") from e

def schedule_control(client_control):
    try:
        if not config or 'devices' not in config or not config['devices']:
            logger.info("No devices configured in automationSchedulerConfig.json to schedule.")
            return

        current_day = datetime.now().strftime("%a")

        for device in config['devices']:
            # Basic validation for required keys in device config
            if 'id' not in device or 'startDay' not in device or 'endDay' not in device or 'controls' not in device:
                logger.warning(f"Skipping malformed device entry in config: {device.get('id', 'unknown_id')}")
                send_error_log("schedule_control", f"Malformed device entry in config.", ERROR_TYPE_WARNING, {"device_data": device})
                continue

            if not isinstance(device['controls'], list):
                logger.warning(f"Device {device['id']} has malformed 'controls' entry. Skipping scheduling for it.")
                send_error_log("schedule_control", f"Malformed 'controls' for device.", ERROR_TYPE_WARNING, {"device_id": device['id'], "controls_data": device['controls']})
                continue

            if is_within_active_days(device, current_day):
                for control in device['controls']:
                    if 'onTime' not in control or 'offTime' not in control or 'pin' not in control:
                        logger.warning(f"Skipping malformed control entry for device {device['id']}: {control}")
                        send_error_log("schedule_control", f"Malformed control entry for device pin.", ERROR_TYPE_WARNING, {"device_id": device['id'], "control_data": control})
                        continue
                    try:
                        on_time = parse_time(control['onTime'])
                        off_time = parse_time(control['offTime'])

                        schedule.every().day.at(on_time.strftime('%H:%M')).do(
                            send_control_signal, client_control, device, control['pin'], 1).tag(device['id'], control['pin'], 'on')
                        schedule.every().day.at(off_time.strftime('%H:%M')).do(
                            send_control_signal, client_control, device, control['pin'], 0).tag(device['id'], control['pin'], 'off')
                        logger.info(f"Scheduled device '{device.get('customName', device.get('name', device['id']))}' pin {control['pin']} ON at {on_time.strftime('%H:%M')} and OFF at {off_time.strftime('%H:%M')}")
                    except ValueError as control_e:
                        send_error_log("schedule_control (time_parse_error)", f"Invalid time format in control: {control_e}", ERROR_TYPE_MINOR, {"device_id": device['id'], "control_data": control})
                    except Exception as control_e:
                        send_error_log("schedule_control (control_loop_exception)", f"Error scheduling control: {control_e}", ERROR_TYPE_MINOR, {"device_id": device['id'], "control_data": control})
            else:
                logger.info(f"Skipping scheduling for device '{device.get('customName', device.get('name', device['id']))}' on {current_day} as it is outside the active days ({device['startDay']}-{device['endDay']}).")
    except Exception as e:
        send_error_log("schedule_control", f"Unhandled error during scheduling: {e}", ERROR_TYPE_MAJOR)

def is_within_active_days(device, current_day):
    try:
        days_of_week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        start_day = device.get('startDay')
        end_day = device.get('endDay')

        if not start_day or not end_day:
            logger.warning(f"Device {device.get('id', 'unknown')} is missing 'startDay' or 'endDay'. Assuming active all week.")
            send_error_log("is_within_active_days", "Missing start/end day in device config, assuming active all week.", ERROR_TYPE_WARNING, {"device_id": device.get('id', 'unknown')})
            return True

        start_index = days_of_week.index(start_day)
        end_index = days_of_week.index(end_day)
        current_index = days_of_week.index(current_day)

        if start_index <= end_index:
            return start_index <= current_index <= end_index
        else: # Handles cases like Sat-Mon (wrapping around week)
            return current_index >= start_index or current_index <= end_index
    except ValueError as e:
        send_error_log("is_within_active_days", f"Invalid day name in config or current day format: {e}", ERROR_TYPE_MINOR, {"device_id": device.get('id', 'unknown'), "startDay": device.get('startDay'), "endDay": device.get('endDay'), "currentDay": current_day})
        logger.error(f"Invalid day name in config or current day format: {e}. Device ID: {device.get('id', 'unknown')}")
        return False
    except Exception as e:
        send_error_log("is_within_active_days", f"Unexpected error checking active days: {e}", ERROR_TYPE_MINOR, {"device_id": device.get('id', 'unknown')})
        return False

def send_control_signal(client, device, pin, data):
    if not config.get('autoControl', True):
        logger.info(f"Auto control is disabled. Not sending signal to {device.get('name', device.get('id'))}, pin {pin}, data {data}.")
        return

    try:
        # Basic validation for critical device info
        if not all(key in device for key in ['mac', 'part_number', 'address', 'device_bus']):
            logger.error(f"Missing critical device information for sending control signal: {device.get('id', 'unknown')}")
            send_error_log("send_control_signal", "Missing critical device information.", ERROR_TYPE_CRITICAL, {"device_data": device})
            return

        message = {
            "mac": device['mac'],
            "protocol_type": "Modular",
            "device": device['part_number'],
            "function": "write",
            "value": {
                "pin": pin,
                "data": data
            },
            "address": device['address'],
            "device_bus": device['device_bus'],
            "Timestamp": datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
        }
        publish_control(client, json.dumps(message), "modular")
        logger.info(f"Sent control signal to {device.get('customName', device.get('name', device['id']))}, pin {pin}, data {data}")
    except Exception as e:
        send_error_log("send_control_signal", f"Failed to send control signal: {e}", ERROR_TYPE_CRITICAL, {"device_id": device.get('id', 'unknown'), "pin": pin, "data": data})

def run():
    global crud_broker_connected, control_broker_connected
    
    # Print startup banner
    print_startup_banner()
    
    # Initialize the dedicated error logger first
    log_simple("Initializing error logger...")
    init_error_logger_client()

    # Load configurations. Errors during this stage will be logged by client_error_logger.
    log_simple("Loading configurations...")
    load_config()
    load_installed_devices()

    # Connect to MQTT brokers
    log_simple("Connecting to Control MQTT broker...")
    global client_control
    client_control = connect_mqtt_control()
    if not client_control:
        log_simple("Failed to connect to Control MQTT broker", "ERROR")
        send_error_log("run", "Failed to connect to Control MQTT broker at startup.", ERROR_TYPE_CRITICAL)
        return

    log_simple("Connecting to CRUD MQTT broker...")
    global client_crud
    client_crud = connect_mqtt_crud()
    if client_crud:
        client_crud.on_message = on_message_crud
    else:
        log_simple("Failed to connect to CRUD MQTT broker", "ERROR")
        send_error_log("run", "Failed to connect to CRUD MQTT broker at startup.", ERROR_TYPE_CRITICAL)
        return

    # Start loops for all clients
    client_control.loop_start()
    client_crud.loop_start()

    # Wait a moment for connections to establish
    time.sleep(2)
    
    # Print success banner and broker status
    print_success_banner()
    print_broker_status(crud_broker_connected, control_broker_connected)

    # Set up the scheduled tasks for control client
    log_simple("Setting up scheduled tasks...")
    schedule_control(client_control)

    log_simple("Scheduler service started successfully", "SUCCESS")

    try:
        while True:
            # Paho MQTT clients handle reconnection automatically with loop_start().
            # Explicit reconnect calls here are mostly redundant if loop_start() is running correctly,
            # but can act as a fallback if loop_start() somehow gets stuck or fails.
            # However, for robust production systems, relying on Paho's internal reconnect
            # and proper error logging within on_disconnect is generally preferred.
            # I'll keep them as they were in your original code, but note their redundancy.
            if not client_control.is_connected():
                logger.warning("Control MQTT client detected as disconnected. Attempting to force reconnect.")
                try:
                    client_control.reconnect()
                except Exception as e:
                    send_error_log("run (reconnect_control)", f"Failed to force reconnect Control MQTT client: {e}", ERROR_TYPE_WARNING)

            if not client_crud.is_connected():
                logger.warning("CRUD MQTT client detected as disconnected. Attempting to force reconnect.")
                try:
                    client_crud.reconnect()
                except Exception as e:
                    send_error_log("run (reconnect_crud)", f"Failed to force reconnect CRUD MQTT client: {e}", ERROR_TYPE_WARNING)
            
            # Ensure the error logger stays connected
            if client_error_logger and not client_error_logger.is_connected():
                logger.warning("Error logger MQTT client detected as disconnected. Attempting to force reconnect.")
                try:
                    client_error_logger.reconnect()
                except Exception as e:
                    logger.error(f"Failed to force reconnect Error Logger MQTT client: {e}")
                    # Cannot send log here as logger is failing

            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        log_simple("Scheduler service stopped by user", "WARNING")
    except Exception as e:
        log_simple(f"Critical error: {e}", "ERROR")
        send_error_log("run (main_loop)", f"Unhandled critical exception in main loop: {e}", ERROR_TYPE_CRITICAL)
    finally:
        log_simple("Shutting down services...")
        if client_control:
            client_control.loop_stop()
            client_control.disconnect()
        if client_crud:
            client_crud.loop_stop()
            client_crud.disconnect()
        if client_error_logger:
            client_error_logger.loop_stop()
            client_error_logger.disconnect()
        log_simple("Application terminated", "SUCCESS")

if __name__ == '__main__':
    run()