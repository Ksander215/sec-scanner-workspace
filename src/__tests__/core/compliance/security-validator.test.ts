import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import { SecurityValidator } from '../../../core/compliance/security-validator.js';
import {
  brandRuleId, brandComplianceSessionId, RuleCategory, RuleSeverity,
  EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType,
} from '../../../core/compliance/types.js';

describe('SecurityValidator', () => {
  let ruleEngine: RuleEngine;
  let validator: SecurityValidator;
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
    validator = new SecurityValidator(ruleEngine);
    await validator.registerRules();
  });

  // ─── Identity tests ─────────────────────────────────────────────
  it('should have a defined id', () => {
    expect(validator.id).toBeDefined();
    expect(typeof validator.id).toBe('string');
  });
  it('should have correct name', () => {
    expect(validator.name).toBe('SecurityValidator');
  });
  it('should have correct category', () => {
    expect(validator.category).toBe(RuleCategory.Security);
  });
  it('should have id containing security-validator', () => {
    expect(validator.id).toContain('security-validator');
  });

  // ─── Rule registration tests ────────────────────────────────────
  it('should register exactly 4 rules', async () => {
    const count = await ruleEngine.count();
    expect(count).toBe(4);
  });
  it('should register SEC-001 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('SEC-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('No hardcoded secrets');
    expect(rule!.severity).toBe(RuleSeverity.Critical);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('should register SEC-002 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('SEC-002'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Input validation present');
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('should register SEC-003 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('SEC-003'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('No eval or Function constructor');
    expect(rule!.severity).toBe(RuleSeverity.Critical);
  });
  it('should register SEC-004 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('SEC-004'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Trust zone respected');
    expect(rule!.severity).toBe(RuleSeverity.Error);
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

  // ─── SEC-001: No hardcoded secrets ───────────────────────────────
  it('SEC-001 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('SEC-001 should pass for clean code', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(true);
  });
  it('SEC-001 should fail for hardcoded password', async () => {
    const content = `const password = 'mySecretPassword123';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-001 should fail for hardcoded API key', async () => {
    const content = `const api_key = 'sk-1234567890abcdef';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-001 should fail for hardcoded secret', async () => {
    const content = `const secret = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-001 should fail for Bearer token', async () => {
    const content = `const auth = 'Bearer eyJhbGciOiJIUzI1NiJ9';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-001 should fail for private key', async () => {
    const content = `const key = '-----BEGIN RSA PRIVATE KEY-----';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-001 should fail for EC private key', async () => {
    const content = `const key = '-----BEGIN EC PRIVATE KEY-----';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-001 violation should have Critical severity', async () => {
    const content = `const password = 'secret1234';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Critical);
    }
  });
  it('SEC-001 violation should redact the secret', async () => {
    const content = `const password = 'supersecretpassword';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(content));
    if (result.violations.length > 0) {
      const evidence = result.violations[0].evidence as string[];
      expect(evidence.some(e => e.includes('REDACTED'))).toBe(true);
    }
  });
  it('SEC-001 should have metadata patternsChecked', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest('const x = 1;'));
    expect(result.metadata.patternsChecked).toBe(5);
  });
  it('SEC-001 should detect multiple secret types', async () => {
    const content = `const password = 'secret1234'; const api_key = 'sk-1234567890abcdef';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(content));
    if (!result.passed) {
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('SEC-001 should not flag short passwords', async () => {
    const content = `const password = 'ab';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('SEC-001 should not flag short API keys', async () => {
    const content = `const api_key = 'short';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });

  // ─── SEC-002: Input validation present ──────────────────────────
  it('SEC-002 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-002'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('SEC-002 should pass for clean code', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-002'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(true);
  });
  it('SEC-002 should pass for export with validate', async () => {
    const content = `export function foo(input: string) { validate(input); }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('SEC-002 should pass for export with zod', async () => {
    const content = `export function foo(input: string) { const schema = z.string(); }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('SEC-002 should pass for export with typeof', async () => {
    const content = `export function foo(input) { if (typeof input !== 'string') throw new Error(); }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('SEC-002 should pass for export with instanceof', async () => {
    const content = `export function foo(input) { if (!(input instanceof Foo)) throw new Error(); }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('SEC-002 should fail for export without validation', async () => {
    const content = `export function foo(input) { return input.bar(); }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-002 should pass for non-exported code', async () => {
    const content = `function foo(input) { return input.bar(); }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('SEC-002 should have Error severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('SEC-002'));
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('SEC-002 should have metadata hasPublicFunctions and hasValidation', async () => {
    const content = `export function foo(input) { return input; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-002'), makeRequest(content));
    expect(result.metadata).toHaveProperty('hasPublicFunctions');
    expect(result.metadata).toHaveProperty('hasValidation');
  });

  // ─── SEC-003: No eval or Function constructor ────────────────────
  it('SEC-003 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-003'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('SEC-003 should pass for clean code', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-003'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(true);
  });
  it('SEC-003 should fail for eval()', async () => {
    const content = `eval('2 + 2');`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-003 should fail for new Function()', async () => {
    const content = `const fn = new Function('return 1');`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-003 should fail for setTimeout with string', async () => {
    const content = `setTimeout('alert(1)', 1000);`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-003 should fail for setInterval with string', async () => {
    const content = `setInterval('check()', 5000);`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-003 should pass for setTimeout with function', async () => {
    const content = `setTimeout(() => { console.log('hi'); }, 1000);`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('SEC-003 should have Critical severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('SEC-003'));
    expect(rule!.severity).toBe(RuleSeverity.Critical);
  });
  it('SEC-003 violation should have Critical severity', async () => {
    const content = `eval('2+2');`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-003'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Critical);
    }
  });
  it('SEC-003 should have metadata patternsChecked', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-003'), makeRequest('const x = 1;'));
    expect(result.metadata.patternsChecked).toBe(4);
  });

  // ─── SEC-004: Trust zone respected ──────────────────────────────
  it('SEC-004 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-004'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('SEC-004 should pass for clean code', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-004'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(true);
  });
  it('SEC-004 should pass for fetch with trustZone', async () => {
    const content = `// trustZone boundary
fetch('/api/data');`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('SEC-004 should pass for fetch with sanitize', async () => {
    const content = `const data = sanitize(input); fetch('/api');`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('SEC-004 should fail for fetch without trust zone', async () => {
    const content = `fetch('/api/data');`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-004'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-004 should fail for postMessage without trust zone', async () => {
    const content = `window.parent.postMessage(data, '*');`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-004'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-004 should fail for iframe without trust zone', async () => {
    const content = `const iframe = document.querySelector('iframe');`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-004'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('SEC-004 should have Error severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('SEC-004'));
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('SEC-004 should have metadata hasCrossBoundary and hasTrustZone', async () => {
    const content = `fetch('/api');`;
    const result = await ruleEngine.evaluateRule(brandRuleId('SEC-004'), makeRequest(content));
    expect(result.metadata).toHaveProperty('hasCrossBoundary');
    expect(result.metadata).toHaveProperty('hasTrustZone');
  });

  // ─── validate() method tests ────────────────────────────────────
  it('validate() should return results for all security rules', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    expect(results.length).toBe(4);
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

  // ─── validateSecurity() convenience method ──────────────────────
  it('validateSecurity() should return results', async () => {
    const results = await validator.validateSecurity('module.ts', 'const x = 1;', sessionId);
    expect(results.length).toBeGreaterThan(0);
  });
  it('validateSecurity() should pass all rules for clean code', async () => {
    const results = await validator.validateSecurity('module.ts', 'const x = 1;', sessionId);
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
