/**
 * Task Resolution — Contracts
 * TASK-AIS-TASK-RESOLUTION-SLICE-001
 *
 * First vertical slice of the AIS Task Resolution Engine.
 *
 * Product principle (task §3): COMPLEXITY BELONGS TO AIS. INTENT BELONGS TO
 * THE USER. The user provides the goal/intent; AIS determines what it needs
 * to solve the task. The user is never required to configure model, context,
 * tools, MCP, skills, or rules when AIS can determine them itself.
 *
 * Conceptual separation (task §5) — four DISTINCT concerns:
 *
 *   5.1 Project State    — validated knowledge about the project. The
 *                          EXISTING ProjectStore/Project aggregate remains
 *                          the source of record; this module only READS a
 *                          structural view of it. No new persistence.
 *   5.2 Interaction Model— validated information about how AIS works with
 *                          this user/project. NOT implemented in this slice;
 *                          only the explanation PREFERENCE seam exists so the
 *                          concept stays architecturally separate.
 *   5.3 Task Resolution  — WHAT must AIS do now to solve this particular
 *                          user task? (this file's TaskResolution contract)
 *   5.4 Execution Plan   — HOW will AIS technically execute the resolved
 *                          task, expressed as bindings from resolved
 *                          capabilities to EXISTING mechanisms? Deliberately
 *                          NOT collapsed into TaskResolution.
 *
 * Provider independence (task §14): none of these contracts reference a
 * provider, model, or agent runtime. "AI is not the engine" (§15): the
 * deterministic engine owns the structured decision; the LLM remains an
 * execution resource behind the existing ExecutionEngine.
 *
 * Persistence (task §13): TaskResolution is execution/session-scoped. It is
 * NEVER persisted — ProjectStore remains canonical durable state and the
 * existing session capture remains authoritative for persisted Q&A. No new
 * persistence subsystem, no orchestration traces on disk.
 */

// ═══════════════════════════════════════════════════════════════════
// EXPLANATION POLICY (task §9)
// ═══════════════════════════════════════════════════════════════════

/**
 * Explanation depth. Resolution order (task §9):
 *   explicit user preference  →  contextual adaptation  →  AIS default.
 * DETAILED is never chosen adaptively — only on explicit request.
 */
export type ExplanationMode = 'none' | 'short' | 'detailed';

/**
 * Why the explanation (or its depth) was chosen. Internal reason codes —
 * they drive deterministic template selection and are NEVER shown raw to
 * the user (task §11: transparency explains meaning, not implementation).
 */
export type ExplanationReasonCode =
  | 'related-context'   // diagnosis: related code beyond the error site matters
  | 'ambiguous-target'  // deictic reference ("here"/"this") without specifics
  | 'history-grounded'  // persisted history really exists and is used
  | 'history-absent'    // history requested but none persisted — no fabrication
  | 'degraded';         // full preparation was not possible; minimal safe path

// ═══════════════════════════════════════════════════════════════════
// TASK RESOLUTION (task §6)
// ═══════════════════════════════════════════════════════════════════

/**
 * What kind of task this is. Closed set for the first slice — exactly the
 * repository-question workflows the current MVP serves (task §4).
 */
export type TaskType =
  | 'repository.overview'
  | 'implementation.diagnosis'
  | 'project.history'
  | 'general.question';

/**
 * Capabilities the CURRENT MVP actually provides (task §8: use only
 * capabilities already available). Each maps to an existing mechanism in
 * the Execution Plan — nothing here is aspirational.
 */
export type AvailableCapability =
  | 'repository-inspection'       // DiscoveryPipelineService.discover (existing Wave-1 step 1)
  | 'context-retrieval'           // ExecutionEngine question-driven context build (existing step 2)
  | 'llm-reasoning'               // CognitiveRuntime.process (existing step 3)
  | 'evidence-capture'            // extractRelevantSources + evidence store + claim/evidence attach (existing steps 4-5)
  | 'persisted-project-context';  // ProjectService read path over ProjectStore (existing; selected only when data really exists)

/**
 * A CONTEXT REQUIREMENT (task §7) — WHAT needs to be understood, stated at
 * the level of meaning. This is deliberately NOT a file list: "understand
 * the implementation of the failing feature and its immediate dependencies",
 * never "use files A.ts, B.ts, C.ts" (exact selection belongs to Context
 * Resolution / the existing execution pipeline).
 */
export interface ContextRequirement {
  /** Stable slug, e.g. 'ctx.affected-implementation'. */
  readonly id: string;
  /** Human-readable requirement statement (meaning, not implementation). */
  readonly description: string;
  /** Why this requirement follows from the resolved task. */
  readonly rationale: string;
}

