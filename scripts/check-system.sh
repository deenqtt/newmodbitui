#!/bin/bash

# System Check Script for IoT Dashboard
# This script checks if the system is ready for installation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[CHECK] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

check_os() {
    log "Checking operating system..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        echo "OS: $PRETTY_NAME"
        
        if [[ "$ID" == "ubuntu" ]] || [[ "$ID" == "debian" ]]; then
            echo "✅ Supported OS detected"
        else
            warning "OS not officially supported but may work"
        fi
    else
        error "Cannot detect operating system"
        exit 1
    fi
}

check_architecture() {
    log "Checking system architecture..."
    ARCH=$(uname -m)
    echo "Architecture: $ARCH"
    
    case $ARCH in
        x86_64|amd64)
            echo "✅ 64-bit architecture supported"
            ;;
        armv7l|armv6l)
            echo "✅ ARM architecture supported"
            ;;
        aarch64|arm64)
            echo "✅ ARM64 architecture supported"
            ;;
        *)
            warning "Architecture may not be fully supported"
            ;;
    esac
}

check_memory() {
    log "Checking system memory..."
    
    TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    echo "Total Memory: ${TOTAL_MEM}MB"
    
    if [[ $TOTAL_MEM -ge 2048 ]]; then
        echo "✅ Sufficient memory (2GB+ recommended)"
    elif [[ $TOTAL_MEM -ge 1024 ]]; then
        warning "Low memory detected. Consider upgrading to 2GB+"
    else
        error "Insufficient memory. Minimum 1GB required"
        exit 1
    fi
}

check_disk() {
    log "Checking disk space..."
    
    AVAILABLE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    echo "Available disk space: ${AVAILABLE}GB"
    
    if [[ $AVAILABLE -ge 10 ]]; then
        echo "✅ Sufficient disk space"
    elif [[ $AVAILABLE -ge 5 ]]; then
        warning "Low disk space. Consider freeing up space"
    else
        error "Insufficient disk space. Minimum 5GB required"
        exit 1
    fi
}

check_network() {
    log "Checking network connectivity..."
    
    if ping -c 1 google.com >/dev/null 2>&1; then
        echo "✅ Internet connectivity available"
    else
        warning "No internet connectivity detected"
        echo "Some features may not work without internet"
    fi
}

check_ports() {
    log "Checking required ports..."
    
    PORTS=(80 3000 5432 1883)
    for port in "${PORTS[@]}"; do
        if netstat -tulpn 2>/dev/null | grep -q ":$port "; then
            warning "Port $port is already in use"
        else
            echo "✅ Port $port is available"
        fi
    done
}

check_sudo() {
    log "Checking sudo privileges..."
    
    if sudo -n true 2>/dev/null; then
        echo "✅ Sudo privileges available"
    else
        echo "❌ Sudo privileges required"
        echo "Please run: sudo -v"
        exit 1
    fi
}

check_dependencies() {
    log "Checking existing dependencies..."
    
    DEPS=("curl" "wget" "git")
    for dep in "${DEPS[@]}"; do
        if command -v "$dep" >/dev/null 2>&1; then
            echo "✅ $dep is installed"
        else
            warning "$dep is not installed (will be installed automatically)"
        fi
    done
}

generate_report() {
    echo
    info "=== System Check Report ==="
    echo "Date: $(date)"
    echo "Hostname: $(hostname)"
    echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
    echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    echo "Users: $(who | wc -l) logged in"
    echo
    
    info "=== Recommendations ==="
    if [[ $TOTAL_MEM -lt 2048 ]]; then
        echo "- Consider upgrading to 2GB+ RAM for better performance"
    fi
    
    if [[ $AVAILABLE -lt 10 ]]; then
        echo "- Free up disk space for optimal performance"
    fi
    
    echo "- Ensure firewall allows ports 80, 3000, 5432, 1883"
    echo "- Keep system updated with latest security patches"
    echo
}

main() {
    info "IoT Dashboard System Compatibility Check"
    echo "========================================"
    echo
    
    check_os
    check_architecture
    check_memory
    check_disk
    check_network
    check_ports
    check_sudo
    check_dependencies
    generate_report
    
    log "System check completed!"
    echo
    info "Your system appears compatible with IoT Dashboard."
    info "Run './install.sh' to begin installation."
}

main "$@"