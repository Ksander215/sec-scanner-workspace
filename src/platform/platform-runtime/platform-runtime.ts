import type {
  RuntimeContract,
  PlatformAPI,
  PlatformHealthSnapshot,
  PlatformInfo,
  ConfigValue,
  TelemetrySnapshot,
  DependencyGraph,
} from '../types.js';
import {
  PlatformState,
  ConfigSource,
} from '../types.js';
import { ConfigurationRuntime } from '../configuration-runtime/configuration-runtime.js';
import { ThreadSafeRuntimeRegistry } from '../runtime-registry/runtime-registry.js';
import { BootstrapEngine, type BootstrapResult } from '../bootstrap-engine/bootstrap-engine.js';
import { ServiceContainerImpl } from '../service-container/service-container.js';
import { PlatformEventHub } from '../event-hub/event-hub.js';
import { PlatformCommandBus } from '../command-bus/command-bus.js';
import { PlatformQueryBus } from '../query-bus/query-bus.js';
import { PlatformScheduler } from '../scheduler/scheduler.js';
import { PlatformHealthMonitor } from '../health-monitor/health-monitor.js';
import { PlatformPluginLoader } from '../plugin-loader/plugin-loader.js';
import { PlatformDiagnosticsRuntime } from '../diagnostics-runtime/diagnostics-runtime.js';
import { PlatformMetricsAggregator } from '../metrics-aggregator/metrics-aggregator.js';
import { createPlatformAPI } from '../platform-api/platform-api.js';

export interface PlatformRuntimeConfig {
  readonly version?: string;
  readonly maxInitializationRetries?: number;
  readonly enableSecurityValidation?: boolean;
  readonly requiredRuntimeIds?: readonly string[];
  readonly defaultConfig?: Readonly<Record<string, ConfigValue>>;
  readonly healthCheckIntervalMs?: number;
}

export class PlatformRuntime {
  private state: PlatformState = PlatformState.Uninitialized;
  private startedAt = 0;

  private configuration: ConfigurationRuntime;
  private registry: ThreadSafeRuntimeRegistry;
  private bootstrapEngine: BootstrapEngine;
  private container: ServiceContainerImpl;
  private eventHub: PlatformEventHub;
  private commandBus: PlatformCommandBus;
  private queryBus: PlatformQueryBus;
  private scheduler: PlatformScheduler;
  private healthMonitor: PlatformHealthMonitor;
  private pluginLoader: PlatformPluginLoader;
  private diagnostics: PlatformDiagnosticsRuntime;
  private metrics: PlatformMetricsAggregator;
  private platformAPI: PlatformAPI;

  private contracts: RuntimeContract[] = [];
  private lastBootstrapResult: BootstrapResult | null = null;

  constructor(config: PlatformRuntimeConfig = {}) {
    this.configuration = new ConfigurationRuntime();
    this.registry = new ThreadSafeRuntimeRegistry();
    this.container = new ServiceContainerImpl();
    this.eventHub = new PlatformEventHub();
    this.commandBus = new PlatformCommandBus();
    this.queryBus = new PlatformQueryBus();
    this.scheduler = new PlatformScheduler();
    this.healthMonitor = new PlatformHealthMonitor();
    this.pluginLoader = new PlatformPluginLoader();
    this.diagnostics = new PlatformDiagnosticsRuntime();
    this.metrics = new PlatformMetricsAggregator();

    this.bootstrapEngine = new BootstrapEngine({
      maxInitializationRetries: config.maxInitializationRetries ?? 2,
      enableSecurityValidation: config.enableSecurityValidation ?? true,
      requiredRuntimeIds: config.requiredRuntimeIds ?? [],
    });

    if (config.defaultConfig) {
      this.configuration.loadFrom(ConfigSource.Default, config.defaultConfig);
    }

    this.diagnostics.setPlatformVersion(config.version ?? '1.0.0');

    this.container.registerSingleton('configuration', this.configuration);
    this.container.registerSingleton('eventHub', this.eventHub);
    this.container.registerSingleton('commandBus', this.commandBus);
    this.container.registerSingleton('queryBus', this.queryBus);
    this.container.registerSingleton('scheduler', this.scheduler);
    this.container.registerSingleton('healthMonitor', this.healthMonitor);
    this.container.registerSingleton('diagnostics', this.diagnostics);
    this.container.registerSingleton('metrics', this.metrics);
    this.container.registerSingleton('pluginLoader', this.pluginLoader);
    this.container.registerSingleton('container', this.container);

    this.platformAPI = createPlatformAPI({
      getState: () => this.state,
      start: () => { void this.start(); return Promise.resolve(); },
      stop: () => this.stop(),
      restart: () => this.restart(),
      getHealth: () => this.healthMonitor.checkAll(),
      getDiagnostics: () => this.diagnostics.getPlatformInfo(),
      getConfiguration: () => this.configuration.getAll(),
      dispatchCommand: (type, payload) => this.commandBus.dispatch(type, payload),
      executeQuery: (type, payload) => this.queryBus.execute(type, payload),
      publishEvent: (type, payload) => this.eventHub.publish(type, payload),
      resolve: (id) => this.container.resolve(id),
    });

    const interval = config.healthCheckIntervalMs ?? 30000;
    this.healthMonitor.startAutoCheck(interval);
  }

  registerRuntime(contract: RuntimeContract): void {
    this.contracts.push(contract);
  }

  getAPI(): PlatformAPI { return this.platformAPI; }
  getState(): PlatformState { return this.state; }

  async start(): Promise<BootstrapResult> {
    if (this.state === PlatformState.Running || this.state === PlatformState.Ready) {
      return this.lastBootstrapResult!;
    }

    this.startedAt = Date.now();
    this.state = PlatformState.Discovering;
    this.diagnostics.setState(this.state);
    this.diagnostics.setStartedAt(this.startedAt);

    const platformContext = {
      eventHub: this.eventHub,
      commandBus: this.commandBus,
      queryBus: this.queryBus,
      configuration: this.configuration,
      registry: this.registry,
      container: this.container,
      scheduler: this.scheduler,
      healthMonitor: this.healthMonitor,
      metrics: this.metrics,
      diagnostics: this.diagnostics,
    };

    this.bootstrapEngine.setPlatformContext(platformContext);

    const result = await this.bootstrapEngine.bootstrap(this.contracts);
    this.lastBootstrapResult = result;

    if (result.success) {
      this.state = PlatformState.Ready;
      this.diagnostics.setState(this.state);
      this.scheduler.start();
      void this.eventHub.publish('platform.ready', { runtimeCount: this.contracts.length }, 'platform');
      this.metrics.increment('platform.startup.total');
      this.metrics.record('platform.startup.timeMs', result.totalTimeMs);
    } else {
      this.state = PlatformState.Error;
      this.diagnostics.setState(this.state);
    }

    return result;
  }

  async stop(): Promise<void> {
    this.state = PlatformState.ShuttingDown;
    this.diagnostics.setState(this.state);
    await this.eventHub.publish('platform.shutdown.requested', {}, 'platform');
    await this.scheduler.stop();
    this.healthMonitor.stopAutoCheck();
    this.state = PlatformState.Stopped;
    this.diagnostics.setState(this.state);
    await this.eventHub.publish('platform.stopped', {}, 'platform');
  }

  async restart(): Promise<void> {
    await this.stop();
    this.contracts = [...this.contracts];
    this.state = PlatformState.Restarting;
    this.diagnostics.setState(this.state);
    await this.start();
  }

  async getHealth(): Promise<PlatformHealthSnapshot> {
    return this.healthMonitor.checkAll();
  }

  getDiagnostics(): PlatformInfo {
    return this.diagnostics.getPlatformInfo();
  }

  getTelemetry(): TelemetrySnapshot {
    const startupTimeMs = this.startedAt ? Date.now() - this.startedAt : 0;
    return Object.freeze({
      startupTimeMs,
      initializationTimeMs: this.diagnostics.getStartupProfile().totalStartupTimeMs,
      runtimeCount: this.contracts.length,
      memoryUsageMB: this.diagnostics.getMemorySnapshot().usedMemoryMB,
      cpuUsagePercent: 0,
      eventsPerSecond: this.metrics.counter('platform.events'),
      commandsPerSecond: this.metrics.counter('platform.commands'),
      queriesPerSecond: this.metrics.counter('platform.queries'),
      workflowsPerSecond: 0,
      conversationsPerSecond: 0,
      timestamp: new Date().toISOString(),
    });
  }

  getDependencyGraph(): DependencyGraph | null {
    return this.bootstrapEngine.getDependencyGraph();
  }

  getLastBootstrapResult(): BootstrapResult | null {
    return this.lastBootstrapResult;
  }

  getEventHub(): PlatformEventHub { return this.eventHub; }
  getCommandBus(): PlatformCommandBus { return this.commandBus; }
  getQueryBus(): PlatformQueryBus { return this.queryBus; }
  getConfiguration(): ConfigurationRuntime { return this.configuration; }
  getRegistry(): ThreadSafeRuntimeRegistry { return this.registry; }
  getContainer(): ServiceContainerImpl { return this.container; }
  getScheduler(): PlatformScheduler { return this.scheduler; }
  getHealthMonitor(): PlatformHealthMonitor { return this.healthMonitor; }
  getDiagnosticsRuntime(): PlatformDiagnosticsRuntime { return this.diagnostics; }
  getMetrics(): PlatformMetricsAggregator { return this.metrics; }
  getPluginLoader(): PlatformPluginLoader { return this.pluginLoader; }
  getBootstrapEngine(): BootstrapEngine { return this.bootstrapEngine; }
}