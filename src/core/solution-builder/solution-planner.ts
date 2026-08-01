/**
 * Solution Planner Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Creates SolutionBlueprint objects from goals, requirements, and domain analysis.
 * Determines runtime/capability dependencies, workflow/knowledge packages,
 * cost estimates, ROI, and complexity. Emits SolutionPlannedEvent via the event bus.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, BlueprintId, SolutionBlueprint, Goal,
  DomainAnalysis, WorkflowComplexity, Requirement,
} from './types.js';
import { brandBlueprintId, WorkflowComplexity as ComplexityEnum } from './types.js';
import type { ISolutionPlanner } from './contracts.js';
import type { SolutionPlannerConfig } from './types.js';
import { BlueprintLimitExceededError } from './errors.js';
import type { SolutionPlannedEvent } from './events.js';

/** Complexity thresholds */
const COMPLEXITY_THRESHOLDS = Object.freeze({
  simple: { maxReqs: 5, maxSubGoals: 3 },
  moderate: { maxReqs: 15, maxSubGoals: 8 },
  complex: { maxReqs: 30, maxSubGoals: 15 },
} as const);

/** Estimated costs per complexity level (monthly USD) */
const COST_ESTIMATES: Record<WorkflowComplexity, { min: number; max: number }> = Object.freeze({
  [ComplexityEnum.Simple]: Object.freeze({ min: 100, max: 500 }),
  [ComplexityEnum.Moderate]: Object.freeze({ min: 500, max: 2000 }),
  [ComplexityEnum.Complex]: Object.freeze({ min: 2000, max: 10000 }),
  [ComplexityEnum.Enterprise]: Object.freeze({ min: 10000, max: 100000 }),
});

/** Base ROI multipliers per complexity */
const ROI_MULTIPLIERS: Record<WorkflowComplexity, { min: number; max: number }> = Object.freeze({
  [ComplexityEnum.Simple]: Object.freeze({ min: 1.2, max: 2.0 }),
  [ComplexityEnum.Moderate]: Object.freeze({ min: 1.5, max: 3.0 }),
  [ComplexityEnum.Complex]: Object.freeze({ min: 2.0, max: 5.0 }),
  [ComplexityEnum.Enterprise]: Object.freeze({ min: 3.0, max: 10.0 }),
});

export class SolutionPlanner implements ISolutionPlanner {
  private readonly config: SolutionPlannerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly blueprints = new Map<string, SolutionBlueprint>();
  private readonly solutionIndex = new Map<string, BlueprintId>();

