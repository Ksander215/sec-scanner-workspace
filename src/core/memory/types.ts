/**
 * Memory Module — Type Definitions
 *
 * Defines the core types for the 3-tier Memory Runtime:
 *   Working Memory  — short-term, per-execution, cleared after execution
 *   Session Memory  — medium-term, per-session, persists during session lifetime
 *   Persistent Memory — long-term, cross-session, survives restarts
 *
 * Conforms to: ARC-001.001, DR-03 (Single Memory Authority)
 */
import type { Identifier } from '../types/common.js';

// ─── Branded Identifiers ──────────────────────────────────────

/** Branded type for memory entry identity */
export type MemoryEntryId = Identifier & { readonly __brand: 'MemoryEntryId' };

/** Memory layer discriminator */
export type MemoryLayer = 'working' | 'session' | 'persistent';

// ─── Core Interfaces ──────────────────────────────────────────

/**
 * A single entry stored in any memory layer.
 * Immutable — updates produce new entries with updated timestamps.
 */
export interface MemoryEntry {
  readonly id: MemoryEntryId;
  readonly key: string;
  readonly value: unknown;
  readonly layer: MemoryLayer;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt?: string;
  readonly accessCount: number;
  readonly lastAccessedAt?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly sessionId?: string;
  readonly executionId?: string;
}

/**
 * Serialization-safe representation of a MemoryEntry.
 * The branded id is widened to string for JSON round-trip safety.
 */
export interface SerializableMemoryEntry {
  readonly id: string;
  readonly key: string;
  readonly value: unknown;
  readonly layer: MemoryLayer;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt?: string;
  readonly accessCount: number;
  readonly lastAccessedAt?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly sessionId?: string;
  readonly executionId?: string;
}

/**
 * Aggregate statistics across all memory layers.
 */
export interface MemoryStats {
  readonly totalEntries: number;
  readonly workingEntries: number;
  readonly sessionEntries: number;
  readonly persistentEntries: number;
  readonly totalSizeBytes: number;
  readonly expiredEntries: number;
}

/**
 * Query filter for scanning memory entries.
 */
export interface MemoryQuery {
  readonly layer?: MemoryLayer;
  readonly keyPattern?: string;
  readonly sessionId?: string;
  readonly executionId?: string;
  readonly tag?: string;
  readonly minAccessCount?: number;
}

/**
 * Scope parameters for unified store/retrieve/delete operations.
 */
export interface MemoryScope {
  readonly sessionId?: string;
  readonly executionId?: string;
  readonly ttlMs?: number;
  readonly metadata?: Record<string, unknown>;
}
