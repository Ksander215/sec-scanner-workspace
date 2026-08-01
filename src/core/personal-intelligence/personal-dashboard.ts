/**
 * Personal Intelligence Pack — Personal Dashboard
 * TASK-AIS-007A.000
 *
 * Generates the "My Intelligence" dashboard with:
 * Today, Top Goals, Next Actions, Main Constraint,
 * Main Recommendation, Recent Insights, Productivity Index, Development Index
 */
import type { PersonalIntelligenceContracts } from './contracts.js';
import type {
  PersonalDashboard as PersonalDashboardType, PackDashboardId, PackGoal, PackConstraint,
  PackRecommendation, PackInsight, PackInsightId,
} from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import { DashboardGenerationError } from './errors.js';

export class PersonalDashboard {
  private contracts: PersonalIntelligenceContracts;
  private dashboards = new Map<string, PersonalDashboardType>();
  private insights = new Map<string, PackInsight>();

  constructor(contracts: PersonalIntelligenceContracts) {
    this.contracts = contracts;
  }

  addInsight(title: string, description: string, category: string, source: string, confidence?: number): PackInsight {
    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID() as unknown as PackInsightId;
    const insight: PackInsight = Object.freeze({
      id, title: title.trim(), description: description.trim(),
      category, source, confidence: confidence ?? 0.5, createdAt: now,
    });
    this.insights.set(id as unknown as string, insight);
    return insight;
  }

  generateDashboard(params: {
    userId: string;
    todaySummary: string;
    topGoals: readonly PackGoal[];
    nextActions: readonly string[];
    mainConstraint: PackConstraint | null;
    mainRecommendation: PackRecommendation | null;
    productivityIndex: number;
    developmentIndex: number;
  }): PersonalDashboardType {
    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID() as unknown as PackDashboardId;
    const recentInsights = this.getRecentInsights(10);

    const dashboard: PersonalDashboardType = Object.freeze({
      id, userId: params.userId, todaySummary: params.todaySummary,
      topGoals: Object.freeze(params.topGoals),
      nextActions: Object.freeze(params.nextActions),
      mainConstraint: params.mainConstraint,
      mainRecommendation: params.mainRecommendation,
      recentInsights, productivityIndex: params.productivityIndex,
      developmentIndex: params.developmentIndex,
      constraintCount: params.mainConstraint ? 1 : 0,
      recommendationCount: params.mainRecommendation ? 1 : 0,
      goalCount: params.topGoals.length, habitCount: 0,
      createdAt: now,
    });

    this.dashboards.set(id as unknown as string, dashboard);

    const base = createPackEventBase('DashboardGenerated', EventClassification.Result, id as unknown as string);
    void this.contracts.platform.publishEvent('DashboardGenerated', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { dashboardId: id, productivityIndex: params.productivityIndex, developmentIndex: params.developmentIndex, generatedAt: now },
    });

    return dashboard;
  }

  getDashboard(id: string): PersonalDashboardType {
    const d = this.dashboards.get(id);
    if (!d) throw new DashboardGenerationError(`Dashboard not found: ${id}`);
    return d;
  }

  getLatestDashboard(): PersonalDashboardType | null {
    const all = Array.from(this.dashboards.values());
    return all.length > 0 ? all[all.length - 1] : null;
  }

  getAllDashboards(): readonly PersonalDashboardType[] { return Object.freeze(Array.from(this.dashboards.values())); }
  getDashboardCount(): number { return this.dashboards.size; }

  getInsight(id: string): PackInsight {
    const i = this.insights.get(id);
    if (!i) throw new DashboardGenerationError(`Insight not found: ${id}`);
    return i;
  }

  getAllInsights(): readonly PackInsight[] { return Object.freeze(Array.from(this.insights.values())); }
  getInsightCount(): number { return this.insights.size; }

  dispose(): void { this.dashboards.clear(); this.insights.clear(); }

  // ── Private ───────────────────────────────────────────────

  private getRecentInsights(limit: number): readonly PackInsight[] {
    return Object.freeze(
      Array.from(this.insights.values()).slice(-limit),
    );
  }
}
