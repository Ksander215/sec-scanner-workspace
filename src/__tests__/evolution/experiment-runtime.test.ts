import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { ExperimentRuntime } from '../../core/evolution/experiment-runtime.js';
import { DefaultEvolutionRuntimeConfig, ExperimentStatus, brandExperimentId, brandImprovementId } from '../../core/evolution/types.js';
import {
  ExperimentNotFoundError,
  ExperimentLimitExceededError,
  ExperimentStateError,
} from '../../core/evolution/errors.js';

const cfg = DefaultEvolutionRuntimeConfig.experiment;

const testImprovementId = brandImprovementId(crypto.randomUUID());

function makeParams(overrides?: Partial<import('../../core/evolution/contracts.js').ExperimentProposalParams>): import('../../core/evolution/contracts.js').ExperimentProposalParams {
  return {
    name: 'Test Experiment',
    description: 'A test experiment',
    improvementId: testImprovementId,
    variantA: 'control',
    variantB: 'treatment',
    metricName: 'accuracy',
    metadata: {},
    ...overrides,
  };
}

function createRuntime(bus?: InProcessEventBus, overrides?: Partial<typeof cfg>) {
  const config = { ...cfg, ...overrides };
  return new ExperimentRuntime(config, bus);
}

// ═══════════════════════════════════════════════════════════════════
// CONSTRUCTOR
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — constructor', () => {
  it('creates instance without eventBus', () => {
    const rt = createRuntime();
    expect(rt).toBeDefined();
    expect(rt).toBeInstanceOf(ExperimentRuntime);
  });

  it('creates instance with eventBus', () => {
    const bus = new InProcessEventBus();
    const rt = createRuntime(bus);
    expect(rt).toBeDefined();
    expect(rt).toBeInstanceOf(ExperimentRuntime);
  });

  it('starts with count 0', async () => {
    const rt = createRuntime();
    expect(await rt.count()).toBe(0);
  });

  it('starts with empty list', async () => {
    const rt = createRuntime();
    expect(await rt.list()).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PROPOSE
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — propose', () => {
  let rt: ExperimentRuntime;

  beforeEach(() => {
    rt = createRuntime();
  });

  it('returns an experiment with all required fields', async () => {
    const exp = await rt.propose(makeParams());
    expect(exp.id).toBeDefined();
    expect(exp.status).toBe(ExperimentStatus.Proposed);
    expect(exp.name).toBe('Test Experiment');
    expect(exp.description).toBe('A test experiment');
    expect(exp.improvementId).toBe(testImprovementId);
    expect(exp.variantA).toBe('control');
    expect(exp.variantB).toBe('treatment');
    expect(exp.metricName).toBe('accuracy');
  });

  it('returns a frozen experiment object', async () => {
    const exp = await rt.propose(makeParams());
    expect(Object.isFrozen(exp)).toBe(true);
  });

  it('generates unique ids for each proposal', async () => {
    const exp1 = await rt.propose(makeParams());
    const exp2 = await rt.propose(makeParams());
    expect(exp1.id).not.toBe(exp2.id);
  });

  it('sets proposedAt to a valid ISO string', async () => {
    const exp = await rt.propose(makeParams());
    expect(exp.proposedAt).toBeDefined();
    expect(() => new Date(exp.proposedAt)).not.toThrow();
  });

  it('sets startedAt to null', async () => {
    const exp = await rt.propose(makeParams());
    expect(exp.startedAt).toBeNull();
  });

  it('sets completedAt to null', async () => {
    const exp = await rt.propose(makeParams());
    expect(exp.completedAt).toBeNull();
  });

  it('sets variantAResult to null', async () => {
    const exp = await rt.propose(makeParams());
    expect(exp.variantAResult).toBeNull();
  });

  it('sets variantBResult to null', async () => {
    const exp = await rt.propose(makeParams());
    expect(exp.variantBResult).toBeNull();
  });

  it('sets winner to null', async () => {
    const exp = await rt.propose(makeParams());
    expect(exp.winner).toBeNull();
  });

  it('sets confidence to 0', async () => {
    const exp = await rt.propose(makeParams());
    expect(exp.confidence).toBe(0);
  });

  it('accepts metadata object', async () => {
    const exp = await rt.propose(makeParams({ metadata: { key: 'val' } }));
    expect(exp.metadata).toEqual({ key: 'val' });
  });

  it('accepts different variant names', async () => {
    const exp = await rt.propose(makeParams({ variantA: 'v1', variantB: 'v2' }));
    expect(exp.variantA).toBe('v1');
    expect(exp.variantB).toBe('v2');
  });

  it('accepts different metric name', async () => {
    const exp = await rt.propose(makeParams({ metricName: 'latency' }));
    expect(exp.metricName).toBe('latency');
  });

  it('increments count after proposal', async () => {
    await rt.propose(makeParams());
    expect(await rt.count()).toBe(1);
    await rt.propose(makeParams());
    expect(await rt.count()).toBe(2);
  });

  it('is retrievable by id after proposal', async () => {
    const exp = await rt.propose(makeParams());
    const found = await rt.getById(exp.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(exp.id);
  });

  it('appears in list after proposal', async () => {
    await rt.propose(makeParams());
    const all = await rt.list();
    expect(all.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PROPOSE — LIMIT
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — propose limit exceeded', () => {
  it('throws ExperimentLimitExceededError when maxExperiments reached', async () => {
    const rt = createRuntime(undefined, { maxExperiments: 2 });
    await rt.propose(makeParams());
    await rt.propose(makeParams());
    await expect(rt.propose(makeParams())).rejects.toThrow(ExperimentLimitExceededError);
  });

  it('throws with correct message', async () => {
    const rt = createRuntime(undefined, { maxExperiments: 1 });
    await rt.propose(makeParams());
    await expect(rt.propose(makeParams())).rejects.toThrow('Maximum experiments exceeded: 1');
  });

  it('error is instance of EvolutionError', async () => {
    const rt = createRuntime(undefined, { maxExperiments: 1 });
    await rt.propose(makeParams());
    try {
      await rt.propose(makeParams());
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ExperimentLimitExceededError');
      expect(e.code).toBe('EXPERIMENT_LIMIT_EXCEEDED');
    }
  });

  it('does not add item when limit exceeded', async () => {
    const rt = createRuntime(undefined, { maxExperiments: 1 });
    await rt.propose(makeParams());
    try { await rt.propose(makeParams()); } catch { /* expected */ }
    expect(await rt.count()).toBe(1);
  });

  it('allows exactly maxExperiments items', async () => {
    const rt = createRuntime(undefined, { maxExperiments: 3 });
    await rt.propose(makeParams());
    await rt.propose(makeParams());
    await rt.propose(makeParams());
    expect(await rt.count()).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — getById', () => {
  let rt: ExperimentRuntime;

  beforeEach(() => {
    rt = createRuntime();
  });

  it('returns null for unknown id', async () => {
    const result = await rt.getById(brandExperimentId('nonexistent'));
    expect(result).toBeNull();
  });

  it('returns the experiment after propose', async () => {
    const exp = await rt.propose(makeParams());
    const found = await rt.getById(exp.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(exp.id);
    expect(found!.name).toBe(exp.name);
  });

  it('returns a frozen object', async () => {
    const exp = await rt.propose(makeParams());
    const found = await rt.getById(exp.id);
    expect(Object.isFrozen(found!)).toBe(true);
  });

  it('returns updated status after start', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    const found = await rt.getById(exp.id);
    expect(found!.status).toBe(ExperimentStatus.Running);
  });

  it('returns null after proposing then looking up wrong id', async () => {
    await rt.propose(makeParams());
    const result = await rt.getById(brandExperimentId('other-id'));
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — list', () => {
  let rt: ExperimentRuntime;

  beforeEach(() => {
    rt = createRuntime();
  });

  it('returns empty array when no experiments', async () => {
    expect(await rt.list()).toEqual([]);
  });

  it('returns all proposed experiments', async () => {
    await rt.propose(makeParams());
    await rt.propose(makeParams());
    const all = await rt.list();
    expect(all.length).toBe(2);
  });

  it('filters by status=Proposed', async () => {
    await rt.propose(makeParams());
    const proposed = await rt.list({ status: ExperimentStatus.Proposed });
    expect(proposed.length).toBe(1);
  });

  it('filters by status=Running', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    const running = await rt.list({ status: ExperimentStatus.Running });
    expect(running.length).toBe(1);
    expect(running[0].id).toBe(exp.id);
  });

  it('filters by status=Completed', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    const completed = await rt.list({ status: ExperimentStatus.Completed });
    expect(completed.length).toBe(1);
  });

  it('filters by status=Failed', async () => {
    // Failed is a valid transition from Running but only via a different path
    // Actually, there's no direct 'fail' method — only start, complete, cancel
    // The Failed status exists in the enum but ExperimentRuntime only transitions to Completed/Inconclusive/Cancelled
    // Let's verify the filter works even if empty
    const failed = await rt.list({ status: ExperimentStatus.Failed });
    expect(failed.length).toBe(0);
  });

  it('filters by status=Cancelled', async () => {
    const exp = await rt.propose(makeParams());
    await rt.cancel(exp.id);
    const cancelled = await rt.list({ status: ExperimentStatus.Cancelled });
    expect(cancelled.length).toBe(1);
  });

  it('filters by status=Inconclusive', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 5, 4.9);
    const inconclusive = await rt.list({ status: ExperimentStatus.Inconclusive });
    expect(inconclusive.length).toBe(1);
  });

  it('returns empty for non-matching status filter', async () => {
    await rt.propose(makeParams());
    const completed = await rt.list({ status: ExperimentStatus.Completed });
    expect(completed.length).toBe(0);
  });

  it('returns frozen array items', async () => {
    await rt.propose(makeParams());
    const all = await rt.list();
    for (const item of all) {
      expect(Object.isFrozen(item)).toBe(true);
    }
  });

  it('list with no filter returns all regardless of status', async () => {
    const exp1 = await rt.propose(makeParams());
    const exp2 = await rt.propose(makeParams());
    await rt.start(exp1.id);
    await rt.cancel(exp2.id);
    const all = await rt.list();
    expect(all.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// COUNT
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — count', () => {
  it('returns 0 initially', async () => {
    const rt = createRuntime();
    expect(await rt.count()).toBe(0);
  });

  it('increments by 1 per propose', async () => {
    const rt = createRuntime();
    await rt.propose(makeParams());
    expect(await rt.count()).toBe(1);
    await rt.propose(makeParams());
    expect(await rt.count()).toBe(2);
  });

  it('does not decrement on status change', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    expect(await rt.count()).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — start', () => {
  let rt: ExperimentRuntime;

  beforeEach(() => {
    rt = createRuntime();
  });

  it('transitions Proposed -> Running', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    const found = await rt.getById(exp.id);
    expect(found!.status).toBe(ExperimentStatus.Running);
  });

  it('sets startedAt', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    const found = await rt.getById(exp.id);
    expect(found!.startedAt).not.toBeNull();
    expect(() => new Date(found!.startedAt!)).not.toThrow();
  });

  it('throws ExperimentNotFoundError for unknown id', async () => {
    await expect(rt.start(brandExperimentId('unknown'))).rejects.toThrow(ExperimentNotFoundError);
  });

  it('ExperimentNotFoundError has correct name and code', async () => {
    try {
      await rt.start(brandExperimentId('unknown'));
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ExperimentNotFoundError');
      expect(e.code).toBe('EXPERIMENT_NOT_FOUND');
    }
  });

  it('throws ExperimentStateError when already Running', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await expect(rt.start(exp.id)).rejects.toThrow(ExperimentStateError);
  });

  it('throws when already Completed', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    await expect(rt.start(exp.id)).rejects.toThrow(ExperimentStateError);
  });

  it('throws when already Cancelled', async () => {
    const exp = await rt.propose(makeParams());
    await rt.cancel(exp.id);
    await expect(rt.start(exp.id)).rejects.toThrow(ExperimentStateError);
  });

  it('throws when already Inconclusive', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 5, 4.9);
    await expect(rt.start(exp.id)).rejects.toThrow(ExperimentStateError);
  });

  it('ExperimentStateError has correct properties', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    try {
      await rt.start(exp.id);
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ExperimentStateError');
      expect(e.code).toBe('EXPERIMENT_STATE_ERROR');
      expect(e.currentStatus).toBe(ExperimentStatus.Running);
      expect(e.targetStatus).toBe(ExperimentStatus.Running);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// COMPLETE — A WINS
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — complete (A wins)', () => {
  let rt: ExperimentRuntime;

  beforeEach(() => {
    rt = createRuntime(undefined, { minConfidence: 0.8 });
  });

  it('sets winner to A when resultA > resultB', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('A');
  });

  it('sets status to Completed when confidence >= minConfidence', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    const found = await rt.getById(exp.id);
    expect(found!.status).toBe(ExperimentStatus.Completed);
  });

  it('sets variantAResult and variantBResult', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    const found = await rt.getById(exp.id);
    expect(found!.variantAResult).toBe(10);
    expect(found!.variantBResult).toBe(2);
  });

  it('calculates confidence correctly: 10 vs 2 => 10/12', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    const found = await rt.getById(exp.id);
    expect(found!.confidence).toBeCloseTo(10 / 12, 10);
  });

  it('sets completedAt', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    const found = await rt.getById(exp.id);
    expect(found!.completedAt).not.toBeNull();
  });

  it('A wins with small margin: 6 vs 5', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 6, 5);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('A');
    // confidence = 6/11 ≈ 0.545, which is < 0.8 => Inconclusive
    expect(found!.status).toBe(ExperimentStatus.Inconclusive);
  });

  it('A wins with large margin: 100 vs 1', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 100, 1);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('A');
    expect(found!.status).toBe(ExperimentStatus.Completed);
    expect(found!.confidence).toBeCloseTo(100 / 101, 10);
  });

  it('A wins with 10 vs 0', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 0);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('A');
    expect(found!.confidence).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// COMPLETE — B WINS
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — complete (B wins)', () => {
  let rt: ExperimentRuntime;

  beforeEach(() => {
    rt = createRuntime(undefined, { minConfidence: 0.8 });
  });

  it('sets winner to B when resultB > resultA', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 2, 10);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('B');
  });

  it('sets status to Completed when confidence >= minConfidence', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 2, 10);
    const found = await rt.getById(exp.id);
    expect(found!.status).toBe(ExperimentStatus.Completed);
  });

  it('calculates confidence correctly: 2 vs 10 => 10/12', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 2, 10);
    const found = await rt.getById(exp.id);
    expect(found!.confidence).toBeCloseTo(10 / 12, 10);
  });

  it('B wins with 0 vs 10', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 0, 10);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('B');
    expect(found!.confidence).toBe(1);
  });

  it('B wins with 1 vs 100', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 1, 100);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('B');
    expect(found!.status).toBe(ExperimentStatus.Completed);
    expect(found!.confidence).toBeCloseTo(100 / 101, 10);
  });
});

