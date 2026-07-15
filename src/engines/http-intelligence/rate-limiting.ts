/**
 * HTTP Intelligence Engine — Rate Limiting Intelligence
 *
 * Detects rate limiting non-aggressively:
 * - Sends a small number of sequential requests
 * - Observes response patterns (429, Retry-After)
 * - Detects rate limit headers (X-RateLimit-*, etc.)
 * - Analyzes burst handling
 * - Tests API-specific patterns
 *
 * IMPORTANT: This module is designed to be non-aggressive.
 * It sends at most 5 requests with delays, never stress-tests.
 */

import type { IHttpClient, HttpResponse } from './http-types.ts';
import {
  RateLimitProbeResult,
  RateLimitProfile,
  RateLimitStatus,
} from './http-types.ts';
import { DEFAULT_HTTP_CONFIG } from './http-types.ts';

// ═══════════════════════════════════════════════════════════════
// Known Rate Limit Headers
// ═══════════════════════════════════════════════════════════════

const RATE_LIMIT_HEADER_PATTERNS = [
  /^x-ratelimit-limit$/i,
  /^x-ratelimit-remaining$/i,
  /^x-ratelimit-reset$/i,
  /^x-ratelimit-retry-after$/i,
  /^x-rate-limit-limit$/i,
  /^x-rate-limit-remaining$/i,
  /^x-rate-limit-reset$/i,
  /^retry-after$/i,
  /^x-ratelimit-window$/i,
  /^x-ratelimit-used$/i,
];

function getHeader(headers: ReadonlyMap<string, string>, name: string): string | null {
  for (const [key, value] of headers) {
    if (key.toLowerCase() === name.toLowerCase()) return value;
  }
  return null;
}

function detectRateLimitHeaders(headers: ReadonlyMap<string, string>): string[] {
  const found: string[] = [];
  for (const [key] of headers) {
    if (RATE_LIMIT_HEADER_PATTERNS.some(p => p.test(key))) {
      found.push(key);
    }
  }
  return found;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  // Retry-After can be a number of seconds or an HTTP-date
  const num = parseInt(value, 10);
  if (!isNaN(num) && num > 0) return num;
  // Try parsing as date
  const date = Date.parse(value);
  if (!isNaN(date)) {
    const seconds = Math.max(0, Math.floor((date - Date.now()) / 1000));
    return seconds > 0 ? seconds : null;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// Rate Limiting Intelligence — Main Class
// ═══════════════════════════════════════════════════════════════

export class RateLimitingIntelligence {
  private readonly httpClient: IHttpClient;
  private readonly probeCount: number;
  private readonly probeDelayMs: number;

  constructor(
    httpClient: IHttpClient,
    config?: {
      probeCount?: number;
      probeDelayMs?: number;
    },
  ) {
    this.httpClient = httpClient;
    this.probeCount = config?.probeCount ?? DEFAULT_HTTP_CONFIG.rateLimitProbes;
    this.probeDelayMs = config?.probeDelayMs ?? DEFAULT_HTTP_CONFIG.rateLimitProbeDelayMs;
  }

  /**
   * Probe a URL for rate limiting.
   * Sends a small number of sequential requests and observes patterns.
   * Non-aggressive: uses configured delays between probes.
   */
  async probe(url: string, abortSignal?: AbortSignal): Promise<RateLimitProfile> {
    const probeResults: RateLimitProbeResult[] = [];
    const rateLimitHeaders: string[] = [];
    const retryAfterValues: number[] = [];
    let retryAfterPresent = false;
    let firstThrottledIndex = -1;

    // Initial request to check rate limit headers
    try {
      const initialResponse = await this.httpClient.request({
        url,
        method: 'GET',
        timeoutMs: 10000,
        abortSignal,
      });

      const headers = detectRateLimitHeaders(initialResponse.headers);
      rateLimitHeaders.push(...headers);

      probeResults.push({
        requestNumber: 1,
        statusCode: initialResponse.statusCode,
        latencyMs: initialResponse.latencyMs,
        retryAfter: parseRetryAfter(getHeader(initialResponse.headers, 'retry-after')),
        headers: initialResponse.headers,
        isThrottled: initialResponse.statusCode === 429,
      });

      const firstRetryAfter = parseRetryAfter(getHeader(initialResponse.headers, 'retry-after'));
      if (firstRetryAfter !== null) {
        retryAfterPresent = true;
        retryAfterValues.push(firstRetryAfter);
      }
    } catch (err) {
      // If first request fails, return unknown
      return this.buildProfile(url, RateLimitStatus.Unknown, probeResults, rateLimitHeaders, retryAfterPresent, retryAfterValues);
    }

    // Sequential probes with delays
    for (let i = 1; i < this.probeCount; i++) {
      if (abortSignal?.aborted) break;

      // Wait between probes
      await new Promise<void>(resolve => setTimeout(resolve, this.probeDelayMs));

      try {
        const response = await this.httpClient.request({
          url,
          method: 'GET',
          timeoutMs: 10000,
          abortSignal,
        });

        const newHeaders = detectRateLimitHeaders(response.headers);
        for (const h of newHeaders) {
          if (!rateLimitHeaders.includes(h)) rateLimitHeaders.push(h);
        }

        const retryAfter = parseRetryAfter(getHeader(response.headers, 'retry-after'));
        const isThrottled = response.statusCode === 429;

        if (isThrottled && firstThrottledIndex === -1) {
          firstThrottledIndex = i + 1;
        }

        if (retryAfter !== null) {
          retryAfterPresent = true;
          retryAfterValues.push(retryAfter);
        }

        probeResults.push({
          requestNumber: i + 1,
          statusCode: response.statusCode,
          latencyMs: response.latencyMs,
          retryAfter,
          headers: response.headers,
          isThrottled,
        });

        // If we got a 429, stop probing (don't be aggressive)
        if (isThrottled) break;

      } catch (err) {
        if (abortSignal?.aborted) break;
        // Connection error — stop probing
        probeResults.push({
          requestNumber: i + 1,
          statusCode: 0,
          latencyMs: 0,
          retryAfter: null,
          headers: new Map(),
          isThrottled: false,
        });
        break;
      }
    }

    // Determine status
    let status: RateLimitStatus;
    const throttledCount = probeResults.filter(r => r.isThrottled).length;

    if (rateLimitHeaders.length > 0 && throttledCount === 0) {
      status = RateLimitStatus.Detected; // Headers present but not triggered
    } else if (throttledCount > 0) {
      status = RateLimitStatus.Detected;
    } else if (rateLimitHeaders.length === 0 && throttledCount === 0) {
      // Check for other indicators
      const latencyIncreases = detectLatencyIncrease(probeResults);
      if (latencyIncreases) {
        status = RateLimitStatus.PartiallyDetected;
      } else {
        status = RateLimitStatus.NotDetected;
      }
    } else {
      status = RateLimitStatus.Unknown;
    }

    return this.buildProfile(url, status, probeResults, rateLimitHeaders, retryAfterPresent, retryAfterValues);
  }

  /**
   * Analyze rate limiting from headers only (without making requests).
   */
  analyzeFromResponse(response: HttpResponse): RateLimitProfile {
    const rateLimitHeaders = detectRateLimitHeaders(response.headers);
    const retryAfter = parseRetryAfter(getHeader(response.headers, 'retry-after'));

    const probeResult: RateLimitProbeResult = {
      requestNumber: 1,
      statusCode: response.statusCode,
      latencyMs: response.latencyMs,
      retryAfter,
      headers: response.headers,
      isThrottled: response.statusCode === 429,
    };

    const status = rateLimitHeaders.length > 0 || response.statusCode === 429
      ? RateLimitStatus.Detected
      : RateLimitStatus.NotDetected;

    return this.buildProfile(
      response.url,
      status,
      [probeResult],
      rateLimitHeaders,
      retryAfter !== null,
      retryAfter !== null ? [retryAfter] : [],
    );
  }

  /**
   * Analyze from a mock-friendly structure.
   */
  analyzeFromData(data: {
    url: string;
    probeResults: Array<{
      statusCode: number;
      latencyMs: number;
      retryAfter?: number | null;
      isThrottled?: boolean;
      headers?: Record<string, string>;
    }>;
  }): RateLimitProfile {
    const results: RateLimitProbeResult[] = data.probeResults.map((p, i) => ({
      requestNumber: i + 1,
      statusCode: p.statusCode,
      latencyMs: p.latencyMs,
      retryAfter: p.retryAfter ?? null,
      headers: new Map(Object.entries(p.headers ?? {})),
      isThrottled: p.isThrottled ?? false,
    }));

    const allHeaders = new Set<string>();
    for (const r of results) {
      for (const h of detectRateLimitHeaders(r.headers)) allHeaders.add(h);
    }

    const throttledCount = results.filter(r => r.isThrottled).length;
    const retryAfterValues = results.map(r => r.retryAfter).filter((v): v is number => v !== null);

    const status = allHeaders.size > 0 || throttledCount > 0
      ? RateLimitStatus.Detected
      : RateLimitStatus.NotDetected;

    return this.buildProfile(
      data.url,
      status,
      results,
      [...allHeaders],
      retryAfterValues.length > 0,
      retryAfterValues,
    );
  }

  // ─── Private Helpers ─────────────────────────────────────

  private buildProfile(
    url: string,
    status: RateLimitStatus,
    probeResults: RateLimitProbeResult[],
    rateLimitHeaders: string[],
    retryAfterPresent: boolean,
    retryAfterValues: number[],
  ): RateLimitProfile {
    // Calculate burst capacity (requests before throttling)
    let burstCapacity: number | null = null;
    const throttledResults = probeResults.filter(r => r.isThrottled);
    if (throttledResults.length > 0) {
      const firstThrottled = throttledResults[0];
      burstCapacity = firstThrottled.requestNumber - 1;
    } else if (status === RateLimitStatus.Detected && probeResults.length > 0) {
      // Rate limit detected via headers but not triggered
      burstCapacity = probeResults.length; // At least this many
    }

    // Determine if API rate limited
    const isApiRateLimited = status === RateLimitStatus.Detected;

    // Gather evidence
    const evidence: string[] = [];
    if (rateLimitHeaders.length > 0) {
      evidence.push(`Rate limit headers found: ${rateLimitHeaders.join(', ')}`);
    }
    if (throttledResults.length > 0) {
      evidence.push(`Received ${throttledResults.length} 429 response(s)`);
    }
    if (burstCapacity !== null) {
      evidence.push(`Burst capacity estimated at ${burstCapacity} request(s)`);
    }

    return Object.freeze({
      url,
      status,
      requestsPerWindow: burstCapacity,
      windowSeconds: null, // Cannot determine window without multiple cycles
      retryAfterPresent,
      retryAfterValues: Object.freeze(retryAfterValues),
      burstCapacity,
      rateLimitHeaders: Object.freeze(rateLimitHeaders),
      evidence: Object.freeze(evidence),
      probeResults: Object.freeze(probeResults),
      isApiRateLimited,
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// Latency Increase Detection
// ═══════════════════════════════════════════════════════════════

function detectLatencyIncrease(probes: RateLimitProbeResult[]): boolean {
  if (probes.length < 3) return false;

  // Check if latency increases significantly in later requests
  const latencies = probes.map(p => p.latencyMs);
  const firstHalf = latencies.slice(0, Math.ceil(latencies.length / 2));
  const secondHalf = latencies.slice(Math.ceil(latencies.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  if (avgFirst === 0) return false;
  return (avgSecond - avgFirst) / avgFirst > 0.5; // >50% increase
}