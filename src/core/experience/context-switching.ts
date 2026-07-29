/**
 * Experience Runtime — Context Switching
 * TASK-AIS-004A.000  Subsystem 8
 *
 * Determines the active experience context (Work → Home → Project → Research)
 * based on signal matching against defined context indicators. Uses a sliding
 * window for context detection and maintains switch history per user.
 * Emits ContextChanged domain events.
 *
 * Conforms to: DOM-002, ADR-014, CON-001, ADR-002 (Event Bus)
 */

import type { Timestamp } from '../types/common.js';
import { createId } from '../domain/identifiers.js';
import type { EventBus } from '../events/event-bus.js';
import { EventClassification } from '../types/common.js';
import type { ContextId, ExperienceContext } from './types.js';
import type { ExperienceRuntimeConfig } from './types.js';
import type { ContextChanged } from './events.js';
import { ContextDetectionError } from './errors.js';

/** Entry in the context switch history */
interface ContextSwitchEntry {
  readonly from: string;
  readonly to: string;
  readonly timestamp: Timestamp;
}

/** Per-user sliding window of recent signals */
interface SignalWindow {
  signals: Readonly<Record<string, unknown>>[];
}

// ─── ContextSwitching ────────────────────────────────────────

/**
 * Manages and detects experience contexts for users.
 * Contexts are defined by name, description, and indicator keys.
 * The detection engine matches current signals against context
 * indicators using a sliding window for smoothing.
 */
export class ContextSwitching {
  private readonly contexts = new Map<ContextId, ExperienceContext>();
  private readonly userContexts = new Map<string, Set<ContextId>>();
  private readonly activeContexts = new Map<string, ContextId>();
  private readonly switchHistory = new Map<string, ContextSwitchEntry[]>();
  private readonly signalWindows = new Map<string, SignalWindow>();
  private readonly eventBus: EventBus | null;
  private readonly config: ExperienceRuntimeConfig;

  constructor(
    config: ExperienceRuntimeConfig,
    eventBus?: EventBus,
  ) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  // ─── Context Definition ──────────────────────────────────

  /**
   * Defines a new experience context for a user.
   * Indicators are keys that will be matched against incoming signal maps.
   */
  defineContext(
    userIdHash: string,
    name: string,
    description: string,
    indicators: readonly string[],
  ): ExperienceContext {
    const id = createId<ContextId>();

    const context: ExperienceContext = {
      id,
      userIdHash,
      name,
      description,
      indicators: [...indicators],
      confidence: 0,
      isActive: false,
    };

    this.contexts.set(id, context);

    // Track under user
    let userSet = this.userContexts.get(userIdHash);
    if (userSet) {
      (userSet as Set<ContextId>).add(id);
    } else {
      userSet = new Set([id]);
      this.userContexts.set(userIdHash, userSet);
    }

    return context;
  }

  // ─── Detection ────────────────────────────────────────────

  /**
   * Detects the best-matching context for a user based on current signals.
   * Uses a sliding window of recent signals for stable detection.
   * Returns the context with the highest match ratio above the threshold,
   * or null if no context matches sufficiently.
   */
  detectContext(
    userIdHash: string,
    currentSignals: Readonly<Record<string, unknown>>,
  ): ExperienceContext | null {
    const userContextIds = this.userContexts.get(userIdHash);
    if (!userContextIds || userContextIds.size === 0) return null;

    // Add current signals to the sliding window
    this.addToSignalWindow(userIdHash, currentSignals);

    // Score each context by matching indicators against the signal window
    let bestMatch: { context: ExperienceContext; score: number } | null = null;

    for (const ctxId of userContextIds) {
      const ctx = this.contexts.get(ctxId);
      if (!ctx || ctx.indicators.length === 0) continue;

      const score = this.computeMatchScore(userIdHash, ctx.indicators);
      if (bestMatch === null || score > bestMatch.score) {
        bestMatch = { context: ctx, score };
      }
    }

    if (bestMatch === null || bestMatch.score < this.config.learningThreshold) {
      return null;
    }

    return bestMatch.context;
  }

  /** Returns the currently active context for a user, or null. */
  getActiveContext(userIdHash: string): ExperienceContext | null {
    const activeId = this.activeContexts.get(userIdHash);
    if (!activeId) return null;
    return this.contexts.get(activeId) ?? null;
  }

