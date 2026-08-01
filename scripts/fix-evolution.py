#!/usr/bin/env python3
"""Fix all TS errors in ECIR source files."""
import re, os

BASE = '/home/z/my-project/src/core/evolution'

def read(path):
    with open(os.path.join(BASE, path)) as f:
        return f.read()

def write(path, content):
    with open(os.path.join(BASE, path), 'w') as f:
        f.write(content)
    print(f'  fixed {path}')

# ─── Fix 1: publishEvent — remove 'timestamp' from Omit (it's already in partial), fix DomainEventBase import ───

def fix_publish_event(content):
    # Fix the Omit — events already have timestamp in partial, remove from Omit
    content = content.replace(
        "Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>",
        "Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>"
    )
    # Fix DomainEventBase import — use the correct type from event-bus
    content = content.replace(
        "import('../events/event-bus.js').DomainEventBase",
        "import('../events/event-bus.js').EventEnvelope"
    )
    return content

def fix_null_to_undefined(content):
    """Change `eventBus ?? null` to `eventBus ?? undefined` for constructor params that expect undefined."""
    content = content.replace('this.eventBus = eventBus ?? null;', 'this.eventBus = eventBus;')
    return content

# Fix all subsystem files that have the publishEvent pattern
subsystem_files = [
    'bottleneck-detector.ts', 'constraint-analyzer.ts', 'improvement-engine.ts',
    'value-analyzer.ts', 'opportunity-cost-engine.ts', 'optimization-planner.ts',
    'experiment-runtime.ts', 'kpi-runtime.ts', 'feedback-collector.ts',
    'learning-loop.ts', 'evolution-graph.ts', 'architecture-optimizer.ts',
    'tech-debt-analyzer.ts', 'evolution-runtime.ts',
]

for f in subsystem_files:
    path = os.path.join(BASE, f)
    if not os.path.exists(path):
        continue
    c = read(f)
    c = fix_publish_event(c)
    write(f, c)

# ─── Fix 2: bottleneck-detector.ts — import ConstraintType as value, not type ───
c = read('bottleneck-detector.ts')
c = c.replace(
    'import type {\n  BottleneckId, Bottleneck, BottleneckScope, BottleneckSeverity,\n  ConstraintType, EvolutionSessionId,\n  BottleneckDetectorConfig,\n} from \'./types.js\';\nimport { BottleneckScope as BS, BottleneckSeverity as BSev, brandBottleneckId } from \'./types.js\';',
    'import type {\n  BottleneckId, Bottleneck, BottleneckScope, BottleneckSeverity,\n  BottleneckDetectorConfig,\n} from \'./types.js\';\nimport { BottleneckScope as BS, BottleneckSeverity as BSev, ConstraintType as CT, brandBottleneckId } from \'./types.js\';'
)
c = c.replace('ConstraintType.Performance', 'CT.Performance')
c = c.replace('ConstraintType.Quality', 'CT.Quality')
c = c.replace('ConstraintType.Knowledge', 'CT.Knowledge')
c = c.replace('ConstraintType.Memory', 'CT.Memory')
c = c.replace('ConstraintType.UX', 'CT.UX')
c = c.replace('ConstraintType.Architecture', 'CT.Architecture')
c = c.replace('ConstraintType.Documentation', 'CT.Documentation')
write('bottleneck-detector.ts', c)

# ─── Fix 3: constraint-analyzer.ts — remove unused imports ───
c = read('constraint-analyzer.ts')
c = c.replace(
    'import type {\n  BottleneckId, ConstraintAnalysis, ConstraintType,\n  EvolutionSessionId, ImprovementId, ConstraintAnalyzerConfig,\n} from \'./types.js\';\nimport { brandEvolutionSessionId, ConstraintType as CT } from \'./types.js\';\nimport type { IConstraintAnalyzer } from \'./contracts.js\';\nimport { ConstraintAnalysisError, BottleneckNotFoundError } from \'./errors.js\';',
    'import type {\n  BottleneckId, ConstraintAnalysis, ConstraintAnalyzerConfig,\n} from \'./types.js\';\nimport { brandEvolutionSessionId, ConstraintType as CT } from \'./types.js\';\nimport type { IConstraintAnalyzer } from \'./contracts.js\';'
)
# Fix unused config
write('constraint-analyzer.ts', c)

# ─── Fix 4: architecture-optimizer.ts — remove unused import ───
c = read('architecture-optimizer.ts')
c = c.replace(
    "import { ArchitectureAnalysisError } from './errors.js';\nimport type { ArchOptimizationSuggestedEvent }",
    "import type { ArchOptimizationSuggestedEvent }"
)
write('architecture-optimizer.ts', c)

# ─── Fix 5: evolution-graph.ts — remove unused import ───
c = read('evolution-graph.ts')
c = c.replace(
    "import { GraphNodeLimitExceededError, EvolutionGraphError } from './errors.js';",
    "import { GraphNodeLimitExceededError } from './errors.js';"
)
write('evolution-graph.ts', c)

