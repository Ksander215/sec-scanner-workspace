/**
 * TASK-202F — Pipeline Runtime Benchmark Suite
 * 
 * Measures: load, stress, memory, performance characteristics.
 * Outputs JSON results to stdout.
 * 
 * Run: npx tsx src/domain/scan-platform/pipeline/__benchmarks__/benchmark.ts
 */

import { performance } from 'node:perf_hooks';
import { ArtifactBusImpl, createArtifactBus } from '../artifact-bus.ts';
import { PipelineEventBusImpl } from '../event-bus.ts';
import { PipelineState } from '../pipeline-state.ts';
import { RetryManager } from '../retry-manager.ts';
import { MetricsCollector } from '../metrics-collector.ts';
import { PipelineExecutor } from '../pipeline-executor.ts';
import { createFailureRecoveryManager } from '../failure-recovery.ts';
import {
  StageStatus, ArtifactCategory, PipelineEventType,
} from '../types.ts';
import type { PipelineStageDefinition, PipelineConfig, StageHandler } from '../types.ts';

function makeStageDef(o: Partial<PipelineStageDefinition> & { id: string }): PipelineStageDefinition {
  return { name: o.id, dependencies: [], requiredCapabilities: [], maxRetries: 0, timeoutMs: 0, skippable: false, ...o };
}

function makeConfig(stages: PipelineStageDefinition[], overrides?: Partial<PipelineConfig>): PipelineConfig {
  return {
    pipelineId: 'bench-' + Math.random().toString(36).slice(2, 8),
    scanJobId: 'job-1', targetUrl: 'https://example.com', targetName: 'Bench',
    stages, maxConcurrentStages: 4, totalTimeoutMs: 30_000, idleTimeoutMs: 0,
    enablePersistence: false, ...overrides,
  };
}

const immediate: StageHandler = async () => null;

function memMB(): number {
  return Math.round(process.memoryUsage().heapUsed / (1024 * 1024) * 100) / 100;
}

interface BR { stage: string; name: string; status: 'pass' | 'fail'; durationMs: number; metrics: Record<string, number | string | boolean>; error?: string; }
const results: BR[] = [];

async function rec(stage: string, name: string, fn: () => Promise<Record<string, number | string | boolean>>) {
  const t0 = performance.now();
  try {
    const metrics = await fn();
    results.push({ stage, name, status: 'pass', durationMs: Math.round(performance.now() - t0), metrics });
  } catch (err) {
    results.push({ stage, name, status: 'fail', durationMs: Math.round(performance.now() - t0), metrics: {}, error: err instanceof Error ? err.message : String(err) });
  }
}

// ─── Stage 1: Load Testing ─────────────────────────────────

async function stage1() {
  const stages = [makeStageDef({ id: 'a' }), makeStageDef({ id: 'b', dependencies: ['a'] })];
  for (const n of [10, 50, 100]) {
    await rec('1-Load', `${n} concurrent pipelines`, async () => {
      const execs = Array.from({ length: n }, () => {
        const e = new PipelineExecutor(makeConfig(stages));
        e.registerStageHandler('a', immediate);
        e.registerStageHandler('b', immediate);
        return e;
      });
      const memBefore = memMB();
      const t0 = performance.now();
      const outcomes = await Promise.allSettled(execs.map(e => e.start()));
      const totalMs = Math.round(performance.now() - t0);
      const memAfter = memMB();
      return {
        pipelines: n, completed: outcomes.filter(o => o.status === 'fulfilled').length,
        failed: outcomes.filter(o => o.status === 'rejected').length, totalMs,
        avgMs: Math.round(totalMs / n), memBeforeMB: memBefore, memAfterMB: memAfter,
        memDeltaMB: Math.round((memAfter - memBefore) * 100) / 100,
      };
    });
  }
}

// ─── Stage 2: Artifact Bus Stress ───────────────────────────

