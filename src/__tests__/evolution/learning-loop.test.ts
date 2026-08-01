import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { LearningLoop } from '../../core/evolution/learning-loop.js';
import { DefaultEvolutionRuntimeConfig, LearningOutcome } from '../../core/evolution/types.js';

const cfg = DefaultEvolutionRuntimeConfig.learningLoop;

function createLoop(bus?: InProcessEventBus) {
  return new LearningLoop(cfg, bus);
}

const baseParams = {
  action: 'refactor-module',
  outcome: LearningOutcome.Improved,
  lesson: 'Extracting interfaces reduces coupling',
  context: 'During performance optimization sprint',
  improvementId: null as any,
  experimentId: null as any,
  metadata: Object.freeze({}),
};

describe('LearningLoop — constructor', () => {
  it('creates instance without eventBus', () => {
    const ll = createLoop();
    expect(ll).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const ll = createLoop(new InProcessEventBus());
    expect(ll).toBeDefined();
  });
});

describe('LearningLoop — record', () => {
  it('creates LearningRecord with all fields', async () => {
    const ll = createLoop();
    const record = await ll.record(baseParams);
    expect(record.id).toBeDefined();
    expect(record.action).toBe('refactor-module');
    expect(record.outcome).toBe(LearningOutcome.Improved);
    expect(record.lesson).toBe('Extracting interfaces reduces coupling');
    expect(record.context).toBe('During performance optimization sprint');
    expect(record.improvementId).toBeNull();
    expect(record.experimentId).toBeNull();
    expect(record.createdAt).toBeDefined();
  });
  it('record is frozen', async () => {
    const ll = createLoop();
    const record = await ll.record(baseParams);
    expect(Object.isFrozen(record)).toBe(true);
  });
  it('each record has unique id', async () => {
    const ll = createLoop();
    const r1 = await ll.record(baseParams);
    const r2 = await ll.record(baseParams);
    expect(r1.id).not.toBe(r2.id);
  });
  it('preserves improvementId', async () => {
    const ll = createLoop();
    const impId = 'imp-123' as any;
    const record = await ll.record({ ...baseParams, improvementId: impId });
    expect(record.improvementId).toBe(impId);
  });
  it('preserves experimentId', async () => {
    const ll = createLoop();
    const expId = 'exp-456' as any;
    const record = await ll.record({ ...baseParams, experimentId: expId });
    expect(record.experimentId).toBe(expId);
  });
  it('preserves metadata', async () => {
    const ll = createLoop();
    const meta = Object.freeze({ key: 'value' });
    const record = await ll.record({ ...baseParams, metadata: meta });
    expect(record.metadata).toBe(meta);
  });
  it('records with LearningOutcome.Worsened', async () => {
    const ll = createLoop();
    const record = await ll.record({ ...baseParams, outcome: LearningOutcome.Worsened });
    expect(record.outcome).toBe(LearningOutcome.Worsened);
  });
  it('records with LearningOutcome.NoChange', async () => {
    const ll = createLoop();
    const record = await ll.record({ ...baseParams, outcome: LearningOutcome.NoChange });
    expect(record.outcome).toBe(LearningOutcome.NoChange);
  });
  it('records with LearningOutcome.UnexpectedSideEffect', async () => {
    const ll = createLoop();
    const record = await ll.record({ ...baseParams, outcome: LearningOutcome.UnexpectedSideEffect });
    expect(record.outcome).toBe(LearningOutcome.UnexpectedSideEffect);
  });
  it('emits evolution.learning.recorded event', async () => {
    const bus = new InProcessEventBus();
    const ll = createLoop(bus);
    await ll.record(baseParams);
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.learning.recorded');
    expect(events.length).toBe(1);
  });
  it('event envelope has correct fields', async () => {
    const bus = new InProcessEventBus();
    const ll = createLoop(bus);
    await ll.record(baseParams);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.learning.recorded');
    expect(evt).toBeDefined();
    expect(evt!.eventType).toBe('evolution.learning.recorded');
    expect(evt!.timestamp).toBeDefined();
  });
  it('emits one event per record', async () => {
    const bus = new InProcessEventBus();
    const ll = createLoop(bus);
    await ll.record(baseParams);
    await ll.record({ ...baseParams, action: 'a2' });
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.learning.recorded');
    expect(events.length).toBe(2);
  });
  it('does not emit events without eventBus', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
  });
});

