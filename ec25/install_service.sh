#!/bin/bash
# File: install_service.sh
# Script untuk install EC25 MQTT Service sebagai systemd service

SERVICE_NAME="ec25-mqtt"
SERVICE_USER="pi"  # Ganti sesuai user kamu
WORKING_DIR="/home/$SERVICE_USER/ec25_service"  # Ganti sesuai path kamu
PYTHON_PATH="/usr/bin/python3"

echo "Installing EC25 MQTT Service..."

# Create systemd service file
sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=EC25 Modem MQTT Service
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=5
User=$SERVICE_USER
WorkingDirectory=$WORKING_DIR
ExecStart=$PYTHON_PATH $WORKING_DIR/ec25_mqtt_service.py --broker 192.168.0.139 --daemon
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "Service file created at /etc/systemd/system/$SERVICE_NAME.service"

# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable $SERVICE_NAME

echo "Service installed and enabled!"
echo ""
echo "Commands:"
echo "  Start:   sudo systemctl start $SERVICE_NAME"
echo "  Stop:    sudo systemctl stop $SERVICE_NAME" 
echo "  Status:  sudo systemctl status $SERVICE_NAME"
echo "  Logs:    sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "Make sure to:"
echo "1. Copy all files to $WORKING_DIR"
echo "2. Install dependencies: pip install -r requirements.txt"
echo "3. Add user to dialout group: sudo usermod -a -G dialout $SERVICE_USER"