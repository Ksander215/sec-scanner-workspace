export { KatanaAdapter } from './katana-adapter.ts';
export type { DiscoveryAdapterConfig } from './katana-adapter.ts';
export { AttackSurface, createEmptyAttackSurface } from './attack-surface.ts';
export { ScopeManager, DEFAULT_DISCOVERY_SCOPE } from './scope-manager.ts';
export type { DiscoveryScopeConfig, ScopeRule } from './scope-manager.ts';
export {
  includeGlob, excludeGlob,
  includeRegex, excludeRegex,
  includeExact, excludeExact,
  includeWildcard, excludeWildcard,
  excludeExtension,
} from './scope-manager.ts';
export {
  parseHtml, parseRobotsTxt, parseSitemapXml,
  detectTechnologiesFromHeaders, detectTechnologiesFromMeta,
  extractEndpointsFromJs, extractParameters,
  classifyExternalDomains, classifyStaticResource, classifyJsAsset,
  normalizeUrl, resolveUrl, getHostname, isExternalUrl,
} from './response-parser.ts';
export { createDiscoveryStageHandler } from './stage-handler.ts';
export type { DiscoveryStageHandlerConfig } from './stage-handler.ts';
export { DefaultFetcher, MockFetcher, TokenBucketRateLimiter, Semaphore } from './http-fetcher.ts';
export type { HttpClient, FetchResponse, FetchOptions, MockResponse } from './http-fetcher.ts';
export type {
  DiscoveredUrl, DiscoveredForm, DiscoveredEndpoint, DiscoveredJsFile,
  DiscoveredParameter, DiscoveredTechnology, DiscoveredRobotsEntry,
  DiscoveredSitemapEntry, DiscoveredExternalDomain, DiscoveredStaticResource,
  DiscoverySnapshot, DiscoveryStats, DiscoveryResult,
  ScopeRuleType, ScopeMatchType,
  UrlSource, HttpMethod, EndpointType, JsAssetType, StaticResourceType,
  TechnologyCategory, FormInput,
  KatanaOutputRow, KatanaVersionInfo,
} from './discovery-types.ts';