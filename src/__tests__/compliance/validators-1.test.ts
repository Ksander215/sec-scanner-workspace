import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RuleEngine } from '../../core/compliance/rule-engine.js';
import { ArchitectureValidator } from '../../core/compliance/architecture-validator.js';
import { RuntimeValidator } from '../../core/compliance/runtime-validator.js';
import { CapabilityValidator } from '../../core/compliance/capability-validator.js';
import { DocumentationValidator } from '../../core/compliance/documentation-validator.js';
import { DefaultComplianceRuntimeConfig, brandRuleId, brandViolationId, brandComplianceSessionId, brandValidatorId, RuleCategory, RuleSeverity, EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType, ComplianceState } from '../../core/compliance/types.js';
import type { ValidationRequest, ValidationResult, RuleEvaluationResult } from '../../core/compliance/types.js';
import { RuleAlreadyRegisteredError } from '../../core/compliance/errors.js';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function setupEngine() {
  const engine = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
  return engine;
}

function makeRequest(targetPath: string, content?: string, categories?: readonly RuleCategory[]): ValidationRequest {
  return Object.freeze({
    targetType: ValidationTargetType.Architecture,
    targetPath,
    targetContent: content,
    categories: categories ?? [RuleCategory.Architecture],
    sessionId: brandComplianceSessionId('test-session'),
    metadata: {},
  });
}

function makeCapRequest(targetPath: string, content?: string): ValidationRequest {
  return Object.freeze({
    targetType: ValidationTargetType.CapabilityPack,
    targetPath,
    targetContent: content,
    categories: [RuleCategory.CapabilityPack] as readonly RuleCategory[],
    sessionId: brandComplianceSessionId('test-session'),
    metadata: {},
  });
}

function makeDocRequest(targetPath: string, content?: string): ValidationRequest {
  return Object.freeze({
    targetType: ValidationTargetType.Documentation,
    targetPath,
    targetContent: content,
    categories: [RuleCategory.Documentation] as readonly RuleCategory[],
    sessionId: brandComplianceSessionId('test-session'),
    metadata: {},
  });
}

function makeRuntimeRequest(targetPath: string, content?: string): ValidationRequest {
  return Object.freeze({
    targetType: ValidationTargetType.Runtime,
    targetPath,
    targetContent: content,
    categories: [RuleCategory.Runtime] as readonly RuleCategory[],
    sessionId: brandComplianceSessionId('test-session'),
    metadata: {},
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ArchitectureValidator
// ═══════════════════════════════════════════════════════════════════════════

describe('ArchitectureValidator', () => {
  let engine: RuleEngine;
  let validator: ArchitectureValidator;

  beforeEach(async () => {
    engine = await setupEngine();
    validator = new ArchitectureValidator(engine);
    await validator.registerRules();
  });

  // ─── Constructor & Properties ─────────────────────────────────

  describe('constructor and properties', () => {
    it('should create instance with correct id', () => {
      expect(validator.id).toBe(brandValidatorId('architecture-validator'));
    });
    it('should create instance with correct name', () => {
      expect(validator.name).toBe('ArchitectureValidator');
    });
    it('should have Architecture category', () => {
      expect(validator.category).toBe(RuleCategory.Architecture);
    });
    it('should accept a RuleEngine instance', () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new ArchitectureValidator(e);
      expect(v).toBeInstanceOf(ArchitectureValidator);
    });
    it('should store the rule engine reference', async () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new ArchitectureValidator(e);
      await v.registerRules();
      expect(await e.count()).toBeGreaterThan(0);
    });
  });

  // ─── registerRules ─────────────────────────────────────────────

  describe('registerRules', () => {
    it('should register 5 rules', async () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new ArchitectureValidator(e);
      await v.registerRules();
      expect(await e.count()).toBe(5);
    });
    it('should register ARCH-001', async () => {
      const rule = await engine.getRule(brandRuleId('ARCH-001'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('No circular dependencies');
    });
    it('should register ARCH-002', async () => {
      const rule = await engine.getRule(brandRuleId('ARCH-002'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Core does not depend on Runtime');
    });
    it('should register ARCH-003', async () => {
      const rule = await engine.getRule(brandRuleId('ARCH-003'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('No layer violations');
    });
    it('should register ARCH-004', async () => {
      const rule = await engine.getRule(brandRuleId('ARCH-004'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Branded IDs used');
    });
    it('should register ARCH-005', async () => {
      const rule = await engine.getRule(brandRuleId('ARCH-005'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Object.freeze used');
    });
    it('should throw on duplicate registration', async () => {
      const v2 = new ArchitectureValidator(engine);
      await expect(v2.registerRules()).rejects.toThrow(RuleAlreadyRegisteredError);
    });
    it('should throw RuleAlreadyRegisteredError with correct ruleId', async () => {
      try {
        const v2 = new ArchitectureValidator(engine);
        await v2.registerRules();
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(RuleAlreadyRegisteredError);
        expect((e as RuleAlreadyRegisteredError).ruleId).toBe('ARCH-001');
      }
    });
    it('should set all rules to enabled', async () => {
      const rules = await engine.listRules({ category: RuleCategory.Architecture });
      for (const rule of rules) expect(rule.enabled).toBe(true);
    });
    it('should set ARCH-001 severity to Critical', async () => {
      expect((await engine.getRule(brandRuleId('ARCH-001')))!.severity).toBe(RuleSeverity.Critical);
    });
    it('should set ARCH-001 enforcement to Blocking', async () => {
      expect((await engine.getRule(brandRuleId('ARCH-001')))!.enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should set ARCH-003 severity to Error', async () => {
      expect((await engine.getRule(brandRuleId('ARCH-003')))!.severity).toBe(RuleSeverity.Error);
    });
    it('should set ARCH-004 severity to Warning', async () => {
      expect((await engine.getRule(brandRuleId('ARCH-004')))!.severity).toBe(RuleSeverity.Warning);
    });
    it('should set ARCH-004 enforcement to Advisory', async () => {
      expect((await engine.getRule(brandRuleId('ARCH-004')))!.enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should set ARCH-005 severity to Warning', async () => {
      expect((await engine.getRule(brandRuleId('ARCH-005')))!.severity).toBe(RuleSeverity.Warning);
    });
    it('should set validatorId on all rules', async () => {
      const rules = await engine.listRules({ category: RuleCategory.Architecture });
      for (const rule of rules) expect(rule.validatorId).toBe(validator.id);
    });
  });

  // ─── ARCH-001: No circular dependencies ─────────────────────────

  describe('ARCH-001: No circular dependencies', () => {
    it('should pass with no content', async () => {
      const req = makeRequest('src/core/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass with empty string content', async () => {
      const req = makeRequest('src/core/test.ts', '');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with no import statements', async () => {
      const req = makeRequest('src/core/test.ts', 'const x = 42;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with 1 import of same path', async () => {
      const req = makeRequest('src/core/test.ts', "import { A } from './module';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with 2 imports of same path', async () => {
      const c = "import { A } from './mod'; import { B } from './mod';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail with 3 imports of same path', async () => {
      const c = "import { A } from './m'; import { B } from './m'; import { C } from './m';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should fail with 4 imports of same path', async () => {
      const c = "import { A } from './m'; import { B } from './m'; import { C } from './m'; import { D } from './m';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.passed).toBe(false);
    });
    it('should report correct violation description', async () => {
      const c = "import { A } from './cyc'; import { B } from './cyc'; import { C } from './cyc';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.violations[0].description).toContain('./cyc');
      expect(r.violations[0].description).toContain('3 times');
    });
    it('should include import path in evidence', async () => {
      const c = "import { A } from './cyc'; import { B } from './cyc'; import { C } from './cyc';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect((r.violations[0].evidence as string[]).some(e => e.includes('./cyc'))).toBe(true);
    });
    it('should include import count in evidence', async () => {
      const c = "import { A } from './cyc'; import { B } from './cyc'; import { C } from './cyc';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect((r.violations[0].evidence as string[]).some(e => e.includes('3'))).toBe(true);
    });
    it('should pass with different import paths', async () => {
      const c = "import { A } from './a'; import { B } from './b'; import { C } from './c';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should detect violations for multiple paths simultaneously', async () => {
      const c = "import { A } from './m1'; import { B } from './m1'; import { C } from './m1'; import { D } from './m2'; import { E } from './m2'; import { F } from './m2';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(2);
    });
    it('should set violation severity to Critical', async () => {
      const c = "import { A } from './m'; import { B } from './m'; import { C } from './m';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Critical);
    });
    it('should set violation state to Detected', async () => {
      const c = "import { A } from './m'; import { B } from './m'; import { C } from './m';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.violations[0].state).toBe(ViolationState.Detected);
    });
    it('should set violation enforcement to Blocking', async () => {
      const c = "import { A } from './m'; import { B } from './m'; import { C } from './m';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should include recommendation in violation', async () => {
      const c = "import { A } from './m'; import { B } from './m'; import { C } from './m';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.violations[0].recommendation.length).toBeGreaterThan(0);
    });
    it('should include target path in violation', async () => {
      const c = "import { A } from './m'; import { B } from './m'; import { C } from './m';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.violations[0].target).toBe('src/core/test.ts');
    });
    it('should set resolvedAt to null', async () => {
      const c = "import { A } from './m'; import { B } from './m'; import { C } from './m';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.violations[0].resolvedAt).toBeNull();
    });
    it('should set autoFixAvailable to None', async () => {
      const c = "import { A } from './m'; import { B } from './m'; import { C } from './m';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.violations[0].autoFixAvailable).toBe(AutoFixCapability.None);
    });
    it('should report non-negative durationMs', async () => {
      const c = "import { A } from './m'; import { B } from './m'; import { C } from './m';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    });
    it('should set autoFixed to false', async () => {
      const c = "import { A } from './m'; import { B } from './m'; import { C } from './m';";
      const req = makeRequest('src/core/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.autoFixed).toBe(false);
    });
    it('should set correct ruleName in result', async () => {
      const req = makeRequest('src/core/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.ruleName).toBe('No circular dependencies');
    });
    it('should set correct category in result', async () => {
      const req = makeRequest('src/core/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.category).toBe(RuleCategory.Architecture);
    });
    it('should include importsChecked in metadata', async () => {
      const req = makeRequest('src/core/test.ts', "import { A } from './x';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.metadata.importsChecked).toBe(1);
    });
    it('should include importsChecked=0 for no imports', async () => {
      const req = makeRequest('src/core/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-001'))!;
      expect(r.metadata.importsChecked).toBe(0);
    });
  });

  // ─── ARCH-002: Core does not depend on Runtime ──────────────────

  describe('ARCH-002: Core does not depend on Runtime', () => {
    it('should pass with no content', async () => {
      const req = makeRequest('src/core/module.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass for non-core module with runtime import', async () => {
      const req = makeRequest('src/api/handler.ts', "import { runtime } from '../runtime/engine';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass for core/compliance module with runtime import', async () => {
      const req = makeRequest('src/core/compliance/validator.ts', "import { runtime } from '../runtime/engine';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass for core module without runtime import', async () => {
      const req = makeRequest('src/core/domain/entity.ts', "import { types } from './types';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail for core module importing runtime', async () => {
      const req = makeRequest('src/core/domain/entity.ts', "import { RuntimeService } from '../runtime/service';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should fail for core module with runtime in import path', async () => {
      const req = makeRequest('src/core/domain/test.ts', "import { x } from './runtime-module';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect(r.passed).toBe(false);
    });
    it('should include import statement in violation evidence', async () => {
      const req = makeRequest('src/core/domain/entity.ts', "import { RuntimeService } from '../runtime/service';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect((r.violations[0].evidence as string[])[0]).toContain('import');
    });
    it('should include recommendation in violation', async () => {
      const req = makeRequest('src/core/domain/entity.ts', "import { RuntimeService } from '../runtime/service';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect(r.violations[0].recommendation.length).toBeGreaterThan(0);
    });
    it('should set isInCoreModule metadata for core paths', async () => {
      const req = makeRequest('src/core/domain/entity.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect(r.metadata.isInCoreModule).toBe(true);
    });
    it('should set severity to Critical', async () => {
      const req = makeRequest('src/core/domain/entity.ts', "import { RuntimeService } from '../runtime/service';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Critical);
    });
    it('should set violation state to Detected', async () => {
      const req = makeRequest('src/core/domain/entity.ts', "import { RuntimeService } from '../runtime/service';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect(r.violations[0].state).toBe(ViolationState.Detected);
    });
    it('should detect multiple runtime imports', async () => {
      const c = "import { A } from '../runtime/a'; import { B } from '../runtime/b';";
      const req = makeRequest('src/core/domain/entity.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-002'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(2);
    });
  });

  // ─── ARCH-003: No layer violations ───────────────────────────────

  describe('ARCH-003: No layer violations', () => {
    it('should pass with no content', async () => {
      const req = makeRequest('src/types/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass for types layer with no imports', async () => {
      const req = makeRequest('src/types/common.ts', 'export type Id = string;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass for same-layer relative imports', async () => {
      const req = makeRequest('src/types/a.ts', "import { B } from './other';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass for lower-layer imports', async () => {
      const req = makeRequest('src/domain/entity.ts', "import { Id } from '../types/common';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail for types importing domain', async () => {
      const req = makeRequest('src/types/common.ts', "import { Entity } from '../domain/entity';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should fail for domain importing api', async () => {
      const req = makeRequest('src/domain/service.ts', "import { handler } from '../api/route';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.passed).toBe(false);
    });
    it('should include source and target layers in description', async () => {
      const req = makeRequest('src/types/common.ts', "import { Entity } from '../domain/entity';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.violations[0].description).toContain('types');
      expect(r.violations[0].description).toContain('domain');
    });
    it('should include layer indices in description', async () => {
      const req = makeRequest('src/types/common.ts', "import { Entity } from '../domain/entity';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.violations[0].description).toContain('index');
    });
    it('should set sourceLayer in metadata', async () => {
      const req = makeRequest('src/types/test.ts', 'export type X = string;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.metadata.sourceLayer).toBe('types');
    });
    it('should set empty sourceLayer for unrecognized path', async () => {
      const req = makeRequest('src/unknown/file.ts', 'export type X = string;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.metadata.sourceLayer).toBe('');
    });
    it('should pass for absolute imports', async () => {
      const req = makeRequest('src/types/test.ts', "import { z } from 'zod';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should set severity to Error', async () => {
      const req = makeRequest('src/types/common.ts', "import { Entity } from '../domain/entity';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Error);
    });
    it('should detect multiple layer violations', async () => {
      const c = "import { Entity } from '../domain/entity'; import { Runtime } from '../runtime/engine';";
      const req = makeRequest('src/types/common.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.violations.length).toBeGreaterThanOrEqual(2);
    });
    it('should pass for compliance importing types', async () => {
      const req = makeRequest('src/compliance/validator.ts', "import { Id } from '../types/common';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-003'))!;
      expect(r.passed).toBe(true);
    });
  });

  // ─── ARCH-004: Branded IDs used ──────────────────────────────────

  describe('ARCH-004: Branded IDs used', () => {
    it('should pass with no content', async () => {
      const req = makeRequest('src/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass when brandRuleId is present', async () => {
      const req = makeRequest('src/test.ts', "import { brandRuleId } from './types'; brandRuleId('x');");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass when brandViolationId is present', async () => {
      const req = makeRequest('src/test.ts', "brandViolationId('x');");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail when id fields exist without branded types', async () => {
      const req = makeRequest('src/test.ts', 'const ruleId: string = "x"; const id: string = "y";');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should pass when no id fields and no string type', async () => {
      const req = makeRequest('src/test.ts', 'const x = 42; const y = true;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass when id fields exist but no string keyword', async () => {
      const req = makeRequest('src/test.ts', 'const ruleId: number = 5;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should detect violationId without branded types', async () => {
      const req = makeRequest('src/test.ts', 'const violationId: string = "v-1";');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.passed).toBe(false);
    });
    it('should detect sessionId without branded types', async () => {
      const req = makeRequest('src/test.ts', 'const sessionId: string = "s-1";');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.passed).toBe(false);
    });
    it('should set severity to Warning', async () => {
      const req = makeRequest('src/test.ts', 'const id: string = "x";');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Warning);
    });
    it('should set enforcement to Advisory', async () => {
      const req = makeRequest('src/test.ts', 'const id: string = "x";');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should set hasBrandImport metadata true when branded', async () => {
      const req = makeRequest('src/test.ts', 'brandRuleId');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.metadata.hasBrandImport).toBe(true);
    });
    it('should set hasBrandImport metadata false when not branded', async () => {
      const req = makeRequest('src/test.ts', 'const id: string = "x";');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.metadata.hasBrandImport).toBe(false);
    });
    it('should include correct violation description', async () => {
      const req = makeRequest('src/test.ts', 'const id: string = "x";');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.violations[0].description).toContain('branded');
    });
    it('should include recommendation mentioning brand', async () => {
      const req = makeRequest('src/test.ts', 'const id: string = "x";');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-004'))!;
      expect(r.violations[0].recommendation).toContain('brand');
    });
  });

  // ─── ARCH-005: Object.freeze used ───────────────────────────────

  describe('ARCH-005: Object.freeze used', () => {
    it('should pass with no content', async () => {
      const req = makeRequest('src/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-005'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass when return objects use Object.freeze', async () => {
      const req = makeRequest('src/test.ts', "function getConfig() { return Object.freeze({ key: 'value' }); }");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-005'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass when no return objects exist', async () => {
      const req = makeRequest('src/test.ts', 'const x = 42; export default x;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-005'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass when only const objects exist without return', async () => {
      const req = makeRequest('src/test.ts', 'const config = { key: 1 };');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-005'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail when return objects without Object.freeze', async () => {
      const req = makeRequest('src/test.ts', 'function getConfig() { return { key: "value" }; }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-005'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should set severity to Warning', async () => {
      const req = makeRequest('src/test.ts', 'function f() { return { x: 1 }; }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-005'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Warning);
    });
    it('should set enforcement to Advisory', async () => {
      const req = makeRequest('src/test.ts', 'function f() { return { x: 1 }; }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-005'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should include recommendation mentioning Object.freeze', async () => {
      const req = makeRequest('src/test.ts', 'function f() { return { x: 1 }; }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-005'))!;
      expect(r.violations[0].recommendation).toContain('Object.freeze');
    });
    it('should set hasFreeze metadata true when present', async () => {
      const req = makeRequest('src/test.ts', 'Object.freeze({});');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-005'))!;
      expect(r.metadata.hasFreeze).toBe(true);
    });
    it('should set hasReturnObjects metadata true when return objects', async () => {
      const req = makeRequest('src/test.ts', 'function f() { return { x: 1 }; }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-005'))!;
      expect(r.metadata.hasReturnObjects).toBe(true);
    });
    it('should set hasConstObjects metadata true when const objects', async () => {
      const req = makeRequest('src/test.ts', 'const x = { a: 1 };');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('ARCH-005'))!;
      expect(r.metadata.hasConstObjects).toBe(true);
    });
  });

  // ─── validateArchitecture typed method ───────────────────────────

  describe('validateArchitecture', () => {
    it('should return array of results', async () => {
      const results = await validator.validateArchitecture('src/test.ts', 'const x = 1;', brandComplianceSessionId('s1'));
      expect(Array.isArray(results)).toBe(true);
    });
    it('should return 5 results for Architecture category', async () => {
      const results = await validator.validateArchitecture('src/test.ts', 'const x = 1;', brandComplianceSessionId('s1'));
      expect(results).toHaveLength(5);
    });
    it('should pass all rules for clean content', async () => {
      const content = "import { brandRuleId } from './types'; function f() { return Object.freeze({ x: 1 }); }";
      const results = await validator.validateArchitecture('src/test.ts', content, brandComplianceSessionId('s1'));
      for (const r of results) expect(r.passed).toBe(true);
    });
    it('should use ValidationTargetType.Architecture', async () => {
      const results = await validator.validateArchitecture('src/test.ts', 'const x = 1;', brandComplianceSessionId('s1'));
      // The results should all be Architecture category
      for (const r of results) expect(r.category).toBe(RuleCategory.Architecture);
    });
  });

  // ─── validate generic method ─────────────────────────────────────

  describe('validate', () => {
    it('should return array of results', async () => {
      const req = makeRequest('src/test.ts', 'const x = 1;');
      const results = await validator.validate(req);
      expect(Array.isArray(results)).toBe(true);
    });
    it('should filter by category in request', async () => {
      const req = makeRequest('src/test.ts', 'const x = 1;', [RuleCategory.Architecture]);
      const results = await validator.validate(req);
      expect(results.length).toBeGreaterThan(0);
    });
    it('should return empty for non-matching category', async () => {
      const req = Object.freeze({
        targetType: ValidationTargetType.Architecture,
        targetPath: 'src/test.ts',
        targetContent: 'const x = 1;',
        categories: [RuleCategory.Runtime] as readonly RuleCategory[],
        sessionId: brandComplianceSessionId('s'),
        metadata: {},
      });
      const results = await validator.validate(req);
      expect(results).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RuntimeValidator
// ═══════════════════════════════════════════════════════════════════════════

describe('RuntimeValidator', () => {
  let engine: RuleEngine;
  let validator: RuntimeValidator;

  beforeEach(async () => {
    engine = await setupEngine();
    validator = new RuntimeValidator(engine);
    await validator.registerRules();
  });

  // ─── Constructor & Properties ─────────────────────────────────

  describe('constructor and properties', () => {
    it('should create instance with correct id', () => {
      expect(validator.id).toBe(brandValidatorId('runtime-validator'));
    });
    it('should create instance with correct name', () => {
      expect(validator.name).toBe('RuntimeValidator');
    });
    it('should have Runtime category', () => {
      expect(validator.category).toBe(RuleCategory.Runtime);
    });
    it('should accept a RuleEngine instance', () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new RuntimeValidator(e);
      expect(v).toBeInstanceOf(RuntimeValidator);
    });
    it('should store rule engine reference', async () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new RuntimeValidator(e);
      await v.registerRules();
      expect(await e.count()).toBeGreaterThan(0);
    });
  });

  // ─── registerRules ─────────────────────────────────────────────

  describe('registerRules', () => {
    it('should register 5 rules', async () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new RuntimeValidator(e);
      await v.registerRules();
      expect(await e.count()).toBe(5);
    });
    it('should register RUN-001', async () => {
      const rule = await engine.getRule(brandRuleId('RUN-001'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Runtime implements governance contract');
    });
    it('should register RUN-002', async () => {
      const rule = await engine.getRule(brandRuleId('RUN-002'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Runtime answers Value question');
    });
    it('should register RUN-003', async () => {
      const rule = await engine.getRule(brandRuleId('RUN-003'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Runtime answers Constraint question');
    });
    it('should register RUN-004', async () => {
      const rule = await engine.getRule(brandRuleId('RUN-004'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Runtime answers Optimization question');
    });
    it('should register RUN-005', async () => {
      const rule = await engine.getRule(brandRuleId('RUN-005'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Runtime answers Measurement question');
    });
    it('should throw on duplicate registration', async () => {
      const v2 = new RuntimeValidator(engine);
      await expect(v2.registerRules()).rejects.toThrow(RuleAlreadyRegisteredError);
    });
    it('should set RUN-001 severity to Critical', async () => {
      expect((await engine.getRule(brandRuleId('RUN-001')))!.severity).toBe(RuleSeverity.Critical);
    });
    it('should set RUN-002 severity to Error', async () => {
      expect((await engine.getRule(brandRuleId('RUN-002')))!.severity).toBe(RuleSeverity.Error);
    });
    it('should set RUN-003 severity to Error', async () => {
      expect((await engine.getRule(brandRuleId('RUN-003')))!.severity).toBe(RuleSeverity.Error);
    });
    it('should set RUN-004 severity to Warning', async () => {
      expect((await engine.getRule(brandRuleId('RUN-004')))!.severity).toBe(RuleSeverity.Warning);
    });
    it('should set RUN-005 severity to Warning', async () => {
      expect((await engine.getRule(brandRuleId('RUN-005')))!.severity).toBe(RuleSeverity.Warning);
    });
    it('should set RUN-001 enforcement to Blocking', async () => {
      expect((await engine.getRule(brandRuleId('RUN-001')))!.enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should set RUN-004 enforcement to Advisory', async () => {
      expect((await engine.getRule(brandRuleId('RUN-004')))!.enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should set RUN-005 enforcement to Advisory', async () => {
      expect((await engine.getRule(brandRuleId('RUN-005')))!.enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should set all rules to enabled', async () => {
      const rules = await engine.listRules({ category: RuleCategory.Runtime });
      for (const rule of rules) expect(rule.enabled).toBe(true);
    });
  });

  // ─── RUN-001: Runtime implements governance contract ──────────────

  describe('RUN-001: Runtime implements governance contract', () => {
    it('should pass with no content', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass when all 3 methods present', async () => {
      const c = 'getConstraintReport() { } getValueMetrics() { } askQuestion() { }';
      const req = makeRuntimeRequest('src/runtime/engine.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.passed).toBe(true);
      expect(r.violations).toHaveLength(0);
    });
    it('should fail when getConstraintReport missing', async () => {
      const c = 'getValueMetrics() { } askQuestion() { }';
      const req = makeRuntimeRequest('src/runtime/engine.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0].description).toContain('getConstraintReport');
    });
    it('should fail when getValueMetrics missing', async () => {
      const c = 'getConstraintReport() { } askQuestion() { }';
      const req = makeRuntimeRequest('src/runtime/engine.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.passed).toBe(false);
      expect(r.violations[0].description).toContain('getValueMetrics');
    });
    it('should fail when askQuestion missing', async () => {
      const c = 'getConstraintReport() { } getValueMetrics() { }';
      const req = makeRuntimeRequest('src/runtime/engine.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.passed).toBe(false);
      expect(r.violations[0].description).toContain('askQuestion');
    });
    it('should fail when all 3 methods missing', async () => {
      const c = 'const x = 1;';
      const req = makeRuntimeRequest('src/runtime/engine.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(3);
    });
    it('should fail when 2 methods missing', async () => {
      const c = 'getConstraintReport() { }';
      const req = makeRuntimeRequest('src/runtime/engine.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(2);
    });
    it('should detect method with space before paren', async () => {
      const c = 'getConstraintReport () { } getValueMetrics () { } askQuestion () { }';
      const req = makeRuntimeRequest('src/runtime/engine.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should set severity to Critical', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Critical);
    });
    it('should set violation state to Detected', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.violations[0].state).toBe(ViolationState.Detected);
    });
    it('should include missing method name in evidence', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      const evidence = r.violations[0].evidence as string[];
      expect(evidence[0]).toContain('getConstraintReport');
    });
    it('should include recommendation', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.violations[0].recommendation.length).toBeGreaterThan(0);
    });
    it('should include methodsChecked in metadata', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.metadata.methodsChecked).toBe(3);
    });
    it('should include missingMethod in violation metadata', async () => {
      const c = 'getValueMetrics() { } askQuestion() { }';
      const req = makeRuntimeRequest('src/runtime/engine.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-001'))!;
      expect(r.violations[0].metadata.missingMethod).toBe('getConstraintReport');
    });
  });

  // ─── RUN-002: Runtime answers Value question ──────────────────────

  describe('RUN-002: Runtime answers Value question', () => {
    it('should pass with no content', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-002'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass when getValueMetrics present', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'getValueMetrics() { }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-002'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail when getValueMetrics absent', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-002'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should set severity to Error', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-002'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Error);
    });
    it('should set enforcement to Blocking', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-002'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should include questionName in description', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-002'))!;
      expect(r.violations[0].description).toContain('Value');
    });
    it('should include questionName in metadata', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'getValueMetrics() { }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-002'))!;
      expect(r.metadata.questionName).toBe('Value');
    });
    it('should detect method with space before paren', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'getValueMetrics () { }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-002'))!;
      expect(r.passed).toBe(true);
    });
  });

  // ─── RUN-003: Runtime answers Constraint question ─────────────────

  describe('RUN-003: Runtime answers Constraint question', () => {
    it('should pass with no content', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-003'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass when getConstraintReport present', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'getConstraintReport() { }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail when getConstraintReport absent', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-003'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should set severity to Error', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-003'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Error);
    });
    it('should set enforcement to Blocking', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-003'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should include Constraint in description', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-003'))!;
      expect(r.violations[0].description).toContain('Constraint');
    });
    it('should include questionName in metadata', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'getConstraintReport() { }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-003'))!;
      expect(r.metadata.questionName).toBe('Constraint');
    });
  });

  // ─── RUN-004: Runtime answers Optimization question ───────────────

  describe('RUN-004: Runtime answers Optimization question', () => {
    it('should pass with no content', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-004'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass when getOptimizationSuggestions present', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'getOptimizationSuggestions() { }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail when getOptimizationSuggestions absent', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-004'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should set severity to Warning', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-004'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Warning);
    });
    it('should set enforcement to Advisory', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-004'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should include Optimization in description', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-004'))!;
      expect(r.violations[0].description).toContain('Optimization');
    });
    it('should include questionName in metadata', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'getOptimizationSuggestions() { }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-004'))!;
      expect(r.metadata.questionName).toBe('Optimization');
    });
  });

  // ─── RUN-005: Runtime answers Measurement question ────────────────

  describe('RUN-005: Runtime answers Measurement question', () => {
    it('should pass with no content', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-005'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass when getMeasurementData present', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'getMeasurementData() { }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-005'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail when getMeasurementData absent', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-005'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should set severity to Warning', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-005'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Warning);
    });
    it('should set enforcement to Advisory', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-005'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should include Measurement in description', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-005'))!;
      expect(r.violations[0].description).toContain('Measurement');
    });
    it('should include questionName in metadata', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'getMeasurementData() { }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('RUN-005'))!;
      expect(r.metadata.questionName).toBe('Measurement');
    });
  });

  // ─── validateRuntime typed method ─────────────────────────────────

  describe('validateRuntime', () => {
    it('should return array of results', async () => {
      const results = await validator.validateRuntime('src/runtime/engine.ts', brandComplianceSessionId('s1'));
      expect(Array.isArray(results)).toBe(true);
    });
    it('should return 5 results', async () => {
      const results = await validator.validateRuntime('src/runtime/engine.ts', brandComplianceSessionId('s1'));
      expect(results).toHaveLength(5);
    });
    it('should pass all rules when no content', async () => {
      const results = await validator.validateRuntime('src/runtime/engine.ts', brandComplianceSessionId('s1'));
      for (const r of results) expect(r.passed).toBe(true);
    });
    it('should all have Runtime category', async () => {
      const results = await validator.validateRuntime('src/runtime/engine.ts', brandComplianceSessionId('s1'));
      for (const r of results) expect(r.category).toBe(RuleCategory.Runtime);
    });
  });

  // ─── validate generic method ─────────────────────────────────────

  describe('validate', () => {
    it('should return array of results', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const results = await validator.validate(req);
      expect(Array.isArray(results)).toBe(true);
    });
    it('should return empty for non-matching category', async () => {
      const req = Object.freeze({
        targetType: ValidationTargetType.Runtime,
        targetPath: 'src/runtime/engine.ts',
        targetContent: 'const x = 1;',
        categories: [RuleCategory.Architecture] as readonly RuleCategory[],
        sessionId: brandComplianceSessionId('s'),
        metadata: {},
      });
      const results = await validator.validate(req);
      expect(results).toHaveLength(0);
    });
    it('should filter by Runtime category', async () => {
      const req = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
      const results = await validator.validate(req);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CapabilityValidator
// ═══════════════════════════════════════════════════════════════════════════

describe('CapabilityValidator', () => {
  let engine: RuleEngine;
  let validator: CapabilityValidator;

  beforeEach(async () => {
    engine = await setupEngine();
    validator = new CapabilityValidator(engine);
    await validator.registerRules();
  });

  // ─── Constructor & Properties ─────────────────────────────────

  describe('constructor and properties', () => {
    it('should create instance with correct id', () => {
      expect(validator.id).toBe(brandValidatorId('capability-validator'));
    });
    it('should create instance with correct name', () => {
      expect(validator.name).toBe('CapabilityValidator');
    });
    it('should have CapabilityPack category', () => {
      expect(validator.category).toBe(RuleCategory.CapabilityPack);
    });
    it('should accept a RuleEngine instance', () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new CapabilityValidator(e);
      expect(v).toBeInstanceOf(CapabilityValidator);
    });
    it('should store rule engine reference', async () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new CapabilityValidator(e);
      await v.registerRules();
      expect(await e.count()).toBeGreaterThan(0);
    });
  });

  // ─── registerRules ─────────────────────────────────────────────

  describe('registerRules', () => {
    it('should register 6 rules', async () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new CapabilityValidator(e);
      await v.registerRules();
      expect(await e.count()).toBe(6);
    });
    it('should register CAP-001', async () => {
      const rule = await engine.getRule(brandRuleId('CAP-001'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Manifest present');
    });
    it('should register CAP-002', async () => {
      const rule = await engine.getRule(brandRuleId('CAP-002'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Permissions defined');
    });
    it('should register CAP-003', async () => {
      const rule = await engine.getRule(brandRuleId('CAP-003'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Policies defined');
    });
    it('should register CAP-004', async () => {
      const rule = await engine.getRule(brandRuleId('CAP-004'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Dependencies declared');
    });
    it('should register CAP-005', async () => {
      const rule = await engine.getRule(brandRuleId('CAP-005'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Contracts implemented');
    });
    it('should register CAP-006', async () => {
      const rule = await engine.getRule(brandRuleId('CAP-006'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Sandbox isolation');
    });
    it('should throw on duplicate registration', async () => {
      const v2 = new CapabilityValidator(engine);
      await expect(v2.registerRules()).rejects.toThrow(RuleAlreadyRegisteredError);
    });
    it('should set CAP-001 severity to Critical', async () => {
      expect((await engine.getRule(brandRuleId('CAP-001')))!.severity).toBe(RuleSeverity.Critical);
    });
    it('should set CAP-002 severity to Error', async () => {
      expect((await engine.getRule(brandRuleId('CAP-002')))!.severity).toBe(RuleSeverity.Error);
    });
    it('should set CAP-003 severity to Error', async () => {
      expect((await engine.getRule(brandRuleId('CAP-003')))!.severity).toBe(RuleSeverity.Error);
    });
    it('should set CAP-004 severity to Warning', async () => {
      expect((await engine.getRule(brandRuleId('CAP-004')))!.severity).toBe(RuleSeverity.Warning);
    });
    it('should set CAP-005 severity to Error', async () => {
      expect((await engine.getRule(brandRuleId('CAP-005')))!.severity).toBe(RuleSeverity.Error);
    });
    it('should set CAP-006 severity to Critical', async () => {
      expect((await engine.getRule(brandRuleId('CAP-006')))!.severity).toBe(RuleSeverity.Critical);
    });
    it('should set CAP-006 enforcement to Blocking', async () => {
      expect((await engine.getRule(brandRuleId('CAP-006')))!.enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should set CAP-004 enforcement to Advisory', async () => {
      expect((await engine.getRule(brandRuleId('CAP-004')))!.enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
  });

  // ─── CAP-001: Manifest present ────────────────────────────────────

  describe('CAP-001: Manifest present', () => {
    it('should pass with no content', async () => {
      const req = makeCapRequest('caps/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-001'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass with manifest name and version', async () => {
      const c = 'const manifest = { name: "test", version: "1.0.0" };';
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with Manifest uppercase', async () => {
      const c = 'const Manifest = { name: "x", version: "2.0" };';
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail without manifest keyword', async () => {
      const c = 'const config = { name: "x", version: "1.0" };';
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-001'))!;
      expect(r.passed).toBe(false);
      expect(r.violations[0].description).toContain('manifest');
    });
    it('should fail when manifest missing name', async () => {
      const c = 'const manifest = { description: "x", version: "1.0" };';
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-001'))!;
      expect(r.passed).toBe(false);
    });
    it('should fail when manifest missing version', async () => {
      const c = 'const manifest = { name: "x", description: "y" };';
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-001'))!;
      expect(r.passed).toBe(false);
    });
    it('should set severity to Critical', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-001'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Critical);
    });
    it('should include recommendation', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-001'))!;
      expect(r.violations[0].recommendation.length).toBeGreaterThan(0);
    });
    it('should pass with JSON-style manifest', async () => {
      const c = '{ "manifest": { "name": "x", "version": "1.0.0" } }';
      const req = makeCapRequest('caps/test.json', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should detect missing fields in metadata for partial manifest', async () => {
      const c = 'manifest { name: "x" }';
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-001'))!;
      expect(r.passed).toBe(false);
      expect(r.violations[0].metadata.hasName).toBe(true);
      expect(r.violations[0].metadata.hasVersion).toBe(false);
    });
  });

  // ─── CAP-002: Permissions defined ─────────────────────────────────

  describe('CAP-002: Permissions defined', () => {
    it('should pass with no content', async () => {
      const req = makeCapRequest('caps/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-002'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass when permissions present', async () => {
      const req = makeCapRequest('caps/test.ts', 'const permissions = ["read"];');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-002'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass when permission singular present', async () => {
      const req = makeCapRequest('caps/test.ts', 'const permission = "read";');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-002'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail when no permissions', async () => {
      const req = makeCapRequest('caps/test.ts', 'const config = { name: "x" };');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-002'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should set severity to Error', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-002'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Error);
    });
    it('should set enforcement to Blocking', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-002'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should include recommendation', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-002'))!;
      expect(r.violations[0].recommendation.length).toBeGreaterThan(0);
    });
  });

  // ─── CAP-003: Policies defined ────────────────────────────────────

  describe('CAP-003: Policies defined', () => {
    it('should pass with no content', async () => {
      const req = makeCapRequest('caps/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-003'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass when policies present', async () => {
      const req = makeCapRequest('caps/test.ts', 'const policies = [];');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass when policy singular present', async () => {
      const req = makeCapRequest('caps/test.ts', 'const policy = {};');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass when Policy uppercase', async () => {
      const req = makeCapRequest('caps/test.ts', 'const Policy = {};');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail when no policy keywords', async () => {
      const req = makeCapRequest('caps/test.ts', 'const config = { name: "x" };');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-003'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should set severity to Error', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-003'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Error);
    });
    it('should set enforcement to Blocking', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-003'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should include recommendation', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-003'))!;
      expect(r.violations[0].recommendation.length).toBeGreaterThan(0);
    });
  });

  // ─── CAP-004: Dependencies declared ───────────────────────────────

  describe('CAP-004: Dependencies declared', () => {
    it('should pass with no content', async () => {
      const req = makeCapRequest('caps/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-004'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass with imports and dependencies declared', async () => {
      const c = "import { x } from 'y'; const dependencies = ['y'];";
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail with imports but no dependencies', async () => {
      const c = "import { x } from 'y'; const config = {};";
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-004'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should pass with no imports and no dependencies', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with dependencies but no imports', async () => {
      const req = makeCapRequest('caps/test.ts', 'const dependency = { name: "x" };');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should set severity to Warning', async () => {
      const c = "import { x } from 'y';";
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-004'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Warning);
    });
    it('should set enforcement to Advisory', async () => {
      const c = "import { x } from 'y';";
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-004'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should include both evidence items', async () => {
      const c = "import { x } from 'y';";
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-004'))!;
      expect((r.violations[0].evidence as string[]).length).toBe(2);
    });
  });

  // ─── CAP-005: Contracts implemented ───────────────────────────────

  describe('CAP-005: Contracts implemented', () => {
    it('should pass with no content', async () => {
      const req = makeCapRequest('caps/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-005'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass when implements keyword present', async () => {
      const req = makeCapRequest('caps/test.ts', 'class X implements IContract {}');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-005'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass when interface keyword present', async () => {
      const req = makeCapRequest('caps/test.ts', 'interface IContract {}');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-005'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass when contract keyword present', async () => {
      const req = makeCapRequest('caps/test.ts', 'const contract = {};');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-005'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass when export class present', async () => {
      const req = makeCapRequest('caps/test.ts', 'export class MyService {}');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-005'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass when export function present', async () => {
      const req = makeCapRequest('caps/test.ts', 'export function doWork() {}');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-005'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail when no contract or export keywords', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1; const y = 2;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-005'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should set severity to Error', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-005'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Error);
    });
    it('should set enforcement to Blocking', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-005'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should include recommendation', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-005'))!;
      expect(r.violations[0].recommendation.length).toBeGreaterThan(0);
    });
    it('should pass when export interface present', async () => {
      const req = makeCapRequest('caps/test.ts', 'export interface IService {}');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-005'))!;
      expect(r.passed).toBe(true);
    });
  });

  // ─── CAP-006: Sandbox isolation ──────────────────────────────────

  describe('CAP-006: Sandbox isolation', () => {
    it('should pass with no content', async () => {
      const req = makeCapRequest('caps/test.ts');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass for clean content', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1; function f() { return x; }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass for global with sandbox keyword', async () => {
      const req = makeCapRequest('caps/test.ts', 'const sandbox = true; global.x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass for process.env with sandbox keyword', async () => {
      const req = makeCapRequest('caps/test.ts', 'const sandbox = true; process.env.X;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail for global access without sandbox', async () => {
      const req = makeCapRequest('caps/test.ts', 'global.x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should fail for globalThis without sandbox', async () => {
      const req = makeCapRequest('caps/test.ts', 'globalThis.x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(false);
    });
    it('should fail for process.env without sandbox', async () => {
      const req = makeCapRequest('caps/test.ts', 'process.env.NODE_ENV;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(false);
    });
    it('should fail for process.exit without sandbox', async () => {
      const req = makeCapRequest('caps/test.ts', 'process.exit(1);');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(false);
    });
    it('should fail for process.kill without sandbox', async () => {
      const req = makeCapRequest('caps/test.ts', 'process.kill(1);');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(false);
    });
    it('should fail for require(fs) without sandbox', async () => {
      const req = makeCapRequest('caps/test.ts', "require('fs');");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(false);
    });
    it('should fail for import fs without sandbox', async () => {
      const req = makeCapRequest('caps/test.ts', "import * as fs from 'fs';");
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(false);
    });
    it('should pass for process.cwd (not env/exit/kill)', async () => {
      const req = makeCapRequest('caps/test.ts', 'process.cwd();');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(true);
    });
    it('should set severity to Critical', async () => {
      const req = makeCapRequest('caps/test.ts', 'global.x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Critical);
    });
    it('should include all evidence for combined violations', async () => {
      const c = "global.x = 1; process.env.X; require('fs');";
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.passed).toBe(false);
      expect((r.violations[0].evidence as string[]).length).toBe(3);
    });
    it('should include metadata about access types', async () => {
      const c = "global.x = 1; process.env.X;";
      const req = makeCapRequest('caps/test.ts', c);
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.violations[0].metadata.hasGlobalAccess).toBe(true);
      expect(r.violations[0].metadata.hasProcessAccess).toBe(true);
      expect(r.violations[0].metadata.hasFsAccess).toBe(false);
    });
    it('should include sandbox in evidence description', async () => {
      const req = makeCapRequest('caps/test.ts', 'global.x = 1;');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('CAP-006'))!;
      expect(r.violations[0].recommendation).toContain('sandbox');
    });
  });

  // ─── validateCapability typed method ──────────────────────────────

  describe('validateCapability', () => {
    it('should return array of results', async () => {
      const results = await validator.validateCapability('caps/test.ts', brandComplianceSessionId('s1'));
      expect(Array.isArray(results)).toBe(true);
    });
    it('should return 6 results', async () => {
      const results = await validator.validateCapability('caps/test.ts', brandComplianceSessionId('s1'));
      expect(results).toHaveLength(6);
    });
    it('should pass all rules when no content', async () => {
      const results = await validator.validateCapability('caps/test.ts', brandComplianceSessionId('s1'));
      for (const r of results) expect(r.passed).toBe(true);
    });
    it('should all have CapabilityPack category', async () => {
      const results = await validator.validateCapability('caps/test.ts', brandComplianceSessionId('s1'));
      for (const r of results) expect(r.category).toBe(RuleCategory.CapabilityPack);
    });
  });

  // ─── validate generic method ─────────────────────────────────────

  describe('validate', () => {
    it('should return array of results', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const results = await validator.validate(req);
      expect(Array.isArray(results)).toBe(true);
    });
    it('should return empty for non-matching category', async () => {
      const req = Object.freeze({
        targetType: ValidationTargetType.CapabilityPack,
        targetPath: 'caps/test.ts',
        targetContent: 'const x = 1;',
        categories: [RuleCategory.Architecture] as readonly RuleCategory[],
        sessionId: brandComplianceSessionId('s'),
        metadata: {},
      });
      const results = await validator.validate(req);
      expect(results).toHaveLength(0);
    });
    it('should filter by CapabilityPack category', async () => {
      const req = makeCapRequest('caps/test.ts', 'const x = 1;');
      const results = await validator.validate(req);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DocumentationValidator
// ═══════════════════════════════════════════════════════════════════════════

describe('DocumentationValidator', () => {
  let engine: RuleEngine;
  let validator: DocumentationValidator;

  beforeEach(async () => {
    engine = await setupEngine();
    validator = new DocumentationValidator(engine);
    await validator.registerRules();
  });

  // ─── Constructor & Properties ─────────────────────────────────

  describe('constructor and properties', () => {
    it('should create instance with correct id', () => {
      expect(validator.id).toBe(brandValidatorId('documentation-validator'));
    });
    it('should create instance with correct name', () => {
      expect(validator.name).toBe('DocumentationValidator');
    });
    it('should have Documentation category', () => {
      expect(validator.category).toBe(RuleCategory.Documentation);
    });
    it('should accept a RuleEngine instance', () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new DocumentationValidator(e);
      expect(v).toBeInstanceOf(DocumentationValidator);
    });
    it('should store rule engine reference', async () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new DocumentationValidator(e);
      await v.registerRules();
      expect(await e.count()).toBeGreaterThan(0);
    });
  });

  // ─── registerRules ─────────────────────────────────────────────

  describe('registerRules', () => {
    it('should register 5 rules', async () => {
      const e = new RuleEngine(DefaultComplianceRuntimeConfig.ruleEngine);
      const v = new DocumentationValidator(e);
      await v.registerRules();
      expect(await e.count()).toBe(5);
    });
    it('should register DOC-001', async () => {
      const rule = await engine.getRule(brandRuleId('DOC-001'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Document has ID');
    });
    it('should register DOC-002', async () => {
      const rule = await engine.getRule(brandRuleId('DOC-002'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Document has version');
    });
    it('should register DOC-003', async () => {
      const rule = await engine.getRule(brandRuleId('DOC-003'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Document has owner');
    });
    it('should register DOC-004', async () => {
      const rule = await engine.getRule(brandRuleId('DOC-004'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Document has references');
    });
    it('should register DOC-005', async () => {
      const rule = await engine.getRule(brandRuleId('DOC-005'));
      expect(rule).not.toBeNull();
      expect(rule!.name).toBe('Document has status');
    });
    it('should throw on duplicate registration', async () => {
      const v2 = new DocumentationValidator(engine);
      await expect(v2.registerRules()).rejects.toThrow(RuleAlreadyRegisteredError);
    });
    it('should set DOC-001 severity to Critical', async () => {
      expect((await engine.getRule(brandRuleId('DOC-001')))!.severity).toBe(RuleSeverity.Critical);
    });
    it('should set DOC-002 severity to Error', async () => {
      expect((await engine.getRule(brandRuleId('DOC-002')))!.severity).toBe(RuleSeverity.Error);
    });
    it('should set DOC-003 severity to Warning', async () => {
      expect((await engine.getRule(brandRuleId('DOC-003')))!.severity).toBe(RuleSeverity.Warning);
    });
    it('should set DOC-004 severity to Warning', async () => {
      expect((await engine.getRule(brandRuleId('DOC-004')))!.severity).toBe(RuleSeverity.Warning);
    });
    it('should set DOC-005 severity to Error', async () => {
      expect((await engine.getRule(brandRuleId('DOC-005')))!.severity).toBe(RuleSeverity.Error);
    });
    it('should set DOC-001 enforcement to Blocking', async () => {
      expect((await engine.getRule(brandRuleId('DOC-001')))!.enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should set DOC-003 enforcement to Advisory', async () => {
      expect((await engine.getRule(brandRuleId('DOC-003')))!.enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should set DOC-004 enforcement to Advisory', async () => {
      expect((await engine.getRule(brandRuleId('DOC-004')))!.enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should set all rules to enabled', async () => {
      const rules = await engine.listRules({ category: RuleCategory.Documentation });
      for (const rule of rules) expect(rule.enabled).toBe(true);
    });
  });

  // ─── DOC-001: Document has ID ────────────────────────────────────

  describe('DOC-001: Document has ID', () => {
    it('should pass with no content', async () => {
      const req = makeDocRequest('docs/test.md');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-001'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass with id field', async () => {
      const req = makeDocRequest('docs/test.md', 'id: DOC-001');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with docId field', async () => {
      const req = makeDocRequest('docs/test.md', 'docId: DOC-001');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with documentId field', async () => {
      const req = makeDocRequest('docs/test.md', 'documentId: DOC-001');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with JSON id', async () => {
      const req = makeDocRequest('docs/test.json', '{ "id": "DOC-001" }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-001'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail with no id field', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-001'))!;
      expect(r.passed).toBe(false);
      expect(r.violations).toHaveLength(1);
    });
    it('should set severity to Critical', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-001'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Critical);
    });
    it('should set enforcement to Blocking', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-001'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should include recommendation', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-001'))!;
      expect(r.violations[0].recommendation.length).toBeGreaterThan(0);
    });
    it('should include evidence about missing id', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-001'))!;
      expect((r.violations[0].evidence as string[])[0]).toContain('id');
    });
  });

  // ─── DOC-002: Document has version ────────────────────────────────

  describe('DOC-002: Document has version', () => {
    it('should pass with no content', async () => {
      const req = makeDocRequest('docs/test.md');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-002'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass with semver version', async () => {
      const req = makeDocRequest('docs/test.md', 'version: 1.0.0');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-002'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with JSON version semver', async () => {
      const req = makeDocRequest('docs/test.json', '{ "version": "2.3.1" }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-002'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with single digit version', async () => {
      const req = makeDocRequest('docs/test.md', 'version: 1.0');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-002'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail with non-semver version', async () => {
      const req = makeDocRequest('docs/test.md', 'version: latest');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-002'))!;
      expect(r.passed).toBe(false);
    });
    it('should fail with no version', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-002'))!;
      expect(r.passed).toBe(false);
    });
    it('should set severity to Error', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-002'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Error);
    });
    it('should set enforcement to Blocking', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-002'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should include recommendation about semver', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-002'))!;
      expect(r.violations[0].recommendation).toContain('version');
    });
    it('should include evidence about semver', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-002'))!;
      expect((r.violations[0].evidence as string[])[0]).toContain('semver');
    });
  });

  // ─── DOC-003: Document has owner ──────────────────────────────────

  describe('DOC-003: Document has owner', () => {
    it('should pass with no content', async () => {
      const req = makeDocRequest('docs/test.md');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-003'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass with owner field', async () => {
      const req = makeDocRequest('docs/test.md', 'owner: John');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with author field', async () => {
      const req = makeDocRequest('docs/test.md', 'author: Jane');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with maintainer field', async () => {
      const req = makeDocRequest('docs/test.md', 'maintainer: Bob');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with responsible field', async () => {
      const req = makeDocRequest('docs/test.md', 'responsible: Alice');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-003'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail with no owner field', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-003'))!;
      expect(r.passed).toBe(false);
    });
    it('should set severity to Warning', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-003'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Warning);
    });
    it('should set enforcement to Advisory', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-003'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should include recommendation', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-003'))!;
      expect(r.violations[0].recommendation.length).toBeGreaterThan(0);
    });
    it('should include evidence about missing owner', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-003'))!;
      expect((r.violations[0].evidence as string[])[0]).toContain('owner');
    });
  });

  // ─── DOC-004: Document has references ─────────────────────────────

  describe('DOC-004: Document has references', () => {
    it('should pass with no content', async () => {
      const req = makeDocRequest('docs/test.md');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass with references field', async () => {
      const req = makeDocRequest('docs/test.md', 'references: [ADR-001]');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with refs field', async () => {
      const req = makeDocRequest('docs/test.md', 'refs: [x, y]');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with seeAlso field', async () => {
      const req = makeDocRequest('docs/test.md', 'seeAlso: [spec]');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with related field', async () => {
      const req = makeDocRequest('docs/test.md', 'related: [doc-1]');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with ADR- prefix', async () => {
      const req = makeDocRequest('docs/test.md', 'See ADR-005 for details');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with standalone ADR', async () => {
      const req = makeDocRequest('docs/test.md', 'This ADR covers...');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with refs keyword in text', async () => {
      const req = makeDocRequest('docs/test.md', 'See refs for more info');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail with no references', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.passed).toBe(false);
    });
    it('should set severity to Warning', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Warning);
    });
    it('should set enforcement to Advisory', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Advisory);
    });
    it('should include recommendation', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-004'))!;
      expect(r.violations[0].recommendation.length).toBeGreaterThan(0);
    });
  });

  // ─── DOC-005: Document has status ────────────────────────────────

  describe('DOC-005: Document has status', () => {
    it('should pass with no content', async () => {
      const req = makeDocRequest('docs/test.md');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-005'))!;
      expect(r.passed).toBe(true);
      expect(r.metadata.note).toBe('No content provided; skipping check');
    });
    it('should pass with status field', async () => {
      const req = makeDocRequest('docs/test.md', 'status: Active');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-005'))!;
      expect(r.passed).toBe(true);
    });
    it('should pass with JSON status', async () => {
      const req = makeDocRequest('docs/test.json', '{ "status": "Draft" }');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-005'))!;
      expect(r.passed).toBe(true);
    });
    it('should fail with no status', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-005'))!;
      expect(r.passed).toBe(false);
    });
    it('should set severity to Error', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-005'))!;
      expect(r.violations[0].severity).toBe(RuleSeverity.Error);
    });
    it('should set enforcement to Blocking', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-005'))!;
      expect(r.violations[0].enforcementLevel).toBe(EnforcementLevel.Blocking);
    });
    it('should include recommendation', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-005'))!;
      expect(r.violations[0].recommendation.length).toBeGreaterThan(0);
    });
    it('should include evidence about missing status', async () => {
      const req = makeDocRequest('docs/test.md', 'title: Hello');
      const r = (await validator.validate(req)).find(r => r.ruleId === brandRuleId('DOC-005'))!;
      expect((r.violations[0].evidence as string[])[0]).toContain('status');
    });
  });

  // ─── validateDocumentation typed method ───────────────────────────

  describe('validateDocumentation', () => {
    it('should return array of results', async () => {
      const results = await validator.validateDocumentation('docs/test.md', 'id: x; version: 1.0.0', brandComplianceSessionId('s1'));
      expect(Array.isArray(results)).toBe(true);
    });
    it('should return 5 results', async () => {
      const results = await validator.validateDocumentation('docs/test.md', 'id: x', brandComplianceSessionId('s1'));
      expect(results).toHaveLength(5);
    });
    it('should pass all rules for complete document', async () => {
      const c = 'id: DOC-001\nversion: 1.0.0\nowner: John\nreferences: [ADR-001]\nstatus: Active';
      const results = await validator.validateDocumentation('docs/test.md', c, brandComplianceSessionId('s1'));
      for (const r of results) expect(r.passed).toBe(true);
    });
    it('should all have Documentation category', async () => {
      const results = await validator.validateDocumentation('docs/test.md', 'id: x', brandComplianceSessionId('s1'));
      for (const r of results) expect(r.category).toBe(RuleCategory.Documentation);
    });
  });

  // ─── validate generic method ─────────────────────────────────────

  describe('validate', () => {
    it('should return array of results', async () => {
      const req = makeDocRequest('docs/test.md', 'id: x');
      const results = await validator.validate(req);
      expect(Array.isArray(results)).toBe(true);
    });
    it('should return empty for non-matching category', async () => {
      const req = Object.freeze({
        targetType: ValidationTargetType.Documentation,
        targetPath: 'docs/test.md',
        targetContent: 'id: x',
        categories: [RuleCategory.Architecture] as readonly RuleCategory[],
        sessionId: brandComplianceSessionId('s'),
        metadata: {},
      });
      const results = await validator.validate(req);
      expect(results).toHaveLength(0);
    });
    it('should filter by Documentation category', async () => {
      const req = makeDocRequest('docs/test.md', 'id: x');
      const results = await validator.validate(req);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cross-Validator Isolation
// ═══════════════════════════════════════════════════════════════════════════

describe('Cross-Validator Isolation', () => {
  it('ArchitectureValidator rules should not appear in Runtime results', async () => {
    const engine = await setupEngine();
    const archV = new ArchitectureValidator(engine);
    await archV.registerRules();
    const runtimeV = new RuntimeValidator(engine);
    await runtimeV.registerRules();

    const req = makeRuntimeRequest('src/runtime/engine.ts', 'getConstraintReport() { }');
    const results = await runtimeV.validate(req);
    for (const r of results) {
      expect(r.category).toBe(RuleCategory.Runtime);
    }
  });

  it('CapabilityValidator rules should not appear in Documentation results', async () => {
    const engine = await setupEngine();
    const capV = new CapabilityValidator(engine);
    await capV.registerRules();
    const docV = new DocumentationValidator(engine);
    await docV.registerRules();

    const req = makeDocRequest('docs/test.md', 'id: x');
    const results = await docV.validate(req);
    for (const r of results) {
      expect(r.category).toBe(RuleCategory.Documentation);
    }
  });

  it('all four validators can coexist on same engine', async () => {
    const engine = await setupEngine();
    const archV = new ArchitectureValidator(engine);
    const runV = new RuntimeValidator(engine);
    const capV = new CapabilityValidator(engine);
    const docV = new DocumentationValidator(engine);

    await archV.registerRules();
    await runV.registerRules();
    await capV.registerRules();
    await docV.registerRules();

    expect(await engine.count()).toBe(5 + 5 + 6 + 5);
  });

  it('each validator only evaluates its own category', async () => {
    const engine = await setupEngine();
    const archV = new ArchitectureValidator(engine);
    const runV = new RuntimeValidator(engine);
    await archV.registerRules();
    await runV.registerRules();

    const archReq = makeRequest('src/test.ts', 'const x = 1;');
    const archResults = await archV.validate(archReq);
    expect(archResults.length).toBe(5);

    const runReq = makeRuntimeRequest('src/runtime/engine.ts', 'const x = 1;');
    const runResults = await runV.validate(runReq);
    expect(runResults.length).toBe(5);
  });

  it('ArchitectureValidator validate returns fresh arrays on each call', async () => {
    const engine = await setupEngine();
    const v = new ArchitectureValidator(engine);
    await v.registerRules();
    const results1 = await v.validate(makeRequest('src/test.ts', 'const x = 1;'));
    const results2 = await v.validate(makeRequest('src/test.ts', 'const x = 1;'));
    expect(results1).not.toBe(results2);
    expect(results1.length).toBe(results2.length);
  });

  it('RuntimeValidator validate returns fresh arrays on each call', async () => {
    const engine = await setupEngine();
    const v = new RuntimeValidator(engine);
    await v.registerRules();
    const r1 = await v.validate(makeRuntimeRequest('src/test.ts', 'const x = 1;'));
    const r2 = await v.validate(makeRuntimeRequest('src/test.ts', 'const x = 1;'));
    expect(r1).not.toBe(r2);
  });

  it('CapabilityValidator validate returns fresh arrays on each call', async () => {
    const engine = await setupEngine();
    const v = new CapabilityValidator(engine);
    await v.registerRules();
    const r1 = await v.validate(makeCapRequest('caps/test.ts', 'const x = 1;'));
    const r2 = await v.validate(makeCapRequest('caps/test.ts', 'const x = 1;'));
    expect(r1).not.toBe(r2);
  });

  it('DocumentationValidator validate returns fresh arrays on each call', async () => {
    const engine = await setupEngine();
    const v = new DocumentationValidator(engine);
    await v.registerRules();
    const r1 = await v.validate(makeDocRequest('docs/test.md', 'id: x;'));
    const r2 = await v.validate(makeDocRequest('docs/test.md', 'id: x;'));
    expect(r1).not.toBe(r2);
  });

  it('empty string content passes no-content path for all validators', async () => {
    const engine = await setupEngine();
    const archV = new ArchitectureValidator(engine);
    const runV = new RuntimeValidator(engine);
    const capV = new CapabilityValidator(engine);
    const docV = new DocumentationValidator(engine);
    await archV.registerRules();
    await runV.registerRules();
    await capV.registerRules();
    await docV.registerRules();

    const archRes = await archV.validate(makeRequest('src/test.ts', ''));
    const runRes = await runV.validate(makeRuntimeRequest('src/test.ts', ''));
    const capRes = await capV.validate(makeCapRequest('caps/test.ts', ''));
    const docRes = await docV.validate(makeDocRequest('docs/test.md', ''));

    for (const r of archRes) expect(r.passed).toBe(true);
    for (const r of runRes) expect(r.passed).toBe(true);
    for (const r of capRes) expect(r.passed).toBe(true);
    for (const r of docRes) expect(r.passed).toBe(true);
  });

  it('all validators produce results with non-negative durationMs', async () => {
    const engine = await setupEngine();
    const archV = new ArchitectureValidator(engine);
    const runV = new RuntimeValidator(engine);
    const capV = new CapabilityValidator(engine);
    const docV = new DocumentationValidator(engine);
    await archV.registerRules();
    await runV.registerRules();
    await capV.registerRules();
    await docV.registerRules();

    const archRes = await archV.validate(makeRequest('src/test.ts', 'const x = 1;'));
    const runRes = await runV.validate(makeRuntimeRequest('src/test.ts', 'const x = 1;'));
    const capRes = await capV.validate(makeCapRequest('caps/test.ts', 'const x = 1;'));
    const docRes = await docV.validate(makeDocRequest('docs/test.md', 'id: x;'));

    for (const r of [...archRes, ...runRes, ...capRes, ...docRes]) {
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('all validators produce results with autoFixed=false', async () => {
    const engine = await setupEngine();
    const archV = new ArchitectureValidator(engine);
    const runV = new RuntimeValidator(engine);
    const capV = new CapabilityValidator(engine);
    const docV = new DocumentationValidator(engine);
    await archV.registerRules();
    await runV.registerRules();
    await capV.registerRules();
    await docV.registerRules();

    const archRes = await archV.validate(makeRequest('src/test.ts', 'const x = 1;'));
    const runRes = await runV.validate(makeRuntimeRequest('src/test.ts', 'const x = 1;'));
    const capRes = await capV.validate(makeCapRequest('caps/test.ts', 'const x = 1;'));
    const docRes = await docV.validate(makeDocRequest('docs/test.md', 'id: x;'));

    for (const r of [...archRes, ...runRes, ...capRes, ...docRes]) {
      expect(r.autoFixed).toBe(false);
    }
  });
});
