/**
 * Browser Intelligence Engine — Browser Context Manager
 *
 * Manages browser lifecycle, context creation, and page management.
 * Provides IBrowserController / IPageController abstractions
 * that wrap Playwright (or mock) for testability.
 *
 * Responsibilities:
 * - Browser launch/close
 * - Browser context creation with configurable options
 * - Page lifecycle management
 * - Context reuse for performance
 * - Memory-aware cleanup
 */

import type {
  BrowserType,
  BrowserMode,
  BrowserAdapterConfig,
  IBrowserController,
  IBrowserContextController,
  IPageController,
  IElementHandle,
  IFrameInfo,
  NavigationResult,
  ConsoleMessage,
  ClientSideError,
  RuntimeApiCall,
  AuthCookie,
  StorageEntry,
} from './browser-types.ts';

// ═══════════════════════════════════════════════════════════════
// Default Configuration
// ═══════════════════════════════════════════════════════════════

/** Resolve adapter config with defaults. */
export function resolveBrowserConfig(config?: BrowserAdapterConfig): Required<BrowserAdapterConfig> {
  return {
    browserType: config?.browserType ?? 'chromium' as BrowserType.Chromium,
    browserMode: config?.browserMode ?? 'headless' as BrowserMode.Headless,
    executablePath: config?.executablePath ?? '',
    launchArgs: config?.launchArgs ?? [],
    maxConcurrency: config?.maxConcurrency ?? 3,
    navigationTimeoutMs: config?.navigationTimeoutMs ?? 30000,
    pageLoadTimeoutMs: config?.pageLoadTimeoutMs ?? 60000,
    idleTimeoutMs: config?.idleTimeoutMs ?? 5000,
    captureScreenshots: config?.captureScreenshots ?? false,
    recordVideo: config?.recordVideo ?? false,
    viewportWidth: config?.viewportWidth ?? 1280,
    viewportHeight: config?.viewportHeight ?? 720,
    userAgent: config?.userAgent ?? '',
    blockResources: config?.blockResources ?? false,
    maxNavigationDepth: config?.maxNavigationDepth ?? 5,
    maxPages: config?.maxPages ?? 0,
    interceptRuntime: config?.interceptRuntime ?? true,
    authStrategy: config?.authStrategy ?? 'auto',
    collectConsoleMessages: config?.collectConsoleMessages ?? true,
    collectClientErrors: config?.collectClientErrors ?? true,
    traverseShadowDom: config?.traverseShadowDom ?? true,
    analyzeIframes: config?.analyzeIframes ?? true,
  };
}

// ═══════════════════════════════════════════════════════════════
// Mock Implementations (for testing without Playwright)
// ═══════════════════════════════════════════════════════════════

/**
 * Mock Element Handle.
 * Returns configurable attribute/text/HTML values.
 */
export class MockElementHandle implements IElementHandle {
  private readonly attrs: Map<string, string>;
  private readonly _innerHTML: string;
  private readonly _outerHTML: string;
  private readonly _text: string | null;
  private readonly _tagName: string;
  private readonly children: IElementHandle[];

  constructor(options: {
    tagName?: string;
    attrs?: Record<string, string>;
    innerHTML?: string;
    outerHTML?: string;
    text?: string | null;
    children?: IElementHandle[];
  } = {}) {
    this._tagName = options.tagName ?? 'div';
    this.attrs = new Map(Object.entries(options.attrs ?? {}));
    this._innerHTML = options.innerHTML ?? '';
    this._outerHTML = options.outerHTML ?? `<${this._tagName}></${this._tagName}>`;
    this._text = options.text ?? null;
    this.children = options.children ?? [];
  }

