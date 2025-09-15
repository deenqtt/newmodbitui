import paho.mqtt.client as mqtt
import json
import subprocess
import os
import sys
import time
import threading
import getpass
import netifaces as ni
from getmac import get_mac_address
from datetime import datetime
import uuid

# --- Startup Banner Functions ---
def print_startup_banner():
    """Print standardized startup banner"""
    print("\n" + "="*50)
    print("========== Device Config ==========")
    print("Initializing System...")
    print("="*50)

def print_success_banner():
    """Print success status banner"""
    print("\n" + "="*50)
    print("========== Device Config ==========")
    print("Success To Running")
    print("")

def print_broker_status(local_status=False, data_status=False):
    """Print MQTT broker connection status"""
    if local_status:
        print("MQTT Broker Local is Running")
    else:
        print("MQTT Broker Local connection failed")
    
    if data_status:
        print("MQTT Broker Data is Running")
    else:
        print("MQTT Broker Data connection failed")
    
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

# --- Connection Status Tracking ---
local_broker_connected = False
data_broker_connected = False

# Configuration paths
MODBUS_SNMP_CONFIG_PATH = '../MODBUS_SNMP/JSON/Config/installed_devices.json'
I2C_CONFIG_PATH = '../MODULAR_I2C/JSON/Config/installed_devices.json'
DEVICES_SUMMARY_PATH = '../MODBUS_SNMP/JSON/Config/Library/devices_summary.json'
MQTT_CONFIG_PATH = '../MODULAR_I2C/JSON/Config/mqtt_config.json'
MQTT_BROKER = "localhost"  # Ubah ke broker yang Anda gunakan
MQTT_PORT = 1883
MQTT_PING_TOPIC = "request/ping"  # Topik untuk menerima permintaan ping
MQTT_RESULT_TOPIC = "response/ping"  # Topik untuk mengirim hasil ping

# MQTT Topics for localhost brokerS
MODBUS_SNMP_COMMAND_TOPIC = "command_device_modbus"
MODBUS_SNMP_RESPONSE_TOPIC = "response_device_modbus"
I2C_COMMAND_TOPIC = "command_device_i2c"
I2C_RESPONSE_TOPIC = "response_device_i2c"
SERVICE_RESTART_COMMAND_TOPIC = "command_service_restart"
SERVICE_RESTART_RESPONSE_TOPIC = "response_service_restart"
SCAN_I2C_COMMAND_TOPIC = "command/i2c_scan"  # Tambahan untuk topik scan I2C
SCAN_I2C_RESPONSE_TOPIC = "response/i2c_scan"  # Tambahan untuk respon scan I2C

# MQTT Topic for centralized error logging
ERROR_LOG_TOPIC = "subrack/error/log"
QOS = 1

# MQTT Topics for data publishing broker
MODBUS_SNMP_DATA_TOPIC = "data_device_modbus_node"
I2C_DATA_TOPIC = "data_device_i2c_node"
REQUEST_DATA_TOPIC = "request_data"

# --- DEDICATED ERROR LOGGING CLIENT ---
error_logger_client = None
ERROR_LOGGER_CLIENT_ID = f'device-config-error-logger-{uuid.uuid4()}'

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

def initialize_error_logger():
    global error_logger_client
    try:
        error_logger_client = mqtt.Client(client_id=ERROR_LOGGER_CLIENT_ID, protocol=mqtt.MQTTv311, clean_session=True)
        error_logger_client.on_connect = on_error_logger_connect
        error_logger_client.on_disconnect = on_error_logger_disconnect
        error_logger_client.reconnect_delay_set(min_delay=1, max_delay=120)
        error_logger_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        error_logger_client.loop_start()
        print(f"Dedicated error logger client initialized and started loop to {MQTT_BROKER}:{MQTT_PORT}")
    except Exception as e:
        print(f"FATAL: Failed to initialize dedicated error logger: {e}")

