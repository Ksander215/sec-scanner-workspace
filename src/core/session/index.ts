/**
 * Session Module — Re-exports all public API.
 *
 * Session lifecycle: Created → Running → Paused → Resumed(transient) → Completed → Archived
 */

// Types
export type { SessionId, Session, SerializableSession } from './types.js';
export { SessionState } from './types.js';

// FSM
export { createSessionFSM } from './session-state.js';

// Events
export type {
  SessionCreated,
  SessionStartedEvent,
  SessionPaused,
  SessionResumed,
  SessionCompleted,
  SessionArchived,
  SessionDomainEvent,
} from './events.js';

// Errors
export {
  SessionError,
  SessionNotFoundError,
  SessionStateError,
  SessionAlreadyExistsError,
} from './errors.js';

// Storage
export type { SessionStorageAdapter } from './session-store.js';
export { InMemorySessionStorageAdapter } from './session-store.js';

// Runtime
export type { SessionRuntimeConfig } from './session-runtime.js';
export { SessionRuntime } from './session-runtime.js';
