/**
 * Browser Intelligence Engine — Navigation Intelligence
 *
 * Builds a complete navigation map of the application:
 * - SPA routing detection (History API, hash routing)
 * - Redirect chain tracking
 * - Lazy loaded route detection
 * - Nested route classification
 * - Deep link navigation
 * - Navigation map graph construction
 *
 * All navigation is done via IPageController abstraction for testability.
 */

import type {
  NavigationEvent,
  NavigationMap,
  NavigationResult,
  NavigationTrigger,
  RouteNode,
  RouteType,
  RedirectChain,
  BrowserPhase,
} from './browser-types.ts';

// ═══════════════════════════════════════════════════════════════
// Navigation Intelligence
// ═══════════════════════════════════════════════════════════════

/** Configuration for Navigation Intelligence. */
export interface NavigationConfig {
  /** Maximum navigation depth. Default: 5. */
  readonly maxDepth: number;
  /** Maximum pages to visit. 0 = unlimited. */
  readonly maxPages: number;
  /** Navigation timeout in ms. Default: 30000. */
  readonly timeoutMs: number;
  /** Whether to follow links automatically. Default: true. */
  readonly followLinks: boolean;
  /** Whether to submit forms. Default: false. */
  readonly submitForms: boolean;
  /** URL patterns to exclude. */
  readonly excludePatterns: readonly RegExp[];
  /** Include only these URL patterns (empty = all in scope). */
  readonly includePatterns: readonly RegExp[];
  /** Whether to detect SPA routing. Default: true. */
  readonly detectSpa: boolean;
  /** Seed URL. */
  readonly seedUrl: string;
  /** Scope hostname. */
  readonly scopeHostname: string;
}

/** Internal state for navigation tracking. */
interface NavigationState {
  readonly visitedUrls: Set<string>;
  readonly frontier: string[];
  readonly routes: Map<string, RouteNode>;
  readonly redirectChains: RedirectChain[];
  readonly events: NavigationEvent[];
  readonly isSpa: boolean;
  readonly spaFramework: string | undefined;
  readonly maxDepthReached: number;
  readonly pagesVisited: number;
}

/** Create initial navigation state. */
function createNavigationState(seedUrl: string): NavigationState {
  return {
    visitedUrls: new Set(),
    frontier: [seedUrl],
    routes: new Map(),
    redirectChains: [],
    events: [],
    isSpa: false,
    spaFramework: undefined,
    maxDepthReached: 0,
    pagesVisited: 0,
  };
}