describe('LearningLoop — getById', () => {
  it('returns null for unknown id', async () => {
    const ll = createLoop();
    const result = await ll.getById('nonexistent' as any);
    expect(result).toBeNull();
  });
  it('returns record after record()', async () => {
    const ll = createLoop();
    const record = await ll.record(baseParams);
    const found = await ll.getById(record.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(record.id);
  });
  it('returns frozen record', async () => {
    const ll = createLoop();
    const record = await ll.record(baseParams);
    const found = await ll.getById(record.id);
    expect(Object.isFrozen(found!)).toBe(true);
  });
});

describe('LearningLoop — list', () => {
  it('returns empty array initially', async () => {
    const ll = createLoop();
    const items = await ll.list();
    expect(items).toEqual([]);
  });
  it('returns all records', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
    await ll.record({ ...baseParams, action: 'action2' });
    const items = await ll.list();
    expect(items.length).toBe(2);
  });
  it('filter by outcome Improved', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
    await ll.record({ ...baseParams, outcome: LearningOutcome.Worsened, action: 'a2' });
    await ll.record({ ...baseParams, outcome: LearningOutcome.Improved, action: 'a3' });
    const items = await ll.list({ outcome: LearningOutcome.Improved });
    expect(items.length).toBe(2);
    for (const i of items) expect(i.outcome).toBe(LearningOutcome.Improved);
  });
  it('filter by outcome Worsened', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
    await ll.record({ ...baseParams, outcome: LearningOutcome.Worsened, action: 'a2' });
    const items = await ll.list({ outcome: LearningOutcome.Worsened });
    expect(items.length).toBe(1);
  });
  it('filter by outcome NoChange', async () => {
    const ll = createLoop();
    await ll.record({ ...baseParams, outcome: LearningOutcome.NoChange });
    await ll.record({ ...baseParams, outcome: LearningOutcome.Worsened, action: 'a2' });
    const items = await ll.list({ outcome: LearningOutcome.NoChange });
    expect(items.length).toBe(1);
  });
  it('filter by outcome UnexpectedSideEffect', async () => {
    const ll = createLoop();
    await ll.record({ ...baseParams, outcome: LearningOutcome.UnexpectedSideEffect });
    await ll.record({ ...baseParams, outcome: LearningOutcome.Worsened, action: 'a2' });
    const items = await ll.list({ outcome: LearningOutcome.UnexpectedSideEffect });
    expect(items.length).toBe(1);
  });
  it('returns frozen array', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
    const items = await ll.list();
    expect(Object.isFrozen(items)).toBe(true);
  });
  it('no filter returns all', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
    await ll.record({ ...baseParams, outcome: LearningOutcome.Worsened, action: 'a2' });
    await ll.record({ ...baseParams, outcome: LearningOutcome.NoChange, action: 'a3' });
    const items = await ll.list();
    expect(items.length).toBe(3);
  });
});

describe('LearningLoop — getLessonsForAction', () => {
  it('returns records for matching action', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
    await ll.record({ ...baseParams, action: 'other-action' });
    const lessons = await ll.getLessonsForAction('refactor-module');
    expect(lessons.length).toBe(1);
  });
  it('returns empty for unknown action', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
    const lessons = await ll.getLessonsForAction('nonexistent');
    expect(lessons).toEqual([]);
  });
  it('returns frozen array', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
    const lessons = await ll.getLessonsForAction('refactor-module');
    expect(Object.isFrozen(lessons)).toBe(true);
  });
  it('returns multiple records for same action', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
    await ll.record({ ...baseParams, lesson: 'Another lesson' });
    const lessons = await ll.getLessonsForAction('refactor-module');
    expect(lessons.length).toBe(2);
  });
});

describe('LearningLoop — count', () => {
  it('returns 0 initially', async () => {
    const ll = createLoop();
    expect(await ll.count()).toBe(0);
  });
  it('returns correct count after records', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
    await ll.record({ ...baseParams, action: 'a2' });
    await ll.record({ ...baseParams, action: 'a3' });
    expect(await ll.count()).toBe(3);
  });
});

describe('LearningLoop — store access', () => {
  it('getStore returns store', () => {
    const ll = createLoop();
    expect(ll.getStore()).toBeDefined();
  });
  it('store size is 0 initially', () => {
    const ll = createLoop();
    expect(ll.getStore().size).toBe(0);
  });
  it('store size increases after record', async () => {
    const ll = createLoop();
    await ll.record(baseParams);
    expect(ll.getStore().size).toBe(1);
  });
});
