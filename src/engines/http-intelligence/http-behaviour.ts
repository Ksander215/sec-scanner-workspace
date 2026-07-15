/**
 * HTTP Intelligence Engine — HTTP Behaviour Intelligence
 *
 * Analyzes HTTP behavioral patterns:
 * - Redirect chains (loops, open redirects, cross-origin)
 * - Caching strategies
 * - Compression
 * - Chunked encoding
 * - Content negotiation
 * - MIME types
 * - Error pages (info leakage)
 * - Status code consistency
 */

import type { HttpResponse } from './http-types.ts';
import {
  RedirectType,
  RedirectHop,
  RedirectChain,
  CachingStrategy,
  CompressionInfo,
  ContentNegotiation,
  ErrorPageInfo,
  StatusConsistencyIssue,
  HttpBehaviourProfile,
} from './http-types.ts';
import { Severity } from '../../domain/scan-platform/types/index.ts';

// ═══════════════════════════════════════════════════════════════
// Redirect Analysis
// ═══════════════════════════════════════════════════════════════

function getHeader(headers: ReadonlyMap<string, string>, name: string): string | null {
  for (const [key, value] of headers) {
    if (key.toLowerCase() === name.toLowerCase()) return value;
  }
  return null;
}

function classifyRedirect(statusCode: number): RedirectType | null {
  switch (statusCode) {
    case 301: return RedirectType.Permanent;
    case 302: return RedirectType.Temporary;
    case 303: return RedirectType.SeeOther;
    case 304: return RedirectType.NotModified;
    case 307: return RedirectType.TemporaryRedirect;
    case 308: return RedirectType.PermanentRedirect;
    default: return null;
  }
}

function detectOpenRedirect(url: string, targetUrl: string, visitedUrls: Set<string>): boolean {
  // Check if redirect goes to an external domain
  try {
    const source = new URL(url);
    const target = new URL(targetUrl);
    if (source.hostname !== target.hostname) {
      // Check if the target domain is a known external redirector
      const suspiciousPatterns = [
        /url=/i, /redirect=/i, /next=/i, /return=/i,
        /continue=/i, /destination=/i, /redir=/i,
      ];
      if (suspiciousPatterns.some(p => p.test(targetUrl))) {
        return true;
      }
    }
  } catch { /* ignore parse errors */ }

  // Check for URL parameter injection
  if (/https?:\/\//.test(targetUrl) && visitedUrls.has(url)) {
    try {
      const source = new URL(url);
      const target = new URL(targetUrl);
      return source.hostname !== target.hostname;
    } catch { /* ignore */ }
  }

  return false;
}

function detectRedirectLoop(chain: string[]): boolean {
  if (chain.length < 3) return false;
  const seen = new Set<string>();
  for (const url of chain) {
    if (seen.has(url)) return true;
    seen.add(url);
  }
  return false;
}

