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
    "ph3": "limbah/ph3",
    "flow1": "limbah/flow1",
    "flow2": "limbah/flow2",
    "relay_mini": "limbah/relay_mini",
    "optocoupler": "limbah/optocoupler",
    "airquality1_sps30": "limbah/airquality1/sps30",
    "airquality2_sps30": "limbah/airquality2/sps30",
    "airquality1_lis3dhtr": "limbah/airquality1/lis3dhtr",
    "airquality1_sht4x": "limbah/airquality1/sht4x",
    "airquality2_sht4x": "limbah/airquality2/sht4x"
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
    "ph3": {
        "mac": "e4:5f:01:94:3e:92",
        "protocol_type": "MODBUS RTU",
        "number_address": 3,
        "value": json.dumps({
            "temp": 35.39,
            "ph": 1.15,
            "PollingDuration": 1.03
        }),
        "Timestamp": "2023-08-29 09:23:21"
    },
    "flow1": {
        "device_name": "flowMeter1",
        "protocol_type": "MODBUS RTU",
        "comport": "/dev/ttyUSB0",
        "modbus_address": 3,
        "value": json.dumps({
            "flow_rate": 0.0,
            "velocity": 0.0,
            "flow_direction": "No Flow",
            "total_flow": 0.0,
            "total_flow_today": 0.0,
            "total_flow_this_month": 18.0,
            "error_status": "Low Signal",
            "error_code": 2,
            "error_details": {
                "no_signal": 0,
                "low_signal": 1,
                "poor_signal": 0,
                "pipe_empty": 0,
                "hardware_failure": 0,
                "status": "Low Signal"
            },
            "signal_quality": 0,
            "working_step": 3,
            "upstream_strength": 3255,
            "downstream_strength": 3351,
            "signal_strength_status": "Excellent",
            "temperature_inlet": 21.49,
            "temperature_outlet": 21.48,
            "temperature_difference": -0.0,
            "working_hours": 52304,
            "meter_health": "Poor",
            "polling_duration": 2.674146890640259
        })
    },
    "flow2": {
        "device_name": "flowMeter2",
        "protocol_type": "MODBUS RTU",
        "comport": "/dev/ttyUSB0",
        "modbus_address": 4,
        "value": json.dumps({
            "flow_rate": 0.0,
            "velocity": 0.0,
            "flow_direction": "No Flow",
            "total_flow": 0.0,
            "total_flow_today": 0.0,
            "total_flow_this_month": 18.0,
            "error_status": "Low Signal",
            "error_code": 2,
            "error_details": {
                "no_signal": 0,
                "low_signal": 1,
                "poor_signal": 0,
                "pipe_empty": 0,
                "hardware_failure": 0,
                "status": "Low Signal"
            },
            "signal_quality": 0,
            "working_step": 3,
            "upstream_strength": 3255,
            "downstream_strength": 3351,
            "signal_strength_status": "Excellent",
            "temperature_inlet": 21.49,
            "temperature_outlet": 21.48,
            "temperature_difference": -0.0,
            "working_hours": 52304,
            "meter_health": "Poor",
            "polling_duration": 2.674146890640259
        })
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
    },
    "airquality1_sps30": {
        "device_name": "SPS30_Sensor",
        "protocol_type": "MQTT",
        "comport": "",
        "modbus_address": 0,
        "value": json.dumps({
            "pm1_0": 36.42,
            "pm2_5": 149.77,
            "pm10_0": 288.15,
            "typical_particle_size": 0.00
        })
    },
    "airquality2_sps30": {
        "device_name": "SPS30_Sensor",
        "protocol_type": "MQTT",
        "comport": "",
        "modbus_address": 0,
        "value": json.dumps({
            "pm1_0": 36.42,
            "pm2_5": 149.77,
            "pm10_0": 288.15,
            "typical_particle_size": 0.00
        })
    },
    "airquality1_lis3dhtr": {
        "device_name": "LIS3DHTR_Accelerometer",
        "protocol_type": "MQTT",
        "comport": "",
        "modbus_address": 0,
        "value": json.dumps({
            "X": -0.01,
            "Y": -1.06,
            "Z": -0.07
        })
    },
    "airquality1_sht4x": {
        "device_name": "SHT_Sensor",
        "protocol_type": "MQTT",
        "comport": "",
        "modbus_address": 0,
        "value": json.dumps({
            "temperature_C": 33.63,
            "humidity_%": 54.00
        })
    },
    "airquality2_sht4x": {
        "device_name": "SHT_Sensor",
        "protocol_type": "MQTT",
        "comport": "",
        "modbus_address": 0,
        "value": json.dumps({
            "temperature_C": 33.63,
            "humidity_%": 54.00
        })
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
    if "ph" in sensor_type:
        return {
            "temp": round(random.uniform(30.0, 40.0), 2),
            "ph": round(random.uniform(1.0, 14.0), 2),
            "PollingDuration": round(random.uniform(0.5, 2.0), 2)
        }
    elif "flow" in sensor_type:
        flow_directions = ["Forward", "Reverse", "No Flow"]
        error_statuses = ["OK", "Low Signal", "High Signal", "Error"]
        statuses = ["OK", "Low Signal", "Poor", "Error"]
        signal_statuses = ["Excellent", "Good", "Poor", "No Signal"]
        healths = ["Excellent", "Good", "Poor"]
        return {
            "flow_rate": round(random.uniform(0.0, 100.0), 2),
            "velocity": round(random.uniform(0.0, 10.0), 2),
            "flow_direction": random.choice(flow_directions),
            "total_flow": round(random.uniform(0.0, 1000.0), 2),
            "total_flow_today": round(random.uniform(0.0, 50.0), 2),
            "total_flow_this_month": round(random.uniform(0.0, 1000.0), 2),
            "error_status": random.choice(error_statuses),
            "error_code": random.randint(0, 5),
            "error_details": {
                "no_signal": random.randint(0,1),
                "low_signal": random.randint(0,1),
                "poor_signal": random.randint(0,1),
                "pipe_empty": random.randint(0,1),
                "hardware_failure": random.randint(0,1),
                "status": random.choice(statuses)
            },
            "signal_quality": random.randint(0, 100),
            "working_step": random.randint(1, 5),
            "upstream_strength": random.randint(3000, 4000),
            "downstream_strength": random.randint(3000, 4000),
            "signal_strength_status": random.choice(signal_statuses),
            "temperature_inlet": round(random.uniform(20.0, 30.0), 2),
            "temperature_outlet": round(random.uniform(20.0, 30.0), 2),
            "temperature_difference": round(random.uniform(-1.0, 1.0), 2),
            "working_hours": random.randint(50000, 60000),
            "meter_health": random.choice(healths),
            "polling_duration": round(random.uniform(2.0, 3.0), 6)
        }
    elif sensor_type == "relay_mini":
        return {f"relayMiniOutput{i}": random.choice([True, False]) for i in range(1, 7)}
    elif sensor_type == "optocoupler":
        return {f"optocouplerInput{i}": random.choice([True, False]) for i in range(1, 8)} | \
               {f"optocouplerOutput{i}": random.choice([True, False]) for i in range(1, 8)}
    elif "_sps30" in sensor_type:
        return {
            "pm1_0": round(random.uniform(0.0, 100.0), 2),
            "pm2_5": round(random.uniform(0.0, 300.0), 2),
            "pm10_0": round(random.uniform(0.0, 500.0), 2),
            "typical_particle_size": round(random.uniform(0.0, 10.0), 2)
        }
    elif "_lis3dhtr" in sensor_type:
        return {
            "X": round(random.uniform(-2.0, 2.0), 2),
            "Y": round(random.uniform(-2.0, 2.0), 2),
            "Z": round(random.uniform(-2.0, 2.0), 2)
        }
    elif "_sht4x" in sensor_type:
        return {
            "temperature_C": round(random.uniform(20.0, 40.0), 2),
            "humidity_%": round(random.uniform(0.0, 100.0), 2)
        }
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

            # Update MAC address dengan yang asli dari sistem jika ada
            if "mac" in data:
                data["mac"] = SYSTEM_MAC

            # Update nilai dinamis berdasarkan sensor type
            dynamic_values = generate_dynamic_values(key)
            if dynamic_values:
                data["value"] = json.dumps(dynamic_values)

            # Update timestamp setiap publish jika ada
            if "Timestamp" in data:
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
