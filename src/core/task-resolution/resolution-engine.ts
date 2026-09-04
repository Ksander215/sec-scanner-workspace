/**
 * Task Resolution — Deterministic Resolution Engine
 * TASK-AIS-TASK-RESOLUTION-SLICE-001 §5.3/§6/§7/§8/§16/§17/§18
 *
 * The engine owns the structured decision about WHAT is required to solve
 * the user's task (§5.3) and hands the HOW to the Execution Plan (§5.4).
 *
 * "AI is not the engine" (§15): intent classification here is DETERMINISTIC
 * rule matching (§17) — no LLM, no Math.random(), no hidden state. The LLM
 * remains an execution resource behind the existing ExecutionEngine.
 *
 * Failure behavior (§16/§18): the engine never throws into the question
 * path. If classification or self-validation fails, it DEGRADES to the
 * minimal-safe path — safest available context, human explanation of the
 * uncertainty — and never exposes technical configuration choices.
 *
 * Capability honesty (§8): 'persisted-project-context' is selected ONLY when
 * the project really has persisted sessions/insights (read through the
 * existing ProjectService read path, wired in mvp-ui/index.ts). Nothing is
 * fabricated — including history (§19 no-fabrication rule).
 */

import { sanitizeSecrets } from '../evidence-loop/secret-sanitizer.js';
import type {
  AvailableCapability,
  CapabilityRequirement,
  ContextRequirement,
  ExecutionPlan,
  ExecutionStep,
  IntentClassification,
  PersistedFacts,
  PreparationView,
  ResolveSubmissionInput,
  SubmissionResolution,
  TaskResolution,
  TaskType,
} from './types.js';
import { validateTaskResolution } from './validation.js';
import {
  detectLanguage,
  resolveExplanation,
} from './explanation-policy.js';

// ═══════════════════════════════════════════════════════════════════
// DETERMINISTIC RULE CLASSIFIER (§17)
// ═══════════════════════════════════════════════════════════════════

/** History intent — explicit references to prior work. Checked FIRST. */
const HISTORY_RULES: readonly [RegExp, string][] = [
  [/истори/i, 'ru:истори'],
  [/раньше|прежде|в прошлый раз|мы делали|что делал[и ]?|до этого/i, 'ru:past-work'],
  [/history|previously|earlier|last time|what we did|past work|before\b/i, 'en:history'],
];

