/**
 * Security Intelligence Recommendation Engine — Rule Registry
 *
 * Extensible rule registry with 14 built-in recommendation rules.
 * Each rule evaluates a source context and optionally produces a
 * recommendation result. Rules are pluggable, not hardcoded.
 *
 * Rules:
 * Patch, UpgradeDependency, ConfigurationChange, DisableEndpoint,
 * NetworkIsolation, SecretRotation, MFAEnrollment, WAFRule,
 * RateLimiting, CSP, HSTS, InputValidation, AccessControl,
 * LoggingMonitoring
 */

import type {
  RecommendationRule, RecommendationRuleType, RecommendationSource,
  RuleContext, RuleResult,
} from '../types/index.ts';
import {
  RecommendationRuleType as RRT, RecommendationSource as RS,
  RecommendationSeverity,
} from '../types/index.ts';
import type { FindingCategory, Severity } from '../../normalization/types/index.ts';

// ─── Patch Rule ─────────────────────────────────────────────

const patchRule: RecommendationRule = {
  id: 'rule-patch',
  type: RRT.Patch,
  name: 'Patch Vulnerability',
  description: 'Apply security patches for known vulnerabilities',
  priority: 0.95,
  // Only applies when a finding is directly available in context.
  // RiskAssessment/ImpactAnalysis alone do not carry enough data for this rule.
  appliesTo: [RS.CanonicalFinding],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const hasCVE = finding.cve && finding.cve.length > 0;
    const isVuln = finding.category === 'Vulnerability' || hasCVE;
    if (!isVuln) return null;

    const severity = mapSeverity(finding.severity);
    const riskReduction = severityToRiskReduction(finding.severity);

    return {
      ruleType: RRT.Patch,
      source: ctx.finding ? RS.CanonicalFinding : RS.RiskAssessment,
      sourceId: finding.id,
      title: `Patch vulnerability: ${finding.title}`,
      description: `Apply security patch for ${finding.cve?.map(c => c.id).join(', ') ?? finding.title}`,
      severity,
      targetId: finding.id,
      targetType: 'vulnerability',
      targetLabel: finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: ctx.impactAnalysis?.attackPathDelta?.eliminatedPaths ?? [],
      costEstimate: {
        implementationCost: 0.3,
        operationalCost: 0.05,
        effortHours: severity === 'Critical' ? 8 : severity === 'High' ? 4 : 2,
        complexity: 0.25,
        disruption: 0.1,
      },
      benefitEstimate: {
        riskReduction,
        attackPathElimination: riskReduction * 0.8,
        complianceImprovement: 0.7,
        securityScoreImprovement: Math.round(riskReduction * 30),
        confidenceImprovement: 0.6,
        coverageImprovement: 0.5,
      },
      evidence: [makeEvidence(ctx.finding ? RS.CanonicalFinding : RS.RiskAssessment, finding.id, 'category', finding.category, 0.9, 'Finding category is Vulnerability')],
      explainability: {
        whyGenerated: ['rule-patch', finding.cve?.[0]?.id ?? 'vulnerability-detected'].filter(Boolean),
        affectedFindings: [finding.id],
        affectedAttackPaths: ctx.impactAnalysis?.attackPathDelta?.eliminatedPaths ?? [],
        expectedRiskDelta: riskReduction,
        expectedScoreDelta: Math.round(riskReduction * 30),
        confidenceReasoning: { cvePresent: hasCVE ? 0.9 : 0.5, severityHigh: severity === 'Critical' || severity === 'High' ? 0.8 : 0.4 },
      },
    };
  },
};

// ─── Upgrade Dependency Rule ────────────────────────────────