# ─── Fix 6: contracts.ts — export ValueAnalysis, OpportunityCost; import missing enums; remove unused ───
c = read('contracts.ts')
c = c.replace(
    'import type {\n  BottleneckId, ImprovementId, ExperimentId, KPIId, FeedbackId,\n  EvolutionNodeId, TechDebtId, RoadmapId, LearningRecordId,\n  Bottleneck, BottleneckSeverity, BottleneckScope, ConstraintType,\n  Improvement, ImprovementStatus,\n  Experiment, ExperimentStatus,\n  KPIDefinition, KPIMeasurement, KPIComparison,\n  FeedbackEntry, FeedbackSource, FeedbackSentiment,\n  LearningRecord, LearningOutcome,\n  EvolutionNode, EvolutionEdge,\n  TechDebtItem, TechDebtPriority,\n  ArchOptimizationSuggestion, ArchOptimizationType,\n  ValueAnalysis, OpportunityCost,\n  ConstraintAnalysis,\n  RoadmapItem, EvolutionRoadmap,\n  EvolutionMetrics,\n  EvolutionState,\n  ValueDimension,\n} from \'./types.js\';',
    'import type {\n  BottleneckId, ImprovementId, ExperimentId, KPIId, FeedbackId,\n  EvolutionNodeId, TechDebtId, RoadmapId, LearningRecordId,\n  Bottleneck, BottleneckSeverity, BottleneckScope, ConstraintType,\n  Improvement, ImprovementStatus,\n  Experiment, ExperimentStatus,\n  KPIDefinition, KPIComparison,\n  FeedbackEntry, FeedbackSource, FeedbackSentiment,\n  LearningRecord, LearningOutcome,\n  EvolutionNode, EvolutionEdge,\n  TechDebtItem, TechDebtPriority,\n  ArchOptimizationSuggestion,\n  ValueAnalysis, OpportunityCost,\n  ConstraintAnalysis,\n  EvolutionRoadmap,\n  EvolutionMetrics,\n  EvolutionState,\n  ValueDimension,\n} from \'./types.js\';\nimport { KPDirection, RoadmapItemStatus } from \'./types.js\';'
)
write('contracts.ts', c)

# ─── Fix 7: events.ts — remove unused import ───
c = read('events.ts')
c = c.replace(
    'import type {\n  BottleneckId, ImprovementId, ExperimentId, KPIId, FeedbackId,\n  EvolutionNodeId, TechDebtId, RoadmapId, LearningRecordId,\n  BottleneckSeverity, ConstraintType, ImprovementStatus, ExperimentStatus,\n  FeedbackSource, FeedbackSentiment, LearningOutcome,\n  TechDebtPriority, ArchOptimizationType, ValueDimension,\n  EvolutionState,\n} from \'./types.js\';',
    'import type {\n  BottleneckId, ImprovementId, ExperimentId, KPIId, FeedbackId,\n  EvolutionNodeId, TechDebtId, RoadmapId, LearningRecordId,\n  BottleneckSeverity, ConstraintType, ImprovementStatus,\n  FeedbackSource, FeedbackSentiment, LearningOutcome,\n  TechDebtPriority, ArchOptimizationType, ValueDimension,\n  EvolutionState,\n} from \'./types.js\';'
)
write('events.ts', c)

# ─── Fix 8: evolution-runtime.ts — null to undefined ───
c = read('evolution-runtime.ts')
c = c.replace('this.eventBus = eventBus ?? null;', 'this.eventBus = eventBus;')
# Fix import of ValueAnalysis/OpportunityCost from contracts — they're now exported
c = c.replace(
    "import type {\n  IBottleneckDetector, IConstraintAnalyzer, IImprovementEngine,\n  IValueAnalyzer, IOpportunityCostEngine, IOptimizationPlanner,\n  IExperimentRuntime, IKPIRuntime, IFeedbackCollector,\n  ILearningLoop, IEvolutionGraph, IArchitectureOptimizer,\n  ITechDebtAnalyzer, IRecommendationPrioritizer, IEvolutionRuntime,\n  EvolutionAnalysisResult, ValueAnalysis, OpportunityCost,\n} from './contracts.js';",
    "import type {\n  IBottleneckDetector, IConstraintAnalyzer, IImprovementEngine,\n  IValueAnalyzer, IOpportunityCostEngine, IOptimizationPlanner,\n  IExperimentRuntime, IKPIRuntime, IFeedbackCollector,\n  ILearningLoop, IEvolutionGraph, IArchitectureOptimizer,\n  ITechDebtAnalyzer, IRecommendationPrioritizer, IEvolutionRuntime,\n  EvolutionAnalysisResult,\n} from './contracts.js';\nimport type { ValueAnalysis, OpportunityCost } from './types.js';"
)
write('evolution-runtime.ts', c)

print('All fixes applied.')
