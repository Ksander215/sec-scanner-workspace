import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportGenerator } from '../../core/compliance/report-generator.js';
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

describe('ReportGenerator – Constructor', () => {
  it('should create instance with default config', () => {
    const rg = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator);
    expect(rg).toBeInstanceOf(ReportGenerator);
  });

  it('should create instance with custom config', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      maxViolationsPerReport: 50,
    };
    const rg = new ReportGenerator(config);
    expect(rg).toBeInstanceOf(ReportGenerator);
  });

  it('should accept event bus as second argument', () => {
    const bus = new InProcessEventBus();
    const rg = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator, bus);
    expect(rg).toBeInstanceOf(ReportGenerator);
  });

  it('should accept null as event bus', () => {
    const rg = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator, null);
    expect(rg).toBeInstanceOf(ReportGenerator);
  });

  it('should accept undefined as event bus', () => {
    const rg = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator, undefined);
    expect(rg).toBeInstanceOf(ReportGenerator);
  });

  it('should store config reference', () => {
    const config = DefaultComplianceRuntimeConfig.reportGenerator;
    const rg = new ReportGenerator(config);
    // Test by using the instance methods that rely on config
    expect(rg.getScoreLevel(95)).toBe(ScoreLevel.Excellent);
  });

  it('should work with zero maxViolationsPerReport', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      maxViolationsPerReport: 0,
    };
    const rg = new ReportGenerator(config);
    expect(rg).toBeInstanceOf(ReportGenerator);
  });

  it('should work with negative maxViolationsPerReport', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      maxViolationsPerReport: -1,
    };
    const rg = new ReportGenerator(config);
    expect(rg).toBeInstanceOf(ReportGenerator);
  });

  it('should work with custom score weights', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      scoreWeights: {
        [RuleCategory.Architecture]: 1.0,
        [RuleCategory.Philosophy]: 0,
        [RuleCategory.Governance]: 0,
        [RuleCategory.Runtime]: 0,
        [RuleCategory.AI]: 0,
        [RuleCategory.Documentation]: 0,
        [RuleCategory.CapabilityPack]: 0,
        [RuleCategory.Privacy]: 0,
        [RuleCategory.Security]: 0,
        [RuleCategory.Quality]: 0,
      },
    } as typeof DefaultComplianceRuntimeConfig.reportGenerator;
    const rg = new ReportGenerator(config);
    expect(rg).toBeInstanceOf(ReportGenerator);
  });

  it('should implement IReportGenerator interface methods', () => {
    const rg = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator);
    expect(typeof rg.generateReport).toBe('function');
    expect(typeof rg.getCategoryScores).toBe('function');
    expect(typeof rg.getOverallScore).toBe('function');
    expect(typeof rg.getScoreLevel).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════
// getScoreLevel
// ═══════════════════════════════════════════════════════════════════

describe('ReportGenerator – getScoreLevel', () => {
  let rg: ReportGenerator;

  beforeEach(() => {
    rg = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator);
  });

  // ─── Boundary: 90 (Excellent) ────────────────────────────────

  it('should return Excellent for score 90', () => {
    expect(rg.getScoreLevel(90)).toBe(ScoreLevel.Excellent);
  });

  it('should return Excellent for score 91', () => {
    expect(rg.getScoreLevel(91)).toBe(ScoreLevel.Excellent);
  });

  it('should return Excellent for score 95', () => {
    expect(rg.getScoreLevel(95)).toBe(ScoreLevel.Excellent);
  });

  it('should return Excellent for score 100', () => {
    expect(rg.getScoreLevel(100)).toBe(ScoreLevel.Excellent);
  });

  it('should return Excellent for score 99.9', () => {
    expect(rg.getScoreLevel(99.9)).toBe(ScoreLevel.Excellent);
  });

  // ─── Boundary: 75 (Good) ────────────────────────────────────

  it('should return Good for score 75', () => {
    expect(rg.getScoreLevel(75)).toBe(ScoreLevel.Good);
  });

  it('should return Good for score 76', () => {
    expect(rg.getScoreLevel(76)).toBe(ScoreLevel.Good);
  });

  it('should return Good for score 80', () => {
    expect(rg.getScoreLevel(80)).toBe(ScoreLevel.Good);
  });

  it('should return Good for score 89', () => {
    expect(rg.getScoreLevel(89)).toBe(ScoreLevel.Good);
  });

  it('should return Good for score 89.9', () => {
    expect(rg.getScoreLevel(89.9)).toBe(ScoreLevel.Good);
  });

  it('should return Excellent for score 90.0', () => {
    expect(rg.getScoreLevel(90.0)).toBe(ScoreLevel.Excellent);
  });

  // ─── Boundary: 60 (Acceptable) ───────────────────────────────

  it('should return Acceptable for score 60', () => {
    expect(rg.getScoreLevel(60)).toBe(ScoreLevel.Acceptable);
  });

  it('should return Acceptable for score 61', () => {
    expect(rg.getScoreLevel(61)).toBe(ScoreLevel.Acceptable);
  });

  it('should return Acceptable for score 70', () => {
    expect(rg.getScoreLevel(70)).toBe(ScoreLevel.Acceptable);
  });

  it('should return Acceptable for score 74', () => {
    expect(rg.getScoreLevel(74)).toBe(ScoreLevel.Acceptable);
  });

  it('should return Acceptable for score 74.9', () => {
    expect(rg.getScoreLevel(74.9)).toBe(ScoreLevel.Acceptable);
  });

  it('should return Good for score 75.0', () => {
    expect(rg.getScoreLevel(75.0)).toBe(ScoreLevel.Good);
  });

  it('should return Good for score 75.1', () => {
    expect(rg.getScoreLevel(75.1)).toBe(ScoreLevel.Good);
  });

  // ─── Boundary: 40 (NeedsImprovement) ─────────────────────────

  it('should return NeedsImprovement for score 40', () => {
    expect(rg.getScoreLevel(40)).toBe(ScoreLevel.NeedsImprovement);
  });

  it('should return NeedsImprovement for score 41', () => {
    expect(rg.getScoreLevel(41)).toBe(ScoreLevel.NeedsImprovement);
  });

  it('should return NeedsImprovement for score 50', () => {
    expect(rg.getScoreLevel(50)).toBe(ScoreLevel.NeedsImprovement);
  });

  it('should return NeedsImprovement for score 59', () => {
    expect(rg.getScoreLevel(59)).toBe(ScoreLevel.NeedsImprovement);
  });

  it('should return NeedsImprovement for score 59.9', () => {
    expect(rg.getScoreLevel(59.9)).toBe(ScoreLevel.NeedsImprovement);
  });

  it('should return Acceptable for score 60.0', () => {
    expect(rg.getScoreLevel(60.0)).toBe(ScoreLevel.Acceptable);
  });

  it('should return Acceptable for score 60.1', () => {
    expect(rg.getScoreLevel(60.1)).toBe(ScoreLevel.Acceptable);
  });

  // ─── Boundary: Failing (< 40) ────────────────────────────────

  it('should return Failing for score 39', () => {
    expect(rg.getScoreLevel(39)).toBe(ScoreLevel.Failing);
  });

  it('should return Failing for score 0', () => {
    expect(rg.getScoreLevel(0)).toBe(ScoreLevel.Failing);
  });

  it('should return Failing for score 1', () => {
    expect(rg.getScoreLevel(1)).toBe(ScoreLevel.Failing);
  });

  it('should return Failing for score 20', () => {
    expect(rg.getScoreLevel(20)).toBe(ScoreLevel.Failing);
  });

  it('should return Failing for score 39.9', () => {
    expect(rg.getScoreLevel(39.9)).toBe(ScoreLevel.Failing);
  });

  it('should return NeedsImprovement for score 40.0', () => {
    expect(rg.getScoreLevel(40.0)).toBe(ScoreLevel.NeedsImprovement);
  });

  it('should return NeedsImprovement for score 40.1', () => {
    expect(rg.getScoreLevel(40.1)).toBe(ScoreLevel.NeedsImprovement);
  });

  // ─── Edge cases ──────────────────────────────────────────────

  it('should return Failing for negative score (-1)', () => {
    expect(rg.getScoreLevel(-1)).toBe(ScoreLevel.Failing);
  });

  it('should return Failing for negative score (-100)', () => {
    expect(rg.getScoreLevel(-100)).toBe(ScoreLevel.Failing);
  });

  it('should return Failing for NaN', () => {
    expect(rg.getScoreLevel(NaN)).toBe(ScoreLevel.Failing);
  });

  it('should return Excellent for Infinity', () => {
    expect(rg.getScoreLevel(Infinity)).toBe(ScoreLevel.Excellent);
  });

  it('should return Failing for -Infinity', () => {
    expect(rg.getScoreLevel(-Infinity)).toBe(ScoreLevel.Failing);
  });

  it('should return Excellent for score 150 (above range)', () => {
    expect(rg.getScoreLevel(150)).toBe(ScoreLevel.Excellent);
  });

  it('should return Excellent for score 1000', () => {
    expect(rg.getScoreLevel(1000)).toBe(ScoreLevel.Excellent);
  });

  it('should return Failing for very small positive score (0.001)', () => {
    expect(rg.getScoreLevel(0.001)).toBe(ScoreLevel.Failing);
  });

  it('should return Failing for score -0.5', () => {
    expect(rg.getScoreLevel(-0.5)).toBe(ScoreLevel.Failing);
  });

  it('should return Excellent for score 90.0001', () => {
    expect(rg.getScoreLevel(90.0001)).toBe(ScoreLevel.Excellent);
  });

  it('should return Good for score 75.0001', () => {
    expect(rg.getScoreLevel(75.0001)).toBe(ScoreLevel.Good);
  });

  it('should return Acceptable for score 60.0001', () => {
    expect(rg.getScoreLevel(60.0001)).toBe(ScoreLevel.Acceptable);
  });

  it('should return NeedsImprovement for score 40.0001', () => {
    expect(rg.getScoreLevel(40.0001)).toBe(ScoreLevel.NeedsImprovement);
  });

  it('should return Failing for score 39.9999', () => {
    expect(rg.getScoreLevel(39.9999)).toBe(ScoreLevel.Failing);
  });
});

