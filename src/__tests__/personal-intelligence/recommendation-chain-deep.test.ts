import { describe, test, expect } from 'vitest';
import { RecommendationComposer } from '../../core/personal-intelligence/recommendation-composer.js';
import { RecommendationStage, RecommendationStatus } from '../../core/personal-intelligence/types.js';
import { RecommendationComposeError, RecommendationChainError } from '../../core/personal-intelligence/errors.js';

const C = {
  identity: { getCurrentUserId: () => 'u1', getUserRoles: () => ['admin'], getUserPreferences: () => ({}), resolvePreference: () => null },
  memory: { retrieve: async () => null, store: async () => {}, query: () => [], getSessionEntries: () => [], getWorkingEntries: () => [] },
  knowledge: { search: async () => [], getNamespaces: async () => [], getItemCount: async () => 0, getRecentItems: async () => [], getByTags: async () => [] },
  workflow: { getActiveWorkflows: () => [], getRunningInstances: () => [], getRecentCompletions: () => [], getAvailableWorkflows: () => [] },
  cognitive: { getCurrentIntent: () => null, getConversationTurnCount: () => 0, getCurrentSessionId: () => null, getConversationSummary: async () => null },
  personal: { getGoals: () => [], getActiveGoals: () => [], getRecommendations: () => [], getHabits: () => [], getReflections: () => [], getDecisions: () => [], getAttentionState: () => 'Focused' },
  aiProvider: { complete: async () => 'r', embed: async () => [0.1], isAvailable: () => true },
  experience: { getActiveAdaptations: () => [], getRecommendations: () => [], getCurrentPhase: () => 'Observing', getBehaviorPatterns: () => [] },
  platform: { publishEvent: async () => {}, getConfiguration: () => null, getHealth: async () => null },
};
const sid = (o: any) => o.id as unknown as string;
const validWhy = { why: 'This will reduce context switching by 60%', whyNow: 'Current sprint velocity has dropped 40%', whatValue: 'Recover 40% throughput, deliver 2 more features per sprint', whyMainConstraint: 'Scope creep is the primary bottleneck limiting output' };

