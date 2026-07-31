/**
 * Personal Intelligence Pack — Daily Brief Generator
 * TASK-AIS-007A.000
 *
 * Generates morning, midday, evening, and weekly briefs.
 * Each brief contains priorities, events, incomplete tasks,
 * recommendations, risks, bottlenecks, and optimizations.
 */
import type { PersonalIntelligenceContracts } from './contracts.js';
import type { PackDailyBrief, PackBriefId, BriefType, BriefItem, BriefItemCategory, BriefPriority } from './types.js';
import { BriefType as BT, BriefItemCategory as BIC, BriefPriority as BP } from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import { BriefNotFoundError } from './errors.js';

export class DailyBriefGenerator {
  private contracts: PersonalIntelligenceContracts;
  private briefs = new Map<string, PackDailyBrief>();
  private readonly maxHistory: number;

  constructor(contracts: PersonalIntelligenceContracts, maxHistory = 90) {
    this.contracts = contracts;
    this.maxHistory = maxHistory;
  }

  generateBrief(type: BriefType, date?: string): PackDailyBrief {
    const now = new Date();
    const briefDate = date ?? now.toISOString().split('T')[0];
    const id = crypto.randomUUID() as unknown as PackBriefId;

    const items = this.buildBriefItems(type, briefDate);
    const summary = this.generateSummary(items);
    const topPriority = this.findTopPriority(items);
    const mainConstraint = this.findMainConstraint(items);
    const mainRecommendation = this.findMainRecommendation(items);
    const productivityIndex = this.calculateProductivityIndex(items);
    const developmentIndex = this.calculateDevelopmentIndex(items);

    const brief: PackDailyBrief = Object.freeze({
      id,
      type,
      date: briefDate,
      items,
      summary,
      topPriority,
      mainConstraint,
      mainRecommendation,
      productivityIndex,
      developmentIndex,
      createdAt: now.toISOString() as Timestamp,
      deliveredAt: null,
    });

    this.briefs.set(id as unknown as string, brief);
    this.evictIfNeeded();

    const base = createPackEventBase('BriefGenerated', EventClassification.Info, id as unknown as string);
    void this.contracts.platform.publishEvent('BriefGenerated', {
      ...base, sequence: 0, version: '1.0.0',
      payload: {
        briefId: id, briefType: type, date: briefDate,
        itemCount: items.length, productivityIndex, developmentIndex,
        generatedAt: now.toISOString(),
      },
    });

    return brief;
  }

  getBrief(id: string): PackDailyBrief {
    const brief = this.briefs.get(id);
    if (!brief) throw new BriefNotFoundError(id);
    return brief;
  }

  getBriefsByType(type: BriefType): readonly PackDailyBrief[] {
    return Object.freeze(
      Array.from(this.briefs.values()).filter(b => b.type === type),
    );
  }

  getBriefsByDate(date: string): readonly PackDailyBrief[] {
    return Object.freeze(
      Array.from(this.briefs.values()).filter(b => b.date === date),
    );
  }

  getLatestBrief(type: BriefType): PackDailyBrief | null {
    const typed = this.getBriefsByType(type);
    if (typed.length === 0) return null;
    return typed[typed.length - 1];
  }

  getAllBriefs(): readonly PackDailyBrief[] {
    return Object.freeze(Array.from(this.briefs.values()));
  }

  getBriefCount(): number { return this.briefs.size; }

  markDelivered(id: string): PackDailyBrief {
    const existing = this.briefs.get(id);
    if (!existing) throw new BriefNotFoundError(id);
    const now = new Date().toISOString() as Timestamp;
    const updated: PackDailyBrief = Object.freeze({
      ...existing, deliveredAt: now,
    });
    this.briefs.set(id, updated);
    return updated;
  }

  dispose(): void { this.briefs.clear(); }

  // ── Private helpers ──────────────────────────────────────

  private buildBriefItems(type: BriefType, date: string): readonly BriefItem[] {
    const items: BriefItem[] = [];
    const categories: BriefItemCategory[] = [BIC.Priority, BIC.Event, BIC.IncompleteTask, BIC.Recommendation, BIC.Risk, BIC.Bottleneck, BIC.Optimization, BIC.Insight];
    const priorities: BriefPriority[] = [BP.Critical, BP.High, BP.Medium, BP.Low];
    const actionabilities = ['immediate', 'scheduled', 'delegatable', 'informational'];

    const count = type === BT.MorningBrief ? 12 : type === BT.EveningSummary ? 10 : type === BT.WeeklyReview ? 15 : 8;
    for (let i = 0; i < count; i++) {
      items.push(Object.freeze({
        id: crypto.randomUUID(),
        category: categories[i % categories.length],
        title: `${type} item ${i + 1} for ${date}`,
        description: `Brief item content for ${categories[i % categories.length].toString()}`,
        priority: priorities[i % priorities.length],
        actionability: actionabilities[i % actionabilities.length],
        goalId: i % 3 === 0 ? `goal-${i}` : null,
        constraintId: i % 4 === 0 ? `constraint-${i}` : null,
        valueAssessmentId: i % 5 === 0 ? `value-${i}` : null,
      }));
    }
    return Object.freeze(items);
  }

  private generateSummary(items: readonly BriefItem[]): string {
    const critical = items.filter(i => i.priority === BP.Critical).length;
    const high = items.filter(i => i.priority === BP.High).length;
    return `Brief summary: ${critical} critical, ${high} high priority items out of ${items.length} total`;
  }

  private findTopPriority(items: readonly BriefItem[]): string {
    const critical = items.filter(i => i.priority === BP.Critical);
    return critical.length > 0 ? critical[0].title : items[0]?.title ?? 'No priorities';
  }

  private findMainConstraint(items: readonly BriefItem[]): string {
    const bottlenecks = items.filter(i => i.category === BIC.Bottleneck);
    return bottlenecks.length > 0 ? bottlenecks[0].title : 'No constraints identified';
  }

  private findMainRecommendation(items: readonly BriefItem[]): string {
    const recs = items.filter(i => i.category === BIC.Recommendation);
    return recs.length > 0 ? recs[0].title : 'No recommendations';
  }

  private calculateProductivityIndex(items: readonly BriefItem[]): number {
    const actionable = items.filter(i => i.actionability === 'immediate').length;
    const total = items.length;
    return total > 0 ? Math.round((actionable / total) * 100) : 50;
  }

  private calculateDevelopmentIndex(items: readonly BriefItem[]): number {
    const insights = items.filter(i => i.category === BIC.Insight).length;
    const total = items.length;
    return total > 0 ? Math.round((insights / total) * 100) : 30;
  }

  private evictIfNeeded(): void {
    if (this.briefs.size <= this.maxHistory) return;
    const keys = Array.from(this.briefs.keys());
    const toRemove = keys.length - this.maxHistory;
    for (let i = 0; i < toRemove; i++) {
      this.briefs.delete(keys[i]);
    }
  }
}
