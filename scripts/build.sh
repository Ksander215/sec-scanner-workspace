#!/usr/bin/env bash
set -euo pipefail

# build.sh — Build both frontend and backend for SIP
# Usage: ./build.sh [--frontend|--backend|--all]

TARGET="${1:---all}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

build_frontend() {
  log "========== Building Frontend =========="
  cd "${PROJECT_DIR}/landing"
  [ -f package.json ] || die "package.json not found in landing/"
  log "Installing frontend dependencies..."
  npm ci
  log "Running frontend build..."
  npm run build
  log "Frontend build completed successfully."
}

build_backend() {
  log "========== Building Backend =========="
  cd "${PROJECT_DIR}/backend"
  [ -f package.json ] || die "package.json not found in backend/"
  log "Installing backend dependencies..."
  npm ci
  log "Running backend build..."
  npm run build
  log "Backend build completed successfully."
}

case "$TARGET" in
  --frontend)
    build_frontend
    ;;
  --backend)
    build_backend
    ;;
  --all)
    build_frontend
    build_backend
    ;;
  *)
    die "Unknown target: ${TARGET}. Use --frontend, --backend, or --all"
    ;;
esac

log "========== Build Finished =========="
