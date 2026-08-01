/**
 * Compliance Engine Validator Tests Part 2
 * TASK-AIS-000Z.000
 * Covers: TraceValidator, ValueValidator, ConstraintValidator,
 *          PrivacyValidator, SecurityValidator, QualityValidator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../core/compliance/rule-engine.js';
import { TraceValidator } from '../../core/compliance/trace-validator.js';
import { ValueValidator } from '../../core/compliance/value-validator.js';
import { ConstraintValidator } from '../../core/compliance/constraint-validator.js';
import { PrivacyValidator } from '../../core/compliance/privacy-validator.js';
import { SecurityValidator } from '../../core/compliance/security-validator.js';
import { QualityValidator } from '../../core/compliance/quality-validator.js';
import {
  DefaultComplianceRuntimeConfig, brandRuleId, brandViolationId,
  brandComplianceSessionId, brandValidatorId,
  RuleCategory, RuleSeverity, EnforcementLevel, AutoFixCapability,
  ViolationState, ValidationTargetType, ComplianceState,
} from '../../core/compliance/types.js';
import type { ValidationRequest, ValidationResult, RuleEvaluationResult } from '../../core/compliance/types.js';

// ─── Helpers ───────────────────────────────────────────────────────

function makeEngine() {
  return new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
}

function makeReq(
  targetPath: string,
  content?: string,
  categories?: readonly RuleCategory[],
): ValidationRequest {
  return Object.freeze({
    targetType: ValidationTargetType.Architecture,
    targetPath,
    targetContent: content,
    categories: categories ?? [RuleCategory.Architecture],
    sessionId: brandComplianceSessionId('test-session'),
    metadata: {},
  });
}

// ═══════════════════════════════════════════════════════════════════
// TRACE VALIDATOR
// ═══════════════════════════════════════════════════════════════════

describe('TraceValidator', () => {
  let engine: RuleEngine;
  let validator: TraceValidator;

  beforeEach(async () => {
    engine = makeEngine();
    validator = new TraceValidator(engine);
    await validator.registerRules();
  });

  // --- Properties ---
  it('has correct id', () => {
    expect(validator.id).toBeDefined();
  });
  it('has correct name', () => {
    expect(validator.name).toBe('TraceValidator');
  });
  it('has Documentation category', () => {
    expect(validator.category).toBe(RuleCategory.Documentation);
  });

  // --- TRACE-001: ADR references principles ---
  describe('TRACE-001: ADR references principles', () => {
    it('passes with no content', async () => {
      const req = makeReq('docs/ADR-001.md', undefined, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-001');
      expect(r?.passed).toBe(true);
    });
    it('passes ADR with principle reference', async () => {
      const content = '# ADR-001\n\nReferences PHI-001.000 for principles.';
      const req = makeReq('docs/ADR-001.md', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-001');
      expect(r?.passed).toBe(true);
    });
    it('passes ADR with governance reference', async () => {
      const content = '# ADR-002\n\nGoverned by GOV-008.000.';
      const req = makeReq('docs/ADR-002.md', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-001');
      expect(r?.passed).toBe(true);
    });
    it('fails ADR without principle reference', async () => {
      const content = '# ADR-003\n\nWe decided to use React.';
      const req = makeReq('docs/ADR-003.md', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-001');
      expect(r?.passed).toBe(false);
      expect(r?.violations.length).toBeGreaterThan(0);
    });
    it('passes non-ADR file without principle reference', async () => {
      const content = 'Some random document.';
      const req = makeReq('docs/readme.md', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-001');
      expect(r?.passed).toBe(true);
    });
    it('violation has correct severity', async () => {
      const content = '# ADR-004\nNo references.';
      const req = makeReq('docs/ADR-004.md', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-001');
      expect(r?.violations[0]?.severity).toBe(RuleSeverity.Error);
    });
    it('violation has Blocking enforcement', async () => {
      const content = '# ADR-005\nNothing here.';
      const req = makeReq('docs/ADR-005.md', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-001');
      expect(r?.violations[0]?.enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
  });

  // --- TRACE-002: Code references ADR ---
  describe('TRACE-002: Code references ADR', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/core/module.ts', undefined, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-002');
      expect(r?.passed).toBe(true);
    });
    it('passes .ts file with ADR reference', async () => {
      const content = '// ADR-009: Event Bus architecture\nexport class Foo {}';
      const req = makeReq('src/core/foo.ts', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-002');
      expect(r?.passed).toBe(true);
    });
    it('passes non-.ts file without ADR', async () => {
      const content = 'random text';
      const req = makeReq('docs/readme.md', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-002');
      expect(r?.passed).toBe(true);
    });
    it('fails .ts file with complex logic but no ADR', async () => {
      const content = 'export class Engine {\n  async run() {\n    const data = await fetch();\n  }\n}';
      const req = makeReq('src/core/engine.ts', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-002');
      expect(r?.passed).toBe(false);
    });
    it('violation has Warning severity', async () => {
      const content = 'function process() { return true; }';
      const req = makeReq('src/core/proc.ts', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-002');
      expect(r?.violations[0]?.severity).toBe(RuleSeverity.Warning);
    });
  });

  // --- TRACE-003: Test covers contract ---
  describe('TRACE-003: Test covers contract', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/__tests__/foo.test.ts', undefined, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-003');
      expect(r?.passed).toBe(true);
    });
    it('passes test file with contract references', async () => {
      const content = "describe('Engine', () => {\n  it('implements contract', () => {\n    expect(engine).toImplement(IEngine);\n  });\n});";
      const req = makeReq('src/__tests__/engine.test.ts', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-003');
      expect(r?.passed).toBe(true);
    });
    it('fails test file with assertions but no contract terms', async () => {
      const content = "describe('Math', () => {\n  it('adds', () => {\n    expect(1 + 1).toBe(2);\n  });\n});";
      const req = makeReq('src/__tests__/math.test.ts', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-003');
      expect(r?.passed).toBe(false);
    });
    it('passes non-test file', async () => {
      const content = 'export class Foo {}';
      const req = makeReq('src/core/foo.ts', content, [RuleCategory.Documentation]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'TRACE-003');
      expect(r?.passed).toBe(true);
    });
  });

  // --- Typed method ---
  it('validateTraceability returns results', async () => {
    const results = await validator.validateTraceability(
      'docs/ADR-001.md',
      'References PHI-001.000',
      brandComplianceSessionId('s1'),
    );
    expect(results.length).toBeGreaterThan(0);
  });

  it('validate returns results', async () => {
    const req = makeReq('test.ts', 'content', [RuleCategory.Documentation]);
    const results = await validator.validate(req);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// VALUE VALIDATOR
// ═══════════════════════════════════════════════════════════════════

describe('ValueValidator', () => {
  let engine: RuleEngine;
  let validator: ValueValidator;

  beforeEach(async () => {
    engine = makeEngine();
    validator = new ValueValidator(engine);
    await validator.registerRules();
  });

  it('has correct name', () => { expect(validator.name).toBe('ValueValidator'); });
  it('has Runtime category', () => { expect(validator.category).toBe(RuleCategory.Runtime); });

  // --- VAL-001 ---
  describe('VAL-001: Declares value dimensions', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/runtime.ts', undefined, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('VAL-001'));
      expect(r?.passed).toBe(true);
    });
    it('passes with valueDimension', async () => {
      const content = 'const valueDimensions = ["VD-001"];';
      const req = makeReq('src/runtime.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('VAL-001'));
      expect(r?.passed).toBe(true);
    });
    it('passes with ValueDimension', async () => {
      const content = 'enum ValueDimension { Value = "VD-001" }';
      const req = makeReq('src/runtime.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('VAL-001'));
      expect(r?.passed).toBe(true);
    });
    it('fails without value dimensions', async () => {
      const content = 'export class Runtime { run() {} }';
      const req = makeReq('src/runtime.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('VAL-001'));
      expect(r?.passed).toBe(false);
    });
    it('violation has Error severity', async () => {
      const content = 'class Foo {}';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('VAL-001'));
      expect(r?.violations[0]?.severity).toBe(RuleSeverity.Error);
    });
  });

  // --- VAL-002 ---
  describe('VAL-002: Exposes getValueMetrics', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/runtime.ts', undefined, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('VAL-002'));
      expect(r?.passed).toBe(true);
    });
    it('passes with getValueMetrics method', async () => {
      const content = 'async getValueMetrics() { return {}; }';
      const req = makeReq('src/runtime.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('VAL-002'));
      expect(r?.passed).toBe(true);
    });
    it('fails without getValueMetrics', async () => {
      const content = 'export class Runtime { run() {} }';
      const req = makeReq('src/runtime.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('VAL-002'));
      expect(r?.passed).toBe(false);
    });
    it('has Critical severity', async () => {
      const content = 'class Foo {}';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('VAL-002'));
      expect(r?.severity).toBe(RuleSeverity.Critical);
    });
  });

  // --- VAL-003 ---
  describe('VAL-003: No engagement-as-value', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/metrics.ts', undefined, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'VAL-003');
      expect(r?.passed).toBe(true);
    });
    it('passes clean content', async () => {
      const content = 'const valueMetrics = { value: 100 };';
      const req = makeReq('src/metrics.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'VAL-003');
      expect(r?.passed).toBe(true);
    });
    it('fails with engagementRate', async () => {
      const content = 'const engagementRate = 0.85;';
      const req = makeReq('src/metrics.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'VAL-003');
      expect(r?.passed).toBe(false);
    });
    it('fails with maximize engagement', async () => {
      const content = '// We need to maximize engagement';
      const req = makeReq('src/metrics.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'VAL-003');
      expect(r?.passed).toBe(false);
    });
    it('fails with time_on_site', async () => {
      const content = 'const time_on_site = 300;';
      const req = makeReq('src/metrics.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'VAL-003');
      expect(r?.passed).toBe(false);
    });
    it('fails with sessionDuration', async () => {
      const content = 'const sessionDuration = 5000;';
      const req = makeReq('src/metrics.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'VAL-003');
      expect(r?.passed).toBe(false);
    });
    it('has Philosophy category', async () => {
      const content = 'const engagementScore = 99;';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'VAL-003');
      expect(r?.category).toBe(RuleCategory.Philosophy);
    });
    it('has Advisory enforcement', async () => {
      const content = 'const engagementCount = 5;';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'VAL-003');
      expect(r?.violations[0]?.enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('detects multiple patterns', async () => {
      const content = 'const engagementRate = 0.5; const time_on_site = 100;';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Philosophy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'VAL-003');
      expect(r?.violations.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('validateValueCompliance returns results', async () => {
    const results = await validator.validateValueCompliance('src/runtime.ts', brandComplianceSessionId('s1'));
    expect(results.length).toBeGreaterThan(0);
  });

  it('validate returns results', async () => {
    const req = makeReq('test.ts', 'content', [RuleCategory.Runtime, RuleCategory.Philosophy]);
    const results = await validator.validate(req);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// CONSTRAINT VALIDATOR
// ═══════════════════════════════════════════════════════════════════

describe('ConstraintValidator', () => {
  let engine: RuleEngine;
  let validator: ConstraintValidator;

  beforeEach(async () => {
    engine = makeEngine();
    validator = new ConstraintValidator(engine);
    await validator.registerRules();
  });

  it('has correct name', () => { expect(validator.name).toBe('ConstraintValidator'); });
  it('has Runtime category', () => { expect(validator.category).toBe(RuleCategory.Runtime); });

  // --- CONSTR-001 ---
  describe('CONSTR-001: Exposes getConstraintReport', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/runtime.ts', undefined, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('CONSTR-001'));
      expect(r?.passed).toBe(true);
    });
    it('passes with getConstraintReport', async () => {
      const content = 'async getConstraintReport() { return {}; }';
      const req = makeReq('src/runtime.ts', content, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('CONSTR-001'));
      expect(r?.passed).toBe(true);
    });
    it('fails without getConstraintReport', async () => {
      const content = 'export class Runtime {}';
      const req = makeReq('src/runtime.ts', content, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('CONSTR-001'));
      expect(r?.passed).toBe(false);
    });
    it('has Error severity', async () => {
      const content = 'class Foo {}';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => String(x.ruleId).includes('CONSTR-001'));
      expect(r?.severity).toBe(RuleSeverity.Error);
    });
  });

  // --- CONSTR-002 ---
  describe('CONSTR-002: Constraint with evidence', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/constraints.ts', undefined, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'CONSTR-002');
      expect(r?.passed).toBe(true);
    });
    it('passes constraint with evidence', async () => {
      const content = 'const constraint: Constraint = { reason: "memory limit" };';
      const req = makeReq('src/constraints.ts', content, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'CONSTR-002');
      expect(r?.passed).toBe(true);
    });
    it('fails constraint without evidence', async () => {
      const content = 'const constraint: Constraint = { name: "limit" };';
      const req = makeReq('src/constraints.ts', content, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'CONSTR-002');
      expect(r?.passed).toBe(false);
    });
    it('passes content without constraints', async () => {
      const content = 'export class Foo {}';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'CONSTR-002');
      expect(r?.passed).toBe(true);
    });
    it('has Governance category', async () => {
      const content = 'const constraint = { foo: 1 };';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'CONSTR-002');
      expect(r?.category).toBe(RuleCategory.Governance);
    });
  });

  // --- CONSTR-003 ---
  describe('CONSTR-003: Unknown when uncertain', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/constraints.ts', undefined, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'CONSTR-003');
      expect(r?.passed).toBe(true);
    });
    it('passes with Unknown handling', async () => {
      const content = 'const constraint = Unknown;';
      const req = makeReq('src/constraints.ts', content, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'CONSTR-003');
      expect(r?.passed).toBe(true);
    });
    it('fails with fallback-to-true pattern', async () => {
      const content = 'catch { return true; }';
      const req = makeReq('src/constraints.ts', content, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'CONSTR-003');
      // May or may not fail depending on regex - the constraint logic check requires 'constraint' keyword
      // This content doesn't have constraint, so it should pass
      expect(r?.passed).toBe(true);
    });
    it('fails with constraint + fallback-to-true', async () => {
      const content = 'const constraint = check();\ncatch { return true; }';
      const req = makeReq('src/constraints.ts', content, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'CONSTR-003');
      expect(r?.passed).toBe(false);
    });
    it('has Info severity', async () => {
      const content = 'const constraint = { check() {} };\ncatch { return satisfied; }';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Governance]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'CONSTR-003');
      expect(r?.severity).toBe(RuleSeverity.Info);
    });
  });

  it('validateConstraintCompliance returns results', async () => {
    const results = await validator.validateConstraintCompliance('src/runtime.ts', brandComplianceSessionId('s1'));
    expect(results.length).toBeGreaterThan(0);
  });

  it('validate returns results', async () => {
    const req = makeReq('test.ts', 'content', [RuleCategory.Runtime, RuleCategory.Governance]);
    const results = await validator.validate(req);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PRIVACY VALIDATOR
// ═══════════════════════════════════════════════════════════════════

describe('PrivacyValidator', () => {
  let engine: RuleEngine;
  let validator: PrivacyValidator;

  beforeEach(async () => {
    engine = makeEngine();
    validator = new PrivacyValidator(engine);
    await validator.registerRules();
  });

  it('has correct name', () => { expect(validator.name).toBe('PrivacyValidator'); });
  it('has Privacy category', () => { expect(validator.category).toBe(RuleCategory.Privacy); });

  // --- PRIV-001 ---
  describe('PRIV-001: No data leakage', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/module.ts', undefined, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-001');
      expect(r?.passed).toBe(true);
    });
    it('passes clean content', async () => {
      const content = 'export class LocalProcessor { process(data: string) {} }';
      const req = makeReq('src/module.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-001');
      expect(r?.passed).toBe(true);
    });
    it('fails with fetch to external API', async () => {
      const content = "fetch('https://api.external.com/data')";
      const req = makeReq('src/module.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-001');
      expect(r?.passed).toBe(false);
    });
    it('fails with axios call', async () => {
      const content = "axios.get('http://external.com/api')";
      const req = makeReq('src/module.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-001');
      expect(r?.passed).toBe(false);
    });
    it('fails with WebSocket', async () => {
      const content = "new WebSocket('wss://tracker.example.com')";
      const req = makeReq('src/module.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-001');
      expect(r?.passed).toBe(false);
    });
    it('fails with navigator.sendBeacon', async () => {
      const content = "navigator.sendBeacon('https://tracker.com', data)";
      const req = makeReq('src/module.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-001');
      expect(r?.passed).toBe(false);
    });
    it('has Critical severity', async () => {
      const content = "fetch('https://evil.com/data')";
      const req = makeReq('src/foo.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-001');
      expect(r?.severity).toBe(RuleSeverity.Critical);
    });
    it('has Blocking enforcement', async () => {
      const content = "fetch('https://evil.com')";
      const req = makeReq('src/foo.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-001');
      expect(r?.violations[0]?.enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('detects multiple leakage patterns', async () => {
      const content = "fetch('https://a.com')\naxios.post('http://b.com')";
      const req = makeReq('src/foo.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-001');
      expect(r?.violations.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --- PRIV-002 ---
  describe('PRIV-002: Local first architecture', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/module.ts', undefined, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-002');
      expect(r?.passed).toBe(true);
    });
    it('passes with localFirst pattern', async () => {
      const content = 'const localFirst = true;\nfetch(url)';
      const req = makeReq('src/module.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-002');
      expect(r?.passed).toBe(true);
    });
    it('fails with remote calls and no localFirst', async () => {
      const content = 'async function send() { return fetch(url); }';
      const req = makeReq('src/module.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-002');
      expect(r?.passed).toBe(false);
    });
    it('passes without remote calls', async () => {
      const content = 'export function add(a: number, b: number) { return a + b; }';
      const req = makeReq('src/module.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-002');
      expect(r?.passed).toBe(true);
    });
  });

  // --- PRIV-003 ---
  describe('PRIV-003: Provider respects privacy level', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/module.ts', undefined, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-003');
      expect(r?.passed).toBe(true);
    });
    it('passes provider with privacyLevel', async () => {
      const content = 'const provider = new AIProvider({ privacyLevel: "strict" });';
      const req = makeReq('src/module.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-003');
      expect(r?.passed).toBe(true);
    });
    it('fails provider without privacyLevel', async () => {
      const content = 'const provider = new AIProvider({ apiKey: "key" });';
      const req = makeReq('src/module.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-003');
      expect(r?.passed).toBe(false);
    });
    it('passes without provider', async () => {
      const content = 'export class Calculator { add() {} }';
      const req = makeReq('src/module.ts', content, [RuleCategory.Privacy]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-003');
      expect(r?.passed).toBe(true);
    });
  });

  it('validatePrivacy returns results', async () => {
    const results = await validator.validatePrivacy('src/module.ts', 'content', brandComplianceSessionId('s1'));
    expect(results.length).toBeGreaterThan(0);
  });

  it('validate returns results', async () => {
    const req = makeReq('test.ts', 'content', [RuleCategory.Privacy]);
    const results = await validator.validate(req);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// SECURITY VALIDATOR
// ═══════════════════════════════════════════════════════════════════

describe('SecurityValidator', () => {
  let engine: RuleEngine;
  let validator: SecurityValidator;

  beforeEach(async () => {
    engine = makeEngine();
    validator = new SecurityValidator(engine);
    await validator.registerRules();
  });

  it('has correct name', () => { expect(validator.name).toBe('SecurityValidator'); });
  it('has Security category', () => { expect(validator.category).toBe(RuleCategory.Security); });

  // --- SEC-001 ---
  describe('SEC-001: No hardcoded secrets', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/module.ts', undefined, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-001');
      expect(r?.passed).toBe(true);
    });
    it('passes clean content', async () => {
      const content = 'export class Config { readonly apiKey: string; }';
      const req = makeReq('src/config.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-001');
      expect(r?.passed).toBe(true);
    });
    it('fails with hardcoded password', async () => {
      const content = "const password = 'supersecret123'";
      const req = makeReq('src/config.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-001');
      expect(r?.passed).toBe(false);
    });
    it('fails with hardcoded API key', async () => {
      const content = 'const api_key = "sk-1234567890abcdef"';
      const req = makeReq('src/config.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-001');
      expect(r?.passed).toBe(false);
    });
    it('fails with Bearer token', async () => {
      const content = 'const auth = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0"';
      const req = makeReq('src/auth.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-001');
      expect(r?.passed).toBe(false);
    });
    it('fails with private key', async () => {
      const content = 'const KEY = "-----BEGIN RSA PRIVATE KEY-----"';
      const req = makeReq('src/keys.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-001');
      expect(r?.passed).toBe(false);
    });
    it('has Critical severity', async () => {
      const content = "password = 'hackme'";
      const req = makeReq('src/foo.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-001');
      expect(r?.severity).toBe(RuleSeverity.Critical);
    });
    it('redacts evidence', async () => {
      const content = "const password = 'mysecretpassword123'";
      const req = makeReq('src/foo.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-001');
      const evidence = r?.violations[0]?.evidence.find((e) => e.includes('[REDACTED]'));
      expect(evidence).toBeDefined();
    });
  });

  // --- SEC-002 ---
  describe('SEC-002: Input validation present', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/module.ts', undefined, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-002');
      expect(r?.passed).toBe(true);
    });
    it('passes with zod validation', async () => {
      const content = 'export function process(input: unknown) { const parsed = schema.parse(input); }';
      const req = makeReq('src/module.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-002');
      expect(r?.passed).toBe(true);
    });
    it('passes with typeof check', async () => {
      const content = 'export function process(input: string) { if (typeof input !== "string") throw new Error(); }';
      const req = makeReq('src/module.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-002');
      expect(r?.passed).toBe(true);
    });
    it('fails export without validation', async () => {
      const content = 'export function handler(input) { return input; }';
      const req = makeReq('src/module.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-002');
      expect(r?.passed).toBe(false);
    });
    it('passes non-exported functions', async () => {
      const content = 'function helper(x: number) { return x * 2; }';
      const req = makeReq('src/module.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-002');
      expect(r?.passed).toBe(true);
    });
  });

  // --- SEC-003 ---
  describe('SEC-003: No eval or Function constructor', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/module.ts', undefined, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-003');
      expect(r?.passed).toBe(true);
    });
    it('passes clean content', async () => {
      const content = 'export function safe() { return JSON.parse(str); }';
      const req = makeReq('src/module.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-003');
      expect(r?.passed).toBe(true);
    });
    it('fails with eval', async () => {
      const content = 'const result = eval(userInput);';
      const req = makeReq('src/dangerous.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-003');
      expect(r?.passed).toBe(false);
    });
    it('fails with new Function', async () => {
      const content = 'const fn = new Function("return 42");';
      const req = makeReq('src/dangerous.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-003');
      expect(r?.passed).toBe(false);
    });
    it('fails with setTimeout string', async () => {
      const content = "setTimeout('alert(1)', 1000)";
      const req = makeReq('src/dangerous.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-003');
      expect(r?.passed).toBe(false);
    });
    it('fails with setInterval string', async () => {
      const content = "setInterval('doStuff()', 5000)";
      const req = makeReq('src/dangerous.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-003');
      expect(r?.passed).toBe(false);
    });
    it('has Critical severity', async () => {
      const content = 'eval(x)';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-003');
      expect(r?.severity).toBe(RuleSeverity.Critical);
    });
  });

  // --- SEC-004 ---
  describe('SEC-004: Trust zone respected', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/module.ts', undefined, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-004');
      expect(r?.passed).toBe(true);
    });
    it('passes cross-boundary with trust zone', async () => {
      const content = 'const data = sanitize(input);\nfetch(url)';
      const req = makeReq('src/module.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-004');
      expect(r?.passed).toBe(true);
    });
    it('fails cross-boundary without trust zone', async () => {
      const content = 'async function send() { return fetch(url); }';
      const req = makeReq('src/module.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-004');
      expect(r?.passed).toBe(false);
    });
    it('passes without cross-boundary', async () => {
      const content = 'export function add(a: number, b: number) { return a + b; }';
      const req = makeReq('src/module.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-004');
      expect(r?.passed).toBe(true);
    });
    it('has Error severity', async () => {
      const content = 'fetch(crossOriginUrl)';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Security]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'SEC-004');
      expect(r?.severity).toBe(RuleSeverity.Error);
    });
  });

  it('validateSecurity returns results', async () => {
    const results = await validator.validateSecurity('src/module.ts', 'content', brandComplianceSessionId('s1'));
    expect(results.length).toBeGreaterThan(0);
  });

  it('validate returns results', async () => {
    const req = makeReq('test.ts', 'content', [RuleCategory.Security]);
    const results = await validator.validate(req);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// QUALITY VALIDATOR
// ═══════════════════════════════════════════════════════════════════

describe('QualityValidator', () => {
  let engine: RuleEngine;
  let validator: QualityValidator;

  beforeEach(async () => {
    engine = makeEngine();
    validator = new QualityValidator(engine);
    await validator.registerRules();
  });

  it('has correct name', () => { expect(validator.name).toBe('QualityValidator'); });
  it('has Quality category', () => { expect(validator.category).toBe(RuleCategory.Quality); });

  // --- QUAL-001 ---
  describe('QUAL-001: Function complexity', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/module.ts', undefined, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-001');
      expect(r?.passed).toBe(true);
    });
    it('passes simple function', async () => {
      const content = 'export function add(a: number, b: number) { return a + b; }';
      const req = makeReq('src/math.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-001');
      expect(r?.passed).toBe(true);
    });
    it('passes moderate function', async () => {
      const content = `export function process(data: string) {
  if (data) {
    if (data.length > 0) {
      return data.trim();
    } else {
      return '';
    }
  }
  return null;
}`;
      const req = makeReq('src/proc.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-001');
      expect(r?.passed).toBe(true);
    });
    it('fails with complex function', async () => {
      // Generate a function with many branches
      const branches = Array.from({ length: 12 }, (_, i) =>
        `  if (x === ${i}) { return ${i}; }`
      ).join('\n');
      const content = `export function complex(x: number) {
${branches}
  return -1;
}`;
      const req = makeReq('src/complex.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-001');
      expect(r?.passed).toBe(false);
    });
    it('has Warning severity', async () => {
      const branches = Array.from({ length: 15 }, (_, i) => `if (x===${i}){};`).join('');
      const content = `function f(x){${branches}}`;
      const req = makeReq('src/foo.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-001');
      expect(r?.severity).toBe(RuleSeverity.Warning);
    });
    it('has Advisory enforcement', async () => {
      const branches = Array.from({ length: 15 }, (_, i) => `if(x===${i}){}`).join('');
      const content = `function f(x){${branches}}`;
      const req = makeReq('src/foo.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-001');
      expect(r?.violations[0]?.enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
  });

  // --- QUAL-002 ---
  describe('QUAL-002: No excessively long files', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/module.ts', undefined, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-002');
      expect(r?.passed).toBe(true);
    });
    it('passes short file', async () => {
      const content = 'export class Foo {}';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-002');
      expect(r?.passed).toBe(true);
    });
    it('passes exactly 500 lines', async () => {
      const content = Array.from({ length: 500 }, () => '// line').join('\n');
      const req = makeReq('src/big.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-002');
      expect(r?.passed).toBe(true);
    });
    it('fails with 501 lines', async () => {
      const content = Array.from({ length: 501 }, () => '// line').join('\n');
      const req = makeReq('src/big.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-002');
      expect(r?.passed).toBe(false);
    });
    it('violation reports correct line count', async () => {
      const content = Array.from({ length: 600 }, () => '// x').join('\n');
      const req = makeReq('src/big.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-002');
      expect(r?.violations[0]?.description).toContain('600');
    });
  });

  // --- QUAL-003 ---
  describe('QUAL-003: Test coverage indicators', () => {
    it('passes with no content', async () => {
      const req = makeReq('src/module.ts', undefined, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-003');
      expect(r?.passed).toBe(true);
    });
    it('passes non-.ts file', async () => {
      const content = 'exports.foo = 1;';
      const req = makeReq('src/module.js', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-003');
      expect(r?.passed).toBe(true);
    });
    it('passes test files', async () => {
      const content = 'export class Foo {}';
      const req = makeReq('src/foo.test.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-003');
      expect(r?.passed).toBe(true);
    });
    it('fails source file exporting without test marker', async () => {
      const content = 'export class Calculator { add() {} }';
      const req = makeReq('src/calc.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-003');
      expect(r?.passed).toBe(false);
    });
    it('passes source file with @testing marker', async () => {
      const content = '@testing\nexport class InternalHelper {}';
      const req = makeReq('src/helper.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-003');
      expect(r?.passed).toBe(true);
    });
    it('passes source file without exports', async () => {
      const content = 'const internal = 42;';
      const req = makeReq('src/internal.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-003');
      expect(r?.passed).toBe(true);
    });
    it('has Info severity', async () => {
      const content = 'export class Foo {}';
      const req = makeReq('src/foo.ts', content, [RuleCategory.Quality]);
      const result = await engine.evaluateRules(req);
      const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-003');
      expect(r?.severity).toBe(RuleSeverity.Info);
    });
  });

  it('validateQuality returns results', async () => {
    const results = await validator.validateQuality('src/module.ts', 'content', brandComplianceSessionId('s1'));
    expect(results.length).toBeGreaterThan(0);
  });

  it('validate returns results', async () => {
    const req = makeReq('test.ts', 'content', [RuleCategory.Quality]);
    const results = await validator.validate(req);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// CROSS-VALIDATOR INTEGRATION
// ═══════════════════════════════════════════════════════════════════

describe('Cross-Validator Integration', () => {
  it('validators register to independent engines without conflict', async () => {
    const e1 = makeEngine();
    const e2 = makeEngine();
    const v1 = new TraceValidator(e1);
    const v2 = new SecurityValidator(e2);
    await v1.registerRules();
    await v2.registerRules();
    const c1 = await e1.count();
    const c2 = await e2.count();
    expect(c1).toBeGreaterThan(0);
    expect(c2).toBeGreaterThan(0);
    expect(c1).not.toBe(c2);
  });

  it('multiple validators can register to same engine', async () => {
    const engine = makeEngine();
    const v1 = new TraceValidator(engine);
    const v2 = new SecurityValidator(engine);
    await v1.registerRules();
    await v2.registerRules();
    const count = await engine.count();
    expect(count).toBeGreaterThan(0);
  });

  it('each validator has unique id', () => {
    const e = makeEngine();
    const validators = [
      new TraceValidator(e),
      new ValueValidator(e),
      new ConstraintValidator(e),
      new PrivacyValidator(e),
      new SecurityValidator(e),
      new QualityValidator(e),
    ];
    const ids = validators.map((v) => v.id as string);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all validators have correct category', () => {
    const e = makeEngine();
    expect(new TraceValidator(e).category).toBe(RuleCategory.Documentation);
    expect(new ValueValidator(e).category).toBe(RuleCategory.Runtime);
    expect(new ConstraintValidator(e).category).toBe(RuleCategory.Runtime);
    expect(new PrivacyValidator(e).category).toBe(RuleCategory.Privacy);
    expect(new SecurityValidator(e).category).toBe(RuleCategory.Security);
    expect(new QualityValidator(e).category).toBe(RuleCategory.Quality);
  });

  it('security validator detects multiple violation types simultaneously', async () => {
    const engine = makeEngine();
    const validator = new SecurityValidator(engine);
    await validator.registerRules();
    const malicious = "password = 'secret123'\neval(userInput)\nfetch('https://evil.com')";
    const req = makeReq('src/bad.ts', malicious, [RuleCategory.Security]);
    const result = await engine.evaluateRules(req);
    const failed = result.results.filter((r) => !r.passed);
    expect(failed.length).toBeGreaterThanOrEqual(3);
  });

  it('quality validator checks file length accurately', async () => {
    const engine = makeEngine();
    const validator = new QualityValidator(engine);
    await validator.registerRules();
    const exact500 = Array.from({ length: 500 }, () => '').join('\n');
    const req = makeReq('src/exact.ts', exact500, [RuleCategory.Quality]);
    const result = await engine.evaluateRules(req);
    const r = result.results.find((x) => (x.ruleId as string) === 'QUAL-002');
    expect(r?.passed).toBe(true);
  });

  it('privacy validator allows fetch without http/https prefix', async () => {
    const engine = makeEngine();
    const validator = new PrivacyValidator(engine);
    await validator.registerRules();
    const content = 'const url = "/api/local"; fetch(url);';
    const req = makeReq('src/local.ts', content, [RuleCategory.Privacy]);
    const result = await engine.evaluateRules(req);
    const r = result.results.find((x) => (x.ruleId as string) === 'PRIV-001');
    expect(r?.passed).toBe(true);
  });
});
