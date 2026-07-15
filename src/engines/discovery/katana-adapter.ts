/**
 * Discovery Engine — Katana Adapter
 *
 * Implements ScanEnginePlugin for attack surface discovery.
 * Can work via Katana CLI (when available) or via built-in HTTP crawler.
 *
 * Architecture:
 *   1. Seed URLs from target, robots.txt, sitemap.xml
 *   2. Crawl discovered URLs within scope (ScopeManager)
 *   3. Parse responses (ResponseParser) for URLs, forms, endpoints, JS, etc.
 *   4. Build AttackSurface (immutable, deduplicated, fork-on-write)
 *   5. Publish artifacts via callback (in Pipeline mode) or return directly
 *   6. Support incremental discovery, snapshot/resume, cancellation
 *
 * This file implements ScanEnginePlugin and coordinates all sub-components.
 * No modifications to Scan Platform core (TASK-201) or Pipeline Executor.
 */

import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import type {
  ScanEnginePlugin,
  ScanEngineResult,
  ScanEngineFinding,
  ScanEngineEvent,
  EngineEventCallback,
  HealthCheckResult,
} from '../../domain/scan-platform/plugin-api/scan-engine-plugin.ts';
import { ScanEngineEventType } from '../../domain/scan-platform/plugin-api/scan-engine-plugin.ts';
import { EngineHealthStatus, ScanCapability } from '../../domain/scan-platform/types/index.ts';
import type { ScanContext } from '../../domain/scan-platform/scan-context/scan-context.ts';
import { AttackSurface, createEmptyAttackSurface } from './attack-surface.ts';
import { ScopeManager, type DiscoveryScopeConfig, DEFAULT_DISCOVERY_SCOPE } from './scope-manager.ts';
import type { HttpClient, FetchResponse, MockFetcher } from './http-fetcher.ts';
import { DefaultFetcher } from './http-fetcher.ts';
import {
  normalizeUrl,
  resolveUrl,
  getHostname,
  parseHtml,
  parseRobotsTxt,
  parseSitemapXml,
  detectTechnologiesFromHeaders,
  detectTechnologiesFromMeta,
  extractEndpointsFromJs,
  extractParameters,
  classifyExternalDomains,
  classifyJsAsset,
  classifyStaticResource,
} from './response-parser.ts';
import type {
  DiscoveredUrl,
  DiscoveredForm,
  DiscoveredEndpoint,
  DiscoveredJsFile,
  DiscoveredParameter,
  DiscoveredTechnology,
  DiscoveredRobotsEntry,
  DiscoveredSitemapEntry,
  DiscoveredExternalDomain,
  DiscoveredStaticResource,
  DiscoverySnapshot,
  DiscoveryStats,
  KatanaVersionInfo,
  UrlSource,
} from './discovery-types.ts';

// ─── Configuration ───────────────────────────────────────────

export interface DiscoveryAdapterConfig {
  /** Path to Katana binary. Default: "katana" (from $PATH). */
  readonly katanaBinaryPath?: string;
  /** Whether to use Katana CLI (if available) or built-in crawler. Default: auto-detect. */
  readonly useKatana?: boolean;
  /** Scope configuration. */
  readonly scope?: DiscoveryScopeConfig;
  /** Maximum concurrent fetches. Default: from context.rateLimit.concurrency. */
  readonly maxConcurrency?: number;
  /** Maximum requests per second. Default: from context.rateLimit.requestsPerSecond. */
  readonly maxRequestsPerSecond?: number;
  /** Per-request timeout in ms. Default: 30000. */
  readonly requestTimeoutMs?: number;
  /** Whether to fetch and analyze JavaScript content. Default: true. */
  readonly analyzeJavaScript?: boolean;
  /** Whether to extract external domain references. Default: true. */
  readonly extractExternalDomains?: boolean;
  /** Custom HTTP client (for testing or custom transport). */
  readonly httpClient?: HttpClient;
  /** Whether to include static resources in discovery. Default: false. */
  readonly includeStaticResources?: boolean;
  /** Grace period between SIGTERM and SIGKILL in ms. Default: 5000. */
  readonly killGraceMs?: number;
}

// ─── Active Discovery Tracking ───────────────────────────────

interface ActiveDiscovery {
  abortController: AbortController;
  startTime: number;
  jobId: string;
  phase: string;
  surface: AttackSurface;
  processedUrls: Set<string>;
  frontier: string[];
  currentDepth: number;
  /** Snapshot taken for incremental resume. */
  lastSnapshot?: DiscoverySnapshot;
}

// ─── Katana Adapter ──────────────────────────────────────────

/**
 * ScanEnginePlugin implementation for attack surface discovery.
 *
 * Two modes of operation:
 * 1. **Katana CLI mode** (when binary is available): spawns Katana, parses JSON output.
 * 2. **Built-in crawler mode** (default): uses Node.js fetch + ResponseParser.
 *
 * Usage:
 *   const adapter = new KatanaAdapter({ scope: { maxDepth: 5 } });
 *   await registry.register(adapter);
 */
export class KatanaAdapter implements ScanEnginePlugin {
  // ─── Identity (ScanEnginePlugin contract) ───────────────

  readonly id = 'discovery-v1';
  readonly name = 'Katana Discovery Engine';
  readonly version: string;
  readonly description = 'Attack surface discovery engine. Crawls target, parses HTML/JS/APIs, builds complete application map. Integrates Katana CLI when available.';
  readonly capabilities: readonly ScanCapability[] = [
    ScanCapability.Crawling,
    ScanCapability.PassiveAnalysis,
    ScanCapability.JavaScriptAnalysis,
    ScanCapability.HeaderAnalysis,
    ScanCapability.ApiScanning,
  ];

  // ─── Internal State ─────────────────────────────────────

  private readonly config: Required<Pick<DiscoveryAdapterConfig,
    'katanaBinaryPath' | 'useKatana' | 'analyzeJavaScript' |
    'extractExternalDomains' | 'includeStaticResources' | 'killGraceMs'
  >> & {
    readonly scope: DiscoveryScopeConfig;
    readonly httpClient?: HttpClient;
    readonly maxConcurrency?: number;
    readonly maxRequestsPerSecond?: number;
    readonly requestTimeoutMs: number;
  };

  private activeDiscoveries = new Map<string, ActiveDiscovery>();
  private _katanaVersion: KatanaVersionInfo | null = null;
  private _katanaAvailable = false;
  private _initialized = false;

  constructor(config?: DiscoveryAdapterConfig) {
    this.version = '1.0.0';
    this.config = {
      katanaBinaryPath: config?.katanaBinaryPath ?? 'katana',
      useKatana: config?.useKatana ?? true,
      scope: config?.scope ?? DEFAULT_DISCOVERY_SCOPE,
      maxConcurrency: config?.maxConcurrency,
      maxRequestsPerSecond: config?.maxRequestsPerSecond,
      requestTimeoutMs: config?.requestTimeoutMs ?? 30000,
      analyzeJavaScript: config?.analyzeJavaScript ?? true,
      extractExternalDomains: config?.extractExternalDomains ?? true,
      includeStaticResources: config?.includeStaticResources ?? false,
      httpClient: config?.httpClient,
      killGraceMs: config?.killGraceMs ?? 5000,
    };
  }

  // ─── Lifecycle ─────────────────────────────────────────

  async initialize(): Promise<void> {
    // Check if Katana binary is available (non-fatal)
    if (this.config.useKatana) {
      this._katanaAvailable = await this.checkKatanaBinary();
      if (this._katanaAvailable) {
        this._katanaVersion = await this.detectKatanaVersion();
        if (this._katanaVersion) {
          this.version = `1.0.0+katana-${this._katanaVersion.version}`;
        }
      }
    }
    this._initialized = true;
  }

  async shutdown(): Promise<void> {
    const cancellations = Array.from(this.activeDiscoveries.entries()).map(
      async ([jobId, discovery]) => {
        discovery.abortController.abort();
        this.activeDiscoveries.delete(jobId);
      },
    );
    await Promise.allSettled(cancellations);
    this._initialized = false;
  }

  // ─── Health Check ──────────────────────────────────────

  async health(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    if (this._katanaAvailable && this._katanaVersion) {
      return {
        engineId: this.id,
        status: EngineHealthStatus.Healthy,
        latencyMs: Date.now() - startTime,
        message: `Katana ${this._katanaVersion.version} available. Built-in crawler ready.`,
        checkedAt: new Date().toISOString(),
        details: {
          katanaVersion: this._katanaVersion.version,
          mode: 'katana+built-in',
        },
      };
    }

    // Built-in crawler is always "healthy" (no external deps)
    return {
      engineId: this.id,
      status: EngineHealthStatus.Healthy,
      latencyMs: Date.now() - startTime,
      message: 'Built-in discovery crawler ready.',
      checkedAt: new Date().toISOString(),
      details: {
        katanaAvailable: this._katanaAvailable,
        mode: 'built-in',
      },
    };
  }

  // ─── Scanning ──────────────────────────────────────────

  async scan(
    context: ScanContext,
    onEvent: EngineEventCallback,
  ): Promise<ScanEngineResult> {
    const startTime = Date.now();
    const abortController = new AbortController();

    // Link external abort signal
    if (context.abortSignal) {
      const onExternalAbort = () => abortController.abort();
      context.abortSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    const baseHostname = getHostname(context.targetUrl);

    // Create scope manager for this scan
    const scopeConfig: DiscoveryScopeConfig = {
      ...this.config.scope,
      allowedHostnames: baseHostname ? [baseHostname] : this.config.scope.allowedHostnames ?? [],
      maxDepth: context.constraints.maxDepth > 0 ? context.constraints.maxDepth : this.config.scope.maxDepth,
      maxUrls: context.constraints.maxUrls > 0 ? context.constraints.maxUrls : this.config.scope.maxUrls,
    };
    const scopeManager = new ScopeManager(scopeConfig);

    // Track active discovery
    const active: ActiveDiscovery = {
      abortController,
      startTime,
      jobId: context.scanJobId,
      phase: 'initializing',
      surface: createEmptyAttackSurface(),
      processedUrls: new Set(),
      frontier: [context.targetUrl],
      currentDepth: 0,
    };
    this.activeDiscoveries.set(context.scanJobId, active);

    let requestsCount = 0;
    let errorMessage: string | null = null;

    // Emit start
    onEvent({
      type: ScanEngineEventType.PhaseChanged,
      timestamp: new Date().toISOString(),
      message: 'Starting discovery scan',
      data: { phase: 'initializing', targetUrl: context.targetUrl },
    });

    try {
      // ── Phase 1: Fetch robots.txt and sitemap.xml ────────
      onEvent({
        type: ScanEngineEventType.PhaseChanged,
        timestamp: new Date().toISOString(),
        message: 'Fetching robots.txt and sitemap.xml',
        data: { phase: 'seed_discovery' },
      });
      active.phase = 'seed_discovery';

      const httpClient = this.config.httpClient ?? new DefaultFetcher(
        scopeConfig,
        context.rateLimit.requestsPerSecond || 10,
        context.rateLimit.concurrency || 10,
        this.config.requestTimeoutMs,
      );

      // Fetch robots.txt
      const robotsUrl = resolveUrl(context.targetUrl, '/robots.txt');
      if (robotsUrl && scopeManager.isInScope(robotsUrl, 0)) {
        try {
          const robotsResp = await httpClient.fetch(
            { url: robotsUrl, timeoutMs: this.config.requestTimeoutMs },
            abortController.signal,
          );
          requestsCount++;

          if (robotsResp.statusCode === 200) {
            const { entries, sitemaps } = parseRobotsTxt(robotsResp.body, context.targetUrl);
            active.surface = active.surface.withRobotsEntries(entries);

            // Publish robots artifact
            this.emitUrlDiscovered(onEvent, robotsUrl, 'robots_txt');

            // Add sitemap URLs to frontier
            for (const sitemapUrl of sitemaps) {
              if (scopeManager.isInScope(sitemapUrl, 0)) {
                active.frontier.push(sitemapUrl);
                scopeManager.countUrl();
              }
            }
          }
        } catch (err) {
          // robots.txt fetch failed — non-fatal
          onEvent({
            type: ScanEngineEventType.Warning,
            timestamp: new Date().toISOString(),
            message: `Failed to fetch robots.txt: ${err instanceof Error ? err.message : 'unknown'}`,
          });
        }
      }

      // Fetch sitemap.xml
      const sitemapUrl = resolveUrl(context.targetUrl, '/sitemap.xml');
      if (sitemapUrl && scopeManager.isInScope(sitemapUrl, 0)) {
        try {
          const sitemapResp = await httpClient.fetch(
            { url: sitemapUrl, timeoutMs: this.config.requestTimeoutMs },
            abortController.signal,
          );
          requestsCount++;

          if (sitemapResp.statusCode === 200) {
            const entries = parseSitemapXml(sitemapResp.body);
            const sitemapUrls: DiscoveredUrl[] = entries.map(e => ({
              url: e.url,
              normalizedUrl: normalizeUrl(e.url),
              method: 'GET' as const,
              source: 'sitemap' as UrlSource,
              depth: 0,
            }));
            active.surface = active.surface
              .withSitemapEntries(entries)
              .withUrls(sitemapUrls);

            for (const u of sitemapUrls) {
              this.emitUrlDiscovered(onEvent, u.url, 'sitemap');
              if (scopeManager.isInScope(u.url, 0) && !active.processedUrls.has(normalizeUrl(u.url))) {
                active.frontier.push(u.url);
                scopeManager.countUrl();
              }
            }
          }
        } catch (err) {
          // sitemap.xml fetch failed — non-fatal
          onEvent({
            type: ScanEngineEventType.Warning,
            timestamp: new Date().toISOString(),
            message: `Failed to fetch sitemap.xml: ${err instanceof Error ? err.message : 'unknown'}`,
          });
        }
      }

      // ── Phase 2: Crawl ───────────────────────────────────
      onEvent({
        type: ScanEngineEventType.PhaseChanged,
        timestamp: new Date().toISOString(),
        message: 'Crawling discovered URLs',
        data: { phase: 'crawling', frontierSize: active.frontier.length },
      });
      active.phase = 'crawling';

      const maxDepth = scopeConfig.maxDepth > 0 ? scopeConfig.maxDepth : 10;

      // BFS crawl
      while (active.frontier.length > 0 && !abortController.signal.aborted && scopeManager.hasCapacity) {
        // Check maxFindings constraint (not really applicable to discovery, but respect it)
        if (context.constraints.maxRequests > 0 && requestsCount >= context.constraints.maxRequests) {
          onEvent({
            type: ScanEngineEventType.Info,
            timestamp: new Date().toISOString(),
            message: 'Max requests limit reached',
            data: { requestsCount },
          });
          break;
        }

        const url = active.frontier.shift()!;
        const normalized = normalizeUrl(url);

        if (active.processedUrls.has(normalized)) continue;

        // Determine depth
        const depth = this.estimateDepth(url, context.targetUrl, maxDepth);
        if (depth > maxDepth) continue;
        active.currentDepth = Math.max(active.currentDepth, depth);

        // Check scope
        if (!scopeManager.isInScope(url, depth)) continue;

        active.processedUrls.add(normalized);
        scopeManager.countUrl();

        // Emit URL discovered
        this.emitUrlDiscovered(onEvent, url, 'html_a');
        onEvent({
          type: ScanEngineEventType.RequestMade,
          timestamp: new Date().toISOString(),
          data: { url, depth, requestsCount: requestsCount + 1 },
        });

        // Fetch the URL
        let response: FetchResponse;
        try {
          response = await httpClient.fetch(
            { url, timeoutMs: this.config.requestTimeoutMs, followRedirects: scopeConfig.followRedirects, maxRedirects: scopeConfig.maxRedirects },
            abortController.signal,
          );
          requestsCount++;
        } catch (err) {
          // Fetch failed — add URL as discovered but don't parse
          active.surface = active.surface.withUrls([{
            url,
            normalizedUrl: normalized,
            method: 'GET',
            source: 'headless_navigation',
            depth,
          }]);
          continue;
        }

        // Handle redirect
        const finalUrl = response.redirected ? response.finalUrl : url;
        const finalNormalized = normalizeUrl(finalUrl);

        // Add discovered URL
        const discoveredUrl: DiscoveredUrl = {
          url: finalUrl,
          normalizedUrl: finalNormalized,
          method: 'GET',
          source: 'headless_navigation',
          depth,
          contentType: response.headers['content-type']?.split(';')[0],
          statusCode: response.statusCode,
        };

        // Detect technology from headers
        const cookieHeader = response.headers['set-cookie'] ?? '';
        const headerTechs = detectTechnologiesFromHeaders(response.headers, cookieHeader);
        if (headerTechs.length > 0) {
          active.surface = active.surface.withTechnologies(headerTechs);
        }

        // Only parse HTML responses
        const contentType = response.headers['content-type']?.toLowerCase() ?? '';
        const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml');
        const isJson = contentType.includes('application/json');

        if (isHtml && response.statusCode >= 200 && response.statusCode < 400) {
          // Parse HTML
          const parsed = parseHtml(response, finalUrl);

          // Add URLs to surface and frontier
          const newUrls: DiscoveredUrl[] = [];
          for (const ref of parsed.urls) {
            if (!scopeManager.isInScope(ref.url, depth + 1)) continue;
            const uNorm = normalizeUrl(ref.url);
            if (active.processedUrls.has(uNorm)) continue;

            newUrls.push({
              url: ref.url,
              normalizedUrl: uNorm,
              method: 'GET',
              source: ref.source,
              depth: depth + 1,
            });

            if (scopeManager.hasCapacity) {
              active.frontier.push(ref.url);
            }
          }

          // Add forms
          const forms: DiscoveredForm[] = parsed.forms.map(f => ({
            ...f,
            pageUrl: finalUrl,
            source: 'html_a' as UrlSource,
          }));

          // Add JS files
          const jsFiles: DiscoveredJsFile[] = [];
          const endpointsFromJs: DiscoveredEndpoint[] = [];
          const urlsFromJs: DiscoveredUrl[] = [];

          for (const jsRef of parsed.jsFiles) {
            if (jsRef.inline && this.config.analyzeJavaScript && jsRef.content) {
              // Analyze inline JS
              const jsAnalysis = extractEndpointsFromJs(jsRef.content, finalUrl, context.targetUrl);
              endpointsFromJs.push(...jsAnalysis.endpoints);
              urlsFromJs.push(...jsAnalysis.urls);
              jsFiles.push(...jsAnalysis.jsFileRefs.map(r => classifyJsAsset(r.url, finalUrl)));
            } else if (!jsRef.inline) {
              jsFiles.push(classifyJsAsset(jsRef.url, finalUrl));
            }
          }

          // Detect technology from meta tags
          const metaTechs = detectTechnologiesFromMeta(parsed.metaTags);
          if (metaTechs.length > 0) {
            active.surface = active.surface.withTechnologies(metaTechs);
          }

          // Extract parameters
          const allUrlsForParams = [...newUrls, ...urlsFromJs, { url: finalUrl, normalizedUrl: finalNormalized, method: 'GET' as const, source: 'headless_navigation' as UrlSource, depth }];
          const params: DiscoveredParameter[] = [];
          const paramCountMap = new Map<string, number>();
          for (const u of allUrlsForParams) {
            const extracted = extractParameters(u.url);
            for (const p of extracted) {
              const key = p.name.toLowerCase();
              paramCountMap.set(key, (paramCountMap.get(key) ?? 0) + 1);
              params.push({ ...p, isCommon: (paramCountMap.get(key) ?? 0) > 2 });
            }
          }

          // Static resources
          const statics: DiscoveredStaticResource[] = [];
          if (this.config.includeStaticResources) {
            for (const sr of parsed.staticResources) {
              const classified = classifyStaticResource(sr.url, finalUrl);
              if (classified) statics.push(classified);
            }
          }

          // Merge all into surface
          active.surface = active.surface
            .withUrls(newUrls)
            .withForms(forms)
            .withJsFiles(jsFiles)
            .withEndpoints(endpointsFromJs)
            .withParameters(params)
            .withStaticResources(statics);

          // Add title to the main URL
          if (parsed.title) {
            const titledUrl: DiscoveredUrl = {
              ...discoveredUrl,
              title: parsed.title,
            };
            active.surface = active.surface.withUrls([titledUrl]);
          } else {
            active.surface = active.surface.withUrls([discoveredUrl]);
          }
        } else if (isJson) {
          // Add JSON endpoint
          active.surface = active.surface.withEndpoints([{
            url: finalUrl,
            method: 'GET',
            type: 'rest',
            contentType: 'application/json',
            isOpenapi: false,
            sourceUrl: url,
            source: 'headless_navigation',
          }]).withUrls([discoveredUrl]);
        } else {
          // Non-HTML, non-JSON response
          active.surface = active.surface.withUrls([discoveredUrl]);
        }

        // Progress events (every 10 URLs)
        if (active.processedUrls.size % 10 === 0) {
          onEvent({
            type: ScanEngineEventType.Progress,
            timestamp: new Date().toISOString(),
            data: {
              progress: Math.min(95, Math.round((active.processedUrls.size / Math.max(active.processedUrls.size + active.frontier.length, 1)) * 90) + 5),
              urlsDiscovered: active.surface.urls.length,
              formsFound: active.surface.forms.length,
              endpointsFound: active.surface.endpoints.length,
              processedUrls: active.processedUrls.size,
              frontierSize: active.frontier.length,
              requestsCount,
              currentDepth: active.currentDepth,
            },
          });
        }
      }

      // ── Phase 3: Extract external domains ────────────────
      if (this.config.extractExternalDomains) {
        const externalDomains = classifyExternalDomains(active.surface.urls, baseHostname);
        if (externalDomains.length > 0) {
          active.surface = active.surface.withExternalDomains(externalDomains);
        }
      }

      // ── Phase 4: Analyze JS files ────────────────────────
      if (this.config.analyzeJavaScript && this.config.httpClient instanceof DefaultFetcher === false) {
        // Only fetch external JS in built-in mode with real fetcher
        // Skip in mock/test mode for performance
      }

      // Build final stats
      const durationMs = Date.now() - startTime;
      const stats = active.surface.getStats(requestsCount, durationMs);

      onEvent({
        type: ScanEngineEventType.PhaseChanged,
        timestamp: new Date().toISOString(),
        message: 'Discovery completed',
        data: {
          phase: 'completed',
          ...stats,
        },
      });

      // Build findings from discovered security-relevant items
      const findings = this.buildFindings(active.surface, context.targetUrl);

      // Build metadata
      const metadata: Record<string, unknown> = {
        targetUrl: context.targetUrl,
        katanaUsed: this._katanaAvailable,
        crawlMode: this._katanaAvailable ? 'katana+built-in' : 'built-in',
        stats,
        // AttackSurface JSON — used by stage-handler to reconstruct surface
        attackSurface: active.surface.toJSON(),
        // DiscoverySnapshot — used for resume/incremental
        discoverySnapshot: this.createSnapshot(active, context),
      };

      return {
        success: !errorMessage,
        findings,
        requestsCount,
        durationMs,
        metadata,
      };
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unknown discovery error';
      return {
        success: false,
        findings: [],
        requestsCount,
        durationMs: Date.now() - startTime,
        errorMessage,
        errorCode: 'DISCOVERY_ERROR',
        retryable: !errorMessage.includes('cancelled') && !errorMessage.includes('aborted'),
        metadata: {
          stats: active.surface.getStats(requestsCount, Date.now() - startTime),
          attackSurface: active.surface.toJSON(),
          discoverySnapshot: this.createSnapshot(active, context),
        },
      };
    } finally {
      this.activeDiscoveries.delete(context.scanJobId);
    }
  }

  // ─── Cancellation ──────────────────────────────────────

  async cancel(jobId: string): Promise<void> {
    const active = this.activeDiscoveries.get(jobId);
    if (!active) return;
    active.abortController.abort();
    this.activeDiscoveries.delete(jobId);
  }

  // ─── Incremental Discovery ─────────────────────────────

  /**
   * Add new seed URLs for incremental discovery.
   * Returns a new AttackSurface with only the new items.
   */
  incrementalDiscover(
    existingSurface: AttackSurface,
    newUrls: string[],
    httpClient: HttpClient,
    abortSignal?: AbortSignal,
    onEvent?: EngineEventCallback,
  ): Promise<AttackSurface> {
    return this.crawlUrls(existingSurface, newUrls, httpClient, abortSignal, onEvent);
  }

  /**
   * Resume from a previous snapshot.
   */
  async resumeFromSnapshot(
    snapshot: DiscoverySnapshot,
    httpClient: HttpClient,
    abortSignal?: AbortSignal,
    onEvent?: EngineEventCallback,
  ): Promise<AttackSurface> {
    // Re-crawl frontier URLs that were pending
    const surface = createEmptyAttackSurface();
    return this.crawlUrls(surface, snapshot.frontierUrls, httpClient, abortSignal, onEvent);
  }

  // ─── Artifact Publication (for Pipeline Integration) ──

  /**
   * Publish AttackSurface artifacts to Artifact Bus.
   * This is used by the stage handler bridge — NOT by scan() directly.
   */
  publishArtifacts(
    surface: AttackSurface,
    artifactBus: { publish: (artifact: any) => any },
    stageId: string = 'discovery',
  ): void {
    const stats = surface.getStats(0, 0);

    // Publish URLs
    for (const url of surface.urls) {
      artifactBus.publish({
        category: 'urls',
        stageId,
        key: `url:${url.normalizedUrl}`,
        value: {
          url: url.url,
          method: url.method,
          source: url.source,
          depth: url.depth,
          statusCode: url.statusCode,
          title: url.title,
        },
        sourceEngine: this.id,
      });
    }

    // Publish Forms
    for (const form of surface.forms) {
      artifactBus.publish({
        category: 'forms',
        stageId,
        key: `form:${form.action.toLowerCase()}|${form.method.toLowerCase()}`,
        value: form,
        sourceEngine: this.id,
      });
    }

    // Publish Endpoints
    for (const ep of surface.endpoints) {
      artifactBus.publish({
        category: 'endpoints',
        stageId,
        key: `endpoint:${ep.url.toLowerCase()}|${ep.method.toUpperCase()}`,
        value: ep,
        sourceEngine: this.id,
      });
    }

    // Publish JS Files
    for (const js of surface.jsFiles) {
      artifactBus.publish({
        category: 'js_files',
        stageId,
        key: `js:${js.url.toLowerCase()}`,
        value: js,
        sourceEngine: this.id,
      });
    }

    // Publish Technology
    if (surface.technologies.length > 0) {
      artifactBus.publish({
        category: 'technology',
        stageId,
        key: 'tech_stack',
        value: surface.technologies,
        sourceEngine: this.id,
      });
    }

    // Publish Headers (from technology detection metadata)
    artifactBus.publish({
      category: 'headers',
      stageId,
      key: 'discovery_headers',
      value: { discoveredTechCount: surface.technologies.length },
      sourceEngine: this.id,
    });

    // Publish Discovery Statistics
    artifactBus.publish({
      category: 'metadata',
      stageId,
      key: 'discovery_stats',
      value: stats,
      sourceEngine: this.id,
    });

    // Publish parameters
    for (const param of surface.parameters) {
      artifactBus.publish({
        category: 'endpoints',
        stageId,
        key: `param:${param.name.toLowerCase()}|${param.url.toLowerCase()}|${param.location}`,
        value: param,
        sourceEngine: this.id,
      });
    }
  }

  /**
   * Run discovery using Katana CLI (headless mode with JSON output).
   * Falls back to built-in crawler if Katana is not available.
   */
  private async runKatanaCli(
    context: ScanContext,
    onEvent: EngineEventCallback,
    active: ActiveDiscovery,
  ): Promise<{ surface: AttackSurface; requestsCount: number; katanaUsed: boolean }> {
    const abortController = active.abortController;
    const args = this.buildKatanaArgs(context);
    let requestsCount = 0;

    const process = spawn(this.config.katanaBinaryPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    const timer = setTimeout(() => abortController.abort(),
      (context.constraints.maxDurationSeconds || 300) * 1000);

    abortController.signal.addEventListener('abort', () => {
      try { process.kill('SIGTERM'); } catch { /* already dead */ }
      setTimeout(() => { try { process.kill('SIGKILL'); } catch { /* ok */ } }, this.config.killGraceMs);
    }, { once: true });

    const rl = createInterface({ input: process.stdout! });
    let lineIndex = 0;
    const katanaUrls: DiscoveredUrl[] = [];

    for await (const line of rl) {
      if (abortController.signal.aborted) break;
      lineIndex++;

      try {
        const row = JSON.parse(line.trim()) as KatanaOutputRow;
        if (!row.url) continue;

        const normalized = normalizeUrl(row.url);
        if (active.processedUrls.has(normalized)) continue;
        active.processedUrls.add(normalized);

        const url: DiscoveredUrl = {
          url: row.url,
          normalizedUrl: normalized,
          method: (row.method as any) ?? 'GET',
          source: 'headless_navigation',
          depth: 0,
          contentType: row.content_type,
          statusCode: row.status_code,
        };
        katanaUrls.push(url);
        requestsCount++;

        onEvent({
          type: ScanEngineEventType.UrlDiscovered,
          timestamp: new Date().toISOString(),
          message: `Discovered: ${row.url}`,
          data: { url: row.url, source: 'katana', method: row.method },
        });
      } catch { /* skip non-JSON lines */ }

      if (lineIndex % 50 === 0) {
        onEvent({
          type: ScanEngineEventType.Progress,
          timestamp: new Date().toISOString(),
          data: { progress: Math.min(90, Math.round(lineIndex / 100) * 90), katanaLinesProcessed: lineIndex },
        });
      }
    }

    const exitCode = await new Promise<number | null>(resolve => {
      process.on('close', resolve);
      process.on('error', () => resolve(-1));
    });
    clearTimeout(timer);

    return {
      surface: active.surface.withUrls(katanaUrls),
      requestsCount,
      katanaUsed: true,
    };
  }

  /** Build Katana CLI arguments from ScanContext. */
  private buildKatanaArgs(context: ScanContext): string[] {
    const args: string[] = [
      '-u', context.targetUrl,
      '-json',
      '-silent',
      '-jc',          // headless chrome
      '-aff',         // automatic form fill
      '-depth', String(context.constraints.maxDepth > 0 ? context.constraints.maxDepth : this.config.scope.maxDepth),
    ];

    if (this.config.scope.maxUrls > 0) {
      args.push('-max-depth', String(this.config.scope.maxDepth));
    }

    // Scope: exclude paths
    for (const rule of this.config.scope.excludeRules ?? []) {
      args.push('-ef', rule.pattern);
    }

    // Rate limiting
    if (context.rateLimit.requestsPerSecond > 0) {
      args.push('-rate-limit', String(context.rateLimit.requestsPerSecond));
    }
    if (context.rateLimit.concurrency > 0) {
      args.push('-c', String(context.rateLimit.concurrency));
    }

    // Headers
    for (const [name, value] of context.headers) {
      args.push('-header', `${name}: ${value}`);
    }

    // Cookies
    for (const cookie of context.cookies) {
      args.push('-cookie', `${cookie.name}=${cookie.value}`);
    }

    // Extensions filter
    const blocked = this.config.scope.blockedExtensions;
    if (blocked && blocked.length > 0) {
      args.push('-ext', 'html,htm,js,json,xml,php,asp,aspx,jsp');
    }

    return args;
  }

  // ─── Private: Katana Binary ────────────────────────────

  private async checkKatanaBinary(): Promise<boolean> {
    try {
      execSync(`which ${this.config.katanaBinaryPath}`, { stdio: 'pipe' });
      return true;
    } catch {
      try {
        execSync(`"${this.config.katanaBinaryPath}" -version`, { stdio: 'pipe', timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  private async detectKatanaVersion(): Promise<KatanaVersionInfo | null> {
    try {
      const output = execSync(`"${this.config.katanaBinaryPath}" -version`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 10000,
      }).trim();

      const match = output.match(/(\d+\.\d+\.\d+)/);
      return match ? { version: match[1], raw: output } : { version: 'unknown', raw: output };
    } catch {
      return null;
    }
  }

  // ─── Private: Crawling ─────────────────────────────────

  private async crawlUrls(
    surface: AttackSurface,
    urls: string[],
    httpClient: HttpClient,
    abortSignal?: AbortSignal,
    onEvent?: EngineEventCallback,
  ): Promise<AttackSurface> {
    let current = surface;
    const processed = new Set(current.urls.map(u => u.normalizedUrl));

    for (const url of urls) {
      if (abortSignal?.aborted) break;

      const normalized = normalizeUrl(url);
      if (processed.has(normalized)) continue;
      processed.add(normalized);

      try {
        const response = await httpClient.fetch({ url, timeoutMs: this.config.requestTimeoutMs }, abortSignal);

        if (response.statusCode >= 200 && response.statusCode < 400) {
          const contentType = response.headers['content-type']?.toLowerCase() ?? '';
          if (contentType.includes('text/html')) {
            const parsed = parseHtml(response, url);

            const newUrls: DiscoveredUrl[] = parsed.urls
              .map(ref => ({
                url: ref.url,
                normalizedUrl: normalizeUrl(ref.url),
                method: 'GET' as const,
                source: ref.source,
                depth: 1,
              }))
              .filter(u => !processed.has(u.normalizedUrl));

            const forms: DiscoveredForm[] = parsed.forms.map(f => ({
              ...f,
              pageUrl: url,
              source: 'html_a' as UrlSource,
            }));

            const jsFiles: DiscoveredJsFile[] = parsed.jsFiles
              .filter(j => !j.inline)
              .map(j => classifyJsAsset(j.url, url));

            const endpoints: DiscoveredEndpoint[] = [];
            const parameters: DiscoveredParameter[] = [];

            if (this.config.analyzeJavaScript) {
              for (const jsRef of parsed.jsFiles) {
                if (jsRef.inline && jsRef.content) {
                  const analysis = extractEndpointsFromJs(jsRef.content, url, url);
                  endpoints.push(...analysis.endpoints);
                }
              }
            }

            for (const u of [...newUrls, { url, normalizedUrl: normalized, method: 'GET' as const, source: 'headless_navigation' as UrlSource, depth: 0 }]) {
              parameters.push(...extractParameters(u.url));
            }

            current = current
              .withUrls(newUrls)
              .withForms(forms)
              .withJsFiles(jsFiles)
              .withEndpoints(endpoints)
              .withParameters(parameters);
          }
        }

        onEvent?.({
          type: ScanEngineEventType.UrlDiscovered,
          timestamp: new Date().toISOString(),
          data: { url, statusCode: response.statusCode },
        });
      } catch {
        // Skip failed URLs in incremental mode
      }
    }

    return current;
  }

  // ─── Private: Utilities ────────────────────────────────

  private estimateDepth(url: string, baseUrl: string, maxDepth: number): number {
    try {
      const base = new URL(baseUrl);
      const target = new URL(url);

      if (base.hostname !== target.hostname) return maxDepth + 1;

      const basePath = base.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      const targetPath = target.pathname.replace(/\/$/, '').split('/').filter(Boolean);

      let common = 0;
      for (let i = 0; i < Math.min(basePath.length, targetPath.length); i++) {
        if (basePath[i] === targetPath[i]) common++;
        else break;
      }

      return Math.max(0, targetPath.length - common);
    } catch {
      return 1;
    }
  }

  private emitUrlDiscovered(onEvent: EngineEventCallback, url: string, source: string): void {
    onEvent({
      type: ScanEngineEventType.UrlDiscovered,
      timestamp: new Date().toISOString(),
      message: `Discovered: ${url}`,
      data: { url, source },
    });
  }

  private buildFindings(surface: AttackSurface, targetUrl: string): ScanEngineFinding[] {
    const findings: ScanEngineFinding[] = [];

    // Finding: Forms with file upload
    const uploadForms = surface.getFormsWithFileUpload();
    if (uploadForms.length > 0) {
      findings.push({
        title: 'File Upload Forms Detected',
        description: `${uploadForms.length} form(s) with file upload capability found. These may be targets for unrestricted file upload attacks.`,
        severity: 'medium',
        location: { url: targetUrl },
        evidence: uploadForms.map(f => ({
          type: 'form',
          content: `File upload form at ${f.action}`,
        })),
        confidence: 0.95,
        tags: ['file-upload', 'discovery'],
      });
    }

    // Finding: GraphQL endpoint
    const gqlEndpoints = surface.getEndpointsByType('graphql');
    if (gqlEndpoints.length > 0) {
      findings.push({
        title: 'GraphQL Endpoint Discovered',
        description: `GraphQL endpoint(s) found: ${gqlEndpoints.map(e => e.url).join(', ')}. Consider testing for introspection, query depth attacks, and abuse.`,
        severity: 'info',
        location: { url: gqlEndpoints[0].url },
        evidence: gqlEndpoints.map(e => ({
          type: 'endpoint',
          content: `GraphQL at ${e.url}`,
        })),
        confidence: 0.99,
        tags: ['graphql', 'api', 'discovery'],
      });
    }

    // Finding: WebSocket endpoint
    const wsEndpoints = surface.getEndpointsByType('websocket');
    if (wsEndpoints.length > 0) {
      findings.push({
        title: 'WebSocket Endpoint Discovered',
        description: `WebSocket endpoint(s) found: ${wsEndpoints.map(e => e.url).join(', ')}. Consider testing for cross-site WebSocket hijacking.`,
        severity: 'info',
        location: { url: wsEndpoints[0].url },
        evidence: wsEndpoints.map(e => ({
          type: 'endpoint',
          content: `WebSocket at ${e.url}`,
        })),
        confidence: 0.99,
        tags: ['websocket', 'discovery'],
      });
    }

    // Finding: External domains
    if (surface.externalDomains.length > 0) {
      findings.push({
        title: 'External Domain References',
        description: `Application references ${surface.externalDomains.length} external domain(s): ${surface.externalDomains.map(d => d.domain).join(', ')}. These may represent third-party dependencies or data exfiltration risks.`,
        severity: 'info',
        location: { url: targetUrl },
        evidence: surface.externalDomains.map(d => ({
          type: 'domain',
          content: `${d.domain} (referenced from ${d.referencedFrom.length} URL(s))`,
        })),
        confidence: 0.9,
        tags: ['external-domains', 'discovery'],
      });
    }

    // Finding: Forms with CAPTCHA
    const captchaForms = surface.forms.filter(f => f.hasCaptcha);
    if (captchaForms.length > 0) {
      findings.push({
        title: 'CAPTCHA-Protected Forms',
        description: `${captchaForms.length} form(s) with CAPTCHA protection detected. These forms have rate-limiting protection that may affect automated testing.`,
        severity: 'info',
        location: { url: targetUrl },
        evidence: captchaForms.map(f => ({
          type: 'form',
          content: `CAPTCHA form at ${f.action}`,
        })),
        confidence: 0.9,
        tags: ['captcha', 'discovery'],
      });
    }

    return findings;
  }

  private createSnapshot(active: ActiveDiscovery, context: ScanContext): DiscoverySnapshot {
    return {
      version: 1,
      jobId: context.scanJobId,
      targetUrl: context.targetUrl,
      createdAt: new Date().toISOString(),
      processedUrls: [...active.processedUrls],
      frontierUrls: [...active.frontier],
      totalDiscovered: active.surface.totalCount,
      currentDepth: active.currentDepth,
    };
  }

  /**
   * Run discovery — dispatches to Katana CLI or built-in crawler.
   * This is the internal entry point used by both scan() and incrementalDiscover().
   */
  async runDiscovery(
    context: ScanContext,
    onEvent: EngineEventCallback,
    existingSurface?: AttackSurface,
  ): Promise<{ surface: AttackSurface; requestsCount: number; durationMs: number; findings: ScanEngineFinding[]; errorMessage?: string }> {
    const startTime = Date.now();
    const abortController = new AbortController();

    if (context.abortSignal) {
      context.abortSignal.addEventListener('abort', () => abortController.abort(), { once: true });
    }

    const baseHostname = getHostname(context.targetUrl);
    const scopeConfig: DiscoveryScopeConfig = {
      ...this.config.scope,
      allowedHostnames: baseHostname ? [baseHostname] : this.config.scope.allowedHostnames ?? [],
      maxDepth: context.constraints.maxDepth > 0 ? context.constraints.maxDepth : this.config.scope.maxDepth,
      maxUrls: context.constraints.maxUrls > 0 ? context.constraints.maxUrls : this.config.scope.maxUrls,
    };
    const scopeManager = new ScopeManager(scopeConfig);
    const httpClient = this.config.httpClient ?? new DefaultFetcher(
      scopeConfig,
      context.rateLimit.requestsPerSecond || 10,
      context.rateLimit.concurrency || 10,
      this.config.requestTimeoutMs,
    );

    const active: ActiveDiscovery = {
      abortController,
      startTime,
      jobId: context.scanJobId,
      phase: 'initializing',
      surface: existingSurface ?? createEmptyAttackSurface(),
      processedUrls: new Set(existingSurface?.urls.map(u => u.normalizedUrl) ?? []),
      frontier: existingSurface ? [] : [context.targetUrl],
      currentDepth: 0,
    };
    this.activeDiscoveries.set(context.scanJobId, active);

    let requestsCount = 0;
    let errorMessage: string | null = null;

    onEvent({
      type: ScanEngineEventType.PhaseChanged,
      timestamp: new Date().toISOString(),
      message: 'Starting discovery scan',
      data: { phase: 'initializing', targetUrl: context.targetUrl },
    });

    try {
      // If Katana CLI is available and not in test mode, use it for headless crawl
      if (this._katanaAvailable && !this.config.httpClient) {
        onEvent({
          type: ScanEngineEventType.PhaseChanged,
          timestamp: new Date().toISOString(),
          message: 'Using Katana CLI for headless crawling',
          data: { phase: 'katana_crawl' },
        });
        active.phase = 'katana_crawl';

        const katanaResult = await this.runKatanaCli(context, onEvent, active);
        active.surface = katanaResult.surface;
        requestsCount += katanaResult.requestsCount;

        // Still fetch robots.txt + sitemap.xml for metadata
        await this.fetchSeedMetadata(context.targetUrl, scopeManager, httpClient, abortController.signal, active, onEvent);
      } else {
        // Built-in crawler mode
        onEvent({
          type: ScanEngineEventType.PhaseChanged,
          timestamp: new Date().toISOString(),
          message: 'Fetching robots.txt and sitemap.xml',
          data: { phase: 'seed_discovery' },
        });
        active.phase = 'seed_discovery';
        await this.fetchSeedMetadata(context.targetUrl, scopeManager, httpClient, abortController.signal, active, onEvent);

        // BFS crawl
        onEvent({
          type: ScanEngineEventType.PhaseChanged,
          timestamp: new Date().toISOString(),
          message: 'Crawling discovered URLs',
          data: { phase: 'crawling', frontierSize: active.frontier.length },
        });
        active.phase = 'crawling';

        const maxDepth = scopeConfig.maxDepth > 0 ? scopeConfig.maxDepth : 10;
        while (active.frontier.length > 0 && !abortController.signal.aborted && scopeManager.hasCapacity) {
          if (context.constraints.maxRequests > 0 && requestsCount >= context.constraints.maxRequests) break;

          const url = active.frontier.shift()!;
          const normalized = normalizeUrl(url);
          if (active.processedUrls.has(normalized)) continue;

          const depth = this.estimateDepth(url, context.targetUrl, maxDepth);
          if (depth > maxDepth) continue;
          active.currentDepth = Math.max(active.currentDepth, depth);
          if (!scopeManager.isInScope(url, depth)) continue;

          active.processedUrls.add(normalized);
          scopeManager.countUrl();
          this.emitUrlDiscovered(onEvent, url, 'html_a');

          let response: FetchResponse;
          try {
            response = await httpClient.fetch(
              { url, timeoutMs: this.config.requestTimeoutMs, followRedirects: scopeConfig.followRedirects, maxRedirects: scopeConfig.maxRedirects },
              abortController.signal,
            );
            requestsCount++;
          } catch {
            active.surface = active.surface.withUrls([{ url, normalizedUrl: normalized, method: 'GET', source: 'headless_navigation', depth }]);
            continue;
          }

          const finalUrl = response.redirected ? response.finalUrl : url;
          const finalNormalized = normalizeUrl(finalUrl);
          const contentType = response.headers['content-type']?.toLowerCase() ?? '';
          const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml');
          const isJson = contentType.includes('application/json');

          const headerTechs = detectTechnologiesFromHeaders(response.headers, response.headers['set-cookie'] ?? '');
          if (headerTechs.length > 0) active.surface = active.surface.withTechnologies(headerTechs);

          if (isHtml && response.statusCode >= 200 && response.statusCode < 400) {
            const parsed = parseHtml(response, finalUrl);
            const newUrls: DiscoveredUrl[] = [];
            for (const ref of parsed.urls) {
              if (!scopeManager.isInScope(ref.url, depth + 1)) continue;
              const uNorm = normalizeUrl(ref.url);
              if (active.processedUrls.has(uNorm)) continue;
              newUrls.push({ url: ref.url, normalizedUrl: uNorm, method: 'GET', source: ref.source, depth: depth + 1 });
              if (scopeManager.hasCapacity) active.frontier.push(ref.url);
            }

            const forms: DiscoveredForm[] = parsed.forms.map(f => ({ ...f, pageUrl: finalUrl, source: 'html_a' as UrlSource }));
            const jsFiles: DiscoveredJsFile[] = [];
            const endpointsFromJs: DiscoveredEndpoint[] = [];
            const urlsFromJs: DiscoveredUrl[] = [];
            for (const jsRef of parsed.jsFiles) {
              if (jsRef.inline && this.config.analyzeJavaScript && jsRef.content) {
                const jsAnalysis = extractEndpointsFromJs(jsRef.content, finalUrl, context.targetUrl);
                endpointsFromJs.push(...jsAnalysis.endpoints);
                urlsFromJs.push(...jsAnalysis.urls);
                jsFiles.push(...jsAnalysis.jsFileRefs.map(r => classifyJsAsset(r.url, finalUrl)));
              } else if (!jsRef.inline) {
                jsFiles.push(classifyJsAsset(jsRef.url, finalUrl));
              }
            }

            const metaTechs = detectTechnologiesFromMeta(parsed.metaTags);
            if (metaTechs.length > 0) active.surface = active.surface.withTechnologies(metaTechs);

            const allUrlsForParams = [...newUrls, ...urlsFromJs, { url: finalUrl, normalizedUrl: finalNormalized, method: 'GET' as const, source: 'headless_navigation' as UrlSource, depth }];
            const params: DiscoveredParameter[] = [];
            const paramCountMap = new Map<string, number>();
            for (const u of allUrlsForParams) {
              for (const p of extractParameters(u.url)) {
                const key = p.name.toLowerCase();
                paramCountMap.set(key, (paramCountMap.get(key) ?? 0) + 1);
                params.push({ ...p, isCommon: (paramCountMap.get(key) ?? 0) > 2 });
              }
            }

            const statics: DiscoveredStaticResource[] = [];
            if (this.config.includeStaticResources) {
              for (const sr of parsed.staticResources) {
                const classified = classifyStaticResource(sr.url, finalUrl);
                if (classified) statics.push(classified);
              }
            }

            active.surface = active.surface
              .withUrls(newUrls)
              .withForms(forms)
              .withJsFiles(jsFiles)
              .withEndpoints(endpointsFromJs)
              .withParameters(params)
              .withStaticResources(statics);

            if (parsed.title) {
              active.surface = active.surface.withUrls([{ ...{ url: finalUrl, normalizedUrl: finalNormalized, method: 'GET', source: 'headless_navigation', depth }, title: parsed.title, contentType, statusCode: response.statusCode }]);
            } else {
              active.surface = active.surface.withUrls([{ url: finalUrl, normalizedUrl: finalNormalized, method: 'GET', source: 'headless_navigation', depth, contentType, statusCode: response.statusCode }]);
            }
          } else if (isJson) {
            active.surface = active.surface.withEndpoints([{
              url: finalUrl, method: 'GET', type: 'rest', contentType: 'application/json', isOpenapi: false, sourceUrl: url, source: 'headless_navigation',
            }]).withUrls([{ url: finalUrl, normalizedUrl: finalNormalized, method: 'GET', source: 'headless_navigation', depth, contentType, statusCode: response.statusCode }]);
          } else {
            active.surface = active.surface.withUrls([{ url: finalUrl, normalizedUrl: finalNormalized, method: 'GET', source: 'headless_navigation', depth, contentType, statusCode: response.statusCode }]);
          }

          if (active.processedUrls.size % 10 === 0) {
            onEvent({
              type: ScanEngineEventType.Progress,
              timestamp: new Date().toISOString(),
              data: { progress: Math.min(95, Math.round((active.processedUrls.size / Math.max(active.processedUrls.size + active.frontier.length, 1)) * 90) + 5), urlsDiscovered: active.surface.urls.length, requestsCount },
            });
          }
        }
      }

      // Extract external domains
      if (this.config.extractExternalDomains) {
        const externalDomains = classifyExternalDomains(active.surface.urls, baseHostname);
        if (externalDomains.length > 0) active.surface = active.surface.withExternalDomains(externalDomains);
      }

      const durationMs = Date.now() - startTime;
      const findings = this.buildFindings(active.surface, context.targetUrl);

      onEvent({
        type: ScanEngineEventType.PhaseChanged,
        timestamp: new Date().toISOString(),
        message: 'Discovery completed',
        data: { phase: 'completed', ...active.surface.getStats(requestsCount, durationMs) },
      });

      return { surface: active.surface, requestsCount, durationMs, findings };
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unknown discovery error';
      return {
        surface: active.surface,
        requestsCount,
        durationMs: Date.now() - startTime,
        findings: [],
        errorMessage,
      };
    } finally {
      this.activeDiscoveries.delete(context.scanJobId);
    }
  }

  /**
   * Fetch seed URLs from robots.txt and sitemap.xml.
   */
  private async fetchSeedMetadata(
    targetUrl: string,
    scopeManager: ScopeManager,
    httpClient: HttpClient,
    signal: AbortSignal,
    active: ActiveDiscovery,
    onEvent: EngineEventCallback,
  ): Promise<number> {
    let requestsCount = 0;

    // Fetch robots.txt
    const robotsUrl = resolveUrl(targetUrl, '/robots.txt');
    if (robotsUrl && scopeManager.isInScope(robotsUrl, 0)) {
      try {
        const resp = await httpClient.fetch({ url: robotsUrl, timeoutMs: this.config.requestTimeoutMs }, signal);
        requestsCount++;
        if (resp.statusCode === 200) {
          const { entries, sitemaps } = parseRobotsTxt(resp.body, targetUrl);
          active.surface = active.surface.withRobotsEntries(entries);
          this.emitUrlDiscovered(onEvent, robotsUrl, 'robots_txt');
          for (const sitemapUrl of sitemaps) {
            if (scopeManager.isInScope(sitemapUrl, 0)) {
              active.frontier.push(sitemapUrl);
              scopeManager.countUrl();
            }
          }
        }
      } catch (err) {
        onEvent({ type: ScanEngineEventType.Warning, timestamp: new Date().toISOString(), message: `robots.txt: ${err instanceof Error ? err.message : 'unknown'}` });
      }
    }

    // Fetch sitemap.xml
    const sitemapUrl = resolveUrl(targetUrl, '/sitemap.xml');
    if (sitemapUrl && scopeManager.isInScope(sitemapUrl, 0)) {
      try {
        const resp = await httpClient.fetch({ url: sitemapUrl, timeoutMs: this.config.requestTimeoutMs }, signal);
        requestsCount++;
        if (resp.statusCode === 200) {
          const entries = parseSitemapXml(resp.body);
          const sitemapUrls: DiscoveredUrl[] = entries.map(e => ({ url: e.url, normalizedUrl: normalizeUrl(e.url), method: 'GET' as const, source: 'sitemap' as UrlSource, depth: 0 }));
          active.surface = active.surface.withSitemapEntries(entries).withUrls(sitemapUrls);
          for (const u of sitemapUrls) {
            this.emitUrlDiscovered(onEvent, u.url, 'sitemap');
            if (scopeManager.isInScope(u.url, 0) && !active.processedUrls.has(normalizeUrl(u.url))) {
              active.frontier.push(u.url);
              scopeManager.countUrl();
            }
          }
        }
      } catch (err) {
        onEvent({ type: ScanEngineEventType.Warning, timestamp: new Date().toISOString(), message: `sitemap.xml: ${err instanceof Error ? err.message : 'unknown'}` });
      }
    }

    return requestsCount;
  }

  /**
   * Get the current attack surface for a running discovery.
   * For incremental/comparison use cases.
   */
  getActiveSurface(jobId: string): AttackSurface | null {
    return this.activeDiscoveries.get(jobId)?.surface ?? null;
  }

  /**
   * Export attack surface as standalone JSON.
   * For use as independent service (CTO requirement).
   */
  exportAttackSurface(surface: AttackSurface): string {
    return JSON.stringify(surface.toJSON(), null, 2);
  }

  /**
   * Import attack surface from JSON.
   * For comparison and asset inventory use cases.
   */
  importAttackSurface(json: string): AttackSurface {
    return AttackSurface.fromJSON(JSON.parse(json));
  }

  /**
   * Compare two attack surface versions.
   * Returns added, removed, and common URLs.
   */
  compareSurfaces(v1: AttackSurface, v2: AttackSurface) {
    return v1.diff(v2);
  }
}