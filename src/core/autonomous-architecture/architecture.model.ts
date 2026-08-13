/**
 * Autonomous Architecture Runtime — Domain Model
 * TASK-AIS-012A.002
 *
 * Immutable data structures. No behavior. No runtime. No graph.
 */

import type { Identifier } from '../types/common.js';

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type ArchitectureNodeId = Identifier & { readonly __brand: 'ArchitectureNodeId' };
export type ArchitectureEdgeId = Identifier & { readonly __brand: 'ArchitectureEdgeId' };
export type ArchitectureLayerId = Identifier & { readonly __brand: 'ArchitectureLayerId' };

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

export enum ArchitectureNodeKind {
  Service = 'service',
  Module = 'module',
  Component = 'component',
  Interface = 'interface',
  Database = 'database',
  API = 'api',
  Queue = 'queue',
  Event = 'event',
  Config = 'config',
  Runtime = 'runtime',
  Unknown = 'unknown',
}

export enum ArchitectureEdgeKind {
  DependsOn = 'depends-on',
  Composes = 'composes',
  CommunicatesWith = 'communicates-with',
  Extends = 'extends',
  Implements = 'implements',
  Uses = 'uses',
  Publishes = 'publishes',
  Subscribes = 'subscribes',
  References = 'references',
}

export enum ArchitectureLayerKind {
  Domain = 'domain',
  Core = 'core',
  Application = 'application',
  Infrastructure = 'infrastructure',
  External = 'external',
}

// ═══════════════════════════════════════════════════════════════════
// IMMUTABLE INTERFACES
// ═══════════════════════════════════════════════════════════════════

export interface ArchitectureNode {
  readonly id: ArchitectureNodeId;
  readonly kind: ArchitectureNodeKind;
  readonly name: string;
  readonly layer: ArchitectureLayerId;
}

export interface ArchitectureEdge {
  readonly id: ArchitectureEdgeId;
  readonly kind: ArchitectureEdgeKind;
  readonly from: ArchitectureNodeId;
  readonly to: ArchitectureNodeId;
}

export interface ArchitectureLayer {
  readonly id: ArchitectureLayerId;
  readonly kind: ArchitectureLayerKind;
  readonly name: string;
}

export interface ArchitectureGraphModel {
  readonly layers: readonly ArchitectureLayer[];
  readonly nodes: readonly ArchitectureNode[];
  readonly edges: readonly ArchitectureEdge[];
}
