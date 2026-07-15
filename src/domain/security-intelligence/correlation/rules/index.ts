/**
 * Security Intelligence Correlation Engine — Rules Engine
 *
 * Weighted correlation rules with an extensible Rule Registry.
 * Each rule examines two findings and returns a match score.
 *
 * Rules:
 * - SameHost (0.80) — findings affect the same host
 * - SameEndpoint (0.85) — findings affect the same endpoint
 * - SamePath (0.70) — findings share the same URL path
 * - SameURL (0.90) — findings share the same full URL
 * - SameService (0.75) — findings affect the same service
 * - SameTechnology (0.60) — findings share the same technology
 * - SameCVE (1.00) — findings reference the same CVE
 * - SameCWE (0.90) — findings reference the same CWE
 * - SameCookie (0.25) — findings reference the same cookie
 * - SameHeader (0.35) — findings reference the same header
 * - SameSecret (0.95) — findings reference the same secret/credential
 * - SameIdentity (0.85) — findings share the same identity
 * - SameCertificate (0.70) — findings share the same certificate
 * - SharedEvidence (0.50) — findings share evidence data
 * - SharedRequest (0.65) — findings share the same request
 * - SharedResponse (0.65) — findings share the same response
 * - SharedAuthentication (0.80) — findings share authentication context
 * - SharedComponent (0.70) — findings share a component
 *
 * Extensible: register custom rules via RuleRegistry.register()
 */

import type {
  CorrelationRule, CorrelationRuleResult, CorrelationEvidence,
  CorrelationReason, CorrelationFindingInput, CorrelationEvidenceInput,
} from '../types/index.ts';
import {
  CorrelationReason as Reason,
} from '../types/index.ts';
import { createCorrelationEvidence } from '../models/index.ts';

// ─── Rule Implementations ────────────────────────────────────

/** SameHost: findings affect the same host */
const sameHostRule: CorrelationRule = {
  name: 'SameHost',
  reason: Reason.SameHost,
  weight: 0.80,
  description: 'Findings affect the same host',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    if (!source.affectedAsset || !target.affectedAsset) return { matched: false, score: 0, evidence: null };
    if (source.affectedAsset === target.affectedAsset) {
      return {
        matched: true,
        score: 1.0,
        evidence: createCorrelationEvidence({
          reason: Reason.SameHost,
          sharedValue: source.affectedAsset,
          sourceField: 'affectedAsset',
          targetField: 'affectedAsset',
          confidence: 1.0,
        }),
      };
    }
    // Check if hosts overlap (subdomain matching)
    const sourceHost = extractHost(source.affectedAsset);
    const targetHost = extractHost(target.affectedAsset);
    if (sourceHost && targetHost && sourceHost === targetHost) {
      return {
        matched: true,
        score: 0.9,
        evidence: createCorrelationEvidence({
          reason: Reason.SameHost,
          sharedValue: sourceHost,
          sourceField: 'affectedAsset',
          targetField: 'affectedAsset',
          confidence: 0.9,
        }),
      };
    }
    return { matched: false, score: 0, evidence: null };
  },
};

/** SameEndpoint: findings affect the same endpoint */
const sameEndpointRule: CorrelationRule = {
  name: 'SameEndpoint',
  reason: Reason.SameEndpoint,
  weight: 0.85,
  description: 'Findings affect the same endpoint',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    if (!source.endpoint || !target.endpoint) return { matched: false, score: 0, evidence: null };
    if (source.endpoint === target.endpoint) {
      return {
        matched: true,
        score: 1.0,
        evidence: createCorrelationEvidence({
          reason: Reason.SameEndpoint,
          sharedValue: source.endpoint,
          sourceField: 'endpoint',
          targetField: 'endpoint',
          confidence: 1.0,
        }),
      };
    }
    return { matched: false, score: 0, evidence: null };
  },
};

