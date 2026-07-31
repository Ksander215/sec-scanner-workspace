import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolicyEngine } from '../../../core/compliance/policy-engine.js';
import type { IRuleEngine } from '../../../core/compliance/contracts.js';
import {
  RuleCategory,
  RuleSeverity,
  EnforcementLevel,
  AutoFixCapability,
  ValidationTargetType,
  ComplianceState,
  DefaultComplianceRuntimeConfig,
  brandRuleId,
  brandViolationId,
  brandPolicyId,
  brandValidatorId,
  brandComplianceSessionId,
} from '../../../core/compliance/types.js';
import type {
  CompliancePolicy,
  ValidationRequest,
  ValidationResult,
  RuleEvaluationResult,
} from '../../../core/compliance/types.js';
import {
  PolicyAlreadyRegisteredError,
  PolicyNotFoundError,
  PolicyLimitExceededError,
} from '../../../core/compliance/errors.js';

// ═══════════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════════

function createTestRule(overrides?: Partial<import('../../../core/compliance/types.js').ComplianceRule>): import('../../../core/compliance/types.js').ComplianceRule {
  return Object.freeze({
    id: brandRuleId(`rule-${Math.random().toString(36).slice(2, 8)}`),
    name: 'Test Rule',
    description: 'A test rule',
    category: RuleCategory.Architecture,
    severity: RuleSeverity.Error,
    enforcementLevel: EnforcementLevel.Advisory,
    autoFix: AutoFixCapability.None,
    source: 'TEST-001',
    validatorId: brandValidatorId('v1'),
    enabled: true,
    tags: [],
    metadata: {},
    ...overrides,
  });
}

