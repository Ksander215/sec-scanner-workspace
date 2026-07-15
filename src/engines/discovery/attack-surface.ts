/**
 * Discovery Engine — Attack Surface Model
 *
 * Immutable, deduplicated collection of all discovered assets.
 * Designed as a standalone service — can work independently of DAST pipeline.
 *
 * Design principles:
 * - All collections are deduplicated (Set-based keys).
 * - Fork-on-write: every mutation creates a new AttackSurface.
 * - Zero external dependencies — pure data structures.
 * - Exportable/importable for comparison, asset inventory, etc.
 */

import type {
  DiscoveredUrl,
  DiscoveredForm,
  DiscoveredEndpoint,
  DiscoveredJsFile,
  DiscoveredParameter,
  DiscoveredTechnology,
  DiscoveredRobotsEntry,
  DiscoveredSitemapEntry,
  DiscoveredExternalDomain,
  DiscoveredStaticResource,
  DiscoveryStats,
} from './discovery-types.ts';

// ─── Dedup Helpers ───────────────────────────────────────────

function dedupByUrl<T extends { readonly url: string; readonly normalizedUrl: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item.normalizedUrl)) {
      seen.add(item.normalizedUrl);
      result.push(item);
    }
  }
  return result;
}

function dedupByAction<T extends { readonly action: string; readonly pageUrl: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = `${item.action.toLowerCase()}|${item.method.toLowerCase()}|${item.pageUrl.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function dedupByEndpoint<T extends { readonly url: string; readonly method: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = `${item.url.toLowerCase()}|${item.method.toUpperCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function dedupByNameVersion<T extends { readonly name: string; readonly version?: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = `${item.name.toLowerCase()}|${(item.version ?? '').toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function dedupByDomain(items: readonly DiscoveredExternalDomain[]): DiscoveredExternalDomain[] {
  const map = new Map<string, DiscoveredExternalDomain>();
  for (const item of items) {
    const existing = map.get(item.domain.toLowerCase());
    if (existing) {
      // Merge referencedFrom and resourceTypes
      const mergedFrom = [...new Set([...existing.referencedFrom, ...item.referencedFrom])];
      const mergedTypes = [...new Set([...existing.resourceTypes, ...item.resourceTypes])];
      map.set(item.domain.toLowerCase(), {
        ...existing,
        referencedFrom: mergedFrom,
        resourceTypes: mergedTypes,
      });
    } else {
      map.set(item.domain.toLowerCase(), item);
    }
  }
  return Array.from(map.values());
}

function dedupByParamUrl<T extends { readonly name: string; readonly url: string; readonly location: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = `${item.name.toLowerCase()}|${item.url.toLowerCase()}|${item.location.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function dedupRobots(items: readonly DiscoveredRobotsEntry[]): DiscoveredRobotsEntry[] {
  const seen = new Set<string>();
  const result: DiscoveredRobotsEntry[] = [];
  for (const item of items) {
    const key = `${item.directive}|${item.value}|${item.userAgent}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

// ─── Attack Surface ──────────────────────────────────────────

/**
 * Immutable attack surface model.
 * All mutations return a new instance (fork-on-write).
 */
export class AttackSurface {
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

  constructor(data?: {
    readonly urls?: readonly DiscoveredUrl[];
    readonly forms?: readonly DiscoveredForm[];
    readonly endpoints?: readonly DiscoveredEndpoint[];
    readonly jsFiles?: readonly DiscoveredJsFile[];
    readonly parameters?: readonly DiscoveredParameter[];
    readonly technologies?: readonly DiscoveredTechnology[];
    readonly robotsEntries?: readonly DiscoveredRobotsEntry[];
    readonly sitemapEntries?: readonly DiscoveredSitemapEntry[];
    readonly externalDomains?: readonly DiscoveredExternalDomain[];
    readonly staticResources?: readonly DiscoveredStaticResource[];
  }) {
    this.urls = Object.freeze(dedupByUrl(data?.urls ?? []));
    this.forms = Object.freeze(dedupByAction(data?.forms ?? []));
    this.endpoints = Object.freeze(dedupByEndpoint(data?.endpoints ?? []));
    this.jsFiles = Object.freeze(dedupByUrl(data?.jsFiles ?? []));
    this.parameters = Object.freeze(dedupByParamUrl(data?.parameters ?? []));
    this.technologies = Object.freeze(dedupByNameVersion(data?.technologies ?? []));
    this.robotsEntries = Object.freeze(dedupRobots(data?.robotsEntries ?? []));
    this.sitemapEntries = Object.freeze(dedupByUrl(data?.sitemapEntries ?? []));
    this.externalDomains = Object.freeze(dedupByDomain(data?.externalDomains ?? []));
    this.staticResources = Object.freeze(dedupByUrl(data?.staticResources ?? []));
  }

  // ─── Fork-on-Write Mutations ─────────────────────────────

  /** Add URLs, returning a new AttackSurface with merged + deduped set. */
  withUrls(newUrls: readonly DiscoveredUrl[]): AttackSurface {
    return new AttackSurface({ ...this, urls: [...this.urls, ...newUrls] });
  }

  withForms(newForms: readonly DiscoveredForm[]): AttackSurface {
    return new AttackSurface({ ...this, forms: [...this.forms, ...newForms] });
  }

  withEndpoints(newEndpoints: readonly DiscoveredEndpoint[]): AttackSurface {
    return new AttackSurface({ ...this, endpoints: [...this.endpoints, ...newEndpoints] });
  }

  withJsFiles(newFiles: readonly DiscoveredJsFile[]): AttackSurface {
    return new AttackSurface({ ...this, jsFiles: [...this.jsFiles, ...newFiles] });
  }

  withParameters(newParams: readonly DiscoveredParameter[]): AttackSurface {
    return new AttackSurface({ ...this, parameters: [...this.parameters, ...newParams] });
  }

  withTechnologies(newTech: readonly DiscoveredTechnology[]): AttackSurface {
    return new AttackSurface({ ...this, technologies: [...this.technologies, ...newTech] });
  }

  withRobotsEntries(newEntries: readonly DiscoveredRobotsEntry[]): AttackSurface {
    return new AttackSurface({ ...this, robotsEntries: [...this.robotsEntries, ...newEntries] });
  }

  withSitemapEntries(newEntries: readonly DiscoveredSitemapEntry[]): AttackSurface {
    return new AttackSurface({ ...this, sitemapEntries: [...this.sitemapEntries, ...newEntries] });
  }

  withExternalDomains(newDomains: readonly DiscoveredExternalDomain[]): AttackSurface {
    return new AttackSurface({ ...this, externalDomains: [...this.externalDomains, ...newDomains] });
  }

  withStaticResources(newResources: readonly DiscoveredStaticResource[]): AttackSurface {
    return new AttackSurface({ ...this, staticResources: [...this.staticResources, ...newResources] });
  }

  /** Merge another AttackSurface into this one. Returns a new instance. */
  merge(other: AttackSurface): AttackSurface {
    return new AttackSurface({
      urls: [...this.urls, ...other.urls],
      forms: [...this.forms, ...other.forms],
      endpoints: [...this.endpoints, ...other.endpoints],
      jsFiles: [...this.jsFiles, ...other.jsFiles],
      parameters: [...this.parameters, ...other.parameters],
      technologies: [...this.technologies, ...other.technologies],
      robotsEntries: [...this.robotsEntries, ...other.robotsEntries],
      sitemapEntries: [...this.sitemapEntries, ...other.sitemapEntries],
      externalDomains: [...this.externalDomains, ...other.externalDomains],
      staticResources: [...this.staticResources, ...other.staticResources],
    });
  }

  // ─── Queries ─────────────────────────────────────────────

  /** Count total items across all categories. */
  get totalCount(): number {
    return (
      this.urls.length +
      this.forms.length +
      this.endpoints.length +
      this.jsFiles.length +
      this.parameters.length +
      this.technologies.length +
      this.robotsEntries.length +
      this.sitemapEntries.length +
      this.externalDomains.length +
      this.staticResources.length
    );
  }

  /** Get unique hostnames from all URLs. */
  get hostnames(): readonly string[] {
    const hosts = new Set<string>();
    for (const u of this.urls) {
      try {
        hosts.add(new URL(u.url).hostname);
      } catch { /* skip invalid */ }
    }
    return Object.freeze([...hosts]);
  }

  /** Get URLs by source. */
  getUrlsBySource(source: string): readonly DiscoveredUrl[] {
    return this.urls.filter(u => u.source === source);
  }

  /** Get endpoints by type. */
  getEndpointsByType(type: string): readonly DiscoveredEndpoint[] {
    return this.endpoints.filter(e => e.type === type);
  }

  /** Get forms with file upload. */
  getFormsWithFileUpload(): readonly DiscoveredForm[] {
    return this.forms.filter(f => f.hasFileUpload);
  }

  /** Get all parameter names (deduped). */
  get uniqueParameterNames(): readonly string[] {
    return Object.freeze([...new Set(this.parameters.map(p => p.name))]);
  }

  // ─── Serialization ───────────────────────────────────────

  /** Serialize to plain object (for JSON.stringify). */
  toJSON(): Record<string, unknown> {
    return {
      urls: this.urls,
      forms: this.forms,
      endpoints: this.endpoints,
      jsFiles: this.jsFiles,
      parameters: this.parameters,
      technologies: this.technologies,
      robotsEntries: this.robotsEntries,
      sitemapEntries: this.sitemapEntries,
      externalDomains: this.externalDomains,
      staticResources: this.staticResources,
    };
  }

  /** Deserialize from plain object. */
  static fromJSON(data: Record<string, any>): AttackSurface {
    return new AttackSurface({
      urls: data.urls,
      forms: data.forms,
      endpoints: data.endpoints,
      jsFiles: data.jsFiles,
      parameters: data.parameters,
      technologies: data.technologies,
      robotsEntries: data.robotsEntries,
      sitemapEntries: data.sitemapEntries,
      externalDomains: data.externalDomains,
      staticResources: data.staticResources,
    });
  }

  // ─── Comparison (for Continuous Discovery) ───────────────

  /**
   * Compare this surface with another.
   * Returns new URLs, removed URLs, and common URLs.
   */
  diff(other: AttackSurface): {
    readonly added: readonly DiscoveredUrl[];
    readonly removed: readonly DiscoveredUrl[];
    readonly common: readonly DiscoveredUrl[];
  } {
    const thisUrls = new Set(this.urls.map(u => u.normalizedUrl));
    const otherUrls = new Set(other.urls.map(u => u.normalizedUrl));

    const added = other.urls.filter(u => !thisUrls.has(u.normalizedUrl));
    const removed = this.urls.filter(u => !otherUrls.has(u.normalizedUrl));
    const common = this.urls.filter(u => otherUrls.has(u.normalizedUrl));

    return {
      added: Object.freeze(added),
      removed: Object.freeze(removed),
      common: Object.freeze(common),
    };
  }

  // ─── Stats ───────────────────────────────────────────────

  getStats(requestsMade: number, durationMs: number): DiscoveryStats {
    const totalItems = this.totalCount;
    return Object.freeze({
      urlsTotal: this.urls.length,
      formsTotal: this.forms.length,
      endpointsTotal: this.endpoints.length,
      jsFilesTotal: this.jsFiles.length,
      parametersTotal: this.parameters.length,
      technologiesTotal: this.technologies.length,
      robotsEntriesTotal: this.robotsEntries.length,
      sitemapEntriesTotal: this.sitemapEntries.length,
      externalDomainsTotal: this.externalDomains.length,
      staticResourcesTotal: this.staticResources.length,
      requestsMade,
      durationMs,
      depthsReached: Math.max(0, ...this.urls.map(u => u.depth)),
      dedupRatio: totalItems > 0 ? totalItems / Math.max(1, totalItems) : 0,
    });
  }
}

/**
 * Create an empty attack surface.
 */
export function createEmptyAttackSurface(): AttackSurface {
  return new AttackSurface();
}