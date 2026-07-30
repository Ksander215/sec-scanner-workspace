/**
 * Runtime Bridge Contracts — Adapters for existing AIS Runtimes
 * TASK-AIS-005A.000 — Platform Integration Foundation
 */
import type { RuntimeContract, HealthCheckResult, PlatformContext } from './types.js';
import { HealthStatus as HS } from './types.js';

export interface RuntimeBridgeOptions {
  id: string;
  name: string;
  version: string;
  description: string;
  dependencies?: string[];
  instance: unknown;
  healthCheck?: () => Promise<HealthCheckResult>;
  onInitialize?: (ctx: PlatformContext) => Promise<void>;
  onActivate?: (ctx: PlatformContext) => Promise<void>;
  onShutdown?: (ctx: PlatformContext) => Promise<void>;
}

export function createRuntimeBridge(options: RuntimeBridgeOptions): RuntimeContract {
  const noopInit = async (_ctx: PlatformContext): Promise<void> => { void _ctx; };
  const noopHealth = async (): Promise<HealthCheckResult> => ({
    status: HS.Healthy,
    details: 'OK',
    checkedAt: new Date().toISOString(),
    responseTimeMs: 0,
  });
  return {
    id: options.id,
    name: options.name,
    version: options.version,
    description: options.description,
    dependencies: options.dependencies ?? [],
    initialize: options.onInitialize ?? noopInit,
    activate: options.onActivate ?? noopInit,
    shutdown: options.onShutdown ?? noopInit,
    health: options.healthCheck ?? noopHealth,
  };
}

export function createMemoryRuntimeBridge(
  memoryRuntime: { initialize?(): Promise<void>; shutdown?(): Promise<void> },
  version = '1.0.0',
): RuntimeContract {
  return createRuntimeBridge({
    id: 'memory-runtime',
    name: 'Memory Runtime',
    version,
    description: '3-tier memory management',
    dependencies: [],
    instance: memoryRuntime,
    onInitialize: memoryRuntime.initialize
      ? async (_ctx: PlatformContext) => { void _ctx; await memoryRuntime.initialize!(); }
      : undefined,
    onShutdown: memoryRuntime.shutdown
      ? async (_ctx: PlatformContext) => { void _ctx; await memoryRuntime.shutdown!(); }
      : undefined,
  });
}

export function createKnowledgeRuntimeBridge(knowledgeRuntime: unknown, version = '1.0.0'): RuntimeContract {
  return createRuntimeBridge({
    id: 'knowledge-runtime',
    name: 'Knowledge Runtime',
    version,
    description: 'Knowledge base management',
    dependencies: ['memory-runtime'],
    instance: knowledgeRuntime,
  });
}

export function createIdentityRuntimeBridge(identityRuntime: unknown, version = '1.0.0'): RuntimeContract {
  return createRuntimeBridge({
    id: 'identity-runtime',
    name: 'Identity Runtime',
    version,
    description: 'Identity and preference management',
    dependencies: ['memory-runtime'],
    instance: identityRuntime,
  });
}

export function createCapabilityRuntimeBridge(capabilityRuntime: unknown, version = '1.0.0'): RuntimeContract {
  return createRuntimeBridge({
    id: 'capability-runtime',
    name: 'Capability Runtime',
    version,
    description: 'Capability pack management',
    dependencies: ['memory-runtime', 'identity-runtime'],
    instance: capabilityRuntime,
  });
}

export function createWorkflowRuntimeBridge(workflowRuntime: unknown, version = '1.0.0'): RuntimeContract {
  return createRuntimeBridge({
    id: 'workflow-runtime',
    name: 'Workflow Runtime',
    version,
    description: 'Workflow management',
    dependencies: ['memory-runtime', 'knowledge-runtime'],
    instance: workflowRuntime,
  });
}

export function createCognitiveRuntimeBridge(cognitiveRuntime: unknown, version = '1.0.0'): RuntimeContract {
  return createRuntimeBridge({
    id: 'cognitive-runtime',
    name: 'Cognitive Runtime',
    version,
    description: 'Cognitive processing and AI integration',
    dependencies: ['memory-runtime', 'knowledge-runtime', 'identity-runtime'],
    instance: cognitiveRuntime,
  });
}

export function createExperienceRuntimeBridge(experienceRuntime: unknown, version = '1.0.0'): RuntimeContract {
  return createRuntimeBridge({
    id: 'experience-runtime',
    name: 'Experience Runtime',
    version,
    description: 'UX personalization and adaptation',
    dependencies: ['memory-runtime', 'identity-runtime', 'cognitive-runtime'],
    instance: experienceRuntime,
  });
}

export function createDesktopRuntimeBridge(desktopRuntime: unknown, version = '1.0.0'): RuntimeContract {
  return createRuntimeBridge({
    id: 'desktop-foundation',
    name: 'Desktop Foundation',
    version,
    description: 'Desktop application runtime',
    dependencies: ['memory-runtime', 'knowledge-runtime', 'identity-runtime', 'cognitive-runtime', 'experience-runtime'],
    instance: desktopRuntime,
  });
}
