import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Types ──────────────────────────────────────────────────
import {
  ConstraintType,
  BottleneckScope,
  BottleneckSeverity,
  ImprovementStatus,
  ExperimentStatus,
  KPDirection,
  FeedbackSource,
  FeedbackSentiment,
  LearningOutcome,
  TechDebtPriority,
  EvolutionState,
  ArchOptimizationType,
  RoadmapItemStatus,
  ValueDimension,
  brandBottleneckId,
  brandImprovementId,
  brandExperimentId,
  brandKPIId,
  brandFeedbackId,
  brandEvolutionNodeId,
  brandTechDebtId,
  brandRecommendationId,
  brandEvolutionSessionId,
  brandRoadmapId,
  brandLearningRecordId,
  DefaultEvolutionRuntimeConfig,
} from '../../core/evolution/types.js';
import type {
  BottleneckId,
  ImprovementId,
  ExperimentId,
  KPIId,
  FeedbackId,
  EvolutionNodeId,
  TechDebtId,
  RecommendationId,
  EvolutionSessionId,
  RoadmapId,
  LearningRecordId,
  EvolutionRuntimeConfig,
  BottleneckDetectorConfig,
  ConstraintAnalyzerConfig,
  ImprovementEngineConfig,
  ValueAnalyzerConfig,
  OpportunityCostConfig,
  OptimizationPlannerConfig,
  ExperimentConfig,
  KPIRuntimeConfig,
  FeedbackCollectorConfig,
  LearningLoopConfig,
  EvolutionGraphConfig,
  ArchitectureOptimizerConfig,
  TechDebtConfig,
  PrioritizerConfig,
} from '../../core/evolution/types.js';

// ── Errors ─────────────────────────────────────────────────
import {
  EvolutionError,
  BottleneckNotFoundError,
  BottleneckLimitExceededError,
  ImprovementNotFoundError,
  ImprovementLimitExceededError,
  ImprovementStateError,
  ExperimentNotFoundError,
  ExperimentLimitExceededError,
  ExperimentStateError,
  ExperimentTimeoutError,
  ValueAnalysisError,
  NoValueProofError,
  OptimizationWithoutValueError,
  LocalOptimizationError,
  PINotFoundError,
  PILimitExceededError,
  FeedbackNotFoundError,
  FeedbackLimitExceededError,
  LearningRecordNotFoundError,
  EvolutionGraphError,
  GraphNodeLimitExceededError,
  TechDebtNotFoundError,
  TechDebtLimitExceededError,
  ArchitectureAnalysisError,
  RoadmapLimitExceededError,
  EvolutionRuntimeError,
  EvolutionNotInitializedError,
  EvolutionDisposedError,
  ConstraintAnalysisError,
  OpportunityCostError,
} from '../../core/evolution/errors.js';

// ── Events ─────────────────────────────────────────────────
import type {
  EvolutionEvent,
  BottleneckDetectedEvent,
  BottleneckResolvedEvent,
  ConstraintAnalyzedEvent,
  ImprovementProposedEvent,
  ImprovementStatusChangedEvent,
  ImprovementCompletedEvent,
  ImprovementRejectedEvent,
  ValueAnalyzedEvent,
  OpportunityCostAnalyzedEvent,
  ExperimentStartedEvent,
  ExperimentCompletedEvent,
  ExperimentFailedEvent,
  KPIRegisteredEvent,
  KPIUpdatedEvent,
  FeedbackReceivedEvent,
  FeedbackProcessedEvent,
  LearningRecordedEvent,
  EvolutionNodeAddedEvent,
  TechDebtDetectedEvent,
  TechDebtResolvedEvent,
  ArchOptimizationSuggestedEvent,
  RoadmapCreatedEvent,
  EvolutionInitializedEvent,
  EvolutionStateChangedEvent,
  EvolutionAnalysisCompletedEvent,
} from '../../core/evolution/events.js';

// ── Contracts ──────────────────────────────────────────────
import type {
  IBottleneckDetector,
  IConstraintAnalyzer,
  IImprovementEngine,
  IValueAnalyzer,
  IOpportunityCostEngine,
  IOptimizationPlanner,
  IExperimentRuntime,
  IKPIRuntime,
  IFeedbackCollector,
  ILearningLoop,
  IEvolutionGraph,
  IArchitectureOptimizer,
  ITechDebtAnalyzer,
  IRecommendationPrioritizer,
  IEvolutionRuntime,
  EvolutionPublicContracts,
  BottleneckDetectionParams,
  ImprovementProposalParams,
  ExperimentProposalParams,
  KPIRegistrationParams,
  FeedbackCollectionParams,
  LearningRecordParams,
  TechDebtRegistrationParams,
  EvolutionNodeParams,
  EvolutionAnalysisResult,
} from '../../core/evolution/contracts.js';

// ── Index barrel ────────────────────────────────────────────
import {
  ConstraintType as CT_Barrel,
  ImprovementStatus as IS_Barrel,
  ExperimentStatus as ES_Barrel,
  EvolutionState as EvS_Barrel,
  brandBottleneckId as bBID_Barrel,
  brandImprovementId as bIID_Barrel,
  EvolutionError as EvErr_Barrel,
  BottleneckNotFoundError as BNF_Barrel,
  DefaultEvolutionRuntimeConfig as DefaultConfig_Barrel,
  BottleneckDetector,
  ConstraintAnalyzer,
  ImprovementEngine,
  ValueAnalyzer,
  OpportunityCostEngine,
  OptimizationPlanner,
  ExperimentRuntime,
  KPIRuntime,
  FeedbackCollector,
  LearningLoop,
  EvolutionGraph,
  ArchitectureOptimizer,
  TechDebtAnalyzer,
  RecommendationPrioritizer,
  EvolutionRuntime,
} from '../../core/evolution/index.js';

// Helper: create a frozen metadata object
const meta = Object.freeze({ key: 'value' });
const ts = '2024-01-15T12:00:00.000Z';

// ====================================================================
// 1. TYPES — ENUMS, BRANDED IDS, DEFAULT CONFIG  (~80 tests)
// ====================================================================

