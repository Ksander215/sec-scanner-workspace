/**
 * Tool Runtime — Core Types
 *
 * Defines the fundamental type system for the AIS Tool Runtime:
 *   Tool → ToolRegistry → ToolRuntime → Sandbox → Execution
 *
 * Conforms to:
 * - ARC-001.001 §5 (Module Architecture)
 * - DOM-002.000 (Domain Model)
 * - CON-001.000 AL-012 (Minimal Privilege)
 * - ADR-010 (Trust Boundaries)
 * - ADR-012 (Minimal Privilege)
 *
 * Design principles:
 * - Tools declare capabilities; Runtime enforces them.
 * - Tools never access globals — all dependencies injected via ToolExecutionContext.
 * - Tool lifecycle is managed by FSM: Registered → Validated → Loaded → Ready → Executing → Completed → Disposed
 * - Capability checks are mandatory before execution (AL-012).
 */

import type { Timestamp } from '../types/common.js';
import type { CancellationToken } from '../pipeline/types.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { TrustZone } from '../types/common.js';

// ─── Tool Capability ─────────────────────────────────────────
/**
 * Capabilities a tool may declare.
 * AL-012: Every tool MUST declare its required capabilities.
 * Runtime MUST deny execution if capability is not granted.
 */
export enum ToolCapability {
  Filesystem = 'filesystem',
  Network = 'network',
  Memory = 'memory',
  Shell = 'shell',
  Knowledge = 'knowledge',
  Planner = 'planner',
}

// ─── Tool Trust Level ────────────────────────────────────────
/**
 * Trust level assigned to a tool.
 * Determines which capabilities may be granted and which zone the tool runs in.
 * ADR-010, ADR-012: Tools in Z2 (Plugin Sandbox) cannot escalate trust.
 */
export enum ToolTrustLevel {
  Trusted = 'trusted',
  Standard = 'standard',
  Restricted = 'restricted',
  Untrusted = 'untrusted',
}

// ─── Tool Lifecycle State ────────────────────────────────────
/**
 * FSM states for a tool instance.
 *   Registered → Validated → Loaded → Ready → Executing → Completed → Disposed
 *
 * Invalid transitions are rejected by the ToolLifecycleFSM.
 */
export enum ToolLifecycleState {
  Registered = 'registered',
  Validated = 'validated',
  Loaded = 'loaded',
  Ready = 'ready',
  Executing = 'executing',
  Completed = 'completed',
  Disposed = 'disposed',
  Failed = 'failed',
}

// ─── Tool Metadata ───────────────────────────────────────────
/**
 * Declared metadata for a Tool.
 * All fields are immutable after creation.
 */
export interface ToolMetadata {
  /** Unique tool name (used as registry key). */
  readonly name: string;
  /** Semantic version (MAJOR.MINOR.PATCH). */
  readonly version: string;
  /** Human-readable description. */
  readonly description: string;
  /** Capabilities this tool requires. */
  readonly capabilities: readonly ToolCapability[];
  /** Trust level of this tool. */
  readonly trustLevel: ToolTrustLevel;
  /** Names of other tools this tool depends on (must be registered before loading). */
  readonly dependencies?: readonly string[];
  /** Optional author. */
  readonly author?: string;
  /** Optional tags for discovery. */
  readonly tags?: readonly string[];
}

// ─── Tool Validation Result ──────────────────────────────────
export interface ToolValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

// ─── Tool Request / Response ─────────────────────────────────
/**
 * Request sent to a Tool for execution.
 */
export interface ToolRequest {
  readonly toolName: string;
  /** The action to perform within the tool (tool-specific). */
  readonly action: string;
  /** Input parameters for the action. */
  readonly input: Readonly<Record<string, unknown>>;
  /** Optional per-request timeout override. */
  readonly timeoutMs?: number;
}

/**
 * Response from a Tool execution.
 */
export interface ToolResponse {
  readonly success: boolean;
  readonly output?: Readonly<Record<string, unknown>>;
  readonly error?: ToolResponseError;
  readonly durationMs: number;
  /** Optional metadata (tool-specific). */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Structured error from a Tool response.
 */
export interface ToolResponseError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}

// ─── Tool Logger ─────────────────────────────────────────────
/**
 * Logger provided to each Tool via ToolExecutionContext.
 * Tools MUST NOT create their own loggers.
 */
export interface ToolLogger {
  readonly toolName: string;
  info(message: string, data?: Readonly<Record<string, unknown>>): void;
  warn(message: string, data?: Readonly<Record<string, unknown>>): void;
  error(message: string, data?: Readonly<Record<string, unknown>>): void;
  debug(message: string, data?: Readonly<Record<string, unknown>>): void;
}

// ─── Tool Clock ──────────────────────────────────────────────
/**
 * Clock abstraction provided to tools.
 * Enables deterministic testing.
 */
export interface ToolClock {
  readonly now: Timestamp;
  readonly epochMs: number;
}

// ─── Tool Memory Handle ──────────────────────────────────────
/**
 * Memory handle provided to tools for scoped memory access.
 * Placeholder; actual memory subsystem is out of current scope.
 */
export interface ToolMemoryHandle {
  readonly toolName: string;
  readonly scope: 'execution' | 'session' | 'persistent';
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
  delete(key: string): boolean;
}

// ─── Tool Execution Context ──────────────────────────────────
/**
 * Context provided to every Tool during execution.
 * All dependencies are injected — no globals allowed.
 * CON-001.000 AL-012: Tools receive only what they need.
 */
export interface ToolExecutionContext {
  /** Current execution ID. */
  readonly executionId: string;
  /** Name of the tool being executed. */
  readonly toolName: string;
  /** Cancellation token for cooperative cancellation. */
  readonly cancellationToken: CancellationToken;
  /** Logger scoped to this tool. */
  readonly logger: ToolLogger;
  /** Event publisher for tool events. */
  readonly eventPublisher: EventPublisher;
  /** Read-only configuration. */
  readonly configuration: Readonly<Record<string, unknown>>;
  /** Clock for time access. */
  readonly clock: ToolClock;
  /** Scoped memory handle. */
  readonly memory: ToolMemoryHandle;
  /** Trust zone the tool is running in. */
  readonly trustZone: TrustZone;
}

// ─── Tool Interface ─────────────────────────────────────────
/**
 * The standardized Tool contract.
 * Every tool MUST implement this interface.
 * Tools MUST NOT access any globals; all dependencies come through ToolExecutionContext.
 */
export interface Tool {
  /** Immutable metadata declaration. */
  readonly metadata: ToolMetadata;
  /** Validate the tool's metadata and capabilities. */
  validate(): Promise<ToolValidationResult>;
  /** Initialize the tool with the provided context. */
  initialize(context: ToolExecutionContext): Promise<void>;
  /** Execute a request within the tool. */
  execute(request: ToolRequest, context: ToolExecutionContext): Promise<ToolResponse>;
  /** Dispose of the tool's resources. */
  dispose(): Promise<void>;
}

// ─── Runtime Policies ───────────────────────────────────────
/**
 * Timeout policy for tool execution.
 */
export interface TimeoutPolicy {
  /** Default timeout in milliseconds. */
  readonly defaultTimeoutMs: number;
  /** Maximum allowed timeout. */
  readonly maxTimeoutMs: number;
}

/**
 * Security policy for tool execution.
 */
export interface SecurityPolicy {
  /** Maximum memory usage in bytes (0 = no limit). */
  readonly maxMemoryBytes: number;
  /** Whether to enforce sandbox boundaries. */
  readonly enforceSandbox: boolean;
  /** Allowed trust levels. Tools outside this set are denied. */
  readonly allowedTrustLevels: readonly ToolTrustLevel[];
}

/**
 * Capability policy — maps trust levels to allowed capabilities.
 */
export interface CapabilityPolicy {
  /** Get allowed capabilities for a given trust level. */
  getAllowedCapabilities(trustLevel: ToolTrustLevel): readonly ToolCapability[];
  /** Check if a capability is allowed for a given trust level. */
  isCapabilityAllowed(trustLevel: ToolTrustLevel, capability: ToolCapability): boolean;
}

/**
 * Recovery policy for tool execution failures.
 */
export interface ToolRecoveryPolicy {
  /** Maximum retries per tool execution. */
  readonly maxRetries: number;
  /** Whether to retry on timeout. */
  readonly retryOnTimeout: boolean;
  /** Whether to retry on capability denial. */
  readonly retryOnCapabilityDenied: boolean;
}

// ─── Runtime Metrics ─────────────────────────────────────────
/**
 * Metrics collected by the ToolRuntime.
 */
export interface ToolExecutionMetrics {
  readonly toolName: string;
  readonly executionId: string;
  readonly startedAt: Timestamp;
  readonly finishedAt?: Timestamp;
  readonly durationMs?: number;
  readonly status: ToolLifecycleState;
  readonly attempt: number;
  readonly error?: ToolResponseError;
  readonly timedOut: boolean;
}

/**
 * Aggregated runtime metrics.
 */
export interface RuntimeMetricsSummary {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly timedOutExecutions: number;
  readonly cancelledExecutions: number;
  readonly totalDurationMs: number;
  readonly averageDurationMs: number;
  readonly registeredToolCount: number;
  readonly activeToolCount: number;
}

// ─── Sandbox Configuration ───────────────────────────────────
export interface SandboxConfiguration {
  readonly timeoutMs: number;
  readonly maxMemoryBytes: number;
  readonly enforceMemoryLimit: boolean;
  readonly enforceTimeout: boolean;
}

// ─── Tool Registration Entry ─────────────────────────────────
/**
 * Internal entry stored in the ToolRegistry.
 */
export interface ToolRegistration {
  tool: Tool;
  registeredAt: string;
  state: ToolLifecycleState;
}
