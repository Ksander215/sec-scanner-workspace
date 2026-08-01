/**
 * Solution Builder Runtime — Domain Events
 * TASK-AIS-010A.000
 */

import type { Timestamp } from '../types/common.js';
import type {
  SolutionId, GoalId, BlueprintId,
  CapabilitySelectionId, WorkflowPackageId, KnowledgePackageId,
  AIConfigId, DesktopConfigId, ValidationReportId,
  DeploymentPlanId, CatalogEntryId, OptimizationReportId,
  GoalPriority, BusinessDomain,
  ValidationVerdict,
  DeploymentMode,
  WorkflowComplexity, SolutionState,
  AIProviderType, CostStrategy, ThemeType, DesktopLayout,
  KnowledgePackType, LifecycleTransition, SolutionBuilderState,
} from './types.js';
import { EventClassification } from '../types/common.js';

export interface GoalInterpretedEvent {
  readonly eventType: 'solution.goal.interpreted';
  readonly classification: EventClassification;
  readonly goalId: GoalId;
  readonly solutionId: SolutionId;
  readonly primaryGoal: string;
  readonly subGoalCount: number;
  readonly priority: GoalPriority;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface DomainDetectedEvent {
  readonly eventType: 'solution.domain.detected';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly businessDomain: BusinessDomain;
  readonly industry: string;
  readonly terminologyCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface RequirementsExtractedEvent {
  readonly eventType: 'solution.requirements.extracted';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly functionalCount: number;
  readonly nonFunctionalCount: number;
  readonly constraintCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionPlannedEvent {
  readonly eventType: 'solution.planned';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly blueprintId: BlueprintId;
  readonly capabilityCount: number;
  readonly estimatedCost: number;
  readonly estimatedROI: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CapabilitySelectedEvent {
  readonly eventType: 'solution.capability.selected';
  readonly classification: EventClassification;
  readonly selectionId: CapabilitySelectionId;
  readonly solutionId: SolutionId;
  readonly capabilityName: string;
  readonly required: boolean;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface WorkflowGeneratedEvent {
  readonly eventType: 'solution.workflow.generated';
  readonly classification: EventClassification;
  readonly packageId: WorkflowPackageId;
  readonly solutionId: SolutionId;
  readonly name: string;
  readonly complexity: WorkflowComplexity;
  readonly stepCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface KnowledgeComposedEvent {
  readonly eventType: 'solution.knowledge.composed';
  readonly classification: EventClassification;
  readonly packageId: KnowledgePackageId;
  readonly solutionId: SolutionId;
  readonly type: KnowledgePackType;
  readonly itemCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface AIConfiguredEvent {
  readonly eventType: 'solution.ai.configured';
  readonly classification: EventClassification;
  readonly configId: AIConfigId;
  readonly solutionId: SolutionId;
  readonly provider: AIProviderType;
  readonly model: string;
  readonly costStrategy: CostStrategy;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface DesktopComposedEvent {
  readonly eventType: 'solution.desktop.composed';
  readonly classification: EventClassification;
  readonly configId: DesktopConfigId;
  readonly solutionId: SolutionId;
  readonly layout: DesktopLayout;
  readonly theme: ThemeType;
  readonly windowCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ValidationCompletedEvent {
  readonly eventType: 'solution.validation.completed';
  readonly classification: EventClassification;
  readonly reportId: ValidationReportId;
  readonly solutionId: SolutionId;
  readonly verdict: ValidationVerdict;
  readonly complianceScore: number;
  readonly valueScore: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ValidationFailedEvent {
  readonly eventType: 'solution.validation.failed';
  readonly classification: EventClassification;
  readonly reportId: ValidationReportId;
  readonly solutionId: SolutionId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface OptimizationCompletedEvent {
  readonly eventType: 'solution.optimization.completed';
  readonly classification: EventClassification;
  readonly reportId: OptimizationReportId;
  readonly solutionId: SolutionId;
  readonly costReduction: number;
  readonly qualityImprovement: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface DeploymentPlannedEvent {
  readonly eventType: 'solution.deployment.planned';
  readonly classification: EventClassification;
  readonly planId: DeploymentPlanId;
  readonly solutionId: SolutionId;
  readonly mode: DeploymentMode;
  readonly stepCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionGeneratedEvent {
  readonly eventType: 'solution.generated';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly name: string;
  readonly version: string;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionInstalledEvent {
  readonly eventType: 'solution.installed';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionUpdatedEvent {
  readonly eventType: 'solution.updated';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionArchivedEvent {
  readonly eventType: 'solution.archived';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionStateChangedEvent {
  readonly eventType: 'solution.state.changed';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly fromState: SolutionState;
  readonly toState: SolutionState;
  readonly transition: LifecycleTransition;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionCatalogAddedEvent {
  readonly eventType: 'solution.catalog.added';
  readonly classification: EventClassification;
  readonly entryId: CatalogEntryId;
  readonly solutionId: SolutionId;
  readonly name: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionCatalogRemovedEvent {
  readonly eventType: 'solution.catalog.removed';
  readonly classification: EventClassification;
  readonly entryId: CatalogEntryId;
  readonly solutionId: SolutionId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionBuilderInitializedEvent {
  readonly eventType: 'solution.builder.initialized';
  readonly classification: EventClassification;
  readonly subsystemCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionBuilderStateChangedEvent {
  readonly eventType: 'solution.builder.stateChanged';
  readonly classification: EventClassification;
  readonly fromState: SolutionBuilderState;
  readonly toState: SolutionBuilderState;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionBuildCompletedEvent {
  readonly eventType: 'solution.build.completed';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly durationMs: number;
  readonly manifestValid: boolean;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export type SolutionBuilderEvent =
  | GoalInterpretedEvent
  | DomainDetectedEvent
  | RequirementsExtractedEvent
  | SolutionPlannedEvent
  | CapabilitySelectedEvent
  | WorkflowGeneratedEvent
  | KnowledgeComposedEvent
  | AIConfiguredEvent
  | DesktopComposedEvent
  | ValidationCompletedEvent
  | ValidationFailedEvent
  | OptimizationCompletedEvent
  | DeploymentPlannedEvent
  | SolutionGeneratedEvent
  | SolutionInstalledEvent
  | SolutionUpdatedEvent
  | SolutionArchivedEvent
  | SolutionStateChangedEvent
  | SolutionCatalogAddedEvent
  | SolutionCatalogRemovedEvent
  | SolutionBuilderInitializedEvent
  | SolutionBuilderStateChangedEvent
  | SolutionBuildCompletedEvent;
