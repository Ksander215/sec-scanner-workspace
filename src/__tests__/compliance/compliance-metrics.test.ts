import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceMetricsRuntime } from '../../core/compliance/compliance-metrics.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import {
  DefaultComplianceRuntimeConfig,
  brandRuleId,
  brandViolationId,
  brandComplianceReportId,
  brandComplianceSessionId,
  RuleCategory,
  RuleSeverity,
  EnforcementLevel,
  AutoFixCapability,
  ViolationState,
  ValidationTargetType,
  ComplianceState,
  ScoreLevel,
} from '../../core/compliance/types.js';
import type {
  ComplianceRule,
  ComplianceViolation,
  ValidationRequest,
  ValidationResult,
  RuleEvaluationResult,
  CategoryScore,
  ComplianceReport,
  ComplianceMetrics,
} from '../../core/compliance/types.js';

// ═══════════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════════

function makeRuleResult(overrides: Partial<RuleEvaluationResult> = {}): RuleEvaluationResult {
  return Object.freeze({
    ruleId: brandRuleId(`RR-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    ruleName: 'Test Rule',
    category: RuleCategory.Architecture,
    severity: RuleSeverity.Warning,
    passed: true,
    violations: [],
    durationMs: 5,
    autoFixed: false,
    metadata: {},
    ...overrides,
  });
}

function makeValidationResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  const now = new Date().toISOString();
  return Object.freeze({
    sessionId: brandComplianceSessionId('test-session'),
    targetType: ValidationTargetType.Architecture,
    targetPath: 'test/module.ts',
    startedAt: now,
    completedAt: now,
    durationMs: 10,
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

function makeViolation(overrides: Partial<ComplianceViolation> = {}): ComplianceViolation {
  return Object.freeze({
    id: brandViolationId(`V-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    ruleId: brandRuleId('TEST-RULE'),
    ruleName: 'Test Rule',
    category: RuleCategory.Architecture,
    severity: RuleSeverity.Error,
    enforcementLevel: EnforcementLevel.Blocking,
    state: ViolationState.Detected,
    description: 'Test violation',
    evidence: ['evidence1'],
    recommendation: 'Fix it',
    autoFixAvailable: AutoFixCapability.None,
    target: 'test/file.ts',
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    metadata: {},
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════════
// Constructor
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceMetricsRuntime – Constructor', () => {
  it('should create instance with default config', () => {
    const m = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
    expect(m).toBeInstanceOf(ComplianceMetricsRuntime);
  });

  it('should create instance with custom config', () => {
    const config = { retentionPeriodMs: 1000, aggregationWindowMs: 500 };
    const m = new ComplianceMetricsRuntime(config);
    expect(m).toBeInstanceOf(ComplianceMetricsRuntime);
  });

  it('should implement IComplianceMetrics interface methods', () => {
    const m = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
    expect(typeof m.recordResult).toBe('function');
    expect(typeof m.recordViolation).toBe('function');
    expect(typeof m.recordResolution).toBe('function');
    expect(typeof m.getMetrics).toBe('function');
    expect(typeof m.getMetricsByCategory).toBe('function');
    expect(typeof m.reset).toBe('function');
  });

  it('should return empty metrics after construction', () => {
    const m = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(0);
    expect(metrics.checksPerformed).toBe(0);
  });

  it('should work with zero retention period', () => {
    const config = { retentionPeriodMs: 0, aggregationWindowMs: 0 };
    const m = new ComplianceMetricsRuntime(config);
    expect(m.getMetrics()).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// recordResult
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceMetricsRuntime – recordResult', () => {
  let m: ComplianceMetricsRuntime;

  beforeEach(() => {
    m = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
  });

  // ─── Single result ───────────────────────────────────────────

  it('should record a single passing result', () => {
    const result = makeValidationResult({
      totalRules: 3,
      passedRules: 3,
      failedRules: 0,
      durationMs: 20,
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
      ],
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.checksPerformed).toBe(1);
    expect(metrics.checksPassed).toBe(1);
    expect(metrics.checksFailed).toBe(0);
  });

  it('should record a single failing result', () => {
    const result = makeValidationResult({
      totalRules: 2,
      passedRules: 1,
      failedRules: 1,
      durationMs: 15,
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
      ],
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.checksPerformed).toBe(1);
    expect(metrics.checksPassed).toBe(0);
    expect(metrics.checksFailed).toBe(1);
  });

  it('should track duration from single result', () => {
    const result = makeValidationResult({ durationMs: 42 });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.averageCheckDurationMs).toBe(42);
  });

  it('should track lastCheckAt from single result', () => {
    const now = new Date().toISOString();
    const result = makeValidationResult({ completedAt: now });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.lastCheckAt).toBe(now);
  });

  it('should track rule coverage from single all-pass result', () => {
    const result = makeValidationResult({
      totalRules: 5,
      passedRules: 5,
      failedRules: 0,
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.ruleCoverage).toBe(1);
  });

  it('should track rule coverage from single partial result', () => {
    const result = makeValidationResult({
      totalRules: 4,
      passedRules: 2,
      failedRules: 2,
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.ruleCoverage).toBe(0.5);
  });

  // ─── Multiple results ────────────────────────────────────────

  it('should accumulate multiple results', () => {
    m.recordResult(makeValidationResult({ totalRules: 3, passedRules: 3, failedRules: 0, durationMs: 10 }));
    m.recordResult(makeValidationResult({ totalRules: 3, passedRules: 1, failedRules: 2, durationMs: 20 }));
    const metrics = m.getMetrics();
    expect(metrics.checksPerformed).toBe(2);
    expect(metrics.checksPassed).toBe(1);
    expect(metrics.checksFailed).toBe(1);
  });

  it('should compute average duration across multiple results', () => {
    m.recordResult(makeValidationResult({ durationMs: 10 }));
    m.recordResult(makeValidationResult({ durationMs: 30 }));
    m.recordResult(makeValidationResult({ durationMs: 20 }));
    const metrics = m.getMetrics();
    expect(metrics.averageCheckDurationMs).toBe(20);
  });

  it('should track total passed rules across multiple results', () => {
    m.recordResult(makeValidationResult({ totalRules: 2, passedRules: 1, failedRules: 1 }));
    m.recordResult(makeValidationResult({ totalRules: 3, passedRules: 3, failedRules: 0 }));
    const metrics = m.getMetrics();
    expect(metrics.overallComplianceScore).toBe(80); // 4/5 = 0.8 * 100
  });

  it('should update lastCheckAt to most recent result', () => {
    const t1 = '2024-01-01T00:00:00.000Z';
    const t2 = '2024-06-15T12:00:00.000Z';
    m.recordResult(makeValidationResult({ completedAt: t1 }));
    m.recordResult(makeValidationResult({ completedAt: t2 }));
    const metrics = m.getMetrics();
    expect(metrics.lastCheckAt).toBe(t2);
  });

  // ─── With violations ─────────────────────────────────────────

  it('should track violations from rule evaluation results', () => {
    const vio = makeViolation({ severity: RuleSeverity.Error });
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: false, violations: [vio] })],
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(1);
  });

  it('should track violations by severity from rule results', () => {
    const v1 = makeViolation({ severity: RuleSeverity.Critical });
    const v2 = makeViolation({ severity: RuleSeverity.Error });
    const v3 = makeViolation({ severity: RuleSeverity.Warning });
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: false, violations: [v1] }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false, violations: [v2, v3] }),
      ],
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.violationsBySeverity[RuleSeverity.Critical]).toBe(1);
    expect(metrics.violationsBySeverity[RuleSeverity.Error]).toBe(1);
    expect(metrics.violationsBySeverity[RuleSeverity.Warning]).toBe(1);
  });

  it('should track violations by category from rule results', () => {
    const v1 = makeViolation({ category: RuleCategory.Architecture });
    const v2 = makeViolation({ category: RuleCategory.Security });
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: false, violations: [v1] }),
        makeRuleResult({ category: RuleCategory.Security, passed: false, violations: [v2] }),
      ],
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.violationsByCategory[RuleCategory.Architecture]).toBe(1);
    expect(metrics.violationsByCategory[RuleCategory.Security]).toBe(1);
  });

  // ─── Without violations ──────────────────────────────────────

  it('should report zero violations when no violations exist', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true, violations: [] }),
      ],
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(0);
  });

  it('should report all severity counts as zero when no violations', () => {
    m.recordResult(makeValidationResult({ results: [] }));
    const metrics = m.getMetrics();
    expect(metrics.violationsBySeverity[RuleSeverity.Info]).toBe(0);
    expect(metrics.violationsBySeverity[RuleSeverity.Warning]).toBe(0);
    expect(metrics.violationsBySeverity[RuleSeverity.Error]).toBe(0);
    expect(metrics.violationsBySeverity[RuleSeverity.Critical]).toBe(0);
  });

  // ─── Auto-fix tracking ───────────────────────────────────────

  it('should track auto-fixed rules', () => {
    const result = makeValidationResult({
      autoFixedCount: 1,
      results: [makeRuleResult({ autoFixed: true })],
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.autoFixCount).toBe(1);
  });

  it('should compute autoFixSuccessRate as 1 when all auto-fixes succeed', () => {
    const result = makeValidationResult({
      autoFixedCount: 2,
      results: [
        makeRuleResult({ autoFixed: true }),
        makeRuleResult({ autoFixed: true }),
      ],
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.autoFixSuccessRate).toBe(1);
  });

  it('should track extra auto-fixes from result level', () => {
    // autoFixedCount=3 but only 1 rule autoFixed → extra = 2
    const result = makeValidationResult({
      autoFixedCount: 3,
      results: [makeRuleResult({ autoFixed: true })],
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    // 1 from rule + 2 extra = 3 total attempts/successes
    expect(metrics.autoFixCount).toBe(3);
    expect(metrics.autoFixSuccessRate).toBe(1);
  });

  it('should accumulate auto-fixes across multiple results', () => {
    m.recordResult(makeValidationResult({ autoFixedCount: 1, results: [makeRuleResult({ autoFixed: true })] }));
    m.recordResult(makeValidationResult({ autoFixedCount: 2, results: [makeRuleResult({ autoFixed: true }), makeRuleResult({ autoFixed: true })] }));
    const metrics = m.getMetrics();
    expect(metrics.autoFixCount).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// recordViolation
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceMetricsRuntime – recordViolation', () => {
  let m: ComplianceMetricsRuntime;

  beforeEach(() => {
    m = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
  });

  it('should record a single violation directly', () => {
    const vio = makeViolation();
    m.recordViolation(vio);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(1);
  });

  it('should record violation severity', () => {
    const vio = makeViolation({ severity: RuleSeverity.Critical });
    m.recordViolation(vio);
    const metrics = m.getMetrics();
    expect(metrics.violationsBySeverity[RuleSeverity.Critical]).toBe(1);
  });

  it('should record violation category', () => {
    const vio = makeViolation({ category: RuleCategory.Security });
    m.recordViolation(vio);
    const metrics = m.getMetrics();
    expect(metrics.violationsByCategory[RuleCategory.Security]).toBe(1);
  });

  it('should record violation state', () => {
    const vio = makeViolation({ state: ViolationState.Acknowledged });
    m.recordViolation(vio);
    const metrics = m.getMetrics();
    expect(metrics.violationsByState[ViolationState.Acknowledged]).toBe(1);
  });

  it('should accumulate multiple direct violations', () => {
    m.recordViolation(makeViolation({ severity: RuleSeverity.Error }));
    m.recordViolation(makeViolation({ severity: RuleSeverity.Error }));
    m.recordViolation(makeViolation({ severity: RuleSeverity.Warning }));
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(3);
    expect(metrics.violationsBySeverity[RuleSeverity.Error]).toBe(2);
    expect(metrics.violationsBySeverity[RuleSeverity.Warning]).toBe(1);
  });

  it('should track violation with WontFix state', () => {
    const vio = makeViolation({ state: ViolationState.WontFix });
    m.recordViolation(vio);
    const metrics = m.getMetrics();
    expect(metrics.violationsByState[ViolationState.WontFix]).toBe(1);
  });

  it('should track violation with Suppressed state', () => {
    const vio = makeViolation({ state: ViolationState.Suppressed });
    m.recordViolation(vio);
    const metrics = m.getMetrics();
    expect(metrics.violationsByState[ViolationState.Suppressed]).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// recordResolution
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceMetricsRuntime – recordResolution', () => {
  let m: ComplianceMetricsRuntime;

  beforeEach(() => {
    m = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
  });

  it('should mark a violation as resolved', () => {
    const vio = makeViolation();
    m.recordViolation(vio);
    m.recordResolution(vio.id);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(0);
    expect(metrics.violationsByState[ViolationState.Resolved]).toBe(1);
  });

  it('should reduce active violation count', () => {
    const v1 = makeViolation();
    const v2 = makeViolation();
    m.recordViolation(v1);
    m.recordViolation(v2);
    m.recordResolution(v1.id);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(1);
  });

  it('should handle resolving a non-existent violation id', () => {
    const fakeId = brandViolationId('non-existent');
    m.recordResolution(fakeId);
    const metrics = m.getMetrics();
    expect(metrics.violationsByState[ViolationState.Resolved]).toBe(0);
  });

  it('should handle duplicate resolution calls', () => {
    const vio = makeViolation();
    m.recordViolation(vio);
    m.recordResolution(vio.id);
    m.recordResolution(vio.id);
    const metrics = m.getMetrics();
    expect(metrics.violationsByState[ViolationState.Resolved]).toBe(1);
    expect(metrics.totalViolations).toBe(0);
  });

  it('should resolve violation recorded from rule evaluation result', () => {
    const vio = makeViolation();
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: false, violations: [vio] })],
    });
    m.recordResult(result);
    m.recordResolution(vio.id);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(0);
    expect(metrics.violationsByState[ViolationState.Resolved]).toBe(1);
  });

  it('should preserve severity count for resolved violations', () => {
    const vio = makeViolation({ severity: RuleSeverity.Critical });
    m.recordViolation(vio);
    m.recordResolution(vio.id);
    const metrics = m.getMetrics();
    // Severity is still counted in violationsBySeverity (all violations)
    expect(metrics.violationsBySeverity[RuleSeverity.Critical]).toBe(1);
    // But totalViolations (active) is 0
    expect(metrics.totalViolations).toBe(0);
  });

  it('should preserve category count for resolved violations', () => {
    const vio = makeViolation({ category: RuleCategory.Security });
    m.recordViolation(vio);
    m.recordResolution(vio.id);
    const metrics = m.getMetrics();
    expect(metrics.violationsByCategory[RuleCategory.Security]).toBe(1);
    expect(metrics.totalViolations).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// getMetrics
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceMetricsRuntime – getMetrics', () => {
  let m: ComplianceMetricsRuntime;

  beforeEach(() => {
    m = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
  });

  // ─── Empty state ─────────────────────────────────────────────

  it('should return zero totalViolations on empty state', () => {
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(0);
  });

  it('should return zero checksPerformed on empty state', () => {
    const metrics = m.getMetrics();
    expect(metrics.checksPerformed).toBe(0);
  });

  it('should return zero checksPassed on empty state', () => {
    const metrics = m.getMetrics();
    expect(metrics.checksPassed).toBe(0);
  });

  it('should return zero checksFailed on empty state', () => {
    const metrics = m.getMetrics();
    expect(metrics.checksFailed).toBe(0);
  });

  it('should return zero averageCheckDurationMs on empty state', () => {
    const metrics = m.getMetrics();
    expect(metrics.averageCheckDurationMs).toBe(0);
  });

  it('should return ruleCoverage of 1 on empty state', () => {
    const metrics = m.getMetrics();
    expect(metrics.ruleCoverage).toBe(1);
  });

  it('should return overallComplianceScore of 100 on empty state', () => {
    const metrics = m.getMetrics();
    expect(metrics.overallComplianceScore).toBe(100);
  });

  it('should return zero autoFixCount on empty state', () => {
    const metrics = m.getMetrics();
    expect(metrics.autoFixCount).toBe(0);
  });

  it('should return zero autoFixSuccessRate on empty state', () => {
    const metrics = m.getMetrics();
    expect(metrics.autoFixSuccessRate).toBe(0);
  });

  it('should return null lastCheckAt on empty state', () => {
    const metrics = m.getMetrics();
    expect(metrics.lastCheckAt).toBeNull();
  });

  it('should return empty metadata on empty state', () => {
    const metrics = m.getMetrics();
    expect(metrics.metadata).toEqual({});
  });

  it('should return frozen metrics object', () => {
    const metrics = m.getMetrics();
    expect(Object.isFrozen(metrics)).toBe(true);
  });

  it('should return frozen violationsBySeverity', () => {
    const metrics = m.getMetrics();
    expect(Object.isFrozen(metrics.violationsBySeverity)).toBe(true);
  });

  it('should return frozen violationsByCategory', () => {
    const metrics = m.getMetrics();
    expect(Object.isFrozen(metrics.violationsByCategory)).toBe(true);
  });

  it('should return frozen violationsByState', () => {
    const metrics = m.getMetrics();
    expect(Object.isFrozen(metrics.violationsByState)).toBe(true);
  });

  it('should initialize all severity keys to zero', () => {
    const metrics = m.getMetrics();
    expect(metrics.violationsBySeverity[RuleSeverity.Info]).toBe(0);
    expect(metrics.violationsBySeverity[RuleSeverity.Warning]).toBe(0);
    expect(metrics.violationsBySeverity[RuleSeverity.Error]).toBe(0);
    expect(metrics.violationsBySeverity[RuleSeverity.Critical]).toBe(0);
  });

  it('should initialize all state keys to zero', () => {
    const metrics = m.getMetrics();
    expect(metrics.violationsByState[ViolationState.Detected]).toBe(0);
    expect(metrics.violationsByState[ViolationState.Acknowledged]).toBe(0);
    expect(metrics.violationsByState[ViolationState.Resolved]).toBe(0);
    expect(metrics.violationsByState[ViolationState.WontFix]).toBe(0);
    expect(metrics.violationsByState[ViolationState.Suppressed]).toBe(0);
  });

  it('should initialize all category keys to zero', () => {
    const metrics = m.getMetrics();
    const categories = Object.values(RuleCategory);
    for (const cat of categories) {
      expect(metrics.violationsByCategory[cat]).toBe(0);
    }
  });

  // ─── After results ───────────────────────────────────────────

  it('should count checksPerformed correctly after results', () => {
    m.recordResult(makeValidationResult({ totalRules: 1, passedRules: 1, failedRules: 0 }));
    m.recordResult(makeValidationResult({ totalRules: 1, passedRules: 1, failedRules: 0 }));
    m.recordResult(makeValidationResult({ totalRules: 1, passedRules: 0, failedRules: 1 }));
    const metrics = m.getMetrics();
    expect(metrics.checksPerformed).toBe(3);
  });

  it('should count checksPassed for results with zero failedRules', () => {
    m.recordResult(makeValidationResult({ totalRules: 5, passedRules: 5, failedRules: 0 }));
    m.recordResult(makeValidationResult({ totalRules: 3, passedRules: 3, failedRules: 0 }));
    m.recordResult(makeValidationResult({ totalRules: 2, passedRules: 0, failedRules: 2 }));
    const metrics = m.getMetrics();
    expect(metrics.checksPassed).toBe(2);
  });

  it('should count checksFailed for results with non-zero failedRules', () => {
    m.recordResult(makeValidationResult({ totalRules: 2, passedRules: 0, failedRules: 2 }));
    m.recordResult(makeValidationResult({ totalRules: 3, passedRules: 2, failedRules: 1 }));
    const metrics = m.getMetrics();
    expect(metrics.checksFailed).toBe(2);
  });

  it('should compute averageCheckDurationMs correctly', () => {
    m.recordResult(makeValidationResult({ durationMs: 100 }));
    m.recordResult(makeValidationResult({ durationMs: 200 }));
    const metrics = m.getMetrics();
    expect(metrics.averageCheckDurationMs).toBe(150);
  });

  it('should compute ruleCoverage as passedRules/totalRules', () => {
    m.recordResult(makeValidationResult({ totalRules: 10, passedRules: 7, failedRules: 3 }));
    const metrics = m.getMetrics();
    expect(metrics.ruleCoverage).toBe(0.7);
  });

  it('should compute overallComplianceScore as ruleCoverage * 100', () => {
    m.recordResult(makeValidationResult({ totalRules: 10, passedRules: 7, failedRules: 3 }));
    const metrics = m.getMetrics();
    expect(metrics.overallComplianceScore).toBe(70);
  });

  it('should update lastCheckAt to latest result', () => {
    m.recordResult(makeValidationResult({ completedAt: '2024-01-01T00:00:00.000Z' }));
    m.recordResult(makeValidationResult({ completedAt: '2024-12-31T23:59:59.000Z' }));
    const metrics = m.getMetrics();
    expect(metrics.lastCheckAt).toBe('2024-12-31T23:59:59.000Z');
  });

  // ─── After violations ────────────────────────────────────────

  it('should count totalViolations as active (non-resolved)', () => {
    const v1 = makeViolation();
    const v2 = makeViolation();
    m.recordViolation(v1);
    m.recordViolation(v2);
    m.recordResolution(v1.id);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(1);
  });

  it('should count violationsBySeverity correctly', () => {
    m.recordViolation(makeViolation({ severity: RuleSeverity.Info }));
    m.recordViolation(makeViolation({ severity: RuleSeverity.Info }));
    m.recordViolation(makeViolation({ severity: RuleSeverity.Warning }));
    m.recordViolation(makeViolation({ severity: RuleSeverity.Error }));
    m.recordViolation(makeViolation({ severity: RuleSeverity.Critical }));
    const metrics = m.getMetrics();
    expect(metrics.violationsBySeverity[RuleSeverity.Info]).toBe(2);
    expect(metrics.violationsBySeverity[RuleSeverity.Warning]).toBe(1);
    expect(metrics.violationsBySeverity[RuleSeverity.Error]).toBe(1);
    expect(metrics.violationsBySeverity[RuleSeverity.Critical]).toBe(1);
  });

  it('should count violationsByCategory correctly', () => {
    m.recordViolation(makeViolation({ category: RuleCategory.Architecture }));
    m.recordViolation(makeViolation({ category: RuleCategory.Architecture }));
    m.recordViolation(makeViolation({ category: RuleCategory.Security }));
    const metrics = m.getMetrics();
    expect(metrics.violationsByCategory[RuleCategory.Architecture]).toBe(2);
    expect(metrics.violationsByCategory[RuleCategory.Security]).toBe(1);
  });

  it('should count violationsByState correctly', () => {
    const v1 = makeViolation({ state: ViolationState.Detected });
    const v2 = makeViolation({ state: ViolationState.Acknowledged });
    m.recordViolation(v1);
    m.recordViolation(v2);
    const metrics = m.getMetrics();
    expect(metrics.violationsByState[ViolationState.Detected]).toBe(1);
    expect(metrics.violationsByState[ViolationState.Acknowledged]).toBe(1);
  });

  // ─── After resolutions ───────────────────────────────────────

  it('should move resolved violations to Resolved state', () => {
    const vio = makeViolation({ state: ViolationState.Detected });
    m.recordViolation(vio);
    m.recordResolution(vio.id);
    const metrics = m.getMetrics();
    expect(metrics.violationsByState[ViolationState.Resolved]).toBe(1);
    expect(metrics.violationsByState[ViolationState.Detected]).toBe(0);
  });

  it('should not double-count resolved violations in totalViolations', () => {
    const v1 = makeViolation();
    const v2 = makeViolation();
    const v3 = makeViolation();
    m.recordViolation(v1);
    m.recordViolation(v2);
    m.recordViolation(v3);
    m.recordResolution(v1.id);
    m.recordResolution(v3.id);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(1);
  });

  it('should keep severity counts for resolved violations', () => {
    const vio = makeViolation({ severity: RuleSeverity.Critical });
    m.recordViolation(vio);
    m.recordResolution(vio.id);
    const metrics = m.getMetrics();
    expect(metrics.violationsBySeverity[RuleSeverity.Critical]).toBe(1);
  });

  // ─── Auto-fix metrics ────────────────────────────────────────

  it('should report autoFixCount as successes', () => {
    m.recordResult(makeValidationResult({
      autoFixedCount: 1,
      results: [makeRuleResult({ autoFixed: true })],
    }));
    const metrics = m.getMetrics();
    expect(metrics.autoFixCount).toBe(1);
  });

  it('should report autoFixSuccessRate of 1 when all succeed', () => {
    m.recordResult(makeValidationResult({
      autoFixedCount: 2,
      results: [makeRuleResult({ autoFixed: true }), makeRuleResult({ autoFixed: true })],
    }));
    const metrics = m.getMetrics();
    expect(metrics.autoFixSuccessRate).toBe(1);
  });

  it('should report autoFixSuccessRate of 0 when no attempts', () => {
    const metrics = m.getMetrics();
    expect(metrics.autoFixSuccessRate).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// getMetricsByCategory
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceMetricsRuntime – getMetricsByCategory', () => {
  let m: ComplianceMetricsRuntime;

  beforeEach(() => {
    m = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
  });

  // ─── Filtering ───────────────────────────────────────────────

  it('should return metrics filtered to a specific category', () => {
    const result = makeValidationResult({
      totalRules: 2,
      passedRules: 1,
      failedRules: 1,
      durationMs: 10,
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
      ],
    });
    m.recordResult(result);
    const archMetrics = m.getMetricsByCategory(RuleCategory.Architecture);
    expect(archMetrics.checksPerformed).toBe(1);
    expect(archMetrics.checksPassed).toBe(1);
  });

  it('should only include violations for the specified category', () => {
    const v1 = makeViolation({ category: RuleCategory.Architecture, severity: RuleSeverity.Error });
    const v2 = makeViolation({ category: RuleCategory.Security, severity: RuleSeverity.Critical });
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: false, violations: [v1] }),
        makeRuleResult({ category: RuleCategory.Security, passed: false, violations: [v2] }),
      ],
    });
    m.recordResult(result);
    const archMetrics = m.getMetricsByCategory(RuleCategory.Architecture);
    expect(archMetrics.totalViolations).toBe(1);
    expect(archMetrics.violationsByCategory[RuleCategory.Architecture]).toBe(1);
    expect(archMetrics.violationsByCategory[RuleCategory.Security]).toBe(0);
  });

  it('should only include auto-fixes for the specified category', () => {
    const result = makeValidationResult({
      autoFixedCount: 1,
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, autoFixed: true }),
        makeRuleResult({ category: RuleCategory.Security, autoFixed: true }),
      ],
    });
    m.recordResult(result);
    const archMetrics = m.getMetricsByCategory(RuleCategory.Architecture);
    expect(archMetrics.autoFixCount).toBe(1);
  });

  it('should compute category-specific rule coverage', () => {
    const result = makeValidationResult({
      totalRules: 4,
      passedRules: 2,
      failedRules: 2,
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
        makeRuleResult({ category: RuleCategory.Security, passed: true }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
      ],
    });
    m.recordResult(result);
    const archMetrics = m.getMetricsByCategory(RuleCategory.Architecture);
    expect(archMetrics.ruleCoverage).toBe(0.5);
  });

  it('should return frozen metrics object', () => {
    const metrics = m.getMetricsByCategory(RuleCategory.Architecture);
    expect(Object.isFrozen(metrics)).toBe(true);
  });

  // ─── Empty category ──────────────────────────────────────────

  it('should return empty metrics for category with no data', () => {
    const metrics = m.getMetricsByCategory(RuleCategory.AI);
    expect(metrics.checksPerformed).toBe(0);
    expect(metrics.totalViolations).toBe(0);
  });

  it('should return null lastCheckAt for category with no data', () => {
    const metrics = m.getMetricsByCategory(RuleCategory.AI);
    expect(metrics.lastCheckAt).toBeNull();
  });

  it('should return zero averageCheckDurationMs for category with no data', () => {
    const metrics = m.getMetricsByCategory(RuleCategory.AI);
    expect(metrics.averageCheckDurationMs).toBe(0);
  });

  it('should return ruleCoverage of 1 for category with no data', () => {
    const metrics = m.getMetricsByCategory(RuleCategory.AI);
    expect(metrics.ruleCoverage).toBe(1);
  });

  it('should return zero autoFixCount for category with no data', () => {
    const metrics = m.getMetricsByCategory(RuleCategory.AI);
    expect(metrics.autoFixCount).toBe(0);
  });

  it('should return zero autoFixSuccessRate for category with no data', () => {
    const metrics = m.getMetricsByCategory(RuleCategory.AI);
    expect(metrics.autoFixSuccessRate).toBe(0);
  });

  // ─── Multiple categories ─────────────────────────────────────

  it('should return different metrics for different categories', () => {
    const result = makeValidationResult({
      totalRules: 2,
      passedRules: 2,
      failedRules: 0,
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Security, passed: true }),
      ],
    });
    m.recordResult(result);
    const arch = m.getMetricsByCategory(RuleCategory.Architecture);
    const sec = m.getMetricsByCategory(RuleCategory.Security);
    expect(arch.checksPerformed).toBe(1);
    expect(sec.checksPerformed).toBe(1);
  });

  it('should handle results with only one category present', () => {
    const result = makeValidationResult({
      totalRules: 1,
      passedRules: 1,
      failedRules: 0,
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
      ],
    });
    m.recordResult(result);
    const secMetrics = m.getMetricsByCategory(RuleCategory.Security);
    expect(secMetrics.checksPerformed).toBe(0);
  });

  it('should track duration for category results', () => {
    const result = makeValidationResult({
      durationMs: 50,
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
      ],
    });
    m.recordResult(result);
    const archMetrics = m.getMetricsByCategory(RuleCategory.Architecture);
    expect(archMetrics.averageCheckDurationMs).toBe(50);
  });
});

