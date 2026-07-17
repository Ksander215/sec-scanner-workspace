"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GitBranch, Play, Clock, CheckCircle, Plus, Loader2 } from "lucide-react";

const pipelines = [
  { id: "PIPE-001", name: "Nightly Full Scan", schedule: "Every day at 02:00", stages: 8, lastRun: "8 hours ago", status: "active" },
  { id: "PIPE-002", name: "Quick Scan on Commit", schedule: "On every push to main", stages: 4, lastRun: "2 hours ago", status: "active" },
  { id: "PIPE-003", name: "Weekly Compliance Check", schedule: "Every Monday at 06:00", stages: 6, lastRun: "3 days ago", status: "active" },
  { id: "PIPE-004", name: "Asset Discovery", schedule: "Every 6 hours", stages: 3, lastRun: "1 hour ago", status: "paused" },
];

export default function WorkspacePipelinesPage() {
  const [runningPipelines, setRunningPipelines] = useState<Set<string>>(new Set());
  const [showNewPipeline, setShowNewPipeline] = useState(false);

  const handleRunPipeline = (id: string) => {
    setRunningPipelines((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setRunningPipelines((prev) => {
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
          <h1 className="text-2xl font-bold text-foreground">Pipelines</h1>
          <p className="mt-2 text-muted-2">Configure and run scan pipelines automatically.</p>
        </div>
        <button
          onClick={() => setShowNewPipeline(!showNewPipeline)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" /> New Pipeline
        </button>
      </div>

      {showNewPipeline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl bg-accent-muted border border-accent-border mb-6"
        >
          <h3 className="text-base font-semibold text-foreground mb-2">Create New Pipeline</h3>
          <p className="text-sm text-muted-2 mb-4">Pipeline creation requires a running backend. This feature will be available in the next release.</p>
          <button
            onClick={() => setShowNewPipeline(false)}
            className="px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
          >
            Got it
          </button>
        </motion.div>
      )}

      <div className="space-y-3">
        {pipelines.map((pipeline, i) => {
          const isRunning = runningPipelines.has(pipeline.id);
          return (
            <motion.div
              key={pipeline.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                <GitBranch className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{pipeline.name}</h3>
                <p className="text-xs text-muted-2 mt-0.5">{pipeline.schedule}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted">Stages</p>
                  <p className="text-sm font-medium text-foreground">{pipeline.stages}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Last Run</p>
                  <p className="text-sm text-muted-2">{pipeline.lastRun}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${pipeline.status === "active" ? "bg-accent-muted text-accent" : "bg-amber-muted text-amber"}`}>
                  {isRunning ? "running" : pipeline.status}
                </span>
                <button
                  onClick={() => handleRunPipeline(pipeline.id)}
                  disabled={isRunning}
                  className="p-2 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50"
                  title={isRunning ? "Running..." : "Run pipeline"}
                >
                  {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
