/**
 * Autonomous Architecture Runtime — Domain Model Smoke Tests
 * TASK-AIS-012A.002
 */

import { describe, it, expect } from 'vitest';
import {
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
  type ArchitectureNode,
  type ArchitectureEdge,
  type ArchitectureLayer,
  type ArchitectureGraphModel,
} from '../../../core/autonomous-architecture/index.js';

describe('Domain Model', () => {
  // ─── Branded IDs compile ─────────────────────────────────────
  it('should accept ArchitectureNodeId as string', () => {
    const id = 'node-001' as ArchitectureNodeId;
    expect(typeof id).toBe('string');
  });

  it('should accept ArchitectureEdgeId as string', () => {
    const id = 'edge-001' as ArchitectureEdgeId;
    expect(typeof id).toBe('string');
  });

  it('should accept ArchitectureLayerId as string', () => {
    const id = 'layer-001' as ArchitectureLayerId;
    expect(typeof id).toBe('string');
  });

  // ─── Enums exist ─────────────────────────────────────────────
  it('should have ArchitectureNodeKind enum', () => {
    expect(ArchitectureNodeKind.Service).toBe('service');
    expect(ArchitectureNodeKind.Module).toBe('module');
    expect(ArchitectureNodeKind.Unknown).toBe('unknown');
  });

  it('should have ArchitectureEdgeKind enum', () => {
    expect(ArchitectureEdgeKind.DependsOn).toBe('depends-on');
    expect(ArchitectureEdgeKind.Composes).toBe('composes');
    expect(ArchitectureEdgeKind.References).toBe('references');
  });

  it('should have ArchitectureLayerKind enum', () => {
    expect(ArchitectureLayerKind.Domain).toBe('domain');
    expect(ArchitectureLayerKind.Core).toBe('core');
    expect(ArchitectureLayerKind.External).toBe('external');
  });

  // ─── Immutable interfaces accepted ───────────────────────────
  it('should accept ArchitectureNode as readonly object', () => {
    const node: ArchitectureNode = {
      id: 'node-001' as ArchitectureNodeId,
      kind: ArchitectureNodeKind.Service,
      name: 'AuthService',
      layer: 'layer-core' as ArchitectureLayerId,
    };
    expect(node.name).toBe('AuthService');
    expect(node.kind).toBe(ArchitectureNodeKind.Service);
  });

  it('should accept ArchitectureEdge as readonly object', () => {
    const edge: ArchitectureEdge = {
      id: 'edge-001' as ArchitectureEdgeId,
      kind: ArchitectureEdgeKind.DependsOn,
      from: 'node-a' as ArchitectureNodeId,
      to: 'node-b' as ArchitectureNodeId,
    };
    expect(edge.kind).toBe(ArchitectureEdgeKind.DependsOn);
    expect(edge.from).toBe('node-a');
  });

  it('should accept ArchitectureLayer as readonly object', () => {
    const layer: ArchitectureLayer = {
      id: 'layer-core' as ArchitectureLayerId,
      kind: ArchitectureLayerKind.Core,
      name: 'Core Layer',
    };
    expect(layer.kind).toBe(ArchitectureLayerKind.Core);
    expect(layer.name).toBe('Core Layer');
  });

  it('should accept ArchitectureGraphModel as readonly object', () => {
    const model: ArchitectureGraphModel = {
      layers: [],
      nodes: [],
      edges: [],
    };
    expect(model.layers).toEqual([]);
    expect(model.nodes).toEqual([]);
    expect(model.edges).toEqual([]);
  });

  // ─── Exports work ────────────────────────────────────────────
  it('should export all model types from index', () => {
    // Compilation success implies all exports are present.
    // Runtime verification: every imported symbol is truthy (types compile to nothing at runtime).
    expect(ArchitectureNodeKind).toBeDefined();
    expect(ArchitectureEdgeKind).toBeDefined();
    expect(ArchitectureLayerKind).toBeDefined();
  });
});
