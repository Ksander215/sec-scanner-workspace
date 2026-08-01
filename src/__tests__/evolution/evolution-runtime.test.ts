import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { EvolutionRuntime } from '../../core/evolution/evolution-runtime.js';
import { EvolutionNotInitializedError, EvolutionDisposedError } from '../../core/evolution/errors.js';
import { EvolutionState } from '../../core/evolution/types.js';
import { DefaultEvolutionRuntimeConfig } from '../../core/evolution/types.js';

describe('EvolutionRuntime — constructor', () => {
  it('creates instance without args', () => {
    const r = new EvolutionRuntime();
    expect(r).toBeDefined();
  });
  it('creates instance with empty config', () => {
    const r = new EvolutionRuntime({});
    expect(r).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const r = new EvolutionRuntime({}, new InProcessEventBus());
    expect(r).toBeDefined();
  });
  it('creates instance with partial config', () => {
    const r = new EvolutionRuntime({ bottleneckDetector: { maxBottlenecks: 500, scanIntervalMs: 60000, minEvidenceItems: 1 } });
    expect(r).toBeDefined();
  });
  it('initial state is Uninitialized', () => {
    const r = new EvolutionRuntime();
    expect(r.state).toBe(EvolutionState.Uninitialized);
  });
});

describe('EvolutionRuntime — 15 subsystem getters', () => {
  let r: EvolutionRuntime;
  beforeEach(() => { r = new EvolutionRuntime(); });

  it('getBottleneckDetector returns instance', () => {
    expect(r.getBottleneckDetector()).toBeDefined();
  });
  it('getConstraintAnalyzer returns instance', () => {
    expect(r.getConstraintAnalyzer()).toBeDefined();
  });
  it('getImprovementEngine returns instance', () => {
    expect(r.getImprovementEngine()).toBeDefined();
  });
  it('getValueAnalyzer returns instance', () => {
    expect(r.getValueAnalyzer()).toBeDefined();
  });
  it('getOpportunityCostEngine returns instance', () => {
    expect(r.getOpportunityCostEngine()).toBeDefined();
  });
  it('getOptimizationPlanner returns instance', () => {
    expect(r.getOptimizationPlanner()).toBeDefined();
  });
  it('getExperimentRuntime returns instance', () => {
    expect(r.getExperimentRuntime()).toBeDefined();
  });
  it('getKPIRuntime returns instance', () => {
    expect(r.getKPIRuntime()).toBeDefined();
  });
  it('getFeedbackCollector returns instance', () => {
    expect(r.getFeedbackCollector()).toBeDefined();
  });
  it('getLearningLoop returns instance', () => {
    expect(r.getLearningLoop()).toBeDefined();
  });
  it('getEvolutionGraph returns instance', () => {
    expect(r.getEvolutionGraph()).toBeDefined();
  });
  it('getArchitectureOptimizer returns instance', () => {
    expect(r.getArchitectureOptimizer()).toBeDefined();
  });
  it('getTechDebtAnalyzer returns instance', () => {
    expect(r.getTechDebtAnalyzer()).toBeDefined();
  });
  it('getRecommendationPrioritizer returns instance', () => {
    expect(r.getRecommendationPrioritizer()).toBeDefined();
  });
});

describe('EvolutionRuntime — initialize', () => {
  it('transitions Uninitialized → Ready', async () => {
    const r = new EvolutionRuntime();
    expect(r.state).toBe(EvolutionState.Uninitialized);
    await r.initialize();
    expect(r.state).toBe(EvolutionState.Ready);
  });
  it('emits evolution.runtime.initialized event', async () => {
    const bus = new InProcessEventBus();
    const r = new EvolutionRuntime({}, bus);
    await r.initialize();
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.runtime.initialized');
    expect(events.length).toBe(1);
  });
  it('emits evolution.runtime.stateChanged during initialize', async () => {
    const bus = new InProcessEventBus();
    const r = new EvolutionRuntime({}, bus);
    await r.initialize();
    const log = bus.getLog();
    const stateChanges = log.filter(e => e.eventType === 'evolution.runtime.stateChanged');
    expect(stateChanges.length).toBeGreaterThanOrEqual(1);
  });
  it('does not emit events without eventBus', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
  });
});

