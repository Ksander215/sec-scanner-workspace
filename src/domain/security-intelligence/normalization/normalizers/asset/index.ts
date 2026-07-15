/**
 * Asset Resolution Normalizer
 *
 * Determines the type and identity of assets affected by findings.
 * Resolves raw asset identifiers into structured AffectedAsset models.
 *
 * Asset types:
 * - Host: server hostname or IP
 * - Application: web application
 * - Endpoint: specific URL endpoint
 * - API: API endpoint
 * - Service: network service
 * - Domain: DNS domain
 * - IPAddress: IP address
 * - URL: full URL
 * - Database: database server
 * - CloudResource: cloud infrastructure
 * - Container: containerized service
 */

import type { AffectedAsset, AssetType, Metadata } from '../../types/index.ts';
import { AssetType as Ast } from '../../types/index.ts';
import { createAffectedAsset } from '../../models/index.ts';

// ─── Asset Detection Patterns ────────────────────────────────

const IP_V4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/;
const DOMAIN_PATTERN = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?$/;
const URL_PATTERN = /^https?:\/\//i;
const API_PATH_PATTERN = /^\/api\/|\/v\d+\/|\/graphql/i;

// ─── Asset Resolution Result ─────────────────────────────────

export interface AssetResolutionResult {
  readonly asset: AffectedAsset | null;
  readonly detectedType: AssetType;
  readonly wasNormalized: boolean;
  readonly warnings: readonly string[];
}

// ─── Asset Resolver ──────────────────────────────────────────

/**
 * Resolve a raw asset identifier into a structured AffectedAsset.
 *
 * Resolution order:
 * 1. URL → parse and determine type (API, Endpoint, Application)
 * 2. IP address → IPAddress / Host
 * 3. Domain name → Domain / Host
 * 4. Service identifier → Service
 * 5. Default → Application
 */
export function resolveAsset(
  identifier: string | undefined | null,
  metadata?: Metadata,
): AssetResolutionResult {
  if (identifier === undefined || identifier === null || identifier.trim() === '') {
    return { asset: null, detectedType: Ast.Host, wasNormalized: false, warnings: ['Asset identifier is empty'] };
  }

  const trimmed = identifier.trim();
  const warnings: string[] = [];

  // 1. URL-based resolution
  if (URL_PATTERN.test(trimmed)) {
    return resolveURLAsset(trimmed, metadata);
  }

  // 2. IP address
  const ipMatch = trimmed.match(IP_V4_PATTERN);
  if (ipMatch) {
    const ip = trimmed.split(':')[0];
    const port = trimmed.includes(':') ? parseInt(trimmed.split(':')[1], 10) : undefined;
    const asset = createAffectedAsset({
      type: Ast.IPAddress,
      identifier: ip,
      name: port ? `${ip}:${port}` : ip,
      metadata: { ...(metadata ?? {}), ...(port ? { port: String(port) } : {}) },
    });
    return { asset, detectedType: Ast.IPAddress, wasNormalized: true, warnings };
  }

  // 3. Domain name
  if (DOMAIN_PATTERN.test(trimmed)) {
    const domain = trimmed.split(':')[0];
    const port = trimmed.includes(':') ? parseInt(trimmed.split(':')[1], 10) : undefined;

    // Check if it looks like a service with port
    if (port) {
      const asset = createAffectedAsset({
        type: Ast.Host,
        identifier: trimmed,
        name: trimmed,
        metadata: { ...(metadata ?? {}), port: String(port) },
      });
      return { asset, detectedType: Ast.Host, wasNormalized: true, warnings };
    }

    const asset = createAffectedAsset({
      type: Ast.Domain,
      identifier: domain,
      name: domain,
      metadata: metadata ?? {},
    });
    return { asset, detectedType: Ast.Domain, wasNormalized: true, warnings };
  }

  // 4. Path-like (could be endpoint or API)
  if (trimmed.startsWith('/')) {
    const type = API_PATH_PATTERN.test(trimmed) ? Ast.API : Ast.Endpoint;
    const asset = createAffectedAsset({
      type,
      identifier: trimmed,
      name: trimmed,
      metadata: metadata ?? {},
    });
    return { asset, detectedType: type, wasNormalized: true, warnings };
  }

  // 5. Default — treat as Application
  const asset = createAffectedAsset({
    type: Ast.Application,
    identifier: trimmed,
    name: trimmed,
    metadata: metadata ?? {},
  });
  return { asset, detectedType: Ast.Application, wasNormalized: true, warnings };
}

/**
 * Resolve a URL-based asset identifier.
 */
function resolveURLAsset(url: string, metadata?: Metadata): AssetResolutionResult {
  const warnings: string[] = [];

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    // Determine if it's an API endpoint
    if (API_PATH_PATTERN.test(path)) {
      const asset = createAffectedAsset({
        type: Ast.API,
        identifier: url,
        name: `${host}${path}`,
        metadata: { ...(metadata ?? {}), scheme: parsed.protocol.replace(':', ''), host, path },
      });
      return { asset, detectedType: Ast.API, wasNormalized: true, warnings };
    }

    // Root path → Application
    if (path === '/' || path === '') {
      const asset = createAffectedAsset({
        type: Ast.Application,
        identifier: `${parsed.protocol}//${host}`,
        name: host,
        metadata: { ...(metadata ?? {}), scheme: parsed.protocol.replace(':', ''), host },
      });
      return { asset, detectedType: Ast.Application, wasNormalized: true, warnings };
    }

    // Specific path → Endpoint
    const asset = createAffectedAsset({
      type: Ast.Endpoint,
      identifier: url,
      name: `${host}${path}`,
      metadata: { ...(metadata ?? {}), scheme: parsed.protocol.replace(':', ''), host, path },
    });
    return { asset, detectedType: Ast.Endpoint, wasNormalized: true, warnings };
  } catch {
    warnings.push(`Failed to parse URL: ${url}`);
    const asset = createAffectedAsset({
      type: Ast.URL,
      identifier: url,
      name: url,
      metadata: metadata ?? {},
    });
    return { asset, detectedType: Ast.URL, wasNormalized: true, warnings };
  }
}

/**
 * Determine the most specific asset type from a set of identifiers.
 */
export function determineAssetType(identifiers: readonly string[]): AssetType {
  for (const id of identifiers) {
    if (URL_PATTERN.test(id)) {
      try {
        const parsed = new URL(id);
        if (API_PATH_PATTERN.test(parsed.pathname)) return Ast.API;
        if (parsed.pathname !== '/' && parsed.pathname !== '') return Ast.Endpoint;
        return Ast.Application;
      } catch { continue; }
    }
    if (IP_V4_PATTERN.test(id)) return Ast.IPAddress;
    if (DOMAIN_PATTERN.test(id)) return Ast.Domain;
    if (id.startsWith('/')) return Ast.Endpoint;
  }
  return Ast.Application;
}
