/**
 * Security Intelligence Platform — Full Go SDK Usage
 *
 * Demonstrates all 11 methods on the Go SDK Client.
 *
 * Run:  go run examples/sdk/go-usage.go
 */

package main

import (
	"context"
	"fmt"
	"os"
	"time"

	si "si-platform/sdk/go"
)

func main() {
	fmt.Println("╔═══════════════════════════════════════════════════════════╗")
	fmt.Println("║  Go SDK — Full Method Reference (11 methods)             ║")
	fmt.Println("╚═══════════════════════════════════════════════════════════╝\n")

	// ── Configuration ────────────────────────────────────────────────────
	baseURL := envOr("SI_URL", "http://localhost:8080")
	apiKey := envOr("SI_API_KEY", "si-api-key-dev")
	authToken := os.Getenv("SI_AUTH_TOKEN")

	client := si.NewClient(si.Config{
		BaseURL:   baseURL,
		AuthToken: authToken,
		APIKey:    apiKey,
		Timeout:   60 * time.Second,
	})

	ctx := context.Background()

	// ── 1. AnalyzeSync — Synchronous analysis ────────────────────────────
	fmt.Println("━━━ ANALYSIS ━━━\n")

	findings := []map[string]interface{}{
		{
			"id":          "f-001",
			"source":      "trivy",
			"sourceId":    "CVE-2024-3094",
			"name":        "XZ Utils Backdoor",
			"description": "Compromised xz-utils allows RCE via SSH",
			"severity":    "critical",
			"category":    "vulnerability",
			"host":        "prod-web-01.acme.io",
			"port":        float64(22),
			"protocol":    "tcp",
			"timestamp":   "2024-04-01T12:00:00Z",
		},
		{
			"id":          "f-002",
			"source":      "checkov",
			"sourceId":    "CKV_AWS_79",
			"name":        "S3 Public Access",
			"description": "S3 bucket allows public read access",
			"severity":    "high",
			"category":    "misconfiguration",
			"host":        "s3://acme-assets",
			"timestamp":   "2024-04-01T12:05:00Z",
		},
		{
			"id":          "f-003",
			"source":      "gitleaks",
			"sourceId":    "GL-001",
			"name":        "Exposed AWS Secret Key",
			"description": "AWS secret key found in config",
			"severity":    "critical",
			"category":    "secret",
			"host":        "app-01.acme.io",
			"path":        "/app/config/credentials.yml",
			"timestamp":   "2024-04-01T13:00:00Z",
		},
	}

	report, err := client.AnalyzeSync(ctx, findings)
	if err != nil {
		fmt.Printf("  ✗ AnalyzeSync — %v\n\n", err)
	} else {
		fmt.Println("  ✓ 1. AnalyzeSync — synchronous analysis")
		fmt.Printf("    Report ID: %v\n\n", report["id"])
	}

	reportID := strVal(report, "id", "report-unknown")

	// ── 2. GetReport ────────────────────────────────────────────────────
	fmt.Println("━━━ REPORTS ━━━\n")

	demo("2. GetReport", func() (map[string]interface{}, error) {
		return client.GetReport(ctx, reportID)
	})

	// ── 3. ListReports ──────────────────────────────────────────────────
	demo("3. ListReports", func() (map[string]interface{}, error) {
		return client.ListReports(ctx, 10, 0)
	})

	// ── 4. DeleteReport ─────────────────────────────────────────────────
	demo("4. DeleteReport", func() (map[string]interface{}, error) {
		_, err := client.DeleteReport(ctx, "report-to-delete")
		return map[string]interface{}{"deleted": err == nil}, err
	})

	// ── 5. ListFindings ─────────────────────────────────────────────────
	fmt.Println("━━━ FINDINGS ━━━\n")

	demo("5. ListFindings", func() (map[string]interface{}, error) {
		return client.ListFindings(ctx, reportID, 50, 0)
	})

	// ── 6. ListRisks ────────────────────────────────────────────────────
	fmt.Println("━━━ RISK ━━━\n")

	demo("6. ListRisks", func() (map[string]interface{}, error) {
		return client.ListRisks(ctx, reportID)
	})

	// ── 7. GetRiskSummary ───────────────────────────────────────────────
	demo("7. GetRiskSummary", func() (map[string]interface{}, error) {
		return client.GetRiskSummary(ctx, reportID)
	})

	// ── 8. ListAttackPaths ──────────────────────────────────────────────
	fmt.Println("━━━ ATTACK PATHS ━━━\n")

	demo("8. ListAttackPaths", func() (map[string]interface{}, error) {
		return client.ListAttackPaths(ctx, reportID)
	})

	// ── 9. ListRecommendations ──────────────────────────────────────────
	fmt.Println("━━━ RECOMMENDATIONS ━━━\n")

	demo("9. ListRecommendations", func() (map[string]interface{}, error) {
		return client.ListRecommendations(ctx, reportID)
	})

	// ── 10. GetHealth ───────────────────────────────────────────────────
	fmt.Println("━━━ HEALTH ━━━\n")

	demo("10. GetHealth", func() (map[string]interface{}, error) {
		return client.GetHealth(ctx)
	})

	// ── 11. CreateSnapshot ──────────────────────────────────────────────
	fmt.Println("━━━ SNAPSHOTS ━━━\n")

	snapshot, _ := demo("11. CreateSnapshot", func() (map[string]interface{}, error) {
		return client.CreateSnapshot(ctx, reportID, "Pre-patch baseline")
	})

	snapshotID := strVal(snapshot, "snapshotId", "snap-unknown")
	if snapshotID != "snap-unknown" {
		fmt.Printf("    Snapshot ID: %s\n\n", snapshotID)
	}

	fmt.Println("━━━ All 11 Go SDK methods demonstrated ━━━\n")
}

// ── Helpers ──────────────────────────────────────────────────────────────

func demo(label string, fn func() (map[string]interface{}, error)) (map[string]interface{}, bool) {
	result, err := fn()
	if err != nil {
		if apiErr, ok := err.(*si.ApiError); ok {
			fmt.Printf("  ✗ %s — API Error %d: %s\n\n", label, apiErr.StatusCode, apiErr.Message)
		} else {
			fmt.Printf("  ✗ %s — %v\n\n", label, err)
		}
		return nil, false
	}
	fmt.Printf("  ✓ %s\n", label)
	fmt.Printf("    %v\n\n", truncate(fmt.Sprintf("%v", result), 200))
	return result, true
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func strVal(m map[string]interface{}, key, fallback string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return fallback
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
