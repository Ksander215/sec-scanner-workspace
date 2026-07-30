/**
 * Context Engine Module — Public API.
 *
 * Re-exports all types, events, errors, policies, and classes
 * for the Context subsystem.
 *
 * Conforms to: ARC-001.001 §5 (Module Architecture)
 */

// ─── Core Types ──────────────────────────────────────────────
export type {
  ContextId,
  ContextVersion,
  SnapshotId,
  UnifiedContext,
  ContextEntry,
  SerializableContext,
} from './types.js';
export { ContextSource, ContextPriority } from './types.js';

// ─── Domain Events ────────────────────────────────────────────
export type {
  ContextDomainEvent,
  ContextCreated,
  ContextUpdated,
  ContextSnapshotCreated,
  ContextRestored,
  ContextCleared,
  ContextEntryEvicted,
  ContextSerialized,
  ContextDeserialized,
} from './events.js';
export { createContextEventBase } from './events.js';

// ─── Errors ──────────────────────────────────────────────────
export {
  ContextError,
  ContextNotFoundError,
  ContextSizeExceededError,
  ContextValidationError,
  ContextIsolationError,
  ContextSerializationError,
  ContextDeserializationError,
  SnapshotNotFoundError,
  SnapshotCorruptedError,
} from './errors.js';

// ─── Policies ─────────────────────────────────────────────────
export type { ContextPolicyConfig } from './policies.js';
export { DEFAULT_CONTEXT_POLICY, ContextPolicyManager } from './policies.js';

// ─── Cache ────────────────────────────────────────────────────
export { ContextCache } from './context-cache.js';

// ─── Snapshot ────────────────────────────────────────────────
export type { ContextSnapshot } from './context-snapshot.js';
export { ContextSnapshotManager } from './context-snapshot.js';

// ─── Serializer ──────────────────────────────────────────────
export { ContextSerializer } from './context-serializer.js';

// ─── Builder ─────────────────────────────────────────────────
export type { ContextSourceProvider } from './context-builder.js';
export { ContextBuilder } from './context-builder.js';

// ─── Resolver ────────────────────────────────────────────────
export { ContextResolver } from './context-resolver.js';

// ─── Loader ──────────────────────────────────────────────────
export type { ContextStorageAdapter } from './context-loader.js';
export { InMemoryContextStorageAdapter, ContextLoader } from './context-loader.js';

// ─── Engine ──────────────────────────────────────────────────
export type { ContextEngineConfig } from './context-engine.js';
export { ContextEngine } from './context-engine.js';
