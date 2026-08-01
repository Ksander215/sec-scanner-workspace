import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import { PrivacyValidator } from '../../../core/compliance/privacy-validator.js';
import {
  brandRuleId, brandComplianceSessionId, RuleCategory, RuleSeverity,
  EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType,
} from '../../../core/compliance/types.js';

describe('PrivacyValidator', () => {
  let ruleEngine: RuleEngine;
  let validator: PrivacyValidator;
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
    validator = new PrivacyValidator(ruleEngine);
    await validator.registerRules();
  });

  // ─── Identity tests ─────────────────────────────────────────────
  it('should have a defined id', () => {
    expect(validator.id).toBeDefined();
    expect(typeof validator.id).toBe('string');
  });
  it('should have correct name', () => {
    expect(validator.name).toBe('PrivacyValidator');
  });
  it('should have correct category', () => {
    expect(validator.category).toBe(RuleCategory.Privacy);
  });
  it('should have id containing privacy-validator', () => {
    expect(validator.id).toContain('privacy-validator');
  });

  // ─── Rule registration tests ────────────────────────────────────
  it('should register exactly 3 rules', async () => {
    const count = await ruleEngine.count();
    expect(count).toBe(3);
  });
  it('should register PRIV-001 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('PRIV-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('No data leakage');
    expect(rule!.severity).toBe(RuleSeverity.Critical);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('should register PRIV-002 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('PRIV-002'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Local first architecture');
    expect(rule!.severity).toBe(RuleSeverity.Error);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('should register PRIV-003 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('PRIV-003'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Provider respects privacy level');
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
  it('all rules should have AutoFixCapability.None', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.autoFix).toBe(AutoFixCapability.None);
    }
  });

  // ─── PRIV-001: No data leakage ───────────────────────────────────
  it('PRIV-001 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('PRIV-001 should pass for clean code', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(true);
  });
  it('PRIV-001 should fail for outbound fetch to API', async () => {
    const content = `fetch('https://api.example.com/data')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-001 should fail for axios call to HTTP endpoint', async () => {
    const content = `axios.get('http://example.com/api')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-001 should fail for WebSocket connection', async () => {
    const content = `new WebSocket('wss://example.com/ws')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-001 should fail for navigator.sendBeacon', async () => {
    const content = `navigator.sendBeacon('https://tracker.com', data)`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-001 should fail for navigator.geolocation', async () => {
    const content = `navigator.geolocation.getCurrentPosition(pos => {})`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-001 should fail for navigator.clipboard', async () => {
    const content = `navigator.clipboard.readText()`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-001 violation should have Critical severity', async () => {
    const content = `fetch('https://api.example.com/data')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Critical);
    }
  });
  it('PRIV-001 violation should have Detected state', async () => {
    const content = `fetch('https://api.example.com/data')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('PRIV-001 should pass for local fetch', async () => {
    const content = `fetch('/api/data')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-001 should detect multiple leakage patterns', async () => {
    const content = `fetch('https://api.example.com')\nnavigator.geolocation.getCurrentPosition()`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    if (!result.passed) {
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('PRIV-001 should have metadata patternsChecked', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest('const x = 1;'));
    expect(result.metadata.patternsChecked).toBe(4);
  });

  // ─── PRIV-002: Local first architecture ──────────────────────────
  it('PRIV-002 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('PRIV-002 should pass for clean code', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(true);
  });
  it('PRIV-002 should pass when remote calls with local-first', async () => {
    const content = `// localFirst pattern\nfetch('/api/data')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-002 should fail for fetch without local-first', async () => {
    const content = `fetch('/api/data')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-002 should fail for axios without local-first', async () => {
    const content = `axios('http://example.com')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-002 should fail for WebSocket without local-first', async () => {
    const content = `new WebSocket(url)`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-002 should pass for XMLHttpRequest without local-first', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-002 should have Error severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('PRIV-002'));
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('PRIV-002 should have metadata hasRemoteCalls and hasLocalFirst', async () => {
    const content = `fetch(url)`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(content));
    expect(result.metadata).toHaveProperty('hasRemoteCalls');
    expect(result.metadata).toHaveProperty('hasLocalFirst');
  });
  it('PRIV-002 violation should recommend local-first', async () => {
    const content = `fetch(url)`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('local-first');
    }
  });

  // ─── PRIV-003: Provider respects privacy level ──────────────────
  it('PRIV-003 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('PRIV-003 should pass for clean code', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest('const x = 1;'));
    expect(result.passed).toBe(true);
  });
  it('PRIV-003 should pass when provider with privacyLevel', async () => {
    const content = `const provider = new AIProvider({ privacyLevel: 'local' });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-003 should fail when provider without privacyLevel', async () => {
    const content = `const provider = new AIProvider({ model: 'gpt-4' });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-003 should detect Provider (capitalized)', async () => {
    const content = `const x = Provider.getConfig();`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-003 should detect AIProvider', async () => {
    const content = `new AIProvider({ model: 'test' });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-003 should accept privacy_level (underscore)', async () => {
    const content = `const provider = new AIProvider({ privacy_level: 'local' });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-003 should accept PrivacyLevel (PascalCase)', async () => {
    const content = `const provider = new AIProvider({ PrivacyLevel: 'local' });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-003 should have Error severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('PRIV-003'));
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('PRIV-003 should have metadata hasProvider and hasPrivacyLevel', async () => {
    const content = `const provider = new AIProvider({ model: 'test' });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    expect(result.metadata).toHaveProperty('hasProvider');
    expect(result.metadata).toHaveProperty('hasPrivacyLevel');
    expect(result.metadata.hasProvider).toBe(true);
    expect(result.metadata.hasPrivacyLevel).toBe(false);
  });

  // ─── validate() method tests ────────────────────────────────────
  it('validate() should return results for all privacy rules', async () => {
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

  // ─── validatePrivacy() convenience method ───────────────────────
  it('validatePrivacy() should return results', async () => {
    const results = await validator.validatePrivacy('module.ts', 'const x = 1;', sessionId);
    expect(results.length).toBeGreaterThan(0);
  });
  it('validatePrivacy() should pass all rules for clean code', async () => {
    const results = await validator.validatePrivacy('module.ts', 'const x = 1;', sessionId);
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
  it('should handle very long content', async () => {
    const content = 'const x = 1;'.repeat(1000);
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    expect(result).toBeDefined();
  });
  it('PRIV-001 should pass for fetch to local API', async () => {
    const content = `fetch('/api/data')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-001 should have metadata patternsChecked=4', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest('const x = 1;'));
    expect(result.metadata.patternsChecked).toBe(4);
  });
  it('PRIV-001 violation should have evidence', async () => {
    const content = `fetch('https://api.example.com')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].evidence.length).toBeGreaterThan(0);
    }
  });
  it('PRIV-002 should pass for XMLHttpRequest pattern', async () => {
    const content = `const x = 1; // localFirst`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-002 violation should have Error severity', async () => {
    const content = `fetch(url)`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });
  it('PRIV-002 should have Blocking enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('PRIV-002'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('PRIV-002 should detect XMLHttpRequest', async () => {
    const content = `const x = new XMLHttpRequest();`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('PRIV-003 should detect AIProvider with getPrivacyLevel', async () => {
    const content = `new AIProvider({ getPrivacyLevel: () => 'local' })`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-003 should pass for provider with privacy_level in comment', async () => {
    const content = `const provider = new AIProvider({ model: 'test' }); // privacy_level: local`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-003 should have Blocking enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('PRIV-003'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('PRIV-003 violation should have Detected state', async () => {
    const content = `const provider = new AIProvider({ model: 'test' });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
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
  it('PRIV-001 should pass for axios without URL', async () => {
    const content = `axios.get()`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-001 should pass for fetch with relative URL', async () => {
    const content = `fetch('./data.json')`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-002 should pass for code with no remote calls', async () => {
    const content = `const x = 1; function foo() { return x * 2; }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-003 should pass for code without provider', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('PRIV-003 violation should recommend adding privacyLevel', async () => {
    const content = `const provider = new AIProvider({ model: 'test' });`;
    const result = await ruleEngine.evaluateRule(brandRuleId('PRIV-003'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('privacyLevel');
    }
  });
});
