/**
 * Session Runtime — Types
 */
import type { Identifier, Timestamp } from '../../core/types/common.js';

export type SessionId = Identifier & { readonly __brand: 'SessionId' };

export interface SessionEntity {
  readonly id: SessionId;
  readonly userId: string;
  readonly identitySnapshot: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface CreateSessionOptions {
  readonly userId: string;
  readonly identitySnapshot?: Record<string, unknown>;
}
