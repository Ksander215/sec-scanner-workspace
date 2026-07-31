/**
 * Personal Intelligence Runtime — Reflection Subsystem
 *
 * Generates structured reflections on accomplishments, patterns,
 * and improvements over defined time periods.
 * Owns all reflection data.
 */
import type { Reflection } from './types.js';
import { ReflectionPeriod } from './types.js';
import type { PersonalRuntimeContracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
export class ReflectionRuntime {
  private contracts: PersonalRuntimeContracts;
  private reflections = new Map<string, Reflection>();

  constructor(contracts: PersonalRuntimeContracts) {
    this.contracts = contracts;
  }

  // ── Generate ──────────────────────────────────────────────────

  async generateReflection(
    period: ReflectionPeriod,
    date?: string,
    accomplished?: readonly string[],
    notAccomplished?: readonly string[],
  ): Promise<Reflection> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const reflectionDate = date ?? new Date().toISOString().slice(0, 10);
    const accomplishedList = accomplished ? [...accomplished] : [];
    const notAccomplishedList = notAccomplished ? [...notAccomplished] : [];

    // Calculate score based on accomplished vs not accomplished ratio
    const total = accomplishedList.length + notAccomplishedList.length;
    let baseScore = total > 0
      ? (accomplishedList.length / total) * 100
      : 50; // neutral if nothing was tracked

    // Bonus for having any accomplishments
    if (accomplishedList.length > 0) {
      baseScore = Math.min(100, baseScore + 10);
    }
    // Penalty for many unaccomplished items
    if (notAccomplishedList.length > accomplishedList.length * 2) {
      baseScore = Math.max(0, baseScore - 15);
    }

    const score = Math.round(baseScore);

    // Analyze patterns and generate improvements
    const patterns = this.analyzePatterns(accomplishedList, notAccomplishedList, period);
    const improvements = this.suggestImprovements(accomplishedList, notAccomplishedList, score);
    const changes = this.identifyChanges(notAccomplishedList);

    const reflection: Reflection = Object.freeze({
      id,
      period,
      date: reflectionDate,
      accomplished: Object.freeze(accomplishedList),
      notAccomplished: Object.freeze(notAccomplishedList),
      changes: Object.freeze(changes),
      patterns: Object.freeze(patterns),
      improvements: Object.freeze(improvements),
      score,
      createdAt: now,
    });

    this.reflections.set(id, reflection);

    // Emit ReflectionGenerated
    const genBase = createPersonalEventBase('ReflectionGenerated', EventClassification.Info, id);
    await this.contracts.platform.publishEvent('ReflectionGenerated', {
      ...genBase,
      sequence: 0,
      version: '1.0.0',
      payload: {
        reflectionId: id,
        period: reflection.period,
        date: reflection.date,
        score,
        createdAt: now,
      },
    });

    // Emit ReflectionScored
    const scoreBase = createPersonalEventBase('ReflectionScored', EventClassification.Result, id);
    await this.contracts.platform.publishEvent('ReflectionScored', {
      ...scoreBase,
      sequence: 0,
      version: '1.0.0',
      payload: {
        reflectionId: id,
        score,
        scoredAt: now,
      },
    });

    return reflection;
  }

  // ── Queries ──────────────────────────────────────────────────

  getReflections(period?: ReflectionPeriod): readonly Reflection[] {
    const all = Array.from(this.reflections.values());
    const filtered = period !== undefined
      ? all.filter(r => r.period === period)
      : all;
    return Object.freeze(filtered);
  }

  getLatestReflection(period: ReflectionPeriod): Reflection | null {
    const matching = Array.from(this.reflections.values())
      .filter(r => r.period === period)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return matching[0] ?? null;
  }

  getAverageScore(period: ReflectionPeriod): number {
    const matching = Array.from(this.reflections.values())
      .filter(r => r.period === period);
    if (matching.length === 0) return 0;
    const sum = matching.reduce((acc, r) => acc + r.score, 0);
    return Math.round((sum / matching.length) * 100) / 100;
  }

  getTrend(period: ReflectionPeriod): 'improving' | 'declining' | 'stable' {
    const matching = Array.from(this.reflections.values())
      .filter(r => r.period === period)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    if (matching.length < 2) return 'stable';

    // Compare the average of the first half to the second half
    const mid = Math.floor(matching.length / 2);
    const firstHalf = matching.slice(0, mid);
    const secondHalf = matching.slice(mid);

    const firstAvg = firstHalf.reduce((sum, r) => sum + r.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r.score, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;
    const threshold = 5; // absolute points

    if (diff > threshold) return 'improving';
    if (diff < -threshold) return 'declining';
    return 'stable';
  }

  // ── Dispose ──────────────────────────────────────────────────

  dispose(): void {
    this.reflections.clear();
  }

  // ── Private helpers ──────────────────────────────────────────

  private analyzePatterns(
    accomplished: readonly string[],
    _notAccomplished: readonly string[],
    period: ReflectionPeriod,
  ): string[] {
    const patterns: string[] = [];

    if (accomplished.length === 0) {
      patterns.push(`No accomplishments recorded for this ${period.toLowerCase()} period`);
      return patterns;
    }

    // Detect productivity patterns
    const taskCount = accomplished.length;
    if (taskCount >= 5) {
      patterns.push(`High productivity: ${taskCount} items accomplished`);
    } else if (taskCount >= 2) {
      patterns.push(`Moderate productivity: ${taskCount} items accomplished`);
    } else {
      patterns.push(`Low productivity: only ${taskCount} item${taskCount === 1 ? '' : 's'} accomplished`);
    }

    // Check for category patterns
    const categories = new Map<string, number>();
    for (const item of accomplished) {
      // Simple keyword-based categorization
      if (/(meeting|call|sync|standup|1:1)/i.test(item)) {
        categories.set('communication', (categories.get('communication') ?? 0) + 1);
      } else if (/(code|implement|build|fix|debug|review)/i.test(item)) {
        categories.set('development', (categories.get('development') ?? 0) + 1);
      } else if (/(learn|read|study|research|watch)/i.test(item)) {
        categories.set('learning', (categories.get('learning') ?? 0) + 1);
      } else if (/(write|document|plan|design)/i.test(item)) {
        categories.set('planning', (categories.get('planning') ?? 0) + 1);
      }
    }

    if (categories.size > 0) {
      const top = [...categories.entries()].sort((a, b) => b[1] - a[1])[0];
      patterns.push(`Primary activity category: ${top[0]} (${top[1]} items)`);
    }

    return patterns;
  }

  private suggestImprovements(
    accomplished: readonly string[],
    notAccomplished: readonly string[],
    score: number,
  ): string[] {
    const improvements: string[] = [];

    if (score < 40) {
      improvements.push('Consider reducing the number of planned items to improve completion rate');
    }

    if (notAccomplished.length > accomplished.length) {
      improvements.push('More items were not accomplished than accomplished — review planning estimates');
    }

    if (accomplished.length === 0 && notAccomplished.length > 0) {
      improvements.push('No items were completed; investigate blockers and reprioritize');
    }

    if (score >= 80) {
      improvements.push('Strong performance — consider increasing challenge level next period');
    }

    if (notAccomplished.length >= 3) {
      improvements.push('Consider breaking larger items into smaller, more manageable tasks');
    }

    return improvements;
  }

  private identifyChanges(notAccomplished: readonly string[]): string[] {
    const changes: string[] = [];

    if (notAccomplished.length > 0) {
      changes.push(`Defer or reschedule ${notAccomplished.length} uncompleted item${notAccomplished.length === 1 ? '' : 's'}`);
    }

    // Suggest specific changes based on keywords in not-accomplished items
    for (const item of notAccomplished) {
      if (/(urgent|asap|critical)/i.test(item)) {
        changes.push(`Escalate or deprioritize: "${item}"`);
      }
    }

    return changes;
  }
}
