/**
 * Security Intelligence Platform — Full TypeScript SDK Usage
 *
 * Demonstrates all 21 methods on the SecurityIntelligenceClient.
 *
 * Run: npx tsx examples/sdk/typescript-usage.ts
 */

import { SecurityIntelligenceClient, SiApiError } from '../../sdk/typescript/client.js';

// ── Configuration ──────────────────────────────────────────────────────────
const client = new SecurityIntelligenceClient({
  baseUrl: process.env.SI_URL ?? 'http://localhost:8080',
  authToken: process.env.SI_AUTH_TOKEN,      // JWT Bearer token
  apiKey: process.env.SI_API_KEY ?? 'si-api-key-dev',
  timeout: 60_000,
});

// Helper: safely call an SDK method and print result
async function demo<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const result = await fn();
    console.log(`  ✓ ${label}`);
    console.log(`    ${JSON.stringify(result, null, 2).slice(0, 200)}...\n`);
    return result;
  } catch (err) {
    if (err instanceof SiApiError) {
      console.log(`  ✗ ${label} — API Error ${err.statusCode}: ${err.message}\n`);
    } else {
      console.log(`  ✗ ${label} — ${(err as Error).message}\n`);
    }
    return null;
  }
}

async function main(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TypeScript SDK — Full Method Reference (21 methods)     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // ── Analysis (2 methods) ─────────────────────────────────────────────────

  console.log('━━━ ANALYSIS ━━━\n');

  // 1. analyze() — Async analysis (returns 202 with runId)
  const analyzeResult = await demo('1. analyze() — async analysis', () =>
    client.analyze({
      findings: [
        {
          id: 'f-001',
          source: 'trivy',
          sourceId: 'CVE-2024-3094',
          name: 'XZ Utils Backdoor',
          description: 'Compromised xz-utils allows RCE',
          severity: 'critical',
          category: 'vulnerability',
          host: 'prod-web-01.acme.io',
          port: 22,
          protocol: 'tcp',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'f-002',
          source: 'checkov',
          sourceId: 'CKV_AWS_79',
          name: 'S3 Public Access',
          description: 'S3 bucket allows public read',
          severity: 'high',
          category: 'misconfiguration',
          host: 's3://acme-assets',
          timestamp: new Date().toISOString(),
        },
      ],
      options: {
        persist: true,
        explain: true,
        includeAttackPaths: true,
        includeImpact: true,
      },
    }),
  );

  // 2. analyzeSync() — Synchronous analysis (blocks until complete)
  const report = await demo('2. analyzeSync() — synchronous analysis', () =>
    client.analyzeSync({
      findings: [
        {
          id: 'f-101',
          source: 'gitleaks',
          sourceId: 'GL-001',
          name: 'Exposed AWS Secret Key',
          description: 'AWS secret access key found in config',
          severity: 'critical',
          category: 'secret',
          host: 'app-01.acme.io',
          path: '/app/config/credentials.yml',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'f-102',
          source: 'nuclei',
          sourceId: 'NUCLEI-LOG4J',
          name: 'Log4Shell',
          description: 'Apache Log4j2 RCE via JNDI',
          severity: 'critical',
          category: 'vulnerability',
          host: 'app-02.acme.io',
          port: 8080,
          protocol: 'http',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'f-103',
          source: 'trivy',
          sourceId: 'CVE-2024-21626',
          name: 'runc Container Breakout',
          description: 'Container escape via leaked file descriptors',
          severity: 'high',
          category: 'vulnerability',
          host: 'app-01.acme.io',
          port: 443,
          protocol: 'tcp',
          timestamp: new Date().toISOString(),
        },
      ],
      options: { persist: true, explain: true },
    }),
  );

  const reportId = (report as any)?.id ?? 'report-unknown';

  // ── Reports (4 methods) ──────────────────────────────────────────────────

  console.log('━━━ REPORTS ━━━\n');

  // 3. listReports()
  await demo('3. listReports() — paginated report list', () =>
    client.listReports(10, 0),
  );

  // 4. getReport()
  await demo('4. getReport() — fetch single report', () =>
    client.getReport(reportId),
  );

  // 5. getReportSummary()
  await demo('5. getReportSummary() — report summary', () =>
    client.getReportSummary(reportId),
  );

  // 6. deleteReport()
  const tempReport = await demo('6. deleteReport() — delete a report', () =>
    client.deleteReport('report-to-delete'),
  );

  // ── Findings (3 methods) ─────────────────────────────────────────────────

  console.log('━━━ FINDINGS ━━━\n');

  // 7. listFindings()
  await demo('7. listFindings() — findings for a report', () =>
    client.listFindings(reportId, 50, 0),
  );

  // 8. getFinding()
  await demo('8. getFinding() — fetch single finding', () =>
    client.getFinding('f-101'),
  );

  // 9. searchFindings()
  await demo('9. searchFindings() — keyword search', () =>
    client.searchFindings('backdoor', 10, 0),
  );

  // ── Risk (3 methods) ────────────────────────────────────────────────────

  console.log('━━━ RISK ━━━\n');

  // 10. listRisks()
  await demo('10. listRisks() — risks for a report', () =>
    client.listRisks(reportId),
  );

  // 11. getRiskSummary()
  await demo('11. getRiskSummary() — risk summary', () =>
    client.getRiskSummary(reportId),
  );

  // 12. getTopRisks()
  await demo('12. getTopRisks() — top risks globally', () =>
    client.getTopRisks(5),
  );

  // ── Attack Paths (2 methods) ────────────────────────────────────────────

  console.log('━━━ ATTACK PATHS ━━━\n');

  // 13. listAttackPaths()
  await demo('13. listAttackPaths() — attack paths for a report', () =>
    client.listAttackPaths(reportId),
  );

  // 14. getAttackGraph()
  await demo('14. getAttackGraph() — full attack graph', () =>
    client.getAttackGraph(reportId),
  );

  // ── Recommendations (2 methods) ─────────────────────────────────────────

  console.log('━━━ RECOMMENDATIONS ━━━\n');

  // 15. listRecommendations()
  await demo('15. listRecommendations() — recommendations for a report', () =>
    client.listRecommendations(reportId),
  );

  // 16. createRemediationPlan()
  await demo('16. createRemediationPlan() — generate remediation plan', () =>
    client.createRemediationPlan(reportId),
  );

  // ── Explainability (2 methods) ──────────────────────────────────────────

  console.log('━━━ EXPLAINABILITY ━━━\n');

  // 17. listExplanations()
  await demo('17. listExplanations() — explanations for a report', () =>
    client.listExplanations(reportId),
  );

  // 18. getExplanation()
  await demo('18. getExplanation() — explain a specific target', () =>
    client.getExplanation('f-101'),
  );

  // ── Health (1 method) ───────────────────────────────────────────────────

  console.log('━━━ HEALTH ━━━\n');

  // 19. getHealth()
  await demo('19. getHealth() — platform health check', () =>
    client.getHealth(),
  );

  // ── Snapshots (2 methods) ───────────────────────────────────────────────

  console.log('━━━ SNAPSHOTS ━━━\n');

  // 20. createSnapshot()
  const snapshot = await demo('20. createSnapshot() — snapshot a report', () =>
    client.createSnapshot(reportId, 'Pre-patch baseline'),
  );

  // 21. restoreSnapshot()
  const snapshotId = (snapshot as any)?.snapshotId ?? 'snap-unknown';
  await demo('21. restoreSnapshot() — restore from snapshot', () =>
    client.restoreSnapshot(snapshotId),
  );

  console.log('━━━ All 21 SDK methods demonstrated ━━━\n');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
