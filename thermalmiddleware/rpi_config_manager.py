#!/usr/bin/env python3

import json
import time
import logging
import signal
import sys
import subprocess
import os
import socket
from datetime import datetime
from pathlib import Path
import paho.mqtt.client as mqtt
import threading

class RPiConfigManager:
    def __init__(self, config_path="/home/containment/thermal_mqtt_project/config/mqtt_config.json"):
        self.config_path = config_path
        self.config = self._load_config()
        self.running = False
        self.mqtt_client = None
        
        # Topic structure
        self.device_id = self.config['device']['device_id']
        self.base_topic = f"config/{self.device_id}"
        
        # Topics for configuration management
        self.topics = {
            # Command topics (subscribe)
            'mqtt_config_get': f"{self.base_topic}/mqtt/get",
            'mqtt_config_set': f"{self.base_topic}/mqtt/set", 
            'network_config_get': f"{self.base_topic}/network/get",
            'network_config_set': f"{self.base_topic}/network/set",
            'wifi_config_set': f"{self.base_topic}/wifi/set",
            'wifi_scan': f"{self.base_topic}/wifi/scan",
            'system_info_get': f"{self.base_topic}/system/info",
            'system_reboot': f"{self.base_topic}/system/reboot",
            'system_shutdown': f"{self.base_topic}/system/shutdown",
            'service_control': f"{self.base_topic}/service/control",
            
            # Response topics (publish)
            'mqtt_config_response': f"{self.base_topic}/mqtt/response",
            'network_config_response': f"{self.base_topic}/network/response",
            'wifi_config_response': f"{self.base_topic}/wifi/response",
            'wifi_scan_response': f"{self.base_topic}/wifi/scan/response",
            'system_info_response': f"{self.base_topic}/system/info/response",
            'service_status_response': f"{self.base_topic}/service/status/response",
            'status': f"{self.base_topic}/status",
            'error': f"{self.base_topic}/error"
        }
        
        # Setup logging
        self._setup_logging()
        self.logger = logging.getLogger('rpi_config_manager')
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        self.logger.info("RPi Config Manager initialized")
    
    def _load_config(self):
        """Load configuration from JSON file"""
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            return config
        except Exception as e:
            print(f"Error loading config: {e}")
            # Default config if file doesn't exist
            return {
                "mqtt": {
                    "broker_host": "192.168.0.138",
                    "broker_port": 1883,
                    "username": None,
                    "password": None,
                    "keepalive": 60,
                    "qos": 1
                },
                "device": {
                    "device_id": "thermal_cam_rpi1",
                    "device_name": "Thermal Camera RPi1",
                    "location": "Room A"
                }
            }
    
    def _save_config(self):
        """Save configuration to JSON file"""
        try:
            # Create backup
            backup_path = f"{self.config_path}.backup"
            if os.path.exists(self.config_path):
                os.copy(self.config_path, backup_path)
            
            # Save new config
            with open(self.config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
            
            self.logger.info("Configuration saved successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to save config: {e}")
            return False
    
    def _setup_logging(self):
        """Setup logging configuration"""
        log_dir = Path(__file__).parent.parent / 'logs'
        log_dir.mkdir(exist_ok=True)
        log_file = log_dir / 'rpi_config_manager.log'
        
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
            self.mqtt_client.on_message = self._on_mqtt_message
            
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
            
            # Subscribe to all command topics
            for topic_name, topic_path in self.topics.items():
                if not topic_name.endswith('_response'):
                    client.subscribe(topic_path)
                    self.logger.info(f"Subscribed to {topic_path}")
            
            # Publish online status
            self._publish_status("online")
            
        else:
            self.logger.error(f"MQTT connection failed with code {rc}")
    
    def _on_mqtt_disconnect(self, client, userdata, rc):
        """MQTT disconnection callback"""
        self.logger.warning(f"MQTT disconnected with code {rc}")
    
    def _on_mqtt_message(self, client, userdata, msg):
        """Handle incoming MQTT messages"""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            
            self.logger.info(f"Received message on topic: {topic}")
            self.logger.debug(f"Payload: {payload}")
            
            # Route message to appropriate handler
            if topic == self.topics['mqtt_config_get']:
                self._handle_mqtt_config_get(payload)
            elif topic == self.topics['mqtt_config_set']:
                self._handle_mqtt_config_set(payload)
            elif topic == self.topics['network_config_get']:
                self._handle_network_config_get(payload)
            elif topic == self.topics['network_config_set']:
                self._handle_network_config_set(payload)
            elif topic == self.topics['wifi_config_set']:
                self._handle_wifi_config_set(payload)
            elif topic == self.topics['wifi_scan']:
                self._handle_wifi_scan(payload)
            elif topic == self.topics['system_info_get']:
                self._handle_system_info_get(payload)
            elif topic == self.topics['system_reboot']:
                self._handle_system_reboot(payload)
            elif topic == self.topics['system_shutdown']:
                self._handle_system_shutdown(payload)
            elif topic == self.topics['service_control']:
                self._handle_service_control(payload)
            else:
                self.logger.warning(f"Unknown topic: {topic}")
                
        except Exception as e:
            self.logger.error(f"Error processing message: {e}")
            self._publish_error(f"Message processing error: {e}")
    
    def _handle_mqtt_config_get(self, payload):
        """Handle MQTT configuration get request"""
        try:
            response = {
                "request_id": payload.get("request_id", ""),
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "data": {
                    "mqtt": self.config['mqtt'],
                    "current_connection": {
                        "broker_host": self.config['mqtt']['broker_host'],
                        "broker_port": self.config['mqtt']['broker_port'],
                        "connected": self.mqtt_client.is_connected() if self.mqtt_client else False
                    }
                }
            }
            
            self._publish_response(self.topics['mqtt_config_response'], response)
            
        except Exception as e:
            self._publish_error_response(self.topics['mqtt_config_response'], 
                                       payload.get("request_id", ""), str(e))
    
    def _handle_mqtt_config_set(self, payload):
        """Handle MQTT configuration set request"""
        try:
            new_config = payload.get("config", {})
            request_id = payload.get("request_id", "")
            
            # Validate required fields
            required_fields = ['broker_host', 'broker_port']
            for field in required_fields:
                if field not in new_config:
                    raise ValueError(f"Missing required field: {field}")
            
            # Update configuration
            for key, value in new_config.items():
                if key in self.config['mqtt']:
                    self.config['mqtt'][key] = value
            
            # Save configuration
            if self._save_config():
                response = {
                    "request_id": request_id,
                    "timestamp": datetime.now().isoformat(),
                    "status": "success",
                    "message": "MQTT configuration updated successfully",
                    "restart_required": True
                }
                
                self._publish_response(self.topics['mqtt_config_response'], response)
                
                # Schedule restart if needed
                if payload.get("restart", False):
                    threading.Timer(2.0, self._restart_service).start()
            else:
                raise Exception("Failed to save configuration")
                
        except Exception as e:
            self._publish_error_response(self.topics['mqtt_config_response'], 
                                       payload.get("request_id", ""), str(e))
    
    def _handle_network_config_get(self, payload):
        """Handle network configuration get request"""
        try:
            # Get current network configuration
            network_info = self._get_network_info()
            
            response = {
                "request_id": payload.get("request_id", ""),
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "data": network_info
            }
            
            self._publish_response(self.topics['network_config_response'], response)
            
        except Exception as e:
            self._publish_error_response(self.topics['network_config_response'], 
                                       payload.get("request_id", ""), str(e))
    
    def _handle_network_config_set(self, payload):
        """Handle network configuration set request"""
        try:
            interface = payload.get("interface", "eth0")
            config_type = payload.get("type", "dhcp")  # dhcp or static
            request_id = payload.get("request_id", "")
            
            if config_type == "static":
                ip_address = payload.get("ip_address")
                netmask = payload.get("netmask", "255.255.255.0")
                gateway = payload.get("gateway")
                dns_servers = payload.get("dns_servers", ["8.8.8.8", "8.8.4.4"])
                
                if not ip_address or not gateway:
                    raise ValueError("IP address and gateway required for static configuration")
                
                success = self._set_static_network(interface, ip_address, netmask, gateway, dns_servers)
            else:
                success = self._set_dhcp_network(interface)
            
            if success:
                response = {
                    "request_id": request_id,
                    "timestamp": datetime.now().isoformat(),
                    "status": "success",
                    "message": f"Network configuration updated for {interface}",
                    "restart_required": True
                }
            else:
                raise Exception("Failed to update network configuration")
                
            self._publish_response(self.topics['network_config_response'], response)
            
        except Exception as e:
            self._publish_error_response(self.topics['network_config_response'], 
                                       payload.get("request_id", ""), str(e))
    
    def _handle_wifi_config_set(self, payload):
        """Handle WiFi configuration set request"""
        try:
            ssid = payload.get("ssid")
            password = payload.get("password", "")
            request_id = payload.get("request_id", "")
            
            if not ssid:
                raise ValueError("SSID is required")
            
            success = self._set_wifi_config(ssid, password)
            
            if success:
                response = {
                    "request_id": request_id,
                    "timestamp": datetime.now().isoformat(),
                    "status": "success",
                    "message": f"WiFi configuration updated for SSID: {ssid}",
                    "restart_required": True
                }
            else:
                raise Exception("Failed to update WiFi configuration")
                
            self._publish_response(self.topics['wifi_config_response'], response)
            
        except Exception as e:
            self._publish_error_response(self.topics['wifi_config_response'], 
                                       payload.get("request_id", ""), str(e))
    
    def _handle_wifi_scan(self, payload):
        """Handle WiFi scan request"""
        try:
            networks = self._scan_wifi_networks()
            
            response = {
                "request_id": payload.get("request_id", ""),
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "data": {
                    "networks": networks,
                    "count": len(networks)
                }
            }
            
            self._publish_response(self.topics['wifi_scan_response'], response)
            
        except Exception as e:
            self._publish_error_response(self.topics['wifi_scan_response'], 
                                       payload.get("request_id", ""), str(e))
    
    def _handle_system_info_get(self, payload):
        """Handle system info get request"""
        try:
            system_info = self._get_system_info()
            
            response = {
                "request_id": payload.get("request_id", ""),
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "data": system_info
            }
            
            self._publish_response(self.topics['system_info_response'], response)
            
        except Exception as e:
            self._publish_error_response(self.topics['system_info_response'], 
                                       payload.get("request_id", ""), str(e))
    
    def _handle_system_reboot(self, payload):
        """Handle system reboot request"""
        try:
            delay = payload.get("delay", 5)  # seconds
            request_id = payload.get("request_id", "")
            
            response = {
                "request_id": request_id,
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "message": f"System will reboot in {delay} seconds"
            }
            
            self._publish_response(self.topics['system_info_response'], response)
            
            # Schedule reboot
            threading.Timer(delay, self._system_reboot).start()
            
        except Exception as e:
            self._publish_error_response(self.topics['system_info_response'], 
                                       payload.get("request_id", ""), str(e))
    
    def _handle_system_shutdown(self, payload):
        """Handle system shutdown request"""
        try:
            delay = payload.get("delay", 5)  # seconds
            request_id = payload.get("request_id", "")
            
            response = {
                "request_id": request_id,
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "message": f"System will shutdown in {delay} seconds"
            }
            
            self._publish_response(self.topics['system_info_response'], response)
            
            # Schedule shutdown
            threading.Timer(delay, self._system_shutdown).start()
            
        except Exception as e:
            self._publish_error_response(self.topics['system_info_response'], 
                                       payload.get("request_id", ""), str(e))
    
    def _handle_service_control(self, payload):
        """Handle service control request (start/stop/restart/status)"""
        try:
            service_name = payload.get("service", "thermal-mqtt.service")
            action = payload.get("action")  # start/stop/restart/status
            request_id = payload.get("request_id", "")
            
            if not action:
                raise ValueError("Action is required")
            
            result = self._control_service(service_name, action)
            
            response = {
                "request_id": request_id,
                "timestamp": datetime.now().isoformat(),
                "status": "success" if result['success'] else "error",
                "data": result
            }
            
            self._publish_response(self.topics['service_status_response'], response)
            
        except Exception as e:
            self._publish_error_response(self.topics['service_status_response'], 
                                       payload.get("request_id", ""), str(e))
    
    # System utility methods
    def _get_network_info(self):
        """Get current network configuration"""
        try:
            # Get IP addresses
            result = subprocess.run(['hostname', '-I'], capture_output=True, text=True)
            ip_addresses = result.stdout.strip().split()
            
            # Get interface info
            interfaces = {}
            try:
                result = subprocess.run(['ip', 'addr', 'show'], capture_output=True, text=True)
                # Parse interface information (simplified)
                interfaces = {"raw_output": result.stdout}
            except:
                pass
            
            return {
                "ip_addresses": ip_addresses,
                "hostname": socket.gethostname(),
                "interfaces": interfaces
            }
            
        except Exception as e:
            self.logger.error(f"Error getting network info: {e}")
            return {"error": str(e)}
    
    def _set_static_network(self, interface, ip_address, netmask, gateway, dns_servers):
        """Set static network configuration"""
        try:
            # This would typically modify /etc/dhcpcd.conf or use netplan
            # For security reasons, this is a placeholder implementation
            self.logger.info(f"Would set static IP {ip_address} for {interface}")
            return True
        except Exception as e:
            self.logger.error(f"Error setting static network: {e}")
            return False
    
    def _set_dhcp_network(self, interface):
        """Set DHCP network configuration"""
        try:
            # This would typically modify /etc/dhcpcd.conf
            self.logger.info(f"Would set DHCP for {interface}")
            return True
        except Exception as e:
            self.logger.error(f"Error setting DHCP network: {e}")
            return False
    
    def _set_wifi_config(self, ssid, password):
        """Set WiFi configuration"""
        try:
            # This would typically modify /etc/wpa_supplicant/wpa_supplicant.conf
            self.logger.info(f"Would set WiFi config for SSID: {ssid}")
            return True
        except Exception as e:
            self.logger.error(f"Error setting WiFi config: {e}")
            return False
    
    def _scan_wifi_networks(self):
        """Scan for available WiFi networks"""
        try:
            result = subprocess.run(['iwlist', 'wlan0', 'scan'], capture_output=True, text=True)
            # Parse WiFi scan results (simplified)
            networks = []
            if result.returncode == 0:
                # This is a simplified parser - you'd want more robust parsing
                lines = result.stdout.split('\n')
                for line in lines:
                    if 'ESSID:' in line:
                        ssid = line.split('ESSID:')[1].strip().strip('"')
                        if ssid:
                            networks.append({"ssid": ssid, "signal": "unknown"})
            
            return networks[:10]  # Return first 10 networks
            
        except Exception as e:
            self.logger.error(f"Error scanning WiFi: {e}")
            return []
    
    def _get_system_info(self):
        """Get system information"""
        try:
            # CPU info
            with open('/proc/cpuinfo', 'r') as f:
                cpu_info = f.read()
            
            # Memory info
            with open('/proc/meminfo', 'r') as f:
                mem_info = f.read()
            
            # Disk usage
            result = subprocess.run(['df', '-h'], capture_output=True, text=True)
            disk_info = result.stdout
            
            # System uptime
            result = subprocess.run(['uptime'], capture_output=True, text=True)
            uptime = result.stdout.strip()
            
            return {
                "hostname": socket.gethostname(),
                "uptime": uptime,
                "cpu_info": cpu_info[:500],  # Truncate for MQTT
                "memory_info": mem_info[:500],
                "disk_usage": disk_info,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error getting system info: {e}")
            return {"error": str(e)}
    
    def _control_service(self, service_name, action):
        """Control systemd service"""
        try:
            if action == "status":
                result = subprocess.run(['systemctl', 'is-active', service_name], 
                                      capture_output=True, text=True)
                return {
                    "success": True,
                    "action": action,
                    "service": service_name,
                    "status": result.stdout.strip(),
                    "active": result.returncode == 0
                }
            else:
                result = subprocess.run(['sudo', 'systemctl', action, service_name], 
                                      capture_output=True, text=True)
                return {
                    "success": result.returncode == 0,
                    "action": action,
                    "service": service_name,
                    "output": result.stdout.strip(),
                    "error": result.stderr.strip() if result.returncode != 0 else None
                }
                
        except Exception as e:
            return {
                "success": False,
                "action": action,
                "service": service_name,
                "error": str(e)
            }
    
    def _system_reboot(self):
        """Reboot the system"""
        try:
            self.logger.info("Rebooting system...")
            subprocess.run(['sudo', 'reboot'], check=True)
        except Exception as e:
            self.logger.error(f"Error rebooting system: {e}")
    
    def _system_shutdown(self):
        """Shutdown the system"""
        try:
            self.logger.info("Shutting down system...")
            subprocess.run(['sudo', 'shutdown', 'now'], check=True)
        except Exception as e:
            self.logger.error(f"Error shutting down system: {e}")
    
    def _restart_service(self):
        """Restart this service"""
        try:
            self.logger.info("Restarting service...")
            subprocess.run(['sudo', 'systemctl', 'restart', 'rpi-config-manager.service'], 
                         check=True)
        except Exception as e:
            self.logger.error(f"Error restarting service: {e}")
    
    # MQTT utility methods
    def _publish_response(self, topic, data):
        """Publish response to MQTT"""
        try:
            if self.mqtt_client:
                self.mqtt_client.publish(topic, json.dumps(data), qos=self.config['mqtt']['qos'])
        except Exception as e:
            self.logger.error(f"Error publishing response: {e}")
    
    def _publish_error_response(self, topic, request_id, error_message):
        """Publish error response to MQTT"""
        response = {
            "request_id": request_id,
            "timestamp": datetime.now().isoformat(),
            "status": "error",
            "error": error_message
        }
        self._publish_response(topic, response)
    
    def _publish_status(self, status):
        """Publish device status"""
        try:
            status_data = {
                "device_id": self.device_id,
                "status": status,
                "timestamp": datetime.now().isoformat(),
                "manager": "rpi_config_manager"
            }
            
            self._publish_response(self.topics['status'], status_data)
            
        except Exception as e:
            self.logger.error(f"Error publishing status: {e}")
    
    def _publish_error(self, error_message):
        """Publish error message"""
        try:
            error_data = {
                "device_id": self.device_id,
                "timestamp": datetime.now().isoformat(),
                "error": error_message,
                "manager": "rpi_config_manager"
            }
            
            self._publish_response(self.topics['error'], error_data)
            
        except Exception as e:
            self.logger.error(f"Error publishing error: {e}")
    
    def start(self):
        """Start the config manager"""
        self.logger.info("Starting RPi Config Manager...")
        
        # Setup MQTT
        if not self._setup_mqtt():
            self.logger.error("Failed to setup MQTT, exiting")
            return False
        
        # Wait for MQTT connection
        time.sleep(2)
        
        self.running = True
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.logger.info("Keyboard interrupt received")
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
        
        return True
    
    def stop(self):
        """Stop the config manager"""
        self.logger.info("Stopping RPi Config Manager...")
        self.running = False
        
        # Publish offline status
        if self.mqtt_client:
            self._publish_status("offline")
            time.sleep(1)
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
        
        self.logger.info("RPi Config Manager stopped")

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Raspberry Pi Config Manager via MQTT')
    parser.add_argument(
        '--config', 
        default='/home/containment/thermal_mqtt_project/config/mqtt_config.json',
        help='Path to configuration file'
    )
    
    args = parser.parse_args()
    
    # Start config manager
    manager = RPiConfigManager(args.config)
    manager.start()

if __name__ == "__main__":
    main()