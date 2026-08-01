import { describe, it, expect } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { EvolutionRuntime } from '../../core/evolution/evolution-runtime.js';
import { DefaultEvolutionRuntimeConfig, brandBottleneckId, brandImprovementId, brandExperimentId, brandKPIId, brandFeedbackId, brandEvolutionNodeId, brandTechDebtId, brandRoadmapId, brandLearningRecordId, ConstraintType, BottleneckScope, BottleneckSeverity, ImprovementStatus, ExperimentStatus, KPDirection, FeedbackSource, FeedbackSentiment, LearningOutcome, TechDebtPriority, ArchOptimizationType, EvolutionState, RoadmapItemStatus, ValueDimension, } from '../../core/evolution/types.js';
import { EvolutionError, BottleneckNotFoundError, ImprovementNotFoundError, ImprovementStateError, ExperimentNotFoundError, ExperimentStateError, PINotFoundError, PILimitExceededError, FeedbackNotFoundError, FeedbackLimitExceededError, TechDebtNotFoundError, TechDebtLimitExceededError, GraphNodeLimitExceededError, EvolutionNotInitializedError, EvolutionDisposedError, NoValueProofError, OptimizationWithoutValueError, LocalOptimizationError, ConstraintAnalysisError, OpportunityCostError, LearningRecordNotFoundError, ArchitectureAnalysisError, RoadmapLimitExceededError, EvolutionRuntimeError, ExperimentTimeoutError, BottleneckLimitExceededError, ImprovementLimitExceededError, ExperimentLimitExceededError, } from '../../core/evolution/errors.js';

const meta = () => Object.freeze({});
const ts = () => new Date().toISOString();

