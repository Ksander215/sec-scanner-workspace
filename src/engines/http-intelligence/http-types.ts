/**
 * HTTP Intelligence Engine — Types & Models
 *
 * Comprehensive type system for HTTP protocol analysis.
 * Covers TLS, Security Headers, HTTP Behaviour, Infrastructure,
 * Cookies, Rate Limiting, and all artifact types.
 *
 * Zero dependencies on engine internals — pure domain types.
 */

import type { ID, Timestamp, Severity } from '../../domain/scan-platform/types/index.ts';

// ═══════════════════════════════════════════════════════════════
// HTTP Protocol Version
// ═══════════════════════════════════════════════════════════════

export enum HttpProtocolVersion {
  Http1_1 = 'HTTP/1.1',
  Http2 = 'HTTP/2',
  Http3 = 'HTTP/3',
  Unknown = 'unknown',
}

// ═══════════════════════════════════════════════════════════════
// TLS Types
// ═══════════════════════════════════════════════════════════════

export enum TlsVersion {
  Tls1_0 = 'TLSv1.0',
  Tls1_1 = 'TLSv1.1',
  Tls1_2 = 'TLSv1.2',
  Tls1_3 = 'TLSv1.3',
  Ssl3_0 = 'SSLv3.0',
  Unknown = 'unknown',
}

export enum TlsVersionStatus {
  Secure = 'secure',
  Acceptable = 'acceptable',
  Insecure = 'insecure',
  Deprecated = 'deprecated',
  Unknown = 'unknown',
}

export interface TlsCipherSuite {
  readonly name: string;
  readonly protocol: TlsVersion;
  readonly keySize: number;
  readonly algorithm: string;
  readonly status: TlsVersionStatus;
}

export interface TlsCertificateInfo {
  readonly subject: string;
  readonly issuer: string;
  readonly serialNumber: string;
  readonly notBefore: Timestamp;
  readonly notAfter: Timestamp;
  readonly daysRemaining: number;
  readonly isExpired: boolean;
  readonly isSelfSigned: boolean;
  readonly isWildcard: boolean;
  readonly sanEntries: readonly string[];
  readonly publicKeyAlgorithm: string;
  readonly publicKeySize: number;
  readonly signatureAlgorithm: string;
  readonly isWeakKey: boolean;
}

export interface TlsProfile {
  readonly version: TlsVersion;
  readonly versionStatus: TlsVersionStatus;
  readonly cipherSuites: readonly TlsCipherSuite[];
  readonly alpnProtocols: readonly string[];
  readonly hstsEnabled: boolean;
  readonly hstsMaxAge: number;
  readonly hstsIncludeSubdomains: boolean;
  readonly hstsPreload: boolean;
  readonly ocspStapling: boolean;
  readonly certificateChain: readonly TlsCertificateInfo[];
  readonly leafCertificate: TlsCertificateInfo | null;
  readonly chainIssues: readonly string[];
  readonly overallGrade: TlsGrade;
}

export enum TlsGrade {
  A_Plus = 'A+',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  T = 'T',
}

// ═══════════════════════════════════════════════════════════════
// Security Header Types
// ═══════════════════════════════════════════════════════════════

export enum HeaderSecurityStatus {
  Secure = 'secure',
  Warning = 'warning',
  Missing = 'missing',
  Misconfigured = 'misconfigured',
  Vulnerable = 'vulnerable',
}

export interface SecurityHeaderAnalysis {
  readonly headerName: string;
  readonly value: string | null;
  readonly status: HeaderSecurityStatus;
  readonly severity: Severity;
  readonly description: string;
  readonly recommendation: string;
  readonly details?: Record<string, unknown>;
}

export interface HeaderProfile {
  readonly url: string;
  readonly analyses: readonly SecurityHeaderAnalysis[];
  readonly secureCount: number;
  readonly warningCount: number;
  readonly missingCount: number;
  readonly misconfiguredCount: number;
  readonly vulnerableCount: number;
  readonly overallScore: number; // 0–100
}

// ═══════════════════════════════════════════════════════════════
// HTTP Behaviour Types
// ═══════════════════════════════════════════════════════════════

export enum RedirectType {
  Permanent = 301,
  Temporary = 302,
  SeeOther = 303,
  NotModified = 304,
  TemporaryRedirect = 307,
  PermanentRedirect = 308,
  MetaRefresh = 'meta_refresh',
  JavaScript = 'javascript',
}

