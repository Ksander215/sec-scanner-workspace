"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileBarChart, Download, Calendar, CheckCircle2, Loader2 } from "lucide-react";

const reports = [
  { id: "RPT-001", name: "Executive Security Summary - Q3 2026", type: "executive", format: "PDF", generatedAt: "Jul 15, 2026", size: "2.4 MB" },
  { id: "RPT-002", name: "Vulnerability Assessment - Production", type: "vulnerability", format: "PDF", generatedAt: "Jul 14, 2026", size: "5.1 MB" },
  { id: "RPT-003", name: "PCI-DSS Compliance Report", type: "compliance", format: "PDF", generatedAt: "Jul 12, 2026", size: "3.8 MB" },
  { id: "RPT-004", name: "Attack Path Analysis - Full Scope", type: "attack-path", format: "HTML", generatedAt: "Jul 10, 2026", size: "12.3 MB" },
  { id: "RPT-005", name: "Asset Inventory Export", type: "inventory", format: "CSV", generatedAt: "Jul 8, 2026", size: "0.8 MB" },
  { id: "RPT-006", name: "Risk Trend Analysis - 30 Days", type: "trend", format: "PDF", generatedAt: "Jul 5, 2026", size: "1.9 MB" },
];

const typeColors: Record<string, string> = {
  executive: "text-accent",
  vulnerability: "text-red",
  compliance: "text-purple",
  "attack-path": "text-amber",
  inventory: "text-cyan",
  trend: "text-cyan",
};

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const handleDownload = (id: string) => {
    setDownloading((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDownloaded((prev) => new Set(prev).add(id));
    }, 1500);
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
    }, 2500);
  };

  return (
    <div className="animate-page-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="mt-2 text-muted-2">Generate and view security reports.</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-70"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart className="w-4 h-4" />}
          {generating ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {generating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-accent-muted border border-accent-border mb-6 flex items-center gap-3"
        >
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
          <div>
            <p className="text-sm font-medium text-foreground">Generating report...</p>
            <p className="text-xs text-muted-2">Collecting findings, computing risk scores, and building the report.</p>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {reports.map((report, i) => {
          const isDownloading = downloading.has(report.id);
          const isDownloaded = downloaded.has(report.id);
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-muted flex items-center justify-center shrink-0">
                <FileBarChart className={`w-5 h-5 ${typeColors[report.type] || "text-purple"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{report.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-2">
                  <span>{report.id}</span>
                  <span className="capitalize">{report.type.replace("-", " ")}</span>
                  <span className="uppercase font-mono">{report.format}</span>
                  <span>{report.size}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {report.generatedAt}
                </div>
                <button
                  onClick={() => handleDownload(report.id)}
                  disabled={isDownloading}
                  className={`p-2 rounded-lg transition-colors ${
                    isDownloaded
                      ? "text-accent bg-accent-muted"
                      : isDownloading
                      ? "text-muted-2 bg-surface-2"
                      : "text-muted-2 hover:text-accent hover:bg-accent-muted"
                  }`}
                  title={isDownloaded ? "Downloaded" : isDownloading ? "Downloading..." : "Download report"}
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isDownloaded ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
