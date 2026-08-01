#!/usr/bin/env python3
"""Generate all 15 solution-builder subsystems + orchestrator + index.
TASK-AIS-010A.000
"""
import os

BASE = '/home/z/my-project/src/core/solution-builder'

def w(name, content):
    with open(os.path.join(BASE, name), 'w') as f:
        f.write(content)
    print(f'  {name} ({len(content)}b)')

HEADER = """/**
 * Solution Builder Runtime — %s
 * TASK-AIS-010A.000
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
"""

PEVT = """
  private async publishEvent(
    event: Record<string, unknown>,
    aggregateId: string,
    aggregateType: string,
  ): Promise<void> {
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
"""

# ═══ 1. GoalInterpreter ═══
w('goal-interpreter.ts', HEADER % 'Goal Interpreter' + """
import type { IGoalInterpreter } from './contracts.js';
import type { GoalId, Goal, GoalInterpreterConfig } from './types.js';
import type { SolutionId } from './types.js';
import { brandGoalId, GoalPriority } from './types.js';
import { GoalLimitExceededError } from './errors.js';
import type { InProcessEventBus } from '../events/event-bus.js';

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
    if (this.goals.size >= this.config.maxGoals) throw new GoalLimitExceededError(this.config.maxGoals);
    const now: Timestamp = new Date().toISOString();
    const lines = rawInput.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
    const primaryGoal = lines[0] ?? rawInput.slice(0, 100);
    const subGoals = lines.slice(1, this.config.maxSubGoals + 1);
    const priority = /критич|critical|urgent|срочно/i.test(rawInput)
      ? GoalPriority.Critical
      : /важн|important|high/i.test(rawInput)
        ? GoalPriority.High
        : GoalPriority.Medium;
    const constraints = [/огранич|constraint|нельзя|cannot/i.test(rawInput) ? ['auto-detected-constraint'] : []];
    const kpis = [/KPI|метрик|metric/i.test(rawInput) ? ['auto-detected-kpi'] : []];
    const stakeholders = [/пользовател|user|клиент|client/i.test(rawInput) ? ['stakeholder'] : []];
    const risks = [/риск|risk/i.test(rawInput) ? ['auto-detected-risk'] : []];

    const id = brandGoalId(`goal-${crypto.randomUUID()}`);
    const goal: Goal = Object.freeze({
      id, solutionId, rawInput, primaryGoal,
      subGoals: Object.freeze(subGoals),
      constraints: Object.freeze(constraints as readonly string[]),
      kpis: Object.freeze(kpis as readonly string[]),
      stakeholders: Object.freeze(stakeholders as readonly string[]),
      risks: Object.freeze(risks as readonly string[]),
      priority, interpretedAt: now,
      metadata: Object.freeze({}),
    });
    const key = id as string;
    this.goals.set(key, goal);
    this.solutionIndex.set(solutionId as string, key);
    await this.publishEvent({
      eventType: 'solution.goal.interpreted', classification: EventClassification.Result,
      goalId: id, solutionId, primaryGoal, subGoalCount: subGoals.length, priority, timestamp: now, metadata: Object.freeze({}),
    }, key, 'Goal');
    return goal;
  }

  async getById(id: GoalId): Promise<Goal | null> { return this.goals.get(id as string) ?? null; }
  async getBySolutionId(solutionId: SolutionId): Promise<Goal | null> {
    const key = this.solutionIndex.get(solutionId as string);
    return key ? (this.goals.get(key) ?? null) : null;
  }
  async list(): Promise<readonly Goal[]> { return Array.from(this.goals.values()); }
  async count(): Promise<number> { return this.goals.size; }
""" + PEVT)