  constructor(config: SolutionPlannerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async plan(
    solutionId: SolutionId,
    goal: Goal,
    requirements: readonly Requirement[],
    domain: DomainAnalysis,
  ): Promise<SolutionBlueprint> {
    if (this.blueprints.size >= this.config.maxBlueprints) {
      throw new BlueprintLimitExceededError(this.config.maxBlueprints);
    }

    const now: Timestamp = new Date().toISOString();
    const blueprintId = brandBlueprintId(crypto.randomUUID());

    const complexity = this.assessComplexity(requirements, goal);
    const runtimeDependencies = this.determineRuntimeDependencies(requirements, domain);
    const capabilityDependencies = this.determineCapabilityDependencies(requirements, domain);

    // Generate placeholder package IDs (actual composition handled by dedicated subsystems)
    const workflowPackages: string[] = [];
    const knowledgePackages: string[] = [];

    const estimatedCost = this.estimateCost(complexity, requirements);
    const estimatedROI = this.estimateROI(complexity, estimatedCost);

    const name = this.generateBlueprintName(goal, domain);
    const description = this.generateBlueprintDescription(goal, domain, requirements);

    const blueprint: SolutionBlueprint = Object.freeze({
      id: blueprintId,
      solutionId,
      name,
      description,
      runtimeDependencies: Object.freeze(runtimeDependencies),
      capabilityDependencies: Object.freeze(capabilityDependencies),
      workflowPackages: Object.freeze(workflowPackages as never[]),
      knowledgePackages: Object.freeze(knowledgePackages as never[]),
      aiConfigId: null,
      desktopConfigId: null,
      estimatedCost,
      estimatedROI,
      complexity,
      createdAt: now,
      metadata: Object.freeze({
        requirementCount: requirements.length,
        subGoalCount: goal.subGoals.length,
        businessDomain: domain.businessDomain,
      }),
    });

    const key = blueprintId as string;
    this.blueprints.set(key, blueprint);
    this.solutionIndex.set(solutionId as string, blueprintId);

    const event: SolutionPlannedEvent = Object.freeze({
      eventType: 'solution.planned',
      classification: EventClassification.Info,
      solutionId,
      blueprintId,
      capabilityCount: capabilityDependencies.length,
      estimatedCost,
      estimatedROI,
      timestamp: now,
      metadata: Object.freeze({ complexity, runtimeDependencyCount: runtimeDependencies.length }),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'SolutionBlueprint');

    return blueprint;
  }

  async getById(id: BlueprintId): Promise<SolutionBlueprint | null> {
    return this.blueprints.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<SolutionBlueprint | null> {
    const bpId = this.solutionIndex.get(solutionId as string);
    if (!bpId) return null;
    return this.blueprints.get(bpId as string) ?? null;
  }

  async list(): Promise<readonly SolutionBlueprint[]> {
    return Object.freeze([...this.blueprints.values()]);
  }

  async count(): Promise<number> {
    return this.blueprints.size;
  }

  // ─── Planning Helpers ───────────────────────────────────────────

  private assessComplexity(requirements: readonly Requirement[], goal: Goal): WorkflowComplexity {
    const reqCount = requirements.length;
    const subGoalCount = goal.subGoals.length;

    if (reqCount <= COMPLEXITY_THRESHOLDS.simple.maxReqs && subGoalCount <= COMPLEXITY_THRESHOLDS.simple.maxSubGoals) {
      return ComplexityEnum.Simple;
    }
    if (reqCount <= COMPLEXITY_THRESHOLDS.moderate.maxReqs && subGoalCount <= COMPLEXITY_THRESHOLDS.moderate.maxSubGoals) {
      return ComplexityEnum.Moderate;
    }
    if (reqCount <= COMPLEXITY_THRESHOLDS.complex.maxReqs && subGoalCount <= COMPLEXITY_THRESHOLDS.complex.maxSubGoals) {
      return ComplexityEnum.Complex;
    }
    return ComplexityEnum.Enterprise;
  }

  private determineRuntimeDependencies(requirements: readonly Requirement[], domain: DomainAnalysis): readonly string[] {
    const deps = new Set<string>();

    // Core runtime dependencies every solution needs
    deps.add('core.runtime');
    deps.add('core.events');

    // Add domain-specific runtime dependencies
    const domainDeps: Partial<Record<string, readonly string[]>> = {
      Healthcare: Object.freeze(['core.compliance', 'core.audit']),
      Finance: Object.freeze(['core.compliance', 'core.encryption']),
      ECommerce: Object.freeze(['core.payment', 'core.inventory']),
      Education: Object.freeze(['core.content', 'core.analytics']),
      Manufacturing: Object.freeze(['core.iot', 'core.analytics']),
      Logistics: Object.freeze(['core.tracking', 'core.notifications']),
    };

    const domainSpecific = domainDeps[domain.businessDomain];
    if (domainSpecific) {
      for (const d of domainSpecific) deps.add(d);
    }

    // Add capability-dependent runtime modules
    for (const req of requirements) {
      if (/ai|ml|machine learning|nlp|natural language/i.test(req.description)) {
        deps.add('core.ai-provider');
      }
      if (/workflow|process|automat/i.test(req.description)) {
        deps.add('core.workflow');
      }
      if (/knowledge|data|information/i.test(req.description)) {
        deps.add('core.knowledge');
      }
      if (/security|auth|encrypt/i.test(req.description)) {
        deps.add('core.security');
      }
      if (/monitor|health|diagnostic/i.test(req.description)) {
        deps.add('core.diagnostics');
      }
    }

    return Object.freeze([...deps].slice(0, this.config.maxDependencies));
  }

  private determineCapabilityDependencies(requirements: readonly Requirement[], _domain: DomainAnalysis): readonly string[] {
    const caps = new Set<string>();

    for (const req of requirements) {
      const desc = req.description.toLowerCase();
      if (/chat|conversation|dialog|message|talk/i.test(desc)) {
        caps.add('chat-engine');
      }
      if (/report|dashboard|visual|chart|graph/i.test(desc)) {
        caps.add('reporting');
      }
      if (/search|find|lookup|query/i.test(desc)) {
        caps.add('search');
      }
      if (/notify|alert|remind|push/i.test(desc)) {
        caps.add('notifications');
      }
      if (/schedule|calendar|event|meeting/i.test(desc)) {
        caps.add('scheduling');
      }
      if (/document|pdf|doc|generate document/i.test(desc)) {
        caps.add('document-generation');
      }
      if (/email|mail|smtp/i.test(desc)) {
        caps.add('email');
      }
      if (/file|upload|download|storage/i.test(desc)) {
        caps.add('file-management');
      }
    }

    return Object.freeze([...caps].slice(0, this.config.maxDependencies));
  }

  private estimateCost(complexity: WorkflowComplexity, requirements: readonly Requirement[]): number {
    const range = COST_ESTIMATES[complexity];
    const base = range.min + (range.max - range.min) * 0.5;
    // Scale by requirement count
    const scaling = Math.min(1.5, 1 + (requirements.length / 30) * 0.5);
    return Math.round(base * scaling * 100) / 100;
  }

  private estimateROI(complexity: WorkflowComplexity, estimatedCost: number): number {
    const range = ROI_MULTIPLIERS[complexity];
    const multiplier = range.min + (range.max - range.min) * 0.5;
    return Math.round(estimatedCost * multiplier * 100) / 100;
  }

  private generateBlueprintName(goal: Goal, domain: DomainAnalysis): string {
    // Create a concise name from the primary goal
    const primaryWords = goal.primaryGoal
      .split(/\s+/)
      .slice(0, 4)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return `${domain.businessDomain}: ${primaryWords}`;
  }

  private generateBlueprintDescription(goal: Goal, domain: DomainAnalysis, requirements: readonly Requirement[]): string {
    const reqSummary = `${requirements.length} requirements (${requirements.filter(r => r.type === 'Functional').length} functional, ${requirements.filter(r => r.type === 'NonFunctional').length} non-functional)`;
    return `${goal.primaryGoal}. Domain: ${domain.industry}. ${reqSummary}.`;
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
