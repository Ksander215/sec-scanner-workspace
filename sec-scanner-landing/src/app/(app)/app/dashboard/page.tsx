"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Shield,
  AlertTriangle,
  Server,
  GitBranch,
  Lightbulb,
  CheckCircle2,
  XCircle,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Activity,
  Clock,
  ArrowRight,
  Brain,
  MessageSquare,
} from "lucide-react";
import {
  demoFindings,
  demoAssets,
  riskDistribution,
  riskTrend,
  complianceData,
  copilotExamples,
  copilotResponses,
  type Severity,
} from "@/lib/demo-data";

// ─── Mini chart (SVG sparkline) ─────────────────────────────────────────────

function Sparkline({ data, color, width = 120, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

// ─── Severity bar chart (SVG) ───────────────────────────────────────────────

function SeverityBarChart() {
  const data = [
    { label: "Critical", value: 4, color: "#ff4444" },
    { label: "High", value: 4, color: "#ffb800" },
    { label: "Medium", value: 2, color: "#ffb800" },
    { label: "Low", value: 1, color: "#00ff88" },
    { label: "Info", value: 1, color: "#00d4ff" },
  ];
  const maxVal = Math.max(...data.map((d) => d.value));

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-2 w-14 text-right">{d.label}</span>
          <div className="flex-1 h-5 bg-surface-2 rounded overflow-hidden relative">
            <div
              className="h-full rounded transition-all duration-700"
              style={{ width: `${(d.value / maxVal) * 100}%`, background: d.color }}
            />
          </div>
          <span className="text-xs font-mono text-foreground w-6">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Trend chart (SVG) ──────────────────────────────────────────────────────

function TrendChart() {
  const w = 400;
  const h = 160;
  const data = riskTrend;
  const maxScore = 100;
  const step = w / (data.length - 1);

  const scorePoints = data
    .map((d, i) => `${i * step},${h - (d.score / maxScore) * (h - 20) - 10}`)
    .join(" ");

  const criticalPoints = data
    .map((d, i) => `${i * step},${h - (d.critical / 10) * (h - 20) - 10}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={0} y1={h - (v / 100) * (h - 20) - 10} x2={w} y2={h - (v / 100) * (h - 20) - 10} stroke="#1e1e2e" strokeWidth="0.5" />
          <text x={2} y={h - (v / 100) * (h - 20) - 6} fill="#6b6b80" fontSize="8">{v}</text>
        </g>
      ))}

      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={i * step} y={h} fill="#6b6b80" fontSize="8" textAnchor="middle">{d.date}</text>
      ))}

      {/* Risk score line */}
      <polyline fill="none" stroke="#ffb800" strokeWidth="2" points={scorePoints} />
      {/* Critical count line */}
      <polyline fill="none" stroke="#ff4444" strokeWidth="1.5" strokeDasharray="4 2" points={criticalPoints} />

      {/* Legend */}
      <rect x={w - 140} y={4} width={8} height={8} fill="#ffb800" rx={1} />
      <text x={w - 128} y={12} fill="#8888a0" fontSize="8">Risk Score</text>
      <rect x={w - 70} y={4} width={8} height={8} fill="#ff4444" rx={1} />
      <text x={w - 58} y={12} fill="#8888a0" fontSize="8">Critical</text>
    </svg>
  );
}

// ─── Heatmap (compliance) ───────────────────────────────────────────────────

function ComplianceHeatmap() {
  return (
    <div className="space-y-3">
      {complianceData.map((fw) => (
        <div key={fw.name}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-2">{fw.name}</span>
            <span className={`font-mono font-bold ${fw.score >= 70 ? "text-accent" : fw.score >= 50 ? "text-amber" : "text-red"}`}>
              {fw.score}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                fw.score >= 70 ? "bg-accent" : fw.score >= 50 ? "bg-amber" : "bg-red"
              }`}
              style={{ width: `${fw.score}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted mt-0.5">
            <span>{fw.passed}/{fw.total} controls passed</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AI Copilot Chat ────────────────────────────────────────────────────────

function AICopilot() {
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);

  const handleQuery = (q: string) => {
    setActiveQuery(q);
    setIsTyping(true);
    setVisibleLines(0);

    // Simulate typing
    const response = copilotResponses[q];
    if (!response) return;

    const totalLines = response.reasoning.length + response.connections.length + response.recommendations.length;
    let lineCount = 0;

    const interval = setInterval(() => {
      lineCount++;
      setVisibleLines(lineCount);
      if (lineCount >= totalLines) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 200);
  };

  const response = activeQuery ? copilotResponses[activeQuery] : null;

  return (
    <div className="rounded-xl bg-surface border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Brain className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">AI Security Copilot</h3>
        <Badge variant="info">Preview</Badge>
      </div>

      <div className="p-4">
        {/* Example queries */}
        {!activeQuery && (
          <div className="space-y-2">
            <p className="text-xs text-muted-2 mb-3">Ask Security Intelligence...</p>
            <div className="flex flex-wrap gap-2">
              {copilotExamples.map((ex) => (
                <button
                  key={ex.question}
                  onClick={() => handleQuery(ex.question)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-surface-2 border border-border text-muted-2 hover:text-foreground hover:border-accent/30 transition-all"
                >
                  {ex.question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan" />
              <span className="text-sm text-foreground font-medium">{response.question}</span>
            </div>

            {/* Reasoning */}
            <div>
              <span className="text-xs text-muted uppercase tracking-wider">Reasoning</span>
              <div className="mt-1.5 space-y-1">
                {response.reasoning.slice(0, visibleLines).map((line, i) => (
                  <div key={i} className="text-xs text-cyan/80 font-mono flex items-start gap-2">
                    <span className="text-cyan mt-0.5">→</span>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* Connections */}
            {visibleLines > response.reasoning.length && (
              <div>
                <span className="text-xs text-muted uppercase tracking-wider">Connections Found</span>
                <div className="mt-1.5 space-y-1">
                  {response.connections
                    .slice(0, visibleLines - response.reasoning.length)
                    .map((conn, i) => (
                      <div key={i} className="text-xs text-amber/80 font-mono flex items-start gap-2">
                        <span className="text-amber mt-0.5">↔</span>
                        {conn}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {visibleLines > response.reasoning.length + response.connections.length && (
              <div>
                <span className="text-xs text-muted uppercase tracking-wider">Recommendations</span>
                <div className="mt-1.5 space-y-1">
                  {response.recommendations
                    .slice(0, visibleLines - response.reasoning.length - response.connections.length)
                    .map((rec, i) => (
                      <div key={i} className="text-xs text-accent/80 font-mono flex items-start gap-2">
                        <span className="text-accent mt-0.5">✓</span>
                        {rec}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {isTyping && (
              <div className="flex items-center gap-1 text-xs text-muted">
                <span className="w-1.5 h-3 bg-accent animate-blink" />
                Analyzing...
              </div>
            )}

            {!isTyping && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => {
                    setActiveQuery(null);
                    setVisibleLines(0);
                  }}
                  className="text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  Ask another question
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<"overview" | "findings" | "compliance" | "ai">("overview");

  const criticalCount = demoFindings.filter((f) => f.severity === "critical").length;
  const highCount = demoFindings.filter((f) => f.severity === "high").length;
  const openCount = demoFindings.filter((f) => f.status === "open").length;

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                Executive Dashboard
              </h1>
              <p className="text-sm text-muted-2 mt-1">Security posture overview — demo data</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-2">
              <Clock className="w-3.5 h-3.5" />
              Last scan: 2 minutes ago
            </div>
          </div>

          {/* View tabs */}
          <div className="flex items-center gap-1 mt-4 p-1 rounded-lg bg-surface-2 border border-border w-fit">
            {([
              { key: "overview", label: "Overview", icon: BarChart3 },
              { key: "findings", label: "Findings", icon: AlertTriangle },
              { key: "compliance", label: "Compliance", icon: CheckCircle2 },
              { key: "ai", label: "AI Copilot", icon: Brain },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeView === key ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Container className="py-6">
        {/* ─── Overview ──────────────────────────────────────────────────── */}
        {activeView === "overview" && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Security Score", value: "78", suffix: "/100", change: "-3", trend: "down", color: "text-amber", icon: Shield },
                { label: "Critical Findings", value: String(criticalCount), suffix: "", change: "+1", trend: "up", color: "text-red", icon: AlertTriangle },
                { label: "Assets at Risk", value: "5", suffix: "/8", change: "", trend: "neutral", color: "text-amber", icon: Server },
                { label: "Attack Paths", value: "3", suffix: "", change: "", trend: "neutral", color: "text-red", icon: GitBranch },
              ].map((kpi) => (
                <div key={kpi.label} className="p-5 rounded-xl bg-surface border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted uppercase tracking-wider">{kpi.label}</span>
                    <kpi.icon className="w-4 h-4 text-muted" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</span>
                    <span className="text-sm text-muted-2">{kpi.suffix}</span>
                  </div>
                  {kpi.change && (
                    <div className="flex items-center gap-1 mt-1 text-xs">
                      {kpi.trend === "down" ? (
                        <TrendingDown className="w-3 h-3 text-red" />
                      ) : (
                        <TrendingUp className="w-3 h-3 text-red" />
                      )}
                      <span className="text-muted-2">{kpi.change} this week</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Risk trend */}
              <div className="p-5 rounded-xl bg-surface border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4">Risk Score Trend</h3>
                <TrendChart />
              </div>

              {/* Severity distribution */}
              <div className="p-5 rounded-xl bg-surface border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4">Severity Distribution</h3>
                <SeverityBarChart />
              </div>
            </div>

            {/* Recommendations + Compliance */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top recommendations */}
              <div className="p-5 rounded-xl bg-surface border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4">Top Recommendations</h3>
                <div className="space-y-3">
                  {[
                    { title: "Enable Redis authentication", impact: "Eliminates 1 attack path", effort: "5 min", severity: "critical" as Severity },
                    { title: "Parameterize SQL queries", impact: "Blocks primary data breach path", effort: "2 hours", severity: "critical" as Severity },
                    { title: "Enable K8s RBAC", impact: "Prevents cluster takeover", effort: "1 hour", severity: "critical" as Severity },
                    { title: "Migrate Vault to auto-unseal", impact: "Removes key exposure", effort: "4 hours", severity: "high" as Severity },
                  ].map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                      <Badge variant={rec.severity}>{rec.severity}</Badge>
                      <div className="flex-1">
                        <div className="text-sm text-foreground font-medium">{rec.title}</div>
                        <div className="text-xs text-muted-2 mt-0.5">{rec.impact}</div>
                      </div>
                      <span className="text-xs text-muted shrink-0">{rec.effort}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance */}
              <div className="p-5 rounded-xl bg-surface border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4">Compliance Status</h3>
                <ComplianceHeatmap />
              </div>
            </div>

            {/* Recent findings */}
            <div className="p-5 rounded-xl bg-surface border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Recent Critical & High Findings</h3>
                <a href="/app/demo" className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </a>
              </div>
              <div className="space-y-2">
                {demoFindings
                  .filter((f) => f.severity === "critical" || f.severity === "high")
                  .slice(0, 6)
                  .map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                      <Badge variant={f.severity}>{f.severity}</Badge>
                      <span className="text-sm text-foreground flex-1 truncate">{f.title}</span>
                      <span className="text-xs text-muted font-mono">{f.asset}</span>
                      <span className="text-xs text-muted-2">CVSS {f.cvss}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Findings ─────────────────────────────────────────────────── */}
        {activeView === "findings" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(["critical", "high", "medium", "low", "info"] as Severity[]).map((sev) => {
                const count = demoFindings.filter((f) => f.severity === sev).length;
                const colorMap: Record<Severity, string> = { critical: "text-red", high: "text-amber", medium: "text-amber", low: "text-accent", info: "text-cyan" };
                return (
                  <div key={sev} className="p-4 rounded-xl bg-surface border border-border text-center">
                    <div className={`text-2xl font-bold ${colorMap[sev]}`}>{count}</div>
                    <div className="text-xs text-muted uppercase tracking-wider mt-1">{sev}</div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl bg-surface border border-border overflow-hidden">
              {demoFindings.map((f) => (
                <div key={f.id} className="px-5 py-3 flex items-center gap-3 border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                  <Badge variant={f.severity}>{f.severity}</Badge>
                  <span className="text-sm text-foreground flex-1">{f.title}</span>
                  <span className="text-xs text-muted font-mono">{f.asset}</span>
                  <span className="text-xs text-muted-2">CVSS {f.cvss}</span>
                  <span className="text-xs text-muted-2">{f.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Compliance ───────────────────────────────────────────────── */}
        {activeView === "compliance" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-surface border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-6">Compliance Framework Scores</h3>
              <ComplianceHeatmap />
            </div>
            <div className="p-6 rounded-xl bg-surface border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Failed Controls</h3>
              <div className="space-y-3">
                {complianceData
                  .filter((fw) => fw.score < 70)
                  .flatMap((fw) =>
                    Array.from({ length: fw.total - fw.passed }, (_, i) => ({
                      framework: fw.name,
                      control: `Control ${fw.passed + i + 1}`,
                    }))
                  )
                  .slice(0, 8)
                  .map((ctrl, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                      <XCircle className="w-4 h-4 text-red shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm text-foreground">{ctrl.control}</span>
                        <span className="text-xs text-muted-2 ml-2">({ctrl.framework})</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── AI Copilot ───────────────────────────────────────────────── */}
        {activeView === "ai" && (
          <div className="max-w-2xl mx-auto">
            <AICopilot />
          </div>
        )}
      </Container>
    </div>
  );
}
