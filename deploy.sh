#!/bin/bash
# IoT Dashboard Deployment Script
# Author: Automated Deployment Assistant
# Description: Complete deployment script for IoT Dashboard with MQTT integration
set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="iot-dashboard"
APP_PORT=3000
NGINX_PORT=8080
NODE_VERSION="18"

# Log functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js installation
check_nodejs() {
    log "Checking Node.js installation..."
    if command_exists node && command_exists npm; then
        NODE_VERSION_INSTALLED=$(node --version | sed 's/v//')
        MAJOR_VERSION=$(echo $NODE_VERSION_INSTALLED | cut -d. -f1)
        if [ "$MAJOR_VERSION" -ge "$NODE_VERSION" ]; then
            log_success "Node.js v$NODE_VERSION_INSTALLED and npm $(npm --version) are installed"
            return 0
        else
            log_warning "Node.js version too old: v$NODE_VERSION_INSTALLED (required: v$NODE_VERSION+)"
            return 1
        fi
    else
        log_error "Node.js or npm not found"
        return 1
    fi
}

# Function to install Node.js
install_nodejs() {
    log "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    log_success "Node.js $(node --version) installed successfully"
}

# Function to check PM2 installation
check_pm2() {
    log "Checking PM2 installation..."
    if command_exists pm2; then
        PM2_VERSION=$(pm2 --version)
        log_success "PM2 v$PM2_VERSION is installed"
        return 0
    else
        log_error "PM2 not found"
        return 1
    fi
}

# Function to install PM2
install_pm2() {
    log "Installing PM2..."
    sudo npm install -g pm2
    pm2 startup | grep "sudo env" | bash || true
    log_success "PM2 installed successfully"
}

# Function to check Nginx installation
check_nginx() {
    log "Checking Nginx installation..."
    if command_exists nginx; then
        NGINX_VERSION=$(nginx -v 2>&1 | grep -o '[0-9.]*')
        log_success "Nginx v$NGINX_VERSION is installed"
        return 0
    else
        log_error "Nginx not found"
        return 1
    fi
}

# Function to install Nginx
install_nginx() {
    log "Installing Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    log_success "Nginx installed and started successfully"
}

