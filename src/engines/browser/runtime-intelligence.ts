/**
 * Browser Intelligence Engine — JavaScript Runtime Intelligence
 *
 * Intercepts and analyzes JavaScript runtime APIs:
 * - Fetch API
 * - XMLHttpRequest
 * - WebSocket
 * - EventSource (SSE)
 * - Service Workers
 * - Web Workers
 * - GraphQL operations
 * - Dynamic imports
 * - Runtime route patterns
 *
 * Uses IPageController for testability.
 */

import type {
  RuntimeApiCall,
  RuntimeApiType,
  RuntimeApiStatus,
  GraphQLOperation,
  WebSocketChannel,
  ServiceWorkerInfo,
  ConsoleMessage as ConsoleMessageType,
  ClientSideError as ClientSideErrorType,
  RuntimeIntelligenceData,
  IPageController,
} from './browser-types.ts';

// ═══════════════════════════════════════════════════════════════
// Runtime Intelligence
// ═══════════════════════════════════════════════════════════════

/** Configuration for runtime intelligence. */
export interface RuntimeConfig {
  /** Whether to intercept fetch. Default: true. */
  readonly interceptFetch: boolean;
  /** Whether to intercept XHR. Default: true. */
  readonly interceptXhr: boolean;
  /** Whether to intercept WebSocket. Default: true. */
  readonly interceptWebSocket: boolean;
  /** Whether to intercept EventSource. Default: true. */
  readonly interceptEventSource: boolean;
  /** Whether to detect service workers. Default: true. */
  readonly detectServiceWorkers: boolean;
  /** Whether to detect web workers. Default: true. */
  readonly detectWebWorkers: boolean;
  /** Whether to detect GraphQL. Default: true. */
  readonly detectGraphQL: boolean;
  /** Whether to detect dynamic imports. Default: true. */
  readonly detectDynamicImports: boolean;
  /** Maximum API calls to track. 0 = unlimited. Default: 0. */
  readonly maxApiCalls: number;
}

/** Default runtime config. */
export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  interceptFetch: true,
  interceptXhr: true,
  interceptWebSocket: true,
  interceptEventSource: true,
  detectServiceWorkers: true,
  detectWebWorkers: true,
  detectGraphQL: true,
  detectDynamicImports: true,
  maxApiCalls: 0,
};

let callIdCounter = 0;

/** Generate a unique call ID. */
function nextCallId(): string {
  return `rpc-${++callIdCounter}`;
}

/**
 * Runtime Intelligence Engine.
 *
 * Injects JavaScript into the page to intercept all runtime APIs.
 * Collects data via callbacks and page.evaluate().
 */
export class RuntimeIntelligence {
  private readonly config: RuntimeConfig;
  private apiCalls: RuntimeApiCall[] = [];
  private graphqlOperations: GraphQLOperation[] = [];
  private webSocketChannels: Map<string, WebSocketChannel> = new Map();
  private serviceWorkers: ServiceWorkerInfo[] = [];
  private consoleMessages: ConsoleMessageType[] = [];
  private clientErrors: ClientSideErrorType[] = [];
  private runtimeRoutes: Set<string> = new Set();
  private unsubscribers: (() => void)[] = [];
  private wsIdCounter = 0;

  constructor(config?: Partial<RuntimeConfig>) {
    this.config = { ...DEFAULT_RUNTIME_CONFIG, ...config };
  }

  /**
   * Install all runtime interception scripts on the page.
   * Must be called before any navigation.
   */
  async install(page: IPageController): Promise<void> {
    // Clean up previous subscriptions
    this.cleanup();

    // Inject runtime interception script
    const script = this.buildInterceptionScript();
    await page.evaluate(script).catch(() => {
      // Script injection may fail on certain pages — non-fatal
    });

    // Register console message handler
    if (page.onConsoleMessage) {
      const unsub = page.onConsoleMessage((msg) => {
        this.consoleMessages.push(msg);
      });
      this.unsubscribers.push(unsub);
    }

    // Register page error handler
    if (page.onPageError) {
      const unsub = page.onPageError((err) => {
        this.clientErrors.push(err);
      });
      this.unsubscribers.push(unsub);
    }

    // Register request handler
    if (page.onRequest) {
      const unsub = page.onRequest((call) => {
        this.addApiCall(call);
      });
      this.unsubscribers.push(unsub);
    }

    // Register response handler
    if (page.onResponse) {
      const unsub = page.onResponse((call) => {
        this.updateApiCall(call);
      });
      this.unsubscribers.push(unsub);
    }

    // Detect service workers
    if (this.config.detectServiceWorkers) {
      await this.detectServiceWorkersOnPage(page).catch(() => {});
    }
  }

  /**
   * Collect data accumulated since the last navigation/action.
   */
  async collect(page: IPageController): Promise<void> {
    // Collect intercepted data from the page
    try {
      const data = await page.evaluate(this.buildCollectScript()).catch(() => null);
      if (data) {
        this.processCollectedData(data);
      }
    } catch {
      // Non-fatal
    }

    // Detect service workers
    if (this.config.detectServiceWorkers) {
      await this.detectServiceWorkersOnPage(page).catch(() => {});
    }
  }

  /**
   * Build the final runtime intelligence data.
   */
  buildResult(): RuntimeIntelligenceData {
    const uniqueEndpoints = new Set(this.apiCalls.map(c => `${c.method}:${c.url}`));
    return {
      apiCalls: [...this.apiCalls],
      graphqlOperations: [...this.graphqlOperations],
      webSocketChannels: [...this.webSocketChannels.values()],
      serviceWorkers: [...this.serviceWorkers],
      consoleMessages: [...this.consoleMessages],
      clientErrors: [...this.clientErrors],
      runtimeRoutes: [...this.runtimeRoutes],
      totalApiCalls: this.apiCalls.length,
      uniqueEndpoints: uniqueEndpoints.size,
    };
  }

  /**
   * Create a snapshot for recovery.
   */
  createSnapshot(): {
    apiCallsCount: number;
    graphqlCount: number;
    wsCount: number;
    consoleCount: number;
    errorCount: number;
    routesCount: number;
  } {
    return {
      apiCallsCount: this.apiCalls.length,
      graphqlCount: this.graphqlOperations.length,
      wsCount: this.webSocketChannels.size,
      consoleCount: this.consoleMessages.length,
      errorCount: this.clientErrors.length,
      routesCount: this.runtimeRoutes.size,
    };
  }

  /** Clean up all handlers and reset state. */
  cleanup(): void {
    for (const unsub of this.unsubscribers) {
      try { unsub(); } catch { /* best effort */ }
    }
    this.unsubscribers = [];
  }

  /** Reset all collected data. */
  reset(): void {
    this.apiCalls = [];
    this.graphqlOperations = [];
    this.webSocketChannels = new Map();
    this.serviceWorkers = [];
    this.consoleMessages = [];
    this.clientErrors = [];
    this.runtimeRoutes = new Set();
  }

  // ─── API Call Management ──────────────────────────────────

  private addApiCall(call: RuntimeApiCall): void {
    if (this.config.maxApiCalls > 0 && this.apiCalls.length >= this.config.maxApiCalls) return;
    this.apiCalls.push(call);

    // Detect GraphQL
    if (this.config.detectGraphQL && this.isGraphQlCall(call)) {
      this.extractGraphQLOperation(call);
    }
  }

  private updateApiCall(call: RuntimeApiCall): void {
    // Find existing call by URL+method+timestamp and update status
    const idx = this.apiCalls.findIndex(
      c => c.url === call.url && c.method === call.method && c.id === call.id,
    );
    if (idx >= 0) {
      this.apiCalls[idx] = call;
    } else {
      this.addApiCall(call);
    }
  }

  // ─── GraphQL Detection ────────────────────────────────────

  private isGraphQlCall(call: RuntimeApiCall): boolean {
    const indicators = [
      call.url.includes('/graphql'),
      call.url.includes('/graphiql'),
      call.responseContentType === 'application/graphql+json',
      call.responseContentType === 'application/graphql-response+json',
      call.requestHeaders.get('content-type') === 'application/json' && call.requestBody?.includes('"query"'),
      call.requestHeaders.get('apollo-require-preflight') !== undefined,
    ];
    return indicators.some(Boolean);
  }

  private extractGraphQLOperation(call: RuntimeApiCall): void {
    try {
      if (!call.requestBody) return;
      const body = JSON.parse(call.requestBody);
      if (!body.query) return;

      // Calculate query depth
      const depth = this.calculateGraphQlDepth(body.query);

      // Extract fragments
      const hasFragments = /\s*fragment\s+/i.test(body.query);

      // Determine operation type
      const queryStr = body.query.trim();
      const operationType = queryStr.startsWith('mutation') ? 'mutation' as const
        : queryStr.startsWith('subscription') ? 'subscription' as const
        : 'query' as const;

      const op: GraphQLOperation = {
        id: `gql-${this.graphqlOperations.length + 1}`,
        operationType,
        name: body.operationName,
        query: body.query,
        variables: body.variables,
        endpointUrl: call.url,
        timestamp: call.timestamp,
        pageUrl: call.pageUrl,
        statusCode: call.statusCode,
        hasFragments,
        queryDepth: depth,
      };

      this.graphqlOperations.push(op);
    } catch {
      // Invalid JSON or non-GraphQL body
    }
  }

  private calculateGraphQlDepth(query: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    for (const char of query) {
      if (char === '{') {
        currentDepth++;
        if (currentDepth > maxDepth) maxDepth = currentDepth;
      } else if (char === '}') {
        currentDepth--;
      }
    }
    return maxDepth;
  }

  // ─── Service Worker Detection ─────────────────────────────

  private async detectServiceWorkersOnPage(page: IPageController): Promise<void> {
    try {
      const swData = await page.evaluate(async () => {
        if (!navigator.serviceWorker) return [];
        const regs = await navigator.serviceWorker.getRegistrations();
        return regs.map(r => ({
          scriptUrl: r.scope.replace(/\/$/, '') + '/service-worker.js',
          scope: r.scope,
          state: (r as any).active?.state ?? r.installing?.state ?? 'unknown',
          registeredAt: new Date().toISOString(),
        }));
      });
      for (const sw of swData) {
        this.serviceWorkers.push(sw);
      }
    } catch {
      // Service worker detection not available
    }
  }

  // ─── WebSocket Management ─────────────────────────────────

  addWebSocketChannel(ws: WebSocketChannel): void {
    this.webSocketChannels.set(ws.id, ws);
  }

  updateWebSocketChannel(id: string, updates: Partial<WebSocketChannel>): void {
    const existing = this.webSocketChannels.get(id);
    if (existing) {
      this.webSocketChannels.set(id, { ...existing, ...updates });
    }
  }

  // ─── Collected Data Processing ────────────────────────────

  private processCollectedData(data: {
    fetchCalls?: RuntimeApiCall[];
    xhrCalls?: RuntimeApiCall[];
    wsChannels?: WebSocketChannel[];
    dynamicImports?: string[];
    runtimeRoutes?: string[];
  }): void {
    if (data.fetchCalls) {
      for (const call of data.fetchCalls) {
        this.addApiCall(call);
      }
    }
    if (data.xhrCalls) {
      for (const call of data.xhrCalls) {
        this.addApiCall(call);
      }
    }
    if (data.wsChannels) {
      for (const ws of data.wsChannels) {
        this.webSocketChannels.set(ws.id, ws);
      }
    }
    if (data.dynamicImports) {
      // Dynamic imports are tracked as runtime routes
      for (const route of data.dynamicImports) {
        this.runtimeRoutes.add(route);
      }
    }
    if (data.runtimeRoutes) {
      for (const route of data.runtimeRoutes) {
        this.runtimeRoutes.add(route);
      }
    }
  }