# ═══ 2. DomainAnalyzer ═══
w('domain-analyzer.ts', HEADER % 'Domain Analyzer' + """
import type { IDomainAnalyzer } from './contracts.js';
import type { DomainAnalysis, DomainAnalyzerConfig } from './types.js';
import type { SolutionId } from './types.js';
import { BusinessDomain } from './types.js';

export class DomainAnalyzer implements IDomainAnalyzer {
  private readonly config: DomainAnalyzerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly analyses = new Map<string, DomainAnalysis>();

  constructor(config: DomainAnalyzerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async analyze(solutionId: SolutionId, rawInput: string): Promise<DomainAnalysis> {
    const now: Timestamp = new Date().toISOString();
    const lower = rawInput.toLowerCase();
    const domainMap: Record<string, BusinessDomain> = {
      'строительств': BusinessDomain.Construction, 'crm': BusinessDomain.General,
      'медицин': BusinessDomain.Healthcare, 'health': BusinessDomain.Healthcare,
      'финанс': BusinessDomain.Finance, 'банк': BusinessDomain.Finance,
      'образован': BusinessDomain.Education, 'educat': BusinessDomain.Education,
      'коммерц': BusinessDomain.ECommerce, 'e-commerce': BusinessDomain.ECommerce,
      'производств': BusinessDomain.Manufacturing, 'manufactur': BusinessDomain.Manufacturing,
      'логист': BusinessDomain.Logistics, 'logist': BusinessDomain.Logistics,
      'недвижим': BusinessDomain.RealEstate, 'real estate': BusinessDomain.RealEstate,
      'юридическ': BusinessDomain.Legal, 'legal': BusinessDomain.Legal,
      'hr': BusinessDomain.HR, 'кадр': BusinessDomain.HR,
      'маркетинг': BusinessDomain.Marketing, 'market': BusinessDomain.Marketing,
    };
    let businessDomain = BusinessDomain.General;
    let industry = 'General';
    for (const [keyword, bd] of Object.entries(domainMap)) {
      if (lower.includes(keyword)) { businessDomain = bd; industry = bd; break; }
    }
    const terminology = lower.split(/\s+/).filter(w => w.length > 5).slice(0, this.config.maxTerminology);
    const analysis: DomainAnalysis = Object.freeze({
      solutionId, industry, businessDomain, subjectArea: industry,
      terminology: Object.freeze(terminology),
      bestPractices: Object.freeze([`best-practice-${bd}`]),
      analyzedAt: now, metadata: Object.freeze({}),
    });
    this.analyses.set(solutionId as string, analysis);
    await this.publishEvent({
      eventType: 'solution.domain.detected', classification: EventClassification.Result,
      solutionId, businessDomain, industry, terminologyCount: terminology.length, timestamp: now, metadata: Object.freeze({}),
    }, solutionId as string, 'DomainAnalysis');
    return analysis;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<DomainAnalysis | null> {
    return this.analyses.get(solutionId as string) ?? null;
  }
  async list(): Promise<readonly DomainAnalysis[]> { return Array.from(this.analyses.values()); }
""" + PEVT)

# ═══ 3. RequirementExtractor ═══
w('requirement-extractor.ts', HEADER % 'Requirement Extractor' + """
import type { IRequirementExtractor } from './contracts.js';
import type { Requirement, RequirementId, RequirementExtractorConfig, DomainAnalysis } from './types.js';
import type { SolutionId } from './types.js';
import { brandRequirementId, RequirementType, GoalPriority } from './types.js';
import { RequirementLimitExceededError } from './errors.js';

export class RequirementExtractor implements IRequirementExtractor {
  private readonly config: RequirementExtractorConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly requirements = new Map<string, Requirement>();
  private readonly solutionIndex = new Map<string, RequirementId[]>();

  constructor(config: RequirementExtractorConfig, eventBus?: InProcessEventBus | null) {
    this.config = config; this.eventBus = eventBus ?? null;
  }

  async extract(solutionId: SolutionId, rawInput: string, _domain: DomainAnalysis): Promise<readonly Requirement[]> {
    if (this.requirements.size >= this.config.maxRequirements) throw new RequirementLimitExceededError(this.config.maxRequirements);
    const now: Timestamp = new Date().toISOString();
    const sentences = rawInput.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
    const results: Requirement[] = [];
    for (const sentence of sentences.slice(0, 20)) {
      if (this.requirements.size >= this.config.maxRequirements) break;
      const type = /быстр|скорость|производител|performance/i.test(sentence)
        ? RequirementType.NonFunctional
        : /огранич|нельзя|constraint/i.test(sentence)
          ? RequirementType.Constraint
          : RequirementType.Functional;
      const id = brandRequirementId(`req-${crypto.randomUUID()}`);
      const req: Requirement = Object.freeze({
        id, solutionId, type, description: sentence,
        priority: GoalPriority.Medium, source: 'auto-extracted',
        constraints: Object.freeze([]), dependencies: Object.freeze([]),
        estimatedEffort: 'medium', createdAt: now, metadata: Object.freeze({}),
      });
      this.requirements.set(id as string, req);
      results.push(req);
    }
    const sKey = solutionId as string;
    this.solutionIndex.set(sKey, Object.freeze(results.map(r => r.id)));
    const fc = results.filter(r => r.type === RequirementType.Functional).length;
    const nc = results.filter(r => r.type === RequirementType.NonFunctional).length;
    const cc = results.filter(r => r.type === RequirementType.Constraint).length;
    await this.publishEvent({
      eventType: 'solution.requirements.extracted', classification: EventClassification.Result,
      solutionId, functionalCount: fc, nonFunctionalCount: nc, constraintCount: cc,
      timestamp: now, metadata: Object.freeze({}),
    }, sKey, 'Requirement');
    return Object.freeze(results);
  }

  async getById(id: RequirementId): Promise<Requirement | null> { return this.requirements.get(id as string) ?? null; }
  async getBySolutionId(solutionId: SolutionId): Promise<readonly Requirement[]> {
    const ids = this.solutionIndex.get(solutionId as string);
    if (!ids) return [];
    return Object.freeze(ids.map(id => this.requirements.get(id as string)).filter((r): r is Requirement => r !== undefined));
  }
  async list(filter?: Partial<{ type: RequirementType; priority: GoalPriority }>): Promise<readonly Requirement[]> {
    let results = Array.from(this.requirements.values());
    if (filter?.type) results = results.filter(r => r.type === filter.type);
    if (filter?.priority) results = results.filter(r => r.priority === filter.priority);
    return results;
  }
  async count(): Promise<number> { return this.requirements.size; }
""" + PEVT)

print('Generated 3/15 subsystems... continuing')