/** SamePath: findings share the same URL path */
const samePathRule: CorrelationRule = {
  name: 'SamePath',
  reason: Reason.SamePath,
  weight: 0.70,
  description: 'Findings share the same URL path',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    if (!source.endpoint || !target.endpoint) return { matched: false, score: 0, evidence: null };
    const sourcePath = extractPath(source.endpoint);
    const targetPath = extractPath(target.endpoint);
    if (!sourcePath || !targetPath) return { matched: false, score: 0, evidence: null };
    if (sourcePath === targetPath) {
      return {
        matched: true,
        score: 1.0,
        evidence: createCorrelationEvidence({
          reason: Reason.SamePath,
          sharedValue: sourcePath,
          sourceField: 'endpoint',
          targetField: 'endpoint',
          confidence: 1.0,
        }),
      };
    }
    return { matched: false, score: 0, evidence: null };
  },
};

/** SameURL: findings share the same full URL */
const sameURLRule: CorrelationRule = {
  name: 'SameURL',
  reason: Reason.SameURL,
  weight: 0.90,
  description: 'Findings share the same full URL',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    if (!source.endpoint || !target.endpoint) return { matched: false, score: 0, evidence: null };
    const sourceURL = normalizeURLForComparison(source.endpoint);
    const targetURL = normalizeURLForComparison(target.endpoint);
    if (sourceURL === targetURL) {
      return {
        matched: true,
        score: 1.0,
        evidence: createCorrelationEvidence({
          reason: Reason.SameURL,
          sharedValue: sourceURL,
          sourceField: 'endpoint',
          targetField: 'endpoint',
          confidence: 1.0,
        }),
      };
    }
    return { matched: false, score: 0, evidence: null };
  },
};

/** SameService: findings affect the same service */
const sameServiceRule: CorrelationRule = {
  name: 'SameService',
  reason: Reason.SameService,
  weight: 0.75,
  description: 'Findings affect the same service',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    const sourceService = extractServiceTag(source);
    const targetService = extractServiceTag(target);
    if (!sourceService || !targetService) return { matched: false, score: 0, evidence: null };
    if (sourceService === targetService) {
      return {
        matched: true,
        score: 1.0,
        evidence: createCorrelationEvidence({
          reason: Reason.SameService,
          sharedValue: sourceService,
          sourceField: 'tags',
          targetField: 'tags',
          confidence: 1.0,
        }),
      };
    }
    return { matched: false, score: 0, evidence: null };
  },
};

/** SameTechnology: findings share the same technology */
const sameTechnologyRule: CorrelationRule = {
  name: 'SameTechnology',
  reason: Reason.SameTechnology,
  weight: 0.60,
  description: 'Findings share the same technology',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    const shared = findSharedStrings(source.technology, target.technology);
    if (shared.length === 0) return { matched: false, score: 0, evidence: null };
    return {
      matched: true,
      score: shared.length / Math.max(source.technology.length, target.technology.length, 1),
      evidence: createCorrelationEvidence({
        reason: Reason.SameTechnology,
        sharedValue: shared.join(','),
        sourceField: 'technology',
        targetField: 'technology',
        confidence: shared.length / Math.max(source.technology.length, target.technology.length, 1),
      }),
    };
  },
};

/** SameCVE: findings reference the same CVE */
const sameCVERule: CorrelationRule = {
  name: 'SameCVE',
  reason: Reason.SameCVE,
  weight: 1.00,
  description: 'Findings reference the same CVE',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    const shared = findSharedStrings(source.cve, target.cve);
    if (shared.length === 0) return { matched: false, score: 0, evidence: null };
    return {
      matched: true,
      score: 1.0,
      evidence: createCorrelationEvidence({
        reason: Reason.SameCVE,
        sharedValue: shared.join(','),
        sourceField: 'cve',
        targetField: 'cve',
        confidence: 1.0,
      }),
    };
  },
};

/** SameCWE: findings reference the same CWE */
const sameCWERule: CorrelationRule = {
  name: 'SameCWE',
  reason: Reason.SameCWE,
  weight: 0.90,
  description: 'Findings reference the same CWE',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    const shared = findSharedStrings(source.cwe, target.cwe);
    if (shared.length === 0) return { matched: false, score: 0, evidence: null };
    return {
      matched: true,
      score: 1.0,
      evidence: createCorrelationEvidence({
        reason: Reason.SameCWE,
        sharedValue: shared.join(','),
        sourceField: 'cwe',
        targetField: 'cwe',
        confidence: 1.0,
      }),
    };
  },
};

