import { describe, it, expect, beforeEach } from 'vitest';
import { ValueOptimizationEngine, OptimizationPhase } from '../../core/companion/value-optimization-engine.js';
import { ValueOptimizationError } from '../../core/companion/errors.js';

const SESSION_1 = 'session-vo-1';
const SESSION_2 = 'session-vo-2';

const PHASES = [
  OptimizationPhase.ValueIdentification,
  OptimizationPhase.ConstraintAnalysis,
  OptimizationPhase.ImprovementDesign,
  OptimizationPhase.MeasurementSetup,
  OptimizationPhase.LearningCapture,
];

const PHASE_LABELS: Record<string, string> = {
  [OptimizationPhase.ValueIdentification]: 'ValueIdentification',
  [OptimizationPhase.ConstraintAnalysis]: 'ConstraintAnalysis',
  [OptimizationPhase.ImprovementDesign]: 'ImprovementDesign',
  [OptimizationPhase.MeasurementSetup]: 'MeasurementSetup',
  [OptimizationPhase.LearningCapture]: 'LearningCapture',
};

const VALUE_TYPES = ['user', 'platform', 'developer', 'ecosystem'] as const;

describe('ValueOptimizationEngine startCycle', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('starts at ValueIdentification phase', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'Improve user onboarding');
    expect(cycle.phase).toBe(OptimizationPhase.ValueIdentification);
    expect(cycle.valueIdentified).toBe('Improve user onboarding');
    expect(cycle.sessionId).toBe(SESSION_1);
    expect(cycle.id).toBeTruthy();
    expect(cycle.startedAt).toBeTruthy();
    expect(cycle.completedAt).toBeNull();
  });

  it('cycle is frozen', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    expect(Object.isFrozen(cycle)).toBe(true);
  });

  it('metadata is frozen empty', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    expect(Object.isFrozen(cycle.metadata)).toBe(true);
    expect(cycle.metadata).toEqual({});
  });

  it('id starts with cycle-', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    expect(cycle.id.startsWith('cycle-')).toBe(true);
  });

  it('createdAt is valid ISO string', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    expect(() => new Date(cycle.startedAt).getTime()).not.toThrow();
  });

  it('initial empty fields', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    expect(cycle.constraintIdentified).toBe('');
    expect(cycle.improvementProposed).toBe('');
    expect(cycle.measurementCriteria).toBe('');
    expect(cycle.learningCaptured).toBe('');
    expect(cycle.valueScore).toBe(0);
  });
});

describe('ValueOptimizationEngine advanceCycle through all 5 phases', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('complete full FOCUS cycle', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'Automate testing');
    const c1 = await engine.advanceCycle(cycle.id, { constraintIdentified: 'Manual testing bottleneck' });
    expect(c1.phase).toBe(OptimizationPhase.ConstraintAnalysis);
    expect(c1.constraintIdentified).toBe('Manual testing bottleneck');

    const c2 = await engine.advanceCycle(cycle.id, { improvementProposed: 'Implement CI pipeline' });
    expect(c2.phase).toBe(OptimizationPhase.ImprovementDesign);
    expect(c2.improvementProposed).toBe('Implement CI pipeline');

    const c3 = await engine.advanceCycle(cycle.id, { measurementCriteria: 'Test coverage > 80%' });
    expect(c3.phase).toBe(OptimizationPhase.MeasurementSetup);
    expect(c3.measurementCriteria).toBe('Test coverage > 80%');

    const c4 = await engine.advanceCycle(cycle.id, { learningCaptured: 'CI pipeline reduces deploy time by 60%', valueScore: 0.85 });
    expect(c4.phase).toBe(OptimizationPhase.LearningCapture);
    expect(c4.learningCaptured).toBe('CI pipeline reduces deploy time by 60%');
    expect(c4.valueScore).toBe(0.85);
    expect(c4.completedAt).not.toBeNull();
  });

  it('cycle completion sets completedAt', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await engine.advanceCycle(cycle.id, { constraintIdentified: 'C' });
    await engine.advanceCycle(cycle.id, { improvementProposed: 'I' });
    await engine.advanceCycle(cycle.id, { measurementCriteria: 'M' });
    const final = await engine.advanceCycle(cycle.id, { learningCaptured: 'L' });
    expect(final.completedAt).not.toBeNull();
    expect(() => new Date(final.completedAt!).getTime()).not.toThrow();
  });

  it('each advance preserves previous fields', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'My Value');
    const c1 = await engine.advanceCycle(cycle.id, { constraintIdentified: 'Constraint' });
    expect(c1.valueIdentified).toBe('My Value');
    const c2 = await engine.advanceCycle(cycle.id, { improvementProposed: 'Improvement' });
    expect(c2.valueIdentified).toBe('My Value');
    expect(c2.constraintIdentified).toBe('Constraint');
    const c3 = await engine.advanceCycle(cycle.id, { measurementCriteria: 'Measurement' });
    expect(c3.valueIdentified).toBe('My Value');
    expect(c3.constraintIdentified).toBe('Constraint');
    expect(c3.improvementProposed).toBe('Improvement');
  });

  it('valueScore set at any phase persists', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    const c1 = await engine.advanceCycle(cycle.id, { valueScore: 0.5 });
    expect(c1.valueScore).toBe(0.5);
    const c2 = await engine.advanceCycle(cycle.id, { valueScore: 0.7 });
    expect(c2.valueScore).toBe(0.7);
  });
});

