/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Orchestrator (#15)
 * TASK-AIS-008A.000
 *
 * Main orchestrator wiring all 15 subsystems together.
 * Conforms to IEvolutionRuntime from contracts.ts.
 */

import type { Timestamp } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  IBottleneckDetector, IConstraintAnalyzer, IImprovementEngine,
  IValueAnalyzer, IOpportunityCostEngine, IOptimizationPlanner,
  IExperimentRuntime, IKPIRuntime, IFeedbackCollector,
  ILearningLoop, IEvolutionGraph, IArchitectureOptimizer,
  ITechDebtAnalyzer, IRecommendationPrioritizer, IEvolutionRuntime,
  EvolutionAnalysisResult,
} from './contracts.js';
import type {
  EvolutionRuntimeConfig, EvolutionMetrics, EvolutionState,
  ValueAnalysis, OpportunityCost, Improvement, ConstraintAnalysis,
} from './types.js';
import { EvolutionState as ES, ImprovementStatus as IS } from './types.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EvolutionNotInitializedError, EvolutionDisposedError } from './errors.js';

import { BottleneckDetector } from './bottleneck-detector.js';
import { ConstraintAnalyzer } from './constraint-analyzer.js';
import { ImprovementEngine } from './improvement-engine.js';
import { ValueAnalyzer } from './value-analyzer.js';
import { OpportunityCostEngine } from './opportunity-cost-engine.js';
import { OptimizationPlanner } from './optimization-planner.js';
import { ExperimentRuntime } from './experiment-runtime.js';
import { KPIRuntime } from './kpi-runtime.js';
import { FeedbackCollector } from './feedback-collector.js';
import { LearningLoop } from './learning-loop.js';
import { EvolutionGraph } from './evolution-graph.js';
import { ArchitectureOptimizer } from './architecture-optimizer.js';
import { TechDebtAnalyzer } from './tech-debt-analyzer.js';
import { RecommendationPrioritizer } from './recommendation-prioritizer.js';

interface Disposable {
  dispose(): void;
}

export class EvolutionRuntime implements IEvolutionRuntime {
  // ─── Subsystems ──────────────────────────────────────────────
  private readonly _bottleneckDetector: BottleneckDetector;
  private readonly _constraintAnalyzer: ConstraintAnalyzer;
  private readonly _improvementEngine: ImprovementEngine;
  private readonly _valueAnalyzer: ValueAnalyzer;
  private readonly _opportunityCostEngine: OpportunityCostEngine;
  private readonly _optimizationPlanner: OptimizationPlanner;
  private readonly _experimentRuntime: ExperimentRuntime;
  private readonly _kpiRuntime: KPIRuntime;
  private readonly _feedbackCollector: FeedbackCollector;
  private readonly _learningLoop: LearningLoop;
  private readonly _evolutionGraph: EvolutionGraph;
  private readonly _architectureOptimizer: ArchitectureOptimizer;
  private readonly _techDebtAnalyzer: TechDebtAnalyzer;
  private readonly _recommendationPrioritizer: RecommendationPrioritizer;

  // ─── Internal State ──────────────────────────────────────────
  private readonly eventBus: InProcessEventBus | null;
  private _state: EvolutionState = ES.Uninitialized;
  private _disposed = false;
  private _lastAnalysisAt: Timestamp | null = null;

  constructor(config: EvolutionRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.eventBus = eventBus ?? null;

    // Create all 15 subsystem instances
    this._bottleneckDetector = new BottleneckDetector(config.bottleneckDetector, this.eventBus);
    this._constraintAnalyzer = new ConstraintAnalyzer(config.constraintAnalyzer, this.eventBus);
    this._improvementEngine = new ImprovementEngine(config.improvementEngine, this.eventBus);
    this._valueAnalyzer = new ValueAnalyzer(config.valueAnalyzer, this.eventBus);
    this._opportunityCostEngine = new OpportunityCostEngine(config.opportunityCost, this.eventBus);
    this._optimizationPlanner = new OptimizationPlanner(config.optimizationPlanner, this.eventBus);
    this._experimentRuntime = new ExperimentRuntime(config.experiment, this.eventBus);
    this._kpiRuntime = new KPIRuntime(config.kpi, this.eventBus);
    this._feedbackCollector = new FeedbackCollector(config.feedbackCollector, this.eventBus);
    this._learningLoop = new LearningLoop(config.learningLoop, this.eventBus);
    this._evolutionGraph = new EvolutionGraph(config.evolutionGraph, this.eventBus);
    this._architectureOptimizer = new ArchitectureOptimizer(config.architectureOptimizer, this.eventBus);
    this._techDebtAnalyzer = new TechDebtAnalyzer(config.techDebt, this.eventBus);
    this._recommendationPrioritizer = new RecommendationPrioritizer(config.prioritizer);

    // Wire cross-references: setImprovementEngine on subsystems that need it
    this._valueAnalyzer.setImprovementEngine(this._improvementEngine);
    this._opportunityCostEngine.setImprovementEngine(this._improvementEngine);
    this._optimizationPlanner.setImprovementEngine(this._improvementEngine);
    this._recommendationPrioritizer.setImprovementEngine(this._improvementEngine);
  }

