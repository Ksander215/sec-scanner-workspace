/**
 * Personal Intelligence Runtime — Decision Subsystem
 *
 * Supports structured decision analysis using multiple methods
 * (pros/cons, SWOT, risk analysis, etc.).  Owns all decision data.
 */
import { DecisionMethod } from './types.js';
import type { Decision, DecisionOption } from './types.js';
import type { PersonalRuntimeContracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import { DecisionError } from './errors.js';

// ── Config ──────────────────────────────────────────────────────

export interface DecisionRuntimeConfig {
  readonly maxDecisions?: number;
}

// ── Input types ────────────────────────────────────────────────

interface OptionInput {
  readonly title: string;
  readonly pros?: readonly string[];
  readonly cons?: readonly string[];
  readonly risks?: readonly string[];
}

// ── Scoring weights by method ──────────────────────────────────

const METHOD_WEIGHTS: Readonly<Record<DecisionMethod, { pro: number; con: number; risk: number }>> = Object.freeze({
  [DecisionMethod.ProsCons]: { pro: 1.0, con: -1.0, risk: 0 },
  [DecisionMethod.SWOT]: { pro: 0.5, con: -0.5, risk: 0 },
  [DecisionMethod.RiskAnalysis]: { pro: 0.3, con: -0.3, risk: -0.8 },
  [DecisionMethod.ScenarioAnalysis]: { pro: 0.4, con: -0.4, risk: -0.4 },
  [DecisionMethod.ExpectedOutcome]: { pro: 0.6, con: -0.6, risk: -0.2 },
  [DecisionMethod.TradeOffs]: { pro: 0.7, con: -0.7, risk: -0.1 },
});

export class DecisionRuntime {
  private contracts: PersonalRuntimeContracts;
  private decisions = new Map<string, Decision>();
  private readonly maxDecisions: number;

  constructor(contracts: PersonalRuntimeContracts, config?: DecisionRuntimeConfig) {
    this.contracts = contracts;
    this.maxDecisions = config?.maxDecisions ?? 100;
  }

  // ── Create ───────────────────────────────────────────────────

  createDecision(
    title: string,
    description: string,
    method: DecisionMethod,
    options?: readonly OptionInput[],
  ): Decision {
    if (!title.trim()) {
      throw new DecisionError('invalid', 'Decision title must be non-empty');
    }

    if (this.decisions.size >= this.maxDecisions) {
      throw new DecisionError('capacity', 'Maximum decision count reached');
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const decisionOptions = (options ?? []).map(opt =>
      Object.freeze({
        id: crypto.randomUUID(),
        title: opt.title.trim(),
        pros: Object.freeze(opt.pros ? [...opt.pros] : []),
        cons: Object.freeze(opt.cons ? [...opt.cons] : []),
        score: null,
        risks: Object.freeze(opt.risks ? [...opt.risks] : []),
      } satisfies DecisionOption),
    );

    const decision: Decision = Object.freeze({
      id,
      title: title.trim(),
      description,
      method,
      options: Object.freeze(decisionOptions),
      conclusion: null,
      createdAt: now,
      resolvedAt: null,
    });

    this.decisions.set(id, decision);

    const base = createPersonalEventBase('DecisionCreated', EventClassification.StateChange, id);
    void this.contracts.platform.publishEvent('DecisionCreated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        decisionId: id,
        title: decision.title,
        method: decision.method,
        optionCount: decisionOptions.length,
        createdAt: now,
      },
    });

    return decision;
  }

  // ── Add option ───────────────────────────────────────────────

  addOption(decisionId: string, input: OptionInput): Decision {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new DecisionError(decisionId, 'Decision not found');
    }
    if (decision.conclusion !== null) {
      throw new DecisionError(decisionId, 'Cannot add options to a resolved decision');
    }
    if (!input.title.trim()) {
      throw new DecisionError(decisionId, 'Option title must be non-empty');
    }

    const newOption: DecisionOption = Object.freeze({
      id: crypto.randomUUID(),
      title: input.title.trim(),
      pros: Object.freeze(input.pros ? [...input.pros] : []),
      cons: Object.freeze(input.cons ? [...input.cons] : []),
      score: null,
      risks: Object.freeze(input.risks ? [...input.risks] : []),
    });

    const updated: Decision = Object.freeze({
      ...decision,
      options: Object.freeze([...decision.options, newOption]),
    });

    this.decisions.set(decisionId, updated);
    return updated;
  }

  // ── Score option ─────────────────────────────────────────────

  scoreOption(decisionId: string, optionId: string, score: number): Decision {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new DecisionError(decisionId, 'Decision not found');
    }

    const clampedScore = Math.min(100, Math.max(-100, Math.round(score)));

    const newOptions = decision.options.map(opt => {
      if (opt.id !== optionId) return opt;
      return Object.freeze({ ...opt, score: clampedScore } satisfies DecisionOption);
    });

    const updated: Decision = Object.freeze({
      ...decision,
      options: Object.freeze(newOptions),
    });

    this.decisions.set(decisionId, updated);
    return updated;
  }

  // ── Auto-score all options ───────────────────────────────────

  autoScore(decisionId: string): Decision {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new DecisionError(decisionId, 'Decision not found');
    }
    if (decision.conclusion !== null) {
      throw new DecisionError(decisionId, 'Cannot score a resolved decision');
    }

    const weights = METHOD_WEIGHTS[decision.method];

    const scoredOptions = decision.options.map(opt => {
      const proScore = opt.pros.length * weights.pro * 10;
      const conScore = opt.cons.length * weights.con * 10;
      const riskScore = opt.risks.length * weights.risk * 10;
      const rawScore = 50 + proScore + conScore + riskScore;
      const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      return Object.freeze({ ...opt, score: finalScore } satisfies DecisionOption);
    });

    const updated: Decision = Object.freeze({
      ...decision,
      options: Object.freeze(scoredOptions),
    });

    this.decisions.set(decisionId, updated);
    return updated;
  }

  // ── Resolve ──────────────────────────────────────────────────

  resolveDecision(decisionId: string, conclusion: string): Decision {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new DecisionError(decisionId, 'Decision not found');
    }
    if (decision.conclusion !== null) {
      throw new DecisionError(decisionId, 'Decision is already resolved');
    }
    if (!conclusion.trim()) {
      throw new DecisionError(decisionId, 'Conclusion must be non-empty');
    }

    const now = new Date().toISOString();
    const resolved: Decision = Object.freeze({
      ...decision,
      conclusion: conclusion.trim(),
      resolvedAt: now,
    });

    this.decisions.set(decisionId, resolved);

    const base = createPersonalEventBase('DecisionResolved', EventClassification.Result, decisionId);
    void this.contracts.platform.publishEvent('DecisionResolved', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        decisionId,
        conclusion: resolved.conclusion,
        resolvedAt: now,
      },
    });

    return resolved;
  }

  // ── Queries ──────────────────────────────────────────────────

  getDecision(decisionId: string): Decision {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new DecisionError(decisionId, 'Decision not found');
    }
    return decision;
  }

  getUnresolved(): readonly Decision[] {
    return Object.freeze(
      Array.from(this.decisions.values()).filter(d => d.conclusion === null),
    );
  }

  getResolved(): readonly Decision[] {
    return Object.freeze(
      Array.from(this.decisions.values()).filter(d => d.conclusion !== null),
    );
  }

  getAllDecisions(): readonly Decision[] {
    return Object.freeze(Array.from(this.decisions.values()));
  }

  getDecisionCount(): number {
    return this.decisions.size;
  }

  getBestOption(decisionId: string): DecisionOption | null {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new DecisionError(decisionId, 'Decision not found');
    }

    const scored = decision.options.filter(o => o.score !== null);
    if (scored.length === 0) return null;

    return scored.reduce((best, current) =>
      (current.score ?? 0) > (best.score ?? 0) ? current : best,
    );
  }

  getMethodComparison(): Readonly<Record<DecisionMethod, { count: number; avgOptions: number }>> {
    const byMethod = new Map<DecisionMethod, { count: number; totalOptions: number }>();

    for (const method of Object.values(DecisionMethod)) {
      byMethod.set(method, { count: 0, totalOptions: 0 });
    }

    for (const decision of this.decisions.values()) {
      const entry = byMethod.get(decision.method);
      if (entry) {
        entry.count += 1;
        entry.totalOptions += decision.options.length;
      }
    }

    const result: Record<string, { count: number; avgOptions: number }> = {};
    for (const [method, data] of byMethod) {
      result[method] = {
        count: data.count,
        avgOptions: data.count > 0 ? Math.round((data.totalOptions / data.count) * 10) / 10 : 0,
      };
    }

    return Object.freeze(result as unknown as Readonly<Record<DecisionMethod, { count: number; avgOptions: number }>>);
  }

  // ── Delete ───────────────────────────────────────────────────

  deleteDecision(decisionId: string): void {
    if (!this.decisions.has(decisionId)) {
      throw new DecisionError(decisionId, 'Decision not found');
    }
    this.decisions.delete(decisionId);
  }
}
