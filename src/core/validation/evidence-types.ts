/**
 * Wave 1 TD-2 — Evidence Types
 * TASK-MVP-PROTOTYPE-IMPLEMENTATION-001
 *
 * Defines the evidence storage contract separate from IFeedbackCollector.
 * IFeedbackCollector is for evolution loop (improvement suggestions).
 * IEvidenceStore is for validation evidence (original + correction dual-record).
 *
 * Evidence principle: original AIS result is NEVER overwritten.
 * Corrections are stored as separate records linked by evidenceId.
 *
 * Conforms to: DOM-002.000
 */

import type { Timestamp } from '../types/common.js';

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type EvidenceId = string & { readonly __brand: 'EvidenceId' };
export type CorrectionId = string & { readonly __brand: 'CorrectionId' };

/**
 * Brand an evidence ID.
 */
export function brandEvidenceId(id: string): EvidenceId {
  return id as EvidenceId;
}

/**
 * Brand a correction ID.
 */
export function brandCorrectionId(id: string): CorrectionId {
  return id as CorrectionId;
}

// ═══════════════════════════════════════════════════════════════════
// EVIDENCE RECORD
// ═══════════════════════════════════════════════════════════════════

/**
 * The original evidence record produced by AIS.
 * Once stored, this record is immutable and never modified.
 */
export interface EvidenceRecord {
  readonly evidenceId: EvidenceId;
  readonly taskId: string;
  readonly projectId: string;
  readonly question: string;
  readonly answer: string;
  readonly sources: readonly EvidenceSource[];
  readonly architectureModelHash: string | null;
  readonly model: string;
  readonly provider: string;
  readonly tokens: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly latencyMs: number;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * A source reference that grounds the answer in project evidence.
 */
export interface EvidenceSource {
  readonly filePath: string;
  readonly description: string;
  readonly relevance: number; // 0.0 - 1.0
  readonly snippet: string;
}

/**
 * A correction/feedback record linked to an evidence record.
 * Stored separately — the original EvidenceRecord is never modified.
 */
export interface CorrectionRecord {
  readonly correctionId: CorrectionId;
  readonly evidenceId: EvidenceId;
  readonly content: string;
  readonly sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  readonly correctedAnswer: string | null;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Parameters for storing a new evidence record.
 */
export interface StoreEvidenceParams {
  readonly taskId: string;
  readonly projectId: string;
  readonly question: string;
  readonly answer: string;
  readonly sources: readonly EvidenceSource[];
  readonly architectureModelHash?: string | null;
  readonly model: string;
  readonly provider: string;
  readonly tokens?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly latencyMs?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Parameters for storing a correction to an evidence record.
 */
export interface StoreCorrectionParams {
  readonly evidenceId: EvidenceId;
  readonly content: string;
  readonly sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  readonly correctedAnswer?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// IEvidenceStore CONTRACT
// ═══════════════════════════════════════════════════════════════════

/**
 * IEvidenceStore — validation evidence storage contract.
 * Separate from IFeedbackCollector which serves the evolution loop.
 *
 * Key principle: storeEvidence() creates an immutable record.
 * Corrections are appended, never overwrite.
 */
export interface IEvidenceStore {
  /** Store an original evidence record. Returns the created record. */
  storeEvidence(params: StoreEvidenceParams): Promise<EvidenceRecord>;

  /** Store a correction linked to an existing evidence record. */
  storeCorrection(params: StoreCorrectionParams): Promise<CorrectionRecord>;

  /** Retrieve an evidence record by ID. */
  getEvidence(evidenceId: EvidenceId): Promise<EvidenceRecord | null>;

  /** Retrieve all corrections for an evidence record. */
  getCorrections(evidenceId: EvidenceId): Promise<readonly CorrectionRecord[]>;

  /** List evidence records, optionally filtered. */
  listEvidence(filter?: Partial<{
    projectId: string;
    taskId: string;
  }>): Promise<readonly EvidenceRecord[]>;

  /** Count total evidence records. */
  count(): Promise<number>;
}