/** Diagnosis intent — error/failure focus. */
const DIAGNOSIS_RULES: readonly [RegExp, string][] = [
  [/почему|из-за чего/i, 'ru:why'],
  [/ошибк|не работает|сломал|баг|падает|вылетает|исправ/i, 'ru:problem'],
  [/why\b|error|bug\b|fail|broken|crash|doesn'?t work|not working|fix\b|wrong\b/i, 'en:problem'],
];

/** Overview intent — project-level understanding. */
const OVERVIEW_RULES: readonly [RegExp, string][] = [
  [/что делает|расскажи|опиши|обзор|структур|архитектур|назначение/i, 'ru:overview'],
  [/what does|overview|describe|explain the project|architecture|structure|purpose|main modules|about this (project|repo)/i, 'en:overview'],
];

/** Deictic pointers — "here"/"this" without a concrete target (§18 example). */
const DEICTIC_RULES: readonly [RegExp, string][] = [
  [/здесь|тут|это место|этой строк|данном|данной/i, 'ru:deictic'],
  [/\bhere\b|this (place|line|function|file|code|part)\b/i, 'en:deictic'],
];

function matchRules(rules: readonly [RegExp, string][], text: string): string[] {
  const hits: string[] = [];
  for (const [re, signal] of rules) {
    if (re.test(text)) hits.push(signal);
  }
  return hits;
}

/**
 * Deterministic classifier. Rule order: history → diagnosis → overview →
 * general fallback. Confidence reflects rule strength: 0.9 for an explicit
 * match, 0.6 for the safe general fallback (§18: continue when safe).
 */
export function defaultClassifyIntent(intent: string): IntentClassification {
  const deictic = matchRules(DEICTIC_RULES, intent);

  const history = matchRules(HISTORY_RULES, intent);
  if (history.length > 0) {
    return { taskType: 'project.history', confidence: 0.9, ambiguousTarget: deictic.length > 0, signals: history };
  }

  const diagnosis = matchRules(DIAGNOSIS_RULES, intent);
  if (diagnosis.length > 0) {
    return { taskType: 'implementation.diagnosis', confidence: 0.9, ambiguousTarget: deictic.length > 0, signals: diagnosis };
  }

  const overview = matchRules(OVERVIEW_RULES, intent);
  if (overview.length > 0) {
    return { taskType: 'repository.overview', confidence: 0.9, ambiguousTarget: false, signals: overview };
  }

  return { taskType: 'general.question', confidence: 0.6, ambiguousTarget: false, signals: ['fallback:general'] };
}

// ═══════════════════════════════════════════════════════════════════
// REQUIREMENT + CAPABILITY CATALOGS (§7/§8 — meaning-level, not files)
// ═══════════════════════════════════════════════════════════════════

const CONTEXT_REQUIREMENTS: Record<TaskType, ContextRequirement> = {
  'repository.overview': {
    id: 'ctx.project-state',
    description: 'understand the project’s purpose, main modules and overall structure as it exists now',
    rationale: 'An overview answer must reflect the repository in its current state.',
  },
  'implementation.diagnosis': {
    id: 'ctx.affected-implementation',
    description: 'understand the implementation of the affected functionality and its immediate dependencies',
    rationale: 'A diagnosis must cover the code around the problem, or it risks fixing the symptom instead of the cause.',
  },
  'project.history': {
    id: 'ctx.persisted-history',
    description: 'ground the answer in the project’s persisted prior questions, answers and insights',
    rationale: 'History questions must be answered from real persisted records, never invented.',
  },
  'general.question': {
    id: 'ctx.question-in-project-state',
    description: 'understand the question against the project’s current state',
    rationale: 'Even a general question must not contradict the actual project.',
  },
};

const OBJECTIVES: Record<TaskType, string> = {
  'repository.overview': 'Explain what the project is and how it is structured.',
  'implementation.diagnosis': 'Explain why the reported problem occurs, grounded in the real implementation.',
  'project.history': 'Summarize the project’s prior work from persisted records.',
  'general.question': 'Answer the user’s question accurately against the current project state.',
};

const BASE_CAPABILITIES: readonly AvailableCapability[] = [
  'repository-inspection',
  'context-retrieval',
  'llm-reasoning',
  'evidence-capture',
];

const CAPABILITY_REASONS: Record<AvailableCapability, string> = {
  'repository-inspection': 'The answer must be grounded in the repository discovered as it exists now.',
  'context-retrieval': 'Question-driven context selection focuses execution on what the task needs.',
  'llm-reasoning': 'Producing the answer requires the existing reasoning resource.',
  'evidence-capture': 'Claims and evidence must be captured so the result stays verifiable.',
  'persisted-project-context': 'The project has really persisted prior work that this task must account for.',
};

/** Capability → existing mechanism bindings (§5.4; nothing aspirational). */
const CAPABILITY_MECHANISMS: Record<AvailableCapability, string> = {
  'repository-inspection': 'engine.wave1.discovery',
  'context-retrieval': 'engine.wave1.context-retrieval',
  'llm-reasoning': 'engine.wave1.llm-reasoning',
  'evidence-capture': 'engine.wave1.evidence-capture',
  'persisted-project-context': 'project.persisted-context-digest',
};

// ═══════════════════════════════════════════════════════════════════
// PERSISTED CONTEXT DIGEST (real records only — no fabrication)
// ═══════════════════════════════════════════════════════════════════

const DIGEST_MAX_SESSIONS = 3;
const DIGEST_MAX_INSIGHTS = 5;
const DIGEST_FIELD_CAP = 240;
const DIGEST_TOTAL_CAP = 1600;

function digestText(text: string): string {
  const one = sanitizeSecrets(text.replace(/\s+/g, ' ').trim());
  return one.length <= DIGEST_FIELD_CAP ? one : one.substring(0, DIGEST_FIELD_CAP) + '…';
}

function newestFirst<T extends { createdAt: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Build a compact, sanitized digest of REALLY persisted project facts for
 * the execution context. Deterministic ordering (newest-first, stable
 * tie-break). Returns null when there is nothing persisted — never a
 * fabricated placeholder.
 */
export function buildPersistedContextDigest(facts: PersistedFacts): string | null {
  const sessions = newestFirst(facts.sessions).slice(0, DIGEST_MAX_SESSIONS);
  const insights = newestFirst(facts.insights).slice(0, DIGEST_MAX_INSIGHTS);

  if (sessions.length === 0 && insights.length === 0) return null;

  const lines: string[] = ['Persisted project context (real records only):'];

  for (const s of sessions) {
    lines.push(`- Prior Q&A — Q: ${digestText(s.question)} | A: ${digestText(s.answer)}`);
  }
  for (const i of insights) {
    lines.push(`- Saved insight [${i.status}]: ${digestText(i.text)}`);
  }

  let out = lines.join('\n');
  if (out.length > DIGEST_TOTAL_CAP) out = out.substring(0, DIGEST_TOTAL_CAP) + '…';
  return out;
}

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

export interface TaskResolutionEngineConfig {
  /**
   * Read-only access to REALLY persisted project facts (existing Project
   * read path). Absent or returning null → the project has no usable
   * persisted context for selection purposes.
   */
  readonly projectFacts?: (projectPath: string) => PersistedFacts | null;
  /** Injectable ONLY for tests (T9 invalid-resolution path). */
  readonly classifyIntent?: (intent: string) => IntentClassification;
  /** Injectable ONLY for tests (determinism of createdAt). */
  readonly now?: () => string;
}

export class TaskResolutionEngine {
  private readonly projectFacts: ((projectPath: string) => PersistedFacts | null) | undefined;
  private readonly classifyIntent: (intent: string) => IntentClassification;
  private readonly now: () => string;

  constructor(config?: TaskResolutionEngineConfig) {
    this.projectFacts = config?.projectFacts;
    this.classifyIntent = config?.classifyIntent ?? defaultClassifyIntent;
    this.now = config?.now ?? (() => new Date().toISOString());
  }

  /**
   * Resolve one user submission. NEVER throws — any internal failure degrades
   * to the minimal-safe path (§18) with a degraded PreparationView.
   */
  resolveForSubmission(input: ResolveSubmissionInput): SubmissionResolution {
    try {
      return this.resolveInternal(input);
    } catch {
      return this.degrade(input, ['degraded']);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // INTERNAL — happy path (self-validated; §16)
  // ─────────────────────────────────────────────────────────────

  private resolveInternal(input: ResolveSubmissionInput): SubmissionResolution {
    const { sessionId, projectPath, question, preference } = input;
    const intent = question.trim();

    // 1. Task understanding — deterministic classification (§17).
    const classification = this.classifyIntent(intent);
    const taskType = classification.taskType;

    // 2. Persisted facts — read-only, through the existing read path (§5.1).
    const facts = this.readFacts(projectPath);
    const hasPersistedHistory = facts !== null
      && (facts.sessions.length > 0 || facts.insights.length > 0);

    // 3. Context requirements (§7) — meaning-level, from the catalog.
    const requiredContext: readonly ContextRequirement[] = [CONTEXT_REQUIREMENTS[taskType]];

    // 4. Capability selection (§8) — only what the MVP really provides.
    //    persisted-project-context is selected ONLY when data really exists
    //    AND the task benefits (history task, or ambiguous target needing
    //    grounding). Otherwise execution stays exactly the existing pipeline.
    const needsPersistedContext = hasPersistedHistory
      && (taskType === 'project.history' || classification.ambiguousTarget);
    const selected: readonly AvailableCapability[] = needsPersistedContext
      ? [...BASE_CAPABILITIES, 'persisted-project-context']
      : BASE_CAPABILITIES;
    const requiredCapabilities: readonly CapabilityRequirement[] = selected.map(capability => ({
      capability,
      reason: CAPABILITY_REASONS[capability],
    }));

    // 5. Explanation reasons — deterministic situation codes (§9).
    const reasons: ExplanationReasonBuilder[] = [];
    if (taskType === 'implementation.diagnosis') reasons.push('related-context');
    if (classification.ambiguousTarget) reasons.push('ambiguous-target');
    if (taskType === 'project.history') {
      reasons.push(hasPersistedHistory ? 'history-grounded' : 'history-absent');
    }

    // 6. Assemble + SELF-VALIDATE (§16). Invalid → degrade, never propagate.
    const resolution = validateTaskResolution({
      taskId: `TASK-${sessionId}`,
      userIntent: intent,
      taskType,
      objective: OBJECTIVES[taskType],
      requiredContext,
      requiredCapabilities,
      explanation: resolveExplanation({
        preference,
        reasons,
        requirements: requiredContext.map(c => c.description),
        language: detectLanguage(intent),
      }),
      confidence: classification.confidence,
      createdAt: this.now(),
    });

    // 7. Execution Plan (§5.4) — bind capabilities to EXISTING mechanisms.
    const steps: readonly ExecutionStep[] = selected.map(capability => ({
      capability,
      mechanism: CAPABILITY_MECHANISMS[capability],
      reason: CAPABILITY_REASONS[capability],
    }));
    const additionalContext = needsPersistedContext && facts
      ? buildPersistedContextDigest(facts)
      : null;

    const plan: ExecutionPlan = {
      resolutionId: resolution.taskId,
      steps,
      additionalContext,
    };

    return {
      resolution,
      plan,
      preparation: this.toPreparation(resolution, false),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // DEGRADE PATH (§16/§18) — safe minimal continuation
  // ─────────────────────────────────────────────────────────────

  private degrade(input: ResolveSubmissionInput, reasons: ExplanationReasonBuilder[]): SubmissionResolution {
    const { sessionId, question, preference } = input;
    const intent = question.trim() || '(empty intent)';
    const taskType: TaskType = 'general.question';
    const requiredContext: readonly ContextRequirement[] = [CONTEXT_REQUIREMENTS[taskType]];
    const requiredCapabilities: readonly CapabilityRequirement[] = BASE_CAPABILITIES.map(capability => ({
      capability,
      reason: CAPABILITY_REASONS[capability],
    }));

    const resolution = validateTaskResolution({
      taskId: `TASK-${sessionId}`,
      userIntent: intent.substring(0, 200),
      taskType,
      objective: OBJECTIVES[taskType],
      requiredContext,
      requiredCapabilities,
      explanation: resolveExplanation({
        preference,
        reasons,
        requirements: requiredContext.map(c => c.description),
        language: detectLanguage(intent),
      }),
      confidence: 0.3,
      createdAt: this.now(),
    });

    const plan: ExecutionPlan = {
      resolutionId: resolution.taskId,
      steps: BASE_CAPABILITIES.map(capability => ({
        capability,
        mechanism: CAPABILITY_MECHANISMS[capability],
        reason: CAPABILITY_REASONS[capability],
      })),
      additionalContext: null, // minimal-safe: no persisted-context injection
    };

    return {
      resolution,
      plan,
      preparation: this.toPreparation(resolution, true),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  private readFacts(projectPath: string): PersistedFacts | null {
    if (!this.projectFacts) return null;
    try {
      return this.projectFacts(projectPath);
    } catch {
      return null; // facts are an optimization — never a failure source
    }
  }

  private toPreparation(resolution: TaskResolution, degraded: boolean): PreparationView {
    return {
      mode: resolution.explanation.mode,
      message: resolution.explanation.message,
      taskType: resolution.taskType,
      confidence: resolution.confidence,
      degraded,
    };
  }
}

/** Local alias to keep the reason-code import surface minimal. */
type ExplanationReasonBuilder = import('./types.js').ExplanationReasonCode;
