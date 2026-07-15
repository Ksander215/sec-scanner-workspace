/**
 * Pipeline Stub Engines
 *
 * Test doubles that publish artifacts through Artifact Bus.
 * No real scanning logic — just simulate stage behavior.
 */

import { ArtifactCategory } from '../types.ts';
import type { StageHandler, PipelineArtifact, ArtifactBusReadonly, PipelineEventBusReadonly } from '../types.ts';

// ─── Discovery Stub ──────────────────────────────────────

/**
 * Simulates the Discovery stage.
 * Publishes: robots.txt, sitemap URLs, technology hints, WAF info.
 */
export function createDiscoveryStub(options?: {
  urls?: string[];
  delayMs?: number;
  shouldFail?: boolean;
}): StageHandler {
  return async ({ artifactBus, eventBus, abortSignal }) => {
    if (options?.delayMs) await delay(options.delayMs, abortSignal);
    if (options?.shouldFail) throw new Error('Discovery failed: DNS timeout');

    // Publish robots.txt
    artifactBus.publish({
      category: ArtifactCategory.Metadata,
      stageId: 'discovery',
      key: 'robots_txt',
      value: 'User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: /sitemap.xml',
      sourceEngine: 'discovery-stub',
    });

    // Publish sitemap URLs
    const sitemapUrls = options?.urls ?? [
      'https://example.com/',
      'https://example.com/about',
      'https://example.com/api/v1',
      'https://example.com/login',
    ];

    for (const url of sitemapUrls) {
      artifactBus.publish({
        category: ArtifactCategory.Urls,
        stageId: 'discovery',
        key: `url:${normalizeKey(url)}`,
        value: { url, method: 'GET', source: 'sitemap' },
        sourceEngine: 'discovery-stub',
      });
    }

    // Publish technology hints
    artifactBus.publish({
      category: ArtifactCategory.Technology,
      stageId: 'discovery',
      key: 'tech_stack',
      value: [
        { name: 'nginx', version: '1.24', category: 'server', confidence: 0.9 },
        { name: 'React', version: '18.2', category: 'framework', confidence: 0.8 },
      ],
      sourceEngine: 'discovery-stub',
    });

    // Publish TLS metadata
    artifactBus.publish({
      category: ArtifactCategory.Tls,
      stageId: 'discovery',
      key: 'tls',
      value: {
        protocol: 'TLS 1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
        issuer: "Let's Encrypt",
        notAfter: '2027-01-01T00:00:00Z',
        isExpired: false,
      },
      sourceEngine: 'discovery-stub',
    });

    // Publish response headers
    artifactBus.publish({
      category: ArtifactCategory.Headers,
      stageId: 'discovery',
      key: 'response_headers',
      value: {
        'server': 'nginx/1.24',
        'x-powered-by': 'Express',
        'content-type': 'text/html',
      },
      sourceEngine: 'discovery-stub',
    });

    return { urlsFound: sitemapUrls.length };
  };
}

// ─── Passive Analysis Stub ───────────────────────────────

/**
 * Simulates the Passive Analysis stage.
 * Publishes: header findings, cookie findings, TLS findings.
 */
export function createPassiveStub(options?: {
  findingsCount?: number;
  delayMs?: number;
  shouldFail?: boolean;
}): StageHandler {
  return async ({ artifactBus, abortSignal }) => {
    if (options?.delayMs) await delay(options.delayMs, abortSignal);
    if (options?.shouldFail) throw new Error('Passive analysis failed');

    const count = options?.findingsCount ?? 3;

    // Publish header-related findings
    const headers = artifactBus.get(ArtifactCategory.Headers, 'response_headers');
    const headerValues = (headers?.value as Record<string, string>) ?? {};

    if (!headerValues['x-frame-options']) {
      artifactBus.publish({
        category: ArtifactCategory.Findings,
        stageId: 'passive_analysis',
        key: 'finding:missing-xfo',
        value: {
          title: 'Missing X-Frame-Options Header',
          severity: 'low',
          description: 'The response does not include X-Frame-Options header.',
          location: { url: 'https://example.com' },
          evidence: [{ type: 'response_header', content: 'X-Frame-Options header not present' }],
          confidence: 0.95,
        },
        sourceEngine: 'passive-stub',
      });
    }

    if (!headerValues['content-security-policy']) {
      artifactBus.publish({
        category: ArtifactCategory.Findings,
        stageId: 'passive_analysis',
        key: 'finding:missing-csp',
        value: {
          title: 'Missing Content-Security-Policy Header',
          severity: 'medium',
          description: 'The response does not include Content-Security-Policy header.',
          location: { url: 'https://example.com' },
          evidence: [{ type: 'response_header', content: 'CSP header not present' }],
          confidence: 0.95,
        },
        sourceEngine: 'passive-stub',
      });
    }

    // Publish info disclosure finding
    if (headerValues['x-powered-by']) {
      artifactBus.publish({
        category: ArtifactCategory.Findings,
        stageId: 'passive_analysis',
        key: 'finding:info-disclosure',
        value: {
          title: 'Technology Disclosure via X-Powered-By',
          severity: 'info',
          description: `Server reveals technology: ${headerValues['x-powered-by']}`,
          location: { url: 'https://example.com' },
          evidence: [{ type: 'response_header', content: `X-Powered-By: ${headerValues['x-powered-by']}` }],
          confidence: 0.99,
        },
        sourceEngine: 'passive-stub',
      });
    }

    // Fill remaining count with generic findings
    for (let i = 3; i < count; i++) {
      artifactBus.publish({
        category: ArtifactCategory.Findings,
        stageId: 'passive_analysis',
        key: `finding:passive-${i}`,
        value: {
          title: `Passive Finding ${i}`,
          severity: 'info',
          description: 'A passive analysis finding from stub.',
          location: { url: 'https://example.com' },
          evidence: [],
          confidence: 0.8,
        },
        sourceEngine: 'passive-stub',
      });
    }

    return { findingsCount: count };
  };
}

