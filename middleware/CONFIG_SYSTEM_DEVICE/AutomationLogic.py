import json
import time
import threading
import paho.mqtt.client as mqtt
import operator
import uuid
from datetime import datetime
from queue import Queue
import logging
import sys
import traceback # Essential for getting error stack traces

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("AutomationService")

# --- Startup Banner ---
def print_startup_banner():
    """Print standardized startup banner"""
    print("\n" + "="*50)
    print("========= Automation Logic ==========")
    print("Initializing System...")
    print("="*50)

def print_success_banner():
    """Print success status banner"""
    print("\n" + "="*50)
    print("========= Automation Logic ==========")
    print("Success To Running")
    print("")

def print_broker_status(local_status=False, server_status=False):
    """Print MQTT broker connection status"""
    if local_status:
        print("MQTT Broker Local is Running")
    else:
        print("MQTT Broker Local connection failed")
    
    if server_status:
        print("MQTT Broker Server is Running")
    else:
        print("MQTT Broker Server connection failed")
    
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

# ===== Configuration File Paths =====
MODBUS_FILE_PATH = "../MODBUS_SNMP/JSON/Config/installed_devices.json"
MODULAR_FILE_PATH = "../MODULAR_I2C/JSON/Config/installed_devices.json"
MODBIT_FILE_PATH = "../I2C/JSON/Config/installed_devices.json"
AUTOMATION_FILE_PATH = "JSON/automation_value.json"
MQTT_CONFIG_PATH = "../MODBUS_SNMP/JSON/Config/mqtt_config.json"
VOICE_CONTROL_PATH = "JSON/voice_control_list.json"
SCHEDULER_CONFIG_PATH = "../MODULAR_I2C/JSON/Config/scheduler_config.json" # New path for scheduler config

# --- MQTT Configuration ---
LOCAL_BROKER = "localhost"
LOCAL_PORT = 1883
QOS = 1

SERVER_BROKER = "" # Will be filled from config
SERVER_PORT = 0    # Will be filled from config

# --- MQTT Topics ---
MODBUS_TOPIC = "modbus_value/data"
MODULAR_TOPIC = "modular_value/data"
AUTOMATION_TOPIC = "automation_value/data"
AUTOMATION_CREATE_TOPIC = "automation_value/create"
AUTOMATION_UPDATE_TOPIC = "automation_value/update"
AUTOMATION_DELETE_TOPIC = "automation_value/delete"
VOICE_CONTROL_TOPIC = "voice_control/data"
VOICE_CONTROL_CREATE = "voice_control/create"
VOICE_CONTROL_UPDATE = "voice_control/update"
VOICE_CONTROL_DELETE = "voice_control/delete"
RELAY_COMMAND_TOPIC = "modular"
MODBUS_CONTROL_TOPIC = "modbus/control/command"
MQTT_BROKER_SERVER_TOPIC = "mqtt_broker_server"
ERROR_LOG_SERVICE_TOPIC = "subrack/error/log" # Topic for ErrorLogService (to localhost)

# --- Global Status & Data ---
trigger_states = {}
logic_ops = {">": operator.gt, "<": operator.lt, ">=": operator.ge, "<=": operator.le, "==": operator.eq, "!=": operator.ne, "more_than": operator.gt, "less_than": operator.lt}
MAC_ADDRESS = ":".join([f"{(uuid.getnode() >> i) & 0xff:02x}" for i in range(0, 8*6, 8)][::-1])

# --- Connection Status Tracking ---
local_broker_connected = False
server_broker_connected = False

# ===== Modbus Command Queue System =====
modbus_command_queue = Queue()
modbus_queue_lock = threading.Lock()

# --- MQTT Client Instances ---
mqtt_local = mqtt.Client(client_id="AutomationService_Local", protocol=mqtt.MQTTv311)
mqtt_server = mqtt.Client(client_id="AutomationService_Server", protocol=mqtt.MQTTv311)
# Separate client for sending error logs to localhost
mqtt_error_logger = mqtt.Client(client_id="AutomationService_ErrorLogger", protocol=mqtt.MQTTv311)