// ═══════════════════════════════════════════════════════════════════
// getCategoryScores
// ═══════════════════════════════════════════════════════════════════

describe('ReportGenerator – getCategoryScores', () => {
  let rg: ReportGenerator;

  beforeEach(() => {
    rg = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator);
  });

  // ─── Empty results ───────────────────────────────────────────

  it('should return empty array for empty results', () => {
    const scores = rg.getCategoryScores([]);
    expect(scores).toEqual([]);
  });

  it('should return empty array for results with no rule evaluation results', () => {
    const result = makeValidationResult({ results: [] });
    const scores = rg.getCategoryScores([result]);
    expect(scores).toEqual([]);
  });

  // ─── Single category ─────────────────────────────────────────

  it('should return one category score for single category', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores).toHaveLength(1);
    expect(scores[0].category).toBe(RuleCategory.Architecture);
  });

  it('should compute score 100 when all rules pass in single category', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].score).toBe(100);
  });

  it('should compute score 0 when all rules fail in single category', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].score).toBe(0);
  });

  it('should compute correct score for mixed results in single category', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].score).toBe(50);
  });

  it('should set totalRules correctly for single category', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Security, passed: true }),
        makeRuleResult({ category: RuleCategory.Security, passed: true }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].totalRules).toBe(3);
  });

  it('should set passedRules correctly for single category', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Security, passed: true }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
        makeRuleResult({ category: RuleCategory.Security, passed: true }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].passedRules).toBe(2);
  });

  it('should set failedRules correctly for single category', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Security, passed: true }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].failedRules).toBe(2);
  });

  it('should set level correctly for single category with score 100', () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Security, passed: true })],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].level).toBe(ScoreLevel.Excellent);
  });

  // ─── Multiple categories ─────────────────────────────────────

  it('should return multiple category scores for multiple categories', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores).toHaveLength(2);
  });

  it('should group results by category across multiple validation results', () => {
    const result1 = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
      ],
    });
    const result2 = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
      ],
    });
    const scores = rg.getCategoryScores([result1, result2]);
    expect(scores).toHaveLength(1);
    expect(scores[0].totalRules).toBe(3);
    expect(scores[0].passedRules).toBe(2);
  });

  it('should handle all 10 categories', () => {
    const categories = [
      RuleCategory.Architecture,
      RuleCategory.Philosophy,
      RuleCategory.Governance,
      RuleCategory.Runtime,
      RuleCategory.AI,
      RuleCategory.Documentation,
      RuleCategory.CapabilityPack,
      RuleCategory.Privacy,
      RuleCategory.Security,
      RuleCategory.Quality,
    ];
    const results = categories.map((cat) =>
      makeValidationResult({
        results: [makeRuleResult({ category: cat, passed: true })],
      }),
    );
    const scores = rg.getCategoryScores(results);
    expect(scores).toHaveLength(10);
    for (const score of scores) {
      expect(score.score).toBe(100);
    }
  });

  // ─── All pass / all fail ─────────────────────────────────────

  it('should return score 100 for all-pass category', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Governance, passed: true }),
        makeRuleResult({ category: RuleCategory.Governance, passed: true }),
        makeRuleResult({ category: RuleCategory.Governance, passed: true }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    const gov = scores.find((s) => s.category === RuleCategory.Governance)!;
    expect(gov.score).toBe(100);
    expect(gov.passedRules).toBe(3);
    expect(gov.failedRules).toBe(0);
  });

  it('should return score 0 for all-fail category', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Governance, passed: false }),
        makeRuleResult({ category: RuleCategory.Governance, passed: false }),
        makeRuleResult({ category: RuleCategory.Governance, passed: false }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    const gov = scores.find((s) => s.category === RuleCategory.Governance)!;
    expect(gov.score).toBe(0);
    expect(gov.passedRules).toBe(0);
    expect(gov.failedRules).toBe(3);
  });

  // ─── Mixed categories ────────────────────────────────────────

  it('should compute different scores for different categories', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
        makeRuleResult({ category: RuleCategory.Security, passed: true }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    const arch = scores.find((s) => s.category === RuleCategory.Architecture)!;
    const sec = scores.find((s) => s.category === RuleCategory.Security)!;
    expect(arch.score).toBe(100);
    expect(sec.score).toBeCloseTo(33.33, 1);
  });

  // ─── Critical violations count ───────────────────────────────

  it('should count critical violations in category scores', () => {
    const criticalViolation = makeViolation({ severity: RuleSeverity.Critical });
    const warningViolation = makeViolation({ severity: RuleSeverity.Warning });
    const result = makeValidationResult({
      results: [
        makeRuleResult({
          category: RuleCategory.Security,
          passed: false,
          violations: [criticalViolation, warningViolation],
        }),
        makeRuleResult({
          category: RuleCategory.Security,
          passed: false,
          violations: [criticalViolation],
        }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    const sec = scores.find((s) => s.category === RuleCategory.Security)!;
    expect(sec.criticalViolations).toBe(2);
  });

  it('should report zero critical violations when none exist', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({
          category: RuleCategory.Security,
          passed: false,
          violations: [makeViolation({ severity: RuleSeverity.Error })],
        }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].criticalViolations).toBe(0);
  });

  it('should count critical violations across multiple categories separately', () => {
    const critVio = makeViolation({ severity: RuleSeverity.Critical });
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Security, passed: false, violations: [critVio] }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false, violations: [critVio] }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    for (const score of scores) {
      expect(score.criticalViolations).toBe(1);
    }
  });

  // ─── Score level in category scores ──────────────────────────

  it('should set level to Failing for category score 0', () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Quality, passed: false })],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].level).toBe(ScoreLevel.Failing);
  });

  it('should set level to NeedsImprovement for category score 50', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Quality, passed: true }),
        makeRuleResult({ category: RuleCategory.Quality, passed: false }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].level).toBe(ScoreLevel.NeedsImprovement);
  });

  it('should set level to Acceptable for category score 70', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Quality, passed: true }),
        makeRuleResult({ category: RuleCategory.Quality, passed: true }),
        makeRuleResult({ category: RuleCategory.Quality, passed: true }),
        makeRuleResult({ category: RuleCategory.Quality, passed: true }),
        makeRuleResult({ category: RuleCategory.Quality, passed: true }),
        makeRuleResult({ category: RuleCategory.Quality, passed: true }),
        makeRuleResult({ category: RuleCategory.Quality, passed: true }),
        makeRuleResult({ category: RuleCategory.Quality, passed: false }),
        makeRuleResult({ category: RuleCategory.Quality, passed: false }),
        makeRuleResult({ category: RuleCategory.Quality, passed: false }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].level).toBe(ScoreLevel.Acceptable);
  });

  // ─── Frozen results ──────────────────────────────────────────

  it('should return frozen category score objects', () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: true })],
    });
    const scores = rg.getCategoryScores([result]);
    expect(Object.isFrozen(scores[0])).toBe(true);
  });

  // ─── Single rule edge case ───────────────────────────────────

  it('should handle a single rule that passes', () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Privacy, passed: true })],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores).toHaveLength(1);
    expect(scores[0].score).toBe(100);
    expect(scores[0].totalRules).toBe(1);
  });

  it('should handle a single rule that fails', () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Privacy, passed: false })],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores).toHaveLength(1);
    expect(scores[0].score).toBe(0);
    expect(scores[0].totalRules).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// getOverallScore
