#!/usr/bin/env python3

import json
import sqlite3
import time
import logging
import sys
import os
from datetime import datetime
import paho.mqtt.client as mqtt

class NodeInfoManager:
    def __init__(self, broker_host="localhost", broker_port=1883):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.config_file = "middleware/CONFIG_SYSTEM_DEVICE/JSON/nodeInfoConfig.json"
        self.db_path = "prisma/iot_dashboard.db"
        self.client = None

        # MQTT config paths (similar to Network.py)
        self.mqtt_modbus_config_path = "../MODBUS_SNMP/JSON/Config/mqtt_config.json"
        self.mqtt_i2c_config_path = "../MODULAR_I2C/JSON/Config/mqtt_config.json"

        # Setup logging
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(__name__)

    def read_config(self):
        """Read configuration from JSON file"""
        try:
            with open(self.config_file, 'r') as f:
                config = json.load(f)
                self.logger.info(f"Configuration loaded: {config}")
                return config
        except FileNotFoundError:
            self.logger.error(f"Configuration file not found: {self.config_file}")
            return None
        except json.JSONDecodeError as e:
            self.logger.error(f"Invalid JSON in configuration file: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Error reading configuration: {e}")
            return None

    def load_mqtt_config(self):
        """Load MQTT configuration from available config files (similar to Network.py)"""
        # Try MODBUS config first
        try:
            if os.path.exists(self.mqtt_modbus_config_path):
                with open(self.mqtt_modbus_config_path, 'r') as f:
                    config = json.load(f)
                    self.logger.info(f"Loaded MQTT config from MODBUS file: {config}")
                    return config
        except Exception as e:
            self.logger.warning(f"Failed to load MODBUS MQTT config: {e}")

        # Try I2C config as fallback
        try:
            if os.path.exists(self.mqtt_i2c_config_path):
                with open(self.mqtt_i2c_config_path, 'r') as f:
                    config = json.load(f)
                    self.logger.info(f"Loaded MQTT config from I2C file: {config}")
                    return config
        except Exception as e:
            self.logger.warning(f"Failed to load I2C MQTT config: {e}")

        # Return None if no config found
        self.logger.info("No MQTT config files found, using default localhost settings")
        return None

    def connect_mqtt(self):
        """Connect to MQTT broker"""
        self.connection_success = False

        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                self.logger.info("Connected to MQTT Broker!")
                self.connection_success = True
            else:
                self.logger.error(f"Failed to connect, return code {rc}")

        def on_publish(client, userdata, mid):
            self.logger.debug(f"Message {mid} published")

        # Generate unique client ID to avoid conflicts
        import random
        client_id = f"node_info_publisher_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
        self.client = mqtt.Client(client_id=client_id, clean_session=True)

        self.client.on_connect = on_connect
        self.client.on_publish = on_publish

        try:
            self.client.connect(self.broker_host, self.broker_port, 60)
            self.client.loop_start()
            self.logger.info(f"Connecting to MQTT broker at {self.broker_host}:{self.broker_port}")

            # Wait for connection to establish
            start_time = time.time()
            while not self.connection_success and (time.time() - start_time) < 10:
                time.sleep(0.1)

            if not self.connection_success:
                self.logger.error("Timeout waiting for MQTT connection")
                return False

            return True

        except Exception as e:
            self.logger.error(f"Failed to connect to MQTT broker: {e}")
            return False

    def get_alarm_logs(self):
        """Query all alarm logs from database with alarm configuration details"""
        try:
            # Connect to SQLite database
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # Enable column access by name
            cursor = conn.cursor()

            # Query AlarmLog with joined AlarmConfiguration
            query = """
                SELECT
                    al.id,
                    al.status,
                    al.triggeringValue,
                    al.timestamp,
                    al.clearedAt,
                    al.alarmConfigId,
                    ac.customName as alarmConfigName,
                    ac.alarmType,
                    ac.keyType,
                    ac.key,
                    ac.deviceUniqId,
                    ac.minValue,
                    ac.maxValue,
                    ac.maxOnly
                FROM AlarmLog al
                LEFT JOIN AlarmConfiguration ac ON al.alarmConfigId = ac.id
                ORDER BY al.timestamp DESC
            """

            cursor.execute(query)
            rows = cursor.fetchall()

            # Convert to list of dictionaries
            alarm_logs = []
            for row in rows:
                alarm_log = {
                    "id": row[0],
                    "status": row[1],
                    "triggeringValue": row[2],
                    "timestamp": row[3],
                    "clearedAt": row[4],
                    "alarmConfigId": row[5],
                    "alarmConfig": {
                        "customName": row[6],
                        "alarmType": row[7],
                        "keyType": row[8],
                        "key": row[9],
                        "deviceUniqId": row[10],
                        "minValue": row[11],
                        "maxValue": row[12],
                        "maxOnly": row[13]
                    } if row[6] else None
                }
                alarm_logs.append(alarm_log)

            conn.close()
            self.logger.info(f"Successfully retrieved {len(alarm_logs)} alarm logs from database")
            return alarm_logs

        except sqlite3.Error as e:
            self.logger.error(f"Database error: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Error retrieving alarm logs: {e}")
            return []

    def publish_alarm_logs_data(self, config):
        """Publish alarm logs to topic from nodeInfoConfig.json + /Alarm ONLY"""
        if not config:
            self.logger.error("No configuration available")
            return False

        node_name = config.get("NODE_NAME")
        base_topic = config.get("BASE_TOPIC_MQTT")

        if not node_name or not base_topic:
            self.logger.error("NODE_NAME or BASE_TOPIC_MQTT not found in configuration")
            return False

        # Construct topic: BASE_TOPIC_MQTT + NODE_NAME + /Alarm
        topic = f"{base_topic}{node_name}/Alarm"
        self.logger.info(f"Publishing to single topic from nodeInfoConfig: {topic}")

        try:
            # Get all alarm logs
            alarm_logs = self.get_alarm_logs()

            if not alarm_logs:
                self.logger.warning("No alarm logs found to publish")
                return False

            # Create payload with metadata
            payload = {
                "nodeName": node_name,
                "baseTopic": base_topic,
                "alarmTopic": topic,
                "publishedAt": datetime.now().isoformat(),
                "totalRecords": len(alarm_logs),
                "alarmLogs": alarm_logs
            }

            # Convert to JSON
            json_payload = json.dumps(payload, default=str)

            # Publish to MQTT with retained flag - only to this topic
            result = self.client.publish(topic, json_payload, qos=1, retain=False)

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                self.logger.info(f"✓ Published {len(alarm_logs)} alarms to {topic}")
                print(f"{len(alarm_logs)} alarm success published to {topic}")  # User's request: "9 alarms success published"
                return True
            else:
                self.logger.error(f"✗ Failed to publish to {topic}, MQTT error code: {result.rc}")
                return False

        except Exception as e:
            self.logger.error(f"Error publishing alarm logs: {e}")
            return False

    def run(self, interval_seconds=10):
        """Main execution function with periodic publishing"""
        self.logger.info(f"Starting Node Info Manager with {interval_seconds}s interval...")

        # Read configuration once at startup
        config = self.read_config()
        if not config:
            self.logger.error("Failed to load configuration. Exiting...")
            return False

        # Check for MQTT config file existence first
        if not os.path.exists(self.mqtt_modbus_config_path):
            self.logger.info(f"MQTT config file not found: {self.mqtt_modbus_config_path}")
            self.logger.info("Skipping MQTT operations - MQTT broker not configured")
            return True  # Return success since this is expected behavior

        # Load MQTT configuration if available (similar to Network.py approach)
        mqtt_config = self.load_mqtt_config()
        if not mqtt_config:
            self.logger.warning("Failed to load MQTT configuration. Skipping MQTT operations.")
            return True  # Don't fail if config loading fails

        # Extract broker settings
        self.broker_host = mqtt_config.get('broker_address', self.broker_host)
        self.broker_port = mqtt_config.get('broker_port', self.broker_port)

        if not self.broker_host:
            self.logger.error("No MQTT broker address found in configuration")
            return False

        self.logger.info(f"Using MQTT config from MODBUS file: {self.broker_host}:{self.broker_port}")

        # Connect to MQTT once at startup
        if not self.connect_mqtt():
            self.logger.error("Failed to establish MQTT connection. Exiting...")
            return False

        self.logger.info(f"🔄 Starting periodic publication every {interval_seconds} seconds...")

        try:
            while True:
                # Publish alarm logs data
                success = self.publish_alarm_logs_data(config)

                if not success:
                    self.logger.warning("Failed to publish data in this cycle")

                # Wait for next publication interval
                time.sleep(interval_seconds)

        except KeyboardInterrupt:
            self.logger.info("Received keyboard interrupt, stopping...")
        except Exception as e:
            self.logger.error(f"Unexpected error in publication loop: {e}")
        finally:
            # Cleanup
            self.logger.info("Cleaning up MQTT connection...")
            if self.client:
                self.client.loop_stop()
                self.client.disconnect()

        self.logger.info("Node Info Manager completed")
        return True

def main():
    """Main entry point"""
    # Use TCP MQTT port (1883) for Python client
    manager = NodeInfoManager(broker_host="localhost", broker_port=1883)

    try:
        success = manager.run()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        manager.logger.info("Interrupted by user")
        if manager.client:
            manager.client.loop_stop()
            manager.client.disconnect()
        sys.exit(1)
    except Exception as e:
        manager.logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
