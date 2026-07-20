"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileBarChart,
  Download,
  Trash2,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Share2,
  CheckCircle2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  generateReport,
  exportAsJSON,
  exportAsSARIF,
  exportAsMarkdown,
  exportAsCSV,
  exportAsHTML,
  getLatestFindings,
  getScanResults,
  type ReportType,
  type ExportFormat,
  type ReportContent,
} from "@/lib/engine";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";
import { BusinessResult } from "@/components/ui/BusinessResult";

// ─── Types ──────────────────────────────────────────────────────────────

interface UIReport {
  id: string;
  type: ReportType;
  date: string;
  findings: number;
  riskScore: number; // 0–100
  projectName: string;
  content: ReportContent;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function riskVariant(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function typeBadgeVariant(
  type: ReportType
): "info" | "high" | "default" {
  switch (type) {
    case "executive":
      return "info";
    case "technical":
      return "high";
    case "compliance":
      return "default";
  }
}

function typeKey(type: ReportType): string {
  return `reports.type.${type}`;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === "en" ? "en-US" : "ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

let nextReportNum = 1;

function buildInitialReports(): UIReport[] {
  const scans = getScanResults().filter((s) => s.status === "completed");
  const findings = getLatestFindings();

  if (findings.length === 0 || scans.length === 0) return [];

  const latestScan = scans[0];
  const reportTypes: ReportType[] = ["executive", "technical", "compliance"];
  const reports: UIReport[] = [];

  for (const type of reportTypes) {
    const content = generateReport(type, findings, latestScan.riskScore, latestScan.projectName);
    reports.push({
      id: `RPT-${String(nextReportNum++).padStart(3, "0")}`,
      type,
      date: new Date().toISOString().slice(0, 10),
      findings: findings.length,
      riskScore: latestScan.riskScore,
      projectName: latestScan.projectName,
      content,
    });
  }

  return reports;
}

// ─── Component ──────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { t, locale } = useI18n();
  const { addToast } = useToast();

  const [reports, setReports] = useState<UIReport[]>([]);
  const [hasFindings, setHasFindings] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType>("executive");
  const [showFormatPicker, setShowFormatPicker] = useState<string | null>(null);
  const [lastDownloaded, setLastDownloaded] = useState<string | null>(null);

  // Load data from engine on mount
  useEffect(() => {
    const findings = getLatestFindings();
    setHasFindings(findings.length > 0);
    if (findings.length > 0) {
      const initial = buildInitialReports();
      setReports(initial);
    }
  }, []);

  // ── Real file download using engine export functions ──────────────

  const downloadReport = useCallback(
    (report: UIReport, format: ExportFormat = "html") => {
      setDownloading((prev) => new Set(prev).add(report.id));

      setTimeout(() => {
        let content: string;
        let mimeType: string;
        let extension: string;

        switch (format) {
          case "pdf":
            // PDF not natively supported — export as HTML for printing
            content = exportAsHTML(report.content, report.type, report.projectName);
            mimeType = "text/html";
            extension = "html";
            break;
          case "html":
            content = exportAsHTML(report.content, report.type, report.projectName);
            mimeType = "text/html";
            extension = "html";
            break;
          case "json":
            content = exportAsJSON(report.content);
            mimeType = "application/json";
            extension = "json";
            break;
          case "sarif":
            content = exportAsSARIF(report.content.findings);
            mimeType = "application/json";
            extension = "sarif.json";
            break;
          case "markdown":
            content = exportAsMarkdown(report.content, report.type, report.projectName);
            mimeType = "text/markdown";
            extension = "md";
            break;
          case "csv":
            content = exportAsCSV(report.content.findings);
            mimeType = "text/csv";
            extension = "csv";
            break;
          default:
            content = exportAsHTML(report.content, report.type, report.projectName);
            mimeType = "text/html";
            extension = "html";
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${report.id}-${report.type}-report.${extension}`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        setDownloading((prev) => {
          const next = new Set(prev);
          next.delete(report.id);
          return next;
        });

        addToast({
          type: "success",
          title: t("reports.downloaded"),
          description: t("reports.downloaded.desc"),
        });

        setLastDownloaded(report.id);
      }, 800);
    },
    [t, locale, addToast]
  );

  // ── Delete ──────────────────────────────────────────────────────────

  const deleteReport = useCallback(
    (id: string) => {
      setReports((prev) => prev.filter((r) => r.id !== id));
      addToast({ type: "info", title: t("reports.deleted") });
    },
    [addToast, t]
  );

  // ── Generate new report from real findings ─────────────────────────

  const handleGenerate = useCallback(() => {
    const findings = getLatestFindings();
    if (findings.length === 0) {
      addToast({
        type: "error",
        title: locale === "en" ? "No findings available" : "Нет доступных находок",
        description: locale === "en" ? "Run a scan first to generate reports" : "Сначала выполните сканирование для генерации отчётов",
      });
      return;
    }

    setGenerating(true);
    setShowDialog(false);

    // Determine risk score from latest scan or compute from findings
    const scans = getScanResults().filter((s) => s.status === "completed");
    const riskScore = scans.length > 0 ? scans[0].riskScore : 50;
    const projectName = scans.length > 0 ? scans[0].projectName : "Unknown Project";

    setTimeout(() => {
      const content = generateReport(selectedType, findings, riskScore, projectName);

      const newReport: UIReport = {
        id: `RPT-${String(nextReportNum++).padStart(3, "0")}`,
        type: selectedType,
        date: new Date().toISOString().slice(0, 10),
        findings: findings.length,
        riskScore,
        projectName,
        content,
      };

      setReports((prev) => [newReport, ...prev]);
      setGenerating(false);

      addToast({
        type: "success",
        title: t("reports.generated"),
        description: t("reports.generated.desc"),
      });
    }, 1500);
  }, [selectedType, addToast, t, locale]);

  // ── Loading state ──────────────────────────────────────────────────

  if (hasFindings === null) {
    return (
      <Container as="main" className="py-8 animate-page-in">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </Container>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <Container as="main" className="py-8 animate-page-in">
      {/* Header */}
      <div id="reports-header" className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("reports.title")}
          </h1>
          <p className="mt-2 text-muted-2">{t("reports.subtitle")}</p>
          <div className="flex items-center gap-2 mt-2">
            <ContextualHelp section="reports" />
          </div>
          <BusinessResult type="report_ready" className="mt-4" />
        </div>
        <Button onClick={() => setShowDialog(true)} disabled={generating}>
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {t("reports.generate")}
        </Button>
      </div>

      {/* No findings — prompt user to scan first */}
      {!hasFindings && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-muted-2" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {locale === "en" ? "No scan data available" : "Нет данных сканирования"}
          </h2>
          <p className="text-sm text-muted-2 max-w-md mb-6">
            {locale === "en"
              ? "Run a scan first to generate reports from real findings."
              : "Сначала выполните сканирование для генерации отчётов из реальных находок."}
          </p>
          <Link
            href="/app/scanner"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            {locale === "en" ? "Go to Scanner" : "Перейти к сканеру"}
          </Link>
        </motion.div>
      )}

      {/* Generating banner */}
      {hasFindings && (
        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-accent-muted border border-accent/20 mb-6 flex items-center gap-3"
            >
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("reports.generating")}
                </p>
                <p className="text-xs text-muted-2">
                  {t("reports.generating.desc")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Empty state (has findings but no reports generated yet) */}
      {hasFindings && reports.length === 0 && !generating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-muted-2" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {t("reports.empty.title")}
          </h2>
          <p className="text-sm text-muted-2 max-w-md mb-6">
            {t("reports.noReports")}
          </p>
          <Button onClick={() => setShowDialog(true)}>
            {t("reports.empty.cta")}
          </Button>
        </motion.div>
      )}

      {/* Report list */}
      {reports.length > 0 && (
        <div id="reports-list" className="space-y-3">
          {reports.map((report, i) => {
            const isDownloading = downloading.has(report.id);
            const rv = riskVariant(report.riskScore);

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-colors group"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-purple-muted flex items-center justify-center shrink-0">
                  <FileBarChart className="w-5 h-5 text-purple" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                      {t(typeKey(report.type))}
                    </h3>
                    <Badge variant={typeBadgeVariant(report.type)}>
                      {report.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-2 flex-wrap">
                    <span>{report.id}</span>
                    <span>{formatDate(report.date, locale)}</span>
                    <span>
                      {report.findings} {t("reports.findings")}
                    </span>
                  </div>
                </div>

                {/* Risk score */}
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-xs text-muted-2 mb-0.5">
                    {t("reports.riskScore")}
                  </div>
                  <Badge variant={rv}>{report.riskScore}/100</Badge>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFormatPicker(showFormatPicker === report.id ? null : report.id)}
                      disabled={isDownloading}
                      title={t("reports.download")}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    {showFormatPicker === report.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-surface-2 border border-border rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                        {([
                          { format: "pdf" as ExportFormat, label: "PDF", desc: locale === "ru" ? "Для печати" : "For printing" },
                          { format: "html" as ExportFormat, label: "HTML", desc: locale === "ru" ? "Веб-формат" : "Web format" },
                          { format: "json" as ExportFormat, label: "JSON", desc: locale === "ru" ? "Для интеграций" : "For integrations" },
                          { format: "sarif" as ExportFormat, label: "SARIF", desc: locale === "ru" ? "Стандарт GitHub" : "GitHub standard" },
                          { format: "markdown" as ExportFormat, label: "Markdown", desc: locale === "ru" ? "Документация" : "Documentation" },
                          { format: "csv" as ExportFormat, label: "CSV", desc: locale === "ru" ? "Таблица" : "Spreadsheet" },
                        ]).map(opt => (
                          <button key={opt.format} onClick={() => { downloadReport(report, opt.format); setShowFormatPicker(null); }}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-3 transition-colors">
                            <span className="font-medium text-foreground">{opt.label}</span>
                            <span className="text-xs">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteReport(report.id)}
                    title={t("reports.delete")}
                    className="text-muted-2 hover:text-red"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* What's next after download */}
      {lastDownloaded && (
        <div className="mt-6 p-4 rounded-xl bg-accent-muted/50 border border-accent/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <span className="text-sm font-semibold text-foreground">
              {locale === "ru" ? "Отчёт скачан. Что дальше?" : "Report downloaded. What's next?"}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <a href="/app/scanner" className="p-3 rounded-lg bg-surface border border-border hover:border-accent/30 transition-all flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground">{locale === "ru" ? "Исправьте найденные проблемы" : "Fix found issues"}</span>
            </a>
            <a href="/app/demo/knowledge-graph" className="p-3 rounded-lg bg-surface border border-border hover:border-accent/30 transition-all flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cyan" />
              <span className="text-sm text-foreground">{locale === "ru" ? "Поделитесь отчётом с командой" : "Share report with your team"}</span>
            </a>
          </div>
        </div>
      )}

      {/* Generate Report Dialog */}
      <AnimatePresence>
        {showDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl bg-surface border border-border shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("reports.selectType")}
                </h2>
                <button
                  onClick={() => setShowDialog(false)}
                  className="p-1.5 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {(["executive", "technical", "compliance"] as ReportType[]).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                        selectedType === type
                          ? "border-accent/50 bg-accent-muted"
                          : "border-border hover:border-border-light bg-surface"
                      }`}
                    >
                      <FileBarChart
                        className={`w-5 h-5 shrink-0 ${
                          selectedType === type ? "text-accent" : "text-muted-2"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {t(typeKey(type))}
                        </div>
                        <div className="text-xs text-muted-2 mt-0.5">
                          {type === "executive" &&
                            (locale === "en"
                              ? "High-level overview for leadership"
                              : "Общий обзор для руководства")}
                          {type === "technical" &&
                            (locale === "en"
                              ? "Detailed findings for engineering teams"
                              : "Подробные находки для инженерных команд")}
                          {type === "compliance" &&
                            (locale === "en"
                              ? "Regulatory compliance assessment"
                              : "Оценка соответствия нормативам")}
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button onClick={handleGenerate} className="flex-1">
                  <Plus className="w-4 h-4" />
                  {t("reports.generate")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowDialog(false)}
                >
                  {t("reports.cancel")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="reports-faq" className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionFAQ section="reports" />
        <SmartNextStep {...RECOMMENDATION_CHAINS["reports"]} />
      </div>
    </Container>
  );
}
