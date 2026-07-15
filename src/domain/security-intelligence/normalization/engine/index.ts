/**
 * Security Intelligence Normalization — Finding Normalization Engine
 *
 * The main orchestrator that transforms raw scanner findings
 * into canonical CanonicalFinding format.
 *
 * Public API:
 * - normalize(rawFinding): NormalizationResult
 * - normalizeBatch(rawFindings): BatchNormalizationResult
 * - validate(finding): ValidationResult
 * - canonicalize(finding): CanonicalFinding
 * - statistics(): NormalizationStatistics
 *
 * Architecture:
 * - Each raw finding passes through a pipeline of normalizers
 * - Severity, Confidence, CWE/CVE, Technology, URL, Evidence, Asset
 * - Validation is applied after normalization
 * - Events are emitted for observability
 * - Statistics are collected for monitoring
 */

import type {
  RawFinding, CanonicalFinding, NormalizationResult, BatchNormalizationResult,
  NormalizationError, NormalizationWarning, BatchNormalizationError,
  NormalizationConfig, NormalizationStatistics, FindingId,
  CVEReference, CWEReference, CVSSScore, CanonicalURL, AffectedAsset, NormalizedEvidence,
  Timestamp, Metadata,
} from '../types/index.ts';
import {
  DEFAULT_NORMALIZATION_CONFIG,
  Severity as Sev, ConfidenceLevel as Conf, SourceEngine as Src, FindingCategory as Cat,
  brandFindingId,
} from '../types/index.ts';
import {
  createCanonicalFinding, generateFindingId,
} from '../models/index.ts';
import { normalizeSeverity } from '../normalizers/severity/index.ts';
import { calculateConfidence, normalizeConfidence } from '../normalizers/confidence/index.ts';
import { normalizeCWE, normalizeCWEList, normalizeCVE, normalizeCVEList, normalizeCVSS } from '../normalizers/cwe-cve/index.ts';
import { normalizeTechnology } from '../normalizers/technology/index.ts';
import { normalizeURL } from '../normalizers/url/index.ts';
import { normalizeEvidence, normalizeEvidenceList } from '../normalizers/evidence/index.ts';
import { resolveAsset } from '../normalizers/asset/index.ts';
import { validateFinding, validateFindingBatch } from '../normalizers/validation/index.ts';
import { NormalizationStatisticsCollector } from '../statistics/index.ts';
import {
  NormalizationEventBus,
  createFindingNormalizedEvent,
  createNormalizationFailedEvent,
  createBatchNormalizedEvent,
  createCanonicalizationCompletedEvent,
} from '../events/index.ts';

// ─── Source Engine Normalization Map ─────────────────────────

const SOURCE_ENGINE_MAP: Readonly<Record<string, Src>> = Object.freeze({
  nuclei: Src.Nuclei,
  Nuclei: Src.Nuclei,
  NUCLEI: Src.Nuclei,
  'nuclei-scanner': Src.Nuclei,
  browser_intelligence: Src.BrowserIntelligence,
  BrowserIntelligence: Src.BrowserIntelligence,
  'browser-intelligence': Src.BrowserIntelligence,
  'browser-intel': Src.BrowserIntelligence,
  http_intelligence: Src.HTTPIntelligence,
  HTTPIntelligence: Src.HTTPIntelligence,
  'http-intelligence': Src.HTTPIntelligence,
  'http-intel': Src.HTTPIntelligence,
  discovery: Src.DiscoveryEngine,
  DiscoveryEngine: Src.DiscoveryEngine,
  'discovery-engine': Src.DiscoveryEngine,
  'discovery-engine-v2': Src.DiscoveryEngine,
  manual: Src.Manual,
  Manual: Src.Manual,
});

// ─── Category Normalization Map ──────────────────────────────

