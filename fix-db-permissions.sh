#!/bin/bash
# Fix Database Permissions Script
# Standalone script to fix database permissions for production
# Author: Database Permission Fix Utility
# Description: Fixes ownership and permissions on SQLite database file

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

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

# Project configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to fix database permissions for production
fix_database_permissions() {
    log "=== Fixing Database Permissions for Production ==="

    cd "$PROJECT_ROOT"

    # Check if database file exists
    if [[ -f "prisma/iot_dashboard.db" ]]; then
        log "Database file found, fixing permissions..."

        # Change ownership to current user (not root)
        sudo chown $(whoami):$(whoami) prisma/iot_dashboard.db 2>/dev/null || true

        # Set proper permissions for read/write access
        chmod 666 prisma/iot_dashboard.db 2>/dev/null || true

        # Verify permissions
        if [[ -w "prisma/iot_dashboard.db" ]]; then
            log_success "Database permissions fixed successfully"
        else
            log_warning "Could not fix database permissions automatically"
            log_warning "You may need to run: sudo chown $(whoami):$(whoami) prisma/iot_dashboard.db"
        fi
    else
        log_warning "Database file not found, will be created on first run"
    fi
}

# Help function
show_help() {
    echo "Fix Database Permissions Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Description:"
    echo "  Fixes ownership and permissions on the SQLite database file"
    echo "  for production deployment environments."
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Database File:"
    echo "  prisma/iot_dashboard.db"
    echo ""
    echo "Actions Performed:"
    echo "  1. Changes ownership to current user"
    echo "  2. Sets read/write permissions (666)"
    echo "  3. Verifies write access"
    echo ""
    echo "Examples:"
    echo "  $0              # Fix database permissions"
    echo "  $0 --help       # Show this help"
}

# Main function
main() {
    log "Fix Database Permissions Utility"
    log "Project Root: $PROJECT_ROOT"

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use '$0 --help' for usage information."
                exit 1
                ;;
        esac
    done

    # Run the permission fix
    fix_database_permissions

    log_success "Database permission fix operation completed"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
