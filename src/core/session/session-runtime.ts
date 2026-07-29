/**
 * Session Runtime — Main session lifecycle manager.
 *
 * Manages the full session lifecycle: create → start → pause → resume → complete → archive.
 * Each session has its own TypedStateMachine for independent state tracking.
 * State transitions are validated via FSM; events are published on every state change.
 *
 * Conforms to:
 * - ADR-002 (Event-Driven Architecture)
 * - ADR-004 (Persistence is pluggable, file I/O is future scope)
 * - INV-012 (Events carry classification)
 */
import type { EventBus } from '../events/event-bus.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { TypedStateMachine } from '../fsm/state-machine.js';
import { SessionState } from './types.js';
import type { Session, SessionId, SerializableSession } from './types.js';
import { createSessionFSM } from './session-state.js';
import { SessionNotFoundError, SessionStateError } from './errors.js';
import type { SessionStorageAdapter } from './session-store.js';
import { InMemorySessionStorageAdapter } from './session-store.js';

// ─── Configuration ──────────────────────────────────────────
export interface SessionRuntimeConfig {
  readonly eventBus?: EventBus;
  readonly storageAdapter?: SessionStorageAdapter;
  readonly autoPersist?: boolean;
}

// ─── Internal entry ─────────────────────────────────────────
interface SessionRuntimeEntry {
  readonly session: Session;
  readonly fsm: TypedStateMachine<SessionState>;
}

// ─── Constants ───────────────────────────────────────────────
const CURRENT_VERSION = '1.0';

// ─── Event type imports ─────────────────────────────────────
import type { SessionCreated } from './events.js';
import type { SessionStartedEvent } from './events.js';
import type { SessionPaused } from './events.js';
import type { SessionResumed } from './events.js';
import type { SessionCompleted } from './events.js';
import type { SessionArchived } from './events.js';

// ─── Helpers ─────────────────────────────────────────────────

/** Brand a plain string as a SessionId */
function brandSessionId(id: string): SessionId {
  return id as unknown as SessionId;
}

/** Create a new Session object with the given fields */
function createSessionSnapshot(
  id: SessionId,
  state: SessionState,
  overrides: Partial<Omit<Session, 'id' | 'state'>> = {},
): Session {
  return {
    id,
    state,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    startedAt: overrides.startedAt,
    pausedAt: overrides.pausedAt,
    resumedAt: overrides.resumedAt,
    completedAt: overrides.completedAt,
    archivedAt: overrides.archivedAt,
    metadata: overrides.metadata ?? Object.freeze({}),
    executionCount: overrides.executionCount ?? 0,
    lastExecutionId: overrides.lastExecutionId,
    contextId: overrides.contextId,
    version: overrides.version ?? CURRENT_VERSION,
  };
}

// ─── SessionRuntime ─────────────────────────────────────────
export class SessionRuntime {
  private readonly sessions = new Map<string, SessionRuntimeEntry>();
  private readonly eventBus?: EventBus;
  private readonly storage: SessionStorageAdapter;
  private readonly autoPersist: boolean;

  constructor(config: SessionRuntimeConfig = {}) {
    this.eventBus = config.eventBus;
    this.storage = config.storageAdapter ?? new InMemorySessionStorageAdapter();
    this.autoPersist = config.autoPersist ?? false;
  }

  // ─── Lifecycle ─────────────────────────────────────────────

  /**
   * Create a new session in Created state.
   * @throws SessionAlreadyExistsError if a session with the generated ID collides
   */
  async createSession(metadata?: Record<string, unknown>): Promise<Session> {
    const id = brandSessionId(crypto.randomUUID());
    const now = new Date().toISOString();
    const frozenMetadata = Object.freeze({ ...(metadata ?? {}) });

    const session = createSessionSnapshot(id, SessionState.Created, {
      createdAt: now,
      metadata: frozenMetadata,
    });

    const fsm = createSessionFSM();

    this.sessions.set(id, { session, fsm });

    await this.publishEvent<SessionCreated>({
      eventType: 'SessionCreated',
      classification: 'state-change' as SessionCreated['classification'],
      payload: {
        sessionId: id,
        createdAt: now,
        metadata: frozenMetadata,
      },
    });

    await this.maybePersist(id);

    return session;
  }

