/**
 * Security Intelligence Correlation Engine — Duplicate Detection
 *
 * Detects duplicate findings at four levels:
 * - ExactDuplicate: Same finding from different sources (≥0.95 similarity)
 * - SemanticDuplicate: Same vulnerability described differently (≥0.85)
 * - SimilarFinding: Related findings with significant overlap (≥0.70)
 * - RelatedFinding: Loosely related findings (≥0.30)
 *
 * Uses content-based hashing for exact detection and
 * multi-factor scoring for semantic similarity.
 */

import type {
  CorrelationFindingInput, CorrelationEvidence, DuplicateDetection, DuplicateType,
} from '../types/index.ts';
import { DuplicateType as DupType, CorrelationReason } from '../types/index.ts';
import type { FindingId } from '../../normalization/types/index.ts';
import { createCorrelationEvidence, createDuplicateDetection } from '../models/index.ts';

// ─── Duplicate Detection Result ──────────────────────────────

export interface DuplicateDetectionResult {
  readonly duplicates: readonly DuplicateDetection[];
  readonly uniqueFindings: readonly CorrelationFindingInput[];
  readonly statistics: DuplicateDetectionStatistics;
}

export interface DuplicateDetectionStatistics {
  readonly totalExamined: number;
  readonly exactDuplicates: number;
  readonly semanticDuplicates: number;
  readonly similarFindings: number;
  readonly relatedFindings: number;
  readonly uniqueCount: number;
  readonly duplicateRate: number;
}

// ─── Content Fingerprint ─────────────────────────────────────

interface ContentFingerprint {
  readonly findingId: FindingId;
  readonly titleHash: string;
  readonly descriptionHash: string;
  readonly cveSet: ReadonlySet<string>;
  readonly cweSet: ReadonlySet<string>;
  readonly endpointHash: string;
  readonly severity: string;
  readonly category: string;
  readonly combinedHash: string;
}

// ─── Duplicate Detector ──────────────────────────────────────

/**
 * Detects duplicates among a set of findings.
 * Uses content fingerprinting and multi-factor similarity scoring.
 */
export class DuplicateDetector {
  private readonly _exactThreshold: number;
  private readonly _semanticThreshold: number;
  private readonly _similarThreshold: number;
  private readonly _relatedThreshold: number;

  constructor(config: {
    readonly exactThreshold?: number;
    readonly semanticThreshold?: number;
    readonly similarThreshold?: number;
    readonly relatedThreshold?: number;
  } = {}) {
    this._exactThreshold = config.exactThreshold ?? 0.95;
    this._semanticThreshold = config.semanticThreshold ?? 0.85;
    this._similarThreshold = config.similarThreshold ?? 0.70;
    this._relatedThreshold = config.relatedThreshold ?? 0.30;
  }

  /**
   * Detect duplicates among a set of findings.
   * Returns detected duplicates and unique findings.
   */
  detect(findings: readonly CorrelationFindingInput[]): DuplicateDetectionResult {
    const duplicates: DuplicateDetection[] = [];
    const seen = new Map<string, CorrelationFindingInput>();
    const uniqueFindings: CorrelationFindingInput[] = [];
    let exactCount = 0;
    let semanticCount = 0;
    let similarCount = 0;
    let relatedCount = 0;

    for (const finding of findings) {
      const fingerprint = this.computeFingerprint(finding);

      // Check for exact hash match first (O(1))
      const existingByHash = seen.get(fingerprint.combinedHash);
      if (existingByHash) {
        const dup = createDuplicateDetection({
          originalFindingId: existingByHash.id,
          duplicateFindingId: finding.id,
          duplicateType: DupType.ExactDuplicate,
          similarity: 1.0,
          evidence: [createCorrelationEvidence({
            reason: CorrelationReason.SharedEvidence,
            sharedValue: fingerprint.combinedHash,
            sourceField: 'combinedHash',
            targetField: 'combinedHash',
            confidence: 1.0,
          })],
        });
        duplicates.push(dup);
        exactCount++;
        continue;
      }

      // Check for semantic/near duplicates (O(n) but early termination)
      let foundDuplicate = false;
      for (const [, existing] of seen) {
        const similarity = this.computeSimilarity(finding, existing);
        if (similarity >= this._exactThreshold) {
          duplicates.push(createDuplicateDetection({
            originalFindingId: existing.id,
            duplicateFindingId: finding.id,
            duplicateType: DupType.ExactDuplicate,
            similarity,
            evidence: this.computeSimilarityEvidence(finding, existing, similarity),
          }));
          exactCount++;
          foundDuplicate = true;
          break;
        } else if (similarity >= this._semanticThreshold) {
          duplicates.push(createDuplicateDetection({
            originalFindingId: existing.id,
            duplicateFindingId: finding.id,
            duplicateType: DupType.SemanticDuplicate,
            similarity,
            evidence: this.computeSimilarityEvidence(finding, existing, similarity),
          }));
          semanticCount++;
          foundDuplicate = true;
          break;
        } else if (similarity >= this._similarThreshold) {
          duplicates.push(createDuplicateDetection({
            originalFindingId: existing.id,
            duplicateFindingId: finding.id,
            duplicateType: DupType.SimilarFinding,
            similarity,
            evidence: this.computeSimilarityEvidence(finding, existing, similarity),
          }));
          similarCount++;
          foundDuplicate = true;
          break;
        }
      }

      if (!foundDuplicate) {
        seen.set(fingerprint.combinedHash, finding);
        uniqueFindings.push(finding);
      }
    }

    const totalExamined = findings.length;
    return Object.freeze({
      duplicates: Object.freeze(duplicates),
      uniqueFindings: Object.freeze(uniqueFindings),
      statistics: Object.freeze({
        totalExamined,
        exactDuplicates: exactCount,
        semanticDuplicates: semanticCount,
        similarFindings: similarCount,
        relatedFindings: relatedCount,
        uniqueCount: uniqueFindings.length,
        duplicateRate: totalExamined > 0 ? duplicates.length / totalExamined : 0,
      }),
    });
  }

