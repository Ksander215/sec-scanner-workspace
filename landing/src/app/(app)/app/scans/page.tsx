"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { scanJobs } from "@/lib/portal-data";
import { useI18n } from "@/lib/i18n-context";
import {
  Radar,
  Play,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Search,
  Container,
  KeyRound,
  ShieldAlert,
  FileText,
  CheckCircle2,
  History,
  ArrowRight,
  ExternalLink,
  BarChart3,
} from "lucide-react";

const statusIcons: Record<string, React.ElementType> = {
  running: Loader2, completed: CheckCircle, failed: XCircle, queued: Clock,
};

const statusColors: Record<string, string> = {
  running: "text-cyan", completed: "text-accent", failed: "text-red", queued: "text-amber",
};

interface ScanStage {
  key: string;
  icon: React.ElementType;
}

const scanStages: ScanStage[] = [
  { key: "scans.stage.loadProject", icon: Server },
  { key: "scans.stage.deps", icon: Search },
  { key: "scans.stage.docker", icon: Container },
  { key: "scans.stage.secrets", icon: KeyRound },
  { key: "scans.stage.cve", icon: ShieldAlert },
  { key: "scans.stage.report", icon: FileText },
];

// ─── Scan History from localStorage ─────────────────────────────────────

interface ScanRecord {
  id: string;
  projectName: string;
  sourceType: string;
  sourceValue: string;
  tools: string[];
  startedAt: string;
  completedAt: string;
  findingsCount: number;
  riskScore: number;
  status: "completed" | "running";
}

const HISTORY_KEY = "sip_scan_history";

function loadHistory(): ScanRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

// ─── Component ──────────────────────────────────────────────────────────

