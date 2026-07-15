/**
 * Security Intelligence Risk Engine — Factor Registry
 *
 * Extensible registry of risk factor evaluators.
 * All 14 built-in factors are registered by default.
 * Custom factors can be added at runtime.
 *
 * Each factor evaluator takes a RiskFactorInput and returns
 * a normalized 0.0–1.0 value with provenance metadata.
 */

import type {
  RiskFactorType, RiskFactorEvaluator, RiskFactorInput, RiskFactorEvaluatorResult,
} from '../types/index.ts';
import { RiskFactorType as RFT } from '../types/index.ts';
import {
  severityToNormalized, confidenceToNormalized,
} from '../models/index.ts';

// ─── Built-in Factor Evaluators ──────────────────────────────

/** Severity factor: maps finding severity to 0.0–1.0 */
const SeverityEvaluator: RiskFactorEvaluator = {
  type: RFT.Severity,
  description: 'Maps finding severity (Info→Critical) to normalized 0.0–1.0 scale',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    const value = severityToNormalized(input.severity);
    return Object.freeze({
      value,
      source: 'finding.severity',
      description: `Severity ${input.severity} → ${value.toFixed(2)}`,
      metadata: Object.freeze({ severity: input.severity }),
    });
  },
};

/** Confidence factor: maps finding confidence to 0.0–1.0 */
const ConfidenceEvaluator: RiskFactorEvaluator = {
  type: RFT.Confidence,
  description: 'Maps finding confidence level to normalized 0.0–1.0 scale',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    const value = confidenceToNormalized(input.confidence);
    return Object.freeze({
      value,
      source: 'finding.confidence',
      description: `Confidence ${input.confidence} → ${value.toFixed(2)}`,
      metadata: Object.freeze({ confidence: input.confidence }),
    });
  },
};

/** Correlation density factor: based on how many correlations a finding has */
const CorrelationDensityEvaluator: RiskFactorEvaluator = {
  type: RFT.CorrelationDensity,
  description: 'Risk increases with the number of correlated findings (density)',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    const count = input.correlationCount;
    // Saturating function: 0→0.0, 1→0.2, 3→0.5, 5→0.7, 10+→0.9+
    const value = Math.min(1.0, 1 - Math.exp(-count / 3));
    return Object.freeze({
      value: Math.round(value * 10000) / 10000,
      source: 'correlation.count',
      description: `${count} correlations → density ${value.toFixed(2)}`,
      metadata: Object.freeze({ correlationCount: count, groupCount: input.groupCount }),
    });
  },
};

/** Asset criticality factor: based on Knowledge Graph context */
const AssetCriticalityEvaluator: RiskFactorEvaluator = {
  type: RFT.AssetCriticality,
  description: 'Risk increases for critical assets identified via Knowledge Graph',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    let value = 0.3; // Default moderate
    if (input.context.isCriticalAsset) value = 1.0;
    else if (input.context.isProduction) value = 0.8;
    else if (input.context.isDevelopment) value = 0.2;
    if (input.context.dependentAssetCount > 5) value = Math.min(1.0, value + 0.15);
    return Object.freeze({
      value,
      source: 'context.assetCriticality',
      description: `Critical=${input.context.isCriticalAsset}, Production=${input.context.isProduction} → ${value.toFixed(2)}`,
      metadata: Object.freeze({
        isCriticalAsset: input.context.isCriticalAsset,
        isProduction: input.context.isProduction,
        dependentAssetCount: input.context.dependentAssetCount,
      }),
    });
  },
};

/** Internet exposure factor: based on whether the finding is internet-facing */
const InternetExposureEvaluator: RiskFactorEvaluator = {
  type: RFT.InternetExposure,
  description: 'Risk increases for internet-facing assets',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    let value = 0.1; // Internal by default
    if (input.context.internetFacing) value = 0.9;
    else if (!input.context.internalOnly) value = 0.5;
    // HTTPS slightly reduces exposure
    if (input.endpoint?.startsWith('https://')) value = Math.max(0, value - 0.1);
    return Object.freeze({
      value,
      source: 'context.internetExposure',
      description: `InternetFacing=${input.context.internetFacing} → ${value.toFixed(2)}`,
      metadata: Object.freeze({
        internetFacing: input.context.internetFacing,
        internalOnly: input.context.internalOnly,
        endpoint: input.endpoint ?? '',
      }),
    });
  },
};

/** Authentication required factor: no auth = higher risk */
const AuthenticationRequiredEvaluator: RiskFactorEvaluator = {
  type: RFT.AuthenticationRequired,
  description: 'Risk increases when no authentication is required to exploit',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    let value = 0.5; // Default: assume auth may be required
    const tags = input.tags.map(t => t.toLowerCase());
    const noAuth = tags.some(t =>
      t.includes('no-auth') || t.includes('unauthenticated') ||
      t.includes('unauth') || t.includes('no-auth-required')
    );
    const hasAuth = tags.some(t =>
      t.includes('auth') || t.includes('authenticated') ||
      t.includes('requires-auth')
    );
    if (noAuth) value = 0.9;
    else if (hasAuth) value = 0.2;
    // Authentication chain complexity increases risk
    if (input.context.authenticationChain.length > 2) value = Math.min(1.0, value + 0.15);
    return Object.freeze({
      value,
      source: 'finding.tags+context.authChain',
      description: `NoAuth=${noAuth}, AuthChain=${input.context.authenticationChain.length} → ${value.toFixed(2)}`,
      metadata: Object.freeze({
        noAuth,
        authChainLength: input.context.authenticationChain.length,
      }),
    });
  },
};

/** Privilege required factor: low/no privilege = higher risk */
const PrivilegeRequiredEvaluator: RiskFactorEvaluator = {
  type: RFT.PrivilegeRequired,
  description: 'Risk increases when lower privileges are required to exploit',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    let value = 0.5;
    const tags = input.tags.map(t => t.toLowerCase());
    const lowPriv = tags.some(t =>
      t.includes('low-priv') || t.includes('no-priv') ||
      t.includes('privilege-escalation') || t.includes('privesc')
    );
    const highPriv = tags.some(t =>
      t.includes('admin') || t.includes('root') ||
      t.includes('high-priv') || t.includes('requires-admin')
    );
    if (lowPriv) value = 0.85;
    else if (highPriv) value = 0.2;
    return Object.freeze({
      value,
      source: 'finding.tags',
      description: `LowPriv=${lowPriv}, HighPriv=${highPriv} → ${value.toFixed(2)}`,
      metadata: Object.freeze({ lowPriv, highPriv }),
    });
  },
};

/** Exploit availability factor: known exploit = higher risk */
const ExploitAvailabilityEvaluator: RiskFactorEvaluator = {
  type: RFT.ExploitAvailability,
  description: 'Risk increases when a known exploit exists (CVE with EPSS)',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    let value = 0.2; // Default: no known exploit
    const hasCVE = input.cve.length > 0;
    const tags = input.tags.map(t => t.toLowerCase());
    const hasExploit = tags.some(t =>
      t.includes('exploit') || t.includes('exploitable') ||
      t.includes('poc') || t.includes('weaponized')
    );
    if (hasExploit) value = 0.95;
    else if (hasCVE) value = 0.4; // CVE exists but no confirmed exploit
    return Object.freeze({
      value,
      source: 'finding.tags+cve',
      description: `HasExploit=${hasExploit}, HasCVE=${hasCVE} → ${value.toFixed(2)}`,
      metadata: Object.freeze({
        hasExploit,
        cveCount: input.cve.length,
        cves: input.cve,
      }),
    });
  },
};

/** Business impact factor: based on asset and category */
const BusinessImpactEvaluator: RiskFactorEvaluator = {
  type: RFT.BusinessImpact,
  description: 'Risk increases for findings that affect business-critical operations',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    let value = 0.3;
    // Data leaks and injections have high business impact
    const highImpactCategories = ['Injection', 'CrossSiteScripting', 'DataLeak', 'Authentication', 'Authorization'];
    if (highImpactCategories.includes(input.category)) value = 0.8;
    if (input.context.isCriticalAsset) value = Math.min(1.0, value + 0.2);
    if (input.context.isProduction) value = Math.min(1.0, value + 0.1);
    return Object.freeze({
      value,
      source: 'finding.category+context',
      description: `Category=${input.category}, CriticalAsset=${input.context.isCriticalAsset} → ${value.toFixed(2)}`,
      metadata: Object.freeze({
        category: input.category,
        isCriticalAsset: input.context.isCriticalAsset,
      }),
    });
  },
};

/** Technology age factor: older unmaintained tech = higher risk */
const TechnologyAgeEvaluator: RiskFactorEvaluator = {
  type: RFT.TechnologyAge,
  description: 'Risk increases for outdated or deprecated technologies',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    let value = 0.2;
    const tech = input.technology.map(t => t.toLowerCase());
    const deprecated = tech.some(t =>
      t.includes('deprecated') || t.includes('eol') ||
      t.includes('end-of-life') || t.includes('legacy') ||
      t.includes('flash') || t.includes('ie') ||
      t.includes('old') || t.includes('outdated')
    );
    if (deprecated) value = 0.85;
    return Object.freeze({
      value,
      source: 'finding.technology',
      description: `DeprecatedTech=${deprecated} → ${value.toFixed(2)}`,
      metadata: Object.freeze({
        technology: input.technology,
        deprecated,
      }),
    });
  },
};

/** Attack surface size factor: more exposed endpoints = higher risk */
const AttackSurfaceSizeEvaluator: RiskFactorEvaluator = {
  type: RFT.AttackSurfaceSize,
  description: 'Risk increases with the number of exposed attack surface vectors',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    let value = 0.3;
    // Count surface indicators
    let surfacePoints = 0;
    if (input.endpoint) surfacePoints++;
    if (input.context.internetFacing) surfacePoints += 2;
    if (input.context.dependencyCount > 5) surfacePoints += 2;
    if (input.technology.length > 3) surfacePoints++;
    if (input.context.authenticationChain.length > 1) surfacePoints++;
    // Normalize: 0→0.2, 3→0.5, 6+→0.9
    value = Math.min(1.0, 0.2 + (surfacePoints / 7) * 0.8);
    return Object.freeze({
      value: Math.round(value * 10000) / 10000,
      source: 'context+finding',
      description: `${surfacePoints} surface points → ${value.toFixed(2)}`,
      metadata: Object.freeze({ surfacePoints }),
    });
  },
};

/** Existing mitigations factor: fewer mitigations = higher risk */
const ExistingMitigationsEvaluator: RiskFactorEvaluator = {
  type: RFT.ExistingMitigations,
  description: 'Risk decreases when mitigations are already in place',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    let value = 0.6; // Default: assume no mitigations
    const tags = input.tags.map(t => t.toLowerCase());
    const mitigated = tags.some(t =>
      t.includes('mitigated') || t.includes('patched') ||
      t.includes('fixed') || t.includes('resolved')
    );
    const partialMit = tags.some(t =>
      t.includes('partial-fix') || t.includes('workaround') ||
      t.includes('compensating-control')
    );
    if (mitigated) value = 0.1;
    else if (partialMit) value = 0.35;
    return Object.freeze({
      value,
      source: 'finding.tags',
      description: `Mitigated=${mitigated}, PartialMit=${partialMit} → ${value.toFixed(2)}`,
      metadata: Object.freeze({ mitigated, partialMit }),
    });
  },
};

/** Finding recurrence factor: recurring findings = higher risk */
const FindingRecurrenceEvaluator: RiskFactorEvaluator = {
  type: RFT.FindingRecurrence,
  description: 'Risk increases for findings that recur across multiple scans',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    let value = 0.2;
    const recurrenceCount = Number(input.metadata['recurrenceCount'] ?? 0);
    if (recurrenceCount >= 5) value = 0.9;
    else if (recurrenceCount >= 3) value = 0.7;
    else if (recurrenceCount >= 2) value = 0.5;
    else if (recurrenceCount >= 1) value = 0.3;
    return Object.freeze({
      value,
      source: 'metadata.recurrenceCount',
      description: `Recurrence=${recurrenceCount} → ${value.toFixed(2)}`,
      metadata: Object.freeze({ recurrenceCount }),
    });
  },
};

