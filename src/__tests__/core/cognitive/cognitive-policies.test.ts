/**
 * Cognitive Policies Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CognitivePolicyEngine } from '../../../core/cognitive/cognitive-policies.js';
import { CognitivePolicyType } from '../../../core/cognitive/types.js';

// ─── Helpers ──────────────────────────────────────────────────

function createMinimalContext(overrides: Partial<any> = {}): any {
  return Object.freeze({
    sessionId: 'test-session',
    conversationId: 'test-conv',
    turnId: null,
    intent: null,
    identity: null,
    memory: Object.freeze({ workingEntries: [], sessionEntries: [], relevantEntries: [], summary: null }),
    knowledge: Object.freeze({ relevantItems: [], namespaces: [], totalItems: 0 }),
    capabilities: Object.freeze({ available: ['search', 'calculate'], required: [], denied: [], activePacks: [] }),
    policies: Object.freeze({ maxTokens: 4096, allowedProviders: [], privacyLevel: 1, trustLevel: 1, costBudget: 100, activePolicies: [] }),
    environment: Object.freeze({ runtimeVersion: '0.4.0', sessionId: 'test', timezone: 'UTC', timestamp: '2024-01-01T00:00:00Z' }),
    conversationHistory: Object.freeze({ turnCount: 5, recentMessages: [], summary: null }),
    assembledAt: '2024-01-01T00:00:00Z',
    tokenEstimate: 100,
    ...overrides,
  });
}

function createMinimalIntent(overrides: Partial<any> = {}): any {
  return Object.freeze({
    id: 'intent-1' as any,
    type: 'Question' as any,
    goal: 'test',
    priority: 5,
    complexity: 'Simple' as any,
    confidence: 0.8,
    requiredCapabilities: [],
    parameters: {},
    detectedAt: '2024-01-01T00:00:00Z',
    metadata: Object.freeze({}),
    ...overrides,
  });
}

const defaultParams = () => ({
  context: createMinimalContext(),
  intent: null as any,
  prompt: null as any,
});

describe('CognitivePolicyEngine', () => {
  let engine: CognitivePolicyEngine;

  beforeEach(() => {
    engine = new CognitivePolicyEngine();
    engine.registerDefaultEvaluators();
  });

  // ─── constructor ──────────────────────────────────────────────

  describe('constructor', () => {
    it('creates without error', () => {
      expect(new CognitivePolicyEngine()).toBeInstanceOf(CognitivePolicyEngine);
    });
  });

  // ─── registerPolicy ─────────────────────────────────────────

  describe('registerPolicy', () => {
    it('registers a policy', () => {
      engine.registerPolicy({
        id: 'p1',
        name: 'Test Policy',
        type: CognitivePolicyType.Privacy,
        rules: Object.freeze({ privacyLevel: 1 }),
        priority: 1,
        description: 'test',
      });
      expect(engine.listPolicies()).toHaveLength(1);
    });

    it('registers multiple policies', () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({}), priority: 1, description: 't' });
      engine.registerPolicy({ id: 'p2', name: 'P2', type: CognitivePolicyType.Cost, rules: Object.freeze({}), priority: 2, description: 't' });
      expect(engine.listPolicies()).toHaveLength(2);
    });

    it('overwrites policy with same id', () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({}), priority: 1, description: 't' });
      engine.registerPolicy({ id: 'p1', name: 'P1 Updated', type: CognitivePolicyType.Cost, rules: Object.freeze({}), priority: 2, description: 't2' });
      expect(engine.listPolicies()).toHaveLength(1);
    });
  });

  // ─── registerEvaluator ───────────────────────────────────────

  describe('registerEvaluator', () => {
    it('registers a custom evaluator', () => {
      engine.registerEvaluator(CognitivePolicyType.Privacy, async () => ({
        allowed: true,
        policyId: 'custom',
        policyType: CognitivePolicyType.Privacy,
        reason: 'custom eval',
        constraints: Object.freeze({}),
      }));
    });

    it('custom evaluator is called during evaluation', async () => {
      const evaluator = vi.fn().mockResolvedValue({
        allowed: true,
        policyId: 'custom',
        policyType: CognitivePolicyType.Privacy,
        reason: 'custom',
        constraints: Object.freeze({}),
      });
      engine.registerEvaluator(CognitivePolicyType.Privacy, evaluator);
      engine.registerPolicy({
        id: 'p-priv',
        name: 'Privacy',
        type: CognitivePolicyType.Privacy,
        rules: Object.freeze({ privacyLevel: 1 }),
        priority: 1,
        description: 't',
      });
      await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Privacy] });
      expect(evaluator).toHaveBeenCalled();
    });
  });

  // ─── registerDefaultEvaluators ───────────────────────────────

  describe('registerDefaultEvaluators', () => {
    it('registers without error', () => {
      const e = new CognitivePolicyEngine();
      e.registerDefaultEvaluators();
    });
  });

  // ─── evaluate — all policies ─────────────────────────────────

  describe('evaluate — all policies', () => {
    it('returns allowed=true when no policies', async () => {
      const e = new CognitivePolicyEngine();
      const result = await e.evaluate(defaultParams());
      expect(result.allowed).toBe(true);
      expect(result.results).toHaveLength(0);
      expect(result.violations).toHaveLength(0);
    });

    it('evaluates all registered policies', async () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({ privacyLevel: 1 }), priority: 1, description: 't' });
      engine.registerPolicy({ id: 'p2', name: 'P2', type: CognitivePolicyType.Cost, rules: Object.freeze({ costBudget: 100, estimatedCost: 50 }), priority: 1, description: 't' });
      const result = await engine.evaluate(defaultParams());
      expect(result.results).toHaveLength(2);
    });

    it('results are frozen', async () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({ privacyLevel: 1 }), priority: 1, description: 't' });
      const result = await engine.evaluate(defaultParams());
      expect(Object.isFrozen(result.results)).toBe(true);
    });

    it('violations are frozen', async () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({ privacyLevel: 1 }), priority: 1, description: 't' });
      const result = await engine.evaluate(defaultParams());
      expect(Object.isFrozen(result.violations)).toBe(true);
    });
  });

  // ─── evaluate — with requiredTypes ───────────────────────────

  describe('evaluate — with requiredTypes', () => {
    it('filters by requiredTypes', async () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({}), priority: 1, description: 't' });
      engine.registerPolicy({ id: 'p2', name: 'P2', type: CognitivePolicyType.Cost, rules: Object.freeze({}), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Privacy] });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].policyType).toBe(CognitivePolicyType.Privacy);
    });

    it('returns empty results for non-existent required type', async () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Cost, rules: Object.freeze({}), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Privacy] });
      expect(result.results).toHaveLength(0);
    });
  });

  // ─── evaluate — allowed vs violations ──────────────────────

  describe('evaluate — allowed vs violations', () => {
    it('returns allowed=true when all policies pass', async () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({ privacyLevel: 1 }), priority: 1, description: 't' });
      const result = await engine.evaluate(defaultParams());
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('returns allowed=false when any policy fails', async () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({ privacyLevel: 5 }), priority: 1, description: 't' });
      const result = await engine.evaluate(defaultParams());
      expect(result.allowed).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it('violations include failing policy results', async () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({ privacyLevel: 5 }), priority: 1, description: 't' });
      const result = await engine.evaluate(defaultParams());
      expect(result.violations[0].policyId).toBe('p1');
      expect(result.violations[0].allowed).toBe(false);
    });

    it('handles evaluator errors as violations', async () => {
      engine.registerEvaluator(CognitivePolicyType.Privacy, async () => {
        throw new Error('eval error');
      });
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({}), priority: 1, description: 't' });
      const result = await engine.evaluate(defaultParams());
      expect(result.allowed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].reason).toContain('evaluation error');
    });
  });

  // ─── Privacy policy evaluation ──────────────────────────────

  describe('Privacy policy evaluation', () => {
    it('allows when context privacy >= required privacy', async () => {
      engine.registerPolicy({ id: 'priv-1', name: 'Privacy', type: CognitivePolicyType.Privacy, rules: Object.freeze({ privacyLevel: 1 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Privacy] });
      expect(result.allowed).toBe(true);
    });

    it('denies when context privacy < required privacy', async () => {
      engine.registerPolicy({ id: 'priv-2', name: 'Privacy', type: CognitivePolicyType.Privacy, rules: Object.freeze({ privacyLevel: 5 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Privacy] });
      expect(result.allowed).toBe(false);
    });

    it('reason includes privacy levels', async () => {
      engine.registerPolicy({ id: 'priv-3', name: 'Privacy', type: CognitivePolicyType.Privacy, rules: Object.freeze({ privacyLevel: 5 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Privacy] });
      expect(result.violations[0].reason).toContain('1');
      expect(result.violations[0].reason).toContain('5');
    });

    it('constraints include privacy levels', async () => {
      engine.registerPolicy({ id: 'priv-4', name: 'Privacy', type: CognitivePolicyType.Privacy, rules: Object.freeze({ privacyLevel: 3 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Privacy] });
      expect(result.results[0].constraints).toHaveProperty('privacyLevel');
    });
  });

  // ─── Cost policy evaluation ─────────────────────────────────

  describe('Cost policy evaluation', () => {
    it('allows when estimated cost <= budget', async () => {
      engine.registerPolicy({ id: 'cost-1', name: 'Cost', type: CognitivePolicyType.Cost, rules: Object.freeze({ costBudget: 100, estimatedCost: 50 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Cost] });
      expect(result.allowed).toBe(true);
    });

    it('denies when estimated cost > budget', async () => {
      engine.registerPolicy({ id: 'cost-2', name: 'Cost', type: CognitivePolicyType.Cost, rules: Object.freeze({ costBudget: 10, estimatedCost: 50 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Cost] });
      expect(result.allowed).toBe(false);
    });

    it('reason includes cost values', async () => {
      engine.registerPolicy({ id: 'cost-3', name: 'Cost', type: CognitivePolicyType.Cost, rules: Object.freeze({ costBudget: 10, estimatedCost: 50 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Cost] });
      expect(result.violations[0].reason).toContain('50');
      expect(result.violations[0].reason).toContain('10');
    });

    it('constraints include cost values', async () => {
      engine.registerPolicy({ id: 'cost-4', name: 'Cost', type: CognitivePolicyType.Cost, rules: Object.freeze({ costBudget: 100, estimatedCost: 50 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Cost] });
      expect(result.results[0].constraints).toHaveProperty('costBudget');
    });
  });

  // ─── Token policy evaluation ─────────────────────────────────

  describe('Token policy evaluation', () => {
    it('allows when current tokens <= max', async () => {
      engine.registerPolicy({ id: 'tok-1', name: 'Token', type: CognitivePolicyType.Token, rules: Object.freeze({ maxTokens: 4096 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Token] });
      expect(result.allowed).toBe(true);
    });

    it('denies when current tokens > max', async () => {
      engine.registerPolicy({ id: 'tok-2', name: 'Token', type: CognitivePolicyType.Token, rules: Object.freeze({ maxTokens: 50 }), priority: 1, description: 't' });
      const ctx = createMinimalContext({ tokenEstimate: 100 });
      const result = await engine.evaluate({ ...defaultParams(), context: ctx, requiredTypes: [CognitivePolicyType.Token] });
      expect(result.allowed).toBe(false);
    });

    it('reason includes token counts', async () => {
      engine.registerPolicy({ id: 'tok-3', name: 'Token', type: CognitivePolicyType.Token, rules: Object.freeze({ maxTokens: 50 }), priority: 1, description: 't' });
      const ctx = createMinimalContext({ tokenEstimate: 100 });
      const result = await engine.evaluate({ ...defaultParams(), context: ctx, requiredTypes: [CognitivePolicyType.Token] });
      expect(result.violations[0].reason).toContain('100');
      expect(result.violations[0].reason).toContain('50');
    });
  });

  // ─── Trust policy evaluation ────────────────────────────────

  describe('Trust policy evaluation', () => {
    it('allows when context trust >= required trust', async () => {
      engine.registerPolicy({ id: 'trust-1', name: 'Trust', type: CognitivePolicyType.Trust, rules: Object.freeze({ trustLevel: 1 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Trust] });
      expect(result.allowed).toBe(true);
    });

    it('denies when context trust < required trust', async () => {
      engine.registerPolicy({ id: 'trust-2', name: 'Trust', type: CognitivePolicyType.Trust, rules: Object.freeze({ trustLevel: 5 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Trust] });
      expect(result.allowed).toBe(false);
    });

    it('reason includes trust levels', async () => {
      engine.registerPolicy({ id: 'trust-3', name: 'Trust', type: CognitivePolicyType.Trust, rules: Object.freeze({ trustLevel: 5 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Trust] });
      expect(result.violations[0].reason).toContain('1');
      expect(result.violations[0].reason).toContain('5');
    });
  });

  // ─── Capability policy evaluation ───────────────────────────

  describe('Capability policy evaluation', () => {
    it('allows when no denied capabilities overlap', async () => {
      engine.registerPolicy({ id: 'cap-1', name: 'Capability', type: CognitivePolicyType.Capability, rules: Object.freeze({}), priority: 1, description: 't' });
      const intent = createMinimalIntent({ requiredCapabilities: ['search'] });
      const result = await engine.evaluate({ ...defaultParams(), intent, requiredTypes: [CognitivePolicyType.Capability] });
      expect(result.allowed).toBe(true);
    });

    it('denies when required capability is denied', async () => {
      engine.registerPolicy({ id: 'cap-2', name: 'Capability', type: CognitivePolicyType.Capability, rules: Object.freeze({}), priority: 1, description: 't' });
      const ctx = createMinimalContext({
        capabilities: Object.freeze({ available: [], required: [], denied: ['search'], activePacks: [] }),
      });
      const intent = createMinimalIntent({ requiredCapabilities: ['search'] });
      const result = await engine.evaluate({ ...defaultParams(), context: ctx, intent, requiredTypes: [CognitivePolicyType.Capability] });
      expect(result.allowed).toBe(false);
    });

    it('allows when intent has no required capabilities', async () => {
      engine.registerPolicy({ id: 'cap-3', name: 'Capability', type: CognitivePolicyType.Capability, rules: Object.freeze({}), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Capability] });
      expect(result.allowed).toBe(true);
    });

    it('allows when intent is null', async () => {
      engine.registerPolicy({ id: 'cap-4', name: 'Capability', type: CognitivePolicyType.Capability, rules: Object.freeze({}), priority: 1, description: 't' });
      const ctx = createMinimalContext({
        capabilities: Object.freeze({ available: [], required: [], denied: ['search'], activePacks: [] }),
      });
      const result = await engine.evaluate({ ...defaultParams(), context: ctx, intent: null, requiredTypes: [CognitivePolicyType.Capability] });
      expect(result.allowed).toBe(true);
    });
  });

  // ─── Conversation policy evaluation ──────────────────────────

  describe('Conversation policy evaluation', () => {
    it('allows when turns < maxTurns', async () => {
      engine.registerPolicy({ id: 'conv-1', name: 'Conversation', type: CognitivePolicyType.Conversation, rules: Object.freeze({ maxTurns: 100 }), priority: 1, description: 't' });
      const result = await engine.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Conversation] });
      expect(result.allowed).toBe(true);
    });

    it('denies when turns >= maxTurns', async () => {
      engine.registerPolicy({ id: 'conv-2', name: 'Conversation', type: CognitivePolicyType.Conversation, rules: Object.freeze({ maxTurns: 3 }), priority: 1, description: 't' });
      const ctx = createMinimalContext({
        conversationHistory: Object.freeze({ turnCount: 5, recentMessages: [], summary: null }),
      });
      const result = await engine.evaluate({ ...defaultParams(), context: ctx, requiredTypes: [CognitivePolicyType.Conversation] });
      expect(result.allowed).toBe(false);
    });

    it('reason includes turn counts', async () => {
      engine.registerPolicy({ id: 'conv-3', name: 'Conversation', type: CognitivePolicyType.Conversation, rules: Object.freeze({ maxTurns: 3 }), priority: 1, description: 't' });
      const ctx = createMinimalContext({
        conversationHistory: Object.freeze({ turnCount: 5, recentMessages: [], summary: null }),
      });
      const result = await engine.evaluate({ ...defaultParams(), context: ctx, requiredTypes: [CognitivePolicyType.Conversation] });
      expect(result.violations[0].reason).toContain('5');
      expect(result.violations[0].reason).toContain('3');
    });
  });

  // ─── listPolicies ────────────────────────────────────────────

  describe('listPolicies', () => {
    it('returns empty array initially', () => {
      expect(engine.listPolicies()).toHaveLength(0);
    });

    it('returns all registered policies', () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({}), priority: 1, description: 't' });
      engine.registerPolicy({ id: 'p2', name: 'P2', type: CognitivePolicyType.Cost, rules: Object.freeze({}), priority: 2, description: 't' });
      expect(engine.listPolicies()).toHaveLength(2);
    });
  });

  // ─── getPoliciesByType ───────────────────────────────────────

  describe('getPoliciesByType', () => {
    it('returns policies of given type', () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({}), priority: 1, description: 't' });
      engine.registerPolicy({ id: 'p2', name: 'P2', type: CognitivePolicyType.Cost, rules: Object.freeze({}), priority: 2, description: 't' });
      expect(engine.getPoliciesByType(CognitivePolicyType.Privacy)).toHaveLength(1);
      expect(engine.getPoliciesByType(CognitivePolicyType.Cost)).toHaveLength(1);
    });

    it('returns empty for non-existent type', () => {
      expect(engine.getPoliciesByType(CognitivePolicyType.Trust)).toHaveLength(0);
    });

    it('returns multiple policies of same type', () => {
      engine.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({}), priority: 1, description: 't' });
      engine.registerPolicy({ id: 'p2', name: 'P2', type: CognitivePolicyType.Privacy, rules: Object.freeze({}), priority: 2, description: 't' });
      expect(engine.getPoliciesByType(CognitivePolicyType.Privacy)).toHaveLength(2);
    });
  });

  // ─── default allow for unregistered evaluator ─────────────────

  describe('default allow for unregistered evaluator', () => {
    it('allows when no evaluator registered for type', async () => {
      const e = new CognitivePolicyEngine();
      e.registerPolicy({ id: 'p1', name: 'P1', type: CognitivePolicyType.Privacy, rules: Object.freeze({}), priority: 1, description: 't' });
      const result = await e.evaluate({ ...defaultParams(), requiredTypes: [CognitivePolicyType.Privacy] });
      expect(result.allowed).toBe(true);
      expect(result.results[0].reason).toContain('No evaluator registered');
    });
  });

  // ─── priority sorting ────────────────────────────────────────

  describe('priority sorting', () => {
    it('evaluates higher priority policies first', async () => {
      const order: string[] = [];
      const e = new CognitivePolicyEngine();
      e.registerEvaluator(CognitivePolicyType.Privacy, async () => {
        order.push('priv');
        return { allowed: true, policyId: '', policyType: CognitivePolicyType.Privacy, reason: '', constraints: Object.freeze({}) };
      });
      e.registerEvaluator(CognitivePolicyType.Cost, async () => {
        order.push('cost');
        return { allowed: true, policyId: '', policyType: CognitivePolicyType.Cost, reason: '', constraints: Object.freeze({}) };
      });
      e.registerPolicy({ id: 'p-low', name: 'Low', type: CognitivePolicyType.Privacy, rules: Object.freeze({}), priority: 1, description: 't' });
      e.registerPolicy({ id: 'p-high', name: 'High', type: CognitivePolicyType.Cost, rules: Object.freeze({}), priority: 10, description: 't' });
      await e.evaluate(defaultParams());
      expect(order).toEqual(['cost', 'priv']);
    });
  });
});
