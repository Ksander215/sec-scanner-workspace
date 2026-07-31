/**
 * Personal Intelligence Runtime — Type Definitions
 *
 * Core types for the 15 PIR subsystems: User Profile, Goals, Priority,
 * Context, Planning, Prediction, Habits, Recommendations, Attention,
 * Reflection, Learning, Decisions, Daily Briefs, and Assistant.
 */
import type { Timestamp } from '../types/common.js';

// ── User Profile Types ─────────────────────────────────────────

/**
 * Snapshot of the current user's personal context, including
 * focus area, skills, goals, interests, activity, and preferences.
 */
export interface PersonalContext {
  /** Unique user identifier */
  readonly userId: string;
  /** Current focus area or project, null if none */
  readonly focus: string | null;
  /** User-declared or inferred skill labels */
  readonly skills: readonly string[];
  /** Goals currently associated with the user */
  readonly goals: readonly GoalRef[];
  /** User-declared interest topics */
  readonly interests: readonly string[];
  /** What the user is doing right now */
  readonly activity: CurrentActivity;
  /** Current environment label (e.g. 'office', 'home') */
  readonly environment: string | null;
  /** Arbitrary key-value preferences */
  readonly preferences: Readonly<Record<string, unknown>>;
  /** ISO-8601 timestamp of last update */
  readonly updatedAt: Timestamp;
}

/**
 * Describes what the user is currently doing.
 */
export interface CurrentActivity {
  /** Activity category */
  readonly type: 'working' | 'meeting' | 'break' | 'learning' | 'planning' | 'review' | 'idle' | 'unknown';
  /** Human-readable description of the current activity */
  readonly description: string;
  /** ISO-8601 timestamp when this activity started */
  readonly startedAt: Timestamp;
  /** Goal this activity is advancing, if any */
  readonly relatedGoalId: string | null;
  /** Workflow instance driving this activity, if any */
  readonly relatedWorkflowId: string | null;
}

/**
 * Lightweight reference to a goal used in summaries and context.
 */
export interface GoalRef {
  /** Unique goal identifier */
  readonly id: string;
  /** Short title */
  readonly title: string;
  /** Current lifecycle status */
  readonly status: GoalStatus;
  /** Progress percentage 0-100 */
  readonly progress: number;
  /** Optional deadline, ISO-8601 */
  readonly deadline: string | null;
}

// ── Goal Types ─────────────────────────────────────────────────

/**
 * Lifecycle status of a goal.
 */
export enum GoalStatus {
  Draft = 'Draft',
  Active = 'Active',
  Paused = 'Paused',
  Completed = 'Completed',
  Archived = 'Archived',
  Cancelled = 'Cancelled',
}

/**
 * Hierarchical level of a goal within the vision-to-task tree.
 */
export enum GoalLevel {
  Vision = 'Vision',
  Strategy = 'Strategy',
  Goal = 'Goal',
  Objective = 'Objective',
  Task = 'Task',
}

/**
 * A full goal entity in the personal goal hierarchy.
 */
export interface Goal {
  /** Unique goal identifier */
  readonly id: string;
  /** Short title */
  readonly title: string;
  /** Detailed description */
  readonly description: string;
  /** Hierarchical level in the vision-to-task tree */
  readonly level: GoalLevel;
  /** Current lifecycle status */
  readonly status: GoalStatus;
  /** Parent goal id, null for root goals */
  readonly parentId: string | null;
  /** Ordered child goal ids */
  readonly childrenIds: readonly string[];
  /** Priority weight for ranking */
  readonly priority: number;
  /** Progress percentage 0-100 */
  readonly progress: number;
  /** Optional deadline, ISO-8601 */
  readonly deadline: string | null;
  /** User-defined tags */
  readonly tags: readonly string[];
  /** Arbitrary extension metadata */
  readonly metadata: Readonly<Record<string, unknown>>;
  /** ISO-8601 creation timestamp */
  readonly createdAt: Timestamp;
  /** ISO-8601 last-modified timestamp */
  readonly updatedAt: Timestamp;
  /** ISO-8601 completion timestamp, null if not completed */
  readonly completedAt: string | null;
}

/**
 * Input for creating a new goal.
 */
