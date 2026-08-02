import { describe, it, expect, beforeEach } from 'vitest';
import { ExplainabilityCenter } from '../../core/companion/explainability-center.js';
import { ExplainabilityLevel, RecommendationCategory } from '../../core/companion/types.js';
import { ExplainabilityRecordNotFoundError, ExplainabilityLimitExceededError } from '../../core/companion/errors.js';

const SESSION_1 = 'session-expl-1';
const SESSION_2 = 'session-expl-2';
const REC_ID_1 = 'rec-expl-001';
const REC_ID_2 = 'rec-expl-002';

const LEVELS = [
  ExplainabilityLevel.Full,
  ExplainabilityLevel.Standard,
  ExplainabilityLevel.Minimal,
];

const LEVEL_LABELS: Record<string, string> = {
  [ExplainabilityLevel.Full]: 'Full',
  [ExplainabilityLevel.Standard]: 'Standard',
  [ExplainabilityLevel.Minimal]: 'Minimal',
};

const CATEGORIES = [
  RecommendationCategory.Capability,
  RecommendationCategory.Workflow,
  RecommendationCategory.Goal,
  RecommendationCategory.Knowledge,
  RecommendationCategory.Efficiency,
];

const CAT_LABELS: Record<string, string> = {
  [RecommendationCategory.Capability]: 'Capability',
  [RecommendationCategory.Workflow]: 'Workflow',
  [RecommendationCategory.Goal]: 'Goal',
  [RecommendationCategory.Knowledge]: 'Knowledge',
  [RecommendationCategory.Efficiency]: 'Efficiency',
};

const FULL_INPUT = {
  sessionId: SESSION_1,
  recommendationId: REC_ID_1,
  level: ExplainabilityLevel.Full,
  why: 'Because it improves efficiency by 30%',
  whatValue: 'Reduces manual work and accelerates delivery',
  whatConstraintRemoved: 'Manual configuration bottleneck',
  whatAlternatives: ['Manual setup', 'Third-party tool', 'Custom script'],
  whyThisChoice: 'Best balance of cost, speed, and maintainability',
};

describe('ExplainabilityCenter record with each level', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  for (const level of LEVELS) {
    describe(`level ${LEVEL_LABELS[level]}`, () => {
      it(`records with ${LEVEL_LABELS[level]} level`, async () => {
        const rec = await ec.record({ ...FULL_INPUT, level });
        expect(rec.id).toBeTruthy();
        expect(rec.level).toBe(level);
        expect(rec.sessionId).toBe(SESSION_1);
        expect(rec.why).toBe(FULL_INPUT.why);
        expect(rec.whatValue).toBe(FULL_INPUT.whatValue);
        expect(rec.whatConstraintRemoved).toBe(FULL_INPUT.whatConstraintRemoved);
        expect(rec.whatAlternatives).toEqual(FULL_INPUT.whatAlternatives);
        expect(rec.whyThisChoice).toBe(FULL_INPUT.whyThisChoice);
        expect(rec.createdAt).toBeTruthy();
      });

      it(`${LEVEL_LABELS[level]} record is frozen`, async () => {
        const rec = await ec.record({ ...FULL_INPUT, level });
        expect(Object.isFrozen(rec)).toBe(true);
      });

      it(`${LEVEL_LABELS[level]} record metadata is frozen`, async () => {
        const rec = await ec.record({ ...FULL_INPUT, level });
        expect(Object.isFrozen(rec.metadata)).toBe(true);
      });

      it(`${LEVEL_LABELS[level]} whatAlternatives is frozen`, async () => {
        const rec = await ec.record({ ...FULL_INPUT, level });
        expect(Object.isFrozen(rec.whatAlternatives)).toBe(true);
      });

      it(`${LEVEL_LABELS[level]} id starts with expl-`, async () => {
        const rec = await ec.record({ ...FULL_INPUT, level });
        expect((rec.id as string).startsWith('expl-')).toBe(true);
      });

      it(`${LEVEL_LABELS[level]} retrievable by get`, async () => {
        const rec = await ec.record({ ...FULL_INPUT, level });
        const fetched = await ec.get(rec.id as string);
        expect(fetched).not.toBeNull();
        expect(fetched!.level).toBe(level);
      });

      it(`${LEVEL_LABELS[level]} appears in list`, async () => {
        await ec.record({ ...FULL_INPUT, level });
        const list = await ec.list(SESSION_1);
        expect(list).toHaveLength(1);
        expect(list[0].level).toBe(level);
      });

      it(`${LEVEL_LABELS[level]} removable by remove`, async () => {
        const rec = await ec.record({ ...FULL_INPUT, level });
        await ec.remove(rec.id as string);
        expect(await ec.get(rec.id as string)).toBeNull();
      });

      it(`${LEVEL_LABELS[level]} with no recommendationId uses 'none'`, async () => {
        const rec = await ec.record({ ...FULL_INPUT, level, recommendationId: undefined });
        expect(rec.recommendationId).toBe('none');
      });
    });
  }
});

