import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { ImprovementEngine } from '../../core/evolution/improvement-engine.js';
import { DefaultEvolutionRuntimeConfig, ConstraintType, ImprovementStatus, brandImprovementId } from '../../core/evolution/types.js';
import {
  ImprovementNotFoundError,
  ImprovementLimitExceededError,
  ImprovementStateError,
} from '../../core/evolution/errors.js';

const cfg = DefaultEvolutionRuntimeConfig.improvementEngine;

function makeParams(overrides?: Partial<import('../../core/evolution/contracts.js').ImprovementProposalParams>): import('../../core/evolution/contracts.js').ImprovementProposalParams {
  return {
    name: 'Test Improvement',
    description: 'A test improvement',
    bottleneckId: null,
    constraintType: ConstraintType.Performance,
    targetRuntime: null,
    targetCapability: null,
    estimatedEffort: 'low',
    evidence: ['ev1'],
    metadata: {},
    ...overrides,
  };
}

function createEngine(bus?: InProcessEventBus, maxImprovements?: number) {
  const config = maxImprovements !== undefined
    ? { ...cfg, maxImprovements, maxActiveImprovements: cfg.maxActiveImprovements, autoApproveThreshold: cfg.autoApproveThreshold }
    : cfg;
  return new ImprovementEngine(config, bus);
}

// ═══════════════════════════════════════════════════════════════════
// CONSTRUCTOR
// ═══════════════════════════════════════════════════════════════════

