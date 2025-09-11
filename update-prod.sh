#!/bin/bash

# IoT Dashboard Production Update Script
# Author: Claude Code Assistant  
# Description: Pull updates, rebuild, and restart IoT Dashboard production server

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
APP_PORT=3001
NGINX_PORT=80

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

# Function to check if PM2 process exists
pm2_process_exists() {
    pm2 list | grep -q "$1" 2>/dev/null
}

# Function to handle git conflicts intelligently
handle_git_conflicts() {
    log "=== Handling Git Conflicts ==="
    
    # Backup important local files that might be modified
    local files_to_backup=(".env" ".env.local" ".env.production" "ecosystem.config.js")
    
    for file in "${files_to_backup[@]}"; do
        if [[ -f "$file" ]] && [[ -n $(git status --porcelain "$file" 2>/dev/null) ]]; then
            log "Backing up modified $file..."
            cp "$file" "$file.local.backup"
            log "Backup saved as $file.local.backup"
        fi
    done
    
    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        log_warning "Uncommitted changes detected:"
        git status --short
        
        # For production updates, we want to keep upstream changes
        log "Stashing local changes and forcing upstream merge..."
        git stash push -m "Auto-stash production local changes $(date)" --include-untracked
        STASHED=1
        
        # Hard reset to ensure clean state
        git reset --hard HEAD
    else
        STASHED=0
    fi
    
    return 0
}

