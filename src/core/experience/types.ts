/**
 * Experience Runtime — Core Types
 * TASK-AIS-004A.000
 *
 * Branded identifiers, DTOs, enums, and value objects for the Experience Runtime.
 * All types are immutable. Conforms to: DOM-002, ADR-014, CON-001
 */

import type { Identifier, Timestamp } from '../types/common.js';

// ─── Branded Identifiers ─────────────────────────────────────

/** Branded type for Experience Session identity */
export type ExperienceSessionId = Identifier & { readonly __brand: 'ExperienceSessionId' };

/** Branded type for Behavior Event identity */
export type BehaviorEventId = Identifier & { readonly __brand: 'BehaviorEventId' };

/** Branded type for Preference identity */
export type PreferenceId = Identifier & { readonly __brand: 'PreferenceId' };

/** Branded type for Habit identity */
export type HabitId = Identifier & { readonly __brand: 'HabitId' };

/** Branded type for Adaptation identity */
export type AdaptationId = Identifier & { readonly __brand: 'AdaptationId' };

/** Branded type for Recommendation identity */
export type RecommendationId = Identifier & { readonly __brand: 'RecommendationId' };

/** Branded type for Experience Node identity (graph) */
export type ExperienceNodeId = Identifier & { readonly __brand: 'ExperienceNodeId' };

/** Branded type for Profile identity */
export type ProfileId = Identifier & { readonly __brand: 'ProfileId' };

/** Branded type for Context identity */
export type ContextId = Identifier & { readonly __brand: 'ContextId' };

/** Branded type for Snapshot identity */
export type SnapshotId = Identifier & { readonly __brand: 'SnapshotId' };

/** Branded type for Consent Record identity */
export type ConsentRecordId = Identifier & { readonly __brand: 'ConsentRecordId' };

/** Branded type for Observation identity */
export type ObservationId = Identifier & { readonly __brand: 'ObservationId' };

/** Branded type for Explainability Record identity */
export type ExplainabilityId = Identifier & { readonly __brand: 'ExplainabilityId' };

/** Branded type for Learning Checkpoint identity */
export type LearningCheckpointId = Identifier & { readonly __brand: 'LearningCheckpointId' };

// ─── Experience Runtime State (FSM) ──────────────────────────

/**
 * Experience Runtime FSM states.
 * Created → Learning → Observing → Adapting → Stable → Relearning → Archived
 */
export enum ExperienceState {
  Created = 'Created',
  Learning = 'Learning',
  Observing = 'Observing',
  Adapting = 'Adapting',
  Stable = 'Stable',
  Relearning = 'Relearning',
  Archived = 'Archived',
}

// ─── Behavior Event Types ─────────────────────────────────────

/** Types of behavioral events the system collects */
export enum BehaviorEventType {
  FeatureUsed = 'FeatureUsed',
  InteractionMode = 'InteractionMode',
  SessionDuration = 'SessionDuration',
  ActionRepetition = 'ActionRepetition',
  TimeOfDayActivity = 'TimeOfDayActivity',
  NavigationPattern = 'NavigationPattern',
  ContentConsumption = 'ContentConsumption',
  ErrorEncountered = 'ErrorEncountered',
  FeedbackProvided = 'FeedbackProvided',
  ToolUsed = 'ToolUsed',
}

