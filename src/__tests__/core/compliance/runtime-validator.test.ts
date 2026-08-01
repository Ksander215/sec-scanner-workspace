import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import { RuntimeValidator } from '../../../core/compliance/runtime-validator.js';
import {
  brandRuleId, brandComplianceSessionId, RuleCategory, RuleSeverity,
  EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType,
} from '../../../core/compliance/types.js';

describe('RuntimeValidator', () => {
  let ruleEngine: RuleEngine;
  let validator: RuntimeValidator;
  const sessionId = brandComplianceSessionId('test');

  function makeRequest(content: string, path = 'runtime.ts') {
    return Object.freeze({
      targetType: ValidationTargetType.Runtime,
      targetPath: path,
      targetContent: content,
      sessionId,
      metadata: {},
    } as const);
  }

  beforeEach(async () => {
    ruleEngine = new RuleEngine({
      maxConcurrentEvaluations: 5, evaluationTimeoutMs: 5000, failFast: false,
      autoFixEnabled: false, cacheResults: false, cacheTtlMs: 0,
    });
    validator = new RuntimeValidator(ruleEngine);
    await validator.registerRules();
  });

  // ─── Identity tests ─────────────────────────────────────────────
  it('should have a defined id', () => {
    expect(validator.id).toBeDefined();
    expect(typeof validator.id).toBe('string');
  });
  it('should have correct name', () => {
    expect(validator.name).toBe('RuntimeValidator');
  });
  it('should have correct category', () => {
    expect(validator.category).toBe(RuleCategory.Runtime);
  });
  it('should have id containing runtime-validator', () => {
    expect(validator.id).toContain('runtime-validator');
  });

  // ─── Rule registration tests ────────────────────────────────────
  it('should register exactly 5 rules', async () => {
    const count = await ruleEngine.count();
    expect(count).toBe(5);
  });
  it('should register RUN-001 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Runtime implements governance contract');
    expect(rule!.severity).toBe(RuleSeverity.Critical);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
    expect(rule!.category).toBe(RuleCategory.Runtime);
  });
  it('should register RUN-002 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-002'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Runtime answers Value question');
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('should register RUN-003 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-003'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Runtime answers Constraint question');
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('should register RUN-004 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-004'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Runtime answers Optimization question');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('should register RUN-005 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-005'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Runtime answers Measurement question');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('all rules should have the same validatorId', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.validatorId).toBe(validator.id);
    }
  });
  it('RUN-004 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-004'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('RUN-005 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-005'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });

  // ─── RUN-001: Governance contract ────────────────────────────────
  it('RUN-001 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(''));
    expect(result.passed).toBe(true);
    expect(result.metadata).toHaveProperty('note');
  });
  it('RUN-001 should pass for empty string content', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('RUN-001 should pass when all governance methods present', async () => {
    const content = `getConstraintReport() { }
getValueMetrics() { }
askQuestion() { }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('RUN-001 should fail when getConstraintReport missing', async () => {
    const content = `getValueMetrics() { }
askQuestion() { }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(content));
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBe(1);
  });
  it('RUN-001 should fail when getValueMetrics missing', async () => {
    const content = `getConstraintReport() { }
askQuestion() { }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('RUN-001 should fail when askQuestion missing', async () => {
    const content = `getConstraintReport() { }
getValueMetrics() { }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('RUN-001 should produce 3 violations when all methods missing', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBe(3);
  });
  it('RUN-001 violation should have Critical severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Critical);
    }
  });
  it('RUN-001 violation should mention the missing method', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest('const x = 1;'));
    expect(result.violations.some(v => v.description.includes('getConstraintReport'))).toBe(true);
    expect(result.violations.some(v => v.description.includes('getValueMetrics'))).toBe(true);
    expect(result.violations.some(v => v.description.includes('askQuestion'))).toBe(true);
  });
  it('RUN-001 should have metadata with methodsChecked', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(''));
    expect(result.metadata.methodsChecked).toBe(3);
  });
  it('RUN-001 should detect method with space before parenthesis', async () => {
    const content = `getConstraintReport () { }
getValueMetrics () { }
askQuestion () { }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('RUN-001 violation should have Detected state', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('RUN-001 result should have correct ruleId', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(''));
    expect(result.ruleId).toBe(brandRuleId('RUN-001'));
  });
  it('RUN-001 result should have non-negative duration', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(''));
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  // ─── RUN-002: Value question ─────────────────────────────────────
  it('RUN-002 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-002'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('RUN-002 should pass when getValueMetrics present', async () => {
    const content = `getValueMetrics() { return {}; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('RUN-002 should fail when getValueMetrics missing', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('RUN-002 violation should mention Value question', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-002'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].description).toContain('Value');
    }
  });
  it('RUN-002 violation should mention getValueMetrics', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-002'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].description).toContain('getValueMetrics');
    }
  });
  it('RUN-002 should have metadata with questionName', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-002'), makeRequest(''));
    expect(result.metadata.questionName).toBe('Value');
  });
  it('RUN-002 should have Error severity on rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-002'));
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('RUN-002 should have Blocking enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-002'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('RUN-002 should detect method with space before paren', async () => {
    const content = `getValueMetrics () { return {}; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });

  // ─── RUN-003: Constraint question ────────────────────────────────
  it('RUN-003 should pass when getConstraintReport present', async () => {
    const content = `getConstraintReport() { return {}; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('RUN-003 should fail when getConstraintReport missing', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-003'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(false);
  });
  it('RUN-003 should mention Constraint question in violation', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-003'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].description).toContain('Constraint');
    }
  });
  it('RUN-003 should have metadata with questionName', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-003'), makeRequest(''));
    expect(result.metadata.questionName).toBe('Constraint');
  });
  it('RUN-003 should have Error severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-003'));
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });

  // ─── RUN-004: Optimization question ──────────────────────────────
  it('RUN-004 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-004'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('RUN-004 should pass when getOptimizationSuggestions present', async () => {
    const content = `getOptimizationSuggestions() { return []; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('RUN-004 should fail when getOptimizationSuggestions missing', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-004'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(false);
  });
  it('RUN-004 should mention Optimization question in violation', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-004'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].description).toContain('Optimization');
    }
  });
  it('RUN-004 should have Warning severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-004'));
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('RUN-004 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-004'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('RUN-004 violation should have Warning severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-004'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Warning);
    }
  });

  // ─── RUN-005: Measurement question ───────────────────────────────
  it('RUN-005 should pass when getMeasurementData present', async () => {
    const content = `getMeasurementData() { return {}; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-005'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('RUN-005 should fail when getMeasurementData missing', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-005'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(false);
  });
  it('RUN-005 should mention Measurement question', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-005'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].description).toContain('Measurement');
    }
  });
  it('RUN-005 should have Warning severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-005'));
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('RUN-005 should have metadata with questionName', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-005'), makeRequest(''));
    expect(result.metadata.questionName).toBe('Measurement');
  });

  // ─── validate() method tests ────────────────────────────────────
  it('validate() should return results for all runtime rules', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    expect(results.length).toBe(5);
  });
  it('validate() should return RuleEvaluationResult[]', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r).toHaveProperty('ruleId');
      expect(r).toHaveProperty('passed');
      expect(r).toHaveProperty('violations');
      expect(r).toHaveProperty('durationMs');
    }
  });

  // ─── validateRuntime() convenience method ───────────────────────
  it('validateRuntime() should return results', async () => {
    const results = await validator.validateRuntime('runtime.ts', sessionId);
    expect(results.length).toBeGreaterThan(0);
  });
  it('validateRuntime() should pass all rules for empty content', async () => {
    const results = await validator.validateRuntime('runtime.ts', sessionId);
    const allPassed = results.every(r => r.passed);
    expect(allPassed).toBe(true);
  });

  // ─── Edge cases ─────────────────────────────────────────────────
  it('should handle very long content', async () => {
    const content = 'const x = 1;'.repeat(1000);
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(content));
    expect(result).toBeDefined();
  });
  it('all results should have autoFixed as false', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.autoFixed).toBe(false);
    }
  });
  it('all rules should have enabled true', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.enabled).toBe(true);
    }
  });
  it('all rules should have AutoFixCapability.None', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.autoFix).toBe(AutoFixCapability.None);
    }
  });
  it('all rules should have tags', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.tags.length).toBeGreaterThan(0);
    }
  });
  it('all rules should have AutoFixCapability.None', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.autoFix).toBe(AutoFixCapability.None);
    }
  });
  it('all rules should have non-empty source', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.source.length).toBeGreaterThan(0);
    }
  });
  it('RUN-001 should detect method variants', async () => {
    const content = `async getConstraintReport (params) { return {}; }
getValueMetrics () { return {}; }
askQuestion () { return {}; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('RUN-001 should have metadata with methodsChecked=3', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest(''));
    expect(result.metadata.methodsChecked).toBe(3);
  });
  it('RUN-002 should have metadata questionName Value', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-002'), makeRequest(''));
    expect(result.metadata.questionName).toBe('Value');
  });
  it('RUN-003 should have metadata questionName Constraint', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-003'), makeRequest(''));
    expect(result.metadata.questionName).toBe('Constraint');
  });
  it('RUN-004 should have metadata questionName Optimization', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-004'), makeRequest(''));
    expect(result.metadata.questionName).toBe('Optimization');
  });
  it('RUN-005 should have metadata questionName Measurement', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-005'), makeRequest(''));
    expect(result.metadata.questionName).toBe('Measurement');
  });
  it('RUN-001 should have Critical severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-001'));
    expect(rule!.severity).toBe(RuleSeverity.Critical);
  });
  it('RUN-002 should have Blocking enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-002'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('RUN-003 should have Blocking enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('RUN-003'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('RUN-001 violation should have metadata missingMethod', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].metadata).toHaveProperty('missingMethod');
    }
  });
  it('RUN-002 violation should have metadata questionName', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-002'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].metadata).toHaveProperty('questionName');
    }
  });
  it('RUN-003 violation should have metadata questionName Constraint', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-003'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].metadata.questionName).toBe('Constraint');
    }
  });
  it('RUN-004 violation should have metadata questionName', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-004'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].metadata).toHaveProperty('questionName');
    }
  });
  it('RUN-005 violation should have metadata questionName', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-005'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].metadata).toHaveProperty('questionName');
    }
  });
  it('validate() results should have correct category', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.category).toBe(RuleCategory.Runtime);
    }
  });
  it('validate() results should have non-negative duration', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
  it('validateRuntime() should evaluate all runtime rules', async () => {
    const results = await validator.validateRuntime('runtime.ts', sessionId);
    expect(results.length).toBe(5);
  });
  it('validate() should return frozen array', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    expect(Object.isFrozen(results)).toBe(true);
  });
  it('RUN-001 violation should recommend implementing method', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('Implement');
    }
  });
  it('RUN-002 violation should recommend implementing getValueMetrics', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-002'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('getValueMetrics');
    }
  });
  it('RUN-003 violation should recommend implementing getConstraintReport', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-003'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('getConstraintReport');
    }
  });
  it('RUN-004 violation should have Warning severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-004'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Warning);
    }
  });
  it('RUN-005 violation should have Warning severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-005'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Warning);
    }
  });
  it('RUN-004 violation should have Advisory enforcement', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-004'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].enforcementLevel).toBe(EnforcementLevel.Advisory);
    }
  });
  it('RUN-005 violation should have Advisory enforcement', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-005'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].enforcementLevel).toBe(EnforcementLevel.Advisory);
    }
  });
  it('RUN-002 violation should mention Value question', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-002'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].description).toContain('Value');
    }
  });
  it('RUN-004 violation should mention Optimization question', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-004'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].description).toContain('Optimization');
    }
  });
  it('RUN-005 violation should mention Measurement question', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-005'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].description).toContain('Measurement');
    }
  });
  it('all results should have non-negative durationMs', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
  it('RUN-001 violation should have Detected state', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('RUN-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
});
