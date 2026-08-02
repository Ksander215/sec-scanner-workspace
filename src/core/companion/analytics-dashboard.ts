/**
 * AIS Companion — Analytics Dashboard
 * TASK-AIS-011A.000
 */

import type { InProcessEventBus } from '../events/event-bus.js';
import type { IAnalyticsDashboard } from './contracts.js';
import type { AnalyticsDashboardConfig, CompanionMetrics, SectionMetrics, NavigationSection } from './types.js';

export class AnalyticsDashboard implements IAnalyticsDashboard {
  private readonly config: AnalyticsDashboardConfig;
  private totalSessions = 0;
  private activeSessions = 0;
  private totalGoals = 0;
  private completedGoals = 0;
  private totalSolutions = 0;
  private totalInsights = 0;
  private totalRecommendations = 0;
  private sessionDurations: number[] = [];
  private readonly sectionVisits = new Map<string, { count: number; lastAt: string | null; durations: number[] }>();

  constructor(config: AnalyticsDashboardConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    void eventBus;
  }

  getSummary(): CompanionMetrics {
    const avg = this.sessionDurations.length > 0
      ? this.sessionDurations.reduce((a, b) => a + b, 0) / this.sessionDurations.length : 0;
    return Object.freeze({
      totalSessions: this.totalSessions, activeSessions: this.activeSessions,
      totalGoals: this.totalGoals, completedGoals: this.completedGoals,
      totalSolutions: this.totalSolutions, totalInsights: this.totalInsights,
      totalRecommendations: this.totalRecommendations, averageSessionDurationMs: avg,
    });
  }

  getSectionMetrics(section: NavigationSection): SectionMetrics {
    const data = this.sectionVisits.get(section) ?? { count: 0, lastAt: null, durations: [] };
    const avg = data.durations.length > 0 ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length : 0;
    return Object.freeze({ section, visitCount: data.count, lastVisitedAt: data.lastAt, averageDurationMs: avg });
  }

  recordVisit(section: NavigationSection, durationMs: number): void {
    const existing = this.sectionVisits.get(section) ?? { count: 0, lastAt: null, durations: [] };
    this.sectionVisits.set(section, {
      count: existing.count + 1, lastAt: new Date().toISOString(),
      durations: [...existing.durations.slice(-(this.config.metricsRetentionCount)), durationMs],
    });
  }

  recordGoalCreated(): void { this.totalGoals++; }
  recordGoalCompleted(): void { this.completedGoals++; }
  recordSolutionCreated(): void { this.totalSolutions++; }
  recordInsightGenerated(): void { this.totalInsights++; }
  recordRecommendationCreated(): void { this.totalRecommendations++; }
  incrementSessions(): void { this.totalSessions++; this.activeSessions++; }
  decrementActiveSessions(): void { this.activeSessions = Math.max(0, this.activeSessions - 1); }
  recordSessionDuration(ms: number): void {
    this.sessionDurations.push(ms);
    if (this.sessionDurations.length > this.config.metricsRetentionCount) {
      this.sessionDurations = this.sessionDurations.slice(-this.config.metricsRetentionCount);
    }
  }
}
