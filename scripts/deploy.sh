#!/usr/bin/env bash
set -euo pipefail

# deploy.sh — Deploy SIP to a remote server
# Usage: ./deploy.sh <server-ip> <ssh-key-path>

SERVER_IP="${1:?Usage: $0 <server-ip> <ssh-key-path>}"
SSH_KEY="${2:?Usage: $0 <server-ip> <ssh-key-path>}"
SSH_USER="${DEPLOY_USER:-root}"
REMOTE_DIR="${DEPLOY_DIR:-/opt/sip}"
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10)

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die()  { log "ERROR: $*" >&2; exit 1; }

# --- Pre-flight checks ---
log "Validating arguments..."
[ -f "$SSH_KEY" ] || die "SSH key not found: $SSH_KEY"
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SERVER_IP}" "echo ok" &>/dev/null || die "Cannot connect to ${SERVER_IP}"

# --- Pull latest code ---
log "Pulling latest code on ${SERVER_IP}..."
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SERVER_IP}" bash -s <<REMOTE
set -euo pipefail
cd "${REMOTE_DIR}" || exit 1
git fetch origin main
git reset --hard origin/main
REMOTE

# --- Build frontend locally and upload ---
log "Building frontend locally..."
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${PROJECT_DIR}/landing"
npm ci
npm run build

log "Uploading frontend build to ${SERVER_IP}..."
scp "${SSH_OPTS[@]}" -r "${PROJECT_DIR}/landing/out" "${SSH_USER}@${SERVER_IP}:/tmp/sip-frontend-build"
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SERVER_IP}" bash -s <<REMOTE
set -euo pipefail
rm -rf /var/www/sec-scanner.pro/*
cp -r /tmp/sip-frontend-build/* /var/www/sec-scanner.pro/
rm -rf /tmp/sip-frontend-build
REMOTE

# --- Build backend on server ---
log "Building backend on ${SERVER_IP}..."
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SERVER_IP}" bash -s <<REMOTE
set -euo pipefail
cd "${REMOTE_DIR}/backend"
npm ci
npm run build
REMOTE

# --- Restart services ---
log "Restarting services on ${SERVER_IP}..."
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SERVER_IP}" bash -s <<REMOTE
set -euo pipefail
cd "${REMOTE_DIR}"
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml up -d --build
REMOTE

# --- Health check ---
log "Running health check..."
MAX_RETRIES=10
SLEEP_INTERVAL=5
for i in $(seq 1 "$MAX_RETRIES"); do
  HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${SERVER_IP}/api/health" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    log "Health check passed (HTTP 200) on attempt ${i}/${MAX_RETRIES}"
    log "Deployment to ${SERVER_IP} completed successfully!"
    exit 0
  fi
  log "Health check attempt ${i}/${MAX_RETRIES} — HTTP ${HTTP_CODE}, retrying in ${SLEEP_INTERVAL}s..."
  sleep "$SLEEP_INTERVAL"
done

die "Health check failed after ${MAX_RETRIES} attempts. Deployment may be incomplete."
