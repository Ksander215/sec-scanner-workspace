/**
 * Architecture Compliance & Governance Engine — Public API
 * TASK-AIS-000Z.000
 */

// Types & Enums
export type {
  RuleId, ViolationId, ComplianceReportId, PolicyId, ValidatorId,
  ComplianceSessionId, RuleSetId,
} from './types.js';
export {
  RuleSeverity, RuleCategory, ComplianceState, ViolationState,
  AutoFixCapability, ComplianceRuntimeState, EnforcementLevel,
  ValidationTargetType, ScoreLevel,
} from './types.js';
export type {
  ComplianceRule, ComplianceViolation, CompliancePolicy,
  ValidationRequest, ValidationResult, RuleEvaluationResult,
  ComplianceReport, ComplianceMetrics, RuleSet, CategoryScore,
} from './types.js';
export type {
  RuleEngineConfig, PolicyEngineConfig, ValidatorConfig,
  ReportGeneratorConfig, MetricsConfig, ComplianceRuntimeConfig,
} from './types.js';
export { DefaultComplianceRuntimeConfig } from './types.js';

// Contracts
export type {
  IRuleEngine, IPolicyEngine, IValidator,
  IArchitectureValidator, IRuntimeValidator, ICapabilityValidator,
  IDocumentationValidator, ITraceValidator, IValueValidator,
  IConstraintValidator, IPrivacyValidator, ISecurityValidator,
  IQualityValidator, IReportGenerator, IComplianceMetrics,
  IComplianceRuntime, CompliancePublicContracts,
} from './contracts.js';

// Errors
export {
  ComplianceError, RuleNotFoundError, RuleAlreadyRegisteredError,
  RuleEvaluationError, RuleEvaluationTimeoutError, RuleLimitExceededError,
  PolicyNotFoundError, PolicyAlreadyRegisteredError, PolicyLimitExceededError,
  ValidationError, ValidationTimeoutError, BlockingViolationError,
  ComplianceRuntimeError, ComplianceNotInitializedError,
  ReportGenerationError, ViolationNotFoundError,
} from './errors.js';

// Events
export type {
  RulePassedEvent, RuleFailedEvent, RuleRegisteredEvent,
  RuleUnregisteredEvent, ComplianceStartedEvent, ComplianceCompletedEvent,
  ViolationDetectedEvent, ViolationResolvedEvent, ReportGeneratedEvent,
  PolicyRegisteredEvent, ComplianceEvent,
} from './events.js';

// Branded ID helpers
export {
  brandRuleId, brandViolationId, brandComplianceReportId,
  brandPolicyId, brandValidatorId, brandComplianceSessionId, brandRuleSetId,
} from './types.js';

// Subsystems
export { RuleEngine } from './rule-engine.js';
export { PolicyEngine } from './policy-engine.js';
export { ReportGenerator } from './report-generator.js';
export { ComplianceMetricsRuntime } from './compliance-metrics.js';
export { ComplianceRuntime } from './compliance-runtime.js';

// Validators
export { ArchitectureValidator } from './architecture-validator.js';
export { RuntimeValidator } from './runtime-validator.js';
export { CapabilityValidator } from './capability-validator.js';
export { DocumentationValidator } from './documentation-validator.js';
export { TraceValidator } from './trace-validator.js';
export { ValueValidator } from './value-validator.js';
export { ConstraintValidator } from './constraint-validator.js';
export { PrivacyValidator } from './privacy-validator.js';
export { SecurityValidator } from './security-validator.js';
export { QualityValidator } from './quality-validator.js';