# --- Error Log Helper Function ---
def send_error_to_log_service(message, error_type="ERROR", source="AutomationService", error_code=None, details=None):
    """Sends an error message to the ErrorLogService via MQTT (to localhost)."""
    payload = {
        "data": message,
        "type": error_type.upper(),
        "source": source,
        "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    if error_code: payload["error_code"] = error_code
    if details: payload["details"] = details

    try:
        if mqtt_error_logger.is_connected():
            mqtt_error_logger.publish(ERROR_LOG_SERVICE_TOPIC, json.dumps(payload), qos=QOS)
            logger.debug(f"Error sent to log service: {message}")
        else:
            logger.warning(f"MQTT Error Logger not connected. Failed to send error: {message}")
    except Exception as e:
        logger.error(f"Failed to publish error to ErrorLogService: {e}", exc_info=True)

# --- Modbus Processing Function ---
def modbus_command_processor():
    """Processes Modbus commands with delay and retry."""
    while True:
        try:
            if not modbus_command_queue.empty():
                with modbus_queue_lock:
                    command = modbus_command_queue.get()
                
                logger.info(f"[MODBUS QUEUE] Processing command: {command['rule_name']}")
                time.sleep(1.0) # Delay before sending

                for attempt in range(3): # 3 attempts
                    try:
                        mqtt_server.publish(MODBUS_CONTROL_TOPIC, json.dumps(command['payload']), qos=QOS)
                        logger.info(f"[MODBUS QUEUE] Command sent successfully (attempt {attempt + 1}) for: {command['rule_name']}")
                        break
                    except Exception as e:
                        logger.error(f"[MODBUS QUEUE] Attempt {attempt + 1} failed for '{command['rule_name']}': {e}")
                        send_error_to_log_service(f"Modbus command failed: {command['rule_name']}", "ERROR", "ModbusProcessor", 500, {"payload": command['payload'], "attempt": attempt + 1, "error": str(e)})
                        if attempt < 2: time.sleep(2.0)
                else:
                    logger.critical(f"[MODBUS QUEUE] All attempts failed for: {command['rule_name']}. Command aborted.")
                    send_error_to_log_service(f"Modbus command aborted after retries: {command['rule_name']}", "CRITICAL", "ModbusProcessor", 501, {"payload": command['payload'], "reason": "All retries failed"})
                
                modbus_command_queue.task_done()
            else:
                time.sleep(0.1)
        except Exception as e:
            logger.error(f"[MODBUS QUEUE] Unhandled error in processor: {e}", exc_info=True)
            send_error_to_log_service(f"Unhandled error in Modbus processor: {e}", "CRITICAL", "ModbusProcessor", 502, {"error": str(e), "trace": traceback.format_exc()})
            time.sleep(5.0)

# --- JSON Helper Functions ---
def read_json(file_path):
    try:
        # Check if the directory exists, if not, create it
        # This part requires os, so I'll keep it simple by just opening directly
        # If the directory doesn't exist, the open() will fail, and it'll be caught by FileNotFoundError
        # For simplicity, I'm assuming the '../MODULAR_I2C/JSON/Config/' directory already exists or is handled elsewhere
        # If file doesn't exist, try creating it with empty list
        try:
            with open(file_path, "r") as f: return json.load(f)
        except FileNotFoundError:
            logger.warning(f"File not found: {file_path}. Creating empty file.")
            with open(file_path, 'w') as f: json.dump([], f, indent=4)
            return []
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in {file_path}: {e}")
        send_error_to_log_service(f"Corrupt JSON file: {file_path.split('/')[-1]}", "ERROR", "FileHandler", 101, {"file": file_path, "error": str(e)})
        return []
    except Exception as e:
        logger.error(f"Error reading {file_path}: {e}", exc_info=True)
        send_error_to_log_service(f"Failed to read file: {file_path.split('/')[-1]}", "CRITICAL", "FileHandler", 102, {"file": file_path, "error": str(e)})
        return []

def write_json(file_path, data):
    try:
        # Assuming the directory for file_path already exists.
        # If not, you might get a FileNotFoundError or similar.
        with open(file_path, "w") as f: json.dump(data, f, indent=4)
    except IOError as e:
        logger.error(f"IOError writing to {file_path}: {e}")
        send_error_to_log_service(f"IOError writing file: {file_path.split('/')[-1]}", "ERROR", "FileHandler", 103, {"file": file_path, "error": str(e)})
    except Exception as e:
        logger.error(f"Error writing {file_path}: {e}", exc_info=True)
        send_error_to_log_service(f"Failed to write file: {file_path.split('/')[-1]}", "CRITICAL", "FileHandler", 104, {"file": file_path, "error": str(e)})

# --- MQTT Broker Info ---
def publish_mqtt_broker_info():
    try:
        config = read_json(MQTT_CONFIG_PATH)
        if config and mqtt_local.is_connected():
            payload = {"broker_address": config.get("broker_address"), "broker_port": config.get("broker_port"), "username": config.get("username"), "password": config.get("password"), "mac_address": MAC_ADDRESS}
            mqtt_local.publish(MQTT_BROKER_SERVER_TOPIC, json.dumps(payload), qos=QOS)
            logger.info("Broker info published successfully.")
        else:
            logger.warning("Local MQTT client not connected or config missing. Skipping broker info publish.")
    except Exception as e:
        logger.error(f"Error publishing broker info: {e}", exc_info=True)
        send_error_to_log_service(f"Failed to publish MQTT broker info: {e}", "ERROR", "MQTTConfigPublisher", 201)

def publish_mqtt_broker_info_loop():
    while True:
        publish_mqtt_broker_info()
        time.sleep(10)

# --- Voice Control Functions ---
def add_voice_control(data):
    items = read_json(VOICE_CONTROL_PATH)
    if items is not None:
        items.append(data)
        write_json(VOICE_CONTROL_PATH, items)
        logger.info(f"Voice Control Added: {data.get('uuid')}")
    else: send_error_to_log_service(f"Failed to add voice control: {data.get('name', 'N/A')}", "ERROR", "VoiceControl", 301)

def update_voice_control(uuid_key, new_data):
    items = read_json(VOICE_CONTROL_PATH)
    if items is not None:
        found = False
        for item in items:
            if item.get("uuid") == uuid_key:
                item.update(new_data)
                write_json(VOICE_CONTROL_PATH, items)
                logger.info(f"Voice Control Updated: {uuid_key}")
                found = True; break
        if not found:
            logger.warning(f"Voice Control not found for update: {uuid_key}")
            send_error_to_log_service(f"Voice control update failed, UUID not found: {uuid_key}", "WARNING", "VoiceControl", 302)
    else: send_error_to_log_service(f"Failed to update voice control: {uuid_key}", "ERROR", "VoiceControl", 303)

def delete_voice_control(uuid_key):
    items = read_json(VOICE_CONTROL_PATH)
    if items is not None:
        initial_len = len(items)
        new_items = [i for i in items if i.get("uuid") != uuid_key]
        if len(new_items) != initial_len:
            write_json(VOICE_CONTROL_PATH, new_items)
            logger.info(f"Voice Control Deleted: {uuid_key}")
        else:
            logger.warning(f"Voice Control not found for deletion: {uuid_key}")
            send_error_to_log_service(f"Voice control delete failed, UUID not found: {uuid_key}", "WARNING", "VoiceControl", 304)
    else: send_error_to_log_service(f"Failed to delete voice control: {uuid_key}", "ERROR", "VoiceControl", 305)

def publish_voice_control_values():
    while True:
        try:
            items = read_json(VOICE_CONTROL_PATH)
            if items is not None and items and mqtt_local.is_connected():
                mqtt_local.publish(VOICE_CONTROL_TOPIC, json.dumps(items), qos=QOS)
                logger.debug(f"Publishing {len(items)} voice control values.")
            elif not mqtt_local.is_connected():
                logger.warning("Local MQTT client not connected. Skipping voice control publish.")
        except Exception as e:
            logger.error(f"Error publishing voice control values: {e}", exc_info=True)
            send_error_to_log_service(f"Failed to publish voice control values: {e}", "ERROR", "VoiceControlPublisher", 306)
        time.sleep(1)

# --- Automation CRUD Logic ---
def add_automation_value(data):
    items = read_json(AUTOMATION_FILE_PATH)
    if items is not None:
        if any(item.get("name") == data.get("name") for item in items):
            logger.warning(f"Automation rule with name '{data.get('name')}' already exists. Skipping addition.")
            send_error_to_log_service(f"Attempt to add duplicate automation rule: {data.get('name')}", "WARNING", "AutomationCRUD", 401)
            return
        items.append(data)
        write_json(AUTOMATION_FILE_PATH, items)
        logger.info(f"Automation Rule Added: {data.get('name')}")
        subscribe_all_device_topics()
    else: send_error_to_log_service(f"Failed to add automation rule: {data.get('name', 'N/A')}", "ERROR", "AutomationCRUD", 402)

def update_automation_value(name, new_data):
    items = read_json(AUTOMATION_FILE_PATH)
    if items is not None:
        found = False
        for i, item in enumerate(items):
            if item.get("name") == name:
                items[i].update(new_data)
                write_json(AUTOMATION_FILE_PATH, items)
                logger.info(f"Automation Rule Updated: {name}")
                found = True
                if new_data.get("topic") and new_data["topic"] != item.get("topic"): subscribe_all_device_topics()
                break
        if not found:
            logger.warning(f"Automation Rule not found for update: {name}")
            send_error_to_log_service(f"Automation rule update failed, name not found: {name}", "WARNING", "AutomationCRUD", 403)
    else: send_error_to_log_service(f"Failed to update automation rule: {name}", "ERROR", "AutomationCRUD", 404)

def delete_automation_value(name):
    items = read_json(AUTOMATION_FILE_PATH)
    if items is not None:
        initial_len = len(items)
        new_items = [i for i in items if i.get("name") != name]
        if len(new_items) != initial_len:
            write_json(AUTOMATION_FILE_PATH, new_items)
            logger.info(f"Automation Rule Deleted: {name}")
            subscribe_all_device_topics()
        else:
            logger.warning(f"Automation Rule not found for deletion: {name}")
            send_error_to_log_service(f"Automation rule delete failed, name not found: {name}", "WARNING", "AutomationCRUD", 405)
    else: send_error_to_log_service(f"Failed to delete automation rule: {name}", "ERROR", "AutomationCRUD", 406)

# --- Local MQTT Client Callbacks ---
def on_local_connect(client, userdata, flags, rc):
    global local_broker_connected
    if rc == 0:
        local_broker_connected = True
        log_simple("Local MQTT broker connected", "SUCCESS")
        client.subscribe([(AUTOMATION_CREATE_TOPIC, QOS), (AUTOMATION_UPDATE_TOPIC, QOS), (AUTOMATION_DELETE_TOPIC, QOS), (VOICE_CONTROL_CREATE, QOS), (VOICE_CONTROL_UPDATE, QOS), (VOICE_CONTROL_DELETE, QOS)])
        publish_mqtt_broker_info()
    else:
        local_broker_connected = False
        log_simple(f"Local MQTT broker connection failed (code {rc})", "ERROR")
        send_error_to_log_service(f"Failed to connect to local MQTT broker: {rc}", "CRITICAL", "MQTTLocal", 202)

def on_local_disconnect(client, userdata, rc):
    global local_broker_connected
    local_broker_connected = False
    log_simple("Local MQTT broker disconnected", "WARNING")
    send_error_to_log_service(f"Disconnected from local MQTT broker: {rc}", "WARNING", "MQTTLocal", 203)

def on_local_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        if msg.topic == AUTOMATION_CREATE_TOPIC: add_automation_value(payload)
        elif msg.topic == AUTOMATION_UPDATE_TOPIC:
            if "name" in payload: update_automation_value(payload["name"], payload)
            else: send_error_to_log_service("Automation update payload missing 'name'", "WARNING", "AutomationCRUD", 407, {"payload": payload})
        elif msg.topic == AUTOMATION_DELETE_TOPIC:
            if "name" in payload: delete_automation_value(payload["name"])
            else: send_error_to_log_service("Automation delete payload missing 'name'", "WARNING", "AutomationCRUD", 408, {"payload": payload})
        elif msg.topic == VOICE_CONTROL_CREATE: add_voice_control(payload)
        elif msg.topic == VOICE_CONTROL_UPDATE:
            if "uuid" in payload: update_voice_control(payload["uuid"], payload)
            else: send_error_to_log_service("Voice control update payload missing 'uuid'", "WARNING", "VoiceControl", 307, {"payload": payload})
        elif msg.topic == VOICE_CONTROL_DELETE:
            if "uuid" in payload: delete_voice_control(payload["uuid"])
            else: send_error_to_log_service("Voice control delete payload missing 'uuid'", "WARNING", "VoiceControl", 308, {"payload": payload})
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in local message from topic {msg.topic}: {e}. Payload: '{msg.payload.decode('utf-8')}'")
        send_error_to_log_service(f"Invalid JSON in local MQTT message: {msg.topic}", "ERROR", "MQTTLocal", 204, {"topic": msg.topic, "payload_preview": msg.payload.decode('utf-8')[:100], "error": str(e)})
    except Exception as e:
        logger.error(f"Unhandled error processing local MQTT message on topic {msg.topic}: {e}", exc_info=True)
        send_error_to_log_service(f"Unhandled error processing local MQTT message: {msg.topic}", "CRITICAL", "MQTTLocal", 205, {"topic": msg.topic, "payload": msg.payload.decode('utf-8'), "error": str(e), "trace": traceback.format_exc()})

# --- Server MQTT Client Callbacks ---
def on_server_connect(client, userdata, flags, rc):
    global SERVER_BROKER, SERVER_PORT, server_broker_connected
    if rc == 0:
        server_broker_connected = True
        log_simple("Server MQTT broker connected", "SUCCESS")
        subscribe_all_device_topics()
    else:
        server_broker_connected = False
        log_simple(f"Server MQTT broker connection failed (code {rc})", "ERROR")
        send_error_to_log_service(f"Failed to connect to server MQTT broker: {rc}", "CRITICAL", "MQTTServer", 206, {"broker": SERVER_BROKER, "port": SERVER_PORT, "rc": rc})

def on_server_disconnect(client, userdata, rc):
    global server_broker_connected
    server_broker_connected = False
    log_simple("Server MQTT broker disconnected", "WARNING")
    send_error_to_log_service(f"Disconnected from server MQTT broker: {rc}", "WARNING", "MQTTServer", 207)

def find_device_by_name(device_name):
    """Searches for a device in configuration files and returns essential info."""
    try:
        all_devices = (read_json(MODULAR_FILE_PATH) or []) + (read_json(MODBIT_FILE_PATH) or [])
        for device in all_devices:
            if device.get("profile", {}).get("name") == device_name:
                pn = device.get("profile", {}).get("part_number", "RELAYMINI")
                db = device.get("protocol_setting", {}).get("device_bus", 0)
                addr = device.get("protocol_setting", {}).get("address", 0)
                logger.info(f"[DEVICE LOOKUP] Found '{device_name}' -> part_number: '{pn}', bus: {db}, address: {addr}")
                return {"part_number": pn, "device_bus": db, "address": addr}
        logger.warning(f"[DEVICE LOOKUP] Device '{device_name}' not found, using defaults.")
        send_error_to_log_service(f"Device not found for automation rule: {device_name}", "WARNING", "DeviceLookup", 601, {"device_name": device_name})
        return {"part_number": "RELAYMINI", "device_bus": 0, "address": 0}
    except Exception as e:
        logger.error(f"[DEVICE LOOKUP] Error searching for device '{device_name}': {e}", exc_info=True)
        send_error_to_log_service(f"Error searching for device: {device_name}", "ERROR", "DeviceLookup", 602, {"device_name": device_name, "error": str(e), "trace": traceback.format_exc()})
        return {"part_number": "RELAYMINI", "device_bus": 0, "address": 0}

def on_server_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        topic = msg.topic
        automation_values = read_json(AUTOMATION_FILE_PATH)
        
        if not isinstance(payload, dict) or "value" not in payload or not isinstance(payload["value"], str):
            logger.warning(f"Invalid sensor payload format from {topic}: {payload}.")
            send_error_to_log_service(f"Invalid sensor data format: {topic}", "WARNING", "SensorProcessor", 701, {"topic": topic, "payload": payload})
            return
        
        try: sensor_data = json.loads(payload["value"])
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode sensor value from {topic}: {e}. Raw value: '{payload['value']}'")
            send_error_to_log_service(f"Corrupt sensor data JSON from {topic}", "ERROR", "SensorProcessor", 703, {"topic": topic, "raw_value": payload['value'], "error": str(e)})
            return

        for rule in automation_values:
            if rule.get("topic") == topic:
                config = rule.get("config", {})
                key, expected, logic, auto = config.get("key_value"), config.get("value"), config.get("logic"), config.get("auto", True)
                actual = sensor_data.get(key)

                if actual is None:
                    logger.warning(f"Key '{key}' not found in sensor data from {topic} for rule '{rule.get('name')}'")
                    send_error_to_log_service(f"Missing key in sensor data for rule: {rule.get('name')}", "WARNING", "SensorProcessor", 704, {"rule_name": rule.get('name'), "missing_key": key, "sensor_data": sensor_data})
                    continue

                op = logic_ops.get(logic)
                if not op:
                    logger.warning(f"Unsupported logic operator '{logic}' for rule '{rule.get('name')}'")
                    send_error_to_log_service(f"Unsupported logic operator for rule: {rule.get('name')}", "WARNING", "RuleEngine", 705, {"rule_name": rule.get('name'), "operator": logic})
                    continue
                
                try: actual, expected = float(actual), float(expected)
                except (ValueError, TypeError):
                    logger.error(f"Cannot compare non-numeric values for rule '{rule.get('name')}': actual={actual}, expected={expected}")
                    send_error_to_log_service(f"Non-numeric comparison for rule: {rule.get('name')}", "ERROR", "RuleEngine", 706, {"rule_name": rule.get('name'), "actual": actual, "expected": expected})
                    continue

                current_status = op(actual, expected)
                prev_status = trigger_states.get(rule["name"])

                if prev_status == current_status: continue
                trigger_states[rule["name"]] = current_status

                relay_data = None
                if auto and current_status: relay_data = 1
                elif auto and not current_status: relay_data = 0
                elif not auto and current_status: relay_data = 1 if rule["relay"].get("logic") else 0
                else:
                    logger.info(f"Config set NOT triggering device {rule['name']}: {actual} {logic} {expected}. Auto: {auto}, Current Status: {current_status}")
                    continue
                
                if relay_data is not None:
                    logger.info(f"Config set SUCCESSFULLY triggering device {rule['name']}: {actual} {logic} {expected}. Sending value: {relay_data}")

                    relay = rule.get("relay", {})
                    relay_type = rule.get("type", "Modular")

                    if relay_type == "Modular":
                        device_info = find_device_by_name(relay.get("name", ""))
                        relay_payload = {"mac": MAC_ADDRESS, "protocol_type": "Modular", "device": device_info["part_number"], "function": "write", "value": {"pin": relay.get("pin"), "data": relay_data}, "address": device_info["address"], "device_bus": device_info["device_bus"], "Timestamp": datetime.now().isoformat() + "Z"}
                        if mqtt_server.is_connected(): mqtt_server.publish(RELAY_COMMAND_TOPIC, json.dumps(relay_payload), qos=QOS)
                        else: send_error_to_log_service("Modular command not sent, MQTT server disconnected", "WARNING", "AutomationEngine", 707, {"rule_name": rule.get('name')})
                    elif relay_type == "Modbus":
                        relay_payload = {"mac": MAC_ADDRESS, "number_address": relay.get("address"), "value": {"address": relay.get("pin", 0), "value": relay_data}, "port": relay.get("port", "/dev/ttyAMA0"), "baudrate": relay.get("baudrate", 9600), "parity": relay.get("parity", "N"), "bytesize": relay.get("bytesize", 8), "stop_bit": relay.get("stop_bit", 1), "timeout": relay.get("timeout", 3), "endianness": relay.get("endianness", "Little Endian"), "data_type": relay.get("data_type", "UINT16"), "function": relay.get("function", "single")}
                        modbus_command_queue.put({"rule_name": rule["name"], "payload": relay_payload, "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")})
                        logger.info(f"[MODBUS QUEUE] Added command to queue for rule: {rule['name']}")
                    else:
                        logger.warning(f"Unsupported relay type '{relay_type}' for rule '{rule.get('name')}'")
                        send_error_to_log_service(f"Unsupported relay type for rule: {rule.get('name')}", "WARNING", "RuleEngine", 708, {"rule_name": rule.get('name'), "relay_type": relay_type})

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in server message from topic {msg.topic}: {e}. Payload: '{msg.payload.decode('utf-8')}'")
        send_error_to_log_service(f"Invalid JSON in server MQTT message: {msg.topic}", "ERROR", "MQTTServer", 208, {"topic": msg.topic, "payload_preview": msg.payload.decode('utf-8')[:100], "error": str(e)})
    except Exception as e:
        logger.error(f"Unhandled error processing server MQTT message on topic {msg.topic}: {e}", exc_info=True)
        send_error_to_log_service(f"Unhandled error processing server MQTT message: {msg.topic}", "CRITICAL", "MQTTServer", 209, {"topic": msg.topic, "payload": msg.payload.decode('utf-8'), "error": str(e), "trace": traceback.format_exc()})

