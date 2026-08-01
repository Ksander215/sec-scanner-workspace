import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import { CapabilityValidator } from '../../../core/compliance/capability-validator.js';
import {
  brandRuleId, brandComplianceSessionId, RuleCategory, RuleSeverity,
  EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType,
} from '../../../core/compliance/types.js';

describe('CapabilityValidator', () => {
  let ruleEngine: RuleEngine;
  let validator: CapabilityValidator;
  const sessionId = brandComplianceSessionId('test');

  function makeRequest(content: string, path = 'capability.ts') {
    return Object.freeze({
      targetType: ValidationTargetType.CapabilityPack,
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
    validator = new CapabilityValidator(ruleEngine);
    await validator.registerRules();
  });

  // ─── Identity tests ─────────────────────────────────────────────
  it('should have a defined id', () => {
    expect(validator.id).toBeDefined();
    expect(typeof validator.id).toBe('string');
  });
  it('should have correct name', () => {
    expect(validator.name).toBe('CapabilityValidator');
  });
  it('should have correct category', () => {
    expect(validator.category).toBe(RuleCategory.CapabilityPack);
  });
  it('should have id containing capability-validator', () => {
    expect(validator.id).toContain('capability-validator');
  });

  // ─── Rule registration tests ────────────────────────────────────
  it('should register exactly 6 rules', async () => {
    const count = await ruleEngine.count();
    expect(count).toBe(6);
  });
  it('should register CAP-001 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CAP-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Manifest present');
    expect(rule!.severity).toBe(RuleSeverity.Critical);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('should register CAP-002 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CAP-002'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Permissions defined');
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('should register CAP-003 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CAP-003'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Policies defined');
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('should register CAP-004 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CAP-004'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Dependencies declared');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('should register CAP-005 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CAP-005'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Contracts implemented');
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('should register CAP-006 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CAP-006'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Sandbox isolation');
    expect(rule!.severity).toBe(RuleSeverity.Critical);
  });
  it('all rules should have the same validatorId', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.validatorId).toBe(validator.id);
    }
  });
  it('CAP-004 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CAP-004'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });

  // ─── CAP-001: Manifest present ───────────────────────────────────
  it('CAP-001 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CAP-001 should pass for valid manifest', async () => {
    const content = `const manifest = { name: 'test', version: '1.0.0' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-001 should fail when no manifest keyword', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-001 should fail when manifest missing name', async () => {
    const content = `const manifest = { version: '1.0.0' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-001 should fail when manifest missing version', async () => {
    const content = `const manifest = { name: 'test' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-001 should pass with Manifest capitalized', async () => {
    const content = `const Manifest = { name: 'test', version: '1.0.0' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-001 violation should have Critical severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Critical);
    }
  });
  it('CAP-001 violation should recommend adding manifest', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('manifest');
    }
  });

  // ─── CAP-002: Permissions defined ────────────────────────────────
  it('CAP-002 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-002'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CAP-002 should pass when permissions present', async () => {
    const content = `const permissions = ['read', 'write'];`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-002 should pass when permission (singular) present', async () => {
    const content = `const permission = 'admin';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-002 should fail when no permissions', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-002 violation should have Error severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-002'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });
  it('CAP-002 violation should have Blocking enforcement', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-002'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    }
  });

  // ─── CAP-003: Policies defined ───────────────────────────────────
  it('CAP-003 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-003'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CAP-003 should pass when policy present', async () => {
    const content = `const policy = { name: 'test' };`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-003 should pass when policies (plural) present', async () => {
    const content = `const policies = [];`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-003 should fail when no policy keyword', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-003 violation should have Error severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-003'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });

  // ─── CAP-004: Dependencies declared ──────────────────────────────
  it('CAP-004 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-004'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CAP-004 should pass when no imports', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-004 should pass when imports and dependencies declared', async () => {
    const content = `import { x } from 'y';\nconst dependencies = ['y'];`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-004 should fail when imports without dependencies', async () => {
    const content = `import { x } from 'y';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-004'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-004 should pass with dependency (singular)', async () => {
    const content = `import { x } from 'y';\nconst dependency = 'y';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-004 should have Warning severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CAP-004'));
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('CAP-004 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CAP-004'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });

  // ─── CAP-005: Contracts implemented ──────────────────────────────
  it('CAP-005 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-005'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CAP-005 should pass when implements keyword present', async () => {
    const content = `class Foo implements IBar {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-005'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-005 should pass when interface keyword present', async () => {
    const content = `interface IBar {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-005'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-005 should pass when export class present', async () => {
    const content = `export class Foo {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-005'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-005 should pass when export function present', async () => {
    const content = `export function foo() {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-005'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-005 should fail when no contracts or exports', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-005'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-005 violation should have Error severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-005'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });

  // ─── CAP-006: Sandbox isolation ──────────────────────────────────
  it('CAP-006 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CAP-006 should pass for clean code', async () => {
    const content = `const x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-006 should fail for globalThis access without sandbox', async () => {
    const content = `const x = globalThis.foo;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-006 should fail for process.env access without sandbox', async () => {
    const content = `const x = process.env.NODE_ENV;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-006 should fail for fs import without sandbox', async () => {
    const content = `import fs from 'fs';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-006 should pass for fs import with sandbox keyword', async () => {
    const content = `// sandbox mode\nimport fs from 'fs';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-006 should pass for process.exit with sandbox', async () => {
    const content = `// sandbox\nprocess.exit(1);`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-006 should fail for require fs', async () => {
    const content = `const fs = require('fs');`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-006 should have Critical severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CAP-006'));
    expect(rule!.severity).toBe(RuleSeverity.Critical);
  });
  it('CAP-006 violation should have metadata about access types', async () => {
    const content = `const x = globalThis.foo; process.env.X;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].metadata).toHaveProperty('hasGlobalAccess');
      expect(result.violations[0].metadata).toHaveProperty('hasProcessAccess');
    }
  });

  // ─── validate() method tests ────────────────────────────────────
  it('validate() should return results for all capability rules', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    expect(results.length).toBe(6);
  });
  it('validate() should return RuleEvaluationResult[]', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r).toHaveProperty('ruleId');
      expect(r).toHaveProperty('passed');
      expect(r).toHaveProperty('violations');
    }
  });

  // ─── validateCapability() convenience method ────────────────────
  it('validateCapability() should return results', async () => {
    const results = await validator.validateCapability('cap.ts', sessionId);
    expect(results.length).toBeGreaterThan(0);
  });
  it('validateCapability() should pass all rules for empty content', async () => {
    const results = await validator.validateCapability('cap.ts', sessionId);
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
  it('should handle very long content', async () => {
    const content = 'const x = 1;'.repeat(1000);
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest(content));
    expect(result).toBeDefined();
  });
  it('CAP-001 should pass for manifest with version first', async () => {
    const content = `version: '1.0.0'\nmanifest: true\nname: 'test'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-001 should fail for manifest without name or version', async () => {
    const content = `manifest: { description: 'test' }`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-001 violation should have Blocking enforcement', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    }
  });
  it('CAP-001 violation should have Detected state', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('CAP-002 should fail for Permissions capitalized', async () => {
    const content = `const Permissions = [];`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-002 violation should have Blocking enforcement', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-002'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    }
  });
  it('CAP-003 should pass for Policies capitalized', async () => {
    const content = `const Policies = [];`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-003 violation should have Blocking enforcement', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-003'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    }
  });
  it('CAP-004 should pass with Dependencies capitalized', async () => {
    const content = `import { x } from 'y';\nconst Dependencies = ['y'];`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-004 should pass for require-style imports with dependencies', async () => {
    const content = `const x = require('y');\ndependencies: ['y'];`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-005 should pass for export interface', async () => {
    const content = `export interface IFoo {}`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-005'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-005 violation should have Error severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-005'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });
  it('CAP-005 violation should have Blocking enforcement', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-005'), makeRequest('const x = 1;'));
    if (result.violations.length > 0) {
      expect(result.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    }
  });
  it('CAP-006 should detect process.kill without sandbox', async () => {
    const content = `process.kill(pid);`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('CAP-006 should have Blocking enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('CAP-006'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('CAP-006 violation should mention sandbox', async () => {
    const content = `globalThis.x = 1;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('sandbox');
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
  it('validate() results should have correct category', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.category).toBe(RuleCategory.CapabilityPack);
    }
  });
  it('validate() results should have non-negative duration', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
  it('validateCapability() should evaluate all 6 rules', async () => {
    const results = await validator.validateCapability('cap.ts', sessionId);
    expect(results.length).toBe(6);
  });
  it('all results should produce frozen results', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(Object.isFrozen(r)).toBe(true);
    }
  });
  it('CAP-006 should pass for Sandbox capitalized', async () => {
    const content = `// Sandbox mode\nconst x = globalThis.foo;`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-006 should pass for SANDBOX uppercase', async () => {
    const content = `// SANDBOX\nprocess.env.X = '1';`;
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('CAP-001 violation should have metadata', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-001'), makeRequest('manifest without name or version'));
    if (result.violations.length > 0) {
      expect(result.violations[0].metadata).toBeDefined();
    }
  });
  it('CAP-002 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-002'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CAP-003 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-003'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CAP-004 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-004'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CAP-005 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-005'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('CAP-006 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('CAP-006'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
});
