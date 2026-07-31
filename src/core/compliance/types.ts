/**
 * Architecture Compliance & Governance Engine — Types, Enums, Interfaces
 * TASK-AIS-000Z.000
 *
 * Core type definitions:
 *   - Branded identifiers (RuleId, ViolationId, ComplianceReportId, etc.)
 *   - Enums (RuleSeverity, RuleCategory, ComplianceState, etc.)
 *   - Domain entities (Rule, Violation, ComplianceReport, etc.)
 *   - Configuration (ComplianceRuntimeConfig, subsystem configs)
 *
 * Architecture: SOLID, DDD, Event-Driven
 * Conforms to: CON-001.000, ARC-001.001, PHI-001.000, GOV-008.000
 */

import type { Timestamp, Identifier, SemVer } from '../types/common.js';

export type { Timestamp, SemVer };

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type RuleId = Identifier & { readonly __brand: 'ComplianceRuleId' };
export type ViolationId = Identifier & { readonly __brand: 'ComplianceViolationId' };
export type ComplianceReportId = Identifier & { readonly __brand: 'ComplianceReportId' };
export type PolicyId = Identifier & { readonly __brand: 'CompliancePolicyId' };
export type ValidatorId = Identifier & { readonly __brand: 'ComplianceValidatorId' };
export type ComplianceSessionId = Identifier & { readonly __brand: 'ComplianceSessionId' };
export type RuleSetId = Identifier & { readonly __brand: 'RuleSetId' };

function brandRuleId(id: string): RuleId { return id as RuleId; }
function brandViolationId(id: string): ViolationId { return id as ViolationId; }
function brandComplianceReportId(id: string): ComplianceReportId { return id as ComplianceReportId; }
function brandPolicyId(id: string): PolicyId { return id as PolicyId; }
function brandValidatorId(id: string): ValidatorId { return id as ValidatorId; }
function brandComplianceSessionId(id: string): ComplianceSessionId { return id as ComplianceSessionId; }
function brandRuleSetId(id: string): RuleSetId { return id as RuleSetId; }

export {
  brandRuleId, brandViolationId, brandComplianceReportId, brandPolicyId,
  brandValidatorId, brandComplianceSessionId, brandRuleSetId,
};

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

/** Rule severity levels — ordered by severity */
export enum RuleSeverity {
  Info = 'Info',
  Warning = 'Warning',
  Error = 'Error',
  Critical = 'Critical',
}

/** Rule categories */
export enum RuleCategory {
  Architecture = 'Architecture',
  Philosophy = 'Philosophy',
  Governance = 'Governance',
  Runtime = 'Runtime',
  AI = 'AI',
  Documentation = 'Documentation',
  CapabilityPack = 'CapabilityPack',
  Privacy = 'Privacy',
  Security = 'Security',
  Quality = 'Quality',
}

/** Compliance check state */
export enum ComplianceState {
  Idle = 'Idle',
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed',
  PartiallyCompleted = 'PartiallyCompleted',
}

/** Violation state */
export enum ViolationState {
  Detected = 'Detected',
  Acknowledged = 'Acknowledged',
  Resolved = 'Resolved',
  WontFix = 'WontFix',
  Suppressed = 'Suppressed',
}

/** Auto-fix capability */
export enum AutoFixCapability {
  None = 'None',
  Suggested = 'Suggested',
  Automatic = 'Automatic',
}

/** Compliance Runtime lifecycle state */
export enum ComplianceRuntimeState {
  Uninitialized = 'Uninitialized',
  Initializing = 'Initializing',
  Ready = 'Ready',
  Running = 'Running',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Error = 'Error',
}

/** Enforcement level from GOV-008.000 */
export enum EnforcementLevel {
  Advisory = 'Advisory',
  Blocking = 'Blocking',
}

/** Validation target type */
export enum ValidationTargetType {
  Architecture = 'Architecture',
  Runtime = 'Runtime',
  CapabilityPack = 'CapabilityPack',
  Documentation = 'Documentation',
  Repository = 'Repository',
  PullRequest = 'PullRequest',
}