describe('EvolutionRuntime — shutdown', () => {
  it('transitions to Stopped', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    await r.shutdown();
    expect(r.state).toBe(EvolutionState.Stopped);
  });
  it('sets disposed', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    await r.shutdown();
    // after shutdown, calling analyze should throw disposed
    await expect(r.analyze()).rejects.toThrow(EvolutionDisposedError);
  });
  it('emits stateChanged events during shutdown', async () => {
    const bus = new InProcessEventBus();
    const r = new EvolutionRuntime({}, bus);
    await r.initialize();
    await r.shutdown();
    const log = bus.getLog();
    const stateChanges = log.filter(e => e.eventType === 'evolution.runtime.stateChanged');
    // initialize + shutdown each emit stateChanged
    expect(stateChanges.length).toBeGreaterThanOrEqual(2);
  });
});

describe('EvolutionRuntime — analyze', () => {
  it('returns result with all fields', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const result = await r.analyze();
    expect(result).toBeDefined();
    expect('bottlenecks' in result).toBe(true);
    expect('improvements' in result).toBe(true);
    expect('valueAnalyses' in result).toBe(true);
    expect('opportunityCosts' in result).toBe(true);
    expect('roadmap' in result).toBe(true);
    expect('durationMs' in result).toBe(true);
  });
  it('result is frozen', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const result = await r.analyze();
    expect(Object.isFrozen(result)).toBe(true);
  });
  it('bottlenecks is frozen array', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const result = await r.analyze();
    expect(Object.isFrozen(result.bottlenecks)).toBe(true);
  });
  it('improvements is frozen array', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const result = await r.analyze();
    expect(Object.isFrozen(result.improvements)).toBe(true);
  });
  it('returns empty bottlenecks when no metrics', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const result = await r.analyze();
    expect(result.bottlenecks).toEqual([]);
  });
  it('returns roadmap', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const result = await r.analyze();
    expect(result.roadmap).toBeDefined();
  });
  it('roadmap has items array', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const result = await r.analyze();
    expect(result.roadmap!.items).toBeDefined();
  });
  it('durationMs is non-negative', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const result = await r.analyze();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
  it('emits multiple stateChanged events during analyze', async () => {
    const bus = new InProcessEventBus();
    const r = new EvolutionRuntime({}, bus);
    await r.initialize();
    await r.analyze();
    const log = bus.getLog();
    const stateChanges = log.filter(e => e.eventType === 'evolution.runtime.stateChanged');
    expect(stateChanges.length).toBeGreaterThanOrEqual(2);
  });
  it('emits evolution.analysis.completed event', async () => {
    const bus = new InProcessEventBus();
    const r = new EvolutionRuntime({}, bus);
    await r.initialize();
    await r.analyze();
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.analysis.completed');
    expect(events.length).toBe(1);
  });
  it('analysis completed event has correct envelope fields', async () => {
    const bus = new InProcessEventBus();
    const r = new EvolutionRuntime({}, bus);
    await r.initialize();
    await r.analyze();
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.analysis.completed');
    expect(evt).toBeDefined();
    expect(evt!.eventType).toBe('evolution.analysis.completed');
    expect(evt!.timestamp).toBeDefined();
  });
});