describe('ExplainabilityCenter get', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('returns null for non-existent id', async () => {
    expect(await ec.get('nonexistent')).toBeNull();
  });
  it('returns null for empty string', async () => {
    expect(await ec.get('')).toBeNull();
  });
  it('returns exact recorded object', async () => {
    const rec = await ec.record(FULL_INPUT);
    const fetched = await ec.get(rec.id as string);
    expect(fetched).toEqual(rec);
  });
  it('returns different objects for different records', async () => {
    const r1 = await ec.record(FULL_INPUT);
    const r2 = await ec.record({ ...FULL_INPUT, why: 'Different why' });
    expect(r1.id).not.toBe(r2.id);
    expect((await ec.get(r1.id as string))!.why).toBe(FULL_INPUT.why);
    expect((await ec.get(r2.id as string))!.why).toBe('Different why');
  });
});

describe('ExplainabilityCenter list', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('returns empty array for new session', async () => {
    expect(await ec.list(SESSION_1)).toEqual([]);
  });
  it('returns all records for session', async () => {
    for (let i = 0; i < 3; i++) {
      await ec.record({ ...FULL_INPUT, why: `Why ${i}` });
    }
    expect((await ec.list(SESSION_1)).length).toBe(3);
  });
  it('is session-isolated', async () => {
    await ec.record(FULL_INPUT);
    await ec.record({ ...FULL_INPUT, sessionId: SESSION_2 });
    expect((await ec.list(SESSION_1)).length).toBe(1);
    expect((await ec.list(SESSION_2)).length).toBe(1);
  });
  it('returns new array each call', async () => {
    await ec.record(FULL_INPUT);
    const l1 = await ec.list(SESSION_1);
    const l2 = await ec.list(SESSION_1);
    expect(l1).not.toBe(l2);
  });
  it('list for non-existent session is empty', async () => {
    expect(await ec.list('no-session')).toEqual([]);
  });
});

describe('ExplainabilityCenter listByRecommendation', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('returns records for matching recommendationId', async () => {
    await ec.record(FULL_INPUT);
    const list = await ec.listByRecommendation(REC_ID_1);
    expect(list).toHaveLength(1);
    expect(list[0].recommendationId).toBe(REC_ID_1);
  });
  it('returns empty for non-matching recommendationId', async () => {
    await ec.record(FULL_INPUT);
    expect(await ec.listByRecommendation('other-rec-id')).toEqual([]);
  });
  it('returns all records for same recommendation', async () => {
    for (let i = 0; i < 5; i++) {
      await ec.record({ ...FULL_INPUT, why: `Why ${i}` });
    }
    const list = await ec.listByRecommendation(REC_ID_1);
    expect(list).toHaveLength(5);
  });
  it('separates different recommendationIds', async () => {
    await ec.record(FULL_INPUT);
    await ec.record({ ...FULL_INPUT, recommendationId: REC_ID_2 });
    expect((await ec.listByRecommendation(REC_ID_1)).length).toBe(1);
    expect((await ec.listByRecommendation(REC_ID_2)).length).toBe(1);
  });
  it('works across sessions', async () => {
    await ec.record(FULL_INPUT);
    await ec.record({ ...FULL_INPUT, sessionId: SESSION_2 });
    const list = await ec.listByRecommendation(REC_ID_1);
    expect(list).toHaveLength(2);
  });
});

describe('ExplainabilityCenter remove', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('throws ExplainabilityRecordNotFoundError for non-existent id', async () => {
    await expect(ec.remove('nonexistent')).rejects.toThrow(ExplainabilityRecordNotFoundError);
  });
  it('removes from get', async () => {
    const rec = await ec.record(FULL_INPUT);
    await ec.remove(rec.id as string);
    expect(await ec.get(rec.id as string)).toBeNull();
  });
  it('removes from list', async () => {
    const rec = await ec.record(FULL_INPUT);
    await ec.record({ ...FULL_INPUT, why: 'Why2' });
    await ec.remove(rec.id as string);
    expect((await ec.list(SESSION_1)).length).toBe(1);
  });
  it('removes from listByRecommendation', async () => {
    const rec = await ec.record(FULL_INPUT);
    await ec.remove(rec.id as string);
    expect(await ec.listByRecommendation(REC_ID_1)).toEqual([]);
  });
  it('decrements count', async () => {
    const rec = await ec.record(FULL_INPUT);
    await ec.record({ ...FULL_INPUT, why: 'Why2' });
    expect(await ec.count(SESSION_1)).toBe(2);
    await ec.remove(rec.id as string);
    expect(await ec.count(SESSION_1)).toBe(1);
  });
  it('throws on double remove', async () => {
    const rec = await ec.record(FULL_INPUT);
    await ec.remove(rec.id as string);
    await expect(ec.remove(rec.id as string)).rejects.toThrow(ExplainabilityRecordNotFoundError);
  });
  it('throws for empty string id', async () => {
    await expect(ec.remove('')).rejects.toThrow(ExplainabilityRecordNotFoundError);
  });
  it('does not affect other sessions', async () => {
    const r1 = await ec.record(FULL_INPUT);
    const r2 = await ec.record({ ...FULL_INPUT, sessionId: SESSION_2 });
    await ec.remove(r1.id as string);
    expect(await ec.get(r2.id as string)).not.toBeNull();
  });
});