  /**
   * Start a session: Created → Running.
   * @throws SessionNotFoundError if session does not exist
   * @throws SessionStateError if transition is invalid
   */
  async startSession(sessionId: string): Promise<Session> {
    const entry = this.getEntryOrThrow(sessionId);
    const { fsm } = entry;

    this.transitionOrThrow(fsm, SessionState.Running, sessionId);

    const now = new Date().toISOString();
    const updated = createSessionSnapshot(entry.session.id, SessionState.Running, {
      createdAt: entry.session.createdAt,
      metadata: entry.session.metadata,
      executionCount: entry.session.executionCount,
      lastExecutionId: entry.session.lastExecutionId,
      contextId: entry.session.contextId,
      version: entry.session.version,
      startedAt: now,
    });

    this.sessions.set(sessionId, { session: updated, fsm });

    await this.publishEvent<SessionStartedEvent>({
      eventType: 'SessionStartedEvent',
      classification: 'state-change' as SessionStartedEvent['classification'],
      payload: {
        sessionId,
        startedAt: now,
      },
    });

    await this.maybePersist(sessionId);

    return updated;
  }

  /**
   * Pause a running session: Running → Paused.
   * @throws SessionNotFoundError if session does not exist
   * @throws SessionStateError if transition is invalid
   */
  async pauseSession(sessionId: string, reason?: string): Promise<Session> {
    const entry = this.getEntryOrThrow(sessionId);
    const { fsm } = entry;

    this.transitionOrThrow(fsm, SessionState.Paused, sessionId);

    const now = new Date().toISOString();
    const updated = createSessionSnapshot(entry.session.id, SessionState.Paused, {
      createdAt: entry.session.createdAt,
      startedAt: entry.session.startedAt,
      metadata: entry.session.metadata,
      executionCount: entry.session.executionCount,
      lastExecutionId: entry.session.lastExecutionId,
      contextId: entry.session.contextId,
      version: entry.session.version,
      pausedAt: now,
    });

    this.sessions.set(sessionId, { session: updated, fsm });

    await this.publishEvent<SessionPaused>({
      eventType: 'SessionPaused',
      classification: 'state-change' as SessionPaused['classification'],
      payload: {
        sessionId,
        pausedAt: now,
        reason,
      },
    });

    await this.maybePersist(sessionId);

    return updated;
  }

  /**
   * Resume a paused session: Paused → Running.
   * @throws SessionNotFoundError if session does not exist
   * @throws SessionStateError if transition is invalid
   */
  async resumeSession(sessionId: string): Promise<Session> {
    const entry = this.getEntryOrThrow(sessionId);
    const { fsm } = entry;

    // Paused → Running is the FSM transition
    this.transitionOrThrow(fsm, SessionState.Running, sessionId);

    const now = new Date().toISOString();
    const updated = createSessionSnapshot(entry.session.id, SessionState.Running, {
      createdAt: entry.session.createdAt,
      startedAt: entry.session.startedAt,
      pausedAt: entry.session.pausedAt,
      metadata: entry.session.metadata,
      executionCount: entry.session.executionCount,
      lastExecutionId: entry.session.lastExecutionId,
      contextId: entry.session.contextId,
      version: entry.session.version,
      resumedAt: now,
    });

    this.sessions.set(sessionId, { session: updated, fsm });

    await this.publishEvent<SessionResumed>({
      eventType: 'SessionResumed',
      classification: 'state-change' as SessionResumed['classification'],
      payload: {
        sessionId,
        resumedAt: now,
      },
    });

    await this.maybePersist(sessionId);

    return updated;
  }

