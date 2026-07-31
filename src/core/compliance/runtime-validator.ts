/**
 * Architecture Compliance & Governance Engine — Runtime Validator
 * TASK-AIS-000Z.000
 *
 * Validates runtime conformance: governance contract, question answering.
 */

import type { RuleEngine } from './rule-engine.js';
import type { IRuntimeValidator } from './contracts.js';
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

const RUNTIME_GOVERNANCE_METHODS = [
  'getConstraintReport',
  'getValueMetrics',
  'askQuestion',
] as const;

// Runtime governance question definitions (used by questionRules below)

export class RuntimeValidator implements IRuntimeValidator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly category: RuleCategory;

  private readonly ruleEngine: RuleEngine;

  constructor(ruleEngine: RuleEngine) {
    this.id = brandValidatorId('runtime-validator');
    this.name = 'RuntimeValidator';
    this.category = RuleCategory.Runtime;
    this.ruleEngine = ruleEngine;
  }

  async registerRules(): Promise<void> {
    // RUN-001
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('RUN-001'),
      name: 'Runtime implements governance contract',
      description: 'Runtime must implement required governance methods (getConstraintReport, getValueMetrics, askQuestion)',
      category: RuleCategory.Runtime,
      severity: RuleSeverity.Critical,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'GOV-008.000 §5',
      validatorId: this.id,
      enabled: true,
      tags: ['runtime', 'governance', 'contract'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('RUN-001'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('RUN-001'),
            ruleName: 'Runtime implements governance contract',
            category: RuleCategory.Runtime,
            severity: RuleSeverity.Critical,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];

        for (const method of RUNTIME_GOVERNANCE_METHODS) {
          const hasMethod = content.includes(method + '(') || content.includes(method + ' (');

          if (!hasMethod) {
            violations.push(Object.freeze({
              id: brandViolationId(`RUN-001-v-${violations.length + 1}`),
              ruleId: brandRuleId('RUN-001'),
              ruleName: 'Runtime implements governance contract',
              category: RuleCategory.Runtime,
              severity: RuleSeverity.Critical,
              enforcementLevel: EnforcementLevel.Blocking,
              state: ViolationState.Detected,
              description: `Runtime does not implement required governance method: ${method}`,
              evidence: [`Method '${method}' not found in ${target}`],
              recommendation: `Implement the '${method}' method to satisfy the governance contract`,
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: { missingMethod: method },
            }));
          }
        }

        return Object.freeze({
          ruleId: brandRuleId('RUN-001'),
          ruleName: 'Runtime implements governance contract',
          category: RuleCategory.Runtime,
          severity: RuleSeverity.Critical,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { methodsChecked: RUNTIME_GOVERNANCE_METHODS.length },
        });
      },
    );

    // RUN-002 through RUN-005
    const questionRules: Array<{
      ruleId: string;
      name: string;
      desc: string;
      questionName: string;
      methodName: string;
      severity: RuleSeverity;
      enforcement: EnforcementLevel;
      source: string;
    }> = [
      {
        ruleId: 'RUN-002',
        name: 'Runtime answers Value question',
        desc: 'Runtime must be capable of answering the Value question',
        questionName: 'Value',
        methodName: 'getValueMetrics',
        severity: RuleSeverity.Error,
        enforcement: EnforcementLevel.Blocking,
        source: 'PHI-001.000 §3',
      },
      {
        ruleId: 'RUN-003',
        name: 'Runtime answers Constraint question',
        desc: 'Runtime must be capable of answering the Constraint question',
        questionName: 'Constraint',
        methodName: 'getConstraintReport',
        severity: RuleSeverity.Error,
        enforcement: EnforcementLevel.Blocking,
        source: 'PHI-001.000 §3',
      },
      {
        ruleId: 'RUN-004',
        name: 'Runtime answers Optimization question',
        desc: 'Runtime should be capable of answering the Optimization question',
        questionName: 'Optimization',
        methodName: 'getOptimizationSuggestions',
        severity: RuleSeverity.Warning,
        enforcement: EnforcementLevel.Advisory,
        source: 'PHI-001.000 §3',
      },
      {
        ruleId: 'RUN-005',
        name: 'Runtime answers Measurement question',
        desc: 'Runtime should be capable of answering the Measurement question',
        questionName: 'Measurement',
        methodName: 'getMeasurementData',
        severity: RuleSeverity.Warning,
        enforcement: EnforcementLevel.Advisory,
        source: 'PHI-001.000 §3',
      },
    ];

    for (const qRule of questionRules) {
      const rid = brandRuleId(qRule.ruleId);

      await this.ruleEngine.registerRule(Object.freeze({
        id: rid,
        name: qRule.name,
        description: qRule.desc,
        category: RuleCategory.Runtime,
        severity: qRule.severity,
        enforcementLevel: qRule.enforcement,
        autoFix: AutoFixCapability.None,
        source: qRule.source,
        validatorId: this.id,
        enabled: true,
        tags: ['runtime', 'questions', qRule.questionName.toLowerCase()],
        metadata: {},
      }));

      await this.ruleEngine.registerValidatorFunction(
        rid,
        async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
          const startTime = Date.now();
          const content = request.targetContent;
          const target = request.targetPath;

          if (!content) {
            return Object.freeze({
              ruleId: rid,
              ruleName: qRule.name,
              category: RuleCategory.Runtime,
              severity: qRule.severity,
              passed: true,
              violations: [],
              durationMs: Date.now() - startTime,
              autoFixed: false,
              metadata: { note: 'No content provided; skipping check' },
            });
          }

          const violations: ComplianceViolation[] = [];
          const hasMethod = content.includes(qRule.methodName + '(') || content.includes(qRule.methodName + ' (');

          if (!hasMethod) {
            violations.push(Object.freeze({
              id: brandViolationId(`${qRule.ruleId}-v-1`),
              ruleId: rid,
              ruleName: qRule.name,
              category: RuleCategory.Runtime,
              severity: qRule.severity,
              enforcementLevel: qRule.enforcement,
              state: ViolationState.Detected,
              description: `Runtime does not implement method for ${qRule.questionName} question: ${qRule.methodName}`,
              evidence: [`Method '${qRule.methodName}' not found in ${target}`],
              recommendation: `Implement '${qRule.methodName}' to support the ${qRule.questionName} question`,
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: { questionName: qRule.questionName },
            }));
          }

          return Object.freeze({
            ruleId: rid,
            ruleName: qRule.name,
            category: RuleCategory.Runtime,
            severity: qRule.severity,
            passed: violations.length === 0,
            violations,
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { questionName: qRule.questionName },
          });
        },
      );
    }
  }

  async validate(request: ValidationRequest): Promise<RuleEvaluationResult[]> {
    const result = await this.ruleEngine.evaluateRules(request);
    return [...result.results];
  }

  async validateRuntime(
    runtimePath: string,
    sessionId: ComplianceSessionId,
  ): Promise<RuleEvaluationResult[]> {
    const request: ValidationRequest = Object.freeze({
      targetType: ValidationTargetType.Runtime,
      targetPath: runtimePath,
      categories: [RuleCategory.Runtime] as readonly RuleCategory[],
      sessionId,
      metadata: {},
    });
    const result = await this.ruleEngine.evaluateRules(request);
    return [...result.results];
  }
}
