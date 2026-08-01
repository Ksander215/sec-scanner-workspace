import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import { ArchitectureValidator } from '../../../core/compliance/architecture-validator.js';
import {
  brandRuleId, brandComplianceSessionId, RuleCategory, RuleSeverity,
  EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType,
} from '../../../core/compliance/types.js';

describe('ArchitectureValidator', () => {
  let engine: RuleEngine;
  let validator: ArchitectureValidator;
  const sessionId = brandComplianceSessionId('test');

  function makeRequest(content: string, path = 'test.ts') {
    return Object.freeze({
      targetType: ValidationTargetType.Architecture,
      targetPath: path,
      targetContent: content,
      sessionId,
      metadata: {},
    } as const);
  }

  beforeEach(async () => {
    engine = new RuleEngine({
      maxConcurrentEvaluations: 5, evaluationTimeoutMs: 5000, failFast: false,
      autoFixEnabled: false, cacheResults: false, cacheTtlMs: 0,
    });
    validator = new ArchitectureValidator(engine);
    await validator.registerRules();
  });

  // ─── Identity tests ─────────────────────────────────────────────
  it('should have a defined id', () => {
    expect(validator.id).toBeDefined();
    expect(typeof validator.id).toBe('string');
  });
  it('should have correct name', () => {
    expect(validator.name).toBe('ArchitectureValidator');
  });
  it('should have correct category', () => {
    expect(validator.category).toBe(RuleCategory.Architecture);
  });
  it('should have id containing architecture-validator', () => {
    expect(validator.id).toContain('architecture-validator');
  });

  // ─── Rule registration tests ────────────────────────────────────
  it('should register exactly 5 rules', async () => {
    const count = await engine.count();
    expect(count).toBe(5);
  });
  it('should register ARCH-001 rule', async () => {
    const rule = await engine.getRule(brandRuleId('ARCH-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('No circular dependencies');
    expect(rule!.severity).toBe(RuleSeverity.Critical);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('should register ARCH-002 rule', async () => {
    const rule = await engine.getRule(brandRuleId('ARCH-002'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Core does not depend on Runtime');
    expect(rule!.severity).toBe(RuleSeverity.Critical);
  });
  it('should register ARCH-003 rule', async () => {
    const rule = await engine.getRule(brandRuleId('ARCH-003'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('No layer violations');
    expect(rule!.severity).toBe(RuleSeverity.Error);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('should register ARCH-004 rule', async () => {
    const rule = await engine.getRule(brandRuleId('ARCH-004'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Branded IDs used');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('should register ARCH-005 rule', async () => {
    const rule = await engine.getRule(brandRuleId('ARCH-005'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Object.freeze used');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('all rules should have the same validatorId', async () => {
    const rules = await engine.listRules();
    for (const rule of rules) {
      expect(rule.validatorId).toBe(validator.id);
    }
  });
  it('all rules should have enabled true', async () => {
    const rules = await engine.listRules();
    for (const rule of rules) {
      expect(rule.enabled).toBe(true);
    }
  });

  // ─── ARCH-001: No circular dependencies ───────────────────────────
  it('ARCH-001 should pass when no content provided', async () => {
    const result = await engine.evaluateRule(brandRuleId('ARCH-001'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('ARCH-001 should pass for clean code', async () => {
    const content = `import { A } from './a.js';\nimport { B } from './b.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('ARCH-001 should fail for repeated imports of same module', async () => {
    const content = `import { A } from './a.js';\nimport { B } from './a.js';\nimport { C } from './a.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('ARCH-001 should pass for exactly 2 imports of same module', async () => {
    const content = `import { A } from './a.js';\nimport { B } from './a.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('ARCH-001 violation should have Critical severity', async () => {
    const content = `import { A } from './a.js';\nimport { B } from './a.js';\nimport { C } from './a.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-001'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Critical);
    }
  });
  it('ARCH-001 violation should mention import count', async () => {
    const content = `import { A } from './a.js';\nimport { B } from './a.js';\nimport { C } from './a.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-001'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].description).toContain('3');
    }
  });
  it('ARCH-001 should have metadata importsChecked', async () => {
    const content = `import { A } from './a.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-001'), makeRequest(content));
    expect(result.metadata).toHaveProperty('importsChecked');
  });

  // ─── ARCH-002: Core does not depend on Runtime ──────────────────
  it('ARCH-002 should pass when no content provided', async () => {
    const result = await engine.evaluateRule(brandRuleId('ARCH-002'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('ARCH-002 should pass for non-core file', async () => {
    const content = `import { X } from './runtime-service.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-002'), makeRequest(content, 'api/handler.ts'));
    expect(result.passed).toBe(true);
  });
  it('ARCH-002 should pass for core/compliance file (exempt)', async () => {
    const content = `import { X } from './runtime-service.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-002'), makeRequest(content, 'core/compliance/foo.ts'));
    expect(result.passed).toBe(true);
  });
  it('ARCH-002 should fail for core file importing runtime', async () => {
    const content = `import { X } from './runtime-service.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-002'), makeRequest(content, 'core/domain/foo.ts'));
    expect(result.passed).toBe(false);
  });
  it('ARCH-002 violation should have Critical severity', async () => {
    const content = `import { X } from './runtime-service.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-002'), makeRequest(content, 'core/domain/foo.ts'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Critical);
    }
  });
  it('ARCH-002 should have metadata isInCoreModule', async () => {
    const result = await engine.evaluateRule(brandRuleId('ARCH-002'), makeRequest('const x = 1;', 'core/domain/foo.ts'));
    expect(result.metadata).toHaveProperty('isInCoreModule');
    expect(result.metadata.isInCoreModule).toBe(true);
  });

  // ─── ARCH-003: No layer violations ──────────────────────────────
  it('ARCH-003 should pass when no content provided', async () => {
    const result = await engine.evaluateRule(brandRuleId('ARCH-003'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('ARCH-003 should pass for clean imports', async () => {
    const content = `import { A } from '../types/foo.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-003'), makeRequest(content, 'domain/bar.ts'));
    expect(result.passed).toBe(true);
  });
  it('ARCH-003 should pass for absolute imports', async () => {
    const content = `import { X } from 'lodash';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-003'), makeRequest(content, 'types/foo.ts'));
    expect(result.passed).toBe(true);
  });
  it('ARCH-003 should fail for upward layer import', async () => {
    const content = `import { A } from '../runtime/foo.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-003'), makeRequest(content, 'types/bar.ts'));
    expect(result.passed).toBe(false);
  });
  it('ARCH-003 violation should have Error severity', async () => {
    const content = `import { A } from '../runtime/foo.js';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-003'), makeRequest(content, 'types/bar.ts'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });
  it('ARCH-003 should have metadata sourceLayer', async () => {
    const result = await engine.evaluateRule(brandRuleId('ARCH-003'), makeRequest('const x = 1;', 'domain/bar.ts'));
    expect(result.metadata).toHaveProperty('sourceLayer');
  });

  // ─── ARCH-004: Branded IDs used ──────────────────────────────────
  it('ARCH-004 should pass when no content provided', async () => {
    const result = await engine.evaluateRule(brandRuleId('ARCH-004'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('ARCH-004 should pass for content with branded IDs', async () => {
    const content = `import { brandRuleId } from './types.js';\nconst id = brandRuleId('TEST-001');`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('ARCH-004 should pass for clean code without IDs', async () => {
    const content = `const x = 1;`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('ARCH-004 should fail for ID fields without branded types', async () => {
    const content = `const ruleId: string = 'test';\nconst violationId: string = 'v1';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-004'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('ARCH-004 violation should have Warning severity', async () => {
    const content = `const ruleId: string = 'test';`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-004'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Warning);
    }
  });
  it('ARCH-004 should have Advisory enforcement', async () => {
    const rule = await engine.getRule(brandRuleId('ARCH-004'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });

  // ─── ARCH-005: Object.freeze used ────────────────────────────────
  it('ARCH-005 should pass when no content provided', async () => {
    const result = await engine.evaluateRule(brandRuleId('ARCH-005'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('ARCH-005 should pass for code using Object.freeze', async () => {
    const content = `return Object.freeze({ x: 1 });`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-005'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('ARCH-005 should pass for code without return objects', async () => {
    const content = `const x = 1;`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-005'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('ARCH-005 should fail for returned objects without freeze', async () => {
    const content = `return { x: 1, y: 2 };`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-005'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('ARCH-005 violation should have Warning severity', async () => {
    const content = `return { x: 1 };`;
    const result = await engine.evaluateRule(brandRuleId('ARCH-005'), makeRequest(content));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Warning);
    }
  });
  it('ARCH-005 should have Advisory enforcement', async () => {
    const rule = await engine.getRule(brandRuleId('ARCH-005'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });

  // ─── validate() method tests ────────────────────────────────────
  it('validate() should return results for all architecture rules', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    expect(results.length).toBe(5);
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

  // ─── validateArchitecture() convenience method ───────────────────
  it('validateArchitecture() should return results', async () => {
    const results = await validator.validateArchitecture('test.ts', 'const x = 1;', sessionId);
    expect(results.length).toBeGreaterThan(0);
  });
  it('validateArchitecture() should pass all rules for clean code', async () => {
    const results = await validator.validateArchitecture('test.ts', 'const x = 1;', sessionId);
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
    const rules = await engine.listRules();
    for (const rule of rules) {
      expect(rule.autoFix).toBe(AutoFixCapability.None);
    }
  });
  it('all rules should have non-empty source', async () => {
    const rules = await engine.listRules();
    for (const rule of rules) {
      expect(rule.source.length).toBeGreaterThan(0);
    }
  });
  it('all rules should have non-empty description', async () => {
    const rules = await engine.listRules();
    for (const rule of rules) {
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });
  it('validate() results should have correct category', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.category).toBe(RuleCategory.Architecture);
    }
  });
  it('validate() results should have non-negative duration', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
  it('validateArchitecture() should evaluate all 5 rules', async () => {
    const results = await validator.validateArchitecture('test.ts', 'const x = 1;', sessionId);
    expect(results.length).toBe(5);
  });
  it('ARCH-001 should handle very long content', async () => {
    const content = `import { A } from './a.js';\n`.repeat(1000);
    const result = await engine.evaluateRule(brandRuleId('ARCH-001'), makeRequest(content));
    expect(result).toBeDefined();
  });
  it('all rules should have non-empty tags', async () => {
    const rules = await engine.listRules();
    for (const rule of rules) {
      expect(rule.tags.length).toBeGreaterThan(0);
    }
  });
});
