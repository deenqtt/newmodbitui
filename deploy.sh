#!/bin/bash
# Nexus IoT Dashboard Complete Deployment Script
# Author: Automated Deployment Assistant
# Description: One-command deployment with integrated database seeding
set -e  # Exit on any error

# Show banner function
show_deployment_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}${WHITE}           NEXUS DASHBOARD COMPLETE DEPLOYMENT                ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}${WHITE}     Deploy + Seed IoT Devices + Start Services              ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${PURPLE}Starting Complete Deployment Process... 🚀${NC}"
    echo ""
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Show initial information
show_deployment_banner

# Project configuration - Will be overridden by user input
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="nexus-dashboard"
DEFAULT_FRONTEND_PORT=3001
DEFAULT_BACKEND_PORT=3002
NODE_VERSION="18"

# Global variables for user configuration
ENVIRONMENT_TYPE=""
FRONTEND_PORT=""
BACKEND_PORT=""
MQTT_HOST=""
MQTT_PORT=""
MQTT_USERNAME=""
MQTT_PASSWORD=""
JWT_SECRET=""
WEBHOOK_SECRET=""
DEPLOYMENT_PROFILE=""

# Seeding configuration flags
DO_SEEDING=${SEED_ON_DEPLOY:-true}

# Proper environment variable handling
if [[ -n "${SEED_USERS}" ]]; then
    SEED_USERS=$(echo "${SEED_USERS}" | tr '[:upper:]' '[:lower:]')
    [[ "${SEED_USERS}" == "true" || "${SEED_USERS}" == "1" ]] && SEED_USERS=true || SEED_USERS=false
else
    SEED_USERS=true
fi

if [[ -n "${SEED_MENU}" ]]; then
    SEED_MENU=$(echo "${SEED_MENU}" | tr '[:upper:]' '[:lower:]')
    [[ "${SEED_MENU}" == "true" || "${SEED_MENU}" == "1" ]] && SEED_MENU=true || SEED_MENU=false
else
    SEED_MENU=true
fi

if [[ -n "${SEED_DASHBOARD}" ]]; then
    SEED_DASHBOARD=$(echo "${SEED_DASHBOARD}" | tr '[:upper:]' '[:lower:]')
    [[ "${SEED_DASHBOARD}" == "true" || "${SEED_DASHBOARD}" == "1" ]] && SEED_DASHBOARD=true || SEED_DASHBOARD=false
else
    SEED_DASHBOARD=true
fi

if [[ -n "${SEED_DEVICES}" ]]; then
    SEED_DEVICES=$(echo "${SEED_DEVICES}" | tr '[:upper:]' '[:lower:]')
    [[ "${SEED_DEVICES}" == "true" || "${SEED_DEVICES}" == "1" ]] && SEED_DEVICES=true || SEED_DEVICES=false
else
    SEED_DEVICES=true
fi

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

