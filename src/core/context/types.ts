/**
 * Context Engine — Core Types
 * Branded identifiers and shared types for the Context subsystem.
 *
 * Conforms to: DOM-002.000, ARC-001.001 §5 (Module Architecture)
 */
import type { Identifier } from '../types/common.js';

/** Branded type for Context identity */
export type ContextId = Identifier & { readonly __brand: 'ContextId' };

/** Branded type for Context version */
export type ContextVersion = string & { readonly __brand: 'ContextVersion' };

/** Branded type for Snapshot identity */
export type SnapshotId = Identifier & { readonly __brand: 'SnapshotId' };

/** Context source enumeration — where context data originates. */
export enum ContextSource {
  Session = 'session',
  History = 'history',
  Knowledge = 'knowledge',
  ExecutionState = 'execution-state',
  Configuration = 'configuration',
  Runtime = 'runtime',
}

/** Priority levels for context entries (higher = more important). */
export enum ContextPriority {
  Critical = 100,
  High = 75,
  Normal = 50,
  Low = 25,
  Background = 10,
}

/** Unified context structure — the aggregated view of all sources. */
export interface UnifiedContext {
  readonly contextId: ContextId;
  readonly version: ContextVersion;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly entries: ReadonlyMap<string, ContextEntry>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly sizeBytes: number;
  readonly sessionId?: string;
  readonly executionId?: string;
}

/** A single context entry with metadata. */
export interface ContextEntry {
  readonly key: string;
  readonly value: unknown;
  readonly source: ContextSource;
  readonly priority: ContextPriority;
  readonly createdAt: string;
  readonly expiresAt?: string;
  readonly tags?: readonly string[];
}

/** Serializable context for persistence (Map → Array). */
export interface SerializableContext {
  readonly contextId: string;
  readonly version: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly entries: ReadonlyArray<{
    key: string;
    value: unknown;
    source: ContextSource;
    priority: ContextPriority;
    createdAt: string;
    expiresAt?: string;
    tags?: readonly string[];
  }>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly sizeBytes: number;
  readonly sessionId?: string;
  readonly executionId?: string;
}
