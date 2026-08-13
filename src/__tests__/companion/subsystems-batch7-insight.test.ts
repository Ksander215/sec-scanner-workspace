import { describe, it, expect, beforeEach } from 'vitest';
import { InsightEngine } from '../../core/companion/insight-engine.js';
import { InsightType, DefaultInsightEngineConfig } from '../../core/companion/types.js';
import { InsightNotFoundError, InsightLimitExceededError } from '../../core/companion/errors.js';

const SESSION_1 = 'session-insight-1';
const SESSION_2 = 'session-insight-2';
const USER_1 = 'user-ins-1';
const USER_2 = 'user-ins-2';

const INSIGHT_TYPES = [
  InsightType.Pattern,
  InsightType.Opportunity,
  InsightType.Risk,
  InsightType.Suggestion,
  InsightType.Correlation,
];

const TYPE_LABELS: Record<string, string> = {
  [InsightType.Pattern]: 'Pattern',
  [InsightType.Opportunity]: 'Opportunity',
  [InsightType.Risk]: 'Risk',
  [InsightType.Suggestion]: 'Suggestion',
  [InsightType.Correlation]: 'Correlation',
};

describe('InsightEngine generate with each InsightType', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  for (const type of INSIGHT_TYPES) {
    describe(`InsightType.${TYPE_LABELS[type]}`, () => {
      it(`generates insight with ${TYPE_LABELS[type]} type`, async () => {
        const insight = await engine.generate(SESSION_1, USER_1, type, `Title ${type}`, `Desc ${type}`);
        expect(insight.id).toBeTruthy();
        expect(insight.sessionId).toBe(SESSION_1);
        expect(insight.userId).toBe(USER_1);
        expect(insight.type).toBe(type);
        expect(insight.title).toBe(`Title ${type}`);
        expect(insight.description).toBe(`Desc ${type}`);
        expect(insight.confidence).toBe(DefaultInsightEngineConfig.minConfidence);
        expect(insight.createdAt).toBeTruthy();
      });

      it(`${TYPE_LABELS[type]} insight is frozen`, async () => {
        const insight = await engine.generate(SESSION_1, USER_1, type, 'T', 'D');
        expect(Object.isFrozen(insight)).toBe(true);
      });

      it(`${TYPE_LABELS[type]} insight has id starting with insight-`, async () => {
        const insight = await engine.generate(SESSION_1, USER_1, type, 'T', 'D');
        expect((insight.id as string).startsWith('insight-')).toBe(true);
      });

      it(`${TYPE_LABELS[type]} insight metadata is frozen empty`, async () => {
        const insight = await engine.generate(SESSION_1, USER_1, type, 'T', 'D');
        expect(Object.isFrozen(insight.metadata)).toBe(true);
        expect(insight.metadata).toEqual({});
      });

      it(`${TYPE_LABELS[type]} appears in listByType`, async () => {
        await engine.generate(SESSION_1, USER_1, type, 'T', 'D');
        const list = await engine.listByType(SESSION_1, type);
        expect(list).toHaveLength(1);
        expect(list[0].type).toBe(type);
      });

      it(`${TYPE_LABELS[type]} does not appear in listByType for other types`, async () => {
        const otherTypes = INSIGHT_TYPES.filter(t => t !== type);
        await engine.generate(SESSION_1, USER_1, type, 'T', 'D');
        for (const ot of otherTypes) {
          const list = await engine.listByType(SESSION_1, ot);
          expect(list).toHaveLength(0);
        }
      });

      it(`generate 5 of type ${TYPE_LABELS[type]} and listByType returns 5`, async () => {
        for (let i = 0; i < 5; i++) {
          await engine.generate(SESSION_1, USER_1, type, `T${i}`, `D${i}`);
        }
        const list = await engine.listByType(SESSION_1, type);
        expect(list).toHaveLength(5);
      });

      it(`${TYPE_LABELS[type]} insight retrievable by get`, async () => {
        const created = await engine.generate(SESSION_1, USER_1, type, 'GetTest', 'D');
        const fetched = await engine.get(created.id as string);
        expect(fetched).not.toBeNull();
        expect(fetched!.type).toBe(type);
        expect(fetched!.title).toBe('GetTest');
      });

      it(`${TYPE_LABELS[type]} insight removable by remove`, async () => {
        const created = await engine.generate(SESSION_1, USER_1, type, 'RemoveTest', 'D');
        await engine.remove(created.id as string);
        const fetched = await engine.get(created.id as string);
        expect(fetched).toBeNull();
      });
    });
  }
});

describe('InsightEngine get', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('returns null for non-existent id', async () => {
    expect(await engine.get('nonexistent')).toBeNull();
  });
  it('returns null for empty string id', async () => {
    expect(await engine.get('')).toBeNull();
  });
  it('returns the exact created insight', async () => {
    const created = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'Exact', 'Match');
    const fetched = await engine.get(created.id as string);
    expect(fetched).toEqual(created);
  });
  it('returns different objects for different ids', async () => {
    const i1 = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T1', 'D1');
    const i2 = await engine.generate(SESSION_1, USER_1, InsightType.Risk, 'T2', 'D2');
    expect(i1.id).not.toBe(i2.id);
    expect((await engine.get(i1.id as string))!.type).toBe(InsightType.Pattern);
    expect((await engine.get(i2.id as string))!.type).toBe(InsightType.Risk);
  });
});

describe('InsightEngine list', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('returns empty array for new session', async () => {
    expect(await engine.list(SESSION_1)).toEqual([]);
  });
  it('returns all insights for the session', async () => {
    for (let i = 0; i < 5; i++) {
      await engine.generate(SESSION_1, USER_1, INSIGHT_TYPES[i], `T${i}`, `D${i}`);
    }
    expect((await engine.list(SESSION_1)).length).toBe(5);
  });
  it('is session-isolated', async () => {
    await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'S1', 'D');
    await engine.generate(SESSION_2, USER_2, InsightType.Risk, 'S2', 'D');
    expect((await engine.list(SESSION_1)).length).toBe(1);
    expect((await engine.list(SESSION_2)).length).toBe(1);
    expect((await engine.list(SESSION_1))[0].title).toBe('S1');
    expect((await engine.list(SESSION_2))[0].title).toBe('S2');
  });
  it('returns new array each call', async () => {
    await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    const l1 = await engine.list(SESSION_1);
    const l2 = await engine.list(SESSION_1);
    expect(l1).not.toBe(l2);
  });
  it('list for non-existent session is empty', async () => {
    expect(await engine.list('no-such-session')).toEqual([]);
  });
});

describe('InsightEngine listByType', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('returns empty for type with no insights', async () => {
    await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    expect(await engine.listByType(SESSION_1, InsightType.Risk)).toEqual([]);
  });
  it('returns only matching type', async () => {
    for (let i = 0; i < 3; i++) {
      await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `P${i}`, 'D');
    }
    for (let i = 0; i < 2; i++) {
      await engine.generate(SESSION_1, USER_1, InsightType.Risk, `R${i}`, 'D');
    }
    const patterns = await engine.listByType(SESSION_1, InsightType.Pattern);
    const risks = await engine.listByType(SESSION_1, InsightType.Risk);
    expect(patterns).toHaveLength(3);
    expect(risks).toHaveLength(2);
  });
  it('is session-isolated', async () => {
    await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'S1', 'D');
    await engine.generate(SESSION_2, USER_2, InsightType.Pattern, 'S2', 'D');
    expect((await engine.listByType(SESSION_1, InsightType.Pattern))).toHaveLength(1);
    expect((await engine.listByType(SESSION_2, InsightType.Pattern))).toHaveLength(1);
  });
  for (const type of INSIGHT_TYPES) {
    it(`listByType works for ${TYPE_LABELS[type]}`, async () => {
      await engine.generate(SESSION_1, USER_1, type, 'T', 'D');
      const list = await engine.listByType(SESSION_1, type);
      expect(list).toHaveLength(1);
      expect(list[0].type).toBe(type);
    });
  }
});