const CATEGORY_MAP: Readonly<Record<string, Cat>> = Object.freeze({
  // Vulnerability
  vulnerability: Cat.Vulnerability,
  Vulnerability: Cat.Vulnerability,
  vuln: Cat.Vulnerability,
  // Misconfiguration
  misconfiguration: Cat.Misconfiguration,
  Misconfiguration: Cat.Misconfiguration,
  misconfig: Cat.Misconfiguration,
  config: Cat.Misconfiguration,
  // Exposure
  exposure: Cat.Exposure,
  Exposure: Cat.Exposure,
  exposed: Cat.Exposure,
  // Info disclosure
  'info-disclosure': Cat.InformationDisclosure,
  InformationDisclosure: Cat.InformationDisclosure,
  informationdisclosure: Cat.InformationDisclosure,
  infodisc: Cat.InformationDisclosure,
  // Authentication
  authentication: Cat.Authentication,
  Authentication: Cat.Authentication,
  auth: Cat.Authentication,
  bruteforce: Cat.Authentication,
  // Authorization
  authorization: Cat.Authorization,
  Authorization: Cat.Authorization,
  authz: Cat.Authorization,
  accesscontrol: Cat.BrokenAccessControl,
  // Injection
  injection: Cat.Injection,
  Injection: Cat.Injection,
  sqli: Cat.Injection,
  sql_injection: Cat.Injection,
  command_injection: Cat.Injection,
  xxe: Cat.Injection,
  // XSS
  xss: Cat.CrossSiteScripting,
  XSS: Cat.CrossSiteScripting,
  crosssitescripting: Cat.CrossSiteScripting,
  'cross-site-scripting': Cat.CrossSiteScripting,
  // SSRF
  ssrf: Cat.ServerSideRequestForgery,
  SSRF: Cat.ServerSideRequestForgery,
  serversiderequestforgery: Cat.ServerSideRequestForgery,
  // DoS
  dos: Cat.DenialOfService,
  denialofservice: Cat.DenialOfService,
  DenialOfService: Cat.DenialOfService,
  // Crypto
  cryptography: Cat.Cryptography,
  Cryptography: Cat.Cryptography,
  crypto: Cat.Cryptography,
  ssl: Cat.Cryptography,
  tls: Cat.Cryptography,
  // Security misconfiguration
  securitymisconfiguration: Cat.SecurityMisconfiguration,
  SecurityMisconfiguration: Cat.SecurityMisconfiguration,
  // Outdated
  outdated: Cat.OutdatedComponent,
  OutdatedComponent: Cat.OutdatedComponent,
  outdatedcomponent: Cat.OutdatedComponent,
  // Data leak
  dataleak: Cat.DataLeak,
  DataLeak: Cat.DataLeak,
  data_leak: Cat.DataLeak,
  // Network
  network: Cat.NetworkSecurity,
  NetworkSecurity: Cat.NetworkSecurity,
  networksecurity: Cat.NetworkSecurity,
  // Other
  other: Cat.Other,
  Other: Cat.Other,
  unknown: Cat.Other,
});

// ─── Finding Normalization Engine ────────────────────────────

export class FindingNormalizationEngine {
  private readonly _config: NormalizationConfig;
  private readonly _statisticsCollector: NormalizationStatisticsCollector;
  readonly eventBus: NormalizationEventBus;
  private readonly _findingCache: Map<string, CanonicalFinding>;
  private readonly _seenIds: Set<string>;

  constructor(config: Partial<NormalizationConfig> = {}) {
    this._config = { ...DEFAULT_NORMALIZATION_CONFIG, ...config };
    this._statisticsCollector = new NormalizationStatisticsCollector();
    this.eventBus = new NormalizationEventBus();
    this._findingCache = new Map();
    this._seenIds = new Set();
  }

  // ─── Public API ────────────────────────────────────────