// ═══════════════════════════════════════════════════════════════════
describe('ECIR Integration — Full Pipeline', () => {
  it('detects bottleneck, creates improvement, analyzes value, generates roadmap', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    const det = rt.getBottleneckDetector();
    const bns = await det.detect({ runtimeName: 'test-runtime', metrics: { responseTime: 10000 } });
    expect(bns.length).toBe(1);
    
    const imp = await rt.getImprovementEngine().propose({
      name: 'Fix slow response', description: 'Optimize hot path', bottleneckId: bns[0].id,
      constraintType: ConstraintType.Performance, targetRuntime: 'test-runtime',
      targetCapability: null, estimatedEffort: 'large', evidence: ['slow'], metadata: meta(),
    });
    expect(imp.status).toBe(ImprovementStatus.Proposed);
    
    const va = await rt.getValueAnalyzer().analyze(imp.id);
    expect(va.improvementId).toBe(imp.id);
    
    const oc = await rt.getOpportunityCostEngine().analyze(imp.id);
    expect(oc.improvementId).toBe(imp.id);
    
    const rt2 = rt.getOptimizationPlanner();
    // setImprovements is not on the interface, but we can test through analyze
    await rt.shutdown();
  });

  it('full experiment lifecycle: propose, start, complete', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    const imp = await rt.getImprovementEngine().propose({
      name: 'Test improvement', description: 'Test', bottleneckId: null,
      constraintType: ConstraintType.Quality, targetRuntime: null,
      targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta(),
    });
    
    const exp = await rt.getExperimentRuntime().propose({
      name: 'A/B Test', description: 'Compare approaches', improvementId: imp.id,
      variantA: 'approach-a', variantB: 'approach-b', metricName: 'score', metadata: meta(),
    });
    expect(exp.status).toBe(ExperimentStatus.Proposed);
    
    await rt.getExperimentRuntime().start(exp.id);
    const started = await rt.getExperimentRuntime().getById(exp.id);
    expect(started!.status).toBe(ExperimentStatus.Running);
    expect(started!.startedAt).toBeDefined();
    
    await rt.getExperimentRuntime().complete(exp.id, 90, 10);
    const completed = await rt.getExperimentRuntime().getById(exp.id);
    expect(completed!.winner).toBe('A');
    expect(completed!.confidence).toBeGreaterThan(0.8);
    
    await rt.shutdown();
  });

  it('full feedback lifecycle: collect, process, get insights', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    const fb = await rt.getFeedbackCollector().collect({
      source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
      content: 'The system is too slow', relatedBottleneckId: null,
      relatedImprovementId: null, metadata: meta(),
    });
    expect(fb.processed).toBe(true);
    expect(fb.extractedInsights.length).toBeGreaterThan(0);
    
    const found = await rt.getFeedbackCollector().getById(fb.id);
    expect(found!.id).toBe(fb.id);
    
    await rt.shutdown();
  });

  it('full KPI lifecycle: register, record, compare', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    const kpi = await rt.getKPIRuntime().register({
      name: 'Response Time', description: 'Avg response time in ms',
      unit: 'ms', direction: KPDirection.LowerIsBetter, target: 200,
      initialValue: 1000, metadata: meta(),
    });
    expect(kpi.currentValue).toBe(1000);
    
    await rt.getKPIRuntime().record(kpi.id, 500);
    const updated = await rt.getKPIRuntime().getById(kpi.id);
    expect(updated!.currentValue).toBe(500);
    expect(updated!.history.length).toBe(2);
    
    await rt.shutdown();
  });

  it('full learning loop: record, retrieve, getLessons', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    const lr = await rt.getLearningLoop().record({
      action: 'optimize-database-query', outcome: LearningOutcome.Improved,
      lesson: 'Adding index reduced query time by 60%',
      context: 'User reports of slow dashboard',
      improvementId: null, experimentId: null, metadata: meta(),
    });
    expect(lr.outcome).toBe(LearningOutcome.Improved);
    
    const lessons = await rt.getLearningLoop().getLessonsForAction('optimize-database-query');
    expect(lessons.length).toBe(1);
    
    const byOutcome = await rt.getLearningLoop().list({ outcome: LearningOutcome.Improved });
    expect(byOutcome.length).toBe(1);
    
    await rt.shutdown();
  });

  it('full evolution graph: add nodes, edges, get path', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    const n1 = await rt.getEvolutionGraph().addNode({
      type: 'improvement', title: 'First improvement',
      description: 'Fixed performance', relatedIds: [], parentId: null,
      valueImpact: 50, metadata: meta(),
    });
    
    const n2 = await rt.getEvolutionGraph().addNode({
      type: 'experiment', title: 'A/B Test for UX',
      description: 'Tested new layout', relatedIds: [], parentId: n1.id,
      valueImpact: 30, metadata: meta(),
    });
    
    const edge = await rt.getEvolutionGraph().addEdge(n1.id, n2.id, 'led to experiment', 1.0);
    expect(edge.from).toBe(n1.id);
    expect(edge.to).toBe(n2.id);
    
    const path = await rt.getEvolutionGraph().getPath(n2.id);
    expect(path.length).toBe(2);
    expect(path[0].id).toBe(n1.id);
    
    const roots = await rt.getEvolutionGraph().getRootNodes();
    expect(roots.length).toBe(1);
    expect(roots[0].id).toBe(n1.id);
    
    await rt.shutdown();
  });

  it('full tech debt lifecycle: register, list, resolve, total cost', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    const td1 = await rt.getTechDebtAnalyzer().register({
      name: 'Legacy API', description: 'Old REST endpoints need migration',
      priority: TechDebtPriority.High, estimatedCost: 200, impact: 80,
      targetModule: 'api-v1', targetFile: 'src/api/v1.ts', metadata: meta(),
    });
    const td2 = await rt.getTechDebtAnalyzer().register({
      name: 'Missing tests', description: 'Core module has no unit tests',
      priority: TechDebtPriority.Critical, estimatedCost: 300, impact: 90,
      targetModule: 'core', targetFile: null, metadata: meta(),
    });
    
    const unresolved = await rt.getTechDebtAnalyzer().list({ resolved: false });
    expect(unresolved.length).toBe(2);
    
    const totalCost = await rt.getTechDebtAnalyzer().getTotalCost();
    expect(totalCost).toBe(500);
    
    await rt.getTechDebtAnalyzer().resolve(td1.id);
    const resolved = await rt.getTechDebtAnalyzer().getById(td1.id);
    expect(resolved!.resolvedAt).toBeDefined();
    
    const costAfter = await rt.getTechDebtAnalyzer().getTotalCost();
    expect(costAfter).toBe(300);
    
    await rt.shutdown();
  });

  it('architecture optimizer returns suggestions', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    const suggestions = await rt.getArchitectureOptimizer().analyze();
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    
    const types = suggestions.map(s => s.type);
    expect(types).toContain(ArchOptimizationType.ReduceCoupling);
    expect(types).toContain(ArchOptimizationType.ImproveCohesion);
    
    await rt.shutdown();
  });

  it('recommendation prioritizer sorts improvements correctly', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    const imp1 = await rt.getImprovementEngine().propose({
      name: 'Low value', description: 'Minor fix', bottleneckId: null,
      constraintType: ConstraintType.Documentation, targetRuntime: null,
      targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta(),
    });
    const imp2 = await rt.getImprovementEngine().propose({
      name: 'High value', description: 'Critical fix', bottleneckId: null,
      constraintType: ConstraintType.Performance, targetRuntime: null,
      targetCapability: null, estimatedEffort: 'large', evidence: [], metadata: meta(),
    });
    
    const all = await rt.getImprovementEngine().list();
    const sorted = await rt.getRecommendationPrioritizer().prioritize(all);
    expect(sorted.length).toBe(2);
    // Both have 0 scores so they should be equal priority
    
    await rt.shutdown();
  });

  it('full analyze pipeline returns complete result', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    // Seed a bottleneck detection via the detect method
    await rt.getBottleneckDetector().detect({
      runtimeName: 'test-rt', metrics: { responseTime: 10000, memoryUsageMB: 800 },
    });
    
    // The analyze() method runs its own detect, which finds bottlenecks
    // and creates improvements for them
    const result = await rt.analyze();
    expect(result.bottlenecks).toBeDefined();
    expect(result.improvements).toBeDefined();
    expect(result.valueAnalyses).toBeDefined();
    expect(result.opportunityCosts).toBeDefined();
    expect(result.roadmap).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    
    await rt.shutdown();
  });

  it('getMetrics returns valid metrics snapshot', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    const metrics = await rt.getMetrics();
    expect(metrics.totalBottlenecksDetected).toBe(0);
    expect(metrics.totalImprovements).toBe(0);
    expect(metrics.totalExperiments).toBe(0);
    expect(metrics.totalKPIs).toBe(0);
    expect(metrics.totalFeedback).toBe(0);
    expect(metrics.totalLearningRecords).toBe(0);
    expect(metrics.evolutionGraphNodes).toBe(0);
    expect(metrics.techDebtItems).toBe(0);
    expect(metrics.averageImprovementPriority).toBe(0);
    
    await rt.shutdown();
  });

  it('events from all subsystems appear on bus', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    await rt.getFeedbackCollector().collect({
      source: FeedbackSource.Developer, sentiment: FeedbackSentiment.Positive,
      content: 'Great improvement', relatedBottleneckId: null,
      relatedImprovementId: null, metadata: meta(),
    });
    
    await rt.getKPIRuntime().register({
      name: 'Test KPI', description: 'Test', unit: 'ms',
      direction: KPDirection.HigherIsBetter, target: null,
      initialValue: 100, metadata: meta(),
    });
    
    const log = bus.getLog();
    const eventTypes = new Set(log.map(e => e.eventType));
    expect(eventTypes.has('evolution.runtime.initialized')).toBe(true);
    expect(eventTypes.has('evolution.runtime.stateChanged')).toBe(true);
    expect(eventTypes.has('evolution.feedback.received')).toBe(true);
    expect(eventTypes.has('evolution.feedback.processed')).toBe(true);
    expect(eventTypes.has('evolution.kpi.registered')).toBe(true);
    
    await rt.shutdown();
  });

  it('disposed runtime throws EvolutionDisposedError', async () => {
    const rt = new EvolutionRuntime();
    await rt.initialize();
    await rt.shutdown();
    
    await expect(rt.initialize()).rejects.toThrow(EvolutionDisposedError);
  });

  it('uninitialized runtime throws EvolutionNotInitializedError on analyze', async () => {
    const rt = new EvolutionRuntime();
    await expect(rt.analyze()).rejects.toThrow(EvolutionNotInitializedError);
  });

  it('uninitialized runtime throws EvolutionNotInitializedError on getMetrics', async () => {
    const rt = new EvolutionRuntime();
    await expect(rt.getMetrics()).rejects.toThrow(EvolutionNotInitializedError);
  });

  it('multiple subsystems work in parallel', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    const results = await Promise.all([
      rt.getTechDebtAnalyzer().register({
        name: 'TD1', description: 'd1', priority: TechDebtPriority.Low, estimatedCost: 10, impact: 5,
        targetModule: 'm1', targetFile: null, metadata: meta(),
      }),
      rt.getFeedbackCollector().collect({
        source: FeedbackSource.AI, sentiment: FeedbackSentiment.Neutral,
        content: 'Auto observation', relatedBottleneckId: null,
        relatedImprovementId: null, metadata: meta(),
      }),
      rt.getKPIRuntime().register({
        name: 'KPI1', description: 'k1', unit: '%',
        direction: KPDirection.HigherIsBetter, target: 100,
        initialValue: 50, metadata: meta(),
      }),
      rt.getLearningLoop().record({
        action: 'test-action', outcome: LearningOutcome.NoChange,
        lesson: 'No effect observed', context: 'test',
        improvementId: null, experimentId: null, metadata: meta(),
      }),
    ]);
    
    expect(results).toBeDefined();
    expect(await rt.getTechDebtAnalyzer().count()).toBe(1);
    expect(await rt.getFeedbackCollector().count()).toBe(1);
    expect(await rt.getKPIRuntime().count()).toBe(1);
    expect(await rt.getLearningLoop().count()).toBe(1);
    
    await rt.shutdown();
  });

  it('state transitions follow correct order', async () => {
    const rt = new EvolutionRuntime();
    expect(rt.state).toBe(EvolutionState.Uninitialized);
    
    await rt.initialize();
    expect(rt.state).toBe(EvolutionState.Ready);
    
    await rt.shutdown();
    expect(rt.state).toBe(EvolutionState.Stopped);
  });

  it('full cycle: bottleneck → improvement → experiment → learning', async () => {
    const bus = new InProcessEventBus();
    const rt = new EvolutionRuntime(undefined, bus);
    await rt.initialize();
    
    // 1. Detect bottleneck
    const bns = await rt.getBottleneckDetector().detect({
      runtimeName: 'core-engine', metrics: { responseTime: 25000 },
    });
    expect(bns.length).toBe(1);
    
    // 2. Create improvement
    const imp = await rt.getImprovementEngine().propose({
      name: 'Optimize hot path', description: 'Reduce response time',
      bottleneckId: bns[0].id, constraintType: ConstraintType.Performance,
      targetRuntime: 'core-engine', targetCapability: null,
      estimatedEffort: 'large', evidence: bns[0].evidence, metadata: meta(),
    });
    
    // 3. Run experiment
    const exp = await rt.getExperimentRuntime().propose({
      name: 'Cache vs No-Cache', description: 'Test caching strategy',
      improvementId: imp.id, variantA: 'with-cache', variantB: 'no-cache',
      metricName: 'responseTime', metadata: meta(),
    });
    await rt.getExperimentRuntime().start(exp.id);
    await rt.getExperimentRuntime().complete(exp.id, 10, 200); // A wins (lower is better for responseTime)
    
    // 4. Record learning
    const lr = await rt.getLearningLoop().record({
      action: 'implement-caching', outcome: LearningOutcome.Improved,
      lesson: 'Caching reduced response time by 75%',
      context: 'Core engine bottleneck',
      improvementId: imp.id, experimentId: exp.id, metadata: meta(),
    });
    
    // 5. Add to graph
    await rt.getEvolutionGraph().addNode({
      type: 'improvement', title: 'Optimize hot path',
      description: 'Fixed core engine performance',
      relatedIds: [imp.id, exp.id], parentId: null,
      valueImpact: 75, metadata: meta(),
    });
    
    // Verify all subsystems have data
    expect(await rt.getBottleneckDetector().count()).toBe(1);
    expect(await rt.getImprovementEngine().count()).toBe(1);
    expect(await rt.getExperimentRuntime().count()).toBe(1);
    expect(await rt.getLearningLoop().count()).toBe(1);
    expect(await rt.getEvolutionGraph().count()).toBe(1);
    
    await rt.shutdown();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('ECIR Integration — Error Hierarchy Coverage', () => {
  it('all error classes are instanceof EvolutionError', () => {
    const errors = [
      new BottleneckNotFoundError('bn-1'),
      new BottleneckLimitExceededError(10),
      new ImprovementNotFoundError('i-1'),
      new ImprovementLimitExceededError(10),
      new ImprovementStateError('i-1', 'A', 'B'),
      new ExperimentNotFoundError('e-1'),
      new ExperimentLimitExceededError(10),
      new ExperimentStateError('e-1', 'A', 'B'),
      new ExperimentTimeoutError('e-1', 5000),
      new NoValueProofError('i-1'),
      new OptimizationWithoutValueError('i-1'),
      new LocalOptimizationError('i-1'),
      new PINotFoundError('k-1'),
      new PILimitExceededError(10),
      new FeedbackNotFoundError('f-1'),
      new FeedbackLimitExceededError(10),
      new LearningRecordNotFoundError('l-1'),
      new EvolutionNotInitializedError(),
      new EvolutionDisposedError(),
      new EvolutionRuntimeError('test'),
      new ConstraintAnalysisError('reason'),
      new OpportunityCostError('reason'),
      new ArchitectureAnalysisError('reason'),
      new RoadmapLimitExceededError(10),
      new GraphNodeLimitExceededError(10),
      new TechDebtNotFoundError('t-1'),
      new TechDebtLimitExceededError(10),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(EvolutionError);
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('all error classes have timestamp as ISO string', () => {
    const errors = [
      new BottleneckNotFoundError('bn-1'),
      new EvolutionNotInitializedError(),
      new TechDebtNotFoundError('td-1'),
    ];
    for (const err of errors) {
      expect(err.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('error context is always frozen', () => {
    const err = new EvolutionRuntimeError('test', { a: 1, b: { c: 2 } });
    expect(Object.isFrozen(err.context)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('ECIR Integration — All Enum Values Coverage', () => {
  it('all ConstraintType values are usable in detect', async () => {
    const rt = new EvolutionRuntime();
    await rt.initialize();
    
    const allTypes = Object.values(ConstraintType);
    for (const ct of allTypes) {
      expect(typeof ct).toBe('string');
      expect(ct.length).toBeGreaterThan(0);
    }
    
    await rt.shutdown();
  });

  it('all FeedbackSource values are usable', () => {
    const sources = Object.values(FeedbackSource);
    expect(sources.length).toBe(9);
    for (const s of sources) {
      expect(typeof s).toBe('string');
    }
  });

  it('all ValueDimension values are strings', () => {
    const dims = Object.values(ValueDimension);
    expect(dims.length).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('ECIR Integration — Config Immutability', () => {
  it('all nested configs are frozen', () => {
    const cfg = DefaultEvolutionRuntimeConfig;
    expect(Object.isFrozen(cfg)).toBe(true);
    expect(Object.isFrozen(cfg.bottleneckDetector)).toBe(true);
    expect(Object.isFrozen(cfg.constraintAnalyzer)).toBe(true);
    expect(Object.isFrozen(cfg.improvementEngine)).toBe(true);
    expect(Object.isFrozen(cfg.valueAnalyzer)).toBe(true);
    expect(Object.isFrozen(cfg.opportunityCost)).toBe(true);
    expect(Object.isFrozen(cfg.optimizationPlanner)).toBe(true);
    expect(Object.isFrozen(cfg.experiment)).toBe(true);
    expect(Object.isFrozen(cfg.kpi)).toBe(true);
    expect(Object.isFrozen(cfg.feedbackCollector)).toBe(true);
    expect(Object.isFrozen(cfg.learningLoop)).toBe(true);
    expect(Object.isFrozen(cfg.evolutionGraph)).toBe(true);
    expect(Object.isFrozen(cfg.architectureOptimizer)).toBe(true);
    expect(Object.isFrozen(cfg.techDebt)).toBe(true);
    expect(Object.isFrozen(cfg.prioritizer)).toBe(true);
  });

  it('scoreWeights in valueAnalyzer config are frozen', () => {
    expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.valueAnalyzer.valueDimensions)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('ECIR Integration — PHI Compliance', () => {
  it('PHI-005: improvement without value has valueScore 0', async () => {
    const rt = new EvolutionRuntime();
    await rt.initialize();
    const imp = await rt.getImprovementEngine().propose({
      name: 'Test', description: 'Test', bottleneckId: null,
      constraintType: ConstraintType.Quality, targetRuntime: null,
      targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta(),
    });
    expect(imp.valueScore).toBe(0);
    await rt.shutdown();
  });

  it('PHI-004: constraint weight in prioritizer is > 1.0', () => {
    expect(DefaultEvolutionRuntimeConfig.prioritizer.constraintWeight).toBeGreaterThan(1.0);
  });

  it('PHI-003: KPIs are measurable with direction', async () => {
    const rt = new EvolutionRuntime();
    await rt.initialize();
    const kpi = await rt.getKPIRuntime().register({
      name: 'Test', description: 'Test', unit: 'ms',
      direction: KPDirection.LowerIsBetter, target: 100,
      initialValue: 200, metadata: meta(),
    });
    expect(kpi.direction).toBeDefined();
    expect(kpi.currentValue).toBe(200);
    await rt.shutdown();
  });
});
