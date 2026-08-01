/*
 * Evolution & Continuous Improvement Runtime (ECIR) — Orchestrator (#15)
 * TASK-AIS-008A.000
 *
 * Main orchestrator wiring all 15 subsystems together.
 * Conforms to IEvolutionRuntime from contracts.ts.
 */

import type { EventBus } from '../events/event-bus.js';
import type { EvolutionRuntimeConfig, EvolutionMetrics, EvolutionState } from './types.js';
import { EvolutionState as ES } from './types.js';
import type {
  IBottleneckDetector, IConstraintAnalyzer, IImprovementEngine,
  IValueAnalyzer, IOpportunityCostEngine, IOptimizationPlanner,
  IExperimentRuntime, IKPIRuntime, IFeedbackCollector,
  ILearningLoop, IEvolutionGraph, IArchitectureOptimizer,
  ITechDebtAnalyzer, IRecommendationPrioritizer, IEvolutionRuntime,
  EvolutionAnalysisResult,
} from './contracts.js';
import type { ValueAnalysis, OpportunityCost } from './types.js';
import { EvolutionNotInitializedError, EvolutionDisposedError } from './errors.js';
import type { EvolutionInitializedEvent, EvolutionStateChangedEvent, EvolutionAnalysisCompletedEvent } from './events.js';
import { EventClassification } from '../types/common.js';
import { DefaultEvolutionRuntimeConfig } from './types.js';

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
import { TechnicalDebtAnalyzer } from './tech-debt-analyzer.js';
import { RecommendationPrioritizer } from './recommendation-prioritizer.js';

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
  private readonly _techDebtAnalyzer: TechnicalDebtAnalyzer;
  private readonly _recommendationPrioritizer: RecommendationPrioritizer;

  // ─── Internal State ──────────────────────────────────────────
  private readonly eventBus: EventBus | undefined;
  private _state: EvolutionState = ES.Uninitialized;
  private _disposed = false;

  constructor(config?: Partial<EvolutionRuntimeConfig>, eventBus?: EventBus) {
    const cfg = { ...DefaultEvolutionRuntimeConfig, ...config };
    this.eventBus = eventBus;

    this._bottleneckDetector = new BottleneckDetector(cfg.bottleneckDetector, this.eventBus);
    this._constraintAnalyzer = new ConstraintAnalyzer(cfg.constraintAnalyzer, this.eventBus);
    this._improvementEngine = new ImprovementEngine(cfg.improvementEngine, this.eventBus);
    this._valueAnalyzer = new ValueAnalyzer(cfg.valueAnalyzer, this.eventBus);
    this._opportunityCostEngine = new OpportunityCostEngine(cfg.opportunityCost, this.eventBus);
    this._optimizationPlanner = new OptimizationPlanner(cfg.optimizationPlanner, this.eventBus);
    this._experimentRuntime = new ExperimentRuntime(cfg.experiment, this.eventBus);
    this._kpiRuntime = new KPIRuntime(cfg.kpi, this.eventBus);
    this._feedbackCollector = new FeedbackCollector(cfg.feedbackCollector, this.eventBus);
    this._learningLoop = new LearningLoop(cfg.learningLoop, this.eventBus);
    this._evolutionGraph = new EvolutionGraph(cfg.evolutionGraph, this.eventBus);
    this._architectureOptimizer = new ArchitectureOptimizer(cfg.architectureOptimizer, this.eventBus);
    this._techDebtAnalyzer = new TechnicalDebtAnalyzer(cfg.techDebt, this.eventBus);
    this._recommendationPrioritizer = new RecommendationPrioritizer(cfg.prioritizer);
  }

  get state(): EvolutionState { return this._state; }

  assertNotDisposed(): void {
    if (this._disposed) throw new EvolutionDisposedError();
  }

  async initialize(): Promise<void> {
    this.assertNotDisposed();
    this.transitionState(ES.Initializing, ES.Ready);
    void this.publishEvent<EvolutionInitializedEvent>({
      eventType: 'evolution.runtime.initialized',
      classification: EventClassification.StateChange,
      subsystemCount: 15,
      timestamp: new Date().toISOString(),
      metadata: Object.freeze({}),
    });
  }

  async shutdown(): Promise<void> {
    this.assertNotDisposed();
    this.transitionState(this._state, ES.Stopped);
    this._disposed = true;
  }

  async analyze(): Promise<EvolutionAnalysisResult> {
    this.assertInitialized();
    this.assertNotDisposed();
    const startMs = Date.now();
    this.transitionState(this._state, ES.Analyzing);

    // Step 1: Detect bottlenecks
    const bottlenecks = await this._bottleneckDetector.detect({});

    // Step 2: Create improvements for each bottleneck
    const improvements: Awaited<ReturnType<typeof this._improvementEngine.propose>>[] = [];
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

    // Step 3: Prioritize improvements
    const prioritized = await this._recommendationPrioritizer.prioritize(improvements);

    // Step 4: Analyze value for top improvements
    const valueAnalyses: ValueAnalysis[] = [];
    for (const imp of prioritized.slice(0, 10)) {
      const va = await this._valueAnalyzer.analyze(imp.id);
      valueAnalyses.push(va);
    }

    // Step 5: Analyze opportunity costs
    const opportunityCosts: OpportunityCost[] = [];
    for (const imp of prioritized.slice(0, 5)) {
      const oc = await this._opportunityCostEngine.analyze(imp.id);
      opportunityCosts.push(oc);
    }

    // Step 6: Generate roadmap
    this._optimizationPlanner.setImprovements(prioritized);
    const roadmap = await this._optimizationPlanner.generateRoadmap();

    this.transitionState(ES.Analyzing, ES.Ready);

    const durationMs = Date.now() - startMs;
    void this.publishEvent<EvolutionAnalysisCompletedEvent>({
      eventType: 'evolution.analysis.completed',
      classification: EventClassification.Result,
      bottlenecksFound: bottlenecks.length,
      timestamp: new Date().toISOString(),
      improvementsProposed: improvements.length,
      durationMs,
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
    const [bnCount, impList, expList, kpiList, fbList, lrList, graphCount, tdList] = await Promise.all([
      this._bottleneckDetector.count(),
      this._improvementEngine.list(),
      this._experimentRuntime.list(),
      this._kpiRuntime.list(),
      this._feedbackCollector.list(),
      this._learningLoop.list(),
      this._evolutionGraph.count(),
      this._techDebtAnalyzer.list(),
    ]);
    const activeBN = bnCount - (await this._bottleneckDetector.list({ resolved: true })).length;
    return Object.freeze({
      totalBottlenecksDetected: bnCount,
      activeBottlenecks: activeBN,
      resolvedBottlenecks: bnCount - activeBN,
      totalImprovements: impList.length,
      activeImprovements: impList.filter(i => i.status === 'InProgress').length,
      completedImprovements: impList.filter(i => i.status === 'Completed').length,
      failedImprovements: impList.filter(i => i.status === 'Failed').length,
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
      totalTechDebtCost: 0,
      averageImprovementPriority: impList.length > 0
        ? impList.reduce((s, i) => s + i.priority, 0) / impList.length : 0,
      lastAnalysisAt: null,
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

  private transitionState(from: EvolutionState, to: EvolutionState): void {
    this._state = to;
    void this.publishEvent<EvolutionStateChangedEvent>({
      eventType: 'evolution.runtime.stateChanged',
      classification: EventClassification.StateChange,
      fromState: from,
      timestamp: new Date().toISOString(),
      toState: to,
      metadata: Object.freeze({}),
    });
  }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        aggregateId: 'evolution-runtime', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}