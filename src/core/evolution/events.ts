/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Domain Events
 * TASK-AIS-008A.000
 *
 * All domain events emitted by the Evolution Runtime.
 * Events are immutable value objects.
 */

import type { Timestamp } from '../types/common.js';
import type {
  BottleneckId, ImprovementId, ExperimentId, KPIId, FeedbackId,
  EvolutionNodeId, TechDebtId, RoadmapId, LearningRecordId,
  BottleneckSeverity, ConstraintType, ImprovementStatus, ExperimentStatus,
  FeedbackSource, FeedbackSentiment, LearningOutcome,
  TechDebtPriority, ArchOptimizationType, ValueDimension,
  EvolutionState,
} from './types.js';
import { EventClassification } from '../types/common.js';

// ═══════════════════════════════════════════════════════════════════
// BOTTLENECK EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface BottleneckDetectedEvent {
  readonly eventType: 'evolution.bottleneck.detected';
  readonly classification: EventClassification;
  readonly bottleneckId: BottleneckId;
  readonly name: string;
  readonly constraintType: ConstraintType;
  readonly severity: BottleneckSeverity;
  readonly targetRuntime: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface BottleneckResolvedEvent {
  readonly eventType: 'evolution.bottleneck.resolved';
  readonly classification: EventClassification;
  readonly bottleneckId: BottleneckId;
  readonly resolvedAt: Timestamp;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTRAINT ANALYSIS EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ConstraintAnalyzedEvent {
  readonly eventType: 'evolution.constraint.analyzed';
  readonly classification: EventClassification;
  readonly bottleneckId: BottleneckId;
  readonly constraintType: ConstraintType;
  readonly rootCause: string;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// IMPROVEMENT EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ImprovementProposedEvent {
  readonly eventType: 'evolution.improvement.proposed';
  readonly classification: EventClassification;
  readonly improvementId: ImprovementId;
  readonly name: string;
  readonly constraintType: ConstraintType;
  readonly valueScore: number;
  readonly priority: number;
  readonly valueDimension: ValueDimension;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ImprovementStatusChangedEvent {
  readonly eventType: 'evolution.improvement.statusChanged';
  readonly classification: EventClassification;
  readonly improvementId: ImprovementId;
  readonly fromStatus: ImprovementStatus;
  readonly toStatus: ImprovementStatus;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ImprovementCompletedEvent {
  readonly eventType: 'evolution.improvement.completed';
  readonly classification: EventClassification;
  readonly improvementId: ImprovementId;
  readonly valueScore: number;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ImprovementRejectedEvent {
  readonly eventType: 'evolution.improvement.rejected';
  readonly classification: EventClassification;
  readonly improvementId: ImprovementId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// VALUE ANALYSIS EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ValueAnalyzedEvent {
  readonly eventType: 'evolution.value.analyzed';
  readonly classification: EventClassification;
  readonly improvementId: ImprovementId;
  readonly valueScore: number;
  readonly valueDimension: ValueDimension;
  readonly valueCreated: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface OpportunityCostAnalyzedEvent {
  readonly eventType: 'evolution.opportunityCost.analyzed';
  readonly classification: EventClassification;
  readonly improvementId: ImprovementId;
  readonly netBenefit: number;
  readonly foregoneCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// EXPERIMENT EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ExperimentStartedEvent {
  readonly eventType: 'evolution.experiment.started';
  readonly classification: EventClassification;
  readonly experimentId: ExperimentId;
  readonly name: string;
  readonly improvementId: ImprovementId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ExperimentCompletedEvent {
  readonly eventType: 'evolution.experiment.completed';
  readonly classification: EventClassification;
  readonly experimentId: ExperimentId;
  readonly winner: 'A' | 'B' | null;
  readonly confidence: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ExperimentFailedEvent {
  readonly eventType: 'evolution.experiment.failed';
  readonly classification: EventClassification;
  readonly experimentId: ExperimentId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// KPI EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface KPIRegisteredEvent {
  readonly eventType: 'evolution.kpi.registered';
  readonly classification: EventClassification;
  readonly kpiId: KPIId;
  readonly name: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface KPIUpdatedEvent {
  readonly eventType: 'evolution.kpi.updated';
  readonly classification: EventClassification;
  readonly kpiId: KPIId;
  readonly newValue: number;
  readonly previousValue: number;
  readonly improved: boolean;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// FEEDBACK EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface FeedbackReceivedEvent {
  readonly eventType: 'evolution.feedback.received';
  readonly classification: EventClassification;
  readonly feedbackId: FeedbackId;
  readonly source: FeedbackSource;
  readonly sentiment: FeedbackSentiment;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface FeedbackProcessedEvent {
  readonly eventType: 'evolution.feedback.processed';
  readonly classification: EventClassification;
  readonly feedbackId: FeedbackId;
  readonly insightCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// LEARNING EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface LearningRecordedEvent {
  readonly eventType: 'evolution.learning.recorded';
  readonly classification: EventClassification;
  readonly recordId: LearningRecordId;
  readonly outcome: LearningOutcome;
  readonly lesson: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// EVOLUTION GRAPH EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface EvolutionNodeAddedEvent {
  readonly eventType: 'evolution.graph.nodeAdded';
  readonly classification: EventClassification;
  readonly nodeId: EvolutionNodeId;
  readonly type: string;
  readonly title: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// TECH DEBT EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface TechDebtDetectedEvent {
  readonly eventType: 'evolution.techDebt.detected';
  readonly classification: EventClassification;
  readonly techDebtId: TechDebtId;
  readonly name: string;
  readonly priority: TechDebtPriority;
  readonly estimatedCost: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface TechDebtResolvedEvent {
  readonly eventType: 'evolution.techDebt.resolved';
  readonly classification: EventClassification;
  readonly techDebtId: TechDebtId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// ARCHITECTURE OPTIMIZER EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ArchOptimizationSuggestedEvent {
  readonly eventType: 'evolution.arch.suggested';
  readonly classification: EventClassification;
  readonly nodeId: EvolutionNodeId;
  readonly type: ArchOptimizationType;
  readonly title: string;
  readonly estimatedImpact: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// ROADMAP EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface RoadmapCreatedEvent {
  readonly eventType: 'evolution.roadmap.created';
  readonly classification: EventClassification;
  readonly roadmapId: RoadmapId;
  readonly title: string;
  readonly itemCount: number;
  readonly totalValue: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// RUNTIME LIFECYCLE EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface EvolutionInitializedEvent {
  readonly eventType: 'evolution.runtime.initialized';
  readonly classification: EventClassification;
  readonly subsystemCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface EvolutionStateChangedEvent {
  readonly eventType: 'evolution.runtime.stateChanged';
  readonly classification: EventClassification;
  readonly fromState: EvolutionState;
  readonly toState: EvolutionState;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface EvolutionAnalysisCompletedEvent {
  readonly eventType: 'evolution.analysis.completed';
  readonly classification: EventClassification;
  readonly bottlenecksFound: number;
  readonly improvementsProposed: number;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// EVENT UNION
// ═══════════════════════════════════════════════════════════════════

export type EvolutionEvent =
  | BottleneckDetectedEvent
  | BottleneckResolvedEvent
  | ConstraintAnalyzedEvent
  | ImprovementProposedEvent
  | ImprovementStatusChangedEvent
  | ImprovementCompletedEvent
  | ImprovementRejectedEvent
  | ValueAnalyzedEvent
  | OpportunityCostAnalyzedEvent
  | ExperimentStartedEvent
  | ExperimentCompletedEvent
  | ExperimentFailedEvent
  | KPIRegisteredEvent
  | KPIUpdatedEvent
  | FeedbackReceivedEvent
  | FeedbackProcessedEvent
  | LearningRecordedEvent
  | EvolutionNodeAddedEvent
  | TechDebtDetectedEvent
  | TechDebtResolvedEvent
  | ArchOptimizationSuggestedEvent
  | RoadmapCreatedEvent
  | EvolutionInitializedEvent
  | EvolutionStateChangedEvent
  | EvolutionAnalysisCompletedEvent;
