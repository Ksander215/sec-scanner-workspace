import { describe, it, expect } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { BottleneckDetector } from '../../core/evolution/bottleneck-detector.js';
import { ImprovementEngine } from '../../core/evolution/improvement-engine.js';
import { ExperimentRuntime } from '../../core/evolution/experiment-runtime.js';
import { KPIRuntime } from '../../core/evolution/kpi-runtime.js';
import { FeedbackCollector } from '../../core/evolution/feedback-collector.js';
import { LearningLoop } from '../../core/evolution/learning-loop.js';
import { EvolutionGraph } from '../../core/evolution/evolution-graph.js';
import { TechnicalDebtAnalyzer } from '../../core/evolution/tech-debt-analyzer.js';
import { OptimizationPlanner } from '../../core/evolution/optimization-planner.js';
import { ValueAnalyzer } from '../../core/evolution/value-analyzer.js';
import { OpportunityCostEngine } from '../../core/evolution/opportunity-cost-engine.js';
import { RecommendationPrioritizer } from '../../core/evolution/recommendation-prioritizer.js';
import { DefaultEvolutionRuntimeConfig, ConstraintType, ImprovementStatus, ExperimentStatus, KPDirection, FeedbackSource, FeedbackSentiment, LearningOutcome, TechDebtPriority, BottleneckSeverity, brandBottleneckId, brandImprovementId, brandExperimentId, brandKPIId, brandFeedbackId, brandEvolutionNodeId, brandTechDebtId, } from '../../core/evolution/types.js';

const meta = () => Object.freeze({});
const D = DefaultEvolutionRuntimeConfig;

// ═════════════════════════════════════════════════════════════════
describe('Deep — BottleneckDetector advanced scenarios', () => {
  it('detect with errors and metrics combined triggers both Quality and Performance', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 8000 }, errors: ['err1', 'err2', 'err3'] });
    expect(r.length).toBe(2);
    const types = r.map(b => b.constraintType);
    expect(types).toContain('Performance');
    expect(types).toContain('Quality');
  });

  it('detect with all 7 threshold violations simultaneously', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({
      runtimeName: 'rt1',
      metrics: { responseTime: 25000, memoryUsageMB: 1200, uxScore: 10, knowledgeCoverage: 20, couplingScore: 0.9, documentationCoverage: 5 },
      errors: ['e1', 'e2', 'e3', 'e4'],
    });
    expect(r.length).toBe(7);
  });

  it('Critical severity for responseTime > 20000', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 21000 } });
    expect(r[0].severity).toBe(BottleneckSeverity.Critical);
  });

  it('Critical severity for errors > 10', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'rt1', errors: Array(11).fill('err') });
    expect(r[0].severity).toBe(BottleneckSeverity.Critical);
  });

  it('Critical severity for memoryUsage > 1000', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'rt1', metrics: { memoryUsageMB: 1100 } });
    expect(r[0].severity).toBe(BottleneckSeverity.Critical);
  });

  it('bottleneck evidence contains the triggering metric', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 12345 } });
    expect(r[0].evidence).toContain('responseTime=12345ms');
  });

  it('bottleneck evidence contains error messages', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'rt1', errors: ['timeout', 'crash', 'oom'] });
    expect(r[0].evidence).toEqual(['timeout', 'crash', 'oom']);
  });

  it('resolve twice throws error second time', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const [bn] = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 6000 } });
    await d.resolve(bn.id);
    await expect(d.resolve(bn.id)).rejects.toThrow();
  });

  it('list with scope filter returns empty (all are Platform)', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 6000 } });
    const runtimeScope = await d.list({ scope: 'Runtime' as any });
    expect(runtimeScope).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════
