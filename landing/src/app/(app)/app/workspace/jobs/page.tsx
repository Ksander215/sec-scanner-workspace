"use client";

import { motion } from "framer-motion";
import { scanJobs } from "@/lib/portal-data";
import { Cpu, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { DemoBadge } from "@/components/ui/DemoBadge";

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  running: { icon: Loader2, color: "text-cyan", bg: "bg-cyan-muted" },
  completed: { icon: CheckCircle, color: "text-accent", bg: "bg-accent-muted" },
  failed: { icon: XCircle, color: "text-red", bg: "bg-red-muted" },
  queued: { icon: Clock, color: "text-amber", bg: "bg-amber-muted" },
};

export default function WorkspaceJobsPage() {
  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
        <DemoBadge className="mt-2" />
        <p className="mt-2 text-muted-2">Monitor running and queued jobs.</p>
      </div>

      <div className="space-y-3">
        {scanJobs.map((job, i) => {
          const config = statusConfig[job.status] || statusConfig.queued;
          const StatusIcon = config.icon;
          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-xl bg-surface border border-border"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                  <StatusIcon className={`w-5 h-5 ${config.color} ${job.status === "running" ? "animate-spin" : ""}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{job.name}</h3>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.color}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-2">
                    <span>{job.id}</span>
                    <span>Type: {job.type}</span>
                    <span>Started: {job.startedAt}</span>
                    {job.duration !== "—" && <span>Duration: {job.duration}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Progress</p>
                  <p className="text-sm font-medium text-foreground">{job.progress}%</p>
                </div>
              </div>
              {job.status === "running" && (
                <div className="mt-3 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
