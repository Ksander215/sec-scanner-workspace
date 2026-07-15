/**
 * Security Intelligence Risk Engine — Context Engine
 *
 * Resolves risk context from the Knowledge Graph to inform
 * risk calculations. Determines internet-facing status, asset
 * criticality, authentication chains, and dependency graphs.
 *
 * This module queries the Knowledge Graph through its public API
 * WITHOUT modifying the Knowledge Graph core.
 *
 * When the Knowledge Graph is not available, falls back to
 * heuristic-based context from finding metadata and tags.
 */

import type {
  RiskContext, Metadata, RiskFactorInput,
} from '../types/index.ts';
import {
  createRiskContext, createDefaultRiskContext,
} from '../models/index.ts';

// ─── Context Source Interface ────────────────────────────────

/**
 * Interface for context resolution sources.
 * In production, this would be backed by the Knowledge Graph.
 * In testing/fallback, it uses heuristics from finding metadata.
 */
export interface ContextSource {
  /** Resolve context for a finding */
  resolve(findingId: string, hints: ContextHints): RiskContext;
}

/** Hints extracted from finding data for context resolution */
export interface ContextHints {
  readonly endpoint: string | null;
  readonly affectedAsset: string | null;
  readonly technology: readonly string[];
  readonly tags: readonly string[];
  readonly metadata: Metadata;
}

// ─── Heuristic Context Source ────────────────────────────────

/**
 * Heuristic-based context source that uses finding metadata
 * and tags to estimate context without a Knowledge Graph.
 *
 * This is the default fallback when KG is unavailable.
 */
export class HeuristicContextSource implements ContextSource {
  resolve(findingId: string, hints: ContextHints): RiskContext {
    const tags = hints.tags.map(t => t.toLowerCase());
    const endpoint = hints.endpoint?.toLowerCase() ?? '';
    const tech = hints.technology.map(t => t.toLowerCase());

    // Internet-facing: check tags and endpoint
    const internetFacing = this.isInternetFacing(tags, endpoint, tech);
    const internalOnly = !internetFacing;

    // Production vs development: check tags
    const isProduction = this.isProduction(tags, hints.metadata);
    const isDevelopment = !isProduction;

    // Critical asset: check tags and metadata
    const isCriticalAsset = this.isCriticalAsset(tags, hints.metadata);

    // Authentication chain: estimate from tags
    const authenticationChain = this.estimateAuthChain(tags);

    // Dependencies: estimate from technology count
    const dependencyCount = tech.length;
    const dependentAssetCount = this.estimateDependentAssets(tags, hints.metadata);

    return createRiskContext({
      internetFacing,
      internalOnly,
      isProduction,
      isDevelopment,
      isCriticalAsset,
      authenticationChain,
      dependencyCount,
      dependentAssetCount,
      metadata: Object.freeze({
        source: 'heuristic',
        findingId,
      }),
    });
  }

  private isInternetFacing(tags: readonly string[], endpoint: string, tech: readonly string[]): boolean {
    if (tags.some(t => t.includes('internet-facing') || t.includes('public') || t.includes('external'))) return true;
    if (tags.some(t => t.includes('internal') || t.includes('private') || t.includes('intranet'))) return false;
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      const host = this.extractHost(endpoint);
      if (host === 'localhost' || host === '127.0.0.1') return false;
      // FIX #9: Full RFC 1918 private IP range check
      if (this.isPrivateIP(host)) return false;
      return true;
    }
    return false;
  }

  /** FIX #9: Check if an IP address is private (RFC 1918 + link-local + CGNAT) */
  private isPrivateIP(host: string): boolean {
    // IPv4 private ranges
    if (host.startsWith('10.')) return true;
    if (host.startsWith('192.168.')) return true;
    if (host.startsWith('169.254.')) return true; // Link-local
    // 172.16.0.0/12: 172.16.x.x through 172.31.x.x
    if (host.startsWith('172.')) {
      const parts = host.split('.');
      if (parts.length >= 2) {
        const second = parseInt(parts[1], 10);
        if (second >= 16 && second <= 31) return true;
      }
    }
    // CGNAT: 100.64.0.0/10
    if (host.startsWith('100.')) {
      const parts = host.split('.');
      if (parts.length >= 2) {
        const second = parseInt(parts[1], 10);
        if (second >= 64 && second <= 127) return true;
      }
    }
    // IPv6 loopback and link-local
    if (host === '::1' || host.startsWith('fe80:')) return true;
    return false;
  }

  private isProduction(tags: readonly string[], metadata: Metadata): boolean {
    if (tags.some(t => t.includes('production') || t.includes('prod'))) return true;
    if (tags.some(t => t.includes('development') || t.includes('dev') || t.includes('staging'))) return false;
    if (metadata['environment'] === 'production' || metadata['environment'] === 'prod') return true;
    return false;
  }

  private isCriticalAsset(tags: readonly string[], metadata: Metadata): boolean {
    if (tags.some(t => t.includes('critical') || t.includes('mission-critical') || t.includes('tier-1'))) return true;
    if (metadata['assetCriticality'] === 'critical' || metadata['criticality'] === 'high') return true;
    return false;
  }

  private estimateAuthChain(tags: readonly string[]): string[] {
    const chain: string[] = [];
    for (const tag of tags) {
      if (tag.startsWith('auth:')) chain.push(tag);
      if (tag.includes('oauth')) chain.push('oauth');
      if (tag.includes('saml')) chain.push('saml');
      if (tag.includes('ldap')) chain.push('ldap');
    }
    return chain;
  }

  private estimateDependentAssets(tags: readonly string[], metadata: Metadata): number {
    const count = Number(metadata['dependentAssetCount'] ?? 0);
    if (count > 0) return count;
    if (tags.some(t => t.includes('tier-1') || t.includes('critical'))) return 10;
    if (tags.some(t => t.includes('tier-2'))) return 5;
    return 1;
  }

  private extractHost(endpoint: string): string {
    try {
      const match = endpoint.match(/^https?:\/\/([^:/]+)/);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  }
}