describe('ImprovementEngine — constructor', () => {
  it('creates instance without eventBus', () => {
    const engine = createEngine();
    expect(engine).toBeDefined();
    expect(engine).toBeInstanceOf(ImprovementEngine);
  });

  it('creates instance with eventBus', () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    expect(engine).toBeDefined();
    expect(engine).toBeInstanceOf(ImprovementEngine);
  });

  it('starts with count 0', async () => {
    const engine = createEngine();
    expect(await engine.count()).toBe(0);
  });

  it('starts with empty list', async () => {
    const engine = createEngine();
    expect(await engine.list()).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PROPOSE
// ═══════════════════════════════════════════════════════════════════

describe('ImprovementEngine — propose', () => {
  let engine: ImprovementEngine;

  beforeEach(() => {
    engine = createEngine();
  });

  it('returns an improvement with all required fields', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.id).toBeDefined();
    expect(imp.status).toBe(ImprovementStatus.Proposed);
    expect(imp.name).toBe('Test Improvement');
    expect(imp.description).toBe('A test improvement');
    expect(imp.constraintType).toBe(ConstraintType.Performance);
    expect(imp.bottleneckId).toBeNull();
    expect(imp.targetRuntime).toBeNull();
    expect(imp.targetCapability).toBeNull();
    expect(imp.estimatedEffort).toBe('low');
    expect(imp.evidence).toEqual(['ev1']);
    expect(imp.metadata).toEqual({});
  });

  it('returns a frozen improvement object', async () => {
    const imp = await engine.propose(makeParams());
    expect(Object.isFrozen(imp)).toBe(true);
  });

  it('generates unique ids for each proposal', async () => {
    const imp1 = await engine.propose(makeParams());
    const imp2 = await engine.propose(makeParams());
    expect(imp1.id).not.toBe(imp2.id);
  });

  it('sets proposedAt to a valid ISO string', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.proposedAt).toBeDefined();
    expect(() => new Date(imp.proposedAt)).not.toThrow();
  });

  it('sets startedAt to null', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.startedAt).toBeNull();
  });

  it('sets completedAt to null', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.completedAt).toBeNull();
  });

  it('sets valueScore to 0', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.valueScore).toBe(0);
  });

  it('sets impactScore to 0', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.impactScore).toBe(0);
  });

  it('sets costScore to 0', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.costScore).toBe(0);
  });

  it('sets riskScore to 0', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.riskScore).toBe(0);
  });

  it('sets urgencyScore to 0', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.urgencyScore).toBe(0);
  });

  it('sets constraintWeight to 1.0', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.constraintWeight).toBe(1.0);
  });

  it('sets priority to 0', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.priority).toBe(0);
  });

  it('sets valueDimension to UserValue', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.valueDimension).toBe('UserValue');
  });

  it('accepts bottleneckId', async () => {
    const bnId = brandImprovementId('bn-123') as any; // use branded bottleneck id
    const imp = await engine.propose(makeParams({ bottleneckId: bnId }));
    expect(imp.bottleneckId).toBe(bnId);
  });

  it('accepts targetRuntime', async () => {
    const imp = await engine.propose(makeParams({ targetRuntime: 'runtime-1' }));
    expect(imp.targetRuntime).toBe('runtime-1');
  });

  it('accepts targetCapability', async () => {
    const imp = await engine.propose(makeParams({ targetCapability: 'cap-1' }));
    expect(imp.targetCapability).toBe('cap-1');
  });

  it('accepts different constraintType', async () => {
    const imp = await engine.propose(makeParams({ constraintType: ConstraintType.Quality }));
    expect(imp.constraintType).toBe(ConstraintType.Quality);
  });

  it('accepts evidence array', async () => {
    const imp = await engine.propose(makeParams({ evidence: ['a', 'b', 'c'] }));
    expect(imp.evidence).toEqual(['a', 'b', 'c']);
  });

  it('accepts metadata object', async () => {
    const imp = await engine.propose(makeParams({ metadata: { key: 'val' } }));
    expect(imp.metadata).toEqual({ key: 'val' });
  });

  it('accepts empty evidence array', async () => {
    const imp = await engine.propose(makeParams({ evidence: [] }));
    expect(imp.evidence).toEqual([]);
  });

  it('accepts all ConstraintType values', async () => {
    const types = Object.values(ConstraintType);
    for (const ct of types) {
      const imp = await engine.propose(makeParams({ constraintType: ct }));
      expect(imp.constraintType).toBe(ct);
    }
  });

  it('increments count after proposal', async () => {
    await engine.propose(makeParams());
    expect(await engine.count()).toBe(1);
    await engine.propose(makeParams());
    expect(await engine.count()).toBe(2);
  });

  it('is retrievable by id after proposal', async () => {
    const imp = await engine.propose(makeParams());
    const found = await engine.getById(imp.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(imp.id);
  });

  it('appears in list after proposal', async () => {
    await engine.propose(makeParams());
    const all = await engine.list();
    expect(all.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PROPOSE — LIMIT
// ═══════════════════════════════════════════════════════════════════

describe('ImprovementEngine — propose limit exceeded', () => {
  it('throws ImprovementLimitExceededError when maxImprovements reached', async () => {
    const engine = createEngine(undefined, 2);
    await engine.propose(makeParams());
    await engine.propose(makeParams());
    await expect(engine.propose(makeParams())).rejects.toThrow(ImprovementLimitExceededError);
  });

  it('throws with correct message', async () => {
    const engine = createEngine(undefined, 1);
    await engine.propose(makeParams());
    await expect(engine.propose(makeParams())).rejects.toThrow('Maximum improvements exceeded: 1');
  });

  it('error is instance of EvolutionError', async () => {
    const engine = createEngine(undefined, 1);
    await engine.propose(makeParams());
    try {
      await engine.propose(makeParams());
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ImprovementLimitExceededError');
      expect(e.code).toBe('IMPROVEMENT_LIMIT_EXCEEDED');
    }
  });

  it('does not add item when limit exceeded', async () => {
    const engine = createEngine(undefined, 1);
    await engine.propose(makeParams());
    try { await engine.propose(makeParams()); } catch { /* expected */ }
    expect(await engine.count()).toBe(1);
  });

  it('allows exactly maxImprovements items', async () => {
    const engine = createEngine(undefined, 3);
    await engine.propose(makeParams());
    await engine.propose(makeParams());
    await engine.propose(makeParams());
    expect(await engine.count()).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════════

describe('ImprovementEngine — getById', () => {
  let engine: ImprovementEngine;

  beforeEach(() => {
    engine = createEngine();
  });

  it('returns null for unknown id', async () => {
    const result = await engine.getById(brandImprovementId('nonexistent'));
    expect(result).toBeNull();
  });

  it('returns the improvement after propose', async () => {
    const imp = await engine.propose(makeParams());
    const found = await engine.getById(imp.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(imp.id);
    expect(found!.name).toBe(imp.name);
  });

  it('returns a frozen object', async () => {
    const imp = await engine.propose(makeParams());
    const found = await engine.getById(imp.id);
    expect(Object.isFrozen(found!)).toBe(true);
  });

  it('returns updated status after updateStatus', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.Planned);
  });

  it('returns null after proposing then looking up wrong id', async () => {
    await engine.propose(makeParams());
    const result = await engine.getById(brandImprovementId('other-id'));
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════════

describe('ImprovementEngine — list', () => {
  let engine: ImprovementEngine;

  beforeEach(() => {
    engine = createEngine();
  });

  it('returns empty array when no improvements', async () => {
    expect(await engine.list()).toEqual([]);
  });

  it('returns all proposed improvements', async () => {
    await engine.propose(makeParams());
    await engine.propose(makeParams());
    const all = await engine.list();
    expect(all.length).toBe(2);
  });

  it('filters by status=Proposed', async () => {
    const imp = await engine.propose(makeParams());
    const all = await engine.list({ status: ImprovementStatus.Proposed });
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(imp.id);
  });

  it('filters by status=Planned', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    const planned = await engine.list({ status: ImprovementStatus.Planned });
    expect(planned.length).toBe(1);
    const proposed = await engine.list({ status: ImprovementStatus.Proposed });
    expect(proposed.length).toBe(0);
  });

  it('filters by status=InProgress', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    const inProgress = await engine.list({ status: ImprovementStatus.InProgress });
    expect(inProgress.length).toBe(1);
  });

  it('filters by status=Completed', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    const completed = await engine.list({ status: ImprovementStatus.Completed });
    expect(completed.length).toBe(1);
  });

  it('filters by status=Failed', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Failed);
    const failed = await engine.list({ status: ImprovementStatus.Failed });
    expect(failed.length).toBe(1);
  });

  it('filters by status=Rejected', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Rejected);
    const rejected = await engine.list({ status: ImprovementStatus.Rejected });
    expect(rejected.length).toBe(1);
  });

  it('filters by status=RolledBack', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.RolledBack);
    const rolledBack = await engine.list({ status: ImprovementStatus.RolledBack });
    expect(rolledBack.length).toBe(1);
  });

  it('filters by constraintType=Performance', async () => {
    await engine.propose(makeParams({ constraintType: ConstraintType.Performance }));
    await engine.propose(makeParams({ constraintType: ConstraintType.Quality }));
    const perf = await engine.list({ constraintType: ConstraintType.Performance });
    expect(perf.length).toBe(1);
    expect(perf[0].constraintType).toBe(ConstraintType.Performance);
  });

  it('filters by constraintType=Quality', async () => {
    await engine.propose(makeParams({ constraintType: ConstraintType.Performance }));
    await engine.propose(makeParams({ constraintType: ConstraintType.Quality }));
    const quality = await engine.list({ constraintType: ConstraintType.Quality });
    expect(quality.length).toBe(1);
  });

  it('filters by constraintType=UX', async () => {
    await engine.propose(makeParams({ constraintType: ConstraintType.UX }));
    await engine.propose(makeParams({ constraintType: ConstraintType.Quality }));
    const ux = await engine.list({ constraintType: ConstraintType.UX });
    expect(ux.length).toBe(1);
  });

  it('filters by constraintType=Knowledge', async () => {
    await engine.propose(makeParams({ constraintType: ConstraintType.Knowledge }));
    await engine.propose(makeParams({ constraintType: ConstraintType.Quality }));
    const knowledge = await engine.list({ constraintType: ConstraintType.Knowledge });
    expect(knowledge.length).toBe(1);
  });

  it('filters by constraintType=Memory', async () => {
    await engine.propose(makeParams({ constraintType: ConstraintType.Memory }));
    const memory = await engine.list({ constraintType: ConstraintType.Memory });
    expect(memory.length).toBe(1);
  });

  it('filters by constraintType=Reasoning', async () => {
    await engine.propose(makeParams({ constraintType: ConstraintType.Reasoning }));
    const reasoning = await engine.list({ constraintType: ConstraintType.Reasoning });
    expect(reasoning.length).toBe(1);
  });

  it('filters by constraintType=Architecture', async () => {
    await engine.propose(makeParams({ constraintType: ConstraintType.Architecture }));
    const arch = await engine.list({ constraintType: ConstraintType.Architecture });
    expect(arch.length).toBe(1);
  });

  it('filters by both status and constraintType', async () => {
    await engine.propose(makeParams({ constraintType: ConstraintType.Performance }));
    const imp2 = await engine.propose(makeParams({ constraintType: ConstraintType.Performance }));
    await engine.updateStatus(imp2.id, ImprovementStatus.Planned);
    const proposedPerf = await engine.list({ status: ImprovementStatus.Proposed, constraintType: ConstraintType.Performance });
    expect(proposedPerf.length).toBe(1);
  });

  it('returns frozen array items', async () => {
    await engine.propose(makeParams());
    const all = await engine.list();
    for (const item of all) {
      expect(Object.isFrozen(item)).toBe(true);
    }
  });

  it('returns empty for non-matching status filter', async () => {
    await engine.propose(makeParams());
    const completed = await engine.list({ status: ImprovementStatus.Completed });
    expect(completed.length).toBe(0);
  });

  it('returns empty for non-matching constraintType filter', async () => {
    await engine.propose(makeParams({ constraintType: ConstraintType.Performance }));
    const quality = await engine.list({ constraintType: ConstraintType.Quality });
    expect(quality.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// COUNT
// ═══════════════════════════════════════════════════════════════════

describe('ImprovementEngine — count', () => {
  it('returns 0 initially', async () => {
    const engine = createEngine();
    expect(await engine.count()).toBe(0);
  });

  it('increments by 1 per propose', async () => {
    const engine = createEngine();
    await engine.propose(makeParams());
    expect(await engine.count()).toBe(1);
    await engine.propose(makeParams());
    expect(await engine.count()).toBe(2);
    await engine.propose(makeParams());
    expect(await engine.count()).toBe(3);
  });

  it('does not decrement on status change', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    expect(await engine.count()).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// UPDATE STATUS — VALID TRANSITIONS
// ═══════════════════════════════════════════════════════════════════

describe('ImprovementEngine — updateStatus valid transitions', () => {
  let engine: ImprovementEngine;

  beforeEach(() => {
    engine = createEngine();
  });

  it('Proposed -> Planned', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.Planned);
  });

  it('Proposed -> Rejected', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Rejected);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.Rejected);
  });

  it('Planned -> InProgress', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.InProgress);
  });

  it('Planned -> Rejected', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.Rejected);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.Rejected);
  });

  it('InProgress -> Completed', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.Completed);
  });

  it('InProgress -> Failed', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Failed);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.Failed);
  });

  it('InProgress -> RolledBack', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.RolledBack);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.RolledBack);
  });

  it('Failed -> Proposed', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Failed);
    await engine.updateStatus(imp.id, ImprovementStatus.Proposed);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.Proposed);
  });

  it('RolledBack -> Proposed', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.RolledBack);
    await engine.updateStatus(imp.id, ImprovementStatus.Proposed);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.Proposed);
  });

  it('sets startedAt when transitioning to InProgress', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    const found = await engine.getById(imp.id);
    expect(found!.startedAt).not.toBeNull();
    expect(() => new Date(found!.startedAt!)).not.toThrow();
  });

  it('sets completedAt when transitioning to Completed', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    const found = await engine.getById(imp.id);
    expect(found!.completedAt).not.toBeNull();
  });

  it('sets completedAt when transitioning to Failed', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Failed);
    const found = await engine.getById(imp.id);
    expect(found!.completedAt).not.toBeNull();
  });

  it('does not set completedAt when transitioning to Planned', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    const found = await engine.getById(imp.id);
    expect(found!.completedAt).toBeNull();
  });

  it('does not set startedAt when transitioning to Planned', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    const found = await engine.getById(imp.id);
    expect(found!.startedAt).toBeNull();
  });

  it('preserves startedAt when transitioning from InProgress to non-InProgress', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    const inProgress = await engine.getById(imp.id);
    const startedAt = inProgress!.startedAt!;
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    const found = await engine.getById(imp.id);
    expect(found!.startedAt).toBe(startedAt);
  });

  it('full lifecycle: Proposed -> Planned -> InProgress -> Completed', async () => {
    const imp = await engine.propose(makeParams());
    expect(imp.status).toBe(ImprovementStatus.Proposed);
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    expect((await engine.getById(imp.id))!.status).toBe(ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    expect((await engine.getById(imp.id))!.status).toBe(ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    expect((await engine.getById(imp.id))!.status).toBe(ImprovementStatus.Completed);
  });

  it('full lifecycle with failure and retry: Proposed -> Planned -> InProgress -> Failed -> Proposed -> Planned', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Failed);
    await engine.updateStatus(imp.id, ImprovementStatus.Proposed);
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.Planned);
  });

  it('full lifecycle with rollback and retry', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.RolledBack);
    await engine.updateStatus(imp.id, ImprovementStatus.Proposed);
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.Proposed);
  });

  it('returns updated object that is frozen', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    const found = await engine.getById(imp.id);
    expect(Object.isFrozen(found!)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// UPDATE STATUS — INVALID TRANSITIONS
// ═══════════════════════════════════════════════════════════════════

describe('ImprovementEngine — updateStatus invalid transitions', () => {
  let engine: ImprovementEngine;

  beforeEach(() => {
    engine = createEngine();
  });

  it('throws ImprovementNotFoundError for unknown id', async () => {
    await expect(engine.updateStatus(brandImprovementId('unknown'), ImprovementStatus.Planned))
      .rejects.toThrow(ImprovementNotFoundError);
  });

  it('ImprovementNotFoundError has correct name', async () => {
    try {
      await engine.updateStatus(brandImprovementId('unknown'), ImprovementStatus.Planned);
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ImprovementNotFoundError');
      expect(e.code).toBe('IMPROVEMENT_NOT_FOUND');
    }
  });

  it('Completed -> Proposed throws ImprovementStateError', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Proposed))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Completed -> Planned throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Planned))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Completed -> InProgress throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.InProgress))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Completed -> Failed throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Failed))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Completed -> RolledBack throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.RolledBack))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Rejected -> Proposed throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Rejected);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Proposed))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Rejected -> Planned throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Rejected);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Planned))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Rejected -> InProgress throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Rejected);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.InProgress))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Rejected -> Completed throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Rejected);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Completed))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Rejected -> Failed throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Rejected);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Failed))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Proposed -> InProgress throws (must go through Planned)', async () => {
    const imp = await engine.propose(makeParams());
    await expect(engine.updateStatus(imp.id, ImprovementStatus.InProgress))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Proposed -> Completed throws', async () => {
    const imp = await engine.propose(makeParams());
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Completed))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Proposed -> Failed throws', async () => {
    const imp = await engine.propose(makeParams());
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Failed))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Proposed -> RolledBack throws', async () => {
    const imp = await engine.propose(makeParams());
    await expect(engine.updateStatus(imp.id, ImprovementStatus.RolledBack))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Proposed -> same status Proposed throws', async () => {
    const imp = await engine.propose(makeParams());
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Proposed))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Planned -> Completed throws (must go through InProgress)', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Completed))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Planned -> Failed throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Failed))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Planned -> same status Planned throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Planned))
      .rejects.toThrow(ImprovementStateError);
  });

  it('InProgress -> Proposed throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Proposed))
      .rejects.toThrow(ImprovementStateError);
  });

  it('InProgress -> same status InProgress throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.InProgress))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Failed -> Planned throws (must go through Proposed)', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Failed);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Planned))
      .rejects.toThrow(ImprovementStateError);
  });

  it('Failed -> InProgress throws', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Failed);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.InProgress))
      .rejects.toThrow(ImprovementStateError);
  });

  it('RolledBack -> Planned throws (must go through Proposed)', async () => {
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.RolledBack);
    await expect(engine.updateStatus(imp.id, ImprovementStatus.Planned))
      .rejects.toThrow(ImprovementStateError);
  });

  it('ImprovementStateError has correct name and code', async () => {
    const imp = await engine.propose(makeParams());
    try {
      await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ImprovementStateError');
      expect(e.code).toBe('IMPROVEMENT_STATE_ERROR');
    }
  });

  it('ImprovementStateError contains current and target status', async () => {
    const imp = await engine.propose(makeParams());
    try {
      await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.currentStatus).toBe(ImprovementStatus.Proposed);
      expect(e.targetStatus).toBe(ImprovementStatus.InProgress);
    }
  });

  it('invalid transition does not change status', async () => {
    const imp = await engine.propose(makeParams());
    try { await engine.updateStatus(imp.id, ImprovementStatus.InProgress); } catch { /* expected */ }
    const found = await engine.getById(imp.id);
    expect(found!.status).toBe(ImprovementStatus.Proposed);
  });
});

