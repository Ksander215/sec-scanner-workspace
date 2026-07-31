/**
 * Architecture Compliance & Governance Engine — Report Generator
 * TASK-AIS-000Z.000
 *
 * Aggregates ValidationResults into ComplianceReport with weighted scores.
 * Publishes ReportGeneratedEvent via InProcessEventBus when available.
 */

import type { IReportGenerator } from './contracts.js';
import type {
  ReportGeneratorConfig,
  ValidationResult,
  RuleEvaluationResult,
  CategoryScore,
  ComplianceReport,
  ComplianceSessionId,
  ComplianceViolation,
} from './types.js';
import {
  RuleCategory,
  ScoreLevel,
  RuleSeverity,
  brandComplianceReportId,
} from './types.js';
import type { ReportGeneratedEvent } from './events.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';

/**
 * Report Generator — aggregates validation results into a compliance report.
 *
 * Conforms to IReportGenerator from contracts.ts.
 * Computes category scores, weighted overall score, and named dimension scores.
 */
export class ReportGenerator implements IReportGenerator {
  private readonly config: ReportGeneratorConfig;
  private readonly eventBus: InProcessEventBus | null;

  constructor(config: ReportGeneratorConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  // ─── Report Generation ─────────────────────────────────────────

  async generateReport(
    results: readonly ValidationResult[],
    sessionId: ComplianceSessionId,
  ): Promise<ComplianceReport> {
    const startTime = Date.now();
    const categoryScores = this.getCategoryScores(results);
    const overallScore = this.getOverallScore(results);
    const overallLevel = this.getScoreLevel(overallScore);

    // Aggregate totals across all validation results
    let totalRules = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    const allViolations: ComplianceViolation[] = [];

    for (const result of results) {
      totalRules += result.totalRules;
      totalPassed += result.passedRules;
      totalFailed += result.failedRules;
      for (const v of result.violations) {
        allViolations.push(v);
      }
    }

    // Cap violations per report
    const violations: readonly ComplianceViolation[] =
      this.config.maxViolationsPerReport > 0
        ? allViolations.slice(0, this.config.maxViolationsPerReport)
        : allViolations;

    const criticalViolations = allViolations.filter(
      (v) => v.severity === RuleSeverity.Critical,
    ).length;

    // Named dimension scores from category scores
    const scoreMap = new Map<RuleCategory, number>(
      categoryScores.map((cs) => [cs.category, cs.score]),
    );
    const getScore = (cat: RuleCategory): number => scoreMap.get(cat) ?? 100;

    const architectureScore = getScore(RuleCategory.Architecture);
    const governanceScore = getScore(RuleCategory.Governance);
    const documentationScore = getScore(RuleCategory.Documentation);
    const qualityScore = getScore(RuleCategory.Quality);
    const privacyScore = getScore(RuleCategory.Privacy);
    const securityScore = getScore(RuleCategory.Security);

    const reportId = brandComplianceReportId(
      `report-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    );
    const durationMs = Date.now() - startTime;

    const report: ComplianceReport = Object.freeze({
      id: reportId,
      sessionId,
      generatedAt: new Date().toISOString(),
      durationMs,
      overallScore,
      overallLevel,
      categoryScores,
      architectureScore,
      governanceScore,
      documentationScore,
      qualityScore,
      privacyScore,
      securityScore,
      totalRules,
      totalPassed,
      totalFailed,
      totalViolations: allViolations.length,
      criticalViolations,
      violations,
      validationResults: results,
      metadata: {},
    });

    await this.publishReportEvent(report);

    return report;
  }

  // ─── Category Scores ───────────────────────────────────────────

  getCategoryScores(results: readonly ValidationResult[]): CategoryScore[] {
    // Flatten all RuleEvaluationResults across all ValidationResults
    const allRuleResults: RuleEvaluationResult[] = [];
    for (const result of results) {
      for (const r of result.results) {
        allRuleResults.push(r);
      }
    }

    // Group by category
    const grouped = new Map<RuleCategory, RuleEvaluationResult[]>();
    for (const r of allRuleResults) {
      const existing = grouped.get(r.category);
      if (existing) {
        existing.push(r);
      } else {
        grouped.set(r.category, [r]);
      }
    }

    // Compute score per category
    const scores: CategoryScore[] = [];
    for (const [category, categoryResults] of grouped) {
      const totalRules = categoryResults.length;
      const passedRules = categoryResults.filter((r) => r.passed).length;
      const failedRules = totalRules - passedRules;
      const criticalViolations = categoryResults.reduce(
        (count, r) =>
          count +
          r.violations.filter((v) => v.severity === RuleSeverity.Critical).length,
        0,
      );
      const score = totalRules > 0 ? (passedRules / totalRules) * 100 : 100;
      const level = this.getScoreLevel(score);

      scores.push(
        Object.freeze({
          category,
          score,
          level,
          totalRules,
          passedRules,
          failedRules,
          criticalViolations,
        }),
      );
    }

    return scores;
  }

  // ─── Overall Score ─────────────────────────────────────────────

  getOverallScore(results: readonly ValidationResult[]): number {
    const categoryScores = this.getCategoryScores(results);
    const scoreMap = new Map<RuleCategory, number>(
      categoryScores.map((cs) => [cs.category, cs.score]),
    );

    let totalWeight = 0;
    let weightedSum = 0;

    for (const [category, weight] of Object.entries(this.config.scoreWeights)) {
      const score = scoreMap.get(category as RuleCategory) ?? 100;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 100;
  }

  // ─── Score Level ───────────────────────────────────────────────

  getScoreLevel(score: number): ScoreLevel {
    if (score >= 90) return ScoreLevel.Excellent;
    if (score >= 75) return ScoreLevel.Good;
    if (score >= 60) return ScoreLevel.Acceptable;
    if (score >= 40) return ScoreLevel.NeedsImprovement;
    return ScoreLevel.Failing;
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private async publishReportEvent(report: ComplianceReport): Promise<void> {
    if (!this.eventBus) return;

    const event: ReportGeneratedEvent & DomainEventBase = Object.freeze({
      eventType: 'compliance.report.generated',
      classification: EventClassification.Result,
      reportId: report.id,
      overallScore: report.overallScore,
      totalViolations: report.totalViolations,
      criticalViolations: report.criticalViolations,
      timestamp: report.generatedAt,
      metadata: {},
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: report.id as string,
      aggregateType: 'ComplianceReport',
      version: '1.0.0',
    });

    await this.eventBus.publish(event);
  }
}
