/**
 * Security Intelligence Attack Path Builder — Constraints Engine
 *
 * Enforces constraints during path discovery.
 * Supports:
 * - Maximum depth
 * - Maximum paths
 * - Forbidden nodes and edges
 * - Stop conditions
 *
 * All checks are deterministic.
 */

import type { NodeId, EdgeId } from '../../../knowledge-graph/types/index.ts';
import type {
  DiscoveryConstraints, StopCondition, StopConditionType,
  AttackStep, AttackNode,
} from '../types/index.ts';
import { StopConditionType as SCType } from '../types/index.ts';

// ─── Constraint Check Result ─────────────────────────────────

/** Result of checking constraints */
export interface ConstraintCheckResult {
  readonly allowed: boolean;
  readonly reason: string | null;
  readonly violatedConstraint: string | null;
}

// ─── Constraints Engine ──────────────────────────────────────

/**
 * Enforces discovery constraints.
 * Used during path discovery to prune invalid paths early.
 */
export class ConstraintsEngine {
  private readonly _constraints: DiscoveryConstraints;
  private readonly _forbiddenNodes: ReadonlySet<NodeId>;
  private readonly _forbiddenEdges: ReadonlySet<EdgeId>;
  private readonly _stopConditionEvaluators: Map<StopConditionType, (condition: StopCondition, context: ConstraintContext) => boolean>;

  constructor(constraints: DiscoveryConstraints) {
    this._constraints = Object.freeze({ ...constraints });
    this._forbiddenNodes = new Set(constraints.forbiddenNodeIds);
    this._forbiddenEdges = new Set(constraints.forbiddenEdgeIds);

    // Register stop condition evaluators
    this._stopConditionEvaluators = new Map([
      [SCType.MaxNodesVisited, this.checkMaxNodesVisited.bind(this)],
      [SCType.MaxEdgesTraversed, this.checkMaxEdgesTraversed.bind(this)],
      [SCType.RiskThresholdReached, this.checkRiskThreshold.bind(this)],
      [SCType.ObjectiveReached, this.checkObjectiveReached.bind(this)],
      [SCType.CycleDetected, this.checkCycleDetected.bind(this)],
      [SCType.Custom, this.checkCustom.bind(this)],
    ]);
  }

  /** Check if a node is allowed (not forbidden) */
  isNodeAllowed(nodeId: NodeId): ConstraintCheckResult {
    if (this._forbiddenNodes.has(nodeId)) {
      return Object.freeze({
        allowed: false,
        reason: `Node ${nodeId} is forbidden`,
        violatedConstraint: 'forbiddenNodeIds',
      });
    }
    return Object.freeze({ allowed: true, reason: null, violatedConstraint: null });
  }

  /** Check if an edge is allowed (not forbidden) */
  isEdgeAllowed(edgeId: EdgeId): ConstraintCheckResult {
    if (this._forbiddenEdges.has(edgeId)) {
      return Object.freeze({
        allowed: false,
        reason: `Edge ${edgeId} is forbidden`,
        violatedConstraint: 'forbiddenEdgeIds',
      });
    }
    return Object.freeze({ allowed: true, reason: null, violatedConstraint: null });
  }

  /** Check if a depth level is within constraints */
  isDepthAllowed(depth: number): ConstraintCheckResult {
    if (depth > this._constraints.maximumDepth) {
      return Object.freeze({
        allowed: false,
        reason: `Depth ${depth} exceeds maximum ${this._constraints.maximumDepth}`,
        violatedConstraint: 'maximumDepth',
      });
    }
    return Object.freeze({ allowed: true, reason: null, violatedConstraint: null });
  }

  /** Check if path count is within constraints */
  isPathCountAllowed(pathCount: number): ConstraintCheckResult {
    if (pathCount >= this._constraints.maximumPaths) {
      return Object.freeze({
        allowed: false,
        reason: `Path count ${pathCount} exceeds maximum ${this._constraints.maximumPaths}`,
        violatedConstraint: 'maximumPaths',
      });
    }
    return Object.freeze({ allowed: true, reason: null, violatedConstraint: null });
  }

  /** Check if a risk score meets the minimum threshold */
  isRiskScoreSufficient(riskScore: number): ConstraintCheckResult {
    if (riskScore < this._constraints.minimumRiskScore) {
      return Object.freeze({
        allowed: false,
        reason: `Risk score ${riskScore} below minimum ${this._constraints.minimumRiskScore}`,
        violatedConstraint: 'minimumRiskScore',
      });
    }
    return Object.freeze({ allowed: true, reason: null, violatedConstraint: null });
  }

  /**
   * Check all stop conditions against the current context.
   * Returns true if discovery should stop.
   */
  shouldStop(context: ConstraintContext): boolean {
    for (const condition of this._constraints.stopConditions) {
      const evaluator = this._stopConditionEvaluators.get(condition.type);
      if (evaluator && evaluator(condition, context)) {
        return true;
      }
    }
    return false;
  }

  /** Get the constraints */
  get constraints(): DiscoveryConstraints {
    return this._constraints;
  }

  // ─── Stop Condition Evaluators ──────────────────────────

  private checkMaxNodesVisited(condition: StopCondition, context: ConstraintContext): boolean {
    return context.nodesVisited >= (condition.value as number);
  }

  private checkMaxEdgesTraversed(condition: StopCondition, context: ConstraintContext): boolean {
    return context.edgesTraversed >= (condition.value as number);
  }

  private checkRiskThreshold(condition: StopCondition, context: ConstraintContext): boolean {
    return context.currentRisk >= (condition.value as number);
  }

  private checkObjectiveReached(_condition: StopCondition, context: ConstraintContext): boolean {
    return context.objectiveReached;
  }

  private checkCycleDetected(_condition: StopCondition, context: ConstraintContext): boolean {
    return context.cycleDetected;
  }

  private checkCustom(_condition: StopCondition, _context: ConstraintContext): boolean {
    // Custom conditions are evaluated externally
    return false;
  }
}

// ─── Constraint Context ──────────────────────────────────────

/** Context for constraint evaluation */
export interface ConstraintContext {
  readonly nodesVisited: number;
  readonly edgesTraversed: number;
  readonly currentDepth: number;
  readonly currentRisk: number;
  readonly objectiveReached: boolean;
  readonly cycleDetected: boolean;
  readonly pathCount: number;
}

/** Create an empty constraint context */
export function createEmptyConstraintContext(): ConstraintContext {
  return Object.freeze({
    nodesVisited: 0,
    edgesTraversed: 0,
    currentDepth: 0,
    currentRisk: 0,
    objectiveReached: false,
    cycleDetected: false,
    pathCount: 0,
  });
}

/** Update constraint context with new values */
export function updateConstraintContext(
  base: ConstraintContext,
  updates: Partial<ConstraintContext>,
): ConstraintContext {
  return Object.freeze({ ...base, ...updates });
}