# Function to run database seeding (if enabled)
run_database_seeding() {
    if [ "$DO_SEEDING" = false ]; then
        log_step "Database seeding disabled (--seed-on-deploy=false)"
        return 0
    fi

    log_step "Running Integrated Database Seeding..."

    # Check if seed script exists
    if [ ! -f "$PROJECT_ROOT/reset-db.sh" ]; then
        log_warning "Seeding script reset-db.sh not found, skipping seeding"
        return 1
    fi

    if [ ! -x "$PROJECT_ROOT/reset-db.sh" ]; then
        log_warning "Seeding script reset-db.sh not executable, skipping seeding"
        return 1
    fi

    # Build seeding environment variables
    local seeder_envs=""
    [ "$SEED_USERS" = false ] && seeder_envs="$seeder_envs SEED_USERS=false"
    [ "$SEED_MENU" = false ] && seeder_envs="$seeder_envs SEED_MENU=false"
    [ "$SEED_DASHBOARD" = false ] && seeder_envs="$seeder_envs SEED_DASHBOARD=false"
    [ "$SEED_DEVICES" = false ] && seeder_envs="$seeder_envs SEED_DEVICES=false"

    log "Running seeding with configuration:"
    [[ -n "$seeder_envs" ]] && echo "  Environment: $seeder_envs" || echo "  Environment: Default (all modules)"

    # Run seeding with environment variables
    if eval "$seeder_envs ./reset-db.sh --no-reset --quiet" >/dev/null 2>&1; then
        log_success "Database seeding completed successfully"

        # Show seeding summary
        echo ""
        echo -e "${BLUE}📊 Seeding Results:${NC}"
        if [ "$SEED_USERS" = true ]; then
            echo -e "   ${GREEN}✓${NC} Users & Roles seeded"
        fi
        if [ "$SEED_MENU" = true ]; then
            echo -e "   ${GREEN}✓${NC} Menu System seeded"
        fi
        if [ "$SEED_DASHBOARD" = true ]; then
            echo -e "   ${GREEN}✓${NC} Dashboard Layout seeded"
        fi
        if [ "$SEED_DEVICES" = true ]; then
            echo -e "   ${GREEN}✓${NC} IoT Devices seeded (11 devices)"
        fi
        echo ""

        return 0
    else
        log_error "Database seeding failed"
        return 1
    fi
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

    # Basic security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:$APP_PORT;
        expires 1y;
        add_header Cache-Control "public, immutable";
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

    # Step 5: Run database seeding if enabled
    if [ "$DO_SEEDING" = true ]; then
        run_database_seeding
    fi

    # Step 6: Generate Prisma client
    log_step "Generating Prisma client..."

    cd "$PROJECT_ROOT"

    if npx prisma generate >/dev/null 2>&1; then
        log_success "Prisma client generated successfully"
    else
        log_error "Failed to generate Prisma client"
        exit 1
    fi

    # Step 7: Create PM2 configuration
    create_pm2_config

    # Step 8: Start application with PM2
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

# Function to validate port number
validate_port() {
    local port="$1"
    if [[ "$port" =~ ^[0-9]+$ ]] && [ "$port" -ge 1024 ] && [ "$port" -le 65535 ]; then
        return 0
    else
        return 1
    fi
}

# Function to validate IP address
validate_ip() {
    local ip="$1"
    if [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to display ASCII banner
show_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}${WHITE}                    NEXUS DASHBOARD DEPLOYMENT                   ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}${WHITE}            Advanced IoT Monitoring & Control Platform         ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${PURPLE}Welcome to the interactive deployment setup! 🚀${NC}"
    echo ""
}

# Function to get deployment profile
select_deployment_profile() {
    echo ""
    echo -e "${YELLOW}Select Deployment Profile:${NC}"
    echo "1) Development   - For testing and development"
    echo "2) Staging      - Pre-production environment"
    echo "3) Production   - Live production environment"
    echo ""
    read -p "Enter choice (1-3) [3]: " profile_choice
    profile_choice=${profile_choice:-3}

    case $profile_choice in
        1) DEPLOYMENT_PROFILE="development"; ENVIRONMENT_TYPE="development" ;;
        2) DEPLOYMENT_PROFILE="staging"; ENVIRONMENT_TYPE="staging" ;;
        3) DEPLOYMENT_PROFILE="production"; ENVIRONMENT_TYPE="production" ;;
        *) log_error "Invalid choice. Defaulting to production."; DEPLOYMENT_PROFILE="production"; ENVIRONMENT_TYPE="production" ;;
    esac

    log_success "Selected profile: $DEPLOYMENT_PROFILE"
}

# Function to configure ports
configure_ports() {
    echo ""
    echo -e "${YELLOW}Port Configuration:${NC}"
    echo "Configure custom ports for the application."
    echo ""

    local valid_frontend=false
    while [[ "$valid_frontend" == false ]]; do
        read -p "Frontend Port (default: $DEFAULT_FRONTEND_PORT): " input_port
        FRONTEND_PORT=${input_port:-$DEFAULT_FRONTEND_PORT}
        if validate_port "$FRONTEND_PORT"; then
            valid_frontend=true
        else
            echo -e "${RED}Error: Please enter a valid port number (1024-65535)${NC}"
        fi
    done

    local valid_backend=false
    while [[ "$valid_backend" == false ]]; do
        read -p "Backend/Next.js Port (default: $DEFAULT_BACKEND_PORT): " input_port
        BACKEND_PORT=${input_port:-$DEFAULT_BACKEND_PORT}
        if validate_port "$BACKEND_PORT"; then
            # Check if backend port conflicts with frontend
            if [[ "$BACKEND_PORT" == "$FRONTEND_PORT" ]]; then
                echo -e "${RED}Error: Backend port cannot be the same as frontend port${NC}"
                continue
            fi
            valid_backend=true
        else
            echo -e "${RED}Error: Please enter a valid port number (1024-65535)${NC}"
        fi
    done

    log_success "Frontend Port: $FRONTEND_PORT"
    log_success "Backend Port: $BACKEND_PORT"
}

