/**
 * Architecture Compliance & Governance Engine — Documentation Validator
 * TASK-AIS-000Z.000
 *
 * Validates documentation artifacts: ID, version, owner, references, status.
 */

import type { RuleEngine } from './rule-engine.js';
import type { IDocumentationValidator } from './contracts.js';
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

interface DocRuleDef {
  readonly ruleId: string;
  readonly name: string;
  readonly description: string;
  readonly severity: RuleSeverity;
  readonly enforcement: EnforcementLevel;
  readonly source: string;
  readonly check: (content: string, target: string) => ComplianceViolation[];
}

const DOC_RULES: readonly DocRuleDef[] = [
  {
    ruleId: 'DOC-001',
    name: 'Document has ID',
    description: 'Documentation must have a unique identifier',
    severity: RuleSeverity.Critical,
    enforcement: EnforcementLevel.Blocking,
    source: 'GOV-008.000 §4',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const hasIdField = /(?:"?id"?|"?docId"?|"?documentId"?)\s*[:=]/.test(content);

      if (!hasIdField) {
        violations.push(Object.freeze({
          id: brandViolationId('DOC-001-v-1'),
          ruleId: brandRuleId('DOC-001'),
          ruleName: 'Document has ID',
          category: RuleCategory.Documentation,
          severity: RuleSeverity.Critical,
          enforcementLevel: EnforcementLevel.Blocking,
          state: ViolationState.Detected,
          description: 'Document does not have a unique identifier field',
          evidence: ['No id, docId, or documentId field found'],
          recommendation: 'Add a unique document identifier (id field) to the document',
          autoFixAvailable: AutoFixCapability.None,
          target,
          detectedAt: new Date().toISOString(),
          resolvedAt: null,
          metadata: {},
        }));
      }

      return violations;
    },
  },
  {
    ruleId: 'DOC-002',
    name: 'Document has version',
    description: 'Documentation must have a version number',
    severity: RuleSeverity.Error,
    enforcement: EnforcementLevel.Blocking,
    source: 'GOV-008.000 §4',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const hasVersion = /(?:"?version"?)\s*[:=]\s*["']?\d+\.\d+/.test(content);

      if (!hasVersion) {
        violations.push(Object.freeze({
          id: brandViolationId('DOC-002-v-1'),
          ruleId: brandRuleId('DOC-002'),
          ruleName: 'Document has version',
          category: RuleCategory.Documentation,
          severity: RuleSeverity.Error,
          enforcementLevel: EnforcementLevel.Blocking,
          state: ViolationState.Detected,
          description: 'Document does not have a version number',
          evidence: ['No version field with semver format found'],
          recommendation: 'Add a version field following semantic versioning (e.g. "1.0.0")',
          autoFixAvailable: AutoFixCapability.None,
          target,
          detectedAt: new Date().toISOString(),
          resolvedAt: null,
          metadata: {},
        }));
      }

      return violations;
    },
  },
  {
    ruleId: 'DOC-003',
    name: 'Document has owner',
    description: 'Documentation should identify its owner',
    severity: RuleSeverity.Warning,
    enforcement: EnforcementLevel.Advisory,
    source: 'GOV-008.000 §4',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const hasOwner = /(?:"?owner"?|"?author"?|"?maintainer"?|"?responsible"?)\s*[:=]/.test(content);

      if (!hasOwner) {
        violations.push(Object.freeze({
          id: brandViolationId('DOC-003-v-1'),
          ruleId: brandRuleId('DOC-003'),
          ruleName: 'Document has owner',
          category: RuleCategory.Documentation,
          severity: RuleSeverity.Warning,
          enforcementLevel: EnforcementLevel.Advisory,
          state: ViolationState.Detected,
          description: 'Document does not identify an owner or author',
          evidence: ['No owner, author, maintainer, or responsible field found'],
          recommendation: 'Add an owner or author field to the document metadata',
          autoFixAvailable: AutoFixCapability.None,
          target,
          detectedAt: new Date().toISOString(),
          resolvedAt: null,
          metadata: {},
        }));
      }

      return violations;
    },
  },
  {
    ruleId: 'DOC-004',
    name: 'Document has references',
    description: 'Documentation should reference related artifacts (ADRs, specs, etc.)',
    severity: RuleSeverity.Warning,
    enforcement: EnforcementLevel.Advisory,
    source: 'GOV-008.000 §4',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const hasReferences = /(?:"?references"?|"?refs"?|"?seeAlso"?|"?related"?|ADR-|\bADR\b|\bref[s]?\b)/i.test(content);

      if (!hasReferences) {
        violations.push(Object.freeze({
          id: brandViolationId('DOC-004-v-1'),
          ruleId: brandRuleId('DOC-004'),
          ruleName: 'Document has references',
          category: RuleCategory.Documentation,
          severity: RuleSeverity.Warning,
          enforcementLevel: EnforcementLevel.Advisory,
          state: ViolationState.Detected,
          description: 'Document does not reference related artifacts',
          evidence: ['No references, refs, seeAlso, or ADR links found'],
          recommendation: 'Add a references section linking to related ADRs, specs, or documents',
          autoFixAvailable: AutoFixCapability.None,
          target,
          detectedAt: new Date().toISOString(),
          resolvedAt: null,
          metadata: {},
        }));
      }

      return violations;
    },
  },
  {
    ruleId: 'DOC-005',
    name: 'Document has status',
    description: 'Documentation must declare its status',
    severity: RuleSeverity.Error,
    enforcement: EnforcementLevel.Blocking,
    source: 'GOV-008.000 §4',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const hasStatus = /(?:"?status"?)\s*[:=]/.test(content);

      if (!hasStatus) {
        violations.push(Object.freeze({
          id: brandViolationId('DOC-005-v-1'),
          ruleId: brandRuleId('DOC-005'),
          ruleName: 'Document has status',
          category: RuleCategory.Documentation,
          severity: RuleSeverity.Error,
          enforcementLevel: EnforcementLevel.Blocking,
          state: ViolationState.Detected,
          description: 'Document does not declare a status',
          evidence: ['No status field found'],
          recommendation: 'Add a status field (e.g. Draft, Active, Deprecated, Superseded)',
          autoFixAvailable: AutoFixCapability.None,
          target,
          detectedAt: new Date().toISOString(),
          resolvedAt: null,
          metadata: {},
        }));
      }

      return violations;
    },
  },
];

export class DocumentationValidator implements IDocumentationValidator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly category: RuleCategory;

  private readonly ruleEngine: RuleEngine;

  constructor(ruleEngine: RuleEngine) {
    this.id = brandValidatorId('documentation-validator');
    this.name = 'DocumentationValidator';
    this.category = RuleCategory.Documentation;
    this.ruleEngine = ruleEngine;
  }

  async registerRules(): Promise<void> {
    for (const ruleDef of DOC_RULES) {
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
        tags: ['documentation', ruleDef.ruleId.toLowerCase()],
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
    return [...result.results];
  }

  async validateDocumentation(
    docPath: string,
    content: string,
    sessionId: ComplianceSessionId,
  ): Promise<RuleEvaluationResult[]> {
    const request: ValidationRequest = Object.freeze({
      targetType: ValidationTargetType.Documentation,
      targetPath: docPath,
      targetContent: content,
      categories: [RuleCategory.Documentation] as readonly RuleCategory[],
      sessionId,
      metadata: {},
    });
    const result = await this.ruleEngine.evaluateRules(request);
    return [...result.results];
  }
}
