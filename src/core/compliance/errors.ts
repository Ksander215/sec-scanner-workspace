/**
 * Architecture Compliance & Governance Engine — Error Hierarchy
 * TASK-AIS-000Z.000
 *
 * All errors extend ComplianceError.
 * Every error has a code, message, and optional context.
 */

// ═══════════════════════════════════════════════════════════════════
// BASE ERROR
// ═══════════════════════════════════════════════════════════════════

export class ComplianceError extends Error {
  readonly code: string;
  readonly timestamp: string;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ComplianceError';
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.context = Object.freeze({ ...context });
  }
}

// ═══════════════════════════════════════════════════════════════════
// RULE ERRORS
// ═══════════════════════════════════════════════════════════════════

export class RuleNotFoundError extends ComplianceError {
  readonly ruleId: string;
  constructor(ruleId: string, context?: Record<string, unknown>) {
    super('RULE_NOT_FOUND', `Rule not found: ${ruleId}`, { ruleId, ...context });
    this.name = 'RuleNotFoundError';
    this.ruleId = ruleId;
  }
}

export class RuleAlreadyRegisteredError extends ComplianceError {
  readonly ruleId: string;
  constructor(ruleId: string, context?: Record<string, unknown>) {
    super('RULE_ALREADY_REGISTERED', `Rule already registered: ${ruleId}`, { ruleId, ...context });
    this.name = 'RuleAlreadyRegisteredError';
    this.ruleId = ruleId;
  }
}

export class RuleEvaluationError extends ComplianceError {
  readonly ruleId: string;
  constructor(ruleId: string, reason: string, context?: Record<string, unknown>) {
    super('RULE_EVALUATION_ERROR', `Rule evaluation failed for ${ruleId}: ${reason}`, { ruleId, ...context });
    this.name = 'RuleEvaluationError';
    this.ruleId = ruleId;
  }
}

export class RuleEvaluationTimeoutError extends ComplianceError {
  readonly ruleId: string;
  constructor(ruleId: string, timeoutMs: number, context?: Record<string, unknown>) {
    super('RULE_EVALUATION_TIMEOUT', `Rule ${ruleId} timed out after ${timeoutMs}ms`, { ruleId, timeoutMs, ...context });
    this.name = 'RuleEvaluationTimeoutError';
    this.ruleId = ruleId;
  }
}

export class RuleLimitExceededError extends ComplianceError {
  constructor(maxRules: number, context?: Record<string, unknown>) {
    super('RULE_LIMIT_EXCEEDED', `Maximum number of rules exceeded: ${maxRules}`, { maxRules, ...context });
    this.name = 'RuleLimitExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// POLICY ERRORS
// ═══════════════════════════════════════════════════════════════════

export class PolicyNotFoundError extends ComplianceError {
  readonly policyId: string;
  constructor(policyId: string, context?: Record<string, unknown>) {
    super('POLICY_NOT_FOUND', `Policy not found: ${policyId}`, { policyId, ...context });
    this.name = 'PolicyNotFoundError';
    this.policyId = policyId;
  }
}

export class PolicyAlreadyRegisteredError extends ComplianceError {
  readonly policyId: string;
  constructor(policyId: string, context?: Record<string, unknown>) {
    super('POLICY_ALREADY_REGISTERED', `Policy already registered: ${policyId}`, { policyId, ...context });
    this.name = 'PolicyAlreadyRegisteredError';
    this.policyId = policyId;
  }
}

export class PolicyLimitExceededError extends ComplianceError {
  constructor(maxPolicies: number, context?: Record<string, unknown>) {
    super('POLICY_LIMIT_EXCEEDED', `Maximum number of policies exceeded: ${maxPolicies}`, { maxPolicies, ...context });
    this.name = 'PolicyLimitExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATION ERRORS
// ═══════════════════════════════════════════════════════════════════

export class ValidationError extends ComplianceError {
  readonly targetPath: string;
  constructor(targetPath: string, reason: string, context?: Record<string, unknown>) {
    super('VALIDATION_ERROR', `Validation failed for ${targetPath}: ${reason}`, { targetPath, ...context });
    this.name = 'ValidationError';
    this.targetPath = targetPath;
  }
}

export class ValidationTimeoutError extends ComplianceError {
  readonly targetPath: string;
  constructor(targetPath: string, timeoutMs: number, context?: Record<string, unknown>) {
    super('VALIDATION_TIMEOUT', `Validation timed out for ${targetPath} after ${timeoutMs}ms`, { targetPath, timeoutMs, ...context });
    this.name = 'ValidationTimeoutError';
    this.targetPath = targetPath;
  }
}

export class BlockingViolationError extends ComplianceError {
  readonly violationIds: readonly string[];
  constructor(violationIds: readonly string[], context?: Record<string, unknown>) {
    super('BLOCKING_VIOLATION', `Blocking violations detected: ${violationIds.length}`, { violationCount: violationIds.length, ...context });
    this.name = 'BlockingViolationError';
    this.violationIds = violationIds;
  }
}

// ═══════════════════════════════════════════════════════════════════
// RUNTIME ERRORS
// ═══════════════════════════════════════════════════════════════════

export class ComplianceRuntimeError extends ComplianceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('COMPLIANCE_RUNTIME_ERROR', `Compliance runtime error: ${reason}`, { ...context });
    this.name = 'ComplianceRuntimeError';
  }
}

export class ComplianceNotInitializedError extends ComplianceError {
  constructor(context?: Record<string, unknown>) {
    super('COMPLIANCE_NOT_INITIALIZED', 'Compliance runtime is not initialized', { ...context });
    this.name = 'ComplianceNotInitializedError';
  }
}

export class ReportGenerationError extends ComplianceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('REPORT_GENERATION_ERROR', `Report generation failed: ${reason}`, { ...context });
    this.name = 'ReportGenerationError';
  }
}

export class ViolationNotFoundError extends ComplianceError {
  readonly violationId: string;
  constructor(violationId: string, context?: Record<string, unknown>) {
    super('VIOLATION_NOT_FOUND', `Violation not found: ${violationId}`, { violationId, ...context });
    this.name = 'ViolationNotFoundError';
    this.violationId = violationId;
  }
}
