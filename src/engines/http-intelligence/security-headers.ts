/**
 * HTTP Intelligence Engine — Security Headers Intelligence
 *
 * Analyzes HTTP security headers not just for presence,
 * but for configuration correctness.
 *
 * Headers analyzed:
 * - Content-Security-Policy (CSP)
 * - Strict-Transport-Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - Permissions-Policy
 * - Cross-Origin-* headers
 * - Cache-Control (security implications)
 * - ETag (information leakage)
 * - Server (information disclosure)
 */

import type { HttpResponse } from './http-types.ts';
import {
  SecurityHeaderAnalysis,
  HeaderSecurityStatus,
  HeaderProfile,
} from './http-types.ts';
import { Severity } from '../../domain/scan-platform/types/index.ts';

// ═══════════════════════════════════════════════════════════════
// Header Analysis Functions
// ═══════════════════════════════════════════════════════════════

function getHeader(headers: ReadonlyMap<string, string>, name: string): string | null {
  // Case-insensitive lookup
  for (const [key, value] of headers) {
    if (key.toLowerCase() === name.toLowerCase()) return value;
  }
  return null;
}

// ─── CSP Analysis ─────────────────────────────────────────────

function analyzeCsp(headers: ReadonlyMap<string, string>): SecurityHeaderAnalysis {
  const csp = getHeader(headers, 'content-security-policy');
  const cspReportOnly = getHeader(headers, 'content-security-policy-report-only');

  if (!csp && !cspReportOnly) {
    return {
      headerName: 'Content-Security-Policy',
      value: null,
      status: HeaderSecurityStatus.Missing,
      severity: Severity.High,
      description: 'Content-Security-Policy header is not set',
      recommendation: 'Implement a Content-Security-Policy to prevent XSS, clickjacking, and data injection attacks. Start with a report-only mode to test.',
      details: { reportOnlyPresent: !!cspReportOnly },
    };
  }

  const effectiveCsp = csp ?? cspReportOnly ?? '';
  const isReportOnly = !csp && !!cspReportOnly;
  const issues: string[] = [];
  let score = 100;

  // Check for 'unsafe-inline' in script-src
  if (/script-src[^;]*'unsafe-inline'/.test(effectiveCsp)) {
    issues.push("script-src allows 'unsafe-inline' — XSS protection is significantly weakened");
    score -= 30;
  }

  // Check for 'unsafe-eval' in script-src
  if (/script-src[^;]*'unsafe-eval'/.test(effectiveCsp)) {
    issues.push("script-src allows 'unsafe-eval' — code injection via eval() is possible");
    score -= 25;
  }

  // Check for default-src
  if (!/default-src/.test(effectiveCsp)) {
    issues.push('No default-src directive — fallback behavior is undefined');
    score -= 10;
  }

  // Check for data: URI in script-src
  if (/script-src[^;]*data:/.test(effectiveCsp)) {
    issues.push("script-src allows data: URIs — potential script injection vector");
    score -= 15;
  }

  // Check for frame-ancestors
  if (!/frame-ancestors/.test(effectiveCsp)) {
    issues.push('No frame-ancestors directive — relies on X-Frame-Options for clickjacking protection');
    score -= 5;
  }

  // Check for form-action
  if (!/form-action/.test(effectiveCsp)) {
    issues.push('No form-action directive — forms can submit to any origin');
    score -= 5;
  }

  // Check for base-uri
  if (!/base-uri/.test(effectiveCsp)) {
    issues.push('No base-uri directive — base tag injection is possible');
    score -= 5;
  }

  // Check for object-src
  if (!/object-src/.test(effectiveCsp) && !/default-src/.test(effectiveCsp)) {
    issues.push('No object-src directive — plugin execution is not restricted');
    score -= 5;
  }

  let status: HeaderSecurityStatus;
  let severity: Severity;

  if (isReportOnly) {
    status = HeaderSecurityStatus.Warning;
    severity = Severity.Medium;
  } else if (score >= 80) {
    status = HeaderSecurityStatus.Secure;
    severity = Severity.Info;
  } else if (score >= 50) {
    status = HeaderSecurityStatus.Warning;
    severity = Severity.Medium;
  } else {
    status = HeaderSecurityStatus.Misconfigured;
    severity = Severity.Medium;
  }

  return {
    headerName: 'Content-Security-Policy',
    value: effectiveCsp.length > 200 ? effectiveCsp.slice(0, 200) + '...' : effectiveCsp,
    status,
    severity,
    description: `CSP ${isReportOnly ? '(report-only mode)' : 'is set'} with ${issues.length} issue(s)`,
    recommendation: issues.length > 0
      ? issues.join('. ') + '.'
      : 'CSP configuration is well-configured.',
    details: { issues, score, isReportOnly },
  };
}

