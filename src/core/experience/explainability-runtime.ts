/**
 * Experience Runtime — Explainability Runtime
 * TASK-AIS-004A.000  Subsystem 9
 *
 * Every adaptation must answer: Why? Based on what? When? What events?
 *
 * Records explanations for changes, retrieves them by target/adaptation,
 * and generates human-readable explanations. Internal Map-based storage.
 *
 * Conforms to: DOM-002, ADR-014, CON-001
 */

import type { Identifier, Timestamp } from '../types/common.js';
import { createId } from '../domain/identifiers.js';
import type {
  ExplainabilityId,
  ObservationId,
  AdaptationId,
  ExplainabilityRecord,
} from './types.js';


// ─── ExplainabilityRuntime ────────────────────────────────────

/**
 * Records and retrieves explanations for all adaptations and changes
 * in the experience runtime. Supports querying by target ID, user hash,
 * or adaptation ID. Generates human-readable summaries.
 */
export class ExplainabilityRuntime {
  private readonly records = new Map<ExplainabilityId, ExplainabilityRecord>();
  private readonly recordsByTarget = new Map<Identifier, ExplainabilityRecord>();
  private readonly recordsByUser = new Map<string, ExplainabilityRecord[]>();
  private readonly recordsByAdaptation = new Map<AdaptationId, ExplainabilityRecord>();

  // ─── Recording ────────────────────────────────────────────

  /**
   * Records an explanation for a change/adaptation.
   *
   * @param targetId       — ID of the entity that was changed
   * @param targetType     — Type of entity (e.g. 'Adaptation', 'Preference')
   * @param changeType     — What kind of change (e.g. 'value_update', 'creation')
   * @param reason         — Human-readable reason for the change
   * @param observations   — Observation IDs that served as evidence
   * @param confidence     — Confidence score 0.0–1.0
   * @param previousState  — State snapshot before the change
   * @param newState        — State snapshot after the change
   * @returns The created ExplainabilityRecord
   */
  recordExplanation(
    targetId: Identifier,
    targetType: string,
    changeType: string,
    reason: string,
    observations: readonly ObservationId[],
    confidence: number,
    previousState: Readonly<Record<string, unknown>>,
    newState: Readonly<Record<string, unknown>>,
  ): ExplainabilityRecord {
    const id = createId<ExplainabilityId>();
    const now = new Date().toISOString() as Timestamp;

    // Derive userIdHash from previousState or newState if available
    const userIdHash = extractUserIdHash(previousState, newState);

    const record: ExplainabilityRecord = {
      id,
      userIdHash,
      targetId,
      targetType,
      changeType,
      reason,
      observations: [...observations],
      confidence: clampConfidence(confidence),
      timestamp: now,
      previousState: { ...previousState },
      newState: { ...newState },
    };

    this.records.set(id, record);
    this.recordsByTarget.set(targetId, record);

    // Index by user
    const userRecords = this.recordsByUser.get(userIdHash);
    if (userRecords) {
      userRecords.push(record);
    } else {
      this.recordsByUser.set(userIdHash, [record]);
    }

    // Index by adaptation if applicable
    if (targetType === 'Adaptation') {
      this.recordsByAdaptation.set(
        targetId as AdaptationId,
        record,
      );
    }

    return record;
  }

  // ─── Querying ─────────────────────────────────────────────

  /** Retrieves the explanation record for a specific target ID, or null. */
  getExplanation(targetId: Identifier): ExplainabilityRecord | null {
    return this.recordsByTarget.get(targetId) ?? null;
  }

  /** Retrieves all explanation records for a given user. */
  getExplanationHistory(userIdHash: string): readonly ExplainabilityRecord[] {
    return this.recordsByUser.get(userIdHash) ?? [];
  }

  /** Retrieves the explanation record associated with an adaptation, or null. */
  getExplanationForAdaptation(
    adaptationId: AdaptationId,
  ): ExplainabilityRecord | null {
    return this.recordsByAdaptation.get(adaptationId) ?? null;
  }

  // ─── Human-readable generation ─────────────────────────────

  /**
   * Generates a human-readable explanation for a target.
   * If no explanation record exists, returns a default message.
   */
  generateExplanation(
    targetId: Identifier,
    targetType: string,
  ): string {
    const record = this.recordsByTarget.get(targetId);

    if (!record) {
      return `No explanation recorded for ${targetType} ${targetId}.`;
    }

    const parts: string[] = [];

    // What changed
    parts.push(
      `${record.changeType} was applied to ${record.targetType} ${record.targetId}.`,
    );

    // Why
    parts.push(`Reason: ${record.reason}.`);

    // Based on what evidence
    if (record.observations.length > 0) {
      parts.push(
        `Based on ${record.observations.length} observation(s): ${record.observations.map(o => o).join(', ')}.`,
      );
    } else {
      parts.push('No observation evidence was recorded for this change.');
    }

    // When
    parts.push(`Occurred at ${record.timestamp}.`);

    // Confidence
    const pct = Math.round(record.confidence * 100);
    parts.push(`Confidence: ${pct}%.`);

    // State transition summary
    const prevKeys = Object.keys(record.previousState);
    const newKeys = Object.keys(record.newState);
    if (prevKeys.length > 0 || newKeys.length > 0) {
      parts.push(`Previous state: ${formatState(record.previousState)}.`);
      parts.push(`New state: ${formatState(record.newState)}.`);
    }

    return parts.join(' ');
  }

  // ─── Internal ──────────────────────────────────────────────

  /** Returns the number of records stored (useful for diagnostics). */
  get size(): number {
    return this.records.size;
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function clampConfidence(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function extractUserIdHash(
  previousState: Readonly<Record<string, unknown>>,
  newState: Readonly<Record<string, unknown>>,
): string {
  const fromPrev = previousState['userIdHash'];
  const fromNew = newState['userIdHash'];

  if (typeof fromPrev === 'string') return fromPrev;
  if (typeof fromNew === 'string') return fromNew;

  return 'unknown';
}

function formatState(state: Readonly<Record<string, unknown>>): string {
  const entries = Object.entries(state);
  if (entries.length === 0) return '{}';

  const items = entries.map(([k, v]) => {
    const val = typeof v === 'string' ? `"${v}"` : String(v);
    return `${k}: ${val}`;
  });

  // Truncate if too long for readability
  const result = items.join(', ');
  if (result.length > 200) {
    return result.substring(0, 197) + '...';
  }
  return `{ ${result} }`;
}
