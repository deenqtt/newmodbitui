#!/bin/bash
# EC25 Modem Setup and Installation Script
# For Raspberry Pi / NanoPi with EC25 LTE/GSM/GPS modem

set -e

echo "=== EC25 LTE/GSM/GPS Modem Setup ==="
echo "This script will install and configure the EC25 modem manager"

# Check if running as root for some operations
if [ "$EUID" -eq 0 ]; then
    echo "Please run this script as regular user (not root)"
    echo "Some operations will use sudo when needed"
    exit 1
fi

# Create application directory
APP_DIR="$HOME/ec25_modem_manager"
echo "Creating application directory: $APP_DIR"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Install required Python packages
echo "Installing Python dependencies..."
pip3 install --user pyserial

# Create udev rules for consistent device naming
echo "Setting up udev rules for EC25 modem..."
UDEV_RULES="/etc/udev/rules.d/99-quectel-ec25.rules"

sudo tee "$UDEV_RULES" > /dev/null << 'EOF'
# Quectel EC25 LTE/GSM/GPS modem
# USB device: 2c7c:0125

# Create consistent symlinks for EC25 ports
SUBSYSTEM=="tty", ATTRS{idVendor}=="2c7c", ATTRS{idProduct}=="0125", ATTRS{bInterfaceNumber}=="00", SYMLINK+="modem_at"
SUBSYSTEM=="tty", ATTRS{idVendor}=="2c7c", ATTRS{idProduct}=="0125", ATTRS{bInterfaceNumber}=="01", SYMLINK+="modem_gps" 
SUBSYSTEM=="tty", ATTRS{idVendor}=="2c7c", ATTRS{idProduct}=="0125", ATTRS{bInterfaceNumber}=="02", SYMLINK+="modem_dbg"
SUBSYSTEM=="tty", ATTRS{idVendor}=="2c7c", ATTRS{idProduct}=="0125", ATTRS{bInterfaceNumber}=="03", SYMLINK+="modem_wwan"

# Set permissions for modem access
SUBSYSTEM=="tty", ATTRS{idVendor}=="2c7c", ATTRS{idProduct}=="0125", GROUP="dialout", MODE="0664"
EOF

echo "Reloading udev rules..."
sudo udevadm control --reload-rules
sudo udevadm trigger

# Add user to dialout group for serial port access
echo "Adding user to dialout group..."
sudo usermod -a -G dialout $USER

# Create systemd service for modem manager (optional)
read -p "Do you want to create a systemd service for auto-start? (y/N): " create_service

