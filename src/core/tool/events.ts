/**
 * Tool Events — Domain events for Tool lifecycle.
 *
 * Published via Event Bus (ADR-002).
 * All events extend DomainEventBase.
 *
 * Conforms to: AIS-003C.000 Requirement #9 (Tool Events)
 *   - ToolRegistered
 *   - ToolLoaded
 *   - ToolStarted
 *   - ToolFinished
 *   - ToolFailed
 *   - ToolDisposed
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import type { ToolLifecycleState } from './types.js';

// ─── ToolRegistered ─────────────────────────────────────────
export interface ToolRegistered extends DomainEventBase {
  readonly eventType: 'ToolRegistered';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly toolName: string;
    readonly version: string;
    readonly capabilities: readonly string[];
    readonly trustLevel: string;
    readonly registeredAt: Timestamp;
  };
}

// ─── ToolValidated ──────────────────────────────────────────
export interface ToolValidated extends DomainEventBase {
  readonly eventType: 'ToolValidated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly toolName: string;
    readonly version: string;
    readonly valid: boolean;
    readonly errors: readonly string[];
    readonly validatedAt: Timestamp;
  };
}

// ─── ToolLoaded ─────────────────────────────────────────────
export interface ToolLoaded extends DomainEventBase {
  readonly eventType: 'ToolLoaded';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly toolName: string;
    readonly version: string;
    readonly loadedAt: Timestamp;
  };
}

// ─── ToolStarted ─────────────────────────────────────────────
export interface ToolStarted extends DomainEventBase {
  readonly eventType: 'ToolStarted';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly toolName: string;
    readonly executionId: string;
    readonly action: string;
    readonly startedAt: Timestamp;
  };
}

// ─── ToolFinished ────────────────────────────────────────────
export interface ToolFinished extends DomainEventBase {
  readonly eventType: 'ToolFinished';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly toolName: string;
    readonly executionId: string;
    readonly success: boolean;
    readonly durationMs: number;
    readonly finishedAt: Timestamp;
    readonly error?: { readonly code: string; readonly message: string };
  };
}

// ─── ToolFailed ──────────────────────────────────────────────
export interface ToolFailed extends DomainEventBase {
  readonly eventType: 'ToolFailed';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly toolName: string;
    readonly executionId: string;
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly attempt: number;
    readonly retryable: boolean;
    readonly failedAt: Timestamp;
  };
}

// ─── ToolDisposed ────────────────────────────────────────────
export interface ToolDisposed extends DomainEventBase {
  readonly eventType: 'ToolDisposed';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly toolName: string;
    readonly disposedAt: Timestamp;
  };
}

// ─── ToolStateChange ─────────────────────────────────────────
export interface ToolStateChange extends DomainEventBase {
  readonly eventType: 'ToolStateChange';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly toolName: string;
    readonly previousState: ToolLifecycleState;
    readonly newState: ToolLifecycleState;
    readonly timestamp: Timestamp;
  };
}

// ─── Union type ──────────────────────────────────────────────
export type ToolEvent =
  | ToolRegistered
  | ToolValidated
  | ToolLoaded
  | ToolStarted
  | ToolFinished
  | ToolFailed
  | ToolDisposed
  | ToolStateChange;

/**
 * Create a tool event envelope helper.
 * Used by ToolRuntime to publish consistent events.
 */
export function createToolEventBase(
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
    aggregateType: 'Tool',
  };
}
