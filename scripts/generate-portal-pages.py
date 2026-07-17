#!/usr/bin/env python3
"""Generate all new portal pages for INT-023C."""
import os

BASE = "/home/z/my-project/sec-scanner-landing/src/app/(app)/app"

def write_page(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    print(f"  Written: {path}")

# ─── App Home Page ─────────────────────────────────────────────────
write_page(f"{BASE}/page.tsx", '''"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  LayoutDashboard,
  Briefcase,
  FolderKanban,
  Radar,
  Bug,
  ShieldAlert,
  Network,
  Route,
  FileBarChart,
  Store,
  FlaskConical,
  BookOpen,
  Users,
  Download,
  ArrowRight,
} from "lucide-react";

const quickLinks = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/app/dashboard", desc: "Security posture overview", color: "text-accent", bg: "bg-accent-muted" },
  { icon: Briefcase, label: "Workspace", href: "/app/workspace", desc: "Assets, pipelines, jobs", color: "text-cyan", bg: "bg-cyan-muted" },
  { icon: FolderKanban, label: "Projects", href: "/app/projects", desc: "Manage your projects", color: "text-purple", bg: "bg-purple-muted" },
  { icon: Radar, label: "Scans", href: "/app/scans", desc: "Run and monitor scans", color: "text-amber", bg: "bg-amber-muted" },
  { icon: Bug, label: "Findings", href: "/app/findings", desc: "Security findings", color: "text-red", bg: "bg-red-muted" },
  { icon: ShieldAlert, label: "Risks", href: "/app/risks", desc: "Risk assessment", color: "text-amber", bg: "bg-amber-muted" },
  { icon: Network, label: "Knowledge Graph", href: "/app/demo/knowledge-graph", desc: "Security relationships", color: "text-cyan", bg: "bg-cyan-muted" },
  { icon: Route, label: "Attack Paths", href: "/app/demo/attack-paths", desc: "Trace attack vectors", color: "text-red", bg: "bg-red-muted" },
  { icon: FileBarChart, label: "Reports", href: "/app/reports", desc: "Generate reports", color: "text-purple", bg: "bg-purple-muted" },
  { icon: Store, label: "Marketplace", href: "/app/marketplace", desc: "Extensions & plugins", color: "text-accent", bg: "bg-accent-muted" },
  { icon: FlaskConical, label: "Playground", href: "/app/playground", desc: "Try and experiment", color: "text-cyan", bg: "bg-cyan-muted" },
  { icon: BookOpen, label: "Docs", href: "/app/docs", desc: "Documentation", color: "text-foreground", bg: "bg-surface-2" },
];

export default function AppHomePage() {
  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Welcome to sec-scanner.pro</h1>
        <p className="mt-2 text-muted-2">Security Intelligence Platform — your centralized security command center.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {quickLinks.map((link, i) => (
          <motion.Link
            key={link.href}
            href={link.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="group flex items-start gap-3 p-4 rounded-xl bg-surface border border-border hover:border-border-light hover:bg-surface-2 transition-all duration-200"
          >
            <div className={`w-9 h-9 rounded-lg ${link.bg} flex items-center justify-center shrink-0`}>
              <link.icon className={`w-4.5 h-4.5 ${link.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors flex items-center gap-1.5">
                {link.label}
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-muted-2 mt-0.5">{link.desc}</p>
            </div>
          </motion.Link>
        ))}
      </div>
    </div>
  );
}
''')

# ─── Workspace Pages ───────────────────────────────────────────────

write_page(f"{BASE}/workspace/page.tsx", '''"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Activity, Database, GitBranch, Clock, Cpu, BarChart3, ArrowRight, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";

const stats = [
  { label: "Total Assets", value: "8", icon: Database, color: "text-cyan", bg: "bg-cyan-muted" },
  { label: "Active Pipelines", value: "3", icon: GitBranch, color: "text-accent", bg: "bg-accent-muted" },
  { label: "Running Jobs", value: "2", icon: Cpu, color: "text-amber", bg: "bg-amber-muted" },
  { label: "Open Findings", value: "12", icon: ShieldAlert, color: "text-red", bg: "bg-red-muted" },
];

const recentActivity = [
  { type: "scan", message: "Full scan completed on Production", time: "2 min ago", status: "success" },
  { type: "finding", message: "New critical finding: SQL Injection in /api/v1/users", time: "5 min ago", status: "critical" },
  { type: "pipeline", message: "Pipeline 'Nightly Full Scan' started", time: "1 hour ago", status: "info" },
  { type: "asset", message: "New asset discovered: staging.sec-scanner.pro", time: "3 hours ago", status: "info" },
  { type: "scan", message: "Quick scan completed on Staging", time: "4 hours ago", status: "success" },
];

export default function WorkspaceOverviewPage() {
  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Workspace Overview</h1>
        <p className="mt-2 text-muted-2">Monitor and manage your security workspace activities.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-5 rounded-xl bg-surface border border-border"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
              <span className="text-sm text-muted-2">{stat.label}</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-surface border border-border">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
            </div>
            <div className="divide-y divide-border">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  {item.status === "success" && <CheckCircle className="w-4 h-4 text-accent shrink-0" />}
                  {item.status === "critical" && <AlertTriangle className="w-4 h-4 text-red shrink-0" />}
                  {item.status === "info" && <Activity className="w-4 h-4 text-cyan shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.message}</p>
                  </div>
                  <span className="text-xs text-muted shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-xl bg-surface border border-border">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
            </div>
            <div className="p-3 space-y-1">
              {[
                { label: "Assets", href: "/app/workspace/assets", icon: Database },
                { label: "Pipelines", href: "/app/workspace/pipelines", icon: GitBranch },
                { label: "History", href: "/app/workspace/history", icon: Clock },
                { label: "Jobs", href: "/app/workspace/jobs", icon: Cpu },
                { label: "Monitoring", href: "/app/workspace/monitoring", icon: BarChart3 },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors group"
                >
                  <action.icon className="w-4 h-4" />
                  <span className="flex-1">{action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
''')

write_page(f"{BASE}/workspace/assets/page.tsx", '''"use client";

import { motion } from "framer-motion";
import { workspaceAssets, type WorkspaceAsset } from "@/lib/portal-data";
import { Database, Server, Globe, Container, Cloud, Mail } from "lucide-react";

const typeIcons: Record<string, React.ElementType> = {
  host: Server,
  service: Globe,
  database: Database,
  api: Globe,
  container: Container,
  cloud: Cloud,
};

const typeColors: Record<string, string> = {
  host: "text-cyan",
  service: "text-accent",
  database: "text-purple",
  api: "text-amber",
  container: "text-cyan",
  cloud: "text-accent",
};

const criticalityColors: Record<string, string> = {
  critical: "bg-red-muted text-red",
  high: "bg-amber-muted text-amber",
  medium: "bg-cyan-muted text-cyan",
  low: "bg-surface-2 text-muted",
};

const statusColors: Record<string, string> = {
  active: "bg-accent-muted text-accent",
  inactive: "bg-surface-2 text-muted",
  deprecated: "bg-amber-muted text-amber",
};

export default function WorkspaceAssetsPage() {
  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Workspace Assets</h1>
        <p className="mt-2 text-muted-2">Manage and monitor all assets in your workspace.</p>
      </div>

      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Asset</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Type</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Criticality</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Findings</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Last Scanned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {workspaceAssets.map((asset, i) => {
              const Icon = typeIcons[asset.type] || Server;
              const typeColor = typeColors[asset.type] || "text-muted";
              return (
                <motion.tr
                  key={asset.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-surface-2 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${typeColor} shrink-0`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{asset.name}</p>
                        <p className="text-xs text-muted">{asset.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-2 capitalize">{asset.type}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[asset.status]}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${criticalityColors[asset.criticality]}`}>
                      {asset.criticality}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-sm font-medium ${asset.findings > 0 ? "text-red" : "text-muted"}`}>
                      {asset.findings}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm text-muted-2">{asset.lastScanned}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
''')

write_page(f"{BASE}/workspace/pipelines/page.tsx", '''"use client";

import { motion } from "framer-motion";
import { GitBranch, Play, Clock, CheckCircle, Plus } from "lucide-react";

const pipelines = [
  { id: "PIPE-001", name: "Nightly Full Scan", schedule: "Every day at 02:00", stages: 8, lastRun: "8 hours ago", status: "active" },
  { id: "PIPE-002", name: "Quick Scan on Commit", schedule: "On every push to main", stages: 4, lastRun: "2 hours ago", status: "active" },
  { id: "PIPE-003", name: "Weekly Compliance Check", schedule: "Every Monday at 06:00", stages: 6, lastRun: "3 days ago", status: "active" },
  { id: "PIPE-004", name: "Asset Discovery", schedule: "Every 6 hours", stages: 3, lastRun: "1 hour ago", status: "paused" },
];

export default function WorkspacePipelinesPage() {
  return (
    <div className="animate-page-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipelines</h1>
          <p className="mt-2 text-muted-2">Configure and run scan pipelines automatically.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors">
          <Plus className="w-4 h-4" /> New Pipeline
        </button>
      </div>

      <div className="space-y-3">
        {pipelines.map((pipeline, i) => (
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
                {pipeline.status}
              </span>
              <button className="p-2 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors">
                <Play className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
''')

write_page(f"{BASE}/workspace/history/page.tsx", '''"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle, XCircle, SkipForward } from "lucide-react";

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
''')

write_page(f"{BASE}/workspace/jobs/page.tsx", '''"use client";

import { motion } from "framer-motion";
import { scanJobs } from "@/lib/portal-data";
import { Cpu, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

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
''')

write_page(f"{BASE}/workspace/monitoring/page.tsx", '''"use client";

import { motion } from "framer-motion";
import { BarChart3, Activity, AlertTriangle, CheckCircle, Server } from "lucide-react";

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
''')

# ─── Projects Page ─────────────────────────────────────────────────

write_page(f"{BASE}/projects/page.tsx", '''"use client";

import { motion } from "framer-motion";
import { demoProjects } from "@/lib/portal-data";
import { Users, Shield, ArrowRight } from "lucide-react";

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  healthy: { color: "text-accent", bg: "bg-accent-muted", label: "Healthy" },
  warning: { color: "text-amber", bg: "bg-amber-muted", label: "Warning" },
  critical: { color: "text-red", bg: "bg-red-muted", label: "Critical" },
  idle: { color: "text-muted", bg: "bg-surface-2", label: "Idle" },
};

function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#00ff88" : score >= 60 ? "#ffb800" : "#ff4444";

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={radius}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <p className="mt-2 text-muted-2">Manage security across all your projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {demoProjects.map((project, i) => {
          const config = statusConfig[project.status];
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <ScoreRing score={project.securityScore} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors">
                      {project.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-2 mt-1 line-clamp-2">{project.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-2">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{project.assets} assets</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{project.members} members</span>
                </div>
                <span className="ml-auto">Scanned {project.lastScan}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
''')

# ─── Scans Page ────────────────────────────────────────────────────

write_page(f"{BASE}/scans/page.tsx", '''"use client";

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
''')

# ─── Findings Page ─────────────────────────────────────────────────

write_page(f"{BASE}/findings/page.tsx", '''"use client";

import { motion } from "framer-motion";
import { demoFindings, type Severity } from "@/lib/demo-data";
import { Bug, ExternalLink } from "lucide-react";

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
            {demoFindings.map((finding, i) => {
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
''')

# ─── Risks Page ────────────────────────────────────────────────────

write_page(f"{BASE}/risks/page.tsx", '''"use client";

import { motion } from "framer-motion";
import { ShieldAlert, TrendingUp, TrendingDown, Minus } from "lucide-react";

const risks = [
  { id: "RISK-001", name: "Unpatched Critical Vulnerabilities", severity: "critical", score: 9.2, trend: "up", affectedAssets: 3, description: "Multiple critical CVEs remain unpatched across production infrastructure." },
  { id: "RISK-002", name: "Exposed Internal Services", severity: "high", score: 7.8, trend: "down", affectedAssets: 2, description: "Internal services accessible from external networks without authentication." },
  { id: "RISK-003", name: "Insecure API Authentication", severity: "high", score: 7.5, trend: "stable", affectedAssets: 1, description: "API endpoints using weak or deprecated authentication mechanisms." },
  { id: "RISK-004", name: "Missing Encryption in Transit", severity: "medium", score: 5.5, trend: "down", affectedAssets: 4, description: "Several services communicate over unencrypted channels." },
  { id: "RISK-005", name: "Insufficient Logging", severity: "medium", score: 4.8, trend: "up", affectedAssets: 6, description: "Critical systems lack proper audit logging for security events." },
];

const severityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red", bg: "bg-red-muted" },
  high: { color: "text-amber", bg: "bg-amber-muted" },
  medium: { color: "text-cyan", bg: "bg-cyan-muted" },
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-red" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-accent" />;
  return <Minus className="w-4 h-4 text-muted" />;
};

export default function RisksPage() {
  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Risks</h1>
        <p className="mt-2 text-muted-2">Risk assessment and management for your security posture.</p>
      </div>

      <div className="space-y-3">
        {risks.map((risk, i) => {
          const config = severityConfig[risk.severity] || severityConfig.medium;
          return (
            <motion.div
              key={risk.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                  <ShieldAlert className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{risk.name}</h3>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase ${config.bg} ${config.color}`}>
                      {risk.severity}
                    </span>
                    <TrendIcon trend={risk.trend} />
                  </div>
                  <p className="text-xs text-muted-2 mt-1">{risk.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                    <span>Risk Score: <span className="font-mono font-medium text-foreground">{risk.score}</span></span>
                    <span>Affected Assets: <span className="font-medium text-foreground">{risk.affectedAssets}</span></span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
''')

# ─── Reports Page ──────────────────────────────────────────────────

write_page(f"{BASE}/reports/page.tsx", '''"use client";

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
''')

print("\nAll new pages generated successfully!")
