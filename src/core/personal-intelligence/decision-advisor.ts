/**
 * Personal Intelligence Pack — Decision Advisor
 * TASK-AIS-007A.000
 *
 * Structures decisions with pros, cons, risks, alternatives,
 * consequences, and recommendations.
 */
import type { PersonalIntelligenceContracts } from './contracts.js';
import type { PackDecision, PackDecisionId, DecisionOption, DecisionStatus } from './types.js';
import { DecisionStatus as DS } from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import { DecisionNotFoundError, DecisionValidationError } from './errors.js';

export class DecisionAdvisor {
  private contracts: PersonalIntelligenceContracts;
  private decisions = new Map<string, PackDecision>();
  private readonly maxDecisions: number;

  constructor(contracts: PersonalIntelligenceContracts, maxDecisions = 200) {
    this.contracts = contracts;
    this.maxDecisions = maxDecisions;
  }

  createDecision(title: string, description: string, optionTitles: readonly string[]): PackDecision {
    if (!title.trim()) throw new DecisionValidationError(['title is required']);
    if (this.decisions.size >= this.maxDecisions) throw new DecisionValidationError(['Maximum decision count reached']);

    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID() as unknown as PackDecisionId;
    const options: DecisionOption[] = optionTitles.map(ot => Object.freeze({
      id: crypto.randomUUID(), title: ot, description: '',
      pros: Object.freeze([]), cons: Object.freeze([]),
      risks: Object.freeze([]), alternatives: Object.freeze([]),
      consequences: Object.freeze([]), score: null,
    }));

    const decision: PackDecision = Object.freeze({
      id, title: title.trim(), description: description.trim(),
      status: DS.Draft, options: Object.freeze(options),
      conclusion: null, recommendation: null,
      createdAt: now, resolvedAt: null,
    });

    this.decisions.set(id as unknown as string, decision);

    const base = createPackEventBase('PackDecisionCreated', EventClassification.StateChange, id as unknown as string);
    void this.contracts.platform.publishEvent('PackDecisionCreated', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { decisionId: id, title, optionCount: options.length, createdAt: now },
    });

    return decision;
  }

  addAnalysis(decisionId: string, optionIndex: number, analysis: { pros?: readonly string[]; cons?: readonly string[]; risks?: readonly string[]; alternatives?: readonly string[]; consequences?: readonly string[] }): PackDecision {
    const existing = this.getDecisionOrThrow(decisionId);
    const option = existing.options[optionIndex];
    if (!option) throw new DecisionNotFoundError(`Option ${optionIndex} not found`);

    const updatedOption: DecisionOption = Object.freeze({
      ...option,
      pros: analysis.pros ? Object.freeze([...option.pros, ...analysis.pros]) : option.pros,
      cons: analysis.cons ? Object.freeze([...option.cons, ...analysis.cons]) : option.cons,
      risks: analysis.risks ? Object.freeze([...option.risks, ...analysis.risks]) : option.risks,
      alternatives: analysis.alternatives ? Object.freeze([...option.alternatives, ...analysis.alternatives]) : option.alternatives,
      consequences: analysis.consequences ? Object.freeze([...option.consequences, ...analysis.consequences]) : option.consequences,
    });

    const options = [...existing.options];
    options[optionIndex] = updatedOption;
    const updated: PackDecision = Object.freeze({
      ...existing, options: Object.freeze(options),
    });
    this.decisions.set(decisionId, updated);
    return updated;
  }

  resolve(decisionId: string, conclusion: string, recommendation?: string): PackDecision {
    const existing = this.getDecisionOrThrow(decisionId);
    const now = new Date().toISOString() as Timestamp;
    const updated: PackDecision = Object.freeze({
      ...existing, status: DS.Resolved, conclusion, recommendation: recommendation ?? null,
      resolvedAt: now,
    });
    this.decisions.set(decisionId, updated);

    const base = createPackEventBase('PackDecisionResolved', EventClassification.Result, decisionId);
    void this.contracts.platform.publishEvent('PackDecisionResolved', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { decisionId, conclusion, resolvedAt: now },
    });

    return updated;
  }

  getDecision(id: string): PackDecision { return this.getDecisionOrThrow(id); }

  getDecisionsByStatus(status: DecisionStatus): readonly PackDecision[] {
    return Object.freeze(Array.from(this.decisions.values()).filter(d => d.status === status));
  }

  getAllDecisions(): readonly PackDecision[] { return Object.freeze(Array.from(this.decisions.values())); }
  getDecisionCount(): number { return this.decisions.size; }

  dispose(): void { this.decisions.clear(); }

  // ── Private ───────────────────────────────────────────────

  private getDecisionOrThrow(id: string): PackDecision {
    const d = this.decisions.get(id);
    if (!d) throw new DecisionNotFoundError(id);
    return d;
  }
}
