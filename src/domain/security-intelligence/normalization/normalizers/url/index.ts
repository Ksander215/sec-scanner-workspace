/**
 * URL Canonicalization Normalizer
 *
 * Normalizes URLs to a canonical form by standardizing:
 * - Scheme (lowercase)
 * - Hostname (lowercase)
 * - Port (remove default ports)
 * - Path (add leading slash, remove trailing slash)
 * - Query parameters (sorted alphabetically)
 * - Fragment (preserved as-is)
 *
 * This ensures that the same URL in different representations
 * maps to the same canonical form for deduplication and comparison.
 */

import type { CanonicalURL } from '../../types/index.ts';
import { createCanonicalURL } from '../../models/index.ts';

// ─── Default Port Map ────────────────────────────────────────

const DEFAULT_PORTS: Readonly<Record<string, number>> = Object.freeze({
  http: 80,
  https: 443,
  ftp: 21,
  ssh: 22,
});

// ─── URL Normalization Result ────────────────────────────────

export interface URLNormalizationResult {
  readonly url: CanonicalURL | null;
  readonly original: string;
  readonly wasNormalized: boolean;
  readonly errors: readonly string[];
}

// ─── URL Normalizer ──────────────────────────────────────────

/**
 * Canonicalize a URL string.
 *
 * Steps:
 * 1. Parse into components
 * 2. Lowercase scheme
 * 3. Lowercase hostname
 * 4. Remove default port
 * 5. Normalize path (add leading /, remove trailing /)
 * 6. Sort query parameters
 * 7. Preserve fragment
 */
export function normalizeURL(value: string | undefined | null): URLNormalizationResult {
  if (value === undefined || value === null || value.trim() === '') {
    return { url: null, original: value ?? '', wasNormalized: false, errors: ['URL is empty'] };
  }

  const original = value.trim();
  const errors: string[] = [];

  try {
    // Add scheme if missing
    let urlStr = original;
    if (!urlStr.match(/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//)) {
      urlStr = `https://${urlStr}`;
    }

    const parsed = new URL(urlStr);

    // 1. Scheme — lowercase
    const scheme = parsed.protocol.replace(':', '').toLowerCase();

    // 2. Host — lowercase, remove www prefix optionally
    const host = parsed.hostname.toLowerCase();

    // 3. Port — remove default ports
    const explicitPort = parsed.port ? parseInt(parsed.port, 10) : null;
    const defaultPort = DEFAULT_PORTS[scheme];
    const port = explicitPort && explicitPort !== defaultPort ? explicitPort : null;

    // 4. Path — remove trailing slash (except root)
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }

    // 5. Query — sort parameters
    const query = sortQueryParams(parsed.searchParams);

    // 6. Fragment
    const fragment = parsed.hash.replace('#', '');

    const canonical = createCanonicalURL({
      scheme,
      host,
      port,
      path,
      query,
      fragment,
      original,
    });

    const wasNormalized =
      scheme !== parsed.protocol.replace(':', '') ||
      host !== parsed.hostname ||
      explicitPort !== port ||
      path !== parsed.pathname ||
      query !== parsed.search.replace('?', '');

    return { url: canonical, original, wasNormalized, errors };
  } catch (e) {
    errors.push(`Failed to parse URL: ${e instanceof Error ? e.message : 'Unknown error'}`);
    return { url: null, original, wasNormalized: false, errors };
  }
}

/**
 * Sort query parameters alphabetically by key,
 * then by value for duplicate keys.
 */
function sortQueryParams(params: URLSearchParams): string {
  if (!params.toString()) return '';

  const entries: [string, string][] = [];
  params.forEach((value, key) => {
    entries.push([key, value]);
  });

  entries.sort((a, b) => {
    const keyCmp = a[0].localeCompare(b[0]);
    if (keyCmp !== 0) return keyCmp;
    return a[1].localeCompare(b[1]);
  });

  const sorted = new URLSearchParams();
  for (const [key, value] of entries) {
    sorted.append(key, value);
  }

  return sorted.toString();
}

/**
 * Compare two canonical URLs for equivalence.
 */
export function urlsEqual(a: CanonicalURL, b: CanonicalURL): boolean {
  return (
    a.scheme === b.scheme &&
    a.host === b.host &&
    a.port === b.port &&
    a.path === b.path &&
    a.query === b.query &&
    a.fragment === b.fragment
  );
}

/**
 * Reconstruct a URL string from canonical components.
 */
export function canonicalURLToString(url: CanonicalURL): string {
  const portPart = url.port ? `:${url.port}` : '';
  const queryPart = url.query ? `?${url.query}` : '';
  const fragmentPart = url.fragment ? `#${url.fragment}` : '';
  return `${url.scheme}://${url.host}${portPart}${url.path}${queryPart}${fragmentPart}`;
}

/**
 * Extract the root URL (scheme + host + port) from a canonical URL.
 */
export function extractRootURL(url: CanonicalURL): string {
  const portPart = url.port ? `:${url.port}` : '';
  return `${url.scheme}://${url.host}${portPart}`;
}