# --- Server MQTT Client Setup ---
def setup_mqtt_server_client():
    global SERVER_BROKER, SERVER_PORT
    try:
        mqtt_server_config = read_json(MQTT_CONFIG_PATH)
        if not mqtt_server_config:
            logger.critical(f"Failed to load MQTT server configuration from {MQTT_CONFIG_PATH}. Exiting.")
            sys.exit(1)
        
        SERVER_BROKER = mqtt_server_config.get("broker_address", "localhost")
        SERVER_PORT = mqtt_server_config.get("broker_port", 1883)

        mqtt_server.on_connect = on_server_connect
        mqtt_server.on_disconnect = on_server_disconnect
        mqtt_server.on_message = on_server_message
        mqtt_server.reconnect_delay_set(min_delay=1, max_delay=120)

        logger.info(f"Attempting to connect to MQTT server broker at {SERVER_BROKER}:{SERVER_PORT}...")
        mqtt_server.connect(SERVER_BROKER, int(SERVER_PORT), 60)
    except Exception as e:
        logger.critical(f"Failed to set up MQTT server client: {e}. Exiting. ❌", exc_info=True)
        send_error_to_log_service(f"Critical: Failed to set up MQTT server client: {e}", "CRITICAL", "MQTTServerSetup", 210)
        sys.exit(1)

