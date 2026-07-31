/**
 * Architecture Compliance & Governance Engine — Public Contracts
 * TASK-AIS-000Z.000
 *
 * Public-facing interfaces for every subsystem.
 * These are the ONLY APIs other Runtimes may depend on.
 */

import type {
  RuleId, ViolationId, PolicyId, ValidatorId,
  ComplianceSessionId,
  RuleSeverity, RuleCategory, ComplianceState,
  ComplianceRule, ComplianceViolation, CompliancePolicy,
  ValidationRequest, ValidationResult, RuleEvaluationResult,
  ComplianceReport, ComplianceMetrics,
  CategoryScore, ScoreLevel,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════
// RULE ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IRuleEngine {
  registerRule(rule: ComplianceRule): Promise<void>;
  unregisterRule(ruleId: RuleId): Promise<void>;
  getRule(ruleId: RuleId): Promise<ComplianceRule | null>;
  listRules(filter?: Partial<{ category: RuleCategory; severity: RuleSeverity; enabled: boolean }>): Promise<readonly ComplianceRule[]>;
  evaluateRule(ruleId: RuleId, request: ValidationRequest): Promise<RuleEvaluationResult>;
  evaluateRules(request: ValidationRequest): Promise<ValidationResult>;
  enableRule(ruleId: RuleId): Promise<void>;
  disableRule(ruleId: RuleId): Promise<void>;
  count(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════
// POLICY ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IPolicyEngine {
  registerPolicy(policy: CompliancePolicy): Promise<void>;
  unregisterPolicy(policyId: PolicyId): Promise<void>;
  getPolicy(policyId: PolicyId): Promise<CompliancePolicy | null>;
  listPolicies(): Promise<readonly CompliancePolicy[]>;
  evaluatePolicy(policyId: PolicyId, request: ValidationRequest): Promise<ValidationResult>;
  getRulesForPolicy(policyId: PolicyId): Promise<readonly RuleId[]>;
  count(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATOR CONTRACTS
// ═══════════════════════════════════════════════════════════════════

export interface IValidator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly category: RuleCategory;
  validate(request: ValidationRequest): Promise<RuleEvaluationResult[]>;
}

export interface IArchitectureValidator extends IValidator {
  validateArchitecture(modulePath: string, content: string, sessionId: ComplianceSessionId): Promise<RuleEvaluationResult[]>;
}

export interface IRuntimeValidator extends IValidator {
  validateRuntime(runtimePath: string, sessionId: ComplianceSessionId): Promise<RuleEvaluationResult[]>;
}

export interface ICapabilityValidator extends IValidator {
  validateCapability(capabilityPath: string, sessionId: ComplianceSessionId): Promise<RuleEvaluationResult[]>;
}

export interface IDocumentationValidator extends IValidator {
  validateDocumentation(docPath: string, content: string, sessionId: ComplianceSessionId): Promise<RuleEvaluationResult[]>;
}

export interface ITraceValidator extends IValidator {
  validateTraceability(artifactPath: string, content: string, sessionId: ComplianceSessionId): Promise<RuleEvaluationResult[]>;
}

export interface IValueValidator extends IValidator {
  validateValueCompliance(runtimePath: string, sessionId: ComplianceSessionId): Promise<RuleEvaluationResult[]>;
}

export interface IConstraintValidator extends IValidator {
  validateConstraintCompliance(runtimePath: string, sessionId: ComplianceSessionId): Promise<RuleEvaluationResult[]>;
}

export interface IPrivacyValidator extends IValidator {
  validatePrivacy(modulePath: string, content: string, sessionId: ComplianceSessionId): Promise<RuleEvaluationResult[]>;
}

export interface ISecurityValidator extends IValidator {
  validateSecurity(modulePath: string, content: string, sessionId: ComplianceSessionId): Promise<RuleEvaluationResult[]>;
}

export interface IQualityValidator extends IValidator {
  validateQuality(modulePath: string, content: string, sessionId: ComplianceSessionId): Promise<RuleEvaluationResult[]>;
}

// ═══════════════════════════════════════════════════════════════════
// REPORT GENERATOR CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IReportGenerator {
  generateReport(results: readonly ValidationResult[], sessionId: ComplianceSessionId): Promise<ComplianceReport>;
  getCategoryScores(results: readonly ValidationResult[]): CategoryScore[];
  getOverallScore(results: readonly ValidationResult[]): number;
  getScoreLevel(score: number): ScoreLevel;
}

// ═══════════════════════════════════════════════════════════════════
// COMPLIANCE METRICS CONTRACT
// ═════════════════════════════════════════════════════════════════

export interface IComplianceMetrics {
  recordResult(result: ValidationResult): void;
  recordViolation(violation: ComplianceViolation): void;
  recordResolution(violationId: ViolationId): void;
  getMetrics(): ComplianceMetrics;
  getMetricsByCategory(category: RuleCategory): ComplianceMetrics;
  reset(): void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPLIANCE RUNTIME CONTRACT (DASHBOARD API)
// ═════════════════════════════════════════════════════════════════

export interface IComplianceRuntime {
  readonly state: ComplianceState;
  validateArchitecture(modulePath: string, content?: string): Promise<ValidationResult>;
  validateRuntime(runtimePath: string): Promise<ValidationResult>;
  validateCapability(capabilityPath: string): Promise<ValidationResult>;
  validateDocumentation(docPath: string, content?: string): Promise<ValidationResult>;
  validateRepository(rootPath: string): Promise<ValidationResult>;
  generateComplianceReport(): Promise<ComplianceReport>;
  getMetrics(): Promise<ComplianceMetrics>;
  getRule(ruleId: RuleId): Promise<ComplianceRule | null>;
  listRules(category?: RuleCategory): Promise<readonly ComplianceRule[]>;
  getPolicy(policyId: PolicyId): Promise<CompliancePolicy | null>;
  listPolicies(): Promise<readonly CompliancePolicy[]>;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC CONTRACTS BUNDLE
// ═════════════════════════════════════════════════════════════════

export interface CompliancePublicContracts {
  readonly ruleEngine: IRuleEngine;
  readonly policyEngine: IPolicyEngine;
  readonly reportGenerator: IReportGenerator;
  readonly complianceMetrics: IComplianceMetrics;
  readonly complianceRuntime: IComplianceRuntime;
}
