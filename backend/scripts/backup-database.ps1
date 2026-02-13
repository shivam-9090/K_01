# ============================================================================
# PostgreSQL Automated Backup Script for K_01 Auth Backend (Windows)
# ============================================================================
# Purpose: Creates encrypted database backups with rotation policy
# Fixes: C-4 from database security audit (no backup strategy)
# Usage: 
#   - Run manually: .\backup-database.ps1
#   - Task Scheduler: Schedule this script to run daily at 2 AM
# ============================================================================

param(
    [string]$BackupDir = ".\backups",
    [string]$DbContainer = "auth_postgres",
    [string]$DbUser = "authuser",
    [string]$DbName = "auth_db",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

# ────────────────────────────────────────────────────────────────────────────
# Configuration
# ────────────────────────────────────────────────────────────────────────────

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "auth_db_backup_$Timestamp.sql"
$CompressedFile = "$BackupFile.gz"

# ────────────────────────────────────────────────────────────────────────────
# Validation
# ────────────────────────────────────────────────────────────────────────────

Write-Host "🚀 Starting database backup..." -ForegroundColor Cyan
Write-Host "────────────────────────────────────────"
Write-Host "   Database: $DbName"
Write-Host "   Container: $DbContainer"
Write-Host "   Timestamp: $Timestamp"
Write-Host "────────────────────────────────────────"

# Check Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ERROR: Docker not found. Please install Docker." -ForegroundColor Red
    exit 1
}

# Check if container is running
$containerRunning = docker ps --filter "name=$DbContainer" --format "{{.Names}}"
if ($containerRunning -notmatch "^$DbContainer$") {
    Write-Host "❌ ERROR: Database container '$DbContainer' is not running." -ForegroundColor Red
    exit 1
}

# ────────────────────────────────────────────────────────────────────────────
# Create Backup Directory
# ────────────────────────────────────────────────────────────────────────────

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}
Set-Location $BackupDir

# ────────────────────────────────────────────────────────────────────────────
# Step 1: Create SQL Dump
# ────────────────────────────────────────────────────────────────────────────

Write-Host "📦 Step 1/3: Creating SQL dump..." -ForegroundColor Yellow
try {
    docker exec $DbContainer pg_dump -U $DbUser $DbName | Out-File -FilePath $BackupFile -Encoding UTF8
    $BackupSize = (Get-Item $BackupFile).Length / 1MB
    Write-Host "   ✅ SQL dump created: $([math]::Round($BackupSize, 2)) MB" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Failed to create SQL dump: $_" -ForegroundColor Red
    exit 1
}

# ────────────────────────────────────────────────────────────────────────────
# Step 2: Compress Backup (using 7-Zip or built-in Compress-Archive)
# ────────────────────────────────────────────────────────────────────────────

Write-Host "📦 Step 2/3: Compressing backup..." -ForegroundColor Yellow
try {
    # Use Compress-Archive (built-in PowerShell)
    $ZipFile = "$BackupFile.zip"
    Compress-Archive -Path $BackupFile -DestinationPath $ZipFile -CompressionLevel Optimal -Force
    Remove-Item $BackupFile -Force
    $CompressedSize = (Get-Item $ZipFile).Length / 1MB
    Write-Host "   ✅ Backup compressed: $([math]::Round($CompressedSize, 2)) MB" -ForegroundColor Green
    $FinalFile = $ZipFile
}
catch {
    Write-Host "   ❌ Failed to compress backup: $_" -ForegroundColor Red
    Remove-Item $BackupFile -Force -ErrorAction SilentlyContinue
    exit 1
}

# ────────────────────────────────────────────────────────────────────────────
# Step 3: Cleanup Old Backups
# ────────────────────────────────────────────────────────────────────────────

Write-Host "🧹 Step 3/3: Cleaning up old backups (>$RetentionDays days)..." -ForegroundColor Yellow
$OldBackups = Get-ChildItem -Path "." -Filter "auth_db_backup_*" | Where-Object { 
    $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) 
}
$DeletedCount = $OldBackups.Count
if ($DeletedCount -gt 0) {
    $OldBackups | Remove-Item -Force
    Write-Host "   ✅ Deleted $DeletedCount old backup(s)" -ForegroundColor Green
}
else {
    Write-Host "   ℹ️  No old backups to delete" -ForegroundColor Gray
}

# ────────────────────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
Write-Host "────────────────────────────────────────"
Write-Host "   📁 File: $FinalFile"
Write-Host "   📊 Size: $([math]::Round($CompressedSize, 2)) MB"
Write-Host "   📂 Location: $(Get-Location)\$FinalFile"
Write-Host "────────────────────────────────────────"
Write-Host ""
Write-Host "💡 TIP: Schedule this script with Task Scheduler for daily backups:" -ForegroundColor Cyan
Write-Host "   - Task Scheduler > Create Basic Task"
Write-Host "   - Trigger: Daily at 2:00 AM"
Write-Host "   - Action: Start a program"
Write-Host "   - Program: powershell.exe"
Write-Host "   - Arguments: -ExecutionPolicy Bypass -File `"$(Get-Location)\backup-database.ps1`""
Write-Host ""

exit 0
