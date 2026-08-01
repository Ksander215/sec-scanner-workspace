/**
 * Deployment Planner Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Creates deployment plans from solution manifests. Generates forward steps
 * and rollback steps based on manifest complexity. Emits DeploymentPlannedEvent.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, DeploymentPlanId, DeploymentPlan,
  DeploymentMode, SolutionManifest, WorkflowComplexity,
} from './types.js';
import { brandDeploymentPlanId, DeploymentMode as DMode, WorkflowComplexity as WComp } from './types.js';
import type { IDeploymentPlanner } from './contracts.js';
import type { DeploymentPlannerConfig } from './types.js';
import { DeploymentPlanningError } from './errors.js';
import type { DeploymentPlannedEvent } from './events.js';

export class DeploymentPlanner implements IDeploymentPlanner {
  private readonly config: DeploymentPlannerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly plans = new Map<string, DeploymentPlan>();
  private readonly solutionIndex = new Map<string, DeploymentPlanId>();

  constructor(config: DeploymentPlannerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async plan(solutionId: SolutionId, manifest: SolutionManifest): Promise<DeploymentPlan> {
    if (this.plans.size >= this.config.maxPlans) {
      throw new DeploymentPlanningError(
        `Maximum deployment plans exceeded: ${this.config.maxPlans}`,
        { maxPlans: this.config.maxPlans },
      );
    }

    const now: Timestamp = new Date().toISOString();
    const planId = brandDeploymentPlanId(crypto.randomUUID());

    const mode = this.determineDeploymentMode(manifest);
    const { steps, rollbackSteps, estimatedDowntime } = this.generatePlanSteps(manifest, mode);

    const plan: DeploymentPlan = Object.freeze({
      id: planId,
      solutionId,
      mode,
      steps: Object.freeze(steps),
      rollbackSteps: Object.freeze(rollbackSteps),
      estimatedDowntime,
      createdAt: now,
      metadata: Object.freeze({
        manifestName: manifest.name,
        manifestVersion: manifest.version,
        stepCount: steps.length,
        rollbackCount: rollbackSteps.length,
      }),
    });

    const key = planId as string;
    this.plans.set(key, plan);
    this.solutionIndex.set(solutionId as string, planId);

    const event: DeploymentPlannedEvent = Object.freeze({
      eventType: 'solution.deployment.planned',
      classification: EventClassification.Info,
      planId,
      solutionId,
      mode,
      stepCount: steps.length,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'DeploymentPlan');

    return plan;
  }

  async getById(id: DeploymentPlanId): Promise<DeploymentPlan | null> {
    return this.plans.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<DeploymentPlan | null> {
    const planId = this.solutionIndex.get(solutionId as string);
    if (!planId) return null;
    return this.plans.get(planId as string) ?? null;
  }

  async list(): Promise<readonly DeploymentPlan[]> {
    return Object.freeze([...this.plans.values()]);
  }

  async count(): Promise<number> {
    return this.plans.size;
  }

  // ─── Planning Logic ───────────────────────────────────────────────

  private determineDeploymentMode(manifest: SolutionManifest): DeploymentMode {
    // Cloud-facing or external marketplace dependencies suggest Cloud/Hybrid
    const hasExternalDeps = manifest.marketplaceDependencies.length > 0;
    const hasCloudAI = manifest.aiConfiguration !== null
      && manifest.aiConfiguration.provider !== 'Local';
    const isEnterprise = manifest.metrics.solutionComplexity === WComp.Enterprise;

    if (isEnterprise || (hasExternalDeps && hasCloudAI)) {
      return DMode.Hybrid;
    }
    if (hasExternalDeps || hasCloudAI) {
      return DMode.Cloud;
    }
    return DMode.Local;
  }

  private generatePlanSteps(
    manifest: SolutionManifest,
    mode: DeploymentMode,
  ): { steps: string[]; rollbackSteps: string[]; estimatedDowntime: string } {
    const steps: string[] = [];
    const rollbackSteps: string[] = [];
    const complexity = manifest.metrics.solutionComplexity;

    // Phase 1: Pre-deployment validation
    steps.push('Validate solution manifest integrity and digital signature');
    steps.push('Verify all capability dependencies are available and compatible');
    rollbackSteps.push('Mark deployment as failed and notify stakeholders');

    // Phase 2: Environment preparation
    if (mode === DMode.Cloud || mode === DMode.Hybrid) {
      steps.push('Provision cloud infrastructure and networking resources');
      steps.push('Configure cloud security groups and access controls');
      rollbackSteps.push('Release provisioned cloud infrastructure');
      rollbackSteps.push('Remove cloud security group rules');
    } else {
      steps.push('Verify local environment prerequisites and system resources');
      rollbackSteps.push('Clean up local environment artifacts');
    }

    // Phase 3: Core deployment
    steps.push('Deploy workflow packages and register execution pipelines');
    rollbackSteps.push('Unregister execution pipelines and remove workflow packages');

    if (manifest.knowledgePackages.length > 0) {
      steps.push('Install knowledge packages and initialize domain context');
      rollbackSteps.push('Remove knowledge packages and clear domain context');
    }

    if (manifest.aiConfiguration) {
      steps.push(`Configure AI provider (${manifest.aiConfiguration.provider}) with model ${manifest.aiConfiguration.model}`);
      steps.push('Validate AI configuration with test inference call');
      rollbackSteps.push('Remove AI provider configuration and release resources');
    }

    if (manifest.desktopConfiguration) {
      steps.push('Deploy desktop configuration with layout and navigation');
      rollbackSteps.push('Revert desktop configuration to previous state');
    }

    // Phase 4: Capability installation
    if (manifest.capabilityDependencies.length > 0) {
      steps.push(`Install ${manifest.capabilityDependencies.length} capability dependencies`);
      rollbackSteps.push(`Uninstall ${manifest.capabilityDependencies.length} capability dependencies`);
    }

    // Phase 5: Post-deployment
    steps.push('Run deployment smoke tests and health checks');
    steps.push('Register solution in the runtime registry and update catalog');
    rollbackSteps.push('Unregister solution from runtime registry and catalog');

    if (complexity === WComp.Complex || complexity === WComp.Enterprise) {
      steps.push('Execute comprehensive integration test suite');
      steps.push('Set up monitoring, alerting, and observability dashboards');
      rollbackSteps.push('Remove monitoring rules and alerting configurations');
    }

    steps.push('Mark deployment as complete and transition solution to Running state');
    rollbackSteps.push('Transition solution back to previous lifecycle state');

    // Cap at configured maximum
    const cappedSteps = steps.slice(0, this.config.maxSteps);
    const cappedRollback = rollbackSteps.slice(0, this.config.maxSteps);

    // Estimate downtime based on complexity
    const estimatedDowntime = this.estimateDowntime(complexity, mode);

    // Reverse rollback steps so they are executed in correct order
    cappedRollback.reverse();

    return { steps: cappedSteps, rollbackSteps: cappedRollback, estimatedDowntime };
  }

  private estimateDowntime(complexity: WorkflowComplexity, mode: DeploymentMode): string {
    const baseMinutes: Record<WorkflowComplexity, number> = {
      [WComp.Simple]: 2,
      [WComp.Moderate]: 5,
      [WComp.Complex]: 15,
      [WComp.Enterprise]: 30,
    };

    let minutes = baseMinutes[complexity];
    if (mode === DMode.Cloud) minutes *= 1.5;
    if (mode === DMode.Hybrid) minutes *= 2;

    const rounded = Math.ceil(minutes);
    if (rounded < 5) return '< 5 minutes';
    if (rounded < 15) return '5–15 minutes';
    if (rounded < 30) return '15–30 minutes';
    return '30–60 minutes';
  }

  // ─── Event Publishing ──────────────────────────────────────────────

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