/** SameCookie: findings reference the same cookie */
const sameCookieRule: CorrelationRule = {
  name: 'SameCookie',
  reason: Reason.SameCookie,
  weight: 0.25,
  description: 'Findings reference the same cookie',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    return evaluateSharedEvidence(source, target, 'Cookie', Reason.SameCookie);
  },
};

/** SameHeader: findings reference the same header */
const sameHeaderRule: CorrelationRule = {
  name: 'SameHeader',
  reason: Reason.SameHeader,
  weight: 0.35,
  description: 'Findings reference the same header',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    return evaluateSharedEvidence(source, target, 'Header', Reason.SameHeader);
  },
};

/** SameSecret: findings reference the same secret/credential */
const sameSecretRule: CorrelationRule = {
  name: 'SameSecret',
  reason: Reason.SameSecret,
  weight: 0.95,
  description: 'Findings reference the same secret or credential',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    const sourceSecret = extractMetadataValue(source, 'secret') ?? extractMetadataValue(source, 'credential');
    const targetSecret = extractMetadataValue(target, 'secret') ?? extractMetadataValue(target, 'credential');
    if (!sourceSecret || !targetSecret) return { matched: false, score: 0, evidence: null };
    if (sourceSecret === targetSecret) {
      return {
        matched: true,
        score: 1.0,
        evidence: createCorrelationEvidence({
          reason: Reason.SameSecret,
          sharedValue: '[REDACTED]',
          sourceField: 'metadata',
          targetField: 'metadata',
          confidence: 1.0,
        }),
      };
    }
    return { matched: false, score: 0, evidence: null };
  },
};

/** SameIdentity: findings share the same identity */
const sameIdentityRule: CorrelationRule = {
  name: 'SameIdentity',
  reason: Reason.SameIdentity,
  weight: 0.85,
  description: 'Findings share the same identity',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    const sourceIdentity = extractMetadataValue(source, 'identity') ?? extractMetadataValue(source, 'user');
    const targetIdentity = extractMetadataValue(target, 'identity') ?? extractMetadataValue(target, 'user');
    if (!sourceIdentity || !targetIdentity) return { matched: false, score: 0, evidence: null };
    if (sourceIdentity === targetIdentity) {
      return {
        matched: true,
        score: 1.0,
        evidence: createCorrelationEvidence({
          reason: Reason.SameIdentity,
          sharedValue: sourceIdentity,
          sourceField: 'metadata',
          targetField: 'metadata',
          confidence: 1.0,
        }),
      };
    }
    return { matched: false, score: 0, evidence: null };
  },
};

/** SameCertificate: findings share the same certificate */
const sameCertificateRule: CorrelationRule = {
  name: 'SameCertificate',
  reason: Reason.SameCertificate,
  weight: 0.70,
  description: 'Findings share the same certificate',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    return evaluateSharedEvidence(source, target, 'Certificate', Reason.SameCertificate);
  },
};

/** SharedEvidence: findings share evidence data */
const sharedEvidenceRule: CorrelationRule = {
  name: 'SharedEvidence',
  reason: Reason.SharedEvidence,
  weight: 0.50,
  description: 'Findings share evidence data',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    if (source.evidence.length === 0 || target.evidence.length === 0) {
      return { matched: false, score: 0, evidence: null };
    }
    let sharedCount = 0;
    for (const se of source.evidence) {
      for (const te of target.evidence) {
        if (se.type === te.type && evidenceDataOverlap(se.data, te.data)) {
          sharedCount++;
        }
      }
    }
    if (sharedCount === 0) return { matched: false, score: 0, evidence: null };
    const totalPairs = source.evidence.length * target.evidence.length;
    const overlapRatio = sharedCount / totalPairs;
    return {
      matched: true,
      score: Math.min(1.0, overlapRatio * 2), // boost slightly
      evidence: createCorrelationEvidence({
        reason: Reason.SharedEvidence,
        sharedValue: `${sharedCount} shared evidence items`,
        sourceField: 'evidence',
        targetField: 'evidence',
        confidence: overlapRatio,
      }),
    };
  },
};

/** SharedRequest: findings share the same request */
const sharedRequestRule: CorrelationRule = {
  name: 'SharedRequest',
  reason: Reason.SharedRequest,
  weight: 0.65,
  description: 'Findings share the same request',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    return evaluateSharedEvidence(source, target, 'Request', Reason.SharedRequest);
  },
};

