/**
 * Requirement Extractor Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Extracts structured requirements from raw input and domain analysis.
 * Classifies requirements into Functional, NonFunctional, Constraint,
 * and Dependency types. Emits RequirementsExtractedEvent via the event bus.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, RequirementId, Requirement, DomainAnalysis,
  RequirementType, GoalPriority,
} from './types.js';
import { brandRequirementId, RequirementType as RequirementTypeEnum, GoalPriority as GoalPriorityEnum } from './types.js';
import type { IRequirementExtractor } from './contracts.js';
import type { RequirementExtractorConfig } from './types.js';
import { RequirementLimitExceededError } from './errors.js';
import type { RequirementsExtractedEvent } from './events.js';

/** Patterns for classifying requirement types */
const FUNCTIONAL_PATTERNS = Object.freeze([
  /(?:shall|should|must|will)\s+(?:be able to|support|provide|allow|enable|create|generate|process|handle|manage|track|display|show|send|receive|store|update|delete|import|export)\b/gi,
  /(?:system|application|solution|platform|software|tool)\s+(?:shall|should|must|will)\s+/gi,
  /(?:the\s+)?(?:user|admin|manager|operator)\s+(?:shall|should|must|can|needs? to|wants? to)\s+/gi,
  /(?:feature|capability|function)\s*:\s*/gi,
]);

const NON_FUNCTIONAL_PATTERNS = Object.freeze([
  /(?:performance|scalability|reliability|availability|latency|throughput|response time)/gi,
  /(?:secure|security|encrypt|authentication|authorization|ssl|tls|owasp)/gi,
  /(?:usable|usability|accessibility|responsive|mobile-friendly|wcag)/gi,
  /(?:maintainable|maintenance|modular|extensible|configurable)/gi,
  /(?:compatible|interoperab|integration|api|rest|graphql|soap)/gi,
  /(?:testable|testing|coverage|unit test|integration test)/gi,
  /(?:fast|slow|real-time|near-real-time|batch|streaming)/gi,
]);

const CONSTRAINT_PATTERNS = Object.freeze([
  /(?:budget|cost|deadline|timeline|schedule|due date|time limit)/gi,
  /(?:regulation|compliance|standard|policy|requirement|legal|law|statute)/gi,
  /(?:limit|max|min|range|bound|capacity|quota)/gi,
  /(?:must not|cannot|shall not|prohibited|restricted|forbidden)/gi,
]);

const DEPENDENCY_PATTERNS = Object.freeze([
  /(?:depends on|requires|needs?|integrates with|connects to|uses|leverages)/gi,
  /(?:third-party|external|vendor|library|framework|service|platform)/gi,
  /(?:api|sdk|plugin|module|package|component)\b/gi,
]);

/** Patterns for inferring priority */
const CRITICAL_PATTERNS = Object.freeze([
  /critical|urgent|blocker|showstopper|mission.critical|safety/i,
]);
const HIGH_PATTERNS = Object.freeze([
  /important|essential|must.have|key|primary|p1|priority.?1/i,
]);
const LOW_PATTERNS = Object.freeze([
  /low.priority|nice.to.have|optional|p3|priority.?3|future|later|eventually/i,
]);

export class RequirementExtractor implements IRequirementExtractor {
  private readonly config: RequirementExtractorConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly requirements = new Map<string, Requirement>();
  private readonly solutionIndex = new Map<string, RequirementId[]>();