  async getAttribute(name: string): Promise<string | null> {
    return this.attrs.get(name) ?? null;
  }
  async innerHTML(): Promise<string> { return this._innerHTML; }
  async outerHTML(): Promise<string> { return this._outerHTML; }
  async textContent(): Promise<string | null> { return this._text; }
  async tagName(): Promise<string> { return this._tagName; }
  async evaluate<T>(fn: string | ((el: unknown, ...args: unknown[]) => T), ...args: unknown[]): Promise<T> {
    if (typeof fn === 'function') {
      try { return fn(this, ...args); } catch { return undefined as unknown as T; }
    }
    return (0 as unknown) as T;
  }
  async querySelector(selector: string): Promise<IElementHandle | null> {
    // Simple mock: find first child with matching tag
    for (const child of this.children) {
      const tag = await child.tagName();
      if (selector === tag || selector === `#${this.attrs.get('id')}`) return child;
    }
    return null;
  }
  async querySelectorAll(selector: string): Promise<IElementHandle[]> {
    // Simple mock: return all children
    return [...this.children];
  }
}

/**
 * Mock Page Controller.
 * Simulates a browser page with configurable behavior.
 */
export class MockPageController implements IPageController {
  private _url: string;
  private _title: string;
  private _content: string;
  private _closed = false;
  private _viewport: { width: number; height: number } | null;

  /** Maps CSS selectors to arrays of MockElementHandle. */
  readonly elements: Map<string, IElementHandle[]>;
  /** Console message handlers. */
  private consoleHandlers: ((msg: ConsoleMessage) => void)[] = [];
  /** Page error handlers. */
  private errorHandlers: ((err: ClientSideError) => void)[] = [];
  /** Request handlers. */
  private requestHandlers: ((call: RuntimeApiCall) => void)[] = [];
  /** Response handlers. */
  private responseHandlers: ((call: RuntimeApiCall) => void)[] = [];

  /** Evaluate scripts that have been called. */
  readonly evaluateCalls: { fn: string | ((...args: unknown[]) => unknown); args: unknown[] }[] = [];

  /** Navigation history for waitForNavigation. */
  private navigationResolve: ((result: NavigationResult) => void) | null = null;

  constructor(options: {
    url?: string;
    title?: string;
    content?: string;
    elements?: Map<string, IElementHandle[]>;
    viewport?: { width: number; height: number } | null;
  } = {}) {
    this._url = options.url ?? 'about:blank';
    this._title = options.title ?? '';
    this._content = options.content ?? '<html><body></body></html>';
    this.elements = options.elements ?? new Map();
    this._viewport = options.viewport ?? { width: 1280, height: 720 };
  }

  setUrl(url: string): void { this._url = url; }
  setContent(html: string): void { this._content = html; }
  setTitle(title: string): void { this._title = title; }
  setElements(selector: string, handles: IElementHandle[]): void {
    this.elements.set(selector, handles);
  }
  addElement(selector: string, handle: IElementHandle): void {
    const existing = this.elements.get(selector) ?? [];
    existing.push(handle);
    this.elements.set(selector, existing);
  }

  // Simulate navigation completion
  simulateNavigation(url: string, status?: number): void {
    this._url = url;
    if (this.navigationResolve) {
      this.navigationResolve({ url, status: status ?? null });
      this.navigationResolve = null;
    }
  }

  async goto(url: string, _options?: Record<string, unknown>): Promise<NavigationResult> {
    this._url = url;
    return { url, status: 200 };
  }
  url(): string { return this._url; }
  async title(): Promise<string> { return this._title; }
  async content(): Promise<string> { return this._content; }