  /**
   * Normalize a single raw finding into canonical format.
   * Applies all normalizers in sequence and validates the result.
   */
  normalize(raw: RawFinding): NormalizationResult {
    const startTime = performance.now();
    const errors: NormalizationError[] = [];
    const warnings: NormalizationWarning[] = [];
    const appliedNormalizations: string[] = [];

    try {
      // 1. Source Engine
      const sourceEngine = this.normalizeSourceEngine(raw.sourceEngine);
      if (sourceEngine !== Src.Unknown) appliedNormalizations.push('sourceEngine');

      // 2. Category
      const category = this.normalizeCategory(raw.category);
      if (category !== Cat.Other) appliedNormalizations.push('category');

      // 3. Severity
      const severityResult = normalizeSeverity(raw.severity, sourceEngine);
      if (severityResult.wasNormalized) appliedNormalizations.push('severity');

      // 4. Confidence
      const confidenceResult = this.computeConfidence(raw, sourceEngine);
      appliedNormalizations.push('confidence');

      // 5. CWE/CVE
      const cweList = normalizeCWEList(raw.cwe as string[] | undefined);
      const cveList = normalizeCVEList(raw.cve as string[] | undefined);
      if (cweList.length > 0 || cveList.length > 0) appliedNormalizations.push('cwe-cve');

      // 6. CVSS
      const cvss = normalizeCVSS(raw.cvss);
      if (cvss) appliedNormalizations.push('cvss');

      // 7. URL/Endpoint
      const endpoint = this.normalizeEndpoint(raw.endpoint);
      if (endpoint) appliedNormalizations.push('url');

      // 8. Asset
      const asset = this.resolveAssetFromRaw(raw, endpoint);
      if (asset) appliedNormalizations.push('asset');

      // 9. Evidence
      const evidence = this.normalizeEvidenceFromRaw(raw);
      if (evidence.length > 0) appliedNormalizations.push('evidence');

      // 10. Title & Description
      const title = this.normalizeTitle(raw.title);
      const description = this.normalizeDescription(raw.description);

      // 11. References
      const references = this.normalizeReferences(raw.references);

      // 12. Technology
      const technology = this.normalizeTechnologyField(raw);
      if (technology.length > 0) appliedNormalizations.push('technology');

      // 13. Tags
      const tags = this.normalizeTags(raw);

      // 14. Metadata
      const metadata = this.normalizeMetadata(raw.metadata, raw);

      // 15. Finding ID
      const findingId = this.resolveFindingId(raw, sourceEngine);

      // 16. Timestamps
      const discoveredAt = this.normalizeTimestamp(raw.discoveredAt);

      // Create the canonical finding
      const finding = createCanonicalFinding({
        id: findingId,
        sourceEngine,
        category,
        title,
        description,
        severity: severityResult.severity,
        confidence: confidenceResult.level,
        confidenceScore: confidenceResult.score,
        cve: cveList,
        cwe: cweList,
        cvss: cvss ? { score: cvss.score, vector: cvss.vector, version: cvss.version } : null,
        affectedAsset: asset,
        endpoint,
        evidence,
        technology,
        tags,
        references,
        metadata,
        discoveredAt,
        normalizerVersion: this._config.normalizerVersion,
      });

      const durationMs = performance.now() - startTime;

      // Track ID uniqueness
      this._seenIds.add(finding.id);

      // Record statistics
      this._statisticsCollector.recordNormalization(durationMs, finding.severity, finding.sourceEngine, finding.category);

      // Emit event
      this.eventBus.emit(createFindingNormalizedEvent(
        this._config.engineId,
        finding.id,
        sourceEngine,
        severityResult.severity,
        confidenceResult.level,
        appliedNormalizations,
        durationMs,
      ));

      return {
        success: true,
        finding,
        errors: Object.freeze(errors),
        warnings: Object.freeze(warnings),
        durationMs,
        appliedNormalizations: Object.freeze(appliedNormalizations),
      };
    } catch (e) {
      const durationMs = performance.now() - startTime;
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      errors.push({
        field: 'general',
        message: errorMsg,
        value: raw,
        normalizer: 'engine',
      });

      this._statisticsCollector.recordFailure();

      this.eventBus.emit(createNormalizationFailedEvent(
        this._config.engineId,
        raw.id ?? 'unknown',
        raw.sourceEngine ?? 'unknown',
        [errorMsg],
        durationMs,
      ));

      return {
        success: false,
        finding: null,
        errors: Object.freeze(errors),
        warnings: Object.freeze(warnings),
        durationMs,
        appliedNormalizations: Object.freeze(appliedNormalizations),
      };
    }
  }

