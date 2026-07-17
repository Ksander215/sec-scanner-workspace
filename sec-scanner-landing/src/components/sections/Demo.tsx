"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  ChevronRight,
  AlertTriangle,
  Shield,
  GitBranch,
  Lightbulb,
  Eye,
  BarChart3,
} from "lucide-react";

type DemoTab = "findings" | "risk" | "attack" | "recommend" | "explain";

const demoFindings = [
  { id: "F-001", severity: "critical", title: "API4:2023 — Unrestricted Resource Consumption", cvss: 9.1, asset: "api.example.com/v2/users" },
  { id: "F-002", severity: "critical", title: "API1:2023 — Broken Object Level Authorization", cvss: 8.6, asset: "api.example.com/v2/accounts" },
  { id: "F-003", severity: "high", title: "API8:2023 — Security Misconfiguration", cvss: 7.5, asset: "api.example.com/v2/admin" },
  { id: "F-004", severity: "high", title: "CORS Policy — Wildcard Origin Allowed", cvss: 7.2, asset: "api.example.com" },
  { id: "F-005", severity: "high", title: "Missing Rate Limiting on Authentication Endpoint", cvss: 6.8, asset: "api.example.com/v2/auth" },
  { id: "F-006", severity: "medium", title: "Sensitive Data Exposure in Error Messages", cvss: 5.3, asset: "api.example.com/v2/debug" },
  { id: "F-007", severity: "medium", title: "JWT Algorithm Not Validated", cvss: 5.9, asset: "auth.example.com" },
  { id: "F-008", severity: "low", title: "Missing Security Headers (X-Content-Type-Options)", cvss: 3.1, asset: "api.example.com" },
];

const severityColors: Record<string, string> = {
  critical: "text-red bg-red-muted border-red/30",
  high: "text-amber bg-amber-muted border-amber/30",
  medium: "text-cyan bg-cyan-muted border-cyan/30",
  low: "text-muted bg-surface-2 border-border",
};

const tabs: { key: DemoTab; label: string; icon: React.ElementType }[] = [
  { key: "findings", label: "50 Findings", icon: AlertTriangle },
  { key: "risk", label: "Risk Graph", icon: BarChart3 },
  { key: "attack", label: "Attack Paths", icon: GitBranch },
  { key: "recommend", label: "Recommendations", icon: Lightbulb },
  { key: "explain", label: "Explainability", icon: Eye },
];

