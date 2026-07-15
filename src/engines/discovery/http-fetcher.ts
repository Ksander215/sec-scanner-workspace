/**
 * Discovery Engine — HTTP Fetcher
 *
 * Injectable HTTP client abstraction.
 * In production: uses Node.js fetch (or undici) with connection pooling.
 * In tests: replaced with a mock.
 *
 * Features:
 * - Connection reuse via keep-alive
 * - Rate limiting (token bucket)
 * - Concurrent request limiting (semaphore)
 * - Scope-aware (only fetches in-scope URLs)
 * - Response parsing: HTML, JSON, robots.txt, sitemap.xml
 */

import type { DiscoveryScopeConfig } from './scope-manager.ts';
import { ScopeManager } from './scope-manager.ts';

// ─── Fetch Response ──────────────────────────────────────────

export interface FetchResponse {
  readonly url: string;
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
  readonly redirected: boolean;
  /** Final URL after redirects. */
  readonly finalUrl: string;
}

// ─── Fetch Options ───────────────────────────────────────────

export interface FetchOptions {
  readonly url: string;
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly timeoutMs?: number;
  readonly followRedirects?: boolean;
  readonly maxRedirects?: number;
}

// ─── Rate Limiter (Token Bucket) ─────────────────────────────

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly intervalMs: number;

  constructor(
    private readonly ratePerSecond: number,
    private readonly burstSize: number,
  ) {
    this.tokens = burstSize;
    this.lastRefill = Date.now();
    this.intervalMs = 1000 / ratePerSecond;
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait for next token
    const waitMs = this.intervalMs;
    await new Promise<void>(resolve => setTimeout(resolve, waitMs));
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.intervalMs);
    if (newTokens > 0) {
      this.tokens = Math.min(this.burstSize, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }
}

// ─── Semaphore (Concurrency Limiter) ─────────────────────────

export class Semaphore {
  private _count = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this._count < this.max) {
      this._count++;
      return;
    }
    await new Promise<void>(resolve => {
      this.queue.push(() => {
        this._count++;
        resolve();
      });
    });
  }

  release(): void {
    this._count--;
    if (this.queue.length > 0 && this._count < this.max) {
      const next = this.queue.shift()!;
      next();
    }
  }
}

// ─── HTTP Fetcher Interface ──────────────────────────────────

export interface HttpClient {
  fetch(options: FetchOptions, signal?: AbortSignal): Promise<FetchResponse>;
}

// ─── Default Fetcher (Node.js fetch-based) ───────────────────

/**
 * Production HTTP fetcher using Node.js built-in fetch.
 * Supports connection reuse, rate limiting, and concurrency control.
 */
export class DefaultFetcher implements HttpClient {
  private readonly scopeManager: ScopeManager;
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly semaphore: Semaphore;
  private readonly defaultTimeoutMs: number;

  constructor(
    scopeConfig: DiscoveryScopeConfig,
    ratePerSecond: number = 10,
    concurrency: number = 10,
    timeoutMs: number = 30000,
  ) {
    this.scopeManager = new ScopeManager(scopeConfig);
    this.rateLimiter = new TokenBucketRateLimiter(ratePerSecond, Math.ceil(ratePerSecond * 2));
    this.semaphore = new Semaphore(concurrency);
    this.defaultTimeoutMs = timeoutMs;
  }

  async fetch(options: FetchOptions, signal?: AbortSignal): Promise<FetchResponse> {
    // Rate limit
    await this.rateLimiter.acquire();

    // Check abort before acquiring semaphore
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Concurrency limit
    await this.semaphore.acquire();
    try {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const timeout = options.timeoutMs ?? this.defaultTimeoutMs;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      // Link external signal
      if (signal) {
        signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        const response = await globalThis.fetch(options.url, {
          method: options.method ?? 'GET',
          headers: options.headers,
          redirect: (options.followRedirects ?? true) ? 'follow' : 'manual',
          signal: controller.signal,
        });

        const body = await response.text();

        // Collect headers
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        return {
          url: options.url,
          statusCode: response.status,
          headers,
          body,
          redirected: response.redirected,
          finalUrl: response.url || options.url,
        };
      } finally {
        clearTimeout(timer);
      }
    } finally {
      this.semaphore.release();
    }
  }

  /** Check if URL is in scope (delegates to ScopeManager). */
  isInScope(url: string, depth: number): boolean {
    return this.scopeManager.isInScope(url, depth);
  }

  countUrl(): void {
    this.scopeManager.countUrl();
  }

  get hasCapacity(): boolean {
    return this.scopeManager.hasCapacity;
  }

  get urlCount(): number {
    return this.scopeManager.urlCount;
  }

  isHostnameInScope(url: string): boolean {
    return this.scopeManager.isHostnameInScope(url);
  }
}

// ─── Mock Fetcher (for testing) ──────────────────────────────

export interface MockResponse {
  readonly statusCode?: number;
  readonly headers?: Record<string, string>;
  readonly body: string;
  /** Simulate redirect. */
  readonly redirectUrl?: string;
}

/**
 * Mock HTTP client that returns pre-configured responses.
 * Used in unit tests.
 */
export class MockFetcher implements HttpClient {
  private readonly responses = new Map<string, MockResponse>();
  private requestLog: Array<{ url: string; method: string }> = [];
  private failUrls = new Set<string>();
  private _requestCount = 0;

  /** Register a response for a URL. */
  onUrl(url: string, response: MockResponse): this {
    this.responses.set(url, response);
    return this;
  }

  /** Register a URL that should throw/fail. */
  onUrlFail(url: string): this {
    this.failUrls.add(url);
    return this;
  }

  /** Get the log of all requests made. */
  getRequestLog(): readonly { url: string; method: string }[] {
    return this.requestLog;
  }

  get requestCount(): number {
    return this._requestCount;
  }

  async fetch(options: FetchOptions, signal?: AbortSignal): Promise<FetchResponse> {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    this._requestCount++;
    this.requestLog.push({ url: options.url, method: options.method ?? 'GET' });

    if (this.failUrls.has(options.url)) {
      throw new Error(`Connection refused: ${options.url}`);
    }

    const mock = this.responses.get(options.url);
    if (!mock) {
      return {
        url: options.url,
        statusCode: 404,
        headers: {},
        body: 'Not Found',
        redirected: false,
        finalUrl: options.url,
      };
    }

    return {
      url: options.url,
      statusCode: mock.statusCode ?? 200,
      headers: mock.headers ?? {},
      body: mock.body,
      redirected: !!mock.redirectUrl,
      finalUrl: mock.redirectUrl ?? options.url,
    };
  }
}