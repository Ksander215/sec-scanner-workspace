import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import { ConstraintValidator } from '../../../core/compliance/constraint-validator.js';
import {
  brandRuleId, brandComplianceSessionId, RuleCategory, RuleSeverity,
  EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType,
} from '../../../core/compliance/types.js';

describe('ConstraintValidator', () => {
  let ruleEngine: RuleEngine;
  let validator: ConstraintValidator;
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
    validator = new ConstraintValidator(ruleEngine);
    await validator.registerRules();
  });

  // ─── Identity tests ─────────────────────────────────────────────
  it('should have a defined id', () => {
    expect(validator.id).toBeDefined();
    expect(typeof validator.id).toBe('string');
  });
  it('should have correct name', () => {
    expect(validator.name).toBe('ConstraintValidator');
  });
  it('should have Runtime category', () => {
    expect(validator.category).toBe(RuleCategory.Runtime);
  });
  it('should have id containing constraint-validator', () => {
    expect(validator.id).toContain('constraint-validator');
  });

  // ─── Rule registration tests ────────────────────────────────────
  it('should register exactly 3 rules', async () => {
    const count = await ruleEngine.count();
    expect(count).toBe(3);
  });
  it('should register CONSTR-001 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CONSTR-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Runtime exposes getConstraintReport');
    expect(rule!.severity).toBe(RuleSeverity.Error);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
    expect(rule!.category).toBe(RuleCategory.Runtime);
  });
  it('should register CONSTR-002 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CONSTR-002'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Constraint identified with evidence');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
    expect(rule!.category).toBe(RuleCategory.Governance);
  });
  it('should register CONSTR-003 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CONSTR-003'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Unknown returned when uncertain');
    expect(rule!.severity).toBe(RuleSeverity.Info);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
    expect(rule!.category).toBe(RuleCategory.Governance);
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

  // ─── CONSTR-001: Runtime exposes getConstraintReport ────────────
  it('CONSTR-001 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-001'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-001 should pass when getConstraintReport present', async () => {
    const content = `getConstraintReport() { return {}; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-001 should fail when getConstraintReport missing', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CONSTR-001 should detect method with space before paren', async () => {
    const content = `getConstraintReport () { return {}; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-001 violation should have Error severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });
  it('CONSTR-001 violation should recommend implementation', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('Implement');
    }
  });
  it('CONSTR-001 should have metadata hasMethod false when absent', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-001'), makeRequest('const x = 1;'));
    expect(result.metadata.hasMethod).toBe(false);
  });
  it('CONSTR-001 should have metadata hasMethod true when present', async () => {
    const content = `getConstraintReport() { return {}; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-001'), makeRequest(content));
    expect(result.metadata.hasMethod).toBe(true);
  });

  // ─── CONSTR-002: Constraint identified with evidence ────────────
  it('CONSTR-002 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-002 should pass for clean code', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-002 should pass when constraint with evidence', async () => {
    const content = `const constraint = { reason: 'security', evidence: ['test'] };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-002 should pass when constraint with source', async () => {
    const content = `const constraint = { source: 'PHI-001.000' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-002 should fail when constraint without evidence', async () => {
    const content = `const constraint = { name: 'max-size' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CONSTR-002 should pass when constraint has justification', async () => {
    const content = `const constraint = { justification: 'security' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-002 should have Warning severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CONSTR-002'));
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('CONSTR-002 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CONSTR-002'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('CONSTR-002 should have metadata hasConstraintObj', async () => {
    const content = `const constraint = { name: 'test' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest(content));
    expect(result.metadata).toHaveProperty('hasConstraintObj');
    expect(result.metadata.hasConstraintObj).toBe(true);
  });
  it('CONSTR-002 should have metadata hasEvidence', async () => {
    const content = `const constraint = { name: 'test' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest(content));
    expect(result.metadata).toHaveProperty('hasEvidence');
    expect(result.metadata.hasEvidence).toBe(false);
  });

  // ─── CONSTR-003: Unknown returned when uncertain ────────────────
  it('CONSTR-003 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-003'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-003 should pass for clean code', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-003'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-003 should pass when Unknown present', async () => {
    const content = `const constraint = {}; if (uncertain) { return Unknown; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-003 should pass when constraint logic without fallback', async () => {
    const content = `const constraint = { name: 'test' }; const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-003 should fail when constraint with fallback to true', async () => {
    const content = `const constraint = { name: 'test' }; try { check(); } catch { return true; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CONSTR-003 should have Info severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CONSTR-003'));
    expect(rule!.severity).toBe(RuleSeverity.Info);
  });
  it('CONSTR-003 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CONSTR-003'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('CONSTR-003 should mention GOV-008 in recommendation', async () => {
    const content = `const constraint = {}; try { check(); } catch { return passed; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-003'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('GOV-008');
    }
  });
  it('CONSTR-003 should have metadata hasUnknown', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-003'), makeRequest('const constraint = {};'));
    expect(result.metadata).toHaveProperty('hasUnknown');
  });

  // ─── validate() method tests ────────────────────────────────────
  it('validate() should return results for all constraint rules', async () => {
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

  // ─── validateConstraintCompliance() convenience method ──────────
  it('validateConstraintCompliance() should return results', async () => {
    const results = await validator.validateConstraintCompliance('runtime.ts', sessionId);
    expect(results.length).toBeGreaterThan(0);
  });
  it('validateConstraintCompliance() should pass all rules for empty content', async () => {
    const results = await validator.validateConstraintCompliance('runtime.ts', sessionId);
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
  it('validateConstraintCompliance() should evaluate all 3 rules', async () => {
    const results = await validator.validateConstraintCompliance('runtime.ts', sessionId);
    expect(results.length).toBe(3);
  });
  it('CONSTR-001 violation should have Error severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });
  it('CONSTR-001 violation should have Detected state', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('CONSTR-001 should have Blocking enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CONSTR-001'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('CONSTR-002 violation should have Detected state', async () => {
    const content = `const constraint = { name: 'test' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('CONSTR-002 should pass when constraint has source', async () => {
    const content = `const constraint = { source: 'PHI-001.000' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-002 should pass when constraint has Reason', async () => {
    const content = `const constraint = { Reason: 'security' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-003 violation should have Info severity', async () => {
    const content = `const constraint = {}; try { check(); } catch { return passed; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-003'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Info);
    }
  });
  it('CONSTR-003 should pass for code with Unknown but no fallback', async () => {
    const content = `const constraint = {}; if (x) return Unknown;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CONSTR-003 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CONSTR-003'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('CONSTR-003 should have metadata hasUnknown', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-003'), makeRequest('const x = 1;'));
    expect(result.metadata).toHaveProperty('hasUnknown');
  });
  it('CONSTR-003 should have metadata hasFallbackTrue', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-003'), makeRequest('const x = 1;'));
    expect(result.metadata).toHaveProperty('hasFallbackTrue');
  });
  it('CONSTR-002 should pass for constraint with reason field', async () => {
    const content = `const constraint = { reason: 'compliance' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CONSTR-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
});
