/**
 * Security Intelligence Attack Path Builder — Simulation Engine
 *
 * Deterministic attack path simulation.
 * All calculations are fully deterministic — no probabilistic algorithms.
 *
 * Simulation produces:
 * - Success probability (deterministic, based on step factors)
 * - Critical steps (high-risk steps that determine path feasibility)
 * - Bottlenecks (steps that most reduce success probability)
 * - Detection points (steps where the attack can be detected)
 */

import type {
  AttackPath, AttackSimulation, AttackStep, AttackStepId,
  AttackSimulationId, AttackPathId,
} from '../types/index.ts';
import {
  brandAttackSimulationId,
  DEFAULT_ATTACK_PATH_ENGINE_CONFIG,
} from '../types/index.ts';
import { createAttackSimulation } from '../models/index.ts';

// ─── Simulation Configuration ────────────────────────────────

/** Configuration for attack simulation */
export interface SimulationConfig {
  /** Base success probability per step (default: 0.85 from engine config) */
  readonly stepBase: number;
  /** Risk penalty factor (how much risk reduces probability, default: 0.3) */
  readonly riskPenaltyFactor: number;
  /** Auth penalty (probability reduction for authenticated steps, default: 0.15) */
  readonly authPenalty: number;
  /** Privilege penalty (probability reduction for privileged steps, default: 0.2) */
  readonly privilegePenalty: number;
  /** Detection bonus (probability reduction at detection points, default: 0.1) */
  readonly detectionPenalty: number;
  /** Lateral movement penalty (default: 0.1) */
  readonly lateralPenalty: number;
}

/** Default simulation configuration */
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = Object.freeze({
  stepBase: DEFAULT_ATTACK_PATH_ENGINE_CONFIG.simulationStepBase,
  riskPenaltyFactor: 0.3,
  authPenalty: 0.15,
  privilegePenalty: 0.2,
  detectionPenalty: 0.1,
  lateralPenalty: 0.1,
});

// ─── Step Probability Computation ────────────────────────────

/**
 * Compute the probability of success for a single step.
 * Fully deterministic — based on node risk, edge properties,
 * and simulation configuration.
 */
export function computeStepProbability(
  step: AttackStep,
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
): number {
  let probability = config.stepBase;

  // Reduce by risk (higher risk = harder to exploit successfully)
  probability -= step.node.riskScore * config.riskPenaltyFactor;

  // Reduce if authentication is required
  if (step.incomingEdge?.requiresAuthentication) {
    probability -= config.authPenalty;
  }

  // Reduce if privilege is required
  if (step.incomingEdge?.requiresPrivilege) {
    probability -= config.privilegePenalty;
  }

  // Reduce if this is a detection point
  if (step.isDetectionPoint) {
    probability -= config.detectionPenalty;
  }

  // Reduce for lateral movement
  if (step.incomingEdge?.isLateralMovement) {
    probability -= config.lateralPenalty;
  }

  // Clamp to [0.0, 1.0]
  return Math.max(0, Math.min(1, probability));
}

/**
 * Compute the cumulative probability of an entire path.
 * This is the product of all step probabilities.
 */
export function computeCumulativeProbability(
  steps: readonly AttackStep[],
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
): number {
  if (steps.length === 0) return 1.0;
  return steps.reduce((product, step) => {
    const stepProb = computeStepProbability(step, config);
    return product * stepProb;
  }, 1.0);
}

// ─── Critical Step Detection ─────────────────────────────────

/**
 * Identify critical steps in an attack path.
 * A step is critical if its failure would prevent the attack from succeeding.
 * Determined by: high risk, authentication required, privilege escalation, or bottleneck status.
 */
export function identifyCriticalSteps(steps: readonly AttackStep[]): AttackStep[] {
  return steps.filter(step => {
    // Steps with high risk score
    if (step.node.riskScore >= 0.7) return true;
    // Steps requiring authentication
    if (step.incomingEdge?.requiresAuthentication) return true;
    // Steps involving privilege escalation
    if (step.incomingEdge?.isPrivilegeEscalation) return true;
    // Steps marked as critical
    if (step.isCritical) return true;
    return false;
  });
}

/**
 * Identify bottleneck steps.
 * A bottleneck is a step with the lowest probability of success,
 * meaning it's the hardest step to overcome.
 */
