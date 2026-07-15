/**
 * Discovery Engine — Response Parser
 *
 * Parses HTTP responses to extract:
 * - URLs (links, scripts, stylesheets, iframes, etc.)
 * - Forms (action, method, inputs)
 * - JavaScript file references
 * - Technology hints (from headers, meta tags, cookies)
 * - API endpoints (from script tags, fetch/XHR patterns)
 * - Static resources
 * - GraphQL endpoints
 * - WebSocket endpoints
 *
 * All methods are pure functions (no side effects).
 */

import type {
  DiscoveredUrl,
  DiscoveredForm,
  DiscoveredJsFile,
  DiscoveredEndpoint,
  DiscoveredTechnology,
  DiscoveredStaticResource,
  DiscoveredParameter,
  DiscoveredRobotsEntry,
  DiscoveredSitemapEntry,
  DiscoveredExternalDomain,
  UrlSource,
  HttpMethod,
  EndpointType,
  JsAssetType,
  StaticResourceType,
  TechnologyCategory,
} from './discovery-types.ts';
import type { FetchResponse } from './http-fetcher.ts';

// ─── URL Normalization ───────────────────────────────────────

/**
 * Normalize a URL for deduplication.
 * - Lowercase scheme and host
 * - Sort query parameters
 * - Remove fragment
 * - Remove trailing slash (except root)
 */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();

    // Sort query params
    if (url.search) {
      const params = new URLSearchParams(url.search);
      const sorted = new URLSearchParams([...params.entries()].sort(([a], [b]) => a.localeCompare(b)));
      url.search = sorted.toString();
    }

    // Remove fragment
    url.hash = '';

    // Remove trailing slash (except root)
    const path = url.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      url.pathname = path.slice(0, -1);
    }

    let result = url.toString();

    // For root URL, strip trailing slash: https://example.com/ → https://example.com
    if (url.pathname === '/' && !result.includes('?')) {
      result = result.replace(/\/$/, '');
    }

    return result;
  } catch {
    return raw.toLowerCase().trim();
  }
}

/**
 * Resolve a relative URL against a base URL.
 */
export function resolveUrl(base: string, relative: string): string | null {
  try {
    return new URL(relative, base).href;
  } catch {
    return null;
  }
}

/**
 * Extract hostname from a URL.
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Check if a URL is external (different hostname).
 */
export function isExternalUrl(baseHostname: string, url: string): boolean {
  const hostname = getHostname(url);
  return hostname !== '' && hostname.toLowerCase() !== baseHostname.toLowerCase();
}

// ─── HTML Parser ─────────────────────────────────────────────

interface ParsedHtml {
  readonly urls: readonly ParsedUrlRef[];
  readonly forms: readonly ParsedFormRef[];
  readonly jsFiles: readonly ParsedJsRef[];
  readonly staticResources: readonly ParsedStaticRef[];
  readonly metaTags: readonly { name: string; content: string; property?: string }[];
  readonly title?: string;
}

interface ParsedUrlRef {
  readonly url: string;
  readonly source: UrlSource;
  readonly attribute?: string;
}

interface ParsedFormRef {
  readonly action: string;
  readonly method: 'GET' | 'POST';
  readonly inputs: Array<{ name: string; type: string; value?: string; id?: string; placeholder?: string; required: boolean }>;
  readonly hasFileUpload: boolean;
  readonly formId?: string;
  readonly hasCaptcha: boolean;
}

interface ParsedJsRef {
  readonly url: string;
  readonly isModule?: boolean;
  readonly inline?: boolean;
  readonly content?: string;
}

interface ParsedStaticRef {
  readonly url: string;
  readonly type: StaticResourceType;
  readonly extension: string;
}

/**
 * Parse HTML response and extract all discoverable elements.
 * Uses regex-based parsing (no DOM dependency) for Node.js compatibility.
 */
