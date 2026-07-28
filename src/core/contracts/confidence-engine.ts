/**
 * IC-02: ConfidenceEngine — ARC-001.001 §6
 * FP-03, Z1. Calculates confidence scores, selects narratives.
 */
import { ConfidenceLevel } from '../domain/value-objects/confidence-level.js';
import { UserRole } from '../domain/value-objects/user-role.js';

export interface ConfidenceResultData {
  readonly score: number;
  readonly level: ConfidenceLevel;
  readonly narrative: string;
}

export interface ConfidenceEngine {
  calculate(): Promise<ConfidenceResultData>;
  getLevel(): Promise<ConfidenceLevel>;
  getNarrative(role: UserRole): Promise<string>;
}
