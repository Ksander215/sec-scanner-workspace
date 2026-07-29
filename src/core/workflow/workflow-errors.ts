/**
 * Workflow Runtime — Error Hierarchy
 * TASK-AIS-003H.000
 *
 * Structured errors for the workflow runtime. Each error carries a `code`
 * for programmatic handling without re-parsing messages.
 */

// ─── Base ─────────────────────────────────────────────────────

export class WorkflowError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ─── Workflow Not Found ─────────────────────────────────────────

export class WorkflowNotFoundError extends WorkflowError {
  readonly workflowId: string;

  constructor(workflowId: string) {
    super(`Workflow not found: id="${workflowId}"`, 'WORKFLOW_NOT_FOUND');
    this.name = 'WorkflowNotFoundError';
    this.workflowId = workflowId;
  }
}

// ─── Workflow Instance Not Found ────────────────────────────────

export class WorkflowInstanceNotFoundError extends WorkflowError {
  readonly instanceId: string;

  constructor(instanceId: string) {
    super(`Workflow instance not found: id="${instanceId}"`, 'WORKFLOW_INSTANCE_NOT_FOUND');
    this.name = 'WorkflowInstanceNotFoundError';
    this.instanceId = instanceId;
  }
}

// ─── Workflow Already Exists ───────────────────────────────────

export class WorkflowDuplicateError extends WorkflowError {
  readonly workflowName: string;

  constructor(name: string) {
    super(`Workflow already exists: "${name}"`, 'WORKFLOW_DUPLICATE');
    this.name = 'WorkflowDuplicateError';
    this.workflowName = name;
  }
}

// ─── Invalid State Transition ──────────────────────────────────

export class WorkflowStateError extends WorkflowError {
  readonly current: string;
  readonly target: string;
  readonly workflowId?: string;

  constructor(current: string, target: string, workflowId?: string) {
    super(
      `Invalid workflow state transition: ${current} → ${target}${workflowId ? ` (id="${workflowId}")` : ''}`,
      'WORKFLOW_STATE_ERROR',
    );
    this.name = 'WorkflowStateError';
    this.current = current;
    this.target = target;
    this.workflowId = workflowId;
  }
}

// ─── Stage Not Found ────────────────────────────────────────────

export class StageNotFoundError extends WorkflowError {
  readonly stageId: string;
  readonly workflowId?: string;

  constructor(stageId: string, workflowId?: string) {
    super(
      `Stage not found: id="${stageId}"${workflowId ? ` in workflow="${workflowId}"` : ''}`,
      'STAGE_NOT_FOUND',
    );
    this.name = 'StageNotFoundError';
    this.stageId = stageId;
    this.workflowId = workflowId;
  }
}

// ─── Stage State Error ─────────────────────────────────────────

export class StageStateError extends WorkflowError {
  readonly stageId: string;
  readonly current: string;
  readonly target: string;

  constructor(stageId: string, current: string, target: string) {
    super(
      `Invalid stage state transition: stage="${stageId}", ${current} → ${target}`,
      'STAGE_STATE_ERROR',
    );
    this.name = 'StageStateError';
    this.stageId = stageId;
    this.current = current;
    this.target = target;
  }
}

// ─── Stage Execution Error ──────────────────────────────────────

export class StageExecutionError extends WorkflowError {
  readonly stageId: string;
  readonly attempt: number;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(stageId: string, attempt: number, message: string, retryable: boolean, cause?: unknown) {
    super(
      `Stage execution failed: stage="${stageId}", attempt=${attempt}, message="${message}"`,
      'STAGE_EXECUTION_ERROR',
    );
    this.name = 'StageExecutionError';
    this.stageId = stageId;
    this.attempt = attempt;
    this.retryable = retryable;
    this.cause = cause;
  }
}

// ─── Timeout Error ──────────────────────────────────────────────

export class WorkflowTimeoutError extends WorkflowError {
  readonly stageId?: string;
  readonly timeoutMs: number;

  constructor(timeoutMs: number, stageId?: string) {
    super(
      `Workflow timeout: ${timeoutMs}ms exceeded${stageId ? ` for stage="${stageId}"` : ''}`,
      'WORKFLOW_TIMEOUT',
    );
    this.name = 'WorkflowTimeoutError';
    this.stageId = stageId;
    this.timeoutMs = timeoutMs;
  }
}

// ─── Transition Error ──────────────────────────────────────────

export class WorkflowTransitionError extends WorkflowError {
  readonly fromStageId: string;
  readonly toStageId: string;
  readonly reason: string;

  constructor(from: string, to: string, reason: string) {
    super(
      `Transition failed: "${from}" → "${to}": ${reason}`,
      'WORKFLOW_TRANSITION_ERROR',
    );
    this.name = 'WorkflowTransitionError';
    this.fromStageId = from;
    this.toStageId = to;
    this.reason = reason;
  }
}

// ─── Guard Error ───────────────────────────────────────────────

export class WorkflowGuardError extends WorkflowError {
  readonly guard: string;
  readonly stageId: string;

