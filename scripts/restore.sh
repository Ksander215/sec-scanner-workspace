#!/usr/bin/env bash
set -euo pipefail

# restore.sh — Restore SIP data from a backup archive
# Usage: ./restore.sh <backup-file> [--restart]

BACKUP_FILE="${1:?Usage: $0 <backup-file.tar.gz> [--restart]}"
RESTART_SERVICES=false
DATA_DIR="/var/lib/sip"

[ "${2:-}" = "--restart" ] && RESTART_SERVICES=true

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

# --- Validate backup file ---
[ -f "$BACKUP_FILE" ] || die "Backup file not found: $BACKUP_FILE"

if [ -f "${BACKUP_FILE}.sha256" ]; then
  log "Verifying backup integrity..."
  sha256sum -c "${BACKUP_FILE}.sha256" || die "Checksum verification failed! Backup may be corrupted."
  log "Checksum verified."
else
  log "WARNING: No checksum file found for ${BACKUP_FILE}. Skipping integrity check."
fi

# --- Stop services if restart requested ---
if [ "$RESTART_SERVICES" = true ]; then
  log "Stopping SIP services..."
  docker compose -f "$(dirname "$0")/../docker/docker-compose.yml" down 2>/dev/null || true
fi

# --- Create safety backup of current data ---
if [ -d "$DATA_DIR" ] && [ "$(ls -A "$DATA_DIR" 2>/dev/null)" ]; then
  SAFETY_BACKUP="${DATA_DIR}.pre-restore-$(date '+%Y%m%d_%H%M%S')"
  log "Creating safety backup of current data at ${SAFETY_BACKUP}..."
  cp -r "$DATA_DIR" "$SAFETY_BACKUP"
fi

# --- Restore data ---
log "Restoring data from ${BACKUP_FILE}..."
rm -rf "${DATA_DIR:?}/"*
tar -xzf "$BACKUP_FILE" -C "$(dirname "$DATA_DIR")"
log "Data restored to ${DATA_DIR}."

# --- Restart services if requested ---
if [ "$RESTART_SERVICES" = true ]; then
  log "Starting SIP services..."
  docker compose -f "$(dirname "$0")/../docker/docker-compose.yml" up -d
  log "Services restarted."
fi

log "Restore completed successfully."