const upgradeDependencyRule: RecommendationRule = {
  id: 'rule-upgrade-dependency',
  type: RRT.UpgradeDependency,
  name: 'Upgrade Dependency',
  description: 'Upgrade vulnerable dependencies to secure versions',
  priority: 0.85,
  appliesTo: [RS.CanonicalFinding],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const isDependencyVuln = finding.technology?.length > 0 ||
      finding.category === 'Vulnerability' ||
      finding.tags?.some(t => t === 'dependency' || t === 'outdated' || t === 'npm' || t === 'pip');
    if (!isDependencyVuln) return null;

    const severity = mapSeverity(finding.severity);
    const riskReduction = severityToRiskReduction(finding.severity) * 0.85;

    return {
      ruleType: RRT.UpgradeDependency,
      source: ctx.finding ? RS.CanonicalFinding : RS.RiskAssessment,
      sourceId: finding.id,
      title: `Upgrade dependency: ${finding.title}`,
      description: `Upgrade vulnerable dependency to a secure version`,
      severity,
      targetId: finding.id,
      targetType: 'dependency',
      targetLabel: finding.technology?.[0] ?? finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: [],
      costEstimate: {
        implementationCost: 0.4,
        operationalCost: 0.1,
        effortHours: 6,
        complexity: 0.4,
        disruption: 0.2,
      },
      benefitEstimate: {
        riskReduction,
        attackPathElimination: riskReduction * 0.6,
        complianceImprovement: 0.5,
        securityScoreImprovement: Math.round(riskReduction * 20),
        confidenceImprovement: 0.5,
        coverageImprovement: 0.4,
      },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'technology', finding.technology?.join(',') ?? '', 0.7, 'Dependency-related vulnerability')],
      explainability: {
        whyGenerated: ['rule-upgrade-dependency'],
        affectedFindings: [finding.id],
        affectedAttackPaths: [],
        expectedRiskDelta: riskReduction,
        expectedScoreDelta: Math.round(riskReduction * 20),
        confidenceReasoning: { hasTechnology: finding.technology?.length > 0 ? 0.7 : 0.3 },
      },
    };
  },
};

// ─── Configuration Change Rule ──────────────────────────────

const configurationChangeRule: RecommendationRule = {
  id: 'rule-configuration-change',
  type: RRT.ConfigurationChange,
  name: 'Configuration Change',
  description: 'Fix insecure configuration settings',
  priority: 0.80,
  appliesTo: [RS.CanonicalFinding, RS.CorrelationGroup],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const isMisconfig = finding.category === 'Misconfiguration' ||
      finding.category === 'Exposure' ||
      finding.tags?.some(t => t === 'config' || t === 'misconfiguration');
    if (!isMisconfig) return null;

    const severity = mapSeverity(finding.severity);
    const riskReduction = severityToRiskReduction(finding.severity) * 0.9;

    return {
      ruleType: RRT.ConfigurationChange,
      source: ctx.finding ? RS.CanonicalFinding : RS.RiskAssessment,
      sourceId: finding.id,
      title: `Fix configuration: ${finding.title}`,
      description: `Remediate insecure configuration setting`,
      severity,
      targetId: finding.id,
      targetType: 'configuration',
      targetLabel: finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: [],
      costEstimate: { implementationCost: 0.2, operationalCost: 0.05, effortHours: 2, complexity: 0.15, disruption: 0.1 },
      benefitEstimate: { riskReduction, attackPathElimination: riskReduction * 0.7, complianceImprovement: 0.6, securityScoreImprovement: Math.round(riskReduction * 25), confidenceImprovement: 0.7, coverageImprovement: 0.5 },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'category', finding.category, 0.85, 'Misconfiguration detected')],
      explainability: { whyGenerated: ['rule-configuration-change'], affectedFindings: [finding.id], affectedAttackPaths: [], expectedRiskDelta: riskReduction, expectedScoreDelta: Math.round(riskReduction * 25), confidenceReasoning: { isMisconfiguration: 0.85 } },
    };
  },
};

// ─── Disable Endpoint Rule ──────────────────────────────────

