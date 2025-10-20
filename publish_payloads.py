#!/usr/bin/env python3

import json
import time
import logging
import random
from datetime import datetime
import paho.mqtt.client as mqtt

class PayloadPublisher:
    def __init__(self, broker_host="localhost", broker_port=1883):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.topics = [
            "iot/server/main/dc",
            "iot/bandung/digital/campus",
            "iot/makassar/enterprise/hub",
            "iot/medan/cloud/center",
            "iot/papua/jayapura/hub"
        ]
        self.client = None
        self.running = False

        # Setup logging
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(__name__)

    def connect_mqtt(self):
        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                self.logger.info("Connected to MQTT Broker!")
            else:
                self.logger.error(f"Failed to connect, return code {rc}")

        def on_publish(client, userdata, mid):
            self.logger.debug(f"Message {mid} published")

        self.client = mqtt.Client()
        self.client.on_connect = on_connect
        self.client.on_publish = on_publish
        self.client.connect(self.broker_host, self.broker_port)
        self.client.loop_start()

    def generate_payload(self, topic):
        """Generate dummy payload based on topic"""
        base_payload = {
            "timestamp": datetime.now().isoformat(),
            "device_id": topic.split('/')[-1],
            "topic": topic,
            "status": "online",
            "uptime": random.randint(1000, 10000)
        }

        if "server" in topic or "dc" in topic:
            base_payload.update({
                "type": "datacenter_server_monitoring",
                "server_status": {
                    "cpu_load_percent": random.randint(10, 90),
                    "memory_usage_percent": random.randint(20, 95),
                    "disk_usage_percent": random.randint(5, 70),
                    "network_bandwidth_mbps": round(random.uniform(100, 1000), 1),
                    "active_services": random.randint(5, 20),
                    "response_time_ms": round(random.uniform(1, 50), 1),
                    "temperature_celsius": round(random.uniform(20, 45), 1),
                    "power_consumption_kw": round(random.uniform(2, 15), 2)
                },
                "infrastructure": {
                    "rack_count": random.randint(10, 50),
                    "server_count": random.randint(20, 200),
                    "storage_tb": random.randint(100, 5000),
                    "backup_status": random.choice(["healthy", "warning", "critical"])
                }
            })
        elif "bandung" in topic:
            base_payload.update({
                "type": "campus_monitoring",
                "environment": {
                    "indoor_temp": round(random.uniform(20, 35), 1),
                    "humidity_percent": round(random.uniform(40, 80), 1),
                    "air_quality_ppm": random.randint(200, 1000),
                    "noise_level_db": round(random.uniform(30, 80), 1),
                    "light_level_lux": random.randint(100, 1000),
                    "occupancy_count": random.randint(0, 100)
                },
                "digital_services": {
                    "wifi_clients": random.randint(50, 200),
                    "network_devices": random.randint(5, 30),
                    "server_response_ms": round(random.uniform(50, 200), 1),
                    "uptime_percent": round(random.uniform(95, 99.9), 1),
                    "active_sessions": random.randint(100, 500),
                    "bandwidth_usage_mbps": round(random.uniform(20, 100), 2)
                }
            })
        elif "makassar" in topic:
            base_payload.update({
                "type": "enterprise_monitoring",
                "network_status": {
                    "wan_connected": True,
                    "wan_ip": f"192.168.1.{random.randint(1, 255)}",
                    "lan_connected": True,
                    "wifi_connected": True,
                    "vpn_active": random.choice([True, False])
                },
                "network_metrics": {
                    "wan_download_mbps": round(random.uniform(50, 100), 1),
                    "wan_upload_mbps": round(random.uniform(10, 30), 1),
                    "lan_traffic_rx_mbps": round(random.uniform(100, 900), 1),
                    "lan_traffic_tx_mbps": round(random.uniform(200, 1000), 1),
                    "signal_strength_dbm": random.randint(-30, -20),
                    "ping_ms": round(random.uniform(10, 50), 1),
                    "packet_loss_percent": round(random.uniform(0, 1), 2),
                    "jitter_ms": round(random.uniform(1, 5), 1)
                }
            })
        elif "medan" in topic:
            base_payload.update({
                "type": "cloud_monitoring",
                "server_monitor": {
                    "cpu_usage_percent": random.randint(10, 80),
                    "ram_usage_percent": random.randint(20, 90),
                    "disk_usage_percent": random.randint(10, 50),
                    "network_rx_mbps": round(random.uniform(50, 300), 1),
                    "network_tx_mbps": round(random.uniform(30, 200), 1),
                    "active_connections": random.randint(50, 200)
                },
                "power_metrics": {
                    "main_voltage": round(random.uniform(210, 230), 1),
                    "current_phase_a": round(random.uniform(10, 25), 1),
                    "total_power_kw": round(random.uniform(5, 25), 2)
                }
            })
        elif "papua" in topic:
            base_payload.update({
                "type": "regional_monitoring",
                "environmental_metrics": {
                    "temperature": round(random.uniform(25, 35), 1),
                    "humidity": round(random.uniform(60, 90), 1),
                    "wind_speed_kmh": round(random.uniform(5, 25), 1),
                    "barometric_pressure_hpa": round(random.uniform(1000, 1020), 1)
                },
                "connectivity_status": {
                    "satellite_link": random.choice(["good", "fair", "poor"]),
                    "cellular_signal": random.randint(1, 5),
                    "internet_speed_mbps": round(random.uniform(5, 50), 1)
                }
            })

        return base_payload

    def publish_payloads(self, interval=1):
        self.running = True
        self.logger.info("Starting payload publishing...")

        while self.running:
            for topic in self.topics:
                payload = self.generate_payload(topic)
                json_payload = json.dumps(payload)

                # Publish
                result = self.client.publish(topic, json_payload, qos=1)
                self.logger.info(f"Published to {topic}: {payload['type']} - uptime: {payload['uptime']}")

                if result.rc != mqtt.MQTT_ERR_SUCCESS:
                    self.logger.error(f"Failed to publish to {topic}, code: {result.rc}")

            time.sleep(interval)

    def stop(self):
        self.running = False
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
        self.logger.info("Stopped payload publishing")

def main():
    publisher = PayloadPublisher()
    publisher.connect_mqtt()

    try:
        publisher.publish_payloads(interval=1)
    except KeyboardInterrupt:
        publisher.stop()
    except Exception as e:
        publisher.logger.error(f"Error: {e}")
        publisher.stop()

if __name__ == "__main__":
    main()
