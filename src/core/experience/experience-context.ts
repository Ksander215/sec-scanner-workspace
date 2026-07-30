/**
 * Experience Runtime — Experience Context
 * TASK-AIS-004A.000
 *
 * Runtime context/session for a user's experience processing.
 * Holds per-session state and coordinates subsystem access.
 */

import type { ExperienceRuntimeConfig } from './types.js';
import type { ExperienceSessionId, ProfileId, ContextId } from './types.js';
import { ExperienceState } from './types.js';
import { createId } from '../domain/identifiers.js';
import { createExperienceFSM } from './experience-fsm.js';
import type { TypedStateMachine } from '../fsm/state-machine.js';

/** Per-user session context */
export interface ExperienceSession {
  readonly id: ExperienceSessionId;
  readonly userIdHash: string;
  readonly state: ExperienceState;
  readonly activeProfileId?: ProfileId;
  readonly activeContextId?: ContextId;
  readonly startedAt: string;
  readonly lastActivityAt: string;
}

export class ExperienceContext {
  private readonly sessions = new Map<ExperienceSessionId, ExperienceSession>();
  private readonly userSessionIndex = new Map<string, ExperienceSessionId>();
  private readonly userFSMs = new Map<string, TypedStateMachine<ExperienceState>>;
  private readonly config: ExperienceRuntimeConfig;

  constructor(config: ExperienceRuntimeConfig) {
    this.config = config;
  }

  /** Create a new experience session for a user */
  createSession(userIdHash: string): ExperienceSession {
    // One active session per user
    const existingId = this.userSessionIndex.get(userIdHash);
    if (existingId) {
      const existing = this.sessions.get(existingId);
      if (existing && existing.state !== ExperienceState.Archived) {
        return existing;
      }
    }

    const now = new Date().toISOString();
    const session: ExperienceSession = {
      id: createId<ExperienceSessionId>(),
      userIdHash,
      state: ExperienceState.Created,
      startedAt: now,
      lastActivityAt: now,
    };

    this.sessions.set(session.id, session);
    this.userSessionIndex.set(userIdHash, session.id);
    this.userFSMs.set(userIdHash, createExperienceFSM());
    return session;
  }

  /** Get an existing session */
  getSession(sessionId: ExperienceSessionId): ExperienceSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /** Get session for a user */
  getUserSession(userIdHash: string): ExperienceSession | null {
    const id = this.userSessionIndex.get(userIdHash);
    if (!id) return null;
    return this.sessions.get(id) ?? null;
  }

  /** Transition session state using the user's FSM */
  transitionState(userIdHash: string, toState: ExperienceState): ExperienceState {
    const fsm = this.userFSMs.get(userIdHash);
    if (!fsm) {
      throw new Error(`No FSM for user ${userIdHash}`);
    }

    fsm.transition(toState);

    const sessionId = this.userSessionIndex.get(userIdHash);
    if (!sessionId) {
      throw new Error(`No session for user ${userIdHash}`);
    }

    // Update session with new state
    const old = this.sessions.get(sessionId)!;
    const updated: ExperienceSession = {
      ...old,
      state: fsm.currentState,
      lastActivityAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, updated);

    return fsm.currentState;
  }

  /** Get current FSM state for a user */
  getState(userIdHash: string): ExperienceState | null {
    const fsm = this.userFSMs.get(userIdHash);
    return fsm?.currentState ?? null;
  }

  /** Get FSM for a user (for hook registration) */
  getFSM(userIdHash: string): TypedStateMachine<ExperienceState> | null {
    return this.userFSMs.get(userIdHash) ?? null;
  }

  /** Set active profile for a user session */
  setActiveProfile(userIdHash: string, profileId: ProfileId): void {
    const sessionId = this.userSessionIndex.get(userIdHash);
    if (!sessionId) return;
    const old = this.sessions.get(sessionId)!;
    this.sessions.set(sessionId, {
      ...old,
      activeProfileId: profileId,
      lastActivityAt: new Date().toISOString(),
    });
  }

  /** Set active context for a user session */
  setActiveContext(userIdHash: string, contextId: ContextId): void {
    const sessionId = this.userSessionIndex.get(userIdHash);
    if (!sessionId) return;
    const old = this.sessions.get(sessionId)!;
    this.sessions.set(sessionId, {
      ...old,
      activeContextId: contextId,
      lastActivityAt: new Date().toISOString(),
    });
  }

  /** Archive a user session */
  archiveSession(userIdHash: string): void {
    const fsm = this.userFSMs.get(userIdHash);
    if (fsm && fsm.canTransition(ExperienceState.Archived)) {
      fsm.transition(ExperienceState.Archived);
    }

    const sessionId = this.userSessionIndex.get(userIdHash);
    if (!sessionId) return;
    const old = this.sessions.get(sessionId)!;
    this.sessions.set(sessionId, {
      ...old,
      state: fsm?.currentState ?? old.state,
      lastActivityAt: new Date().toISOString(),
    });
  }

  /** Get all active sessions */
  getAllSessions(): readonly ExperienceSession[] {
    return Array.from(this.sessions.values());
  }

  /** Get configuration */
  getConfig(): ExperienceRuntimeConfig {
    return this.config;
  }
}
