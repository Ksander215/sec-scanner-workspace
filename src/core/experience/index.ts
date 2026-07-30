/**
 * Experience Runtime — Public API Barrel
 * TASK-AIS-004A.000
 *
 * Exports all types, subsystems, and the main orchestrator.
 */

// ─── Main Orchestrator ───────────────────────────────────────
export { ExperienceRuntime } from './experience-runtime.js';

// ─── Subsystems ──────────────────────────────────────────────
export { BehaviorRuntime } from './behavior-runtime.js';
export { PreferenceEvolution } from './preference-evolution.js';
export { HabitEngine } from './habit-engine.js';
export { AdaptationEngine } from './adaptation-engine.js';
export { RecommendationRuntime } from './recommendation-runtime.js';
export { ExperienceGraph } from './experience-graph.js';
export { PersonalizationProfiles } from './personalization-profiles.js';
export { ContextSwitching } from './context-switching.js';
export { ExplainabilityRuntime } from './explainability-runtime.js';
export { ExperiencePolicies } from './experience-policies.js';
export { ExperienceMetrics } from './experience-metrics.js';
export { SnapshotRuntime } from './snapshot-runtime.js';
export { ConsentRuntime } from './consent-runtime.js';
export { ExperienceContext, type ExperienceSession } from './experience-context.js';

// ─── FSM ─────────────────────────────────────────────────────
export { ExperienceFSMDefinition, createExperienceFSM } from './experience-fsm.js';

// ─── Types ───────────────────────────────────────────────────
export type {
  ExperienceSessionId,
  BehaviorEventId,
  PreferenceId,
  HabitId,
  AdaptationId,
  RecommendationId,
  ExperienceNodeId,
  ProfileId,
  ContextId,
  SnapshotId,
  ConsentRecordId,
  ObservationId,
  ExplainabilityId,
  LearningCheckpointId,
  BehaviorEvent,
  Preference,
  PreferenceChange,
  Habit,
  Adaptation,
  Recommendation,
  ExperienceNode,
  ExperienceEdge,
  PersonalizationProfile,
  Observation,
  ExperienceSnapshot,
  ConsentRecord,
  ExplainabilityRecord,
  LearningCheckpoint,
  ExperienceMetric,
  ExperiencePolicy,
  ExperienceRuntimeConfig,
} from './types.js';

export {
  ExperienceState,
  BehaviorEventType,
  PreferenceState,
  HabitPeriodicity,
  HabitStrength,
  AdaptationState,
  AdaptationType,
  RecommendationType,
  RecommendationState,
  ExperienceNodeType,
  ExperienceEdgeType,
  BuiltInProfileType,
  ProfileActivationMode,
  ConsentMode,
  ConsentScope,
  ExperienceMetricKey,
  ExperiencePolicyType,
  DefaultExperienceRuntimeConfig,
} from './types.js';

// ─── Errors ───────────────────────────────────────────────────
export {
  ExperienceError,
  BehaviorEventValidationError,
  BehaviorEventStorageError,
  PreferenceValidationError,
  InsufficientObservationsError,
  PreferenceConflictError,
  HabitDetectionError,
  HabitNotFoundError,
  AdaptationValidationError,
  AdaptationRevertError,
  AdaptationExpiredError,
  RecommendationLimitError,
  RecommendationValidationError,
  ProfileNotFoundError,
  ProfileConflictError,
  ContextDetectionError,
  ConsentRequiredError,
  ConsentDeniedError,
  ConsentExpiredError,
  SnapshotNotFoundError,
  SnapshotExportError,
  SnapshotImportError,
  ExperienceFSMError,
  ExperienceGraphError,
  ExplainabilityError,
  PolicyViolationError,
  PolicyNotFoundError,
} from './errors.js';

// ─── Events ───────────────────────────────────────────────────
export type {
  ExperienceEvent,
  HabitDetected,
  PreferenceChanged,
  AdaptationApplied,
  AdaptationReverted,
  RecommendationGenerated,
  ProfileActivated,
  ProfileSwitched,
  ContextChanged,
  LearningCheckpointCreated,
  ExperienceStateChanged,
  SnapshotCreated,
  SnapshotRestored,
  ConsentGranted,
  ConsentRevoked,
  ObservationRecorded,
  BehaviorEventCollected,
} from './events.js';

// ─── Contracts ────────────────────────────────────────────────
export type {
  ICognitiveRuntimeAdapter,
  IIdentityRuntimeAdapter,
  IMemoryRuntimeAdapter,
  IKnowledgeRuntimeAdapter,
  IWorkflowRuntimeAdapter,
  ICapabilityRuntimeAdapter,
  IExperienceContracts,
} from './contracts.js';
