/**
 * Personal Intelligence Runtime — Habit Subsystem
 *
 * Detects, tracks, and manages recurring behavioral patterns
 * observed from user activity.  Owns all habit data.
 */
import { HabitFrequency } from './types.js';
import type { Habit } from './types.js';
import type { PersonalRuntimeContracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import { HabitError } from './errors.js';

// ── Config ──────────────────────────────────────────────────────

export interface HabitRuntimeConfig {
  readonly maxHabits?: number;
  readonly detectionThreshold?: number;
}

// ── Observation input ───────────────────────────────────────────

interface ObservationInput {
  readonly name: string;
  readonly description: string;
  readonly frequency: HabitFrequency;
  readonly daysOfWeek?: readonly number[];
  readonly timeOfDay?: string | null;
  readonly afterActivity?: string | null;
}

export class HabitRuntime {
  private contracts: PersonalRuntimeContracts;
  private habits = new Map<string, Habit>();
  private readonly maxHabits: number;
  private readonly detectionThreshold: number;

  constructor(contracts: PersonalRuntimeContracts, config?: HabitRuntimeConfig) {
    this.contracts = contracts;
    this.maxHabits = config?.maxHabits ?? 200;
    this.detectionThreshold = config?.detectionThreshold ?? 0.5;
  }

  // ── Record observation ────────────────────────────────────────

  recordObservation(input: ObservationInput): Habit {
    if (!input.name.trim()) {
      throw new HabitError('invalid', 'Habit name must be non-empty');
    }

    // Check for an existing habit with the same name (case-insensitive)
    const normalized = input.name.trim().toLowerCase();
    for (const [id, habit] of this.habits) {
      if (habit.name.toLowerCase() === normalized) {
        return this.incrementObservation(id);
      }
    }

    // New habit
    if (this.habits.size >= this.maxHabits) {
      throw new HabitError('capacity', 'Maximum habit count reached');
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const habit: Habit = Object.freeze({
      id,
      name: input.name.trim(),
      description: input.description,
      frequency: input.frequency,
      daysOfWeek: Object.freeze(input.daysOfWeek ? [...input.daysOfWeek] : []),
      timeOfDay: input.timeOfDay ?? null,
      afterActivity: input.afterActivity ?? null,
      confidence: 0.3,
      observationCount: 1,
      lastObservedAt: now,
      createdAt: now,
    });

    this.habits.set(id, habit);

    const base = createPersonalEventBase('HabitDetected', EventClassification.Info, id);
    void this.contracts.platform.publishEvent('HabitDetected', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        habitId: id,
        name: habit.name,
        frequency: habit.frequency,
        confidence: habit.confidence,
        detectedAt: now,
      },
    });

    return habit;
  }

  // ── Confirm habit ─────────────────────────────────────────────

  confirmHabit(habitId: string): Habit {
    const habit = this.habits.get(habitId);
    if (!habit) {
      throw new HabitError(habitId, 'Habit not found');
    }

    const now = new Date().toISOString();
    const confirmed: Habit = Object.freeze({
      ...habit,
      confidence: Math.min(1, habit.confidence + 0.2),
      lastObservedAt: now,
    });

    this.habits.set(habitId, confirmed);

    const base = createPersonalEventBase('HabitConfirmed', EventClassification.StateChange, habitId);
    void this.contracts.platform.publishEvent('HabitConfirmed', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        habitId,
        confirmedAt: now,
      },
    });

    return confirmed;
  }

  // ── Mark habit as broken ──────────────────────────────────────

  recordHabitBroken(habitId: string): Habit {
    const habit = this.habits.get(habitId);
    if (!habit) {
      throw new HabitError(habitId, 'Habit not found');
    }

    const now = new Date().toISOString();
    const broken: Habit = Object.freeze({
      ...habit,
      confidence: Math.max(0, habit.confidence - 0.3),
      lastObservedAt: now,
    });

    this.habits.set(habitId, broken);

    const base = createPersonalEventBase('HabitBroken', EventClassification.Info, habitId);
    void this.contracts.platform.publishEvent('HabitBroken', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        habitId,
        name: habit.name,
        brokenAt: now,
      },
    });

    return broken;
  }

  // ── Update habit fields ───────────────────────────────────────

  updateHabit(
    habitId: string,
    updates: {
      readonly name?: string;
      readonly description?: string;
      readonly frequency?: HabitFrequency;
      readonly daysOfWeek?: readonly number[];
      readonly timeOfDay?: string | null;
      readonly afterActivity?: string | null;
    },
  ): Habit {
    const habit = this.habits.get(habitId);
    if (!habit) {
      throw new HabitError(habitId, 'Habit not found');
    }

    if (updates.name !== undefined && !updates.name.trim()) {
      throw new HabitError(habitId, 'Habit name must be non-empty');
    }

    const updated: Habit = Object.freeze({
      ...habit,
      name: updates.name !== undefined ? updates.name.trim() : habit.name,
      description: updates.description !== undefined ? updates.description : habit.description,
      frequency: updates.frequency !== undefined ? updates.frequency : habit.frequency,
      daysOfWeek: updates.daysOfWeek !== undefined ? Object.freeze([...updates.daysOfWeek]) : habit.daysOfWeek,
      timeOfDay: updates.timeOfDay !== undefined ? updates.timeOfDay : habit.timeOfDay,
      afterActivity: updates.afterActivity !== undefined ? updates.afterActivity : habit.afterActivity,
    });

    this.habits.set(habitId, updated);
    return updated;
  }

  // ── Detect patterns from activities ───────────────────────────

  detectPatterns(
    activities: readonly {
      readonly name: string;
      readonly timestamp: string;
      readonly type?: string;
    }[],
  ): readonly Habit[] {
    if (activities.length < 2) {
      return Object.freeze([]);
    }

    // Group activities by name to find repeated patterns
    const nameCounts = new Map<string, { count: number; timestamps: string[]; types: Set<string> }>();

    for (const activity of activities) {
      const key = activity.name;
      const existing = nameCounts.get(key);
      if (existing) {
        existing.count += 1;
        existing.timestamps.push(activity.timestamp);
        if (activity.type) {
          existing.types.add(activity.type);
        }
      } else {
        nameCounts.set(key, {
          count: 1,
          timestamps: [activity.timestamp],
          types: activity.type ? new Set([activity.type]) : new Set(),
        });
      }
    }

    const detected: Habit[] = [];

    for (const [name, data] of nameCounts) {
      if (data.count < 2) continue;

      // Skip if we already track a habit with this name
      const normalized = name.toLowerCase();
 const alreadyTracked = Array.from(this.habits.values()).some(
        h => h.name.toLowerCase() === normalized,
      );
      if (alreadyTracked) continue;

      if (detected.length >= 5) break;

      const confidence = Math.min(1, data.count / activities.length);
      if (confidence < this.detectionThreshold) continue;

      // Infer frequency from timestamps
      const daysOfWeek = this.extractDaysOfWeek(data.timestamps);
      const timeOfDay = this.extractCommonTimeOfDay(data.timestamps);
      const frequency = this.inferFrequency(daysOfWeek, data.count, activities.length);

      const now = new Date().toISOString();
      const id = crypto.randomUUID();

      const habit: Habit = Object.freeze({
        id,
        name,
        description: `Detected pattern: ${name} occurs with ${data.count} observations`,
        frequency,
        daysOfWeek: Object.freeze(daysOfWeek),
        timeOfDay,
        afterActivity: null,
        confidence,
        observationCount: data.count,
        lastObservedAt: data.timestamps[data.timestamps.length - 1],
        createdAt: now,
      });

      if (this.habits.size < this.maxHabits) {
        this.habits.set(id, habit);
        detected.push(habit);

        const base = createPersonalEventBase('HabitDetected', EventClassification.Info, id);
        void this.contracts.platform.publishEvent('HabitDetected', {
          ...base,
          sequence: 0,
          version: '1.0.0',
          payload: {
            habitId: id,
            name: habit.name,
            frequency: habit.frequency,
            confidence: habit.confidence,
            detectedAt: now,
          },
        });
      }
    }

    return Object.freeze(detected);
  }

  // ── Queries ───────────────────────────────────────────────────

  getHabit(habitId: string): Habit {
    const habit = this.habits.get(habitId);
    if (!habit) {
      throw new HabitError(habitId, 'Habit not found');
    }
    return habit;
  }

  getHabitsByFrequency(frequency: HabitFrequency): readonly Habit[] {
    return Object.freeze(
      Array.from(this.habits.values()).filter(h => h.frequency === frequency),
    );
  }

  getHighConfidenceHabits(threshold = 0.7): readonly Habit[] {
    return Object.freeze(
      Array.from(this.habits.values()).filter(h => h.confidence >= threshold),
    );
  }

  getAllHabits(): readonly Habit[] {
    return Object.freeze(Array.from(this.habits.values()));
  }

  getHabitCount(): number {
    return this.habits.size;
  }

  // ── Private helpers ───────────────────────────────────────────

  private incrementObservation(habitId: string): Habit {
    const habit = this.habits.get(habitId);
    if (!habit) {
      throw new HabitError(habitId, 'Habit not found during observation increment');
    }

    const now = new Date().toISOString();
    const newCount = habit.observationCount + 1;
    // Confidence grows logarithmically toward 1.0
    const newConfidence = Math.min(1, 1 - (1 - habit.confidence) / (1 + 0.1));

    const updated: Habit = Object.freeze({
      ...habit,
      observationCount: newCount,
      confidence: Math.round(newConfidence * 1000) / 1000,
      lastObservedAt: now,
    });

    this.habits.set(habitId, updated);
    return updated;
  }

  private extractDaysOfWeek(timestamps: readonly string[]): number[] {
    const dayCounts = new Map<number, number>();
    for (const ts of timestamps) {
      const day = new Date(ts).getDay();
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }

    const total = timestamps.length;
    const threshold = total * 0.4;
    const days: number[] = [];

    for (const [day, count] of dayCounts) {
      if (count >= threshold) {
        days.push(day);
      }
    }

    return days.sort((a, b) => a - b);
  }

  private extractCommonTimeOfDay(timestamps: readonly string[]): string | null {
    if (timestamps.length < 2) return null;

    const hours = timestamps.map(ts => new Date(ts).getHours());
    const avgHour = hours.reduce((sum, h) => sum + h, 0) / hours.length;
    const roundedHour = Math.round(avgHour);

    // Check if hours are clustered within a 2-hour window
    const minHour = Math.min(...hours);
    const maxHour = Math.max(...hours);
    if (maxHour - minHour > 2) return null;

    return `${String(roundedHour).padStart(2, '0')}:00`;
  }

  private inferFrequency(daysOfWeek: readonly number[], count: number, total: number): HabitFrequency {
    if (daysOfWeek.length === 7 || daysOfWeek.length === 0) {
      return HabitFrequency.Daily;
    }

    const weekdayDays = daysOfWeek.filter(d => d >= 1 && d <= 5);
    const weekendDays = daysOfWeek.filter(d => d === 0 || d === 6);

    if (weekdayDays.length > 0 && weekendDays.length === 0) {
      return HabitFrequency.Weekday;
    }
    if (weekendDays.length > 0 && weekdayDays.length === 0) {
      return HabitFrequency.Weekend;
    }

    if (count / total <= 0.15) {
      return HabitFrequency.Monthly;
    }

    return HabitFrequency.Weekly;
  }
}
