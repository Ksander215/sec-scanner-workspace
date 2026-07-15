/**
 * Scan Platform — Domain Events
 *
 * Immutable events emitted during scan lifecycle.
 * Follows the DomainEvent<T> contract from Platform API Architecture.
 * Pure interfaces — no runtime behavior.
 */

import type { ID, Metadata, Timestamp } from '../types/index.ts';

// ─── Base Event ────────────────────────────────────────────

/**
 * Base shape for all scan-platform events.
 * Aligned with Platform API Architecture's DomainEvent<T>.
 */
export interface ScanPlatformEvent {
  readonly id: ID;
  readonly type: string;
  readonly version: string;
  readonly timestamp: Timestamp;
  readonly correlationId: ID;
  readonly jobId: ID;
  readonly metadata?: Metadata;
}

// ─── Job Lifecycle Events ──────────────────────────────────

/** A scan job was created and queued. */
export interface ScanJobCreatedEvent extends ScanPlatformEvent {
  readonly type: 'scan.job.created';
  readonly data: {
    readonly targetId: ID;
    readonly engineIds: readonly string[];
    readonly triggerType: string;
  };
}

/** A scan job started executing. */
export interface ScanJobStartedEvent extends ScanPlatformEvent {
  readonly type: 'scan.job.started';
  readonly data: {
    readonly engineId: string;
  };
}

/** Periodic progress update from an engine. */
export interface ScanJobProgressEvent extends ScanPlatformEvent {
  readonly type: 'scan.job.progress';
  readonly data: {
    readonly engineId: string;
    readonly progress: number;       // 0–100
    readonly phase: string;          // e.g. "crawling", "testing", "fuzzing"
    readonly requestsCount?: number;
    readonly currentUrl?: string;
  };
}

/** A scan job completed successfully. */
export interface ScanJobCompletedEvent extends ScanPlatformEvent {
  readonly type: 'scan.job.completed';
  readonly data: {
    readonly engineId: string;
    readonly findingsCount: number;
    readonly durationMs: number;
    readonly scanResultId: ID;
  };
}

/** A scan job failed. */
export interface ScanJobFailedEvent extends ScanPlatformEvent {
  readonly type: 'scan.job.failed';
  readonly data: {
    readonly engineId: string;
    readonly error: string;
    readonly errorCode?: string;
    readonly retryable: boolean;
  };
}

/** A scan job was cancelled. */
export interface ScanJobCancelledEvent extends ScanPlatformEvent {
  readonly type: 'scan.job.cancelled';
  readonly data: {
    readonly reason?: string;
  };
}

// ─── Finding Events ────────────────────────────────────────

/** A vulnerability was detected during scanning. */
export interface FindingDetectedEvent extends ScanPlatformEvent {
  readonly type: 'scan.finding.detected';
  readonly data: {
    readonly findingId: ID;
    readonly title: string;
    readonly severity: string;
    readonly location: string;
  };
}

// ─── Engine Events ─────────────────────────────────────────

/** An engine was registered in the registry. */
export interface EngineRegisteredEvent extends ScanPlatformEvent {
  readonly type: 'engine.registered';
  readonly data: {
    readonly engineId: string;
    readonly engineName: string;
    readonly capabilities: readonly string[];
  };
}

/** An engine was unregistered from the registry. */
export interface EngineUnregisteredEvent extends ScanPlatformEvent {
  readonly type: 'engine.unregistered';
  readonly data: {
    readonly engineId: string;
  };
}

/** Engine health status changed. */
export interface EngineHealthChangedEvent extends ScanPlatformEvent {
  readonly type: 'engine.health.changed';
  readonly data: {
    readonly engineId: string;
    readonly previousStatus: string;
    readonly currentStatus: string;
  };
}

// ─── Union Type ────────────────────────────────────────────

/** All possible scan-platform event types. */
export type AnyScanPlatformEvent =
  | ScanJobCreatedEvent
  | ScanJobStartedEvent
  | ScanJobProgressEvent
  | ScanJobCompletedEvent
  | ScanJobFailedEvent
  | ScanJobCancelledEvent
  | FindingDetectedEvent
  | EngineRegisteredEvent
  | EngineUnregisteredEvent
  | EngineHealthChangedEvent;