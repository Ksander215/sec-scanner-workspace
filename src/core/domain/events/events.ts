/**
 * AIS Domain Events — DOM-002.000 §6
 * All 13 domain events with typed payloads.
 * Each event extends DomainEventBase.
 */

import type { DomainEventBase } from './domain-event.js';
import type { Timestamp, Identifier } from '../../types/common.js';
import { EventClassification } from '../../types/common.js';

// ─── Event 1: UserActionRecorded ─────────────────────────────
// Producer: User Aggregate
// Consumers: User Agg (profile update), Trust Agg (factor generation)
export interface UserActionRecorded extends DomainEventBase {
  readonly eventType: 'UserActionRecorded';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly actionId: Identifier;
    readonly profileId: Identifier;
    readonly actionType: string;
    readonly target: string;
    readonly timestamp: Timestamp;
    readonly classification: string;
  };
}

// ─── Event 2: ProfileUpdated ──────────────────────────────────
// Producer: User Aggregate
// Consumers: Communication Agg, Intelligence Agg
export interface ProfileUpdated extends DomainEventBase {
  readonly eventType: 'ProfileUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly profileId: Identifier;
    readonly changedAttributes: readonly string[];
    readonly timestamp: Timestamp;
    readonly version: number;
  };
}

// ─── Event 3: ConfidenceCalculated ──────────────────────────
// Producer: Intelligence Aggregate
// Consumers: Communication Agg
export interface ConfidenceCalculated extends DomainEventBase {
  readonly eventType: 'ConfidenceCalculated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly resultId: Identifier;
    readonly predictionId: Identifier;
    readonly contextId: Identifier;
    readonly score: number;
    readonly level: string;
    readonly narrative: string;
    readonly role: string;
    readonly timestamp: Timestamp;
  };
}

// ─── Event 4: PredictionGenerated ───────────────────────────
// Producer: Intelligence Aggregate
// Consumers: Intelligence Agg (triggers ConfidenceResult calculation)
export interface PredictionGenerated extends DomainEventBase {
  readonly eventType: 'PredictionGenerated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly predictionId: Identifier;
    readonly contextId: Identifier;
    readonly predictedNeed: string;
    readonly confidence: number;
    readonly actions: readonly string[];
    readonly timestamp: Timestamp;
  };
}

// ─── Event 5: NotificationCreated ──────────────────────────
// Producer: Communication Aggregate
// Consumers: User Agg, audit pipeline
export interface NotificationCreated extends DomainEventBase {
  readonly eventType: 'NotificationCreated';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly notificationId: Identifier;
    readonly type: string;
    readonly content: string;
    readonly profileId: Identifier;
    readonly contextId: Identifier;
    readonly confidenceResultId: Identifier;
    readonly createdAt: Timestamp;
  };
}

// ─── Event 6: NotificationDisplayed ───────────────────────────
// Producer: Communication Aggregate
// Consumers: audit pipeline
export interface NotificationDisplayed extends DomainEventBase {
  readonly eventType: 'NotificationDisplayed';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly notificationId: Identifier;
    readonly displayedAt: Timestamp;
  };
}

// ─── Event 7: NotificationDismissed ──────────────────────────
// Producer: Communication Aggregate
// Consumers: User Agg, Trust Agg
export interface NotificationDismissed extends DomainEventBase {
  readonly eventType: 'NotificationDismissed';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly notificationId: Identifier;
    readonly dismissedAt: Timestamp;
    readonly reason: string;
    readonly profileId: Identifier;
  };
}

// ─── Event 8: NotificationExpired ────────────────────────────
// Producer: Communication Aggregate
// Consumers: audit pipeline
export interface NotificationExpired extends DomainEventBase {
  readonly eventType: 'NotificationExpired';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly notificationId: Identifier;
    readonly expiredAt: Timestamp;
    readonly displayDuration: number;
  };
}

// ─── Event 9: PluginLoaded ──────────────────────────────────
// Producer: Plugin Aggregate
// Consumers: Trust Agg, audit pipeline
export interface PluginLoaded extends DomainEventBase {
  readonly eventType: 'PluginLoaded';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly manifestId: Identifier;
    readonly pluginName: string;
    readonly version: string;
    readonly capabilities: readonly string[];
    readonly trustZone: string;
    readonly registeredAt: Timestamp;
  };
}

// ─── Event 10: PluginUnloaded ────────────────────────────────
// Producer: Plugin Aggregate
// Consumers: Trust Agg, audit pipeline
export interface PluginUnloaded extends DomainEventBase {
  readonly eventType: 'PluginUnloaded';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly manifestId: Identifier;
    readonly pluginName: string;
    readonly reason: string;
    readonly unloadedAt: Timestamp;
  };
}

// ─── Event 11: ProviderCreated ───────────────────────────────
// Producer: Provider Aggregate
// Consumers: Trust Agg, audit pipeline
export interface ProviderCreated extends DomainEventBase {
  readonly eventType: 'ProviderCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly providerId: Identifier;
    readonly type: string;
    readonly name: string;
    readonly endpoint: string;
    readonly capabilities: readonly string[];
  };
}

// ─── Event 12: SessionStarted ───────────────────────────────
// Producer: User Aggregate
// Consumers: Intelligence Agg, Communication Agg
export interface SessionStarted extends DomainEventBase {
  readonly eventType: 'SessionStarted';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly contextId: Identifier;
    readonly profileId: Identifier;
    readonly sessionStart: Timestamp;
    readonly environment: Record<string, unknown>;
  };
}

// ─── Event 13: SessionEnded ─────────────────────────────────
// Producer: User Aggregate
// Consumers: Intelligence Agg, Communication Agg
export interface SessionEnded extends DomainEventBase {
  readonly eventType: 'SessionEnded';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly contextId: Identifier;
    readonly profileId: Identifier;
    readonly sessionEnd: Timestamp;
    readonly duration: number;
    readonly actionCount: number;
  };
}

// ─── Union type ───────────────────────────────────────────────
export type DomainEvent =
  | UserActionRecorded
  | ProfileUpdated
  | ConfidenceCalculated
  | PredictionGenerated
  | NotificationCreated
  | NotificationDisplayed
  | NotificationDismissed
  | NotificationExpired
  | PluginLoaded
  | PluginUnloaded
  | ProviderCreated
  | SessionStarted
  | SessionEnded;
