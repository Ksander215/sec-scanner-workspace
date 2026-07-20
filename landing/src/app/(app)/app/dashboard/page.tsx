"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TermTooltip } from "@/components/ui/TermTooltip";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { BusinessResult } from "@/components/ui/BusinessResult";
import { ConfidenceScore } from "@/components/ui/ConfidenceScore";
import { CompanyProgress } from "@/components/ui/CompanyProgress";
import { WhyImportant } from "@/components/ui/WhyImportant";
import { useI18n } from "@/lib/i18n-context";
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
  Store,
  Rocket,
  BookOpen,
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
          <line x1={0} y1={h - (v / 100) * (h - 20) - 10} x2={w} y2={h - (v / 100) * (h - 20) - 10} stroke="var(--color-border)" strokeWidth="0.5" />
          <text x={2} y={h - (v / 100) * (h - 20) - 6} fill="var(--color-muted)" fontSize="8">{v}</text>
        </g>
      ))}

      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={i * step} y={h} fill="var(--color-muted)" fontSize="8" textAnchor="middle">{d.date}</text>
      ))}

      {/* Risk score line */}
      <polyline fill="none" stroke="var(--color-amber)" strokeWidth="2" points={scorePoints} />
      {/* Critical count line */}
      <polyline fill="none" stroke="var(--color-red)" strokeWidth="1.5" strokeDasharray="4 2" points={criticalPoints} />

      {/* Legend */}
      <rect x={w - 140} y={4} width={8} height={8} fill="var(--color-amber)" rx={1} />
      <text x={w - 128} y={12} fill="var(--color-muted-2)" fontSize="8">Risk Score</text>
      <rect x={w - 70} y={4} width={8} height={8} fill="var(--color-red)" rx={1} />
      <text x={w - 58} y={12} fill="var(--color-muted-2)" fontSize="8">Critical</text>
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
  const { t } = useI18n();
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
                <span className="ml-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-amber-muted text-amber rounded border border-amber/20">Demo</span>
              </h1>
              <p className="text-sm text-muted-2 mt-1">{t("dashboard.subtitle")} — demo data</p>
              <div className="mt-2"><ContextualHelp section="dashboard" /></div>
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
            {/* Today's Overview — Large hero card + 3 smaller KPI cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Security Score — hero card (2 cols) */}
              <div className="lg:col-span-2 p-6 rounded-xl bg-surface border border-border relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-[80px]" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-accent" />
                    <span className="text-xs text-muted uppercase tracking-wider font-medium">Today's Overview</span>
                    <span className="ml-auto text-xs text-muted-2 flex items-center gap-1"><Clock className="w-3 h-3" />Updated 2 min ago</span>
                  </div>
                  <div className="flex items-end gap-6">
                    <div>
                      <div className="text-6xl font-bold text-amber">78</div>
                      <div className="text-sm text-muted-2 mt-1">Security Score out of 100</div>
                      <div className="flex items-center gap-1 mt-2 text-xs">
                        <TrendingDown className="w-3 h-3 text-red" />
                        <span className="text-red">-3</span>
                        <span className="text-muted-2">from last week</span>
                      </div>
                      <div className="mt-3">
                        <BusinessResult type={criticalCount > 0 ? "risks_known" : "security_transparent"} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-surface-2 border border-border text-center">
                          <div className="text-2xl font-bold text-red">{criticalCount}</div>
                          <div className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Critical</div>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-2 border border-border text-center">
                          <div className="text-2xl font-bold text-red">3</div>
                          <div className="text-[10px] text-muted uppercase tracking-wider mt-0.5 flex items-center justify-center gap-0.5">Attack Paths <TermTooltip termKey="dashboard.term.attackPath" explainKey="dashboard.term.attackPath.explain" /></div>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-2 border border-border text-center">
                          <div className="text-2xl font-bold text-amber">{highCount}</div>
                          <div className="text-[10px] text-muted uppercase tracking-wider mt-0.5">High</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Incidents — tall card */}
              <div className="p-6 rounded-xl bg-surface border border-red/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red/5 rounded-full blur-[60px]" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red" />
                    <span className="text-xs text-muted uppercase tracking-wider font-medium">Active Incidents</span>
                  </div>
                  <div className="text-4xl font-bold text-red">{openCount}</div>
                  <div className="text-sm text-muted-2 mt-1">Open findings require attention</div>
                  <div className="mt-4 space-y-2">
                    {demoFindings.filter(f => f.severity === "critical").slice(0, 3).map((f) => (
                      <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-muted/50 border border-red/10">
                        <div className="w-2 h-2 rounded-full bg-red animate-pulse shrink-0" />
                        <span className="text-xs text-foreground truncate flex-1">{f.title}</span>
                      </div>
                    ))}
                  </div>
                  <a href="/app/findings" className="mt-3 text-xs text-red hover:text-red/80 flex items-center gap-1">
                    View all incidents <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* AI Recommendations — full-width banner */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-purple-muted/30 to-cyan-muted/30 border border-purple/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-muted flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">AI Recommendation</h3>
                  <p className="text-xs text-muted-2 mt-0.5">Enable Redis authentication on production-cluster — this will eliminate 1 critical attack path in under 5 minutes.</p>
                </div>
                <a href="/app/dashboard" onClick={() => setActiveView("ai")} className="shrink-0 px-4 py-2 text-xs font-medium bg-purple text-foreground rounded-lg hover:bg-purple/80 transition-colors">
                  Ask AI Copilot
                </a>
              </div>
            </div>

            {/* INT-035: Confidence Score + Company Progress */}
            <div className="grid md:grid-cols-2 gap-4">
              <ConfidenceScore
                score={78}
                factors={{
                  fixedIssues: 26,
                  coveredServices: 85,
                  connectedIntegrations: 5,
                  automationPercent: 81,
                }}
              />
              <CompanyProgress
                stats={[
                  { labelKey: "confidence.progress.fixedIssues", value: 26, positive: true },
                  { labelKey: "confidence.progress.closedPaths", value: 4, positive: true },
                  { labelKey: "confidence.progress.connectedIntegrations", value: 5, positive: true },
                  { labelKey: "confidence.progress.automatedChecks", value: "81%", positive: true },
                ]}
                trendKey="confidence.progress.trendUp"
                nextAction={{ labelKey: "confidence.term.recommendations", href: "/app/findings" }}
              />
            </div>

            {/* INT-035: Why this matters */}
            <WhyImportant textKey="confidence.why.scanner" />

            {/* Risk Trend (2 cols) + Latest Scans (1 col) */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Risk trend — wide card */}
              <div className="md:col-span-2 p-5 rounded-xl bg-surface border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><TermTooltip termKey="dashboard.term.riskScore" explainKey="dashboard.term.riskScore.explain" /> Trend (30 days)</h3>
                  <span className="text-xs text-muted-2">Updated daily</span>
                </div>
                <TrendChart />
              </div>

              {/* Latest Scans — compact card */}
              <div className="p-5 rounded-xl bg-surface border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4">Latest Scans</h3>
                <div className="space-y-2.5">
                  {[
                    { name: "Production API", status: "completed", time: "2 min ago", findings: 12 },
                    { name: "Staging Web", status: "running", time: "In progress", findings: 5 },
                    { name: "K8s Cluster", status: "completed", time: "1 hour ago", findings: 8 },
                    { name: "VPN Gateway", status: "completed", time: "3 hours ago", findings: 3 },
                  ].map((scan, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-2 border border-border">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${scan.status === "running" ? "bg-cyan animate-pulse" : "bg-accent"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{scan.name}</div>
                        <div className="text-[10px] text-muted">{scan.time}</div>
                      </div>
                      <span className="text-[10px] text-muted-2 font-mono">{scan.findings} found</span>
                    </div>
                  ))}
                </div>
                <a href="/app/scans" className="mt-3 text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                  All scans <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Severity Distribution + Compliance + Recent Reports — 3 cols */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-surface border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4">Severity Distribution</h3>
                <SeverityBarChart />
              </div>

              <div className="p-5 rounded-xl bg-surface border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4">Compliance Status</h3>
                <ComplianceHeatmap />
              </div>

              <div className="p-5 rounded-xl bg-surface border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Recent Reports</h3>
                  <a href="/app/reports" className="text-xs text-accent hover:text-accent-hover">View all</a>
                </div>
                <div className="space-y-2.5">
                  {[
                    { name: "Executive Summary Q3", type: "PDF", date: "Jul 15" },
                    { name: "Vulnerability Assessment", type: "PDF", date: "Jul 14" },
                    { name: "PCI-DSS Compliance", type: "PDF", date: "Jul 12" },
                    { name: "Attack Path Analysis", type: "HTML", date: "Jul 10" },
                  ].map((report, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-2 border border-border">
                      <BarChart3 className="w-3.5 h-3.5 text-purple shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{report.name}</div>
                        <div className="text-[10px] text-muted">{report.type} · {report.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Recommendations — full width */}
            <div className="p-5 rounded-xl bg-surface border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Top Recommendations</h3>
                <span className="text-xs text-muted-2">Sorted by impact</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
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
                  <span className="text-xs text-muted-2 flex items-center gap-0.5">CVSS {f.cvss} <TermTooltip termKey="dashboard.term.cvss" explainKey="dashboard.term.cvss.explain" /></span>
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
        {/* ─── Что делать дальше? ──────────────────────────────────────── */}
        <div className="mt-8 p-5 rounded-xl border border-border bg-surface">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t("dashboard.whatNext.title")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Rocket, label: t("dashboard.whatNext.scan"), href: "/app/scans" },
              { icon: Store, label: t("dashboard.whatNext.marketplace"), href: "/app/marketplace" },
              { icon: BookOpen, label: t("dashboard.whatNext.docs"), href: "/app/docs" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/30 hover:bg-accent-muted/30 transition-all group"
              >
                <item.icon className="w-4 h-4 text-accent shrink-0" />
                <span className="text-sm text-foreground group-hover:text-accent transition-colors">{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
