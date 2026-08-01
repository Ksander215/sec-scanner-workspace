/**
 * Solution Builder Runtime — Error Hierarchy
 * TASK-AIS-010A.000
 */

export class SolutionBuilderError extends Error {
  readonly code: string;
  readonly timestamp: string;
  readonly context: Readonly<Record<string, unknown>>;
  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'SolutionBuilderError';
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.context = Object.freeze({ ...context });
  }
}

export class InvalidGoalError extends SolutionBuilderError {
 readonly goalId: string;
  constructor(goalId: string, reason: string, context?: Record<string, unknown>) {
    super('INVALID_GOAL', `Invalid goal ${goalId}: ${reason}`, { goalId, reason, ...context });
    this.name = 'InvalidGoalError';
    this.goalId = goalId;
  }
}

export class RequirementConflictError extends SolutionBuilderError {
  constructor(reqId1: string, reqId2: string, reason: string, context?: Record<string, unknown>) {
    super('REQUIREMENT_CONFLICT', `Conflict between ${reqId1} and ${reqId2}: ${reason}`, { reqId1, reqId2, reason, ...context });
    this.name = 'RequirementConflictError';
  }
}

export class MissingCapabilityError extends SolutionBuilderError {
  readonly capabilityName: string;
  constructor(capabilityName: string, context?: Record<string, unknown>) {
    super('MISSING_CAPABILITY', `Required capability not found: ${capabilityName}`, { capabilityName, ...context });
    this.name = 'MissingCapabilityError';
    this.capabilityName = capabilityName;
  }
}

export class SolutionValidationError extends SolutionBuilderError {
 readonly solutionId: string;
 constructor(solutionId: string, reason: string, context?: Record<string, unknown>) {
    super('SOLUTION_VALIDATION_ERROR', `Solution ${solutionId} validation failed: ${reason}`, { solutionId, reason, ...context });
    this.name = 'SolutionValidationError';
    this.solutionId = solutionId;
  }
}

export class DeploymentPlanningError extends SolutionBuilderError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('DEPLOYMENT_PLANNING_ERROR', `Deployment planning failed: ${reason}`, { reason, ...context });
    this.name = 'DeploymentPlanningError';
  }
}

export class UnsupportedDomainError extends SolutionBuilderError {
  readonly domainName: string;
  constructor(domainName: string, context?: Record<string, unknown>) {
    super('UNSUPPORTED_DOMAIN', `Unsupported business domain: ${domainName}`, { domainName, ...context });
    this.name = 'UnsupportedDomainError';
    this.domainName = domainName;
  }
}

export class OptimizationFailedError extends SolutionBuilderError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('OPTIMIZATION_FAILED', `Optimization failed: ${reason}`, { reason, ...context });
    this.name = 'OptimizationFailedError';
  }
}

export class ManifestValidationError extends SolutionBuilderError {
  readonly field: string;
  constructor(field: string, reason: string, context?: Record<string, unknown>) {
    super('MANIFEST_VALIDATION_ERROR', `Manifest field '${field}' invalid: ${reason}`, { field, reason, ...context });
    this.name = 'ManifestValidationError';
    this.field = field;
  }
}

export class LifecycleTransitionError extends SolutionBuilderError {
  readonly solutionId: string;
  readonly fromState: string;
  readonly toState: string;
  constructor(solutionId: string, fromState: string, toState: string, context?: Record<string, unknown>) {
    super('LIFECYCLE_TRANSITION_ERROR', `Cannot transition solution ${solutionId} from ${fromState} to ${toState}`, { solutionId, fromState, toState, ...context });
    this.name = 'LifecycleTransitionError';
    this.solutionId = solutionId;
    this.fromState = fromState;
  this.toState = toState;
  }
}

export class SolutionNotFoundError extends SolutionBuilderError {
  readonly solutionId: string;
  constructor(solutionId: string, context?: Record<string, unknown>) {
    super('SOLUTION_NOT_FOUND', `Solution not found: ${solutionId}`, { solutionId, ...context });
    this.name = 'SolutionNotFoundError';
    this.solutionId = solutionId;
  }
}

