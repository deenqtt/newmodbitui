#!/bin/bash
# Database Reset & Re-seeding Script for Nexus IoT Dashboard
# Fully automated database reset with fresh seeding
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRISMA_DB_FILE="$PROJECT_ROOT/prisma/iot_dashboard.db"
LOG_FILE="$PROJECT_ROOT/reset-db.log"

# Default configurations
DEFAULT_ENABLE_USERS=true
DEFAULT_ENABLE_MENU=true
DEFAULT_ENABLE_DASHBOARD=true
DEFAULT_ENABLE_DEVICES=true
DEFAULT_ENABLE_LAYOUT2D=true
DEFAULT_ENABLE_LOGGING_CONFIGS=true
DEFAULT_ENABLE_MAINTENANCE=true

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Show banner
show_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}${WHITE}                 DATABASE RESET & RE-SEEDING                   ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}${WHITE}            Nexus IoT Dashboard Management                 ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Show help
show_help() {
    echo "Database Reset & Re-seeding Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --users-only      Only seed users and roles"
    echo "  --menu-only       Only seed menu system"
    echo "  --dashboard-only  Only seed dashboard layout"
    echo "  --devices-only    Only seed IoT devices"
    echo "  --skip-users      Skip user seeding"
    echo "  --skip-menu       Skip menu seeding"
    echo "  --skip-dashboard  Skip dashboard seeding"
    echo "  --skip-devices    Skip device seeding"
    echo "  --backup-db       Backup current database before reset"
    echo "  --no-reset        Skip database reset, only re-seed"
    echo "  --help, -h        Show this help message"
    echo ""
    echo "Quick Commands:"
    echo "  $0 --users-only      # Reset and seed only users"
    echo "  $0 --menu-only       # Reset and seed only menu"
    echo "  $0 --devices-only    # Reset and seed only devices"
    echo "  $0                   # Reset and re-seed everything (default)"
    echo "  $0 --no-reset        # Re-seed without reset (update existing data)"
    echo ""
    echo "Examples:"
    echo "  # Full reset and re-seed"
    echo "  $0"
    echo ""
    echo "  # Seed new devices without touching other data"
    echo "  $0 --no-reset --skip-users --skip-menu --skip-dashboard"
    echo ""
    echo "  # Only reset menu system"
    echo "  $0 --menu-only"
    echo ""
    echo "  # Backup and reset, then seed specific modules"
    echo "  $0 --backup-db --skip-dashboard --skip-devices"
}