  // ─── Injection Scripts ────────────────────────────────────

  private buildInterceptionScript(): string {
    return `
      (function() {
        if (window.__browserIntelligenceInstalled) return;
        window.__browserIntelligenceInstalled = true;

        // Storage for intercepted data
        window.__bi = {
          fetchCalls: [],
          xhrCalls: [],
          wsChannels: [],
          dynamicImports: [],
          runtimeRoutes: [],
        };

        // Intercept Fetch
        if (typeof fetch === 'function') {
          const originalFetch = window.fetch;
          window.fetch = async function(...args) {
            const [input, init] = args;
            const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
            const method = (init?.method || 'GET').toUpperCase();
            const headers = new Map();
            if (init?.headers) {
              const h = init.headers instanceof Headers ? Object.fromEntries(init.headers.entries())
                : typeof init.headers === 'object' ? init.headers : {};
              for (const [k, v] of Object.entries(h)) headers.set(k, String(v));
            }
            const call = {
              id: 'fetch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
              type: 'fetch',
              url, method, requestHeaders: Object.fromEntries(headers),
              status: 'pending', timestamp: new Date().toISOString(),
              pageUrl: location.href,
              hasAuthToken: !!headers.get('authorization') || !!headers.get('cookie'),
            };
            window.__bi.fetchCalls.push(call);

            try {
              const response = await originalFetch.apply(this, args);
              call.status = response.ok ? 'success' : 'error';
              call.statusCode = response.status;
              call.responseContentType = response.headers.get('content-type') ?? undefined;
              return response;
            } catch (err) {
              call.status = 'error';
              call.errorMessage = err.message;
              throw err;
            }
          };
        }

        // Intercept XMLHttpRequest
        if (typeof XMLHttpRequest === 'function') {
          const originalOpen = XMLHttpRequest.prototype.open;
          const originalSend = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this.__bi_method = method;
            this.__bi_url = url;
            this.__bi_headers = new Map();
            return originalOpen.call(this, method, url, ...rest);
          };
          XMLHttpRequest.prototype.send = function(body) {
            const call = {
              id: 'xhr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
              type: 'xmlhttprequest',
              url: this.__bi_url,
              method: this.__bi_method || 'GET',
              requestHeaders: Object.fromEntries(this.__bi_headers || new Map()),
              requestBody: typeof body === 'string' ? body.slice(0, 5000) : undefined,
              status: 'pending',
              timestamp: new Date().toISOString(),
              pageUrl: location.href,
              hasAuthToken: false,
            };
            window.__bi.xhrCalls.push(call);
            this.__bi_call = call;

            this.addEventListener('load', function() {
              call.status = 'success';
              call.statusCode = this.status;
              call.responseContentType = this.getResponseHeader('content-type');
            });
            this.addEventListener('error', function() {
              call.status = 'error';
            });

            return originalSend.call(this, body);
          };
          const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
          XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
            if (this.__bi_headers) this.__bi_headers.set(name, value);
            if (name.toLowerCase() === 'authorization' || name.toLowerCase() === 'cookie') {
              if (this.__bi_call) this.__bi_call.hasAuthToken = true;
            }
            return originalSetRequestHeader.call(this, name, value);
          };
        }
      })();
    `;
  }

  private buildCollectScript(): () => Promise<{
    fetchCalls: RuntimeApiCall[];
    xhrCalls: RuntimeApiCall[];
    wsChannels: WebSocketChannel[];
    dynamicImports: string[];
    runtimeRoutes: string[];
  }> {
    return () => {
      const bi = (window as any).__bi;
      if (!bi) return {
        fetchCalls: [], xhrCalls: [], wsChannels: [],
        dynamicImports: [], runtimeRoutes: [],
      };
      return {
        fetchCalls: bi.fetchCalls || [],
        xhrCalls: bi.xhrCalls || [],
        wsChannels: bi.wsChannels || [],
        dynamicImports: bi.dynamicImports || [],
        runtimeRoutes: bi.runtimeRoutes || [],
      };
    };
  }
}