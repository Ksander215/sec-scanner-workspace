/**
 * Platform Integration Layer — Core Type Definitions
 * TASK-AIS-005A.000 — Platform Integration Foundation
 *
 * Defines the central types for the Platform Integration Layer:
 *   - Runtime descriptors, states, health statuses
 *   - Event, Command, Query envelopes
 *   - DI scopes, service descriptors
 *   - Bootstrap phases, telemetry, metrics
 *
 * Conforms to: CON-001.000, ARC-001.001, ADR-001..014
 */

import type { Timestamp, SemVer } from '../core/types/common.js';

// ─── Platform Runtime States ─────────────────────────────────

export enum PlatformState {
  Uninitialized = 'Uninitialized',
  Discovering = 'Discovering',
  Validating = 'Validating',
  Registering = 'Registering',
  Initializing = 'Initializing',
  Activating = 'Activating',
  Ready = 'Ready',
  Running = 'Running',
  ShuttingDown = 'ShuttingDown',
  Stopped = 'Stopped',
  Error = 'Error',
  Restarting = 'Restarting',
}

// ─── Bootstrap Phases ─────────────────────────────────────────

export enum BootstrapPhase {
  Discovery = 'Discovery',
  Validation = 'Validation',
  Registration = 'Registration',
  Initialization = 'Initialization',
  Activation = 'Activation',
  Ready = 'Ready',
}

// ─── Health Status ─────────────────────────────────────────────

