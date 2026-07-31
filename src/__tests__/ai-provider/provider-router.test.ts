import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderRouter } from '../../core/ai-provider/provider-router.js';
import type { RoutingRule } from '../../core/ai-provider/provider-router.js';
import type * as Types from '../../core/ai-provider/types.js';

// ─── Factory helpers ─────────────────────────────────────────────

function makeProviderId(): Types.ProviderId {
  return crypto.randomUUID() as Types.ProviderId;
}

function makeModelId(): Types.ModelId {
  return crypto.randomUUID() as Types.ModelId;
}

function makeExecutionRequest(
  overrides?: Partial<Types.ExecutionRequest>,
): Types.ExecutionRequest {
  return Object.freeze({
    id: crypto.randomUUID() as Types.ExecutionId,
    messages: [{ role: 'user', content: 'Hello' }],
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  });
}

function makeRule(
  overrides?: Partial<RoutingRule>,
): RoutingRule {
  return Object.freeze({
    id: crypto.randomUUID(),
    name: 'Test Rule',
    condition: () => true,
    providerId: makeProviderId(),
    modelId: makeModelId(),
    priority: 10,
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('ProviderRouter', () => {
  let router: ProviderRouter;

  beforeEach(() => {
    router = new ProviderRouter();
  });

  afterEach(() => {
    // Each test is independent via fresh router in beforeEach
  });

  // ═══════════════════════════════════════════════════════════════
  // route — rule match
  // ═══════════════════════════════════════════════════════════════
  describe('route — rule match', () => {
    it('should return providerId from matching rule', async () => {
      const providerId = makeProviderId();
      const modelId = makeModelId();
      router.addRule(makeRule({
        condition: () => true,
        providerId,
        modelId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(providerId);
    });

    it('should return modelId from matching rule', async () => {
      const modelId = makeModelId();
      router.addRule(makeRule({
        condition: () => true,
        modelId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest());
      expect(result.modelId).toBe(modelId);
    });

    it('should match rule based on condition', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => req.messages[0].content === 'special',
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({
        messages: [{ role: 'user', content: 'special' }],
      }));
      expect(result.providerId).toBe(providerId);
    });

    it('should not match rule when condition is false', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: () => false,
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).not.toBe(providerId);
    });

    it('should select highest priority (lowest number) rule', async () => {
      const p1 = makeProviderId();
      const p2 = makeProviderId();
      router.addRule(makeRule({ providerId: p1, priority: 10 }));
      router.addRule(makeRule({ providerId: p2, priority: 1 }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(p2);
    });

    it('should skip lower priority rules when higher matches', async () => {
      const p1 = makeProviderId();
      const p2 = makeProviderId();
      router.addRule(makeRule({ providerId: p1, priority: 1 }));
      router.addRule(makeRule({ providerId: p2, priority: 10 }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(p1);
    });

    it('should fall through to next rule when first does not match', async () => {
      const p1 = makeProviderId();
      const p2 = makeProviderId();
      router.addRule(makeRule({
        condition: () => false,
        providerId: p1,
        priority: 1,
      }));
      router.addRule(makeRule({
        condition: () => true,
        providerId: p2,
        priority: 5,
      }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(p2);
    });

    it('should evaluate rules in priority order regardless of add order', async () => {
      const p1 = makeProviderId();
      const p2 = makeProviderId();
      router.addRule(makeRule({ providerId: p1, priority: 50 }));
      router.addRule(makeRule({ providerId: p2, priority: 1 }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(p2);
    });

    it('should pass the request object to condition', async () => {
      let receivedRequest: Types.ExecutionRequest | undefined;
      router.addRule(makeRule({
        condition: (req) => {
          receivedRequest = req;
          return true;
        },
        priority: 1,
      }));
      const request = makeExecutionRequest({ messages: [{ role: 'user', content: 'test-msg' }] });
      await router.route(request);
      expect(receivedRequest).toBe(request);
    });

    it('should handle condition checking request metadata', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => (req.metadata as Record<string, unknown>)['region'] === 'eu',
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({
        metadata: { region: 'eu' },
      }));
      expect(result.providerId).toBe(providerId);
    });

    it('should handle condition checking systemPrompt', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => req.systemPrompt === 'code-assistant',
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({
        systemPrompt: 'code-assistant',
      }));
      expect(result.providerId).toBe(providerId);
    });

    it('should handle condition checking maxTokens', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => (req.maxTokens ?? 0) > 4000,
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({ maxTokens: 8000 }));
      expect(result.providerId).toBe(providerId);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // route — default fallback
  // ═══════════════════════════════════════════════════════════════
  describe('route — default fallback', () => {
    it('should fall back to defaultProviderId when no rules match', async () => {
      const defaultPid = makeProviderId();
      const defaultMid = makeModelId();
      const r = new ProviderRouter(defaultPid, defaultMid);
      const result = await r.route(makeExecutionRequest());
      expect(result.providerId).toBe(defaultPid);
      expect(result.modelId).toBe(defaultMid);
    });

    it('should use defaultModelId from constructor', async () => {
      const defaultMid = makeModelId();
      const r = new ProviderRouter(undefined, defaultMid);
      const result = await r.route(makeExecutionRequest());
      expect(result.modelId).toBe(defaultMid);
    });

    it('should use defaultProviderId from constructor', async () => {
      const defaultPid = makeProviderId();
      const r = new ProviderRouter(defaultPid);
      const result = await r.route(makeExecutionRequest());
      expect(result.providerId).toBe(defaultPid);
    });

    it('should prefer rule over default', async () => {
      const defaultPid = makeProviderId();
      const rulePid = makeProviderId();
      const r = new ProviderRouter(defaultPid);
      r.addRule(makeRule({ providerId: rulePid, priority: 1 }));
      const result = await r.route(makeExecutionRequest());
      expect(result.providerId).toBe(rulePid);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // route — request fallback
  // ═══════════════════════════════════════════════════════════════
  describe('route — request fallback', () => {
    it('should use request providerId when no rules match', async () => {
      const reqPid = makeProviderId();
      const result = await router.route(makeExecutionRequest({ providerId: reqPid }));
      expect(result.providerId).toBe(reqPid);
    });

    it('should use request modelId when no rules match', async () => {
      const reqMid = makeModelId();
      const result = await router.route(makeExecutionRequest({ modelId: reqMid }));
      expect(result.modelId).toBe(reqMid);
    });

    it('should prefer request providerId over default', async () => {
      const defaultPid = makeProviderId();
      const reqPid = makeProviderId();
      const r = new ProviderRouter(defaultPid);
      const result = await r.route(makeExecutionRequest({ providerId: reqPid }));
      expect(result.providerId).toBe(reqPid);
    });

    it('should prefer rule over request providerId', async () => {
      const reqPid = makeProviderId();
      const rulePid = makeProviderId();
      router.addRule(makeRule({ providerId: rulePid, priority: 1 }));
      const result = await router.route(makeExecutionRequest({ providerId: reqPid }));
      expect(result.providerId).toBe(rulePid);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // route — no match
  // ═══════════════════════════════════════════════════════════════
  describe('route — no match', () => {
    it('should return empty providerId when no rules and no defaults', async () => {
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe('' as Types.ProviderId);
    });

    it('should return empty modelId when no rules and no defaults', async () => {
      const result = await router.route(makeExecutionRequest());
      expect(result.modelId).toBe('' as Types.ModelId);
    });

    it('should not throw when no rules match and no defaults', async () => {
      await expect(router.route(makeExecutionRequest())).resolves.not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addRule — priority sorting
  // ═══════════════════════════════════════════════════════════════
  describe('addRule — priority sorting', () => {
    it('should add a rule', () => {
      router.addRule(makeRule());
      expect(router.listRules()).toHaveLength(1);
    });

    it('should add multiple rules', () => {
      router.addRule(makeRule());
      router.addRule(makeRule());
      router.addRule(makeRule());
      expect(router.listRules()).toHaveLength(3);
    });

    it('should not modify rule when added', () => {
      const rule = makeRule();
      router.addRule(rule);
      const listed = router.listRules()[0];
      expect(listed.id).toBe(rule.id);
      expect(listed.name).toBe(rule.name);
    });

    it('should store rule id', () => {
      const rule = makeRule({ id: 'rule-42' });
      router.addRule(rule);
      expect(router.listRules()[0].id).toBe('rule-42');
    });

    it('should store rule name', () => {
      const rule = makeRule({ name: 'High Priority' });
      router.addRule(rule);
      expect(router.listRules()[0].name).toBe('High Priority');
    });

    it('should store rule priority', () => {
      const rule = makeRule({ priority: 99 });
      router.addRule(rule);
      expect(router.listRules()[0].priority).toBe(99);
    });

    it('should store rule providerId', () => {
      const pid = makeProviderId();
      const rule = makeRule({ providerId: pid });
      router.addRule(rule);
      expect(router.listRules()[0].providerId).toBe(pid);
    });

    it('should store rule modelId', () => {
      const mid = makeModelId();
      const rule = makeRule({ modelId: mid });
      router.addRule(rule);
      expect(router.listRules()[0].modelId).toBe(mid);
    });

    it('should allow rules with same priority', () => {
      const p1 = makeProviderId();
      const p2 = makeProviderId();
      router.addRule(makeRule({ providerId: p1, priority: 5 }));
      router.addRule(makeRule({ providerId: p2, priority: 5 }));
      expect(router.listRules()).toHaveLength(2);
    });

    it('should route to first added rule when same priority', async () => {
      const p1 = makeProviderId();
      const p2 = makeProviderId();
      router.addRule(makeRule({ providerId: p1, priority: 5 }));
      router.addRule(makeRule({ providerId: p2, priority: 5 }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(p1);
    });

    it('should correctly sort three rules by priority', async () => {
      const pLow = makeProviderId();
      const pMid = makeProviderId();
      const pHigh = makeProviderId();
      router.addRule(makeRule({ providerId: pLow, priority: 100 }));
      router.addRule(makeRule({ providerId: pHigh, priority: 1 }));
      router.addRule(makeRule({ providerId: pMid, priority: 50 }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(pHigh);
    });

    it('should handle negative priority values', async () => {
      const p1 = makeProviderId();
      const p2 = makeProviderId();
      router.addRule(makeRule({ providerId: p1, priority: -10 }));
      router.addRule(makeRule({ providerId: p2, priority: 5 }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(p1);
    });

    it('should handle zero priority', async () => {
      const p1 = makeProviderId();
      const p2 = makeProviderId();
      router.addRule(makeRule({ providerId: p1, priority: 0 }));
      router.addRule(makeRule({ providerId: p2, priority: 1 }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(p1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeRule
  // ═══════════════════════════════════════════════════════════════
  describe('removeRule', () => {
    it('should remove an existing rule', () => {
      const rule = makeRule({ id: 'to-remove' });
      router.addRule(rule);
      expect(router.listRules()).toHaveLength(1);
      router.removeRule('to-remove');
      expect(router.listRules()).toHaveLength(0);
    });

    it('should not throw when removing non-existent rule', () => {
      expect(() => router.removeRule('non-existent')).not.toThrow();
    });

    it('should not affect other rules', () => {
      const r1 = makeRule({ id: 'keep-1' });
      const r2 = makeRule({ id: 'remove-me' });
      const r3 = makeRule({ id: 'keep-2' });
      router.addRule(r1);
      router.addRule(r2);
      router.addRule(r3);
      router.removeRule('remove-me');
      expect(router.listRules()).toHaveLength(2);
      expect(router.listRules().map(r => r.id)).toContain('keep-1');
      expect(router.listRules().map(r => r.id)).toContain('keep-2');
    });

    it('should cause route to skip removed rule', async () => {
      const pRemoved = makeProviderId();
      const pKept = makeProviderId();
      router.addRule(makeRule({ id: 'rm', providerId: pRemoved, priority: 1 }));
      router.addRule(makeRule({ id: 'keep', providerId: pKept, priority: 5 }));
      router.removeRule('rm');
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(pKept);
    });

    it('should allow removing and re-adding same rule id', async () => {
      const pid1 = makeProviderId();
      const pid2 = makeProviderId();
      router.addRule(makeRule({ id: 're-add', providerId: pid1, priority: 1 }));
      router.removeRule('re-add');
      router.addRule(makeRule({ id: 're-add', providerId: pid2, priority: 1 }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(pid2);
    });

    it('should not throw on removing from empty router', () => {
      expect(() => router.removeRule('anything')).not.toThrow();
      expect(router.listRules()).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // listRules
  // ═══════════════════════════════════════════════════════════════
  describe('listRules', () => {
    it('should return empty array initially', () => {
      expect(router.listRules()).toHaveLength(0);
    });

    it('should return array of rules', () => {
      const r = makeRule();
      router.addRule(r);
      const rules = router.listRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules).toHaveLength(1);
    });

    it('should reflect additions in list', () => {
      router.addRule(makeRule({ id: 'a' }));
      router.addRule(makeRule({ id: 'b' }));
      router.addRule(makeRule({ id: 'c' }));
      expect(router.listRules()).toHaveLength(3);
    });

    it('should reflect removals in list', () => {
      router.addRule(makeRule({ id: 'a' }));
      router.addRule(makeRule({ id: 'b' }));
      router.removeRule('a');
      expect(router.listRules()).toHaveLength(1);
      expect(router.listRules()[0].id).toBe('b');
    });

    it('should return rules with condition function', () => {
      router.addRule(makeRule({ condition: () => true }));
      expect(typeof router.listRules()[0].condition).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // route — edge cases
  // ═══════════════════════════════════════════════════════════════
  describe('route — edge cases', () => {
    it('should handle condition that checks tools array', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => (req.tools?.length ?? 0) > 0,
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({
        tools: [{ name: 'search', description: 'Search', parameters: {} }],
      }));
      expect(result.providerId).toBe(providerId);
    });

    it('should handle condition that checks temperature', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => (req.temperature ?? 1) < 0.5,
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({ temperature: 0.2 }));
      expect(result.providerId).toBe(providerId);
    });

    it('should handle condition that checks responseFormat', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => req.responseFormat?.type === 'json',
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({
        responseFormat: { type: 'json' },
      }));
      expect(result.providerId).toBe(providerId);
    });

    it('should handle condition that checks stopSequences', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => (req.stopSequences?.length ?? 0) > 0,
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({
        stopSequences: ['\n'],
      }));
      expect(result.providerId).toBe(providerId);
    });

    it('should handle condition checking messages count', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => req.messages.length > 5,
        providerId,
        priority: 1,
      }));
      const msgs = Array.from({ length: 6 }, (_, i) => ({ role: 'user' as const, content: `msg-${i}` }));
      const result = await router.route(makeExecutionRequest({ messages: msgs }));
      expect(result.providerId).toBe(providerId);
    });

    it('should not break with 100 rules', async () => {
      const targetPid = makeProviderId();
      for (let i = 0; i < 100; i++) {
        router.addRule(makeRule({
          condition: () => false,
          priority: i,
        }));
      }
      router.addRule(makeRule({
        condition: () => true,
        providerId: targetPid,
        priority: -1,
      }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(targetPid);
    });

    it('should return result object with providerId and modelId', async () => {
      const result = await router.route(makeExecutionRequest());
      expect(result).toHaveProperty('providerId');
      expect(result).toHaveProperty('modelId');
    });

    it('should handle request with multiple messages', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => req.messages.length === 3,
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'hello' },
        ],
      }));
      expect(result.providerId).toBe(providerId);
    });

    it('should prefer request modelId over default when no rules match', async () => {
      const defaultMid = makeModelId();
      const reqMid = makeModelId();
      const r = new ProviderRouter(undefined, defaultMid);
      const result = await r.route(makeExecutionRequest({ modelId: reqMid }));
      expect(result.modelId).toBe(reqMid);
    });

    it('should prefer rule modelId over request modelId', async () => {
      const ruleMid = makeModelId();
      const reqMid = makeModelId();
      router.addRule(makeRule({ modelId: ruleMid, priority: 1 }));
      const result = await router.route(makeExecutionRequest({ modelId: reqMid }));
      expect(result.modelId).toBe(ruleMid);
    });

    it('should handle condition with assistant message', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => req.messages.some(m => m.role === 'assistant'),
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'hello' },
        ],
      }));
      expect(result.providerId).toBe(providerId);
    });

    it('should handle condition with tool message', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => req.messages.some(m => m.role === 'tool'),
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({
        messages: [
          { role: 'tool', content: 'result' },
        ],
      }));
      expect(result.providerId).toBe(providerId);
    });

    it('should use default modelId when no rules and request has no modelId', async () => {
      const defaultMid = makeModelId();
      const r = new ProviderRouter(undefined, defaultMid);
      const result = await r.route(makeExecutionRequest());
      expect(result.modelId).toBe(defaultMid);
    });

    it('should handle condition checking frequencyPenalty', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => (req.frequencyPenalty ?? 0) > 0.5,
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({ frequencyPenalty: 0.8 }));
      expect(result.providerId).toBe(providerId);
    });

    it('should handle condition checking presencePenalty', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => (req.presencePenalty ?? 0) > 0.5,
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({ presencePenalty: 0.6 }));
      expect(result.providerId).toBe(providerId);
    });

    it('should not modify the rules array when routing', async () => {
      const rule = makeRule({ priority: 1 });
      router.addRule(rule);
      const before = router.listRules().length;
      await router.route(makeExecutionRequest());
      expect(router.listRules().length).toBe(before);
    });

    it('should handle condition that always throws', async () => {
      router.addRule(makeRule({
        condition: () => { throw new Error('bad condition'); },
        priority: 1,
      }));
      await expect(router.route(makeExecutionRequest())).rejects.toThrow('bad condition');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // constructor
  // ═══════════════════════════════════════════════════════════════
  describe('constructor', () => {
    it('should create router without arguments', () => {
      const r = new ProviderRouter();
      expect(r.listRules()).toHaveLength(0);
    });

    it('should create router with defaultProviderId only', async () => {
      const pid = makeProviderId();
      const r = new ProviderRouter(pid);
      const result = await r.route(makeExecutionRequest());
      expect(result.providerId).toBe(pid);
    });

    it('should create router with defaultModelId only', async () => {
      const mid = makeModelId();
      const r = new ProviderRouter(undefined, mid);
      const result = await r.route(makeExecutionRequest());
      expect(result.modelId).toBe(mid);
    });

    it('should create router with both defaults', async () => {
      const pid = makeProviderId();
      const mid = makeModelId();
      const r = new ProviderRouter(pid, mid);
      const result = await r.route(makeExecutionRequest());
      expect(result.providerId).toBe(pid);
      expect(result.modelId).toBe(mid);
    });

    it('should handle constructor with undefined providerId', async () => {
      const r = new ProviderRouter(undefined);
      const result = await r.route(makeExecutionRequest());
      expect(result).toHaveProperty('providerId');
    });

    it('should handle constructor with undefined modelId', async () => {
      const r = new ProviderRouter(undefined, undefined);
      const result = await r.route(makeExecutionRequest());
      expect(result).toHaveProperty('modelId');
    });

    it('should handle constructor with empty string providerId', async () => {
      const r = new ProviderRouter('' as Types.ProviderId);
      const result = await r.route(makeExecutionRequest());
      expect(result.providerId).toBe('' as Types.ProviderId);
    });

    it('should handle constructor with empty string modelId', async () => {
      const r = new ProviderRouter(undefined, '' as Types.ModelId);
      const result = await r.route(makeExecutionRequest());
      expect(result.modelId).toBe('' as Types.ModelId);
    });

    it('should not share rules between instances', () => {
      const r1 = new ProviderRouter();
      const r2 = new ProviderRouter();
      r1.addRule(makeRule({ id: 'only-in-r1' }));
      expect(r1.listRules()).toHaveLength(1);
      expect(r2.listRules()).toHaveLength(0);
    });

    it('should handle removing all rules from router with defaults', async () => {
      const pid = makeProviderId();
      const mid = makeModelId();
      const r = new ProviderRouter(pid, mid);
      r.addRule(makeRule({ id: 'rm' }));
      r.removeRule('rm');
      const result = await r.route(makeExecutionRequest());
      expect(result.providerId).toBe(pid);
      expect(result.modelId).toBe(mid);
    });

    it('should handle condition that accesses request id', async () => {
      const providerId = makeProviderId();
      const targetId = crypto.randomUUID() as Types.ExecutionId;
      router.addRule(makeRule({
        condition: (req) => req.id === targetId,
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({ id: targetId }));
      expect(result.providerId).toBe(providerId);
    });

    it('should handle condition that checks topP', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => (req.topP ?? 1) < 0.5,
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({ topP: 0.3 }));
      expect(result.providerId).toBe(providerId);
    });

    it('should handle request with system message role', async () => {
      const providerId = makeProviderId();
      router.addRule(makeRule({
        condition: (req) => req.messages[0].role === 'system',
        providerId,
        priority: 1,
      }));
      const result = await router.route(makeExecutionRequest({
        messages: [{ role: 'system', content: 'You are helpful.' }],
      }));
      expect(result.providerId).toBe(providerId);
    });

    it('should route to default when all conditions are false', async () => {
      const defaultPid = makeProviderId();
      const r = new ProviderRouter(defaultPid);
      r.addRule(makeRule({ condition: () => false, priority: 1 }));
      r.addRule(makeRule({ condition: () => false, priority: 2 }));
      r.addRule(makeRule({ condition: () => false, priority: 3 }));
      const result = await r.route(makeExecutionRequest());
      expect(result.providerId).toBe(defaultPid);
    });

    it('should handle large priority values', async () => {
      const p1 = makeProviderId();
      const p2 = makeProviderId();
      router.addRule(makeRule({ providerId: p1, priority: Number.MAX_SAFE_INTEGER }));
      router.addRule(makeRule({ providerId: p2, priority: 1 }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe(p2);
    });

    it('should list rules in add order (not sorted)', () => {
      router.addRule(makeRule({ id: 'first', priority: 10 }));
      router.addRule(makeRule({ id: 'second', priority: 1 }));
      const rules = router.listRules();
      expect(rules[0].id).toBe('first');
      expect(rules[1].id).toBe('second');
    });

    it('should handle rule with empty string name', () => {
      router.addRule(makeRule({ name: '' }));
      expect(router.listRules()[0].name).toBe('');
    });

    it('should handle rule with empty string providerId', async () => {
      router.addRule(makeRule({ providerId: '' as Types.ProviderId, priority: 1 }));
      const result = await router.route(makeExecutionRequest());
      expect(result.providerId).toBe('' as Types.ProviderId);
    });

    it('should handle rule with empty string modelId', async () => {
      router.addRule(makeRule({ modelId: '' as Types.ModelId, priority: 1 }));
      const result = await router.route(makeExecutionRequest());
      expect(result.modelId).toBe('' as Types.ModelId);
    });

    it('should handle removeRule called twice on same id', () => {
      router.addRule(makeRule({ id: 'double-remove' }));
      router.removeRule('double-remove');
      router.removeRule('double-remove');
      expect(router.listRules()).toHaveLength(0);
    });
  });
});
