/**
 * Discovery Engine — Type Definitions
 *
 * All data structures used by the Discovery Engine (Katana integration).
 * Pure types — zero dependencies on infrastructure.
 *
 * Categories:
 * - DiscoveredUrl: a URL with metadata
 * - DiscoveredForm: an HTML form
 * - DiscoveredEndpoint: an API/GraphQL/WebSocket endpoint
 * - DiscoveredJsFile: a JavaScript asset
 * - DiscoveredParameter: a query/path/body parameter
 * - DiscoveredRobotsEntry: a robots.txt rule
 * - DiscoveredSitemapEntry: a sitemap.xml entry
 * - DiscoveredTechnology: a technology detection
 * - DiscoveryResult: aggregated output
 * - DiscoverySnapshot: for persistence/resume
 */

// ─── URL ─────────────────────────────────────────────────────

export type UrlSource =
  | 'robots_txt'
  | 'sitemap'
  | 'html_link'
  | 'html_a'
  | 'html_src'
  | 'javascript'
  | 'api_response'
  | 'form_action'
  | 'redirect'
  | 'headless_navigation';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'WEBSOCKET' | 'GRAPHQL';

export interface DiscoveredUrl {
  /** The full URL. */
  readonly url: string;
  /** Normalized URL (lowercase scheme+host, sorted params, removed fragment). */
  readonly normalizedUrl: string;
  /** HTTP method observed or inferred. */
  readonly method: HttpMethod;
  /** How this URL was discovered. */
  readonly source: UrlSource;
  /** Depth at which this URL was found (0 = seed). */
  readonly depth: number;
  /** Content-Type header from response (if fetched). */
  readonly contentType?: string;
  /** HTTP status code from response (if fetched). */
  readonly statusCode?: number;
  /** Page title (if HTML and fetched). */
  readonly title?: string;
}

// ─── Form ────────────────────────────────────────────────────

export interface FormInput {
  /** Input name attribute. */
  readonly name: string;
  /** Input type (text, password, hidden, email, file, etc.). */
  readonly type: string;
  /** Whether the field is required. */
  readonly required: boolean;
  /** Pre-filled value (for hidden fields). */
  readonly value?: string;
  /** ID attribute. */
  readonly id?: string;
  /** Placeholder text. */
  readonly placeholder?: string;
}

export interface DiscoveredForm {
  /** Form action URL. */
  readonly action: string;
  /** Form method. */
  readonly method: 'GET' | 'POST';
  /** Input fields. */
  readonly inputs: readonly FormInput[];
  /** Whether form has file upload. */
  readonly hasFileUpload: boolean;
  /** Whether form has CAPTCHA. */
  readonly hasCaptcha: boolean;
  /** Page URL where form was found. */
  readonly pageUrl: string;
  /** Form ID attribute. */
  readonly formId?: string;
  /** How the form was discovered. */
  readonly source: UrlSource;
}

// ─── Endpoint ────────────────────────────────────────────────

export type EndpointType = 'rest' | 'graphql' | 'websocket' | 'soap' | 'grpc';

export interface DiscoveredEndpoint {
  /** Full URL. */
  readonly url: string;
  /** HTTP method. */
  readonly method: HttpMethod;
  /** Endpoint classification. */
  readonly type: EndpointType;
  /** Content-Type (for REST: application/json, etc.). */
  readonly contentType?: string;
  /** Detected from OpenAPI/Swagger spec. */
  readonly isOpenapi?: boolean;
  /** GraphQL endpoint URL (if type === 'graphql'). */
  readonly graphqlSchemaUrl?: string;
  /** Source page URL. */
  readonly sourceUrl: string;
  /** How the endpoint was discovered. */
  readonly source: UrlSource;
}

// ─── JavaScript Asset ────────────────────────────────────────

export type JsAssetType = 'bundle' | 'library' | 'framework' | 'analytics' | 'tracker' | 'widget' | 'unknown';

export interface DiscoveredJsFile {
  /** Full URL to the JS file. */
  readonly url: string;
  /** Estimated size in bytes (from Content-Length header). */
  readonly sizeBytes?: number;
  /** Whether the file is minified. */
  readonly isMinified?: boolean;
  /** Detected type of JS asset. */
  readonly assetType: JsAssetType;
  /** Source page URL. */
  readonly sourceUrl: string;
  /** SHA-256 hash (if computed). */
  readonly hash?: string;
}

// ─── Parameter ───────────────────────────────────────────────

export type ParameterLocation = 'query' | 'path' | 'body' | 'header' | 'cookie';

export interface DiscoveredParameter {
  /** Parameter name. */
  readonly name: string;
  /** Where the parameter appears. */
  readonly location: ParameterLocation;
  /** URL or endpoint where parameter was found. */
  readonly url: string;
  /** Observed or example value. */
  readonly value?: string;
  /** Inferred type (string, number, boolean, array, object). */
  readonly inferredType?: string;
  /** Whether the parameter appears in multiple URLs (common pattern). */
  readonly isCommon: boolean;
}

// ─── Robots.txt ──────────────────────────────────────────────

export type RobotsDirective = 'Allow' | 'Disallow' | 'Sitemap' | 'User-Agent' | 'Crawl-Delay';

export interface DiscoveredRobotsEntry {
  /** The directive type. */
  readonly directive: RobotsDirective;
  /** The path or value. */
  readonly value: string;
  /** User-agent this applies to ('*' = all). */
  readonly userAgent: string;
}

