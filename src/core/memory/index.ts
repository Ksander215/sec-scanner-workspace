/**
 * Memory Module — Public API
 *
 * Re-exports all types, events, errors, and implementations
 * for the 3-tier Memory Runtime.
 *
 * Conforms to: ARC-001.001 (Module Architecture)
 */

// ─── Types ──────────────────────────────────────────────────
export type {
  MemoryEntryId,
  MemoryLayer,
  MemoryEntry,
  SerializableMemoryEntry,
  MemoryStats,
  MemoryQuery,
  MemoryScope,
} from './types.js';

// ─── Events ─────────────────────────────────────────────────
export type {
  MemoryEvent,
  MemoryEntryStored,
  MemoryEntryRetrieved,
  MemoryEntryUpdated,
  MemoryEntryDeleted,
  MemoryLayerCleared,
  MemoryExpired,
  MemoryIsolationViolation,
} from './events.js';

// ─── Errors ──────────────────────────────────────────────────
export {
  MemoryError,
  MemoryEntryNotFoundError,
  MemoryIsolationViolationError,
  MemoryCapacityError,
  MemorySerializationError,
  MemoryDeserializationError,
} from './errors.js';

// ─── Working Memory ──────────────────────────────────────────
export { WorkingMemory } from './working-memory.js';

// ─── Session Memory ──────────────────────────────────────────
export { SessionMemory } from './session-memory.js';

// ─── Persistent Memory ──────────────────────────────────────
export {
  PersistentMemory,
  InMemoryPersistentStorageAdapter,
} from './persistent-memory.js';
export type {
  PersistentStorageAdapter,
} from './persistent-memory.js';

// ─── Memory Isolation ────────────────────────────────────────
export {
  MemoryIsolationGuard,
  DEFAULT_ISOLATION_RULES,
} from './memory-isolation.js';
export type {
  IsolationRule,
} from './memory-isolation.js';

// ─── Memory Runtime ─────────────────────────────────────────
export {
  MemoryRuntime,
} from './memory-runtime.js';
export type {
  MemoryRuntimeConfig,
} from './memory-runtime.js';