/** Anonymized behavioral event */
export interface BehaviorEvent {
  readonly id: BehaviorEventId;
  readonly type: BehaviorEventType;
  readonly userIdHash: string;
  readonly sessionId: string;
  readonly timestamp: Timestamp;
  readonly data: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ─── Preference ─────────────────────────────────────────────

/** Current preference state */
export enum PreferenceState {
  Emerging = 'Emerging',
  Established = 'Established',
  Changing = 'Changing',
  Deprecated = 'Deprecated',
}

/** A tracked preference with statistical evidence */
export interface Preference {
  readonly id: PreferenceId;
  readonly userIdHash: string;
  readonly key: string;
  readonly currentValue: string;
  readonly previousValue?: string;
  readonly state: PreferenceState;
  readonly confidence: number; // 0.0–1.0
  readonly observationCount: number;
  readonly firstObserved: Timestamp;
  readonly lastUpdated: Timestamp;
  readonly provenance: readonly ObservationId[];
}

/** A change in preference with statistical evidence */
export interface PreferenceChange {
  readonly preferenceId: PreferenceId;
  readonly fromValue: string;
  readonly toValue: string;
  readonly confidence: number;
  readonly observationCount: number;
  readonly timestamp: Timestamp;
}

// ─── Habit ───────────────────────────────────────────────────

/** Habit periodicity */
export enum HabitPeriodicity {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Project = 'Project',
  Professional = 'Professional',
  AdHoc = 'AdHoc',
}

/** Habit strength classification */
export enum HabitStrength {
  Weak = 'Weak',
  Moderate = 'Moderate',
  Strong = 'Strong',
  Core = 'Core',
}

/** A detected habit pattern */
export interface Habit {
  readonly id: HabitId;
  readonly userIdHash: string;
  readonly name: string;
  readonly description: string;
  readonly periodicity: HabitPeriodicity;
  readonly strength: HabitStrength;
  readonly frequency: number;
  readonly lastObserved: Timestamp;
  readonly firstDetected: Timestamp;
  readonly observationCount: number;
  readonly pattern: Readonly<Record<string, unknown>>;
}

// ─── Adaptation ───────────────────────────────────────────────

/** Adaptation state */
export enum AdaptationState {
  Proposed = 'Proposed',
  Applied = 'Applied',
  Reverted = 'Reverted',
  Expired = 'Expired',
}

/** Types of adaptations the platform can make */
export enum AdaptationType {
  ResponseStyle = 'ResponseStyle',
  ExplanationDepth = 'ExplanationDepth',
  InformationFormat = 'InformationFormat',
  ProactivityLevel = 'ProactivityLevel',
  ComplexityLevel = 'ComplexityLevel',
  ToneAdjustment = 'ToneAdjustment',
}

/** A reversible adaptation */
export interface Adaptation {
  readonly id: AdaptationId;
  readonly type: AdaptationType;
  readonly userIdHash: string;
  readonly previousValue: string;
  readonly newValue: string;
  readonly state: AdaptationState;
  readonly reason: string;
  readonly evidence: readonly ObservationId[];
  readonly appliedAt?: Timestamp;
  readonly revertedAt?: Timestamp;
  readonly expiresAt?: Timestamp;
  readonly confidence: number;
}

// ─── Recommendation ──────────────────────────────────────────

/** Recommendation types */
export enum RecommendationType {
  Workflow = 'Workflow',
  CapabilityPack = 'CapabilityPack',
  KnowledgePack = 'KnowledgePack',
  Automation = 'Automation',
  Feature = 'Feature',
  Optimization = 'Optimization',
}

/** Recommendation state */
export enum RecommendationState {
  Generated = 'Generated',
  Presented = 'Presented',
  Accepted = 'Accepted',
  Dismissed = 'Dismissed',
  Expired = 'Expired',
}

/** A non-intrusive recommendation */
export interface Recommendation {
  readonly id: RecommendationId;
  readonly type: RecommendationType;
  readonly userIdHash: string;
  readonly title: string;
  readonly description: string;
  readonly state: RecommendationState;
  readonly confidence: number;
  readonly evidence: readonly ObservationId[];
  readonly generatedAt: Timestamp;
  readonly presentedAt?: Timestamp;
  readonly resolvedAt?: Timestamp;
}

// ─── Experience Graph ─────────────────────────────────────────

/** Node types in the experience graph */
export enum ExperienceNodeType {
  User = 'User',
  Habit = 'Habit',
  Preference = 'Preference',
  Goal = 'Goal',
  Project = 'Project',
  Domain = 'Domain',
  Skill = 'Skill',
  Context = 'Context',
}

/** Edge relationship types */
export enum ExperienceEdgeType {
  HasHabit = 'HasHabit',
  HasPreference = 'HasPreference',
  PursuesGoal = 'PursuesGoal',
  WorksOnProject = 'WorksOnProject',
  HasSkill = 'HasSkill',
  InDomain = 'InDomain',
  InContext = 'InContext',
  RelatedTo = 'RelatedTo',
  InfluencedBy = 'InfluencedBy',
}

/** A node in the experience graph */
export interface ExperienceNode {
  readonly id: ExperienceNodeId;
  readonly type: ExperienceNodeType;
  readonly userIdHash: string;
  readonly label: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/** An edge in the experience graph */
export interface ExperienceEdge {
  readonly id: Identifier;
  readonly sourceId: ExperienceNodeId;
  readonly targetId: ExperienceNodeId;
  readonly type: ExperienceEdgeType;
  readonly weight: number;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly createdAt: Timestamp;
}

// ─── Personalization Profiles ─────────────────────────────────

/** Built-in profile types */
export enum BuiltInProfileType {
  Work = 'Work',
  Home = 'Home',
  Study = 'Study',
  Research = 'Research',
}

/** Profile activation mode */
export enum ProfileActivationMode {
  Manual = 'Manual',
  Auto = 'Auto',
  Policy = 'Policy',
}

/** A personalization profile */
export interface PersonalizationProfile {
  readonly id: ProfileId;
  readonly userIdHash: string;
  readonly name: string;
  readonly type: BuiltInProfileType | string;
  readonly activationMode: ProfileActivationMode;
  readonly isActive: boolean;
  readonly preferences: Readonly<Record<string, string>>;
  readonly adaptations: readonly AdaptationId[];
  readonly habits: readonly HabitId[];
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

// ─── Context Switching ───────────────────────────────────────

/** A detectable context */
export interface ExperienceContext {
  readonly id: ContextId;
  readonly userIdHash: string;
  readonly name: string;
  readonly description: string;
  readonly indicators: Readonly<ReadonlyArray<string>>;
  readonly confidence: number;
  readonly isActive: boolean;
  readonly activatedAt?: Timestamp;
  readonly deactivatedAt?: Timestamp;
}

// ─── Observation ─────────────────────────────────────────────

/** An observation is the atomic unit of evidence */
export interface Observation {
  readonly id: ObservationId;
  readonly userIdHash: string;
  readonly type: string;
  readonly value: unknown;
  readonly timestamp: Timestamp;
  readonly source: string;
  readonly confidence: number;
}

// ─── Snapshot ────────────────────────────────────────────────

/** A point-in-time snapshot of user experience state */
export interface ExperienceSnapshot {
  readonly id: SnapshotId;
  readonly userIdHash: string;
  readonly timestamp: Timestamp;
  readonly version: number;
  readonly preferences: readonly Preference[];
  readonly habits: readonly Habit[];
  readonly adaptations: readonly Adaptation[];
  readonly recommendations: readonly Recommendation[];
  readonly activeProfileId?: ProfileId;
  readonly activeContextId?: ContextId;
  readonly state: ExperienceState;
  readonly metrics: Readonly<Record<string, number>>;
}

// ─── Consent ─────────────────────────────────────────────────

/** Consent modes */
export enum ConsentMode {
  Disabled = 'Disabled',
  Ask = 'Ask',
  Auto = 'Auto',
}

/** Consent scope — what type of change requires consent */
export enum ConsentScope {
  Adaptation = 'Adaptation',
  Recommendation = 'Recommendation',
  ProfileSwitch = 'ProfileSwitch',
  DataCollection = 'DataCollection',
  DataExport = 'DataExport',
  ContextDetection = 'ContextDetection',
}

/** A consent record */
export interface ConsentRecord {
  readonly id: ConsentRecordId;
  readonly userIdHash: string;
  readonly scope: ConsentScope;
  readonly mode: ConsentMode;
  readonly grantedAt: Timestamp;
  readonly expiresAt?: Timestamp;
  readonly revokedAt?: Timestamp;
  readonly isActive: boolean;
  readonly policyId?: string;
}

// ─── Explainability ─────────────────────────────────────────

/** An explainability record answers "why did this change?" */
export interface ExplainabilityRecord {
  readonly id: ExplainabilityId;
  readonly userIdHash: string;
  readonly targetId: Identifier;
  readonly targetType: string;
  readonly changeType: string;
  readonly reason: string;
  readonly observations: readonly ObservationId[];
  readonly confidence: number;
  readonly timestamp: Timestamp;
  readonly previousState: Readonly<Record<string, unknown>>;
  readonly newState: Readonly<Record<string, unknown>>;
}

// ─── Learning Checkpoint ─────────────────────────────────────

/** A periodic checkpoint in the learning process */
export interface LearningCheckpoint {
  readonly id: LearningCheckpointId;
  readonly userIdHash: string;
  readonly timestamp: Timestamp;
  readonly totalObservations: number;
  readonly totalAdaptations: number;
  readonly totalHabitsDetected: number;
  readonly preferenceStabilityScore: number;
  readonly personalizationLevel: number;
  readonly state: ExperienceState;
}

// ─── Metrics ──────────────────────────────────────────────────

/** Experience runtime metric keys */
export enum ExperienceMetricKey {
  AdaptationCount = 'adaptation_count',
  AdaptationAccepted = 'adaptation_accepted',
  AdaptationReverted = 'adaptation_reverted',
  RecommendationAccepted = 'recommendation_accepted',
  RecommendationDismissed = 'recommendation_dismissed',
  PreferenceStability = 'preference_stability',
  PersonalizationLevel = 'personalization_level',
  ContextDetectionAccuracy = 'context_detection_accuracy',
  AdaptationSpeed = 'adaptation_speed',
  HabitCount = 'habit_count',
  ObservationCount = 'observation_count',
  ProfileSwitchCount = 'profile_switch_count',
}

/** A metric data point */
export interface ExperienceMetric {
  readonly key: ExperienceMetricKey;
  readonly value: number;
  readonly timestamp: Timestamp;
  readonly tags: Readonly<Record<string, string>>;
}

// ─── Experience Policies ─────────────────────────────────────

/** Policy types for experience runtime */
export enum ExperiencePolicyType {
  Privacy = 'Privacy',
  Explainability = 'Explainability',
  AdaptationRate = 'AdaptationRate',
  RecommendationFrequency = 'RecommendationFrequency',
  LearningThreshold = 'LearningThreshold',
  Consent = 'Consent',
  DataRetention = 'DataRetention',
}

/** A policy configuration */
export interface ExperiencePolicy {
  readonly type: ExperiencePolicyType;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly isActive: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

// ─── Experience Config ───────────────────────────────────────

/** Configuration for the Experience Runtime */
export interface ExperienceRuntimeConfig {
  readonly learningThreshold: number;
  readonly adaptationRate: number;
  readonly maxRecommendationsPerSession: number;
  readonly snapshotIntervalMs: number;
  readonly maxObservationsPerUser: number;
  readonly defaultConsentMode: ConsentMode;
  readonly dataRetentionDays: number;
  readonly minHabitOccurrences: number;
  readonly minPreferenceConfidence: number;
  readonly contextDetectionWindowSize: number;
}

/** Default configuration values */
export const DefaultExperienceRuntimeConfig: ExperienceRuntimeConfig = {
  learningThreshold: 0.7,
  adaptationRate: 0.1,
  maxRecommendationsPerSession: 5,
  snapshotIntervalMs: 3600_000,
  maxObservationsPerUser: 10_000,
  defaultConsentMode: ConsentMode.Ask,
  dataRetentionDays: 365,
  minHabitOccurrences: 5,
  minPreferenceConfidence: 0.6,
  contextDetectionWindowSize: 10,
} as const;
