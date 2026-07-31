import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import { TraceValidator } from '../../../core/compliance/trace-validator.js';
import {
  brandRuleId, brandComplianceSessionId, RuleCategory, RuleSeverity,
  EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType,
} from '../../../core/compliance/types.js';

describe('TraceValidator', () => {
  let ruleEngine: RuleEngine;
  let validator: TraceValidator;
  const sessionId = brandComplianceSessionId('test');

  function makeRequest(content: string, path = 'test.ts') {
    return Object.freeze({
      targetType: ValidationTargetType.Documentation,
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
    validator = new TraceValidator(ruleEngine);
    await validator.registerRules();
  });

  // ─── Identity tests ─────────────────────────────────────────────
  it('should have a defined id', () => {
    expect(validator.id).toBeDefined();
    expect(typeof validator.id).toBe('string');
  });
  it('should have correct name', () => {
    expect(validator.name).toBe('TraceValidator');
  });
  it('should have Documentation category', () => {
    expect(validator.category).toBe(RuleCategory.Documentation);
  });
  it('should have id containing trace-validator', () => {
    expect(validator.id).toContain('trace-validator');
  });

  // ─── Rule registration tests ────────────────────────────────────
  it('should register exactly 3 rules', async () => {
    const count = await ruleEngine.count();
    expect(count).toBe(3);
  });
  it('should register TRACE-001 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('TRACE-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('ADR references principles');
    expect(rule!.severity).toBe(RuleSeverity.Error);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('should register TRACE-002 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('TRACE-002'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Code references ADR');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('should register TRACE-003 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('TRACE-003'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Test covers contract');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('all rules should have the same validatorId', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.validatorId).toBe(validator.id);
    }
  });

  // ─── TRACE-001: ADR references principles ────────────────────────
  it('TRACE-001 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('TRACE-001 should pass for non-ADR file', async () => {
    const content = `Some random text without ADR reference`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'doc.md'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-001 should pass for ADR with PHI reference', async () => {
    const content = `ADR-001: Layered Architecture. References PHI-001.000 §6.`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'ADR-001.md'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-001 should pass for ADR with GOV reference', async () => {
    const content = `ADR-001: Layered Architecture. References GOV-008.000 §5.`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'ADR-001.md'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-001 should pass for ADR with principle keyword', async () => {
    const content = `ADR-001: This follows the principle of local-first processing.`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'ADR-001.md'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-001 should pass for ADR with governance keyword', async () => {
    const content = `ADR-001: This follows governance policy GOV-008.`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'ADR-001.md'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-001 should fail for ADR without principle references', async () => {
    const content = `ADR-001: Layered Architecture. We use layers.`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'ADR-001.md'));
    expect(result.passed).toBe(false);
  });
  it('TRACE-001 should detect ADR in content', async () => {
    const content = `ADR-001: Architecture. We use layers.`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'doc.md'));
    expect(result.passed).toBe(false);
  });
  it('TRACE-001 should detect ADR in file path', async () => {
    const content = `This is some ADR content without principle refs`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'docs/adr/001.md'));
    expect(result.passed).toBe(false);
  });
  it('TRACE-001 violation should have Error severity', async () => {
    const content = `ADR-001: Some decision`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'ADR-001.md'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });
  it('TRACE-001 violation should recommend PHI or GOV refs', async () => {
    const content = `ADR-001: Some decision`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'ADR-001.md'));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('PHI');
    }
  });

  // ─── TRACE-002: Code references ADR ─────────────────────────────
  it('TRACE-002 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-002'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('TRACE-002 should pass for non-ts file', async () => {
    const content = `Some text without ADR reference`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-002'), makeRequest(content, 'doc.md'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-002 should pass for ts file with ADR reference', async () => {
    const content = `// ADR-001: Layered architecture
class Foo {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-002'), makeRequest(content, 'foo.ts'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-002 should pass for ts file without complex logic', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-002'), makeRequest(content, 'foo.ts'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-002 should fail for ts file with class but no ADR ref', async () => {
    const content = `class Foo { bar() {} }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-002'), makeRequest(content, 'foo.ts'));
    expect(result.passed).toBe(false);
  });
  it('TRACE-002 should fail for ts file with function but no ADR ref', async () => {
    const content = `function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-002'), makeRequest(content, 'foo.ts'));
    expect(result.passed).toBe(false);
  });
  it('TRACE-002 should fail for ts file with interface but no ADR ref', async () => {
    const content = `interface Foo {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-002'), makeRequest(content, 'foo.ts'));
    expect(result.passed).toBe(false);
  });
  it('TRACE-002 should have Warning severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('TRACE-002'));
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('TRACE-002 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('TRACE-002'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });

  // ─── TRACE-003: Test covers contract ─────────────────────────────
  it('TRACE-003 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('TRACE-003 should pass for non-test file', async () => {
    const content = `expect(x).toBe(1)`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, 'foo.ts'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-003 should pass for test file with contract terms', async () => {
    const content = `it('implements interface', () => { expect(x).toBe(1); });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, 'foo.test.ts'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-003 should pass for test file with governance terms', async () => {
    const content = `it('complies with policy', () => { expect(x).toBe(1); });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, 'foo.test.ts'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-003 should fail for test file without contract terms', async () => {
    const content = `it('works', () => { expect(x).toBe(1); });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, 'foo.test.ts'));
    expect(result.passed).toBe(false);
  });
  it('TRACE-003 should detect spec.ts extension', async () => {
    const content = `it('works', () => { assert(x); });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, 'foo.spec.ts'));
    expect(result.passed).toBe(false);
  });
  it('TRACE-003 should detect __tests__ directory', async () => {
    const content = `it('works', () => { should(x); });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, '__tests__/foo.ts'));
    expect(result.passed).toBe(false);
  });
  it('TRACE-003 should have Warning severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('TRACE-003'));
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });

  // ─── validate() method tests ────────────────────────────────────
  it('validate() should return results for all trace rules', async () => {
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

  // ─── validateTraceability() convenience method ──────────────────
  it('validateTraceability() should return results', async () => {
    const results = await validator.validateTraceability('doc.md', 'ADR-001: content', sessionId);
    expect(results.length).toBeGreaterThan(0);
  });
  it('validateTraceability() should pass for empty content', async () => {
    const results = await validator.validateTraceability('doc.md', '', sessionId);
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
  it('validateTraceability() should evaluate all 3 rules', async () => {
    const results = await validator.validateTraceability('doc.md', 'ADR-001: refs PHI-001', sessionId);
    expect(results.length).toBe(3);
  });
  it('TRACE-001 should pass for ADR with gov keyword', async () => {
    const content = `ADR-001: Decision. gov policy applies.`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'ADR-001.md'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-001 should detect ADR with underscore in filename', async () => {
    const content = `ADR without refs`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'adr_001.md'));
    expect(result.passed).toBe(false);
  });
  it('TRACE-001 violation should have Detected state', async () => {
    const content = `ADR-001: Some decision`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-001'), makeRequest(content, 'ADR-001.md'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('TRACE-002 should pass for non-ts non-js file', async () => {
    const content = `class Foo {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-002'), makeRequest(content, 'foo.py'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-002 violation should have Detected state', async () => {
    const content = `class Foo {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-002'), makeRequest(content, 'foo.ts'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('TRACE-003 should pass for test file with implement keyword', async () => {
    const content = `it('implements contract', () => { expect(true).toBe(true); });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, 'foo.test.ts'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-003 should detect test dir in path', async () => {
    const content = `it('works', () => { assert(true); });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, 'tests/foo.ts'));
    expect(result.passed).toBe(false);
  });
  it('TRACE-003 violation should have Detected state', async () => {
    const content = `it('works', () => { expect(true).toBe(true); });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, 'foo.test.ts'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('TRACE-001 violation should have Error severity on rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('TRACE-001'));
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('TRACE-001 violation should have Blocking enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('TRACE-001'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('TRACE-002 violation should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('TRACE-002'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('TRACE-003 violation should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('TRACE-003'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('TRACE-002 should pass for async function', async () => {
    const content = `// ADR-001
async function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-002'), makeRequest(content, 'foo.ts'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-003 should pass for test file without assertions', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, 'foo.test.ts'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-003 should pass for test file with should', async () => {
    const content = `it('implements contract', () => { should(x).exist; });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, 'foo.test.ts'));
    expect(result.passed).toBe(true);
  });
  it('TRACE-003 should fail for test file with assert without contract', async () => {
    const content = `it('works', () => { assert(x); });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('TRACE-003'), makeRequest(content, 'foo.test.ts'));
    expect(result.passed).toBe(false);
  });
  it('validate() results should have correct category', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.category).toBe(RuleCategory.Documentation);
    }
  });
});
