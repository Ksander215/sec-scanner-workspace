/**
 * Personal Intelligence Runtime — Daily Brief Subsystem
 *
 * Generates, stores, and delivers curated daily briefs at
 * scheduled intervals.  Owns all brief data.
 */
import { BriefType } from './types.js';
import type { DailyBrief, GoalRef, PersonalRecommendation, Prediction } from './types.js';
import type { PersonalRuntimeContracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import { DailyBriefError } from './errors.js';

// ── Config ──────────────────────────────────────────────────────

export interface DailyBriefRuntimeConfig {
  readonly maxBriefs?: number;
  readonly morningBriefTime?: string;
}

// ── Brief input ─────────────────────────────────────────────────

interface BriefInput {
  readonly type: BriefType;
  readonly date: string;
  readonly summary: string;
  readonly keyPoints?: readonly string[];
  readonly goals?: readonly GoalRef[];
  readonly recommendations?: readonly PersonalRecommendation[];
  readonly predictions?: readonly Prediction[];
  readonly metrics?: Readonly<Record<string, number>>;
}

export class DailyBriefRuntime {
  private contracts: PersonalRuntimeContracts;
  private briefs = new Map<string, DailyBrief>();
  private delivered = new Set<string>();
  private readonly maxBriefs: number;

  constructor(contracts: PersonalRuntimeContracts, config?: DailyBriefRuntimeConfig) {
    this.contracts = contracts;
    this.maxBriefs = config?.maxBriefs ?? 365;
  }

  // ── Generate ──────────────────────────────────────────────────

  generateBrief(input: BriefInput): DailyBrief {
    if (!input.summary.trim()) {
      throw new DailyBriefError('Brief summary must be non-empty');
    }

    if (this.briefs.size >= this.maxBriefs) {
      // Evict the oldest brief to make room
      const oldest = this.findOldestBriefId();
      if (oldest) {
        this.briefs.delete(oldest);
        this.delivered.delete(oldest);
      }
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const brief: DailyBrief = Object.freeze({
      id,
      type: input.type,
      date: input.date,
      summary: input.summary.trim(),
      keyPoints: Object.freeze(input.keyPoints ? [...input.keyPoints] : []),
      goals: Object.freeze(input.goals ? [...input.goals] : []),
      recommendations: Object.freeze(input.recommendations ? [...input.recommendations] : []),
      predictions: Object.freeze(input.predictions ? [...input.predictions] : []),
      metrics: Object.freeze(input.metrics ? { ...input.metrics } : {}),
      createdAt: now,
    });

    this.briefs.set(id, brief);

    const base = createPersonalEventBase('DailyBriefGenerated', EventClassification.Info, id);
    void this.contracts.platform.publishEvent('DailyBriefGenerated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        briefId: id,
        type: brief.type,
        date: brief.date,
        createdAt: now,
      },
    });

    return brief;
  }

  // ── Deliver ───────────────────────────────────────────────────

  deliverBrief(briefId: string): DailyBrief {
    const brief = this.briefs.get(briefId);
    if (!brief) {
      throw new DailyBriefError(`Brief not found: ${briefId}`);
    }

    this.delivered.add(briefId);

    const now = new Date().toISOString();
    const base = createPersonalEventBase('DailyBriefDelivered', EventClassification.Action, briefId);
    void this.contracts.platform.publishEvent('DailyBriefDelivered', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        briefId,
        type: brief.type,
        deliveredAt: now,
      },
    });

    return brief;
  }

  // ── Queries ───────────────────────────────────────────────────

  getBrief(briefId: string): DailyBrief {
    const brief = this.briefs.get(briefId);
    if (!brief) {
      throw new DailyBriefError(`Brief not found: ${briefId}`);
    }
    return brief;
  }

  getBriefsByDate(date: string): readonly DailyBrief[] {
    return Object.freeze(
      Array.from(this.briefs.values()).filter(b => b.date === date),
    );
  }

  getBriefsByType(type: BriefType): readonly DailyBrief[] {
    return Object.freeze(
      Array.from(this.briefs.values()).filter(b => b.type === type),
    );
  }

  getLatestBrief(): DailyBrief | null {
    if (this.briefs.size === 0) return null;
    const sorted = Array.from(this.briefs.values()).sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
    return sorted[0] ?? null;
  }

  getUndeliveredBriefs(): readonly DailyBrief[] {
    return Object.freeze(
      Array.from(this.briefs.values()).filter(b => !this.delivered.has(b.id)),
    );
  }

  getDeliveredBriefs(): readonly DailyBrief[] {
    return Object.freeze(
      Array.from(this.briefs.values()).filter(b => this.delivered.has(b.id)),
    );
  }

  getAllBriefs(): readonly DailyBrief[] {
    return Object.freeze(Array.from(this.briefs.values()));
  }

  getBriefCount(): number {
    return this.briefs.size;
  }

  isDelivered(briefId: string): boolean {
    return this.delivered.has(briefId);
  }

  // ── Metrics aggregation ───────────────────────────────────────

  getMetricHistory(metricKey: string, limit?: number): readonly { date: string; value: number }[] {
    const entries: { date: string; value: number }[] = [];

    for (const brief of this.briefs.values()) {
      if (metricKey in brief.metrics) {
        entries.push({
          date: brief.date,
          value: brief.metrics[metricKey],
        });
      }
    }

    // Sort by date descending
    entries.sort((a, b) => b.date.localeCompare(a.date));

    const max = limit ?? entries.length;
    return Object.freeze(entries.slice(0, max));
  }

  getMetricTrend(metricKey: string): 'improving' | 'declining' | 'stable' | 'unknown' {
    const history = this.getMetricHistory(metricKey, 7);
    if (history.length < 2) return 'unknown';

    // Compare the average of the first half to the second half
    const mid = Math.floor(history.length / 2);
    const firstHalf = history.slice(mid);
    const secondHalf = history.slice(0, mid);

    const firstAvg = firstHalf.reduce((sum, e) => sum + e.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, e) => sum + e.value, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;
    const threshold = firstAvg * 0.05;

    if (diff > threshold) return 'improving';
    if (diff < -threshold) return 'declining';
    return 'stable';
  }

  // ── Delete ────────────────────────────────────────────────────

  deleteBrief(briefId: string): void {
    if (!this.briefs.has(briefId)) {
      throw new DailyBriefError(`Brief not found: ${briefId}`);
    }
    this.briefs.delete(briefId);
    this.delivered.delete(briefId);
  }

  // ── Private helpers ───────────────────────────────────────────

  private findOldestBriefId(): string | null {
    let oldest: string | null = null;
    let oldestTime = '';

    for (const [id, brief] of this.briefs) {
      if (!oldest || brief.createdAt < oldestTime) {
        oldest = id;
        oldestTime = brief.createdAt;
      }
    }

    return oldest;
  }
}