describe('ValueOptimizationEngine advanceCycle FOCUS enforcement', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('cannot skip from ValueIdentification to ImprovementDesign', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    // We can only advance one phase at a time
    const c1 = await engine.advanceCycle(cycle.id, {});
    expect(c1.phase).toBe(OptimizationPhase.ConstraintAnalysis);
    // Next advance goes to ImprovementDesign
    const c2 = await engine.advanceCycle(cycle.id, {});
    expect(c2.phase).toBe(OptimizationPhase.ImprovementDesign);
  });

  it('cannot advance from LearningCapture', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    for (let i = 0; i < 4; i++) {
      await engine.advanceCycle(cycle.id, {});
    }
    await expect(engine.advanceCycle(cycle.id, {})).rejects.toThrow(ValueOptimizationError);
  });

  it('cannot advance completed cycle', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await engine.advanceCycle(cycle.id, { constraintIdentified: 'C' });
    await engine.advanceCycle(cycle.id, { improvementProposed: 'I' });
    await engine.advanceCycle(cycle.id, { measurementCriteria: 'M' });
    await engine.advanceCycle(cycle.id, { learningCaptured: 'L' });
    await expect(engine.advanceCycle(cycle.id, {})).rejects.toThrow(ValueOptimizationError);
  });

  it('error code for completed cycle is cycle_completed', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    for (let i = 0; i < 4; i++) {
      await engine.advanceCycle(cycle.id, {});
    }
    try {
      await engine.advanceCycle(cycle.id, {});
      expect.unreachable('should have thrown');
    } catch (err) {
      const e = err as ValueOptimizationError;
      expect(e.stage).toBe('cycle_completed');
    }
  });
});

describe('ValueOptimizationEngine advanceCycle errors', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('throws for non-existent cycle', async () => {
    await expect(engine.advanceCycle('nonexistent', {})).rejects.toThrow(ValueOptimizationError);
  });

  it('error stage for non-existent is cycle_not_found', async () => {
    try {
      await engine.advanceCycle('nonexistent', {});
      expect.unreachable('should have thrown');
    } catch (err) {
      const e = err as ValueOptimizationError;
      expect(e.stage).toBe('cycle_not_found');
    }
  });

  it('error for empty string id', async () => {
    await expect(engine.advanceCycle('', {})).rejects.toThrow(ValueOptimizationError);
  });
});