describe('InsightEngine remove', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('throws InsightNotFoundError for non-existent id', async () => {
    await expect(engine.remove('nonexistent')).rejects.toThrow(InsightNotFoundError);
  });
  it('removes from get', async () => {
    const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    await engine.remove(i.id as string);
    expect(await engine.get(i.id as string)).toBeNull();
  });
  it('removes from list', async () => {
    const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    await engine.generate(SESSION_1, USER_1, InsightType.Risk, 'T2', 'D');
    await engine.remove(i.id as string);
    expect((await engine.list(SESSION_1)).length).toBe(1);
  });
  it('removes from listByType', async () => {
    const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    await engine.remove(i.id as string);
    expect(await engine.listByType(SESSION_1, InsightType.Pattern)).toEqual([]);
  });
  it('decrements count', async () => {
    const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    await engine.generate(SESSION_1, USER_1, InsightType.Risk, 'T2', 'D');
    expect(await engine.count(SESSION_1)).toBe(2);
    await engine.remove(i.id as string);
    expect(await engine.count(SESSION_1)).toBe(1);
  });
  it('throws on double remove', async () => {
    const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    await engine.remove(i.id as string);
    await expect(engine.remove(i.id as string)).rejects.toThrow(InsightNotFoundError);
  });
  it('does not affect other sessions', async () => {
    const i1 = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'S1', 'D');
    const i2 = await engine.generate(SESSION_2, USER_2, InsightType.Risk, 'S2', 'D');
    await engine.remove(i1.id as string);
    expect(await engine.get(i2.id as string)).not.toBeNull();
    expect(await engine.count(SESSION_2)).toBe(1);
  });
  it('throws for empty string id', async () => {
    await expect(engine.remove('')).rejects.toThrow(InsightNotFoundError);
  });
});

describe('InsightEngine count', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('returns 0 for empty session', async () => {
    expect(await engine.count(SESSION_1)).toBe(0);
  });
  it('returns 1 after one generate', async () => {
    await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    expect(await engine.count(SESSION_1)).toBe(1);
  });
  it('returns correct count after multiple generates', async () => {
    for (let i = 0; i < 15; i++) {
      await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `T${i}`, 'D');
    }
    expect(await engine.count(SESSION_1)).toBe(15);
  });
  it('decrements after remove', async () => {
    const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    await engine.generate(SESSION_1, USER_1, InsightType.Risk, 'T2', 'D');
    await engine.generate(SESSION_1, USER_1, InsightType.Suggestion, 'T3', 'D');
    await engine.remove(i.id as string);
    expect(await engine.count(SESSION_1)).toBe(2);
  });
  it('is session-isolated', async () => {
    for (let i = 0; i < 5; i++) {
      await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `T${i}`, 'D');
      await engine.generate(SESSION_2, USER_2, InsightType.Risk, `T${i}`, 'D');
    }
    expect(await engine.count(SESSION_1)).toBe(5);
    expect(await engine.count(SESSION_2)).toBe(5);
  });
  it('returns 0 for non-existent session', async () => {
    expect(await engine.count('no-session')).toBe(0);
  });
});

describe('InsightEngine confidence', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('default confidence is minConfidence from config', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    expect(insight.confidence).toBe(DefaultInsightEngineConfig.minConfidence);
  });
  it('explicit high confidence is used', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', 0.95);
    expect(insight.confidence).toBe(0.95);
  });
  it('explicit low confidence is used', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', 0.1);
    expect(insight.confidence).toBe(0.1);
  });
  it('confidence of 0 is accepted', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', 0);
    expect(insight.confidence).toBe(0);
  });
  it('confidence of 1 is accepted', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', 1);
    expect(insight.confidence).toBe(1);
  });
  it('confidence 0.5 uses default minConfidence when not specified', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    expect(insight.confidence).toBe(0.5);
  });
});

describe('InsightEngine actionable flag', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('confidence >= 0.7 is actionable', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', 0.7);
    expect(insight.actionable).toBe(true);
  });
  it('confidence 0.8 is actionable', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', 0.8);
    expect(insight.actionable).toBe(true);
  });
  it('confidence 1.0 is actionable', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', 1.0);
    expect(insight.actionable).toBe(true);
  });
  it('confidence < 0.7 is not actionable', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', 0.69);
    expect(insight.actionable).toBe(false);
  });
  it('confidence 0.5 is not actionable', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', 0.5);
    expect(insight.actionable).toBe(false);
  });
  it('confidence 0 is not actionable', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', 0);
    expect(insight.actionable).toBe(false);
  });
  it('confidence 0.699 is not actionable', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', 0.699);
    expect(insight.actionable).toBe(false);
  });
  it('default confidence 0.5 is not actionable', async () => {
    const insight = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    expect(insight.actionable).toBe(false);
  });
});