describe('ExplainabilityCenter count', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('returns 0 for empty session', async () => {
    expect(await ec.count(SESSION_1)).toBe(0);
  });
  it('returns 1 after one record', async () => {
    await ec.record(FULL_INPUT);
    expect(await ec.count(SESSION_1)).toBe(1);
  });
  it('returns correct count after multiple records', async () => {
    for (let i = 0; i < 10; i++) {
      await ec.record({ ...FULL_INPUT, why: `Why ${i}` });
    }
    expect(await ec.count(SESSION_1)).toBe(10);
  });
  it('decrements after remove', async () => {
    const rec = await ec.record(FULL_INPUT);
    await ec.record({ ...FULL_INPUT, why: 'Why2' });
    await ec.remove(rec.id as string);
    expect(await ec.count(SESSION_1)).toBe(1);
  });
  it('is session-isolated', async () => {
    await ec.record(FULL_INPUT);
    await ec.record({ ...FULL_INPUT, sessionId: SESSION_2 });
    expect(await ec.count(SESSION_1)).toBe(1);
    expect(await ec.count(SESSION_2)).toBe(1);
  });
  it('returns 0 for non-existent session', async () => {
    expect(await ec.count('no-session')).toBe(0);
  });
});

describe('ExplainabilityCenter validation', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('complete input returns empty missing array', () => {
    const missing = ec.validate(FULL_INPUT);
    expect(missing).toEqual([]);
  });
  it('missing why', () => {
    const missing = ec.validate({ ...FULL_INPUT, why: '' });
    expect(missing).toContain('why');
  });
  it('missing whatValue', () => {
    const missing = ec.validate({ ...FULL_INPUT, whatValue: '' });
    expect(missing).toContain('whatValue');
  });
  it('missing whatConstraintRemoved', () => {
    const missing = ec.validate({ ...FULL_INPUT, whatConstraintRemoved: '' });
    expect(missing).toContain('whatConstraintRemoved');
  });
  it('missing whatAlternatives (empty array)', () => {
    const missing = ec.validate({ ...FULL_INPUT, whatAlternatives: [] });
    expect(missing).toContain('whatAlternatives');
  });
  it('missing whyThisChoice', () => {
    const missing = ec.validate({ ...FULL_INPUT, whyThisChoice: '' });
    expect(missing).toContain('whyThisChoice');
  });
  it('all fields missing returns 5 items', () => {
    const missing = ec.validate({});
    expect(missing).toHaveLength(5);
    expect(missing).toContain('why');
    expect(missing).toContain('whatValue');
    expect(missing).toContain('whatConstraintRemoved');
    expect(missing).toContain('whatAlternatives');
    expect(missing).toContain('whyThisChoice');
  });
  it('missing 3 fields returns 3 items', () => {
    const missing = ec.validate({
      why: 'because',
      whatAlternatives: ['alt1'],
    });
    expect(missing).toHaveLength(3);
  });
  it('missing 1 field returns 1 item', () => {
    const missing = ec.validate({
      why: 'b', whatValue: 'v', whatConstraintRemoved: 'c',
      whatAlternatives: ['a'], whyThisChoice: '',
    });
    expect(missing).toHaveLength(1);
    expect(missing).toContain('whyThisChoice');
  });
  it('result is frozen', () => {
    const missing = ec.validate(FULL_INPUT);
    expect(Object.isFrozen(missing)).toBe(true);
  });
  it('undefined whatAlternatives is missing', () => {
    const missing = ec.validate({ ...FULL_INPUT, whatAlternatives: undefined });
    expect(missing).toContain('whatAlternatives');
  });
});

