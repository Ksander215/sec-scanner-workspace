"use client";

import { motion } from "framer-motion";
import { FileBarChart, Download, Calendar, Clock } from "lucide-react";

const reports = [
  { id: "RPT-001", name: "Executive Security Summary — Q3 2026", type: "executive", format: "PDF", generatedAt: "Jul 15, 2026", size: "2.4 MB" },
  { id: "RPT-002", name: "Vulnerability Assessment — Production", type: "vulnerability", format: "PDF", generatedAt: "Jul 14, 2026", size: "5.1 MB" },
  { id: "RPT-003", name: "PCI-DSS Compliance Report", type: "compliance", format: "PDF", generatedAt: "Jul 12, 2026", size: "3.8 MB" },
  { id: "RPT-004", name: "Attack Path Analysis — Full Scope", type: "attack-path", format: "HTML", generatedAt: "Jul 10, 2026", size: "12.3 MB" },
  { id: "RPT-005", name: "Asset Inventory Export", type: "inventory", format: "CSV", generatedAt: "Jul 8, 2026", size: "0.8 MB" },
  { id: "RPT-006", name: "Risk Trend Analysis — 30 Days", type: "trend", format: "PDF", generatedAt: "Jul 5, 2026", size: "1.9 MB" },
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
  return (
    <div className="animate-page-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="mt-2 text-muted-2">Generate and view security reports.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors">
          <FileBarChart className="w-4 h-4" /> Generate Report
        </button>
      </div>

      <div className="space-y-3">
        {reports.map((report, i) => (
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
              <button className="p-2 rounded-lg text-muted-2 hover:text-accent hover:bg-accent-muted transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