const disableEndpointRule: RecommendationRule = {
  id: 'rule-disable-endpoint',
  type: RRT.DisableEndpoint,
  name: 'Disable Endpoint',
  description: 'Disable or restrict access to exposed endpoints',
  priority: 0.75,
  appliesTo: [RS.CanonicalFinding, RS.AttackPath, RS.ImpactAnalysis],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const isEndpoint = finding.category === 'Exposure' ||
      finding.endpoint !== null ||
      finding.tags?.some(t => t === 'endpoint' || t === 'exposed');
    if (!isEndpoint) return null;

    const severity = mapSeverity(finding.severity);
    const riskReduction = severityToRiskReduction(finding.severity) * 0.65;

    return {
      ruleType: RRT.DisableEndpoint,
      source: RS.CanonicalFinding,
      sourceId: finding.id,
      title: `Disable endpoint: ${finding.title}`,
      description: `Disable or restrict access to the exposed endpoint`,
      severity,
      targetId: finding.id,
      targetType: 'endpoint',
      targetLabel: finding.endpoint?.original ?? finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: ctx.impactAnalysis?.attackPathDelta?.eliminatedPaths ?? [],
      costEstimate: { implementationCost: 0.15, operationalCost: 0.1, effortHours: 1, complexity: 0.1, disruption: 0.3 },
      benefitEstimate: { riskReduction, attackPathElimination: riskReduction * 0.9, complianceImprovement: 0.4, securityScoreImprovement: Math.round(riskReduction * 20), confidenceImprovement: 0.6, coverageImprovement: 0.3 },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'endpoint', finding.endpoint?.original ?? 'N/A', 0.8, 'Exposed endpoint detected')],
      explainability: { whyGenerated: ['rule-disable-endpoint'], affectedFindings: [finding.id], affectedAttackPaths: [], expectedRiskDelta: riskReduction, expectedScoreDelta: Math.round(riskReduction * 20), confidenceReasoning: { hasEndpoint: finding.endpoint ? 0.8 : 0.3 } },
    };
  },
};

// ─── Network Isolation Rule ─────────────────────────────────

const networkIsolationRule: RecommendationRule = {
  id: 'rule-network-isolation',
  type: RRT.NetworkIsolation,
  name: 'Network Isolation',
  description: 'Isolate compromised or vulnerable assets from the network',
  priority: 0.90,
  appliesTo: [RS.AttackPath, RS.ImpactAnalysis],
  evaluate(ctx: RuleContext): RuleResult | null {
    if (!ctx.attackPath && !ctx.impactAnalysis) return null;

    const pathId = ctx.attackPath?.id ?? ctx.impactAnalysis?.scenarioId ?? '';
    const eliminatedPaths = ctx.impactAnalysis?.attackPathDelta?.eliminatedPaths ?? [];
    const riskReduction = 0.55;

    return {
      ruleType: RRT.NetworkIsolation,
      source: ctx.attackPath ? RS.AttackPath : RS.ImpactAnalysis,
      sourceId: pathId,
      title: 'Isolate network segment',
      description: 'Apply network isolation to prevent lateral movement',
      severity: RecommendationSeverity.High,
      targetId: pathId,
      targetType: 'network',
      targetLabel: 'Network segment',
      findingIds: [],
      correlationGroupIds: [],
      attackPathIds: ctx.attackPath ? [ctx.attackPath.id] : eliminatedPaths,
      costEstimate: { implementationCost: 0.5, operationalCost: 0.3, effortHours: 16, complexity: 0.6, disruption: 0.7 },
      benefitEstimate: { riskReduction, attackPathElimination: 0.8, complianceImprovement: 0.3, securityScoreImprovement: Math.round(riskReduction * 25), confidenceImprovement: 0.4, coverageImprovement: 0.6 },
      evidence: [makeEvidence(ctx.attackPath ? RS.AttackPath : RS.ImpactAnalysis, pathId, 'pathLength', ctx.attackPath?.length ?? 0, 0.7, 'Attack path requires network isolation')],
      explainability: { whyGenerated: ['rule-network-isolation'], affectedFindings: [], affectedAttackPaths: ctx.attackPath ? [ctx.attackPath.id] : eliminatedPaths, expectedRiskDelta: riskReduction, expectedScoreDelta: Math.round(riskReduction * 25), confidenceReasoning: { lateralMovement: 0.7 } },
    };
  },
};

