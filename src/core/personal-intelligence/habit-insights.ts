/**
 * Personal Intelligence Pack — Habit Insights
 * TASK-AIS-007A.000
 *
 * Detects, tracks, and provides insights on behavioral habits.
 */
import type { PersonalIntelligenceContracts } from './contracts.js';
import type { PackHabit, PackHabitId, HabitStrength, HabitDirection } from './types.js';
import { HabitStrength as HS, HabitDirection as HD } from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import { HabitInsightError } from './errors.js';

export class HabitInsights {
  private contracts: PersonalIntelligenceContracts;
  private habits = new Map<string, PackHabit>();
  private readonly maxHabits: number;

  constructor(contracts: PersonalIntelligenceContracts, maxHabits = 100) {
    this.contracts = contracts;
    this.maxHabits = maxHabits;
  }

  detectHabit(name: string, description: string, direction: HabitDirection, strength?: HabitStrength, pattern?: string): PackHabit {
    if (!name.trim()) throw new HabitInsightError('name is required');
    if (this.habits.size >= this.maxHabits) throw new HabitInsightError('Maximum habit count reached');
    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID() as unknown as PackHabitId;
    const habit: PackHabit = Object.freeze({
      id, name: name.trim(), description: description.trim(),
      strength: strength ?? HS.Emerging, direction,
      frequency: 'daily', pattern: pattern ?? '',
      impact: this.assessImpact(direction, strength ?? HS.Emerging),
      suggestion: this.generateSuggestion(direction),
      observationCount: 1, confidence: 0.5,
      createdAt: now, lastObservedAt: now,
    });
    this.habits.set(id as unknown as string, habit);
    const base = createPackEventBase('HabitInsightDetected', EventClassification.Info, id as unknown as string);
    void this.contracts.platform.publishEvent('HabitInsightDetected', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { habitId: id, name, strength: habit.strength, direction, detectedAt: now },
    });
    return habit;
  }

  recordObservation(id: string): PackHabit {
    const existing = this.getOrThrow(id);
    const now = new Date().toISOString() as Timestamp;
    const newCount = existing.observationCount + 1;
    const newConfidence = Math.min(1, 0.5 + (newCount * 0.05));
    let newStrength = existing.strength;
    if (newCount >= 30) newStrength = HS.Core;
    else if (newCount >= 15) newStrength = HS.Strong;
    else if (newCount >= 7) newStrength = HS.Established;
    const updated: PackHabit = Object.freeze({
      ...existing, observationCount: newCount, confidence: newConfidence,
      strength: newStrength, lastObservedAt: now,
    });
    this.habits.set(id, updated);
    return updated;
  }

  getHabit(id: string): PackHabit { return this.getOrThrow(id); }

  getByDirection(direction: HabitDirection): readonly PackHabit[] {
    return Object.freeze(Array.from(this.habits.values()).filter(h => h.direction === direction));
  }

  getByStrength(strength: HabitStrength): readonly PackHabit[] {
    return Object.freeze(Array.from(this.habits.values()).filter(h => h.strength === strength));
  }

  getTopPositiveHabits(limit = 5): readonly PackHabit[] {
    return Object.freeze(
      [...this.getByDirection(HD.Positive)]
        .sort((a: PackHabit, b: PackHabit) => b.confidence - a.confidence)
        .slice(0, limit),
    );
  }

  getTopNegativeHabits(limit = 5): readonly PackHabit[] {
    return Object.freeze(
      [...this.getByDirection(HD.Negative)]
        .sort((a: PackHabit, b: PackHabit) => b.confidence - a.confidence)
        .slice(0, limit),
    );
  }

  getAllHabits(): readonly PackHabit[] { return Object.freeze(Array.from(this.habits.values())); }
  getHabitCount(): number { return this.habits.size; }

  dispose(): void { this.habits.clear(); }

  // ── Private ───────────────────────────────────────────────

  private getOrThrow(id: string): PackHabit {
    const h = this.habits.get(id);
    if (!h) throw new HabitInsightError(`Habit not found: ${id}`);
    return h;
  }

  private assessImpact(direction: HabitDirection, strength: HabitStrength): string {
    if (direction === HD.Positive) {
      return `This ${strength.toString().toLowerCase()} positive habit contributes to productivity`;
    }
    return `This ${strength.toString().toLowerCase()} negative habit may hinder progress`;
  }

  private generateSuggestion(direction: HabitDirection): string {
    if (direction === HD.Positive) return 'Continue strengthening this habit through consistent practice';
    if (direction === HD.Negative) return 'Consider replacing this habit with an alternative positive behavior';
    return 'Monitor this habit for further patterns';
  }
}
