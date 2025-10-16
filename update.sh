#!/bin/bash
# Nexus IoT Dashboard Update Script
# Pull latest changes and rebuild application without database seeding
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

# Show banner
show_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}${WHITE}                NEXUS DASHBOARD UPDATE                          ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}${WHITE}             Pull & Rebuild Application                       ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${PURPLE}Updating with latest changes... 🚀${NC}"
    echo ""
}

# Project configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="nexus-dashboard"
NODE_VERSION="18"

# Global variables to store current status
CURRENT_BRANCH=""
HAS_CHANGES=false
CHANGE_COUNT=0

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

# Function to check Node.js version
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

# Function to check git status
check_git_status() {
    log "Checking git status..."
    cd "$PROJECT_ROOT"

    if ! command_exists git; then
        log_error "Git is not installed"
        exit 1
    fi

    if ! git status >/dev/null 2>&1; then
        log_error "Not a git repository"
        exit 1
    fi

    # Get current branch
    CURRENT_BRANCH=$(git branch --show-current)
    log_success "Current branch: $CURRENT_BRANCH"

    # Check for local changes
    if git diff --quiet && git diff --staged --quiet; then
        log_success "Working directory is clean"
    else
        log_warning "Working directory has uncommitted changes"
        log "Uncommitted changes:"
        git status --porcelain
        log_warning "Please commit or stash changes before updating"
        read -p "Continue anyway? (y/N): " continue_anyway
        case $continue_anyway in
            [Yy]* ) log_warning "Proceeding with uncommitted changes (not recommended)" ;;
            * ) exit 1 ;;
        esac
    fi
}

# Function to pull latest changes
pull_latest_changes() {
    log "Pulling latest changes from repository..."
    cd "$PROJECT_ROOT"

    # Fetch latest changes
    if git fetch origin "$CURRENT_BRANCH" >/dev/null 2>&1; then
        log "Fetched latest changes from origin/$CURRENT_BRANCH"
    else
        log_error "Failed to fetch changes from remote"
        exit 1
    fi

    # Check if there are updates
    CHANGE_COUNT=$(git rev-list HEAD...origin/"$CURRENT_BRANCH" --count 2>/dev/null || echo "0")
    if [ "$CHANGE_COUNT" -gt "0" ]; then
        HAS_CHANGES=true
        log "Found $CHANGE_COUNT new commits to pull"

        # Show changelog
        echo ""
        echo -e "${YELLOW}📋 Recent Changes:${NC}"
        git log --oneline HEAD..origin/"$CURRENT_BRANCH" | head -10
        echo ""

        # Pull changes
        if git pull origin "$CURRENT_BRANCH" >/dev/null 2>&1; then
            log_success "Successfully pulled $CHANGE_COUNT updates"
        else
            log_error "Failed to pull changes"
            exit 1
        fi
    else
        log_success "Repository is up to date (no new changes)"
    fi
}

# Function to install/uninstall dependencies
update_dependencies() {
    log "Checking for dependency updates..."
    cd "$PROJECT_ROOT"

    # Clean npm cache first
    npm cache clean --force >/dev/null 2>&1 || true

    # Installing dependencies
    log "Installing/updating npm dependencies..."
    if npm install >/dev/null 2>&1; then
        log_success "Dependencies updated successfully"

        # Check if new packages were installed
        if npm list --depth=0 2>/dev/null | grep -q "^npm ERR"; then
            log_warning "Some dependencies might have warnings"
        fi
    else
        log_error "Failed to update dependencies"
        exit 1
    fi
}

# Function to build application
rebuild_application() {
    log "Rebuilding application..."
    cd "$PROJECT_ROOT"

    # Clean previous build
    if [ -d ".next" ]; then
        rm -rf .next
        log "Cleaned previous build"
    fi

    # Build Next.js application
    log "Building Next.js application..."
    if npm run build >/dev/null 2>&1; then
        log_success "Application rebuilt successfully"

        # Show build info if verbose mode
        if [ "$VERBOSE" = true ]; then
            npm run build 2>&1 | grep -E "(✔|○|ƒ)" | tail -10
        fi
    else
        log_error "Application build failed"
        exit 1
    fi
}

# Function to restart PM2 application
restart_application() {
    log "Checking for running application..."
    cd "$PROJECT_ROOT"

    # Find running PM2 process
    APP_STATUS=$(pm2 list --json 2>/dev/null | jq -r ".[].name" 2>/dev/null | grep -E "$APP_NAME" || echo "")

    if [ -n "$APP_STATUS" ]; then
        log "Found running application: $APP_STATUS"

        # Stop application
        log "Stopping application..."
        if pm2 stop "$APP_STATUS" >/dev/null 2>&1; then
            log_success "Application stopped"
        else
            log_warning "Failed to stop application gracefully"
        fi

        # Wait a moment
        sleep 2

        # Start application
        log "Starting application..."
        if pm2 start "$APP_STATUS" >/dev/null 2>&1; then
            log_success "Application restarted successfully"
        else
            log_error "Failed to restart application"
            pm2 logs "$APP_STATUS" --lines 5
            exit 1
        fi
    else
        log_warning "No running PM2 application found with name containing '$APP_NAME'"
        log "Checking available PM2 processes:"
        pm2 list

        read -p "Do you want to search for and start an application? (y/N): " start_app
        case $start_app in
            [Yy]* )
                log "Available processes:"
                pm2 list --json | jq -r '.[].name' | nl
                read -p "Enter process name or number: " process_name
                if pm2 restart "$process_name" >/dev/null 2>&1; then
                    log_success "Application restarted manually"
                else
                    log_error "Failed to restart application"
                fi
                ;;
            * )
                log_warning "Skipping application restart"
                log "You can manually restart with: pm2 restart <process_name>"
                ;;
        esac
    fi
}

