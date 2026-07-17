"use client";

import { useState, useCallback } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
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
  ArrowRight,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileType,
  FileDown,
} from "lucide-react";

type PlaygroundStep = "upload" | "pipeline" | "graph" | "risk" | "export";

/* ─── Demo data for exports ──────────────────────────────────────────────── */

const demoData = {
  summary: {
    riskScore: 78,
    riskLevel: "HIGH",
    totalFindings: 8,
    criticalFindings: 4,
    hosts: 6,
    services: 6,
    cves: 5,
    credentials: 2,
    attackPaths: 3,
    recommendations: 6,
  },
  findings: [
    { id: "F-001", title: "SQL Injection in Login API", severity: "Critical", host: "web-app.internal", cvss: 9.8 },
    { id: "F-002", title: "Redis Unauthenticated Access", severity: "Critical", host: "redis.internal", cvss: 9.1 },
    { id: "F-003", title: "Vault Token Exposure in Logs", severity: "Critical", host: "vault.internal", cvss: 8.6 },
    { id: "F-004", title: "Kubernetes Dashboard Exposed", severity: "Critical", host: "k8s.internal", cvss: 8.2 },
    { id: "F-005", title: "Outdated TLS Configuration", severity: "High", host: "web-app.internal", cvss: 7.5 },
    { id: "F-006", title: "Default Credentials on MongoDB", severity: "High", host: "mongo.internal", cvss: 7.2 },
    { id: "F-007", title: "Missing Security Headers", severity: "Medium", host: "web-app.internal", cvss: 5.3 },
    { id: "F-008", title: "Information Disclosure in Error Pages", severity: "Low", host: "web-app.internal", cvss: 3.1 },
  ],
  attackPaths: [
    { name: "SQL Injection Data Breach", severity: "Critical", steps: "Internet → Web App → Database → Data Exfiltration" },
    { name: "Redis RCE to Cluster Takeover", severity: "High", steps: "Internet → Redis → RCE → Kubernetes Cluster" },
    { name: "Vault Key Exposure", severity: "Critical", steps: "Internet → Logs → Vault Token → Secret Access" },
  ],
  recommendations: [
    "Implement parameterized queries to prevent SQL Injection",
    "Enable Redis authentication and bind to localhost",
    "Configure Vault audit logging and token rotation",
    "Restrict Kubernetes Dashboard access with RBAC",
    "Update TLS to 1.3 and disable weak ciphers",
    "Change default credentials and enforce password policies",
  ],
};