async function stage2() {
  await rec('2-ArtifactStress', '100K URLs publish', async () => {
    const bus = createArtifactBus() as ArtifactBusImpl;
    const t0 = performance.now();
    for (let i = 0; i < 100_000; i++) bus.publish({ category: ArtifactCategory.Urls, stageId: 'stress', key: `url:${i}`, value: `https://example.com/page/${i}` });
    const ms = Math.round(performance.now() - t0);
    return { count: 100_000, totalMs: ms, opsPerMs: Math.round(100_000 / ms), memMB: memMB() };
  });

  await rec('2-ArtifactStress', '100K URLs dedup (50K unique)', async () => {
    const bus = createArtifactBus() as ArtifactBusImpl;
    const t0 = performance.now();
    for (let i = 0; i < 100_000; i++) bus.publish({ category: ArtifactCategory.Urls, stageId: 'stress', key: `url:${i % 50_000}`, value: `u` });
    const ms = Math.round(performance.now() - t0);
    return { published: 100_000, stored: bus.count(ArtifactCategory.Urls), totalMs: ms, dedupSaved: 100_000 - bus.count(ArtifactCategory.Urls) };
  });

  await rec('2-ArtifactStress', 'Search in 100K URLs (predicate)', async () => {
    const bus = createArtifactBus() as ArtifactBusImpl;
    for (let i = 0; i < 100_000; i++) bus.publish({ category: ArtifactCategory.Urls, stageId: 's', key: `u:${i}`, value: { url: `https://example.com/${i}`, method: i % 2 === 0 ? 'GET' : 'POST' } });
    const t0 = performance.now();
    const found = bus.search(ArtifactCategory.Urls, a => (a.value as any).method === 'POST');
    const ms = Math.round(performance.now() - t0);
    return { total: 100_000, matched: found.length, searchMs: ms };
  });

  await rec('2-ArtifactStress', 'Snapshot + restore 100K artifacts', async () => {
    const bus = createArtifactBus() as ArtifactBusImpl;
    for (let i = 0; i < 100_000; i++) bus.publish({ category: ArtifactCategory.Metadata, stageId: 's', key: `k:${i}`, value: { i } });
    const t0 = performance.now();
    const snap = bus.toSnapshot();
    const snapMs = Math.round(performance.now() - t0);
    const t1 = performance.now();
    const restored = ArtifactBusImpl.fromSnapshot(snap);
    const restoreMs = Math.round(performance.now() - t1);
    return { count: 100_000, snapshotMs, restoreMs, verified: restored.count() === 100_000 };
  });

  await rec('2-ArtifactStress', '10K Findings publish + read', async () => {
    const bus = createArtifactBus() as ArtifactBusImpl;
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) bus.publish({ category: ArtifactCategory.Findings, stageId: 's', key: `f:${i}`, value: { title: `F${i}`, severity: ['low', 'medium', 'high', 'critical'][i % 4] } });
    const pubMs = Math.round(performance.now() - t0);
    const t1 = performance.now();
    const all = bus.getByCategory(ArtifactCategory.Findings);
    const readMs = Math.round(performance.now() - t1);
    return { count: 10_000, publishMs: pubMs, readMs, total: pubMs + readMs, verified: all.length === 10_000 };
  });
}

// ─── Stage 3: Event Bus Stress ─────────────────────────────

async function stage3() {
  await rec('3-EventBus', '1000 subscribers x 100 events', async () => {
    const bus = new PipelineEventBusImpl();
    const counts = new Array(1000).fill(0) as number[];
    counts.forEach((_, i) => bus.on(PipelineEventType.StageCompleted, () => { counts[i]++; }));
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) bus.emit({ type: PipelineEventType.StageCompleted, timestamp: new Date().toISOString(), pipelineId: 'p1', data: { seq: i } });
    const ms = Math.round(performance.now() - t0);
    return { subscribers: 1000, events: 100, totalMs: ms, allCorrect: counts.every(c => c === 100), notificationsPerSec: Math.round(100_000 / ms * 1000) };
  });

  await rec('3-EventBus', 'Wildcard: 1000 events, 1 wildcard sub', async () => {
    const bus = new PipelineEventBusImpl();
    let wc = 0;
    bus.on('*', () => { wc++; });
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      const types = [PipelineEventType.PipelineStarted, PipelineEventType.StageCompleted, PipelineEventType.StageFailed, PipelineEventType.StageStarted, PipelineEventType.PipelinePaused];
      bus.emit({ type: types[i % types.length], timestamp: new Date().toISOString(), pipelineId: 'p1' });
    }
    const ms = Math.round(performance.now() - t0);
    return { events: 1000, wildcardReceived: wc, totalMs: ms };
  });
}

