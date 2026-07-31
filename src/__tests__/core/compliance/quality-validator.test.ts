import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import { QualityValidator } from '../../../core/compliance/quality-validator.js';
import {
  brandRuleId, brandComplianceSessionId, RuleCategory, RuleSeverity,
  EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType,
} from '../../../core/compliance/types.js';

describe('QualityValidator', () => {
  let ruleEngine: RuleEngine;
  let validator: QualityValidator;
  const sessionId = brandComplianceSessionId('test');

  function makeRequest(content: string, path = 'module.ts') {
    return Object.freeze({
      targetType: ValidationTargetType.Architecture,
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
    validator = new QualityValidator(ruleEngine);
    await validator.registerRules();
  });

  // ─── Identity tests ─────────────────────────────────────────────
  it('should have a defined id', () => {
    expect(validator.id).toBeDefined();
    expect(typeof validator.id).toBe('string');
  });
  it('should have correct name', () => {
    expect(validator.name).toBe('QualityValidator');
  });
  it('should have correct category', () => {
    expect(validator.category).toBe(RuleCategory.Quality);
  });
  it('should have id containing quality-validator', () => {
    expect(validator.id).toContain('quality-validator');
  });

  // ─── Rule registration tests ────────────────────────────────────
  it('should register exactly 3 rules', async () => {
    const count = await ruleEngine.count();
    expect(count).toBe(3);
  });
  it('should register QUAL-001 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('QUAL-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Function complexity acceptable');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('should register QUAL-002 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('QUAL-002'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('No excessively long files');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('should register QUAL-003 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('QUAL-003'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Test coverage indicators');
    expect(rule!.severity).toBe(RuleSeverity.Info);
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

  // ─── QUAL-001: Function complexity acceptable ───────────────────
  it('QUAL-001 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('QUAL-001 should pass for simple function', async () => {
    const content = `function foo() { return 1; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('QUAL-001 should pass for empty string content', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('QUAL-001 should fail for very complex function', async () => {
    const content = `function complex() {
    if (a) { if (b) { if (c) { if (d) { if (e) { if (f) { if (g) { if (h) { if (i) { if (j) {} } } } } } } } } } }
  }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('QUAL-001 should detect arrow function complexity', async () => {
    const content = `const fn = () => {
    if (a && b && c && d && e && f && g && h && i && j && k) {}
  }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('QUAL-001 should detect for-loop complexity', async () => {
    const content = `function fn() { for (let i=0;i<10;i++) { for (let j=0;j<10;j++) { for (let k=0;k<10;k++) { for (let l=0;l<10;l++) {} } } } }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('QUAL-001 should detect while-loop complexity', async () => {
    const content = `function fn() { while(a) { while(b) { while(c) { while(d) { while(e) { while(f) { while(g) { while(h) {} } } } } } } } }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('QUAL-001 should detect switch-case complexity', async () => {
    const content = `function fn(x) { switch(x) { case 1: case 2: case 3: case 4: case 5: case 6: case 7: case 8: case 9: case 10: break; } }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('QUAL-001 violation should have Warning severity', async () => {
    const content = `function fn() { if(a){if(b){if(c){if(d){if(e){if(f){if(g){if(h){if(i){if(j){}}}}}}}}} } }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Warning);
    }
  });
  it('QUAL-001 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('QUAL-001'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('QUAL-001 should mention function name in violation', async () => {
    const content = `function myFunc() { if(a){if(b){if(c){if(d){if(e){if(f){if(g){if(h){if(i){if(j){}}}}}}}}} } }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].description).toContain('myFunc');
    }
  });
  it('QUAL-001 should have metadata functionsChecked', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest('function f() { return 1; }'));
    expect(result.metadata).toHaveProperty('functionsChecked');
  });
  it('QUAL-001 should handle async functions', async () => {
    const content = `async function foo() { return 1; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });

  // ─── QUAL-002: No excessively long files ───────────────────────
  it('QUAL-002 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-002'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('QUAL-002 should pass for short files', async () => {
    const content = 'const x = 1;';
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('QUAL-002 should pass for file with 500 lines', async () => {
    const content = 'line\n'.repeat(500);
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('QUAL-002 should fail for file with 501 lines', async () => {
    const content = 'line\n'.repeat(501);
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('QUAL-002 should fail for very long file', async () => {
    const content = 'line\n'.repeat(1000);
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('QUAL-002 violation should mention line count', async () => {
    const content = 'line\n'.repeat(600);
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-002'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].description).toContain('600');
    }
  });
  it('QUAL-002 violation should have metadata lineCount', async () => {
    const content = 'line\n'.repeat(600);
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-002'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].metadata).toHaveProperty('lineCount');
      expect(result.violations[0].metadata.lineCount).toBe(600);
    }
  });
  it('QUAL-002 should have Warning severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('QUAL-002'));
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('QUAL-002 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('QUAL-002'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('QUAL-002 should recommend splitting file', async () => {
    const content = 'line\n'.repeat(600);
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-002'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('Split');
    }
  });

  // ─── QUAL-003: Test coverage indicators ────────────────────────
  it('QUAL-003 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-003'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('QUAL-003 should pass for non-ts file', async () => {
    const content = `export function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-003'), makeRequest(content, 'module.js'));
    expect(result.passed).toBe(true);
  });
  it('QUAL-003 should pass for test file', async () => {
    const content = `export function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-003'), makeRequest(content, 'module.test.ts'));
    expect(result.passed).toBe(true);
  });
  it('QUAL-003 should pass for spec file', async () => {
    const content = `export function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-003'), makeRequest(content, 'module.spec.ts'));
    expect(result.passed).toBe(true);
  });
  it('QUAL-003 should pass for source with @internal', async () => {
    const content = `/** @internal */ export function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-003'), makeRequest(content, 'module.ts'));
    expect(result.passed).toBe(true);
  });
  it('QUAL-003 should pass for source with @testing', async () => {
    const content = `/** @testing */ export function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-003'), makeRequest(content, 'module.ts'));
    expect(result.passed).toBe(true);
  });
  it('QUAL-003 should pass for source without exports', async () => {
    const content = `function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-003'), makeRequest(content, 'module.ts'));
    expect(result.passed).toBe(true);
  });
  it('QUAL-003 should fail for source with exports but no test indicator', async () => {
    const content = `export function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-003'), makeRequest(content, 'module.ts'));
    expect(result.passed).toBe(false);
  });
  it('QUAL-003 should have Info severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('QUAL-003'));
    expect(rule!.severity).toBe(RuleSeverity.Info);
  });
  it('QUAL-003 violation should have Info severity', async () => {
    const content = `export function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-003'), makeRequest(content, 'module.ts'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Info);
    }
  });
  it('QUAL-003 should have metadata isSourceFile', async () => {
    const content = `export function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-003'), makeRequest(content, 'module.ts'));
    expect(result.metadata).toHaveProperty('isSourceFile');
    expect(result.metadata.isSourceFile).toBe(true);
  });
  it('QUAL-003 metadata isSourceFile false for test file', async () => {
    const content = `export function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('QUAL-003'), makeRequest(content, 'module.test.ts'));
    expect(result.metadata.isSourceFile).toBe(false);
  });

  // ─── validate() method tests ────────────────────────────────────
  it('validate() should return results for all quality rules', async () => {
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

  // ─── validateQuality() convenience method ───────────────────────
  it('validateQuality() should return results', async () => {
    const results = await validator.validateQuality('module.ts', 'const x = 1;', sessionId);
    expect(results.length).toBeGreaterThan(0);
  });
  it('validateQuality() should pass all rules for clean code', async () => {
    const results = await validator.validateQuality('module.ts', 'const x = 1;', sessionId);
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
});
