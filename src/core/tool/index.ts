/**
 * Tool Runtime — Public API
 *
 * Conforms to: AIS-003C.000
 *
 * Exports:
 *   - Tool types (Tool, ToolMetadata, ToolRequest, ToolResponse, etc.)
 *   - Tool Registry
 *   - Tool Runtime (main orchestrator)
 *   - Sandbox
 *   - Validator
 *   - Lifecycle FSM
 *   - Events
 *   - Errors
 *   - Metrics
 *   - Policies
 *   - Tool Context
 */

// Types
export {
  ToolCapability,
  ToolTrustLevel,
  ToolLifecycleState,
} from './types.js';
export type {
  ToolMetadata,
  ToolValidationResult,
  ToolRequest,
  ToolResponse,
  ToolResponseError,
  ToolLogger,
  ToolClock,
  ToolMemoryHandle,
  ToolExecutionContext,
  Tool,
  TimeoutPolicy,
  SecurityPolicy,
  CapabilityPolicy,
  ToolRecoveryPolicy,
  ToolExecutionMetrics,
  RuntimeMetricsSummary,
  SandboxConfiguration,
  ToolRegistration,
} from './types.js';

// Registry
export { ToolRegistry } from './tool-registry.js';

// Runtime
export { ToolRuntime } from './tool-runtime.js';
export type { ToolRuntimeConfig } from './tool-runtime.js';

// Sandbox
export { ToolSandbox, DEFAULT_SANDBOX_CONFIG } from './sandbox.js';

// Validator
export { ToolValidator } from './validator.js';

// Lifecycle
export { createToolLifecycleFSM, getToolLifecycleDefinition } from './tool-lifecycle.js';

// Events
export type {
  ToolRegistered,
  ToolValidated,
  ToolLoaded,
  ToolStarted,
  ToolFinished,
  ToolFailed,
  ToolDisposed,
  ToolStateChange,
  ToolEvent,
} from './events.js';
export { createToolEventBase } from './events.js';

// Errors
export {
  ToolRuntimeError,
  ToolNotFoundError,
  CapabilityDeniedError,
  SandboxViolationError,
  ToolTimeoutError,
  ToolExecutionError,
  ToolValidationError,
  ToolLifecycleError,
  RuntimeFailureError,
  toToolResponseError,
} from './errors.js';

// Metrics
export { ToolMetricsCollector } from './metrics.js';
export type { ToolToolStats } from './metrics.js';

// Policies
export {
  DefaultCapabilityPolicy,
  DEFAULT_TIMEOUT_POLICY,
  DEFAULT_SECURITY_POLICY,
  DEFAULT_TOOL_RECOVERY_POLICY,
} from './policies.js';

// Context
export {
  DefaultToolLogger,
  DefaultToolClock,
  FixedToolClock,
  InMemoryToolMemory,
  createToolContext,
} from './tool-context.js';
export type { ToolContextFactoryOptions } from './tool-context.js';
