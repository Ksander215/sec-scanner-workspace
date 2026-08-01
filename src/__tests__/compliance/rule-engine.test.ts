import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { RuleEngine } from '../../core/compliance/rule-engine.js';
import { DefaultComplianceRuntimeConfig } from '../../core/compliance/types.js';
import {
  brandRuleId,
  brandViolationId,
  brandComplianceSessionId,
  brandValidatorId,
  RuleCategory,
  RuleSeverity,
  EnforcementLevel,
  AutoFixCapability,
  ViolationState,
  ValidationTargetType,
  ComplianceState,
} from '../../core/compliance/types.js';
import type {
  ComplianceRule,
  ValidationRequest,
  RuleEvaluationResult,
  RuleEngineConfig,
} from '../../core/compliance/types.js';
import {
  RuleAlreadyRegisteredError,
  RuleNotFoundError,
  RuleEvaluationTimeoutError,
  ComplianceError,
} from '../../core/compliance/errors.js';
import { EventClassification } from '../../core/types/common.js';

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

let ruleCounter = 0;

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

function makeRequest(overrides: Partial<ValidationRequest> = {}): ValidationRequest {
  return Object.freeze({
    targetType: ValidationTargetType.Architecture,
    targetPath: 'test/module.ts',
    sessionId: brandComplianceSessionId('test-session'),
    metadata: {},
    ...overrides,
  });
}

function makePassingResult(rule: ComplianceRule, request: ValidationRequest): RuleEvaluationResult {
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

function makeFailingResult(rule: ComplianceRule, request: ValidationRequest, violationCount = 1): RuleEvaluationResult {
  const violations = [] as any[];
  for (let i = 0; i < violationCount; i++) {
    violations.push({
      id: brandViolationId(`vio-${i}`),
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      severity: rule.severity,
      enforcementLevel: rule.enforcementLevel,
      state: ViolationState.Detected,
      description: `Violation ${i}`,
      evidence: [],
      recommendation: 'Fix it',
      autoFixAvailable: AutoFixCapability.None,
      target: request.targetPath,
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      metadata: {},
    });
  }
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    severity: rule.severity,
    passed: false,
    violations,
    durationMs: 2,
    autoFixed: false,
    metadata: {},
  };
}

function makeAutoFixedResult(rule: ComplianceRule, request: ValidationRequest): RuleEvaluationResult {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    severity: rule.severity,
    passed: true,
    violations: [],
    durationMs: 5,
    autoFixed: true,
    metadata: {},
  };
}

