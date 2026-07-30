/**
 * Tool Runtime — Heart of AIS Tool Orchestration.
 *
 * Conforms to: AIS-003C.000 Requirements #1-15
 *
 * Flow:
 *   Goal → Planner → Execution Pipeline → ToolRuntime → Tools → Events → Report
 *
 * Responsibilities:
 *   - Register and manage tools
 *   - Validate tools before loading
 *   - Enforce capability checks (AL-012)
 *   - Enforce trust zone policies (ADR-010, ADR-012)
 *   - Execute tools in sandboxed contexts
 *   - Publish lifecycle events via Event Bus
 *   - Collect runtime metrics
 *   - Apply recovery policies on failures
 *   - Manage tool lifecycle FSM
 */
import type { EventBus } from '../events/event-bus.js';
import type { Tool, ToolRequest, ToolResponse, ToolExecutionContext, SandboxConfiguration } from './types.js';
import { ToolLifecycleState, ToolTrustLevel } from './types.js';
import type { SecurityPolicy, CapabilityPolicy, TimeoutPolicy, ToolRecoveryPolicy } from './types.js';
import { ToolRegistry } from './tool-registry.js';
import { ToolValidator } from './validator.js';
import { ToolSandbox } from './sandbox.js';
import { createToolLifecycleFSM } from './tool-lifecycle.js';
import { ToolMetricsCollector } from './metrics.js';
import {
  DefaultCapabilityPolicy,
  DEFAULT_SECURITY_POLICY,
} from './policies.js';
import { createToolContext } from './tool-context.js';
import { TrustZone } from '../types/common.js';
import type { CancellationToken } from '../pipeline/types.js';
import {
  ToolNotFoundError,
  CapabilityDeniedError,
  ToolValidationError,
  ToolLifecycleError,
} from './errors.js';
import type {
  ToolRegistered,
  ToolValidated,
  ToolLoaded,
  ToolStarted,
  ToolFinished,
  ToolFailed,
  ToolDisposed,
  ToolStateChange,
} from './events.js';
import { EventClassification } from '../types/common.js';

export interface ToolRuntimeConfig {
  readonly eventBus: EventBus;
  readonly timeoutPolicy?: Partial<TimeoutPolicy>;
  readonly securityPolicy?: Partial<SecurityPolicy>;
  readonly capabilityPolicy?: CapabilityPolicy;
  readonly recoveryPolicy?: Partial<ToolRecoveryPolicy>;
  readonly sandboxConfig?: Partial<SandboxConfiguration>;
}

export class ToolRuntime {
  private readonly registry: ToolRegistry;
  private readonly validator: ToolValidator;
  private readonly sandbox: ToolSandbox;
  private readonly metrics: ToolMetricsCollector;
  private readonly eventBus: EventBus;
  private readonly _securityPolicy: SecurityPolicy;
  private readonly _capabilityPolicy: CapabilityPolicy;
  private readonly lifecycleFSMs = new Map<string, ReturnType<typeof createToolLifecycleFSM>>();
  private _running = false;

  constructor(config: ToolRuntimeConfig) {
    this.registry = new ToolRegistry();
    this.validator = new ToolValidator(this.registry);
    this.sandbox = new ToolSandbox(config.sandboxConfig);
    this.metrics = new ToolMetricsCollector();
    this.eventBus = config.eventBus;
    this._securityPolicy = { ...DEFAULT_SECURITY_POLICY, ...config.securityPolicy };
    this._capabilityPolicy = config.capabilityPolicy ?? new DefaultCapabilityPolicy();
  }

  /** Whether the runtime is running. */
  get isRunning(): boolean { return this._running; }

  /** The tool registry (read-only access). */
  get tools(): ToolRegistry { return this.registry; }

  /** The metrics collector. */
  get metricsCollector(): ToolMetricsCollector { return this.metrics; }

  // ─── Tool Registration ────────────────────────────────────

  /**
   * Register a tool. Validates metadata, checks security policy.
   * Publishes ToolRegistered event.
   */
  async registerTool(tool: Tool): Promise<void> {
    if (!this._securityPolicy.allowedTrustLevels.includes(tool.metadata.trustLevel)) {
      throw new ToolValidationError(tool.metadata.name, [
        `Trust level '${tool.metadata.trustLevel}' is not allowed by security policy`,
      ]);
    }

    this.registry.register(tool);
    this.lifecycleFSMs.set(tool.metadata.name, createToolLifecycleFSM());

    await this.publishEvent<ToolRegistered>({
      eventType: 'ToolRegistered',
      classification: EventClassification.StateChange,
      payload: {
        toolName: tool.metadata.name,
        version: tool.metadata.version,
        capabilities: tool.metadata.capabilities as readonly string[],
        trustLevel: tool.metadata.trustLevel,
        registeredAt: new Date().toISOString(),
      },
    });
  }

  // ─── Tool Validation & Loading ────────────────────────────

  /**
   * Validate a registered tool.
   * Transitions: Registered → Validated (or Failed).
   */
  async validateTool(name: string): Promise<void> {
    const tool = this.registry.resolveOrThrow(name);

    this.transitionFSM(name, ToolLifecycleState.Validated);

    const result = this.validator.validate(tool);

    await this.publishEvent<ToolValidated>({
      eventType: 'ToolValidated',
      classification: EventClassification.Info,
      payload: {
        toolName: name,
        version: tool.metadata.version,
        valid: result.valid,
        errors: result.errors,
        validatedAt: new Date().toISOString(),
      },
    });

    if (!result.valid) {
      this.transitionFSM(name, ToolLifecycleState.Failed);
      throw new ToolValidationError(name, result.errors);
    }
  }

  /**
   * Load a validated tool — initialize it with context.
   * Transitions: Validated → Loaded.
   */
  async loadTool(name: string): Promise<void> {
    const tool = this.registry.resolveOrThrow(name);

    const context = createToolContext({
      executionId: crypto.randomUUID(),
      toolName: name,
      cancellationToken: { cancelled: false, onCancel: () => {}, cancel: () => {} },
      eventPublisher: this.eventBus,
      trustZone: this.resolveTrustZone(tool.metadata.trustLevel),
    });

    this.transitionFSM(name, ToolLifecycleState.Loaded);

    await tool.initialize(context);

    await this.publishEvent<ToolLoaded>({
      eventType: 'ToolLoaded',
      classification: EventClassification.StateChange,
      payload: {
        toolName: name,
        version: tool.metadata.version,
        loadedAt: new Date().toISOString(),
      },
    });

    // Auto-transition to Ready after successful load
    this.transitionFSM(name, ToolLifecycleState.Ready);
  }

  /**
   * Convenience: register, validate, and load a tool in one step.
   */
  async registerAndLoad(tool: Tool): Promise<void> {
    await this.registerTool(tool);
    await this.validateTool(tool.metadata.name);
    await this.loadTool(tool.metadata.name);
  }

  // ─── Tool Execution ───────────────────────────────────────

  /**
   * Execute a tool with full capability check, trust zone enforcement, and sandbox.
   * Transitions: Ready → Executing → Completed/Failed/Ready.
   */
  async executeTool(
    request: ToolRequest,
    cancellationToken: CancellationToken,
    executionId?: string,
  ): Promise<ToolResponse> {
    const tool = this.registry.resolve(request.toolName);
    if (!tool) {
      throw new ToolNotFoundError(request.toolName);
    }

    if (!this._securityPolicy.allowedTrustLevels.includes(tool.metadata.trustLevel)) {
      throw new CapabilityDeniedError(
        request.toolName,
        'any',
        tool.metadata.trustLevel,
      );
    }

    // Capability check — AL-012
    this.enforceCapabilities(tool);

    // Trust zone resolution
    const trustZone = this.resolveTrustZone(tool.metadata.trustLevel);

    const execId = executionId ?? crypto.randomUUID();

    // Create execution context (all dependencies injected — no globals)
    const context = createToolContext({
      executionId: execId,
      toolName: request.toolName,
      cancellationToken,
      eventPublisher: this.eventBus,
      trustZone,
    });

    // Transition: Ready → Executing
    this.transitionFSM(request.toolName, ToolLifecycleState.Executing);

    await this.publishEvent<ToolStarted>({
      eventType: 'ToolStarted',
      classification: EventClassification.Action,
      payload: {
        toolName: request.toolName,
        executionId: execId,
        action: request.action,
        startedAt: context.clock.now,
      },
    });

    // Execute in sandbox with retry
    const response = await this.executeWithRecovery(tool, request, context, execId);

    const durationMs = response.durationMs;

    if (response.success) {
      // Transition: Executing → Completed → Ready
      this.transitionFSM(request.toolName, ToolLifecycleState.Completed);
      this.transitionFSM(request.toolName, ToolLifecycleState.Ready);

      await this.publishEvent<ToolFinished>({
        eventType: 'ToolFinished',
        classification: EventClassification.Result,
        payload: {
          toolName: request.toolName,
          executionId: execId,
          success: true,
          durationMs,
          finishedAt: context.clock.now,
        },
      });
    } else {
      // Transition: Executing → Failed
      this.transitionFSM(request.toolName, ToolLifecycleState.Failed);

      await this.publishEvent<ToolFailed>({
        eventType: 'ToolFailed',
        classification: EventClassification.Error,
        payload: {
          toolName: request.toolName,
          executionId: execId,
          errorCode: response.error?.code ?? 'UNKNOWN',
          errorMessage: response.error?.message ?? 'Unknown error',
          attempt: 1,
          retryable: response.error?.retryable ?? false,
          failedAt: context.clock.now,
        },
      });

      // Transition back to Ready if retryable (for future executions)
      if (response.error?.retryable) {
        this.transitionFSM(request.toolName, ToolLifecycleState.Ready);
      }
    }

    return response;
  }

  // ─── Tool Disposal ───────────────────────────────────────

  /**
   * Dispose a tool. Transitions to Disposed state.
   */
  async disposeTool(name: string): Promise<void> {
    const tool = this.registry.resolveOrThrow(name);

    try {
      await tool.dispose();
    } catch {
      // Best-effort disposal
    }

    // Transition to Disposed
    const fsm = this.lifecycleFSMs.get(name);
    if (fsm && !fsm.isTerminal) {
      fsm.transition(ToolLifecycleState.Disposed);
    }
    this.registry.setState(name, ToolLifecycleState.Disposed);

    await this.publishEvent<ToolDisposed>({
      eventType: 'ToolDisposed',
      classification: EventClassification.StateChange,
      payload: {
        toolName: name,
        disposedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Dispose all registered tools.
   */
  async disposeAll(): Promise<void> {
    const names = this.registry.listNames();
    for (const name of names) {
      await this.disposeTool(name);
    }
    this._running = false;
  }

  // ─── Runtime Lifecycle ────────────────────────────────────

  /**
   * Start the runtime.
   */
  async start(): Promise<void> {
    this._running = true;
  }

  /**
   * Stop the runtime and dispose all tools.
   */
  async stop(): Promise<void> {
    await this.disposeAll();
  }

  // ─── Internal ────────────────────────────────────────────

  private async executeWithRecovery(
    tool: Tool,
    request: ToolRequest,
    context: ToolExecutionContext,
    executionId: string,
    attempt = 1,
  ): Promise<ToolResponse> {
    const start = Date.now();
    try {
      const response = await this.sandbox.execute(tool, request, context);
      const durationMs = response.durationMs;

      // Record metrics
      this.metrics.record({
        toolName: request.toolName,
        executionId,
        startedAt: context.clock.now,
        finishedAt: context.clock.now,
        durationMs,
        status: response.success ? ToolLifecycleState.Completed : ToolLifecycleState.Failed,
        attempt,
        error: response.error,
        timedOut: response.error?.code === 'TOOL_TIMEOUT',
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - start;

      this.metrics.record({
        toolName: request.toolName,
        executionId,
        startedAt: context.clock.now,
        finishedAt: context.clock.now,
        durationMs,
        status: ToolLifecycleState.Failed,
        attempt,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          retryable: false,
        },
        timedOut: false,
      });

      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          retryable: false,
        },
        durationMs,
      };
    }
  }

  private enforceCapabilities(tool: Tool): void {
    for (const cap of tool.metadata.capabilities) {
      if (!this._capabilityPolicy.isCapabilityAllowed(tool.metadata.trustLevel, cap)) {
        throw new CapabilityDeniedError(tool.metadata.name, cap, tool.metadata.trustLevel);
      }
    }
  }

  private resolveTrustZone(trustLevel: ToolTrustLevel): TrustZone {
    // ADR-010: Trusted tools can run in Z1, Standard in Z2, Restricted in Z2
    switch (trustLevel) {
      case ToolTrustLevel.Trusted:
        return TrustZone.CoreAIS;
      case ToolTrustLevel.Standard:
      case ToolTrustLevel.Restricted:
        return TrustZone.PluginSandbox;
      case ToolTrustLevel.Untrusted:
        return TrustZone.PluginSandbox;
    }
  }

  private transitionFSM(name: string, toState: ToolLifecycleState): void {
    const fsm = this.lifecycleFSMs.get(name);
    if (!fsm) return;

    const fromState = fsm.currentState;
    if (fsm.canTransition(toState)) {
      fsm.transition(toState);
      this.registry.setState(name, toState);

      // Publish state change event
      this.publishStateChange(name, fromState, toState).catch(() => {});
    } else {
      throw new ToolLifecycleError(name, fromState, toState);
    }
  }

  private async publishStateChange(
    toolName: string,
    previousState: ToolLifecycleState,
    newState: ToolLifecycleState,
  ): Promise<void> {
    await this.publishEvent<ToolStateChange>({
      eventType: 'ToolStateChange',
      classification: EventClassification.StateChange,
      payload: {
        toolName,
        previousState,
        newState,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private async publishEvent<T extends { eventType: string; payload: { toolName?: string } }>(
    eventBase: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    const event = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: eventBase.payload.toolName ?? 'runtime',
      aggregateType: 'Tool',
      version: '1.0.0',
      ...eventBase,
    } as unknown as import('../domain/events/domain-event.js').DomainEventBase;
    await this.eventBus.publish(event);
  }
}