def subscribe_all_device_topics():
    """Subscribes to all relevant device topics from automation rules."""
    current_subscriptions = [MODBUS_TOPIC, MODULAR_TOPIC]
    automation = read_json(AUTOMATION_FILE_PATH)
    if automation:
        for item in automation:
            topic = item.get("topic")
            if topic and topic not in current_subscriptions:
                current_subscriptions.append(topic)
    
    for topic in current_subscriptions:
        if mqtt_server.is_connected():
            mqtt_server.subscribe(topic, qos=QOS)
            logger.info(f"Subscribed to server broker topic: {topic}")
        else:
            logger.warning(f"MQTT server client not connected, cannot subscribe to {topic}.")
            send_error_to_log_service(f"Failed to subscribe to topic {topic}, MQTT server disconnected", "WARNING", "MQTTServer", 211, {"topic": topic})

# --- Data Publishing Functions ---
def publish_automation_values():
    while True:
        try:
            items = read_json(AUTOMATION_FILE_PATH)
            if items is not None and items and mqtt_local.is_connected():
                mqtt_local.publish(AUTOMATION_TOPIC, json.dumps(items), qos=QOS)
                logger.debug(f"Publishing {len(items)} automation values.")
            elif not mqtt_local.is_connected():
                logger.warning("Local MQTT client not connected. Skipping automation values publish.")
        except Exception as e:
            logger.error(f"Error publishing automation values: {e}", exc_info=True)
            send_error_to_log_service(f"Failed to publish automation values: {e}", "ERROR", "AutomationPublisher", 409)
        time.sleep(1)