describe('ExplainabilityCenter generateExplanation', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  const BASE_CONTEXT = {
    category: RecommendationCategory.Efficiency,
    title: 'Automate deployment',
    valueScore: 0.85,
    constraintIdentified: 'Manual deployment process',
    alternativesConsidered: ['Status quo', 'CI/CD pipeline'],
    reasoning: 'Automation reduces error rate and saves time',
  };

  it('generates a record with Full level for high valueScore', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    expect(rec.level).toBe(ExplainabilityLevel.Full);
  });
  it('generates Standard level for low valueScore', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, { ...BASE_CONTEXT, valueScore: 0.5 });
    expect(rec.level).toBe(ExplainabilityLevel.Standard);
  });
  it('boundary at 0.8 gives Full', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, { ...BASE_CONTEXT, valueScore: 0.8 });
    expect(rec.level).toBe(ExplainabilityLevel.Full);
  });
  it('boundary at 0.79 gives Standard', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, { ...BASE_CONTEXT, valueScore: 0.79 });
    expect(rec.level).toBe(ExplainabilityLevel.Standard);
  });
  it('why contains reasoning', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    expect(rec.why).toBe(BASE_CONTEXT.reasoning);
  });
  it('whatValue contains constraint and score', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    expect(rec.whatValue).toContain(BASE_CONTEXT.constraintIdentified);
    expect(rec.whatValue).toContain('0.85');
  });
  it('whatConstraintRemoved matches context', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    expect(rec.whatConstraintRemoved).toBe(BASE_CONTEXT.constraintIdentified);
  });
  it('whatAlternatives matches context', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    expect(rec.whatAlternatives).toEqual(BASE_CONTEXT.alternativesConsidered);
  });
  it('whyThisChoice contains alternatives count', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    expect(rec.whyThisChoice).toContain('3'); // 2 alternatives + 1 choice
  });
  it('recommendationId is stored', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    expect(rec.recommendationId).toBe(REC_ID_1);
  });
  it('sessionId is stored', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    expect(rec.sessionId).toBe(SESSION_1);
  });
  it('record is retrievable by get', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    const fetched = await ec.get(rec.id as string);
    expect(fetched).toEqual(rec);
  });
  it('record appears in list', async () => {
    await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    expect((await ec.list(SESSION_1)).length).toBe(1);
  });
  it('appears in listByRecommendation', async () => {
    await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    const list = await ec.listByRecommendation(REC_ID_1);
    expect(list).toHaveLength(1);
  });
  it('whatValue contains category', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, BASE_CONTEXT);
    expect(rec.whatValue).toContain(RecommendationCategory.Efficiency);
  });
});

describe('ExplainabilityCenter generateExplanation with each category', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  for (const cat of CATEGORIES) {
    it(`generates explanation for ${CAT_LABELS[cat]}`, async () => {
      const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, {
        category: cat, title: `Rec: ${cat}`, valueScore: 0.9,
        constraintIdentified: `Constraint for ${cat}`,
        alternativesConsidered: ['Alt1', 'Alt2'],
        reasoning: `Reasoning for ${cat}`,
      });
      expect(rec.why).toBe(`Reasoning for ${cat}`);
      expect(rec.whatValue).toContain(CAT_LABELS[cat]);
      expect(rec.whatConstraintRemoved).toBe(`Constraint for ${cat}`);
    });
  }
});

describe('ExplainabilityCenter limits', () => {
  it('throws ExplainabilityLimitExceededError at limit', async () => {
    const ec = new ExplainabilityCenter(3);
    for (let i = 0; i < 3; i++) {
      await ec.record({ ...FULL_INPUT, why: `Why ${i}` });
    }
    await expect(ec.record({ ...FULL_INPUT, why: 'Why 3' })).rejects.toThrow(ExplainabilityLimitExceededError);
  });
  it('error has correct limit and current', async () => {
    const ec = new ExplainabilityCenter(2);
    await ec.record(FULL_INPUT);
    await ec.record({ ...FULL_INPUT, why: 'Why2' });
    try {
      await ec.record({ ...FULL_INPUT, why: 'Why3' });
      expect.unreachable('should have thrown');
    } catch (err) {
      const e = err as ExplainabilityLimitExceededError;
      expect(e.limit).toBe(2);
      expect(e.current).toBe(2);
    }
  });
  it('limit is per-session', async () => {
    const ec = new ExplainabilityCenter(2);
    await ec.record(FULL_INPUT);
    await ec.record({ ...FULL_INPUT, why: 'Why2' });
    await expect(ec.record({ ...FULL_INPUT, why: 'Why3' })).rejects.toThrow();
    const rec = await ec.record({ ...FULL_INPUT, sessionId: SESSION_2, why: 'Other session' });
    expect(rec).toBeTruthy();
  });
  it('remove + recreate is allowed', async () => {
    const ec = new ExplainabilityCenter(2);
    const r = await ec.record(FULL_INPUT);
    await ec.record({ ...FULL_INPUT, why: 'Why2' });
    await ec.remove(r.id as string);
    const r3 = await ec.record({ ...FULL_INPUT, why: 'Why3' });
    expect(r3).toBeTruthy();
  });
  it('count unchanged after failed record', async () => {
    const ec = new ExplainabilityCenter(1);
    await ec.record(FULL_INPUT);
    try { await ec.record({ ...FULL_INPUT, why: 'Why2' }); } catch { /* expected */ }
    expect(await ec.count(SESSION_1)).toBe(1);
  });
  it('maxRecordsPerSession of 0 prevents all creates', async () => {
    const ec = new ExplainabilityCenter(0);
    await expect(ec.record(FULL_INPUT)).rejects.toThrow(ExplainabilityLimitExceededError);
  });
});

