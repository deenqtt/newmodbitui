#!/bin/bash

# Comprehensive Backup Script with Cron Integration
# This script handles database and file backups, with retention policies

# Configuration
PROJECT_DIR="/home/ubuntu/Alfi/RnD/Development/newmodbitui"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/backup-cron.log"

# Database settings
DB_PATH="$PROJECT_DIR/prisma/iot_dashboard.db"

# Retention settings (days)
DB_BACKUP_RETENTION=30
FILE_BACKUP_RETENTION=30
LOG_RETENTION=90

# Create directories if they don't exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error logging function
error_log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: $1" | tee -a "$LOG_FILE" >&2
}

# Compliance check function
check_compliance() {
    local backup_file="$1"
    local required_files="$2"

    log "Checking backup compliance for: $backup_file"

    if [[ ! -f "$backup_file" ]]; then
        error_log "Backup file does not exist: $backup_file"
        return 1
    fi

    # For compressed files, check if tar can list contents
    if [[ "$backup_file" == *.tar.gz ]]; then
        if tar -tzf "$backup_file" &>/dev/null; then
            log "Backup archive is valid"
            return 0
        else
            error_log "Backup archive is corrupted"
            return 1
        fi
    fi

    return 0
}

# Database backup function
backup_database() {
    log "Starting database backup..."

    TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
    BACKUP_FILE="$BACKUP_DIR/database-backup-$TIMESTAMP.db"
    SQL_DUMP="$BACKUP_DIR/database-dump-$TIMESTAMP.sql"

    # Check if database exists
    if [[ ! -f "$DB_PATH" ]]; then
        error_log "Database file not found: $DB_PATH"
        return 1
    fi

    # Create database backup
    if cp "$DB_PATH" "$BACKUP_FILE"; then
        log "Database file copied successfully"
    else
        error_log "Failed to copy database file"
        return 1
    fi

    # Create SQL dump
    if sqlite3 "$DB_PATH" .dump > "$SQL_DUMP"; then
        log "SQL dump created successfully"
    else
        error_log "Failed to create SQL dump"
        return 1
    fi

    # Create compressed archive
    COMPRESSED_FILE="$BACKUP_DIR/backup-$TIMESTAMP.tar.gz"
    if tar -czf "$COMPRESSED_FILE" -C "$BACKUP_DIR" "$(basename "$BACKUP_FILE")" "$(basename "$SQL_DUMP")"; then
        log "Database backup compressed successfully"

        # Remove uncompressed files
        rm -f "$BACKUP_FILE" "$SQL_DUMP"
    else
        error_log "Failed to compress database backup"
        return 1
    fi

    # Verify backup integrity
    if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
        log "Database integrity check passed"
    else
        error_log "Database integrity check failed"
        return 1
    fi

    # Run compliance check
    check_compliance "$COMPRESSED_FILE"

    log "Database backup completed successfully"
    return 0
}

# File backup function
backup_files() {
    log "Starting file backup..."

    TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
    BACKUP_FILE="$BACKUP_DIR/files-$TIMESTAMP.tar.gz"

    # Files and directories to backup
    FILES_TO_BACKUP=(
        "public/images"
        "public/snapshots"
        "middleware"
        "scripts"
        "prisma/migrations"
        "package.json"
        "package-lock.json"
        "tsconfig.json"
        "next.config.mjs"
        "tailwind.config.ts"
        "postcss.config.js"
    )

    # Sensitive files (handled separately for additional security)
    SENSITIVE_FILES=(
        ".env.local"
        ".env"
        "cookies.txt"
    )

    # Create temporary directory for backup structure
    TEMP_DIR="$BACKUP_DIR/temp-files-$TIMESTAMP"
    mkdir -p "$TEMP_DIR"

    # Copy regular files
    for file_path in "${FILES_TO_BACKUP[@]}"; do
        if [[ -e "$file_path" ]]; then
            if [[ -d "$file_path" ]]; then
                cp -r "$file_path" "$TEMP_DIR/" 2>/dev/null || log "Warning: Could not copy directory $file_path"
            else
                cp "$file_path" "$TEMP_DIR/" 2>/dev/null || log "Warning: Could not copy file $file_path"
            fi
        fi
    done

    # Create sensitive files directory with restricted permissions
    SENSITIVE_DIR="$TEMP_DIR/sensitive"
    mkdir -p "$SENSITIVE_DIR"
    chmod 700 "$SENSITIVE_DIR"

    for sensitive_file in "${SENSITIVE_FILES[@]}"; do
        if [[ -f "$sensitive_file" ]]; then
            cp "$sensitive_file" "$SENSITIVE_DIR/" 2>/dev/null || log "Warning: Could not copy sensitive file $sensitive_file"
            chmod 600 "$SENSITIVE_DIR/$sensitive_file" 2>/dev/null
        fi
    done

    # Find and copy log files
    LOGS_DIR="$TEMP_DIR/logs"
    mkdir -p "$LOGS_DIR"

    find "$PROJECT_DIR" -name "*.log" -type f -exec cp {} "$LOGS_DIR/" \; 2>/dev/null

    # Create compressed archive
    if tar -czf "$BACKUP_FILE" -C "$TEMP_DIR" .; then
        log "File backup created successfully"
        FILE_COUNT=$(find "$TEMP_DIR" -type f | wc -l)
        log "Total files backed up: $FILE_COUNT"
    else
        error_log "Failed to create file backup"
        rm -rf "$TEMP_DIR"
        return 1
    fi

    # Cleanup temp directory
    rm -rf "$TEMP_DIR"

    # Run compliance check
    check_compliance "$BACKUP_FILE"

    log "File backup completed successfully"
    return 0
}