  async evaluate<T>(fn: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T> {
    this.evaluateCalls.push({ fn: typeof fn === 'string' ? fn : fn.toString(), args });
    // Handle special evaluate calls
    if (typeof fn === 'string') {
      // DOM queries
      if (fn.includes('document.querySelectorAll')) {
        return [] as unknown as T;
      }
      if (fn.includes('localStorage') || fn.includes('sessionStorage')) {
        return [] as unknown as T;
      }
    }
    if (typeof fn === 'function') {
      try {
        // Pass undefined as the element/page context for mock purposes
        return fn(undefined, ...args);
      } catch {
        // DOM APIs like document.querySelectorAll don't exist in Node.js
        // Check if the function string contains DOM API calls and return sensible defaults
        const fnStr = fn.toString();
        if (fnStr.includes('document.querySelectorAll')) return [] as unknown as T;
        if (fnStr.includes('localStorage') || fnStr.includes('sessionStorage')) return [] as unknown as T;
        if (fnStr.includes('navigator.serviceWorker')) return [] as unknown as T;
        return undefined as unknown as T;
      }
    }
    return undefined as unknown as T;
  }
  async close(): Promise<void> { this._closed = true; }
  async click(_selector: string, _options?: Record<string, unknown>): Promise<void> {}
  async fill(_selector: string, _value: string): Promise<void> {}
  async type(_selector: string, _text: string, _options?: Record<string, unknown>): Promise<void> {}
  async waitForNavigation(_options?: Record<string, unknown>): Promise<NavigationResult> {
    return new Promise<NavigationResult>((resolve) => {
      this.navigationResolve = resolve;
    });
  }
  async waitForSelector(selector: string, _options?: Record<string, unknown>): Promise<IElementHandle | null> {
    const els = this.elements.get(selector);
    return els?.[0] ?? null;
  }
  async querySelectorAll(selector: string): Promise<IElementHandle[]> {
    // Exact match first
    const exact = this.elements.get(selector);
    if (exact) return exact;
    // Fallback: check if any stored key has significant selector overlap
    for (const [key, handles] of this.elements) {
      const storedParts = new Set(key.split(',').map(s => s.trim()));
      const requestedParts = new Set(selector.split(',').map(s => s.trim()));
      // Check if at least one stored part exists in the requested parts
      let matchCount = 0;
      for (const part of storedParts) {
        if (requestedParts.has(part)) matchCount++;
      }
      if (matchCount > 0) return handles;
    }
    return [];
  }
  async querySelector(selector: string): Promise<IElementHandle | null> {
    const els = this.elements.get(selector);
    return els?.[0] ?? null;
  }
  async setViewportSize(width: number, height: number): Promise<void> {
    this._viewport = { width, height };
  }
  viewportSize(): { width: number; height: number } | null { return this._viewport; }
  onConsoleMessage(handler: (msg: ConsoleMessage) => void): () => void {
    this.consoleHandlers.push(handler);
    return () => { this.consoleHandlers = this.consoleHandlers.filter(h => h !== handler); };
  }
  onPageError(handler: (err: ClientSideError) => void): () => void {
    this.errorHandlers.push(handler);
    return () => { this.errorHandlers = this.errorHandlers.filter(h => h !== handler); };
  }
  onRequest(handler: (call: RuntimeApiCall) => void): () => void {
    this.requestHandlers.push(handler);
    return () => { this.requestHandlers = this.requestHandlers.filter(h => h !== handler); };
  }
  onResponse(handler: (call: RuntimeApiCall) => void): () => void {
    this.responseHandlers.push(handler);
    return () => { this.responseHandlers = this.responseHandlers.filter(h => h !== handler); };
  }
  frames(): IFrameInfo[] { return [{ url: this._url, name: '' }]; }
  async screenshot(): Promise<string> { return 'mock-screenshot-base64'; }
  isClosed(): boolean { return this._closed; }
}

/**
 * Mock Browser Context Controller.
 */
export class MockBrowserContextController implements IBrowserContextController {
  private _cookies: AuthCookie[] = [];
  private _localStorage: StorageEntry[] = [];
  private _sessionStorage: StorageEntry[] = [];
  private _id: string;
  private _pages: MockPageController[] = [];

  constructor(options?: { id?: string; cookies?: AuthCookie[]; localStorage?: StorageEntry[]; sessionStorage?: StorageEntry[] }) {
    this._id = options?.id ?? 'mock-ctx-' + Math.random().toString(36).slice(2, 8);
    this._cookies = options?.cookies ?? [];
    this._localStorage = options?.localStorage ?? [];
    this._sessionStorage = options?.sessionStorage ?? [];
  }

  addPage(page: MockPageController): void { this._pages.push(page); }

