/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Error Hierarchy
 * TASK-AIS-008A.000
 *
 * All errors extend EvolutionError.
 * Every error has a code, message, and optional context.
 */

// ═══════════════════════════════════════════════════════════════════
// BASE ERROR
// ═══════════════════════════════════════════════════════════════════

export class EvolutionError extends Error {
  readonly code: string;
  readonly timestamp: string;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'EvolutionError';
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.context = Object.freeze({ ...context });
  }
}

// ═══════════════════════════════════════════════════════════════════
// BOTTLENECK ERRORS
// ═══════════════════════════════════════════════════════════════════

export class BottleneckNotFoundError extends EvolutionError {
  readonly bottleneckId: string;
  constructor(bottleneckId: string, context?: Record<string, unknown>) {
    super('BOTTLENECK_NOT_FOUND', `Bottleneck not found: ${bottleneckId}`, { bottleneckId, ...context });
    this.name = 'BottleneckNotFoundError';
    this.bottleneckId = bottleneckId;
  }
}

export class BottleneckLimitExceededError extends EvolutionError {
  constructor(maxBottlenecks: number, context?: Record<string, unknown>) {
    super('BOTTLENECK_LIMIT_EXCEEDED', `Maximum bottlenecks exceeded: ${maxBottlenecks}`, { maxBottlenecks, ...context });
    this.name = 'BottleneckLimitExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// IMPROVEMENT ERRORS
// ═══════════════════════════════════════════════════════════════════

export class ImprovementNotFoundError extends EvolutionError {
  readonly improvementId: string;
  constructor(improvementId: string, context?: Record<string, unknown>) {
    super('IMPROVEMENT_NOT_FOUND', `Improvement not found: ${improvementId}`, { improvementId, ...context });
    this.name = 'ImprovementNotFoundError';
    this.improvementId = improvementId;
  }
}

export class ImprovementLimitExceededError extends EvolutionError {
  constructor(maxImprovements: number, context?: Record<string, unknown>) {
    super('IMPROVEMENT_LIMIT_EXCEEDED', `Maximum improvements exceeded: ${maxImprovements}`, { maxImprovements, ...context });
    this.name = 'ImprovementLimitExceededError';
  }
}

export class ImprovementStateError extends EvolutionError {
  readonly improvementId: string;
  readonly currentStatus: string;
  readonly targetStatus: string;
  constructor(improvementId: string, currentStatus: string, targetStatus: string, context?: Record<string, unknown>) {
    super('IMPROVEMENT_STATE_ERROR', `Cannot transition improvement ${improvementId} from ${currentStatus} to ${targetStatus}`, { improvementId, currentStatus, targetStatus, ...context });
    this.name = 'ImprovementStateError';
    this.improvementId = improvementId;
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPERIMENT ERRORS
// ═══════════════════════════════════════════════════════════════════

export class ExperimentNotFoundError extends EvolutionError {
  readonly experimentId: string;
  constructor(experimentId: string, context?: Record<string, unknown>) {
    super('EXPERIMENT_NOT_FOUND', `Experiment not found: ${experimentId}`, { experimentId, ...context });
    this.name = 'ExperimentNotFoundError';
    this.experimentId = experimentId;
  }
}

export class ExperimentLimitExceededError extends EvolutionError {
  constructor(maxExperiments: number, context?: Record<string, unknown>) {
    super('EXPERIMENT_LIMIT_EXCEEDED', `Maximum experiments exceeded: ${maxExperiments}`, { maxExperiments, ...context });
    this.name = 'ExperimentLimitExceededError';
  }
}

export class ExperimentStateError extends EvolutionError {
  readonly experimentId: string;
  readonly currentStatus: string;
  readonly targetStatus: string;
  constructor(experimentId: string, currentStatus: string, targetStatus: string, context?: Record<string, unknown>) {
    super('EXPERIMENT_STATE_ERROR', `Cannot transition experiment ${experimentId} from ${currentStatus} to ${targetStatus}`, { experimentId, currentStatus, targetStatus, ...context });
    this.name = 'ExperimentStateError';
    this.experimentId = experimentId;
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
  }
}

export class ExperimentTimeoutError extends EvolutionError {
  readonly experimentId: string;
  constructor(experimentId: string, timeoutMs: number, context?: Record<string, unknown>) {
    super('EXPERIMENT_TIMEOUT', `Experiment ${experimentId} timed out after ${timeoutMs}ms`, { experimentId, timeoutMs, ...context });
    this.name = 'ExperimentTimeoutError';
    this.experimentId = experimentId;
  }
}

// ═══════════════════════════════════════════════════════════════════
// VALUE ERRORS
// ═══════════════════════════════════════════════════════════════════

export class ValueAnalysisError extends EvolutionError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('VALUE_ANALYSIS_ERROR', `Value analysis failed: ${reason}`, { reason, ...context });
    this.name = 'ValueAnalysisError';
  }
}

export class NoValueProofError extends EvolutionError {
  constructor(improvementId: string, context?: Record<string, unknown>) {
    super('NO_VALUE_PROOF', `Improvement ${improvementId} lacks proof of value creation (PHI-007)`, { improvementId, ...context });
    this.name = 'NoValueProofError';
  }
}

export class OptimizationWithoutValueError extends EvolutionError {
  constructor(improvementId: string, context?: Record<string, unknown>) {
    super('OPTIMIZATION_WITHOUT_VALUE', `Improvement ${improvementId} is optimization without value growth (PHI-005)`, { improvementId, ...context });
    this.name = 'OptimizationWithoutValueError';
  }
}

export class LocalOptimizationError extends EvolutionError {
  constructor(improvementId: string, context?: Record<string, unknown>) {
    super('LOCAL_OPTIMIZATION', `Improvement ${improvementId} is local optimization violating PHI-006`, { improvementId, ...context });
    this.name = 'LocalOptimizationError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// KPI ERRORS
// ═══════════════════════════════════════════════════════════════════

export class PINotFoundError extends EvolutionError {
  readonly kpiId: string;
  constructor(kpiId: string, context?: Record<string, unknown>) {
    super('KPI_NOT_FOUND', `KPI not found: ${kpiId}`, { kpiId, ...context });
    this.name = 'PINotFoundError';
    this.kpiId = kpiId;
  }
}

export class PILimitExceededError extends EvolutionError {
  constructor(maxKPIs: number, context?: Record<string, unknown>) {
    super('KPI_LIMIT_EXCEEDED', `Maximum KPIs exceeded: ${maxKPIs}`, { maxKPIs, ...context });
    this.name = 'PILimitExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// FEEDBACK ERRORS
// ═══════════════════════════════════════════════════════════════════

export class FeedbackNotFoundError extends EvolutionError {
  readonly feedbackId: string;
  constructor(feedbackId: string, context?: Record<string, unknown>) {
    super('FEEDBACK_NOT_FOUND', `Feedback not found: ${feedbackId}`, { feedbackId, ...context });
    this.name = 'FeedbackNotFoundError';
    this.feedbackId = feedbackId;
  }
}

export class FeedbackLimitExceededError extends EvolutionError {
  constructor(maxFeedback: number, context?: Record<string, unknown>) {
    super('FEEDBACK_LIMIT_EXCEEDED', `Maximum feedback entries exceeded: ${maxFeedback}`, { maxFeedback, ...context });
    this.name = 'FeedbackLimitExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// LEARNING LOOP ERRORS
// ═══════════════════════════════════════════════════════════════════

export class LearningRecordNotFoundError extends EvolutionError {
  readonly recordId: string;
  constructor(recordId: string, context?: Record<string, unknown>) {
    super('LEARNING_RECORD_NOT_FOUND', `Learning record not found: ${recordId}`, { recordId, ...context });
    this.name = 'LearningRecordNotFoundError';
    this.recordId = recordId;
  }
}

// ═══════════════════════════════════════════════════════════════════
// EVOLUTION GRAPH ERRORS
// ═══════════════════════════════════════════════════════════════════

export class EvolutionGraphError extends EvolutionError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('EVOLUTION_GRAPH_ERROR', `Evolution graph error: ${reason}`, { reason, ...context });
    this.name = 'EvolutionGraphError';
  }
}

export class GraphNodeLimitExceededError extends EvolutionError {
  constructor(maxNodes: number, context?: Record<string, unknown>) {
    super('GRAPH_NODE_LIMIT_EXCEEDED', `Maximum graph nodes exceeded: ${maxNodes}`, { maxNodes, ...context });
    this.name = 'GraphNodeLimitExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// TECH DEBT ERRORS
// ═══════════════════════════════════════════════════════════════════

export class TechDebtNotFoundError extends EvolutionError {
  readonly techDebtId: string;
  constructor(techDebtId: string, context?: Record<string, unknown>) {
    super('TECH_DEBT_NOT_FOUND', `Tech debt not found: ${techDebtId}`, { techDebtId, ...context });
    this.name = 'TechDebtNotFoundError';
    this.techDebtId = techDebtId;
  }
}

export class TechDebtLimitExceededError extends EvolutionError {
  constructor(maxItems: number, context?: Record<string, unknown>) {
    super('TECH_DEBT_LIMIT_EXCEEDED', `Maximum tech debt items exceeded: ${maxItems}`, { maxItems, ...context });
    this.name = 'TechDebtLimitExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// ARCHITECTURE OPTIMIZER ERRORS
// ═══════════════════════════════════════════════════════════════════

export class ArchitectureAnalysisError extends EvolutionError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('ARCHITECTURE_ANALYSIS_ERROR', `Architecture analysis failed: ${reason}`, { reason, ...context });
    this.name = 'ArchitectureAnalysisError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// ROADMAP ERRORS
// ═══════════════════════════════════════════════════════════════════

export class RoadmapLimitExceededError extends EvolutionError {
  constructor(maxItems: number, context?: Record<string, unknown>) {
    super('ROADMAP_LIMIT_EXCEEDED', `Maximum roadmap items exceeded: ${maxItems}`, { maxItems, ...context });
    this.name = 'RoadmapLimitExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// RUNTIME ERRORS
// ═══════════════════════════════════════════════════════════════════

export class EvolutionRuntimeError extends EvolutionError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('EVOLUTION_RUNTIME_ERROR', `Evolution runtime error: ${reason}`, { ...context });
    this.name = 'EvolutionRuntimeError';
  }
}

export class EvolutionNotInitializedError extends EvolutionError {
  constructor(context?: Record<string, unknown>) {
    super('EVOLUTION_NOT_INITIALIZED', 'Evolution runtime is not initialized', { ...context });
    this.name = 'EvolutionNotInitializedError';
  }
}

export class EvolutionDisposedError extends EvolutionError {
  constructor(context?: Record<string, unknown>) {
    super('EVOLUTION_DISPOSED', 'Evolution runtime has been disposed', { ...context });
    this.name = 'EvolutionDisposedError';
  }
}

export class ConstraintAnalysisError extends EvolutionError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('CONSTRAINT_ANALYSIS_ERROR', `Constraint analysis failed: ${reason}`, { reason, ...context });
    this.name = 'ConstraintAnalysisError';
  }
}

export class OpportunityCostError extends EvolutionError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('OPPORTUNITY_COST_ERROR', `Opportunity cost analysis failed: ${reason}`, { reason, ...context });
    this.name = 'OpportunityCostError';
  }
}