export interface RedirectHop {
  readonly url: string;
  readonly statusCode: number;
  readonly redirectType: RedirectType;
  readonly headers: ReadonlyMap<string, string>;
  readonly latencyMs: number;
}

export interface RedirectChain {
  readonly id: string;
  readonly sourceUrl: string;
  readonly finalUrl: string;
  readonly hops: readonly RedirectHop[];
  readonly totalHops: number;
  readonly totalLatencyMs: number;
  readonly hasLoop: boolean;
  readonly hasOpenRedirect: boolean;
  readonly crossesOrigin: boolean;
}

export interface CachingStrategy {
  readonly cacheControl: string | null;
  readonly expires: string | null;
  readonly etag: string | null;
  readonly lastModified: string | null;
  readonly age: number | null;
  readonly maxAge: number | null;
  readonly sMaxAge: number | null;
  readonly noCache: boolean;
  readonly noStore: boolean;
  readonly mustRevalidate: boolean;
  readonly public_: boolean;
  readonly private_: boolean;
  readonly isStaticCacheable: boolean;
  readonly recommendation: string;
}

export interface CompressionInfo {
  readonly encoding: string | null;
  readonly contentLength: number | null;
  readonly transferEncoding: string | null;
  readonly isCompressed: boolean;
  readonly compressionType: 'gzip' | 'br' | 'deflate' | 'zstd' | 'none' | 'unknown';
}

export interface ContentNegotiation {
  readonly contentType: string | null;
  readonly charset: string | null;
  readonly contentLanguage: string | null;
  readonly vary: string | null;
  readonly acceptsRanges: boolean;
  readonly mimeType: string;
  readonly isXContentTypeOptionsMissing: boolean;
}

export interface ErrorPageInfo {
  readonly statusCode: number;
  readonly url: string;
  readonly contentType: string | null;
  readonly bodyLength: number;
  readonly leaksServerInfo: boolean;
  readonly leakedInfo: readonly string[];
  readonly isCustomPage: boolean;
  readonly stackTraceDetected: boolean;
}

export interface StatusConsistencyIssue {
  readonly url: string;
  readonly expectedStatus: number;
  readonly actualStatus: number;
  readonly description: string;
  readonly severity: Severity;
}

