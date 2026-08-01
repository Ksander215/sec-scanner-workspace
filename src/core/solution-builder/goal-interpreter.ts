/**
 * Goal Interpreter Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Interprets raw user input into structured Goal objects.
 * Extracts primary goal, sub-goals, constraints, KPIs, stakeholders, and risks.
 * Emits GoalInterpretedEvent via the event bus.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, GoalId, Goal, GoalPriority,
} from './types.js';
import { brandGoalId, GoalPriority as GoalPriorityEnum } from './types.js';
import type { IGoalInterpreter } from './contracts.js';
import type { GoalInterpreterConfig } from './types.js';
import { GoalLimitExceededError } from './errors.js';
import type { GoalInterpretedEvent } from './events.js';

export class GoalInterpreter implements IGoalInterpreter {
  private readonly config: GoalInterpreterConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly goals = new Map<string, Goal>();
  private readonly solutionIndex = new Map<string, string>();

  constructor(config: GoalInterpreterConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async interpret(solutionId: SolutionId, rawInput: string): Promise<Goal> {
    if (this.goals.size >= this.config.maxGoals) {
      throw new GoalLimitExceededError(this.config.maxGoals);
    }

    const now: Timestamp = new Date().toISOString();
    const goalId = brandGoalId(crypto.randomUUID());

    // Parse raw input to extract goal components
    const primaryGoal = this.extractPrimaryGoal(rawInput);
    const subGoals = this.extractSubGoals(rawInput);
    const constraints = this.extractConstraints(rawInput);
    const kpis = this.extractKPIs(rawInput);
    const stakeholders = this.extractStakeholders(rawInput);
    const risks = this.extractRisks(rawInput);
    const priority = this.inferPriority(rawInput);

    const goal: Goal = Object.freeze({
      id: goalId,
      solutionId,
      rawInput,
      primaryGoal,
      subGoals: Object.freeze(subGoals),
      constraints: Object.freeze(constraints),
      kpis: Object.freeze(kpis),
      stakeholders: Object.freeze(stakeholders),
      risks: Object.freeze(risks),
      priority,
      interpretedAt: now,
      metadata: Object.freeze({}),
    });

    const key = goalId as string;
    this.goals.set(key, goal);
    this.solutionIndex.set(solutionId as string, key);

    const event: GoalInterpretedEvent = Object.freeze({
      eventType: 'solution.goal.interpreted',
      classification: EventClassification.Info,
      goalId,
      solutionId,
      primaryGoal,
      subGoalCount: subGoals.length,
      priority,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'Goal');

    return goal;
  }

  async getById(id: GoalId): Promise<Goal | null> {
    return this.goals.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<Goal | null> {
    const key = this.solutionIndex.get(solutionId as string);
    if (!key) return null;
    return this.goals.get(key) ?? null;
  }

  async list(): Promise<readonly Goal[]> {
    return Object.freeze([...this.goals.values()]);
  }

  async count(): Promise<number> {
    return this.goals.size;
  }

  // ─── Parsing Helpers ────────────────────────────────────────────

  private extractPrimaryGoal(input: string): string {
    // Find the first meaningful sentence or clause as the primary goal
    const sentences = input.split(/[.!?\n]/).map(s => s.trim()).filter(Boolean);
    if (sentences.length === 0) {
      return input.trim();
    }
    // Return the first sentence, trimmed to a reasonable length
    return sentences[0].length > 200 ? sentences[0].substring(0, 200) + '…' : sentences[0];
  }

  private extractSubGoals(input: string): readonly string[] {
    const subGoals: string[] = [];
    // Look for bullet patterns, numbered items, or comma-separated objectives
    const bulletPatterns = input.match(/[-•*]\s+(.+)/g);
    const numberedPatterns = input.match(/\d+[.)]\s+(.+)/g);
    const keywords = input.match(/(?:also|additionally|furthermore|moreover|as well as)\s+([^.!\n]+)/gi);

    if (numberedPatterns) {
      for (const m of numberedPatterns) {
        const cleaned = m.replace(/^\d+[.)]\s+/, '').trim();
        if (cleaned) subGoals.push(cleaned);
      }
    }
    if (bulletPatterns) {
      for (const m of bulletPatterns) {
        const cleaned = m.replace(/^[-•*]\s+/, '').trim();
        if (cleaned && !subGoals.includes(cleaned)) subGoals.push(cleaned);
      }
    }
    if (keywords) {
      for (const m of keywords) {
        const cleaned = m.replace(/^(?:also|additionally|furthermore|moreover|as well as)\s+/i, '').trim();
        if (cleaned && !subGoals.includes(cleaned)) subGoals.push(cleaned);
      }
    }

    // Cap at config limit
    return subGoals.slice(0, this.config.maxSubGoals);
  }

  private extractConstraints(input: string): readonly string[] {
    const constraints: string[] = [];
    const constraintPatterns = input.match(/(?:must|should|shall|cannot|cannot be|must not|needs to|is required to)\s+([^.!\n]+)/gi);
    if (constraintPatterns) {
      for (const m of constraintPatterns) {
        const cleaned = m.trim();
        if (cleaned && !constraints.includes(cleaned)) constraints.push(cleaned);
      }
    }
    return constraints;
  }

  private extractKPIs(input: string): readonly string[] {
    const kpis: string[] = [];
    const kpiPatterns = input.match(/(?:kpi|metric|measure|target|benchmark|indicator|success criteria|key performance)\s*:?\s*([^.!\n]+)/gi);
    if (kpiPatterns) {
      for (const m of kpiPatterns) {
        const cleaned = m.trim();
        if (cleaned && !kpis.includes(cleaned)) kpis.push(cleaned);
      }
    }
    // Also look for percentage or numeric targets
    const numericTargets = input.match(/\d+(?:\.\d+)?\s*(?:%|percent|percent increase|percent decrease|reduction|improvement|growth)/gi);
    if (numericTargets) {
      for (const m of numericTargets) {
        if (!kpis.includes(m)) kpis.push(m);
      }
    }
    return kpis;
  }

  private extractStakeholders(input: string): readonly string[] {
    const stakeholders: string[] = [];
    const rolePatterns = input.match(/(?:stakeholder|user|customer|client|manager|team|department|admin|employee|vendor|partner|executive|board|director|owner)\s+(?:is|are|will|should|needs?|want)/gi);
    if (rolePatterns) {
      for (const m of rolePatterns) {
        const cleaned = m.trim();
        if (cleaned && !stakeholders.includes(cleaned)) stakeholders.push(cleaned);
      }
    }
    return stakeholders;
  }

  private extractRisks(input: string): readonly string[] {
    const risks: string[] = [];
    const riskPatterns = input.match(/(?:risk|threat|concern|challenge|issue|problem|obstacle|barrier|danger|vulnerability|exposure)\s*:?\s*([^.!\n]+)/gi);
    if (riskPatterns) {
      for (const m of riskPatterns) {
        const cleaned = m.trim();
        if (cleaned && !risks.includes(cleaned)) risks.push(cleaned);
      }
    }
    return risks;
  }

  private inferPriority(input: string): GoalPriority {
    const lower = input.toLowerCase();
    if (/critical|urgent|immediate|asap|blocker|showstopper/.test(lower)) {
      return GoalPriorityEnum.Critical;
    }
    if (/important|high priority|must have|essential|p1|priority 1/.test(lower)) {
      return GoalPriorityEnum.High;
    }
    if (/low priority|nice to have|optional|p3|priority 3|when possible/.test(lower)) {
      return GoalPriorityEnum.Low;
    }
    return GoalPriorityEnum.Medium;
  }

  // ─── Event Publishing ────────────────────────────────────────────

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
