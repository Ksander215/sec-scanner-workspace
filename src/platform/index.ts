/**
 * Platform Integration Layer — Public API
 * TASK-AIS-005A.000 — Platform Integration Foundation
 *
 * Central point of interaction for all AIS Runtimes.
 * Exposes the PlatformRuntime, all subsystems, and bridge contracts.
 */

// Core types
export * from './types.js';

// Platform Runtime (main orchestrator)
export { PlatformRuntime } from './platform-runtime/platform-runtime.js';
export type { PlatformRuntimeConfig } from './platform-runtime/platform-runtime.js';

// Subsystems
export { ConfigurationRuntime } from './configuration-runtime/configuration-runtime.js';
export { ThreadSafeRuntimeRegistry } from './runtime-registry/runtime-registry.js';
export { DependencyResolver } from './dependency-resolver/dependency-resolver.js';
export { ServiceContainerImpl } from './service-container/service-container.js';
export { PlatformEventHub } from './event-hub/event-hub.js';
export { PlatformCommandBus } from './command-bus/command-bus.js';
export { PlatformQueryBus } from './query-bus/query-bus.js';
export { PlatformScheduler } from './scheduler/scheduler.js';
export { PlatformHealthMonitor } from './health-monitor/health-monitor.js';
export { PlatformPluginLoader } from './plugin-loader/plugin-loader.js';
export { PlatformDiagnosticsRuntime } from './diagnostics-runtime/diagnostics-runtime.js';
export { PlatformMetricsAggregator } from './metrics-aggregator/metrics-aggregator.js';
export { createPlatformAPI } from './platform-api/platform-api.js';

// Bootstrap
export { BootstrapEngine } from './bootstrap-engine/bootstrap-engine.js';
export type { BootstrapConfig, BootstrapResult } from './bootstrap-engine/bootstrap-engine.js';

// Runtime Bridges
export {
  createRuntimeBridge,
  createMemoryRuntimeBridge,
  createKnowledgeRuntimeBridge,
  createIdentityRuntimeBridge,
  createCapabilityRuntimeBridge,
  createWorkflowRuntimeBridge,
  createCognitiveRuntimeBridge,
  createExperienceRuntimeBridge,
  createDesktopRuntimeBridge,
} from './runtime-bridges.js';