// ═══════════════════════════════════════════════════════════════════
// COMPLETE — TIE / INCONCLUSIVE
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — complete (tie / inconclusive)', () => {
  it('sets winner to null when resultA === resultB', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.8 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 5, 5);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBeNull();
  });

  it('sets confidence to 0.5 when resultA === resultB (non-zero)', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.8 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 5, 5);
    const found = await rt.getById(exp.id);
    expect(found!.confidence).toBe(0.5);
  });

  it('sets status to Inconclusive on tie (confidence < minConfidence)', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.8 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 5, 5);
    const found = await rt.getById(exp.id);
    expect(found!.status).toBe(ExperimentStatus.Inconclusive);
  });

  it('sets status to Inconclusive when confidence < minConfidence', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.8 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 6, 5);
    const found = await rt.getById(exp.id);
    // confidence = 6/11 ≈ 0.545 < 0.8
    expect(found!.status).toBe(ExperimentStatus.Inconclusive);
  });

  it('sets winner to A but status Inconclusive when confidence < threshold', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.8 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 6, 5);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('A');
    expect(found!.status).toBe(ExperimentStatus.Inconclusive);
  });

  it('both zero results: 0 vs 0', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.8 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 0, 0);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBeNull();
    // worse=0 => confidence=1
    expect(found!.confidence).toBe(1);
    expect(found!.status).toBe(ExperimentStatus.Completed);
  });

  it('with low minConfidence (0.5), tie becomes Completed', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.5 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 5, 5);
    const found = await rt.getById(exp.id);
    expect(found!.status).toBe(ExperimentStatus.Completed);
  });

  it('with minConfidence=0, always Completed', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 1, 100);
    const found = await rt.getById(exp.id);
    expect(found!.status).toBe(ExperimentStatus.Completed);
  });

  it('with minConfidence=1, always Inconclusive unless one is zero', async () => {
    const rt = createRuntime(undefined, { minConfidence: 1.0 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 100, 1);
    // confidence = 100/101 ≈ 0.99 < 1.0 => Inconclusive
    const found = await rt.getById(exp.id);
    expect(found!.status).toBe(ExperimentStatus.Inconclusive);
  });

  it('with minConfidence=1 and zero worse, always Completed', async () => {
    const rt = createRuntime(undefined, { minConfidence: 1.0 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 0);
    const found = await rt.getById(exp.id);
    // confidence = 1 >= 1.0 => Completed
    expect(found!.status).toBe(ExperimentStatus.Completed);
  });
});