function buildRedirectChain(
  response: HttpResponse,
  visitedUrls: Set<string>,
): RedirectChain | null {
  if (!response.redirected) return null;

  const hops: RedirectHop[] = [
    {
      url: response.url,
      statusCode: response.statusCode,
      redirectType: classifyRedirect(response.statusCode) ?? RedirectType.Temporary,
      headers: response.headers,
      latencyMs: response.latencyMs,
    },
  ];

  const chainUrls = [response.url, response.finalUrl];
  const hasLoop = detectRedirectLoop(chainUrls);
  const hasOpenRedirect = detectOpenRedirect(response.url, response.finalUrl, visitedUrls);

  let crossesOrigin = false;
  try {
    const source = new URL(response.url);
    const target = new URL(response.finalUrl);
    crossesOrigin = source.origin !== target.origin;
  } catch { /* ignore */ }

  return {
    id: `rc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sourceUrl: response.url,
    finalUrl: response.finalUrl,
    hops: Object.freeze(hops),
    totalHops: hops.length,
    totalLatencyMs: response.latencyMs,
    hasLoop,
    hasOpenRedirect,
    crossesOrigin,
  };
}

// ═══════════════════════════════════════════════════════════════
// Caching Analysis
// ═══════════════════════════════════════════════════════════════

function analyzeCaching(response: HttpResponse): CachingStrategy {
  const cacheControl = getHeader(response.headers, 'cache-control');
  const expires = getHeader(response.headers, 'expires');
  const etag = getHeader(response.headers, 'etag');
  const lastModified = getHeader(response.headers, 'last-modified');
  const age = getHeader(response.headers, 'age');

  let maxAge: number | null = null;
  let sMaxAge: number | null = null;
  let noCache = false;
  let noStore = false;
  let mustRevalidate = false;
  let public_ = false;
  let private_ = false;

  if (cacheControl) {
    for (const directive of cacheControl.split(',')) {
      const trimmed = directive.trim().toLowerCase();
      if (trimmed.startsWith('max-age=')) {
        maxAge = parseInt(trimmed.split('=')[1], 10) || null;
      } else if (trimmed.startsWith('s-maxage=')) {
        sMaxAge = parseInt(trimmed.split('=')[1], 10) || null;
      } else if (trimmed === 'no-cache') {
        noCache = true;
      } else if (trimmed === 'no-store') {
        noStore = true;
      } else if (trimmed === 'must-revalidate') {
        mustRevalidate = true;
      } else if (trimmed === 'public') {
        public_ = true;
      } else if (trimmed === 'private') {
        private_ = true;
      }
    }
  }

  const contentType = getHeader(response.headers, 'content-type') ?? '';
  const isStaticResource = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(response.url)
    || contentType.startsWith('image/')
    || contentType.startsWith('font/')
    || contentType.startsWith('text/css');

  const recommendations: string[] = [];
  if (isStaticResource && !cacheControl) {
    recommendations.push('Static resource without Cache-Control — set max-age for caching');
  }
  if (isStaticResource && noStore) {
    recommendations.push('Static resource has no-store — consider enabling caching with appropriate max-age');
  }
  if (!isStaticResource && (public_ || (maxAge !== null && maxAge > 3600))) {
    recommendations.push('Dynamic content cached publicly or for extended period — review caching policy');
  }
  if (noCache && mustRevalidate && !noStore) {
    recommendations.push('no-cache + must-revalidate is valid but redundant — must-revalidate alone may suffice');
  }

  return {
    cacheControl,
    expires,
    etag,
    lastModified,
    age: age ? parseInt(age, 10) : null,
    maxAge,
    sMaxAge,
    noCache,
    noStore,
    mustRevalidate,
    public_,
    private_,
    isStaticCacheable: isStaticResource && !noStore && !noCache && (maxAge ?? 0) > 0,
    recommendation: recommendations.join('. ') || 'Caching configuration is appropriate.',
  };
}

// ═══════════════════════════════════════════════════════════════
// Compression Analysis
// ═══════════════════════════════════════════════════════════════

function analyzeCompression(response: HttpResponse): CompressionInfo {
  const contentEncoding = getHeader(response.headers, 'content-encoding');
  const transferEncoding = getHeader(response.headers, 'transfer-encoding');
  const contentLength = getHeader(response.headers, 'content-length');

  let compressionType: CompressionInfo['compressionType'] = 'none';
  if (contentEncoding?.includes('br')) compressionType = 'br';
  else if (contentEncoding?.includes('gzip')) compressionType = 'gzip';
  else if (contentEncoding?.includes('deflate')) compressionType = 'deflate';
  else if (contentEncoding?.includes('zstd')) compressionType = 'zstd';
  else if (contentEncoding) compressionType = 'unknown';

  const isCompressed = compressionType !== 'none';
  const length = contentLength ? parseInt(contentLength, 10) : null;

  return {
    encoding: contentEncoding,
    contentLength: length,
    transferEncoding,
    isCompressed,
    compressionType,
  };
}

// ═══════════════════════════════════════════════════════════════
// Content Negotiation Analysis
// ═══════════════════════════════════════════════════════════════

function analyzeContentNegotiation(response: HttpResponse): ContentNegotiation {
  const contentType = getHeader(response.headers, 'content-type') ?? '';
  const vary = getHeader(response.headers, 'vary');
  const acceptsRanges = getHeader(response.headers, 'accept-ranges') === 'bytes';

  // Extract charset
  const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
  const charset = charsetMatch ? charsetMatch[1] : null;

  // Extract language
  const contentLanguage = getHeader(response.headers, 'content-language');

  // Extract MIME type (before semicolon)
  const mimeType = contentType.split(';')[0].trim() || 'application/octet-stream';

  // Check X-Content-Type-Options
  const xcto = getHeader(response.headers, 'x-content-type-options');
  const isXContentTypeOptionsMissing = !xcto;

  return {
    contentType,
    charset,
    contentLanguage,
    vary,
    acceptsRanges,
    mimeType,
    isXContentTypeOptionsMissing,
  };
}

// ═══════════════════════════════════════════════════════════════
// Error Page Analysis
// ═══════════════════════════════════════════════════════════════

const SERVER_INFO_PATTERNS = [
  /Apache\/[\d.]+/i,
  /nginx\/[\d.]+/i,
  /IIS\/[\d.]+/i,
  /Express/i,
  /Django [\d.]+/i,
  /Flask/i,
  /ASP\.NET/i,
  /PHP\/[\d.]+/i,
  /Tomcat\/[\d.]+/i,
  /WebLogic/i,
  /JBoss/i,
  /Spring/i,
  /Rails/i,
  /Laravel/i,
  /Node\.js/i,
  /powered by\s+\w+/i,
  /stack trace/i,
  /at [\w.]+\([\w.]+\.java:\d+\)/,
  /at [\w.]+ \(node:[\d.]+\)/,
  /exception in thread/i,
  /fatal error/i,
  /traceback \(most recent call last\)/i,
  /syntaxerror/i,
  /TypeError:/,
  /ReferenceError:/,
];

function analyzeErrorPage(response: HttpResponse): ErrorPageInfo | null {
  // Only analyze error status codes
  if (response.statusCode >= 200 && response.statusCode < 400) return null;

  const contentType = getHeader(response.headers, 'content-type') ?? '';
  const body = response.body;

  // Detect information leakage
  const leakedInfo: string[] = [];
  for (const pattern of SERVER_INFO_PATTERNS) {
    const match = body.match(pattern);
    if (match) {
      const info = match[0].trim();
      if (!leakedInfo.includes(info)) {
        leakedInfo.push(info);
      }
    }
  }

  // Check for stack traces
  const stackTraceDetected = /(?:at\s+\w+|traceback|exception|error)\s.*(?:line|:\d+|\.java|\.js|\.py)/i.test(body);

  // Detect if it's a custom error page (not default server page)
  const isDefaultErrorPage = body.includes('Apache Tomcat') ||
    body.includes('nginx/') ||
    body.includes('<title>IIS') ||
    body.includes('Apache/2') ||
    body.includes('<h1>Not Found</h1>') && body.length < 500;

  const isCustomPage = !isDefaultErrorPage && body.length > 100;

  return {
    statusCode: response.statusCode,
    url: response.url,
    contentType,
    bodyLength: body.length,
    leaksServerInfo: leakedInfo.length > 0,
    leakedInfo: Object.freeze(leakedInfo),
    isCustomPage,
    stackTraceDetected,
  };
}

// ═══════════════════════════════════════════════════════════════
// HTTP Behaviour Intelligence — Main Class
// ═══════════════════════════════════════════════════════════════

export class HttpBehaviourIntelligence {
  private readonly visitedUrls = new Set<string>();
  private readonly redirectChains: RedirectChain[] = [];
  private redirectLoopsDetected = 0;
  private openRedirectsDetected = 0;
  private readonly cachingStrategies: CachingStrategy[] = [];
  private readonly compressionInfos: CompressionInfo[] = [];
  private readonly contentNegotiations: ContentNegotiation[] = [];
  private readonly errorPages: ErrorPageInfo[] = [];
  private readonly statusConsistencyIssues: StatusConsistencyIssue[] = [];
  private chunkedEncodingDetected = false;
  private keepAliveEnabled = false;

  /**
   * Analyze a single HTTP response and accumulate behaviour data.
   */
  analyze(response: HttpResponse): void {
    this.visitedUrls.add(response.url);

    // Redirect analysis
    if (response.redirected) {
      const chain = buildRedirectChain(response, this.visitedUrls);
      if (chain) {
        this.redirectChains.push(chain);
        if (chain.hasLoop) this.redirectLoopsDetected++;
        if (chain.hasOpenRedirect) this.openRedirectsDetected++;
      }
    }

    // Caching analysis
    this.cachingStrategies.push(analyzeCaching(response));

    // Compression analysis
    const compression = analyzeCompression(response);
    this.compressionInfos.push(compression);

    // Chunked encoding
    if (getHeader(response.headers, 'transfer-encoding')?.toLowerCase().includes('chunked')) {
      this.chunkedEncodingDetected = true;
    }

    // Keep-alive
    if (getHeader(response.headers, 'connection')?.toLowerCase() === 'keep-alive') {
      this.keepAliveEnabled = true;
    }
    // HTTP/1.1 default is keep-alive
    if (response.protocol === 'HTTP/1.1' && !getHeader(response.headers, 'connection')) {
      this.keepAliveEnabled = true;
    }

    // Content negotiation
    this.contentNegotiations.push(analyzeContentNegotiation(response));

    // Error page analysis
    const errorPage = analyzeErrorPage(response);
    if (errorPage) {
      this.errorPages.push(errorPage);
    }
  }

  /**
   * Check status code consistency across responses for the same URL pattern.
   */
  checkStatusConsistency(responses: readonly HttpResponse[]): void {
    const urlStatuses = new Map<string, number[]>();

    for (const resp of responses) {
      // Normalize URL (strip query for grouping)
      let normalizedUrl: string;
      try {
        const u = new URL(resp.finalUrl);
        u.search = '';
        normalizedUrl = u.toString();
      } catch {
        normalizedUrl = resp.finalUrl;
      }

      const statuses = urlStatuses.get(normalizedUrl) ?? [];
      statuses.push(resp.statusCode);
      urlStatuses.set(normalizedUrl, statuses);
    }

    // Find inconsistent status codes
    for (const [url, statuses] of urlStatuses) {
      if (statuses.length < 2) continue;
      const uniqueStatuses = new Set(statuses);
      if (uniqueStatuses.size > 1) {
        const sorted = [...uniqueStatuses].sort((a, b) => a - b);
        const expected = sorted[0]; // Most common would be better, but first is OK
        for (const status of sorted) {
          if (status !== expected) {
            this.statusConsistencyIssues.push({
              url,
              expectedStatus: expected,
              actualStatus: status,
              description: `URL "${url}" returned both ${expected} and ${status} — inconsistent behavior detected`,
              severity: Severity.Low,
            });
          }
        }
      }
    }
  }

  /**
   * Build the complete behaviour profile.
   */
  buildProfile(url: string): HttpBehaviourProfile {
    return Object.freeze({
      url,
      redirectChains: Object.freeze(this.redirectChains),
      redirectLoopsDetected: this.redirectLoopsDetected,
      openRedirectsDetected: this.openRedirectsDetected,
      cachingStrategies: Object.freeze(this.cachingStrategies),
      compressionInfo: Object.freeze(this.compressionInfos),
      contentNegotiation: Object.freeze(this.contentNegotiations),
      errorPages: Object.freeze(this.errorPages),
      statusConsistencyIssues: Object.freeze(this.statusConsistencyIssues),
      chunkedEncodingDetected: this.chunkedEncodingDetected,
      keepAliveEnabled: this.keepAliveEnabled,
    });
  }

  /**
   * Reset all accumulated data.
   */
  reset(): void {
    this.visitedUrls.clear();
    this.redirectChains.length = 0;
    this.redirectLoopsDetected = 0;
    this.openRedirectsDetected = 0;
    this.cachingStrategies.length = 0;
    this.compressionInfos.length = 0;
    this.contentNegotiations.length = 0;
    this.errorPages.length = 0;
    this.statusConsistencyIssues.length = 0;
    this.chunkedEncodingDetected = false;
    this.keepAliveEnabled = false;
  }

  get visitedCount(): number { return this.visitedUrls.size; }
}