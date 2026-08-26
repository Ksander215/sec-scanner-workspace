/**
 * Wave 1 TD-2 — Evidence Store Implementation
 * TASK-MVP-PROTOTYPE-IMPLEMENTATION-001
 *
 * File-based evidence store. Stores evidence and corrections as JSON files.
 * Directory structure:
 *   <storePath>/
 *     evidence/<evidenceId>.json
 *     corrections/<evidenceId>/<correctionId>.json
 *     index.json
 *
 * Evidence principle: original AIS result is NEVER overwritten.
 * Corrections are stored as separate files in a subdirectory.
 *
 * Conforms to: DOM-002.000
 */

import {
  type IEvidenceStore,
  type EvidenceRecord,
  type CorrectionRecord,
  type StoreEvidenceParams,
  type StoreCorrectionParams,
  type EvidenceId,
  brandEvidenceId,
  brandCorrectionId,
} from './evidence-types.js';

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * In-memory evidence store adapter for Wave 1.
 * File-based persistence for production; in-memory for fast prototype iteration.
 * When storePath is provided, persists to disk.
 */
export class FileEvidenceStoreAdapter implements IEvidenceStore {
  private readonly _storePath: string | null;
  private readonly _evidence: Map<string, EvidenceRecord> = new Map();
  private readonly _corrections: Map<string, CorrectionRecord[]> = new Map();

  constructor(storePath?: string) {
    this._storePath = storePath ?? null;
    if (this._storePath) {
      this.ensureDirectory(this._storePath);
      this.ensureDirectory(join(this._storePath, 'evidence'));
      this.ensureDirectory(join(this._storePath, 'corrections'));
    }
  }

  async storeEvidence(params: StoreEvidenceParams): Promise<EvidenceRecord> {
    const evidenceId = brandEvidenceId(crypto.randomUUID());
    const record: EvidenceRecord = Object.freeze({
      evidenceId,
      taskId: params.taskId,
      projectId: params.projectId,
      question: params.question,
      answer: params.answer,
      sources: Object.freeze([...params.sources]),
      architectureModelHash: params.architectureModelHash ?? null,
      model: params.model,
      provider: params.provider,
      tokens: Object.freeze({
        promptTokens: params.tokens?.promptTokens ?? 0,
        completionTokens: params.tokens?.completionTokens ?? 0,
        totalTokens: params.tokens?.totalTokens ?? 0,
      }),
      latencyMs: params.latencyMs ?? 0,
      createdAt: new Date().toISOString(),
      metadata: Object.freeze(params.metadata ?? {}),
    });

    // Store in memory
    this._evidence.set(evidenceId, record);
    this._corrections.set(evidenceId, []);

    // Persist to file if storePath is configured
    if (this._storePath) {
      const filePath = join(this._storePath, 'evidence', `${evidenceId}.json`);
      writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    }

    return record;
  }

  async storeCorrection(params: StoreCorrectionParams): Promise<CorrectionRecord> {
    const { evidenceId } = params;

    // Verify the evidence record exists
    const evidence = this._evidence.get(evidenceId);
    if (!evidence) {
      throw new Error(`Evidence record not found: ${evidenceId}`);
    }

    const correctionId = brandCorrectionId(crypto.randomUUID());
    const record: CorrectionRecord = Object.freeze({
      correctionId,
      evidenceId,
      content: params.content,
      sentiment: params.sentiment,
      correctedAnswer: params.correctedAnswer ?? null,
      createdAt: new Date().toISOString(),
      metadata: Object.freeze(params.metadata ?? {}),
    });

    // Append to corrections list (never modify original)
    const corrections = this._corrections.get(evidenceId) ?? [];
    const updatedCorrections = [...corrections, record];
    this._corrections.set(evidenceId, updatedCorrections);

    // Persist to file
    if (this._storePath) {
      const correctionDir = join(this._storePath, 'corrections', evidenceId);
      this.ensureDirectory(correctionDir);
      const filePath = join(correctionDir, `${correctionId}.json`);
      writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    }

    return record;
  }

  async getEvidence(evidenceId: EvidenceId): Promise<EvidenceRecord | null> {
    return this._evidence.get(evidenceId) ?? null;
  }

  async getCorrections(evidenceId: EvidenceId): Promise<readonly CorrectionRecord[]> {
    return Object.freeze(this._corrections.get(evidenceId) ?? []);
  }

  async listEvidence(filter?: Partial<{ projectId: string; taskId: string }>): Promise<readonly EvidenceRecord[]> {
    let records = Array.from(this._evidence.values());

    if (filter?.projectId) {
      records = records.filter(r => r.projectId === filter.projectId);
    }
    if (filter?.taskId) {
      records = records.filter(r => r.taskId === filter.taskId);
    }

    return Object.freeze(records);
  }

  async count(): Promise<number> {
    return this._evidence.size;
  }

  /**
   * Ensure a directory exists.
   */
  private ensureDirectory(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }
}