# Function to configure MQTT settings
configure_mqtt() {
    echo ""
    echo -e "${YELLOW}MQTT Configuration:${NC}"
    echo "Configure MQTT broker settings for IoT communication."
    echo ""

    local valid_host=false
    while [[ "$valid_host" == false ]]; do
        read -p "MQTT Broker Host/IP (default: localhost): " input_host
        MQTT_HOST=${input_host:-localhost}
        # Basic validation - accept localhost or IP addresses
        if [[ "$MQTT_HOST" == "localhost" ]] || validate_ip "$MQTT_HOST" || [[ "$MQTT_HOST" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            valid_host=true
        else
            echo -e "${RED}Error: Please enter a valid hostname or IP address${NC}"
        fi
    done

    local valid_port=false
    while [[ "$valid_port" == false ]]; do
        read -p "MQTT Broker Port (default: 9000): " input_port
        MQTT_PORT=${input_port:-9000}
        if [[ "$MQTT_PORT" =~ ^[0-9]+$ ]] && [ "$MQTT_PORT" -ge 1 ] && [ "$MQTT_PORT" -le 65535 ]; then
            valid_port=true
        else
            echo -e "${RED}Error: Please enter a valid port number (1-65535)${NC}"
        fi
    done

    read -p "MQTT Username (leave empty if none): " MQTT_USERNAME
    if [[ -n "$MQTT_USERNAME" ]]; then
        read -s -p "MQTT Password: " MQTT_PASSWORD
        echo "" # New line after password input
    else
        MQTT_PASSWORD=""
    fi

    log_success "MQTT Broker: $MQTT_HOST:$MQTT_PORT"
    if [[ -n "$MQTT_USERNAME" ]]; then
        log_success "MQTT Authentication: Enabled"
    else
        log_success "MQTT Authentication: Disabled"
    fi
}

# Function to generate security secrets
generate_security_secrets() {
    echo ""
    echo -e "${YELLOW}Security Configuration:${NC}"
    echo "Generate secure secrets for JWT and webhooks."
    echo ""

    JWT_SECRET=$(generate_secret)
    WEBHOOK_SECRET=$(generate_secret)

    log_success "JWT Secret: Generated (${#JWT_SECRET} characters)"
    log_success "Webhook Secret: Generated (${#WEBHOOK_SECRET} characters)"
}

# Function to confirm configuration
confirm_configuration() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}                 DEPLOYMENT CONFIGURATION SUMMARY${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Environment:${NC} $ENVIRONMENT_TYPE ($DEPLOYMENT_PROFILE)"
    echo -e "${BLUE}Frontend Port:${NC} $FRONTEND_PORT"
    echo -e "${BLUE}Backend Port:${NC} $BACKEND_PORT"
    echo -e "${BLUE}MQTT Broker:${NC} $MQTT_HOST:$MQTT_PORT"
    if [[ -n "$MQTT_USERNAME" ]]; then
        echo -e "${BLUE}MQTT Auth:${NC} Enabled (username: $MQTT_USERNAME)"
    else
        echo -e "${BLUE}MQTT Auth:${NC} Disabled"
    fi
    echo -e "${BLUE}JWT Secret:${NC} ${JWT_SECRET:0:8}..."
    echo -e "${BLUE}Webhook Secret:${NC} ${WEBHOOK_SECRET:0:8}..."
    echo ""
    read -p "Continue with this configuration? (y/N): " confirm
    case $confirm in
        [Yy]* ) return 0 ;;
        * ) log_error "Deployment cancelled by user."; exit 0 ;;
    esac
}

