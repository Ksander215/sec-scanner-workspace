/**
 * Cognitive Runtime — Cognitive Trace
 * TASK-AIS-003I.000
 *
 * Full execution tracing for the Cognitive Runtime.
 * Audit trail for debugging, compliance, and AL-012.
 *
 * Conforms to: ARC-001.001, AL-012 (Audit Trail)
 */

import { CognitiveTraceLevel } from './types.js';
import type {
  CognitiveTraceEntry,
  CognitiveSessionId,
  ConversationId,
  TurnId,
} from './types.js';
import { brandCognitiveTraceId } from './types.js';

/**
 * CognitiveTrace — audit trail for cognitive processing.
 */
export class CognitiveTrace {
  private readonly _entries: CognitiveTraceEntry[] = [];
  private readonly _enabled: boolean;
  private readonly _maxEntries: number;

  constructor(enabled?: boolean, maxEntries?: number) {
    this._enabled = enabled ?? true;
    this._maxEntries = maxEntries ?? 10000;
  }

  /**
   * Record a trace entry.
   */
  record(params: {
    sessionId: CognitiveSessionId;
    conversationId?: ConversationId | null;
    turnId?: TurnId | null;
    level: CognitiveTraceLevel;
    phase: string;
    action: string;
    message: string;
    durationMs?: number | null;
    metadata?: Record<string, unknown>;
  }): CognitiveTraceEntry {
    if (!this._enabled) {
      return this.createEmptyEntry(params.sessionId);
    }

    const entry: CognitiveTraceEntry = Object.freeze({
      id: brandCognitiveTraceId(crypto.randomUUID()),
      sessionId: params.sessionId,
      conversationId: params.conversationId ?? null,
      turnId: params.turnId ?? null,
      level: params.level,
      phase: params.phase,
      action: params.action,
      message: params.message,
      timestamp: new Date().toISOString(),
      durationMs: params.durationMs ?? null,
      metadata: Object.freeze(params.metadata ?? {}),
    });

    this._entries.push(entry);

    // Evict oldest entries if over limit
    if (this._entries.length > this._maxEntries) {
      this._entries.splice(0, this._entries.length - this._maxEntries);
    }

    return entry;
  }

  /**
   * Convenience: record a debug entry.
   */
  debug(params: Omit<Parameters<CognitiveTrace['record']>[0], 'level'>): CognitiveTraceEntry {
    return this.record({ ...params, level: CognitiveTraceLevel.Debug });
  }

  /**
   * Convenience: record an info entry.
   */
  info(params: Omit<Parameters<CognitiveTrace['record']>[0], 'level'>): CognitiveTraceEntry {
    return this.record({ ...params, level: CognitiveTraceLevel.Info });
  }

  /**
   * Convenience: record a warn entry.
   */
  warn(params: Omit<Parameters<CognitiveTrace['record']>[0], 'level'>): CognitiveTraceEntry {
    return this.record({ ...params, level: CognitiveTraceLevel.Warn });
  }

  /**
   * Convenience: record an error entry.
   */
  error(params: Omit<Parameters<CognitiveTrace['record']>[0], 'level'>): CognitiveTraceEntry {
    return this.record({ ...params, level: CognitiveTraceLevel.Error });
  }

  /**
   * Get all trace entries.
   */
  getEntries(): readonly CognitiveTraceEntry[] {
    return Object.freeze([...this._entries]);
  }

  /**
   * Get trace entries filtered by session.
   */
  getBySession(sessionId: CognitiveSessionId): readonly CognitiveTraceEntry[] {
    return Object.freeze(this._entries.filter(e => e.sessionId === sessionId));
  }

  /**
   * Get trace entries filtered by conversation.
   */
  getByConversation(conversationId: ConversationId): readonly CognitiveTraceEntry[] {
    return Object.freeze(this._entries.filter(e => e.conversationId === conversationId));
  }

  /**
   * Get trace entries filtered by phase.
   */
  getByPhase(phase: string): readonly CognitiveTraceEntry[] {
    return Object.freeze(this._entries.filter(e => e.phase === phase));
  }

  /**
   * Get trace entries filtered by level.
   */
  getByLevel(level: CognitiveTraceLevel): readonly CognitiveTraceEntry[] {
    return Object.freeze(this._entries.filter(e => e.level === level));
  }

  /**
   * Get total entry count.
   */
  get count(): number {
    return this._entries.length;
  }

  /**
   * Clear all trace entries.
   */
  clear(): void {
    this._entries.length = 0;
  }

  /**
   * Create an empty entry when tracing is disabled.
   */
  private createEmptyEntry(sessionId: CognitiveSessionId): CognitiveTraceEntry {
    return Object.freeze({
      id: brandCognitiveTraceId('empty'),
      sessionId,
      conversationId: null,
      turnId: null,
      level: CognitiveTraceLevel.Info,
      phase: 'disabled',
      action: 'none',
      message: 'Tracing is disabled',
      timestamp: new Date().toISOString(),
      durationMs: null,
      metadata: Object.freeze({}),
    });
  }
}
