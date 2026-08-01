import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { RuleEngine } from '../../core/compliance/rule-engine.js';
import { PolicyEngine } from '../../core/compliance/policy-engine.js';
import { DefaultComplianceRuntimeConfig } from '../../core/compliance/types.js';
import {
  brandRuleId,
  brandPolicyId,
  brandComplianceSessionId,
  brandValidatorId,
  RuleCategory,
  RuleSeverity,
  EnforcementLevel,
  AutoFixCapability,
  ValidationTargetType,
  ComplianceState,
} from '../../core/compliance/types.js';
import type {
  ComplianceRule,
  CompliancePolicy,
  ValidationRequest,
  RuleEvaluationResult,
  PolicyEngineConfig,
  RuleEngineConfig,
} from '../../core/compliance/types.js';
import {
  PolicyAlreadyRegisteredError,
  PolicyNotFoundError,
  PolicyLimitExceededError,
  ComplianceError,
} from '../../core/compliance/errors.js';
import { EventClassification } from '../../core/types/common.js';

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

let ruleCounter = 0;
let policyCounter = 0;

function makeRule(overrides: Partial<ComplianceRule> = {}): ComplianceRule {
  return Object.freeze({
    id: brandRuleId(`TEST-RULE-${++ruleCounter}-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    name: 'Test Rule',
    description: 'Test rule description',
    category: RuleCategory.Architecture,
    severity: RuleSeverity.Warning,
    enforcementLevel: EnforcementLevel.Advisory,
    autoFix: AutoFixCapability.None,
    source: 'TEST',
    validatorId: brandValidatorId('test'),
    enabled: true,
    tags: [],
    metadata: {},
    ...overrides,
  });
}

function makePolicy(overrides: Partial<CompliancePolicy> = {}): CompliancePolicy {
  return Object.freeze({
    id: brandPolicyId(`TEST-POLICY-${++policyCounter}-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    name: 'Test Policy',
    description: 'Test policy description',
    source: 'GOV-001',
    rules: [],
    enforcementLevel: EnforcementLevel.Advisory,
    enabled: true,
    createdAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

function makeRequest(overrides: Partial<ValidationRequest> = {}): ValidationRequest {
  return Object.freeze({
    targetType: ValidationTargetType.Architecture,
    targetPath: 'test/module.ts',
    sessionId: brandComplianceSessionId('test-session'),
    metadata: {},
    ...overrides,
  });
}

function makeRuleConfig(overrides: Partial<RuleEngineConfig> = {}): RuleEngineConfig {
  return {
    maxConcurrentEvaluations: 10,
    evaluationTimeoutMs: 30000,
    failFast: false,
    autoFixEnabled: true,
    cacheResults: true,
    cacheTtlMs: 300000,
    ...overrides,
  };
}

function makePolicyConfig(overrides: Partial<PolicyEngineConfig> = {}): PolicyEngineConfig {
  return {
    maxPolicies: 100,
    defaultEnforcementLevel: EnforcementLevel.Advisory,
    ...overrides,
  };
}

function makePassingResult(rule: ComplianceRule): RuleEvaluationResult {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    severity: rule.severity,
    passed: true,
    violations: [],
    durationMs: 1,
    autoFixed: false,
    metadata: {},
  };
}

function makeFailingResultRule(rule: ComplianceRule): RuleEvaluationResult {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    severity: rule.severity,
    passed: false,
    violations: [],
    durationMs: 2,
    autoFixed: false,
    metadata: {},
  };
}

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

describe('PolicyEngine', () => {
  let eventBus: InProcessEventBus;
  let ruleEngine: RuleEngine;
  let policyConfig: PolicyEngineConfig;
  let ruleConfig: RuleEngineConfig;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    ruleConfig = makeRuleConfig();
    policyConfig = makePolicyConfig();
    ruleEngine = new RuleEngine(ruleConfig, eventBus);
  });

  // ─────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────
  describe('constructor', () => {
    it('should create an instance with config and ruleEngine', () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine);
      expect(engine).toBeInstanceOf(PolicyEngine);
    });

    it('should create an instance with config, ruleEngine, and eventBus', () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      expect(engine).toBeInstanceOf(PolicyEngine);
    });

    it('should create an instance when eventBus is undefined', () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, undefined);
      expect(engine).toBeInstanceOf(PolicyEngine);
    });

    it('should create an instance when eventBus is null', () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, null);
      expect(engine).toBeInstanceOf(PolicyEngine);
    });

    it('should start with zero policies', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine);
      expect(await engine.count()).toBe(0);
    });

    it('should work with default compliance runtime config', () => {
      const engine = new PolicyEngine(DefaultComplianceRuntimeConfig.policyEngine, ruleEngine);
      expect(engine).toBeInstanceOf(PolicyEngine);
    });

    it('should accept custom maxPolicies', async () => {
      const cfg = makePolicyConfig({ maxPolicies: 5 });
      const engine = new PolicyEngine(cfg, ruleEngine);
      expect(engine).toBeInstanceOf(PolicyEngine);
    });

    it('should accept custom defaultEnforcementLevel', async () => {
      const cfg = makePolicyConfig({ defaultEnforcementLevel: EnforcementLevel.Blocking });
      const engine = new PolicyEngine(cfg, ruleEngine);
      expect(engine).toBeInstanceOf(PolicyEngine);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // REGISTER POLICY
  // ─────────────────────────────────────────────────────────────────
  describe('registerPolicy', () => {
    it('should register a policy successfully', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      expect(await engine.count()).toBe(1);
    });

    it('should store the policy by id', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      const retrieved = await engine.getPolicy(policy.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(policy.id);
    });

    it('should freeze the stored policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      const retrieved = await engine.getPolicy(policy.id);
      expect(Object.isFrozen(retrieved)).toBe(true);
    });

    it('should throw PolicyAlreadyRegisteredError for duplicate id', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      await expect(engine.registerPolicy(policy)).rejects.toThrow(PolicyAlreadyRegisteredError);
    });

    it('should throw PolicyAlreadyRegisteredError with correct policyId', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      try {
        await engine.registerPolicy(policy);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(PolicyAlreadyRegisteredError);
        expect((err as PolicyAlreadyRegisteredError).policyId).toBe(policy.id as string);
      }
    });

    it('should throw ComplianceError base class for duplicate', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      await expect(engine.registerPolicy(policy)).rejects.toBeInstanceOf(ComplianceError);
    });

    it('should throw Error base class for duplicate', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      await expect(engine.registerPolicy(policy)).rejects.toBeInstanceOf(Error);
    });

    it('should throw PolicyAlreadyRegisteredError with correct code', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      try {
        await engine.registerPolicy(policy);
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as PolicyAlreadyRegisteredError).code).toBe('POLICY_ALREADY_REGISTERED');
      }
    });

    it('should throw PolicyLimitExceededError when at max', async () => {
      const cfg = makePolicyConfig({ maxPolicies: 2 });
      const engine = new PolicyEngine(cfg, ruleEngine, eventBus);
      await engine.registerPolicy(makePolicy());
      await engine.registerPolicy(makePolicy());
      await expect(engine.registerPolicy(makePolicy())).rejects.toThrow(PolicyLimitExceededError);
    });

    it('should throw PolicyLimitExceededError with correct max', async () => {
      const cfg = makePolicyConfig({ maxPolicies: 1 });
      const engine = new PolicyEngine(cfg, ruleEngine, eventBus);
      await engine.registerPolicy(makePolicy());
      try {
        await engine.registerPolicy(makePolicy());
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(PolicyLimitExceededError);
      }
    });

    it('should throw ComplianceError for PolicyLimitExceededError', async () => {
      const cfg = makePolicyConfig({ maxPolicies: 1 });
      const engine = new PolicyEngine(cfg, ruleEngine, eventBus);
      await engine.registerPolicy(makePolicy());
      await expect(engine.registerPolicy(makePolicy())).rejects.toBeInstanceOf(ComplianceError);
    });

    it('should not exceed maxPolicies by 1', async () => {
      const cfg = makePolicyConfig({ maxPolicies: 3 });
      const engine = new PolicyEngine(cfg, ruleEngine, eventBus);
      await engine.registerPolicy(makePolicy());
      await engine.registerPolicy(makePolicy());
      await engine.registerPolicy(makePolicy());
      expect(await engine.count()).toBe(3);
      await expect(engine.registerPolicy(makePolicy())).rejects.toThrow(PolicyLimitExceededError);
    });

    it('should publish PolicyRegisteredEvent when eventBus is provided', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      const log = eventBus.getLog();
      const policyEvent = log.find((e) => e.eventType === 'compliance.policy.registered');
      expect(policyEvent).toBeDefined();
    });

    it('should publish PolicyRegisteredEvent with Action classification', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      const log = eventBus.getLog();
      const policyEvent = log.find((e) => e.eventType === 'compliance.policy.registered');
      expect(policyEvent!.classification).toBe(EventClassification.Action);
    });

    it('should not publish event when no eventBus', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      expect(await engine.count()).toBe(1);
    });

    it('should publish event with version', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      const log = eventBus.getLog();
      const policyEvent = log.find((e) => e.eventType === 'compliance.policy.registered');
      expect(policyEvent!.version).toBe('1.0.0');
    });

    it('should publish event with timestamp', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      const log = eventBus.getLog();
      const policyEvent = log.find((e) => e.eventType === 'compliance.policy.registered');
      expect(typeof policyEvent!.timestamp).toBe('string');
    });

    it('should publish event with sequence number', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      const log = eventBus.getLog();
      const policyEvent = log.find((e) => e.eventType === 'compliance.policy.registered');
      expect(typeof policyEvent!.sequence).toBe('number');
      expect(policyEvent!.sequence).toBeGreaterThan(0);
    });

    it('should publish event with unique eventId', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      const log = eventBus.getLog();
      const policyEvent = log.find((e) => e.eventType === 'compliance.policy.registered');
      expect(typeof policyEvent!.eventId).toBe('string');
      expect(policyEvent!.eventId.length).toBeGreaterThan(0);
    });

    it('should store policy with all properties intact', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      const policy = makePolicy({
        name: 'Custom Policy',
        description: 'Custom Description',
        source: 'GOV-999',
        rules: [rule.id],
        enforcementLevel: EnforcementLevel.Blocking,
        enabled: true,
        metadata: { key: 'value' },
      });
      await engine.registerPolicy(policy);
      const stored = await engine.getPolicy(policy.id);
      expect(stored!.name).toBe('Custom Policy');
      expect(stored!.description).toBe('Custom Description');
      expect(stored!.source).toBe('GOV-999');
      expect(stored!.rules).toEqual([rule.id]);
      expect(stored!.enforcementLevel).toBe(EnforcementLevel.Blocking);
      expect(stored!.enabled).toBe(true);
      expect(stored!.metadata).toEqual({ key: 'value' });
    });

    it('should register multiple different policies', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await engine.registerPolicy(makePolicy({ name: 'P1' }));
      await engine.registerPolicy(makePolicy({ name: 'P2' }));
      await engine.registerPolicy(makePolicy({ name: 'P3' }));
      expect(await engine.count()).toBe(3);
    });

    it('should handle policy with empty rules array', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy({ rules: [] });
      await engine.registerPolicy(policy);
      const stored = await engine.getPolicy(policy.id);
      expect(stored!.rules).toEqual([]);
    });

    it('should handle policy with multiple rule references', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      const rule3 = makeRule({ name: 'R3' });
      const policy = makePolicy({ rules: [rule1.id, rule2.id, rule3.id] });
      await engine.registerPolicy(policy);
      const stored = await engine.getPolicy(policy.id);
      expect(stored!.rules.length).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // UNREGISTER POLICY
  // ─────────────────────────────────────────────────────────────────
  describe('unregisterPolicy', () => {
    it('should unregister a registered policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      await engine.unregisterPolicy(policy.id);
      expect(await engine.count()).toBe(0);
    });

    it('should throw PolicyNotFoundError for unknown policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await expect(engine.unregisterPolicy(brandPolicyId('NONEXISTENT'))).rejects.toThrow(PolicyNotFoundError);
    });

    it('should throw PolicyNotFoundError with correct policyId', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const fakeId = brandPolicyId('NONEXISTENT');
      try {
        await engine.unregisterPolicy(fakeId);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(PolicyNotFoundError);
        expect((err as PolicyNotFoundError).policyId).toBe(fakeId as string);
      }
    });

    it('should throw ComplianceError for unknown policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await expect(engine.unregisterPolicy(brandPolicyId('NONEXISTENT'))).rejects.toBeInstanceOf(ComplianceError);
    });

    it('should throw Error base class for unknown policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await expect(engine.unregisterPolicy(brandPolicyId('NONEXISTENT'))).rejects.toBeInstanceOf(Error);
    });

    it('should make getPolicy return null after unregister', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      await engine.unregisterPolicy(policy.id);
      const result = await engine.getPolicy(policy.id);
      expect(result).toBeNull();
    });

    it('should allow re-registering after unregistering', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      await engine.unregisterPolicy(policy.id);
      await engine.registerPolicy(policy);
      expect(await engine.count()).toBe(1);
    });

    it('should handle multiple unregistrations', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const p1 = makePolicy();
      const p2 = makePolicy();
      const p3 = makePolicy();
      await engine.registerPolicy(p1);
      await engine.registerPolicy(p2);
      await engine.registerPolicy(p3);
      await engine.unregisterPolicy(p1.id);
      await engine.unregisterPolicy(p3.id);
      expect(await engine.count()).toBe(1);
      const remaining = await engine.getPolicy(p2.id);
      expect(remaining).not.toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET POLICY
  // ─────────────────────────────────────────────────────────────────
  describe('getPolicy', () => {
    it('should return the policy if found', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy({ name: 'GetTest' });
      await engine.registerPolicy(policy);
      const result = await engine.getPolicy(policy.id);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('GetTest');
    });

    it('should return null if policy not found', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const result = await engine.getPolicy(brandPolicyId('NONEXISTENT'));
      expect(result).toBeNull();
    });

    it('should return frozen policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      const result = await engine.getPolicy(policy.id);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should return policy with correct id', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      const result = await engine.getPolicy(policy.id);
      expect(result!.id).toBe(policy.id);
    });

    it('should return policy with correct description', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy({ description: 'My description' });
      await engine.registerPolicy(policy);
      const result = await engine.getPolicy(policy.id);
      expect(result!.description).toBe('My description');
    });

    it('should return policy with correct source', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy({ source: 'GOV-042' });
      await engine.registerPolicy(policy);
      const result = await engine.getPolicy(policy.id);
      expect(result!.source).toBe('GOV-042');
    });

    it('should return policy with correct enforcementLevel', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy({ enforcementLevel: EnforcementLevel.Blocking });
      await engine.registerPolicy(policy);
      const result = await engine.getPolicy(policy.id);
      expect(result!.enforcementLevel).toBe(EnforcementLevel.Blocking);
    });

    it('should return policy with correct enabled state', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy({ enabled: false });
      await engine.registerPolicy(policy);
      const result = await engine.getPolicy(policy.id);
      expect(result!.enabled).toBe(false);
    });

    it('should return policy with correct createdAt', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const now = new Date().toISOString();
      const policy = makePolicy({ createdAt: now });
      await engine.registerPolicy(policy);
      const result = await engine.getPolicy(policy.id);
      expect(result!.createdAt).toBe(now);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // LIST POLICIES
  // ─────────────────────────────────────────────────────────────────
  describe('listPolicies', () => {
    it('should return empty array when no policies registered', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policies = await engine.listPolicies();
      expect(policies).toEqual([]);
    });

    it('should return all registered policies', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
 await engine.registerPolicy(makePolicy({ name: 'P1' }));
      await engine.registerPolicy(makePolicy({ name: 'P2' }));
      const policies = await engine.listPolicies();
      expect(policies.length).toBe(2);
    });

    it('should return readonly array', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await engine.registerPolicy(makePolicy());
      const policies = await engine.listPolicies();
      expect(Array.isArray(policies)).toBe(true);
    });

    it('should return correct number after unregistrations', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const p1 = makePolicy();
      const p2 = makePolicy();
      const p3 = makePolicy();
      await engine.registerPolicy(p1);
      await engine.registerPolicy(p2);
      await engine.registerPolicy(p3);
      await engine.unregisterPolicy(p2.id);
      const policies = await engine.listPolicies();
      expect(policies.length).toBe(2);
    });

    it('should list all policies with correct properties', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const p1 = makePolicy({ name: 'First', source: 'SRC-1' });
      const p2 = makePolicy({ name: 'Second', source: 'SRC-2' });
      await engine.registerPolicy(p1);
      await engine.registerPolicy(p2);
      const policies = await engine.listPolicies();
      const names = policies.map((p) => p.name);
      expect(names).toContain('First');
      expect(names).toContain('Second');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // EVALUATE POLICY
  // ─────────────────────────────────────────────────────────────────
  describe('evaluatePolicy', () => {
    it('should throw PolicyNotFoundError for non-existent policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const request = makeRequest();
      await expect(engine.evaluatePolicy(brandPolicyId('NONEXISTENT'), request)).rejects.toThrow(PolicyNotFoundError);
    });

    it('should throw PolicyNotFoundError with correct policyId', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const fakeId = brandPolicyId('NONEXISTENT');
      const request = makeRequest();
      try {
        await engine.evaluatePolicy(fakeId, request);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(PolicyNotFoundError);
        expect((err as PolicyNotFoundError).policyId).toBe(fakeId as string);
      }
    });

    it('should throw ComplianceError for non-existent policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const request = makeRequest();
      await expect(engine.evaluatePolicy(brandPolicyId('NONEXISTENT'), request)).rejects.toBeInstanceOf(ComplianceError);
    });

    it('should delegate to ruleEngine.evaluateRules', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result).toBeDefined();
      expect(result.sessionId).toBe(request.sessionId);
    });

    it('should evaluate only the rules in the policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule1 = makeRule({ name: 'InPolicy' });
      const rule2 = makeRule({ name: 'NotInPolicy' });
      await ruleEngine.registerRule(rule1);
      await ruleEngine.registerRule(rule2);
      const policy = makePolicy({ rules: [rule1.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.totalRules).toBe(1);
    });

    it('should evaluate multiple rules in the policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      const rule3 = makeRule({ name: 'R3' });
      await ruleEngine.registerRule(rule1);
      await ruleEngine.registerRule(rule2);
      await ruleEngine.registerRule(rule3);
      const policy = makePolicy({ rules: [rule1.id, rule2.id, rule3.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.totalRules).toBe(3);
    });

    it('should handle policy with no rules', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy({ rules: [] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.totalRules).toBe(0);
      expect(result.state).toBe(ComplianceState.Completed);
    });

    it('should pass request metadata through to evaluation', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const meta = { custom: 'data' };
      const request = makeRequest({ metadata: meta });
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result).toBeDefined();
    });

    it('should return result with correct sessionId', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const sessionId = brandComplianceSessionId('policy-session');
      const request = makeRequest({ sessionId });
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.sessionId).toBe(sessionId);
    });

    it('should return result with correct targetType', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest({ targetType: ValidationTargetType.Documentation });
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.targetType).toBe(ValidationTargetType.Documentation);
    });

    it('should return result with correct targetPath', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest({ targetPath: 'docs/readme.md' });
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.targetPath).toBe('docs/readme.md');
    });

    it('should include startedAt and completedAt', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(typeof result.startedAt).toBe('string');
      expect(typeof result.completedAt).toBe('string');
    });

    it('should include durationMs', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(typeof result.durationMs).toBe('number');
    });

    it('should return frozen result', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should return correct state when all pass', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      await ruleEngine.registerValidatorFunction(rule.id, async () => makePassingResult(rule));
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.state).toBe(ComplianceState.Completed);
      expect(result.passedRules).toBe(1);
      expect(result.failedRules).toBe(0);
    });

    it('should return correct state when all fail', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      // No validator = fail
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.state).toBe(ComplianceState.Completed);
      expect(result.passedRules).toBe(0);
      expect(result.failedRules).toBe(1);
    });

    it('should handle policy referencing non-existent rules gracefully', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const fakeRuleId = brandRuleId('NONEXISTENT-RULE');
      const policy = makePolicy({ rules: [fakeRuleId] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      // Non-existent rules in ruleIds are simply not found by the rule engine
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.totalRules).toBe(0);
    });

    it('should skip disabled rules referenced in the policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule1 = makeRule({ enabled: true, name: 'Enabled' });
      const rule2 = makeRule({ enabled: false, name: 'Disabled' });
      await ruleEngine.registerRule(rule1);
      await ruleEngine.registerRule(rule2);
      const policy = makePolicy({ rules: [rule1.id, rule2.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.totalRules).toBe(1);
    });

    it('should evaluate only enabled rules from policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule1 = makeRule({ enabled: true, name: 'On' });
      const rule2 = makeRule({ enabled: false, name: 'Off' });
      const rule3 = makeRule({ enabled: true, name: 'On2' });
      await ruleEngine.registerRule(rule1);
      await ruleEngine.registerRule(rule2);
      await ruleEngine.registerRule(rule3);
      const policy = makePolicy({ rules: [rule1.id, rule2.id, rule3.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.totalRules).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET RULES FOR POLICY
  // ─────────────────────────────────────────────────────────────────
  describe('getRulesForPolicy', () => {
    it('should return rules for a registered policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule1 = makeRule();
      const rule2 = makeRule();
      const policy = makePolicy({ rules: [rule1.id, rule2.id] });
      await engine.registerPolicy(policy);
      const rules = await engine.getRulesForPolicy(policy.id);
      expect(rules.length).toBe(2);
      expect(rules[0]).toBe(rule1.id);
      expect(rules[1]).toBe(rule2.id);
    });

    it('should throw PolicyNotFoundError for non-existent policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await expect(engine.getRulesForPolicy(brandPolicyId('NONEXISTENT'))).rejects.toThrow(PolicyNotFoundError);
    });

    it('should throw PolicyNotFoundError with correct policyId', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const fakeId = brandPolicyId('NONEXISTENT');
      try {
        await engine.getRulesForPolicy(fakeId);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(PolicyNotFoundError);
        expect((err as PolicyNotFoundError).policyId).toBe(fakeId as string);
      }
    });

    it('should throw ComplianceError for non-existent policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await expect(engine.getRulesForPolicy(brandPolicyId('NONEXISTENT'))).rejects.toBeInstanceOf(ComplianceError);
    });

    it('should return empty array for policy with no rules', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy({ rules: [] });
      await engine.registerPolicy(policy);
      const rules = await engine.getRulesForPolicy(policy.id);
      expect(rules).toEqual([]);
    });

    it('should return readonly array', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const rules = await engine.getRulesForPolicy(policy.id);
      expect(Array.isArray(rules)).toBe(true);
    });

    it('should return rules in the order they were specified', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule1 = makeRule({ name: 'First' });
      const rule2 = makeRule({ name: 'Second' });
      const rule3 = makeRule({ name: 'Third' });
      const policy = makePolicy({ rules: [rule3.id, rule1.id, rule2.id] });
      await engine.registerPolicy(policy);
      const rules = await engine.getRulesForPolicy(policy.id);
      expect(rules[0]).toBe(rule3.id);
      expect(rules[1]).toBe(rule1.id);
      expect(rules[2]).toBe(rule2.id);
    });

    it('should return single rule for policy with one rule', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const rules = await engine.getRulesForPolicy(policy.id);
      expect(rules.length).toBe(1);
      expect(rules[0]).toBe(rule.id);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // COUNT
  // ─────────────────────────────────────────────────────────────────
  describe('count', () => {
    it('should return 0 for empty engine', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      expect(await engine.count()).toBe(0);
    });

    it('should return 1 after one registration', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await engine.registerPolicy(makePolicy());
      expect(await engine.count()).toBe(1);
    });

    it('should return 5 after five registrations', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      for (let i = 0; i < 5; i++) {
        await engine.registerPolicy(makePolicy());
      }
      expect(await engine.count()).toBe(5);
    });

    it('should decrease after unregister', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      expect(await engine.count()).toBe(1);
      await engine.unregisterPolicy(policy.id);
      expect(await engine.count()).toBe(0);
    });

    it('should correctly count after register/unregister/register cycle', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      expect(await engine.count()).toBe(1);
      await engine.unregisterPolicy(policy.id);
      expect(await engine.count()).toBe(0);
      await engine.registerPolicy(policy);
      expect(await engine.count()).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // EVENT PUBLISHING
  // ─────────────────────────────────────────────────────────────────
  describe('event publishing', () => {
    it('should not throw when eventBus is null', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, null);
      const policy = makePolicy();
      await expect(engine.registerPolicy(policy)).resolves.not.toThrow();
    });

    it('should publish events in order for multiple registrations', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await engine.registerPolicy(makePolicy({ name: 'P1' }));
      await engine.registerPolicy(makePolicy({ name: 'P2' }));
      const log = eventBus.getLog();
      const regEvents = log.filter((e) => e.eventType === 'compliance.policy.registered');
      expect(regEvents.length).toBe(2);
      expect(regEvents[0].sequence).toBeLessThan(regEvents[1].sequence);
    });

    it('should increment sequence across different event types', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy();
      await engine.registerPolicy(policy);
      await engine.unregisterPolicy(policy.id);
      const log = eventBus.getLog();
      for (let i = 1; i < log.length; i++) {
        expect(log[i].sequence).toBeGreaterThan(log[i - 1].sequence);
      }
    });

    it('should include unique eventId in all events', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await engine.registerPolicy(makePolicy({ name: 'P1' }));
      await engine.registerPolicy(makePolicy({ name: 'P2' }));
      const log = eventBus.getLog();
      const eventIds = new Set(log.map((e) => e.eventId));
      expect(eventIds.size).toBe(log.length);
    });

    it('should include version in all events', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await engine.registerPolicy(makePolicy());
      const log = eventBus.getLog();
      for (const envelope of log) {
        expect(envelope.version).toBe('1.0.0');
      }
    });

    it('should include timestamp in all events', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await engine.registerPolicy(makePolicy());
      const log = eventBus.getLog();
      for (const envelope of log) {
        expect(typeof envelope.timestamp).toBe('string');
        expect(envelope.timestamp.length).toBeGreaterThan(0);
      }
    });

    it('should share eventBus sequence with rule engine events', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      const lastRuleSeq = eventBus.getLog()[eventBus.getLog().length - 1].sequence;
      await engine.registerPolicy(makePolicy());
      const lastPolicySeq = eventBus.getLog()[eventBus.getLog().length - 1].sequence;
      expect(lastPolicySeq).toBeGreaterThan(lastRuleSeq);
    });

    it('should handle evaluating policy without eventBus', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.totalRules).toBe(1);
    });

    it('should throw PolicyNotFoundError with correct error code', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const fakeId = brandPolicyId('NONEXISTENT');
      try {
        await engine.evaluatePolicy(fakeId, makeRequest());
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as PolicyNotFoundError).code).toBe('POLICY_NOT_FOUND');
      }
    });

    it('should handle policy with duplicate rule references', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      // Same rule referenced twice - rule engine filters by Set
      const policy = makePolicy({ rules: [rule.id, rule.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      // The rule engine's selectRulesForEvaluation uses a Set, so duplicates are deduped
      expect(result.totalRules).toBe(1);
    });

    it('should return zero violations for passing policy evaluation', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const rule = makeRule();
      await ruleEngine.registerRule(rule);
      await ruleEngine.registerValidatorFunction(rule.id, async () => makePassingResult(rule));
      const policy = makePolicy({ rules: [rule.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.violations.length).toBe(0);
    });

    it('should count correctly after registering exactly maxPolicies', async () => {
      const cfg = makePolicyConfig({ maxPolicies: 5 });
      const engine = new PolicyEngine(cfg, ruleEngine, eventBus);
      for (let i = 0; i < 5; i++) {
        await engine.registerPolicy(makePolicy());
      }
      expect(await engine.count()).toBe(5);
      // The 6th should fail
      await expect(engine.registerPolicy(makePolicy())).rejects.toThrow(PolicyLimitExceededError);
    });

    it('should handle unregistering the last remaining policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const p1 = makePolicy();
      await engine.registerPolicy(p1);
      expect(await engine.count()).toBe(1);
      await engine.unregisterPolicy(p1.id);
      expect(await engine.count()).toBe(0);
      expect(await engine.listPolicies()).toEqual([]);
    });

    it('should evaluate policy with mixed enabled/disabled rules', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const r1 = makeRule({ enabled: true, name: 'On' });
      const r2 = makeRule({ enabled: false, name: 'Off' });
      const r3 = makeRule({ enabled: true, name: 'On2' });
      await ruleEngine.registerRule(r1);
      await ruleEngine.registerRule(r2);
      await ruleEngine.registerRule(r3);
      await ruleEngine.registerValidatorFunction(r1.id, async () => makePassingResult(r1));
      await ruleEngine.registerValidatorFunction(r3.id, async () => makeFailingResultRule(r3));
      const policy = makePolicy({ rules: [r1.id, r2.id, r3.id] });
      await engine.registerPolicy(policy);
      const request = makeRequest();
      const result = await engine.evaluatePolicy(policy.id, request);
      expect(result.totalRules).toBe(2);
      expect(result.passedRules).toBe(1);
      expect(result.failedRules).toBe(1);
    });

    it('should handle evaluating two different policies independently', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const r1 = makeRule({ name: 'R1' });
      const r2 = makeRule({ name: 'R2' });
      await ruleEngine.registerRule(r1);
      await ruleEngine.registerRule(r2);
      await ruleEngine.registerValidatorFunction(r1.id, async () => makePassingResult(r1));
      await ruleEngine.registerValidatorFunction(r2.id, async () => makeFailingResultRule(r2));
      const p1 = makePolicy({ rules: [r1.id] });
      const p2 = makePolicy({ rules: [r2.id] });
      await engine.registerPolicy(p1);
      await engine.registerPolicy(p2);
      const request = makeRequest();
      const [res1, res2] = await Promise.all([
        engine.evaluatePolicy(p1.id, request),
        engine.evaluatePolicy(p2.id, request),
      ]);
      expect(res1.passedRules).toBe(1);
      expect(res2.failedRules).toBe(1);
    });

    it('should handle getRulesForPolicy throwing Error base class', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await expect(engine.getRulesForPolicy(brandPolicyId('NOPE'))).rejects.toBeInstanceOf(Error);
    });

    it('should handle evaluatePolicy throwing Error base class', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await expect(engine.evaluatePolicy(brandPolicyId('NOPE'), makeRequest())).rejects.toBeInstanceOf(Error);
    });

    it('should handle unregisterPolicy throwing Error base class', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      await expect(engine.unregisterPolicy(brandPolicyId('NOPE'))).rejects.toBeInstanceOf(Error);
    });

    it('should handle policy with maxPolicies of 1', async () => {
      const cfg = makePolicyConfig({ maxPolicies: 1 });
      const engine = new PolicyEngine(cfg, ruleEngine, eventBus);
 await engine.registerPolicy(makePolicy());
      expect(await engine.count()).toBe(1);
      await expect(engine.registerPolicy(makePolicy())).rejects.toThrow(PolicyLimitExceededError);
    });

    it('should return correct metadata from stored policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy({ metadata: { version: '2.0', author: 'test' } });
      await engine.registerPolicy(policy);
      const stored = await engine.getPolicy(policy.id);
      expect(stored!.metadata).toEqual({ version: '2.0', author: 'test' });
    });

    it('should return correct tags list from stored policy', async () => {
      const engine = new PolicyEngine(policyConfig, ruleEngine, eventBus);
      const policy = makePolicy({ rules: [brandRuleId('X'), brandRuleId('Y'), brandRuleId('Z')] });
      await engine.registerPolicy(policy);
      const rules = await engine.getRulesForPolicy(policy.id);
      expect(rules.length).toBe(3);
    });
  });
});
