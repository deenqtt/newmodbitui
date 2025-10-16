import json
import time
import random
import paho.mqtt.client as mqtt
from datetime import datetime

# Konfigurasi MQTT
BROKER = "localhost"
PORT = 1883

# Topik MQTT
TOPIC_RELAY = "IOT/relay_mini/1"
TOPIC_OPTO = "IOT/optocoupler/1"
TOPIC_WATERFLOW = "IOT/waterflow/1"

# Inisialisasi client MQTT
client = mqtt.Client()
client.connect(BROKER, PORT, 60)

# Data umum
mac_address = "e4:5f:01:94:3e:92"
protocol_type = "I2C MODULAR"

# Status awal relay
relay_state = {
    "relayMiniOutput1": False,
    "relayMiniOutput2": False,
    "relayMiniOutput3": False,
    "relayMiniOutput4": False,
    "relayMiniOutput5": False,
    "relayMiniOutput6": False
}

# Status awal optocoupler
optocoupler_state = {
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
}

print("📡 Starting Modular Monitoring Publisher...")
print(f"  - Relay Mini Topic      : {TOPIC_RELAY}")
print(f"  - Optocoupler Topic     : {TOPIC_OPTO}")
print(f"  - Water Flow Topic      : {TOPIC_WATERFLOW}\n")

try:
    counter = 0
    while True:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Payload Relay Mini
        relay_payload = {
            "mac": mac_address,
            "protocol_type": protocol_type,
            "number_address": 32,
            "value": json.dumps(relay_state),
            "Timestamp": timestamp
        }

        # Payload Optocoupler
        opto_payload = {
            "mac": mac_address,
            "protocol_type": protocol_type,
            "number_address": 36,
            "value": json.dumps(optocoupler_state),
            "Timestamp": timestamp
        }

        # Payload Dummy Water Flow Sensor
        waterflow_value = {
            "flow_rate_Lmin": round(random.uniform(0.0, 10.0), 2),  # L/min
            "total_volume_L": round(counter * random.uniform(0.05, 0.1), 2)
        }

        waterflow_payload = {
            "mac": mac_address,
            "protocol_type": protocol_type,
            "number_address": 40,
            "value": json.dumps(waterflow_value),
            "Timestamp": timestamp
        }

        # Publish semua topik
        client.publish(TOPIC_RELAY, json.dumps(relay_payload))
        client.publish(TOPIC_OPTO, json.dumps(opto_payload))
        client.publish(TOPIC_WATERFLOW, json.dumps(waterflow_payload))

        print(f"[{timestamp}] Published to all topics.")
        print(f"Relay Mini Payload:\n{json.dumps(relay_payload, indent=2)}")
        print(f"Optocoupler Payload:\n{json.dumps(opto_payload, indent=2)}")
        print(f"Water Flow Payload:\n{json.dumps(waterflow_payload, indent=2)}\n")

        counter += 1
        time.sleep(2)  # interval 2 detik

except KeyboardInterrupt:
    print("\n🛑 Stopped by user.")

finally:
    client.disconnect()
    print("🔌 MQTT disconnected.")