describe('InsightEngine limits', () => {
  it('throws InsightLimitExceededError at limit', async () => {
    const limitEngine = new InsightEngine({ maxInsightsPerSession: 3, minConfidence: 0.5 });
    await limitEngine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T1', 'D1');
    await limitEngine.generate(SESSION_1, USER_1, InsightType.Risk, 'T2', 'D2');
    await limitEngine.generate(SESSION_1, USER_1, InsightType.Suggestion, 'T3', 'D3');
    await expect(limitEngine.generate(SESSION_1, USER_1, InsightType.Opportunity, 'T4', 'D4')).rejects.toThrow(InsightLimitExceededError);
  });
  it('error has correct limit and current', async () => {
    const limitEngine = new InsightEngine({ maxInsightsPerSession: 2, minConfidence: 0.5 });
    await limitEngine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T1', 'D1');
    await limitEngine.generate(SESSION_1, USER_1, InsightType.Risk, 'T2', 'D2');
    try {
      await limitEngine.generate(SESSION_1, USER_1, InsightType.Suggestion, 'T3', 'D3');
      expect.unreachable('should have thrown');
    } catch (err) {
      const e = err as InsightLimitExceededError;
      expect(e.limit).toBe(2);
      expect(e.current).toBe(2);
    }
  });
  it('limit is per-session', async () => {
    const limitEngine = new InsightEngine({ maxInsightsPerSession: 2, minConfidence: 0.5 });
    await limitEngine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T1', 'D1');
    await limitEngine.generate(SESSION_1, USER_1, InsightType.Risk, 'T2', 'D2');
    await expect(limitEngine.generate(SESSION_1, USER_1, InsightType.Suggestion, 'T3', 'D3')).rejects.toThrow();
    const i = await limitEngine.generate(SESSION_2, USER_2, InsightType.Pattern, 'T4', 'D4');
    expect(i).toBeTruthy();
  });
  it('remove + recreate is allowed', async () => {
    const limitEngine = new InsightEngine({ maxInsightsPerSession: 2, minConfidence: 0.5 });
    const i1 = await limitEngine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T1', 'D1');
    await limitEngine.generate(SESSION_1, USER_1, InsightType.Risk, 'T2', 'D2');
    await limitEngine.remove(i1.id as string);
    const i3 = await limitEngine.generate(SESSION_1, USER_1, InsightType.Suggestion, 'T3', 'D3');
    expect(i3).toBeTruthy();
  });
  it('count unchanged after failed create', async () => {
    const limitEngine = new InsightEngine({ maxInsightsPerSession: 1, minConfidence: 0.5 });
    await limitEngine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T1', 'D1');
    try { await limitEngine.generate(SESSION_1, USER_1, InsightType.Risk, 'T2', 'D2'); } catch { /* expected */ }
    expect(await limitEngine.count(SESSION_1)).toBe(1);
  });
  it('maxInsightsPerSession of 0 prevents all creates', async () => {
    const zeroEngine = new InsightEngine({ maxInsightsPerSession: 0, minConfidence: 0.5 });
    await expect(zeroEngine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D')).rejects.toThrow(InsightLimitExceededError);
  });
});

describe('InsightEngine errors', () => {
  it('InsightNotFoundError has correct properties', () => {
    const err = new InsightNotFoundError('test-id');
    expect(err.insightId).toBe('test-id');
    expect(err.code).toBe('INSIGHT_NOT_FOUND');
    expect(err.message).toContain('test-id');
  });
  it('InsightLimitExceededError has correct properties', () => {
    const err = new InsightLimitExceededError(100, 100);
    expect(err.limit).toBe(100);
    expect(err.current).toBe(100);
    expect(err.code).toBe('INSIGHT_LIMIT');
  });
  it('InsightNotFoundError is instance of Error', () => {
    expect(new InsightNotFoundError('x')).toBeInstanceOf(Error);
  });
  it('InsightLimitExceededError is instance of Error', () => {
    expect(new InsightLimitExceededError(5, 5)).toBeInstanceOf(Error);
  });
});

describe('InsightEngine session isolation', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('3 sessions each with 10 insights', async () => {
    const sessions = ['iso-s1', 'iso-s2', 'iso-s3'];
    for (const s of sessions) {
      for (let i = 0; i < 10; i++) {
        await engine.generate(s, USER_1, InsightType.Pattern, `T-${s}-${i}`, 'D');
      }
    }
    for (const s of sessions) {
      expect(await engine.count(s)).toBe(10);
      const list = await engine.list(s);
      for (const insight of list) {
        expect(insight.sessionId).toBe(s);
      }
    }
  });
  it('remove from session 1 does not affect session 2', async () => {
    const i1 = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'S1', 'D');
    const i2 = await engine.generate(SESSION_2, USER_2, InsightType.Risk, 'S2', 'D');
    await engine.remove(i1.id as string);
    expect(await engine.count(SESSION_1)).toBe(0);
    expect(await engine.count(SESSION_2)).toBe(1);
  });
});