def send_error_log(function_name, error_detail, error_type, additional_info=None):
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Generate unique ID: DeviceConfigService--<timestamp_int>-<uuid_fragment>
    unique_id_fragment = str(uuid.uuid4().int % 10000000000)
    log_id = f"DeviceConfigService--{int(time.time())}-{unique_id_fragment}"

    error_payload = {
        "data": f"[{function_name}] {error_detail}",
        "type": error_type.upper(),
        "source": "DeviceConfigService",
        "Timestamp": timestamp_str,
        "id": log_id,
        "status": "active"
    }
    if additional_info:
        error_payload.update(additional_info)

    try:
        if error_logger_client and error_logger_client.is_connected():
            error_logger_client.publish(ERROR_LOG_TOPIC, json.dumps(error_payload), qos=QOS)
            print(f"Error log sent: {error_payload}")
        else:
            print(f"Error logger MQTT client not connected, unable to send log: {error_payload}")
    except Exception as e:
        print(f"Failed to publish error log (internal error in send_error_log): {e}")
    
    print(f"[{function_name}] ({error_type}): {error_detail}")

# Load default devices from file
def load_default_devices():
    try:
        with open(MODBUS_SNMP_CONFIG_PATH, 'r') as file:
            content = file.read()
            if not content:
                return []
            return json.loads(content)
    except FileNotFoundError as e:
        error_msg = f"File {MODBUS_SNMP_CONFIG_PATH} not found"
        send_error_log("load_default_devices", error_msg, "error", {"file_path": MODBUS_SNMP_CONFIG_PATH})
        return []
    except json.JSONDecodeError as e:
        error_msg = f"Error decoding JSON from {MODBUS_SNMP_CONFIG_PATH}: {e}"
        send_error_log("load_default_devices", error_msg, "error", {"file_path": MODBUS_SNMP_CONFIG_PATH})
        return []

# Load MQTT configuration
def load_mqtt_config():
    try:
        with open(MQTT_CONFIG_PATH, 'r') as file:
            mqtt_config = json.load(file)
        return mqtt_config
    except FileNotFoundError as e:
        error_msg = "MQTT config file not found"
        send_error_log("load_mqtt_config", error_msg, "error", {"file_path": MQTT_CONFIG_PATH})
        return {}
    except json.JSONDecodeError as e:
        error_msg = f"Error decoding MQTT config: {e}"
        send_error_log("load_mqtt_config", error_msg, "error", {"file_path": MQTT_CONFIG_PATH})
        return {}

# Load installed devices from file
def load_installed_devices(config_path):
    try:
        with open(config_path, 'r') as file:
            content = file.read()
            if not content:
                return []
            return json.loads(content)
    except FileNotFoundError as e:
        error_msg = f"File {config_path} not found"
        send_error_log("load_installed_devices", error_msg, "error", {"file_path": config_path})
        return []
    except json.JSONDecodeError as e:
        error_msg = f"Error decoding JSON from {config_path}: {e}"
        send_error_log("load_installed_devices", error_msg, "error", {"file_path": config_path})
        return []

# Save installed devices to file
def save_installed_devices(config_path, devices):
    try:
        with open(config_path, 'w') as file:
            json.dump(devices, file, indent=4)
    except IOError as e:
        error_msg = f"Error saving devices: {e}"
        send_error_log("save_installed_devices", error_msg, "error", {"file_path": config_path})

# Load device summary from devices_summary.json
def load_devices_summary():
    try:
        with open(DEVICES_SUMMARY_PATH, 'r') as file:
            return json.load(file)
    except FileNotFoundError as e:
        error_msg = f"File {DEVICES_SUMMARY_PATH} not found"
        send_error_log("load_devices_summary", error_msg, "error", {"file_path": DEVICES_SUMMARY_PATH})
        return {}
    except json.JSONDecodeError as e:
        error_msg = f"Error decoding JSON from {DEVICES_SUMMARY_PATH}: {e}"
        send_error_log("load_devices_summary", error_msg, "error", {"file_path": DEVICES_SUMMARY_PATH})
        return {}

# Restart a service
def restart_service(service_name):
    try:
        subprocess.run(['sudo', 'systemctl', 'restart', service_name], check=True)
        print(f"Service {service_name} restarted successfully.")
        return {"status": "success", "message": f"Service {service_name} restarted successfully."}
    except subprocess.CalledProcessError as e:
        error_msg = f"Failed to restart service: {e}"
        send_error_log("restart_service", error_msg, "error", {"service_name": service_name})
        return {"status": "error", "message": error_msg}

