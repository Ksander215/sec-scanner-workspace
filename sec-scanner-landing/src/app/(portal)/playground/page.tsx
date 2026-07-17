"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Upload,
  FlaskConical,
  GitBranch,
  Network,
  ShieldAlert,
  Download,
  CheckCircle2,
  Loader2,
  Circle,
  FileJson,
  ChevronRight,
} from "lucide-react";

type PlaygroundStep = "upload" | "pipeline" | "graph" | "risk" | "export";

const steps: { key: PlaygroundStep; label: string; icon: React.ElementType; description: string }[] = [
  { key: "upload", label: "Upload", icon: Upload, description: "Load a SARIF/JSON scan result or use demo data" },
  { key: "pipeline", label: "Pipeline", icon: GitBranch, description: "Watch the analysis pipeline process your data" },
  { key: "graph", label: "Graph", icon: Network, description: "Explore the knowledge graph of findings and assets" },
  { key: "risk", label: "Risk", icon: ShieldAlert, description: "View risk scores, attack paths, and recommendations" },
  { key: "export", label: "Export", icon: Download, description: "Download the report or share results" },
];

export default function PlaygroundPage() {
  const [activeStep, setActiveStep] = useState<PlaygroundStep>("upload");
  const [uploaded, setUploaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = () => {
    setUploaded(true);
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setActiveStep("pipeline");
    }, 1500);
  };

  return (
    <div className="min-h-[calc(100vh-7rem)]">
      <Container className="py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {steps.map((step, i) => {
            const isActive = activeStep === step.key;
            const isCompleted = steps.findIndex((s) => s.key === activeStep) > i;
            return (
              <div key={step.key} className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveStep(step.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    isActive
                      ? "bg-accent-muted border-accent/30 text-accent"
                      : isCompleted
                      ? "bg-surface border-accent/15 text-accent/70"
                      : "bg-surface border-border text-muted-2"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                  ) : isActive ? (
                    <step.icon className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  {step.label}
                </button>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        {activeStep === "upload" && (
          <div className="max-w-2xl mx-auto">
            <div className="p-8 rounded-2xl bg-surface border border-border text-center">
              <FlaskConical className="w-12 h-12 text-accent mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Security Playground</h2>
              <p className="text-sm text-muted-2 mb-6 max-w-md mx-auto">
                Upload your own scan results or use demo data to explore the full analysis pipeline.
                Supports SARIF, Burp XML, Nmap XML, and ZAP JSON formats.
              </p>

              {/* Upload area */}
              <div className="p-8 rounded-xl border-2 border-dashed border-border hover:border-accent/30 transition-colors mb-4 cursor-pointer" onClick={handleUpload}>
                <Upload className="w-10 h-10 text-muted mx-auto mb-3" />
                <p className="text-sm text-foreground font-medium">Drop a JSON/SARIF file here</p>
                <p className="text-xs text-muted-2 mt-1">or click to browse</p>
              </div>

              <div className="flex items-center gap-3 justify-center">
                <span className="text-xs text-muted-2">or</span>
                <Button variant="outline" size="sm" onClick={handleUpload}>
                  <FileJson className="w-3.5 h-3.5" />
                  Use Demo Dataset
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeStep === "pipeline" && (
          <div className="max-w-3xl mx-auto">
            <div className="p-6 rounded-2xl bg-surface border border-border">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-accent" />
                Analysis Pipeline
              </h2>

              {isProcessing ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <span className="ml-3 text-sm text-muted-2">Processing...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { name: "Normalize", status: "completed", output: "12 findings normalized" },
                    { name: "Correlation", status: "completed", output: "4 duplicates merged" },
                    { name: "Knowledge Graph", status: "completed", output: "34 nodes, 29 edges" },
                    { name: "Risk Scoring", status: "completed", output: "Score: 78/100 (HIGH)" },
                    { name: "Attack Paths", status: "completed", output: "3 paths traced" },
                    { name: "Recommendations", status: "completed", output: "6 recommendations" },
                    { name: "Explainability", status: "completed", output: "Confidence: 94.2%" },
                    { name: "Report", status: "completed", output: "8 findings, 3 paths" },
                  ].map((stage) => (
                    <div key={stage.name} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      <span className="text-sm text-foreground font-medium flex-1">{stage.name}</span>
                      <span className="text-xs text-muted-2 font-mono">{stage.output}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setActiveStep("upload")}>
                  Back
                </Button>
                <Button size="sm" onClick={() => setActiveStep("graph")}>
                  View Knowledge Graph
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeStep === "graph" && (
          <div className="max-w-3xl mx-auto">
            <div className="p-6 rounded-2xl bg-surface border border-border">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Network className="w-5 h-5 text-cyan" />
                Knowledge Graph Preview
              </h2>
              <p className="text-sm text-muted-2 mb-4">
                The full interactive graph is available in the Knowledge Graph Explorer. Here&apos;s a summary of what was discovered.
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Hosts", count: 6, color: "text-cyan" },
                  { label: "Services", count: 6, color: "text-purple" },
                  { label: "Findings", count: 8, color: "text-red" },
                  { label: "CVEs", count: 5, color: "text-amber" },
                  { label: "Credentials", count: 2, color: "text-red" },
                  { label: "Recommendations", count: 6, color: "text-accent" },
                  { label: "Edges", count: 34, color: "text-muted-2" },
                  { label: "Attack Paths", count: 3, color: "text-red" },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-surface-2 border border-border text-center">
                    <div className={`text-xl font-bold ${item.color}`}>{item.count}</div>
                    <div className="text-xs text-muted-2 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setActiveStep("pipeline")}>Back</Button>
                <div className="flex items-center gap-2">
                  <a href="/demo/knowledge-graph" className="text-sm text-cyan hover:text-cyan/80 transition-colors">
                    Open Full Graph →
                  </a>
                  <Button size="sm" onClick={() => setActiveStep("risk")}>
                    Risk Analysis <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === "risk" && (
          <div className="max-w-3xl mx-auto">
            <div className="p-6 rounded-2xl bg-surface border border-border">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber" />
                Risk Analysis
              </h2>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">Overall Risk Score</span>
                  <div className="text-3xl font-bold text-amber mt-1">78<span className="text-lg text-muted-2">/100</span></div>
                  <Badge variant="high">HIGH</Badge>
                </div>
                <div className="p-4 rounded-xl bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">Critical Findings</span>
                  <div className="text-3xl font-bold text-red mt-1">4</div>
                  <span className="text-xs text-muted-2">Require immediate attention</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {["SQL Injection Data Breach", "Redis RCE to Cluster Takeover", "Vault Key Exposure"].map((path, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                    <Badge variant={i === 0 ? "critical" : "high"}>{i === 0 ? "Critical" : "High"}</Badge>
                    <span className="text-sm text-foreground flex-1">{path}</span>
                    <a href="/demo/attack-paths" className="text-xs text-cyan hover:text-cyan/80">View →</a>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setActiveStep("graph")}>Back</Button>
                <Button size="sm" onClick={() => setActiveStep("export")}>
                  Export <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeStep === "export" && (
          <div className="max-w-2xl mx-auto">
            <div className="p-8 rounded-2xl bg-surface border border-border text-center">
              <Download className="w-12 h-12 text-accent mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Export Report</h2>
              <p className="text-sm text-muted-2 mb-6">
                Download the full analysis report in your preferred format.
              </p>

              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                {[
                  { format: "PDF", desc: "Executive summary + technical details" },
                  { format: "SARIF", desc: "Standard static analysis format" },
                  { format: "JSON", desc: "Full structured data export" },
                ].map((exp) => (
                  <button key={exp.format} className="p-4 rounded-xl bg-surface-2 border border-border hover:border-accent/30 transition-colors text-left group">
                    <div className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{exp.format}</div>
                    <div className="text-xs text-muted-2 mt-1">{exp.desc}</div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setActiveStep("risk")}>Back</Button>
                <Button size="sm" onClick={() => setActiveStep("upload")}>
                  Start Over
                </Button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
