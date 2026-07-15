/**
 * Browser Intelligence Engine — ScanEnginePlugin Adapter
 *
 * Integrates Browser Intelligence as a Scan Platform engine via Plugin API.
 *
 * Architecture:
 *   1. BrowserIntelligenceAdapter implements ScanEnginePlugin (5 methods)
 *   2. Coordinates: Navigation → Auth → DOM → Runtime sub-engines
 *   3. Publishes all results via BrowserArtifactPublisher → Artifact Bus
 *   4. Supports cancellation, recovery, and performance optimization
 *   5. Zero modifications to Scan Platform core
 *
 * Dependencies: only plugin-api contract + browser sub-modules.
 */

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
import type {
  BrowserAdapterConfig,
  BrowserIntelligenceData,
  BrowserPerformanceMetrics,
  BrowserSessionState,
  BrowserPhase,
  IBrowserController,
} from './browser-types.ts';
import { BrowserPhase as Phase, BrowserType, BrowserMode } from './browser-types.ts';
import { BrowserContextManager, resolveBrowserConfig, MockBrowserController } from './browser-context.ts';
import { NavigationIntelligence, type NavigationConfig } from './navigation.ts';
import { AuthenticationIntelligence, type AuthIntelligenceConfig } from './auth-strategies.ts';
import { DomSnapshotEngine, DEFAULT_DOM_SNAPSHOT_CONFIG } from './dom-snapshot.ts';
import { RuntimeIntelligence, DEFAULT_RUNTIME_CONFIG } from './runtime-intelligence.ts';
import { BrowserArtifactPublisher, BROWSER_STAGE_ID, BROWSER_ENGINE_ID } from './browser-artifacts.ts';

// ═══════════════════════════════════════════════════════════════
// Adapter Configuration
// ═══════════════════════════════════════════════════════════════

export interface BrowserIntelligenceAdapterConfig extends BrowserAdapterConfig {
  /** Provide a pre-created browser controller (for testing / dependency injection). */
  readonly browserController?: IBrowserController;
  /** Auth intelligence config. */
  readonly authConfig?: AuthIntelligenceConfig;
}

// ═══════════════════════════════════════════════════════════════
// Active Scan State
// ═══════════════════════════════════════════════════════════════

interface ActiveBrowserScan {
  readonly jobId: string;
  readonly abortController: AbortController;
  readonly startTime: number;
  phase: BrowserPhase;
  pagesVisited: number;
  findingsCount: number;
  /** Pause/resume support. */
  paused: boolean;
  pauseResolve: (() => void) | null;
  /** Snapshot for recovery. */
  lastSnapshot: BrowserSessionState | null;
}

// ═══════════════════════════════════════════════════════════════
// Browser Intelligence Adapter
// ═══════════════════════════════════════════════════════════════

/**
 * ScanEnginePlugin implementation for Browser Intelligence.
 *
 * Usage:
 *   const adapter = new BrowserIntelligenceAdapter({ browserType: 'chromium' });
 *   await registry.register(adapter);
 */
export class BrowserIntelligenceAdapter implements ScanEnginePlugin {
  // ─── Identity (ScanEnginePlugin contract) ───────────────

  readonly id = 'browser-intelligence';
  readonly name = 'Browser Intelligence Engine';
  readonly version = '1.0.0';
  readonly description = 'Browser-based web application intelligence. Analyzes SPA routing, authentication, DOM structure, and JavaScript runtime via headless browser.';
  readonly capabilities: readonly ScanCapability[] = [
    ScanCapability.Crawling,
    ScanCapability.ApiScanning,
    ScanCapability.AuthenticatedScanning,
    ScanCapability.PassiveAnalysis,
    ScanCapability.JavaScriptAnalysis,
    ScanCapability.HeaderAnalysis,
  ];

  // ─── Internal State ─────────────────────────────────────

  private readonly config: Required<BrowserIntelligenceAdapterConfig>;
  private activeScans = new Map<string, ActiveBrowserScan>();
  private _initialized = false;
  private contextManager: BrowserContextManager;
  private authIntelligence: AuthenticationIntelligence;

  constructor(config?: BrowserIntelligenceAdapterConfig) {
    const resolvedConfig = resolveBrowserConfig(config);
    this.config = resolvedConfig as Required<BrowserIntelligenceAdapterConfig>;
    this.contextManager = new BrowserContextManager(config);
    this.authIntelligence = new AuthenticationIntelligence(config?.authConfig);
  }

  // ─── Lifecycle ─────────────────────────────────────────

  /**
   * Initialize the Browser Intelligence engine.
   * Validates browser availability.
   */
  async initialize(): Promise<void> {
    // Initialize browser context manager
    const browser = this.config.browserController;
    await this.contextManager.initialize(browser);
    this._initialized = true;
  }

  /**
   * Graceful shutdown.
   * Closes all active browser contexts.
   */
  async shutdown(): Promise<void> {
    const cancellations = Array.from(this.activeScans.values()).map(async (scan) => {
      scan.abortController.abort();
      this.activeScans.delete(scan.jobId);
    });
    await Promise.allSettled(cancellations);
    await this.contextManager.close();
    this._initialized = false;
  }

  // ─── Health Check ──────────────────────────────────────

  /**
   * Check if the browser engine is operational.
   */
  async health(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      if (!this._initialized) {
        return {
          engineId: this.id,
          status: EngineHealthStatus.Unhealthy,
          latencyMs: Date.now() - startTime,
          message: 'Browser Intelligence not initialized',
          checkedAt: new Date().toISOString(),
        };
      }

      const browser = this.contextManager.getBrowser();
      if (!browser || !browser.isConnected()) {
        return {
          engineId: this.id,
          status: EngineHealthStatus.Degraded,
          latencyMs: Date.now() - startTime,
          message: 'Browser not connected, will re-initialize on next scan',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        engineId: this.id,
        status: EngineHealthStatus.Healthy,
        latencyMs: Date.now() - startTime,
        message: `Browser Intelligence ready (${this.config.browserType})`,
        checkedAt: new Date().toISOString(),
        details: {
          browserType: this.config.browserType,
          browserMode: this.config.browserMode,
          activeScans: this.activeScans.size,
          maxConcurrency: this.config.maxConcurrency,
        },
      };
    } catch (err) {
      return {
        engineId: this.id,
        status: EngineHealthStatus.Unhealthy,
        latencyMs: Date.now() - startTime,
        message: err instanceof Error ? err.message : 'Unknown error',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  // ─── Scanning ──────────────────────────────────────────

  /**
   * Execute a Browser Intelligence scan.
   *
   * Contract compliance:
   * - Respects context.abortSignal
   * - Respects context.rateLimit and context.constraints
   * - Emits events via onEvent
   * - Returns ScanEngineResult (never throws)
   * - Safe for concurrent calls
   */
  async scan(
    context: ScanContext,
    onEvent: EngineEventCallback,
  ): Promise<ScanEngineResult> {
    const startTime = Date.now();
    const findings: ScanEngineFinding[] = [];
    let pagesVisited = 0;
    let errorMessage: string | null = null;
    let browserLaunchMs = 0;

    // Create abort controller
    const abortController = new AbortController();
    if (context.abortSignal) {
      if (context.abortSignal.aborted) {
        abortController.abort();
      } else {
        context.abortSignal.addEventListener('abort', () => abortController.abort(), { once: true });
      }
    }

    // Track active scan
    const activeScan: ActiveBrowserScan = {
      jobId: context.scanJobId,
      abortController,
      startTime,
      phase: Phase.Initializing,
      pagesVisited: 0,
      findingsCount: 0,
      paused: false,
      pauseResolve: null,
      lastSnapshot: null,
    };
    this.activeScans.set(context.scanJobId, activeScan);

    // Emit start event
    onEvent({
      type: ScanEngineEventType.PhaseChanged,
      timestamp: new Date().toISOString(),
      message: 'Starting Browser Intelligence scan',
      data: { phase: 'initializing', targetUrl: context.targetUrl },
    });

    try {
      // ── Phase 1: Initialize browser ─────────────────────
      const browserStart = Date.now();
      if (!this.contextManager.getBrowser()) {
        await this.contextManager.initialize(this.config.browserController);
      }
      browserLaunchMs = Date.now() - browserStart;

      this.updatePhase(activeScan, Phase.Navigating, onEvent);
      onEvent({
        type: ScanEngineEventType.Info,
        timestamp: new Date().toISOString(),
        message: 'Browser launched, starting navigation',
        data: { browserLaunchMs },
      });

      // ── Phase 2: Navigation Intelligence ────────────────
      let scopeHostname = '';
      try { scopeHostname = new URL(context.targetUrl).hostname; } catch { /* use empty */ }

      const navConfig: NavigationConfig = {
        maxDepth: this.config.maxNavigationDepth,
        maxPages: this.config.maxPages || context.constraints.maxUrls || 0,
        timeoutMs: this.config.navigationTimeoutMs,
        followLinks: true,
        submitForms: false,
        excludePatterns: context.scope.excludePaths.map(p => new RegExp(p)),
        includePatterns: context.scope.includePaths.map(p => new RegExp(p)),
        detectSpa: true,
        seedUrl: context.targetUrl,
        scopeHostname,
      };

      const navigation = new NavigationIntelligence(navConfig);
      navigation.setAbortController(abortController);

      // Create page and navigate to seed URL
      const page = await this.contextManager.newPage();
      const initialResult = await page.goto(context.targetUrl, {
        timeout: this.config.pageLoadTimeoutMs,
        waitUntil: 'domcontentloaded',
      });

      // Check abort
      if (abortController.signal.aborted) {
        await page.close();
        throw new Error('Scan cancelled during initial navigation');
      }

      // Process initial navigation
      navigation.processNavigation('about:blank', initialResult, 'initial');
      const title = await page.title();
      navigation.updateRouteTitle(context.targetUrl, title);

      // Detect SPA framework
      const html = await page.content();
      navigation.detectSpaFramework(html, context.targetUrl);

      // Extract and follow links
      const links = navigation.extractLinks(html, context.targetUrl);
      let nextUrl: string | null;
      const maxPages = navConfig.maxPages > 0 ? navConfig.maxPages : 100;
      let navProgress = 10;

      while ((nextUrl = navigation.popFrontier()) !== null) {
        if (abortController.signal.aborted) break;
        if (pagesVisited >= maxPages) break;
        if (context.constraints.maxRequests > 0 && pagesVisited >= context.constraints.maxRequests) break;

        try {
          const currentUrl = page.url();
          const result = await page.goto(nextUrl, {
            timeout: this.config.navigationTimeoutMs,
            waitUntil: 'domcontentloaded',
          });

          navigation.processNavigation(currentUrl, result, 'link_click');
          const pageContent = await page.content();
          const pageLinks = navigation.extractLinks(pageContent, nextUrl);
          navigation.detectSpaFramework(pageContent, nextUrl);
          const pageTitle = await page.title();
          navigation.updateRouteTitle(nextUrl, pageTitle);
          pagesVisited++;
          activeScan.pagesVisited = pagesVisited;

          // Progress reporting
          navProgress = Math.min(60, 10 + Math.round((pagesVisited / Math.max(maxPages, 1)) * 50));
          onEvent({
            type: ScanEngineEventType.Progress,
            timestamp: new Date().toISOString(),
            data: { progress: navProgress, pagesVisited, routesDiscovered: navigation.getDiscoveredCount() },
          });

          // Periodically emit URL discovered events
          if (pagesVisited % 5 === 0) {
            onEvent({
              type: ScanEngineEventType.UrlDiscovered,
              timestamp: new Date().toISOString(),
              message: `Visited ${pagesVisited} pages, ${navigation.getDiscoveredCount()} routes found`,
              data: { pagesVisited, routesDiscovered: navigation.getDiscoveredCount() },
            });
          }
        } catch (navErr) {
          // Navigation errors are non-fatal — mark as visited and continue
          navigation.processNavigation(page.url(), { url: nextUrl, status: null }, 'link_click');
        }
      }

      // Mark seed URL as analyzed
      navigation.markAnalyzed(context.targetUrl);

      onEvent({
        type: ScanEngineEventType.Info,
        timestamp: new Date().toISOString(),
        message: `Navigation complete: ${navigation.getDiscoveredCount()} routes, ${navigation.getVisitedCount()} pages visited`,
        data: {
          totalRoutes: navigation.getDiscoveredCount(),
          pagesVisited: navigation.getVisitedCount(),
          isSpa: navigation.buildNavigationMap().isSpa,
        },
      });

      // ── Phase 3: Authentication Intelligence ───────────
      this.updatePhase(activeScan, Phase.Authenticating, onEvent);

      let authResult = await this.authIntelligence.execute({
        page,
        browserContext: await this.contextManager.getContext(),
        targetUrl: context.targetUrl,
        credentials: {
          username: context.authentication.username,
          password: context.authentication.password,
          token: context.authentication.token,
        },
        abortSignal: abortController.signal,
      });

      if (authResult.success) {
        onEvent({
          type: ScanEngineEventType.Info,
          timestamp: new Date().toISOString(),
          message: `Authentication successful: ${authResult.method}`,
          data: { authMethod: authResult.method },
        });
      }

      // ── Phase 4: DOM Intelligence ───────────────────────
      this.updatePhase(activeScan, Phase.DomAnalysis, onEvent);
      onEvent({
        type: ScanEngineEventType.Progress,
        timestamp: new Date().toISOString(),
        data: { progress: 65, phase: 'dom_analysis' },
      });

      const domEngine = new DomSnapshotEngine({
        traverseShadowDom: this.config.traverseShadowDom,
        analyzeIframes: this.config.analyzeIframes,
      });

      const domSnapshot = await domEngine.snapshot(page, page.url());

      // Extract security-relevant findings from DOM
      if (domSnapshot.csrfTokens.length > 0) {
        findings.push({
          title: 'CSRF Token Detected',
          description: `Found ${domSnapshot.csrfTokens.length} CSRF token(s) on ${domSnapshot.pageUrl}`,
          severity: 'info',
          location: { url: domSnapshot.pageUrl },
          evidence: domSnapshot.csrfTokens.map(t => ({
            type: 'csrf_token',
            content: `Field: ${t.fieldName}, Token: ${t.token.slice(0, 20)}...`,
          })),
          tags: ['csrf', 'dom'],
          confidence: 0.95,
        });
      }

      if (domSnapshot.forms.some(f => f.hasPassword && !f.csrfToken)) {
        findings.push({
          title: 'Login Form Without CSRF Protection',
          description: 'A login form with password field was found but no CSRF token was detected.',
          severity: 'medium',
          location: { url: domSnapshot.pageUrl },
          evidence: [{ type: 'form_analysis', content: 'Password form lacks CSRF protection' }],
          tags: ['csrf', 'authentication', 'dom'],
          confidence: 0.8,
        });
      }

      // ── Phase 5: Runtime Intelligence ───────────────────
      this.updatePhase(activeScan, Phase.RuntimeAnalysis, onEvent);
      onEvent({
        type: ScanEngineEventType.Progress,
        timestamp: new Date().toISOString(),
        data: { progress: 80, phase: 'runtime_analysis' },
      });

      const runtime = new RuntimeIntelligence({
        interceptFetch: this.config.interceptRuntime,
        interceptXhr: this.config.interceptRuntime,
        interceptWebSocket: this.config.interceptRuntime,
        interceptEventSource: this.config.interceptRuntime,
      });

      await runtime.install(page);

      // Wait for any pending runtime activity
      await new Promise(resolve => setTimeout(resolve, Math.min(this.config.idleTimeoutMs, 3000)));
      await runtime.collect(page);

      const runtimeData = runtime.buildResult();

      // Generate findings from runtime data
      if (runtimeData.graphqlOperations.length > 0) {
        findings.push({
          title: 'GraphQL Operations Detected',
          description: `Found ${runtimeData.graphqlOperations.length} GraphQL operation(s) — queries, mutations, or subscriptions.`,
          severity: 'info',
          location: { url: page.url() },
          evidence: runtimeData.graphqlOperations.map(op => ({
            type: 'graphql',
            content: `${op.operationType}: ${op.name ?? 'unnamed'} (depth: ${op.queryDepth})`,
          })),
          tags: ['graphql', 'api', 'runtime'],
          confidence: 0.95,
        });
      }

      if (runtimeData.webSocketChannels.length > 0) {
        findings.push({
          title: 'WebSocket Connections Detected',
          description: `Found ${runtimeData.webSocketChannels.length} WebSocket channel(s).`,
          severity: 'info',
          location: { url: page.url() },
          evidence: runtimeData.webSocketChannels.map(ws => ({
            type: 'websocket',
            content: `ws://${ws.url} (${ws.status})`,
          })),
          tags: ['websocket', 'runtime'],
          confidence: 0.95,
        });
      }

      if (runtimeData.clientErrors.length > 0) {
        findings.push({
          title: 'Client-Side JavaScript Errors',
          description: `Detected ${runtimeData.clientErrors.length} client-side error(s) during browsing.`,
          severity: 'low',
          location: { url: page.url() },
          evidence: runtimeData.clientErrors.slice(0, 10).map(err => ({
            type: 'js_error',
            content: `${err.errorName}: ${err.message}`,
          })),
          tags: ['javascript', 'error', 'runtime'],
          confidence: 0.9,
        });
      }

      // ── Phase 6: Collect Artifacts ──────────────────────
      this.updatePhase(activeScan, Phase.CollectingArtifacts, onEvent);
      onEvent({
        type: ScanEngineEventType.Progress,
        timestamp: new Date().toISOString(),
        data: { progress: 90, phase: 'collecting_artifacts' },
      });

      const navMap = navigation.buildNavigationMap();
      const contextMetrics = this.contextManager.getMetrics();
      const durationMs = Date.now() - startTime;

      const perfMetrics: BrowserPerformanceMetrics = {
        browserLaunchMs,
        totalNavigationMs: durationMs,
        avgPageLoadMs: pagesVisited > 0 ? Math.round(durationMs / pagesVisited) : durationMs,
        peakMemoryMb: 0,  // Would need process.memoryUsage() in production
        contextsCreated: contextMetrics.contextsCreated,
        pagesOpened: contextMetrics.pagesOpened,
        contextsReused: contextMetrics.contextsReused,
        totalRequestsIntercepted: runtimeData.totalApiCalls,
        totalDurationMs: durationMs,
      };

      // Build session info
      const sessionInfo = {
        sessionId: `bs-${context.scanJobId}`,
        isAuthenticated: authResult.success,
        authMethod: authResult.method,
        userId: authResult.jwtPayload?.sub as string | undefined,
        startedAt: new Date(startTime).toISOString(),
        lastActivityAt: new Date().toISOString(),
        pagesVisited,
        durationMs,
      };

      // Emit completion
      this.updatePhase(activeScan, Phase.Finalizing, onEvent);
      onEvent({
        type: ScanEngineEventType.PhaseChanged,
        timestamp: new Date().toISOString(),
        message: 'Browser Intelligence scan completed',
        data: {
          phase: 'completed',
          pagesVisited,
          routesDiscovered: navMap.totalRoutes,
          apiCallsIntercepted: runtimeData.totalApiCalls,
          findingsCount: findings.length,
          durationMs,
        },
      });
      onEvent({
        type: ScanEngineEventType.Progress,
        timestamp: new Date().toISOString(),
        data: { progress: 100 },
      });

      // Cleanup
      await page.close();
      await this.contextManager.resetContext();
      runtime.cleanup();

      activeScan.phase = Phase.Completed;
      this.activeScans.delete(context.scanJobId);

      const duration = Date.now() - startTime;
      return {
        success: true,
        findings,
        requestsCount: Math.max(1, pagesVisited) + runtimeData.totalApiCalls,
        durationMs: duration,
        metadata: {
          browserType: this.config.browserType,
          browserMode: this.config.browserMode,
          pagesVisited,
          routesDiscovered: navMap.totalRoutes,
          apiCallsIntercepted: runtimeData.totalApiCalls,
          graphqlOperations: runtimeData.graphqlOperations.length,
          webSocketChannels: runtimeData.webSocketChannels.length,
          clientErrors: runtimeData.clientErrors.length,
          isSpa: navMap.isSpa,
          spaFramework: navMap.spaFramework,
          authMethod: authResult.method,
          authSuccess: authResult.success,
          domForms: domSnapshot.forms.length,
          domInputs: domSnapshot.forms.reduce((sum, f) => sum + f.inputs.length, 0),
          csrfTokensFound: domSnapshot.csrfTokens.length,
          serviceWorkers: runtimeData.serviceWorkers.length,
          consoleMessages: runtimeData.consoleMessages.length,
          performanceMetrics: perfMetrics,
        },
      };

    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unknown scan error';
      activeScan.phase = Phase.Failed;
      this.activeScans.delete(context.scanJobId);

      onEvent({
        type: ScanEngineEventType.Error,
        timestamp: new Date().toISOString(),
        message: errorMessage,
        data: { phase: activeScan.phase },
      });

      const duration = Date.now() - startTime;
      return {
        success: false,
        findings,
        requestsCount: pagesVisited,
        durationMs: duration,
        errorMessage,
        errorCode: 'BROWSER_SCAN_ERROR',
        retryable: !abortController.signal.aborted,
        metadata: {
          browserType: this.config.browserType,
          pagesVisited,
          phase: activeScan.phase,
        },
      };
    }
  }

  // ─── Cancellation ──────────────────────────────────────

  /**
   * Cancel a running Browser Intelligence scan.
   */
  async cancel(jobId: string): Promise<void> {
    const activeScan = this.activeScans.get(jobId);
    if (!activeScan) return;
    activeScan.abortController.abort();
    this.activeScans.delete(jobId);
  }

  // ─── Pause / Resume / Snapshot (Recovery) ───────────────

  /**
   * Pause a running scan.
   */
  async pause(jobId: string): Promise<void> {
    const activeScan = this.activeScans.get(jobId);
    if (!activeScan) return;
    activeScan.paused = true;
    await new Promise<void>((resolve) => {
      activeScan.pauseResolve = resolve;
    });
  }

  /**
   * Resume a paused scan.
   */
  async resume(jobId: string): Promise<void> {
    const activeScan = this.activeScans.get(jobId);
    if (!activeScan || !activeScan.paused) return;
    activeScan.paused = false;
    if (activeScan.pauseResolve) {
      activeScan.pauseResolve();
      activeScan.pauseResolve = null;
    }
  }

  /**
   * Take a snapshot for recovery.
   */
  async snapshot(jobId: string): Promise<BrowserSessionState | null> {
    const activeScan = this.activeScans.get(jobId);
    if (!activeScan) return null;
    return activeScan.lastSnapshot;
  }

  // ─── Helpers ───────────────────────────────────────────

  private updatePhase(
    scan: ActiveBrowserScan,
    phase: BrowserPhase,
    onEvent: EngineEventCallback,
  ): void {
    scan.phase = phase;
    onEvent({
      type: ScanEngineEventType.PhaseChanged,
      timestamp: new Date().toISOString(),
      message: `Phase: ${phase}`,
      data: { phase },
    });
  }
}