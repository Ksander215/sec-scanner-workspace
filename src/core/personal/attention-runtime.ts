/**
 * Personal Intelligence Runtime — Attention Subsystem
 *
 * Tracks and analyzes user attention state through snapshots.
 * Detects context switches, cognitive load changes, and
 * attentional alerts (overload, fatigue).
 */
import type { AttentionSnapshot } from './types.js';
import { AttentionState } from './types.js';
import type { PersonalRuntimeContracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
export class AttentionRuntime {
  private contracts: PersonalRuntimeContracts;
  private snapshots: AttentionSnapshot[] = [];
  private lastContextSwitchAt = 0;
  private readonly maxSnapshots: number;

  constructor(contracts: PersonalRuntimeContracts, maxSnapshots = 1000) {
    this.contracts = contracts;
    this.maxSnapshots = maxSnapshots;
  }

  // ── Record snapshot ──────────────────────────────────────────

  recordSnapshot(overrides?: Partial<AttentionSnapshot>): AttentionSnapshot {
    const now = new Date().toISOString();
    const nowMs = Date.now();
    const previous = this.snapshots[this.snapshots.length - 1] ?? null;

    // Build heuristics from previous snapshot and overrides
    const previousCognitiveLoad = previous?.cognitiveLoad ?? 30;
    const previousFocusDuration = previous?.focusDuration ?? 0;
    const previousContextSwitches = previous?.contextSwitches ?? 0;
    const previousDistractionCount = previous?.distractionCount ?? 0;

    const cognitiveLoad = overrides?.cognitiveLoad ?? this.estimateCognitiveLoad(previousCognitiveLoad);
    const distractionCount = overrides?.distractionCount ?? previousDistractionCount;
    const topActivity = overrides?.topActivity ?? this.detectTopActivity();

    // Detect context switch
    const contextSwitches = overrides?.contextSwitches ?? (() => {
      if (topActivity && previous?.topActivity && topActivity !== previous.topActivity) {
        this.lastContextSwitchAt = nowMs;
        return previousContextSwitches + 1;
      }
      return previousContextSwitches;
    })();

    // Calculate focus duration
    const timeSinceLastSwitch = (nowMs - this.lastContextSwitchAt) / (1000 * 60);
    const focusDuration = overrides?.focusDuration ?? (this.lastContextSwitchAt > 0 ? timeSinceLastSwitch : previousFocusDuration);

    // Determine attention state
    const state = overrides?.state ?? this.determineState({
      cognitiveLoad,
      focusDuration,
      contextSwitches,
      distractionCount,
      timeSinceLastSwitch: this.lastContextSwitchAt > 0 ? (nowMs - this.lastContextSwitchAt) / 1000 : Infinity,
    });

    const snapshot: AttentionSnapshot = Object.freeze({
      state,
      focusDuration: Math.round(focusDuration * 100) / 100,
      contextSwitches,
      cognitiveLoad: Math.round(cognitiveLoad * 100) / 100,
      distractionCount,
      topActivity,
      measuredAt: now,
    });

    // Store snapshot
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    // Emit AttentionChanged if state changed
    if (!previous || previous.state !== state) {
      const base = createPersonalEventBase('AttentionChanged', EventClassification.StateChange, 'attention');
      void this.contracts.platform.publishEvent('AttentionChanged', {
        ...base,
        sequence: 0,
        version: '1.0.0',
        payload: {
          oldState: previous?.state ?? AttentionState.Unknown,
          newState: state,
          cognitiveLoad: snapshot.cognitiveLoad,
          changedAt: now,
        },
      });
    }

    // Emit AttentionAlert if Overloaded or Fatigued
    if (state === AttentionState.Overloaded || state === AttentionState.Fatigued) {
      const reason = state === AttentionState.Overloaded
        ? `Cognitive load ${cognitiveLoad} exceeds safe threshold`
        : `Prolonged focus duration ${focusDuration.toFixed(0)} minutes indicates fatigue`;

      const alertBase = createPersonalEventBase('AttentionAlert', EventClassification.Error, 'attention');
      void this.contracts.platform.publishEvent('AttentionAlert', {
        ...alertBase,
        sequence: 0,
        version: '1.0.0',
        payload: {
          state,
          reason,
          cognitiveLoad: snapshot.cognitiveLoad,
          alertedAt: now,
        },
      });
    }

    return snapshot;
  }

  // ── Queries ──────────────────────────────────────────────────

  getCurrentState(): AttentionState {
    if (this.snapshots.length === 0) return AttentionState.Unknown;
    return this.snapshots[this.snapshots.length - 1].state;
  }

  getSnapshots(since?: string): readonly AttentionSnapshot[] {
    if (!since) return Object.freeze([...this.snapshots]);
    return Object.freeze(
      this.snapshots.filter(s => s.measuredAt >= since),
    );
  }

  getAverageCognitiveLoad(minutes = 60): number {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const recent = this.snapshots.filter(s => s.measuredAt >= cutoff);
    if (recent.length === 0) return 0;
    const sum = recent.reduce((acc, s) => acc + s.cognitiveLoad, 0);
    return Math.round((sum / recent.length) * 100) / 100;
  }

  getFocusDuration(): number {
    if (this.snapshots.length === 0) return 0;
    return this.snapshots[this.snapshots.length - 1].focusDuration;
  }

  getContextSwitchRate(): number {
    if (this.snapshots.length < 2) return 0;
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const elapsedMs = new Date(last.measuredAt).getTime() - new Date(first.measuredAt).getTime();
    if (elapsedMs <= 0) return 0;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    if (elapsedHours <= 0) return 0;
    return Math.round((last.contextSwitches / elapsedHours) * 100) / 100;
  }

  getScore(): number {
    if (this.snapshots.length === 0) return 50; // neutral baseline

    const latest = this.snapshots[this.snapshots.length - 1];
    let score = 100;

    // Penalize high cognitive load
    score -= (latest.cognitiveLoad / 100) * 30;

    // Penalize context switches
    score -= Math.min(latest.contextSwitches * 5, 20);

    // Penalize distractions
    score -= Math.min(latest.distractionCount * 3, 15);

    // Bonus for sustained focus
    if (latest.focusDuration > 25) {
      score += 10;
    } else if (latest.focusDuration > 10) {
      score += 5;
    }

    // Penalize bad states
    if (latest.state === AttentionState.Overloaded) score -= 20;
    if (latest.state === AttentionState.Fatigued) score -= 15;
    if (latest.state === AttentionState.Distracted) score -= 10;
    if (latest.state === AttentionState.Focused) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ── Dispose ──────────────────────────────────────────────────

  dispose(): void {
    this.snapshots.length = 0;
    this.lastContextSwitchAt = 0;
  }

  // ── Private helpers ──────────────────────────────────────────

  private estimateCognitiveLoad(previous: number): number {
    const openWindows = this.contracts.desktop.getOpenWindowCount();
    // Base load from open windows (more windows = more load)
    const windowLoad = Math.min(openWindows * 10, 40);
    // Blend with previous (slight decay toward new estimate)
    return Math.round(((previous * 0.6) + (windowLoad * 0.4)) * 100) / 100;
  }

  private detectTopActivity(): string | null {
    const activeWindow = this.contracts.desktop.getActiveWindow();
    if (activeWindow) return activeWindow;
    const runningInstances = this.contracts.workflow.getRunningInstances();
    if (runningInstances.length > 0) {
      const instance = runningInstances[0] as Record<string, unknown>;
      if (typeof instance.name === 'string') return instance.name;
      if (typeof instance.title === 'string') return instance.title;
    }
    return null;
  }

  private determineState(params: {
    cognitiveLoad: number;
    focusDuration: number;
    contextSwitches: number;
    distractionCount: number;
    timeSinceLastSwitch: number;
  }): AttentionState {
    const { cognitiveLoad, focusDuration, contextSwitches, distractionCount, timeSinceLastSwitch } = params;

    // Overloaded: very high cognitive load
    if (cognitiveLoad >= 85) return AttentionState.Overloaded;

    // Fatigued: very long focus duration without break (>45 min)
    if (focusDuration > 45) return AttentionState.Fatigued;

    // Context switching: frequent switches in short window
    if (timeSinceLastSwitch < 60 && contextSwitches > 3) {
      return AttentionState.ContextSwitching;
    }

    // Distracted: multiple distraction events
    if (distractionCount >= 3) return AttentionState.Distracted;

    // Idle: very low cognitive load
    if (cognitiveLoad <= 10 && focusDuration <= 1) return AttentionState.Idle;

    // Focused: moderate cognitive load, sustained focus
    if (focusDuration >= 5 && cognitiveLoad >= 20 && cognitiveLoad <= 70) {
      return AttentionState.Focused;
    }

    return AttentionState.Unknown;
  }
}