  constructor(guard: string, stageId: string) {
    super(
      `Guard "${guard}" denied transition at stage "${stageId}"`,
      'WORKFLOW_GUARD_ERROR',
    );
    this.name = 'WorkflowGuardError';
    this.guard = guard;
    this.stageId = stageId;
  }
}

// ─── Condition Error ───────────────────────────────────────────

export class WorkflowConditionError extends WorkflowError {
  readonly condition: string;
  readonly reason: string;

  constructor(condition: string, reason: string) {
    super(
      `Condition "${condition}" evaluation failed: ${reason}`,
      'WORKFLOW_CONDITION_ERROR',
    );
    this.name = 'WorkflowConditionError';
    this.condition = condition;
    this.reason = reason;
  }
}

// ─── Compensation Error ─────────────────────────────────────────

export class WorkflowCompensationError extends WorkflowError {
  readonly stageId: string;
  readonly action: string;

  constructor(stageId: string, action: string, message: string) {
    super(
      `Compensation failed for stage "${stageId}": action="${action}", ${message}`,
      'WORKFLOW_COMPENSATION_ERROR',
    );
    this.name = 'WorkflowCompensationError';
    this.stageId = stageId;
    this.action = action;
  }
}

// ─── Variable Error ─────────────────────────────────────────────

export class WorkflowVariableError extends WorkflowError {
  readonly scope: string;
  readonly key: string;

  constructor(scope: string, key: string, reason: string) {
    super(
      `Variable error in scope="${scope}", key="${key}": ${reason}`,
      'WORKFLOW_VARIABLE_ERROR',
    );
    this.name = 'WorkflowVariableError';
    this.scope = scope;
    this.key = key;
  }
}

// ─── Recovery Error ────────────────────────────────────────────

export class WorkflowRecoveryError extends WorkflowError {
  readonly instanceId: string;

  constructor(instanceId: string, reason: string) {
    super(
      `Workflow recovery failed for instance "${instanceId}": ${reason}`,
      'WORKFLOW_RECOVERY_ERROR',
    );
    this.name = 'WorkflowRecoveryError';
    this.instanceId = instanceId;
  }
}

// ─── Version Error ──────────────────────────────────────────────

export class WorkflowVersionError extends WorkflowError {
  readonly current: string;
  readonly target: string;

  constructor(current: string, target: string, reason: string) {
    super(
      `Workflow version error: ${current} → ${target}: ${reason}`,
      'WORKFLOW_VERSION_ERROR',
    );
    this.name = 'WorkflowVersionError';
    this.current = current;
    this.target = target;
  }
}

// ─── Policy Violation ──────────────────────────────────────────

export class WorkflowPolicyViolationError extends WorkflowError {
  readonly policyName: string;
  readonly details: readonly string[];

  constructor(policyName: string, details: readonly string[]) {
    super(
      `Workflow policy violation: "${policyName}": ${details.join('; ')}`,
      'WORKFLOW_POLICY_VIOLATION',
    );
    this.name = 'WorkflowPolicyViolationError';
    this.policyName = policyName;
    this.details = details;
  }
}

// ─── Handler Not Found ───────────────────────────────────────────

export class WorkflowHandlerNotFoundError extends WorkflowError {
  readonly handlerName: string;

  constructor(handlerName: string) {
    super(`Stage handler not found: "${handlerName}"`, 'WORKFLOW_HANDLER_NOT_FOUND');
    this.name = 'WorkflowHandlerNotFoundError';
    this.handlerName = handlerName;
  }
}

// ─── Runtime Disposed ──────────────────────────────────────────

export class WorkflowDisposedError extends WorkflowError {
  constructor() {
    super('Workflow Runtime has been disposed', 'WORKFLOW_DISPOSED');
    this.name = 'WorkflowDisposedError';
  }
}

// ─── Validation Error ───────────────────────────────────────────

export class WorkflowValidationError extends WorkflowError {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Workflow validation failed: ${issues.join('; ')}`, 'WORKFLOW_VALIDATION_ERROR');
    this.name = 'WorkflowValidationError';
    this.issues = issues;
  }
}

// ─── Checkpoint Error ───────────────────────────────────────────

export class WorkflowCheckpointError extends WorkflowError {
  readonly instanceId: string;

  constructor(instanceId: string, reason: string) {
    super(
      `Checkpoint error for instance "${instanceId}": ${reason}`,
      'WORKFLOW_CHECKPOINT_ERROR',
    );
    this.name = 'WorkflowCheckpointError';
    this.instanceId = instanceId;
  }
}

// ─── Scheduler Error ────────────────────────────────────────────

export class WorkflowSchedulerError extends WorkflowError {
  readonly stageId: string;
  readonly reason: string;

  constructor(stageId: string, reason: string) {
    super(
      `Scheduler error for stage "${stageId}": ${reason}`,
      'WORKFLOW_SCHEDULER_ERROR',
    );
    this.name = 'WorkflowSchedulerError';
    this.stageId = stageId;
    this.reason = reason;
  }
}
