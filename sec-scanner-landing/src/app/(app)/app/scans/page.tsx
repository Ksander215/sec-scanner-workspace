"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { scanJobs } from "@/lib/portal-data";
import { Radar, Play, Plus, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

const statusIcons: Record<string, React.ElementType> = {
  running: Loader2, completed: CheckCircle, failed: XCircle, queued: Clock,
};

const statusColors: Record<string, string> = {
  running: "text-cyan", completed: "text-accent", failed: "text-red", queued: "text-amber",
};

export default function ScansPage() {
  const [runningScans, setRunningScans] = useState<Set<string>>(new Set());
  const [showNewScan, setShowNewScan] = useState(false);

  const handleRunScan = (id: string) => {
    setRunningScans((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setRunningScans((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 3000);
  };

  return (
    <div className="animate-page-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scans</h1>
          <p className="mt-2 text-muted-2">View and manage security scans.</p>
        </div>
        <button
          onClick={() => setShowNewScan(!showNewScan)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" /> New Scan
        </button>
      </div>

      {showNewScan && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl bg-accent-muted border border-accent-border mb-6"
        >
          <h3 className="text-base font-semibold text-foreground mb-2">Start New Scan</h3>
          <p className="text-sm text-muted-2 mb-4">Scan creation requires a running backend. Try the interactive demo to see the full scan workflow.</p>
          <div className="flex items-center gap-3">
            <a
              href="/app/demo"
              className="px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
            >
              Open Demo
            </a>
            <button
              onClick={() => setShowNewScan(false)}
              className="px-4 py-2 text-sm font-medium border border-border-light text-foreground rounded-lg hover:bg-surface-2 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {scanJobs.map((scan, i) => {
          const Icon = statusIcons[scan.status] || Clock;
          const color = statusColors[scan.status] || "text-muted";
          const isTriggered = runningScans.has(scan.id);
          return (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-muted flex items-center justify-center shrink-0">
                <Radar className="w-5 h-5 text-cyan" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{scan.name}</h3>
                <p className="text-xs text-muted-2 mt-0.5">{scan.id} · {scan.type} scan</p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1.5 text-sm ${isTriggered ? "text-cyan" : color}`}>
                  <Icon className={`w-4 h-4 ${isTriggered ? "animate-spin" : scan.status === "running" ? "animate-spin" : ""}`} />
                  <span className="capitalize">{isTriggered ? "running" : scan.status}</span>
                </div>
                {(scan.status === "running" || isTriggered) && (
                  <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan rounded-full animate-pulse" style={{ width: isTriggered ? "60%" : `${scan.progress}%` }} />
                  </div>
                )}
                <span className="text-sm text-muted-2">{scan.startedAt}</span>
                <button
                  onClick={() => handleRunScan(scan.id)}
                  disabled={isTriggered || scan.status === "running"}
                  className="p-2 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50"
                  title={isTriggered ? "Running..." : "Re-run scan"}
                >
                  {isTriggered ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
