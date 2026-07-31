import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceMetricsRuntime } from '../../../core/compliance/compliance-metrics.js';
import {
  RuleCategory,
  RuleSeverity,
  ViolationState,
  EnforcementLevel,
  AutoFixCapability,
  ValidationTargetType,
  ComplianceState,
  DefaultComplianceRuntimeConfig,
  brandRuleId,
  brandViolationId,
  brandValidatorId,
  brandComplianceSessionId,
} from '../../../core/compliance/types.js';
import type {
  ComplianceViolation,
  ValidationResult,
  RuleEvaluationResult,
} from '../../../core/compliance/types.js';

// ═══════════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════════

function createTestViolation(overrides?: Partial<ComplianceViolation>): ComplianceViolation {
  return Object.freeze({
    id: brandViolationId(`vio-${Math.random().toString(36).slice(2, 8)}`),
    ruleId: brandRuleId('test-rule'),
    ruleName: 'Test Rule',
    category: RuleCategory.Architecture,
    severity: RuleSeverity.Error,
    enforcementLevel: EnforcementLevel.Advisory,
    state: ViolationState.Detected,
    description: 'Test violation',
    evidence: ['line 1'],
    recommendation: 'Fix it',
    autoFixAvailable: AutoFixCapability.None,
    target: '/src/module.ts',
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    metadata: {},
    ...overrides,
  });
}

function createRuleEvalResult(overrides?: Partial<RuleEvaluationResult>): RuleEvaluationResult {
  return Object.freeze({
    ruleId: brandRuleId('re-rule'),
    ruleName: 'Rule',
    category: RuleCategory.Architecture,
    severity: RuleSeverity.Error,
    passed: true,
    violations: [],
    durationMs: 10,
    autoFixed: false,
    metadata: {},
    ...overrides,
  });
}

