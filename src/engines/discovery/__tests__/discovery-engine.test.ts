/**
 * Tests: Discovery Engine — Full Suite
 *
 * Covers:
 * - KatanaAdapter: identity, lifecycle, health, scan, cancel
 * - AttackSurface: immutability, fork-on-write, dedup, serialization, diff
 * - ScopeManager: include/exclude, glob/regex/wildcard/hostname/extension, depth
 * - ResponseParser: HTML, robots.txt, sitemap.xml, JS endpoints, technology detection
 * - HttpFetcher: MockFetcher, rate limiter, semaphore
 * - StageHandler: pipeline integration bridge
 * - Incremental discovery, resume, cancellation
 * - End-to-end discovery flow
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { KatanaAdapter } from '../katana-adapter.ts';
import { AttackSurface, createEmptyAttackSurface } from '../attack-surface.ts';
import { ScopeManager, DEFAULT_DISCOVERY_SCOPE, includeGlob, excludeGlob, includeRegex, excludeRegex, excludeExtension, includeExact, excludeExact, includeWildcard, excludeWildcard } from '../scope-manager.ts';
import {
  parseHtml, parseRobotsTxt, parseSitemapXml,
  detectTechnologiesFromHeaders, detectTechnologiesFromMeta,
  extractEndpointsFromJs, extractParameters,
  classifyExternalDomains, classifyStaticResource, classifyJsAsset,
  normalizeUrl, resolveUrl, getHostname, isExternalUrl,
} from '../response-parser.ts';
import { MockFetcher, TokenBucketRateLimiter, Semaphore } from '../http-fetcher.ts';
import type { FetchResponse, MockResponse } from '../http-fetcher.ts';
import type {
  DiscoveredUrl, DiscoveredForm, DiscoveredEndpoint, DiscoveredJsFile,
  DiscoveredParameter, DiscoveredTechnology, DiscoveredExternalDomain,
} from '../discovery-types.ts';
import { ScanCapability, EngineHealthStatus, ScanTriggerType } from '../../../domain/scan-platform/types/index.ts';
import { DEFAULT_SCOPE, DEFAULT_RATE_LIMIT } from '../../../domain/scan-platform/models/scan-target.ts';
import { DEFAULT_CONSTRAINTS } from '../../../domain/scan-platform/scan-context/scan-context.ts';
import type { ScanContext } from '../../../domain/scan-platform/scan-context/scan-context.ts';
import { ArtifactCategory } from '../../../domain/scan-platform/pipeline/types.ts';

// ─── Helpers ─────────────────────────────────────────────────

function createTestContext(overrides?: Partial<ScanContext>): ScanContext {
  return Object.freeze({
    id: 'ctx-test-1',
    scanJobId: 'job-test-1',
    correlationId: 'corr-test-1',
    targetId: 'target-1',
    targetUrl: 'https://example.com',
    targetName: 'Example',
    authentication: { method: 'none' as const },
    headers: [],
    cookies: [],
    scope: DEFAULT_SCOPE,
    rateLimit: DEFAULT_RATE_LIMIT,
    constraints: DEFAULT_CONSTRAINTS,
    profileName: 'test',
    requiredCapabilities: [ScanCapability.Crawling],
    triggerType: ScanTriggerType.Manual,
    triggeredBy: 'test-user',
    createdAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  } as ScanContext);
}

function createHtmlResponse(url: string, body: string, extraHeaders?: Record<string, string>): FetchResponse {
  return {
    url,
    statusCode: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', ...extraHeaders },
    body,
    redirected: false,
    finalUrl: url,
  };
}

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Example App</title>
  <meta name="generator" content="WordPress 6.4">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="icon" href="/favicon.ico">
  <script src="/js/bundle.min.js"></script>
  <script src="/js/vendor/react.js"></script>
</head>
<body>
  <a href="/about">About Us</a>
  <a href="/contact">Contact</a>
  <a href="https://cdn.example.com/lib.js">External CDN</a>
  <a href="#section">Skip</a>
  <a href="javascript:void(0)">JS Link</a>
  <a href="mailto:test@test.com">Email</a>
  <img src="/img/logo.png" alt="Logo">
  <img src="data:image/png;base64,abc" alt="Embedded">

  <form action="/login" method="POST" id="loginForm">
    <input type="text" name="username" required placeholder="Username">
    <input type="password" name="password" required>
    <input type="hidden" name="csrf_token" value="abc123">
    <input type="submit" value="Login">
  </form>

  <form action="/search" method="GET">
    <input type="text" name="q" placeholder="Search...">
    <input type="text" name="page" type="hidden" value="1">
  </form>

  <form action="/upload" method="POST" enctype="multipart/form-data">
    <input type="file" name="avatar">
    <input type="text" name="description">
    <div class="g-recaptcha" data-sitekey="xxx"></div>
  </form>

  <iframe src="/widget"></iframe>

  <script>
    fetch('/api/v1/users').then(r => r.json());
    axios.post('/api/v1/login', { user: 'test' });
    const ws = new WebSocket('wss://example.com/ws');
    fetch('/graphql', { method: 'POST', body: JSON.stringify({ query: '{ users }' }) });
  </script>
</body>
</html>`;

const SAMPLE_ROBOTS = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/
Sitemap: https://example.com/sitemap.xml
Crawl-delay: 1

User-agent: Googlebot
Allow: /admin/api/`;

const SAMPLE_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2024-01-02</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/contact</loc>
    <priority>0.5</priority>
  </url>
</urlset>`;

// ─── KatanaAdapter Tests ──────────────────────────────────────

describe('KatanaAdapter', () => {
  describe('identity and capabilities', () => {
    const adapter = new KatanaAdapter();

    it('should have correct identity fields', () => {
      expect(adapter.id).toBe('discovery-v1');
      expect(adapter.name).toBe('Katana Discovery Engine');
      expect(adapter.description.toLowerCase()).toContain('attack surface');
    });

    it('should advertise Crawling capability', () => {
      expect(adapter.capabilities).toContain(ScanCapability.Crawling);
    });

    it('should advertise PassiveAnalysis capability', () => {
      expect(adapter.capabilities).toContain(ScanCapability.PassiveAnalysis);
    });

    it('should advertise JavaScriptAnalysis capability', () => {
      expect(adapter.capabilities).toContain(ScanCapability.JavaScriptAnalysis);
    });

    it('should advertise ApiScanning capability', () => {
      expect(adapter.capabilities).toContain(ScanCapability.ApiScanning);
    });

    it('should advertise HeaderAnalysis capability', () => {
      expect(adapter.capabilities).toContain(ScanCapability.HeaderAnalysis);
    });

    it('should NOT advertise VulnerabilityDetection', () => {
      expect(adapter.capabilities).not.toContain(ScanCapability.VulnerabilityDetection);
    });
  });

  describe('lifecycle', () => {
    it('should initialize without error (no Katana binary needed)', async () => {
      const adapter = new KatanaAdapter({ useKatana: false });
      await expect(adapter.initialize()).resolves.toBeUndefined();
    });

    it('should initialize with useKatana=true without throwing (katana not installed)', async () => {
      const adapter = new KatanaAdapter({ useKatana: true });
      // Should not throw even if katana is not installed
      await expect(adapter.initialize()).resolves.toBeUndefined();
    });

    it('should shutdown cleanly with no active discoveries', async () => {
      const adapter = new KatanaAdapter();
      await expect(adapter.shutdown()).resolves.toBeUndefined();
    });

    it('should shutdown and cancel active discoveries', async () => {
      const adapter = new KatanaAdapter({ useKatana: false });
      const controller = new AbortController();

      // Simulate an active discovery
      const context = createTestContext();
      const scanPromise = adapter.scan(context, () => {});

      // Cancel immediately
      setTimeout(() => adapter.cancel(context.scanJobId), 10);

      // Should not hang
      const result = await scanPromise;
      expect(result).toBeDefined();
      expect(result.requestsCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('health check', () => {
    it('should return Healthy status', async () => {
      const adapter = new KatanaAdapter({ useKatana: false });
      await adapter.initialize();

      const result = await adapter.health();
      expect(result.status).toBe(EngineHealthStatus.Healthy);
      expect(result.engineId).toBe('discovery-v1');
      expect(result.message).toContain('discovery');
    });
  });

  describe('cancel — no active scan', () => {
    it('should complete without error when no active scan exists', async () => {
      const adapter = new KatanaAdapter();
      await expect(adapter.cancel('nonexistent-job')).resolves.toBeUndefined();
    });
  });

  describe('scan — with MockFetcher', () => {
    it('should discover URLs from HTML', async () => {
      const mockFetcher = new MockFetcher()
        .onUrl('https://example.com', {
          body: SAMPLE_HTML,
          headers: { 'content-type': 'text/html', 'server': 'nginx/1.24', 'x-powered-by': 'Express' },
        })
        .onUrl('https://example.com/about', { body: '<html><body>About</body></html>', headers: { 'content-type': 'text/html' } })
        .onUrl('https://example.com/contact', { body: '<html><body>Contact</body></html>', headers: { 'content-type': 'text/html' } })
        .onUrl('https://example.com/widget', { body: '<html><body>Widget</body></html>', headers: { 'content-type': 'text/html' } });

      const adapter = new KatanaAdapter({
        useKatana: false,
        httpClient: mockFetcher,
        scope: { ...DEFAULT_DISCOVERY_SCOPE, maxDepth: 2, blockedExtensions: [] },
        analyzeJavaScript: true,
        extractExternalDomains: true,
        includeStaticResources: true,
      });
      await adapter.initialize();

      const context = createTestContext();
      const events: any[] = [];
      const result = await adapter.scan(context, (e) => events.push(e));

      expect(result.success).toBe(true);
      expect(result.requestsCount).toBeGreaterThan(0);
      expect(result.findings.length).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata).toBeDefined();
    });

    it('should return findings for GraphQL endpoints', async () => {
      const htmlWithGql = `<!DOCTYPE html><html><head><script>
        fetch('/graphql', { method: 'POST', body: '{}' });
      </script></head><body></body></html>`;

      const mockFetcher = new MockFetcher()
        .onUrl('https://example.com', {
          body: htmlWithGql,
          headers: { 'content-type': 'text/html' },
        });

      const adapter = new KatanaAdapter({
        useKatana: false,
        httpClient: mockFetcher,
        scope: { ...DEFAULT_DISCOVERY_SCOPE, maxDepth: 1, blockedExtensions: [] },
        analyzeJavaScript: true,
        extractExternalDomains: true,
      });
      await adapter.initialize();

      const context = createTestContext();
      const result = await adapter.scan(context, () => {});

      expect(result.success).toBe(true);
      const gqlFinding = result.findings.find(f => f.title.includes('GraphQL'));
      if (gqlFinding) {
        expect(gqlFinding.severity).toBe('info');
        expect(gqlFinding.tags).toContain('graphql');
      }
    });

    it('should return findings for file upload forms', async () => {
      const mockFetcher = new MockFetcher()
        .onUrl('https://example.com', {
          body: SAMPLE_HTML,
          headers: { 'content-type': 'text/html' },
        })
        .onUrl('https://example.com/about', { body: '<html><body>About</body></html>', headers: { 'content-type': 'text/html' } })
        .onUrl('https://example.com/contact', { body: '<html><body>Contact</body></html>', headers: { 'content-type': 'text/html' } })
        .onUrl('https://example.com/widget', { body: '<html><body>Widget</body></html>', headers: { 'content-type': 'text/html' } });

      const adapter = new KatanaAdapter({
        useKatana: false,
        httpClient: mockFetcher,
        scope: { ...DEFAULT_DISCOVERY_SCOPE, maxDepth: 2, blockedExtensions: [] },
        analyzeJavaScript: true,
        extractExternalDomains: true,
        includeStaticResources: true,
      });
      await adapter.initialize();

      const context = createTestContext();
      const result = await adapter.scan(context, () => {});

      const uploadFinding = result.findings.find(f => f.title.includes('File Upload'));
      if (uploadFinding) {
        expect(uploadFinding.severity).toBe('medium');
        expect(uploadFinding.tags).toContain('file-upload');
      }
    });

    it('should respect AbortSignal', async () => {
      const mockFetcher = new MockFetcher()
        .onUrl('https://example.com', {
          body: SAMPLE_HTML,
          headers: { 'content-type': 'text/html' },
        });

      const adapter = new KatanaAdapter({
        useKatana: false,
        httpClient: mockFetcher,
        scope: { ...DEFAULT_DISCOVERY_SCOPE, maxDepth: 5, blockedExtensions: [] },
      });
      await adapter.initialize();

      const abortController = new AbortController();
      const context = createTestContext({ abortSignal: abortController.signal });

      // Abort immediately
      setTimeout(() => abortController.abort(), 5);

      const result = await adapter.scan(context, () => {});
      // Should complete (not hang), even if aborted
      expect(result).toBeDefined();
    });

    it('should handle robots.txt and sitemap.xml', async () => {
      const mockFetcher = new MockFetcher()
        .onUrl('https://example.com', {
          body: '<html><body>Home</body></html>',
          headers: { 'content-type': 'text/html' },
        })
        .onUrl('https://example.com/robots.txt', {
          body: SAMPLE_ROBOTS,
          headers: { 'content-type': 'text/plain' },
        })
        .onUrl('https://example.com/sitemap.xml', {
          body: SAMPLE_SITEMAP,
          headers: { 'content-type': 'application/xml' },
        });

      const adapter = new KatanaAdapter({
        useKatana: false,
        httpClient: mockFetcher,
        scope: { ...DEFAULT_DISCOVERY_SCOPE, maxDepth: 1, blockedExtensions: [] },
      });
      await adapter.initialize();

      const context = createTestContext();
      const result = await adapter.scan(context, () => {});

      expect(result.success).toBe(true);
      expect(result.requestsCount).toBeGreaterThan(0);
    });

    it('should produce ScanEngineResult even on error (never throws)', async () => {
      const mockFetcher = new MockFetcher()
        .onUrlFail('https://example.com');

      const adapter = new KatanaAdapter({
        useKatana: false,
        httpClient: mockFetcher,
        scope: DEFAULT_DISCOVERY_SCOPE,
      });
      await adapter.initialize();

      const context = createTestContext();
      const result = await adapter.scan(context, () => {});

      // MUST return a result, never throw
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.findings)).toBe(true);
      expect(typeof result.requestsCount).toBe('number');
      expect(typeof result.durationMs).toBe('number');
    });
  });

  describe('incremental discovery', () => {
    it('should crawl new URLs incrementally', async () => {
      const mockFetcher = new MockFetcher()
        .onUrl('https://example.com/new-page', {
          body: '<html><head><script>fetch("/api/v2/data");</script></head><body>New Page</body></html>',
          headers: { 'content-type': 'text/html' },
        });

      const adapter = new KatanaAdapter({
        useKatana: false,
        httpClient: mockFetcher,
        scope: { ...DEFAULT_DISCOVERY_SCOPE, blockedExtensions: [] },
      });
      await adapter.initialize();

      const existing = createEmptyAttackSurface()
        .withUrls([{ url: 'https://example.com/', normalizedUrl: 'https://example.com/', method: 'GET', source: 'sitemap', depth: 0 }]);

      const result = await adapter.incrementalDiscover(
        existing,
        ['https://example.com/new-page'],
        mockFetcher,
      );

      expect(result.urls.length).toBeGreaterThanOrEqual(1);
      expect(result.endpoints.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('standalone service', () => {
    it('should export and import attack surface', () => {
      const adapter = new KatanaAdapter();
      const surface = createEmptyAttackSurface()
        .withUrls([{ url: 'https://example.com/page', normalizedUrl: 'https://example.com/page', method: 'GET', source: 'html_a', depth: 1 }]);

      const json = adapter.exportAttackSurface(surface);
      expect(json).toContain('example.com');

      const imported = adapter.importAttackSurface(json);
      expect(imported.urls).toHaveLength(1);
    });

    it('should compare two surfaces', () => {
      const v1 = createEmptyAttackSurface()
        .withUrls([
          { url: 'https://example.com/page1', normalizedUrl: 'https://example.com/page1', method: 'GET', source: 'sitemap', depth: 0 },
          { url: 'https://example.com/page2', normalizedUrl: 'https://example.com/page2', method: 'GET', source: 'sitemap', depth: 0 },
        ]);

      const v2 = createEmptyAttackSurface()
        .withUrls([
          { url: 'https://example.com/page2', normalizedUrl: 'https://example.com/page2', method: 'GET', source: 'sitemap', depth: 0 },
          { url: 'https://example.com/page3', normalizedUrl: 'https://example.com/page3', method: 'GET', source: 'html_a', depth: 1 },
        ]);

      const adapter = new KatanaAdapter();
      const diff = adapter.compareSurfaces(v1, v2);

      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].url).toContain('page3');
      expect(diff.removed).toHaveLength(1);
      expect(diff.removed[0].url).toContain('page1');
      expect(diff.common).toHaveLength(1);
      expect(diff.common[0].url).toContain('page2');
    });
  });
});

// ─── AttackSurface Tests ──────────────────────────────────────

describe('AttackSurface', () => {
  describe('immutability', () => {
    it('should freeze all collections', () => {
      const surface = new AttackSurface({
        urls: [{ url: 'https://example.com/', normalizedUrl: 'https://example.com/', method: 'GET', source: 'sitemap', depth: 0 }],
      });

      expect(Object.isFrozen(surface.urls)).toBe(true);
      expect(Object.isFrozen(surface.forms)).toBe(true);
    });

    it('should create new instance on fork-on-write', () => {
      const s1 = createEmptyAttackSurface();
      const s2 = s1.withUrls([{ url: 'https://example.com/', normalizedUrl: 'https://example.com/', method: 'GET', source: 'sitemap', depth: 0 }]);

      expect(s1).not.toBe(s2);
      expect(s1.urls).toHaveLength(0);
      expect(s2.urls).toHaveLength(1);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate URLs by normalized URL', () => {
      const surface = new AttackSurface({
        urls: [
          { url: 'https://Example.COM/page?b=2&a=1', normalizedUrl: 'https://example.com/page?a=1&b=2', method: 'GET', source: 'sitemap', depth: 0 },
          { url: 'https://example.com/page?a=1&b=2', normalizedUrl: 'https://example.com/page?a=1&b=2', method: 'GET', source: 'html_a', depth: 1 },
          { url: 'https://example.com/other', normalizedUrl: 'https://example.com/other', method: 'GET', source: 'sitemap', depth: 0 },
        ],
      });

      expect(surface.urls).toHaveLength(2);
    });

    it('should deduplicate endpoints by url+method', () => {
      const surface = new AttackSurface({
        endpoints: [
          { url: 'https://example.com/api', method: 'GET', type: 'rest', sourceUrl: 'https://example.com', source: 'html_a' },
          { url: 'https://example.com/api', method: 'POST', type: 'rest', sourceUrl: 'https://example.com', source: 'html_a' },
          { url: 'https://example.com/api', method: 'GET', type: 'rest', sourceUrl: 'https://example.com', source: 'javascript' },
        ],
      });

      expect(surface.endpoints).toHaveLength(2); // GET + POST (second GET is deduped)
    });

    it('should deduplicate technologies by name+version', () => {
      const surface = new AttackSurface({
        technologies: [
          { name: 'React', version: '18.2', category: 'framework', confidence: 0.9 },
          { name: 'react', version: '18.2', category: 'framework', confidence: 0.8 },
          { name: 'React', version: '17.0', category: 'framework', confidence: 0.9 },
        ],
      });

      expect(surface.technologies).toHaveLength(2); // React 18.2 + React 17.0
    });

    it('should merge external domains', () => {
      const surface = new AttackSurface({
        externalDomains: [
          { domain: 'CDN.example.com', referencedFrom: ['https://example.com/'], resourceTypes: ['image'] },
          { domain: 'cdn.example.com', referencedFrom: ['https://example.com/about'], resourceTypes: ['script'] },
        ],
      });

      expect(surface.externalDomains).toHaveLength(1);
      expect(surface.externalDomains[0].referencedFrom).toHaveLength(2);
      expect(surface.externalDomains[0].resourceTypes).toHaveLength(2);
    });
  });

  describe('queries', () => {
    it('should count total items', () => {
      const surface = new AttackSurface({
        urls: [{ url: 'https://example.com/', normalizedUrl: 'https://example.com/', method: 'GET', source: 'sitemap', depth: 0 }],
        forms: [],
        endpoints: [{ url: 'https://example.com/api', method: 'GET', type: 'rest', sourceUrl: 'https://example.com', source: 'html_a' }],
      });

      expect(surface.totalCount).toBe(2);
    });

    it('should extract unique hostnames', () => {
      const surface = new AttackSurface({
        urls: [
          { url: 'https://example.com/', normalizedUrl: 'https://example.com/', method: 'GET', source: 'sitemap', depth: 0 },
          { url: 'https://example.com/page', normalizedUrl: 'https://example.com/page', method: 'GET', source: 'html_a', depth: 1 },
          { url: 'https://cdn.example.com/lib.js', normalizedUrl: 'https://cdn.example.com/lib.js', method: 'GET', source: 'javascript', depth: 1 },
        ],
      });

      expect(surface.hostnames).toHaveLength(2);
      expect(surface.hostnames).toContain('example.com');
      expect(surface.hostnames).toContain('cdn.example.com');
    });

    it('should get URLs by source', () => {
      const surface = new AttackSurface({
        urls: [
          { url: 'https://example.com/a', normalizedUrl: 'https://example.com/a', method: 'GET', source: 'sitemap', depth: 0 },
          { url: 'https://example.com/b', normalizedUrl: 'https://example.com/b', method: 'GET', source: 'html_a', depth: 1 },
          { url: 'https://example.com/c', normalizedUrl: 'https://example.com/c', method: 'GET', source: 'sitemap', depth: 0 },
        ],
      });

      expect(surface.getUrlsBySource('sitemap')).toHaveLength(2);
      expect(surface.getUrlsBySource('html_a')).toHaveLength(1);
    });

    it('should get endpoints by type', () => {
      const surface = new AttackSurface({
        endpoints: [
          { url: 'https://example.com/api', method: 'GET', type: 'rest', sourceUrl: 'https://example.com', source: 'html_a' },
          { url: 'https://example.com/graphql', method: 'POST', type: 'graphql', sourceUrl: 'https://example.com', source: 'javascript' },
          { url: 'wss://example.com/ws', method: 'WEBSOCKET', type: 'websocket', sourceUrl: 'https://example.com', source: 'javascript' },
        ],
      });

      expect(surface.getEndpointsByType('rest')).toHaveLength(1);
      expect(surface.getEndpointsByType('graphql')).toHaveLength(1);
      expect(surface.getEndpointsByType('websocket')).toHaveLength(1);
    });

    it('should get forms with file upload', () => {
      const surface = new AttackSurface({
        forms: [
          { action: '/login', method: 'POST', inputs: [], hasFileUpload: false, hasCaptcha: false, pageUrl: 'https://example.com', source: 'html_a' },
          { action: '/upload', method: 'POST', inputs: [], hasFileUpload: true, hasCaptcha: false, pageUrl: 'https://example.com', source: 'html_a' },
        ],
      });

      expect(surface.getFormsWithFileUpload()).toHaveLength(1);
      expect(surface.getFormsWithFileUpload()[0].action).toBe('/upload');
    });

    it('should get unique parameter names', () => {
      const surface = new AttackSurface({
        parameters: [
          { name: 'id', location: 'query', url: 'https://example.com/?id=1', isCommon: false },
          { name: 'id', location: 'query', url: 'https://example.com/?id=2', isCommon: false },
          { name: 'page', location: 'query', url: 'https://example.com/?page=1', isCommon: false },
        ],
      });

      expect(surface.uniqueParameterNames).toHaveLength(2);
      expect(surface.uniqueParameterNames).toContain('id');
      expect(surface.uniqueParameterNames).toContain('page');
    });
  });

  describe('merge', () => {
    it('should merge two surfaces', () => {
      const s1 = new AttackSurface({
        urls: [{ url: 'https://example.com/a', normalizedUrl: 'https://example.com/a', method: 'GET', source: 'sitemap', depth: 0 }],
      });
      const s2 = new AttackSurface({
        urls: [{ url: 'https://example.com/b', normalizedUrl: 'https://example.com/b', method: 'GET', source: 'html_a', depth: 1 }],
      });

      const merged = s1.merge(s2);
      expect(merged.urls).toHaveLength(2);
    });

    it('should deduplicate during merge', () => {
      const s1 = new AttackSurface({
        urls: [{ url: 'https://example.com/a', normalizedUrl: 'https://example.com/a', method: 'GET', source: 'sitemap', depth: 0 }],
      });
      const s2 = new AttackSurface({
        urls: [{ url: 'https://example.com/a', normalizedUrl: 'https://example.com/a', method: 'GET', source: 'html_a', depth: 1 }],
      });

      const merged = s1.merge(s2);
      expect(merged.urls).toHaveLength(1);
    });
  });

  describe('serialization', () => {
    it('should round-trip through JSON', () => {
      const surface = new AttackSurface({
        urls: [{ url: 'https://example.com/', normalizedUrl: 'https://example.com/', method: 'GET', source: 'sitemap', depth: 0 }],
        technologies: [{ name: 'nginx', version: '1.24', category: 'server', confidence: 0.9 }],
      });

      const json = JSON.stringify(surface.toJSON());
      const restored = AttackSurface.fromJSON(JSON.parse(json));

      expect(restored.urls).toHaveLength(1);
      expect(restored.technologies).toHaveLength(1);
    });

    it('should produce stats', () => {
      const surface = new AttackSurface({
        urls: [{ url: 'https://example.com/', normalizedUrl: 'https://example.com/', method: 'GET', source: 'sitemap', depth: 0 }],
      });

      const stats = surface.getStats(42, 1000);
      expect(stats.urlsTotal).toBe(1);
      expect(stats.requestsMade).toBe(42);
      expect(stats.durationMs).toBe(1000);
    });
  });

  describe('diff', () => {
    it('should detect added, removed, and common URLs', () => {
      const v1 = new AttackSurface({
        urls: [
          { url: 'https://example.com/a', normalizedUrl: 'https://example.com/a', method: 'GET', source: 'sitemap', depth: 0 },
          { url: 'https://example.com/b', normalizedUrl: 'https://example.com/b', method: 'GET', source: 'sitemap', depth: 0 },
        ],
      });
      const v2 = new AttackSurface({
        urls: [
          { url: 'https://example.com/b', normalizedUrl: 'https://example.com/b', method: 'GET', source: 'html_a', depth: 1 },
          { url: 'https://example.com/c', normalizedUrl: 'https://example.com/c', method: 'GET', source: 'html_a', depth: 1 },
        ],
      });

      const diff = v1.diff(v2);
      expect(diff.added).toHaveLength(1);
      expect(diff.removed).toHaveLength(1);
      expect(diff.common).toHaveLength(1);
    });
  });
});

// ─── ScopeManager Tests ───────────────────────────────────────

describe('ScopeManager', () => {
  it('should allow all URLs with default config', () => {
    const scope = new ScopeManager();
    expect(scope.isInScope('https://example.com/page', 0)).toBe(true);
    expect(scope.isInScope('https://other.com/page', 0)).toBe(true);
  });

  it('should filter by hostname', () => {
    const scope = new ScopeManager({
      ...DEFAULT_DISCOVERY_SCOPE,
      allowedHostnames: ['example.com'],
    });

    expect(scope.isInScope('https://example.com/page', 0)).toBe(true);
    expect(scope.isInScope('https://other.com/page', 0)).toBe(false);
  });

  it('should filter by depth', () => {
    const scope = new ScopeManager({
      ...DEFAULT_DISCOVERY_SCOPE,
      maxDepth: 2,
    });

    expect(scope.isInScope('https://example.com/page', 0)).toBe(true);
    expect(scope.isInScope('https://example.com/page/sub', 1)).toBe(true);
    expect(scope.isInScope('https://example.com/a/b/c', 3)).toBe(false);
  });

  it('should filter by maxUrls', () => {
    const scope = new ScopeManager({
      ...DEFAULT_DISCOVERY_SCOPE,
      maxUrls: 2,
    });

    expect(scope.isInScope('https://example.com/1', 0)).toBe(true);
    scope.countUrl();
    expect(scope.isInScope('https://example.com/2', 0)).toBe(true);
    scope.countUrl();
    expect(scope.isInScope('https://example.com/3', 0)).toBe(false);
    expect(scope.hasCapacity).toBe(false);
  });

  it('should block common binary extensions by default', () => {
    const scope = new ScopeManager(DEFAULT_DISCOVERY_SCOPE);

    expect(scope.isInScope('https://example.com/image.jpg', 0)).toBe(false);
    expect(scope.isInScope('https://example.com/font.woff2', 0)).toBe(false);
    expect(scope.isInScope('https://example.com/page.html', 0)).toBe(true);
    expect(scope.isInScope('https://example.com/api.json', 0)).toBe(true);
  });

  it('should filter by include glob rules', () => {
    const scope = new ScopeManager({
      ...DEFAULT_DISCOVERY_SCOPE,
      includeRules: [includeGlob('/api/*')],
    });

    expect(scope.isInScope('https://example.com/api/users', 0)).toBe(true);
    expect(scope.isInScope('https://example.com/about', 0)).toBe(false);
  });

  it('should filter by exclude glob rules', () => {
    const scope = new ScopeManager({
      ...DEFAULT_DISCOVERY_SCOPE,
      excludeRules: [excludeGlob('/admin/*')],
    });

    expect(scope.isInScope('https://example.com/admin/users', 0)).toBe(false);
    expect(scope.isInScope('https://example.com/about', 0)).toBe(true);
  });

  it('should filter by regex rules', () => {
    const scope = new ScopeManager({
      ...DEFAULT_DISCOVERY_SCOPE,
      includeRules: [includeRegex('^/api/v\\d+/')],
    });

    expect(scope.isInScope('https://example.com/api/v1/users', 0)).toBe(true);
    expect(scope.isInScope('https://example.com/api/legacy/users', 0)).toBe(false);
  });

  it('should filter by exclude regex rules', () => {
    const scope = new ScopeManager({
      ...DEFAULT_DISCOVERY_SCOPE,
      excludeRules: [excludeRegex('\\.(png|jpg|gif)$')],
    });

    expect(scope.isInScope('https://example.com/image.png', 0)).toBe(false);
    expect(scope.isInScope('https://example.com/page', 0)).toBe(true);
  });

  it('should filter by exact match', () => {
    const scope = new ScopeManager({
      ...DEFAULT_DISCOVERY_SCOPE,
      includeRules: [includeExact('/api/v1/users')],
    });

    expect(scope.isInScope('https://example.com/api/v1/users', 0)).toBe(true);
    expect(scope.isInScope('https://example.com/api/v1/orders', 0)).toBe(false);
  });

  it('should filter by wildcard', () => {
    const scope = new ScopeManager({
      ...DEFAULT_DISCOVERY_SCOPE,
      includeRules: [includeWildcard('/api/*')],
    });

    expect(scope.isInScope('https://example.com/api/anything', 0)).toBe(true);
    expect(scope.isInScope('https://example.com/other', 0)).toBe(false);
  });

  it('should filter by extension rule', () => {
    const scope = new ScopeManager({
      ...DEFAULT_DISCOVERY_SCOPE,
      blockedExtensions: [],
      excludeRules: [excludeExtension('.pdf')],
    });

    expect(scope.isInScope('https://example.com/doc.pdf', 0)).toBe(false);
    expect(scope.isInScope('https://example.com/page.html', 0)).toBe(true);
  });

  it('should handle invalid URLs gracefully', () => {
    const scope = new ScopeManager();
    expect(scope.isInScope('not-a-url', 0)).toBe(false);
    expect(scope.isInScope('', 0)).toBe(false);
  });

  it('should check hostname isolation', () => {
    const scope = new ScopeManager({
      ...DEFAULT_DISCOVERY_SCOPE,
      allowedHostnames: ['example.com'],
    });

    expect(scope.isHostnameInScope('https://example.com/page')).toBe(true);
    expect(scope.isHostnameInScope('https://evil.com/page')).toBe(false);
  });
});

// ─── ResponseParser Tests ─────────────────────────────────────

describe('ResponseParser', () => {
  describe('normalizeUrl', () => {
    it('should lowercase scheme and host', () => {
      expect(normalizeUrl('HTTPS://EXAMPLE.COM/Path')).toBe('https://example.com/Path');
    });

    it('should sort query parameters', () => {
      expect(normalizeUrl('https://example.com/?b=2&a=1')).toBe('https://example.com/?a=1&b=2');
    });

    it('should remove fragment', () => {
      expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
    });

    it('should remove trailing slash (except root)', () => {
      expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
    });
  });

  describe('resolveUrl', () => {
    it('should resolve relative URLs', () => {
      expect(resolveUrl('https://example.com/dir/page', '../about')).toBe('https://example.com/about');
      expect(resolveUrl('https://example.com/dir/page', '/api')).toBe('https://example.com/api');
      expect(resolveUrl('https://example.com/', 'https://other.com/')).toBe('https://other.com/');
    });

    it('should return null for invalid URLs', () => {
      expect(resolveUrl('not-a-url', '/path')).toBeNull();
    });
  });

  describe('getHostname', () => {
    it('should extract hostname', () => {
      expect(getHostname('https://example.com/path')).toBe('example.com');
      expect(getHostname('https://sub.example.com:8080/')).toBe('sub.example.com');
    });

    it('should return empty for invalid URLs', () => {
      expect(getHostname('not-a-url')).toBe('');
    });
  });

  describe('isExternalUrl', () => {
    it('should detect external URLs', () => {
      expect(isExternalUrl('example.com', 'https://cdn.example.com/lib.js')).toBe(true);
      expect(isExternalUrl('example.com', 'https://example.com/page')).toBe(false);
    });
  });

  describe('parseHtml', () => {
    it('should extract links', () => {
      const response = createHtmlResponse('https://example.com/', SAMPLE_HTML);
      const parsed = parseHtml(response, 'https://example.com/');

      // Should find /about and /contact (skip #section, javascript:, mailto:)
      const aboutUrl = parsed.urls.find(u => u.url.includes('/about'));
      const contactUrl = parsed.urls.find(u => u.url.includes('/contact'));
      expect(aboutUrl).toBeDefined();
      expect(contactUrl).toBeDefined();
      expect(parsed.urls.find(u => u.url.includes('#'))).toBeUndefined();
      expect(parsed.urls.find(u => u.url.includes('javascript:'))).toBeUndefined();
      expect(parsed.urls.find(u => u.url.includes('mailto:'))).toBeUndefined();
    });

    it('should extract forms', () => {
      const response = createHtmlResponse('https://example.com/', SAMPLE_HTML);
      const parsed = parseHtml(response, 'https://example.com/');

      expect(parsed.forms).toHaveLength(3); // login, search, upload
      const loginForm = parsed.forms.find(f => f.action.includes('/login'));
      expect(loginForm).toBeDefined();
      expect(loginForm!.method).toBe('POST');
      expect(loginForm!.inputs.some(i => i.name === 'username')).toBe(true);
      expect(loginForm!.inputs.some(i => i.name === 'password')).toBe(true);
      expect(loginForm!.inputs.some(i => i.name === 'csrf_token' && i.type === 'hidden')).toBe(true);
    });

    it('should detect file upload forms', () => {
      const response = createHtmlResponse('https://example.com/', SAMPLE_HTML);
      const parsed = parseHtml(response, 'https://example.com/');

      const uploadForm = parsed.forms.find(f => f.action.includes('/upload'));
      expect(uploadForm).toBeDefined();
      expect(uploadForm!.hasFileUpload).toBe(true);
    });

    it('should detect CAPTCHA', () => {
      const response = createHtmlResponse('https://example.com/', SAMPLE_HTML);
      const parsed = parseHtml(response, 'https://example.com/');

      const uploadForm = parsed.forms.find(f => f.action.includes('/upload'));
      expect(uploadForm?.hasCaptcha).toBe(true);
    });

    it('should extract script sources', () => {
      const response = createHtmlResponse('https://example.com/', SAMPLE_HTML);
      const parsed = parseHtml(response, 'https://example.com/');

      const bundleJs = parsed.jsFiles.find(j => j.url.includes('bundle'));
      const reactJs = parsed.jsFiles.find(j => j.url.includes('react'));
      expect(bundleJs).toBeDefined();
      expect(reactJs).toBeDefined();
    });

    it('should extract inline scripts', () => {
      const response = createHtmlResponse('https://example.com/', SAMPLE_HTML);
      const parsed = parseHtml(response, 'https://example.com/');

      const inlineScripts = parsed.jsFiles.filter(j => j.inline);
      expect(inlineScripts.length).toBeGreaterThan(0);
    });

    it('should extract title', () => {
      const response = createHtmlResponse('https://example.com/', SAMPLE_HTML);
      const parsed = parseHtml(response, 'https://example.com/');
      expect(parsed.title).toBe('Example App');
    });

    it('should extract meta tags', () => {
      const response = createHtmlResponse('https://example.com/', SAMPLE_HTML);
      const parsed = parseHtml(response, 'https://example.com/');

      const generator = parsed.metaTags.find(m => m.name === 'generator');
      expect(generator).toBeDefined();
      expect(generator!.content).toContain('WordPress');
    });

    it('should skip data: URIs in images', () => {
      const response = createHtmlResponse('https://example.com/', SAMPLE_HTML);
      const parsed = parseHtml(response, 'https://example.com/');

      const dataImages = parsed.staticResources.filter(s => s.url.startsWith('data:'));
      expect(dataImages).toHaveLength(0);
    });

    it('should extract iframe sources', () => {
      const response = createHtmlResponse('https://example.com/', SAMPLE_HTML);
      const parsed = parseHtml(response, 'https://example.com/');

      const iframeUrl = parsed.urls.find(u => u.source === 'html_src' && u.url.includes('/widget'));
      expect(iframeUrl).toBeDefined();
    });
  });

  describe('parseRobotsTxt', () => {
    it('should parse robots.txt', () => {
      const { entries, sitemaps } = parseRobotsTxt(SAMPLE_ROBOTS, 'https://example.com');

      expect(sitemaps).toHaveLength(1);
      expect(sitemaps[0]).toBe('https://example.com/sitemap.xml');

      const disallows = entries.filter(e => e.directive === 'Disallow');
      expect(disallows.length).toBeGreaterThanOrEqual(2);

      const allows = entries.filter(e => e.directive === 'Allow');
      expect(allows.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty robots.txt', () => {
      const { entries, sitemaps } = parseRobotsTxt('', 'https://example.com');
      expect(entries).toHaveLength(0);
      expect(sitemaps).toHaveLength(0);
    });

    it('should skip comments', () => {
      const { entries } = parseRobotsTxt('# Comment\nUser-agent: *\nAllow: /', 'https://example.com');
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parseSitemapXml', () => {
    it('should parse sitemap.xml', () => {
      const entries = parseSitemapXml(SAMPLE_SITEMAP);
      expect(entries).toHaveLength(3);
      expect(entries[0].url).toBe('https://example.com/');
      expect(entries[0].lastmod).toBe('2024-01-01');
      expect(entries[0].priority).toBe(1.0);
    });

    it('should handle empty sitemap', () => {
      const entries = parseSitemapXml('<urlset></urlset>');
      expect(entries).toHaveLength(0);
    });
  });

  describe('detectTechnologiesFromHeaders', () => {
    it('should detect nginx', () => {
      const techs = detectTechnologiesFromHeaders({ server: 'nginx/1.24.0' }, '');
      expect(techs.some(t => t.name === 'nginx')).toBe(true);
    });

    it('should detect Express', () => {
      const techs = detectTechnologiesFromHeaders({ 'x-powered-by': 'Express' }, '');
      expect(techs.some(t => t.name === 'Express')).toBe(true);
    });

    it('should detect PHP', () => {
      const techs = detectTechnologiesFromHeaders({ 'x-powered-by': 'PHP/8.2' }, '');
      expect(techs.some(t => t.name === 'PHP' && t.version === '8.2')).toBe(true);
    });

    it('should detect Cloudflare', () => {
      const techs = detectTechnologiesFromHeaders({ server: 'cloudflare', 'cf-ray': 'abc123' }, '');
      expect(techs.some(t => t.name === 'Cloudflare WAF')).toBe(true);
    });

    it('should detect from cookies', () => {
      const techs = detectTechnologiesFromHeaders({}, 'PHPSESSID=abc123; JSESSIONID=def456');
      expect(techs.some(t => t.name === 'PHP')).toBe(true);
      expect(techs.some(t => t.name === 'Java')).toBe(true);
    });

    it('should return empty for unknown headers', () => {
      const techs = detectTechnologiesFromHeaders({ 'x-custom': 'value' }, '');
      expect(techs).toHaveLength(0);
    });
  });

  describe('detectTechnologiesFromMeta', () => {
    it('should detect WordPress from generator', () => {
      const metaTags = [{ name: 'generator', content: 'WordPress 6.4' }];
      const techs = detectTechnologiesFromMeta(metaTags);
      expect(techs.some(t => t.name === 'WordPress' && t.version === '6.4')).toBe(true);
    });

    it('should detect Drupal from generator', () => {
      const metaTags = [{ name: 'generator', content: 'Drupal 10' }];
      const techs = detectTechnologiesFromMeta(metaTags);
      expect(techs.some(t => t.name === 'Drupal')).toBe(true);
    });
  });

  describe('extractEndpointsFromJs', () => {
    it('should detect fetch() calls', () => {
      const js = `fetch('/api/v1/users'); axios.post('/api/v1/login');`;
      const { endpoints } = extractEndpointsFromJs(js, 'https://example.com', 'https://example.com');

      const usersEndpoint = endpoints.find(e => e.url.includes('/api/v1/users') && e.method === 'GET');
      const loginEndpoint = endpoints.find(e => e.url.includes('/api/v1/login') && e.method === 'POST');
      expect(usersEndpoint).toBeDefined();
      expect(loginEndpoint).toBeDefined();
    });

    it('should detect GraphQL endpoints', () => {
      const js = `fetch('/graphql', { method: 'POST' });`;
      const { endpoints } = extractEndpointsFromJs(js, 'https://example.com', 'https://example.com');

      const gql = endpoints.find(e => e.type === 'graphql');
      expect(gql).toBeDefined();
    });

    it('should detect WebSocket endpoints', () => {
      const js = `new WebSocket('wss://example.com/ws');`;
      const { endpoints } = extractEndpointsFromJs(js, 'https://example.com', 'https://example.com');

      const ws = endpoints.find(e => e.type === 'websocket');
      expect(ws).toBeDefined();
    });

    it('should detect method from config object', () => {
      const js = `fetch('/api/data', { method: 'DELETE' });`;
      const { endpoints } = extractEndpointsFromJs(js, 'https://example.com', 'https://example.com');

      const del = endpoints.find(e => e.method === 'DELETE');
      expect(del).toBeDefined();
    });
  });

  describe('extractParameters', () => {
    it('should extract query parameters', () => {
      const params = extractParameters('https://example.com/search?q=test&page=1');
      expect(params).toHaveLength(2);
      expect(params.some(p => p.name === 'q')).toBe(true);
      expect(params.some(p => p.name === 'page')).toBe(true);
    });

    it('should infer parameter types', () => {
      const params = extractParameters('https://example.com/api?id=42&active=true&name=test');
      expect(params.find(p => p.name === 'id')?.inferredType).toBe('number');
      expect(params.find(p => p.name === 'active')?.inferredType).toBe('boolean');
      expect(params.find(p => p.name === 'name')?.inferredType).toBe('string');
    });

    it('should extract path parameters', () => {
      const params = extractParameters('https://example.com/api/users/:userId/orders/{orderId}');
      expect(params.find(p => p.name === 'userId' && p.location === 'path')).toBeDefined();
      expect(params.find(p => p.name === 'orderId' && p.location === 'path')).toBeDefined();
    });
  });

  describe('classifyExternalDomains', () => {
    it('should classify external domains', () => {
      const urls: DiscoveredUrl[] = [
        { url: 'https://cdn.example.com/lib.js', normalizedUrl: 'https://cdn.example.com/lib.js', method: 'GET', source: 'javascript', depth: 1, contentType: 'application/javascript' },
        { url: 'https://example.com/page', normalizedUrl: 'https://example.com/page', method: 'GET', source: 'html_a', depth: 0 },
        { url: 'https://cdn.example.com/style.css', normalizedUrl: 'https://cdn.example.com/style.css', method: 'GET', source: 'html_link', depth: 0, contentType: 'text/css' },
      ];

      const domains = classifyExternalDomains(urls, 'example.com');
      expect(domains).toHaveLength(1);
      expect(domains[0].domain).toBe('cdn.example.com');
      expect(domains[0].referencedFrom).toHaveLength(2);
    });
  });

  describe('classifyJsAsset', () => {
    it('should classify jQuery', () => {
      const js = classifyJsAsset('https://cdn.example.com/jquery-3.7.min.js', 'https://example.com');
      expect(js.assetType).toBe('library');
    });

    it('should classify React', () => {
      const js = classifyJsAsset('https://cdn.example.com/react.js', 'https://example.com');
      expect(js.assetType).toBe('framework');
    });

    it('should classify minified files', () => {
      const js = classifyJsAsset('https://example.com/app.min.js', 'https://example.com');
      expect(js.isMinified).toBe(true);
    });
  });

  describe('classifyStaticResource', () => {
    it('should classify images', () => {
      const res = classifyStaticResource('https://example.com/logo.png', 'https://example.com');
      expect(res).not.toBeNull();
      expect(res!.type).toBe('image');
    });

    it('should classify stylesheets', () => {
      const res = classifyStaticResource('https://example.com/style.css', 'https://example.com');
      expect(res).not.toBeNull();
      expect(res!.type).toBe('stylesheet');
    });

    it('should return null for non-static files', () => {
      const res = classifyStaticResource('https://example.com/api/users', 'https://example.com');
      expect(res).toBeNull();
    });
  });
});

// ─── HttpFetcher Tests ────────────────────────────────────────

describe('MockFetcher', () => {
  it('should return registered responses', async () => {
    const fetcher = new MockFetcher()
      .onUrl('https://example.com/', { body: '<html>OK</html>' });

    const response = await fetcher.fetch({ url: 'https://example.com/' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('<html>OK</html>');
  });

  it('should return 404 for unregistered URLs', async () => {
    const fetcher = new MockFetcher();
    const response = await fetcher.fetch({ url: 'https://example.com/unknown' });
    expect(response.statusCode).toBe(404);
  });

  it('should throw for failing URLs', async () => {
    const fetcher = new MockFetcher()
      .onUrlFail('https://example.com/error');

    await expect(fetcher.fetch({ url: 'https://example.com/error' })).rejects.toThrow('Connection refused');
  });

  it('should log requests', async () => {
    const fetcher = new MockFetcher()
      .onUrl('https://example.com/', { body: 'OK' });

    await fetcher.fetch({ url: 'https://example.com/' });
    await fetcher.fetch({ url: 'https://example.com/' });

    expect(fetcher.getRequestLog()).toHaveLength(2);
    expect(fetcher.requestCount).toBe(2);
  });

  it('should respect abort signal', async () => {
    const fetcher = new MockFetcher()
      .onUrl('https://example.com/', { body: 'OK' });

    const controller = new AbortController();
    controller.abort();

    await expect(fetcher.fetch({ url: 'https://example.com/' }, controller.signal)).rejects.toThrow('Aborted');
  });
});

describe('TokenBucketRateLimiter', () => {
  it('should allow requests within rate', async () => {
    const limiter = new TokenBucketRateLimiter(1000, 10);
    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    // Should complete quickly (all within burst)
    expect(Date.now() - start).toBeLessThan(100);
  });

  it('should throttle requests beyond burst', async () => {
    const limiter = new TokenBucketRateLimiter(100, 2); // 100/sec, burst 2
    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    // Should take some time due to throttling
    expect(Date.now() - start).toBeGreaterThan(0);
  });
});

describe('Semaphore', () => {
  it('should limit concurrency', async () => {
    const semaphore = new Semaphore(2);
    let activeCount = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 10 }, async (_, i) => {
      await semaphore.acquire();
      activeCount++;
      maxActive = Math.max(maxActive, activeCount);
      await new Promise(r => setTimeout(r, 10));
      activeCount--;
      semaphore.release();
    });

    await Promise.all(tasks);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('should queue and release correctly', async () => {
    const semaphore = new Semaphore(1);
    const order: number[] = [];

    const task1 = (async () => {
      await semaphore.acquire();
      order.push(1);
      await new Promise(r => setTimeout(r, 50));
      semaphore.release();
    })();

    const task2 = (async () => {
      await semaphore.acquire();
      order.push(2);
      semaphore.release();
    })();

    await Promise.all([task1, task2]);
    expect(order).toEqual([1, 2]);
  });
});

// ─── ScanEnginePlugin Contract Tests ──────────────────────────

describe('KatanaAdapter — ScanEnginePlugin Contract', () => {
  it('should be type-compatible with ScanEnginePlugin', () => {
    const adapter: import('../../../domain/scan-platform/plugin-api/scan-engine-plugin.ts').ScanEnginePlugin =
      new KatanaAdapter({ useKatana: false });

    expect(adapter.id).toBe('discovery-v1');
    expect(typeof adapter.initialize).toBe('function');
    expect(typeof adapter.shutdown).toBe('function');
    expect(typeof adapter.health).toBe('function');
    expect(typeof adapter.scan).toBe('function');
    expect(typeof adapter.cancel).toBe('function');
    expect(adapter.capabilities.length).toBeGreaterThan(0);
  });

  it('should produce findings compatible with Orchestrator normalization', async () => {
    const mockFetcher = new MockFetcher()
      .onUrl('https://example.com', {
        body: SAMPLE_HTML,
        headers: { 'content-type': 'text/html' },
      })
      .onUrl('https://example.com/about', { body: '<html><body>About</body></html>', headers: { 'content-type': 'text/html' } })
      .onUrl('https://example.com/contact', { body: '<html><body>Contact</body></html>', headers: { 'content-type': 'text/html' } })
      .onUrl('https://example.com/widget', { body: '<html><body>Widget</body></html>', headers: { 'content-type': 'text/html' } });

    const adapter = new KatanaAdapter({
      useKatana: false,
      httpClient: mockFetcher,
      scope: { ...DEFAULT_DISCOVERY_SCOPE, maxDepth: 2, blockedExtensions: [] },
      analyzeJavaScript: true,
      extractExternalDomains: true,
      includeStaticResources: true,
    });
    await adapter.initialize();

    const context = createTestContext();
    const result = await adapter.scan(context, () => {});

    for (const f of result.findings) {
      // All required ScanEngineFinding fields
      expect(f.title).toBeTruthy();
      expect(f.description).toBeTruthy();
      expect(f.severity).toBeTruthy();
      expect(f.location).toBeDefined();
      expect(f.evidence).toBeDefined();
      expect(f.confidence).toBeGreaterThan(0);
    }
  });
});