describe('Evolution Types', () => {
  // ── ConstraintType (13 members) ───────────────────────────
  describe('ConstraintType enum', () => {
    it('has 13 members', () => {
      expect(Object.keys(ConstraintType)).toHaveLength(13);
    });
    it('Performance = "Performance"', () => {
      expect(ConstraintType.Performance).toBe('Performance');
    });
    it('Quality = "Quality"', () => {
      expect(ConstraintType.Quality).toBe('Quality');
    });
    it('UX = "UX"', () => {
      expect(ConstraintType.UX).toBe('UX');
    });
    it('Knowledge = "Knowledge"', () => {
      expect(ConstraintType.Knowledge).toBe('Knowledge');
    });
    it('Memory = "Memory"', () => {
      expect(ConstraintType.Memory).toBe('Memory');
    });
    it('Reasoning = "Reasoning"', () => {
      expect(ConstraintType.Reasoning).toBe('Reasoning');
    });
    it('Architecture = "Architecture"', () => {
      expect(ConstraintType.Architecture).toBe('Architecture');
    });
    it('DeveloperExperience = "DeveloperExperience"', () => {
      expect(ConstraintType.DeveloperExperience).toBe('DeveloperExperience');
    });
    it('Documentation = "Documentation"', () => {
      expect(ConstraintType.Documentation).toBe('Documentation');
    });
    it('Marketing = "Marketing"', () => {
      expect(ConstraintType.Marketing).toBe('Marketing');
    });
    it('Sales = "Sales"', () => {
      expect(ConstraintType.Sales).toBe('Sales');
    });
    it('Business = "Business"', () => {
      expect(ConstraintType.Business).toBe('Business');
    });
    it('Learning = "Learning"', () => {
      expect(ConstraintType.Learning).toBe('Learning');
    });
    it('all values are strings', () => {
      for (const val of Object.values(ConstraintType)) {
        expect(typeof val).toBe('string');
      }
    });
  });

  // ── BottleneckScope (5 members) ───────────────────────────
  describe('BottleneckScope enum', () => {
    it('has 5 members', () => {
      expect(Object.keys(BottleneckScope)).toHaveLength(5);
    });
    it('Platform = "Platform"', () => {
      expect(BottleneckScope.Platform).toBe('Platform');
    });
    it('Runtime = "Runtime"', () => {
      expect(BottleneckScope.Runtime).toBe('Runtime');
    });
    it('Capability = "Capability"', () => {
      expect(BottleneckScope.Capability).toBe('Capability');
    });
    it('Workflow = "Workflow"', () => {
      expect(BottleneckScope.Workflow).toBe('Workflow');
    });
    it('User = "User"', () => {
      expect(BottleneckScope.User).toBe('User');
    });
  });

  // ── BottleneckSeverity (4 members) ────────────────────────
  describe('BottleneckSeverity enum', () => {
    it('has 4 members', () => {
      expect(Object.keys(BottleneckSeverity)).toHaveLength(4);
    });
    it('Low = "Low"', () => {
      expect(BottleneckSeverity.Low).toBe('Low');
    });
    it('Medium = "Medium"', () => {
      expect(BottleneckSeverity.Medium).toBe('Medium');
    });
    it('High = "High"', () => {
      expect(BottleneckSeverity.High).toBe('High');
    });
    it('Critical = "Critical"', () => {
      expect(BottleneckSeverity.Critical).toBe('Critical');
    });
  });

  // ── ImprovementStatus (7 members) ─────────────────────────
  describe('ImprovementStatus enum', () => {
    it('has 7 members', () => {
      expect(Object.keys(ImprovementStatus)).toHaveLength(7);
    });
    it('Proposed = "Proposed"', () => {
      expect(ImprovementStatus.Proposed).toBe('Proposed');
    });
    it('Planned = "Planned"', () => {
      expect(ImprovementStatus.Planned).toBe('Planned');
    });
    it('InProgress = "InProgress"', () => {
      expect(ImprovementStatus.InProgress).toBe('InProgress');
    });
    it('Completed = "Completed"', () => {
      expect(ImprovementStatus.Completed).toBe('Completed');
    });
    it('Failed = "Failed"', () => {
      expect(ImprovementStatus.Failed).toBe('Failed');
    });
    it('Rejected = "Rejected"', () => {
      expect(ImprovementStatus.Rejected).toBe('Rejected');
    });
    it('RolledBack = "RolledBack"', () => {
      expect(ImprovementStatus.RolledBack).toBe('RolledBack');
    });
  });

  // ── ExperimentStatus (6 members) ──────────────────────────
  describe('ExperimentStatus enum', () => {
    it('has 6 members', () => {
      expect(Object.keys(ExperimentStatus)).toHaveLength(6);
    });
    it('Proposed = "Proposed"', () => {
      expect(ExperimentStatus.Proposed).toBe('Proposed');
    });
    it('Running = "Running"', () => {
      expect(ExperimentStatus.Running).toBe('Running');
    });
    it('Completed = "Completed"', () => {
      expect(ExperimentStatus.Completed).toBe('Completed');
    });
    it('Failed = "Failed"', () => {
      expect(ExperimentStatus.Failed).toBe('Failed');
    });
    it('Cancelled = "Cancelled"', () => {
      expect(ExperimentStatus.Cancelled).toBe('Cancelled');
    });
    it('Inconclusive = "Inconclusive"', () => {
      expect(ExperimentStatus.Inconclusive).toBe('Inconclusive');
    });
  });

  // ── KPDirection (3 members) ───────────────────────────────
  describe('KPDirection enum', () => {
    it('has 3 members', () => {
      expect(Object.keys(KPDirection)).toHaveLength(3);
    });
    it('HigherIsBetter = "HigherIsBetter"', () => {
      expect(KPDirection.HigherIsBetter).toBe('HigherIsBetter');
    });
    it('LowerIsBetter = "LowerIsBetter"', () => {
      expect(KPDirection.LowerIsBetter).toBe('LowerIsBetter');
    });
    it('TargetIsOptimal = "TargetIsOptimal"', () => {
      expect(KPDirection.TargetIsOptimal).toBe('TargetIsOptimal');
    });
  });

  // ── FeedbackSource (9 members) ────────────────────────────
  describe('FeedbackSource enum', () => {
    it('has 9 members', () => {
      expect(Object.keys(FeedbackSource)).toHaveLength(9);
    });
    it('User = "User"', () => {
      expect(FeedbackSource.User).toBe('User');
    });
    it('Developer = "Developer"', () => {
      expect(FeedbackSource.Developer).toBe('Developer');
    });
    it('Logs = "Logs"', () => {
      expect(FeedbackSource.Logs).toBe('Logs');
    });
    it('Metrics = "Metrics"', () => {
      expect(FeedbackSource.Metrics).toBe('Metrics');
    });
    it('AI = "AI"', () => {
      expect(FeedbackSource.AI).toBe('AI');
    });
    it('Workflow = "Workflow"', () => {
      expect(FeedbackSource.Workflow).toBe('Workflow');
    });
    it('Errors = "Errors"', () => {
      expect(FeedbackSource.Errors).toBe('Errors');
    });
    it('Conversation = "Conversation"', () => {
      expect(FeedbackSource.Conversation).toBe('Conversation');
    });
    it('Capability = "Capability"', () => {
      expect(FeedbackSource.Capability).toBe('Capability');
    });
  });

  // ── FeedbackSentiment (4 members) ─────────────────────────
  describe('FeedbackSentiment enum', () => {
    it('has 4 members', () => {
      expect(Object.keys(FeedbackSentiment)).toHaveLength(4);
    });
    it('Positive = "Positive"', () => {
      expect(FeedbackSentiment.Positive).toBe('Positive');
    });
    it('Negative = "Negative"', () => {
      expect(FeedbackSentiment.Negative).toBe('Negative');
    });
    it('Neutral = "Neutral"', () => {
      expect(FeedbackSentiment.Neutral).toBe('Neutral');
    });
    it('Critical = "Critical"', () => {
      expect(FeedbackSentiment.Critical).toBe('Critical');
    });
  });

  // ── LearningOutcome (4 members) ───────────────────────────
  describe('LearningOutcome enum', () => {
    it('has 4 members', () => {
      expect(Object.keys(LearningOutcome)).toHaveLength(4);
    });
    it('Improved = "Improved"', () => {
      expect(LearningOutcome.Improved).toBe('Improved');
    });
    it('Worsened = "Worsened"', () => {
      expect(LearningOutcome.Worsened).toBe('Worsened');
    });
    it('NoChange = "NoChange"', () => {
      expect(LearningOutcome.NoChange).toBe('NoChange');
    });
    it('UnexpectedSideEffect = "UnexpectedSideEffect"', () => {
      expect(LearningOutcome.UnexpectedSideEffect).toBe('UnexpectedSideEffect');
    });
  });

  // ── TechDebtPriority (4 members) ──────────────────────────
  describe('TechDebtPriority enum', () => {
    it('has 4 members', () => {
      expect(Object.keys(TechDebtPriority)).toHaveLength(4);
    });
    it('Low = "Low"', () => {
      expect(TechDebtPriority.Low).toBe('Low');
    });
    it('Medium = "Medium"', () => {
      expect(TechDebtPriority.Medium).toBe('Medium');
    });
    it('High = "High"', () => {
      expect(TechDebtPriority.High).toBe('High');
    });
    it('Critical = "Critical"', () => {
      expect(TechDebtPriority.Critical).toBe('Critical');
    });
  });

  // ── EvolutionState (9 members) ────────────────────────────
  describe('EvolutionState enum', () => {
    it('has 9 members', () => {
      expect(Object.keys(EvolutionState)).toHaveLength(9);
    });
    it('Uninitialized = "Uninitialized"', () => {
      expect(EvolutionState.Uninitialized).toBe('Uninitialized');
    });
    it('Initializing = "Initializing"', () => {
      expect(EvolutionState.Initializing).toBe('Initializing');
    });
    it('Ready = "Ready"', () => {
      expect(EvolutionState.Ready).toBe('Ready');
    });
    it('Analyzing = "Analyzing"', () => {
      expect(EvolutionState.Analyzing).toBe('Analyzing');
    });
    it('Planning = "Planning"', () => {
      expect(EvolutionState.Planning).toBe('Planning');
    });
    it('Evolving = "Evolving"', () => {
      expect(EvolutionState.Evolving).toBe('Evolving');
    });
    it('Stopping = "Stopping"', () => {
      expect(EvolutionState.Stopping).toBe('Stopping');
    });
    it('Stopped = "Stopped"', () => {
      expect(EvolutionState.Stopped).toBe('Stopped');
    });
    it('Error = "Error"', () => {
      expect(EvolutionState.Error).toBe('Error');
    });
  });

  // ── ArchOptimizationType (6 members) ──────────────────────
  describe('ArchOptimizationType enum', () => {
    it('has 6 members', () => {
      expect(Object.keys(ArchOptimizationType)).toHaveLength(6);
    });
    it('Simplify = "Simplify"', () => {
      expect(ArchOptimizationType.Simplify).toBe('Simplify');
    });
    it('RemoveLayer = "RemoveLayer"', () => {
      expect(ArchOptimizationType.RemoveLayer).toBe('RemoveLayer');
    });
    it('MergeRuntimes = "MergeRuntimes"', () => {
      expect(ArchOptimizationType.MergeRuntimes).toBe('MergeRuntimes');
    });
    it('SplitResponsibility = "SplitResponsibility"', () => {
      expect(ArchOptimizationType.SplitResponsibility).toBe('SplitResponsibility');
    });
    it('ReduceCoupling = "ReduceCoupling"', () => {
      expect(ArchOptimizationType.ReduceCoupling).toBe('ReduceCoupling');
    });
    it('ImproveCohesion = "ImproveCohesion"', () => {
      expect(ArchOptimizationType.ImproveCohesion).toBe('ImproveCohesion');
    });
  });

  // ── RoadmapItemStatus (5 members) ─────────────────────────
  describe('RoadmapItemStatus enum', () => {
    it('has 5 members', () => {
      expect(Object.keys(RoadmapItemStatus)).toHaveLength(5);
    });
    it('Pending = "Pending"', () => {
      expect(RoadmapItemStatus.Pending).toBe('Pending');
    });
    it('InProgress = "InProgress"', () => {
      expect(RoadmapItemStatus.InProgress).toBe('InProgress');
    });
    it('Completed = "Completed"', () => {
      expect(RoadmapItemStatus.Completed).toBe('Completed');
    });
    it('Deferred = "Deferred"', () => {
      expect(RoadmapItemStatus.Deferred).toBe('Deferred');
    });
    it('Cancelled = "Cancelled"', () => {
      expect(RoadmapItemStatus.Cancelled).toBe('Cancelled');
    });
  });

  // ── ValueDimension (5 members) ────────────────────────────
  describe('ValueDimension enum', () => {
    it('has 5 members', () => {
      expect(Object.keys(ValueDimension)).toHaveLength(5);
    });
    it('UserValue = "UserValue"', () => {
      expect(ValueDimension.UserValue).toBe('UserValue');
    });
    it('PlatformValue = "PlatformValue"', () => {
      expect(ValueDimension.PlatformValue).toBe('PlatformValue');
    });
    it('BusinessValue = "BusinessValue"', () => {
      expect(ValueDimension.BusinessValue).toBe('BusinessValue');
    });
    it('DeveloperValue = "DeveloperValue"', () => {
      expect(ValueDimension.DeveloperValue).toBe('DeveloperValue');
    });
    it('KnowledgeValue = "KnowledgeValue"', () => {
      expect(ValueDimension.KnowledgeValue).toBe('KnowledgeValue');
    });
  });

  // ── Branded ID functions (11 functions) ───────────────────
  describe('Branded ID functions', () => {
    it('brandBottleneckId returns a string', () => {
      const id = brandBottleneckId('bn-1');
      expect(typeof id).toBe('string');
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

  // ── DefaultEvolutionRuntimeConfig ─────────────────────────
  describe('DefaultEvolutionRuntimeConfig', () => {
    it('is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig)).toBe(true);
    });
    it('has all 14 nested config keys plus eventBusEnabled', () => {
      const keys = Object.keys(DefaultEvolutionRuntimeConfig);
      expect(keys).toContain('bottleneckDetector');
      expect(keys).toContain('constraintAnalyzer');
      expect(keys).toContain('improvementEngine');
      expect(keys).toContain('valueAnalyzer');
      expect(keys).toContain('opportunityCost');
      expect(keys).toContain('optimizationPlanner');
      expect(keys).toContain('experiment');
      expect(keys).toContain('kpi');
      expect(keys).toContain('feedbackCollector');
      expect(keys).toContain('learningLoop');
      expect(keys).toContain('evolutionGraph');
      expect(keys).toContain('architectureOptimizer');
      expect(keys).toContain('techDebt');
      expect(keys).toContain('prioritizer');
      expect(keys).toContain('eventBusEnabled');
    });

    // Each nested config is frozen
    it('bottleneckDetector config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.bottleneckDetector)).toBe(true);
    });
    it('constraintAnalyzer config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.constraintAnalyzer)).toBe(true);
    });
    it('improvementEngine config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.improvementEngine)).toBe(true);
    });
    it('valueAnalyzer config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.valueAnalyzer)).toBe(true);
    });
    it('valueAnalyzer.valueDimensions array is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.valueAnalyzer.valueDimensions)).toBe(true);
    });
    it('opportunityCost config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.opportunityCost)).toBe(true);
    });
    it('optimizationPlanner config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.optimizationPlanner)).toBe(true);
    });
    it('experiment config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.experiment)).toBe(true);
    });
    it('kpi config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.kpi)).toBe(true);
    });
    it('feedbackCollector config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.feedbackCollector)).toBe(true);
    });
    it('learningLoop config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.learningLoop)).toBe(true);
    });
    it('evolutionGraph config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.evolutionGraph)).toBe(true);
    });
    it('architectureOptimizer config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.architectureOptimizer)).toBe(true);
    });
    it('techDebt config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.techDebt)).toBe(true);
    });
    it('prioritizer config is frozen', () => {
      expect(Object.isFrozen(DefaultEvolutionRuntimeConfig.prioritizer)).toBe(true);
    });

    // Sensible values
    it('bottleneckDetector.maxBottlenecks = 1000', () => {
      expect(DefaultEvolutionRuntimeConfig.bottleneckDetector.maxBottlenecks).toBe(1000);
    });
    it('bottleneckDetector.scanIntervalMs = 60000', () => {
      expect(DefaultEvolutionRuntimeConfig.bottleneckDetector.scanIntervalMs).toBe(60_000);
    });
    it('improvementEngine.maxImprovements = 5000', () => {
      expect(DefaultEvolutionRuntimeConfig.improvementEngine.maxImprovements).toBe(5000);
    });
    it('improvementEngine.maxActiveImprovements = 50', () => {
      expect(DefaultEvolutionRuntimeConfig.improvementEngine.maxActiveImprovements).toBe(50);
    });
    it('experiment.maxExperiments = 1000', () => {
      expect(DefaultEvolutionRuntimeConfig.experiment.maxExperiments).toBe(1000);
    });
    it('experiment.maxConcurrentExperiments = 5', () => {
      expect(DefaultEvolutionRuntimeConfig.experiment.maxConcurrentExperiments).toBe(5);
    });
    it('experiment.minConfidence = 0.8', () => {
      expect(DefaultEvolutionRuntimeConfig.experiment.minConfidence).toBe(0.8);
    });
    it('kpi.maxKPIs = 500', () => {
      expect(DefaultEvolutionRuntimeConfig.kpi.maxKPIs).toBe(500);
    });
    it('feedbackCollector.maxFeedback = 10000', () => {
      expect(DefaultEvolutionRuntimeConfig.feedbackCollector.maxFeedback).toBe(10_000);
    });
    it('feedbackCollector.autoProcessEnabled = true', () => {
      expect(DefaultEvolutionRuntimeConfig.feedbackCollector.autoProcessEnabled).toBe(true);
    });
    it('learningLoop.maxLearningRecords = 10000', () => {
      expect(DefaultEvolutionRuntimeConfig.learningLoop.maxLearningRecords).toBe(10_000);
    });
    it('evolutionGraph.maxNodes = 10000', () => {
      expect(DefaultEvolutionRuntimeConfig.evolutionGraph.maxNodes).toBe(10_000);
    });
    it('techDebt.maxItems = 1000', () => {
      expect(DefaultEvolutionRuntimeConfig.techDebt.maxItems).toBe(1000);
    });
    it('eventBusEnabled = true', () => {
      expect(DefaultEvolutionRuntimeConfig.eventBusEnabled).toBe(true);
    });
    it('valueAnalyzer.valueDimensions has all 5 ValueDimensions', () => {
      expect(DefaultEvolutionRuntimeConfig.valueAnalyzer.valueDimensions).toHaveLength(5);
      expect(DefaultEvolutionRuntimeConfig.valueAnalyzer.valueDimensions).toContain(ValueDimension.UserValue);
      expect(DefaultEvolutionRuntimeConfig.valueAnalyzer.valueDimensions).toContain(ValueDimension.PlatformValue);
      expect(DefaultEvolutionRuntimeConfig.valueAnalyzer.valueDimensions).toContain(ValueDimension.BusinessValue);
      expect(DefaultEvolutionRuntimeConfig.valueAnalyzer.valueDimensions).toContain(ValueDimension.DeveloperValue);
      expect(DefaultEvolutionRuntimeConfig.valueAnalyzer.valueDimensions).toContain(ValueDimension.KnowledgeValue);
    });
    it('prioritizer.constraintWeight = 1.5 (higher than others)', () => {
      expect(DefaultEvolutionRuntimeConfig.prioritizer.constraintWeight).toBe(1.5);
    });
  });
});