// ─── Stage 6: Retry Storm ──────────────────────────────────

async function stage6() {
  await rec('6-RetryStorm', '50 parallel retryable failures (2 retries each)', async () => {
    const stages = Array.from({ length: 50 }, (_, i) => makeStageDef({ id: `s${i}`, maxRetries: 2, timeoutMs: 5000 }));
    const exec = new PipelineExecutor(makeConfig(stages, { maxConcurrentStages: 50 }));
    stages.forEach(s => exec.registerStageHandler(s.id, async () => { throw new Error('timeout'); }));
    const t0 = performance.now();
    const result = await exec.start();
    const ms = Math.round(performance.now() - t0);
    const failed = Array.from(result.stages.values()).filter(s => s.status === 'failed').length;
    return { stages: 50, failed, totalMs: ms, avgRetryWaitMs: Math.round(ms / 50 / 3) };
  });

  await rec('6-RetryStorm', '10K error classifications', async () => {
    const rm = new RetryManager();
    const def = makeStageDef({ id: 't', maxRetries: 5 });
    const patterns = [
      { code: 'TIMEOUT', msg: 'timeout' }, { code: 'NETWORK', msg: 'econnrefused' },
      { code: 'RATE_LIMIT', msg: '429' }, { code: 'AUTH_FAILED', msg: 'auth failed' },
      { code: 'INVALID_CONFIG', msg: 'bad config' }, { code: 'UNKNOWN', msg: 'weird' },
    ];
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) {
      const p = patterns[i % patterns.length];
      rm.getRetryDelay('t', def, { stageId: 't', message: p.msg, code: p.code, retryable: false, occurredAt: new Date().toISOString() });
    }
    const ms = Math.round(performance.now() - t0);
    return { count: 10_000, totalMs: ms, perMs: (10_000 / ms).toFixed(1) };
  });
}

// ─── Stage 7: Long Running ────────────────────────────────

async function stage7() {
  await rec('7-LongRunning', '500 pipeline cycles (memory leak)', async () => {
    const stages = [makeStageDef({ id: 'a' }), makeStageDef({ id: 'b', dependencies: ['a'] }), makeStageDef({ id: 'c', dependencies: ['b'] })];
    const memBefore = memMB();
    const t0 = performance.now();
    for (let i = 0; i < 500; i++) {
      const e = new PipelineExecutor(makeConfig(stages));
      e.registerStageHandler('a', async ({ artifactBus }) => { artifactBus.publish({ category: ArtifactCategory.Urls, stageId: 'a', key: `u:${i}`, value: `url` }); });
      e.registerStageHandler('b', immediate);
      e.registerStageHandler('c', immediate);
      await e.start();
    }
    const ms = Math.round(performance.now() - t0);
    const memAfter = memMB();
    return { cycles: 500, totalMs: ms, avgMs: (ms / 500).toFixed(1), memBeforeMB: memBefore, memAfterMB: memAfter, memDeltaMB: Math.round((memAfter - memBefore) * 100) / 100, leakSuspected: memAfter - memBefore > 100 };
  });
}

// ─── Stage 9: Performance Profiling ────────────────────────