function createValidationResult(overrides?: Partial<ValidationResult>): ValidationResult {
  return Object.freeze({
    sessionId: brandComplianceSessionId('sess-1'),
    targetType: ValidationTargetType.Architecture,
    targetPath: '/src/test.ts',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 100,
    results: [],
    totalRules: 0,
    passedRules: 0,
    failedRules: 0,
    skippedRules: 0,
    violations: [],
    autoFixedCount: 0,
    state: ComplianceState.Completed,
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceMetricsRuntime', () => {
  let metrics: ComplianceMetricsRuntime;

  beforeEach(() => {
    metrics = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
  });

  // ─── recordResult ──────────────────────────────────────────────
  describe('recordResult', () => {
    it('should increment checksPerformed after recording', () => {
      const result = createValidationResult({ totalRules: 1, passedRules: 1, results: [createRuleEvalResult({ passed: true })] });
      metrics.recordResult(result);
      const m = metrics.getMetrics();
      expect(m.checksPerformed).toBe(1);
    });

    it('should increment checksPassed when result has no failures', () => {
      const result = createValidationResult({ failedRules: 0, totalRules: 1, passedRules: 1, results: [createRuleEvalResult({ passed: true })] });
      metrics.recordResult(result);
      const m = metrics.getMetrics();
      expect(m.checksPassed).toBe(1);
      expect(m.checksFailed).toBe(0);
    });

    it('should increment checksFailed when result has failures', () => {
      const result = createValidationResult({ failedRules: 1, totalRules: 1, passedRules: 0, results: [createRuleEvalResult({ passed: false })] });
      metrics.recordResult(result);
      const m = metrics.getMetrics();
      expect(m.checksFailed).toBe(1);
      expect(m.checksPassed).toBe(0);
    });

    it('should track timing data', () => {
      const result = createValidationResult({ durationMs: 250 });
      metrics.recordResult(result);
      const m = metrics.getMetrics();
      expect(m.averageCheckDurationMs).toBe(250);
    });

    it('should average timing data across multiple results', () => {
      metrics.recordResult(createValidationResult({ durationMs: 100 }));
      metrics.recordResult(createValidationResult({ durationMs: 200 }));
      metrics.recordResult(createValidationResult({ durationMs: 300 }));
      const m = metrics.getMetrics();
      expect(m.averageCheckDurationMs).toBe(200);
    });

    it('should extract violations from rule results', () => {
      const v1 = createTestViolation({ id: brandViolationId('rr-v1'), severity: RuleSeverity.Critical });
      const v2 = createTestViolation({ id: brandViolationId('rr-v2'), severity: RuleSeverity.Warning });
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ passed: false, violations: [v1] }),
          createRuleEvalResult({ passed: false, violations: [v2] }),
        ],
      });
      metrics.recordResult(result);
      const m = metrics.getMetrics();
      expect(m.totalViolations).toBe(2);
    });

    it('should track auto-fix from rule results', () => {
      const result = createValidationResult({
        results: [createRuleEvalResult({ passed: true, autoFixed: true })],
        autoFixedCount: 1,
      });
      metrics.recordResult(result);
      const m = metrics.getMetrics();
      expect(m.autoFixCount).toBe(1);
      expect(m.autoFixSuccessRate).toBe(1);
    });

    it('should handle extra auto-fixed count at result level', () => {
      // autoFixedCount = 2 but only 1 rule result has autoFixed: true
      const result = createValidationResult({
        results: [createRuleEvalResult({ passed: true, autoFixed: true })],
        autoFixedCount: 2,
      });
      metrics.recordResult(result);
      const m = metrics.getMetrics();
      expect(m.autoFixCount).toBe(2);
    });

    it('should track ruleCoverage correctly', () => {
      const result = createValidationResult({ totalRules: 4, passedRules: 3, results: [
        createRuleEvalResult({ passed: true }),
        createRuleEvalResult({ passed: true }),
        createRuleEvalResult({ passed: true }),
        createRuleEvalResult({ passed: false }),
      ] });
      metrics.recordResult(result);
      const m = metrics.getMetrics();
      expect(m.ruleCoverage).toBe(0.75);
      expect(m.overallComplianceScore).toBe(75);
    });

    it('should set lastCheckAt to the last result completedAt', () => {
      const earlier = '2024-01-01T00:00:00.000Z';
      const later = '2024-01-01T01:00:00.000Z';
      metrics.recordResult(createValidationResult({ completedAt: earlier }));
      metrics.recordResult(createValidationResult({ completedAt: later }));
      const m = metrics.getMetrics();
      expect(m.lastCheckAt).toBe(later);
    });

    it('should compute violationsBySeverity', () => {
      const vInfo = createTestViolation({ id: brandViolationId('vbs-info'), severity: RuleSeverity.Info });
      const vWarn = createTestViolation({ id: brandViolationId('vbs-warn'), severity: RuleSeverity.Warning });
      const vErr = createTestViolation({ id: brandViolationId('vbs-err'), severity: RuleSeverity.Error });
      const vCrit = createTestViolation({ id: brandViolationId('vbs-crit'), severity: RuleSeverity.Critical });
      const result = createValidationResult({
        results: [createRuleEvalResult({ passed: false, violations: [vInfo, vWarn, vErr, vCrit] })],
      });
      metrics.recordResult(result);
      const m = metrics.getMetrics();
      expect(m.violationsBySeverity[RuleSeverity.Info]).toBe(1);
      expect(m.violationsBySeverity[RuleSeverity.Warning]).toBe(1);
      expect(m.violationsBySeverity[RuleSeverity.Error]).toBe(1);
      expect(m.violationsBySeverity[RuleSeverity.Critical]).toBe(1);
    });

    it('should compute violationsByCategory', () => {
      const vArch = createTestViolation({ id: brandViolationId('vbc-arch'), category: RuleCategory.Architecture });
      const vSec = createTestViolation({ id: brandViolationId('vbc-sec'), category: RuleCategory.Security });
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false, violations: [vArch] }),
          createRuleEvalResult({ category: RuleCategory.Security, passed: false, violations: [vSec] }),
        ],
      });
      metrics.recordResult(result);
      const m = metrics.getMetrics();
      expect(m.violationsByCategory[RuleCategory.Architecture]).toBe(1);
      expect(m.violationsByCategory[RuleCategory.Security]).toBe(1);
      expect(m.violationsByCategory[RuleCategory.Governance]).toBe(0);
    });

    it('should return frozen metrics', () => {
      metrics.recordResult(createValidationResult({ totalRules: 1, passedRules: 1, results: [createRuleEvalResult({ passed: true })] }));
      const m = metrics.getMetrics();
      expect(Object.isFrozen(m)).toBe(true);
    });

    it('should have frozen sub-objects', () => {
      metrics.recordResult(createValidationResult({ totalRules: 1, passedRules: 1, results: [createRuleEvalResult({ passed: true })] }));
      const m = metrics.getMetrics();
      expect(Object.isFrozen(m.violationsBySeverity)).toBe(true);
      expect(Object.isFrozen(m.violationsByCategory)).toBe(true);
      expect(Object.isFrozen(m.violationsByState)).toBe(true);
    });
  });

  // ─── recordViolation ───────────────────────────────────────────
  describe('recordViolation', () => {
    it('should add a standalone violation', () => {
      const v = createTestViolation({ id: brandViolationId('standalone-v1') });
      metrics.recordViolation(v);
      const m = metrics.getMetrics();
      expect(m.totalViolations).toBe(1);
    });

    it('should track severity of standalone violation', () => {
      const v = createTestViolation({ id: brandViolationId('standalone-v2'), severity: RuleSeverity.Critical });
      metrics.recordViolation(v);
      const m = metrics.getMetrics();
      expect(m.violationsBySeverity[RuleSeverity.Critical]).toBe(1);
    });

    it('should track category of standalone violation', () => {
      const v = createTestViolation({ id: brandViolationId('standalone-v3'), category: RuleCategory.Privacy });
      metrics.recordViolation(v);
      const m = metrics.getMetrics();
      expect(m.violationsByCategory[RuleCategory.Privacy]).toBe(1);
    });
  });

  // ─── recordResolution ──────────────────────────────────────────
  describe('recordResolution', () => {
    it('should mark violation as resolved', () => {
      const v = createTestViolation({ id: brandViolationId('resolve-v1') });
      metrics.recordViolation(v);
      metrics.recordResolution(v.id);
      const m = metrics.getMetrics();
      expect(m.violationsByState[ViolationState.Resolved]).toBe(1);
    });

    it('should reduce active violation count after resolution', () => {
      const v = createTestViolation({ id: brandViolationId('resolve-v2') });
      metrics.recordViolation(v);
      expect(metrics.getMetrics().totalViolations).toBe(1);
      metrics.recordResolution(v.id);
      // The violation is now resolved, but totalViolations counts active (non-resolved)
      // Looking at the code: resolvedViolationIds -> violationsByState[Resolved], otherwise active
      // So totalViolations (active) should be 0 after resolution
      expect(metrics.getMetrics().totalViolations).toBe(0);
      expect(metrics.getMetrics().violationsByState[ViolationState.Resolved]).toBe(1);
    });

    it('should handle resolving non-recorded violation gracefully', () => {
      metrics.recordResolution(brandViolationId('nonexistent'));
      const m = metrics.getMetrics();
      // Should not crash; resolved state would be 0
      expect(m.violationsByState[ViolationState.Resolved]).toBe(0);
    });

    it('should be idempotent (resolving same violation twice)', () => {
      const v = createTestViolation({ id: brandViolationId('resolve-v3') });
      metrics.recordViolation(v);
      metrics.recordResolution(v.id);
      metrics.recordResolution(v.id);
      const m = metrics.getMetrics();
      // The code uses resolvedViolationIds Set, so double-add is fine
      expect(m.violationsByState[ViolationState.Resolved]).toBe(1);
    });
  });

  // ─── getMetricsByCategory ──────────────────────────────────────
  describe('getMetricsByCategory', () => {
    it('should filter metrics to a specific category', () => {
      const result = createValidationResult({
        totalRules: 2,
        passedRules: 1,
        failedRules: 1,
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Security, passed: false }),
        ],
      });
      metrics.recordResult(result);
      const archMetrics = metrics.getMetricsByCategory(RuleCategory.Architecture);
      expect(archMetrics.checksPerformed).toBe(1);
      expect(archMetrics.checksPassed).toBe(1);
      expect(archMetrics.checksFailed).toBe(0);
    });

    it('should filter violations to the category', () => {
      const vArch = createTestViolation({ id: brandViolationId('cat-v1'), category: RuleCategory.Architecture, severity: RuleSeverity.Error });
      const vSec = createTestViolation({ id: brandViolationId('cat-v2'), category: RuleCategory.Security, severity: RuleSeverity.Warning });
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false, violations: [vArch] }),
          createRuleEvalResult({ category: RuleCategory.Security, passed: false, violations: [vSec] }),
        ],
      });
      metrics.recordResult(result);
      const archMetrics = metrics.getMetricsByCategory(RuleCategory.Architecture);
      expect(archMetrics.totalViolations).toBe(1);
      expect(archMetrics.violationsByCategory[RuleCategory.Architecture]).toBe(1);
      expect(archMetrics.violationsByCategory[RuleCategory.Security]).toBe(0);
    });

    it('should return zeroed metrics for category with no data', () => {
      const m = metrics.getMetricsByCategory(RuleCategory.AI);
      expect(m.totalViolations).toBe(0);
      expect(m.checksPerformed).toBe(0);
      expect(m.checksPassed).toBe(0);
      expect(m.checksFailed).toBe(0);
    });

    it('should compute correct category-specific ruleCoverage', () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Quality, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Quality, passed: false }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
        ],
      });
      metrics.recordResult(result);
      const qualityMetrics = metrics.getMetricsByCategory(RuleCategory.Quality);
      expect(qualityMetrics.ruleCoverage).toBe(0.5);
    });

    it('should track category-specific auto-fixes', () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true, autoFixed: true }),
          createRuleEvalResult({ category: RuleCategory.Security, passed: true, autoFixed: true }),
        ],
      });
      metrics.recordResult(result);
      const archMetrics = metrics.getMetricsByCategory(RuleCategory.Architecture);
      expect(archMetrics.autoFixCount).toBe(1);
    });

    it('should skip results that have no rules for the category', () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Security, passed: false }),
        ],
      });
      metrics.recordResult(result);
      const archMetrics = metrics.getMetricsByCategory(RuleCategory.Architecture);
      expect(archMetrics.checksPerformed).toBe(0);
    });
  });

  // ─── reset ─────────────────────────────────────────────────────
  describe('reset', () => {
    it('should clear all recorded data', () => {
      const v = createTestViolation({ id: brandViolationId('reset-v1') });
      metrics.recordResult(createValidationResult({ totalRules: 1, passedRules: 1, results: [createRuleEvalResult({ passed: true, violations: [v] })] }));
      metrics.recordViolation(createTestViolation({ id: brandViolationId('reset-v2') }));
      metrics.recordResolution(brandViolationId('reset-v1'));
      expect(metrics.getMetrics().totalViolations).toBeGreaterThan(0);
      expect(metrics.getMetrics().checksPerformed).toBeGreaterThan(0);

      metrics.reset();

      const m = metrics.getMetrics();
      expect(m.totalViolations).toBe(0);
      expect(m.checksPerformed).toBe(0);
      expect(m.checksPassed).toBe(0);
      expect(m.checksFailed).toBe(0);
      expect(m.autoFixCount).toBe(0);
      expect(m.autoFixSuccessRate).toBe(0);
      expect(m.averageCheckDurationMs).toBe(0);
      expect(m.lastCheckAt).toBeNull();
    });

    it('should allow recording after reset', () => {
      metrics.recordResult(createValidationResult({ totalRules: 1, passedRules: 1, results: [createRuleEvalResult({ passed: true })] }));
      metrics.reset();
      metrics.recordResult(createValidationResult({ totalRules: 2, passedRules: 1, failedRules: 1, results: [
        createRuleEvalResult({ passed: true }),
        createRuleEvalResult({ passed: false }),
      ] }));
      const m = metrics.getMetrics();
      expect(m.checksPerformed).toBe(1);
      expect(m.checksFailed).toBe(1);
      expect(m.ruleCoverage).toBeCloseTo(0.5, 5);
    });

    it('should clear resolution tracking', () => {
      const v = createTestViolation({ id: brandViolationId('reset-res-v1') });
      metrics.recordViolation(v);
      metrics.recordResolution(v.id);
      metrics.reset();
      // Re-record same violation and check it's not resolved
      const v2 = createTestViolation({ id: brandViolationId('reset-res-v1') });
      metrics.recordViolation(v2);
      const m = metrics.getMetrics();
      expect(m.violationsByState[ViolationState.Resolved]).toBe(0);
      expect(m.totalViolations).toBe(1);
    });
  });

  // ─── Aggregation ───────────────────────────────────────────────
  describe('multiple records aggregation', () => {
    it('should aggregate violations from multiple results', () => {
      const v1 = createTestViolation({ id: brandViolationId('agg-v1') });
      const v2 = createTestViolation({ id: brandViolationId('agg-v2') });
      const v3 = createTestViolation({ id: brandViolationId('agg-v3') });
      metrics.recordResult(createValidationResult({
        results: [createRuleEvalResult({ passed: false, violations: [v1, v2] })],
      }));
      metrics.recordResult(createValidationResult({
        results: [createRuleEvalResult({ passed: false, violations: [v3] })],
      }));
      const m = metrics.getMetrics();
      expect(m.totalViolations).toBe(3);
    });

    it('should aggregate checks across multiple results', () => {
      metrics.recordResult(createValidationResult({ failedRules: 0, totalRules: 1, passedRules: 1, results: [createRuleEvalResult({ passed: true })] }));
      metrics.recordResult(createValidationResult({ failedRules: 1, totalRules: 1, passedRules: 0, results: [createRuleEvalResult({ passed: false })] }));
      metrics.recordResult(createValidationResult({ failedRules: 0, totalRules: 1, passedRules: 1, results: [createRuleEvalResult({ passed: true })] }));
      const m = metrics.getMetrics();
      expect(m.checksPerformed).toBe(3);
      expect(m.checksPassed).toBe(2);
      expect(m.checksFailed).toBe(1);
    });

    it('should compute overall compliance score from all results', () => {
      // Result 1: 3/4 pass = 75%
      // Result 2: 1/2 pass = 50%
      // Total: 4/6 pass = 66.67%
      metrics.recordResult(createValidationResult({ totalRules: 4, passedRules: 3, results: [
        createRuleEvalResult({ passed: true }),
        createRuleEvalResult({ passed: true }),
        createRuleEvalResult({ passed: true }),
        createRuleEvalResult({ passed: false }),
      ] }));
      metrics.recordResult(createValidationResult({ totalRules: 2, passedRules: 1, results: [
        createRuleEvalResult({ passed: true }),
        createRuleEvalResult({ passed: false }),
      ] }));
      const m = metrics.getMetrics();
      expect(m.ruleCoverage).toBeCloseTo(4/6, 5);
      expect(m.overallComplianceScore).toBeCloseTo(400/6, 1);
    });

    it('should have ruleCoverage of 1 when no rules', () => {
      const m = metrics.getMetrics();
      expect(m.ruleCoverage).toBe(1);
      expect(m.overallComplianceScore).toBe(100);
    });

    it('should have autoFixSuccessRate of 0 when no auto-fixes', () => {
      const m = metrics.getMetrics();
      expect(m.autoFixSuccessRate).toBe(0);
    });

    it('should have averageCheckDurationMs of 0 when no results', () => {
      const m = metrics.getMetrics();
      expect(m.averageCheckDurationMs).toBe(0);
    });

    it('should have lastCheckAt null when no results', () => {
      const m = metrics.getMetrics();
      expect(m.lastCheckAt).toBeNull();
    });

    it('should have zero for all severity counts when empty', () => {
      const m = metrics.getMetrics();
      expect(m.violationsBySeverity[RuleSeverity.Info]).toBe(0);
      expect(m.violationsBySeverity[RuleSeverity.Warning]).toBe(0);
      expect(m.violationsBySeverity[RuleSeverity.Error]).toBe(0);
      expect(m.violationsBySeverity[RuleSeverity.Critical]).toBe(0);
    });

    it('should have zero for all category counts when empty', () => {
      const m = metrics.getMetrics();
      for (const cat of Object.values(RuleCategory)) {
        expect(m.violationsByCategory[cat]).toBe(0);
      }
    });

    it('should have zero for all state counts when empty', () => {
      const m = metrics.getMetrics();
      for (const state of Object.values(ViolationState)) {
        expect(m.violationsByState[state]).toBe(0);
      }
    });

    it('should handle violation with ViolationState.WontFix', () => {
      const v = createTestViolation({ id: brandViolationId('wf-v1'), state: ViolationState.WontFix });
      metrics.recordViolation(v);
      const m = metrics.getMetrics();
      expect(m.violationsByState[ViolationState.WontFix]).toBe(1);
    });

    it('should handle violation with ViolationState.Suppressed', () => {
      const v = createTestViolation({ id: brandViolationId('sup-v1'), state: ViolationState.Suppressed });
      metrics.recordViolation(v);
      const m = metrics.getMetrics();
      expect(m.violationsByState[ViolationState.Suppressed]).toBe(1);
    });
  });
});