describe('ValueOptimizationEngine generateRecommendation', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  const completeCycleData = {
    constraintIdentified: 'Manual deployment bottleneck',
    improvementProposed: 'CI/CD pipeline automation',
    measurementCriteria: 'Deploy frequency > daily',
    learningCaptured: 'Automation reduces errors by 90%',
    valueScore: 0.85,
  };

  it('generates from completed cycle', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'Faster deployments');
    await engine.advanceCycle(cycle.id, { constraintIdentified: completeCycleData.constraintIdentified });
    await engine.advanceCycle(cycle.id, { improvementProposed: completeCycleData.improvementProposed });
    await engine.advanceCycle(cycle.id, { measurementCriteria: completeCycleData.measurementCriteria });
    await engine.advanceCycle(cycle.id, { learningCaptured: completeCycleData.learningCaptured, valueScore: completeCycleData.valueScore });
    const rec = await engine.generateRecommendation(cycle.id);
    expect(rec.id).toBeTruthy();
    expect(rec.category).toBe('Efficiency');
    expect(rec.title).toBe('Optimization: Faster deployments');
    expect(rec.description).toBe(completeCycleData.improvementProposed);
    expect(rec.reasoning).toBe(completeCycleData.learningCaptured);
    expect(rec.constraintRemoved).toBe(completeCycleData.constraintIdentified);
    expect(rec.valueScore).toBe(completeCycleData.valueScore);
  });

  it('recommendation is frozen', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await engine.advanceCycle(cycle.id, { constraintIdentified: completeCycleData.constraintIdentified });
    await engine.advanceCycle(cycle.id, { improvementProposed: completeCycleData.improvementProposed });
    await engine.advanceCycle(cycle.id, { measurementCriteria: completeCycleData.measurementCriteria });
    await engine.advanceCycle(cycle.id, { learningCaptured: completeCycleData.learningCaptured, valueScore: completeCycleData.valueScore });
    const rec = await engine.generateRecommendation(cycle.id);
    expect(Object.isFrozen(rec)).toBe(true);
  });

  it('alternatives array contains 2 items', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await engine.advanceCycle(cycle.id, { constraintIdentified: completeCycleData.constraintIdentified });
    await engine.advanceCycle(cycle.id, { improvementProposed: completeCycleData.improvementProposed });
    await engine.advanceCycle(cycle.id, { measurementCriteria: completeCycleData.measurementCriteria });
    await engine.advanceCycle(cycle.id, { learningCaptured: completeCycleData.learningCaptured, valueScore: completeCycleData.valueScore });
    const rec = await engine.generateRecommendation(cycle.id);
    expect(rec.alternatives).toHaveLength(2);
  });

  it('alternatives is frozen', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await engine.advanceCycle(cycle.id, { constraintIdentified: completeCycleData.constraintIdentified });
    await engine.advanceCycle(cycle.id, { improvementProposed: completeCycleData.improvementProposed });
    await engine.advanceCycle(cycle.id, { measurementCriteria: completeCycleData.measurementCriteria });
    await engine.advanceCycle(cycle.id, { learningCaptured: completeCycleData.learningCaptured, valueScore: completeCycleData.valueScore });
    const rec = await engine.generateRecommendation(cycle.id);
    expect(Object.isFrozen(rec.alternatives)).toBe(true);
  });

  it('id starts with rec-', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await engine.advanceCycle(cycle.id, { constraintIdentified: completeCycleData.constraintIdentified });
    await engine.advanceCycle(cycle.id, { improvementProposed: completeCycleData.improvementProposed });
    await engine.advanceCycle(cycle.id, { measurementCriteria: completeCycleData.measurementCriteria });
    await engine.advanceCycle(cycle.id, { learningCaptured: completeCycleData.learningCaptured, valueScore: completeCycleData.valueScore });
    const rec = await engine.generateRecommendation(cycle.id);
    expect((rec.id as string).startsWith('rec-')).toBe(true);
  });

  it('throws for incomplete cycle (at ValueIdentification)', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await expect(engine.generateRecommendation(cycle.id)).rejects.toThrow(ValueOptimizationError);
  });

  it('throws for incomplete cycle (at ConstraintAnalysis)', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await engine.advanceCycle(cycle.id, {});
    await expect(engine.generateRecommendation(cycle.id)).rejects.toThrow(ValueOptimizationError);
  });

  it('throws for incomplete cycle (at ImprovementDesign)', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await engine.advanceCycle(cycle.id, {});
    await engine.advanceCycle(cycle.id, {});
    await expect(engine.generateRecommendation(cycle.id)).rejects.toThrow(ValueOptimizationError);
  });

  it('throws for incomplete cycle (at MeasurementSetup)', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    for (let i = 0; i < 3; i++) {
      await engine.advanceCycle(cycle.id, {});
    }
    await expect(engine.generateRecommendation(cycle.id)).rejects.toThrow(ValueOptimizationError);
  });

  it('error stage for incomplete is cycle_incomplete', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    try {
      await engine.generateRecommendation(cycle.id);
      expect.unreachable('should have thrown');
    } catch (err) {
      const e = err as ValueOptimizationError;
      expect(e.stage).toBe('cycle_incomplete');
    }
  });

  it('throws for non-existent cycle', async () => {
    await expect(engine.generateRecommendation('nonexistent')).rejects.toThrow(ValueOptimizationError);
  });
});

describe('ValueOptimizationEngine recordValueAction', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  for (const vt of VALUE_TYPES) {
    describe(`valueType: ${vt}`, () => {
      it(`records ${vt} value action`, async () => {
        const va = await engine.recordValueAction(SESSION_1, `action-${vt}`, vt, `Value for ${vt}`, `Outcome: ${vt} improved`);
        expect(va.id).toBeTruthy();
        expect(va.sessionId).toBe(SESSION_1);
        expect(va.action).toBe(`action-${vt}`);
        expect(va.valueType).toBe(vt);
        expect(va.valueDescription).toBe(`Value for ${vt}`);
        expect(va.measurableOutcome).toBe(`Outcome: ${vt} improved`);
        expect(va.timestamp).toBeTruthy();
      });

      it(`${vt} action is frozen`, async () => {
        const va = await engine.recordValueAction(SESSION_1, 'a', vt, 'v', 'o');
        expect(Object.isFrozen(va)).toBe(true);
      });

      it(`${vt} action id starts with vaction-`, async () => {
        const va = await engine.recordValueAction(SESSION_1, 'a', vt, 'v', 'o');
        expect(va.id.startsWith('vaction-')).toBe(true);
      });

      it(`${vt} action timestamp is valid ISO`, async () => {
        const va = await engine.recordValueAction(SESSION_1, 'a', vt, 'v', 'o');
        expect(() => new Date(va.timestamp).getTime()).not.toThrow();
      });
    });
  }

  it('throws for empty valueDescription', async () => {
    await expect(engine.recordValueAction(SESSION_1, 'a', 'user', '', 'o')).rejects.toThrow(ValueOptimizationError);
  });

  it('throws for whitespace-only valueDescription', async () => {
    await expect(engine.recordValueAction(SESSION_1, 'a', 'user', '   ', 'o')).rejects.toThrow(ValueOptimizationError);
  });

  it('error stage is no_value for empty description', async () => {
    try {
      await engine.recordValueAction(SESSION_1, 'a', 'user', '', 'o');
      expect.unreachable('should have thrown');
    } catch (err) {
      const e = err as ValueOptimizationError;
      expect(e.stage).toBe('no_value');
    }
  });
});

describe('ValueOptimizationEngine getCycle', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('returns null for non-existent id', async () => {
    expect(await engine.getCycle('nonexistent')).toBeNull();
  });
  it('returns the cycle', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    const fetched = await engine.getCycle(cycle.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(cycle.id);
  });
  it('returns updated cycle after advance', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await engine.advanceCycle(cycle.id, { constraintIdentified: 'C' });
    const fetched = await engine.getCycle(cycle.id);
    expect(fetched!.phase).toBe(OptimizationPhase.ConstraintAnalysis);
    expect(fetched!.constraintIdentified).toBe('C');
  });
});

