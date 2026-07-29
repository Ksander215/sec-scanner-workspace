/**
 * AIS Execution Engine — Public API
 * Core Runtime, version 0.3.0 (execution pipeline + tool runtime)
 *
 * Conforms to:
 * - CON-001.000 (Constitution)
 * - ARC-001.001 (Architecture Baseline)
 * - DOM-001.000, DOM-002.000 (Domain Model)
 * - ADR-001..014 (Architecture Decision Records)
 *
 * @module @ais/core
 */

// Engine
export { ExecutionEngine } from './engine/execution-engine.js';

// Execution Pipeline
export { ExecutionPipeline } from './pipeline/execution-pipeline.js';
export type { PipelineConfig } from './pipeline/execution-pipeline.js';

// Runtime
export { Runtime, ServiceRegistry, DefaultLifecycleHooks } from './runtime/index.js';

// Events
export { InProcessEventBus } from './events/event-bus.js';
export type { EventBus, EventEnvelope, EventPublisher, EventSubscriber, Subscription, EventHandler } from './events/index.js';

// Contracts (Interface Contracts IC-01..IC-05)
export type {
  AdaptiveMemory,
  ConfidenceEngine,
  ConfidenceResultData,
  ContextPredictor,
  NotificationManager,
  ProviderFactory,
  Provider,
  ProviderConfig,
} from './contracts/index.js';

// Domain Types
export * from './domain/index.js';

// Zones
export { DefaultTrustZoneGate } from './zones/index.js';
export type { TrustZoneGate, GateCheck } from './zones/index.js';

// Services
export type { Service, AISController } from './services/index.js';

// Config
export { DefaultEngineConfig } from './config/index.js';
export type { EngineConfig } from './config/index.js';

// Common Types
export {
  AutonomyLevel,
  TrustZone,
  EventClassification,
  ProviderType,
  EngineState,
} from './types/common.js';
export type { Timestamp, Identifier, SemVer, Result } from './types/common.js';

// Tool Runtime (AIS-003C)
export * from './tool/index.js';

// Identity Runtime (AIS-003F)
export { IdentityRuntime } from './identity/identity-runtime.js';
export type { IdentityRuntimeConfig } from './identity/identity-runtime.js';