// ─── Sitemap ─────────────────────────────────────────────────

export interface DiscoveredSitemapEntry {
  /** URL from sitemap. */
  readonly url: string;
  /** Last modification date if provided. */
  readonly lastmod?: string;
  /** Change frequency hint. */
  readonly changefreq?: string;
  /** Priority hint (0.0 - 1.0). */
  readonly priority?: number;
}

// ─── Technology ──────────────────────────────────────────────

export type TechnologyCategory =
  | 'server'
  | 'framework'
  | 'language'
  | 'cms'
  | 'cdn'
  | 'waf'
  | 'analytics'
  | 'database'
  | 'os'
  | 'library'
  | 'javascript_framework'
  | 'tag_manager'
  | 'unknown';

export interface DiscoveredTechnology {
  /** Technology name (e.g. "React", "nginx", "Express"). */
  readonly name: string;
  /** Version string (e.g. "18.2"). */
  readonly version?: string;
  /** Technology category. */
  readonly category: TechnologyCategory;
  /** Confidence 0.0 - 1.0. */
  readonly confidence: number;
  /** Evidence string (e.g. the header or meta tag value). */
  readonly evidence?: string;
}

// ─── External Domain ─────────────────────────────────────────

export interface DiscoveredExternalDomain {
  /** Domain name. */
  readonly domain: string;
  /** URLs referencing this domain. */
  readonly referencedFrom: readonly string[];
  /** Resource types loaded from this domain. */
  readonly resourceTypes: readonly string[];
}

// ─── Static Resource ─────────────────────────────────────────

export type StaticResourceType =
  | 'image'
  | 'font'
  | 'stylesheet'
  | 'video'
  | 'audio'
  | 'document'
  | 'favicon'
  | 'other';

export interface DiscoveredStaticResource {
  /** Full URL. */
  readonly url: string;
  /** Resource type classification. */
  readonly type: StaticResourceType;
  /** File extension. */
  readonly extension: string;
  /** Source page URL. */
  readonly sourceUrl: string;
}

// ─── Discovery Snapshot (Recovery) ───────────────────────────

export interface DiscoverySnapshot {
  /** Snapshot version for compatibility. */
  readonly version: number;
  /** Pipeline/scan job ID. */
  readonly jobId: string;
  /** Target URL. */
  readonly targetUrl: string;
  /** Timestamp when snapshot was taken. */
  readonly createdAt: string;
  /** URLs already processed. */
  readonly processedUrls: readonly string[];
  /** URLs in the frontier (pending). */
  readonly frontierUrls: readonly string[];
  /** Total URLs discovered so far. */
  readonly totalDiscovered: number;
  /** Current depth being crawled. */
  readonly currentDepth: number;
}

// ─── Discovery Statistics ────────────────────────────────────

export interface DiscoveryStats {
  readonly urlsTotal: number;
  readonly formsTotal: number;
  readonly endpointsTotal: number;
  readonly jsFilesTotal: number;
  readonly parametersTotal: number;
  readonly technologiesTotal: number;
  readonly robotsEntriesTotal: number;
  readonly sitemapEntriesTotal: number;
  readonly externalDomainsTotal: number;
  readonly staticResourcesTotal: number;
  readonly requestsMade: number;
  readonly durationMs: number;
  readonly depthsReached: number;
  readonly dedupRatio: number;
}

// ─── Discovery Result ────────────────────────────────────────

export interface DiscoveryResult {
  readonly urls: readonly DiscoveredUrl[];
  readonly forms: readonly DiscoveredForm[];
  readonly endpoints: readonly DiscoveredEndpoint[];
  readonly jsFiles: readonly DiscoveredJsFile[];
  readonly parameters: readonly DiscoveredParameter[];
  readonly technologies: readonly DiscoveredTechnology[];
  readonly robotsEntries: readonly DiscoveredRobotsEntry[];
  readonly sitemapEntries: readonly DiscoveredSitemapEntry[];
  readonly externalDomains: readonly DiscoveredExternalDomain[];
  readonly staticResources: readonly DiscoveredStaticResource[];
  readonly stats: DiscoveryStats;
}

// ─── Scope Rule ──────────────────────────────────────────────

export type ScopeRuleType = 'include' | 'exclude';
export type ScopeMatchType = 'glob' | 'regex' | 'exact' | 'wildcard' | 'hostname' | 'extension';

export interface ScopeRule {
  readonly type: ScopeRuleType;
  readonly matchType: ScopeMatchType;
  /** The pattern (glob, regex, or exact value). */
  readonly pattern: string;
  /** Compiled RegExp (internal use). */
  readonly regex?: RegExp;
}

// ─── Katana CLI Output Types ─────────────────────────────────

export interface KatanaOutputRow {
  /** The discovered URL. */
  readonly url: string;
  /** Source of the URL. */
  readonly source: string;
  /** HTTP method. */
  readonly method?: string;
  /** Tag/attribute. */
  readonly tag?: string;
  /** Attribute value. */
  readonly attribute?: string;
  /** Content-Type. */
  readonly content_type?: string;
  /** HTTP status code. */
  readonly status_code?: number;
  /** Content length. */
  readonly content_length?: number;
  /** Path from the response. */
  readonly path?: string;
  /** The raw HTTP request. */
  readonly request?: string;
  /** The raw HTTP response. */
  readonly response?: string;
}

export interface KatanaVersionInfo {
  readonly version: string;
  readonly raw: string;
}