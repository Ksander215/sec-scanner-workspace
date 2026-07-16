#!/usr/bin/env bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Security Intelligence Platform — REST API Usage Examples
#
# Covers all 28 API endpoints with curl examples.
# Prerequisites: Server running at $SI_URL (default http://localhost:8080)
#
# Run:  chmod +x examples/rest/api-usage.sh && ./examples/rest/api-usage.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -euo pipefail

SI_URL="${SI_URL:-http://localhost:8080}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
API_KEY="${API_KEY:-si-api-key-dev}"

# Build auth headers
AUTH_HEADERS="-H 'Content-Type: application/json' -H 'Accept: application/json'"
if [[ -n "$AUTH_TOKEN" ]]; then
  AUTH_HEADERS="$AUTH_HEADERS -H 'Authorization: Bearer $AUTH_TOKEN'"
fi
if [[ -n "$API_KEY" ]]; then
  AUTH_HEADERS="$AUTH_HEADERS -H 'X-API-Key: $API_KEY'"
fi

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Security Intelligence Platform — 28 REST API Endpoints    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Server: $SI_URL"
echo ""

# ── ANALYSIS (2 endpoints) ────────────────────────────────────────────────

echo "━━━ ANALYSIS ━━━"

# 1. POST /api/v1/analyze — Async analysis (returns 202 Accepted)
echo "# 1. POST /api/v1/analyze (async)"
curl -s -X POST "$SI_URL/api/v1/analyze" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "findings": [
      {
        "id": "f-001",
        "source": "trivy",
        "sourceId": "CVE-2024-3094",
        "name": "XZ Utils Backdoor",
        "description": "Compromised xz-utils allows RCE via SSH",
        "severity": "critical",
        "category": "vulnerability",
        "host": "web-01.example.com",
        "port": 22,
        "protocol": "tcp",
        "timestamp": "2024-04-01T12:00:00Z"
      },
      {
        "id": "f-002",
        "source": "checkov",
        "sourceId": "CKV_AWS_79",
        "name": "S3 Public Access",
        "description": "S3 bucket allows public read",
        "severity": "high",
        "category": "misconfiguration",
        "host": "s3://my-bucket",
        "timestamp": "2024-04-01T12:05:00Z"
      }
    ],
    "options": {
      "persist": true,
      "explain": true,
      "includeAttackPaths": true,
      "includeImpact": true
    }
  }' | jq .
echo ""

# 2. POST /api/v1/analyze/sync — Synchronous analysis (waits for completion)
echo "# 2. POST /api/v1/analyze/sync (sync — blocks until done)"
REPORT_JSON=$(curl -s -X POST "$SI_URL/api/v1/analyze/sync" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "findings": [
      {
        "id": "f-101",
        "source": "gitleaks",
        "sourceId": "GL-001",
        "name": "Exposed AWS Secret Key",
        "description": "AWS secret key found in config file",
        "severity": "critical",
        "category": "secret",
        "host": "app-01.example.com",
        "path": "/app/config/credentials.yml",
        "timestamp": "2024-04-01T13:00:00Z"
      }
    ],
    "options": { "persist": true, "explain": true }
  }')

REPORT_ID=$(echo "$REPORT_JSON" | jq -r '.id // empty')
echo "Report ID: $REPORT_ID"
echo ""

# ── REPORTS (4 endpoints) ─────────────────────────────────────────────────

echo "━━━ REPORTS ━━━"

# 3. GET /api/v1/reports — List reports (paginated)
echo "# 3. GET /api/v1/reports"
curl -s "$SI_URL/api/v1/reports?limit=10&offset=0" \
  -H 'Accept: application/json' \
  -H "X-API-Key: $API_KEY" | jq .
echo ""

# 4. GET /api/v1/reports/:id — Get a specific report
echo "# 4. GET /api/v1/reports/:id"
if [[ -n "$REPORT_ID" ]]; then
  curl -s "$SI_URL/api/v1/reports/$REPORT_ID" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq '.id, .timestamp, .riskSummary'
fi
echo ""

# 5. GET /api/v1/reports/:id/summary — Get report summary
echo "# 5. GET /api/v1/reports/:id/summary"
if [[ -n "$REPORT_ID" ]]; then
  curl -s "$SI_URL/api/v1/reports/$REPORT_ID/summary" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq .
fi
echo ""

# 6. DELETE /api/v1/reports/:id — Delete a report
echo "# 6. DELETE /api/v1/reports/:id"
OLD_REPORT="report-to-delete-id"
curl -s -X DELETE "$SI_URL/api/v1/reports/$OLD_REPORT" \
  -H 'Accept: application/json' \
  -H "X-API-Key: $API_KEY" | jq .
echo ""

# ── FINDINGS (3 endpoints) ────────────────────────────────────────────────

echo "━━━ FINDINGS ━━━"

# 7. GET /api/v1/findings — List findings for a report
echo "# 7. GET /api/v1/findings?reportId=..."
if [[ -n "$REPORT_ID" ]]; then
  curl -s "$SI_URL/api/v1/findings?reportId=$REPORT_ID&limit=50&offset=0" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq '.total, (.data[:2] // [])'
fi
echo ""

# 8. GET /api/v1/findings/:id — Get a specific finding
echo "# 8. GET /api/v1/findings/:id"
curl -s "$SI_URL/api/v1/findings/f-101" \
  -H 'Accept: application/json' \
  -H "X-API-Key: $API_KEY" | jq .
echo ""

# 9. GET /api/v1/findings/search?q=... — Search findings
echo "# 9. GET /api/v1/findings/search?q=..."
curl -s "$SI_URL/api/v1/findings/search?q=backdoor&limit=10&offset=0" \
  -H 'Accept: application/json' \
  -H "X-API-Key: $API_KEY" | jq .
echo ""

# ── RISK (3 endpoints) ───────────────────────────────────────────────────

echo "━━━ RISK ━━━"

# 10. GET /api/v1/risks — List risks for a report
echo "# 10. GET /api/v1/risks?reportId=..."
if [[ -n "$REPORT_ID" ]]; then
  curl -s "$SI_URL/api/v1/risks?reportId=$REPORT_ID" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq '.total, (.data[:2] // [])'
fi
echo ""

# 11. GET /api/v1/risks/summary — Risk summary for a report
echo "# 11. GET /api/v1/risks/summary?reportId=..."
if [[ -n "$REPORT_ID" ]]; then
  curl -s "$SI_URL/api/v1/risks/summary?reportId=$REPORT_ID" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq .
fi
echo ""

# 12. GET /api/v1/risks/top — Top risks across all reports
echo "# 12. GET /api/v1/risks/top?limit=5"
curl -s "$SI_URL/api/v1/risks/top?limit=5" \
  -H 'Accept: application/json' \
  -H "X-API-Key: $API_KEY" | jq .
echo ""

# ── ATTACK PATHS (2 endpoints) ───────────────────────────────────────────

echo "━━━ ATTACK PATHS ━━━"

# 13. GET /api/v1/attack-paths — List attack paths for a report
echo "# 13. GET /api/v1/attack-paths?reportId=..."
if [[ -n "$REPORT_ID" ]]; then
  curl -s "$SI_URL/api/v1/attack-paths?reportId=$REPORT_ID" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq .
fi
echo ""

# 14. GET /api/v1/attack-paths/graph — Get attack graph for a report
echo "# 14. GET /api/v1/attack-paths/graph?reportId=..."
if [[ -n "$REPORT_ID" ]]; then
  curl -s "$SI_URL/api/v1/attack-paths/graph?reportId=$REPORT_ID" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq '.statistics'
fi
echo ""

# ── CORRELATIONS (2 endpoints) ───────────────────────────────────────────

echo "━━━ CORRELATIONS ━━━"

# 15. GET /api/v1/correlations — List correlations for a report
echo "# 15. GET /api/v1/correlations?reportId=..."
if [[ -n "$REPORT_ID" ]]; then
  curl -s "$SI_URL/api/v1/correlations?reportId=$REPORT_ID" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq '.total, (.data[:2] // [])'
fi
echo ""

# 16. GET /api/v1/correlations/groups — Correlation groups for a report
echo "# 16. GET /api/v1/correlations/groups?reportId=..."
if [[ -n "$REPORT_ID" ]]; then
  curl -s "$SI_URL/api/v1/correlations/groups?reportId=$REPORT_ID" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq .
fi
echo ""

# ── RECOMMENDATIONS (2 endpoints) ────────────────────────────────────────

