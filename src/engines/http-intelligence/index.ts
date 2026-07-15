/**
 * HTTP Intelligence Engine — Barrel Exports
 *
 * Public API for the HTTP Intelligence module.
 * Designed as a standalone, product-grade module.
 *
 * Architecture:
 *   HttpIntelligenceAdapter (ScanEnginePlugin)
 *   ├── TlsIntelligence
 *   ├── SecurityHeadersIntelligence
 *   ├── HttpBehaviourIntelligence
 *   ├── InfrastructureFingerprinting
 *   ├── CookieIntelligence
 *   ├── RateLimitingIntelligence
 *   ├── HttpArtifactPublisher
 *   └── DefaultHttpClient / MockHttpClient
 *
 * Future standalone product capabilities:
 *   - Continuous HTTP Monitoring
 *   - Baseline Comparison
 *   - Drift Detection
 *   - API Security Profiling
 */

// ─── Core Adapter ────────────────────────────────────────────
export { HttpIntelligenceAdapter } from './http-intelligence-adapter.ts';
export type { HttpIntelligenceAdapterConfig } from './http-intelligence-adapter.ts';

// ─── Stage Handler (Pipeline Bridge) ─────────────────────────
export { createHttpIntelligenceStageHandler } from './stage-handler.ts';
export type { HttpStageHandlerConfig } from './stage-handler.ts';

// ─── Types ───────────────────────────────────────────────────
export {
  HttpProtocolVersion,
  TlsVersion,
  TlsVersionStatus,
  TlsGrade,
  HttpArtifactType,
  HeaderSecurityStatus,
  RedirectType,
  InfrastructureType,
  CookiePrefix,
  RateLimitStatus,
  HttpPhase,
} from './http-types.ts';

export type {
  TlsCipherSuite,
  TlsCertificateInfo,
  TlsProfile,
  TlsProbeResult,
  SecurityHeaderAnalysis,
  HeaderProfile,
  RedirectHop,
  RedirectChain,
  CachingStrategy,
  CompressionInfo,
  ContentNegotiation,
  ErrorPageInfo,
  StatusConsistencyIssue,
  HttpBehaviourProfile,
  FingerprintMatch,
  InfrastructureProfile,
  CookieAnalysis,
  CookieIssue,
  CookieProfile,
  RateLimitProbeResult,
  RateLimitProfile,
  HttpIntelligenceConfig,
  HttpIntelligenceData,
  HttpPerformanceMetrics,
  HttpResponse,
  HttpRequestOptions,
  IHttpClient,
} from './http-types.ts';

export { DEFAULT_HTTP_CONFIG } from './http-types.ts';

// ─── HTTP Client ─────────────────────────────────────────────
export {
  DefaultHttpClient,
  MockHttpClient,
  createHttpClient,
  DnsCache,
  HttpRateLimiter,
} from './http-client.ts';

export type { MockHttpResponse } from './http-client.ts';

// ─── TLS Intelligence ────────────────────────────────────────
export { TlsIntelligence } from './tls-intelligence.ts';

// ─── Security Headers Intelligence ───────────────────────────
export { SecurityHeadersIntelligence } from './security-headers.ts';

// ─── HTTP Behaviour Intelligence ─────────────────────────────
export { HttpBehaviourIntelligence } from './http-behaviour.ts';

// ─── Infrastructure Fingerprinting ───────────────────────────
export { InfrastructureFingerprinting } from './infra-fingerprinting.ts';

// ─── Cookie Intelligence ─────────────────────────────────────
export { CookieIntelligence } from './cookie-intelligence.ts';

// ─── Rate Limiting Intelligence ──────────────────────────────
export { RateLimitingIntelligence } from './rate-limiting.ts';

// ─── Artifacts ───────────────────────────────────────────────
export { HttpArtifactPublisher, HTTP_STAGE_ID, HTTP_ENGINE_ID } from './http-artifacts.ts';