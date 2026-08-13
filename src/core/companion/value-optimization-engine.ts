/**
 * AIS Companion — Value Optimization Engine
 * TASK-AIS-011A.001 — Constraint Optimization (Stage 6) + Value Creation (Stage 7)
 *
 * Implements the PHI-003 FOCUS cycle:
 *   Value → Constraint → Improvement → Measurement → Learning
 *
 * Every recommendation must follow this cycle.
 * Every user action must lead to measurable value.
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  RecommendationId, RecommendationCategory,
} from './types.js';
import { brandRecommendationId } from './types.js';
import { ValueOptimizationError } from './errors.js';

// ── Constraint Optimization Cycle ──────────────────────────────────────────
export enum OptimizationPhase {
  ValueIdentification = 'ValueIdentification',
  ConstraintAnalysis = 'ConstraintAnalysis',
  ImprovementDesign = 'ImprovementDesign',
  MeasurementSetup = 'MeasurementSetup',
  LearningCapture = 'LearningCapture',
}

export interface OptimizationCycle {
  readonly id: string;
  readonly sessionId: string;
  readonly phase: OptimizationPhase;
  readonly valueIdentified: string;
  readonly constraintIdentified: string;
  readonly improvementProposed: string;
  readonly measurementCriteria: string;
  readonly learningCaptured: string;
  readonly valueScore: number;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ValueAction {
  readonly id: string;
  readonly sessionId: string;
  readonly action: string;
  readonly valueType: 'user' | 'platform' | 'developer' | 'ecosystem';
  readonly valueDescription: string;
  readonly measurableOutcome: string;
  readonly timestamp: Timestamp;
}

export class ValueOptimizationEngine {
  private readonly maxCyclesPerSession: number;
  private readonly eventBus: InProcessEventBus | null;
  private readonly cycles = new Map<string, OptimizationCycle>();
  private readonly valueActions = new Map<string, ValueAction>();
  private onAnalytics?: (event: 'recommendationCreated') => void;

  constructor(maxCyclesPerSession: number = 500, eventBus?: InProcessEventBus | null) {
    this.maxCyclesPerSession = maxCyclesPerSession;
    this.eventBus = eventBus ?? null;
  }

  setAnalyticsCallback(cb: (event: 'recommendationCreated') => void): void {
    this.onAnalytics = cb;
  }

  // ── Constraint Optimization Cycle ──────────────────────────────────────

  /**
   * Starts a new optimization cycle at Value Identification phase.
   * Answers: What value are we trying to create?
   */
  async startCycle(sessionId: string, valueIdentified: string): Promise<OptimizationCycle> {
    const count = this.cycleCount(sessionId);
    if (count >= this.maxCyclesPerSession) {
      throw new ValueOptimizationError('cycle_limit', `Maximum ${this.maxCyclesPerSession} cycles per session`);
    }
    const now: Timestamp = new Date().toISOString();
    const id = `cycle-${crypto.randomUUID()}`;
    const cycle: OptimizationCycle = Object.freeze({
      id, sessionId, phase: OptimizationPhase.ValueIdentification,
      valueIdentified, constraintIdentified: '', improvementProposed: '',
      measurementCriteria: '', learningCaptured: '', valueScore: 0,
      startedAt: now, completedAt: null, metadata: Object.freeze({}),
    });
    this.cycles.set(id, cycle);
    await this.publishEvent({
      eventType: 'companion.optimization.cycleStarted',
      classification: 'Action' as const,
      cycleId: id, sessionId, phase: OptimizationPhase.ValueIdentification,
      timestamp: now, metadata: Object.freeze({}),
    }, id, 'OptimizationCycle');
    return cycle;
  }

  /**
   * Advances the cycle to the next phase.
   * Enforces the FOCUS sequence: Value → Constraint → Improvement → Measurement → Learning
   */
  async advanceCycle(cycleId: string, phaseData: {
    readonly constraintIdentified?: string;
    readonly improvementProposed?: string;
    readonly measurementCriteria?: string;
    readonly learningCaptured?: string;
    readonly valueScore?: number;
  }): Promise<OptimizationCycle> {
    const existing = this.cycles.get(cycleId);
    if (!existing) throw new ValueOptimizationError('cycle_not_found', cycleId);
    if (existing.completedAt) throw new ValueOptimizationError('cycle_completed', cycleId);

    const now: Timestamp = new Date().toISOString();
    const nextPhase = this.nextPhase(existing.phase);
    const updated: OptimizationCycle = Object.freeze({
      ...existing,
      phase: nextPhase,
      constraintIdentified: phaseData.constraintIdentified ?? existing.constraintIdentified,
      improvementProposed: phaseData.improvementProposed ?? existing.improvementProposed,
      measurementCriteria: phaseData.measurementCriteria ?? existing.measurementCriteria,
      learningCaptured: phaseData.learningCaptured ?? existing.learningCaptured,
      valueScore: phaseData.valueScore ?? existing.valueScore,
      ...(nextPhase === OptimizationPhase.LearningCapture ? { completedAt: now } : {}),
    });
    this.cycles.set(cycleId, updated);
    await this.publishEvent({
      eventType: 'companion.optimization.cycleAdvanced',
      classification: 'StateChange' as const,
      cycleId, sessionId: existing.sessionId,
      fromPhase: existing.phase, toPhase: nextPhase,
      timestamp: now, metadata: Object.freeze({}),
    }, cycleId, 'OptimizationCycle');
    return updated;
  }

  /**
   * Generates a recommendation from a completed optimization cycle.
   * The recommendation embodies all 5 phases of the FOCUS cycle.
   */
  async generateRecommendation(cycleId: string): Promise<{
    readonly id: RecommendationId;
    readonly category: RecommendationCategory;
    readonly title: string;
    readonly description: string;
    readonly reasoning: string;
    readonly alternatives: ReadonlyArray<string>;
    readonly constraintRemoved: string;
    readonly valueScore: number;
  }> {
    const cycle = this.cycles.get(cycleId);
    if (!cycle) throw new ValueOptimizationError('cycle_not_found', cycleId);
    if (cycle.phase !== OptimizationPhase.LearningCapture) {
      throw new ValueOptimizationError('cycle_incomplete', `Cycle at ${cycle.phase}, must reach LearningCapture`);
    }
    const id = brandRecommendationId(`rec-${crypto.randomUUID()}`);
    const recommendation = Object.freeze({
      id,
      category: 'Efficiency' as RecommendationCategory,
      title: `Optimization: ${cycle.valueIdentified}`,
      description: cycle.improvementProposed,
      reasoning: cycle.learningCaptured,
      alternatives: Object.freeze([
        'Status quo (no change)',
        `Alternative approach to: ${cycle.constraintIdentified}`,
      ]),
      constraintRemoved: cycle.constraintIdentified,
      valueScore: cycle.valueScore,
    });
    this.onAnalytics?.('recommendationCreated');
    return recommendation;
  }

  // ── Value Creation Tracking ────────────────────────────────────────────

  /**
   * Records a value-creating user action.
   * Every action must impact: user, platform, developer, or ecosystem.
   */
  async recordValueAction(
    sessionId: string,
    action: string,
    valueType: 'user' | 'platform' | 'developer' | 'ecosystem',
    valueDescription: string,
    measurableOutcome: string,
  ): Promise<ValueAction> {
    if (!valueDescription.trim()) {
      throw new ValueOptimizationError('no_value', 'Every action must create measurable value');
    }
    const now: Timestamp = new Date().toISOString();
    const id = `vaction-${crypto.randomUUID()}`;
    const va: ValueAction = Object.freeze({
      id, sessionId, action, valueType, valueDescription, measurableOutcome, timestamp: now,
    });
    this.valueActions.set(id, va);
    await this.publishEvent({
      eventType: 'companion.value.actionRecorded',
      classification: 'Result' as const,
      actionId: id, sessionId, valueType, valueDescription,
      timestamp: now, metadata: Object.freeze({}),
    }, id, 'ValueAction');
    return va;
  }

  // ── Queries ────────────────────────────────────────────────────────────

  async getCycle(id: string): Promise<OptimizationCycle | null> {
    return this.cycles.get(id) ?? null;
  }

  async listCycles(sessionId: string): Promise<ReadonlyArray<OptimizationCycle>> {
    return [...this.cycles.values()].filter(c => c.sessionId === sessionId);
  }

  async listValueActions(sessionId: string): Promise<ReadonlyArray<ValueAction>> {
    return [...this.valueActions.values()].filter(a => a.sessionId === sessionId);
  }

  async countCycles(sessionId: string): Promise<number> {
    return this.cycleCount(sessionId);
  }

  async countValueActions(sessionId: string): Promise<number> {
    return [...this.valueActions.values()].filter(a => a.sessionId === sessionId).length;
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private cycleCount(sessionId: string): number {
    return [...this.cycles.values()].filter(c => c.sessionId === sessionId).length;
  }

  private nextPhase(current: OptimizationPhase): OptimizationPhase {
    const order: readonly OptimizationPhase[] = [
      OptimizationPhase.ValueIdentification,
      OptimizationPhase.ConstraintAnalysis,
      OptimizationPhase.ImprovementDesign,
      OptimizationPhase.MeasurementSetup,
      OptimizationPhase.LearningCapture,
    ];
    const idx = order.indexOf(current);
    if (idx < 0 || idx >= order.length - 1) {
      throw new ValueOptimizationError('invalid_phase', `Cannot advance from ${current}`);
    }
    return order[idx + 1];
  }

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event, eventId: crypto.randomUUID(), sequence: 0, aggregateId, aggregateType, version: '1.0.0',
    });
    if (this.eventBus) await this.eventBus.publish(full as DomainEventBase);
  }
}