/* ─── Export helpers ──────────────────────────────────────────────────────── */

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generatePDF(t: (key: string) => string): string {
  const d = demoData;
  const now = new Date().toISOString().slice(0, 10);
  // Minimal valid PDF with text content
  const lines = [
    `%PDF-1.4`,
    `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj`,
    `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj`,
    `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj`,
    `5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj`,
  ];
  const textLines = [
    `SIP - Security Intelligence Platform`,
    `${t("playground.export.title")}`,
    `${t("playground.risk.overallScore")}: ${d.summary.riskScore}/100 (${d.summary.riskLevel})`,
    `${t("playground.risk.criticalFindings")}: ${d.summary.criticalFindings}`,
    ``,
    `${t("playground.graph.findings")}:`,
    ...d.findings.map((f) => `  [${f.severity}] ${f.id}: ${f.title} (${f.host}, CVSS ${f.cvss})`),
    ``,
    `${t("playground.graph.attackPaths")}:`,
    ...d.attackPaths.map((p) => `  [${p.severity}] ${p.name}: ${p.steps}`),
    ``,
    `${t("playground.graph.recommendations")}:`,
    ...d.recommendations.map((r, i) => `  ${i + 1}. ${r}`),
    ``,
    `Date: ${now}`,
  ];
  const textContent = textLines.join("\n");
  // Escape parentheses for PDF
  const escaped = textContent.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  lines.push(`4 0 obj<</Length ${escaped.length}>>stream\nBT /F1 10 Tf 50 750 Td ${escaped.split("\n").map((l: string) => `(${l}) '`).join(" ")} ET\nendstream\nendobj`);
  const xrefOffset = lines.join("\n").length + 1;
  lines.push(`xref\n0 6\n0000000000 65535 f \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF`);
  return lines.join("\n");
}

function generateHTML(t: (key: string) => string): string {
  const d = demoData;
  const now = new Date().toISOString().slice(0, 10);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SIP - ${t("playground.export.title")}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#1a1a1a}
h1{color:#0ea5e9;border-bottom:2px solid #0ea5e9;padding-bottom:.5rem}
h2{color:#334155;margin-top:2rem}
.score{font-size:3rem;font-weight:700;color:#f59e0b}
table{width:100%;border-collapse:collapse;margin:1rem 0}
th,td{text-align:left;padding:.5rem .75rem;border-bottom:1px solid #e2e8f0}
th{background:#f8fafc;font-weight:600}
.critical{color:#dc2626;font-weight:700}
.high{color:#ea580c;font-weight:700}
.medium{color:#d97706}
.low{color:#65a30d}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:.875rem}
</style>
</head>
<body>
<h1>SIP &mdash; ${t("playground.export.title")}</h1>
<p>${t("playground.risk.overallScore")}: <span class="score">${d.summary.riskScore}</span>/100 (${d.summary.riskLevel})</p>
<p>${t("playground.risk.criticalFindings")}: <strong>${d.summary.criticalFindings}</strong> &mdash; ${t("playground.risk.immediateAttention")}</p>

<h2>${t("playground.graph.findings")}</h2>
<table>
<thead><tr><th>ID</th><th>${t("playground.graph.findings")}</th><th>Severity</th><th>Host</th><th>CVSS</th></tr></thead>
<tbody>
${d.findings.map(f => `<tr><td>${f.id}</td><td>${f.title}</td><td class="${f.severity.toLowerCase()}">${f.severity}</td><td>${f.host}</td><td>${f.cvss}</td></tr>`).join("\n")}
</tbody>
</table>

<h2>${t("playground.graph.attackPaths")}</h2>
<table>
<thead><tr><th>${t("playground.graph.attackPaths")}</th><th>Severity</th><th>Steps</th></tr></thead>
<tbody>
${d.attackPaths.map(p => `<tr><td>${p.name}</td><td class="${p.severity.toLowerCase()}">${p.severity}</td><td>${p.steps}</td></tr>`).join("\n")}
</tbody>
</table>

<h2>${t("playground.graph.recommendations")}</h2>
<ol>
${d.recommendations.map(r => `<li>${r}</li>`).join("\n")}
</ol>

<footer>${t("playground.export.title")} &bull; ${now}</footer>
</body>
</html>`;
}

function generateJSON(): string {
  return JSON.stringify(demoData, null, 2);
}

function generateCSV(t: (key: string) => string): string {
  const header = `ID,${t("playground.graph.findings")},Severity,Host,CVSS`;
  const rows = demoData.findings.map((f) => `${f.id},"${f.title}",${f.severity},${f.host},${f.cvss}`);
  return [header, ...rows].join("\n");
}

function generateMarkdown(t: (key: string) => string): string {
  const d = demoData;
  const now = new Date().toISOString().slice(0, 10);
  return `# SIP — ${t("playground.export.title")}

**${t("playground.risk.overallScore")}**: ${d.summary.riskScore}/100 (${d.summary.riskLevel})
**${t("playground.risk.criticalFindings")}**: ${d.summary.criticalFindings} — ${t("playground.risk.immediateAttention")}

---

## ${t("playground.graph.findings")}

| ID | ${t("playground.graph.findings")} | Severity | Host | CVSS |
|----|-----------------------------------|----------|------|------|
${d.findings.map((f) => `| ${f.id} | ${f.title} | ${f.severity} | ${f.host} | ${f.cvss} |`).join("\n")}

## ${t("playground.graph.attackPaths")}

| ${t("playground.graph.attackPaths")} | Severity | Steps |
|-------|----------|-------|
${d.attackPaths.map((p) => `| ${p.name} | ${p.severity} | ${p.steps} |`).join("\n")}

## ${t("playground.graph.recommendations")}

${d.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

---
*${now}*
`;
}

function generateSARIF(): string {
  return JSON.stringify(
    {
      $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "SIP Security Intelligence Platform",
              version: "1.0.0",
              informationUri: "https://sec-scanner.pro",
            },
          },
          results: demoData.findings.map((f) => ({
            ruleId: f.id,
            level: f.severity === "Critical" ? "error" : f.severity === "High" ? "warning" : "note",
            message: { text: f.title },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: f.host },
                },
              },
            ],
            properties: { cvss: f.cvss, severity: f.severity },
          })),
        },
      ],
    },
    null,
    2
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function PlaygroundPage() {
  const { t } = useI18n();
  const { addToast } = useToast();

  const [activeStep, setActiveStep] = useState<PlaygroundStep>("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [exportFormat, setExportFormat] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hasExported, setHasExported] = useState(false);

  /* Step definitions using translations */
  const steps: { key: PlaygroundStep; labelKey: string; icon: React.ElementType; descKey: string }[] = [
    { key: "upload", labelKey: "playground.step.upload", icon: Upload, descKey: "playground.step.upload.desc" },
    { key: "pipeline", labelKey: "playground.step.pipeline", icon: GitBranch, descKey: "playground.step.pipeline.desc" },
    { key: "graph", labelKey: "playground.step.graph", icon: Network, descKey: "playground.step.graph.desc" },
    { key: "risk", labelKey: "playground.step.risk", icon: ShieldAlert, descKey: "playground.step.risk.desc" },
    { key: "export", labelKey: "playground.step.export", icon: Download, descKey: "playground.step.export.desc" },
  ];

  /* Pipeline stages with translations */
  const pipelineStages = [
    { nameKey: "playground.pipeline.normalize", outputKey: "playground.pipeline.normalize.output" },
    { nameKey: "playground.pipeline.correlation", outputKey: "playground.pipeline.correlation.output" },
    { nameKey: "playground.pipeline.knowledgeGraph", outputKey: "playground.pipeline.knowledgeGraph.output" },
    { nameKey: "playground.pipeline.riskScoring", outputKey: "playground.pipeline.riskScoring.output" },
    { nameKey: "playground.pipeline.attackPaths", outputKey: "playground.pipeline.attackPaths.output" },
    { nameKey: "playground.pipeline.recommendations", outputKey: "playground.pipeline.recommendations.output" },
    { nameKey: "playground.pipeline.explainability", outputKey: "playground.pipeline.explainability.output" },
    { nameKey: "playground.pipeline.report", outputKey: "playground.pipeline.report.output" },
  ];

  /* Graph stat items */
  const graphStats = [
    { labelKey: "playground.graph.hosts", count: 6, color: "text-cyan" },
    { labelKey: "playground.graph.services", count: 6, color: "text-purple" },
    { labelKey: "playground.graph.findings", count: 8, color: "text-red" },
    { labelKey: "playground.graph.cves", count: 5, color: "text-amber" },
    { labelKey: "playground.graph.credentials", count: 2, color: "text-red" },
    { labelKey: "playground.graph.recommendations", count: 6, color: "text-accent" },
    { labelKey: "playground.graph.edges", count: 34, color: "text-muted-2" },
    { labelKey: "playground.graph.attackPaths", count: 3, color: "text-red" },
  ];

  /* Export formats */
  const exportFormats = [
    { format: "pdf", labelKey: "playground.export.pdf", descKey: "playground.export.pdf.desc", icon: FileText },
    { format: "html", labelKey: "playground.export.html", descKey: "playground.export.html.desc", icon: FileCode },
    { format: "json", labelKey: "playground.export.json", descKey: "playground.export.json.desc", icon: FileJson },
    { format: "csv", labelKey: "playground.export.csv", descKey: "playground.export.csv.desc", icon: FileSpreadsheet },
    { format: "md", labelKey: "playground.export.md", descKey: "playground.export.md.desc", icon: FileType },
    { format: "sarif", labelKey: "playground.export.sarif", descKey: "playground.export.sarif.desc", icon: FileDown },
  ];

  /* Attack paths */
  const attackPaths = [
    { nameKey: "playground.risk.path1", severity: "critical" as const },
    { nameKey: "playground.risk.path2", severity: "high" as const },
    { nameKey: "playground.risk.path3", severity: "critical" as const },
  ];

  /* ─── Handlers ────────────────────────────────────────────────────────── */

  const handleUpload = useCallback(() => {
    setUploaded(true);
    addToast({
      type: "success",
      title: t("playground.toast.uploaded"),
      description: t("playground.toast.uploaded.desc"),
    });
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setActiveStep("pipeline");
      addToast({
        type: "success",
        title: t("playground.toast.processed"),
        description: t("playground.toast.processed.desc"),
      });
    }, 1800);
  }, [addToast, t]);

  const handleExport = useCallback(
    (format: string) => {
      setExportFormat(format);
      setIsExporting(true);

      setTimeout(() => {
        const now = new Date().toISOString().slice(0, 10);
        switch (format) {
          case "pdf":
            downloadFile(`sip-report-${now}.pdf`, generatePDF(t), "application/pdf");
            break;
          case "html":
            downloadFile(`sip-report-${now}.html`, generateHTML(t), "text/html");
            break;
          case "json":
            downloadFile(`sip-report-${now}.json`, generateJSON(), "application/json");
            break;
          case "csv":
            downloadFile(`sip-report-${now}.csv`, generateCSV(t), "text/csv");
            break;
          case "md":
            downloadFile(`sip-report-${now}.md`, generateMarkdown(t), "text/markdown");
            break;
          case "sarif":
            downloadFile(`sip-report-${now}.sarif`, generateSARIF(), "application/json");
            break;
        }
        setIsExporting(false);
        setHasExported(true);
        addToast({
          type: "success",
          title: t("playground.toast.exported"),
          description: t("playground.toast.exported.desc"),
        });
      }, 800);
    },
    [addToast, t]
  );

  /* ─── Render ──────────────────────────────────────────────────────────── */

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
                  {t(step.labelKey)}
                </button>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Upload Step ────────────────────────────────────────────────── */}
        {activeStep === "upload" && (
          <div className="max-w-2xl mx-auto">
            <div className="p-8 rounded-2xl bg-surface border border-border text-center">
              <FlaskConical className="w-12 h-12 text-accent mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t("playground.upload.title")}
              </h2>
              <p className="text-sm text-muted-2 mb-6 max-w-md mx-auto">
                {t("playground.upload.desc")}
              </p>

              <div
                className="p-8 rounded-xl border-2 border-dashed border-border hover:border-accent/30 transition-colors mb-4 cursor-pointer"
                onClick={handleUpload}
              >
                <Upload className="w-10 h-10 text-muted mx-auto mb-3" />
                <p className="text-sm text-foreground font-medium">
                  {t("playground.upload.dropzone")}
                </p>
                <p className="text-xs text-muted-2 mt-1">
                  {t("playground.upload.browse")}
                </p>
              </div>

              <div className="flex items-center gap-3 justify-center">
                <span className="text-xs text-muted-2">{t("common.or")}</span>
                <Button variant="outline" size="sm" onClick={handleUpload}>
                  <FileJson className="w-3.5 h-3.5" />
                  {t("playground.upload.demo")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Pipeline Step ──────────────────────────────────────────────── */}
        {activeStep === "pipeline" && (
          <div className="max-w-3xl mx-auto">
            <div className="p-6 rounded-2xl bg-surface border border-border">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-accent" />
                {t("playground.pipeline.title")}
              </h2>

              {isProcessing ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <span className="ml-3 text-sm text-muted-2">
                    {t("playground.pipeline.processing")}
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {pipelineStages.map((stage) => (
                    <div
                      key={stage.nameKey}
                      className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border"
                    >
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      <span className="text-sm text-foreground font-medium flex-1">
                        {t(stage.nameKey)}
                      </span>
                      <span className="text-xs text-muted-2 font-mono">
                        {t(stage.outputKey)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setActiveStep("upload")}>
                  {t("common.back")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setActiveStep("graph")}
                  disabled={isProcessing}
                >
                  {t("playground.viewGraph")}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Graph Step ─────────────────────────────────────────────────── */}
        {activeStep === "graph" && (
          <div className="max-w-3xl mx-auto">
            <div className="p-6 rounded-2xl bg-surface border border-border">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Network className="w-5 h-5 text-cyan" />
                {t("playground.graph.title")}
              </h2>
              <p className="text-sm text-muted-2 mb-4">
                {t("playground.graph.subtitle")}
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
                {graphStats.map((item) => (
                  <div
                    key={item.labelKey}
                    className="p-3 rounded-lg bg-surface-2 border border-border text-center"
                  >
                    <div className={`text-xl font-bold ${item.color}`}>
                      {item.count}
                    </div>
                    <div className="text-xs text-muted-2 mt-0.5">
                      {t(item.labelKey)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setActiveStep("pipeline")}>
                  {t("common.back")}
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-2">
                    {t("common.availableInNextVersions")}
                  </span>
                  <Button size="sm" onClick={() => setActiveStep("risk")}>
                    {t("playground.viewRisk")}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Risk Step ──────────────────────────────────────────────────── */}
        {activeStep === "risk" && (
          <div className="max-w-3xl mx-auto">
            <div className="p-6 rounded-2xl bg-surface border border-border">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber" />
                {t("playground.risk.title")}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">
                    {t("playground.risk.overallScore")}
                  </span>
                  <div className="text-3xl font-bold text-amber mt-1">
                    78<span className="text-lg text-muted-2">/100</span>
                  </div>
                  <Badge variant="high">{t("playground.risk.high")}</Badge>
                </div>
                <div className="p-4 rounded-xl bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">
                    {t("playground.risk.criticalFindings")}
                  </span>
                  <div className="text-3xl font-bold text-red mt-1">4</div>
                  <span className="text-xs text-muted-2">
                    {t("playground.risk.immediateAttention")}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {attackPaths.map((path) => (
                  <div
                    key={path.nameKey}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border"
                  >
                    <Badge variant={path.severity}>
                      {path.severity === "critical"
                        ? t("playground.risk.critical")
                        : t("playground.risk.high")}
                    </Badge>
                    <span className="text-sm text-foreground flex-1">
                      {t(path.nameKey)}
                    </span>
                    <span className="text-xs text-muted-2">
                      {t("common.availableInNextVersions")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setActiveStep("graph")}>
                  {t("common.back")}
                </Button>
                <Button size="sm" onClick={() => setActiveStep("export")}>
                  {t("common.export")}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Export Step ────────────────────────────────────────────────── */}
        {activeStep === "export" && (
          <div className="max-w-2xl mx-auto">
            <div className="p-8 rounded-2xl bg-surface border border-border text-center">
              <Download className="w-12 h-12 text-accent mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t("playground.export.title")}
              </h2>
              <p className="text-sm text-muted-2 mb-6">
                {t("playground.export.desc")}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {exportFormats.map((exp) => {
                  const FormatIcon = exp.icon;
                  const isCurrentExport = exportFormat === exp.format && isExporting;
                  const isCurrentDone = exportFormat === exp.format && !isExporting && hasExported;
                  return (
                    <button
                      key={exp.format}
                      onClick={() => handleExport(exp.format)}
                      disabled={isExporting}
                      className={`p-4 rounded-xl border transition-colors text-left group ${
                        isCurrentExport
                          ? "bg-accent-muted border-accent/30"
                          : "bg-surface-2 border-border hover:border-accent/30"
                      } ${isExporting && exportFormat !== exp.format ? "opacity-50" : ""}`}
                    >
                      <div className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                        {isCurrentExport ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {t("playground.export.exporting")}
                          </span>
                        ) : isCurrentDone ? (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                            {t(exp.labelKey)} {t("playground.export.ready")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <FormatIcon className="w-3.5 h-3.5" />
                            {t(exp.labelKey)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-2 mt-1">
                        {t(exp.descKey)}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setActiveStep("risk")}>
                  {t("common.back")}
                </Button>
                <Button size="sm" onClick={() => setActiveStep("upload")}>
                  {t("playground.startOver")}
                </Button>
              </div>
            </div>

            {/* ─── What to do next ──────────────────────────────────────── */}
            {hasExported && (
              <div className="mt-6 p-6 rounded-2xl bg-surface border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  {t("playground.next.title")}
                </h3>
                <div className="space-y-3">
                  {[
                    { textKey: "playground.next.scan", href: "/app/scanning" },
                    { textKey: "playground.next.graph", href: "/app/knowledge-graph" },
                    { textKey: "playground.next.docs", href: "/docs" },
                  ].map((item) => (
                    <a
                      key={item.textKey}
                      href={item.href}
                      className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border hover:border-accent/30 transition-colors group"
                    >
                      <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors shrink-0" />
                      <span className="text-sm text-foreground group-hover:text-accent transition-colors">
                        {t(item.textKey)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}
