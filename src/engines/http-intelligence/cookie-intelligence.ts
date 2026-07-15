/**
 * HTTP Intelligence Engine — Cookie Intelligence
 *
 * Analyzes cookies for security:
 * - Secure flag
 * - HttpOnly flag
 * - SameSite attribute
 * - Domain and path scope
 * - Lifetime analysis
 * - __Host- and __Secure- prefix compliance
 * - Security issue detection
 */

import type { HttpResponse } from './http-types.ts';
import {
  CookieAnalysis,
  CookieIssue,
  CookieProfile,
  CookiePrefix,
} from './http-types.ts';
import { Severity } from '../../domain/scan-platform/types/index.ts';

// ═══════════════════════════════════════════════════════════════
// Cookie Parsing
// ═══════════════════════════════════════════════════════════════

interface ParsedCookie {
  readonly name: string;
  readonly value: string;
  readonly attributes: Map<string, string>;
}

function parseSetCookieHeader(setCookieHeader: string): ParsedCookie {
  const parts = setCookieHeader.split(';');
  const nameValue = parts[0].trim();
  const eqIdx = nameValue.indexOf('=');
  const name = eqIdx > 0 ? nameValue.slice(0, eqIdx).trim() : nameValue.trim();
  const value = eqIdx > 0 ? nameValue.slice(eqIdx + 1).trim() : '';

  const attributes = new Map<string, string>();
  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i].trim();
    const attrEq = attr.indexOf('=');
    if (attrEq > 0) {
      attributes.set(attr.slice(0, attrEq).trim().toLowerCase(), attr.slice(attrEq + 1).trim());
    } else {
      attributes.set(attr.trim().toLowerCase(), '');
    }
  }

  return { name, value, attributes };
}

function extractCookiesFromResponse(response: HttpResponse): readonly ParsedCookie[] {
  const setCookieHeaders: string[] = [];
  for (const [key, value] of response.headers) {
    if (key.toLowerCase() === 'set-cookie') {
      setCookieHeaders.push(value);
    }
  }

  return setCookieHeaders.map(h => parseSetCookieHeader(h));
}

// ═══════════════════════════════════════════════════════════════
// Cookie Analysis
// ═══════════════════════════════════════════════════════════════

function detectPrefix(name: string): CookiePrefix {
  if (name.startsWith('__Host-')) return CookiePrefix.Host;
  if (name.startsWith('__Secure-')) return CookiePrefix.Secure;
  return CookiePrefix.None;
}

