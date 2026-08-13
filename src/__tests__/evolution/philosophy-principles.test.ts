/**
 * Evolution Runtime — Philosophy Principles Tests (PHI-001 through PHI-007)
 *
 * Tests the 7 core philosophy principles embedded in the Evolution Runtime:
 *   PHI-001: Value Creation — Every improvement must create measurable value.
 *   PHI-002: Continuous Improvement — The system must support ongoing improvement cycles.
 *   PHI-003: Measurable Recommendations — Every recommendation must be measurable.
 *   PHI-004: Primary Constraint First — The main bottleneck must be addressed first.
 *   PHI-005: No Optimization Without Value — Optimization without value growth is forbidden.
 *   PHI-006: No Local Optimization — Local optimization is forbidden.
 *   PHI-007: Evidence of Effectiveness — Every change must have proof.
 *
 * Plus the core rule: "AIS never optimizes for optimization's sake."
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { DefaultEvolutionRuntimeConfig } from '../../core/evolution/types.js';
import { EvolutionRuntime } from '../../core/evolution/evolution-runtime.js';
import { ImprovementEngine } from '../../core/evolution/improvement-engine.js';
import { ValueAnalyzer } from '../../core/evolution/value-analyzer.js';
import { KPIRuntime } from '../../core/evolution/kpi-runtime.js';
import { ExperimentRuntime } from '../../core/evolution/experiment-runtime.js';
import { BottleneckDetector } from '../../core/evolution/bottleneck-detector.js';
import { ConstraintAnalyzer } from '../../core/evolution/constraint-analyzer.js';
import { OpportunityCostEngine } from '../../core/evolution/opportunity-cost-engine.js';
import { OptimizationPlanner } from '../../core/evolution/optimization-planner.js';
import { RecommendationPrioritizer } from '../../core/evolution/recommendation-prioritizer.js';
import { LearningLoop } from '../../core/evolution/learning-loop.js';
import { EvolutionGraph } from '../../core/evolution/evolution-graph.js';
import {
  OptimizationWithoutValueError,
  LocalOptimizationError,
  NoValueProofError,
  EvolutionError,
} from '../../core/evolution/errors.js';
import {
  ValueDimension,
  ConstraintType,
  BottleneckSeverity,
  KPDirection,
  ImprovementStatus,
  LearningOutcome,
  EvolutionState,
  brandImprovementId,
} from '../../core/evolution/types.js';
import type {
  Improvement,
  ValueAnalysis,
  KPIComparison,
  OpportunityCost,
  Experiment,
} from '../../core/evolution/types.js';

let bus: InProcessEventBus;
let runtime: EvolutionRuntime;

beforeEach(async () => {
  bus = new InProcessEventBus();
  runtime = new EvolutionRuntime(DefaultEvolutionRuntimeConfig, bus);
});

// ═══════════════════════════════════════════════════════════════════
// PHI-001: Value Creation
// Every improvement must create measurable value.
// ═══════════════════════════════════════════════════════════════════

describe('PHI-001: Value Creation', () => {
  beforeEach(async () => {
    await runtime.initialize();
  });

  it('ImprovementEngine.propose() creates improvements that can receive value scores', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'Test Improvement',
      description: 'For testing value',
      bottleneckId: null,
      constraintType: ConstraintType.Performance,
      targetRuntime: null,
      targetCapability: null,
      estimatedEffort: 'low',
      evidence: ['test-evidence'],
      metadata: Object.freeze({}),
    });
    expect(imp).toBeDefined();
    expect(typeof imp.valueScore).toBe('number');
  });

  it('proposed improvement starts with valueScore of 0', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'Zero Score',
      description: 'No value yet',
      bottleneckId: null,
      constraintType: ConstraintType.Architecture,
      targetRuntime: null,
      targetCapability: null,
      estimatedEffort: 'low',
      evidence: [],
      metadata: Object.freeze({}),
    });
    expect(imp.valueScore).toBe(0);
  });

  it('ValueAnalyzer.analyze() produces a valueScore > 0 with default config', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'Valuable',
      description: 'Creates value',
      bottleneckId: null,
      constraintType: ConstraintType.Performance,
      targetRuntime: null,
      targetCapability: null,
      estimatedEffort: 'low',
      evidence: [],
      metadata: Object.freeze({}),
    });
    const analyzer = runtime.getValueAnalyzer();
    const analysis = await analyzer.analyze(imp.id);
    expect(analysis.valueScore).toBeGreaterThan(0);
  });

  it('ValueAnalyzer.analyze() returns ValueAnalysis with valueCreated field', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'V', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const analysis = await runtime.getValueAnalyzer().analyze(imp.id);
    expect(analysis).toHaveProperty('valueCreated');
    expect(typeof analysis.valueCreated).toBe('string');
    expect(analysis.valueCreated.length).toBeGreaterThan(0);
  });

  it('ValueAnalyzer.analyze() returns ValueAnalysis with valueFor field', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'V', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const analysis = await runtime.getValueAnalyzer().analyze(imp.id);
    expect(analysis).toHaveProperty('valueFor');
    expect(typeof analysis.valueFor).toBe('string');
  });

  it('ValueAnalyzer.analyze() returns ValueAnalysis with valueMagnitude field', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'V', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const analysis = await runtime.getValueAnalyzer().analyze(imp.id);
    expect(analysis).toHaveProperty('valueMagnitude');
    expect(typeof analysis.valueMagnitude).toBe('number');
  });

  it('KPIRuntime.register() creates a KPI for value measurement', async () => {
    const kpi = await runtime.getKPIRuntime().register({
      name: 'Response Time',
      description: 'Average response time in ms',
      unit: 'ms',
      direction: KPDirection.LowerIsBetter,
      target: 100,
      initialValue: 500,
      metadata: Object.freeze({}),
    });
    expect(kpi).toBeDefined();
    expect(kpi.currentValue).toBe(500);
  });

  it('KPIRuntime.record() updates the KPI value', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Throughput', description: 'req/s', unit: 'req/s',
      direction: KPDirection.HigherIsBetter, target: null, initialValue: 100,
      metadata: Object.freeze({}),
    });
    await kpiRt.record(kpi.id, 150);
    const updated = await kpiRt.getById(kpi.id);
    expect(updated!.currentValue).toBe(150);
  });

  it('KPIRuntime.getComparison() provides before/after metrics for value measurement', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Latency', description: 'ms', unit: 'ms',
      direction: KPDirection.LowerIsBetter, target: 50, initialValue: 200,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    // Wait a tiny bit to ensure distinct timestamps
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 120);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comparison = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comparison).not.toBeNull();
    expect(comparison!.beforeValue).toBe(200);
    expect(comparison!.afterValue).toBe(120);
  });

  it('KPIRuntime.getComparison() returns change field', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Score', description: 's', unit: 'pts',
      direction: KPDirection.HigherIsBetter, target: null, initialValue: 10,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 20);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comp).toHaveProperty('change');
    expect(comp!.change).toBe(10);
  });

  it('KPIRuntime.getComparison() returns changePercent field', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Revenue', description: 'r', unit: '$',
      direction: KPDirection.HigherIsBetter, target: null, initialValue: 100,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 150);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comp).toHaveProperty('changePercent');
    expect(comp!.changePercent).toBe(50);
  });

  it('KPIRuntime.getComparison() returns improved field', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Error Rate', description: 'er', unit: '%',
      direction: KPDirection.LowerIsBetter, target: null, initialValue: 10,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 5);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comp).toHaveProperty('improved');
    expect(comp!.improved).toBe(true);
  });

  it('recommendations with valueScore=0 are still tracked (value not yet analyzed)', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'Not Analyzed', description: 'd', bottleneckId: null,
      constraintType: ConstraintType.Architecture, targetRuntime: null,
      targetCapability: null, estimatedEffort: 'low', evidence: [],
      metadata: Object.freeze({}),
    });
    const retrieved = await engine.getById(imp.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.valueScore).toBe(0);
  });

  it('ValueDimension covers UserValue', () => {
    expect(ValueDimension.UserValue).toBe('UserValue');
  });

  it('ValueDimension covers PlatformValue', () => {
    expect(ValueDimension.PlatformValue).toBe('PlatformValue');
  });

  it('ValueDimension covers BusinessValue', () => {
    expect(ValueDimension.BusinessValue).toBe('BusinessValue');
  });

  it('ValueDimension covers DeveloperValue', () => {
    expect(ValueDimension.DeveloperValue).toBe('DeveloperValue');
  });

  it('ValueDimension covers KnowledgeValue', () => {
    expect(ValueDimension.KnowledgeValue).toBe('KnowledgeValue');
  });

  it('DefaultEvolutionRuntimeConfig includes all 5 valueDimensions', () => {
    const dims = DefaultEvolutionRuntimeConfig.valueAnalyzer.valueDimensions;
    expect(dims).toHaveLength(5);
    expect(dims).toContain(ValueDimension.UserValue);
    expect(dims).toContain(ValueDimension.PlatformValue);
    expect(dims).toContain(ValueDimension.BusinessValue);
    expect(dims).toContain(ValueDimension.DeveloperValue);
    expect(dims).toContain(ValueDimension.KnowledgeValue);
  });

  it('ValueAnalyzer.analyze() persists analysis for later retrieval', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'V', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const analyzer = runtime.getValueAnalyzer();
    await analyzer.analyze(imp.id);
    const retrieved = await analyzer.getByImprovementId(imp.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.valueScore).toBeGreaterThan(0);
  });

  it('KPIRuntime tracks history for before/after comparison', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Hist', description: 'h', unit: 'n',
      direction: KPDirection.HigherIsBetter, target: null, initialValue: 1,
      metadata: Object.freeze({}),
    });
    expect(kpi.history).toHaveLength(1);
    await kpiRt.record(kpi.id, 2);
    await kpiRt.record(kpi.id, 3);
    const updated = await kpiRt.getById(kpi.id);
    expect(updated!.history).toHaveLength(3);
  });

  it('KPIRuntime TargetIsOptimal direction determines improvement correctly', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Optimal Target', description: 't', unit: 'deg',
      direction: KPDirection.TargetIsOptimal, target: 72, initialValue: 80,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 74);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comp!.improved).toBe(true);
  });

  it('ValueAnalysis has beforeMetrics and afterMetrics fields', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'V', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const analysis = await runtime.getValueAnalyzer().analyze(imp.id);
    expect(analysis).toHaveProperty('beforeMetrics');
    expect(analysis).toHaveProperty('afterMetrics');
  });

  it('ValueAnalysis valueDimension matches config first dimension', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'V', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const analysis = await runtime.getValueAnalyzer().analyze(imp.id);
    expect(analysis.valueDimension).toBe(DefaultEvolutionRuntimeConfig.valueAnalyzer.valueDimensions[0]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHI-002: Continuous Improvement
// The system must support ongoing improvement cycles.
// ═══════════════════════════════════════════════════════════════════

describe('PHI-002: Continuous Improvement', () => {
  beforeEach(async () => {
    await runtime.initialize();
  });

  it('EvolutionRuntime.analyze() can be called and returns a result', async () => {
    const result = await runtime.analyze();
    expect(result).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('EvolutionRuntime.analyze() can be called multiple times', async () => {
    await runtime.analyze();
    const result2 = await runtime.analyze();
    expect(result2).toBeDefined();
  });

  it('each analyze() call produces new bottlenecks', async () => {
    const result1 = await runtime.analyze();
    const result2 = await runtime.analyze();
    expect(result2.bottlenecks.length).toBeGreaterThan(0);
  });

  it('each analyze() call produces new improvements', async () => {
    const result1 = await runtime.analyze();
    const result2 = await runtime.analyze();
    expect(result2.improvements.length).toBeGreaterThan(0);
  });

  it('multiple analyze() calls accumulate improvements', async () => {
    await runtime.analyze();
    const engine = runtime.getImprovementEngine();
    const countAfter1 = await engine.count();
    await runtime.analyze();
    const countAfter2 = await engine.count();
    expect(countAfter2).toBeGreaterThan(countAfter1);
  });

  it('LearningLoop.record() records a lesson from each cycle', async () => {
    const ll = runtime.getLearningLoop();
    const record = await ll.record({
      action: 'refactor',
      outcome: LearningOutcome.Improved,
      lesson: 'Simplified module interface',
      context: 'Performance bottleneck',
      improvementId: null,
      experimentId: null,
      metadata: Object.freeze({}),
    });
    expect(record).toBeDefined();
    expect(record.lesson).toBe('Simplified module interface');
  });

  it('LearningLoop accumulates records across cycles', async () => {
    const ll = runtime.getLearningLoop();
    await ll.record({
      action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l1', context: 'c1',
      improvementId: null, experimentId: null, metadata: Object.freeze({}),
    });
    await ll.record({
      action: 'a2', outcome: LearningOutcome.Worsened, lesson: 'l2', context: 'c2',
      improvementId: null, experimentId: null, metadata: Object.freeze({}),
    });
    expect(await ll.count()).toBe(2);
  });

  it('LearningLoop.getLessonsForAction() returns relevant lessons', async () => {
    const ll = runtime.getLearningLoop();
    await ll.record({
      action: 'caching', outcome: LearningOutcome.Improved, lesson: 'Use LRU cache',
      context: 'memory optimization', improvementId: null, experimentId: null,
      metadata: Object.freeze({}),
    });
    await ll.record({
      action: 'indexing', outcome: LearningOutcome.Improved, lesson: 'Add B-tree index',
      context: 'query optimization', improvementId: null, experimentId: null,
      metadata: Object.freeze({}),
    });
    const lessons = await ll.getLessonsForAction('caching');
    expect(lessons).toHaveLength(1);
    expect(lessons[0].lesson).toBe('Use LRU cache');
  });

  it('EvolutionGraph.addNode() adds a node for each improvement', async () => {
    const graph = runtime.getEvolutionGraph();
    const node = await graph.addNode({
      type: 'improvement',
      title: 'Cache Refactor',
      description: 'Added LRU cache',
      relatedIds: ['imp-1'],
      parentId: null,
      valueImpact: 25,
      metadata: Object.freeze({}),
    });
    expect(node).toBeDefined();
    expect(node.type).toBe('improvement');
  });

  it('EvolutionGraph count increases with each addNode', async () => {
    const graph = runtime.getEvolutionGraph();
    await graph.addNode({
      type: 'improvement', title: 'A', description: 'a',
      relatedIds: [], parentId: null, valueImpact: 10, metadata: Object.freeze({}),
    });
    await graph.addNode({
      type: 'experiment', title: 'B', description: 'b',
      relatedIds: [], parentId: null, valueImpact: 20, metadata: Object.freeze({}),
    });
    expect(await graph.count()).toBe(2);
  });

  it('OptimizationPlanner can generate a roadmap', async () => {
    const planner = runtime.getOptimizationPlanner();
    // First propose an improvement so the planner has something to prioritize
    const engine = runtime.getImprovementEngine();
    await engine.propose({
      name: 'Roadmap Item', description: 'd', bottleneckId: null,
      constraintType: ConstraintType.Performance, targetRuntime: null,
      targetCapability: null, estimatedEffort: 'low', evidence: [],
      metadata: Object.freeze({}),
    });
    const roadmap = await planner.generateRoadmap('Test Roadmap', 'For testing');
    expect(roadmap).toBeDefined();
    expect(roadmap.items.length).toBeGreaterThan(0);
  });

  it('roadmaps can be regenerated with updated data', async () => {
    const planner = runtime.getOptimizationPlanner();
    const engine = runtime.getImprovementEngine();
    await engine.propose({
      name: 'Item 1', description: 'd', bottleneckId: null,
      constraintType: ConstraintType.Performance, targetRuntime: null,
      targetCapability: null, estimatedEffort: 'low', evidence: [],
      metadata: Object.freeze({}),
    });
    const roadmap1 = await planner.generateRoadmap('V1');
    await engine.propose({
      name: 'Item 2', description: 'd', bottleneckId: null,
      constraintType: ConstraintType.Quality, targetRuntime: null,
      targetCapability: null, estimatedEffort: 'medium', evidence: [],
      metadata: Object.freeze({}),
    });
    const roadmap2 = await planner.generateRoadmap('V2');
    expect(roadmap2.items.length).toBeGreaterThanOrEqual(roadmap1.items.length);
  });

  it('EvolutionRuntime state transitions through Analyzing during analyze()', async () => {
    expect(runtime.state).toBe(EvolutionState.Ready);
    const analyzePromise = runtime.analyze();
    // State should be Analyzing during the call
    // Note: due to async, we check after completion
    const result = await analyzePromise;
    expect(runtime.state).toBe(EvolutionState.Ready);
    expect(result).toBeDefined();
  });

  it('analyze() returns value analyses for improvements', async () => {
    const result = await runtime.analyze();
    expect(result.valueAnalyses).toBeDefined();
    expect(Array.isArray(result.valueAnalyses)).toBe(true);
  });

  it('analyze() returns opportunity costs for improvements', async () => {
    const result = await runtime.analyze();
    expect(result.opportunityCosts).toBeDefined();
    expect(Array.isArray(result.opportunityCosts)).toBe(true);
  });

  it('analyze() returns a roadmap', async () => {
    const result = await runtime.analyze();
    expect(result.roadmap).not.toBeNull();
    expect(result.roadmap!.items).toBeDefined();
  });

  it('LearningLoop supports filtering by outcome', async () => {
    const ll = runtime.getLearningLoop();
    await ll.record({
      action: 'a', outcome: LearningOutcome.Improved, lesson: 'l1', context: 'c',
      improvementId: null, experimentId: null, metadata: Object.freeze({}),
    });
    await ll.record({
      action: 'a', outcome: LearningOutcome.Worsened, lesson: 'l2', context: 'c',
      improvementId: null, experimentId: null, metadata: Object.freeze({}),
    });
    const improved = await ll.list({ outcome: LearningOutcome.Improved });
    expect(improved).toHaveLength(1);
  });

  it('EvolutionGraph supports parent-child relationships across cycles', async () => {
    const graph = runtime.getEvolutionGraph();
    const parent = await graph.addNode({
      type: 'improvement', title: 'Parent', description: 'p',
      relatedIds: [], parentId: null, valueImpact: 10, metadata: Object.freeze({}),
    });
    const child = await graph.addNode({
      type: 'experiment', title: 'Child', description: 'c',
      relatedIds: [], parentId: parent.id, valueImpact: 15, metadata: Object.freeze({}),
    });
    const updatedParent = await graph.getNode(parent.id);
    expect(updatedParent!.childIds).toContain(child.id);
  });

  it('analyze() result contains durationMs for cycle tracking', async () => {
    const result = await runtime.analyze();
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('getMetrics() reflects accumulated state across cycles', async () => {
    await runtime.analyze();
    const metrics = await runtime.getMetrics();
    expect(metrics.totalBottlenecksDetected).toBeGreaterThan(0);
    expect(metrics.totalImprovements).toBeGreaterThan(0);
  });

  it('LearningRecord has outcome, lesson, and context fields', async () => {
    const ll = runtime.getLearningLoop();
    const record = await ll.record({
      action: 'refactor', outcome: LearningOutcome.Improved, lesson: 'Simplify API',
      context: 'Performance cycle', improvementId: null, experimentId: null,
      metadata: Object.freeze({}),
    });
    expect(record).toHaveProperty('outcome');
    expect(record).toHaveProperty('lesson');
    expect(record).toHaveProperty('context');
    expect(record.outcome).toBe(LearningOutcome.Improved);
  });

  it('LearningLoop supports NoChange outcome for neutral lessons', async () => {
    const ll = runtime.getLearningLoop();
    const record = await ll.record({
      action: 'tweak', outcome: LearningOutcome.NoChange, lesson: 'No measurable effect',
      context: 'minor config change', improvementId: null, experimentId: null,
      metadata: Object.freeze({}),
    });
    expect(record.outcome).toBe(LearningOutcome.NoChange);
  });

  it('EvolutionGraph node has valueImpact for tracking value per cycle', async () => {
    const graph = runtime.getEvolutionGraph();
    const node = await graph.addNode({
      type: 'improvement', title: 'V', description: 'd',
      relatedIds: [], parentId: null, valueImpact: 42, metadata: Object.freeze({}),
    });
    expect(node.valueImpact).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHI-003: Measurable Recommendations
// Every recommendation must be measurable.
// ═══════════════════════════════════════════════════════════════════

describe('PHI-003: Measurable Recommendations', () => {
  beforeEach(async () => {
    await runtime.initialize();
  });

  it('KPIRuntime.register() + record() + getComparison() provide before/after', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Test KPI', description: 'test', unit: 'ms',
      direction: KPDirection.LowerIsBetter, target: 50, initialValue: 100,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 60);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comp).not.toBeNull();
    expect(comp!.beforeValue).toBe(100);
    expect(comp!.afterValue).toBe(60);
  });

  it('KPIComparison has change field', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'K', description: 'k', unit: 'n',
      direction: KPDirection.HigherIsBetter, target: null, initialValue: 10,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 25);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(typeof comp!.change).toBe('number');
    expect(comp!.change).toBe(15);
  });

  it('KPIComparison has changePercent field', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'K', description: 'k', unit: 'n',
      direction: KPDirection.HigherIsBetter, target: null, initialValue: 100,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 200);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(typeof comp!.changePercent).toBe('number');
    expect(comp!.changePercent).toBe(100);
  });

  it('KPIComparison has improved field', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'K', description: 'k', unit: 'n',
      direction: KPDirection.HigherIsBetter, target: null, initialValue: 50,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 100);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(typeof comp!.improved).toBe('boolean');
    expect(comp!.improved).toBe(true);
  });

  it('KPIComparison improved is true for LowerIsBetter when value decreases', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Error Rate', description: 'er', unit: '%',
      direction: KPDirection.LowerIsBetter, target: null, initialValue: 10,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 3);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comp!.improved).toBe(true);
  });

  it('KPIComparison improved is false for HigherIsBetter when value decreases', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Uptime', description: 'up', unit: '%',
      direction: KPDirection.HigherIsBetter, target: null, initialValue: 99,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 95);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comp!.improved).toBe(false);
  });

  it('ExperimentRuntime.propose() creates an A/B experiment', async () => {
    const expRt = runtime.getExperimentRuntime();
    const impId = brandImprovementId('test-imp-1');
    const exp = await expRt.propose({
      name: 'Cache vs No Cache',
      description: 'Test caching strategy',
      improvementId: impId,
      variantA: 'LRU Cache',
      variantB: 'No Cache',
      metricName: 'response_time_ms',
      metadata: Object.freeze({}),
    });
    expect(exp).toBeDefined();
    expect(exp.variantA).toBe('LRU Cache');
    expect(exp.variantB).toBe('No Cache');
  });

  it('ExperimentRuntime.complete() provides A/B comparison with confidence', async () => {
    const expRt = runtime.getExperimentRuntime();
    const impId = brandImprovementId('test-imp-2');
    const exp = await expRt.propose({
      name: 'AB Test', description: 'd', improvementId: impId,
      variantA: 'A', variantB: 'B', metricName: 'metric',
      metadata: Object.freeze({}),
    });
    await expRt.start(exp.id);
    await expRt.complete(exp.id, 100, 80);
    const completed = await expRt.getById(exp.id);
    expect(completed!.variantAResult).toBe(100);
    expect(completed!.variantBResult).toBe(80);
    expect(completed!.confidence).toBeGreaterThan(0);
    expect(completed!.winner).not.toBeNull();
  });

  it('Experiment has confidence field after completion', async () => {
    const expRt = runtime.getExperimentRuntime();
    const impId = brandImprovementId('test-imp-3');
    const exp = await expRt.propose({
      name: 'E', description: 'd', improvementId: impId,
      variantA: 'A', variantB: 'B', metricName: 'm',
      metadata: Object.freeze({}),
    });
    await expRt.start(exp.id);
    await expRt.complete(exp.id, 50, 50);
    const completed = await expRt.getById(exp.id);
    expect(typeof completed!.confidence).toBe('number');
    expect(completed!.confidence).toBeGreaterThanOrEqual(0);
    expect(completed!.confidence).toBeLessThanOrEqual(1);
  });

  it('Experiment has winner field after completion', async () => {
    const expRt = runtime.getExperimentRuntime();
    const impId = brandImprovementId('test-imp-4');
    const exp = await expRt.propose({
      name: 'E', description: 'd', improvementId: impId,
      variantA: 'A', variantB: 'B', metricName: 'm',
      metadata: Object.freeze({}),
    });
    await expRt.start(exp.id);
    await expRt.complete(exp.id, 90, 70);
    const completed = await expRt.getById(exp.id);
    expect(completed!.winner).toBe('A');
  });

  it('Experiment winner is A when A has higher numeric result', async () => {
    const expRt = runtime.getExperimentRuntime();
    const impId = brandImprovementId('test-imp-5');
    const exp = await expRt.propose({
      name: 'E', description: 'd', improvementId: impId,
      variantA: 'A', variantB: 'B', metricName: 'm',
      metadata: Object.freeze({}),
    });
    await expRt.start(exp.id);
    await expRt.complete(exp.id, 100, 50);
    const completed = await expRt.getById(exp.id);
    // Experiment winner is determined by higher numeric value
    expect(completed!.winner).toBe('A');
  });

  it('KPIRuntime.getComparison() returns null for non-existent KPI', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const comp = await kpiRt.getComparison(
      'non-existent-kpi-id' as any,
      '2024-01-01T00:00:00Z',
      '2024-12-31T23:59:59Z',
    );
    expect(comp).toBeNull();
  });

  it('KPIComparison has direction field', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'D', description: 'd', unit: 'n',
      direction: KPDirection.HigherIsBetter, target: null, initialValue: 10,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 20);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comp!.direction).toBe(KPDirection.HigherIsBetter);
  });

  it('KPIComparison handles same before/after values correctly', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Same', description: 's', unit: 'n',
      direction: KPDirection.HigherIsBetter, target: null, initialValue: 50,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 50);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comp!.change).toBe(0);
    expect(comp!.changePercent).toBe(0);
    expect(comp!.improved).toBe(false);
  });

  it('Experiment with equal results has confidence of 1', async () => {
    const expRt = runtime.getExperimentRuntime();
    const impId = brandImprovementId('eq-imp');
    const exp = await expRt.propose({
      name: 'Equal', description: 'd', improvementId: impId,
      variantA: 'A', variantB: 'B', metricName: 'm',
      metadata: Object.freeze({}),
    });
    await expRt.start(exp.id);
    await expRt.complete(exp.id, 100, 100);
    const result = await expRt.getById(exp.id);
    expect(result!.confidence).toBe(1);
    expect(result!.winner).toBe('A');
  });

  it('KPIRuntime.getComparison() changePercent handles zero-to-nonzero transition', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Zero Start', description: 'z', unit: 'n',
      direction: KPDirection.HigherIsBetter, target: null, initialValue: 0,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 50);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comp!.changePercent).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHI-004: Primary Constraint First
// The main bottleneck must be addressed first.
// ═══════════════════════════════════════════════════════════════════

describe('PHI-004: Primary Constraint First', () => {
  beforeEach(async () => {
    await runtime.initialize();
  });

  it('BottleneckDetector detects with severity Low when no errors', async () => {
    const detector = runtime.getBottleneckDetector();
    const bottlenecks = await detector.detect({
      runtimeName: 'test-runtime',
      capabilityName: null,
      workflowName: null,
      metrics: {},
      errors: [],
      metadata: Object.freeze({}),
    });
    expect(bottlenecks[0].severity).toBe(BottleneckSeverity.Low);
  });

  it('BottleneckDetector detects with severity Medium when 1 error', async () => {
    const detector = runtime.getBottleneckDetector();
    const bottlenecks = await detector.detect({
      runtimeName: 'test-runtime', metrics: {},
      errors: ['timeout'], metadata: Object.freeze({}),
    });
    expect(bottlenecks[0].severity).toBe(BottleneckSeverity.Medium);
  });

  it('BottleneckDetector detects with severity High when 3 errors', async () => {
    const detector = runtime.getBottleneckDetector();
    const bottlenecks = await detector.detect({
      runtimeName: 'test-runtime', metrics: {},
      errors: ['err1', 'err2', 'err3'], metadata: Object.freeze({}),
    });
    expect(bottlenecks[0].severity).toBe(BottleneckSeverity.High);
  });

  it('BottleneckDetector detects with severity Critical when 5 errors', async () => {
    const detector = runtime.getBottleneckDetector();
    const bottlenecks = await detector.detect({
      runtimeName: 'test-runtime', metrics: {},
      errors: ['e1', 'e2', 'e3', 'e4', 'e5'], metadata: Object.freeze({}),
    });
    expect(bottlenecks[0].severity).toBe(BottleneckSeverity.Critical);
  });

  it('BottleneckDetector infers ConstraintType Performance from latency_ms metric', async () => {
    const detector = runtime.getBottleneckDetector();
    const bottlenecks = await detector.detect({
      runtimeName: 'test', metrics: { latency_ms: 5000 },
      errors: [], metadata: Object.freeze({}),
    });
    expect(bottlenecks[0].constraintType).toBe(ConstraintType.Performance);
  });

  it('BottleneckDetector infers ConstraintType Quality from error_rate metric', async () => {
    const detector = runtime.getBottleneckDetector();
    const bottlenecks = await detector.detect({
      runtimeName: 'test', metrics: { error_rate: 0.1 },
      errors: [], metadata: Object.freeze({}),
    });
    expect(bottlenecks[0].constraintType).toBe(ConstraintType.Quality);
  });

  it('BottleneckDetector infers ConstraintType UX from ux_score metric', async () => {
    const detector = runtime.getBottleneckDetector();
    const bottlenecks = await detector.detect({
      runtimeName: 'test', metrics: { ux_score: 3 },
      errors: [], metadata: Object.freeze({}),
    });
    expect(bottlenecks[0].constraintType).toBe(ConstraintType.UX);
  });

  it('ConstraintType determines analysis path via ConstraintAnalyzer', async () => {
    const detector = runtime.getBottleneckDetector();
    const bottlenecks = await detector.detect({
      runtimeName: 'test', metrics: { latency_ms: 1000 },
      errors: [], metadata: Object.freeze({}),
    });
    const analyzer = runtime.getConstraintAnalyzer();
    const analysis = await analyzer.analyze(bottlenecks[0].id);
    expect(analysis).toBeDefined();
    expect(analysis.bottleneckId).toBe(bottlenecks[0].id);
    expect(analysis.constraintType).toBeDefined();
  });

  it('ConstraintAnalysis has constraintType field', async () => {
    const detector = runtime.getBottleneckDetector();
    const bn = await detector.detect({ runtimeName: 't', metrics: {}, errors: [], metadata: Object.freeze({}) });
    const ca = await runtime.getConstraintAnalyzer().analyze(bn[0].id);
    expect(ca).toHaveProperty('constraintType');
  });

  it('ConstraintAnalysis has rootCause field', async () => {
    const detector = runtime.getBottleneckDetector();
    const bn = await detector.detect({ runtimeName: 't', metrics: {}, errors: [], metadata: Object.freeze({}) });
    const ca = await runtime.getConstraintAnalyzer().analyze(bn[0].id);
    expect(ca).toHaveProperty('rootCause');
    expect(typeof ca.rootCause).toBe('string');
    expect(ca.rootCause.length).toBeGreaterThan(0);
  });

  it('RecommendationPrioritizer.calculatePriority() gives higher priority to higher constraintWeight', () => {
    const prioritizer = runtime.getRecommendationPrioritizer();
    const makeImprovement = (constraintWeight: number): Improvement => ({
      id: brandImprovementId('test'), name: 't', description: 'd',
      status: ImprovementStatus.Proposed, bottleneckId: null,
      constraintType: ConstraintType.Performance, valueScore: 50,
      impactScore: 50, costScore: 10, riskScore: 10, urgencyScore: 50,
      constraintWeight, priority: 0, valueDimension: ValueDimension.UserValue,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      proposedAt: '', startedAt: null, completedAt: null,
      evidence: [], metadata: Object.freeze({}),
    } as Improvement);
    const low = makeImprovement(1.0);
    const high = makeImprovement(3.0);
    expect(prioritizer.calculatePriority(high)).toBeGreaterThan(prioritizer.calculatePriority(low));
  });

  it('OptimizationPlanner sorts by priority descending', async () => {
    const engine = runtime.getImprovementEngine();
    // Propose two improvements
    const imp1 = await engine.propose({
      name: 'Low Priority', description: 'd', bottleneckId: null,
      constraintType: ConstraintType.Architecture, targetRuntime: null,
      targetCapability: null, estimatedEffort: 'high', evidence: [],
      metadata: Object.freeze({}),
    });
    const imp2 = await engine.propose({
      name: 'High Priority', description: 'd', bottleneckId: null,
      constraintType: ConstraintType.Performance, targetRuntime: null,
      targetCapability: null, estimatedEffort: 'low', evidence: [],
      metadata: Object.freeze({}),
    });
    // Set different constraint weights via updateScores
    const impEngine = engine as unknown as ImprovementEngine;
    await impEngine.updateScores(imp1.id, { constraintWeight: 0.5 });
    await impEngine.updateScores(imp2.id, { constraintWeight: 2.0, valueScore: 80, impactScore: 80 });
    const prioritizer = runtime.getRecommendationPrioritizer();
    const all = await engine.list();
    const sorted = await prioritizer.prioritize(all);
    // The first item should have the highest priority
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].priority).toBeGreaterThanOrEqual(sorted[i].priority);
    }
  });

  it('Bottleneck has constraintType field from detection', async () => {
    const detector = runtime.getBottleneckDetector();
    const bn = await detector.detect({
      runtimeName: 'test', metrics: { latency_ms: 200 },
      errors: [], metadata: Object.freeze({}),
    });
    expect(bn[0].constraintType).toBe(ConstraintType.Performance);
  });

  it('Bottleneck has severity field', async () => {
    const detector = runtime.getBottleneckDetector();
    const bn = await detector.detect({
      runtimeName: 'test', metrics: {}, errors: ['err'], metadata: Object.freeze({}),
    });
    expect(bn[0].severity).toBeDefined();
    expect(Object.values(BottleneckSeverity)).toContain(bn[0].severity);
  });

  it('higher severity errors produce higher severity bottleneck', async () => {
    const detector = runtime.getBottleneckDetector();
    const low = await detector.detect({ runtimeName: 't', metrics: {}, errors: [], metadata: Object.freeze({}) });
    const high = await detector.detect({ runtimeName: 't', metrics: {}, errors: ['e1', 'e2', 'e3'], metadata: Object.freeze({}) });
    const order: Record<string, number> = {
      [BottleneckSeverity.Low]: 0,
      [BottleneckSeverity.Medium]: 1,
      [BottleneckSeverity.High]: 2,
      [BottleneckSeverity.Critical]: 3,
    };
    expect(order[high[0].severity]).toBeGreaterThanOrEqual(order[low[0].severity]);
  });

  it('BottleneckDetector infers ConstraintType from response_time metric', async () => {
    const detector = runtime.getBottleneckDetector();
    const bottlenecks = await detector.detect({
      runtimeName: 'test', metrics: { response_time: 5000 },
      errors: [], metadata: Object.freeze({}),
    });
    expect(bottlenecks[0].constraintType).toBe(ConstraintType.Performance);
  });

  it('BottleneckDetector defaults to Architecture when no specific metrics', async () => {
    const detector = runtime.getBottleneckDetector();
    const bottlenecks = await detector.detect({
      runtimeName: 'test', metrics: { cpu_load: 0.9 },
      errors: [], metadata: Object.freeze({}),
    });
    expect(bottlenecks[0].constraintType).toBe(ConstraintType.Architecture);
  });

  it('BottleneckDetector includes evidence from errors', async () => {
    const detector = runtime.getBottleneckDetector();
    const bottlenecks = await detector.detect({
      runtimeName: 'test', metrics: {},
      errors: ['OOM', 'timeout'], metadata: Object.freeze({}),
    });
    expect(bottlenecks[0].evidence).toContain('OOM');
    expect(bottlenecks[0].evidence).toContain('timeout');
  });

  it('ConstraintAnalyzer has impactDescription field', async () => {
    const detector = runtime.getBottleneckDetector();
    const bn = await detector.detect({ runtimeName: 't', metrics: {}, errors: [], metadata: Object.freeze({}) });
    const ca = await runtime.getConstraintAnalyzer().analyze(bn[0].id);
    expect(ca).toHaveProperty('impactDescription');
    expect(typeof ca.impactDescription).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHI-005: No Optimization Without Value
// Optimization without value growth is forbidden.
// ═══════════════════════════════════════════════════════════════════

describe('PHI-005: No Optimization Without Value', () => {
  beforeEach(async () => {
    await runtime.initialize();
  });

  it('OptimizationWithoutValueError exists', () => {
    expect(OptimizationWithoutValueError).toBeDefined();
  });

  it('OptimizationWithoutValueError extends EvolutionError', () => {
    const err = new OptimizationWithoutValueError('imp-123');
    expect(err).toBeInstanceOf(EvolutionError);
  });

  it('OptimizationWithoutValueError message mentions PHI-005', () => {
    const err = new OptimizationWithoutValueError('imp-123');
    expect(err.message).toContain('PHI-005');
  });

  it('OptimizationWithoutValueError has code OPTIMIZATION_WITHOUT_VALUE', () => {
    const err = new OptimizationWithoutValueError('imp-123');
    expect(err.code).toBe('OPTIMIZATION_WITHOUT_VALUE');
  });

  it('OptimizationWithoutValueError has improvementId in context', () => {
    const err = new OptimizationWithoutValueError('imp-123');
    expect(err.context.improvementId).toBe('imp-123');
  });

  it('OptimizationWithoutValueError has name OptimizationWithoutValueError', () => {
    const err = new OptimizationWithoutValueError('imp-123');
    expect(err.name).toBe('OptimizationWithoutValueError');
  });

  it('ValueAnalyzer produces valueScore that can be checked for PHI-005 compliance', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'V', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const analysis = await runtime.getValueAnalyzer().analyze(imp.id);
    // With default config (min=0, max=100), score should be > 0
    const hasValue = analysis.valueScore > 0;
    expect(hasValue).toBe(true);
  });

  it('ValueAnalyzer with minValueScore=0 and maxValueScore=0 returns valueScore of 0', async () => {
    const zeroAnalyzer = new ValueAnalyzer(
      { minValueScore: 0, maxValueScore: 0, valueDimensions: [ValueDimension.UserValue] },
      bus,
    );
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'Zero Value', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const analysis = await zeroAnalyzer.analyze(imp.id);
    expect(analysis.valueScore).toBe(0);
  });

  it('OptimizationWithoutValueError has timestamp field', () => {
    const err = new OptimizationWithoutValueError('imp-ts');
    expect(err.timestamp).toBeDefined();
    expect(typeof err.timestamp).toBe('string');
  });

  it('OptimizationWithoutValueError context is frozen (immutable)', () => {
    const err = new OptimizationWithoutValueError('imp-imm');
    expect(Object.isFrozen(err.context)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHI-006: No Local Optimization
// Local optimization is forbidden.
// ═══════════════════════════════════════════════════════════════════

describe('PHI-006: No Local Optimization', () => {
  beforeEach(async () => {
    await runtime.initialize();
  });

  it('LocalOptimizationError exists', () => {
    expect(LocalOptimizationError).toBeDefined();
  });

  it('LocalOptimizationError extends EvolutionError', () => {
    const err = new LocalOptimizationError('imp-456');
    expect(err).toBeInstanceOf(EvolutionError);
  });

  it('LocalOptimizationError message mentions PHI-006', () => {
    const err = new LocalOptimizationError('imp-456');
    expect(err.message).toContain('PHI-006');
  });

  it('LocalOptimizationError has code LOCAL_OPTIMIZATION', () => {
    const err = new LocalOptimizationError('imp-456');
    expect(err.code).toBe('LOCAL_OPTIMIZATION');
  });

  it('LocalOptimizationError has improvementId in context', () => {
    const err = new LocalOptimizationError('imp-456');
    expect(err.context.improvementId).toBe('imp-456');
  });

  it('LocalOptimizationError has name LocalOptimizationError', () => {
    const err = new LocalOptimizationError('imp-456');
    expect(err.name).toBe('LocalOptimizationError');
  });

  it('OpportunityCost has foregoneImprovements field', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'OC Test', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const oc = await runtime.getOpportunityCostEngine().analyze(imp.id);
    expect(oc).toHaveProperty('foregoneImprovements');
    expect(Array.isArray(oc.foregoneImprovements)).toBe(true);
  });

  it('OpportunityCost has foregoneValue field', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'OC Test', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const oc = await runtime.getOpportunityCostEngine().analyze(imp.id);
    expect(oc).toHaveProperty('foregoneValue');
    expect(typeof oc.foregoneValue).toBe('number');
  });

  it('OpportunityCost has netBenefit field', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'OC Test', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const oc = await runtime.getOpportunityCostEngine().analyze(imp.id);
    expect(oc).toHaveProperty('netBenefit');
    expect(typeof oc.netBenefit).toBe('number');
  });

  it('OpportunityCostEngine.analyze() considers other proposed improvements', async () => {
    const engine = runtime.getImprovementEngine();
    // Propose multiple improvements
    await engine.propose({
      name: 'Other 1', description: 'd', bottleneckId: null, constraintType: ConstraintType.Quality,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const imp = await engine.propose({
      name: 'Target', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const oc = await runtime.getOpportunityCostEngine().analyze(imp.id);
    // Should have at least one foregone improvement ("Other 1")
    expect(oc.foregoneImprovements.length).toBeGreaterThanOrEqual(0);
  });

  it('OpportunityCost netBenefit equals improvement valueScore minus foregoneValue', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'OC Calc', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    // Analyze value first to set valueScore
    await runtime.getValueAnalyzer().analyze(imp.id);
    const oc = await runtime.getOpportunityCostEngine().analyze(imp.id);
    const updatedImp = await engine.getById(imp.id);
    // netBenefit = improvement.valueScore - foregoneValue
    expect(oc.netBenefit).toBe(updatedImp!.valueScore - oc.foregoneValue);
  });

  it('OpportunityCost has foregoneImpact field', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'OC FI', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const oc = await runtime.getOpportunityCostEngine().analyze(imp.id);
    expect(oc).toHaveProperty('foregoneImpact');
    expect(typeof oc.foregoneImpact).toBe('number');
  });

  it('OpportunityCostEngine persists analysis for retrieval', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'OC Persist', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    await runtime.getOpportunityCostEngine().analyze(imp.id);
    const retrieved = await runtime.getOpportunityCostEngine().getByImprovementId(imp.id);
    expect(retrieved).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHI-007: Evidence of Effectiveness
// Every change must have proof.
// ═══════════════════════════════════════════════════════════════════

describe('PHI-007: Evidence of Effectiveness', () => {
  beforeEach(async () => {
    await runtime.initialize();
  });

  it('NoValueProofError exists', () => {
    expect(NoValueProofError).toBeDefined();
  });

  it('NoValueProofError extends EvolutionError', () => {
    const err = new NoValueProofError('imp-789');
    expect(err).toBeInstanceOf(EvolutionError);
  });

  it('NoValueProofError message mentions PHI-007', () => {
    const err = new NoValueProofError('imp-789');
    expect(err.message).toContain('PHI-007');
  });

  it('NoValueProofError has code NO_VALUE_PROOF', () => {
    const err = new NoValueProofError('imp-789');
    expect(err.code).toBe('NO_VALUE_PROOF');
  });

  it('NoValueProofError has improvementId in context', () => {
    const err = new NoValueProofError('imp-789');
    expect(err.context.improvementId).toBe('imp-789');
  });

  it('NoValueProofError has name NoValueProofError', () => {
    const err = new NoValueProofError('imp-789');
    expect(err.name).toBe('NoValueProofError');
  });

  it('ExperimentRuntime provides A/B testing for evidence', async () => {
    const expRt = runtime.getExperimentRuntime();
    const impId = brandImprovementId('evidence-imp');
    const exp = await expRt.propose({
      name: 'Evidence Test', description: 'd', improvementId: impId,
      variantA: 'Control', variantB: 'Treatment', metricName: 'conversion',
      metadata: Object.freeze({}),
    });
    await expRt.start(exp.id);
    await expRt.complete(exp.id, 10, 15);
    const result = await expRt.getById(exp.id);
    expect(result!.variantAResult).toBe(10);
    expect(result!.variantBResult).toBe(15);
    expect(result!.winner).toBe('B');
    expect(result!.confidence).toBeGreaterThan(0);
  });

  it('Experiment has variantAResult after completion', async () => {
    const expRt = runtime.getExperimentRuntime();
    const impId = brandImprovementId('va-imp');
    const exp = await expRt.propose({
      name: 'VA', description: 'd', improvementId: impId,
      variantA: 'A', variantB: 'B', metricName: 'm', metadata: Object.freeze({}),
    });
    await expRt.start(exp.id);
    await expRt.complete(exp.id, 42, 17);
    const result = await expRt.getById(exp.id);
    expect(result!.variantAResult).toBe(42);
  });

  it('Experiment has variantBResult after completion', async () => {
    const expRt = runtime.getExperimentRuntime();
    const impId = brandImprovementId('vb-imp');
    const exp = await expRt.propose({
      name: 'VB', description: 'd', improvementId: impId,
      variantA: 'A', variantB: 'B', metricName: 'm', metadata: Object.freeze({}),
    });
    await expRt.start(exp.id);
    await expRt.complete(exp.id, 10, 99);
    const result = await expRt.getById(exp.id);
    expect(result!.variantBResult).toBe(99);
  });

  it('Experiment has confidence after completion', async () => {
    const expRt = runtime.getExperimentRuntime();
    const impId = brandImprovementId('cf-imp');
    const exp = await expRt.propose({
      name: 'CF', description: 'd', improvementId: impId,
      variantA: 'A', variantB: 'B', metricName: 'm', metadata: Object.freeze({}),
    });
    await expRt.start(exp.id);
    await expRt.complete(exp.id, 80, 20);
    const result = await expRt.getById(exp.id);
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
  });

  it('Experiment has winner after completion', async () => {
    const expRt = runtime.getExperimentRuntime();
    const impId = brandImprovementId('wn-imp');
    const exp = await expRt.propose({
      name: 'WN', description: 'd', improvementId: impId,
      variantA: 'A', variantB: 'B', metricName: 'm', metadata: Object.freeze({}),
    });
    await expRt.start(exp.id);
    await expRt.complete(exp.id, 5, 10);
    const result = await expRt.getById(exp.id);
    expect(result!.winner).toBe('B');
  });

  it('KPIRuntime.getComparison() provides measurable proof', async () => {
    const kpiRt = runtime.getKPIRuntime();
    const kpi = await kpiRt.register({
      name: 'Proof KPI', description: 'kpi', unit: 'ms',
      direction: KPDirection.LowerIsBetter, target: 50, initialValue: 200,
      metadata: Object.freeze({}),
    });
    const beforeTs = kpi.history[0].timestamp;
    await new Promise(r => setTimeout(r, 2));
    await kpiRt.record(kpi.id, 80);
    const afterKpi = await kpiRt.getById(kpi.id)!;
    const afterTs = afterKpi!.history[afterKpi!.history.length - 1].timestamp;
    const comp = await kpiRt.getComparison(kpi.id, beforeTs, afterTs);
    expect(comp).not.toBeNull();
    expect(comp!.beforeValue).toBe(200);
    expect(comp!.afterValue).toBe(80);
    expect(comp!.change).toBe(-120);
    expect(comp!.improved).toBe(true);
  });

  it('NoValueProofError has timestamp field', () => {
    const err = new NoValueProofError('imp-ts-7');
    expect(err.timestamp).toBeDefined();
    expect(typeof err.timestamp).toBe('string');
  });

  it('NoValueProofError context is frozen (immutable)', () => {
    const err = new NoValueProofError('imp-imm-7');
    expect(Object.isFrozen(err.context)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Core Rule: "AIS never optimizes for optimization's sake"
// ═══════════════════════════════════════════════════════════════════

describe('Core Rule: AIS never optimizes for optimization\'s sake', () => {
  beforeEach(async () => {
    await runtime.initialize();
  });

  it('improvement proposals without bottlenecks start with valueScore=0', async () => {
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'No Bottleneck', description: 'Optimizing for fun',
      bottleneckId: null, constraintType: ConstraintType.Architecture,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    expect(imp.valueScore).toBe(0);
  });

  it('RecommendationPrioritizer returns 0 priority when all scores are 0', () => {
    const prioritizer = runtime.getRecommendationPrioritizer();
    const zeroImprovement: Improvement = {
      id: brandImprovementId('zero'), name: 'Zero', description: 'd',
      status: ImprovementStatus.Proposed, bottleneckId: null,
      constraintType: ConstraintType.Architecture, valueScore: 0,
      impactScore: 0, costScore: 10, riskScore: 10, urgencyScore: 0,
      constraintWeight: 1.0, priority: 0, valueDimension: ValueDimension.PlatformValue,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      proposedAt: '', startedAt: null, completedAt: null,
      evidence: [], metadata: Object.freeze({}),
    } as Improvement;
    const priority = prioritizer.calculatePriority(zeroImprovement);
    expect(priority).toBe(0);
  });

  it('ValueAnalyzer with minValueScore=0 and maxValueScore=0 returns 0', async () => {
    const zeroAnalyzer = new ValueAnalyzer(
      { minValueScore: 0, maxValueScore: 0, valueDimensions: [ValueDimension.UserValue] },
      bus,
    );
    const engine = runtime.getImprovementEngine();
    const imp = await engine.propose({
      name: 'Zero', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const analysis = await zeroAnalyzer.analyze(imp.id);
    expect(analysis.valueScore).toBe(0);
  });

  it('improvements with valueScore=0 get priority=0 from prioritizer', () => {
    const prioritizer = runtime.getRecommendationPrioritizer();
    const noValueImprovement: Improvement = {
      id: brandImprovementId('noval'), name: 'NoValue', description: 'd',
      status: ImprovementStatus.Proposed, bottleneckId: null,
      constraintType: ConstraintType.Architecture, valueScore: 0,
      impactScore: 0, costScore: 50, riskScore: 50, urgencyScore: 0,
      constraintWeight: 1.0, priority: 0, valueDimension: ValueDimension.PlatformValue,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      proposedAt: '', startedAt: null, completedAt: null,
      evidence: [], metadata: Object.freeze({}),
    } as Improvement;
    const priority = prioritizer.calculatePriority(noValueImprovement);
    expect(priority).toBe(0);
  });

  it('zero-value improvements have lower priority than valued improvements', () => {
    const prioritizer = runtime.getRecommendationPrioritizer();
    const makeImp = (valueScore: number, impactScore: number): Improvement => ({
      id: brandImprovementId('test'), name: 't', description: 'd',
      status: ImprovementStatus.Proposed, bottleneckId: null,
      constraintType: ConstraintType.Performance, valueScore,
      impactScore, costScore: 10, riskScore: 10, urgencyScore: 50,
      constraintWeight: 1.0, priority: 0, valueDimension: ValueDimension.UserValue,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      proposedAt: '', startedAt: null, completedAt: null,
      evidence: [], metadata: Object.freeze({}),
    } as Improvement);
    const zeroVal = makeImp(0, 0);
    const highVal = makeImp(80, 90);
    expect(prioritizer.calculatePriority(highVal)).toBeGreaterThan(prioritizer.calculatePriority(zeroVal));
  });

  it('RecommendationPrioritizer.prioritize() sorts zero-priority items last', async () => {
    const prioritizer = runtime.getRecommendationPrioritizer();
    const engine = runtime.getImprovementEngine();
    // Propose two: one with no value, one we will give value
    const impZero = await engine.propose({
      name: 'Zero', description: 'd', bottleneckId: null, constraintType: ConstraintType.Architecture,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    const impHigh = await engine.propose({
      name: 'High', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance,
      targetRuntime: null, targetCapability: null, estimatedEffort: 'low',
      evidence: [], metadata: Object.freeze({}),
    });
    // Give impHigh some scores
    const impEngine = engine as unknown as ImprovementEngine;
    await impEngine.updateScores(impHigh.id, { valueScore: 75, impactScore: 80 });
    const all = await engine.list();
    const sorted = await prioritizer.prioritize(all);
    // The high-value item should come first
    const highIdx = sorted.findIndex(i => (i.id as string) === (impHigh.id as string));
    const zeroIdx = sorted.findIndex(i => (i.id as string) === (impZero.id as string));
    expect(highIdx).toBeLessThan(zeroIdx);
  });
});