export function identifyBottlenecks(
  steps: readonly AttackStep[],
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
): AttackStep[] {
  if (steps.length === 0) return [];

  const stepProbs = steps.map(s => computeStepProbability(s, config));
  const minProb = Math.min(...stepProbs);
  const threshold = minProb * 1.2; // 20% above minimum

  return steps.filter((_, i) => stepProbs[i] <= threshold);
}

/**
 * Identify detection points.
 * Steps where the attack can be detected by monitoring or security controls.
 */
export function identifyDetectionPoints(steps: readonly AttackStep[]): AttackStep[] {
  return steps.filter(step => step.isDetectionPoint);
}

// ─── Required Capabilities ───────────────────────────────────

/**
 * Determine the capabilities required to execute the attack path.
 * Based on the techniques and edge properties.
 */
export function determineRequiredCapabilities(steps: readonly AttackStep[]): string[] {
  const capabilities = new Set<string>();

  for (const step of steps) {
    // From edge properties
    if (step.incomingEdge?.requiresAuthentication) {
      capabilities.add('valid_credentials');
    }
    if (step.incomingEdge?.requiresPrivilege) {
      capabilities.add('elevated_privileges');
    }
    if (step.incomingEdge?.isLateralMovement) {
      capabilities.add('network_access');
    }
    if (step.incomingEdge?.isPrivilegeEscalation) {
      capabilities.add('privilege_escalation_capability');
    }

    // From techniques
    for (const technique of step.techniques) {
      capabilities.add(`technique_${technique.id}`);
    }

    // From node type
    if (step.node.nodeType === 'Credential') {
      capabilities.add('credential_harvesting');
    }
    if (step.node.nodeType === 'Service') {
      capabilities.add('service_exploitation');
    }
  }

  return [...capabilities].sort();
}

// ─── Simulation Engine ───────────────────────────────────────

/**
 * Deterministic attack path simulation engine.
 * All calculations are fully deterministic.
 */
export class SimulationEngine {
  private readonly _config: SimulationConfig;

  constructor(config: SimulationConfig = DEFAULT_SIMULATION_CONFIG) {
    this._config = Object.freeze({ ...config });
  }

  /**
   * Simulate an attack path.
   * Returns a complete simulation with probabilities, critical steps,
   * bottlenecks, and detection points.
   */
  simulate(path: AttackPath): AttackSimulation {
    const startTime = performance.now();

    const steps = path.steps;

    // Compute step probabilities
    const stepProbabilities = steps.map(step => ({
      stepId: step.id,
      probability: computeStepProbability(step, this._config),
    }));

    // Compute cumulative probability
    const cumulativeProbability = computeCumulativeProbability(steps, this._config);

    // Identify critical steps, bottlenecks, and detection points
    const criticalSteps = identifyCriticalSteps(steps);
    const bottlenecks = identifyBottlenecks(steps, this._config);
    const detectionPoints = identifyDetectionPoints(steps);

    // Determine required capabilities
    const requiredCapabilities = determineRequiredCapabilities(steps);

    // Estimate time steps (deterministic: based on path length and complexity)
    const estimatedTimeSteps = this.estimateTimeSteps(steps);

    const durationMs = performance.now() - startTime;

    return createAttackSimulation({
      pathId: path.id,
      successProbability: cumulativeProbability,
      criticalSteps,
      bottlenecks,
      detectionPoints,
      stepProbabilities,
      cumulativeProbability,
      estimatedTimeSteps,
      requiredCapabilities,
      metadata: { simulationDurationMs: durationMs },
    });
  }

  /**
   * Estimate the number of time steps for the attack.
   * Deterministic: based on path length and edge properties.
   */
  private estimateTimeSteps(steps: readonly AttackStep[]): number {
    let timeSteps = 0;
    for (const step of steps) {
      timeSteps += 1; // Base step
      if (step.incomingEdge?.requiresAuthentication) timeSteps += 2; // Auth takes time
      if (step.incomingEdge?.isPrivilegeEscalation) timeSteps += 3; // PrivEsc takes time
      if (step.incomingEdge?.isLateralMovement) timeSteps += 2; // Lateral movement takes time
      if (step.node.riskScore >= 0.7) timeSteps += 1; // High-risk steps need more care
    }
    return timeSteps;
  }

  /** Get the simulation configuration */
  get config(): SimulationConfig {
    return this._config;
  }
}