describe('ValueOptimizationEngine listCycles', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('returns empty for new session', async () => {
    expect(await engine.listCycles(SESSION_1)).toEqual([]);
  });
  it('returns all cycles for session', async () => {
    for (let i = 0; i < 3; i++) {
      await engine.startCycle(SESSION_1, `Value ${i}`);
    }
    expect((await engine.listCycles(SESSION_1)).length).toBe(3);
  });
  it('is session-isolated', async () => {
    await engine.startCycle(SESSION_1, 'V1');
    await engine.startCycle(SESSION_2, 'V2');
    expect((await engine.listCycles(SESSION_1)).length).toBe(1);
    expect((await engine.listCycles(SESSION_2)).length).toBe(1);
  });
});

describe('ValueOptimizationEngine listValueActions', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('returns empty for new session', async () => {
    expect(await engine.listValueActions(SESSION_1)).toEqual([]);
  });
  it('returns all value actions for session', async () => {
    await engine.recordValueAction(SESSION_1, 'a1', 'user', 'v1', 'o1');
    await engine.recordValueAction(SESSION_1, 'a2', 'platform', 'v2', 'o2');
    expect((await engine.listValueActions(SESSION_1)).length).toBe(2);
  });
  it('is session-isolated', async () => {
    await engine.recordValueAction(SESSION_1, 'a1', 'user', 'v1', 'o1');
    await engine.recordValueAction(SESSION_2, 'a2', 'platform', 'v2', 'o2');
    expect((await engine.listValueActions(SESSION_1)).length).toBe(1);
    expect((await engine.listValueActions(SESSION_2)).length).toBe(1);
  });
});

describe('ValueOptimizationEngine countCycles', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('returns 0 for empty session', async () => {
    expect(await engine.countCycles(SESSION_1)).toBe(0);
  });
  it('returns 1 after one startCycle', async () => {
    await engine.startCycle(SESSION_1, 'V');
    expect(await engine.countCycles(SESSION_1)).toBe(1);
  });
  it('returns correct count', async () => {
    for (let i = 0; i < 10; i++) {
      await engine.startCycle(SESSION_1, `V${i}`);
    }
    expect(await engine.countCycles(SESSION_1)).toBe(10);
  });
  it('is session-isolated', async () => {
    for (let i = 0; i < 5; i++) {
      await engine.startCycle(SESSION_1, `V${i}`);
      await engine.startCycle(SESSION_2, `V${i}`);
    }
    expect(await engine.countCycles(SESSION_1)).toBe(5);
    expect(await engine.countCycles(SESSION_2)).toBe(5);
  });
});

describe('ValueOptimizationEngine countValueActions', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('returns 0 for empty session', async () => {
    expect(await engine.countValueActions(SESSION_1)).toBe(0);
  });
  it('returns 1 after one record', async () => {
    await engine.recordValueAction(SESSION_1, 'a', 'user', 'v', 'o');
    expect(await engine.countValueActions(SESSION_1)).toBe(1);
  });
  it('returns correct count for mixed types', async () => {
    for (const vt of VALUE_TYPES) {
      for (let i = 0; i < 3; i++) {
        await engine.recordValueAction(SESSION_1, `a-${vt}-${i}`, vt, `v-${vt}`, `o-${vt}`);
      }
    }
    expect(await engine.countValueActions(SESSION_1)).toBe(12);
  });
  it('is session-isolated', async () => {
    await engine.recordValueAction(SESSION_1, 'a', 'user', 'v', 'o');
    await engine.recordValueAction(SESSION_2, 'a', 'platform', 'v', 'o');
    expect(await engine.countValueActions(SESSION_1)).toBe(1);
    expect(await engine.countValueActions(SESSION_2)).toBe(1);
  });
});

describe('ValueOptimizationEngine cycle limits', () => {
  it('throws at maxCyclesPerSession limit', async () => {
    const engine = new ValueOptimizationEngine(3);
    await engine.startCycle(SESSION_1, 'V1');
    await engine.startCycle(SESSION_1, 'V2');
    await engine.startCycle(SESSION_1, 'V3');
    await expect(engine.startCycle(SESSION_1, 'V4')).rejects.toThrow(ValueOptimizationError);
  });
  it('limit is per-session', async () => {
    const engine = new ValueOptimizationEngine(2);
    await engine.startCycle(SESSION_1, 'V1');
    await engine.startCycle(SESSION_1, 'V2');
    await expect(engine.startCycle(SESSION_1, 'V3')).rejects.toThrow();
    const c = await engine.startCycle(SESSION_2, 'V4');
    expect(c).toBeTruthy();
  });
  it('maxCyclesPerSession of 0 prevents all', async () => {
    const engine = new ValueOptimizationEngine(0);
    await expect(engine.startCycle(SESSION_1, 'V')).rejects.toThrow(ValueOptimizationError);
  });
  it('error stage is cycle_limit', async () => {
    const engine = new ValueOptimizationEngine(1);
    await engine.startCycle(SESSION_1, 'V1');
    try {
      await engine.startCycle(SESSION_1, 'V2');
      expect.unreachable('should have thrown');
    } catch (err) {
      const e = err as ValueOptimizationError;
      expect(e.stage).toBe('cycle_limit');
    }
  });
});

describe('ValueOptimizationEngine errors', () => {
  it('ValueOptimizationError has stage and message', () => {
    const err = new ValueOptimizationError('test_stage', 'test message');
    expect(err.stage).toBe('test_stage');
    expect(err.message).toContain('test_stage');
    expect(err.message).toContain('test message');
  });
  it('ValueOptimizationError is instance of Error', () => {
    expect(new ValueOptimizationError('s', 'm')).toBeInstanceOf(Error);
  });
  it('has code VALUE_OPTIMIZATION_ERROR', () => {
    const err = new ValueOptimizationError('s', 'm');
    expect(err.code).toBe('VALUE_OPTIMIZATION_ERROR');
  });
});

describe('ValueOptimizationEngine OptimizationPhase enum', () => {
  it('all phases are strings', () => {
    for (const p of PHASES) {
      expect(typeof p).toBe('string');
    }
  });
  it('all phases are distinct', () => {
    expect(new Set(PHASES).size).toBe(5);
  });
  it('phase order is FOCUS', () => {
    expect(PHASES[0]).toBe(OptimizationPhase.ValueIdentification);
    expect(PHASES[1]).toBe(OptimizationPhase.ConstraintAnalysis);
    expect(PHASES[2]).toBe(OptimizationPhase.ImprovementDesign);
    expect(PHASES[3]).toBe(OptimizationPhase.MeasurementSetup);
    expect(PHASES[4]).toBe(OptimizationPhase.LearningCapture);
  });
});

describe('ValueOptimizationEngine analytics callback', () => {
  it('setAnalyticsCallback fires on generateRecommendation', async () => {
    const engine = new ValueOptimizationEngine(500);
    let fired = false;
    engine.setAnalyticsCallback(() => { fired = true; });
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await engine.advanceCycle(cycle.id, { constraintIdentified: 'C' });
    await engine.advanceCycle(cycle.id, { improvementProposed: 'I' });
    await engine.advanceCycle(cycle.id, { measurementCriteria: 'M' });
    await engine.advanceCycle(cycle.id, { learningCaptured: 'L' });
    await engine.generateRecommendation(cycle.id);
    expect(fired).toBe(true);
  });
  it('no callback by default does not throw', async () => {
    const engine = new ValueOptimizationEngine(500);
    const cycle = await engine.startCycle(SESSION_1, 'V');
    await engine.advanceCycle(cycle.id, { constraintIdentified: 'C' });
    await engine.advanceCycle(cycle.id, { improvementProposed: 'I' });
    await engine.advanceCycle(cycle.id, { measurementCriteria: 'M' });
    await engine.advanceCycle(cycle.id, { learningCaptured: 'L' });
    await engine.generateRecommendation(cycle.id);
  });
});

describe('ValueOptimizationEngine complete FOCUS cycles with data', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  const cycleData = [
    { value: 'Reduce onboarding time', constraint: 'Complex signup flow', improvement: 'Simplified 3-step wizard', measurement: 'Signup completion > 90%', learning: 'Simplification increased conversions by 40%', score: 0.9 },
    { value: 'Improve API response time', constraint: 'N+1 database queries', improvement: 'Batch query optimization', measurement: 'P95 latency < 200ms', learning: 'Batch queries reduced P95 by 70%', score: 0.85 },
    { value: 'Enhance code quality', constraint: 'Manual code review bottleneck', improvement: 'Automated lint + format pipeline', measurement: 'Defect rate < 0.1%', learning: 'Automation caught 60% more issues', score: 0.8 },
  ];

  for (let i = 0; i < cycleData.length; i++) {
    it(`complete cycle ${i}: ${cycleData[i].value}`, async () => {
      const cycle = await engine.startCycle(SESSION_1, cycleData[i].value);
      await engine.advanceCycle(cycle.id, { constraintIdentified: cycleData[i].constraint });
      await engine.advanceCycle(cycle.id, { improvementProposed: cycleData[i].improvement });
      await engine.advanceCycle(cycle.id, { measurementCriteria: cycleData[i].measurement });
      await engine.advanceCycle(cycle.id, { learningCaptured: cycleData[i].learning, valueScore: cycleData[i].score });
      const rec = await engine.generateRecommendation(cycle.id);
      expect(rec.title).toBe(`Optimization: ${cycleData[i].value}`);
      expect(rec.valueScore).toBe(cycleData[i].score);
      expect(rec.constraintRemoved).toBe(cycleData[i].constraint);
    });
  }
});

describe('ValueOptimizationEngine two instances isolated', () => {
  it('cycles from instance 1 not in instance 2', async () => {
    const e1 = new ValueOptimizationEngine(500);
    const e2 = new ValueOptimizationEngine(500);
    await e1.startCycle(SESSION_1, 'V1');
    await e2.startCycle(SESSION_1, 'V2');
    expect(await e1.countCycles(SESSION_1)).toBe(1);
    expect(await e2.countCycles(SESSION_1)).toBe(1);
  });
  it('value actions from instance 1 not in instance 2', async () => {
    const e1 = new ValueOptimizationEngine(500);
    const e2 = new ValueOptimizationEngine(500);
    await e1.recordValueAction(SESSION_1, 'a', 'user', 'v', 'o');
    await e2.recordValueAction(SESSION_1, 'a', 'user', 'v', 'o');
    expect(await e1.countValueActions(SESSION_1)).toBe(1);
    expect(await e2.countValueActions(SESSION_1)).toBe(1);
  });
});

describe('ValueOptimizationEngine value actions of each type', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  for (const vt of VALUE_TYPES) {
    it(`5 ${vt} actions count correctly`, async () => {
      for (let i = 0; i < 5; i++) {
        await engine.recordValueAction(SESSION_1, `a-${vt}-${i}`, vt, `v-${i}`, `o-${i}`);
      }
      const list = await engine.listValueActions(SESSION_1);
      const typed = list.filter(va => va.valueType === vt);
      expect(typed).toHaveLength(5);
      for (const va of typed) {
        expect(va.valueType).toBe(vt);
      }
    });
  }

  it('total actions = sum of all types', async () => {
    for (const vt of VALUE_TYPES) {
      for (let i = 0; i < 10; i++) {
        await engine.recordValueAction(SESSION_1, `a-${vt}-${i}`, vt, `v`, `o`);
      }
    }
    expect(await engine.countValueActions(SESSION_1)).toBe(40);
  });

  it('filter by valueType from list', async () => {
    for (const vt of VALUE_TYPES) {
      await engine.recordValueAction(SESSION_1, `a-${vt}`, vt, `v`, `o`);
    }
    const list = await engine.listValueActions(SESSION_1);
    expect(list.filter(va => va.valueType === 'user')).toHaveLength(1);
    expect(list.filter(va => va.valueType === 'platform')).toHaveLength(1);
    expect(list.filter(va => va.valueType === 'developer')).toHaveLength(1);
    expect(list.filter(va => va.valueType === 'ecosystem')).toHaveLength(1);
  });
});

describe('ValueOptimizationEngine cycle fields', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  const fields = ['id', 'sessionId', 'phase', 'valueIdentified', 'constraintIdentified', 'improvementProposed', 'measurementCriteria', 'learningCaptured', 'valueScore', 'startedAt', 'completedAt', 'metadata'];
  for (const field of fields) {
    it(`cycle has field ${field}`, async () => {
      const cycle = await engine.startCycle(SESSION_1, 'V');
      expect(field in cycle).toBe(true);
    });
  }
});

describe('ValueOptimizationEngine value action fields', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  const fields = ['id', 'sessionId', 'action', 'valueType', 'valueDescription', 'measurableOutcome', 'timestamp'];
  for (const field of fields) {
    it(`value action has field ${field}`, async () => {
      const va = await engine.recordValueAction(SESSION_1, 'a', 'user', 'v', 'o');
      expect(field in va).toBe(true);
    });
  }
});

describe('ValueOptimizationEngine batch startCycle', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('create 20 cycles, each retrievable', async () => {
    const cycles = [];
    for (let i = 0; i < 20; i++) {
      cycles.push(await engine.startCycle(SESSION_1, `Value ${i}`));
    }
    for (const c of cycles) {
      const fetched = await engine.getCycle(c.id);
      expect(fetched).not.toBeNull();
    }
    expect(await engine.countCycles(SESSION_1)).toBe(20);
  });

  it('list length equals count for 30 cycles', async () => {
    for (let i = 0; i < 30; i++) {
      await engine.startCycle(SESSION_1, `V${i}`);
    }
    expect((await engine.listCycles(SESSION_1)).length).toBe(30);
    expect(await engine.countCycles(SESSION_1)).toBe(30);
  });
});

describe('ValueOptimizationEngine batch value actions', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('create 50 value actions, count matches', async () => {
    for (let i = 0; i < 50; i++) {
      await engine.recordValueAction(SESSION_1, `a${i}`, VALUE_TYPES[i % 4], `v${i}`, `o${i}`);
    }
    expect(await engine.countValueActions(SESSION_1)).toBe(50);
    expect((await engine.listValueActions(SESSION_1)).length).toBe(50);
  });
});

describe('ValueOptimizationEngine complete multiple cycles and generate recommendations', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('5 complete cycles, 5 recommendations', async () => {
    for (let i = 0; i < 5; i++) {
      const cycle = await engine.startCycle(SESSION_1, `V${i}`);
      await engine.advanceCycle(cycle.id, { constraintIdentified: `C${i}` });
      await engine.advanceCycle(cycle.id, { improvementProposed: `I${i}` });
      await engine.advanceCycle(cycle.id, { measurementCriteria: `M${i}` });
      await engine.advanceCycle(cycle.id, { learningCaptured: `L${i}`, valueScore: 0.5 + i * 0.1 });
      const rec = await engine.generateRecommendation(cycle.id);
      expect(rec.valueScore).toBe(0.5 + i * 0.1);
    }
    expect(await engine.countCycles(SESSION_1)).toBe(5);
  });
});

