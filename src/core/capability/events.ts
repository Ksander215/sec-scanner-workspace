/**
 * Capability Runtime — Domain Events
 * TASK-AIS-003G.000
 *
 * Events published by the capability runtime following ADR-002 (Event Bus).
 * All events extend DomainEventBase and carry typed payloads.
 * INV-012: No domain event without a classification.
 *
 * Conforms to: ADR-002 (Event Bus), ARC-001.001 FP-07
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';

// ─── CapabilityInstalled ─────────────────────────────────────
export interface CapabilityInstalled extends DomainEventBase {
  readonly eventType: 'CapabilityInstalled';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly packId: string;
    readonly name: string;
    readonly version: string;
    readonly trustLevel: string;
    readonly installedAt: Timestamp;
  };
}

// ─── CapabilityLoaded ─────────────────────────────────────────
export interface CapabilityLoaded extends DomainEventBase {
  readonly eventType: 'CapabilityLoaded';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly packId: string;
    readonly name: string;
    readonly loadedAt: Timestamp;
  };
}

// ─── CapabilityValidated ──────────────────────────────────────
export interface CapabilityValidated extends DomainEventBase {
  readonly eventType: 'CapabilityValidated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly packId: string;
    readonly name: string;
    readonly valid: boolean;
    readonly issues: readonly string[];
    readonly validatedAt: Timestamp;
  };
}

// ─── CapabilityActivated ─────────────────────────────────────
export interface CapabilityActivated extends DomainEventBase {
  readonly eventType: 'CapabilityActivated';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly packId: string;
    readonly name: string;
    readonly capabilities: readonly string[];
    readonly activatedAt: Timestamp;
  };
}

// ─── CapabilityDisabled ───────────────────────────────────────
export interface CapabilityDisabled extends DomainEventBase {
  readonly eventType: 'CapabilityDisabled';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly packId: string;
    readonly name: string;
    readonly reason: string;
    readonly disabledAt: Timestamp;
  };
}

// ─── CapabilityRemoved ────────────────────────────────────────
export interface CapabilityRemoved extends DomainEventBase {
  readonly eventType: 'CapabilityRemoved';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly packId: string;
    readonly name: string;
    readonly removedAt: Timestamp;
  };
}

// ─── CapabilityUpdated ───────────────────────────────────────
export interface CapabilityUpdated extends DomainEventBase {
  readonly eventType: 'CapabilityUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly packId: string;
    readonly name: string;
    readonly previousVersion: string;
    readonly newVersion: string;
    readonly updatedAt: Timestamp;
  };
}

// ─── CapabilityError ─────────────────────────────────────────
export interface CapabilityErrorEvent extends DomainEventBase {
  readonly eventType: 'CapabilityError';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly packId: string;
    readonly name: string;
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly errorDetails: readonly string[];
    readonly occurredAt: Timestamp;
  };
}

// ─── CapabilityDependencyFailed ───────────────────────────────
export interface CapabilityDependencyFailed extends DomainEventBase {
  readonly eventType: 'CapabilityDependencyFailed';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly packId: string;
    readonly name: string;
    readonly missingDependencies: readonly string[];
    readonly cycles: readonly string[];
    readonly conflicts: readonly string[];
    readonly failedAt: Timestamp;
  };
}

// ─── CapabilityCompatibilityFailed ───────────────────────────
export interface CapabilityCompatibilityFailed extends DomainEventBase {
  readonly eventType: 'CapabilityCompatibilityFailed';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly packId: string;
    readonly name: string;
    readonly issues: readonly string[];
    readonly failedAt: Timestamp;
  };
}

// ─── CapabilityStateChanged ─────────────────────────────────
export interface CapabilityStateChanged extends DomainEventBase {
  readonly eventType: 'CapabilityStateChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly packId: string;
    readonly name: string;
    readonly fromState: string;
    readonly toState: string;
    readonly changedAt: Timestamp;
  };
}

// ─── CapabilitySandboxViolation ──────────────────────────────
export interface CapabilitySandboxViolationEvent extends DomainEventBase {
  readonly eventType: 'CapabilitySandboxViolation';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly packId: string;
    readonly action: string;
    readonly resource: string;
    readonly reason: string;
    readonly occurredAt: Timestamp;
  };
}

// ─── Union type ──────────────────────────────────────────────
export type CapabilityEvent =
  | CapabilityInstalled
  | CapabilityLoaded
  | CapabilityValidated
  | CapabilityActivated
  | CapabilityDisabled
  | CapabilityRemoved
  | CapabilityUpdated
  | CapabilityErrorEvent
  | CapabilityDependencyFailed
  | CapabilityCompatibilityFailed
  | CapabilityStateChanged
  | CapabilitySandboxViolationEvent;

/**
 * Create a capability event base helper.
 * Used by CapabilityRuntime to publish consistent events.
 */
export function createCapabilityEventBase(
  eventType: string,
  classification: EventClassification,
  aggregateId: string,
): { eventId: string; eventType: string; classification: EventClassification; timestamp: string; aggregateId: string; aggregateType: string } {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    classification,
    timestamp: new Date().toISOString(),
    aggregateId,
    aggregateType: 'Capability',
  };
}
