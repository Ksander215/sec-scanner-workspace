/**
 * Architecture Compliance & Governance Engine — Value Validator
 * TASK-AIS-000Z.000
 *
 * Validates value dimension compliance: value dimensions declared,
 * getValueMetrics exposed, no engagement-as-value patterns.
 */

import type { RuleEngine } from './rule-engine.js';
import type { IValueValidator } from './contracts.js';
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

export class ValueValidator implements IValueValidator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly category: RuleCategory;

  private readonly ruleEngine: RuleEngine;

  constructor(ruleEngine: RuleEngine) {
    this.id = brandValidatorId('value-validator');
    this.name = 'ValueValidator';
    this.category = RuleCategory.Runtime;
    this.ruleEngine = ruleEngine;
  }

  async registerRules(): Promise<void> {
    // VAL-001
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('VAL-001'),
      name: 'Runtime declares value dimensions',
      description: 'Runtime must declare which value dimensions it supports',
      category: RuleCategory.Philosophy,
      severity: RuleSeverity.Error,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'PHI-001.000 §3',
      validatorId: this.id,
      enabled: true,
      tags: ['value', 'dimensions', 'runtime'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('VAL-001'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('VAL-001'),
            ruleName: 'Runtime declares value dimensions',
            category: RuleCategory.Philosophy,
            severity: RuleSeverity.Error,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const hasDimensions = /(?:valueDimension|value_dimensions|ValueDimension)/.test(content);

        if (!hasDimensions) {
          violations.push(Object.freeze({
            id: brandViolationId('VAL-001-v-1'),
            ruleId: brandRuleId('VAL-001'),
            ruleName: 'Runtime declares value dimensions',
            category: RuleCategory.Philosophy,
            severity: RuleSeverity.Error,
            enforcementLevel: EnforcementLevel.Blocking,
            state: ViolationState.Detected,
            description: 'Runtime does not declare value dimensions',
            evidence: ['No valueDimension, value_dimensions, or ValueDimension found'],
            recommendation: 'Declare value dimensions supported by this runtime (e.g. valueDimensions array or enum)',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }

        return Object.freeze({
          ruleId: brandRuleId('VAL-001'),
          ruleName: 'Runtime declares value dimensions',
          category: RuleCategory.Philosophy,
          severity: RuleSeverity.Error,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { hasDimensions },
        });
      },
    );

    // VAL-002
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('VAL-002'),
      name: 'Runtime exposes getValueMetrics',
      description: 'Runtime must expose a getValueMetrics method',
      category: RuleCategory.Philosophy,
      severity: RuleSeverity.Critical,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'PHI-001.000 §3',
      validatorId: this.id,
      enabled: true,
      tags: ['value', 'metrics', 'runtime'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('VAL-002'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('VAL-002'),
            ruleName: 'Runtime exposes getValueMetrics',
            category: RuleCategory.Philosophy,
            severity: RuleSeverity.Critical,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const hasMethod = content.includes('getValueMetrics(') || content.includes('getValueMetrics (');

        if (!hasMethod) {
          violations.push(Object.freeze({
            id: brandViolationId('VAL-002-v-1'),
            ruleId: brandRuleId('VAL-002'),
            ruleName: 'Runtime exposes getValueMetrics',
            category: RuleCategory.Philosophy,
            severity: RuleSeverity.Critical,
            enforcementLevel: EnforcementLevel.Blocking,
            state: ViolationState.Detected,
            description: 'Runtime does not expose getValueMetrics method',
            evidence: ['Method getValueMetrics not found'],
            recommendation: 'Implement getValueMetrics() to expose value dimension metrics',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }

        return Object.freeze({
          ruleId: brandRuleId('VAL-002'),
          ruleName: 'Runtime exposes getValueMetrics',
          category: RuleCategory.Philosophy,
          severity: RuleSeverity.Critical,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { hasMethod },
        });
      },
    );

    // VAL-003
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('VAL-003'),
      name: 'No engagement-as-value patterns',
      description: 'Code should not treat user engagement as a value dimension',
      category: RuleCategory.Philosophy,
      severity: RuleSeverity.Warning,
      enforcementLevel: EnforcementLevel.Advisory,
      autoFix: AutoFixCapability.None,
      source: 'PHI-001.000 §1',
      validatorId: this.id,
      enabled: true,
      tags: ['value', 'philosophy', 'engagement'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('VAL-003'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('VAL-003'),
            ruleName: 'No engagement-as-value patterns',
            category: RuleCategory.Philosophy,
            severity: RuleSeverity.Warning,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const engagementPatterns = [
          { pattern: /engagement(?:Rate|Score|Metric|Count)/i, label: 'engagement rate/score/metric/count' },
          { pattern: /(?:maximize|increase|boost|drive)\s+engagement/i, label: 'maximize/increase/boost/drive engagement' },
          { pattern: /(?:user engagement as value|engagement.value)/i, label: 'engagement treated as value' },
          { pattern: /time_on_site|timeOnSite|session_duration|sessionDuration/i, label: 'session duration as value proxy' },
        ];

        for (const ep of engagementPatterns) {
          const m = ep.pattern.exec(content);
          if (m) {
            violations.push(Object.freeze({
              id: brandViolationId(`VAL-003-v-${violations.length + 1}`),
              ruleId: brandRuleId('VAL-003'),
              ruleName: 'No engagement-as-value patterns',
              category: RuleCategory.Philosophy,
              severity: RuleSeverity.Warning,
              enforcementLevel: EnforcementLevel.Advisory,
              state: ViolationState.Detected,
              description: `Engagement-as-value pattern detected: ${ep.label}`,
              evidence: [`Match: ${m[0]}`],
              recommendation: 'Replace engagement metrics with genuine value dimensions per PHI-001.000 §1',
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: { pattern: ep.label },
            }));
          }
        }

        return Object.freeze({
          ruleId: brandRuleId('VAL-003'),
          ruleName: 'No engagement-as-value patterns',
          category: RuleCategory.Philosophy,
          severity: RuleSeverity.Warning,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { patternsChecked: engagementPatterns.length },
        });
      },
    );
  }

  async validate(request: ValidationRequest): Promise<RuleEvaluationResult[]> {
    const result = await this.ruleEngine.evaluateRules(request);
    return Object.freeze([...result.results]) as RuleEvaluationResult[];
  }

  async validateValueCompliance(
    runtimePath: string,
    sessionId: ComplianceSessionId,
  ): Promise<RuleEvaluationResult[]> {
    const request: ValidationRequest = Object.freeze({
      targetType: ValidationTargetType.Runtime,
      targetPath: runtimePath,
      categories: [RuleCategory.Runtime, RuleCategory.Philosophy] as readonly RuleCategory[],
      sessionId,
      metadata: {},
    });
    const result = await this.ruleEngine.evaluateRules(request);
    return Object.freeze([...result.results]) as RuleEvaluationResult[];
  }
}
