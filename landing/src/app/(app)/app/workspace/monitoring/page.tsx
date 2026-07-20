"use client";

import { motion } from "framer-motion";
import { BarChart3, Activity, AlertTriangle, CheckCircle, Server } from "lucide-react";
import { DemoBadge } from "@/components/ui/DemoBadge";

const monitors = [
  { name: "API Health Check", endpoint: "https://api.sec-scanner.pro/health", status: "healthy", uptime: "99.97%", latency: "45ms" },
  { name: "Dashboard Availability", endpoint: "https://app.sec-scanner.pro/", status: "healthy", uptime: "99.99%", latency: "120ms" },
  { name: "Scan Engine", endpoint: "internal://scan-engine", status: "degraded", uptime: "98.5%", latency: "230ms" },
  { name: "Knowledge Graph DB", endpoint: "internal://neo4j", status: "healthy", uptime: "99.95%", latency: "12ms" },
  { name: "Asset Discovery", endpoint: "internal://discovery", status: "healthy", uptime: "99.9%", latency: "85ms" },
];

const statusIcon: Record<string, React.ElementType> = {
  healthy: CheckCircle,
  degraded: AlertTriangle,
  down: AlertTriangle,
};

const statusColor: Record<string, string> = {
  healthy: "text-accent",
  degraded: "text-amber",
  down: "text-red",
};

export default function WorkspaceMonitoringPage() {
  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Monitoring</h1>
        <DemoBadge className="mt-2" />
        <p className="mt-2 text-muted-2">Real-time monitoring and health status of platform components.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Services Up", value: "4/5", icon: Server, color: "text-accent", bg: "bg-accent-muted" },
          { label: "Avg Latency", value: "98ms", icon: Activity, color: "text-cyan", bg: "bg-cyan-muted" },
          { label: "Alerts (24h)", value: "2", icon: AlertTriangle, color: "text-amber", bg: "bg-amber-muted" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-5 rounded-xl bg-surface border border-border"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <span className="text-sm text-muted-2">{stat.label}</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Service Health</h2>
        </div>
        <div className="divide-y divide-border">
          {monitors.map((mon, i) => {
            const Icon = statusIcon[mon.status] || CheckCircle;
            const color = statusColor[mon.status] || "text-muted";
            return (
              <motion.div
                key={mon.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2 transition-colors"
              >
                <Icon className={`w-5 h-5 ${color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{mon.name}</p>
                  <p className="text-xs text-muted font-mono">{mon.endpoint}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Uptime</p>
                  <p className="text-sm font-medium text-foreground">{mon.uptime}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Latency</p>
                  <p className="text-sm font-medium text-foreground">{mon.latency}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${color} ${mon.status === "healthy" ? "bg-accent-muted" : "bg-amber-muted"}`}>
                  {mon.status}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