  constructor(config: RequirementExtractorConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async extract(solutionId: SolutionId, rawInput: string, domain: DomainAnalysis): Promise<readonly Requirement[]> {
    if (this.requirements.size >= this.config.maxRequirements) {
      throw new RequirementLimitExceededError(this.config.maxRequirements);
    }

    const now: Timestamp = new Date().toISOString();
    const extracted: Requirement[] = [];

    // Extract raw requirement statements from input
    const statements = this.extractStatements(rawInput);

    for (const statement of statements) {
      if (extracted.length >= this.config.maxRequirements) break;

      const type = this.classifyType(statement, rawInput);
      const typeCount = extracted.filter(r => r.type === type).length;
      if (typeCount >= this.config.maxPerType) continue;

      const reqId = brandRequirementId(crypto.randomUUID());
      const priority = this.inferPriority(statement);
      const reqConstraints = this.extractReqConstraints(statement);
      const effort = this.estimateEffort(type, priority);

      const requirement: Requirement = Object.freeze({
        id: reqId,
        solutionId,
        type,
        description: statement,
        priority,
        source: 'input-analysis',
        constraints: Object.freeze(reqConstraints),
        dependencies: Object.freeze([]),
        estimatedEffort: effort,
        createdAt: now,
        metadata: Object.freeze({
          domain: domain.businessDomain,
          industry: domain.industry,
        }),
      });

      const key = reqId as string;
      this.requirements.set(key, requirement);

      const existing = this.solutionIndex.get(solutionId as string);
      if (existing) {
        existing.push(reqId);
      } else {
        this.solutionIndex.set(solutionId as string, [reqId]);
      }

      extracted.push(requirement);
    }

    // Emit extracted event
    const functionalCount = extracted.filter(r => r.type === RequirementTypeEnum.Functional).length;
    const nonFunctionalCount = extracted.filter(r => r.type === RequirementTypeEnum.NonFunctional).length;
    const constraintCount = extracted.filter(r => r.type === RequirementTypeEnum.Constraint).length;

    const event: RequirementsExtractedEvent = Object.freeze({
      eventType: 'solution.requirements.extracted',
      classification: EventClassification.Info,
      solutionId,
      functionalCount,
      nonFunctionalCount,
      constraintCount,
      timestamp: now,
      metadata: Object.freeze({ totalExtracted: extracted.length }),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'Requirement');

    return Object.freeze(extracted);
  }

  async getById(id: RequirementId): Promise<Requirement | null> {
    return this.requirements.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<readonly Requirement[]> {
    const ids = this.solutionIndex.get(solutionId as string);
    if (!ids) return Object.freeze([]);
    const results: Requirement[] = [];
    for (const id of ids) {
      const req = this.requirements.get(id as string);
      if (req) results.push(req);
    }
    return Object.freeze(results);
  }

  async list(filter?: Partial<{ type: RequirementType; priority: GoalPriority }>): Promise<readonly Requirement[]> {
    let results = [...this.requirements.values()];
    if (filter) {
      if (filter.type !== undefined) {
        results = results.filter(r => r.type === filter.type);
      }
      if (filter.priority !== undefined) {
        results = results.filter(r => r.priority === filter.priority);
      }
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.requirements.size;
  }

  // ─── Extraction Helpers ──────────────────────────────────────────

  private extractStatements(input: string): readonly string[] {
    const statements: string[] = [];

    // Split by sentence boundaries and bullet markers
    const parts = input
      .replace(/\n/g, '. ')
      .replace(/[-•*]\s+/g, '. ')
      .replace(/\d+[.)]\s+/g, '. ')
      .split(/[.!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 15); // Minimum meaningful length

    for (const part of parts) {
      // Only include statements that look like requirements
      if (this.looksLikeRequirement(part)) {
        // Deduplicate
        const normalized = part.toLowerCase().trim();
        if (!statements.some(s => s.toLowerCase().trim() === normalized)) {
          statements.push(part);
        }
      }
    }

    return statements;
  }

  private looksLikeRequirement(statement: string): boolean {
    const lower = statement.toLowerCase();
    return (
      /(?:shall|should|must|will|need|want|require|support|provide|enable|ensure|allow|manage|handle|track|display|process|store)/i.test(lower) ||
      /(?:system|user|admin|application|solution|platform|software|service)\b/i.test(lower)
    );
  }

  private classifyType(statement: string, fullInput: string): RequirementType {
    const combined = `${statement} ${fullInput}`.toLowerCase();

    // Score each type
    const scores: Record<string, number> = {
      Functional: 0,
      NonFunctional: 0,
      Constraint: 0,
      Dependency: 0,
    };

    for (const pattern of FUNCTIONAL_PATTERNS) {
      const matches = combined.match(pattern);
      if (matches) scores.Functional += matches.length;
    }
    for (const pattern of NON_FUNCTIONAL_PATTERNS) {
      const matches = combined.match(pattern);
      if (matches) scores.NonFunctional += matches.length;
    }
    for (const pattern of CONSTRAINT_PATTERNS) {
      const matches = combined.match(pattern);
      if (matches) scores.Constraint += matches.length;
    }
    for (const pattern of DEPENDENCY_PATTERNS) {
      const matches = combined.match(pattern);
      if (matches) scores.Dependency += matches.length;
    }

    // Return type with highest score, default to Functional
    let bestType = RequirementTypeEnum.Functional;
    let bestScore = 0;
    for (const [type, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type as RequirementType;
      }
    }

    return bestType;
  }

  private inferPriority(statement: string): GoalPriority {
    if (CRITICAL_PATTERNS.some(p => p.test(statement))) return GoalPriorityEnum.Critical;
    if (HIGH_PATTERNS.some(p => p.test(statement))) return GoalPriorityEnum.High;
    if (LOW_PATTERNS.some(p => p.test(statement))) return GoalPriorityEnum.Low;
    return GoalPriorityEnum.Medium;
  }

  private extractReqConstraints(statement: string): readonly string[] {
    const constraints: string[] = [];
    const matches = statement.match(/(?:must not|cannot|shall not|limited to|max|min|up to|at most|at least|no more than)\s+([^.!\n]+)/gi);
    if (matches) {
      for (const m of matches) {
        if (!constraints.includes(m)) constraints.push(m.trim());
      }
    }
    return constraints;
  }

  private estimateEffort(type: RequirementType, priority: GoalPriority): string {
    const baseEffort: Record<RequirementType, string> = {
      [RequirementTypeEnum.Functional]: 'Medium',
      [RequirementTypeEnum.NonFunctional]: 'High',
      [RequirementTypeEnum.Constraint]: 'Low',
      [RequirementTypeEnum.Dependency]: 'Medium',
    };
    const effort = baseEffort[type];
    if (priority === GoalPriorityEnum.Critical) return 'High';
    if (priority === GoalPriorityEnum.Low) return 'Low';
    return effort;
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