export interface GoalCreateInput {
  /** Short title (required) */
  readonly title: string;
  /** Detailed description */
  readonly description?: string;
  /** Hierarchical level (required) */
  readonly level: GoalLevel;
  /** Parent goal id */
  readonly parentId?: string;
  /** Priority weight, defaults to 0 */
  readonly priority?: number;
  /** Optional deadline, ISO-8601 */
  readonly deadline?: string;
  /** User-defined tags */
  readonly tags?: readonly string[];
  /** Arbitrary extension metadata */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ── Priority Types ─────────────────────────────────────────────

/**
 * Individual scoring factors used to compute a goal's priority.
 * Each factor is normalized to 0-10.
 */
export interface PriorityFactors {
  /** How close the deadline is; 0=far, 10=imminent */
  readonly deadline: number;
  /** Subjective importance; 0=low, 10=critical */
  readonly importance: number;
  /** Time-sensitivity; 0=relaxed, 10=urgent */
  readonly urgency: number;
  /** User's current energy level; 0=depleted, 10=energized */
  readonly energy: number;
  /** Fit with current context; 0=mismatch, 10=perfect */
  readonly context: number;
  /** How many dependencies are satisfied; 0=blocked, 10=ready */
  readonly dependencies: number;
  /** Inverse risk; 10=low risk, 0=high risk */
  readonly risk: number;
  /** Inverse progress; 10=not started, 0=complete */
  readonly progress: number;
}

/**
 * Computed priority result for a single goal.
 */
export interface PriorityScore {
  /** Goal this score applies to */
  readonly goalId: string;
  /** Weighted total 0-100 */
  readonly totalScore: number;
  /** Individual factor breakdown */
  readonly factors: PriorityFactors;
  /** Rank within the current priority list */
  readonly rank: number;
  /** ISO-8601 timestamp of calculation */
  readonly calculatedAt: Timestamp;
}

// ── Context Types ─────────────────────────────────────────────

/**
 * Unified context snapshot aggregating data from all runtime subsystems.
 */
export interface UnifiedContext {
  /** User this context belongs to */
  readonly userId: string;
  /** ISO-8601 timestamp when the snapshot was taken */
  readonly timestamp: Timestamp;
  /** Memory subsystem summary */
  readonly memory: ContextMemorySnapshot;
  /** Knowledge subsystem summary */
  readonly knowledge: ContextKnowledgeSnapshot;
  /** Identity subsystem summary */
  readonly identity: ContextIdentitySnapshot;
  /** Desktop subsystem summary */
  readonly desktop: ContextDesktopSnapshot;
  /** Workflow subsystem summary */
  readonly workflow: ContextWorkflowSnapshot;
  /** Experience subsystem summary */
  readonly experience: ContextExperienceSnapshot;
  /** Conversation/cognitive subsystem summary */
  readonly conversation: ContextConversationSnapshot;
}

/** Memory subsystem context summary. */
export interface ContextMemorySnapshot {
  /** Number of entries in working memory */
  readonly workingEntries: number;
  /** Number of entries in session memory */
  readonly sessionEntries: number;
  /** Most recently accessed memory keys */
  readonly recentKeys: readonly string[];
}

/** Knowledge subsystem context summary. */
export interface ContextKnowledgeSnapshot {
  /** Total knowledge namespaces */
  readonly namespaceCount: number;
  /** Total knowledge items across all namespaces */
  readonly itemCount: number;
  /** Most recently created or updated knowledge items */
  readonly recentItems: readonly string[];
}

/** Identity subsystem context summary. */
export interface ContextIdentitySnapshot {
  /** Active role names for the current user */
  readonly roles: readonly string[];
  /** Currently active preference values */
  readonly activePreferences: Readonly<Record<string, unknown>>;
  /** Organization the user belongs to, if any */
  readonly organizationId: string | null;
}

/** Desktop subsystem context summary. */
export interface ContextDesktopSnapshot {
  /** Number of currently open windows */
  readonly openWindows: number;
  /** Title of the focused window, if any */
  readonly activeWindow: string | null;
  /** Serialized desktop state descriptor */
  readonly desktopState: string;
}

/** Workflow subsystem context summary. */
export interface ContextWorkflowSnapshot {
  /** Number of workflows currently defined */
  readonly activeWorkflows: number;
  /** Number of workflow instances currently executing */
  readonly runningInstances: number;
  /** Recently completed workflow instance ids */
  readonly recentCompletions: readonly string[];
}

/** Experience subsystem context summary. */
export interface ContextExperienceSnapshot {
  /** Number of active adaptations */
  readonly adaptationCount: number;
  /** Number of pending recommendations */
  readonly recommendationCount: number;
  /** Current experience phase label */
  readonly currentPhase: string;
}

/** Conversation/cognitive subsystem context summary. */
export interface ContextConversationSnapshot {
  /** Inferred intent of the current conversation turn */
  readonly currentIntent: string | null;
  /** Number of turns in the current session */
  readonly turnCount: number;
  /** Current conversation session identifier */
  readonly sessionId: string | null;
}

// ── Planning Types ─────────────────────────────────────────────

/**
 * Time period a plan covers.
 */
export enum PlanPeriod {
  Today = 'Today',
  Tomorrow = 'Tomorrow',
  Week = 'Week',
  Month = 'Month',
  Quarter = 'Quarter',
}

/**
 * A structured plan for a time period, optionally scoped to a goal.
 */
export interface Plan {
  /** Unique plan identifier */
  readonly id: string;
  /** Time period this plan covers */
  readonly period: PlanPeriod;
  /** Optional goal this plan advances */
  readonly goalId: string | null;
  /** Ordered plan items */
  readonly items: readonly PlanItem[];
  /** ISO-8601 creation timestamp */
  readonly createdAt: Timestamp;
  /** ISO-8601 last-modified timestamp */
  readonly updatedAt: Timestamp;
}

/**
 * A single actionable item within a plan.
 */
export interface PlanItem {
  /** Unique item identifier */
  readonly id: string;
  /** Short title */
  readonly title: string;
  /** Detailed description of what to do */
  readonly description: string;
  /** Estimated effort in minutes */
  readonly estimatedMinutes: number;
  /** Priority weight for ordering within the plan */
  readonly priority: number;
  /** Completion status */
  readonly status: 'pending' | 'in_progress' | 'done' | 'skipped';
  /** Goal this item advances, if any */
  readonly goalId: string | null;
  /** Display order within the plan */
  readonly order: number;
}

// ── Prediction Types ───────────────────────────────────────────

/**
 * Category of prediction the runtime can produce.
 */
export enum PredictionType {
  NextAction = 'NextAction',
  NextTask = 'NextTask',
  NextQuestion = 'NextQuestion',
  NextDocument = 'NextDocument',
  NextWorkflow = 'NextWorkflow',
}

/**
 * A single prediction about what the user will likely do next.
 */
export interface Prediction {
  /** Unique prediction identifier */
  readonly id: string;
  /** Prediction category */
  readonly type: PredictionType;
  /** Predicted value or action label */
  readonly value: string;
  /** Confidence 0-1 */
  readonly confidence: number;
  /** Human-readable reasoning */
  readonly reasoning: string;
  /** Context data that informed the prediction */
  readonly context: Readonly<Record<string, unknown>>;
  /** ISO-8601 timestamp when predicted */
  readonly predictedAt: Timestamp;
}

// ── Habit Types ────────────────────────────────────────────────

/**
 * Frequency pattern for a detected habit.
 */
export enum HabitFrequency {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Weekday = 'Weekday',
  Weekend = 'Weekend',
  Monthly = 'Monthly',
  Custom = 'Custom',
}

/**
 * A recurring behavioral pattern detected from user activity.
 */
export interface Habit {
  /** Unique habit identifier */
  readonly id: string;
  /** Short name */
  readonly name: string;
  /** Description of the habitual behavior */
  readonly description: string;
  /** How often the habit recurs */
  readonly frequency: HabitFrequency;
  /** Days of week the habit occurs; 0=Sun, 6=Sat */
  readonly daysOfWeek: readonly number[];
  /** Time of day in HH:MM, null if not time-bound */
  readonly timeOfDay: string | null;
  /** Activity that typically precedes the habit, null if none */
  readonly afterActivity: string | null;
  /** Detection confidence 0-1 */
  readonly confidence: number;
  /** Number of times this pattern has been observed */
  readonly observationCount: number;
  /** ISO-8601 timestamp of last observation, null if new */
  readonly lastObservedAt: string | null;
  /** ISO-8601 creation timestamp */
  readonly createdAt: Timestamp;
}

// ── Recommendation Types ───────────────────────────────────────

/**
 * Category of a personal recommendation.
 */
export enum RecommendationType {
  Action = 'Action',
  Learning = 'Learning',
  Reminder = 'Reminder',
  Optimization = 'Optimization',
  Automation = 'Automation',
  Knowledge = 'Knowledge',
  Focus = 'Focus',
  Health = 'Health',
}

/**
 * A suggestion generated for the user by the PIR.
 */
export interface PersonalRecommendation {
  /** Unique recommendation identifier */
  readonly id: string;
  /** Recommendation category */
  readonly type: RecommendationType;
  /** Short title */
  readonly title: string;
  /** Detailed description of the suggested action */
  readonly description: string;
  /** Why this recommendation was made */
  readonly reasoning: string;
  /** Confidence 0-1 */
  readonly confidence: number;
  /** Goal this recommendation advances, if any */
  readonly goalId: string | null;
  /** ISO-8601 expiry, null if no expiry */
  readonly expiresAt: string | null;
  /** Whether the user dismissed this recommendation */
  readonly dismissed: boolean;
  /** Whether the user accepted this recommendation */
  readonly accepted: boolean;
  /** ISO-8601 creation timestamp */
  readonly createdAt: Timestamp;
}

// ── Attention Types ────────────────────────────────────────────

/**
 * Current attentional state of the user.
 */
export enum AttentionState {
  Focused = 'Focused',
  Distracted = 'Distracted',
  Overloaded = 'Overloaded',
  Fatigued = 'Fatigued',
  ContextSwitching = 'ContextSwitching',
  Idle = 'Idle',
  Unknown = 'Unknown',
}

/**
 * A snapshot of the user's current attention state.
 */
export interface AttentionSnapshot {
  /** Current attentional state */
  readonly state: AttentionState;
  /** How long the user has been in their current focus bout (minutes) */
  readonly focusDuration: number;
  /** Number of context switches detected in the current session */
  readonly contextSwitches: number;
  /** Estimated cognitive load 0-100 */
  readonly cognitiveLoad: number;
  /** Number of distraction events detected */
  readonly distractionCount: number;
  /** Top-level activity the user is engaged in */
  readonly topActivity: string | null;
  /** ISO-8601 measurement timestamp */
  readonly measuredAt: Timestamp;
}

// ── Reflection Types ───────────────────────────────────────────

/**
 * Time period a reflection covers.
 */
export enum ReflectionPeriod {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
}

/**
 * A structured reflection on accomplishments, patterns, and improvements.
 */
export interface Reflection {
  /** Unique reflection identifier */
  readonly id: string;
  /** Time period covered */
  readonly period: ReflectionPeriod;
  /** ISO-8601 date of the reflected period */
  readonly date: string;
  /** What was accomplished during the period */
  readonly accomplished: readonly string[];
  /** What was planned but not accomplished */
  readonly notAccomplished: readonly string[];
  /** Changes made or needed */
  readonly changes: readonly string[];
  /** Behavioral or productivity patterns observed */
  readonly patterns: readonly string[];
  /** Suggested improvements for next period */
  readonly improvements: readonly string[];
  /** Overall productivity score 0-100 */
  readonly score: number;
  /** ISO-8601 creation timestamp */
  readonly createdAt: Timestamp;
}

// ── Learning Types ─────────────────────────────────────────────

/**
 * Mastery status of a learning item.
 */
export enum LearningStatus {
  New = 'New',
  Learning = 'Learning',
  Practicing = 'Practicing',
  Mastered = 'Mastered',
  Forgotten = 'Forgotten',
  Declining = 'Declining',
}

/**
 * A single topic or skill the user is learning.
 */
export interface LearningItem {
  /** Unique learning item identifier */
  readonly id: string;
  /** Topic or skill name */
  readonly topic: string;
  /** Current mastery status */
  readonly status: LearningStatus;
  /** Confidence 0-1 */
  readonly confidence: number;
  /** Number of deliberate practice sessions */
  readonly practiceCount: number;
  /** ISO-8601 timestamp of last practice, null if never practiced */
  readonly lastPracticedAt: string | null;
  /** ISO-8601 timestamp when first encountered */
  readonly firstSeenAt: Timestamp;
  /** Goal ids this learning item supports */
  readonly relatedGoals: readonly string[];
  /** Arbitrary extension metadata */
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * A directed graph of learning items and their relationships.
 */
export interface LearningGraph {
  /** All learning item nodes */
  readonly nodes: readonly LearningItem[];
  /** Directed edges between learning items */
  readonly edges: readonly LearningEdge[];
  /** ISO-8601 timestamp of last graph update */
  readonly updatedAt: Timestamp;
}

/**
 * A directed edge in the learning graph.
 */
export interface LearningEdge {
  /** Source learning item id */
  readonly from: string;
  /** Target learning item id */
  readonly to: string;
  /** Semantic relationship type */
  readonly relationType: 'prerequisite' | 'related' | 'applies_to';
}

// ── Decision Types ─────────────────────────────────────────────

/**
 * Structured method used to analyze a decision.
 */
export enum DecisionMethod {
  ProsCons = 'ProsCons',
  SWOT = 'SWOT',
  RiskAnalysis = 'RiskAnalysis',
  ScenarioAnalysis = 'ScenarioAnalysis',
  ExpectedOutcome = 'ExpectedOutcome',
  TradeOffs = 'TradeOffs',
}

/**
 * A structured decision the user is working through.
 */
export interface Decision {
  /** Unique decision identifier */
  readonly id: string;
  /** Short title */
  readonly title: string;
  /** Detailed description of the decision to be made */
  readonly description: string;
  /** Structured analysis method */
  readonly method: DecisionMethod;
  /** Options under consideration */
  readonly options: readonly DecisionOption[];
  /** Conclusion reached, null if unresolved */
  readonly conclusion: string | null;
  /** ISO-8601 creation timestamp */
  readonly createdAt: Timestamp;
  /** ISO-8601 resolution timestamp, null if unresolved */
  readonly resolvedAt: string | null;
}

/**
 * A single option within a decision analysis.
 */
export interface DecisionOption {
  /** Unique option identifier */
  readonly id: string;
  /** Short title */
  readonly title: string;
  /** Advantages of this option */
  readonly pros: readonly string[];
  /** Disadvantages of this option */
  readonly cons: readonly string[];
  /** Computed score, null if not yet scored */
  readonly score: number | null;
  /** Identified risks */
  readonly risks: readonly string[];
}

// ── Daily Types ────────────────────────────────────────────────

/**
 * Type of daily brief the assistant delivers.
 */
export enum BriefType {
  MorningBrief = 'MorningBrief',
  MiddayReview = 'MiddayReview',
  EveningSummary = 'EveningSummary',
  WeeklyReview = 'WeeklyReview',
  MonthlyReview = 'MonthlyReview',
}

/**
 * A curated brief delivered to the user at scheduled times.
 */
export interface DailyBrief {
  /** Unique brief identifier */
  readonly id: string;
  /** Type of brief */
  readonly type: BriefType;
  /** ISO-8601 date the brief covers */
  readonly date: string;
  /** Narrative summary */
  readonly summary: string;
  /** Key bullet points */
  readonly keyPoints: readonly string[];
  /** Goal references relevant to this brief */
  readonly goals: readonly GoalRef[];
  /** Active recommendations included in the brief */
  readonly recommendations: readonly PersonalRecommendation[];
  /** Predictions relevant to this brief */
  readonly predictions: readonly Prediction[];
  /** Named metrics and their values */
  readonly metrics: Readonly<Record<string, number>>;
  /** ISO-8601 creation timestamp */
  readonly createdAt: Timestamp;
}

// ── Assistant Types ────────────────────────────────────────────

/**
 * Current state of the personal assistant.
 */
export interface AssistantState {
  /** Whether the assistant is currently active */
  readonly active: boolean;
  /** User the assistant is serving, null if inactive */
  readonly userId: string | null;
  /** What the assistant believes the user is doing */
  readonly currentActivity: string | null;
  /** Summary of what happened yesterday */
  readonly yesterdaySummary: string | null;
  /** Plan for today */
  readonly todayPlan: string | null;
  /** Next action the assistant suggests */
  readonly nextSuggestedAction: string | null;
  /** Cached personal context snapshot */
  readonly context: PersonalContext | null;
  /** ISO-8601 timestamp of last state update */
  readonly updatedAt: Timestamp;
}

// ── PIR Config ─────────────────────────────────────────────────

/**
 * Configuration options for the Personal Intelligence Runtime.
 */
export interface PersonalRuntimeConfig {
  /** User id to operate on behalf of */
  readonly userId?: string;
  /** Enable prediction subsystem */
  readonly enablePredictions?: boolean;
  /** Enable reflection subsystem */
  readonly enableReflections?: boolean;
  /** Enable daily brief subsystem */
  readonly enableDailyBriefs?: boolean;
  /** Maximum number of goals allowed */
  readonly maxGoals?: number;
  /** Maximum number of plans allowed */
  readonly maxPlans?: number;
  /** Maximum number of habits tracked */
  readonly maxHabits?: number;
  /** Maximum number of active recommendations */
  readonly maxRecommendations?: number;
  /** Time of day to trigger reflection in HH:MM */
  readonly reflectionTime?: string;
  /** Time of day to deliver morning brief in HH:MM */
  readonly morningBriefTime?: string;
}