  /**
   * Complete a running session: Running → Completed.
   * @throws SessionNotFoundError if session does not exist
   * @throws SessionStateError if transition is invalid
   */
  async completeSession(sessionId: string): Promise<Session> {
    const entry = this.getEntryOrThrow(sessionId);
    const { fsm } = entry;

    this.transitionOrThrow(fsm, SessionState.Completed, sessionId);

    const now = new Date().toISOString();
    const updated = createSessionSnapshot(entry.session.id, SessionState.Completed, {
      createdAt: entry.session.createdAt,
      startedAt: entry.session.startedAt,
      pausedAt: entry.session.pausedAt,
      resumedAt: entry.session.resumedAt,
      metadata: entry.session.metadata,
      executionCount: entry.session.executionCount,
      lastExecutionId: entry.session.lastExecutionId,
      contextId: entry.session.contextId,
      version: entry.session.version,
      completedAt: now,
    });

    this.sessions.set(sessionId, { session: updated, fsm });

    await this.publishEvent<SessionCompleted>({
      eventType: 'SessionCompleted',
      classification: 'state-change' as SessionCompleted['classification'],
      payload: {
        sessionId,
        completedAt: now,
        executionCount: updated.executionCount,
      },
    });

    await this.maybePersist(sessionId);

    return updated;
  }

  /**
   * Archive a completed session: Completed → Archived.
   * @throws SessionNotFoundError if session does not exist
   * @throws SessionStateError if transition is invalid
   */
  async archiveSession(sessionId: string): Promise<Session> {
    const entry = this.getEntryOrThrow(sessionId);
    const { fsm } = entry;

    this.transitionOrThrow(fsm, SessionState.Archived, sessionId);

    const now = new Date().toISOString();
    const updated = createSessionSnapshot(entry.session.id, SessionState.Archived, {
      createdAt: entry.session.createdAt,
      startedAt: entry.session.startedAt,
      pausedAt: entry.session.pausedAt,
      resumedAt: entry.session.resumedAt,
      completedAt: entry.session.completedAt,
      metadata: entry.session.metadata,
      executionCount: entry.session.executionCount,
      lastExecutionId: entry.session.lastExecutionId,
      contextId: entry.session.contextId,
      version: entry.session.version,
      archivedAt: now,
    });

    this.sessions.set(sessionId, { session: updated, fsm });

    await this.publishEvent<SessionArchived>({
      eventType: 'SessionArchived',
      classification: 'state-change' as SessionArchived['classification'],
      payload: {
        sessionId,
        archivedAt: now,
      },
    });

    await this.maybePersist(sessionId);

    return updated;
  }

  // ─── Queries ───────────────────────────────────────────────

  /** Get a session by ID, or null if not found. */
  getSession(sessionId: string): Session | null {
    const entry = this.sessions.get(sessionId);
    return entry?.session ?? null;
  }

  /** List all in-memory sessions. */
  listSessions(): readonly Session[] {
    return Array.from(this.sessions.values()).map((e) => e.session);
  }

  /** Delete a session from memory and storage. Returns true if it existed. */
  async deleteSession(sessionId: string): Promise<boolean> {
    const existed = this.sessions.delete(sessionId);
    if (existed) {
      await this.storage.delete(sessionId);
    }
    return existed;
  }

  // ─── Execution tracking ────────────────────────────────────

  /** Record an execution against a session (increments count, stores last execution ID). */
  recordExecution(sessionId: string, executionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (entry === undefined) {
      throw new SessionNotFoundError(sessionId);
    }

    const current = entry.session;
    const updated = createSessionSnapshot(current.id, current.state, {
      createdAt: current.createdAt,
      startedAt: current.startedAt,
      pausedAt: current.pausedAt,
      resumedAt: current.resumedAt,
      completedAt: current.completedAt,
      archivedAt: current.archivedAt,
      metadata: current.metadata,
      executionCount: current.executionCount + 1,
      lastExecutionId: executionId,
      contextId: current.contextId,
      version: current.version,
    });

    this.sessions.set(sessionId, { session: updated, fsm: entry.fsm });
  }

  // ─── Persistence ───────────────────────────────────────────

  /** Explicitly persist a session to storage. */
  async saveSession(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (entry === undefined) {
      throw new SessionNotFoundError(sessionId);
    }
    const serializable = this.serializeSession(entry.session);
    await this.storage.save(serializable);
  }

  /** Load a session from storage into memory. Reconstructs FSM at current state. */
  async loadSession(sessionId: string): Promise<Session> {
    const data = await this.storage.load(sessionId);
    if (data === null) {
      throw new SessionNotFoundError(sessionId);
    }

    const session = this.deserializeSession(data);

    // Reconstruct FSM at the loaded state by replaying transitions
    const fsm = this.reconstructFSM(session.state);

    this.sessions.set(sessionId, { session, fsm });

    return session;
  }

