import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import {
  RuleSeverity,
  RuleCategory,
  ComplianceState,
  ViolationState,
  EnforcementLevel,
  AutoFixCapability,
  ValidationTargetType,
  DefaultComplianceRuntimeConfig,
  brandRuleId,
  brandViolationId,
  brandValidatorId,
  brandComplianceSessionId,
} from '../../../core/compliance/types.js';
import type {
  ComplianceRule,
  ComplianceViolation,
  ValidationResult,
  RuleEvaluationResult,
  ValidationRequest,
} from '../../../core/compliance/types.js';
import { RuleAlreadyRegisteredError, RuleNotFoundError } from '../../../core/compliance/errors.js';

// ═══════════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════════

function createTestRule(overrides?: Partial<ComplianceRule>): ComplianceRule {
  return Object.freeze({
    id: brandRuleId(`test-rule-${Math.random().toString(36).slice(2, 8)}`),
    name: 'Test Rule',
    description: 'A test compliance rule',
    category: RuleCategory.Architecture,
    severity: RuleSeverity.Error,
    enforcementLevel: EnforcementLevel.Advisory,
    autoFix: AutoFixCapability.None,
    source: 'TEST-001.000',
    validatorId: brandValidatorId('test-validator'),
    enabled: true,
    tags: ['test'],
    metadata: {},
    ...overrides,
  });
}

function createTestViolation(overrides?: Partial<ComplianceViolation>): ComplianceViolation {
  return Object.freeze({
    id: brandViolationId(`vio-${Math.random().toString(36).slice(2, 8)}`),
    ruleId: brandRuleId('test-rule'),
    ruleName: 'Test Rule',
    category: RuleCategory.Architecture,
    severity: RuleSeverity.Error,
    enforcementLevel: EnforcementLevel.Advisory,
    state: ViolationState.Detected,
    description: 'Test violation',
    evidence: ['evidence line 1'],
    recommendation: 'Fix it',
    autoFixAvailable: AutoFixCapability.None,
    target: '/src/module.ts',
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    metadata: {},
    ...overrides,
  });
}

function createTestResult(overrides?: Partial<ValidationResult>): ValidationResult {
  return Object.freeze({
    sessionId: brandComplianceSessionId('session-001'),
    targetType: ValidationTargetType.Architecture,
    targetPath: '/src/module.ts',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 50,
    results: [],
    totalRules: 0,
    passedRules: 0,
    failedRules: 0,
    skippedRules: 0,
    violations: [],
    autoFixedCount: 0,
    state: ComplianceState.Completed,
    ...overrides,
  });
}

