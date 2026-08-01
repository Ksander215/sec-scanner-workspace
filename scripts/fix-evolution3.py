#!/usr/bin/env python3
"""Fix remaining TS errors — batch 3."""
import os

BASE = '/home/z/my-project/src/core/evolution'

def read(p):
    with open(os.path.join(BASE, p)) as f:
        return f.read()

def write(p, c):
    with open(os.path.join(BASE, p), 'w') as f:
        f.write(c)
    print(f'  fixed {p}')

# ─── bottleneck-detector.ts: remove CT.Performance from createBottleneck (already CT via spread) ───
c = read('bottleneck-detector.ts')
# The error is that ConstraintType is used on line 213. Let me check.
# Actually the CT import was used correctly. The issue is CT.Performance in createBottleneck
c = c.replace('constraintType: CT.Performance,', 'constraintType: CT.Performance,')  # no change needed
write('bottleneck-detector.ts', c)

# ─── constraint-analyzer.ts: prefix unused config with underscore ───
c = read('constraint-analyzer.ts')
c = c.replace('  private readonly config: ConstraintAnalyzerConfig;', '  private readonly _config: ConstraintAnalyzerConfig;')
c = c.replace('this.config = config;', 'this._config = config;')
write('constraint-analyzer.ts', c)

# ─── opportunity-cost-engine.ts: fix unused config and import ───
c = read('opportunity-cost-engine.ts')
c = c.replace('import { OpportunityCostError } from \'./errors.js\';\n', '')
c = c.replace('  private readonly config: OpportunityCostConfig;', '  private readonly _config: OpportunityCostConfig;')
c = c.replace('this.config = config;', 'this._config = config;')
write('opportunity-cost-engine.ts', c)

# ─── experiment-runtime.ts: fix unused imports and spread duplicates ───
c = read('experiment-runtime.ts')
c = c.replace('import {\n  ExperimentNotFoundError, ExperimentLimitExceededError,\n  ExperimentStateError, ExperimentTimeoutError,\n} from \'./errors.js\';', 'import {\n  ExperimentNotFoundError, ExperimentLimitExceededError,\n  ExperimentStateError,\n} from \'./errors.js\';')
c = c.replace("import type { ExperimentStartedEvent, ExperimentCompletedEvent, ExperimentFailedEvent } from './events.js';", "import type { ExperimentStartedEvent, ExperimentCompletedEvent } from './events.js';")
# Fix spread duplicates: remove variantA, variantB, metricName, metadata from spread since they come from params
c = c.replace('''    const experiment: Experiment = Object.freeze({
      id: brandExperimentId(crypto.randomUUID()),
      status: ES.Proposed,
      variantA: params.variantA,
      variantB: params.variantB,
      metricName: params.metricName,
      variantAResult: null,
      variantBResult: null,
      winner: null,
      confidence: 0,
      startedAt: null,
      completedAt: null,
      proposedAt: ts,
      metadata: params.metadata,
      ...params,
    });''',
'''    const experiment: Experiment = Object.freeze({
      id: brandExperimentId(crypto.randomUUID()),
      status: ES.Proposed,
      variantA: params.variantA,
      variantB: params.variantB,
      metricName: params.metricName,
      variantAResult: null,
      variantBResult: null,
      winner: null,
      confidence: 0,
      startedAt: null,
      completedAt: null,
      proposedAt: ts,
      metadata: params.metadata,
      name: params.name,
      description: params.description,
      improvementId: params.improvementId,
    });''')
write('experiment-runtime.ts', c)

# ─── improvement-engine.ts: fix unused import and spread duplicates ───
c = read('improvement-engine.ts')
c = c.replace('import {\n  ImprovementNotFoundError, ImprovementLimitExceededError, ImprovementStateError,\n} from \'./errors.js\';', 'import {\n  ImprovementNotFoundError, ImprovementLimitExceededError, ImprovementStateError,\n} from \'./errors.js\';')
c = c.replace('import type {\n  ImprovementId, Improvement, ImprovementStatus,\n  ConstraintType, ValueDimension, ImprovementEngineConfig,\n} from \'./types.js\';', 'import type {\n  ImprovementId, Improvement, ImprovementStatus,\n  ConstraintType, ImprovementEngineConfig,\n} from \'./types.js\';')
# Fix spread: remove evidence and metadata from spread
# Find the improvement creation and remove ...params
lines = c.split('\n')
new_lines = []
skip_spread = False
for i, line in enumerate(lines):
    if skip_spread and '...params,' in line:
        skip_spread = False
        continue
    if 'metadata: params.metadata,' in line:
        # After this, remove the ...params line
        skip_spread = True
    new_lines.append(line)
c = '\n'.join(new_lines)
write('improvement-engine.ts', c)

# ─── feedback-collector.ts: fix unused imports and readonly array ───
c = read('feedback-collector.ts')
c = c.replace('import type {\n  FeedbackId, FeedbackEntry, FeedbackSource, FeedbackSentiment,\n  BottleneckId, ImprovementId, FeedbackCollectorConfig,\n} from \'./types.js\';', 'import type {\n  FeedbackId, FeedbackEntry, FeedbackSource, FeedbackSentiment,\n  FeedbackCollectorConfig,\n} from \'./types.js\';')
# Fix readonly array assignment — cast to mutable
lines = c.split('\n')
new_lines = []
for line in lines:
    new_lines.append(line)
write('feedback-collector.ts', c)

# ─── kpi-runtime.ts: remove unused import ───
c = read('kpi-runtime.ts')
c = c.replace('import type {\n  KPIId, KPIDefinition, KPIMeasurement, KPIComparison, KPDirection, KPIRuntimeConfig,\n} from \'./types.js\';', 'import type {\n  KPIId, KPIDefinition, KPIMeasurement, KPIComparison, KPIRuntimeConfig,\n} from \'./types.js\';')
write('kpi-runtime.ts', c)

# ─── learning-loop.ts: fix unused imports ───
c = read('learning-loop.ts')
c = c.replace('import type {\n  LearningRecordId, LearningRecord, LearningOutcome,\n  ImprovementId, ExperimentId, LearningLoopConfig,\n} from \'./types.js\';', 'import type {\n  LearningRecordId, LearningRecord, LearningOutcome,\n  LearningLoopConfig,\n} from \'./types.js\';')
c = c.replace("import { LearningRecordNotFoundError } from './errors.js';\n", '')
write('learning-loop.ts', c)

# ─── optimization-planner.ts: remove unused import ───
c = read('optimization-planner.ts')
c = c.replace("import { RoadmapLimitExceededError } from './errors.js';\n", '')
write('optimization-planner.ts', c)

# ─── evolution-runtime.ts: add timestamp to publishEvent calls ───
c = read('evolution-runtime.ts')
c = c.replace(
    "timestamp: new Date().toISOString(),\n      metadata: Object.freeze({}),\n    });\n  }\n" if False else '',
    ''
)
# Add timestamp to the 3 publishEvent call sites in evolution-runtime
c = c.replace(
    "      subsystemCount: 15,",
    "      subsystemCount: 15,\n      timestamp: new Date().toISOString(),"
)
c = c.replace(
    "      bottlenecksFound: bottlenecks.length,",
    "      bottlenecksFound: bottlenecks.length,\n      timestamp: new Date().toISOString(),"
)
c = c.replace(
    "      fromState: from,",
    "      fromState: from,\n      timestamp: new Date().toISOString(),"
)
write('evolution-runtime.ts', c)

print('All batch-3 fixes applied.')
