/**
 * Personal Intelligence Capability Pack — Type Definitions
 * TASK-AIS-007A.000
 *
 * Core types for the 15 PI-Pack subsystems:
 *   1. Personal Intelligence Pack Runtime (orchestrator)
 *   2. Daily Brief Generator
 *   3. Reflection Engine
 *   4. Goal Planner
 *   5. Decision Advisor
 *   6. Constraint Analyzer
 *   7. Value Analyzer
 *   8. Recommendation Composer
 *   9. Knowledge Synthesizer
 *  10. Conversation Interpreter
 *  11. Habit Insights
 *  12. Priority Optimizer
 *  13. Personal Dashboard
 *  14. Metrics Runtime
 *  15. Trace Runtime
 *
 * All types are immutable. Conforms to: CON-001, DOM-002, ADR-014
 */

import type { Timestamp, Identifier } from '../types/common.js';

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

/** Branded type for Pack Brief identity */
export type PackBriefId = Identifier & { readonly __brand: 'PackBriefId' };

/** Branded type for Pack Reflection identity */
export type PackReflectionId = Identifier & { readonly __brand: 'PackReflectionId' };

/** Branded type for Pack Goal identity */
export type PackGoalId = Identifier & { readonly __brand: 'PackGoalId' };

/** Branded type for Pack Decision identity */
export type PackDecisionId = Identifier & { readonly __brand: 'PackDecisionId' };

/** Branded type for Pack Constraint identity */
export type PackConstraintId = Identifier & { readonly __brand: 'PackConstraintId' };

/** Branded type for Pack Value Assessment identity */
export type PackValueAssessmentId = Identifier & { readonly __brand: 'PackValueAssessmentId' };

/** Branded type for Pack Recommendation identity */
export type PackRecommendationId = Identifier & { readonly __brand: 'PackRecommendationId' };

/** Branded type for Pack Knowledge Node identity */
export type PackKnowledgeNodeId = Identifier & { readonly __brand: 'PackKnowledgeNodeId' };

/** Branded type for Pack Insight identity */
export type PackInsightId = Identifier & { readonly __brand: 'PackInsightId' };

/** Branded type for Pack Habit identity */
export type PackHabitId = Identifier & { readonly __brand: 'PackHabitId' };

/** Branded type for Pack Dashboard identity */
export type PackDashboardId = Identifier & { readonly __brand: 'PackDashboardId' };

/** Branded type for Pack Trace Span identity */
export type PackTraceSpanId = Identifier & { readonly __brand: 'PackTraceSpanId' };

/** Branded type for First Intelligence Session identity */
export type FirstIntelligenceSessionId = Identifier & { readonly __brand: 'FirstIntelligenceSessionId' };

// ═══════════════════════════════════════════════════════════════════
// PACK LIFECYCLE STATE (FSM)
// ═══════════════════════════════════════════════════════════════════

/**
 * Personal Intelligence Pack lifecycle states.
 * Created → Initializing → Active ↔ Onboarding → Ready → Suspended → Disabled
 */
export enum PackState {
  Created = 'Created',
  Initializing = 'Initializing',
  Active = 'Active',
  Onboarding = 'Onboarding',
  Ready = 'Ready',
  Suspended = 'Suspended',
  Disabled = 'Disabled',
}

// ═══════════════════════════════════════════════════════════════════
// DAILY BRIEF TYPES
// ═══════════════════════════════════════════════════════════════════

/** Type of daily brief */
export enum BriefType {
  MorningBrief = 'MorningBrief',
  MiddayReview = 'MiddayReview',
  EveningSummary = 'EveningSummary',
  WeeklyReview = 'WeeklyReview',
}

