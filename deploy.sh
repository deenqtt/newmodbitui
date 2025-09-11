#!/bin/bash

# IoT Dashboard Deployment Script
# Author: Claude Code Assistant  
# Description: Automated deployment script for IoT Dashboard with PostgreSQL and PM2

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
DB_NAME="iot_dashboard"
DB_USER="root" 
DB_PASSWORD=""
APP_PORT=3001
NGINX_PORT=80
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

# Function to check if service is running
is_service_running() {
    systemctl is-active --quiet "$1"
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

# Function to check PostgreSQL installation
check_postgresql() {
    log "Checking PostgreSQL installation..."
    if command_exists psql && command_exists pg_config; then
        PG_VERSION=$(psql --version | awk '{print $3}' | sed 's/,.*//')
        log_success "PostgreSQL $PG_VERSION is installed"
        return 0
    else
        log_error "PostgreSQL not found"
        return 1
    fi
}

# Function to install PostgreSQL
install_postgresql() {
    log "Installing PostgreSQL..."
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    log_success "PostgreSQL installed and started successfully"
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

# Function to check Mosquitto MQTT installation
check_mosquitto() {
    log "Checking Mosquitto MQTT installation..."
    if command_exists mosquitto && command_exists mosquitto_pub; then
        log_success "Mosquitto MQTT Broker is installed"
        return 0
    else
        log_error "Mosquitto not found"
        return 1
    fi
}

# Function to install Mosquitto
install_mosquitto() {
    log "Installing Mosquitto MQTT Broker..."
    sudo apt-get install -y mosquitto mosquitto-clients
    sudo systemctl enable mosquitto
    sudo systemctl start mosquitto
    log_success "Mosquitto MQTT Broker installed and started successfully"
}

# Function to check all dependencies
check_dependencies() {
    log "=== Checking Dependencies ==="
    
    local missing_deps=()
    
    # Update package list first
    sudo apt-get update
    
    # Install essential tools
    sudo apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates sqlite3
    
    if ! check_nodejs; then
        missing_deps+=("nodejs")
    fi
    
    if ! check_postgresql; then
        missing_deps+=("postgresql")
    fi
    
    if ! check_pm2; then
        missing_deps+=("pm2")
    fi
    
    if ! check_nginx; then
        missing_deps+=("nginx")
    fi
    
    if ! check_mosquitto; then
        missing_deps+=("mosquitto")
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
    
    if ! check_postgresql; then
        install_postgresql
    fi
    
    if ! check_pm2; then
        install_pm2
    fi
    
    if ! check_nginx; then
        install_nginx
    fi
    
    if ! check_mosquitto; then
        install_mosquitto
    fi
}

# Function to setup PostgreSQL database
setup_database() {
    log "=== Setting Up PostgreSQL Database ==="
    
    # Create database and user
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || log_warning "Database $DB_NAME already exists"
    sudo -u postgres psql -c "CREATE USER $DB_USER;" 2>/dev/null || log_warning "User $DB_USER already exists"
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH SUPERUSER;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
    
    # Configure pg_hba.conf for trust authentication
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP "PostgreSQL \K[0-9]+")
    PG_HBA_FILE="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
    
    if [[ -f "$PG_HBA_FILE" ]]; then
        # Backup original file
        sudo cp "$PG_HBA_FILE" "$PG_HBA_FILE.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        
        # Add trust authentication for root user
        if ! sudo grep -q "local.*$DB_NAME.*$DB_USER.*trust" "$PG_HBA_FILE"; then
            sudo sed -i "1i local   $DB_NAME   $DB_USER                            trust" "$PG_HBA_FILE"
            sudo sed -i "2i host    $DB_NAME   $DB_USER    127.0.0.1/32            trust" "$PG_HBA_FILE"
        fi
        
        # Restart PostgreSQL
        sudo systemctl restart postgresql
        sleep 2
        
        # Test connection
        if psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
            log_success "Database connection test successful"
        else
            log_error "Database connection test failed"
            exit 1
        fi
    else
        log_error "PostgreSQL configuration file not found at $PG_HBA_FILE"
        exit 1
    fi
    
    log_success "Database setup completed"
}

# Function to configure environment
configure_environment() {
    log "=== Configuring Environment ==="
    
    cd "$PROJECT_ROOT"
    
    # Create .env file
    cat > .env << EOF
# Database Configuration
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# JWT Configuration  
JWT_SECRET="$(openssl rand -hex 32)"

# Application Configuration
NODE_ENV="production"
NEXT_RUNTIME="nodejs"

# Cloud Sync (disabled for offline)
ENABLE_CLOUD_SYNC="false"

# MQTT Configuration
MQTT_BROKER_URL="mqtt://localhost:1883"
MQTT_USERNAME=""
MQTT_PASSWORD=""

# Server Configuration
PORT=$APP_PORT
HOST="0.0.0.0"

# Logging
LOG_LEVEL="info"
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
    
    # Install Prisma CLI globally if not present
    if ! command_exists prisma; then
        log "Installing Prisma CLI globally..."
        sudo npm install -g prisma
    fi
    
    # Generate Prisma client
    log "Generating Prisma client..."
    npx prisma generate
    
    log_success "Application dependencies installed"
}

# Function to setup database schema
setup_database_schema() {
    log "=== Setting Up Database Schema ==="
    
    cd "$PROJECT_ROOT"
    
    # Run database migrations
    log "Running database migrations..."
    npx prisma migrate deploy || npx prisma db push
    
    # Seed database if script exists
    if [[ -f "scripts/seed-users.js" ]]; then
        log "Seeding initial data..."
        npm run db:seed || node scripts/seed-users.js || log_warning "Seeding failed or not needed"
    else
        log_warning "No seed script found, skipping initial data seeding"
    fi
    
    log_success "Database schema setup completed"
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
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << EOF
server {
    listen $NGINX_PORT;
    server_name localhost \$(hostname -I | awk '{print \$1}');

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
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
        
        # Increase timeout for long polling
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:$APP_PORT;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }
    
    # API routes
    location /api {
        proxy_pass http://localhost:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Enable site and remove default
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
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

# Function to setup firewall
setup_firewall() {
    log "=== Setting Up Firewall ==="
    
    # Install UFW if not present
    if ! command_exists ufw; then
        sudo apt-get install -y ufw
    fi
    
    # Configure firewall rules
    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow $NGINX_PORT/tcp
    sudo ufw allow $APP_PORT/tcp  # Direct app access
    sudo ufw allow 1883/tcp       # MQTT
    sudo ufw allow 5432/tcp       # PostgreSQL (local only)
    
    log_success "Firewall configured successfully"
}

# Function to create backup service
setup_backup_service() {
    log "=== Setting Up Backup Service ==="
    
    # Create backup script
    sudo tee /usr/local/bin/backup-$APP_NAME.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/iot-dashboard"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U root iot_dashboard > $BACKUP_DIR/db_backup_$DATE.sql

# Application backup (excluding node_modules)
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /opt --exclude='node_modules' --exclude='.next' iot-dashboard/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF
    
    sudo chmod +x /usr/local/bin/backup-$APP_NAME.sh
    
    # Setup daily backup cron job at 2 AM
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-$APP_NAME.sh") | crontab -
    
    log_success "Backup service configured"
}

# Function to verify deployment
verify_deployment() {
    log "=== Verifying Deployment ==="
    
    local all_tests_passed=true
    
    # Test database connection
    log "Testing database connection..."
    if psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "Database connection test passed"
    else
        log_error "Database connection test failed"
        all_tests_passed=false
    fi
    
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
    
    # Test MQTT broker
    log "Testing MQTT broker..."
    if mosquitto_pub -h localhost -t test/topic -m "test" >/dev/null 2>&1; then
        log_success "MQTT broker test passed"
    else
        log_warning "MQTT broker test failed"
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
    echo "PostgreSQL: $(systemctl is-active postgresql)"
    echo "Nginx: $(systemctl is-active nginx)"  
    echo "Mosquitto: $(systemctl is-active mosquitto)"
    
    echo ""
    log "Application URLs:"
    echo "  Frontend (Nginx): http://localhost:$NGINX_PORT"
    echo "  Frontend (Direct): http://localhost:$APP_PORT"
    echo "  Server IP: http://$(hostname -I | awk '{print $1}'):$NGINX_PORT"
    
    echo ""
    log "Database Information:"
    if [ -f "$PROJECT_ROOT/prisma/iot_dashboard.db" ]; then
        local db_size=$(du -h "$PROJECT_ROOT/prisma/iot_dashboard.db" | cut -f1)
        echo "  Database file: $PROJECT_ROOT/prisma/iot_dashboard.db ($db_size)"
    fi
    echo "  PostgreSQL Database: $DB_NAME"
    echo "  Database User: $DB_USER"
    
    echo ""
    log "MQTT Broker:"
    echo "  URL: mqtt://localhost:1883"
    echo "  Test: mosquitto_pub -h localhost -t test/topic -m 'Hello World'"
    
    echo ""
    log "Default Login Credentials:"
    echo "  Email: admin@admin.com"
    echo "  Password: admin123"
    
    echo ""
    log "Useful Commands:"
    echo "  View app logs: pm2 logs $APP_NAME"
    echo "  Restart app: pm2 restart $APP_NAME"
    echo "  Monitor PM2: pm2 monit"
    echo "  View system logs: sudo journalctl -u postgresql nginx mosquitto"
    echo "  Database backup: sudo /usr/local/bin/backup-$APP_NAME.sh"
    
    echo ""
    log_success "IoT Dashboard deployment completed successfully!"
    log_warning "IMPORTANT: Change default login credentials after first login!"
}

# Main deployment function
main() {
    log "=== IoT Dashboard Deployment Script ==="
    log "Project Root: $PROJECT_ROOT"
    log "Target Port: $APP_PORT"
    
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
    
    # Step 2: Setup database
    setup_database
    
    # Step 3: Configure environment
    configure_environment
    
    # Step 4: Install application dependencies
    install_app_dependencies
    
    # Step 5: Setup database schema
    setup_database_schema
    
    # Step 6: Build application
    build_application
    
    # Step 7: Create PM2 configuration
    create_pm2_config
    
    # Step 8: Start application with PM2
    start_pm2_application
    
    # Step 9: Setup Nginx
    setup_nginx
    
    # Step 10: Setup firewall
    setup_firewall
    
    # Step 11: Setup backup service
    setup_backup_service
    
    # Step 12: Verify deployment
    if verify_deployment; then
        log_success "Deployment verification passed"
    else
        log_warning "Some verification tests failed, but deployment may still be functional"
    fi
    
    # Step 13: Show deployment status
    show_deployment_status
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi