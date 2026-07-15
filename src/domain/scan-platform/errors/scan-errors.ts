/**
 * Scan Platform — Custom Error Classes
 *
 * Structured errors for the Scan Platform domain.
 * Each error carries a machine-readable code and context.
 */

// ─── Base ──────────────────────────────────────────────────

export abstract class ScanPlatformError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  /** Serialize for logging / API responses. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// ─── Registry Errors ───────────────────────────────────────

/** Attempted to register an engine with an ID that already exists. */
export class EngineAlreadyRegisteredError extends ScanPlatformError {
  constructor(engineId: string) {
    super(
      `Engine "${engineId}" is already registered`,
      'ENGINE_ALREADY_REGISTERED',
      { engineId },
    );
  }
}

/** No engine found with the given ID. */
export class EngineNotFoundError extends ScanPlatformError {
  constructor(engineId: string) {
    super(
      `Engine "${engineId}" not found`,
      'ENGINE_NOT_FOUND',
      { engineId },
    );
  }
}

/** Engine is registered but disabled. */
export class EngineDisabledError extends ScanPlatformError {
  constructor(engineId: string) {
    super(
      `Engine "${engineId}" is disabled`,
      'ENGINE_DISABLED',
      { engineId },
    );
  }
}

/** No engine available with the required capabilities. */
export class NoCapableEngineError extends ScanPlatformError {
  constructor(requiredCapabilities: readonly string[]) {
    super(
      `No engine available with capabilities: ${requiredCapabilities.join(', ')}`,
      'NO_CAPABLE_ENGINE',
      { requiredCapabilities },
    );
  }
}

// ─── Job Errors ────────────────────────────────────────────

/** No job found with the given ID. */
export class ScanJobNotFoundError extends ScanPlatformError {
  constructor(jobId: string) {
    super(
      `Scan job "${jobId}" not found`,
      'SCAN_JOB_NOT_FOUND',
      { jobId },
    );
  }
}

/** Job is in a terminal state and cannot be transitioned. */
export class ScanJobTerminalError extends ScanPlatformError {
  constructor(jobId: string, status: string) {
    super(
      `Cannot transition job "${jobId}" — already in terminal state "${status}"`,
      'SCAN_JOB_TERMINAL',
      { jobId, status },
    );
  }
}

/** Job is in an invalid state for the requested transition. */
export class InvalidJobTransitionError extends ScanPlatformError {
  constructor(jobId: string, from: string, to: string) {
    super(
      `Invalid transition for job "${jobId}": ${from} → ${to}`,
      'INVALID_JOB_TRANSITION',
      { jobId, from, to },
    );
  }
}

// ─── Orchestrator Errors ───────────────────────────────────

/** Orchestrator has not been started. */
export class OrchestratorNotStartedError extends ScanPlatformError {
  constructor() {
    super(
      'Orchestrator has not been started',
      'ORCHESTRATOR_NOT_STARTED',
    );
  }
}

/** Orchestrator is already running. */
export class OrchestratorAlreadyRunningError extends ScanPlatformError {
  constructor() {
    super(
      'Orchestrator is already running',
      'ORCHESTRATOR_ALREADY_RUNNING',
    );
  }
}

// ─── Plugin Errors ─────────────────────────────────────────

/** A plugin violated the contract (returned invalid data, etc.). */
export class PluginContractError extends ScanPlatformError {
  constructor(engineId: string, reason: string) {
    super(
      `Plugin "${engineId}" contract violation: ${reason}`,
      'PLUGIN_CONTRACT_VIOLATION',
      { engineId, reason },
    );
  }
}

/** Plugin health check failed. */
export class PluginHealthCheckError extends ScanPlatformError {
  constructor(engineId: string, reason: string) {
    super(
      `Plugin "${engineId}" health check failed: ${reason}`,
      'PLUGIN_HEALTH_CHECK_FAILED',
      { engineId, reason },
    );
  }
}