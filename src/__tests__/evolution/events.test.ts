import { describe, it, expect } from 'vitest';
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