describe('InsightEngine userId tracking', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('preserves userId', async () => {
    const i = await engine.generate(SESSION_1, 'alice', InsightType.Pattern, 'T', 'D');
    expect(i.userId).toBe('alice');
  });
  it('different userIds in same session', async () => {
    const i1 = await engine.generate(SESSION_1, 'alice', InsightType.Pattern, 'T1', 'D');
    const i2 = await engine.generate(SESSION_1, 'bob', InsightType.Risk, 'T2', 'D');
    const list = await engine.list(SESSION_1);
    expect(list[0].userId).toBe('alice');
    expect(list[1].userId).toBe('bob');
  });
});

describe('InsightEngine title and content', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('empty title works', async () => {
    const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, '', 'D');
    expect(i.title).toBe('');
  });
  it('empty content works', async () => {
    const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', '');
    expect(i.description).toBe('');
  });
  it('unicode content works', async () => {
    const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, '\u2603', '\u2764\u2605');
    expect(i.title).toBe('\u2603');
    expect(i.description).toBe('\u2764\u2605');
  });
  it('long title preserved', async () => {
    const long = 'X'.repeat(500);
    const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, long, 'D');
    expect(i.title).toBe(long);
  });
});

describe('InsightEngine createdAt', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('createdAt is valid ISO string', async () => {
    const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    expect(() => new Date(i.createdAt).getTime()).not.toThrow();
  });
  it('two insights have close timestamps', async () => {
    const i1 = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T1', 'D');
    const i2 = await engine.generate(SESSION_1, USER_1, InsightType.Risk, 'T2', 'D');
    const diff = Math.abs(new Date(i2.createdAt).getTime() - new Date(i1.createdAt).getTime());
    expect(diff).toBeLessThan(1000);
  });
});

describe('InsightEngine unique IDs', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('100 insights have unique IDs', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const i_ = await engine.generate(SESSION_1, USER_1, INSIGHT_TYPES[i % 5], `T${i}`, 'D');
      ids.add(i_.id as string);
    }
    expect(ids.size).toBe(100);
  });
  it('all IDs start with insight-', async () => {
    for (let i = 0; i < 20; i++) {
      const i_ = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `T${i}`, 'D');
      expect((i_.id as string).startsWith('insight-')).toBe(true);
    }
  });
});

describe('InsightEngine analytics callback', () => {
  it('setAnalyticsCallback fires on generate', async () => {
    const engine = new InsightEngine(DefaultInsightEngineConfig);
    let fired = false;
    engine.setAnalyticsCallback(() => { fired = true; });
    await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
    expect(fired).toBe(true);
  });
  it('callback fires for each generate', async () => {
    const engine = new InsightEngine(DefaultInsightEngineConfig);
    let count = 0;
    engine.setAnalyticsCallback(() => { count++; });
    for (let i = 0; i < 5; i++) {
      await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `T${i}`, 'D');
    }
    expect(count).toBe(5);
  });
  it('no callback by default does not throw', async () => {
    const engine = new InsightEngine(DefaultInsightEngineConfig);
    await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
  });
});

describe('InsightEngine batch patterns', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('create 20 insights, verify each by get', async () => {
    const created = [];
    for (let i = 0; i < 20; i++) {
      created.push(await engine.generate(SESSION_1, USER_1, INSIGHT_TYPES[i % 5], `T${i}`, `D${i}`));
    }
    for (let i = 0; i < 20; i++) {
      const fetched = await engine.get(created[i].id as string);
      expect(fetched!.title).toBe(`T${i}`);
      expect(fetched!.type).toBe(INSIGHT_TYPES[i % 5]);
    }
  });
  it('create 10, remove every other, count is 5', async () => {
    const all = [];
    for (let i = 0; i < 10; i++) {
      all.push(await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `T${i}`, 'D'));
    }
    for (let i = 0; i < 10; i += 2) {
      await engine.remove(all[i].id as string);
    }
    expect(await engine.count(SESSION_1)).toBe(5);
  });
  it('create 30, list length equals count', async () => {
    for (let i = 0; i < 30; i++) {
      await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `T${i}`, 'D');
    }
    expect((await engine.list(SESSION_1)).length).toBe(30);
    expect(await engine.count(SESSION_1)).toBe(30);
  });
});

