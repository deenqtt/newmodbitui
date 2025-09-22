#!/bin/bash

# Script to install Docker on Debian-based Raspberry Pi OS
# This script assumes you have sudo privileges

echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "Installing required dependencies..."
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

echo "Adding Docker's official GPG key..."
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "Adding Docker repository..."
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "Updating package list with Docker repository..."
sudo apt update

echo "Installing Docker CE..."
sudo apt install -y docker-ce docker-ce-cli containerd.io

echo "Starting and enabling Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

echo "Adding current user to docker group (optional, requires logout/login to take effect)..."
sudo usermod -aG docker $USER

echo "Docker installation completed successfully!"
echo "To verify installation, run: docker --version"
echo "Note: Log out and log back in for docker group changes to take effect, or run 'newgrp docker' in current session."