// ─── HSTS Analysis ────────────────────────────────────────────

function analyzeHsts(headers: ReadonlyMap<string, string>): SecurityHeaderAnalysis {
  const hsts = getHeader(headers, 'strict-transport-security');

  if (!hsts) {
    return {
      headerName: 'Strict-Transport-Security',
      value: null,
      status: HeaderSecurityStatus.Missing,
      severity: Severity.Medium,
      description: 'HSTS header is not set — browser may fall back to HTTP',
      recommendation: 'Set Strict-Transport-Security with max-age >= 31536000 (1 year) and includeSubdomains for comprehensive protection.',
    };
  }

  const issues: string[] = [];
  let maxAge = 0;
  let includeSubdomains = false;
  let preload = false;

  for (const directive of hsts.split(';')) {
    const trimmed = directive.trim().toLowerCase();
    if (trimmed.startsWith('max-age=')) {
      maxAge = parseInt(trimmed.split('=')[1], 10) || 0;
    } else if (trimmed === 'includesubdomains') {
      includeSubdomains = true;
    } else if (trimmed === 'preload') {
      preload = true;
    }
  }

  if (maxAge < 86400) { // less than 1 day
    issues.push(`max-age is too short (${maxAge}s) — minimum recommendation is 86400 (1 day)`);
  }
  if (maxAge < 31536000) { // less than 1 year
    issues.push(`max-age is ${maxAge}s — recommended minimum is 31536000 (1 year)`);
  }
  if (!includeSubdomains) {
    issues.push('includeSubdomains is not set — subdomains are not covered');
  }
  if (!preload && includeSubdomains && maxAge >= 31536000) {
    issues.push('Consider adding preload directive for browser HSTS preloading');
  }

  const status = issues.length === 0
    ? HeaderSecurityStatus.Secure
    : HeaderSecurityStatus.Warning;

  return {
    headerName: 'Strict-Transport-Security',
    value: hsts,
    status,
    severity: issues.length > 0 ? Severity.Low : Severity.Info,
    description: `HSTS is set with max-age=${maxAge}${includeSubdomains ? ', includeSubdomains' : ''}`,
    recommendation: issues.length > 0 ? issues.join('. ') + '.' : 'HSTS configuration is strong.',
    details: { maxAge, includeSubdomains, preload },
  };
}

// ─── X-Frame-Options Analysis ─────────────────────────────────

function analyzeXFrameOptions(headers: ReadonlyMap<string, string>): SecurityHeaderAnalysis {
  const xfo = getHeader(headers, 'x-frame-options');
  const cspFrameAncestors = getHeader(headers, 'content-security-policy');
  const hasFrameAncestors = cspFrameAncestors?.includes('frame-ancestors') ?? false;

  if (!xfo && !hasFrameAncestors) {
    return {
      headerName: 'X-Frame-Options',
      value: null,
      status: HeaderSecurityStatus.Missing,
      severity: Severity.Medium,
      description: 'Neither X-Frame-Options nor CSP frame-ancestors is set — clickjacking possible',
      recommendation: 'Set X-Frame-Options to DENY or SAMEORIGIN, or use CSP frame-ancestors directive.',
    };
  }

  if (hasFrameAncestors && !xfo) {
    return {
      headerName: 'X-Frame-Options',
      value: null,
      status: HeaderSecurityStatus.Secure,
      severity: Severity.Info,
      description: 'CSP frame-ancestors is set — provides equivalent or better protection than X-Frame-Options',
      recommendation: 'X-Frame-Options is redundant when CSP frame-ancestors is configured, but recommended for legacy browser support.',
    };
  }

  if (!xfo) {
    return {
      headerName: 'X-Frame-Options',
      value: null,
      status: HeaderSecurityStatus.Secure,
      severity: Severity.Info,
      description: 'Protected via CSP frame-ancestors',
      recommendation: '',
    };
  }

  const value = xfo.toUpperCase().trim();
  if (value === 'DENY' || value === 'SAMEORIGIN') {
    return {
      headerName: 'X-Frame-Options',
      value: xfo,
      status: HeaderSecurityStatus.Secure,
      severity: Severity.Info,
      description: `X-Frame-Options is set to ${value}`,
      recommendation: value === 'SAMEORIGIN'
        ? 'SAMEORIGIN is appropriate for most applications. Use DENY if framing is never needed.'
        : 'DENY prevents all framing — appropriate if the page should never be embedded.',
    };
  }

  if (value === 'ALLOW-FROM') {
    return {
      headerName: 'X-Frame-Options',
      value: xfo,
      status: HeaderSecurityStatus.Warning,
      severity: Severity.Low,
      description: 'X-Frame-Options ALLOW-FROM is deprecated and not supported by modern browsers',
      recommendation: 'Migrate to CSP frame-ancestors directive for modern browser support.',
    };
  }

  return {
    headerName: 'X-Frame-Options',
    value: xfo,
    status: HeaderSecurityStatus.Misconfigured,
    severity: Severity.Medium,
    description: `X-Frame-Options has unexpected value: "${xfo}"`,
    recommendation: 'Use DENY, SAMEORIGIN, or migrate to CSP frame-ancestors.',
  };
}

