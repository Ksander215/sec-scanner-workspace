/**
 * Security Intelligence Risk Engine — Risk Formula
 *
 * Deterministic risk formula engine that combines factor values
 * into a single risk score using configurable weights.
 *
 * Formula:
 * Risk = SeverityWeight × Severity +
 *        ConfidenceWeight × Confidence +
 *        ContextWeight × ContextComposite +
 *        ExposureWeight × ExposureComposite +
 *        CorrelationWeight × CorrelationComposite
 *
 * Where:
 * - ContextComposite = weighted(AssetCriticality, BusinessImpact, TechnologyAge, ExistingMitigations)
 * - ExposureComposite = weighted(InternetExposure, AuthenticationRequired, PrivilegeRequired, AttackSurfaceSize)
 * - CorrelationComposite = weighted(CorrelationDensity, ExploitAvailability, FindingRecurrence, TemporalRisk)
 *
 * All weights are normalised so the formula always produces 0.0–1.0.
 */

import type {
  RiskFormulaConfig, RiskFactorType, RiskFactor, RiskReason, RiskFactorInput,
  RiskFactorEvaluatorResult,
} from '../types/index.ts';
import {
  DEFAULT_RISK_FORMULA_CONFIG,
  RiskFactorType as RFT,
  RiskReason as RReason,
} from '../types/index.ts';
import { createRiskFactor } from '../models/index.ts';
import { FactorRegistry } from '../factors/index.ts';

// ─── Factor Groupings ────────────────────────────────────────

/** Severity group: direct factor */
const SEVERITY_FACTORS: readonly RiskFactorType[] = Object.freeze([RFT.Severity]);

/** Confidence group: direct factor */
const CONFIDENCE_FACTORS: readonly RiskFactorType[] = Object.freeze([RFT.Confidence]);

/** Context group: composite of context-related factors */
const CONTEXT_FACTORS: readonly RiskFactorType[] = Object.freeze([
  RFT.AssetCriticality,
  RFT.BusinessImpact,
  RFT.TechnologyAge,
  RFT.ExistingMitigations,
]);

/** Exposure group: composite of exposure-related factors */
const EXPOSURE_FACTORS: readonly RiskFactorType[] = Object.freeze([
  RFT.InternetExposure,
  RFT.AuthenticationRequired,
  RFT.PrivilegeRequired,
  RFT.AttackSurfaceSize,
]);

/** Correlation group: composite of correlation-related factors */
const CORRELATION_FACTORS: readonly RiskFactorType[] = Object.freeze([
  RFT.CorrelationDensity,
  RFT.ExploitAvailability,
  RFT.FindingRecurrence,
  RFT.TemporalRisk,
]);

// ─── Formula Engine ──────────────────────────────────────────

/**
 * Computes a deterministic risk score from factor evaluation results.
 * Uses the configurable 5-group formula.
 */
export class RiskFormulaEngine {
  private readonly _config: RiskFormulaConfig;
  private readonly _factorRegistry: FactorRegistry;

  constructor(config: RiskFormulaConfig = DEFAULT_RISK_FORMULA_CONFIG, factorRegistry: FactorRegistry) {
    // FIX #13: Validate formula configuration
    this.validateConfig(config);
    this._config = config;
    this._factorRegistry = factorRegistry;
  }

  /** Validate formula configuration to prevent misconfigurations */
  private validateConfig(config: RiskFormulaConfig): void {
    const weights = [
      config.severityWeight, config.confidenceWeight, config.contextWeight,
      config.exposureWeight, config.correlationWeight,
    ];

    // All top-level weights must be non-negative
    if (weights.some(w => w < 0)) {
      throw new Error('RiskFormulaConfig: all group weights must be non-negative');
    }

    // At least one weight must be positive
    if (weights.reduce((a, b) => a + b, 0) <= 0) {
      throw new Error('RiskFormulaConfig: at least one group weight must be positive');
    }

    // Individual factor weights must be in [0, 1]
    for (const [type, weight] of Object.entries(config.factorWeights)) {
      if (typeof weight === 'number' && (weight < 0 || weight > 1)) {
        throw new Error(`RiskFormulaConfig: factor weight for ${type} must be in [0, 1], got ${weight}`);
      }
    }
  }

