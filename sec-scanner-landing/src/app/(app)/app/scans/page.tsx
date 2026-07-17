"use client";

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
  return (
    <div className="animate-page-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scans</h1>
          <p className="mt-2 text-muted-2">View and manage security scans.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors">
          <Plus className="w-4 h-4" /> New Scan
        </button>
      </div>

      <div className="space-y-3">
        {scanJobs.map((scan, i) => {
          const Icon = statusIcons[scan.status] || Clock;
          const color = statusColors[scan.status] || "text-muted";
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
                <div className={`flex items-center gap-1.5 text-sm ${color}`}>
                  <Icon className={`w-4 h-4 ${scan.status === "running" ? "animate-spin" : ""}`} />
                  <span className="capitalize">{scan.status}</span>
                </div>
                {scan.status === "running" && (
                  <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan rounded-full" style={{ width: `${scan.progress}%` }} />
                  </div>
                )}
                <span className="text-sm text-muted-2">{scan.startedAt}</span>
                <button className="p-2 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors">
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
