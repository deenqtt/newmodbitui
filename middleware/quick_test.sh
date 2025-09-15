#!/bin/bash

# Basic EC25 Modem Test - Start from scratch

echo "=== EC25 Basic Modem Test ==="
echo "Starting fresh test..."

# Check prerequisites
echo "1. Checking prerequisites..."

# Check if user is in dialout group
if groups | grep -q dialout; then
    echo "✓ User is in dialout group"
else
    echo "✗ User NOT in dialout group"
    echo "Run: sudo usermod -a -G dialout \$USER"
    echo "Then logout and login again"
    exit 1
fi

# Check USB device
echo "2. Checking USB device..."
if lsusb | grep -q "2c7c:0125"; then
    echo "✓ EC25 modem detected"
    lsusb | grep "2c7c:0125"
else
    echo "✗ EC25 modem not detected"
    echo "Check USB connection"
    exit 1
fi

# Check serial ports
echo "3. Checking serial ports..."
if ls /dev/ttyUSB* > /dev/null 2>&1; then
    echo "✓ Serial ports found:"
    ls -la /dev/ttyUSB*
else
    echo "✗ No serial ports found"
    exit 1
fi

# Check udev symlinks
echo "4. Checking udev symlinks..."
if ls /dev/modem_* > /dev/null 2>&1; then
    echo "✓ Udev symlinks found:"
    ls -la /dev/modem_*
else
    echo "⚠ Udev symlinks not found - using direct ttyUSB ports"
fi

# Test each port for AT command response
echo "5. Testing AT commands on each port..."

test_at_port() {
    local port=$1
    local port_name=$2
    
    echo "Testing $port ($port_name)..."
    
    # Method 1: Using socat
    if command -v socat > /dev/null; then
        response=$(echo -e "AT\r" | timeout 3 socat - $port,b115200,raw,echo=0 2>/dev/null)
        if echo "$response" | grep -q "OK"; then
            echo "  ✓ SOCAT method: AT command successful"
            echo "  Response: $response"
            return 0
        fi
    fi
    
    # Method 2: Using stty and direct I/O
    if stty -F $port 115200 cs8 -cstopb -parenb raw -echo 2>/dev/null; then
        exec 3<>$port
        echo -e "AT\r" >&3
        sleep 1
        response=$(timeout 2 cat <&3)
        exec 3>&-
        
        if echo "$response" | grep -q "OK"; then
            echo "  ✓ STTY method: AT command successful"
            echo "  Response: $response"
            return 0
        fi
    fi
    
    # Method 3: Using Python
    python3 -c "
import serial
import time

try:
    ser = serial.Serial('$port', 115200, timeout=2)
    ser.write(b'AT\\r\\n')
    time.sleep(0.5)
    response = ser.read(100).decode('utf-8', errors='ignore')
    ser.close()
    if 'OK' in response:
        print('  ✓ PYTHON method: AT command successful')
        print('  Response:', repr(response))
        exit(0)
    else:
        print('  ✗ PYTHON method: No OK response')
        print('  Response:', repr(response))
except Exception as e:
    print('  ✗ PYTHON method: Error -', str(e))
exit(1)
" && return 0
    
    echo "  ✗ All methods failed on $port"
    return 1
}

# Test udev symlinks first
AT_PORT=""
GPS_PORT=""

echo "6. Testing udev symlinks..."

# Test modem_at symlink first
if [ -e "/dev/modem_at" ]; then
    echo "Testing /dev/modem_at symlink..."
    if test_at_port "/dev/modem_at" "modem_at"; then
        AT_PORT="/dev/modem_at"
        echo "✓ Found working AT port: $AT_PORT"
    fi
fi

# Test modem_gps symlink
if [ -e "/dev/modem_gps" ]; then
    echo "Testing /dev/modem_gps symlink..."
    # For GPS, we'll test data availability later
    GPS_PORT="/dev/modem_gps"
fi

# If symlinks don't work, fall back to direct testing
if [ -z "$AT_PORT" ]; then
    echo "7. Falling back to direct port testing..."
    for i in 0 1 2 3; do
        port="/dev/ttyUSB$i"
        if test_at_port "$port" "ttyUSB$i"; then
            AT_PORT="$port"
            echo "✓ Found working AT port: $AT_PORT"
            break
        fi
    done
fi

if [ -z "$AT_PORT" ]; then
    echo "✗ No working AT command port found"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check if SIM card is properly inserted"
    echo "2. Check if modem has power (some need external power)"
    echo "3. Try unplugging and reconnecting USB"
    echo "4. Check dmesg for errors: dmesg | tail -20"
    exit 1