// ─── Secret Rotation Rule ───────────────────────────────────

const secretRotationRule: RecommendationRule = {
  id: 'rule-secret-rotation',
  type: RRT.SecretRotation,
  name: 'Secret Rotation',
  description: 'Rotate compromised or exposed credentials and secrets',
  priority: 0.92,
  appliesTo: [RS.CanonicalFinding],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const isSecret = finding.category === 'SecretExposure' ||
      finding.category === 'InformationDisclosure' ||
      finding.tags?.some(t => t === 'secret' || t === 'credential' || t === 'api-key' || t === 'token');
    if (!isSecret) return null;

    const severity = mapSeverity(finding.severity);
    const riskReduction = severityToRiskReduction(finding.severity) * 0.8;

    return {
      ruleType: RRT.SecretRotation,
      source: ctx.finding ? RS.CanonicalFinding : RS.RiskAssessment,
      sourceId: finding.id,
      title: `Rotate secret: ${finding.title}`,
      description: 'Rotate exposed credentials and secrets immediately',
      severity,
      targetId: finding.id,
      targetType: 'secret',
      targetLabel: finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: [],
      costEstimate: { implementationCost: 0.2, operationalCost: 0.15, effortHours: 4, complexity: 0.3, disruption: 0.25 },
      benefitEstimate: { riskReduction, attackPathElimination: riskReduction * 0.5, complianceImprovement: 0.6, securityScoreImprovement: Math.round(riskReduction * 25), confidenceImprovement: 0.7, coverageImprovement: 0.4 },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'category', finding.category, 0.9, 'Secret/credential exposure detected')],
      explainability: { whyGenerated: ['rule-secret-rotation'], affectedFindings: [finding.id], affectedAttackPaths: [], expectedRiskDelta: riskReduction, expectedScoreDelta: Math.round(riskReduction * 25), confidenceReasoning: { isSecretExposure: 0.9 } },
    };
  },
};

// ─── MFA Enrollment Rule ────────────────────────────────────

const mfaEnrollmentRule: RecommendationRule = {
  id: 'rule-mfa-enrollment',
  type: RRT.MFAEnrollment,
  name: 'MFA Enrollment',
  description: 'Enable multi-factor authentication for access control',
  priority: 0.70,
  appliesTo: [RS.CanonicalFinding, RS.AttackPath],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const isAuthRelated = finding.category === 'AuthenticationBypass' ||
      finding.category === 'BrokenAuthentication' ||
      finding.tags?.some(t => t === 'auth' || t === 'authentication' || t === 'login');
    if (!isAuthRelated) return null;

    return {
      ruleType: RRT.MFAEnrollment,
      source: RS.CanonicalFinding,
      sourceId: finding.id,
      title: `Enable MFA: ${finding.title}`,
      description: 'Enable multi-factor authentication to prevent unauthorized access',
      severity: mapSeverity(finding.severity),
      targetId: finding.id,
      targetType: 'authentication',
      targetLabel: finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: [],
      costEstimate: { implementationCost: 0.25, operationalCost: 0.1, effortHours: 8, complexity: 0.3, disruption: 0.15 },
      benefitEstimate: { riskReduction: 0.6, attackPathElimination: 0.5, complianceImprovement: 0.8, securityScoreImprovement: 15, confidenceImprovement: 0.7, coverageImprovement: 0.3 },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'category', finding.category, 0.85, 'Authentication-related finding')],
      explainability: { whyGenerated: ['rule-mfa-enrollment'], affectedFindings: [finding.id], affectedAttackPaths: [], expectedRiskDelta: 0.6, expectedScoreDelta: 15, confidenceReasoning: { isAuthRelated: 0.85 } },
    };
  },
};

// ─── WAF Rule ───────────────────────────────────────────────

