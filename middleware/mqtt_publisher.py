import json
import time
import paho.mqtt.client as mqtt
from datetime import datetime
import random
import socket
import fcntl
import struct
import subprocess
import re

# Konfigurasi broker MQTT
BROKER = "localhost"
PORT = 1883
INTERVAL = 2  # detik

# ---------------------------
# 🟢 Daftar Topik MQTT
# ---------------------------
TOPICS = {
    "ph1": "limbah/ph1",
    "ph2": "limbah/ph2",
    "flow1": "limbah/flow1",
    "flow2": "limbah/flow2",
    "relay_mini": "limbah/relay_mini",
    "optocoupler": "limbah/optocoupler"
}

# ---------------------------
# 🟡 Payload template untuk tiap topik (format seragam)
# ---------------------------
PAYLOAD_TEMPLATES = {
    "ph1": {
        "mac": "e4:5f:01:94:3e:92",
        "protocol_type": "MODBUS RTU",
        "number_address": 1,
        "value": json.dumps({
            "temp": 35.63,
            "ph": 3.99,
            "PollingDuration": 1.04
        }),
        "Timestamp": "2023-08-29 09:23:21"
    },
    "ph2": {
        "mac": "e4:5f:01:94:3e:92",
        "protocol_type": "MODBUS RTU",
        "number_address": 2,
        "value": json.dumps({
            "temp": 35.39,
            "ph": 1.15,
            "PollingDuration": 1.03
        }),
        "Timestamp": "2023-08-29 09:23:21"
    },
    "flow1": {
        "mac": "e4:5f:01:94:3e:92",
        "protocol_type": "MODBUS RTU",
        "number_address": 3,
        "value": json.dumps({
            "flow_rate": 0.0,
            "flow_direction": "No Flow",
            "total_flow": 0.0,
            "error_status": "Low Signal",
            "error_code": 2
        }),
        "Timestamp": "2023-08-29 09:23:21"
    },
    "flow2": {
        "mac": "e4:5f:01:94:3e:92",
        "protocol_type": "MODBUS RTU",
        "number_address": 4,
        "value": json.dumps({
            "flow_rate": 0.0,
            "flow_direction": "No Flow",
            "total_flow": 0.0,
            "error_status": "Low Signal",
            "error_code": 2
        }),
        "Timestamp": "2023-08-29 09:23:21"
    },
    "relay_mini": {
        "mac": "e4:5f:01:94:3e:92",
        "protocol_type": "I2C MODULAR",
        "number_address": 32,
        "value": json.dumps({
            "relayMiniOutput1": False,
            "relayMiniOutput2": False,
            "relayMiniOutput3": False,
            "relayMiniOutput4": False,
            "relayMiniOutput5": False,
            "relayMiniOutput6": False
        }),
        "Timestamp": "2023-08-29 09:23:21"
    },
    "optocoupler": {
        "mac": "e4:5f:01:94:3e:92",
        "protocol_type": "I2C MODULAR",
        "number_address": 36,
        "value": json.dumps({
            "optocouplerInput1": False,
            "optocouplerInput2": False,
            "optocouplerInput3": False,
            "optocouplerInput4": False,
            "optocouplerInput5": False,
            "optocouplerInput6": False,
            "optocouplerInput7": False,
            "optocouplerOutput1": False,
            "optocouplerOutput2": False,
            "optocouplerOutput3": False,
            "optocouplerOutput4": False,
            "optocouplerOutput5": False,
            "optocouplerOutput6": False,
            "optocouplerOutput7": False
        }),
        "Timestamp": "2023-08-29 09:23:21"
    }
}

