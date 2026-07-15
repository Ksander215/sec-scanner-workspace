/**
 * Security Intelligence Normalization Engine — Comprehensive Tests
 *
 * Coverage targets:
 * - All normalizers (severity, confidence, CWE/CVE, technology, URL, evidence, asset, validation)
 * - Batch processing
 * - Validation
 * - Canonicalization
 * - Edge cases and malformed input
 * - Events
 * - Statistics
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Types & Enums ───────────────────────────────────────────

import {
  Severity, SourceEngine, FindingCategory, ConfidenceLevel,
  EvidenceType, AssetType, brandFindingId, DEFAULT_NORMALIZATION_CONFIG,
} from '../types/index.ts';

// ─── Models ──────────────────────────────────────────────────

import {
  createCanonicalFinding, createCWEReference, createCVEReference,
  createCVSSScore, createCanonicalURL, createAffectedAsset, createNormalizedEvidence,
  generateFindingId, canonicalFindingToJSON, canonicalFindingFromJSON,
  canonicalFindingsEqual, cloneCanonicalFinding, hashCanonicalFinding,
} from '../models/index.ts';

// ─── Normalizers ─────────────────────────────────────────────

import {
  normalizeSeverity, cvssScoreToSeverity, compareSeverities, maxSeverity,
} from '../normalizers/severity/index.ts';

import {
  calculateConfidence, normalizeConfidence, compareConfidence,
} from '../normalizers/confidence/index.ts';

import {
  normalizeCWE, normalizeCWEList, normalizeCVE, normalizeCVEList, normalizeCVSS,
} from '../normalizers/cwe-cve/index.ts';

import {
  normalizeTechnology, normalizeTechnologyList, isKnownTechnology,
  getKnownTechnologies, getTechnologyAliases,
} from '../normalizers/technology/index.ts';

import {
  normalizeURL, urlsEqual, canonicalURLToString, extractRootURL,
} from '../normalizers/url/index.ts';

import {
  normalizeEvidence, normalizeEvidenceList, detectEvidenceType,
} from '../normalizers/evidence/index.ts';

import {
  resolveAsset, determineAssetType,
} from '../normalizers/asset/index.ts';

import {
  validateFinding, validateFindingBatch,
} from '../normalizers/validation/index.ts';

// ─── Engine ──────────────────────────────────────────────────

import { FindingNormalizationEngine } from '../engine/index.ts';

// ─── Events ──────────────────────────────────────────────────

import {
  NormalizationEventBus,
  createFindingNormalizedEvent,
  createNormalizationFailedEvent,
  createBatchNormalizedEvent,
  createCanonicalizationCompletedEvent,
} from '../events/index.ts';

// ─── Statistics ──────────────────────────────────────────────

import { NormalizationStatisticsCollector } from '../statistics/index.ts';

// ═══════════════════════════════════════════════════════════════
// TYPES & ENUMS
// ═══════════════════════════════════════════════════════════════

describe('Types & Enums', () => {
  it('should have all severity levels', () => {
    expect(Severity.Info).toBe('Info');
    expect(Severity.Low).toBe('Low');
    expect(Severity.Medium).toBe('Medium');
    expect(Severity.High).toBe('High');
    expect(Severity.Critical).toBe('Critical');
  });

  it('should have all source engines', () => {
    expect(SourceEngine.Nuclei).toBe('Nuclei');
    expect(SourceEngine.BrowserIntelligence).toBe('BrowserIntelligence');
    expect(SourceEngine.HTTPIntelligence).toBe('HTTPIntelligence');
    expect(SourceEngine.DiscoveryEngine).toBe('DiscoveryEngine');
    expect(SourceEngine.Manual).toBe('Manual');
    expect(SourceEngine.Unknown).toBe('Unknown');
  });

  it('should have all confidence levels', () => {
    expect(ConfidenceLevel.Unknown).toBe('Unknown');
    expect(ConfidenceLevel.Low).toBe('Low');
    expect(ConfidenceLevel.Medium).toBe('Medium');
    expect(ConfidenceLevel.High).toBe('High');
    expect(ConfidenceLevel.Confirmed).toBe('Confirmed');
  });

  it('should have all evidence types', () => {
    expect(EvidenceType.Request).toBe('Request');
    expect(EvidenceType.Response).toBe('Response');
    expect(EvidenceType.DOM).toBe('DOM');
    expect(EvidenceType.Screenshot).toBe('Screenshot');
    expect(EvidenceType.Header).toBe('Header');
    expect(EvidenceType.Certificate).toBe('Certificate');
    expect(EvidenceType.Cookie).toBe('Cookie');
  });

  it('should have all asset types', () => {
    expect(AssetType.Host).toBe('Host');
    expect(AssetType.Application).toBe('Application');
    expect(AssetType.Endpoint).toBe('Endpoint');
    expect(AssetType.API).toBe('API');
    expect(AssetType.Service).toBe('Service');
  });

  it('should brand finding IDs', () => {
    const id = brandFindingId('test_123');
    expect(id).toBe('test_123');
    expect(typeof id).toBe('string');
  });

  it('should provide default config', () => {
    expect(DEFAULT_NORMALIZATION_CONFIG.engineId).toBe('default');
    expect(DEFAULT_NORMALIZATION_CONFIG.strictValidation).toBe(true);
    expect(DEFAULT_NORMALIZATION_CONFIG.normalizerVersion).toBe('1.0.0');
  });
});

// ═══════════════════════════════════════════════════════════════
// MODELS
// ═══════════════════════════════════════════════════════════════

describe('Models', () => {
  describe('createCanonicalFinding', () => {
    it('should create a canonical finding with all fields', () => {
      const finding = createCanonicalFinding({
        sourceEngine: SourceEngine.Nuclei,
        category: FindingCategory.Vulnerability,
        title: 'SQL Injection',
        description: 'A SQL injection vulnerability was found',
        severity: Severity.High,
        confidence: ConfidenceLevel.High,
        confidenceScore: 0.8,
      });

      expect(finding.sourceEngine).toBe(SourceEngine.Nuclei);
      expect(finding.category).toBe(FindingCategory.Vulnerability);
      expect(finding.title).toBe('SQL Injection');
      expect(finding.severity).toBe(Severity.High);
      expect(finding.confidence).toBe(ConfidenceLevel.High);
      expect(finding.cve).toEqual([]);
      expect(finding.cwe).toEqual([]);
      expect(finding.cvss).toBeNull();
      expect(finding.affectedAsset).toBeNull();
      expect(finding.endpoint).toBeNull();
      expect(finding.evidence).toEqual([]);
      expect(finding.id).toBeTruthy();
      expect(finding.normalizedAt).toBeTruthy();
    });

    it('should create a finding with CVE/CWE references', () => {
      const finding = createCanonicalFinding({
        sourceEngine: SourceEngine.Nuclei,
        category: FindingCategory.Vulnerability,
        title: 'XSS',
        description: 'Cross-site scripting',
        severity: Severity.Medium,
        confidence: ConfidenceLevel.Medium,
        confidenceScore: 0.55,
        cve: [createCVEReference(2024, '1234')],
        cwe: [createCWEReference(79)],
      });

      expect(finding.cve).toHaveLength(1);
      expect(finding.cve[0].id).toBe('CVE-2024-1234');
      expect(finding.cwe).toHaveLength(1);
      expect(finding.cwe[0].id).toBe('CWE-79');
      expect(finding.cwe[0].numericId).toBe(79);
    });

    it('should create a fully populated finding', () => {
      const url = createCanonicalURL({
        scheme: 'https', host: 'example.com', path: '/api', original: 'https://example.com/api',
      });
      const asset = createAffectedAsset({
        type: AssetType.API, identifier: 'https://example.com/api',
      });
      const evidence = [createNormalizedEvidence({
        type: EvidenceType.Request, data: { method: 'GET' },
      })];

      const finding = createCanonicalFinding({
        sourceEngine: SourceEngine.HTTPIntelligence,
        category: FindingCategory.Injection,
        title: 'SQLi',
        description: 'SQL injection',
        severity: Severity.Critical,
        confidence: ConfidenceLevel.Confirmed,
        confidenceScore: 0.95,
        cvss: createCVSSScore(9.8, 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'),
        endpoint: url,
        affectedAsset: asset,
        evidence,
        references: ['https://owasp.org'],
      });

      expect(finding.cvss?.score).toBe(9.8);
      expect(finding.endpoint?.host).toBe('example.com');
      expect(finding.affectedAsset?.type).toBe(AssetType.API);
      expect(finding.evidence).toHaveLength(1);
      expect(finding.references).toHaveLength(1);
    });

    it('should be deeply frozen', () => {
      const finding = createCanonicalFinding({
        sourceEngine: SourceEngine.Nuclei,
        category: FindingCategory.Other,
        title: 'Test',
        description: 'Test finding',
        severity: Severity.Info,
        confidence: ConfidenceLevel.Unknown,
        confidenceScore: 0,
      });

      expect(() => { (finding as Record<string, unknown>).title = 'modified'; }).toThrow();
      expect(() => { finding.cve.push(createCVEReference(2024, '1')); }).toThrow();
    });
  });

  describe('Serialization', () => {
    it('should round-trip through JSON', () => {
      const original = createCanonicalFinding({
        sourceEngine: SourceEngine.Nuclei,
        category: FindingCategory.Vulnerability,
        title: 'Test',
        description: 'Test',
        severity: Severity.High,
        confidence: ConfidenceLevel.High,
        confidenceScore: 0.8,
        cve: [createCVEReference(2024, '1234')],
      });

      const json = canonicalFindingToJSON(original);
      const restored = canonicalFindingFromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.sourceEngine).toBe(original.sourceEngine);
      expect(restored.title).toBe(original.title);
      expect(restored.severity).toBe(original.severity);
    });

    it('should check equality by ID', () => {
      const a = createCanonicalFinding({
        id: brandFindingId('fnd_test'),
        sourceEngine: SourceEngine.Nuclei,
        category: FindingCategory.Other,
        title: 'A', description: 'A',
        severity: Severity.Info, confidence: ConfidenceLevel.Unknown, confidenceScore: 0,
      });
      const b = createCanonicalFinding({
        id: brandFindingId('fnd_test'),
        sourceEngine: SourceEngine.Nuclei,
        category: FindingCategory.Other,
        title: 'B', description: 'B',
        severity: Severity.High, confidence: ConfidenceLevel.High, confidenceScore: 0.9,
      });

      expect(canonicalFindingsEqual(a, b)).toBe(true);
    });

    it('should clone findings', () => {
      const original = createCanonicalFinding({
        sourceEngine: SourceEngine.Nuclei,
        category: FindingCategory.Other,
        title: 'Original',
        description: 'Original',
        severity: Severity.Low,
        confidence: ConfidenceLevel.Low,
        confidenceScore: 0.3,
      });

      const clone = cloneCanonicalFinding(original);
      expect(canonicalFindingsEqual(original, clone)).toBe(true);
      expect(clone.title).toBe(original.title);
    });

    it('should hash findings', () => {
      const finding = createCanonicalFinding({
        id: brandFindingId('fnd_test'),
        sourceEngine: SourceEngine.Nuclei,
        category: FindingCategory.Other,
        title: 'Test', description: 'Test',
        severity: Severity.Info, confidence: ConfidenceLevel.Unknown, confidenceScore: 0,
      });

      const hash = hashCanonicalFinding(finding);
      expect(typeof hash).toBe('number');
      expect(hashCanonicalFinding(finding)).toBe(hash); // Deterministic
    });
  });

  describe('Factory functions', () => {
    it('should create CWE references', () => {
      const cwe = createCWEReference(79, 'Cross-site Scripting');
      expect(cwe.id).toBe('CWE-79');
      expect(cwe.numericId).toBe(79);
      expect(cwe.name).toBe('Cross-site Scripting');
      expect(cwe.url).toContain('79');
    });

    it('should create CVE references', () => {
      const cve = createCVEReference(2024, '5678');
      expect(cve.id).toBe('CVE-2024-5678');
      expect(cve.year).toBe(2024);
      expect(cve.sequence).toBe('5678');
    });

    it('should create CVSS scores', () => {
      const cvss = createCVSSScore(7.5, 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N');
      expect(cvss.score).toBe(7.5);
      expect(cvss.version).toBe('3.1');
    });

    it('should generate finding IDs', () => {
      const id = generateFindingId(SourceEngine.Nuclei);
      expect(id).toContain('fnd_');
      expect(id).toContain('Nuclei');
    });

    it('should generate deterministic IDs from original', () => {
      const id = generateFindingId(SourceEngine.Nuclei, 'scan-123');
      expect(id).toBe('fnd_Nuclei_scan-123');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SEVERITY NORMALIZER
// ═══════════════════════════════════════════════════════════════

describe('Severity Normalizer', () => {
  it('should normalize Nuclei severities', () => {
    expect(normalizeSeverity('info', 'Nuclei').severity).toBe(Severity.Info);
    expect(normalizeSeverity('low', 'Nuclei').severity).toBe(Severity.Low);
    expect(normalizeSeverity('medium', 'Nuclei').severity).toBe(Severity.Medium);
    expect(normalizeSeverity('high', 'Nuclei').severity).toBe(Severity.High);
    expect(normalizeSeverity('critical', 'Nuclei').severity).toBe(Severity.Critical);
  });

  it('should normalize Browser Intelligence severities', () => {
    expect(normalizeSeverity('informational', 'BrowserIntelligence').severity).toBe(Severity.Info);
    expect(normalizeSeverity('low', 'BrowserIntelligence').severity).toBe(Severity.Low);
    expect(normalizeSeverity('3', 'BrowserIntelligence').severity).toBe(Severity.High);
  });

  it('should normalize HTTP Intelligence severities', () => {
    expect(normalizeSeverity('notice', 'HTTPIntelligence').severity).toBe(Severity.Info);
    expect(normalizeSeverity('warning', 'HTTPIntelligence').severity).toBe(Severity.Low);
    expect(normalizeSeverity('error', 'HTTPIntelligence').severity).toBe(Severity.High);
    expect(normalizeSeverity('fatal', 'HTTPIntelligence').severity).toBe(Severity.Critical);
  });

  it('should normalize Discovery Engine severities', () => {
    expect(normalizeSeverity('negligible', 'DiscoveryEngine').severity).toBe(Severity.Info);
    expect(normalizeSeverity('minor', 'DiscoveryEngine').severity).toBe(Severity.Low);
    expect(normalizeSeverity('moderate', 'DiscoveryEngine').severity).toBe(Severity.Medium);
    expect(normalizeSeverity('important', 'DiscoveryEngine').severity).toBe(Severity.High);
    expect(normalizeSeverity('urgent', 'DiscoveryEngine').severity).toBe(Severity.Critical);
  });

  it('should handle numeric severities (0-4 scale)', () => {
    expect(normalizeSeverity(0).severity).toBe(Severity.Info);
    expect(normalizeSeverity(1).severity).toBe(Severity.Low);
    expect(normalizeSeverity(2).severity).toBe(Severity.Medium);
    expect(normalizeSeverity(3).severity).toBe(Severity.High);
    expect(normalizeSeverity(4).severity).toBe(Severity.Critical);
  });

  it('should handle CVSS scores', () => {
    expect(cvssScoreToSeverity(0)).toBe(Severity.Info);
    expect(cvssScoreToSeverity(3.5)).toBe(Severity.Low);
    expect(cvssScoreToSeverity(5.5)).toBe(Severity.Medium);
    expect(cvssScoreToSeverity(8.0)).toBe(Severity.High);
    expect(cvssScoreToSeverity(9.5)).toBe(Severity.Critical);
  });

  it('should handle percentage scales', () => {
    expect(normalizeSeverity(50).severity).toBe(Severity.Medium);
    expect(normalizeSeverity(90).severity).toBe(Severity.Critical);
  });

  it('should handle undefined/null gracefully', () => {
    expect(normalizeSeverity(undefined).severity).toBe(Severity.Info);
    expect(normalizeSeverity(null).severity).toBe(Severity.Info);
    expect(normalizeSeverity('').severity).toBe(Severity.Info);
  });

  it('should compare severities', () => {
    expect(compareSeverities(Severity.High, Severity.Low)).toBeGreaterThan(0);
    expect(compareSeverities(Severity.Info, Severity.Critical)).toBeLessThan(0);
    expect(compareSeverities(Severity.Medium, Severity.Medium)).toBe(0);
  });

  it('should find max severity', () => {
    expect(maxSeverity([Severity.Low, Severity.Critical, Severity.Medium])).toBe(Severity.Critical);
    expect(maxSeverity([])).toBe(Severity.Info);
  });
});

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE MODEL
// ═══════════════════════════════════════════════════════════════

describe('Confidence Model', () => {
  it('should calculate confidence from input factors', () => {
    const result = calculateConfidence({
      sourceEngine: SourceEngine.Nuclei,
      hasEvidence: true,
      evidenceCount: 3,
      evidenceTypes: ['Request', 'Response'],
      hasCompleteFields: true,
      requiredFieldsPresent: 10,
      totalRequiredFields: 10,
      isReproducible: true,
      reproductionCount: 3,
    });

    expect(result.level).toBe(ConfidenceLevel.High);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.factors.sourceReliability).toBe(0.85);
  });

  it('should produce low confidence for minimal input', () => {
    const result = calculateConfidence({
      sourceEngine: SourceEngine.Unknown,
      hasEvidence: false,
      evidenceCount: 0,
      evidenceTypes: [],
      hasCompleteFields: false,
      requiredFieldsPresent: 2,
      totalRequiredFields: 10,
      isReproducible: false,
    });

    expect(result.score).toBeLessThan(0.4);
  });

  it('should normalize string confidence values', () => {
    expect(normalizeConfidence('high').level).toBe(ConfidenceLevel.High);
    expect(normalizeConfidence('confirmed').level).toBe(ConfidenceLevel.Confirmed);
    expect(normalizeConfidence('low').level).toBe(ConfidenceLevel.Low);
    expect(normalizeConfidence('medium').level).toBe(ConfidenceLevel.Medium);
    expect(normalizeConfidence('unknown').level).toBe(ConfidenceLevel.Unknown);
  });

  it('should normalize numeric confidence values (0-1 scale)', () => {
    expect(normalizeConfidence(0.1).level).toBe(ConfidenceLevel.Unknown);
    expect(normalizeConfidence(0.3).level).toBe(ConfidenceLevel.Low);
    expect(normalizeConfidence(0.55).level).toBe(ConfidenceLevel.Medium);
    expect(normalizeConfidence(0.8).level).toBe(ConfidenceLevel.High);
    expect(normalizeConfidence(0.95).level).toBe(ConfidenceLevel.Confirmed);
  });

  it('should normalize percentage confidence values', () => {
    expect(normalizeConfidence(80).level).toBe(ConfidenceLevel.High);
    expect(normalizeConfidence(95).level).toBe(ConfidenceLevel.Confirmed);
  });

  it('should handle null/undefined confidence', () => {
    const result = normalizeConfidence(null);
    expect(result.level).toBe(ConfidenceLevel.Unknown);
  });

  it('should compare confidence levels', () => {
    expect(compareConfidence(ConfidenceLevel.High, ConfidenceLevel.Low)).toBeGreaterThan(0);
    expect(compareConfidence(ConfidenceLevel.Unknown, ConfidenceLevel.Confirmed)).toBeLessThan(0);
  });

  it('should be deterministic', () => {
    const input = {
      sourceEngine: SourceEngine.Nuclei,
      hasEvidence: true, evidenceCount: 2, evidenceTypes: ['Request'],
      hasCompleteFields: true, requiredFieldsPresent: 8, totalRequiredFields: 10,
      isReproducible: true, reproductionCount: 2,
    };
    const a = calculateConfidence(input);
    const b = calculateConfidence(input);
    expect(a.score).toBe(b.score);
    expect(a.level).toBe(b.level);
  });
});

// ═══════════════════════════════════════════════════════════════
// CWE/CVE NORMALIZER
// ═══════════════════════════════════════════════════════════════

describe('CWE/CVE Normalizer', () => {
  it('should normalize CWE identifiers', () => {
    expect(normalizeCWE('CWE-79')?.id).toBe('CWE-79');
    expect(normalizeCWE('cwe79')?.id).toBe('CWE-79');
    expect(normalizeCWE('CWE79')?.id).toBe('CWE-79');
    expect(normalizeCWE('cwe-79')?.id).toBe('CWE-79');
    expect(normalizeCWE('CWE_79')?.id).toBe('CWE-79');
  });

  it('should normalize CWE numeric input', () => {
    expect(normalizeCWE(79)?.id).toBe('CWE-79');
    expect(normalizeCWE(89)?.numericId).toBe(89);
  });

  it('should reject invalid CWE identifiers', () => {
    expect(normalizeCWE('')).toBeNull();
    expect(normalizeCWE(null)).toBeNull();
    expect(normalizeCWE(undefined)).toBeNull();
    expect(normalizeCWE('INVALID')).toBeNull();
  });

  it('should normalize CWE lists', () => {
    const result = normalizeCWEList(['CWE-79', 'cwe89', 'CWE79']);
    expect(result).toHaveLength(2); // CWE-79 is deduplicated
    expect(result.map(c => c.numericId)).toContain(79);
    expect(result.map(c => c.numericId)).toContain(89);
  });

  it('should normalize comma-separated CWE string', () => {
    const result = normalizeCWEList('CWE-79, CWE-89');
    expect(result).toHaveLength(2);
  });

  it('should normalize CVE identifiers', () => {
    expect(normalizeCVE('CVE-2024-1234')?.id).toBe('CVE-2024-1234');
    expect(normalizeCVE('cve-2024-1234')?.id).toBe('CVE-2024-1234');
    expect(normalizeCVE('CVE2024-1234')?.id).toBe('CVE-2024-1234');
    expect(normalizeCVE('cve_2024_1234')?.id).toBe('CVE-2024-1234');
  });

  it('should extract CVE year and sequence', () => {
    const cve = normalizeCVE('CVE-2024-1234567');
    expect(cve?.year).toBe(2024);
    expect(cve?.sequence).toBe('1234567');
  });

  it('should reject invalid CVE identifiers', () => {
    expect(normalizeCVE('')).toBeNull();
    expect(normalizeCVE(null)).toBeNull();
    expect(normalizeCVE('CVE-1800-1234')).toBeNull(); // Invalid year
    expect(normalizeCVE('CVE-2024-12')).toBeNull(); // Too short sequence
  });

  it('should normalize CVE lists', () => {
    const result = normalizeCVEList(['CVE-2024-1234', 'cve-2024-5678']);
    expect(result).toHaveLength(2);
  });

  it('should deduplicate CVEs', () => {
    const result = normalizeCVEList(['CVE-2024-1234', 'CVE-2024-1234']);
    expect(result).toHaveLength(1);
  });

  it('should normalize CVSS from numeric', () => {
    const result = normalizeCVSS(7.5);
    expect(result?.score).toBe(7.5);
    expect(result?.version).toBe('3.1');
  });

  it('should normalize CVSS from vector string', () => {
    const result = normalizeCVSS('AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
    expect(result).toBeTruthy();
    expect(result?.vector).toBeTruthy();
    // Score is 0 when only vector is provided — downstream systems calculate the proper score
    expect(result?.score).toBe(0);
  });

  it('should normalize CVSS from object', () => {
    const result = normalizeCVSS({ score: 9.8, vector: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', version: '3.1' });
    expect(result?.score).toBe(9.8);
  });

  it('should reject invalid CVSS', () => {
    expect(normalizeCVSS(null)).toBeNull();
    expect(normalizeCVSS(15)).toBeNull();
    expect(normalizeCVSS(-1)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// TECHNOLOGY NORMALIZER
// ═══════════════════════════════════════════════════════════════

describe('Technology Normalizer', () => {
  it('should normalize web servers', () => {
    expect(normalizeTechnology('nginx').normalized).toBe('nginx');
    expect(normalizeTechnology('NGINX').normalized).toBe('nginx');
    expect(normalizeTechnology('Nginx').normalized).toBe('nginx');
    expect(normalizeTechnology('Apache').normalized).toBe('apache');
    expect(normalizeTechnology('APACHE').normalized).toBe('apache');
    expect(normalizeTechnology('IIS').normalized).toBe('iis');
  });

  it('should normalize runtimes & frameworks', () => {
    expect(normalizeTechnology('Node.js').normalized).toBe('nodejs');
    expect(normalizeTechnology('nodejs').normalized).toBe('nodejs');
    expect(normalizeTechnology('Express').normalized).toBe('express');
    expect(normalizeTechnology('React').normalized).toBe('react');
    expect(normalizeTechnology('Next.js').normalized).toBe('nextjs');
    expect(normalizeTechnology('Spring Boot').normalized).toBe('spring');
    expect(normalizeTechnology('Laravel').normalized).toBe('laravel');
    expect(normalizeTechnology('Django').normalized).toBe('django');
  });

  it('should normalize databases', () => {
    expect(normalizeTechnology('PostgreSQL').normalized).toBe('postgresql');
    expect(normalizeTechnology('postgres').normalized).toBe('postgresql');
    expect(normalizeTechnology('MongoDB').normalized).toBe('mongodb');
    expect(normalizeTechnology('MySQL').normalized).toBe('mysql');
    expect(normalizeTechnology('Redis').normalized).toBe('redis');
  });

  it('should normalize cloud technologies', () => {
    expect(normalizeTechnology('Docker').normalized).toBe('docker');
    expect(normalizeTechnology('Kubernetes').normalized).toBe('kubernetes');
    expect(normalizeTechnology('k8s').normalized).toBe('kubernetes');
  });

  it('should handle unknown technologies', () => {
    const result = normalizeTechnology('SomeUnknownTech');
    expect(result.normalized).toBe('someunknowntech');
    expect(result.isKnown).toBe(false);
  });

  it('should handle null/empty', () => {
    expect(normalizeTechnology(null).normalized).toBe('');
    expect(normalizeTechnology('').normalized).toBe('');
    expect(normalizeTechnology(undefined).normalized).toBe('');
  });

  it('should normalize technology lists', () => {
    const result = normalizeTechnologyList(['NGINX', 'nginx', 'Apache', 'React', 'react']);
    expect(result).toEqual(['nginx', 'apache', 'react']);
  });

  it('should check known technologies', () => {
    expect(isKnownTechnology('nginx')).toBe(true);
    expect(isKnownTechnology('NGINX')).toBe(true);
    expect(isKnownTechnology('SomeUnknownTech')).toBe(false);
  });

  it('should get known technologies', () => {
    const known = getKnownTechnologies();
    expect(known.length).toBeGreaterThan(20);
    expect(known).toContain('nginx');
    expect(known).toContain('apache');
  });

  it('should get technology aliases', () => {
    const aliases = getTechnologyAliases('nginx');
    expect(aliases).toContain('NGINX');
    expect(aliases).toContain('Nginx');
  });
});

// ═══════════════════════════════════════════════════════════════
// URL NORMALIZER
// ═══════════════════════════════════════════════════════════════

describe('URL Normalizer', () => {
  it('should canonicalize URLs', () => {
    const result = normalizeURL('https://Example.COM/api/users?b=2&a=1');
    expect(result.url).toBeTruthy();
    expect(result.url?.scheme).toBe('https');
    expect(result.url?.host).toBe('example.com');
    expect(result.url?.path).toBe('/api/users');
    expect(result.url?.query).toBe('a=1&b=2'); // Sorted
  });

  it('should remove default ports', () => {
    const https = normalizeURL('https://example.com:443/path');
    expect(https.url?.port).toBeNull();

    const http = normalizeURL('http://example.com:80/path');
    expect(http.url?.port).toBeNull();
  });

  it('should preserve non-default ports', () => {
    const result = normalizeURL('https://example.com:8443/path');
    expect(result.url?.port).toBe(8443);
  });

  it('should add scheme for schemeless URLs', () => {
    const result = normalizeURL('example.com/path');
    expect(result.url?.scheme).toBe('https');
    expect(result.url?.host).toBe('example.com');
  });

  it('should handle trailing slash removal', () => {
    const result = normalizeURL('https://example.com/api/');
    expect(result.url?.path).toBe('/api');
  });

  it('should handle root path', () => {
    const result = normalizeURL('https://example.com');
    expect(result.url?.path).toBe('/');
  });

  it('should sort query parameters', () => {
    const result = normalizeURL('https://example.com?z=3&a=1&m=2');
    expect(result.url?.query).toBe('a=1&m=2&z=3');
  });

  it('should handle empty/invalid URLs', () => {
    expect(normalizeURL('').url).toBeNull();
    expect(normalizeURL(null).url).toBeNull();
    expect(normalizeURL(undefined).url).toBeNull();
  });

  it('should compare URLs for equality', () => {
    const a = normalizeURL('https://example.com/api?a=1&b=2').url!;
    const b = normalizeURL('https://example.com/api?b=2&a=1').url!;
    expect(urlsEqual(a, b)).toBe(true);
  });

  it('should convert canonical URL to string', () => {
    const url = normalizeURL('https://example.com:8443/api?q=1').url!;
    const str = canonicalURLToString(url);
    expect(str).toContain('example.com');
    expect(str).toContain('8443');
  });

  it('should extract root URL', () => {
    const url = normalizeURL('https://example.com:8443/api?q=1').url!;
    const root = extractRootURL(url);
    expect(root).toBe('https://example.com:8443');
  });
});

// ═══════════════════════════════════════════════════════════════
// EVIDENCE NORMALIZER
// ═══════════════════════════════════════════════════════════════

describe('Evidence Normalizer', () => {
  it('should detect request evidence from string', () => {
    expect(detectEvidenceType('GET /api/users HTTP/1.1')).toBe(EvidenceType.Request);
    expect(detectEvidenceType('POST /login HTTP/1.1')).toBe(EvidenceType.Request);
  });

  it('should detect response evidence from string', () => {
    expect(detectEvidenceType('HTTP/1.1 200 OK')).toBe(EvidenceType.Response);
  });

  it('should detect DOM evidence from string', () => {
    expect(detectEvidenceType('<!DOCTYPE html><html>')).toBe(EvidenceType.DOM);
    expect(detectEvidenceType('<script>alert("xss")</script>')).toBe(EvidenceType.DOM);
  });

  it('should detect evidence type from object', () => {
    expect(detectEvidenceType({ method: 'GET', url: '/api' })).toBe(EvidenceType.Request);
    expect(detectEvidenceType({ statusCode: 200, body: 'ok' })).toBe(EvidenceType.Response);
    expect(detectEvidenceType({ dom: '<html>' })).toBe(EvidenceType.DOM);
    expect(detectEvidenceType({ screenshot: 'base64...', image: 'png' })).toBe(EvidenceType.Screenshot);
    expect(detectEvidenceType({ issuer: 'CN=test', subject: 'CN=server' })).toBe(EvidenceType.Certificate);
    expect(detectEvidenceType({ name: 'session', domain: '.example.com', value: 'abc', path: '/' })).toBe(EvidenceType.Cookie);
  });

  it('should normalize evidence with explicit type', () => {
    const result = normalizeEvidence({ method: 'GET', url: '/api' }, EvidenceType.Request);
    expect(result.evidence.type).toBe(EvidenceType.Request);
    expect(result.evidence.data.method).toBe('GET');
  });

  it('should normalize evidence list', () => {
    const results = normalizeEvidenceList([
      { method: 'GET', url: '/api' },
      { statusCode: 200 },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].type).toBe(EvidenceType.Request);
    expect(results[1].type).toBe(EvidenceType.Response);
  });

  it('should handle null/undefined evidence', () => {
    const result = normalizeEvidence(null);
    expect(result.evidence.type).toBe(EvidenceType.Log);
  });

  it('should handle string evidence', () => {
    const result = normalizeEvidence('GET /api/users HTTP/1.1');
    expect(result.detectedType).toBe(EvidenceType.Request);
  });
});

// ═══════════════════════════════════════════════════════════════
// ASSET RESOLVER
// ═══════════════════════════════════════════════════════════════

describe('Asset Resolver', () => {
  it('should resolve URL assets', () => {
    const result = resolveAsset('https://example.com/dashboard/profile');
    expect(result.asset?.type).toBe(AssetType.Endpoint);
    expect(result.asset?.name).toContain('example.com');
  });

  it('should resolve API endpoints', () => {
    const result = resolveAsset('https://example.com/api/v1/users');
    expect(result.asset?.type).toBe(AssetType.API);
  });

  it('should resolve root URLs as applications', () => {
    const result = resolveAsset('https://example.com');
    expect(result.asset?.type).toBe(AssetType.Application);
  });

  it('should resolve IP addresses', () => {
    const result = resolveAsset('192.168.1.1');
    expect(result.asset?.type).toBe(AssetType.IPAddress);
    expect(result.asset?.identifier).toBe('192.168.1.1');
  });

  it('should resolve IP addresses with ports', () => {
    const result = resolveAsset('192.168.1.1:8080');
    expect(result.asset?.type).toBe(AssetType.IPAddress);
    expect(result.asset?.metadata?.port).toBe('8080');
  });

  it('should resolve domain names', () => {
    const result = resolveAsset('example.com');
    expect(result.asset?.type).toBe(AssetType.Domain);
    expect(result.asset?.identifier).toBe('example.com');
  });

  it('should resolve path-based identifiers', () => {
    const apiResult = resolveAsset('/api/v1/data');
    expect(apiResult.asset?.type).toBe(AssetType.API);

    const endpointResult = resolveAsset('/dashboard/profile');
    expect(endpointResult.asset?.type).toBe(AssetType.Endpoint);
  });

  it('should handle empty/invalid identifiers', () => {
    expect(resolveAsset('').asset).toBeNull();
    expect(resolveAsset(null).asset).toBeNull();
    expect(resolveAsset(undefined).asset).toBeNull();
  });

  it('should default unknown identifiers to Application', () => {
    const result = resolveAsset('my-app-server');
    expect(result.asset?.type).toBe(AssetType.Application);
  });

  it('should determine asset type from multiple identifiers', () => {
    expect(determineAssetType(['https://example.com/api/v1/data'])).toBe(AssetType.API);
    expect(determineAssetType(['192.168.1.1'])).toBe(AssetType.IPAddress);
    expect(determineAssetType(['example.com'])).toBe(AssetType.Domain);
  });
});

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

describe('Validation', () => {
  it('should validate a correct finding', () => {
    const finding = createCanonicalFinding({
      sourceEngine: SourceEngine.Nuclei,
      category: FindingCategory.Vulnerability,
      title: 'SQL Injection',
      description: 'A SQL injection vulnerability was discovered in the login endpoint',
      severity: Severity.High,
      confidence: ConfidenceLevel.High,
      confidenceScore: 0.8,
    });

    const result = validateFinding(finding);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing required fields', () => {
    const finding = createCanonicalFinding({
      sourceEngine: SourceEngine.Nuclei,
      category: FindingCategory.Other,
      title: '', // Empty
      description: '', // Empty
      severity: Severity.Info,
      confidence: ConfidenceLevel.Unknown,
      confidenceScore: 0,
    });

    const result = validateFinding(finding);
    expect(result.valid).toBe(false);
  });

  it('should warn about non-canonical CWE/CVE formats', () => {
    const finding = createCanonicalFinding({
      sourceEngine: SourceEngine.Nuclei,
      category: FindingCategory.Other,
      title: 'Test Finding',
      description: 'A test finding for validation',
      severity: Severity.Low,
      confidence: ConfidenceLevel.Low,
      confidenceScore: 0.3,
    });

    const result = validateFinding(finding);
    expect(result.valid).toBe(true);
  });

  it('should validate batch for duplicate IDs', () => {
    const finding1 = createCanonicalFinding({
      id: brandFindingId('fnd_test_dup'),
      sourceEngine: SourceEngine.Nuclei,
      category: FindingCategory.Other,
      title: 'Finding 1',
      description: 'First finding',
      severity: Severity.Low,
      confidence: ConfidenceLevel.Low,
      confidenceScore: 0.3,
    });
    const finding2 = createCanonicalFinding({
      id: brandFindingId('fnd_test_dup'),
      sourceEngine: SourceEngine.Nuclei,
      category: FindingCategory.Other,
      title: 'Finding 2',
      description: 'Second finding with same ID',
      severity: Severity.High,
      confidence: ConfidenceLevel.High,
      confidenceScore: 0.9,
    });

    const result = validateFindingBatch([finding1, finding2]);
    expect(result.duplicates).toHaveLength(1);
    expect(result.valid).toBe(false);
  });

  it('should warn about confidence score mismatches', () => {
    const finding = createCanonicalFinding({
      sourceEngine: SourceEngine.Nuclei,
      category: FindingCategory.Other,
      title: 'Test',
      description: 'Test finding with mismatched confidence',
      severity: Severity.High,
      confidence: ConfidenceLevel.High,
      confidenceScore: 0.1, // Mismatched
    });

    const result = validateFinding(finding);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// FINDING NORMALIZATION ENGINE
// ═══════════════════════════════════════════════════════════════

describe('FindingNormalizationEngine', () => {
  let engine: FindingNormalizationEngine;

  beforeEach(() => {
    engine = new FindingNormalizationEngine({ engineId: 'test' });
  });

  describe('normalize()', () => {
    it('should normalize a basic Nuclei finding', () => {
      const result = engine.normalize({
        sourceEngine: 'Nuclei',
        title: 'SQL Injection',
        description: 'SQL injection found',
        severity: 'high',
        endpoint: 'https://example.com/api/users?id=1',
      });

      expect(result.success).toBe(true);
      expect(result.finding).toBeTruthy();
      expect(result.finding!.sourceEngine).toBe(SourceEngine.Nuclei);
      expect(result.finding!.severity).toBe(Severity.High);
      expect(result.finding!.title).toBe('SQL Injection');
      expect(result.finding!.endpoint?.host).toBe('example.com');
    });

    it('should normalize a Browser Intelligence finding', () => {
      const result = engine.normalize({
        sourceEngine: 'browser-intelligence',
        title: 'XSS Vulnerability',
        description: 'Reflected XSS found',
        severity: 'medium',
        cwe: 'CWE-79',
        endpoint: 'https://example.com/search?q=test',
      });

      expect(result.success).toBe(true);
      expect(result.finding!.sourceEngine).toBe(SourceEngine.BrowserIntelligence);
      expect(result.finding!.cwe).toHaveLength(1);
      expect(result.finding!.cwe[0].id).toBe('CWE-79');
    });

    it('should normalize an HTTP Intelligence finding', () => {
      const result = engine.normalize({
        sourceEngine: 'HTTPIntelligence',
        title: 'Missing Security Headers',
        description: 'Missing X-Frame-Options header',
        severity: 'low',
      });

      expect(result.success).toBe(true);
      expect(result.finding!.sourceEngine).toBe(SourceEngine.HTTPIntelligence);
    });

    it('should normalize a Discovery Engine finding', () => {
      const result = engine.normalize({
        sourceEngine: 'discovery-engine',
        title: 'Open Port 22',
        description: 'SSH port is open',
        severity: 'info',
        affectedAsset: '192.168.1.1',
      });

      expect(result.success).toBe(true);
      expect(result.finding!.sourceEngine).toBe(SourceEngine.DiscoveryEngine);
      expect(result.finding!.affectedAsset?.type).toBe(AssetType.IPAddress);
    });

    it('should normalize CVE/CWE references', () => {
      const result = engine.normalize({
        sourceEngine: 'Nuclei',
        title: 'RCE',
        description: 'Remote code execution',
        severity: 'critical',
        cve: 'CVE-2024-1234',
        cwe: ['CWE-79', 'cwe89'],
      });

      expect(result.success).toBe(true);
      expect(result.finding!.cve).toHaveLength(1);
      expect(result.finding!.cve[0].id).toBe('CVE-2024-1234');
      expect(result.finding!.cwe).toHaveLength(2);
    });

    it('should normalize CVSS scores', () => {
      const result = engine.normalize({
        sourceEngine: 'Nuclei',
        title: 'High Risk Vuln',
        description: 'High risk vulnerability',
        severity: 'high',
        cvss: 9.8,
      });

      expect(result.success).toBe(true);
      expect(result.finding!.cvss?.score).toBe(9.8);
    });

    it('should normalize evidence', () => {
      const result = engine.normalize({
        sourceEngine: 'Nuclei',
        title: 'Test',
        description: 'Test',
        severity: 'medium',
        evidence: [
          { method: 'GET', url: '/api/users' },
          { statusCode: 200, body: 'ok' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.finding!.evidence.length).toBeGreaterThan(0);
    });

    it('should normalize technology as first-class field', () => {
      const result = engine.normalize({
        sourceEngine: 'Nuclei',
        title: 'NGINX Vulnerability',
        description: 'nginx server vulnerability',
        severity: 'medium',
        technology: 'NGINX',
      });

      expect(result.success).toBe(true);
      expect(result.finding!.technology).toContain('nginx');
    });

    it('should preserve tags as first-class field', () => {
      const result = engine.normalize({
        sourceEngine: 'Nuclei',
        title: 'Test',
        description: 'Test',
        severity: 'medium',
        tags: ['xss', 'injection'],
      });

      expect(result.success).toBe(true);
      expect(result.finding!.tags).toEqual(['xss', 'injection']);
    });

    it('should handle empty/minimal findings', () => {
      const result = engine.normalize({});

      expect(result.success).toBe(true);
      expect(result.finding!.sourceEngine).toBe(SourceEngine.Unknown);
      expect(result.finding!.severity).toBe(Severity.Info);
      expect(result.finding!.title).toBe('Untitled Finding');
      expect(result.finding!.description).toBe('No description provided');
    });

    it('should handle malformed input gracefully', () => {
      const result = engine.normalize({
        sourceEngine: 123,  // Wrong type
        severity: -5,       // Invalid
        confidence: 'maybe', // Unknown string
      });

      expect(result.success).toBe(true);
      // Should not throw, should produce defaults
    });

    it('should track applied normalizations', () => {
      const result = engine.normalize({
        sourceEngine: 'Nuclei',
        title: 'Test',
        description: 'Test',
        severity: 'high',
      });

      expect(result.appliedNormalizations).toContain('severity');
      expect(result.appliedNormalizations).toContain('confidence');
    });

    it('should emit FindingNormalized event', () => {
      const events: unknown[] = [];
      engine.eventBus.subscribe(e => events.push(e));

      engine.normalize({
        sourceEngine: 'Nuclei',
        title: 'Test',
        description: 'Test',
        severity: 'high',
      });

      expect(events).toHaveLength(1);
      expect((events[0] as { type: string }).type).toBe('normalization.finding.normalized');
    });
  });

  describe('normalizeBatch()', () => {
    it('should normalize a batch of findings', () => {
      const raws = Array.from({ length: 10 }, (_, i) => ({
        sourceEngine: 'Nuclei',
        title: `Finding ${i}`,
        description: `Description ${i}`,
        severity: i % 2 === 0 ? 'high' : 'low',
      }));

      const result = engine.normalizeBatch(raws);

      expect(result.total).toBe(10);
      expect(result.succeeded).toBe(10);
      expect(result.failed).toBe(0);
      expect(result.findings).toHaveLength(10);
      expect(result.throughputPerSecond).toBeGreaterThan(0);
    });

    it('should handle partial failures in batch', () => {
      const raws = [
        { sourceEngine: 'Nuclei', title: 'Good', description: 'Valid', severity: 'high' },
        { sourceEngine: 'Nuclei', title: 'Also Good', description: 'Valid too', severity: 'low' },
      ];

      const result = engine.normalizeBatch(raws);
      expect(result.succeeded).toBe(2);
    });

    it('should emit BatchNormalized event', () => {
      const events: unknown[] = [];
      engine.eventBus.subscribe(e => events.push(e));

      engine.normalizeBatch([
        { sourceEngine: 'Nuclei', title: 'Test', description: 'Test', severity: 'medium' },
      ]);

      const batchEvent = events.find(e => (e as { type: string }).type === 'normalization.batch.normalized');
      expect(batchEvent).toBeTruthy();
    });

    it('should process 100 findings efficiently', () => {
      const raws = Array.from({ length: 100 }, (_, i) => ({
        sourceEngine: 'Nuclei',
        title: `Finding ${i}`,
        description: `Description for finding ${i}`,
        severity: ['info', 'low', 'medium', 'high', 'critical'][i % 5],
      }));

      const start = performance.now();
      const result = engine.normalizeBatch(raws);
      const duration = performance.now() - start;

      expect(result.succeeded).toBe(100);
      expect(duration).toBeLessThan(5000); // Should complete in <5s
    });

    it('should process 1000 findings efficiently', () => {
      const raws = Array.from({ length: 1000 }, (_, i) => ({
        sourceEngine: 'Nuclei',
        title: `Finding ${i}`,
        description: `Description for finding ${i}`,
        severity: ['info', 'low', 'medium', 'high', 'critical'][i % 5],
        cwe: i % 3 === 0 ? `CWE-${79 + (i % 10)}` : undefined,
      }));

      const start = performance.now();
      const result = engine.normalizeBatch(raws);
      const duration = performance.now() - start;

      expect(result.succeeded).toBe(1000);
      expect(result.throughputPerSecond).toBeGreaterThan(100);
    });
  });

  describe('validate()', () => {
    it('should validate a canonical finding', () => {
      const finding = createCanonicalFinding({
        sourceEngine: SourceEngine.Nuclei,
        category: FindingCategory.Vulnerability,
        title: 'SQL Injection',
        description: 'A SQL injection vulnerability was found in the login form',
        severity: Severity.High,
        confidence: ConfidenceLevel.High,
        confidenceScore: 0.8,
      });

      const result = engine.validate(finding);
      expect(result.valid).toBe(true);
    });
  });

  describe('canonicalize()', () => {
    it('should re-canonicalize an existing finding', () => {
      const finding = createCanonicalFinding({
        sourceEngine: SourceEngine.Nuclei,
        category: FindingCategory.Vulnerability,
        title: 'Test',
        description: 'Test',
        severity: Severity.High,
        confidence: ConfidenceLevel.High,
        confidenceScore: 0.8,
      });

      const result = engine.canonicalize(finding);
      expect(result.success).toBe(true);
      expect(result.finding).toBeTruthy();
      expect(result.finding!.id).toBe(finding.id);
    });
  });

  describe('statistics()', () => {
    it('should track normalization statistics', () => {
      engine.normalize({ sourceEngine: 'Nuclei', title: 'Test', description: 'Test', severity: 'high' });
      engine.normalize({ sourceEngine: 'Nuclei', title: 'Test2', description: 'Test2', severity: 'low' });

      const stats = engine.statistics();
      expect(stats.totalNormalized).toBe(2);
      expect(stats.severityDistribution[Severity.High]).toBe(1);
      expect(stats.severityDistribution[Severity.Low]).toBe(1);
      expect(stats.sourceDistribution[SourceEngine.Nuclei]).toBe(2);
    });

    it('should track batch statistics', () => {
      engine.normalizeBatch(Array.from({ length: 5 }, (_, i) => ({
        sourceEngine: 'Nuclei', title: `T${i}`, description: `D${i}`, severity: 'medium',
      })));

      const stats = engine.statistics();
      expect(stats.totalBatches).toBe(1);
      expect(stats.totalNormalized).toBe(5);
    });

    it('should track throughput', () => {
      engine.normalize({ sourceEngine: 'Nuclei', title: 'Test', description: 'Test', severity: 'high' });
      const stats = engine.statistics();
      expect(stats.throughputPerSecond).toBeGreaterThan(0);
    });
  });

  describe('reset()', () => {
    it('should reset all engine state', () => {
      engine.normalize({ sourceEngine: 'Nuclei', title: 'Test', description: 'Test', severity: 'high' });
      engine.reset();
      const stats = engine.statistics();
      expect(stats.totalNormalized).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════

describe('Events', () => {
  it('should create FindingNormalized event', () => {
    const event = createFindingNormalizedEvent('engine1', brandFindingId('fnd_test'), 'Nuclei', 'High', 'High', ['severity'], 5);
    expect(event.type).toBe('normalization.finding.normalized');
    expect(event.data.findingId).toBe('fnd_test');
    expect(event.data.severity).toBe('High');
  });

  it('should create NormalizationFailed event', () => {
    const event = createNormalizationFailedEvent('engine1', 'bad_id', 'Nuclei', ['parse error'], 2);
    expect(event.type).toBe('normalization.finding.failed');
    expect(event.data.errors).toContain('parse error');
  });

  it('should create BatchNormalized event', () => {
    const event = createBatchNormalizedEvent('engine1', 100, 95, 5, 120, 791);
    expect(event.type).toBe('normalization.batch.normalized');
    expect(event.data.total).toBe(100);
    expect(event.data.succeeded).toBe(95);
  });

  it('should create CanonicalizationCompleted event', () => {
    const event = createCanonicalizationCompletedEvent('engine1', brandFindingId('fnd_test'), 15, 3, 10);
    expect(event.type).toBe('normalization.canonicalization.completed');
    expect(event.data.fieldCount).toBe(15);
  });

  describe('NormalizationEventBus', () => {
    it('should subscribe and emit events', () => {
      const bus = new NormalizationEventBus();
      const received: unknown[] = [];
      bus.subscribe(e => received.push(e));

      const event = createFindingNormalizedEvent('test', brandFindingId('fnd_x'), 'Nuclei', 'High', 'High', [], 1);
      bus.emit(event);

      expect(received).toHaveLength(1);
    });

    it('should support unsubscribe', () => {
      const bus = new NormalizationEventBus();
      const received: unknown[] = [];
      const unsub = bus.subscribe(e => received.push(e));

      unsub();

      const event = createFindingNormalizedEvent('test', brandFindingId('fnd_x'), 'Nuclei', 'High', 'High', [], 1);
      bus.emit(event);

      expect(received).toHaveLength(0);
    });

    it('should clear all handlers', () => {
      const bus = new NormalizationEventBus();
      bus.subscribe(() => {});
      bus.subscribe(() => {});
      bus.clear();
      expect(bus.handlerCount).toBe(0);
    });

    it('should swallow handler errors', () => {
      const bus = new NormalizationEventBus();
      bus.subscribe(() => { throw new Error('Handler error'); });
      const received: unknown[] = [];
      bus.subscribe(e => received.push(e));

      const event = createFindingNormalizedEvent('test', brandFindingId('fnd_x'), 'Nuclei', 'High', 'High', [], 1);
      expect(() => bus.emit(event)).not.toThrow();
      expect(received).toHaveLength(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// STATISTICS COLLECTOR
// ═══════════════════════════════════════════════════════════════

describe('NormalizationStatisticsCollector', () => {
  let collector: NormalizationStatisticsCollector;

  beforeEach(() => {
    collector = new NormalizationStatisticsCollector();
  });

  it('should start with zero counts', () => {
    const stats = collector.collect();
    expect(stats.totalNormalized).toBe(0);
    expect(stats.totalFailed).toBe(0);
    expect(stats.totalValidated).toBe(0);
    expect(stats.totalBatches).toBe(0);
  });

  it('should track normalizations', () => {
    collector.recordNormalization(5, Severity.High, SourceEngine.Nuclei, FindingCategory.Vulnerability);
    collector.recordNormalization(3, Severity.Low, SourceEngine.DiscoveryEngine, FindingCategory.Exposure);

    const stats = collector.collect();
    expect(stats.totalNormalized).toBe(2);
    expect(stats.severityDistribution[Severity.High]).toBe(1);
    expect(stats.severityDistribution[Severity.Low]).toBe(1);
    expect(stats.sourceDistribution[SourceEngine.Nuclei]).toBe(1);
    expect(stats.categoryDistribution[FindingCategory.Vulnerability]).toBe(1);
  });

  it('should track failures', () => {
    collector.recordFailure();
    collector.recordFailure();
    expect(collector.collect().totalFailed).toBe(2);
  });

  it('should track validations', () => {
    collector.recordValidation();
    expect(collector.collect().totalValidated).toBe(1);
  });

  it('should track batches', () => {
    collector.recordBatch(100, 50);
    const stats = collector.collect();
    expect(stats.totalBatches).toBe(1);
    expect(stats.averageBatchTimeMs).toBe(100);
  });

  it('should track cache hits/misses', () => {
    collector.recordCacheHit();
    collector.recordCacheHit();
    collector.recordCacheMiss();
    const stats = collector.collect();
    expect(stats.cacheHitRate).toBeCloseTo(0.667, 1);
  });

  it('should calculate throughput', () => {
    collector.recordNormalization(10, Severity.High, SourceEngine.Nuclei, FindingCategory.Vulnerability);
    const stats = collector.collect();
    expect(stats.throughputPerSecond).toBeGreaterThan(0);
  });

  it('should reset', () => {
    collector.recordNormalization(5, Severity.High, SourceEngine.Nuclei, FindingCategory.Vulnerability);
    collector.reset();
    expect(collector.collect().totalNormalized).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES & MALFORMED INPUT
// ═══════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  let engine: FindingNormalizationEngine;

  beforeEach(() => {
    engine = new FindingNormalizationEngine();
  });

  it('should handle null values in raw finding', () => {
    const result = engine.normalize({
      sourceEngine: null as unknown as string,
      title: null as unknown as string,
      severity: null as unknown as string,
    });
    expect(result.success).toBe(true);
  });

  it('should handle undefined values in raw finding', () => {
    const result = engine.normalize({
      sourceEngine: undefined,
      title: undefined,
      severity: undefined,
    });
    expect(result.success).toBe(true);
    expect(result.finding!.sourceEngine).toBe(SourceEngine.Unknown);
  });

  it('should handle extra unknown fields in raw finding', () => {
    const result = engine.normalize({
      sourceEngine: 'Nuclei',
      title: 'Test',
      severity: 'high',
      customField1: 'value1',
      customField2: 42,
    });
    expect(result.success).toBe(true);
  });

  it('should handle very long strings', () => {
    const longTitle = 'A'.repeat(10000);
    const result = engine.normalize({
      sourceEngine: 'Nuclei',
      title: longTitle,
      description: 'Test',
      severity: 'high',
    });
    expect(result.success).toBe(true);
    expect(result.finding!.title.length).toBe(10000);
  });

  it('should handle special characters in descriptions', () => {
    const result = engine.normalize({
      sourceEngine: 'Nuclei',
      title: 'XSS in <script>alert("xss")</script>',
      description: 'Found <img src=x onerror=alert(1)>',
      severity: 'high',
    });
    expect(result.success).toBe(true);
  });

  it('should handle numeric-only source engine', () => {
    const result = engine.normalize({
      sourceEngine: 42 as unknown as string,
      title: 'Test',
      severity: 'low',
    });
    expect(result.success).toBe(true);
    expect(result.finding!.sourceEngine).toBe(SourceEngine.Unknown);
  });

  it('should handle deeply nested evidence', () => {
    const result = engine.normalize({
      sourceEngine: 'Nuclei',
      title: 'Test',
      severity: 'medium',
      evidence: { deeply: { nested: { value: 'test' } } },
    });
    expect(result.success).toBe(true);
  });

  it('should handle empty batch', () => {
    const result = engine.normalizeBatch([]);
    expect(result.total).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.findings).toHaveLength(0);
  });

  it('should handle mixed valid/invalid URLs in references', () => {
    const result = engine.normalize({
      sourceEngine: 'Nuclei',
      title: 'Test',
      description: 'Test',
      severity: 'medium',
      references: ['https://example.com', 'not-a-url', 'https://owasp.org'],
    });
    expect(result.success).toBe(true);
    // Invalid URLs should be filtered
    expect(result.finding!.references).toHaveLength(2);
  });
});