export interface HttpBehaviourProfile {
  readonly url: string;
  readonly redirectChains: readonly RedirectChain[];
  readonly redirectLoopsDetected: number;
  readonly openRedirectsDetected: number;
  readonly cachingStrategies: readonly CachingStrategy[];
  readonly compressionInfo: readonly CompressionInfo[];
  readonly contentNegotiation: readonly ContentNegotiation[];
  readonly errorPages: readonly ErrorPageInfo[];
  readonly statusConsistencyIssues: readonly StatusConsistencyIssue[];
  readonly chunkedEncodingDetected: boolean;
  readonly keepAliveEnabled: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Infrastructure Fingerprinting
// ═══════════════════════════════════════════════════════════════

export enum InfrastructureType {
  CDN = 'cdn',
  ReverseProxy = 'reverse_proxy',
  WAF = 'waf',
  LoadBalancer = 'load_balancer',
  WebServer = 'web_server',
  ApplicationServer = 'application_server',
  Framework = 'framework',
  CloudProvider = 'cloud_provider',
  Os = 'os',
  ProgrammingLanguage = 'programming_language',
}

export interface FingerprintMatch {
  readonly type: InfrastructureType;
  readonly name: string;
  readonly version?: string;
  readonly confidence: number; // 0.0–1.0
  readonly evidence: readonly string[];
}

export interface InfrastructureProfile {
  readonly url: string;
  readonly fingerprints: readonly FingerprintMatch[];
  readonly cdn: FingerprintMatch | null;
  readonly reverseProxy: FingerprintMatch | null;
  readonly waf: FingerprintMatch | null;
  readonly loadBalancer: FingerprintMatch | null;
  readonly webServer: FingerprintMatch | null;
  readonly applicationServer: FingerprintMatch | null;
  readonly framework: FingerprintMatch | null;
  readonly cloudProvider: FingerprintMatch | null;
}

// ═══════════════════════════════════════════════════════════════
// Cookie Intelligence
// ═══════════════════════════════════════════════════════════════

export enum CookieSecurityFlag {
  Secure = 'secure',
  HttpOnly = 'httpOnly',
  SameSiteStrict = 'sameSiteStrict',
  SameSiteLax = 'sameSiteLax',
  SameSiteNone = 'sameSiteNone',
}

export enum CookiePrefix {
  Host = '__Host-',
  Secure = '__Secure-',
  None = '',
}

export interface CookieAnalysis {
  readonly name: string;
  readonly value: string;
  readonly domain: string;
  readonly path: string;
  readonly secure: boolean;
  readonly httpOnly: boolean;
  readonly sameSite: string;
  readonly maxAge: number | null;
  readonly expires: Timestamp | null;
  readonly prefix: CookiePrefix;
  readonly prefixCompliant: boolean;
  readonly lifetimeSeconds: number | null;
  readonly isSessionCookie: boolean;
  readonly issues: readonly CookieIssue[];
  readonly severity: Severity;
}

export interface CookieIssue {
  readonly type: string;
  readonly description: string;
  readonly severity: Severity;
  readonly recommendation: string;
}

export interface CookieProfile {
  readonly url: string;
  readonly cookies: readonly CookieAnalysis[];
  readonly totalCookies: number;
  readonly secureCount: number;
  readonly httpOnlyCount: number;
  readonly sameSiteStrictCount: number;
  readonly sameSiteLaxCount: number;
  readonly sameSiteNoneCount: number;
  readonly sameSiteMissingCount: number;
  readonly prefixIssues: number;
  readonly issues: readonly CookieIssue[];
  readonly overallScore: number; // 0–100
}

// ═══════════════════════════════════════════════════════════════
// Rate Limiting Intelligence
// ═══════════════════════════════════════════════════════════════

export enum RateLimitStatus {
  Detected = 'detected',
  NotDetected = 'not_detected',
  PartiallyDetected = 'partially_detected',
  Unknown = 'unknown',
}

export interface RateLimitProbeResult {
  readonly requestNumber: number;
  readonly statusCode: number;
  readonly latencyMs: number;
  readonly retryAfter: number | null;
  readonly headers: ReadonlyMap<string, string>;
  readonly isThrottled: boolean;
}

export interface RateLimitProfile {
  readonly url: string;
  readonly status: RateLimitStatus;
  readonly requestsPerWindow: number | null;
  readonly windowSeconds: number | null;
  readonly retryAfterHeaderPresent: boolean;
  readonly retryAfterValues: readonly number[];
  readonly burstCapacity: number | null;
  readonly rateLimitHeaders: readonly string[];
  readonly evidence: readonly string[];
  readonly probeResults: readonly RateLimitProbeResult[];
  readonly isApiRateLimited: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HTTP Intelligence Configuration
// ═══════════════════════════════════════════════════════════════

export interface HttpIntelligenceConfig {
  /** Maximum concurrent HTTP requests. */
  readonly maxConcurrency?: number;
  /** Request timeout in ms. */
  readonly timeoutMs?: number;
  /** Connection pool size. */
  readonly connectionPoolSize?: number;
  /** Keep-alive timeout in ms. */
  readonly keepAliveTimeoutMs?: number;
  /** Maximum redirect hops to follow. */
  readonly maxRedirects?: number;
  /** TLS handshake timeout in ms. */
  readonly tlsTimeoutMs?: number;
  /** Number of rate limit probes (non-aggressive). */
  readonly rateLimitProbes?: number;
  /** Delay between rate limit probes in ms. */
  readonly rateLimitProbeDelayMs?: number;
  /** Maximum number of URLs to analyze in one scan. */
  readonly maxUrls?: number;
  /** Enable HTTP/2 support. */
  readonly enableHttp2?: boolean;
  /** DNS cache TTL in ms. */
  readonly dnsCacheTtlMs?: number;
  /** Custom HTTP client (for testing / DI). */
  readonly httpClient?: IHttpClient;
}

export const DEFAULT_HTTP_CONFIG: Required<HttpIntelligenceConfig> = Object.freeze({
  maxConcurrency: 10,
  timeoutMs: 30000,
  connectionPoolSize: 20,
  keepAliveTimeoutMs: 5000,
  maxRedirects: 10,
  tlsTimeoutMs: 10000,
  rateLimitProbes: 5,
  rateLimitProbeDelayMs: 500,
  maxUrls: 500,
  enableHttp2: true,
  dnsCacheTtlMs: 300000,
  httpClient: undefined as any,
});

// ═══════════════════════════════════════════════════════════════
// HTTP Intelligence Result
// ═══════════════════════════════════════════════════════════════

export interface HttpIntelligenceData {
  readonly targetUrl: string;
  readonly protocolVersion: HttpProtocolVersion;
  readonly tlsProfile: TlsProfile | null;
  readonly headerProfile: HeaderProfile | null;
  readonly behaviourProfile: HttpBehaviourProfile | null;
  readonly infrastructureProfile: InfrastructureProfile | null;
  readonly cookieProfile: CookieProfile | null;
  readonly rateLimitProfile: RateLimitProfile | null;
  readonly totalRequests: number;
  readonly durationMs: number;
  readonly scannedUrls: readonly string[];
}

// ═══════════════════════════════════════════════════════════════
// Performance Metrics
// ═══════════════════════════════════════════════════════════════

export interface HttpPerformanceMetrics {
  readonly totalRequests: number;
  readonly totalDurationMs: number;
  readonly avgLatencyMs: number;
  readonly p50LatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly connectionReused: number;
  readonly connectionNew: number;
  readonly dnsCacheHits: number;
  readonly dnsCacheMisses: number;
  readonly tlsHandshakesPerformed: number;
  readonly tlsHandshakeAvgMs: number;
  readonly poolUtilization: number; // 0.0–1.0
}

// ═══════════════════════════════════════════════════════════════
// Artifact Type Mapping (HTTP Intelligence → ArtifactCategory)
// ═══════════════════════════════════════════════════════════════

export enum HttpArtifactType {
  HttpProfile = 'http_profile',
  TlsProfile = 'tls_profile',
  HeaderProfile = 'header_profile',
  CookieProfile = 'cookie_profile',
  InfrastructureProfile = 'infrastructure_profile',
  RedirectGraph = 'redirect_graph',
  SecurityHeaderAnalysis = 'security_header_analysis',
  RateLimitProfile = 'rate_limit_profile',
}

// ═══════════════════════════════════════════════════════════════
// HTTP Client Interface (injectable for testing)
// ═══════════════════════════════════════════════════════════════

export interface HttpResponse {
  readonly url: string;
  readonly finalUrl: string;
  readonly statusCode: number;
  readonly statusText: string;
  readonly headers: ReadonlyMap<string, string>;
  readonly body: string;
  readonly redirected: boolean;
  readonly protocol: string;
  readonly tlsVersion?: string;
  readonly cipherSuite?: string;
  readonly latencyMs: number;
  readonly localAddress?: string;
  readonly remoteAddress?: string;
}

export interface HttpRequestOptions {
  readonly url: string;
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: string;
  readonly timeoutMs?: number;
  readonly followRedirects?: boolean;
  readonly maxRedirects?: number;
  readonly abortSignal?: AbortSignal;
  /** Collect raw redirect chain. */
  readonly collectRedirects?: boolean;
}

export interface IHttpClient {
  request(options: HttpRequestOptions): Promise<HttpResponse>;
  /** Perform TLS handshake and return TLS info without fetching body. */
  tlsProbe(url: string, timeoutMs?: number): Promise<TlsProbeResult>;
  close(): Promise<void>;
  getMetrics(): HttpPerformanceMetrics;
}

export interface TlsProbeResult {
  readonly tlsVersion: TlsVersion;
  readonly cipherSuite: string;
  readonly alpnProtocols: readonly string[];
  readonly certificateChain: readonly TlsCertificateInfo[];
  readonly ocspStapling: boolean;
  /** Raw peer certificate data for detailed analysis. */
  readonly rawCertData?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// Phase Tracking
// ═══════════════════════════════════════════════════════════════

export enum HttpPhase {
  Initializing = 'initializing',
  TlsAnalysis = 'tls_analysis',
  HeaderAnalysis = 'header_analysis',
  BehaviourAnalysis = 'behaviour_analysis',
  InfrastructureFingerprinting = 'infrastructure_fingerprinting',
  CookieAnalysis = 'cookie_analysis',
  RateLimitProbing = 'rate_limit_probing',
  CollectingArtifacts = 'collecting_artifacts',
  Completed = 'completed',
  Failed = 'failed',
}