/** SharedResponse: findings share the same response */
const sharedResponseRule: CorrelationRule = {
  name: 'SharedResponse',
  reason: Reason.SharedResponse,
  weight: 0.65,
  description: 'Findings share the same response',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    return evaluateSharedEvidence(source, target, 'Response', Reason.SharedResponse);
  },
};

/** SharedAuthentication: findings share authentication context */
const sharedAuthenticationRule: CorrelationRule = {
  name: 'SharedAuthentication',
  reason: Reason.SharedAuthentication,
  weight: 0.80,
  description: 'Findings share authentication context',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    return evaluateSharedEvidence(source, target, 'Cookie', Reason.SharedAuthentication);
  },
};

/** SharedComponent: findings share a component */
const sharedComponentRule: CorrelationRule = {
  name: 'SharedComponent',
  reason: Reason.SharedComponent,
  weight: 0.70,
  description: 'Findings share a component',
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult {
    const sourceComponent = extractMetadataValue(source, 'component') ?? extractMetadataValue(source, 'library');
    const targetComponent = extractMetadataValue(target, 'component') ?? extractMetadataValue(target, 'library');
    if (!sourceComponent || !targetComponent) return { matched: false, score: 0, evidence: null };
    if (sourceComponent === targetComponent) {
      return {
        matched: true,
        score: 1.0,
        evidence: createCorrelationEvidence({
          reason: Reason.SharedComponent,
          sharedValue: sourceComponent,
          sourceField: 'metadata',
          targetField: 'metadata',
          confidence: 1.0,
        }),
      };
    }
    return { matched: false, score: 0, evidence: null };
  },
};

// ─── All Built-in Rules ──────────────────────────────────────

export const BUILT_IN_RULES: readonly CorrelationRule[] = Object.freeze([
  sameHostRule,
  sameEndpointRule,
  samePathRule,
  sameURLRule,
  sameServiceRule,
  sameTechnologyRule,
  sameCVERule,
  sameCWERule,
  sameCookieRule,
  sameHeaderRule,
  sameSecretRule,
  sameIdentityRule,
  sameCertificateRule,
  sharedEvidenceRule,
  sharedRequestRule,
  sharedResponseRule,
  sharedAuthenticationRule,
  sharedComponentRule,
]);

// ─── Rule Registry ───────────────────────────────────────────

/**
 * Extensible registry for correlation rules.
 * Supports registration, unregistration, and weighted evaluation.
 */
export class RuleRegistry {
  private readonly _rules: Map<string, CorrelationRule> = new Map();

  constructor(initialRules: readonly CorrelationRule[] = BUILT_IN_RULES) {
    for (const rule of initialRules) {
      this._rules.set(rule.name, rule);
    }
  }

  /** Register a correlation rule */
  register(rule: CorrelationRule): void {
    this._rules.set(rule.name, rule);
  }

  /** Unregister a correlation rule by name */
  unregister(name: string): boolean {
    return this._rules.delete(name);
  }

  /** Get a rule by name */
  get(name: string): CorrelationRule | undefined {
    return this._rules.get(name);
  }

  /** Get all registered rules */
  getAll(): readonly CorrelationRule[] {
    return Object.freeze([...this._rules.values()]);
  }

  /** Get the number of registered rules */
  get size(): number {
    return this._rules.size;
  }

  /** Check if a rule is registered */
  has(name: string): boolean {
    return this._rules.has(name);
  }

  /** Get total weight of all rules (for normalization) */
  getTotalWeight(): number {
    let total = 0;
    for (const rule of this._rules.values()) {
      total += rule.weight;
    }
    return total;
  }

  /** Evaluate all rules against two findings */
  evaluateAll(
    source: CorrelationFindingInput,
    target: CorrelationFindingInput,
  ): CorrelationRuleResult[] {
    const results: CorrelationRuleResult[] = [];
    for (const rule of this._rules.values()) {
      results.push(rule.evaluate(source, target));
    }
    return results;
  }

