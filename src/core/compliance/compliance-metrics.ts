/**
 * Architecture Compliance & Governance Engine — Compliance Metrics Runtime
 * TASK-AIS-000Z.000
 *
 * Tracks validation results, violations, resolutions, timing, and auto-fix metrics.
 * Produces ComplianceMetrics snapshots from accumulated state.
 */

import type { IComplianceMetrics } from './contracts.js';
import type {
  MetricsConfig,
  ValidationResult,
  ComplianceViolation,
  ComplianceMetrics,
  ViolationId,
  Timestamp,
} from './types.js';
import {
  RuleCategory,
  RuleSeverity,
  ViolationState,
} from './types.js';

/**
 * Compliance Metrics Runtime — collects and aggregates compliance telemetry.
 *
 * Conforms to IComplianceMetrics from contracts.ts.
 * All state is in-memory and resettable.
 */
export class ComplianceMetricsRuntime implements IComplianceMetrics {
  private results: ValidationResult[] = [];
  private violations: ComplianceViolation[] = [];
  private resolvedViolationIds = new Set<string>();
  private timingData: number[] = [];
  private autoFixAttempts = 0;
  private autoFixSuccesses = 0;

  constructor(_config: MetricsConfig) {
    // Config available for future retention/aggregation window logic
  }

  // ─── Record Methods ───────────────────────────────────────────

  recordResult(result: ValidationResult): void {
    this.results.push(result);
    this.timingData.push(result.durationMs);

    for (const ruleResult of result.results) {
      for (const violation of ruleResult.violations) {
        this.violations.push(violation);
      }
      if (ruleResult.autoFixed) {
        this.autoFixAttempts++;
        this.autoFixSuccesses++;
      }
    }

    // Also account for additional auto-fixed count from result-level tally
    const extraAutoFixes = result.autoFixedCount - result.results.filter((r) => r.autoFixed).length;
    if (extraAutoFixes > 0) {
      this.autoFixAttempts += extraAutoFixes;
      this.autoFixSuccesses += extraAutoFixes;
    }
  }

  recordViolation(violation: ComplianceViolation): void {
    this.violations.push(violation);
  }

  recordResolution(violationId: ViolationId): void {
    this.resolvedViolationIds.add(violationId as string);
  }

  // ─── Query Methods ────────────────────────────────────────────

  getMetrics(): ComplianceMetrics {
    const lastCheckAt: Timestamp | null =
      this.results.length > 0
        ? this.results[this.results.length - 1].completedAt
        : null;

    return this.computeMetrics(
      this.violations,
      this.results,
      this.autoFixAttempts,
      this.autoFixSuccesses,
      this.timingData,
      lastCheckAt,
    );
  }

  getMetricsByCategory(category: RuleCategory): ComplianceMetrics {
    // Filter violations to the given category
    const filteredViolations = this.violations.filter(
      (v) => v.category === category,
    );

    // Filter and transform results to only include the given category
    const filteredResults: ValidationResult[] = [];
    let categoryAutoFixAttempts = 0;
    let categoryAutoFixSuccesses = 0;
    const categoryTimingData: number[] = [];

    for (const result of this.results) {
      const categoryRuleResults = result.results.filter(
        (r) => r.category === category,
      );
      if (categoryRuleResults.length === 0) continue;

      const passedRules = categoryRuleResults.filter((r) => r.passed).length;
      const failedRules = categoryRuleResults.length - passedRules;
      const categoryAutoFixedCount = categoryRuleResults.filter(
        (r) => r.autoFixed,
      ).length;
      const categoryViolations = categoryRuleResults.flatMap((r) => [
        ...r.violations,
      ]);

      filteredResults.push(
        Object.freeze({
          sessionId: result.sessionId,
          targetType: result.targetType,
          targetPath: result.targetPath,
          startedAt: result.startedAt,
          completedAt: result.completedAt,
          durationMs: result.durationMs,
          results: categoryRuleResults,
          totalRules: categoryRuleResults.length,
          passedRules,
          failedRules,
          skippedRules: 0,
          violations: categoryViolations,
          autoFixedCount: categoryAutoFixedCount,
          state: result.state,
        }),
      );

      categoryTimingData.push(result.durationMs);
      categoryAutoFixAttempts += categoryAutoFixedCount;
      categoryAutoFixSuccesses += categoryAutoFixedCount;
    }

    const lastCheckAt: Timestamp | null =
      filteredResults.length > 0
        ? filteredResults[filteredResults.length - 1].completedAt
        : null;

    return this.computeMetrics(
      filteredViolations,
      filteredResults,
      categoryAutoFixAttempts,
      categoryAutoFixSuccesses,
      categoryTimingData,
      lastCheckAt,
    );
  }