# Parse command line arguments
ENABLE_USERS=$DEFAULT_ENABLE_USERS
ENABLE_MENU=$DEFAULT_ENABLE_MENU
ENABLE_DASHBOARD=$DEFAULT_ENABLE_DASHBOARD
ENABLE_DEVICES=$DEFAULT_ENABLE_DEVICES
ENABLE_LAYOUT2D=$DEFAULT_ENABLE_LAYOUT2D
ENABLE_LOGGING_CONFIGS=$DEFAULT_ENABLE_LOGGING_CONFIGS
ENABLE_MAINTENANCE=$DEFAULT_ENABLE_MAINTENANCE
DO_DB_RESET=true
DO_DB_BACKUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --users-only)
            ENABLE_USERS=true
            ENABLE_MENU=false
            ENABLE_DASHBOARD=false
            ENABLE_DEVICES=false
            DO_DB_RESET=true
            shift
            ;;
        --menu-only)
            ENABLE_USERS=false
            ENABLE_MENU=true
            ENABLE_DASHBOARD=false
            ENABLE_DEVICES=false
            DO_DB_RESET=true
            shift
            ;;
        --dashboard-only)
            ENABLE_USERS=false
            ENABLE_MENU=false
            ENABLE_DASHBOARD=true
            ENABLE_DEVICES=false
            DO_DB_RESET=true
            shift
            ;;
        --devices-only)
            ENABLE_USERS=false
            ENABLE_MENU=false
            ENABLE_DASHBOARD=false
            ENABLE_DEVICES=true
            DO_DB_RESET=true
            shift
            ;;
        --skip-users)
            ENABLE_USERS=false
            shift
            ;;
        --skip-menu)
            ENABLE_MENU=false
            shift
            ;;
        --skip-dashboard)
            ENABLE_DASHBOARD=false
            shift
            ;;
        --skip-devices)
            ENABLE_DEVICES=false
            shift
            ;;
        --backup-db)
            DO_DB_BACKUP=true
            shift
            ;;
        --no-reset)
            DO_DB_RESET=false
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# Show configuration
show_configuration() {
    echo ""
    echo -e "${YELLOW}Configuration Summary:${NC}"
    echo -e "${BLUE}Database Reset:${NC} $([ "$DO_DB_RESET" = true ] && echo 'ENABLED' || echo 'DISABLED')"
    echo -e "${BLUE}Database Backup:${NC} $([ "$DO_DB_BACKUP" = true ] && echo 'ENABLED' || echo 'DISABLED')"
    echo -e "${BLUE}Seeding Configuration:${NC}"
    echo -e "   Users: $([ "$ENABLE_USERS" = true ] && echo 'ENABLED' || echo 'DISABLED')"
    echo -e "   Menu: $([ "$ENABLE_MENU" = true ] && echo 'ENABLED' || echo 'DISABLED')"
    echo -e "   Dashboard: $([ "$ENABLE_DASHBOARD" = true ] && echo 'ENABLED' || echo 'DISABLED')"
    echo -e "   Devices: $([ "$ENABLE_DEVICES" = true ] && echo 'ENABLED' || echo 'DISABLED')"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    if ! command_exists node; then
        log_error "Node.js is not installed or not in PATH"
        exit 1
    fi

    if ! command_exists npx; then
        log_error "npx is not available"
        exit 1
    fi

    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "package.json not found in project root"
        exit 1
    fi

    if [ ! -d "$PROJECT_ROOT/prisma" ]; then
        log_error "Prisma directory not found"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Backup database
backup_database() {
    if [ "$DO_DB_BACKUP" = false ]; then
        return 0
    fi

    log_step "Backing up current database..."

    if [ ! -f "$PRISMA_DB_FILE" ]; then
        log_warning "No database file to backup"
        return 0
    fi

    local backup_file="$PRISMA_DB_FILE.backup.$(date +'%Y%m%d_%H%M%S')"
    if cp "$PRISMA_DB_FILE" "$backup_file"; then
        log_success "Database backed up to: $backup_file"
    else
        log_error "Failed to backup database"
        exit 1
    fi
}

# Reset database
reset_database() {
    if [ "$DO_DB_RESET" = false ]; then
        log_step "Skipping database reset (--no-reset specified)"
        return 0
    fi

    log_step "Resetting database..."

    # Stop any running PM2 processes that might use the database
    pm2 list --json 2>/dev/null | jq -r '.[]?.name' 2>/dev/null | grep -E "(nexus|iot|dashboard)" \
        | xargs -r pm2 stop --silent 2>/dev/null || true

    cd "$PROJECT_ROOT"

    # Force remove database file to ensure clean start
    log "Removing existing database file..."
    if [ -f "$PRISMA_DB_FILE" ]; then
        sudo chown -R "$USER:$USER" "$PRISMA_DB_FILE" 2>/dev/null || true
        rm -f "$PRISMA_DB_FILE"
    fi

    # Reset with Prisma using proper error handling - force both methods
    log "Force resetting database schema..."
    if npx prisma db push --force-reset --accept-data-loss >/dev/null 2>&1 || npx prisma migrate reset --force --skip-generate >/dev/null 2>&1; then
        log_success "Database reset completed successfully"
    else
        # Last resort: if both methods fail, resolve stuck migrations and try again
        log_warning "Both methods failed, attempting to resolve stuck migrations..."
        npx prisma migrate resolve --applied $(ls -t prisma/migrations/*/migration.sql | head -1 | xargs basename | cut -d'_' -f1-6) >/dev/null 2>&1 || true

        if npx prisma db push --force-reset --accept-data-loss >/dev/null 2>&1; then
            log_success "Database reset completed after resolving migrations"
        else
            log_error "Database reset failed even after migration resolution"
            exit 1
        fi
    fi

    # Restart PM2 processes if they were running
    pm2 restart all 2>/dev/null || true
}

# Generate Prisma client
generate_prisma_client() {
    log_step "Generating Prisma client..."

    cd "$PROJECT_ROOT"

    if npx prisma generate >/dev/null 2>&1; then
        log_success "Prisma client generated successfully"
    else
        log_error "Failed to generate Prisma client"
        exit 1
    fi
}

# Run seeders based on configuration
run_seeders() {
    log_step "Running configured seeders..."

    cd "$PROJECT_ROOT"

    # 🔄 First run tenant and node location seeders (required by others)
    log "Running prerequisite seeders..."
    if node scripts/seed-tenants.js >/dev/null 2>&1; then
        log_success "Tenants seeded successfully"
    else
        log_error "Tenant seeding failed"
        exit 1
    fi

    if node scripts/seed-node-locations.js >/dev/null 2>&1; then
        log_success "Node locations seeded successfully"
    else
        log_error "Node locations seeding failed"
        exit 1
    fi

    # 🔄 Now run the main seeder with proper environment variables
    local seeder_env_vars=""
    [ "$ENABLE_USERS" = false ] && seeder_env_vars="$seeder_env_vars SEED_USERS=false"
    [ "$ENABLE_MENU" = false ] && seeder_env_vars="$seeder_env_vars SEED_MENU=false"
    [ "$ENABLE_DASHBOARD" = false ] && seeder_env_vars="$seeder_env_vars SEED_DASHBOARD=false"
    [ "$ENABLE_DEVICES" = false ] && seeder_env_vars="$seeder_env_vars SEED_DEVICES=false"
    [ "$ENABLE_LAYOUT2D" = false ] && seeder_env_vars="$seeder_env_vars SEED_LAYOUT2D=false"
    [ "$ENABLE_LOGGING_CONFIGS" = false ] && seeder_env_vars="$seeder_env_vars SEED_LOGGING_CONFIGS=false"
    [ "$ENABLE_MAINTENANCE" = false ] && seeder_env_vars="$seeder_env_vars SEED_MAINTENANCE=false"

    log "Running seed command with environment: $seeder_env_vars"

    if [ -z "$seeder_env_vars" ]; then
        # No environment variables to set, run directly
        if node scripts/seed-init.js >/dev/null 2>&1; then
            log_success "Seeding completed successfully"
        else
            log_error "Seeding failed"
            exit 1
        fi
    else
        # Run with environment variables
        if eval "$seeder_env_vars node scripts/seed-init.js" >/dev/null 2>&1; then
            log_success "Seeding completed successfully"
        else
            log_error "Seeding failed"
            exit 1
        fi
    fi
}

# Verify seeding results
verify_seeding() {
    log_step "Verifying seeding results..."

    local has_issues=false

    cd "$PROJECT_ROOT"

    # Check for recorded log file during seeding (if it exists it means seeding ran)
    if [ -f "$LOG_FILE" ]; then
        local lines=$(tail -20 "$LOG_FILE" | grep -c "seeding completed successfully" || echo "0")
        if [ "$lines" -gt "0" ]; then
            log_success "Seeding verification: Found successful seeding logs"
        else
            log_warning "Seeding verification: No success logs found in recent entries"
            has_issues=true
        fi
    else
        log_warning "No log file found - cannot verify seeding"
        has_issues=true
    fi

    # Check if database exists and is accessible
    if [ -f "$PRISMA_DB_FILE" ]; then
        local db_size=$(du -h "$PRISMA_DB_FILE" | cut -f1)
        log_success "Database file exists ($db_size)"
    else
        log_error "Database file does not exist"
        has_issues=true
    fi

    # Check if we can access the database (simple query)
    if command_exists sqlite3 && [ -f "$PRISMA_DB_FILE" ]; then
        local user_count=$(sqlite3 "$PRISMA_DB_FILE" "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "error")
        if [[ "$user_count" != "error" ]]; then
            log_success "Database accessible: $user_count users found"

            if [ "$ENABLE_USERS" = true ] && [ "$user_count" -eq "0" ]; then
                log_warning "Users were enabled but none found in database"
                has_issues=true
            fi
        else
            log_warning "Could not query database"
            has_issues=true
        fi
    fi

    if [ "$has_issues" = true ]; then
        log_warning "Some verification checks failed - please check logs manually"
    else
        log_success "All verification checks passed"
    fi
}

# Show completion summary
show_completion_summary() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}                 DATABASE RESET & RE-SEEDING COMPLETED!${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""

    log_success "📋 Operation Summary:"
    echo -e "${BLUE}Database Reset:${NC} $([ "$DO_DB_RESET" = true ] && echo 'Completed' || echo 'Skipped')"
    echo -e "${BLUE}Database Backup:${NC} $([ "$DO_DB_BACKUP" = true ] && echo 'Created' || echo 'Not requested')"
    echo -e "${BLUE}Seeded Modules:${NC}"

    if [ "$ENABLE_USERS" = true ]; then
        echo -e "   ✅ Users & Roles seeded"
        echo -e "      - ADMIN: admin@gmail.com / admin123"
        echo -e "      - USER: user@gmail.com / user123"
        echo -e "      - DEVELOPER: developer@gmail.com / dev123"
    fi

    if [ "$ENABLE_MENU" = true ]; then
        echo -e "   ✅ Menu System seeded (70+ menu items)"
    fi

    if [ "$ENABLE_DASHBOARD" = true ]; then
        echo -e "   ✅ Dashboard Layout seeded"
    fi

    if [ "$ENABLE_DEVICES" = true ]; then
        echo -e "   ✅ IoT Devices seeded (11 devices)"
    fi

    if [ "$ENABLE_LAYOUT2D" = true ]; then
        echo -e "   ✅ Layout 2D seeded (Wastewater monitoring)"
    fi

    if [ "$ENABLE_LOGGING_CONFIGS" = true ]; then
        echo -e "   ✅ Logging Configs seeded (8 configs)"
    fi

    if [ "$ENABLE_MAINTENANCE" = true ]; then
        echo -e "   ✅ Maintenance seeded (2 schedules)"
    fi

    echo ""
    log_success "🎉 Database reset and re-seeding completed successfully!"
    echo ""
    log_success "🚀 Ready to run the application with fresh data!"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  - Start the application: npm run dev"
    echo "  - Deploy for production: ./deploy.sh"
    echo "  - Check logs: $LOG_FILE"
    echo ""
    echo -e "${BLUE}Useful monitoring commands:${NC}"
    echo "  - Database size: du -h $PRISMA_DB_FILE"
    echo "  - Recent changes: tail -f $LOG_FILE"
    echo "  - Check processes: pm2 list"
}

# Main execution
main() {
    show_banner

    # Initialize log file
    > "$LOG_FILE"

    log "Starting Nexus IoT Database Reset & Re-seeding"
    log "Timestamp: $(date)"
    log "Project: $PROJECT_ROOT"

    show_configuration

    # Confirm action if this destroys data
    if [ "$DO_DB_RESET" = true ]; then
        echo ""
        echo -e "${RED}⚠️  WARNING: This will reset the database and delete all existing data!${NC}"
        read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log "Operation cancelled by user"
            exit 0
        fi
    fi

    check_prerequisites
    backup_database
    reset_database
    generate_prisma_client
    run_seeders
    verify_seeding
    show_completion_summary

    log "All operations completed successfully"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