  /**
   * Normalize a batch of raw findings.
   * Processes findings sequentially for deterministic results.
   */
  normalizeBatch(raws: readonly RawFinding[]): BatchNormalizationResult {
    const startTime = performance.now();
    const findings: CanonicalFinding[] = [];
    const errors: BatchNormalizationError[] = [];

    for (let i = 0; i < raws.length; i++) {
      const result = this.normalize(raws[i]);
      if (result.success && result.finding) {
        findings.push(result.finding);
      } else {
        errors.push({
          index: i,
          findingId: raws[i].id ?? `batch_${i}`,
          errors: result.errors,
        });
      }
    }

    const durationMs = performance.now() - startTime;
    const throughputPerSecond = durationMs > 0 ? (findings.length / durationMs) * 1000 : 0;

    this._statisticsCollector.recordBatch(durationMs, raws.length);

    this.eventBus.emit(createBatchNormalizedEvent(
      this._config.engineId,
      raws.length,
      findings.length,
      errors.length,
      durationMs,
      throughputPerSecond,
    ));

    return {
      total: raws.length,
      succeeded: findings.length,
      failed: errors.length,
      findings: Object.freeze(findings),
      errors: Object.freeze(errors),
      durationMs,
      throughputPerSecond: Math.round(throughputPerSecond * 1000) / 1000,
    };
  }

  /**
   * Validate a canonical finding.
   */
  validate(finding: CanonicalFinding) {
    this._statisticsCollector.recordValidation();
    return validateFinding(finding);
  }

  /**
   * Re-canonicalize an existing finding.
   * Applies normalizations that may have been added since initial normalization.
   */
  canonicalize(finding: CanonicalFinding): NormalizationResult {
    const startTime = performance.now();
    const appliedNormalizations: string[] = [];

    // Re-normalize each field
    const severityResult = normalizeSeverity(finding.severity, finding.sourceEngine);
    if (severityResult.wasNormalized) appliedNormalizations.push('severity');

    const confidenceResult = normalizeConfidence(finding.confidence, finding.sourceEngine);

    const cweList = normalizeCWEList(finding.cwe.map(c => c.id));
    const cveList = normalizeCVEList(finding.cve.map(c => c.id));

    let normalizationsApplied = appliedNormalizations.length;

    const reCanonicalized = createCanonicalFinding({
      id: finding.id,
      sourceEngine: finding.sourceEngine,
      category: finding.category,
      title: finding.title,
      description: finding.description,
      severity: severityResult.severity,
      confidence: confidenceResult.level,
      confidenceScore: confidenceResult.score,
      cve: cveList.length > 0 ? cveList : finding.cve,
      cwe: cweList.length > 0 ? cweList : finding.cwe,
      cvss: finding.cvss,
      affectedAsset: finding.affectedAsset,
      endpoint: finding.endpoint,
      evidence: finding.evidence,
      technology: finding.technology,
      tags: finding.tags,
      references: finding.references,
      metadata: finding.metadata,
      discoveredAt: finding.discoveredAt,
      normalizerVersion: this._config.normalizerVersion,
    });

    const durationMs = performance.now() - startTime;

    this.eventBus.emit(createCanonicalizationCompletedEvent(
      this._config.engineId,
      finding.id,
      Object.keys(reCanonicalized).length,
      normalizationsApplied,
      durationMs,
    ));

    return {
      success: true,
      finding: reCanonicalized,
      errors: [],
      warnings: [],
      durationMs,
      appliedNormalizations: Object.freeze(appliedNormalizations),
    };
  }

  /**
   * Get current normalization engine statistics.
   */
  statistics(): NormalizationStatistics {
    return this._statisticsCollector.collect();
  }

  /**
   * Reset all engine state.
   */
  reset(): void {
    this._statisticsCollector.reset();
    this._findingCache.clear();
    this._seenIds.clear();
    this.eventBus.clear();
  }

  // ─── Private Helpers ───────────────────────────────────

  private normalizeSourceEngine(value: unknown): Src {
    if (value === undefined || value === null) return Src.Unknown;
    const strValue = String(value).trim();
    if (!strValue) return Src.Unknown;
    return SOURCE_ENGINE_MAP[strValue] ?? SOURCE_ENGINE_MAP[strValue.toLowerCase()] ?? Src.Unknown;
  }

  private normalizeCategory(value: unknown): Cat {
    if (value === undefined || value === null) return Cat.Other;
    const strValue = String(value).trim();
    if (!strValue) return Cat.Other;
    return CATEGORY_MAP[strValue] ?? CATEGORY_MAP[strValue.toLowerCase()] ?? Cat.Other;
  }

