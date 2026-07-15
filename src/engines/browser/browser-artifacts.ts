/**
 * Browser Intelligence Engine — Browser Artifacts Publisher
 *
 * Maps browser intelligence data to Artifact Bus categories.
 * Uses existing ArtifactCategory enum values and differentiates
 * via the `key` field using BrowserArtifactType prefixes.
 *
 * No modifications to existing ArtifactCategory or ArtifactBus.
 */

import type {
  ArtifactBus,
  PipelineArtifact,
} from '../../domain/scan-platform/pipeline/types.ts';
import { ArtifactCategory } from '../../domain/scan-platform/pipeline/types.ts';
import type { ID, Timestamp } from '../../domain/scan-platform/types/index.ts';
import {
  BrowserArtifactType,
  AuthResult,
  AuthCookie,
  DomSnapshot,
  GraphQLOperation,
  WebSocketChannel,
  ConsoleMessage,
  ClientSideError,
  NavigationEvent,
  RouteNode,
  RedirectChain,
  RuntimeApiCall,
  ServiceWorkerInfo,
  StorageEntry,
  SessionInfo,
  BrowserPerformanceMetrics,
} from './browser-types.ts';

// ═══════════════════════════════════════════════════════════════
// Artifact Category Mapping
// ═══════════════════════════════════════════════════════════════

/**
 * Maps BrowserArtifactType to the nearest existing ArtifactCategory.
 * Browser-specific sub-types are encoded in the artifact key.
 */
function mapToArtifactCategory(browserType: BrowserArtifactType): ArtifactCategory {
  switch (browserType) {
    case BrowserArtifactType.Cookies:
    case BrowserArtifactType.BrowserSession:
      return ArtifactCategory.Cookies;
    case BrowserArtifactType.Jwt:
    case BrowserArtifactType.AuthResult:
      return ArtifactCategory.AuthSession;
    case BrowserArtifactType.DomSnapshot:
    case BrowserArtifactType.FormExtraction:
    case BrowserArtifactType.IframeInfo:
    case BrowserArtifactType.ShadowDomHost:
    case BrowserArtifactType.CustomElement:
    case BrowserArtifactType.DynamicElement:
      return ArtifactCategory.Metadata;
    case BrowserArtifactType.RuntimeApi:
    case BrowserArtifactType.GraphQlOperation:
    case BrowserArtifactType.WebSocketChannel:
    case BrowserArtifactType.ServiceWorker:
      return ArtifactCategory.Endpoints;
    case BrowserArtifactType.LocalStorage:
    case BrowserArtifactType.SessionStorage:
      return ArtifactCategory.Storage;
    case BrowserArtifactType.ConsoleMessage:
    case BrowserArtifactType.ClientError:
    case BrowserArtifactType.PerformanceMetrics:
    case BrowserArtifactType.NavigationEvent:
    case BrowserArtifactType.RouteNode:
    case BrowserArtifactType.RedirectChain:
    case BrowserArtifactType.SpaDetection:
      return ArtifactCategory.Metadata;
    default:
      return ArtifactCategory.Metadata;
  }
}

// ═══════════════════════════════════════════════════════════════
// Browser Artifact Publisher
// ═══════════════════════════════════════════════════════════════

/** Stage ID used for all browser artifacts. */
export const BROWSER_STAGE_ID = 'browser_intelligence';

/** Source engine identifier. */
export const BROWSER_ENGINE_ID = 'browser-intelligence';

/**
 * Publishes browser intelligence data as pipeline artifacts.
 *
 * Each publish call creates one PipelineArtifact with:
 * - category: nearest existing ArtifactCategory
 * - key: "{BrowserArtifactType}:{unique-identifier}"
 * - value: the browser-specific data
 * - stageId: BROWSER_STAGE_ID
 * - sourceEngine: BROWSER_ENGINE_ID
 */
export class BrowserArtifactPublisher {
  private readonly artifactBus: ArtifactBus;
  private readonly stageId: string;
  private readonly sourceEngine: string;
  private idCounter = 0;

