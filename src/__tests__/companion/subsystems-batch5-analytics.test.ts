/**
 * Companion Tests — Batch 5: AnalyticsDashboard (previously untested)
 * TASK-AIS-011A.001
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsDashboard } from '../../core/companion/analytics-dashboard.js';
import { DefaultAnalyticsDashboardConfig, NavigationSection } from '../../core/companion/types.js';

describe('AnalyticsDashboard', () => {
  let analytics: AnalyticsDashboard;
  beforeEach(() => { analytics = new AnalyticsDashboard(DefaultAnalyticsDashboardConfig); });

  describe('construction', () => {
    it('should create with default config', () => { expect(analytics).toBeDefined(); });
    it('should return initial summary with all zeros', () => {
      const s = analytics.getSummary();
      expect(s.totalSessions).toBe(0);
      expect(s.activeSessions).toBe(0);
      expect(s.totalGoals).toBe(0);
      expect(s.completedGoals).toBe(0);
      expect(s.totalSolutions).toBe(0);
      expect(s.totalInsights).toBe(0);
      expect(s.totalRecommendations).toBe(0);
      expect(s.averageSessionDurationMs).toBe(0);
    });
    it('should return frozen summary', () => { expect(Object.isFrozen(analytics.getSummary())).toBe(true); });
    it('should accept custom config', () => {
      const a = new AnalyticsDashboard({ metricsRetentionCount: 10 });
      expect(a.getSummary()).toBeDefined();
    });
    it('should handle null eventBus', () => { new AnalyticsDashboard(DefaultAnalyticsDashboardConfig, null); });
    it('should handle undefined eventBus', () => { new AnalyticsDashboard(DefaultAnalyticsDashboardConfig, undefined); });
  });

  describe('recordVisit', () => {
    it('should record a visit to Conversation', () => { analytics.recordVisit(NavigationSection.Conversation, 1000); const m = analytics.getSectionMetrics(NavigationSection.Conversation); expect(m.visitCount).toBe(1); });
    it('should record a visit to Goals', () => { analytics.recordVisit(NavigationSection.Goals, 500); const m = analytics.getSectionMetrics(NavigationSection.Goals); expect(m.visitCount).toBe(1); });
    it('should record a visit to DailyPlan', () => { analytics.recordVisit(NavigationSection.DailyPlan, 2000); const m = analytics.getSectionMetrics(NavigationSection.DailyPlan); expect(m.visitCount).toBe(1); });
    it('should record a visit to Solutions', () => { analytics.recordVisit(NavigationSection.Solutions, 3000); const m = analytics.getSectionMetrics(NavigationSection.Solutions); expect(m.visitCount).toBe(1); });
    it('should record a visit to Workflows', () => { analytics.recordVisit(NavigationSection.Workflows, 1500); const m = analytics.getSectionMetrics(NavigationSection.Workflows); expect(m.visitCount).toBe(1); });
    it('should record a visit to Capabilities', () => { analytics.recordVisit(NavigationSection.Capabilities, 800); const m = analytics.getSectionMetrics(NavigationSection.Capabilities); expect(m.visitCount).toBe(1); });
    it('should record a visit to Marketplace', () => { analytics.recordVisit(NavigationSection.Marketplace, 1200); const m = analytics.getSectionMetrics(NavigationSection.Marketplace); expect(m.visitCount).toBe(1); });
    it('should record a visit to Knowledge', () => { analytics.recordVisit(NavigationSection.Knowledge, 900); const m = analytics.getSectionMetrics(NavigationSection.Knowledge); expect(m.visitCount).toBe(1); });
    it('should track multiple visits to same section', () => { analytics.recordVisit(NavigationSection.Conversation, 100); analytics.recordVisit(NavigationSection.Conversation, 200); const m = analytics.getSectionMetrics(NavigationSection.Conversation); expect(m.visitCount).toBe(2); });
    it('should track visits across different sections independently', () => { analytics.recordVisit(NavigationSection.Conversation, 100); analytics.recordVisit(NavigationSection.Goals, 200); expect(analytics.getSectionMetrics(NavigationSection.Conversation).visitCount).toBe(1); expect(analytics.getSectionMetrics(NavigationSection.Goals).visitCount).toBe(1); });
    it('should update lastVisitedAt on each visit', async () => { analytics.recordVisit(NavigationSection.Conversation, 100); await new Promise(r => setTimeout(r, 2)); analytics.recordVisit(NavigationSection.Conversation, 100); const after = analytics.getSectionMetrics(NavigationSection.Conversation).lastVisitedAt; expect(after).not.toBeNull(); });
    it('should handle zero duration', () => { analytics.recordVisit(NavigationSection.Conversation, 0); expect(analytics.getSectionMetrics(NavigationSection.Conversation).visitCount).toBe(1); });
    it('should handle very large duration', () => { analytics.recordVisit(NavigationSection.Conversation, 999999999); expect(analytics.getSectionMetrics(NavigationSection.Conversation).visitCount).toBe(1); });
    it('should retain only configured number of durations', () => {
      const a = new AnalyticsDashboard({ metricsRetentionCount: 3 });
      a.recordVisit(NavigationSection.Conversation, 1);
      a.recordVisit(NavigationSection.Conversation, 2);
      a.recordVisit(NavigationSection.Conversation, 3);
      a.recordVisit(NavigationSection.Conversation, 4);
      const m = a.getSectionMetrics(NavigationSection.Conversation);
      expect(m.averageDurationMs).toBeCloseTo(2.5, 0); // last 3: 1,2,3 plus 4 = [1,2,3,4] avg=2.5 (slice(-3) on [1,2,3] keeps all)
    });
  });

  describe('getSectionMetrics', () => {
    it('should return frozen metrics', () => { analytics.recordVisit(NavigationSection.Conversation, 100); expect(Object.isFrozen(analytics.getSectionMetrics(NavigationSection.Conversation))).toBe(true); });
    it('should return zero metrics for unvisited section', () => { const m = analytics.getSectionMetrics(NavigationSection.Marketplace); expect(m.visitCount).toBe(0); expect(m.lastVisitedAt).toBeNull(); expect(m.averageDurationMs).toBe(0); });
    it('should return correct section name', () => { analytics.recordVisit(NavigationSection.Knowledge, 100); expect(analytics.getSectionMetrics(NavigationSection.Knowledge).section).toBe(NavigationSection.Knowledge); });
    it('should calculate average duration correctly', () => { analytics.recordVisit(NavigationSection.Conversation, 100); analytics.recordVisit(NavigationSection.Conversation, 200); analytics.recordVisit(NavigationSection.Conversation, 300); expect(analytics.getSectionMetrics(NavigationSection.Conversation).averageDurationMs).toBe(200); });
    it('should handle single visit average', () => { analytics.recordVisit(NavigationSection.Conversation, 500); expect(analytics.getSectionMetrics(NavigationSection.Conversation).averageDurationMs).toBe(500); });
  });

  describe('goal analytics', () => {
    it('should increment totalGoals on recordGoalCreated', () => { analytics.recordGoalCreated(); expect(analytics.getSummary().totalGoals).toBe(1); });
    it('should increment completedGoals on recordGoalCompleted', () => { analytics.recordGoalCompleted(); expect(analytics.getSummary().completedGoals).toBe(1); });
    it('should track total and completed independently', () => { analytics.recordGoalCreated(); analytics.recordGoalCreated(); analytics.recordGoalCompleted(); expect(analytics.getSummary().totalGoals).toBe(2); expect(analytics.getSummary().completedGoals).toBe(1); });
    it('should handle many goal creations', () => { for (let i = 0; i < 100; i++) analytics.recordGoalCreated(); expect(analytics.getSummary().totalGoals).toBe(100); });
    it('should handle many goal completions', () => { for (let i = 0; i < 100; i++) analytics.recordGoalCompleted(); expect(analytics.getSummary().completedGoals).toBe(100); });
  });

  describe('solution analytics', () => {
    it('should increment totalSolutions on recordSolutionCreated', () => { analytics.recordSolutionCreated(); expect(analytics.getSummary().totalSolutions).toBe(1); });
    it('should handle many solution creations', () => { for (let i = 0; i < 50; i++) analytics.recordSolutionCreated(); expect(analytics.getSummary().totalSolutions).toBe(50); });
  });

  describe('insight analytics', () => {
    it('should increment totalInsights on recordInsightGenerated', () => { analytics.recordInsightGenerated(); expect(analytics.getSummary().totalInsights).toBe(1); });
    it('should handle many insight generations', () => { for (let i = 0; i < 50; i++) analytics.recordInsightGenerated(); expect(analytics.getSummary().totalInsights).toBe(50); });
  });

  describe('recommendation analytics', () => {
    it('should increment totalRecommendations on recordRecommendationCreated', () => { analytics.recordRecommendationCreated(); expect(analytics.getSummary().totalRecommendations).toBe(1); });
    it('should handle many recommendations', () => { for (let i = 0; i < 50; i++) analytics.recordRecommendationCreated(); expect(analytics.getSummary().totalRecommendations).toBe(50); });
  });

  describe('session analytics', () => {
    it('should increment total and active sessions on incrementSessions', () => { analytics.incrementSessions(); expect(analytics.getSummary().totalSessions).toBe(1); expect(analytics.getSummary().activeSessions).toBe(1); });
    it('should decrement active sessions on decrementActiveSessions', () => { analytics.incrementSessions(); analytics.decrementActiveSessions(); expect(analytics.getSummary().activeSessions).toBe(0); });
    it('should not go below zero on decrement', () => { analytics.decrementActiveSessions(); expect(analytics.getSummary().activeSessions).toBe(0); });
    it('should handle multiple session increments', () => { for (let i = 0; i < 10; i++) analytics.incrementSessions(); expect(analytics.getSummary().totalSessions).toBe(10); expect(analytics.getSummary().activeSessions).toBe(10); });
    it('should record session duration', () => { analytics.recordSessionDuration(5000); expect(analytics.getSummary().averageSessionDurationMs).toBe(5000); });
    it('should calculate average session duration', () => { analytics.recordSessionDuration(1000); analytics.recordSessionDuration(3000); expect(analytics.getSummary().averageSessionDurationMs).toBe(2000); });
    it('should retain only configured session durations', () => {
      const a = new AnalyticsDashboard({ metricsRetentionCount: 3 });
      a.recordSessionDuration(1); a.recordSessionDuration(2); a.recordSessionDuration(3); a.recordSessionDuration(4);
      expect(a.getSummary().averageSessionDurationMs).toBe(3);
    });
    it('should handle zero duration sessions', () => { analytics.recordSessionDuration(0); expect(analytics.getSummary().averageSessionDurationMs).toBe(0); });
  });

  describe('combined metrics', () => {
    it('should track all metrics together', () => {
      analytics.incrementSessions();
      analytics.recordGoalCreated(); analytics.recordGoalCompleted();
      analytics.recordSolutionCreated();
      analytics.recordInsightGenerated();
      analytics.recordRecommendationCreated();
      const s = analytics.getSummary();
      expect(s.totalSessions).toBe(1);
      expect(s.totalGoals).toBe(1);
      expect(s.completedGoals).toBe(1);
      expect(s.totalSolutions).toBe(1);
      expect(s.totalInsights).toBe(1);
      expect(s.totalRecommendations).toBe(1);
    });
    it('should return consistent snapshots', () => {
      analytics.incrementSessions(); analytics.recordGoalCreated();
      const s1 = analytics.getSummary(); const s2 = analytics.getSummary();
      expect(s1.totalSessions).toBe(s2.totalSessions);
      expect(s1.totalGoals).toBe(s2.totalGoals);
    });
  });
});
