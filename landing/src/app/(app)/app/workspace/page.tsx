"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Activity, Database, GitBranch, Clock, Cpu, BarChart3, ArrowRight, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";
import { DemoBadge } from "@/components/ui/DemoBadge";

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
      <div id="workspace-header" className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Workspace Overview</h1>
        <p className="mt-2 text-muted-2">Monitor and manage your security workspace activities.</p>
        <div className="flex items-center gap-2 mt-2">
          <ContextualHelp section="workspace" />
          <DemoBadge />
        </div>
      </div>

      <div id="workspace-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        <div id="workspace-activity" className="lg:col-span-2">
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

        <div id="workspace-actions">
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

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionFAQ section="workspace" />
        <SmartNextStep {...RECOMMENDATION_CHAINS["workspace"]} />
      </div>
    </div>
  );
}
