/**
 * Knowledge Graph Storage Adapter — Import / Export
 *
 * Supports three formats:
 * - JSON: Full graph serialization (nodes + edges + metadata)
 * - DOT: Graphviz DOT format for visualization
 * - GraphML: XML-based graph interchange format
 *
 * All formats support both import and export.
 * Import supports merge strategies: replace, merge, skip_existing.
 */

import type { GraphNode, GraphEdge } from '../../models/index.ts';
import {
  graphNodeFromJSON,
  graphNodeToJSON,
  graphEdgeFromJSON,
  graphEdgeToJSON,
  createGraphNode,
  createGraphEdge,
  createRelationship,
} from '../../models/index.ts';
import { NodeType, EdgeType } from '../../types/index.ts';
import type { ExportOptions, ExportResult, ImportOptions, ImportResult } from '../types/index.ts';
import { ExportFormat, ImportFormat } from '../types/index.ts';

// ─── JSON Export ──────────────────────────────────────────────

function exportJSON(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  options: ExportOptions,
): string {
  const filterNodeTypes = options.filter?.nodeTypes
    ? new Set(options.filter.nodeTypes) : null;
  const filterEdgeTypes = options.filter?.edgeTypes
    ? new Set(options.filter.edgeTypes) : null;

  const filteredNodes = filterNodeTypes
    ? nodes.filter(n => filterNodeTypes.has(n.identity.type))
    : nodes;

  const nodeIds = new Set(filteredNodes.map(n => n.identity.id));
  const filteredEdges = edges.filter(e => {
    if (!nodeIds.has(e.sourceId) || !nodeIds.has(e.targetId)) return false;
    if (filterEdgeTypes && !filterEdgeTypes.has(e.relationship.edgeType)) return false;
    return true;
  });

  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    nodeCount: filteredNodes.length,
    edgeCount: filteredEdges.length,
    nodes: filteredNodes.map(n => options.includeMetadata ? graphNodeToJSON(n) : {
      identity: n.identity,
      properties: n.properties,
    }),
    edges: filteredEdges.map(e => options.includeMetadata ? graphEdgeToJSON(e) : {
      id: e.id,
      sourceId: e.sourceId,
      targetId: e.targetId,
      relationship: e.relationship,
      properties: e.properties,
    }),
  };

  return options.prettyPrint
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);
}

// ─── JSON Import ──────────────────────────────────────────────

function importJSON(
  data: string,
): { nodes: GraphNode[]; edges: GraphEdge[]; errors: string[] } {
  const errors: string[] = [];
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(data);
  } catch (e) {
    return { nodes: [], edges: [], errors: [`Invalid JSON: ${(e as Error).message}`] };
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const rawNodes = (parsed.nodes ?? []) as Record<string, unknown>[];
  for (let i = 0; i < rawNodes.length; i++) {
    try {
      nodes.push(graphNodeFromJSON(rawNodes[i]));
    } catch (e) {
      errors.push(`Node at index ${i}: ${(e as Error).message}`);
    }
  }

  const rawEdges = (parsed.edges ?? []) as Record<string, unknown>[];
  for (let i = 0; i < rawEdges.length; i++) {
    try {
      edges.push(graphEdgeFromJSON(rawEdges[i]));
    } catch (e) {
      errors.push(`Edge at index ${i}: ${(e as Error).message}`);
    }
  }

  return { nodes, edges, errors };
}

// ─── DOT Export ───────────────────────────────────────────────

function exportDOT(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  options: ExportOptions,
): string {
  const filterNodeTypes = options.filter?.nodeTypes
    ? new Set(options.filter.nodeTypes) : null;

  const filteredNodes = filterNodeTypes
    ? nodes.filter(n => filterNodeTypes.has(n.identity.type))
    : nodes;

  const nodeIds = new Set(filteredNodes.map(n => n.identity.id));
  const filteredEdges = edges.filter(e => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));

  const lines: string[] = ['digraph KnowledgeGraph {'];
  lines.push('  rankdir=LR;');
  lines.push('  node [shape=box, style=filled, fillcolor="#e8f4f8"];');
  lines.push('');

  for (const node of filteredNodes) {
    const label = node.identity.labels.length > 0
      ? `${node.identity.type}\\n${node.identity.labels.join(', ')}`
      : node.identity.type;
    const safeId = dotSafeId(node.identity.id);
    lines.push(`  ${safeId} [label="${label}"];`);
  }

  lines.push('');

  for (const edge of filteredEdges) {
    const sourceSafe = dotSafeId(edge.sourceId);
    const targetSafe = dotSafeId(edge.targetId);
    const label = edge.relationship.edgeType;
    lines.push(`  ${sourceSafe} -> ${targetSafe} [label="${label}"];`);
  }

  lines.push('}');
  return lines.join('\n');
}