describe('ExplainabilityCenter errors', () => {
  it('ExplainabilityRecordNotFoundError has correct properties', () => {
    const err = new ExplainabilityRecordNotFoundError('test-id');
    expect(err.recordId).toBe('test-id');
    expect(err.code).toBe('EXPLAINABILITY_RECORD_NOT_FOUND');
    expect(err.message).toContain('test-id');
  });
  it('ExplainabilityLimitExceededError has correct properties', () => {
    const err = new ExplainabilityLimitExceededError(100, 100);
    expect(err.limit).toBe(100);
    expect(err.current).toBe(100);
    expect(err.code).toBe('EXPLAINABILITY_LIMIT');
  });
  it('ExplainabilityRecordNotFoundError is instance of Error', () => {
    expect(new ExplainabilityRecordNotFoundError('x')).toBeInstanceOf(Error);
  });
  it('ExplainabilityLimitExceededError is instance of Error', () => {
    expect(new ExplainabilityLimitExceededError(5, 5)).toBeInstanceOf(Error);
  });
});

describe('ExplainabilityCenter createdAt', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('createdAt is valid ISO string', async () => {
    const rec = await ec.record(FULL_INPUT);
    expect(() => new Date(rec.createdAt).getTime()).not.toThrow();
  });
  it('two records have close timestamps', async () => {
    const r1 = await ec.record(FULL_INPUT);
    const r2 = await ec.record({ ...FULL_INPUT, why: 'Why2' });
    const diff = Math.abs(new Date(r2.createdAt).getTime() - new Date(r1.createdAt).getTime());
    expect(diff).toBeLessThan(1000);
  });
});

describe('ExplainabilityCenter unique IDs', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('100 records have unique IDs', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const rec = await ec.record({ ...FULL_INPUT, why: `Why ${i}` });
      ids.add(rec.id as string);
    }
    expect(ids.size).toBe(100);
  });
  it('all IDs start with expl-', async () => {
    for (let i = 0; i < 20; i++) {
      const rec = await ec.record({ ...FULL_INPUT, why: `Why ${i}` });
      expect((rec.id as string).startsWith('expl-')).toBe(true);
    }
  });
});

describe('ExplainabilityCenter all fields present', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  const fields = ['id', 'sessionId', 'recommendationId', 'level', 'why', 'whatValue', 'whatConstraintRemoved', 'whatAlternatives', 'whyThisChoice', 'createdAt', 'metadata'];
  for (const field of fields) {
    it(`record has field ${field}`, async () => {
      const rec = await ec.record(FULL_INPUT);
      expect(field in rec).toBe(true);
    });
  }
});

describe('ExplainabilityCenter session isolation batch', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('5 sessions each with 10 records', async () => {
    const sessions = ['es-1', 'es-2', 'es-3', 'es-4', 'es-5'];
    for (const s of sessions) {
      for (let i = 0; i < 10; i++) {
        await ec.record({ ...FULL_INPUT, sessionId: s, why: `Why-${s}-${i}` });
      }
    }
    for (const s of sessions) {
      expect(await ec.count(s)).toBe(10);
      const list = await ec.list(s);
      for (const rec of list) {
        expect(rec.sessionId).toBe(s);
      }
    }
  });
});

describe('ExplainabilityCenter whatAlternatives handling', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('single alternative is stored', async () => {
    const rec = await ec.record({ ...FULL_INPUT, whatAlternatives: ['Only one'] });
    expect(rec.whatAlternatives).toEqual(['Only one']);
  });
  it('many alternatives are stored', async () => {
    const alts = ['Alt1', 'Alt2', 'Alt3', 'Alt4', 'Alt5', 'Alt6', 'Alt7', 'Alt8', 'Alt9', 'Alt10'];
    const rec = await ec.record({ ...FULL_INPUT, whatAlternatives: alts });
    expect(rec.whatAlternatives).toEqual(alts);
  });
  it('whatAlternatives is a copy', async () => {
    const alts = ['A', 'B'];
    const rec = await ec.record({ ...FULL_INPUT, whatAlternatives: alts });
    expect(rec.whatAlternatives).not.toBe(alts);
  });
});