  get state(): EvolutionState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.assertNotDisposed();

    // Uninitialized → Initializing
    this._state = ES.Initializing;
    await this.publishEvent({
      eventType: 'evolution.runtime.stateChanged',
      classification: EventClassification.StateChange,
      fromState: ES.Uninitialized,
      toState: ES.Initializing,
      timestamp: new Date().toISOString(),
      metadata: Object.freeze({}),
    });

    // Initializing → Ready
    this._state = ES.Ready;
    await this.publishEvent({
      eventType: 'evolution.runtime.stateChanged',
      classification: EventClassification.StateChange,
      fromState: ES.Initializing,
      toState: ES.Ready,
      timestamp: new Date().toISOString(),
      metadata: Object.freeze({}),
    });

    await this.publishEvent({
      eventType: 'evolution.runtime.initialized',
      classification: EventClassification.StateChange,
      subsystemCount: 15,
      timestamp: new Date().toISOString(),
      metadata: Object.freeze({}),
    });
  }

  async shutdown(): Promise<void> {
    this.assertNotDisposed();

    // Current → Stopping
    const prevState = this._state;
    this._state = ES.Stopping;
    await this.publishEvent({
      eventType: 'evolution.runtime.stateChanged',
      classification: EventClassification.StateChange,
      fromState: prevState,
      toState: ES.Stopping,
      timestamp: new Date().toISOString(),
      metadata: Object.freeze({}),
    });

    // Dispose all subsystems
    const subsystems: unknown[] = [
      this._bottleneckDetector,
      this._constraintAnalyzer,
      this._improvementEngine,
      this._valueAnalyzer,
      this._opportunityCostEngine,
      this._optimizationPlanner,
      this._experimentRuntime,
      this._kpiRuntime,
      this._feedbackCollector,
      this._learningLoop,
      this._evolutionGraph,
      this._architectureOptimizer,
      this._techDebtAnalyzer,
      this._recommendationPrioritizer,
    ];
    for (const s of subsystems) {
      if (typeof (s as Disposable).dispose === 'function') {
        try { (s as Disposable).dispose(); } catch { /* best-effort */ }
      }
    }

    // Stopping → Stopped
    this._state = ES.Stopped;
    await this.publishEvent({
      eventType: 'evolution.runtime.stateChanged',
      classification: EventClassification.StateChange,
      fromState: ES.Stopping,
      toState: ES.Stopped,
      timestamp: new Date().toISOString(),
      metadata: Object.freeze({}),
    });

    this._disposed = true;
  }

  async analyze(): Promise<EvolutionAnalysisResult> {
    this.assertInitialized();
    this.assertNotDisposed();

    const startMs = Date.now();

    // Ready → Analyzing
    this._state = ES.Analyzing;
    await this.publishEvent({
      eventType: 'evolution.runtime.stateChanged',
      classification: EventClassification.StateChange,
      fromState: ES.Ready,
      toState: ES.Analyzing,
      timestamp: new Date().toISOString(),
      metadata: Object.freeze({}),
    });

    // Step 1: Detect bottlenecks
    const bottlenecks = await this._bottleneckDetector.detect({});

    // Step 2: Analyze constraints for each bottleneck
    const constraintAnalyses: ConstraintAnalysis[] = [];
    for (const b of bottlenecks) {
      const ca = await this._constraintAnalyzer.analyze(b.id);
      constraintAnalyses.push(ca);
    }

    // Step 3: Propose improvements for each bottleneck
    const improvements: Improvement[] = [];
    for (const b of bottlenecks) {
      const imp = await this._improvementEngine.propose({
        name: `Fix: ${b.name}`,
        description: `Address bottleneck: ${b.description}`,
        bottleneckId: b.id,
        constraintType: b.constraintType,
        targetRuntime: b.targetRuntime,
        targetCapability: b.targetCapability,
        estimatedEffort: 'medium',
        evidence: b.evidence,
        metadata: Object.freeze({}),
      });
      improvements.push(imp);
    }

    // Step 4: Analyze value for top improvements
    const valueAnalyses: ValueAnalysis[] = [];
    for (const imp of improvements.slice(0, 10)) {
      const va = await this._valueAnalyzer.analyze(imp.id);
      valueAnalyses.push(va);
    }

    // Step 5: Calculate opportunity costs for top improvements
    const opportunityCosts: OpportunityCost[] = [];
    for (const imp of improvements.slice(0, 5)) {
      const oc = await this._opportunityCostEngine.analyze(imp.id);
      opportunityCosts.push(oc);
    }

    // Step 6: Prioritize improvements
    const prioritized = await this._recommendationPrioritizer.prioritize(improvements);

    // Step 7: Generate roadmap
    const roadmap = await this._optimizationPlanner.generateRoadmap();

    // Analyzing → Ready
    this._state = ES.Ready;
    const now: Timestamp = new Date().toISOString();
    this._lastAnalysisAt = now;

    await this.publishEvent({
      eventType: 'evolution.runtime.stateChanged',
      classification: EventClassification.StateChange,
      fromState: ES.Analyzing,
      toState: ES.Ready,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    const durationMs = Date.now() - startMs;
    await this.publishEvent({
      eventType: 'evolution.analysis.completed',
      classification: EventClassification.Result,
      bottlenecksFound: bottlenecks.length,
      improvementsProposed: improvements.length,
      durationMs,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    return Object.freeze({
      bottlenecks: Object.freeze(bottlenecks),
      improvements: Object.freeze(prioritized),
      valueAnalyses: Object.freeze(valueAnalyses),
      opportunityCosts: Object.freeze(opportunityCosts),
      roadmap,
      durationMs,
    });
  }

  async getMetrics(): Promise<EvolutionMetrics> {
    this.assertInitialized();
    this.assertNotDisposed();

    const [
      bnList,
      impList,
      expList,
      kpiList,
      fbList,
      lrList,
      graphCount,
      tdList,
      totalTechDebtCost,
    ] = await Promise.all([
      this._bottleneckDetector.list(),
      this._improvementEngine.list(),
      this._experimentRuntime.list(),
      this._kpiRuntime.list(),
      this._feedbackCollector.list(),
      this._learningLoop.list(),
      this._evolutionGraph.count(),
      this._techDebtAnalyzer.list(),
      this._techDebtAnalyzer.getTotalCost(),
    ]);

    const totalBottlenecks = bnList.length;
    const resolvedBottlenecks = bnList.filter(b => b.resolvedAt !== null).length;

    return Object.freeze({
      totalBottlenecksDetected: totalBottlenecks,
      activeBottlenecks: totalBottlenecks - resolvedBottlenecks,
      resolvedBottlenecks,
      totalImprovements: impList.length,
      activeImprovements: impList.filter(i => i.status === IS.InProgress).length,
      completedImprovements: impList.filter(i => i.status === IS.Completed).length,
      failedImprovements: impList.filter(i => i.status === IS.Failed).length,
      totalExperiments: expList.length,
      successfulExperiments: expList.filter(e => e.status === 'Completed').length,
      totalKPIs: kpiList.length,
      kpisImproved: 0,
      totalFeedback: fbList.length,
      processedFeedback: fbList.filter(f => f.processed).length,
      totalLearningRecords: lrList.length,
      evolutionGraphNodes: graphCount,
      techDebtItems: tdList.length,
      resolvedTechDebt: tdList.filter(t => t.resolvedAt !== null).length,
      totalTechDebtCost,
      averageImprovementPriority: impList.length > 0
        ? impList.reduce((s, i) => s + i.priority, 0) / impList.length
        : 0,
      lastAnalysisAt: this._lastAnalysisAt,
      metadata: Object.freeze({}),
    });
  }

  // ─── Subsystem Getters ──────────────────────────────────────
  getBottleneckDetector(): IBottleneckDetector { return this._bottleneckDetector; }
  getConstraintAnalyzer(): IConstraintAnalyzer { return this._constraintAnalyzer; }
  getImprovementEngine(): IImprovementEngine { return this._improvementEngine; }
  getValueAnalyzer(): IValueAnalyzer { return this._valueAnalyzer; }
  getOpportunityCostEngine(): IOpportunityCostEngine { return this._opportunityCostEngine; }
  getOptimizationPlanner(): IOptimizationPlanner { return this._optimizationPlanner; }
  getExperimentRuntime(): IExperimentRuntime { return this._experimentRuntime; }
  getKPIRuntime(): IKPIRuntime { return this._kpiRuntime; }
  getFeedbackCollector(): IFeedbackCollector { return this._feedbackCollector; }
  getLearningLoop(): ILearningLoop { return this._learningLoop; }
  getEvolutionGraph(): IEvolutionGraph { return this._evolutionGraph; }
  getArchitectureOptimizer(): IArchitectureOptimizer { return this._architectureOptimizer; }
  getTechDebtAnalyzer(): ITechDebtAnalyzer { return this._techDebtAnalyzer; }
  getRecommendationPrioritizer(): IRecommendationPrioritizer { return this._recommendationPrioritizer; }

  // ─── Internal ───────────────────────────────────────────────
  private assertInitialized(): void {
    if (this._state === ES.Uninitialized) throw new EvolutionNotInitializedError();
  }

  private assertNotDisposed(): void {
    if (this._disposed) throw new EvolutionDisposedError();
  }

  private async publishEvent(
    event: Record<string, unknown>,
  ): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: 'evolution-runtime',
      aggregateType: 'EvolutionRuntime',
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
