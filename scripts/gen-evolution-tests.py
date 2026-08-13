#!/usr/bin/env python3
"""Generate all ECIR test files — 1500+ tests."""
import os

BASE = '/home/z/my-project/src/__tests__/evolution'

def w(path, content):
    full = os.path.join(BASE, path)
    with open(full, 'w') as f:
        f.write(content)
    print(f'  wrote {path} ({content.count("it(")}, tests)')

# ═══════════════════════════════════════════════════════════════════
# 1. types-errors.test.ts
# ═══════════════════════════════════════════════════════════════════
w('types-errors.test.ts', r"""import { describe, it, expect } from 'vitest';
import {
  brandBottleneckId, brandImprovementId, brandExperimentId, brandKPIId,
  brandFeedbackId, brandEvolutionNodeId, brandTechDebtId, brandRecommendationId,
  brandEvolutionSessionId, brandRoadmapId, brandLearningRecordId,
  ConstraintType, BottleneckScope, BottleneckSeverity, ImprovementStatus,
  ExperimentStatus, KPDirection, FeedbackSource, FeedbackSentiment,
  LearningOutcome, TechDebtPriority, ArchOptimizationType, EvolutionState,
  RoadmapItemStatus, ValueDimension, DefaultEvolutionRuntimeConfig,
} from '../../core/evolution/types.js';
import {
  EvolutionError, BottleneckNotFoundError, BottleneckLimitExceededError,
  ImprovementNotFoundError, ImprovementLimitExceededError, ImprovementStateError,
  ExperimentNotFoundError, ExperimentLimitExceededError, ExperimentStateError,
  ExperimentTimeoutError, ValueAnalysisError, NoValueProofError,
  OptimizationWithoutValueError, LocalOptimizationError,
  PINotFoundError, PILimitExceededError,
  FeedbackNotFoundError, FeedbackLimitExceededError,
  LearningRecordNotFoundError, EvolutionGraphError,
  GraphNodeLimitExceededError, TechDebtNotFoundError, TechDebtLimitExceededError,
  ArchitectureAnalysisError, RoadmapLimitExceededError,
  EvolutionRuntimeError, EvolutionNotInitializedError, EvolutionDisposedError,
  ConstraintAnalysisError, OpportunityCostError,
} from '../../core/evolution/errors.js';

const ts = () => new Date().toISOString();
const meta = () => Object.freeze({ key: 'value' });

// ═══════════════════════════════════════════════════════════════════
describe('ECIR Types — Branded ID Functions', () => {
  it('brandBottleneckId returns a string', () => {
    const id = brandBottleneckId('bn-1');
    expect(typeof id).toBe('string');
    expect(id).toBe('bn-1');
  });
  it('brandImprovementId returns a string', () => {
    const id = brandImprovementId('imp-1');
    expect(typeof id).toBe('string');
  });
  it('brandExperimentId returns a string', () => {
    const id = brandExperimentId('exp-1');
    expect(typeof id).toBe('string');
  });
  it('brandKPIId returns a string', () => {
    const id = brandKPIId('kpi-1');
    expect(typeof id).toBe('string');
  });
  it('brandFeedbackId returns a string', () => {
    const id = brandFeedbackId('fb-1');
    expect(typeof id).toBe('string');
  });
  it('brandEvolutionNodeId returns a string', () => {
    const id = brandEvolutionNodeId('node-1');
    expect(typeof id).toBe('string');
  });
  it('brandTechDebtId returns a string', () => {
    const id = brandTechDebtId('td-1');
    expect(typeof id).toBe('string');
  });
  it('brandRecommendationId returns a string', () => {
    const id = brandRecommendationId('rec-1');
    expect(typeof id).toBe('string');
  });
  it('brandEvolutionSessionId returns a string', () => {
    const id = brandEvolutionSessionId('sess-1');
    expect(typeof id).toBe('string');
  });
  it('brandRoadmapId returns a string', () => {
    const id = brandRoadmapId('rm-1');
    expect(typeof id).toBe('string');
  });
  it('brandLearningRecordId returns a string', () => {
    const id = brandLearningRecordId('lr-1');
    expect(typeof id).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('ECIR Types — Enums', () => {
  // ConstraintType
  it('ConstraintType has 13 values', () => {
    expect(Object.keys(ConstraintType).length).toBe(13);
  });
  it('ConstraintType.Performance is correct', () => { expect(ConstraintType.Performance).toBe('Performance'); });
  it('ConstraintType.Quality is correct', () => { expect(ConstraintType.Quality).toBe('Quality'); });
  it('ConstraintType.UX is correct', () => { expect(ConstraintType.UX).toBe('UX'); });
  it('ConstraintType.Knowledge is correct', () => { expect(ConstraintType.Knowledge).toBe('Knowledge'); });
  it('ConstraintType.Memory is correct', () => { expect(ConstraintType.Memory).toBe('Memory'); });
  it('ConstraintType.Reasoning is correct', () => { expect(ConstraintType.Reasoning).toBe('Reasoning'); });
  it('ConstraintType.Architecture is correct', () => { expect(ConstraintType.Architecture).toBe('Architecture'); });
  it('ConstraintType.DeveloperExperience is correct', () => { expect(ConstraintType.DeveloperExperience).toBe('DeveloperExperience'); });
  it('ConstraintType.Documentation is correct', () => { expect(ConstraintType.Documentation).toBe('Documentation'); });
  it('ConstraintType.Marketing is correct', () => { expect(ConstraintType.Marketing).toBe('Marketing'); });
  it('ConstraintType.Sales is correct', () => { expect(ConstraintType.Sales).toBe('Sales'); });
  it('ConstraintType.Business is correct', () => { expect(ConstraintType.Business).toBe('Business'); });
  it('ConstraintType.Learning is correct', () => { expect(ConstraintType.Learning).toBe('Learning'); });

  // BottleneckScope
  it('BottleneckScope has 5 values', () => {
    expect(Object.keys(BottleneckScope).length).toBe(5);
  });
  it('BottleneckScope.Platform is correct', () => { expect(BottleneckScope.Platform).toBe('Platform'); });
  it('BottleneckScope.Runtime is correct', () => { expect(BottleneckScope.Runtime).toBe('Runtime'); });
  it('BottleneckScope.Capability is correct', () => { expect(BottleneckScope.Capability).toBe('Capability'); });
  it('BottleneckScope.Workflow is correct', () => { expect(BottleneckScope.Workflow).toBe('Workflow'); });
  it('BottleneckScope.User is correct', () => { expect(BottleneckScope.User).toBe('User'); });

  // BottleneckSeverity
  it('BottleneckSeverity has 4 values', () => {
    expect(Object.keys(BottleneckSeverity).length).toBe(4);
  });
  it('BottleneckSeverity.Low is correct', () => { expect(BottleneckSeverity.Low).toBe('Low'); });
  it('BottleneckSeverity.Medium is correct', () => { expect(BottleneckSeverity.Medium).toBe('Medium'); });
  it('BottleneckSeverity.High is correct', () => { expect(BottleneckSeverity.High).toBe('High'); });
  it('BottleneckSeverity.Critical is correct', () => { expect(BottleneckSeverity.Critical).toBe('Critical'); });

  // ImprovementStatus
  it('ImprovementStatus has 7 values', () => { expect(Object.keys(ImprovementStatus).length).toBe(7); });
  it('ImprovementStatus.Proposed is correct', () => { expect(ImprovementStatus.Proposed).toBe('Proposed'); });
  it('ImprovementStatus.Planned is correct', () => { expect(ImprovementStatus.Planned).toBe('Planned'); });
  it('ImprovementStatus.InProgress is correct', () => { expect(ImprovementStatus.InProgress).toBe('InProgress'); });
  it('ImprovementStatus.Completed is correct', () => { expect(ImprovementStatus.Completed).toBe('Completed'); });
  it('ImprovementStatus.Failed is correct', () => { expect(ImprovementStatus.Failed).toBe('Failed'); });
  it('ImprovementStatus.Rejected is correct', () => { expect(ImprovementStatus.Rejected).toBe('Rejected'); });
  it('ImprovementStatus.RolledBack is correct', () => { expect(ImprovementStatus.RolledBack).toBe('RolledBack'); });

  // ExperimentStatus
  it('ExperimentStatus has 6 values', () => { expect(Object.keys(ExperimentStatus).length).toBe(6); });
  it('ExperimentStatus.Proposed is correct', () => { expect(ExperimentStatus.Proposed).toBe('Proposed'); });
  it('ExperimentStatus.Running is correct', () => { expect(ExperimentStatus.Running).toBe('Running'); });
  it('ExperimentStatus.Completed is correct', () => { expect(ExperimentStatus.Completed).toBe('Completed'); });
  it('ExperimentStatus.Failed is correct', () => { expect(ExperimentStatus.Failed).toBe('Failed'); });
  it('ExperimentStatus.Cancelled is correct', () => { expect(ExperimentStatus.Cancelled).toBe('Cancelled'); });
  it('ExperimentStatus.Inconclusive is correct', () => { expect(ExperimentStatus.Inconclusive).toBe('Inconclusive'); });

  // KPDirection
  it('KPDirection has 3 values', () => { expect(Object.keys(KPDirection).length).toBe(3); });
  it('KPDirection.HigherIsBetter is correct', () => { expect(KPDirection.HigherIsBetter).toBe('HigherIsBetter'); });
  it('KPDirection.LowerIsBetter is correct', () => { expect(KPDirection.LowerIsBetter).toBe('LowerIsBetter'); });
  it('KPDirection.TargetIsOptimal is correct', () => { expect(KPDirection.TargetIsOptimal).toBe('TargetIsOptimal'); });

  // FeedbackSource
  it('FeedbackSource has 9 values', () => { expect(Object.keys(FeedbackSource).length).toBe(9); });
  it('FeedbackSource.User is correct', () => { expect(FeedbackSource.User).toBe('User'); });
  it('FeedbackSource.Developer is correct', () => { expect(FeedbackSource.Developer).toBe('Developer'); });
  it('FeedbackSource.Logs is correct', () => { expect(FeedbackSource.Logs).toBe('Logs'); });
  it('FeedbackSource.Metrics is correct', () => { expect(FeedbackSource.Metrics).toBe('Metrics'); });
  it('FeedbackSource.AI is correct', () => { expect(FeedbackSource.AI).toBe('AI'); });
  it('FeedbackSource.Workflow is correct', () => { expect(FeedbackSource.Workflow).toBe('Workflow'); });
  it('FeedbackSource.Errors is correct', () => { expect(FeedbackSource.Errors).toBe('Errors'); });
  it('FeedbackSource.Conversation is correct', () => { expect(FeedbackSource.Conversation).toBe('Conversation'); });
  it('FeedbackSource.Capability is correct', () => { expect(FeedbackSource.Capability).toBe('Capability'); });

  // FeedbackSentiment
  it('FeedbackSentiment has 4 values', () => { expect(Object.keys(FeedbackSentiment).length).toBe(4); });
  it('FeedbackSentiment.Positive is correct', () => { expect(FeedbackSentiment.Positive).toBe('Positive'); });
  it('FeedbackSentiment.Negative is correct', () => { expect(FeedbackSentiment.Negative).toBe('Negative'); });
  it('FeedbackSentiment.Neutral is correct', () => { expect(FeedbackSentiment.Neutral).toBe('Neutral'); });
  it('FeedbackSentiment.Critical is correct', () => { expect(FeedbackSentiment.Critical).toBe('Critical'); });

  // LearningOutcome
  it('LearningOutcome has 4 values', () => { expect(Object.keys(LearningOutcome).length).toBe(4); });
  it('LearningOutcome.Improved is correct', () => { expect(LearningOutcome.Improved).toBe('Improved'); });
  it('LearningOutcome.Worsened is correct', () => { expect(LearningOutcome.Worsened).toBe('Worsened'); });
  it('LearningOutcome.NoChange is correct', () => { expect(LearningOutcome.NoChange).toBe('NoChange'); });
  it('LearningOutcome.UnexpectedSideEffect is correct', () => { expect(LearningOutcome.UnexpectedSideEffect).toBe('UnexpectedSideEffect'); });

  // TechDebtPriority
  it('TechDebtPriority has 4 values', () => { expect(Object.keys(TechDebtPriority).length).toBe(4); });
  it('TechDebtPriority.Low is correct', () => { expect(TechDebtPriority.Low).toBe('Low'); });
  it('TechDebtPriority.Medium is correct', () => { expect(TechDebtPriority.Medium).toBe('Medium'); });
  it('TechDebtPriority.High is correct', () => { expect(TechDebtPriority.High).toBe('High'); });
  it('TechDebtPriority.Critical is correct', () => { expect(TechDebtPriority.Critical).toBe('Critical'); });

  // ArchOptimizationType
  it('ArchOptimizationType has 6 values', () => { expect(Object.keys(ArchOptimizationType).length).toBe(6); });
  it('ArchOptimizationType.Simplify is correct', () => { expect(ArchOptimizationType.Simplify).toBe('Simplify'); });
  it('ArchOptimizationType.RemoveLayer is correct', () => { expect(ArchOptimizationType.RemoveLayer).toBe('RemoveLayer'); });
  it('ArchOptimizationType.MergeRuntimes is correct', () => { expect(ArchOptimizationType.MergeRuntimes).toBe('MergeRuntimes'); });
  it('ArchOptimizationType.SplitResponsibility is correct', () => { expect(ArchOptimizationType.SplitResponsibility).toBe('SplitResponsibility'); });
  it('ArchOptimizationType.ReduceCoupling is correct', () => { expect(ArchOptimizationType.ReduceCoupling).toBe('ReduceCoupling'); });
  it('ArchOptimizationType.ImproveCohesion is correct', () => { expect(ArchOptimizationType.ImproveCohesion).toBe('ImproveCohesion'); });

  // EvolutionState
  it('EvolutionState has 9 values', () => { expect(Object.keys(EvolutionState).length).toBe(9); });
  it('EvolutionState.Uninitialized is correct', () => { expect(EvolutionState.Uninitialized).toBe('Uninitialized'); });
  it('EvolutionState.Initializing is correct', () => { expect(EvolutionState.Initializing).toBe('Initializing'); });
  it('EvolutionState.Ready is correct', () => { expect(EvolutionState.Ready).toBe('Ready'); });
  it('EvolutionState.Analyzing is correct', () => { expect(EvolutionState.Analyzing).toBe('Analyzing'); });
  it('EvolutionState.Planning is correct', () => { expect(EvolutionState.Planning).toBe('Planning'); });
  it('EvolutionState.Evolving is correct', () => { expect(EvolutionState.Evolving).toBe('Evolving'); });
  it('EvolutionState.Stopping is correct', () => { expect(EvolutionState.Stopping).toBe('Stopping'); });
  it('EvolutionState.Stopped is correct', () => { expect(EvolutionState.Stopped).toBe('Stopped'); });
  it('EvolutionState.Error is correct', () => { expect(EvolutionState.Error).toBe('Error'); });

  // RoadmapItemStatus
  it('RoadmapItemStatus has 5 values', () => { expect(Object.keys(RoadmapItemStatus).length).toBe(5); });
  it('RoadmapItemStatus.Pending is correct', () => { expect(RoadmapItemStatus.Pending).toBe('Pending'); });
  it('RoadmapItemStatus.InProgress is correct', () => { expect(RoadmapItemStatus.InProgress).toBe('InProgress'); });
  it('RoadmapItemStatus.Completed is correct', () => { expect(RoadmapItemStatus.Completed).toBe('Completed'); });
  it('RoadmapItemStatus.Deferred is correct', () => { expect(RoadmapItemStatus.Deferred).toBe('Deferred'); });
  it('RoadmapItemStatus.Cancelled is correct', () => { expect(RoadmapItemStatus.Cancelled).toBe('Cancelled'); });

  // ValueDimension
  it('ValueDimension has 5 values', () => { expect(Object.keys(ValueDimension).length).toBe(5); });
  it('ValueDimension.UserValue is correct', () => { expect(ValueDimension.UserValue).toBe('UserValue'); });
  it('ValueDimension.PlatformValue is correct', () => { expect(ValueDimension.PlatformValue).toBe('PlatformValue'); });
  it('ValueDimension.BusinessValue is correct', () => { expect(ValueDimension.BusinessValue).toBe('BusinessValue'); });
  it('ValueDimension.DeveloperValue is correct', () => { expect(ValueDimension.DeveloperValue).toBe('DeveloperValue'); });
  it('ValueDimension.KnowledgeValue is correct', () => { expect(ValueDimension.KnowledgeValue).toBe('KnowledgeValue'); });
});

// ═══════════════════════════════════════════════════════════════════
describe('ECIR Types — DefaultEvolutionRuntimeConfig', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(DefaultEvolutionRuntimeConfig)).toBe(true);
  });
  it('has eventBusEnabled', () => {
    expect(DefaultEvolutionRuntimeConfig.eventBusEnabled).toBe(true);
  });
  it('has bottleneckDetector config', () => {
    expect(DefaultEvolutionRuntimeConfig.bottleneckDetector).toBeDefined();
    expect(DefaultEvolutionRuntimeConfig.bottleneckDetector.maxBottlenecks).toBe(1000);
    expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.bottleneckDetector)).toBe(true);
  });
  it('has constraintAnalyzer config', () => {
    expect(DefaultEvolutionRuntimeConfig.constraintAnalyzer).toBeDefined();
    expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.constraintAnalyzer)).toBe(true);
  });
  it('has improvementEngine config', () => {
    expect(DefaultEvolutionRuntimeConfig.improvementEngine).toBeDefined();
    expect(DefaultEvolutionRuntimeConfig.improvementEngine.maxImprovements).toBe(5000);
  });
  it('has experiment config', () => {
    expect(DefaultEvolutionRuntimeConfig.experiment).toBeDefined();
    expect(DefaultEvolutionRuntimeConfig.experiment.maxExperiments).toBe(1000);
    expect(DefaultEvolutionRuntimeConfig.experiment.minConfidence).toBe(0.8);
  });
  it('has kpi config', () => {
    expect(DefaultEvolutionRuntimeConfig.kpi).toBeDefined();
    expect(DefaultEvolutionRuntimeConfig.kpi.maxKPIs).toBe(500);
  });
  it('has feedbackCollector config', () => {
    expect(DefaultEvolutionRuntimeConfig.feedbackCollector).toBeDefined();
    expect(DefaultEvolutionRuntimeConfig.feedbackCollector.autoProcessEnabled).toBe(true);
  });
  it('has learningLoop config', () => {
    expect(DefaultEvolutionRuntimeConfig.learningLoop).toBeDefined();
    expect(DefaultEvolutionRuntimeConfig.learningLoop.maxLearningRecords).toBe(10000);
  });
  it('has evolutionGraph config', () => {
    expect(DefaultEvolutionRuntimeConfig.evolutionGraph).toBeDefined();
    expect(DefaultEvolutionRuntimeConfig.evolutionGraph.maxNodes).toBe(10000);
  });
  it('has architectureOptimizer config', () => {
    expect(DefaultEvolutionRuntimeConfig.architectureOptimizer).toBeDefined();
  });
  it('has techDebt config', () => {
    expect(DefaultEvolutionRuntimeConfig.techDebt).toBeDefined();
    expect(DefaultEvolutionRuntimeConfig.techDebt.depreciationRate).toBe(0.1);
  });
  it('has prioritizer config', () => {
    expect(DefaultEvolutionRuntimeConfig.prioritizer).toBeDefined();
    expect(DefaultEvolutionRuntimeConfig.prioritizer.constraintWeight).toBe(1.5);
  });
  it('has 14 subsystem configs', () => {
    const keys = Object.keys(DefaultEvolutionRuntimeConfig);
    expect(keys.length).toBe(14);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('ECIR Errors — Base EvolutionError', () => {
  it('has code, message, timestamp, context', () => {
    const err = new EvolutionError('TEST_CODE', 'test message', { foo: 'bar' });
    expect(err.name).toBe('EvolutionError');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
    expect(err.timestamp).toBeDefined();
    expect(typeof err.timestamp).toBe('string');
    expect(err.context).toBeDefined();
    expect(err.context.foo).toBe('bar');
    expect(Object.isFrozen(err.context)).toBe(true);
  });
  it('context defaults to empty', () => {
    const err = new EvolutionError('CODE', 'msg');
    expect(Object.keys(err.context).length).toBe(0);
  });
  it('is instanceof Error', () => {
    const err = new EvolutionError('CODE', 'msg');
    expect(err).toBeInstanceOf(Error);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('ECIR Errors — All Error Classes', () => {
  const errorClasses = [
    { Cls: BottleneckNotFoundError, code: 'BOTTLENECK_NOT_FOUND', name: 'BottleneckNotFoundError', id: 'bn-1' },
    { Cls: BottleneckLimitExceededError, code: 'BOTTLENECK_LIMIT_EXCEEDED', name: 'BottleneckLimitExceededError', args: [100] },
    { Cls: ImprovementNotFoundError, code: 'IMPROVEMENT_NOT_FOUND', name: 'ImprovementNotFoundError', id: 'imp-1' },
    { Cls: ImprovementLimitExceededError, code: 'IMPROVEMENT_LIMIT_EXCEEDED', name: 'ImprovementLimitExceededError', args: [100] },
    { Cls: ImprovementStateError, code: 'IMPROVEMENT_STATE_ERROR', name: 'ImprovementStateError', args: ['i1', 'Proposed', 'Completed'] },
    { Cls: ExperimentNotFoundError, code: 'EXPERIMENT_NOT_FOUND', name: 'ExperimentNotFoundError', id: 'exp-1' },
    { Cls: ExperimentLimitExceededError, code: 'EXPERIMENT_LIMIT_EXCEEDED', name: 'ExperimentLimitExceededError', args: [100] },
    { Cls: ExperimentStateError, code: 'EXPERIMENT_STATE_ERROR', name: 'ExperimentStateError', args: ['e1', 'Proposed', 'Completed'] },
    { Cls: ExperimentTimeoutError, code: 'EXPERIMENT_TIMEOUT', name: 'ExperimentTimeoutError', args: ['e1', 5000] },
    { Cls: ValueAnalysisError, code: 'VALUE_ANALYSIS_ERROR', name: 'ValueAnalysisError', args: ['bad analysis'] },
    { Cls: NoValueProofError, code: 'NO_VALUE_PROOF', name: 'NoValueProofError', args: ['imp-1'] },
    { Cls: OptimizationWithoutValueError, code: 'OPTIMIZATION_WITHOUT_VALUE', name: 'OptimizationWithoutValueError', args: ['imp-1'] },
    { Cls: LocalOptimizationError, code: 'LOCAL_OPTIMIZATION', name: 'LocalOptimizationError', args: ['imp-1'] },
    { Cls: PINotFoundError, code: 'KPI_NOT_FOUND', name: 'PINotFoundError', id: 'kpi-1' },
    { Cls: PILimitExceededError, code: 'KPI_LIMIT_EXCEEDED', name: 'PILimitExceededError', args: [100] },
    { Cls: FeedbackNotFoundError, code: 'FEEDBACK_NOT_FOUND', name: 'FeedbackNotFoundError', id: 'fb-1' },
    { Cls: FeedbackLimitExceededError, code: 'FEEDBACK_LIMIT_EXCEEDED', name: 'FeedbackLimitExceededError', args: [100] },
    { Cls: LearningRecordNotFoundError, code: 'LEARNING_RECORD_NOT_FOUND', name: 'LearningRecordNotFoundError', id: 'lr-1' },
    { Cls: EvolutionGraphError, code: 'EVOLUTION_GRAPH_ERROR', name: 'EvolutionGraphError', args: ['bad graph'] },
    { Cls: GraphNodeLimitExceededError, code: 'GRAPH_NODE_LIMIT_EXCEEDED', name: 'GraphNodeLimitExceededError', args: [100] },
    { Cls: TechDebtNotFoundError, code: 'TECH_DEBT_NOT_FOUND', name: 'TechDebtNotFoundError', id: 'td-1' },
    { Cls: TechDebtLimitExceededError, code: 'TECH_DEBT_LIMIT_EXCEEDED', name: 'TechDebtLimitExceededError', args: [100] },
    { Cls: ArchitectureAnalysisError, code: 'ARCHITECTURE_ANALYSIS_ERROR', name: 'ArchitectureAnalysisError', args: ['reason'] },
    { Cls: RoadmapLimitExceededError, code: 'ROADMAP_LIMIT_EXCEEDED', name: 'RoadmapLimitExceededError', args: [100] },
    { Cls: EvolutionRuntimeError, code: 'EVOLUTION_RUNTIME_ERROR', name: 'EvolutionRuntimeError', args: ['reason'] },
    { Cls: EvolutionNotInitializedError, code: 'EVOLUTION_NOT_INITIALIZED', name: 'EvolutionNotInitializedError' },
    { Cls: EvolutionDisposedError, code: 'EVOLUTION_DISPOSED', name: 'EvolutionDisposedError' },
    { Cls: ConstraintAnalysisError, code: 'CONSTRAINT_ANALYSIS_ERROR', name: 'ConstraintAnalysisError', args: ['reason'] },
    { Cls: OpportunityCostError, code: 'OPPORTUNITY_COST_ERROR', name: 'OpportunityCostError', args: ['reason'] },
  ];

  for (const { Cls, code, name, id, args } of errorClasses) {
    it(`${name} extends EvolutionError`, () => {
      const err = id ? new Cls(id) : args ? new Cls(...(args as unknown as [])) : new Cls();
      expect(err).toBeInstanceOf(EvolutionError);
      expect(err).toBeInstanceOf(Error);
    });
    it(`${name} has correct code '${code}'`, () => {
      const err = id ? new Cls(id) : args ? new Cls(...(args as unknown as [])) : new Cls();
      expect(err.code).toBe(code);
    });
    it(`${name} has correct name '${name}'`, () => {
      const err = id ? new Cls(id) : args ? new Cls(...(args as unknown as [])) : new Cls();
      expect(err.name).toBe(name);
    });
    it(`${name} has timestamp`, () => {
      const err = id ? new Cls(id) : args ? new Cls(...(args as unknown as [])) : new Cls();
      expect(err.timestamp).toBeDefined();
      expect(typeof err.timestamp).toBe('string');
    });
    it(`${name} has frozen context`, () => {
      const err = id ? new Cls(id, { x: 1 }) : args ? new Cls(...(args as unknown as []), { x: 1 }) : new Cls({ x: 1 });
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  }

  // Specific field tests
  it('BottleneckNotFoundError has bottleneckId', () => {
    const err = new BottleneckNotFoundError('bn-1');
    expect(err.bottleneckId).toBe('bn-1');
  });
  it('ImprovementNotFoundError has improvementId', () => {
    const err = new ImprovementNotFoundError('imp-1');
    expect(err.improvementId).toBe('imp-1');
  });
  it('ImprovementStateError has currentStatus and targetStatus', () => {
    const err = new ImprovementStateError('i1', 'Proposed', 'Completed');
    expect(err.improvementId).toBe('i1');
    expect(err.currentStatus).toBe('Proposed');
    expect(err.targetStatus).toBe('Completed');
  });
  it('ExperimentStateError has fields', () => {
    const err = new ExperimentStateError('e1', 'Running', 'Proposed');
    expect(err.experimentId).toBe('e1');
    expect(err.currentStatus).toBe('Running');
    expect(err.targetStatus).toBe('Proposed');
  });
});
""")

print('Generated test files.')
