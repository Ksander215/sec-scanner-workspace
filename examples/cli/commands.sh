#!/usr/bin/env bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Security Intelligence Platform — CLI Command Reference
#
# All 10 top-level commands with their subcommands and common flags.
# Run: chmod +x examples/cli/commands.sh && ./examples/cli/commands.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
SI="${SI:-si}"                         # CLI binary name
FORMAT="${FORMAT:-table}"              # Default output format: table|json|yaml|csv|jsonl|markdown
REPORT_ID="${REPORT_ID:-}"             # Set after first analysis

# ── 1. analyze — Run security analysis ────────────────────────────────────
echo "━━━ 1. ANALYZE ━━━"

# Analyze from a scan results file (local engine)
$SI analyze scan-results.json \
  --persist \
  --explain \
  --format json \
  --output report.json

# Analyze using remote REST API
$SI analyze scan-results.json \
  --remote \
  --format table

# Analyze without explanations or attack paths (faster)
$SI analyze findings.json \
  --no-explain \
  --format jsonl

# ── 2. reports — Manage analysis reports ──────────────────────────────────
echo "━━━ 2. REPORTS ━━━"

# List all saved reports
$SI reports list --format "$FORMAT" --limit 50

# Show a specific report
$SI reports show "$REPORT_ID" --format json

# Export report to file
$SI reports export "$REPORT_ID" \
  --format markdown \
  --output security-report.md

# ── 3. findings — Query security findings ─────────────────────────────────
echo "━━━ 3. FINDINGS ━━━"

# List findings for a report
$SI findings list --report "$REPORT_ID" --format "$FORMAT" --limit 100

# Search findings by keyword
$SI findings search "SQL injection" --format json --limit 20

# Export findings as CSV
$SI findings export \
  --report "$REPORT_ID" \
  --format csv \
  --output findings.csv

# ── 4. risk — Risk assessment ─────────────────────────────────────────────
echo "━━━ 4. RISK ━━━"

# Show risk summary for a report
$SI risk summary --report "$REPORT_ID" --format table

# Show top risks across all reports
$SI risk top --limit 10 --format json

# Show all risks for a report
$SI risk show --report "$REPORT_ID" --format "$FORMAT"

# ── 5. attack — Attack path analysis ─────────────────────────────────────
echo "━━━ 5. ATTACK ━━━"

# List attack paths for a report
$SI attack list --report "$REPORT_ID" --format table

# Show full attack graph
$SI attack graph --report "$REPORT_ID" --format json

# Simulate attack path (experimental)
$SI attack simulate --report "$REPORT_ID" --format json

# ── 6. recommend — Security recommendations ──────────────────────────────
echo "━━━ 6. RECOMMEND ━━━"

# List recommendations for a report
$SI recommend list --report "$REPORT_ID" --format table

# Generate a remediation plan
$SI recommend plan --report "$REPORT_ID" --format json

# Export recommendations as Markdown
$SI recommend export \
  --report "$REPORT_ID" \
  --format markdown \
  --output recommendations.md

# ── 7. explain — Explainability ───────────────────────────────────────────
echo "━━━ 7. EXPLAIN ━━━"

# Explain why a finding was flagged
$SI explain finding "finding-001" --format json

# Explain a risk assessment
$SI explain risk "risk-001" --format table

# Explain a recommendation
$SI explain recommendation "rec-001" --format json

# ── 8. snapshot — Snapshot management ─────────────────────────────────────
echo "━━━ 8. SNAPSHOT ━━━"

# Create a snapshot of a report
$SI snapshot create \
  --report "$REPORT_ID" \
  --description "Pre-patch baseline"

# Restore from a snapshot
SNAPSHOT_ID="snap-001"
$SI snapshot restore "$SNAPSHOT_ID"

# ── 9. config — Configuration management ─────────────────────────────────
echo "━━━ 9. CONFIG ━━━"

# Initialize configuration
$SI config init

# Show current configuration
$SI config show

# Set configuration values
$SI config set output.format json
$SI config set api.baseUrl http://localhost:8080
$SI config set api.authToken my-jwt-token
$SI config set api.timeout 60000

# ── 10. server — API server management ───────────────────────────────────
echo "━━━ 10. SERVER ━━━"

# Start the API server
$SI server start --port 8080 --host 0.0.0.0 &

# Check server status
$SI server status

# Stop the API server
$SI server stop

# ── Bonus: storage-stats & migrate ───────────────────────────────────────
echo "━━━ BONUS ━━━"

# Show storage statistics
$SI storage-stats --format json

# Run database migrations
$SI migrate

echo ""
echo "All CLI commands demonstrated. Set REPORT_ID to run report-dependent commands."