/** Normalize URL for deduplication. */
export function normalizeNavigationUrl(raw: string): string {
  try {
    const url = new URL(raw);
    // Remove fragment, sort query params, lowercase
    url.hash = '';
    const params = new URLSearchParams(url.search);
    const sorted = new URLSearchParams([...params.entries()].sort((a, b) => a[0].localeCompare(b[0])));
    url.search = sorted.toString();
    return url.toString().toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

/** Check if a URL is in scope. */
export function isInScope(url: string, config: NavigationConfig): boolean {
  try {
    const parsed = new URL(url);
    // Check hostname match
    if (parsed.hostname !== config.scopeHostname) return false;
    // Check include patterns
    if (config.includePatterns.length > 0) {
      const matchesInclude = config.includePatterns.some(r => r.test(url));
      if (!matchesInclude) return false;
    }
    // Check exclude patterns
    if (config.excludePatterns.some(r => r.test(url))) return false;
    return true;
  } catch {
    return false;
  }
}

/** Classify a route type. */
export function classifyRouteType(
  url: string,
  trigger: NavigationTrigger,
  isSpa: boolean,
  statusCode?: number,
): RouteType {
  // Redirect
  if (statusCode && statusCode >= 300 && statusCode < 400) return 'redirect';
  // Error page
  if (statusCode && statusCode >= 400) return 'error_page';
  // SPA classification
  if (isSpa) {
    if (trigger === 'history_push' || trigger === 'history_replace') {
      return url.includes(':') ? 'dynamic' : 'static';
    }
    if (trigger === 'link_click') {
      // Lazy loaded routes typically take longer and have no SSR
      return 'lazy_loaded';
    }
    if (trigger === 'script') {
      return 'nested';
    }
  }
  return 'static';
}

/** Extract query parameters from URL. */
export function extractQueryParams(url: string): string[] {
  try {
    const parsed = new URL(url);
    if (!parsed.search) return [];
    return [...new URLSearchParams(parsed.search).keys()];
  } catch {
    return [];
  }
}

/**
 * Navigation Intelligence Engine.
 *
 * Builds a complete navigation map of the application by crawling
 * through links, detecting SPA routing, and tracking redirects.
 */
export class NavigationIntelligence {
  private readonly config: NavigationConfig;
  private state: NavigationState;
  private abortController: AbortController | null = null;

  constructor(config: NavigationConfig) {
    this.config = config;
    this.state = createNavigationState(config.seedUrl);
  }

  /** Get the current phase for progress reporting. */
  getPhase(): BrowserPhase {
    return BrowserPhase.Navigating;
  }

  /** Get the number of routes discovered so far. */
  getDiscoveredCount(): number {
    return this.state.routes.size;
  }

  /** Get the current frontier size. */
  getFrontierSize(): number {
    return this.state.frontier.length;
  }

  /** Get visited count. */
  getVisitedCount(): number {
    return this.state.visitedUrls.size;
  }

  /**
   * Process a single navigation result.
   * Updates the navigation state with the new route.
   */
  processNavigation(
    from: string,
    result: NavigationResult,
    trigger: NavigationTrigger,
    loadTimeMs?: number,
  ): void {
    const to = result.url;
    const normalizedTo = normalizeNavigationUrl(to);

    if (this.state.visitedUrls.has(normalizedTo)) return;

    this.state.visitedUrls.add(normalizedTo);

    // Build navigation event
    const event: NavigationEvent = {
      from,
      to,
      trigger,
      timestamp: new Date().toISOString(),
      statusCode: result.status ?? undefined,
      isSpaNavigation: this.state.isSpa && trigger !== 'initial' && trigger !== 'redirect',
    };

    this.state.events.push(event);

    // Determine depth
    const fromNode = this.state.routes.get(normalizeNavigationUrl(from));
    const depth = fromNode ? fromNode.depth + 1 : 0;
    if (depth > this.state.maxDepthReached) {
      this.state.maxDepthReached = depth;
    }

    // Create route node
    const queryParams = extractQueryParams(to);
    const routeType = classifyRouteType(to, trigger, this.state.isSpa, result.status ?? undefined);

    const node: RouteNode = {
      url: to,
      path: (() => { try { return new URL(to).pathname; } catch { return to; } })(),
      title: '',  // Will be filled by the caller
      type: routeType,
      depth,
      children: [],
      navigationEvents: [event],
      analyzed: false,
      method: 'GET',
      queryParams,
      loadTimeMs,
    };

    this.state.routes.set(normalizedTo, node);
    this.state.pagesVisited++;

    // Update parent's children
    if (fromNode) {
      const parentNormalized = normalizeNavigationUrl(from);
      const parent = this.state.routes.get(parentNormalized);
      if (parent) {
        const updatedChildren = [...parent.children, to];
        const updatedNode: RouteNode = { ...parent, children: updatedChildren };
        this.state.routes.set(parentNormalized, updatedNode);
      }
    }

    // Add to frontier if in scope and under max depth
    if (isInScope(to, this.config) && depth < this.config.maxDepth) {
      this.state.frontier.push(to);
    }
  }

  /**
   * Process a redirect chain.
   */
  processRedirectChain(chain: RedirectChain): void {
    this.state.redirectChains.push(chain);
    // Also add the final destination as a route
    const finalUrl = chain.to;
    const normalizedFinal = normalizeNavigationUrl(finalUrl);
    if (!this.state.visitedUrls.has(normalizedFinal)) {
      this.state.visitedUrls.add(normalizedFinal);
      const node: RouteNode = {
        url: finalUrl,
        path: (() => { try { return new URL(finalUrl).pathname; } catch { return finalUrl; } })(),
        title: '',
        type: 'redirect',
        depth: 0,
        children: [],
        navigationEvents: [{
          from: chain.from,
          to: finalUrl,
          trigger: 'redirect',
          timestamp: new Date().toISOString(),
          isSpaNavigation: false,
        }],
        analyzed: false,
        method: 'GET',
        queryParams: extractQueryParams(finalUrl),
        loadTimeMs: chain.durationMs,
      };
      this.state.routes.set(normalizedFinal, node);
    }
  }

  /**
   * Detect SPA framework from page content.
   * Looks for common SPA indicators in HTML.
   */
  detectSpaFramework(htmlContent: string, pageUrl: string): void {
    // React
    if (htmlContent.includes('__NEXT_DATA__') || htmlContent.includes('_reactRootContainer') || htmlContent.includes('data-reactroot')) {
      this.state.isSpa = true;
      if (!this.state.spaFramework) {
        this.state.spaFramework = htmlContent.includes('__NEXT_DATA__') ? 'Next.js' : 'React';
      }
      return;
    }
    // Vue
    if (htmlContent.includes('__vue__') || htmlContent.includes('data-v-') || htmlContent.includes('__nuxt')) {
      this.state.isSpa = true;
      if (!this.state.spaFramework) {
        this.state.spaFramework = htmlContent.includes('__nuxt') ? 'Nuxt' : 'Vue';
      }
      return;
    }
    // Angular
    if (htmlContent.includes('ng-app') || htmlContent.includes('ng-version') || htmlContent.includes('[ngClass]')) {
      this.state.isSpa = true;
      if (!this.state.spaFramework) this.state.spaFramework = 'Angular';
      return;
    }
    // Svelte
    if (htmlContent.includes('__svelte') || htmlContent.includes('svelte-')) {
      this.state.isSpa = true;
      if (!this.state.spaFramework) this.state.spaFramework = 'Svelte';
      return;
    }
    // Ember
    if (htmlContent.includes('data-ember-extension') || htmlContent.includes('ember-application')) {
      this.state.isSpa = true;
      if (!this.state.spaFramework) this.state.spaFramework = 'Ember';
      return;
    }
    // Generic SPA indicator: no server-rendered links but has hash routing
    if (pageUrl.includes('#/') || pageUrl.includes('#!')) {
      this.state.isSpa = true;
    }
  }

  /**
   * Extract navigable links from HTML content.
   */
  extractLinks(htmlContent: string, currentPageUrl: string): string[] {
    const links: string[] = [];
    // Match href attributes in <a> tags
    const hrefRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    let match;
    while ((match = hrefRegex.exec(htmlContent)) !== null) {
      const href = match[1];
      // Skip anchors, javascript:, mailto:, tel:
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }
      // Resolve relative URLs
      try {
        const resolved = new URL(href, currentPageUrl).href;
        if (isInScope(resolved, this.config)) {
          links.push(resolved);
        }
      } catch {
        // Invalid URL, skip
      }
    }
    return links;
  }

  /**
   * Mark a route as analyzed.
   */
  markAnalyzed(url: string): void {
    const normalized = normalizeNavigationUrl(url);
    const node = this.state.routes.get(normalized);
    if (node) {
      this.state.routes.set(normalized, { ...node, analyzed: true });
    }
  }

  /**
   * Update a route's title.
   */
  updateRouteTitle(url: string, title: string): void {
    const normalized = normalizeNavigationUrl(url);
    const node = this.state.routes.get(normalized);
    if (node) {
      this.state.routes.set(normalized, { ...node, title });
    }
  }

  /**
   * Pop the next URL from the frontier.
   * Returns null if frontier is empty or max pages reached.
   */
  popFrontier(): string | null {
    if (this.config.maxPages > 0 && this.state.pagesVisited >= this.config.maxPages) {
      return null;
    }
    while (this.state.frontier.length > 0) {
      const next = this.state.frontier.shift()!;
      const normalized = normalizeNavigationUrl(next);
      if (!this.state.visitedUrls.has(normalized)) {
        return next;
      }
    }
    return null;
  }

  /**
   * Build the final navigation map.
   */
  buildNavigationMap(): NavigationMap {
    return {
      routes: new Map(this.state.routes),
      redirectChains: [...this.state.redirectChains],
      seedUrl: this.config.seedUrl,
      maxDepthReached: this.state.maxDepthReached,
      totalRoutes: this.state.routes.size,
      isSpa: this.state.isSpa,
      spaFramework: this.state.spaFramework,
    };
  }

  /**
   * Create a snapshot for recovery.
   */
  createSnapshot(jobId: string): { jobId: string; targetUrl: string; visitedUrls: string[]; frontier: string[]; currentDepth: number; phase: BrowserPhase } {
    return {
      jobId,
      targetUrl: this.config.seedUrl,
      visitedUrls: [...this.state.visitedUrls],
      frontier: [...this.state.frontier],
      currentDepth: this.state.maxDepthReached,
      phase: this.getPhase(),
    };
  }

  /**
   * Restore from a snapshot.
   */
  restoreSnapshot(snapshot: { visitedUrls: string[]; frontier: string[]; currentDepth: number }): void {
    this.state = {
      ...createNavigationState(this.config.seedUrl),
      visitedUrls: new Set(snapshot.visitedUrls),
      frontier: [...snapshot.frontier],
      maxDepthReached: snapshot.currentDepth,
    };
  }

  /**
   * Set the abort controller for cancellation.
   */
  setAbortController(controller: AbortController): void {
    this.abortController = controller;
  }

  /** Check if aborted. */
  isAborted(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }

  /** Get all navigation events. */
  getEvents(): readonly NavigationEvent[] {
    return [...this.state.events];
  }
}