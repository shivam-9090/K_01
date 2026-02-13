#!/bin/bash
# ============================================================================
# PostgreSQL Backup Restoration Script for K_01 Auth Backend
# ============================================================================
# Purpose: Safely restore database from encrypted backup
# Usage: ./restore-database.sh <backup_file>
# Example: ./restore-database.sh backups/auth_db_backup_20260213_020000.sql.gz.enc
# ============================================================================

set -euo pipefail

# ────────────────────────────────────────────────────────────────────────────
# Configuration
# ────────────────────────────────────────────────────────────────────────────

DB_CONTAINER="${DB_CONTAINER:-auth_postgres}"
DB_USER="${DB_USER:-authuser}"
DB_NAME="${DB_NAME:-auth_db}"
ENCRYPTION_PASSWORD="${DB_BACKUP_PASSWORD:-}"

BACKUP_FILE="$1"

# ────────────────────────────────────────────────────────────────────────────
# Validation
# ────────────────────────────────────────────────────────────────────────────

if [ -z "${BACKUP_FILE}" ]; then
    echo "❌ ERROR: No backup file specified"
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 backups/auth_db_backup_20260213_020000.sql.gz.enc"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ ERROR: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

if ! docker ps --filter "name=${DB_CONTAINER}" --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
    echo "❌ ERROR: Database container '${DB_CONTAINER}' is not running."
    exit 1
fi

# ────────────────────────────────────────────────────────────────────────────
# Confirmation Prompt (Safety Check)
# ────────────────────────────────────────────────────────────────────────────

echo "⚠️  WARNING: This will OVERWRITE the current database!"
echo "────────────────────────────────────────"
echo "   Database: ${DB_NAME}"
echo "   Container: ${DB_CONTAINER}"
echo "   Backup: ${BACKUP_FILE}"
echo "────────────────────────────────────────"
read -p "Are you sure you want to proceed? (type 'YES' to confirm): " CONFIRMATION

if [ "${CONFIRMATION}" != "YES" ]; then
    echo "❌ Restoration cancelled."
    exit 1
fi

# ────────────────────────────────────────────────────────────────────────────
# Restore Process
# ────────────────────────────────────────────────────────────────────────────

echo "🚀 Starting database restoration..."

# Detect if file is encrypted
if [[ "${BACKUP_FILE}" == *.enc ]]; then
    echo "🔒 Detected encrypted backup"
    
    if [ -z "${ENCRYPTION_PASSWORD}" ]; then
        echo "❌ ERROR: DB_BACKUP_PASSWORD environment variable not set"
        echo "   Please set the decryption password:"
        echo "   export DB_BACKUP_PASSWORD='your-password'"
        exit 1
    fi
    
    echo "📦 Decrypting and decompressing backup..."
    openssl enc -aes-256-cbc -d -pbkdf2 -in "${BACKUP_FILE}" -k "${ENCRYPTION_PASSWORD}" | \
    gunzip -c | \
    docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" "${DB_NAME}"
    
elif [[ "${BACKUP_FILE}" == *.gz ]]; then
    echo "📦 Decompressing backup..."
    gunzip -c "${BACKUP_FILE}" | \
    docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" "${DB_NAME}"
    
else
    echo "📦 Restoring plain SQL backup..."
    docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" "${DB_NAME}" < "${BACKUP_FILE}"
fi

# ────────────────────────────────────────────────────────────────────────────
# Verification
# ────────────────────────────────────────────────────────────────────────────

echo "✅ Database restoration completed!"
echo ""
echo "📊 Verifying database..."

TABLE_COUNT=$(docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
USER_COUNT=$(docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" "${DB_NAME}" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")

echo "   ✅ Tables: ${TABLE_COUNT}"
echo "   ✅ Users: ${USER_COUNT}"
echo ""
echo "⚠️  IMPORTANT: Restart the application to reload data:"
echo "   docker-compose restart app"
echo ""

exit 0
