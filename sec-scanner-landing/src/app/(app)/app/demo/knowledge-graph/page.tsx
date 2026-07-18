"use client";

import { useCallback, useMemo, useState } from "react";
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
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize,
  X,
  Server,
  AlertTriangle,
  Bug,
  Key,
  Shield,
  Lightbulb,
  Monitor,
  Info,
  Circle,
} from "lucide-react";
import { kgNodes, kgEdges, type KGNodeType, type KGNode, type Severity } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n-context";

// ─── Node color/icon mapping ────────────────────────────────────────────────

const nodeConfig: Record<KGNodeType, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  host: { color: "#00d4ff", bg: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.25)", icon: Server },
  service: { color: "#a855f7", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.25)", icon: Monitor },
  finding: { color: "#ff4444", bg: "rgba(255,68,68,0.08)", border: "rgba(255,68,68,0.25)", icon: AlertTriangle },
  cve: { color: "#ffb800", bg: "rgba(255,184,0,0.08)", border: "rgba(255,184,0,0.25)", icon: Bug },
  credential: { color: "#ff4444", bg: "rgba(255,68,68,0.08)", border: "rgba(255,68,68,0.25)", icon: Key },
  asset: { color: "#00ff88", bg: "rgba(0,255,136,0.08)", border: "rgba(0,255,136,0.25)", icon: Shield },
  recommendation: { color: "#00ff88", bg: "rgba(0,255,136,0.08)", border: "rgba(0,255,136,0.25)", icon: Lightbulb },
};

// ─── Custom Node Component ──────────────────────────────────────────────────

function KnowledgeGraphNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as KGNode & { nodeType: KGNodeType };
  const config = nodeConfig[nodeData.nodeType];
  const Icon = config.icon;

  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 transition-all duration-200 min-w-[120px] ${
        selected ? "ring-2 ring-accent/50 scale-105" : ""
      }`}
      style={{
        background: config.bg,
        borderColor: selected ? config.color : config.border,
        boxShadow: selected ? `0 0 20px ${config.color}30` : "none",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: config.color, width: 6, height: 6 }} />
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: config.color }} />
        <span className="text-xs font-semibold truncate" style={{ color: config.color }}>
          {nodeData.label}
        </span>
      </div>
      {nodeData.detail && (
        <div className="text-[10px] text-muted-2 mt-0.5 font-mono truncate">{nodeData.detail}</div>
      )}
      {nodeData.severity && (
        <div className="mt-1">
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: nodeData.severity === "critical" ? "rgba(255,68,68,0.15)" : nodeData.severity === "high" ? "rgba(255,184,0,0.15)" : "rgba(0,255,136,0.15)",
              color: nodeData.severity === "critical" ? "#ff4444" : nodeData.severity === "high" ? "#ffb800" : "#00ff88",
            }}
          >
            {nodeData.severity}
          </span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: config.color, width: 6, height: 6 }} />
    </div>
  );
}

const nodeTypes = { kgNode: KnowledgeGraphNode };

// ─── Layout positions ───────────────────────────────────────────────────────

function computeLayout(): { nodes: Node[]; edges: Edge[] } {
  const typeOrder: KGNodeType[] = ["cve", "finding", "credential", "recommendation", "host", "service", "asset"];

  const grouped = new Map<KGNodeType, KGNode[]>();
  kgNodes.forEach((n) => {
    const list = grouped.get(n.type) || [];
    list.push(n);
    grouped.set(n.type, list);
  });

  const nodes: Node[] = [];
  let y = 0;

  typeOrder.forEach((type) => {
    const group = grouped.get(type);
    if (!group) return;
    const xStart = -(group.length - 1) * 160;
    group.forEach((node, i) => {
      nodes.push({
        id: node.id,
        type: "kgNode",
        position: { x: xStart + i * 320, y },
        data: { ...node, nodeType: node.type },
      });
    });
    y += 160;
  });

  const edges: Edge[] = kgEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.label === "exploits" || e.label === "affects",
    style: {
      stroke: e.label === "exploits"
        ? "#ff4444"
        : e.label === "affects"
        ? "#ffb800"
        : e.label === "remediates"
        ? "#00ff88"
        : e.label === "authenticates" || e.label === "unseals"
        ? "#ff4444"
        : "var(--color-border-light)",
      strokeWidth: e.label === "exploits" || e.label === "affects" ? 2 : 1,
    },
    labelStyle: { fill: "var(--color-muted)", fontSize: 10 },
    labelBgStyle: { fill: "var(--color-surface)", fillOpacity: 0.8 },
  }));

  return { nodes, edges };
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function KnowledgeGraphPage() {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const layout = useMemo(() => computeLayout(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<KGNodeType | "all">("all");
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);

  const handleSearch = useCallback(
    (query: string) => {
      setSearch(query);
      const q = query.toLowerCase();
      setNodes((nds) =>
        nds.map((n) => {
          const data = n.data as unknown as KGNode;
          const matches = !q || data.label.toLowerCase().includes(q) || data.detail?.toLowerCase().includes(q);
          return { ...n, style: { ...n.style, opacity: matches ? 1 : 0.15 } };
        })
      );
    },
    [setNodes]
  );

  const handleFilter = useCallback(
    (type: KGNodeType | "all") => {
      setFilterType(type);
      setNodes((nds) =>
        nds.map((n) => {
          const data = n.data as unknown as KGNode;
          const matches = type === "all" || data.nodeType === type;
          return { ...n, style: { ...n.style, opacity: matches ? 1 : 0.15 } };
        })
      );
    },
    [setNodes]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = node.data as unknown as KGNode;
      setSelectedNode(data);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const filterTypes: { key: KGNodeType | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "host", label: "Hosts" },
    { key: "service", label: "Services" },
    { key: "finding", label: "Findings" },
    { key: "cve", label: "CVEs" },
    { key: "credential", label: "Creds" },
    { key: "recommendation", label: "Recs" },
  ];

  // "What you see" guide
  const whatYouSee = [
    { color: "#00d4ff", label: t("graph.guide.node"), icon: Server },
    { color: "#ff4444", label: t("graph.guide.redEdge"), icon: AlertTriangle },
    { color: "#ffb800", label: t("graph.guide.yellowEdge"), icon: Bug },
    { color: "#00ff88", label: t("graph.guide.greenEdge"), icon: Lightbulb },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      {/* Explanation block */}
      <div className="border-b border-border bg-accent-muted/20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-amber-muted text-amber rounded border border-amber/20">Demo</span>
            <h2 className="text-sm font-semibold text-foreground">{t("graph.guide.title")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-xs font-medium text-foreground">{t("graph.whatShows")}</span>
              <p className="text-xs text-muted-2 mt-1">{t("graph.whatShowsAnswer")}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-xs font-medium text-foreground">{t("graph.whatConnections")}</span>
              <p className="text-xs text-muted-2 mt-1">{t("graph.whatConnectionsAnswer")}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-xs font-medium text-foreground">{t("graph.whyRed")}</span>
              <p className="text-xs text-muted-2 mt-1">{t("graph.whyRedAnswer")}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-xs font-medium text-foreground">{t("graph.whatNext")}</span>
              <p className="text-xs text-muted-2 mt-1">
                {t("graph.whatNextAnswer")}{" "}
                <a href="/app/demo/attack-paths" className="text-accent hover:underline">Attack Paths</a>{" "}
                <a href="/app/findings" className="text-accent hover:underline">Findings</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-2 mb-1">
                <a href="/app/demo" className="hover:text-foreground transition-colors">Demo</a>
                <span>/</span>
                <span>Knowledge Graph</span>
              </div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse-accent" />
                Knowledge Graph Explorer
              </h1>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-3">
              {[
                { label: "Nodes", value: kgNodes.length, color: "text-cyan" },
                { label: "Edges", value: kgEdges.length, color: "text-accent" },
                { label: "Types", value: Object.keys(nodeConfig).length, color: "text-purple" },
                { label: "Critical", value: kgNodes.filter(n => n.severity === "critical").length, color: "text-red" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-2 border border-border">
                  <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                  <span className="text-[10px] text-muted uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search nodes, CVEs, hosts..."
                className="pl-9 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 w-56"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
              {filterTypes.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleFilter(key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    filterType === key ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: "calc(100vh - 10rem)" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          style={{ background: "var(--color-background)" }}
        >
          <Background color="var(--color-border)" gap={32} size={1} />
          <Controls
            showInteractive={false}
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8 }}
          />
          <MiniMap
            nodeColor={(n) => {
              const data = n.data as unknown as KGNode;
              const nodeType = data.nodeType || data.type;
              return nodeConfig[nodeType]?.color || "var(--color-muted)";
            }}
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8 }}
            maskColor="color-mix(in srgb, var(--color-background) 80%, transparent)"
          />
        </ReactFlow>

        {/* Node detail panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 rounded-xl bg-surface border border-border p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted uppercase tracking-wider">{selectedNode.type}</span>
              <button onClick={() => setSelectedNode(null)} className="text-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-2">{selectedNode.label}</h3>
            {selectedNode.detail && (
              <p className="text-xs text-muted-2 font-mono mb-2">{selectedNode.detail}</p>
            )}
            {selectedNode.severity && (
              <Badge variant={selectedNode.severity as Severity}>{selectedNode.severity}</Badge>
            )}

            {/* Connected nodes */}
            <div className="mt-4">
              <span className="text-xs text-muted uppercase tracking-wider">Connections</span>
              <div className="mt-2 space-y-1">
                {kgEdges
                  .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map((e) => {
                    const connectedId = e.source === selectedNode.id ? e.target : e.source;
                    const connectedNode = kgNodes.find((n) => n.id === connectedId);
                    return connectedNode ? (
                      <div key={e.id} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-2">{e.label}:</span>
                        <span className="text-foreground">{connectedNode.label}</span>
                      </div>
                    ) : null;
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-surface/90 border border-border backdrop-blur-sm">
          <span className="text-xs text-muted uppercase tracking-wider block mb-2">Legend</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(nodeConfig).map(([type, cfg]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded" style={{ background: cfg.color }} />
                <span className="text-xs text-muted-2 capitalize">{type}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-red" />
              <span className="text-xs text-muted-2">Exploits</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-amber" />
              <span className="text-xs text-muted-2">Affects</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-accent" />
              <span className="text-xs text-muted-2">Remediates</span>
            </div>
          </div>
        </div>

        {/* What you see — explanatory guide overlay */}
        <div className="absolute top-4 left-4 max-w-xs p-4 rounded-xl bg-surface/95 border border-border backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">{t("graph.guide.title")}</span>
          </div>
          <div className="space-y-2">
            {whatYouSee.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm flex items-center justify-center" style={{ background: item.color + "20", border: `1px solid ${item.color}40` }}>
                  <item.icon className="w-2 h-2" style={{ color: item.color }} />
                </div>
                <span className="text-xs text-muted-2">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-border">
            <p className="text-xs text-muted-2">
              <span className="text-foreground font-medium">{t("graph.guide.whyTitle")}</span> {t("graph.guide.whyDesc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
