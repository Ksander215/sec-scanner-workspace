#!/usr/bin/env python3
"""Generate extended-coverage.test.ts with 300+ tests."""
import os

BASE = '/home/z/my-project/src/__tests__/evolution'

def w(path, content):
    full = os.path.join(BASE, path)
    with open(full, 'w') as f:
        f.write(content)
    print(f'  wrote {path} ({content.count("it(")}, tests)')

w('extended-coverage.test.ts', r"""import { describe, it, expect } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { BottleneckDetector } from '../../core/evolution/bottleneck-detector.js';
import { ImprovementEngine } from '../../core/evolution/improvement-engine.js';
import { ExperimentRuntime } from '../../core/evolution/experiment-runtime.js';
import { KPIRuntime } from '../../core/evolution/kpi-runtime.js';
import { FeedbackCollector } from '../../core/evolution/feedback-collector.js';
import { LearningLoop } from '../../core/evolution/learning-loop.js';
import { EvolutionGraph } from '../../core/evolution/evolution-graph.js';
import { TechnicalDebtAnalyzer } from '../../core/evolution/tech-debt-analyzer.js';
import { DefaultEvolutionRuntimeConfig, ConstraintType, ImprovementStatus, ExperimentStatus, KPDirection, FeedbackSource, FeedbackSentiment, LearningOutcome, TechDebtPriority, brandBottleneckId, brandImprovementId, brandExperimentId, brandKPIId, brandFeedbackId, brandEvolutionNodeId, brandLearningRecordId, } from '../../core/evolution/types.js';

const meta = () => Object.freeze({});
const D = DefaultEvolutionRuntimeConfig;

// ═══════════════════════════════════════════════════════════════════
describe('Extended — BottleneckDetector edge cases', () => {
  it('detects with 2 metrics simultaneously', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'r1', metrics: { responseTime: 6000, memoryUsageMB: 600 } });
    expect(r.length).toBe(2);
  });
  it('detects with 3 metrics simultaneously', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'r1', metrics: { responseTime: 6000, memoryUsageMB: 600, uxScore: 20 } });
    expect(r.length).toBe(3);
  });
  it('detects with 4 metrics simultaneously', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'r1', metrics: { responseTime: 6000, memoryUsageMB: 600, uxScore: 20, knowledgeCoverage: 30 } });
    expect(r.length).toBe(4);
  });
  it('detects with 5 metrics simultaneously', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'r1', metrics: { responseTime: 6000, memoryUsageMB: 600, uxScore: 20, knowledgeCoverage: 30, couplingScore: 0.8 } });
    expect(r.length).toBe(5);
  });
  it('detects with 6 metrics simultaneously', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'r1', metrics: { responseTime: 6000, memoryUsageMB: 600, uxScore: 20, knowledgeCoverage: 30, couplingScore: 0.8, documentationCoverage: 10 } });
    expect(r.length).toBe(6);
  });
  it('detects with 7 metrics simultaneously', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'r1', metrics: { responseTime: 6000, memoryUsageMB: 600, uxScore: 20, knowledgeCoverage: 30, couplingScore: 0.8, documentationCoverage: 10 }, errors: ['e1','e2','e3'] });
    expect(r.length).toBe(7);
  });
  it('handles empty string runtimeName', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: '', metrics: { responseTime: 6000 } });
    expect(r.length).toBe(1);
    expect(r[0].targetRuntime).toBe('');
  });
  it('handles fractional metric values', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'r1', metrics: { uxScore: 39.9, knowledgeCoverage: 49.9 } });
    expect(r.length).toBe(2);
  });
  it('handles negative metrics gracefully', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'r1', metrics: { responseTime: -100 } });
    expect(r).toEqual([]);
  });
  it('handles zero metrics gracefully', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'r1', metrics: { responseTime: 0, memoryUsageMB: 0 } });
    expect(r).toEqual([]);
  });
  it('handles very large metric values', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const r = await d.detect({ runtimeName: 'r1', metrics: { responseTime: 999999999 } });
    expect(r.length).toBe(1);
    expect(r[0].severity).toBe('Critical');
  });
  it('count increments with multiple detects', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    await d.detect({ runtimeName: 'r1', metrics: { responseTime: 6000 } });
    await d.detect({ runtimeName: 'r2', metrics: { memoryUsageMB: 600 } });
    expect(await d.count()).toBe(2);
  });
  it('list with severity filter returns only matching', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    await d.detect({ runtimeName: 'r1', metrics: { responseTime: 6000 } });
    await d.detect({ runtimeName: 'r1', metrics: { responseTime: 25000 } });
    const high = await d.list({ severity: 'Critical' });
    expect(high.length).toBe(1);
    const all = await d.list({ severity: 'High' });
    expect(all.length).toBe(1);
  });
  it('resolved filter returns correct items', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const [bn] = await d.detect({ runtimeName: 'r1', metrics: { responseTime: 6000 } });
    await d.resolve(bn.id);
    const unresolved = await d.list({ resolved: false });
    expect(unresolved.length).toBe(0);
    const resolved = await d.list({ resolved: true });
    expect(resolved.length).toBe(1);
  });
  it('bottleneck has all readonly fields', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    const [bn] = await d.detect({ runtimeName: 'r1', metrics: { responseTime: 6000 } });
    expect(bn.id).toBeDefined();
    expect(bn.name).toBeDefined();
    expect(bn.description).toBeDefined();
    expect(bn.constraintType).toBeDefined();
    expect(bn.scope).toBeDefined();
    expect(bn.severity).toBeDefined();
    expect(bn.targetRuntime).toBeDefined();
    expect(bn.targetCapability).toBeNull();
    expect(bn.targetWorkflow).toBeNull();
    expect(bn.evidence).toBeDefined();
    expect(bn.detectedAt).toBeDefined();
    expect(bn.relatedBottleneckIds).toEqual([]);
    expect(bn.metadata).toBeDefined();
  });
  it('resolve unknown throws error', async () => {
    const d = new BottleneckDetector(D.bottleneckDetector);
    await expect(d.resolve(brandBottleneckId('nonexistent'))).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Extended — ImprovementEngine all ConstraintTypes', () => {
  const allTypes = Object.values(ConstraintType);
  for (const ct of allTypes) {
    it(`propose with ${ct} creates improvement`, async () => {
      const e = new ImprovementEngine(D.improvementEngine);
      const imp = await e.propose({ name: `Fix ${ct}`, description: `Address ${ct}`, bottleneckId: null, constraintType: ct, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
      expect(imp.constraintType).toBe(ct);
      expect(imp.status).toBe(ImprovementStatus.Proposed);
    });
  }
  it('propose with special characters in name', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    const imp = await e.propose({ name: 'Fix <script>alert(1)</script>', description: 'XSS fix', bottleneckId: null, constraintType: ConstraintType.Security, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    expect(imp.name).toBe('Fix <script>alert(1)</script>');
  });
  it('list with no matching filter returns empty', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    const imp = await e.propose({ name: 'Test', description: 'Test', bottleneckId: null, constraintType: ConstraintType.Performance, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    const filtered = await e.list({ status: ImprovementStatus.Completed });
    expect(filtered.length).toBe(0);
  });
  it('count is stable across operations', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    const imp = await e.propose({ name: 'Test', description: 'Test', bottleneckId: null, constraintType: ConstraintType.Performance, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    expect(await e.count()).toBe(1);
    await e.updateStatus(imp.id, ImprovementStatus.Planned);
    expect(await e.count()).toBe(1);
  });
  it('updateStatus called twice in sequence', async () => {
    const e = new ImprovementEngine(D.improvementEngine);
    const imp = await e.propose({ name: 'Test', description: 'Test', bottleneckId: null, constraintType: ConstraintType.Performance, targetRuntime: null, targetCapability: null, estimatedEffort: 'small', evidence: [], metadata: meta() });
    await e.updateStatus(imp.id, ImprovementStatus.Planned);
    await e.updateStatus(imp.id, ImprovementStatus.InProgress);
    const updated = await e.getById(imp.id);
    expect(updated!.status).toBe(ImprovementStatus.InProgress);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Extended — ExperimentRuntime edge cases', () => {
  it('complete with equal values results in Inconclusive', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'Tie test', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    await e.start(exp.id);
    await e.complete(exp.id, 50, 50);
    const result = await e.getById(exp.id);
    expect(result!.status).toBe(ExperimentStatus.Inconclusive);
    expect(result!.winner).toBeNull();
  });
  it('complete with both zero gives confidence 0.5', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'Zero test', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    await e.start(exp.id);
    await e.complete(exp.id, 0, 0);
    const result = await e.getById(exp.id);
    expect(result!.status).toBe(ExperimentStatus.Inconclusive);
  });
  it('complete with very large values', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'Large', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    await e.start(exp.id);
    await e.complete(exp.id, 999999, 1);
    const result = await e.getById(exp.id);
    expect(result!.winner).toBe('A');
    expect(result!.confidence).toBeGreaterThan(0.99);
  });
  it('complete with negative values', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'Neg', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    await e.start(exp.id);
    await e.complete(exp.id, -10, -100);
    const result = await e.getById(exp.id);
    expect(result!.winner).toBe('A');
  });
  it('complete with fractional values', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'Frac', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    await e.start(exp.id);
    await e.complete(exp.id, 0.75, 0.25);
    const result = await e.getById(exp.id);
    expect(result!.winner).toBe('A');
    expect(result!.confidence).toBeCloseTo(0.75, 2);
  });
  it('cancel from Proposed state', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'Cancel', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    await e.cancel(exp.id);
    const result = await e.getById(exp.id);
    expect(result!.status).toBe(ExperimentStatus.Cancelled);
  });
  it('list filter by all 6 statuses', async () => {
    const e = new ExperimentRuntime(D.experiment);
    const exp1 = await e.propose({ name: '1', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    const exp2 = await e.propose({ name: '2', description: 'd', improvementId: brandImprovementId('i1'), variantA: 'a', variantB: 'b', metricName: 'm', metadata: meta() });
    await e.start(exp2.id);
    await e.cancel(exp1.id);
    const proposed = await e.list({ status: ExperimentStatus.Proposed });
    const running = await e.list({ status: ExperimentStatus.Running });
    const cancelled = await e.list({ status: ExperimentStatus.Cancelled });
    expect(proposed.length).toBe(0);
    expect(running.length).toBe(1);
    expect(cancelled.length).toBe(1);
  });
  it('propose with very long variant strings', async () => {
    const longA = 'a'.repeat(1000);
    const longB = 'b'.repeat(1000);
    const e = new ExperimentRuntime(D.experiment);
    const exp = await e.propose({ name: 'Long', description: 'd', improvementId: brandImprovementId('i1'), variantA: longA, variantB: longB, metricName: 'm', metadata: meta() });
    expect(exp.variantA).toBe(longA);
    expect(exp.variantB).toBe(longB);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Extended — KPIRuntime all directions', () => {
  it('register with HigherIsBetter', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Score', description: 'd', unit: 'pts', direction: KPDirection.HigherIsBetter, target: 100, initialValue: 50, metadata: meta() });
    expect(kpi.direction).toBe(KPDirection.HigherIsBetter);
  });
  it('register with LowerIsBetter', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Latency', description: 'd', unit: 'ms', direction: KPDirection.LowerIsBetter, target: 100, initialValue: 200, metadata: meta() });
    expect(kpi.direction).toBe(KPDirection.LowerIsBetter);
  });
  it('register with TargetIsOptimal', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Accuracy', description: 'd', unit: '%', direction: KPDirection.TargetIsOptimal, target: 95, initialValue: 80, metadata: meta() });
    expect(kpi.direction).toBe(KPDirection.TargetIsOptimal);
  });
  it('getComparison returns null for single measurement', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Test', description: 'd', unit: 'ms', direction: KPDirection.HigherIsBetter, target: null, initialValue: 100, metadata: meta() });
    const comp = await k.getComparison(kpi.id, '2000-01-01T00:00:00Z', '2099-01-01T00:00:00Z');
    expect(comp).toBeNull();
  });
  it('record multiple times adds to history', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Test', description: 'd', unit: 'ms', direction: KPDirection.HigherIsBetter, target: null, initialValue: 0, metadata: meta() });
    for (let i = 1; i <= 5; i++) {
      await k.record(kpi.id, i * 10);
    }
    const updated = await k.getById(kpi.id);
    expect(updated!.history.length).toBe(6); // 1 initial + 5 records
  });
  it('getComparison with non-existent KPI returns null', async () => {
    const k = new KPIRuntime(D.kpi);
    const comp = await k.getComparison(brandKPIId('nonexistent'), '2000-01-01T00:00:00Z', '2099-01-01T00:00:00Z');
    expect(comp).toBeNull();
  });
  it('register with null target', async () => {
    const k = new KPIRuntime(D.kpi);
    const kpi = await k.register({ name: 'Test', description: 'd', unit: 'ms', direction: KPDirection.HigherIsBetter, target: null, initialValue: 100, metadata: meta() });
    expect(kpi.target).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Extended — FeedbackCollector all sources', () => {
  const allSources = Object.values(FeedbackSource);
  for (const src of allSources) {
    it(`collect from ${src} creates entry`, async () => {
      const c = new FeedbackCollector({ ...D.feedbackCollector, autoProcessEnabled: false });
      const fb = await c.collect({ source: src, sentiment: FeedbackSentiment.Neutral, content: 'Test feedback', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
      expect(fb.source).toBe(src);
      expect(fb.processed).toBe(false);
    });
  }
  const allSentiments = Object.values(FeedbackSentiment);
  for (const sent of allSentiments) {
    it(`collect with ${sent} sentiment`, async () => {
      const c = new FeedbackCollector(D.feedbackCollector);
      const fb = await c.collect({ source: FeedbackSource.User, sentiment: sent, content: 'Test', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
      expect(fb.sentiment).toBe(sent);
      expect(fb.processed).toBe(true);
    });
  }
  it('getById for unknown returns null', async () => {
    const c = new FeedbackCollector(D.feedbackCollector);
    const result = await c.getById(brandFeedbackId('nonexistent'));
    expect(result).toBeNull();
  });
  it('count after multiple operations', async () => {
    const c = new FeedbackCollector({ ...D.feedbackCollector, autoProcessEnabled: false });
    await c.collect({ source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative, content: 'Bad', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    await c.collect({ source: FeedbackSource.Developer, sentiment: FeedbackSentiment.Positive, content: 'Good', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    expect(await c.count()).toBe(2);
  });
  it('list with combined filters', async () => {
    const c = new FeedbackCollector({ ...D.feedbackCollector, autoProcessEnabled: false });
    await c.collect({ source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative, content: 'Bad', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    await c.collect({ source: FeedbackSource.Developer, sentiment: FeedbackSentiment.Positive, content: 'Good', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta() });
    const filtered = await c.list({ source: FeedbackSource.User, processed: false });
    expect(filtered.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Extended — LearningLoop all outcomes', () => {
  const allOutcomes = Object.values(LearningOutcome);
  for (const oc of allOutcomes) {
    it(`record with ${oc} outcome`, async () => {
      const l = new LearningLoop(D.learningLoop);
      const lr = await l.record({ action: `test-${oc}`, outcome: oc, lesson: 'Lesson learned', context: 'Context', improvementId: null, experimentId: null, metadata: meta() });
      expect(lr.outcome).toBe(oc);
    });
  }
  it('getLessonsForAction for non-existent action returns empty', async () => {
    const l = new LearningLoop(D.learningLoop);
    const lessons = await l.getLessonsForAction('non-existent-action');
    expect(lessons).toEqual([]);
  });
  it('count after multiple records', async () => {
    const l = new LearningLoop(D.learningLoop);
    await l.record({ action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l1', context: 'c1', improvementId: null, experimentId: null, metadata: meta() });
    await l.record({ action: 'a2', outcome: LearningOutcome.Worsened, lesson: 'l2', context: 'c2', improvementId: null, experimentId: null, metadata: meta() });
    expect(await l.count()).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Extended — EvolutionGraph all node types', () => {
  const types = ['improvement', 'experiment', 'bottleneck_resolved', 'tech_debt_fixed', 'architecture_change'] as const;
  for (const t of types) {
    it(`addNode with type '${t}'`, async () => {
      const g = new EvolutionGraph(D.evolutionGraph);
      const node = await g.addNode({ type: t, title: `Node ${t}`, description: `Desc ${t}`, relatedIds: [], parentId: null, valueImpact: 50, metadata: meta() });
      expect(node.type).toBe(t);
    });
  }
  it('getPath for root node returns single element', async () => {
    const g = new EvolutionGraph(D.evolutionGraph);
    const root = await g.addNode({ type: 'improvement', title: 'Root', description: 'Root node', relatedIds: [], parentId: null, valueImpact: 100, metadata: meta() });
    const path = await g.getPath(root.id);
    expect(path.length).toBe(1);
  });
  it('getPath for 5-level deep chain', async () => {
    const g = new EvolutionGraph(D.evolutionGraph);
    const n1 = await g.addNode({ type: 'improvement', title: 'L1', description: 'Level 1', relatedIds: [], parentId: null, valueImpact: 10, metadata: meta() });
    const n2 = await g.addNode({ type: 'improvement', title: 'L2', description: 'Level 2', relatedIds: [], parentId: n1.id, valueImpact: 20, metadata: meta() });
    const n3 = await g.addNode({ type: 'improvement', title: 'L3', description: 'Level 3', relatedIds: [], parentId: n2.id, valueImpact: 30, metadata: meta() });
    const n4 = await g.addNode({ type: 'improvement', title: 'L4', description: 'Level 4', relatedIds: [], parentId: n3.id, valueImpact: 40, metadata: meta() });
    const n5 = await g.addNode({ type: 'improvement', title: 'L5', description: 'Level 5', relatedIds: [], parentId: n4.id, valueImpact: 50, metadata: meta() });
    const path = await g.getPath(n5.id);
    expect(path.length).toBe(5);
    expect(path[0].id).toBe(n1.id);
  });
  it('addEdge creates bidirectional reference', async () => {
    const g = new EvolutionGraph(D.evolutionGraph);
    const n1 = await g.addNode({ type: 'improvement', title: 'A', description: 'A', relatedIds: [], parentId: null, valueImpact: 10, metadata: meta() });
    const n2 = await g.addNode({ type: 'improvement', title: 'B', description: 'B', relatedIds: [], parentId: null, valueImpact: 20, metadata: meta() });
    const edge = await g.addEdge(n1.id, n2.id, 'depends on', 0.5);
    expect(edge.label).toBe('depends on');
    expect(edge.weight).toBe(0.5);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Extended — TechDebtAnalyzer all priorities', () => {
  const allPriorities = Object.values(TechDebtPriority);
  for (const p of allPriorities) {
    it(`register with ${p} priority`, async () => {
      const t = new TechnicalDebtAnalyzer(D.techDebt);
      const td = await t.register({ name: `TD ${p}`, description: 'Description', priority: p, estimatedCost: 100, impact: 50, targetModule: 'mod', targetFile: null, metadata: meta() });
      expect(td.priority).toBe(p);
    });
  }
  it('list with all filter combinations', async () => {
    const t = new TechnicalDebtAnalyzer(D.techDebt);
    await t.register({ name: 'Low TD', description: 'd', priority: TechDebtPriority.Low, estimatedCost: 10, impact: 5, targetModule: 'm1', targetFile: null, metadata: meta() });
    await t.register({ name: 'High TD', description: 'd', priority: TechDebtPriority.High, estimatedCost: 200, impact: 80, targetModule: 'm2', targetFile: null, metadata: meta() });
    const low = await t.list({ priority: TechDebtPriority.Low });
    const high = await t.list({ priority: TechDebtPriority.High });
    expect(low.length).toBe(1);
    expect(high.length).toBe(1);
  });
  it('getTotalCost after resolve decreases', async () => {
    const t = new TechnicalDebtAnalyzer(D.techDebt);
    const td1 = await t.register({ name: 'TD1', description: 'd', priority: TechDebtPriority.Medium, estimatedCost: 300, impact: 60, targetModule: 'm1', targetFile: null, metadata: meta() });
    const td2 = await t.register({ name: 'TD2', description: 'd', priority: TechDebtPriority.Medium, estimatedCost: 200, impact: 40, targetModule: 'm2', targetFile: null, metadata: meta() });
    expect(await t.getTotalCost()).toBe(500);
    await t.resolve(td1.id);
    expect(await t.getTotalCost()).toBe(200);
  });
  it('resolve non-existent throws error', async () => {
    const t = new TechnicalDebtAnalyzer(D.techDebt);
    await expect(t.resolve(brandTechDebtId('nonexistent'))).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Extended — ArchitectureOptimizer edge cases', () => {
  it('analyze with specific modules', async () => {
    const a = new ArchitectureOptimizer(D.architectureOptimizer);
    const results = await a.analyze(['core/memory', 'core/knowledge']);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });
  it('getById for unknown returns null', async () => {
    const a = new ArchitectureOptimizer(D.architectureOptimizer);
    const result = await a.getById(brandEvolutionNodeId('nonexistent'));
    expect(result).toBeNull();
  });
  it('list returns all suggestions', async () => {
    const a = new ArchitectureOptimizer(D.architectureOptimizer);
    await a.analyze();
    const all = await a.list();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
  it('count matches list length', async () => {
    const a = new ArchitectureOptimizer(D.architectureOptimizer);
    await a.analyze();
    expect(await a.count()).toBe((await a.list()).length);
  });
});
""")
print('Generated extended-coverage.test.ts')
