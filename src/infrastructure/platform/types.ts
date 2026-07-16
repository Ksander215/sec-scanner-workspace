/** INT-020: Security Intelligence Platform 2.0 — Types */

export interface PlatformConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  nodeId: string;
  /** Feature flags */
  features: Record<PlatformFeature, boolean>;
  /** Infrastructure modules config */
  modules: PlatformModules;
}

export type PlatformFeature =
  | 'distributed-pipeline' | 'event-bus' | 'saga' | 'scheduler'
  | 'cluster-coordination' | 'multi-tenancy' | 'streaming'
  | 'ai-layer' | 'ai-risk-assistant' | 'ai-remediation' | 'ai-threat-hunting' | 'ai-copilot'
  | 'sso' | 'siem' | 'ticketing' | 'notification' | 'cmdb' | 'secrets'
  | 'threat-intel' | 'detection-engineering' | 'attack-simulation'
  | 'data-lake' | 'analytics' | 'dashboards' | 'compliance'
  | 'cloud-aws' | 'cloud-azure' | 'cloud-gcp' | 'cloud-k8s';

export interface PlatformModules {
  eventBus?: { enabled: boolean; provider?: string };
  messageBroker?: { enabled: boolean; provider?: string };
  distributedPipeline?: { enabled: boolean; concurrency?: number };
  saga?: { enabled: boolean; maxConcurrent?: number };
  scheduler?: { enabled: boolean; tickIntervalMs?: number };
  cluster?: { enabled: boolean; heartbeatMs?: number };
  multiTenancy?: { enabled: boolean; defaultPlan?: string };
  streaming?: { enabled: boolean; batchSize?: number };
  ai?: { enabled: boolean; provider?: string; model?: string };
  enterprise?: { sso?: boolean; siem?: boolean; ticketing?: boolean; notification?: boolean; cmdb?: boolean; secrets?: boolean };
  threatIntel?: { enabled: boolean; feeds?: string[] };
  detection?: { enabled: boolean; maxRules?: number };
  attackSim?: { enabled: boolean; dryRun?: boolean };
  dataLake?: { enabled: boolean; backend?: string };
  analytics?: { enabled: boolean; dashboards?: boolean; compliance?: boolean };
  cloud?: { enabled: boolean; providers?: string[] };
}

export interface PlatformStatus {
  version: string;
  nodeId: string;
  startedAt: Date;
  uptimeMs: number;
  status: 'starting' | 'ready' | 'degraded' | 'error' | 'stopping';
  modules: Record<string, ModuleStatus>;
  health: PlatformHealth;
}

export interface ModuleStatus {
  name: string;
  enabled: boolean;
  status: 'initialized' | 'running' | 'error' | 'disabled';
  version: string;
  health: 'healthy' | 'degraded' | 'unhealthy';
  uptimeMs: number;
  lastError?: string;
}

export interface PlatformHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  durationMs: number;
  timestamp: Date;
}

export interface PlatformMetrics {
  version: string;
  uptimeMs: number;
  totalFindingsProcessed: number;
  totalPipelinesExecuted: number;
  totalEventsProcessed: number;
  totalApiCalls: number;
  activeTenants: number;
  activeUsers: number;
  moduleMetrics: Record<string, Record<string, number>>;
}
