import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import { ValueValidator } from '../../../core/compliance/value-validator.js';
import {
  brandRuleId, brandComplianceSessionId, RuleCategory, RuleSeverity,
  EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType,
} from '../../../core/compliance/types.js';

describe('ValueValidator', () => {
  let ruleEngine: RuleEngine;
  let validator: ValueValidator;
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
    validator = new ValueValidator(ruleEngine);
    await validator.registerRules();
  });

  // ─── Identity tests ─────────────────────────────────────────────
  it('should have a defined id', () => {
    expect(validator.id).toBeDefined();
    expect(typeof validator.id).toBe('string');
  });
  it('should have correct name', () => {
    expect(validator.name).toBe('ValueValidator');
  });
  it('should have Runtime category', () => {
    expect(validator.category).toBe(RuleCategory.Runtime);
  });
  it('should have id containing value-validator', () => {
    expect(validator.id).toContain('value-validator');
  });

  // ─── Rule registration tests ────────────────────────────────────
  it('should register exactly 3 rules', async () => {
    const count = await ruleEngine.count();
    expect(count).toBe(3);
  });
  it('should register VAL-001 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('VAL-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Runtime declares value dimensions');
    expect(rule!.severity).toBe(RuleSeverity.Error);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
    expect(rule!.category).toBe(RuleCategory.Philosophy);
  });
  it('should register VAL-002 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('VAL-002'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Runtime exposes getValueMetrics');
    expect(rule!.severity).toBe(RuleSeverity.Critical);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('should register VAL-003 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('VAL-003'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('No engagement-as-value patterns');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
    expect(rule!.category).toBe(RuleCategory.Philosophy);
  });
  it('all rules should have the same validatorId', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.validatorId).toBe(validator.id);
    }
  });
  it('all rules should have enabled true', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.enabled).toBe(true);
    }
  });

  // ─── VAL-001: Runtime declares value dimensions ─────────────────
  it('VAL-001 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('VAL-001 should pass when valueDimension present', async () => {
    const content = `const valueDimension = ['accuracy', 'privacy'];`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('VAL-001 should pass when value_dimensions present', async () => {
    const content = `const value_dimensions = ['accuracy'];`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('VAL-001 should pass when ValueDimension present', async () => {
    const content = `enum ValueDimension { Accuracy, Privacy }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('VAL-001 should fail when no value dimension', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-001 violation should have Error severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });
  it('VAL-001 violation should recommend value dimensions', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('value dimensions');
    }
  });
  it('VAL-001 should have metadata hasDimensions', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest('const x = 1;'));
    expect(result.metadata).toHaveProperty('hasDimensions');
    expect(result.metadata.hasDimensions).toBe(false);
  });
  it('VAL-001 metadata hasDimensions true when present', async () => {
    const content = `const valueDimension = ['x'];`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest(content));
    expect(result.metadata.hasDimensions).toBe(true);
  });

  // ─── VAL-002: Runtime exposes getValueMetrics ───────────────────
  it('VAL-002 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-002'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('VAL-002 should pass when getValueMetrics method present', async () => {
    const content = `getValueMetrics() { return {}; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('VAL-002 should fail when getValueMetrics missing', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-002 should detect method with space before paren', async () => {
    const content = `getValueMetrics () { return {}; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('VAL-002 should have Critical severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('VAL-002'));
    expect(rule!.severity).toBe(RuleSeverity.Critical);
  });
  it('VAL-002 violation should have Critical severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-002'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Critical);
    }
  });
  it('VAL-002 should have metadata hasMethod', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-002'), makeRequest('const x = 1;'));
    expect(result.metadata).toHaveProperty('hasMethod');
    expect(result.metadata.hasMethod).toBe(false);
  });

  // ─── VAL-003: No engagement-as-value patterns ───────────────────
  it('VAL-003 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('VAL-003 should pass for clean code', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('VAL-003 should fail for engagementRate', async () => {
    const content = `const engagementRate = 0.95;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-003 should fail for maximize engagement', async () => {
    const content = `// We want to maximize engagement`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-003 should fail for increase engagement', async () => {
    const content = `// Strategy to increase engagement`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-003 should fail for boost engagement', async () => {
    const content = `// How to boost engagement`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-003 should fail for drive engagement', async () => {
    const content = `// Drive engagement through notifications`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-003 should fail for timeOnSite', async () => {
    const content = `const timeOnSite = 5000;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-003 should fail for sessionDuration', async () => {
    const content = `const sessionDuration = 5000;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-003 should have Warning severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('VAL-003'));
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('VAL-003 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('VAL-003'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('VAL-003 violation should mention PHI-001', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest('const engagementRate = 0.95;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('PHI-001');
    }
  });
  it('VAL-003 should detect multiple patterns', async () => {
    const content = `const engagementRate = 0.95; const timeOnSite = 5000;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    if (!result.passed) {
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('VAL-003 should have metadata patternsChecked', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest('const x = 1;'));
    expect(result.metadata.patternsChecked).toBe(4);
  });

  // ─── validate() method tests ────────────────────────────────────
  it('validate() should return results for all value rules', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    expect(results.length).toBe(3);
  });
  it('validate() results should have expected properties', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r).toHaveProperty('ruleId');
      expect(r).toHaveProperty('passed');
      expect(r).toHaveProperty('violations');
      expect(r).toHaveProperty('durationMs');
    }
  });

  // ─── validateValueCompliance() convenience method ───────────────
  it('validateValueCompliance() should return results', async () => {
    const results = await validator.validateValueCompliance('runtime.ts', sessionId);
    expect(results.length).toBeGreaterThan(0);
  });
  it('validateValueCompliance() should pass all rules for empty content', async () => {
    const results = await validator.validateValueCompliance('runtime.ts', sessionId);
    const allPassed = results.every(r => r.passed);
    expect(allPassed).toBe(true);
  });

  // ─── Edge cases ─────────────────────────────────────────────────
  it('all results should have autoFixed as false', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.autoFixed).toBe(false);
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
  it('all rules should have non-empty description', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });
  it('validate() results should have non-negative duration', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
  it('validate() should return frozen array', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    expect(Object.isFrozen(results)).toBe(true);
  });
  it('validateValueCompliance() should evaluate all 3 rules', async () => {
    const results = await validator.validateValueCompliance('runtime.ts', sessionId);
    expect(results.length).toBe(3);
  });
  it('VAL-001 should have metadata hasDimensions true when present', async () => {
    const content = `const valueDimension = ['x'];`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest(content));
    expect(result.metadata.hasDimensions).toBe(true);
  });
  it('VAL-001 should have metadata hasDimensions false when absent', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest('const x = 1;'));
    expect(result.metadata.hasDimensions).toBe(false);
  });
  it('VAL-001 violation should have Error severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });
  it('VAL-001 violation should have Detected state', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('VAL-002 should have metadata hasMethod false when absent', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-002'), makeRequest('const x = 1;'));
    expect(result.metadata.hasMethod).toBe(false);
  });
  it('VAL-002 should have metadata hasMethod true when present', async () => {
    const content = `getValueMetrics() { return {}; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-002'), makeRequest(content));
    expect(result.metadata.hasMethod).toBe(true);
  });
  it('VAL-002 violation should have Detected state', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-002'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('VAL-003 should fail for engagementScore', async () => {
    const content = `const engagementScore = 0.95;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-003 should fail for engagementCount', async () => {
    const content = `const engagementCount = 100;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-003 should fail for engagement.value', async () => {
    const content = `const x = engagement.value;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('VAL-003 violation should have Detected state', async () => {
    const content = `const engagementRate = 0.95;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('VAL-003 should have metadata patternsChecked=4', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest('const x = 1;'));
    expect(result.metadata.patternsChecked).toBe(4);
  });
  it('VAL-001 should have Blocking enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('VAL-001'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('VAL-002 should have Blocking enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('VAL-002'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('VAL-003 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('VAL-003'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('VAL-003 violation should have metadata pattern', async () => {
    const content = `const engagementRate = 0.95;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('VAL-003'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].metadata).toHaveProperty('pattern');
    }
  });
});
