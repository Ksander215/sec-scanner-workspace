"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  getLatestFindings,
  type Finding,
  type Severity,
} from "@/lib/engine";
import { Bug, ExternalLink } from "lucide-react";
import Link from "next/link";

const severityConfig: Record<Severity, { color: string; bg: string }> = {
  critical: { color: "text-red", bg: "bg-red-muted" },
  high: { color: "text-amber", bg: "bg-amber-muted" },
  medium: { color: "text-cyan", bg: "bg-cyan-muted" },
  low: { color: "text-muted", bg: "bg-surface-2" },
  info: { color: "text-muted-2", bg: "bg-surface-2" },
};

const statusColors: Record<string, string> = {
  open: "text-red",
  acknowledged: "text-amber",
  remediated: "text-accent",
  false_positive: "text-muted",
};

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const latest = getLatestFindings();
    setFindings(latest);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="animate-page-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Findings</h1>
          <p className="mt-2 text-muted-2">Browse and manage security findings and vulnerabilities.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="animate-page-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Findings</h1>
          <p className="mt-2 text-muted-2">Browse and manage security findings and vulnerabilities.</p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <Bug className="w-8 h-8 text-muted-2" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            No findings yet
          </h2>
          <p className="text-sm text-muted-2 max-w-md mb-6">
            Run a scan first to discover security findings and vulnerabilities.
          </p>
          <Link
            href="/app/scanner"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Go to Scanner
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Findings</h1>
        <p className="mt-2 text-muted-2">Browse and manage security findings and vulnerabilities.</p>
      </div>

      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Finding</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Severity</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">CVSS</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Asset</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {findings.map((finding, i) => {
              const sev = severityConfig[finding.severity];
              return (
                <motion.tr
                  key={finding.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-surface-2 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Bug className={`w-4 h-4 ${sev.color} shrink-0`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{finding.title}</p>
                        <p className="text-xs text-muted">{finding.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase ${sev.bg} ${sev.color}`}>
                      {finding.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-mono text-foreground">{finding.cvss}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-2">{finding.asset}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-sm capitalize ${statusColors[finding.status] || "text-muted"}`}>
                      {finding.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm text-muted-2">{finding.discoveredAt.split("T")[0]}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