const wafRule: RecommendationRule = {
  id: 'rule-waf',
  type: RRT.WAFRule,
  name: 'WAF Rule',
  description: 'Configure Web Application Firewall rules',
  priority: 0.65,
  appliesTo: [RS.CanonicalFinding, RS.AttackPath],
  evaluate(ctx: RuleContext): RuleContext extends { finding: any } ? RuleResult | null : RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const isWebVuln = finding.category === 'Vulnerability' &&
      finding.endpoint !== null &&
      ['XSS', 'SQLi', 'Injection'].some(t => finding.title.includes(t) || finding.tags?.some(ft => ft === t.toLowerCase()));
    if (!isWebVuln) return null;

    return {
      ruleType: RRT.WAFRule,
      source: RS.CanonicalFinding,
      sourceId: finding.id,
      title: `Add WAF rule: ${finding.title}`,
      description: 'Configure WAF rule to block attack vectors',
      severity: mapSeverity(finding.severity),
      targetId: finding.id,
      targetType: 'waf',
      targetLabel: finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: [],
      costEstimate: { implementationCost: 0.2, operationalCost: 0.15, effortHours: 3, complexity: 0.2, disruption: 0.1 },
      benefitEstimate: { riskReduction: 0.5, attackPathElimination: 0.6, complianceImprovement: 0.4, securityScoreImprovement: 10, confidenceImprovement: 0.5, coverageImprovement: 0.3 },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'category', finding.category, 0.75, 'Web vulnerability suitable for WAF')],
      explainability: { whyGenerated: ['rule-waf'], affectedFindings: [finding.id], affectedAttackPaths: [], expectedRiskDelta: 0.5, expectedScoreDelta: 10, confidenceReasoning: { isWebVuln: 0.75 } },
    };
  },
};

// ─── Rate Limiting Rule ─────────────────────────────────────

const rateLimitingRule: RecommendationRule = {
  id: 'rule-rate-limiting',
  type: RRT.RateLimiting,
  name: 'Rate Limiting',
  description: 'Implement rate limiting to prevent brute force and abuse',
  priority: 0.60,
  appliesTo: [RS.CanonicalFinding, RS.AttackPath],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const needsRateLimit = finding.tags?.some(t => t === 'brute-force' || t === 'rate-limit' || t === 'abuse' || t === 'dos');
    if (!needsRateLimit) return null;

    return {
      ruleType: RRT.RateLimiting,
      source: RS.CanonicalFinding,
      sourceId: finding.id,
      title: `Add rate limiting: ${finding.title}`,
      description: 'Implement rate limiting to prevent abuse',
      severity: mapSeverity(finding.severity),
      targetId: finding.id,
      targetType: 'endpoint',
      targetLabel: finding.endpoint?.original ?? finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: [],
      costEstimate: { implementationCost: 0.15, operationalCost: 0.05, effortHours: 2, complexity: 0.15, disruption: 0.05 },
      benefitEstimate: { riskReduction: 0.4, attackPathElimination: 0.3, complianceImprovement: 0.3, securityScoreImprovement: 8, confidenceImprovement: 0.5, coverageImprovement: 0.2 },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'tags', finding.tags?.join(',') ?? '', 0.7, 'Finding requires rate limiting')],
      explainability: { whyGenerated: ['rule-rate-limiting'], affectedFindings: [finding.id], affectedAttackPaths: [], expectedRiskDelta: 0.4, expectedScoreDelta: 8, confidenceReasoning: { needsRateLimit: 0.7 } },
    };
  },
};

// ─── CSP Rule ───────────────────────────────────────────────

const cspRule: RecommendationRule = {
  id: 'rule-csp',
  type: RRT.CSP,
  name: 'Content Security Policy',
  description: 'Implement Content Security Policy headers',
  priority: 0.55,
  appliesTo: [RS.CanonicalFinding],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const needsCSP = finding.title?.includes('XSS') || finding.tags?.some(t => t === 'xss' || t === 'csp' || t === 'content-security');
    if (!needsCSP) return null;

    return {
      ruleType: RRT.CSP,
      source: RS.CanonicalFinding,
      sourceId: finding.id,
      title: `Implement CSP: ${finding.title}`,
      description: 'Add Content Security Policy headers to prevent XSS',
      severity: mapSeverity(finding.severity),
      targetId: finding.id,
      targetType: 'header',
      targetLabel: finding.endpoint?.original ?? finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: [],
      costEstimate: { implementationCost: 0.15, operationalCost: 0.05, effortHours: 4, complexity: 0.25, disruption: 0.2 },
      benefitEstimate: { riskReduction: 0.55, attackPathElimination: 0.4, complianceImprovement: 0.5, securityScoreImprovement: 12, confidenceImprovement: 0.6, coverageImprovement: 0.3 },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'title', finding.title, 0.8, 'XSS-related finding requires CSP')],
      explainability: { whyGenerated: ['rule-csp'], affectedFindings: [finding.id], affectedAttackPaths: [], expectedRiskDelta: 0.55, expectedScoreDelta: 12, confidenceReasoning: { isXSS: 0.8 } },
    };
  },
};

// ─── HSTS Rule ──────────────────────────────────────────────

const hstsRule: RecommendationRule = {
  id: 'rule-hsts',
  type: RRT.HSTS,
  name: 'HSTS',
  description: 'Enable HTTP Strict Transport Security',
  priority: 0.50,
  appliesTo: [RS.CanonicalFinding],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const needsHSTS = finding.category === 'Misconfiguration' &&
      (finding.title?.toLowerCase().includes('hsts') || finding.tags?.some(t => t === 'hsts' || t === 'ssl' || t === 'tls'));
    if (!needsHSTS) return null;

    return {
      ruleType: RRT.HSTS,
      source: RS.CanonicalFinding,
      sourceId: finding.id,
      title: `Enable HSTS: ${finding.title}`,
      description: 'Enable HTTP Strict Transport Security headers',
      severity: RecommendationSeverity.Medium,
      targetId: finding.id,
      targetType: 'header',
      targetLabel: finding.endpoint?.original ?? finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: [],
      costEstimate: { implementationCost: 0.1, operationalCost: 0.02, effortHours: 1, complexity: 0.1, disruption: 0.05 },
      benefitEstimate: { riskReduction: 0.3, attackPathElimination: 0.2, complianceImprovement: 0.6, securityScoreImprovement: 8, confidenceImprovement: 0.7, coverageImprovement: 0.2 },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'title', finding.title, 0.75, 'SSL/TLS misconfiguration detected')],
      explainability: { whyGenerated: ['rule-hsts'], affectedFindings: [finding.id], affectedAttackPaths: [], expectedRiskDelta: 0.3, expectedScoreDelta: 8, confidenceReasoning: { isTLSIssue: 0.75 } },
    };
  },
};

// ─── Input Validation Rule ──────────────────────────────────

const inputValidationRule: RecommendationRule = {
  id: 'rule-input-validation',
  type: RRT.InputValidation,
  name: 'Input Validation',
  description: 'Implement proper input validation and sanitization',
  priority: 0.75,
  appliesTo: [RS.CanonicalFinding],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const needsValidation = finding.category === 'Vulnerability' &&
      (finding.title?.includes('Injection') || finding.title?.includes('XSS') ||
       finding.cwe?.some(c => c.numericId === 79 || c.numericId === 89 || c.numericId === 20));
    if (!needsValidation) return null;

    const severity = mapSeverity(finding.severity);
    const riskReduction = severityToRiskReduction(finding.severity) * 0.75;

    return {
      ruleType: RRT.InputValidation,
      source: RS.CanonicalFinding,
      sourceId: finding.id,
      title: `Add input validation: ${finding.title}`,
      description: 'Implement proper input validation and sanitization',
      severity,
      targetId: finding.id,
      targetType: 'code',
      targetLabel: finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: [],
      costEstimate: { implementationCost: 0.35, operationalCost: 0.05, effortHours: 8, complexity: 0.4, disruption: 0.15 },
      benefitEstimate: { riskReduction, attackPathElimination: riskReduction * 0.7, complianceImprovement: 0.5, securityScoreImprovement: Math.round(riskReduction * 25), confidenceImprovement: 0.6, coverageImprovement: 0.4 },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'category', finding.category, 0.8, 'Injection/XSS vulnerability requires input validation')],
      explainability: { whyGenerated: ['rule-input-validation'], affectedFindings: [finding.id], affectedAttackPaths: [], expectedRiskDelta: riskReduction, expectedScoreDelta: Math.round(riskReduction * 25), confidenceReasoning: { isInjection: 0.8 } },
    };
  },
};