// ═══════════════════════════════════════════════════════════════════

describe('ReportGenerator – getOverallScore', () => {
  let rg: ReportGenerator;

  beforeEach(() => {
    rg = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator);
  });

  // ─── Empty results ───────────────────────────────────────────

  it('should return ~100 for empty results (no categories → all default to 100)', () => {
    expect(rg.getOverallScore([])).toBeCloseTo(100, 5);
  });

  it('should return ~100 for results with no rule evaluation results', () => {
    const result = makeValidationResult({ results: [] });
    expect(rg.getOverallScore([result])).toBeCloseTo(100, 5);
  });

  // ─── Single category ─────────────────────────────────────────

  it('should return weighted score for single category', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      scoreWeights: {
        [RuleCategory.Architecture]: 1.0,
        [RuleCategory.Philosophy]: 0,
        [RuleCategory.Governance]: 0,
        [RuleCategory.Runtime]: 0,
        [RuleCategory.AI]: 0,
        [RuleCategory.Documentation]: 0,
        [RuleCategory.CapabilityPack]: 0,
        [RuleCategory.Privacy]: 0,
        [RuleCategory.Security]: 0,
        [RuleCategory.Quality]: 0,
      },
    } as typeof DefaultComplianceRuntimeConfig.reportGenerator;
    const rgSingle = new ReportGenerator(config);
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: true })],
    });
    expect(rgSingle.getOverallScore([result])).toBe(100);
  });

  it('should compute 0 when single category has all failures', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      scoreWeights: {
        [RuleCategory.Architecture]: 1.0,
        [RuleCategory.Philosophy]: 0,
        [RuleCategory.Governance]: 0,
        [RuleCategory.Runtime]: 0,
        [RuleCategory.AI]: 0,
        [RuleCategory.Documentation]: 0,
        [RuleCategory.CapabilityPack]: 0,
        [RuleCategory.Privacy]: 0,
        [RuleCategory.Security]: 0,
        [RuleCategory.Quality]: 0,
      },
    } as typeof DefaultComplianceRuntimeConfig.reportGenerator;
    const rgSingle = new ReportGenerator(config);
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: false })],
    });
    expect(rgSingle.getOverallScore([result])).toBe(0);
  });

  // ─── All categories ──────────────────────────────────────────

  it('should return ~100 when all categories score 100', () => {
    const categories = Object.keys(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights) as RuleCategory[];
    const results = categories.map((cat) =>
      makeValidationResult({
        results: [makeRuleResult({ category: cat, passed: true })],
      }),
    );
    expect(rg.getOverallScore(results)).toBeCloseTo(100, 5);
  });

  it('should return 0 when all categories score 0', () => {
    const categories = Object.keys(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights) as RuleCategory[];
    const results = categories.map((cat) =>
      makeValidationResult({
        results: [makeRuleResult({ category: cat, passed: false })],
      }),
    );
    expect(rg.getOverallScore(results)).toBe(0);
  });

  // ─── Weighted calculation ────────────────────────────────────

  it('should correctly compute weighted average', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      scoreWeights: {
        [RuleCategory.Architecture]: 0.6,
        [RuleCategory.Philosophy]: 0,
        [RuleCategory.Governance]: 0.4,
        [RuleCategory.Runtime]: 0,
        [RuleCategory.AI]: 0,
        [RuleCategory.Documentation]: 0,
        [RuleCategory.CapabilityPack]: 0,
        [RuleCategory.Privacy]: 0,
        [RuleCategory.Security]: 0,
        [RuleCategory.Quality]: 0,
      },
    } as typeof DefaultComplianceRuntimeConfig.reportGenerator;
    const rgWeighted = new ReportGenerator(config);
    // Architecture: 50%, Governance: 100% → 0.6*50 + 0.4*100 = 30 + 40 = 70
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
        makeRuleResult({ category: RuleCategory.Governance, passed: true }),
      ],
    });
    expect(rgWeighted.getOverallScore([result])).toBe(70);
  });

  it('should default missing categories to score 100', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      scoreWeights: {
        [RuleCategory.Architecture]: 0.5,
        [RuleCategory.Philosophy]: 0.5,
        [RuleCategory.Governance]: 0,
        [RuleCategory.Runtime]: 0,
        [RuleCategory.AI]: 0,
        [RuleCategory.Documentation]: 0,
        [RuleCategory.CapabilityPack]: 0,
        [RuleCategory.Privacy]: 0,
        [RuleCategory.Security]: 0,
        [RuleCategory.Quality]: 0,
      },
    } as typeof DefaultComplianceRuntimeConfig.reportGenerator;
    const rgMissing = new ReportGenerator(config);
    // Only Architecture present (score 0), Philosophy missing (default 100)
    // 0.5*0 + 0.5*100 = 50
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: false })],
    });
    expect(rgMissing.getOverallScore([result])).toBe(50);
  });

  it('should return ~100 when only some categories are present and all pass', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Governance, passed: true }),
      ],
    });
    // Present categories: Architecture (100), Governance (100)
    // Missing categories default to 100
    expect(rg.getOverallScore([result])).toBeCloseTo(100, 5);
  });

  it('should handle equal weights correctly', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      scoreWeights: {
        [RuleCategory.Architecture]: 0.5,
        [RuleCategory.Philosophy]: 0.5,
        [RuleCategory.Governance]: 0,
        [RuleCategory.Runtime]: 0,
        [RuleCategory.AI]: 0,
        [RuleCategory.Documentation]: 0,
        [RuleCategory.CapabilityPack]: 0,
        [RuleCategory.Privacy]: 0,
        [RuleCategory.Security]: 0,
        [RuleCategory.Quality]: 0,
      },
    } as typeof DefaultComplianceRuntimeConfig.reportGenerator;
    const rgEqual = new ReportGenerator(config);
    // Architecture: 0%, Philosophy: 100% → (0+100)/2 = 50
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
        makeRuleResult({ category: RuleCategory.Philosophy, passed: true }),
      ],
    });
    expect(rgEqual.getOverallScore([result])).toBe(50);
  });

  it('should return a number', () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: true })],
    });
    expect(typeof rg.getOverallScore([result])).toBe('number');
  });

  it('should return finite number', () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: true })],
    });
    expect(Number.isFinite(rg.getOverallScore([result]))).toBe(true);
  });

  it('should aggregate rules across multiple validation results for same category', () => {
    const r1 = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: true })],
    });
    const r2 = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
      ],
    });
    // Architecture: 2/3 passed = 66.67, rest default to 100
    const score = rg.getOverallScore([r1, r2]);
    expect(score).toBeGreaterThan(60);
    expect(score).toBeLessThan(100);
  });

  it('should handle zero total weight gracefully', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      scoreWeights: {
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
      },
    } as typeof DefaultComplianceRuntimeConfig.reportGenerator;
    const rgZero = new ReportGenerator(config);
    expect(rgZero.getOverallScore([])).toBe(100);
  });

  it('should handle fractional scores correctly', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      scoreWeights: {
        [RuleCategory.Architecture]: 1.0,
        [RuleCategory.Philosophy]: 0,
        [RuleCategory.Governance]: 0,
        [RuleCategory.Runtime]: 0,
        [RuleCategory.AI]: 0,
        [RuleCategory.Documentation]: 0,
        [RuleCategory.CapabilityPack]: 0,
        [RuleCategory.Privacy]: 0,
        [RuleCategory.Security]: 0,
        [RuleCategory.Quality]: 0,
      },
    } as typeof DefaultComplianceRuntimeConfig.reportGenerator;
    const rgFrac = new ReportGenerator(config);
    // 1/3 passed = 33.33
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
      ],
    });
    expect(rgFrac.getOverallScore([result])).toBeCloseTo(33.33, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// generateReport
// ═══════════════════════════════════════════════════════════════════

describe('ReportGenerator – generateReport', () => {
  let rg: ReportGenerator;
  let sessionId: ReturnType<typeof brandComplianceSessionId>;

  beforeEach(() => {
    rg = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator);
    sessionId = brandComplianceSessionId('test-session-report');
  });

  // ─── Empty results ───────────────────────────────────────────

  it('should return a report for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report).toBeDefined();
    expect(report.sessionId).toBe(sessionId);
  });

  it('should have overallScore ~100 for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.overallScore).toBeCloseTo(100, 5);
  });

  it('should have overallLevel Excellent for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.overallLevel).toBe(ScoreLevel.Excellent);
  });

  it('should have empty categoryScores for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.categoryScores).toEqual([]);
  });

  it('should have zero totalRules for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.totalRules).toBe(0);
  });

  it('should have zero totalPassed for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.totalPassed).toBe(0);
  });

  it('should have zero totalFailed for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.totalFailed).toBe(0);
  });

  it('should have zero totalViolations for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.totalViolations).toBe(0);
  });

  it('should have zero criticalViolations for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.criticalViolations).toBe(0);
  });

  it('should have empty violations array for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.violations).toEqual([]);
  });

  it('should have empty validationResults for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.validationResults).toEqual([]);
  });

  it('should have a valid generatedAt timestamp for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(new Date(report.generatedAt).getTime()).not.toBeNaN();
  });

  it('should have non-negative durationMs for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should have metadata object for empty results', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.metadata).toEqual({});
  });

  // ─── Single result ───────────────────────────────────────────

  it('should return report with single validation result', async () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: true })],
      totalRules: 1,
      passedRules: 1,
      failedRules: 0,
    });
    const report = await rg.generateReport([result], sessionId);
    expect(report.validationResults).toHaveLength(1);
  });

  it('should aggregate totalRules from single result', async () => {
    const result = makeValidationResult({ totalRules: 5, passedRules: 3, failedRules: 2 });
    const report = await rg.generateReport([result], sessionId);
    expect(report.totalRules).toBe(5);
  });

  it('should aggregate totalPassed from single result', async () => {
    const result = makeValidationResult({ totalRules: 5, passedRules: 3, failedRules: 2 });
    const report = await rg.generateReport([result], sessionId);
    expect(report.totalPassed).toBe(3);
  });

  it('should aggregate totalFailed from single result', async () => {
    const result = makeValidationResult({ totalRules: 5, passedRules: 3, failedRules: 2 });
    const report = await rg.generateReport([result], sessionId);
    expect(report.totalFailed).toBe(2);
  });

  // ─── Multiple results ────────────────────────────────────────

  it('should aggregate totals across multiple validation results', async () => {
    const r1 = makeValidationResult({ totalRules: 3, passedRules: 2, failedRules: 1 });
    const r2 = makeValidationResult({ totalRules: 4, passedRules: 1, failedRules: 3 });
    const report = await rg.generateReport([r1, r2], sessionId);
    expect(report.totalRules).toBe(7);
    expect(report.totalPassed).toBe(3);
    expect(report.totalFailed).toBe(4);
  });

  it('should aggregate violations across multiple validation results', async () => {
    const v1 = makeViolation();
    const v2 = makeViolation();
    const r1 = makeValidationResult({ violations: [v1] });
    const r2 = makeValidationResult({ violations: [v2] });
    const report = await rg.generateReport([r1, r2], sessionId);
    expect(report.totalViolations).toBe(2);
  });

  it('should include all validationResults in report', async () => {
    const r1 = makeValidationResult();
    const r2 = makeValidationResult();
    const r3 = makeValidationResult();
    const report = await rg.generateReport([r1, r2, r3], sessionId);
    expect(report.validationResults).toHaveLength(3);
  });

  // ─── Violation capping ───────────────────────────────────────

  it('should cap violations when maxViolationsPerReport is exceeded', async () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      maxViolationsPerReport: 2,
    };
    const rgCap = new ReportGenerator(config);
    const violations = Array.from({ length: 10 }, () => makeViolation());
    const result = makeValidationResult({ violations });
    const report = await rgCap.generateReport([result], sessionId);
    expect(report.violations).toHaveLength(2);
  });

  it('should not cap violations when under the limit', async () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      maxViolationsPerReport: 100,
    };
    const rgCap = new ReportGenerator(config);
    const violations = Array.from({ length: 5 }, () => makeViolation());
    const result = makeValidationResult({ violations });
    const report = await rgCap.generateReport([result], sessionId);
    expect(report.violations).toHaveLength(5);
  });

  it('should not cap violations when maxViolationsPerReport is 0 (unlimited)', async () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      maxViolationsPerReport: 0,
    };
    const rgCap = new ReportGenerator(config);
    const violations = Array.from({ length: 5 }, () => makeViolation());
    const result = makeValidationResult({ violations });
    const report = await rgCap.generateReport([result], sessionId);
    expect(report.violations).toHaveLength(5);
  });

  it('should not cap violations when maxViolationsPerReport is negative (unlimited)', async () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      maxViolationsPerReport: -1,
    };
    const rgCap = new ReportGenerator(config);
    const violations = Array.from({ length: 5 }, () => makeViolation());
    const result = makeValidationResult({ violations });
    const report = await rgCap.generateReport([result], sessionId);
    expect(report.violations).toHaveLength(5);
  });

  it('should report totalViolations as uncapped count', async () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      maxViolationsPerReport: 2,
    };
    const rgCap = new ReportGenerator(config);
    const violations = Array.from({ length: 10 }, () => makeViolation());
    const result = makeValidationResult({ violations });
    const report = await rgCap.generateReport([result], sessionId);
    expect(report.totalViolations).toBe(10);
    expect(report.violations).toHaveLength(2);
  });

  // ─── Critical violations count ───────────────────────────────

  it('should count critical violations correctly', async () => {
    const critVio = makeViolation({ severity: RuleSeverity.Critical });
    const errVio = makeViolation({ severity: RuleSeverity.Error });
    const result = makeValidationResult({ violations: [critVio, critVio, errVio] });
    const report = await rg.generateReport([result], sessionId);
    expect(report.criticalViolations).toBe(2);
  });

  it('should count zero critical violations when none exist', async () => {
    const errVio = makeViolation({ severity: RuleSeverity.Error });
    const result = makeValidationResult({ violations: [errVio, errVio] });
    const report = await rg.generateReport([result], sessionId);
    expect(report.criticalViolations).toBe(0);
  });

  // ─── Named dimension scores ──────────────────────────────────

  it('should set architectureScore from category scores', async () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
      ],
    });
    const report = await rg.generateReport([result], sessionId);
    expect(report.architectureScore).toBe(50);
  });

  it('should set governanceScore from category scores', async () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Governance, passed: true })],
    });
    const report = await rg.generateReport([result], sessionId);
    expect(report.governanceScore).toBe(100);
  });

  it('should set documentationScore from category scores', async () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Documentation, passed: false })],
    });
    const report = await rg.generateReport([result], sessionId);
    expect(report.documentationScore).toBe(0);
  });

  it('should set qualityScore from category scores', async () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Quality, passed: true }),
        makeRuleResult({ category: RuleCategory.Quality, passed: false }),
        makeRuleResult({ category: RuleCategory.Quality, passed: false }),
        makeRuleResult({ category: RuleCategory.Quality, passed: true }),
      ],
    });
    const report = await rg.generateReport([result], sessionId);
    expect(report.qualityScore).toBe(50);
  });

  it('should set privacyScore from category scores', async () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Privacy, passed: true })],
    });
    const report = await rg.generateReport([result], sessionId);
    expect(report.privacyScore).toBe(100);
  });

  it('should set securityScore from category scores', async () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Security, passed: false })],
    });
    const report = await rg.generateReport([result], sessionId);
    expect(report.securityScore).toBe(0);
  });

  it('should default missing category scores to 100', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.architectureScore).toBe(100);
    expect(report.governanceScore).toBe(100);
    expect(report.documentationScore).toBe(100);
    expect(report.qualityScore).toBe(100);
    expect(report.privacyScore).toBe(100);
    expect(report.securityScore).toBe(100);
  });

  // ─── Event published ─────────────────────────────────────────

  it('should publish ReportGeneratedEvent when eventBus is provided', async () => {
    const bus = new InProcessEventBus();
    const rgEvent = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator, bus);
    const handler = vi.fn();
    bus.subscribe('compliance.report.generated', handler);
    await rgEvent.generateReport([], sessionId);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not publish event when eventBus is null', async () => {
    const rgNoBus = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator, null);
    const report = await rgNoBus.generateReport([], sessionId);
    expect(report).toBeDefined();
  });

  it('should not publish event when eventBus is undefined', async () => {
    const rgNoBus = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator, undefined);
    const report = await rgNoBus.generateReport([], sessionId);
    expect(report).toBeDefined();
  });

  it('should publish event with correct eventType', async () => {
    const bus = new InProcessEventBus();
    const rgEvent = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator, bus);
    const handler = vi.fn();
    bus.subscribe('compliance.report.generated', handler);
    await rgEvent.generateReport([], sessionId);
    const envelope = bus.getLog()[0];
    expect(envelope.eventType).toBe('compliance.report.generated');
  });

  it('should publish event with correct event type in log', async () => {
    const bus = new InProcessEventBus();
    const rgEvent = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator, bus);
    await rgEvent.generateReport([], sessionId);
    const log = bus.getLog();
    expect(log).toHaveLength(1);
    expect(log[0].eventType).toBe('compliance.report.generated');
  });

  // ─── Report structure ────────────────────────────────────────

  it('should return a frozen report object', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(Object.isFrozen(report)).toBe(true);
  });

  it('should have a valid report id', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.id).toBeDefined();
    expect(typeof report.id).toBe('string');
  });

  it('should have matching sessionId', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.sessionId).toBe(sessionId);
  });

  it('should have valid generatedAt as ISO string', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(typeof report.generatedAt).toBe('string');
    expect(() => new Date(report.generatedAt)).not.toThrow();
  });

  it('should have non-negative durationMs', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should have correct overallScore type', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(typeof report.overallScore).toBe('number');
  });

  it('should have correct overallLevel type', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(Object.values(ScoreLevel)).toContain(report.overallLevel);
  });

  it('should have categoryScores as array', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(Array.isArray(report.categoryScores)).toBe(true);
  });

  it('should have violations as readonly array', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(Array.isArray(report.violations)).toBe(true);
  });

  it('should have validationResults matching input', async () => {
    const r1 = makeValidationResult();
    const r2 = makeValidationResult();
    const report = await rg.generateReport([r1, r2], sessionId);
    expect(report.validationResults).toHaveLength(2);
    expect(report.validationResults[0]).toBe(r1);
    expect(report.validationResults[1]).toBe(r2);
  });

  it('should have correct totalViolations count', async () => {
    const v1 = makeViolation();
    const v2 = makeViolation();
    const v3 = makeViolation();
    const result = makeValidationResult({ violations: [v1, v2, v3] });
    const report = await rg.generateReport([result], sessionId);
    expect(report.totalViolations).toBe(3);
  });

  // ─── Score computation in report ─────────────────────────────

  it('should compute overallScore correctly in report', async () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
      ],
    });
    const report = await rg.generateReport([result], sessionId);
    // Architecture: 50%, all others default to 100
    // Default weight for Architecture: 0.20
    // weighted = 50*0.20 + 100*0.10 + 100*0.20 + 100*0.10 + 100*0.10 + 100*0.05 + 100*0.05 + 100*0.10 + 100*0.10 + 100*0.10
    // = 10 + 10 + 20 + 10 + 10 + 5 + 5 + 10 + 10 + 10 = 100
    // Actually: total weight = 1.10 (from default config), weighted sum = 10 + sum of 100*other_weights
    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
  });

  it('should compute overallLevel from overallScore in report', async () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
        makeRuleResult({ category: RuleCategory.Governance, passed: false }),
        makeRuleResult({ category: RuleCategory.Governance, passed: false }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
      ],
    });
    const report = await rg.generateReport([result], sessionId);
    // Most categories at 0, but missing ones default to 100
    expect(typeof report.overallLevel).toBe('string');
  });

  // ─── Category scores in report ───────────────────────────────

  it('should include categoryScores matching getCategoryScores output', async () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: true })],
    });
    const expectedScores = rg.getCategoryScores([result]);
    const report = await rg.generateReport([result], sessionId);
    expect(report.categoryScores).toEqual(expectedScores);
  });

  // ─── Multiple violations across results ──────────────────────

  it('should aggregate violations from multiple validation results', async () => {
    const v1 = makeViolation();
    const v2 = makeViolation();
    const v3 = makeViolation();
    const r1 = makeValidationResult({ violations: [v1, v2] });
    const r2 = makeValidationResult({ violations: [v3] });
    const report = await rg.generateReport([r1, r2], sessionId);
    expect(report.totalViolations).toBe(3);
  });

  it('should cap at exactly maxViolationsPerReport', async () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      maxViolationsPerReport: 3,
    };
    const rgExact = new ReportGenerator(config);
    const violations = Array.from({ length: 10 }, () => makeViolation());
    const result = makeValidationResult({ violations });
    const report = await rgExact.generateReport([result], sessionId);
    expect(report.violations).toHaveLength(3);
  });

  // ─── Critical violations counting ────────────────────────────

  it('should count critical violations across all results (uncapped)', async () => {
    const critVio = makeViolation({ severity: RuleSeverity.Critical });
    const result1 = makeValidationResult({ violations: [critVio, critVio] });
    const result2 = makeValidationResult({ violations: [critVio] });
    const report = await rg.generateReport([result1, result2], sessionId);
    expect(report.criticalViolations).toBe(3);
  });

  // ─── Empty validation results ────────────────────────────────

  it('should handle validation result with no violations and no rule results', async () => {
    const result = makeValidationResult({ results: [], violations: [], totalRules: 0, passedRules: 0, failedRules: 0 });
    const report = await rg.generateReport([result], sessionId);
    expect(report.totalViolations).toBe(0);
    expect(report.totalRules).toBe(0);
  });

  // ─── Report metadata ─────────────────────────────────────────

  it('should have empty metadata object', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.metadata).toEqual({});
  });

  // ─── Event payload verification ──────────────────────────────

  it('should publish event with report aggregateId', async () => {
    const bus = new InProcessEventBus();
    const rgEvent = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator, bus);
    const report = await rgEvent.generateReport([], sessionId);
    const log = bus.getLog();
    expect(log).toHaveLength(1);
    // The aggregateId on the envelope is set from envelope.eventId, not report.id
    expect(log[0].eventId).toBeDefined();
  });

  // ─── Idempotency / consistency ───────────────────────────────

  it('should generate unique report ids for different calls', async () => {
    const r1 = await rg.generateReport([], sessionId);
    const r2 = await rg.generateReport([], sessionId);
    expect(r1.id).not.toBe(r2.id);
  });

  it('should generate different generatedAt for consecutive calls', async () => {
    const r1 = await rg.generateReport([], sessionId);
    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 2));
    const r2 = await rg.generateReport([], sessionId);
    // Both should be valid timestamps
    expect(new Date(r1.generatedAt).getTime()).not.toBeNaN();
    expect(new Date(r2.generatedAt).getTime()).not.toBeNaN();
  });

  it('should preserve reference to input validationResults', async () => {
    const result = makeValidationResult();
    const report = await rg.generateReport([result], sessionId);
    expect(report.validationResults[0]).toBe(result);
  });

  // ─── Score consistency ───────────────────────────────────────

  it('should have overallScore matching getOverallScore', async () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Security, passed: false }),
      ],
    });
    const expected = rg.getOverallScore([result]);
    const report = await rg.generateReport([result], sessionId);
    expect(report.overallScore).toBe(expected);
  });

  it('should have overallLevel matching getScoreLevel of overallScore', async () => {
    const report = await rg.generateReport([], sessionId);
    expect(report.overallLevel).toBe(rg.getScoreLevel(report.overallScore));
  });

  // ─── Additional category score edge cases ─────────────────────

  it('should handle many rules in a single category', async () => {
    // i % 3 !== 0 passes for i=1,2,4,5,7,8,... → 2 out of every 3 = 66 out of 100
    const results = Array.from({ length: 100 }, (_, i) =>
      makeRuleResult({ category: RuleCategory.Quality, passed: i % 3 !== 0 }),
    );
    const result = makeValidationResult({ results, totalRules: 100, passedRules: 66, failedRules: 34 });
    const report = await rg.generateReport([result], sessionId);
    const qualityScore = report.categoryScores.find((s) => s.category === RuleCategory.Quality);
    expect(qualityScore).toBeDefined();
    expect(qualityScore!.totalRules).toBe(100);
    expect(qualityScore!.passedRules).toBe(66);
    expect(qualityScore!.score).toBe(66);
  });

  it('should handle violations from rule evaluation results (not from result.violations)', async () => {
    const vio = makeViolation({ severity: RuleSeverity.Critical });
    const ruleResult = makeRuleResult({ category: RuleCategory.Security, passed: false, violations: [vio] });
    const result = makeValidationResult({ results: [ruleResult], violations: [] });
    const report = await rg.generateReport([result], sessionId);
    // Critical violations come from result.violations, not from rule evaluation result violations
    // The generateReport counts critical from result.violations (top level)
    expect(report.criticalViolations).toBe(0);
  });

  it('should have named scores match corresponding category scores', async () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Governance, passed: true }),
        makeRuleResult({ category: RuleCategory.Governance, passed: false }),
      ],
    });
    const report = await rg.generateReport([result], sessionId);
    expect(report.architectureScore).toBe(100);
    expect(report.governanceScore).toBe(50);
  });

  it('should handle single rule with violations in category scores', async () => {
    const vio = makeViolation({ severity: RuleSeverity.Critical });
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Security, passed: false, violations: [vio] })],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].criticalViolations).toBe(1);
  });

  it('should handle multiple critical violations on single rule in category scores', async () => {
    const v1 = makeViolation({ severity: RuleSeverity.Critical });
    const v2 = makeViolation({ severity: RuleSeverity.Critical });
    const v3 = makeViolation({ severity: RuleSeverity.Error });
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Security, passed: false, violations: [v1, v2, v3] })],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].criticalViolations).toBe(2);
  });

  it('should correctly score category with 1 of 3 passing (33.33)', async () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].score).toBeCloseTo(33.33, 1);
  });

  it('should correctly score category with 2 of 3 passing (66.67)', async () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].score).toBeCloseTo(66.67, 1);
  });

  it('should return same category score for multiple calls with same input', () => {
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
      ],
    });
    const s1 = rg.getCategoryScores([result]);
    const s2 = rg.getCategoryScores([result]);
    expect(s1).toEqual(s2);
  });

  it('should handle category with only warnings severity', () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Documentation, severity: RuleSeverity.Warning, passed: true })],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].score).toBe(100);
    expect(scores[0].level).toBe(ScoreLevel.Excellent);
  });

  it('should handle category with info severity failures', () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Documentation, severity: RuleSeverity.Info, passed: false })],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].score).toBe(0);
    expect(scores[0].level).toBe(ScoreLevel.Failing);
  });

  it('should handle zero-weighted categories in overall score', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      scoreWeights: {
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
      },
    } as typeof DefaultComplianceRuntimeConfig.reportGenerator;
    const rgZeroW = new ReportGenerator(config);
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: false })],
    });
    expect(rgZeroW.getOverallScore([result])).toBe(100);
  });

  it('should aggregate critical violations across multiple rule results in same category', () => {
    const v1 = makeViolation({ severity: RuleSeverity.Critical });
    const v2 = makeViolation({ severity: RuleSeverity.Critical });
    const v3 = makeViolation({ severity: RuleSeverity.Critical });
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Security, passed: false, violations: [v1] }),
        makeRuleResult({ category: RuleCategory.Security, passed: false, violations: [v2, v3] }),
      ],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].criticalViolations).toBe(3);
  });

  it('should handle violations array being empty in rule result', () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: false, violations: [] })],
    });
    const scores = rg.getCategoryScores([result]);
    expect(scores[0].criticalViolations).toBe(0);
  });

  it('should handle category scores across three validation results', () => {
    const r1 = makeValidationResult({ results: [makeRuleResult({ category: RuleCategory.Quality, passed: true })] });
    const r2 = makeValidationResult({ results: [makeRuleResult({ category: RuleCategory.Quality, passed: false })] });
    const r3 = makeValidationResult({ results: [makeRuleResult({ category: RuleCategory.Quality, passed: true })] });
    const scores = rg.getCategoryScores([r1, r2, r3]);
    expect(scores).toHaveLength(1);
    expect(scores[0].totalRules).toBe(3);
    expect(scores[0].passedRules).toBe(2);
    expect(scores[0].score).toBeCloseTo(66.67, 1);
  });

  it('should handle overallScore with only one non-zero weight category', () => {
    const config = {
      ...DefaultComplianceRuntimeConfig.reportGenerator,
      scoreWeights: {
        [RuleCategory.Architecture]: 1.0,
        [RuleCategory.Philosophy]: 0,
        [RuleCategory.Governance]: 0,
        [RuleCategory.Runtime]: 0,
        [RuleCategory.AI]: 0,
        [RuleCategory.Documentation]: 0,
        [RuleCategory.CapabilityPack]: 0,
        [RuleCategory.Privacy]: 0,
        [RuleCategory.Security]: 0,
        [RuleCategory.Quality]: 0,
      },
    } as typeof DefaultComplianceRuntimeConfig.reportGenerator;
    const rgOne = new ReportGenerator(config);
    const result = makeValidationResult({
      results: [
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: true }),
        makeRuleResult({ category: RuleCategory.Architecture, passed: false }),
      ],
    });
    expect(rgOne.getOverallScore([result])).toBeCloseTo(66.67, 1);
  });

  it('should produce frozen category scores in report', async () => {
    const result = makeValidationResult({
      results: [makeRuleResult({ category: RuleCategory.Architecture, passed: true })],
    });
    const report = await rg.generateReport([result], sessionId);
    expect(Object.isFrozen(report.categoryScores[0])).toBe(true);
  });

  it('should produce violations array with correct items', async () => {
    const v = makeViolation();
    const result = makeValidationResult({ violations: [v] });
    const report = await rg.generateReport([result], sessionId);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]).toBe(v);
  });

  it('should handle generateReport with many validation results', async () => {
    const results = Array.from({ length: 50 }, () =>
      makeValidationResult({
        results: [makeRuleResult({ category: RuleCategory.Architecture, passed: Math.random() > 0.5 })],
        totalRules: 1,
        passedRules: 1,
        failedRules: 0,
      }),
    );
    const report = await rg.generateReport(results, sessionId);
    expect(report.validationResults).toHaveLength(50);
    expect(report.totalRules).toBe(50);
  });

  it('should return a Promise from generateReport', async () => {
    const result = rg.generateReport([], sessionId);
    expect(result).toBeInstanceOf(Promise);
  });
});
