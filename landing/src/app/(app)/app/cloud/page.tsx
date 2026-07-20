"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  FolderKanban,
  Server,
  GitBranch,
  FileText,
  Users,
  CreditCard,
  Key,
  Activity,
  MoreHorizontal,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Pause,
  Zap,
  Shield,
  Settings,
} from "lucide-react";
import { cloudProjects, demoFindings, demoAssets } from "@/lib/demo-data";
import { DemoBadge } from "@/components/ui/DemoBadge";

type CloudTab = "projects" | "assets" | "pipelines" | "reports" | "team" | "billing" | "api-keys";

const tabs: { key: CloudTab; label: string; icon: React.ElementType }[] = [
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "assets", label: "Assets", icon: Server },
  { key: "pipelines", label: "Pipelines", icon: GitBranch },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "team", label: "Team", icon: Users },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "api-keys", label: "API Keys", icon: Key },
];

export default function CloudWorkspacePage() {
  const [activeTab, setActiveTab] = useState<CloudTab>("projects");

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                Cloud Workspace
              </h1>
              <DemoBadge className="mt-1" />
              <p className="text-sm text-muted-2 mt-1">SaaS deployment — full platform access</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info">Professional Plan</Badge>
              <Button size="sm" variant="outline">
                <Settings className="w-3.5 h-3.5" />
                Settings
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all shrink-0 ${
                  activeTab === key ? "bg-accent text-background" : "text-muted-2 hover:text-foreground bg-surface-2 border border-border"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Container className="py-6">
        {/* ─── Projects ─────────────────────────────────────────────────── */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-2">{cloudProjects.length} projects</span>
              <Button size="sm"><Plus className="w-3.5 h-3.5" /> New Project</Button>
            </div>
            <div className="space-y-3">
              {cloudProjects.map((proj) => (
                <div key={proj.id} className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        proj.status === "active" ? "bg-accent" : proj.status === "paused" ? "bg-amber" : "bg-cyan"
                      }`} />
                      <h3 className="text-sm font-semibold text-foreground">{proj.name}</h3>
                      <Badge variant={proj.status === "active" ? "low" : proj.status === "paused" ? "medium" : "info"}>
                        {proj.status}
                      </Badge>
                    </div>
                    <button className="text-muted hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                  <div className="mt-3 flex items-center gap-6 text-xs text-muted-2">
                    <div className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5" />{proj.assets} assets</div>
                    <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />{proj.findings} findings</div>
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Last scan: {proj.lastScan}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Assets ───────────────────────────────────────────────────── */}
        {activeTab === "assets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-2">{demoAssets.length} assets</span>
              <Button size="sm"><Plus className="w-3.5 h-3.5" /> Add Asset</Button>
            </div>
            <div className="rounded-xl bg-surface border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-4 text-xs text-muted uppercase tracking-wider">
                <span className="flex-1">Asset</span>
                <span className="w-20 text-center">Type</span>
                <span className="w-20 text-center">Criticality</span>
                <span className="w-20 text-center">Findings</span>
                <span className="w-20 text-right">Risk Score</span>
              </div>
              {demoAssets.map((asset) => (
                <div key={asset.id} className="px-5 py-3 flex items-center gap-4 border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{asset.name}</div>
                    <div className="text-xs text-muted-2 font-mono">{asset.ip} {asset.os ? `· ${asset.os}` : ""}</div>
                  </div>
                  <span className="w-20 text-center text-xs text-muted-2 capitalize">{asset.type}</span>
                  <div className="w-20 text-center"><Badge variant={asset.criticality as "critical" | "high" | "medium" | "low"}>{asset.criticality}</Badge></div>
                  <span className="w-20 text-center text-xs text-foreground font-mono">{asset.findingsCount}</span>
                  <span className={`w-20 text-right text-sm font-mono font-bold ${asset.riskScore >= 90 ? "text-red" : asset.riskScore >= 70 ? "text-amber" : "text-accent"}`}>
                    {asset.riskScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Pipelines ────────────────────────────────────────────────── */}
        {activeTab === "pipelines" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-2">3 pipeline configurations</span>
              <Button size="sm"><Plus className="w-3.5 h-3.5" /> New Pipeline</Button>
            </div>
            {[
              { name: "Full Security Scan", stages: ["DAST", "SAST", "API", "Infra"], schedule: "Daily at 02:00 UTC", status: "active" },
              { name: "Quick Recon", stages: ["Port Scan", "Header Check"], schedule: "Every 6 hours", status: "active" },
              { name: "Compliance Audit", stages: ["CIS", "OWASP", "PCI"], schedule: "Weekly (Mondays)", status: "paused" },
            ].map((pipe, i) => (
              <div key={i} className="p-5 rounded-xl bg-surface border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-4 h-4 text-cyan" />
                    <h3 className="text-sm font-semibold text-foreground">{pipe.name}</h3>
                    <Badge variant={pipe.status === "active" ? "low" : "medium"}>{pipe.status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {pipe.stages.map((stage, si) => (
                    <div key={si} className="flex items-center gap-1.5">
                      <span className="text-xs px-2 py-1 rounded-md bg-surface-2 text-foreground border border-border">{stage}</span>
                      {si < pipe.stages.length - 1 && <ArrowRight className="w-3 h-3 text-muted" />}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-2">
                  <Clock className="w-3 h-3" /> {pipe.schedule}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Reports ──────────────────────────────────────────────────── */}
        {activeTab === "reports" && (
          <div className="space-y-3">
            {[
              { name: "Security Assessment — July 2026", type: "Full Report", date: "Jul 17, 2026", format: "PDF" },
              { name: "Executive Summary — Q2 2026", type: "Executive", date: "Jul 1, 2026", format: "PDF" },
              { name: "Compliance Audit — OWASP Top 10", type: "Compliance", date: "Jun 28, 2026", format: "SARIF" },
              { name: "Vulnerability Trend Report", type: "Trends", date: "Jun 15, 2026", format: "JSON" },
              { name: "Attack Path Analysis — Production", type: "Attack Paths", date: "Jun 10, 2026", format: "PDF" },
            ].map((report, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface border border-border flex items-center gap-4 hover:bg-surface-2 transition-colors">
                <FileText className="w-5 h-5 text-cyan shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{report.name}</div>
                  <div className="text-xs text-muted-2">{report.type} · {report.date}</div>
                </div>
                <Badge variant="category">{report.format}</Badge>
                <Button size="sm" variant="ghost">Download</Button>
              </div>
            ))}
          </div>
        )}

        {/* ─── Team ─────────────────────────────────────────────────────── */}
        {activeTab === "team" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-2">4 team members</span>
              <Button size="sm"><Plus className="w-3.5 h-3.5" /> Invite Member</Button>
            </div>
            {[
              { name: "Alex Chen", email: "alex@sec-scanner.pro", role: "Admin", avatar: "AC" },
              { name: "Maria Rodriguez", email: "maria@sec-scanner.pro", role: "Security Engineer", avatar: "MR" },
              { name: "James Wilson", email: "james@sec-scanner.pro", role: "Developer", avatar: "JW" },
              { name: "Sara Kim", email: "sara@sec-scanner.pro", role: "Viewer", avatar: "SK" },
            ].map((member, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface border border-border flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent-muted flex items-center justify-center text-sm font-bold text-accent">
                  {member.avatar}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{member.name}</div>
                  <div className="text-xs text-muted-2">{member.email}</div>
                </div>
                <Badge variant="category">{member.role}</Badge>
              </div>
            ))}
          </div>
        )}

        {/* ─── Billing ──────────────────────────────────────────────────── */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            {/* Current plan */}
            <div className="p-6 rounded-xl bg-surface border border-accent/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Professional Plan</h3>
                  <p className="text-sm text-muted-2">$99/month · Billed monthly</p>
                </div>
                <Button size="sm" variant="outline">Change Plan</Button>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">Scans this month</span>
                  <div className="text-lg font-bold text-foreground mt-1">47 / 100</div>
                  <div className="h-1.5 rounded-full bg-surface mt-2"><div className="h-full rounded-full bg-accent" style={{ width: "47%" }} /></div>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">Assets monitored</span>
                  <div className="text-lg font-bold text-foreground mt-1">8 / 50</div>
                  <div className="h-1.5 rounded-full bg-surface mt-2"><div className="h-full rounded-full bg-cyan" style={{ width: "16%" }} /></div>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">Team members</span>
                  <div className="text-lg font-bold text-foreground mt-1">4 / 10</div>
                  <div className="h-1.5 rounded-full bg-surface mt-2"><div className="h-full rounded-full bg-purple" style={{ width: "40%" }} /></div>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="p-5 rounded-xl bg-surface border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Payment Method</h3>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                <CreditCard className="w-5 h-5 text-muted" />
                <div className="flex-1">
                  <div className="text-sm text-foreground">Visa ending in 4242</div>
                  <div className="text-xs text-muted-2">Expires 12/2027</div>
                </div>
                <Button size="sm" variant="ghost">Update</Button>
              </div>
            </div>

            {/* Recent invoices */}
            <div className="p-5 rounded-xl bg-surface border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Recent Invoices</h3>
              <div className="space-y-2">
                {["Jul 1, 2026", "Jun 1, 2026", "May 1, 2026"].map((date, i) => (
                  <div key={i} className="flex items-center justify-between p-2 text-xs">
                    <span className="text-foreground">{date}</span>
                    <span className="text-muted-2">$99.00</span>
                    <span className="text-accent">Paid</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── API Keys ─────────────────────────────────────────────────── */}
        {activeTab === "api-keys" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-2">2 active API keys</span>
              <Button size="sm"><Plus className="w-3.5 h-3.5" /> Generate Key</Button>
            </div>
            {[
              { name: "Production API Key", prefix: "ssi_prod_****7f3a", created: "Jun 1, 2026", lastUsed: "2 min ago" },
              { name: "CI/CD Pipeline Key", prefix: "ssi_ci_****2b1e", created: "May 15, 2026", lastUsed: "1 hour ago" },
            ].map((key, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">{key.name}</h3>
                  <Badge variant="low">Active</Badge>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-surface-2 border border-border font-mono text-xs text-muted-2">
                  {key.prefix}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-2">
                  <span>Created: {key.created}</span>
                  <span>Last used: {key.lastUsed}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