# Handle incoming MQTT messages for Modbus SNMP
def handle_modbus_snmp_message(client, userdata, message):
    print(f"Received Modbus SNMP message: {message.payload.decode('utf-8')} on topic {message.topic}")
    payload = message.payload.decode('utf-8')
    try:
        command = json.loads(payload)
        devices = load_installed_devices(MODBUS_SNMP_CONFIG_PATH)
        response = {}

        if command.get('command') == 'getDataModbus':
            response = devices

        elif command.get('command') == 'getDataByProtocol':
            protocol = command.get('protocol')
            filtered_devices = [device for device in devices if device['protocol_setting']['protocol'] == protocol]
            response = filtered_devices

        elif command.get('command') == 'addDevice':
            new_device = command.get('device')

            devices.append(new_device)
            save_installed_devices(MODBUS_SNMP_CONFIG_PATH, devices)
            response = {"status": "success", "message": "Device added successfully"}
        elif command.get('command') == 'updateDevice':
            old_name = command.get('old_name')
            updated_device = command.get('device')

            if old_name is not None and updated_device:
                for device in devices:
                    if device['profile']['name'] == old_name:
                        device['profile'] = updated_device['profile']
                        device['protocol_setting'] = updated_device['protocol_setting']
                        save_installed_devices(MODBUS_SNMP_CONFIG_PATH, devices)
                        response = {"status": "success", "message": "Device updated successfully"}
                        break
                else:
                    response = {"status": "error", "message": "Device not found"}
            else:
                response = {"status": "error", "message": "Invalid data provided"}

        elif command.get('command') == 'deleteDevice':
            device_name = command.get('name')
            devices = [device for device in devices if device['profile']['name'] != device_name]
            save_installed_devices(MODBUS_SNMP_CONFIG_PATH, devices)
            response = {"status": "success", "message": "Device deleted successfully"}

        elif command.get('command') == 'getDataSummaryByProtocol':
            protocol = command.get('protocol')
            devices_summary = load_devices_summary()

            if protocol in devices_summary:
                filtered_data = devices_summary[protocol]
                response = filtered_data
            else:
                response = {"status": "error", "message": f"No data found for protocol: {protocol}"}

        else:
            response = {"status": "error", "message": "Unknown command"}

        print(f"Publishing response: {response}")
        client.publish(MODBUS_SNMP_RESPONSE_TOPIC, json.dumps(response))

    except Exception as e:
        error_msg = f"Error processing Modbus SNMP message: {e}"
        send_error_log("handle_modbus_snmp_message", error_msg, "error", {"payload": payload})
        client.publish(MODBUS_SNMP_RESPONSE_TOPIC, json.dumps({"status": "error", "message": str(e)}))

