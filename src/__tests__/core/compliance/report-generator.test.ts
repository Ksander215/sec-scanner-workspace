import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportGenerator } from '../../../core/compliance/report-generator.js';
import {
  RuleCategory,
  RuleSeverity,
  ScoreLevel,
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
    durationMs: 5,
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

describe('ReportGenerator', () => {
  let generator: ReportGenerator;
  const mockEventBus = { publish: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new ReportGenerator(
      { ...DefaultComplianceRuntimeConfig.reportGenerator },
      mockEventBus,
    );
  });

  // ─── getScoreLevel ──────────────────────────────────────────────
  describe('getScoreLevel', () => {
    it('should return Failing for score < 40', () => {
      expect(generator.getScoreLevel(0)).toBe(ScoreLevel.Failing);
    });

    it('should return Failing for score 39.9', () => {
      expect(generator.getScoreLevel(39.9)).toBe(ScoreLevel.Failing);
    });

    it('should return NeedsImprovement for score 40', () => {
      expect(generator.getScoreLevel(40)).toBe(ScoreLevel.NeedsImprovement);
    });

    it('should return NeedsImprovement for score 59.9', () => {
      expect(generator.getScoreLevel(59.9)).toBe(ScoreLevel.NeedsImprovement);
    });

    it('should return Acceptable for score 60', () => {
      expect(generator.getScoreLevel(60)).toBe(ScoreLevel.Acceptable);
    });

    it('should return Acceptable for score 74.9', () => {
      expect(generator.getScoreLevel(74.9)).toBe(ScoreLevel.Acceptable);
    });

    it('should return Good for score 75', () => {
      expect(generator.getScoreLevel(75)).toBe(ScoreLevel.Good);
    });

    it('should return Good for score 89.9', () => {
      expect(generator.getScoreLevel(89.9)).toBe(ScoreLevel.Good);
    });

    it('should return Excellent for score 90', () => {
      expect(generator.getScoreLevel(90)).toBe(ScoreLevel.Excellent);
    });

    it('should return Excellent for score 100', () => {
      expect(generator.getScoreLevel(100)).toBe(ScoreLevel.Excellent);
    });

    it('should return Excellent for score > 100', () => {
      expect(generator.getScoreLevel(101)).toBe(ScoreLevel.Excellent);
    });

    it('should return Failing for negative score', () => {
      expect(generator.getScoreLevel(-10)).toBe(ScoreLevel.Failing);
    });

    it('should return Excellent for very high score', () => {
      expect(generator.getScoreLevel(999)).toBe(ScoreLevel.Excellent);
    });
  });

  // ─── getCategoryScores ──────────────────────────────────────────
  describe('getCategoryScores', () => {
    it('should return empty array for empty results', () => {
      const scores = generator.getCategoryScores([]);
      expect(scores).toEqual([]);
    });

    it('should return one category for single-category results', () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
        ],
      });
      const scores = generator.getCategoryScores([result]);
      expect(scores).toHaveLength(1);
      expect(scores[0].category).toBe(RuleCategory.Architecture);
    });

    it('should compute correct score for category', () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
        ],
      });
      const scores = generator.getCategoryScores([result]);
      expect(scores[0].score).toBeCloseTo(66.67, 1);
    });

    it('should compute 100 score when all pass', () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
        ],
      });
      const scores = generator.getCategoryScores([result]);
      expect(scores[0].score).toBe(100);
    });

    it('should compute 0 score when all fail', () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
        ],
      });
      const scores = generator.getCategoryScores([result]);
      expect(scores[0].score).toBe(0);
    });

    it('should compute correct passedRules/failedRules/totalRules', () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Governance, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Governance, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Governance, passed: false }),
          createRuleEvalResult({ category: RuleCategory.Governance, passed: false }),
          createRuleEvalResult({ category: RuleCategory.Governance, passed: true }),
        ],
      });
      const scores = generator.getCategoryScores([result]);
      expect(scores[0].totalRules).toBe(5);
      expect(scores[0].passedRules).toBe(3);
      expect(scores[0].failedRules).toBe(2);
    });

    it('should count critical violations correctly', () => {
      const v1 = createTestViolation({ severity: RuleSeverity.Critical });
      const v2 = createTestViolation({ severity: RuleSeverity.Error });
      const v3 = createTestViolation({ severity: RuleSeverity.Critical });
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Security, passed: false, violations: [v1, v2] }),
          createRuleEvalResult({ category: RuleCategory.Security, passed: false, violations: [v3] }),
        ],
      });
      const scores = generator.getCategoryScores([result]);
      expect(scores[0].criticalViolations).toBe(2);
    });

    it('should handle multiple categories', () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Security, passed: false }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
        ],
      });
      const scores = generator.getCategoryScores([result]);
      expect(scores).toHaveLength(2);
      const archScore = scores.find((s) => s.category === RuleCategory.Architecture)!;
      const secScore = scores.find((s) => s.category === RuleCategory.Security)!;
      expect(archScore.score).toBe(50);
      expect(secScore.score).toBe(0);
    });

    it('should aggregate across multiple ValidationResults', () => {
      const r1 = createValidationResult({
        results: [createRuleEvalResult({ category: RuleCategory.Quality, passed: true })],
      });
      const r2 = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Quality, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Quality, passed: false }),
        ],
      });
      const scores = generator.getCategoryScores([r1, r2]);
      expect(scores).toHaveLength(1);
      expect(scores[0].totalRules).toBe(3);
      expect(scores[0].passedRules).toBe(2);
      expect(scores[0].score).toBeCloseTo(66.67, 1);
    });

    it('should set correct level based on score', () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
        ],
      });
      const scores = generator.getCategoryScores([result]);
      expect(scores[0].level).toBe(ScoreLevel.Failing);
    });

    it('should return frozen CategoryScore objects', () => {
      const result = createValidationResult({
        results: [createRuleEvalResult({ category: RuleCategory.Architecture, passed: true })],
      });
      const scores = generator.getCategoryScores([result]);
      expect(Object.isFrozen(scores[0])).toBe(true);
    });
  });

  // ─── getOverallScore ────────────────────────────────────────────
  describe('getOverallScore', () => {
    it('should return 100 for empty results (no categories means all default to 100)', () => {
      expect(generator.getOverallScore([])).toBeCloseTo(100, 5);
    });

    it('should return 100 when all categories pass at 100%', () => {
      const categories = Object.values(RuleCategory);
      const results = categories.map((cat) =>
        createValidationResult({
          results: [createRuleEvalResult({ category: cat, passed: true })],
        }),
      );
      expect(generator.getOverallScore(results)).toBeCloseTo(100, 5);
    });

    it('should return 0 when all categories fail at 0%', () => {
      const categories = Object.values(RuleCategory);
      const results = categories.map((cat) =>
        createValidationResult({
          results: [createRuleEvalResult({ category: cat, passed: false })],
        }),
      );
      expect(generator.getOverallScore(results)).toBe(0);
    });

    it('should weight Architecture and Governance highest (0.20 each)', () => {
      // If only Architecture and Governance have 0%, rest at 100%
      const results = [
        createValidationResult({
          results: [createRuleEvalResult({ category: RuleCategory.Architecture, passed: false })],
        }),
        createValidationResult({
          results: [createRuleEvalResult({ category: RuleCategory.Governance, passed: false })],
        }),
      ];
      const score = generator.getOverallScore(results);
      // Architecture: 0 * 0.20 = 0, Governance: 0 * 0.20 = 0
      // Remaining 8 categories at 100% weighted by their respective weights
      // The total weight is the sum of all scoreWeights
      const totalWeight = Object.values(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights).reduce((a, b) => a + b, 0);
      const archGovWeight = DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Architecture]
        + DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Governance];
      const restWeight = totalWeight - archGovWeight;
      const expectedScore = (restWeight * 100) / totalWeight;
      expect(score).toBeCloseTo(expectedScore, 5);
    });

    it('should handle partial category coverage (missing categories default to 100)', () => {
      const results = [
        createValidationResult({
          results: [createRuleEvalResult({ category: RuleCategory.Architecture, passed: true })],
        }),
      ];
      const score = generator.getOverallScore(results);
      // All categories at 100% since Architecture passes and rest default to 100
      expect(score).toBeCloseTo(100, 5);
    });

    it('should return weighted average for mixed scores', () => {
      // Architecture at 50%, all others at 100%
      const results = [
        createValidationResult({
          results: [
            createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
            createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
          ],
        }),
      ];
      const score = generator.getOverallScore(results);
      const totalWeight = Object.values(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights).reduce((a, b) => a + b, 0);
      const archWeight = DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Architecture];
      const restWeight = totalWeight - archWeight;
      const expectedScore = (50 * archWeight + 100 * restWeight) / totalWeight;
      expect(score).toBeCloseTo(expectedScore, 5);
    });

    it('should use custom scoreWeights when configured', () => {
      const customConfig = {
        ...DefaultComplianceRuntimeConfig.reportGenerator,
        scoreWeights: Object.freeze({
          ...DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights,
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
        }),
      };
      const customGen = new ReportGenerator(customConfig, mockEventBus);
      const results = [
        createValidationResult({
          results: [
            createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
            createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
          ],
        }),
      ];
      // Only Architecture weight is 1.0, score is 50%
      expect(customGen.getOverallScore(results)).toBe(50);
    });
  });

  // ─── generateReport ─────────────────────────────────────────────
  describe('generateReport', () => {
    it('should generate a report with correct structure', async () => {
      const result = createValidationResult({
        totalRules: 1,
        passedRules: 1,
        results: [createRuleEvalResult({ category: RuleCategory.Architecture, passed: true })],
      });
      const report = await generator.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.id).toBeDefined();
      expect(report.sessionId).toBe(brandComplianceSessionId('s1'));
      expect(report.generatedAt).toBeDefined();
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallLevel).toBeDefined();
    });

    it('should set correct total counts', async () => {
      const r1 = createValidationResult({ totalRules: 5, passedRules: 3, failedRules: 2, violations: [] });
      const r2 = createValidationResult({ totalRules: 3, passedRules: 2, failedRules: 1, violations: [] });
      const report = await generator.generateReport([r1, r2], brandComplianceSessionId('s1'));
      expect(report.totalRules).toBe(8);
      expect(report.totalPassed).toBe(5);
      expect(report.totalFailed).toBe(3);
    });

    it('should aggregate violations across results', async () => {
      const v1 = createTestViolation({ id: brandViolationId('rep-v1') });
      const v2 = createTestViolation({ id: brandViolationId('rep-v2') });
      const r1 = createValidationResult({ violations: [v1] });
      const r2 = createValidationResult({ violations: [v2] });
      const report = await generator.generateReport([r1, r2], brandComplianceSessionId('s1'));
      expect(report.totalViolations).toBe(2);
    });

    it('should count critical violations', async () => {
      const v1 = createTestViolation({ severity: RuleSeverity.Critical });
      const v2 = createTestViolation({ severity: RuleSeverity.Error });
      const v3 = createTestViolation({ severity: RuleSeverity.Critical });
      const result = createValidationResult({ violations: [v1, v2, v3] });
      const report = await generator.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.criticalViolations).toBe(2);
    });

    it('should cap violations at maxViolationsPerReport', async () => {
      const capGen = new ReportGenerator(
        { ...DefaultComplianceRuntimeConfig.reportGenerator, maxViolationsPerReport: 2 },
        mockEventBus,
      );
      const violations = Array.from({ length: 10 }, (_, i) =>
        createTestViolation({ id: brandViolationId(`cap-v-${i}`) }),
      );
      const result = createValidationResult({ violations });
      const report = await capGen.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.violations).toHaveLength(2);
      expect(report.totalViolations).toBe(10); // total reflects actual count
    });

    it('should include all violations when under limit', async () => {
      const violations = [createTestViolation(), createTestViolation()];
      const result = createValidationResult({ violations });
      const report = await generator.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.violations).toHaveLength(2);
    });

    it('should set named dimension scores', async () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Governance, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Documentation, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Quality, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Privacy, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Security, passed: true }),
        ],
      });
      const report = await generator.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.architectureScore).toBe(100);
      expect(report.governanceScore).toBe(100);
      expect(report.documentationScore).toBe(100);
      expect(report.qualityScore).toBe(100);
      expect(report.privacyScore).toBe(100);
      expect(report.securityScore).toBe(100);
    });

    it('should default missing dimension scores to 100', async () => {
      const report = await generator.generateReport([], brandComplianceSessionId('s1'));
      expect(report.architectureScore).toBe(100);
      expect(report.governanceScore).toBe(100);
      expect(report.documentationScore).toBe(100);
      expect(report.qualityScore).toBe(100);
      expect(report.privacyScore).toBe(100);
      expect(report.securityScore).toBe(100);
    });

    it('should compute correct dimension scores from category data', async () => {
      const result = createValidationResult({
        results: [
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
        ],
      });
      const report = await generator.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.architectureScore).toBe(50);
      // Other dimensions default to 100
      expect(report.governanceScore).toBe(100);
    });

    it('should include categoryScores', async () => {
      const result = createValidationResult({
        results: [createRuleEvalResult({ category: RuleCategory.Architecture, passed: true })],
      });
      const report = await generator.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.categoryScores.length).toBeGreaterThanOrEqual(1);
    });

    it('should include validationResults in report', async () => {
      const result = createValidationResult();
      const report = await generator.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.validationResults).toHaveLength(1);
      expect(report.validationResults[0]).toBe(result);
    });

    it('should return frozen report', async () => {
      const report = await generator.generateReport([], brandComplianceSessionId('s1'));
      expect(Object.isFrozen(report)).toBe(true);
    });

    it('should publish report.generated event', async () => {
      await generator.generateReport([], brandComplianceSessionId('s1'));
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.eventType).toBe('compliance.report.generated');
    });

    it('should include score in event', async () => {
      const report = await generator.generateReport([], brandComplianceSessionId('s1'));
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.overallScore).toBe(report.overallScore);
    });

    it('should include violation counts in event', async () => {
      const v1 = createTestViolation({ severity: RuleSeverity.Critical });
      const v2 = createTestViolation({ severity: RuleSeverity.Error });
      const result = createValidationResult({ violations: [v1, v2] });
      const report = await generator.generateReport([result], brandComplianceSessionId('s1'));
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.totalViolations).toBe(2);
      expect(event.criticalViolations).toBe(1);
    });

    it('should not publish event when no eventBus', async () => {
      const noBusGen = new ReportGenerator(DefaultComplianceRuntimeConfig.reportGenerator);
      const report = await noBusGen.generateReport([], brandComplianceSessionId('s1'));
      expect(report.id).toBeDefined();
    });

    it('should handle empty results (no rules evaluated)', async () => {
      const report = await generator.generateReport([], brandComplianceSessionId('s1'));
      expect(report.totalRules).toBe(0);
      expect(report.totalPassed).toBe(0);
      expect(report.totalFailed).toBe(0);
      expect(report.totalViolations).toBe(0);
      expect(report.criticalViolations).toBe(0);
      expect(report.overallScore).toBeCloseTo(100, 5);
      expect(report.overallLevel).toBe(ScoreLevel.Excellent);
    });

    it('should generate unique report IDs', async () => {
      const r1 = await generator.generateReport([], brandComplianceSessionId('s1'));
      const r2 = await generator.generateReport([], brandComplianceSessionId('s1'));
      expect(r1.id).not.toBe(r2.id);
    });

    it('should handle maxViolationsPerReport of 0 (include all)', async () => {
      const zeroCapGen = new ReportGenerator(
        { ...DefaultComplianceRuntimeConfig.reportGenerator, maxViolationsPerReport: 0 },
        mockEventBus,
      );
      const violations = Array.from({ length: 5 }, (_, i) =>
        createTestViolation({ id: brandViolationId(`zv-${i}`) }),
      );
      const result = createValidationResult({ violations });
      const report = await zeroCapGen.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.violations).toHaveLength(5);
    });

    it('should handle negative maxViolationsPerReport (include all)', async () => {
      const negCapGen = new ReportGenerator(
        { ...DefaultComplianceRuntimeConfig.reportGenerator, maxViolationsPerReport: -1 },
        mockEventBus,
      );
      const violations = [createTestViolation(), createTestViolation()];
      const result = createValidationResult({ violations });
      const report = await negCapGen.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.violations).toHaveLength(2);
    });

    it('should compute durationMs', async () => {
      const result = createValidationResult({
        results: Array.from({ length: 100 }, () =>
          createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
        ),
      });
      const report = await generator.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should set aggregateId from report id', async () => {
      const report = await generator.generateReport([], brandComplianceSessionId('s1'));
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.aggregateId).toBe(report.id as string);
    });

    it('should set aggregateType to ComplianceReport', async () => {
      await generator.generateReport([], brandComplianceSessionId('s1'));
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.aggregateType).toBe('ComplianceReport');
    });

    it('should include metadata as empty object', async () => {
      const report = await generator.generateReport([], brandComplianceSessionId('s1'));
      expect(report.metadata).toEqual({});
    });

    it('should handle results with no violations array (empty)', async () => {
      const result = createValidationResult({ violations: [] });
      const report = await generator.generateReport([result], brandComplianceSessionId('s1'));
      expect(report.totalViolations).toBe(0);
    });

    it('should aggregate across many validation results', async () => {
      const results = Array.from({ length: 20 }, () =>
        createValidationResult({
          totalRules: 5,
          passedRules: 3,
          failedRules: 2,
          results: [
            createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
            createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
            createRuleEvalResult({ category: RuleCategory.Architecture, passed: true }),
            createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
            createRuleEvalResult({ category: RuleCategory.Architecture, passed: false }),
          ],
        }),
      );
      const report = await generator.generateReport(results, brandComplianceSessionId('s1'));
      expect(report.totalRules).toBe(100);
      expect(report.totalPassed).toBe(60);
      expect(report.totalFailed).toBe(40);
    });
  });
});