export enum HealthStatus {
  Healthy = 'Healthy',
  Warning = 'Warning',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

// ─── DI Scopes ──────────────────────────────────────────────────

export enum ServiceScope {
  Singleton = 'Singleton',
  Scoped = 'Scoped',
  Transient = 'Transient',
  Factory = 'Factory',
}

// ─── Runtime Descriptor ───────────────────────────────────────

export interface RuntimeDescriptor {
  readonly id: string;
  readonly name: string;
  readonly version: SemVer;
  readonly description: string;
  readonly dependencies: readonly string[];
  readonly phase: BootstrapPhase;
  readonly health: HealthStatus;
  readonly initializedAt: Timestamp | null;
  readonly activatedAt: Timestamp | null;
  readonly instance: unknown;
}

// ─── Runtime Contract ─────────────────────────────────────────

export interface RuntimeContract {
  readonly id: string;
  readonly name: string;
  readonly version: SemVer;
  readonly description: string;
  readonly dependencies: readonly string[];
  initialize(platform: PlatformContext): Promise<void>;
  activate(platform: PlatformContext): Promise<void>;
  shutdown(platform: PlatformContext): Promise<void>;
  health(): Promise<HealthCheckResult>;
}

// ─── Platform Context (injected into every Runtime) ────────────

export interface PlatformContext {
  readonly eventHub: EventHub;
  readonly commandBus: CommandBus;
  readonly queryBus: QueryBus;
  readonly configuration: ConfigurationRuntime;
  readonly registry: RuntimeRegistry;
  readonly container: ServiceContainer;
  readonly scheduler: Scheduler;
  readonly healthMonitor: HealthMonitor;
  readonly metrics: MetricsAggregator;
  readonly diagnostics: PlatformDiagnostics;
}

// ─── Health Check ──────────────────────────────────────────────

export interface HealthCheckResult {
  readonly status: HealthStatus;
  readonly details: string;
  readonly checkedAt: Timestamp;
  readonly responseTimeMs: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ─── Event Hub Types ──────────────────────────────────────────

export interface PlatformEvent<T = unknown> {
  readonly eventId: string;
  readonly eventType: string;
  readonly source: string;
  readonly timestamp: Timestamp;
  readonly sequence: number;
  readonly payload: T;
  readonly version: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface EventSubscription {
  readonly id: string;
  readonly eventType: string;
  unsubscribe: () => void;
}

export interface EventHub {
  publish<T>(eventType: string, payload: T, source?: string): Promise<PlatformEvent<T>>;
  subscribe(eventType: string, handler: (event: PlatformEvent) => Promise<void> | void): EventSubscription;
  subscribeAll(handler: (event: PlatformEvent) => Promise<void> | void): EventSubscription;
  getEventLog(eventType?: string): readonly PlatformEvent[];
  getSequence(): number;
  clear(): void;
}

// ─── Command Bus Types ─────────────────────────────────────────

export interface CommandEnvelope<T = unknown> {
  readonly commandId: string;
  readonly commandType: string;
  readonly payload: T;
  readonly timestamp: Timestamp;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface CommandResult<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly timestamp: Timestamp;
  readonly processingTimeMs: number;
}

export interface CommandBus {
  dispatch<TPayload, TResult>(commandType: string, payload: TPayload): Promise<CommandResult<TResult>>;
  registerHandler<TPayload, TResult>(commandType: string, handler: (cmd: CommandEnvelope<TPayload>) => Promise<TResult>): void;
  setRetryPolicy(policy: RetryPolicy): void;
}

// ─── Query Bus Types ───────────────────────────────────────────

export interface QueryEnvelope<T = unknown> {
  readonly queryId: string;
  readonly queryType: string;
  readonly payload: T;
  readonly timestamp: Timestamp;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface QueryResult<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly timestamp: Timestamp;
  readonly processingTimeMs: number;
}

export interface QueryBus {
  execute<TPayload, TResult>(queryType: string, payload: TPayload): Promise<QueryResult<TResult>>;
  registerHandler<TPayload, TResult>(queryType: string, handler: (query: QueryEnvelope<TPayload>) => Promise<TResult>): void;
}

// ─── Retry Policy ──────────────────────────────────────────────

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffMultiplier: number;
}

// ─── Configuration Types ───────────────────────────────────────

export type ConfigValue = string | number | boolean | null | undefined | Readonly<Record<string, unknown>> | readonly unknown[];

export interface ConfigurationRuntime {
  get<T extends ConfigValue>(key: string, defaultValue?: T): T | undefined;
  set(key: string, value: ConfigValue): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  getAll(): Readonly<Record<string, ConfigValue>>;
  getSource(key: string): ConfigSource;
  loadFrom(source: ConfigSource, data: Readonly<Record<string, ConfigValue>>): void;
  snapshot(): Readonly<Record<string, ConfigValue>>;
  onConfigChanged(key: string, callback: (newValue: ConfigValue, oldValue: ConfigValue | undefined) => void): () => void;
}

export enum ConfigSource {
  Default = 'Default',
  User = 'User',
  Environment = 'Environment',
  Override = 'Override',
}

// ─── Runtime Registry ──────────────────────────────────────────

export interface RuntimeRegistry {
  register(descriptor: RuntimeDescriptor): void;
  get(id: string): RuntimeDescriptor | undefined;
  getByName(name: string): RuntimeDescriptor | undefined;
  getAll(): readonly RuntimeDescriptor[];
  getByPhase(phase: BootstrapPhase): readonly RuntimeDescriptor[];
  has(id: string): boolean;
  count(): number;
}

// ─── Service Container (DI) ────────────────────────────────────

export interface ServiceDescriptor {
  readonly id: string;
  readonly scope: ServiceScope;
  readonly factory: () => Promise<unknown> | unknown;
  readonly dependencies?: readonly string[];
}

export interface ServiceContainer {
  register(id: string, factory: () => Promise<unknown> | unknown, scope?: ServiceScope): void;
  registerSingleton<T>(id: string, instance: T): void;
  resolve<T>(id: string): Promise<T>;
  has(id: string): boolean;
  getAll(): ReadonlyMap<string, ServiceDescriptor>;
  createScope(): ScopedContainer;
}

export interface ScopedContainer {
  resolve<T>(id: string): Promise<T>;
  dispose(): Promise<void>;
}

// ─── Scheduler Types ────────────────────────────────────────────

export interface ScheduledTask {
  readonly id: string;
  readonly name: string;
  readonly handler: () => Promise<void> | void;
  readonly createdAt: Timestamp;
  readonly nextRunAt: Timestamp | null;
  readonly intervalMs?: number;
  readonly cronExpression?: string;
  readonly running: boolean;
}

export interface Scheduler {
  schedule(name: string, handler: () => Promise<void> | void, intervalMs: number): string;
  scheduleOnce(name: string, handler: () => Promise<void> | void, delayMs: number): string;
  scheduleCron(name: string, handler: () => Promise<void> | void, cronExpression: string): string;
  cancel(taskId: string): boolean;
  getTask(taskId: string): ScheduledTask | undefined;
  getAllTasks(): readonly ScheduledTask[];
  start(): void;
  stop(): Promise<void>;
}

// ─── Health Monitor ────────────────────────────────────────────

export interface RuntimeHealthSnapshot {
  readonly runtimeId: string;
  readonly runtimeName: string;
  readonly status: HealthStatus;
  readonly details: string;
  readonly checkedAt: Timestamp;
  readonly responseTimeMs: number;
}

export interface PlatformHealthSnapshot {
  readonly overallStatus: HealthStatus;
  readonly runtimes: readonly RuntimeHealthSnapshot[];
  readonly checkedAt: Timestamp;
}

export interface HealthMonitor {
  registerCheck(runtimeId: string, checkFn: () => Promise<HealthCheckResult>): void;
  checkAll(): Promise<PlatformHealthSnapshot>;
  checkRuntime(runtimeId: string): Promise<RuntimeHealthSnapshot>;
  getSnapshot(): PlatformHealthSnapshot | null;
  startAutoCheck(intervalMs: number): void;
  stopAutoCheck(): void;
}

// ─── Dependency Resolver Types ─────────────────────────────────

export interface DependencyGraph {
  readonly nodes: readonly string[];
  readonly edges: readonly DependencyEdge[];
  readonly resolvedOrder: readonly string[];
  readonly hasCycle: boolean;
  readonly cyclePath: readonly string[] | null;
}

export interface DependencyEdge {
  readonly from: string;
  readonly to: string;
}

// ─── Diagnostics ────────────────────────────────────────────────

export interface RuntimeDiagnosticInfo {
  readonly id: string;
  readonly name: string;
  readonly version: SemVer;
  readonly state: PlatformState;
  readonly health: HealthStatus;
  readonly dependencies: readonly string[];
  readonly memoryUsage: number;
  readonly startupTimeMs: number;
}

export interface PlatformDiagnostics {
  getPlatformInfo(): PlatformInfo;
  getRuntimeDiagnostics(): readonly RuntimeDiagnosticInfo[];
  getStartupProfile(): StartupProfile;
  getDependencyGraph(): DependencyGraph;
  getMemorySnapshot(): MemorySnapshot;
}

export interface PlatformInfo {
  readonly name: string;
  readonly version: SemVer;
  readonly state: PlatformState;
  readonly uptimeMs: number;
  readonly runtimeCount: number;
  readonly activeRuntimeCount: number;
}

export interface StartupProfile {
  readonly totalStartupTimeMs: number;
  readonly phaseTimings: Readonly<Record<BootstrapPhase, number>>;
  readonly runtimeTimings: Readonly<Record<string, number>>;
}

export interface MemorySnapshot {
  readonly totalMemoryMB: number;
  readonly usedMemoryMB: number;
  readonly freeMemoryMB: number;
  readonly perRuntime: Readonly<Record<string, number>>;
}

// ─── Metrics Types ─────────────────────────────────────────────

export interface MetricPoint {
  readonly timestamp: Timestamp;
  readonly value: number;
  readonly labels?: Readonly<Record<string, string>>;
}

export interface MetricSeries {
  readonly name: string;
  readonly points: readonly MetricPoint[];
}

export interface MetricsAggregator {
  record(name: string, value: number, labels?: Readonly<Record<string, string>>): void;
  increment(name: string, labels?: Readonly<Record<string, string>>): void;
  decrement(name: string, labels?: Readonly<Record<string, string>>): void;
  counter(name: string): number;
  gauge(name: string): number;
  getSeries(name: string): MetricSeries | undefined;
  getAllSeries(): readonly MetricSeries[];
  snapshot(): Readonly<Record<string, MetricPoint[]>>;
  reset(): void;
  export(): string;
}

// ─── Plugin Loader Types ───────────────────────────────────────

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: SemVer;
  readonly description: string;
  readonly main: string;
  readonly dependencies: readonly string[];
  readonly permissions: readonly string[];
}

export interface LoadedPlugin {
  readonly manifest: PluginManifest;
  readonly loadedAt: Timestamp;
  readonly state: 'Loaded' | 'Active' | 'Error';
  readonly error?: string;
}

// ─── Platform API (Facade) ─────────────────────────────────────

export interface PlatformAPI {
  readonly state: PlatformState;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  getHealth(): Promise<PlatformHealthSnapshot>;
  getDiagnostics(): PlatformInfo;
  getConfiguration(): Readonly<Record<string, ConfigValue>>;
  dispatchCommand<TPayload, TResult>(type: string, payload: TPayload): Promise<CommandResult<TResult>>;
  executeQuery<TPayload, TResult>(type: string, payload: TPayload): Promise<QueryResult<TResult>>;
  publishEvent<T>(type: string, payload: T): Promise<PlatformEvent<T>>;
  resolve<T>(serviceId: string): Promise<T>;
}

// ─── Telemetry ──────────────────────────────────────────────────

export interface TelemetrySnapshot {
  readonly startupTimeMs: number;
  readonly initializationTimeMs: number;
  readonly runtimeCount: number;
  readonly memoryUsageMB: number;
  readonly cpuUsagePercent: number;
  readonly eventsPerSecond: number;
  readonly commandsPerSecond: number;
  readonly queriesPerSecond: number;
  readonly workflowsPerSecond: number;
  readonly conversationsPerSecond: number;
  readonly timestamp: Timestamp;
}

// ─── Platform Error ─────────────────────────────────────────────

export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

// ─── Bootstrap Error ────────────────────────────────────────────

export class BootstrapError extends PlatformError {
  constructor(
    message: string,
    public readonly phase: BootstrapPhase,
    public readonly runtimeId?: string,
  ) {
    super(message, 'BOOTSTRAP_ERROR', { phase, runtimeId });
    this.name = 'BootstrapError';
  }
}

// ─── Dependency Cycle Error ─────────────────────────────────────

export class DependencyCycleError extends PlatformError {
  constructor(
    message: string,
    public readonly cyclePath: readonly string[],
  ) {
    super(message, 'DEPENDENCY_CYCLE', { cyclePath });
    this.name = 'DependencyCycleError';
  }
}

// ─── Runtime Registration Error ────────────────────────────────

export class RuntimeRegistrationError extends PlatformError {
  constructor(
    message: string,
    public readonly runtimeId: string,
  ) {
    super(message, 'RUNTIME_REGISTRATION_ERROR', { runtimeId });
    this.name = 'RuntimeRegistrationError';
  }
}

// ─── Security Validation Error ─────────────────────────────────

export class SecurityValidationError extends PlatformError {
  constructor(
    message: string,
    public readonly runtimeId: string,
    public readonly reason: string,
  ) {
    super(message, 'SECURITY_VALIDATION_ERROR', { runtimeId, reason });
    this.name = 'SecurityValidationError';
  }
}