# Handle incoming MQTT messages for I2C
def handle_i2c_message(client, userdata, message):
    print(f"Received I2C message: {message.payload.decode('utf-8')} on topic {message.topic}")
    payload = message.payload.decode('utf-8')
    print(f"Raw payload: {payload}")
    installed_devices = load_installed_devices(I2C_CONFIG_PATH)
    response = {}

    try:
        command = json.loads(payload)

        if command.get('command') == 'getDataI2C':
            print("Processing getDataI2C command")
            response = installed_devices

        elif command.get('command') == 'addDevice':
            new_device = command.get('device')

            for device in installed_devices:
                if device['profile']['name'] == new_device['profile']['name'] or device['protocol_setting']['address'] == new_device['protocol_setting']['address']:
                    response = {"status": "error", "message": "Device with the same name or address already exists."}
                    client.publish(I2C_RESPONSE_TOPIC, json.dumps(response), qos=1, retain=False)
                    return

            installed_devices.append(new_device)
            save_installed_devices(I2C_CONFIG_PATH, installed_devices)
            response = {"status": "success", "message": "Device added successfully"}
            client.publish(I2C_RESPONSE_TOPIC, json.dumps(response))

        elif command.get('command') == 'updateDevice':
            old_name = command.get('old_name')
            updated_device = command.get('device')

            if old_name is not None and updated_device:
                for device in installed_devices:
                    if device['profile']['name'] == old_name:
                        device['profile'] = updated_device['profile']
                        device['protocol_setting'] = updated_device['protocol_setting']
                        save_installed_devices(I2C_CONFIG_PATH, installed_devices)
                        response = {"status": "success", "message": "Device updated successfully"}
                        client.publish(I2C_RESPONSE_TOPIC, json.dumps(response))
                        break
                else:
                    response = {"status": "error", "message": "Device not found"}
                    client.publish(I2C_RESPONSE_TOPIC, json.dumps(response))
            else:
                response = {"status": "error", "message": "Invalid data provided"}
                client.publish(I2C_RESPONSE_TOPIC, json.dumps(response))

        elif command.get('command') == 'deleteDevice':
            device_name = command.get('name')
            installed_devices = [device for device in installed_devices if device.get('profile', {}).get('name') != device_name]
            save_installed_devices(I2C_CONFIG_PATH, installed_devices)
            response = {"status": "success", "message": "Device deleted successfully"}
            client.publish(I2C_RESPONSE_TOPIC, json.dumps(response))

        elif command.get('command') == 'checkI2CAddresses':
            print("Processing checkI2CAddresses command")
            try:
                i2c_result = check_i2c_addresses()
                response = {"status": "success", "data": i2c_result}
            except Exception as e:
                print(f"Error checking I2C addresses: {e}")
                response = {"status": "error", "message": str(e)}

            client.publish(I2C_RESPONSE_TOPIC, json.dumps(response), qos=0, retain=False)

        else:
            response = {"status": "error", "message": "Unknown command"}

        client.publish(I2C_RESPONSE_TOPIC, json.dumps(response), qos=0, retain=False)

    except json.JSONDecodeError as e:
        error_msg = f"Error decoding I2C message payload: {e}"
        send_error_log("handle_i2c_message", error_msg, "error", {"payload": payload})
    except Exception as e:
        error_msg = f"Error processing I2C message: {e}"
        send_error_log("handle_i2c_message", error_msg, "error", {"payload": payload})

# Handle incoming MQTT messages for service restart
def handle_service_restart_message(client, userdata, message):
    print(f"Received Service Restart message: {message.payload.decode('utf-8')} on topic {message.topic}")
    payload = message.payload.decode('utf-8')
    try:
        command = json.loads(payload)

        if command.get('command') == 'restartService':
            service_name = command.get('service')
            response = restart_service(service_name)
        else:
            response = {"status": "error", "message": "Unknown command"}

        client.publish(SERVICE_RESTART_RESPONSE_TOPIC, json.dumps(response), qos=0, retain=False)

    except json.JSONDecodeError as e:
        error_msg = f"Error decoding Service Restart message payload: {e}"
        send_error_log("handle_service_restart_message", error_msg, "error", {"payload": payload})
    except Exception as e:
        error_msg = f"Error processing Service Restart message: {e}"
        send_error_log("handle_service_restart_message", error_msg, "error", {"payload": payload})

# Handle I2C scan command and publish result
def handle_i2c_scan_message(client, userdata, message):
    print(f"Received I2C scan command on topic {message.topic}")
    payload = message.payload.decode()
    print(f"Payload: {payload}")

    try:
        command = json.loads(payload)
        if command.get("command") == "scan_i2c":
            print("Executing I2C scan...")
            result = check_i2c_addresses()
            response = {"status": "success", "data": result}
            print(f"Publishing I2C scan result: {response}")
            client.publish(SCAN_I2C_RESPONSE_TOPIC, json.dumps(response))
    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON format for I2C scan: {e}"
        send_error_log("handle_i2c_scan_message", error_msg, "error", {"payload": payload})
    except Exception as e:
        error_msg = f"Error processing I2C scan command: {e}"
        send_error_log("handle_i2c_scan_message", error_msg, "error", {"payload": payload})

