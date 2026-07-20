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
import { useI18n } from "@/lib/i18n-context";

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  accent: { bg: "bg-accent-muted", text: "text-accent", border: "border-accent-border", glow: "hover:shadow-[0_0_30px_rgba(0,255,136,0.08)]" },
  cyan: { bg: "bg-cyan-muted", text: "text-cyan", border: "border-[rgba(0,212,255,0.2)]", glow: "hover:shadow-[0_0_30px_rgba(0,212,255,0.08)]" },
  purple: { bg: "bg-purple-muted", text: "text-purple", border: "border-[rgba(168,85,247,0.2)]", glow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.08)]" },
  amber: { bg: "bg-amber-muted", text: "text-amber", border: "border-[rgba(255,184,0,0.2)]", glow: "hover:shadow-[0_0_30px_rgba(255,184,0,0.08)]" },
  red: { bg: "bg-red-muted", text: "text-red", border: "border-[rgba(255,68,68,0.2)]", glow: "hover:shadow-[0_0_30px_rgba(255,68,68,0.08)]" },
};

export function Platform() {
  const { t } = useI18n();

  const platformFeatures = [
    {
      icon: Radar,
      title: t("platform.scanning.title"),
      oneLiner: t("platform.scanning.desc"),
      color: "accent",
      href: "/app/scans",
    },
    {
      icon: Brain,
      title: t("platform.ai.title"),
      oneLiner: t("platform.ai.desc"),
      color: "cyan",
      href: "/app/dashboard",
    },
    {
      icon: Network,
      title: t("platform.graph.title"),
      oneLiner: t("platform.graph.desc"),
      color: "purple",
      href: "/app/demo/knowledge-graph",
    },
    {
      icon: Workflow,
      title: t("platform.workflows.title"),
      oneLiner: t("platform.workflows.desc"),
      color: "amber",
      href: "/app/workspace/pipelines",
    },
    {
      icon: BarChart3,
      title: t("platform.risk.title"),
      oneLiner: t("platform.risk.desc"),
      color: "accent",
      href: "/app/risks",
    },
    {
      icon: Lock,
      title: t("platform.enterprise.title"),
      oneLiner: t("platform.enterprise.desc"),
      color: "red",
      href: "/app/platform",
    },
  ];

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
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {t("platform.subtitle")}
          </h2>
        </motion.div>

        {/* Feature grid — 6 large cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platformFeatures.map((feature, i) => {
            const colors = colorMap[feature.color];
            return (
              <motion.a
                key={feature.title}
                href={feature.href}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`group relative block p-8 rounded-2xl border ${colors.border} bg-surface hover:bg-surface-2 transition-all duration-300 ${colors.glow}`}
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
                  {t("common.learnMore")} <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