export function parseHtml(response: FetchResponse, sourceUrl: string): ParsedHtml {
  const body = response.body;
  const urls: ParsedUrlRef[] = [];
  const forms: ParsedFormRef[] = [];
  const jsFiles: ParsedJsRef[] = [];
  const staticResources: ParsedStaticRef[] = [];
  const metaTags: Array<{ name: string; content: string; property?: string }> = [];

  // ─── Extract title ────────────────────────────────────────
  const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : undefined;

  // ─── Extract meta tags ────────────────────────────────────
  const metaRegex = /<meta\s+[^>]*?>/gi;
  let metaMatch: RegExpExecArray | null;
  while ((metaMatch = metaRegex.exec(body)) !== null) {
    const tag = metaMatch[0];
    const name = getAttribute(tag, 'name') || getAttribute(tag, 'property') || '';
    const content = getAttribute(tag, 'content') || '';
    const property = getAttribute(tag, 'property');
    if (name && content) {
      metaTags.push({ name, content, property: property ?? undefined });
    }
  }

  // ─── Extract <a href> ─────────────────────────────────────
  const aRegex = /<a\s+[^>]*?href\s*=\s*["']([^"']+)["'][^>]*?>/gi;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = aRegex.exec(body)) !== null) {
    const href = decodeEntities(aMatch[1].trim());
    if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
      const resolved = resolveUrl(sourceUrl, href);
      if (resolved) {
        urls.push({ url: resolved, source: 'html_a', attribute: 'href' });
      }
    }
  }

  // ─── Extract <link href> (stylesheets, sitemaps, etc.) ────
  const linkRegex = /<link\s+[^>]*?href\s*=\s*["']([^"']+)["'][^>]*?>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(body)) !== null) {
    const href = decodeEntities(linkMatch[1].trim());
    const tag = linkMatch[0];
    const rel = getAttribute(tag, 'rel')?.toLowerCase() ?? '';
    const resolved = resolveUrl(sourceUrl, href);
    if (!resolved) continue;

    if (rel === 'stylesheet') {
      const ext = getExtensionFromUrl(resolved);
      staticResources.push({ url: resolved, type: 'stylesheet', extension: ext });
    } else if (rel === 'sitemap') {
      urls.push({ url: resolved, source: 'sitemap', attribute: 'href' });
    } else if (rel === 'icon' || rel === 'shortcut icon' || rel === 'apple-touch-icon') {
      const ext = getExtensionFromUrl(resolved);
      staticResources.push({ url: resolved, type: 'favicon', extension: ext });
    } else {
      urls.push({ url: resolved, source: 'html_link', attribute: 'href' });
    }
  }

  // ─── Extract <script src> ─────────────────────────────────
  const scriptSrcRegex = /<script\s+[^>]*?src\s*=\s*["']([^"']+)["'][^>]*?>/gi;
  let scriptSrcMatch: RegExpExecArray | null;
  while ((scriptSrcMatch = scriptSrcRegex.exec(body)) !== null) {
    const src = decodeEntities(scriptSrcMatch[1].trim());
    const tag = scriptSrcMatch[0];
    const type = getAttribute(tag, 'type')?.toLowerCase();
    const isModule = type === 'module' || tag.includes('type="module"');
    const resolved = resolveUrl(sourceUrl, src);
    if (resolved) {
      jsFiles.push({ url: resolved, isModule });
    }
  }

  // ─── Extract inline <script> blocks (for endpoint/URL discovery) ──
  const inlineScriptRegex = /<script(?![^>]*\ssrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
  let inlineMatch: RegExpExecArray | null;
  while ((inlineMatch = inlineScriptRegex.exec(body)) !== null) {
    const content = inlineMatch[1].trim();
    if (content.length > 10 && content.length < 500_000) {
      jsFiles.push({ url: sourceUrl, inline: true, content });
    }
  }

  // ─── Extract <img src> ────────────────────────────────────
  const imgRegex = /<img\s+[^>]*?src\s*=\s*["']([^"']+)["'][^>]*?>/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRegex.exec(body)) !== null) {
    const src = decodeEntities(imgMatch[1].trim());
    if (src.startsWith('data:')) continue;
    const resolved = resolveUrl(sourceUrl, src);
    if (resolved) {
      const ext = getExtensionFromUrl(resolved);
      staticResources.push({ url: resolved, type: 'image', extension: ext });
    }
  }

  // ─── Extract <iframe src> ─────────────────────────────────
  const iframeRegex = /<iframe\s+[^>]*?src\s*=\s*["']([^"']+)["'][^>]*?>/gi;
  let iframeMatch: RegExpExecArray | null;
  while ((iframeMatch = iframeRegex.exec(body)) !== null) {
    const src = decodeEntities(iframeMatch[1].trim());
    const resolved = resolveUrl(sourceUrl, src);
    if (resolved) {
      urls.push({ url: resolved, source: 'html_src', attribute: 'src' });
    }
  }

  // ─── Extract <form> ───────────────────────────────────────
  const formRegex = /<form\s+([^>]*?)>([\s\S]*?)<\/form>/gi;
  let formMatch: RegExpExecArray | null;
  while ((formMatch = formRegex.exec(body)) !== null) {
    const formAttrs = formMatch[1];
    const formBody = formMatch[2];

    const action = getAttribute(formAttrs, 'action') ?? sourceUrl;
    const methodStr = (getAttribute(formAttrs, 'method') ?? 'GET').toUpperCase();
    const method = methodStr === 'POST' ? 'POST' as const : 'GET' as const;
    const formId = getAttribute(formAttrs, 'id');

    // Parse inputs
    const inputs: ParsedFormRef['inputs'] = [];
    let hasFileUpload = false;
    let hasCaptcha = false;

    const inputRegex = /<input\s+([^>]*?)\/?>/gi;
    let inputMatch: RegExpExecArray | null;
    while ((inputMatch = inputRegex.exec(formBody)) !== null) {
      const attrs = inputMatch[1];
      const name = getAttribute(attrs, 'name') ?? '';
      const type = (getAttribute(attrs, 'type') ?? 'text').toLowerCase();
      const value = getAttribute(attrs, 'value');
      const id = getAttribute(attrs, 'id');
      const placeholder = getAttribute(attrs, 'placeholder');
      const required = attrs.includes('required');

      if (name) {
        inputs.push({ name, type, value, id, placeholder, required });
      }

      if (type === 'file') hasFileUpload = true;
    }

    // Also check textarea and select
    const textareaRegex = /<textarea\s+[^>]*?name\s*=\s*["']([^"']+)["'][^>]*?>/gi;
    let taMatch: RegExpExecArray | null;
    while ((taMatch = textareaRegex.exec(formBody)) !== null) {
      const name = taMatch[1];
      inputs.push({ name, type: 'textarea', required: false });
    }

    // Check for CAPTCHA indicators
    if (formBody.toLowerCase().includes('captcha') ||
        formBody.toLowerCase().includes('recaptcha') ||
        formBody.toLowerCase().includes('g-recaptcha') ||
        formBody.toLowerCase().includes('cf-turnstile') ||
        formBody.toLowerCase().includes('hcaptcha')) {
      hasCaptcha = true;
    }

    const resolvedAction = resolveUrl(sourceUrl, action) ?? action;
    forms.push({ action: resolvedAction, method, inputs, hasFileUpload, formId: formId ?? undefined, hasCaptcha });
  }

  // ─── Extract <source src> (video/audio) ───────────────────
  const sourceRegex = /<source\s+[^>]*?src\s*=\s*["']([^"']+)["'][^>]*?>/gi;
  let sourceMatch: RegExpExecArray | null;
  while ((sourceMatch = sourceRegex.exec(body)) !== null) {
    const src = decodeEntities(sourceMatch[1].trim());
    const resolved = resolveUrl(sourceUrl, src);
    if (resolved) {
      const ext = getExtensionFromUrl(resolved);
      const type = ext.match(/^(mp4|webm|ogg|avi|mov)$/) ? 'video' as const :
                   ext.match(/^(mp3|wav|ogg|flac)$/) ? 'audio' as const : 'other' as const;
      staticResources.push({ url: resolved, type, extension: ext });
    }
  }

  return { urls, forms, jsFiles, staticResources, metaTags, title };
}

