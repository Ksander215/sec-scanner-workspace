/**
 * Personal Intelligence Pack — Value Analyzer
 * TASK-AIS-007A.000
 *
 * Creates value assessments per PHI-002.000 dimensions.
 * Every recommendation must explain what value it creates,
 * for whom, and how to measure the result.
 */
import type { PersonalIntelligenceContracts } from './contracts.js';
import type { PackValueAssessment, PackValueAssessmentId, ValueDimension } from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import { ValueAssessmentError } from './errors.js';

export class ValueAnalyzer {
  private contracts: PersonalIntelligenceContracts;
  private assessments = new Map<string, PackValueAssessment>();

  constructor(contracts: PersonalIntelligenceContracts) {
    this.contracts = contracts;
  }

  createAssessment(
    dimension: ValueDimension,
    description: string,
    reasons: readonly string[],
    forWhom: string,
    measurementCriteria: readonly string[],
    expectedImpact: string,
    confidence: number,
  ): PackValueAssessment {
    if (!description.trim()) throw new ValueAssessmentError('description is required');
    if (reasons.length === 0) throw new ValueAssessmentError('at least one reason is required');
    if (!forWhom.trim()) throw new ValueAssessmentError('forWhom is required');

    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID() as unknown as PackValueAssessmentId;
    const clampedConfidence = Math.max(0, Math.min(1, confidence));

    const assessment: PackValueAssessment = Object.freeze({
      id, dimension, description: description.trim(),
      reasons: Object.freeze(reasons),
      forWhom: forWhom.trim(),
      measurementCriteria: Object.freeze(measurementCriteria),
      expectedImpact: expectedImpact.trim(),
      confidence: clampedConfidence,
      createdAt: now,
    });

    this.assessments.set(id as unknown as string, assessment);

    const base = createPackEventBase('ValueAssessmentCreated', EventClassification.Info, id as unknown as string);
    void this.contracts.platform.publishEvent('ValueAssessmentCreated', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { assessmentId: id, dimension, confidence: clampedConfidence, createdAt: now },
    });

    return assessment;
  }

  getAssessment(id: string): PackValueAssessment {
    const a = this.assessments.get(id);
    if (!a) throw new ValueAssessmentError(`Assessment not found: ${id}`);
    return a;
  }

  getByDimension(dimension: ValueDimension): readonly PackValueAssessment[] {
    return Object.freeze(Array.from(this.assessments.values()).filter(a => a.dimension === dimension));
  }

  getAllAssessments(): readonly PackValueAssessment[] {
    return Object.freeze(Array.from(this.assessments.values()));
  }

  getAssessmentCount(): number { return this.assessments.size; }

  getTopValueDimensions(): readonly { dimension: string; avgConfidence: number; count: number }[] {
    const byDim = new Map<string, { total: number; count: number }>();
    for (const a of this.assessments.values()) {
      const existing = byDim.get(a.dimension) ?? { total: 0, count: 0 };
      byDim.set(a.dimension, { total: existing.total + a.confidence, count: existing.count + 1 });
    }
    const result = Array.from(byDim.entries()).map(([dimension, data]) => ({
      dimension, avgConfidence: Math.round((data.total / data.count) * 100) / 100, count: data.count,
    }));
    result.sort((a, b) => b.avgConfidence - a.avgConfidence);
    return Object.freeze(result);
  }

  dispose(): void { this.assessments.clear(); }
}