// ═══════════════════════════════════════════════════════════════════
// reset
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceMetricsRuntime – reset', () => {
  let m: ComplianceMetricsRuntime;

  beforeEach(() => {
    m = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
  });

  it('should clear all recorded results', () => {
    m.recordResult(makeValidationResult({ totalRules: 5, passedRules: 3, failedRules: 2, durationMs: 10 }));
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.checksPerformed).toBe(0);
  });

  it('should clear all recorded violations', () => {
    m.recordViolation(makeViolation());
    m.recordViolation(makeViolation());
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(0);
  });

  it('should clear all resolutions', () => {
    const vio = makeViolation();
    m.recordViolation(vio);
    m.recordResolution(vio.id);
    m.reset();
    // Re-record the same violation
    m.recordViolation(vio);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(1);
  });

  it('should clear auto-fix tracking', () => {
    m.recordResult(makeValidationResult({
      autoFixedCount: 2,
      results: [makeRuleResult({ autoFixed: true }), makeRuleResult({ autoFixed: true })],
    }));
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.autoFixCount).toBe(0);
    expect(metrics.autoFixSuccessRate).toBe(0);
  });

  it('should clear timing data', () => {
    m.recordResult(makeValidationResult({ durationMs: 100 }));
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.averageCheckDurationMs).toBe(0);
  });

  it('should reset lastCheckAt to null', () => {
    m.recordResult(makeValidationResult({ completedAt: '2024-01-01T00:00:00.000Z' }));
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.lastCheckAt).toBeNull();
  });

  it('should reset overallComplianceScore to 100', () => {
    m.recordResult(makeValidationResult({ totalRules: 10, passedRules: 5, failedRules: 5 }));
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.overallComplianceScore).toBe(100);
  });

  it('should reset ruleCoverage to 1', () => {
    m.recordResult(makeValidationResult({ totalRules: 10, passedRules: 5, failedRules: 5 }));
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.ruleCoverage).toBe(1);
  });

  it('should reset all severity counts to zero', () => {
    m.recordViolation(makeViolation({ severity: RuleSeverity.Critical }));
    m.recordViolation(makeViolation({ severity: RuleSeverity.Error }));
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.violationsBySeverity[RuleSeverity.Critical]).toBe(0);
    expect(metrics.violationsBySeverity[RuleSeverity.Error]).toBe(0);
  });

  it('should reset all category counts to zero', () => {
    m.recordViolation(makeViolation({ category: RuleCategory.Security }));
    m.recordViolation(makeViolation({ category: RuleCategory.Privacy }));
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.violationsByCategory[RuleCategory.Security]).toBe(0);
    expect(metrics.violationsByCategory[RuleCategory.Privacy]).toBe(0);
  });

  it('should reset all state counts to zero', () => {
    const v1 = makeViolation({ state: ViolationState.Detected });
    const v2 = makeViolation({ state: ViolationState.Acknowledged });
    m.recordViolation(v1);
    m.recordViolation(v2);
    m.recordResolution(v1.id);
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.violationsByState[ViolationState.Detected]).toBe(0);
    expect(metrics.violationsByState[ViolationState.Acknowledged]).toBe(0);
    expect(metrics.violationsByState[ViolationState.Resolved]).toBe(0);
  });

  it('should allow recording after reset', () => {
    m.recordResult(makeValidationResult({ totalRules: 3, passedRules: 3, failedRules: 0 }));
    m.reset();
    m.recordResult(makeValidationResult({ totalRules: 2, passedRules: 1, failedRules: 1 }));
    const metrics = m.getMetrics();
    expect(metrics.checksPerformed).toBe(1);
    expect(metrics.overallComplianceScore).toBe(50);
  });

  it('should return clean frozen metrics after reset', () => {
    m.recordViolation(makeViolation());
    m.reset();
    const metrics = m.getMetrics();
    expect(Object.isFrozen(metrics)).toBe(true);
    expect(metrics.totalViolations).toBe(0);
  });

  it('should clear checksPassed after reset', () => {
    m.recordResult(makeValidationResult({ totalRules: 3, passedRules: 3, failedRules: 0 }));
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.checksPassed).toBe(0);
  });

  it('should clear checksFailed after reset', () => {
    m.recordResult(makeValidationResult({ totalRules: 3, passedRules: 1, failedRules: 2 }));
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.checksFailed).toBe(0);
  });

  it('should allow multiple resets without error', () => {
    m.recordResult(makeValidationResult({ totalRules: 1, passedRules: 1, failedRules: 0 }));
    m.reset();
    m.reset();
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.checksPerformed).toBe(0);
  });

  it('should not affect a separate instance when reset', () => {
    m.recordResult(makeValidationResult({ totalRules: 1, passedRules: 1, failedRules: 0 }));
    const m2 = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
    m2.recordResult(makeValidationResult({ totalRules: 2, passedRules: 2, failedRules: 0 }));
    m.reset();
    expect(m.getMetrics().checksPerformed).toBe(0);
    expect(m2.getMetrics().checksPerformed).toBe(1);
  });

  it('should clear violationsByState after reset', () => {
    const v1 = makeViolation({ state: ViolationState.WontFix });
    const v2 = makeViolation({ state: ViolationState.Suppressed });
    m.recordViolation(v1);
    m.recordViolation(v2);
    m.reset();
    const metrics = m.getMetrics();
    expect(metrics.violationsByState[ViolationState.WontFix]).toBe(0);
    expect(metrics.violationsByState[ViolationState.Suppressed]).toBe(0);
  });

  it('should reset overallComplianceScore when results exist after reset', () => {
    m.recordResult(makeValidationResult({ totalRules: 10, passedRules: 2, failedRules: 8 }));
    m.reset();
    m.recordResult(makeValidationResult({ totalRules: 5, passedRules: 4, failedRules: 1 }));
    const metrics = m.getMetrics();
    expect(metrics.overallComplianceScore).toBe(80);
  });

  it('should reset all category keys to zero after violations recorded', () => {
    const categories = Object.values(RuleCategory);
    for (const cat of categories) {
      m.recordViolation(makeViolation({ category: cat }));
    }
    m.reset();
    const metrics = m.getMetrics();
    for (const cat of categories) {
      expect(metrics.violationsByCategory[cat]).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// Integration / Combined Scenarios
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceMetricsRuntime – Combined Scenarios', () => {
  let m: ComplianceMetricsRuntime;

  beforeEach(() => {
    m = new ComplianceMetricsRuntime(DefaultComplianceRuntimeConfig.metrics);
  });

  it('should handle recording results and violations together', () => {
    const vio = makeViolation({ category: RuleCategory.Security, severity: RuleSeverity.Critical });
    m.recordResult(makeValidationResult({
      totalRules: 2,
      passedRules: 1,
      failedRules: 1,
      durationMs: 25,
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Security, passed: false, violations: [vio] }),
      ],
    }));
    m.recordViolation(makeViolation({ category: RuleCategory.Privacy, severity: RuleSeverity.Warning }));
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(2);
    expect(metrics.violationsBySeverity[RuleSeverity.Critical]).toBe(1);
    expect(metrics.violationsBySeverity[RuleSeverity.Warning]).toBe(1);
    expect(metrics.checksPerformed).toBe(1);
  });

  it('should handle resolve after mixed recording', () => {
    const v1 = makeViolation({ state: ViolationState.Detected });
    const v2 = makeViolation({ state: ViolationState.Acknowledged });
    m.recordViolation(v1);
    m.recordResult(makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: false, violations: [v2] })],
    }));
    m.recordResolution(v1.id);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(1);
    expect(metrics.violationsByState[ViolationState.Resolved]).toBe(1);
    expect(metrics.violationsByState[ViolationState.Acknowledged]).toBe(1);
  });

  it('should produce consistent metrics on repeated getMetrics calls', () => {
    m.recordResult(makeValidationResult({ totalRules: 3, passedRules: 2, failedRules: 1, durationMs: 10 }));
    const m1 = m.getMetrics();
    const m2 = m.getMetrics();
    expect(m1).toEqual(m2);
  });

  it('should handle zero duration results', () => {
    m.recordResult(makeValidationResult({ durationMs: 0 }));
    const metrics = m.getMetrics();
    expect(metrics.averageCheckDurationMs).toBe(0);
  });

  it('should handle very large duration values', () => {
    m.recordResult(makeValidationResult({ durationMs: Number.MAX_SAFE_INTEGER }));
    const metrics = m.getMetrics();
    expect(metrics.averageCheckDurationMs).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('should handle result with skipped rules', () => {
    m.recordResult(makeValidationResult({
      totalRules: 5,
      passedRules: 2,
      failedRules: 1,
      skippedRules: 2,
    }));
    const metrics = m.getMetrics();
    // ruleCoverage = passedRules / totalRules = 2/5 = 0.4
    expect(metrics.ruleCoverage).toBe(0.4);
  });

  it('should handle direct violation + resolution with no results', () => {
    const v = makeViolation({ severity: RuleSeverity.Info });
    m.recordViolation(v);
    m.recordResolution(v.id);
    const metrics = m.getMetrics();
    expect(metrics.totalViolations).toBe(0);
    expect(metrics.violationsBySeverity[RuleSeverity.Info]).toBe(1);
    expect(metrics.violationsByState[ViolationState.Resolved]).toBe(1);
    expect(metrics.checksPerformed).toBe(0);
  });

  it('should track all 10 categories in violationsByCategory', () => {
    const categories = Object.values(RuleCategory);
    for (const cat of categories) {
      m.recordViolation(makeViolation({ category: cat }));
    }
    const metrics = m.getMetrics();
    for (const cat of categories) {
      expect(metrics.violationsByCategory[cat]).toBe(1);
    }
    expect(metrics.totalViolations).toBe(categories.length);
  });

  it('should correctly handle getMetricsByCategory with resolved violations', () => {
    const vio = makeViolation({ category: RuleCategory.Security });
    m.recordResult(makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Security, passed: false, violations: [vio] })],
    }));
    m.recordResolution(vio.id);
    const secMetrics = m.getMetricsByCategory(RuleCategory.Security);
    expect(secMetrics.totalViolations).toBe(0);
    expect(secMetrics.violationsByState[ViolationState.Resolved]).toBe(1);
  });

  it('should compute correct overallComplianceScore across many results', () => {
    for (let i = 0; i < 10; i++) {
      m.recordResult(makeValidationResult({
        totalRules: 10,
        passedRules: 8,
        failedRules: 2,
      }));
    }
    const metrics = m.getMetrics();
    // 80 passed out of 100 total = 0.8 * 100 = 80
    expect(metrics.overallComplianceScore).toBe(80);
    expect(metrics.checksPerformed).toBe(10);
  });

  it('should handle recordResult with autoFixedCount greater than rule results', () => {
    // autoFixedCount: 5, but only 2 rule results autoFixed → extra = 3
    const result = makeValidationResult({
      autoFixedCount: 5,
      results: [
        makeRuleResult({ autoFixed: true }),
        makeRuleResult({ autoFixed: true }),
        makeRuleResult({ autoFixed: false }),
      ],
    });
    m.recordResult(result);
    const metrics = m.getMetrics();
    expect(metrics.autoFixCount).toBe(5);
    expect(metrics.autoFixSuccessRate).toBe(1);
  });

  it('should handle getMetricsByCategory after reset returning empty', () => {
    m.recordResult(makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: true })],
    }));
    m.reset();
    const archMetrics = m.getMetricsByCategory(RuleCategory.Architecture);
    expect(archMetrics.checksPerformed).toBe(0);
    expect(archMetrics.totalViolations).toBe(0);
    expect(archMetrics.overallComplianceScore).toBe(100);
  });

  it('should return correct type for all metrics fields', () => {
    const metrics = m.getMetrics();
    expect(typeof metrics.totalViolations).toBe('number');
    expect(typeof metrics.averageCheckDurationMs).toBe('number');
    expect(typeof metrics.ruleCoverage).toBe('number');
    expect(typeof metrics.autoFixCount).toBe('number');
    expect(typeof metrics.autoFixSuccessRate).toBe('number');
    expect(typeof metrics.overallComplianceScore).toBe('number');
    expect(typeof metrics.checksPerformed).toBe('number');
    expect(typeof metrics.checksPassed).toBe('number');
    expect(typeof metrics.checksFailed).toBe('number');
  });
});