// ─── Active Analysis Stub ────────────────────────────────

/**
 * Simulates the Active Analysis stage.
 * Publishes: vulnerability findings, forms, endpoints.
 */
export function createActiveStub(options?: {
  findingsCount?: number;
  formsCount?: number;
  endpointsCount?: number;
  delayMs?: number;
  shouldFail?: boolean;
}): StageHandler {
  return async ({ artifactBus, abortSignal }) => {
    if (options?.delayMs) await delay(options.delayMs, abortSignal);
    if (options?.shouldFail) throw new Error('Active analysis failed');

    const findingCount = options?.findingsCount ?? 2;
    const formsCount = options?.formsCount ?? 2;
    const endpointsCount = options?.endpointsCount ?? 3;

    // Publish forms
    for (let i = 0; i < formsCount; i++) {
      artifactBus.publish({
        category: ArtifactCategory.Forms,
        stageId: 'active_analysis',
        key: `form:login-${i}`,
        value: {
          action: i === 0 ? '/login' : '/api/v1/contact',
          method: i === 0 ? 'POST' : 'POST',
          inputs: [
            { name: i === 0 ? 'username' : 'email', type: 'text', required: true },
            { name: 'password', type: 'password', required: true },
            { name: 'csrf_token', type: 'hidden', required: false, value: 'abc123' },
          ],
          hasFileUpload: false,
          hasCaptcha: false,
          pageUrl: `https://example.com/${i === 0 ? 'login' : 'contact'}`,
          source: 'active-stub',
        },
        sourceEngine: 'active-stub',
      });
    }

    // Publish API endpoints
    for (let i = 0; i < endpointsCount; i++) {
      const paths = ['/api/v1/users', '/api/v1/products', '/api/v1/orders'];
      artifactBus.publish({
        category: ArtifactCategory.Endpoints,
        stageId: 'active_analysis',
        key: `endpoint:${paths[i]}`,
        value: {
          url: `https://example.com${paths[i]}`,
          method: 'GET',
          contentType: 'application/json',
          source: 'active-stub',
          isGraphql: false,
          isOpenapi: true,
        },
        sourceEngine: 'active-stub',
      });
    }

    // Publish vulnerability findings
    const vulns = [
      {
        title: 'Reflected Cross-Site Scripting',
        severity: 'high',
        description: 'XSS vulnerability in search parameter.',
        location: { url: 'https://example.com/search', parameter: 'q' },
        evidence: [{ type: 'request_response', content: 'GET /search?q=<script>alert(1)</script>' }],
        confidence: 0.9,
        templateId: 'xss-reflected',
      },
      {
        title: 'SQL Injection in Login Form',
        severity: 'critical',
        description: 'SQL injection in username parameter of login form.',
        location: { url: 'https://example.com/login', parameter: 'username' },
        evidence: [{ type: 'request_response', content: "POST /login username=admin' OR '1'='1" }],
        confidence: 0.85,
        templateId: 'sqli-login',
      },
    ];

    for (let i = 0; i < Math.min(findingCount, vulns.length); i++) {
      artifactBus.publish({
        category: ArtifactCategory.Findings,
        stageId: 'active_analysis',
        key: `finding:active-${i}`,
        value: vulns[i],
        sourceEngine: 'active-stub',
      });
    }

    return { findingsCount: findingCount, formsCount, endpointsCount };
  };
}

// ─── Target Validation Stub ──────────────────────────────

export function createTargetValidationStub(options?: {
  shouldFail?: boolean;
  delayMs?: number;
}): StageHandler {
  return async ({ artifactBus, abortSignal }) => {
    if (options?.delayMs) await delay(options.delayMs, abortSignal);
    if (options?.shouldFail) throw new Error('Target validation failed: connection refused');

    artifactBus.publish({
      category: ArtifactCategory.Metadata,
      stageId: 'target_validation',
      key: 'validated_target',
      value: {
        targetUrl: 'https://example.com',
        resolvedIp: '93.184.216.34',
        statusCode: 200,
        wafDetected: false,
        technologyHints: ['nginx', 'Express'],
      },
      sourceEngine: 'validation-stub',
    });

    artifactBus.publish({
      category: ArtifactCategory.Tls,
      stageId: 'target_validation',
      key: 'tls_initial',
      value: {
        protocol: 'TLS 1.3',
        issuer: "Let's Encrypt",
        isExpired: false,
      },
      sourceEngine: 'validation-stub',
    });

    return { statusCode: 200 };
  };
}

// ─── Result Normalization Stub ───────────────────────────

export function createNormalizationStub(): StageHandler {
  return async ({ artifactBus }) => {
    // Read all findings and re-publish as normalized
    const allFindings = artifactBus.getByCategory(ArtifactCategory.Findings);

    // Simple dedup by title
    const seen = new Set<string>();
    const deduped: PipelineArtifact[] = [];

    for (const f of allFindings) {
      const val = f.value as Record<string, unknown>;
      const title = (val.title as string) ?? '';
      if (!seen.has(title.toLowerCase())) {
        seen.add(title.toLowerCase());
        deduped.push(f);
      }
    }

    // Re-publish deduped findings (overwrite originals)
    for (const f of deduped) {
      artifactBus.publish({
        ...f,
        stageId: 'result_normalization',
      });
    }

    return { inputFindings: allFindings.length, outputFindings: deduped.length };
  };
}

// ─── Utilities ──────────────────────────────────────────

function normalizeKey(url: string): string {
  return url.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal.aborted) {
      clearTimeout(timer);
      resolve();
      return;
    }
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}