  constructor(
    artifactBus: ArtifactBus,
    stageId: string = BROWSER_STAGE_ID,
    sourceEngine: string = BROWSER_ENGINE_ID,
  ) {
    this.artifactBus = artifactBus;
    this.stageId = stageId;
    this.sourceEngine = sourceEngine;
  }

  /** Get total artifacts published. */
  get publishedCount(): number {
    return this.idCounter;
  }

  // ─── Session Artifacts ────────────────────────────────────

  publishSession(session: SessionInfo): PipelineArtifact {
    return this.publish(BrowserArtifactType.BrowserSession, 'session', session);
  }

  // ─── Authentication Artifacts ─────────────────────────────

  publishAuthResult(auth: AuthResult): PipelineArtifact {
    return this.publish(BrowserArtifactType.AuthResult, 'auth_result', auth);
  }

  publishCookies(cookies: readonly AuthCookie[]): PipelineArtifact {
    return this.publish(BrowserArtifactType.Cookies, 'all_cookies', cookies);
  }

  publishJwt(jwtData: { token?: string; payload?: Record<string, unknown>; header?: Record<string, unknown>; expiresAt?: string }): PipelineArtifact {
    return this.publish(BrowserArtifactType.Jwt, 'jwt_data', jwtData);
  }

  // ─── DOM Artifacts ────────────────────────────────────────

  publishDomSnapshot(snapshot: DomSnapshot): PipelineArtifact {
    return this.publish(BrowserArtifactType.DomSnapshot, `page:${snapshot.pageUrl}`, snapshot);
  }

  // ─── Runtime Artifacts ────────────────────────────────────

  publishRuntimeApiCall(call: RuntimeApiCall): PipelineArtifact {
    return this.publish(BrowserArtifactType.RuntimeApi, call.id, call);
  }

  publishGraphQLOperation(op: GraphQLOperation): PipelineArtifact {
    return this.publish(BrowserArtifactType.GraphQlOperation, op.id, op);
  }

  publishWebSocketChannel(channel: WebSocketChannel): PipelineArtifact {
    return this.publish(BrowserArtifactType.WebSocketChannel, channel.id, channel);
  }

  publishServiceWorker(sw: ServiceWorkerInfo): PipelineArtifact {
    return this.publish(BrowserArtifactType.ServiceWorker, `sw:${sw.scriptUrl}`, sw);
  }

  // ─── Storage Artifacts ────────────────────────────────────

  publishLocalStorage(entries: readonly StorageEntry[]): PipelineArtifact {
    return this.publish(BrowserArtifactType.LocalStorage, 'local_storage', entries);
  }

  publishSessionStorage(entries: readonly StorageEntry[]): PipelineArtifact {
    return this.publish(BrowserArtifactType.SessionStorage, 'session_storage', entries);
  }

  // ─── Console & Error Artifacts ────────────────────────────

  publishConsoleMessage(msg: ConsoleMessage, index: number): PipelineArtifact {
    return this.publish(BrowserArtifactType.ConsoleMessage, `msg:${index}`, msg);
  }

  publishClientError(err: ClientSideError, index: number): PipelineArtifact {
    return this.publish(BrowserArtifactType.ClientError, `error:${index}`, err);
  }

  // ─── Navigation Artifacts ─────────────────────────────────

  publishNavigationEvent(event: NavigationEvent, index: number): PipelineArtifact {
    return this.publish(BrowserArtifactType.NavigationEvent, `nav:${index}`, event);
  }

  publishRouteNode(node: RouteNode): PipelineArtifact {
    const key = `route:${node.path}`;
    return this.publish(BrowserArtifactType.RouteNode, key, node);
  }

  publishRedirectChain(chain: RedirectChain, index: number): PipelineArtifact {
    return this.publish(BrowserArtifactType.RedirectChain, `redirect:${index}`, chain);
  }

  publishSpaDetection(data: { isSpa: boolean; framework?: string; pageUrl: string }): PipelineArtifact {
    return this.publish(BrowserArtifactType.SpaDetection, `spa:${data.pageUrl}`, data);
  }

  // ─── Performance Artifacts ────────────────────────────────

  publishPerformanceMetrics(metrics: BrowserPerformanceMetrics): PipelineArtifact {
    return this.publish(BrowserArtifactType.PerformanceMetrics, 'performance', metrics);
  }

