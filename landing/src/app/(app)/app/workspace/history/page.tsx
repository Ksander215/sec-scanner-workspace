"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle, XCircle, SkipForward } from "lucide-react";
import { DemoBadge } from "@/components/ui/DemoBadge";

const historyItems = [
  { id: "HIST-001", name: "Full Scan — Production", type: "full", status: "completed", startedAt: "Jul 17, 10:00", duration: "23 min", findings: 4 },
  { id: "HIST-002", name: "Quick Scan — Staging", type: "quick", status: "completed", startedAt: "Jul 17, 09:00", duration: "12 min", findings: 2 },
  { id: "HIST-003", name: "Compliance — PCI-DSS", type: "compliance", status: "completed", startedAt: "Jul 16, 14:00", duration: "28 min", findings: 1 },
  { id: "HIST-004", name: "Full Scan — Development", type: "full", status: "failed", startedAt: "Jul 16, 10:00", duration: "8 min", findings: 1 },
  { id: "HIST-005", name: "Quick Scan — Production", type: "quick", status: "skipped", startedAt: "Jul 15, 18:00", duration: "—", findings: 0 },
  { id: "HIST-006", name: "Full Scan — Production", type: "full", status: "completed", startedAt: "Jul 15, 10:00", duration: "22 min", findings: 5 },
];

const statusIcons: Record<string, React.ElementType> = {
  completed: CheckCircle,
  failed: XCircle,
  skipped: SkipForward,
};

const statusColors: Record<string, string> = {
  completed: "text-accent",
  failed: "text-red",
  skipped: "text-amber",
};

export default function WorkspaceHistoryPage() {
  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Scan History</h1>
        <DemoBadge className="mt-2" />
        <p className="mt-2 text-muted-2">View past scan runs and their results.</p>
      </div>

      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Scan</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Started</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Duration</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Findings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {historyItems.map((item, i) => {
              const StatusIcon = statusIcons[item.status] || Clock;
              const statusColor = statusColors[item.status] || "text-muted";
              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-surface-2 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted">{item.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className={`flex items-center gap-1.5 text-sm ${statusColor}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="capitalize">{item.status}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-2">{item.startedAt}</td>
                  <td className="px-5 py-3.5 text-right text-sm text-muted-2">{item.duration}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-sm font-medium ${item.findings > 0 ? "text-amber" : "text-muted"}`}>
                      {item.findings}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