// ─── Knowledge Graph Context Source ──────────────────────────

/**
 * Knowledge Graph-backed context source.
 * Queries the KG through its public API for context resolution.
 *
 * This is a lightweight adapter that uses the KG's query and
 * traversal capabilities without modifying the KG domain.
 */
export class KnowledgeGraphContextSource implements ContextSource {
  private readonly _graphData: Map<string, GraphNodeData> = new Map();
  // FIX #15: Reuse a single fallback instance instead of creating one per call
  private readonly _fallback: HeuristicContextSource = new HeuristicContextSource();

  /**
   * Register a graph node for context resolution.
   * In production, this would be populated from the actual KG.
   */
  registerNode(id: string, data: GraphNodeData): void {
    this._graphData.set(id, data);
  }

  /**
   * Register multiple graph nodes.
   */
  registerNodes(nodes: readonly { readonly id: string; readonly data: GraphNodeData }[]): void {
    for (const node of nodes) {
      this._graphData.set(node.id, node.data);
    }
  }

  resolve(findingId: string, hints: ContextHints): RiskContext {
    const nodeData = this._graphData.get(findingId);

    if (!nodeData) {
      // FIX #15: Use shared fallback instance instead of creating a new one
      return this._fallback.resolve(findingId, hints);
    }

    return createRiskContext({
      internetFacing: nodeData.internetFacing,
      internalOnly: nodeData.internalOnly,
      isProduction: nodeData.isProduction,
      isDevelopment: nodeData.isDevelopment,
      isCriticalAsset: nodeData.isCriticalAsset,
      authenticationChain: Object.freeze([...nodeData.authenticationChain]),
      dependencyCount: nodeData.dependencyCount,
      dependentAssetCount: nodeData.dependentAssetCount,
      metadata: Object.freeze({
        source: 'knowledge-graph',
        findingId,
      }),
    });
  }

  /** Clear registered nodes */
  clear(): void {
    this._graphData.clear();
  }

  /** Number of registered nodes */
  get size(): number {
    return this._graphData.size;
  }
}

// ─── Graph Node Data ────────────────────────────────────────

/** Context data for a graph node */
export interface GraphNodeData {
  readonly internetFacing: boolean;
  readonly internalOnly: boolean;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly isCriticalAsset: boolean;
  readonly authenticationChain: readonly string[];
  readonly dependencyCount: number;
  readonly dependentAssetCount: number;
}

// ─── Context Engine ──────────────────────────────────────────

/**
 * Main context engine that resolves RiskContext for findings.
 * Uses Knowledge Graph when available, falls back to heuristics.
 */
export class ContextEngine {
  private readonly _primary: ContextSource;
  private readonly _fallback: HeuristicContextSource;
  private readonly _contextEnabled: boolean;

  constructor(config: {
    readonly contextEnabled?: boolean;
    readonly kgSource?: KnowledgeGraphContextSource;
  } = {}) {
    this._contextEnabled = config.contextEnabled ?? true;
    this._primary = config.kgSource ?? new HeuristicContextSource();
    this._fallback = new HeuristicContextSource();
  }

  /**
   * Resolve context for a finding.
   * Uses the primary source (KG or heuristic) with fallback.
   */
  resolve(input: RiskFactorInput): RiskContext {
    if (!this._contextEnabled) {
      return createDefaultRiskContext();
    }

    try {
      const hints: ContextHints = {
        endpoint: input.endpoint,
        affectedAsset: input.affectedAsset,
        technology: input.technology,
        tags: input.tags,
        metadata: input.metadata,
      };

      return this._primary.resolve(input.findingId, hints);
    } catch {
      // Fall back to heuristic on any error
      const hints: ContextHints = {
        endpoint: input.endpoint,
        affectedAsset: input.affectedAsset,
        technology: input.technology,
        tags: input.tags,
        metadata: input.metadata,
      };
      return this._fallback.resolve(input.findingId, hints);
    }
  }

  /** Get the primary context source */
  get primarySource(): ContextSource {
    return this._primary;
  }
}
