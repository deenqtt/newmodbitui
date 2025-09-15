# File: enhanced_ec25_mqtt_service.py
# Enhanced version with SIM PIN handling, comprehensive monitoring, and web integration

import paho.mqtt.client as mqtt
import json
import time
import threading
import logging
import os
import sys
from datetime import datetime
from ec25_modem import EC25Modem, ModemInfo, NetworkInfo, GPSData
import hashlib
import subprocess
class EnhancedEC25MQTTService:
    def __init__(self, mqtt_broker="192.168.0.139", mqtt_port=1883):
        # MQTT Configuration
        self.mqtt_broker = mqtt_broker
        self.mqtt_port = mqtt_port
        self.client_id = f"ec25_enhanced_{int(time.time())}"
        
        # MQTT Topics
        self.topic_status = "ec25/status"
        self.topic_gsm = "ec25/gsm"
        self.topic_gps = "ec25/gps"
        self.topic_commands = "ec25/commands"
        self.topic_response = "ec25/response"
        self.topic_alerts = "ec25/alerts"
        self.topic_heartbeat = "ec25/heartbeat"
        
        # Service state
        self.running = False
        self.modem = None
        self.mqtt_client = None
        self.status_thread = None
        self.heartbeat_thread = None
        
        # Configuration
        self.config_file = "ec25_enhanced_config.json"
        self.config = self.load_config()
        
        # State tracking for updates instead of logs
        self.last_gsm_data = None
        self.last_gps_data = None
        self.data_hash_cache = {}
        
        # Service startup time
        self._start_time = time.time()
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('ec25_enhanced.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def load_config(self):
        """Load enhanced configuration"""
        default_config = {
            "at_port": "/dev/modem_at",
            "gps_port": "/dev/modem_gps", 
            "apn": "",
            "username": "",
            "password": "",
            "sim_pin": "",
            "refresh_interval": 15,
            "heartbeat_interval": 60,
            "gps_enabled": True,
            "auto_reconnect": True,
            "signal_threshold": -100,  # dBm threshold for weak signal alert
            "data_update_only": True   # Only send updates when data changes
        }
        
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                    return {**default_config, **config}
            return default_config
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")
            return default_config

    def save_config(self):
        """Save current configuration"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
            self.logger.info("Configuration saved")
        except Exception as e:
            self.logger.error(f"Error saving config: {e}")

    def setup_mqtt(self):
        """Setup MQTT client with enhanced error handling"""
        try:
            self.mqtt_client = mqtt.Client(client_id=self.client_id)
            
            # MQTT callbacks
            self.mqtt_client.on_connect = self.on_mqtt_connect
            self.mqtt_client.on_disconnect = self.on_mqtt_disconnect
            self.mqtt_client.on_message = self.on_mqtt_message
            
            # Will message for graceful shutdown detection
            will_payload = {
                "timestamp": datetime.now().isoformat(),
                "status": "service_disconnected",
                "client_id": self.client_id
            }
            self.mqtt_client.will_set(
                self.topic_status, 
                json.dumps(will_payload), 
                qos=1, 
                retain=True
            )
            
            # Connect to broker
            self.mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
            self.mqtt_client.loop_start()
            
            self.logger.info(f"MQTT client setup complete for broker {self.mqtt_broker}:{self.mqtt_port}")
            return True
            
        except Exception as e:
            self.logger.error(f"MQTT setup failed: {e}")
            return False

    def check_sim_pin_required(self):
        """Check if SIM PIN is required and handle it"""
        try:
            if not self.modem:
                return False
                
            response = self.modem.send_at_command("AT+CPIN?")
            
            if "+CPIN: READY" in response:
                self.logger.info("SIM is ready, no PIN required")
                return True
            elif "+CPIN: SIM PIN" in response:
                self.logger.warning("SIM PIN required")
                
                # Send alert to web interface
                alert_payload = {
                    "timestamp": datetime.now().isoformat(),
                    "type": "sim_pin_required",
                    "message": "SIM card is locked. PIN required.",
                    "severity": "warning",
                    "requires_action": True
                }
                self.publish_alert(alert_payload)
                
                # Try to use PIN from config if available
                sim_pin = self.config.get("sim_pin", "")
                if sim_pin:
                    self.logger.info("Attempting to unlock SIM with configured PIN")
                    pin_response = self.modem.send_at_command(f"AT+CPIN={sim_pin}")
                    
                    if "OK" in pin_response:
                        self.logger.info("SIM unlocked successfully")
                        time.sleep(2)  # Wait for SIM to initialize
                        return True
                    else:
                        self.logger.error("Failed to unlock SIM with configured PIN")
                        alert_payload["message"] = "SIM PIN incorrect. Please update PIN in settings."
                        alert_payload["severity"] = "error"
                        self.publish_alert(alert_payload)
                
                return False
            elif "+CPIN: SIM PUK" in response:
                self.logger.error("SIM PUK required - SIM is blocked!")
                alert_payload = {
                    "timestamp": datetime.now().isoformat(),
                    "type": "sim_puk_required",
                    "message": "SIM card is blocked. PUK code required. Contact your provider.",
                    "severity": "critical",
                    "requires_action": True
                }
                self.publish_alert(alert_payload)
                return False
            else:
                self.logger.error(f"Unknown SIM state: {response}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error checking SIM PIN: {e}")
            return False

    def comprehensive_startup_check(self):
        """Perform comprehensive system check on startup"""
        try:
            self.logger.info("Starting comprehensive system check...")
            
            startup_status = {
                "timestamp": datetime.now().isoformat(),
                "modem_connected": False,
                "sim_ready": False,
                "network_registered": False,
                "apn_configured": False,
                "internet_available": False,
                "gps_available": False,
                "issues": []
            }
            
            # 1. Check modem connection
            if self.modem and self.modem.ser and self.modem.ser.is_open:
                startup_status["modem_connected"] = True
                self.logger.info("✓ Modem connected")
            else:
                startup_status["issues"].append("Modem not connected")
                self.logger.error("✗ Modem not connected")
                
            # 2. Check SIM status
            if self.check_sim_pin_required():
                startup_status["sim_ready"] = True
                self.logger.info("✓ SIM ready")
            else:
                startup_status["issues"].append("SIM not ready or PIN required")
                self.logger.error("✗ SIM not ready")
                
            # 3. Check network registration
            if startup_status["sim_ready"]:
                network_info = self.modem.get_network_info()
                if network_info and network_info.registration_status in ["Registered", "Registered (roaming)"]:
                    startup_status["network_registered"] = True
                    self.logger.info("✓ Network registered")
                else:
                    startup_status["issues"].append("Network not registered")
                    self.logger.error("✗ Network not registered")
                    
            # 4. Check APN configuration
            apn_config = self.modem.get_apn_config()
            current_apn = self.config.get("apn", "")
            if current_apn and apn_config.get("apn") == current_apn:
                startup_status["apn_configured"] = True
                self.logger.info("✓ APN configured")
            elif current_apn:
                self.logger.info(f"Setting APN to {current_apn}")
                if self.modem.set_apn(current_apn, self.config.get("username", ""), self.config.get("password", "")):
                    startup_status["apn_configured"] = True
                    self.logger.info("✓ APN configured")
                else:
                    startup_status["issues"].append("Failed to configure APN")
                    self.logger.error("✗ Failed to configure APN")
            else:
                startup_status["issues"].append("No APN configured")
                self.logger.warning("! No APN configured")
                
            # 5. Test internet connection
            if startup_status["apn_configured"]:
                if self.modem.check_internet_connection():
                    startup_status["internet_available"] = True
                    self.logger.info("✓ Internet available")
                else:
                    startup_status["issues"].append("Internet connection failed")
                    self.logger.error("✗ Internet connection failed")
                    
            # 6. Check GPS availability
            if self.config.get("gps_enabled", True):
                if os.path.exists(self.config.get("gps_port", "/dev/modem_gps")):
                    startup_status["gps_available"] = True
                    self.logger.info("✓ GPS port available")
                else:
                    startup_status["issues"].append("GPS port not available")
                    self.logger.error("✗ GPS port not available")
                    
            # Send startup status to web interface
            self.publish_status("startup_check_complete", startup_status)
            
            # Send alert if there are critical issues
            if startup_status["issues"]:
                alert_payload = {
                    "timestamp": datetime.now().isoformat(),
                    "type": "startup_issues",
                    "message": f"System startup completed with {len(startup_status['issues'])} issues",
                    "severity": "warning" if startup_status["modem_connected"] else "error",
                    "details": startup_status["issues"]
                }
                self.publish_alert(alert_payload)
                
            return len(startup_status["issues"]) == 0
            
        except Exception as e:
            self.logger.error(f"Error during startup check: {e}")
            return False




    def handle_command(self, command):
        """Enhanced command handling"""
        try:
            cmd_type = command.get("type")
            cmd_data = command.get("data", {})
            
            response = {
                "timestamp": datetime.now().isoformat(),
                "command": cmd_type,
                "status": "error",
                "message": "Unknown command"
            }
            
            if not self.modem:
                response["message"] = "Modem not connected"
                self.publish_response(response)
                return

            # Enhanced command handling
            if cmd_type == "set_sim_pin":
                pin = cmd_data.get("pin", "")
                if len(pin) == 4 and pin.isdigit():
                    pin_response = self.modem.send_at_command(f"AT+CPIN={pin}")
                    if "OK" in pin_response:
                        self.config["sim_pin"] = pin
                        self.save_config()
                        response["status"] = "success"
                        response["message"] = "SIM PIN set and SIM unlocked"
                        
                        # Trigger system recheck
                        threading.Thread(target=self.comprehensive_startup_check).start()
                    else:
                        response["message"] = "Invalid PIN or SIM error"
                else:
                    response["message"] = "PIN must be 4 digits"
                    
            elif cmd_type == "set_apn":
                apn = cmd_data.get("apn", "")
                username = cmd_data.get("username", "")
                password = cmd_data.get("password", "")
                
                if self.modem.set_apn(apn, username, password):
                    self.config["apn"] = apn
                    self.config["username"] = username
                    self.config["password"] = password
                    self.save_config()
                    
                    response["status"] = "success"
                    response["message"] = f"APN set to {apn}. Modem will restart."
                    
                    # Auto restart modem after APN change
                    def restart_after_apn():
                        time.sleep(2)
                        self.restart_modem_connection()
                        
                    threading.Thread(target=restart_after_apn).start()
                else:
                    response["message"] = "Failed to set APN"
                    
            elif cmd_type == "test_internet":
                result = self.modem.check_internet_connection()
                response["status"] = "success"
                response["data"] = {"connected": result}
                response["message"] = "Internet connection: " + ("OK" if result else "Failed")
                
            elif cmd_type == "restart_modem":
                success = self.restart_modem_connection()
                if success:
                    response["status"] = "success"
                    response["message"] = "Modem restarted successfully"
                else:
                    response["message"] = "Failed to restart modem"
                    
            elif cmd_type == "factory_reset":
                # Factory reset modem settings
                if self.modem.send_at_command("AT&F") and "OK" in self.modem.send_at_command("AT&W"):
                    response["status"] = "success"
                    response["message"] = "Modem factory reset completed"
                else:
                    response["message"] = "Factory reset failed"
                    
            elif cmd_type == "get_detailed_status":
                # Get comprehensive status
                modem_info = self.modem.get_modem_info()
                network_info = self.modem.get_network_info()
                signal_info = self.modem.get_detailed_signal_info()
                apn_config = self.modem.get_apn_config()
                
                response["status"] = "success"
                response["data"] = {
                    "modem": modem_info._asdict() if modem_info else None,
                    "network": network_info._asdict() if network_info else None,
                    "signal": signal_info,
                    "apn": apn_config,
                    "uptime": time.time() - self._start_time,
                    "config": {
                        "gps_enabled": self.config.get("gps_enabled", False),
                        "apn": self.config.get("apn", ""),
                        "refresh_interval": self.config.get("refresh_interval", 15)
                    }
                }
                
            elif cmd_type == "scan_networks":
                networks = self.modem.get_network_scan_results()
                response["status"] = "success"
                response["data"] = {"networks": networks}
                response["message"] = f"Found {len(networks)} networks"
                
            # Add other commands...
            
            elif cmd_type == "set_network_metric":
                connection_name = cmd_data.get("connection")
                metric = cmd_data.get("metric")
                
                print(f"[DEBUG] Received: connection={connection_name}, metric={metric}")  # Debug print
                
                if not connection_name or metric is None:
                    response["message"] = "Missing connection name or metric value"
                elif isinstance(metric, int) and 0 <= metric <= 1000:
                    try:
                        import subprocess
                        
                        # Cek dulu koneksi ada nggak
                        print(f"[DEBUG] Checking connection: {connection_name}")
                        check_result = subprocess.run(['nmcli', 'con', 'show', connection_name], 
                                                    capture_output=True, text=True, timeout=5)
                        
                        if check_result.returncode != 0:
                            response["message"] = f"Connection '{connection_name}' not found"
                            print(f"[ERROR] Connection not found: {check_result.stderr}")
                        else:
                            print(f"[DEBUG] Connection found, setting metric...")
                            
                            # Ubah route-metric
                            cmd_result = subprocess.run([
                                'nmcli', 'con', 'modify', connection_name,
                                'ipv4.route-metric', str(metric)
                            ], capture_output=True, text=True, timeout=10)
                            
                            print(f"[DEBUG] Modify result: {cmd_result.returncode}")
                            print(f"[DEBUG] Modify stderr: {cmd_result.stderr}")
                            
                            if cmd_result.returncode == 0:
                                # Restart koneksi
                                print(f"[DEBUG] Restarting connection...")
                                subprocess.run(['nmcli', 'con', 'down', connection_name], 
                                            capture_output=True, timeout=5)
                                subprocess.run(['nmcli', 'con', 'up', connection_name], 
                                            capture_output=True, timeout=10)
                                
                                response["status"] = "success"
                                response["message"] = f"Route metric for '{connection_name}' set to {metric}"
                                print(f"[SUCCESS] Metric set to {metric}")
                            else:
                                response["message"] = f"Failed to set metric: {cmd_result.stderr}"
                                print(f"[ERROR] Failed to set metric: {cmd_result.stderr}")
                    except Exception as e:
                        response["message"] = f"Error setting metric: {str(e)}"
                        print(f"[ERROR] Exception: {str(e)}")
                else:
                    response["message"] = "Invalid metric value (must be integer 0-1000)"
            
            elif cmd_type == "list_network_connections":
                try:
                    import subprocess
                    
                    # Dapatkan daftar koneksi dengan detail
                    result = subprocess.run([
                        'nmcli', '-t', '-f', 'name,device,type,uuid', 'con', 'show'
                    ], capture_output=True, text=True, timeout=10)
                    
                    if result.returncode == 0:
                        connections = []
                        lines = result.stdout.strip().split('\n')
                        
                        for line in lines:
                            if line:
                                parts = line.split(':')
                                if len(parts) >= 4:
                                    name = parts[0]
                                    device = parts[1] if parts[1] != '--' else None
                                    type_conn = parts[2]
                                    uuid = parts[3]
                                    
                                    # Dapatkan detail metric untuk koneksi ini
                                    metric = "auto"  # Default
                                    try:
                                        detail_result = subprocess.run([
                                            'nmcli', '-t', '-f', 'ipv4.route-metric', 'con', 'show', name
                                        ], capture_output=True, text=True, timeout=5)
                                        
                                        if detail_result.returncode == 0:
                                            # Parse output
                                            for detail_line in detail_result.stdout.strip().split('\n'):
                                                if ':' in detail_line:
                                                    key, value = detail_line.split(':', 1)
                                                    if key.strip() == 'ipv4.route-metric':
                                                        if value.strip() == '' or value.strip().lower() == 'auto':
                                                            metric = "auto"
                                                        elif value.strip().isdigit():
                                                            metric = int(value.strip())
                                                        else:
                                                            metric = value.strip()
                                                        break
                                    except Exception as e:
                                        self.logger.error(f"Error getting metric for {name}: {e}")
                                        metric = "error"
                                    
                                    connections.append({
                                        "name": name,
                                        "device": device,
                                        "type": type_conn,
                                        "uuid": uuid,
                                        "metric": metric
                                    })
                        
                        response["status"] = "success"
                        response["data"] = {"connections": connections}
                        response["message"] = f"Found {len(connections)} connections"
                    else:
                        response["message"] = f"Failed to list connections: {result.stderr}"
                except Exception as e:
                    response["message"] = f"Error listing connections: {str(e)}"
                    self.logger.error(f"Error in list_network_connections: {str(e)}")

            self.publish_response(response)
            
        except Exception as e:
            self.logger.error(f"Error handling command: {e}")
            response = {
                "timestamp": datetime.now().isoformat(),
                "command": command.get("type", "unknown"),
                "status": "error",
                "message": str(e)
            }
            self.publish_response(response)

    def restart_modem_connection(self):
        """Restart modem connection with comprehensive checks"""
        try:
            self.logger.info("Restarting modem connection...")
            
            # Stop GPS if running
            if self.modem.gps_running:
                self.modem.stop_gps()
                
            # Disconnect
            self.modem.disconnect()
            time.sleep(3)
            
            # Reconnect
            if self.modem.connect():
                # Perform startup checks
                if self.comprehensive_startup_check():
                    # Restart GPS if enabled
                    if self.config.get("gps_enabled", True):
                        self.modem.start_gps(callback=self.gps_callback)
                    
                    self.logger.info("Modem restart completed successfully")
                    return True
                else:
                    self.logger.warning("Modem restart completed with issues")
                    return False
            else:
                self.logger.error("Failed to reconnect modem")
                return False
                
        except Exception as e:
            self.logger.error(f"Error restarting modem: {e}")
            return False

    def data_has_changed(self, data_type, new_data):
        """Check if data has changed to avoid unnecessary MQTT messages"""
        if not self.config.get("data_update_only", True):
            return True
            
        # Create hash of the data
        data_hash = hashlib.md5(json.dumps(new_data, sort_keys=True).encode()).hexdigest()
        
        # Check against cached hash
        if data_type in self.data_hash_cache:
            if self.data_hash_cache[data_type] == data_hash:
                return False
                
        # Update cache and return True (data changed)
        self.data_hash_cache[data_type] = data_hash
        return True

    
    def publish_gsm_data(self, modem_info, network_info):
        """Publish GSM data with improved connection logic"""
        try:
            # More flexible connection detection
            is_connected = False
            
            if network_info:
                # Check registration status
                reg_status = network_info.registration_status
                if reg_status in ["Registered", "Registered (roaming)"]:
                    is_connected = True
            
            # Get detailed signal info
            signal_info = self.modem.get_detailed_signal_info()
            
            payload = {
                "timestamp": datetime.now().isoformat(),
                "connected": is_connected,
                "status": "running",
                "modem": {
                    "manufacturer": modem_info.manufacturer if modem_info else "Unknown",
                    "model": modem_info.model if modem_info else "Unknown", 
                    "revision": modem_info.revision if modem_info else "Unknown",
                    "imei": modem_info.imei if modem_info else "Unknown"
                },
                "network": {
                    "operator": network_info.operator if network_info else "Unknown",
                    "registration_status": network_info.registration_status if network_info else "Unknown",
                    "network_type": network_info.network_type if network_info else "Unknown",
                    "signal_strength": network_info.signal_strength if network_info else -113,
                    "signal_quality": network_info.signal_quality if network_info else 0
                },
                "signal_detailed": signal_info or {},
                "apn": {
                    "name": self.config.get("apn", ""),
                    "username": self.config.get("username", ""),
                }
            }
            
            # Only publish if data has changed
            if self.data_has_changed("gsm", payload):
                if self.mqtt_client:
                    self.mqtt_client.publish(self.topic_gsm, json.dumps(payload), retain=True)
                    
                # Check for weak signal alert
                if (network_info and 
                    network_info.signal_strength is not None and 
                    network_info.signal_strength < self.config.get("signal_threshold", -100)):
                    
                    alert_payload = {
                        "timestamp": datetime.now().isoformat(),
                        "type": "weak_signal",
                        "message": f"Weak signal detected: {network_info.signal_strength} dBm",
                        "severity": "warning",
                        "data": {"signal_strength": network_info.signal_strength}
                    }
                    self.publish_alert(alert_payload)
                
        except Exception as e:
            self.logger.error(f"Error publishing GSM data: {e}")

    def publish_gps_data(self, gps_data):
        """Publish GPS data only when changed"""
        try:
            modem_info = self.modem.get_modem_info() if self.modem else None
            imei = modem_info.imei if modem_info else None
            
            payload = {
                "timestamp": datetime.now().isoformat(),
                "imei": imei,
                "fix_status": gps_data.fix_status,
                "latitude": gps_data.latitude,
                "longitude": gps_data.longitude,
                "altitude": gps_data.altitude,
                "speed": gps_data.speed,
                "satellites": gps_data.satellites,
                "gps_timestamp": gps_data.timestamp
            }
            
            # Only publish if data has changed significantly
            if self.data_has_changed("gps", payload):
                if self.mqtt_client:
                    self.mqtt_client.publish(self.topic_gps, json.dumps(payload), retain=True)
                
        except Exception as e:
            self.logger.error(f"Error publishing GPS data: {e}")

    def publish_status(self, status, data=None):
        """Publish enhanced service status"""
        try:
            payload = {
                "timestamp": datetime.now().isoformat(),
                "status": status,
                "service_id": self.client_id,
                "uptime": time.time() - self._start_time
            }
            
            if data:
                payload["data"] = data
                
            if self.mqtt_client:
                self.mqtt_client.publish(self.topic_status, json.dumps(payload), retain=True)
                
        except Exception as e:
            self.logger.error(f"Error publishing status: {e}")

    def publish_alert(self, alert_data):
        """Publish alerts to web interface"""
        try:
            if self.mqtt_client:
                self.mqtt_client.publish(self.topic_alerts, json.dumps(alert_data), qos=1)
        except Exception as e:
            self.logger.error(f"Error publishing alert: {e}")

    def publish_response(self, response):
        """Publish command response"""
        try:
            if self.mqtt_client:
                self.mqtt_client.publish(self.topic_response, json.dumps(response))
        except Exception as e:
            self.logger.error(f"Error publishing response: {e}")

    def heartbeat_worker(self):
        """Send periodic heartbeat"""
        while self.running:
            try:
                heartbeat_data = {
                    "timestamp": datetime.now().isoformat(),
                    "service_id": self.client_id,
                    "uptime": time.time() - self._start_time,
                    "memory_usage": self.get_memory_usage(),
                    "status": "healthy"
                }
                
                if self.mqtt_client:
                    self.mqtt_client.publish(self.topic_heartbeat, json.dumps(heartbeat_data))
                
                time.sleep(self.config.get("heartbeat_interval", 60))
                
            except Exception as e:
                self.logger.error(f"Error in heartbeat worker: {e}")
                time.sleep(10)

    def get_memory_usage(self):
        """Get current memory usage"""
        try:
            import psutil
            process = psutil.Process()
            return {
                "rss": process.memory_info().rss,
                "vms": process.memory_info().vms,
                "percent": process.memory_percent()
            }
        except:
            return {"error": "psutil not available"}

    def status_worker(self):
        """Enhanced status worker with change detection"""
        while self.running:
            try:
                if self.modem:
                    modem_info = self.modem.get_modem_info()
                    network_info = self.modem.get_network_info()
                    
                    # Publish data (only if changed)
                    self.publish_gsm_data(modem_info, network_info)
                    
                else:
                    self.publish_status("modem_disconnected")
                    
                    # Try to reconnect if auto_reconnect is enabled
                    if self.config.get("auto_reconnect", True):
                        self.logger.info("Attempting to reconnect modem...")
                        if self.connect_modem():
                            self.logger.info("Modem reconnected successfully")
                
                time.sleep(self.config.get("refresh_interval", 15))
                
            except Exception as e:
                self.logger.error(f"Error in status worker: {e}")
                time.sleep(5)

    def connect_modem(self):
        """Enhanced modem connection"""
        try:
            at_port = self.config.get("at_port", "/dev/modem_at")
            gps_port = self.config.get("gps_port", "/dev/modem_gps")
            
            self.logger.info(f"Connecting to modem: AT={at_port}, GPS={gps_port}")
            
            self.modem = EC25Modem(at_port=at_port, gps_port=gps_port)
            
            if self.modem.connect():
                self.logger.info("Modem connected successfully")
                
                # Perform comprehensive startup check
                if self.comprehensive_startup_check():
                    self.logger.info("System startup check passed")
                else:
                    self.logger.warning("System startup check completed with issues")
                
                # Start GPS if enabled
                if self.config.get("gps_enabled", True):
                    if self.modem.start_gps(callback=self.gps_callback):
                        self.logger.info("GPS started")
                    else:
                        self.logger.warning("Failed to start GPS")
                
                return True
            else:
                self.logger.error("Failed to connect to modem")
                return False
                
        except Exception as e:
            self.logger.error(f"Error connecting to modem: {e}")
            return False

    def gps_callback(self, gps_data):
        """GPS data callback"""
        self.publish_gps_data(gps_data)

    def on_mqtt_connect(self, client, userdata, flags, rc):
        """MQTT connect callback"""
        if rc == 0:
            self.logger.info("MQTT connected successfully")
            client.subscribe(self.topic_commands)
            self.publish_status("service_started")
        else:
            self.logger.error(f"MQTT connection failed with code {rc}")

    def on_mqtt_disconnect(self, client, userdata, rc):
        """MQTT disconnect callback"""
        self.logger.warning("MQTT disconnected")

    def on_mqtt_message(self, client, userdata, msg):
        """Handle incoming MQTT commands"""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            
            self.logger.info(f"Received command: {topic} -> {payload}")
            
            if topic == self.topic_commands:
                self.handle_command(payload)
                
        except Exception as e:
            self.logger.error(f"Error processing MQTT message: {e}")

    def start(self):
        """Start enhanced service"""
        try:
            self.logger.info("Starting Enhanced EC25 MQTT Service...")
            
            if not self.setup_mqtt():
                return False
                
            if not self.connect_modem():
                return False
            
            self.running = True
            
            # Start status worker
            self.status_thread = threading.Thread(target=self.status_worker)
            self.status_thread.daemon = True
            self.status_thread.start()
            
            # Start heartbeat worker
            self.heartbeat_thread = threading.Thread(target=self.heartbeat_worker)
            self.heartbeat_thread.daemon = True
            self.heartbeat_thread.start()
            
            self.logger.info("Enhanced EC25 MQTT Service started successfully")
            self.publish_status("service_ready")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error starting enhanced service: {e}")
            return False

    def stop(self):
        """Stop enhanced service"""
        try:
            self.logger.info("Stopping Enhanced EC25 MQTT Service...")
            
            self.running = False
            self.publish_status("service_stopping")
            
            if self.modem:
                self.modem.stop_gps()
                self.modem.disconnect()
            
            if self.mqtt_client:
                self.mqtt_client.loop_stop()
                self.mqtt_client.disconnect()
            
            self.logger.info("Enhanced EC25 MQTT Service stopped")
            
        except Exception as e:
            self.logger.error(f"Error stopping enhanced service: {e}")

    def run_forever(self):
        """Run enhanced service"""
        if not self.start():
            return False
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.logger.info("Service interrupted by user")
        finally:
            self.stop()

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Enhanced EC25 Modem MQTT Service')
    parser.add_argument('--broker', default='192.168.0.139', help='MQTT broker IP')
    parser.add_argument('--port', type=int, default=1883, help='MQTT broker port')
    parser.add_argument('--config', default='ec25_enhanced_config.json', help='Config file')
    
    args = parser.parse_args()
    
    service = EnhancedEC25MQTTService(mqtt_broker=args.broker, mqtt_port=args.port)
    service.config_file = args.config
    service.config = service.load_config()
    
    print(f"Starting Enhanced EC25 MQTT Service...")
    print(f"MQTT Broker: {args.broker}:{args.port}")
    print(f"Config: {args.config}")
    
    service.run_forever()

if __name__ == "__main__":
    main()