// ─── Robots.txt Parser ───────────────────────────────────────

export function parseRobotsTxt(content: string, sourceUrl: string): {
  readonly entries: DiscoveredRobotsEntry[];
  readonly sitemaps: readonly string[];
} {
  const entries: DiscoveredRobotsEntry[] = [];
  const sitemaps: string[] = [];
  let currentUserAgent = '*';

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const directive = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const value = trimmed.slice(colonIdx + 1).trim();

    switch (directive) {
      case 'user-agent':
        currentUserAgent = value || '*';
        entries.push({ directive: 'User-Agent', value: currentUserAgent, userAgent: currentUserAgent });
        break;
      case 'allow':
        entries.push({ directive: 'Allow', value, userAgent: currentUserAgent });
        break;
      case 'disallow':
        entries.push({ directive: 'Disallow', value, userAgent: currentUserAgent });
        break;
      case 'sitemap': {
        const resolved = resolveUrl(sourceUrl, value);
        if (resolved) sitemaps.push(resolved);
        break;
      }
      case 'crawl-delay':
        entries.push({ directive: 'Crawl-Delay', value, userAgent: currentUserAgent });
        break;
    }
  }

  return { entries, sitemaps };
}

// ─── Sitemap.xml Parser ──────────────────────────────────────

export function parseSitemapXml(content: string): DiscoveredSitemapEntry[] {
  const entries: DiscoveredSitemapEntry[] = [];

  // Simple regex-based XML parsing (no DOM dependency)
  const urlRegex = /<url>\s*([\s\S]*?)\s*<\/url>/gi;
  let urlMatch: RegExpExecArray | null;

  while ((urlMatch = urlRegex.exec(content)) !== null) {
    const urlBlock = urlMatch[1];
    const loc = extractXmlTag(urlBlock, 'loc');
    if (loc) {
      entries.push({
        url: loc.trim(),
        lastmod: extractXmlTag(urlBlock, 'lastmod') ?? undefined,
        changefreq: extractXmlTag(urlBlock, 'changefreq') ?? undefined,
        priority: parseOptionalFloat(extractXmlTag(urlBlock, 'priority')),
      });
    }
  }

  // Also handle sitemap index files (<sitemap> entries)
  const sitemapRegex = /<sitemap>\s*([\s\S]*?)\s*<\/sitemap>/gi;
  let sitemapMatch: RegExpExecArray | null;

  while ((sitemapMatch = sitemapRegex.exec(content)) !== null) {
    const block = sitemapMatch[1];
    const loc = extractXmlTag(block, 'loc');
    if (loc) {
      entries.push({ url: loc.trim() });
    }
  }

  return entries;
}

