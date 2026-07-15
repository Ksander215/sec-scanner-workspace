/**
 * Scan Platform — Domain Models: Public API
 *
 * Barrel export for all domain models.
 * Import from here: import { Finding, ScanTarget, ... } from '../models/index.ts'
 */

// Finding
export {
  type Evidence,
  type FindingLocation,
  type Finding,
  type SecurityStateFinding,
  toSecurityStateFinding,
  toSecurityStateFindings,
  EvidenceType,
} from './finding.ts';

// ScanTarget
export {
  type AuthenticationConfig,
  type ScopeConfig,
  type RateLimitConfig,
  type ScanTarget,
  AuthMethod,
  DEFAULT_SCOPE,
  DEFAULT_RATE_LIMIT,
  DEFAULT_AUTH,
} from './scan-target.ts';

// ScanResult
export {
  type SeverityBreakdown,
  type EngineScanResult,
  type ScanResult,
  type ScanSummaryForSSE,
  emptySeverityBreakdown,
  computeSeverityBreakdown,
  toScanSummary,
} from './scan-result.ts';

// ScanEngineInfo
export {
  type ScanEngineInfo,
  type HealthCheckResult,
} from './scan-engine-info.ts';

// ScanProfile
export {
  type ScanProfile,
  BuiltinProfiles,
} from './scan-profile.ts';