  /**
   * Compute similarity between two findings (0.0–1.0).
   * Uses multi-factor weighted scoring.
   */
  computeSimilarity(a: CorrelationFindingInput, b: CorrelationFindingInput): number {
    let score = 0;
    let totalWeight = 0;

    // Factor 1: Title similarity (weight: 0.30)
    const titleSimilarity = this.stringSimilarity(a.title.toLowerCase(), b.title.toLowerCase());
    score += titleSimilarity * 0.30;
    totalWeight += 0.30;

    // Factor 2: CVE overlap (weight: 0.25)
    if (a.cve.length > 0 || b.cve.length > 0) {
      const cveOverlap = this.setOverlap(a.cve, b.cve);
      score += cveOverlap * 0.25;
      totalWeight += 0.25;
    }

    // Factor 3: CWE overlap (weight: 0.15)
    if (a.cwe.length > 0 || b.cwe.length > 0) {
      const cweOverlap = this.setOverlap(a.cwe, b.cwe);
      score += cweOverlap * 0.15;
      totalWeight += 0.15;
    }

    // Factor 4: Endpoint similarity (weight: 0.15)
    if (a.endpoint && b.endpoint) {
      const endpointSimilarity = this.stringSimilarity(a.endpoint, b.endpoint);
      score += endpointSimilarity * 0.15;
      totalWeight += 0.15;
    }

    // Factor 5: Severity match (weight: 0.05)
    if (a.severity === b.severity) {
      score += 0.05;
    }
    totalWeight += 0.05;

    // Factor 6: Category match (weight: 0.10)
    if (a.category === b.category) {
      score += 0.10;
    }
    totalWeight += 0.10;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /** Classify a similarity score into a DuplicateType */
  classifyDuplicate(similarity: number): DuplicateType | null {
    if (similarity >= this._exactThreshold) return DupType.ExactDuplicate;
    if (similarity >= this._semanticThreshold) return DupType.SemanticDuplicate;
    if (similarity >= this._similarThreshold) return DupType.SimilarFinding;
    if (similarity >= this._relatedThreshold) return DupType.RelatedFinding;
    return null;
  }

  // ─── Private Helpers ───────────────────────────────────

  private computeFingerprint(finding: CorrelationFindingInput): ContentFingerprint {
    const titleHash = this.simpleHash(finding.title.toLowerCase());
    const descriptionHash = this.simpleHash(finding.description.toLowerCase());
    const endpointHash = finding.endpoint ? this.simpleHash(finding.endpoint) : '';
    const cveSet = new Set(finding.cve);
    const cweSet = new Set(finding.cwe);
    const combinedHash = this.simpleHash(
      `${finding.title}|${finding.severity}|${finding.category}|${finding.cve.join(',')}|${finding.cwe.join(',')}|${finding.endpoint ?? ''}`
    );

    return {
      findingId: finding.id,
      titleHash,
      descriptionHash,
      cveSet,
      cweSet,
      endpointHash,
      severity: finding.severity,
      category: finding.category,
      combinedHash,
    };
  }

  /** Simple hash function for strings */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  }

  /** Compute string similarity using Levenshtein-like comparison */
  private stringSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (!a || !b) return 0.0;

    // Use Jaccard similarity on word sets for performance
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));
    return this.setOverlapFromSets(wordsA, wordsB);
  }

  /** Compute overlap ratio between two string arrays */
  private setOverlap(a: readonly string[], b: readonly string[]): number {
    if (a.length === 0 && b.length === 0) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;
    const setA = new Set(a);
    const setB = new Set(b);
    return this.setOverlapFromSets(setA, setB);
  }

  /** Compute Jaccard similarity between two sets */
  private setOverlapFromSets<T>(a: Set<T>, b: Set<T>): number {
    if (a.size === 0 && b.size === 0) return 1.0;
    let intersection = 0;
    for (const item of a) {
      if (b.has(item)) intersection++;
    }
    const union = a.size + b.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /** Compute evidence for a similarity match */
  private computeSimilarityEvidence(
    source: CorrelationFindingInput,
    target: CorrelationFindingInput,
    similarity: number,
  ): CorrelationEvidence[] {
    const evidence: CorrelationEvidence[] = [];

    if (source.severity === target.severity) {
      evidence.push(createCorrelationEvidence({
        reason: CorrelationReason.SharedComponent,
        sharedValue: source.severity,
        sourceField: 'severity',
        targetField: 'severity',
        confidence: similarity,
      }));
    }

    if (source.category === target.category) {
      evidence.push(createCorrelationEvidence({
        reason: CorrelationReason.SharedComponent,
        sharedValue: source.category,
        sourceField: 'category',
        targetField: 'category',
        confidence: similarity,
      }));
    }

    const sharedCVE = source.cve.filter(c => target.cve.includes(c));
    if (sharedCVE.length > 0) {
      evidence.push(createCorrelationEvidence({
        reason: CorrelationReason.SameCVE,
        sharedValue: sharedCVE.join(','),
        sourceField: 'cve',
        targetField: 'cve',
        confidence: similarity,
      }));
    }

    return evidence;
  }
}
