/**
 * Experience Runtime — Subsystem 2: Preference Evolution
 * TASK-AIS-004A.000
 *
 * Tracks preference changes statistically. No instant changes —
 * only accumulation of evidence through observations.
 *
 * Conforms to: DOM-002, ADR-014, CON-001, AL-012
 */

import type { ExperienceRuntimeConfig } from './types.js';
import type {
  Observation,
  Preference,
  PreferenceChange,
  PreferenceId,
} from './types.js';
import { PreferenceState } from './types.js';
import { PreferenceChanged } from './events.js';
import { PreferenceValidationError } from './errors.js';
import { createId } from '../domain/identifiers.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { TraceCollector } from '../trace/trace-collector.js';

/** Internal observation window for a single preference key */
interface PreferenceWindow {
  readonly key: string;
  readonly observations: Observation[];
  readonly preference: Preference | null;
  readonly history: PreferenceChange[];
}

/** Sliding window capacity */
const SLIDING_WINDOW_SIZE = 100;

export class PreferenceEvolution {
  private readonly config: ExperienceRuntimeConfig;
  private readonly eventBus: InProcessEventBus | undefined;
  private readonly trace: TraceCollector;
  /** userIdHash → (preferenceKey → window) */
  private readonly userPreferences = new Map<string, Map<string, PreferenceWindow>>();

  constructor(config: ExperienceRuntimeConfig, eventBus?: InProcessEventBus, trace?: TraceCollector) {
    this.config = config;
    this.eventBus = eventBus;
    this.trace = trace ?? new TraceCollector();
    this.trace.traceInfo('PreferenceEvolution initialized', {
      minPreferenceConfidence: config.minPreferenceConfidence,
    });
  }

  /**
   * Accumulate an observation as evidence for a preference.
   * Observations are placed into a sliding window per (user, key).
   */
  recordObservation(observation: Observation): void {
    if (!observation.userIdHash || typeof observation.userIdHash !== 'string') {
      throw new PreferenceValidationError(
        'Observation must have a valid userIdHash',
        { userIdHash: observation.userIdHash },
      );
    }

    // Extract the preference key from the observation type or value
    const key = this.extractPreferenceKey(observation);
    if (!key) {
      this.trace.traceInfo('Observation skipped: no extractable preference key', {
        observationId: observation.id,
        type: observation.type,
      });
      return;
    }

    const window = this.getOrCreateWindow(observation.userIdHash, key);

    // Add to sliding window, evicting oldest if over capacity
    const observations = [...window.observations, observation];
    const trimmed = observations.length > SLIDING_WINDOW_SIZE
      ? observations.slice(observations.length - SLIDING_WINDOW_SIZE)
      : observations;

    // Recalculate preference from accumulated evidence
    const updatedPreference = this.recalculatePreference(
      observation.userIdHash,
      key,
      trimmed,
      window.preference,
    );

    // Store updated window (immutable update)
    this.setWindow(observation.userIdHash, key, {
      key,
      observations: trimmed,
      preference: updatedPreference,
      history: window.history,
    });

    this.trace.traceInfo('Observation accumulated for preference', {
      observationId: observation.id,
      userIdHash: observation.userIdHash,
      preferenceKey: key,
      windowSize: trimmed.length,
      confidence: updatedPreference?.confidence,
    });
  }

  /** Get a single preference by key */
  getPreference(userIdHash: string, key: string): Preference | null {
    const userPrefs = this.userPreferences.get(userIdHash);
    if (!userPrefs) return null;
    return userPrefs.get(key)?.preference ?? null;
  }

  /** Get all preferences for a user */
  getAllPreferences(userIdHash: string): readonly Preference[] {
    const userPrefs = this.userPreferences.get(userIdHash);
    if (!userPrefs) return [];
    const result: Preference[] = [];
    for (const window of userPrefs.values()) {
      if (window.preference) {
        result.push(window.preference);
      }
    }
    return result;
  }

  /** Get the history of preference changes for a given key */
  getPreferenceHistory(userIdHash: string, key: string): readonly PreferenceChange[] {
    const userPrefs = this.userPreferences.get(userIdHash);
    if (!userPrefs) return [];
    return userPrefs.get(key)?.history ?? [];
  }

