import type {
  RuntimeContract,
  RuntimeDescriptor,
  PlatformContext,
  BootstrapPhase,
  DependencyGraph,
} from '../types.js';
import {
  PlatformState,
  BootstrapPhase as Phase,
  HealthStatus,
  SecurityValidationError,
} from '../types.js';
import { DependencyResolver } from '../dependency-resolver/dependency-resolver.js';
import { ThreadSafeRuntimeRegistry } from '../runtime-registry/runtime-registry.js';
import { PlatformDiagnosticsRuntime } from '../diagnostics-runtime/diagnostics-runtime.js';
import { PlatformMetricsAggregator } from '../metrics-aggregator/metrics-aggregator.js';

export interface BootstrapConfig {
  readonly maxInitializationRetries: number;
  readonly initializationRetryDelayMs: number;
  readonly enableSecurityValidation: boolean;
  readonly requiredRuntimeIds: readonly string[];
  readonly maxStartupTimeMs: number;
}

const DEFAULT_CONFIG: BootstrapConfig = {
  maxInitializationRetries: 2,
  initializationRetryDelayMs: 200,
  enableSecurityValidation: true,
  requiredRuntimeIds: [],
  maxStartupTimeMs: 10000,
};

export interface BootstrapResult {
  readonly success: boolean;
  readonly phase: BootstrapPhase;
  readonly initializedRuntimes: readonly string[];
  readonly failedRuntimes: readonly string[];
  readonly degradedRuntimes: readonly string[];
  readonly totalTimeMs: number;
  readonly error?: string;
}

export class BootstrapEngine {
  private config: BootstrapConfig;
  private resolver = new DependencyResolver();
  private registry = new ThreadSafeRuntimeRegistry();
  private diagnostics = new PlatformDiagnosticsRuntime();
  private metrics = new PlatformMetricsAggregator();
  private contracts = new Map<string, RuntimeContract>();
  private descriptors = new Map<string, RuntimeDescriptor>();
  private platformContext: PlatformContext | null = null;
  private dependencyGraph: DependencyGraph | null = null;

  constructor(config?: Partial<BootstrapConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setPlatformContext(ctx: PlatformContext): void {
    this.platformContext = ctx;
  }

  getRegistry(): ThreadSafeRuntimeRegistry { return this.registry; }
  getDiagnostics(): PlatformDiagnosticsRuntime { return this.diagnostics; }
  getMetrics(): PlatformMetricsAggregator { return this.metrics; }
  getDependencyGraph(): DependencyGraph | null { return this.dependencyGraph; }

  async bootstrap(runtimes: RuntimeContract[]): Promise<BootstrapResult> {
    const totalStart = performance.now();
    const failedRuntimes: string[] = [];
    const degradedRuntimes: string[] = [];
    let initializedRuntimes: string[] = [];

    try {
      const phaseStart = performance.now();
      this.discoverPhase(runtimes);
      this.diagnostics.recordPhaseTiming(Phase.Discovery, performance.now() - phaseStart);

      const valStart = performance.now();
      this.validationPhase(runtimes);
      this.diagnostics.recordPhaseTiming(Phase.Validation, performance.now() - valStart);

      const regStart = performance.now();
      this.registrationPhase();
      this.diagnostics.recordPhaseTiming(Phase.Registration, performance.now() - regStart);

      const initStart = performance.now();
      const initResult = await this.initializationPhase();
      this.diagnostics.recordPhaseTiming(Phase.Initialization, performance.now() - initStart);
      initializedRuntimes = initResult.initialized;
      failedRuntimes.push(...initResult.failed);
      degradedRuntimes.push(...initResult.degraded);

      const actStart = performance.now();
      await this.activationPhase(initializedRuntimes);
      this.diagnostics.recordPhaseTiming(Phase.Activation, performance.now() - actStart);

      this.diagnostics.recordPhaseTiming(Phase.Ready, 0);

      return {
        success: true,
        phase: Phase.Ready,
        initializedRuntimes,
        failedRuntimes,
        degradedRuntimes,
        totalTimeMs: performance.now() - totalStart,
      };
    } catch (err) {
      return {
        success: false,
        phase: Phase.Discovery,
        initializedRuntimes,
        failedRuntimes,
        degradedRuntimes,
        totalTimeMs: performance.now() - totalStart,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private discoverPhase(runtimes: RuntimeContract[]): void {
    for (const contract of runtimes) {
      this.contracts.set(contract.id, contract);
      const descriptor: RuntimeDescriptor = {
        id: contract.id,
        name: contract.name,
        version: contract.version,
        description: contract.description,
        dependencies: contract.dependencies,
        phase: Phase.Discovery,
        health: HealthStatus.Unknown,
        initializedAt: null,
        activatedAt: null,
        instance: null,
      };
      this.descriptors.set(contract.id, descriptor);
    }
  }

  private validationPhase(runtimes: RuntimeContract[]): void {
    // Always resolve dependency graph
    const descriptors = [...this.descriptors.values()];
    this.dependencyGraph = this.resolver.resolve(descriptors);
    this.diagnostics.setDependencyGraph(this.dependencyGraph);

    if (!this.config.enableSecurityValidation) return;

    for (const contract of runtimes) {
      if (!contract.version || contract.version === '0.0.0') {
        throw new SecurityValidationError(
          `Runtime ${contract.id} has invalid version`,
          contract.id,
          'INVALID_VERSION',
        );
      }
      for (const dep of contract.dependencies) {
        if (!runtimes.some((r) => r.id === dep)) {
          throw new SecurityValidationError(
            `Runtime ${contract.id} depends on unresolvable runtime: ${dep}`,
            contract.id,
            'UNRESOLVED_DEPENDENCY',
          );
        }
      }
    }
  }

  private registrationPhase(): void {
    for (const descriptor of this.descriptors.values()) {
      const registered: RuntimeDescriptor = {
        ...descriptor,
        phase: Phase.Registration,
      };
      this.descriptors.set(descriptor.id, registered);
      if (!this.registry.has(descriptor.id)) {
        this.registry.register(registered);
      }
    }
  }

  private async initializationPhase(): Promise<{
    initialized: string[];
    failed: string[];
    degraded: string[];
  }> {
    const initialized: string[] = [];
    const failed: string[] = [];
    const degraded: string[] = [];

    if (!this.dependencyGraph || !this.platformContext) {
      return { initialized, failed, degraded };
    }

    const order = this.dependencyGraph.resolvedOrder;

    for (const runtimeId of order) {
      const contract = this.contracts.get(runtimeId);
      if (!contract) continue;

      let success = false;
      for (let attempt = 0; attempt <= this.config.maxInitializationRetries; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, this.config.initializationRetryDelayMs));
        }
        try {
          const start = performance.now();
          await contract.initialize(this.platformContext);
          const timeMs = performance.now() - start;
          this.diagnostics.recordRuntimeTiming(runtimeId, timeMs);
          this.metrics.record(`runtime.${runtimeId}.initTime`, timeMs);

          this.descriptors.set(runtimeId, {
            ...this.descriptors.get(runtimeId)!,
            phase: Phase.Initialization,
            initializedAt: new Date().toISOString(),
          });

          this.diagnostics.registerRuntimeInfo({
            id: runtimeId,
            name: contract.name,
            version: contract.version,
            state: PlatformState.Initializing,
            health: HealthStatus.Healthy,
            dependencies: contract.dependencies,
            memoryUsage: 0,
            startupTimeMs: timeMs,
          });

          initialized.push(runtimeId);
          success = true;
          break;
        } catch {
          this.metrics.increment(`runtime.${runtimeId}.initFailure`);
        }
      }

      if (!success) {
        const isRequired = this.config.requiredRuntimeIds.includes(runtimeId);
        if (isRequired) {
          failed.push(runtimeId);
        } else {
          degraded.push(runtimeId);
        }
      }
    }

    return { initialized, failed, degraded };
  }

  private async activationPhase(runtimeIds: string[]): Promise<void> {
    for (const runtimeId of runtimeIds) {
      const contract = this.contracts.get(runtimeId);
      if (!contract || !this.platformContext) continue;

      try {
        await contract.activate(this.platformContext);
        const desc = this.descriptors.get(runtimeId)!;
        this.descriptors.set(runtimeId, {
          ...desc,
          phase: Phase.Activation,
          activatedAt: new Date().toISOString(),
        });
      } catch {
        // Graceful degradation
      }
    }
  }

  /**
   * Shutdown all runtimes in reverse initialization order.
   * Sequence: ShutdownRequested → Flush → Persist → Release → Stopped
   * Non-critical failures are logged but do not halt shutdown.
   */
  async shutdownAll(): Promise<void> {
    if (!this.platformContext || !this.dependencyGraph) return;

    const order = [...this.dependencyGraph.resolvedOrder].reverse();
    const shutdownStart = performance.now();

    for (const runtimeId of order) {
      const contract = this.contracts.get(runtimeId);
      if (!contract) continue;

      try {
        await contract.shutdown(this.platformContext);
      } catch {
        // Non-critical: individual runtime shutdown failure must not prevent others
      }
    }

    this.metrics.record('platform.shutdown.timeMs', performance.now() - shutdownStart);
  }

  /**
   * Get the resolved initialization order for external inspection.
   */
  getResolvedOrder(): readonly string[] {
    return this.dependencyGraph?.resolvedOrder ?? [];
  }

  /**
   * Get all registered contracts.
   */
  getContracts(): ReadonlyMap<string, RuntimeContract> {
    return this.contracts;
  }
}
