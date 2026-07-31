import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import { DocumentationValidator } from '../../../core/compliance/documentation-validator.js';
import {
  brandRuleId, brandComplianceSessionId, RuleCategory, RuleSeverity,
  EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType,
} from '../../../core/compliance/types.js';

describe('DocumentationValidator', () => {
  let ruleEngine: RuleEngine;
  let validator: DocumentationValidator;
  const sessionId = brandComplianceSessionId('test');

  function makeRequest(content: string, path = 'doc.md') {
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
    validator = new DocumentationValidator(ruleEngine);
    await validator.registerRules();
  });

  // ─── Identity tests ─────────────────────────────────────────────
  it('should have a defined id', () => {
    expect(validator.id).toBeDefined();
    expect(typeof validator.id).toBe('string');
  });
  it('should have correct name', () => {
    expect(validator.name).toBe('DocumentationValidator');
  });
  it('should have correct category', () => {
    expect(validator.category).toBe(RuleCategory.Documentation);
  });
  it('should have id containing documentation-validator', () => {
    expect(validator.id).toContain('documentation-validator');
  });

  // ─── Rule registration tests ────────────────────────────────────
  it('should register exactly 5 rules', async () => {
    const count = await ruleEngine.count();
    expect(count).toBe(5);
  });
  it('should register DOC-001 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('DOC-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Document has ID');
    expect(rule!.severity).toBe(RuleSeverity.Critical);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('should register DOC-002 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('DOC-002'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Document has version');
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });
  it('should register DOC-003 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('DOC-003'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Document has owner');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });
  it('should register DOC-004 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('DOC-004'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Document has references');
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('should register DOC-005 rule', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('DOC-005'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Document has status');
    expect(rule!.severity).toBe(RuleSeverity.Error);
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });
  it('all rules should have the same validatorId', async () => {
    const rules = await ruleEngine.listRules();
    for (const rule of rules) {
      expect(rule.validatorId).toBe(validator.id);
    }
  });

  // ─── DOC-001: Document has ID ────────────────────────────────────
  it('DOC-001 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-001'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('DOC-001 should pass when id field present', async () => {
    const content = `id: 'doc-001'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-001 should pass when docId field present', async () => {
    const content = `docId: 'doc-001'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-001 should pass when documentId field present', async () => {
    const content = `documentId: 'doc-001'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-001 should fail when no id field', async () => {
    const content = `title: 'My Document'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-001'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('DOC-001 violation should have Critical severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-001'), makeRequest('title: x'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Critical);
    }
  });
  it('DOC-001 violation should recommend adding id', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-001'), makeRequest('title: x'));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('identifier');
    }
  });
  it('DOC-001 should accept quoted id field', async () => {
    const content = `"id": 'doc-001'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });

  // ─── DOC-002: Document has version ───────────────────────────────
  it('DOC-002 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-002'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('DOC-002 should pass for semver version', async () => {
    const content = `version: '1.0.0'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-002 should pass for version without patch', async () => {
    const content = `version: '2.1'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-002 should fail when no version', async () => {
    const content = `title: 'My Document'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('DOC-002 should fail for non-semver version', async () => {
    const content = `version: 'latest'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-002'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('DOC-002 violation should recommend semantic versioning', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-002'), makeRequest('title: x'));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('semantic');
    }
  });
  it('DOC-002 should have Error severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('DOC-002'));
    expect(rule!.severity).toBe(RuleSeverity.Error);
  });

  // ─── DOC-003: Document has owner ─────────────────────────────────
  it('DOC-003 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-003'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('DOC-003 should pass when owner field present', async () => {
    const content = `owner: 'team-arch'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-003 should pass when author field present', async () => {
    const content = `author: 'John'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-003 should pass when maintainer field present', async () => {
    const content = `maintainer: 'team'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-003 should pass when responsible field present', async () => {
    const content = `responsible: 'Alice'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-003'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-003 should fail when no owner field', async () => {
    const content = `title: 'My Document'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-003'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('DOC-003 should have Warning severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('DOC-003'));
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('DOC-003 should have Advisory enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('DOC-003'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Advisory);
  });

  // ─── DOC-004: Document has references ────────────────────────────
  it('DOC-004 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-004'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('DOC-004 should pass when references field present', async () => {
    const content = `references: ['ADR-001']`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-004 should pass when ADR reference present', async () => {
    const content = `See ADR-001 for details`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-004 should pass when refs field present', async () => {
    const content = `refs: ['doc-1']`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-004 should pass when seeAlso field present', async () => {
    const content = `seeAlso: ['spec-1']`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-004 should fail when no references', async () => {
    const content = `title: 'My Document'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-004'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('DOC-004 should have Warning severity', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('DOC-004'));
    expect(rule!.severity).toBe(RuleSeverity.Warning);
  });
  it('DOC-004 violation should recommend ADR links', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-004'), makeRequest('title: x'));
    if (result.violations.length > 0) {
      expect(result.violations[0].recommendation).toContain('ADR');
    }
  });

  // ─── DOC-005: Document has status ────────────────────────────────
  it('DOC-005 should pass when no content provided', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-005'), makeRequest(''));
    expect(result.passed).toBe(true);
  });
  it('DOC-005 should pass when status field present', async () => {
    const content = `status: 'Active'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-005'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-005 should pass when quoted status field present', async () => {
    const content = `"status": 'Draft'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-005'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-005 should fail when no status field', async () => {
    const content = `title: 'My Document'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-005'), makeRequest(content));
    expect(result.passed).toBe(false);
  });
  it('DOC-005 violation should have Error severity', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-005'), makeRequest('title: x'));
    if (result.violations.length > 0) {
      expect(result.violations[0].severity).toBe(RuleSeverity.Error);
    }
  });
  it('DOC-005 should have Blocking enforcement', async () => {
    const rule = await ruleEngine.getRule(brandRuleId('DOC-005'));
    expect(rule!.enforcementLevel).toBe(EnforcementLevel.Blocking);
  });

  // ─── validate() method tests ────────────────────────────────────
  it('validate() should return results for all documentation rules', async () => {
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

  // ─── validateDocumentation() convenience method ──────────────────
  it('validateDocumentation() should return results', async () => {
    const results = await validator.validateDocumentation('doc.md', 'id: x', sessionId);
    expect(results.length).toBeGreaterThan(0);
  });
  it('validateDocumentation() should pass all rules for empty content', async () => {
    const results = await validator.validateDocumentation('doc.md', '', sessionId);
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
  it('validate() results should have correct category', async () => {
    const request = makeRequest('const x = 1;');
    const results = await validator.validate(request);
    for (const r of results) {
      expect(r.category).toBe(RuleCategory.Documentation);
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
  it('validateDocumentation() should evaluate all 5 rules', async () => {
    const results = await validator.validateDocumentation('doc.md', 'id: x', sessionId);
    expect(results.length).toBe(5);
  });
  it('DOC-001 should accept documentId field', async () => {
    const content = `documentId: 'doc-001'`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-001'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-002 should accept version without quotes', async () => {
    const content = `version = 1.0.0`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-002'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-004 should accept related field', async () => {
    const content = `related: ['doc-1']`;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-004'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-005 should accept status with no value', async () => {
    const content = `status: `;
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-005'), makeRequest(content));
    expect(result.passed).toBe(true);
  });
  it('DOC-001 violation should have Detected state', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-001'), makeRequest('title: x'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('DOC-002 violation should have Detected state', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-002'), makeRequest('title: x'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('DOC-003 violation should have Detected state', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-003'), makeRequest('title: x'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('DOC-004 violation should have Detected state', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-004'), makeRequest('title: x'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
  it('DOC-005 violation should have Detected state', async () => {
    const result = await ruleEngine.evaluateRule(brandRuleId('DOC-005'), makeRequest('title: x'));
    if (result.violations.length > 0) {
      expect(result.violations[0].state).toBe(ViolationState.Detected);
    }
  });
});
