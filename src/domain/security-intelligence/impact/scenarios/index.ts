/**
 * Security Intelligence Impact Analysis — Mitigation Scenarios
 *
 * Defines the 8 mitigation scenario types and their simulation logic.
 * Each scenario models a different way to reduce the attack surface.
 *
 * All calculations are fully deterministic.
 */

import type { ImpactScenario, MitigationScenarioType } from '../types/index.ts';
import { MitigationScenarioType as ScenarioType } from '../types/index.ts';
import type { AttackPathId, RiskAssessmentId } from '../types/index.ts';
import type { AttackPath, AttackNode, AttackStep } from '../../attack-path/types/index.ts';
import type { RiskAssessment } from '../../risk/types/index.ts';
import type { CorrelationGroup } from '../../correlation/types/index.ts';
import type { FindingId } from '../../normalization/types/index.ts';
import { createImpactScenario } from '../models/index.ts';

// ─── Scenario Handlers ───────────────────────────────────────

/**
 * Result of evaluating a scenario against a set of attack paths.
 * Determines which paths/nodes are affected by the mitigation.
 */
export interface ScenarioEvaluationResult {
  /** Attack path IDs that would be completely eliminated */
  readonly eliminatedPathIds: readonly string[];
  /** Attack path IDs that would be shortened */
  readonly shortenedPathIds: readonly string[];
  /** Attack path IDs that would have reduced risk/probability */
  readonly reducedPathIds: readonly string[];
  /** Finding IDs that would be affected */
  readonly affectedFindingIds: readonly FindingId[];
  /** Node IDs in the attack graph that would be removed */
  readonly affectedNodeIds: readonly string[];
  /** Edge IDs in the attack graph that would be removed */
  readonly affectedEdgeIds: readonly string[];
  /** Risk reduction factor for affected assessments (0.0–1.0) */
  readonly riskReductionFactor: number;
  /** Confidence improvement factor (0.0–1.0) */
  readonly confidenceFactor: number;
  /** Exploitability reduction factor (0.0–1.0) */
  readonly exploitabilityFactor: number;
  /** Estimated cost of this mitigation (0.0–1.0) */
  readonly estimatedCost: number;
  /** Implementation complexity (0.0–1.0) */
  readonly implementationComplexity: number;
  /** Business impact (0.0–1.0) */
  readonly businessImpact: number;
  /** Dependency impacts (source, affected pairs) */
  readonly dependencies: readonly { sourceType: string; sourceId: string; affectedType: string; affectedId: string; impactType: 'direct' | 'indirect' | 'cascading'; impactScore: number; description: string }[];
}

/**
 * Evaluate a mitigation scenario against attack paths and risk assessments.
 * This is the core scenario simulation logic.
 */
export function evaluateScenario(
  scenario: ImpactScenario,
  attackPaths: readonly AttackPath[],
  riskAssessments: readonly RiskAssessment[],
  correlationGroups?: readonly CorrelationGroup[],
): ScenarioEvaluationResult {
  const handler = SCENARIO_HANDLERS[scenario.type];
  if (!handler) {
    throw new Error(`Unknown mitigation scenario type: ${scenario.type}`);
  }
  return handler(scenario, attackPaths, riskAssessments, correlationGroups ?? []);
}

// ─── Scenario Handler Type ───────────────────────────────────

type ScenarioHandler = (
  scenario: ImpactScenario,
  attackPaths: readonly AttackPath[],
  riskAssessments: readonly RiskAssessment[],
  correlationGroups: readonly CorrelationGroup[],
) => ScenarioEvaluationResult;

// ─── Individual Scenario Handlers ────────────────────────────