// ─── Access Control Rule ────────────────────────────────────

const accessControlRule: RecommendationRule = {
  id: 'rule-access-control',
  type: RRT.AccessControl,
  name: 'Access Control',
  description: 'Fix broken access control and authorization issues',
  priority: 0.80,
  appliesTo: [RS.CanonicalFinding, RS.CorrelationGroup],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const isAccessControl = finding.category === 'BrokenAccessControl' ||
      finding.category === 'AuthorizationBypass' ||
      finding.cwe?.some(c => c.numericId === 284 || c.numericId === 862 || c.numericId === 639);
    if (!isAccessControl) return null;

    const severity = mapSeverity(finding.severity);
    const riskReduction = severityToRiskReduction(finding.severity) * 0.85;

    return {
      ruleType: RRT.AccessControl,
      source: RS.CanonicalFinding,
      sourceId: finding.id,
      title: `Fix access control: ${finding.title}`,
      description: 'Fix broken access control and authorization issues',
      severity,
      targetId: finding.id,
      targetType: 'authorization',
      targetLabel: finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: [],
      costEstimate: { implementationCost: 0.4, operationalCost: 0.1, effortHours: 12, complexity: 0.5, disruption: 0.2 },
      benefitEstimate: { riskReduction, attackPathElimination: riskReduction * 0.6, complianceImprovement: 0.7, securityScoreImprovement: Math.round(riskReduction * 20), confidenceImprovement: 0.6, coverageImprovement: 0.5 },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'category', finding.category, 0.85, 'Access control vulnerability')],
      explainability: { whyGenerated: ['rule-access-control'], affectedFindings: [finding.id], affectedAttackPaths: [], expectedRiskDelta: riskReduction, expectedScoreDelta: Math.round(riskReduction * 20), confidenceReasoning: { isAccessControlIssue: 0.85 } },
    };
  },
};

// ─── Logging/Monitoring Rule ────────────────────────────────

const loggingMonitoringRule: RecommendationRule = {
  id: 'rule-logging-monitoring',
  type: RRT.LoggingMonitoring,
  name: 'Logging / Monitoring',
  description: 'Implement or improve security logging and monitoring',
  priority: 0.45,
  appliesTo: [RS.CanonicalFinding, RS.AttackPath, RS.CorrelationGroup],
  evaluate(ctx: RuleContext): RuleResult | null {
    const finding = ctx.finding;
    if (!finding) return null;

    const needsLogging = finding.category === 'InformationDisclosure' ||
      finding.category === 'SecurityMisconfiguration' ||
      finding.tags?.some(t => t === 'logging' || t === 'monitoring' || t === 'detection');
    if (!needsLogging) return null;

    return {
      ruleType: RRT.LoggingMonitoring,
      source: RS.CanonicalFinding,
      sourceId: finding.id,
      title: `Improve logging: ${finding.title}`,
      description: 'Implement security logging and monitoring for detection',
      severity: RecommendationSeverity.Medium,
      targetId: finding.id,
      targetType: 'monitoring',
      targetLabel: finding.title,
      findingIds: [finding.id],
      correlationGroupIds: [],
      attackPathIds: [],
      costEstimate: { implementationCost: 0.3, operationalCost: 0.2, effortHours: 10, complexity: 0.35, disruption: 0.1 },
      benefitEstimate: { riskReduction: 0.35, attackPathElimination: 0.2, complianceImprovement: 0.7, securityScoreImprovement: 10, confidenceImprovement: 0.8, coverageImprovement: 0.3 },
      evidence: [makeEvidence(RS.CanonicalFinding, finding.id, 'category', finding.category, 0.65, 'Finding requires improved logging/monitoring')],
      explainability: { whyGenerated: ['rule-logging-monitoring'], affectedFindings: [finding.id], affectedAttackPaths: [], expectedRiskDelta: 0.35, expectedScoreDelta: 10, confidenceReasoning: { needsLogging: 0.65 } },
    };
  },
};