// ─── DOT Import ───────────────────────────────────────────────

function importDOT(
  data: string,
): { nodes: GraphNode[]; edges: GraphEdge[]; errors: string[] } {
  const errors: string[] = [];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const nodePattern = /^\s*(\w+)\s*\[label="([^"]*)"\];\s*$/;
  const edgePattern = /^\s*(\w+)\s*->\s*(\w+)\s*\[label="([^"]*)"\];\s*$/;

  for (const line of data.split('\n')) {
    const edgeMatch = line.match(edgePattern);
    if (edgeMatch) {
      const [, sourceId, targetId, edgeTypeStr] = edgeMatch;
      try {
        const edgeType = Object.values(EdgeType).includes(edgeTypeStr as EdgeType)
          ? (edgeTypeStr as EdgeType)
          : EdgeType.RELATED_TO;
        const rel = createRelationship(edgeType);
        const edge = createGraphEdge(
          `edge_${sourceId}_${targetId}`,
          sourceId,
          targetId,
          rel,
        );
        edges.push(edge);
      } catch (e) {
        errors.push(`DOT edge parse: ${(e as Error).message}`);
      }
      continue;
    }

    const nodeMatch = line.match(nodePattern);
    if (nodeMatch) {
      const [, id, labelStr] = nodeMatch;
      const parts = labelStr.split('\\n');
      const typeStr = parts[0] || 'Asset';
      const type = Object.values(NodeType).includes(typeStr as NodeType)
        ? (typeStr as NodeType)
        : NodeType.Asset;
      const labels = parts.slice(1);
      try {
        const node = createGraphNode(id, type, { labels });
        nodes.push(node);
      } catch (e) {
        errors.push(`DOT node parse: ${(e as Error).message}`);
      }
    }
  }

  return { nodes, edges, errors };
}

// ─── GraphML Export ───────────────────────────────────────────

function exportGraphML(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  options: ExportOptions,
): string {
  const filterNodeTypes = options.filter?.nodeTypes
    ? new Set(options.filter.nodeTypes) : null;

  const filteredNodes = filterNodeTypes
    ? nodes.filter(n => filterNodeTypes.has(n.identity.type))
    : nodes;

  const nodeIds = new Set(filteredNodes.map(n => n.identity.id));
  const filteredEdges = edges.filter(e => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphstruct.org/graphml">',
    '  <key id="type" for="node" attr.name="type" attr.type="string"/>',
    '  <key id="labels" for="node" attr.name="labels" attr.type="string"/>',
    '  <key id="edgeType" for="edge" attr.name="edgeType" attr.type="string"/>',
    '  <graph id="KnowledgeGraph" edgedefault="directed">',
  ];

  for (const node of filteredNodes) {
    const escapedId = xmlEscape(node.identity.id);
    const escapedType = xmlEscape(node.identity.type);
    const escapedLabels = xmlEscape(node.identity.labels.join(','));
    lines.push(`    <node id="${escapedId}">`);
    lines.push(`      <data key="type">${escapedType}</data>`);
    lines.push(`      <data key="labels">${escapedLabels}</data>`);
    if (options.includeMetadata) {
      for (const [key, value] of Object.entries(node.properties)) {
        lines.push(`      <data key="${xmlEscape(key)}">${xmlEscape(String(value))}</data>`);
      }
    }
    lines.push('    </node>');
  }

  for (const edge of filteredEdges) {
    const escapedId = xmlEscape(edge.id);
    const escapedSource = xmlEscape(edge.sourceId);
    const escapedTarget = xmlEscape(edge.targetId);
    const escapedEdgeType = xmlEscape(edge.relationship.edgeType);
    lines.push(`    <edge id="${escapedId}" source="${escapedSource}" target="${escapedTarget}">`);
    lines.push(`      <data key="edgeType">${escapedEdgeType}</data>`);
    lines.push('    </edge>');
  }

  lines.push('  </graph>');
  lines.push('</graphml>');
  return lines.join('\n');
}

