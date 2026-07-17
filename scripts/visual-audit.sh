#!/bin/bash
# Visual audit script for sec-scanner.pro
# Visits each page, screenshots, checks for JS errors

BASE="https://sec-scanner.pro"
OUTDIR="/home/z/my-project/download/qa-screenshots"
mkdir -p "$OUTDIR"

PAGES=(
  "/"
  "/platform"
  "/app/dashboard"
  "/app/workspace"
  "/app/projects"
  "/app/scans"
  "/app/findings"
  "/app/risks"
  "/app/demo"
  "/app/demo/knowledge-graph"
  "/app/demo/attack-paths"
  "/app/playground"
  "/app/reports"
  "/app/marketplace"
  "/app/docs"
  "/app/downloads"
  "/app/community"
  "/app/settings"
)

NAMES=(
  "homepage"
  "platform"
  "dashboard"
  "workspace"
  "projects"
  "scans"
  "findings"
  "risks"
  "demo"
  "knowledge-graph"
  "attack-paths"
  "playground"
  "reports"
  "marketplace"
  "docs"
  "downloads"
  "community"
  "settings"
)

echo "=== Visual Audit: $(date) ==="

for i in "${!PAGES[@]}"; do
  PAGE="${PAGES[$i]}"
  NAME="${NAMES[$i]}"
  URL="${BASE}${PAGE}"
  SCREENSHOT="${OUTDIR}/$(printf '%02d' $((i+1)))-${NAME}.png"
  
  echo ""
  echo "--- [$((i+1))/18] ${NAME}: ${URL} ---"
  
  # Navigate to page
  agent-browser open "$URL" 2>&1
  agent-browser wait --load networkidle 2>&1
  
  # Take screenshot
  agent-browser screenshot "$SCREENSHOT" 2>&1
  
  # Check for JS errors
  ERRORS=$(agent-browser errors 2>&1)
  if echo "$ERRORS" | grep -q "Error\|error\|TypeError\|ReferenceError"; then
    echo "⚠️  JS ERRORS FOUND on ${NAME}:"
    echo "$ERRORS"
  else
    echo "✅ No JS errors"
  fi
  
  # Get page title
  TITLE=$(agent-browser get title 2>&1)
  echo "Title: $TITLE"
  
  # Check HTTP status by looking at page content
  BODY_TEXT=$(agent-browser snapshot -c 2>&1 | head -5)
  if echo "$BODY_TEXT" | grep -q "404\|Not Found\|This page could not be found"; then
    echo "❌ 404 PAGE NOT FOUND"
  else
    echo "✅ Page loaded"
  fi
done

echo ""
echo "=== Audit Complete ==="
echo "Screenshots saved to: $OUTDIR"
