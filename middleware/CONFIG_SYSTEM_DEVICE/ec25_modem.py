import serial
import time
import os
import threading
from collections import namedtuple
import logging  # Baris ini perlu ditambahkan

# Data structures
ModemInfo = namedtuple('ModemInfo', ['manufacturer', 'model', 'revision', 'imei'])
NetworkInfo = namedtuple('NetworkInfo', ['operator', 'registration_status', 'network_type', 'signal_strength', 'signal_quality'])
GPSData = namedtuple('GPSData', ['fix_status', 'latitude', 'longitude', 'altitude', 'speed', 'satellites', 'timestamp'])

class EC25Modem:
    def __init__(self, at_port="/dev/modem_at", gps_port="/dev/modem_gps"):
        self.at_port = at_port
        self.gps_port = gps_port
        self.ser = None
        self.gps_ser = None
        self.gps_running = False
        self.gps_callback = None
        self.gps_thread = None
        self.logger = logging.getLogger(__name__) # Baris ini ditambahkan
        
    def connect(self):
        """Connect to modem AT port with better error handling"""
        try:
            # Cek apakah port exists
            if not os.path.exists(self.at_port):
                raise Exception(f"AT port {self.at_port} tidak ditemukan")
            
            # Resolve symlink jika ada
            real_port = self.at_port
            if os.path.islink(self.at_port):
                target = os.readlink(self.at_port)
                if not target.startswith('/'):
                    real_port = os.path.join(os.path.dirname(self.at_port), target)
                else:
                    real_port = target
            
            # Test akses port
            try:
                test_fd = os.open(real_port, os.O_RDWR | os.O_NONBLOCK)
                os.close(test_fd)
            except PermissionError:
                raise Exception(f"Tidak bisa akses port {real_port}. Cek permission atau tambahkan user ke group dialout.")
            except Exception as e:
                raise Exception(f"Error akses port {real_port}: {e}")
            
            # Buka serial port
            self.ser = serial.Serial(
                port=self.at_port,
                baudrate=115200,
                timeout=3,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                rtscts=False,
                dsrdtr=False
            )
            
            # Reset buffer
            self.ser.reset_input_buffer()
            self.ser.reset_output_buffer()
            
            # Test koneksi dengan AT command
            response = self.send_at_command("AT", timeout=2)
            if "OK" not in response:
                raise Exception(f"Modem tidak merespon AT command. Response: {response}")
            
            print(f"[MODEM] Connected to {self.at_port}")
            return True
            
        except serial.SerialException as e:
            raise Exception(f"Serial port error: {str(e)}")
        except Exception as e:
            if self.ser and self.ser.is_open:
                self.ser.close()
            raise e
    
    def disconnect(self):
        """Disconnect from modem"""
        try:
            if self.gps_running:
                self.stop_gps()
            
            if self.ser and self.ser.is_open:
                self.ser.close()
                self.ser = None
                
            print("[MODEM] Disconnected")
        except Exception as e:
            print(f"[MODEM] Error during disconnect: {e}")
    
    def send_at_command(self, command, timeout=3):
        """Send AT command and return response"""
        if not self.ser or not self.ser.is_open:
            raise Exception("Modem tidak terhubung")
        
        try:
            # Clear buffer
            self.ser.reset_input_buffer()
            
            # Send command
            cmd = f"{command}\r"
            self.ser.write(cmd.encode())
            self.ser.flush()
            
            # Read response with timeout
            response = ""
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                if self.ser.in_waiting > 0:
                    data = self.ser.read(self.ser.in_waiting)
                    response += data.decode('utf-8', errors='ignore')
                    
                    # Check for end markers
                    if 'OK' in response or 'ERROR' in response:
                        break
                
                time.sleep(0.01)
            
            return response.strip()
            
        except Exception as e:
            raise Exception(f"Error sending AT command '{command}': {str(e)}")
    
    def get_modem_info(self):
        """Get modem information with better error handling"""
        try:
            info = {}
            
            # Get manufacturer - lebih robust parsing
            try:
                response = self.send_at_command("AT+CGMI")
                if "OK" in response:
                    lines = [line.strip() for line in response.split('\n') 
                            if line.strip() and not line.startswith('AT') and 'OK' not in line and 'ERROR' not in line]
                    info['manufacturer'] = lines[0] if lines else "Unknown"
                else:
                    info['manufacturer'] = "Unknown"
            except:
                info['manufacturer'] = "Unknown"
            
            # Get model
            try:
                response = self.send_at_command("AT+CGMM")
                if "OK" in response:
                    lines = [line.strip() for line in response.split('\n') 
                            if line.strip() and not line.startswith('AT') and 'OK' not in line and 'ERROR' not in line]
                    info['model'] = lines[0] if lines else "Unknown"
                else:
                    info['model'] = "Unknown"
            except:
                info['model'] = "Unknown"
            
            # Get revision
            try:
                response = self.send_at_command("AT+CGMR")
                if "OK" in response:
                    lines = [line.strip() for line in response.split('\n') 
                            if line.strip() and not line.startswith('AT') and 'OK' not in line and 'ERROR' not in line]
                    info['revision'] = lines[0] if lines else "Unknown"
                else:
                    info['revision'] = "Unknown"
            except:
                info['revision'] = "Unknown"
            
            # Get IMEI - dengan validasi format
            try:
                response = self.send_at_command("AT+CGSN")
                if "OK" in response:
                    lines = [line.strip() for line in response.split('\n') 
                            if line.strip() and not line.startswith('AT') and 'OK' not in line and 'ERROR' not in line]
                    imei_candidate = lines[0] if lines else "Unknown"
                    # Validasi IMEI (harus 15 digit)
                    if len(imei_candidate) == 15 and imei_candidate.isdigit():
                        info['imei'] = imei_candidate
                    else:
                        info['imei'] = "Unknown"
                else:
                    info['imei'] = "Unknown"
            except:
                info['imei'] = "Unknown"
            
            # Validasi final - cek apakah data tertukar
            if self._validate_modem_info(info):
                return ModemInfo(info['manufacturer'], info['model'], info['revision'], info['imei'])
            else:
                # Fallback ke cara lama jika validasi gagal
                return ModemInfo("Quectel", "EC25", info['revision'], info['imei'])
                
        except Exception as e:
            return ModemInfo("Error", "Error", str(e), "Error")

    def _validate_modem_info(self, info):
        """Validate modem info to detect data corruption"""
        # Check if IMEI is in manufacturer field (corruption indicator)
        if len(info['manufacturer']) == 15 and info['manufacturer'].isdigit():
            return False
        
        # Check if manufacturer is in IMEI field  
        if info['imei'] in ['Quectel', 'EC25', 'Unknown']:
            return False
        
        # Check if revision looks like IMEI
        if len(info['revision']) == 15 and info['revision'].isdigit():
            return False
            
        return True
    def get_network_info(self):
        """Get network information"""
        try:
            # Get operator
            operator = "Unknown"
            response = self.send_at_command("AT+COPS?")
            if "OK" in response and "+COPS:" in response:
                # Parse operator info
                import re
                match = re.search(r'\+COPS:.*?"([^"]*)"', response)
                if match:
                    operator = match.group(1)
            
            # Get registration status
            reg_status = "Unknown"
            response = self.send_at_command("AT+CREG?")
            if "OK" in response and "+CREG:" in response:
                # Parse registration status
                import re
                match = re.search(r'\+CREG:\s*\d+,\s*(\d+)', response)
                if match:
                    status_code = int(match.group(1))
                    status_map = {0: "Not registered", 1: "Registered", 2: "Searching", 3: "Denied", 5: "Registered (roaming)"}
                    reg_status = status_map.get(status_code, f"Unknown ({status_code})")
            
            # Get network type
            network_type = "Unknown"
            response = self.send_at_command("AT+QNWINFO")
            if "OK" in response and "+QNWINFO:" in response:
                # Parse network info
                import re
                match = re.search(r'\+QNWINFO:\s*"([^"]*)"', response)
                if match:
                    network_type = match.group(1)
            
            # Get signal strength
            signal_strength = -113  # Default "no signal"
            signal_quality = 0
            response = self.send_at_command("AT+CSQ")
            if "OK" in response and "+CSQ:" in response:
                # Parse signal quality
                import re
                match = re.search(r'\+CSQ:\s*(\d+),\s*(\d+)', response)
                if match:
                    rssi = int(match.group(1))
                    ber = int(match.group(2))
                    # Convert RSSI to dBm (0=-113dBm, 31=-51dBm, 99=unknown)
                    if rssi != 99:
                        signal_strength = -113 + (rssi * 2)
                    signal_quality = ber
            
            return NetworkInfo(operator, reg_status, network_type, signal_strength, signal_quality)
            
        except Exception as e:
            return NetworkInfo("Error", str(e), "Error", -113, 0)
    
    def set_apn(self, apn, username="", password=""):
        """Set APN configuration"""
        try:
            # Set APN
            cmd = f'AT+CGDCONT=1,"IP","{apn}"'
            response = self.send_at_command(cmd)
            if "OK" not in response:
                return False
            
            # Set username and password if provided
            if username or password:
                auth_type = 2 if username and password else 1  # 1=PAP, 2=CHAP
                cmd = f'AT+QICSGP=1,{auth_type},"{apn}","{username}","{password}",1'
                response = self.send_at_command(cmd)
                if "OK" not in response:
                    return False
            
            # Activate context
            response = self.send_at_command("AT+CGACT=1,1")
            if "OK" not in response:
                return False
            
            return True
            
        except Exception as e:
            print(f"[MODEM] Error setting APN: {e}")
            return False
    
    def get_apn_config(self):
        """Get current APN configuration"""
        try:
            response = self.send_at_command("AT+CGDCONT?")
            if "OK" in response and "+CGDCONT:" in response:
                # Parse APN info
                import re
                match = re.search(r'\+CGDCONT:\s*1,"IP","([^"]*)"', response)
                if match:
                    apn = match.group(1)
                    return {"apn": apn, "username": "", "password": ""}
            
            return {"apn": "", "username": "", "password": ""}
            
        except Exception as e:
            print(f"[MODEM] Error getting APN: {e}")
            return {"apn": "", "username": "", "password": ""}
    
    def check_internet_connection(self):
        """Check internet connection using proper EC25 AT commands"""
        try:
            self.logger.info("Checking GPRS/LTE network attachment...")
            response = self.send_at_command("AT+CGATT?")
            if "+CGATT: 1" not in response:
                self.logger.warning("Modem is not attached to data network.")
                # Try to attach
                attach_response = self.send_at_command("AT+CGATT=1")
                if "OK" not in attach_response:
                    self.logger.error("Failed to attach to packet data network.")
                    return False
                time.sleep(2)  # Wait for attachment
            
            self.logger.info("Checking PDP context status...")
            response = self.send_at_command("AT+CGACT?")
            if "+CGACT: 1,1" not in response:
                self.logger.info("PDP context is not active. Attempting to activate...")
                # Activate the PDP context
                response_activate = self.send_at_command("AT+CGACT=1,1")
                if "OK" not in response_activate:
                    self.logger.error("Failed to activate PDP context.")
                    return False
                time.sleep(2)  # Wait for activation
            
            # Check if we have IP address assigned
            self.logger.info("Checking assigned IP address...")
            ip_response = self.send_at_command("AT+CGPADDR=1")
            if "+CGPADDR:" in ip_response and "0.0.0.0" not in ip_response:
                # We have valid IP, connection should work
                self.logger.info("Internet connection test successful - IP assigned.")
                return True
            else:
                self.logger.error("No valid IP address assigned.")
                return False

        except Exception as e:
            self.logger.error(f"Error during internet connection check: {e}")
            return False
    def start_gps(self, callback=None):
        """Start GPS functionality"""
        try:
            self.gps_callback = callback
            
            # Open GPS port
            if not os.path.exists(self.gps_port):
                raise Exception(f"GPS port {self.gps_port} tidak ditemukan")
            
            self.gps_ser = serial.Serial(
                port=self.gps_port,
                baudrate=115200,
                timeout=1,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE
            )
            
            # Enable GPS
            response = self.send_at_command("AT+QGPS=1")
            if "OK" not in response:
                raise Exception("Failed to start GPS")
            
            # Start GPS reading thread
            self.gps_running = True
            self.gps_thread = threading.Thread(target=self._gps_reader)
            self.gps_thread.daemon = True
            self.gps_thread.start()
            
            print("[MODEM] GPS started")
            return True
            
        except Exception as e:
            print(f"[MODEM] Error starting GPS: {e}")
            if self.gps_ser and self.gps_ser.is_open:
                self.gps_ser.close()
            return False
    
    def stop_gps(self):
        """Stop GPS functionality"""
        try:
            self.gps_running = False
            
            # Stop GPS
            if self.ser and self.ser.is_open:
                self.send_at_command("AT+QGPSEND")
            
            # Close GPS port
            if self.gps_ser and self.gps_ser.is_open:
                self.gps_ser.close()
                self.gps_ser = None
            
            print("[MODEM] GPS stopped")
            
        except Exception as e:
            print(f"[MODEM] Error stopping GPS: {e}")
    
    def _gps_reader(self):
        """Background thread to read GPS data"""
        while self.gps_running and self.gps_ser:
            try:
                if self.gps_ser.in_waiting > 0:
                    line = self.gps_ser.readline().decode('utf-8', errors='ignore').strip()
                    if line.startswith('$GPGGA') or line.startswith('$GNGGA'):
                        self._parse_gga(line)
                    elif line.startswith('$GPRMC') or line.startswith('$GNRMC'):
                        self._parse_rmc(line)
                
                time.sleep(0.1)
                
            except Exception as e:
                print(f"[MODEM] GPS reader error: {e}")
                time.sleep(1)
    
    def _parse_gga(self, nmea_sentence):
        """Parse GGA NMEA sentence"""
        try:
            parts = nmea_sentence.split(',')
            if len(parts) >= 10:
                # Parse latitude
                lat_raw = parts[2]
                lat_dir = parts[3]
                if lat_raw and len(lat_raw) >= 4:
                    degrees = float(lat_raw[:2])
                    minutes = float(lat_raw[2:])
                    latitude = degrees + minutes / 60
                    if lat_dir == 'S':
                        latitude = -latitude
                
                # Parse longitude
                lon_raw = parts[4]
                lon_dir = parts[5]
                if lon_raw and len(lon_raw) >= 5:
                    degrees = float(lon_raw[:3])
                    minutes = float(lon_raw[3:])
                    longitude = degrees + minutes / 60
                    if lon_dir == 'W':
                        longitude = -longitude
                
                # Parse altitude
                altitude = float(parts[9]) if parts[9] else 0.0
                
                # Parse fix status
                fix_status = "No Fix"
                fix_indicator = parts[6]
                if fix_indicator == '1':
                    fix_status = "GPS Fix"
                elif fix_indicator == '2':
                    fix_status = "DGPS Fix"
                
                # Parse satellites
                satellites = int(parts[7]) if parts[7] else 0
                
                # Create GPS data
                gps_data = GPSData(
                    fix_status=fix_status,
                    latitude=latitude if 'latitude' in locals() else 0.0,
                    longitude=longitude if 'longitude' in locals() else 0.0,
                    altitude=altitude,
                    speed=0.0,  # Will be updated by RMC
                    satellites=satellites,
                    timestamp=time.strftime('%H:%M:%S')
                )
                
                if self.gps_callback:
                    self.gps_callback(gps_data)
                    
        except Exception as e:
            print(f"[MODEM] Error parsing GGA: {e}")
    
    def _parse_rmc(self, nmea_sentence):
        """Parse RMC NMEA sentence"""
        try:
            parts = nmea_sentence.split(',')
            if len(parts) >= 8:
                # Parse speed
                speed_knots = float(parts[7]) if parts[7] else 0.0
                speed_kmh = speed_knots * 1.852  # Convert knots to km/h
                
                # Update existing GPS data with speed
                # Note: This is simplified - in practice you'd want to correlate with GGA data
                
        except Exception as e:
            print(f"[MODEM] Error parsing RMC: {e}")

    def reset_network_connection(self):
        """Reset network connection"""
        try:
            # Disable context
            self.send_at_command("AT+CGACT=0,1")
            time.sleep(2)
            
            # Re-enable context
            response = self.send_at_command("AT+CGACT=1,1")
            return "OK" in response
            
        except Exception as e:
            print(f"[MODEM] Error resetting network: {e}")
            return False
    
    def get_detailed_signal_info(self):
        """Get detailed signal information for advanced monitoring"""
        try:
            signal_info = {}
            
            # Basic signal strength
            response = self.send_at_command("AT+CSQ")
            if "OK" in response and "+CSQ:" in response:
                import re
                match = re.search(r'\+CSQ:\s*(\d+),\s*(\d+)', response)
                if match:
                    rssi = int(match.group(1))
                    ber = int(match.group(2))
                    signal_info["rssi"] = rssi
                    signal_info["ber"] = ber
                    if rssi != 99:
                        signal_info["signal_dbm"] = -113 + (rssi * 2)
            
            # Extended signal info for LTE
            response = self.send_at_command("AT+QENG=\"servingcell\"")
            if "OK" in response and "+QENG:" in response:
                # Parse serving cell info
                lines = response.split('\n')
                for line in lines:
                    if "+QENG:" in line:
                        parts = line.split(',')
                        if len(parts) > 10:
                            try:
                                signal_info["cell_id"] = parts[8].strip('"') if len(parts) > 8 else None
                                signal_info["rsrp"] = float(parts[12]) if len(parts) > 12 and parts[12].strip() else None
                                signal_info["rsrq"] = float(parts[13]) if len(parts) > 13 and parts[13].strip() else None
                                signal_info["sinr"] = float(parts[14]) if len(parts) > 14 and parts[14].strip() else None
                            except (ValueError, IndexError):
                                pass
            
            return signal_info
            
        except Exception as e:
            print(f"[MODEM] Error getting detailed signal info: {e}")
            return {}
    
    def set_network_priority(self, priority="auto"):
        """Set network scan priority"""
        try:
            priority_map = {
                "auto": 0,      # Automatic
                "gsm": 1,       # GSM only
                "lte": 3,       # LTE only
                "wcdma": 2      # WCDMA only
            }
            
            mode = priority_map.get(priority, 0)
            response = self.send_at_command(f"AT+QCFG=\"nwscanmode\",{mode}")
            return "OK" in response
            
        except Exception as e:
            print(f"[MODEM] Error setting network priority: {e}")
            return False
    
    def get_network_scan_results(self):
        """Get available networks"""
        try:
            response = self.send_at_command("AT+COPS=?", timeout=30)  # Network scan can take time
            networks = []
            
            if "OK" in response and "+COPS:" in response:
                import re
                # Parse network list
                pattern = r'\((\d+),"([^"]*)","([^"]*)",(\d+)\)'
                matches = re.findall(pattern, response)
                
                for match in matches:
                    networks.append({
                        "status": int(match[0]),
                        "long_name": match[1],
                        "short_name": match[2],
                        "numeric": int(match[3])
                    })
            
            return networks
            
        except Exception as e:
            print(f"[MODEM] Error scanning networks: {e}")
            return []
# Test function
if __name__ == "__main__":
    modem = EC25Modem()
    try:
        if modem.connect():
            print("Connected!")
            info = modem.get_modem_info()
            print(f"Modem: {info.manufacturer} {info.model}")
            modem.disconnect()
    except Exception as e:
        print(f"Error: {e}")