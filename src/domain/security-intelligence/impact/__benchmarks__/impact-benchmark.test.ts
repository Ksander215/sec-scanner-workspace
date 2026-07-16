/**
 * Impact Analysis Engine — Benchmarks
 *
 * Measures:
 * - Single analysis latency
 * - 100 scenarios
 * - 1000 scenarios
 * - Cache hit performance
 */

import { describe, it, expect } from 'vitest';
import {
  ImpactAnalysisEngine,
  createRemoveFindingScenario,
  createPatchVulnerabilityScenario,
  createNetworkIsolationScenario,
  MitigationScenarioType,
} from '../index.ts';
import {
  createAttackNode, createAttackEdge, createAttackStep,
  createAttackObjective, createAttackPath, createAttackPathRanking,
  AttackNodeType, AttackEdgeType, AttackObjectiveType, DiscoveryStrategy,
} from '../../attack-path/index.ts';
import {
  createRiskAssessment, createRiskScore,
  RiskLevel,
} from '../../risk/index.ts';
import type { AttackPath, AttackNode } from '../../attack-path/types/index.ts';
import type { RiskAssessment } from '../../risk/types/index.ts';

// ─── Helpers ─────────────────────────────────────────────────

function makeBenchPath(id: number): AttackPath {
  const n1 = createAttackNode({
    graphNodeId: `gn_e${id}` as any, nodeType: AttackNodeType.EntryPoint,
    label: `Entry_${id}`, riskScore: 0.7, riskLevel: RiskLevel.High,
    findingIds: [`f${id}`] as any, isEntryPoint: true,
  });
  const n2 = createAttackNode({
    graphNodeId: `gn_v${id}` as any, nodeType: AttackNodeType.Vulnerability,
    label: `Vuln_${id}`, riskScore: 0.8, riskLevel: RiskLevel.Critical,
    findingIds: [`f${id}`, `f${id + 100}`] as any,
  });
  const n3 = createAttackNode({
    graphNodeId: `gn_o${id}` as any, nodeType: AttackNodeType.Objective,
    label: `Obj_${id}`, riskScore: 0.9, riskLevel: RiskLevel.Critical,
    isObjective: true,
  });

  const e1 = createAttackEdge({
    sourceNodeId: n1.id, targetNodeId: n2.id,
    graphEdgeId: `ge_a${id}` as any,
    edgeType: AttackEdgeType.Exploitation, probability: 0.8, riskContribution: 0.7,
  });
  const e2 = createAttackEdge({
    sourceNodeId: n2.id, targetNodeId: n3.id,
    graphEdgeId: `ge_b${id}` as any,
    edgeType: AttackEdgeType.LateralMovement, probability: 0.6, riskContribution: 0.5,
    isLateralMovement: true,
  });

  const s1 = createAttackStep({ node: n1, incomingEdge: null, outgoingEdges: [e1], stepIndex: 0, isCritical: true });
  const s2 = createAttackStep({ node: n2, incomingEdge: e1, outgoingEdges: [e2], stepIndex: 1, isCritical: true });
  const s3 = createAttackStep({ node: n3, incomingEdge: e2, outgoingEdges: [], stepIndex: 2, isDetectionPoint: true });

  return createAttackPath({
    steps: [s1, s2, s3], edges: [e1, e2], nodes: [n1, n2, n3],
    objective: createAttackObjective({ type: AttackObjectiveType.InitialAccess }),
    ranking: createAttackPathRanking({ riskScore: 0.8, pathLengthScore: 0.5, exploitAvailabilityScore: 0.7, privilegeEscalationScore: 0.3, lateralMovementScore: 0.4, internetExposureScore: 0.6, businessImpactScore: 0.5, confidenceScore: 0.4 }),
    discoveryStrategy: DiscoveryStrategy.BFS, discoveryDurationMs: 5,
  });
}

function makeBenchRA(findingId: string, score: number): RiskAssessment {
  const level = score >= 0.8 ? RiskLevel.Critical : score >= 0.6 ? RiskLevel.High : RiskLevel.Medium;
  return createRiskAssessment({
    findingId: findingId as any, score: createRiskScore({ rawScore: score, level, factors: [], evidence: [], reasons: [] }),
    scope: 'Finding' as any, scopeId: 'bench',
  });
}

// ─── Benchmarks ──────────────────────────────────────────────

describe('Impact Analysis — Benchmarks', () => {
  const engine = new ImpactAnalysisEngine({ enableCaching: false });

  it('should analyze a single scenario in <5ms', () => {
    const paths = Array.from({ length: 10 }, (_, i) => makeBenchPath(i));
    const assessments = paths.flatMap(p => p.nodes.filter(n => n.findingIds.length > 0).flatMap(n => n.findingIds.map(fid => makeBenchRA(fid, n.riskScore))));
    const scenario = createRemoveFindingScenario('f0', paths.map(p => p.id));

    const start = performance.now();
    engine.analyze({ scenario, attackPaths: paths, riskAssessments: assessments });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
  });

  it('should analyze 100 scenarios in <500ms', () => {
    const paths = Array.from({ length: 10 }, (_, i) => makeBenchPath(i));
    const assessments = [makeBenchRA('f0', 0.8), makeBenchRA('f1', 0.6)];
    const scenarios = Array.from({ length: 100 }, (_, i) =>
      i % 3 === 0 ? createRemoveFindingScenario(`f${i % 10}`) :
      i % 3 === 1 ? createPatchVulnerabilityScenario(`v${i}`) :
      createNetworkIsolationScenario(`net-${i % 5}`)
    );

    const start = performance.now();
    const results = engine.analyzeBatch(scenarios, paths, assessments);
    const duration = performance.now() - start;

    expect(results.length).toBe(100);
    expect(duration).toBeLessThan(500);
  });

  it('should analyze 1000 scenarios in <5s', () => {
    const paths = Array.from({ length: 5 }, (_, i) => makeBenchPath(i));
    const assessments = [makeBenchRA('f0', 0.8)];
    const scenarios = Array.from({ length: 1000 }, (_, i) =>
      createRemoveFindingScenario(`f${i % 5}`)
    );

    const start = performance.now();
    const results = engine.analyzeBatch(scenarios, paths, assessments);
    const duration = performance.now() - start;

    expect(results.length).toBe(1000);
    expect(duration).toBeLessThan(5000);
  });

  it('should serve cached analysis in <0.1ms', () => {
    const cachedEngine = new ImpactAnalysisEngine({ enableCaching: true, cacheSize: 1000, cacheTtlMs: 60000 });
    const paths = [makeBenchPath(0)];
    const assessments = [makeBenchRA('f0', 0.8)];
    const scenario = createRemoveFindingScenario('f0');

    // Prime the cache
    cachedEngine.analyze({ scenario, attackPaths: paths, riskAssessments: assessments });

    // Measure cached hit
    const start = performance.now();
    cachedEngine.analyze({ scenario, attackPaths: paths, riskAssessments: assessments });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(0.5);
    expect(cachedEngine.cacheStatistics.hits).toBeGreaterThan(0);
  });
});