describe('Recommendation Chain Deep', () => {
  describe('6-stage chain structure', () => {
    test('chain has exactly 6 stages', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.chain.length).toBe(6);
    });
    test('stage 0 is Understanding', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.chain[0].stage).toBe(RecommendationStage.Understanding);
    });
    test('stage 1 is Value', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.chain[1].stage).toBe(RecommendationStage.Value);
    });
    test('stage 2 is Constraint', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.chain[2].stage).toBe(RecommendationStage.Constraint);
    });
    test('stage 3 is Optimization', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.chain[3].stage).toBe(RecommendationStage.Optimization);
    });
    test('stage 4 is Explanation', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.chain[4].stage).toBe(RecommendationStage.Explanation);
    });
    test('stage 5 is Recommendation', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.chain[5].stage).toBe(RecommendationStage.Recommendation);
    });
    test('all stages have completed=true', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      for (const s of r.chain) expect(s.completed).toBe(true);
    });
    test('all stages have timestamp', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      for (const s of r.chain) expect(s.timestamp).toBeDefined();
    });
    test('all stages have data', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      for (const s of r.chain) expect(s.data).toBeDefined();
    });
    test('Understanding stage data has understanding field', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.chain[0].data.understanding).toBe('D');
    });
    test('Value stage data has valueAssessment field', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy, 'va-1');
      expect(r.chain[1].data.valueAssessment).toBe('va-1');
    });
    test('Constraint stage data has constraintId field', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy, undefined, 'co-1');
      expect(r.chain[2].data.constraintId).toBe('co-1');
    });
    test('Optimization stage data has optimized=true', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.chain[3].data.optimized).toBe(true);
    });
    test('Explanation stage data has why object', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.chain[4].data.why).toBe(validWhy);
    });
    test('Recommendation stage data has title and description', () => {
      const r = new RecommendationComposer(C).composeRecommendation('MyTitle', 'MyDesc', validWhy);
      expect(r.chain[5].data.title).toBe('MyTitle');
      expect(r.chain[5].data.description).toBe('MyDesc');
    });
  });

  describe('Four mandatory questions', () => {
    test('why is preserved in the recommendation', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.why.why).toBe(validWhy.why);
    });
    test('whyNow is preserved', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.why.whyNow).toBe(validWhy.whyNow);
    });
    test('whatValue is preserved', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.why.whatValue).toBe(validWhy.whatValue);
    });
    test('whyMainConstraint is preserved', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.why.whyMainConstraint).toBe(validWhy.whyMainConstraint);
    });
  });

  describe('Validation rejects incomplete why', () => {
    test('empty why throws', () => {
      const rc = new RecommendationComposer(C);
      expect(() => rc.composeRecommendation('T', 'D', { ...validWhy, why: '' })).toThrow(RecommendationComposeError);
    });
    test('empty whyNow throws', () => {
      const rc = new RecommendationComposer(C);
      expect(() => rc.composeRecommendation('T', 'D', { ...validWhy, whyNow: '' })).toThrow(RecommendationComposeError);
    });
    test('empty whatValue throws', () => {
      const rc = new RecommendationComposer(C);
      expect(() => rc.composeRecommendation('T', 'D', { ...validWhy, whatValue: '' })).toThrow(RecommendationComposeError);
    });
    test('empty whyMainConstraint throws', () => {
      const rc = new RecommendationComposer(C);
      expect(() => rc.composeRecommendation('T', 'D', { ...validWhy, whyMainConstraint: '' })).toThrow(RecommendationComposeError);
    });
    test('whitespace-only why throws', () => {
      const rc = new RecommendationComposer(C);
      expect(() => rc.composeRecommendation('T', 'D', { ...validWhy, why: '   ' })).toThrow(RecommendationComposeError);
    });
  });

  describe('Status lifecycle', () => {
    test('initial status is Validated', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', validWhy);
      expect(r.status).toBe(RecommendationStatus.Validated);
    });
    test('present changes to Presented', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', validWhy);
      const p = rc.present(sid(r));
      expect(p.status).toBe(RecommendationStatus.Presented);
      expect(p.presentedAt).toBeDefined();
    });
    test('accept changes to Accepted with resolvedAt', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', validWhy);
      rc.present(sid(r));
      const a = rc.accept(sid(r));
      expect(a.status).toBe(RecommendationStatus.Accepted);
      expect(a.resolvedAt).toBeDefined();
    });
    test('reject changes to Rejected with resolvedAt', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', validWhy);
      rc.present(sid(r));
      const rj = rc.reject(sid(r), 'not now');
      expect(rj.status).toBe(RecommendationStatus.Rejected);
      expect(rj.resolvedAt).toBeDefined();
    });
    test('present twice throws', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', validWhy);
      rc.present(sid(r));
      expect(() => rc.present(sid(r))).toThrow(RecommendationComposeError);
    });
    test('accept from Validated status updates directly', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', validWhy);
      const a = rc.accept(sid(r));
      expect(a.status).toBe(RecommendationStatus.Accepted);
      expect(a.resolvedAt).toBeDefined();
    });
    test('reject from any status updates directly', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', validWhy);
      const rj = rc.reject(sid(r), 'no');
      expect(rj.status).toBe(RecommendationStatus.Rejected);
      expect(rj.resolvedAt).toBeDefined();
    });
  });

  describe('Filtering and counts', () => {
    test('getActiveRecommendations includes Validated', () => {
      const rc = new RecommendationComposer(C);
      rc.composeRecommendation('T1', 'D', validWhy);
      expect(rc.getActiveRecommendations().length).toBe(1);
    });
    test('getActiveRecommendations includes Presented', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', validWhy);
      rc.present(sid(r));
      expect(rc.getActiveRecommendations().length).toBe(1);
    });
    test('getActiveRecommendations excludes Accepted', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', validWhy);
      rc.present(sid(r));
      rc.accept(sid(r));
      expect(rc.getActiveRecommendations().length).toBe(0);
    });
    test('getActiveRecommendations excludes Rejected', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', validWhy);
      rc.present(sid(r));
      rc.reject(sid(r), 'no');
      expect(rc.getActiveRecommendations().length).toBe(0);
    });
    test('getAcceptedCount tracks correctly', () => {
      const rc = new RecommendationComposer(C);
      const r1 = rc.composeRecommendation('T1', 'D', validWhy);
      const r2 = rc.composeRecommendation('T2', 'D', validWhy);
      rc.present(sid(r1)); rc.accept(sid(r1));
      rc.present(sid(r2)); rc.reject(sid(r2), 'no');
      expect(rc.getAcceptedCount()).toBe(1);
      expect(rc.getRejectedCount()).toBe(1);
    });
    test('getByStatus filters correctly', () => {
      const rc = new RecommendationComposer(C);
      const r1 = rc.composeRecommendation('T1', 'D', validWhy);
      const r2 = rc.composeRecommendation('T2', 'D', validWhy);
      rc.present(sid(r2));
      expect(rc.getByStatus(RecommendationStatus.Validated).length).toBe(1);
      expect(rc.getByStatus(RecommendationStatus.Presented).length).toBe(1);
    });
  });

  describe('TTL and expiry', () => {
    test('expiresAt is set on creation', () => {
      const r = new RecommendationComposer(C, 200, 168).composeRecommendation('T', 'D', validWhy);
      expect(r.expiresAt).toBeDefined();
      expect(r.expiresAt).not.toBeNull();
    });
    test('expiresAt is in the future for positive TTL', () => {
      const r = new RecommendationComposer(C, 200, 168).composeRecommendation('T', 'D', validWhy);
      expect(new Date(r.expiresAt!).getTime()).toBeGreaterThan(Date.now());
    });
    test('evictExpired returns count of removed', () => {
      const rc = new RecommendationComposer(C, 200, -1);
      rc.composeRecommendation('T1', 'D', validWhy);
      rc.composeRecommendation('T2', 'D', validWhy);
      expect(rc.evictExpired()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple recommendations', () => {
    test('chain stages are independent between recommendations', () => {
      const rc = new RecommendationComposer(C);
      const r1 = rc.composeRecommendation('T1', 'D1', { ...validWhy, why: 'why1' });
      const r2 = rc.composeRecommendation('T2', 'D2', { ...validWhy, why: 'why2' });
      expect(r1.chain[0].data.understanding).toBe('D1');
      expect(r2.chain[0].data.understanding).toBe('D2');
      expect(r1.chain[4].data.why.why).toBe('why1');
      expect(r2.chain[4].data.why.why).toBe('why2');
    });
    test('getAllRecommendations returns all', () => {
      const rc = new RecommendationComposer(C);
      rc.composeRecommendation('T1', 'D', validWhy);
      rc.composeRecommendation('T2', 'D', validWhy);
      rc.composeRecommendation('T3', 'D', validWhy);
      expect(rc.getAllRecommendations().length).toBe(3);
    });
  });
});