function createTestPolicy(overrides?: Partial<CompliancePolicy>): CompliancePolicy {
  return Object.freeze({
    id: brandPolicyId(`policy-${Math.random().toString(36).slice(2, 8)}`),
    name: 'Test Policy',
    description: 'A test policy',
    source: 'GOV-008.000',
    rules: [],
    enforcementLevel: EnforcementLevel.Advisory,
    enabled: true,
    createdAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

function createTestRequest(overrides?: Partial<ValidationRequest>): ValidationRequest {
  return Object.freeze({
    targetType: ValidationTargetType.Architecture,
    targetPath: '/src/test.ts',
    sessionId: brandComplianceSessionId(`sess-${Math.random().toString(36).slice(2, 8)}`),
    metadata: {},
    ...overrides,
  });
}

function createPassingResult(ruleId: import('../../../core/compliance/types.js').RuleId, ruleName: string, category: RuleCategory, severity: RuleSeverity): RuleEvaluationResult {
  return Object.freeze({
    ruleId,
    ruleName,
    category,
    severity,
    passed: true,
    violations: [],
    durationMs: 5,
    autoFixed: false,
    metadata: {},
  });
}

function createMockRuleEngine(): {
  engine: IRuleEngine;
  evaluateRulesResult: ValidationResult;
  mockEvaluateRules: ReturnType<typeof vi.fn>;
} {
  const mockEvaluateRules = vi.fn();
  const engine: IRuleEngine = {
    registerRule: vi.fn(),
    unregisterRule: vi.fn(),
    getRule: vi.fn(),
    listRules: vi.fn(),
    evaluateRule: vi.fn(),
    evaluateRules: mockEvaluateRules,
    enableRule: vi.fn(),
    disableRule: vi.fn(),
    count: vi.fn(),
  };
  const evaluateRulesResult: ValidationResult = Object.freeze({
    sessionId: brandComplianceSessionId('mock-session'),
    targetType: ValidationTargetType.Architecture,
    targetPath: '/src/test.ts',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 100,
    results: [],
    totalRules: 0,
    passedRules: 0,
    failedRules: 0,
    skippedRules: 0,
    violations: [],
    autoFixedCount: 0,
    state: ComplianceState.Completed,
  });
  mockEvaluateRules.mockResolvedValue(evaluateRulesResult);
  return { engine, evaluateRulesResult, mockEvaluateRules };
}

// ═══════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════

describe('PolicyEngine', () => {
  let policyEngine: PolicyEngine;
  let mockRuleEngine: IRuleEngine;
  let mockEvaluateRules: ReturnType<typeof vi.fn>;
  let evaluateRulesResult: ValidationResult;
  const mockEventBus = { publish: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockRuleEngine();
    mockRuleEngine = mock.engine;
    mockEvaluateRules = mock.mockEvaluateRules;
    evaluateRulesResult = mock.evaluateRulesResult;
    policyEngine = new PolicyEngine(
      { ...DefaultComplianceRuntimeConfig.policyEngine },
      mockRuleEngine,
      mockEventBus,
    );
  });

  // ─── registerPolicy ─────────────────────────────────────────────
  describe('registerPolicy', () => {
    it('should register a policy successfully', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      const retrieved = await policyEngine.getPolicy(policy.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(policy.id);
    });

    it('should increment count after registration', async () => {
      await policyEngine.registerPolicy(createTestPolicy());
      expect(await policyEngine.count()).toBe(1);
    });

    it('should freeze the registered policy', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      const retrieved = await policyEngine.getPolicy(policy.id);
      expect(Object.isFrozen(retrieved!)).toBe(true);
    });

    it('should throw PolicyAlreadyRegisteredError for duplicate', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      await expect(policyEngine.registerPolicy(policy)).rejects.toThrow(PolicyAlreadyRegisteredError);
    });

    it('should have correct code on duplicate error', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      try {
        await policyEngine.registerPolicy(policy);
        expect.unreachable('should have thrown');
      } catch (err) {
        expect((err as PolicyAlreadyRegisteredError).code).toBe('POLICY_ALREADY_REGISTERED');
      }
    });

    it('should throw PolicyLimitExceededError when limit reached', async () => {
      const limitConfig = { maxPolicies: 2, defaultEnforcementLevel: EnforcementLevel.Advisory };
      const pe = new PolicyEngine(limitConfig, mockRuleEngine, mockEventBus);
      await pe.registerPolicy(createTestPolicy());
      await pe.registerPolicy(createTestPolicy());
      await expect(pe.registerPolicy(createTestPolicy())).rejects.toThrow(PolicyLimitExceededError);
    });

    it('should have correct code on limit exceeded', async () => {
      const pe = new PolicyEngine({ maxPolicies: 1, defaultEnforcementLevel: EnforcementLevel.Advisory }, mockRuleEngine, mockEventBus);
      await pe.registerPolicy(createTestPolicy());
      try {
        await pe.registerPolicy(createTestPolicy());
        expect.unreachable('should have thrown');
      } catch (err) {
        expect((err as PolicyLimitExceededError).code).toBe('POLICY_LIMIT_EXCEEDED');
      }
    });

    it('should publish compliance.policy.registered event', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.eventType).toBe('compliance.policy.registered');
      expect(event.policyId).toBe(policy.id);
      expect(event.policyName).toBe(policy.name);
      expect(event.source).toBe(policy.source);
    });

    it('should not publish event when no eventBus', async () => {
      const pe = new PolicyEngine(
        { ...DefaultComplianceRuntimeConfig.policyEngine },
        mockRuleEngine,
      );
      const policy = createTestPolicy();
      await pe.registerPolicy(policy);
      const retrieved = await pe.getPolicy(policy.id);
      expect(retrieved).not.toBeNull();
    });

    it('should preserve all policy properties', async () => {
      const policy = createTestPolicy({
        name: 'Governance Policy',
        rules: [brandRuleId('r1'), brandRuleId('r2')],
        metadata: { version: '2.0' },
      });
      await policyEngine.registerPolicy(policy);
      const retrieved = await policyEngine.getPolicy(policy.id);
      expect(retrieved!.name).toBe('Governance Policy');
      expect(retrieved!.rules).toEqual([brandRuleId('r1'), brandRuleId('r2')]);
      expect(retrieved!.metadata).toEqual({ version: '2.0' });
    });

    it('should register multiple different policies', async () => {
      const p1 = createTestPolicy({ id: brandPolicyId('p-a') });
      const p2 = createTestPolicy({ id: brandPolicyId('p-b') });
      const p3 = createTestPolicy({ id: brandPolicyId('p-c') });
      await policyEngine.registerPolicy(p1);
      await policyEngine.registerPolicy(p2);
      await policyEngine.registerPolicy(p3);
      expect(await policyEngine.count()).toBe(3);
    });

    it('should register a disabled policy', async () => {
      const policy = createTestPolicy({ enabled: false });
      await policyEngine.registerPolicy(policy);
      const retrieved = await policyEngine.getPolicy(policy.id);
      expect(retrieved!.enabled).toBe(false);
    });

    it('should register a policy with empty rules list', async () => {
      const policy = createTestPolicy({ rules: [] });
      await policyEngine.registerPolicy(policy);
      const retrieved = await policyEngine.getPolicy(policy.id);
      expect(retrieved!.rules).toEqual([]);
    });
  });

  // ─── unregisterPolicy ───────────────────────────────────────────
  describe('unregisterPolicy', () => {
    it('should unregister a registered policy', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      await policyEngine.unregisterPolicy(policy.id);
      expect(await policyEngine.getPolicy(policy.id)).toBeNull();
    });

    it('should decrement count after unregistration', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      expect(await policyEngine.count()).toBe(1);
      await policyEngine.unregisterPolicy(policy.id);
      expect(await policyEngine.count()).toBe(0);
    });

    it('should throw PolicyNotFoundError for non-existent policy', async () => {
      await expect(policyEngine.unregisterPolicy(brandPolicyId('nope'))).rejects.toThrow(PolicyNotFoundError);
    });

    it('should have correct code on not found', async () => {
      try {
        await policyEngine.unregisterPolicy(brandPolicyId('nope'));
        expect.unreachable('should have thrown');
      } catch (err) {
        expect((err as PolicyNotFoundError).code).toBe('POLICY_NOT_FOUND');
      }
    });

    it('should allow registering after unregistering', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      await policyEngine.unregisterPolicy(policy.id);
      await policyEngine.registerPolicy(policy);
      expect(await policyEngine.count()).toBe(1);
    });
  });

  // ─── getPolicy ──────────────────────────────────────────────────
  describe('getPolicy', () => {
    it('should return null for non-existent policy', async () => {
      expect(await policyEngine.getPolicy(brandPolicyId('nope'))).toBeNull();
    });

    it('should return the registered policy', async () => {
      const policy = createTestPolicy({ name: 'Find Me' });
      await policyEngine.registerPolicy(policy);
      const result = await policyEngine.getPolicy(policy.id);
      expect(result!.name).toBe('Find Me');
    });

    it('should return frozen object', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      const result = await policyEngine.getPolicy(policy.id);
      expect(Object.isFrozen(result!)).toBe(true);
    });
  });

  // ─── listPolicies ───────────────────────────────────────────────
  describe('listPolicies', () => {
    it('should return empty array when no policies', async () => {
      expect(await policyEngine.listPolicies()).toEqual([]);
    });

    it('should return all registered policies', async () => {
      const p1 = createTestPolicy({ id: brandPolicyId('lp-1') });
      const p2 = createTestPolicy({ id: brandPolicyId('lp-2') });
      await policyEngine.registerPolicy(p1);
      await policyEngine.registerPolicy(p2);
      const list = await policyEngine.listPolicies();
      expect(list).toHaveLength(2);
    });

    it('should not include unregistered policies', async () => {
      const p1 = createTestPolicy({ id: brandPolicyId('lp-rem') });
      const p2 = createTestPolicy({ id: brandPolicyId('lp-keep') });
      await policyEngine.registerPolicy(p1);
      await policyEngine.registerPolicy(p2);
      await policyEngine.unregisterPolicy(brandPolicyId('lp-rem'));
      const list = await policyEngine.listPolicies();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(brandPolicyId('lp-keep'));
    });
  });

  // ─── evaluatePolicy ─────────────────────────────────────────────
  describe('evaluatePolicy', () => {
    it('should delegate to ruleEngine.evaluateRules with policy ruleIds', async () => {
      const ruleId1 = brandRuleId('pe-r1');
      const ruleId2 = brandRuleId('pe-r2');
      const policy = createTestPolicy({ rules: [ruleId1, ruleId2] });
      await policyEngine.registerPolicy(policy);
      const request = createTestRequest();
      await policyEngine.evaluatePolicy(policy.id, request);
      expect(mockEvaluateRules).toHaveBeenCalledTimes(1);
      const callArg = mockEvaluateRules.mock.calls[0][0];
      expect(callArg.ruleIds).toEqual([ruleId1, ruleId2]);
    });

    it('should preserve other request properties when delegating', async () => {
      const policy = createTestPolicy({ rules: [brandRuleId('deleg-r1')] });
      await policyEngine.registerPolicy(policy);
      const request = createTestRequest({
        targetType: ValidationTargetType.Documentation,
        targetPath: '/docs/guide.md',
        targetContent: '# Guide',
        metadata: { traceId: 't-1' },
      });
      await policyEngine.evaluatePolicy(policy.id, request);
      const callArg = mockEvaluateRules.mock.calls[0][0];
      expect(callArg.targetType).toBe(ValidationTargetType.Documentation);
      expect(callArg.targetPath).toBe('/docs/guide.md');
      expect(callArg.targetContent).toBe('# Guide');
      expect(callArg.metadata).toEqual({ traceId: 't-1' });
    });

    it('should throw PolicyNotFoundError for non-existent policy', async () => {
      await expect(
        policyEngine.evaluatePolicy(brandPolicyId('nope'), createTestRequest()),
      ).rejects.toThrow(PolicyNotFoundError);
    });

    it('should return the result from ruleEngine.evaluateRules', async () => {
      const policy = createTestPolicy({ rules: [brandRuleId('ret-r1')] });
      await policyEngine.registerPolicy(policy);
      const result = await policyEngine.evaluatePolicy(policy.id, createTestRequest());
      expect(result).toBe(evaluateRulesResult);
    });

    it('should pass empty rules array if policy has no rules', async () => {
      const policy = createTestPolicy({ rules: [] });
      await policyEngine.registerPolicy(policy);
      await policyEngine.evaluatePolicy(policy.id, createTestRequest());
      const callArg = mockEvaluateRules.mock.calls[0][0];
      expect(callArg.ruleIds).toEqual([]);
    });

    it('should pass sessionId from request to delegate', async () => {
      const policy = createTestPolicy({ rules: [brandRuleId('sid-r1')] });
      await policyEngine.registerPolicy(policy);
      const sessionId = brandComplianceSessionId('specific-session');
      await policyEngine.evaluatePolicy(policy.id, createTestRequest({ sessionId }));
      const callArg = mockEvaluateRules.mock.calls[0][0];
      expect(callArg.sessionId).toBe(sessionId);
    });

    it('should override request ruleIds with policy ruleIds', async () => {
      const policy = createTestPolicy({ rules: [brandRuleId('ov-r1')] });
      await policyEngine.registerPolicy(policy);
      const request = createTestRequest({ ruleIds: [brandRuleId('orig-r1')] });
      await policyEngine.evaluatePolicy(policy.id, request);
      const callArg = mockEvaluateRules.mock.calls[0][0];
      expect(callArg.ruleIds).toEqual([brandRuleId('ov-r1')]);
    });
  });

  // ─── getRulesForPolicy ──────────────────────────────────────────
  describe('getRulesForPolicy', () => {
    it('should return rule IDs for a registered policy', async () => {
      const r1 = brandRuleId('grp-r1');
      const r2 = brandRuleId('grp-r2');
      const policy = createTestPolicy({ rules: [r1, r2] });
      await policyEngine.registerPolicy(policy);
      const rules = await policyEngine.getRulesForPolicy(policy.id);
      expect(rules).toEqual([r1, r2]);
    });

    it('should throw PolicyNotFoundError for non-existent policy', async () => {
      await expect(policyEngine.getRulesForPolicy(brandPolicyId('nope'))).rejects.toThrow(PolicyNotFoundError);
    });

    it('should return empty array for policy with no rules', async () => {
      const policy = createTestPolicy({ rules: [] });
      await policyEngine.registerPolicy(policy);
      const rules = await policyEngine.getRulesForPolicy(policy.id);
      expect(rules).toEqual([]);
    });

    it('should return a single rule ID', async () => {
      const r1 = brandRuleId('single-r');
      const policy = createTestPolicy({ rules: [r1] });
      await policyEngine.registerPolicy(policy);
      const rules = await policyEngine.getRulesForPolicy(policy.id);
      expect(rules).toHaveLength(1);
      expect(rules[0]).toBe(r1);
    });
  });

  // ─── count ──────────────────────────────────────────────────────
  describe('count', () => {
    it('should return 0 when no policies', async () => {
      expect(await policyEngine.count()).toBe(0);
    });

    it('should reflect registrations and unregistrations', async () => {
      const p1 = createTestPolicy();
      const p2 = createTestPolicy();
      await policyEngine.registerPolicy(p1);
      await policyEngine.registerPolicy(p2);
      expect(await policyEngine.count()).toBe(2);
      await policyEngine.unregisterPolicy(p1.id);
      expect(await policyEngine.count()).toBe(1);
    });
  });

  // ─── event publishing ───────────────────────────────────────────
  describe('event publishing', () => {
    it('should include metadata from policy in event', async () => {
      const policy = createTestPolicy({ metadata: { env: 'test' } });
      await policyEngine.registerPolicy(policy);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.metadata).toEqual({ env: 'test' });
    });

    it('should include aggregateId from policy ID', async () => {
      const policy = createTestPolicy({ id: brandPolicyId('agg-test') });
      await policyEngine.registerPolicy(policy);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.aggregateId).toBe('agg-test');
    });

    it('should include aggregateType as CompliancePolicy', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.aggregateType).toBe('CompliancePolicy');
    });

    it('should publish event with Action classification', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.classification).toBe('action');
    });

    it('should include eventId', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
    });

    it('should include version', async () => {
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.version).toBe('1.0.0');
    });

    it('should include timestamp', async () => {
      const before = new Date().toISOString();
      const policy = createTestPolicy();
      await policyEngine.registerPolicy(policy);
      const after = new Date().toISOString();
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.timestamp >= before).toBe(true);
      expect(event.timestamp <= after).toBe(true);
    });
  });

  // ─── Policy limit behavior ──────────────────────────────────────
  describe('policy limit behavior', () => {
    it('should allow exactly maxPolicies registrations', async () => {
      const pe = new PolicyEngine({ maxPolicies: 3, defaultEnforcementLevel: EnforcementLevel.Advisory }, mockRuleEngine, mockEventBus);
      await pe.registerPolicy(createTestPolicy());
      await pe.registerPolicy(createTestPolicy());
      await pe.registerPolicy(createTestPolicy());
      expect(await pe.count()).toBe(3);
    });

    it('should fail on maxPolicies + 1', async () => {
      const pe = new PolicyEngine({ maxPolicies: 1, defaultEnforcementLevel: EnforcementLevel.Advisory }, mockRuleEngine, mockEventBus);
      await pe.registerPolicy(createTestPolicy());
      await expect(pe.registerPolicy(createTestPolicy())).rejects.toThrow(PolicyLimitExceededError);
    });

    it('should allow registration after unregistering (room freed)', async () => {
      const pe = new PolicyEngine({ maxPolicies: 1, defaultEnforcementLevel: EnforcementLevel.Advisory }, mockRuleEngine, mockEventBus);
      const p1 = createTestPolicy();
      await pe.registerPolicy(p1);
      await pe.unregisterPolicy(p1.id);
      await pe.registerPolicy(createTestPolicy());
      expect(await pe.count()).toBe(1);
    });
  });

  // ─── Policy property variations ─────────────────────────────────
  describe('policy property variations', () => {
    it('should handle policy with all enforcement levels', async () => {
      const pAdv = createTestPolicy({ id: brandPolicyId('pel-adv'), enforcementLevel: EnforcementLevel.Advisory });
      const pBlk = createTestPolicy({ id: brandPolicyId('pel-blk'), enforcementLevel: EnforcementLevel.Blocking });
      await policyEngine.registerPolicy(pAdv);
      await policyEngine.registerPolicy(pBlk);
      const adv = await policyEngine.getPolicy(brandPolicyId('pel-adv'));
      const blk = await policyEngine.getPolicy(brandPolicyId('pel-blk'));
      expect(adv!.enforcementLevel).toBe(EnforcementLevel.Advisory);
      expect(blk!.enforcementLevel).toBe(EnforcementLevel.Blocking);
    });

    it('should handle policy with many rules', async () => {
      const rules = Array.from({ length: 50 }, (_, i) => brandRuleId(`many-r-${i}`));
      const policy = createTestPolicy({ rules });
      await policyEngine.registerPolicy(policy);
      const retrieved = await policyEngine.getRulesForPolicy(policy.id);
      expect(retrieved).toHaveLength(50);
    });

    it('should handle policy with various source references', async () => {
      const policy = createTestPolicy({ source: 'GOV-008.000 §3.2.1' });
      await policyEngine.registerPolicy(policy);
      const retrieved = await policyEngine.getPolicy(policy.id);
      expect(retrieved!.source).toBe('GOV-008.000 §3.2.1');
    });
  });
});