  async newPage(): Promise<IPageController> {
    const page = new MockPageController();
    this._pages.push(page);
    return page;
  }
  async cookies(): Promise<AuthCookie[]> { return [...this._cookies]; }
  async addCookies(cookies: readonly AuthCookie[]): Promise<void> {
    this._cookies = [...this._cookies, ...cookies];
  }
  async localStorage(): Promise<readonly StorageEntry[]> { return [...this._localStorage]; }
  async sessionStorage(): Promise<readonly StorageEntry[]> { return [...this._sessionStorage]; }
  async close(): Promise<void> { this._pages = []; }
  getId(): string { return this._id; }
}

/**
 * Mock Browser Controller.
 */
export class MockBrowserController implements IBrowserController {
  private _connected = true;
  private _contexts: MockBrowserContextController[] = [];
  private _browserType: BrowserType;

  constructor(browserType: BrowserType = 'chromium' as BrowserType) {
    this._browserType = browserType;
  }

  async close(): Promise<void> {
    this._connected = false;
    await Promise.all(this._contexts.map(c => c.close()));
    this._contexts = [];
  }
  async newContext(_options?: Record<string, unknown>): Promise<IBrowserContextController> {
    const ctx = new MockBrowserContextController();
    this._contexts.push(ctx);
    return ctx;
  }
  isConnected(): boolean { return this._connected; }
  getBrowserType(): BrowserType { return this._browserType; }
}

// ═══════════════════════════════════════════════════════════════
// Browser Context Manager
// ═══════════════════════════════════════════════════════════════

/**
 * Manages browser lifecycle, context creation, and page management.
 * Abstracts away Playwright specifics behind interfaces.
 */
export class BrowserContextManager {
  private browser: IBrowserController | null = null;
  private activeContext: IBrowserContextController | null = null;
  private config: Required<BrowserAdapterConfig>;
  private contextsCreated = 0;
  private pagesOpened = 0;
  private contextsReused = 0;

  constructor(config?: BrowserAdapterConfig) {
    this.config = resolveBrowserConfig(config);
  }

  /** Get the current browser instance. */
  getBrowser(): IBrowserController | null {
    return this.browser;
  }

  /** Get the active browser context. */
  getActiveContext(): IBrowserContextController | null {
    return this.activeContext;
  }

  /** Get performance counters. */
  getMetrics(): { contextsCreated: number; pagesOpened: number; contextsReused: number } {
    return {
      contextsCreated: this.contextsCreated,
      pagesOpened: this.pagesOpened,
      contextsReused: this.contextsReused,
    };
  }

  /**
   * Initialize the browser.
   * In production, this launches Playwright.
   * For testing, pass a MockBrowserController.
   */
  async initialize(browser?: IBrowserController): Promise<void> {
    if (browser) {
      this.browser = browser;
    } else {
      // In production, would launch Playwright here.
      // For now, create a mock (this path is for testing only).
      this.browser = new MockBrowserController(this.config.browserType);
    }
    this.activeContext = null;
  }

  /**
   * Get or create a browser context.
   * Implements context reuse for performance.
   */
  async getContext(): Promise<IBrowserContextController> {
    if (!this.browser) throw new Error('Browser not initialized');
    if (this.activeContext) {
      this.contextsReused++;
      return this.activeContext;
    }
    const context = await this.browser.newContext({
      viewport: { width: this.config.viewportWidth, height: this.config.viewportHeight },
      userAgent: this.config.userAgent || undefined,
    });
    this.activeContext = context;
    this.contextsCreated++;
    return context;
  }

  /**
   * Create a new page in the active context.
   */
  async newPage(): Promise<IPageController> {
    const context = await this.getContext();
    const page = await context.newPage();
    this.pagesOpened++;
    return page;
  }

  /**
   * Close the active context and browser.
   */
  async close(): Promise<void> {
    if (this.activeContext) {
      await this.activeContext.close();
      this.activeContext = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Reset state — close context but keep browser alive for reuse.
   */
  async resetContext(): Promise<void> {
    if (this.activeContext) {
      await this.activeContext.close();
      this.activeContext = null;
    }
  }
}