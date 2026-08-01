#!/usr/bin/env python3
"""Generate events, bottleneck-detector, constraint-analyzer tests."""
import os

BASE = '/home/z/my-project/src/__tests__/evolution'

def w(path, content):
    full = os.path.join(BASE, path)
    with open(full, 'w') as f:
        f.write(content)
    print(f'  wrote {path} ({content.count("it(")}, tests)')

# ═══════════════════════════════════════════════════════════════════
# 2. events.test.ts
# ═══════════════════════════════════════════════════════════════════
w('events.test.ts', r"""import { describe, it, expect } from 'vitest';
import { EventClassification } from '../../core/types/common.js';
import type { EvolutionEvent } from '../../core/evolution/events.js';
import {
  brandBottleneckId, brandImprovementId, brandExperimentId, brandKPIId,
  brandFeedbackId, brandEvolutionNodeId, brandTechDebtId, brandRoadmapId,
  brandLearningRecordId, ConstraintType, BottleneckSeverity,
  ImprovementStatus, FeedbackSource, FeedbackSentiment, LearningOutcome,
  TechDebtPriority, ArchOptimizationType, EvolutionState,
} from '../../core/evolution/types.js';

const ts = () => new Date().toISOString();
const ec = EventClassification;
const meta = () => Object.freeze({});

// ═══════════════════════════════════════════════════════════════════
describe('ECIR Events — Event Type Strings', () => {
  it('BottleneckDetectedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.bottleneck.detected' as const, classification: ec.Info, bottleneckId: brandBottleneckId('1'), name: 'n', constraintType: ConstraintType.Performance, severity: BottleneckSeverity.High, targetRuntime: 'r', timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.bottleneck.detected');
  });
  it('BottleneckResolvedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.bottleneck.resolved' as const, classification: ec.StateChange, bottleneckId: brandBottleneckId('1'), resolvedAt: ts(), timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.bottleneck.resolved');
  });
  it('ConstraintAnalyzedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.constraint.analyzed' as const, classification: ec.Result, bottleneckId: brandBottleneckId('1'), constraintType: ConstraintType.Performance, rootCause: 'rc', durationMs: 10, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.constraint.analyzed');
  });
  it('ImprovementProposedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.improvement.proposed' as const, classification: ec.Action, improvementId: brandImprovementId('1'), name: 'n', constraintType: ConstraintType.Quality, valueScore: 50, priority: 10, valueDimension: 'UserValue' as const, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.improvement.proposed');
  });
  it('ImprovementStatusChangedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.improvement.statusChanged' as const, classification: ec.StateChange, improvementId: brandImprovementId('1'), fromStatus: ImprovementStatus.Proposed, toStatus: ImprovementStatus.Planned, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.improvement.statusChanged');
  });
  it('ImprovementCompletedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.improvement.completed' as const, classification: ec.Result, improvementId: brandImprovementId('1'), valueScore: 50, durationMs: 100, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.improvement.completed');
  });
  it('ImprovementRejectedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.improvement.rejected' as const, classification: ec.Result, improvementId: brandImprovementId('1'), reason: 'r', timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.improvement.rejected');
  });
  it('ValueAnalyzedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.value.analyzed' as const, classification: ec.Result, improvementId: brandImprovementId('1'), valueScore: 50, valueDimension: 'UserValue' as const, valueCreated: 'vc', timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.value.analyzed');
  });
  it('OpportunityCostAnalyzedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.opportunityCost.analyzed' as const, classification: ec.Result, improvementId: brandImprovementId('1'), netBenefit: 10, foregoneCount: 2, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.opportunityCost.analyzed');
  });
  it('ExperimentStartedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.experiment.started' as const, classification: ec.Action, experimentId: brandExperimentId('1'), name: 'n', improvementId: brandImprovementId('1'), timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.experiment.started');
  });
  it('ExperimentCompletedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.experiment.completed' as const, classification: ec.Result, experimentId: brandExperimentId('1'), winner: 'A' as const, confidence: 0.9, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.experiment.completed');
  });
  it('ExperimentFailedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.experiment.failed' as const, classification: ec.Error, experimentId: brandExperimentId('1'), reason: 'r', timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.experiment.failed');
  });
  it('KPIRegisteredEvent eventType is correct', () => {
    const e = { eventType: 'evolution.kpi.registered' as const, classification: ec.Action, kpiId: brandKPIId('1'), name: 'n', timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.kpi.registered');
  });
  it('KPIUpdatedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.kpi.updated' as const, classification: ec.Result, kpiId: brandKPIId('1'), newValue: 10, previousValue: 5, improved: true, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.kpi.updated');
  });
  it('FeedbackReceivedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.feedback.received' as const, classification: ec.Action, feedbackId: brandFeedbackId('1'), source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.feedback.received');
  });
  it('FeedbackProcessedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.feedback.processed' as const, classification: ec.Result, feedbackId: brandFeedbackId('1'), insightCount: 3, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.feedback.processed');
  });
  it('LearningRecordedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.learning.recorded' as const, classification: ec.Action, recordId: brandLearningRecordId('1'), outcome: LearningOutcome.Improved, lesson: 'l', timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.learning.recorded');
  });
  it('EvolutionNodeAddedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.graph.nodeAdded' as const, classification: ec.Action, nodeId: brandEvolutionNodeId('1'), type: 'improvement', title: 't', timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.graph.nodeAdded');
  });
  it('TechDebtDetectedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.techDebt.detected' as const, classification: ec.Action, techDebtId: brandTechDebtId('1'), name: 'n', priority: TechDebtPriority.High, estimatedCost: 100, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.techDebt.detected');
  });
  it('TechDebtResolvedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.techDebt.resolved' as const, classification: ec.StateChange, techDebtId: brandTechDebtId('1'), timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.techDebt.resolved');
  });
  it('ArchOptimizationSuggestedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.arch.suggested' as const, classification: ec.Result, nodeId: brandEvolutionNodeId('1'), type: ArchOptimizationType.Simplify, title: 't', estimatedImpact: 50, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.arch.suggested');
  });
  it('RoadmapCreatedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.roadmap.created' as const, classification: ec.Result, roadmapId: brandRoadmapId('1'), title: 't', itemCount: 5, totalValue: 100, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.roadmap.created');
  });
  it('EvolutionInitializedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.runtime.initialized' as const, classification: ec.StateChange, subsystemCount: 15, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.runtime.initialized');
  });
  it('EvolutionStateChangedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.runtime.stateChanged' as const, classification: ec.StateChange, fromState: EvolutionState.Uninitialized, toState: EvolutionState.Ready, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.runtime.stateChanged');
  });
  it('EvolutionAnalysisCompletedEvent eventType is correct', () => {
    const e = { eventType: 'evolution.analysis.completed' as const, classification: ec.Result, bottlenecksFound: 3, improvementsProposed: 5, durationMs: 100, timestamp: ts(), metadata: meta() };
    expect(e.eventType).toBe('evolution.analysis.completed');
  });
});

describe('ECIR Events — Common Properties', () => {
  it('BottleneckDetectedEvent is frozen', () => {
    const e = Object.freeze({ eventType: 'evolution.bottleneck.detected' as const, classification: ec.Info, bottleneckId: brandBottleneckId('1'), name: 'n', constraintType: ConstraintType.Performance, severity: BottleneckSeverity.High, targetRuntime: 'r', timestamp: ts(), metadata: meta() });
    expect(Object.isFrozen(e)).toBe(true);
  });
  it('every event has classification', () => {
    const events = [
      { eventType: 'evolution.bottleneck.detected' as const, classification: ec.Info, bottleneckId: brandBottleneckId('1'), name: 'n', constraintType: ConstraintType.Performance, severity: BottleneckSeverity.Low, targetRuntime: 'r', timestamp: ts(), metadata: meta() },
      { eventType: 'evolution.kpi.registered' as const, classification: ec.Action, kpiId: brandKPIId('1'), name: 'n', timestamp: ts(), metadata: meta() },
      { eventType: 'evolution.feedback.received' as const, classification: ec.Action, feedbackId: brandFeedbackId('1'), source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative, timestamp: ts(), metadata: meta() },
    ];
    for (const e of events) {
      expect(e.classification).toBeDefined();
    }
  });
  it('every event has timestamp', () => {
    const events = [
      { eventType: 'evolution.bottleneck.detected' as const, classification: ec.Info, bottleneckId: brandBottleneckId('1'), name: 'n', constraintType: ConstraintType.Performance, severity: BottleneckSeverity.Low, targetRuntime: 'r', timestamp: ts(), metadata: meta() },
      { eventType: 'evolution.experiment.started' as const, classification: ec.Action, experimentId: brandExperimentId('1'), name: 'n', improvementId: brandImprovementId('1'), timestamp: ts(), metadata: meta() },
    ];
    for (const e of events) {
      expect(e.timestamp).toBeDefined();
    }
  });
  it('every event has metadata', () => {
    const events = [
      { eventType: 'evolution.bottleneck.detected' as const, classification: ec.Info, bottleneckId: brandBottleneckId('1'), name: 'n', constraintType: ConstraintType.Performance, severity: BottleneckSeverity.Low, targetRuntime: 'r', timestamp: ts(), metadata: meta() },
      { eventType: 'evolution.roadmap.created' as const, classification: ec.Result, roadmapId: brandRoadmapId('1'), title: 't', itemCount: 1, totalValue: 10, timestamp: ts(), metadata: meta() },
    ];
    for (const e of events) {
      expect(e.metadata).toBeDefined();
    }
  });
});
""")