fi

# Get modem information
echo "8. Getting modem information from $AT_PORT..."

get_modem_info() {
    local cmd=$1
    local desc=$2
    
    echo -n "$desc: "
    
    if command -v socat > /dev/null; then
        response=$(echo -e "$cmd\r" | timeout 5 socat - $AT_PORT,b115200,raw,echo=0 2>/dev/null)
    else
        python3 -c "
import serial
import time

try:
    ser = serial.Serial('$AT_PORT', 115200, timeout=3)
    ser.write(b'$cmd\\r\\n')
    time.sleep(1)
    response = ser.read(200).decode('utf-8', errors='ignore')
    ser.close()
    print(response.strip())
except:
    print('Error')
" | grep -v "^$cmd" | grep -v "^OK$" | head -1 | tr -d '\r\n' && return
    fi
    
    # Clean response
    clean_resp=$(echo "$response" | grep -v "^$cmd" | grep -v "^OK$" | grep -v "^ERROR" | grep -v "^$" | head -1 | tr -d '\r\n')
    if [ -n "$clean_resp" ]; then
        echo "$clean_resp"
    else
        echo "No response"
    fi
}

# Get basic info
get_modem_info "ATI" "Model"
get_modem_info "AT+CGSN" "IMEI"
get_modem_info "AT+CGMR" "Firmware"
get_modem_info "AT+CPIN?" "SIM Status"
get_modem_info "AT+CSQ" "Signal Quality"
get_modem_info "AT+COPS?" "Operator"
get_modem_info "AT+CREG?" "Network Registration"

# Test GPS functionality
echo "9. Testing GPS functionality..."

# First enable GPS
echo "Enabling GPS..."
if command -v socat > /dev/null; then
    echo -e "AT+QGPS=1\r" | socat - $AT_PORT,b115200,raw,echo=0 > /dev/null 2>&1
fi

sleep 2

# Test GPS port (prioritize udev symlink)
GPS_TEST_PORTS=()

if [ -e "/dev/modem_gps" ]; then
    GPS_TEST_PORTS+=("/dev/modem_gps")
fi

# Add direct ports as fallback
GPS_TEST_PORTS+=("/dev/ttyUSB1" "/dev/ttyUSB3" "/dev/ttyUSB0" "/dev/ttyUSB2")

for port in "${GPS_TEST_PORTS[@]}"; do
    if [ -e "$port" ]; then
        echo "Testing GPS on $port..."
        timeout 5 cat $port > /tmp/gps_test_$$.txt 2>/dev/null &
        sleep 5
        
        if [ -s "/tmp/gps_test_$$.txt" ]; then
            echo "✓ GPS data found on $port"
            head -3 "/tmp/gps_test_$$.txt"
            GPS_PORT="$port"
            break
        else
            echo "✗ No GPS data on $port"
        fi
        
        rm -f "/tmp/gps_test_$$.txt"
    fi
done

echo ""
echo "=== Test Results ==="
echo "AT Command Port: $AT_PORT"
echo "GPS Port: ${GPS_PORT:-Not found}"
echo ""

echo "Port assignments:"
if [ -e "/dev/modem_at" ]; then
    echo "- AT Commands: /dev/modem_at (→ $(readlink /dev/modem_at 2>/dev/null || echo "unknown"))"
else
    echo "- AT Commands: $AT_PORT"
fi

if [ -e "/dev/modem_gps" ]; then
    echo "- GPS: /dev/modem_gps (→ $(readlink /dev/modem_gps 2>/dev/null || echo "unknown"))"
else
    echo "- GPS: ${GPS_PORT:-Unknown}"
fi

echo "- Data/Debug: Other ports"
echo ""

if [ -n "$AT_PORT" ]; then
    echo "✓ Modem is working! You can proceed with the GUI application."
    echo ""
    echo "Next steps:"
    echo "1. Create Python application files"
    echo "2. Update port assignments in code to use:"
    if [ -e "/dev/modem_at" ]; then
        echo "   AT Port: /dev/modem_at"
    else
        echo "   AT Port: $AT_PORT"
    fi
    if [ -e "/dev/modem_gps" ]; then
        echo "   GPS Port: /dev/modem_gps"
    else
        echo "   GPS Port: $GPS_PORT"
    fi
    echo "3. Run the GUI: python3 ec25_gui.py"
else
    echo "✗ Modem communication failed. Check hardware and connections."
fi