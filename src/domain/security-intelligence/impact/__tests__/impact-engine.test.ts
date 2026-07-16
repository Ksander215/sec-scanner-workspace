/**
 * Impact Analysis Engine — Comprehensive Test Suite
 *
 * Covers:
 * - Domain models (creation, validation, serialization, equality)
 * - Scenarios (8 mitigation scenario types)
 * - Delta engine (attack path delta calculation)
 * - Risk delta (risk change computation)
 * - Graph delta (graph change computation)
 * - Recommendation ranking (4 strategies)
 * - Events (4 event types + bus)
 * - Cache (scenario + delta cache, TTL, LRU eviction)
 * - Engine (analyze, simulate, compare, rank, statistics)
 * - Edge cases (empty inputs, invalid data)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Types & Enums
  MitigationScenarioType, AttackPathChangeType, RemediationRankingStrategy, SecurityGrade,
  ALL_MITIGATION_SCENARIO_TYPES, ALL_ATTACK_PATH_CHANGE_TYPES, ALL_REMEDIATION_RANKING_STRATEGIES, ALL_SECURITY_GRADES,
  DEFAULT_IMPACT_ENGINE_CONFIG,

  // Models
  generateImpactAnalysisId, generateImpactScenarioId,
  generateMitigationEffectId, generateAttackPathDeltaId,
  generateRiskDeltaId, generateSecurityScoreDeltaId,
  generateDependencyImpactId, generateRemediationCandidateId,
  createImpactScenario, createMitigationEffect,
  createAttackPathDelta, createAttackPathDeltaDetail,
  createRiskDelta, createRiskAssessmentDelta,
  createSecurityScoreDelta, computeSecurityGrade, computeSecurityScore,
  createDependencyImpact, createRemediationCandidate,
  computeRemediationScore, createImpactAnalysis,
  impactAnalysisToJSON, impactAnalysisFromJSON,
  impactAnalysesEqual, impactScenariosEqual, remediationCandidatesEqual,
  cloneImpactAnalysis, hashImpactAnalysis,

  // Scenarios
  evaluateScenario,
  createRemoveFindingScenario, createPatchVulnerabilityScenario,
  createNetworkIsolationScenario, createRemoveCorrelationScenario,
  createRemoveAssetScenario, createDisableServiceScenario,
  createCloseEndpointScenario, createRotateCredentialScenario,

  // Delta
  computeAttackPathDelta, computeAttackSurfaceReduction,
  countPathsByChangeType,

  // Risk Delta
  computeRiskDelta, computeOverallRisk,

  // Graph Delta
  computeGraphDelta, computeConnectivityScore,

  // Recommendation
  computeRecommendationImpact, rankRemediationCandidates,
  compareRemediationCandidates,

  // Events
  createImpactAnalysisStartedEvent, createImpactCalculatedEvent,
  createScenarioCompletedEvent, createRecommendationRankedEvent,
  ImpactEventBus,

  // Cache
  ImpactCache,

  // Statistics
  ImpactStatisticsCollector,

  // Engine
  ImpactAnalysisEngine,
} from '../index.ts';

import {
  createAttackNode, createAttackEdge, createAttackStep,
  createAttackObjective, createAttackPath, createAttackPathRanking,
  createAttackEvidence,
  AttackNodeType, AttackEdgeType, AttackObjectiveType, DiscoveryStrategy,
} from '../../attack-path/index.ts';

import {
  createRiskAssessment, createRiskScore,
  RiskLevel,
} from '../../risk/index.ts';

import {
  createCorrelationGroup,
} from '../../correlation/index.ts';

import type { AttackPath, AttackNode } from '../../attack-path/types/index.ts';
import type { RiskAssessment } from '../../risk/types/index.ts';
import type { CorrelationGroup } from '../../correlation/types/index.ts';

// ─── Test Helpers ────────────────────────────────────────────

function makeAttackNode(overrides: Partial<{ label: string; riskScore: number; isEntryPoint: boolean; isObjective: boolean; findingIds: string[]; assetId: string | null; metadata: Record<string, any> }> = {}): AttackNode {
  return createAttackNode({
    graphNodeId: `gn_${Math.random().toString(36).slice(2, 8)}` as any,
    nodeType: overrides.isEntryPoint ? AttackNodeType.EntryPoint : overrides.isObjective ? AttackNodeType.Objective : AttackNodeType.Vulnerability,
    label: overrides.label ?? `TestNode_${Math.random().toString(36).slice(2, 6)}`,
    riskScore: overrides.riskScore ?? 0.5,
    riskLevel: (overrides.riskScore ?? 0.5) >= 0.8 ? RiskLevel.Critical : (overrides.riskScore ?? 0.5) >= 0.6 ? RiskLevel.High : RiskLevel.Medium,
    findingIds: (overrides.findingIds ?? []) as any,
    assetId: (overrides.assetId ?? null) as any,
    isEntryPoint: overrides.isEntryPoint ?? false,
    isObjective: overrides.isObjective ?? false,
    metadata: overrides.metadata as any ?? {},
  });
}

function makeAttackPath(overrides: { findingIds?: string[]; assetId?: string; riskScore?: number; metadata?: Record<string, any> } = {}): AttackPath {
  const node1 = makeAttackNode({ isEntryPoint: true, label: 'Entry', findingIds: overrides.findingIds, metadata: overrides.metadata });
  const node2 = makeAttackNode({ riskScore: overrides.riskScore ?? 0.7, label: 'Vuln', findingIds: overrides.findingIds, metadata: overrides.metadata, assetId: overrides.assetId ?? null });
  const node3 = makeAttackNode({ isObjective: true, label: 'Objective' });

  const edge1 = createAttackEdge({
    sourceNodeId: node1.id, targetNodeId: node2.id,
    graphEdgeId: `ge1_${Math.random().toString(36).slice(2, 8)}` as any,
    edgeType: AttackEdgeType.Exploitation, probability: 0.8, riskContribution: 0.7,
    isLateralMovement: false, metadata: overrides.metadata as any ?? {},
  });
  const edge2 = createAttackEdge({
    sourceNodeId: node2.id, targetNodeId: node3.id,
    graphEdgeId: `ge2_${Math.random().toString(36).slice(2, 8)}` as any,
    edgeType: AttackEdgeType.LateralMovement, probability: 0.6, riskContribution: 0.5,
    isLateralMovement: true, metadata: { networkId: 'net-1' },
  });

  const step1 = createAttackStep({ node: node1, incomingEdge: null, outgoingEdges: [edge1], stepIndex: 0, isCritical: true });
  const step2 = createAttackStep({ node: node2, incomingEdge: edge1, outgoingEdges: [edge2], stepIndex: 1, isCritical: true });
  const step3 = createAttackStep({ node: node3, incomingEdge: edge2, outgoingEdges: [], stepIndex: 2, isDetectionPoint: true });

  const objective = createAttackObjective({ type: AttackObjectiveType.InitialAccess });
  const ranking = createAttackPathRanking({ riskScore: 0.8, pathLengthScore: 0.5, exploitAvailabilityScore: 0.7, privilegeEscalationScore: 0.3, lateralMovementScore: 0.4, internetExposureScore: 0.6, businessImpactScore: 0.5, confidenceScore: 0.4 });

  return createAttackPath({
    steps: [step1, step2, step3],
    edges: [edge1, edge2],
    nodes: [node1, node2, node3],
    objective,
    ranking,
    discoveryStrategy: DiscoveryStrategy.BFS,
    discoveryDurationMs: 10,
  });
}

function makeRiskAssessment(findingId: string, score: number): RiskAssessment {
  const level = score >= 0.8 ? RiskLevel.Critical : score >= 0.6 ? RiskLevel.High : score >= 0.35 ? RiskLevel.Medium : RiskLevel.Low;
  const riskScore = createRiskScore({
    rawScore: score, level,
    factors: [], evidence: [], reasons: [],
  });
  return createRiskAssessment({
    findingId: findingId as any, score: riskScore,
    scope: 'Finding' as any, scopeId: 'test',
  });
}

function makeCorrelationGroup(findingIds: string[]): CorrelationGroup {
  return createCorrelationGroup({
    findingIds: findingIds as any,
    dominantCategory: 'Vulnerability' as any,
    dominantSeverity: 'High' as any,
    correlationScore: 0.85,
    reasons: ['SameHost' as any],
  });
}

// ─── Domain Models ───────────────────────────────────────────

describe('Impact Analysis — Domain Models', () => {
  it('should generate unique IDs', () => {
    const ids = new Set([
      generateImpactAnalysisId(), generateImpactScenarioId(),
      generateMitigationEffectId(), generateAttackPathDeltaId(),
      generateRiskDeltaId(), generateSecurityScoreDeltaId(),
      generateDependencyImpactId(), generateRemediationCandidateId(),
    ]);
    expect(ids.size).toBe(8);
  });

  it('should create an ImpactScenario', () => {
    const scenario = createImpactScenario({
      type: MitigationScenarioType.RemoveFinding,
      targetId: 'finding-1',
      targetType: 'finding',
    });
    expect(scenario.type).toBe(MitigationScenarioType.RemoveFinding);
    expect(scenario.targetId).toBe('finding-1');
    expect(scenario.targetType).toBe('finding');
    expect(scenario.attackPaths).toEqual([]);
    expect(scenario.riskAssessmentIds).toEqual([]);
  });

  it('should throw on invalid scenario', () => {
    expect(() => createImpactScenario({ type: '' as any, targetId: 'x', targetType: 'finding' })).toThrow();
    expect(() => createImpactScenario({ type: MitigationScenarioType.RemoveFinding, targetId: '', targetType: 'finding' })).toThrow();
  });

  it('should create a MitigationEffect', () => {
    const effect = createMitigationEffect({
      scenarioId: 's1' as any,
      riskReduction: 0.6,
      attackSurfaceReduction: 0.5,
    });
    expect(effect.riskReduction).toBe(0.6);
    expect(effect.attackSurfaceReduction).toBe(0.5);
    expect(effect.confidenceImprovement).toBe(0);
  });

  it('should clamp MitigationEffect values', () => {
    const effect = createMitigationEffect({
      scenarioId: 's1' as any,
      riskReduction: 1.5,
      estimatedCost: -0.5,
    });
    expect(effect.riskReduction).toBe(1);
    expect(effect.estimatedCost).toBe(0);
  });

  it('should create an AttackPathDeltaDetail', () => {
    const detail = createAttackPathDeltaDetail({
      pathId: 'p1' as any,
      changeType: AttackPathChangeType.Eliminated,
      riskBefore: 0.8, riskAfter: 0,
      lengthBefore: 5, lengthAfter: 0,
      probabilityBefore: 0.7, probabilityAfter: 0,
    });
    expect(detail.riskDelta).toBe(-0.8);
    expect(detail.lengthDelta).toBe(-5);
    expect(detail.probabilityDelta).toBe(-0.7);
  });

  it('should create an AttackPathDelta', () => {
    const delta = createAttackPathDelta({
      scenarioId: 's1' as any,
      eliminatedPaths: ['p1' as any, 'p2' as any],
      unchangedPaths: ['p3' as any],
    });
    expect(delta.eliminatedPaths.length).toBe(2);
    expect(delta.unchangedPaths.length).toBe(1);
    expect(delta.totalBefore).toBe(3);
    expect(delta.totalAfter).toBe(1);
    expect(delta.netChange).toBe(-2);
  });

  it('should create a RiskDelta', () => {
    const delta = createRiskDelta({
      scenarioId: 's1' as any,
      overallBefore: 0.8,
      overallAfter: 0.4,
      levelBefore: RiskLevel.High,
      levelAfter: RiskLevel.Medium,
    });
    expect(delta.overallDifference).toBe(0.4); // positive = improvement
    expect(delta.levelChanged).toBe(true);
  });

  it('should create a RiskAssessmentDelta', () => {
    const delta = createRiskAssessmentDelta({
      assessmentId: 'a1' as any,
      findingId: 'f1' as any,
      scoreBefore: 0.9,
      scoreAfter: 0.3,
      levelBefore: RiskLevel.Critical,
      levelAfter: RiskLevel.Medium,
    });
    expect(delta.scoreDelta).toBeCloseTo(-0.6);
    expect(delta.levelChanged).toBe(true);
  });

  it('should create a SecurityScoreDelta', () => {
    const delta = createSecurityScoreDelta({
      scenarioId: 's1' as any,
      scoreBefore: 61,
      scoreAfter: 83,
    });
    expect(delta.scoreDelta).toBe(22);
    expect(delta.gradeBefore).toBe(SecurityGrade.C);
    expect(delta.gradeAfter).toBe(SecurityGrade.B);
    expect(delta.gradeChanged).toBe(true);
  });

  it('should compute security grades correctly', () => {
    expect(computeSecurityGrade(95)).toBe(SecurityGrade.A);
    expect(computeSecurityGrade(90)).toBe(SecurityGrade.A);
    expect(computeSecurityGrade(89)).toBe(SecurityGrade.B);
    expect(computeSecurityGrade(75)).toBe(SecurityGrade.B);
    expect(computeSecurityGrade(74)).toBe(SecurityGrade.C);
    expect(computeSecurityGrade(55)).toBe(SecurityGrade.C);
    expect(computeSecurityGrade(54)).toBe(SecurityGrade.D);
    expect(computeSecurityGrade(35)).toBe(SecurityGrade.D);
    expect(computeSecurityGrade(34)).toBe(SecurityGrade.F);
    expect(computeSecurityGrade(0)).toBe(SecurityGrade.F);
  });

  it('should compute security score from risk', () => {
    expect(computeSecurityScore(0)).toBe(100);
    expect(computeSecurityScore(0.5)).toBe(50);
    expect(computeSecurityScore(1)).toBe(0);
  });

  it('should create a DependencyImpact', () => {
    const impact = createDependencyImpact({
      scenarioId: 's1' as any,
      sourceType: 'finding',
      sourceId: 'f1',
      affectedType: 'asset',
      affectedId: 'a1',
      impactType: 'cascading',
      impactScore: 0.7,
    });
    expect(impact.sourceType).toBe('finding');
    expect(impact.impactType).toBe('cascading');
    expect(impact.impactScore).toBe(0.7);
  });

  it('should throw on invalid DependencyImpact', () => {
    expect(() => createDependencyImpact({
      scenarioId: 's1' as any, sourceType: 'x', sourceId: '',
      affectedType: 'y', affectedId: 'a1',
    })).toThrow();
  });

  it('should create a RemediationCandidate', () => {
    const candidate = createRemediationCandidate({
      scenarioId: 's1' as any,
      targetType: MitigationScenarioType.PatchVulnerability,
      targetId: 'vuln-1',
      targetLabel: 'CVE-2025-12345',
      riskReduction: 0.7,
      pathsEliminated: 3,
    });
    expect(candidate.riskReduction).toBe(0.7);
    expect(candidate.pathsEliminated).toBe(3);
    expect(candidate.score).toBeGreaterThan(0);
  });

  it('should compute remediation score', () => {
    const score = computeRemediationScore({
      riskReduction: 1.0,
      attackSurfaceReduction: 1.0,
      businessImpact: 1.0,
      confidenceImprovement: 1.0,
      exploitabilityReduction: 1.0,
      estimatedCost: 0.0, // Free → cost score = 1.0
    });
    expect(score).toBe(1.0);
  });

  it('should create an ImpactAnalysis', () => {
    const scenario = createImpactScenario({
      type: MitigationScenarioType.RemoveFinding,
      targetId: 'f1', targetType: 'finding',
    });
    const delta = createAttackPathDelta({ scenarioId: scenario.id });
    const riskDelta = createRiskDelta({ scenarioId: scenario.id, overallBefore: 0.8, overallAfter: 0.4, levelBefore: RiskLevel.High, levelAfter: RiskLevel.Medium });
    const scoreDelta = createSecurityScoreDelta({ scenarioId: scenario.id, scoreBefore: 61, scoreAfter: 83 });
    const effect = createMitigationEffect({ scenarioId: scenario.id, riskReduction: 0.4 });
    const candidate = createRemediationCandidate({ scenarioId: scenario.id, targetType: MitigationScenarioType.RemoveFinding, targetId: 'f1', targetLabel: 'Finding 1' });

    const analysis = createImpactAnalysis({
      scenarioId: scenario.id,
      scenarioType: MitigationScenarioType.RemoveFinding,
      attackPathDelta: delta,
      riskDelta,
      securityScoreDelta: scoreDelta,
      mitigationEffect: effect,
      remediationCandidate: candidate,
    });

    expect(analysis.scenarioType).toBe(MitigationScenarioType.RemoveFinding);
    expect(analysis.riskDelta.overallDifference).toBe(0.4);
    expect(analysis.securityScoreDelta.scoreDelta).toBe(22);
  });

  it('should serialize and deserialize ImpactAnalysis', () => {
    const scenario = createImpactScenario({
      type: MitigationScenarioType.PatchVulnerability,
      targetId: 'v1', targetType: 'vulnerability',
    });
    const delta = createAttackPathDelta({ scenarioId: scenario.id });
    const riskDelta = createRiskDelta({ scenarioId: scenario.id, overallBefore: 0.9, overallAfter: 0.3, levelBefore: RiskLevel.Critical, levelAfter: RiskLevel.Medium });
    const scoreDelta = createSecurityScoreDelta({ scenarioId: scenario.id, scoreBefore: 40, scoreAfter: 80 });
    const effect = createMitigationEffect({ scenarioId: scenario.id });
    const candidate = createRemediationCandidate({ scenarioId: scenario.id, targetType: MitigationScenarioType.PatchVulnerability, targetId: 'v1', targetLabel: 'V1' });

    const analysis = createImpactAnalysis({
      scenarioId: scenario.id, scenarioType: MitigationScenarioType.PatchVulnerability,
      attackPathDelta: delta, riskDelta, securityScoreDelta: scoreDelta,
      mitigationEffect: effect, remediationCandidate: candidate,
    });

    const json = impactAnalysisToJSON(analysis);
    const restored = impactAnalysisFromJSON(json);
    expect(restored.id).toBe(analysis.id);
    expect(restored.scenarioId).toBe(analysis.scenarioId);
  });

  it('should validate ImpactAnalysis from JSON', () => {
    expect(() => impactAnalysisFromJSON('not-json')).toThrow();
    expect(() => impactAnalysisFromJSON('{}')).toThrow();
    expect(() => impactAnalysisFromJSON('null')).toThrow();
    expect(() => impactAnalysisFromJSON('{"id":1}')).toThrow();
    expect(() => impactAnalysisFromJSON('{"id":"x"}')).toThrow();
    expect(() => impactAnalysisFromJSON('{"id":"x","scenarioId":"s"}')).toThrow('missing or invalid scenarioType');
    expect(() => impactAnalysisFromJSON('{"id":"x","scenarioId":"s","scenarioType":"T"}')).toThrow('missing or invalid attackPathDelta');
  });

  it('should support equality, clone, and hash', () => {
    const scenario = createImpactScenario({ type: MitigationScenarioType.RemoveFinding, targetId: 'f1', targetType: 'finding' });
    const delta = createAttackPathDelta({ scenarioId: scenario.id });
    const riskDelta = createRiskDelta({ scenarioId: scenario.id, overallBefore: 0.5, overallAfter: 0.3, levelBefore: RiskLevel.Medium, levelAfter: RiskLevel.Low });
    const scoreDelta = createSecurityScoreDelta({ scenarioId: scenario.id, scoreBefore: 50, scoreAfter: 70 });
    const effect = createMitigationEffect({ scenarioId: scenario.id });
    const candidate = createRemediationCandidate({ scenarioId: scenario.id, targetType: MitigationScenarioType.RemoveFinding, targetId: 'f1', targetLabel: 'F1' });

    const a1 = createImpactAnalysis({ scenarioId: scenario.id, scenarioType: MitigationScenarioType.RemoveFinding, attackPathDelta: delta, riskDelta, securityScoreDelta: scoreDelta, mitigationEffect: effect, remediationCandidate: candidate });
    const a2 = createImpactAnalysis({ scenarioId: scenario.id, scenarioType: MitigationScenarioType.RemoveFinding, attackPathDelta: delta, riskDelta, securityScoreDelta: scoreDelta, mitigationEffect: effect, remediationCandidate: candidate });

    expect(impactAnalysesEqual(a1, a1)).toBe(true);
    expect(impactAnalysesEqual(a1, a2)).toBe(false);

    const cloned = cloneImpactAnalysis(a1);
    expect(cloned.id).toBe(a1.id);

    const hash = hashImpactAnalysis(a1);
    expect(typeof hash).toBe('number');
  });

  it('should support scenario equality', () => {
    const s1 = createImpactScenario({ type: MitigationScenarioType.RemoveFinding, targetId: 'f1', targetType: 'finding' });
    const s2 = createImpactScenario({ type: MitigationScenarioType.RemoveFinding, targetId: 'f1', targetType: 'finding' });
    expect(impactScenariosEqual(s1, s1)).toBe(true);
    expect(impactScenariosEqual(s1, s2)).toBe(false);
  });
});

// ─── Enums & Constants ───────────────────────────────────────

describe('Impact Analysis — Enums & Constants', () => {
  it('should have 8 mitigation scenario types', () => {
    expect(ALL_MITIGATION_SCENARIO_TYPES.length).toBe(8);
    expect(ALL_MITIGATION_SCENARIO_TYPES).toContain(MitigationScenarioType.RemoveFinding);
    expect(ALL_MITIGATION_SCENARIO_TYPES).toContain(MitigationScenarioType.NetworkIsolation);
  });

  it('should have 4 attack path change types', () => {
    expect(ALL_ATTACK_PATH_CHANGE_TYPES.length).toBe(4);
  });

  it('should have 4 remediation ranking strategies', () => {
    expect(ALL_REMEDIATION_RANKING_STRATEGIES.length).toBe(4);
  });

  it('should have 5 security grades', () => {
    expect(ALL_SECURITY_GRADES.length).toBe(5);
  });

  it('should have default engine config', () => {
    expect(DEFAULT_IMPACT_ENGINE_CONFIG.engineId).toBe('default');
    expect(DEFAULT_IMPACT_ENGINE_CONFIG.enableCaching).toBe(true);
    expect(DEFAULT_IMPACT_ENGINE_CONFIG.riskReductionWeight).toBe(0.30);
  });
});

// ─── Scenarios ───────────────────────────────────────────────

describe('Impact Analysis — Scenarios', () => {
  let paths: AttackPath[];
  let assessments: RiskAssessment[];

  beforeEach(() => {
    paths = [makeAttackPath({ findingIds: ['finding-1'] }), makeAttackPath(), makeAttackPath({ findingIds: ['finding-1', 'finding-2'] })];
    assessments = [makeRiskAssessment('finding-1', 0.8), makeRiskAssessment('finding-2', 0.6), makeRiskAssessment('finding-3', 0.3)];
  });

  it('should evaluate RemoveFinding scenario', () => {
    const scenario = createRemoveFindingScenario('finding-1', paths.map(p => p.id));
    const result = evaluateScenario(scenario, paths, assessments);
    expect(result.eliminatedPathIds.length).toBeGreaterThan(0);
    expect(result.riskReductionFactor).toBeGreaterThan(0);
    expect(result.affectedFindingIds).toContain('finding-1');
  });

  it('should evaluate PatchVulnerability scenario', () => {
    const scenario = createPatchVulnerabilityScenario('vuln-1', paths.map(p => p.id));
    const result = evaluateScenario(scenario, paths, assessments);
    expect(result.riskReductionFactor).toBe(0.75);
    expect(result.exploitabilityFactor).toBe(0.85);
  });

  it('should evaluate RemoveCorrelation scenario', () => {
    const groups = [makeCorrelationGroup(['finding-1', 'finding-2'])];
    const scenario = createRemoveCorrelationScenario(groups[0].id, paths.map(p => p.id));
    const result = evaluateScenario(scenario, paths, assessments, groups);
    expect(result.riskReductionFactor).toBe(0.7);
    expect(result.dependencies.length).toBeGreaterThan(0);
  });

  it('should evaluate RemoveAsset scenario', () => {
    const assetPath = makeAttackPath({ assetId: 'asset-1' });
    const scenario = createRemoveAssetScenario('asset-1', [assetPath.id]);
    const result = evaluateScenario(scenario, [assetPath], assessments);
    expect(result.eliminatedPathIds.length).toBeGreaterThan(0);
  });

  it('should evaluate DisableService scenario', () => {
    const scenario = createDisableServiceScenario('service-1');
    const result = evaluateScenario(scenario, paths, assessments);
    expect(result.riskReductionFactor).toBe(0.7);
  });

  it('should evaluate CloseEndpoint scenario', () => {
    const scenario = createCloseEndpointScenario('endpoint-1');
    const result = evaluateScenario(scenario, paths, assessments);
    expect(result.riskReductionFactor).toBe(0.65);
  });

  it('should evaluate RotateCredential scenario', () => {
    const scenario = createRotateCredentialScenario('cred-1');
    const result = evaluateScenario(scenario, paths, assessments);
    expect(result.riskReductionFactor).toBe(0.4);
  });

  it('should evaluate NetworkIsolation scenario', () => {
    const scenario = createNetworkIsolationScenario('net-1', paths.map(p => p.id));
    const result = evaluateScenario(scenario, paths, assessments);
    expect(result.riskReductionFactor).toBe(0.55);
  });

  it('should throw on unknown scenario type', () => {
    const badScenario = createImpactScenario({ type: 'Unknown' as any, targetId: 'x', targetType: 'finding' });
    expect(() => evaluateScenario(badScenario, paths, assessments)).toThrow();
  });

  it('should return empty result for non-matching correlation group', () => {
    const groups = [makeCorrelationGroup(['nonexistent-1', 'nonexistent-2'])];
    const scenario = createRemoveCorrelationScenario('nonexistent-group');
    const result = evaluateScenario(scenario, paths, assessments, groups);
    expect(result.eliminatedPathIds.length).toBe(0);
  });
});

// ─── Delta Engine ────────────────────────────────────────────

describe('Impact Analysis — Delta Engine', () => {
  it('should compute attack path delta', () => {
    const scenario = createRemoveFindingScenario('f1');
    const paths = [makeAttackPath({ findingIds: ['f1'] }), makeAttackPath()];
    const evaluation = evaluateScenario(scenario, paths, []);
    const delta = computeAttackPathDelta(scenario.id, paths, evaluation);

    expect(delta.totalBefore).toBe(2);
    expect(delta.eliminatedPaths.length + delta.shortenedPaths.length + delta.reducedPaths.length + delta.unchangedPaths.length).toBe(2);
  });

  it('should compute attack surface reduction', () => {
    const delta = createAttackPathDelta({
      scenarioId: 's1' as any,
      eliminatedPaths: ['p1' as any, 'p2' as any],
      unchangedPaths: ['p3' as any],
      totalBefore: 3,
      totalAfter: 1,
    });
    expect(computeAttackSurfaceReduction(delta)).toBeCloseTo(2 / 3);
  });

  it('should return 0 for empty attack surface', () => {
    const delta = createAttackPathDelta({ scenarioId: 's1' as any });
    expect(computeAttackSurfaceReduction(delta)).toBe(0);
  });

  it('should count paths by change type', () => {
    const delta = createAttackPathDelta({
      scenarioId: 's1' as any,
      eliminatedPaths: ['p1' as any],
      reducedPaths: [createAttackPathDeltaDetail({
        pathId: 'p2' as any, changeType: AttackPathChangeType.Reduced,
        riskBefore: 0.8, riskAfter: 0.4, lengthBefore: 5, lengthAfter: 5,
        probabilityBefore: 0.7, probabilityAfter: 0.3,
      })],
      unchangedPaths: ['p3' as any],
    });
    const counts = countPathsByChangeType(delta);
    expect(counts[AttackPathChangeType.Eliminated]).toBe(1);
    expect(counts[AttackPathChangeType.Reduced]).toBe(1);
    expect(counts[AttackPathChangeType.Unchanged]).toBe(1);
  });
});

// ─── Risk Delta ──────────────────────────────────────────────

describe('Impact Analysis — Risk Delta', () => {
  it('should compute overall risk', () => {
    const assessments = [
      makeRiskAssessment('f1', 0.8),
      makeRiskAssessment('f2', 0.4),
    ];
    const overall = computeOverallRisk(assessments);
    expect(overall).toBeGreaterThan(0);
    expect(overall).toBeLessThanOrEqual(1);
  });

  it('should return 0 for empty assessments', () => {
    expect(computeOverallRisk([])).toBe(0);
  });

  it('should weight Critical findings higher', () => {
    const critical = [makeRiskAssessment('f1', 0.9)];
    const low = [makeRiskAssessment('f1', 0.1)];
    expect(computeOverallRisk(critical)).toBeGreaterThan(computeOverallRisk(low));
  });

  it('should compute risk delta', () => {
    const assessments = [makeRiskAssessment('f1', 0.9), makeRiskAssessment('f2', 0.3)];
    const paths = [makeAttackPath({ findingIds: ['f1'] })];
    const scenario = createRemoveFindingScenario('f1', paths.map(p => p.id));
    const evaluation = evaluateScenario(scenario, paths, assessments);
    const delta = computeRiskDelta(scenario.id, assessments, paths, evaluation);

    expect(delta.overallBefore).toBeGreaterThan(delta.overallAfter);
    expect(delta.overallDifference).toBeGreaterThan(0);
    expect(delta.perAssessmentDeltas.length).toBeGreaterThan(0);
  });
});

// ─── Graph Delta ─────────────────────────────────────────────

describe('Impact Analysis — Graph Delta', () => {
  it('should compute graph delta', () => {
    const paths = [makeAttackPath()];
    const scenario = createRemoveFindingScenario('f1');
    const evaluation = evaluateScenario(scenario, paths, []);
    const delta = computeGraphDelta(scenario.id, paths, evaluation);

    expect(delta.totalNodesBefore).toBeGreaterThan(0);
    expect(delta.totalEdgesBefore).toBeGreaterThan(0);
    expect(typeof delta.connectivityDelta).toBe('number');
  });

  it('should compute connectivity score', () => {
    const paths = [makeAttackPath()];
    const scenario = createRemoveFindingScenario('f1');
    const evaluation = evaluateScenario(scenario, paths, []);
    const delta = computeGraphDelta(scenario.id, paths, evaluation);
    const score = computeConnectivityScore(delta);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should handle empty paths', () => {
    const scenario = createRemoveFindingScenario('f1');
    const evaluation = evaluateScenario(scenario, [], []);
    const delta = computeGraphDelta(scenario.id, [], evaluation);
    expect(delta.totalNodesBefore).toBe(0);
  });
});

// ─── Recommendation ──────────────────────────────────────────

describe('Impact Analysis — Recommendation', () => {
  it('should compute recommendation impact', () => {
    const scenario = createRemoveFindingScenario('f1');
    const paths = [makeAttackPath({ findingIds: ['f1'] }), makeAttackPath()];
    const evaluation = evaluateScenario(scenario, paths, []);
    const candidate = computeRecommendationImpact(
      scenario.id, MitigationScenarioType.RemoveFinding, 'f1', 'Finding 1', evaluation, 2,
    );
    expect(candidate.targetId).toBe('f1');
    expect(candidate.riskReduction).toBeGreaterThan(0);
  });

  it('should rank by MaximumRiskReduction', () => {
    const candidates = [
      createRemediationCandidate({ scenarioId: 's1' as any, targetType: MitigationScenarioType.RemoveFinding, targetId: 'a', targetLabel: 'A', riskReduction: 0.3, estimatedCost: 0.1 }),
      createRemediationCandidate({ scenarioId: 's2' as any, targetType: MitigationScenarioType.PatchVulnerability, targetId: 'b', targetLabel: 'B', riskReduction: 0.8, estimatedCost: 0.5 }),
    ];
    const result = rankRemediationCandidates(candidates, RemediationRankingStrategy.MaximumRiskReduction);
    expect(result.ranked[0].targetId).toBe('b');
    expect(result.ranked[0].rank).toBe(1);
  });

  it('should rank by MinimumCost', () => {
    const candidates = [
      createRemediationCandidate({ scenarioId: 's1' as any, targetType: MitigationScenarioType.RemoveFinding, targetId: 'a', targetLabel: 'A', estimatedCost: 0.5 }),
      createRemediationCandidate({ scenarioId: 's2' as any, targetType: MitigationScenarioType.RotateCredential, targetId: 'b', targetLabel: 'B', estimatedCost: 0.1 }),
    ];
    const result = rankRemediationCandidates(candidates, RemediationRankingStrategy.MinimumCost);
    expect(result.ranked[0].targetId).toBe('b');
  });

  it('should rank by MaximumCoverage', () => {
    const candidates = [
      createRemediationCandidate({ scenarioId: 's1' as any, targetType: MitigationScenarioType.RemoveFinding, targetId: 'a', targetLabel: 'A', pathsAffected: 2 }),
      createRemediationCandidate({ scenarioId: 's2' as any, targetType: MitigationScenarioType.PatchVulnerability, targetId: 'b', targetLabel: 'B', pathsAffected: 5 }),
    ];
    const result = rankRemediationCandidates(candidates, RemediationRankingStrategy.MaximumCoverage);
    expect(result.ranked[0].targetId).toBe('b');
  });

  it('should rank by ShortestAttackElimination', () => {
    const candidates = [
      createRemediationCandidate({ scenarioId: 's1' as any, targetType: MitigationScenarioType.RemoveFinding, targetId: 'a', targetLabel: 'A', pathsEliminated: 1, implementationComplexity: 0.5 }),
      createRemediationCandidate({ scenarioId: 's2' as any, targetType: MitigationScenarioType.NetworkIsolation, targetId: 'b', targetLabel: 'B', pathsEliminated: 3, implementationComplexity: 0.7 }),
    ];
    const result = rankRemediationCandidates(candidates, RemediationRankingStrategy.ShortestAttackElimination);
    expect(result.ranked[0].targetId).toBe('b');
  });

  it('should handle empty candidates', () => {
    const result = rankRemediationCandidates([]);
    expect(result.ranked).toEqual([]);
    expect(result.topCandidate).toBeNull();
  });

  it('should compare candidates', () => {
    const a = createRemediationCandidate({ scenarioId: 's1' as any, targetType: MitigationScenarioType.RemoveFinding, targetId: 'a', targetLabel: 'A', riskReduction: 0.3 });
    const b = createRemediationCandidate({ scenarioId: 's2' as any, targetType: MitigationScenarioType.PatchVulnerability, targetId: 'b', targetLabel: 'B', riskReduction: 0.8 });
    expect(compareRemediationCandidates(a, b, RemediationRankingStrategy.MaximumRiskReduction)).toBeGreaterThan(0);
  });
});

// ─── Events ──────────────────────────────────────────────────

describe('Impact Analysis — Events', () => {
  it('should create all 4 event types', () => {
    const e1 = createImpactAnalysisStartedEvent('s1' as any, 'RemoveFinding');
    expect(e1.type).toBe('ImpactAnalysisStarted');

    const e2 = createImpactCalculatedEvent('a1' as any, 's1' as any, 0.4, 3);
    expect(e2.type).toBe('ImpactCalculated');

    const e3 = createScenarioCompletedEvent('s1' as any, 'a1' as any, 150);
    expect(e3.type).toBe('ScenarioCompleted');

    const e4 = createRecommendationRankedEvent('a1' as any, RemediationRankingStrategy.MaximumRiskReduction, 5, 'rc1');
    expect(e4.type).toBe('RecommendationRanked');
  });

  it('should publish and subscribe events', () => {
    const bus = new ImpactEventBus();
    const received: any[] = [];
    const unsub = bus.subscribe(e => received.push(e));

    bus.publish(createImpactAnalysisStartedEvent('s1' as any, 'RemoveFinding'));
    bus.publish(createImpactCalculatedEvent('a1' as any, 's1' as any, 0.4, 3));

    expect(received.length).toBe(2);
    expect(bus.handlerCount).toBe(1);

    unsub();
    expect(bus.handlerCount).toBe(0);
  });

  it('should handle errors in event handlers', () => {
    const bus = new ImpactEventBus();
    bus.subscribe(() => { throw new Error('Handler error'); });
    bus.subscribe((e) => {}); // This should still work
    expect(() => bus.publish(createImpactAnalysisStartedEvent('s1' as any, 'RemoveFinding'))).not.toThrow();
  });

  it('should clear event bus', () => {
    const bus = new ImpactEventBus();
    bus.subscribe(() => {});
    bus.clear();
    expect(bus.handlerCount).toBe(0);
  });
});

// ─── Cache ───────────────────────────────────────────────────

describe('Impact Analysis — Cache', () => {
  let cache: ImpactCache;

  beforeEach(() => {
    cache = new ImpactCache({ capacity: 5, ttlMs: 1000 });
  });

  it('should store and retrieve analyses', () => {
    const scenario = createImpactScenario({ type: MitigationScenarioType.RemoveFinding, targetId: 'f1', targetType: 'finding' });
    const delta = createAttackPathDelta({ scenarioId: scenario.id });
    const riskDelta = createRiskDelta({ scenarioId: scenario.id, overallBefore: 0.8, overallAfter: 0.4, levelBefore: RiskLevel.High, levelAfter: RiskLevel.Medium });
    const scoreDelta = createSecurityScoreDelta({ scenarioId: scenario.id, scoreBefore: 50, scoreAfter: 70 });
    const effect = createMitigationEffect({ scenarioId: scenario.id });
    const candidate = createRemediationCandidate({ scenarioId: scenario.id, targetType: MitigationScenarioType.RemoveFinding, targetId: 'f1', targetLabel: 'F1' });
    const analysis = createImpactAnalysis({ scenarioId: scenario.id, scenarioType: MitigationScenarioType.RemoveFinding, attackPathDelta: delta, riskDelta, securityScoreDelta: scoreDelta, mitigationEffect: effect, remediationCandidate: candidate });

    cache.setAnalysis('key1', analysis);
    const retrieved = cache.getAnalysis('key1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(analysis.id);
  });

  it('should return null for missing keys', () => {
    expect(cache.getAnalysis('nonexistent')).toBeNull();
    expect(cache.getDelta('nonexistent')).toBeNull();
  });

  it('should expire entries after TTL', async () => {
    const shortCache = new ImpactCache({ capacity: 10, ttlMs: 50 });
    const scenario = createImpactScenario({ type: MitigationScenarioType.RemoveFinding, targetId: 'f1', targetType: 'finding' });
    const delta = createAttackPathDelta({ scenarioId: scenario.id });
    const riskDelta = createRiskDelta({ scenarioId: scenario.id, overallBefore: 0.5, overallAfter: 0.3, levelBefore: RiskLevel.Medium, levelAfter: RiskLevel.Low });
    const scoreDelta = createSecurityScoreDelta({ scenarioId: scenario.id, scoreBefore: 50, scoreAfter: 70 });
    const effect = createMitigationEffect({ scenarioId: scenario.id });
    const candidate = createRemediationCandidate({ scenarioId: scenario.id, targetType: MitigationScenarioType.RemoveFinding, targetId: 'f1', targetLabel: 'F1' });
    const analysis = createImpactAnalysis({ scenarioId: scenario.id, scenarioType: MitigationScenarioType.RemoveFinding, attackPathDelta: delta, riskDelta, securityScoreDelta: scoreDelta, mitigationEffect: effect, remediationCandidate: candidate });

    shortCache.setAnalysis('key1', analysis);
    expect(shortCache.getAnalysis('key1')).not.toBeNull();

    await new Promise(r => setTimeout(r, 60));
    expect(shortCache.getAnalysis('key1')).toBeNull();
  });

  it('should evict oldest entries when at capacity', () => {
    const smallCache = new ImpactCache({ capacity: 2, ttlMs: 60000 });
    for (let i = 0; i < 5; i++) {
      smallCache.setDelta(`key_${i}`, { value: i });
    }
    const stats = smallCache.getStatistics();
    expect(stats.deltaCacheSize).toBeLessThanOrEqual(2);
    expect(stats.evictions).toBeGreaterThan(0);
  });

  it('should invalidate entries', () => {
    cache.setDelta('key1', { data: 1 });
    cache.setDelta('key2', { data: 2 });
    expect(cache.invalidate('key1')).toBe(true);
    expect(cache.getDelta('key1')).toBeNull();
    expect(cache.getDelta('key2')).not.toBeNull();
  });

  it('should invalidate by pattern', () => {
    cache.setDelta('scenario_1', { data: 1 });
    cache.setDelta('scenario_2', { data: 2 });
    cache.setDelta('other_1', { data: 3 });
    const count = cache.invalidatePattern('scenario_');
    expect(count).toBe(2);
  });

  it('should invalidate all analyses', () => {
    cache.setDelta('d1', { data: 1 });
    const scenario = createImpactScenario({ type: MitigationScenarioType.RemoveFinding, targetId: 'f1', targetType: 'finding' });
    const delta = createAttackPathDelta({ scenarioId: scenario.id });
    const riskDelta = createRiskDelta({ scenarioId: scenario.id, overallBefore: 0.5, overallAfter: 0.3, levelBefore: RiskLevel.Medium, levelAfter: RiskLevel.Low });
    const scoreDelta = createSecurityScoreDelta({ scenarioId: scenario.id, scoreBefore: 50, scoreAfter: 70 });
    const effect = createMitigationEffect({ scenarioId: scenario.id });
    const candidate = createRemediationCandidate({ scenarioId: scenario.id, targetType: MitigationScenarioType.RemoveFinding, targetId: 'f1', targetLabel: 'F1' });
    const analysis = createImpactAnalysis({ scenarioId: scenario.id, scenarioType: MitigationScenarioType.RemoveFinding, attackPathDelta: delta, riskDelta, securityScoreDelta: scoreDelta, mitigationEffect: effect, remediationCandidate: candidate });
    cache.setAnalysis('a1', analysis);

    const count = cache.invalidateAnalyses();
    expect(count).toBe(1);
  });

  it('should purge expired entries', async () => {
    const shortCache = new ImpactCache({ capacity: 10, ttlMs: 30 });
    shortCache.setDelta('k1', { data: 1 });
    await new Promise(r => setTimeout(r, 40));
    const count = shortCache.purgeExpired();
    expect(count).toBe(1);
  });

  it('should report cache statistics', () => {
    cache.setDelta('k1', { data: 1 });
    cache.getDelta('k1'); // hit
    cache.getDelta('missing'); // miss

    const stats = cache.getStatistics();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.5);
  });

  it('should check has() for existing keys', () => {
    cache.setDelta('k1', { data: 1 });
    expect(cache.has('k1')).toBe(true);
    expect(cache.has('missing')).toBe(false);
  });

  it('should clear the cache', () => {
    cache.setDelta('k1', { data: 1 });
    cache.setDelta('k2', { data: 2 });
    cache.clear();
    const stats = cache.getStatistics();
    expect(stats.totalSize).toBe(0);
  });
});

// ─── Statistics ──────────────────────────────────────────────

describe('Impact Analysis — Statistics', () => {
  it('should collect statistics', () => {
    const collector = new ImpactStatisticsCollector();
    collector.recordAnalysis(100, MitigationScenarioType.RemoveFinding);
    collector.recordAnalysis(200, MitigationScenarioType.PatchVulnerability);
    collector.recordSimulation(50);
    collector.recordComparison(30);
    collector.recordRanking();
    collector.recordFailure();
    collector.recordBatch();
    collector.recordCacheHit();
    collector.recordCacheMiss();

    const stats = collector.getStatistics();
    expect(stats.totalAnalyses).toBe(2);
    expect(stats.totalSimulations).toBe(1);
    expect(stats.totalComparisons).toBe(1);
    expect(stats.totalRankings).toBe(1);
    expect(stats.totalFailed).toBe(1);
    expect(stats.totalBatches).toBe(1);
    expect(stats.averageAnalysisTimeMs).toBe(150);
    expect(stats.cacheHitRate).toBeCloseTo(0.5);
    expect(stats.scenarioTypeDistribution[MitigationScenarioType.RemoveFinding]).toBe(1);
  });

  it('should reset statistics', () => {
    const collector = new ImpactStatisticsCollector();
    collector.recordAnalysis(100, MitigationScenarioType.RemoveFinding);
    collector.reset();
    const stats = collector.getStatistics();
    expect(stats.totalAnalyses).toBe(0);
  });
});

// ─── Engine ──────────────────────────────────────────────────

describe('Impact Analysis — Engine', () => {
  let engine: ImpactAnalysisEngine;
  let paths: AttackPath[];
  let assessments: RiskAssessment[];

  beforeEach(() => {
    engine = new ImpactAnalysisEngine({ enableCaching: false });
    paths = [makeAttackPath({ findingIds: ['f1'] }), makeAttackPath({ findingIds: ['f2'] }), makeAttackPath()];
    assessments = [makeRiskAssessment('f1', 0.9), makeRiskAssessment('f2', 0.6), makeRiskAssessment('f3', 0.2)];
  });

  it('should analyze a scenario', () => {
    const scenario = createRemoveFindingScenario('f1', paths.map(p => p.id));
    const analysis = engine.analyze({ scenario, attackPaths: paths, riskAssessments: assessments });

    expect(analysis.scenarioType).toBe(MitigationScenarioType.RemoveFinding);
    expect(analysis.riskDelta.overallDifference).toBeGreaterThanOrEqual(0);
    expect(analysis.securityScoreDelta).toBeDefined();
    expect(analysis.attackPathDelta).toBeDefined();
    expect(analysis.mitigationEffect).toBeDefined();
    expect(analysis.remediationCandidate).toBeDefined();
    expect(analysis.analysisDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('should simulate a scenario', () => {
    const scenario = createPatchVulnerabilityScenario('vuln-1', paths.map(p => p.id));
    const analysis = engine.simulate(scenario, paths, assessments);
    expect(analysis.scenarioType).toBe(MitigationScenarioType.PatchVulnerability);
  });

  it('should compare two analyses', () => {
    const scenario1 = createRemoveFindingScenario('f1');
    const scenario2 = createPatchVulnerabilityScenario('v1');
    const a1 = engine.analyze({ scenario: scenario1, attackPaths: paths, riskAssessments: assessments });
    const a2 = engine.analyze({ scenario: scenario2, attackPaths: paths, riskAssessments: assessments });

    const result = engine.compare({ baseline: a1, alternative: a2 });
    expect(result.winner).toBeDefined();
    expect(typeof result.riskDeltaDifference).toBe('number');
    expect(typeof result.securityScoreDifference).toBe('number');
  });

  it('should rank analyses', () => {
    const scenarios = [
      createRemoveFindingScenario('f1'),
      createPatchVulnerabilityScenario('v1'),
      createNetworkIsolationScenario('net-1'),
    ];
    const analyses = scenarios.map(s => engine.analyze({ scenario: s, attackPaths: paths, riskAssessments: assessments }));
    const result = engine.rank(analyses, RemediationRankingStrategy.MaximumRiskReduction);

    expect(result.ranked.length).toBe(3);
    expect(result.topCandidate).not.toBeNull();
    expect(result.strategy).toBe(RemediationRankingStrategy.MaximumRiskReduction);
  });

  it('should batch analyze', () => {
    const scenarios = [
      createRemoveFindingScenario('f1'),
      createPatchVulnerabilityScenario('v1'),
    ];
    const results = engine.analyzeBatch(scenarios, paths, assessments);
    expect(results.length).toBe(2);
  });

  it('should report statistics', () => {
    const scenario = createRemoveFindingScenario('f1');
    engine.analyze({ scenario, attackPaths: paths, riskAssessments: assessments });

    const stats = engine.statistics();
    expect(stats.totalAnalyses).toBe(1);
  });

  it('should reset engine', () => {
    const scenario = createRemoveFindingScenario('f1');
    engine.analyze({ scenario, attackPaths: paths, riskAssessments: assessments });
    engine.reset();

    const stats = engine.statistics();
    expect(stats.totalAnalyses).toBe(0);
  });

  it('should use caching when enabled', () => {
    const cachedEngine = new ImpactAnalysisEngine({ enableCaching: true, cacheSize: 100, cacheTtlMs: 60000 });
    const scenario = createRemoveFindingScenario('f1');
    const input = { scenario, attackPaths: paths, riskAssessments: assessments };

    const a1 = cachedEngine.analyze(input);
    const a2 = cachedEngine.analyze(input);
    // Second call should hit cache and return same result
    expect(a1.id).toBe(a2.id);
    expect(cachedEngine.cacheStatistics.hits).toBeGreaterThan(0);
  });

  it('should emit events', () => {
    const events: any[] = [];
    engine.eventBus.subscribe(e => events.push(e));

    const scenario = createRemoveFindingScenario('f1');
    engine.analyze({ scenario, attackPaths: paths, riskAssessments: assessments });

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some(e => e.type === 'ImpactAnalysisStarted')).toBe(true);
    expect(events.some(e => e.type === 'ImpactCalculated')).toBe(true);
  });

  it('should record failures', () => {
    const badScenario = createImpactScenario({ type: 'Unknown' as any, targetId: 'x', targetType: 'finding' });
    expect(() => engine.analyze({ scenario: badScenario, attackPaths: paths, riskAssessments: assessments })).toThrow();
    expect(engine.statistics().totalFailed).toBe(1);
  });
});

// ─── Edge Cases ──────────────────────────────────────────────

describe('Impact Analysis — Edge Cases', () => {
  it('should handle empty attack paths', () => {
    const engine = new ImpactAnalysisEngine({ enableCaching: false });
    const scenario = createRemoveFindingScenario('f1');
    const analysis = engine.analyze({ scenario, attackPaths: [], riskAssessments: [] });
    expect(analysis.attackPathDelta.totalBefore).toBe(0);
    expect(analysis.riskDelta.overallBefore).toBe(0);
  });

  it('should handle empty risk assessments', () => {
    const engine = new ImpactAnalysisEngine({ enableCaching: false });
    const paths = [makeAttackPath()];
    const scenario = createRemoveFindingScenario('f1');
    const analysis = engine.analyze({ scenario, attackPaths: paths, riskAssessments: [] });
    expect(analysis.riskDelta.overallBefore).toBe(0);
  });

  it('should handle scenario with no matching paths', () => {
    const engine = new ImpactAnalysisEngine({ enableCaching: false });
    const paths = [makeAttackPath()]; // No 'f1' finding
    const scenario = createRemoveFindingScenario('f1');
    const analysis = engine.analyze({ scenario, attackPaths: paths, riskAssessments: [] });
    expect(analysis.attackPathDelta.eliminatedPaths.length).toBe(0);
  });

  it('should handle compare with identical analyses', () => {
    const engine = new ImpactAnalysisEngine({ enableCaching: false });
    const paths = [makeAttackPath()];
    const assessments = [makeRiskAssessment('f1', 0.5)];
    const scenario = createRemoveFindingScenario('f1');
    const analysis = engine.analyze({ scenario, attackPaths: paths, riskAssessments: assessments });
    const result = engine.compare({ baseline: analysis, alternative: analysis });
    expect(result.winner).toBe('tie');
  });

  it('should handle batch with empty scenarios', () => {
    const engine = new ImpactAnalysisEngine({ enableCaching: false });
    const results = engine.analyzeBatch([], [makeAttackPath()], []);
    expect(results.length).toBe(0);
  });

  it('should handle large batch sizes', () => {
    const engine = new ImpactAnalysisEngine({ enableCaching: false, batchSize: 2 });
    const scenarios = Array.from({ length: 5 }, (_, i) => createRemoveFindingScenario(`f${i}`));
    const results = engine.analyzeBatch(scenarios, [makeAttackPath()], []);
    expect(results.length).toBe(5);
  });

  it('should handle security score clamping', () => {
    const delta = createSecurityScoreDelta({
      scenarioId: 's1' as any,
      scoreBefore: 150, // Over 100
      scoreAfter: -20,  // Under 0
    });
    expect(delta.scoreBefore).toBe(100);
    expect(delta.scoreAfter).toBe(0);
  });
});