  /**
   * Detect whether a preference has changed based on accumulated evidence.
   * Only detects when confidence >= config.minPreferenceConfidence.
   * Records the change in history and emits a PreferenceChanged event.
   */
  detectPreferenceChange(userIdHash: string, key: string): PreferenceChange | null {
    const userPrefs = this.userPreferences.get(userIdHash);
    if (!userPrefs) return null;
    const window = userPrefs.get(key);
    if (!window || !window.preference) return null;

    const currentPref = window.preference;

    // Not enough observations to detect change
    if (currentPref.observationCount < 3) {
      return null;
    }

    // Confidence threshold not met
    if (currentPref.confidence < this.config.minPreferenceConfidence) {
      return null;
    }

    // Check if there's a statistically different dominant value in recent observations
    const recentSlice = window.observations.slice(-Math.floor(SLIDING_WINDOW_SIZE / 2));
    const valueCounts = new Map<string, number>();
    for (const obs of recentSlice) {
      const val = this.extractPreferenceValue(obs);
      if (val !== null) {
        valueCounts.set(val, (valueCounts.get(val) ?? 0) + 1);
      }
    }

    // Find dominant value
    let dominantValue = '';
    let dominantCount = 0;
    for (const [value, count] of valueCounts) {
      if (count > dominantCount) {
        dominantCount = count;
        dominantValue = value;
      }
    }

    // No change if the dominant value matches current
    if (dominantValue === currentPref.currentValue || dominantValue === '') {
      return null;
    }

    // Calculate confidence for the change
    let totalValues = 0;
    for (const obs of recentSlice) {
      if (this.extractPreferenceValue(obs) !== null) totalValues++;
    }
    const changeConfidence = totalValues > 0 ? dominantCount / totalValues : 0;

    if (changeConfidence < this.config.minPreferenceConfidence) {
      return null;
    }

    const now = new Date().toISOString();
    const change: PreferenceChange = {
      preferenceId: currentPref.id,
      fromValue: currentPref.currentValue,
      toValue: dominantValue,
      confidence: changeConfidence,
      observationCount: totalValues,
      timestamp: now,
    };

    // Update the preference with the new value
    const updatedPreference: Preference = {
      ...currentPref,
      currentValue: dominantValue,
      previousValue: currentPref.currentValue,
      state: PreferenceState.Changing,
      confidence: changeConfidence,
      observationCount: totalValues,
      lastUpdated: now,
      provenance: [...currentPref.provenance, ...recentSlice.map(o => o.id)],
    };

    // Persist updated state
    this.setWindow(userIdHash, key, {
      key,
      observations: window.observations,
      preference: updatedPreference,
      history: [...window.history, change],
    });

    // Emit domain event
    void this.publishPreferenceChanged(change, userIdHash, key);

    this.trace.traceInfo('Preference change detected', {
      userIdHash,
      preferenceKey: key,
      fromValue: change.fromValue,
      toValue: change.toValue,
      confidence: change.confidence,
    });

    return change;
  }

  /**
   * Calculate an overall stability score (0.0–1.0) for a user's preferences.
   * Higher means more stable (fewer recent changes, higher confidences).
   */
  calculateStability(userIdHash: string): number {
    const preferences = this.getAllPreferences(userIdHash);
    if (preferences.length === 0) return 1.0;

    let totalConfidence = 0;
    let changingCount = 0;

    for (const pref of preferences) {
      totalConfidence += pref.confidence;
      if (pref.state === PreferenceState.Changing) {
        changingCount++;
      }
    }

    const avgConfidence = totalConfidence / preferences.length;
    const changingPenalty = changingCount / preferences.length;

    // Stability is a blend of average confidence and lack of changing state
    const stability = avgConfidence * (1 - changingPenalty * 0.5);
    return Math.max(0, Math.min(1, stability));
  }

  // ─── Private Helpers ──────────────────────────────────────────

  /** Extract a preference key from an observation */
  private extractPreferenceKey(observation: Observation): string | null {
    // Observation type is used as the preference key
    if (observation.type && typeof observation.type === 'string') {
      return observation.type;
    }
    // Fallback: check value for a 'key' field
    if (observation.value !== null && typeof observation.value === 'object') {
      const obj = observation.value as Record<string, unknown>;
      const k = obj['key'];
      if (typeof k === 'string' && k.length > 0) return k;
    }
    return null;
  }

  /** Extract a preference value from an observation */
  private extractPreferenceValue(observation: Observation): string | null {
    if (observation.value === null || observation.value === undefined) return null;
    if (typeof observation.value === 'string') return observation.value;
    if (typeof observation.value === 'number') return String(observation.value);
    if (typeof observation.value === 'object') {
      const obj = observation.value as Record<string, unknown>;
      const v = obj['value'] ?? obj['preference'];
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return String(v);
    }
    return null;
  }

  /** Recalculate a preference from accumulated observations */
  private recalculatePreference(
    userIdHash: string,
    key: string,
    observations: readonly Observation[],
    previous: Preference | null,
  ): Preference {
    if (observations.length === 0) {
      return previous ?? this.createEmptyPreference(userIdHash, key, observations);
    }

    // Count value frequencies
    const valueCounts = new Map<string, number>();
    for (const obs of observations) {
      const val = this.extractPreferenceValue(obs);
      if (val !== null) {
        valueCounts.set(val, (valueCounts.get(val) ?? 0) + 1);
      }
    }

    // Find dominant value
    let dominantValue = '';
    let dominantCount = 0;
    for (const [value, count] of valueCounts) {
      if (count > dominantCount) {
        dominantCount = count;
        dominantValue = value;
      }
    }

    if (dominantValue === '') {
      return previous ?? this.createEmptyPreference(userIdHash, key, observations);
    }

    const confidence = observations.length > 0
      ? Math.min(1.0, dominantCount / observations.length)
      : 0;

    const now = new Date().toISOString();
    const firstObserved = previous?.firstObserved ?? observations[0].timestamp;

    let state = PreferenceState.Emerging;
    if (confidence >= this.config.minPreferenceConfidence) {
      state = PreferenceState.Established;
    }
    if (previous?.state === PreferenceState.Changing) {
      state = PreferenceState.Changing;
    }

    return {
      id: previous?.id ?? createId<PreferenceId>(),
      userIdHash,
      key,
      currentValue: dominantValue,
      previousValue: previous?.previousValue,
      state,
      confidence,
      observationCount: observations.length,
      firstObserved,
      lastUpdated: now,
      provenance: observations.map(o => o.id),
    };
  }

  /** Create an empty preference placeholder */
  private createEmptyPreference(
    userIdHash: string,
    key: string,
    observations: readonly Observation[],
  ): Preference {
    const now = new Date().toISOString();
    return {
      id: createId<PreferenceId>(),
      userIdHash,
      key,
      currentValue: '',
      state: PreferenceState.Emerging,
      confidence: 0,
      observationCount: observations.length,
      firstObserved: now,
      lastUpdated: now,
      provenance: observations.map(o => o.id),
    };
  }

  private getOrCreateWindow(userIdHash: string, key: string): PreferenceWindow {
    let userPrefs = this.userPreferences.get(userIdHash);
    if (!userPrefs) {
      userPrefs = new Map();
      this.userPreferences.set(userIdHash, userPrefs);
    }
    let window = userPrefs.get(key);
    if (!window) {
      window = { key, observations: [], preference: null, history: [] };
      userPrefs.set(key, window);
    }
    return window;
  }

  private setWindow(userIdHash: string, key: string, window: PreferenceWindow): void {
    let userPrefs = this.userPreferences.get(userIdHash);
    if (!userPrefs) {
      userPrefs = new Map();
      this.userPreferences.set(userIdHash, userPrefs);
    }
    userPrefs.set(key, window);
  }

  private async publishPreferenceChanged(
    change: PreferenceChange,
    userIdHash: string,
    preferenceKey: string,
  ): Promise<void> {
    if (!this.eventBus) return;
    const domainEvent: PreferenceChanged = {
      eventId: crypto.randomUUID(),
      eventType: 'PreferenceChanged',
      classification: EventClassification.StateChange,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: userIdHash,
      aggregateType: 'PreferenceEvolution',
      version: '1.0.0',
      payload: {
        preferenceId: change.preferenceId,
        userIdHash,
        preferenceKey,
        fromValue: change.fromValue,
        toValue: change.toValue,
        confidence: change.confidence,
        observationCount: change.observationCount,
        changedAt: change.timestamp,
      },
    };
    await this.eventBus.publish(domainEvent);
  }
}