# ---------------------------
# 📡 Fungsi untuk mendapatkan MAC address
# ---------------------------
def get_mac_address():
    """
    Mendapatkan MAC address dari interface jaringan.
    Prioritas: eth0 > lainnya > wlan

    Returns:
        str: MAC address dalam format XX:XX:XX:XX:XX:XX atau '00:00:00:00:00:00' jika error
    """
    try:
        # Prioritas eth0
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            info = fcntl.ioctl(s.fileno(), 0x8927, struct.pack('256s', bytes('eth0', 'utf-8')[:15]))
            mac = ':'.join('%02x' % b for b in info[18:24])
            s.close()
            return mac
        except:
            pass

        # Jika eth0 tidak ada, coba wlan
        try:
            result = subprocess.run(['ip', 'link', 'show'], capture_output=True, text=True)
            wlan_match = re.search(r'wlan\d+.*?link/ether\s+([0-9a-f:]+)', result.stdout, re.IGNORECASE)
            if wlan_match:
                return wlan_match.group(1)
        except:
            pass

        # Jika tidak ada eth0 atau wlan, coba interface lain atau menggunakan hostname
        try:
            result = subprocess.run(['cat', '/sys/class/net/eth0/address'], capture_output=True, text=True)
            if result.returncode == 0:
                return result.stdout.strip()
        except:
            pass

        # Fallback ke hostname atau default
        hostname = socket.gethostname()
        return ':'.join('{:02x}'.format((ord(c) + i) % 256) for i, c in enumerate(hostname[:6]))[:17]

    except Exception as e:
        print(f"Error getting MAC address: {e}")
        return '00:00:00:00:00:00'

# ---------------------------
# 🟠 Fungsi untuk generate nilai dinamis
# ---------------------------
def generate_dynamic_values(sensor_type):
    if sensor_type in ["ph1", "ph2"]:
        return {
            "temp": round(random.uniform(30.0, 40.0), 2),
            "ph": round(random.uniform(1.0, 14.0), 2),
            "PollingDuration": round(random.uniform(0.5, 2.0), 2)
        }
    elif "flow" in sensor_type:
        flow_directions = ["Forward", "Reverse", "No Flow"]
        error_statuses = ["OK", "Low Signal", "High Signal", "Error"]
        return {
            "flow_rate": round(random.uniform(0.0, 100.0), 2),
            "flow_direction": random.choice(flow_directions),
            "total_flow": round(random.uniform(0.0, 1000.0), 2),
            "error_status": random.choice(error_statuses),
            "error_code": random.randint(0, 5)
        }
    elif sensor_type == "relay_mini":
        return {f"relayMiniOutput{i}": random.choice([True, False]) for i in range(1, 7)}
    elif sensor_type == "optocoupler":
        return {f"optocouplerInput{i}": random.choice([True, False]) for i in range(1, 8)} | \
               {f"optocouplerOutput{i}": random.choice([True, False]) for i in range(1, 8)}
    else:
        return {}

# ---------------------------
# 🔵 MQTT Publisher
# ---------------------------
client = mqtt.Client()
client.connect(BROKER, PORT, 60)

# ---------------------------
# 🟡 Get MAC address sekali di awal
# ---------------------------
SYSTEM_MAC = get_mac_address()
print(f"Using MAC address: {SYSTEM_MAC}")

try:
    while True:
        for key in TOPICS:
            topic = TOPICS[key]
            template = PAYLOAD_TEMPLATES[key]

            # Buat copy dari template
            data = template.copy()

            # Update MAC address dengan yang asli dari sistem
            data["mac"] = SYSTEM_MAC

            # Update nilai dinamis berdasarkan sensor type
            dynamic_values = generate_dynamic_values(key)
            if dynamic_values:
                data["value"] = json.dumps(dynamic_values)

            # Update timestamp setiap publish
            data["Timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Convert ke JSON string
            payload = json.dumps(data)
            client.publish(topic, payload)
            print(f"[PUBLISH] Topic: {topic}")
            print(f"Payload: {payload}\n")

            time.sleep(INTERVAL)

except KeyboardInterrupt:
    print("Stopped by user.")
    client.disconnect()