// ─── Technology Detection (Header-based) ─────────────────────

export function detectTechnologiesFromHeaders(
  headers: Record<string, string>,
  cookies: string,
): DiscoveredTechnology[] {
  const techs: DiscoveredTechnology[] = [];

  // Server header
  const server = headers['server']?.toLowerCase() ?? '';
  if (server.includes('nginx')) {
    const match = server.match(/nginx\/([\d.]+)/);
    techs.push({ name: 'nginx', version: match?.[1], category: 'server', confidence: 0.95, evidence: headers['server'] });
  } else if (server.includes('apache')) {
    const match = server.match(/apache\/([\d.]+)/);
    techs.push({ name: 'Apache', version: match?.[1], category: 'server', confidence: 0.95, evidence: headers['server'] });
  } else if (server.includes('iis')) {
    const match = server.match(/iis\/([\d.]+)/);
    techs.push({ name: 'IIS', version: match?.[1], category: 'server', confidence: 0.9, evidence: headers['server'] });
  } else if (server.includes('cloudflare')) {
    techs.push({ name: 'Cloudflare', category: 'cdn', confidence: 0.9, evidence: headers['server'] });
  }

  // X-Powered-By
  const poweredBy = headers['x-powered-by'] ?? '';
  if (poweredBy.includes('Express')) {
    const match = poweredBy.match(/express/i);
    techs.push({ name: 'Express', category: 'framework', confidence: 0.9, evidence: poweredBy });
  }
  if (poweredBy.includes('PHP')) {
    const match = poweredBy.match(/php\/([\d.]+)/i);
    techs.push({ name: 'PHP', version: match?.[1], category: 'language', confidence: 0.9, evidence: poweredBy });
  }
  if (poweredBy.includes('Next.js')) {
    techs.push({ name: 'Next.js', category: 'framework', confidence: 0.95, evidence: poweredBy });
  }
  if (poweredBy.includes('ASP.NET')) {
    const match = poweredBy.match(/asp\.net\s*([\d.]+)/i);
    techs.push({ name: 'ASP.NET', version: match?.[1], category: 'framework', confidence: 0.9, evidence: poweredBy });
  }

  // WAF detection
  if (headers['x-waf'] || headers['cf-ray'] || server.includes('cloudflare')) {
    techs.push({ name: 'Cloudflare WAF', category: 'waf', confidence: 0.85, evidence: headers['cf-ray'] ?? headers['x-waf'] });
  }
  if (headers['x-aws-waf-token'] || headers['x-amzn-requestid']) {
    techs.push({ name: 'AWS WAF', category: 'waf', confidence: 0.8, evidence: headers['x-aws-waf-token'] ?? headers['x-amzn-requestid'] });
  }

  // Framework detection from headers
  if (headers['x-react-version']) {
    techs.push({ name: 'React', version: headers['x-react-version'], category: 'javascript_framework', confidence: 0.95, evidence: headers['x-react-version'] });
  }

  // Cookie-based detection
  if (cookies.includes('PHPSESSID')) {
    techs.push({ name: 'PHP', category: 'language', confidence: 0.7, evidence: 'PHPSESSID cookie' });
  }
  if (cookies.includes('JSESSIONID')) {
    techs.push({ name: 'Java', category: 'language', confidence: 0.7, evidence: 'JSESSIONID cookie' });
  }
  if (cookies.includes('ASP.NET_SessionId')) {
    techs.push({ name: 'ASP.NET', category: 'framework', confidence: 0.8, evidence: 'ASP.NET_SessionId cookie' });
  }

  return techs;
}

