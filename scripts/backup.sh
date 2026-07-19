#!/usr/bin/env bash
set -euo pipefail

# backup.sh — Backup SIP data from /var/lib/sip
# Usage: ./backup.sh [backup-dir]

BACKUP_DIR="${1:-/var/backups/sip}"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP_FILE="${BACKUP_DIR}/sip-backup-${TIMESTAMP}.tar.gz"
DATA_DIR="/var/lib/sip"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

# --- Pre-flight ---
[ -d "$DATA_DIR" ] || die "Data directory not found: $DATA_DIR"
mkdir -p "$BACKUP_DIR"

# --- Create backup ---
log "Creating backup of ${DATA_DIR}..."
tar -czf "$BACKUP_FILE" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")" \
  || die "Failed to create backup archive"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
log "Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# --- Generate checksum ---
sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"
log "Checksum written: ${BACKUP_FILE}.sha256"

# --- Prune old backups ---
log "Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "sip-backup-*.tar.gz" -type f -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "sip-backup-*.tar.gz.sha256" -type f -mtime +"$RETENTION_DAYS" -delete
log "Old backups pruned."

# --- Summary ---
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "sip-backup-*.tar.gz" | wc -l)
log "Backup complete. Total backups: ${TOTAL_BACKUPS}"
