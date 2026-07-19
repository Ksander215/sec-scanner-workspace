"use client";

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
          <Link
            key={link.href}
            href={link.href}
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
          </Link>
        ))}
      </div>
    </div>
  );
}
