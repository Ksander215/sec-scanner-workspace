"use client";

import { motion } from "framer-motion";
import {
  Radar,
  Brain,
  Network,
  Workflow,
  BarChart3,
  Lock,
  ArrowRight,
} from "lucide-react";

const platformFeatures = [
  {
    icon: Radar,
    title: "Multi-Engine Scanning",
    oneLiner: "Unified interface for Nmap, Nuclei, Semgrep, Trivy and 20+ scanners.",
    color: "accent",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    oneLiner: "ML-driven correlation, prioritization, and automated remediation planning.",
    color: "cyan",
  },
  {
    icon: Network,
    title: "Knowledge Graph",
    oneLiner: "Visualize asset-vulnerability-attack path relationships in an interactive graph.",
    color: "purple",
  },
  {
    icon: Workflow,
    title: "Automated Workflows",
    oneLiner: "Configurable pipelines from scan to JIRA ticket with CI/CD integration.",
    color: "amber",
  },
  {
    icon: BarChart3,
    title: "Risk Quantification",
    oneLiner: "Quantified risk scores, SLA metrics, and executive dashboards.",
    color: "accent",
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    oneLiner: "SSO, RBAC, audit log, encryption. SOC 2, ISO 27001, GDPR compliant.",
    color: "red",
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  accent: { bg: "bg-accent-muted", text: "text-accent", border: "border-accent-border", glow: "hover:shadow-[0_0_30px_rgba(0,255,136,0.08)]" },
  cyan: { bg: "bg-cyan-muted", text: "text-cyan", border: "border-[rgba(0,212,255,0.2)]", glow: "hover:shadow-[0_0_30px_rgba(0,212,255,0.08)]" },
  purple: { bg: "bg-purple-muted", text: "text-purple", border: "border-[rgba(168,85,247,0.2)]", glow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.08)]" },
  amber: { bg: "bg-amber-muted", text: "text-amber", border: "border-[rgba(255,184,0,0.2)]", glow: "hover:shadow-[0_0_30px_rgba(255,184,0,0.08)]" },
  red: { bg: "bg-red-muted", text: "text-red", border: "border-[rgba(255,68,68,0.2)]", glow: "hover:shadow-[0_0_30px_rgba(255,68,68,0.08)]" },
};

export function Platform() {
  return (
    <section id="platform" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            Platform
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            One platform.
            <br />
            <span className="text-gradient-accent">Complete security intelligence.</span>
          </h2>
        </motion.div>

        {/* Feature grid — 6 large cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platformFeatures.map((feature, i) => {
            const colors = colorMap[feature.color];
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`group relative p-8 rounded-2xl border ${colors.border} bg-surface hover:bg-surface-2 transition-all duration-300 ${colors.glow}`}
              >
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${colors.bg} ${colors.text}`}
                >
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-3 text-base text-muted-2 leading-relaxed">
                  {feature.oneLiner}
                </p>
                <div className={`mt-5 inline-flex items-center gap-1.5 text-sm font-medium ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