// ====================================================================
// 2. ERRORS  (~80 tests)
// ====================================================================

describe('Evolution Errors', () => {
  // ── EvolutionError base class ─────────────────────────────
  describe('EvolutionError base class', () => {
    it('extends Error', () => {
      const err = new EvolutionError('TEST_CODE', 'test message');
      expect(err).toBeInstanceOf(Error);
    });
    it('has code property', () => {
      const err = new EvolutionError('TEST_CODE', 'test message');
      expect(err.code).toBe('TEST_CODE');
    });
    it('has message property from Error', () => {
      const err = new EvolutionError('TEST_CODE', 'test message');
      expect(err.message).toBe('test message');
    });
    it('has timestamp as ISO string', () => {
      const err = new EvolutionError('TEST_CODE', 'test');
      expect(typeof err.timestamp).toBe('string');
      // ISO string ends with Z or has timezone offset
      expect(err.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
    it('has frozen context', () => {
      const err = new EvolutionError('TEST_CODE', 'test', { key: 'val' });
      expect(Object.isFrozen(err.context)).toBe(true);
    });
    it('context defaults to empty object when omitted', () => {
      const err = new EvolutionError('TEST_CODE', 'test');
      expect(err.context).toEqual({});
    });
    it('name is "EvolutionError"', () => {
      const err = new EvolutionError('TEST_CODE', 'test');
      expect(err.name).toBe('EvolutionError');
    });
    it('context spreads provided keys', () => {
      const err = new EvolutionError('TEST', 'msg', { a: 1, b: 2 });
      expect(err.context).toEqual({ a: 1, b: 2 });
    });
  });

  // ── BottleneckNotFoundError ───────────────────────────────
  describe('BottleneckNotFoundError', () => {
    let err: BottleneckNotFoundError;
    beforeEach(() => {
      err = new BottleneckNotFoundError('bn-123');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
      expect(err).toBeInstanceOf(Error);
    });
    it('has bottleneckId', () => {
      expect(err.bottleneckId).toBe('bn-123');
    });
    it('has code "BOTTLENECK_NOT_FOUND"', () => {
      expect(err.code).toBe('BOTTLENECK_NOT_FOUND');
    });
    it('message includes bottleneckId', () => {
      expect(err.message).toContain('bn-123');
    });
    it('name is "BottleneckNotFoundError"', () => {
      expect(err.name).toBe('BottleneckNotFoundError');
    });
    it('context includes bottleneckId', () => {
      expect(err.context.bottleneckId).toBe('bn-123');
    });
    it('accepts optional context', () => {
      const e = new BottleneckNotFoundError('bn-1', { extra: true });
      expect(e.context.extra).toBe(true);
      expect(e.context.bottleneckId).toBe('bn-1');
    });
    it('timestamp is ISO string', () => {
      expect(err.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── BottleneckLimitExceededError ──────────────────────────
  describe('BottleneckLimitExceededError', () => {
    let err: BottleneckLimitExceededError;
    beforeEach(() => {
      err = new BottleneckLimitExceededError(500);
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes max', () => {
      expect(err.message).toContain('500');
    });
    it('code is "BOTTLENECK_LIMIT_EXCEEDED"', () => {
      expect(err.code).toBe('BOTTLENECK_LIMIT_EXCEEDED');
    });
    it('name is "BottleneckLimitExceededError"', () => {
      expect(err.name).toBe('BottleneckLimitExceededError');
    });
    it('context includes maxBottlenecks', () => {
      expect(err.context.maxBottlenecks).toBe(500);
    });
    it('accepts optional context', () => {
      const e = new BottleneckLimitExceededError(100, { extra: 42 });
      expect(e.context.extra).toBe(42);
    });
    it('timestamp is ISO string', () => {
      expect(err.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── ImprovementNotFoundError ──────────────────────────────
  describe('ImprovementNotFoundError', () => {
    let err: ImprovementNotFoundError;
    beforeEach(() => {
      err = new ImprovementNotFoundError('imp-456');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('has improvementId', () => {
      expect(err.improvementId).toBe('imp-456');
    });
    it('message includes improvementId', () => {
      expect(err.message).toContain('imp-456');
    });
    it('code is "IMPROVEMENT_NOT_FOUND"', () => {
      expect(err.code).toBe('IMPROVEMENT_NOT_FOUND');
    });
    it('name is "ImprovementNotFoundError"', () => {
      expect(err.name).toBe('ImprovementNotFoundError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── ImprovementLimitExceededError ─────────────────────────
  describe('ImprovementLimitExceededError', () => {
    let err: ImprovementLimitExceededError;
    beforeEach(() => {
      err = new ImprovementLimitExceededError(200);
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes max', () => {
      expect(err.message).toContain('200');
    });
    it('code is "IMPROVEMENT_LIMIT_EXCEEDED"', () => {
      expect(err.code).toBe('IMPROVEMENT_LIMIT_EXCEEDED');
    });
    it('name is "ImprovementLimitExceededError"', () => {
      expect(err.name).toBe('ImprovementLimitExceededError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── ImprovementStateError ─────────────────────────────────
  describe('ImprovementStateError', () => {
    let err: ImprovementStateError;
    beforeEach(() => {
      err = new ImprovementStateError('imp-1', 'Proposed', 'Completed');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('has improvementId', () => {
      expect(err.improvementId).toBe('imp-1');
    });
    it('has currentStatus', () => {
      expect(err.currentStatus).toBe('Proposed');
    });
    it('has targetStatus', () => {
      expect(err.targetStatus).toBe('Completed');
    });
    it('message includes improvementId, current, and target', () => {
      expect(err.message).toContain('imp-1');
      expect(err.message).toContain('Proposed');
      expect(err.message).toContain('Completed');
    });
    it('code is "IMPROVEMENT_STATE_ERROR"', () => {
      expect(err.code).toBe('IMPROVEMENT_STATE_ERROR');
    });
    it('name is "ImprovementStateError"', () => {
      expect(err.name).toBe('ImprovementStateError');
    });
    it('context includes all fields', () => {
      expect(err.context.improvementId).toBe('imp-1');
      expect(err.context.currentStatus).toBe('Proposed');
      expect(err.context.targetStatus).toBe('Completed');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── ExperimentNotFoundError ───────────────────────────────
  describe('ExperimentNotFoundError', () => {
    let err: ExperimentNotFoundError;
    beforeEach(() => {
      err = new ExperimentNotFoundError('exp-789');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('has experimentId', () => {
      expect(err.experimentId).toBe('exp-789');
    });
    it('message includes experimentId', () => {
      expect(err.message).toContain('exp-789');
    });
    it('code is "EXPERIMENT_NOT_FOUND"', () => {
      expect(err.code).toBe('EXPERIMENT_NOT_FOUND');
    });
    it('name is "ExperimentNotFoundError"', () => {
      expect(err.name).toBe('ExperimentNotFoundError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── ExperimentLimitExceededError ──────────────────────────
  describe('ExperimentLimitExceededError', () => {
    let err: ExperimentLimitExceededError;
    beforeEach(() => {
      err = new ExperimentLimitExceededError(100);
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes max', () => {
      expect(err.message).toContain('100');
    });
    it('code is "EXPERIMENT_LIMIT_EXCEEDED"', () => {
      expect(err.code).toBe('EXPERIMENT_LIMIT_EXCEEDED');
    });
    it('name is "ExperimentLimitExceededError"', () => {
      expect(err.name).toBe('ExperimentLimitExceededError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── ExperimentStateError ──────────────────────────────────
  describe('ExperimentStateError', () => {
    let err: ExperimentStateError;
    beforeEach(() => {
      err = new ExperimentStateError('exp-1', 'Proposed', 'Running');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('has experimentId', () => {
      expect(err.experimentId).toBe('exp-1');
    });
    it('has currentStatus', () => {
      expect(err.currentStatus).toBe('Proposed');
    });
    it('has targetStatus', () => {
      expect(err.targetStatus).toBe('Running');
    });
    it('message includes all fields', () => {
      expect(err.message).toContain('exp-1');
      expect(err.message).toContain('Proposed');
      expect(err.message).toContain('Running');
    });
    it('code is "EXPERIMENT_STATE_ERROR"', () => {
      expect(err.code).toBe('EXPERIMENT_STATE_ERROR');
    });
    it('name is "ExperimentStateError"', () => {
      expect(err.name).toBe('ExperimentStateError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── ExperimentTimeoutError ────────────────────────────────
  describe('ExperimentTimeoutError', () => {
    let err: ExperimentTimeoutError;
    beforeEach(() => {
      err = new ExperimentTimeoutError('exp-1', 5000);
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('has experimentId', () => {
      expect(err.experimentId).toBe('exp-1');
    });
    it('message includes experimentId', () => {
      expect(err.message).toContain('exp-1');
    });
    it('message includes timeout', () => {
      expect(err.message).toContain('5000');
    });
    it('code is "EXPERIMENT_TIMEOUT"', () => {
      expect(err.code).toBe('EXPERIMENT_TIMEOUT');
    });
    it('name is "ExperimentTimeoutError"', () => {
      expect(err.name).toBe('ExperimentTimeoutError');
    });
    it('context includes timeoutMs', () => {
      expect(err.context.timeoutMs).toBe(5000);
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── ValueAnalysisError ────────────────────────────────────
  describe('ValueAnalysisError', () => {
    let err: ValueAnalysisError;
    beforeEach(() => {
      err = new ValueAnalysisError('missing metrics');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes reason', () => {
      expect(err.message).toContain('missing metrics');
    });
    it('code is "VALUE_ANALYSIS_ERROR"', () => {
      expect(err.code).toBe('VALUE_ANALYSIS_ERROR');
    });
    it('name is "ValueAnalysisError"', () => {
      expect(err.name).toBe('ValueAnalysisError');
    });
    it('context includes reason', () => {
      expect(err.context.reason).toBe('missing metrics');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── NoValueProofError ──────────────────────────────────────
  describe('NoValueProofError', () => {
    let err: NoValueProofError;
    beforeEach(() => {
      err = new NoValueProofError('imp-42');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes improvementId', () => {
      expect(err.message).toContain('imp-42');
    });
    it('message mentions PHI-007', () => {
      expect(err.message).toContain('PHI-007');
    });
    it('code is "NO_VALUE_PROOF"', () => {
      expect(err.code).toBe('NO_VALUE_PROOF');
    });
    it('name is "NoValueProofError"', () => {
      expect(err.name).toBe('NoValueProofError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── OptimizationWithoutValueError ─────────────────────────
  describe('OptimizationWithoutValueError', () => {
    let err: OptimizationWithoutValueError;
    beforeEach(() => {
      err = new OptimizationWithoutValueError('imp-99');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes improvementId', () => {
      expect(err.message).toContain('imp-99');
    });
    it('message mentions PHI-005', () => {
      expect(err.message).toContain('PHI-005');
    });
    it('code is "OPTIMIZATION_WITHOUT_VALUE"', () => {
      expect(err.code).toBe('OPTIMIZATION_WITHOUT_VALUE');
    });
    it('name is "OptimizationWithoutValueError"', () => {
      expect(err.name).toBe('OptimizationWithoutValueError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── LocalOptimizationError ────────────────────────────────
  describe('LocalOptimizationError', () => {
    let err: LocalOptimizationError;
    beforeEach(() => {
      err = new LocalOptimizationError('imp-77');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes improvementId', () => {
      expect(err.message).toContain('imp-77');
    });
    it('message mentions PHI-006', () => {
      expect(err.message).toContain('PHI-006');
    });
    it('code is "LOCAL_OPTIMIZATION"', () => {
      expect(err.code).toBe('LOCAL_OPTIMIZATION');
    });
    it('name is "LocalOptimizationError"', () => {
      expect(err.name).toBe('LocalOptimizationError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── PINotFoundError ────────────────────────────────────────
  describe('PINotFoundError', () => {
    let err: PINotFoundError;
    beforeEach(() => {
      err = new PINotFoundError('kpi-55');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('has kpiId', () => {
      expect(err.kpiId).toBe('kpi-55');
    });
    it('message includes kpiId', () => {
      expect(err.message).toContain('kpi-55');
    });
    it('code is "KPI_NOT_FOUND"', () => {
      expect(err.code).toBe('KPI_NOT_FOUND');
    });
    it('name is "PINotFoundError"', () => {
      expect(err.name).toBe('PINotFoundError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── PILimitExceededError ───────────────────────────────────
  describe('PILimitExceededError', () => {
    let err: PILimitExceededError;
    beforeEach(() => {
      err = new PILimitExceededError(500);
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes max', () => {
      expect(err.message).toContain('500');
    });
    it('code is "KPI_LIMIT_EXCEEDED"', () => {
      expect(err.code).toBe('KPI_LIMIT_EXCEEDED');
    });
    it('name is "PILimitExceededError"', () => {
      expect(err.name).toBe('PILimitExceededError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── FeedbackNotFoundError ─────────────────────────────────
  describe('FeedbackNotFoundError', () => {
    let err: FeedbackNotFoundError;
    beforeEach(() => {
      err = new FeedbackNotFoundError('fb-11');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('has feedbackId', () => {
      expect(err.feedbackId).toBe('fb-11');
    });
    it('message includes feedbackId', () => {
      expect(err.message).toContain('fb-11');
    });
    it('code is "FEEDBACK_NOT_FOUND"', () => {
      expect(err.code).toBe('FEEDBACK_NOT_FOUND');
    });
    it('name is "FeedbackNotFoundError"', () => {
      expect(err.name).toBe('FeedbackNotFoundError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── FeedbackLimitExceededError ────────────────────────────
  describe('FeedbackLimitExceededError', () => {
    let err: FeedbackLimitExceededError;
    beforeEach(() => {
      err = new FeedbackLimitExceededError(10000);
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes max', () => {
      expect(err.message).toContain('10000');
    });
    it('code is "FEEDBACK_LIMIT_EXCEEDED"', () => {
      expect(err.code).toBe('FEEDBACK_LIMIT_EXCEEDED');
    });
    it('name is "FeedbackLimitExceededError"', () => {
      expect(err.name).toBe('FeedbackLimitExceededError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── LearningRecordNotFoundError ───────────────────────────
  describe('LearningRecordNotFoundError', () => {
    let err: LearningRecordNotFoundError;
    beforeEach(() => {
      err = new LearningRecordNotFoundError('lr-22');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('has recordId', () => {
      expect(err.recordId).toBe('lr-22');
    });
    it('message includes recordId', () => {
      expect(err.message).toContain('lr-22');
    });
    it('code is "LEARNING_RECORD_NOT_FOUND"', () => {
      expect(err.code).toBe('LEARNING_RECORD_NOT_FOUND');
    });
    it('name is "LearningRecordNotFoundError"', () => {
      expect(err.name).toBe('LearningRecordNotFoundError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── EvolutionGraphError ───────────────────────────────────
  describe('EvolutionGraphError', () => {
    let err: EvolutionGraphError;
    beforeEach(() => {
      err = new EvolutionGraphError('cycle detected');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes reason', () => {
      expect(err.message).toContain('cycle detected');
    });
    it('code is "EVOLUTION_GRAPH_ERROR"', () => {
      expect(err.code).toBe('EVOLUTION_GRAPH_ERROR');
    });
    it('name is "EvolutionGraphError"', () => {
      expect(err.name).toBe('EvolutionGraphError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── GraphNodeLimitExceededError ───────────────────────────
  describe('GraphNodeLimitExceededError', () => {
    let err: GraphNodeLimitExceededError;
    beforeEach(() => {
      err = new GraphNodeLimitExceededError(10000);
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes max', () => {
      expect(err.message).toContain('10000');
    });
    it('code is "GRAPH_NODE_LIMIT_EXCEEDED"', () => {
      expect(err.code).toBe('GRAPH_NODE_LIMIT_EXCEEDED');
    });
    it('name is "GraphNodeLimitExceededError"', () => {
      expect(err.name).toBe('GraphNodeLimitExceededError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── TechDebtNotFoundError ─────────────────────────────────
  describe('TechDebtNotFoundError', () => {
    let err: TechDebtNotFoundError;
    beforeEach(() => {
      err = new TechDebtNotFoundError('td-33');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('has techDebtId', () => {
      expect(err.techDebtId).toBe('td-33');
    });
    it('message includes techDebtId', () => {
      expect(err.message).toContain('td-33');
    });
    it('code is "TECH_DEBT_NOT_FOUND"', () => {
      expect(err.code).toBe('TECH_DEBT_NOT_FOUND');
    });
    it('name is "TechDebtNotFoundError"', () => {
      expect(err.name).toBe('TechDebtNotFoundError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── TechDebtLimitExceededError ────────────────────────────
  describe('TechDebtLimitExceededError', () => {
    let err: TechDebtLimitExceededError;
    beforeEach(() => {
      err = new TechDebtLimitExceededError(1000);
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes max', () => {
      expect(err.message).toContain('1000');
    });
    it('code is "TECH_DEBT_LIMIT_EXCEEDED"', () => {
      expect(err.code).toBe('TECH_DEBT_LIMIT_EXCEEDED');
    });
    it('name is "TechDebtLimitExceededError"', () => {
      expect(err.name).toBe('TechDebtLimitExceededError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── ArchitectureAnalysisError ─────────────────────────────
  describe('ArchitectureAnalysisError', () => {
    let err: ArchitectureAnalysisError;
    beforeEach(() => {
      err = new ArchitectureAnalysisError('module not found');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes reason', () => {
      expect(err.message).toContain('module not found');
    });
    it('code is "ARCHITECTURE_ANALYSIS_ERROR"', () => {
      expect(err.code).toBe('ARCHITECTURE_ANALYSIS_ERROR');
    });
    it('name is "ArchitectureAnalysisError"', () => {
      expect(err.name).toBe('ArchitectureAnalysisError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── RoadmapLimitExceededError ─────────────────────────────
  describe('RoadmapLimitExceededError', () => {
    let err: RoadmapLimitExceededError;
    beforeEach(() => {
      err = new RoadmapLimitExceededError(200);
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes max', () => {
      expect(err.message).toContain('200');
    });
    it('code is "ROADMAP_LIMIT_EXCEEDED"', () => {
      expect(err.code).toBe('ROADMAP_LIMIT_EXCEEDED');
    });
    it('name is "RoadmapLimitExceededError"', () => {
      expect(err.name).toBe('RoadmapLimitExceededError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── EvolutionRuntimeError ─────────────────────────────────
  describe('EvolutionRuntimeError', () => {
    let err: EvolutionRuntimeError;
    beforeEach(() => {
      err = new EvolutionRuntimeError('shutdown failed');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes reason', () => {
      expect(err.message).toContain('shutdown failed');
    });
    it('code is "EVOLUTION_RUNTIME_ERROR"', () => {
      expect(err.code).toBe('EVOLUTION_RUNTIME_ERROR');
    });
    it('name is "EvolutionRuntimeError"', () => {
      expect(err.name).toBe('EvolutionRuntimeError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── EvolutionNotInitializedError ──────────────────────────
  describe('EvolutionNotInitializedError', () => {
    let err: EvolutionNotInitializedError;
    beforeEach(() => {
      err = new EvolutionNotInitializedError();
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('has default message', () => {
      expect(err.message).toBe('Evolution runtime is not initialized');
    });
    it('code is "EVOLUTION_NOT_INITIALIZED"', () => {
      expect(err.code).toBe('EVOLUTION_NOT_INITIALIZED');
    });
    it('name is "EvolutionNotInitializedError"', () => {
      expect(err.name).toBe('EvolutionNotInitializedError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
    it('accepts optional context', () => {
      const e = new EvolutionNotInitializedError({ step: 'analyze' });
      expect(e.context.step).toBe('analyze');
    });
  });

  // ── EvolutionDisposedError ────────────────────────────────
  describe('EvolutionDisposedError', () => {
    let err: EvolutionDisposedError;
    beforeEach(() => {
      err = new EvolutionDisposedError();
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('has default message', () => {
      expect(err.message).toBe('Evolution runtime has been disposed');
    });
    it('code is "EVOLUTION_DISPOSED"', () => {
      expect(err.code).toBe('EVOLUTION_DISPOSED');
    });
    it('name is "EvolutionDisposedError"', () => {
      expect(err.name).toBe('EvolutionDisposedError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
    it('accepts optional context', () => {
      const e = new EvolutionDisposedError({ step: 'analyze' });
      expect(e.context.step).toBe('analyze');
    });
  });

  // ── ConstraintAnalysisError ───────────────────────────────
  describe('ConstraintAnalysisError', () => {
    let err: ConstraintAnalysisError;
    beforeEach(() => {
      err = new ConstraintAnalysisError('timeout');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes reason', () => {
      expect(err.message).toContain('timeout');
    });
    it('code is "CONSTRAINT_ANALYSIS_ERROR"', () => {
      expect(err.code).toBe('CONSTRAINT_ANALYSIS_ERROR');
    });
    it('name is "ConstraintAnalysisError"', () => {
      expect(err.name).toBe('ConstraintAnalysisError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── OpportunityCostError ──────────────────────────────────
  describe('OpportunityCostError', () => {
    let err: OpportunityCostError;
    beforeEach(() => {
      err = new OpportunityCostError('no data');
    });
    it('extends EvolutionError', () => {
      expect(err).toBeInstanceOf(EvolutionError);
    });
    it('message includes reason', () => {
      expect(err.message).toContain('no data');
    });
    it('code is "OPPORTUNITY_COST_ERROR"', () => {
      expect(err.code).toBe('OPPORTUNITY_COST_ERROR');
    });
    it('name is "OpportunityCostError"', () => {
      expect(err.name).toBe('OpportunityCostError');
    });
    it('context is frozen', () => {
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  });

  // ── All errors extend EvolutionError (instanceof chain) ───
  describe('All errors extend EvolutionError', () => {
    const allErrors = [
      new BottleneckNotFoundError('bn-1'),
      new BottleneckLimitExceededError(100),
      new ImprovementNotFoundError('imp-1'),
      new ImprovementLimitExceededError(100),
      new ImprovementStateError('imp-1', 'A', 'B'),
      new ExperimentNotFoundError('exp-1'),
      new ExperimentLimitExceededError(100),
      new ExperimentStateError('exp-1', 'A', 'B'),
      new ExperimentTimeoutError('exp-1', 1000),
      new ValueAnalysisError('reason'),
      new NoValueProofError('imp-1'),
      new OptimizationWithoutValueError('imp-1'),
      new LocalOptimizationError('imp-1'),
      new PINotFoundError('kpi-1'),
      new PILimitExceededError(100),
      new FeedbackNotFoundError('fb-1'),
      new FeedbackLimitExceededError(100),
      new LearningRecordNotFoundError('lr-1'),
      new EvolutionGraphError('reason'),
      new GraphNodeLimitExceededError(100),
      new TechDebtNotFoundError('td-1'),
      new TechDebtLimitExceededError(100),
      new ArchitectureAnalysisError('reason'),
      new RoadmapLimitExceededError(100),
      new EvolutionRuntimeError('reason'),
      new EvolutionNotInitializedError(),
      new EvolutionDisposedError(),
      new ConstraintAnalysisError('reason'),
      new OpportunityCostError('reason'),
    ];
    it('every error is instanceof EvolutionError', () => {
      for (const e of allErrors) {
        expect(e).toBeInstanceOf(EvolutionError);
      }
    });
    it('every error is instanceof Error', () => {
      for (const e of allErrors) {
        expect(e).toBeInstanceOf(Error);
      }
    });
    it('every error has a string name property', () => {
      for (const e of allErrors) {
        expect(typeof e.name).toBe('string');
        expect(e.name.length).toBeGreaterThan(0);
      }
    });
    it('every error has a string code property', () => {
      for (const e of allErrors) {
        expect(typeof (e as EvolutionError).code).toBe('string');
      }
    });
    it('every error has an ISO timestamp', () => {
      for (const e of allErrors) {
        expect((e as EvolutionError).timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });
    it('every error context is frozen', () => {
      for (const e of allErrors) {
        expect(Object.isFrozen((e as EvolutionError).context)).toBe(true);
      }
    });
  });
});

// ====================================================================
// 3. EVENTS  (~80 tests)
// ====================================================================

describe('Evolution Events', () => {
  // EventClassification is re-exported from common.ts via events.ts
  // We import it indirectly since events.ts uses it
  const classification = 'info' as const;

  // Helper: assert an event object has the required base fields
  function assertEventBase(evt: Record<string, unknown>) {
    expect(typeof evt.eventType).toBe('string');
    expect(typeof evt.classification).toBe('string');
    expect(typeof evt.timestamp).toBe('string');
    expect(typeof evt.metadata).toBe('object');
    expect(evt.metadata).not.toBeNull();
  }

  // ── BottleneckDetectedEvent ───────────────────────────────
  describe('BottleneckDetectedEvent', () => {
    it('can be constructed', () => {
      const evt: BottleneckDetectedEvent = Object.freeze({
        eventType: 'evolution.bottleneck.detected',
        classification,
        bottleneckId: brandBottleneckId('bn-1'),
        name: 'High latency',
        constraintType: ConstraintType.Performance,
        severity: BottleneckSeverity.High,
        targetRuntime: 'llm-runtime',
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.eventType).toBe('evolution.bottleneck.detected');
      expect(evt.bottleneckId).toBe('bn-1');
      expect(evt.name).toBe('High latency');
      expect(evt.constraintType).toBe(ConstraintType.Performance);
      expect(evt.severity).toBe(BottleneckSeverity.High);
      expect(evt.targetRuntime).toBe('llm-runtime');
    });
    it('eventType is a string literal', () => {
      const evt: BottleneckDetectedEvent = Object.freeze({
        eventType: 'evolution.bottleneck.detected',
        classification,
        bottleneckId: brandBottleneckId('bn-1'),
        name: 'test',
        constraintType: ConstraintType.Performance,
        severity: BottleneckSeverity.Low,
        targetRuntime: 'r',
        timestamp: ts,
        metadata: meta,
      });
      expect(typeof evt.eventType).toBe('string');
    });
    it('classification is a string', () => {
      const evt: BottleneckDetectedEvent = Object.freeze({
        eventType: 'evolution.bottleneck.detected',
        classification,
        bottleneckId: brandBottleneckId('bn-1'),
        name: 'test',
        constraintType: ConstraintType.Performance,
        severity: BottleneckSeverity.Low,
        targetRuntime: 'r',
        timestamp: ts,
        metadata: meta,
      });
      expect(typeof evt.classification).toBe('string');
    });
  });

  // ── BottleneckResolvedEvent ───────────────────────────────
  describe('BottleneckResolvedEvent', () => {
    it('can be constructed', () => {
      const evt: BottleneckResolvedEvent = Object.freeze({
        eventType: 'evolution.bottleneck.resolved',
        classification,
        bottleneckId: brandBottleneckId('bn-1'),
        resolvedAt: ts,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.bottleneckId).toBe('bn-1');
      expect(evt.resolvedAt).toBe(ts);
    });
    it('has resolvedAt as string', () => {
      const evt: BottleneckResolvedEvent = Object.freeze({
        eventType: 'evolution.bottleneck.resolved',
        classification,
        bottleneckId: brandBottleneckId('bn-1'),
        resolvedAt: ts,
        timestamp: ts,
        metadata: meta,
      });
      expect(typeof evt.resolvedAt).toBe('string');
    });
  });

  // ── ConstraintAnalyzedEvent ───────────────────────────────
  describe('ConstraintAnalyzedEvent', () => {
    it('can be constructed', () => {
      const evt: ConstraintAnalyzedEvent = Object.freeze({
        eventType: 'evolution.constraint.analyzed',
        classification,
        bottleneckId: brandBottleneckId('bn-1'),
        constraintType: ConstraintType.Memory,
        rootCause: 'memory leak in cache',
        durationMs: 250,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.bottleneckId).toBe('bn-1');
      expect(evt.constraintType).toBe(ConstraintType.Memory);
      expect(evt.rootCause).toBe('memory leak in cache');
      expect(evt.durationMs).toBe(250);
    });
    it('has rootCause as string', () => {
      const evt: ConstraintAnalyzedEvent = Object.freeze({
        eventType: 'evolution.constraint.analyzed',
        classification,
        bottleneckId: brandBottleneckId('bn-1'),
        constraintType: ConstraintType.Memory,
        rootCause: 'root',
        durationMs: 100,
        timestamp: ts,
        metadata: meta,
      });
      expect(typeof evt.rootCause).toBe('string');
    });
    it('has durationMs as number', () => {
      const evt: ConstraintAnalyzedEvent = Object.freeze({
        eventType: 'evolution.constraint.analyzed',
        classification,
        bottleneckId: brandBottleneckId('bn-1'),
        constraintType: ConstraintType.Memory,
        rootCause: 'r',
        durationMs: 42,
        timestamp: ts,
        metadata: meta,
      });
      expect(typeof evt.durationMs).toBe('number');
    });
  });

  // ── ImprovementProposedEvent ──────────────────────────────
  describe('ImprovementProposedEvent', () => {
    it('can be constructed', () => {
      const evt: ImprovementProposedEvent = Object.freeze({
        eventType: 'evolution.improvement.proposed',
        classification,
        improvementId: brandImprovementId('imp-1'),
        name: 'Add caching',
        constraintType: ConstraintType.Performance,
        valueScore: 85,
        priority: 1,
        valueDimension: ValueDimension.UserValue,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.improvementId).toBe('imp-1');
      expect(evt.name).toBe('Add caching');
      expect(evt.constraintType).toBe(ConstraintType.Performance);
      expect(evt.valueScore).toBe(85);
      expect(evt.priority).toBe(1);
      expect(evt.valueDimension).toBe(ValueDimension.UserValue);
    });
    it('has valueDimension as string', () => {
      const evt: ImprovementProposedEvent = Object.freeze({
        eventType: 'evolution.improvement.proposed',
        classification,
        improvementId: brandImprovementId('imp-1'),
        name: 'test',
        constraintType: ConstraintType.Performance,
        valueScore: 50,
        priority: 1,
        valueDimension: ValueDimension.PlatformValue,
        timestamp: ts,
        metadata: meta,
      });
      expect(typeof evt.valueDimension).toBe('string');
    });
  });

  // ── ImprovementStatusChangedEvent ─────────────────────────
  describe('ImprovementStatusChangedEvent', () => {
    it('can be constructed', () => {
      const evt: ImprovementStatusChangedEvent = Object.freeze({
        eventType: 'evolution.improvement.statusChanged',
        classification,
        improvementId: brandImprovementId('imp-1'),
        fromStatus: ImprovementStatus.Proposed,
        toStatus: ImprovementStatus.Planned,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.improvementId).toBe('imp-1');
      expect(evt.fromStatus).toBe(ImprovementStatus.Proposed);
      expect(evt.toStatus).toBe(ImprovementStatus.Planned);
    });
    it('fromStatus and toStatus are strings', () => {
      const evt: ImprovementStatusChangedEvent = Object.freeze({
        eventType: 'evolution.improvement.statusChanged',
        classification,
        improvementId: brandImprovementId('imp-1'),
        fromStatus: ImprovementStatus.Proposed,
        toStatus: ImprovementStatus.InProgress,
        timestamp: ts,
        metadata: meta,
      });
      expect(typeof evt.fromStatus).toBe('string');
      expect(typeof evt.toStatus).toBe('string');
    });
  });

  // ── ImprovementCompletedEvent ─────────────────────────────
  describe('ImprovementCompletedEvent', () => {
    it('can be constructed', () => {
      const evt: ImprovementCompletedEvent = Object.freeze({
        eventType: 'evolution.improvement.completed',
        classification,
        improvementId: brandImprovementId('imp-1'),
        valueScore: 92,
        durationMs: 5000,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.improvementId).toBe('imp-1');
      expect(evt.valueScore).toBe(92);
      expect(evt.durationMs).toBe(5000);
    });
  });

  // ── ImprovementRejectedEvent ──────────────────────────────
  describe('ImprovementRejectedEvent', () => {
    it('can be constructed', () => {
      const evt: ImprovementRejectedEvent = Object.freeze({
        eventType: 'evolution.improvement.rejected',
        classification,
        improvementId: brandImprovementId('imp-1'),
        reason: 'Low value score',
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.improvementId).toBe('imp-1');
      expect(evt.reason).toBe('Low value score');
    });
  });

  // ── ValueAnalyzedEvent ────────────────────────────────────
  describe('ValueAnalyzedEvent', () => {
    it('can be constructed', () => {
      const evt: ValueAnalyzedEvent = Object.freeze({
        eventType: 'evolution.value.analyzed',
        classification,
        improvementId: brandImprovementId('imp-1'),
        valueScore: 88,
        valueDimension: ValueDimension.BusinessValue,
        valueCreated: 'Increased revenue by 15%',
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.improvementId).toBe('imp-1');
      expect(evt.valueScore).toBe(88);
      expect(evt.valueDimension).toBe(ValueDimension.BusinessValue);
      expect(evt.valueCreated).toBe('Increased revenue by 15%');
    });
  });

  // ── OpportunityCostAnalyzedEvent ──────────────────────────
  describe('OpportunityCostAnalyzedEvent', () => {
    it('can be constructed', () => {
      const evt: OpportunityCostAnalyzedEvent = Object.freeze({
        eventType: 'evolution.opportunityCost.analyzed',
        classification,
        improvementId: brandImprovementId('imp-1'),
        netBenefit: 42.5,
        foregoneCount: 3,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.improvementId).toBe('imp-1');
      expect(evt.netBenefit).toBe(42.5);
      expect(evt.foregoneCount).toBe(3);
    });
  });

  // ── ExperimentStartedEvent ────────────────────────────────
  describe('ExperimentStartedEvent', () => {
    it('can be constructed', () => {
      const evt: ExperimentStartedEvent = Object.freeze({
        eventType: 'evolution.experiment.started',
        classification,
        experimentId: brandExperimentId('exp-1'),
        name: 'Cache vs NoCache',
        improvementId: brandImprovementId('imp-1'),
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.experimentId).toBe('exp-1');
      expect(evt.name).toBe('Cache vs NoCache');
      expect(evt.improvementId).toBe('imp-1');
    });
  });

  // ── ExperimentCompletedEvent ──────────────────────────────
  describe('ExperimentCompletedEvent', () => {
    it('can be constructed', () => {
      const evt: ExperimentCompletedEvent = Object.freeze({
        eventType: 'evolution.experiment.completed',
        classification,
        experimentId: brandExperimentId('exp-1'),
        winner: 'A',
        confidence: 0.95,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.experimentId).toBe('exp-1');
      expect(evt.winner).toBe('A');
      expect(evt.confidence).toBe(0.95);
    });
    it('winner can be null', () => {
      const evt: ExperimentCompletedEvent = Object.freeze({
        eventType: 'evolution.experiment.completed',
        classification,
        experimentId: brandExperimentId('exp-1'),
        winner: null,
        confidence: 0.5,
        timestamp: ts,
        metadata: meta,
      });
      expect(evt.winner).toBeNull();
    });
    it('winner can be "B"', () => {
      const evt: ExperimentCompletedEvent = Object.freeze({
        eventType: 'evolution.experiment.completed',
        classification,
        experimentId: brandExperimentId('exp-1'),
        winner: 'B',
        confidence: 0.9,
        timestamp: ts,
        metadata: meta,
      });
      expect(evt.winner).toBe('B');
    });
  });

  // ── ExperimentFailedEvent ─────────────────────────────────
  describe('ExperimentFailedEvent', () => {
    it('can be constructed', () => {
      const evt: ExperimentFailedEvent = Object.freeze({
        eventType: 'evolution.experiment.failed',
        classification,
        experimentId: brandExperimentId('exp-1'),
        reason: 'Timeout exceeded',
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.experimentId).toBe('exp-1');
      expect(evt.reason).toBe('Timeout exceeded');
    });
  });

  // ── KPIRegisteredEvent ────────────────────────────────────
  describe('KPIRegisteredEvent', () => {
    it('can be constructed', () => {
      const evt: KPIRegisteredEvent = Object.freeze({
        eventType: 'evolution.kpi.registered',
        classification,
        kpiId: brandKPIId('kpi-1'),
        name: 'Response Time',
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.kpiId).toBe('kpi-1');
      expect(evt.name).toBe('Response Time');
    });
  });

  // ── KPIUpdatedEvent ───────────────────────────────────────
  describe('KPIUpdatedEvent', () => {
    it('can be constructed', () => {
      const evt: KPIUpdatedEvent = Object.freeze({
        eventType: 'evolution.kpi.updated',
        classification,
        kpiId: brandKPIId('kpi-1'),
        newValue: 120,
        previousValue: 200,
        improved: true,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.kpiId).toBe('kpi-1');
      expect(evt.newValue).toBe(120);
      expect(evt.previousValue).toBe(200);
      expect(evt.improved).toBe(true);
    });
  });

  // ── FeedbackReceivedEvent ─────────────────────────────────
  describe('FeedbackReceivedEvent', () => {
    it('can be constructed', () => {
      const evt: FeedbackReceivedEvent = Object.freeze({
        eventType: 'evolution.feedback.received',
        classification,
        feedbackId: brandFeedbackId('fb-1'),
        source: FeedbackSource.User,
        sentiment: FeedbackSentiment.Positive,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.feedbackId).toBe('fb-1');
      expect(evt.source).toBe(FeedbackSource.User);
      expect(evt.sentiment).toBe(FeedbackSentiment.Positive);
    });
  });

  // ── FeedbackProcessedEvent ────────────────────────────────
  describe('FeedbackProcessedEvent', () => {
    it('can be constructed', () => {
      const evt: FeedbackProcessedEvent = Object.freeze({
        eventType: 'evolution.feedback.processed',
        classification,
        feedbackId: brandFeedbackId('fb-1'),
        insightCount: 3,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.feedbackId).toBe('fb-1');
      expect(evt.insightCount).toBe(3);
    });
  });

  // ── LearningRecordedEvent ─────────────────────────────────
  describe('LearningRecordedEvent', () => {
    it('can be constructed', () => {
      const evt: LearningRecordedEvent = Object.freeze({
        eventType: 'evolution.learning.recorded',
        classification,
        recordId: brandLearningRecordId('lr-1'),
        outcome: LearningOutcome.Improved,
        lesson: 'Caching improves throughput by 40%',
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.recordId).toBe('lr-1');
      expect(evt.outcome).toBe(LearningOutcome.Improved);
      expect(evt.lesson).toBe('Caching improves throughput by 40%');
    });
  });

  // ── EvolutionNodeAddedEvent ───────────────────────────────
  describe('EvolutionNodeAddedEvent', () => {
    it('can be constructed', () => {
      const evt: EvolutionNodeAddedEvent = Object.freeze({
        eventType: 'evolution.graph.nodeAdded',
        classification,
        nodeId: brandEvolutionNodeId('node-1'),
        type: 'improvement',
        title: 'Add Redis cache',
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.nodeId).toBe('node-1');
      expect(evt.type).toBe('improvement');
      expect(evt.title).toBe('Add Redis cache');
    });
  });

  // ── TechDebtDetectedEvent ─────────────────────────────────
  describe('TechDebtDetectedEvent', () => {
    it('can be constructed', () => {
      const evt: TechDebtDetectedEvent = Object.freeze({
        eventType: 'evolution.techDebt.detected',
        classification,
        techDebtId: brandTechDebtId('td-1'),
        name: 'Deprecated API usage',
        priority: TechDebtPriority.High,
        estimatedCost: 40,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.techDebtId).toBe('td-1');
      expect(evt.name).toBe('Deprecated API usage');
      expect(evt.priority).toBe(TechDebtPriority.High);
      expect(evt.estimatedCost).toBe(40);
    });
  });

  // ── TechDebtResolvedEvent ─────────────────────────────────
  describe('TechDebtResolvedEvent', () => {
    it('can be constructed', () => {
      const evt: TechDebtResolvedEvent = Object.freeze({
        eventType: 'evolution.techDebt.resolved',
        classification,
        techDebtId: brandTechDebtId('td-1'),
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.techDebtId).toBe('td-1');
    });
  });

  // ── ArchOptimizationSuggestedEvent ────────────────────────
  describe('ArchOptimizationSuggestedEvent', () => {
    it('can be constructed', () => {
      const evt: ArchOptimizationSuggestedEvent = Object.freeze({
        eventType: 'evolution.arch.suggested',
        classification,
        nodeId: brandEvolutionNodeId('node-1'),
        type: ArchOptimizationType.Simplify,
        title: 'Remove unused middleware',
        estimatedImpact: 0.7,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.nodeId).toBe('node-1');
      expect(evt.type).toBe(ArchOptimizationType.Simplify);
      expect(evt.title).toBe('Remove unused middleware');
      expect(evt.estimatedImpact).toBe(0.7);
    });
  });

  // ── RoadmapCreatedEvent ───────────────────────────────────
  describe('RoadmapCreatedEvent', () => {
    it('can be constructed', () => {
      const evt: RoadmapCreatedEvent = Object.freeze({
        eventType: 'evolution.roadmap.created',
        classification,
        roadmapId: brandRoadmapId('rm-1'),
        title: 'Q1 2024 Optimizations',
        itemCount: 10,
        totalValue: 450,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.roadmapId).toBe('rm-1');
      expect(evt.title).toBe('Q1 2024 Optimizations');
      expect(evt.itemCount).toBe(10);
      expect(evt.totalValue).toBe(450);
    });
  });

  // ── EvolutionInitializedEvent ─────────────────────────────
  describe('EvolutionInitializedEvent', () => {
    it('can be constructed', () => {
      const evt: EvolutionInitializedEvent = Object.freeze({
        eventType: 'evolution.runtime.initialized',
        classification,
        subsystemCount: 14,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.subsystemCount).toBe(14);
    });
  });

  // ── EvolutionStateChangedEvent ────────────────────────────
  describe('EvolutionStateChangedEvent', () => {
    it('can be constructed', () => {
      const evt: EvolutionStateChangedEvent = Object.freeze({
        eventType: 'evolution.runtime.stateChanged',
        classification,
        fromState: EvolutionState.Initializing,
        toState: EvolutionState.Ready,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.fromState).toBe(EvolutionState.Initializing);
      expect(evt.toState).toBe(EvolutionState.Ready);
    });
  });

  // ── EvolutionAnalysisCompletedEvent ───────────────────────
  describe('EvolutionAnalysisCompletedEvent', () => {
    it('can be constructed', () => {
      const evt: EvolutionAnalysisCompletedEvent = Object.freeze({
        eventType: 'evolution.analysis.completed',
        classification,
        bottlenecksFound: 5,
        improvementsProposed: 12,
        durationMs: 3000,
        timestamp: ts,
        metadata: meta,
      });
      assertEventBase(evt);
      expect(evt.bottlenecksFound).toBe(5);
      expect(evt.improvementsProposed).toBe(12);
      expect(evt.durationMs).toBe(3000);
    });
  });

  // ── EvolutionEvent union type ─────────────────────────────
  describe('EvolutionEvent union type', () => {
    it('exists as a type', () => {
      // If this compiles, the type exists
      const assignToUnion = (evt: EvolutionEvent) => evt;
      const bEvt: BottleneckDetectedEvent = Object.freeze({
        eventType: 'evolution.bottleneck.detected',
        classification,
        bottleneckId: brandBottleneckId('bn-1'),
        name: 'test',
        constraintType: ConstraintType.Performance,
        severity: BottleneckSeverity.Low,
        targetRuntime: 'r',
        timestamp: ts,
        metadata: meta,
      });
      expect(typeof assignToUnion(bEvt)).toBe('object');
    });
  });

  // ── All event types are strings (not enums) ───────────────
  describe('Event type strings are literal strings', () => {
    it('BottleneckDetectedEvent.eventType is a string', () => {
      const evt: BottleneckDetectedEvent = Object.freeze({
        eventType: 'evolution.bottleneck.detected',
        classification,
        bottleneckId: brandBottleneckId('bn-1'),
        name: 't',
        constraintType: ConstraintType.Performance,
        severity: BottleneckSeverity.Low,
        targetRuntime: 'r',
        timestamp: ts,
        metadata: meta,
      });
      expect(typeof evt.eventType).toBe('string');
      // Not an enum number
      expect(typeof evt.eventType).not.toBe('number');
    });

    const eventConstructors: Array<() => Record<string, unknown>> = [
      () => Object.freeze({ eventType: 'evolution.bottleneck.resolved', classification, bottleneckId: brandBottleneckId('bn-1'), resolvedAt: ts, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.constraint.analyzed', classification, bottleneckId: brandBottleneckId('bn-1'), constraintType: ConstraintType.Performance, rootCause: 'r', durationMs: 1, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.improvement.proposed', classification, improvementId: brandImprovementId('imp-1'), name: 'n', constraintType: ConstraintType.Performance, valueScore: 1, priority: 1, valueDimension: ValueDimension.UserValue, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.improvement.statusChanged', classification, improvementId: brandImprovementId('imp-1'), fromStatus: ImprovementStatus.Proposed, toStatus: ImprovementStatus.Planned, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.improvement.completed', classification, improvementId: brandImprovementId('imp-1'), valueScore: 1, durationMs: 1, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.improvement.rejected', classification, improvementId: brandImprovementId('imp-1'), reason: 'r', timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.value.analyzed', classification, improvementId: brandImprovementId('imp-1'), valueScore: 1, valueDimension: ValueDimension.UserValue, valueCreated: 'v', timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.opportunityCost.analyzed', classification, improvementId: brandImprovementId('imp-1'), netBenefit: 1, foregoneCount: 1, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.experiment.started', classification, experimentId: brandExperimentId('exp-1'), name: 'n', improvementId: brandImprovementId('imp-1'), timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.experiment.completed', classification, experimentId: brandExperimentId('exp-1'), winner: 'A', confidence: 0.9, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.experiment.failed', classification, experimentId: brandExperimentId('exp-1'), reason: 'r', timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.kpi.registered', classification, kpiId: brandKPIId('kpi-1'), name: 'n', timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.kpi.updated', classification, kpiId: brandKPIId('kpi-1'), newValue: 1, previousValue: 2, improved: false, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.feedback.received', classification, feedbackId: brandFeedbackId('fb-1'), source: FeedbackSource.User, sentiment: FeedbackSentiment.Positive, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.feedback.processed', classification, feedbackId: brandFeedbackId('fb-1'), insightCount: 1, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.learning.recorded', classification, recordId: brandLearningRecordId('lr-1'), outcome: LearningOutcome.Improved, lesson: 'l', timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.graph.nodeAdded', classification, nodeId: brandEvolutionNodeId('node-1'), type: 'improvement', title: 't', timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.techDebt.detected', classification, techDebtId: brandTechDebtId('td-1'), name: 'n', priority: TechDebtPriority.Low, estimatedCost: 1, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.techDebt.resolved', classification, techDebtId: brandTechDebtId('td-1'), timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.arch.suggested', classification, nodeId: brandEvolutionNodeId('node-1'), type: ArchOptimizationType.Simplify, title: 't', estimatedImpact: 1, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.roadmap.created', classification, roadmapId: brandRoadmapId('rm-1'), title: 't', itemCount: 1, totalValue: 1, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.runtime.initialized', classification, subsystemCount: 14, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.runtime.stateChanged', classification, fromState: EvolutionState.Uninitialized, toState: EvolutionState.Ready, timestamp: ts, metadata: meta }),
      () => Object.freeze({ eventType: 'evolution.analysis.completed', classification, bottlenecksFound: 1, improvementsProposed: 1, durationMs: 1, timestamp: ts, metadata: meta }),
    ];

    it('all 25 event types have string eventType', () => {
      for (const factory of eventConstructors) {
        const evt = factory();
        expect(typeof evt.eventType).toBe('string');
      }
    });

    it('all 25 event types have string classification', () => {
      for (const factory of eventConstructors) {
        const evt = factory();
        expect(typeof evt.classification).toBe('string');
      }
    });

    it('all 25 event types have string timestamp', () => {
      for (const factory of eventConstructors) {
        const evt = factory();
        expect(typeof evt.timestamp).toBe('string');
      }
    });

    it('all 25 event types have object metadata', () => {
      for (const factory of eventConstructors) {
        const evt = factory();
        expect(typeof evt.metadata).toBe('object');
        expect(evt.metadata).not.toBeNull();
      }
    });
  });
});

// ====================================================================
// 4. CONTRACTS  (~50 tests)
// ====================================================================

describe('Evolution Contracts', () => {
  // ── Interface existence verification (compile-time) ───────
  // By constructing objects that satisfy each interface, we prove the types exist

  describe('IBottleneckDetector interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IBottleneckDetector = {
        detect: vi.fn().mockResolvedValue([]),
        getById: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue([]),
        resolve: vi.fn().mockResolvedValue(undefined),
        count: vi.fn().mockResolvedValue(0),
      };
      expect(typeof impl.detect).toBe('function');
      expect(typeof impl.getById).toBe('function');
      expect(typeof impl.list).toBe('function');
      expect(typeof impl.resolve).toBe('function');
      expect(typeof impl.count).toBe('function');
    });
  });

  describe('IConstraintAnalyzer interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IConstraintAnalyzer = {
        analyze: vi.fn().mockResolvedValue({} as any),
        getAnalysis: vi.fn().mockResolvedValue(null),
        listAnalyses: vi.fn().mockResolvedValue([]),
      };
      expect(typeof impl.analyze).toBe('function');
      expect(typeof impl.getAnalysis).toBe('function');
      expect(typeof impl.listAnalyses).toBe('function');
    });
  });

  describe('IImprovementEngine interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IImprovementEngine = {
        propose: vi.fn().mockResolvedValue({} as any),
        getById: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue([]),
        updateStatus: vi.fn().mockResolvedValue(undefined),
        count: vi.fn().mockResolvedValue(0),
      };
      expect(typeof impl.propose).toBe('function');
      expect(typeof impl.getById).toBe('function');
      expect(typeof impl.list).toBe('function');
      expect(typeof impl.updateStatus).toBe('function');
      expect(typeof impl.count).toBe('function');
    });
  });

  describe('IValueAnalyzer interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IValueAnalyzer = {
        analyze: vi.fn().mockResolvedValue({} as any),
        getByImprovementId: vi.fn().mockResolvedValue(null),
        listAnalyses: vi.fn().mockResolvedValue([]),
      };
      expect(typeof impl.analyze).toBe('function');
    });
  });

  describe('IOpportunityCostEngine interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IOpportunityCostEngine = {
        analyze: vi.fn().mockResolvedValue({} as any),
        getByImprovementId: vi.fn().mockResolvedValue(null),
        listAnalyses: vi.fn().mockResolvedValue([]),
      };
      expect(typeof impl.analyze).toBe('function');
    });
  });

  describe('IOptimizationPlanner interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IOptimizationPlanner = {
        generateRoadmap: vi.fn().mockResolvedValue({} as any),
        getRoadmap: vi.fn().mockResolvedValue(null),
        listRoadmaps: vi.fn().mockResolvedValue([]),
        updateItemStatus: vi.fn().mockResolvedValue(undefined),
      };
      expect(typeof impl.generateRoadmap).toBe('function');
      expect(typeof impl.getRoadmap).toBe('function');
      expect(typeof impl.listRoadmaps).toBe('function');
      expect(typeof impl.updateItemStatus).toBe('function');
    });
  });

  describe('IExperimentRuntime interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IExperimentRuntime = {
        propose: vi.fn().mockResolvedValue({} as any),
        start: vi.fn().mockResolvedValue(undefined),
        complete: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn().mockResolvedValue(undefined),
        getById: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      };
      expect(typeof impl.propose).toBe('function');
      expect(typeof impl.start).toBe('function');
      expect(typeof impl.complete).toBe('function');
      expect(typeof impl.cancel).toBe('function');
      expect(typeof impl.getById).toBe('function');
      expect(typeof impl.list).toBe('function');
      expect(typeof impl.count).toBe('function');
    });
  });

  describe('IKPIRuntime interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IKPIRuntime = {
        register: vi.fn().mockResolvedValue({} as any),
        record: vi.fn().mockResolvedValue(undefined),
        getById: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue([]),
        getComparison: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
      };
      expect(typeof impl.register).toBe('function');
      expect(typeof impl.record).toBe('function');
      expect(typeof impl.getById).toBe('function');
      expect(typeof impl.list).toBe('function');
      expect(typeof impl.getComparison).toBe('function');
      expect(typeof impl.count).toBe('function');
    });
  });

  describe('IFeedbackCollector interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IFeedbackCollector = {
        collect: vi.fn().mockResolvedValue({} as any),
        process: vi.fn().mockResolvedValue({} as any),
        getById: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      };
      expect(typeof impl.collect).toBe('function');
      expect(typeof impl.process).toBe('function');
      expect(typeof impl.getById).toBe('function');
      expect(typeof impl.list).toBe('function');
      expect(typeof impl.count).toBe('function');
    });
  });

  describe('ILearningLoop interface', () => {
    it('can be satisfied by an object', () => {
      const impl: ILearningLoop = {
        record: vi.fn().mockResolvedValue({} as any),
        getById: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue([]),
        getLessonsForAction: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      };
      expect(typeof impl.record).toBe('function');
      expect(typeof impl.getById).toBe('function');
      expect(typeof impl.list).toBe('function');
      expect(typeof impl.getLessonsForAction).toBe('function');
      expect(typeof impl.count).toBe('function');
    });
  });

  describe('IEvolutionGraph interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IEvolutionGraph = {
        addNode: vi.fn().mockResolvedValue({} as any),
        addEdge: vi.fn().mockResolvedValue({} as any),
        getNode: vi.fn().mockResolvedValue(null),
        getRootNodes: vi.fn().mockResolvedValue([]),
        getPath: vi.fn().mockResolvedValue([]),
        listNodes: vi.fn().mockResolvedValue([]),
        listEdges: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      };
      expect(typeof impl.addNode).toBe('function');
      expect(typeof impl.addEdge).toBe('function');
      expect(typeof impl.getNode).toBe('function');
      expect(typeof impl.getRootNodes).toBe('function');
      expect(typeof impl.getPath).toBe('function');
      expect(typeof impl.listNodes).toBe('function');
      expect(typeof impl.listEdges).toBe('function');
      expect(typeof impl.count).toBe('function');
    });
  });

  describe('IArchitectureOptimizer interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IArchitectureOptimizer = {
        analyze: vi.fn().mockResolvedValue([]),
        getById: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      };
      expect(typeof impl.analyze).toBe('function');
      expect(typeof impl.getById).toBe('function');
      expect(typeof impl.list).toBe('function');
      expect(typeof impl.count).toBe('function');
    });
  });

  describe('ITechDebtAnalyzer interface', () => {
    it('can be satisfied by an object', () => {
      const impl: ITechDebtAnalyzer = {
        register: vi.fn().mockResolvedValue({} as any),
        resolve: vi.fn().mockResolvedValue(undefined),
        getById: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue([]),
        getTotalCost: vi.fn().mockResolvedValue(0),
        count: vi.fn().mockResolvedValue(0),
      };
      expect(typeof impl.register).toBe('function');
      expect(typeof impl.resolve).toBe('function');
      expect(typeof impl.getById).toBe('function');
      expect(typeof impl.list).toBe('function');
      expect(typeof impl.getTotalCost).toBe('function');
      expect(typeof impl.count).toBe('function');
    });
  });

  describe('IRecommendationPrioritizer interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IRecommendationPrioritizer = {
        prioritize: vi.fn().mockResolvedValue([]),
        calculatePriority: vi.fn().mockReturnValue(1),
      };
      expect(typeof impl.prioritize).toBe('function');
      expect(typeof impl.calculatePriority).toBe('function');
    });
  });

  describe('IEvolutionRuntime interface', () => {
    it('can be satisfied by an object', () => {
      const impl: IEvolutionRuntime = {
        state: EvolutionState.Uninitialized,
        analyze: vi.fn().mockResolvedValue({} as any),
        getMetrics: vi.fn().mockResolvedValue({} as any),
        getBottleneckDetector: vi.fn().mockReturnValue({} as any),
        getConstraintAnalyzer: vi.fn().mockReturnValue({} as any),
        getImprovementEngine: vi.fn().mockReturnValue({} as any),
        getValueAnalyzer: vi.fn().mockReturnValue({} as any),
        getOpportunityCostEngine: vi.fn().mockReturnValue({} as any),
        getOptimizationPlanner: vi.fn().mockReturnValue({} as any),
        getExperimentRuntime: vi.fn().mockReturnValue({} as any),
        getKPIRuntime: vi.fn().mockReturnValue({} as any),
        getFeedbackCollector: vi.fn().mockReturnValue({} as any),
        getLearningLoop: vi.fn().mockReturnValue({} as any),
        getEvolutionGraph: vi.fn().mockReturnValue({} as any),
        getArchitectureOptimizer: vi.fn().mockReturnValue({} as any),
        getTechDebtAnalyzer: vi.fn().mockReturnValue({} as any),
        getRecommendationPrioritizer: vi.fn().mockReturnValue({} as any),
        initialize: vi.fn().mockResolvedValue(undefined),
        shutdown: vi.fn().mockResolvedValue(undefined),
      };
      expect(typeof impl.analyze).toBe('function');
      expect(typeof impl.initialize).toBe('function');
      expect(typeof impl.shutdown).toBe('function');
      expect(typeof impl.state).toBe('string');
    });
  });

  // ── EvolutionPublicContracts bundle type ──────────────────
  describe('EvolutionPublicContracts bundle type', () => {
    it('exists as a type', () => {
      const bundle: EvolutionPublicContracts = {
        bottleneckDetector: {} as any,
        constraintAnalyzer: {} as any,
        improvementEngine: {} as any,
        valueAnalyzer: {} as any,
        opportunityCostEngine: {} as any,
        optimizationPlanner: {} as any,
        experimentRuntime: {} as any,
        kpiRuntime: {} as any,
        feedbackCollector: {} as any,
        learningLoop: {} as any,
        evolutionGraph: {} as any,
        architectureOptimizer: {} as any,
        techDebtAnalyzer: {} as any,
        recommendationPrioritizer: {} as any,
        evolutionRuntime: {} as any,
      };
      expect(typeof bundle).toBe('object');
    });
    it('has all 15 subsystem keys', () => {
      const requiredKeys = [
        'bottleneckDetector', 'constraintAnalyzer', 'improvementEngine',
        'valueAnalyzer', 'opportunityCostEngine', 'optimizationPlanner',
        'experimentRuntime', 'kpiRuntime', 'feedbackCollector',
        'learningLoop', 'evolutionGraph', 'architectureOptimizer',
        'techDebtAnalyzer', 'recommendationPrioritizer', 'evolutionRuntime',
      ];
      const bundle: EvolutionPublicContracts = {
        bottleneckDetector: {} as any,
        constraintAnalyzer: {} as any,
        improvementEngine: {} as any,
        valueAnalyzer: {} as any,
        opportunityCostEngine: {} as any,
        optimizationPlanner: {} as any,
        experimentRuntime: {} as any,
        kpiRuntime: {} as any,
        feedbackCollector: {} as any,
        learningLoop: {} as any,
        evolutionGraph: {} as any,
        architectureOptimizer: {} as any,
        techDebtAnalyzer: {} as any,
        recommendationPrioritizer: {} as any,
        evolutionRuntime: {} as any,
      };
      for (const key of requiredKeys) {
        expect(key in bundle).toBe(true);
      }
    });
  });

  // ── Param types ───────────────────────────────────────────
  describe('BottleneckDetectionParams', () => {
    it('can be constructed with required fields', () => {
      const params: BottleneckDetectionParams = Object.freeze({
        runtimeName: 'llm-runtime',
        capabilityName: null,
        workflowName: null,
        metrics: Object.freeze({ latency: 500 }),
        errors: Object.freeze(['timeout']),
        metadata: meta,
      });
      expect(params.runtimeName).toBe('llm-runtime');
      expect(params.capabilityName).toBeNull();
      expect(params.metrics.latency).toBe(500);
      expect(params.errors).toHaveLength(1);
    });
  });

  describe('ImprovementProposalParams', () => {
    it('can be constructed with required fields', () => {
      const params: ImprovementProposalParams = Object.freeze({
        name: 'Add caching',
        description: 'Cache LLM responses',
        bottleneckId: brandBottleneckId('bn-1'),
        constraintType: ConstraintType.Performance,
        targetRuntime: null,
        targetCapability: null,
        estimatedEffort: '2 days',
        evidence: Object.freeze(['latency > 500ms']),
        metadata: meta,
      });
      expect(params.name).toBe('Add caching');
      expect(params.constraintType).toBe(ConstraintType.Performance);
    });
  });

  describe('ExperimentProposalParams', () => {
    it('can be constructed with required fields', () => {
      const params: ExperimentProposalParams = Object.freeze({
        name: 'Cache A/B test',
        description: 'Test cache vs no cache',
        improvementId: brandImprovementId('imp-1'),
        variantA: 'no-cache',
        variantB: 'redis-cache',
        metricName: 'responseTime',
        metadata: meta,
      });
      expect(params.name).toBe('Cache A/B test');
      expect(params.improvementId).toBe('imp-1');
      expect(params.metricName).toBe('responseTime');
    });
  });

  describe('KPIRegistrationParams', () => {
    it('can be constructed with required fields', () => {
      const params: KPIRegistrationParams = Object.freeze({
        name: 'Response Time',
        description: 'Average response time in ms',
        unit: 'ms',
        direction: KPDirection.LowerIsBetter,
        target: 100,
        initialValue: 500,
        metadata: meta,
      });
      expect(params.name).toBe('Response Time');
      expect(params.direction).toBe(KPDirection.LowerIsBetter);
      expect(params.target).toBe(100);
    });
  });

  describe('FeedbackCollectionParams', () => {
    it('can be constructed with required fields', () => {
      const params: FeedbackCollectionParams = Object.freeze({
        source: FeedbackSource.User,
        sentiment: FeedbackSentiment.Negative,
        content: 'Too slow',
        relatedBottleneckId: null,
        relatedImprovementId: null,
        metadata: meta,
      });
      expect(params.source).toBe(FeedbackSource.User);
      expect(params.sentiment).toBe(FeedbackSentiment.Negative);
      expect(params.content).toBe('Too slow');
    });
  });

  describe('LearningRecordParams', () => {
    it('can be constructed with required fields', () => {
      const params: LearningRecordParams = Object.freeze({
        action: 'Add caching',
        outcome: LearningOutcome.Improved,
        lesson: 'Caching reduces latency',
        context: 'LLM runtime optimization',
        improvementId: brandImprovementId('imp-1'),
        experimentId: null,
        metadata: meta,
      });
      expect(params.action).toBe('Add caching');
      expect(params.outcome).toBe(LearningOutcome.Improved);
      expect(params.lesson).toBe('Caching reduces latency');
    });
  });

  describe('TechDebtRegistrationParams', () => {
    it('can be constructed with required fields', () => {
      const params: TechDebtRegistrationParams = Object.freeze({
        name: 'Deprecated API',
        description: 'Using old REST API',
        priority: TechDebtPriority.Medium,
        estimatedCost: 20,
        impact: 30,
        targetModule: 'llm-runtime',
        targetFile: null,
        metadata: meta,
      });
      expect(params.name).toBe('Deprecated API');
      expect(params.priority).toBe(TechDebtPriority.Medium);
      expect(params.estimatedCost).toBe(20);
    });
  });

  describe('EvolutionNodeParams', () => {
    it('can be constructed with required fields', () => {
      const params: EvolutionNodeParams = Object.freeze({
        type: 'improvement',
        title: 'Add Redis cache',
        description: 'Implement caching layer',
        relatedIds: Object.freeze(['imp-1']),
        parentId: null,
        valueImpact: 85,
        metadata: meta,
      });
      expect(params.type).toBe('improvement');
      expect(params.title).toBe('Add Redis cache');
      expect(params.valueImpact).toBe(85);
    });
  });

  describe('EvolutionAnalysisResult', () => {
    it('can be constructed with required fields', () => {
      const result: EvolutionAnalysisResult = Object.freeze({
        bottlenecks: [],
        improvements: [],
        valueAnalyses: [],
        opportunityCosts: [],
        roadmap: null,
        durationMs: 1000,
      });
      expect(result.bottlenecks).toHaveLength(0);
      expect(result.improvements).toHaveLength(0);
      expect(result.roadmap).toBeNull();
      expect(result.durationMs).toBe(1000);
    });
  });
});

// ====================================================================
// 5. INDEX BARREL  (~60 tests)
// ====================================================================

describe('Index barrel exports', () => {
  // ── Re-exports enums ──────────────────────────────────────
  describe('re-exports enums', () => {
    it('re-exports ConstraintType', () => {
      expect(CT_Barrel).toBe(ConstraintType);
    });
    it('re-exports ImprovementStatus', () => {
      expect(IS_Barrel).toBe(ImprovementStatus);
    });
    it('re-exports ExperimentStatus', () => {
      expect(ES_Barrel).toBe(ExperimentStatus);
    });
    it('re-exports EvolutionState', () => {
      expect(EvS_Barrel).toBe(EvolutionState);
    });
    it('ConstraintType values match direct import', () => {
      expect(CT_Barrel.Performance).toBe(ConstraintType.Performance);
      expect(CT_Barrel.Quality).toBe(ConstraintType.Quality);
    });
    it('ImprovementStatus values match direct import', () => {
      expect(IS_Barrel.Proposed).toBe(ImprovementStatus.Proposed);
      expect(IS_Barrel.Completed).toBe(ImprovementStatus.Completed);
    });
    it('ExperimentStatus values match direct import', () => {
      expect(ES_Barrel.Running).toBe(ExperimentStatus.Running);
      expect(ES_Barrel.Failed).toBe(ExperimentStatus.Failed);
    });
    it('EvolutionState values match direct import', () => {
      expect(EvS_Barrel.Ready).toBe(EvolutionState.Ready);
      expect(EvS_Barrel.Error).toBe(EvolutionState.Error);
    });
  });

  // ── Re-exports branded functions ──────────────────────────
  describe('re-exports branded functions', () => {
    it('re-exports brandBottleneckId', () => {
      expect(bBID_Barrel).toBe(brandBottleneckId);
      expect(typeof bBID_Barrel('test')).toBe('string');
    });
    it('re-exports brandImprovementId', () => {
      expect(bIID_Barrel).toBe(brandImprovementId);
      expect(typeof bIID_Barrel('test')).toBe('string');
    });
    it('brandBottleneckId from barrel returns string', () => {
      expect(typeof bBID_Barrel('bn-test')).toBe('string');
    });
    it('brandImprovementId from barrel returns string', () => {
      expect(typeof bIID_Barrel('imp-test')).toBe('string');
    });
  });

  // ── Re-exports error classes ──────────────────────────────
  describe('re-exports error classes', () => {
    it('re-exports EvolutionError', () => {
      expect(EvErr_Barrel).toBe(EvolutionError);
    });
    it('re-exports BottleneckNotFoundError', () => {
      expect(BNF_Barrel).toBe(BottleneckNotFoundError);
    });
    it('EvolutionError from barrel works correctly', () => {
      const err = new EvErr_Barrel('TEST', 'msg');
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBe('TEST');
    });
    it('BottleneckNotFoundError from barrel works correctly', () => {
      const err = new BNF_Barrel('bn-1');
      expect(err).toBeInstanceOf(EvErr_Barrel);
      expect(err.bottleneckId).toBe('bn-1');
    });
  });

  // ── Re-exports DefaultEvolutionRuntimeConfig ──────────────
  describe('re-exports DefaultEvolutionRuntimeConfig', () => {
    it('re-exports DefaultEvolutionRuntimeConfig', () => {
      expect(DefaultConfig_Barrel).toBe(DefaultEvolutionRuntimeConfig);
    });
    it('barrel config is frozen', () => {
      expect(Object.isFrozen(DefaultConfig_Barrel)).toBe(true);
    });
    it('barrel config has correct maxBottlenecks', () => {
      expect(DefaultConfig_Barrel.bottleneckDetector.maxBottlenecks).toBe(1000);
    });
    it('barrel config has correct maxImprovements', () => {
      expect(DefaultConfig_Barrel.improvementEngine.maxImprovements).toBe(5000);
    });
  });

  // ── Re-exports EvolutionPublicContracts type ──────────────
  describe('re-exports EvolutionPublicContracts type', () => {
    it('EvolutionPublicContracts type is available from barrel', () => {
      // This is a type-only export; if it compiles, the type exists
      const _check: EvolutionPublicContracts | null = null;
      expect(_check).toBeNull();
    });
  });

  // ── Re-exports all subsystem classes ──────────────────────
  describe('re-exports subsystem classes', () => {
    it('re-exports BottleneckDetector', () => {
      expect(typeof BottleneckDetector).toBe('function');
    });
    it('re-exports ConstraintAnalyzer', () => {
      expect(typeof ConstraintAnalyzer).toBe('function');
    });
    it('re-exports ImprovementEngine', () => {
      expect(typeof ImprovementEngine).toBe('function');
    });
    it('re-exports ValueAnalyzer', () => {
      expect(typeof ValueAnalyzer).toBe('function');
    });
    it('re-exports OpportunityCostEngine', () => {
      expect(typeof OpportunityCostEngine).toBe('function');
    });
    it('re-exports OptimizationPlanner', () => {
      expect(typeof OptimizationPlanner).toBe('function');
    });
    it('re-exports ExperimentRuntime', () => {
      expect(typeof ExperimentRuntime).toBe('function');
    });
    it('re-exports KPIRuntime', () => {
      expect(typeof KPIRuntime).toBe('function');
    });
    it('re-exports FeedbackCollector', () => {
      expect(typeof FeedbackCollector).toBe('function');
    });
    it('re-exports LearningLoop', () => {
      expect(typeof LearningLoop).toBe('function');
    });
    it('re-exports EvolutionGraph', () => {
      expect(typeof EvolutionGraph).toBe('function');
    });
    it('re-exports ArchitectureOptimizer', () => {
      expect(typeof ArchitectureOptimizer).toBe('function');
    });
    it('re-exports TechDebtAnalyzer', () => {
      expect(typeof TechDebtAnalyzer).toBe('function');
    });
    it('re-exports RecommendationPrioritizer', () => {
      expect(typeof RecommendationPrioritizer).toBe('function');
    });
  });

  // ── Re-exports EvolutionRuntime class ─────────────────────
  describe('re-exports EvolutionRuntime class', () => {
    it('re-exports EvolutionRuntime', () => {
      expect(typeof EvolutionRuntime).toBe('function');
    });
    it('EvolutionRuntime is a class constructor', () => {
      expect(EvolutionRuntime.prototype).toBeDefined();
      expect(EvolutionRuntime.prototype.constructor).toBe(EvolutionRuntime);
    });
  });

  // ── Barrel subsystem count ────────────────────────────────
  describe('barrel exports subsystem count', () => {
    it('exports 14 subsystem classes', () => {
      const subsystemClasses = [
        BottleneckDetector, ConstraintAnalyzer, ImprovementEngine,
        ValueAnalyzer, OpportunityCostEngine, OptimizationPlanner,
        ExperimentRuntime, KPIRuntime, FeedbackCollector,
        LearningLoop, EvolutionGraph, ArchitectureOptimizer,
        TechDebtAnalyzer, RecommendationPrioritizer,
      ];
      expect(subsystemClasses).toHaveLength(14);
      for (const cls of subsystemClasses) {
        expect(typeof cls).toBe('function');
      }
    });
    it('all subsystem classes have prototype', () => {
      const subsystemClasses = [
        BottleneckDetector, ConstraintAnalyzer, ImprovementEngine,
        ValueAnalyzer, OpportunityCostEngine, OptimizationPlanner,
        ExperimentRuntime, KPIRuntime, FeedbackCollector,
        LearningLoop, EvolutionGraph, ArchitectureOptimizer,
        TechDebtAnalyzer, RecommendationPrioritizer,
      ];
      for (const cls of subsystemClasses) {
        expect(cls.prototype).toBeDefined();
      }
    });
  });
});