  /**
   * Compute the full risk assessment for a given input.
   * Returns the raw score, all evaluated factors, and reasons.
   */
  compute(input: RiskFactorInput): RiskFormulaResult {
    // Step 1: Evaluate all factors
    const evaluationResults = this._factorRegistry.evaluateAll(input);
    const resultByType = new Map<RiskFactorType, RiskFactorEvaluatorResult>();
    const evaluators = this._factorRegistry.getAll();

    for (let i = 0; i < evaluators.length && i < evaluationResults.length; i++) {
      resultByType.set(evaluators[i].type, evaluationResults[i]);
    }

    // Step 2: Build RiskFactor objects with weights
    const factors: RiskFactor[] = [];
    for (const evaluator of evaluators) {
      const result = resultByType.get(evaluator.type);
      if (!result) continue;
      const weight = this._config.factorWeights[evaluator.type] ?? 0.5;
      factors.push(createRiskFactor({
        type: evaluator.type,
        value: result.value,
        weight,
        source: result.source,
        description: result.description,
        metadata: result.metadata,
      }));
    }

    // Step 3: Compute composite values per group
    const severityValue = this.computeGroupAverage(SEVERITY_FACTORS, resultByType);
    const confidenceValue = this.computeGroupAverage(CONFIDENCE_FACTORS, resultByType);
    const contextValue = this.computeGroupAverage(CONTEXT_FACTORS, resultByType);
    const exposureValue = this.computeGroupAverage(EXPOSURE_FACTORS, resultByType);
    const correlationValue = this.computeGroupAverage(CORRELATION_FACTORS, resultByType);

    // Step 4: Apply the main formula
    const totalWeight =
      this._config.severityWeight +
      this._config.confidenceWeight +
      this._config.contextWeight +
      this._config.exposureWeight +
      this._config.correlationWeight;

    const rawScore = totalWeight > 0
      ? (
          this._config.severityWeight * severityValue +
          this._config.confidenceWeight * confidenceValue +
          this._config.contextWeight * contextValue +
          this._config.exposureWeight * exposureValue +
          this._config.correlationWeight * correlationValue
        ) / totalWeight
      : 0;

    // Step 5: Determine reasons
    const reasons = this.determineReasons(factors, rawScore);

    // Step 6: Clamp to [0, 1]
    const clampedScore = Math.max(0, Math.min(1, rawScore));

    return Object.freeze({
      rawScore: Math.round(clampedScore * 10000) / 10000,
      factors: Object.freeze(factors),
      reasons: Object.freeze(reasons),
      groupValues: Object.freeze({
        severity: Math.round(severityValue * 10000) / 10000,
        confidence: Math.round(confidenceValue * 10000) / 10000,
        context: Math.round(contextValue * 10000) / 10000,
        exposure: Math.round(exposureValue * 10000) / 10000,
        correlation: Math.round(correlationValue * 10000) / 10000,
      }),
    });
  }

  /** Get the formula configuration */
  get config(): RiskFormulaConfig {
    return this._config;
  }

  // ─── Private Helpers ───────────────────────────────────

  /** Compute weighted average of a group of factors */
  private computeGroupAverage(
    factorTypes: readonly RiskFactorType[],
    results: Map<RiskFactorType, RiskFactorEvaluatorResult>,
  ): number {
    let totalValue = 0;
    let totalWeight = 0;

    for (const type of factorTypes) {
      const result = results.get(type);
      if (!result) continue;
      const weight = this._config.factorWeights[type] ?? 0.5;
      totalValue += result.value * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalValue / totalWeight : 0;
  }

  /** Determine risk reasons from factor values */
  private determineReasons(factors: readonly RiskFactor[], rawScore: number): RiskReason[] {
    const reasons: RiskReason[] = [];

    for (const factor of factors) {
      switch (factor.type) {
        case RFT.Severity:
          if (factor.value >= 0.75) reasons.push(RReason.HighSeverity);
          break;
        case RFT.Confidence:
          if (factor.value <= 0.35) reasons.push(RReason.LowConfidence);
          break;
        case RFT.CorrelationDensity:
          if (factor.value >= 0.5) reasons.push(RReason.HighCorrelationDensity);
          break;
        case RFT.AssetCriticality:
          if (factor.value >= 0.8) reasons.push(RReason.CriticalAsset);
          break;
        case RFT.InternetExposure:
          if (factor.value >= 0.5) reasons.push(RReason.InternetFacing);
          break;
        case RFT.AuthenticationRequired:
          if (factor.value >= 0.8) reasons.push(RReason.NoAuthRequired);
          break;
        case RFT.PrivilegeRequired:
          if (factor.value >= 0.8) reasons.push(RReason.NoPrivilegeRequired);
          break;
        case RFT.ExploitAvailability:
          if (factor.value >= 0.8) reasons.push(RReason.ExploitAvailable);
          break;
        case RFT.BusinessImpact:
          if (factor.value >= 0.7) reasons.push(RReason.HighBusinessImpact);
          break;
        case RFT.TechnologyAge:
          if (factor.value >= 0.7) reasons.push(RReason.OutdatedTechnology);
          break;
        case RFT.AttackSurfaceSize:
          if (factor.value >= 0.7) reasons.push(RReason.LargeAttackSurface);
          break;
        case RFT.ExistingMitigations:
          if (factor.value >= 0.5) reasons.push(RReason.NoMitigations);
          break;
        case RFT.FindingRecurrence:
          if (factor.value >= 0.5) reasons.push(RReason.RecurringFinding);
          break;
        case RFT.TemporalRisk:
          if (factor.value >= 0.7) reasons.push(RReason.TemporalIncrease);
          break;
      }
    }

    // Add composite reason if score is high
    if (rawScore >= 0.6 && reasons.length >= 3) {
      reasons.push(RReason.CompositeRisk);
    }

    // Context adjustment reason
    const contextFactors = factors.filter(f =>
      CONTEXT_FACTORS.includes(f.type) || EXPOSURE_FACTORS.includes(f.type)
    );
    const contextHigh = contextFactors.some(f => f.value >= 0.7);
    if (contextHigh) {
      reasons.push(RReason.ContextAdjusted);
    }

    return reasons;
  }
}

// ─── Formula Result ──────────────────────────────────────────

/** Result of the risk formula computation */
export interface RiskFormulaResult {
  readonly rawScore: number;
  readonly factors: readonly RiskFactor[];
  readonly reasons: readonly RiskReason[];
  readonly groupValues: Readonly<{
    readonly severity: number;
    readonly confidence: number;
    readonly context: number;
    readonly exposure: number;
    readonly correlation: number;
  }>;
}