  /**
   * Compute a weighted correlation score from rule results.
   * Score = sum(matched_rule.weight * rule_result.score) / sum(all_rule.weight)
   */
  computeWeightedScore(results: CorrelationRuleResult[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    const rules = [...this._rules.values()];
    for (let i = 0; i < results.length && i < rules.length; i++) {
      const result = results[i];
      const rule = rules[i];
      totalWeight += rule.weight;
      if (result.matched) {
        weightedSum += rule.weight * result.score;
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /** Reset registry to built-in rules only */
  reset(): void {
    this._rules.clear();
    for (const rule of BUILT_IN_RULES) {
      this._rules.set(rule.name, rule);
    }
  }
}

// ─── Helper Functions ────────────────────────────────────────

/** Extract hostname from a URL or asset identifier */
function extractHost(identifier: string): string | null {
  try {
    if (identifier.startsWith('http://') || identifier.startsWith('https://')) {
      const url = new URL(identifier);
      return url.hostname;
    }
    // Maybe just a hostname
    if (/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(identifier)) {
      return identifier.toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

/** Extract path from a URL */
function extractPath(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    return url.pathname;
  } catch {
    // Try treating as a path
    if (urlStr.startsWith('/')) return urlStr;
    return null;
  }
}

/** Normalize URL for comparison (remove trailing slash, sort query params) */
function normalizeURLForComparison(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    url.searchParams.sort();
    let normalized = `${url.protocol}//${url.hostname}`;
    if (url.port && !isDefaultPort(url.protocol, url.port)) {
      normalized += `:${url.port}`;
    }
    normalized += url.pathname.replace(/\/+$/, '') || '/';
    if (url.search) normalized += url.search;
    if (url.hash) normalized += url.hash;
    return normalized;
  } catch {
    return urlStr;
  }
}

/** Check if a port is the default for the given protocol */
function isDefaultPort(protocol: string, port: string): boolean {
  return (protocol === 'https:' && port === '443') || (protocol === 'http:' && port === '80');
}

/** Extract service tag from finding */
function extractServiceTag(finding: CorrelationFindingInput): string | null {
  for (const tag of finding.tags) {
    if (tag.startsWith('service:')) return tag.slice(8);
  }
  const service = finding.metadata['service'];
  return typeof service === 'string' ? service : null;
}

/** Find shared strings between two arrays */
function findSharedStrings(a: readonly string[], b: readonly string[]): string[] {
  const setB = new Set(b);
  return a.filter(s => setB.has(s));
}

/** Extract metadata value by key */
function extractMetadataValue(finding: CorrelationFindingInput, key: string): string | null {
  const value = finding.metadata[key];
  return typeof value === 'string' ? value : null;
}

/** Check if two evidence data objects have overlapping keys/values */
function evidenceDataOverlap(
  a: Readonly<Record<string, string | number | boolean | null>>,
  b: Readonly<Record<string, string | number | boolean | null>>,
): boolean {
  for (const key of Object.keys(a)) {
    if (key in b && a[key] === b[key] && a[key] !== null) {
      return true;
    }
  }
  return false;
}

/** Evaluate shared evidence by type */
function evaluateSharedEvidence(
  source: CorrelationFindingInput,
  target: CorrelationFindingInput,
  evidenceType: string,
  reason: CorrelationReason,
): CorrelationRuleResult {
  const sourceEvidence = source.evidence.filter(e => e.type === evidenceType);
  const targetEvidence = target.evidence.filter(e => e.type === evidenceType);
  if (sourceEvidence.length === 0 || targetEvidence.length === 0) {
    return { matched: false, score: 0, evidence: null };
  }

  let overlapCount = 0;
  for (const se of sourceEvidence) {
    for (const te of targetEvidence) {
      if (evidenceDataOverlap(se.data, te.data)) overlapCount++;
    }
  }

  if (overlapCount === 0) return { matched: false, score: 0, evidence: null };

  return {
    matched: true,
    score: Math.min(1.0, overlapCount / Math.max(sourceEvidence.length, targetEvidence.length)),
    evidence: createCorrelationEvidence({
      reason,
      sharedValue: `${overlapCount} shared ${evidenceType} evidence`,
      sourceField: 'evidence',
      targetField: 'evidence',
      confidence: overlapCount / Math.max(sourceEvidence.length, targetEvidence.length),
    }),
  };
}
