"use client";

import { useState, useEffect, useCallback } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Play,
  Upload,
  Database,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Circle,
  AlertTriangle,
  XCircle,
  Info,
  ExternalLink,
} from "lucide-react";
import { demoFindings, pipelineStages, type Finding, type PipelineStage, type Severity } from "@/lib/demo-data";

// ─── Severity helpers ───────────────────────────────────────────────────────

const severityIcon: Record<Severity, React.ReactNode> = {
  critical: <XCircle className="w-4 h-4 text-red" />,
  high: <AlertTriangle className="w-4 h-4 text-amber" />,
  medium: <AlertTriangle className="w-4 h-4 text-amber" />,
  low: <Info className="w-4 h-4 text-accent" />,
  info: <Info className="w-4 h-4 text-cyan" />,
};

const severityColors: Record<Severity, string> = {
  critical: "text-red",
  high: "text-amber",
  medium: "text-amber",
  low: "text-accent",
  info: "text-cyan",
};

// ─── Pipeline Stage Component ───────────────────────────────────────────────

function PipelineStageCard({
  stage,
  index,
  status,
  progress,
  outputs,
  isLast,
}: {
  stage: PipelineStage;
  index: number;
  status: "pending" | "running" | "completed";
  progress: number;
  outputs: string[];
  isLast: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      {/* Stage Card */}
      <div
        className={`w-full max-w-md p-4 rounded-xl border transition-all duration-500 ${
          status === "running"
            ? "bg-accent-muted border-accent/40 shadow-[0_0_30px_rgba(0,255,136,0.1)]"
            : status === "completed"
            ? "bg-surface border-accent/20"
            : "bg-surface border-border opacity-50"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-mono font-bold bg-surface-2 border border-border">
            {status === "completed" ? (
              <CheckCircle2 className="w-4 h-4 text-accent" />
            ) : status === "running" ? (
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
            ) : (
              <span className="text-muted">{index + 1}</span>
            )}
          </div>
          <div className="flex-1">
            <h3
              className={`text-sm font-semibold ${
                status === "running" ? "text-accent" : status === "completed" ? "text-foreground" : "text-muted"
              }`}
            >
              {stage.label}
            </h3>
            <p className="text-xs text-muted-2">{stage.description}</p>
          </div>
        </div>

        {/* Progress bar */}
        {status === "running" && (
          <div className="mt-2 ml-10">
            <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-muted font-mono">{Math.round(progress)}%</div>
          </div>
        )}

        {/* Outputs */}
        {status === "completed" && outputs.length > 0 && (
          <div className="mt-2 ml-10 space-y-0.5">
            {outputs.map((out, i) => (
              <div key={i} className="text-xs text-accent/80 font-mono flex items-center gap-1.5">
                <span className="text-accent">→</span> {out}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connector arrow */}
      {!isLast && (
        <div className="flex flex-col items-center my-1">
          <div
            className={`w-px h-6 transition-colors duration-300 ${
              status === "completed" ? "bg-accent/40" : "bg-border"
            }`}
          />
          <ChevronDown
            className={`w-4 h-4 transition-colors duration-300 ${
              status === "completed" ? "text-accent/40" : "text-border"
            }`}
          />
        </div>
      )}
    </div>
  );
}

// ─── Finding Row ────────────────────────────────────────────────────────────

function FindingRow({ finding, expanded, onToggle }: { finding: Finding; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-2 transition-colors text-left"
      >
        {severityIcon[finding.severity]}
        <Badge variant={finding.severity}>{finding.severity}</Badge>
        <span className="text-sm text-foreground flex-1 truncate">{finding.title}</span>
        <span className="text-xs font-mono text-muted">{finding.id}</span>
        <span className="text-xs font-mono text-muted-2">CVSS {finding.cvss}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 ml-9 space-y-3">
          <div>
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Description</span>
            <p className="text-sm text-foreground mt-1">{finding.description}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Recommendation</span>
            <p className="text-sm text-accent mt-1">{finding.recommendation}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {finding.cve && (
              <span className="text-xs font-mono px-2 py-1 rounded bg-red/10 text-red border border-red/20">
                {finding.cve}
              </span>
            )}
            {finding.mitre && (
              <span className="text-xs font-mono px-2 py-1 rounded bg-purple/10 text-purple border border-purple/20">
                MITRE {finding.mitre}
              </span>
            )}
            <span className="text-xs font-mono px-2 py-1 rounded bg-cyan/10 text-cyan border border-cyan/20">
              {finding.asset}
            </span>
            <span className="text-xs font-mono px-2 py-1 rounded bg-surface-2 text-muted-2 border border-border">
              {finding.service}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────

type DataSource = "demo" | "upload" | "dataset";

export default function DemoWorkspacePage() {
  const [dataSource, setDataSource] = useState<DataSource>("demo");
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const [stageProgress, setStageProgress] = useState(0);
  const [stageOutputs, setStageOutputs] = useState<Record<number, string[]>>({});
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pipeline" | "findings" | "risk" | "paths">("pipeline");

  const runPipeline = useCallback(() => {
    setPipelineRunning(true);
    setPipelineComplete(false);
    setCurrentStage(0);
    setStageProgress(0);
    setStageOutputs({});

    let stageIdx = 0;
    let progress = 0;

    const progressInterval = setInterval(() => {
      progress += Math.random() * 8 + 2;
      if (progress >= 100) {
        progress = 100;
        setStageProgress(100);
        setStageOutputs((prev) => ({
          ...prev,
          [stageIdx]: pipelineStages[stageIdx].outputs,
        }));

        clearInterval(progressInterval);

        setTimeout(() => {
          stageIdx++;
          if (stageIdx < pipelineStages.length) {
            setCurrentStage(stageIdx);
            setStageProgress(0);
            progress = 0;
            runNextStage();
          } else {
            setPipelineRunning(false);
            setPipelineComplete(true);
            setCurrentStage(pipelineStages.length);
          }
        }, 400);
      } else {
        setStageProgress(progress);
      }
    }, 80);

    function runNextStage() {
      const interval = setInterval(() => {
        progress += Math.random() * 8 + 2;
        if (progress >= 100) {
          progress = 100;
          setStageProgress(100);
          setStageOutputs((prev) => ({
            ...prev,
            [stageIdx]: pipelineStages[stageIdx].outputs,
          }));

          clearInterval(interval);

          setTimeout(() => {
            stageIdx++;
            if (stageIdx < pipelineStages.length) {
              setCurrentStage(stageIdx);
              setStageProgress(0);
              progress = 0;
              runNextStage();
            } else {
              setPipelineRunning(false);
              setPipelineComplete(true);
              setCurrentStage(pipelineStages.length);
            }
          }, 400);
        } else {
          setStageProgress(progress);
        }
      }, 80);
    }
  }, []);

  const resetPipeline = () => {
    setPipelineRunning(false);
    setPipelineComplete(false);
    setCurrentStage(-1);
    setStageProgress(0);
    setStageOutputs({});
  };

  const findingsBySeverity = {
    critical: demoFindings.filter((f) => f.severity === "critical"),
    high: demoFindings.filter((f) => f.severity === "high"),
    medium: demoFindings.filter((f) => f.severity === "medium"),
    low: demoFindings.filter((f) => f.severity === "low"),
    info: demoFindings.filter((f) => f.severity === "info"),
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header bar */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse-accent" />
                Security Intelligence Demo
              </h1>
              <p className="text-sm text-muted-2 mt-1">Interactive workspace — explore the platform with demo data</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Data source selector */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
                {([
                  { key: "demo", label: "Demo", icon: Play },
                  { key: "upload", label: "Upload", icon: Upload },
                  { key: "dataset", label: "Dataset", icon: Database },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setDataSource(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      dataSource === key
                        ? "bg-accent text-background"
                        : "text-muted-2 hover:text-foreground hover:bg-surface-3"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Run / Reset */}
              {!pipelineRunning && !pipelineComplete && (
                <Button onClick={runPipeline} size="sm">
                  <Play className="w-4 h-4" />
                  Run Analysis
                </Button>
              )}
              {pipelineRunning && (
                <Button variant="secondary" size="sm" disabled>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </Button>
              )}
              {pipelineComplete && (
                <Button variant="outline" size="sm" onClick={resetPipeline}>
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Container className="py-6">
        {/* Upload hint */}
        {dataSource === "upload" && (
          <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-border hover:border-accent/30 transition-colors text-center">
            <Upload className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted-2">Drop a JSON or SARIF file here, or click to browse</p>
            <p className="text-xs text-muted mt-1">Supports: OWASP SARIF, Burp XML, Nmap XML, ZAP JSON</p>
          </div>
        )}

        {dataSource === "dataset" && (
          <div className="mb-6 p-4 rounded-xl bg-surface border border-border">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-5 h-5 text-cyan" />
              <h3 className="text-sm font-semibold text-foreground">Built-in Demo Dataset</h3>
              <Badge variant="info">12 Findings</Badge>
            </div>
            <p className="text-xs text-muted-2">
              Pre-configured environment: 8 assets, 12 findings (4 critical, 4 high, 2 medium, 1 low, 1 info), 3 attack paths,
              5 CVEs, and 6 recommendations.
            </p>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex items-center gap-1 p-1 mb-6 rounded-lg bg-surface-2 border border-border w-fit">
          {([
            { key: "pipeline", label: "Pipeline" },
            { key: "findings", label: "Findings" },
            { key: "risk", label: "Risk" },
            { key: "paths", label: "Attack Paths" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === key ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ─── Pipeline Tab ─────────────────────────────────────────────── */}
        {activeTab === "pipeline" && (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            {/* Pipeline stages */}
            <div className="space-y-0">
              {pipelineStages.map((stage, i) => (
                <PipelineStageCard
                  key={stage.id}
                  stage={stage}
                  index={i}
                  status={
                    currentStage > i ? "completed" : currentStage === i ? "running" : "pending"
                  }
                  progress={currentStage === i ? stageProgress : 0}
                  outputs={stageOutputs[i] || []}
                  isLast={i === pipelineStages.length - 1}
                />
              ))}
            </div>

            {/* Live terminal */}
            <div className="rounded-xl bg-surface border border-border overflow-hidden h-fit sticky top-20">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className="w-2.5 h-2.5 rounded-full bg-red/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
                <span className="ml-2 text-xs text-muted font-mono">Live Output</span>
              </div>
              <div className="p-4 font-mono text-xs leading-relaxed max-h-[500px] overflow-y-auto">
                {!pipelineRunning && currentStage === -1 && (
                  <div className="text-muted">
                    $ sec-scanner analyze --project demo
                    <br />
                    <span className="text-muted-2">Ready. Press &quot;Run Analysis&quot; to start.</span>
                    <span className="ml-1 w-2 h-3 bg-accent animate-blink inline-block" />
                  </div>
                )}
                {currentStage >= 0 && (
                  <>
                    <div className="text-muted">$ sec-scanner analyze --project demo</div>
                    {pipelineStages.slice(0, Math.min(currentStage + 1, pipelineStages.length)).map((stage, i) => (
                      <div key={stage.id} className="mt-1">
                        <div className={currentStage > i ? "text-accent" : "text-amber"}>
                          [{currentStage > i ? "✓" : "..."}] {stage.label}...
                        </div>
                        {stageOutputs[i]?.map((out, j) => (
                          <div key={j} className="text-accent/70 ml-2">
                            → {out}
                          </div>
                        ))}
                      </div>
                    ))}
                    {pipelineComplete && (
                      <div className="mt-2 text-foreground">
                        Analysis complete. 12 findings, 3 attack paths, risk score 78/100.
                        <span className="ml-1 w-2 h-3 bg-accent animate-blink inline-block" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Findings Tab ─────────────────────────────────────────────── */}
        {activeTab === "findings" && (
          <div>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              {(["critical", "high", "medium", "low", "info"] as Severity[]).map((sev) => (
                <div key={sev} className="p-4 rounded-xl bg-surface border border-border text-center">
                  <div className={`text-2xl font-bold ${severityColors[sev]}`}>
                    {findingsBySeverity[sev].length}
                  </div>
                  <div className="text-xs text-muted uppercase tracking-wider mt-1">{sev}</div>
                </div>
              ))}
            </div>

            {/* Findings list */}
            <div className="rounded-xl bg-surface border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">All Findings</h3>
                <span className="text-xs text-muted-2">{demoFindings.length} total</span>
              </div>
              {demoFindings.map((f) => (
                <FindingRow
                  key={f.id}
                  finding={f}
                  expanded={expandedFinding === f.id}
                  onToggle={() => setExpandedFinding(expandedFinding === f.id ? null : f.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─── Risk Tab ─────────────────────────────────────────────────── */}
        {activeTab === "risk" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Risk score */}
            <div className="p-6 rounded-xl bg-surface border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Overall Risk Score</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1e1e2e" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#ffb800"
                      strokeWidth="8"
                      strokeDasharray={`${78 * 2.64} ${100 * 2.64}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-amber">78</span>
                    <span className="text-xs text-muted">/100 HIGH</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Severity distribution */}
            <div className="p-6 rounded-xl bg-surface border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Severity Distribution</h3>
              <div className="space-y-3">
                {(["critical", "high", "medium", "low", "info"] as Severity[]).map((sev) => {
                  const count = findingsBySeverity[sev].length;
                  const pct = (count / demoFindings.length) * 100;
                  const colorMap: Record<Severity, string> = {
                    critical: "bg-red",
                    high: "bg-amber",
                    medium: "bg-amber/70",
                    low: "bg-accent",
                    info: "bg-cyan",
                  };
                  return (
                    <div key={sev}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-2 capitalize">{sev}</span>
                        <span className="text-foreground font-mono">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-2">
                        <div className={`h-full rounded-full ${colorMap[sev]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top risk assets */}
            <div className="p-6 rounded-xl bg-surface border border-border md:col-span-2">
              <h3 className="text-sm font-semibold text-foreground mb-4">Top Risk Assets</h3>
              <div className="space-y-3">
                {[
                  { name: "db-internal.sec-scanner.pro", score: 95, findings: 2, criticality: "critical" },
                  { name: "vault.sec-scanner.pro", score: 90, findings: 1, criticality: "critical" },
                  { name: "app.sec-scanner.pro", score: 92, findings: 4, criticality: "critical" },
                  { name: "k8s.sec-scanner.pro", score: 88, findings: 1, criticality: "critical" },
                  { name: "api.sec-scanner.pro", score: 78, findings: 3, criticality: "high" },
                ]
                  .sort((a, b) => b.score - a.score)
                  .map((asset) => (
                    <div key={asset.name} className="flex items-center gap-4 p-3 rounded-lg bg-surface-2 border border-border">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{asset.name}</div>
                        <div className="text-xs text-muted-2">{asset.findings} findings</div>
                      </div>
                      <Badge variant={asset.criticality as Severity}>{asset.criticality}</Badge>
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted">Risk</span>
                          <span className={`font-mono ${asset.score >= 90 ? "text-red" : asset.score >= 70 ? "text-amber" : "text-accent"}`}>
                            {asset.score}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface">
                          <div
                            className={`h-full rounded-full ${asset.score >= 90 ? "bg-red" : asset.score >= 70 ? "bg-amber" : "bg-accent"}`}
                            style={{ width: `${asset.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Attack Paths Tab ─────────────────────────────────────────── */}
        {activeTab === "paths" && (
          <div className="space-y-6">
            {[
              {
                name: "SQL Injection Data Breach",
                path: ["Internet", "Firewall", "NGINX", "Application", "Database"],
                risk: "critical",
                probability: "80%",
                cves: ["CVE-2024-23956"],
                techniques: ["T1190", "T1555", "T1005"],
              },
              {
                name: "Redis RCE to Cluster Takeover",
                path: ["Internet", "Firewall", "NGINX", "Application", "Redis", "Kubernetes"],
                risk: "critical",
                probability: "60%",
                cves: ["CVE-2024-29155", "CVE-2024-31449"],
                techniques: ["T1190", "T1210", "T1059", "T1078", "T1609"],
              },
              {
                name: "Vault Key Exposure to Secret Theft",
                path: ["Internet", "Firewall", "NGINX", "Application", "Vault"],
                risk: "high",
                probability: "70%",
                cves: ["CVE-2024-29155"],
                techniques: ["T1190", "T1552", "T1078"],
              },
            ].map((ap, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-surface border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={ap.risk as Severity}>{ap.risk}</Badge>
                    <h3 className="text-sm font-semibold text-foreground">{ap.name}</h3>
                  </div>
                  <span className="text-xs text-muted-2 font-mono">
                    Success probability: <span className="text-amber">{ap.probability}</span>
                  </span>
                </div>
                {/* Path visualization */}
                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                  {ap.path.map((node, ni) => (
                    <div key={ni} className="flex items-center gap-1.5">
                      <div
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                          ni === 0
                            ? "bg-red/10 text-red border-red/20"
                            : ni === ap.path.length - 1
                            ? "bg-amber/10 text-amber border-amber/20"
                            : "bg-surface-2 text-muted-2 border-border"
                        }`}
                      >
                        {node}
                      </div>
                      {ni < ap.path.length - 1 && (
                        <div className="w-6 h-px bg-border-light" />
                      )}
                    </div>
                  ))}
                </div>
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {ap.cves.map((cve) => (
                    <span key={cve} className="text-xs font-mono px-2 py-1 rounded bg-red/10 text-red border border-red/20">
                      {cve}
                    </span>
                  ))}
                  {ap.techniques.map((t) => (
                    <span key={t} className="text-xs font-mono px-2 py-1 rounded bg-purple/10 text-purple border border-purple/20">
                      MITRE {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            <div className="text-center">
              <a
                href="/app/demo/attack-paths"
                className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                View Interactive Attack Path Visualizer
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
