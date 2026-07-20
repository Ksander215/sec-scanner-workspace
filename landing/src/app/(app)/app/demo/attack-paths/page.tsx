"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
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
  X,
  Info,
  TrendingUp,
  Footprints,
  Flame,
  ScanSearch,
} from "lucide-react";
import {
  buildAttackPaths,
  getLatestFindings,
  type AttackPathNode,
  type AttackPathEdge,
  type AttackPath,
  type Severity,
} from "@/lib/engine";
import { useI18n } from "@/lib/i18n-context";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";

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

function computePathLayout(
  pathIndex: number,
  apNodes: AttackPathNode[],
  apPaths: AttackPath[]
): { nodes: Node[]; edges: Edge[] } {
  const path = apPaths[pathIndex];
  if (!path) return { nodes: [], edges: [] };
  const highlightNodeIds = new Set(path.edges.map((e) => e.source).concat(path.edges.map((e) => e.target)));

  const nodes: Node[] = apNodes.map((node, i) => ({
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
  const { t } = useI18n();

  // Build attack paths from engine using latest findings
  const { apNodes, apPaths, hasFindings } = useMemo(() => {
    const findings = getLatestFindings();
    const result = buildAttackPaths(findings);
    return {
      apNodes: result.nodes as AttackPathNode[],
      apPaths: result.paths,
      hasFindings: findings.length > 0,
    };
  }, []);

  const [activePath, setActivePath] = useState(0);
  const layout = useMemo(() => computePathLayout(activePath, apNodes, apPaths), [activePath, apNodes, apPaths]);
  const [nodes, , onNodesChange] = useNodesState(layout.nodes);
  const [edges, , onEdgesChange] = useEdgesState(layout.edges);
  const [selectedEdge, setSelectedEdge] = useState<AttackPathEdge | null>(null);

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const path = apPaths[activePath];
      const edgeData = path?.edges.find((e) => e.id === edge.id);
      if (edgeData) setSelectedEdge(edgeData);
    },
    [activePath, apPaths]
  );

  const onPaneClick = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  // ─── Empty state when no findings ────────────────────────────────────────
  if (!hasFindings) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <ScanSearch className="w-8 h-8 text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {t("attackPaths.why.title")}
          </h2>
          <p className="text-sm text-muted-2 mb-6">
            Run a scan to generate attack paths from real findings.
            Attack paths trace how an attacker could move from the internet to your critical assets.
          </p>
          <a
            href="/app/scanner"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-background hover:bg-accent/90 transition-colors"
          >
            <ScanSearch className="w-4 h-4" />
            Run a Scan
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Explanation block */}
      <div id="ap-header" data-scroll-section={t("scroll.ap.overview")} className="border-b border-border bg-accent-muted/20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-foreground">{t("attackPaths.why.title")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-xs font-medium text-foreground">{t("attackPaths.whySelected")}</span>
              <p className="text-xs text-muted-2 mt-1">{t("attackPaths.whySelectedAnswer")}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-xs font-medium text-foreground">{t("attackPaths.whyDangerous")}</span>
              <p className="text-xs text-muted-2 mt-1">{t("attackPaths.whyDangerousAnswer")}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-xs font-medium text-foreground">{t("attackPaths.whatIfNothing")}</span>
              <p className="text-xs text-muted-2 mt-1">{t("attackPaths.whatIfNothingAnswer")}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-xs font-medium text-foreground">{t("attackPaths.recommendation")}</span>
              <p className="text-xs text-muted-2 mt-1">{t("attackPaths.recommendationAnswer")}</p>
            </div>
          </div>
        </div>
      </div>

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
            <div id="ap-paths" data-scroll-section={t("scroll.ap.paths")} className="flex items-center gap-2">
              {apPaths.map((ap, idx) => (
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

      <div id="ap-graph" data-scroll-section={t("scroll.ap.graph")} className="relative" style={{ height: "calc(100vh - 12rem)" }}>
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
              {apNodes.find((n) => n.id === selectedEdge.source)?.label || selectedEdge.source}
              <ChevronRight className="w-3 h-3 inline mx-1 text-muted" />
              {apNodes.find((n) => n.id === selectedEdge.target)?.label || selectedEdge.target}
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

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-surface-2 border border-border">
                  <span className="text-[10px] text-muted uppercase tracking-wider">Time to Compromise</span>
                  <div className="text-sm font-mono text-red font-bold mt-0.5">{selectedEdge.timeToCompromise}</div>
                </div>
                <div className="p-2 rounded-lg bg-surface-2 border border-border">
                  <span className="text-[10px] text-muted uppercase tracking-wider">CVSS Score</span>
                  <div className="text-sm font-mono text-amber font-bold mt-0.5">{selectedEdge.cvss}</div>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted uppercase tracking-wider">Business Risk</span>
                <div className="mt-1 text-sm text-foreground font-medium">{selectedEdge.businessRisk}</div>
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
                  {selectedEdge.techniques.map((tech) => (
                    <span key={tech} className="text-xs font-mono px-2 py-1 rounded bg-purple/10 text-purple border border-purple/20">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Path info panel */}
        <div className="absolute bottom-4 left-4 p-4 rounded-xl bg-surface/90 border border-border backdrop-blur-sm max-w-sm">
          <h4 className="text-sm font-semibold text-foreground mb-2">{apPaths[activePath]?.name || "No path"}</h4>
          <p className="text-xs text-muted-2 mb-3">
            {apPaths[activePath]?.description || "This path traces from the public internet through your infrastructure to critical assets."}
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

        {/* Why this scenario? — explanatory panel */}
        <div className="absolute top-4 right-4 max-w-xs p-4 rounded-xl bg-surface/95 border border-border backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">{t("attackPaths.why.title")}</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-red shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-foreground">{t("attackPaths.why.probability")}</span>
                <p className="text-[10px] text-muted-2">{t("attackPaths.why.probabilityDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Footprints className="w-4 h-4 text-amber shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-foreground">{t("attackPaths.why.steps")}</span>
                <p className="text-[10px] text-muted-2">{t("attackPaths.why.stepsDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Flame className="w-4 h-4 text-red shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-foreground">{t("attackPaths.why.damage")}</span>
                <p className="text-[10px] text-muted-2">{t("attackPaths.why.damageDesc")}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border">
            <p className="text-[10px] text-muted-2">
              {t("attackPaths.why.switch")}
            </p>
          </div>
        </div>
      </div>

      <div id="ap-faq" data-scroll-section={t("scroll.ap.faq")} className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionFAQ section="attack-paths" />
        <SmartNextStep {...RECOMMENDATION_CHAINS["attack-paths"]} />
      </div>
    </div>
  );
}
