"use client";

import { motion } from "framer-motion";
import {
  Play,
  ArrowRight,
  GitBranch,
  Brain,
  Network,
  ShieldAlert,
  BarChart3,
} from "lucide-react";

const demoFeatures = [
  {
    icon: GitBranch,
    title: "Live Pipeline",
    description: "Watch the 8-stage analysis pipeline run in real time — from Normalize to Report.",
    href: "/demo",
    color: "text-accent",
    bg: "bg-accent-muted",
  },
  {
    icon: Network,
    title: "Knowledge Graph",
    description: "Explore 34 interconnected nodes — hosts, findings, CVEs, and attack paths.",
    href: "/demo/knowledge-graph",
    color: "text-cyan",
    bg: "bg-cyan-muted",
  },
  {
    icon: ShieldAlert,
    title: "Attack Paths",
    description: "Trace 3 attack paths from the internet to your critical assets with MITRE ATT&CK mapping.",
    href: "/demo/attack-paths",
    color: "text-red",
    bg: "bg-red-muted",
  },
  {
    icon: Brain,
    title: "AI Copilot",
    description: "Ask questions in natural language — get reasoning, connections, and remediation plans.",
    href: "/dashboard",
    color: "text-purple",
    bg: "bg-purple-muted",
  },
];

export function DemoPreview() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-surface/30" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-border bg-accent-muted text-accent text-xs font-medium tracking-wide uppercase mb-6">
            <Play className="w-3.5 h-3.5" />
            Try It Live
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            See the Platform <span className="text-gradient-accent">in Action</span>
          </h2>
          <p className="mt-4 text-lg text-muted-2 max-w-2xl mx-auto">
            No signup, no credit card — just open and explore. Understand what the product does, how it differs, and why it matters in under 3 minutes.
          </p>
        </motion.div>

        {/* Demo feature cards */}
        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {demoFeatures.map((feature, i) => (
            <motion.a
              key={feature.title}
              href={feature.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group p-6 rounded-2xl bg-surface border border-border hover:border-border-light transition-all duration-300 hover:bg-surface-2"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center shrink-0`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors flex items-center gap-2">
                    {feature.title}
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-sm text-muted-2 mt-1.5 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <a
            href="/demo"
            className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold bg-accent text-background rounded-xl hover:bg-accent-hover transition-all glow-accent"
          >
            <Play className="w-4 h-4" />
            Launch Demo Workspace
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <div className="mt-4 flex items-center justify-center gap-6">
            <a href="/dashboard" className="text-sm text-muted-2 hover:text-foreground transition-colors flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" /> Dashboard
            </a>
            <a href="/cloud" className="text-sm text-muted-2 hover:text-foreground transition-colors flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Cloud
            </a>
            <a href="/download" className="text-sm text-muted-2 hover:text-foreground transition-colors flex items-center gap-1.5">
              <Play className="w-4 h-4" /> Download
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