  reset(): void {
    this.results = [];
    this.violations = [];
    this.resolvedViolationIds.clear();
    this.timingData = [];
    this.autoFixAttempts = 0;
    this.autoFixSuccesses = 0;
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private computeMetrics(
    violations: readonly ComplianceViolation[],
    results: readonly ValidationResult[],
    autoFixAttempts: number,
    autoFixSuccesses: number,
    timingData: readonly number[],
    lastCheckAt: Timestamp | null,
  ): ComplianceMetrics {
    // Initialize severity counts
    const violationsBySeverity: Record<RuleSeverity, number> = {
      [RuleSeverity.Info]: 0,
      [RuleSeverity.Warning]: 0,
      [RuleSeverity.Error]: 0,
      [RuleSeverity.Critical]: 0,
    };

    // Initialize category counts
    const violationsByCategory: Record<RuleCategory, number> = {
      [RuleCategory.Architecture]: 0,
      [RuleCategory.Philosophy]: 0,
      [RuleCategory.Governance]: 0,
      [RuleCategory.Runtime]: 0,
      [RuleCategory.AI]: 0,
      [RuleCategory.Documentation]: 0,
      [RuleCategory.CapabilityPack]: 0,
      [RuleCategory.Privacy]: 0,
      [RuleCategory.Security]: 0,
      [RuleCategory.Quality]: 0,
    };

    // Initialize state counts
    const violationsByState: Record<ViolationState, number> = {
      [ViolationState.Detected]: 0,
      [ViolationState.Acknowledged]: 0,
      [ViolationState.Resolved]: 0,
      [ViolationState.WontFix]: 0,
      [ViolationState.Suppressed]: 0,
    };

    // Count violations by dimension
    let activeViolationCount = 0;
    for (const v of violations) {
      violationsBySeverity[v.severity] =
        (violationsBySeverity[v.severity] ?? 0) + 1;
      violationsByCategory[v.category] =
        (violationsByCategory[v.category] ?? 0) + 1;

      if (this.resolvedViolationIds.has(v.id as string)) {
        violationsByState[ViolationState.Resolved] =
          (violationsByState[ViolationState.Resolved] ?? 0) + 1;
      } else {
        activeViolationCount++;
        violationsByState[v.state] =
          (violationsByState[v.state] ?? 0) + 1;
      }
    }

    // Aggregate result-level metrics
    let totalPassedRules = 0;
    let totalRulesCount = 0;
    let checksPassed = 0;
    let checksFailed = 0;

    for (const result of results) {
      totalPassedRules += result.passedRules;
      totalRulesCount += result.totalRules;
      if (result.failedRules === 0) {
        checksPassed++;
      } else {
        checksFailed++;
      }
    }

    // Compute derived metrics
    const averageCheckDurationMs:
      number = timingData.length > 0
        ? timingData.reduce((sum, ms) => sum + ms, 0) / timingData.length
        : 0;

    const ruleCoverage =
      totalRulesCount > 0 ? totalPassedRules / totalRulesCount : 1;
    const overallComplianceScore = ruleCoverage * 100;

    return Object.freeze({
      totalViolations: activeViolationCount,
      violationsBySeverity: Object.freeze(violationsBySeverity),
      violationsByCategory: Object.freeze(violationsByCategory),
      violationsByState: Object.freeze(violationsByState),
      averageCheckDurationMs,
      ruleCoverage,
      autoFixCount: autoFixSuccesses,
      autoFixSuccessRate:
        autoFixAttempts > 0 ? autoFixSuccesses / autoFixAttempts : 0,
      overallComplianceScore,
      lastCheckAt,
      checksPerformed: results.length,
      checksPassed,
      checksFailed,
      metadata: {},
    });
  }
}