  private computeConfidence(raw: RawFinding, sourceEngine: Src) {
    // If the raw finding has an explicit confidence, normalize it
    if (raw.confidence !== undefined) {
      return normalizeConfidence(raw.confidence, sourceEngine);
    }

    // Otherwise, calculate from available data
    const hasEvidence = raw.evidence !== undefined && raw.evidence !== null;
    const evidenceCount = hasEvidence
      ? (Array.isArray(raw.evidence) ? raw.evidence.length : 1)
      : 0;

    const requiredFields = ['title', 'description', 'severity', 'endpoint', 'affectedAsset'];
    const presentFields = requiredFields.filter(f => (raw as Record<string, unknown>)[f] !== undefined);
    const totalRequired = requiredFields.length;

    return calculateConfidence({
      sourceEngine,
      hasEvidence,
      evidenceCount,
      evidenceTypes: [],
      hasCompleteFields: presentFields.length === totalRequired,
      requiredFieldsPresent: presentFields.length,
      totalRequiredFields: totalRequired,
      isReproducible: false,
    });
  }

  private normalizeEndpoint(value: string | undefined): CanonicalURL | null {
    if (!value) return null;
    const result = normalizeURL(value);
    return result.url;
  }

  private resolveAssetFromRaw(raw: RawFinding, endpoint: CanonicalURL | null): AffectedAsset | null {
    const assetIdentifier = raw.affectedAsset ?? (endpoint ? `${endpoint.scheme}://${endpoint.host}` : null);
    if (!assetIdentifier) return null;
    const result = resolveAsset(assetIdentifier);
    return result.asset;
  }

  private normalizeEvidenceFromRaw(raw: RawFinding): NormalizedEvidence[] {
    if (raw.evidence === undefined || raw.evidence === null) return [];
    if (Array.isArray(raw.evidence)) {
      return normalizeEvidenceList(raw.evidence);
    }
    return [normalizeEvidence(raw.evidence).evidence];
  }

  private normalizeTitle(value: string | undefined): string {
    if (!value) return 'Untitled Finding';
    return value.trim() || 'Untitled Finding';
  }

  private normalizeDescription(value: string | undefined): string {
    if (!value) return 'No description provided';
    return value.trim() || 'No description provided';
  }

  private normalizeReferences(refs: readonly string[] | undefined): string[] {
    if (!refs) return [];
    return refs.filter(r => {
      try {
        new URL(r);
        return true;
      } catch {
        return false;
      }
    });
  }

  private normalizeMetadata(metadata: Metadata | undefined, raw: RawFinding): Metadata {
    const result: Record<string, string | number | boolean | null> = { ...(metadata ?? {}) };
    return result;
  }

  private normalizeTechnologyField(raw: RawFinding): string[] {
    const techRaw = raw.technology ?? raw.tech;
    if (!techRaw) return [];
    if (typeof techRaw === 'string') {
      return [normalizeTechnology(techRaw).normalized];
    }
    if (Array.isArray(techRaw)) {
      return techRaw
        .filter((t): t is string => typeof t === 'string')
        .map(t => normalizeTechnology(t).normalized)
        .filter(t => t !== '');
    }
    return [];
  }

  private normalizeTags(raw: RawFinding): string[] {
    if (!raw.tags) return [];
    if (Array.isArray(raw.tags)) {
      return raw.tags.filter((t): t is string => typeof t === 'string');
    }
    return [];
  }

  private resolveFindingId(raw: RawFinding, sourceEngine: Src): FindingId {
    if (raw.id) {
      const id = String(raw.id);
      // If already branded, use as-is
      if (id.startsWith('fnd_')) return brandFindingId(id);
      return generateFindingId(sourceEngine, id);
    }
    return generateFindingId(sourceEngine);
  }

  private normalizeTimestamp(value: string | undefined): Timestamp {
    if (!value) return new Date().toISOString() as Timestamp;
    const d = new Date(value);
    if (isNaN(d.getTime())) return new Date().toISOString() as Timestamp;
    return d.toISOString() as Timestamp;
  }
}
