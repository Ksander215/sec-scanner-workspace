/** INT-014: Threat Intelligence — Types */

export type FeedType = 'mitre' | 'cve' | 'cwe' | 'epss' | 'kev' | 'cisa' | 'first' | 'yara' | 'sigma' | 'opencti' | 'misp' | 'stix-taxii';

export interface ThreatIntelFeed {
  type: FeedType;
  name: string;
  version: string;
  lastUpdated: Date;
  entryCount: number;
}

export interface ThreatIntelEntry {
  id: string;
  type: FeedType;
  externalId: string;
  name: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  cvss?: number;
  epss?: number;
  references: string[];
  tags: string[];
  affectedProducts: AffectedProduct[];
  mitigations: string[];
  publishedAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface AffectedProduct {
  vendor: string;
  product: string;
  versions: string[];
  cpe?: string;
}

export interface StixObject {
  type: string;
  id: string;
  specVersion: string;
  created: Date;
  modified: Date;
  name?: string;
  description?: string;
  pattern?: string;
  killChainPhases?: KillChainPhase[];
  externalReferences?: ExternalReference[];
}

export interface KillChainPhase {
  killChainName: string;
  phaseName: string;
}

export interface ExternalReference {
  sourceName: string;
  url?: string;
  externalId?: string;
  description?: string;
}

export interface TaxiiCollection {
  id: string;
  title: string;
  description: string;
  objects: StixObject[];
}

export interface ThreatIntelQuery {
  type?: FeedType;
  severity?: string[];
  searchText?: string;
  cve?: string;
  cwe?: string;
  techniqueId?: string;
  epssMin?: number;
  cvssMin?: number;
  product?: string;
  vendor?: string;
  limit?: number;
  offset?: number;
}

export interface ThreatIntelAggregationResult {
  totalEntries: number;
  byType: Record<FeedType, number>;
  bySeverity: Record<string, number>;
  topVendors: Array<{ vendor: string; count: number }>;
  topProducts: Array<{ product: string; count: number }>;
  recentEntries: ThreatIntelEntry[];
}

export interface ThreatIntelConfig {
  feeds: FeedConfig[];
  syncIntervalMs: number;
  retentionDays: number;
  maxEntries: number;
}

export interface FeedConfig {
  type: FeedType;
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  syncIntervalMs?: number;
}