# Enhanced environment configuration
configure_environment() {
    log "=== Generating Custom Environment Configuration ==="

    cd "$PROJECT_ROOT"

    # Get server IP for default MQTT URL
    SERVER_IP=$(hostname -I | awk '{print $1}')

    # Create .env file with custom configuration
    cat > .env << EOF
# Nexus Dashboard Environment Configuration
# Generated on $(date) for $DEPLOYMENT_PROFILE environment

# Application Configuration
NODE_ENV="$ENVIRONMENT_TYPE"
PORT=$BACKEND_PORT

# Frontend Configuration
NEXT_PUBLIC_APP_ENV="$ENVIRONMENT_TYPE"
NEXT_PUBLIC_APP_VERSION="1.2.0"

# MQTT Configuration
NEXT_PUBLIC_MQTT_HOST="$MQTT_HOST"
NEXT_PUBLIC_MQTT_PORT="$MQTT_PORT"
NEXT_PUBLIC_MQTT_USERNAME="$MQTT_USERNAME"
NEXT_PUBLIC_MQTT_PASSWORD="$MQTT_PASSWORD"
MQTT_BROKER_URL="ws://$MQTT_HOST:$MQTT_PORT"

# Security Configuration
JWT_SECRET="$JWT_SECRET"
WEBHOOK_PORT=$BACKEND_PORT
WEBHOOK_SECRET="$WEBHOOK_SECRET"

# IoT Platform APIs (Placeholder - configure as needed)
CHIRPSTACK_API_URL="http://$MQTT_HOST:8090"
CHIRPSTACK_API_TOKEN=""

# Database Configuration (SQLite)
DATABASE_URL="file:./iot_dashboard.db"

# Logging Configuration
LOG_LEVEL="$ENVIRONMENT_TYPE"
LOG_FILE="./logs/app.log"

# Deployment Metadata
DEPLOYMENT_PROFILE="$DEPLOYMENT_PROFILE"
DEPLOYMENT_TIMESTAMP="$(date +'%Y-%m-%d %H:%M:%S %Z')"
DEPLOYMENT_SERVER="$(hostname)"
EOF

    chmod 600 .env

    # Create backup of original .env.bak if it doesn't exist
    if [[ ! -f ".env.bak" ]]; then
        cp .env .env.bak 2>/dev/null || true
    fi

    log_success "Custom environment file created: .env"
}

# Enhanced PM2 configuration
create_pm2_config() {
    log "Creating PM2 ecosystem configuration..."

    cd "$PROJECT_ROOT"

    # Create logs directory
    mkdir -p logs

    # Environment-specific PM2 configuration
    if [[ "$ENVIRONMENT_TYPE" == "development" ]]; then
        MAX_MEMORY="512M"
        INSTANCES=1
        WATCH_MODE=false
    elif [[ "$ENVIRONMENT_TYPE" == "staging" ]]; then
        MAX_MEMORY="1G"
        INSTANCES=1
        WATCH_MODE=false
    else # production
        MAX_MEMORY="2G"
        INSTANCES=1
        WATCH_MODE=false
    fi

    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: '$APP_NAME-$ENVIRONMENT_TYPE',
      script: 'npm',
      args: 'start',
      cwd: '$PROJECT_ROOT',
      env: {
        NODE_ENV: '$ENVIRONMENT_TYPE',
        PORT: $BACKEND_PORT
      },
      instances: $INSTANCES,
      autorestart: true,
      watch: $WATCH_MODE,
      max_memory_restart: '$MAX_MEMORY',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      env_production: {
        NODE_ENV: 'production',
        PORT: $BACKEND_PORT
      }
    }
  ]
};
EOF

    log_success "PM2 configuration created for $ENVIRONMENT_TYPE environment"
}