// ─── X-Content-Type-Options ───────────────────────────────────

function analyzeXContentTypeOptions(headers: ReadonlyMap<string, string>): SecurityHeaderAnalysis {
  const xcto = getHeader(headers, 'x-content-type-options');

  if (!xcto) {
    return {
      headerName: 'X-Content-Type-Options',
      value: null,
      status: HeaderSecurityStatus.Missing,
      severity: Severity.Low,
      description: 'X-Content-Type-Options is not set — browser may MIME-sniff responses',
      recommendation: 'Set X-Content-Type-Options to "nosniff" to prevent MIME-type sniffing.',
    };
  }

  if (xcto.toLowerCase() === 'nosniff') {
    return {
      headerName: 'X-Content-Type-Options',
      value: xcto,
      status: HeaderSecurityStatus.Secure,
      severity: Severity.Info,
      description: 'X-Content-Type-Options is set to nosniff',
      recommendation: '',
    };
  }

  return {
    headerName: 'X-Content-Type-Options',
    value: xcto,
    status: HeaderSecurityStatus.Misconfigured,
    severity: Severity.Low,
    description: `X-Content-Type-Options has unexpected value: "${xcto}"`,
    recommendation: 'Set X-Content-Type-Options to "nosniff".',
  };
}

// ─── Referrer-Policy Analysis ─────────────────────────────────

function analyzeReferrerPolicy(headers: ReadonlyMap<string, string>): SecurityHeaderAnalysis {
  const rp = getHeader(headers, 'referrer-policy');
  const safePolicies = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'no-referrer-when-downgrade'];

  if (!rp) {
    return {
      headerName: 'Referrer-Policy',
      value: null,
      status: HeaderSecurityStatus.Warning,
      severity: Severity.Low,
      description: 'Referrer-Policy is not set — browser default (no-referrer-when-downgrade) will be used',
      recommendation: 'Set Referrer-Policy explicitly. "strict-origin-when-cross-origin" is a good default for most applications.',
    };
  }

  const policy = rp.toLowerCase().trim();
  const isSafe = safePolicies.includes(policy) || policy.startsWith('strict-origin');

  if (isSafe) {
    return {
      headerName: 'Referrer-Policy',
      value: rp,
      status: HeaderSecurityStatus.Secure,
      severity: Severity.Info,
      description: `Referrer-Policy is set to "${rp}"`,
      recommendation: policy === 'no-referrer' || policy === 'same-origin'
        ? 'This is a strict policy that maximizes privacy.'
        : 'This policy provides a good balance of security and usability.',
    };
  }

  if (policy === 'unsafe-url') {
    return {
      headerName: 'Referrer-Policy',
      value: rp,
      status: HeaderSecurityStatus.Vulnerable,
      severity: Severity.Medium,
      description: 'Referrer-Policy is set to unsafe-url — full URL is sent with all requests',
      recommendation: 'Change to "strict-origin-when-cross-origin" or "no-referrer". unsafe-url leaks path and query parameters.',
    };
  }

  if (policy === 'origin') {
    return {
      headerName: 'Referrer-Policy',
      value: rp,
      status: HeaderSecurityStatus.Warning,
      severity: Severity.Low,
      description: 'Referrer-Policy is set to origin — only the origin is sent',
      recommendation: 'Consider "strict-origin-when-cross-origin" for better security (strips referrer on cross-origin HTTPS→HTTP).',
    };
  }

  return {
    headerName: 'Referrer-Policy',
    value: rp,
    status: HeaderSecurityStatus.Warning,
    severity: Severity.Low,
    description: `Referrer-Policy has unrecognized value: "${rp}"`,
    recommendation: 'Use a standard policy: no-referrer, same-origin, strict-origin, or strict-origin-when-cross-origin.',
  };
}

// ─── Permissions-Policy Analysis ──────────────────────────────

function analyzePermissionsPolicy(headers: ReadonlyMap<string, string>): SecurityHeaderAnalysis {
  const pp = getHeader(headers, 'permissions-policy');
  const legacyPp = getHeader(headers, 'feature-policy');
  const effective = pp ?? legacyPp;

  if (!effective) {
    return {
      headerName: 'Permissions-Policy',
      value: null,
      status: HeaderSecurityStatus.Warning,
      severity: Severity.Low,
      description: 'Permissions-Policy (or legacy Feature-Policy) is not set — all browser features are available',
      recommendation: 'Set Permissions-Policy to restrict unnecessary browser features (camera, microphone, geolocation, etc.).',
    };
  }

  const issues: string[] = [];
  const directives = effective.split(',');

  // Check for overly permissive directives
  for (const directive of directives) {
    const trimmed = directive.trim();
    if (trimmed.endsWith('= *')) {
      const feature = trimmed.split('=')[0].trim();
      issues.push(`${feature} is allowed for all origins (*) — consider restricting`);
    }
  }

  // Check important security-restricted features
  const sensitiveFeatures = ['camera', 'microphone', 'geolocation', 'payment', 'usb', 'magnetometer'];
  const enabledFeatures: string[] = [];
  const restrictedFeatures: string[] = [];

  for (const feature of sensitiveFeatures) {
    const pattern = new RegExp(`\\b${feature}\\s*=\\s*\\*\\s*$`, 'i');
    if (pattern.test(effective)) {
      enabledFeatures.push(feature);
    } else if (effective.includes(feature)) {
      restrictedFeatures.push(feature);
    }
  }

  if (enabledFeatures.length > 0) {
    issues.push(`Sensitive features allowed for all origins: ${enabledFeatures.join(', ')}`);
  }

  const status = issues.length === 0
    ? HeaderSecurityStatus.Secure
    : HeaderSecurityStatus.Warning;

  return {
    headerName: 'Permissions-Policy',
    value: effective.length > 200 ? effective.slice(0, 200) + '...' : effective,
    status,
    severity: issues.length > 0 ? Severity.Low : Severity.Info,
    description: `Permissions-Policy defines ${directives.length} directive(s)`,
    recommendation: issues.length > 0 ? issues.join('. ') + '.' : 'Permissions-Policy appropriately restricts browser features.',
    details: { sensitiveFeaturesRestricted: restrictedFeatures, sensitiveFeaturesOpen: enabledFeatures },
  };
}

// ─── Cross-Origin Headers Analysis ────────────────────────────

function analyzeCrossOriginHeaders(headers: ReadonlyMap<string, string>): SecurityHeaderAnalysis[] {
  const analyses: SecurityHeaderAnalysis[] = [];

  // Cross-Origin-Opener-Policy
  const coop = getHeader(headers, 'cross-origin-opener-policy');
  if (!coop) {
    analyses.push({
      headerName: 'Cross-Origin-Opener-Policy',
      value: null,
      status: HeaderSecurityStatus.Warning,
      severity: Severity.Low,
      description: 'COOP not set — page can be controlled by cross-origin windows',
      recommendation: 'Set Cross-Origin-Opener-Policy to "same-origin" for isolated browsing context.',
    });
  } else if (coop.toLowerCase().includes('same-origin')) {
    analyses.push({
      headerName: 'Cross-Origin-Opener-Policy',
      value: coop,
      status: HeaderSecurityStatus.Secure,
      severity: Severity.Info,
      description: 'COOP is set to same-origin — cross-origin isolation enabled',
      recommendation: '',
    });
  } else {
    analyses.push({
      headerName: 'Cross-Origin-Opener-Policy',
      value: coop,
      status: HeaderSecurityStatus.Warning,
      severity: Severity.Low,
      description: `COOP is set to "${coop}" — review if appropriate for isolation requirements`,
      recommendation: 'Use "same-origin" for maximum cross-origin isolation.',
    });
  }

  // Cross-Origin-Resource-Policy
  const corp = getHeader(headers, 'cross-origin-resource-policy');
  if (!corp) {
    analyses.push({
      headerName: 'Cross-Origin-Resource-Policy',
      value: null,
      status: HeaderSecurityStatus.Warning,
      severity: Severity.Low,
      description: 'CORP not set — resources can be embedded by any origin',
      recommendation: 'Set Cross-Origin-Resource-Policy to "same-origin" or "same-site" to control resource embedding.',
    });
  } else {
    const val = corp.toLowerCase().trim();
    const isGood = val === 'same-origin' || val === 'same-site';
    analyses.push({
      headerName: 'Cross-Origin-Resource-Policy',
      value: corp,
      status: isGood ? HeaderSecurityStatus.Secure : HeaderSecurityStatus.Warning,
      severity: isGood ? Severity.Info : Severity.Low,
      description: `CORP is set to "${corp}"`,
      recommendation: isGood ? '' : 'Consider "same-origin" or "same-site" for stricter control.',
    });
  }

  // Cross-Origin-Embedder-Policy
  const coep = getHeader(headers, 'cross-origin-embedder-policy');
  if (!coep) {
    analyses.push({
      headerName: 'Cross-Origin-Embedder-Policy',
      value: null,
      status: HeaderSecurityStatus.Warning,
      severity: Severity.Low,
      description: 'COEP not set — cross-origin resources can be loaded without explicit permission',
      recommendation: 'Set Cross-Origin-Embedder-Policy to "require-corp" to ensure cross-origin isolation (needed for SharedArrayBuffer).',
    });
  } else {
    analyses.push({
      headerName: 'Cross-Origin-Embedder-Policy',
      value: coep,
      status: HeaderSecurityStatus.Secure,
      severity: Severity.Info,
      description: `COEP is set to "${coep}"`,
      recommendation: '',
    });
  }

  return analyses;
}

// ─── Server Header Analysis ───────────────────────────────────

function analyzeServerHeader(headers: ReadonlyMap<string, string>): SecurityHeaderAnalysis {
  const server = getHeader(headers, 'server');

  if (!server) {
    return {
      headerName: 'Server',
      value: null,
      status: HeaderSecurityStatus.Secure,
      severity: Severity.Info,
      description: 'Server header is not disclosed',
      recommendation: 'Good practice — not disclosing server version reduces information leakage.',
    };
  }

  const versionMatch = server.match(/\d+\.\d+/);
  const hasVersion = !!versionMatch;

  return {
    headerName: 'Server',
    value: server,
    status: hasVersion ? HeaderSecurityStatus.Warning : HeaderSecurityStatus.Secure,
    severity: hasVersion ? Severity.Low : Severity.Info,
    description: hasVersion
      ? `Server header discloses version information: "${server}"`
      : `Server header is present but does not disclose version: "${server}"`,
    recommendation: hasVersion
      ? 'Remove version information from Server header to reduce fingerprinting and attack surface.'
      : 'Server header is reasonably configured.',
  };
}

// ─── Cache-Control Security Analysis ──────────────────────────

function analyzeCacheControl(headers: ReadonlyMap<string, string>): SecurityHeaderAnalysis {
  const cc = getHeader(headers, 'cache-control');

  if (!cc) {
    return {
      headerName: 'Cache-Control',
      value: null,
      status: HeaderSecurityStatus.Warning,
      severity: Severity.Info,
      description: 'Cache-Control is not set — browser will use heuristic caching',
      recommendation: 'Set explicit Cache-Control headers to control caching behavior for sensitive resources.',
    };
  }

  const lower = cc.toLowerCase();
  const issues: string[] = [];

  if (lower.includes('public') && !lower.includes('max-age=0')) {
    issues.push('Cache is public — sensitive data may be cached by intermediaries');
  }

  if (!lower.includes('no-store') && !lower.includes('private')) {
    issues.push('Consider adding "no-store" or "private" for sensitive content');
  }

  const status = issues.length === 0
    ? HeaderSecurityStatus.Secure
    : HeaderSecurityStatus.Warning;

  return {
    headerName: 'Cache-Control',
    value: cc,
    status,
    severity: Severity.Info,
    description: `Cache-Control is set to "${cc}"`,
    recommendation: issues.length > 0 ? issues.join('. ') + '.' : 'Cache-Control is appropriately configured.',
  };
}

// ─── ETag Analysis ────────────────────────────────────────────

function analyzeEtag(headers: ReadonlyMap<string, string>): SecurityHeaderAnalysis {
  const etag = getHeader(headers, 'etag');

  if (!etag) {
    return {
      headerName: 'ETag',
      value: null,
      status: HeaderSecurityStatus.Secure,
      severity: Severity.Info,
      description: 'ETag is not set',
      recommendation: 'Not required but recommended for cache validation.',
    };
  }

  // Check if ETag leaks information (e.g., inode)
  if (etag.startsWith('"') && etag.includes('-')) {
    const inner = etag.replace(/"/g, '');
    // inode-size-mtime pattern (Apache/nginx default)
    const parts = inner.split('-');
    if (parts.length === 3 && parts.every(p => /^\d+$/.test(p))) {
      return {
        headerName: 'ETag',
        value: etag,
        status: HeaderSecurityStatus.Warning,
        severity: Severity.Low,
        description: 'ETag appears to use inode-size-mtime format — may leak file system information',
        recommendation: 'Configure server to use strong ETags that do not expose internal file system details.',
        details: { pattern: 'inode-size-mtime' },
      };
    }
  }

  return {
    headerName: 'ETag',
    value: etag,
    status: HeaderSecurityStatus.Secure,
    severity: Severity.Info,
    description: 'ETag is set and does not appear to leak information',
    recommendation: '',
  };
}

// ═══════════════════════════════════════════════════════════════
// Security Headers Intelligence — Main Class
// ═══════════════════════════════════════════════════════════════

export class SecurityHeadersIntelligence {
  /**
   * Analyze all security headers from an HTTP response.
   */
  analyze(response: HttpResponse): HeaderProfile {
    const analyses: SecurityHeaderAnalysis[] = [
      analyzeCsp(response.headers),
      analyzeHsts(response.headers),
      analyzeXFrameOptions(response.headers),
      analyzeXContentTypeOptions(response.headers),
      analyzeReferrerPolicy(response.headers),
      analyzePermissionsPolicy(response.headers),
      analyzeServerHeader(response.headers),
      analyzeCacheControl(response.headers),
      analyzeEtag(response.headers),
      ...analyzeCrossOriginHeaders(response.headers),
    ];

    let secureCount = 0;
    let warningCount = 0;
    let missingCount = 0;
    let misconfiguredCount = 0;
    let vulnerableCount = 0;

    for (const a of analyses) {
      switch (a.status) {
        case HeaderSecurityStatus.Secure: secureCount++; break;
        case HeaderSecurityStatus.Warning: warningCount++; break;
        case HeaderSecurityStatus.Missing: missingCount++; break;
        case HeaderSecurityStatus.Misconfigured: misconfiguredCount++; break;
        case HeaderSecurityStatus.Vulnerable: vulnerableCount++; break;
      }
    }

    // Calculate overall score (0–100)
    const total = analyses.length;
    const score = total > 0 ? Math.round(
      (secureCount * 100 + warningCount * 50 + missingCount * 20 + misconfiguredCount * 30 + vulnerableCount * 0) / total
    ) : 100;

    return Object.freeze({
      url: response.url,
      analyses: Object.freeze(analyses),
      secureCount,
      warningCount,
      missingCount,
      misconfiguredCount,
      vulnerableCount,
      overallScore: score,
    });
  }

  /**
   * Analyze a single header by name (for targeted testing).
   */
  analyzeHeader(headers: ReadonlyMap<string, string>, headerName: string): SecurityHeaderAnalysis | null {
    const name = headerName.toLowerCase();
    switch (name) {
      case 'content-security-policy': return analyzeCsp(headers);
      case 'strict-transport-security': return analyzeHsts(headers);
      case 'x-frame-options': return analyzeXFrameOptions(headers);
      case 'x-content-type-options': return analyzeXContentTypeOptions(headers);
      case 'referrer-policy': return analyzeReferrerPolicy(headers);
      case 'permissions-policy':
      case 'feature-policy': return analyzePermissionsPolicy(headers);
      case 'server': return analyzeServerHeader(headers);
      case 'cache-control': return analyzeCacheControl(headers);
      case 'etag': return analyzeEtag(headers);
      default: return null;
    }
  }
}