  // ─── Serialization ─────────────────────────────────────────

  /** Convert a branded Session to a plain SerializableSession. */
  serializeSession(session: Session): SerializableSession {
    return {
      id: session.id as string,
      state: session.state,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      pausedAt: session.pausedAt,
      resumedAt: session.resumedAt,
      completedAt: session.completedAt,
      archivedAt: session.archivedAt,
      metadata: { ...session.metadata },
      executionCount: session.executionCount,
      lastExecutionId: session.lastExecutionId,
      contextId: session.contextId,
      version: session.version,
    };
  }

  /** Convert a plain SerializableSession back to a branded Session. */
  deserializeSession(data: SerializableSession): Session {
    return {
      id: brandSessionId(data.id),
      state: data.state,
      createdAt: data.createdAt,
      startedAt: data.startedAt,
      pausedAt: data.pausedAt,
      resumedAt: data.resumedAt,
      completedAt: data.completedAt,
      archivedAt: data.archivedAt,
      metadata: Object.freeze({ ...data.metadata }),
      executionCount: data.executionCount,
      lastExecutionId: data.lastExecutionId,
      contextId: data.contextId,
      version: data.version,
    };
  }

  // ─── Private helpers ───────────────────────────────────────

  /** Get entry or throw SessionNotFoundError */
  private getEntryOrThrow(sessionId: string): SessionRuntimeEntry {
    const entry = this.sessions.get(sessionId);
    if (entry === undefined) {
      throw new SessionNotFoundError(sessionId);
    }
    return entry;
  }

  /** Attempt FSM transition or throw SessionStateError */
  private transitionOrThrow(
    fsm: TypedStateMachine<SessionState>,
    target: SessionState,
    sessionId: string,
  ): void {
    if (!fsm.canTransition(target)) {
      throw new SessionStateError(fsm.currentState, target, sessionId);
    }
    fsm.transition(target);
  }

  /** Persist if autoPersist is enabled */
  private async maybePersist(sessionId: string): Promise<void> {
    if (this.autoPersist) {
      await this.saveSession(sessionId);
    }
  }

  /**
   * Reconstruct an FSM at a given state by replaying the required transitions.
   * This ensures the FSM's internal history and transition map are correct.
   */
  private reconstructFSM(targetState: SessionState): TypedStateMachine<SessionState> {
    const fsm = createSessionFSM();

    // Replay transitions in order to reach the target state
    if (targetState === SessionState.Created) {
      // Already at initial state
      return fsm;
    }

    // Created → Running
    fsm.transition(SessionState.Running);

    if (targetState === SessionState.Running) {
      return fsm;
    }

    if (targetState === SessionState.Paused) {
      // Running → Paused
      fsm.transition(SessionState.Paused);
      return fsm;
    }

    // Resumed is transient — if stored as Resumed, treat as Running
    if (targetState === SessionState.Resumed) {
      return fsm;
    }

    if (targetState === SessionState.Completed) {
      // Running → Completed
      fsm.transition(SessionState.Completed);
      return fsm;
    }

    if (targetState === SessionState.Archived) {
      // Running → Completed → Archived
      fsm.transition(SessionState.Completed);
      fsm.transition(SessionState.Archived);
      return fsm;
    }

    // Exhaustive check for TypeScript
    const _exhaustive: never = targetState;
    throw new Error(`Unknown session state: ${_exhaustive}`);
  }

  /**
   * Publish a domain event to the event bus (if configured).
   * Automatically fills in: eventId, timestamp, sequence, aggregateId, aggregateType, version.
   */
  private async publishEvent<T extends DomainEventBase>(
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (this.eventBus === undefined) {
      return;
    }

    // Extract sessionId from payload for aggregateId
    const payload = (partial as unknown as { payload: { sessionId: string } }).payload;
    const aggregateId = payload.sessionId;

    const event = {
      ...partial,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      sequence: 0, // will be assigned by the event bus
      aggregateId,
      aggregateType: 'Session',
      version: CURRENT_VERSION,
    } as unknown as T;

    await this.eventBus.publish(event);
  }
}
