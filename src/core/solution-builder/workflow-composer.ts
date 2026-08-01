/**
 * Workflow Composer Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Composes workflow packages from solution blueprints.
 * Generates workflow steps based on blueprint complexity and dependencies.
 * Emits WorkflowGeneratedEvent via the event bus.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, WorkflowPackageId, WorkflowPackage,
  SolutionBlueprint, WorkflowComplexity,
} from './types.js';
import { brandWorkflowPackageId, WorkflowComplexity as WfComplexity } from './types.js';
import type { IWorkflowComposer } from './contracts.js';
import type { WorkflowComposerConfig } from './types.js';
import { WorkflowCompositionError } from './errors.js';
import type { WorkflowGeneratedEvent } from './events.js';

export class WorkflowComposer implements IWorkflowComposer {
  private readonly config: WorkflowComposerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly packages = new Map<string, WorkflowPackage>();
  private readonly solutionIndex = new Map<string, WorkflowPackageId[]>();

  constructor(config: WorkflowComposerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async compose(solutionId: SolutionId, blueprint: SolutionBlueprint): Promise<WorkflowPackage> {
    if (this.packages.size >= this.config.maxPackages) {
      throw new WorkflowCompositionError(
        `Maximum workflow packages exceeded: ${this.config.maxPackages}`,
        { maxPackages: this.config.maxPackages },
      );
    }

    const now: Timestamp = new Date().toISOString();
    const packageId = brandWorkflowPackageId(crypto.randomUUID());

    const steps = this.generateSteps(blueprint);
    const complexity = blueprint.complexity;
    const estimatedDuration = this.estimateDuration(complexity, steps.length);

    const pkg: WorkflowPackage = Object.freeze({
      id: packageId,
      solutionId,
      name: `Workflow for ${blueprint.name}`,
      description: `Auto-composed workflow for blueprint: ${blueprint.description}`,
      steps: Object.freeze(steps),
      complexity,
      estimatedDuration,
      createdAt: now,
      metadata: Object.freeze({ blueprintId: blueprint.id }),
    });

    const key = packageId as string;
    this.packages.set(key, pkg);

    const existing = this.solutionIndex.get(solutionId as string);
    if (existing) {
      this.solutionIndex.set(solutionId as string, [...existing, packageId]);
    } else {
      this.solutionIndex.set(solutionId as string, [packageId]);
    }

    const event: WorkflowGeneratedEvent = Object.freeze({
      eventType: 'solution.workflow.generated',
      classification: EventClassification.Info,
      packageId,
      solutionId,
      name: pkg.name,
      complexity,
      stepCount: steps.length,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'WorkflowPackage');

    return pkg;
  }

  async getById(id: WorkflowPackageId): Promise<WorkflowPackage | null> {
    return this.packages.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<readonly WorkflowPackage[]> {
    const ids = this.solutionIndex.get(solutionId as string);
    if (!ids || ids.length === 0) return Object.freeze([]);
    const results: WorkflowPackage[] = [];
    for (const id of ids) {
      const pkg = this.packages.get(id as string);
      if (pkg) results.push(pkg);
    }
    return Object.freeze(results);
  }

  async list(): Promise<readonly WorkflowPackage[]> {
    return Object.freeze([...this.packages.values()]);
  }

  async count(): Promise<number> {
    return this.packages.size;
  }

  // ─── Step Generation ────────────────────────────────────────────

  private generateSteps(blueprint: SolutionBlueprint): readonly string[] {
    const steps: string[] = [];
    const complexity = blueprint.complexity;

    // Initialisation step
    steps.push('Initialize solution environment and load configuration');

    // Capability dependency steps
    for (const dep of blueprint.capabilityDependencies) {
      steps.push(`Acquire and validate capability: ${dep}`);
    }

    // Runtime dependency steps
    for (const dep of blueprint.runtimeDependencies) {
      steps.push(`Install runtime dependency: ${dep}`);
    }

    // Complexity-specific workflow steps
    switch (complexity) {
      case WfComplexity.Simple:
        steps.push('Execute primary workflow');
        steps.push('Validate output against requirements');
        break;

      case WfComplexity.Moderate:
        steps.push('Execute data preparation pipeline');
        steps.push('Run primary workflow with validation gates');
        steps.push('Execute quality assurance checks');
        steps.push('Generate output and summary report');
        break;

      case WfComplexity.Complex:
        steps.push('Configure parallel execution environment');
        steps.push('Execute data ingestion and transformation pipeline');
        steps.push('Run primary workflow with checkpointing');
        steps.push('Execute secondary analysis workflows');
        steps.push('Aggregate and correlate results');
        steps.push('Run comprehensive quality assurance suite');
        steps.push('Generate detailed output, reports, and audit trail');
        break;

      case WfComplexity.Enterprise:
        steps.push('Initialize distributed execution coordinator');
        steps.push('Provision isolated tenant workspaces');
        steps.push('Execute multi-stage data pipeline with resilience');
        steps.push('Run primary workflow with real-time monitoring');
        steps.push('Execute parallel secondary workflows');
        steps.push('Perform cross-workflow dependency resolution');
        steps.push('Aggregate, normalize, and correlate all results');
        steps.push('Run enterprise-grade compliance and security audit');
        steps.push('Execute performance benchmarking and optimization');
        steps.push('Generate enterprise output package with full traceability');
        steps.push('Publish metrics and trigger downstream notifications');
        break;
    }

    // Cap at config limit
    return steps.slice(0, this.config.maxStepsPerPackage);
  }

  private estimateDuration(complexity: WorkflowComplexity, stepCount: number): string {
    const baseMinutes: Record<WorkflowComplexity, number> = {
      [WfComplexity.Simple]: 2,
      [WfComplexity.Moderate]: 5,
      [WfComplexity.Complex]: 15,
      [WfComplexity.Enterprise]: 45,
    };
    const total = baseMinutes[complexity] * stepCount;
    if (total < 60) return `${total} minutes`;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
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
