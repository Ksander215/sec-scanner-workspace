/**
 * Architecture Compliance & Governance Engine — Constraint Validator
 * TASK-AIS-000Z.000
 *
 * Validates constraint compliance: getConstraintReport exposed,
 * constraints identified with evidence, Unknown returned when uncertain.
 */

import type { RuleEngine } from './rule-engine.js';
import type { IConstraintValidator } from './contracts.js';
import type {
  ValidatorId,
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

export class ConstraintValidator implements IConstraintValidator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly category: RuleCategory;

  private readonly ruleEngine: RuleEngine;

  constructor(ruleEngine: RuleEngine) {
    this.id = brandValidatorId('constraint-validator');
    this.name = 'ConstraintValidator';
    this.category = RuleCategory.Runtime;
    this.ruleEngine = ruleEngine;
  }

  async registerRules(): Promise<void> {
    // CONSTR-001
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('CONSTR-001'),
      name: 'Runtime exposes getConstraintReport',
      description: 'Runtime must expose a getConstraintReport method',
      category: RuleCategory.Governance,
      severity: RuleSeverity.Error,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'PHI-001.000 §4',
      validatorId: this.id,
      enabled: true,
      tags: ['constraint', 'runtime', 'report'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('CONSTR-001'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('CONSTR-001'),
            ruleName: 'Runtime exposes getConstraintReport',
            category: RuleCategory.Governance,
            severity: RuleSeverity.Error,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const hasMethod = content.includes('getConstraintReport(') || content.includes('getConstraintReport (');

        if (!hasMethod) {
          violations.push(Object.freeze({
            id: brandViolationId('CONSTR-001-v-1'),
            ruleId: brandRuleId('CONSTR-001'),
            ruleName: 'Runtime exposes getConstraintReport',
            category: RuleCategory.Governance,
            severity: RuleSeverity.Error,
            enforcementLevel: EnforcementLevel.Blocking,
            state: ViolationState.Detected,
            description: 'Runtime does not expose getConstraintReport method',
            evidence: ['Method getConstraintReport not found'],
            recommendation: 'Implement getConstraintReport() to expose constraint information',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }

        return Object.freeze({
          ruleId: brandRuleId('CONSTR-001'),
          ruleName: 'Runtime exposes getConstraintReport',
          category: RuleCategory.Governance,
          severity: RuleSeverity.Error,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { hasMethod },
        });
      },
    );

    // CONSTR-002
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('CONSTR-002'),
      name: 'Constraint identified with evidence',
      description: 'Constraints should be identified with supporting evidence',
      category: RuleCategory.Governance,
      severity: RuleSeverity.Warning,
      enforcementLevel: EnforcementLevel.Advisory,
      autoFix: AutoFixCapability.None,
      source: 'GOV-008.000 §5',
      validatorId: this.id,
      enabled: true,
      tags: ['constraint', 'evidence', 'governance'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('CONSTR-002'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('CONSTR-002'),
            ruleName: 'Constraint identified with evidence',
            category: RuleCategory.Governance,
            severity: RuleSeverity.Warning,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const hasConstraintObj = /(?:constraint|Constraint)\s*[=:{]/.test(content);
        const hasEvidence = /(?:evidence|Evidence|reason|Reason|source|Source|justification)/.test(content);

        if (hasConstraintObj && !hasEvidence) {
          violations.push(Object.freeze({
            id: brandViolationId('CONSTR-002-v-1'),
            ruleId: brandRuleId('CONSTR-002'),
            ruleName: 'Constraint identified with evidence',
            category: RuleCategory.Governance,
            severity: RuleSeverity.Warning,
            enforcementLevel: EnforcementLevel.Advisory,
            state: ViolationState.Detected,
            description: 'Constraint declarations lack supporting evidence',
            evidence: ['Constraint objects found', 'No evidence/reason/source fields detected alongside constraints'],
            recommendation: 'Add evidence, reason, or source fields to constraint declarations',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }

        return Object.freeze({
          ruleId: brandRuleId('CONSTR-002'),
          ruleName: 'Constraint identified with evidence',
          category: RuleCategory.Governance,
          severity: RuleSeverity.Warning,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { hasConstraintObj, hasEvidence },
        });
      },
    );

    // CONSTR-003
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('CONSTR-003'),
      name: 'Unknown returned when uncertain',
      description: 'When constraint status is uncertain, should return Unknown rather than guessing',
      category: RuleCategory.Governance,
      severity: RuleSeverity.Info,
      enforcementLevel: EnforcementLevel.Advisory,
      autoFix: AutoFixCapability.None,
      source: 'GOV-008.000 §5',
      validatorId: this.id,
      enabled: true,
      tags: ['constraint', 'unknown', 'uncertainty'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('CONSTR-003'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('CONSTR-003'),
            ruleName: 'Unknown returned when uncertain',
            category: RuleCategory.Governance,
            severity: RuleSeverity.Info,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const hasConstraintLogic = /(?:constraint|Constraint)/.test(content);
        const hasUnknown = /Unknown/.test(content);
        const hasFallbackTrue = /(?:catch|otherwise)\s*[\{:][^]*?(?:true|passed|satisfied)/.test(content);

        if (hasConstraintLogic && !hasUnknown && hasFallbackTrue) {
          violations.push(Object.freeze({
            id: brandViolationId('CONSTR-003-v-1'),
            ruleId: brandRuleId('CONSTR-003'),
            ruleName: 'Unknown returned when uncertain',
            category: RuleCategory.Governance,
            severity: RuleSeverity.Info,
            enforcementLevel: EnforcementLevel.Advisory,
            state: ViolationState.Detected,
            description: 'Constraint logic may default to true/positive without handling uncertainty',
            evidence: ['Constraint logic found', 'No Unknown enum/value detected', 'Fallback to true/passed detected'],
            recommendation: 'Return Unknown when constraint status cannot be determined, per GOV-008.000 §5',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }

        return Object.freeze({
          ruleId: brandRuleId('CONSTR-003'),
          ruleName: 'Unknown returned when uncertain',
          category: RuleCategory.Governance,
          severity: RuleSeverity.Info,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { hasUnknown, hasFallbackTrue },
        });
      },
    );
  }

  async validate(request: ValidationRequest): Promise<RuleEvaluationResult[]> {
    const result = await this.ruleEngine.evaluateRules(request);
    return Object.freeze([...result.results]) as RuleEvaluationResult[];
  }

  async validateConstraintCompliance(
    runtimePath: string,
    sessionId: ComplianceSessionId,
  ): Promise<RuleEvaluationResult[]> {
    const request: ValidationRequest = Object.freeze({
      targetType: ValidationTargetType.Runtime,
      targetPath: runtimePath,
      categories: [RuleCategory.Runtime, RuleCategory.Governance] as readonly RuleCategory[],
      sessionId,
      metadata: {},
    });
    const result = await this.ruleEngine.evaluateRules(request);
    return Object.freeze([...result.results]) as RuleEvaluationResult[];
  }
}