async function stage9() {
  await rec('9-Profiling', 'Empty pipeline (0 stages)', async () => {
    const e = new PipelineExecutor(makeConfig([]));
    const t0 = performance.now();
    await e.start();
    return { overheadMs: Math.round(performance.now() - t0) };
  });

  await rec('9-Profiling', '1-stage immediate', async () => {
    const e = new PipelineExecutor(makeConfig([makeStageDef({ id: 'a' })]));
    e.registerStageHandler('a', immediate);
    const t0 = performance.now();
    await e.start();
    return { totalMs: Math.round(performance.now() - t0) };
  });

  await rec('9-Profiling', '5-stage sequential', async () => {
    const stages = 'abcde'.split('').map((id, i) => makeStageDef({ id, dependencies: i > 0 ? [String.fromCharCode(96 + i)] : [] }));
    const e = new PipelineExecutor(makeConfig(stages));
    stages.forEach(s => e.registerStageHandler(s.id, immediate));
    const t0 = performance.now();
    await e.start();
    return { totalMs: Math.round(performance.now() - t0) };
  });

  await rec('9-Profiling', '5-stage parallel (no deps)', async () => {
    const stages = 'abcde'.split('').map(id => makeStageDef({ id }));
    const e = new PipelineExecutor(makeConfig(stages, { maxConcurrentStages: 5 }));
    stages.forEach(s => e.registerStageHandler(s.id, immediate));
    const t0 = performance.now();
    await e.start();
    return { totalMs: Math.round(performance.now() - t0) };
  });

  await rec('9-Profiling', '10K event emissions (no subs)', async () => {
    const bus = new PipelineEventBusImpl();
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) bus.emit({ type: PipelineEventType.StageCompleted, timestamp: new Date().toISOString(), pipelineId: 'p1' });
    return { events: 10_000, totalMs: Math.round(performance.now() - t0), opsPerMs: Math.round(10_000 / Math.max(1, performance.now() - t0)) };
  });

  await rec('9-Profiling', 'PipelineState JSON roundtrip (100 stages)', async () => {
    const stages = Array.from({ length: 100 }, (_, i) => makeStageDef({ id: `s${i}` }));
    const state = new PipelineState('p1', 'j1', 'https://x.com', stages);
    state.start();
    stages.forEach(s => { state.startStage(s.id, []); state.completeStage(s.id); });
    const t0 = performance.now();
    const json = JSON.stringify(state.toJSON());
    const serMs = Math.round(performance.now() - t0);
    const t1 = performance.now();
    PipelineState.fromJSON(JSON.parse(json), stages);
    const deserMs = Math.round(performance.now() - t1);
    return { stages: 100, jsonBytes: json.length, serializeMs: serMs, deserializeMs: deserMs };
  });

  await rec('9-Profiling', 'Recovery snapshot 10K artifacts + plan', async () => {
    const stages = [makeStageDef({ id: 'a' })];
    const state = new PipelineState('p1', 'j1', 'https://x.com', stages);
    state.start(); state.startStage('a', []); state.completeStage('a');
    const bus = createArtifactBus() as ArtifactBusImpl;
    for (let i = 0; i < 10_000; i++) bus.publish({ category: ArtifactCategory.Metadata, stageId: 'a', key: `k:${i}`, value: i });
    const frm = createFailureRecoveryManager();
    const t0 = performance.now();
    const snap = frm.createSnapshot('p1', state, bus, {}, [], 'bench');
    const createMs = Math.round(performance.now() - t0);
    const t1 = performance.now();
    const plan = frm.buildRecoveryPlan(snap, stages);
    const planMs = Math.round(performance.now() - t1);
    return { artifacts: 10_000, createMs, planMs, planCompleted: plan.completedStageIds.length === 1 };
  });
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  console.error('TASK-202F Benchmark Suite');
  console.error(`Node ${process.version}, heap ~${Math.round((globalThis as any).v8?.getHeapStatistics?.()?.heap_size_limit / 1024 / 1024 || 0)}MB, RSS ${memMB()}MB\n`);

  await stage1(); console.error('  Stage 1 (Load) done');
  await stage2(); console.error('  Stage 2 (Artifact Stress) done');
  await stage3(); console.error('  Stage 3 (Event Bus) done');
  await stage6(); console.error('  Stage 6 (Retry Storm) done');
  await stage7(); console.error('  Stage 7 (Long Running) done');
  await stage9(); console.error('  Stage 9 (Profiling) done');

  const output = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    totalBenchmarks: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    results,
  };
  console.log(JSON.stringify(output, null, 2));
  console.error(`\n${output.passed}/${output.totalBenchmarks} passed.`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });