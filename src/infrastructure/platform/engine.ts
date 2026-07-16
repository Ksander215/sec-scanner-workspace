/** INT-020: Security Intelligence Platform 2.0 — Unified Engine */
import type {
  PlatformConfig, PlatformStatus, PlatformHealth, ModuleStatus,
  HealthCheck, PlatformMetrics, PlatformFeature, PlatformModules,
} from './types.js';

const DEFAULT_CONFIG: PlatformConfig = {
  name: 'Security Intelligence Platform',
  version: '2.0.0',
  environment: 'development',
  nodeId: crypto.randomUUID(),
  features: {
    'distributed-pipeline': true, 'event-bus': true, 'saga': true, 'scheduler': true,
    'cluster-coordination': false, 'multi-tenancy': true, 'streaming': true,
    'ai-layer': false, 'ai-risk-assistant': false, 'ai-remediation': false, 'ai-threat-hunting': false, 'ai-copilot': false,
    'sso': false, 'siem': false, 'ticketing': false, 'notification': true, 'cmdb': false, 'secrets': false,
    'threat-intel': true, 'detection-engineering': true, 'attack-simulation': false,
    'data-lake': false, 'analytics': true, 'dashboards': true, 'compliance': false,
    'cloud-aws': false, 'cloud-azure': false, 'cloud-gcp': false, 'cloud-k8s': false,
  },
  modules: {
    eventBus: { enabled: true }, messageBroker: { enabled: false },
    distributedPipeline: { enabled: true, concurrency: 4 },
    saga: { enabled: true, maxConcurrent: 10 },
    scheduler: { enabled: true, tickIntervalMs: 1000 },
    cluster: { enabled: false, heartbeatMs: 2000 },
    multiTenancy: { enabled: true, defaultPlan: 'professional' },
    streaming: { enabled: true, batchSize: 100 },
    ai: { enabled: false, provider: 'openai' },
    enterprise: { sso: false, siem: false, ticketing: false, notification: true, cmdb: false, secrets: false },
    threatIntel: { enabled: true, feeds: ['cve', 'mitre'] },
    detection: { enabled: true, maxRules: 10000 },
    attackSim: { enabled: false, dryRun: true },
    dataLake: { enabled: false, backend: 'duckdb' },
    analytics: { enabled: true, dashboards: true, compliance: false },
    cloud: { enabled: false, providers: [] },
  },
};

export class Platform {
  private config: PlatformConfig;
  private startedAt?: Date;
  private moduleStatuses: Map<string, ModuleStatus> = new Map();
  private initialized = false;

  // Module references (lazy-loaded)
  private modules: Map<string, unknown> = new Map();