function createTestRequest(overrides?: Partial<ValidationRequest>): ValidationRequest {
  return Object.freeze({
    targetType: ValidationTargetType.Architecture,
    targetPath: '/src/test.ts',
    sessionId: brandComplianceSessionId(`session-${Math.random().toString(36).slice(2, 8)}`),
    metadata: {},
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════

describe('RuleEngine', () => {
  let engine: RuleEngine;
  const mockEventBus = { publish: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new RuleEngine(
      { ...DefaultComplianceRuntimeConfig.ruleEngine, evaluationTimeoutMs: 500 },
      mockEventBus,
    );
  });

  // ─── registerRule ──────────────────────────────────────────────
  describe('registerRule', () => {
    it('should register a rule successfully', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(rule.id);
    });

    it('should increment count after registration', async () => {
      await engine.registerRule(createTestRule());
      expect(await engine.count()).toBe(1);
    });

    it('should freeze the registered rule', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      const retrieved = await engine.getRule(rule.id);
      expect(Object.isFrozen(retrieved!)).toBe(true);
    });

    it('should throw RuleAlreadyRegisteredError for duplicate', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await expect(engine.registerRule(rule)).rejects.toThrow(RuleAlreadyRegisteredError);
    });

    it('should throw with correct code for duplicate', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      try {
        await engine.registerRule(rule);
        expect.unreachable('should have thrown');
      } catch (err) {
        expect((err as RuleAlreadyRegisteredError).code).toBe('RULE_ALREADY_REGISTERED');
      }
    });

    it('should publish a compliance.rule.registered event', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.eventType).toBe('compliance.rule.registered');
      expect(event.ruleId).toBe(rule.id);
      expect(event.ruleName).toBe(rule.name);
      expect(event.category).toBe(rule.category);
    });

    it('should register multiple rules with different IDs', async () => {
      const r1 = createTestRule({ id: brandRuleId('rule-a') });
      const r2 = createTestRule({ id: brandRuleId('rule-b') });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      expect(await engine.count()).toBe(2);
    });

    it('should not publish event when no eventBus is provided', async () => {
      const noBusEngine = new RuleEngine({
        ...DefaultComplianceRuntimeConfig.ruleEngine,
        evaluationTimeoutMs: 500,
      });
      const rule = createTestRule();
      await noBusEngine.registerRule(rule);
      // No error, no event bus crash
      const retrieved = await noBusEngine.getRule(rule.id);
      expect(retrieved).not.toBeNull();
    });

    it('should preserve all rule properties after registration', async () => {
      const rule = createTestRule({
        name: 'Preserve Test',
        tags: ['tag1', 'tag2'],
        metadata: { key: 'val' },
      });
      await engine.registerRule(rule);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.name).toBe('Preserve Test');
      expect(retrieved!.tags).toEqual(['tag1', 'tag2']);
      expect(retrieved!.metadata).toEqual({ key: 'val' });
    });

    it('should register a disabled rule', async () => {
      const rule = createTestRule({ enabled: false });
      await engine.registerRule(rule);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.enabled).toBe(false);
    });
  });

  // ─── unregisterRule ─────────────────────────────────────────────
  describe('unregisterRule', () => {
    it('should unregister a registered rule', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await engine.unregisterRule(rule.id);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved).toBeNull();
    });

    it('should decrement count after unregistration', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      expect(await engine.count()).toBe(1);
      await engine.unregisterRule(rule.id);
      expect(await engine.count()).toBe(0);
    });

    it('should throw RuleNotFoundError for non-existent rule', async () => {
      await expect(engine.unregisterRule(brandRuleId('nonexistent'))).rejects.toThrow(RuleNotFoundError);
    });

    it('should publish a compliance.rule.unregistered event', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      vi.clearAllMocks();
      await engine.unregisterRule(rule.id);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.eventType).toBe('compliance.rule.unregistered');
      expect(event.ruleId).toBe(rule.id);
    });

    it('should also remove associated validator', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({ ruleId: rule.id, ruleName: rule.name, category: rule.category, severity: rule.severity, passed: true }));
      await engine.unregisterRule(rule.id);
      // After unregister, evaluating the rule should fail
      await expect(engine.evaluateRule(rule.id, createTestRequest())).rejects.toThrow(RuleNotFoundError);
    });
  });

  // ─── getRule ────────────────────────────────────────────────────
  describe('getRule', () => {
    it('should return null for non-existent rule', async () => {
      const result = await engine.getRule(brandRuleId('nonexistent'));
      expect(result).toBeNull();
    });

    it('should return the registered rule', async () => {
      const rule = createTestRule({ id: brandRuleId('find-me') });
      await engine.registerRule(rule);
      const result = await engine.getRule(brandRuleId('find-me'));
      expect(result).not.toBeNull();
      expect(result!.name).toBe(rule.name);
    });

    it('should return a frozen object', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      const result = await engine.getRule(rule.id);
      expect(Object.isFrozen(result!)).toBe(true);
    });

    it('should return the same rule data after enabling', async () => {
      const rule = createTestRule({ enabled: false });
      await engine.registerRule(rule);
      await engine.enableRule(rule.id);
      const result = await engine.getRule(rule.id);
      expect(result!.enabled).toBe(true);
      expect(result!.name).toBe(rule.name);
    });
  });

  // ─── listRules ──────────────────────────────────────────────────
  describe('listRules', () => {
    it('should return empty array when no rules registered', async () => {
      const rules = await engine.listRules();
      expect(rules).toEqual([]);
    });

    it('should return all registered rules without filter', async () => {
      const r1 = createTestRule({ id: brandRuleId('lr-1') });
      const r2 = createTestRule({ id: brandRuleId('lr-2') });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      const rules = await engine.listRules();
      expect(rules).toHaveLength(2);
    });

    it('should filter by category', async () => {
      const r1 = createTestRule({ id: brandRuleId('cat-arch'), category: RuleCategory.Architecture });
      const r2 = createTestRule({ id: brandRuleId('cat-gov'), category: RuleCategory.Governance });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      const rules = await engine.listRules({ category: RuleCategory.Governance });
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe(brandRuleId('cat-gov'));
    });

    it('should filter by severity', async () => {
      const r1 = createTestRule({ id: brandRuleId('sev-info'), severity: RuleSeverity.Info });
      const r2 = createTestRule({ id: brandRuleId('sev-crit'), severity: RuleSeverity.Critical });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      const rules = await engine.listRules({ severity: RuleSeverity.Critical });
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe(brandRuleId('sev-crit'));
    });

    it('should filter by enabled', async () => {
      const r1 = createTestRule({ id: brandRuleId('en-1'), enabled: true });
      const r2 = createTestRule({ id: brandRuleId('en-2'), enabled: false });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      const enabled = await engine.listRules({ enabled: true });
      expect(enabled).toHaveLength(1);
      expect(enabled[0].id).toBe(brandRuleId('en-1'));
    });

    it('should filter by disabled rules', async () => {
      const r1 = createTestRule({ id: brandRuleId('dis-1'), enabled: false });
      await engine.registerRule(r1);
      const disabled = await engine.listRules({ enabled: false });
      expect(disabled).toHaveLength(1);
    });

    it('should combine category and severity filters', async () => {
      const r1 = createTestRule({ id: brandRuleId('combo-1'), category: RuleCategory.Architecture, severity: RuleSeverity.Critical });
      const r2 = createTestRule({ id: brandRuleId('combo-2'), category: RuleCategory.Architecture, severity: RuleSeverity.Info });
      const r3 = createTestRule({ id: brandRuleId('combo-3'), category: RuleCategory.Governance, severity: RuleSeverity.Critical });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      await engine.registerRule(r3);
      const rules = await engine.listRules({ category: RuleCategory.Architecture, severity: RuleSeverity.Critical });
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe(brandRuleId('combo-1'));
    });

    it('should return empty when filter matches nothing', async () => {
      const r1 = createTestRule({ id: brandRuleId('nomatch'), category: RuleCategory.Architecture });
      await engine.registerRule(r1);
      const rules = await engine.listRules({ category: RuleCategory.Security });
      expect(rules).toHaveLength(0);
    });

    it('should combine all three filters', async () => {
      const r1 = createTestRule({ id: brandRuleId('tri-1'), category: RuleCategory.Security, severity: RuleSeverity.Error, enabled: true });
      const r2 = createTestRule({ id: brandRuleId('tri-2'), category: RuleCategory.Security, severity: RuleSeverity.Error, enabled: false });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      const rules = await engine.listRules({ category: RuleCategory.Security, severity: RuleSeverity.Error, enabled: true });
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe(brandRuleId('tri-1'));
    });
  });

  // ─── evaluateRule ───────────────────────────────────────────────
  describe('evaluateRule', () => {
    it('should throw RuleNotFoundError for non-existent rule', async () => {
      await expect(engine.evaluateRule(brandRuleId('nope'), createTestRequest())).rejects.toThrow(RuleNotFoundError);
    });

    it('should return passed result when validator returns passed', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: true,
      }));
      const result = await engine.evaluateRule(rule.id, createTestRequest());
      expect(result.passed).toBe(true);
    });

    it('should return failed result when validator returns failed', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      const violation = createTestViolation();
      await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: false,
        violations: [violation],
      }));
      const result = await engine.evaluateRule(rule.id, createTestRequest());
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it('should return failed result with no validator registered', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      const result = await engine.evaluateRule(rule.id, createTestRequest());
      expect(result.passed).toBe(false);
      expect(result.metadata.error).toBe('No validator registered for rule');
    });

    it('should handle validator that throws an error', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async () => {
        throw new Error('validator explosion');
      });
      const result = await engine.evaluateRule(rule.id, createTestRequest());
      expect(result.passed).toBe(false);
      expect(result.metadata.error).toBe('validator explosion');
    });

    it('should handle non-Error thrown by validator', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async () => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'string error';
      });
      const result = await engine.evaluateRule(rule.id, createTestRequest());
      expect(result.passed).toBe(false);
      expect(result.metadata.error).toBe('Unknown evaluation error');
    });

    it('should timeout slow validators', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async () => {
        await new Promise((r) => setTimeout(r, 10000));
        return createTestRuleEvalResult({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          passed: true,
        });
      });
      const result = await engine.evaluateRule(rule.id, createTestRequest());
      expect(result.passed).toBe(false);
      expect(result.metadata.error).toContain('timed out');
    }, 10000);

    it('should publish compliance.rule.passed event on pass', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: true,
      }));
      vi.clearAllMocks();
      await engine.evaluateRule(rule.id, createTestRequest());
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish.mock.calls[0][0].eventType).toBe('compliance.rule.passed');
    });

    it('should publish compliance.rule.failed event on fail', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: false,
      }));
      vi.clearAllMocks();
      await engine.evaluateRule(rule.id, createTestRequest());
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish.mock.calls[0][0].eventType).toBe('compliance.rule.failed');
    });

    it('should not publish events when no eventBus', async () => {
      const noBusEngine = new RuleEngine({
        ...DefaultComplianceRuntimeConfig.ruleEngine,
        evaluationTimeoutMs: 500,
      });
      const rule = createTestRule();
      await noBusEngine.registerRule(rule);
      await noBusEngine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: true,
      }));
      const result = await noBusEngine.evaluateRule(rule.id, createTestRequest());
      expect(result.passed).toBe(true);
    });

    it('should complete evaluation for slow validators within timeout', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async () => {
        await new Promise((r) => setTimeout(r, 20));
        return createTestRuleEvalResult({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          passed: true,
        });
      });
      const result = await engine.evaluateRule(rule.id, createTestRequest());
      // The engine returns the validator result as-is; durationMs here is what the validator returned
      expect(result.passed).toBe(true);
      expect(result.durationMs).toBe(0);
    });

    it('should include violationCount in failed event', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      const v1 = createTestViolation();
      const v2 = createTestViolation({ id: brandViolationId('vio-2') });
      await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: false,
        violations: [v1, v2],
      }));
      vi.clearAllMocks();
      await engine.evaluateRule(rule.id, createTestRequest());
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish.mock.calls[0][0].violationCount).toBe(2);
    });

    it('should pass the request to the validator', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      const request = createTestRequest({ targetPath: '/specific/path.ts' });
      let receivedRequest: ValidationRequest | null = null;
      await engine.registerValidatorFunction(rule.id, async (req) => {
        receivedRequest = req;
        return createTestRuleEvalResult({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          passed: true,
        });
      });
      await engine.evaluateRule(rule.id, request);
      expect(receivedRequest).not.toBeNull();
      expect(receivedRequest!.targetPath).toBe('/specific/path.ts');
    });

    it('should evaluate a disabled rule (but it still evaluates when called directly)', async () => {
      const rule = createTestRule({ enabled: false });
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: true,
      }));
      // evaluateRule evaluates the specific rule regardless of enabled state
      const result = await engine.evaluateRule(rule.id, createTestRequest());
      expect(result.passed).toBe(true);
    });
  });

  // ─── evaluateRules (batch) ──────────────────────────────────────
  describe('evaluateRules', () => {
    it('should evaluate all enabled rules', async () => {
      const r1 = createTestRule({ id: brandRuleId('batch-1') });
      const r2 = createTestRule({ id: brandRuleId('batch-2') });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({ ruleId: r1.id, ruleName: r1.name, category: r1.category, severity: r1.severity, passed: true }));
      await engine.registerValidatorFunction(r2.id, async () => createTestRuleEvalResult({ ruleId: r2.id, ruleName: r2.name, category: r2.category, severity: r2.severity, passed: true }));
      const result = await engine.evaluateRules(createTestRequest());
      expect(result.totalRules).toBe(2);
      expect(result.passedRules).toBe(2);
      expect(result.failedRules).toBe(0);
    });

    it('should skip disabled rules', async () => {
      const r1 = createTestRule({ id: brandRuleId('batch-en'), enabled: true });
      const r2 = createTestRule({ id: brandRuleId('batch-dis'), enabled: false });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({ ruleId: r1.id, ruleName: r1.name, category: r1.category, severity: r1.severity, passed: true }));
      const result = await engine.evaluateRules(createTestRequest());
      expect(result.totalRules).toBe(1);
    });

    it('should return Completed state when all pass', async () => {
      const r1 = createTestRule({ id: brandRuleId('st-1') });
      await engine.registerRule(r1);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({ ruleId: r1.id, ruleName: r1.name, category: r1.category, severity: r1.severity, passed: true }));
      const result = await engine.evaluateRules(createTestRequest());
      expect(result.state).toBe(ComplianceState.Completed);
    });

    it('should return Completed state when some fail but no failFast', async () => {
      const r1 = createTestRule({ id: brandRuleId('st-fail-1') });
      const r2 = createTestRule({ id: brandRuleId('st-fail-2') });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({ ruleId: r1.id, ruleName: r1.name, category: r1.category, severity: r1.severity, passed: false }));
      await engine.registerValidatorFunction(r2.id, async () => createTestRuleEvalResult({ ruleId: r2.id, ruleName: r2.name, category: r2.category, severity: r2.severity, passed: true }));
      const result = await engine.evaluateRules(createTestRequest());
      expect(result.state).toBe(ComplianceState.Completed);
      expect(result.totalRules).toBe(2);
    });

    it('should stop on Critical failure with failFast enabled', async () => {
      const failFastEngine = new RuleEngine(
        { ...DefaultComplianceRuntimeConfig.ruleEngine, evaluationTimeoutMs: 500, failFast: true },
        mockEventBus,
      );
      const r1 = createTestRule({ id: brandRuleId('ff-crit'), severity: RuleSeverity.Critical });
      const r2 = createTestRule({ id: brandRuleId('ff-after') });
      await failFastEngine.registerRule(r1);
      await failFastEngine.registerRule(r2);
      await failFastEngine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({ ruleId: r1.id, ruleName: r1.name, category: r1.category, severity: RuleSeverity.Critical, passed: false }));
      await failFastEngine.registerValidatorFunction(r2.id, async () => createTestRuleEvalResult({ ruleId: r2.id, ruleName: r2.name, category: r2.category, severity: r2.severity, passed: true }));
      const result = await failFastEngine.evaluateRules(createTestRequest());
      expect(result.totalRules).toBe(2);
      expect(result.skippedRules).toBe(1);
      expect(result.state).toBe(ComplianceState.PartiallyCompleted);
    });

    it('should not failFast on non-Critical failure', async () => {
      const failFastEngine = new RuleEngine(
        { ...DefaultComplianceRuntimeConfig.ruleEngine, evaluationTimeoutMs: 500, failFast: true },
        mockEventBus,
      );
      const r1 = createTestRule({ id: brandRuleId('ff-warn'), severity: RuleSeverity.Warning });
      const r2 = createTestRule({ id: brandRuleId('ff-warn-2') });
      await failFastEngine.registerRule(r1);
      await failFastEngine.registerRule(r2);
      await failFastEngine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({ ruleId: r1.id, ruleName: r1.name, category: r1.category, severity: RuleSeverity.Warning, passed: false }));
      await failFastEngine.registerValidatorFunction(r2.id, async () => createTestRuleEvalResult({ ruleId: r2.id, ruleName: r2.name, category: r2.category, severity: r2.severity, passed: true }));
      const result = await failFastEngine.evaluateRules(createTestRequest());
      expect(result.totalRules).toBe(2);
      expect(result.skippedRules).toBe(0);
    });

    it('should return empty results when no rules registered', async () => {
      const result = await engine.evaluateRules(createTestRequest());
      expect(result.totalRules).toBe(0);
      expect(result.passedRules).toBe(0);
      expect(result.state).toBe(ComplianceState.Completed);
    });

    it('should aggregate violations from all rules', async () => {
      const r1 = createTestRule({ id: brandRuleId('agg-1') });
      const r2 = createTestRule({ id: brandRuleId('agg-2') });
      const v1 = createTestViolation({ id: brandViolationId('agg-v1') });
      const v2 = createTestViolation({ id: brandViolationId('agg-v2') });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({ ruleId: r1.id, ruleName: r1.name, category: r1.category, severity: r1.severity, passed: false, violations: [v1] }));
      await engine.registerValidatorFunction(r2.id, async () => createTestRuleEvalResult({ ruleId: r2.id, ruleName: r2.name, category: r2.category, severity: r2.severity, passed: false, violations: [v2] }));
      const result = await engine.evaluateRules(createTestRequest());
      expect(result.violations).toHaveLength(2);
    });

    it('should filter by ruleIds in request', async () => {
      const r1 = createTestRule({ id: brandRuleId('rf-1') });
      const r2 = createTestRule({ id: brandRuleId('rf-2') });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({ ruleId: r1.id, ruleName: r1.name, category: r1.category, severity: r1.severity, passed: true }));
      await engine.registerValidatorFunction(r2.id, async () => createTestRuleEvalResult({ ruleId: r2.id, ruleName: r2.name, category: r2.category, severity: r2.severity, passed: true }));
      const result = await engine.evaluateRules(createTestRequest({ ruleIds: [brandRuleId('rf-1')] }));
      expect(result.totalRules).toBe(1);
      expect(result.results[0].ruleId).toBe(brandRuleId('rf-1'));
    });

    it('should filter by categories in request', async () => {
      const r1 = createTestRule({ id: brandRuleId('cf-1'), category: RuleCategory.Architecture });
      const r2 = createTestRule({ id: brandRuleId('cf-2'), category: RuleCategory.Security });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({ ruleId: r1.id, ruleName: r1.name, category: r1.category, severity: r1.severity, passed: true }));
      await engine.registerValidatorFunction(r2.id, async () => createTestRuleEvalResult({ ruleId: r2.id, ruleName: r2.name, category: r2.category, severity: r2.severity, passed: true }));
      const result = await engine.evaluateRules(createTestRequest({ categories: [RuleCategory.Architecture] }));
      expect(result.totalRules).toBe(1);
    });

    it('should combine ruleIds and categories filter (intersection)', async () => {
      const r1 = createTestRule({ id: brandRuleId('ic-1'), category: RuleCategory.Architecture });
      const r2 = createTestRule({ id: brandRuleId('ic-2'), category: RuleCategory.Security });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({ ruleId: r1.id, ruleName: r1.name, category: r1.category, severity: r1.severity, passed: true }));
      await engine.registerValidatorFunction(r2.id, async () => createTestRuleEvalResult({ ruleId: r2.id, ruleName: r2.name, category: r2.category, severity: r2.severity, passed: true }));
      // ruleIds includes r1, but categories asks for Security — no intersection
      const result = await engine.evaluateRules(createTestRequest({
        ruleIds: [brandRuleId('ic-1')],
        categories: [RuleCategory.Security],
      }));
      expect(result.totalRules).toBe(0);
    });

    it('should count autoFixedCount from results', async () => {
      const r1 = createTestRule({ id: brandRuleId('af-1') });
      await engine.registerRule(r1);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: true,
        autoFixed: true,
      }));
      const result = await engine.evaluateRules(createTestRequest());
      expect(result.autoFixedCount).toBe(1);
    });

    it('should not count autoFixedCount when autoFixEnabled is false', async () => {
      const noAutoFixEngine = new RuleEngine(
        { ...DefaultComplianceRuntimeConfig.ruleEngine, evaluationTimeoutMs: 500, autoFixEnabled: false },
        mockEventBus,
      );
      const r1 = createTestRule({ id: brandRuleId('naf-1') });
      await noAutoFixEngine.registerRule(r1);
      await noAutoFixEngine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: true,
        autoFixed: true,
      }));
      const result = await noAutoFixEngine.evaluateRules(createTestRequest());
      expect(result.autoFixedCount).toBe(0);
    });

    it('should set durationMs', async () => {
      const r1 = createTestRule({ id: brandRuleId('dur-1') });
      await engine.registerRule(r1);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: true,
      }));
      const result = await engine.evaluateRules(createTestRequest());
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should set sessionId on result', async () => {
      const sessionId = brandComplianceSessionId('my-session');
      const r1 = createTestRule({ id: brandRuleId('sid-1') });
      await engine.registerRule(r1);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: true,
      }));
      const result = await engine.evaluateRules(createTestRequest({ sessionId }));
      expect(result.sessionId).toBe(sessionId);
    });

    it('should set targetType and targetPath on result', async () => {
      const request = createTestRequest({
        targetType: ValidationTargetType.Documentation,
        targetPath: '/docs/README.md',
      });
      const r1 = createTestRule({ id: brandRuleId('tp-1') });
      await engine.registerRule(r1);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: true,
      }));
      const result = await engine.evaluateRules(request);
      expect(result.targetType).toBe(ValidationTargetType.Documentation);
      expect(result.targetPath).toBe('/docs/README.md');
    });

    it('should publish compliance.started event', async () => {
      const r1 = createTestRule({ id: brandRuleId('ev-start-1') });
      await engine.registerRule(r1);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: true,
      }));
      vi.clearAllMocks();
      await engine.evaluateRules(createTestRequest());
      const events = mockEventBus.publish.mock.calls.map((c) => c[0]);
      const startedEvent = events.find((e) => e.eventType === 'compliance.started');
      expect(startedEvent).toBeDefined();
      expect(startedEvent.rulesToEvaluate).toBe(1);
    });

    it('should publish compliance.completed event', async () => {
      const r1 = createTestRule({ id: brandRuleId('ev-comp-1') });
      await engine.registerRule(r1);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: true,
      }));
      vi.clearAllMocks();
      await engine.evaluateRules(createTestRequest());
      const events = mockEventBus.publish.mock.calls.map((c) => c[0]);
      const completedEvent = events.find((e) => e.eventType === 'compliance.completed');
      expect(completedEvent).toBeDefined();
      expect(completedEvent.state).toBe(ComplianceState.Completed);
    });

    it('should have 100% score when all pass', async () => {
      const r1 = createTestRule({ id: brandRuleId('sc-1') });
      await engine.registerRule(r1);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: true,
      }));
      const result = await engine.evaluateRules(createTestRequest());
      expect(result.passedRules).toBe(1);
      expect(result.totalRules).toBe(1);
    });

    it('should have 0% pass rate when all fail', async () => {
      const r1 = createTestRule({ id: brandRuleId('scf-1') });
      await engine.registerRule(r1);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: false,
      }));
      const result = await engine.evaluateRules(createTestRequest());
      expect(result.passedRules).toBe(0);
      expect(result.failedRules).toBe(1);
    });
  });

  // ─── enableRule / disableRule ───────────────────────────────────
  describe('enableRule', () => {
    it('should enable a disabled rule', async () => {
      const rule = createTestRule({ enabled: false });
      await engine.registerRule(rule);
      await engine.enableRule(rule.id);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.enabled).toBe(true);
    });

    it('should be no-op if rule is already enabled', async () => {
      const rule = createTestRule({ enabled: true });
      await engine.registerRule(rule);
      await engine.enableRule(rule.id);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.enabled).toBe(true);
    });

    it('should throw RuleNotFoundError for non-existent rule', async () => {
      await expect(engine.enableRule(brandRuleId('nope'))).rejects.toThrow(RuleNotFoundError);
    });

    it('should freeze the updated rule', async () => {
      const rule = createTestRule({ enabled: false });
      await engine.registerRule(rule);
      await engine.enableRule(rule.id);
      const retrieved = await engine.getRule(rule.id);
      expect(Object.isFrozen(retrieved!)).toBe(true);
    });

    it('should preserve other properties when enabling', async () => {
      const rule = createTestRule({
        enabled: false,
        name: 'Original Name',
        category: RuleCategory.Security,
        severity: RuleSeverity.Critical,
      });
      await engine.registerRule(rule);
      await engine.enableRule(rule.id);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.name).toBe('Original Name');
      expect(retrieved!.category).toBe(RuleCategory.Security);
      expect(retrieved!.severity).toBe(RuleSeverity.Critical);
    });
  });

  describe('disableRule', () => {
    it('should disable an enabled rule', async () => {
      const rule = createTestRule({ enabled: true });
      await engine.registerRule(rule);
      await engine.disableRule(rule.id);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.enabled).toBe(false);
    });

    it('should be no-op if rule is already disabled', async () => {
      const rule = createTestRule({ enabled: false });
      await engine.registerRule(rule);
      await engine.disableRule(rule.id);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.enabled).toBe(false);
    });

    it('should throw RuleNotFoundError for non-existent rule', async () => {
      await expect(engine.disableRule(brandRuleId('nope'))).rejects.toThrow(RuleNotFoundError);
    });

    it('should freeze the updated rule', async () => {
      const rule = createTestRule({ enabled: true });
      await engine.registerRule(rule);
      await engine.disableRule(rule.id);
      const retrieved = await engine.getRule(rule.id);
      expect(Object.isFrozen(retrieved!)).toBe(true);
    });

    it('should preserve other properties when disabling', async () => {
      const rule = createTestRule({
        name: 'Keep This Name',
        category: RuleCategory.Privacy,
      });
      await engine.registerRule(rule);
      await engine.disableRule(rule.id);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.name).toBe('Keep This Name');
      expect(retrieved!.category).toBe(RuleCategory.Privacy);
    });

    it('should toggle: enable then disable returns to false', async () => {
      const rule = createTestRule({ enabled: false });
      await engine.registerRule(rule);
      await engine.enableRule(rule.id);
      await engine.disableRule(rule.id);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.enabled).toBe(false);
    });
  });

  // ─── registerValidatorFunction ──────────────────────────────────
  describe('registerValidatorFunction', () => {
    it('should register a validator function for a rule', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: true,
      }));
      const result = await engine.evaluateRule(rule.id, createTestRequest());
      expect(result.passed).toBe(true);
    });

    it('should allow overwriting a validator function', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: false,
      }));
      await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: true,
      }));
      const result = await engine.evaluateRule(rule.id, createTestRequest());
      expect(result.passed).toBe(true);
    });
  });

  // ─── count ──────────────────────────────────────────────────────
  describe('count', () => {
    it('should return 0 when no rules', async () => {
      expect(await engine.count()).toBe(0);
    });

    it('should reflect registrations and unregistrations', async () => {
      const r1 = createTestRule();
      const r2 = createTestRule();
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      expect(await engine.count()).toBe(2);
      await engine.unregisterRule(r1.id);
      expect(await engine.count()).toBe(1);
      await engine.unregisterRule(r2.id);
      expect(await engine.count()).toBe(0);
    });
  });

  // ─── concurrency config ────────────────────────────────────────
  describe('maxConcurrentEvaluations config', () => {
    it('should accept config with maxConcurrentEvaluations = 1', async () => {
      const limitedEngine = new RuleEngine({
        ...DefaultComplianceRuntimeConfig.ruleEngine,
        evaluationTimeoutMs: 500,
        maxConcurrentEvaluations: 1,
      });
      const r1 = createTestRule({ id: brandRuleId('conc-1') });
      await limitedEngine.registerRule(r1);
      await limitedEngine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: true,
      }));
      const result = await limitedEngine.evaluateRule(r1.id, createTestRequest());
      expect(result.passed).toBe(true);
    });

    it('should accept config with maxConcurrentEvaluations = 100', async () => {
      const bigEngine = new RuleEngine({
        ...DefaultComplianceRuntimeConfig.ruleEngine,
        evaluationTimeoutMs: 500,
        maxConcurrentEvaluations: 100,
      });
      const r1 = createTestRule({ id: brandRuleId('conc-100') });
      await bigEngine.registerRule(r1);
      await bigEngine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: true,
      }));
      const result = await bigEngine.evaluateRule(r1.id, createTestRequest());
      expect(result.passed).toBe(true);
    });
  });

  // ─── Additional edge cases ──────────────────────────────────────
  describe('edge cases', () => {
    it('should handle rule with empty tags array', async () => {
      const rule = createTestRule({ tags: [] });
      await engine.registerRule(rule);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.tags).toEqual([]);
    });

    it('should handle rule with empty metadata', async () => {
      const rule = createTestRule({ metadata: {} });
      await engine.registerRule(rule);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.metadata).toEqual({});
    });

    it('should handle rule with metadata containing various types', async () => {
      const rule = createTestRule({
        metadata: { num: 42, bool: true, str: 'hello', arr: [1, 2], nested: { a: 1 } },
      });
      await engine.registerRule(rule);
      const retrieved = await engine.getRule(rule.id);
      expect(retrieved!.metadata.num).toBe(42);
      expect(retrieved!.metadata.bool).toBe(true);
      expect(retrieved!.metadata.nested).toEqual({ a: 1 });
    });

    it('should return result from evaluateRules as frozen', async () => {
      const r1 = createTestRule({ id: brandRuleId('frozen-res') });
      await engine.registerRule(r1);
      await engine.registerValidatorFunction(r1.id, async () => createTestRuleEvalResult({
        ruleId: r1.id,
        ruleName: r1.name,
        category: r1.category,
        severity: r1.severity,
        passed: true,
      }));
      const result = await engine.evaluateRules(createTestRequest());
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should handle rule with all severity levels', async () => {
      const severities = [RuleSeverity.Info, RuleSeverity.Warning, RuleSeverity.Error, RuleSeverity.Critical];
      for (const sev of severities) {
        const rule = createTestRule({
          id: brandRuleId(`sev-test-${sev}`),
          severity: sev,
        });
        await engine.registerRule(rule);
        await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: sev,
          passed: true,
        }));
        const result = await engine.evaluateRule(rule.id, createTestRequest());
        expect(result.severity).toBe(sev);
      }
    });

    it('should handle rule with all categories', async () => {
      const categories = Object.values(RuleCategory);
      for (const cat of categories) {
        const rule = createTestRule({
          id: brandRuleId(`cat-test-${cat}`),
          category: cat,
        });
        await engine.registerRule(rule);
        const retrieved = await engine.getRule(rule.id);
        expect(retrieved!.category).toBe(cat);
      }
    });

    it('should handle all enforcement levels', async () => {
      const r1 = createTestRule({ id: brandRuleId('el-adv'), enforcementLevel: EnforcementLevel.Advisory });
      const r2 = createTestRule({ id: brandRuleId('el-blk'), enforcementLevel: EnforcementLevel.Blocking });
      await engine.registerRule(r1);
      await engine.registerRule(r2);
      const adv = await engine.getRule(brandRuleId('el-adv'));
      const blk = await engine.getRule(brandRuleId('el-blk'));
      expect(adv!.enforcementLevel).toBe(EnforcementLevel.Advisory);
      expect(blk!.enforcementLevel).toBe(EnforcementLevel.Blocking);
    });

    it('should handle all autoFix capabilities', async () => {
      const caps = [AutoFixCapability.None, AutoFixCapability.Suggested, AutoFixCapability.Automatic];
      for (const cap of caps) {
        const rule = createTestRule({
          id: brandRuleId(`af-test-${cap}`),
          autoFix: cap,
        });
        await engine.registerRule(rule);
        const retrieved = await engine.getRule(rule.id);
        expect(retrieved!.autoFix).toBe(cap);
      }
    });

    it('should handle evaluation with validator returning multiple violations', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      const violations = [
        createTestViolation({ id: brandViolationId('mv-1') }),
        createTestViolation({ id: brandViolationId('mv-2') }),
        createTestViolation({ id: brandViolationId('mv-3') }),
      ];
      await engine.registerValidatorFunction(rule.id, async () => createTestRuleEvalResult({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: false,
        violations,
      }));
      const result = await engine.evaluateRule(rule.id, createTestRequest());
      expect(result.violations).toHaveLength(3);
    });

    it('should handle request with targetContent', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      let receivedContent: string | undefined;
      await engine.registerValidatorFunction(rule.id, async (req) => {
        receivedContent = req.targetContent;
        return createTestRuleEvalResult({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          passed: true,
        });
      });
      await engine.evaluateRule(rule.id, createTestRequest({ targetContent: 'export function foo() {}' }));
      expect(receivedContent).toBe('export function foo() {}');
    });

    it('should handle request with metadata', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      let receivedMeta: Record<string, unknown> | undefined;
      await engine.registerValidatorFunction(rule.id, async (req) => {
        receivedMeta = req.metadata;
        return createTestRuleEvalResult({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          passed: true,
        });
      });
      const meta = { traceId: 'trace-123', userId: 'user-1' };
      await engine.evaluateRule(rule.id, createTestRequest({ metadata: meta }));
      expect(receivedMeta).toEqual(meta);
    });

    it('should produce consistent results for repeated evaluations', async () => {
      const rule = createTestRule();
      await engine.registerRule(rule);
      let callCount = 0;
      await engine.registerValidatorFunction(rule.id, async () => {
        callCount++;
        return createTestRuleEvalResult({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          passed: true,
        });
      });
      const req = createTestRequest();
      const r1 = await engine.evaluateRule(rule.id, req);
      const r2 = await engine.evaluateRule(rule.id, req);
      expect(r1.passed).toBe(r2.passed);
      expect(callCount).toBe(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Helper for RuleEvaluationResult
// ═══════════════════════════════════════════════════════════════════

function createTestRuleEvalResult(overrides: Partial<RuleEvaluationResult> & {
  ruleId: import('../../../core/compliance/types.js').RuleId;
  ruleName: string;
  category: import('../../../core/compliance/types.js').RuleCategory;
  severity: import('../../../core/compliance/types.js').RuleSeverity;
}): RuleEvaluationResult {
  return Object.freeze({
    ruleId: overrides.ruleId,
    ruleName: overrides.ruleName,
    category: overrides.category,
    severity: overrides.severity,
    passed: overrides.passed ?? true,
    violations: overrides.violations ?? [],
    durationMs: overrides.durationMs ?? 0,
    autoFixed: overrides.autoFixed ?? false,
    metadata: overrides.metadata ?? {},
  });
}