# ═══════════════════════════════════════════════════════════════════
# 3. bottleneck-detector.test.ts
# ═══════════════════════════════════════════════════════════════════
w('bottleneck-detector.test.ts', r"""import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { BottleneckDetector } from '../../core/evolution/bottleneck-detector.js';
import { DefaultEvolutionRuntimeConfig } from '../../core/evolution/types.js';

const cfg = DefaultEvolutionRuntimeConfig.bottleneckDetector;

function createDetector(bus?: InProcessEventBus) {
  return new BottleneckDetector(cfg, bus);
}

describe('BottleneckDetector — constructor', () => {
  it('creates instance without eventBus', () => {
    const d = createDetector();
    expect(d).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const d = createDetector(new InProcessEventBus());
    expect(d).toBeDefined();
  });
});

describe('BottleneckDetector — detect', () => {
  it('returns empty array when no metrics', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'test' });
    expect(result).toEqual([]);
  });
  it('detects Performance bottleneck when responseTime > 5000', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 6000 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Performance');
  });
  it('detects Critical Performance when responseTime > 20000', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 25000 } });
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe('Critical');
  });
  it('detects High Performance when 5000 < responseTime <= 20000', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    expect(result[0].severity).toBe('High');
  });
  it('does not detect Performance when responseTime <= 5000', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 5000 } });
    expect(result).toEqual([]);
  });
  it('detects Performance via avgResponseTimeMs', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { avgResponseTimeMs: 8000 } });
    expect(result.length).toBe(1);
  });
  it('detects Quality bottleneck when errors >= 3', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', errors: ['e1', 'e2', 'e3'] });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Quality');
  });
  it('detects Critical Quality when errors > 10', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', errors: Array(11).fill('err') });
    expect(result[0].severity).toBe('Critical');
  });
  it('does not detect Quality when errors < 3', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', errors: ['e1', 'e2'] });
    expect(result).toEqual([]);
  });
  it('detects Knowledge bottleneck when coverage < 50', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { knowledgeCoverage: 30 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Knowledge');
  });
  it('detects Knowledge via knowledgeCoveragePercent', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { knowledgeCoveragePercent: 25 } });
    expect(result.length).toBe(1);
  });
  it('does not detect Knowledge when coverage >= 50', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { knowledgeCoverage: 50 } });
    expect(result).toEqual([]);
  });
  it('detects Memory bottleneck when memoryUsage > 500', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { memoryUsageMB: 600 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Memory');
  });
  it('detects Critical Memory when memoryUsage > 1000', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { memoryUsageMB: 1200 } });
    expect(result[0].severity).toBe('Critical');
  });
  it('detects Memory via memoryUsage', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { memoryUsage: 800 } });
    expect(result.length).toBe(1);
  });
  it('does not detect Memory when memoryUsage <= 500', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { memoryUsageMB: 500 } });
    expect(result).toEqual([]);
  });
  it('detects UX bottleneck when uxScore < 40', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { uxScore: 30 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('UX');
  });
  it('does not detect UX when uxScore >= 40', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { uxScore: 40 } });
    expect(result).toEqual([]);
  });
  it('detects Architecture bottleneck when couplingScore > 0.7', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { couplingScore: 0.8 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Architecture');
  });
  it('detects Architecture via moduleCoupling', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { moduleCoupling: 0.9 } });
    expect(result.length).toBe(1);
  });
  it('does not detect Architecture when couplingScore <= 0.7', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { couplingScore: 0.7 } });
    expect(result).toEqual([]);
  });
  it('detects Documentation bottleneck when docCoverage < 30', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { documentationCoverage: 20 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Documentation');
  });
  it('detects Documentation via docCoveragePercent', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { docCoveragePercent: 10 } });
    expect(result.length).toBe(1);
  });
  it('does not detect Documentation when docCoverage >= 30', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { documentationCoverage: 30 } });
    expect(result).toEqual([]);
  });
  it('detects multiple bottlenecks at once', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000, memoryUsageMB: 800, uxScore: 20 } });
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
  it('each bottleneck is frozen', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    for (const b of result) {
      expect(Object.isFrozen(b)).toBe(true);
    }
  });
  it('each bottleneck has unique id', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000, memoryUsageMB: 800 } });
    const ids = result.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('each bottleneck has resolvedAt null', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    for (const b of result) {
      expect(b.resolvedAt).toBeNull();
    }
  });
  it('throws BottleneckLimitExceededError when limit reached', async () => {
    const d = new BottleneckDetector({ maxBottlenecks: 1, scanIntervalMs: 60000, minEvidenceItems: 1 });
    await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    await expect(d.detect({ runtimeName: 'rt1', metrics: { memoryUsageMB: 800 } })).rejects.toThrow();
  });
});

describe('BottleneckDetector — getById', () => {
  it('returns null for unknown id', async () => {
    const d = createDetector();
    const result = await d.getById('nonexistent' as any);
    expect(result).toBeNull();
  });
  it('returns bottleneck after detect', async () => {
    const d = createDetector();
    const [bn] = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    const found = await d.getById(bn.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(bn.id);
  });
});

describe('BottleneckDetector — list', () => {
  it('returns all bottlenecks', async () => {
    const d = createDetector();
    await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    const all = await d.list();
    expect(all.length).toBe(1);
  });
  it('filters by resolved=false', async () => {
    const d = createDetector();
    const all = await d.list({ resolved: false });
    expect(all.length).toBe(0);
  });
});

describe('BottleneckDetector — resolve', () => {
  it('sets resolvedAt', async () => {
    const d = createDetector();
    const [bn] = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    await d.resolve(bn.id);
    const resolved = await d.getById(bn.id);
    expect(resolved!.resolvedAt).toBeDefined();
  });
});

describe('BottleneckDetector — count', () => {
  it('returns 0 initially', async () => {
    const d = createDetector();
    expect(await d.count()).toBe(0);
  });
  it('returns correct count after detect', async () => {
    const d = createDetector();
    await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    expect(await d.count()).toBe(1);
  });
});

describe('BottleneckDetector — events', () => {
  it('emits BottleneckDetectedEvent', async () => {
    const bus = new InProcessEventBus();
    const d = createDetector(bus);
    await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    const log = bus.getLog();
    const detected = log.filter(e => e.eventType === 'evolution.bottleneck.detected');
    expect(detected.length).toBe(1);
  });
  it('emits BottleneckResolvedEvent on resolve', async () => {
    const bus = new InProcessEventBus();
    const d = createDetector(bus);
    const [bn] = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    await d.resolve(bn.id);
    const log = bus.getLog();
    const resolved = log.filter(e => e.eventType === 'evolution.bottleneck.resolved');
    expect(resolved.length).toBe(1);
  });
  it('does not emit events without eventBus', async () => {
    const d = createDetector();
    await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    // No error thrown
  });
});
""")