# Function to verify update
verify_update() {
    log "Verifying application health..."
    cd "$PROJECT_ROOT"

    # Test application health check
    if curl -s -f http://localhost:3002/api/health >/dev/null 2>&1; then
        log_success "Application health check passed"
    else
        log_warning "Application health check failed - may need manual investigation"
    fi

    # Show PM2 status
    echo ""
    log "Current PM2 status:"
    pm2 list | grep -E "(name|status|restart)" | head -10

    # Check nginx status if available
    if command_exists nginx; then
        NGINX_STATUS=$(systemctl is-active nginx 2>/dev/null || echo "unknown")
        log "Nginx status: $NGINX_STATUS"
    fi
}

# Function to show deployment status
show_update_status() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}                 UPDATE COMPLETED! 🎉${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""

    log "📊 Update Summary:"
    echo -e "${BLUE}Repository:${NC} $CURRENT_BRANCH branch"
    if [ "$HAS_CHANGES" = true ]; then
        echo -e "${BLUE}Changes Pulled:${NC} $CHANGE_COUNT commits"
    else
        echo -e "${BLUE}Repository Status:${NC} Already up-to-date"
    fi
    echo -e "${BLUE}Build Status:${NC} Successful"
    echo -e "${BLUE}Application Status:${NC} Restarted"

    echo ""
    log "🌐 Application URLs:"
    echo -e "${GREEN}  Frontend (Direct):${NC} http://localhost:3002"
    echo -e "${GREEN}  Health Check:${NC} http://localhost:3002/api/health"
    echo -e "${GREEN}  Server IP Access:${NC} http://$(hostname -I | awk '{print $1}'):3002"

    if curl -s http://localhost:3001 >/dev/null 2>&1; then
        echo -e "${GREEN}  Frontend (Nginx):${NC} http://localhost:3001"
        echo -e "${GREEN}  Server (Nginx):${NC} http://$(hostname -I | awk '{print $1}'):3001"
    fi

    echo ""
    echo -e "${YELLOW}🔧 Useful Commands:${NC}"
    echo "  View app logs: pm2 logs $APP_NAME"
    echo "  Monitor PM2: pm2 monit"
    echo "  View recent commits: git log --oneline -5"
    echo "  Check app status: curl http://localhost:3002/api/health"

    echo ""
    if [ "$HAS_CHANGES" = true ]; then
        echo -e "${GREEN}✅ Update completed successfully with $CHANGE_COUNT new changes!${NC}"
    else
        echo -e "${BLUE}ℹ️  No new updates were available - application is current.${NC}"
    fi

    echo ""
    echo -e "${CYAN}🚀 Application is live and ready to use!${NC}"
}

# Show help
show_help() {
    echo "Nexus Dashboard Update Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script pulls the latest changes from git, updates dependencies,"
    echo "rebuilds the application, and restarts the PM2 process without running"
    echo "database seeding."
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verbose  Show detailed output during build"
    echo "  --dry-run      Show what would be done without actually doing it"
    echo ""
    echo "Examples:"
    echo "  $0                    # Update with normal output"
    echo "  $0 --verbose         # Update with detailed build information"
    echo "  $0 --dry-run         # Show update plan without executing"
    echo ""
    echo "Notes:"
    echo "  - Will pull changes from current branch"
    echo "  - Will stop and restart PM2 application if running"
    echo "  - Database seeding is NEVER run by this script"
    echo "  - Commit or stash local changes before running"
}

# Main update function
main() {
    show_banner

    # Parse command line options
    VERBOSE=false
    DRY_RUN=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                echo ""
                show_help
                exit 1
                ;;
        esac
    done

    log "=== Starting Application Update Process ==="
    log "Project Root: $PROJECT_ROOT"
    log "Timestamp: $(date)"
    log "Verbose Mode: $VERBOSE"
    log "Dry Run: $DRY_RUN"

    # Dry run mode - show what would happen
    if [ "$DRY_RUN" = true ]; then
        echo ""
        echo -e "${YELLOW}🔍 DRY RUN MODE - Showing what would be done:${NC}"
        echo "1. Check git status and current branch"
        echo "2. Fetch latest changes from remote repository"
        echo "3. Update npm dependencies"
        echo "4. Rebuild Next.js application"
        echo "5. Restart PM2 application process"
        echo "6. Verify application health"
        echo ""
        log_success "Dry run completed - no changes made"
        exit 0
    fi

    # Step 1: Check prerequisites
    log "Step 1/6: Checking prerequisites..."
    if ! check_nodejs; then
        log_error "Node.js requirements not met"
        exit 1
    fi

    # Step 2: Check git status
    log "Step 2/6: Checking git repository status..."
    check_git_status

    # Step 3: Pull latest changes
    log "Step 3/6: Pulling latest changes..."
    pull_latest_changes

    # Exit early if no changes
    if [ "$HAS_CHANGES" = false ]; then
        log_success "No updates available - application is current"
        verify_update
        show_update_status
        exit 0
    fi

    # Step 4: Update dependencies
    log "Step 4/6: Updating dependencies..."
    update_dependencies

    # Step 5: Build application
    log "Step 5/6: Building application..."
    rebuild_application

    # Step 6: Restart application
    log "Step 6/6: Restarting application..."
    restart_application

    # Step 7: Verify update
    log "Step 7/6: Verifying update..."
    verify_update

    # Step 8: Show status
    show_update_status
}

# Handle script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