# Check I2C addresses using the i2cdetect command
def check_i2c_addresses():
    try:
        result = subprocess.run(['sudo', 'i2cdetect', '-y', '0'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        error_msg = f"Error running i2cdetect command: {e}"
        send_error_log("check_i2c_addresses", error_msg, "error", {"command": "i2cdetect -y 0"})
        return ""

# Get local MAC, IP, and username (shortName)
def get_local_mac_ip_username():
    mac_address = "Unknown"
    ip_address = "Unknown"
    username = getpass.getuser()

    try:
        interfaces = ni.interfaces()

        for iface in interfaces:
            if iface == 'lo':
                continue

            current_mac = get_mac_address(interface=iface)
            if current_mac:
                mac_address = current_mac

            if ni.AF_INET in ni.ifaddresses(iface):
                ip_address = ni.ifaddresses(iface)[ni.AF_INET][0]['addr']
                if mac_address != "Unknown" and ip_address != "Unknown":
                    break

        if ip_address == "Unknown":
            print("Error: No active network interface found with an IPv4 address.")

    except Exception as e:
        error_msg = f"Error getting local MAC/IP/username: {e}"
        send_error_log("get_local_mac_ip_username", error_msg, "error")

    return mac_address, ip_address, username

# Send device data
def send_device_data(client, device_type, data):
    try:
        mac, ip, username = get_local_mac_ip_username()
        payload = {
            "mac": mac,
            "ip": ip,
            "shortName": username,
            "type": device_type,
            "devices": data
        }
        topic = MODBUS_SNMP_DATA_TOPIC if device_type == "modbus" else I2C_DATA_TOPIC
        client.publish(topic, json.dumps(payload))
    except Exception as e:
        error_msg = f"Error sending device data: {e}"
        send_error_log("send_device_data", error_msg, "error", {"device_type": device_type})

# Callback ketika pesan diterima
def on_message(client, userdata, message):
    try:
        if message.topic == MQTT_PING_TOPIC:
            print(f"Pesan diterima dari topik {MQTT_PING_TOPIC}")

        payload = message.payload.decode("utf-8")
        print(f"Payload diterima: {payload}")

        try:
            parsed_payload = json.loads(payload)
            command = parsed_payload.get("command")
            print(f"Command ditemukan: {command}")

            if command == "device_modbus":
                print("Menangani perintah device_modbus")
                devices = load_installed_devices(MODBUS_SNMP_CONFIG_PATH)
                send_device_data(client, "modbus", devices)
            elif command == "device_i2c":
                print("Menangani perintah device_i2c")
                devices = load_installed_devices(I2C_CONFIG_PATH)
                send_device_data(client, "i2c", devices)
            else:
                print(f"Perintah tidak dikenal: {command}")
        except json.JSONDecodeError:
            ip_address = payload.strip()
            print(f"Permintaan ping untuk IP: {ip_address}")

            result = os.system(f"ping -c 2 {ip_address}")

            if result == 0:
                client.publish(MQTT_RESULT_TOPIC, f"Ping to {ip_address} successful")
                print(f"Ping ke {ip_address} berhasil.")
            else:
                client.publish(MQTT_RESULT_TOPIC, f"Ping to {ip_address} failed")
                print(f"Ping ke {ip_address} gagal.")

    except Exception as e:
        error_msg = f"Error during message handling: {e}"
        send_error_log("on_message", error_msg, "error", {"topic": message.topic})

# Periodic sending function
def periodic_publish(client):
    while True:
        try:
            modbus_devices = load_installed_devices(MODBUS_SNMP_CONFIG_PATH)
            i2c_devices = load_installed_devices(I2C_CONFIG_PATH)
            send_device_data(client, "modbus", modbus_devices)
            send_device_data(client, "i2c", i2c_devices)
        except Exception as e:
            error_msg = f"Error during periodic publishing: {e}"
            send_error_log("periodic_publish", error_msg, "error")
        time.sleep(10)

def on_connect_operations(client, userdata, flags, rc):
    global local_broker_connected
    if rc == 0:
        local_broker_connected = True
        log_simple("Local MQTT broker connected", "SUCCESS")
        client.subscribe(MQTT_PING_TOPIC)
        client.subscribe(MODBUS_SNMP_COMMAND_TOPIC)
        client.subscribe(I2C_COMMAND_TOPIC)
        client.subscribe(SERVICE_RESTART_COMMAND_TOPIC)
        client.subscribe(SCAN_I2C_COMMAND_TOPIC)
    else:
        local_broker_connected = False
        log_simple(f"Local MQTT broker connection failed (code {rc})", "ERROR")

def on_connect_publishing(client, userdata, flags, rc):
    global data_broker_connected
    if rc == 0:
        data_broker_connected = True
        log_simple("Data MQTT broker connected", "SUCCESS")
        client.subscribe(REQUEST_DATA_TOPIC)
    else:
        data_broker_connected = False
        log_simple(f"Data MQTT broker connection failed (code {rc})", "ERROR")

def on_disconnect(client, userdata, rc):
    global local_broker_connected, data_broker_connected
    if rc != 0:
        local_broker_connected = False
        data_broker_connected = False
        log_simple("MQTT broker disconnected", "WARNING")
        while True:
            try:
                client.reconnect()
                print("Reconnected to MQTT broker.")
                break
            except Exception as e:
                print(f"Reconnection failed: {e}")
                time.sleep(5)

# --- Fungsi baru untuk mencoba koneksi ---
def try_connect_mqtt(client, broker_address, broker_port):
    try:
        print(f"Mencoba menyambungkan ke broker MQTT di {broker_address}:{broker_port}...")
        client.connect(broker_address, broker_port)
        print(f"Koneksi ke broker MQTT di {broker_address}:{broker_port} BERHASIL.")
        return True
    except Exception as e:
        print(f"Error: Koneksi ke broker MQTT di {broker_address}:{broker_port} GAGAL: {e}")
        return False
# --- Akhir fungsi baru ---

# Setup MQTT client for localhost broker (operations)
def setup_mqtt_client_operations():
    client = mqtt.Client()

    client.on_connect = on_connect_operations
    client.on_disconnect = on_disconnect

    client.message_callback_add(MODBUS_SNMP_COMMAND_TOPIC, handle_modbus_snmp_message)
    client.message_callback_add(I2C_COMMAND_TOPIC, handle_i2c_message)
    client.message_callback_add(SERVICE_RESTART_COMMAND_TOPIC, handle_service_restart_message)
    client.message_callback_add(SCAN_I2C_COMMAND_TOPIC, handle_i2c_scan_message)

    # Menggunakan fungsi try_connect_mqtt
    if not try_connect_mqtt(client, 'localhost', 1883):
        # Jika koneksi gagal, Anda bisa menambahkan penanganan error lebih lanjut di sini
        # Misalnya, keluar dari program atau mencoba lagi setelah beberapa saat
        pass # Untuk saat ini, kita hanya akan mencetak error

    return client

# Setup MQTT client for data publishing broker
def setup_mqtt_client_publishing():
    client = mqtt.Client()

    mqtt_config = load_mqtt_config()
    username = mqtt_config.get('username', None)
    password = mqtt_config.get('password', None)

    if username and password:
        client.username_pw_set(username, password)

    client.on_connect = on_connect_publishing
    client.on_disconnect = on_disconnect
    client.on_message = on_message

    broker_address = mqtt_config.get("broker_address", MQTT_BROKER)
    broker_port = int(mqtt_config.get("broker_port", MQTT_PORT))

    # Menggunakan fungsi try_connect_mqtt
    if not try_connect_mqtt(client, broker_address, broker_port):
        # Jika koneksi gagal, Anda bisa menambahkan penanganan error lebih lanjut di sini
        # Misalnya, keluar dari program atau mencoba lagi setelah beberapa saat
        pass # Untuk saat ini, kita hanya akan mencetak error

    return client

# Main function to run both clients
def main():
    global local_broker_connected, data_broker_connected
    
    # Print startup banner
    print_startup_banner()
    
    log_simple("Initializing error logger...")
    initialize_error_logger()
    
    log_simple("Setting up MQTT clients...")
    client_operations = setup_mqtt_client_operations()
    client_publishing = setup_mqtt_client_publishing()

    # Wait a moment for connections to establish
    time.sleep(2)
    
    # Print success banner and broker status
    print_success_banner()
    print_broker_status(local_broker_connected, data_broker_connected)

    log_simple("Starting periodic publish thread...")
    threading.Thread(target=periodic_publish, args=(client_publishing,), daemon=True).start()
    
    log_simple("Device Config service started successfully", "SUCCESS")

    try:
        client_operations.loop_forever()
    except KeyboardInterrupt:
        log_simple("Device config service stopped by user", "WARNING")
    except Exception as e:
        log_simple(f"Critical error: {e}", "ERROR")
        send_error_log("main", f"Unhandled exception in main loop: {e}", "critical")
    finally:
        log_simple("Shutting down services...")
        if error_logger_client:
            error_logger_client.loop_stop()
            error_logger_client.disconnect()
        log_simple("Application terminated", "SUCCESS")

if __name__ == "__main__":
    main()