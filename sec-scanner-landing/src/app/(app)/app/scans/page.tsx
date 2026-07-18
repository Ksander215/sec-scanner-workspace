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

export default function ScansPage() {
  const { t } = useI18n();
  const [runningScans, setRunningScans] = useState<Set<string>>(new Set());
  const [scanProgress, setScanProgress] = useState<Record<string, number>>({});
  const [showNewScan, setShowNewScan] = useState(false);

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

  return (
    <div className="animate-page-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("scans.title")}</h1>
          <p className="mt-2 text-muted-2">{t("scans.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowNewScan(!showNewScan)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" /> {t("scans.new")}
        </button>
      </div>

      {showNewScan && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl bg-accent-muted border border-accent-border mb-6"
        >
          <h3 className="text-base font-semibold text-foreground mb-2">{t("scans.new")}</h3>
          <p className="text-sm text-muted-2 mb-4">{t("scans.newScanDesc")}</p>
          <div className="flex items-center gap-3">
            <a
              href="/app/demo"
              className="px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
            >
              {t("common.demo")}
            </a>
            <button
              onClick={() => setShowNewScan(false)}
              className="px-4 py-2 text-sm font-medium border border-border-light text-foreground rounded-lg hover:bg-surface-2 transition-colors"
            >
              {t("common.close")}
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
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
    </div>
  );
}