/** Remove Finding — eliminates paths that depend on a specific finding */
const removeFinding: ScenarioHandler = (scenario, attackPaths, riskAssessments) => {
  const targetFindingId = scenario.targetId as FindingId;
  const eliminated: string[] = [];
  const reduced: string[] = [];
  const affectedFindings: FindingId[] = [targetFindingId];
  const affectedNodes: string[] = [];
  const affectedEdges: string[] = [];

  for (const path of attackPaths) {
    const hasFinding = path.nodes.some(n => n.findingIds.includes(targetFindingId));
    if (hasFinding) {
      // If the finding is on a critical node (entry/objective), path is eliminated
      const isOnCriticalNode = path.steps.some(
        s => s.node.findingIds.includes(targetFindingId) && (s.isCritical || s.node.isEntryPoint || s.node.isObjective)
      );
      if (isOnCriticalNode) {
        eliminated.push(path.id);
      } else {
        reduced.push(path.id);
      }
      // Collect affected nodes and edges
      for (const step of path.steps) {
        if (step.node.findingIds.includes(targetFindingId)) {
          affectedNodes.push(step.node.id);
          if (step.incomingEdge) affectedEdges.push(step.incomingEdge.id);
          for (const oe of step.outgoingEdges) affectedEdges.push(oe.id);
        }
      }
    }
  }

  // Find dependent findings via correlation
  const deps: ScenarioEvaluationResult['dependencies'] = [];
  for (const ra of riskAssessments) {
    if (ra.findingId !== targetFindingId) {
      const relatedPaths = attackPaths.filter(p =>
        p.nodes.some(n => n.findingIds.includes(ra.findingId)) &&
        p.nodes.some(n => n.findingIds.includes(targetFindingId))
      );
      if (relatedPaths.length > 0) {
        deps.push({
          sourceType: 'finding', sourceId: targetFindingId,
          affectedType: 'finding', affectedId: ra.findingId,
          impactType: 'indirect', impactScore: 0.3,
          description: `Finding ${targetFindingId} shares paths with ${ra.findingId}`,
        });
      }
    }
  }

  return {
    eliminatedPathIds: eliminated,
    shortenedPathIds: [],
    reducedPathIds: reduced,
    affectedFindingIds: affectedFindings,
    affectedNodeIds: [...new Set(affectedNodes)],
    affectedEdgeIds: [...new Set(affectedEdges)],
    riskReductionFactor: 0.6,
    confidenceFactor: 0.3,
    exploitabilityFactor: 0.5,
    estimatedCost: 0.3,
    implementationComplexity: 0.2,
    businessImpact: 0.1,
    dependencies: deps,
  };
};

/** Remove Correlation — eliminates paths that depend on correlated findings */
const removeCorrelation: ScenarioHandler = (scenario, attackPaths, riskAssessments, correlationGroups) => {
  const targetGroupId = scenario.targetId;
  const group = correlationGroups.find(g => g.id === targetGroupId);
  if (!group) {
    return emptyResult();
  }

  const groupFindingIds = new Set(group.findingIds);
  const eliminated: string[] = [];
  const reduced: string[] = [];
  const affectedFindings = [...group.findingIds];

  for (const path of attackPaths) {
    const pathFindingIds = new Set(path.nodes.flatMap(n => n.findingIds));
    const overlap = group.findingIds.filter(id => pathFindingIds.has(id));
    if (overlap.length >= 2) {
      // Multiple correlated findings in path → elimination candidate
      eliminated.push(path.id);
    } else if (overlap.length === 1) {
      reduced.push(path.id);
    }
  }

  const deps: ScenarioEvaluationResult['dependencies'] = [];
  for (const findingId of group.findingIds) {
    deps.push({
      sourceType: 'correlation', sourceId: targetGroupId,
      affectedType: 'finding', affectedId: findingId,
      impactType: 'direct', impactScore: 0.7,
      description: `Correlation group ${targetGroupId} contains finding ${findingId}`,
    });
  }

  return {
    eliminatedPathIds: eliminated,
    shortenedPathIds: [],
    reducedPathIds: reduced,
    affectedFindingIds: affectedFindings,
    affectedNodeIds: [],
    affectedEdgeIds: [],
    riskReductionFactor: 0.7,
    confidenceFactor: 0.4,
    exploitabilityFactor: 0.6,
    estimatedCost: 0.4,
    implementationComplexity: 0.35,
    businessImpact: 0.2,
    dependencies: deps,
  };
};

