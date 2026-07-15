/**
 * Security Intelligence Correlation Engine — Test Suite
 *
 * Comprehensive tests covering:
 * - Types and enums
 * - Models and factory functions
 * - Correlation rules
 * - Duplicate detection
 * - Correlation graph
 * - Cache
 * - KG adapter
 * - Engine (correlate, correlateBatch, incremental, deduplicate, buildCorrelationGraph)
 * - Events
 * - Statistics
 * - Edge cases and malformed input
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  CorrelationFindingInput,
  CorrelationEvidence, CorrelationRuleResult,
} from '../types/index.ts';
import {
  brandCorrelationId, brandCorrelationGroupId, brandCorrelationEdgeId,
  CorrelationReason, DuplicateType,
  ALL_CORRELATION_REASONS, ALL_DUPLICATE_TYPES,
  DEFAULT_CORRELATION_CONFIG,
} from '../types/index.ts';
import {
  generateCorrelationId, generateCorrelationGroupId, generateCorrelationEdgeId,
  createCorrelationEvidence, createCorrelationEdge, createCorrelationGroup,
  createCorrelation, createDuplicateDetection, createCorrelationResult,
  createEmptyResultStatistics, toCorrelationFindingInput,
  correlationToJSON, correlationFromJSON,
  correlationsEqual, correlationGroupsEqual,
  cloneCorrelation, hashCorrelation,
} from '../models/index.ts';
import { RuleRegistry, BUILT_IN_RULES } from '../rules/index.ts';
import { DuplicateDetector } from '../deduplication/index.ts';
import { CorrelationGraph } from '../graph/index.ts';
import { CorrelationCache } from '../cache/index.ts';
import { CorrelationKGAdapter } from '../kg-adapter/index.ts';
import { CorrelationStatisticsCollector } from '../statistics/index.ts';
import {
  CorrelationEventBus,
  createCorrelationStartedEvent,
  createCorrelationCompletedEvent,
  createCorrelationFailedEvent,
  createDuplicateDetectedEvent,
  createCorrelationGraphBuiltEvent,
} from '../events/index.ts';
import { CorrelationEngine } from '../engine/index.ts';
import {
  createCanonicalFinding,
  createCVEReference,
  createCWEReference,
  createCanonicalURL,
  createAffectedAsset,
  createNormalizedEvidence,
} from '../../normalization/models/index.ts';
import {
  Severity, SourceEngine, FindingCategory, ConfidenceLevel,
  EvidenceType, AssetType,
  brandFindingId,
} from '../../normalization/types/index.ts';

// ─── Test Helpers ────────────────────────────────────────────

function makeCanonicalFinding(overrides: Record<string, any> = {}) {
  return createCanonicalFinding({
    id: brandFindingId(overrides.id ?? 'fnd_test_1'),
    sourceEngine: overrides.sourceEngine ?? SourceEngine.Nuclei,
    category: overrides.category ?? FindingCategory.Vulnerability,
    title: overrides.title ?? 'SQL Injection',
    description: overrides.description ?? 'A SQL injection vulnerability was found',
    severity: overrides.severity ?? Severity.High,
    confidence: overrides.confidence ?? ConfidenceLevel.High,
    confidenceScore: overrides.confidenceScore ?? 0.85,
    cve: overrides.cve ?? [createCVEReference(2024, '1234')],
    cwe: overrides.cwe ?? [createCWEReference(89, 'SQL Injection')],
    cvss: overrides.cvss ?? null,
    affectedAsset: overrides.affectedAsset ?? createAffectedAsset({
      type: AssetType.Host,
      identifier: 'example.com',
    }),
    endpoint: overrides.endpoint ?? createCanonicalURL({
      scheme: 'https',
      host: 'example.com',
      path: '/api/users',
      original: 'https://example.com/api/users',
    }),
    evidence: overrides.evidence ?? [],
    technology: overrides.technology ?? ['nginx'],
    tags: overrides.tags ?? [],
    references: overrides.references ?? [],
    metadata: overrides.metadata ?? {},
    discoveredAt: overrides.discoveredAt ?? '2024-01-01T00:00:00Z',
  });
}

function makeCorrelationInput(overrides: Record<string, any> = {}): CorrelationFindingInput {
  return Object.freeze({
    id: brandFindingId(overrides.id ?? 'fnd_test_1'),
    sourceEngine: overrides.sourceEngine ?? SourceEngine.Nuclei,
    category: overrides.category ?? FindingCategory.Vulnerability,
    severity: overrides.severity ?? Severity.High,
    title: overrides.title ?? 'SQL Injection',
    description: overrides.description ?? 'A SQL injection vulnerability',
    cve: overrides.cve ?? ['CVE-2024-1234'],
    cwe: overrides.cwe ?? ['CWE-89'],
    affectedAsset: overrides.affectedAsset ?? 'example.com',
    endpoint: overrides.endpoint ?? 'https://example.com/api/users',
    technology: overrides.technology ?? ['nginx'],
    evidence: overrides.evidence ?? [],
    tags: overrides.tags ?? [],
    metadata: overrides.metadata ?? {},
  });
}

// ─── Types and Enums ─────────────────────────────────────────

describe('Correlation Types and Enums', () => {
  it('should have all CorrelationReason values', () => {
    expect(ALL_CORRELATION_REASONS.length).toBe(18);
    expect(CorrelationReason.SameHost).toBe('SameHost');
    expect(CorrelationReason.SameCVE).toBe('SameCVE');
    expect(CorrelationReason.SameCWE).toBe('SameCWE');
    expect(CorrelationReason.SharedEvidence).toBe('SharedEvidence');
    expect(CorrelationReason.SharedComponent).toBe('SharedComponent');
  });

  it('should have all DuplicateType values', () => {
    expect(ALL_DUPLICATE_TYPES.length).toBe(4);
    expect(DuplicateType.ExactDuplicate).toBe('ExactDuplicate');
    expect(DuplicateType.SemanticDuplicate).toBe('SemanticDuplicate');
    expect(DuplicateType.SimilarFinding).toBe('SimilarFinding');
    expect(DuplicateType.RelatedFinding).toBe('RelatedFinding');
  });

  it('should brand IDs correctly', () => {
    const corrId = brandCorrelationId('cor_1');
    const groupId = brandCorrelationGroupId('cgrp_1');
    const edgeId = brandCorrelationEdgeId('cedge_1');
    expect(typeof corrId).toBe('string');
    expect(typeof groupId).toBe('string');
    expect(typeof edgeId).toBe('string');
  });

  it('should have default config with correct values', () => {
    expect(DEFAULT_CORRELATION_CONFIG.minCorrelationScore).toBe(0.3);
    expect(DEFAULT_CORRELATION_CONFIG.duplicateThreshold).toBe(0.7);
    expect(DEFAULT_CORRELATION_CONFIG.exactDuplicateThreshold).toBe(0.95);
    expect(DEFAULT_CORRELATION_CONFIG.enableCaching).toBe(true);
    expect(DEFAULT_CORRELATION_CONFIG.cacheSize).toBe(10_000);
  });
});

// ─── Models ──────────────────────────────────────────────────

describe('Correlation Models', () => {
  it('should create CorrelationEvidence', () => {
    const evidence = createCorrelationEvidence({
      reason: CorrelationReason.SameHost,
      sharedValue: 'example.com',
      sourceField: 'affectedAsset',
      targetField: 'affectedAsset',
      confidence: 1.0,
    });
    expect(evidence.reason).toBe(CorrelationReason.SameHost);
    expect(evidence.sharedValue).toBe('example.com');
    expect(evidence.confidence).toBe(1.0);
  });

  it('should clamp confidence to 0-1 range', () => {
    const evidence = createCorrelationEvidence({
      reason: CorrelationReason.SameHost,
      sharedValue: 'test',
      sourceField: 'a',
      targetField: 'b',
      confidence: 1.5,
    });
    expect(evidence.confidence).toBe(1.0);
  });

  it('should create CorrelationEdge', () => {
    const edge = createCorrelationEdge({
      sourceFindingId: brandFindingId('fnd_1'),
      targetFindingId: brandFindingId('fnd_2'),
      reasons: [CorrelationReason.SameHost],
      score: 0.8,
      evidence: [],
    });
    expect(edge.sourceFindingId).toBe('fnd_1');
    expect(edge.targetFindingId).toBe('fnd_2');
    expect(edge.score).toBe(0.8);
    expect(edge.reasons).toEqual([CorrelationReason.SameHost]);
    expect(edge.id).toBeTruthy();
    expect(edge.createdAt).toBeTruthy();
  });

  it('should create CorrelationGroup', () => {
    const group = createCorrelationGroup({
      findingIds: [brandFindingId('fnd_1'), brandFindingId('fnd_2')],
      dominantCategory: FindingCategory.Vulnerability,
      dominantSeverity: Severity.High,
      correlationScore: 0.85,
      reasons: [CorrelationReason.SameCVE],
      representativeFindingId: brandFindingId('fnd_1'),
    });
    expect(group.findingIds.length).toBe(2);
    expect(group.dominantSeverity).toBe(Severity.High);
    expect(group.correlationScore).toBe(0.85);
  });

  it('should create Correlation', () => {
    const correlation = createCorrelation({
      sourceFindingId: brandFindingId('fnd_1'),
      targetFindingId: brandFindingId('fnd_2'),
      score: 0.9,
      reasons: [CorrelationReason.SameCVE],
      evidence: [],
      duplicateType: null,
    });
    expect(correlation.score).toBe(0.9);
    expect(correlation.duplicateType).toBeNull();
    expect(correlation.id).toBeTruthy();
  });

  it('should create DuplicateDetection', () => {
    const dup = createDuplicateDetection({
      originalFindingId: brandFindingId('fnd_1'),
      duplicateFindingId: brandFindingId('fnd_2'),
      duplicateType: DuplicateType.ExactDuplicate,
      similarity: 0.98,
      evidence: [],
    });
    expect(dup.duplicateType).toBe(DuplicateType.ExactDuplicate);
    expect(dup.similarity).toBe(0.98);
  });

  it('should serialize and deserialize Correlation', () => {
    const correlation = createCorrelation({
      sourceFindingId: brandFindingId('fnd_1'),
      targetFindingId: brandFindingId('fnd_2'),
      score: 0.75,
      reasons: [CorrelationReason.SameHost],
      evidence: [],
      duplicateType: DuplicateType.SimilarFinding,
    });
    const json = correlationToJSON(correlation);
    const restored = correlationFromJSON(json);
    expect(restored.sourceFindingId).toBe(correlation.sourceFindingId);
    expect(restored.targetFindingId).toBe(correlation.targetFindingId);
    expect(restored.score).toBe(correlation.score);
  });

  it('should check equality by ID', () => {
    const a = createCorrelation({
      sourceFindingId: brandFindingId('fnd_1'),
      targetFindingId: brandFindingId('fnd_2'),
      score: 0.9,
      reasons: [],
      evidence: [],
      duplicateType: null,
    });
    const b = createCorrelation({
      sourceFindingId: brandFindingId('fnd_1'),
      targetFindingId: brandFindingId('fnd_3'),
      score: 0.5,
      reasons: [],
      evidence: [],
      duplicateType: null,
    });
    expect(correlationsEqual(a, a)).toBe(true);
    expect(correlationsEqual(a, b)).toBe(false);
  });

  it('should clone a Correlation', () => {
    const correlation = createCorrelation({
      sourceFindingId: brandFindingId('fnd_1'),
      targetFindingId: brandFindingId('fnd_2'),
      score: 0.8,
      reasons: [CorrelationReason.SameCWE],
      evidence: [],
      duplicateType: null,
    });
    const cloned = cloneCorrelation(correlation);
    expect(cloned.sourceFindingId).toBe(correlation.sourceFindingId);
    expect(cloned.score).toBe(correlation.score);
    expect(cloned.id).not.toBe(correlation.id); // New ID on clone
  });

  it('should hash a Correlation', () => {
    const correlation = createCorrelation({
      sourceFindingId: brandFindingId('fnd_1'),
      targetFindingId: brandFindingId('fnd_2'),
      score: 0.8,
      reasons: [],
      evidence: [],
      duplicateType: null,
    });
    const hash = hashCorrelation(correlation);
    expect(typeof hash).toBe('number');
  });

  it('should create empty result statistics', () => {
    const stats = createEmptyResultStatistics(10);
    expect(stats.totalFindings).toBe(10);
    expect(stats.totalCorrelations).toBe(0);
    expect(stats.totalGroups).toBe(0);
    expect(stats.totalDuplicates).toBe(0);
  });

  it('should convert CanonicalFinding to CorrelationFindingInput', () => {
    const finding = makeCanonicalFinding();
    const input = toCorrelationFindingInput(finding);
    expect(input.id).toBe(finding.id);
    expect(input.sourceEngine).toBe(finding.sourceEngine);
    expect(input.severity).toBe(finding.severity);
    expect(input.affectedAsset).toBe('example.com');
    expect(input.endpoint).toContain('example.com');
    expect(input.cve).toEqual(['CVE-2024-1234']);
    expect(input.cwe).toEqual(['CWE-89']);
  });
});

// ─── Events ─────────────────────────────────────────────────

describe('Correlation Events', () => {
  it('should create CorrelationStartedEvent', () => {
    const event = createCorrelationStartedEvent('engine-1', 100, 18, 1000);
    expect(event.type).toBe('correlation.started');
    expect(event.data.findingCount).toBe(100);
    expect(event.data.rulesEnabled).toBe(18);
    expect(event.engineId).toBe('engine-1');
  });

  it('should create CorrelationCompletedEvent', () => {
    const event = createCorrelationCompletedEvent('engine-1', 50, 5, 10, 100, 500);
    expect(event.type).toBe('correlation.completed');
    expect(event.data.totalCorrelations).toBe(50);
  });

  it('should create CorrelationFailedEvent', () => {
    const event = createCorrelationFailedEvent('engine-1', 100, ['error'], 50);
    expect(event.type).toBe('correlation.failed');
    expect(event.data.errors).toEqual(['error']);
  });

  it('should create DuplicateDetectedEvent', () => {
    const event = createDuplicateDetectedEvent(
      'engine-1',
      brandFindingId('fnd_1'),
      brandFindingId('fnd_2'),
      'ExactDuplicate',
      0.99,
    );
    expect(event.type).toBe('correlation.duplicate.detected');
    expect(event.data.similarity).toBe(0.99);
  });

  it('should create CorrelationGraphBuiltEvent', () => {
    const event = createCorrelationGraphBuiltEvent('engine-1', 10, 15, 3, 200);
    expect(event.type).toBe('correlation.graph.built');
    expect(event.data.nodeCount).toBe(10);
  });

  it('should support subscribe/emit on EventBus', () => {
    const bus = new CorrelationEventBus();
    const received: any[] = [];
    const unsub = bus.subscribe(e => received.push(e));

    bus.emit(createCorrelationStartedEvent('e1', 10, 18, 100));
    expect(received.length).toBe(1);

    unsub();
    bus.emit(createCorrelationStartedEvent('e1', 20, 18, 100));
    expect(received.length).toBe(1); // unsubscribed
  });

  it('should clear event bus', () => {
    const bus = new CorrelationEventBus();
    bus.subscribe(() => {});
    bus.subscribe(() => {});
    expect(bus.handlerCount).toBe(2);
    bus.clear();
    expect(bus.handlerCount).toBe(0);
  });
});

// ─── Rules Engine ────────────────────────────────────────────

describe('Correlation Rules Engine', () => {
  let registry: RuleRegistry;

  beforeEach(() => {
    registry = new RuleRegistry();
  });

  it('should have 18 built-in rules', () => {
    expect(BUILT_IN_RULES.length).toBe(18);
    expect(registry.size).toBe(18);
  });

  it('should register and unregister custom rules', () => {
    const customRule = {
      name: 'CustomRule',
      reason: CorrelationReason.SameHost,
      weight: 0.5,
      description: 'Custom rule',
      evaluate: () => ({ matched: false, score: 0, evidence: null }),
    };
    registry.register(customRule);
    expect(registry.size).toBe(19);
    expect(registry.has('CustomRule')).toBe(true);

    registry.unregister('CustomRule');
    expect(registry.size).toBe(18);
  });

  it('should get rule by name', () => {
    const rule = registry.get('SameHost');
    expect(rule).toBeDefined();
    expect(rule!.weight).toBe(0.80);
  });

  it('should compute total weight', () => {
    const totalWeight = registry.getTotalWeight();
    expect(totalWeight).toBeGreaterThan(0);
  });

  it('should evaluate SameHost rule', () => {
    const rule = registry.get('SameHost')!;
    const a = makeCorrelationInput({ affectedAsset: 'example.com' });
    const b = makeCorrelationInput({ id: 'fnd_test_2', affectedAsset: 'example.com' });
    const result = rule.evaluate(a, b);
    expect(result.matched).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.evidence).not.toBeNull();
  });

  it('should not match SameHost with different hosts', () => {
    const rule = registry.get('SameHost')!;
    const a = makeCorrelationInput({ affectedAsset: 'example.com' });
    const b = makeCorrelationInput({ id: 'fnd_test_2', affectedAsset: 'other.com' });
    const result = rule.evaluate(a, b);
    expect(result.matched).toBe(false);
  });

  it('should evaluate SameCVE rule with weight 1.0', () => {
    const rule = registry.get('SameCVE')!;
    expect(rule!.weight).toBe(1.0);
    const a = makeCorrelationInput({ cve: ['CVE-2024-1234'] });
    const b = makeCorrelationInput({ id: 'fnd_test_2', cve: ['CVE-2024-1234'] });
    const result = rule.evaluate(a, b);
    expect(result.matched).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('should evaluate SameTechnology rule', () => {
    const rule = registry.get('SameTechnology')!;
    const a = makeCorrelationInput({ technology: ['nginx', 'php'] });
    const b = makeCorrelationInput({ id: 'fnd_test_2', technology: ['nginx', 'mysql'] });
    const result = rule.evaluate(a, b);
    expect(result.matched).toBe(true);
    // 1 shared out of max(2,2) = 0.5
    expect(result.score).toBeGreaterThan(0);
  });

  it('should evaluate SameEndpoint rule', () => {
    const rule = registry.get('SameEndpoint')!;
    const a = makeCorrelationInput({ endpoint: 'https://example.com/api/users' });
    const b = makeCorrelationInput({ id: 'fnd_test_2', endpoint: 'https://example.com/api/users' });
    const result = rule.evaluate(a, b);
    expect(result.matched).toBe(true);
  });

  it('should evaluate SameCWE rule', () => {
    const rule = registry.get('SameCWE')!;
    const a = makeCorrelationInput({ cwe: ['CWE-89'] });
    const b = makeCorrelationInput({ id: 'fnd_test_2', cwe: ['CWE-89', 'CWE-79'] });
    const result = rule.evaluate(a, b);
    expect(result.matched).toBe(true);
  });

  it('should evaluate all rules and compute weighted score', () => {
    const a = makeCorrelationInput({
      affectedAsset: 'example.com',
      endpoint: 'https://example.com/api',
      cve: ['CVE-2024-1234'],
      cwe: ['CWE-89'],
      technology: ['nginx'],
    });
    const b = makeCorrelationInput({
      id: 'fnd_test_2',
      affectedAsset: 'example.com',
      endpoint: 'https://example.com/api',
      cve: ['CVE-2024-1234'],
      cwe: ['CWE-89'],
      technology: ['nginx'],
    });
    const results = registry.evaluateAll(a, b);
    expect(results.length).toBe(18);
    const score = registry.computeWeightedScore(results);
    expect(score).toBeGreaterThan(0.3); // Many matching rules
  });

  it('should reset registry', () => {
    const customRule = {
      name: 'Custom',
      reason: CorrelationReason.SameHost,
      weight: 0.5,
      description: 'Custom',
      evaluate: () => ({ matched: false, score: 0, evidence: null }),
    };
    registry.register(customRule);
    expect(registry.size).toBe(19);
    registry.reset();
    expect(registry.size).toBe(18);
  });
});

// ─── Duplicate Detection ────────────────────────────────────

describe('Duplicate Detection', () => {
  let detector: DuplicateDetector;

  beforeEach(() => {
    detector = new DuplicateDetector();
  });

  it('should detect exact duplicates', () => {
    const a = makeCorrelationInput({ title: 'SQL Injection in /api/users' });
    const b = makeCorrelationInput({ id: 'fnd_test_1', title: 'SQL Injection in /api/users' });
    const result = detector.detect([a, b]);
    expect(result.duplicates.length).toBe(1);
    expect(result.duplicates[0].duplicateType).toBe(DuplicateType.ExactDuplicate);
    expect(result.uniqueFindings.length).toBe(1);
  });

  it('should keep unique findings separate', () => {
    const a = makeCorrelationInput({ title: 'SQL Injection', severity: Severity.High });
    const b = makeCorrelationInput({ id: 'fnd_test_2', title: 'XSS Vulnerability', severity: Severity.Medium });
    const result = detector.detect([a, b]);
    expect(result.duplicates.length).toBe(0);
    expect(result.uniqueFindings.length).toBe(2);
  });

  it('should compute similarity between findings', () => {
    const a = makeCorrelationInput({ title: 'SQL Injection in login form' });
    const b = makeCorrelationInput({ title: 'SQL Injection in search form' });
    const similarity = detector.computeSimilarity(a, b);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it('should classify duplicate types correctly', () => {
    expect(detector.classifyDuplicate(0.99)).toBe(DuplicateType.ExactDuplicate);
    expect(detector.classifyDuplicate(0.88)).toBe(DuplicateType.SemanticDuplicate);
    expect(detector.classifyDuplicate(0.75)).toBe(DuplicateType.SimilarFinding);
    expect(detector.classifyDuplicate(0.35)).toBe(DuplicateType.RelatedFinding);
    expect(detector.classifyDuplicate(0.1)).toBeNull();
  });

  it('should handle empty input', () => {
    const result = detector.detect([]);
    expect(result.duplicates.length).toBe(0);
    expect(result.uniqueFindings.length).toBe(0);
    expect(result.statistics.totalExamined).toBe(0);
  });

  it('should compute duplicate rate', () => {
    const a = makeCorrelationInput({ title: 'SQL Injection' });
    const b = makeCorrelationInput({ id: 'fnd_test_1', title: 'SQL Injection' }); // Exact dup
    const c = makeCorrelationInput({ id: 'fnd_test_3', title: 'XSS Attack' }); // Unique
    const result = detector.detect([a, b, c]);
    expect(result.statistics.duplicateRate).toBeGreaterThan(0);
  });
});

// ─── Correlation Graph ──────────────────────────────────────

describe('Correlation Graph', () => {
  let graph: CorrelationGraph;

  beforeEach(() => {
    graph = new CorrelationGraph();
  });

  it('should add nodes', () => {
    const finding = makeCorrelationInput();
    graph.addNode(finding);
    expect(graph.nodeCount).toBe(1);
    expect(graph.hasNode(finding.id)).toBe(true);
  });

  it('should add edges', () => {
    const a = makeCorrelationInput({ id: 'fnd_a' });
    const b = makeCorrelationInput({ id: 'fnd_b' });
    graph.addNode(a);
    graph.addNode(b);
    const edge = graph.addEdge(a.id, b.id, [CorrelationReason.SameHost], 0.8, []);
    expect(edge).not.toBeNull();
    expect(graph.edgeCount).toBe(1);
  });

  it('should not add edge for missing nodes', () => {
    const edge = graph.addEdge(brandFindingId('fnd_x'), brandFindingId('fnd_y'), [], 0.5, []);
    expect(edge).toBeNull();
  });

  it('should not add self-loop', () => {
    const a = makeCorrelationInput({ id: 'fnd_a' });
    graph.addNode(a);
    const edge = graph.addEdge(a.id, a.id, [], 0.5, []);
    expect(edge).toBeNull();
  });

  it('should merge edges for same pair', () => {
    const a = makeCorrelationInput({ id: 'fnd_a' });
    const b = makeCorrelationInput({ id: 'fnd_b' });
    graph.addNode(a);
    graph.addNode(b);
    graph.addEdge(a.id, b.id, [CorrelationReason.SameHost], 0.5, []);
    graph.addEdge(a.id, b.id, [CorrelationReason.SameCVE], 0.9, []);
    expect(graph.edgeCount).toBe(1); // Merged, not 2
  });

  it('should get neighbors', () => {
    const a = makeCorrelationInput({ id: 'fnd_a' });
    const b = makeCorrelationInput({ id: 'fnd_b' });
    const c = makeCorrelationInput({ id: 'fnd_c' });
    graph.addNode(a);
    graph.addNode(b);
    graph.addNode(c);
    graph.addEdge(a.id, b.id, [CorrelationReason.SameHost], 0.8, []);
    graph.addEdge(a.id, c.id, [CorrelationReason.SameCWE], 0.7, []);
    const neighbors = graph.getNeighbors(a.id);
    expect(neighbors.length).toBe(2);
  });

  it('should build groups', () => {
    const a = makeCorrelationInput({ id: 'fnd_a', severity: Severity.High });
    const b = makeCorrelationInput({ id: 'fnd_b', severity: Severity.Medium });
    const c = makeCorrelationInput({ id: 'fnd_c', severity: Severity.Low });
    graph.addNode(a);
    graph.addNode(b);
    graph.addNode(c);
    graph.addEdge(a.id, b.id, [CorrelationReason.SameHost], 0.8, []);
    graph.addEdge(b.id, c.id, [CorrelationReason.SameCWE], 0.7, []);
    const groups = graph.buildGroups(0.3);
    expect(groups.length).toBeGreaterThan(0);
    // All three should be in one group (connected component)
    expect(groups[0].findingIds.length).toBe(3);
  });

  it('should not create groups for singletons', () => {
    const a = makeCorrelationInput({ id: 'fnd_a' });
    const b = makeCorrelationInput({ id: 'fnd_b' });
    graph.addNode(a);
    graph.addNode(b);
    // No edges → no groups
    const groups = graph.buildGroups(0.3);
    expect(groups.length).toBe(0);
  });

  it('should get graph snapshot', () => {
    const a = makeCorrelationInput({ id: 'fnd_a' });
    const b = makeCorrelationInput({ id: 'fnd_b' });
    graph.addNode(a);
    graph.addNode(b);
    graph.addEdge(a.id, b.id, [CorrelationReason.SameHost], 0.8, []);
    const snapshot = graph.getSnapshot();
    expect(snapshot.nodeCount).toBe(2);
    expect(snapshot.edgeCount).toBe(1);
  });

  it('should clear graph', () => {
    const a = makeCorrelationInput({ id: 'fnd_a' });
    graph.addNode(a);
    graph.clear();
    expect(graph.nodeCount).toBe(0);
    expect(graph.edgeCount).toBe(0);
  });
});

// ─── Cache ──────────────────────────────────────────────────

describe('Correlation Cache', () => {
  let cache: CorrelationCache;

  beforeEach(() => {
    cache = new CorrelationCache({ capacity: 5, ttlMs: 60000 });
  });

  it('should set and get entries', () => {
    const result = createCorrelationResult({
      correlations: [],
      groups: [],
      duplicates: [],
      statistics: createEmptyResultStatistics(10),
      durationMs: 50,
    });
    cache.set('key1', result);
    const cached = cache.get('key1');
    expect(cached).not.toBeNull();
    expect(cached!.durationMs).toBe(50);
  });

  it('should return null for missing keys', () => {
    expect(cache.get('missing')).toBeNull();
  });

  it('should check has() correctly', () => {
    const result = createCorrelationResult({
      correlations: [], groups: [], duplicates: [],
      statistics: createEmptyResultStatistics(0), durationMs: 0,
    });
    cache.set('key1', result);
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should evict LRU entries when full', () => {
    const makeResult = (n: number) => createCorrelationResult({
      correlations: [], groups: [], duplicates: [],
      statistics: createEmptyResultStatistics(n), durationMs: n,
    });
    for (let i = 0; i < 6; i++) {
      cache.set(`key_${i}`, makeResult(i));
    }
    // First entry should be evicted
    expect(cache.get('key_0')).toBeNull();
    expect(cache.size).toBe(5);
  });

  it('should invalidate keys', () => {
    const result = createCorrelationResult({
      correlations: [], groups: [], duplicates: [],
      statistics: createEmptyResultStatistics(0), durationMs: 0,
    });
    cache.set('key1', result);
    expect(cache.invalidate('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
  });

  it('should invalidate by pattern', () => {
    const result = createCorrelationResult({
      correlations: [], groups: [], duplicates: [],
      statistics: createEmptyResultStatistics(0), durationMs: 0,
    });
    cache.set('batch_1', result);
    cache.set('batch_2', result);
    cache.set('other_1', result);
    const count = cache.invalidatePattern('batch_*');
    expect(count).toBe(2);
    expect(cache.size).toBe(1);
  });

  it('should track statistics', () => {
    const result = createCorrelationResult({
      correlations: [], groups: [], duplicates: [],
      statistics: createEmptyResultStatistics(0), durationMs: 0,
    });
    cache.set('key1', result);
    cache.get('key1'); // hit
    cache.get('missing'); // miss
    const stats = cache.getStatistics();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeGreaterThan(0);
  });

  it('should clear cache', () => {
    const result = createCorrelationResult({
      correlations: [], groups: [], duplicates: [],
      statistics: createEmptyResultStatistics(0), durationMs: 0,
    });
    cache.set('key1', result);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

// ─── KG Adapter ─────────────────────────────────────────────

describe('Knowledge Graph Adapter', () => {
  it('should adapt a CorrelationResult', () => {
    const adapter = new CorrelationKGAdapter();
    const correlation = createCorrelation({
      sourceFindingId: brandFindingId('fnd_1'),
      targetFindingId: brandFindingId('fnd_2'),
      score: 0.85,
      reasons: [CorrelationReason.SameCVE],
      evidence: [],
      duplicateType: null,
    });
    const group = createCorrelationGroup({
      findingIds: [brandFindingId('fnd_1'), brandFindingId('fnd_2')],
      dominantCategory: FindingCategory.Vulnerability,
      dominantSeverity: Severity.High,
      correlationScore: 0.85,
      reasons: [CorrelationReason.SameCVE],
      representativeFindingId: brandFindingId('fnd_1'),
    });
    const result = createCorrelationResult({
      correlations: [correlation],
      groups: [group],
      duplicates: [],
      statistics: createEmptyResultStatistics(2),
      durationMs: 100,
    });

    const kgResult = adapter.adapt(result);
    expect(kgResult.nodes.length).toBe(3); // 2 finding nodes + 1 group node
    expect(kgResult.edges.length).toBe(3); // 1 correlation edge + 2 CONTAINS edges
    expect(kgResult.statistics.groupNodes).toBe(1);
    expect(kgResult.statistics.findingNodes).toBe(2);
  });

  it('should determine edge types based on correlation reasons', () => {
    const adapter = new CorrelationKGAdapter();
    const corrCVE = createCorrelation({
      sourceFindingId: brandFindingId('fnd_1'),
      targetFindingId: brandFindingId('fnd_2'),
      score: 0.9,
      reasons: [CorrelationReason.SameCVE],
      evidence: [],
      duplicateType: null,
    });
    const edge = adapter.correlationToEdge(corrCVE);
    expect(edge.relationship.edgeType).toBe('EXPOSES');
  });
});

// ─── Statistics ──────────────────────────────────────────────

describe('Correlation Statistics', () => {
  it('should track correlation statistics', () => {
    const collector = new CorrelationStatisticsCollector();
    collector.recordCorrelation(10, [CorrelationReason.SameHost]);
    collector.recordCorrelation(20, [CorrelationReason.SameCVE, CorrelationReason.SameCWE]);
    collector.recordFailure();
    collector.recordBatch(100, 50);
    collector.recordDeduplication(DuplicateType.ExactDuplicate);
    collector.recordCacheHit();
    collector.recordCacheMiss();

    const stats = collector.collect();
    expect(stats.totalCorrelated).toBe(2);
    expect(stats.totalFailed).toBe(1);
    expect(stats.totalBatches).toBe(1);
    expect(stats.totalDeduplications).toBe(1);
    expect(stats.cacheHits).toBe(1);
    expect(stats.cacheMisses).toBe(1);
    expect(stats.throughputPerSecond).toBeGreaterThan(0);
  });

  it('should reset statistics', () => {
    const collector = new CorrelationStatisticsCollector();
    collector.recordCorrelation(10, []);
    collector.reset();
    const stats = collector.collect();
    expect(stats.totalCorrelated).toBe(0);
  });
});

// ─── CorrelationEngine ──────────────────────────────────────

describe('CorrelationEngine', () => {
  let engine: CorrelationEngine;

  beforeEach(() => {
    engine = new CorrelationEngine({ engineId: 'test' });
  });

  it('should correlate findings', () => {
    const f1 = makeCanonicalFinding({
      id: 'fnd_1',
      title: 'SQL Injection',
      severity: Severity.High,
      affectedAsset: createAffectedAsset({ type: AssetType.Host, identifier: 'example.com' }),
      endpoint: createCanonicalURL({ scheme: 'https', host: 'example.com', path: '/api/users', original: 'https://example.com/api/users' }),
      cve: [createCVEReference(2024, '1234')],
      cwe: [createCWEReference(89, 'SQL Injection')],
    });
    const f2 = makeCanonicalFinding({
      id: 'fnd_2',
      title: 'XSS on same host',
      severity: Severity.Medium,
      affectedAsset: createAffectedAsset({ type: AssetType.Host, identifier: 'example.com' }),
      endpoint: createCanonicalURL({ scheme: 'https', host: 'example.com', path: '/api/search', original: 'https://example.com/api/search' }),
      cve: [createCVEReference(2024, '1234')],
      cwe: [createCWEReference(79, 'XSS')],
    });

    const result = engine.correlate([f1, f2]);
    expect(result.correlations.length).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.statistics.totalFindings).toBe(2);
  });

  it('should detect duplicates in correlation', () => {
    const f1 = makeCanonicalFinding({ id: 'fnd_1', title: 'SQL Injection' });
    const f2 = makeCanonicalFinding({ id: 'fnd_2', title: 'SQL Injection' }); // Same title

    const result = engine.correlate([f1, f2]);
    // Identical findings should be detected as duplicates
    expect(result.duplicates.length + result.correlations.length).toBeGreaterThan(0);
  });

  it('should correlate batch of findings', () => {
    const findings = [];
    for (let i = 0; i < 50; i++) {
      findings.push(makeCanonicalFinding({
        id: `fnd_batch_${i}`,
        title: `Vulnerability ${i}`,
        affectedAsset: createAffectedAsset({ type: AssetType.Host, identifier: i < 25 ? 'host-a.com' : 'host-b.com' }),
        endpoint: createCanonicalURL({ scheme: 'https', host: i < 25 ? 'host-a.com' : 'host-b.com', path: `/api/${i}`, original: `https://${i < 25 ? 'host-a.com' : 'host-b.com'}/api/${i}` }),
        cve: i < 25 ? [createCVEReference(2024, '1234')] : [],
      }));
    }

    const result = engine.correlateBatch(findings);
    expect(result.correlations.length).toBeGreaterThan(0);
    expect(result.statistics.totalFindings).toBe(50);
  });

  it('should perform incremental correlation', () => {
    const f1 = makeCanonicalFinding({ id: 'fnd_inc_1' });
    const f2 = makeCanonicalFinding({ id: 'fnd_inc_2' });
    const existingResult = engine.correlate([f1, f2]);

    const f3 = makeCanonicalFinding({ id: 'fnd_inc_3' });
    const incrementalResult = engine.incremental([f3], existingResult);
    expect(incrementalResult.correlations.length).toBeGreaterThanOrEqual(existingResult.correlations.length);
  });

  it('should deduplicate findings', () => {
    const f1 = makeCanonicalFinding({ id: 'fnd_dedup_1', title: 'SQL Injection' });
    const f2 = makeCanonicalFinding({ id: 'fnd_dedup_2', title: 'SQL Injection' });

    const result = engine.deduplicate([f1, f2]);
    expect(result.duplicates.length).toBeGreaterThan(0);
    expect(result.uniqueFindings.length).toBe(1);
  });

  it('should build correlation graph', () => {
    const f1 = makeCanonicalFinding({ id: 'fnd_graph_1' });
    const f2 = makeCanonicalFinding({ id: 'fnd_graph_2' });

    const graph = engine.buildCorrelationGraph([f1, f2]);
    expect(graph.nodeCount).toBe(2);
  });

  it('should return statistics', () => {
    const f1 = makeCanonicalFinding({ id: 'fnd_stat_1' });
    engine.correlate([f1]);
    const stats = engine.statistics();
    expect(stats.totalCorrelated).toBeGreaterThanOrEqual(0);
  });

  it('should reset engine', () => {
    engine.reset();
    const stats = engine.statistics();
    expect(stats.totalCorrelated).toBe(0);
  });

  it('should emit events during correlation', () => {
    const events: any[] = [];
    engine.eventBus.subscribe(e => events.push(e));

    const f1 = makeCanonicalFinding({ id: 'fnd_evt_1' });
    const f2 = makeCanonicalFinding({ id: 'fnd_evt_2' });
    engine.correlate([f1, f2]);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('correlation.started');
  });

  it('should expose rule registry', () => {
    expect(engine.ruleRegistry).toBeDefined();
    expect(engine.ruleRegistry.size).toBe(18);
  });

  it('should expose KG adapter', () => {
    expect(engine.kgAdapter).toBeDefined();
  });

  it('should handle empty input', () => {
    const result = engine.correlate([]);
    expect(result.correlations.length).toBe(0);
    expect(result.groups.length).toBe(0);
    expect(result.duplicates.length).toBe(0);
  });

  it('should handle single finding', () => {
    const f1 = makeCanonicalFinding({ id: 'fnd_single' });
    const result = engine.correlate([f1]);
    expect(result.correlations.length).toBe(0); // No pairs
    expect(result.groups.length).toBe(0);
  });
});

// ─── Edge Cases ──────────────────────────────────────────────

describe('Edge Cases', () => {
  it('should handle findings with null affectedAsset', () => {
    const f = createCanonicalFinding({
      sourceEngine: SourceEngine.Nuclei,
      category: FindingCategory.Vulnerability,
      title: 'Test',
      description: 'Test finding',
      severity: Severity.High,
      confidence: ConfidenceLevel.High,
      confidenceScore: 0.9,
      affectedAsset: null,
    });
    const input = toCorrelationFindingInput(f);
    expect(input.affectedAsset).toBeNull();
  });

  it('should handle findings with null endpoint', () => {
    const f = createCanonicalFinding({
      sourceEngine: SourceEngine.Nuclei,
      category: FindingCategory.Vulnerability,
      title: 'Test',
      description: 'Test finding',
      severity: Severity.High,
      confidence: ConfidenceLevel.High,
      confidenceScore: 0.9,
      endpoint: null,
    });
    const input = toCorrelationFindingInput(f);
    expect(input.endpoint).toBeNull();
  });

  it('should handle findings with empty CVE/CWE arrays', () => {
    const f = makeCanonicalFinding({ cve: [], cwe: [] });
    const input = toCorrelationFindingInput(f);
    expect(input.cve).toEqual([]);
    expect(input.cwe).toEqual([]);
  });

  it('should handle findings with empty evidence', () => {
    const f = makeCanonicalFinding({ evidence: [] });
    const input = toCorrelationFindingInput(f);
    expect(input.evidence).toEqual([]);
  });

  it('should handle findings with no technology', () => {
    const f = makeCanonicalFinding({ technology: [] });
    const input = toCorrelationFindingInput(f);
    expect(input.technology).toEqual([]);
  });

  it('should handle correlation with no matching rules', () => {
    const a = makeCorrelationInput({ affectedAsset: 'host-a.com', endpoint: 'https://host-a.com/a' });
    const b = makeCorrelationInput({
      id: 'fnd_test_2',
      affectedAsset: 'host-b.com',
      endpoint: 'https://host-b.com/b',
      cve: ['CVE-2024-9999'],
      cwe: ['CWE-999'],
      technology: ['python'],
    });
    const registry = new RuleRegistry();
    const results = registry.evaluateAll(a, b);
    const score = registry.computeWeightedScore(results);
    // No matching rules → low score
    expect(score).toBeLessThan(0.3);
  });

  it('should handle cache TTL expiration', async () => {
    const cache = new CorrelationCache({ capacity: 10, ttlMs: 1 }); // 1ms TTL
    const result = createCorrelationResult({
      correlations: [], groups: [], duplicates: [],
      statistics: createEmptyResultStatistics(0), durationMs: 0,
    });
    cache.set('key1', result);
    // Wait for TTL to expire
    await new Promise(r => setTimeout(r, 10));
    expect(cache.get('key1')).toBeNull();
  });

  it('should handle graph with disconnected components', () => {
    const graph = new CorrelationGraph();
    const a = makeCorrelationInput({ id: 'fnd_a', affectedAsset: 'host-a.com' });
    const b = makeCorrelationInput({ id: 'fnd_b', affectedAsset: 'host-a.com' });
    const c = makeCorrelationInput({ id: 'fnd_c', affectedAsset: 'host-c.com' });
    const d = makeCorrelationInput({ id: 'fnd_d', affectedAsset: 'host-c.com' });
    graph.addNode(a);
    graph.addNode(b);
    graph.addNode(c);
    graph.addNode(d);
    graph.addEdge(a.id, b.id, [CorrelationReason.SameHost], 0.8, []);
    graph.addEdge(c.id, d.id, [CorrelationReason.SameHost], 0.8, []);
    const groups = graph.buildGroups(0.3);
    expect(groups.length).toBe(2);
  });

  it('should handle correlation score clamping', () => {
    const evidence = createCorrelationEvidence({
      reason: CorrelationReason.SameHost,
      sharedValue: 'test',
      sourceField: 'a',
      targetField: 'b',
      confidence: -0.5,
    });
    expect(evidence.confidence).toBe(0);

    const edge = createCorrelationEdge({
      sourceFindingId: brandFindingId('fnd_1'),
      targetFindingId: brandFindingId('fnd_2'),
      reasons: [],
      score: 2.0,
      evidence: [],
    });
    expect(edge.score).toBe(1.0);
  });
});