describe('EvolutionRuntime — getMetrics', () => {
  it('returns EvolutionMetrics with correct fields', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const metrics = await r.getMetrics();
    expect('totalBottlenecksDetected' in metrics).toBe(true);
    expect('activeBottlenecks' in metrics).toBe(true);
    expect('resolvedBottlenecks' in metrics).toBe(true);
    expect('totalImprovements' in metrics).toBe(true);
    expect('activeImprovements' in metrics).toBe(true);
    expect('completedImprovements' in metrics).toBe(true);
    expect('failedImprovements' in metrics).toBe(true);
    expect('totalExperiments' in metrics).toBe(true);
    expect('successfulExperiments' in metrics).toBe(true);
    expect('totalKPIs' in metrics).toBe(true);
    expect('kpisImproved' in metrics).toBe(true);
    expect('totalFeedback' in metrics).toBe(true);
    expect('processedFeedback' in metrics).toBe(true);
    expect('totalLearningRecords' in metrics).toBe(true);
    expect('evolutionGraphNodes' in metrics).toBe(true);
    expect('techDebtItems' in metrics).toBe(true);
    expect('resolvedTechDebt' in metrics).toBe(true);
    expect('totalTechDebtCost' in metrics).toBe(true);
    expect('averageImprovementPriority' in metrics).toBe(true);
    expect('lastAnalysisAt' in metrics).toBe(true);
    expect('metadata' in metrics).toBe(true);
  });
  it('metrics is frozen', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const metrics = await r.getMetrics();
    expect(Object.isFrozen(metrics)).toBe(true);
  });
  it('returns zeros initially', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const m = await r.getMetrics();
    expect(m.totalBottlenecksDetected).toBe(0);
    expect(m.totalImprovements).toBe(0);
    expect(m.totalExperiments).toBe(0);
    expect(m.totalKPIs).toBe(0);
    expect(m.totalFeedback).toBe(0);
    expect(m.totalLearningRecords).toBe(0);
    expect(m.evolutionGraphNodes).toBe(0);
    expect(m.techDebtItems).toBe(0);
  });
  it('averageImprovementPriority is 0 when no improvements', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const m = await r.getMetrics();
    expect(m.averageImprovementPriority).toBe(0);
  });
  it('lastAnalysisAt is null initially', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    const m = await r.getMetrics();
    expect(m.lastAnalysisAt).toBeNull();
  });
});

describe('EvolutionRuntime — EvolutionNotInitializedError', () => {
  it('analyze throws before initialize', async () => {
    const r = new EvolutionRuntime();
    await expect(r.analyze()).rejects.toThrow(EvolutionNotInitializedError);
  });
  it('getMetrics throws before initialize', async () => {
    const r = new EvolutionRuntime();
    await expect(r.getMetrics()).rejects.toThrow(EvolutionNotInitializedError);
  });
  it('analyze throws with correct name', async () => {
    const r = new EvolutionRuntime();
    try {
      await r.analyze();
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('EvolutionNotInitializedError');
    }
  });
  it('getMetrics throws with correct name', async () => {
    const r = new EvolutionRuntime();
    try {
      await r.getMetrics();
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('EvolutionNotInitializedError');
    }
  });
});

describe('EvolutionRuntime — EvolutionDisposedError', () => {
  it('analyze throws after shutdown', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    await r.shutdown();
    await expect(r.analyze()).rejects.toThrow(EvolutionDisposedError);
  });
  it('getMetrics succeeds after shutdown (only checks initialized)', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    await r.shutdown();
    // getMetrics only calls assertInitialized, not assertNotDisposed
    const metrics = await r.getMetrics();
    expect(metrics).toBeDefined();
  });
  it('initialize throws after shutdown', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    await r.shutdown();
    await expect(r.initialize()).rejects.toThrow(EvolutionDisposedError);
  });
  it('throws with correct name', async () => {
    const r = new EvolutionRuntime();
    await r.initialize();
    await r.shutdown();
    try {
      await r.analyze();
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('EvolutionDisposedError');
    }
  });
});

describe('EvolutionRuntime — state getter', () => {
  it('returns EvolutionState enum values', () => {
    const r = new EvolutionRuntime();
    expect(typeof r.state).toBe('string');
  });
  it('state is consistent across reads', () => {
    const r = new EvolutionRuntime();
    expect(r.state).toBe(r.state);
  });
});
