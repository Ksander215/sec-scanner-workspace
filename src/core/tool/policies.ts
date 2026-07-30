/**
 * Runtime Policies — Configurable policies for Tool Runtime.
 *
 * Conforms to: AIS-003C.000 Requirement #13 (Runtime Policies)
 *
 * Policies:
 *   - TimeoutPolicy
 *   - SecurityPolicy
 *   - CapabilityPolicy
 *   - RecoveryPolicy
 */
import type {
  TimeoutPolicy,
  SecurityPolicy,
  CapabilityPolicy,
  ToolRecoveryPolicy,
} from './types.js';
import { ToolCapability, ToolTrustLevel } from './types.js';

// ─── Default Timeout Policy ─────────────────────────────────
export const DEFAULT_TIMEOUT_POLICY: TimeoutPolicy = {
  defaultTimeoutMs: 30_000,
  maxTimeoutMs: 300_000,
};

// ─── Default Security Policy ────────────────────────────────
export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  maxMemoryBytes: 0,
  enforceSandbox: true,
  allowedTrustLevels: [
    ToolTrustLevel.Trusted,
    ToolTrustLevel.Standard,
    ToolTrustLevel.Restricted,
  ],
};

// ─── Default Capability Policy ──────────────────────────────
/**
 * Maps trust levels to allowed capabilities.
 * AL-012 (Minimal Privilege): Untrusted tools get no capabilities.
 */
export class DefaultCapabilityPolicy implements CapabilityPolicy {
  private readonly mapping: Map<ToolTrustLevel, readonly ToolCapability[]>;

  constructor() {
    this.mapping = new Map<ToolTrustLevel, readonly ToolCapability[]>([
      [
        ToolTrustLevel.Trusted,
        [
          ToolCapability.Filesystem,
          ToolCapability.Network,
          ToolCapability.Memory,
          ToolCapability.Shell,
          ToolCapability.Knowledge,
          ToolCapability.Planner,
        ],
      ],
      [
        ToolTrustLevel.Standard,
        [
          ToolCapability.Filesystem,
          ToolCapability.Memory,
          ToolCapability.Knowledge,
        ],
      ],
      [
        ToolTrustLevel.Restricted,
        [
          ToolCapability.Memory,
          ToolCapability.Knowledge,
        ],
      ],
      [
        ToolTrustLevel.Untrusted,
        [],
      ],
    ]);
  }

  getAllowedCapabilities(trustLevel: ToolTrustLevel): readonly ToolCapability[] {
    return this.mapping.get(trustLevel) ?? [];
  }

  isCapabilityAllowed(trustLevel: ToolTrustLevel, capability: ToolCapability): boolean {
    const allowed = this.getAllowedCapabilities(trustLevel);
    return allowed.includes(capability);
  }
}

// ─── Default Recovery Policy ────────────────────────────────
export const DEFAULT_TOOL_RECOVERY_POLICY: ToolRecoveryPolicy = {
  maxRetries: 2,
  retryOnTimeout: true,
  retryOnCapabilityDenied: false,
};