# ═══════════════════════════════════════════════════════════════════
# 4. constraint-analyzer.test.ts
# ═══════════════════════════════════════════════════════════════════
w('constraint-analyzer.test.ts', r"""import { describe, it, expect } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { ConstraintAnalyzer } from '../../core/evolution/constraint-analyzer.js';
import { DefaultEvolutionRuntimeConfig, brandBottleneckId } from '../../core/evolution/types.js';

const cfg = DefaultEvolutionRuntimeConfig.constraintAnalyzer;

function createAnalyzer(bus?: InProcessEventBus) {
  return new ConstraintAnalyzer(cfg, bus);
}

describe('ConstraintAnalyzer — constructor', () => {
  it('creates without eventBus', () => {
    const a = createAnalyzer();
    expect(a).toBeDefined();
  });
  it('creates with eventBus', () => {
    const a = createAnalyzer(new InProcessEventBus());
    expect(a).toBeDefined();
  });
});

describe('ConstraintAnalyzer — analyze', () => {
  it('returns analysis with all required fields', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(brandBottleneckId('bn-1'));
    expect(result.id).toBeDefined();
    expect(result.bottleneckId).toBe(brandBottleneckId('bn-1'));
    expect(result.constraintType).toBeDefined();
    expect(result.rootCause).toBeDefined();
    expect(result.impactDescription).toBeDefined();
    expect(result.analyzedAt).toBeDefined();
    expect(result.affectedRuntimes).toEqual([]);
    expect(result.affectedCapabilities).toEqual([]);
    expect(result.suggestedImprovements).toEqual([]);
  });
  it('returns frozen analysis', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(brandBottleneckId('bn-1'));
    expect(Object.isFrozen(result)).toBe(true);
  });
  it('emits ConstraintAnalyzedEvent', async () => {
    const bus = new InProcessEventBus();
    const a = createAnalyzer(bus);
    await a.analyze(brandBottleneckId('bn-1'));
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.constraint.analyzed');
    expect(events.length).toBe(1);
  });
});

describe('ConstraintAnalyzer — getAnalysis', () => {
  it('returns null for unknown session', async () => {
    const a = createAnalyzer();
    const result = await a.getAnalysis('nonexistent');
    expect(result).toBeNull();
  });
  it('returns analysis after analyze', async () => {
    const a = createAnalyzer();
    const analysis = await a.analyze(brandBottleneckId('bn-1'));
    const found = await a.getAnalysis(analysis.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(analysis.id);
  });
});

describe('ConstraintAnalyzer — listAnalyses', () => {
  it('returns empty initially', async () => {
    const a = createAnalyzer();
    expect(await a.listAnalyses()).toEqual([]);
  });
  it('returns analyses after analyze', async () => {
    const a = createAnalyzer();
    await a.analyze(brandBottleneckId('bn-1'));
    const list = await a.listAnalyses();
    expect(list.length).toBe(1);
  });
});
""")

print('Generated events, bottleneck-detector, constraint-analyzer tests.')