  // ─── Bulk Publishing ──────────────────────────────────────

  /**
   * Publish all artifacts from a complete browser intelligence run.
   */
  publishAll(data: {
    sessionInfo: SessionInfo;
    authResult: AuthResult | null;
    domSnapshots: readonly DomSnapshot[];
    apiCalls: readonly RuntimeApiCall[];
    graphqlOperations: readonly GraphQLOperation[];
    webSocketChannels: readonly WebSocketChannel[];
    serviceWorkers: readonly ServiceWorkerInfo[];
    consoleMessages: readonly ConsoleMessage[];
    clientErrors: readonly ClientSideError[];
    navigationEvents: readonly NavigationEvent[];
    routes: readonly RouteNode[];
    redirectChains: readonly RedirectChain[];
    cookies: readonly AuthCookie[];
    localStorage: readonly StorageEntry[];
    sessionStorage: readonly StorageEntry[];
    performanceMetrics: BrowserPerformanceMetrics;
  }): { published: number; categories: Record<string, number> } {
    const categories: Record<string, number> = {};
    let count = 0;

    const inc = (cat: string) => { categories[cat] = (categories[cat] ?? 0) + 1; count++; };

    // Session
    this.publishSession(data.sessionInfo);
    inc('session');

    // Auth
    if (data.authResult) {
      this.publishAuthResult(data.authResult);
      inc('auth');
    }

    // Cookies
    if (data.cookies.length > 0) {
      this.publishCookies(data.cookies);
      inc('cookies');
    }

    // JWT
    if (data.authResult?.sessionToken) {
      this.publishJwt({
        token: data.authResult.sessionToken,
        payload: data.authResult.jwtPayload,
        header: data.authResult.jwtHeader,
        expiresAt: data.authResult.jwtExpiresAt,
      });
      inc('jwt');
    }

    // Storage
    if (data.localStorage.length > 0) {
      this.publishLocalStorage(data.localStorage);
      inc('storage');
    }
    if (data.sessionStorage.length > 0) {
      this.publishSessionStorage(data.sessionStorage);
      inc('storage');
    }

    // DOM
    for (const snapshot of data.domSnapshots) {
      this.publishDomSnapshot(snapshot);
      inc('dom');
    }

    // API calls
    for (const call of data.apiCalls) {
      this.publishRuntimeApiCall(call);
      inc('api');
    }

    // GraphQL
    for (const op of data.graphqlOperations) {
      this.publishGraphQLOperation(op);
      inc('graphql');
    }

    // WebSocket
    for (const ws of data.webSocketChannels) {
      this.publishWebSocketChannel(ws);
      inc('websocket');
    }

    // Service Workers
    for (const sw of data.serviceWorkers) {
      this.publishServiceWorker(sw);
      inc('sw');
    }

    // Console & Errors
    for (let i = 0; i < data.consoleMessages.length; i++) {
      this.publishConsoleMessage(data.consoleMessages[i], i);
      inc('console');
    }
    for (let i = 0; i < data.clientErrors.length; i++) {
      this.publishClientError(data.clientErrors[i], i);
      inc('errors');
    }

    // Navigation
    for (let i = 0; i < data.navigationEvents.length; i++) {
      this.publishNavigationEvent(data.navigationEvents[i], i);
      inc('navigation');
    }
    for (const route of data.routes) {
      this.publishRouteNode(route);
      inc('routes');
    }
    for (let i = 0; i < data.redirectChains.length; i++) {
      this.publishRedirectChain(data.redirectChains[i], i);
      inc('redirects');
    }

    // Performance
    this.publishPerformanceMetrics(data.performanceMetrics);
    inc('performance');

    return { published: count, categories };
  }

  // ─── Internal Publish ─────────────────────────────────────

  private publish(type: BrowserArtifactType, key: string, value: unknown): PipelineArtifact {
    this.idCounter++;
    const artifactKey = `${type}:${key}`;
    const category = mapToArtifactCategory(type);

    return this.artifactBus.publish({
      category,
      stageId: this.stageId,
      key: artifactKey,
      value,
      sourceEngine: this.sourceEngine,
    });
  }
}