# Function to check all dependencies
check_dependencies() {
    log "=== Checking Dependencies ==="
    
    local missing_deps=()
    
    # Update package list first
    sudo apt-get update
    
    # Install essential tools
    sudo apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates
    
    if ! check_nodejs; then
        missing_deps+=("nodejs")
    fi
    
    if ! check_pm2; then
        missing_deps+=("pm2")
    fi
    
    if ! check_nginx; then
        missing_deps+=("nginx")
    fi
    
    if [ ${#missing_deps[@]} -eq 0 ]; then
        log_success "All dependencies are installed"
        return 0
    else
        log_warning "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi
}

# Function to install missing dependencies
install_dependencies() {
    log "=== Installing Missing Dependencies ==="
    
    if ! check_nodejs; then
        install_nodejs
    fi
    
    if ! check_pm2; then
        install_pm2
    fi
    
    if ! check_nginx; then
        install_nginx
    fi
}

# Function to configure environment
configure_environment() {
    log "=== Configuring Environment ==="
    
    cd "$PROJECT_ROOT"
    
    # Create .env file with your specific configuration
    cat > .env << 'EOF'
NEXT_PUBLIC_MQTT_HOST="127.0.0.1"
NEXT_PUBLIC_MQTT_PORT="9000"
NEXT_PUBLIC_MQTT_USERNAME=""
NEXT_PUBLIC_MQTT_PASSWORD=""
JWT_SECRET="your-super-secret-key-that-is-very-long-and-random"
WEBHOOK_PORT="3001"
WEBHOOK_SECRET="masukkan_string_rahasia_anda_di_sini_yang_panjang_dan_acak"
MQTT_BROKER_URL="ws://192.168.0.139:9000"
CHIRPSTACK_API_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjaGlycHN0YWNrIiwiaXNzIjoiY2hpcnBzdGFjayIsInN1YiI6ImMyOWRlM2VkLWJjZTItNDY3NC05MWY3LTExZTkxNjJkMzk3OCIsInR5cCI6ImtleSJ9.Y_pGm_QMRwLPU3ShwxEul10r8ReGbc7nu7Aob0a14OA"
CHIRPSTACK_API_URL="http://192.168.0.139:8090"
NODE_ENV="production"
PORT=3000
EOF
    
    chmod 600 .env
    log_success "Environment configuration created"
}

# Function to install application dependencies
install_app_dependencies() {
    log "=== Installing Application Dependencies ==="
    
    cd "$PROJECT_ROOT"
    
    # Install Node.js dependencies
    log "Installing npm dependencies..."
    npm install
    
    log_success "Application dependencies installed"
}

# Function to build application
build_application() {
    log "=== Building Application ==="
    
    cd "$PROJECT_ROOT"
    
    # Clean previous build
    if [ -d ".next" ]; then
        rm -rf .next
        log "Cleaned previous build"
    fi
    
    # Build Next.js application
    log "Building Next.js application..."
    npm run build
    
    # Verify build
    if [ ! -d ".next" ]; then
        log_error "Build failed - .next directory not found"
        exit 1
    fi
    
    log_success "Application built successfully"
}

# Function to create PM2 ecosystem configuration
create_pm2_config() {
    log "Creating PM2 ecosystem configuration..."
    
    cd "$PROJECT_ROOT"
    
    # Create logs directory
    mkdir -p logs
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: '$APP_NAME',
      script: 'npm',
      args: 'start',
      cwd: '$PROJECT_ROOT',
      env: {
        NODE_ENV: 'production',
        PORT: $APP_PORT
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
EOF
    
    log_success "PM2 configuration created"
}

# Function to start application with PM2
start_pm2_application() {
    log "=== Starting Application with PM2 ==="
    
    cd "$PROJECT_ROOT"
    
    # Stop existing PM2 process if running
    pm2 stop "$APP_NAME" 2>/dev/null || true
    pm2 delete "$APP_NAME" 2>/dev/null || true
    
    # Start application with PM2
    log "Starting $APP_NAME on port $APP_PORT..."
    pm2 start ecosystem.config.js
    pm2 save
    
    # Wait for application to start
    log "Waiting for application to start..."
    sleep 10
    
    # Verify application is running
    if pm2 list | grep -q "$APP_NAME.*online"; then
        log_success "Application is running with PM2"
    else
        log_error "Application failed to start with PM2"
        pm2 logs "$APP_NAME" --lines 10
        exit 1
    fi
    
    log_success "PM2 deployment completed"
}

# Function to setup Nginx reverse proxy
setup_nginx() {
    log "=== Setting Up Nginx Reverse Proxy ==="
    
    # Create Nginx configuration for iot-dashboard
    sudo tee /etc/nginx/sites-available/iot-dashboard > /dev/null << EOF
# IoT Dashboard - Port $NGINX_PORT
server {
    listen $NGINX_PORT;
    server_name localhost;
    
    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # Remove default site and enable iot-dashboard
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo ln -sf /etc/nginx/sites-available/iot-dashboard /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
        sudo systemctl reload nginx
        log_success "Nginx reloaded successfully"
    else
        log_error "Nginx configuration test failed"
        exit 1
    fi
}

# Function to verify deployment
verify_deployment() {
    log "=== Verifying Deployment ==="
    
    local all_tests_passed=true
    
    # Test application health
    log "Testing application health..."
    local app_ready=false
    for i in {1..30}; do
        if curl -s http://localhost:$APP_PORT > /dev/null 2>&1; then
            app_ready=true
            break
        fi
        sleep 2
    done
    
    if [ "$app_ready" = true ]; then
        log_success "Application health test passed"
    else
        log_error "Application health test failed"
        all_tests_passed=false
    fi
    
    # Test Nginx proxy
    log "Testing Nginx proxy..."
    if curl -s http://localhost:$NGINX_PORT > /dev/null 2>&1; then
        log_success "Nginx proxy test passed"
    else
        log_warning "Nginx proxy test failed (may need manual configuration)"
    fi
    
    if [ "$all_tests_passed" = true ]; then
        log_success "All critical tests passed"
    else
        log_error "Some critical tests failed"
        return 1
    fi
}

# Function to show deployment status
show_deployment_status() {
    log "=== Deployment Status ==="
    
    echo ""
    log "Application Status (PM2):"
    pm2 list
    
    echo ""
    log "System Services Status:"
    echo "Nginx: $(systemctl is-active nginx)"
    
    echo ""
    log "Application URLs:"
    echo "  Frontend (Nginx): http://localhost:$NGINX_PORT"
    echo "  Frontend (Direct): http://localhost:$APP_PORT"
    echo "  Server IP: http://$(hostname -I | awk '{print $1}'):$NGINX_PORT"
    
    echo ""
    log "Configuration Files:"
    echo "  Environment: $PROJECT_ROOT/.env"
    echo "  PM2 Config: $PROJECT_ROOT/ecosystem.config.js"
    echo "  Nginx Config: /etc/nginx/sites-available/iot-dashboard"
    
    echo ""
    log "Useful Commands:"
    echo "  View app logs: pm2 logs $APP_NAME"
    echo "  Restart app: pm2 restart $APP_NAME"
    echo "  Monitor PM2: pm2 monit"
    echo "  Reload Nginx: sudo systemctl reload nginx"
    echo "  View Nginx logs: sudo tail -f /var/log/nginx/error.log"
    
    echo ""
    log_success "IoT Dashboard deployment completed successfully!"
    log_warning "Make sure your MQTT broker is running on the configured host:port"
}

# Main deployment function
main() {
    log "=== IoT Dashboard Deployment Script ==="
    log "Project Root: $PROJECT_ROOT"
    log "App Port: $APP_PORT"
    log "Nginx Port: $NGINX_PORT"
    
    # Step 1: Check and install dependencies
    if ! check_dependencies; then
        log "Installing missing dependencies..."
        install_dependencies
        
        # Verify installation
        if ! check_dependencies; then
            log_error "Failed to install all dependencies. Please check manually."
            exit 1
        fi
    fi
    
    # Step 2: Configure environment
    configure_environment
    
    # Step 3: Install application dependencies
    install_app_dependencies
    
    # Step 4: Build application
    build_application
    
    # Step 5: Create PM2 configuration
    create_pm2_config
    
    # Step 6: Start application with PM2
    start_pm2_application
    
    # Step 7: Setup Nginx
    setup_nginx
    
    # Step 8: Verify deployment
    if verify_deployment; then
        log_success "Deployment verification passed"
    else
        log_warning "Some verification tests failed, but deployment may still be functional"
    fi
    
    # Step 9: Show deployment status
    show_deployment_status
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi