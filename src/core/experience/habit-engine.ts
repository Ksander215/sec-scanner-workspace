/**
 * Experience Runtime — Subsystem 3: Habit Engine
 * TASK-AIS-004A.000
 *
 * Identifies stable patterns from behavioral observations.
 * A habit is only "detected" when observations meet the minimum
 * occurrence threshold (config.minHabitOccurrences).
 *
 * Conforms to: DOM-002, ADR-014, CON-001, AL-012
 */

import type { ExperienceRuntimeConfig } from './types.js';
import type {
  Observation,
  Habit,
  HabitId,
} from './types.js';
import { HabitPeriodicity, HabitStrength } from './types.js';
import { HabitDetected } from './events.js';
import { HabitNotFoundError } from './errors.js';
import { createId } from '../domain/identifiers.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { TraceCollector } from '../trace/trace-collector.js';

/** Internal pattern candidate before it becomes a detected habit */
interface PatternCandidate {
  readonly name: string;
  readonly observations: Observation[];
  readonly frequency: number;
  readonly periodicity: HabitPeriodicity;
}

/** Minimum window for periodicity detection (in ms) */
const PERIODICITY_DETECTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class HabitEngine {
  private readonly config: ExperienceRuntimeConfig;
  private readonly eventBus: InProcessEventBus | undefined;
  private readonly trace: TraceCollector;
  /** userIdHash → Habit[] (detected habits) */
  private readonly habitsByUser = new Map<string, Habit[]>();
  /** habitId → Habit for fast lookup */
  private readonly habitIndex = new Map<string, Habit>();
  /** userIdHash → Observation[] (raw observations for analysis) */
  private readonly observationsByUser = new Map<string, Observation[]>();

  constructor(config: ExperienceRuntimeConfig, eventBus?: InProcessEventBus, trace?: TraceCollector) {
    this.config = config;
    this.eventBus = eventBus;
    this.trace = trace ?? new TraceCollector();
    this.trace.traceInfo('HabitEngine initialized', {
      minHabitOccurrences: config.minHabitOccurrences,
    });
  }

  /**
   * Analyze observations for a user and detect new habit patterns.
   * Only creates habits when observations meet config.minHabitOccurrences.
   */
  analyzePatterns(userIdHash: string): readonly Habit[] {
    const observations = this.observationsByUser.get(userIdHash);
    if (!observations || observations.length === 0) {
      return this.getHabits(userIdHash);
    }

    // Group observations by type
    const byType = new Map<string, Observation[]>();
    for (const obs of observations) {
      const list = byType.get(obs.type) ?? [];
      list.push(obs);
      byType.set(obs.type, list);
    }

    // Scan each observation type group for pattern candidates
    const candidates: PatternCandidate[] = [];
    for (const [obsType, obsList] of byType) {
      if (obsList.length < this.config.minHabitOccurrences) continue;

      const frequency = obsList.length;
      const periodicity = this.detectPeriodicity(obsList);
      const strength = this.detectHabitStrength(frequency, periodicity);

      // Only consider as candidate if strength is at least Moderate or high frequency
      if (strength !== HabitStrength.Weak || frequency >= this.config.minHabitOccurrences * 2) {
        candidates.push({
          name: `Habit: ${obsType}`,
          observations: obsList,
          frequency,
          periodicity,
        });
      }
    }

    // Detect new habits from candidates
    const newHabits: Habit[] = [];
    for (const candidate of candidates) {
      // Check if we already have a habit with a similar name for this user
      const existing = this.getHabits(userIdHash);
      const alreadyDetected = existing.some(h => h.name === candidate.name);

      if (!alreadyDetected && candidate.frequency >= this.config.minHabitOccurrences) {
        const now = new Date().toISOString();
        const habit: Habit = {
          id: createId<HabitId>(),
          userIdHash,
          name: candidate.name,
          description: `Detected pattern from ${candidate.frequency} observations of type '${candidate.observations[0]?.type ?? 'unknown'}'`,
          periodicity: candidate.periodicity,
          strength: this.detectHabitStrength(candidate.frequency, candidate.periodicity),
          frequency: candidate.frequency,
          lastObserved: candidate.observations[candidate.observations.length - 1].timestamp,
          firstDetected: now,
          observationCount: candidate.frequency,
          pattern: this.extractPattern(candidate.observations),
        };

        newHabits.push(habit);
        this.habitIndex.set(habit.id, habit);

        void this.publishHabitDetected(habit);

        this.trace.traceInfo('Habit detected', {
          habitId: habit.id,
          userIdHash,
          habitName: habit.name,
          periodicity: habit.periodicity,
          strength: habit.strength,
          observationCount: habit.observationCount,
        });
      }
    }

    // Update user habits map
    if (newHabits.length > 0) {
      const existing = this.getHabits(userIdHash);
      this.habitsByUser.set(userIdHash, [...existing, ...newHabits]);
    }

    return this.getHabits(userIdHash);
  }

  /** Get all detected habits for a user */
  getHabits(userIdHash: string): readonly Habit[] {
    return this.habitsByUser.get(userIdHash) ?? [];
  }

  /** Get a specific habit by ID */
  getHabit(habitId: HabitId): Habit | null {
    return this.habitIndex.get(habitId) ?? null;
  }

  /**
   * Update a habit with a new observation. Increments the observation
   * count and recalculates strength. Returns null if habit not found.
   */
  updateHabit(habitId: HabitId, observation: Observation): Habit | null {
    const existing = this.habitIndex.get(habitId);
    if (!existing) {
      throw new HabitNotFoundError(
        `Habit not found: ${habitId}`,
        { habitId },
      );
    }

    // Accumulate observation
    const userObs = this.observationsByUser.get(observation.userIdHash) ?? [];
    userObs.push(observation);
    this.observationsByUser.set(observation.userIdHash, userObs);

    const newFrequency = existing.observationCount + 1;
    const newStrength = this.detectHabitStrength(newFrequency, existing.periodicity);
    const now = new Date().toISOString();

    const updated: Habit = {
      ...existing,
      frequency: newFrequency,
      strength: newStrength,
      lastObserved: now,
      observationCount: newFrequency,
    };

    this.habitIndex.set(habitId, updated);

    // Update user habits array
    const userHabits = this.getHabits(existing.userIdHash);
    this.habitsByUser.set(
      existing.userIdHash,
      userHabits.map(h => h.id === habitId ? updated : h),
    );

    this.trace.traceInfo('Habit updated', {
      habitId,
      userIdHash: existing.userIdHash,
      newFrequency,
      newStrength,
    });

    return updated;
  }

  /**
   * Classify habit strength based on frequency and periodicity.
   * Higher frequency and more regular periodicity yield stronger classification.
   */
  detectHabitStrength(frequency: number, periodicity: HabitPeriodicity): HabitStrength {
    const periodicityWeight: Record<HabitPeriodicity, number> = {
      [HabitPeriodicity.Daily]: 1.5,
      [HabitPeriodicity.Weekly]: 1.3,
      [HabitPeriodicity.Project]: 1.2,
      [HabitPeriodicity.Professional]: 1.1,
      [HabitPeriodicity.AdHoc]: 0.7,
    };

    const weight = periodicityWeight[periodicity] ?? 1.0;
    const adjustedFrequency = frequency * weight;

    if (adjustedFrequency >= 50) return HabitStrength.Core;
    if (adjustedFrequency >= 20) return HabitStrength.Strong;
    if (adjustedFrequency >= 10) return HabitStrength.Moderate;
    return HabitStrength.Weak;
  }

  // ─── Internal Methods for Observation Accumulation ────

  /**
   * Add observations for analysis. Called by external code (e.g. BehaviorRuntime)
   * to feed observations into the habit engine.
   */
  addObservations(userIdHash: string, observations: readonly Observation[]): void {
    const existing = this.observationsByUser.get(userIdHash) ?? [];
    const merged = [...existing, ...observations];
    // Cap at max observations per user
    const capped = merged.length > this.config.maxObservationsPerUser
      ? merged.slice(merged.length - this.config.maxObservationsPerUser)
      : merged;
    this.observationsByUser.set(userIdHash, capped);
  }

  // ─── Private Helpers ─────────────────────────

  /** Detect periodicity from a series of observations */
  private detectPeriodicity(observations: readonly Observation[]): HabitPeriodicity {
    if (observations.length < 2) return HabitPeriodicity.AdHoc;

    const timestamps = observations.map(o => new Date(o.timestamp).getTime());
    timestamps.sort((a, b) => a - b);

    // Calculate inter-observation intervals
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    if (intervals.length === 0) return HabitPeriodicity.AdHoc;

    const avgInterval = intervals.reduce((s, i) => s + i, 0) / intervals.length;

    // Calculate variance to check regularity
    let variance = 0;
    for (const interval of intervals) {
      variance += (interval - avgInterval) ** 2;
    }
    variance /= intervals.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = avgInterval > 0 ? stdDev / avgInterval : 999;

    // Low coefficient of variation means regular pattern
    const isRegular = coefficientOfVariation < 0.5;

    const ONE_HOUR_MS = 60 * 60 * 1000;
    const ONE_DAY_MS = 24 * ONE_HOUR_MS;
    const ONE_WEEK_MS = 7 * ONE_DAY_MS;

    if (!isRegular) return HabitPeriodicity.AdHoc;

    if (avgInterval <= ONE_DAY_MS && observations.length >= 5) {
      return HabitPeriodicity.Daily;
    }
    if (avgInterval <= ONE_WEEK_MS && observations.length >= 4) {
      return HabitPeriodicity.Weekly;
    }
    if (avgInterval <= PERIODICITY_DETECTION_WINDOW_MS) {
      return HabitPeriodicity.Project;
    }

    return HabitPeriodicity.Professional;
  }

  /** Extract a simple pattern description from observations */
  private extractPattern(observations: readonly Observation[]): Readonly<Record<string, unknown>> {
    if (observations.length === 0) return {};

    const timestamps = observations.map(o => new Date(o.timestamp).getTime());
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const avgInterval = observations.length > 1
      ? (maxTs - minTs) / (observations.length - 1)
      : 0;

    return {
      observationType: observations[0].type,
      count: observations.length,
      timespanMs: maxTs - minTs,
      avgIntervalMs: Math.round(avgInterval),
    };
  }

  private async publishHabitDetected(habit: Habit): Promise<void> {
    if (!this.eventBus) return;
    const domainEvent: HabitDetected = {
      eventId: crypto.randomUUID(),
      eventType: 'HabitDetected',
      classification: EventClassification.Info,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: habit.userIdHash,
      aggregateType: 'HabitEngine',
      version: '1.0.0',
      payload: {
        habitId: habit.id,
        userIdHash: habit.userIdHash,
        habitName: habit.name,
        periodicity: habit.periodicity,
        strength: habit.strength,
        observationCount: habit.observationCount,
        detectedAt: habit.firstDetected,
      },
    };
    await this.eventBus.publish(domainEvent);
  }
}