/** One capability the resolved task needs, with the internal reason. */
export interface CapabilityRequirement {
  readonly capability: AvailableCapability;
  readonly reason: string;
}

/** Human-facing explanation attached to the resolution (task §9/§10). */
export interface TaskResolutionExplanation {
  readonly mode: ExplanationMode;
  /** null when mode is 'none' or nothing useful can be said. */
  readonly message: string | null;
}

/**
 * The smallest justified TaskResolution contract (task §6). Deterministic,
 * validated, provider-agnostic, execution-scoped (never persisted).
 */
export interface TaskResolution {
  /** Deterministic id: TASK-<interaction session id> (one Q&A per session FSM). */
  readonly taskId: string;
  /** The user's intent, verbatim (trimmed question text). */
  readonly userIntent: string;
  readonly taskType: TaskType;
  /** What AIS set out to do, in one human sentence (internal field). */
  readonly objective: string;
  /** Requirement-level context needs (§7) — never a file list. */
  readonly requiredContext: readonly ContextRequirement[];
  /** Capabilities selected from those the current MVP really provides (§8). */
  readonly requiredCapabilities: readonly CapabilityRequirement[];
  readonly explanation: TaskResolutionExplanation;
  /** 0..1 — deterministic rule strength; not a probability distribution. */
  readonly confidence: number;
  /** ISO timestamp of resolution creation (record creation, not read-path). */
  readonly createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTION PLAN (task §5.4) — HOW, bound to EXISTING mechanisms
// ═══════════════════════════════════════════════════════════════════

/** One binding: a resolved capability → the existing mechanism that fulfils it. */
export interface ExecutionStep {
  readonly capability: AvailableCapability;
  /** Stable internal mechanism id (e.g. 'engine.wave1.discovery'). */
  readonly mechanism: string;
  /** Internal reason — consumed by tests/traces, never shown raw to users. */
  readonly reason: string;
}

/**
 * The technical "how" for the resolved task. Built deterministically from a
 * TaskResolution. additionalContext is the ONLY execution input it produces:
 * a compact, sanitized digest of REALLY persisted project facts, consumed by
 * the existing ExecutionEngine through one additive seam. When no capability
 * requires persisted context, it is null and execution is byte-identical to
 * the pre-slice pipeline.
 */
export interface ExecutionPlan {
  readonly resolutionId: string;
  readonly steps: readonly ExecutionStep[];
  readonly additionalContext: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// SUBMISSION FLOW INPUT/OUTPUT
// ═══════════════════════════════════════════════════════════════════

/** Input for resolving one user submission (one question = one task). */
export interface ResolveSubmissionInput {
  readonly sessionId: string;
  readonly projectPath: string;
  readonly question: string;
  /** Explicit user preference (task §9 priority 1). Absent → adaptive. */
  readonly preference?: ExplanationMode;
}

/**
 * Structural, read-only view of persisted project facts. Satisfied by the
 * existing Project aggregate (mvp-ui/project-types.ts) WITHOUT importing it —
 * core stays decoupled from the mvp-ui layer.
 */
export interface PersistedFacts {
  readonly sessions: readonly {
    readonly question: string;
    readonly answer: string;
    readonly createdAt: string;
  }[];
  readonly insights: readonly {
    readonly text: string;
    readonly status: string;
    readonly createdAt: string;
  }[];
}

/**
 * Deterministic intent classification produced by the rule-based classifier
 * (task §17: deterministic where possible; injectable only for tests).
 */
export interface IntentClassification {
  readonly taskType: TaskType;
  readonly confidence: number;
  /** Deictic reference ("здесь"/"here"/"this …") without a concrete target. */
  readonly ambiguousTarget: boolean;
  /** Matched rule signals — internal, never user-facing. */
  readonly signals: readonly string[];
}

/** What the resolver hands to InteractionService for one submission. */
export interface SubmissionResolution {
  readonly resolution: TaskResolution;
  readonly plan: ExecutionPlan;
  /**
   * Additive, human-facing view carried on the answer response. Sanitized by
   * construction: fixed templates + fixed requirement vocabulary — never file
   * paths, provider/model names, tool counts, or raw prompts (task §11/§22).
   */
  readonly preparation: PreparationView;
}

/** Additive field on the answer response (HTTP + AnswerView). */
export interface PreparationView {
  readonly mode: ExplanationMode;
  readonly message: string | null;
  readonly taskType: TaskType;
  readonly confidence: number;
  /** true when validation failed and the minimal-safe path was used (§16/§18). */
  readonly degraded: boolean;
}