def publish_modbus_values():
    while True:
        try:
            values = read_json(MODBUS_FILE_PATH)
            if values is not None and values and mqtt_local.is_connected():
                mqtt_local.publish(MODBUS_TOPIC, json.dumps(values), qos=QOS)
                logger.debug(f"Publishing {len(values)} Modbus values.")
            elif not mqtt_local.is_connected():
                logger.warning("Local MQTT client not connected. Skipping Modbus values publish.")
        except Exception as e:
            logger.error(f"Error publishing Modbus values: {e}", exc_info=True)
            send_error_to_log_service(f"Failed to publish Modbus values: {e}", "ERROR", "ModbusPublisher", 503)
        time.sleep(1)

FILTERED_PARTS = {"TIBBIT_GPIO", "TIBBIT_DI", "RELAY", "RELAY_MINI", "SOLITUDE_RELAY"}

def publish_modular_values():
    while True:
        try:
            modular = read_json(MODULAR_FILE_PATH) or []
            modbus_installed = read_json(MODBUS_FILE_PATH) or []
            modbit = read_json(MODBIT_FILE_PATH) or []
            all_devices_config = modular + modbus_installed + modbit
            filtered = []
            
            for d in all_devices_config:
                part_number = d.get("part_number") or d.get("profile", {}).get("part_number")
                if part_number in FILTERED_PARTS:
                    filtered.append(d)
            
            logger.debug(f"[FILTERED] Matching part_number devices: {len(filtered)}")
            
            if filtered and mqtt_local.is_connected():
                mqtt_local.publish(MODULAR_TOPIC, json.dumps(filtered), qos=QOS)
                logger.debug(f"[MQTT PUBLISH] Published to topic: {MODULAR_TOPIC}")
            elif not mqtt_local.is_connected():
                logger.warning("Local MQTT client not connected. Skipping Modular values publish.")
            else:
                logger.debug("[MQTT PUBLISH] No matching devices to publish.")
        except Exception as e:
            logger.error(f"Error publishing Modular values: {e}", exc_info=True)
            send_error_to_log_service(f"Failed to publish Modular values: {e}", "ERROR", "ModularPublisher", 801)
        time.sleep(1)