// ─── Built-in Rules List ────────────────────────────────────

export const BUILT_IN_RULES: readonly RecommendationRule[] = Object.freeze([
  patchRule,
  upgradeDependencyRule,
  configurationChangeRule,
  disableEndpointRule,
  networkIsolationRule,
  secretRotationRule,
  mfaEnrollmentRule,
  wafRule,
  rateLimitingRule,
  cspRule,
  hstsRule,
  inputValidationRule,
  accessControlRule,
  loggingMonitoringRule,
]);

// ─── Rule Registry ──────────────────────────────────────────

/**
 * Extensible registry for recommendation rules.
 * Supports registration, unregistration, and lookup of rules.
 */
export class RuleRegistry {
  private readonly _rules: Map<string, RecommendationRule> = new Map();

  constructor(initialRules?: readonly RecommendationRule[]) {
    if (initialRules) {
      for (const rule of initialRules) {
        this._rules.set(rule.id, rule);
      }
    }
  }

  /** Register a new rule */
  register(rule: RecommendationRule): void {
    if (this._rules.has(rule.id)) {
      throw new Error(`Rule already registered: ${rule.id}`);
    }
    this._rules.set(rule.id, rule);
  }

  /** Unregister a rule by ID */
  unregister(ruleId: string): boolean {
    return this._rules.delete(ruleId);
  }

  /** Get a rule by ID */
  get(ruleId: string): RecommendationRule | undefined {
    return this._rules.get(ruleId);
  }

  /** Get all registered rules */
  getAll(): readonly RecommendationRule[] {
    return Object.freeze([...this._rules.values()]);
  }

  /** Get rules that apply to a specific source */
  getApplicableRules(source: RecommendationSource): readonly RecommendationRule[] {
    return Object.freeze(
      [...this._rules.values()].filter(r => r.appliesTo.includes(source)),
    );
  }

  /** Get rules by type */
  getByType(type: RecommendationRuleType): readonly RecommendationRule[] {
    return Object.freeze(
      [...this._rules.values()].filter(r => r.type === type),
    );
  }

  /** Get the number of registered rules */
  get size(): number {
    return this._rules.size;
  }

  /** Check if a rule is registered */
  has(ruleId: string): boolean {
    return this._rules.has(ruleId);
  }

  /** Clear all rules */
  clear(): void {
    this._rules.clear();
  }
}

/** Create a default rule registry with all 14 built-in rules */
export function createDefaultRuleRegistry(): RuleRegistry {
  return new RuleRegistry(BUILT_IN_RULES);
}

// ─── Internal Helpers ───────────────────────────────────────

function mapSeverity(severity: any): RecommendationSeverity {
  switch (severity) {
    case 'Critical': return RecommendationSeverity.Critical;
    case 'High': return RecommendationSeverity.High;
    case 'Medium': return RecommendationSeverity.Medium;
    case 'Low': return RecommendationSeverity.Low;
    case 'Info': return RecommendationSeverity.Informational;
    default: return RecommendationSeverity.Medium;
  }
}

function severityToRiskReduction(severity: any): number {
  switch (severity) {
    case 'Critical': return 0.9;
    case 'High': return 0.7;
    case 'Medium': return 0.5;
    case 'Low': return 0.3;
    case 'Info': return 0.1;
    default: return 0.4;
  }
}

function makeEvidence(
  sourceType: RecommendationSource,
  sourceId: string,
  field: string,
  value: string | number | boolean | null,
  confidence: number,
  description: string,
): RuleResult['evidence'][0] {
  return { sourceType, sourceId, field, value, confidence, description };
}