describe('ExplainabilityCenter batch operations', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('create 20, verify each by get', async () => {
    const all = [];
    for (let i = 0; i < 20; i++) {
      all.push(await ec.record({ ...FULL_INPUT, why: `Why ${i}` }));
    }
    for (let i = 0; i < 20; i++) {
      const fetched = await ec.get(all[i].id as string);
      expect(fetched!.why).toBe(`Why ${i}`);
    }
  });
  it('create 10, remove every other, count is 5', async () => {
    const all = [];
    for (let i = 0; i < 10; i++) {
      all.push(await ec.record({ ...FULL_INPUT, why: `Why ${i}` }));
    }
    for (let i = 0; i < 10; i += 2) {
      await ec.remove(all[i].id as string);
    }
    expect(await ec.count(SESSION_1)).toBe(5);
  });
  it('list length equals count for 30 items', async () => {
    for (let i = 0; i < 30; i++) {
      await ec.record({ ...FULL_INPUT, why: `Why ${i}` });
    }
    expect((await ec.list(SESSION_1)).length).toBe(30);
    expect(await ec.count(SESSION_1)).toBe(30);
  });
});

describe('ExplainabilityCenter two instances isolated', () => {
  it('records from instance 1 not in instance 2', async () => {
    const ec1 = new ExplainabilityCenter(500);
    const ec2 = new ExplainabilityCenter(500);
    await ec1.record(FULL_INPUT);
    await ec2.record(FULL_INPUT);
    expect(await ec1.count(SESSION_1)).toBe(1);
    expect(await ec2.count(SESSION_1)).toBe(1);
  });
});

describe('ExplainabilityCenter remove nonexistent ids', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  const badIds = ['nonexistent', '', 'null', '12345', 'expl-fake'];
  for (const badId of badIds) {
    it(`remove throws for id: ${badId}`, async () => {
      await expect(ec.remove(badId)).rejects.toThrow(ExplainabilityRecordNotFoundError);
    });
  }
});

describe('ExplainabilityCenter count and remove consistency', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('count decreases by 1 after each remove', async () => {
    const all = [];
    for (let i = 0; i < 10; i++) {
      all.push(await ec.record({ ...FULL_INPUT, why: `Why ${i}` }));
    }
    for (let i = 0; i < 10; i++) {
      expect(await ec.count(SESSION_1)).toBe(10 - i);
      await ec.remove(all[i].id as string);
    }
    expect(await ec.count(SESSION_1)).toBe(0);
  });
});

describe('ExplainabilityCenter listByRecommendation after removes', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('remove one of 3 for same recommendation leaves 2', async () => {
    const all = [];
    for (let i = 0; i < 3; i++) {
      all.push(await ec.record({ ...FULL_INPUT, why: `Why ${i}` }));
    }
    await ec.remove(all[0].id as string);
    expect((await ec.listByRecommendation(REC_ID_1)).length).toBe(2);
  });
  it('remove all leaves 0', async () => {
    const all = [];
    for (let i = 0; i < 3; i++) {
      all.push(await ec.record({ ...FULL_INPUT, why: `Why ${i}` }));
    }
    for (const r of all) {
      await ec.remove(r.id as string);
    }
    expect((await ec.listByRecommendation(REC_ID_1)).length).toBe(0);
  });
});

describe('ExplainabilityCenter generateExplanation count and list', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('5 generated explanations count as 5', async () => {
    const ctx = {
      category: RecommendationCategory.Efficiency, title: 'T', valueScore: 0.9,
      constraintIdentified: 'C', alternativesConsidered: ['A'], reasoning: 'R',
    };
    for (let i = 0; i < 5; i++) {
      await ec.generateExplanation(SESSION_1, REC_ID_1, { ...ctx, constraintIdentified: `C${i}` });
    }
    expect(await ec.count(SESSION_1)).toBe(5);
  });
});

describe('ExplainabilityCenter generateExplanation with each level via valueScore', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('valueScore 0.9 gives Full', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, {
      category: RecommendationCategory.Efficiency, title: 'T', valueScore: 0.9,
      constraintIdentified: 'C', alternativesConsidered: ['A'], reasoning: 'R',
    });
    expect(rec.level).toBe(ExplainabilityLevel.Full);
  });
  it('valueScore 0.5 gives Standard', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, {
      category: RecommendationCategory.Efficiency, title: 'T', valueScore: 0.5,
      constraintIdentified: 'C', alternativesConsidered: ['A'], reasoning: 'R',
    });
    expect(rec.level).toBe(ExplainabilityLevel.Standard);
  });
  it('valueScore 0.0 gives Standard', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, {
      category: RecommendationCategory.Efficiency, title: 'T', valueScore: 0.0,
      constraintIdentified: 'C', alternativesConsidered: ['A'], reasoning: 'R',
    });
    expect(rec.level).toBe(ExplainabilityLevel.Standard);
  });
  it('valueScore 1.0 gives Full', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, {
      category: RecommendationCategory.Efficiency, title: 'T', valueScore: 1.0,
      constraintIdentified: 'C', alternativesConsidered: ['A'], reasoning: 'R',
    });
    expect(rec.level).toBe(ExplainabilityLevel.Full);
  });
});