/** Priority classification for brief items */
export enum BriefPriority {
  Critical = 'Critical',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

/** A single item in a daily brief */
export interface BriefItem {
  readonly id: string;
  readonly category: BriefItemCategory;
  readonly title: string;
  readonly description: string;
  readonly priority: BriefPriority;
  readonly actionability: string;
  readonly goalId: string | null;
  readonly constraintId: string | null;
  readonly valueAssessmentId: string | null;
}

/** Categories of brief items */
export enum BriefItemCategory {
  Priority = 'Priority',
  Event = 'Event',
  IncompleteTask = 'IncompleteTask',
  Recommendation = 'Recommendation',
  Risk = 'Risk',
  Bottleneck = 'Bottleneck',
  Optimization = 'Optimization',
  Insight = 'Insight',
}

/** A complete daily brief */
export interface PackDailyBrief {
  readonly id: PackBriefId;
  readonly type: BriefType;
  readonly date: string;
  readonly items: readonly BriefItem[];
  readonly summary: string;
  readonly topPriority: string;
  readonly mainConstraint: string;
  readonly mainRecommendation: string;
  readonly productivityIndex: number;
  readonly developmentIndex: number;
  readonly createdAt: Timestamp;
  readonly deliveredAt: Timestamp | null;
}

// ═══════════════════════════════════════════════════════════════════
// REFLECTION TYPES
// ═══════════════════════════════════════════════════════════════════

/** Period a reflection covers */
export enum ReflectionPeriod {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
}

/** Sentiment classification for reflection */
export enum ReflectionSentiment {
  Positive = 'Positive',
  Neutral = 'Neutral',
  Negative = 'Negative',
  Mixed = 'Mixed',
}

/** A single reflection entry */
export interface PackReflection {
  readonly id: PackReflectionId;
  readonly period: ReflectionPeriod;
  readonly date: string;
  readonly accomplishments: readonly string[];
  readonly notAccomplished: readonly string[];
  readonly reasons: readonly string[];
  readonly lessonsLearned: readonly string[];
  readonly habitsStrengthened: readonly string[];
  readonly habitsToChange: readonly string[];
  readonly sentiment: ReflectionSentiment;
  readonly score: number;
  readonly highlights: readonly string[];
  readonly createdAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// GOAL PLANNER TYPES
// ═══════════════════════════════════════════════════════════════════

/** Hierarchical level of a goal */
export enum GoalLevel {
  Vision = 'Vision',
  Goals = 'Goals',
  Projects = 'Projects',
  Milestones = 'Milestones',
  Tasks = 'Tasks',
  Actions = 'Actions',
}

/** Lifecycle status of a goal */
export enum GoalStatus {
  Draft = 'Draft',
  Active = 'Active',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Paused = 'Paused',
  Cancelled = 'Cancelled',
}

/** A goal in the hierarchy (Vision → Goals → Projects → Milestones → Tasks → Actions) */
export interface PackGoal {
  readonly id: PackGoalId;
  readonly title: string;
  readonly description: string;
  readonly level: GoalLevel;
  readonly status: GoalStatus;
  readonly parentId: PackGoalId | null;
  readonly childrenIds: readonly PackGoalId[];
  readonly priority: number;
  readonly progress: number;
  readonly deadline: string | null;
  readonly tags: readonly string[];
  readonly constraintIds: readonly PackConstraintId[];
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly completedAt: Timestamp | null;
}

/** Input for creating a new goal */
export interface GoalCreateInput {
  readonly title: string;
  readonly description?: string;
  readonly level: GoalLevel;
  readonly parentId?: PackGoalId;
  readonly priority?: number;
  readonly deadline?: string;
  readonly tags?: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════
// DECISION ADVISOR TYPES
// ═══════════════════════════════════════════════════════════════════

/** Decision status */
export enum DecisionStatus {
  Draft = 'Draft',
  Analyzing = 'Analyzing',
  Resolved = 'Resolved',
  Rejected = 'Rejected',
  Expired = 'Expired',
}

/** A single option within a decision */
export interface DecisionOption {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly risks: readonly string[];
  readonly alternatives: readonly string[];
  readonly consequences: readonly string[];
  readonly score: number | null;
}

/** A structured decision analysis */
export interface PackDecision {
  readonly id: PackDecisionId;
  readonly title: string;
  readonly description: string;
  readonly status: DecisionStatus;
  readonly options: readonly DecisionOption[];
  readonly conclusion: string | null;
  readonly recommendation: string | null;
  readonly createdAt: Timestamp;
  readonly resolvedAt: Timestamp | null;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTRAINT ANALYZER TYPES (The Goal — TOC)
// ═══════════════════════════════════════════════════════════════════

/** Constraint severity levels per PHI-003.000 */
export enum ConstraintSeverity {
  Systemic = 'Systemic',
  Major = 'Major',
  Moderate = 'Moderate',
  Minor = 'Minor',
}

/** Constraint lifecycle per PHI-003.000 COM-LC */
export enum ConstraintLifecycle {
  Detected = 'Detected',
  Analyzed = 'Analyzed',
  ActionPlan = 'ActionPlan',
  Exploiting = 'Exploiting',
  Elevated = 'Elevated',
  Resolved = 'Resolved',
}

/** A detected constraint following The Goal (TOC) philosophy */
export interface PackConstraint {
  readonly id: PackConstraintId;
  readonly title: string;
  readonly description: string;
  readonly severity: ConstraintSeverity;
  readonly lifecycle: ConstraintLifecycle;
  readonly goalId: PackGoalId | null;
  readonly impact: string;
  readonly evidence: readonly string[];
  readonly actionSteps: readonly string[];
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly resolvedAt: Timestamp | null;
}

// ═══════════════════════════════════════════════════════════════════
// VALUE ANALYZER TYPES
// ═══════════════════════════════════════════════════════════════════

/** Value dimensions per PHI-002.000 VD-001..VD-008 */
export enum ValueDimension {
  UserValue = 'UserValue',
  EconomicValue = 'EconomicValue',
  KnowledgeValue = 'KnowledgeValue',
  SocialValue = 'SocialValue',
  CreativeValue = 'CreativeValue',
  OperationalValue = 'OperationalValue',
  StrategicValue = 'StrategicValue',
  EmotionalValue = 'EmotionalValue',
}

/** A value assessment explaining what value a recommendation creates */
export interface PackValueAssessment {
  readonly id: PackValueAssessmentId;
  readonly dimension: ValueDimension;
  readonly description: string;
  readonly reasons: readonly string[];
  readonly forWhom: string;
  readonly measurementCriteria: readonly string[];
  readonly expectedImpact: string;
  readonly confidence: number;
  readonly createdAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// RECOMMENDATION COMPOSER TYPES
// ═══════════════════════════════════════════════════════════════════

/** Recommendation chain stages — mandatory per spec */
export enum RecommendationStage {
  Understanding = 'Understanding',
  Value = 'Value',
  Constraint = 'Constraint',
  Optimization = 'Optimization',
  Explanation = 'Explanation',
  Recommendation = 'Recommendation',
}

/** Recommendation status */
export enum RecommendationStatus {
  Draft = 'Draft',
  Validated = 'Validated',
  Presented = 'Presented',
  Accepted = 'Accepted',
  Dismissed = 'Dismissed',
  Expired = 'Expired',
  Rejected = 'Rejected',
}

/** Why the recommendation is made (the four mandatory questions) */
export interface RecommendationWhy {
  readonly why: string;
  readonly whyNow: string;
  readonly whatValue: string;
  readonly whyMainConstraint: string;
}

/** A single stage in the recommendation chain */
export interface RecommendationChainStep {
  readonly stage: RecommendationStage;
  readonly completed: boolean;
  readonly data: Readonly<Record<string, unknown>>;
  readonly timestamp: Timestamp;
}

/** A fully composed recommendation passing all 6 mandatory stages */
export interface PackRecommendation {
  readonly id: PackRecommendationId;
  readonly title: string;
  readonly description: string;
  readonly why: RecommendationWhy;
  readonly chain: readonly RecommendationChainStep[];
  readonly valueAssessmentId: PackValueAssessmentId | null;
  readonly constraintId: PackConstraintId | null;
  readonly goalId: PackGoalId | null;
  readonly confidence: number;
  readonly status: RecommendationStatus;
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp | null;
  readonly presentedAt: Timestamp | null;
  readonly resolvedAt: Timestamp | null;
}

// ═══════════════════════════════════════════════════════════════════
// KNOWLEDGE SYNTHESIZER TYPES
// ═══════════════════════════════════════════════════════════════════

/** Edge relationship types in the personal knowledge graph */
export enum KnowledgeEdgeType {
  NotesTo = 'NotesTo',
  ConversationTo = 'ConversationTo',
  ProjectTo = 'ProjectTo',
  DecisionTo = 'DecisionTo',
  ConclusionTo = 'ConclusionTo',
  ExperienceTo = 'ExperienceTo',
  RelatedTo = 'RelatedTo',
  DependsOn = 'DependsOn',
  Contradicts = 'Contradicts',
  Supports = 'Supports',
}

/** Node types in the personal knowledge graph */
export enum KnowledgeNodeType {
  Note = 'Note',
  Conversation = 'Conversation',
  Project = 'Project',
  Decision = 'Decision',
  Conclusion = 'Conclusion',
  Experience = 'Experience',
  Concept = 'Concept',
  Question = 'Question',
  Insight = 'Insight',
}

/** A node in the personal knowledge graph */
export interface KnowledgeNode {
  readonly id: PackKnowledgeNodeId;
  readonly type: KnowledgeNodeType;
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly tags: readonly string[];
  readonly goalIds: readonly PackGoalId[];
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/** An edge in the personal knowledge graph */
export interface KnowledgeEdge {
  readonly id: string;
  readonly sourceId: PackKnowledgeNodeId;
  readonly targetId: PackKnowledgeNodeId;
  readonly type: KnowledgeEdgeType;
  readonly weight: number;
  readonly createdAt: Timestamp;
}

/** A synthesized knowledge view */
export interface KnowledgeSynthesis {
  readonly nodes: readonly KnowledgeNode[];
  readonly edges: readonly KnowledgeEdge[];
  readonly totalNodes: number;
  readonly totalEdges: number;
  readonly synthesizedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// CONVERSATION INTERPRETER TYPES
// ═══════════════════════════════════════════════════════════════════

/** Interpreted intent from user conversation */
export enum ConversationIntent {
  GoalSetting = 'GoalSetting',
  DecisionMaking = 'DecisionMaking',
  Reflection = 'Reflection',
  Information = 'Information',
  Planning = 'Planning',
  Feedback = 'Feedback',
  ConstraintExploration = 'ConstraintExploration',
  ValueInquiry = 'ValueInquiry',
  General = 'General',
}

/** An interpreted conversation turn */
export interface ConversationInterpretation {
  readonly id: string;
  readonly intent: ConversationIntent;
  readonly confidence: number;
  readonly entities: readonly ConversationEntity[];
  readonly goalIds: readonly PackGoalId[];
  readonly decisionIds: readonly PackDecisionId[];
  readonly constraintIds: readonly PackConstraintId[];
  readonly summary: string;
  readonly suggestedActions: readonly string[];
  readonly interpretedAt: Timestamp;
}

/** An extracted entity from conversation */
export interface ConversationEntity {
  readonly type: string;
  readonly value: string;
  readonly confidence: number;
}

// ═══════════════════════════════════════════════════════════════════
// HABIT INSIGHTS TYPES
// ═══════════════════════════════════════════════════════════════════

/** Habit strength classification */
export enum HabitStrength {
  Emerging = 'Emerging',
  Established = 'Established',
  Strong = 'Strong',
  Core = 'Core',
}

/** Habit direction */
export enum HabitDirection {
  Positive = 'Positive',
  Negative = 'Negative',
  Neutral = 'Neutral',
}

/** A detected habit with insights */
export interface PackHabit {
  readonly id: PackHabitId;
  readonly name: string;
  readonly description: string;
  readonly strength: HabitStrength;
  readonly direction: HabitDirection;
  readonly frequency: string;
  readonly pattern: string;
  readonly impact: string;
  readonly suggestion: string;
  readonly observationCount: number;
  readonly confidence: number;
  readonly createdAt: Timestamp;
  readonly lastObservedAt: Timestamp | null;
}

// ═══════════════════════════════════════════════════════════════════
// PRIORITY OPTIMIZER TYPES
// ═══════════════════════════════════════════════════════════════════

/** Scoring factors for priority optimization */
export interface PriorityFactors {
  readonly deadline: number;
  readonly importance: number;
  readonly urgency: number;
  readonly energy: number;
  readonly context: number;
  readonly dependencies: number;
  readonly risk: number;
  readonly value: number;
}

/** A computed priority score */
export interface PriorityScore {
  readonly goalId: PackGoalId;
  readonly totalScore: number;
  readonly factors: PriorityFactors;
  readonly rank: number;
  readonly calculatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// PERSONAL DASHBOARD TYPES
// ═══════════════════════════════════════════════════════════════════

/** A complete personal intelligence dashboard */
export interface PersonalDashboard {
  readonly id: PackDashboardId;
  readonly userId: string;
  readonly todaySummary: string;
  readonly topGoals: readonly PackGoal[];
  readonly nextActions: readonly string[];
  readonly mainConstraint: PackConstraint | null;
  readonly mainRecommendation: PackRecommendation | null;
  readonly recentInsights: readonly PackInsight[];
  readonly productivityIndex: number;
  readonly developmentIndex: number;
  readonly constraintCount: number;
  readonly recommendationCount: number;
  readonly goalCount: number;
  readonly habitCount: number;
  readonly createdAt: Timestamp;
}

/** A general insight card for the dashboard */
export interface PackInsight {
  readonly id: PackInsightId;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly confidence: number;
  readonly source: string;
  readonly createdAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// METRICS TYPES
// ═══════════════════════════════════════════════════════════════════

/** Pack-specific metric keys */
export enum PackMetricKey {
  BriefsGenerated = 'briefs_generated',
  ReflectionsGenerated = 'reflections_generated',
  GoalsCreated = 'goals_created',
  GoalsCompleted = 'goals_completed',
  DecisionsCreated = 'decisions_created',
  DecisionsResolved = 'decisions_resolved',
  ConstraintsDetected = 'constraints_detected',
  ConstraintsResolved = 'constraints_resolved',
  ValueAssessments = 'value_assessments',
  RecommendationsComposed = 'recommendations_composed',
  RecommendationsAccepted = 'recommendations_accepted',
  RecommendationsRejected = 'recommendations_rejected',
  KnowledgeNodesCreated = 'knowledge_nodes_created',
  KnowledgeEdgesCreated = 'knowledge_edges_created',
  ConversationsInterpreted = 'conversations_interpreted',
  HabitsDetected = 'habits_detected',
  PrioritiesCalculated = 'priorities_calculated',
  DashboardsGenerated = 'dashboards_generated',
  ProductivityIndex = 'productivity_index',
  DevelopmentIndex = 'development_index',
  RecommendationChainCompletion = 'recommendation_chain_completion',
}

/** A metric data point */
export interface PackMetric {
  readonly key: PackMetricKey;
  readonly value: number;
  readonly timestamp: Timestamp;
  readonly tags: Readonly<Record<string, string>>;
}

/** Summary of all pack metrics */
export interface PackMetricsSnapshot {
  readonly counters: Readonly<Record<string, number>>;
  readonly gauges: Readonly<Record<string, number>>;
  readonly trends: Readonly<Record<string, 'improving' | 'declining' | 'stable'>>;
  readonly exportedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// TRACE TYPES
// ═══════════════════════════════════════════════════════════════════

/** Trace span status */
export enum TraceStatus {
  Started = 'Started',
  Active = 'Active',
  Completed = 'Completed',
  Failed = 'Failed',
}

/** A trace span for pack operations */
export interface PackTraceSpan {
  readonly id: PackTraceSpanId;
  readonly parentId: PackTraceSpanId | null;
  readonly operation: string;
  readonly subsystem: string;
  readonly status: TraceStatus;
  readonly startTime: Timestamp;
  readonly endTime: Timestamp | null;
  readonly durationMs: number | null;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly events: readonly TraceEvent[];
}

/** An event within a trace span */
export interface TraceEvent {
  readonly name: string;
  readonly timestamp: Timestamp;
  readonly attributes: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// FIRST INTELLIGENCE EXPERIENCE TYPES
// ═══════════════════════════════════════════════════════════════════

/** Onboarding question for first intelligence */
export interface OnboardingQuestion {
  readonly id: string;
  readonly question: string;
  readonly category: OnboardingCategory;
  readonly required: boolean;
  readonly followUps: readonly string[];
}

/** Onboarding question categories */
export enum OnboardingCategory {
  Goals = 'Goals',
  CurrentProjects = 'CurrentProjects',
  Habits = 'Habits',
  Challenges = 'Challenges',
  Values = 'Values',
}

/** Initial user model built from onboarding answers */
export interface InitialUserModel {
  readonly sessionId: FirstIntelligenceSessionId;
  readonly answers: Readonly<Record<string, string>>;
  readonly extractedGoals: readonly string[];
  readonly extractedProjects: readonly string[];
  readonly extractedHabits: readonly string[];
  readonly extractedChallenges: readonly string[];
  readonly mainConstraint: string;
  readonly valueProposition: string;
  readonly firstActionStep: string;
  readonly createdAt: Timestamp;
}

/** The first intelligence report shown to the user */
export interface FirstIntelligenceReport {
  readonly sessionId: FirstIntelligenceSessionId;
  readonly userModel: InitialUserModel;
  readonly primaryInsight: string;
  readonly mainConstraint: PackConstraint;
  readonly valueProposition: string;
  readonly recommendedFirstStep: string;
  readonly generatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

/** Configuration for the Personal Intelligence Capability Pack */
export interface PersonalIntelligencePackConfig {
  readonly userId?: string;
  readonly maxGoals?: number;
  readonly maxDecisions?: number;
  readonly maxConstraints?: number;
  readonly maxRecommendations?: number;
  readonly maxKnowledgeNodes?: number;
  readonly maxHabits?: number;
  readonly maxBriefHistory?: number;
  readonly maxReflectionHistory?: number;
  readonly morningBriefTime?: string;
  readonly eveningReflectionTime?: string;
  readonly enableFirstIntelligence?: boolean;
  readonly recommendationTtlHours?: number;
  readonly maxBriefItems?: number;
  readonly maxInsightsOnDashboard?: number;
}

/** Default configuration values */
export const DefaultPersonalIntelligencePackConfig: PersonalIntelligencePackConfig = {
  maxGoals: 500,
  maxDecisions: 200,
  maxConstraints: 100,
  maxRecommendations: 200,
  maxKnowledgeNodes: 5000,
  maxHabits: 100,
  maxBriefHistory: 90,
  maxReflectionHistory: 90,
  morningBriefTime: '07:00',
  eveningReflectionTime: '21:00',
  enableFirstIntelligence: true,
  recommendationTtlHours: 168,
  maxBriefItems: 20,
  maxInsightsOnDashboard: 10,
} as const;
