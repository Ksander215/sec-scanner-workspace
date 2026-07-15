/**
 * Scan Platform — Public API
 *
 * Single entry point for the entire Scan Platform domain module.
 *
 * Import pattern:
 *   import {
 *     ScanOrchestrator,
 *     EngineRegistry,
 *     ScanJob,
 *     ScanContextBuilder,
 *     // types
 *     type ScanEnginePlugin,
 *     type Finding,
 *     type ScanResult,
 *     // adapters for SSE
 *     toSecurityStateFinding,
 *     toSecurityStateFindings,
 *     toScanSummary,
 *   } from '@/domain/scan-platform';
 */

// ─── Core Components ──────────────────────────────────────
export { ScanOrchestrator } from './orchestrator/index.ts';
export { EngineRegistry } from './registry/index.ts';
export { ScanJob } from './scan-job/index.ts';
export { ScanContextBuilder, DEFAULT_CONSTRAINTS } from './scan-context/index.ts';

// ─── Plugin API ───────────────────────────────────────────
export type {
  ScanEnginePlugin,
  ScanEngineResult,
  ScanEngineFinding,
  ScanEngineEvent,
  EngineEventCallback,
  HealthCheckResult,
} from './plugin-api/index.ts';
export { ScanEngineEventType } from './plugin-api/index.ts';

// ─── Domain Models ────────────────────────────────────────
export type {
  Evidence,
  FindingLocation,
  Finding,
  SecurityStateFinding,
  AuthenticationConfig,
  ScopeConfig,
  RateLimitConfig,
  ScanTarget,
  SeverityBreakdown,
  EngineScanResult,
  ScanResult,
  ScanSummaryForSSE,
  ScanEngineInfo,
  ScanProfile,
  ScanConstraints,
  ScanContext,
  ScanJobSnapshot,
  EngineJobProgress,
} from './models/index.ts';

export {
  EvidenceType,
  AuthMethod,
  DEFAULT_SCOPE,
  DEFAULT_RATE_LIMIT,
  DEFAULT_AUTH,
  emptySeverityBreakdown,
  computeSeverityBreakdown,
  toScanSummary,
  BuiltinProfiles,
} from './models/index.ts';

// ─── Security State Engine Adapters ───────────────────────
export {
  toSecurityStateFinding,
  toSecurityStateFindings,
} from './models/finding.ts';

// ─── Types & Enums ────────────────────────────────────────
export {
  Severity,
  SEVERITY_WEIGHTS,
  SEVERITY_ORDER,
  ScanJobStatus,
  TERMINAL_STATUSES,
  FindingStatus,
  ScanCapability,
  ScanTriggerType,
  EngineHealthStatus,
} from './types/index.ts';

export type {
  ID,
  Timestamp,
  AbsoluteUrl,
  HttpMethod,
  HeaderPair,
  StringMap,
  Metadata,
} from './types/index.ts';

// ─── Domain Events ────────────────────────────────────────
export type {
  ScanPlatformEvent,
  ScanJobCreatedEvent,
  ScanJobStartedEvent,
  ScanJobProgressEvent,
  ScanJobCompletedEvent,
  ScanJobFailedEvent,
  ScanJobCancelledEvent,
  FindingDetectedEvent,
  EngineRegisteredEvent,
  EngineUnregisteredEvent,
  EngineHealthChangedEvent,
  AnyScanPlatformEvent,
} from './events/index.ts';

// ─── Errors ───────────────────────────────────────────────
export {
  ScanPlatformError,
  EngineAlreadyRegisteredError,
  EngineNotFoundError,
  EngineDisabledError,
  NoCapableEngineError,
  ScanJobNotFoundError,
  ScanJobTerminalError,
  InvalidJobTransitionError,
  OrchestratorNotStartedError,
  OrchestratorAlreadyRunningError,
  PluginContractError,
  PluginHealthCheckError,
} from './errors/index.ts';

// ─── Orchestrator Events ──────────────────────────────────
export type {
  OrchestratorEvent,
  OrchestratorEventHandler,
} from './orchestrator/index.ts';

// ─── Registry Events ──────────────────────────────────────
export type {
  RegistryEvent,
  RegistryEventHandler,
} from './registry/index.ts';

// ─── Pipeline (TASK-202E — overlay, no TASK-201 changes) ──
export {
  PipelineExecutor,
  BuiltinStages,
  createPipelineExecutor,
  PipelineStatus,
  StageStatus,
  TERMINAL_PIPELINE_STATUSES,
  TERMINAL_STAGE_STATUSES,
  ArtifactCategory,
  PipelineEventType,
  ArtifactBusImpl,
  createArtifactBus,
  PipelineEventBusImpl,
  createEventBus,
  PipelineState,
  MetricsCollector,
  createMetricsCollector,
  RetryManager,
  classifyError,
  createRetryManager,
  FailureRecoveryManager,
  createFailureRecoveryManager,
  createDiscoveryStub,
  createPassiveStub,
  createActiveStub,
  createTargetValidationStub,
  createNormalizationStub,
} from './pipeline/index.ts';

export type {
  PipelineStageDefinition,
  PipelineStage,
  PipelineStageError,
  PipelineArtifact,
  PipelineEvent,
  PipelineContextSnapshot,
  PipelineResult,
  PipelineMetrics,
  PipelineConfig,
  StageHandler,
  StageTiming,
  ArtifactBusReadonly,
  ArtifactBusWriteable,
  ArtifactBus,
  PipelineEventBusReadonly,
  PipelineEventBusWriteable,
  PipelineEventBus,
  MetricsExporter,
  ClassifiedError,
  PipelineSnapshot,
  RecoveryPlan,
} from './pipeline/index.ts';

// ─── Discovery Engine (TASK-202B — overlay, no TASK-201 changes) ──
export {
  KatanaAdapter,
  AttackSurface,
  createEmptyAttackSurface,
  ScopeManager,
  DEFAULT_DISCOVERY_SCOPE,
  includeGlob,
  excludeGlob,
  includeRegex,
  excludeRegex,
  includeExact,
  excludeExact,
  includeWildcard,
  excludeWildcard,
  excludeExtension,
  createDiscoveryStageHandler,
  DefaultFetcher,
  MockFetcher,
  TokenBucketRateLimiter,
  Semaphore,
} from '../../engines/discovery/index.ts';

export type {
  DiscoveryAdapterConfig,
  DiscoveryScopeConfig,
  ScopeRule,
  DiscoveryStageHandlerConfig,
  HttpClient,
  FetchResponse,
  FetchOptions,
  MockResponse,
  DiscoveredUrl,
  DiscoveredForm,
  DiscoveredEndpoint,
  DiscoveredJsFile,
  DiscoveredParameter,
  DiscoveredTechnology,
  DiscoveredRobotsEntry,
  DiscoveredSitemapEntry,
  DiscoveredExternalDomain,
  DiscoveredStaticResource,
  DiscoverySnapshot,
  DiscoveryStats,
  DiscoveryResult,
  ScopeRuleType,
  ScopeMatchType,
  UrlSource,
  EndpointType,
  JsAssetType,
  StaticResourceType,
  TechnologyCategory,
  FormInput,
  KatanaOutputRow,
  KatanaVersionInfo,
} from '../../engines/discovery/index.ts';