/** Remove Asset — eliminates all paths through the asset */
const removeAsset: ScenarioHandler = (scenario, attackPaths) => {
  const targetAssetId = scenario.targetId;
  const eliminated: string[] = [];
  const affectedNodes: string[] = [];

  for (const path of attackPaths) {
    const hasAsset = path.nodes.some(n => n.assetId === targetAssetId);
    if (hasAsset) {
      eliminated.push(path.id);
      for (const node of path.nodes) {
        if (node.assetId === targetAssetId) affectedNodes.push(node.id);
      }
    }
  }

  const deps: ScenarioEvaluationResult['dependencies'] = [];
  for (const path of attackPaths) {
    if (eliminated.includes(path.id)) {
      for (const node of path.nodes) {
        if (node.assetId !== targetAssetId) {
          deps.push({
            sourceType: 'asset', sourceId: targetAssetId,
            affectedType: 'node', affectedId: node.id,
            impactType: 'cascading', impactScore: 0.5,
            description: `Asset removal cascades to node ${node.id}`,
          });
        }
      }
    }
  }

  return {
    eliminatedPathIds: eliminated,
    shortenedPathIds: [],
    reducedPathIds: [],
    affectedFindingIds: [],
    affectedNodeIds: [...new Set(affectedNodes)],
    affectedEdgeIds: [],
    riskReductionFactor: 0.8,
    confidenceFactor: 0.5,
    exploitabilityFactor: 0.7,
    estimatedCost: 0.7,
    implementationComplexity: 0.6,
    businessImpact: 0.5,
    dependencies: deps.slice(0, 20), // Cap to avoid explosion
  };
};

/** Patch Vulnerability — reduces risk on paths using the vulnerability */
const patchVulnerability: ScenarioHandler = (scenario, attackPaths) => {
  const targetVulnId = scenario.targetId;
  const eliminated: string[] = [];
  const reduced: string[] = [];
  const shortened: string[] = [];
  const affectedFindings: FindingId[] = [];
  const affectedNodes: string[] = [];

  for (const path of attackPaths) {
    const vulnSteps = path.steps.filter(
      s => s.node.findingIds.some(fid => fid === targetVulnId) ||
           s.node.metadata?.vulnerabilityId === targetVulnId
    );
    if (vulnSteps.length === 0) continue;

    affectedFindings.push(targetVulnId as unknown as FindingId);

    // If vulnerability is the only exploitation step, path is eliminated
    if (vulnSteps.some(s => s.isCritical)) {
      eliminated.push(path.id);
    } else if (vulnSteps.length === path.steps.length - 1) {
      shortened.push(path.id);
    } else {
      reduced.push(path.id);
    }

    for (const step of vulnSteps) affectedNodes.push(step.node.id);
  }

  return {
    eliminatedPathIds: eliminated,
    shortenedPathIds: shortened,
    reducedPathIds: reduced,
    affectedFindingIds: [...new Set(affectedFindings)],
    affectedNodeIds: [...new Set(affectedNodes)],
    affectedEdgeIds: [],
    riskReductionFactor: 0.75,
    confidenceFactor: 0.4,
    exploitabilityFactor: 0.85,
    estimatedCost: 0.35,
    implementationComplexity: 0.3,
    businessImpact: 0.15,
    dependencies: [],
  };
};

/** Disable Service — eliminates paths that go through the service */
const disableService: ScenarioHandler = (scenario, attackPaths) => {
  const targetServiceId = scenario.targetId;
  const eliminated: string[] = [];
  const affectedNodes: string[] = [];

  for (const path of attackPaths) {
    const hasService = path.steps.some(
      s => s.node.metadata?.serviceId === targetServiceId ||
           s.node.label === targetServiceId
    );
    if (hasService) {
      eliminated.push(path.id);
      for (const step of path.steps) {
        if (step.node.metadata?.serviceId === targetServiceId || step.node.label === targetServiceId) {
          affectedNodes.push(step.node.id);
        }
      }
    }
  }

  return {
    eliminatedPathIds: eliminated,
    shortenedPathIds: [],
    reducedPathIds: [],
    affectedFindingIds: [],
    affectedNodeIds: [...new Set(affectedNodes)],
    affectedEdgeIds: [],
    riskReductionFactor: 0.7,
    confidenceFactor: 0.5,
    exploitabilityFactor: 0.8,
    estimatedCost: 0.5,
    implementationComplexity: 0.4,
    businessImpact: 0.6,
    dependencies: [],
  };
};

