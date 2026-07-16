/** INT-014: Threat Intelligence — Engine */
import type {
  ThreatIntelFeed, ThreatIntelEntry, FeedType, ThreatIntelQuery,
  ThreatIntelAggregationResult, StixObject, ThreatIntelConfig,
} from './types.js';

export class ThreatIntelEngine {
  private config: ThreatIntelConfig;
  private feeds: Map<FeedType, ThreatIntelFeed> = new Map();
  private entries: Map<string, ThreatIntelEntry> = new Map();
  private stixObjects: Map<string, StixObject> = new Map();

  constructor(config?: Partial<ThreatIntelConfig>) {
    this.config = {
      feeds: [],
      syncIntervalMs: 3600000,
      retentionDays: 365,
      maxEntries: 1000000,
      ...config,
    };
  }

  /** Register a feed */
  registerFeed(feed: Omit<ThreatIntelFeed, 'lastUpdated' | 'entryCount'>): void {
    this.feeds.set(feed.type, { ...feed, lastUpdated: new Date(), entryCount: 0 });
  }

  /** Ingest entries from a feed */
  ingest(type: FeedType, entries: Omit<ThreatIntelEntry, 'id'>[]): number {
    let count = 0;
    for (const entry of entries) {
      const id = `${type}-${entry.externalId}`;
      if (!this.entries.has(id)) {
        this.entries.set(id, { ...entry, id });
        count++;
      } else {
        // Update existing
        this.entries.set(id, { ...entry, id, updatedAt: new Date() });
      }
    }

    const feed = this.feeds.get(type);
    if (feed) {
      feed.entryCount = [...this.entries.values()].filter(e => e.type === type).length;
      feed.lastUpdated = new Date();
    }

    return count;
  }

  /** Ingest STIX objects */
  ingestStix(objects: StixObject[]): void {
    for (const obj of objects) {
      this.stixObjects.set(obj.id, obj);
    }
  }

  /** Query threat intelligence */
  query(query: ThreatIntelQuery): ThreatIntelEntry[] {
    let results = [...this.entries.values()];

    if (query.type) results = results.filter(e => e.type === query.type);
    if (query.severity?.length) results = results.filter(e => query.severity!.includes(e.severity));
    if (query.searchText) {
      const search = query.searchText.toLowerCase();
      results = results.filter(e =>
        e.name.toLowerCase().includes(search) ||
        e.description.toLowerCase().includes(search) ||
        e.tags.some(t => t.toLowerCase().includes(search)),
      );
    }
    if (query.cve) results = results.filter(e => e.externalId === query.cve || e.name.includes(query.cve!));
    if (query.cwe) results = results.filter(e => e.tags.some(t => t.includes(query.cwe!)));
    if (query.techniqueId) results = results.filter(e => e.tags.some(t => t.includes(query.techniqueId!)));
    if (query.epssMin !== undefined) results = results.filter(e => (e.epss ?? 0) >= query.epssMin!);
    if (query.cvssMin !== undefined) results = results.filter(e => (e.cvss ?? 0) >= query.cvssMin!);
    if (query.product) results = results.filter(e => e.affectedProducts.some(p => p.product.toLowerCase().includes(query.product!.toLowerCase())));
    if (query.vendor) results = results.filter(e => e.affectedProducts.some(p => p.vendor.toLowerCase().includes(query.vendor!.toLowerCase())));

    return results.slice(query.offset ?? 0, (query.offset ?? 0) + (query.limit ?? 100));
  }

  /** Get a specific entry */
  getEntry(id: string): ThreatIntelEntry | undefined {
    return this.entries.get(id);
  }

  /** Look up by CVE ID */
  lookupCve(cveId: string): ThreatIntelEntry | undefined {
    return this.entries.get(`cve-${cveId}`) ?? [...this.entries.values()].find(e => e.externalId === cveId);
  }

  /** Look up by MITRE technique */
  lookupTechnique(techniqueId: string): ThreatIntelEntry[] {
    return [...this.entries.values()].filter(e => e.tags.some(t => t.includes(techniqueId)));
  }

  /** Get STIX objects by type */
  getStixObjects(type: string): StixObject[] {
    return [...this.stixObjects.values()].filter(o => o.type === type);
  }

  /** Aggregate statistics */
  aggregate(): ThreatIntelAggregationResult {
    const entries = [...this.entries.values()];
    const byType = {} as Record<FeedType, number>;
    const bySeverity: Record<string, number> = {};
    const vendorCounts: Record<string, number> = {};
    const productCounts: Record<string, number> = {};

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] ?? 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1;
      for (const prod of entry.affectedProducts) {
        vendorCounts[prod.vendor] = (vendorCounts[prod.vendor] ?? 0) + 1;
        productCounts[prod.product] = (productCounts[prod.product] ?? 0) + 1;
      }
    }

    return {
      totalEntries: entries.length,
      byType,
      bySeverity,
      topVendors: Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([vendor, count]) => ({ vendor, count })),
      topProducts: Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([product, count]) => ({ product, count })),
      recentEntries: entries.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()).slice(0, 20),
    };
  }

  /** Sync all registered feeds */
  async syncAll(): Promise<Record<FeedType, { synced: number; errors: number }>> {
    const results = {} as Record<FeedType, { synced: number; errors: number }>;
    for (const [type, _feed] of this.feeds) {
      // Production: HTTP fetch from feed endpoint
      results[type] = { synced: 0, errors: 0 };
    }
    return results;
  }

  /** Get registered feeds */
  getFeeds(): ThreatIntelFeed[] {
    return [...this.feeds.values()];
  }

  /** Get statistics */
  getStatistics(): { totalEntries: number; totalFeeds: number; totalStixObjects: number; lastSync: Date | null } {
    return {
      totalEntries: this.entries.size,
      totalFeeds: this.feeds.size,
      totalStixObjects: this.stixObjects.size,
      lastSync: this.feeds.size > 0 ? new Date(Math.max(...[...this.feeds.values()].map(f => f.lastUpdated.getTime()))) : null,
    };
  }
}
