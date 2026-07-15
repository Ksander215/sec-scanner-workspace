/**
 * Pipeline Executor Core — Validation Test Suite
 *
 * Comprehensive tests for Event Bus, Failure Recovery, Pause/Resume,
 * Retry Storm, and Cancellation. Each test is realistic, exercises
 * real code paths, and collects metrics where applicable.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  StageStatus,
  PipelineStatus,
  PipelineEventType,
  ArtifactCategory,
  TERMINAL_STAGE_STATUSES,
} from '../types.ts';
import { PipelineExecutor, createPipelineExecutor } from '../pipeline-executor.ts';
import { ArtifactBusImpl, createArtifactBus } from '../artifact-bus.ts';
import { PipelineEventBusImpl } from '../event-bus.ts';
import { PipelineState } from '../pipeline-state.ts';
import { RetryManager, classifyError } from '../retry-manager.ts';
import { MetricsCollector } from '../metrics-collector.ts';
import {
  FailureRecoveryManager,
  createFailureRecoveryManager,
} from '../failure-recovery.ts';
import {
  createTargetValidationStub,
  createDiscoveryStub,
  createPassiveStub,
  createActiveStub,
  createNormalizationStub,
} from '../stubs/index.ts';
import type {
  PipelineStageDefinition,
  PipelineConfig,
  PipelineEvent,
  PipelineStageError,
  StageHandler,
} from '../types.ts';

// ─── Helpers ──────────────────────────────────────────────────────

function makeStageDef(
  o: Partial<PipelineStageDefinition> & { id: string },
): PipelineStageDefinition {
  return {
    name: o.id,
    dependencies: [],
    requiredCapabilities: [],
    maxRetries: 0,
    timeoutMs: 0,
    skippable: false,
    ...o,
  };
}

function makeConfig(
  stages: PipelineStageDefinition[],
  overrides?: Partial<PipelineConfig>,
): PipelineConfig {
  return {
    pipelineId: 'val-' + Math.random().toString(36).slice(2, 8),
    scanJobId: 'job-1',
    targetUrl: 'https://example.com',
    targetName: 'Test',
    stages,
    maxConcurrentStages: 4,
    totalTimeoutMs: 0,
    idleTimeoutMs: 0,
    enablePersistence: false,
    ...overrides,
  };
}

/** AbortSignal-aware delay: resolves immediately on abort. */
function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((r) => {
    if (signal.aborted) {
      r();
      return;
    }
    const t = setTimeout(r, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        r();
      },
      { once: true },
    );
  });
}