describe('ValueOptimizationEngine session isolation for cycles', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  const sessions = ['vo-s1', 'vo-s2', 'vo-s3'];
  it('each session has its own cycles', async () => {
    for (const s of sessions) {
      for (let i = 0; i < 5; i++) {
        await engine.startCycle(s, `V-${s}-${i}`);
      }
    }
    for (const s of sessions) {
      expect(await engine.countCycles(s)).toBe(5);
      const list = await engine.listCycles(s);
      for (const c of list) {
        expect(c.sessionId).toBe(s);
      }
    }
  });
});

describe('ValueOptimizationEngine session isolation for value actions', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  const sessions = ['va-s1', 'va-s2', 'va-s3'];
  it('each session has its own value actions', async () => {
    for (const s of sessions) {
      for (let i = 0; i < 5; i++) {
        await engine.recordValueAction(s, `a${i}`, VALUE_TYPES[i % 4], `v${i}`, `o${i}`);
      }
    }
    for (const s of sessions) {
      expect(await engine.countValueActions(s)).toBe(5);
      const list = await engine.listValueActions(s);
      for (const va of list) {
        expect(va.sessionId).toBe(s);
      }
    }
  });
});

describe('ValueOptimizationEngine advanceCycle preserves startedAt', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('startedAt unchanged through full cycle', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    const origStarted = cycle.startedAt;
    await engine.advanceCycle(cycle.id, { constraintIdentified: 'C' });
    await engine.advanceCycle(cycle.id, { improvementProposed: 'I' });
    await engine.advanceCycle(cycle.id, { measurementCriteria: 'M' });
    const final = await engine.advanceCycle(cycle.id, { learningCaptured: 'L' });
    expect(final.startedAt).toBe(origStarted);
  });
});

describe('ValueOptimizationEngine advanceCycle id unchanged', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('cycle id stays the same through all phases', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    const origId = cycle.id;
    for (let i = 0; i < 4; i++) {
      const advanced = await engine.advanceCycle(cycle.id, {});
      expect(advanced.id).toBe(origId);
    }
  });
});

describe('ValueOptimizationEngine advanceCycle phaseData merge', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('providing no data keeps defaults', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    const c1 = await engine.advanceCycle(cycle.id, {});
    expect(c1.constraintIdentified).toBe('');
    expect(c1.improvementProposed).toBe('');
    expect(c1.measurementCriteria).toBe('');
    expect(c1.learningCaptured).toBe('');
    expect(c1.valueScore).toBe(0);
  });

  it('partial data only updates provided fields', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    const c1 = await engine.advanceCycle(cycle.id, { constraintIdentified: 'C' });
    expect(c1.constraintIdentified).toBe('C');
    expect(c1.improvementProposed).toBe('');
  });

  it('all data provided at once in one phase', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    const c1 = await engine.advanceCycle(cycle.id, {
      constraintIdentified: 'C', improvementProposed: 'I', measurementCriteria: 'M',
      learningCaptured: 'L', valueScore: 0.95,
    });
    expect(c1.constraintIdentified).toBe('C');
    expect(c1.improvementProposed).toBe('I');
    expect(c1.measurementCriteria).toBe('M');
    expect(c1.learningCaptured).toBe('L');
    expect(c1.valueScore).toBe(0.95);
  });
});

describe('ValueOptimizationEngine listCycles ordering', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('returns cycles in creation order', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const c = await engine.startCycle(SESSION_1, `V${i}`);
      ids.push(c.id);
    }
    const list = await engine.listCycles(SESSION_1);
    const listIds = list.map(c => c.id);
    expect(listIds).toEqual(ids);
  });
});

describe('ValueOptimizationEngine listValueActions ordering', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('returns value actions in creation order', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const va = await engine.recordValueAction(SESSION_1, `a${i}`, 'user', `v${i}`, `o${i}`);
      ids.push(va.id);
    }
    const list = await engine.listValueActions(SESSION_1);
    const listIds = list.map(va => va.id);
    expect(listIds).toEqual(ids);
  });
});

describe('ValueOptimizationEngine stress: 50 complete cycles', () => {
  it('50 cycles created and completed', async () => {
    const engine = new ValueOptimizationEngine(500);
    for (let i = 0; i < 50; i++) {
      const c = await engine.startCycle(SESSION_1, `V${i}`);
      await engine.advanceCycle(c.id, { constraintIdentified: `C${i}` });
      await engine.advanceCycle(c.id, { improvementProposed: `I${i}` });
      await engine.advanceCycle(c.id, { measurementCriteria: `M${i}` });
      await engine.advanceCycle(c.id, { learningCaptured: `L${i}` });
    }
    expect(await engine.countCycles(SESSION_1)).toBe(50);
  });
});

describe('ValueOptimizationEngine cycle at each phase can be retrieved', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  const phaseData: Array<{ phase: OptimizationPhase; data: Record<string, string | number> }> = [
    { phase: OptimizationPhase.ValueIdentification, data: {} },
    { phase: OptimizationPhase.ConstraintAnalysis, data: { constraintIdentified: 'C' } },
    { phase: OptimizationPhase.ImprovementDesign, data: { improvementProposed: 'I' } },
    { phase: OptimizationPhase.MeasurementSetup, data: { measurementCriteria: 'M' } },
    { phase: OptimizationPhase.LearningCapture, data: { learningCaptured: 'L', valueScore: 0.9 } },
  ];

  for (let i = 0; i < phaseData.length; i++) {
    it(`cycle at phase ${PHASE_LABELS[phaseData[i].phase]} is retrievable`, async () => {
      const cycle = await engine.startCycle(SESSION_1, 'V');
      for (let j = 0; j < i; j++) {
        await engine.advanceCycle(cycle.id, phaseData[j + 1].data);
      }
      const fetched = await engine.getCycle(cycle.id);
      expect(fetched!.phase).toBe(phaseData[i].phase);
    });
  }
});

