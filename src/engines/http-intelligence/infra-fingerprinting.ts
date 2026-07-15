/**
 * HTTP Intelligence Engine — Infrastructure Fingerprinting
 *
 * Identifies technology stack components from HTTP responses:
 * - CDN (Cloudflare, Akamai, Fastly, etc.)
 * - Reverse Proxy (nginx, HAProxy, etc.)
 * - WAF (Cloudflare WAF, AWS WAF, ModSecurity, etc.)
 * - Load Balancer (AWS ALB, GCP LB, etc.)
 * - Web Server (Apache, nginx, IIS, etc.)
 * - Application Server (Tomcat, Express, etc.)
 * - Framework (Django, Rails, Laravel, etc.)
 * - Cloud Provider (AWS, GCP, Azure, etc.)
 */

import type { HttpResponse } from './http-types.ts';
import {
  InfrastructureType,
  FingerprintMatch,
  InfrastructureProfile,
} from './http-types.ts';

// ═══════════════════════════════════════════════════════════════
// Fingerprint Databases
// ═══════════════════════════════════════════════════════════════

interface FingerprintRule {
  readonly type: InfrastructureType;
  readonly name: string;
  readonly versionRegex?: RegExp;
  readonly evidence: readonly string[];
  /** Match function — receives headers, body, cookies, returns confidence 0-1. */
  readonly match: (ctx: MatchContext) => number;
}

interface MatchContext {
  readonly headers: ReadonlyMap<string, string>;
  readonly body: string;
  readonly url: string;
  readonly statusCode: number;
  readonly cookies: ReadonlyMap<string, string>;
}

function getHeader(headers: ReadonlyMap<string, string>, name: string): string | null {
  for (const [key, value] of headers) {
    if (key.toLowerCase() === name.toLowerCase()) return value;
  }
  return null;
}

// ─── CDN Fingerprints ─────────────────────────────────────────

const CDN_RULES: FingerprintRule[] = [
  {
    type: InfrastructureType.CDN, name: 'Cloudflare',
    evidence: ['cf-ray header', 'cloudflare cookies', 'server header'],
    match: (ctx) => {
      let score = 0;
      if (getHeader(ctx.headers, 'cf-ray')) score += 0.6;
      if (getHeader(ctx.headers, 'cf-cache-status')) score += 0.3;
      const server = getHeader(ctx.headers, 'server') ?? '';
      if (server.toLowerCase().includes('cloudflare')) score += 0.8;
      // Cloudflare cookies
      for (const [name] of ctx.cookies) {
        if (name.startsWith('__cf')) { score += 0.2; break; }
      }
      return Math.min(1, score);
    },
  },
  {
    type: InfrastructureType.CDN, name: 'Akamai',
    evidence: ['x-akamai headers', 'akamai cookies'],
    match: (ctx) => {
      let score = 0;
      if (getHeader(ctx.headers, 'x-akamai-staging')) score += 0.7;
      if (getHeader(ctx.headers, 'x-akamai-request-id')) score += 0.7;
      if (getHeader(ctx.headers, 'x-cache')) {
        const xCache = getHeader(ctx.headers, 'x-cache') ?? '';
        if (xCache.includes('akamai') || xCache.includes('AkamaiGHost')) score += 0.6;
      }
      for (const [name] of ctx.cookies) {
        if (name.startsWith('ak_bmsc')) { score += 0.5; break; }
      }
      return Math.min(1, score);
    },
  },
  {
    type: InfrastructureType.CDN, name: 'Fastly',
    evidence: ['x-fastly-request-id', 'x-served-by'],
    match: (ctx) => {
      let score = 0;
      if (getHeader(ctx.headers, 'x-fastly-request-id')) score += 0.7;
      if (getHeader(ctx.headers, 'x-served-by')) score += 0.5;
      if (getHeader(ctx.headers, 'x-cache')) {
        const xCache = getHeader(ctx.headers, 'x-cache') ?? '';
        if (xCache.includes('HIT') || xCache.includes('MISS')) score += 0.2;
      }
      return Math.min(1, score);
    },
  },
  {
    type: InfrastructureType.CDN, name: 'CloudFront',
    evidence: ['x-amz-cf-id', 'x-cache header pattern'],
    match: (ctx) => {
      let score = 0;
      if (getHeader(ctx.headers, 'x-amz-cf-id')) score += 0.8;
      if (getHeader(ctx.headers, 'via')?.includes('cloudfront')) score += 0.7;
      const xCache = getHeader(ctx.headers, 'x-cache') ?? '';
      if (xCache.startsWith('Hit from CloudFront') || xCache.startsWith('Miss from CloudFront')) {
        score += 0.8;
      }
      return Math.min(1, score);
    },
  },
];