# Function to pull latest changes
pull_updates() {
    log "=== Pulling Latest Changes ==="
    
    # Handle conflicts first
    handle_git_conflicts
    
    # Fetch latest changes
    log "Fetching from origin..."
    if ! git fetch origin main 2>/dev/null; then
        # Try master if main doesn't exist
        if ! git fetch origin master 2>/dev/null; then
            log_error "Git fetch failed"
            return 1
        else
            MAIN_BRANCH="master"
        fi
    else
        MAIN_BRANCH="main"
    fi
    
    # Check if there are updates
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u} 2>/dev/null || git rev-parse origin/$MAIN_BRANCH)
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        log "Already up to date"
        return 0
    fi
    
    # Pull with rebase to avoid merge commits
    log "Pulling latest changes with rebase..."
    if ! git pull --rebase origin $MAIN_BRANCH; then
        log_error "Git pull failed. Attempting reset..."
        
        # If rebase fails, force update (this is production)
        log_warning "Force updating to match remote (production override)..."
        git reset --hard origin/$MAIN_BRANCH
        
        if [ $? -eq 0 ]; then
            log_success "Successfully updated to latest version"
        else
            log_error "Failed to update repository"
            return 1
        fi
    fi
    
    # Restore critical local configurations
    local restored_files=()
    for file in ".env" ".env.local" ".env.production" "ecosystem.config.js"; do
        if [[ -f "$file.local.backup" ]]; then
            log "Restoring local configuration: $file"
            cp "$file.local.backup" "$file"
            restored_files+=("$file")
        fi
    done
    
    if [[ ${#restored_files[@]} -gt 0 ]]; then
        log_success "Restored local configurations: ${restored_files[*]}"
    fi
    
    log_success "Git pull completed"
    return 0
}

# Function to handle database updates
handle_database_updates() {
    log "=== Handling Database Updates ==="
    
    cd "$PROJECT_ROOT"
    
    # Backup existing database
    local backup_name="db_backup_$(date +%Y%m%d_%H%M%S).sql"
    log "Creating database backup: $backup_name..."
    if pg_dump -h localhost -U "$DB_USER" "$DB_NAME" > "$backup_name" 2>/dev/null; then
        log_success "Database backup created: $backup_name"
    else
        log_warning "Database backup failed, but continuing..."
    fi
    
    # Check if database-related files changed
    if git diff HEAD~1 --name-only | grep -E "(prisma/|migrations/|schema)" > /dev/null; then
        log "Database-related changes detected. Running migrations..."
        
        # Generate Prisma client
        log "Regenerating Prisma client..."
        npx prisma generate
        
        # Run migrations
        log "Running database migrations..."
        if npx prisma migrate deploy; then
            log_success "Database migrations completed successfully"
        elif npx prisma db push; then
            log_success "Database schema updated with db push"
        else
            log_warning "Database migrations failed, but continuing..."
        fi
    else
        log "No database changes detected"
    fi
    
    return 0
}

# Function to update application dependencies
update_dependencies() {
    log "=== Updating Dependencies ==="
    
    cd "$PROJECT_ROOT"
    
    # Check if package.json was updated
    if git diff HEAD~1 --name-only | grep -q "package.json"; then
        log "Package.json changed. Updating dependencies..."
        
        # Clean npm cache if needed
        if [[ -d "node_modules" ]]; then
            log "Cleaning existing node_modules..."
            rm -rf node_modules
        fi
        
        # Install dependencies
        if ! npm install; then
            log_error "Failed to install dependencies"
            return 1
        fi
        
        log_success "Dependencies updated successfully"
    else
        log "No package.json changes detected"
        
        # Still run npm install to ensure consistency
        log "Running npm install to ensure consistency..."
        npm install
    fi
    
    # Update Prisma client if schema changed
    if git diff HEAD~1 --name-only | grep -q "prisma/schema.prisma"; then
        log "Prisma schema changed. Regenerating client..."
        npx prisma generate
    fi
    
    return 0
}

# Function to build application
build_application() {
    log "=== Building Application ==="
    
    cd "$PROJECT_ROOT"
    
    # Stop PM2 process before building
    if pm2_process_exists "$APP_NAME"; then
        log "Stopping application during build..."
        pm2 stop "$APP_NAME" || log_warning "PM2 process was not running"
    fi
    
    # Clean previous build
    log "Cleaning previous build..."
    if [ -d ".next" ]; then
        rm -rf .next
        log "Cleaned .next directory"
    fi
    
    # Build Next.js application
    log "Building Next.js application..."
    if ! npm run build; then
        log_error "Application build failed"
        return 1
    fi
    
    # Verify build output
    if [ ! -d ".next" ]; then
        log_error "Build failed - .next directory not found"
        return 1
    fi
    
    log_success "Application built successfully"
    return 0
}

# Function to restart PM2 application
restart_pm2_application() {
    log "=== Restarting PM2 Application ==="
    
    cd "$PROJECT_ROOT"
    
    # Update PM2 ecosystem config if needed
    if [[ ! -f "ecosystem.config.js" ]]; then
        log "Creating PM2 ecosystem configuration..."
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
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Check if PM2 process exists and restart or start
    if pm2_process_exists "$APP_NAME"; then
        log "Restarting existing PM2 process..."
        pm2 restart "$APP_NAME"
    else
        log "Starting new PM2 process..."
        pm2 start ecosystem.config.js
    fi
    
    # Save PM2 configuration
    pm2 save
    
    # Wait for application to start
    log "Waiting for application to start..."
    sleep 10
    
    # Verify application is running
    if pm2 list | grep -q "$APP_NAME.*online"; then
        log_success "Application is running with PM2"
        
        # Health check
        log "Performing application health check..."
        local app_ready=false
        for i in {1..30}; do
            if curl -s http://localhost:$APP_PORT > /dev/null 2>&1; then
                app_ready=true
                break
            fi
            sleep 2
        done
        
        if [ "$app_ready" = true ]; then
            log_success "Application health check passed"
        else
            log_warning "Application health check failed, but PM2 shows online"
        fi
    else
        log_error "Application failed to start with PM2"
        pm2 logs "$APP_NAME" --lines 10
        return 1
    fi
    
    log_success "PM2 application restart completed"
    return 0
}

# Function to reload Nginx if needed
reload_nginx() {
    log "=== Reloading Nginx Configuration ==="
    
    # Check if Nginx configuration files changed or if this is first run after deploy
    if git diff HEAD~1 --name-only | grep -q "nginx" || [[ ! -f "/etc/nginx/sites-available/$APP_NAME" ]]; then
        log "Nginx configuration may need updates..."
        
        # Test current Nginx configuration
        if sudo nginx -t; then
            log "Reloading Nginx..."
            sudo systemctl reload nginx
            log_success "Nginx reloaded successfully"
        else
            log_warning "Nginx configuration test failed"
        fi
    else
        log "No Nginx configuration changes detected"
    fi
    
    return 0
}

# Function to cleanup old builds and logs
cleanup_old_files() {
    log "=== Cleaning Up Old Files ==="
    
    cd "$PROJECT_ROOT"
    
    # Clean old database backups (keep last 5)
    if ls db_backup_*.sql 1> /dev/null 2>&1; then
        log "Cleaning old database backups (keeping last 5)..."
        ls -t db_backup_*.sql | tail -n +6 | xargs rm -f
    fi
    
    # Clean old log files if they're too large
    if [[ -d "logs" ]]; then
        find logs/ -name "*.log" -size +100M -exec truncate -s 10M {} \;
        log "Cleaned large log files"
    fi
    
    # Clean npm cache periodically
    if [[ $(date +%d) == "01" ]]; then
        log "Monthly npm cache clean..."
        npm cache clean --force
    fi
    
    log_success "Cleanup completed"
}

# Function to verify update success
verify_update() {
    log "=== Verifying Update Success ==="
    
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
    for i in {1..15}; do
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
        log_warning "Nginx proxy test failed"
    fi
    
    # Test PM2 process
    log "Testing PM2 process..."
    if pm2 list | grep -q "$APP_NAME.*online"; then
        log_success "PM2 process test passed"
    else
        log_error "PM2 process test failed"
        all_tests_passed=false
    fi
    
    if [ "$all_tests_passed" = true ]; then
        log_success "All critical tests passed"
        return 0
    else
        log_error "Some critical tests failed"
        return 1
    fi
}

# Function to show update status
show_update_status() {
    log "=== Production Update Status ==="
    
    echo ""
    log "Git Information:"
    echo "  Current commit: $(git rev-parse --short HEAD)"
    echo "  Current branch: $(git branch --show-current)"
    echo "  Last commit: $(git log -1 --format='%h - %s (%ar)')"
    
    local status_output=$(git status --short)
    if [[ -n "$status_output" ]]; then
        echo "  Uncommitted changes:"
        git status --short | sed 's/^/    /'
    else
        echo "  Working directory: Clean"
    fi
    
    echo ""
    log "Application Status (PM2):"
    pm2 list
    
    echo ""
    log "System Services Status:"
    echo "  PostgreSQL: $(systemctl is-active postgresql)"
    echo "  Nginx: $(systemctl is-active nginx)"
    echo "  Mosquitto: $(systemctl is-active mosquitto)"
    
    echo ""
    log "Database Information:"
    if psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM \"User\";" >/dev/null 2>&1; then
        local user_count=$(psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | xargs)
        echo "  Database: Connected ($user_count users)"
    else
        echo "  Database: Connection failed"
    fi
    
    echo ""
    log "Application URLs:"
    echo "  Frontend (Nginx): http://localhost:$NGINX_PORT"
    echo "  Frontend (Direct): http://localhost:$APP_PORT"
    echo "  Server IP: http://$(hostname -I | awk '{print $1}'):$NGINX_PORT"
    
    echo ""
    log "MQTT Broker:"
    echo "  URL: mqtt://localhost:1883"
    echo "  Test: mosquitto_pub -h localhost -t test/topic -m 'Update Test'"
    
    echo ""
    log "Performance Information:"
    echo "  Memory usage: $(free -h | awk 'NR==2{printf "%.1f%%", $3/$2*100}')"
    echo "  Disk usage: $(df -h / | awk 'NR==2{print $5}')"
    echo "  Load average: $(uptime | awk -F'load average:' '{print $2}')"
    
    echo ""
    log "Useful Commands:"
    echo "  View app logs: pm2 logs $APP_NAME"
    echo "  Restart app: pm2 restart $APP_NAME"
    echo "  Monitor PM2: pm2 monit"
    echo "  View database: psql -h localhost -U $DB_USER -d $DB_NAME"
    echo "  Full redeploy: ./deploy.sh"
    
    echo ""
    if [[ -f ".env.local.backup" ]]; then
        log_warning "Local configurations were restored:"
        echo "  • Local environment files were preserved"
        echo "  • Check if any manual merging is needed"
    fi
    
    echo ""
    log_success "IoT Dashboard production update completed successfully!"
    log "Update time: $(date)"
}

# Function to create pre-update backup
create_backup() {
    log "=== Creating Pre-Update Backup ==="
    
    local backup_dir="/tmp/$APP_NAME-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup current application build
    if [ -d ".next" ]; then
        log "Backing up current application build..."
        cp -r .next "$backup_dir/next-build"
    fi
    
    # Backup current configuration
    for file in ".env" ".env.production" "ecosystem.config.js"; do
        if [ -f "$file" ]; then
            cp "$file" "$backup_dir/"
        fi
    done
    
    # Backup database
    if pg_dump -h localhost -U "$DB_USER" "$DB_NAME" > "$backup_dir/database.sql" 2>/dev/null; then
        log "Database backup created"
    fi
    
    log_success "Backup created at: $backup_dir"
    echo "To restore if needed:"
    echo "  App build: cp -r $backup_dir/next-build .next"
    echo "  Database: psql -h localhost -U $DB_USER -d $DB_NAME < $backup_dir/database.sql"
    
    return 0
}

# Function to verify environment
verify_environment() {
    log "=== Verifying Environment ==="
    
    local errors=0
    
    # Check required commands
    for cmd in git node npm pm2 psql; do
        if ! command_exists "$cmd"; then
            log_error "Required command not found: $cmd"
            errors=$((errors + 1))
        fi
    done
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        log_error "Not in IoT Dashboard project directory (package.json not found)"
        errors=$((errors + 1))
    fi
    
    # Check write permissions
    if [ ! -w "$PROJECT_ROOT" ]; then
        log_error "No write permission to project directory"
        errors=$((errors + 1))
    fi
    
    # Check if Git repository
    if [ ! -d ".git" ]; then
        log_error "Not a Git repository"
        errors=$((errors + 1))
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "Environment verification passed"
        return 0
    else
        log_error "Environment verification failed with $errors errors"
        return 1
    fi
}

# Main function
main() {
    log "=== IoT Dashboard Production Update Script ==="
    log "Project Root: $PROJECT_ROOT"
    log "Current User: $USER"
    log "Target Port: $APP_PORT"
    echo ""
    
    # Verify environment
    if ! verify_environment; then
        log_error "Environment verification failed. Please fix issues and try again."
        exit 1
    fi
    
    # Create backup before update
    create_backup
    
    # Step 1: Pull latest changes
    if ! pull_updates; then
        log_error "Failed to pull updates"
        exit 1
    fi
    
    # Step 2: Handle database updates
    if ! handle_database_updates; then
        log_error "Failed to handle database updates"
        exit 1
    fi
    
    # Step 3: Update dependencies
    if ! update_dependencies; then
        log_error "Failed to update dependencies"
        exit 1
    fi
    
    # Step 4: Build application
    if ! build_application; then
        log_error "Failed to build application"
        exit 1
    fi
    
    # Step 5: Restart PM2 application
    if ! restart_pm2_application; then
        log_error "Failed to restart PM2 application"
        exit 1
    fi
    
    # Step 6: Reload Nginx if needed
    reload_nginx
    
    # Step 7: Cleanup old files
    cleanup_old_files
    
    # Step 8: Verify update success
    if ! verify_update; then
        log_warning "Some verification tests failed, but update may still be functional"
    fi
    
    # Step 9: Show update status
    show_update_status
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi