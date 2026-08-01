/**
 * Architecture Compliance & Governance Engine — Trace Validator
 * TASK-AIS-000Z.000
 *
 * Validates traceability: ADR-to-principles, code-to-ADR, test-to-contract.
 */

import type { RuleEngine } from './rule-engine.js';
import type { ITraceValidator } from './contracts.js';
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

interface TraceRuleDef {
  readonly ruleId: string;
  readonly name: string;
  readonly description: string;
  readonly severity: RuleSeverity;
  readonly enforcement: EnforcementLevel;
  readonly source: string;
  readonly check: (content: string, target: string) => ComplianceViolation[];
}

const TRACE_RULES: readonly TraceRuleDef[] = [
  {
    ruleId: 'TRACE-001',
    name: 'ADR references principles',
    description: 'Architecture Decision Records must reference governing principles',
    severity: RuleSeverity.Error,
    enforcement: EnforcementLevel.Blocking,
    source: 'GOV-008.000 §7',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const isADR = /ADR-\d+/.test(content) || /ADR[-_]/.test(target) || /adr/i.test(target);

      if (isADR) {
        const hasPrincipleRef = /\b(?:PHI-\d|principle|governance|GOV-\d)/i.test(content);
        if (!hasPrincipleRef) {
          violations.push(Object.freeze({
            id: brandViolationId('TRACE-001-v-1'),
            ruleId: brandRuleId('TRACE-001'),
            ruleName: 'ADR references principles',
            category: RuleCategory.Documentation,
            severity: RuleSeverity.Error,
            enforcementLevel: EnforcementLevel.Blocking,
            state: ViolationState.Detected,
            description: 'ADR does not reference any governing principles',
            evidence: ['No PHI-xxx, principle, or GOV-xxx references found'],
            recommendation: 'Add references to relevant governing principles (PHI-xxx) or governance policies (GOV-xxx)',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }
      }

      return violations;
    },
  },
  {
    ruleId: 'TRACE-002',
    name: 'Code references ADR',
    description: 'Implementation code should reference relevant ADRs',
    severity: RuleSeverity.Warning,
    enforcement: EnforcementLevel.Advisory,
    source: 'GOV-008.000 §7',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const isSourceCode = /\.ts$/.test(target);

      if (isSourceCode) {
        const hasADRRef = /ADR-\d+/.test(content);
        const hasComplexLogic = /(class |interface |function |async )/.test(content);

        if (hasComplexLogic && !hasADRRef) {
          violations.push(Object.freeze({
            id: brandViolationId('TRACE-002-v-1'),
            ruleId: brandRuleId('TRACE-002'),
            ruleName: 'Code references ADR',
            category: RuleCategory.Documentation,
            severity: RuleSeverity.Warning,
            enforcementLevel: EnforcementLevel.Advisory,
            state: ViolationState.Detected,
            description: 'Source code does not reference any ADRs',
            evidence: ['No ADR-xxx references found in source file'],
            recommendation: 'Add ADR references in comments for architectural decisions that affect this module',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }
      }

      return violations;
    },
  },
  {
    ruleId: 'TRACE-003',
    name: 'Test covers contract',
    description: 'Tests should verify contract compliance for their module',
    severity: RuleSeverity.Warning,
    enforcement: EnforcementLevel.Advisory,
    source: 'GOV-008.000 §7',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const isTest = /(?:\.test\.|\.spec\.|__tests__|test\/|tests\/)/.test(target) || /\.test\.ts$/.test(target);

      if (isTest) {
        const hasContractTest = /(?:contract|interface|implement|comply|govern)/i.test(content);
        const hasAssertions = /(?:expect|assert|should)/.test(content);

        if (hasAssertions && !hasContractTest) {
          violations.push(Object.freeze({
            id: brandViolationId('TRACE-003-v-1'),
            ruleId: brandRuleId('TRACE-003'),
            ruleName: 'Test covers contract',
            category: RuleCategory.Documentation,
            severity: RuleSeverity.Warning,
            enforcementLevel: EnforcementLevel.Advisory,
            state: ViolationState.Detected,
            description: 'Test file does not appear to cover contract compliance',
            evidence: ['Assertions found but no contract/interface/governance terms detected'],
            recommendation: 'Add tests that verify the module conforms to its declared contracts and interfaces',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }
      }

      return violations;
    },
  },
];

export class TraceValidator implements ITraceValidator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly category: RuleCategory;

  private readonly ruleEngine: RuleEngine;

  constructor(ruleEngine: RuleEngine) {
    this.id = brandValidatorId('trace-validator');
    this.name = 'TraceValidator';
    this.category = RuleCategory.Documentation;
    this.ruleEngine = ruleEngine;
  }

  async registerRules(): Promise<void> {
    for (const ruleDef of TRACE_RULES) {
      const rid = brandRuleId(ruleDef.ruleId);

      await this.ruleEngine.registerRule(Object.freeze({
        id: rid,
        name: ruleDef.name,
        description: ruleDef.description,
        category: RuleCategory.Documentation,
        severity: ruleDef.severity,
        enforcementLevel: ruleDef.enforcement,
        autoFix: AutoFixCapability.None,
        source: ruleDef.source,
        validatorId: this.id,
        enabled: true,
        tags: ['traceability', ruleDef.ruleId.toLowerCase()],
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
              ruleName: ruleDef.name,
              category: RuleCategory.Documentation,
              severity: ruleDef.severity,
              passed: true,
              violations: [],
              durationMs: Date.now() - startTime,
              autoFixed: false,
              metadata: { note: 'No content provided; skipping check' },
            });
          }

          const violations = ruleDef.check(content, target);

          return Object.freeze({
            ruleId: rid,
            ruleName: ruleDef.name,
            category: RuleCategory.Documentation,
            severity: ruleDef.severity,
            passed: violations.length === 0,
            violations,
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: {},
          });
        },
      );
    }
  }

  async validate(request: ValidationRequest): Promise<RuleEvaluationResult[]> {
    const result = await this.ruleEngine.evaluateRules(request);
    return Object.freeze([...result.results]) as RuleEvaluationResult[];
  }

  async validateTraceability(
    artifactPath: string,
    content: string,
    sessionId: ComplianceSessionId,
  ): Promise<RuleEvaluationResult[]> {
    const request: ValidationRequest = Object.freeze({
      targetType: ValidationTargetType.Documentation,
      targetPath: artifactPath,
      targetContent: content,
      categories: [RuleCategory.Documentation] as readonly RuleCategory[],
      sessionId,
      metadata: {},
    });
    const result = await this.ruleEngine.evaluateRules(request);
    return Object.freeze([...result.results]) as RuleEvaluationResult[];
  }
}