// ─── WAF Fingerprints ─────────────────────────────────────────

const WAF_RULES: FingerprintRule[] = [
  {
    type: InfrastructureType.WAF, name: 'Cloudflare WAF',
    evidence: ['cf-mitigated header', 'cloudflare challenge page'],
    match: (ctx) => {
      if (getHeader(ctx.headers, 'cf-mitigated') === 'challenge') return 0.9;
      if (ctx.statusCode === 403 && ctx.body.includes('cloudflare')) return 0.8;
      if (getHeader(ctx.headers, 'cf-chl-bypass')) return 0.7;
      return 0;
    },
  },
  {
    type: InfrastructureType.WAF, name: 'AWS WAF',
    evidence: ['x-amzn-requestid', 'awswaf cookies'],
    match: (ctx) => {
      if (getHeader(ctx.headers, 'x-amzn-waf-action')) return 0.9;
      if (ctx.statusCode === 403 && ctx.body.includes('AWS WAF')) return 0.8;
      if (getHeader(ctx.headers, 'x-amzn-requestid') && ctx.statusCode === 403) return 0.4;
      return 0;
    },
  },
  {
    type: InfrastructureType.WAF, name: 'ModSecurity',
    evidence: ['modsecurity headers', 'unique 403 patterns'],
    match: (ctx) => {
      if (getHeader(ctx.headers, 'x-modsecurity-rule-id')) return 0.95;
      if (ctx.body.includes('ModSecurity') || ctx.body.includes('mod_security')) return 0.8;
      if (getHeader(ctx.headers, 'server')?.toLowerCase().includes('mod_security')) return 0.9;
      return 0;
    },
  },
];

// ─── Web Server Fingerprints ──────────────────────────────────

const WEBSERVER_RULES: FingerprintRule[] = [
  {
    type: InfrastructureType.WebServer, name: 'nginx',
    evidence: ['server header'],
    match: (ctx) => {
      const server = getHeader(ctx.headers, 'server') ?? '';
      const match = server.match(/nginx\/([\d.]+)/i);
      if (match) return 0.95;
      if (server.toLowerCase() === 'nginx') return 0.9;
      // nginx-specific headers
      if (getHeader(ctx.headers, 'x-powered-by') === 'Express' && server.includes('nginx')) return 0.5;
      return 0;
    },
    versionRegex: /nginx\/([\d.]+)/i,
  },
  {
    type: InfrastructureType.WebServer, name: 'Apache',
    evidence: ['server header', 'signature patterns'],
    match: (ctx) => {
      const server = getHeader(ctx.headers, 'server') ?? '';
      const match = server.match(/Apache\/([\d.]+)/i);
      if (match) return 0.95;
      if (server.toLowerCase().includes('apache')) return 0.85;
      // Apache-specific patterns
      if (getHeader(ctx.headers, 'x-frame-options') === 'SAMEORIGIN' && ctx.body.includes('Apache')) return 0.5;
      return 0;
    },
    versionRegex: /Apache\/([\d.]+)/i,
  },
  {
    type: InfrastructureType.WebServer, name: 'IIS',
    evidence: ['server header', 'x-powered-by'],
    match: (ctx) => {
      const server = getHeader(ctx.headers, 'server') ?? '';
      const match = server.match(/Microsoft-IIS\/([\d.]+)/i);
      if (match) return 0.95;
      if (server.includes('IIS')) return 0.85;
      if (getHeader(ctx.headers, 'x-powered-by')?.includes('ASP.NET')) return 0.6;
      if (getHeader(ctx.headers, 'x-aspnet-version')) return 0.7;
      return 0;
    },
    versionRegex: /Microsoft-IIS\/([\d.]+)/i,
  },
  {
    type: InfrastructureType.WebServer, name: 'Caddy',
    evidence: ['server header'],
    match: (ctx) => {
      const server = getHeader(ctx.headers, 'server') ?? '';
      if (server.toLowerCase().startsWith('caddy')) return 0.9;
      return 0;
    },
    versionRegex: /Caddy\/([\d.]+)/i,
  },
  {
    type: InfrastructureType.WebServer, name: 'OpenResty',
    evidence: ['server header'],
    match: (ctx) => {
      const server = getHeader(ctx.headers, 'server') ?? '';
      if (server.toLowerCase().includes('openresty')) return 0.95;
      return 0;
    },
    versionRegex: /openresty\/([\d.]+)/i,
  },
];

// ─── Framework Fingerprints ───────────────────────────────────

const FRAMEWORK_RULES: FingerprintRule[] = [
  {
    type: InfrastructureType.Framework, name: 'Django',
    evidence: ['csrfmiddleware token cookie', 'x-frame-options pattern'],
    match: (ctx) => {
      let score = 0;
      if (getHeader(ctx.headers, 'x-frame-options') === 'DENY' || getHeader(ctx.headers, 'x-frame-options') === 'SAMEORIGIN') score += 0.2;
      for (const [name] of ctx.cookies) {
        if (name === 'csrftoken') { score += 0.6; break; }
      }
      if (ctx.body.includes('csrfmiddlewaretoken')) score += 0.5;
      if (getHeader(ctx.headers, 'set-cookie')?.includes('django')) score += 0.4;
      return Math.min(1, score);
    },
  },
  {
    type: InfrastructureType.Framework, name: 'Ruby on Rails',
    evidence: ['x-rack-cache', 'csrf-param cookie'],
    match: (ctx) => {
      let score = 0;
      if (getHeader(ctx.headers, 'x-rack-cache')) score += 0.6;
      if (getHeader(ctx.headers, 'x-runtime')) score += 0.5;
      if (getHeader(ctx.headers, 'x-request-id') && getHeader(ctx.headers, 'x-ua-compatible')) score += 0.2;
      for (const [name] of ctx.cookies) {
        if (name === '_session_id' || name === 'csrf-param') { score += 0.4; break; }
      }
      return Math.min(1, score);
    },
  },
  {
    type: InfrastructureType.Framework, name: 'Laravel',
    evidence: ['laravel_session cookie', 'x-powered-by'],
    match: (ctx) => {
      let score = 0;
      for (const [name] of ctx.cookies) {
        if (name === 'laravel_session') { score += 0.7; break; }
      }
      if (getHeader(ctx.headers, 'x-powered-by')?.includes('Laravel')) score += 0.8;
      if (ctx.body.includes('laravel')) score += 0.3;
      return Math.min(1, score);
    },
  },
  {
    type: InfrastructureType.Framework, name: 'Express',
    evidence: ['x-powered-by header'],
    match: (ctx) => {
      const xPowered = getHeader(ctx.headers, 'x-powered-by');
      if (xPowered?.includes('Express')) return 0.9;
      return 0;
    },
  },
  {
    type: InfrastructureType.Framework, name: 'Next.js',
    evidence: ['x-nextjs headers', '__next framework'],
    match: (ctx) => {
      let score = 0;
      if (getHeader(ctx.headers, 'x-nextjs-cache')) score += 0.7;
      if (ctx.body.includes('__next') || ctx.body.includes('_next/static')) score += 0.6;
      if (getHeader(ctx.headers, 'x-powered-by')?.includes('Next.js')) score += 0.9;
      return Math.min(1, score);
    },
  },
  {
    type: InfrastructureType.Framework, name: 'Spring Boot',
    evidence: ['x-application-context', 'error page patterns'],
    match: (ctx) => {
      let score = 0;
      if (getHeader(ctx.headers, 'x-application-context')) score += 0.7;
      if (ctx.body.includes('Whitelabel Error Page')) score += 0.8;
      if (ctx.body.includes('Spring Boot')) score += 0.6;
      if (getHeader(ctx.headers, 'set-cookie')?.includes('JSESSIONID')) score += 0.3;
      return Math.min(1, score);
    },
  },
];

// ─── Cloud Provider Fingerprints ──────────────────────────────

const CLOUD_RULES: FingerprintRule[] = [
  {
    type: InfrastructureType.CloudProvider, name: 'AWS',
    evidence: ['x-amz headers', 'awselb cookies', 's3 bucket patterns'],
    match: (ctx) => {
      let score = 0;
      if (getHeader(ctx.headers, 'x-amz-request-id')) score += 0.5;
      if (getHeader(ctx.headers, 'x-amz-id-2')) score += 0.5;
      if (getHeader(ctx.headers, 'x-amz-cf-id')) score += 0.6;
      for (const [name] of ctx.cookies) {
        if (name === 'AWSELB' || name === 'AWSALB') { score += 0.5; break; }
      }
      if (getHeader(ctx.headers, 'server')?.includes('AmazonS3')) score += 0.8;
      if (getHeader(ctx.headers, 'x-amzn-trace-id')) score += 0.3;
      return Math.min(1, score);
    },
  },
  {
    type: InfrastructureType.CloudProvider, name: 'Google Cloud',
    evidence: ['x-goog headers', 'GFE patterns'],
    match: (ctx) => {
      let score = 0;
      if (getHeader(ctx.headers, 'x-goog-request-id')) score += 0.6;
      if (getHeader(ctx.headers, 'via')?.includes('google')) score += 0.5;
      if (getHeader(ctx.headers, 'server')?.includes('gws')) score += 0.7;
      if (getHeader(ctx.headers, 'x-cloud-trace-context')) score += 0.5;
      return Math.min(1, score);
    },
  },
  {
    type: InfrastructureType.CloudProvider, name: 'Azure',
    evidence: ['x-azure headers', 'x-ms-request-id'],
    match: (ctx) => {
      let score = 0;
      if (getHeader(ctx.headers, 'x-azure-request-id') || getHeader(ctx.headers, 'x-ms-request-id')) score += 0.6;
      if (getHeader(ctx.headers, 'x-azure-ref')) score += 0.5;
      if (getHeader(ctx.headers, 'server')?.includes('Microsoft Azure')) score += 0.7;
      if (getHeader(ctx.headers, 'x-powered-by')?.includes('ASP.NET') && getHeader(ctx.headers, 'x-azure')) score += 0.5;
      return Math.min(1, score);
    },
  },
];

// ─── Reverse Proxy Fingerprints ───────────────────────────────

const REVERSE_PROXY_RULES: FingerprintRule[] = [
  {
    type: InfrastructureType.ReverseProxy, name: 'HAProxy',
    evidence: ['x-haproxy headers'],
    match: (ctx) => {
      if (getHeader(ctx.headers, 'x-haproxy-current-time')) return 0.9;
      if (getHeader(ctx.headers, 'x-forwarded-proto') && getHeader(ctx.headers, 'x-forwarded-port')) return 0.3;
      return 0;
    },
  },
  {
    type: InfrastructureType.ReverseProxy, name: 'Traefik',
    evidence: ['traefik headers'],
    match: (ctx) => {
      if (getHeader(ctx.headers, 'x-traefik-rewrite-url')) return 0.9;
      return 0;
    },
  },
];