describe('ExplainabilityCenter ExplainabilityLevel enum', () => {
  it('all levels are strings', () => {
    for (const l of LEVELS) {
      expect(typeof l).toBe('string');
    }
  });
  it('all levels are distinct', () => {
    expect(new Set(LEVELS).size).toBe(3);
  });
});

describe('ExplainabilityCenter RecommendationCategory enum', () => {
  it('all categories are strings', () => {
    for (const c of CATEGORIES) {
      expect(typeof c).toBe('string');
    }
  });
  it('all categories are distinct', () => {
    expect(new Set(CATEGORIES).size).toBe(5);
  });
});

describe('ExplainabilityCenter stress create 50', () => {
  it('creates 50 records and all retrievable', async () => {
    const ec = new ExplainabilityCenter(500);
    const all = [];
    for (let i = 0; i < 50; i++) {
      all.push(await ec.record({ ...FULL_INPUT, why: `Stress ${i}`, level: LEVELS[i % 3] }));
    }
    expect(all.length).toBe(50);
    expect(await ec.count(SESSION_1)).toBe(50);
    for (const rec of all) {
      expect(await ec.get(rec.id as string)).not.toBeNull();
    }
  });
});

describe('ExplainabilityCenter validation edge cases', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('undefined why is missing', () => {
    const missing = ec.validate({ ...FULL_INPUT, why: undefined });
    expect(missing).toContain('why');
  });
  it('null why is missing', () => {
    const missing = ec.validate({ ...FULL_INPUT, why: null as unknown as string });
    expect(missing).toContain('why');
  });
  it('whitespace-only why is accepted by validate (only checks falsy)', () => {
    const missing = ec.validate({ ...FULL_INPUT, why: '   ' });
    expect(missing).not.toContain('why');
  });
  it('non-empty why is not missing', () => {
    const missing = ec.validate({ ...FULL_INPUT, why: '  some reason  ' });
    expect(missing).not.toContain('why');
  });
});

describe('ExplainabilityCenter create remove recreate cycle', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('15 cycles of record-remove leaves 0', async () => {
    for (let i = 0; i < 15; i++) {
      const rec = await ec.record({ ...FULL_INPUT, why: `Cycle ${i}` });
      await ec.remove(rec.id as string);
    }
    expect(await ec.count(SESSION_1)).toBe(0);
  });
});

describe('ExplainabilityCenter list ordering', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('list returns in creation order', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const rec = await ec.record({ ...FULL_INPUT, why: `Order ${i}` });
      ids.push(rec.id as string);
    }
    const list = await ec.list(SESSION_1);
    const listIds = list.map(r => r.id as string);
    expect(listIds).toEqual(ids);
  });
});

describe('ExplainabilityCenter default constructor', () => {
  it('default maxRecordsPerSession allows 500', async () => {
    const ec = new ExplainabilityCenter();
    for (let i = 0; i < 500; i++) {
      await ec.record({ ...FULL_INPUT, why: `Why ${i}` });
    }
    expect(await ec.count(SESSION_1)).toBe(500);
  });
});

describe('ExplainabilityCenter with each recommendationId', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  const recIds = ['rec-a', 'rec-b', 'rec-c', 'rec-d', 'rec-e'];
  for (const rid of recIds) {
    it(`listByRecommendation works for ${rid}`, async () => {
      await ec.record({ ...FULL_INPUT, recommendationId: rid });
      const list = await ec.listByRecommendation(rid);
      expect(list).toHaveLength(1);
      expect(list[0].recommendationId).toBe(rid);
    });
  }
});

describe('ExplainabilityCenter whyThisChoice content from generateExplanation', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('contains value score', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, {
      category: RecommendationCategory.Efficiency, title: 'T', valueScore: 0.75,
      constraintIdentified: 'C', alternativesConsidered: ['A1', 'A2', 'A3'], reasoning: 'R',
    });
    expect(rec.whyThisChoice).toContain('0.75');
  });
  it('contains alternatives count + 1', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, {
      category: RecommendationCategory.Efficiency, title: 'T', valueScore: 0.75,
      constraintIdentified: 'C', alternativesConsidered: ['A1', 'A2', 'A3', 'A4'], reasoning: 'R',
    });
    expect(rec.whyThisChoice).toContain('5');
  });
});