  /**
   * Explicitly switches to a specified context.
   * Deactivates the previous context and activates the new one.
   * Emits ContextChanged domain event.
   */
  switchContext(userIdHash: string, contextId: ContextId): ExperienceContext {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new ContextDetectionError(
        `Context not found: ${contextId}`,
        { contextId },
      );
    }
    if (context.userIdHash !== userIdHash) {
      throw new ContextDetectionError(
        `Context does not belong to user`,
        { userIdHash, contextId },
      );
    }

    const now = new Date().toISOString() as Timestamp;
    const previousActiveId = this.activeContexts.get(userIdHash);

    // Deactivate previous context
    if (previousActiveId !== undefined && previousActiveId !== contextId) {
      const prevCtx = this.contexts.get(previousActiveId);
      if (prevCtx) {
        this.contexts.set(previousActiveId, {
          ...prevCtx,
          isActive: false,
          deactivatedAt: now,
        });
      }

      // Record switch history
      this.recordSwitch(userIdHash, previousActiveId, contextId, now);
    }

    // Activate new context
    const activated: ExperienceContext = {
      ...context,
      isActive: true,
      confidence: 1.0,
      activatedAt: now,
    };
    this.contexts.set(contextId, activated);
    this.activeContexts.set(userIdHash, contextId);

    // Emit ContextChanged event (fire-and-forget)
    if (this.eventBus) {
      const prevCtx = previousActiveId !== undefined
        ? this.contexts.get(previousActiveId)
        : null;

      const event: ContextChanged = {
        eventId: crypto.randomUUID(),
        eventType: 'ContextChanged',
        classification: EventClassification.StateChange,
        timestamp: now,
        sequence: 0,
        aggregateId: contextId,
        aggregateType: 'ExperienceContext',
        version: '1.0.0',
        payload: {
          contextId,
          userIdHash,
          contextName: context.name,
          fromContext: prevCtx?.name,
          changedAt: now,
          confidence: 1.0,
        },
      };
      void this.eventBus.publish(event);
    }

    return activated;
  }

  /** Returns all defined contexts for a user. */
  getAllContexts(userIdHash: string): readonly ExperienceContext[] {
    const userSet = this.userContexts.get(userIdHash);
    if (!userSet || userSet.size === 0) return [];

    const result: ExperienceContext[] = [];
    for (const ctxId of userSet) {
      const ctx = this.contexts.get(ctxId);
      if (ctx) result.push(ctx);
    }
    return result;
  }

  /** Returns the ordered history of context switches for a user. */
  getContextSwitchHistory(
    userIdHash: string,
  ): readonly ContextSwitchEntry[] {
    return this.switchHistory.get(userIdHash) ?? [];
  }

  // ─── Internal ──────────────────────────────────────────────

  /**
   * Adds a signal snapshot to the user's sliding window.
   * Maintains at most `contextDetectionWindowSize` entries.
   */
  private addToSignalWindow(
    userIdHash: string,
    signals: Readonly<Record<string, unknown>>,
  ): void {
    let win = this.signalWindows.get(userIdHash);
    if (!win) {
      win = { signals: [] };
      this.signalWindows.set(userIdHash, win);
    }

    const arr = [...win.signals, signals];
    const maxSize = this.config.contextDetectionWindowSize;
    if (arr.length > maxSize) {
      arr.splice(0, arr.length - maxSize);
    }

    win.signals = arr;
  }

  /**
   * Computes a match score for a set of indicators against the user's
   * signal window. Score is the fraction of indicators that are present
   * in the most recent signals, averaged over the window.
   */
  private computeMatchScore(
    userIdHash: string,
    indicators: readonly string[],
  ): number {
    const window = this.signalWindows.get(userIdHash);
    if (!window || window.signals.length === 0) return 0;

    let totalScore = 0;

    for (const signal of window.signals) {
      let matches = 0;
      for (const indicator of indicators) {
        if (indicator in signal) {
          const value = signal[indicator];
          // Indicator matches if key exists and value is truthy or non-empty
          if (value !== undefined && value !== null && value !== '') {
            matches++;
          }
        }
      }
      totalScore += matches / indicators.length;
    }

    return totalScore / window.signals.length;
  }

  /**
   * Records a context switch in the history log.
   */
  private recordSwitch(
    userIdHash: string,
    fromId: ContextId,
    toId: ContextId,
    timestamp: Timestamp,
  ): void {
    let history = this.switchHistory.get(userIdHash);
    if (!history) {
      history = [];
      this.switchHistory.set(userIdHash, history);
    }

    (this.switchHistory.get(userIdHash) as ContextSwitchEntry[]).push({
      from: fromId,
      to: toId,
      timestamp,
    });
  }
}
