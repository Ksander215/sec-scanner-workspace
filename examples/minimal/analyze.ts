/**
 * Minimal Security Intelligence Platform Example
 *
 * Creates raw findings, runs the full analysis pipeline,
 * and prints the resulting security intelligence report.
 *
 * Run: npx tsx examples/minimal/analyze.ts
 */

import { SecurityIntelligenceEngine } from '../../src/domain/security-intelligence/orchestrator/engine.js';
import type { ScanInput, AnalysisOptions, SecurityIntelligenceReport } from '../../src/domain/security-intelligence/orchestrator/types.js';

// ── 1. Create the engine ──────────────────────────────────────────────────────
const engine = new SecurityIntelligenceEngine();

// ── 2. Define raw scan findings ───────────────────────────────────────────────
const scanInput: ScanInput = {
  findings: [
    {
      id: 'finding-001',
      source: 'trivy',
      sourceId: 'CVE-2024-3094',
      name: 'XZ Utils Backdoor',
      description: 'Compromised liblzma in xz-utils 5.6.0/5.6.1 allows remote code execution via SSH',
      severity: 'critical',
      category: 'vulnerability',
      host: 'prod-web-01.acme.io',
      port: 22,
      protocol: 'tcp',
      evidence: { package: 'xz-utils', installed: '5.6.1', fixed: '5.6.2' },
      timestamp: new Date().toISOString(),
    },
    {
      id: 'finding-002',
      source: 'trivy',
      sourceId: 'CVE-2024-21626',
      name: 'runc Container Breakout',
      description: 'runc v1.1.11 allows container escape via leaked file descriptors',
      severity: 'high',
      category: 'vulnerability',
      host: 'prod-web-01.acme.io',
      port: 443,
      protocol: 'tcp',
      evidence: { package: 'runc', installed: '1.1.11', fixed: '1.1.12' },
      timestamp: new Date().toISOString(),
    },
    {
      id: 'finding-003',
      source: 'checkov',
      sourceId: 'CKV_AWS_79',
      name: 'S3 Bucket Public Access',
      description: 'S3 bucket allows public read access',
      severity: 'high',
      category: 'misconfiguration',
      host: 's3://acme-public-assets',
      evidence: { resource: 'acme-public-assets', acl: 'public-read' },
      timestamp: new Date().toISOString(),
    },
    {
      id: 'finding-004',
      source: 'gitleaks',
      sourceId: 'GL-001',
      name: 'Exposed AWS Secret Key',
      description: 'AWS secret access key found in application config',
      severity: 'critical',
      category: 'secret',
      host: 'prod-web-01.acme.io',
      path: '/app/config/credentials.yml',
      evidence: { file: 'credentials.yml', line: 14, type: 'aws_secret_key' },
      timestamp: new Date().toISOString(),
    },
    {
      id: 'finding-005',
      source: 'nuclei',
      sourceId: 'NUCLEI-LOG4J',
      name: 'Log4Shell Vulnerability',
      description: 'Apache Log4j2 vulnerable to RCE via JNDI lookup injection',
      severity: 'critical',
      category: 'vulnerability',
      host: 'prod-app-02.acme.io',
      port: 8080,
      protocol: 'http',
      evidence: { cve: 'CVE-2021-44228', package: 'log4j-core', installed: '2.14.1' },
      timestamp: new Date().toISOString(),
    },
  ],
  metadata: {
    environment: 'production',
    scanDate: new Date().toISOString(),
    scannerVersions: { trivy: '0.50.0', checkov: '3.2.0', gitleaks: '8.18.0', nuclei: '3.1.0' },
  },
};

// ── 3. Configure analysis options ────────────────────────────────────────────
const options: AnalysisOptions = {
  persist: false,
  explain: true,
  includeAttackPaths: true,
  includeImpact: true,
  onProgress: (progress) => {
    const bar = '█'.repeat(Math.floor(progress.percentage / 5))
      + '░'.repeat(20 - Math.floor(progress.percentage / 5));
    process.stderr.write(`\r  [${bar}] ${progress.percentage}% — ${progress.currentStage}`);
  },
  onEvent: (event) => {
    if (event.type === 'stage:completed') {
      process.stderr.write(`\n  ✓ ${event.data.stage} (${event.data.durationMs}ms)\n`);
    }
  },
};

// ── 4. Run analysis ──────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════╗');
console.log('║  Security Intelligence Platform — Quick Start   ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const report: SecurityIntelligenceReport = await engine.analyze(scanInput, options);

// ── 5. Print summary ─────────────────────────────────────────────────────────
console.log('\n\n━━━ Analysis Complete ━━━\n');

console.log(`  Report ID : ${report.id}`);
console.log(`  Run ID    : ${report.runId}`);
console.log(`  Duration  : ${report.metrics.totalDurationMs}ms\n`);

console.log('  Findings:');
console.log(`    Total      : ${report.findings.length}`);
for (const [severity, count] of Object.entries(report.normalization.bySeverity)) {
  if (count > 0) console.log(`    ${severity.padEnd(12)}: ${count}`);
}

console.log('\n  Correlations:');
console.log(`    Total      : ${report.correlation.totalCorrelations}`);
console.log(`    Groups     : ${report.correlation.totalGroups}`);

console.log('\n  Risk Summary:');
console.log(`    Average    : ${report.riskSummary.averageScore.toFixed(1)}/100`);
console.log(`    Trend      : ${report.riskSummary.riskTrend}`);
for (const [level, count] of Object.entries(report.riskSummary.byLevel)) {
  if (count > 0) console.log(`    ${level.padEnd(12)}: ${count}`);
}

console.log('\n  Attack Paths:');
console.log(`    Total      : ${report.attackGraph.totalPaths}`);
console.log(`    Critical   : ${report.attackGraph.criticalPaths}`);
console.log(`    Entry Pts  : ${report.attackGraph.entryPoints}`);

console.log('\n  Recommendations:');
console.log(`    Total      : ${report.recommendations.length}`);
const top3 = report.recommendations.slice(0, 3);
for (const rec of top3) {
  console.log(`    - ${rec.title} [${rec.priority}]`);
}

console.log('\n  Top Risks:');
for (const risk of report.riskSummary.topRisks.slice(0, 5)) {
  console.log(`    [${risk.level.toUpperCase()}] ${risk.description} (score: ${risk.score})`);
}

console.log('\n━━━ End of Report ━━━\n');