/** Score level */
export enum ScoreLevel {
  Excellent = 'Excellent',
  Good = 'Good',
  Acceptable = 'Acceptable',
  NeedsImprovement = 'NeedsImprovement',
  Failing = 'Failing',
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES
// ═══════════════════════════════════════════════════════════════════

/** A single compliance rule */
export interface ComplianceRule {
  readonly id: RuleId;
  readonly name: string;
  readonly description: string;
  readonly category: RuleCategory;
  readonly severity: RuleSeverity;
  readonly enforcementLevel: EnforcementLevel;
  readonly autoFix: AutoFixCapability;
  readonly source: string;           // e.g. 'PHI-001.000 §6', 'GOV-008.000 §5'
  readonly validatorId: ValidatorId;
  readonly enabled: boolean;
  readonly tags: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A compliance violation */
export interface ComplianceViolation {
  readonly id: ViolationId;
  readonly ruleId: RuleId;
  readonly ruleName: string;
  readonly category: RuleCategory;
  readonly severity: RuleSeverity;
  readonly enforcementLevel: EnforcementLevel;
  readonly state: ViolationState;
  readonly description: string;
  readonly evidence: readonly string[];
  readonly recommendation: string;
  readonly autoFixAvailable: AutoFixCapability;
  readonly target: string;           // file, module, or artifact that violated
  readonly detectedAt: Timestamp;
  readonly resolvedAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Validation input */
export interface ValidationRequest {
  readonly targetType: ValidationTargetType;
  readonly targetPath: string;
  readonly targetContent?: string;
  readonly ruleIds?: readonly RuleId[];
  readonly categories?: readonly RuleCategory[];
  readonly sessionId: ComplianceSessionId;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Single rule evaluation result */
export interface RuleEvaluationResult {
  readonly ruleId: RuleId;
  readonly ruleName: string;
  readonly category: RuleCategory;
  readonly severity: RuleSeverity;
  readonly passed: boolean;
  readonly violations: readonly ComplianceViolation[];
  readonly durationMs: number;
  readonly autoFixed: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Result of a full validation pass */
export interface ValidationResult {
  readonly sessionId: ComplianceSessionId;
  readonly targetType: ValidationTargetType;
  readonly targetPath: string;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly durationMs: number;
  readonly results: readonly RuleEvaluationResult[];
  readonly totalRules: number;
  readonly passedRules: number;
  readonly failedRules: number;
  readonly skippedRules: number;
  readonly violations: readonly ComplianceViolation[];
  readonly autoFixedCount: number;
  readonly state: ComplianceState;
}

/** A compliance policy — interprets governance rules */
export interface CompliancePolicy {
  readonly id: PolicyId;
  readonly name: string;
  readonly description: string;
  readonly source: string;           // e.g. 'GOV-008.000 §3'
  readonly rules: readonly RuleId[];
  readonly enforcementLevel: EnforcementLevel;
  readonly enabled: boolean;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Category score */
export interface CategoryScore {
  readonly category: RuleCategory;
  readonly score: number;             // 0-100
  readonly level: ScoreLevel;
  readonly totalRules: number;
  readonly passedRules: number;
  readonly failedRules: number;
  readonly criticalViolations: number;
}

/** Full compliance report */
export interface ComplianceReport {
  readonly id: ComplianceReportId;
  readonly sessionId: ComplianceSessionId;
  readonly generatedAt: Timestamp;
  readonly durationMs: number;
  readonly overallScore: number;      // 0-100
  readonly overallLevel: ScoreLevel;
  readonly categoryScores: readonly CategoryScore[];
  readonly architectureScore: number;
  readonly governanceScore: number;
  readonly documentationScore: number;
  readonly qualityScore: number;
  readonly privacyScore: number;
  readonly securityScore: number;
  readonly totalRules: number;
  readonly totalPassed: number;
  readonly totalFailed: number;
  readonly totalViolations: number;
  readonly criticalViolations: number;
  readonly violations: readonly ComplianceViolation[];
  readonly validationResults: readonly ValidationResult[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Compliance metrics snapshot */
export interface ComplianceMetrics {
  readonly totalViolations: number;
  readonly violationsBySeverity: Readonly<Record<RuleSeverity, number>>;
  readonly violationsByCategory: Readonly<Record<RuleCategory, number>>;
  readonly violationsByState: Readonly<Record<ViolationState, number>>;
  readonly averageCheckDurationMs: number;
  readonly ruleCoverage: number;      // 0-1
  readonly autoFixCount: number;
  readonly autoFixSuccessRate: number;
  readonly overallComplianceScore: number;
  readonly lastCheckAt: Timestamp | null;
  readonly checksPerformed: number;
  readonly checksPassed: number;
  readonly checksFailed: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Rule set — a named collection of rules */
export interface RuleSet {
  readonly id: RuleSetId;
  readonly name: string;
  readonly description: string;
  readonly rules: readonly RuleId[];
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export interface RuleEngineConfig {
  readonly maxConcurrentEvaluations: number;
  readonly evaluationTimeoutMs: number;
  readonly failFast: boolean;          // stop on first Critical violation
  readonly autoFixEnabled: boolean;
  readonly cacheResults: boolean;
  readonly cacheTtlMs: number;
}

export interface PolicyEngineConfig {
  readonly maxPolicies: number;
  readonly defaultEnforcementLevel: EnforcementLevel;
}

export interface ValidatorConfig {
  readonly enabled: boolean;
  readonly timeoutMs: number;
  readonly maxFileSizeBytes: number;
}

export interface ReportGeneratorConfig {
  readonly includePassedRules: boolean;
  readonly includeEvidence: boolean;
  readonly maxViolationsPerReport: number;
  readonly scoreWeights: Readonly<Record<RuleCategory, number>>;
}

export interface MetricsConfig {
  readonly retentionPeriodMs: number;
  readonly aggregationWindowMs: number;
}

export interface ComplianceRuntimeConfig {
  readonly ruleEngine: RuleEngineConfig;
  readonly policyEngine: PolicyEngineConfig;
  readonly validators: ValidatorConfig;
  readonly reportGenerator: ReportGeneratorConfig;
  readonly metrics: MetricsConfig;
  readonly eventBusEnabled: boolean;
}

export const DefaultComplianceRuntimeConfig: ComplianceRuntimeConfig = Object.freeze({
  ruleEngine: Object.freeze({
    maxConcurrentEvaluations: 10,
    evaluationTimeoutMs: 30000,
    failFast: false,
    autoFixEnabled: true,
    cacheResults: true,
    cacheTtlMs: 300000,
  }),
  policyEngine: Object.freeze({
    maxPolicies: 100,
    defaultEnforcementLevel: EnforcementLevel.Advisory,
  }),
  validators: Object.freeze({
    enabled: true,
    timeoutMs: 60000,
    maxFileSizeBytes: 10 * 1024 * 1024,
  }),
  reportGenerator: Object.freeze({
    includePassedRules: false,
    includeEvidence: true,
    maxViolationsPerReport: 1000,
    scoreWeights: Object.freeze({
      [RuleCategory.Architecture]: 0.20,
      [RuleCategory.Philosophy]: 0.10,
      [RuleCategory.Governance]: 0.20,
      [RuleCategory.Runtime]: 0.10,
      [RuleCategory.AI]: 0.10,
      [RuleCategory.Documentation]: 0.05,
      [RuleCategory.CapabilityPack]: 0.05,
      [RuleCategory.Privacy]: 0.10,
      [RuleCategory.Security]: 0.10,
      [RuleCategory.Quality]: 0.10,
    }),
  }),
  metrics: Object.freeze({
    retentionPeriodMs: 24 * 60 * 60 * 1000,
    aggregationWindowMs: 60 * 60 * 1000,
  }),
  eventBusEnabled: true,
} as ComplianceRuntimeConfig);
