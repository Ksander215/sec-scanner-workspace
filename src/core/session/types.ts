/**
 * Session Types — Branded IDs, states, and immutable session interface.
 *
 * Session FSM: Created → Running → Paused → Resumed(transient) → Completed → Archived
 */

/** Branded type for Session identity */
export type SessionId = string & { readonly __brand: 'SessionId' };

/** Session lifecycle states */
export enum SessionState {
  Created = 'Created',
  Running = 'Running',
  Paused = 'Paused',
  Resumed = 'Resumed', // transient — immediately transitions to Running
  Completed = 'Completed',
  Archived = 'Archived',
}

/** Immutable session snapshot */
export interface Session {
  readonly id: SessionId;
  readonly state: SessionState;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly pausedAt?: string;
  readonly resumedAt?: string;
  readonly completedAt?: string;
  readonly archivedAt?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly executionCount: number;
  readonly lastExecutionId?: string;
  readonly contextId?: string;
  readonly version: string;
}

/** Serializable form (no branded type) for persistence */
export interface SerializableSession {
  readonly id: string;
  readonly state: SessionState;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly pausedAt?: string;
  readonly resumedAt?: string;
  readonly completedAt?: string;
  readonly archivedAt?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly executionCount: number;
  readonly lastExecutionId?: string;
  readonly contextId?: string;
  readonly version: string;
}
