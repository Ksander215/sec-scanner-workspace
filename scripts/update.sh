#!/usr/bin/env bash
set -euo pipefail

# update.sh — Update SIP: git pull, rebuild, restart
# Usage: ./update.sh [--skip-build] [--skip-restart]

SKIP_BUILD=false
SKIP_RESTART=false

for arg in "$@"; do
  case "$arg" in
    --skip-build)   SKIP_BUILD=true ;;
    --skip-restart) SKIP_RESTART=true ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BRANCH="${GIT_BRANCH:-main}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

# --- Pull latest code ---
log "========== Updating SIP =========="
cd "$PROJECT_DIR"
log "Current branch: $(git rev-parse --abbrev-ref HEAD)"
log "Pulling latest changes from origin/${BRANCH}..."
git fetch origin "$BRANCH"
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse "origin/${BRANCH}")

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
  log "Already up to date. No changes to pull."
else
  git reset --hard "origin/${BRANCH}"
  log "Updated: ${LOCAL_HASH:0:8} -> ${REMOTE_HASH:0:8}"
fi

# --- Install dependencies ---
log "Installing dependencies..."
cd "${PROJECT_DIR}/landing" && npm ci
cd "${PROJECT_DIR}/backend" && npm ci

# --- Build ---
if [ "$SKIP_BUILD" = false ]; then
  log "Building frontend..."
  cd "${PROJECT_DIR}/landing" && npm run build

  log "Building backend..."
  cd "${PROJECT_DIR}/backend" && npm run build
else
  log "Skipping build (--skip-build)."
fi

# --- Restart services ---
if [ "$SKIP_RESTART" = false ]; then
  log "Restarting services..."
  cd "$PROJECT_DIR"
  docker compose -f docker/docker-compose.yml up -d --build
  log "Services restarted."
else
  log "Skipping restart (--skip-restart)."
fi

# --- Health check ---
log "Running health check..."
for i in $(seq 1 10); do
  HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "http://localhost:3001/api/health" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    log "Health check passed! Update completed successfully."
    exit 0
  fi
  sleep 3
done

log "WARNING: Health check did not pass after 30s. Verify services manually."
exit 1