  constructor(config?: Partial<PlatformConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      features: { ...DEFAULT_CONFIG.features, ...config?.features },
      modules: { ...DEFAULT_CONFIG.modules, ...config?.modules },
    };
  }

  /** Initialize the platform */
  async initialize(): Promise<void> {
    this.startedAt = new Date();

    // Initialize core modules
    const initOrder = [
      'eventBus', 'multiTenancy', 'distributedPipeline', 'saga',
      'scheduler', 'streaming', 'threatIntel', 'detection',
      'analytics', 'dataLake', 'cloud', 'ai', 'enterprise',
    ];

    for (const moduleName of initOrder) {
      const moduleConfig = this.config.modules[moduleName as keyof PlatformModules];
      if (moduleConfig && 'enabled' in moduleConfig && moduleConfig.enabled) {
        this.moduleStatuses.set(moduleName, {
          name: moduleName,
          enabled: true,
          status: 'initialized',
          version: this.config.version,
          health: 'healthy',
          uptimeMs: 0,
        });
      }
    }

    this.initialized = true;
  }

  /** Start the platform */
  async start(): Promise<PlatformStatus> {
    if (!this.initialized) await this.initialize();

    // Start all enabled modules
    for (const [name, status] of this.moduleStatuses) {
      if (status.enabled) {
        status.status = 'running';
        status.uptimeMs = Date.now() - this.startedAt!.getTime();
      }
    }

    return this.getStatus();
  }

  /** Stop the platform */
  async stop(): Promise<void> {
    for (const status of this.moduleStatuses.values()) {
      if (status.status === 'running') {
        status.status = 'disabled';
      }
    }
  }

  /** Get platform status */
  getStatus(): PlatformStatus {
    return {
      version: this.config.version,
      nodeId: this.config.nodeId,
      startedAt: this.startedAt ?? new Date(),
      uptimeMs: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      status: this.calculateOverallStatus(),
      modules: Object.fromEntries(this.moduleStatuses),
      health: this.calculateHealth(),
    };
  }

  /** Get platform configuration */
  getConfig(): PlatformConfig {
    return { ...this.config };
  }

  /** Update feature flag */
  setFeature(feature: PlatformFeature, enabled: boolean): void {
    this.config.features[feature] = enabled;
  }

  /** Get module status */
  getModuleStatus(name: string): ModuleStatus | undefined {
    return this.moduleStatuses.get(name);
  }

  /** Register a module instance */
  registerModule(name: string, instance: unknown): void {
    this.modules.set(name, instance);
  }

  /** Get a module instance */
  getModule<T>(name: string): T | undefined {
    return this.modules.get(name) as T | undefined;
  }

  /** Run health checks */
  async runHealthChecks(): Promise<PlatformHealth> {
    const checks: HealthCheck[] = [];

    // Core health checks
    checks.push({
      name: 'platform-core',
      status: 'pass',
      message: 'Platform core is operational',
      durationMs: 1,
      timestamp: new Date(),
    });

    // Module health checks
    for (const [name, status] of this.moduleStatuses) {
      const start = Date.now();
      if (status.status === 'running') {
        checks.push({
          name: `module-${name}`,
          status: 'pass',
          message: `${name} is running`,
          durationMs: Date.now() - start,
          timestamp: new Date(),
        });
      } else if (status.enabled && status.status !== 'running') {
        checks.push({
          name: `module-${name}`,
          status: 'warn',
          message: `${name} is enabled but not running`,
          durationMs: Date.now() - start,
          timestamp: new Date(),
        });
      }
    }

    const overall = checks.some(c => c.status === 'fail') ? 'unhealthy'
      : checks.some(c => c.status === 'warn') ? 'degraded'
      : 'healthy';

    return { overall, checks };
  }

  /** Get platform metrics */
  getMetrics(): PlatformMetrics {
    return {
      version: this.config.version,
      uptimeMs: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      totalFindingsProcessed: 0,
      totalPipelinesExecuted: 0,
      totalEventsProcessed: 0,
      totalApiCalls: 0,
      activeTenants: 1,
      activeUsers: 1,
      moduleMetrics: Object.fromEntries(
        [...this.moduleStatuses.entries()].map(([name, status]) => [
          name,
          { enabled: status.enabled ? 1 : 0, running: status.status === 'running' ? 1 : 0 },
        ]),
      ),
    };
  }

  /** Get the full platform pipeline topology */
  getPipelineTopology(): string[] {
    return [
      'Scanner',
      'Normalization',
      'Correlation',
      'Knowledge Graph',
      'Risk Engine',
      'Attack Paths',
      'Impact Analysis',
      'Recommendations',
      'Explainability',
      'Persistence',
      'REST API',
      'CLI',
      'Infrastructure',
      'Distributed Platform',
      'AI Layer',
      'Enterprise Integrations',
      'Threat Intelligence',
      'Detection Engineering',
      'Attack Simulation',
      'Analytics',
      'Data Lake',
      'Cloud',
    ];
  }

  private calculateOverallStatus(): PlatformStatus['status'] {
    const statuses = [...this.moduleStatuses.values()];
    if (statuses.some(s => s.status === 'error')) return 'degraded';
    if (statuses.every(s => s.status === 'running' || !s.enabled)) return 'ready';
    if (statuses.some(s => s.status !== 'running' && s.enabled)) return 'starting';
    return 'ready';
  }

  private calculateHealth(): PlatformHealth {
    const statuses = [...this.moduleStatuses.values()];
    const hasUnhealthy = statuses.some(s => s.health === 'unhealthy');
    const hasDegraded = statuses.some(s => s.health === 'degraded');

    return {
      overall: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      checks: statuses.map(s => ({
        name: s.name,
        status: s.health === 'healthy' ? 'pass' as const : s.health === 'degraded' ? 'warn' as const : 'fail' as const,
        message: `Module ${s.name}: ${s.status}`,
        durationMs: 1,
        timestamp: new Date(),
      })),
    };
  }
}