// ─── Technology Detection (Meta tags) ────────────────────────

export function detectTechnologiesFromMeta(
  metaTags: readonly { name: string; content: string; property?: string }[],
): DiscoveredTechnology[] {
  const techs: DiscoveredTechnology[] = [];

  for (const meta of metaTags) {
    const name = meta.name.toLowerCase();
    const prop = meta.property?.toLowerCase() ?? '';

    // Generator meta tag
    if (name === 'generator') {
      const content = meta.content.toLowerCase();
      if (content.includes('wordpress')) {
        const match = meta.content.match(/([\d.]+)/);
        techs.push({ name: 'WordPress', version: match?.[1], category: 'cms', confidence: 0.95, evidence: meta.content });
      } else if (content.includes('joomla')) {
        techs.push({ name: 'Joomla', category: 'cms', confidence: 0.9, evidence: meta.content });
      } else if (content.includes('drupal')) {
        techs.push({ name: 'Drupal', category: 'cms', confidence: 0.9, evidence: meta.content });
      } else if (content.includes('hexo')) {
        techs.push({ name: 'Hexo', category: 'framework', confidence: 0.9, evidence: meta.content });
      } else if (content.includes('hugo')) {
        techs.push({ name: 'Hugo', category: 'framework', confidence: 0.9, evidence: meta.content });
      } else if (content.includes('gatsby')) {
        techs.push({ name: 'Gatsby', category: 'framework', confidence: 0.9, evidence: meta.content });
      }
    }

    // Viewport (indicates modern web app)
    if (name === 'viewport' && meta.content.includes('width=device-width')) {
      // Not a specific technology, skip
    }
  }

  return techs;
}

// ─── Endpoint Discovery from JS Content ──────────────────────

/**
 * Extract potential API endpoints from JavaScript source code.
 * Looks for: fetch(), axios, XMLHttpRequest, GraphQL, WebSocket patterns.
 */
