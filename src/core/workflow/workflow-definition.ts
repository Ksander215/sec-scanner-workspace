/**
 * Workflow Runtime — Workflow Definition
 * TASK-AIS-003H.000
 *
 * Manages workflow definitions (templates/blueprints).
 * Provides creation, validation, and registration of workflow definitions.
 */

import type {
  WorkflowDefinition,
  WorkflowId,
  StageId,
  StageDefinition,
  TransitionDefinition,
  ConditionDefinition,
  WorkflowPolicyDefinition,
  SemVer,
  Timestamp,
  RetryPolicy,
  CompensationDefinition,
  StageType,
} from './types.js';
import { brandWorkflowId, brandStageId, brandTransitionId } from './types.js';

export interface WorkflowDefinitionConfig {
  readonly name: string;
  readonly description?: string;
  readonly version?: SemVer;
  readonly stages: readonly StageDefinitionConfig[];
  readonly transitions?: readonly TransitionConfig[];
  readonly conditions?: readonly ConditionDefinition[];
  readonly policies?: readonly WorkflowPolicyDefinition[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly inputSchema?: Readonly<Record<string, unknown>>;
  readonly outputSchema?: Readonly<Record<string, unknown>>;
}

export interface StageDefinitionConfig {
  readonly name: string;
  readonly description?: string;
  readonly type?: StageType;
  readonly handler: string;
  readonly timeoutMs?: number;
  readonly retryPolicy?: Partial<RetryPolicy>;
  readonly compensation?: Partial<CompensationDefinition>;
  readonly conditions?: readonly ConditionDefinition[];
  readonly dependencies?: readonly StageId[];
  readonly delayMs?: number;
  readonly eventType?: string;
  readonly inputMapping?: Readonly<Record<string, string>>;
  readonly outputMapping?: Readonly<Record<string, string>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly parallelism?: number;
}

export interface TransitionConfig {
  readonly from: StageId;
  readonly to: StageId;
  readonly condition?: string;
  readonly guard?: string;
  readonly priority?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

const DEFAULT_RETRY_POLICY: RetryPolicy = Object.freeze({
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryableErrors: [],
});

const DEFAULT_COMPENSATION: CompensationDefinition = Object.freeze({
  action: 'Undo' as any,
  timeoutMs: 30000,
  retryPolicy: DEFAULT_RETRY_POLICY,
});

/**
 * Create a WorkflowDefinition from a config.
 */
export function createWorkflowDefinition(config: WorkflowDefinitionConfig): WorkflowDefinition {
  const now = new Date().toISOString() as Timestamp;
  const id = brandWorkflowId(crypto.randomUUID());

  // Generate stage IDs and complete stage definitions
  const stageIdMap = new Map<string, StageId>();
  const stages: StageDefinition[] = config.stages.map(s => {
    const stageId = brandStageId(crypto.randomUUID());
    stageIdMap.set(s.name, stageId);

    return Object.freeze({
      id: stageId,
      name: s.name,
      description: s.description ?? '',
      type: s.type ?? ('Sequential' as StageType),
      handler: s.handler,
      inputMapping: s.inputMapping ?? Object.freeze({}),
      outputMapping: s.outputMapping ?? Object.freeze({}),
      timeoutMs: s.timeoutMs ?? 30000,
      retryPolicy: Object.freeze({
        ...DEFAULT_RETRY_POLICY,
        ...s.retryPolicy,
      }),
      compensation: Object.freeze({
        ...DEFAULT_COMPENSATION,
        ...s.compensation,
      }),
      conditions: s.conditions ?? [],
      metadata: s.metadata ?? Object.freeze({}),
      parallelism: s.parallelism,
      dependencies: (s.dependencies ?? []) as readonly StageId[],
      delayMs: s.delayMs,
      eventType: s.eventType,
    });
  });

  // Generate transitions
  const transitions: TransitionDefinition[] = (config.transitions ?? []).map(t => {
    return Object.freeze({
      id: brandTransitionId(crypto.randomUUID()),
      from: t.from,
      to: t.to,
      condition: t.condition,
      guard: t.guard,
      priority: t.priority ?? 0,
      metadata: t.metadata ?? Object.freeze({}),
    });
  });

  return Object.freeze({
    id: id as WorkflowId,
    name: config.name,
    description: config.description ?? '',
    version: config.version ?? '1.0.0',
    stages: Object.freeze(stages),
    transitions: Object.freeze(transitions),
    conditions: Object.freeze(config.conditions ?? []),
    policies: Object.freeze(config.policies ?? []),
    metadata: Object.freeze(config.metadata ?? {}),
    inputSchema: Object.freeze(config.inputSchema ?? {}),
    outputSchema: Object.freeze(config.outputSchema ?? {}),
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Validate a workflow definition.
 */
export function validateDefinition(definition: WorkflowDefinition): readonly string[] {
  const issues: string[] = [];

  if (!definition.name || definition.name.trim().length === 0) {
    issues.push('Workflow name is required');
  }

  if (definition.stages.length === 0) {
    issues.push('Workflow must have at least one stage');
  }

  const stageIds = new Set<string>();
  for (const stage of definition.stages) {
    if (!stage.name || stage.name.trim().length === 0) {
      issues.push(`Stage "${stage.id}" has no name`);
    }
    if (stageIds.has(stage.id)) {
      issues.push(`Duplicate stage ID: "${stage.id}"`);
    }
    stageIds.add(stage.id);
  }

  for (const transition of definition.transitions) {
    if (!stageIds.has(transition.from)) {
      issues.push(`Transition "${transition.id}" references unknown source stage "${transition.from}"`);
    }
    if (!stageIds.has(transition.to)) {
      issues.push(`Transition "${transition.id}" references unknown target stage "${transition.to}"`);
    }
  }

  for (const stage of definition.stages) {
    for (const dep of stage.dependencies) {
      if (!stageIds.has(dep)) {
        issues.push(`Stage "${stage.name}" depends on unknown stage "${dep}"`);
      }
    }
  }

  return issues;
}
