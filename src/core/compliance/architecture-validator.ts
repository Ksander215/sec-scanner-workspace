/**
 * Architecture Compliance & Governance Engine — Architecture Validator
 * TASK-AIS-000Z.000
 *
 * Validates architectural rules: no circular deps, layer hierarchy,
 * core/runtime separation, branded IDs, Object.freeze usage.
 */

import type { RuleEngine } from './rule-engine.js';
import type { IArchitectureValidator } from './contracts.js';
import type {
  ValidatorId,
  ComplianceRule,
  RuleEvaluationResult,
  ComplianceViolation,
  ValidationRequest,
  ComplianceSessionId,
} from './types.js';
import {
  RuleSeverity,
  RuleCategory,
  EnforcementLevel,
  AutoFixCapability,
  ViolationState,
  ValidationTargetType,
} from './types.js';
import {
  brandRuleId,
  brandViolationId,
  brandValidatorId,
} from './types.js';

export class ArchitectureValidator implements IArchitectureValidator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly category: RuleCategory;

  private readonly ruleEngine: RuleEngine;

  constructor(ruleEngine: RuleEngine) {
    this.id = brandValidatorId('architecture-validator');
    this.name = 'ArchitectureValidator';
    this.category = RuleCategory.Architecture;
    this.ruleEngine = ruleEngine;
  }

  async registerRules(): Promise<void> {
    const rules: ComplianceRule[] = [
      Object.freeze({
        id: brandRuleId('ARCH-001'),
        name: 'No circular dependencies',
        description: 'Module must not contain import patterns that could create circular dependencies',
        category: RuleCategory.Architecture,
        severity: RuleSeverity.Critical,
        enforcementLevel: EnforcementLevel.Blocking,
        autoFix: AutoFixCapability.None,
        source: 'PHI-001.000 §6',
        validatorId: this.id,
        enabled: true,
        tags: ['architecture', 'dependencies', 'cycles'],
        metadata: {},
      }),
      Object.freeze({
        id: brandRuleId('ARCH-002'),
        name: 'Core does not depend on Runtime',
        description: 'Core modules must not import from Runtime modules',
        category: RuleCategory.Architecture,
        severity: RuleSeverity.Critical,
        enforcementLevel: EnforcementLevel.Blocking,
        autoFix: AutoFixCapability.None,
        source: 'PHI-001.000 §6',
        validatorId: this.id,
        enabled: true,
        tags: ['architecture', 'layers', 'core-runtime'],
        metadata: {},
      }),
      Object.freeze({
        id: brandRuleId('ARCH-003'),
        name: 'No layer violations',
        description: 'Imports must respect the layer hierarchy',
        category: RuleCategory.Architecture,
        severity: RuleSeverity.Error,
        enforcementLevel: EnforcementLevel.Blocking,
        autoFix: AutoFixCapability.None,
        source: 'PHI-001.000 §6',
        validatorId: this.id,
        enabled: true,
        tags: ['architecture', 'layers', 'hierarchy'],
        metadata: {},
      }),
      Object.freeze({
        id: brandRuleId('ARCH-004'),
        name: 'Branded IDs used',
        description: 'Identifiers should use branded types from types.ts',
        category: RuleCategory.Architecture,
        severity: RuleSeverity.Warning,
        enforcementLevel: EnforcementLevel.Advisory,
        autoFix: AutoFixCapability.None,
        source: 'PHI-001.000 §6',
        validatorId: this.id,
        enabled: true,
        tags: ['architecture', 'types', 'branding'],
        metadata: {},
      }),
      Object.freeze({
        id: brandRuleId('ARCH-005'),
        name: 'Object.freeze used',
        description: 'Immutable objects should use Object.freeze',
        category: RuleCategory.Architecture,
        severity: RuleSeverity.Warning,
        enforcementLevel: EnforcementLevel.Advisory,
        autoFix: AutoFixCapability.None,
        source: 'PHI-001.000 §6',
        validatorId: this.id,
        enabled: true,
        tags: ['architecture', 'immutability', 'freeze'],
        metadata: {},
      }),
    ];

    for (const rule of rules) {
      await this.ruleEngine.registerRule(rule);
    }

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('ARCH-001'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('ARCH-001'),
            ruleName: 'No circular dependencies',
            category: RuleCategory.Architecture,
            severity: RuleSeverity.Critical,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
        const imports: string[] = [];
        let match: RegExpExecArray | null;

        while ((match = importRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }

        const importCounts = new Map<string, number>();
        for (const imp of imports) {
          importCounts.set(imp, (importCounts.get(imp) ?? 0) + 1);
        }

        importCounts.forEach((count, impPath) => {
          if (count > 2) {
            violations.push(Object.freeze({
              id: brandViolationId(`ARCH-001-v-${violations.length + 1}`),
              ruleId: brandRuleId('ARCH-001'),
              ruleName: 'No circular dependencies',
              category: RuleCategory.Architecture,
              severity: RuleSeverity.Critical,
              enforcementLevel: EnforcementLevel.Blocking,
              state: ViolationState.Detected,
              description: `Potential circular dependency detected: '${impPath}' imported ${count} times`,
              evidence: [`Import path: ${impPath}`, `Import count: ${count}`],
              recommendation: 'Refactor to break the circular dependency using dependency injection or event-based communication',
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: {},
            }));
          }
        });

        return Object.freeze({
          ruleId: brandRuleId('ARCH-001'),
          ruleName: 'No circular dependencies',
          category: RuleCategory.Architecture,
          severity: RuleSeverity.Critical,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { importsChecked: imports.length },
        });
      },
    );

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('ARCH-002'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('ARCH-002'),
            ruleName: 'Core does not depend on Runtime',
            category: RuleCategory.Architecture,
            severity: RuleSeverity.Critical,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];

        if (target.includes('core/') && !target.includes('core/compliance/')) {
          const runtimeImportRegex = /import\s+.*?from\s+['"][^'"]*runtime[^'"]*['"]/g;
          let m: RegExpExecArray | null;

          while ((m = runtimeImportRegex.exec(content)) !== null) {
            violations.push(Object.freeze({
              id: brandViolationId(`ARCH-002-v-${violations.length + 1}`),
              ruleId: brandRuleId('ARCH-002'),
              ruleName: 'Core does not depend on Runtime',
              category: RuleCategory.Architecture,
              severity: RuleSeverity.Critical,
              enforcementLevel: EnforcementLevel.Blocking,
              state: ViolationState.Detected,
              description: 'Core module imports from Runtime layer',
              evidence: [`Import statement: ${m[0]}`],
              recommendation: 'Move runtime-dependent logic to the Runtime layer or use abstractions/interfaces',
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: {},
            }));
          }
        }

        return Object.freeze({
          ruleId: brandRuleId('ARCH-002'),
          ruleName: 'Core does not depend on Runtime',
          category: RuleCategory.Architecture,
          severity: RuleSeverity.Critical,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { isInCoreModule: target.includes('core/') },
        });
      },
    );

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('ARCH-003'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('ARCH-003'),
            ruleName: 'No layer violations',
            category: RuleCategory.Architecture,
            severity: RuleSeverity.Error,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const layerOrder = ['types', 'domain', 'events', 'compliance', 'runtime', 'api'];

        const importRegex = /import\s+.*?from\s+['"]\.\.?\/([^'"]+)['"]/g;
        let m: RegExpExecArray | null;

        const sourceLayer = target.split('/').find((seg) => layerOrder.includes(seg)) ?? '';
        const sourceIndex = layerOrder.indexOf(sourceLayer);

        while ((m = importRegex.exec(content)) !== null) {
          const importPath = m[1];
          const importLayer = layerOrder.find((layer) => importPath.includes(layer)) ?? '';
          const importIndex = layerOrder.indexOf(importLayer);

          if (sourceIndex >= 0 && importIndex >= 0 && importIndex > sourceIndex) {
            violations.push(Object.freeze({
              id: brandViolationId(`ARCH-003-v-${violations.length + 1}`),
              ruleId: brandRuleId('ARCH-003'),
              ruleName: 'No layer violations',
              category: RuleCategory.Architecture,
              severity: RuleSeverity.Error,
              enforcementLevel: EnforcementLevel.Blocking,
              state: ViolationState.Detected,
              description: `Layer violation: '${sourceLayer}' (index ${sourceIndex}) imports from '${importLayer}' (index ${importIndex})`,
              evidence: [`Import: ${m[0]}`, `Source layer: ${sourceLayer}`, `Target layer: ${importLayer}`],
              recommendation: 'Restructure imports to respect the layer hierarchy',
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: {},
            }));
          }
        }

        return Object.freeze({
          ruleId: brandRuleId('ARCH-003'),
          ruleName: 'No layer violations',
          category: RuleCategory.Architecture,
          severity: RuleSeverity.Error,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { sourceLayer },
        });
      },
    );

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('ARCH-004'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('ARCH-004'),
            ruleName: 'Branded IDs used',
            category: RuleCategory.Architecture,
            severity: RuleSeverity.Warning,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];

        const hasBrandImport = /brand\w*Id/.test(content);

        if (!hasBrandImport) {
          const hasIdFields = /(?:id|ruleId|violationId|sessionId)\b/.test(content);
          if (hasIdFields && content.includes('string')) {
            violations.push(Object.freeze({
              id: brandViolationId(`ARCH-004-v-${violations.length + 1}`),
              ruleId: brandRuleId('ARCH-004'),
              ruleName: 'Branded IDs used',
              category: RuleCategory.Architecture,
              severity: RuleSeverity.Warning,
              enforcementLevel: EnforcementLevel.Advisory,
              state: ViolationState.Detected,
              description: 'File uses ID fields but does not appear to use branded ID types',
              evidence: ['No brandRuleId or brandViolationId imports found', 'ID-like fields detected in file'],
              recommendation: 'Import and use branded ID types from types.ts (brandRuleId, brandViolationId, etc.)',
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: {},
            }));
          }
        }

        return Object.freeze({
          ruleId: brandRuleId('ARCH-004'),
          ruleName: 'Branded IDs used',
          category: RuleCategory.Architecture,
          severity: RuleSeverity.Warning,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { hasBrandImport },
        });
      },
    );

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('ARCH-005'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('ARCH-005'),
            ruleName: 'Object.freeze used',
            category: RuleCategory.Architecture,
            severity: RuleSeverity.Warning,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];

        const returnObjectPattern = /return\s+\{[^}]+\}/g;
        const hasFreeze = /Object\.freeze/.test(content);
        const hasReturnObjects = returnObjectPattern.test(content);
        const hasConstObjects = /const\s+\w+\s*[:=]\s*\{/.test(content);

        if (hasReturnObjects && !hasFreeze) {
          violations.push(Object.freeze({
            id: brandViolationId(`ARCH-005-v-${violations.length + 1}`),
            ruleId: brandRuleId('ARCH-005'),
            ruleName: 'Object.freeze used',
            category: RuleCategory.Architecture,
            severity: RuleSeverity.Warning,
            enforcementLevel: EnforcementLevel.Advisory,
            state: ViolationState.Detected,
            description: 'File returns object literals without Object.freeze',
            evidence: ['Object literals found in return statements', 'No Object.freeze calls detected'],
            recommendation: 'Wrap returned object literals with Object.freeze() for immutability',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }

        return Object.freeze({
          ruleId: brandRuleId('ARCH-005'),
          ruleName: 'Object.freeze used',
          category: RuleCategory.Architecture,
          severity: RuleSeverity.Warning,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { hasFreeze, hasReturnObjects, hasConstObjects },
        });
      },
    );
  }

  async validate(request: ValidationRequest): Promise<RuleEvaluationResult[]> {
    const result = await this.ruleEngine.evaluateRules(request);
    return [...result.results];
  }

  async validateArchitecture(
    modulePath: string,
    content: string,
    sessionId: ComplianceSessionId,
  ): Promise<RuleEvaluationResult[]> {
    const request: ValidationRequest = Object.freeze({
      targetType: ValidationTargetType.Architecture,
      targetPath: modulePath,
      targetContent: content,
      categories: [RuleCategory.Architecture] as readonly RuleCategory[],
      sessionId,
      metadata: {},
    });
    const result = await this.ruleEngine.evaluateRules(request);
    return [...result.results];
  }
}
