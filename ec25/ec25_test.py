#!/usr/bin/env python3
"""
EC25 Modem Test Script (Fixed for ttyUSB2 / modem_dbg)
Now works even if ttyUSB0 is dead
"""

import subprocess
import time
import serial
import sys
import os
import re
from typing import Optional

def run_command(cmd: str) -> tuple:
    """Run shell command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return 1, "", str(e)

def check_usb_device():
    """Check if EC25 modem is detected via USB"""
    print("=== USB Device Detection ===")
    
    ret, output, error = run_command("lsusb")
    if ret == 0:
        lines = output.split('\n')
        quectel_found = False
        
        for line in lines:
            if '2c7c:0125' in line or 'Quectel' in line:
                print(f"✓ Found: {line.strip()}")
                quectel_found = True
        
        if not quectel_found:
            print("✗ EC25 modem not detected in USB devices")
            return False
    else:
        print(f"✗ Error running lsusb: {error}")
        return False
    
    return True

def check_serial_ports():
    """Check if serial ports are available"""
    print("\n=== Serial Ports Check ===")
    
    ret, output, error = run_command("ls -la /dev/ttyUSB*")
    if ret == 0:
        print("USB Serial ports found:")
        print(output)
    else:
        print("✗ No ttyUSB devices found")
        return False
    
    print("\nModem device links:")
    modem_devices = ['/dev/modem_at', '/dev/modem_wwan', '/dev/modem_dbg', '/dev/modem_gps']
    
    all_found = True
    for device in modem_devices:
        if os.path.exists(device):
            ret, output, error = run_command(f"ls -la {device}")
            print(f"✓ {output.strip()}")
        else:
            print(f"✗ {device} not found")
            all_found = False
    
    return all_found

def check_permissions():
    """Check user permissions for serial ports"""
    print("\n=== Permission Check ===")
    
    ret, output, error = run_command("groups")
    if ret == 0:
        groups = output.strip().split()
        if 'dialout' in groups:
            print("✓ User is in dialout group")
        else:
            print("✗ User is NOT in dialout group")
            return False
    
    for device in ['/dev/modem_dbg', '/dev/ttyUSB2']:
        if os.path.exists(device):
            ret, output, error = run_command(f"ls -la {device}")
            if ret == 0:
                print(f"Permissions for {device}: {output.strip()}")
            break
    
    return True

def test_at_commands(port: str = '/dev/modem_dbg') -> Optional[serial.Serial]:
    """Test basic AT command communication with robust timing"""
    print(f"\n=== AT Command Test ({port}) ===")
    
    if not os.path.exists(port):
        print(f"✗ Port {port} does not exist")
        fallbacks = ['/dev/ttyUSB2', '/dev/ttyUSB0']
        for fb in fallbacks:
            if os.path.exists(fb):
                print(f"Trying fallback: {fb}")
                port = fb
                break
        else:
            print("No valid AT port found")
            return None
    
    try:
        ser = serial.Serial(
            port=port,
            baudrate=115200,
            timeout=2,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            bytesize=serial.EIGHTBITS
        )
        
        time.sleep(1.5)  # Stabilize
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        
        print(f"✓ Opened serial port: {port}")
        print("Sending: AT")
        ser.write(b'AT\r\n')
        
        response = ""
        start_time = time.time()
        while time.time() - start_time < 5:
            if ser.in_waiting > 0:
                chunk = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                response += chunk
                if 'OK' in response:
                    break
                if 'ERROR' in response:
                    break
            time.sleep(0.2)
        
        print(f"Response: {repr(response)}")
        
        if 'OK' in response:
            print("✓ AT command successful")
            return ser
        else:
            print("✗ AT command failed or no response")
            return None
            
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return None

def test_modem_info(ser: serial.Serial):
    """Test modem information commands"""
    print("\n=== Modem Information Test ===")
    
    commands = [
        ('ATI', 'Model Info'),
        ('AT+CGSN', 'IMEI'),
        ('AT+CGMR', 'Firmware'),
        ('AT+CPIN?', 'SIM Status'),
        ('AT+CSQ', 'Signal Quality'),
        ('AT+CREG?', 'Network Reg'),
        ('AT+COPS?', 'Operator'),
        ('AT+CGDCONT?', 'APN'),
        ('AT+QNWINFO', 'Network Info')
    ]
    
    for cmd, desc in commands:
        try:
            ser.reset_input_buffer()
            print(f"Sending: {cmd}")
            ser.write(f'{cmd}\r\n'.encode())
            time.sleep(1.5)
            
            resp = ""
            for _ in range(10):
                if ser.in_waiting > 0:
                    resp += ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                time.sleep(0.2)
            
            resp = resp.strip()
            if resp and cmd not in resp and 'OK' not in resp and 'ERROR' not in resp:
                print(f"✓ {desc}: {resp}")
            elif 'ERROR' in resp:
                print(f"✗ {desc}: ERROR")
            else:
                print(f"✓ {desc}: OK or no data")
                
        except Exception as e:
            print(f"✗ {desc}: Failed - {e}")

def test_gps_functionality(gps_port: str = '/dev/modem_gps'):
    """Test GPS functionality with error 504 handling"""
    print(f"\n=== GPS Test ({gps_port}) ===")
    
    if not os.path.exists(gps_port):
        print(f"✗ GPS port {gps_port} not found")
        return False
    
    # Try to enable GPS via AT port
    at_port = '/dev/modem_dbg' if os.path.exists('/dev/modem_dbg') else '/dev/ttyUSB2'
    if os.path.exists(at_port):
        try:
            at_ser = serial.Serial(at_port, 115200, timeout=2)
            print("Enabling GPS...")
            at_ser.write(b'AT+QGPS=1\r\n')
            time.sleep(1.5)
            response = at_ser.read(at_ser.in_waiting).decode('ascii', errors='ignore')
            print(f"GPS enable response: {repr(response)}")
            
            if '+CME ERROR: 504' in response:
                print("✓ GPS already enabled, continuing...")
            elif 'OK' in response:
                print("✓ GPS enabled successfully")
            else:
                print("⚠ GPS enable: No OK or error")
                
            at_ser.close()
            time.sleep(1)
        except:
            print("✗ Failed to send GPS enable command")
    
    # Read GPS data
    try:
        gps_ser = serial.Serial(port=gps_port, baudrate=115200, timeout=2)
        print(f"✓ Opened GPS port: {gps_port}")
        print("Waiting for GPS NMEA data (15 seconds)...")
        
        nmea_count = 0
        start_time = time.time()
        
        while time.time() - start_time < 15:
            if gps_ser.in_waiting > 0:
                try:
                    line = gps_ser.readline().decode('ascii', errors='ignore').strip()
                    if line.startswith('$GP') or line.startswith('$GN'):
                        print(f"NMEA: {line}")
                        nmea_count += 1
                        if nmea_count >= 3:
                            break
                except:
                    pass
            time.sleep(0.1)
        
        gps_ser.close()
        
        if nmea_count > 0:
            print(f"✓ GPS data received ({nmea_count} messages)")
            return True
        else:
            print("✗ No GPS data received")
            print("Tips: Use external antenna, wait 5-10 mins for cold start")
            return False
            
    except Exception as e:
        print(f"✗ GPS test error: {e}")
        return False

def system_info():
    """Display system information"""
    print("\n=== System Information ===")
    
    ret, output, error = run_command("uname -a")
    if ret == 0:
        print(f"System: {output.strip()}")
    
    print(f"Python: {sys.version}")
    
    modules = ['serial', 'tkinter']
    for module in modules:
        try:
            __import__(module)
            print(f"✓ {module} module available")
        except ImportError:
            print(f"✗ {module} module NOT available")
    
    ret, output, error = run_command("lspci | grep -i usb")
    if ret == 0 and output:
        print(f"USB Controllers: {output.strip()}")

def main():
    print("EC25 Modem Test and Troubleshooting Script")
    print("=" * 60)
    
    system_info()
    
    usb_ok = check_usb_device()
    ports_ok = check_serial_ports()
    perm_ok = check_permissions()
    
    if not usb_ok:
        print("\n❌ Critical: Modem not detected via USB")
        return False
    
    ser = test_at_commands()
    if ser:
        test_modem_info(ser)
        ser.close()
    else:
        print("\n❌ AT command communication failed")
        print("Try: sudo screen /dev/ttyUSB2 115200 and test AT manually")
    
    test_gps_functionality()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"USB Detection: {'✓' if usb_ok else '✗'}")
    print(f"Serial Ports: {'✓' if ports_ok else '✗'}")
    print(f"Permissions: {'✓' if perm_ok else '✗'}")
    print(f"AT Commands: {'✓' if ser else '✗'}")
    
    print("\nFor more help, check the README.md file")
    return usb_ok and ser is not None

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        sys.exit(1)