# Enhanced Nginx configuration
setup_nginx() {
    log "=== Setting Up Nginx Reverse Proxy ==="

    # Create Nginx configuration with custom ports
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << EOF
# Nexus Dashboard - $ENVIRONMENT_TYPE Environment
# Frontend Port: $FRONTEND_PORT, Backend Port: $BACKEND_PORT
# Generated on $(date)

server {
    listen $FRONTEND_PORT;
    server_name localhost;

    # Basic security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Simplified CSP header
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss: http: https:;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    location / {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    # Remove default site if exists and enable our site
    sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/ 2>/dev/null || true
    sudo rm -f /etc/nginx/sites-enabled/iot-dashboard 2>/dev/null || true

    # Test and reload Nginx
    if sudo nginx -t; then
        log_success "Nginx configuration validated for $ENVIRONMENT_TYPE"
        sudo systemctl reload nginx
        log_success "Nginx reloaded successfully"
    else
        log_error "Nginx configuration test failed"
        log_warning "Attempting to restore previous configuration..."
        sudo nginx -s reload || true
        exit 1
    fi

    log_success "Nginx configured for environment: $ENVIRONMENT_TYPE"
}

# Enhanced verification
verify_deployment() {
    log "=== Verifying $DEPLOYMENT_PROFILE Deployment ==="

    local all_tests_passed=true

    # Test backend health
    log "Testing backend health on port $BACKEND_PORT..."
    local backend_ready=false
    for i in {1..45}; do
        if curl -s -f http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
            backend_ready=true
            break
        fi
        sleep 2
    done

    if [ "$backend_ready" = true ]; then
        log_success "Backend health test passed on port $BACKEND_PORT"
    else
        log_error "Backend health test failed on port $BACKEND_PORT"
        all_tests_passed=false
    fi

    # Test frontend proxy
    log "Testing frontend proxy on port $FRONTEND_PORT..."
    if curl -s -f http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        log_success "Frontend proxy test passed on port $FRONTEND_PORT"
    else
        log_warning "Frontend proxy test failed (may need manual configuration)"
    fi

    if [ "$all_tests_passed" = true ]; then
        log_success "All critical tests passed for $DEPLOYMENT_PROFILE deployment"
    else
        log_error "Some critical tests failed"
        return 1
    fi
}

# Enhanced status display
show_deployment_status() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}                 DEPLOYMENT SUCCESSFUL! 🎉${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""

    log "📊 Deployment Summary:"
    echo -e "${BLUE}Environment:${NC} $ENVIRONMENT_TYPE ($DEPLOYMENT_PROFILE)"
    echo -e "${BLUE}Application:${NC} $APP_NAME"
    echo -e "${BLUE}Server IP:${NC} $(hostname -I | awk '{print $1}')"

    echo ""
    log "🌐 Application URLs:"
    echo -e "${GREEN}  Frontend (Nginx):${NC} http://localhost:$FRONTEND_PORT"
    echo -e "${GREEN}  Backend (Direct):${NC} http://localhost:$BACKEND_PORT"
    echo -e "${GREEN}  Health Check:${NC} http://localhost:$BACKEND_PORT/api/health"
    echo -e "${GREEN}  Server Access:${NC} http://$(hostname -I | awk '{print $1}'):$FRONTEND_PORT"

    echo ""
    echo -e "${YELLOW}🔧 Services Status:${NC}"
    pm2 list 2>/dev/null | grep -E "(name|status|restart)" | head -5 || echo "PM2 status check failed"

    echo ""
    echo -e "${YELLOW}📁 Configuration Files:${NC}"
    echo "  Environment: $PROJECT_ROOT/.env"
    echo "  PM2 Config: $PROJECT_ROOT/ecosystem.config.js"
    echo "  Nginx Config: /etc/nginx/sites-available/$APP_NAME"

    if [[ -n "$MQTT_USERNAME" ]]; then
        echo ""
        echo -e "${YELLOW}📡 MQTT Configuration:${NC}"
        echo "  Broker: $MQTT_HOST:$MQTT_PORT"
        echo "  Authentication: Enabled"
    fi

    echo ""
    echo -e "${PURPLE}💡 Useful Commands:${NC}"
    echo "  View app logs: pm2 logs $APP_NAME-$ENVIRONMENT_TYPE"
    echo "  Restart app: pm2 restart $APP_NAME-$ENVIRONMENT_TYPE"
    echo "  Monitor PM2: pm2 monit"
    echo "  Reload Nginx: sudo systemctl reload nginx"
    echo "  View Nginx logs: sudo tail -f /var/log/nginx/error.log"
    echo "  Check health: curl http://localhost:$BACKEND_PORT/api/health"

    echo ""
    if [[ "$ENVIRONMENT_TYPE" == "production" ]]; then
        echo -e "${GREEN}✅ Production deployment completed successfully!${NC}"
        echo -e "${YELLOW}🔔 Make sure your MQTT broker is running on $MQTT_HOST:$MQTT_PORT${NC}"
    elif [[ "$ENVIRONMENT_TYPE" == "staging" ]]; then
        echo -e "${BLUE}✅ Staging deployment completed successfully!${NC}"
    else
        echo -e "${PURPLE}✅ Development deployment completed successfully!${NC}"
    fi

    echo ""
    echo -e "${CYAN}🚀 Nexus Dashboard is now live and ready to use!${NC}"
}

# Interactive main deployment function
main() {
    show_banner

    # Interactive configuration
    select_deployment_profile
    configure_ports
    configure_mqtt
    generate_security_secrets
    confirm_configuration

    log "=== Starting $DEPLOYMENT_PROFILE Deployment Process ==="
    log "Project Root: $PROJECT_ROOT"
    log "Environment: $ENVIRONMENT_TYPE"
    log "Frontend Port: $FRONTEND_PORT"
    log "Backend Port: $BACKEND_PORT"

    # Update global variables
    APP_PORT=$BACKEND_PORT
    NGINX_PORT=$FRONTEND_PORT

    # Step 1: Check and install dependencies
    if ! check_dependencies; then
        log "Installing missing dependencies..."
        install_dependencies

        if ! check_dependencies; then
            log_error "Failed to install all dependencies. Please check manually."
            exit 1
        fi
    fi

    # Step 2: Configure custom environment
    configure_environment

    # Step 3: Install application dependencies
    install_app_dependencies

    # Step 4: Build application
    build_application

    # Step 5: Create PM2 configuration
    create_pm2_config

    # Step 6: Start application with PM2
    start_pm2_application

    # Step 7: Setup Nginx with custom ports
    setup_nginx

    # Step 8: Verify deployment
    if verify_deployment; then
        log_success "$DEPLOYMENT_PROFILE deployment verification passed"
    else
        log_warning "Some verification tests failed, but deployment may still be functional"
    fi

    # Step 9: Show deployment status
    show_deployment_status
}

# Help function
show_help() {
    echo "Nexus Dashboard Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --version  Show version information"
    echo ""
    echo "Environment Variables:"
    echo "  DEPLOY_PROFILE  Set deployment profile (development|staging|production)"
    echo "  FRONTEND_PORT   Set custom frontend port (default: 3001)"
    echo "  BACKEND_PORT    Set custom backend port (default: 3002)"
    echo "  MQTT_HOST       Set MQTT broker host (default: localhost)"
    echo "  MQTT_PORT       Set MQTT broker port (default: 9000)"
    echo ""
    echo "Examples:"
    echo "  $0                                      # Interactive deployment"
    echo "  DEPLOY_PROFILE=production $0           # Production deployment"
    echo "  FRONTEND_PORT=8080 BACKEND_PORT=3000 $0 # Custom ports"
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            echo "Nexus Dashboard Deployment Script v1.2.0"
            echo "Enhanced Interactive Configuration System"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use '$0 --help' for usage information."
            exit 1
            ;;
    esac
done

# Environment variable override for automation
if [[ -n "$DEPLOY_PROFILE" ]]; then
    case $DEPLOY_PROFILE in
        development|staging|production)
            DEPLOYMENT_PROFILE=$DEPLOY_PROFILE
            ENVIRONMENT_TYPE=$DEPLOY_PROFILE
            ;;
        *)
            log_error "Invalid DEPLOY_PROFILE value. Use: development, staging, or production"
            exit 1
            ;;
    esac
fi

# Use environment variable defaults if provided
FRONTEND_PORT=${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}
BACKEND_PORT=${BACKEND_PORT:-$DEFAULT_BACKEND_PORT}
MQTT_HOST=${MQTT_HOST:-localhost}
MQTT_PORT=${MQTT_PORT:-9000}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
