/**
 * Browser Intelligence Engine — Barrel Exports
 *
 * Public API for the Browser Intelligence module.
 * Designed as a standalone, product-grade module.
 *
 * Architecture:
 *   BrowserIntelligenceAdapter (ScanEnginePlugin)
 *   ├── NavigationIntelligence
 *   ├── AuthenticationIntelligence (Strategy Pattern)
 *   │   ├── LoginFormStrategy
 *   │   ├── JwtStrategy
 *   │   ├── CookieStrategy
 *   │   ├── CsrfDetectionStrategy
 *   │   ├── OAuthStrategy (architectural)
 *   │   ├── OpenIdConnectStrategy (architectural)
 *   │   └── MfaExtensionPoint
 *   ├── DomSnapshotEngine
 *   ├── RuntimeIntelligence
 *   ├── BrowserArtifactPublisher
 *   └── BrowserContextManager
 */

// ─── Core Adapter ────────────────────────────────────────────
export { BrowserIntelligenceAdapter } from './browser-adapter.ts';
export type { BrowserIntelligenceAdapterConfig } from './browser-adapter.ts';

// ─── Types ───────────────────────────────────────────────────
export {
  BrowserType,
  BrowserMode,
  BrowserPhase,
  BrowserAuthMethod,
  BrowserArtifactType,
} from './browser-types.ts';

export type {
  BrowserAdapterConfig,
  NavigationEvent,
  NavigationMap,
  NavigationResult,
  NavigationTrigger,
  RouteNode,
  RouteType,
  RedirectChain,
  AuthResult,
  AuthCookie,
  StorageEntry,
  SessionInfo,
  FormElement,
  InputElement,
  ButtonElement,
  DynamicElement,
  ShadowDomHost,
  IframeInfo,
  CustomElement,
  DomSnapshot,
  RuntimeApiCall,
  RuntimeApiType,
  GraphQLOperation,
  WebSocketChannel,
  ServiceWorkerInfo,
  ConsoleMessage,
  ClientSideError,
  RuntimeIntelligenceData,
  BrowserIntelligenceData,
  BrowserPerformanceMetrics,
  BrowserSessionState,
  IBrowserController,
  IBrowserContextController,
  IPageController,
  IElementHandle,
  IFrameInfo,
  InputType,
} from './browser-types.ts';

// ─── Navigation Intelligence ─────────────────────────────────
export { NavigationIntelligence } from './navigation.ts';
export { normalizeNavigationUrl, isInScope, classifyRouteType, extractQueryParams } from './navigation.ts';
export type { NavigationConfig } from './navigation.ts';

// ─── Authentication Intelligence ─────────────────────────────
export {
  AuthenticationIntelligence,
  LoginFormStrategy,
  JwtStrategy,
  CookieStrategy,
  CsrfDetectionStrategy,
  OAuthStrategy,
  OpenIdConnectStrategy,
  MfaExtensionPoint,
} from './auth-strategies.ts';

export type {
  AuthStrategy,
  AuthContext,
  AuthDetectionResult,
  AuthIntelligenceConfig,
} from './auth-strategies.ts';

// ─── DOM Intelligence ────────────────────────────────────────
export { DomSnapshotEngine, DEFAULT_DOM_SNAPSHOT_CONFIG } from './dom-snapshot.ts';
export type { DomSnapshotConfig } from './dom-snapshot.ts';

// ─── Runtime Intelligence ────────────────────────────────────
export { RuntimeIntelligence, DEFAULT_RUNTIME_CONFIG } from './runtime-intelligence.ts';
export type { RuntimeConfig } from './runtime-intelligence.ts';

// ─── Artifacts ───────────────────────────────────────────────
export { BrowserArtifactPublisher, BROWSER_STAGE_ID, BROWSER_ENGINE_ID } from './browser-artifacts.ts';

// ─── Browser Context (lifecycle + mocks) ─────────────────────
export {
  BrowserContextManager,
  resolveBrowserConfig,
  MockPageController,
  MockBrowserContextController,
  MockBrowserController,
  MockElementHandle,
} from './browser-context.ts';