export function extractEndpointsFromJs(
  jsContent: string,
  sourceUrl: string,
  baseUrl: string,
): {
  readonly endpoints: DiscoveredEndpoint[];
  readonly urls: DiscoveredUrl[];
  readonly jsFileRefs: DiscoveredJsFile[];
} {
  const endpoints: DiscoveredEndpoint[] = [];
  const urls: DiscoveredUrl[] = [];
  const jsFileRefs: DiscoveredJsFile[] = [];

  // ─── fetch() / axios patterns ─────────────────────────────
  // Match: fetch('/api/...'), fetch('https://...'), axios.get('/api/...')
  const fetchRegex = /(?:fetch|axios\.(?:get|post|put|patch|delete|request))\s*\(\s*["'`]([^"'`]+)["'`]/gi;
  let fetchMatch: RegExpExecArray | null;
  while ((fetchMatch = fetchRegex.exec(jsContent)) !== null) {
    const rawUrl = fetchMatch[1].trim();
    const resolved = resolveUrl(baseUrl, rawUrl);
    if (!resolved) continue;

    // Determine method from the call
    const call = fetchMatch[0].toLowerCase();
    let method: HttpMethod = 'GET';
    if (call.includes('post')) method = 'POST';
    else if (call.includes('put')) method = 'PUT';
    else if (call.includes('patch')) method = 'PATCH';
    else if (call.includes('delete')) method = 'DELETE';

    // Check if the method is specified as second arg
    const afterMatch = jsContent.slice(fetchMatch.index + fetchMatch[0].length, fetchMatch.index + fetchMatch[0].length + 100);
    const methodInConfig = afterMatch.match(/method\s*:\s*["'](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)["']/i);
    if (methodInConfig) method = methodInConfig[1].toUpperCase() as HttpMethod;

    endpoints.push({
      url: resolved,
      method,
      type: 'rest',
      contentType: 'application/json',
      isOpenapi: false,
      sourceUrl,
      source: 'javascript',
    });
  }

  // ─── GraphQL patterns ─────────────────────────────────────
  const gqlRegex = /["'`](\/(?:api\/)?graphql|\/(?:api\/)?gql)["'`]/gi;
  let gqlMatch: RegExpExecArray | null;
  while ((gqlMatch = gqlRegex.exec(jsContent)) !== null) {
    const resolved = resolveUrl(baseUrl, gqlMatch[1].trim());
    if (resolved) {
      endpoints.push({
        url: resolved,
        method: 'POST',
        type: 'graphql',
        contentType: 'application/json',
        isOpenapi: false,
        graphqlSchemaUrl: resolved.replace(/\/$/, '') + '/schema',
        sourceUrl,
        source: 'javascript',
      });
    }
  }

  // ─── WebSocket patterns ───────────────────────────────────
  const wsRegex = /(?:new\s+WebSocket|\.websocket|wss?:\/\/)(?:\s*\(\s*)?["'`](wss?:\/\/[^"'`]+)["'`]/gi;
  let wsMatch: RegExpExecArray | null;
  while ((wsMatch = wsRegex.exec(jsContent)) !== null) {
    const wsUrl = wsMatch[1].trim();
    endpoints.push({
      url: wsUrl,
      method: 'WEBSOCKET',
      type: 'websocket',
      sourceUrl,
      source: 'javascript',
    });
  }

  // ─── JS file imports/references ───────────────────────────
  const importRegex = /(?:import|require)\s*\(?["']([^"']+\.(?:js|mjs|cjs))["']\)?/gi;
  let importMatch: RegExpExecArray | null;
  while ((importMatch = importRegex.exec(jsContent)) !== null) {
    const raw = importMatch[1].trim();
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      jsFileRefs.push({
        url: raw,
        assetType: 'unknown',
        sourceUrl,
      });
    } else {
      const resolved = resolveUrl(sourceUrl, raw);
      if (resolved) {
        jsFileRefs.push({
          url: resolved,
          assetType: 'unknown',
          sourceUrl,
        });
      }
    }
  }

  return { endpoints, urls, jsFileRefs };
}

// ─── Parameter Extraction ────────────────────────────────────

/**
 * Extract query and path parameters from a URL.
 */
export function extractParameters(url: string): DiscoveredParameter[] {
  const params: DiscoveredParameter[] = [];
  try {
    const parsed = new URL(url);

    // Query parameters
    parsed.searchParams.forEach((value, name) => {
      params.push({
        name,
        location: 'query',
        url,
        value: value || undefined,
        inferredType: guessType(value),
        isCommon: false, // caller should compute
      });
    });

    // Path parameters (e.g., /users/:id, /api/v1/orders/{orderId})
    const pathSegments = parsed.pathname.split('/').map(s => decodeURIComponent(s));
    for (const segment of pathSegments) {
      const colonMatch = segment.match(/^:(.+)$/);
      const braceMatch = segment.match(/^\{(.+)\}$/);
      const paramName = colonMatch?.[1] ?? braceMatch?.[1];
      if (paramName) {
        params.push({
          name: paramName,
          location: 'path',
          url,
          inferredType: 'string',
          isCommon: false,
        });
      }
    }
  } catch { /* skip invalid URLs */ }

  return params;
}

// ─── External Domain Extraction ──────────────────────────────

/**
 * Classify URLs into in-scope and external domains.
 */
export function classifyExternalDomains(
  urls: readonly DiscoveredUrl[],
  baseHostname: string,
): DiscoveredExternalDomain[] {
  const domainMap = new Map<string, { refs: Set<string>; types: Set<string> }>();

  for (const u of urls) {
    const hostname = getHostname(u.url);
    if (!hostname || hostname.toLowerCase() === baseHostname.toLowerCase()) continue;

    let entry = domainMap.get(hostname.toLowerCase());
    if (!entry) {
      entry = { refs: new Set(), types: new Set() };
      domainMap.set(hostname.toLowerCase(), entry);
    }
    entry.refs.add(u.url);
    if (u.contentType) entry.types.add(u.contentType);
  }

  return Array.from(domainMap.entries()).map(([domain, data]) => ({
    domain,
    referencedFrom: [...data.refs],
    resourceTypes: [...data.types],
  }));
}

// ─── Static Resource Classification ──────────────────────────

const EXTENSION_MAP: Record<string, StaticResourceType> = {
  '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
  '.svg': 'image', '.webp': 'image', '.bmp': 'image', '.ico': 'favicon',
  '.woff': 'font', '.woff2': 'font', '.ttf': 'font', '.eot': 'font', '.otf': 'font',
  '.mp4': 'video', '.webm': 'video', '.avi': 'video', '.mov': 'video',
  '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.flac': 'audio',
  '.pdf': 'document', '.doc': 'document', '.docx': 'document',
  '.css': 'stylesheet',
};

export function classifyStaticResource(url: string, sourceUrl: string): DiscoveredStaticResource | null {
  const ext = getExtensionFromUrl(url);
  const type = EXTENSION_MAP[ext.toLowerCase()];
  if (!type) return null;
  return { url, type, extension: ext, sourceUrl };
}

// ─── JS Asset Classification ─────────────────────────────────

const JS_LIBRARY_PATTERNS: Array<{ pattern: RegExp; name: string; type: JsAssetType }> = [
  { pattern: /jquery/i, name: 'jQuery', type: 'library' },
  { pattern: /react\.js/i, name: 'React', type: 'framework' },
  { pattern: /react-dom/i, name: 'React DOM', type: 'framework' },
  { pattern: /vue\./i, name: 'Vue.js', type: 'framework' },
  { pattern: /angular/i, name: 'Angular', type: 'framework' },
  { pattern: /bootstrap/i, name: 'Bootstrap', type: 'library' },
  { pattern: /tailwind/i, name: 'Tailwind CSS', type: 'library' },
  { pattern: /analytics/i, name: 'Analytics', type: 'analytics' },
  { pattern: /gtag|google-analytics|ga\.js/i, name: 'Google Analytics', type: 'analytics' },
  { pattern: /gtm\.js|googletagmanager/i, name: 'Google Tag Manager', type: 'tag_manager' },
  { pattern: /hotjar/i, name: 'Hotjar', type: 'tracker' },
  { pattern: /facebook.*pixel|fbq/i, name: 'Facebook Pixel', type: 'tracker' },
  { pattern: /chunk\.|vendor\.|app\..*\.js|main\..*\.js|index\..*\.js/i, name: 'App Bundle', type: 'bundle' },
  { pattern: /\.min\.js$/i, name: 'Minified JS', type: 'unknown' },
];

export function classifyJsAsset(url: string, sourceUrl: string, content?: string): DiscoveredJsFile {
  const filename = url.split('/').pop() ?? '';
  const matchStr = filename + '|' + (content ?? '');
  let assetType: JsAssetType = 'unknown';
  let detectedName: string | undefined;

  for (const lib of JS_LIBRARY_PATTERNS) {
    if (lib.pattern.test(matchStr)) {
      assetType = lib.type;
      detectedName = lib.name;
      break;
    }
  }

  const isMinified = filename.includes('.min.') || (content ? content.length > 0 && !content.includes('\n  ') : undefined);

  return {
    url,
    assetType,
    sourceUrl,
    isMinified: isMinified ?? undefined,
    hash: undefined, // computed externally if needed
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function getAttribute(tag: string, attr: string): string | null {
  const regex = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i');
  const match = regex.exec(tag);
  return match ? match[1] : null;
}

function extractXmlTag(block: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}\\s*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = regex.exec(block);
  return match ? decodeEntities(match[1].trim()) : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return getExtension(pathname);
  } catch {
    const lastSlash = url.lastIndexOf('/');
    const fileName = lastSlash >= 0 ? url.slice(lastSlash + 1) : url;
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex <= 0) return '';
    return fileName.slice(dotIndex);
  }
}

function getExtension(pathname: string): string {
  const lastSlash = pathname.lastIndexOf('/');
  const fileName = lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname;
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0) return '';
  return fileName.slice(dotIndex);
}

function parseOptionalFloat(s: string | null | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

function guessType(value: string): string {
  if (value === 'true' || value === 'false') return 'boolean';
  if (value === '' || value === undefined) return 'string';
  if (/^-?\d+$/.test(value)) return 'number';
  if (/^-?\d+\.\d+$/.test(value)) return 'number';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) return 'email';
  if (/^https?:\/\//.test(value)) return 'url';
  return 'string';
}