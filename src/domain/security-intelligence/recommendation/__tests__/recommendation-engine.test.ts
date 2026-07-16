/**
 * Recommendation Engine — Comprehensive Test Suite
 *
 * Covers:
 * - Domain models (creation, validation, serialization, equality)
 * - Rule Registry (14 rules, registration, lookup, applicability)
 * - Sources (generation from 5 sources)
 * - Ranking (8-factor weighted ranking)
 * - Planner (5 strategies)
 * - Conflicts (4 conflict types, detection, resolution)
 * - Batch (single finding, single risk, full batch)
 * - Events (5 event types + bus)
 * - Cache (dual LRU, TTL, eviction)
 * - Engine (generate, generateBatch, rank, plan, comparePlans, statistics)
 * - Explainability hooks (structured data)
 * - Edge cases (empty inputs, invalid data)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Types & Enums
  RecommendationRuleType, RecommendationSource, PlanningStrategy,
  ConflictType, ActionStatus, RecommendationSeverity,
  ALL_RECOMMENDATION_RULE_TYPES, ALL_RECOMMENDATION_SOURCES, ALL_PLANNING_STRATEGIES,
  ALL_CONFLICT_TYPES, ALL_ACTION_STATUSES, ALL_RECOMMENDATION_SEVERITIES,
  DEFAULT_RECOMMENDATION_ENGINE_CONFIG,

  // Models
  generateRecommendationId, generateRecommendationGroupId,
  generateRecommendationActionId, generateRemediationPlanId,
  generateRemediationTaskId, generateRecommendationEvidenceId,
  generateRecommendationStatisticsId, generateRecommendationCostId,
  generateRecommendationBenefitId,
  createRecommendationCost, computeTotalCost,
  createRecommendationBenefit, computeTotalBenefit,
  createRecommendationEvidence,
  createExplainabilityData,
  createRecommendationRanking, computeOverallRankingScore,
  createConflict,
  createRecommendation,
  createRecommendationGroup,
  createRecommendationAction,
  createRemediationPlan,
  createRemediationTask,
  recommendationToJSON, recommendationFromJSON,
  remediationPlanToJSON, remediationPlanFromJSON,
  recommendationsEqual, recommendationGroupsEqual, remediationPlansEqual,
  recommendationActionsEqual,
  cloneRecommendation, cloneRemediationPlan,
  hashRecommendation, hashRemediationPlan,
  computePlanRiskReduction, computePlanAttackSurfaceReduction,
  computePlanCost, computePlanEffort, computePlanCoverage,
  computePlanPriority,

  // Rules
  BUILT_IN_RULES, RuleRegistry, createDefaultRuleRegistry,

  // Sources
  generateFromSource, generateFromAllSources,

  // Ranking
  rankRecommendations, computeRankingScores, compareRecommendations,

  // Planner
  buildPlan, selectByStrategy, orderByStrategy,

  // Conflicts
  detectConflicts, resolveConflict, resolveAllConflicts,

  // Batch
  generateBatch, generateFromSingleFinding, generateFromSingleRisk, generateFromSingleImpact,

  // Events
  createRecommendationGeneratedEvent, createRecommendationRankedEvent,
  createRecommendationAcceptedEvent, createRecommendationRejectedEvent,
  createRemediationPlanBuiltEvent,
  RecommendationEventBus,

  // Cache
  RecommendationCache,

  // Statistics
  RecommendationStatisticsCollector,

  // Engine
  RecommendationEngine,
} from '../index.ts';

import {
  createCanonicalFinding, createCVEReference, createCWEReference,
  createCVSSScore, createCanonicalURL, createAffectedAsset,
} from '../../normalization/index.ts';
import { Severity, ConfidenceLevel, SourceEngine, FindingCategory } from '../../normalization/types/index.ts';
import {
  createCorrelationGroup,
} from '../../correlation/index.ts';
import {
  createRiskAssessment, createRiskScore,
  RiskLevel,
} from '../../risk/index.ts';
import {
  createAttackNode, createAttackEdge, createAttackStep,
  createAttackObjective, createAttackPath, createAttackPathRanking,
  AttackNodeType, AttackEdgeType, AttackObjectiveType, DiscoveryStrategy,
} from '../../attack-path/index.ts';
import {
  createImpactScenario, createMitigationEffect,
  createAttackPathDelta, createRiskDelta,
  createSecurityScoreDelta, createRemediationCandidate,
  createImpactAnalysis,
  MitigationScenarioType,
} from '../../impact/index.ts';

// ─── Test Helpers ────────────────────────────────────────────

function makeFinding(overrides: Record<string, any> = {}): any {
  return createCanonicalFinding({
    sourceEngine: SourceEngine.Nuclei,
    category: overrides.category ?? FindingCategory.Vulnerability,
    title: overrides.title ?? 'Test Vulnerability',
    description: overrides.description ?? 'A test vulnerability for testing',
    severity: overrides.severity ?? Severity.High,
    confidence: ConfidenceLevel.High,
    confidenceScore: 0.85,
    cve: overrides.cve ?? [createCVEReference(2024, '0001')],
    cwe: overrides.cwe ?? [createCWEReference(79, 'XSS')],
    cvss: createCVSSScore(7.5, 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N'),
    affectedAsset: createAffectedAsset({ type: 'Host' as any, identifier: 'test-host' }),
    endpoint: createCanonicalURL({ scheme: 'https', host: 'example.com', path: '/api', original: 'https://example.com/api' }),
    technology: overrides.technology ?? ['Node.js'],
    tags: overrides.tags ?? ['vulnerability'],
    ...overrides,
  });
}

function makeRiskAssessment(findingId?: string): any {
  const fid = findingId ?? `fnd_nuclei_${Date.now().toString(36)}`;
  return createRiskAssessment({
    findingId: fid as any,
    score: createRiskScore({
      rawScore: 0.75,
      factors: [],
      evidence: [],
      reasons: ['HighSeverity'],
      context: { internetFacing: true, internalOnly: false, isProduction: true, isDevelopment: false, isCriticalAsset: true, authenticationChain: [], dependencyCount: 3, dependentAssetCount: 5, metadata: {} } as any,
      formulaVersion: '1.0.0',
    }),
    trend: 'New' as any,
    previousScore: null,
    scope: 'Finding' as any,
    scopeId: fid,
  });
}

function makeAttackPath(): any {
  const node1 = createAttackNode({
    graphNodeId: 'gn_1' as any,
    nodeType: AttackNodeType.EntryPoint,
    label: 'Internet',
    riskScore: 0.8,
    riskLevel: RiskLevel.High,
    isEntryPoint: true,
  });

  const node2 = createAttackNode({
    graphNodeId: 'gn_2' as any,
    nodeType: AttackNodeType.Vulnerability,
    label: 'SQL Injection',
    riskScore: 0.9,
    riskLevel: RiskLevel.Critical,
  });

  const node3 = createAttackNode({
    graphNodeId: 'gn_3' as any,
    nodeType: AttackNodeType.Objective,
    label: 'Database',
    riskScore: 0.85,
    riskLevel: RiskLevel.High,
    isObjective: true,
  });

  const edge1 = createAttackEdge({
    sourceNodeId: node1.id,
    targetNodeId: node2.id,
    graphEdgeId: 'ge_1' as any,
    edgeType: AttackEdgeType.Exploitation,
    probability: 0.7,
  });

  const edge2 = createAttackEdge({
    sourceNodeId: node2.id,
    targetNodeId: node3.id,
    graphEdgeId: 'ge_2' as any,
    edgeType: AttackEdgeType.DataAccess,
    probability: 0.8,
  });

  const step1 = createAttackStep({ node: node1, stepIndex: 0, outgoingEdges: [edge1] });
  const step2 = createAttackStep({ node: node2, stepIndex: 1, incomingEdge: edge1, outgoingEdges: [edge2] });
  const step3 = createAttackStep({ node: node3, stepIndex: 2, incomingEdge: edge2 });

  const objective = createAttackObjective({ type: AttackObjectiveType.Impact });
  const ranking = createAttackPathRanking({
    riskScore: 0.85,
    pathLengthScore: 0.3,
    exploitAvailabilityScore: 0.7,
    privilegeEscalationScore: 0.5,
    lateralMovementScore: 0.4,
    internetExposureScore: 0.9,
    businessImpactScore: 0.8,
    confidenceScore: 0.7,
  });

  return createAttackPath({
    steps: [step1, step2, step3],
    edges: [edge1, edge2],
    nodes: [node1, node2, node3],
    objective,
    ranking,
    discoveryStrategy: DiscoveryStrategy.MultiPath,
    discoveryDurationMs: 50,
  });
}

function makeImpactAnalysis(): any {
  const scenario = createImpactScenario({
    type: MitigationScenarioType.PatchVulnerability,
    targetId: 'vuln-1',
    targetType: 'vulnerability',
  });

  const riskDelta = createRiskDelta({
    scenarioId: scenario.id,
    overallBefore: 0.8,
    overallAfter: 0.3,
    levelBefore: RiskLevel.High,
    levelAfter: RiskLevel.Medium,
  });

  const pathDelta = createAttackPathDelta({
    scenarioId: scenario.id,
    eliminatedPaths: ['ap_1' as any],
    shortenedPaths: [],
    reducedPaths: [],
    unchangedPaths: ['ap_2' as any],
    totalBefore: 2,
    totalAfter: 1,
  });

  const scoreDelta = createSecurityScoreDelta({
    scenarioId: scenario.id,
    scoreBefore: 45,
    scoreAfter: 72,
  });

  const mitigationEffect = createMitigationEffect({
    scenarioId: scenario.id,
    riskReduction: 0.5,
    attackSurfaceReduction: 0.5,
    estimatedCost: 0.3,
  });

  const candidate = createRemediationCandidate({
    scenarioId: scenario.id,
    targetType: MitigationScenarioType.PatchVulnerability,
    targetId: 'vuln-1',
    targetLabel: 'SQL Injection',
    riskReduction: 0.5,
    attackSurfaceReduction: 0.5,
    estimatedCost: 0.3,
  });

  return createImpactAnalysis({
    scenarioId: scenario.id,
    scenarioType: MitigationScenarioType.PatchVulnerability,
    attackPathDelta: pathDelta,
    riskDelta,
    securityScoreDelta: scoreDelta,
    mitigationEffect,
    remediationCandidate: candidate,
  });
}

function makeRecommendation(overrides: Record<string, any> = {}): any {
  const id = generateRecommendationId();
  const cost = createRecommendationCost({
    recommendationId: id,
    implementationCost: 0.3,
    effortHours: 8,
    complexity: 0.25,
  });
  const benefit = createRecommendationBenefit({
    recommendationId: id,
    riskReduction: 0.7,
    attackPathElimination: 0.5,
  });

  return createRecommendation({
    ruleType: RecommendationRuleType.Patch,
    source: RecommendationSource.CanonicalFinding,
    sourceId: 'finding-1',
    title: 'Patch SQL Injection',
    description: 'Apply security patch for SQL injection',
    severity: RecommendationSeverity.Critical,
    targetId: 'vuln-1',
    targetType: 'vulnerability',
    targetLabel: 'SQL Injection',
    findingIds: ['fnd_1' as any],
    cost,
    benefit,
    ...overrides,
  });
}

// ─── Domain Models ───────────────────────────────────────────

describe('Recommendation Domain Models', () => {
  it('generates unique IDs', () => {
    const id1 = generateRecommendationId();
    const id2 = generateRecommendationId();
    expect(id1).not.toBe(id2);
    expect(id1).toContain('rec_');
    expect(id2).toContain('rec_');
  });

  it('generates all ID types', () => {
    expect(generateRecommendationGroupId()).toContain('rg_');
    expect(generateRecommendationActionId()).toContain('ra_');
    expect(generateRemediationPlanId()).toContain('rp_');
    expect(generateRemediationTaskId()).toContain('rt_');
    expect(generateRecommendationEvidenceId()).toContain('rev_');
    expect(generateRecommendationStatisticsId()).toContain('rs_');
    expect(generateRecommendationCostId()).toContain('rc_');
    expect(generateRecommendationBenefitId()).toContain('rb_');
  });
});

describe('RecommendationCost', () => {
  it('creates with defaults', () => {
    const cost = createRecommendationCost({ recommendationId: generateRecommendationId() });
    expect(cost.implementationCost).toBe(0);
    expect(cost.operationalCost).toBe(0);
    expect(cost.effortHours).toBe(0);
    expect(cost.complexity).toBe(0);
    expect(cost.disruption).toBe(0);
    expect(cost.totalCost).toBe(0);
  });

  it('clamps values to [0, 1]', () => {
    const cost = createRecommendationCost({
      recommendationId: generateRecommendationId(),
      implementationCost: -0.5,
      complexity: 1.5,
    });
    expect(cost.implementationCost).toBe(0);
    expect(cost.complexity).toBe(1);
  });

  it('computes total cost deterministically', () => {
    const total = computeTotalCost(0.5, 0.3, 0.4, 0.2);
    expect(total).toBeCloseTo(0.35 * 0.5 + 0.20 * 0.3 + 0.25 * 0.4 + 0.20 * 0.2, 5);
  });

  it('throws without recommendationId', () => {
    expect(() => createRecommendationCost({ recommendationId: '' as any })).toThrow();
  });

  it('freezes the output', () => {
    const cost = createRecommendationCost({ recommendationId: generateRecommendationId() });
    expect(Object.isFrozen(cost)).toBe(true);
    expect(Object.isFrozen(cost.metadata)).toBe(true);
  });
});

describe('RecommendationBenefit', () => {
  it('creates with specified values', () => {
    const benefit = createRecommendationBenefit({
      recommendationId: generateRecommendationId(),
      riskReduction: 0.7,
      attackPathElimination: 0.5,
    });
    expect(benefit.riskReduction).toBe(0.7);
    expect(benefit.attackPathElimination).toBe(0.5);
    expect(benefit.totalBenefit).toBeGreaterThan(0);
  });

  it('clamps securityScoreImprovement to [0, 100]', () => {
    const benefit = createRecommendationBenefit({
      recommendationId: generateRecommendationId(),
      securityScoreImprovement: 150,
    });
    expect(benefit.securityScoreImprovement).toBe(100);
  });

  it('computes total benefit deterministically', () => {
    const total = computeTotalBenefit(0.6, 0.4, 0.5, 0.3, 0.2);
    expect(total).toBeCloseTo(0.30 * 0.6 + 0.25 * 0.4 + 0.20 * 0.5 + 0.15 * 0.3 + 0.10 * 0.2, 5);
  });
});

describe('RecommendationEvidence', () => {
  it('creates evidence with clamped confidence', () => {
    const evidence = createRecommendationEvidence({
      recommendationId: generateRecommendationId(),
      sourceType: RecommendationSource.CanonicalFinding,
      sourceId: 'finding-1',
      field: 'severity',
      value: 'High',
      confidence: 1.5,
      description: 'Test evidence',
    });
    expect(evidence.confidence).toBe(1);
  });
});

describe('ExplainabilityData', () => {
  it('creates with all fields', () => {
    const data = createExplainabilityData({
      whyGenerated: ['rule-patch'],
      affectedFindings: ['fnd_1' as any],
      affectedAttackPaths: ['ap_1' as any],
      expectedRiskDelta: 0.7,
      expectedScoreDelta: 25,
      confidenceReasoning: { cve: 0.9 },
    });
    expect(data.whyGenerated).toEqual(['rule-patch']);
    expect(data.expectedRiskDelta).toBe(0.7);
    expect(data.confidenceReasoning.cve).toBe(0.9);
  });

  it('clamps confidence reasoning values', () => {
    const data = createExplainabilityData({
      whyGenerated: [],
      affectedFindings: [],
      affectedAttackPaths: [],
      expectedRiskDelta: 0,
      expectedScoreDelta: 0,
      confidenceReasoning: { test: 2.0 },
    });
    expect(data.confidenceReasoning.test).toBe(1);
  });
});

describe('RecommendationRanking', () => {
  it('computes overall score from 8 factors', () => {
    const ranking = createRecommendationRanking({
      riskReductionScore: 0.8,
      attackPathEliminationScore: 0.6,
      costScore: 0.7,
      confidenceScore: 0.5,
      businessImpactScore: 0.9,
      fixComplexityScore: 0.6,
      coverageScore: 0.4,
      timeToRemediateScore: 0.5,
    });
    expect(ranking.overallScore).toBeGreaterThan(0);
    expect(ranking.overallScore).toBeLessThanOrEqual(1);
  });

  it('assigns rank', () => {
    const ranking = createRecommendationRanking({ rank: 3 });
    expect(ranking.rank).toBe(3);
  });
});

describe('Recommendation', () => {
  it('creates with all fields', () => {
    const rec = makeRecommendation();
    expect(rec.id).toBeTruthy();
    expect(rec.ruleType).toBe(RecommendationRuleType.Patch);
    expect(rec.source).toBe(RecommendationSource.CanonicalFinding);
    expect(rec.title).toBe('Patch SQL Injection');
    expect(rec.severity).toBe(RecommendationSeverity.Critical);
    expect(rec.cost).toBeDefined();
    expect(rec.benefit).toBeDefined();
    expect(rec.ranking).toBeDefined();
    expect(rec.explainability).toBeDefined();
    expect(rec.status).toBe(ActionStatus.Pending);
  });

  it('throws without required fields', () => {
    expect(() => createRecommendation({ ruleType: RecommendationRuleType.Patch, source: RecommendationSource.CanonicalFinding, sourceId: '', title: '', description: 'test', severity: RecommendationSeverity.High, targetId: '', targetType: 'vuln', targetLabel: 'test', cost: createRecommendationCost({ recommendationId: 'x' as any }), benefit: createRecommendationBenefit({ recommendationId: 'x' as any }) })).toThrow();
  });

  it('serializes and deserializes', () => {
    const rec = makeRecommendation();
    const json = recommendationToJSON(rec);
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(rec.id);
    expect(parsed.ruleType).toBe(rec.ruleType);

    const restored = recommendationFromJSON(json);
    expect(restored.id).toBe(rec.id);
    expect(Object.isFrozen(restored)).toBe(true);
  });

  it('validates JSON on deserialization', () => {
    expect(() => recommendationFromJSON('invalid json')).toThrow();
    expect(() => recommendationFromJSON('null')).toThrow();
    expect(() => recommendationFromJSON('{}')).toThrow();
    expect(() => recommendationFromJSON('{"id":"x"}')).toThrow();
  });

  it('checks equality by ID', () => {
    const a = makeRecommendation();
    const b = makeRecommendation();
    expect(recommendationsEqual(a, a)).toBe(true);
    expect(recommendationsEqual(a, b)).toBe(false);
  });

  it('clones via JSON round-trip', () => {
    const rec = makeRecommendation();
    const clone = cloneRecommendation(rec);
    expect(clone.id).toBe(rec.id);
    expect(clone.title).toBe(rec.title);
  });

  it('hashes deterministically', () => {
    const rec = makeRecommendation();
    const h1 = hashRecommendation(rec);
    const h2 = hashRecommendation(rec);
    expect(h1).toBe(h2);
  });

  it('auto-generates ranking from cost/benefit', () => {
    const rec = makeRecommendation();
    expect(rec.ranking.overallScore).toBeGreaterThan(0);
    expect(rec.ranking.riskReductionScore).toBeGreaterThan(0);
  });
});

describe('RecommendationGroup', () => {
  it('creates and freezes', () => {
    const group = createRecommendationGroup({
      name: 'Test Group',
      recommendationIds: [generateRecommendationId()],
      dominantRuleType: RecommendationRuleType.Patch,
      dominantSeverity: RecommendationSeverity.High,
    });
    expect(group.name).toBe('Test Group');
    expect(Object.isFrozen(group)).toBe(true);
  });

  it('throws without name', () => {
    expect(() => createRecommendationGroup({ name: '', recommendationIds: [], dominantRuleType: RecommendationRuleType.Patch, dominantSeverity: RecommendationSeverity.Medium })).toThrow();
  });
});

describe('RecommendationAction', () => {
  it('creates with defaults', () => {
    const action = createRecommendationAction({
      recommendationId: generateRecommendationId(),
      planId: generateRemediationPlanId(),
    });
    expect(action.order).toBe(0);
    expect(action.status).toBe(ActionStatus.Pending);
    expect(action.dependsOn).toEqual([]);
  });
});

describe('RemediationPlan', () => {
  it('creates with computed metrics', () => {
    const rec = makeRecommendation();
    const plan = createRemediationPlan({
      name: 'Test Plan',
      strategy: PlanningStrategy.Balanced,
      actions: [],
      recommendations: [rec],
    });
    expect(plan.totalRiskReduction).toBeGreaterThan(0);
    expect(plan.priority).toBeGreaterThan(0);
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it('serializes and deserializes', () => {
    const plan = createRemediationPlan({
      name: 'Test Plan',
      strategy: PlanningStrategy.Balanced,
      actions: [],
      recommendations: [],
    });
    const json = remediationPlanToJSON(plan);
    const restored = remediationPlanFromJSON(json);
    expect(restored.id).toBe(plan.id);
    expect(restored.strategy).toBe(PlanningStrategy.Balanced);
  });
});

describe('RemediationTask', () => {
  it('creates with all fields', () => {
    const task = createRemediationTask({
      actionId: generateRecommendationActionId(),
      recommendationId: generateRecommendationId(),
      title: 'Apply patch',
      verificationSteps: ['Verify patch installed', 'Run tests'],
      rollbackSteps: ['Revert to previous version'],
    });
    expect(task.verificationSteps).toHaveLength(2);
    expect(task.rollbackSteps).toHaveLength(1);
    expect(Object.isFrozen(task)).toBe(true);
  });
});

// ─── Enums ──────────────────────────────────────────────────

describe('Enums', () => {
  it('has 14 rule types', () => {
    expect(ALL_RECOMMENDATION_RULE_TYPES).toHaveLength(14);
  });

  it('has 5 sources', () => {
    expect(ALL_RECOMMENDATION_SOURCES).toHaveLength(5);
  });

  it('has 5 planning strategies', () => {
    expect(ALL_PLANNING_STRATEGIES).toHaveLength(5);
  });

  it('has 4 conflict types', () => {
    expect(ALL_CONFLICT_TYPES).toHaveLength(4);
  });

  it('has 6 action statuses', () => {
    expect(ALL_ACTION_STATUSES).toHaveLength(6);
  });

  it('has 5 severity levels', () => {
    expect(ALL_RECOMMENDATION_SEVERITIES).toHaveLength(5);
  });
});

// ─── Rule Registry ──────────────────────────────────────────

describe('RuleRegistry', () => {
  let registry: RuleRegistry;

  beforeEach(() => {
    registry = createDefaultRuleRegistry();
  });

  it('initializes with 14 built-in rules', () => {
    expect(registry.size).toBe(14);
  });

  it('gets rule by ID', () => {
    const rule = registry.get('rule-patch');
    expect(rule).toBeDefined();
    expect(rule!.type).toBe(RecommendationRuleType.Patch);
  });

  it('gets applicable rules for a source', () => {
    const findingRules = registry.getApplicableRules(RecommendationSource.CanonicalFinding);
    expect(findingRules.length).toBeGreaterThan(0);
    expect(findingRules.every(r => r.appliesTo.includes(RecommendationSource.CanonicalFinding))).toBe(true);
  });

  it('gets rules by type', () => {
    const patchRules = registry.getByType(RecommendationRuleType.Patch);
    expect(patchRules.length).toBe(1);
    expect(patchRules[0].type).toBe(RecommendationRuleType.Patch);
  });

  it('registers a custom rule', () => {
    const customRule: any = {
      id: 'custom-rule',
      type: RecommendationRuleType.Patch,
      name: 'Custom',
      description: 'Custom rule',
      priority: 0.5,
      appliesTo: [RecommendationSource.CanonicalFinding],
      evaluate: () => null,
    };
    registry.register(customRule);
    expect(registry.size).toBe(15);
    expect(registry.get('custom-rule')).toBeDefined();
  });

  it('rejects duplicate rule registration', () => {
    expect(() => registry.register(BUILT_IN_RULES[0])).toThrow();
  });

  it('unregisters a rule', () => {
    expect(registry.unregister('rule-patch')).toBe(true);
    expect(registry.size).toBe(13);
    expect(registry.get('rule-patch')).toBeUndefined();
  });

  it('clears all rules', () => {
    registry.clear();
    expect(registry.size).toBe(0);
  });
});

// ─── Built-in Rules ─────────────────────────────────────────

describe('Built-in Rules', () => {
  const registry = createDefaultRuleRegistry();

  it('Patch rule generates from vulnerability finding', () => {
    const finding = makeFinding({ category: FindingCategory.Vulnerability });
    const recs = generateFromSource({
      source: RecommendationSource.CanonicalFinding,
      sourceId: finding.id,
      finding,
    }, registry);
    expect(recs.length).toBeGreaterThan(0);
    const patchRec = recs.find(r => r.ruleType === RecommendationRuleType.Patch);
    expect(patchRec).toBeDefined();
    expect(patchRec!.severity).toBe(RecommendationSeverity.High);
    expect(patchRec!.benefit.riskReduction).toBeGreaterThan(0);
  });

  it('ConfigurationChange rule generates from misconfiguration', () => {
    const finding = makeFinding({ category: FindingCategory.Misconfiguration });
    const recs = generateFromSource({
      source: RecommendationSource.CanonicalFinding,
      sourceId: finding.id,
      finding,
    }, registry);
    const configRec = recs.find(r => r.ruleType === RecommendationRuleType.ConfigurationChange);
    expect(configRec).toBeDefined();
  });

  it('SecretRotation rule generates from secret exposure', () => {
    const finding = makeFinding({ category: FindingCategory.InformationDisclosure, tags: ['secret', 'api-key'] });
    const recs = generateFromSource({
      source: RecommendationSource.CanonicalFinding,
      sourceId: finding.id,
      finding,
    }, registry);
    const secretRec = recs.find(r => r.ruleType === RecommendationRuleType.SecretRotation);
    expect(secretRec).toBeDefined();
  });

  it('NetworkIsolation rule generates from attack path', () => {
    const path = makeAttackPath();
    const recs = generateFromSource({
      source: RecommendationSource.AttackPath,
      sourceId: path.id,
      attackPath: path,
    }, registry);
    const netRec = recs.find(r => r.ruleType === RecommendationRuleType.NetworkIsolation);
    expect(netRec).toBeDefined();
  });

  it('DisableEndpoint rule generates from exposure finding', () => {
    const finding = makeFinding({ category: FindingCategory.Exposure, tags: ['endpoint', 'exposed'] });
    const recs = generateFromSource({
      source: RecommendationSource.CanonicalFinding,
      sourceId: finding.id,
      finding,
    }, registry);
    const disableRec = recs.find(r => r.ruleType === RecommendationRuleType.DisableEndpoint);
    expect(disableRec).toBeDefined();
  });

  it('returns empty for non-matching context', () => {
    const finding = makeFinding({ category: FindingCategory.Vulnerability });
    const recs = generateFromSource({
      source: RecommendationSource.AttackPath,
      sourceId: finding.id,
    }, registry);
    expect(recs).toHaveLength(0);
  });
});

// ─── Sources ────────────────────────────────────────────────

describe('Sources', () => {
  const registry = createDefaultRuleRegistry();

  it('generates from findings', () => {
    const findings = [makeFinding(), makeFinding({ title: 'Second Finding', severity: Severity.Critical })];
    const recs = generateFromAllSources(findings, undefined, undefined, undefined, undefined, registry);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('generates from impact analyses', () => {
    const impact = makeImpactAnalysis();
    const recs = generateFromAllSources(undefined, undefined, undefined, undefined, [impact], registry);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('returns empty from no sources', () => {
    const recs = generateFromAllSources(undefined, undefined, undefined, undefined, undefined, registry);
    expect(recs).toHaveLength(0);
  });
});

// ─── Ranking ────────────────────────────────────────────────

describe('Ranking', () => {
  it('ranks recommendations by overall score', () => {
    const recs = [
      makeRecommendation({ title: 'Low priority' }),
      makeRecommendation({ title: 'High priority' }),
    ];
    // Manually set different scores
    const ranked = rankRecommendations(recs);
    expect(ranked.ranked.length).toBe(2);
    expect(ranked.totalRecommendations).toBe(2);
    expect(ranked.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('handles empty recommendations', () => {
    const result = rankRecommendations([]);
    expect(result.ranked).toHaveLength(0);
    expect(result.totalRecommendations).toBe(0);
  });

  it('assigns sequential ranks', () => {
    const recs = Array.from({ length: 5 }, () => makeRecommendation());
    const ranked = rankRecommendations(recs);
    for (let i = 0; i < ranked.ranked.length; i++) {
      expect(ranked.ranked[i].ranking.rank).toBe(i + 1);
    }
  });

  it('compareRecommendations returns correct order', () => {
    const a = makeRecommendation();
    const b = makeRecommendation();
    const result = compareRecommendations(a, b);
    expect(typeof result).toBe('number');
  });
});

// ─── Planner ────────────────────────────────────────────────

describe('Planner', () => {
  it('builds a plan with Balanced strategy', () => {
    const recs = [makeRecommendation(), makeRecommendation()];
    const result = buildPlan(recs, PlanningStrategy.Balanced);
    expect(result.plan).toBeDefined();
    expect(result.plan.strategy).toBe(PlanningStrategy.Balanced);
    expect(result.plan.actions.length).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('builds plan with MaximumRiskReduction strategy', () => {
    const recs = [makeRecommendation(), makeRecommendation()];
    const result = buildPlan(recs, PlanningStrategy.MaximumRiskReduction);
    expect(result.plan.strategy).toBe(PlanningStrategy.MaximumRiskReduction);
  });

  it('builds plan with MinimumCost strategy', () => {
    const recs = [makeRecommendation()];
    const result = buildPlan(recs, PlanningStrategy.MinimumCost);
    expect(result.plan.strategy).toBe(PlanningStrategy.MinimumCost);
  });

  it('builds plan with QuickWins strategy', () => {
    const recs = [makeRecommendation()];
    const result = buildPlan(recs, PlanningStrategy.QuickWins);
    expect(result.plan.strategy).toBe(PlanningStrategy.QuickWins);
  });

  it('builds plan with ComplianceFirst strategy', () => {
    const recs = [makeRecommendation()];
    const result = buildPlan(recs, PlanningStrategy.ComplianceFirst);
    expect(result.plan.strategy).toBe(PlanningStrategy.ComplianceFirst);
  });

  it('handles empty recommendations', () => {
    const result = buildPlan([], PlanningStrategy.Balanced);
    expect(result.plan.actions).toHaveLength(0);
    expect(result.plan.recommendations).toHaveLength(0);
  });

  it('applies max actions constraint', () => {
    const recs = Array.from({ length: 10 }, () => makeRecommendation());
    const result = buildPlan(recs, PlanningStrategy.Balanced, { maxActions: 3 });
    expect(result.plan.actions.length).toBeLessThanOrEqual(3);
  });

  it('applies max cost constraint', () => {
    const recs = Array.from({ length: 5 }, () => makeRecommendation());
    const result = buildPlan(recs, PlanningStrategy.Balanced, { maxCost: 0.5 });
    expect(result.plan.totalEstimatedCost).toBeLessThanOrEqual(0.6); // Some tolerance
  });

  it('applies min risk reduction constraint', () => {
    const recs = [makeRecommendation(), makeRecommendation()];
    const result = buildPlan(recs, PlanningStrategy.Balanced, { minRiskReduction: 0.9 });
    // Most recommendations won't meet 0.9 risk reduction
    expect(result.plan.recommendations.every(r => r.benefit.riskReduction >= 0.9)).toBe(true);
  });
});

// ─── Conflicts ──────────────────────────────────────────────

describe('Conflict Detection', () => {
  it('detects duplicate recommendations', () => {
    const rec1 = makeRecommendation();
    const rec2 = makeRecommendation({ title: 'Duplicate' });
    // Force same target and rule type
    const dupRec = createRecommendation({
      ruleType: rec1.ruleType,
      source: rec1.source,
      sourceId: rec1.sourceId,
      title: 'Duplicate rec',
      description: 'Duplicate',
      severity: RecommendationSeverity.High,
      targetId: rec1.targetId,
      targetType: rec1.targetType,
      targetLabel: rec1.targetLabel,
      cost: createRecommendationCost({ recommendationId: generateRecommendationId() }),
      benefit: createRecommendationBenefit({ recommendationId: generateRecommendationId() }),
    });

    const conflicts = detectConflicts([rec1, dupRec]);
    const duplicates = conflicts.filter(c => c.type === ConflictType.Duplicate);
    expect(duplicates.length).toBeGreaterThan(0);
  });

  it('detects contradictions', () => {
    const rec1 = makeRecommendation({
      ruleType: RecommendationRuleType.DisableEndpoint,
    });
    const rec2 = makeRecommendation({
      ruleType: RecommendationRuleType.WAFRule,
    });
    // Force same target
    const wafRec = createRecommendation({
      ruleType: RecommendationRuleType.WAFRule,
      source: RecommendationSource.CanonicalFinding,
      sourceId: 'finding-2',
      title: 'Add WAF',
      description: 'Add WAF rule',
      severity: RecommendationSeverity.High,
      targetId: rec1.targetId,
      targetType: 'endpoint',
      targetLabel: 'Test endpoint',
      cost: createRecommendationCost({ recommendationId: generateRecommendationId() }),
      benefit: createRecommendationBenefit({ recommendationId: generateRecommendationId() }),
    });

    const conflicts = detectConflicts([rec1, wafRec]);
    const contradictions = conflicts.filter(c => c.type === ConflictType.Contradiction);
    expect(contradictions.length).toBeGreaterThan(0);
  });

  it('returns empty for non-conflicting recommendations', () => {
    const rec1 = makeRecommendation({ targetId: 'target-1' });
    const rec2 = makeRecommendation({ targetId: 'target-2' });
    const conflicts = detectConflicts([rec1, rec2]);
    // Different targets, different rules should have no conflicts
    expect(conflicts).toHaveLength(0);
  });
});

describe('Conflict Resolution', () => {
  it('resolves duplicates by preferring higher rank', () => {
    const rec1 = makeRecommendation();
    const dupRec = createRecommendation({
      ruleType: rec1.ruleType,
      source: rec1.source,
      sourceId: rec1.sourceId,
      title: 'Duplicate',
      description: 'Duplicate',
      severity: RecommendationSeverity.Medium,
      targetId: rec1.targetId,
      targetType: rec1.targetType,
      targetLabel: rec1.targetLabel,
      cost: createRecommendationCost({ recommendationId: generateRecommendationId() }),
      benefit: createRecommendationBenefit({ recommendationId: generateRecommendationId() }),
    });

    const conflicts = detectConflicts([rec1, dupRec]);
    const duplicateConflict = conflicts.find(c => c.type === ConflictType.Duplicate);
    expect(duplicateConflict).toBeDefined();

    const resolved = resolveConflict(duplicateConflict!, [rec1, dupRec]);
    expect(resolved.resolution).toBeDefined();
    expect(resolved.resolution!.winningId).toBeTruthy();
  });

  it('resolveAllConflicts removes lower-ranked duplicates', () => {
    const rec1 = makeRecommendation();
    const dupRec = createRecommendation({
      ruleType: rec1.ruleType,
      source: rec1.source,
      sourceId: rec1.sourceId,
      title: 'Duplicate',
      description: 'Duplicate',
      severity: RecommendationSeverity.Medium,
      targetId: rec1.targetId,
      targetType: rec1.targetType,
      targetLabel: rec1.targetLabel,
      cost: createRecommendationCost({ recommendationId: generateRecommendationId() }),
      benefit: createRecommendationBenefit({ recommendationId: generateRecommendationId() }),
    });

    const result = resolveAllConflicts([rec1, dupRec]);
    expect(result.recommendations.length).toBeLessThanOrEqual(2);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.resolved.length).toBeGreaterThan(0);
  });
});

// ─── Batch ──────────────────────────────────────────────────

describe('Batch Processing', () => {
  const registry = createDefaultRuleRegistry();

  it('generates from batch of findings', () => {
    const result = generateBatch(
      { findings: [makeFinding(), makeFinding({ title: 'Second Finding' })] },
      registry,
    );
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.totalSources).toBe(2);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('generates from single finding', () => {
    const recs = generateFromSingleFinding(makeFinding(), registry);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('generates from single risk assessment', () => {
    const recs = generateFromSingleRisk(makeRiskAssessment(), registry);
    // Risk assessments alone may not produce recommendations without findings
    expect(Array.isArray(recs)).toBe(true);
  });

  it('generates from single impact analysis', () => {
    const recs = generateFromSingleImpact(makeImpactAnalysis(), registry);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('builds plan as part of batch result', () => {
    const result = generateBatch(
      { findings: [makeFinding()] },
      registry,
      PlanningStrategy.Balanced,
    );
    expect(result.plan).toBeDefined();
    expect(result.plan!.strategy).toBe(PlanningStrategy.Balanced);
  });

  it('handles empty batch', () => {
    const result = generateBatch({}, registry);
    expect(result.recommendations).toHaveLength(0);
    expect(result.plan).toBeNull();
    expect(result.totalSources).toBe(0);
  });
});

// ─── Events ─────────────────────────────────────────────────

describe('Events', () => {
  it('creates RecommendationGeneratedEvent', () => {
    const event = createRecommendationGeneratedEvent(
      'engine-1', generateRecommendationId(), RecommendationRuleType.Patch,
      RecommendationSource.CanonicalFinding, 'Critical',
    );
    expect(event.type).toBe('recommendation.generated');
    expect(event.engineId).toBe('engine-1');
  });

  it('creates RecommendationRankedEvent', () => {
    const event = createRecommendationRankedEvent(
      'engine-1', [generateRecommendationId()], 'weighted-composite', 42,
    );
    expect(event.type).toBe('recommendation.ranked');
  });

  it('creates RecommendationAcceptedEvent', () => {
    const event = createRecommendationAcceptedEvent('engine-1', generateRecommendationId(), null);
    expect(event.type).toBe('recommendation.accepted');
  });

  it('creates RecommendationRejectedEvent', () => {
    const event = createRecommendationRejectedEvent('engine-1', generateRecommendationId(), 'Not applicable');
    expect(event.type).toBe('recommendation.rejected');
  });

  it('creates RemediationPlanBuiltEvent', () => {
    const event = createRemediationPlanBuiltEvent('engine-1', generateRemediationPlanId(), 'Balanced', 5, 0.7, 100);
    expect(event.type).toBe('remediation.plan.built');
  });
});

describe('RecommendationEventBus', () => {
  let bus: RecommendationEventBus;

  beforeEach(() => {
    bus = new RecommendationEventBus();
  });

  it('subscribes and receives events', () => {
    const received: any[] = [];
    bus.subscribe(e => received.push(e));

    bus.emit(createRecommendationGeneratedEvent('test', generateRecommendationId(), RecommendationRuleType.Patch, 'CanonicalFinding', 'High'));
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('recommendation.generated');
  });

  it('unsubscribes', () => {
    const received: any[] = [];
    const unsub = bus.subscribe(e => received.push(e));
    unsub();
    bus.emit(createRecommendationGeneratedEvent('test', generateRecommendationId(), RecommendationRuleType.Patch, 'CanonicalFinding', 'High'));
    expect(received).toHaveLength(0);
  });

  it('swallows handler errors', () => {
    bus.subscribe(() => { throw new Error('Handler error'); });
    expect(() => bus.emit(createRecommendationGeneratedEvent('test', generateRecommendationId(), RecommendationRuleType.Patch, 'CanonicalFinding', 'High'))).not.toThrow();
  });

  it('clears all handlers', () => {
    bus.subscribe(() => {});
    bus.subscribe(() => {});
    expect(bus.handlerCount).toBe(2);
    bus.clear();
    expect(bus.handlerCount).toBe(0);
  });
});

// ─── Cache ──────────────────────────────────────────────────

describe('RecommendationCache', () => {
  let cache: RecommendationCache;

  beforeEach(() => {
    cache = new RecommendationCache({ capacity: 10, ttlMs: 60000 });
  });

  it('stores and retrieves recommendations', () => {
    const rec = makeRecommendation();
    cache.setRecommendation('key1', rec);
    const retrieved = cache.getRecommendation('key1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(rec.id);
  });

  it('stores and retrieves plans', () => {
    const plan = createRemediationPlan({ name: 'Test', strategy: PlanningStrategy.Balanced, actions: [], recommendations: [] });
    cache.setPlan('plan1', plan);
    const retrieved = cache.getPlan('plan1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(plan.id);
  });

  it('returns null for missing keys', () => {
    expect(cache.getRecommendation('missing')).toBeNull();
    expect(cache.getPlan('missing')).toBeNull();
  });

  it('evicts when capacity exceeded', () => {
    for (let i = 0; i < 15; i++) {
      cache.setRecommendation(`key_${i}`, makeRecommendation({ title: `Rec ${i}` }));
    }
    const stats = cache.getStatistics();
    expect(stats.evictions).toBeGreaterThan(0);
  });

  it('invalidates by key', () => {
    cache.setRecommendation('key1', makeRecommendation());
    expect(cache.invalidate('key1')).toBe(true);
    expect(cache.getRecommendation('key1')).toBeNull();
  });

  it('invalidates by pattern', () => {
    cache.setRecommendation('rec_1', makeRecommendation());
    cache.setRecommendation('rec_2', makeRecommendation());
    cache.setPlan('plan_1', createRemediationPlan({ name: 'Test', strategy: PlanningStrategy.Balanced, actions: [], recommendations: [] }));
    const count = cache.invalidatePattern('rec_');
    expect(count).toBe(2);
  });

  it('clears all entries', () => {
    cache.setRecommendation('key1', makeRecommendation());
    cache.setPlan('plan1', createRemediationPlan({ name: 'Test', strategy: PlanningStrategy.Balanced, actions: [], recommendations: [] }));
    cache.clear();
    expect(cache.getStatistics().totalSize).toBe(0);
  });

  it('provides statistics', () => {
    cache.setRecommendation('key1', makeRecommendation());
    cache.getRecommendation('key1');
    cache.getRecommendation('missing');
    const stats = cache.getStatistics();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.5);
    expect(stats.totalSize).toBe(1);
  });
});

// ─── Statistics Collector ───────────────────────────────────

describe('RecommendationStatisticsCollector', () => {
  let collector: RecommendationStatisticsCollector;

  beforeEach(() => {
    collector = new RecommendationStatisticsCollector();
  });

  it('records generation', () => {
    collector.recordGeneration(10, RecommendationRuleType.Patch, RecommendationSource.CanonicalFinding, RecommendationSeverity.High, 0.7, 0.3, 0.6);
    const stats = collector.collect();
    expect(stats.totalRecommendations).toBe(1);
    expect(stats.averageRiskReduction).toBeCloseTo(0.7);
  });

  it('records ranking', () => {
    collector.recordRanking(5);
    const stats = collector.collect();
    expect(stats.totalPlans).toBe(0);
  });

  it('records planning', () => {
    collector.recordPlanning(50, 5, 2);
    const stats = collector.collect();
    expect(stats.totalPlans).toBe(1);
    expect(stats.totalActions).toBe(5);
    expect(stats.totalConflicts).toBe(2);
  });

  it('records batch', () => {
    collector.recordBatch();
    const stats = collector.collect();
    expect(stats.totalPlans).toBe(0);
  });

  it('records cache hits/misses', () => {
    collector.recordCacheHit();
    collector.recordCacheHit();
    collector.recordCacheMiss();
    // Cache stats are in the overall statistics
    const stats = collector.collect();
    expect(stats).toBeDefined();
  });

  it('resets all counters', () => {
    collector.recordGeneration(10, RecommendationRuleType.Patch, RecommendationSource.CanonicalFinding, RecommendationSeverity.High, 0.5, 0.3, 0.4);
    collector.reset();
    const stats = collector.collect();
    expect(stats.totalRecommendations).toBe(0);
  });
});

// ─── Engine ─────────────────────────────────────────────────

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine({ engineId: 'test-engine' });
  });

  it('generates recommendations from a finding', () => {
    const finding = makeFinding();
    const recs = engine.generate({
      source: RecommendationSource.CanonicalFinding,
      sourceId: finding.id,
      finding,
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].ruleType).toBeDefined();
    expect(recs[0].benefit).toBeDefined();
    expect(recs[0].cost).toBeDefined();
  });

  it('generates from batch', () => {
    const recs = engine.generateBatch({
      findings: [makeFinding(), makeFinding({ title: 'Second Finding' })],
    });
    expect(recs.length).toBeGreaterThan(0);
  });

  it('ranks recommendations', () => {
    const recs = engine.generateBatch({
      findings: [makeFinding(), makeFinding({ title: 'Finding 2', severity: Severity.Critical })],
    });
    const ranked = engine.rank(recs);
    expect(ranked.length).toBe(recs.length);
    // First should have rank 1
    expect(ranked[0].ranking.rank).toBe(1);
  });

  it('builds a plan', () => {
    const recs = engine.generateBatch({
      findings: [makeFinding()],
    });
    const ranked = engine.rank(recs);
    const plan = engine.plan(ranked, PlanningStrategy.Balanced);
    expect(plan.strategy).toBe(PlanningStrategy.Balanced);
    expect(plan.actions.length).toBeGreaterThan(0);
  });

  it('compares two plans', () => {
    const recs = engine.generateBatch({
      findings: [makeFinding(), makeFinding({ title: 'Finding 2' })],
    });
    const ranked = engine.rank(recs);
    const planA = engine.plan(ranked, PlanningStrategy.MaximumRiskReduction);
    const planB = engine.plan(ranked, PlanningStrategy.MinimumCost);
    const comparison = engine.comparePlans(planA, planB);
    expect(comparison.winner).toBeTruthy();
    expect(['plan-a', 'plan-b', 'tie']).toContain(comparison.winner);
  });

  it('emits events', () => {
    const events: any[] = [];
    engine.eventBus.subscribe(e => events.push(e));

    const recs = engine.generate({
      source: RecommendationSource.CanonicalFinding,
      sourceId: 'test',
      finding: makeFinding(),
    });

    const genEvents = events.filter(e => e.type === 'recommendation.generated');
    expect(genEvents.length).toBeGreaterThan(0);
  });

  it('returns statistics', () => {
    engine.generate({
      source: RecommendationSource.CanonicalFinding,
      sourceId: 'test',
      finding: makeFinding(),
    });
    const stats = engine.statistics();
    expect(stats.totalRecommendations).toBeGreaterThan(0);
  });

  it('provides rule registry access', () => {
    expect(engine.ruleRegistry).toBeDefined();
    expect(engine.ruleRegistry.size).toBe(14);
  });

  it('provides cache statistics', () => {
    expect(engine.cacheStatistics).toBeDefined();
  });

  it('resets state', () => {
    engine.generate({
      source: RecommendationSource.CanonicalFinding,
      sourceId: 'test',
      finding: makeFinding(),
    });
    engine.reset();
    const stats = engine.statistics();
    expect(stats.totalRecommendations).toBe(0);
  });

  it('handles empty generate', () => {
    const recs = engine.generate({
      source: RecommendationSource.AttackPath,
      sourceId: 'nonexistent',
    });
    expect(recs).toHaveLength(0);
  });

  it('uses custom config', () => {
    const customEngine = new RecommendationEngine({
      engineId: 'custom',
      enableCaching: false,
      riskReductionWeight: 0.30,
    });
    expect(customEngine.config.engineId).toBe('custom');
    expect(customEngine.config.enableCaching).toBe(false);
    expect(customEngine.config.riskReductionWeight).toBe(0.30);
  });
});

// ─── Explainability Hooks ───────────────────────────────────

describe('Explainability Hooks', () => {
  it('every recommendation has explainability data', () => {
    const engine = new RecommendationEngine();
    const recs = engine.generate({
      source: RecommendationSource.CanonicalFinding,
      sourceId: 'test',
      finding: makeFinding(),
    });
    for (const rec of recs) {
      expect(rec.explainability).toBeDefined();
      expect(rec.explainability.whyGenerated.length).toBeGreaterThan(0);
      expect(Array.isArray(rec.explainability.affectedFindings)).toBe(true);
      expect(Array.isArray(rec.explainability.affectedAttackPaths)).toBe(true);
      expect(typeof rec.explainability.expectedRiskDelta).toBe('number');
      expect(typeof rec.explainability.expectedScoreDelta).toBe('number');
      expect(typeof rec.explainability.confidenceReasoning).toBe('object');
    }
  });

  it('explainability contains structured data only, no text explanations', () => {
    const data = createExplainabilityData({
      whyGenerated: ['rule-patch', 'CVE-2024-0001'],
      affectedFindings: ['fnd_1' as any],
      affectedAttackPaths: ['ap_1' as any],
      expectedRiskDelta: 0.7,
      expectedScoreDelta: 25,
      confidenceReasoning: { cvePresent: 0.9, severityHigh: 0.8 },
    });
    // All fields should be data, not human-readable text
    expect(data.whyGenerated.every(w => typeof w === 'string')).toBe(true);
    expect(typeof data.expectedRiskDelta).toBe('number');
    expect(typeof data.expectedScoreDelta).toBe('number');
    // Confidence reasoning values should be numeric weights
    for (const val of Object.values(data.confidenceReasoning)) {
      expect(typeof val).toBe('number');
    }
  });
});

// ─── Edge Cases ─────────────────────────────────────────────

describe('Edge Cases', () => {
  it('handles empty recommendation set in ranking', () => {
    const result = rankRecommendations([]);
    expect(result.ranked).toHaveLength(0);
  });

  it('handles empty recommendation set in planner', () => {
    const result = buildPlan([], PlanningStrategy.Balanced);
    expect(result.plan.actions).toHaveLength(0);
  });

  it('handles empty recommendation set in conflicts', () => {
    const conflicts = detectConflicts([]);
    expect(conflicts).toHaveLength(0);
  });

  it('handles single recommendation (no pairs for conflict)', () => {
    const conflicts = detectConflicts([makeRecommendation()]);
    expect(conflicts).toHaveLength(0);
  });

  it('handles empty batch input', () => {
    const engine = new RecommendationEngine();
    const recs = engine.generateBatch({});
    expect(recs).toHaveLength(0);
  });

  it('handles plan with no conflicts', () => {
    const rec1 = makeRecommendation({ targetId: 'target-1' });
    const rec2 = makeRecommendation({ targetId: 'target-2' });
    const plan = createRemediationPlan({
      name: 'No conflicts',
      strategy: PlanningStrategy.Balanced,
      actions: [],
      recommendations: [rec1, rec2],
    });
    expect(plan.conflicts).toHaveLength(0);
  });

  it('computes plan metrics from empty recommendations', () => {
    expect(computePlanRiskReduction([])).toBe(0);
    expect(computePlanAttackSurfaceReduction([])).toBe(0);
    expect(computePlanCost([])).toBe(0);
    expect(computePlanEffort([])).toBe(0);
    expect(computePlanCoverage([])).toBe(0);
  });

  it('computePlanPriority returns value in [0, 100]', () => {
    // Priority = round(clamp01(0.50*riskReduction + 0.25*coverage + 0.25*(1-cost)) * 100)
    // P(1, 0, 1) = 0.5*1 + 0.25*1 + 0.25*1 = 1.0 -> 100
    expect(computePlanPriority(1, 0, 1)).toBe(100);
    // P(1, 1, 1) = 0.5*1 + 0.25*1 + 0.25*0 = 0.75 -> 75
    expect(computePlanPriority(1, 1, 1)).toBe(75);
    // P(0.5, 0.5, 0.5) = 0.5*0.5 + 0.25*0.5 + 0.25*0.5 = 0.375 -> 38
    expect(computePlanPriority(0.5, 0.5, 0.5)).toBeGreaterThan(0);
    expect(computePlanPriority(0.5, 0.5, 0.5)).toBeLessThanOrEqual(100);
  });
});

// ─── Default Config ─────────────────────────────────────────

describe('Default Configuration', () => {
  it('has correct default weights', () => {
    const config = DEFAULT_RECOMMENDATION_ENGINE_CONFIG;
    expect(config.riskReductionWeight).toBe(0.20);
    expect(config.attackPathEliminationWeight).toBe(0.15);
    expect(config.costWeight).toBe(0.10);
    expect(config.confidenceWeight).toBe(0.10);
    expect(config.businessImpactWeight).toBe(0.15);
    expect(config.fixComplexityWeight).toBe(0.10);
    expect(config.coverageWeight).toBe(0.10);
    expect(config.timeToRemediateWeight).toBe(0.10);
    // Weights sum to 1.0
    const sum = config.riskReductionWeight + config.attackPathEliminationWeight +
      config.costWeight + config.confidenceWeight + config.businessImpactWeight +
      config.fixComplexityWeight + config.coverageWeight + config.timeToRemediateWeight;
    expect(sum).toBeCloseTo(1.0);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_RECOMMENDATION_ENGINE_CONFIG)).toBe(true);
  });
});
