/**
 * Experience Runtime — Event Definitions
 * TASK-AIS-004A.000
 *
 * All experience domain events extending DomainEventBase pattern.
 * 10 event types as specified in the subsystem specification.
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { Identifier, Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';

// ─── Event 1: HabitDetected ────────────────────────────────
export interface HabitDetected extends DomainEventBase {
  readonly eventType: 'HabitDetected';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly habitId: Identifier;
    readonly userIdHash: string;
    readonly habitName: string;
    readonly periodicity: string;
    readonly strength: string;
    readonly observationCount: number;
    readonly detectedAt: Timestamp;
  };
}

// ─── Event 2: PreferenceChanged ──────────────────────────────
export interface PreferenceChanged extends DomainEventBase {
  readonly eventType: 'PreferenceChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly preferenceId: Identifier;
    readonly userIdHash: string;
    readonly preferenceKey: string;
    readonly fromValue: string;
    readonly toValue: string;
    readonly confidence: number;
    readonly observationCount: number;
    readonly changedAt: Timestamp;
  };
}

// ─── Event 3: AdaptationApplied ─────────────────────────────
export interface AdaptationApplied extends DomainEventBase {
  readonly eventType: 'AdaptationApplied';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly adaptationId: Identifier;
    readonly userIdHash: string;
    readonly adaptationType: string;
    readonly previousValue: string;
    readonly newValue: string;
    readonly confidence: number;
    readonly appliedAt: Timestamp;
    readonly reason: string;
  };
}

// ─── Event 4: AdaptationReverted ────────────────────────────
export interface AdaptationReverted extends DomainEventBase {
  readonly eventType: 'AdaptationReverted';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly adaptationId: Identifier;
    readonly userIdHash: string;
    readonly adaptationType: string;
    readonly revertedValue: string;
    readonly originalValue: string;
    readonly revertedAt: Timestamp;
    readonly reason: string;
  };
}

// ─── Event 5: RecommendationGenerated ──────────────────────
export interface RecommendationGenerated extends DomainEventBase {
  readonly eventType: 'RecommendationGenerated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly recommendationId: Identifier;
    readonly userIdHash: string;
    readonly recommendationType: string;
    readonly title: string;
    readonly confidence: number;
    readonly generatedAt: Timestamp;
  };
}

// ─── Event 6: ProfileActivated ───────────────────────────────
export interface ProfileActivated extends DomainEventBase {
  readonly eventType: 'ProfileActivated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly profileId: Identifier;
    readonly userIdHash: string;
    readonly profileName: string;
    readonly activationMode: string;
    readonly activatedAt: Timestamp;
  };
}

// ─── Event 7: ProfileSwitched ────────────────────────────────
export interface ProfileSwitched extends DomainEventBase {
  readonly eventType: 'ProfileSwitched';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly userIdHash: string;
    readonly fromProfileId: Identifier;
    readonly toProfileId: Identifier;
    readonly fromProfileName: string;
    readonly toProfileName: string;
    readonly switchedAt: Timestamp;
    readonly reason: string;
  };
}

// ─── Event 8: ContextChanged ─────────────────────────────────
export interface ContextChanged extends DomainEventBase {
  readonly eventType: 'ContextChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly contextId: Identifier;
    readonly userIdHash: string;
    readonly contextName: string;
    readonly fromContext?: string;
    readonly changedAt: Timestamp;
    readonly confidence: number;
  };
}

// ─── Event 9: LearningCheckpointCreated ──────────────────────
export interface LearningCheckpointCreated extends DomainEventBase {
  readonly eventType: 'LearningCheckpointCreated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly checkpointId: Identifier;
    readonly userIdHash: string;
    readonly totalObservations: number;
    readonly totalAdaptations: number;
    readonly totalHabitsDetected: number;
    readonly preferenceStabilityScore: number;
    readonly personalizationLevel: number;
    readonly state: string;
    readonly createdAt: Timestamp;
  };
}

// ─── Event 10: ExperienceStateChanged ────────────────────────
export interface ExperienceStateChanged extends DomainEventBase {
  readonly eventType: 'ExperienceStateChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly userIdHash: string;
    readonly fromState: string;
    readonly toState: string;
    readonly changedAt: Timestamp;
    readonly reason: string;
  };
}

// ─── Event 11: SnapshotCreated ───────────────────────────────
export interface SnapshotCreated extends DomainEventBase {
  readonly eventType: 'SnapshotCreated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly snapshotId: Identifier;
    readonly userIdHash: string;
    readonly version: number;
    readonly preferenceCount: number;
    readonly habitCount: number;
    readonly adaptationCount: number;
    readonly createdAt: Timestamp;
  };
}

// ─── Event 12: SnapshotRestored ──────────────────────────────
export interface SnapshotRestored extends DomainEventBase {
  readonly eventType: 'SnapshotRestored';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly snapshotId: Identifier;
    readonly userIdHash: string;
    readonly version: number;
    readonly restoredAt: Timestamp;
  };
}

// ─── Event 13: ConsentGranted ────────────────────────────────
export interface ConsentGranted extends DomainEventBase {
  readonly eventType: 'ConsentGranted';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly consentRecordId: Identifier;
    readonly userIdHash: string;
    readonly scope: string;
    readonly mode: string;
    readonly grantedAt: Timestamp;
  };
}

// ─── Event 14: ConsentRevoked ────────────────────────────────
export interface ConsentRevoked extends DomainEventBase {
  readonly eventType: 'ConsentRevoked';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly consentRecordId: Identifier;
    readonly userIdHash: string;
    readonly scope: string;
    readonly revokedAt: Timestamp;
    readonly reason: string;
  };
}

// ─── Event 15: ObservationRecorded ───────────────────────────
export interface ObservationRecorded extends DomainEventBase {
  readonly eventType: 'ObservationRecorded';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly observationId: Identifier;
    readonly userIdHash: string;
    readonly type: string;
    readonly source: string;
    readonly confidence: number;
    readonly recordedAt: Timestamp;
  };
}

// ─── Event 16: BehaviorEventCollected ────────────────────────
export interface BehaviorEventCollected extends DomainEventBase {
  readonly eventType: 'BehaviorEventCollected';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly eventId: Identifier;
    readonly userIdHash: string;
    readonly eventType: string;
    readonly sessionId: string;
    readonly collectedAt: Timestamp;
  };
}

// ─── Union type ──────────────────────────────────────────────
export type ExperienceEvent =
  | HabitDetected
  | PreferenceChanged
  | AdaptationApplied
  | AdaptationReverted
  | RecommendationGenerated
  | ProfileActivated
  | ProfileSwitched
  | ContextChanged
  | LearningCheckpointCreated
  | ExperienceStateChanged
  | SnapshotCreated
  | SnapshotRestored
  | ConsentGranted
  | ConsentRevoked
  | ObservationRecorded
  | BehaviorEventCollected;