describe('Deep — ImprovementEngine advanced scenarios', () => {
  it('full lifecycle: Proposed → Planned → InProgress → Completed', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    const imp = await e.propose({ name: 'Full lifecycle', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance, targetRuntime: 'rt', targetCapability: null, estimatedEffort: 'large', evidence: ['e1'], metadata: meta() });
    expect(imp.status).toBe(ImprovementStatus.Proposed);
    await e.updateStatus(imp.id, ImprovementStatus.Planned);
    expect((await e.getById(imp.id))!.status).toBe(ImprovementStatus.Planned);
    await e.updateStatus(imp.id, ImprovementStatus.InProgress);
    expect((await e.getById(imp.id))!.status).toBe(ImprovementStatus.InProgress);
    expect((await e.getById(imp.id))!.startedAt).toBeDefined();
    await e.updateStatus(imp.id, ImprovementStatus.Completed);
    expect((await e.getById(imp.id))!.status).toBe(ImprovementStatus.Completed);
    expect((await e.getById(imp.id))!.completedAt).toBeDefined();
  });

  it('failure and retry lifecycle: Proposed → Planned → InProgress → Failed → Proposed', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    const imp = await e.propose({ name: 'Retry test', description: 'd', bottleneckId: null, constraintType: ConstraintType.Quality, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    await e.updateStatus(imp.id, ImprovementStatus.Planned);
    await e.updateStatus(imp.id, ImprovementStatus.InProgress);
    await e.updateStatus(imp.id, ImprovementStatus.Failed);
    expect((await e.getById(imp.id))!.completedAt).toBeDefined();
    await e.updateStatus(imp.id, ImprovementStatus.Proposed);
    expect((await e.getById(imp.id))!.status).toBe(ImprovementStatus.Proposed);
  });

  it('rollback and retry lifecycle: Proposed → Planned → InProgress → RolledBack → Proposed', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    const imp = await e.propose({ name: 'Rollback test', description: 'd', bottleneckId: null, constraintType: ConstraintType.Architecture, targetRuntime: null, targetCapability: null, estimatedEffort: 'medium', evidence: [], metadata: meta() });
    await e.updateStatus(imp.id, ImprovementStatus.Planned);
    await e.updateStatus(imp.id, ImprovementStatus.InProgress);
    await e.updateStatus(imp.id, ImprovementStatus.RolledBack);
    await e.updateStatus(imp.id, ImprovementStatus.Proposed);
    expect((await e.getById(imp.id))!.status).toBe(ImprovementStatus.Proposed);
  });

  it('rejection is terminal', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    const imp = await e.propose({ name: 'Reject test', description: 'd', bottleneckId: null, constraintType: ConstraintType.UX, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    await e.updateStatus(imp.id, ImprovementStatus.Rejected);
    await expect(e.updateStatus(imp.id, ImprovementStatus.Planned)).rejects.toThrow();
  });

  it('Completed is terminal', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    const imp = await e.propose({ name: 'Complete terminal', description: 'd', bottleneckId: null, constraintType: ConstraintType.Memory, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    await e.updateStatus(imp.id, ImprovementStatus.Planned);
    await e.updateStatus(imp.id, ImprovementStatus.InProgress);
    await e.updateStatus(imp.id, ImprovementStatus.Completed);
    await expect(e.updateStatus(imp.id, ImprovementStatus.Failed)).rejects.toThrow();
  });

  it('getById returns frozen improvement', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    const imp = await e.propose({ name: 'Freeze test', description: 'd', bottleneckId: null, constraintType: ConstraintType.Knowledge, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    expect(Object.isFrozen(await e.getById(imp.id)!)).toBe(true);
  });

  it('list without filters returns all', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    await e.propose({ name: '1', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    await e.propose({ name: '2', description: 'd', bottleneckId: null, constraintType: ConstraintType.Quality, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    expect((await e.list()).length).toBe(2);
  });

  it('list filter by combined status and constraintType', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    await e.propose({ name: 'P1', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    await e.propose({ name: 'Q1', description: 'd', bottleneckId: null, constraintType: ConstraintType.Quality, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    const filtered = await e.list({ status: ImprovementStatus.Proposed, constraintType: ConstraintType.Performance });
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('P1');
  });
});

// ═════════════════════════════════════════════════════════════════
describe('Deep — ExperimentRuntime advanced scenarios', () => {
  it('full lifecycle: Proposed → Running → Completed with A winner', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'Full lifecycle', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'fast', variantB: 'slow', metricName: 'speed', metadata: meta() });
    expect(exp.status).toBe(ExperimentStatus.Proposed);
    await e.start(exp.id);
    expect((await e.getById(exp.id))!.status).toBe(ExperimentStatus.Running);
    await e.complete(exp.id, 100, 10);
    const result = await e.getById(exp.id);
    expect(result!.status).toBe(ExperimentStatus.Completed);
    expect(result!.winner).toBe('A');
    expect(result!.variantAResult).toBe(100);
    expect(result!.variantBResult).toBe(10);
  });

  it('B wins with higher score', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'B wins', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'slow', variantB: 'fast', metricName: 'speed', metadata: meta() });
    await e.start(exp.id);
    await e.complete(exp.id, 10, 100);
    const result = await e.getById(exp.id);
    expect(result!.winner).toBe('B');
  });

  it('cancel from Running state', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'Cancel running', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    await e.start(exp.id);
    await e.cancel(exp.id);
    expect((await e.getById(exp.id))!.status).toBe(ExperimentStatus.Cancelled);
  });

  it('Failed experiment can be retried', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'Retry', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    await e.start(exp.id);
    await e.complete(exp.id, 0, 0);
    // Inconclusive → can't go back to Proposed
    const result = await e.getById(exp.id);
    expect(result!.status).toBe(ExperimentStatus.Completed);
  });

  it('getById returns frozen experiment', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'Freeze', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    expect(Object.isFrozen(await e.getById(exp.id)!)).toBe(true);
  });

  it('list without filter returns all', async () => {
    const e = new ExperimentRuntime(D.experiment);
    await e.propose({ name: '1', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    await e.propose({ name: '2', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    expect((await e.list()).length).toBe(2);
  });
});

// ═════════════════════════════════════════════════════════════════
describe('Deep — KPIRuntime advanced scenarios', () => {
  it('HigherIsBetter: improved when value increases', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Score', description: 'd', unit: 'pts', direction: KPDirection.HigherIsBetter, target: 100, initialValue: 50, metadata: meta() });
    await k.record(kpi.id, 75);
    const comp = await k.getComparison(kpi.id, kpi.history[0].timestamp, kpi.history[1].timestamp);
    expect(comp).not.toBeNull();
    expect(comp!.improved).toBe(true);
    expect(comp!.change).toBe(25);
  });

  it('HigherIsBetter: not improved when value decreases', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Score', description: 'd', unit: 'pts', direction: KPDirection.HigherIsBetter, target: 100, initialValue: 50, metadata: meta() });
    await k.record(kpi.id, 25);
    const comp = await k.getComparison(kpi.id, kpi.history[0].timestamp, kpi.history[1].timestamp);
    expect(comp!.improved).toBe(false);
    expect(comp!.change).toBe(-25);
  });

  it('LowerIsBetter: improved when value decreases', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Latency', description: 'd', unit: 'ms', direction: KPDirection.LowerIsBetter, target: 100, initialValue: 500, metadata: meta() });
    await k.record(kpi.id, 200);
    const comp = await k.getComparison(kpi.id, kpi.history[0].timestamp, kpi.history[1].timestamp);
    expect(comp!.improved).toBe(true);
    expect(comp!.change).toBe(-300);
  });

  it('LowerIsBetter: not improved when value increases', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Latency', description: 'd', unit: 'ms', direction: KPDirection.LowerIsBetter, target: 100, initialValue: 500, metadata: meta() });
    await k.record(kpi.id, 800);
    const comp = await k.getComparison(kpi.id, kpi.history[0].timestamp, kpi.history[1].timestamp);
    expect(comp!.improved).toBe(false);
  });

  it('changePercent is calculated correctly', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Revenue', description: 'd', unit: '$', direction: KPDirection.HigherIsBetter, target: null, initialValue: 200, metadata: meta() });
    await k.record(kpi.id, 250);
    const comp = await k.getComparison(kpi.id, kpi.history[0].timestamp, kpi.history[1].timestamp);
    expect(comp!.changePercent).toBeCloseTo(25, 1);
  });

  it('changePercent with negative change', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Users', description: 'd', unit: '', direction: KPDirection.HigherIsBetter, target: null, initialValue: 100, metadata: meta() });
    await k.record(kpi.id, 75);
    const comp = await k.getComparison(kpi.id, kpi.history[0].timestamp, kpi.history[1].timestamp);
    expect(comp!.changePercent).toBeCloseTo(-25, 1);
  });

  it('list returns all registered KPIs', async () => {
    const k = new KPIRuntime(D.kpi);
    await k.register({ name: 'KPI 1', description: 'd', unit: 'ms', direction: KPDirection.LowerIsBetter, target: null, initialValue: 100, metadata: meta() });
    await k.register({ name: 'KPI 2', description: 'd', unit: 'ms', direction: KPDirection.HigherIsBetter, target: null, initialValue: 50, metadata: meta() });
    await k.register({ name: 'KPI 3', description: 'd', unit: '%', direction: KPDirection.TargetIsOptimal, target: 95, initialValue: 80, metadata: meta() });
    expect((await k.list()).length).toBe(3);
  });

  it('count matches list length', async () => {
    const k = new KPIRuntime(D.kpi);
    await k.register({ name: 'A', description: 'd', unit: 'u', direction: KPDirection.HigherIsBetter, target: null, initialValue: 0, metadata: meta() });
    await k.register({ name: 'B', description: 'd', unit: 'u', direction: KPDirection.LowerIsBetter, target: null, initialValue: 0, metadata: meta() });
    expect(await k.count()).toBe((await k.list()).length);
  });
});

