"use client";

import { useState, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/ui/Badge";
import {
  Globe,
  Shield,
  Server,
  Code,
  Database,
  Key,
  Box,
  HardDrive,
  ChevronRight,
  AlertTriangle,
  X,
} from "lucide-react";
import { attackPathNodes, attackPaths, type AttackPathNode, type Severity } from "@/lib/demo-data";

// ─── Node type configs ──────────────────────────────────────────────────────

const nodeTypeConfig: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  internet: { color: "#ff4444", bg: "rgba(255,68,68,0.08)", border: "rgba(255,68,68,0.3)", icon: Globe },
  firewall: { color: "#ffb800", bg: "rgba(255,184,0,0.08)", border: "rgba(255,184,0,0.3)", icon: Shield },
  proxy: { color: "#a855f7", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.3)", icon: Server },
  app: { color: "#00d4ff", bg: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.3)", icon: Code },
  cache: { color: "#ff4444", bg: "rgba(255,68,68,0.08)", border: "rgba(255,68,68,0.3)", icon: Database },
  secrets: { color: "#ff4444", bg: "rgba(255,68,68,0.08)", border: "rgba(255,68,68,0.3)", icon: Key },
  orchestrator: { color: "#ff4444", bg: "rgba(255,68,68,0.08)", border: "rgba(255,68,68,0.3)", icon: Box },
  database: { color: "#ffb800", bg: "rgba(255,184,0,0.08)", border: "rgba(255,184,0,0.3)", icon: HardDrive },
};

// ─── Custom Node ────────────────────────────────────────────────────────────

function AttackNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AttackPathNode & { highlighted: boolean };
  const config = nodeTypeConfig[nodeData.type] || nodeTypeConfig.app;
  const Icon = config.icon;

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 transition-all duration-300 min-w-[140px] ${
        selected ? "ring-2 ring-accent/50 scale-110" : ""
      }`}
      style={{
        background: nodeData.highlighted ? config.bg.replace("0.08", "0.15") : config.bg,
        borderColor: nodeData.highlighted ? config.color : config.border,
        boxShadow: nodeData.highlighted ? `0 0 30px ${config.color}40, inset 0 0 20px ${config.color}10` : "none",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: config.color, width: 8, height: 8 }} />
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${config.color}15` }}>
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div>
          <div className="text-xs font-bold" style={{ color: config.color }}>
            {nodeData.label}
          </div>
          <div className="text-[10px] text-muted-2 font-mono">Risk: {nodeData.risk}/100</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: config.color, width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { attackNode: AttackNode };

// ─── Compute layout for attack path ─────────────────────────────────────────

function computePathLayout(pathIndex: number): { nodes: Node[]; edges: Edge[] } {
  const path = attackPaths[pathIndex];
  const highlightNodeIds = new Set(path.edges.map((e) => e.source).concat(path.edges.map((e) => e.target)));

  const nodes: Node[] = attackPathNodes.map((node, i) => ({
    id: node.id,
    type: "attackNode",
    position: { x: 0, y: i * 120 },
    data: { ...node, highlighted: highlightNodeIds.has(node.id) },
  }));

  const edges: Edge[] = path.edges.map((e) => {
    const critColor =
      e.criticality === "critical" ? "#ff4444" : e.criticality === "high" ? "#ffb800" : "#00ff88";
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.exploitable,
      style: { stroke: critColor, strokeWidth: 2 },
      label: `${Math.round(e.probability * 100)}%`,
      labelStyle: { fill: critColor, fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: "var(--color-surface)", fillOpacity: 0.9 },
    };
  });

  return { nodes, edges };
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AttackPathsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const [activePath, setActivePath] = useState(0);
  const layout = useMemo(() => computePathLayout(activePath), [activePath]);
  const [nodes, , onNodesChange] = useNodesState(layout.nodes);
  const [edges, , onEdgesChange] = useEdgesState(layout.edges);
  const [selectedEdge, setSelectedEdge] = useState<(typeof attackPaths[0]["edges"][0]) | null>(null);

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const path = attackPaths[activePath];
      const edgeData = path.edges.find((e) => e.id === edge.id);
      if (edgeData) setSelectedEdge(edgeData);
    },
    [activePath]
  );

  const onPaneClick = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-2 mb-1">
                <a href="/app/demo" className="hover:text-foreground transition-colors">Demo</a>
                <span>/</span>
                <span>Attack Paths</span>
              </div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red animate-pulse-accent" />
                Attack Path Visualizer
              </h1>
            </div>

            {/* Path selector */}
            <div className="flex items-center gap-2">
              {attackPaths.map((ap, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActivePath(idx);
                    setSelectedEdge(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    activePath === idx
                      ? "bg-red/10 text-red border-red/30 shadow-[0_0_15px_rgba(255,68,68,0.1)]"
                      : "bg-surface-2 text-muted-2 border-border hover:text-foreground"
                  }`}
                >
                  {ap.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: "calc(100vh - 12rem)" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          style={{ background: "var(--color-background)" }}
        >
          <Background color="var(--color-border)" gap={32} size={1} />
          <Controls
            showInteractive={false}
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8 }}
          />
        </ReactFlow>

        {/* Edge detail panel */}
        {selectedEdge && (
          <div className="absolute top-4 right-4 w-80 rounded-xl bg-surface border border-border p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <Badge variant={selectedEdge.criticality as Severity}>{selectedEdge.criticality}</Badge>
              <button onClick={() => setSelectedEdge(null)} className="text-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-sm font-semibold text-foreground mb-3">
              {attackPathNodes.find((n) => n.id === selectedEdge.source)?.label}
              <ChevronRight className="w-3 h-3 inline mx-1 text-muted" />
              {attackPathNodes.find((n) => n.id === selectedEdge.target)?.label}
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted uppercase tracking-wider">Probability</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-red"
                      style={{ width: `${selectedEdge.probability * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-red font-bold">
                    {Math.round(selectedEdge.probability * 100)}%
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted uppercase tracking-wider">Exploitable</span>
                <div className="mt-1">
                  {selectedEdge.exploitable ? (
                    <span className="text-sm text-red font-semibold">Yes — Active exploit available</span>
                  ) : (
                    <span className="text-sm text-accent">No — Theoretical only</span>
                  )}
                </div>
              </div>

              {selectedEdge.cves.length > 0 && (
                <div>
                  <span className="text-xs text-muted uppercase tracking-wider">CVEs</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {selectedEdge.cves.map((cve) => (
                      <span key={cve} className="text-xs font-mono px-2 py-1 rounded bg-red/10 text-red border border-red/20">
                        {cve}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-xs text-muted uppercase tracking-wider">MITRE ATT&CK</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selectedEdge.techniques.map((t) => (
                    <span key={t} className="text-xs font-mono px-2 py-1 rounded bg-purple/10 text-purple border border-purple/20">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Path info panel */}
        <div className="absolute bottom-4 left-4 p-4 rounded-xl bg-surface/90 border border-border backdrop-blur-sm max-w-sm">
          <h4 className="text-sm font-semibold text-foreground mb-2">{attackPaths[activePath].name}</h4>
          <p className="text-xs text-muted-2 mb-3">
            This path traces from the public internet through your infrastructure to critical assets.
            Each edge shows the probability of successful exploitation at that step.
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-0.5 bg-red" />
              <span className="text-muted-2">Critical</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-0.5 bg-amber" />
              <span className="text-muted-2">High</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-0.5 bg-accent" />
              <span className="text-muted-2">Medium</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-0.5 bg-muted animate-pulse" />
              <span className="text-muted-2">Exploitable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