describe('InsightEngine type distribution in list', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('10 of each type, listByType each returns 10', async () => {
    for (const type of INSIGHT_TYPES) {
      for (let i = 0; i < 10; i++) {
        await engine.generate(SESSION_1, USER_1, type, `T-${type}-${i}`, 'D');
      }
    }
    expect(await engine.count(SESSION_1)).toBe(50);
    for (const type of INSIGHT_TYPES) {
      expect((await engine.listByType(SESSION_1, type)).length).toBe(10);
    }
  });
  it('listByType returns all of one type after mixed creates', async () => {
    for (let i = 0; i < 5; i++) {
      await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `P${i}`, 'D');
      await engine.generate(SESSION_1, USER_1, InsightType.Risk, `R${i}`, 'D');
    }
    const patterns = await engine.listByType(SESSION_1, InsightType.Pattern);
    const risks = await engine.listByType(SESSION_1, InsightType.Risk);
    expect(patterns.every(p => p.type === InsightType.Pattern)).toBe(true);
    expect(risks.every(r => r.type === InsightType.Risk)).toBe(true);
  });
});

describe('InsightEngine all fields verification', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  const fields = ['id', 'sessionId', 'userId', 'type', 'title', 'description', 'confidence', 'actionable', 'createdAt', 'metadata'];
  for (const field of fields) {
    it(`insight has field ${field}`, async () => {
      const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D');
      expect(field in i).toBe(true);
    });
  }
});

describe('InsightEngine sessionId variations', () => {
  const variants = [
    { label: 'uuid', gen: () => crypto.randomUUID() },
    { label: 'numeric', gen: () => '12345' },
    { label: 'short', gen: () => 's1' },
    { label: 'long', gen: () => 'a'.repeat(200) },
  ];
  for (const v of variants) {
    it(`handles ${v.label} sessionId`, async () => {
      const engine = new InsightEngine(DefaultInsightEngineConfig);
      const sid = v.gen();
      const i = await engine.generate(sid, USER_1, InsightType.Pattern, 'T', 'D');
      expect(i.sessionId).toBe(sid);
      expect((await engine.list(sid)).length).toBe(1);
    });
  }
});

describe('InsightEngine two instances isolated', () => {
  it('insights from instance 1 not visible in instance 2', async () => {
    const e1 = new InsightEngine(DefaultInsightEngineConfig);
    const e2 = new InsightEngine(DefaultInsightEngineConfig);
    await e1.generate(SESSION_1, USER_1, InsightType.Pattern, 'E1', 'D');
    await e2.generate(SESSION_1, USER_1, InsightType.Risk, 'E2', 'D');
    expect(await e1.count(SESSION_1)).toBe(1);
    expect(await e2.count(SESSION_1)).toBe(1);
    const l1 = await e1.list(SESSION_1);
    const l2 = await e2.list(SESSION_1);
    expect(l1[0].title).toBe('E1');
    expect(l2[0].title).toBe('E2');
  });
});

describe('InsightEngine confidence thresholds for actionable', () => {
  const thresholds = [
    { conf: 0.0, actionable: false },
    { conf: 0.1, actionable: false },
    { conf: 0.3, actionable: false },
    { conf: 0.5, actionable: false },
    { conf: 0.69, actionable: false },
    { conf: 0.7, actionable: true },
    { conf: 0.71, actionable: true },
    { conf: 0.8, actionable: true },
    { conf: 0.9, actionable: true },
    { conf: 1.0, actionable: true },
  ];
  for (const t of thresholds) {
    it(`confidence ${t.conf} => actionable=${t.actionable}`, async () => {
      const engine = new InsightEngine(DefaultInsightEngineConfig);
      const i = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'T', 'D', t.conf);
      expect(i.actionable).toBe(t.actionable);
    });
  }
});

describe('InsightEngine stress create 50', () => {
  it('creates 50 insights and all are retrievable', async () => {
    const engine = new InsightEngine(DefaultInsightEngineConfig);
    const all = [];
    for (let i = 0; i < 50; i++) {
      all.push(await engine.generate(SESSION_1, USER_1, INSIGHT_TYPES[i % 5], `Stress${i}`, `D${i}`));
    }
    expect(all.length).toBe(50);
    expect(await engine.count(SESSION_1)).toBe(50);
    for (const insight of all) {
      expect(await engine.get(insight.id as string)).not.toBeNull();
    }
  });
});