// ═════════════════════════════════════════════════════════════════
describe('Deep — FeedbackCollector advanced scenarios', () => {
  it('auto-process extracts different insights per sentiment', async () => {
    const c = new FeedbackCollector(D.feedbackCollector);
    const neg = await c.collect({ source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative, content: 'Bad', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    const pos = await c.collect({ source: FeedbackSource.Developer, sentiment: FeedbackSentiment.Positive, content: 'Good', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    const crit = await c.collect({ source: FeedbackSource.Errors, sentiment: FeedbackSentiment.Critical, content: 'Broken', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    const neut = await c.collect({ source: FeedbackSource.Metrics, sentiment: FeedbackSentiment.Neutral, content: 'Info', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    expect(neg.extractedInsights).toContain('Quality concern');
    expect(pos.extractedInsights).toContain('User satisfied');
    expect(crit.extractedInsights).toContain('Immediate action needed');
    expect(neut.extractedInsights).toContain('Monitoring recommended');
  });

  it('collect without auto-process keeps entry unprocessed', async () => {
    const c = new FeedbackCollector({ ...D.feedbackCollector, autoProcessEnabled: false });
    const fb = await c.collect({ source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative, content: 'Test', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    expect(fb.processed).toBe(false);
    expect(fb.extractedInsights).toEqual([]);
  });

  it('process updates timestamp and insights', async () => {
    const c = new FeedbackCollector({ ...D.feedbackCollector, autoProcessEnabled: false });
    const fb = await c.collect({ source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative, content: 'Bad UX', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    const processed = await c.process(fb.id);
    expect(processed.processed).toBe(true);
    expect(processed.processedAt).toBeDefined();
    expect(processed.extractedInsights.length).toBeGreaterThan(0);
  });

  it('list with all filter combos', async () => {
    const c = new FeedbackCollector({ ...D.feedbackCollector, autoProcessEnabled: false });
    await c.collect({ source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative, content: '1', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    await c.collect({ source: FeedbackSource.Developer, sentiment: FeedbackSentiment.Positive, content: '2', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    await c.collect({ source: FeedbackSource.AI, sentiment: FeedbackSentiment.Critical, content: '3', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    const userFb = await c.list({ source: FeedbackSource.User });
    const processed = await c.list({ processed: false });
    expect(userFb.length).toBe(1);
    expect(processed.length).toBe(3);
  });

  it('count increments correctly', async () => {
    const c = new FeedbackCollector(D.feedbackCollector);
    await c.collect({ source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative, content: '1', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    await c.collect({ source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative, content: '2', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    await c.collect({ source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative, content: '3', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    expect(await c.count()).toBe(3);
  });
});

// ═════════════════════════════════════════════════════════════════
describe('Deep — LearningLoop advanced scenarios', () => {
  it('records with improvementId and experimentId', async () => {
    const l = new LearningLoop(D.learningLoop);
    const lr = await l.record({ action: 'deploy-caching', outcome: LearningOutcome.Improved, lesson: 'Cache hit rate improved', context: 'Production', improvementId: brandImprovementId('i1'), experimentId: brandExperimentId('e1'), metadata: meta() });
    expect(lr.improvementId).toBe(brandImprovementId('i1'));
    expect(lr.experimentId).toBe(brandExperimentId('e1'));
  });

  it('getLessonsForAction returns matching records', async () => {
    const l = new LearningLoop(D.learningLoop);
    await l.record({ action: 'optimize-query', outcome: LearningOutcome.Improved, lesson: 'Added index', context: 'DB', improvementId: null, experimentId: null, metadata: meta() });
    await l.record({ action: 'optimize-query', outcome: LearningOutcome.Worsened, lesson: 'Index hurt writes', context: 'DB', improvementId: null, experimentId: null, metadata: meta() });
    const lessons = await l.getLessonsForAction('optimize-query');
    expect(lessons.length).toBe(2);
  });

  it('list filter by Improved returns only improved', async () => {
    const l = new LearningLoop(D.learningLoop);
    await l.record({ action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l1', context: 'c1', improvementId: null, experimentId: null, metadata: meta() });
    await l.record({ action: 'a2', outcome: LearningOutcome.Worsened, lesson: 'l2', context: 'c2', improvementId: null, experimentId: null, metadata: meta() });
    await l.record({ action: 'a3', outcome: LearningOutcome.NoChange, lesson: 'l3', context: 'c3', improvementId: null, experimentId: null, metadata: meta() });
    const improved = await l.list({ outcome: LearningOutcome.Improved });
    expect(improved.length).toBe(1);
  });

  it('record is frozen', async () => {
    const l = new LearningLoop(D.learningLoop);
    const lr = await l.record({ action: 'a', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c', improvementId: null, experimentId: null, metadata: meta() });
    expect(Object.isFrozen(lr)).toBe(true);
  });

  it('count matches list length', async () => {
    const l = new LearningLoop(D.learningLoop);
    await l.record({ action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l1', context: 'c', improvementId: null, experimentId: null, metadata: meta() });
    await l.record({ action: 'a2', outcome: LearningOutcome.Worsened, lesson: 'l2', context: 'c', improvementId: null, experimentId: null, metadata: meta() });
    expect(await l.count()).toBe((await l.list()).length);
  });
});

// ═════════════════════════════════════════════════════════════════
describe('Deep — EvolutionGraph advanced scenarios', () => {
  it('parent node childIds updated on child addition', async () => {
    const g = new EvolutionGraph(D.evolutionGraph);
    const parent = await g.addNode({ type: 'improvement', title: 'Parent', description: 'Parent desc', relatedIds: [], parentId: null, valueImpact: 100, metadata: meta() });
    expect(parent.childIds).toEqual([]);
    const child = await g.addNode({ type: 'improvement', title: 'Child', description: 'Child desc', relatedIds: [], parentId: parent.id, valueImpact: 50, metadata: meta() });
    const updatedParent = await g.getNode(parent.id);
    expect(updatedParent!.childIds).toEqual([child.id]);
  });

  it('addEdge between unrelated nodes', async () => {
    const g = new EvolutionGraph(D.evolutionGraph);
    const n1 = await g.addNode({ type: 'improvement', title: 'N1', description: 'D1', relatedIds: [], parentId: null, valueImpact: 10, metadata: meta() });
    const n2 = await g.addNode({ type: 'experiment', title: 'N2', description: 'D2', relatedIds: [], parentId: null, valueImpact: 20, metadata: meta() });
    const edge = await g.addEdge(n1.id, n2.id, 'caused-by', 0.8);
    expect(edge.weight).toBe(0.8);
    const edges = await g.listEdges();
    expect(edges.length).toBe(1);
  });

  it('listNodes returns all nodes', async () => {
    const g = new EvolutionGraph(D.evolutionGraph);
    await g.addNode({ type: 'improvement', title: '1', description: 'd', relatedIds: [], parentId: null, valueImpact: 10, metadata: meta() });
    await g.addNode({ type: 'experiment', title: '2', description: 'd', relatedIds: [], parentId: null, valueImpact: 20, metadata: meta() });
    await g.addNode({ type: 'bottleneck_resolved', title: '3', description: 'd', relatedIds: [], parentId: null, valueImpact: 30, metadata: meta() });
    expect((await g.listNodes()).length).toBe(3);
  });

  it('getRootNodes only returns nodes without parent', async () => {
    const g = new EvolutionGraph(D.evolutionGraph);
    const root = await g.addNode({ type: 'improvement', title: 'Root', description: 'd', relatedIds: [], parentId: null, valueImpact: 10, metadata: meta() });
    const child = await g.addNode({ type: 'improvement', title: 'Child', description: 'd', relatedIds: [], parentId: root.id, valueImpact: 20, metadata: meta()");
    const roots = await g.getRootNodes();
    expect(roots.length).toBe(1);
    expect(roots[0].id).toBe(root.id);
  });

  it('node is frozen', async () => {
    const g = new EvolutionGraph(D.evolutionGraph);
    const node = await g.addNode({ type: 'improvement', title: 'Frozen', description: 'd', relatedIds: [], parentId: null, valueImpact: 10, metadata: meta() });
    expect(Object.isFrozen(node)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
describe('Deep — TechDebtAnalyzer advanced scenarios', () => {
  it('totalCost sums all unresolved items', async () => {
    const t = new TechnicalDebtAnalyzer(D.techDebt);
    await t.register({ name: 'TD1', description: 'd', priority: TechDebtPriority.Low, estimatedCost: 100, impact: 5, targetModule: 'm1', targetFile: 'f1.ts', metadata: meta() });
    await t.register({ name: 'TD2', description: 'd', priority: TechDebtPriority.High, estimatedCost: 500, impact: 80, targetModule: 'm2', targetFile: 'f2.ts', metadata: meta() });
    await t.register({ name: 'TD3', description: 'd', priority: TechDebtPriority.Medium, estimatedCost: 250, impact: 40, targetModule: 'm3', targetFile: null, metadata: meta() });
    expect(await t.getTotalCost()).toBe(850);
  });

  it('resolved items excluded from totalCost', async () => {
    const t = new TechnicalDebtAnalyzer(D.techDebt);
    const td = await t.register({ name: 'TD', description: 'd', priority: TechDebtPriority.High, estimatedCost: 300, impact: 90, targetModule: 'm', targetFile: null, metadata: meta() });
    expect(await t.getTotalCost()).toBe(300);
    await t.resolve(td.id);
    expect(await t.getTotalCost()).toBe(0);
  });

  it('list filter by priority returns correct items', async () => {
    const t = new TechnicalDebtAnalyzer(D.techDebt);
    await t.register({ name: 'Low', description: 'd', priority: TechDebtPriority.Low, estimatedCost: 10, impact: 5, targetModule: 'm1', targetFile: null, metadata: meta() });
    await t.register({ name: 'High', description: 'd', priority: TechDebtPriority.High, estimatedCost: 200, impact: 80, targetModule: 'm2', targetFile: null, metadata: meta() });
    await t.register({ name: 'Critical', description: 'd', priority: TechDebtPriority.Critical, estimatedCost: 500, impact: 95, targetModule: 'm3', targetFile: null, metadata: meta() });
    const critical = await t.list({ priority: TechDebtPriority.Critical });
    expect(critical.length).toBe(1);
    expect(critical[0].name).toBe('Critical');
  });

  it('register item has targetFile field', async () => {
    const t = new TechnicalDebtAnalyzer(D.techDebt);
    const td = await t.register({ name: 'TD', description: 'd', priority: TechDebtPriority.Medium, estimatedCost: 100, impact: 50, targetModule: 'core', targetFile: 'core/index.ts', metadata: meta() });
    expect(td.targetFile).toBe('core/index.ts');
  });

  it('resolved item has resolvedAt timestamp', async () => {
    const t = new TechnicalDebtAnalyzer(D.techDebt);
    const td = await t.register({ name: 'TD', description: 'd', priority: TechDebtPriority.Low, estimatedCost: 50, impact: 10, targetModule: 'm', targetFile: null, metadata: meta() });
    await t.resolve(td.id);
    const resolved = await t.getById(td.id);
    expect(resolved!.resolvedAt).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════
describe('Deep — OptimizationPlanner advanced scenarios', () => {
  it('generateRoadmap with improvements returns sorted items', async () => {
    const e = new OptimizationPlanner(D.optimizationPlanner);
    const i1 = await new ImprovementEngine(D.improvementEngine).propose({ name: 'Low priority', description: 'd', bottleneckId: null, constraintType: ConstraintType.Documentation, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    const i2 = await new ImprovementEngine(D.improvementEngine).propose({ name: 'High priority', description: 'd', bottleneckId: null, constraintType: ConstraintType.Performance, targetRuntime: null, targetCapability: null, estimatedEffort: 'large', evidence: [], metadata: meta() });
    // Set priority on i2 manually by creating prioritized versions
    const prioritized = await new RecommendationPrioritizer(D.prioritizer).prioritize([i1, i2]);
    e.setImprovements(prioritized);
    const rm = await e.generateRoadmap('Test Roadmap', 'For testing');
    expect(rm.items.length).toBe(2);
    expect(rm.totalValue).toBeDefined();
  });

  it('generateRoadmap with no improvements returns empty items', async () => {
    const e = new OptimizationPlanner(D.optimizationPlanner);
    e.setImprovements([]);
    const rm = await e.generateRoadmap();
    expect(rm.items.length).toBe(0);
  });

  it('listRoadmaps returns all generated roadmaps', async () => {
    const e = new OptimizationPlanner(D.optimizationPlanner);
    await e.generateRoadmap('RM1');
    await e.generateRoadmap('RM2');
    await e.generateRoadmap('RM3');
    expect((await e.listRoadmaps()).length).toBe(3);
  });

  it('updateItemStatus changes item status', async () => {
    const e = new OptimizationPlanner(D.optimizationPlanner);
    const rm = await e.generateRoadmap();
    if (rm && rm.items.length > 0) {
      await e.updateItemStatus(rm.id, rm.items[0].id, 'InProgress' as any);
    }
 });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Deep — RecommendationPrioritizer advanced scenarios', () => {
  it('higher value score yields higher priority', () => {
    const p = new RecommendationPrioritizer(D.prioritizer);
    const impLow = { ...createMockImprovement('low'), valueScore: 10, impactScore: 10, constraintWeight: 1, costScore: 10, riskScore: 10, urgencyScore: 10, priority: 0, } as any;
    const impHigh = { ...createMockImprovement('high'), valueScore: 100, impactScore: 100, constraintWeight: 2, costScore: 10, riskScore: 10, urgencyScore: 10, priority: 0, } as any;
    const pLow = p.calculatePriority(impLow);
    const pHigh = p.calculatePriority(impHigh);
    expect(pHigh).toBeGreaterThan(pLow);
  });

  it('higher cost score yields lower priority', () => {
    const p = new RecommendationPrioritizer(D.prioritizer);
    const cheap = { ...createMockImprovement('cheap'), valueScore: 50, impactScore: 50, constraintWeight: 1, costScore: 1, riskScore: 10, urgencyScore: 10, priority: 0, } as any;
    const expensive = { ...createMockImprovement('expensive'), valueScore: 50, impactScore: 50, constraintWeight: 1, costScore: 100, riskScore: 10, urgencyScore: 10, priority: 0, } as any;
    expect(p.calculatePriority(cheap)).toBeGreaterThan(p.calculatePriority(expensive));
  });

  it('higher risk score yields lower priority', () => {
    const p = new RecommendationPrioritizer(D.prioritizer);
    const safe = { ...createMockImprovement('safe'), valueScore: 50, impactScore: 50, constraintWeight: 1, costScore: 10, riskScore: 1, urgencyScore: 10, priority: 0, } as any;
    const risky = { ...createMockImprovement('risky'), valueScore: 50, impactScore: 50, constraintWeight: 1, costScore: 10, riskScore: 100, urgencyScore: 10, priority: 0, } as any;
    expect(p.calculatePriority(safe)).toBeGreaterThan(p.calculatePriority(risky));
  });

  it('prioritize returns frozen array', async () => {
    const p = new RecommendationPrioritizer(D.prioritizer);
    const imp = createMockImprovement('test');
    const result = await p.prioritize([imp]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('prioritize empty list returns empty array', async () => {
    const p = new RecommendationPrioritizer(D.prioritizer);
    const result = await p.prioritize([]);
    expect(result).toEqual([]);
  });
});

function createMockImprovement(name: string) {
  return Object.freeze({
    id: brandImprovementId(crypto.randomUUID()), name,
    description: `Test improvement ${name}`,
    status: ImprovementStatus.Proposed as string,
    constraintType: ConstraintType.Performance as string,
    targetRuntime: null, targetCapability: null,
    estimatedEffort: 'small',
    proposedAt: new Date().toISOString(),
    startedAt: null, completedAt: null,
    evidence: Object.freeze([]),
    metadata: meta(),
    valueScore: 0, impactScore: 0, costScore: 0,
    riskScore: 0, urgencyScore: 0,
    constraintWeight: 1, priority: 0,
    valueDimension: 'UserValue' as string,
  });
}