# --- Main Execution ---
def main():
    global local_broker_connected, server_broker_connected
    
    # Print startup banner
    print_startup_banner()
    
    try:
        # --- Setup Local MQTT Client ---
        log_simple("Connecting to Local MQTT broker...")
        mqtt_local.on_connect = on_local_connect
        mqtt_local.on_disconnect = on_local_disconnect
        mqtt_local.on_message = on_local_message
        mqtt_local.reconnect_delay_set(min_delay=1, max_delay=120)
        mqtt_local.connect(LOCAL_BROKER, LOCAL_PORT, 60)
        mqtt_local.loop_start()

        # --- Setup Error Logger MQTT Client ---
        log_simple("Connecting to Error Logger...")
        mqtt_error_logger.connect(LOCAL_BROKER, LOCAL_PORT, 60)
        mqtt_error_logger.loop_start()

        # --- Setup Server MQTT Client ---
        log_simple("Connecting to Server MQTT broker...")
        setup_mqtt_server_client() # This also sets global SERVER_BROKER/PORT and connects
        mqtt_server.loop_start()

        # Wait a moment for connections to establish
        time.sleep(2)
        
        # Print success banner and broker status
        print_success_banner()
        print_broker_status(local_broker_connected, server_broker_connected)

        # --- Start Threads ---
        log_simple("Starting automation threads...")
        threading.Thread(target=modbus_command_processor, daemon=True).start()
        threading.Thread(target=publish_automation_values, daemon=True).start()
        threading.Thread(target=publish_modbus_values, daemon=True).start()
        threading.Thread(target=publish_modular_values, daemon=True).start()
        threading.Thread(target=publish_mqtt_broker_info_loop, daemon=True).start()
        threading.Thread(target=publish_voice_control_values, daemon=True).start()
        
        log_simple("All automation threads started successfully", "SUCCESS")
        
        # Keep the main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        log_simple("Program stopped by user", "WARNING")
    except Exception as e:
        log_simple(f"Critical error: {e}", "ERROR")
        send_error_to_log_service(f"Unhandled critical error in Automation Service: {e}", "CRITICAL", "AutomationService", 999, {"error": str(e), "trace": traceback.format_exc()})
    finally:
        log_simple("Shutting down services...")
        if mqtt_local: mqtt_local.loop_stop(); mqtt_local.disconnect()
        if mqtt_server: mqtt_server.loop_stop(); mqtt_server.disconnect()
        if mqtt_error_logger: mqtt_error_logger.loop_stop(); mqtt_error_logger.disconnect()
        log_simple("Application terminated", "SUCCESS")

if __name__ == "__main__":
    main()