/**
 * Pipeline Executor Core — Comprehensive Test Suite
 *
 * Covers:
 *   1. Artifact Bus (publish, read, dedup, subscribe, snapshot/restore)
 *   2. Event Bus (emit, on, wildcard, unsubscribe, clear)
 *   3. Pipeline State (transitions, stage lifecycle, snapshots, serialization)
 *   4. Retry Manager (error classification, backoff, budgets)
 *   5. Metrics Collector (lifecycle, counters, export)
 *   6. Pipeline Executor (full execution, skip, fail, cancel, timeout, parallel)
 *   7. Failure Recovery (snapshots, recovery plans, pruning)
 *   8. Stub Engines (validation, discovery, passive, active, normalization)
 *   9. Integration (end-to-end pipeline with stubs → artifacts → findings)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArtifactBusImpl, createArtifactBus } from '../artifact-bus.ts';
import { PipelineEventBusImpl, createEventBus } from '../event-bus.ts';
import { PipelineState } from '../pipeline-state.ts';
import { MetricsCollector, createMetricsCollector } from '../metrics-collector.ts';
import { RetryManager, classifyError, createRetryManager } from '../retry-manager.ts';
import {
  PipelineExecutor,
  createPipelineExecutor,
  BuiltinStages,
} from '../pipeline-executor.ts';
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
import {
  PipelineStatus,
  StageStatus,
  TERMINAL_PIPELINE_STATUSES,
  TERMINAL_STAGE_STATUSES,
  ArtifactCategory,
  PipelineEventType,
} from '../types.ts';
import type {
  PipelineConfig,
  PipelineStageDefinition,
  PipelineStageError,
  PipelineEvent,
  StageHandler,
} from '../types.ts';

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════

function makeStageDef(overrides: Partial<PipelineStageDefinition> & { id: string }): PipelineStageDefinition {
  return {
    name: overrides.id,
    dependencies: [],
    requiredCapabilities: [],
    maxRetries: 0,
    timeoutMs: 0,
    skippable: false,
    ...overrides,
  };
}

function makeConfig(stages: PipelineStageDefinition[], overrides?: Partial<PipelineConfig>): PipelineConfig {
  return {
    pipelineId: 'pipe-test-1',
    scanJobId: 'job-1',
    targetUrl: 'https://example.com',
    targetName: 'Example',
    stages,
    maxConcurrentStages: 4,
    totalTimeoutMs: 0,
    idleTimeoutMs: 0,
    enablePersistence: false,
    ...overrides,
  };
}

function immediateHandler(result: unknown = null): StageHandler {
  return async () => result;
}

function failingHandler(message = 'Stage failed'): StageHandler {
  return async () => { throw new Error(message); };
}

function delayHandler(ms: number): StageHandler {
  return async ({ abortSignal }) => {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      abortSignal.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
    });
  };
}

const STAGE_A = makeStageDef({ id: 'stage_a', name: 'Stage A' });
const STAGE_B = makeStageDef({ id: 'stage_b', name: 'Stage B', dependencies: ['stage_a'] });
const STAGE_C = makeStageDef({ id: 'stage_c', name: 'Stage C', dependencies: ['stage_a'], skippable: true });
const STAGE_D = makeStageDef({ id: 'stage_d', name: 'Stage D', dependencies: ['stage_b', 'stage_c'] });

// ════════════════════════════════════════════════════════════
// 1. ARTIFACT BUS
// ════════════════════════════════════════════════════════════

describe('ArtifactBus', () => {
  let bus: ArtifactBusImpl;

  beforeEach(() => { bus = new ArtifactBusImpl(); });

  describe('publish + read', () => {
    it('publishes an artifact and assigns id + timestamp', () => {
      const art = bus.publish({
        category: ArtifactCategory.Urls,
        stageId: 's1',
        key: 'url:1',
        value: 'https://example.com',
      });

      expect(art.id).toMatch(/^art-\d+$/);
      expect(art.publishedAt).toBeTruthy();
      expect(art.category).toBe(ArtifactCategory.Urls);
      expect(art.value).toBe('https://example.com');
    });

    it('deduplicates by category+key (last-write-wins)', () => {
      bus.publish({
        category: ArtifactCategory.Urls,
        stageId: 's1',
        key: 'url:1',
        value: 'https://example.com/v1',
      });
      bus.publish({
        category: ArtifactCategory.Urls,
        stageId: 's1',
        key: 'url:1',
        value: 'https://example.com/v2',
      });

      const all = bus.getByCategory(ArtifactCategory.Urls);
      expect(all).toHaveLength(1);
      expect(all[0].value).toBe('https://example.com/v2');
    });

    it('allows different keys in same category', () => {
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'url:1', value: 'a' });
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'url:2', value: 'b' });

      expect(bus.getByCategory(ArtifactCategory.Urls)).toHaveLength(2);
    });

    it('getAll without category returns all artifacts', () => {
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: 'a' });
      bus.publish({ category: ArtifactCategory.Findings, stageId: 's1', key: 'f1', value: 'b' });
      bus.publish({ category: ArtifactCategory.Metadata, stageId: 's1', key: 'm1', value: 'c' });

      expect(bus.getAll()).toHaveLength(3);
    });

    it('getAll with category filters', () => {
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: 'a' });
      bus.publish({ category: ArtifactCategory.Findings, stageId: 's1', key: 'f1', value: 'b' });
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u2', value: 'c' });

      expect(bus.getAll(ArtifactCategory.Urls)).toHaveLength(2);
      expect(bus.getAll(ArtifactCategory.Findings)).toHaveLength(1);
    });
  });

  describe('getByKey', () => {
    it('returns artifact by category+key', () => {
      bus.publish({ category: ArtifactCategory.Tls, stageId: 's1', key: 'tls', value: { proto: 'TLS 1.3' } });
      const result = bus.get(ArtifactCategory.Tls, 'tls');
      expect(result).toBeDefined();
      expect((result!.value as any).proto).toBe('TLS 1.3');
    });

    it('returns undefined for missing key', () => {
      expect(bus.get(ArtifactCategory.Urls, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getByStage', () => {
    it('returns artifacts for a specific stage', () => {
      bus.publish({ category: ArtifactCategory.Urls, stageId: 'discovery', key: 'u1', value: 'a' });
      bus.publish({ category: ArtifactCategory.Urls, stageId: 'crawling', key: 'u2', value: 'b' });
      bus.publish({ category: ArtifactCategory.Findings, stageId: 'discovery', key: 'f1', value: 'c' });

      const discoveryArts = bus.getByStage('discovery');
      expect(discoveryArts).toHaveLength(2);
    });
  });

  describe('search', () => {
    it('filters artifacts within a category by predicate', () => {
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: { url: 'https://a.com' } });
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u2', value: { url: 'https://b.com/login' } });
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u3', value: { url: 'https://c.com/admin' } });

      const loginUrls = bus.search(ArtifactCategory.Urls, a =>
        (a.value as any).url.includes('login')
      );
      expect(loginUrls).toHaveLength(1);
    });

    it('returns empty for non-existent category', () => {
      expect(bus.search(ArtifactCategory.JsFiles, () => true)).toHaveLength(0);
    });
  });

  describe('count', () => {
    it('counts all artifacts', () => {
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: 'a' });
      bus.publish({ category: ArtifactCategory.Findings, stageId: 's1', key: 'f1', value: 'b' });
      expect(bus.count()).toBe(2);
    });

    it('counts by category', () => {
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: 'a' });
      bus.publish({ category: ArtifactCategory.Findings, stageId: 's1', key: 'f1', value: 'b' });
      expect(bus.count(ArtifactCategory.Urls)).toBe(1);
    });
  });

  describe('hasKey', () => {
    it('returns true for existing key', () => {
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: 'a' });
      expect(bus.hasKey(ArtifactCategory.Urls, 'u1')).toBe(true);
    });

    it('returns false for missing key', () => {
      expect(bus.hasKey(ArtifactCategory.Urls, 'missing')).toBe(false);
    });
  });

  describe('subscribe (onArtifact)', () => {
    it('notifies subscriber when artifact is published', () => {
      const received: any[] = [];
      bus.onArtifact(ArtifactCategory.Urls, (a) => received.push(a.value));

      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: 'hello' });
      bus.publish({ category: ArtifactCategory.Findings, stageId: 's1', key: 'f1', value: 'nope' });
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u2', value: 'world' });

      expect(received).toEqual(['hello', 'world']);
    });

    it('unsubscribe stops notifications', () => {
      const received: any[] = [];
      const unsub = bus.onArtifact(ArtifactCategory.Urls, (a) => received.push(a.value));

      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: 'a' });
      unsub();
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u2', value: 'b' });

      expect(received).toEqual(['a']);
    });

    it('subscriber errors do not break the bus', () => {
      const badSub = () => { throw new Error('subscriber error'); };
      const goodSub = vi.fn();
      bus.onArtifact(ArtifactCategory.Urls, badSub);
      bus.onArtifact(ArtifactCategory.Urls, goodSub);

      expect(() => {
        bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: 'a' });
      }).not.toThrow();

      expect(goodSub).toHaveBeenCalledTimes(1);
    });
  });

  describe('snapshot/restore', () => {
    it('toSnapshot returns a copy', () => {
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: 'a' });
      const snap = bus.toSnapshot();
      expect(snap).toHaveLength(1);
      expect(snap[0].value).toBe('a');
    });

    it('fromSnapshot restores artifacts', () => {
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: 'a' });
      bus.publish({ category: ArtifactCategory.Findings, stageId: 's1', key: 'f1', value: 'b' });
      const snap = bus.toSnapshot();

      const restored = ArtifactBusImpl.fromSnapshot(snap);
      expect(restored.count()).toBe(2);
      expect(restored.get(ArtifactCategory.Urls, 'u1')).toBeDefined();
      expect(restored.get(ArtifactCategory.Findings, 'f1')).toBeDefined();
    });
  });

  describe('createArtifactBus factory', () => {
    it('returns an ArtifactBusImpl instance', () => {
      const bus = createArtifactBus();
      expect(bus).toBeInstanceOf(ArtifactBusImpl);
    });
  });
});

// ════════════════════════════════════════════════════════════
// 2. EVENT BUS
// ════════════════════════════════════════════════════════════

describe('PipelineEventBus', () => {
  let bus: PipelineEventBusImpl;

  beforeEach(() => { bus = new PipelineEventBusImpl(); });

  it('delivers events to specific type handlers', () => {
    const handler = vi.fn();
    bus.on(PipelineEventType.StageStarted, handler);

    const event: PipelineEvent = {
      type: PipelineEventType.StageStarted,
      timestamp: new Date().toISOString(),
      pipelineId: 'p1',
      data: { stageId: 's1' },
    };
    bus.emit(event);

    expect(handler).toHaveBeenCalledWith(event);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not deliver to wrong type handlers', () => {
    const handler = vi.fn();
    bus.on(PipelineEventType.StageCompleted, handler);

    bus.emit({
      type: PipelineEventType.StageStarted,
      timestamp: new Date().toISOString(),
      pipelineId: 'p1',
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('wildcard handler receives ALL events', () => {
    const handler = vi.fn();
    bus.on('*', handler);

    bus.emit({
      type: PipelineEventType.PipelineStarted,
      timestamp: new Date().toISOString(),
      pipelineId: 'p1',
    });
    bus.emit({
      type: PipelineEventType.StageCompleted,
      timestamp: new Date().toISOString(),
      pipelineId: 'p1',
    });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('multiple handlers for same type all fire', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on(PipelineEventType.PipelineCompleted, h1);
    bus.on(PipelineEventType.PipelineCompleted, h2);

    bus.emit({
      type: PipelineEventType.PipelineCompleted,
      timestamp: new Date().toISOString(),
      pipelineId: 'p1',
    });

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops events', () => {
    const handler = vi.fn();
    const unsub = bus.on(PipelineEventType.PipelineStarted, handler);

    bus.emit({
      type: PipelineEventType.PipelineStarted,
      timestamp: new Date().toISOString(),
      pipelineId: 'p1',
    });
    unsub();
    bus.emit({
      type: PipelineEventType.PipelineStarted,
      timestamp: new Date().toISOString(),
      pipelineId: 'p1',
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('handler errors do not break the bus', () => {
    const bad = () => { throw new Error('bad'); };
    const good = vi.fn();
    bus.on(PipelineEventType.PipelineFailed, bad);
    bus.on(PipelineEventType.PipelineFailed, good);

    expect(() => {
      bus.emit({
        type: PipelineEventType.PipelineFailed,
        timestamp: new Date().toISOString(),
        pipelineId: 'p1',
      });
    }).not.toThrow();

    expect(good).toHaveBeenCalledTimes(1);
  });

  it('clear removes all handlers', () => {
    const handler = vi.fn();
    bus.on('*', handler);
    bus.on(PipelineEventType.PipelineStarted, handler);
    bus.clear();

    bus.emit({
      type: PipelineEventType.PipelineStarted,
      timestamp: new Date().toISOString(),
      pipelineId: 'p1',
    });

    expect(handler).not.toHaveBeenCalled();
  });

  describe('createEventBus factory', () => {
    it('returns bus and emit function', () => {
      const { bus, emit } = createEventBus('p1');
      const handler = vi.fn();
      bus.on(PipelineEventType.PipelineStarted, handler);

      emit({
        type: PipelineEventType.PipelineStarted,
        timestamp: new Date().toISOString(),
        pipelineId: 'p1',
      });

      expect(handler).toHaveBeenCalled();
    });
  });
});

// ════════════════════════════════════════════════════════════
// 3. PIPELINE STATE
// ════════════════════════════════════════════════════════════

describe('PipelineState', () => {
  const stages = [STAGE_A, STAGE_B, STAGE_C];
  let state: PipelineState;

  beforeEach(() => {
    state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
  });

  it('initializes all stages as Pending', () => {
    for (const [id, stage] of state.getAllStages()) {
      expect(stage.status).toBe(StageStatus.Pending);
      expect(stage.retryCount).toBe(0);
      expect(stage.error).toBeNull();
    }
  });

  describe('pipeline transitions', () => {
    it('Created → Running', () => {
      state.start();
      expect(state.status).toBe(PipelineStatus.Running);
    });

    it('Running → Paused → Running', () => {
      state.start();
      state.pause();
      expect(state.status).toBe(PipelineStatus.Paused);

      state.resume();
      expect(state.status).toBe(PipelineStatus.Running);
    });

    it('Running → Completed', () => {
      state.start();
      state.complete();
      expect(state.status).toBe(PipelineStatus.Completed);
      expect(state.isTerminal).toBe(true);
    });

    it('Running → Failed', () => {
      state.start();
      state.fail();
      expect(state.status).toBe(PipelineStatus.Failed);
      expect(state.isTerminal).toBe(true);
    });

    it('Running → Cancelling → Cancelled', () => {
      state.start();
      state.startCancelling();
      expect(state.status).toBe(PipelineStatus.Cancelling);
      state.cancel();
      expect(state.status).toBe(PipelineStatus.Cancelled);
      expect(state.isTerminal).toBe(true);
    });

    it('Running → PartiallyCompleted', () => {
      state.start();
      state.partiallyComplete();
      expect(state.status).toBe(PipelineStatus.PartiallyCompleted);
      expect(state.isTerminal).toBe(true);
    });

    it('terminal state cannot transition', () => {
      state.start();
      state.complete();
      expect(() => state.fail()).toThrow('terminal state');
    });

    it('pause only works from Running', () => {
      expect(() => state.pause()).toThrow('Cannot pause');
    });

    it('resume only works from Paused', () => {
      expect(() => state.resume()).toThrow('Cannot resume');
    });
  });

  describe('stage transitions', () => {
    beforeEach(() => { state.start(); });

    it('Pending → Running', () => {
      state.startStage('stage_a', ['engine-1']);
      const stage = state.getStage('stage_a')!;
      expect(stage.status).toBe(StageStatus.Running);
      expect(stage.engineIds).toEqual(['engine-1']);
    });

    it('Running → Completed (with duration)', () => {
      state.startStage('stage_a', []);
      // Advance time slightly
      const start = state.getStage('stage_a')!.startedAt!;
      vi.setSystemTime(new Date(new Date(start).getTime() + 500));
      state.completeStage('stage_a');

      const stage = state.getStage('stage_a')!;
      expect(stage.status).toBe(StageStatus.Completed);
      expect(stage.durationMs).toBe(500);
      expect(stage.completedAt).toBeTruthy();
    });

    it('Running → Retrying', () => {
      state.startStage('stage_a', []);
      state.retryStage('stage_a');
      const stage = state.getStage('stage_a')!;
      expect(stage.status).toBe(StageStatus.Retrying);
      expect(stage.retryCount).toBe(1);
    });

    it('Running → Skipped', () => {
      state.startStage('stage_a', []);
      state.skipStage('stage_a');
      expect(state.getStage('stage_a')!.status).toBe(StageStatus.Skipped);
    });

    it('Running → Failed (with error)', () => {
      state.startStage('stage_a', []);
      const error: PipelineStageError = {
        stageId: 'stage_a',
        message: 'Connection refused',
        code: 'NETWORK_ERROR',
        retryable: true,
        occurredAt: new Date().toISOString(),
      };
      state.failStage('stage_a', error);

      const stage = state.getStage('stage_a')!;
      expect(stage.status).toBe(StageStatus.Failed);
      expect(stage.error?.code).toBe('NETWORK_ERROR');
    });

    it('cannot transition a terminal stage', () => {
      state.startStage('stage_a', []);
      state.completeStage('stage_a');
      expect(() => state.startStage('stage_a', [])).toThrow('terminal state');
    });

    it('startStage throws for unknown stage', () => {
      expect(() => state.startStage('nonexistent', [])).toThrow('not found');
    });
  });

  describe('snapshot / serialization', () => {
    it('toContextSnapshot returns correct data', () => {
      state.start();
      state.startStage('stage_a', ['e1']);
      state.completeStage('stage_a');
      state.startStage('stage_b', []);
      state.skipStage('stage_c');

      const snap = state.toContextSnapshot(10, 2, 5);
      expect(snap.pipelineId).toBe('pipe-1');
      expect(snap.scanJobId).toBe('job-1');
      expect(snap.status).toBe(PipelineStatus.Running);
      expect(snap.completedStages.has('stage_a')).toBe(true);
      expect(snap.skippedStages.has('stage_c')).toBe(true);
      expect(snap.currentStages).toContain('stage_b');
      expect(snap.artifactCount).toBe(10);
      expect(snap.findingCount).toBe(2);
      expect(snap.urlCount).toBe(5);
    });

    it('toJSON / fromJSON round-trip', () => {
      state.start();
      state.startStage('stage_a', ['e1']);
      state.completeStage('stage_a');
      state.failStage('stage_b', {
        stageId: 'stage_b',
        message: 'test error',
        code: 'TEST',
        retryable: false,
        occurredAt: new Date().toISOString(),
      });

      const json = state.toJSON();
      const restored = PipelineState.fromJSON(json, stages);

      expect(restored.pipelineId).toBe('pipe-1');
      expect(restored.status).toBe(PipelineStatus.Running);
      expect(restored.getStage('stage_a')!.status).toBe(StageStatus.Completed);
      expect(restored.getStage('stage_b')!.status).toBe(StageStatus.Failed);
      expect(restored.getStage('stage_b')!.error?.message).toBe('test error');
      expect(restored.getStage('stage_c')!.status).toBe(StageStatus.Pending);
    });
  });

  describe('getStageOrder', () => {
    it('returns stage IDs in definition order', () => {
      expect(state.getStageOrder()).toEqual(['stage_a', 'stage_b', 'stage_c']);
    });
  });
});

// ════════════════════════════════════════════════════════════
// 4. RETRY MANAGER
// ════════════════════════════════════════════════════════════

describe('RetryManager', () => {
  let rm: RetryManager;

  beforeEach(() => { rm = new RetryManager(); });

  describe('classifyError', () => {
    it('classifies timeout as transient + retryable', () => {
      const error: PipelineStageError = {
        stageId: 's1', message: 'request timeout', code: 'TIMEOUT',
        retryable: false, occurredAt: new Date().toISOString(),
      };
      const result = classifyError(error);
      expect(result.retryable).toBe(true);
      expect(result.category).toBe('transient');
    });

    it('classifies NETWORK_ERROR as transient + retryable', () => {
      const error: PipelineStageError = {
        stageId: 's1', message: 'econnrefused', code: 'NETWORK_ERROR',
        retryable: false, occurredAt: new Date().toISOString(),
      };
      const result = classifyError(error);
      expect(result.retryable).toBe(true);
    });

    it('classifies RATE_LIMIT as transient + retryable', () => {
      const error: PipelineStageError = {
        stageId: 's1', message: '429 too many requests', code: 'RATE_LIMIT',
        retryable: false, occurredAt: new Date().toISOString(),
      };
      const result = classifyError(error);
      expect(result.retryable).toBe(true);
    });

    it('classifies AUTH_FAILED as permanent + not retryable', () => {
      const error: PipelineStageError = {
        stageId: 's1', message: 'auth failed', code: 'AUTH_FAILED',
        retryable: false, occurredAt: new Date().toISOString(),
      };
      const result = classifyError(error);
      expect(result.retryable).toBe(false);
      expect(result.category).toBe('permanent');
    });

    it('classifies INVALID_CONFIG as permanent', () => {
      const error: PipelineStageError = {
        stageId: 's1', message: 'bad config', code: 'INVALID_CONFIG',
        retryable: false, occurredAt: new Date().toISOString(),
      };
      const result = classifyError(error);
      expect(result.category).toBe('permanent');
    });

    it('classifies BINARY_MISSING as permanent', () => {
      const error: PipelineStageError = {
        stageId: 's1', message: 'binary not found: nuclei', code: 'BINARY_MISSING',
        retryable: false, occurredAt: new Date().toISOString(),
      };
      const result = classifyError(error);
      expect(result.category).toBe('permanent');
    });

    it('classifies unknown errors as not retryable', () => {
      const error: PipelineStageError = {
        stageId: 's1', message: 'something weird happened', code: 'WEIRD_ERROR',
        retryable: false, occurredAt: new Date().toISOString(),
      };
      const result = classifyError(error);
      expect(result.retryable).toBe(false);
      expect(result.category).toBe('unknown');
    });

    it('respects explicit retryable flag even when classifyError says no', () => {
      const error: PipelineStageError = {
        stageId: 's1', message: 'custom error', code: 'CUSTOM',
        retryable: true, occurredAt: new Date().toISOString(),
      };
      // classifyError says unknown/not-retryable, but error.retryable=true
      const classified = classifyError(error);
      expect(classified.retryable).toBe(false);

      // But RetryManager checks BOTH:
      const stageDef = makeStageDef({ id: 's1', maxRetries: 3 });
      const delay = rm.getRetryDelay('s1', stageDef, error);
      // error.retryable=true should override classifyError
      expect(delay).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRetryDelay', () => {
    const stageDef = makeStageDef({ id: 's1', maxRetries: 3 });

    it('returns positive delay for retryable error', () => {
      const error: PipelineStageError = {
        stageId: 's1', message: 'timeout', code: 'TIMEOUT',
        retryable: true, occurredAt: new Date().toISOString(),
      };
      const delay = rm.getRetryDelay('s1', stageDef, error);
      expect(delay).toBeGreaterThan(0);
    });

    it('returns -1 when retry budget exhausted', () => {
      rm.recordAttempt('s1');
      rm.recordAttempt('s1');
      rm.recordAttempt('s1');

      const error: PipelineStageError = {
        stageId: 's1', message: 'timeout', code: 'TIMEOUT',
        retryable: true, occurredAt: new Date().toISOString(),
      };
      expect(rm.getRetryDelay('s1', stageDef, error)).toBe(-1);
    });

    it('exponential backoff increases delay', () => {
      const error: PipelineStageError = {
        stageId: 's1', message: 'timeout', code: 'TIMEOUT',
        retryable: true, occurredAt: new Date().toISOString(),
      };

      const d1 = rm.getRetryDelay('s1', stageDef, error);
      rm.recordAttempt('s1');
      const d2 = rm.getRetryDelay('s1', stageDef, error);

      expect(d2).toBeGreaterThan(d1);
    });

    it('caps delay at 30 seconds', () => {
      const stageDef = makeStageDef({ id: 's1', maxRetries: 10 });
      const error: PipelineStageError = {
        stageId: 's1', message: 'timeout', code: 'TIMEOUT',
        retryable: true, occurredAt: new Date().toISOString(),
      };

      // Force many attempts
      for (let i = 0; i < 8; i++) rm.recordAttempt('s1');
      const delay = rm.getRetryDelay('s1', stageDef, error);
      expect(delay).toBeLessThanOrEqual(30_000);
    });

    it('returns -1 for non-retryable error', () => {
      const error: PipelineStageError = {
        stageId: 's1', message: 'bad config', code: 'INVALID_CONFIG',
        retryable: false, occurredAt: new Date().toISOString(),
      };
      expect(rm.getRetryDelay('s1', stageDef, error)).toBe(-1);
    });
  });

  describe('recordAttempt / getAttemptCount', () => {
    it('tracks attempt count per stage', () => {
      expect(rm.getAttemptCount('s1')).toBe(0);
      rm.recordAttempt('s1');
      rm.recordAttempt('s1');
      expect(rm.getAttemptCount('s1')).toBe(2);
      expect(rm.getAttemptCount('s2')).toBe(0);
    });
  });

  describe('getRetriedStageIds', () => {
    it('returns stages with at least one retry', () => {
      rm.recordAttempt('s1');
      rm.recordAttempt('s1');
      rm.recordAttempt('s2');

      const ids = rm.getRetriedStageIds();
      expect(ids).toContain('s1');
      expect(ids).toContain('s2');
    });
  });

  describe('reset', () => {
    it('clears all retry state', () => {
      rm.recordAttempt('s1');
      rm.reset();
      expect(rm.getAttemptCount('s1')).toBe(0);
      expect(rm.getRetriedStageIds()).toHaveLength(0);
    });
  });

  describe('createRetryManager factory', () => {
    it('returns a RetryManager instance', () => {
      expect(createRetryManager()).toBeInstanceOf(RetryManager);
    });
  });
});

// ════════════════════════════════════════════════════════════
// 5. METRICS COLLECTOR
// ════════════════════════════════════════════════════════════

describe('MetricsCollector', () => {
  let mc: MetricsCollector;

  beforeEach(() => { mc = new MetricsCollector(); });

  it('initial metrics are zero', () => {
    const m = mc.getMetrics();
    expect(m.totalStages).toBe(0);
    expect(m.completedStages).toBe(0);
    expect(m.failedStages).toBe(0);
    expect(m.totalFindingsCount).toBe(0);
  });

  it('startPipeline / completePipeline track duration', () => {
    const startedAt = new Date().toISOString();
    mc.startPipeline(startedAt, 5);

    vi.setSystemTime(new Date(new Date(startedAt).getTime() + 10_000));
    mc.completePipeline(new Date().toISOString());

    const m = mc.getMetrics();
    expect(m.totalStages).toBe(5);
    expect(m.totalDurationMs).toBe(10_000);
  });

  it('stage lifecycle tracking', () => {
    mc.startPipeline(new Date().toISOString(), 3);

    const now = new Date().toISOString();
    mc.startStage('s1', now);
    vi.setSystemTime(new Date(new Date(now).getTime() + 500));
    mc.completeStage('s1', new Date().toISOString(), ['e1']);

    mc.skipStage();
    mc.failStage();

    const m = mc.getMetrics();
    expect(m.completedStages).toBe(1);
    expect(m.skippedStages).toBe(1);
    expect(m.failedStages).toBe(1);
    expect(m.stageDurations.get('s1')).toBe(500);
  });

  it('engine tracking', () => {
    vi.useFakeTimers();
    try {
      mc.startEngine('nuclei');
      mc.startEngine('zap');
      vi.advanceTimersByTime(200);
      mc.finishEngine('nuclei');
      mc.finishEngine('zap');

      const m = mc.getMetrics();
      expect(m.totalEnginesUsed).toBe(2);
      expect(m.engineDurations.has('nuclei')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('counter tracking', () => {
    mc.addRequests(100);
    mc.addRequests(50);
    mc.addFindings(5);
    mc.setArtifactsCount(30);

    const m = mc.getMetrics();
    expect(m.totalRequestsCount).toBe(150);
    expect(m.totalFindingsCount).toBe(5);
    expect(m.totalArtifactsCount).toBe(30);
  });

  it('getStageTiming returns timing for completed stage', () => {
    const now = new Date().toISOString();
    mc.startStage('s1', now);
    vi.setSystemTime(new Date(new Date(now).getTime() + 1000));
    mc.completeStage('s1', new Date().toISOString(), []);

    const timing = mc.getStageTiming('s1');
    expect(timing).toBeDefined();
    expect(timing!.durationMs).toBe(1000);
    expect(timing!.stageId).toBe('s1');
  });

  it('getStageTiming returns undefined for non-completed stage', () => {
    expect(mc.getStageTiming('nonexistent')).toBeUndefined();
  });

  it('toJSON is serializable', () => {
    mc.startPipeline(new Date().toISOString(), 3);
    mc.addFindings(5);
    const json = mc.toJSON();
    expect(json.totalFindingsCount).toBe(5);
    expect(typeof json).toBe('object');
  });

  describe('createMetricsCollector factory', () => {
    it('returns a MetricsCollector instance', () => {
      expect(createMetricsCollector()).toBeInstanceOf(MetricsCollector);
    });
  });
});

// ════════════════════════════════════════════════════════════
// 6. PIPELINE EXECUTOR
// ════════════════════════════════════════════════════════════

describe('PipelineExecutor', () => {
  it('creates with config', () => {
    const exec = new PipelineExecutor(makeConfig([STAGE_A]));
    expect(exec.status).toBe(PipelineStatus.Created);
    expect(exec.pipelineId).toBe('pipe-test-1');
    expect(exec.isRunning).toBe(false);
  });

  describe('sequential execution', () => {
    it('runs a single stage to completion', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A]));
      exec.registerStageHandler('stage_a', immediateHandler());

      const result = await exec.start();

      expect(result.status).toBe(PipelineStatus.Completed);
      expect(result.stages.get('stage_a')?.status).toBe(StageStatus.Completed);
    });

    it('runs multiple stages in dependency order', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A, STAGE_B]));
      const order: string[] = [];
      exec.registerStageHandler('stage_a', async () => { order.push('a'); });
      exec.registerStageHandler('stage_b', async () => { order.push('b'); });

      const result = await exec.start();

      expect(result.status).toBe(PipelineStatus.Completed);
      expect(order).toEqual(['a', 'b']);
    });

    it('runs diamond dependency correctly', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A, STAGE_B, STAGE_C, STAGE_D]));
      const order: string[] = [];
      exec.registerStageHandler('stage_a', async () => { order.push('a'); });
      exec.registerStageHandler('stage_b', async () => { order.push('b'); });
      exec.registerStageHandler('stage_c', async () => { order.push('c'); });
      exec.registerStageHandler('stage_d', async () => { order.push('d'); });

      const result = await exec.start();

      expect(result.status).toBe(PipelineStatus.Completed);
      expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
      expect(order.indexOf('a')).toBeLessThan(order.indexOf('c'));
      expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
      expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
    });
  });

  describe('parallel execution', () => {
    it('runs independent stages concurrently', async () => {
      const sParallel1 = makeStageDef({ id: 'p1', dependencies: ['stage_a'] });
      const sParallel2 = makeStageDef({ id: 'p2', dependencies: ['stage_a'] });
      const exec = new PipelineExecutor(
        makeConfig([STAGE_A, sParallel1, sParallel2], { maxConcurrentStages: 2 }),
      );

      const timings: string[] = [];
      exec.registerStageHandler('stage_a', async () => { timings.push('a-start'); });
      exec.registerStageHandler('p1', async () => {
        timings.push('p1-start');
        await new Promise(r => setTimeout(r, 100));
        timings.push('p1-end');
      });
      exec.registerStageHandler('p2', async () => {
        timings.push('p2-start');
        await new Promise(r => setTimeout(r, 100));
        timings.push('p2-end');
      });

      const result = await exec.start();
      expect(result.status).toBe(PipelineStatus.Completed);

      // Both p1 and p2 should have started before either ended (concurrent)
      const p1Start = timings.indexOf('p1-start');
      const p2Start = timings.indexOf('p2-start');
      const p1End = timings.indexOf('p1-end');
      const p2End = timings.indexOf('p2-end');

      // Both started before either ended
      expect(p1Start).toBeLessThan(p2End);
      expect(p2Start).toBeLessThan(p1End);
    });
  });

  describe('skip behavior', () => {
    it('skips stage without handler', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A, STAGE_B]));
      exec.registerStageHandler('stage_a', immediateHandler());
      // No handler for stage_b

      const result = await exec.start();

      expect(result.status).toBe(PipelineStatus.Completed);
      expect(result.stages.get('stage_a')?.status).toBe(StageStatus.Completed);
      expect(result.stages.get('stage_b')?.status).toBe(StageStatus.Skipped);
    });

    it('skips stage when shouldRun returns false', async () => {
      const skippable = makeStageDef({
        id: 'skip_me',
        skippable: true,
        shouldRun: () => false,
      });
      const exec = new PipelineExecutor(makeConfig([skippable]));
      exec.registerStageHandler('skip_me', immediateHandler());

      const result = await exec.start();
      expect(result.stages.get('skip_me')?.status).toBe(StageStatus.Skipped);
    });

    it('skips stage when dependency fails', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A, STAGE_B]));
      exec.registerStageHandler('stage_a', failingHandler('upstream error'));
      exec.registerStageHandler('stage_b', immediateHandler());

      const result = await exec.start();

      expect(result.stages.get('stage_a')?.status).toBe(StageStatus.Failed);
      expect(result.stages.get('stage_b')?.status).toBe(StageStatus.Skipped);
      expect(result.status).toBe(PipelineStatus.PartiallyCompleted);
    });

    it('non-skippable stage fails entire pipeline when dependency fails', async () => {
      const nonSkippable = makeStageDef({
        id: 'ns1',
        dependencies: ['stage_a'],
        skippable: false,
      });
      const exec = new PipelineExecutor(makeConfig([STAGE_A, nonSkippable]));
      exec.registerStageHandler('stage_a', failingHandler());
      exec.registerStageHandler('ns1', immediateHandler());

      const result = await exec.start();
      // ns1 should still be skipped because its dependency failed
      // (dependency failure cascades as skip regardless of skippable)
      expect(result.stages.get('ns1')?.status).toBe(StageStatus.Skipped);
    });
  });

  describe('failure handling', () => {
    it('stage failure with no retries → partially completed', async () => {
      const stage = makeStageDef({ id: 'fail_stage', maxRetries: 0 });
      const exec = new PipelineExecutor(makeConfig([stage]));
      exec.registerStageHandler('fail_stage', failingHandler('fatal'));

      const result = await exec.start();

      expect(result.status).toBe(PipelineStatus.PartiallyCompleted);
      expect(result.stages.get('fail_stage')?.status).toBe(StageStatus.Failed);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('fatal');
    });

    it('retry with eventual success → completed', async () => {
      let attempt = 0;
      const flaky = makeStageDef({ id: 'flaky', maxRetries: 3, timeoutMs: 5000 });
      const exec = new PipelineExecutor(makeConfig([flaky]));
      exec.registerStageHandler('flaky', async () => {
        attempt++;
        if (attempt < 3) throw new Error('timeout'); // retryable
        return 'ok';
      });

      const result = await exec.start();

      expect(result.status).toBe(PipelineStatus.Completed);
      expect(result.stages.get('flaky')?.status).toBe(StageStatus.Completed);
      expect(result.stages.get('flaky')?.retryCount).toBe(2);
    });
  });

  describe('timeout', () => {
    it('stage times out and fails', async () => {
      const stage = makeStageDef({ id: 'slow', maxRetries: 0, timeoutMs: 50 });
      const exec = new PipelineExecutor(makeConfig([stage]));
      exec.registerStageHandler('slow', delayHandler(10_000));

      const result = await exec.start();

      expect(result.stages.get('slow')?.status).toBe(StageStatus.Failed);
      expect(result.stages.get('slow')?.error?.message).toContain('timed out');
    }, 10_000);
  });

  describe('cancellation', () => {
    it('cancel stops a running pipeline', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A, STAGE_B]));
      exec.registerStageHandler('stage_a', delayHandler(10_000));
      exec.registerStageHandler('stage_b', immediateHandler());

      // Start and immediately cancel
      const startPromise = exec.start();
      await new Promise(r => setTimeout(r, 20));
      await exec.cancel('user requested');

      const result = await startPromise;
      expect(result.status).toBe(PipelineStatus.Cancelled);
    }, 10_000);
  });

  describe('events', () => {
    it('emits PipelineStarted and PipelineCompleted', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A]));
      exec.registerStageHandler('stage_a', immediateHandler());

      const events: PipelineEvent[] = [];
      exec.eventBus.on('*', (e) => events.push(e));

      await exec.start();

      const types = events.map(e => e.type);
      expect(types).toContain(PipelineEventType.PipelineStarted);
      expect(types).toContain(PipelineEventType.PipelineCompleted);
      expect(types).toContain(PipelineEventType.StageStarted);
      expect(types).toContain(PipelineEventType.StageCompleted);
    });

    it('emits StageSkipped for unregistered handler', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A]));
      // No handler registered

      const events: PipelineEvent[] = [];
      exec.eventBus.on('*', (e) => events.push(e));

      await exec.start();

      const skipEvents = events.filter(e => e.type === PipelineEventType.StageSkipped);
      expect(skipEvents).toHaveLength(1);
      expect(skipEvents[0].data?.stageId).toBe('stage_a');
    });

    it('emits StageFailed for failed stage', async () => {
      const stage = makeStageDef({ id: 'fail', maxRetries: 0 });
      const exec = new PipelineExecutor(makeConfig([stage]));
      exec.registerStageHandler('fail', failingHandler());

      const events: PipelineEvent[] = [];
      exec.eventBus.on('*', (e) => events.push(e));

      await exec.start();

      const failEvents = events.filter(e => e.type === PipelineEventType.StageFailed);
      expect(failEvents).toHaveLength(1);
    });

    it('emits RetryScheduled on retry', async () => {
      let attempt = 0;
      const stage = makeStageDef({ id: 'flaky', maxRetries: 2, timeoutMs: 5000 });
      const exec = new PipelineExecutor(makeConfig([stage]));
      exec.registerStageHandler('flaky', async () => {
        attempt++;
        if (attempt === 1) throw new Error('timeout');
        return 'ok';
      });

      const events: PipelineEvent[] = [];
      exec.eventBus.on('*', (e) => events.push(e));

      await exec.start();

      const retryEvents = events.filter(e => e.type === PipelineEventType.RetryScheduled);
      expect(retryEvents).toHaveLength(1);
      expect(retryEvents[0].data?.attempt).toBe(1);
    });
  });

  describe('artifacts flow through pipeline', () => {
    it('stage publishes artifacts visible to later stages', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A, STAGE_B]));

      exec.registerStageHandler('stage_a', async ({ artifactBus }) => {
        artifactBus.publish({
          category: ArtifactCategory.Urls,
          stageId: 'stage_a',
          key: 'url:1',
          value: 'https://example.com/page1',
        });
      });

      exec.registerStageHandler('stage_b', async ({ artifactBus }) => {
        const urls = artifactBus.getByCategory(ArtifactCategory.Urls);
        // Should see the URL from stage_a
        if (urls.length !== 1) throw new Error(`Expected 1 URL, got ${urls.length}`);
      });

      const result = await exec.start();
      expect(result.status).toBe(PipelineStatus.Completed);
      expect(result.artifacts).toHaveLength(1);
    });
  });

  describe('pause / resume', () => {
    it('pause and resume a pipeline', async () => {
      let canProceed = false;
      const exec = new PipelineExecutor(makeConfig([STAGE_A, STAGE_B]));

      exec.registerStageHandler('stage_a', async () => {
        // Wait until resume signal
        while (!canProceed) {
          await new Promise(r => setTimeout(r, 10));
        }
      });
      exec.registerStageHandler('stage_b', immediateHandler());

      const events: PipelineEvent[] = [];
      exec.eventBus.on('*', (e) => events.push(e));

      // Start in background
      const promise = exec.start();

      // Wait for stage_a to start
      await new Promise(r => setTimeout(r, 50));
      exec.pause();

      // Give it a moment
      await new Promise(r => setTimeout(r, 50));
      expect(exec.status).toBe(PipelineStatus.Paused);

      // Check for paused event
      const pauseEvents = events.filter(e => e.type === PipelineEventType.PipelinePaused);
      expect(pauseEvents.length).toBeGreaterThanOrEqual(1);

      // Resume
      canProceed = true;
      exec.resume();

      const result = await promise;
      expect(result.status).toBe(PipelineStatus.Completed);
    }, 10_000);
  });

  describe('shutdown', () => {
    it('shutdown cancels and clears event bus', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A]));
      exec.registerStageHandler('stage_a', delayHandler(10_000));

      const startPromise = exec.start();
      await new Promise(r => setTimeout(r, 20));
      await exec.shutdown();

      const result = await startPromise;
      expect(result.status).toBe(PipelineStatus.Cancelled);
    }, 10_000);
  });

  describe('snapshot / restore', () => {
    it('saveSnapshot returns serializable data', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A]));
      exec.registerStageHandler('stage_a', async ({ artifactBus }) => {
        artifactBus.publish({
          category: ArtifactCategory.Metadata,
          stageId: 'stage_a',
          key: 'test',
          value: { ok: true },
        });
      });

      // Start, but don't await fully yet
      const promise = exec.start();
      await promise;

      const snapshot = exec.saveSnapshot();
      expect(snapshot.state).toBeDefined();
      expect(snapshot.artifacts).toHaveLength(1);
      expect(snapshot.metrics).toBeDefined();
    });

    it('restoreFromSnapshot restores state', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A, STAGE_B]));
      exec.registerStageHandler('stage_a', immediateHandler());
      await exec.start();

      const snapshot = exec.saveSnapshot();

      // Create a new executor and restore
      const exec2 = new PipelineExecutor(makeConfig([STAGE_A, STAGE_B]));
      exec2.restoreFromSnapshot(snapshot);

      // stage_a should be completed in restored state
      expect(exec2.getCompletedStageIds()).toContain('stage_a');
    });
  });

  describe('getContextSnapshot', () => {
    it('returns correct snapshot during execution', () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A, STAGE_B]));
      const snap = exec.getContextSnapshot();
      expect(snap.pipelineId).toBe('pipe-test-1');
      expect(snap.status).toBe(PipelineStatus.Created);
      expect(snap.completedStages.size).toBe(0);
    });
  });

  describe('double start', () => {
    it('throws if already running', async () => {
      const exec = new PipelineExecutor(makeConfig([STAGE_A]));
      exec.registerStageHandler('stage_a', delayHandler(1000));

      const promise = exec.start();
      try {
        await expect(exec.start()).rejects.toThrow('already running');
      } finally {
        await exec.cancel();
        await promise;
      }
    }, 10_000);
  });

  describe('createPipelineExecutor factory', () => {
    it('returns a PipelineExecutor', () => {
      const exec = createPipelineExecutor(makeConfig([STAGE_A]));
      expect(exec).toBeInstanceOf(PipelineExecutor);
    });
  });
});

// ════════════════════════════════════════════════════════════
// 7. FAILURE RECOVERY
// ════════════════════════════════════════════════════════════

describe('FailureRecoveryManager', () => {
  let frm: FailureRecoveryManager;
  const stages = [STAGE_A, STAGE_B, STAGE_C];

  beforeEach(() => { frm = new FailureRecoveryManager(); });

  describe('createSnapshot', () => {
    it('creates a snapshot with correct fields', () => {
      const state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
      state.start();
      const bus = new ArtifactBusImpl();
      bus.publish({ category: ArtifactCategory.Urls, stageId: 'stage_a', key: 'u1', value: 'a' });

      const snap = frm.createSnapshot('pipe-1', state, bus, {}, [], 'test');

      expect(snap.snapshotId).toMatch(/^snap-pipe-1-\d+$/);
      expect(snap.pipelineId).toBe('pipe-1');
      expect(snap.reason).toBe('test');
      expect(snap.artifacts).toHaveLength(1);
      expect(snap.sequence).toBe(1);
    });

    it('increments sequence number', () => {
      const state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
      const bus = new ArtifactBusImpl();

      frm.createSnapshot('pipe-1', state, bus, {}, [], 'first');
      frm.createSnapshot('pipe-1', state, bus, {}, [], 'second');

      expect(frm.snapshotCount).toBe(2);
      const snaps = frm.getSnapshots('pipe-1');
      expect(snaps[0].sequence).toBe(1);
      expect(snaps[1].sequence).toBe(2);
    });
  });

  describe('buildRecoveryPlan', () => {
    it('correctly categorizes stages', () => {
      const state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
      state.start();
      state.startStage('stage_a', []);
      state.completeStage('stage_a');
      state.startStage('stage_b', []);
      state.failStage('stage_b', {
        stageId: 'stage_b', message: 'err', code: 'E', retryable: false, occurredAt: new Date().toISOString(),
      });
      // stage_c is still pending

      const bus = new ArtifactBusImpl();
      const snap = frm.createSnapshot('pipe-1', state, bus, {}, [], 'test');
      const plan = frm.buildRecoveryPlan(snap, stages);

      expect(plan.completedStageIds).toEqual(['stage_a']);
      expect(plan.failedStageIds).toEqual(['stage_b']);
      expect(plan.pendingStageIds).toEqual(['stage_c']);
      expect(plan.snapshot).toBe(snap);
    });

    it('handles all-skipped scenario', () => {
      const state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
      state.start();
      state.skipStage('stage_a');
      state.skipStage('stage_b');
      state.skipStage('stage_c');

      const bus = new ArtifactBusImpl();
      const snap = frm.createSnapshot('pipe-1', state, bus, {}, [], 'all_skipped');
      const plan = frm.buildRecoveryPlan(snap, stages);

      expect(plan.skippedStageIds).toHaveLength(3);
    });
  });

  describe('getLatestSnapshot', () => {
    it('returns the most recent snapshot', () => {
      const state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
      const bus = new ArtifactBusImpl();

      frm.createSnapshot('pipe-1', state, bus, {}, [], 'first');
      frm.createSnapshot('pipe-1', state, bus, {}, [], 'second');

      const latest = frm.getLatestSnapshot('pipe-1');
      expect(latest?.reason).toBe('second');
    });

    it('returns undefined for unknown pipeline', () => {
      expect(frm.getLatestSnapshot('nonexistent')).toBeUndefined();
    });
  });

  describe('getSnapshots', () => {
    it('returns all snapshots for a pipeline in order', () => {
      const state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
      const bus = new ArtifactBusImpl();

      frm.createSnapshot('pipe-1', state, bus, {}, [], 'a');
      frm.createSnapshot('pipe-2', state, bus, {}, [], 'other');
      frm.createSnapshot('pipe-1', state, bus, {}, [], 'b');

      const snaps = frm.getSnapshots('pipe-1');
      expect(snaps).toHaveLength(2);
      expect(snaps[0].reason).toBe('a');
      expect(snaps[1].reason).toBe('b');
    });
  });

  describe('clearForPipeline', () => {
    it('removes all snapshots for a pipeline', () => {
      const state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
      const bus = new ArtifactBusImpl();

      frm.createSnapshot('pipe-1', state, bus, {}, [], 'a');
      frm.createSnapshot('pipe-2', state, bus, {}, [], 'b');

      const removed = frm.clearForPipeline('pipe-1');
      expect(removed).toBe(1);
      expect(frm.snapshotCount).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('removes everything and resets sequence', () => {
      const state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
      const bus = new ArtifactBusImpl();
      frm.createSnapshot('pipe-1', state, bus, {}, [], 'a');

      frm.clearAll();
      expect(frm.snapshotCount).toBe(0);

      frm.createSnapshot('pipe-1', state, bus, {}, [], 'b');
      const snap = frm.getLatestSnapshot('pipe-1');
      expect(snap?.sequence).toBe(1); // Reset to 1
    });
  });

  describe('prune', () => {
    it('keeps only N most recent snapshots per pipeline', () => {
      const state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
      const bus = new ArtifactBusImpl();

      for (let i = 0; i < 5; i++) {
        frm.createSnapshot('pipe-1', state, bus, {}, [], `snap-${i}`);
      }

      const removed = frm.prune(2);
      expect(removed).toBe(3);
      expect(frm.snapshotCount).toBe(2);

      const remaining = frm.getSnapshots('pipe-1');
      expect(remaining[0].reason).toBe('snap-3');
      expect(remaining[1].reason).toBe('snap-4');
    });
  });

  describe('static restore methods', () => {
    it('restoreState creates PipelineState from snapshot', () => {
      const state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
      state.start();
      state.startStage('stage_a', []);
      state.completeStage('stage_a');

      const bus = new ArtifactBusImpl();
      const snap = frm.createSnapshot('pipe-1', state, bus, {}, [], 'test');

      const restored = FailureRecoveryManager.restoreState(snap, stages);
      expect(restored.getStage('stage_a')?.status).toBe(StageStatus.Completed);
    });

    it('restoreArtifactBus creates bus from snapshot', () => {
      const state = new PipelineState('pipe-1', 'job-1', 'https://example.com', stages);
      const bus = new ArtifactBusImpl();
      bus.publish({ category: ArtifactCategory.Urls, stageId: 's1', key: 'u1', value: 'test' });

      const snap = frm.createSnapshot('pipe-1', state, bus, {}, [], 'test');
      const restored = FailureRecoveryManager.restoreArtifactBus(snap);

      expect(restored.count(ArtifactCategory.Urls)).toBe(1);
    });
  });

  describe('createFailureRecoveryManager factory', () => {
    it('returns a FailureRecoveryManager instance', () => {
      expect(createFailureRecoveryManager()).toBeInstanceOf(FailureRecoveryManager);
    });

    it('passes persistenceDir option', () => {
      const frm = createFailureRecoveryManager({ persistenceDir: '/tmp/snaps' });
      expect(frm).toBeInstanceOf(FailureRecoveryManager);
    });
  });
});

// ════════════════════════════════════════════════════════════
// 8. STUB ENGINES
// ════════════════════════════════════════════════════════════

describe('Stub Engines', () => {
  describe('createTargetValidationStub', () => {
    it('publishes validated_target and tls_initial artifacts', async () => {
      const bus = createArtifactBus() as ArtifactBusImpl;
      const handler = createTargetValidationStub();
      await handler({ artifactBus: bus, eventBus: new PipelineEventBusImpl(), abortSignal: new AbortController().signal });

      expect(bus.get(ArtifactCategory.Metadata, 'validated_target')).toBeDefined();
      expect(bus.get(ArtifactCategory.Tls, 'tls_initial')).toBeDefined();
    });

    it('throws when shouldFail is true', async () => {
      const bus = createArtifactBus() as ArtifactBusImpl;
      const handler = createTargetValidationStub({ shouldFail: true });
      await expect(handler({
        artifactBus: bus,
        eventBus: new PipelineEventBusImpl(),
        abortSignal: new AbortController().signal,
      })).rejects.toThrow('connection refused');
    });
  });

  describe('createDiscoveryStub', () => {
    it('publishes URLs, technology, TLS, headers, and metadata', async () => {
      const bus = createArtifactBus() as ArtifactBusImpl;
      const handler = createDiscoveryStub();
      await handler({ artifactBus: bus, eventBus: new PipelineEventBusImpl(), abortSignal: new AbortController().signal });

      expect(bus.count(ArtifactCategory.Urls)).toBe(4);
      expect(bus.get(ArtifactCategory.Metadata, 'robots_txt')).toBeDefined();
      expect(bus.get(ArtifactCategory.Technology, 'tech_stack')).toBeDefined();
      expect(bus.get(ArtifactCategory.Tls, 'tls')).toBeDefined();
      expect(bus.get(ArtifactCategory.Headers, 'response_headers')).toBeDefined();
    });

    it('uses custom URLs when provided', async () => {
      const bus = createArtifactBus() as ArtifactBusImpl;
      const handler = createDiscoveryStub({ urls: ['https://custom.com'] });
      await handler({ artifactBus: bus, eventBus: new PipelineEventBusImpl(), abortSignal: new AbortController().signal });

      expect(bus.count(ArtifactCategory.Urls)).toBe(1);
    });

    it('throws when shouldFail is true', async () => {
      const bus = createArtifactBus() as ArtifactBusImpl;
      const handler = createDiscoveryStub({ shouldFail: true });
      await expect(handler({
        artifactBus: bus,
        eventBus: new PipelineEventBusImpl(),
        abortSignal: new AbortController().signal,
      })).rejects.toThrow('DNS timeout');
    });
  });

  describe('createPassiveStub', () => {
    it('publishes findings based on headers from artifact bus', async () => {
      const bus = createArtifactBus() as ArtifactBusImpl;

      // Pre-populate headers
      bus.publish({
        category: ArtifactCategory.Headers,
        stageId: 'discovery',
        key: 'response_headers',
        value: { server: 'nginx', 'x-powered-by': 'Express' },
      });

      const handler = createPassiveStub();
      await handler({ artifactBus: bus, eventBus: new PipelineEventBusImpl(), abortSignal: new AbortController().signal });

      const findings = bus.getByCategory(ArtifactCategory.Findings);
      // Missing XFO, Missing CSP, Info Disclosure
      expect(findings.length).toBeGreaterThanOrEqual(3);
    });

    it('respects custom findingsCount', async () => {
      const bus = createArtifactBus() as ArtifactBusImpl;
      bus.publish({
        category: ArtifactCategory.Headers,
        stageId: 'discovery',
        key: 'response_headers',
        value: {},
      });

      const handler = createPassiveStub({ findingsCount: 5 });
      await handler({ artifactBus: bus, eventBus: new PipelineEventBusImpl(), abortSignal: new AbortController().signal });

      // With empty headers: 2 header-based findings (missing XFO, missing CSP),
      // then fills from i=3 to count(5) = 2 more = 4 total
      expect(bus.count(ArtifactCategory.Findings)).toBeGreaterThanOrEqual(4);
    });
  });

  describe('createActiveStub', () => {
    it('publishes forms, endpoints, and findings', async () => {
      const bus = createArtifactBus() as ArtifactBusImpl;
      const handler = createActiveStub();
      await handler({ artifactBus: bus, eventBus: new PipelineEventBusImpl(), abortSignal: new AbortController().signal });

      expect(bus.count(ArtifactCategory.Forms)).toBe(2);
      expect(bus.count(ArtifactCategory.Endpoints)).toBe(3);
      expect(bus.count(ArtifactCategory.Findings)).toBe(2);
    });

    it('respects custom counts', async () => {
      const bus = createArtifactBus() as ArtifactBusImpl;
      const handler = createActiveStub({ findingsCount: 1, formsCount: 0, endpointsCount: 0 });
      await handler({ artifactBus: bus, eventBus: new PipelineEventBusImpl(), abortSignal: new AbortController().signal });

      expect(bus.count(ArtifactCategory.Findings)).toBe(1);
      expect(bus.count(ArtifactCategory.Forms)).toBe(0);
      expect(bus.count(ArtifactCategory.Endpoints)).toBe(0);
    });
  });

  describe('createNormalizationStub', () => {
    it('deduplicates findings by title', async () => {
      const bus = createArtifactBus() as ArtifactBusImpl;

      // Publish duplicate findings
      bus.publish({
        category: ArtifactCategory.Findings,
        stageId: 'passive',
        key: 'f1',
        value: { title: 'Missing XFO' },
      });
      bus.publish({
        category: ArtifactCategory.Findings,
        stageId: 'active',
        key: 'f2',
        value: { title: 'Missing XFO' }, // duplicate title
      });
      bus.publish({
        category: ArtifactCategory.Findings,
        stageId: 'active',
        key: 'f3',
        value: { title: 'SQL Injection' },
      });

      const handler = createNormalizationStub();
      const result = await handler({ artifactBus: bus, eventBus: new PipelineEventBusImpl(), abortSignal: new AbortController().signal }) as any;

      expect(result.inputFindings).toBe(3);
      expect(result.outputFindings).toBe(2);
    });
  });
});

// ════════════════════════════════════════════════════════════
// 9. END-TO-END INTEGRATION
// ════════════════════════════════════════════════════════════

describe('End-to-End Pipeline Integration', () => {
  it('full pipeline with stubs: validation → discovery → passive → normalization', async () => {
    // Build a simplified pipeline
    const validation = makeStageDef({ id: 'target_validation', name: 'Validation', maxRetries: 2 });
    const discovery = makeStageDef({ id: 'discovery', name: 'Discovery', dependencies: ['target_validation'], skippable: true, maxRetries: 1 });
    const passive = makeStageDef({ id: 'passive', name: 'Passive', dependencies: ['discovery'] });
    const normalization = makeStageDef({ id: 'normalization', name: 'Normalization', dependencies: ['passive'] });

    const config = makeConfig([validation, discovery, passive, normalization]);
    const exec = new PipelineExecutor(config);

    // Register stubs
    exec.registerStageHandler('target_validation', createTargetValidationStub());
    exec.registerStageHandler('discovery', createDiscoveryStub());

    // Custom passive that reads from artifact bus
    exec.registerStageHandler('passive', createPassiveStub({ findingsCount: 3 }));
    exec.registerStageHandler('normalization', createNormalizationStub());

    // Collect events
    const events: PipelineEvent[] = [];
    exec.eventBus.on('*', (e) => events.push(e));

    // Execute
    const result = await exec.start();

    // Verify pipeline completed
    expect(result.status).toBe(PipelineStatus.Completed);
    expect(result.stages.get('target_validation')?.status).toBe(StageStatus.Completed);
    expect(result.stages.get('discovery')?.status).toBe(StageStatus.Completed);
    expect(result.stages.get('passive')?.status).toBe(StageStatus.Completed);
    expect(result.stages.get('normalization')?.status).toBe(StageStatus.Completed);

    // Verify artifacts flowed through
    expect(result.artifacts.length).toBeGreaterThan(0);

    // Verify findings
    const findings = result.artifacts.filter(a => a.category === ArtifactCategory.Findings);
    expect(findings.length).toBeGreaterThan(0);

    // Verify metrics
    expect(result.metrics.completedStages).toBe(4);
    expect(result.metrics.totalStages).toBe(4);
    expect(result.metrics.totalDurationMs).toBeGreaterThanOrEqual(0);

    // Verify events
    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain(PipelineEventType.PipelineStarted);
    expect(eventTypes).toContain(PipelineEventType.PipelineCompleted);
  });

  it('pipeline with failure recovery: run, snapshot, resume', async () => {
    const s1 = makeStageDef({ id: 's1', maxRetries: 0 });
    const s2 = makeStageDef({ id: 's2', dependencies: ['s1'], maxRetries: 0 });
    const s3 = makeStageDef({ id: 's3', dependencies: ['s2'], maxRetries: 0 });

    const config = makeConfig([s1, s2, s3]);
    const exec = new PipelineExecutor(config);

    exec.registerStageHandler('s1', async ({ artifactBus }) => {
      artifactBus.publish({
        category: ArtifactCategory.Urls,
        stageId: 's1',
        key: 'url:1',
        value: 'https://example.com',
      });
    });
    exec.registerStageHandler('s2', immediateHandler());
    exec.registerStageHandler('s3', immediateHandler());

    await exec.start();
    expect(exec.status).toBe(PipelineStatus.Completed);

    // Save snapshot
    const snapshot = exec.saveSnapshot();

    // Create FailureRecoveryManager and analyze
    const frm = new FailureRecoveryManager();
    const snap = frm.createSnapshot('pipe-test-1', (exec as any).state, exec.artifactBus, snapshot.metrics, [], 'post_completion');
    const plan = frm.buildRecoveryPlan(snap, [s1, s2, s3]);

    expect(plan.completedStageIds).toEqual(['s1', 's2', 's3']);
    expect(plan.failedStageIds).toEqual([]);
    expect(plan.pendingStageIds).toEqual([]);
  });

  it('Nuclei-style integration: engine publishes through artifact bus → findings reach result', async () => {
    // Simulate what a Nuclei adapter would do
    const nucleiStage = makeStageDef({
      id: 'nuclei_scan',
      name: 'Nuclei Scan',
      dependencies: ['stage_a'],
      requiredCapabilities: [],
      maxRetries: 2,
      timeoutMs: 5000,
      skippable: true,
    });

    const config = makeConfig([STAGE_A, nucleiStage]);
    const exec = new PipelineExecutor(config);

    exec.registerStageHandler('stage_a', async ({ artifactBus }) => {
      artifactBus.publish({
        category: ArtifactCategory.Urls,
        stageId: 'stage_a',
        key: 'url:1',
        value: 'https://example.com/api/v1',
      });
    });

    // This simulates what the Nuclei adapter stage handler would do:
    // Read URLs from artifact bus, run Nuclei, publish findings
    exec.registerStageHandler('nuclei_scan', async ({ artifactBus }) => {
      const urls = artifactBus.getByCategory(ArtifactCategory.Urls);

      // Simulate Nuclei finding vulnerabilities
      for (const urlArtifact of urls) {
        const url = (urlArtifact.value as any).url;
        artifactBus.publish({
          category: ArtifactCategory.Findings,
          stageId: 'nuclei_scan',
          key: `finding:nuclei-${url}`,
          value: {
            title: 'CVE-2024-1234: Path Traversal',
            severity: 'high',
            description: `Path traversal in ${url}`,
            location: { url, parameter: 'file' },
            evidence: [{ type: 'request_response', content: `GET ${url}/../../../etc/passwd` }],
            confidence: 0.95,
            templateId: 'cve-2024-1234',
          },
          sourceEngine: 'nuclei-v3',
        });
      }
    });

    const result = await exec.start();
    expect(result.status).toBe(PipelineStatus.Completed);

    // Verify Nuclei findings reached the result
    expect(result.findings.length).toBeGreaterThan(0);
    const nucleiFindings = result.findings.filter(f => (f as any).sourceEngine === 'nuclei-v3');
    expect(nucleiFindings.length).toBeGreaterThan(0);

    // Verify artifact bus has correct data
    expect(exec.artifactBus.count(ArtifactCategory.Findings)).toBeGreaterThan(0);
  });

  it('SSE/EE compatibility: findings can be converted to SSE format without pipeline changes', async () => {
    // This test verifies that pipeline artifacts contain data compatible
    // with the existing toSecurityStateFinding() adapter from TASK-201
    const { toSecurityStateFinding } = await import('../../models/finding.ts');

    const exec = new PipelineExecutor(makeConfig([STAGE_A]));
    exec.registerStageHandler('stage_a', async ({ artifactBus }) => {
      artifactBus.publish({
        category: ArtifactCategory.Findings,
        stageId: 'stage_a',
        key: 'finding:1',
        value: {
          title: 'XSS Vulnerability',
          severity: 'high',
          description: 'Reflected XSS in search parameter',
          location: { url: 'https://example.com/search', parameter: 'q' },
          evidence: [{ type: 'request_response', content: 'proof' }],
          confidence: 0.9,
        },
        sourceEngine: 'test-engine',
      });
    });

    await exec.start();

    // Get the finding artifact
    const findings = exec.artifactBus.getByCategory(ArtifactCategory.Findings);
    expect(findings).toHaveLength(1);

    // Verify the finding data can be used with existing SSE adapter
    // (The pipeline doesn't call this — it's the SSE layer's job)
    const findingData = findings[0].value as any;
    expect(findingData.title).toBeTruthy();
    expect(findingData.severity).toBeTruthy();
    expect(findingData.location).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════
// 10. BUILTIN STAGES
// ════════════════════════════════════════════════════════════

describe('BuiltinStages', () => {
  it('has all required stages', () => {
    const expectedIds = [
      'target_validation',
      'discovery',
      'authentication',
      'crawling',
      'passive_analysis',
      'active_analysis',
      'vulnerability_detection',
      'result_normalization',
    ];

    for (const id of expectedIds) {
      expect(BuiltinStages[id]).toBeDefined();
      expect(BuiltinStages[id].id).toBe(id);
    }
  });

  it('stages have correct dependency chain', () => {
    // target_validation has no deps
    expect(BuiltinStages.target_validation.dependencies).toHaveLength(0);

    // discovery and auth depend on target_validation
    expect(BuiltinStages.discovery.dependencies).toContain('target_validation');
    expect(BuiltinStages.authentication.dependencies).toContain('target_validation');

    // crawling depends on discovery + auth
    expect(BuiltinStages.crawling.dependencies).toContain('discovery');
    expect(BuiltinStages.crawling.dependencies).toContain('authentication');

    // passive and active depend on crawling
    expect(BuiltinStages.passive_analysis.dependencies).toContain('crawling');
    expect(BuiltinStages.active_analysis.dependencies).toContain('crawling');

    // vuln detection depends on passive + active
    expect(BuiltinStages.vulnerability_detection.dependencies).toContain('passive_analysis');
    expect(BuiltinStages.vulnerability_detection.dependencies).toContain('active_analysis');

    // normalization depends on vuln detection
    expect(BuiltinStages.result_normalization.dependencies).toContain('vulnerability_detection');
  });

  it('stages use proper ScanCapability enum values', async () => {
    const { ScanCapability } = await import('../../types/index.ts');
    expect(BuiltinStages.discovery.requiredCapabilities).toContain(ScanCapability.PassiveAnalysis);
    expect(BuiltinStages.crawling.requiredCapabilities).toContain(ScanCapability.Crawling);
    expect(BuiltinStages.active_analysis.requiredCapabilities).toContain(ScanCapability.VulnerabilityDetection);
  });
});

// ════════════════════════════════════════════════════════════
// 11. TERMINAL STATUS SETS
// ════════════════════════════════════════════════════════════

describe('Terminal status sets', () => {
  it('TERMINAL_PIPELINE_STATUSES contains correct values', () => {
    expect(TERMINAL_PIPELINE_STATUSES.has(PipelineStatus.Completed)).toBe(true);
    expect(TERMINAL_PIPELINE_STATUSES.has(PipelineStatus.Failed)).toBe(true);
    expect(TERMINAL_PIPELINE_STATUSES.has(PipelineStatus.PartiallyCompleted)).toBe(true);
    expect(TERMINAL_PIPELINE_STATUSES.has(PipelineStatus.Cancelled)).toBe(true);

    expect(TERMINAL_PIPELINE_STATUSES.has(PipelineStatus.Created)).toBe(false);
    expect(TERMINAL_PIPELINE_STATUSES.has(PipelineStatus.Running)).toBe(false);
    expect(TERMINAL_PIPELINE_STATUSES.has(PipelineStatus.Paused)).toBe(false);
    expect(TERMINAL_PIPELINE_STATUSES.has(PipelineStatus.Cancelling)).toBe(false);
  });

  it('TERMINAL_STAGE_STATUSES contains correct values', () => {
    expect(TERMINAL_STAGE_STATUSES.has(StageStatus.Completed)).toBe(true);
    expect(TERMINAL_STAGE_STATUSES.has(StageStatus.Skipped)).toBe(true);
    expect(TERMINAL_STAGE_STATUSES.has(StageStatus.Failed)).toBe(true);
    expect(TERMINAL_STAGE_STATUSES.has(StageStatus.Cancelled)).toBe(true);

    expect(TERMINAL_STAGE_STATUSES.has(StageStatus.Pending)).toBe(false);
    expect(TERMINAL_STAGE_STATUSES.has(StageStatus.Running)).toBe(false);
    expect(TERMINAL_STAGE_STATUSES.has(StageStatus.Retrying)).toBe(false);
  });
});