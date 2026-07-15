/**
 * Browser Intelligence Engine — Type Definitions
 *
 * All data structures for the Browser Intelligence Layer.
 * Pure types — zero infrastructure dependencies.
 *
 * Categories:
 * - Browser configuration (BrowserType, BrowserMode)
 * - Navigation models (NavigationEvent, NavigationMap, RouteNode)
 * - Authentication models (AuthStrategy, AuthResult, SessionInfo)
 * - DOM snapshot models (DomSnapshot, FormElement, InputElement)
 * - Runtime models (RuntimeApiCall, GraphQLOperation, WebSocketChannel)
 * - Browser artifact types (BrowserArtifactType)
 * - Browser session models (BrowserSessionState, BrowserSnapshot)
 */

// ═══════════════════════════════════════════════════════════════
// Browser Configuration
// ═══════════════════════════════════════════════════════════════

/** Supported browser engines. */
export enum BrowserType {
  Chromium = 'chromium',
  Firefox = 'firefox',
  WebKit = 'webkit',
}

/** Browser display mode. */
export enum BrowserMode {
  Headless = 'headless',
  Headful = 'headful',
}

/** Adapter configuration. */
export interface BrowserAdapterConfig {
  /** Which browser engine to use. Default: Chromium. */
  readonly browserType?: BrowserType;
  /** Headless or headful mode. Default: Headless. */
  readonly browserMode?: BrowserMode;
  /** Path to browser executable (optional, auto-detected). */
  readonly executablePath?: string;
  /** Browser launch arguments (e.g. ['--disable-gpu']). */
  readonly launchArgs?: readonly string[];
  /** Maximum concurrent browser contexts. Default: 3. */
  readonly maxConcurrency?: number;
  /** Navigation timeout in milliseconds. Default: 30000. */
  readonly navigationTimeoutMs?: number;
  /** Page load timeout in milliseconds. Default: 60000. */
  readonly pageLoadTimeoutMs?: number;
  /** Idle timeout (no network activity) in ms. Default: 5000. */
  readonly idleTimeoutMs?: number;
  /** Whether to capture screenshots. Default: false. */
  readonly captureScreenshots?: boolean;
  /** Whether to record video. Default: false. */
  readonly recordVideo?: boolean;
  /** Viewport width. Default: 1280. */
  readonly viewportWidth?: number;
  /** Viewport height. Default: 720. */
  readonly viewportHeight?: number;
  /** User agent override. */
  readonly userAgent?: string;
  /** Whether to block images/stylesheets for speed. Default: false. */
  readonly blockResources?: boolean;
  /** Maximum navigation depth for SPA crawling. Default: 5. */
  readonly maxNavigationDepth?: number;
  /** Maximum pages to visit. 0 = unlimited. Default: 0. */
  readonly maxPages?: number;
  /** Whether to intercept and analyze runtime APIs. Default: true. */
  readonly interceptRuntime?: boolean;
  /** Authentication strategy to use. Default: 'auto'. */
  readonly authStrategy?: string;
  /** Whether to collect console messages. Default: true. */
  readonly collectConsoleMessages?: boolean;
  /** Whether to collect client-side errors. Default: true. */
  readonly collectClientErrors?: boolean;
  /** Whether to traverse shadow DOM. Default: true. */
  readonly traverseShadowDom?: boolean;
  /** Whether to analyze iframes. Default: true. */
  readonly analyzeIframes?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Navigation Intelligence
// ═══════════════════════════════════════════════════════════════

/** How a navigation was triggered. */
export type NavigationTrigger =
  | 'initial'
  | 'link_click'
  | 'form_submit'
  | 'history_push'
  | 'history_replace'
  | 'redirect'
  | 'script'
  | 'deep_link';

/** Type of route detected. */
export type RouteType =
  | 'static'
  | 'dynamic'
  | 'lazy_loaded'
  | 'nested'
  | 'redirect'
  | 'error_page';

/** A single navigation event in the browser. */
export interface NavigationEvent {
  /** URL navigated from. */
  readonly from: string;
  /** URL navigated to. */
  readonly to: string;
  /** Navigation trigger type. */
  readonly trigger: NavigationTrigger;
  /** Timestamp (ISO-8601). */
  readonly timestamp: string;
  /** HTTP status code (if applicable). */
  readonly statusCode?: number;
  /** Whether the navigation was within the SPA (no full page reload). */
  readonly isSpaNavigation: boolean;
  /** Page title after navigation. */
  readonly title?: string;
  /** Referrer header value. */
  readonly referrer?: string;
}

/** A node in the navigation map (graph). */
export interface RouteNode {
  /** URL of this route. */
  readonly url: string;
  /** Normalized URL (path component). */
  readonly path: string;
  /** Page title. */
  readonly title: string;
  /** Route type classification. */
  readonly type: RouteType;
  /** Depth in the navigation tree (0 = seed). */
  readonly depth: number;
  /** URLs of child routes discovered from this page. */
  readonly children: readonly string[];
  /** Navigation events that led to this route. */
  readonly navigationEvents: readonly NavigationEvent[];
  /** Whether the route was fully analyzed. */
  readonly analyzed: boolean;
  /** HTTP method required (GET, POST). */
  readonly method: string;
  /** Query parameters observed. */
  readonly queryParams: readonly string[];
  /** Page load time in ms. */
  readonly loadTimeMs?: number;
}

/** A chain of redirects. */
export interface RedirectChain {
  /** The initial URL. */
  readonly from: string;
  /** The final URL after all redirects. */
  readonly to: string;
  /** Intermediate URLs in the chain. */
  readonly intermediates: readonly string[];
  /** Status codes for each redirect. */
  readonly statusCodes: readonly number[];
  /** Total redirect time in ms. */
  readonly durationMs: number;
}

/** Complete navigation map — a graph of all discovered routes. */
export interface NavigationMap {
  /** All route nodes indexed by URL. */
  readonly routes: ReadonlyMap<string, RouteNode>;
  /** Redirect chains discovered. */
  readonly redirectChains: readonly RedirectChain[];
  /** The seed URL. */
  readonly seedUrl: string;
  /** Maximum depth reached. */
  readonly maxDepthReached: number;
  /** Total unique routes discovered. */
  readonly totalRoutes: number;
  /** Whether the SPA was detected. */
  readonly isSpa: boolean;
  /** Detected SPA framework (e.g. "React", "Vue", "Angular"). */
  readonly spaFramework?: string;
}

// ═══════════════════════════════════════════════════════════════
// Authentication Intelligence
// ═══════════════════════════════════════════════════════════════

/** Authentication method detected or configured. */
export enum BrowserAuthMethod {
  None = 'none',
  LoginForm = 'login_form',
  Jwt = 'jwt',
  Cookie = 'cookie',
  Session = 'session',
  Oauth = 'oauth',
  OpenIdConnect = 'openid_connect',
  Mfa = 'mfa',
  ApiKey = 'api_key',
  Bearer = 'bearer',
}

/** Result of authentication intelligence analysis. */
export interface AuthResult {
  /** Authentication method detected. */
  readonly method: BrowserAuthMethod;
  /** Whether authentication was successful. */
  readonly success: boolean;
  /** Session token/identifier (if obtained). */
  readonly sessionToken?: string;
  /** JWT payload (if JWT detected). */
  readonly jwtPayload?: Record<string, unknown>;
  /** JWT header (if JWT detected). */
  readonly jwtHeader?: Record<string, unknown>;
  /** JWT expiration (ISO-8601). */
  readonly jwtExpiresAt?: string;
  /** CSRF token detected. */
  readonly csrfToken?: string;
  /** CSRF token field name (e.g. "_csrf", "csrf_token"). */
  readonly csrfFieldName?: string;
  /** Login form URL. */
  readonly loginUrl?: string;
  /** Logout URL detected. */
  readonly logoutUrl?: string;
  /** OAuth authorization URL (if detected). */
  readonly oauthUrl?: string;
  /** MFA challenge type detected (e.g. 'totp', 'sms', 'email'). */
  readonly mfaType?: string;
  /** MFA extension point identifier. */
  readonly mfaExtensionId?: string;
  /** Cookies set during authentication. */
  readonly authCookies: readonly AuthCookie[];
  /** Local storage entries set during authentication. */
  readonly authLocalStorage: readonly StorageEntry[];
  /** Session storage entries set during authentication. */
  readonly authSessionStorage: readonly StorageEntry[];
  /** Error message if auth failed. */
  readonly errorMessage?: string;
  /** Timestamp of the auth attempt. */
  readonly timestamp: string;
}

/** A cookie with metadata. */
export interface AuthCookie {
  readonly name: string;
  readonly value: string;
  readonly domain: string;
  readonly path: string;
  readonly httpOnly: boolean;
  readonly secure: boolean;
  readonly sameSite: string;
  readonly expires?: string;
}

/** A storage entry. */
export interface StorageEntry {
  readonly key: string;
  readonly value: string;
  readonly source: 'local' | 'session';
}

/** Session information for a browser intelligence scan. */
export interface SessionInfo {
  /** Unique session identifier. */
  readonly sessionId: string;
  /** Whether the session is authenticated. */
  readonly isAuthenticated: boolean;
  /** Authentication method used. */
  readonly authMethod: BrowserAuthMethod;
  /** User identifier (if detected). */
  readonly userId?: string;
  /** Session start time. */
  readonly startedAt: string;
  /** Session last activity time. */
  readonly lastActivityAt: string;
  /** Total pages visited. */
  readonly pagesVisited: number;
  /** Session duration in ms. */
  readonly durationMs: number;
}

// ═══════════════════════════════════════════════════════════════
// DOM Intelligence
// ═══════════════════════════════════════════════════════════════

/** Input type classification. */
export type InputType =
  | 'text'
  | 'password'
  | 'email'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
  | 'datetime-local'
  | 'time'
  | 'month'
  | 'week'
  | 'color'
  | 'range'
  | 'file'
  | 'hidden'
  | 'checkbox'
  | 'radio'
  | 'submit'
  | 'button'
  | 'reset'
  | 'image'
  | 'select'
  | 'textarea'
  | 'contenteditable'
  | 'custom';

/** A form input element extracted from the DOM. */
export interface InputElement {
  readonly name: string;
  readonly type: InputType;
  readonly id?: string;
  readonly placeholder?: string;
  readonly value?: string;
  readonly required: boolean;
  readonly readonly: boolean;
  readonly disabled: boolean;
  readonly pattern?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: string;
  readonly max?: string;
  readonly step?: string;
  readonly autocomplete?: string;
  readonly accept?: string;
  readonly multiple: boolean;
  readonly label?: string;
  readonly ariaLabel?: string;
  /** CSS selector to locate this element. */
  readonly selector: string;
}

/** A form element extracted from the DOM. */
export interface FormElement {
  readonly id?: string;
  readonly action: string;
  readonly method: 'GET' | 'POST';
  readonly enctype: string;
  readonly inputs: readonly InputElement[];
  readonly hasFileUpload: boolean;
  readonly hasCaptcha: boolean;
  readonly hasPassword: boolean;
  readonly hasHiddenFields: boolean;
  readonly hiddenFieldNames: readonly string[];
  readonly csrfToken?: string;
  readonly csrfFieldName?: string;
  readonly submitButtonSelector?: string;
  readonly pageUrl: string;
  readonly selector: string;
}

/** A button element. */
export interface ButtonElement {
  readonly text: string;
  readonly type: string;
  readonly id?: string;
  readonly name?: string;
  readonly disabled: boolean;
  readonly selector: string;
  readonly formAction?: string;
}

/** A dynamic element (appears via JS). */
export interface DynamicElement {
  readonly tag: string;
  readonly id?: string;
  readonly className?: string;
  readonly text?: string;
  readonly selector: string;
  readonly appearedAt: string;
  readonly trigger?: string;
}

/** A shadow DOM host. */
export interface ShadowDomHost {
  readonly tag: string;
  readonly selector: string;
  readonly mode: 'open' | 'closed';
  readonly childCount: number;
  readonly hasForms: boolean;
  readonly hasInputs: boolean;
  readonly hasScripts: boolean;
}

/** An iframe element. */
export interface IframeInfo {
  readonly src?: string;
  readonly id?: string;
  readonly name?: string;
  readonly sandbox?: string;
  readonly allow?: string;
  readonly selector: string;
  readonly isCrossOrigin: boolean;
  readonly isAccessible: boolean;
}

/** A custom (web) component. */
export interface CustomElement {
  readonly tagName: string;
  readonly selector: string;
  readonly observedAttributes: readonly string[];
  readonly hasShadowRoot: boolean;
  readonly isConnected: boolean;
}

/** Complete DOM snapshot. */
export interface DomSnapshot {
  /** URL of the page. */
  readonly pageUrl: string;
  /** Page title. */
  readonly title: string;
  /** All forms on the page. */
  readonly forms: readonly FormElement[];
  /** All standalone buttons (not in forms). */
  readonly buttons: readonly ButtonElement[];
  /** All dynamic elements detected. */
  readonly dynamicElements: readonly DynamicElement[];
  /** All shadow DOM hosts. */
  readonly shadowDomHosts: readonly ShadowDomHost[];
  /** All iframes. */
  readonly iframes: readonly IframeInfo[];
  /** All custom elements. */
  readonly customElements: readonly CustomElement[];
  /** All hidden fields across forms. */
  readonly hiddenFields: readonly InputElement[];
  /** All CSRF tokens found. */
  readonly csrfTokens: readonly { token: string; fieldName: string; formAction?: string }[];
  /** Total DOM elements count. */
  readonly totalElements: number;
  /** Timestamp of the snapshot. */
  readonly timestamp: string;
  /** Whether meta robots noindex/nofollow is set. */
  readonly isNoIndex: boolean;
  /** Canonical URL. */
  readonly canonicalUrl?: string;
  /** Open Graph meta tags. */
  readonly openGraph: ReadonlyMap<string, string>;
  /** Meta description. */
  readonly metaDescription?: string;
}

// ═══════════════════════════════════════════════════════════════
// Runtime Intelligence
// ═══════════════════════════════════════════════════════════════

/** Type of runtime API call. */
export type RuntimeApiType =
  | 'fetch'
  | 'xmlhttprequest'
  | 'websocket'
  | 'eventsource'
  | 'service_worker'
  | 'web_worker'
  | 'graphql'
  | 'dynamic_import';

/** Status of a runtime API call. */
export type RuntimeApiStatus = 'pending' | 'success' | 'error' | 'aborted';

/** A single runtime API call intercepted. */
export interface RuntimeApiCall {
  /** Unique ID for this call. */
  readonly id: string;
  /** Type of API call. */
  readonly type: RuntimeApiType;
  /** URL/endpoint called. */
  readonly url: string;
  /** HTTP method. */
  readonly method: string;
  /** Request headers (key-value). */
  readonly requestHeaders: ReadonlyMap<string, string>;
  /** Request body (if applicable, truncated). */
  readonly requestBody?: string;
  /** Response status code (if completed). */
  readonly statusCode?: number;
  /** Response content type. */
  readonly responseContentType?: string;
  /** Response body (truncated). */
  readonly responseBody?: string;
  /** Status of the call. */
  readonly status: RuntimeApiStatus;
  /** Timestamp of the call. */
  readonly timestamp: string;
  /** Duration in ms (if completed). */
  readonly durationMs?: number;
  /** Page URL where the call was made. */
  readonly pageUrl: string;
  /** Error message (if failed). */
  readonly errorMessage?: string;
  /** Whether the call contained an auth token. */
  readonly hasAuthToken: boolean;
  /** Initiated from which resource (script URL). */
  readonly initiator?: string;
}

/** A GraphQL operation. */
export interface GraphQLOperation {
  /** Operation ID. */
  readonly id: string;
  /** Operation type: query, mutation, subscription. */
  readonly operationType: 'query' | 'mutation' | 'subscription';
  /** Operation name. */
  readonly name?: string;
  /** The full query/mutation string. */
  readonly query: string;
  /** Variables (if any). */
  readonly variables?: Record<string, unknown>;
  /** GraphQL endpoint URL. */
  readonly endpointUrl: string;
  /** Timestamp. */
  readonly timestamp: string;
  /** Page URL. */
  readonly pageUrl: string;
  /** Response status code. */
  readonly statusCode?: number;
  /** Whether the operation has fragments. */
  readonly hasFragments: boolean;
  /** Estimated depth of the query. */
  readonly queryDepth: number;
}

/** A WebSocket channel. */
export interface WebSocketChannel {
  /** Channel ID. */
  readonly id: string;
  /** WebSocket URL. */
  readonly url: string;
  /** Connection status. */
  readonly status: 'connecting' | 'open' | 'closing' | 'closed' | 'error';
  /** Messages sent. */
  readonly messagesSent: number;
  /** Messages received. */
  readonly messagesReceived: number;
  /** Connection timestamp. */
  readonly connectedAt: string;
  /** Disconnection timestamp. */
  readonly disconnectedAt?: string;
  /** Page URL. */
  readonly pageUrl: string;
  /** Protocols requested. */
  readonly protocols?: readonly string[];
  /** Sample messages (first N, truncated). */
  readonly sampleMessages: readonly { direction: 'sent' | 'received'; data: string; timestamp: string }[];
}

/** A Service Worker registration. */
export interface ServiceWorkerInfo {
  /** Script URL. */
  readonly scriptUrl: string;
  /** Scope. */
  readonly scope: string;
  /** State. */
  readonly state: 'installing' | 'installed' | 'activating' | 'activated' | 'redundant';
  /** Registration timestamp. */
  readonly registeredAt: string;
}

/** A console message captured. */
export interface ConsoleMessage {
  /** Message type (log, warn, error, info, debug). */
  readonly type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  /** Message text. */
  readonly text: string;
  /** URL of the script that produced the message. */
  readonly url?: string;
  /** Line number. */
  readonly line?: number;
  /** Column number. */
  readonly column?: number;
  /** Timestamp. */
  readonly timestamp: string;
  /** Page URL. */
  readonly pageUrl: string;
  /** Stack trace (for errors). */
  readonly stackTrace?: string;
}

/** A client-side error captured. */
export interface ClientSideError {
  /** Error message. */
  readonly message: string;
  /** Error name (e.g. TypeError, ReferenceError). */
  readonly errorName: string;
  /** URL of the script. */
  readonly url?: string;
  /** Line number. */
  readonly line?: number;
  /** Column number. */
  readonly column?: number;
  /** Timestamp. */
  readonly timestamp: string;
  /** Page URL. */
  readonly pageUrl: string;
  /** Stack trace. */
  readonly stackTrace?: string;
  /** Whether the error was uncaught. */
  readonly isUncaught: boolean;
}

/** Complete runtime intelligence data. */
export interface RuntimeIntelligenceData {
  /** All intercepted API calls. */
  readonly apiCalls: readonly RuntimeApiCall[];
  /** GraphQL operations. */
  readonly graphqlOperations: readonly GraphQLOperation[];
  /** WebSocket channels. */
  readonly webSocketChannels: readonly WebSocketChannel[];
  /** Service Worker registrations. */
  readonly serviceWorkers: readonly ServiceWorkerInfo[];
  /** Console messages. */
  readonly consoleMessages: readonly ConsoleMessage[];
  /** Client-side errors. */
  readonly clientErrors: readonly ClientSideError[];
  /** Runtime route patterns detected. */
  readonly runtimeRoutes: readonly string[];
  /** Total API calls intercepted. */
  readonly totalApiCalls: number;
  /** Unique API endpoints. */
  readonly uniqueEndpoints: number;
}

// ═══════════════════════════════════════════════════════════════
// Browser Artifact Types
// ═══════════════════════════════════════════════════════════════

/**
 * Browser-specific artifact sub-types.
 * These are used as the `key` prefix when publishing to Artifact Bus,
 * mapped to the nearest existing ArtifactCategory.
 */
export enum BrowserArtifactType {
  /** Browser session metadata. */
  BrowserSession = 'browser_session',
  /** Cookie data. */
  Cookies = 'cookies',
  /** JWT token data. */
  Jwt = 'jwt',
  /** DOM snapshot for a page. */
  DomSnapshot = 'dom_snapshot',
  /** Runtime API call. */
  RuntimeApi = 'runtime_api',
  /** GraphQL operation. */
  GraphQlOperation = 'graphql_operation',
  /** WebSocket channel. */
  WebSocketChannel = 'websocket_channel',
  /** Local storage entries. */
  LocalStorage = 'local_storage',
  /** Session storage entries. */
  SessionStorage = 'session_storage',
  /** Console message. */
  ConsoleMessage = 'console_message',
  /** Client-side error. */
  ClientError = 'client_error',
  /** Navigation event. */
  NavigationEvent = 'navigation_event',
  /** Route node. */
  RouteNode = 'route_node',
  /** Authentication result. */
  AuthResult = 'auth_result',
  /** Redirect chain. */
  RedirectChain = 'redirect_chain',
  /** Service worker. */
  ServiceWorker = 'service_worker',
  /** SPA framework detection. */
  SpaDetection = 'spa_detection',
  /** Form extraction. */
  FormExtraction = 'form_extraction',
  /** Iframe info. */
  IframeInfo = 'iframe_info',
  /** Shadow DOM host. */
  ShadowDomHost = 'shadow_dom_host',
  /** Custom element. */
  CustomElement = 'custom_element',
  /** Dynamic element. */
  DynamicElement = 'dynamic_element',
  /** Browser performance metrics. */
  PerformanceMetrics = 'performance_metrics',
}

// ═══════════════════════════════════════════════════════════════
// Browser Session & Recovery
// ═══════════════════════════════════════════════════════════════

/** Browser session state for recovery. */
export interface BrowserSessionState {
  /** Session ID. */
  readonly sessionId: string;
  /** Job ID. */
  readonly jobId: string;
  /** Target URL. */
  readonly targetUrl: string;
  /** Current phase. */
  readonly phase: BrowserPhase;
  /** URLs already visited. */
  readonly visitedUrls: readonly string[];
  /** URLs in the frontier. */
  readonly frontier: readonly string[];
  /** Current navigation depth. */
  readonly currentDepth: number;
  /** Session data collected so far. */
  readonly sessionData: Partial<BrowserIntelligenceData>;
  /** Timestamp of the snapshot. */
  readonly snapshotAt: string;
}

/** Browser intelligence scan phases. */
export enum BrowserPhase {
  Initializing = 'initializing',
  Navigating = 'navigating',
  Authenticating = 'authenticating',
  DomAnalysis = 'dom_analysis',
  RuntimeAnalysis = 'runtime_analysis',
  CollectingArtifacts = 'collecting_artifacts',
  Finalizing = 'finalizing',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

/** Aggregated browser intelligence data from a scan. */
export interface BrowserIntelligenceData {
  /** Navigation map. */
  readonly navigationMap: NavigationMap;
  /** Authentication result. */
  readonly authResult: AuthResult | null;
  /** DOM snapshots per page. */
  readonly domSnapshots: readonly DomSnapshot[];
  /** Runtime intelligence data. */
  readonly runtimeData: RuntimeIntelligenceData;
  /** Session info. */
  readonly sessionInfo: SessionInfo;
  /** Browser performance metrics. */
  readonly performanceMetrics: BrowserPerformanceMetrics;
}

/** Browser performance metrics. */
export interface BrowserPerformanceMetrics {
  /** Total browser launch time in ms. */
  readonly browserLaunchMs: number;
  /** Total navigation time across all pages in ms. */
  readonly totalNavigationMs: number;
  /** Average page load time in ms. */
  readonly avgPageLoadMs: number;
  /** Peak memory usage in MB. */
  readonly peakMemoryMb: number;
  /** Number of browser contexts created. */
  readonly contextsCreated: number;
  /** Number of pages opened. */
  readonly pagesOpened: number;
  /** Number of browser contexts reused. */
  readonly contextsReused: number;
  /** Total requests intercepted. */
  readonly totalRequestsIntercepted: number;
  /** Total duration in ms. */
  readonly totalDurationMs: number;
}

// ═══════════════════════════════════════════════════════════════
// Browser Abstraction Interfaces (for testability)
// ═══════════════════════════════════════════════════════════════

/** Abstraction over a Playwright Browser instance. */
export interface IBrowserController {
  /** Close the browser. */
  close(): Promise<void>;
  /** Create a new browser context. */
  newContext(options?: Record<string, unknown>): Promise<IBrowserContextController>;
  /** Check if the browser is connected. */
  isConnected(): boolean;
  /** Get the browser type. */
  getBrowserType(): BrowserType;
}

/** Abstraction over a Playwright BrowserContext. */
export interface IBrowserContextController {
  /** Create a new page. */
  newPage(): Promise<IPageController>;
  /** Get all cookies. */
  cookies(): Promise<AuthCookie[]>;
  /** Add cookies. */
  addCookies(cookies: readonly AuthCookie[]): Promise<void>;
  /** Get local storage. */
  localStorage(): Promise<readonly StorageEntry[]>;
  /** Get session storage. */
  sessionStorage(): Promise<readonly StorageEntry[]>;
  /** Close the context. */
  close(): Promise<void>;
  /** Get the context ID. */
  getId(): string;
}

/** Abstraction over a Playwright Page. */
export interface IPageController {
  /** Navigate to a URL. */
  goto(url: string, options?: Record<string, unknown>): Promise<NavigationResult>;
  /** Get the current URL. */
  url(): string;
  /** Get the page title. */
  title(): Promise<string>;
  /** Get page content (HTML). */
  content(): Promise<string>;
  /** Execute JavaScript in the page. */
  evaluate<T>(fn: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
  /** Close the page. */
  close(): Promise<void>;
  /** Click an element. */
  click(selector: string, options?: Record<string, unknown>): Promise<void>;
  /** Fill an input. */
  fill(selector: string, value: string): Promise<void>;
  /** Type text into an element. */
  type(selector: string, text: string, options?: Record<string, unknown>): Promise<void>;
  /** Wait for navigation. */
  waitForNavigation(options?: Record<string, unknown>): Promise<NavigationResult>;
  /** Wait for a selector. */
  waitForSelector(selector: string, options?: Record<string, unknown>): Promise<IElementHandle | null>;
  /** Query all elements. */
  querySelectorAll(selector: string): Promise<IElementHandle[]>;
  /** Query a single element. */
  querySelector(selector: string): Promise<IElementHandle | null>;
  /** Set viewport size. */
  setViewportSize(width: number, height: number): Promise<void>;
  /** Get viewport size. */
  viewportSize(): { width: number; height: number } | null;
  /** Register a console message handler. */
  onConsoleMessage(handler: (msg: ConsoleMessage) => void): () => void;
  /** Register a page error handler. */
  onPageError(handler: (err: ClientSideError) => void): () => void;
  /** Register a request handler. */
  onRequest(handler: (request: RuntimeApiCall) => void): () => void;
  /** Register a response handler. */
  onResponse(handler: (call: RuntimeApiCall) => void): () => void;
  /** Get all frames. */
  frames(): IFrameInfo[];
  /** Take a screenshot (returns base64). */
  screenshot(): Promise<string>;
  /** Check if the page is closed. */
  isClosed(): boolean;
}

/** Result of a navigation. */
export interface NavigationResult {
  readonly url: string;
  readonly status: number | null;
}

/** Abstraction over a Playwright ElementHandle. */
export interface IElementHandle {
  /** Get an attribute. */
  getAttribute(name: string): Promise<string | null>;
  /** Get the inner HTML. */
  innerHTML(): Promise<string>;
  /** Get the outer HTML. */
  outerHTML(): Promise<string>;
  /** Get the text content. */
  textContent(): Promise<string | null>;
  /** Get the tag name. */
  tagName(): Promise<string>;
  /** Evaluate in the context of this element. */
  evaluate<T>(fn: string | ((el: unknown, ...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
  /** Query a child. */
  querySelector(selector: string): Promise<IElementHandle | null>;
  /** Query all children. */
  querySelectorAll(selector: string): Promise<IElementHandle[]>;
}

/** Abstraction over a Playwright Frame. */
export interface IFrameInfo {
  readonly url: string;
  readonly name: string;
}