/** Simple non-abortable delay (for test orchestration only). */
function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Build a PipelineStageError for testing. */
function makeStageError(
  stageId: string,
  message: string,
  code = 'STAGE_ERROR',
  retryable = false,
): PipelineStageError {
  return {
    stageId,
    message,
    code,
    retryable,
    occurredAt: new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════════
// Stage 3: Event Bus Validation
// ══════════════════════════════════════════════════════════════════

describe('Stage 3: Event Bus Validation', () => {
  it('delivers to 1000 subscribers without loss', async () => {
    const bus = new PipelineEventBusImpl();
    const subscriberCount = 1000;
    const eventCount = 100;
    const counts = new Array<number>(subscriberCount).fill(0);

    const unsubscribers = counts.map(
      (_, i) =>
        bus.on(PipelineEventType.StageStarted, () => {
          counts[i]++;
        }),
    );

    for (let e = 0; e < eventCount; e++) {
      bus.emit({
        type: PipelineEventType.StageStarted,
        timestamp: new Date().toISOString(),
        pipelineId: 'test-delivery',
        data: { seq: e },
      });
    }

    for (const unsub of unsubscribers) unsub();

    for (let i = 0; i < subscriberCount; i++) {
      expect(counts[i]).toBe(eventCount);
    }
  });

  it('maintains delivery order for same-type events', () => {
    const bus = new PipelineEventBusImpl();
    const received: number[] = [];

    bus.on(PipelineEventType.StageCompleted, (e: PipelineEvent) => {
      received.push(e.data!.seq as number);
    });

    for (let i = 0; i < 500; i++) {
      bus.emit({
        type: PipelineEventType.StageCompleted,
        timestamp: new Date().toISOString(),
        pipelineId: 'test-order',
        data: { seq: i },
      });
    }

    const expected = Array.from({ length: 500 }, (_, i) => i);
    expect(received).toEqual(expected);
  });

  it('wildcard subscriber receives all event types in order', () => {
    const bus = new PipelineEventBusImpl();
    const received: string[] = [];

    bus.on('*', (e: PipelineEvent) => {
      received.push(e.type);
    });

    const types: PipelineEventType[] = [
      PipelineEventType.PipelineStarted,
      PipelineEventType.StageStarted,
      PipelineEventType.StageCompleted,
      PipelineEventType.ArtifactPublished,
      PipelineEventType.PipelinePaused,
      PipelineEventType.PipelineResumed,
      PipelineEventType.StageFailed,
      PipelineEventType.RetryScheduled,
      PipelineEventType.PipelineCancelled,
      PipelineEventType.EngineStarted,
    ];

    for (const t of types) {
      bus.emit({
        type: t,
        timestamp: new Date().toISOString(),
        pipelineId: 'test-wildcard',
      });
    }

    expect(received).toEqual(types.map((t) => t as string));
  });

  it('handler errors never break delivery to other handlers', () => {
    const bus = new PipelineEventBusImpl();
    const goodReceived: number[] = [];

    // 5 handlers that always throw
    for (let i = 0; i < 5; i++) {
      bus.on(PipelineEventType.StageStarted, () => {
        throw new Error(`handler-error-${i}`);
      });
    }

    // 5 good handlers that record their index
    const unsubs = Array.from({ length: 5 }, (_, i) =>
      bus.on(PipelineEventType.StageStarted, () => {
        goodReceived.push(i);
      }),
    );

    bus.emit({
      type: PipelineEventType.StageStarted,
      timestamp: new Date().toISOString(),
      pipelineId: 'test-error-isolation',
    });

    for (const u of unsubs) u();
    expect(goodReceived).toEqual([0, 1, 2, 3, 4]);
  });

  it('unsubscribe during event dispatch is safe', () => {
    const bus = new PipelineEventBusImpl();
    let callCount = 0;
    let unsub: (() => void) | undefined;

    unsub = bus.on(PipelineEventType.StageStarted, () => {
      callCount++;
      if (unsub) {
        unsub();
        unsub = undefined;
      }
    });

    // Emit 3 events; handler should only fire once (self-unsubscribes on first call)
    for (let i = 0; i < 3; i++) {
      bus.emit({
        type: PipelineEventType.StageStarted,
        timestamp: new Date().toISOString(),
        pipelineId: 'test-unsub',
      });
    }

    expect(callCount).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════
// Stage 4: Failure Recovery
// ══════════════════════════════════════════════════════════════════

describe('Stage 4: Failure Recovery', () => {
  it('recovers from mid-pipeline crash via snapshot', async () => {
    const stages = [
      makeStageDef({ id: 'A', dependencies: [] }),
      makeStageDef({ id: 'B', dependencies: ['A'] }),
      makeStageDef({ id: 'C', dependencies: ['B'] }),
    ];
    const config = makeConfig(stages);

    // ── Executor 1: run A only, snapshot, cancel ────────────
    const executor1 = createPipelineExecutor(config);

    let snapshot: Record<string, unknown> | undefined;

    executor1.registerStageHandler('A', async ({ artifactBus }) => {
      artifactBus.publish({
        category: ArtifactCategory.Metadata,
        stageId: 'A',
        key: 'a-result',
        value: { done: true },
      });
      return {};
    });

    // Save snapshot the instant A completes (before B is launched)
    executor1.eventBus.on(PipelineEventType.StageCompleted, (e: PipelineEvent) => {
      if (e.data?.stageId === 'A') {
        snapshot = executor1.saveSnapshot();
        // Cancel synchronously — B is still pending in the snapshot
        executor1.cancel('snapshot-taken');
      }
    });

    const result1 = await executor1.start();
    expect(snapshot).toBeDefined();
    expect(result1.stages.get('A')?.status).toBe('completed');

    // ── Executor 2: restore from snapshot, run B & C ────────
    const executor2 = createPipelineExecutor(config);
    executor2.restoreFromSnapshot(snapshot!);

    let bRan = false;
    let cRan = false;

    executor2.registerStageHandler('B', async () => {
      bRan = true;
      return {};
    });
    executor2.registerStageHandler('C', async () => {
      cRan = true;
      return {};
    });

    const result2 = await executor2.start();

    // A should NOT have re-run (already completed in snapshot)
    const aArtifacts2 = executor2.artifactBus.getByStage('A');
    expect(aArtifacts2.length).toBe(1); // from snapshot, not re-published

    expect(bRan).toBe(true);
    expect(cRan).toBe(true);
    expect(result2.stages.get('A')?.status).toBe('completed');
    expect(result2.stages.get('B')?.status).toBe('completed');
    expect(result2.stages.get('C')?.status).toBe('completed');
    expect(result2.status).toBe(PipelineStatus.Completed);

    // Collect metrics — executor2's MetricsCollector only counts stages that completed
    // during its own lifetime (A was already done in the snapshot, not re-run)
    const metrics = result2.metrics;
    expect(metrics.completedStages).toBe(2);
    expect(metrics.failedStages).toBe(0);
  }, 10_000);

  it('handles corrupted snapshot gracefully', () => {
    const stages = [
      makeStageDef({ id: 'A', dependencies: [] }),
      makeStageDef({ id: 'B', dependencies: ['A'] }),
    ];

    const frm = createFailureRecoveryManager();

    // Build a snapshot with empty/garbage state
    const garbageSnapshot = {
      snapshotId: 'snap-garbage-1',
      pipelineId: 'test-garbage',
      createdAt: new Date().toISOString(),
      reason: 'test',
      state: {}, // empty — no pipelineId, status, or stage data
      artifacts: [],
      metrics: {},
      retriedStageIds: [],
      sequence: 1,
    } as any;

    // buildRecoveryPlan must NOT throw — it should return a valid plan
    const plan = frm.buildRecoveryPlan(garbageSnapshot, stages);

    // With empty state, fromJSON creates a fresh state where all stages are Pending
    expect(plan.completedStageIds).toEqual([]);
    expect(plan.failedStageIds).toEqual([]);
    expect(plan.skippedStageIds).toEqual([]);
    expect(plan.pendingStageIds).toEqual(['A', 'B']);
  });

  it('recovers after individual stage failure', async () => {
    const stages = [
      makeStageDef({ id: 'A', dependencies: [] }),
      makeStageDef({ id: 'B', dependencies: ['A'], maxRetries: 0 }),
      makeStageDef({ id: 'C', dependencies: ['B'] }),
    ];
    const config = makeConfig(stages);

    const executor = createPipelineExecutor(config);
    executor.registerStageHandler('A', async () => ({}));
    executor.registerStageHandler('B', async () => {
      throw new Error('B exploded');
    });
    executor.registerStageHandler('C', async () => ({}));

    const result = await executor.start();

    // Verify expected statuses
    expect(result.stages.get('A')?.status).toBe('completed');
    expect(result.stages.get('B')?.status).toBe('failed');
    expect(result.stages.get('C')?.status).toBe('skipped');
    expect(result.status).toBe(PipelineStatus.PartiallyCompleted);

    // Build recovery plan via FailureRecoveryManager
    const snapshotData = executor.saveSnapshot();
    const restoredState = PipelineState.fromJSON(
      snapshotData.state as Record<string, unknown>,
      config.stages,
    );

    const frm = createFailureRecoveryManager();
    const pipelineSnapshot = frm.createSnapshot(
      config.pipelineId,
      restoredState,
      executor.artifactBus,
      snapshotData.metrics as Record<string, unknown>,
      (snapshotData.retryManager as any)?.retriedStageIds ?? [],
      'post-failure-recovery',
    );

    const plan = frm.buildRecoveryPlan(pipelineSnapshot, config.stages);

    expect(plan.completedStageIds).toEqual(['A']);
    expect(plan.failedStageIds).toEqual(['B']);
    expect(plan.skippedStageIds).toEqual(['C']);
    expect(plan.pendingStageIds).toEqual([]);
  });

  it('snapshot captures all artifact types', async () => {
    const stages = [
      makeStageDef({ id: 'discovery', dependencies: [] }),
      makeStageDef({ id: 'passive_analysis', dependencies: ['discovery'] }),
    ];
    const config = makeConfig(stages);

    const executor = createPipelineExecutor(config);
    executor.registerStageHandler('discovery', createDiscoveryStub());
    executor.registerStageHandler(
      'passive_analysis',
      createPassiveStub({ findingsCount: 5 }),
    );

    const result = await executor.start();
    expect(result.status).toBe(PipelineStatus.Completed);

    // Save snapshot
    const snapshot = executor.saveSnapshot();

    // Restore into a new executor
    const executor2 = createPipelineExecutor(config);
    executor2.restoreFromSnapshot(snapshot);

    // Verify every expected artifact category is present
    const requiredCategories: ArtifactCategory[] = [
      ArtifactCategory.Urls,
      ArtifactCategory.Findings,
      ArtifactCategory.Headers,
      ArtifactCategory.Metadata,
      ArtifactCategory.Technology,
    ];

    for (const cat of requiredCategories) {
      expect(executor2.artifactBus.count(cat)).toBeGreaterThan(0);
    }

    // Verify total artifact count is consistent
    const totalInOriginal = executor.artifactBus.count();
    const totalInRestored = executor2.artifactBus.count();
    expect(totalInRestored).toBe(totalInOriginal);

    // Collect metrics from original run
    const metrics = result.metrics;
    expect(metrics.completedStages).toBe(2);
    expect(metrics.skippedStages).toBe(0);
    expect(metrics.failedStages).toBe(0);
  }, 10_000);
});

// ══════════════════════════════════════════════════════════════════
// Stage 5: Pause / Resume
// ══════════════════════════════════════════════════════════════════

describe('Stage 5: Pause / Resume', () => {
  it('pauses pipeline during stage execution', async () => {
    let aStarted = false;

    const stages = [
      makeStageDef({ id: 'A', dependencies: [] }),
      makeStageDef({ id: 'B', dependencies: ['A'] }),
    ];
    const config = makeConfig(stages);
    const executor = createPipelineExecutor(config);

    executor.registerStageHandler('A', async ({ abortSignal }) => {
      await abortableDelay(2000, abortSignal);
      if (abortSignal.aborted) throw new Error('cancelled');
      return {};
    });
    executor.registerStageHandler('B', async () => ({}));

    executor.eventBus.on(PipelineEventType.StageStarted, (e: PipelineEvent) => {
      if (e.data?.stageId === 'A') aStarted = true;
    });

    const startPromise = executor.start();

    // Wait for A to actually start
    while (!aStarted) {
      await wait(10);
    }

    // Pause while A is running
    executor.pause();
    expect(executor.status).toBe(PipelineStatus.Paused);

    // Give the loop a moment — B must not have started
    await wait(150);
    expect(executor.status).toBe(PipelineStatus.Paused);

    // Cancel to clean up and get the result
    await executor.cancel();
    const result = await startPromise;

    expect(result.status).toBe(PipelineStatus.Cancelled);
    // B should never have started executing (cancel failed A, so B is
    // either pending or skipped — the key invariant is it never ran)
    expect(result.stages.get('B')?.startedAt).toBeNull();
  }, 10_000);

  it('resumes and completes remaining stages', async () => {
    let bStarted = false;

    const stages = [
      makeStageDef({ id: 'A', dependencies: [] }),
      makeStageDef({ id: 'B', dependencies: ['A'] }),
      makeStageDef({ id: 'C', dependencies: ['B'] }),
    ];
    const config = makeConfig(stages);
    const executor = createPipelineExecutor(config);

    executor.registerStageHandler('A', async () => ({}));
    executor.registerStageHandler('B', async ({ abortSignal }) => {
      await abortableDelay(300, abortSignal);
      return {};
    });
    executor.registerStageHandler('C', async () => ({}));

    executor.eventBus.on(PipelineEventType.StageStarted, (e: PipelineEvent) => {
      if (e.data?.stageId === 'B') bStarted = true;
    });

    const startPromise = executor.start();

    // Wait for B to start
    while (!bStarted) {
      await wait(10);
    }

    // Pause during B
    executor.pause();
    expect(executor.status).toBe(PipelineStatus.Paused);

    // Wait a beat to confirm pause holds
    await wait(100);

    // Resume
    executor.resume();
    expect(executor.status).toBe(PipelineStatus.Running);

    const result = await startPromise;

    expect(result.status).toBe(PipelineStatus.Completed);
    expect(result.stages.get('A')?.status).toBe('completed');
    expect(result.stages.get('B')?.status).toBe('completed');
    expect(result.stages.get('C')?.status).toBe('completed');

    // Collect metrics
    const metrics = result.metrics;
    expect(metrics.completedStages).toBe(3);
    expect(metrics.totalDurationMs).toBeGreaterThan(0);
  }, 10_000);

  it('snapshot after pause, restore and resume', async () => {
    const stages = [
      makeStageDef({ id: 'A', dependencies: [] }),
      makeStageDef({ id: 'B', dependencies: ['A'] }),
      makeStageDef({ id: 'C', dependencies: ['B'] }),
    ];
    const config = makeConfig(stages);

    // ── Executor 1: run until A completes, save snapshot ─────
    const executor1 = createPipelineExecutor(config);
    let snapshot: Record<string, unknown> | undefined;

    executor1.registerStageHandler('A', async ({ artifactBus }) => {
      artifactBus.publish({
        category: ArtifactCategory.Metadata,
        stageId: 'A',
        key: 'a-done',
        value: true,
      });
      return {};
    });
    executor1.registerStageHandler('B', async ({ abortSignal }) => {
      await abortableDelay(5000, abortSignal);
      return {};
    });
    executor1.registerStageHandler('C', async () => ({}));

    // Snapshot exactly when A completes (B still pending)
    executor1.eventBus.on(PipelineEventType.StageCompleted, (e: PipelineEvent) => {
      if (e.data?.stageId === 'A') {
        snapshot = executor1.saveSnapshot();
        executor1.cancel('snapshot-after-a');
      }
    });

    await executor1.start();
    expect(snapshot).toBeDefined();

    // ── Executor 2: restore and complete remaining stages ────
    const executor2 = createPipelineExecutor(config);
    executor2.restoreFromSnapshot(snapshot!);

    let a2RunCount = 0;
    let b2RunCount = 0;
    let c2RunCount = 0;

    executor2.registerStageHandler('A', async () => {
      a2RunCount++;
      return {};
    });
    executor2.registerStageHandler('B', async () => {
      b2RunCount++;
      return {};
    });
    executor2.registerStageHandler('C', async () => {
      c2RunCount++;
      return {};
    });

    const result2 = await executor2.start();

    // A was already completed in snapshot — must NOT re-run
    expect(a2RunCount).toBe(0);
    expect(b2RunCount).toBe(1);
    expect(c2RunCount).toBe(1);

    expect(result2.stages.get('A')?.status).toBe('completed');
    expect(result2.stages.get('B')?.status).toBe('completed');
    expect(result2.stages.get('C')?.status).toBe('completed');
    expect(result2.status).toBe(PipelineStatus.Completed);

    // Verify artifact from A is present (from snapshot)
    expect(
      executor2.artifactBus.hasKey(ArtifactCategory.Metadata, 'a-done'),
    ).toBe(true);
  }, 10_000);
});

// ══════════════════════════════════════════════════════════════════
// Stage 6: Retry Storm
// ══════════════════════════════════════════════════════════════════

describe('Stage 6: Retry Storm', () => {
  it('exponential backoff increases with each attempt', () => {
    // Test the RetryManager directly (synchronous, deterministic structure)
    const rm = new RetryManager();
    const stageDef = makeStageDef({ id: 'backoff-stage', maxRetries: 5 });
    const error = makeStageError(
      'backoff-stage',
      'timeout',
      'STAGE_ERROR',
      true,
    );

    const delays: number[] = [];

    for (let i = 0; i < 5; i++) {
      const delay = rm.getRetryDelay('backoff-stage', stageDef, error);
      expect(delay).toBeGreaterThan(0);
      delays.push(delay);
      rm.recordAttempt('backoff-stage');
    }

    // Verify monotonic increase (guaranteed despite jitter because
    // base doubles each step while jitter is bounded by 0.5 * base)
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }

    // Verify rough exponential growth: each delay should be at least 1.3× the previous
    for (let i = 1; i < delays.length; i++) {
      const ratio = delays[i] / delays[i - 1];
      expect(ratio).toBeGreaterThan(1.3);
    }

    // Budget should now be exhausted
    const exhausted = rm.getRetryDelay('backoff-stage', stageDef, error);
    expect(exhausted).toBe(-1);
  });

  it('respects max retry budget exactly', async () => {
    let attemptCount = 0;
    const maxRetries = 3;

    const stages = [makeStageDef({ id: 'budget-stage', maxRetries })];
    const config = makeConfig(stages);
    const executor = createPipelineExecutor(config);

    const retryTimestamps: number[] = [];

    executor.eventBus.on(
      PipelineEventType.RetryScheduled,
      (e: PipelineEvent) => {
        retryTimestamps.push(Date.now());
      },
    );

    executor.registerStageHandler('budget-stage', async () => {
      attemptCount++;
      throw new Error('timeout');
    });

    const result = await executor.start();

    // 1 initial attempt + maxRetries retries = 4 total calls
    expect(attemptCount).toBe(1 + maxRetries);
    expect(retryTimestamps.length).toBe(maxRetries);

    // Stage should be failed
    expect(result.stages.get('budget-stage')?.status).toBe('failed');
    expect(result.stages.get('budget-stage')?.retryCount).toBe(maxRetries);
    // With a single stage that fails, the executor marks pipeline as partially_completed
    expect(result.status).toBe(PipelineStatus.PartiallyCompleted);

    // Retry timestamps should show increasing delays (exponential backoff)
    for (let i = 1; i < retryTimestamps.length; i++) {
      const gap = retryTimestamps[i] - retryTimestamps[i - 1];
      // Each gap should be at least 800ms (allowing for jitter on a 1000ms base)
      expect(gap).toBeGreaterThan(800);
    }

    // Collect metrics
    const metrics = result.metrics;
    expect(metrics.totalRetries).toBe(maxRetries);
    expect(metrics.failedStages).toBe(1);
  }, 15_000);

  it('non-retryable errors fail immediately', async () => {
    let attemptCount = 0;

    const stages = [makeStageDef({ id: 'permfail', maxRetries: 10 })];
    const config = makeConfig(stages);
    const executor = createPipelineExecutor(config);

    const retryEvents: PipelineEvent[] = [];
    executor.eventBus.on(PipelineEventType.RetryScheduled, (e: PipelineEvent) => {
      retryEvents.push(e);
    });

    executor.registerStageHandler('permfail', async () => {
      attemptCount++;
      throw new Error('INVALID_CONFIG');
    });

    const result = await executor.start();

    // Should fail on the very first attempt — zero retries
    expect(attemptCount).toBe(1);
    expect(retryEvents.length).toBe(0);
    expect(result.stages.get('permfail')?.status).toBe('failed');
    expect(result.stages.get('permfail')?.retryCount).toBe(0);

    // Collect metrics
    const metrics = result.metrics;
    expect(metrics.totalRetries).toBe(0);
  }, 5_000);

  it('mixed retryable and non-retryable errors in parallel stages', async () => {
    const xAttempts: number[] = [];
    const yAttempts: number[] = [];

    const stages = [
      makeStageDef({ id: 'X', dependencies: [], maxRetries: 1 }),
      makeStageDef({ id: 'Y', dependencies: [], maxRetries: 10 }),
    ];
    const config = makeConfig(stages);
    const executor = createPipelineExecutor(config);

    const retryEvents: string[] = [];
    executor.eventBus.on(PipelineEventType.RetryScheduled, (e: PipelineEvent) => {
      retryEvents.push(e.data?.stageId as string);
    });

    // X throws a retryable error
    executor.registerStageHandler('X', async () => {
      xAttempts.push(Date.now());
      throw new Error('timeout');
    });

    // Y throws a non-retryable error
    executor.registerStageHandler('Y', async () => {
      yAttempts.push(Date.now());
      throw new Error('INVALID_CONFIG');
    });

    const result = await executor.start();

    // Both stages should have failed
    expect(result.stages.get('X')?.status).toBe('failed');
    expect(result.stages.get('Y')?.status).toBe('failed');

    // X should have retried once (1 initial + 1 retry = 2 attempts)
    expect(xAttempts.length).toBe(2);
    expect(result.stages.get('X')?.retryCount).toBe(1);

    // Y should have failed immediately (1 attempt, 0 retries)
    expect(yAttempts.length).toBe(1);
    expect(result.stages.get('Y')?.retryCount).toBe(0);

    // Retry events should only reference X
    expect(retryEvents).toEqual(['X']);

    // Collect metrics
    const metrics = result.metrics;
    expect(metrics.totalRetries).toBe(1);
    expect(metrics.failedStages).toBe(2);
  }, 10_000);

  it('classifyError correctly categorizes 20+ error patterns', () => {
    // ── Transient (retryable) ──────────────────────────────
    const transientCases = [
      { code: 'TIMEOUT', msg: 'request timed out' },
      { code: 'NETWORK_ERROR', msg: 'network failure' },
      { code: 'RATE_LIMIT_EXCEEDED', msg: 'rate limit hit' },
      { code: 'CONNECTION_REFUSED', msg: 'connection lost' },
      { code: 'STAGE_ERROR', msg: 'timeout after 30s' },
      { code: 'STAGE_ERROR', msg: 'econnrefused 127.0.0.1:443' },
      { code: 'STAGE_ERROR', msg: 'econnreset by peer' },
      { code: 'HTTP_429', msg: 'got 429 from server' },
      { code: 'HTTP_503', msg: '503 service unavailable' },
      { code: 'STAGE_ERROR', msg: 'rate limit exceeded, backoff' },
    ];

    for (const { code, msg } of transientCases) {
      const result = classifyError(
        makeStageError('test', msg, code, false),
      );
      expect(result.retryable, `Expected retryable for code=${code} msg="${msg}"`).toBe(true);
      expect(result.category).toBe('transient');
      expect(result.suggestedDelayMs).toBeGreaterThan(0);
    }

    // ── Permanent (not retryable) ──────────────────────────
    const permanentCases = [
      { code: 'INVALID_CONFIG', msg: 'bad configuration' },
      { code: 'AUTH_FAILED', msg: 'authentication failure' },
      { code: 'BINARY_MISSING', msg: 'tool not installed' },
      { code: 'CONTRACT_VIOLATION', msg: 'unexpected response format' },
      { code: 'STAGE_ERROR', msg: 'invalid configuration file' },
      { code: 'STAGE_ERROR', msg: 'authentication failed for user' },
      { code: 'STAGE_ERROR', msg: 'binary not found on path' },
      { code: 'STAGE_ERROR', msg: 'permission denied for /etc/shadow' },
    ];

    for (const { code, msg } of permanentCases) {
      const result = classifyError(
        makeStageError('test', msg, code, false),
      );
      expect(result.retryable, `Expected non-retryable for code=${code} msg="${msg}"`).toBe(false);
      expect(result.category).toBe('permanent');
      expect(result.suggestedDelayMs).toBe(0);
    }

    // ── Unknown (not retryable) ────────────────────────────
    const unknownCases = [
      { code: 'STAGE_ERROR', msg: 'something unexpected happened' },
      { code: 'UNKNOWN_ERR', msg: 'unknown failure mode' },
      { code: 'CUSTOM_FAULT', msg: 'custom error from plugin' },
    ];

    for (const { code, msg } of unknownCases) {
      const result = classifyError(
        makeStageError('test', msg, code, false),
      );
      expect(result.retryable, `Expected non-retryable for code=${code} msg="${msg}"`).toBe(false);
      expect(result.category).toBe('unknown');
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// Stage 8: Cancellation
// ══════════════════════════════════════════════════════════════════

describe('Stage 8: Cancellation', () => {
  it('cancel before start is no-op', async () => {
    const stages = [
      makeStageDef({ id: 'A', dependencies: [] }),
      makeStageDef({ id: 'B', dependencies: ['A'] }),
    ];
    const config = makeConfig(stages);
    const executor = createPipelineExecutor(config);

    // Cancel before start — must not throw
    await expect(executor.cancel('early-cancel')).resolves.toBeUndefined();

    // Status should remain Created
    expect(executor.status).toBe(PipelineStatus.Created);
    expect(executor.isRunning).toBe(false);
  });

  it('cancel during slow stage stops execution', async () => {
    const stages = [
      makeStageDef({ id: 'A', dependencies: [] }),
      makeStageDef({ id: 'B', dependencies: ['A'] }),
    ];
    const config = makeConfig(stages);
    const executor = createPipelineExecutor(config);

    executor.registerStageHandler('A', async ({ abortSignal }) => {
      await abortableDelay(2000, abortSignal);
      if (abortSignal.aborted) throw new Error('cancelled');
      return {};
    });
    executor.registerStageHandler('B', async () => ({}));

    const startPromise = executor.start();

    // Let A start, then cancel quickly
    await wait(50);
    await executor.cancel('stop-now');

    const result = await startPromise;

    expect(result.status).toBe(PipelineStatus.Cancelled);
    // B should never have started executing
    expect(result.stages.get('B')?.startedAt).toBeNull();

    // Collect metrics
    const metrics = result.metrics;
    expect(metrics.failedStages).toBeGreaterThanOrEqual(0);
    expect(metrics.completedStages).toBeLessThan(2);
  }, 10_000);

  it('cancel during artifact publication preserves state', async () => {
    let handlerDone = false;

    const handler: StageHandler = async ({ artifactBus, abortSignal }) => {
      // Publish artifacts one by one, checking abort
      for (let i = 0; i < 50; i++) {
        if (abortSignal.aborted) break;
        artifactBus.publish({
          category: ArtifactCategory.Findings,
          stageId: 'pub-stage',
          key: `finding-${i}`,
          value: {
            index: i,
            title: `Finding ${i}`,
            severity: i % 3 === 0 ? 'high' : 'info',
            evidence: [{ type: 'request', content: `data-${i}` }],
          },
        });
      }
      // Long sleep — cancel should hit here
      await abortableDelay(5000, abortSignal);
      handlerDone = true;
      return {};
    };

    const stages = [makeStageDef({ id: 'pub-stage' })];
    const config = makeConfig(stages);
    const executor = createPipelineExecutor(config);
    executor.registerStageHandler('pub-stage', handler);

    const startPromise = executor.start();

    // Give the handler a moment to publish some artifacts
    await wait(30);
    await executor.cancel('preserve-test');
    await startPromise;

    // Wait for handler to actually finish (abort resolves the delay)
    for (let i = 0; i < 100 && !handlerDone; i++) {
      await wait(10);
    }
    expect(handlerDone).toBe(true);

    const findings = executor.artifactBus.getByCategory(
      ArtifactCategory.Findings,
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.length).toBeLessThanOrEqual(50);

    // Verify every published artifact has a consistent, valid structure
    for (const f of findings) {
      const val = f.value as Record<string, unknown>;
      expect(val).toHaveProperty('index');
      expect(val).toHaveProperty('title');
      expect(val).toHaveProperty('severity');
      expect(val).toHaveProperty('evidence');
      expect(typeof (val.index)).toBe('number');
      expect(typeof (val.title)).toBe('string');
      expect(Array.isArray(val.evidence)).toBe(true);
    }
  }, 10_000);

  it('cancel during active scan (simulated) is clean', async () => {
    let handlerDone = false;

    const handler: StageHandler = async ({ artifactBus, abortSignal }) => {
      // Publish 100 findings quickly
      for (let i = 0; i < 100; i++) {
        if (abortSignal.aborted) break;
        artifactBus.publish({
          category: ArtifactCategory.Findings,
          stageId: 'scanner',
          key: `scan-finding-${i}`,
          value: {
            id: `vuln-${i}`,
            title: `Vulnerability ${i}`,
            severity: ['critical', 'high', 'medium', 'low', 'info'][i % 5],
            description: `Detailed description for vulnerability ${i}`,
            location: {
              url: `https://example.com/page/${i}`,
              parameter: `param${i % 4}`,
            },
            evidence: [
              {
                type: 'request_response',
                content: `GET /page/${i}?param${i % 4}=test`,
              },
            ],
            confidence: 0.7 + (i % 3) * 0.1,
          },
        });
      }
      // Long sleep — cancel hits here
      await abortableDelay(5000, abortSignal);

      // These should NOT execute after abort
      if (!abortSignal.aborted) {
        for (let i = 100; i < 200; i++) {
          artifactBus.publish({
            category: ArtifactCategory.Findings,
            stageId: 'scanner',
            key: `scan-finding-${i}`,
            value: { id: `vuln-${i}`, late: true },
          });
        }
      }

      handlerDone = true;
      return {};
    };

    const stages = [makeStageDef({ id: 'scanner' })];
    const config = makeConfig(stages);
    const executor = createPipelineExecutor(config);
    executor.registerStageHandler('scanner', handler);

    const startPromise = executor.start();
    await wait(50);
    await executor.cancel('active-scan-cancel');
    await startPromise;

    // Wait for handler to finish
    for (let i = 0; i < 100 && !handlerDone; i++) {
      await wait(10);
    }
    expect(handlerDone).toBe(true);

    const findings = executor.artifactBus.getByCategory(
      ArtifactCategory.Findings,
    );

    // Should have published some findings but NOT the "late" batch
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.length).toBeLessThanOrEqual(100);

    // Verify no "late" findings leaked through
    for (const f of findings) {
      const val = f.value as Record<string, unknown>;
      expect(val).not.toHaveProperty('late');
      // Every finding must have the full expected structure
      expect(val).toHaveProperty('id');
      expect(val).toHaveProperty('title');
      expect(val).toHaveProperty('severity');
      expect(val).toHaveProperty('description');
      expect(val).toHaveProperty('location');
      expect(val).toHaveProperty('evidence');
      expect(val).toHaveProperty('confidence');

      // Verify location has url
      const loc = val.location as Record<string, unknown>;
      expect(loc).toHaveProperty('url');

      // Verify evidence is non-empty array
      const evidence = val.evidence as Array<Record<string, unknown>>;
      expect(evidence.length).toBeGreaterThan(0);
    }

    // Collect metrics
    const ctx = executor.getContextSnapshot();
    expect(ctx.findingCount).toBe(findings.length);
  }, 10_000);

  it('double cancel is safe', async () => {
    const stages = [makeStageDef({ id: 'A', dependencies: [] })];
    const config = makeConfig(stages);
    const executor = createPipelineExecutor(config);

    executor.registerStageHandler('A', async ({ abortSignal }) => {
      await abortableDelay(2000, abortSignal);
      if (abortSignal.aborted) throw new Error('cancelled');
      return {};
    });

    const startPromise = executor.start();
    await wait(30);

    // First cancel
    await executor.cancel('first');
    // Second cancel — must be a safe no-op
    await expect(executor.cancel('second')).resolves.toBeUndefined();

    const result = await startPromise;
    expect(result.status).toBe(PipelineStatus.Cancelled);
  }, 10_000);
});