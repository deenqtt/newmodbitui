import paho.mqtt.client as mqtt
import json
import subprocess
import os
import time
import threading
import getpass
import netifaces as ni
from getmac import get_mac_address
from datetime import datetime

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

# MQTT Topics for data publishing broker
MODBUS_SNMP_DATA_TOPIC = "data_device_modbus_node"
I2C_DATA_TOPIC = "data_device_i2c_node"
REQUEST_DATA_TOPIC = "request_data"

# Error log topic
ERROR_LOG_TOPIC = "subrack/error/log"

# Load default devices from file
def load_default_devices(client):
    try:
        with open(MODBUS_SNMP_CONFIG_PATH, 'r') as file:
            content = file.read()
            if not content:  # Handle empty file
                return []
            return json.loads(content)
    except FileNotFoundError:
        log_error(client, f"File {MODBUS_SNMP_CONFIG_PATH} not found", "major")
        return []
    except json.JSONDecodeError as e:
        log_error(client, f"Error decoding JSON from {MODBUS_SNMP_CONFIG_PATH}: {e}", "major")
        return []

# Load MQTT configuration
def load_mqtt_config(client):
    try:
        with open(MQTT_CONFIG_PATH, 'r') as file:
            mqtt_config = json.load(file)
        return mqtt_config
    except FileNotFoundError:
        log_error(client, "MQTT config file not found", "critical")
        return {}
    except json.JSONDecodeError as e:
        log_error(client, f"Error decoding MQTT config: {e}", "critical")
        return {}


# Publish error log to MQTT
def log_error(client, error_message, error_type):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    error_payload = {
        "data": error_message,
        "type": error_type,
        "Timestamp": timestamp
    }
    print(f"Error: {error_message}, Type: {error_type}")
    client.publish(ERROR_LOG_TOPIC, json.dumps(error_payload))

# Load installed devices from file
def load_installed_devices(client, config_path):
    try:
        with open(config_path, 'r') as file:
            content = file.read()
            if not content:  # Handle empty file
                return []
            return json.loads(content)
    except FileNotFoundError:
        log_error(client, f"File {config_path} not found", "major")
        return []
    except json.JSONDecodeError as e:
        log_error(client, f"Error decoding JSON from {config_path}: {e}", "major")
        return []

# Save installed devices to file
def save_installed_devices(client, config_path, devices):
    try:
        with open(config_path, 'w') as file:
            json.dump(devices, file, indent=4)
    except IOError as e:
        log_error(client, f"Error saving devices: {e}", "critical")

# Load device summary from devices_summary.json
def load_devices_summary(client):
    try:
        with open(DEVICES_SUMMARY_PATH, 'r') as file:
            print(f"Loading devices summary from {DEVICES_SUMMARY_PATH}")
            return json.load(file)
    except FileNotFoundError:
        log_error(client, f"File {DEVICES_SUMMARY_PATH} not found", "major")
        return {}
    except json.JSONDecodeError as e:
        log_error(client, f"Error decoding JSON from {DEVICES_SUMMARY_PATH}: {e}", "major")
        return {}

# Restart a service
def restart_service(client, service_name):
    try:
        subprocess.run(['sudo', 'systemctl', 'restart', service_name], check=True)
        print(f"Service {service_name} restarted successfully.")
        return {"status": "success", "message": f"Service {service_name} restarted successfully."}
    except subprocess.CalledProcessError as e:
        log_error(client, f"Failed to restart service: {e}", "critical")
        return {"status": "error", "message": f"Failed to restart service: {e}"}

# Handle incoming MQTT messages for Modbus SNMP
def handle_modbus_snmp_message(client, userdata, message):
    print(f"Received Modbus SNMP message: {message.payload.decode('utf-8')} on topic {message.topic}")
    payload = message.payload.decode('utf-8')
    try:
        command = json.loads(payload)
        devices = load_installed_devices(client, MODBUS_SNMP_CONFIG_PATH)
        response = {}

        if command.get('command') == 'getDataModbus':
            response = devices

        elif command.get('command') == 'getDataByProtocol':
            protocol = command.get('protocol')
            filtered_devices = [device for device in devices if device['protocol_setting']['protocol'] == protocol]
            response = filtered_devices

        elif command.get('command') == 'addDevice':
            new_device = command.get('device')

            # Perangkat baru ditambahkan tanpa pengecekan duplikat
            devices.append(new_device)
            save_installed_devices(client, MODBUS_SNMP_CONFIG_PATH, devices)
            response = {"status": "success", "message": "Device added successfully"}
        elif command.get('command') == 'updateDevice':
            old_name = command.get('old_name')
            updated_device = command.get('device')

            if old_name is not None and updated_device:
                for device in devices:
                    if device['profile']['name'] == old_name:
                        device['profile'] = updated_device['profile']
                        device['protocol_setting'] = updated_device['protocol_setting']
                        save_installed_devices(client, MODBUS_SNMP_CONFIG_PATH, devices)
                        response = {"status": "success", "message": "Device updated successfully"}
                        break
                else:
                    response = {"status": "error", "message": "Device not found"}
            else:
                response = {"status": "error", "message": "Invalid data provided"}

        elif command.get('command') == 'deleteDevice':
            device_name = command.get('name')
            devices = [device for device in devices if device['profile']['name'] != device_name]
            save_installed_devices(client, MODBUS_SNMP_CONFIG_PATH, devices)
            response = {"status": "success", "message": "Device deleted successfully"}

        elif command.get('command') == 'getDataSummaryByProtocol':
            protocol = command.get('protocol')
            devices_summary = load_devices_summary(client)

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
        log_error(client, f"Error processing Modbus SNMP message: {e}", "major")
        client.publish(MODBUS_SNMP_RESPONSE_TOPIC, json.dumps({"status": "error", "message": str(e)}))

# Handle incoming MQTT messages for I2C
def handle_i2c_message(client, userdata, message):
    print(f"Received I2C message: {message.payload.decode('utf-8')} on topic {message.topic}")
    payload = message.payload.decode('utf-8')
    print(f"Raw payload: {payload}")  # Tambahkan log ini
    installed_devices = load_installed_devices(client, I2C_CONFIG_PATH)
    response = {}

    try:
        command = json.loads(payload)

        if command.get('command') == 'getDataI2C':
            print("Processing getDataI2C command")
            response = installed_devices

        elif command.get('command') == 'addDevice':
            new_device = command.get('device')

            # Check for duplicate name or address before adding
            for device in installed_devices:
                if device['profile']['name'] == new_device['profile']['name'] or device['protocol_setting']['address'] == new_device['protocol_setting']['address']:
                    response = {"status": "error", "message": "Device with the same name or address already exists."}
                    client.publish(I2C_RESPONSE_TOPIC, json.dumps(response), qos=1, retain=False)
                    return

            installed_devices.append(new_device)
            save_installed_devices(client, I2C_CONFIG_PATH, installed_devices)
            response = {"status": "success", "message": "Device added successfully"}
            client.publish(I2C_RESPONSE_TOPIC, json.dumps(response))  # Send response after adding

        elif command.get('command') == 'updateDevice':
            old_name = command.get('old_name')
            updated_device = command.get('device')

            if old_name is not None and updated_device:
                for device in installed_devices:
                    if device['profile']['name'] == old_name:
                        device['profile'] = updated_device['profile']
                        device['protocol_setting'] = updated_device['protocol_setting']
                        save_installed_devices(client, I2C_CONFIG_PATH, installed_devices)
                        response = {"status": "success", "message": "Device updated successfully"}
                        client.publish(I2C_RESPONSE_TOPIC, json.dumps(response))  # Send response after update
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
            save_installed_devices(client, I2C_CONFIG_PATH, installed_devices)
            response = {"status": "success", "message": "Device deleted successfully"}
            client.publish(I2C_RESPONSE_TOPIC, json.dumps(response))  # Send response after delete

        elif command.get('command') == 'checkI2CAddresses':
            print("Processing checkI2CAddresses command")
            try:
                i2c_result = check_i2c_addresses(client)
                response = {"status": "success", "data": i2c_result}
            except Exception as e:
                log_error(client, f"Error checking I2C addresses: {e}", "major")
                response = {"status": "error", "message": str(e)}

            client.publish(I2C_RESPONSE_TOPIC, json.dumps(response), qos=0, retain=False)  # Send response for checkI2CAddresses

        else:
            response = {"status": "error", "message": "Unknown command"}

        client.publish(I2C_RESPONSE_TOPIC, json.dumps(response), qos=0, retain=False)

    except json.JSONDecodeError as e:
        log_error(client, f"Error decoding I2C message payload: {e}", "major")
    except Exception as e:
        log_error(client, f"Error processing I2C message: {e}", "major")

# Handle incoming MQTT messages for service restart
def handle_service_restart_message(client, userdata, message):
    print(f"Received Service Restart message: {message.payload.decode('utf-8')} on topic {message.topic}")
    payload = message.payload.decode('utf-8')
    try:
        command = json.loads(payload)

        if command.get('command') == 'restartService':
            service_name = command.get('service')
            response = restart_service(client, service_name)
        else:
            response = {"status": "error", "message": "Unknown command"}

        client.publish(SERVICE_RESTART_RESPONSE_TOPIC, json.dumps(response), qos=0, retain=False)

    except json.JSONDecodeError as e:
        log_error(client, f"Error decoding Service Restart message payload: {e}", "major")
    except Exception as e:
        log_error(client, f"Error processing Service Restart message: {e}", "critical")

# Handle I2C scan command and publish result
def handle_i2c_scan_message(client, userdata, message):
    print(f"Received I2C scan command on topic {message.topic}")
    payload = message.payload.decode()
    print(f"Payload: {payload}")

    try:
        command = json.loads(payload)
        if command.get("command") == "scan_i2c":
            print("Executing I2C scan...")
            result = check_i2c_addresses(client)
            response = {"status": "success", "data": result}
            print(f"Publishing I2C scan result: {response}")
            client.publish(SCAN_I2C_RESPONSE_TOPIC, json.dumps(response))
    except json.JSONDecodeError as e:
        log_error(client, f"Invalid JSON format for I2C scan: {e}", "major")
    except Exception as e:
        log_error(client, f"Error processing I2C scan command: {e}", "major")

# Check I2C addresses using the i2cdetect command
def check_i2c_addresses(client):
    try:
        result = subprocess.run(['sudo', 'i2cdetect', '-y', '0'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        log_error(client, f"Error running i2cdetect command: {e}", "major")
        return ""

# Get local MAC, IP, and username (shortName)
def get_local_mac_ip_username(client):
    try:
        # Check if the eth0 or wlan0 interfaces exist before attempting to fetch the MAC and IP addresses
        mac_address = get_mac_address(interface="eth0") or get_mac_address(interface="wlan0")
        mac_address = mac_address if mac_address else "Unknown"

        # Check IP address for eth0 if it exists
        ip_address_eth0 = "Unknown"
        if 'eth0' in ni.interfaces():
            ip_address_eth0 = ni.ifaddresses('eth0')[ni.AF_INET][0]['addr']
        else:
            log_error(client, "eth0 interface not found", "minor")

        # Username - use a default value or fetch the actual username
        username = getpass.getuser()

    except Exception as e:
        log_error(client, f"Error getting local MAC/IP/username: {e}", "minor")
        return "Unknown", "Unknown", "Unknown"

    return mac_address, ip_address_eth0, username


# Send device data
def send_device_data(client, device_type, data):
    try:
        mac, ip, username = get_local_mac_ip_username(client)
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
        log_error(client, f"Error sending device data: {e}", "major")


# Callback ketika pesan diterima
def on_message(client, userdata, message):
    try:
        # Cek apakah pesan diterima dari topik 'request/ping'
        if message.topic == MQTT_PING_TOPIC:
            print(f"Pesan diterima dari topik {MQTT_PING_TOPIC}")

        payload = message.payload.decode("utf-8")  # Mendapatkan payload dari pesan MQTT
        print(f"Payload diterima: {payload}")  # Print payload yang diterima

        # Coba parsing payload sebagai JSON
        try:
            parsed_payload = json.loads(payload)  # Coba parsing sebagai JSON
            command = parsed_payload.get("command")
            print(f"Command ditemukan: {command}")

            # Jika perintah terkait device_modbus atau device_i2c
            if command == "device_modbus":
                print("Menangani perintah device_modbus")
                devices = load_installed_devices(client, MODBUS_SNMP_CONFIG_PATH)
                send_device_data(client, "modbus", devices)
            elif command == "device_i2c":
                print("Menangani perintah device_i2c")
                devices = load_installed_devices(client, I2C_CONFIG_PATH)
                send_device_data(client, "i2c", devices)
            else:
                print(f"Perintah tidak dikenal: {command}")
        except json.JSONDecodeError:
            # Jika gagal parsing JSON, asumsikan payload adalah IP untuk ping
            ip_address = payload.strip()  # Asumsikan payload adalah IP address
            print(f"Permintaan ping untuk IP: {ip_address}")

            # Menjalankan perintah ping
            result = os.system(f"ping -c 2 {ip_address}")

            # Jika ping berhasil (kode 0), kirimkan pesan sukses
            if result == 0:
                client.publish(MQTT_RESULT_TOPIC, f"Ping to {ip_address} successful")
                print(f"Ping ke {ip_address} berhasil.")
            else:
                client.publish(MQTT_RESULT_TOPIC, f"Ping to {ip_address} failed")
                print(f"Ping ke {ip_address} gagal.")

    except Exception as e:
        print(f"Error during message handling: {e}")
        log_error(client, f"Error handling MQTT request: {e}", "critical")

# Periodic sending function
def periodic_publish(client):
    while True:
        try:
            modbus_devices = load_installed_devices(client, MODBUS_SNMP_CONFIG_PATH)
            i2c_devices = load_installed_devices(client, I2C_CONFIG_PATH)
            send_device_data(client, "modbus", modbus_devices)
            send_device_data(client, "i2c", i2c_devices)
        except Exception as e:
            log_error(client, f"Error during periodic publishing: {e}", "critical")
        time.sleep(10)  # Send every 10 seconds

def on_connect_operations(client, userdata, flags, rc):
    if rc == 0:
        print("Terhubung ke broker MQTT.")

        client.subscribe(MQTT_PING_TOPIC)
        print(f"Berhasil subscribe ke topik: {MQTT_PING_TOPIC}")  # Log saat berhasil subscribe

        client.subscribe(MODBUS_SNMP_COMMAND_TOPIC)
        client.subscribe(I2C_COMMAND_TOPIC)
        client.subscribe(SERVICE_RESTART_COMMAND_TOPIC)
        client.subscribe(SCAN_I2C_COMMAND_TOPIC)  # Tambahkan untuk scan I2C
    else:
        print(f"Failed to connect, return code {rc}")

def on_connect_publishing(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT broker (publishing)")
        # Subscribe to request_data topic
        client.subscribe(REQUEST_DATA_TOPIC)

    else:
        print(f"Failed to connect, return code {rc}")

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"Unexpected MQTT disconnection. Return code: {rc}")
        while True:
            try:
                client.reconnect()
                print("Reconnected to MQTT broker.")
                break
            except Exception as e:
                print(f"Reconnection failed: {e}")
                time.sleep(5)  # Wait for 5 seconds before retrying

# Setup MQTT client for localhost broker (operations)
def setup_mqtt_client_operations():
    client = mqtt.Client()

    # Set callbacks
    client.on_connect = on_connect_operations
    client.on_disconnect = on_disconnect

    # Subscribe callbacks for each topic
    client.message_callback_add(MODBUS_SNMP_COMMAND_TOPIC, handle_modbus_snmp_message)
    client.message_callback_add(I2C_COMMAND_TOPIC, handle_i2c_message)
    client.message_callback_add(SERVICE_RESTART_COMMAND_TOPIC, handle_service_restart_message)
    client.message_callback_add(SCAN_I2C_COMMAND_TOPIC, handle_i2c_scan_message)  # Tambahan untuk handle scan I2C

    # Connect to the localhost broker
    try:
        client.connect('localhost', 1883)
    except Exception as e:
        log_error(client, f"Error connecting to localhost MQTT broker: {e}", "critical")

    return client

# Setup MQTT client for data publishing broker
def setup_mqtt_client_publishing():
    client = mqtt.Client()

    # Load MQTT configuration
    mqtt_config = load_mqtt_config(client)
    username = mqtt_config.get('username', None)
    password = mqtt_config.get('password', None)

    if username and password:
        client.username_pw_set(username, password)

    # Set callbacks
    client.on_connect = on_connect_publishing
    client.on_disconnect = on_disconnect
    client.on_message = on_message

    # Connect to the publishing broker
    try:
        broker_address = mqtt_config.get("broker_address", MQTT_BROKER)
        broker_port = int(mqtt_config.get("broker_port", MQTT_PORT))
        client.connect(broker_address, broker_port)
    except Exception as e:
        log_error(client, f"Error connecting to publishing MQTT broker: {e}", "critical")

    return client

# Main function to run both clients
def main():
    client_operations = setup_mqtt_client_operations()
    client_publishing = setup_mqtt_client_publishing()

    # Start periodic publishing in a separate thread
    threading.Thread(target=periodic_publish, args=(client_publishing,), daemon=True).start()

    # Start the MQTT loop for the operations client
    client_operations.loop_forever()

if __name__ == "__main__":
    main()