// ═══════════════════════════════════════════════════════════════════
// COMPLETE — INVALID TRANSITIONS
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — complete invalid transitions', () => {
  let rt: ExperimentRuntime;

  beforeEach(() => {
    rt = createRuntime();
  });

  it('throws ExperimentNotFoundError for unknown id', async () => {
    await expect(rt.complete(brandExperimentId('unknown'), 10, 2)).rejects.toThrow(ExperimentNotFoundError);
  });

  it('throws ExperimentStateError when Proposed', async () => {
    const exp = await rt.propose(makeParams());
    await expect(rt.complete(exp.id, 10, 2)).rejects.toThrow(ExperimentStateError);
  });

  it('throws ExperimentStateError when Completed', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    await expect(rt.complete(exp.id, 5, 3)).rejects.toThrow(ExperimentStateError);
  });

  it('throws ExperimentStateError when Cancelled', async () => {
    const exp = await rt.propose(makeParams());
    await rt.cancel(exp.id);
    await expect(rt.complete(exp.id, 10, 2)).rejects.toThrow(ExperimentStateError);
  });

  it('throws ExperimentStateError when Inconclusive', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 5, 4.9);
    await expect(rt.complete(exp.id, 10, 2)).rejects.toThrow(ExperimentStateError);
  });

  it('ExperimentStateError has correct properties for complete', async () => {
    const exp = await rt.propose(makeParams());
    try {
      await rt.complete(exp.id, 10, 2);
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ExperimentStateError');
      expect(e.currentStatus).toBe(ExperimentStatus.Proposed);
      expect(e.targetStatus).toBe(ExperimentStatus.Completed);
    }
  });

  it('invalid complete does not change experiment', async () => {
    const exp = await rt.propose(makeParams());
    try { await rt.complete(exp.id, 10, 2); } catch { /* expected */ }
    const found = await rt.getById(exp.id);
    expect(found!.status).toBe(ExperimentStatus.Proposed);
    expect(found!.variantAResult).toBeNull();
    expect(found!.winner).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// CANCEL
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — cancel', () => {
  let rt: ExperimentRuntime;

  beforeEach(() => {
    rt = createRuntime();
  });

  it('cancels a Proposed experiment', async () => {
    const exp = await rt.propose(makeParams());
    await rt.cancel(exp.id);
    const found = await rt.getById(exp.id);
    expect(found!.status).toBe(ExperimentStatus.Cancelled);
  });

  it('cancels a Running experiment', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.cancel(exp.id);
    const found = await rt.getById(exp.id);
    expect(found!.status).toBe(ExperimentStatus.Cancelled);
  });

  it('sets completedAt when cancelled', async () => {
    const exp = await rt.propose(makeParams());
    await rt.cancel(exp.id);
    const found = await rt.getById(exp.id);
    expect(found!.completedAt).not.toBeNull();
  });

  it('throws ExperimentNotFoundError for unknown id', async () => {
    await expect(rt.cancel(brandExperimentId('unknown'))).rejects.toThrow(ExperimentNotFoundError);
  });

  it('throws when already Completed', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    await expect(rt.cancel(exp.id)).rejects.toThrow(ExperimentStateError);
  });

  it('throws when already Cancelled', async () => {
    const exp = await rt.propose(makeParams());
    await rt.cancel(exp.id);
    await expect(rt.cancel(exp.id)).rejects.toThrow(ExperimentStateError);
  });

  it('throws when Inconclusive', async () => {
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 5, 4.9);
    await expect(rt.cancel(exp.id)).rejects.toThrow(ExperimentStateError);
  });

  it('ExperimentStateError has correct properties for cancel', async () => {
    const exp = await rt.propose(makeParams());
    await rt.cancel(exp.id);
    try {
      await rt.cancel(exp.id);
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ExperimentStateError');
      expect(e.currentStatus).toBe(ExperimentStatus.Cancelled);
      expect(e.targetStatus).toBe(ExperimentStatus.Cancelled);
    }
  });

  it('cancel does not set results', async () => {
    const exp = await rt.propose(makeParams());
    await rt.cancel(exp.id);
    const found = await rt.getById(exp.id);
    expect(found!.variantAResult).toBeNull();
    expect(found!.variantBResult).toBeNull();
    expect(found!.winner).toBeNull();
    expect(found!.confidence).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// FULL LIFECYCLE
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — full lifecycle', () => {
  it('happy path: propose -> start -> complete (A wins)', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    expect(exp.status).toBe(ExperimentStatus.Proposed);
    await rt.start(exp.id);
    expect((await rt.getById(exp.id))!.status).toBe(ExperimentStatus.Running);
    await rt.complete(exp.id, 10, 2);
    const final = await rt.getById(exp.id);
    expect(final!.status).toBe(ExperimentStatus.Completed);
    expect(final!.winner).toBe('A');
  });

  it('happy path: propose -> start -> complete (B wins)', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 2, 10);
    const final = await rt.getById(exp.id);
    expect(final!.status).toBe(ExperimentStatus.Completed);
    expect(final!.winner).toBe('B');
  });

  it('happy path: propose -> cancel', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    await rt.cancel(exp.id);
    const final = await rt.getById(exp.id);
    expect(final!.status).toBe(ExperimentStatus.Cancelled);
  });

  it('happy path: propose -> start -> cancel', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.cancel(exp.id);
    const final = await rt.getById(exp.id);
    expect(final!.status).toBe(ExperimentStatus.Cancelled);
  });

  it('inconclusive path: propose -> start -> complete (low confidence)', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.8 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 6, 5);
    const final = await rt.getById(exp.id);
    expect(final!.status).toBe(ExperimentStatus.Inconclusive);
    expect(final!.winner).toBe('A');
  });

  it('frozen at every stage', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    expect(Object.isFrozen(exp)).toBe(true);
    await rt.start(exp.id);
    const started = await rt.getById(exp.id);
    expect(Object.isFrozen(started!)).toBe(true);
    await rt.complete(exp.id, 10, 2);
    const completed = await rt.getById(exp.id);
    expect(Object.isFrozen(completed!)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// EVENT EMISSION
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — event emission', () => {
  it('does not emit events without eventBus', async () => {
    const rt = createRuntime();
    await rt.propose(makeParams());
    const exp = (await rt.list())[0];
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    // No error
  });

  it('emits started event with eventBus', async () => {
    const bus = new InProcessEventBus();
    const rt = createRuntime(bus);
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    const log = bus.getLog();
    const started = log.filter(e => e.eventType === 'evolution.experiment.started');
    expect(started.length).toBe(1);
  });

  it('started event has sequence > 0', async () => {
    const bus = new InProcessEventBus();
    const rt = createRuntime(bus);
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    const log = bus.getLog();
    const started = log.find(e => e.eventType === 'evolution.experiment.started')!;
    expect(started.sequence).toBeGreaterThan(0);
  });

  it('emits completed event with eventBus', async () => {
    const bus = new InProcessEventBus();
    const rt = createRuntime(bus);
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    const log = bus.getLog();
    const completed = log.filter(e => e.eventType === 'evolution.experiment.completed');
    expect(completed.length).toBe(1);
  });

  it('completed event has correct eventType', async () => {
    const bus = new InProcessEventBus();
    const rt = createRuntime(bus);
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    const log = bus.getLog();
    const completed = log.find(e => e.eventType === 'evolution.experiment.completed')!;
    expect(completed.eventType).toBe('evolution.experiment.completed');
  });

  it('completed event is emitted even for Inconclusive results', async () => {
    const bus = new InProcessEventBus();
    const rt = createRuntime(bus, { minConfidence: 0.8 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 5, 4.9);
    const log = bus.getLog();
    const completed = log.filter(e => e.eventType === 'evolution.experiment.completed');
    expect(completed.length).toBe(1);
  });

  it('does not emit started event for invalid transition', async () => {
    const bus = new InProcessEventBus();
    const rt = createRuntime(bus);
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    try { await rt.start(exp.id); } catch { /* expected */ }
    const log = bus.getLog();
    const started = log.filter(e => e.eventType === 'evolution.experiment.started');
    expect(started.length).toBe(1);
  });

  it('does not emit completed event for invalid transition', async () => {
    const bus = new InProcessEventBus();
    const rt = createRuntime(bus);
    const exp = await rt.propose(makeParams());
    try { await rt.complete(exp.id, 10, 2); } catch { /* expected */ }
    const log = bus.getLog();
    const completed = log.filter(e => e.eventType === 'evolution.experiment.completed');
    expect(completed.length).toBe(0);
  });

  it('event sequence numbers are monotonically increasing', async () => {
    const bus = new InProcessEventBus();
    const rt = createRuntime(bus);
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    const log = bus.getLog();
    for (let i = 1; i < log.length; i++) {
      expect(log[i].sequence).toBeGreaterThan(log[i - 1].sequence);
    }
  });

  it('no event emitted for cancel', async () => {
    const bus = new InProcessEventBus();
    const rt = createRuntime(bus);
    const exp = await rt.propose(makeParams());
    await rt.cancel(exp.id);
    const log = bus.getLog();
    // cancel doesn't emit any event
    const all = log.filter(e => e.eventType.startsWith('evolution.experiment.'));
    expect(all.length).toBe(0);
  });

  it('multiple start/complete emit correct event counts', async () => {
    const bus = new InProcessEventBus();
    const rt = createRuntime(bus);
    const exp1 = await rt.propose(makeParams());
    const exp2 = await rt.propose(makeParams());
    await rt.start(exp1.id);
    await rt.start(exp2.id);
    await rt.complete(exp1.id, 10, 2);
    await rt.complete(exp2.id, 3, 8);
    const log = bus.getLog();
    const started = log.filter(e => e.eventType === 'evolution.experiment.started');
    const completed = log.filter(e => e.eventType === 'evolution.experiment.completed');
    expect(started.length).toBe(2);
    expect(completed.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════

describe('ExperimentRuntime — edge cases', () => {
  it('propose with empty name', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams({ name: '' }));
    expect(exp.name).toBe('');
  });

  it('propose with empty description', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams({ description: '' }));
    expect(exp.description).toBe('');
  });

  it('propose with long name', async () => {
    const rt = createRuntime();
    const longName = 'a'.repeat(1000);
    const exp = await rt.propose(makeParams({ name: longName }));
    expect(exp.name).toBe(longName);
  });

  it('multiple experiments with same name are distinct', async () => {
    const rt = createRuntime();
    const exp1 = await rt.propose(makeParams({ name: 'same' }));
    const exp2 = await rt.propose(makeParams({ name: 'same' }));
    expect(exp1.id).not.toBe(exp2.id);
    expect(await rt.count()).toBe(2);
  });

  it('count remains stable after failed start', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    try { await rt.start(brandExperimentId('unknown')); } catch { /* expected */ }
    expect(await rt.count()).toBe(1);
  });

  it('count remains stable after failed complete', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    try { await rt.complete(exp.id, 10, 2); } catch { /* expected */ }
    expect(await rt.count()).toBe(1);
  });

  it('negative results in complete', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.5 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    // Both negative: -10 vs -2, higher value is -2 (B wins)
    await rt.complete(exp.id, -10, -2);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('B');
  });

  it('negative and positive results', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.5 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    // -5 vs 10, B wins
    await rt.complete(exp.id, -5, 10);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('B');
    // better=max(-5,10)=10, worse=min(-5,10)=-5
    // confidence = min(1, 10/(10+(-5))) = min(1, 2) = 1
    expect(found!.confidence).toBe(1);
  });

  it('fractional results', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.5 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 0.7, 0.3);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('A');
    expect(found!.confidence).toBeCloseTo(0.7 / 1.0, 10);
  });

  it('very small results', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.5 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 0.001, 0.002);
    const found = await rt.getById(exp.id);
    expect(found!.winner).toBe('B');
  });

  it('getById with brandExperimentId returns null for non-existent', async () => {
    const rt = createRuntime();
    const id = brandExperimentId('does-not-exist');
    expect(await rt.getById(id)).toBeNull();
  });

  it('propose with special characters in name', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams({ name: 'test<script>alert(1)</script>' }));
    expect(exp.name).toBe('test<script>alert(1)</script>');
  });

  it('propose with empty variants', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams({ variantA: '', variantB: '' }));
    expect(exp.variantA).toBe('');
    expect(exp.variantB).toBe('');
  });

  it('propose with empty metricName', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams({ metricName: '' }));
    expect(exp.metricName).toBe('');
  });

  it('multiple experiments can be in different states', async () => {
    const rt = createRuntime();
    const exp1 = await rt.propose(makeParams());
    const exp2 = await rt.propose(makeParams());
    const exp3 = await rt.propose(makeParams());
    await rt.start(exp1.id);
    await rt.cancel(exp2.id);
    expect((await rt.getById(exp1.id))!.status).toBe(ExperimentStatus.Running);
    expect((await rt.getById(exp2.id))!.status).toBe(ExperimentStatus.Cancelled);
    expect((await rt.getById(exp3.id))!.status).toBe(ExperimentStatus.Proposed);
  });

  it('proposedAt never changes after proposal', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    const proposedAt = exp.proposedAt;
    await rt.start(exp.id);
    await rt.complete(exp.id, 10, 2);
    expect((await rt.getById(exp.id))!.proposedAt).toBe(proposedAt);
  });

  it('completedAt is null before completion', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    expect((await rt.getById(exp.id))!.completedAt).toBeNull();
    await rt.start(exp.id);
    expect((await rt.getById(exp.id))!.completedAt).toBeNull();
  });

  it('ExperimentNotFoundError extends Error', async () => {
    const rt = createRuntime();
    try {
      await rt.start(brandExperimentId('x'));
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('ExperimentLimitExceededError extends Error', async () => {
    const rt = createRuntime(undefined, { maxExperiments: 1 });
    await rt.propose(makeParams());
    try {
      await rt.propose(makeParams());
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('ExperimentStateError extends Error', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    try {
      await rt.start(exp.id);
      await rt.start(exp.id);
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('ExperimentNotFoundError has experimentId property', async () => {
    const rt = createRuntime();
    try {
      await rt.start(brandExperimentId('test-id'));
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.experimentId).toBe('test-id');
    }
  });

  it('ExperimentLimitExceededError has timestamp', async () => {
    const rt = createRuntime(undefined, { maxExperiments: 1 });
    await rt.propose(makeParams());
    try {
      await rt.propose(makeParams());
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.timestamp).toBeDefined();
    }
  });

  it('ExperimentStateError has context with transition info', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    try {
      await rt.complete(exp.id, 10, 2);
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.context).toBeDefined();
    }
  });

  it('immutability: returned experiment from propose cannot be mutated', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    try {
      (exp as any).name = 'hacked';
    } catch { /* frozen */ }
    const found = await rt.getById(exp.id);
    expect(found!.name).toBe('Test Experiment');
  });

  it('immutability: returned experiment from getById cannot be mutated', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    const found = await rt.getById(exp.id)!;
    try {
      (found as any).status = 'Hacked';
    } catch { /* frozen */ }
    const foundAgain = await rt.getById(exp.id);
    expect(foundAgain!.status).toBe(ExperimentStatus.Proposed);
  });

  it('list without arguments returns same as list with empty filter', async () => {
    const rt = createRuntime();
    await rt.propose(makeParams());
    const a = await rt.list();
    const b = await rt.list({});
    expect(a.length).toBe(b.length);
  });

  it('updateStatus does not modify unrelated experiments', async () => {
    const rt = createRuntime();
    const exp1 = await rt.propose(makeParams({ name: 'a' }));
    const exp2 = await rt.propose(makeParams({ name: 'b' }));
    await rt.start(exp1.id);
    expect((await rt.getById(exp1.id))!.status).toBe(ExperimentStatus.Running);
    expect((await rt.getById(exp2.id))!.status).toBe(ExperimentStatus.Proposed);
  });

  it('multiple rapid proposals all succeed', async () => {
    const rt = createRuntime();
    const promises = Array.from({ length: 10 }, () => rt.propose(makeParams()));
    const results = await Promise.all(promises);
    expect(results.length).toBe(10);
    expect(new Set(results.map(r => r.id)).size).toBe(10);
  });

  it('confidence is capped at 1 for very dominant A', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.99 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 10000, 1);
    const found = await rt.getById(exp.id);
    expect(found!.confidence).toBeLessThanOrEqual(1);
    expect(found!.confidence).toBeCloseTo(10000 / 10001, 5);
  });

  it('confidence is capped at 1 for very dominant B', async () => {
    const rt = createRuntime(undefined, { minConfidence: 0.99 });
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    await rt.complete(exp.id, 1, 10000);
    const found = await rt.getById(exp.id);
    expect(found!.confidence).toBeLessThanOrEqual(1);
  });

  it('cancel on Proposed does not set startedAt', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    await rt.cancel(exp.id);
    expect((await rt.getById(exp.id))!.startedAt).toBeNull();
  });

  it('cancel on Running preserves startedAt', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    await rt.start(exp.id);
    const startedAt = (await rt.getById(exp.id))!.startedAt;
    await rt.cancel(exp.id);
    expect((await rt.getById(exp.id))!.startedAt).toBe(startedAt);
  });

  it('list returns items with correct fields', async () => {
    const rt = createRuntime();
    const exp = await rt.propose(makeParams());
    const listed = (await rt.list())[0];
    expect(listed.id).toBe(exp.id);
    expect(listed.name).toBe(exp.name);
    expect(listed.improvementId).toBe(exp.improvementId);
    expect(listed.variantA).toBe(exp.variantA);
    expect(listed.variantB).toBe(exp.variantB);
  });
});