# Cleanup function
cleanup_old_backups() {
    log "Starting cleanup of old backups..."

    # Clean up database backups
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +$DB_BACKUP_RETENTION -delete -print |
            while read -r file; do
                log "Removed old database backup: $file"
            done

        # Clean up file backups
        find "$BACKUP_DIR" -name "files-*.tar.gz" -mtime +$FILE_BACKUP_RETENTION -delete -print |
            while read -r file; do
                log "Removed old file backup: $file"
            done
    fi

    # Clean up old logs
    if [[ -d "$LOG_DIR" ]]; then
        find "$LOG_DIR" -name "*.log" -mtime +$LOG_RETENTION -delete -print |
            while read -r file; do
                log "Removed old log file: $file"
            done
    fi

    log "Cleanup completed"
}

# Disk space check
check_disk_space() {
    local threshold=90  # Alert if disk usage > 90%
    local usage=$(df "$PROJECT_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')

    if (( usage > threshold )); then
        error_log "Disk space usage is at ${usage}%, which exceeds threshold of ${threshold}%"
        return 1
    else
        log "Disk space usage: ${usage}%"
        return 0
    fi
}

# Health check function
backup_health_check() {
    log "Running backup health check..."

    local issues=0

    # Check if backup directory exists and has space
    if [[ ! -d "$BACKUP_DIR" ]]; then
        error_log "Backup directory does not exist: $BACKUP_DIR"
        ((issues++))
    fi

    # Check for recent backups
    local recent_db_backups=$(find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime -7 2>/dev/null | wc -l)
    local recent_file_backups=$(find "$BACKUP_DIR" -name "files-*.tar.gz" -mtime -7 2>/dev/null | wc -l)

    if (( recent_db_backups == 0 )); then
        error_log "No recent database backups found (last 7 days)"
        ((issues++))
    else
        log "Found $recent_db_backups recent database backups"
    fi

    if (( recent_file_backups == 0 )); then
        error_log "No recent file backups found (last 7 days)"
        ((issues++))
    else
        log "Found $recent_file_backups recent file backups"
    fi

    # Check backup sizes
    local total_backup_size=$(du -sb "$BACKUP_DIR" 2>/dev/null | cut -f1)
    local total_backup_size_mb=$(( total_backup_size / 1024 / 1024 ))
    log "Total backup size: ${total_backup_size_mb} MB"

    if (( total_backup_size_mb < 1 )); then
        error_log "Total backup size is suspiciously small: ${total_backup_size_mb} MB"
        ((issues++))
    fi

    if (( issues > 0 )); then
        error_log "Backup health check found $issues issue(s)"
        return 1
    else
        log "Backup health check passed"
        return 0
    fi
}

# Main execution function
main() {
    log "=== Backup Cron Script Started ==="
    log "Project Directory: $PROJECT_DIR"
    log "Backup Directory: $BACKUP_DIR"

    # Change to project directory
    cd "$PROJECT_DIR" || {
        error_log "Cannot change to project directory: $PROJECT_DIR"
        exit 1
    }

    # Pre-flight checks
    if ! check_disk_space; then
        log "Skipping backup due to disk space issues"
        exit 1
    fi

    # Run backups
    local errors=0

    if backup_database; then
        log "Database backup completed successfully"
    else
        error_log "Database backup failed"
        ((errors++))
    fi

    if backup_files; then
        log "File backup completed successfully"
    else
        error_log "File backup failed"
        ((errors++))
    fi

    # Cleanup
    cleanup_old_backups

    # Health check
    if backup_health_check; then
        log "Backup health check passed"
    else
        error_log "Backup health check failed"
        ((errors++))
    fi

    log "=== Backup Cron Script Completed ==="

    # Exit with error code if there were failures
    if (( errors > 0 )); then
        error_log "Backup script completed with $errors error(s)"
        exit 1
    else
        log "Backup script completed successfully"
        exit 0
    fi
}

# Run main function
main "$@"