// ─── Load Balancer Fingerprints ───────────────────────────────

const LB_RULES: FingerprintRule[] = [
  {
    type: InfrastructureType.LoadBalancer, name: 'AWS ALB',
    evidence: ['AWSELB cookie', 'x-amzn-trace-id'],
    match: (ctx) => {
      let score = 0;
      for (const [name] of ctx.cookies) {
        if (name === 'AWSELB') { score += 0.7; break; }
      }
      if (getHeader(ctx.headers, 'x-amzn-trace-id') && !getHeader(ctx.headers, 'x-amz-cf-id')) score += 0.3;
      return Math.min(1, score);
    },
  },
  {
    type: InfrastructureType.LoadBalancer, name: 'AWS ELB',
    evidence: ['awselb classic patterns'],
    match: (ctx) => {
      for (const [name] of ctx.cookies) {
        if (name === 'AWSELB') return 0.7;
      }
      return 0;
    },
  },
  {
    type: InfrastructureType.LoadBalancer, name: 'GCP Load Balancer',
    evidence: ['x-google metadata', 'GFE via header'],
    match: (ctx) => {
      const via = getHeader(ctx.headers, 'via');
      if (via?.includes('gfe') || via?.includes('google')) return 0.7;
      return 0;
    },
  },
];

// ═══════════════════════════════════════════════════════════════
// All Rules Combined
// ═══════════════════════════════════════════════════════════════

const ALL_RULES: readonly FingerprintRule[] = [
  ...CDN_RULES,
  ...WAF_RULES,
  ...WEBSERVER_RULES,
  ...FRAMEWORK_RULES,
  ...CLOUD_RULES,
  ...REVERSE_PROXY_RULES,
  ...LB_RULES,
];

// ═══════════════════════════════════════════════════════════════
// Infrastructure Fingerprinting — Main Class
// ═══════════════════════════════════════════════════════════════

export class InfrastructureFingerprinting {
  /**
   * Fingerprint the infrastructure from an HTTP response.
   */
  fingerprint(response: HttpResponse, cookies: ReadonlyMap<string, string> = new Map()): InfrastructureProfile {
    const ctx: MatchContext = {
      headers: response.headers,
      body: response.body,
      url: response.url,
      statusCode: response.statusCode,
      cookies,
    };

    const fingerprints: FingerprintMatch[] = [];
    const MIN_CONFIDENCE = 0.3;

    for (const rule of ALL_RULES) {
      const confidence = rule.match(ctx);
      if (confidence >= MIN_CONFIDENCE) {
        // Try to extract version
        let version: string | undefined;
        if (rule.versionRegex) {
          // Check server header first
          const server = getHeader(response.headers, 'server') ?? '';
          const match = server.match(rule.versionRegex);
          if (match) version = match[1];
        }

        fingerprints.push({
          type: rule.type,
          name: rule.name,
          version,
          confidence,
          evidence: rule.evidence,
        });
      }
    }

    // Sort by confidence descending
    fingerprints.sort((a, b) => b.confidence - a.confidence);

    // Categorize
    const pick = (type: InfrastructureType): FingerprintMatch | null => {
      return fingerprints.find(f => f.type === type) ?? null;
    };

    return Object.freeze({
      url: response.url,
      fingerprints: Object.freeze(fingerprints),
      cdn: pick(InfrastructureType.CDN),
      reverseProxy: pick(InfrastructureType.ReverseProxy),
      waf: pick(InfrastructureType.WAF),
      loadBalancer: pick(InfrastructureType.LoadBalancer),
      webServer: pick(InfrastructureType.WebServer),
      applicationServer: pick(InfrastructureType.ApplicationServer),
      framework: pick(InfrastructureType.Framework),
      cloudProvider: pick(InfrastructureType.CloudProvider),
    });
  }
}