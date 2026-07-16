/**
 * INT-010I — Performance Suite
 * Benchmarks for 10k, 100k, and 1M findings
 */
import { NormalizationEngine } from '../../domain/security-intelligence/normalization/normalizer.js';
import { CorrelationEngine } from '../../domain/security-intelligence/correlation/correlator.js';
import { RiskEngine } from '../../domain/security-intelligence/risk/risk-engine.js';
import { SecurityIntelligenceEngine } from '../../domain/security-intelligence/orchestrator/engine.js';
import type { RawFinding } from '../../domain/security-intelligence/normalization/types.js';

interface BenchmarkResult {
  name: string;
  findingCount: number;
  durationMs: number;
  memoryMb: number;
  findingsPerSecond: number;
}

function generateFindings(count: number): RawFinding[] {
  const severities = ['critical', 'high', 'medium', 'low', 'info'];
  const categories = ['vulnerability', 'misconfiguration', 'exposure', 'secret', 'outdated'];
  const findings: RawFinding[] = [];

  for (let i = 0; i < count; i++) {
    findings.push({
      id: `finding-${i}`,
      source: 'benchmark-scanner',
      sourceId: `scan-${i % 100}`,
      name: `Finding ${i}`,
      description: `Benchmark finding number ${i}`,
      severity: severities[i % severities.length],
      category: categories[i % categories.length],
      host: `10.0.${Math.floor(i / 256)}.${i % 256}`,
      port: 80 + (i % 10),
      protocol: i % 2 === 0 ? 'http' : 'https',
      timestamp: new Date().toISOString(),
    });
  }
  return findings;
}

async function runBenchmark(name: string, findings: RawFinding[]): Promise<BenchmarkResult> {
  const memBefore = process.memoryUsage();
  const start = performance.now();

  const engine = new SecurityIntelligenceEngine();
  await engine.analyze({ findings });

  const duration = performance.now() - start;
  const memAfter = process.memoryUsage();

  return {
    name,
    findingCount: findings.length,
    durationMs: Math.round(duration),
    memoryMb: Math.round(((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024) * 100) / 100,
    findingsPerSecond: Math.round(findings.length / (duration / 1000)),
  };
}

export async function runPerformanceSuite(): Promise<void> {
  console.log('Security Intelligence Platform — Performance Suite');
  console.log('==================================================\n');

  const suites = [
    { name: '10k findings', count: 10_000 },
    { name: '100k findings', count: 100_000 },
    // { name: '1M findings', count: 1_000_000 }, // Uncomment for stress test
  ];

  const results: BenchmarkResult[] = [];

  for (const suite of suites) {
    console.log(`Running: ${suite.name}...`);
    const findings = generateFindings(suite.count);
    const result = await runBenchmark(suite.name, findings);
    results.push(result);
    console.log(`  Duration: ${result.durationMs}ms`);
    console.log(`  Memory: ${result.memoryMb}MB`);
    console.log(`  Throughput: ${result.findingsPerSecond} findings/sec\n`);

    // Force GC between runs
    if (global.gc) global.gc();
  }

  console.log('\nResults Summary');
  console.log('===============');
  console.log('Name\t\t\tCount\tDuration(ms)\tMemory(MB)\tThroughput');
  for (const r of results) {
    console.log(`${r.name}\t\t${r.findingCount}\t${r.durationMs}\t\t${r.memoryMb}\t\t${r.findingsPerSecond}`);
  }
}

// Run if executed directly
runPerformanceSuite().catch(console.error);
