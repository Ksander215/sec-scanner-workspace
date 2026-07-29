/**
 * Memory Isolation Guard — Session boundary enforcement.
 *
 * Ensures sessions cannot access each other's memory according to
 * configurable isolation rules per layer.
 *
 * Isolation rules:
 *   - working:   no sessionId required, no cross-session access allowed
 *   - session:   sessionId required, no cross-session access allowed
 *   - persistent: no sessionId required, cross-session access allowed (shared)
 *
 * Conforms to: DR-03 (Single Memory Authority), ADR-011 (Data Sovereignty)
 */
import type { MemoryLayer } from './types.js';
import type { Result } from '../types/common.js';
import { MemoryIsolationViolationError, MemoryError } from './errors.js';

// ─── Isolation Rule ──────────────────────────────────────────

export interface IsolationRule {
  readonly layer: MemoryLayer;
  readonly sessionIdRequired: boolean;
  readonly crossSessionAccessAllowed: boolean;
}

// ─── Default Rules ───────────────────────────────────────────

export const DEFAULT_ISOLATION_RULES: ReadonlyMap<MemoryLayer, IsolationRule> = new Map<MemoryLayer, IsolationRule>([
  [
    'working',
    {
      layer: 'working',
      sessionIdRequired: false,
      crossSessionAccessAllowed: false,
    },
  ],
  [
    'session',
    {
      layer: 'session',
      sessionIdRequired: true,
      crossSessionAccessAllowed: false,
    },
  ],
  [
    'persistent',
    {
      layer: 'persistent',
      sessionIdRequired: false,
      crossSessionAccessAllowed: true,
    },
  ],
]);

// ─── Guard ───────────────────────────────────────────────────

export class MemoryIsolationGuard {
  constructor(
    private readonly rules: ReadonlyMap<MemoryLayer, IsolationRule> = DEFAULT_ISOLATION_RULES,
  ) {}

  /**
   * Check whether the accessor is allowed to read a given entry.
   *
   * - If the entry has no sessionId, access is always allowed.
   * - If cross-session access is allowed for this layer, access is granted.
   * - If the accessor's sessionId matches the entry's sessionId, access is granted.
   * - Otherwise, access is denied.
   */
  checkAccess(
    layer: MemoryLayer,
    accessorSessionId: string | undefined,
    entrySessionId: string | undefined,
  ): Result<void, MemoryIsolationViolationError> {
    const rule = this.rules.get(layer);
    if (rule === undefined) {
      return { ok: true, value: undefined };
    }

    // If the entry has no sessionId bound, it's accessible to everyone
    if (entrySessionId === undefined) {
      return { ok: true, value: undefined };
    }

    // Persistent layer allows cross-session access
    if (rule.crossSessionAccessAllowed) {
      return { ok: true, value: undefined };
    }

    // Entry is session-bound — accessor must have a matching sessionId
    if (accessorSessionId === undefined) {
      return {
        ok: false,
        error: new MemoryIsolationViolationError(
          entrySessionId,
          '<no-session>',
        ),
      };
    }

    if (accessorSessionId !== entrySessionId) {
      return {
        ok: false,
        error: new MemoryIsolationViolationError(
          entrySessionId,
          accessorSessionId,
        ),
      };
    }

    return { ok: true, value: undefined };
  }

  /**
   * Validate that a store operation has the required sessionId for the layer.
   */
  validateStore(
    layer: MemoryLayer,
    sessionId: string | undefined,
  ): Result<void, MemoryError> {
    const rule = this.rules.get(layer);
    if (rule === undefined) {
      return { ok: true, value: undefined };
    }

    if (rule.sessionIdRequired && sessionId === undefined) {
      return {
        ok: false,
        error: new MemoryError(
          `Session ID is required for layer "${layer}"`,
          'MEMORY_SESSION_ID_REQUIRED',
        ),
      };
    }

    return { ok: true, value: undefined };
  }

  /**
   * Get the isolation rule for a given layer, or undefined if not configured.
   */
  getRule(layer: MemoryLayer): IsolationRule | undefined {
    return this.rules.get(layer);
  }
}