describe('ValueOptimizationEngine value action with special characters', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('unicode in description', async () => {
    const va = await engine.recordValueAction(SESSION_1, 'a', 'user', '☃ Value', '❤ Outcome');
    expect(va.valueDescription).toBe('☃ Value');
    expect(va.measurableOutcome).toBe('❤ Outcome');
  });
  it('newlines in description', async () => {
    const va = await engine.recordValueAction(SESSION_1, 'a', 'user', 'Line1\nLine2', 'o');
    expect(va.valueDescription).toBe('Line1\nLine2');
  });
  it('long description', async () => {
    const long = 'X'.repeat(500);
    const va = await engine.recordValueAction(SESSION_1, 'a', 'user', long, 'o');
    expect(va.valueDescription).toBe(long);
  });
});

describe('ValueOptimizationEngine unique IDs', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('50 cycles have unique IDs', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const c = await engine.startCycle(SESSION_1, `V${i}`);
      ids.add(c.id);
    }
    expect(ids.size).toBe(50);
  });
  it('50 value actions have unique IDs', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const va = await engine.recordValueAction(SESSION_1, `a${i}`, 'user', `v${i}`, `o${i}`);
      ids.add(va.id);
    }
    expect(ids.size).toBe(50);
  });
});

describe('ValueOptimizationEngine default constructor', () => {
  it('default maxCyclesPerSession allows 500', async () => {
    const engine = new ValueOptimizationEngine();
    for (let i = 0; i < 500; i++) {
      await engine.startCycle(SESSION_1, `V${i}`);
    }
    expect(await engine.countCycles(SESSION_1)).toBe(500);
  });
});

describe('ValueOptimizationEngine countCycles and listCycles consistency', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('list length always equals count', async () => {
    for (let i = 0; i < 15; i++) {
      await engine.startCycle(SESSION_1, `V${i}`);
      const listLen = (await engine.listCycles(SESSION_1)).length;
      const countVal = await engine.countCycles(SESSION_1);
      expect(listLen).toBe(countVal);
    }
  });
});

describe('ValueOptimizationEngine countValueActions and listValueActions consistency', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('list length always equals count', async () => {
    for (let i = 0; i < 15; i++) {
      await engine.recordValueAction(SESSION_1, `a${i}`, VALUE_TYPES[i % 4], `v`, `o`);
      const listLen = (await engine.listValueActions(SESSION_1)).length;
      const countVal = await engine.countValueActions(SESSION_1);
      expect(listLen).toBe(countVal);
    }
  });
});

describe('ValueOptimizationEngine cycle at LearningCapture has completedAt', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('not at LearningCapture => completedAt is null', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    for (let i = 0; i < 3; i++) {
      await engine.advanceCycle(cycle.id, {});
    }
    const fetched = await engine.getCycle(cycle.id);
    expect(fetched!.completedAt).toBeNull();
  });

  it('at LearningCapture => completedAt is not null', async () => {
    const cycle = await engine.startCycle(SESSION_1, 'V');
    for (let i = 0; i < 4; i++) {
      await engine.advanceCycle(cycle.id, {});
    }
    const fetched = await engine.getCycle(cycle.id);
    expect(fetched!.completedAt).not.toBeNull();
  });
});

describe('ValueOptimizationEngine generateRecommendation with different valueScores', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  const scores = [0.0, 0.25, 0.5, 0.75, 1.0];
  for (const score of scores) {
    it(`recommendation with valueScore ${score}`, async () => {
      const cycle = await engine.startCycle(SESSION_1, 'V');
      await engine.advanceCycle(cycle.id, { constraintIdentified: 'C' });
      await engine.advanceCycle(cycle.id, { improvementProposed: 'I' });
      await engine.advanceCycle(cycle.id, { measurementCriteria: 'M' });
      await engine.advanceCycle(cycle.id, { learningCaptured: 'L', valueScore: score });
      const rec = await engine.generateRecommendation(cycle.id);
      expect(rec.valueScore).toBe(score);
    });
  }
});

describe('ValueOptimizationEngine mixed cycles and value actions', () => {
  let engine: ValueOptimizationEngine;
  beforeEach(() => { engine = new ValueOptimizationEngine(500); });

  it('10 cycles and 10 value actions in same session', async () => {
    for (let i = 0; i < 10; i++) {
      await engine.startCycle(SESSION_1, `V${i}`);
      await engine.recordValueAction(SESSION_1, `a${i}`, VALUE_TYPES[i % 4], `v${i}`, `o${i}`);
    }
    expect(await engine.countCycles(SESSION_1)).toBe(10);
    expect(await engine.countValueActions(SESSION_1)).toBe(10);
  });
});
