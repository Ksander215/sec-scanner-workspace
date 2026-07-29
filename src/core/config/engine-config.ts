/**
 * Engine Configuration
 * ADR-004: File-based persistence paths.
 * ADR-009: Default autonomy level.
 */
import { AutonomyLevel } from '../types/common.js';

export interface EngineConfig {
  /** Default autonomy level (ADR-009: default L1) */
  readonly defaultAutonomyLevel: AutonomyLevel;
  /** Data root directory (ADR-004: file-based storage) */
  readonly dataRoot: string;
  /** Audit log path (AL-012: append-only) */
  readonly auditLogPath: string;
  /** Event log max entries (0 = unlimited) */
  readonly eventLogMaxEntries: number;
  /** Plugin sandbox timeout (ms) */
  readonly pluginTimeout: number;
  /** Provider health check interval (ms) */
  readonly healthCheckInterval: number;
  /** Enable audit logging */
  readonly auditEnabled: boolean;
}

export const DefaultEngineConfig: EngineConfig = {
  defaultAutonomyLevel: AutonomyLevel.Suggest,
  dataRoot: './ais-data',
  auditLogPath: './ais-data/audit/audit.log',
  eventLogMaxEntries: 10000,
  pluginTimeout: 30000,
  healthCheckInterval: 60000,
  auditEnabled: true,
};
