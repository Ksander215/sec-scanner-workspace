/**
 * Architecture Compliance & Governance Engine — Security Validator
 * TASK-AIS-000Z.000
 *
 * Validates security: no hardcoded secrets, input validation,
 * no eval/Function constructor, trust zone respected.
 */

import type { RuleEngine } from './rule-engine.js';
import type { ISecurityValidator } from './contracts.js';
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

export class SecurityValidator implements ISecurityValidator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly category: RuleCategory;

  private readonly ruleEngine: RuleEngine;

  constructor(ruleEngine: RuleEngine) {
    this.id = brandValidatorId('security-validator');
    this.name = 'SecurityValidator';
    this.category = RuleCategory.Security;
    this.ruleEngine = ruleEngine;
  }

  async registerRules(): Promise<void> {
    // SEC-001
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('SEC-001'),
      name: 'No hardcoded secrets',
      description: 'Code must not contain hardcoded passwords, API keys, or tokens',
      category: RuleCategory.Security,
      severity: RuleSeverity.Critical,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'PHI-001.000 §7',
      validatorId: this.id,
      enabled: true,
      tags: ['security', 'secrets', 'hardcoded'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('SEC-001'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('SEC-001'),
            ruleName: 'No hardcoded secrets',
            category: RuleCategory.Security,
            severity: RuleSeverity.Critical,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const secretPatterns: Array<{ pattern: RegExp; label: string }> = [
          { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"`][^'"`]{4,}['"`]/i, label: 'Hardcoded password' },
          { pattern: /(?:api[_-]?key|apikey|api_key)\s*[:=]\s*['"`][^'"`]{8,}['"`]/i, label: 'Hardcoded API key' },
          { pattern: /(?:secret|token|auth)\s*[:=]\s*['"`][A-Za-z0-9+/=_-]{16,}['"`]/i, label: 'Hardcoded secret/token' },
          { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i, label: 'Hardcoded Bearer token' },
          { pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/, label: 'Hardcoded private key' },
        ];

        for (const sp of secretPatterns) {
          const match = sp.pattern.exec(content);
          if (match) {
            const redacted = match[0].substring(0, 20) + '...[REDACTED]';
            violations.push(Object.freeze({
              id: brandViolationId(`SEC-001-v-${violations.length + 1}`),
              ruleId: brandRuleId('SEC-001'),
              ruleName: 'No hardcoded secrets',
              category: RuleCategory.Security,
              severity: RuleSeverity.Critical,
              enforcementLevel: EnforcementLevel.Blocking,
              state: ViolationState.Detected,
              description: `Hardcoded secret detected: ${sp.label}`,
              evidence: [`Pattern: ${sp.label}`, `Redacted match: ${redacted}`],
              recommendation: 'Move secrets to environment variables, a secrets manager, or secure configuration',
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: { secretType: sp.label },
            }));
          }
        }

        return Object.freeze({
          ruleId: brandRuleId('SEC-001'),
          ruleName: 'No hardcoded secrets',
          category: RuleCategory.Security,
          severity: RuleSeverity.Critical,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { patternsChecked: secretPatterns.length },
        });
      },
    );

    // SEC-002
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('SEC-002'),
      name: 'Input validation present',
      description: 'Public-facing functions must validate their inputs',
      category: RuleCategory.Security,
      severity: RuleSeverity.Error,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'PHI-001.000 §7',
      validatorId: this.id,
      enabled: true,
      tags: ['security', 'input-validation', 'sanitization'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('SEC-002'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('SEC-002'),
            ruleName: 'Input validation present',
            category: RuleCategory.Security,
            severity: RuleSeverity.Error,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const hasPublicFunctions = /(?:export|public)/.test(content);
        const hasValidation = /(?:validate|sanitize|zod|joi|yup|typeguard|typeof|instanceof|schema|parse)/i.test(content);

        if (hasPublicFunctions && !hasValidation) {
          violations.push(Object.freeze({
            id: brandViolationId('SEC-002-v-1'),
            ruleId: brandRuleId('SEC-002'),
            ruleName: 'Input validation present',
            category: RuleCategory.Security,
            severity: RuleSeverity.Error,
            enforcementLevel: EnforcementLevel.Blocking,
            state: ViolationState.Detected,
            description: 'Module exports functions but has no visible input validation',
            evidence: ['Exported/public functions detected', 'No validation/sanitization/schema patterns found'],
            recommendation: 'Add input validation using zod, joi, or manual type checks for public functions',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }

        return Object.freeze({
          ruleId: brandRuleId('SEC-002'),
          ruleName: 'Input validation present',
          category: RuleCategory.Security,
          severity: RuleSeverity.Error,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { hasPublicFunctions, hasValidation },
        });
      },
    );

    // SEC-003
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('SEC-003'),
      name: 'No eval or Function constructor',
      description: 'Code must not use eval() or new Function() for security reasons',
      category: RuleCategory.Security,
      severity: RuleSeverity.Critical,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'PHI-001.000 §7',
      validatorId: this.id,
      enabled: true,
      tags: ['security', 'eval', 'code-injection'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('SEC-003'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('SEC-003'),
            ruleName: 'No eval or Function constructor',
            category: RuleCategory.Security,
            severity: RuleSeverity.Critical,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const dangerousPatterns: Array<{ pattern: RegExp; label: string }> = [
          { pattern: /(?:^|\s)eval\s*\(/, label: 'eval() call' },
          { pattern: /new\s+Function\s*\(/, label: 'new Function() constructor' },
          { pattern: /setTimeout\s*\(\s*['"`]/, label: 'setTimeout with string argument' },
          { pattern: /setInterval\s*\(\s*['"`]/, label: 'setInterval with string argument' },
        ];

        for (const dp of dangerousPatterns) {
          const match = dp.pattern.exec(content);
          if (match) {
            violations.push(Object.freeze({
              id: brandViolationId(`SEC-003-v-${violations.length + 1}`),
              ruleId: brandRuleId('SEC-003'),
              ruleName: 'No eval or Function constructor',
              category: RuleCategory.Security,
              severity: RuleSeverity.Critical,
              enforcementLevel: EnforcementLevel.Blocking,
              state: ViolationState.Detected,
              description: `Dangerous code execution pattern: ${dp.label}`,
              evidence: [`Match: ${match[0].trim()}`],
              recommendation: 'Replace eval/Function with safer alternatives; use JSON.parse for data, or explicit function references',
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: { pattern: dp.label },
            }));
          }
        }

        return Object.freeze({
          ruleId: brandRuleId('SEC-003'),
          ruleName: 'No eval or Function constructor',
          category: RuleCategory.Security,
          severity: RuleSeverity.Critical,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { patternsChecked: dangerousPatterns.length },
        });
      },
    );

    // SEC-004
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('SEC-004'),
      name: 'Trust zone respected',
      description: 'Cross-boundary data flows must cross a trust zone boundary explicitly',
      category: RuleCategory.Security,
      severity: RuleSeverity.Error,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'PHI-001.000 §7',
      validatorId: this.id,
      enabled: true,
      tags: ['security', 'trust-zone', 'boundary'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('SEC-004'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('SEC-004'),
            ruleName: 'Trust zone respected',
            category: RuleCategory.Security,
            severity: RuleSeverity.Error,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const hasCrossBoundary = /(?:fetch|axios|postMessage|window\.parent|iframe)/i.test(content);
        const hasTrustZone = /(?:trustZone|trust_zone|TrustZone|boundary|Boundary|sanitiz|Sanitiz)/i.test(content);

        if (hasCrossBoundary && !hasTrustZone) {
          violations.push(Object.freeze({
            id: brandViolationId('SEC-004-v-1'),
            ruleId: brandRuleId('SEC-004'),
            ruleName: 'Trust zone respected',
            category: RuleCategory.Security,
            severity: RuleSeverity.Error,
            enforcementLevel: EnforcementLevel.Blocking,
            state: ViolationState.Detected,
            description: 'Cross-boundary communication detected without explicit trust zone handling',
            evidence: ['Cross-boundary patterns found', 'No trust zone or boundary enforcement detected'],
            recommendation: 'Add explicit trust zone boundary checks and data sanitization at cross-boundary points',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }

        return Object.freeze({
          ruleId: brandRuleId('SEC-004'),
          ruleName: 'Trust zone respected',
          category: RuleCategory.Security,
          severity: RuleSeverity.Error,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { hasCrossBoundary, hasTrustZone },
        });
      },
    );
  }

  async validate(request: ValidationRequest): Promise<RuleEvaluationResult[]> {
    const result = await this.ruleEngine.evaluateRules(request);
    return [...result.results];
  }

  async validateSecurity(
    modulePath: string,
    content: string,
    sessionId: ComplianceSessionId,
  ): Promise<RuleEvaluationResult[]> {
    const request: ValidationRequest = Object.freeze({
      targetType: ValidationTargetType.Architecture,
      targetPath: modulePath,
      targetContent: content,
      categories: [RuleCategory.Security] as readonly RuleCategory[],
      sessionId,
      metadata: {},
    });
    const result = await this.ruleEngine.evaluateRules(request);
    return [...result.results];
  }
}
