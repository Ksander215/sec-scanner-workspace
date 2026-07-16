/**
 * Impact Analysis — Additional Coverage Tests
 *
 * Targets scenarios, cache, and delta edge cases for ≥97% coverage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MitigationScenarioType, AttackPathChangeType, RemediationRankingStrategy, SecurityGrade,
  createImpactScenario, createMitigationEffect,
  createAttackPathDelta, createAttackPathDeltaDetail,
  createRiskDelta, createSecurityScoreDelta,
  createDependencyImpact, createRemediationCandidate,
  createImpactAnalysis,
  evaluateScenario,
  createRemoveFindingScenario, createPatchVulnerabilityScenario,
  createNetworkIsolationScenario, createRemoveCorrelationScenario,
  createRemoveAssetScenario, createDisableServiceScenario,
  createCloseEndpointScenario, createRotateCredentialScenario,
  computeAttackPathDelta, computeAttackSurfaceReduction,
  computeRiskDelta, computeOverallRisk,
  computeGraphDelta, computeConnectivityScore,
  computeRecommendationImpact, rankRemediationCandidates,
  ImpactCache,
  ImpactAnalysisEngine,
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
import {
  createCorrelationGroup,
} from '../../correlation/index.ts';
import type { AttackPath, AttackNode } from '../../attack-path/types/index.ts';
import type { RiskAssessment } from '../../risk/types/index.ts';

// ─── Helpers ─────────────────────────────────────────────────

function makeNode(overrides: Record<string, any> = {}): AttackNode {
  return createAttackNode({
    graphNodeId: `gn_${Math.random().toString(36).slice(2, 8)}` as any,
    nodeType: overrides.isEntryPoint ? AttackNodeType.EntryPoint : overrides.isObjective ? AttackNodeType.Objective : AttackNodeType.Vulnerability,
    label: overrides.label ?? `Node_${Math.random().toString(36).slice(2, 6)}`,
    riskScore: overrides.riskScore ?? 0.5,
    riskLevel: (overrides.riskScore ?? 0.5) >= 0.8 ? RiskLevel.Critical : RiskLevel.Medium,
    findingIds: (overrides.findingIds ?? []) as any,
    assetId: (overrides.assetId ?? null) as any,
    isEntryPoint: overrides.isEntryPoint ?? false,
    isObjective: overrides.isObjective ?? false,
    metadata: overrides.metadata as any ?? {},
  });
}

function makePath(overrides: { findingIds?: string[]; assetId?: string; metadata?: Record<string, any>; serviceLabel?: string; endpointId?: string; credentialId?: string; networkId?: string } = {}): AttackPath {
  const n1 = makeNode({ isEntryPoint: true, label: 'Entry', findingIds: overrides.findingIds, metadata: { endpointId: overrides.endpointId } });
  const n2 = makeNode({ riskScore: 0.7, label: overrides.serviceLabel ?? 'Vuln', findingIds: overrides.findingIds, assetId: overrides.assetId ?? null, metadata: { serviceId: overrides.serviceLabel, credentialId: overrides.credentialId, vulnerabilityId: overrides.findingIds?.[0], ...overrides.metadata } });
  const n3 = makeNode({ isObjective: true, label: 'Objective' });

  const e1 = createAttackEdge({
    sourceNodeId: n1.id, targetNodeId: n2.id,
    graphEdgeId: `ge1_${Math.random().toString(36).slice(2, 8)}` as any,
    edgeType: AttackEdgeType.Exploitation, probability: 0.8, riskContribution: 0.7,
    requiresAuthentication: !!overrides.credentialId,
    metadata: { networkId: overrides.networkId } as any,
  });
  const e2 = createAttackEdge({
    sourceNodeId: n2.id, targetNodeId: n3.id,
    graphEdgeId: `ge2_${Math.random().toString(36).slice(2, 8)}` as any,
    edgeType: AttackEdgeType.LateralMovement, probability: 0.6, riskContribution: 0.5,
    isLateralMovement: true,
    metadata: { networkId: overrides.networkId } as any,
  });

  const s1 = createAttackStep({ node: n1, incomingEdge: null, outgoingEdges: [e1], stepIndex: 0, isCritical: true });
  const s2 = createAttackStep({ node: n2, incomingEdge: e1, outgoingEdges: [e2], stepIndex: 1, isCritical: true });
  const s3 = createAttackStep({ node: n3, incomingEdge: e2, outgoingEdges: [], stepIndex: 2, isDetectionPoint: true });

  const obj = createAttackObjective({ type: AttackObjectiveType.InitialAccess });
  const rank = createAttackPathRanking({ riskScore: 0.8, pathLengthScore: 0.5, exploitAvailabilityScore: 0.7, privilegeEscalationScore: 0.3, lateralMovementScore: 0.4, internetExposureScore: 0.6, businessImpactScore: 0.5, confidenceScore: 0.4 });

  return createAttackPath({
    steps: [s1, s2, s3], edges: [e1, e2], nodes: [n1, n2, n3],
    objective: obj, ranking: rank, discoveryStrategy: DiscoveryStrategy.BFS, discoveryDurationMs: 10,
  });
}

function makeRA(findingId: string, score: number): RiskAssessment {
  const level = score >= 0.8 ? RiskLevel.Critical : score >= 0.6 ? RiskLevel.High : score >= 0.35 ? RiskLevel.Medium : RiskLevel.Low;
  return createRiskAssessment({
    findingId: findingId as any, score: createRiskScore({ rawScore: score, level, factors: [], evidence: [], reasons: [] }),
    scope: 'Finding' as any, scopeId: 'test',
  });
}

// ─── Scenario Deep Coverage ──────────────────────────────────

describe('Impact Analysis — Scenario Deep Coverage', () => {
  it('RemoveFinding: should handle finding on critical node', () => {
    const path1 = makePath({ findingIds: ['finding-CRIT'] });
    const path2 = makePath({ findingIds: ['finding-CRIT', 'finding-OTHER'] });
    const scenario = createRemoveFindingScenario('finding-CRIT', [path1.id, path2.id]);
    const assessments = [makeRA('finding-CRIT', 0.9), makeRA('finding-OTHER', 0.5)];
    const result = evaluateScenario(scenario, [path1, path2], assessments);
    expect(result.eliminatedPathIds.length).toBeGreaterThan(0);
    // Dependencies should be found since finding-CRIT shares paths with finding-OTHER
    expect(result.dependencies.length).toBeGreaterThan(0);
  });

  it('RemoveFinding: should find dependencies via shared paths', () => {
    const path = makePath({ findingIds: ['f1', 'f2'] });
    const assessments = [makeRA('f1', 0.9), makeRA('f2', 0.5)];
    const scenario = createRemoveFindingScenario('f1', [path.id]);
    const result = evaluateScenario(scenario, [path], assessments);
    // Should find f2 as dependent (shares path)
    expect(result.dependencies.length).toBeGreaterThan(0);
  });

  it('RemoveCorrelation: should work with matching group', () => {
    const groups = [createCorrelationGroup({
      findingIds: ['f1' as any, 'f2' as any, 'f3' as any],
      dominantCategory: 'Vulnerability' as any, dominantSeverity: 'High' as any,
      correlationScore: 0.9, reasons: ['SameHost' as any],
    })];
    const path = makePath({ findingIds: ['f1', 'f2'] });
    const scenario = createRemoveCorrelationScenario(groups[0].id, [path.id]);
    const result = evaluateScenario(scenario, [path], [], groups);
    expect(result.eliminatedPathIds.length).toBeGreaterThan(0);
  });

  it('RemoveCorrelation: should return empty for non-existent group', () => {
    const scenario = createRemoveCorrelationScenario('non-existent-group');
    const result = evaluateScenario(scenario, [makePath()], [], []);
    expect(result.eliminatedPathIds.length).toBe(0);
  });

  it('RemoveAsset: should find cascading dependencies', () => {
    const path = makePath({ assetId: 'asset-1' });
    const scenario = createRemoveAssetScenario('asset-1', [path.id]);
    const result = evaluateScenario(scenario, [path], []);
    expect(result.dependencies.length).toBeGreaterThan(0);
  });

  it('PatchVulnerability: should handle critical steps', () => {
    const path = makePath({ findingIds: ['CVE-2025-12345'] });
    const scenario = createPatchVulnerabilityScenario('CVE-2025-12345', [path.id]);
    const result = evaluateScenario(scenario, [path], []);
    expect(result.eliminatedPathIds.length + result.shortenedPathIds.length + result.reducedPathIds.length).toBeGreaterThan(0);
  });

  it('PatchVulnerability: should handle vulnerability via metadata', () => {
    const path = makePath({ findingIds: [], metadata: { vulnerabilityId: 'CVE-2025-99999' } });
    const scenario = createPatchVulnerabilityScenario('CVE-2025-99999', [path.id]);
    const result = evaluateScenario(scenario, [path], []);
    expect(result.affectedNodeIds.length).toBeGreaterThan(0);
  });

  it('DisableService: should match via metadata.serviceId', () => {
    const path = makePath({ serviceLabel: 'ssh-service' });
    const scenario = createDisableServiceScenario('ssh-service', [path.id]);
    const result = evaluateScenario(scenario, [path], []);
    expect(result.eliminatedPathIds.length).toBeGreaterThan(0);
  });

  it('CloseEndpoint: should match entry point by label', () => {
    const path = makePath({ endpointId: 'ep-443' });
    // The entry node has metadata.endpointId = 'ep-443'
    const scenario = createCloseEndpointScenario('ep-443', [path.id]);
    const result = evaluateScenario(scenario, [path], []);
    expect(result.eliminatedPathIds.length).toBeGreaterThan(0);
  });

  it('RotateCredential: should match via metadata.credentialId', () => {
    const path = makePath({ credentialId: 'cred-admin' });
    const scenario = createRotateCredentialScenario('cred-admin', [path.id]);
    const result = evaluateScenario(scenario, [path], []);
    expect(result.reducedPathIds.length).toBeGreaterThan(0);
  });

  it('NetworkIsolation: should block lateral movement', () => {
    const path = makePath({ networkId: 'dmz-net' });
    const scenario = createNetworkIsolationScenario('dmz-net', [path.id]);
    const result = evaluateScenario(scenario, [path], []);
    expect(result.eliminatedPathIds.length + result.reducedPathIds.length).toBeGreaterThan(0);
  });

  it('NetworkIsolation: should eliminate path when all steps are lateral', () => {
    // Create a path where most steps are lateral movement
    const n1 = makeNode({ isEntryPoint: true, label: 'E' });
    const n2 = makeNode({ label: 'L1' });
    const n3 = makeNode({ isObjective: true, label: 'Obj' });

    const e1 = createAttackEdge({
      sourceNodeId: n1.id, targetNodeId: n2.id,
      graphEdgeId: `ge_a` as any,
      edgeType: AttackEdgeType.LateralMovement, probability: 0.8,
      isLateralMovement: true,
      metadata: { networkId: 'target-net' } as any,
    });
    const e2 = createAttackEdge({
      sourceNodeId: n2.id, targetNodeId: n3.id,
      graphEdgeId: `ge_b` as any,
      edgeType: AttackEdgeType.LateralMovement, probability: 0.6,
      isLateralMovement: true,
      metadata: { networkId: 'target-net' } as any,
    });

    const s1 = createAttackStep({ node: n1, incomingEdge: null, outgoingEdges: [e1], stepIndex: 0, isCritical: true });
    const s2 = createAttackStep({ node: n2, incomingEdge: e1, outgoingEdges: [e2], stepIndex: 1 });
    const s3 = createAttackStep({ node: n3, incomingEdge: e2, outgoingEdges: [], stepIndex: 2, isDetectionPoint: true });

    const obj = createAttackObjective({ type: AttackObjectiveType.LateralMovement });
    const rank = createAttackPathRanking({ riskScore: 0.7, pathLengthScore: 0.5, exploitAvailabilityScore: 0.6, privilegeEscalationScore: 0.3, lateralMovementScore: 0.8, internetExposureScore: 0.4, businessImpactScore: 0.5, confidenceScore: 0.3 });

    const path = createAttackPath({
      steps: [s1, s2, s3], edges: [e1, e2], nodes: [n1, n2, n3],
      objective: obj, ranking: rank, discoveryStrategy: DiscoveryStrategy.BFS, discoveryDurationMs: 10,
    });

    const scenario = createNetworkIsolationScenario('target-net', [path.id]);
    const result = evaluateScenario(scenario, [path], []);
    expect(result.eliminatedPathIds.length).toBeGreaterThan(0);
  });
});

// ─── Cache Deep Coverage ─────────────────────────────────────

describe('Impact Analysis — Cache Deep Coverage', () => {
  it('should invalidate deltas', () => {
    const cache = new ImpactCache({ capacity: 100, ttlMs: 60000 });
    cache.setDelta('d1', { value: 1 });
    cache.setDelta('d2', { value: 2 });
    const count = cache.invalidateDeltas();
    expect(count).toBe(2);
    expect(cache.getDelta('d1')).toBeNull();
  });

  it('should return false for invalidating non-existent key', () => {
    const cache = new ImpactCache();
    expect(cache.invalidate('nonexistent')).toBe(false);
  });

  it('should handle invalidatePattern with no matches', () => {
    const cache = new ImpactCache();
    cache.setDelta('key1', { value: 1 });
    expect(cache.invalidatePattern('^no-match')).toBe(0);
  });

  it('should compute memory estimate', () => {
    const cache = new ImpactCache({ capacity: 100 });
    cache.setDelta('k1', { value: 1 });
    cache.setDelta('k2', { value: 2 });
    const stats = cache.getStatistics();
    expect(stats.memoryEstimateBytes).toBeGreaterThan(0);
  });

  it('should invalidate analyses when empty', () => {
    const cache = new ImpactCache();
    expect(cache.invalidateAnalyses()).toBe(0);
  });

  it('should purge when nothing expired', () => {
    const cache = new ImpactCache({ capacity: 100, ttlMs: 60000 });
    cache.setDelta('k1', { value: 1 });
    expect(cache.purgeExpired()).toBe(0);
  });
});

// ─── Delta Engine Deep Coverage ──────────────────────────────

describe('Impact Analysis — Delta Deep Coverage', () => {
  it('should compute delta with shortened paths', () => {
    const scenario = createPatchVulnerabilityScenario('v1');
    const path = makePath({ findingIds: ['v1'] });
    const assessments = [makeRA('v1', 0.8)];
    const evaluation = evaluateScenario(scenario, [path], assessments);
    const delta = computeAttackPathDelta(scenario.id, [path], evaluation);

    expect(delta.totalBefore).toBe(1);
    // Paths should be categorized (eliminated, shortened, reduced, or unchanged)
    const totalCategorized = delta.eliminatedPaths.length + delta.shortenedPaths.length + delta.reducedPaths.length + delta.unchangedPaths.length;
    expect(totalCategorized).toBe(1);
  });

  it('should compute attack surface reduction for empty delta', () => {
    const delta = createAttackPathDelta({ scenarioId: 's1' as any, totalBefore: 0 });
    expect(computeAttackSurfaceReduction(delta)).toBe(0);
  });
});

// ─── Risk Delta Deep Coverage ────────────────────────────────

describe('Impact Analysis — Risk Delta Deep Coverage', () => {
  it('should handle all risk levels in weighting', () => {
    const assessments = [
      makeRA('f1', 0.95), // Critical
      makeRA('f2', 0.7),  // High
      makeRA('f3', 0.5),  // Medium
      makeRA('f4', 0.2),  // Low
      makeRA('f5', 0.05), // Informational
    ];
    const overall = computeOverallRisk(assessments);
    expect(overall).toBeGreaterThan(0);
    expect(overall).toBeLessThanOrEqual(1);
  });
});

// ─── Graph Delta Deep Coverage ───────────────────────────────

describe('Impact Analysis — Graph Delta Deep Coverage', () => {
  it('should provide allNodeIds/allEdgeIds parameters', () => {
    const scenario = createRemoveFindingScenario('f1');
    const paths = [makePath({ findingIds: ['f1'] })];
    const evaluation = evaluateScenario(scenario, paths, []);
    const delta = computeGraphDelta(scenario.id, paths, evaluation, ['n1', 'n2', 'n3'], ['e1', 'e2']);

    expect(delta.totalNodesBefore).toBe(3);
    expect(delta.totalEdgesBefore).toBe(2);
  });

  it('should compute connectivity score with no edges', () => {
    const scenario = createRemoveFindingScenario('f1');
    const paths = [makePath()];
    const evaluation = evaluateScenario(scenario, paths, []);
    const delta = computeGraphDelta(scenario.id, paths, evaluation, ['n1'], []);
    expect(computeConnectivityScore(delta)).toBeGreaterThanOrEqual(0);
  });
});

// ─── Engine Deep Coverage ────────────────────────────────────

describe('Impact Analysis — Engine Deep Coverage', () => {
  it('should analyze with correlation groups', () => {
    const engine = new ImpactAnalysisEngine({ enableCaching: false });
    const paths = [makePath({ findingIds: ['f1'] })];
    const assessments = [makeRA('f1', 0.8)];
    const groups = [createCorrelationGroup({
      findingIds: ['f1' as any], dominantCategory: 'Vulnerability' as any,
      dominantSeverity: 'High' as any, correlationScore: 0.8, reasons: ['SameHost' as any],
    })];

    const scenario = createRemoveCorrelationScenario(groups[0].id);
    const analysis = engine.analyze({ scenario, attackPaths: paths, riskAssessments: assessments, correlationGroups: groups });
    expect(analysis).toBeDefined();
  });

  it('should emit recommendation ranked event', () => {
    const engine = new ImpactAnalysisEngine({ enableCaching: false });
    const events: any[] = [];
    engine.eventBus.subscribe(e => events.push(e));

    const paths = [makePath()];
    const scenarios = [
      createRemoveFindingScenario('f1'),
      createPatchVulnerabilityScenario('v1'),
    ];
    const analyses = scenarios.map(s => engine.analyze({ scenario: s, attackPaths: paths, riskAssessments: [makeRA('f1', 0.5)] }));
    engine.rank(analyses, RemediationRankingStrategy.MaximumRiskReduction);

    expect(events.some(e => e.type === 'RecommendationRanked')).toBe(true);
  });

  it('should access config', () => {
    const engine = new ImpactAnalysisEngine({ engineId: 'test-engine' });
    expect(engine.config.engineId).toBe('test-engine');
  });

  it('should access cacheStatistics', () => {
    const engine = new ImpactAnalysisEngine({ enableCaching: true });
    const stats = engine.cacheStatistics;
    expect(stats).toBeDefined();
    expect(typeof stats.totalSize).toBe('number');
  });

  it('should handle simulate with correlation groups', () => {
    const engine = new ImpactAnalysisEngine({ enableCaching: false });
    const scenario = createRemoveFindingScenario('f1');
    const groups = [createCorrelationGroup({
      findingIds: ['f1' as any], dominantCategory: 'Vulnerability' as any,
      dominantSeverity: 'High' as any, correlationScore: 0.8, reasons: ['SameHost' as any],
    })];
    const analysis = engine.simulate(scenario, [makePath({ findingIds: ['f1'] })], [makeRA('f1', 0.8)], groups);
    expect(analysis).toBeDefined();
  });
});
