#!/usr/bin/env python3

import json
import time
import logging
import signal
import sys
from datetime import datetime
from pathlib import Path
import paho.mqtt.client as mqtt
from thermal_utils import ThermalInterface

class ThermalMQTTPublisher:
    def __init__(self, config_path):
        self.config_path = config_path
        self.config = self._load_config()
        self.running = False
        self.thermal = None
        self.mqtt_client = None
        
        # Setup logging
        self._setup_logging()
        self.logger = logging.getLogger('thermal_mqtt_publisher')
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        self.logger.info("Thermal MQTT Publisher initialized")
    
    def _load_config(self):
        """Load configuration from JSON file"""
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            return config
        except Exception as e:
            print(f"Error loading config: {e}")
            sys.exit(1)
    
    def _setup_logging(self):
        """Setup logging configuration"""
        log_dir = Path(__file__).parent.parent / 'logs'
        log_dir.mkdir(exist_ok=True)
        log_file = log_dir / 'thermal_mqtt.log'
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.stop()
    
    def _setup_mqtt(self):
        """Setup MQTT client"""
        try:
            self.mqtt_client = mqtt.Client()
            
            # Set authentication if configured
            if self.config['mqtt'].get('username'):
                self.mqtt_client.username_pw_set(
                    self.config['mqtt']['username'],
                    self.config['mqtt'].get('password', '')
                )
            
            # Set callbacks
            self.mqtt_client.on_connect = self._on_mqtt_connect
            self.mqtt_client.on_disconnect = self._on_mqtt_disconnect
            self.mqtt_client.on_publish = self._on_mqtt_publish
            
            # Connect to broker
            self.mqtt_client.connect(
                self.config['mqtt']['broker_host'],
                self.config['mqtt']['broker_port'],
                self.config['mqtt']['keepalive']
            )
            
            # Start loop in background
            self.mqtt_client.loop_start()
            
            self.logger.info("MQTT client setup completed")
            return True
            
        except Exception as e:
            self.logger.error(f"MQTT setup failed: {e}")
            return False
    
    def _on_mqtt_connect(self, client, userdata, flags, rc):
        """MQTT connection callback"""
        if rc == 0:
            self.logger.info("MQTT connected successfully")
            # Publish device status
            self._publish_device_status("online")
        else:
            self.logger.error(f"MQTT connection failed with code {rc}")
    
    def _on_mqtt_disconnect(self, client, userdata, rc):
        """MQTT disconnection callback"""
        self.logger.warning(f"MQTT disconnected with code {rc}")
    
    def _on_mqtt_publish(self, client, userdata, mid):
        """MQTT publish callback"""
        pass  # Can add publish confirmation logging if needed
    
    def _publish_device_status(self, status):
        """Publish device online/offline status"""
        try:
            status_topic = f"{self.config['topic']}/status"
            status_payload = {
                "device_id": self.config['device']['device_id'],
                "status": status,
                "timestamp": datetime.now().isoformat(),
                "interface": self.thermal.interface if self.thermal else "unknown"
            }
            
            self.mqtt_client.publish(
                status_topic,
                json.dumps(status_payload),
                qos=self.config['mqtt']['qos'],
                retain=True
            )
            
        except Exception as e:
            self.logger.error(f"Failed to publish device status: {e}")
    
    def _publish_thermal_data(self, frame_data, stats):
        """Publish thermal data to MQTT"""
        try:
            # Create payload
            payload = {
                "timestamp": datetime.now().isoformat(),
                "device_id": self.config['device']['device_id'],
                "device_name": self.config['device']['device_name'],
                "location": self.config['device']['location'],
                "interface": self.thermal.interface,
                "thermal_data": {
                    "raw_array": frame_data.tolist() if hasattr(frame_data, 'tolist') else list(frame_data),
                    "statistics": stats,
                    "frame_count": getattr(self, 'frame_count', 0)
                },
                "metadata": {
                    "sensor_type": "waveshare_thermal_camera_hat",
                    "resolution": "80x62",
                    "units": "celsius"
                }
            }
            
            # Publish to main topic
            result = self.mqtt_client.publish(
                self.config['topic'],
                json.dumps(payload),
                qos=self.config['mqtt']['qos']
            )
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                self.logger.debug("Thermal data published successfully")
                # Update frame counter
                self.frame_count = getattr(self, 'frame_count', 0) + 1
            else:
                self.logger.warning(f"MQTT publish failed with code {result.rc}")
                
        except Exception as e:
            self.logger.error(f"Failed to publish thermal data: {e}")
    
    def _publish_error(self, error_msg):
        """Publish error message"""
        try:
            error_topic = f"{self.config['topic']}/error"
            error_payload = {
                "device_id": self.config['device']['device_id'],
                "timestamp": datetime.now().isoformat(),
                "error": error_msg,
                "interface": self.thermal.interface if self.thermal else "unknown"
            }
            
            self.mqtt_client.publish(
                error_topic,
                json.dumps(error_payload),
                qos=self.config['mqtt']['qos']
            )
            
        except Exception as e:
            self.logger.error(f"Failed to publish error: {e}")
    
    def start(self):
        """Start the thermal MQTT publisher"""
        self.logger.info("Starting Thermal MQTT Publisher...")
        
        # Setup MQTT
        if not self._setup_mqtt():
            self.logger.error("Failed to setup MQTT, exiting")
            return False
        
        # Wait for MQTT connection
        time.sleep(2)
        
        # Initialize thermal sensor
        self.thermal = ThermalInterface(self.config)
        if not self.thermal.initialize():
            self.logger.error("Failed to initialize thermal sensor, exiting")
            return False
        
        self.logger.info(f"Thermal sensor initialized with {self.thermal.interface} interface")
        
        # Start main loop
        self.running = True
        self.frame_count = 0
        error_count = 0
        max_errors = 10
        
        try:
            while self.running:
                try:
                    # Capture thermal frame
                    frame_data = self.thermal.capture_frame()
                    
                    if frame_data is not None:
                        # Calculate statistics
                        stats = self.thermal.get_thermal_stats(frame_data)
                        
                        if stats:
                            # Publish data
                            self._publish_thermal_data(frame_data, stats)
                            
                            # Log stats periodically
                            if self.frame_count % 60 == 0:  # Every minute at 1Hz
                                self.logger.info(
                                    f"Frame {self.frame_count}: "
                                    f"Temp range: {stats['min_temp']:.1f}°C - {stats['max_temp']:.1f}°C, "
                                    f"Avg: {stats['avg_temp']:.1f}°C, "
                                    f"Interface: {self.thermal.interface}"
                                )
                            
                            # Reset error counter on success
                            error_count = 0
                        else:
                            raise Exception("Failed to calculate thermal statistics")
                    else:
                        raise Exception("Failed to capture thermal frame")
                    
                except Exception as e:
                    error_count += 1
                    error_msg = f"Capture error #{error_count}: {e}"
                    self.logger.error(error_msg)
                    self._publish_error(error_msg)
                    
                    # Try to restart sensor if too many errors
                    if error_count >= max_errors:
                        self.logger.warning(f"Too many errors ({error_count}), restarting sensor...")
                        if self.thermal.restart_sensor():
                            self.logger.info("Sensor restarted successfully")
                            error_count = 0
                        else:
                            self.logger.error("Sensor restart failed, continuing with errors...")
                            error_count = max_errors // 2  # Reduce count to try again later
                    
                    # Wait longer on errors
                    time.sleep(min(error_count * 2, 10))  # Progressive backoff, max 10s
                
                # Wait for next capture
                if self.running:
                    time.sleep(self.config['publishing']['interval'])
        
        except KeyboardInterrupt:
            self.logger.info("Keyboard interrupt received")
        except Exception as e:
            self.logger.error(f"Unexpected error in main loop: {e}")
        
        return True
    
    def stop(self):
        """Stop the thermal MQTT publisher"""
        self.logger.info("Stopping Thermal MQTT Publisher...")
        self.running = False
        
        # Publish offline status
        if self.mqtt_client:
            self._publish_device_status("offline")
            time.sleep(1)  # Give time for message to send
        
        # Clean up thermal sensor
        if self.thermal:
            self.thermal.close()
        
        # Clean up MQTT
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
        
        self.logger.info("Thermal MQTT Publisher stopped")

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Thermal Camera MQTT Publisher')
    parser.add_argument(
        '--config', 
        default='/home/containment/thermal_mqtt_project/config/mqtt_config.json',
        help='Path to configuration file'
    )
    
    args = parser.parse_args()
    
    # Check if config file exists
    if not Path(args.config).exists():
        print(f"Config file not found: {args.config}")
        sys.exit(1)
    
    # Start publisher
    publisher = ThermalMQTTPublisher(args.config)
    publisher.start()

if __name__ == "__main__":
    main()