// ─── GraphML Import ───────────────────────────────────────────

function importGraphML(
  data: string,
): { nodes: GraphNode[]; edges: GraphEdge[]; errors: string[] } {
  const errors: string[] = [];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const nodePattern = /<node\s+id="([^"]+)">([\s\S]*?)<\/node>/g;
  const edgePattern = /<edge\s+id="([^"]+)"\s+source="([^"]+)"\s+target="([^"]+)">([\s\S]*?)<\/edge>/g;
  const dataPattern = /<data\s+key="([^"]+)">([^<]*)<\/data>/g;

  let match: RegExpExecArray | null;

  // Parse nodes
  while ((match = nodePattern.exec(data)) !== null) {
    const id = match[1];
    const dataContent = match[2];
    const props: Record<string, string> = {};

    let dataMatch: RegExpExecArray | null;
    const dataRegex = new RegExp(dataPattern.source, 'g');
    while ((dataMatch = dataRegex.exec(dataContent)) !== null) {
      props[dataMatch[1]] = dataMatch[2];
    }

    try {
      const typeStr = props['type'] || 'Asset';
      const type = Object.values(NodeType).includes(typeStr as NodeType)
        ? (typeStr as NodeType)
        : NodeType.Asset;
      const labels = (props['labels'] || '').split(',').filter(Boolean);
      const node = createGraphNode(id, type, { labels });
      nodes.push(node);
    } catch (e) {
      errors.push(`GraphML node '${id}': ${(e as Error).message}`);
    }
  }

  // Parse edges
  while ((match = edgePattern.exec(data)) !== null) {
    const id = match[1];
    const sourceId = match[2];
    const targetId = match[3];
    const dataContent = match[4];

    const props: Record<string, string> = {};
    let dataMatch: RegExpExecArray | null;
    const dataRegex = new RegExp(dataPattern.source, 'g');
    while ((dataMatch = dataRegex.exec(dataContent)) !== null) {
      props[dataMatch[1]] = dataMatch[2];
    }

    try {
      const edgeTypeStr = props['edgeType'] || 'RELATED_TO';
      const edgeType = Object.values(EdgeType).includes(edgeTypeStr as EdgeType)
        ? (edgeTypeStr as EdgeType)
        : EdgeType.RELATED_TO;
      const rel = createRelationship(edgeType);
      const edge = createGraphEdge(id, sourceId, targetId, rel);
      edges.push(edge);
    } catch (e) {
      errors.push(`GraphML edge '${id}': ${(e as Error).message}`);
    }
  }

  return { nodes, edges, errors };
}

// ─── Utility Functions ────────────────────────────────────────

function dotSafeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Parsed Data Result (internal) ────────────────────────────

/** Result of parsing import data — includes actual nodes and edges */
export interface ParsedImportData {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
  readonly errors: string[];
}

// ─── Public API ───────────────────────────────────────────────

export function exportGraph(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  options: ExportOptions,
): ExportResult {
  const start = performance.now();
  let data: string;

  switch (options.format) {
    case ExportFormat.JSON:
      data = exportJSON(nodes, edges, options);
      break;
    case ExportFormat.DOT:
      data = exportDOT(nodes, edges, options);
      break;
    case ExportFormat.GraphML:
      data = exportGraphML(nodes, edges, options);
      break;
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }

  return {
    data,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    format: options.format,
    durationMs: performance.now() - start,
  };
}

/**
 * Parse import data and return actual nodes and edges.
 * Used by the adapter to apply parsed data to storage.
 */
export function parseImportData(
  data: string,
  format: ImportFormat,
): ParsedImportData {
  switch (format) {
    case ImportFormat.JSON:
      return importJSON(data);
    case ImportFormat.DOT:
      return importDOT(data);
    case ImportFormat.GraphML:
      return importGraphML(data);
    default:
      throw new Error(`Unsupported import format: ${format}`);
  }
}

export function importGraph(
  data: string,
  options: ImportOptions,
): ImportResult {
  const start = performance.now();
  const parsed = parseImportData(data, options.format);

  return {
    nodesImported: parsed.nodes.length,
    edgesImported: parsed.edges.length,
    nodesSkipped: 0,
    edgesSkipped: 0,
    errors: parsed.errors,
    durationMs: performance.now() - start,
  };
}