function analyzeCookieSecurity(
  cookie: ParsedCookie,
  responseUrl: string,
): CookieAnalysis {
  const issues: CookieIssue[] = [];
  const prefix = detectPrefix(cookie.name);
  const secure = cookie.attributes.has('secure');
  const httpOnly = cookie.attributes.has('httponly');
  const sameSite = cookie.attributes.get('samesite')?.toLowerCase() ?? '';
  const domain = cookie.attributes.get('domain') ?? '';
  const path = cookie.attributes.get('path') ?? '/';
  const maxAge = cookie.attributes.has('max-age') ? parseInt(cookie.attributes.get('max-age')!, 10) : null;
  const expires = cookie.attributes.get('expires');
  const isSessionCookie = !maxAge && !expires;

  // ── Prefix compliance ──────────────────────────────

  let prefixCompliant = true;
  if (prefix === CookiePrefix.Host) {
    // __Host- requires: Secure, no Domain, Path=/
    if (!secure) {
      issues.push({
        type: 'prefix_violation',
        description: `Cookie "${cookie.name}" has __Host- prefix but lacks Secure flag`,
        severity: Severity.High,
        recommendation: '__Host- cookies MUST have the Secure flag set.',
      });
      prefixCompliant = false;
    }
    if (domain) {
      issues.push({
        type: 'prefix_violation',
        description: `Cookie "${cookie.name}" has __Host- prefix but specifies Domain attribute`,
        severity: Severity.High,
        recommendation: '__Host- cookies MUST NOT have a Domain attribute.',
      });
      prefixCompliant = false;
    }
    if (path !== '/') {
      issues.push({
        type: 'prefix_violation',
        description: `Cookie "${cookie.name}" has __Host- prefix but Path is not "/" (is "${path}")`,
        severity: Severity.Medium,
        recommendation: '__Host- cookies MUST have Path="/".',
      });
      prefixCompliant = false;
    }
  }

  if (prefix === CookiePrefix.Secure) {
    if (!secure) {
      issues.push({
        type: 'prefix_violation',
        description: `Cookie "${cookie.name}" has __Secure- prefix but lacks Secure flag`,
        severity: Severity.High,
        recommendation: '__Secure- cookies MUST have the Secure flag set.',
      });
      prefixCompliant = false;
    }
  }

  // ── Secure flag ────────────────────────────────────

  if (!secure && prefix === CookiePrefix.None) {
    // Check if it's over HTTPS
    const isHttps = responseUrl.startsWith('https://');
    if (isHttps) {
      issues.push({
        type: 'missing_secure',
        description: `Cookie "${cookie.name}" is transmitted over HTTPS without Secure flag`,
        severity: Severity.Medium,
        recommendation: 'Set the Secure flag to prevent transmission over insecure connections.',
      });
    }
  }

  // ── HttpOnly flag ──────────────────────────────────

  if (!httpOnly) {
    issues.push({
      type: 'missing_httponly',
      description: `Cookie "${cookie.name}" is accessible via JavaScript (no HttpOnly flag)`,
      severity: Severity.Low,
      recommendation: 'Set the HttpOnly flag to prevent XSS-based cookie theft.',
    });
  }

  // ── SameSite ───────────────────────────────────────

  if (!sameSite) {
    issues.push({
      type: 'missing_samesite',
      description: `Cookie "${cookie.name}" has no SameSite attribute — browser default will be used`,
      severity: Severity.Medium,
      recommendation: 'Explicitly set SameSite to "Strict" or "Lax" to prevent CSRF attacks.',
    });
  } else if (sameSite === 'none') {
    if (!secure) {
      issues.push({
        type: 'samesite_none_insecure',
        description: `Cookie "${cookie.name}" has SameSite=None but no Secure flag — browsers will reject it`,
        severity: Severity.High,
        recommendation: 'SameSite=None requires the Secure flag. Modern browsers will reject this cookie.',
      });
    }
  }

  // ── Domain scope ───────────────────────────────────

  if (domain) {
    try {
      const respDomain = new URL(responseUrl).hostname;
      if (domain.startsWith('.') && !respDomain.endsWith(domain.slice(1))) {
        issues.push({
          type: 'domain_mismatch',
          description: `Cookie "${cookie.name}" domain "${domain}" does not match response domain`,
          severity: Severity.Medium,
          recommendation: 'Cookie domain should match or be a parent of the response domain.',
        });
      }
    } catch { /* ignore URL parse errors */ }
  }

  // ── Lifetime analysis ──────────────────────────────

  let lifetimeSeconds: number | null = null;
  if (maxAge !== null && maxAge > 0) {
    lifetimeSeconds = maxAge;
    if (maxAge > 365 * 24 * 60 * 60) {
      issues.push({
        type: 'excessive_lifetime',
        description: `Cookie "${cookie.name}" has max-age of ${maxAge}s (>1 year) — long-lived session`,
        severity: Severity.Low,
        recommendation: 'Consider reducing cookie lifetime. Long-lived cookies increase exposure window if compromised.',
      });
    }
  } else if (expires) {
    try {
      const expiresDate = new Date(expires);
      const now = new Date();
      lifetimeSeconds = Math.max(0, Math.floor((expiresDate.getTime() - now.getTime()) / 1000));
    } catch { /* ignore date parse errors */ }
  }

  // ── Determine overall severity ─────────────────────

  let overallSeverity = Severity.Info;
  for (const issue of issues) {
    if (issue.severity === Severity.Critical || issue.severity === Severity.High) {
      overallSeverity = Severity.High;
      break;
    }
    if (issue.severity === Severity.Medium && overallSeverity !== Severity.High) {
      overallSeverity = Severity.Medium;
    }
  }

  return {
    name: cookie.name,
    value: cookie.value,
    domain,
    path,
    secure,
    httpOnly,
    sameSite,
    maxAge,
    expires: expires ?? null,
    prefix,
    prefixCompliant,
    lifetimeSeconds,
    isSessionCookie,
    issues: Object.freeze(issues),
    severity: overallSeverity,
  };
}

// ═══════════════════════════════════════════════════════════════
// Cookie Intelligence — Main Class
// ═══════════════════════════════════════════════════════════════

export class CookieIntelligence {
  /**
   * Analyze all cookies from an HTTP response.
   */
  analyze(response: HttpResponse): CookieProfile {
    const parsedCookies = extractCookiesFromResponse(response);
    const cookies = parsedCookies.map(c => analyzeCookieSecurity(c, response.url));

    let secureCount = 0;
    let httpOnlyCount = 0;
    let sameSiteStrictCount = 0;
    let sameSiteLaxCount = 0;
    let sameSiteNoneCount = 0;
    let sameSiteMissingCount = 0;
    let prefixIssues = 0;
    const allIssues: CookieIssue[] = [];

    for (const cookie of cookies) {
      if (cookie.secure) secureCount++;
      if (cookie.httpOnly) httpOnlyCount++;
      if (cookie.sameSite === 'strict') sameSiteStrictCount++;
      else if (cookie.sameSite === 'lax') sameSiteLaxCount++;
      else if (cookie.sameSite === 'none') sameSiteNoneCount++;
      else sameSiteMissingCount++;
      if (!cookie.prefixCompliant) prefixIssues++;
      allIssues.push(...cookie.issues);
    }

    // Overall score: 100 = fully secure, -5 per non-secure, -10 per critical
    let score = 100;
    score -= (cookies.length - secureCount) * 5;
    score -= (cookies.length - httpOnlyCount) * 3;
    score -= sameSiteMissingCount * 5;
    score -= prefixIssues * 10;
    score -= allIssues.filter(i => i.severity === Severity.High).length * 15;
    score -= allIssues.filter(i => i.severity === Severity.Critical).length * 25;
    score = Math.max(0, Math.min(100, score));

    return Object.freeze({
      url: response.url,
      cookies: Object.freeze(cookies),
      totalCookies: cookies.length,
      secureCount,
      httpOnlyCount,
      sameSiteStrictCount,
      sameSiteLaxCount,
      sameSiteNoneCount,
      sameSiteMissingCount,
      prefixIssues,
      issues: Object.freeze(allIssues),
      overallScore: score,
    });
  }
}