describe('InsightEngine list ordering', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('list returns in creation order', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const i_ = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `Order${i}`, 'D');
      ids.push(i_.id as string);
    }
    const list = await engine.list(SESSION_1);
    const listIds = list.map(i_ => i_.id as string);
    expect(listIds).toEqual(ids);
  });
});

describe('InsightEngine remove nonexistent ids', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  const badIds = ['nonexistent', '', 'null', '12345', 'insight-fake'];
  for (const badId of badIds) {
    it(`remove throws for id: ${badId}`, async () => {
      await expect(engine.remove(badId)).rejects.toThrow(InsightNotFoundError);
    });
  }
});

describe('InsightEngine all 5 types in one session listByType', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('one of each type, all listByType return 1', async () => {
    for (const type of INSIGHT_TYPES) {
      await engine.generate(SESSION_1, USER_1, type, `T-${type}`, 'D');
    }
    for (const type of INSIGHT_TYPES) {
      expect((await engine.listByType(SESSION_1, type)).length).toBe(1);
    }
    expect(await engine.count(SESSION_1)).toBe(5);
  });
});

describe('InsightEngine InsightType enum values', () => {
  it('all types are strings', () => {
    for (const t of INSIGHT_TYPES) {
      expect(typeof t).toBe('string');
    }
  });
  it('all types are distinct', () => {
    expect(new Set(INSIGHT_TYPES).size).toBe(5);
  });
});

describe('InsightEngine remove and count consistency', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('count decreases by 1 after each remove', async () => {
    const all = [];
    for (let i = 0; i < 10; i++) {
      all.push(await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `T${i}`, 'D'));
    }
    for (let i = 0; i < 10; i++) {
      expect(await engine.count(SESSION_1)).toBe(10 - i);
      await engine.remove(all[i].id as string);
    }
    expect(await engine.count(SESSION_1)).toBe(0);
  });
});

describe('InsightEngine mixed confidence insights', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('actionable and non-actionable coexist', async () => {
    await engine.generate(SESSION_1, USER_1, InsightType.Pattern, 'Low', 'D', 0.3);
    await engine.generate(SESSION_1, USER_1, InsightType.Risk, 'High', 'D', 0.9);
    const list = await engine.list(SESSION_1);
    expect(list[0].actionable).toBe(false);
    expect(list[1].actionable).toBe(true);
  });
  it('filtering actionable from list works', async () => {
    for (let i = 0; i < 10; i++) {
      const conf = i < 5 ? 0.4 : 0.8;
      await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `T${i}`, 'D', conf);
    }
    const list = await engine.list(SESSION_1);
    const actionable = list.filter(i_ => i_.actionable);
    expect(actionable).toHaveLength(5);
  });
});

describe('InsightEngine create remove recreate cycle', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('15 cycles of create-remove leaves 0', async () => {
    for (let i = 0; i < 15; i++) {
      const i_ = await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `Cycle${i}`, 'D');
      await engine.remove(i_.id as string);
    }
    expect(await engine.count(SESSION_1)).toBe(0);
  });
});

describe('InsightEngine get after remove returns null', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('remove all 5, each get returns null', async () => {
    const all = [];
    for (let i = 0; i < 5; i++) {
      all.push(await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `T${i}`, 'D'));
    }
    for (const i_ of all) {
      await engine.remove(i_.id as string);
    }
    for (const i_ of all) {
      expect(await engine.get(i_.id as string)).toBeNull();
    }
  });
});

describe('InsightEngine list count and remove consistency', () => {
  let engine: InsightEngine;
  beforeEach(() => { engine = new InsightEngine(DefaultInsightEngineConfig); });

  it('list length always equals count', async () => {
    const all = [];
    for (let i = 0; i < 20; i++) {
      all.push(await engine.generate(SESSION_1, USER_1, InsightType.Pattern, `T${i}`, 'D'));
    }
    for (let i = 0; i < 20; i++) {
      const listLen = (await engine.list(SESSION_1)).length;
      const countVal = await engine.count(SESSION_1);
      expect(listLen).toBe(countVal);
      if (i < 20) await engine.remove(all[i].id as string);
    }
  });
});