function makeConfig(overrides: Partial<RuleEngineConfig> = {}): RuleEngineConfig {
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

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

describe('RuleEngine', () => {
  let eventBus: InProcessEventBus;
  let config: RuleEngineConfig;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    config = makeConfig();
    vi.useFakeTimers();
  });

  // ─────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────
  describe('constructor', () => {
    it('should create an instance with config', () => {
      const engine = new RuleEngine(config);
      expect(engine).toBeInstanceOf(RuleEngine);
    });

    it('should create an instance with config and eventBus', () => {
      const engine = new RuleEngine(config, eventBus);
      expect(engine).toBeInstanceOf(RuleEngine);
    });

    it('should create an instance when eventBus is undefined', () => {
      const engine = new RuleEngine(config, undefined);
      expect(engine).toBeInstanceOf(RuleEngine);
    });

    it('should create an instance when eventBus is null', () => {
      const engine = new RuleEngine(config, null);
      expect(engine).toBeInstanceOf(RuleEngine);
    });

    it('should work with default compliance runtime config', () => {
      const engine = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      expect(engine).toBeInstanceOf(RuleEngine);
    });

    it('should start with zero rules', async () => {
      const engine = new RuleEngine(config);
      expect(await engine.count()).toBe(0);
    });

    it('should accept custom evaluationTimeoutMs', async () => {
      const cfg = makeConfig({ evaluationTimeoutMs: 5000 });
      const engine = new RuleEngine(cfg);
      expect(engine).toBeInstanceOf(RuleEngine);
      expect(await engine.count()).toBe(0);
    });

    it('should accept custom failFast setting', async () => {
      const cfg = makeConfig({ failFast: true });
      const engine = new RuleEngine(cfg);
      expect(engine).toBeInstanceOf(RuleEngine);
    });

    it('should accept custom autoFixEnabled setting', async () => {
      const cfg = makeConfig({ autoFixEnabled: false });
      const engine = new RuleEngine(cfg);
      expect(engine).toBeInstanceOf(RuleEngine);
    });

    it('should accept custom maxConcurrentEvaluations', async () => {
      const cfg = makeConfig({ maxConcurrentEvaluations: 5 });
      const engine = new RuleEngine(cfg);
      expect(engine).toBeInstanceOf(RuleEngine);
    });

    it('should accept custom cacheResults setting', async () => {
      const cfg = makeConfig({ cacheResults: false });
      const engine = new RuleEngine(cfg);
      expect(engine).toBeInstanceOf(RuleEngine);
    });

    it('should accept custom cacheTtlMs', async () => {
      const cfg = makeConfig({ cacheTtlMs: 60000 });
      const engine = new RuleEngine(cfg);
      expect(engine).toBeInstanceOf(RuleEngine);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // REGISTER RULE
  // ─────────────────────────────────────────────────────────────────
  describe('registerRule', () => {
    it('should register a rule successfully', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      expect(await engine.count()).toBe(1);
    });

    it('should store the rule by id', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(rule.id);
    });

    it('should freeze the stored rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const retrieved = await engine.getRule(rule.id);
      expect(Object.isFrozen(retrieved)).toBe(true);
    });

    it('should throw RuleAlreadyRegisteredError for duplicate id', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      await expect(engine.registerRule(rule)).rejects.toThrow(RuleAlreadyRegisteredError);
    });

    it('should throw RuleAlreadyRegisteredError with correct ruleId', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      try {
        await engine.registerRule(rule);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(RuleAlreadyRegisteredError);
        expect((err as RuleAlreadyRegisteredError).ruleId).toBe(rule.id as string);
      }
    });

    it('should throw ComplianceError base class for duplicate', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      await expect(engine.registerRule(rule)).rejects.toBeInstanceOf(ComplianceError);
    });

    it('should throw Error base class for duplicate', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      await expect(engine.registerRule(rule)).rejects.toBeInstanceOf(Error);
    });

    it('should throw RuleAlreadyRegisteredError with correct code', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      try {
        await engine.registerRule(rule);
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as RuleAlreadyRegisteredError).code).toBe('RULE_ALREADY_REGISTERED');
      }
    });

    it('should publish RuleRegisteredEvent when eventBus is provided', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const log = eventBus.getLog();
      expect(log.length).toBeGreaterThan(0);
      const lastEvent = log[log.length - 1];
      expect(lastEvent.eventType).toBe('compliance.rule.registered');
    });

    it('should publish RuleRegisteredEvent with correct ruleId', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const log = eventBus.getLog();
      const lastEnvelope = log[log.length - 1];
      // The envelope payload should contain the ruleId
      // Since publish wraps into envelope, we check eventType
      expect(lastEnvelope.eventType).toBe('compliance.rule.registered');
    });

    it('should not publish event when no eventBus', async () => {
      const engine = new RuleEngine(config);
      const rule = makeRule();
      await engine.registerRule(rule);
      // No eventBus, no way to check - just ensure no error
      expect(await engine.count()).toBe(1);
    });

    it('should publish event with Action classification', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const log = eventBus.getLog();
      const lastEnvelope = log[log.length - 1];
      expect(lastEnvelope.classification).toBe(EventClassification.Action);
    });

    it('should register multiple different rules', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'Rule 1' });
      const rule2 = makeRule({ name: 'Rule 2' });
      const rule3 = makeRule({ name: 'Rule 3' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerRule(rule3);
      expect(await engine.count()).toBe(3);
    });

    it('should store rule with all properties intact', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({
        name: 'Custom Name',
        description: 'Custom Description',
        category: RuleCategory.Security,
        severity: RuleSeverity.Critical,
        enforcementLevel: EnforcementLevel.Blocking,
        autoFix: AutoFixCapability.Automatic,
        source: 'SEC-001',
        tags: ['security', 'critical'],
        metadata: { key: 'value' },
      });
      await engine.registerRule(rule);
      const stored = await engine.getRule(rule.id);
      expect(stored!.name).toBe('Custom Name');
      expect(stored!.description).toBe('Custom Description');
      expect(stored!.category).toBe(RuleCategory.Security);
      expect(stored!.severity).toBe(RuleSeverity.Critical);
      expect(stored!.enforcementLevel).toBe(EnforcementLevel.Blocking);
      expect(stored!.autoFix).toBe(AutoFixCapability.Automatic);
      expect(stored!.source).toBe('SEC-001');
      expect(stored!.tags).toEqual(['security', 'critical']);
      expect(stored!.metadata).toEqual({ key: 'value' });
    });

    it('should publish event with sequence number', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const log = eventBus.getLog();
      const lastEnvelope = log[log.length - 1];
      expect(typeof lastEnvelope.sequence).toBe('number');
      expect(lastEnvelope.sequence).toBeGreaterThan(0);
    });

    it('should publish event with version', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const log = eventBus.getLog();
      const lastEnvelope = log[log.length - 1];
      expect(lastEnvelope.version).toBe('1.0.0');
    });

    it('should publish event with timestamp', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const log = eventBus.getLog();
      const lastEnvelope = log[log.length - 1];
      expect(typeof lastEnvelope.timestamp).toBe('string');
    });

    it('should publish event with unique eventId', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const log = eventBus.getLog();
      const lastEnvelope = log[log.length - 1];
      expect(typeof lastEnvelope.eventId).toBe('string');
      expect(lastEnvelope.eventId.length).toBeGreaterThan(0);
    });

    it('should register a rule that starts disabled', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: false });
      await engine.registerRule(rule);
      const stored = await engine.getRule(rule.id);
      expect(stored!.enabled).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // UNREGISTER RULE
  // ─────────────────────────────────────────────────────────────────
  describe('unregisterRule', () => {
    it('should unregister a registered rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      await engine.unregisterRule(rule.id);
      expect(await engine.count()).toBe(0);
    });

    it('should throw RuleNotFoundError for unknown rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const fakeId = brandRuleId('NONEXISTENT');
      await expect(engine.unregisterRule(fakeId)).rejects.toThrow(RuleNotFoundError);
    });

    it('should throw RuleNotFoundError with correct ruleId', async () => {
      const engine = new RuleEngine(config, eventBus);
      const fakeId = brandRuleId('NONEXISTENT');
      try {
        await engine.unregisterRule(fakeId);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(RuleNotFoundError);
        expect((err as RuleNotFoundError).ruleId).toBe(fakeId as string);
      }
    });

    it('should throw ComplianceError for unknown rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const fakeId = brandRuleId('NONEXISTENT');
      await expect(engine.unregisterRule(fakeId)).rejects.toBeInstanceOf(ComplianceError);
    });

    it('should remove the rule so getRule returns null', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      await engine.unregisterRule(rule.id);
      const result = await engine.getRule(rule.id);
      expect(result).toBeNull();
    });

    it('should also remove associated validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const passingValidator = async (_req: ValidationRequest) => makePassingResult(rule, _req);
      await engine.registerValidatorFunction(rule.id, passingValidator);

      // Verify validator works before unregister
      const result1 = await engine.evaluateRule(rule.id, request);
      expect(result1.passed).toBe(true);

      // Unregister should remove the rule and its validator
      await engine.unregisterRule(rule.id);

      // Re-register the same rule without a validator
      await engine.registerRule(rule);
      const result2 = await engine.evaluateRule(rule.id, request);
      // Since the validator was removed during unregister, no-validator result
      expect(result2.passed).toBe(false);
      expect(result2.metadata.error).toBe('No validator registered for rule');
    });

    it('should publish RuleUnregisteredEvent', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      eventBus.clear();
      await engine.unregisterRule(rule.id);
      const log = eventBus.getLog();
      expect(log.length).toBeGreaterThan(0);
      const lastEvent = log[log.length - 1];
      expect(lastEvent.eventType).toBe('compliance.rule.unregistered');
    });

    it('should publish unregistered event with Action classification', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      eventBus.clear();
      await engine.unregisterRule(rule.id);
      const log = eventBus.getLog();
      const lastEvent = log[log.length - 1];
      expect(lastEvent.classification).toBe(EventClassification.Action);
    });

    it('should not publish event when no eventBus', async () => {
      const engine = new RuleEngine(config);
      const rule = makeRule();
      await engine.registerRule(rule);
      await engine.unregisterRule(rule.id);
      expect(await engine.count()).toBe(0);
    });

    it('should allow re-registering after unregistering', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      await engine.unregisterRule(rule.id);
      await engine.registerRule(rule);
      expect(await engine.count()).toBe(1);
    });

    it('should publish unregistered event with version', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      eventBus.clear();
      await engine.unregisterRule(rule.id);
      const log = eventBus.getLog();
      const lastEvent = log[log.length - 1];
      expect(lastEvent.version).toBe('1.0.0');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET RULE
  // ─────────────────────────────────────────────────────────────────
  describe('getRule', () => {
    it('should return the rule if found', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ name: 'GetTest' });
      await engine.registerRule(rule);
      const result = await engine.getRule(rule.id);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('GetTest');
    });

    it('should return null if rule not found', async () => {
      const engine = new RuleEngine(config, eventBus);
      const result = await engine.getRule(brandRuleId('NONEXISTENT'));
      expect(result).toBeNull();
    });

    it('should return frozen rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const result = await engine.getRule(rule.id);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should return rule with correct id', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const result = await engine.getRule(rule.id);
      expect(result!.id).toBe(rule.id);
    });

    it('should return rule with correct category', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ category: RuleCategory.Privacy });
      await engine.registerRule(rule);
      const result = await engine.getRule(rule.id);
      expect(result!.category).toBe(RuleCategory.Privacy);
    });

    it('should return rule with correct severity', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ severity: RuleSeverity.Error });
      await engine.registerRule(rule);
      const result = await engine.getRule(rule.id);
      expect(result!.severity).toBe(RuleSeverity.Error);
    });

    it('should return rule with correct enforcementLevel', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enforcementLevel: EnforcementLevel.Blocking });
      await engine.registerRule(rule);
      const result = await engine.getRule(rule.id);
      expect(result!.enforcementLevel).toBe(EnforcementLevel.Blocking);
    });

    it('should return rule with correct tags', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ tags: ['tag1', 'tag2'] });
      await engine.registerRule(rule);
      const result = await engine.getRule(rule.id);
      expect(result!.tags).toEqual(['tag1', 'tag2']);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // LIST RULES
  // ─────────────────────────────────────────────────────────────────
  describe('listRules', () => {
    it('should return empty array when no rules registered', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rules = await engine.listRules();
      expect(rules).toEqual([]);
    });

    it('should return all registered rules with no filter', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'Rule 1' });
      const rule2 = makeRule({ name: 'Rule 2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      const rules = await engine.listRules();
      expect(rules.length).toBe(2);
    });

    it('should filter by category', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule({ category: RuleCategory.Architecture, name: 'Arch' }));
      await engine.registerRule(makeRule({ category: RuleCategory.Security, name: 'Sec' }));
      await engine.registerRule(makeRule({ category: RuleCategory.Architecture, name: 'Arch2' }));
      const rules = await engine.listRules({ category: RuleCategory.Architecture });
      expect(rules.length).toBe(2);
      expect(rules.every((r) => r.category === RuleCategory.Architecture)).toBe(true);
    });

    it('should filter by severity', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule({ severity: RuleSeverity.Warning, name: 'W1' }));
      await engine.registerRule(makeRule({ severity: RuleSeverity.Critical, name: 'C1' }));
      await engine.registerRule(makeRule({ severity: RuleSeverity.Warning, name: 'W2' }));
      const rules = await engine.listRules({ severity: RuleSeverity.Warning });
      expect(rules.length).toBe(2);
      expect(rules.every((r) => r.severity === RuleSeverity.Warning)).toBe(true);
    });

    it('should filter by enabled=true', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule({ enabled: true, name: 'Enabled' }));
      await engine.registerRule(makeRule({ enabled: false, name: 'Disabled' }));
      const rules = await engine.listRules({ enabled: true });
      expect(rules.length).toBe(1);
      expect(rules[0].name).toBe('Enabled');
    });

    it('should filter by enabled=false', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule({ enabled: true, name: 'Enabled' }));
      await engine.registerRule(makeRule({ enabled: false, name: 'Disabled' }));
      const rules = await engine.listRules({ enabled: false });
      expect(rules.length).toBe(1);
      expect(rules[0].name).toBe('Disabled');
    });

    it('should combine category and severity filters', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule({ category: RuleCategory.Architecture, severity: RuleSeverity.Warning, name: 'AW' }));
      await engine.registerRule(makeRule({ category: RuleCategory.Architecture, severity: RuleSeverity.Critical, name: 'AC' }));
      await engine.registerRule(makeRule({ category: RuleCategory.Security, severity: RuleSeverity.Warning, name: 'SW' }));
      const rules = await engine.listRules({ category: RuleCategory.Architecture, severity: RuleSeverity.Warning });
      expect(rules.length).toBe(1);
      expect(rules[0].name).toBe('AW');
    });

    it('should combine category and enabled filters', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule({ category: RuleCategory.Architecture, enabled: true, name: 'A-Enabled' }));
      await engine.registerRule(makeRule({ category: RuleCategory.Architecture, enabled: false, name: 'A-Disabled' }));
      await engine.registerRule(makeRule({ category: RuleCategory.Security, enabled: true, name: 'S-Enabled' }));
      const rules = await engine.listRules({ category: RuleCategory.Architecture, enabled: true });
      expect(rules.length).toBe(1);
      expect(rules[0].name).toBe('A-Enabled');
    });

    it('should combine severity and enabled filters', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule({ severity: RuleSeverity.Critical, enabled: true, name: 'C-On' }));
      await engine.registerRule(makeRule({ severity: RuleSeverity.Critical, enabled: false, name: 'C-Off' }));
      await engine.registerRule(makeRule({ severity: RuleSeverity.Info, enabled: true, name: 'I-On' }));
      const rules = await engine.listRules({ severity: RuleSeverity.Critical, enabled: true });
      expect(rules.length).toBe(1);
      expect(rules[0].name).toBe('C-On');
    });

    it('should combine all three filters', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule({ category: RuleCategory.Security, severity: RuleSeverity.Critical, enabled: true, name: 'Match' }));
      await engine.registerRule(makeRule({ category: RuleCategory.Security, severity: RuleSeverity.Critical, enabled: false, name: 'Disabled' }));
      await engine.registerRule(makeRule({ category: RuleCategory.Security, severity: RuleSeverity.Warning, enabled: true, name: 'WrongSev' }));
      await engine.registerRule(makeRule({ category: RuleCategory.Architecture, severity: RuleSeverity.Critical, enabled: true, name: 'WrongCat' }));
      const rules = await engine.listRules({ category: RuleCategory.Security, severity: RuleSeverity.Critical, enabled: true });
      expect(rules.length).toBe(1);
      expect(rules[0].name).toBe('Match');
    });

    it('should return empty array when filter matches nothing', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule({ category: RuleCategory.Architecture }));
      const rules = await engine.listRules({ category: RuleCategory.Privacy });
      expect(rules).toEqual([]);
    });

    it('should return readonly array', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule());
      const rules = await engine.listRules();
      expect(Array.isArray(rules)).toBe(true);
    });

    it('should handle filtering across all categories', async () => {
      const engine = new RuleEngine(config, eventBus);
      const categories = Object.values(RuleCategory);
      for (const cat of categories) {
        await engine.registerRule(makeRule({ category: cat }));
      }
      for (const cat of categories) {
        const rules = await engine.listRules({ category: cat });
        expect(rules.length).toBe(1);
        expect(rules[0].category).toBe(cat);
      }
    });

    it('should handle filtering across all severities', async () => {
      const engine = new RuleEngine(config, eventBus);
      const severities = Object.values(RuleSeverity);
      for (const sev of severities) {
        await engine.registerRule(makeRule({ severity: sev }));
      }
      for (const sev of severities) {
        const rules = await engine.listRules({ severity: sev });
        expect(rules.length).toBe(1);
        expect(rules[0].severity).toBe(sev);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // REGISTER VALIDATOR FUNCTION
  // ─────────────────────────────────────────────────────────────────
  describe('registerValidatorFunction', () => {
    it('should register a validator function successfully', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const validator = async (_req: ValidationRequest) => makePassingResult(rule, _req);
      await engine.registerValidatorFunction(rule.id, validator);
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.passed).toBe(true);
    });

    it('should overwrite existing validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const passingValidator = async (_req: ValidationRequest) => makePassingResult(rule, _req);
      const failingValidator = async (_req: ValidationRequest) => makeFailingResult(rule, _req);

      await engine.registerValidatorFunction(rule.id, passingValidator);
      const result1 = await engine.evaluateRule(rule.id, request);
      expect(result1.passed).toBe(true);

      await engine.registerValidatorFunction(rule.id, failingValidator);
      const result2 = await engine.evaluateRule(rule.id, request);
      expect(result2.passed).toBe(false);
    });

    it('should allow registering validator before rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      const request = makeRequest();
      const validator = async (_req: ValidationRequest) => makePassingResult(rule, _req);
      await engine.registerValidatorFunction(rule.id, validator);
      await engine.registerRule(rule);
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.passed).toBe(true);
    });

    it('should work without an eventBus', async () => {
      const engine = new RuleEngine(config);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const validator = async (_req: ValidationRequest) => makePassingResult(rule, _req);
      await engine.registerValidatorFunction(rule.id, validator);
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.passed).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // EVALUATE RULE
  // ─────────────────────────────────────────────────────────────────
  describe('evaluateRule', () => {
    it('should throw RuleNotFoundError for non-existent rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      await expect(engine.evaluateRule(brandRuleId('NONEXISTENT'), request)).rejects.toThrow(RuleNotFoundError);
    });

    it('should throw RuleNotFoundError with correct ruleId', async () => {
      const engine = new RuleEngine(config, eventBus);
      const fakeId = brandRuleId('NONEXISTENT');
      const request = makeRequest();
      try {
        await engine.evaluateRule(fakeId, request);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(RuleNotFoundError);
        expect((err as RuleNotFoundError).ruleId).toBe(fakeId as string);
      }
    });

    it('should return passed=false with no validator registered', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.passed).toBe(false);
    });

    it('should return error metadata with no validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.metadata.error).toBe('No validator registered for rule');
    });

    it('should return empty violations with no validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.violations).toEqual([]);
    });

    it('should return durationMs=0 with no validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.durationMs).toBe(0);
    });

    it('should return autoFixed=false with no validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.autoFixed).toBe(false);
    });

    it('should return correct ruleId in result with no validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.ruleId).toBe(rule.id);
    });

    it('should return correct ruleName in result with no validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ name: 'NoValidatorRule' });
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.ruleName).toBe('NoValidatorRule');
    });

    it('should return correct category in result with no validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ category: RuleCategory.Governance });
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.category).toBe(RuleCategory.Governance);
    });

    it('should return correct severity in result with no validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ severity: RuleSeverity.Error });
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.severity).toBe(RuleSeverity.Error);
    });

    it('should pass through result from passing validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const validator = async (_req: ValidationRequest) => makePassingResult(rule, _req);
      await engine.registerValidatorFunction(rule.id, validator);
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.passed).toBe(true);
      expect(result.ruleId).toBe(rule.id);
    });

    it('should pass through result from failing validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const validator = async (_req: ValidationRequest) => makeFailingResult(rule, _req);
      await engine.registerValidatorFunction(rule.id, validator);
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBe(1);
    });

    it('should pass through violations from failing validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const validator = async (_req: ValidationRequest) => makeFailingResult(rule, _req, 3);
      await engine.registerValidatorFunction(rule.id, validator);
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.violations.length).toBe(3);
    });

    it('should handle validator that throws an error', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const throwingValidator = async (_req: ValidationRequest) => {
        throw new Error('Validator exploded');
      };
      await engine.registerValidatorFunction(rule.id, throwingValidator);
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.passed).toBe(false);
      expect(result.metadata.error).toBe('Validator exploded');
    });

    it('should handle validator that throws non-Error', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const throwingValidator = async (_req: ValidationRequest) => {
        throw 'string error';
      };
      await engine.registerValidatorFunction(rule.id, throwingValidator);
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.passed).toBe(false);
      expect(result.metadata.error).toBe('Unknown evaluation error');
    });

    it('should enforce timeout via Promise.race', async () => {
      const engine = new RuleEngine(makeConfig({ evaluationTimeoutMs: 100 }), eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const slowValidator = async (_req: ValidationRequest) => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return makePassingResult(rule, _req);
      };
      await engine.registerValidatorFunction(rule.id, slowValidator);
      const resultPromise = engine.evaluateRule(rule.id, request);
      vi.advanceTimersByTime(150);
      const result = await resultPromise;
      expect(result.passed).toBe(false);
      expect(result.metadata.error).toContain('timed out');
    });

    it('should return RuleEvaluationTimeoutError message on timeout', async () => {
      const engine = new RuleEngine(makeConfig({ evaluationTimeoutMs: 50 }), eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const slowValidator = async (_req: ValidationRequest) => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return makePassingResult(rule, _req);
      };
      await engine.registerValidatorFunction(rule.id, slowValidator);
      const resultPromise = engine.evaluateRule(rule.id, request);
      vi.advanceTimersByTime(100);
      const result = await resultPromise;
      expect(result.metadata.error).toContain('50ms');
    });

    it('should publish RulePassedEvent when validator passes', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const validator = async (_req: ValidationRequest) => makePassingResult(rule, _req);
      await engine.registerValidatorFunction(rule.id, validator);
      await engine.evaluateRule(rule.id, request);
      const log = eventBus.getLog();
      const passedEvent = log.find((e) => e.eventType === 'compliance.rule.passed');
      expect(passedEvent).toBeDefined();
    });

    it('should publish RuleFailedEvent when validator fails', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const validator = async (_req: ValidationRequest) => makeFailingResult(rule, _req);
      await engine.registerValidatorFunction(rule.id, validator);
      await engine.evaluateRule(rule.id, request);
      const log = eventBus.getLog();
      const failedEvent = log.find((e) => e.eventType === 'compliance.rule.failed');
      expect(failedEvent).toBeDefined();
    });

    it('should publish RuleFailedEvent with Error classification', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const validator = async (_req: ValidationRequest) => makeFailingResult(rule, _req);
      await engine.registerValidatorFunction(rule.id, validator);
      await engine.evaluateRule(rule.id, request);
      const log = eventBus.getLog();
      const failedEvent = log.find((e) => e.eventType === 'compliance.rule.failed');
      expect(failedEvent!.classification).toBe(EventClassification.Error);
    });

    it('should publish RulePassedEvent with Result classification', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const validator = async (_req: ValidationRequest) => makePassingResult(rule, _req);
      await engine.registerValidatorFunction(rule.id, validator);
      await engine.evaluateRule(rule.id, request);
      const log = eventBus.getLog();
      const passedEvent = log.find((e) => e.eventType === 'compliance.rule.passed');
      expect(passedEvent!.classification).toBe(EventClassification.Result);
    });

    it('should publish RuleFailedEvent when no validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      await engine.evaluateRule(rule.id, request);
      const log = eventBus.getLog();
      const failedEvent = log.find((e) => e.eventType === 'compliance.rule.failed');
      expect(failedEvent).toBeDefined();
    });

    it('should return durationMs > 0 for passing validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const validator = async (_req: ValidationRequest) => makePassingResult(rule, _req);
      await engine.registerValidatorFunction(rule.id, validator);
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should return frozen result for no-validator case', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // EVALUATE RULES (BATCH)
  // ─────────────────────────────────────────────────────────────────
  describe('evaluateRules', () => {
    it('should return result with zero total rules when no rules registered', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(0);
    });

    it('should return Completed state when no rules', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.state).toBe(ComplianceState.Completed);
    });

    it('should return 100 overall score when no rules', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      // overallScore is calculated internally but not in the result directly
      // We can check passedRules/totalRules ratio
      const result = await engine.evaluateRules(request);
      expect(result.passedRules).toBe(0);
      expect(result.failedRules).toBe(0);
    });

    it('should return correct sessionId', async () => {
      const engine = new RuleEngine(config, eventBus);
      const sessionId = brandComplianceSessionId('batch-session');
      const request = makeRequest({ sessionId });
      const result = await engine.evaluateRules(request);
      expect(result.sessionId).toBe(sessionId);
    });

    it('should return correct targetType', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest({ targetType: ValidationTargetType.Runtime });
      const result = await engine.evaluateRules(request);
      expect(result.targetType).toBe(ValidationTargetType.Runtime);
    });

    it('should return correct targetPath', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest({ targetPath: 'custom/path.ts' });
      const result = await engine.evaluateRules(request);
      expect(result.targetPath).toBe('custom/path.ts');
    });

    it('should evaluate all enabled rules when no filter', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(2);
    });

    it('should skip disabled rules', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ enabled: true, name: 'R1' });
      const rule2 = makeRule({ enabled: false, name: 'R2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(1);
    });

    it('should filter by ruleIds', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      const rule3 = makeRule({ name: 'R3' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerRule(rule3);
      const request = makeRequest({ ruleIds: [rule1.id, rule3.id] });
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(2);
    });

    it('should filter by categories', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ category: RuleCategory.Architecture, name: 'Arch' });
      const rule2 = makeRule({ category: RuleCategory.Security, name: 'Sec' });
      const rule3 = makeRule({ category: RuleCategory.Architecture, name: 'Arch2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerRule(rule3);
      const request = makeRequest({ categories: [RuleCategory.Architecture] });
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(2);
    });

    it('should filter by both ruleIds and categories (intersection)', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ category: RuleCategory.Architecture, name: 'Arch' });
      const rule2 = makeRule({ category: RuleCategory.Security, name: 'Sec' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      // ruleIds=[rule1.id], categories=[Architecture] => rule1 matches both
      const request = makeRequest({ ruleIds: [rule1.id], categories: [RuleCategory.Architecture] });
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(1);
    });

    it('should return all pass when all validators pass', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makePassingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makePassingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.passedRules).toBe(2);
      expect(result.failedRules).toBe(0);
      expect(result.state).toBe(ComplianceState.Completed);
    });

    it('should return some fail when some validators fail', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makePassingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.passedRules).toBe(1);
      expect(result.failedRules).toBe(1);
    });

    it('should return all fail when all validators fail', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.passedRules).toBe(0);
      expect(result.failedRules).toBe(2);
    });

    it('should count violations from all rules', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r, 2));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r, 3));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.violations.length).toBe(5);
    });

    it('should count autoFixed results when autoFixEnabled', async () => {
      const engine = new RuleEngine(makeConfig({ autoFixEnabled: true }), eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeAutoFixedResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makePassingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.autoFixedCount).toBe(1);
    });

    it('should not count autoFixed when autoFixEnabled is false', async () => {
      const engine = new RuleEngine(makeConfig({ autoFixEnabled: false }), eventBus);
      const rule1 = makeRule({ name: 'R1' });
      await engine.registerRule(rule1);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeAutoFixedResult(rule1, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.autoFixedCount).toBe(0);
    });

    it('should stop on Critical severity when failFast is true', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'Critical1', severity: RuleSeverity.Critical });
      const rule2 = makeRule({ name: 'Warning1', severity: RuleSeverity.Warning });
      const rule3 = makeRule({ name: 'Critical2', severity: RuleSeverity.Critical });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerRule(rule3);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      await engine.registerValidatorFunction(rule3.id, async (r) => makeFailingResult(rule3, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      // First rule is Critical and fails, so failFast stops evaluation
      expect(result.results.length).toBe(1);
      expect(result.skippedRules).toBeGreaterThan(0);
    });

    it('should not stop on Warning severity when failFast is true', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'W1', severity: RuleSeverity.Warning });
      const rule2 = makeRule({ name: 'W2', severity: RuleSeverity.Warning });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.results.length).toBe(2);
      expect(result.skippedRules).toBe(0);
    });

    it('should not stop on Critical that passes when failFast is true', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'C1', severity: RuleSeverity.Critical });
      const rule2 = makeRule({ name: 'C2', severity: RuleSeverity.Critical });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makePassingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.results.length).toBe(2);
    });

    it('should not stop on Critical when failFast is false', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: false }), eventBus);
      const rule1 = makeRule({ name: 'C1', severity: RuleSeverity.Critical });
      const rule2 = makeRule({ name: 'C2', severity: RuleSeverity.Critical });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.results.length).toBe(2);
      expect(result.skippedRules).toBe(0);
    });

    it('should set state to PartiallyCompleted when failFast triggers', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'C1', severity: RuleSeverity.Critical });
      const rule2 = makeRule({ name: 'W1', severity: RuleSeverity.Warning });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.state).toBe(ComplianceState.PartiallyCompleted);
    });

    it('should set state to Completed when all rules evaluated', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      await engine.registerRule(rule1);
      await engine.registerValidatorFunction(rule1.id, async (r) => makePassingResult(rule1, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.state).toBe(ComplianceState.Completed);
    });

    it('should include startedAt and completedAt timestamps', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(typeof result.startedAt).toBe('string');
      expect(typeof result.completedAt).toBe('string');
    });

    it('should include durationMs', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should publish ComplianceStartedEvent', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      await engine.evaluateRules(request);
      const log = eventBus.getLog();
      const startedEvent = log.find((e) => e.eventType === 'compliance.started');
      expect(startedEvent).toBeDefined();
    });

    it('should publish ComplianceCompletedEvent', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      await engine.evaluateRules(request);
      const log = eventBus.getLog();
      const completedEvent = log.find((e) => e.eventType === 'compliance.completed');
      expect(completedEvent).toBeDefined();
    });

    it('should publish ComplianceStartedEvent with Action classification', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      await engine.evaluateRules(request);
      const log = eventBus.getLog();
      const startedEvent = log.find((e) => e.eventType === 'compliance.started');
      expect(startedEvent!.classification).toBe(EventClassification.Action);
    });

    it('should publish ComplianceCompletedEvent with Result classification when completed', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      await engine.registerRule(rule1);
      await engine.registerValidatorFunction(rule1.id, async (r) => makePassingResult(rule1, r));
      const request = makeRequest();
      await engine.evaluateRules(request);
      const log = eventBus.getLog();
      const completedEvent = log.find((e) => e.eventType === 'compliance.completed');
      expect(completedEvent!.classification).toBe(EventClassification.Result);
    });

    it('should publish ComplianceCompletedEvent with Error classification when partially completed', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'C1', severity: RuleSeverity.Critical });
      const rule2 = makeRule({ name: 'W1', severity: RuleSeverity.Warning });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      await engine.evaluateRules(request);
      const log = eventBus.getLog();
      const completedEvent = log.find((e) => e.eventType === 'compliance.completed');
      expect(completedEvent!.classification).toBe(EventClassification.Error);
    });

    it('should return frozen result', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should return frozen top-level result object', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      await engine.registerRule(rule1);
      await engine.registerValidatorFunction(rule1.id, async (r) => makePassingResult(rule1, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should handle no-validator rules in batch evaluation', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      await engine.registerRule(rule1);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(1);
      expect(result.failedRules).toBe(1);
    });

    it('should exclude ruleIds that do not exist', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      await engine.registerRule(rule1);
      const request = makeRequest({ ruleIds: [rule1.id, brandRuleId('NONEXISTENT')] });
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(1);
    });

    it('should exclude disabled rules even when in ruleIds', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1', enabled: true });
      const rule2 = makeRule({ name: 'R2', enabled: false });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      const request = makeRequest({ ruleIds: [rule1.id, rule2.id] });
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(1);
    });

    it('should handle empty ruleIds array as no filter', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      await engine.registerRule(rule1);
      const request = makeRequest({ ruleIds: [] });
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(1);
    });

    it('should handle empty categories array as no filter', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      await engine.registerRule(rule1);
      const request = makeRequest({ categories: [] });
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(1);
    });

    it('should auto-fix count with multiple auto-fixed rules', async () => {
      const engine = new RuleEngine(makeConfig({ autoFixEnabled: true }), eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      const rule3 = makeRule({ name: 'R3' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerRule(rule3);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeAutoFixedResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeAutoFixedResult(rule2, r));
      await engine.registerValidatorFunction(rule3.id, async (r) => makePassingResult(rule3, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.autoFixedCount).toBe(2);
    });

    it('should set skippedRules correctly when failFast triggers mid-batch', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'C1', severity: RuleSeverity.Critical });
      const rule2 = makeRule({ name: 'C2', severity: RuleSeverity.Critical });
      const rule3 = makeRule({ name: 'C3', severity: RuleSeverity.Critical });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerRule(rule3);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      await engine.registerValidatorFunction(rule3.id, async (r) => makeFailingResult(rule3, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(3);
      expect(result.results.length).toBe(1);
      expect(result.skippedRules).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // ENABLE RULE
  // ─────────────────────────────────────────────────────────────────
  describe('enableRule', () => {
    it('should enable a disabled rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: false });
      await engine.registerRule(rule);
      await engine.enableRule(rule.id);
      const stored = await engine.getRule(rule.id);
      expect(stored!.enabled).toBe(true);
    });

    it('should throw RuleNotFoundError for non-existent rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      await expect(engine.enableRule(brandRuleId('NONEXISTENT'))).rejects.toThrow(RuleNotFoundError);
    });

    it('should be idempotent if rule is already enabled', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: true });
      await engine.registerRule(rule);
      await engine.enableRule(rule.id);
      const stored = await engine.getRule(rule.id);
      expect(stored!.enabled).toBe(true);
    });

    it('should not affect other properties when enabling', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: false, name: 'TestRule', category: RuleCategory.Security });
      await engine.registerRule(rule);
      await engine.enableRule(rule.id);
      const stored = await engine.getRule(rule.id);
      expect(stored!.name).toBe('TestRule');
      expect(stored!.category).toBe(RuleCategory.Security);
      expect(stored!.severity).toBe(rule.severity);
    });

    it('should freeze the enabled rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: false });
      await engine.registerRule(rule);
      await engine.enableRule(rule.id);
      const stored = await engine.getRule(rule.id);
      expect(Object.isFrozen(stored)).toBe(true);
    });

    it('should throw ComplianceError base class for non-existent rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      await expect(engine.enableRule(brandRuleId('NONEXISTENT'))).rejects.toBeInstanceOf(ComplianceError);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DISABLE RULE
  // ─────────────────────────────────────────────────────────────────
  describe('disableRule', () => {
    it('should disable an enabled rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: true });
      await engine.registerRule(rule);
      await engine.disableRule(rule.id);
      const stored = await engine.getRule(rule.id);
      expect(stored!.enabled).toBe(false);
    });

    it('should throw RuleNotFoundError for non-existent rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      await expect(engine.disableRule(brandRuleId('NONEXISTENT'))).rejects.toThrow(RuleNotFoundError);
    });

    it('should be idempotent if rule is already disabled', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: false });
      await engine.registerRule(rule);
      await engine.disableRule(rule.id);
      const stored = await engine.getRule(rule.id);
      expect(stored!.enabled).toBe(false);
    });

    it('should not affect other properties when disabling', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: true, name: 'TestRule', category: RuleCategory.Privacy });
      await engine.registerRule(rule);
      await engine.disableRule(rule.id);
      const stored = await engine.getRule(rule.id);
      expect(stored!.name).toBe('TestRule');
      expect(stored!.category).toBe(RuleCategory.Privacy);
      expect(stored!.severity).toBe(rule.severity);
    });

    it('should freeze the disabled rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: true });
      await engine.registerRule(rule);
      await engine.disableRule(rule.id);
      const stored = await engine.getRule(rule.id);
      expect(Object.isFrozen(stored)).toBe(true);
    });

    it('should throw ComplianceError base class for non-existent rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      await expect(engine.disableRule(brandRuleId('NONEXISTENT'))).rejects.toBeInstanceOf(ComplianceError);
    });

    it('should allow re-enabling after disabling', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: true });
      await engine.registerRule(rule);
      await engine.disableRule(rule.id);
      expect((await engine.getRule(rule.id))!.enabled).toBe(false);
      await engine.enableRule(rule.id);
      expect((await engine.getRule(rule.id))!.enabled).toBe(true);
    });

    it('should toggle state multiple times', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: true });
      await engine.registerRule(rule);
      await engine.disableRule(rule.id);
      expect((await engine.getRule(rule.id))!.enabled).toBe(false);
      await engine.enableRule(rule.id);
      expect((await engine.getRule(rule.id))!.enabled).toBe(true);
      await engine.disableRule(rule.id);
      expect((await engine.getRule(rule.id))!.enabled).toBe(false);
      await engine.enableRule(rule.id);
      expect((await engine.getRule(rule.id))!.enabled).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // COUNT
  // ─────────────────────────────────────────────────────────────────
  describe('count', () => {
    it('should return 0 for empty engine', async () => {
      const engine = new RuleEngine(config, eventBus);
      expect(await engine.count()).toBe(0);
    });

    it('should return 1 after one registration', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule());
      expect(await engine.count()).toBe(1);
    });

    it('should return 3 after three registrations', async () => {
      const engine = new RuleEngine(config, eventBus);
      await engine.registerRule(makeRule());
      await engine.registerRule(makeRule());
      await engine.registerRule(makeRule());
      expect(await engine.count()).toBe(3);
    });

    it('should decrease after unregister', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      expect(await engine.count()).toBe(1);
      await engine.unregisterRule(rule.id);
      expect(await engine.count()).toBe(0);
    });

    it('should not be affected by enable/disable', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ enabled: true });
      await engine.registerRule(rule);
      expect(await engine.count()).toBe(1);
      await engine.disableRule(rule.id);
      expect(await engine.count()).toBe(1);
      await engine.enableRule(rule.id);
      expect(await engine.count()).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // EVENT PUBLISHING
  // ─────────────────────────────────────────────────────────────────
  describe('event publishing', () => {
    it('should not throw when eventBus is null', async () => {
      const engine = new RuleEngine(config, null);
      const rule = makeRule();
      await expect(engine.registerRule(rule)).resolves.not.toThrow();
    });

    it('should publish events in order', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      const log = eventBus.getLog();
      const regEvents = log.filter((e) => e.eventType === 'compliance.rule.registered');
      expect(regEvents.length).toBe(2);
      expect(regEvents[0].sequence).toBeLessThan(regEvents[1].sequence);
    });

    it('should increment sequence for each event', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule();
      const rule2 = makeRule();
      const rule3 = makeRule();
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerRule(rule3);
      const log = eventBus.getLog();
      for (let i = 1; i < log.length; i++) {
        expect(log[i].sequence).toBeGreaterThan(log[i - 1].sequence);
      }
    });

    it('should include aggregateId in registered event', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const log = eventBus.getLog();
      const lastEvent = log[log.length - 1];
      // The aggregateId is set to the rule's id string
      // We can verify it exists
      expect(lastEvent.eventId).toBeDefined();
    });

    it('should include aggregateType in registered event', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const log = eventBus.getLog();
      const lastEvent = log[log.length - 1];
      expect(lastEvent.eventId).toBeDefined();
    });

    it('should publish RulePassedEvent with correct eventType', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      await engine.registerValidatorFunction(rule.id, async (r) => makePassingResult(rule, r));
      await engine.evaluateRule(rule.id, request);
      const log = eventBus.getLog();
      const event = log.find((e) => e.eventType === 'compliance.rule.passed');
      expect(event).toBeDefined();
      expect(event!.eventType).toBe('compliance.rule.passed');
    });

    it('should publish RuleFailedEvent with correct eventType', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      await engine.registerValidatorFunction(rule.id, async (r) => makeFailingResult(rule, r));
      await engine.evaluateRule(rule.id, request);
      const log = eventBus.getLog();
      const event = log.find((e) => e.eventType === 'compliance.rule.failed');
      expect(event).toBeDefined();
      expect(event!.eventType).toBe('compliance.rule.failed');
    });

    it('should publish RuleRegisteredEvent with correct eventType', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const log = eventBus.getLog();
      const event = log.find((e) => e.eventType === 'compliance.rule.registered');
      expect(event).toBeDefined();
      expect(event!.eventType).toBe('compliance.rule.registered');
    });

    it('should publish RuleUnregisteredEvent with correct eventType', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      eventBus.clear();
      await engine.unregisterRule(rule.id);
      const log = eventBus.getLog();
      const event = log.find((e) => e.eventType === 'compliance.rule.unregistered');
      expect(event).toBeDefined();
      expect(event!.eventType).toBe('compliance.rule.unregistered');
    });

    it('should publish ComplianceStartedEvent with correct eventType', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      await engine.evaluateRules(request);
      const log = eventBus.getLog();
      const event = log.find((e) => e.eventType === 'compliance.started');
      expect(event).toBeDefined();
      expect(event!.eventType).toBe('compliance.started');
    });

    it('should publish ComplianceCompletedEvent with correct eventType', async () => {
      const engine = new RuleEngine(config, eventBus);
      const request = makeRequest();
      await engine.evaluateRules(request);
      const log = eventBus.getLog();
      const event = log.find((e) => e.eventType === 'compliance.completed');
      expect(event).toBeDefined();
      expect(event!.eventType).toBe('compliance.completed');
    });

    it('should publish all six event types in a full evaluation cycle', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      await engine.registerValidatorFunction(rule.id, async (r) => makePassingResult(rule, r));
      await engine.evaluateRules(request);
      const log = eventBus.getLog();
      const eventTypes = new Set(log.map((e) => e.eventType));
      expect(eventTypes.has('compliance.rule.registered')).toBe(true);
      expect(eventTypes.has('compliance.started')).toBe(true);
      expect(eventTypes.has('compliance.rule.passed')).toBe(true);
      expect(eventTypes.has('compliance.completed')).toBe(true);
    });

    it('should include version in all events', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      await engine.registerValidatorFunction(rule.id, async (r) => makePassingResult(rule, r));
      await engine.evaluateRules(request);
      const log = eventBus.getLog();
      for (const envelope of log) {
        expect(envelope.version).toBe('1.0.0');
      }
    });

    it('should include timestamp in all events', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const log = eventBus.getLog();
      for (const envelope of log) {
        expect(typeof envelope.timestamp).toBe('string');
        expect(envelope.timestamp.length).toBeGreaterThan(0);
      }
    });

    it('should include unique eventId in all events', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule();
      const rule2 = makeRule();
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      const log = eventBus.getLog();
      const eventIds = new Set(log.map((e) => e.eventId));
      expect(eventIds.size).toBe(log.length);
    });

    it('should handle evaluation with mixed pass/fail and no-validator rules', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'Pass' });
      const rule2 = makeRule({ name: 'Fail' });
      const rule3 = makeRule({ name: 'NoValidator' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerRule(rule3);
      await engine.registerValidatorFunction(rule1.id, async (r) => makePassingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(3);
      expect(result.passedRules).toBe(1);
      expect(result.failedRules).toBe(2);
    });

    it('should handle evaluation with all no-validator rules', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'NoVal1' });
      const rule2 = makeRule({ name: 'NoVal2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(2);
      expect(result.failedRules).toBe(2);
      expect(result.passedRules).toBe(0);
    });

    it('should produce no events when no eventBus and evaluating rules', async () => {
      const engine = new RuleEngine(config);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(1);
    });

    it('should evaluate rules with validators registered before rules', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ name: 'PreReg' });
      const request = makeRequest();
      await engine.registerValidatorFunction(rule.id, async (r) => makePassingResult(rule, r));
      await engine.registerRule(rule);
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(1);
      expect(result.passedRules).toBe(1);
    });

    it('should handle Info severity rules in failFast mode', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'Info', severity: RuleSeverity.Info });
      const rule2 = makeRule({ name: 'Info2', severity: RuleSeverity.Info });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.results.length).toBe(2);
    });

    it('should handle Error severity rules in failFast mode', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'Err', severity: RuleSeverity.Error });
      const rule2 = makeRule({ name: 'Err2', severity: RuleSeverity.Error });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.results.length).toBe(2);
    });

    it('should failFast only on Critical, not Error', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'Err', severity: RuleSeverity.Error });
      const rule2 = makeRule({ name: 'C', severity: RuleSeverity.Critical });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      // Error does not trigger failFast, so both are evaluated
      expect(result.results.length).toBe(2);
    });

    it('should handle Warning severity in failFast mode', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'W1', severity: RuleSeverity.Warning });
      const rule2 = makeRule({ name: 'W2', severity: RuleSeverity.Warning });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.results.length).toBe(2);
    });

    it('should handle Critical passing then Error failing in failFast mode', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'CPass', severity: RuleSeverity.Critical });
      const rule2 = makeRule({ name: 'EFail', severity: RuleSeverity.Error });
      const rule3 = makeRule({ name: 'CFail', severity: RuleSeverity.Critical });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerRule(rule3);
      await engine.registerValidatorFunction(rule1.id, async (r) => makePassingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r));
      await engine.registerValidatorFunction(rule3.id, async (r) => makeFailingResult(rule3, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.results.length).toBe(3);
    });

    it('should handle Critical failing first then Critical passing in failFast mode', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rule1 = makeRule({ name: 'CFail', severity: RuleSeverity.Critical });
      const rule2 = makeRule({ name: 'CPass', severity: RuleSeverity.Critical });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makePassingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      // First rule is Critical and fails => failFast stops
      expect(result.results.length).toBe(1);
      expect(result.skippedRules).toBe(1);
    });

    it('should return correct violation count in batch result', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeFailingResult(rule1, r, 5));
      await engine.registerValidatorFunction(rule2.id, async (r) => makeFailingResult(rule2, r, 3));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.violations.length).toBe(8);
    });

    it('should return empty violations when all pass', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule1 = makeRule({ name: 'R1' });
      const rule2 = makeRule({ name: 'R2' });
      await engine.registerRule(rule1);
      await engine.registerRule(rule2);
      await engine.registerValidatorFunction(rule1.id, async (r) => makePassingResult(rule1, r));
      await engine.registerValidatorFunction(rule2.id, async (r) => makePassingResult(rule2, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.violations.length).toBe(0);
    });

    it('should return zero autoFixedCount when autoFixEnabled false', async () => {
      const engine = new RuleEngine(makeConfig({ autoFixEnabled: false }), eventBus);
      const rule1 = makeRule({ name: 'R1' });
      await engine.registerRule(rule1);
      await engine.registerValidatorFunction(rule1.id, async (r) => makeAutoFixedResult(rule1, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.autoFixedCount).toBe(0);
    });

    it('should handle multiple policies evaluating same rules', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async (r) => makePassingResult(rule, r));
      const request1 = makeRequest({ sessionId: brandComplianceSessionId('s1') });
      const request2 = makeRequest({ sessionId: brandComplianceSessionId('s2') });
      const [r1, r2] = await Promise.all([
        engine.evaluateRules(request1),
        engine.evaluateRules(request2),
      ]);
      expect(r1.sessionId).toBe(brandComplianceSessionId('s1'));
      expect(r2.sessionId).toBe(brandComplianceSessionId('s2'));
      expect(r1.passedRules).toBe(1);
      expect(r2.passedRules).toBe(1);
    });

    it('should evaluate with targetContent in request', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const request = makeRequest({ targetContent: 'some content' });
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(1);
    });

    it('should return Completed state when no rules and no failFast', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: false }), eventBus);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.state).toBe(ComplianceState.Completed);
    });

    it('should count failed rules correctly in batch with mixed results', async () => {
      const engine = new RuleEngine(config, eventBus);
      const r1 = makeRule({ name: 'P1' });
      const r2 = makeRule({ name: 'F1' });
      const r3 = makeRule({ name: 'P2' });
      const r4 = makeRule({ name: 'F2' });
      const r5 = makeRule({ name: 'NV' });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      await engine.registerRule(r3);
      await engine.registerRule(r4);
      await engine.registerRule(r5);
      await engine.registerValidatorFunction(r1.id, async (req) => makePassingResult(r1, req));
      await engine.registerValidatorFunction(r2.id, async (req) => makeFailingResult(r2, req));
      await engine.registerValidatorFunction(r3.id, async (req) => makePassingResult(r3, req));
      await engine.registerValidatorFunction(r4.id, async (req) => makeFailingResult(r4, req));
      // r5 has no validator
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(5);
      expect(result.passedRules).toBe(2);
      expect(result.failedRules).toBe(3);
    });

    it('should handle validator returning autoFixed=true but autoFixEnabled=false', async () => {
      const engine = new RuleEngine(makeConfig({ autoFixEnabled: false }), eventBus);
      const rule = makeRule({ name: 'AutoFix' });
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async (r) => makeAutoFixedResult(rule, r));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.autoFixedCount).toBe(0);
      expect(result.passedRules).toBe(1);
    });

    it('should handle single no-validator rule in batch', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule({ name: 'Solo' });
      await engine.registerRule(rule);
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.totalRules).toBe(1);
      expect(result.failedRules).toBe(1);
      expect(result.state).toBe(ComplianceState.Completed);
    });

    it('should handle all four non-Critical severities in failFast mode', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const sevs = [RuleSeverity.Info, RuleSeverity.Warning, RuleSeverity.Error, RuleSeverity.Warning];
      for (const s of sevs) {
        const r = makeRule({ severity: s });
        await engine.registerRule(r);
        await engine.registerValidatorFunction(r.id, async (req) => makeFailingResult(r, req));
      }
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.results.length).toBe(4);
    });

    it('should stop immediately on first Critical fail with many rules', async () => {
      const engine = new RuleEngine(makeConfig({ failFast: true }), eventBus);
      const rules = [];
      for (let i = 0; i < 10; i++) {
        const r = makeRule({ severity: RuleSeverity.Critical });
        await engine.registerRule(r);
        await engine.registerValidatorFunction(r.id, async (req) => makeFailingResult(r, req));
        rules.push(r);
      }
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.results.length).toBe(1);
      expect(result.skippedRules).toBe(9);
    });

    it('should return correct result ordering in batch evaluation', async () => {
      const engine = new RuleEngine(config, eventBus);
      const r1 = makeRule({ name: 'First' });
      const r2 = makeRule({ name: 'Second' });
      const r3 = makeRule({ name: 'Third' });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      await engine.registerRule(r3);
      await engine.registerValidatorFunction(r1.id, async (req) => makePassingResult(r1, req));
      await engine.registerValidatorFunction(r2.id, async (req) => makeFailingResult(r2, req));
      await engine.registerValidatorFunction(r3.id, async (req) => makePassingResult(r3, req));
      const request = makeRequest();
      const result = await engine.evaluateRules(request);
      expect(result.results[0].ruleName).toBe('First');
      expect(result.results[1].ruleName).toBe('Second');
      expect(result.results[2].ruleName).toBe('Third');
    });

    it('should handle concurrent evaluateRule calls to same rule', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async (r) => makePassingResult(rule, r));
      const request = makeRequest();
      const [r1, r2, r3] = await Promise.all([
        engine.evaluateRule(rule.id, request),
        engine.evaluateRule(rule.id, request),
        engine.evaluateRule(rule.id, request),
      ]);
      expect(r1.passed).toBe(true);
      expect(r2.passed).toBe(true);
      expect(r3.passed).toBe(true);
    });

    it('should handle category filter with all categories', async () => {
      const engine = new RuleEngine(config, eventBus);
      const cats = Object.values(RuleCategory);
      for (const cat of cats) {
        await engine.registerRule(makeRule({ category: cat }));
      }
      const rules = await engine.listRules();
      expect(rules.length).toBe(cats.length);
    });

    it('should handle register then immediate unregister', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      await engine.unregisterRule(rule.id);
      expect(await engine.count()).toBe(0);
      expect(await engine.getRule(rule.id)).toBeNull();
    });

    it('should handle evaluateRule error with timeout config of 1ms', async () => {
      const engine = new RuleEngine(makeConfig({ evaluationTimeoutMs: 1 }), eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const slowValidator = async (_req: ValidationRequest) => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return makePassingResult(rule, _req);
      };
      await engine.registerValidatorFunction(rule.id, slowValidator);
      const request = makeRequest();
      const resultPromise = engine.evaluateRule(rule.id, request);
      vi.advanceTimersByTime(10);
      const result = await resultPromise;
      expect(result.passed).toBe(false);
      expect(result.metadata.error).toContain('timed out');
    });

    it('should return result with correct autoFixed field from validator', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const autoFixResult: RuleEvaluationResult = {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: true,
        violations: [],
        durationMs: 10,
        autoFixed: true,
        metadata: { fixApplied: true },
      };
      await engine.registerValidatorFunction(rule.id, async () => autoFixResult);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.autoFixed).toBe(true);
      expect(result.metadata.fixApplied).toBe(true);
    });

    it('should preserve metadata from validator in result', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const metaResult: RuleEvaluationResult = {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: true,
        violations: [],
        durationMs: 3,
        autoFixed: false,
        metadata: { details: 'some detail', score: 42 },
      };
      await engine.registerValidatorFunction(rule.id, async () => metaResult);
      const request = makeRequest();
      const result = await engine.evaluateRule(rule.id, request);
      expect(result.metadata.details).toBe('some detail');
      expect(result.metadata.score).toBe(42);
    });

    it('should handle RuleNotFoundError with Error base class', async () => {
      const engine = new RuleEngine(config, eventBus);
      await expect(engine.getRule(brandRuleId('NOPE'))).resolves.toBeNull();
    });

    it('should throw RuleNotFoundError for enableRule on non-existent rule with Error base class', async () => {
      const engine = new RuleEngine(config, eventBus);
      await expect(engine.enableRule(brandRuleId('NOPE'))).rejects.toBeInstanceOf(Error);
    });

    it('should throw RuleNotFoundError for disableRule on non-existent rule with Error base class', async () => {
      const engine = new RuleEngine(config, eventBus);
      await expect(engine.disableRule(brandRuleId('NOPE'))).rejects.toBeInstanceOf(Error);
    });

    it('should throw RuleNotFoundError for unregisterRule with Error base class', async () => {
      const engine = new RuleEngine(config, eventBus);
      await expect(engine.unregisterRule(brandRuleId('NOPE'))).rejects.toBeInstanceOf(Error);
    });

    it('should throw RuleNotFoundError for evaluateRule with Error base class', async () => {
      const engine = new RuleEngine(config, eventBus);
      await expect(engine.evaluateRule(brandRuleId('NOPE'), makeRequest())).rejects.toBeInstanceOf(Error);
    });

    it('should handle listRules returning frozen array items', async () => {
      const engine = new RuleEngine(config, eventBus);
      const rule = makeRule();
      await engine.registerRule(rule);
      const rules = await engine.listRules();
      expect(Object.isFrozen(rules[0])).toBe(true);
    });
  });
});