/** Temporal risk factor: risk changes over time */
const TemporalRiskEvaluator: RiskFactorEvaluator = {
  type: RFT.TemporalRisk,
  description: 'Risk adjustment based on temporal factors (disclosure age, patch availability)',
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult {
    let value = 0.4;
    // New CVEs (recent disclosure) have higher temporal risk
    const daysSinceDiscovery = Number(input.metadata['daysSinceDiscovery'] ?? 365);
    if (daysSinceDiscovery < 7) value = 0.9;       // Very recent
    else if (daysSinceDiscovery < 30) value = 0.75;  // Recent
    else if (daysSinceDiscovery < 90) value = 0.55;  // Moderate
    else if (daysSinceDiscovery < 365) value = 0.35; // Aging
    else value = 0.2;                                  // Old
    return Object.freeze({
      value,
      source: 'metadata.temporal',
      description: `DaysSinceDiscovery=${daysSinceDiscovery} → ${value.toFixed(2)}`,
      metadata: Object.freeze({ daysSinceDiscovery }),
    });
  },
};

// ─── Built-in Evaluators List ────────────────────────────────

/** All built-in factor evaluators */
export const BUILT_IN_EVALUATORS: readonly RiskFactorEvaluator[] = Object.freeze([
  SeverityEvaluator,
  ConfidenceEvaluator,
  CorrelationDensityEvaluator,
  AssetCriticalityEvaluator,
  InternetExposureEvaluator,
  AuthenticationRequiredEvaluator,
  PrivilegeRequiredEvaluator,
  ExploitAvailabilityEvaluator,
  BusinessImpactEvaluator,
  TechnologyAgeEvaluator,
  AttackSurfaceSizeEvaluator,
  ExistingMitigationsEvaluator,
  FindingRecurrenceEvaluator,
  TemporalRiskEvaluator,
]);

// ─── Factor Registry ─────────────────────────────────────────

/**
 * Extensible registry of risk factor evaluators.
 * Supports adding custom evaluators at runtime.
 */
export class FactorRegistry {
  private readonly _evaluators: Map<RiskFactorType, RiskFactorEvaluator> = new Map();

  constructor() {
    // Register all built-in evaluators
    for (const evaluator of BUILT_IN_EVALUATORS) {
      this._evaluators.set(evaluator.type, evaluator);
    }
  }

  /** Register a custom factor evaluator */
  register(evaluator: RiskFactorEvaluator): void {
    this._evaluators.set(evaluator.type, evaluator);
  }

  /** Unregister a factor evaluator by type */
  unregister(type: RiskFactorType): boolean {
    return this._evaluators.delete(type);
  }

  /** Get a factor evaluator by type */
  get(type: RiskFactorType): RiskFactorEvaluator | undefined {
    return this._evaluators.get(type);
  }

  /** Check if a factor evaluator is registered */
  has(type: RiskFactorType): boolean {
    return this._evaluators.has(type);
  }

  /** Get all registered evaluators */
  getAll(): readonly RiskFactorEvaluator[] {
    return Object.freeze([...this._evaluators.values()]);
  }

  /** Get all registered factor types */
  getTypes(): readonly RiskFactorType[] {
    return Object.freeze([...this._evaluators.keys()]);
  }

  private _errorCounts: Map<RiskFactorType, number> = new Map();

  /** Evaluate all factors for a given input */
  evaluateAll(input: RiskFactorInput): readonly RiskFactorEvaluatorResult[] {
    const results: RiskFactorEvaluatorResult[] = [];
    for (const evaluator of this._evaluators.values()) {
      try {
        results.push(evaluator.evaluate(input));
      } catch {
        // FIX #5: Track errors per factor type instead of silently returning 0.5
        const currentCount = this._errorCounts.get(evaluator.type) ?? 0;
        this._errorCounts.set(evaluator.type, currentCount + 1);

        // Use the factor's default value (0.5 for neutral) but mark as error
        results.push(Object.freeze({
          value: 0.5,
          source: `factor.${evaluator.type}.error`,
          description: `Error evaluating ${evaluator.type}`,
          metadata: Object.freeze({ error: true, type: evaluator.type }),
        }));
      }
    }
    return Object.freeze(results);
  }

  /** Number of registered evaluators */
  get size(): number {
    return this._evaluators.size;
  }

  /** Reset to built-in evaluators only */
  reset(): void {
    this._evaluators.clear();
    for (const evaluator of BUILT_IN_EVALUATORS) {
      this._evaluators.set(evaluator.type, evaluator);
    }
  }
}