export class SolutionLimitExceededError extends SolutionBuilderError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('SOLUTION_LIMIT_EXCEEDED', `Maximum solutions exceeded: ${max}`, { max, ...context });
    this.name = 'SolutionLimitExceededError';
  }
}

export class GoalLimitExceededError extends SolutionBuilderError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('GOAL_LIMIT_EXCEEDED', `Maximum goals exceeded: ${max}`, { max, ...context });
    this.name = 'GoalLimitExceededError';
  }
}

export class RequirementLimitExceededError extends SolutionBuilderError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('REQUIREMENT_LIMIT_EXCEEDED', `Maximum requirements exceeded: ${max}`, { max, ...context });
    this.name = 'RequirementLimitExceededError';
  }
}

export class BlueprintLimitExceededError extends SolutionBuilderError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('BLUEPRINT_LIMIT_EXCEEDED', `Maximum blueprints exceeded: ${max}`, { max, ...context });
    this.name = 'BlueprintLimitExceededError';
  }
}

export class WorkflowCompositionError extends SolutionBuilderError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('WORKFLOW_COMPOSITION_ERROR', `Workflow composition failed: ${reason}`, { reason, ...context });
    this.name = 'WorkflowCompositionError';
  }
}

export class KnowledgeCompositionError extends SolutionBuilderError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('KNOWLEDGE_COMPOSITION_ERROR', `Knowledge composition failed: ${reason}`, { reason, ...context });
    this.name = 'KnowledgeCompositionError';
  }
}

export class AIConfigurationError extends SolutionBuilderError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('AI_CONFIGURATION_ERROR', `AI configuration failed: ${reason}`, { reason, ...context });
    this.name = 'AIConfigurationError';
  }
}

export class DesktopCompositionError extends SolutionBuilderError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('DESKTOP_COMPOSITION_ERROR', `Desktop composition failed: ${reason}`, { reason, ...context });
    this.name = 'DesktopCompositionError';
  }
}

export class CatalogLimitExceededError extends SolutionBuilderError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('CATALOG_LIMIT_EXCEEDED', `Maximum catalog entries exceeded: ${max}`, { max, ...context });
    this.name = 'CatalogLimitExceededError';
  }
}

export class SolutionBuilderRuntimeError extends SolutionBuilderError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('SOLUTION_BUILDER_RUNTIME_ERROR', `Solution Builder runtime error: ${reason}`, { reason, ...context });
    this.name = 'SolutionBuilderRuntimeError';
  }
}

export class SolutionBuilderNotInitializedError extends SolutionBuilderError {
  constructor(context?: Record<string, unknown>) {
    super('SOLUTION_BUILDER_NOT_INITIALIZED', 'Solution Builder runtime is not initialized', { ...context });
    this.name = 'SolutionBuilderNotInitializedError';
  }
}

export class SolutionBuilderDisposedError extends SolutionBuilderError {
  constructor(context?: Record<string, unknown>) {
    super('SOLUTION_BUILDER_DISPOSED', 'Solution Builder runtime has been disposed', { ...context });
    this.name = 'SolutionBuilderDisposedError';
  }
}

export class NoValueProofError extends SolutionBuilderError {
  readonly solutionId: string;
  constructor(solutionId: string, context?: Record<string, unknown>) {
    super('NO_VALUE_PROOF', `Solution ${solutionId} lacks proof of value creation (PHI-007)`, { solutionId, ...context });
    this.name = 'NoValueProofError';
    this.solutionId = solutionId;
  }
}

export class OptimizationWithoutValueError extends SolutionBuilderError {
  readonly solutionId: string;
  constructor(solutionId: string, context?: Record<string, unknown>) {
    super('OPTIMIZATION_WITHOUT_VALUE', `Solution ${solutionId} optimizes without creating value (PHI-005)`, { solutionId, ...context });
    this.name = 'OptimizationWithoutValueError';
    this.solutionId = solutionId;
  }
}