echo "━━━ RECOMMENDATIONS ━━━"

# 17. GET /api/v1/recommendations — List recommendations for a report
echo "# 17. GET /api/v1/recommendations?reportId=..."
if [[ -n "$REPORT_ID" ]]; then
  curl -s "$SI_URL/api/v1/recommendations?reportId=$REPORT_ID" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq '.total, (.data[:2] // [])'
fi
echo ""

# 18. POST /api/v1/recommendations/plan — Create remediation plan
echo "# 18. POST /api/v1/recommendations/plan"
if [[ -n "$REPORT_ID" ]]; then
  curl -s -X POST "$SI_URL/api/v1/recommendations/plan" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" \
    -d "{\"reportId\": \"$REPORT_ID\"}" | jq .
fi
echo ""

# ── EXPLAINABILITY (2 endpoints) ─────────────────────────────────────────

echo "━━━ EXPLAINABILITY ━━━"

# 19. GET /api/v1/explanations — List explanations for a report
echo "# 19. GET /api/v1/explanations?reportId=..."
if [[ -n "$REPORT_ID" ]]; then
  curl -s "$SI_URL/api/v1/explanations?reportId=$REPORT_ID" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq '.total, (.data[:1] // [])'
fi
echo ""

# 20. GET /api/v1/explanations/:targetId — Explain a specific target
echo "# 20. GET /api/v1/explanations/:targetId"
curl -s "$SI_URL/api/v1/explanations/f-101" \
  -H 'Accept: application/json' \
  -H "X-API-Key: $API_KEY" | jq .
echo ""

# ── SNAPSHOTS (3 endpoints) ──────────────────────────────────────────────

echo "━━━ SNAPSHOTS ━━━"

# 21. POST /api/v1/snapshots — Create a snapshot
echo "# 21. POST /api/v1/snapshots"
SNAPSHOT_RESPONSE="{}"
if [[ -n "$REPORT_ID" ]]; then
  SNAPSHOT_RESPONSE=$(curl -s -X POST "$SI_URL/api/v1/snapshots" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" \
    -d "{\"reportId\": \"$REPORT_ID\", \"description\": \"Pre-patch baseline\"}")
  echo "$SNAPSHOT_RESPONSE" | jq .
fi
SNAPSHOT_ID=$(echo "$SNAPSHOT_RESPONSE" | jq -r '.snapshotId // empty')
echo ""

# 22. POST /api/v1/snapshots/:id/restore — Restore from snapshot
echo "# 22. POST /api/v1/snapshots/:id/restore"
if [[ -n "$SNAPSHOT_ID" ]]; then
  curl -s -X POST "$SI_URL/api/v1/snapshots/$SNAPSHOT_ID/restore" \
    -H 'Accept: application/json' \
    -H "X-API-Key: $API_KEY" | jq '.id, .timestamp'
fi
echo ""

# 23. GET /api/v1/snapshots — List all snapshots
echo "# 23. GET /api/v1/snapshots"
curl -s "$SI_URL/api/v1/snapshots" \
  -H 'Accept: application/json' \
  -H "X-API-Key: $API_KEY" | jq .
echo ""

# ── STORAGE (1 endpoint) ─────────────────────────────────────────────────

echo "━━━ STORAGE ━━━"

# 24. GET /api/v1/storage/statistics — Storage statistics
echo "# 24. GET /api/v1/storage/statistics"
curl -s "$SI_URL/api/v1/storage/statistics" \
  -H 'Accept: application/json' \
  -H "X-API-Key: $API_KEY" | jq .
echo ""

# ── HEALTH & OBSERVABILITY (4 endpoints) ─────────────────────────────────

echo "━━━ HEALTH & OBSERVABILITY ━━━"

# 25. GET /health — Health check
echo "# 25. GET /health"
curl -s "$SI_URL/health" | jq .
echo ""

# 26. GET /ready — Readiness probe
echo "# 26. GET /ready"
curl -s "$SI_URL/ready" | jq .
echo ""

# 27. GET /live — Liveness probe
echo "# 27. GET /live"
curl -s "$SI_URL/live" | jq .
echo ""

# 28. GET /metrics — Prometheus metrics
echo "# 28. GET /metrics"
curl -s "$SI_URL/metrics" | head -20
echo ""

echo "━━━ All 28 endpoints demonstrated ━━━"