export function Demo() {
  const [activeTab, setActiveTab] = useState<DemoTab>("findings");
  const [launched, setLaunched] = useState(false);

  if (!launched) {
    return (
      <section id="demo" className="relative py-24 sm:py-32 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <span className="text-sm font-medium text-amber uppercase tracking-wider">
              Interactive Demo
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Попробуйте
              <br />
              <span className="text-gradient-accent">без регистрации</span>
            </h2>
            <p className="mt-6 text-lg text-muted-2 leading-relaxed">
              Запустите демо и увидьте, как платформа анализирует 50 находок, строит граф
              риска, обнаруживает цепочки атак и генерирует рекомендации — всё в реальном
              времени.
            </p>
            <button
              onClick={() => setLaunched(true)}
              className="mt-10 group inline-flex items-center gap-3 px-10 py-4 text-lg font-semibold bg-accent text-background rounded-2xl hover:bg-accent-hover transition-all glow-accent"
            >
              <Play className="w-5 h-5" />
              Launch Demo
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="demo" className="relative py-24 sm:py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-10"
        >
          <span className="text-sm font-medium text-amber uppercase tracking-wider">
            Live Demo
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight">
            Демо-отчёт сканирования API
          </h2>
        </motion.div>

        {/* Demo tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                activeTab === tab.key
                  ? "bg-accent text-background"
                  : "bg-surface-2 text-muted-2 hover:text-foreground hover:bg-surface-3"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Demo content */}
        <div className="rounded-2xl border border-border bg-background overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "findings" && (
              <motion.div
                key="findings"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6"
              >
                {/* Summary bar */}
                <div className="flex flex-wrap gap-4 mb-6">
                  {[
                    { label: "Critical", count: 2, color: "text-red bg-red-muted" },
                    { label: "High", count: 3, color: "text-amber bg-amber-muted" },
                    { label: "Medium", count: 2, color: "text-cyan bg-cyan-muted" },
                    { label: "Low", count: 1, color: "text-muted bg-surface-2" },
                  ].map((s) => (
                    <span
                      key={s.label}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${s.color}`}
                    >
                      {s.count} {s.label}
                    </span>
                  ))}
                </div>
                {/* Findings list */}
                <div className="space-y-2">
                  {demoFindings.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-surface-2 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${severityColors[f.severity]}`}
                        >
                          {f.severity.toUpperCase()}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                            {f.title}
                          </div>
                          <div className="text-xs text-muted font-mono">{f.asset}</div>
                        </div>
                      </div>
                      <span className="text-sm font-mono font-semibold text-foreground">
                        CVSS {f.cvss}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "risk" && (
              <motion.div
                key="risk"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Risk score */}
                  <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-surface-2">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="#1e1e2e" strokeWidth="8" />
                        <circle cx="60" cy="60" r="52" fill="none" stroke="#ff4444" strokeWidth="8"
                          strokeDasharray={`${(73 / 100) * 327} 327`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold text-red">73</span>
                      </div>
                    </div>
                    <div className="mt-4 text-sm font-medium text-foreground">Risk Score</div>
                    <div className="text-xs text-muted">High Risk</div>
                  </div>

                  {/* Risk by category */}
                  <div className="col-span-2 p-6 rounded-2xl bg-surface-2">
                    <h4 className="text-sm font-semibold text-foreground mb-4">Risk by Category</h4>
                    <div className="space-y-4">
                      {[
                        { name: "Authentication", score: 85, color: "#ff4444" },
                        { name: "Authorization", score: 78, color: "#ff6b35" },
                        { name: "Configuration", score: 65, color: "#ffb800" },
                        { name: "Data Exposure", score: 52, color: "#00d4ff" },
                        { name: "Transport", score: 30, color: "#00ff88" },
                      ].map((cat) => (
                        <div key={cat.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-2">{cat.name}</span>
                            <span className="font-mono font-medium" style={{ color: cat.color }}>
                              {cat.score}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{
                                width: `${cat.score}%`,
                                backgroundColor: cat.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "attack" && (
              <motion.div
                key="attack"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-5 h-5 text-red" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Attack Path #1 — Critical Exploit Chain
                    </h4>
                    <span className="px-2 py-0.5 text-xs font-mono bg-red-muted text-red rounded border border-red/30">
                      CVSS 9.8
                    </span>
                  </div>

                  {/* Attack path visualization */}
                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    {[
                      { step: "1", name: "Resource Consumption", id: "API4:2023", color: "#ff4444" },
                      { step: "2", name: "Security Misconfig", id: "API8:2023", color: "#ff6b35" },
                      { step: "3", name: "Broken AuthZ", id: "API1:2023", color: "#ffb800" },
                    ].map((node, i) => (
                      <div key={node.step} className="flex items-center gap-3 flex-1">
                        <div
                          className="flex-1 p-4 rounded-xl border text-center"
                          style={{
                            borderColor: `${node.color}33`,
                            backgroundColor: `${node.color}0a`,
                          }}
                        >
                          <div className="text-xs text-muted mb-1">Step {node.step}</div>
                          <div className="text-sm font-semibold" style={{ color: node.color }}>
                            {node.id}
                          </div>
                          <div className="text-xs text-muted-2 mt-1">{node.name}</div>
                        </div>
                        {i < 2 && (
                          <ChevronRight className="w-5 h-5 text-muted shrink-0 hidden sm:block" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 rounded-xl bg-red-muted border border-red/20">
                    <div className="text-sm text-red font-medium">
                      Impact: Full system compromise through chained exploitation
                    </div>
                    <div className="text-xs text-muted-2 mt-1">
                      Attacker can consume resources to trigger misconfiguration, then exploit broken
                      authorization to gain admin access.
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-6 mb-4">
                    <Shield className="w-5 h-5 text-amber" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Attack Path #2 — Auth Bypass
                    </h4>
                    <span className="px-2 py-0.5 text-xs font-mono bg-amber-muted text-amber rounded border border-amber/30">
                      CVSS 8.1
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    {[
                      { step: "1", name: "JWT Algorithm Confusion", id: "API2:2023", color: "#ffb800" },
                      { step: "2", name: "CORS Misconfig", id: "CORS-01", color: "#00d4ff" },
                    ].map((node, i) => (
                      <div key={node.step} className="flex items-center gap-3 flex-1">
                        <div
                          className="flex-1 p-4 rounded-xl border text-center"
                          style={{
                            borderColor: `${node.color}33`,
                            backgroundColor: `${node.color}0a`,
                          }}
                        >
                          <div className="text-xs text-muted mb-1">Step {node.step}</div>
                          <div className="text-sm font-semibold" style={{ color: node.color }}>
                            {node.id}
                          </div>
                          <div className="text-xs text-muted-2 mt-1">{node.name}</div>
                        </div>
                        {i < 1 && (
                          <ChevronRight className="w-5 h-5 text-muted shrink-0 hidden sm:block" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "recommend" && (
              <motion.div
                key="recommend"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 space-y-4"
              >
                {[
                  {
                    priority: "P1",
                    title: "Implement Rate Limiting on All API Endpoints",
                    finding: "API4:2023",
                    effort: "Low",
                    impact: "Critical",
                    desc: "Add rate limiting middleware (express-rate-limit or nginx limit_req) with per-IP and per-user quotas. Configure 429 responses with Retry-After headers.",
                  },
                  {
                    priority: "P2",
                    title: "Enforce Object-Level Authorization Checks",
                    finding: "API1:2023",
                    effort: "Medium",
                    impact: "Critical",
                    desc: "Implement ownership validation in every endpoint that accesses user-specific resources. Add middleware that verifies the requesting user owns the referenced object.",
                  },
                  {
                    priority: "P3",
                    title: "Remove Debug Endpoints from Production",
                    finding: "API8:2023",
                    effort: "Low",
                    impact: "High",
                    desc: "Delete or gate /debug and /admin endpoints behind authentication and IP whitelisting. Disable stack traces and verbose error messages in production.",
                  },
                  {
                    priority: "P4",
                    title: "Restrict CORS to Known Origins",
                    finding: "CORS-01",
                    effort: "Low",
                    impact: "High",
                    desc: "Replace Access-Control-Allow-Origin: * with explicit origin whitelist. Validate the Origin header server-side and reject unknown origins.",
                  },
                ].map((rec) => (
                  <div
                    key={rec.priority}
                    className="p-4 rounded-xl border border-border hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-0.5 text-xs font-mono font-bold bg-accent-muted text-accent rounded border border-accent-border">
                        {rec.priority}
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">{rec.title}</h4>
                    </div>
                    <p className="text-sm text-muted-2 mb-3">{rec.desc}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted">
                        Finding: <span className="text-foreground font-mono">{rec.finding}</span>
                      </span>
                      <span className="text-muted">
                        Effort: <span className="text-amber">{rec.effort}</span>
                      </span>
                      <span className="text-muted">
                        Impact: <span className="text-red">{rec.impact}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === "explain" && (
              <motion.div
                key="explain"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6"
              >
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-surface-2">
                    <h4 className="text-sm font-semibold text-foreground mb-3">
                      Why is this finding Critical?
                    </h4>
                    <div className="space-y-3 text-sm text-muted-2 leading-relaxed">
                      <p>
                        <span className="text-accent font-medium">API4:2023 — Unrestricted Resource Consumption</span> was
                        classified as Critical because:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { label: "Attack Complexity", value: "Low — No authentication required" },
                          { label: "Business Impact", value: "Service degradation, cost amplification" },
                          { label: "Exploitability", value: "Publicly accessible endpoint" },
                          { label: "Remediation Speed", value: "<1 hour to implement rate limiting" },
                        ].map((item) => (
                          <div key={item.label} className="p-3 rounded-xl bg-surface-3">
                            <div className="text-xs text-muted mb-1">{item.label}</div>
                            <div className="text-sm text-foreground">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-accent-muted border border-accent-border">
                    <h4 className="text-sm font-semibold text-accent mb-2">
                      AI Explanation
                    </h4>
                    <p className="text-sm text-muted-2 leading-relaxed">
                      This endpoint lacks rate limiting, allowing an attacker to send unlimited
                      requests. Combined with the CORS misconfiguration (allowing any origin), this
                      creates a significant amplification vector. The attacker can exhaust server
                      resources from any website, leading to denial of service for legitimate users.
                      The fix is straightforward: implement per-IP rate limiting and restrict CORS
                      to trusted origins.
                    </p>
                  </div>

                  {/* Link to full interactive demo */}
                  <div className="mt-6 text-center">
                    <a
                      href="/demo"
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-accent text-background rounded-xl hover:bg-accent-hover transition-all glow-accent"
                    >
                      <Play className="w-4 h-4" />
                      Open Full Interactive Demo
                      <ChevronRight className="w-4 h-4" />
                    </a>
                    <div className="mt-3 flex items-center justify-center gap-4">
                      <a href="/demo/knowledge-graph" className="text-xs text-cyan hover:text-cyan/80 transition-colors">
                        Knowledge Graph
                      </a>
                      <a href="/demo/attack-paths" className="text-xs text-amber hover:text-amber/80 transition-colors">
                        Attack Paths
                      </a>
                      <a href="/dashboard" className="text-xs text-purple hover:text-purple/80 transition-colors">
                        Dashboard
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