export default function ScansPage() {
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const [runningScans, setRunningScans] = useState<Set<string>>(new Set());
  const [scanProgress, setScanProgress] = useState<Record<string, number>>({});
  const [showNewScan, setShowNewScan] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"demo" | "history">("demo");

  // Load scan history
  useEffect(() => {
    setScanHistory(loadHistory());
  }, []);

  // Animate scan progress
  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        const next = { ...prev };
        for (const id of runningScans) {
          const current = next[id] || 0;
          if (current < scanStages.length) {
            next[id] = current + 1;
          }
        }
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [runningScans]);

  const handleRunScan = (id: string) => {
    setRunningScans((prev) => new Set(prev).add(id));
    setScanProgress((prev) => ({ ...prev, [id]: 0 }));
    setTimeout(() => {
      setRunningScans((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, scanStages.length * 800 + 500);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(isEn ? "en-US" : "ru-RU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  const sourceTypeLabel: Record<string, string> = {
    git: "Git",
    folder: isEn ? "Local" : "Локальная",
    docker: "Docker",
    website: isEn ? "Website" : "Веб-сайт",
    api: "API",
  };

  return (
    <div className="animate-page-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("scans.title")}</h1>
          <p className="mt-2 text-muted-2">{t("scans.subtitle")}</p>
        </div>
        <a
          href="/app/scanner"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" /> {t("scans.new")}
        </a>
      </div>

      {/* Tabs: Demo scans / My History */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border mb-6 max-w-md">
        <button onClick={() => setActiveTab("history")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
            activeTab === "history" ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
          }`}>
          <History className="w-3.5 h-3.5" />
          {isEn ? "My Scans" : "Мои сканы"} {scanHistory.length > 0 && `(${scanHistory.length})`}
        </button>
        <button onClick={() => setActiveTab("demo")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
            activeTab === "demo" ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
          }`}>
          <Radar className="w-3.5 h-3.5" />
          {isEn ? "Demo Scans" : "Демо-сканы"}
        </button>
      </div>

      {/* My Scan History */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {scanHistory.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface border border-border text-center">
              <History className="w-10 h-10 text-muted-2 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-foreground mb-1">{isEn ? "No scans yet" : "Сканирований ещё нет"}</h3>
              <p className="text-xs text-muted-2 mb-4">{isEn ? "Run your first scan to see results here." : "Запустите первое сканирование, чтобы увидеть результаты."}</p>
              <a href="/app/scanner" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors">
                {isEn ? "Start Scanning" : "Начать сканирование"} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            scanHistory.map((scan, i) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{scan.projectName}</h3>
                    <p className="text-xs text-muted-2 mt-0.5 truncate">
                      {sourceTypeLabel[scan.sourceType] || scan.sourceType}: <span className="font-mono">{scan.sourceValue}</span> · {scan.tools.join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-1.5 text-sm text-accent">
                      <CheckCircle className="w-4 h-4" />
                      <span>{isEn ? "Completed" : "Завершено"}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-accent">{scan.riskScore}/100</div>
                      <div className="text-xs text-muted-2">{scan.findingsCount} {isEn ? "findings" : "находок"}</div>
                    </div>
                    <span className="text-xs text-muted-2">{formatDate(scan.completedAt)}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
                  <a href="/app/reports" className="text-xs text-accent hover:underline flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> {isEn ? "View Report" : "Отчёт"}
                  </a>
                  <a href="/app/demo/knowledge-graph" className="text-xs text-accent hover:underline flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5" /> {isEn ? "Knowledge Graph" : "Граф знаний"}
                  </a>
                  <a href="/app/demo/attack-paths" className="text-xs text-accent hover:underline flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> {isEn ? "Attack Paths" : "Пути атак"}
                  </a>
                  <a href="/app/scanner" className="text-xs text-accent hover:underline flex items-center gap-1 ml-auto">
                    {isEn ? "Scan again" : "Сканировать снова"} <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Demo Scans (original) */}
      {activeTab === "demo" && (
        <div className="space-y-3">
          {/* Demo label */}
          <div className="p-3 rounded-lg bg-amber/10 border border-amber/20 flex items-start gap-2.5 text-sm">
            <span className="text-amber font-medium shrink-0">{isEn ? "⚠ Demo Scenarios" : "⚠ Демо-сценарии"}</span>
            <span className="text-muted-2">{isEn ? "These are simulated scan jobs for demonstration. Your real scans appear in the \"My Scans\" tab." : "Это симулированные задания для демонстрации. Ваши реальные сканы отображаются во вкладке «Мои сканы»."}</span>
          </div>

          {scanJobs.map((scan, i) => {
            const Icon = statusIcons[scan.status] || Clock;
            const color = statusColors[scan.status] || "text-muted";
            const isTriggered = runningScans.has(scan.id);
            const isRunning = isTriggered || scan.status === "running";
            const progress = scanProgress[scan.id] || 0;

            return (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-muted flex items-center justify-center shrink-0">
                    <Radar className="w-5 h-5 text-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{scan.name}</h3>
                    <p className="text-xs text-muted-2 mt-0.5">{scan.id} · {scan.type}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1.5 text-sm ${isRunning ? "text-cyan" : color}`}>
                      <Icon className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
                      <span>{isRunning ? t("scans.stage.running") : scan.status === "completed" ? t("scans.stage.completed") : scan.status === "failed" ? t("scans.stage.failed") : t("scans.stage.queued")}</span>
                    </div>
                    <span className="text-sm text-muted-2">{scan.startedAt}</span>
                    <button
                      onClick={() => handleRunScan(scan.id)}
                      disabled={isRunning}
                      className="p-2 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50"
                      title={isRunning ? t("scans.stage.running") : t("scans.run")}
                    >
                      {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Progress stages — visible when running */}
                {isRunning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 pt-4 border-t border-border"
                  >
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {scanStages.map((stage, si) => {
                        const isDone = progress > si;
                        const isCurrent = progress === si + 1;
                        return (
                          <div key={stage.key} className="flex items-center gap-2 shrink-0">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isDone
                                ? "bg-accent-muted text-accent border border-accent-border"
                                : isCurrent
                                ? "bg-cyan-muted text-cyan border border-[rgba(0,212,255,0.3)]"
                                : "bg-surface-2 text-muted-2 border border-border"
                            }`}>
                              {isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : isCurrent ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <stage.icon className="w-3.5 h-3.5" />
                              )}
                              {t(stage.key)}
                            </div>
                            {si < scanStages.length - 1 && (
                              <div className={`w-4 h-px ${isDone ? "bg-accent" : "bg-border"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