describe('ExplainabilityCenter mixed record and generateExplanation', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('direct record and generateExplanation both count', async () => {
    await ec.record(FULL_INPUT);
    await ec.generateExplanation(SESSION_1, REC_ID_1, {
      category: RecommendationCategory.Efficiency, title: 'T', valueScore: 0.9,
      constraintIdentified: 'C', alternativesConsidered: ['A'], reasoning: 'R',
    });
    expect(await ec.count(SESSION_1)).toBe(2);
  });
  it('both appear in list', async () => {
    await ec.record(FULL_INPUT);
    await ec.generateExplanation(SESSION_1, REC_ID_1, {
      category: RecommendationCategory.Efficiency, title: 'T', valueScore: 0.9,
      constraintIdentified: 'C', alternativesConsidered: ['A'], reasoning: 'R',
    });
    expect((await ec.list(SESSION_1)).length).toBe(2);
  });
});

describe('ExplainabilityCenter remove all then get each returns null', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('remove all 5, get each returns null', async () => {
    const all = [];
    for (let i = 0; i < 5; i++) {
      all.push(await ec.record({ ...FULL_INPUT, why: `Why ${i}` }));
    }
    for (const r of all) {
      await ec.remove(r.id as string);
    }
    for (const r of all) {
      expect(await ec.get(r.id as string)).toBeNull();
    }
  });
});

describe('ExplainabilityCenter sessionId variations', () => {
  const variants = [
    { label: 'uuid', gen: () => crypto.randomUUID() },
    { label: 'numeric', gen: () => '12345' },
    { label: 'short', gen: () => 's1' },
    { label: 'long', gen: () => 'a'.repeat(200) },
  ];
  for (const v of variants) {
    it(`handles ${v.label} sessionId`, async () => {
      const ec = new ExplainabilityCenter(500);
      const sid = v.gen();
      const rec = await ec.record({ ...FULL_INPUT, sessionId: sid });
      expect(rec.sessionId).toBe(sid);
      expect((await ec.list(sid)).length).toBe(1);
    });
  }
});

describe('ExplainabilityCenter get returns consistent data across calls', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('get twice returns same values', async () => {
    const rec = await ec.record(FULL_INPUT);
    const f1 = await ec.get(rec.id as string);
    const f2 = await ec.get(rec.id as string);
    expect(f1!.id).toBe(f2!.id);
    expect(f1!.why).toBe(f2!.why);
    expect(f1!.level).toBe(f2!.level);
  });
  it('get after list returns same data', async () => {
    const rec = await ec.record(FULL_INPUT);
    const list = await ec.list(SESSION_1);
    const fetched = await ec.get(rec.id as string);
    expect(list[0].id).toBe(fetched!.id);
    expect(list[0].why).toBe(fetched!.why);
  });
});

describe('ExplainabilityCenter whatValue content from generateExplanation with each category', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  for (const cat of CATEGORIES) {
    it(`whatValue contains ${CAT_LABELS[cat]}`, async () => {
      const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, {
        category: cat, title: 'T', valueScore: 0.9,
        constraintIdentified: 'Constraint', alternativesConsidered: ['A'], reasoning: 'R',
      });
      expect(rec.whatValue).toContain(CAT_LABELS[cat]);
    });
  }
});

describe('ExplainabilityCenter listByRecommendation empty string', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('returns empty for non-matching empty string', async () => {
    await ec.record(FULL_INPUT);
    expect(await ec.listByRecommendation('')).toEqual([]);
  });
});

describe('ExplainabilityCenter generateExplanation with empty alternatives', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('empty alternatives works', async () => {
    const rec = await ec.generateExplanation(SESSION_1, REC_ID_1, {
      category: RecommendationCategory.Efficiency, title: 'T', valueScore: 0.9,
      constraintIdentified: 'C', alternativesConsidered: [], reasoning: 'R',
    });
    expect(rec.whatAlternatives).toEqual([]);
    expect(rec.whyThisChoice).toContain('1');
  });
});

describe('ExplainabilityCenter list count equals remove count', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('list length always equals count', async () => {
    const all = [];
    for (let i = 0; i < 20; i++) {
      all.push(await ec.record({ ...FULL_INPUT, why: `Why ${i}` }));
    }
    for (let i = 0; i < 20; i++) {
      const listLen = (await ec.list(SESSION_1)).length;
      const countVal = await ec.count(SESSION_1);
      expect(listLen).toBe(countVal);
      if (i < 20) await ec.remove(all[i].id as string);
    }
  });
});
