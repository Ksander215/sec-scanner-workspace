/**
 * Architecture Compliance & Governance Engine — Privacy Validator
 * TASK-AIS-000Z.000
 *
 * Validates privacy compliance: no data leakage, local-first architecture,
 * provider respects privacy level.
 */

import type { RuleEngine } from './rule-engine.js';
import type { IPrivacyValidator } from './contracts.js';
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

export class PrivacyValidator implements IPrivacyValidator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly category: RuleCategory;

  private readonly ruleEngine: RuleEngine;

  constructor(ruleEngine: RuleEngine) {
    this.id = brandValidatorId('privacy-validator');
    this.name = 'PrivacyValidator';
    this.category = RuleCategory.Privacy;
    this.ruleEngine = ruleEngine;
  }

  async registerRules(): Promise<void> {
    // PRIV-001
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('PRIV-001'),
      name: 'No data leakage',
      description: 'Module must not leak sensitive data to external services',
      category: RuleCategory.Privacy,
      severity: RuleSeverity.Critical,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'PHI-001.000 §5',
      validatorId: this.id,
      enabled: true,
      tags: ['privacy', 'data-leakage', 'external'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('PRIV-001'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('PRIV-001'),
            ruleName: 'No data leakage',
            category: RuleCategory.Privacy,
            severity: RuleSeverity.Critical,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const leakagePatterns: Array<{ pattern: RegExp; label: string }> = [
          { pattern: /fetch\s*\([^)]*\b(?:api|http|https):\/\//i, label: 'Outbound HTTP request to external API' },
          { pattern: /axios\.(?:get|post|put|delete|patch)\s*\([^)]*\bhttp/i, label: 'Axios call to external HTTP endpoint' },
          { pattern: /new\s+WebSocket\s*\([^)]*\b(?:ws|wss):\/\//i, label: 'WebSocket connection to external server' },
          { pattern: /navigator\.(?:sendBeacon|geolocation|clipboard)/i, label: 'Browser data exfiltration API usage' },
        ];

        for (const lp of leakagePatterns) {
          const matches = content.match(lp.pattern);
          if (matches) {
            violations.push(Object.freeze({
              id: brandViolationId(`PRIV-001-v-${violations.length + 1}`),
              ruleId: brandRuleId('PRIV-001'),
              ruleName: 'No data leakage',
              category: RuleCategory.Privacy,
              severity: RuleSeverity.Critical,
              enforcementLevel: EnforcementLevel.Blocking,
              state: ViolationState.Detected,
              description: `Potential data leakage: ${lp.label}`,
              evidence: matches.map((m) => `Match: ${m}`),
              recommendation: 'Remove or gate external data transmission behind explicit user consent',
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: { pattern: lp.label },
            }));
          }
        }

        return Object.freeze({
          ruleId: brandRuleId('PRIV-001'),
          ruleName: 'No data leakage',
          category: RuleCategory.Privacy,
          severity: RuleSeverity.Critical,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { patternsChecked: leakagePatterns.length },
        });
      },
    );

    // PRIV-002
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('PRIV-002'),
      name: 'Local first architecture',
      description: 'Data processing should prefer local execution over remote',
      category: RuleCategory.Privacy,
      severity: RuleSeverity.Error,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'PHI-001.000 §5',
      validatorId: this.id,
      enabled: true,
      tags: ['privacy', 'local-first', 'architecture'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('PRIV-002'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('PRIV-002'),
            ruleName: 'Local first architecture',
            category: RuleCategory.Privacy,
            severity: RuleSeverity.Error,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const hasRemoteCalls = /(?:fetch|axios|XMLHttpRequest|WebSocket)\s*[\(<]/.test(content);
        const hasLocalFirst = /(?:local.?first|localFirst|processLocally|localProcess)/i.test(content);

        if (hasRemoteCalls && !hasLocalFirst) {
          violations.push(Object.freeze({
            id: brandViolationId('PRIV-002-v-1'),
            ruleId: brandRuleId('PRIV-002'),
            ruleName: 'Local first architecture',
            category: RuleCategory.Privacy,
            severity: RuleSeverity.Error,
            enforcementLevel: EnforcementLevel.Blocking,
            state: ViolationState.Detected,
            description: 'Module makes remote calls without local-first processing pattern',
            evidence: ['Remote calls detected', 'No local-first pattern found'],
            recommendation: 'Implement local-first processing: process data locally before considering remote calls',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }

        return Object.freeze({
          ruleId: brandRuleId('PRIV-002'),
          ruleName: 'Local first architecture',
          category: RuleCategory.Privacy,
          severity: RuleSeverity.Error,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { hasRemoteCalls, hasLocalFirst },
        });
      },
    );

    // PRIV-003
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('PRIV-003'),
      name: 'Provider respects privacy level',
      description: 'AI/data providers must respect the declared privacy level',
      category: RuleCategory.Privacy,
      severity: RuleSeverity.Error,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'PHI-001.000 §5',
      validatorId: this.id,
      enabled: true,
      tags: ['privacy', 'provider', 'level'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('PRIV-003'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('PRIV-003'),
            ruleName: 'Provider respects privacy level',
            category: RuleCategory.Privacy,
            severity: RuleSeverity.Error,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const hasProvider = /(?:provider|Provider|AIProvider)/.test(content);
        const hasPrivacyLevel = /(?:privacyLevel|privacy_level|PrivacyLevel)/.test(content);

        if (hasProvider && !hasPrivacyLevel) {
          violations.push(Object.freeze({
            id: brandViolationId('PRIV-003-v-1'),
            ruleId: brandRuleId('PRIV-003'),
            ruleName: 'Provider respects privacy level',
            category: RuleCategory.Privacy,
            severity: RuleSeverity.Error,
            enforcementLevel: EnforcementLevel.Blocking,
            state: ViolationState.Detected,
            description: 'Provider usage detected without privacy level configuration',
            evidence: ['Provider references found', 'No privacyLevel field detected'],
            recommendation: 'Add privacyLevel configuration to provider setup to control data handling',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: {},
          }));
        }

        return Object.freeze({
          ruleId: brandRuleId('PRIV-003'),
          ruleName: 'Provider respects privacy level',
          category: RuleCategory.Privacy,
          severity: RuleSeverity.Error,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { hasProvider, hasPrivacyLevel },
        });
      },
    );
  }

  async validate(request: ValidationRequest): Promise<RuleEvaluationResult[]> {
    const result = await this.ruleEngine.evaluateRules(request);
    return Object.freeze([...result.results]) as RuleEvaluationResult[];
  }

  async validatePrivacy(
    modulePath: string,
    content: string,
    sessionId: ComplianceSessionId,
  ): Promise<RuleEvaluationResult[]> {
    const request: ValidationRequest = Object.freeze({
      targetType: ValidationTargetType.Architecture,
      targetPath: modulePath,
      targetContent: content,
      categories: [RuleCategory.Privacy] as readonly RuleCategory[],
      sessionId,
      metadata: {},
    });
    const result = await this.ruleEngine.evaluateRules(request);
    return Object.freeze([...result.results]) as RuleEvaluationResult[];
  }
}
