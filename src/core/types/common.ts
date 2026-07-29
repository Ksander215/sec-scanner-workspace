/**
 * AIS Core — Common Types
 * Shared primitives used across all modules.
 * Conforms to: ARC-001.001 §5 (Module Architecture)
 */

/** ISO-8601 timestamp string */
export type Timestamp = string;

/** UUID v4 identifier */
export type Identifier = string;

/** Semantic version string (MAJOR.MINOR) */
export type SemVer = string;

/**
 * Autonomy Level — ADR-009, ARC-001.001 §4
 * INV-003: Autonomy level is always in range [L0, L4].
 */
export enum AutonomyLevel {
  Observe = 'L0',
  Suggest = 'L1',
  ActOnApproval = 'L2',
  ActAndReport = 'L3',
  Autonomous = 'L4',
}

/**
 * Trust Zone — ADR-010, ARC-001.001 §3
 */
export enum TrustZone {
  Constitutional = 'Z0',
  CoreAIS = 'Z1',
  PluginSandbox = 'Z2',
  ProviderInterface = 'Z3',
  External = 'Z4',
}

/**
 * Event Classification — ARC-001.001 §5.2
 * INV-012: No domain event without a classification.
 */
export enum EventClassification {
  Info = 'info',
  Action = 'action',
  Result = 'result',
  Error = 'error',
  StateChange = 'state-change',
}

/**
 * Provider Type — DOM-002.000 §1.16
 */
export enum ProviderType {
  LLM = 'LLM',
  Scanner = 'Scanner',
  Storage = 'Storage',
  Embedding = 'Embedding',
}

/**
 * Generic result type for operations that may fail.
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Engine lifecycle state.
 */
export enum EngineState {
  Uninitialized = 'uninitialized',
  Initializing = 'initializing',
  Ready = 'ready',
  Running = 'running',
  Stopping = 'stopping',
  Stopped = 'stopped',
  ShutDown = 'shutdown',
  Error = 'error',
}
