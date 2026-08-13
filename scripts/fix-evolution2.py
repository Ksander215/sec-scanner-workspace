#!/usr/bin/env python3
"""Fix remaining TS errors in ECIR — batch 2."""
import os, re

BASE = '/home/z/my-project/src/core/evolution'

def read(p):
    with open(os.path.join(BASE, p)) as f:
        return f.read()

def write(p, c):
    with open(os.path.join(BASE, p), 'w') as f:
        f.write(c)
    print(f'  fixed {p}')

# ═══════════════════════════════════════════════════════════════════
# The publishEvent helper needs to:
# 1. Import DomainEventBase from the correct path
# 2. Cast to DomainEventBase (which has timestamp, sequence, etc.)
# 3. NOT include timestamp in the spread (it's already in DomainEventBase)
# ═══════════════════════════════════════════════════════════════════

NEW_PUBLISH = r'''  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        sequence: 0,
        aggregateId: 'evolution',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }'''

# Files with the publishEvent helper pattern
files_with_publish = [
    'bottleneck-detector.ts', 'constraint-analyzer.ts', 'improvement-engine.ts',
    'value-analyzer.ts', 'opportunity-cost-engine.ts', 'optimization-planner.ts',
    'experiment-runtime.ts', 'kpi-runtime.ts', 'feedback-collector.ts',
    'learning-loop.ts', 'evolution-graph.ts', 'architecture-optimizer.ts',
    'tech-debt-analyzer.ts',
]

# Regex to match the publishEvent method
PUBLISH_PATTERN = re.compile(
    r"""  private async publishEvent<T extends \{ eventType: string; classification: EventClassification; timestamp: string \}>\(\n"""
    r"""    partial: Omit<T, 'eventId' \| 'sequence' \| 'aggregateId' \| 'aggregateType' \| 'version'>,\n"""
    r"""  \): Promise<void> \{.*?\}  \}\n""",
    re.DOTALL
)

for f in files_with_publish:
    c = read(f)
    new_c = PUBLISH_PATTERN.sub(NEW_PUBLISH + '\n', c)
    if new_c != c:
        write(f, new_c)

# ═══════════════════════════════════════════════════════════════════
# Fix evolution-runtime.ts:
# - eventBus should be EventBus | undefined (not null)
# - Pass undefined to subsystems
# - Fix publishEvent
# ═══════════════════════════════════════════════════════════════════
c = read('evolution-runtime.ts')
c = c.replace(
    '  private readonly eventBus: EventBus | null;',
    '  private readonly eventBus: EventBus | undefined;'
)
c = c.replace(
    '    this.eventBus = eventBus;',
    '    this.eventBus = eventBus;'
)
# Fix publishEvent in evolution-runtime too
c = PUBLISH_PATTERN.sub(NEW_PUBLISH + '\n', c)
write('evolution-runtime.ts', c)

# ═══════════════════════════════════════════════════════════════════
# Fix bottleneck-detector.ts: CT import used correctly but createBottleneck 
# references ConstraintType instead of CT in one place
# ═══════════════════════════════════════════════════════════════════
c = read('bottleneck-detector.ts')
c = c.replace('ConstraintType.Performance', 'CT.Performance')
write('bottleneck-detector.ts', c)

# ═══════════════════════════════════════════════════════════════════
# Fix constraint-analyzer.ts: import ImprovementId for the return type
# ═══════════════════════════════════════════════════════════════════
c = read('constraint-analyzer.ts')
c = c.replace(
    'import type {\n  BottleneckId, ConstraintAnalysis, ConstraintAnalyzerConfig,\n} from \'./types.js\';',
    'import type {\n  BottleneckId, ConstraintAnalysis, ConstraintAnalyzerConfig,\n} from \'./types.js\';\nimport type { ImprovementId } from \'./types.js\';'
)
write('constraint-analyzer.ts', c)

# ═══════════════════════════════════════════════════════════════════
# Fix contracts.ts: remove unused ValueDimension import
# ═══════════════════════════════════════════════════════════════════
c = read('contracts.ts')
c = c.replace(
    '  EvolutionState,\n  ValueDimension,\n} from \'./types.js\';',
    '  EvolutionState,\n} from \'./types.js\';'
)
write('contracts.ts', c)

print('All batch-2 fixes applied.')
