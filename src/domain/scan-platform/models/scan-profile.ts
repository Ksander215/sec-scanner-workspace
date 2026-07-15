/**
 * Scan Platform — Models: Scan Profile
 *
 * A reusable configuration preset for scans.
 * Users can create profiles like "Quick Scan", "Full Scan", "API Only".
 */

import type { ID, Timestamp, StringMap } from '../types/index.ts';
import type { ScanCapability, HeaderPair } from '../types/index.ts';
import type { AuthenticationConfig, ScopeConfig, RateLimitConfig } from './scan-target.ts';

// ─── Scan Profile ──────────────────────────────────────────

/**
 * A named set of scan parameters that can be reused across targets.
 */
export interface ScanProfile {
  /** Unique identifier. */
  readonly id: ID;
  /** Human-readable profile name (e.g. "Quick Scan", "Full Scan"). */
  readonly name: string;
  /** Description of what this profile does. */
  readonly description: string;
  /** Whether this is a system-provided (immutable) profile. */
  readonly isBuiltin: boolean;
  /** Which scan capabilities to exercise. */
  readonly requiredCapabilities: readonly ScanCapability[];
  /** Authentication override (null = use target's auth). */
  readonly authentication: AuthenticationConfig | null;
  /** Scope override (null = use target's scope). */
  readonly scope: ScopeConfig | null;
  /** Rate limit override (null = use target's rate limit). */
  readonly rateLimit: RateLimitConfig | null;
  /** Additional headers. */
  readonly customHeaders: readonly HeaderPair[];
  /** Global timeout in seconds for the entire scan. */
  readonly timeoutSeconds: number;
  /** Maximum number of findings to report (0 = unlimited). */
  readonly maxFindings: number;
  /** Severity threshold — only report findings at or above this level. */
  readonly minimumSeverity?: string;
  /** Whether to stop on first critical finding. */
  readonly stopOnCritical: boolean;
  /** Tags for categorization. */
  readonly tags: readonly string[];
  /** Custom metadata. */
  readonly metadata?: StringMap;
  /** When the profile was created. */
  readonly createdAt: Timestamp;
  /** When the profile was last updated. */
  readonly updatedAt: Timestamp;
}

// ─── Built-in Profiles ─────────────────────────────────────

/** Factory for built-in scan profiles. */
export const BuiltinProfiles = {
  quickScan(): Omit<ScanProfile, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: 'Quick Scan',
      description: 'Fast passive scan with common vulnerability checks. Low impact, suitable for CI/CD pipelines.',
      isBuiltin: true,
      requiredCapabilities: ['passive_analysis', 'header_analysis', 'ssl_tls_check'] as any,
      authentication: null,
      scope: null,
      rateLimit: null,
      customHeaders: [],
      timeoutSeconds: 300,
      maxFindings: 100,
      minimumSeverity: 'low',
      stopOnCritical: false,
      tags: ['quick', 'passive'],
    };
  },

  fullScan(): Omit<ScanProfile, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: 'Full Scan',
      description: 'Comprehensive scan with active testing, crawling, and fuzzing. High coverage, higher impact.',
      isBuiltin: true,
      requiredCapabilities: [
        'crawling', 'vulnerability_detection', 'fuzzing',
        'header_analysis', 'ssl_tls_check', 'misconfiguration_detection',
      ] as any,
      authentication: null,
      scope: null,
      rateLimit: null,
      customHeaders: [],
      timeoutSeconds: 3600,
      maxFindings: 0,
      stopOnCritical: false,
      tags: ['full', 'active', 'comprehensive'],
    };
  },

  apiScan(): Omit<ScanProfile, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: 'API Scan',
      description: 'Focus on API endpoints. Tests for injection, broken auth, and BOLA.',
      isBuiltin: true,
      requiredCapabilities: ['api_scanning', 'vulnerability_detection'] as any,
      authentication: null,
      scope: null,
      rateLimit: null,
      customHeaders: [],
      timeoutSeconds: 600,
      maxFindings: 200,
      minimumSeverity: 'low',
      stopOnCritical: false,
      tags: ['api', 'rest', 'graphql'],
    };
  },
} as const;