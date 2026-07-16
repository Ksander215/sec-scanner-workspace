"""
Security Intelligence Platform — Full Python SDK Usage

Demonstrates all 18 methods on the SecurityIntelligenceClient.

Run:  python examples/sdk/python-usage.py
"""

import os
import json
from si_client import SecurityIntelligenceClient, SiApiError

# ── Configuration ──────────────────────────────────────────────────────────
client = SecurityIntelligenceClient(
    base_url=os.getenv("SI_URL", "http://localhost:8080"),
    auth_token=os.getenv("SI_AUTH_TOKEN"),       # JWT Bearer token
    api_key=os.getenv("SI_API_KEY", "si-api-key-dev"),
    timeout=60,
)


def demo(label: str, fn, truncate: int = 300):
    """Safely call an SDK method and print result."""
    try:
        result = fn()
        text = json.dumps(result, indent=2, default=str)[:truncate]
        print(f"  ✓ {label}")
        print(f"    {text}...\n")
        return result
    except SiApiError as e:
        print(f"  ✗ {label} — API Error {e.status_code}: {e.message}\n")
        return None
    except Exception as e:
        print(f"  ✗ {label} — {e}\n")
        return None


def main():
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║  Python SDK — Full Method Reference (18 methods)         ║")
    print("╚═══════════════════════════════════════════════════════════╝\n")

    # ── Analysis (2 methods) ───────────────────────────────────────────────

    print("━━━ ANALYSIS ━━━\n")

    # 1. analyze() — Async analysis (returns 202 with runId)
    demo("1. analyze() — async analysis", lambda: client.analyze(
        findings=[
            {
                "id": "f-001",
                "source": "trivy",
                "sourceId": "CVE-2024-3094",
                "name": "XZ Utils Backdoor",
                "description": "Compromised xz-utils allows RCE",
                "severity": "critical",
                "category": "vulnerability",
                "host": "prod-web-01.acme.io",
                "port": 22,
                "protocol": "tcp",
                "timestamp": "2024-04-01T12:00:00Z",
            },
            {
                "id": "f-002",
                "source": "checkov",
                "sourceId": "CKV_AWS_79",
                "name": "S3 Public Access",
                "description": "S3 bucket allows public read",
                "severity": "high",
                "category": "misconfiguration",
                "host": "s3://acme-assets",
                "timestamp": "2024-04-01T12:05:00Z",
            },
        ],
        persist=True,
        explain=True,
    ))

    # 2. analyze_sync() — Synchronous analysis (blocks until complete)
    report = demo("2. analyze_sync() — synchronous analysis", lambda: client.analyze_sync(
        findings=[
            {
                "id": "f-101",
                "source": "gitleaks",
                "sourceId": "GL-001",
                "name": "Exposed AWS Secret Key",
                "description": "AWS secret key in config file",
                "severity": "critical",
                "category": "secret",
                "host": "app-01.acme.io",
                "path": "/app/config/credentials.yml",
                "timestamp": "2024-04-01T13:00:00Z",
            },
            {
                "id": "f-102",
                "source": "nuclei",
                "sourceId": "NUCLEI-LOG4J",
                "name": "Log4Shell",
                "description": "Apache Log4j2 RCE via JNDI lookup",
                "severity": "critical",
                "category": "vulnerability",
                "host": "app-02.acme.io",
                "port": 8080,
                "protocol": "http",
                "timestamp": "2024-04-01T13:05:00Z",
            },
        ],
        persist=True,
        explain=True,
    ))

    report_id = (report or {}).get("id", "report-unknown")

    # ── Reports (3 methods) ────────────────────────────────────────────────

    print("━━━ REPORTS ━━━\n")

    # 3. list_reports()
    demo("3. list_reports() — paginated report list", lambda: client.list_reports(limit=10))

    # 4. get_report()
    demo("4. get_report() — fetch single report", lambda: client.get_report(report_id))

    # 5. delete_report()
    demo("5. delete_report() — delete a report", lambda: client.delete_report("report-to-delete"))

    # ── Findings (2 methods) ───────────────────────────────────────────────

    print("━━━ FINDINGS ━━━\n")

    # 6. list_findings()
    demo("6. list_findings() — findings for a report", lambda: client.list_findings(report_id, limit=50))

    # 7. search_findings()
    demo("7. search_findings() — keyword search", lambda: client.search_findings("backdoor", limit=10))

    # ── Risk (3 methods) ───────────────────────────────────────────────────

    print("━━━ RISK ━━━\n")

    # 8. list_risks()
    demo("8. list_risks() — risks for a report", lambda: client.list_risks(report_id))

    # 9. get_risk_summary()
    demo("9. get_risk_summary() — risk summary", lambda: client.get_risk_summary(report_id))

    # 10. get_top_risks()
    demo("10. get_top_risks() — top risks globally", lambda: client.get_top_risks(limit=5))

    # ── Attack Paths (1 method) ───────────────────────────────────────────

    print("━━━ ATTACK PATHS ━━━\n")

    # 11. list_attack_paths()
    demo("11. list_attack_paths() — attack paths for a report", lambda: client.list_attack_paths(report_id))

    # ── Recommendations (2 methods) ────────────────────────────────────────

    print("━━━ RECOMMENDATIONS ━━━\n")

    # 12. list_recommendations()
    demo("12. list_recommendations() — recommendations for a report", lambda: client.list_recommendations(report_id))

    # 13. create_remediation_plan()
    demo("13. create_remediation_plan() — generate remediation plan", lambda: client.create_remediation_plan(report_id))

    # ── Explainability (2 methods) ─────────────────────────────────────────

    print("━━━ EXPLAINABILITY ━━━\n")

    # 14. list_explanations()
    demo("14. list_explanations() — explanations for a report", lambda: client.list_explanations(report_id))

    # 15. get_explanation()
    demo("15. get_explanation() — explain a specific target", lambda: client.get_explanation("f-101"))

    # ── Health (1 method) ──────────────────────────────────────────────────

    print("━━━ HEALTH ━━━\n")

    # 16. get_health()
    demo("16. get_health() — platform health check", lambda: client.get_health())

    # ── Snapshots (2 methods) ──────────────────────────────────────────────

    print("━━━ SNAPSHOTS ━━━\n")

    # 17. create_snapshot()
    snapshot = demo("17. create_snapshot() — snapshot a report", lambda: client.create_snapshot(report_id, "Pre-patch baseline"))

    # 18. restore_snapshot()
    snapshot_id = (snapshot or {}).get("snapshotId", "snap-unknown")
    demo("18. restore_snapshot() — restore from snapshot", lambda: client.restore_snapshot(snapshot_id))

    print("━━━ All 18 Python SDK methods demonstrated ━━━\n")


if __name__ == "__main__":
    main()