/** Close Endpoint — eliminates paths that use the endpoint as entry */
const closeEndpoint: ScenarioHandler = (scenario, attackPaths) => {
  const targetEndpointId = scenario.targetId;
  const eliminated: string[] = [];

  for (const path of attackPaths) {
    const usesEndpoint = path.steps.some(
      s => s.node.metadata?.endpointId === targetEndpointId ||
           (s.node.isEntryPoint && s.node.label === targetEndpointId)
    );
    if (usesEndpoint) {
      eliminated.push(path.id);
    }
  }

  return {
    eliminatedPathIds: eliminated,
    shortenedPathIds: [],
    reducedPathIds: [],
    affectedFindingIds: [],
    affectedNodeIds: [],
    affectedEdgeIds: [],
    riskReductionFactor: 0.65,
    confidenceFactor: 0.6,
    exploitabilityFactor: 0.75,
    estimatedCost: 0.25,
    implementationComplexity: 0.2,
    businessImpact: 0.3,
    dependencies: [],
  };
};

/** Rotate Credential — reduces risk on paths using the credential */
const rotateCredential: ScenarioHandler = (scenario, attackPaths) => {
  const targetCredId = scenario.targetId;
  const reduced: string[] = [];
  const affectedNodes: string[] = [];

  for (const path of attackPaths) {
    const usesCred = path.steps.some(
      s => s.node.metadata?.credentialId === targetCredId ||
           (s.incomingEdge?.requiresAuthentication && s.node.metadata?.credentialId === targetCredId)
    );
    if (usesCred) {
      reduced.push(path.id);
      for (const step of path.steps) {
        if (step.node.metadata?.credentialId === targetCredId) affectedNodes.push(step.node.id);
      }
    }
  }

  return {
    eliminatedPathIds: [],
    shortenedPathIds: [],
    reducedPathIds: reduced,
    affectedFindingIds: [],
    affectedNodeIds: [...new Set(affectedNodes)],
    affectedEdgeIds: [],
    riskReductionFactor: 0.4,
    confidenceFactor: 0.3,
    exploitabilityFactor: 0.5,
    estimatedCost: 0.15,
    implementationComplexity: 0.15,
    businessImpact: 0.05,
    dependencies: [],
  };
};

/** Network Isolation — eliminates lateral movement paths */
const networkIsolation: ScenarioHandler = (scenario, attackPaths) => {
  const targetNetworkId = scenario.targetId;
  const eliminated: string[] = [];
  const reduced: string[] = [];
  const affectedEdges: string[] = [];

  for (const path of attackPaths) {
    const lateralSteps = path.steps.filter(s => s.incomingEdge?.isLateralMovement);
    const usesNetwork = lateralSteps.some(
      s => s.node.metadata?.networkId === targetNetworkId ||
           s.incomingEdge?.metadata?.networkId === targetNetworkId
    );
    if (usesNetwork) {
      // Lateral movement blocked → path is eliminated or shortened
      const lateralCount = lateralSteps.length;
      const totalSteps = path.steps.length;
      if (lateralCount >= totalSteps - 1) {
        eliminated.push(path.id);
      } else {
        reduced.push(path.id);
      }
      for (const step of lateralSteps) {
        if (step.incomingEdge) affectedEdges.push(step.incomingEdge.id);
      }
    }
  }

  return {
    eliminatedPathIds: eliminated,
    shortenedPathIds: [],
    reducedPathIds: reduced,
    affectedFindingIds: [],
    affectedNodeIds: [],
    affectedEdgeIds: [...new Set(affectedEdges)],
    riskReductionFactor: 0.55,
    confidenceFactor: 0.45,
    exploitabilityFactor: 0.6,
    estimatedCost: 0.45,
    implementationComplexity: 0.5,
    businessImpact: 0.4,
    dependencies: [],
  };
};

// ─── Handler Registry ────────────────────────────────────────

const SCENARIO_HANDLERS: Record<MitigationScenarioType, ScenarioHandler> = {
  [ScenarioType.RemoveFinding]: removeFinding,
  [ScenarioType.RemoveCorrelation]: removeCorrelation,
  [ScenarioType.RemoveAsset]: removeAsset,
  [ScenarioType.PatchVulnerability]: patchVulnerability,
  [ScenarioType.DisableService]: disableService,
  [ScenarioType.CloseEndpoint]: closeEndpoint,
  [ScenarioType.RotateCredential]: rotateCredential,
  [ScenarioType.NetworkIsolation]: networkIsolation,
};

