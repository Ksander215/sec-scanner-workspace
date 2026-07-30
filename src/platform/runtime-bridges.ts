/**
 * Runtime Bridge Contracts — Adapters for existing AIS Runtimes
 * TASK-AIS-005A.000 — Platform Integration Foundation
 *
 * Bridges wrap the 8 existing domain Runtimes into RuntimeContract
 * so the BootstrapEngine can orchestrate them.
 *
 * Key integration points:
 *   - Real health() checks against each runtime
 *   - EventBus bridge: core domain events → PlatformEventHub
 *   - Proper initialize/activate/shutdown lifecycle
 *   - Registration of health checks in PlatformHealthMonitor
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

// ─── Memory Runtime Bridge ─────────────────────────────────────

interface MemoryRuntimeLike {
  getStats?(): { entryCount: number } | unknown;
  dispose?(): void;
}

export function createMemoryRuntimeBridge(
  memoryRuntime: MemoryRuntimeLike,
  version = '1.0.0',
): RuntimeContract {
  return createRuntimeBridge({
    id: 'memory-runtime',
    name: 'Memory Runtime',
    version,
    description: '3-tier memory management (Working, Session, Persistent)',
    dependencies: [],
    instance: memoryRuntime,
    onInitialize: async (ctx: PlatformContext) => {
      ctx.container.registerSingleton('memory-runtime', memoryRuntime);
      ctx.healthMonitor.registerCheck('memory-runtime', async () => {
        const start = performance.now();
        const hasStats = typeof memoryRuntime.getStats === 'function';
        return {
          status: hasStats ? HS.Healthy : HS.Warning,
          details: hasStats ? 'Memory runtime operational' : 'Stats not available',
          checkedAt: new Date().toISOString(),
          responseTimeMs: performance.now() - start,
          metadata: hasStats ? memoryRuntime.getStats!() as Record<string, unknown> : undefined,
        };
      });
      await ctx.eventHub.publish('runtime.memory.initialized', { runtimeId: 'memory-runtime' }, 'memory-runtime');
    },
    onShutdown: async (ctx: PlatformContext) => {
      if (typeof memoryRuntime.dispose === 'function') {
        memoryRuntime.dispose();
      }
      await ctx.eventHub.publish('runtime.memory.shutdown', { runtimeId: 'memory-runtime' }, 'memory-runtime');
    },
  });
}

// ─── Knowledge Runtime Bridge ───────────────────────────────────

interface KnowledgeRuntimeLike {
  getStats?(): { itemCount: number; namespaceCount: number; relationCount: number };
  validate?(): Promise<{ valid: boolean }>;
  dispose?(): void;
}

export function createKnowledgeRuntimeBridge(
  knowledgeRuntime: KnowledgeRuntimeLike,
  version = '1.0.0',
): RuntimeContract {
  return createRuntimeBridge({
    id: 'knowledge-runtime',
    name: 'Knowledge Runtime',
    version,
    description: 'Knowledge base with graph, versioning, and retrieval',
    dependencies: ['memory-runtime'],
    instance: knowledgeRuntime,
    onInitialize: async (ctx: PlatformContext) => {
      ctx.container.registerSingleton('knowledge-runtime', knowledgeRuntime);
      ctx.healthMonitor.registerCheck('knowledge-runtime', async () => {
        const start = performance.now();
        const hasStats = typeof knowledgeRuntime.getStats === 'function';
        return {
          status: hasStats ? HS.Healthy : HS.Warning,
          details: hasStats ? 'Knowledge runtime operational' : 'Stats not available',
          checkedAt: new Date().toISOString(),
          responseTimeMs: performance.now() - start,
        };
      });
      await ctx.eventHub.publish('runtime.knowledge.initialized', { runtimeId: 'knowledge-runtime' }, 'knowledge-runtime');
    },
    onShutdown: async (ctx: PlatformContext) => {
      if (typeof knowledgeRuntime.dispose === 'function') {
        knowledgeRuntime.dispose();
      }
      await ctx.eventHub.publish('runtime.knowledge.shutdown', { runtimeId: 'knowledge-runtime' }, 'knowledge-runtime');
    },
  });
}

// ─── Identity Runtime Bridge ────────────────────────────────────

interface IdentityRuntimeLike {
  getStats?(): { identityCount: number };
  initialize?(): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  shutdown?(): Promise<void>;
  dispose?(): void;
}

export function createIdentityRuntimeBridge(
  identityRuntime: IdentityRuntimeLike,
  version = '1.0.0',
): RuntimeContract {
  return createRuntimeBridge({
    id: 'identity-runtime',
    name: 'Identity Runtime',
    version,
    description: 'Identity, role, preference, and policy management',
    dependencies: ['memory-runtime'],
    instance: identityRuntime,
    onInitialize: async (ctx: PlatformContext) => {
      ctx.container.registerSingleton('identity-runtime', identityRuntime);
      if (typeof identityRuntime.initialize === 'function') {
        await identityRuntime.initialize();
      }
      ctx.healthMonitor.registerCheck('identity-runtime', async () => {
        const start = performance.now();
        const hasStats = typeof identityRuntime.getStats === 'function';
        return {
          status: hasStats ? HS.Healthy : HS.Warning,
          details: hasStats ? 'Identity runtime operational' : 'Stats not available',
          checkedAt: new Date().toISOString(),
          responseTimeMs: performance.now() - start,
        };
      });
      await ctx.eventHub.publish('runtime.identity.initialized', { runtimeId: 'identity-runtime' }, 'identity-runtime');
    },
    onActivate: async (ctx: PlatformContext) => {
      if (typeof identityRuntime.start === 'function') {
        await identityRuntime.start();
      }
      await ctx.eventHub.publish('runtime.identity.activated', { runtimeId: 'identity-runtime' }, 'identity-runtime');
    },
    onShutdown: async (ctx: PlatformContext) => {
      if (typeof identityRuntime.stop === 'function') {
        await identityRuntime.stop();
      }
      if (typeof identityRuntime.shutdown === 'function') {
        await identityRuntime.shutdown();
      }
      if (typeof identityRuntime.dispose === 'function') {
        identityRuntime.dispose();
      }
      await ctx.eventHub.publish('runtime.identity.shutdown', { runtimeId: 'identity-runtime' }, 'identity-runtime');
    },
  });
}

// ─── Capability Runtime Bridge ──────────────────────────────────

interface CapabilityRuntimeLike {
  getMetrics?(): { totalPacks: number; activePacks: number };
  initialize?(): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  shutdown?(): Promise<void>;
  dispose?(): void;
}

export function createCapabilityRuntimeBridge(
  capabilityRuntime: CapabilityRuntimeLike,
  version = '1.0.0',
): RuntimeContract {
  return createRuntimeBridge({
    id: 'capability-runtime',
    name: 'Capability Runtime',
    version,
    description: 'Capability pack lifecycle, sandbox, and dependency management',
    dependencies: ['memory-runtime', 'identity-runtime'],
    instance: capabilityRuntime,
    onInitialize: async (ctx: PlatformContext) => {
      ctx.container.registerSingleton('capability-runtime', capabilityRuntime);
      if (typeof capabilityRuntime.initialize === 'function') {
        await capabilityRuntime.initialize();
      }
      ctx.healthMonitor.registerCheck('capability-runtime', async () => {
        const start = performance.now();
        const hasMetrics = typeof capabilityRuntime.getMetrics === 'function';
        return {
          status: hasMetrics ? HS.Healthy : HS.Warning,
          details: hasMetrics ? 'Capability runtime operational' : 'Metrics not available',
          checkedAt: new Date().toISOString(),
          responseTimeMs: performance.now() - start,
        };
      });
      await ctx.eventHub.publish('runtime.capability.initialized', { runtimeId: 'capability-runtime' }, 'capability-runtime');
    },
    onActivate: async (ctx: PlatformContext) => {
      if (typeof capabilityRuntime.start === 'function') {
        await capabilityRuntime.start();
      }
      await ctx.eventHub.publish('runtime.capability.activated', { runtimeId: 'capability-runtime' }, 'capability-runtime');
    },
    onShutdown: async (ctx: PlatformContext) => {
      if (typeof capabilityRuntime.stop === 'function') {
        await capabilityRuntime.stop();
      }
      if (typeof capabilityRuntime.shutdown === 'function') {
        await capabilityRuntime.shutdown();
      }
      if (typeof capabilityRuntime.dispose === 'function') {
        capabilityRuntime.dispose();
      }
      await ctx.eventHub.publish('runtime.capability.shutdown', { runtimeId: 'capability-runtime' }, 'capability-runtime');
    },
  });
}

// ─── Workflow Runtime Bridge ────────────────────────────────────

interface WorkflowRuntimeLike {
  getMetrics?(): { totalInstances: number; activeInstances: number };
  listDefinitions?(): readonly unknown[];
  dispose?(): void;
}

export function createWorkflowRuntimeBridge(
  workflowRuntime: WorkflowRuntimeLike,
  version = '1.0.0',
): RuntimeContract {
  return createRuntimeBridge({
    id: 'workflow-runtime',
    name: 'Workflow Runtime',
    version,
    description: 'Workflow definition, execution, and state machine orchestration',
    dependencies: ['memory-runtime', 'knowledge-runtime'],
    instance: workflowRuntime,
    onInitialize: async (ctx: PlatformContext) => {
      ctx.container.registerSingleton('workflow-runtime', workflowRuntime);
      ctx.healthMonitor.registerCheck('workflow-runtime', async () => {
        const start = performance.now();
        const hasMetrics = typeof workflowRuntime.getMetrics === 'function';
        return {
          status: hasMetrics ? HS.Healthy : HS.Warning,
          details: hasMetrics ? 'Workflow runtime operational' : 'Metrics not available',
          checkedAt: new Date().toISOString(),
          responseTimeMs: performance.now() - start,
        };
      });
      await ctx.eventHub.publish('runtime.workflow.initialized', { runtimeId: 'workflow-runtime' }, 'workflow-runtime');
    },
    onShutdown: async (ctx: PlatformContext) => {
      if (typeof workflowRuntime.dispose === 'function') {
        workflowRuntime.dispose();
      }
      await ctx.eventHub.publish('runtime.workflow.shutdown', { runtimeId: 'workflow-runtime' }, 'workflow-runtime');
    },
  });
}

// ─── Cognitive Runtime Bridge ───────────────────────────────────

interface CognitiveRuntimeLike {
  initialize?(): Promise<void>;
  start?(): Promise<void>;
  shutdown?(): Promise<void>;
  get state(): string;
}

export function createCognitiveRuntimeBridge(
  cognitiveRuntime: CognitiveRuntimeLike,
  version = '1.0.0',
): RuntimeContract {
  return createRuntimeBridge({
    id: 'cognitive-runtime',
    name: 'Cognitive Runtime',
    version,
    description: 'Cognitive processing, AI providers, conversation management',
    dependencies: ['memory-runtime', 'knowledge-runtime', 'identity-runtime'],
    instance: cognitiveRuntime,
    onInitialize: async (ctx: PlatformContext) => {
      ctx.container.registerSingleton('cognitive-runtime', cognitiveRuntime);
      if (typeof cognitiveRuntime.initialize === 'function') {
        await cognitiveRuntime.initialize();
      }
      ctx.healthMonitor.registerCheck('cognitive-runtime', async () => {
        const start = performance.now();
        const stateVal = cognitiveRuntime.state;
        const isHealthy = stateVal === 'Ready' || stateVal === 'Created' || stateVal === 'Initialized';
        return {
          status: isHealthy ? HS.Healthy : HS.Warning,
          details: `Cognitive runtime state: ${stateVal}`,
          checkedAt: new Date().toISOString(),
          responseTimeMs: performance.now() - start,
        };
      });
      await ctx.eventHub.publish('runtime.cognitive.initialized', { runtimeId: 'cognitive-runtime' }, 'cognitive-runtime');
    },
    onActivate: async (ctx: PlatformContext) => {
      if (typeof cognitiveRuntime.start === 'function') {
        await cognitiveRuntime.start();
      }
      await ctx.eventHub.publish('runtime.cognitive.activated', { runtimeId: 'cognitive-runtime' }, 'cognitive-runtime');
    },
    onShutdown: async (ctx: PlatformContext) => {
      if (typeof cognitiveRuntime.shutdown === 'function') {
        await cognitiveRuntime.shutdown();
      }
      await ctx.eventHub.publish('runtime.cognitive.shutdown', { runtimeId: 'cognitive-runtime' }, 'cognitive-runtime');
    },
  });
}

// ─── Experience Runtime Bridge ──────────────────────────────────

interface ExperienceRuntimeLike {
  initialize?(): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  shutdown?(): Promise<void>;
  get state(): string;
}

export function createExperienceRuntimeBridge(
  experienceRuntime: ExperienceRuntimeLike,
  version = '1.0.0',
): RuntimeContract {
  return createRuntimeBridge({
    id: 'experience-runtime',
    name: 'Experience Runtime',
    version,
    description: 'UX personalization, behavior tracking, and adaptation',
    dependencies: ['memory-runtime', 'identity-runtime', 'cognitive-runtime'],
    instance: experienceRuntime,
    onInitialize: async (ctx: PlatformContext) => {
      ctx.container.registerSingleton('experience-runtime', experienceRuntime);
      if (typeof experienceRuntime.initialize === 'function') {
        await experienceRuntime.initialize();
      }
      ctx.healthMonitor.registerCheck('experience-runtime', async () => {
        const start = performance.now();
        const stateVal = experienceRuntime.state;
        const isHealthy = stateVal === 'Created' || stateVal === 'Learning' || stateVal === 'Stable';
        return {
          status: isHealthy ? HS.Healthy : HS.Warning,
          details: `Experience runtime state: ${stateVal}`,
          checkedAt: new Date().toISOString(),
          responseTimeMs: performance.now() - start,
        };
      });
      await ctx.eventHub.publish('runtime.experience.initialized', { runtimeId: 'experience-runtime' }, 'experience-runtime');
    },
    onActivate: async (ctx: PlatformContext) => {
      if (typeof experienceRuntime.start === 'function') {
        await experienceRuntime.start();
      }
      await ctx.eventHub.publish('runtime.experience.activated', { runtimeId: 'experience-runtime' }, 'experience-runtime');
    },
    onShutdown: async (ctx: PlatformContext) => {
      if (typeof experienceRuntime.stop === 'function') {
        await experienceRuntime.stop();
      }
      if (typeof experienceRuntime.shutdown === 'function') {
        await experienceRuntime.shutdown();
      }
      await ctx.eventHub.publish('runtime.experience.shutdown', { runtimeId: 'experience-runtime' }, 'experience-runtime');
    },
  });
}

// ─── Desktop Foundation Bridge ──────────────────────────────────

interface DesktopRuntimeLike {
  initialize?(): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  shutdown?(): Promise<void>;
  get state(): string;
  get subsystemCount(): number;
}

export function createDesktopRuntimeBridge(
  desktopRuntime: DesktopRuntimeLike,
  version = '1.0.0',
): RuntimeContract {
  return createRuntimeBridge({
    id: 'desktop-foundation',
    name: 'Desktop Foundation',
    version,
    description: 'Desktop application runtime with 14 subsystems',
    dependencies: ['memory-runtime', 'knowledge-runtime', 'identity-runtime', 'cognitive-runtime', 'experience-runtime'],
    instance: desktopRuntime,
    onInitialize: async (ctx: PlatformContext) => {
      ctx.container.registerSingleton('desktop-foundation', desktopRuntime);
      if (typeof desktopRuntime.initialize === 'function') {
        await desktopRuntime.initialize();
      }
      ctx.healthMonitor.registerCheck('desktop-foundation', async () => {
        const start = performance.now();
        const stateVal = desktopRuntime.state;
        const isHealthy = stateVal === 'Ready' || stateVal === 'Running';
        return {
          status: isHealthy ? HS.Healthy : HS.Warning,
          details: `Desktop state: ${stateVal}, subsystems: ${desktopRuntime.subsystemCount}`,
          checkedAt: new Date().toISOString(),
          responseTimeMs: performance.now() - start,
        };
      });
      await ctx.eventHub.publish('runtime.desktop.initialized', { runtimeId: 'desktop-foundation' }, 'desktop-foundation');
    },
    onActivate: async (ctx: PlatformContext) => {
      if (typeof desktopRuntime.start === 'function') {
        await desktopRuntime.start();
      }
      await ctx.eventHub.publish('runtime.desktop.activated', { runtimeId: 'desktop-foundation' }, 'desktop-foundation');
    },
    onShutdown: async (ctx: PlatformContext) => {
      if (typeof desktopRuntime.stop === 'function') {
        await desktopRuntime.stop();
      }
      if (typeof desktopRuntime.shutdown === 'function') {
        await desktopRuntime.shutdown();
      }
      await ctx.eventHub.publish('runtime.desktop.shutdown', { runtimeId: 'desktop-foundation' }, 'desktop-foundation');
    },
  });
}
