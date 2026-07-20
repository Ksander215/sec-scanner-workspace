"use client";

import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";

interface NextStep {
  labelKey: string;
  href: string;
}

interface SmartNextStepProps {
  titleKey: string;
  steps: NextStep[];
  className?: string;
}

export function SmartNextStep({ titleKey, steps, className = "" }: SmartNextStepProps) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-violet-500" />
        <span className="font-semibold text-sm text-foreground">{t(titleKey)}</span>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <Link
            key={i}
            href={step.href}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-violet-500/10 transition-colors group"
          >
            <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {t(step.labelKey)}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-violet-500 transition-colors" />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Predefined recommendation chains ─────────────────────────────────── */

export const RECOMMENDATION_CHAINS: Record<string, { titleKey: string; steps: NextStep[] }> = {
  dashboard: {
    titleKey: "next.dashboard.title",
    steps: [
      { labelKey: "next.dashboard.step1", href: "/app/scanner" },
      { labelKey: "next.dashboard.step2", href: "/app/findings" },
      { labelKey: "next.dashboard.step3", href: "/app/reports" },
    ],
  },
  scanner: {
    titleKey: "next.scanner.title",
    steps: [
      { labelKey: "next.scanner.step1", href: "/app/findings" },
      { labelKey: "next.scanner.step2", href: "/app/risks" },
      { labelKey: "next.scanner.step3", href: "/app/reports" },
    ],
  },
  findings: {
    titleKey: "next.findings.title",
    steps: [
      { labelKey: "next.findings.step1", href: "/app/risks" },
      { labelKey: "next.findings.step2", href: "/app/demo/knowledge-graph" },
      { labelKey: "next.findings.step3", href: "/app/reports" },
    ],
  },
  risks: {
    titleKey: "next.risks.title",
    steps: [
      { labelKey: "next.risks.step1", href: "/app/reports" },
      { labelKey: "next.risks.step2", href: "/app/demo/attack-paths" },
      { labelKey: "next.risks.step3", href: "/app/scanner" },
    ],
  },
  reports: {
    titleKey: "next.reports.title",
    steps: [
      { labelKey: "next.reports.step1", href: "/app/marketplace" },
      { labelKey: "next.reports.step2", href: "/app/integrations" },
      { labelKey: "next.reports.step3", href: "/app/notifications" },
    ],
  },
  marketplace: {
    titleKey: "next.marketplace.title",
    steps: [
      { labelKey: "next.marketplace.step1", href: "/app/scanner" },
      { labelKey: "next.marketplace.step2", href: "/app/integrations" },
      { labelKey: "next.marketplace.step3", href: "/app/api-keys" },
    ],
  },
  integrations: {
    titleKey: "next.integrations.title",
    steps: [
      { labelKey: "next.integrations.step1", href: "/app/repositories" },
      { labelKey: "next.integrations.step2", href: "/app/notifications" },
      { labelKey: "next.integrations.step3", href: "/app/scanner" },
    ],
  },
  repositories: {
    titleKey: "next.repositories.title",
    steps: [
      { labelKey: "next.repositories.step1", href: "/app/scanner" },
      { labelKey: "next.repositories.step2", href: "/app/api-keys" },
      { labelKey: "next.repositories.step3", href: "/app/notifications" },
    ],
  },
  projects: {
    titleKey: "next.projects.title",
    steps: [
      { labelKey: "next.projects.step1", href: "/app/scanner" },
      { labelKey: "next.projects.step2", href: "/app/findings" },
      { labelKey: "next.projects.step3", href: "/app/reports" },
    ],
  },
  notifications: {
    titleKey: "next.notifications.title",
    steps: [
      { labelKey: "next.notifications.step1", href: "/app/integrations" },
      { labelKey: "next.notifications.step2", href: "/app/api-keys" },
      { labelKey: "next.notifications.step3", href: "/app/scanner" },
    ],
  },
  "api-keys": {
    titleKey: "next.apiKeys.title",
    steps: [
      { labelKey: "next.apiKeys.step1", href: "/app/integrations" },
      { labelKey: "next.apiKeys.step2", href: "/app/scanner" },
      { labelKey: "next.apiKeys.step3", href: "/app/notifications" },
    ],
  },
  workspace: {
    titleKey: "next.workspace.title",
    steps: [
      { labelKey: "next.workspace.step1", href: "/app/scanner" },
      { labelKey: "next.workspace.step2", href: "/app/findings" },
      { labelKey: "next.workspace.step3", href: "/app/reports" },
    ],
  },
  architecture: {
    titleKey: "next.architecture.title",
    steps: [
      { labelKey: "next.architecture.step1", href: "/app/demo/knowledge-graph" },
      { labelKey: "next.architecture.step2", href: "/app/scanner" },
      { labelKey: "next.architecture.step3", href: "/app/reports" },
    ],
  },
  settings: {
    titleKey: "next.settings.title",
    steps: [
      { labelKey: "next.settings.step1", href: "/app/notifications" },
      { labelKey: "next.settings.step2", href: "/app/api-keys" },
      { labelKey: "next.settings.step3", href: "/app/integrations" },
    ],
  },
  "knowledge-graph": {
    titleKey: "next.knowledgeGraph.title",
    steps: [
      { labelKey: "next.knowledgeGraph.step1", href: "/app/demo/attack-paths" },
      { labelKey: "next.knowledgeGraph.step2", href: "/app/risks" },
      { labelKey: "next.knowledgeGraph.step3", href: "/app/reports" },
    ],
  },
  "attack-paths": {
    titleKey: "next.attackPaths.title",
    steps: [
      { labelKey: "next.attackPaths.step1", href: "/app/risks" },
      { labelKey: "next.attackPaths.step2", href: "/app/reports" },
      { labelKey: "next.attackPaths.step3", href: "/app/scanner" },
    ],
  },
  pricing: {
    titleKey: "next.pricing.title",
    steps: [
      { labelKey: "next.pricing.step1", href: "/app/scanner" },
      { labelKey: "next.pricing.step2", href: "/app/dashboard" },
      { labelKey: "next.pricing.step3", href: "/app/reports" },
    ],
  },
};
