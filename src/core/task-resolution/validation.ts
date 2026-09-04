/**
 * Task Resolution — Validation
 * TASK-AIS-TASK-RESOLUTION-SLICE-001 §16
 *
 * Every TaskResolution produced by the runtime MUST pass this validation
 * before it can influence execution. Invalid resolutions MUST NOT silently
 * propagate: the resolver catches TaskResolutionValidationError and degrades
 * to the minimal-safe path (§18) instead.
 *
 * The error message names the violated FIELD only — never field VALUES
 * (values can contain user content; §22 safe error surfaces).
 */

import type {
  AvailableCapability,
  ContextRequirement,
  CapabilityRequirement,
  ExplanationMode,
  TaskResolution,
  TaskType,
} from './types.js';

export const EXPLANATION_MODES: readonly ExplanationMode[] = ['none', 'short', 'detailed'];
export const TASK_TYPES: readonly TaskType[] = [
  'repository.overview',
  'implementation.diagnosis',
  'project.history',
  'general.question',
];
export const AVAILABLE_CAPABILITIES: readonly AvailableCapability[] = [
  'repository-inspection',
  'context-retrieval',
  'llm-reasoning',
  'evidence-capture',
  'persisted-project-context',
];

export class TaskResolutionValidationError extends Error {
  constructor(field: string) {
    super(`Invalid TaskResolution: ${field}`);
    this.name = 'TaskResolutionValidationError';
  }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isPlainArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

/**
 * Validate an unknown value as a TaskResolution. Returns the SAME object
 * (typed) when valid; throws TaskResolutionValidationError otherwise.
 * Deliberately strict — this is the gate between resolution and execution.
 */
export function validateTaskResolution(input: unknown): TaskResolution {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TaskResolutionValidationError('resolution must be an object');
  }
  const r = input as Record<string, unknown>;

  if (!isNonEmptyString(r.taskId)) throw new TaskResolutionValidationError('taskId');
  if (!isNonEmptyString(r.userIntent)) throw new TaskResolutionValidationError('userIntent');
  if (typeof r.taskType !== 'string' || !TASK_TYPES.includes(r.taskType as TaskType)) {
    throw new TaskResolutionValidationError('taskType');
  }
  if (!isNonEmptyString(r.objective)) throw new TaskResolutionValidationError('objective');

  // §7: requiredContext — requirement-level statements, not file lists.
  if (!isPlainArray(r.requiredContext)) throw new TaskResolutionValidationError('requiredContext');
  for (const c of r.requiredContext) {
    if (typeof c !== 'object' || c === null) throw new TaskResolutionValidationError('requiredContext item');
    const ctx = c as Record<string, unknown>;
    if (!isNonEmptyString(ctx.id)) throw new TaskResolutionValidationError('requiredContext[].id');
    if (!isNonEmptyString(ctx.description)) throw new TaskResolutionValidationError('requiredContext[].description');
    if (!isNonEmptyString(ctx.rationale)) throw new TaskResolutionValidationError('requiredContext[].rationale');
  }

  // §8: requiredCapabilities — only capabilities the MVP really provides.
  if (!isPlainArray(r.requiredCapabilities)) throw new TaskResolutionValidationError('requiredCapabilities');
  for (const cap of r.requiredCapabilities) {
    if (typeof cap !== 'object' || cap === null) throw new TaskResolutionValidationError('requiredCapabilities item');
    const c = cap as Record<string, unknown>;
    if (typeof c.capability !== 'string' || !AVAILABLE_CAPABILITIES.includes(c.capability as AvailableCapability)) {
      throw new TaskResolutionValidationError('requiredCapabilities[].capability');
    }
    if (!isNonEmptyString(c.reason)) throw new TaskResolutionValidationError('requiredCapabilities[].reason');
  }

  // §9: explanation — mode within the policy vocabulary.
  if (typeof r.explanation !== 'object' || r.explanation === null) {
    throw new TaskResolutionValidationError('explanation');
  }
  const ex = r.explanation as Record<string, unknown>;
  if (typeof ex.mode !== 'string' || !EXPLANATION_MODES.includes(ex.mode as ExplanationMode)) {
    throw new TaskResolutionValidationError('explanation.mode');
  }
  if (ex.message !== null && typeof ex.message !== 'string') {
    throw new TaskResolutionValidationError('explanation.message');
  }

  if (
    typeof r.confidence !== 'number'
    || !Number.isFinite(r.confidence)
    || r.confidence < 0
    || r.confidence > 1
  ) {
    throw new TaskResolutionValidationError('confidence');
  }

  if (!isNonEmptyString(r.createdAt)) throw new TaskResolutionValidationError('createdAt');

  return r as unknown as TaskResolution;
}

/** Narrow helpers reused by the resolver's degrade path. */
export function asContextRequirement(input: unknown): ContextRequirement | null {
  if (typeof input !== 'object' || input === null) return null;
  const c = input as Record<string, unknown>;
  if (!isNonEmptyString(c.id) || !isNonEmptyString(c.description) || !isNonEmptyString(c.rationale)) return null;
  return input as ContextRequirement;
}

export function asCapabilityRequirement(input: unknown): CapabilityRequirement | null {
  if (typeof input !== 'object' || input === null) return null;
  const c = input as Record<string, unknown>;
  if (
    typeof c.capability !== 'string'
    || !AVAILABLE_CAPABILITIES.includes(c.capability as AvailableCapability)
    || !isNonEmptyString(c.reason)
  ) return null;
  return input as CapabilityRequirement;
}