/** Empty result for edge cases */
function emptyResult(): ScenarioEvaluationResult {
  return {
    eliminatedPathIds: [], shortenedPathIds: [], reducedPathIds: [],
    affectedFindingIds: [], affectedNodeIds: [], affectedEdgeIds: [],
    riskReductionFactor: 0, confidenceFactor: 0, exploitabilityFactor: 0,
    estimatedCost: 0, implementationComplexity: 0, businessImpact: 0,
    dependencies: [],
  };
}

// ─── Scenario Factory Functions ──────────────────────────────

/** Create a RemoveFinding scenario */
export function createRemoveFindingScenario(
  findingId: string,
  attackPathIds: readonly string[] = [],
  riskAssessmentIds: readonly RiskAssessmentId[] = [],
): ImpactScenario {
  return createImpactScenario({
    type: ScenarioType.RemoveFinding,
    targetId: findingId,
    targetType: 'finding',
    description: `Remove finding ${findingId}`,
    attackPaths: attackPathIds as readonly AttackPathId[],
    riskAssessmentIds,
  });
}

/** Create a PatchVulnerability scenario */
export function createPatchVulnerabilityScenario(
  vulnId: string,
  attackPathIds: readonly string[] = [],
): ImpactScenario {
  return createImpactScenario({
    type: ScenarioType.PatchVulnerability,
    targetId: vulnId,
    targetType: 'vulnerability',
    description: `Patch vulnerability ${vulnId}`,
    attackPaths: attackPathIds as readonly AttackPathId[],
  });
}

/** Create a NetworkIsolation scenario */
export function createNetworkIsolationScenario(
  networkId: string,
  attackPathIds: readonly string[] = [],
): ImpactScenario {
  return createImpactScenario({
    type: ScenarioType.NetworkIsolation,
    targetId: networkId,
    targetType: 'network',
    description: `Isolate network segment ${networkId}`,
    attackPaths: attackPathIds as readonly AttackPathId[],
  });
}

/** Create a RemoveCorrelation scenario */
export function createRemoveCorrelationScenario(
  groupId: string,
  attackPathIds: readonly string[] = [],
): ImpactScenario {
  return createImpactScenario({
    type: ScenarioType.RemoveCorrelation,
    targetId: groupId,
    targetType: 'correlation',
    description: `Remove correlation group ${groupId}`,
    attackPaths: attackPathIds as readonly AttackPathId[],
  });
}

/** Create a RemoveAsset scenario */
export function createRemoveAssetScenario(
  assetId: string,
  attackPathIds: readonly string[] = [],
): ImpactScenario {
  return createImpactScenario({
    type: ScenarioType.RemoveAsset,
    targetId: assetId,
    targetType: 'asset',
    description: `Remove asset ${assetId}`,
    attackPaths: attackPathIds as readonly AttackPathId[],
  });
}

/** Create a DisableService scenario */
export function createDisableServiceScenario(
  serviceId: string,
  attackPathIds: readonly string[] = [],
): ImpactScenario {
  return createImpactScenario({
    type: ScenarioType.DisableService,
    targetId: serviceId,
    targetType: 'service',
    description: `Disable service ${serviceId}`,
    attackPaths: attackPathIds as readonly AttackPathId[],
  });
}

/** Create a CloseEndpoint scenario */
export function createCloseEndpointScenario(
  endpointId: string,
  attackPathIds: readonly string[] = [],
): ImpactScenario {
  return createImpactScenario({
    type: ScenarioType.CloseEndpoint,
    targetId: endpointId,
    targetType: 'endpoint',
    description: `Close endpoint ${endpointId}`,
    attackPaths: attackPathIds as readonly AttackPathId[],
  });
}

/** Create a RotateCredential scenario */
export function createRotateCredentialScenario(
  credentialId: string,
  attackPathIds: readonly string[] = [],
): ImpactScenario {
  return createImpactScenario({
    type: ScenarioType.RotateCredential,
    targetId: credentialId,
    targetType: 'credential',
    description: `Rotate credential ${credentialId}`,
    attackPaths: attackPathIds as readonly AttackPathId[],
  });
}

// (AttackPathId and RiskAssessmentId are imported at the top of this file)