if [[ $create_service =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/etc/systemd/system/ec25-manager.service"
    
    sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=EC25 Modem Manager
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/python3 $APP_DIR/ec25_gui.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    echo "Systemd service created. Enable it with: sudo systemctl enable ec25-manager"
fi

# Create desktop entry for GUI
DESKTOP_FILE="$HOME/.local/share/applications/ec25-manager.desktop"
mkdir -p "$HOME/.local/share/applications"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=EC25 Modem Manager
Comment=Manage EC25 LTE/GSM/GPS Modem
Exec=python3 $APP_DIR/ec25_gui.py
Icon=network-wireless
Terminal=false
Type=Application
Categories=Network;Settings;
EOF

# Create launcher script
LAUNCHER_SCRIPT="$APP_DIR/launch_ec25_manager.sh"
cat > "$LAUNCHER_SCRIPT" << EOF
#!/bin/bash
# EC25 Modem Manager Launcher

cd "$APP_DIR"

# Check if modem is connected
if ! lsusb | grep -q "2c7c:0125"; then
    echo "EC25 modem not detected!"
    echo "Please check USB connection and try again."
    read -p "Press Enter to continue anyway..."
fi

# Check if user is in dialout group
if ! groups | grep -q dialout; then
    echo "User is not in dialout group!"
    echo "Please run: sudo usermod -a -G dialout \$USER"
    echo "Then logout and login again."
    read -p "Press Enter to continue anyway..."
fi

# Launch the application
python3 ec25_gui.py
EOF

chmod +x "$LAUNCHER_SCRIPT"

# Create requirements file
cat > "$APP_DIR/requirements.txt" << EOF
pyserial>=3.5
EOF

# Create README file
cat > "$APP_DIR/README.md" << 'EOF'
# EC25 LTE/GSM/GPS Modem Manager

A Python GUI application for managing Quectel EC25 LTE/GSM/GPS modem on Raspberry Pi and NanoPi.

## Features

- **GSM/LTE Management**:
  - Configure APN settings
  - Monitor signal strength and network status
  - Test internet connectivity
  - Support for Indonesian carrier presets

- **GPS Tracking**:
  - Real-time GPS data display
  - NMEA sentence parsing
  - GPS logging

- **Device Management**:
  - Modem information display
  - Port configuration
  - Auto-refresh capabilities

## Hardware Requirements

- Raspberry Pi or NanoPi
- Quectel EC25 LTE/GSM/GPS modem (USB interface)
- SIM card with data plan

## Installation

Run the setup script:
```bash
./install_ec25.sh
```

## Usage

### GUI Application
```bash
./launch_ec25_manager.sh
```
Or run directly:
```bash
python3 ec25_gui.py
```

### Command Line Testing
```bash
python3 ec25_modem.py
```

## Configuration

The application saves configuration in `ec25_config.json`:
- Port settings
- APN configuration
- Last used settings

## Indonesian Carrier Presets

- **Telkomsel**: APN: `telkomsel`
- **Indosat**: APN: `indosatgprs`, User: `indosat`, Pass: `indosat`
- **XL**: APN: `www.xlgprs.net`, User: `xlgprs`, Pass: `proxl`
- **3 (Tri)**: APN: `3gprs`, User: `3gprs`, Pass: `3gprs`
- **Smartfren**: APN: `smart`

## Troubleshooting

### Modem Not Detected
1. Check USB connection
2. Verify with `lsusb | grep 2c7c`
3. Check udev rules: `ls -la /dev/modem_*`

### Permission Denied
1. Add user to dialout group: `sudo usermod -a -G dialout $USER`
2. Logout and login again
3. Check permissions: `ls -la /dev/ttyUSB*`

### GPS Not Working
1. Ensure good GPS signal (outdoor)
2. Wait for satellite acquisition (may take several minutes)
3. Check GPS port configuration

## Device Ports

The EC25 modem creates 4 serial ports:
- `ttyUSB0` → `/dev/modem_at` - AT commands
- `ttyUSB1` → `/dev/modem_gps` - GPS NMEA data
- `ttyUSB2` → `/dev/modem_dbg` - Debug interface
- `ttyUSB3` → `/dev/modem_wwan` - PPP data connection

## Files

- `ec25_modem.py` - Core modem library
- `ec25_gui.py` - GUI application
- `ec25_config.json` - Configuration file
- `launch_ec25_manager.sh` - Launcher script
EOF

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Setup summary:"
echo "- Application installed in: $APP_DIR"
echo "- Udev rules created for consistent device naming"
echo "- User added to dialout group"
echo "- Desktop entry created"
echo ""
echo "Next steps:"
echo "1. **IMPORTANT**: Logout and login again (for group membership)"
echo "2. Connect your EC25 modem via USB"
echo "3. Insert SIM card with data plan"
echo "4. Run the application:"
echo "   cd $APP_DIR"
echo "   ./launch_ec25_manager.sh"
echo ""
echo "Or use the GUI from applications menu: 'EC25 Modem Manager'"
echo ""
echo "To verify modem detection:"
echo "  lsusb | grep 2c7c"
echo "  ls -la /dev/modem_*"
echo ""

# Verify current setup
echo "Current setup verification:"
echo "User groups: $(groups)"
echo "USB devices:"
lsusb | grep -i quectel || echo "  No Quectel devices found"
echo "Modem devices:"
ls -la /dev/modem_* 2>/dev/null || echo "  No modem devices found (reboot may be required)"
echo ""
echo "Installation script completed!"