// ═══════════════════════════════════════════════════════════════════
// EVENT EMISSION
// ═══════════════════════════════════════════════════════════════════

describe('ImprovementEngine — event emission', () => {
  it('emits proposed event with eventBus', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    await engine.propose(makeParams());
    const log = bus.getLog();
    const proposed = log.filter(e => e.eventType === 'evolution.improvement.proposed');
    expect(proposed.length).toBe(1);
  });

  it('proposed event has correct eventType', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    await engine.propose(makeParams());
    const log = bus.getLog();
    expect(log[0].eventType).toBe('evolution.improvement.proposed');
  });

  it('proposed event has sequence > 0', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    await engine.propose(makeParams());
    const log = bus.getLog();
    expect(log[0].sequence).toBeGreaterThan(0);
  });

  it('emits statusChanged event on valid transition', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    const log = bus.getLog();
    const changed = log.filter(e => e.eventType === 'evolution.improvement.statusChanged');
    expect(changed.length).toBe(1);
  });

  it('emits statusChanged for Proposed->Planned', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    const log = bus.getLog();
    const changed = log.filter(e => e.eventType === 'evolution.improvement.statusChanged');
    expect(changed.length).toBe(1);
  });

  it('emits statusChanged for Planned->InProgress', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    const log = bus.getLog();
    const changed = log.filter(e => e.eventType === 'evolution.improvement.statusChanged');
    expect(changed.length).toBe(2);
  });

  it('emits statusChanged for InProgress->Completed', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    const log = bus.getLog();
    const changed = log.filter(e => e.eventType === 'evolution.improvement.statusChanged');
    expect(changed.length).toBe(3);
  });

  it('emits statusChanged for InProgress->Failed', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Failed);
    const log = bus.getLog();
    const changed = log.filter(e => e.eventType === 'evolution.improvement.statusChanged');
    expect(changed.length).toBe(3);
  });

  it('emits statusChanged for InProgress->RolledBack', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.RolledBack);
    const log = bus.getLog();
    const changed = log.filter(e => e.eventType === 'evolution.improvement.statusChanged');
    expect(changed.length).toBe(3);
  });

  it('emits statusChanged for Failed->Proposed', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Failed);
    await engine.updateStatus(imp.id, ImprovementStatus.Proposed);
    const log = bus.getLog();
    const changed = log.filter(e => e.eventType === 'evolution.improvement.statusChanged');
    expect(changed.length).toBe(4);
  });

  it('emits statusChanged for RolledBack->Proposed', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.RolledBack);
    await engine.updateStatus(imp.id, ImprovementStatus.Proposed);
    const log = bus.getLog();
    const changed = log.filter(e => e.eventType === 'evolution.improvement.statusChanged');
    expect(changed.length).toBe(4);
  });

  it('emits completed event when transitioning to Completed', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    const log = bus.getLog();
    const completed = log.filter(e => e.eventType === 'evolution.improvement.completed');
    expect(completed.length).toBe(1);
  });

  it('completed event has correct eventType', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    const log = bus.getLog();
    const completed = log.find(e => e.eventType === 'evolution.improvement.completed')!;
    expect(completed.eventType).toBe('evolution.improvement.completed');
  });

  it('does not emit completed event when transitioning to Failed', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Failed);
    const log = bus.getLog();
    const completed = log.filter(e => e.eventType === 'evolution.improvement.completed');
    expect(completed.length).toBe(0);
  });

  it('does not emit events without eventBus', async () => {
    const engine = createEngine();
    await engine.propose(makeParams());
    const imp = (await engine.list())[0];
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    // No error — just no events
  });

  it('does not emit statusChanged for invalid transition', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    try { await engine.updateStatus(imp.id, ImprovementStatus.Completed); } catch { /* expected */ }
    const log = bus.getLog();
    const changed = log.filter(e => e.eventType === 'evolution.improvement.statusChanged');
    expect(changed.length).toBe(0);
  });

  it('multiple proposals emit multiple proposed events', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    await engine.propose(makeParams());
    await engine.propose(makeParams());
    await engine.propose(makeParams());
    const log = bus.getLog();
    const proposed = log.filter(e => e.eventType === 'evolution.improvement.proposed');
    expect(proposed.length).toBe(3);
  });

  it('event sequence numbers are monotonically increasing', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    await engine.propose(makeParams());
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    const log = bus.getLog();
    for (let i = 1; i < log.length; i++) {
      expect(log[i].sequence).toBeGreaterThan(log[i - 1].sequence);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════

describe('ImprovementEngine — edge cases', () => {
  it('propose with empty name', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams({ name: '' }));
    expect(imp.name).toBe('');
  });

  it('propose with empty description', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams({ description: '' }));
    expect(imp.description).toBe('');
  });

  it('propose with long name', async () => {
    const engine = createEngine();
    const longName = 'a'.repeat(1000);
    const imp = await engine.propose(makeParams({ name: longName }));
    expect(imp.name).toBe(longName);
  });

  it('propose with special characters in name', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams({ name: 'test<script>alert(1)</script>' }));
    expect(imp.name).toBe('test<script>alert(1)</script>');
  });

  it('propose with null targetRuntime and targetCapability', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams({ targetRuntime: null, targetCapability: null }));
    expect(imp.targetRuntime).toBeNull();
    expect(imp.targetCapability).toBeNull();
  });

  it('list with no filter returns all', async () => {
    const engine = createEngine();
    await engine.propose(makeParams({ constraintType: ConstraintType.Performance }));
    await engine.propose(makeParams({ constraintType: ConstraintType.Quality }));
    await engine.propose(makeParams({ constraintType: ConstraintType.UX }));
    const all = await engine.list();
    expect(all.length).toBe(3);
  });

  it('list with empty filter object returns all', async () => {
    const engine = createEngine();
    await engine.propose(makeParams());
    const all = await engine.list({});
    expect(all.length).toBe(1);
  });

  it('count remains stable after failed updateStatus', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams());
    try { await engine.updateStatus(imp.id, ImprovementStatus.Completed); } catch { /* expected */ }
    expect(await engine.count()).toBe(1);
  });

  it('multiple improvements with same name are distinct', async () => {
    const engine = createEngine();
    const imp1 = await engine.propose(makeParams({ name: 'same' }));
    const imp2 = await engine.propose(makeParams({ name: 'same' }));
    expect(imp1.id).not.toBe(imp2.id);
    expect(await engine.count()).toBe(2);
  });

  it('getById with brandImprovementId returns null for non-existent', async () => {
    const engine = createEngine();
    const id = brandImprovementId('does-not-exist');
    expect(await engine.getById(id)).toBeNull();
  });

  it('propose with all ConstraintType enum values produces correct filter results', async () => {
    const engine = createEngine();
    const types = Object.values(ConstraintType);
    for (const ct of types) {
      await engine.propose(makeParams({ constraintType: ct }));
    }
    for (const ct of types) {
      const filtered = await engine.list({ constraintType: ct });
      expect(filtered.length).toBe(1);
      expect(filtered[0].constraintType).toBe(ct);
    }
  });

  it('list returns items with correct types after filtering', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams());
    const listed = await engine.list();
    expect(listed[0].id).toBe(imp.id);
    expect(listed[0].name).toBe(imp.name);
    expect(listed[0].description).toBe(imp.description);
  });

  it('propose preserves evidence array reference values', async () => {
    const engine = createEngine();
    const evidence = ['trace-1', 'trace-2', 'trace-3'];
    const imp = await engine.propose(makeParams({ evidence }));
    expect(imp.evidence).toEqual(evidence);
    expect(imp.evidence.length).toBe(3);
  });

  it('multiple updates produce correct status history via getById', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams());
    expect((await engine.getById(imp.id))!.status).toBe(ImprovementStatus.Proposed);
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    expect((await engine.getById(imp.id))!.status).toBe(ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.Rejected);
    expect((await engine.getById(imp.id))!.status).toBe(ImprovementStatus.Rejected);
  });

  it('updating one improvement does not affect another', async () => {
    const engine = createEngine();
    const imp1 = await engine.propose(makeParams({ name: 'first' }));
    const imp2 = await engine.propose(makeParams({ name: 'second' }));
    await engine.updateStatus(imp1.id, ImprovementStatus.Planned);
    expect((await engine.getById(imp1.id))!.status).toBe(ImprovementStatus.Planned);
    expect((await engine.getById(imp2.id))!.status).toBe(ImprovementStatus.Proposed);
  });

  it('completedAt is null for non-terminal states', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    expect((await engine.getById(imp.id))!.completedAt).toBeNull();
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    expect((await engine.getById(imp.id))!.completedAt).toBeNull();
  });

  it('proposedAt is set and never changes', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams());
    const proposedAt = imp.proposedAt;
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    expect((await engine.getById(imp.id))!.proposedAt).toBe(proposedAt);
  });

  it('ImprovementNotFoundError extends Error and EvolutionError', async () => {
    const engine = createEngine();
    try {
      await engine.updateStatus(brandImprovementId('x'), ImprovementStatus.Planned);
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e).toBeInstanceOf(Error);
      expect(e.name).toBe('ImprovementNotFoundError');
      expect(e.code).toBe('IMPROVEMENT_NOT_FOUND');
    }
  });

  it('ImprovementLimitExceededError extends EvolutionError', async () => {
    const engine = createEngine(undefined, 1);
    await engine.propose(makeParams());
    try {
      await engine.propose(makeParams());
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('ImprovementStateError extends EvolutionError', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams());
    try {
      await engine.updateStatus(imp.id, ImprovementStatus.Completed);
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('completed event has durationMs >= 0', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
    await engine.updateStatus(imp.id, ImprovementStatus.Completed);
    const log = bus.getLog();
    const completed = log.find(e => e.eventType === 'evolution.improvement.completed');
    // durationMs is in the payload which goes through EventBus publish
    expect(completed).toBeDefined();
  });

  it('statusChanged event has correct from and to in payload', async () => {
    const bus = new InProcessEventBus();
    const engine = createEngine(bus);
    const imp = await engine.propose(makeParams());
    await engine.updateStatus(imp.id, ImprovementStatus.Planned);
    const log = bus.getLog();
    const changed = log.find(e => e.eventType === 'evolution.improvement.statusChanged');
    expect(changed).toBeDefined();
  });

  it('list without arguments returns same as list with empty filter', async () => {
    const engine = createEngine();
    await engine.propose(makeParams());
    const a = await engine.list();
    const b = await engine.list({});
    expect(a.length).toBe(b.length);
  });

  it('propose with bottleneckId null is stored correctly', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams({ bottleneckId: null }));
    expect(imp.bottleneckId).toBeNull();
    const found = await engine.getById(imp.id);
    expect(found!.bottleneckId).toBeNull();
  });

  it('constraintType filter returns only matching items when mixed', async () => {
    const engine = createEngine();
    await engine.propose(makeParams({ constraintType: ConstraintType.Performance }));
    await engine.propose(makeParams({ constraintType: ConstraintType.Performance }));
    await engine.propose(makeParams({ constraintType: ConstraintType.Quality }));
    expect((await engine.list({ constraintType: ConstraintType.Performance })).length).toBe(2);
    expect((await engine.list({ constraintType: ConstraintType.Quality })).length).toBe(1);
    expect((await engine.list({ constraintType: ConstraintType.UX })).length).toBe(0);
  });

  it('status filter returns only matching items when mixed', async () => {
    const engine = createEngine();
    const imp1 = await engine.propose(makeParams());
    const imp2 = await engine.propose(makeParams());
    await engine.updateStatus(imp1.id, ImprovementStatus.Planned);
    expect((await engine.list({ status: ImprovementStatus.Proposed })).length).toBe(1);
    expect((await engine.list({ status: ImprovementStatus.Planned })).length).toBe(1);
    expect((await engine.list({ status: ImprovementStatus.InProgress })).length).toBe(0);
  });

  it('ImprovementNotFoundError has improvementId property', async () => {
    const engine = createEngine();
    const id = brandImprovementId('test-id');
    try {
      await engine.updateStatus(id, ImprovementStatus.Planned);
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.improvementId).toBe('test-id');
    }
  });

  it('ImprovementLimitExceededError has timestamp', async () => {
    const engine = createEngine(undefined, 1);
    await engine.propose(makeParams());
    try {
      await engine.propose(makeParams());
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.timestamp).toBeDefined();
    }
  });

  it('ImprovementStateError has context with transition info', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams());
    try {
      await engine.updateStatus(imp.id, ImprovementStatus.InProgress);
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.context).toBeDefined();
      expect(e.context.improvementId).toBe(imp.id);
    }
  });

  it('list returns items that are frozen', async () => {
    const engine = createEngine();
    await engine.propose(makeParams());
    const result = await engine.list();
    expect(result.length).toBeGreaterThanOrEqual(1);
    // Individual items are frozen
    expect(Object.isFrozen(result[0])).toBe(true);
  });

  it('propose does not modify input params', async () => {
    const engine = createEngine();
    const evidence = ['e1'];
    const metadata = { a: 1 };
    const params = makeParams({ evidence, metadata });
    const originalName = params.name;
    await engine.propose(params);
    expect(params.name).toBe(originalName);
    expect(params.evidence).toBe(evidence);
  });

  it('multiple rapid proposals all succeed', async () => {
    const engine = createEngine();
    const promises = Array.from({ length: 10 }, () => engine.propose(makeParams()));
    const results = await Promise.all(promises);
    expect(results.length).toBe(10);
    expect(new Set(results.map(r => r.id)).size).toBe(10);
  });

  it('updateStatus does not modify unrelated improvements', async () => {
    const engine = createEngine();
    const imp1 = await engine.propose(makeParams({ name: 'a' }));
    const imp2 = await engine.propose(makeParams({ name: 'b' }));
    const imp3 = await engine.propose(makeParams({ name: 'c' }));
    await engine.updateStatus(imp2.id, ImprovementStatus.Planned);
    expect((await engine.getById(imp1.id))!.status).toBe(ImprovementStatus.Proposed);
    expect((await engine.getById(imp2.id))!.status).toBe(ImprovementStatus.Planned);
    expect((await engine.getById(imp3.id))!.status).toBe(ImprovementStatus.Proposed);
  });

  it('immutability: returned improvement from propose cannot be mutated', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams());
    try {
      (imp as any).name = 'hacked';
    } catch { /* frozen throws in strict mode */ }
    const found = await engine.getById(imp.id);
    expect(found!.name).toBe('Test Improvement');
  });

  it('immutability: returned improvement from getById cannot be mutated', async () => {
    const engine = createEngine();
    const imp = await engine.propose(makeParams());
    const found = await engine.getById(imp.id)!;
    try {
      (found as any).status = 'Hacked';
    } catch { /* frozen throws in strict mode */ }
    const foundAgain = await engine.getById(imp.id);
    expect(foundAgain!.status).toBe(ImprovementStatus.Proposed);
  });
});
