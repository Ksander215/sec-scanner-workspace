/**
 * Memory Module — Error Hierarchy
 *
 * Structured errors for the memory runtime. Each error carries a `code`
 * for programmatic handling without re-parsing messages.
 */
import type { MemoryLayer } from './types.js';

// ─── Base ─────────────────────────────────────────────────────

export class MemoryError extends Error {
  readonly code: string;
  readonly entryId?: string;

  constructor(message: string, code: string, entryId?: string) {
    super(message);
    this.name = 'MemoryError';
    this.code = code;
    this.entryId = entryId;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ─── MemoryEntryNotFoundError ──────────────────────────────────

export class MemoryEntryNotFoundError extends MemoryError {
  readonly key: string;
  readonly layer?: MemoryLayer;

  constructor(key: string, layer?: MemoryLayer) {
    super(
      `Memory entry not found: key="${key}"${layer ? `, layer="${layer}"` : ''}`,
      'MEMORY_ENTRY_NOT_FOUND',
    );
    this.name = 'MemoryEntryNotFoundError';
    this.key = key;
    this.layer = layer;
  }
}

// ─── MemoryIsolationViolationError ───────────────────────────

export class MemoryIsolationViolationError extends MemoryError {
  readonly sessionId: string;
  readonly accessorSessionId: string;

  constructor(sessionId: string, accessorSessionId: string) {
    super(
      `Isolation violation: session "${accessorSessionId}" tried to access memory owned by session "${sessionId}"`,
      'MEMORY_ISOLATION_VIOLATION',
    );
    this.name = 'MemoryIsolationViolationError';
    this.sessionId = sessionId;
    this.accessorSessionId = accessorSessionId;
  }
}

// ─── MemoryCapacityError ─────────────────────────────────────

export class MemoryCapacityError extends MemoryError {
  readonly layer: MemoryLayer;
  readonly maxEntries: number;

  constructor(layer: MemoryLayer, maxEntries: number) {
    super(
      `Memory capacity exceeded for layer "${layer}": max ${maxEntries} entries`,
      'MEMORY_CAPACITY_EXCEEDED',
    );
    this.name = 'MemoryCapacityError';
    this.layer = layer;
    this.maxEntries = maxEntries;
  }
}

// ─── MemorySerializationError ──────────────────────────────

export class MemorySerializationError extends MemoryError {
  constructor(message?: string) {
    super(
      message ?? 'Memory serialization failed',
      'MEMORY_SERIALIZATION_FAILED',
    );
    this.name = 'MemorySerializationError';
  }
}

// ─── MemoryDeserializationError ─────────────────────────────

export class MemoryDeserializationError extends MemoryError {
  constructor(message?: string) {
    super(
      message ?? 'Memory deserialization failed',
      'MEMORY_DESERIALIZATION_FAILED',
    );
    this.name = 'MemoryDeserializationError';
  }
}
