#!/bin/bash
# ============================================================================
# PostgreSQL Automated Backup Script for K_01 Auth Backend
# ============================================================================
# Purpose: Creates encrypted database backups with rotation policy
# Fixes: C-4 from database security audit (no backup strategy)
# Usage: 
#   - Run manually: ./backup-database.sh
#   - Cron job: 0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1
# ============================================================================

set -euo pipefail  # Exit on error, undefined variable, pipe failure

# ────────────────────────────────────────────────────────────────────────────
# Configuration
# ────────────────────────────────────────────────────────────────────────────

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_CONTAINER="${DB_CONTAINER:-auth_postgres}"
DB_USER="${DB_USER:-authuser}"
DB_NAME="${DB_NAME:-auth_db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"  # Keep backups for 30 days
ENCRYPTION_PASSWORD="${DB_BACKUP_PASSWORD:-}"  # Set in .env for encryption

# Backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="auth_db_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
ENCRYPTED_FILE="${COMPRESSED_FILE}.enc"

# ────────────────────────────────────────────────────────────────────────────
# Validation
# ────────────────────────────────────────────────────────────────────────────

if ! command -v docker &> /dev/null; then
    echo "❌ ERROR: Docker not found. Please install Docker."
    exit 1
fi

if ! docker ps --filter "name=${DB_CONTAINER}" --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
    echo "❌ ERROR: Database container '${DB_CONTAINER}' is not running."
    exit 1
fi

# ────────────────────────────────────────────────────────────────────────────
# Create Backup Directory
# ────────────────────────────────────────────────────────────────────────────

mkdir -p "${BACKUP_DIR}"
cd "${BACKUP_DIR}"

echo "🚀 Starting database backup..."
echo "────────────────────────────────────────"
echo "   Database: ${DB_NAME}"
echo "   Container: ${DB_CONTAINER}"
echo "   Timestamp: ${TIMESTAMP}"
echo "   Output: ${BACKUP_DIR}/${ENCRYPTED_FILE}"
echo "────────────────────────────────────────"

# ────────────────────────────────────────────────────────────────────────────
# Step 1: Create SQL Dump
# ────────────────────────────────────────────────────────────────────────────

echo "📦 Step 1/4: Creating SQL dump..."
if docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" > "${BACKUP_FILE}"; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "   ✅ SQL dump created: ${BACKUP_SIZE}"
else
    echo "   ❌ Failed to create SQL dump"
    exit 1
fi

# ────────────────────────────────────────────────────────────────────────────
# Step 2: Compress Backup
# ────────────────────────────────────────────────────────────────────────────

echo "📦 Step 2/4: Compressing backup..."
if gzip -9 "${BACKUP_FILE}"; then  # -9 = maximum compression
    COMPRESSED_SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)
    echo "   ✅ Backup compressed: ${COMPRESSED_SIZE}"
else
    echo "   ❌ Failed to compress backup"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# ────────────────────────────────────────────────────────────────────────────
# Step 3: Encrypt Backup (Optional but Recommended)
# ────────────────────────────────────────────────────────────────────────────

if [ -n "${ENCRYPTION_PASSWORD}" ]; then
    echo "🔒 Step 3/4: Encrypting backup..."
    if openssl enc -aes-256-cbc -salt -pbkdf2 -in "${COMPRESSED_FILE}" -out "${ENCRYPTED_FILE}" -k "${ENCRYPTION_PASSWORD}"; then
        ENCRYPTED_SIZE=$(du -h "${ENCRYPTED_FILE}" | cut -f1)
        echo "   ✅ Backup encrypted (AES-256-CBC): ${ENCRYPTED_SIZE}"
        rm -f "${COMPRESSED_FILE}"  # Remove unencrypted file
        FINAL_FILE="${ENCRYPTED_FILE}"
    else
        echo "   ❌ Failed to encrypt backup"
        rm -f "${COMPRESSED_FILE}"
        exit 1
    fi
else
    echo "⚠️  Step 3/4: Skipping encryption (DB_BACKUP_PASSWORD not set)"
    FINAL_FILE="${COMPRESSED_FILE}"
fi

# ────────────────────────────────────────────────────────────────────────────
# Step 4: Cleanup Old Backups
# ────────────────────────────────────────────────────────────────────────────

echo "🧹 Step 4/4: Cleaning up old backups (>${RETENTION_DAYS} days)..."
DELETED_COUNT=$(find . -name "auth_db_backup_*.sql.gz*" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "${DELETED_COUNT}" -gt 0 ]; then
    echo "   ✅ Deleted ${DELETED_COUNT} old backup(s)"
else
    echo "   ℹ️  No old backups to delete"
fi

# ────────────────────────────────────────────────────────────────────────────
# Verify Backup Integrity
# ────────────────────────────────────────────────────────────────────────────

echo "✅ Backup completed successfully!"
echo "────────────────────────────────────────"
echo "   📁 File: ${FINAL_FILE}"
echo "   📊 Size: $(du -h "${FINAL_FILE}" | cut -f1)"
echo "   🔒 Encrypted: $([ -n "${ENCRYPTION_PASSWORD}" ] && echo "Yes (AES-256)" || echo "No")"
echo "────────────────────────────────────────"

# ────────────────────────────────────────────────────────────────────────────
# Optional: Upload to Cloud Storage (Uncomment and configure)
# ────────────────────────────────────────────────────────────────────────────

# AWS S3 Example:
# if command -v aws &> /dev/null; then
#     echo "☁️  Uploading to S3..."
#     aws s3 cp "${FINAL_FILE}" "s3://your-backup-bucket/k01-backups/" --storage-class GLACIER
#     echo "   ✅ Uploaded to S3"
# fi

# Azure Blob Storage Example:
# if command -v az &> /dev/null; then
#     echo "☁️  Uploading to Azure..."
#     az storage blob upload --account-name youraccountname --container-name backups --name "${FINAL_FILE}" --file "${FINAL_FILE}"
#     echo "   ✅ Uploaded to Azure"
# fi

# Google Cloud Storage Example:
# if command -v gsutil &> /dev/null; then
#     echo "☁️  Uploading to GCS..."
#     gsutil cp "${FINAL_FILE}" "gs://your-backup-bucket/k01-backups/"
#     echo "   ✅ Uploaded to GCS"
# fi

echo ""
echo "📝 Backup log:"
echo "   - Manual restore: gunzip -c ${COMPRESSED_FILE} | docker exec -i ${DB_CONTAINER} psql -U ${DB_USER} ${DB_NAME}"
echo "   - Encrypted restore: openssl enc -aes-256-cbc -d -pbkdf2 -in ${ENCRYPTED_FILE} -k \$PASSWORD | gunzip -c | docker exec -i ${DB_CONTAINER} psql -U ${DB_USER} ${DB_NAME}"
echo ""
echo "💡 TIP: Add this to crontab for daily backups:"
echo "   0 2 * * * cd /path/to/backend && ./scripts/backup-database.sh >> /var/log/db-backup.log 2>&1"
echo ""

exit 0
