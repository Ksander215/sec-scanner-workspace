/**
 * Architecture Compliance & Governance Engine — Capability Validator
 * TASK-AIS-000Z.000
 *
 * Validates capability packs: manifest, permissions, policies,
 * dependencies, contracts, sandbox isolation.
 */

import type { RuleEngine } from './rule-engine.js';
import type { ICapabilityValidator } from './contracts.js';
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

interface CapabilityRuleDef {
  readonly ruleId: string;
  readonly name: string;
  readonly description: string;
  readonly severity: RuleSeverity;
  readonly enforcement: EnforcementLevel;
  readonly source: string;
  readonly check: (content: string, target: string) => ComplianceViolation[];
}

const CAPABILITY_RULES: readonly CapabilityRuleDef[] = [
  {
    ruleId: 'CAP-001',
    name: 'Manifest present',
    description: 'Capability pack must contain a manifest with metadata',
    severity: RuleSeverity.Critical,
    enforcement: EnforcementLevel.Blocking,
    source: 'CON-001.000 §2',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const hasManifest = content.includes('manifest') || content.includes('Manifest');
      const hasName = /(?:name|\"name\"|'name')\s*[:=]/.test(content);
      const hasVersion = /(?:version|\"version\"|'version')\s*[:=]/.test(content);

      if (!hasManifest) {
        violations.push(Object.freeze({
          id: brandViolationId('CAP-001-v-1'),
          ruleId: brandRuleId('CAP-001'),
          ruleName: 'Manifest present',
          category: RuleCategory.CapabilityPack,
          severity: RuleSeverity.Critical,
          enforcementLevel: EnforcementLevel.Blocking,
          state: ViolationState.Detected,
          description: 'Capability pack does not contain a manifest',
          evidence: ['No manifest declaration found'],
          recommendation: 'Add a manifest object with name, version, and description fields',
          autoFixAvailable: AutoFixCapability.None,
          target,
          detectedAt: new Date().toISOString(),
          resolvedAt: null,
          metadata: {},
        }));
      } else if (!hasName || !hasVersion) {
        violations.push(Object.freeze({
          id: brandViolationId('CAP-001-v-2'),
          ruleId: brandRuleId('CAP-001'),
          ruleName: 'Manifest present',
          category: RuleCategory.CapabilityPack,
          severity: RuleSeverity.Critical,
          enforcementLevel: EnforcementLevel.Blocking,
          state: ViolationState.Detected,
          description: 'Manifest is missing required fields (name or version)',
          evidence: [`hasName: ${hasName}`, `hasVersion: ${hasVersion}`],
          recommendation: 'Ensure manifest includes both name and version fields',
          autoFixAvailable: AutoFixCapability.None,
          target,
          detectedAt: new Date().toISOString(),
          resolvedAt: null,
          metadata: { hasName, hasVersion },
        }));
      }

      return violations;
    },
  },
  {
    ruleId: 'CAP-002',
    name: 'Permissions defined',
    description: 'Capability pack must define its permission requirements',
    severity: RuleSeverity.Error,
    enforcement: EnforcementLevel.Blocking,
    source: 'CON-001.000 §3',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const hasPermissions = /permissions?/.test(content);

      if (!hasPermissions) {
        violations.push(Object.freeze({
          id: brandViolationId('CAP-002-v-1'),
          ruleId: brandRuleId('CAP-002'),
          ruleName: 'Permissions defined',
          category: RuleCategory.CapabilityPack,
          severity: RuleSeverity.Error,
          enforcementLevel: EnforcementLevel.Blocking,
          state: ViolationState.Detected,
          description: 'Capability pack does not define permissions',
          evidence: ['No permissions field found'],
          recommendation: 'Add a permissions array or object declaring required permissions',
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
    ruleId: 'CAP-003',
    name: 'Policies defined',
    description: 'Capability pack must define governance policies',
    severity: RuleSeverity.Error,
    enforcement: EnforcementLevel.Blocking,
    source: 'GOV-008.000 §3',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const hasPolicies = /polic(y|ies)/i.test(content);

      if (!hasPolicies) {
        violations.push(Object.freeze({
          id: brandViolationId('CAP-003-v-1'),
          ruleId: brandRuleId('CAP-003'),
          ruleName: 'Policies defined',
          category: RuleCategory.CapabilityPack,
          severity: RuleSeverity.Error,
          enforcementLevel: EnforcementLevel.Blocking,
          state: ViolationState.Detected,
          description: 'Capability pack does not define governance policies',
          evidence: ['No policy definitions found'],
          recommendation: 'Add policy definitions that specify governance rules for this capability',
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
    ruleId: 'CAP-004',
    name: 'Dependencies declared',
    description: 'Capability pack should declare its dependencies',
    severity: RuleSeverity.Warning,
    enforcement: EnforcementLevel.Advisory,
    source: 'CON-001.000 §4',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const hasDependencies = /dependenc(?:y|ies)/i.test(content);
      const hasImports = /import\s+/.test(content);

      if (hasImports && !hasDependencies) {
        violations.push(Object.freeze({
          id: brandViolationId('CAP-004-v-1'),
          ruleId: brandRuleId('CAP-004'),
          ruleName: 'Dependencies declared',
          category: RuleCategory.CapabilityPack,
          severity: RuleSeverity.Warning,
          enforcementLevel: EnforcementLevel.Advisory,
          state: ViolationState.Detected,
          description: 'Capability pack has imports but does not declare dependencies',
          evidence: ['Import statements found', 'No dependency declarations found'],
          recommendation: 'Add a dependencies section listing external dependencies',
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
    ruleId: 'CAP-005',
    name: 'Contracts implemented',
    description: 'Capability pack must implement its declared contracts',
    severity: RuleSeverity.Error,
    enforcement: EnforcementLevel.Blocking,
    source: 'CON-001.000 §5',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const hasContract = /(?:implements|interface|contract)/i.test(content);
      const hasExport = /export\s+(?:class|function|interface)/.test(content);

      if (!hasContract && !hasExport) {
        violations.push(Object.freeze({
          id: brandViolationId('CAP-005-v-1'),
          ruleId: brandRuleId('CAP-005'),
          ruleName: 'Contracts implemented',
          category: RuleCategory.CapabilityPack,
          severity: RuleSeverity.Error,
          enforcementLevel: EnforcementLevel.Blocking,
          state: ViolationState.Detected,
          description: 'Capability pack does not implement or declare any contracts',
          evidence: ['No interface, contract, or implementation keywords found'],
          recommendation: 'Implement the required contracts or declare interfaces for this capability',
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
    ruleId: 'CAP-006',
    name: 'Sandbox isolation',
    description: 'Capability pack must maintain sandbox isolation boundaries',
    severity: RuleSeverity.Critical,
    enforcement: EnforcementLevel.Blocking,
    source: 'CON-001.000 §6',
    check: (content, target): ComplianceViolation[] => {
      const violations: ComplianceViolation[] = [];
      const hasGlobalAccess = /\bglobal(?:This)?\b/.test(content);
      const hasProcessAccess = /\bprocess\.(?:env|exit|kill)/.test(content);
      const hasFsAccess = /require\s*\(\s*['"]fs['"]/.test(content) || /from\s+['"]fs['"]/.test(content);
      const hasSandboxKeyword = /sandbox/i.test(content);

      if ((hasGlobalAccess || hasProcessAccess || hasFsAccess) && !hasSandboxKeyword) {
        const evidence: string[] = [];
        if (hasGlobalAccess) evidence.push('Accesses global/globalThis');
        if (hasProcessAccess) evidence.push('Accesses process.env/exit/kill');
        if (hasFsAccess) evidence.push('Imports fs module directly');

        violations.push(Object.freeze({
          id: brandViolationId('CAP-006-v-1'),
          ruleId: brandRuleId('CAP-006'),
          ruleName: 'Sandbox isolation',
          category: RuleCategory.CapabilityPack,
          severity: RuleSeverity.Critical,
          enforcementLevel: EnforcementLevel.Blocking,
          state: ViolationState.Detected,
          description: 'Capability pack may violate sandbox isolation',
          evidence,
          recommendation: 'Use sandboxed APIs or declare sandbox exceptions explicitly',
          autoFixAvailable: AutoFixCapability.None,
          target,
          detectedAt: new Date().toISOString(),
          resolvedAt: null,
          metadata: { hasGlobalAccess, hasProcessAccess, hasFsAccess },
        }));
      }

      return violations;
    },
  },
];

export class CapabilityValidator implements ICapabilityValidator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly category: RuleCategory;

  private readonly ruleEngine: RuleEngine;

  constructor(ruleEngine: RuleEngine) {
    this.id = brandValidatorId('capability-validator');
    this.name = 'CapabilityValidator';
    this.category = RuleCategory.CapabilityPack;
    this.ruleEngine = ruleEngine;
  }

  async registerRules(): Promise<void> {
    for (const ruleDef of CAPABILITY_RULES) {
      const rid = brandRuleId(ruleDef.ruleId);

      await this.ruleEngine.registerRule(Object.freeze({
        id: rid,
        name: ruleDef.name,
        description: ruleDef.description,
        category: RuleCategory.CapabilityPack,
        severity: ruleDef.severity,
        enforcementLevel: ruleDef.enforcement,
        autoFix: AutoFixCapability.None,
        source: ruleDef.source,
        validatorId: this.id,
        enabled: true,
        tags: ['capability', ruleDef.ruleId.toLowerCase()],
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
              category: RuleCategory.CapabilityPack,
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
            category: RuleCategory.CapabilityPack,
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

  async validateCapability(
    capabilityPath: string,
    sessionId: ComplianceSessionId,
  ): Promise<RuleEvaluationResult[]> {
    const request: ValidationRequest = Object.freeze({
      targetType: ValidationTargetType.CapabilityPack,
      targetPath: capabilityPath,
      categories: [RuleCategory.CapabilityPack] as readonly RuleCategory[],
      sessionId,
      metadata: {},
    });
    const result = await this.ruleEngine.evaluateRules(request);
    return [...result.results];
  }
}
