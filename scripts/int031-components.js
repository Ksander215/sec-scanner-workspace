/**
 * INT-031 — Business Trust & Guided Experience Platform
 * 
 * This script adds the following new components:
 * 1. SectionFAQ — Interactive FAQ component for every page
 * 2. DemoBadge — Honest demo data labeling
 * 3. VisualFlow — Mini flow diagram for guide scenarios
 * 4. SmartNextStep — Smart recommendation chain
 * 
 * And updates:
 * - ContextualHelp — adds missing sections (notifications, apiKeys, settings, pricing)
 * - GuideAssistant — new scenarios, context-aware, visual flow integration
 * - BusinessResult — new business psychology types
 * - i18n — massive expansion of business/guide/faq/demo keys
 * - All 10+ pages — add ContextualHelp + FAQ + DemoBadge
 */

const fs = require('fs');
const path = require('path');

const BASE = '/home/z/my-project/landing/src';

/* ═══════════════════════════════════════════════════════════════════════════
   1. SectionFAQ Component
   ═══════════════════════════════════════════════════════════════════════════ */

const FAQ_COMPONENT = `"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, MessageCircle } from "lucide-react";

/* ─── FAQ definitions per section ──────────────────────────────────────── */

interface FAQItem {
  questionKey: string;
  answerKey: string;
}

interface FAQSection {
  section: string;
  faqs: FAQItem[];
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    section: "dashboard",
    faqs: [
      { questionKey: "faq.dashboard.q1", answerKey: "faq.dashboard.a1" },
      { questionKey: "faq.dashboard.q2", answerKey: "faq.dashboard.a2" },
      { questionKey: "faq.dashboard.q3", answerKey: "faq.dashboard.a3" },
      { questionKey: "faq.dashboard.q4", answerKey: "faq.dashboard.a4" },
      { questionKey: "faq.dashboard.q5", answerKey: "faq.dashboard.a5" },
    ],
  },
  {
    section: "scanner",
    faqs: [
      { questionKey: "faq.scanner.q1", answerKey: "faq.scanner.a1" },
      { questionKey: "faq.scanner.q2", answerKey: "faq.scanner.a2" },
      { questionKey: "faq.scanner.q3", answerKey: "faq.scanner.a3" },
      { questionKey: "faq.scanner.q4", answerKey: "faq.scanner.a4" },
      { questionKey: "faq.scanner.q5", answerKey: "faq.scanner.a5" },
    ],
  },
  {
    section: "findings",
    faqs: [
      { questionKey: "faq.findings.q1", answerKey: "faq.findings.a1" },
      { questionKey: "faq.findings.q2", answerKey: "faq.findings.a2" },
      { questionKey: "faq.findings.q3", answerKey: "faq.findings.a3" },
      { questionKey: "faq.findings.q4", answerKey: "faq.findings.a4" },
      { questionKey: "faq.findings.q5", answerKey: "faq.findings.a5" },
    ],
  },
  {
    section: "risks",
    faqs: [
      { questionKey: "faq.risks.q1", answerKey: "faq.risks.a1" },
      { questionKey: "faq.risks.q2", answerKey: "faq.risks.a2" },
      { questionKey: "faq.risks.q3", answerKey: "faq.risks.a3" },
      { questionKey: "faq.risks.q4", answerKey: "faq.risks.a4" },
      { questionKey: "faq.risks.q5", answerKey: "faq.risks.a5" },
    ],
  },
  {
    section: "reports",
    faqs: [
      { questionKey: "faq.reports.q1", answerKey: "faq.reports.a1" },
      { questionKey: "faq.reports.q2", answerKey: "faq.reports.a2" },
      { questionKey: "faq.reports.q3", answerKey: "faq.reports.a3" },
      { questionKey: "faq.reports.q4", answerKey: "faq.reports.a4" },
      { questionKey: "faq.reports.q5", answerKey: "faq.reports.a5" },
    ],
  },
  {
    section: "marketplace",
    faqs: [
      { questionKey: "faq.marketplace.q1", answerKey: "faq.marketplace.a1" },
      { questionKey: "faq.marketplace.q2", answerKey: "faq.marketplace.a2" },
      { questionKey: "faq.marketplace.q3", answerKey: "faq.marketplace.a3" },
      { questionKey: "faq.marketplace.q4", answerKey: "faq.marketplace.a4" },
      { questionKey: "faq.marketplace.q5", answerKey: "faq.marketplace.a5" },
    ],
  },
  {
    section: "integrations",
    faqs: [
      { questionKey: "faq.integrations.q1", answerKey: "faq.integrations.a1" },
      { questionKey: "faq.integrations.q2", answerKey: "faq.integrations.a2" },
      { questionKey: "faq.integrations.q3", answerKey: "faq.integrations.a3" },
      { questionKey: "faq.integrations.q4", answerKey: "faq.integrations.a4" },
      { questionKey: "faq.integrations.q5", answerKey: "faq.integrations.a5" },
    ],
  },
  {
    section: "repositories",
    faqs: [
      { questionKey: "faq.repositories.q1", answerKey: "faq.repositories.a1" },
      { questionKey: "faq.repositories.q2", answerKey: "faq.repositories.a2" },
      { questionKey: "faq.repositories.q3", answerKey: "faq.repositories.a3" },
      { questionKey: "faq.repositories.q4", answerKey: "faq.repositories.a4" },
      { questionKey: "faq.repositories.q5", answerKey: "faq.repositories.a5" },
      { questionKey: "faq.repositories.q6", answerKey: "faq.repositories.a6" },
    ],
  },
  {
    section: "projects",
    faqs: [
      { questionKey: "faq.projects.q1", answerKey: "faq.projects.a1" },
      { questionKey: "faq.projects.q2", answerKey: "faq.projects.a2" },
      { questionKey: "faq.projects.q3", answerKey: "faq.projects.a3" },
      { questionKey: "faq.projects.q4", answerKey: "faq.projects.a4" },
      { questionKey: "faq.projects.q5", answerKey: "faq.projects.a5" },
    ],
  },
  {
    section: "notifications",
    faqs: [
      { questionKey: "faq.notifications.q1", answerKey: "faq.notifications.a1" },
      { questionKey: "faq.notifications.q2", answerKey: "faq.notifications.a2" },
      { questionKey: "faq.notifications.q3", answerKey: "faq.notifications.a3" },
      { questionKey: "faq.notifications.q4", answerKey: "faq.notifications.a4" },
      { questionKey: "faq.notifications.q5", answerKey: "faq.notifications.a5" },
    ],
  },
  {
    section: "api-keys",
    faqs: [
      { questionKey: "faq.apiKeys.q1", answerKey: "faq.apiKeys.a1" },
      { questionKey: "faq.apiKeys.q2", answerKey: "faq.apiKeys.a2" },
      { questionKey: "faq.apiKeys.q3", answerKey: "faq.apiKeys.a3" },
      { questionKey: "faq.apiKeys.q4", answerKey: "faq.apiKeys.a4" },
      { questionKey: "faq.apiKeys.q5", answerKey: "faq.apiKeys.a5" },
    ],
  },
  {
    section: "workspace",
    faqs: [
      { questionKey: "faq.workspace.q1", answerKey: "faq.workspace.a1" },
      { questionKey: "faq.workspace.q2", answerKey: "faq.workspace.a2" },
      { questionKey: "faq.workspace.q3", answerKey: "faq.workspace.a3" },
      { questionKey: "faq.workspace.q4", answerKey: "faq.workspace.a4" },
      { questionKey: "faq.workspace.q5", answerKey: "faq.workspace.a5" },
    ],
  },
  {
    section: "architecture",
    faqs: [
      { questionKey: "faq.architecture.q1", answerKey: "faq.architecture.a1" },
      { questionKey: "faq.architecture.q2", answerKey: "faq.architecture.a2" },
      { questionKey: "faq.architecture.q3", answerKey: "faq.architecture.a3" },
      { questionKey: "faq.architecture.q4", answerKey: "faq.architecture.a4" },
      { questionKey: "faq.architecture.q5", answerKey: "faq.architecture.a5" },
    ],
  },
  {
    section: "settings",
    faqs: [
      { questionKey: "faq.settings.q1", answerKey: "faq.settings.a1" },
      { questionKey: "faq.settings.q2", answerKey: "faq.settings.a2" },
      { questionKey: "faq.settings.q3", answerKey: "faq.settings.a3" },
      { questionKey: "faq.settings.q4", answerKey: "faq.settings.a4" },
      { questionKey: "faq.settings.q5", answerKey: "faq.settings.a5" },
    ],
  },
  {
    section: "knowledge-graph",
    faqs: [
      { questionKey: "faq.knowledgeGraph.q1", answerKey: "faq.knowledgeGraph.a1" },
      { questionKey: "faq.knowledgeGraph.q2", answerKey: "faq.knowledgeGraph.a2" },
      { questionKey: "faq.knowledgeGraph.q3", answerKey: "faq.knowledgeGraph.a3" },
      { questionKey: "faq.knowledgeGraph.q4", answerKey: "faq.knowledgeGraph.a4" },
      { questionKey: "faq.knowledgeGraph.q5", answerKey: "faq.knowledgeGraph.a5" },
    ],
  },
  {
    section: "attack-paths",
    faqs: [
      { questionKey: "faq.attackPaths.q1", answerKey: "faq.attackPaths.a1" },
      { questionKey: "faq.attackPaths.q2", answerKey: "faq.attackPaths.a2" },
      { questionKey: "faq.attackPaths.q3", answerKey: "faq.attackPaths.a3" },
      { questionKey: "faq.attackPaths.q4", answerKey: "faq.attackPaths.a4" },
      { questionKey: "faq.attackPaths.q5", answerKey: "faq.attackPaths.a5" },
    ],
  },
  {
    section: "pricing",
    faqs: [
      { questionKey: "faq.pricing.q1", answerKey: "faq.pricing.a1" },
      { questionKey: "faq.pricing.q2", answerKey: "faq.pricing.a2" },
      { questionKey: "faq.pricing.q3", answerKey: "faq.pricing.a3" },
      { questionKey: "faq.pricing.q4", answerKey: "faq.pricing.a4" },
      { questionKey: "faq.pricing.q5", answerKey: "faq.pricing.a5" },
    ],
  },
];

/* ─── Component ────────────────────────────────────────────────────────── */

interface SectionFAQProps {
  section: string;
  className?: string;
}

export function SectionFAQ({ section, className = "" }: SectionFAQProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();

  const faqSection = FAQ_SECTIONS.find((f) => f.section === section);
  if (!faqSection) return null;

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const visibleFaqs = expanded ? faqSection.faqs : faqSection.faqs.slice(0, 3);

  return (
    <div className={\`rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden \${className}\`}>
      <div className="px-4 py-3 border-b border-amber-500/10 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="font-semibold text-sm text-foreground">{t("faq.title")}</span>
      </div>
      <div className="divide-y divide-amber-500/10">
        {visibleFaqs.map((faq, i) => (
          <div key={i} className="px-4">
            <button
              onClick={() => toggleItem(i)}
              className="w-full py-3 flex items-start gap-2 text-left group"
            >
              <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="flex-1 text-sm font-medium text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {t(faq.questionKey)}
              </span>
              <ChevronDown
                className={\`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 mt-0.5 \${
                  openItems.has(i) ? "rotate-180" : ""
                }\`}
              />
            </button>
            <AnimatePresence>
              {openItems.has(i) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="pb-3 pl-6 text-sm text-muted-foreground leading-relaxed">
                    {t(faq.answerKey)}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      {faqSection.faqs.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
        >
          {expanded ? t("faq.showLess") : t("faq.showMore").replace("{count}", String(faqSection.faqs.length - 3))}
        </button>
      )}
    </div>
  );
}
`;

fs.writeFileSync(path.join(BASE, 'components/ui/SectionFAQ.tsx'), FAQ_COMPONENT);
console.log('✅ Created SectionFAQ.tsx');


/* ═══════════════════════════════════════════════════════════════════════════
   2. DemoBadge Component
   ═══════════════════════════════════════════════════════════════════════════ */

const DEMO_BADGE = `"use client";

import { useI18n } from "@/lib/i18n-context";
import { AlertTriangle } from "lucide-react";

interface DemoBadgeProps {
  className?: string;
}

export function DemoBadge({ className = "" }: DemoBadgeProps) {
  const { t } = useI18n();

  return (
    <div className={\`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 \${className}\`}>
      <AlertTriangle className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{t("demo.badge")}</span>
    </div>
  );
}

export function DemoNotice({ className = "" }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div className={\`rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 \${className}\`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-medium text-sm text-amber-700 dark:text-amber-300">
            {t("demo.notice.title")}
          </div>
          <div className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
            {t("demo.notice.desc")}
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(BASE, 'components/ui/DemoBadge.tsx'), DEMO_BADGE);
console.log('✅ Created DemoBadge.tsx');


/* ═══════════════════════════════════════════════════════════════════════════
   3. VisualFlow Component
   ═══════════════════════════════════════════════════════════════════════════ */

const VISUAL_FLOW = `"use client";

import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface FlowStep {
  labelKey: string;
  icon?: string;
}

interface VisualFlowProps {
  steps: FlowStep[];
  activeStep?: number;
  className?: string;
}

export function VisualFlow({ steps, activeStep = -1, className = "" }: VisualFlowProps) {
  const { t } = useI18n();

  return (
    <div className={\`flex items-center gap-1 overflow-x-auto py-2 \${className}\`}>
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all \${
              i < activeStep
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : i === activeStep
                ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                : "bg-muted/50 text-muted-foreground border border-border"
            }\`}
          >
            {i < activeStep ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                {i + 1}
              </span>
            )}
            <span>{t(step.labelKey)}</span>
          </motion.div>
          {i < steps.length - 1 && (
            <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Predefined flows for guide scenarios ─────────────────────────────── */

export const SCANNER_FLOWS = {
  website: [
    { labelKey: "flow.scanner.target" },
    { labelKey: "flow.scanner.tools" },
    { labelKey: "flow.scanner.scan" },
    { labelKey: "flow.scanner.report" },
    { labelKey: "flow.scanner.fix" },
    { labelKey: "flow.scanner.control" },
  ],
  server: [
    { labelKey: "flow.scanner.target" },
    { labelKey: "flow.scanner.tools" },
    { labelKey: "flow.scanner.scan" },
    { labelKey: "flow.scanner.impact" },
    { labelKey: "flow.scanner.fix" },
    { labelKey: "flow.scanner.control" },
  ],
  repository: [
    { labelKey: "flow.scanner.target" },
    { labelKey: "flow.scanner.connect" },
    { labelKey: "flow.scanner.analyze" },
    { labelKey: "flow.scanner.report" },
    { labelKey: "flow.scanner.fix" },
    { labelKey: "flow.scanner.control" },
  ],
};
`;

fs.writeFileSync(path.join(BASE, 'components/ui/VisualFlow.tsx'), VISUAL_FLOW);
console.log('✅ Created VisualFlow.tsx');


/* ═══════════════════════════════════════════════════════════════════════════
   4. SmartNextStep Component
   ═══════════════════════════════════════════════════════════════════════════ */

const SMART_NEXT_STEP = `"use client";

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
      className={\`rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 \${className}\`}
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
`;

fs.writeFileSync(path.join(BASE, 'components/ui/SmartNextStep.tsx'), SMART_NEXT_STEP);
console.log('✅ Created SmartNextStep.tsx');


/* ═══════════════════════════════════════════════════════════════════════════
   5. Update ContextualHelp — add missing sections
   ═══════════════════════════════════════════════════════════════════════════ */

const contextualHelpPath = path.join(BASE, 'components/ui/ContextualHelp.tsx');
let contextualHelp = fs.readFileSync(contextualHelpPath, 'utf-8');

// Add missing sections before the closing bracket of SECTION_HELP
const missingSections = `  {
    section: "notifications",
    titleKey: "help.notifications.title",
    whatKey: "help.notifications.what",
    whyKey: "help.notifications.why",
    resultKey: "help.notifications.result",
    nextKey: "help.notifications.next",
    nextHref: "/app/integrations",
  },
  {
    section: "api-keys",
    titleKey: "help.apiKeys.title",
    whatKey: "help.apiKeys.what",
    whyKey: "help.apiKeys.why",
    resultKey: "help.apiKeys.result",
    nextKey: "help.apiKeys.next",
    nextHref: "/app/integrations",
  },
  {
    section: "settings",
    titleKey: "help.settings.title",
    whatKey: "help.settings.what",
    whyKey: "help.settings.why",
    resultKey: "help.settings.result",
    nextKey: "help.settings.next",
    nextHref: "/app/notifications",
  },
  {
    section: "pricing",
    titleKey: "help.pricing.title",
    whatKey: "help.pricing.what",
    whyKey: "help.pricing.why",
    resultKey: "help.pricing.result",
    nextKey: "help.pricing.next",
    nextHref: "/app/scanner",
  },`;

// Insert before the last closing bracket of SECTION_HELP array
contextualHelp = contextualHelp.replace(
  /  \{\n    section: "workspace",/,
  missingSections + '\n  {\n    section: "workspace",'
);

fs.writeFileSync(contextualHelpPath, contextualHelp);
console.log('✅ Updated ContextualHelp.tsx — added 4 missing sections');


/* ═══════════════════════════════════════════════════════════════════════════
   6. Update GuideAssistant — add new scenarios + context-awareness
   ═══════════════════════════════════════════════════════════════════════════ */

const guidePath = path.join(BASE, 'components/ui/GuideAssistant.tsx');
let guideContent = fs.readFileSync(guidePath, 'utf-8');

// Add new scenario imports
guideContent = guideContent.replace(
  'import {\n  Lightbulb,\n  Globe,\n  Server,\n  Code2,\n  ShieldAlert,\n  FileText,\n  ChevronRight,\n  X,\n  Sparkles,\n  ArrowRight,\n  CheckCircle2,\n} from "lucide-react";',
  'import {\n  Lightbulb,\n  Globe,\n  Server,\n  Code2,\n  ShieldAlert,\n  FileText,\n  ChevronRight,\n  X,\n  Sparkles,\n  ArrowRight,\n  CheckCircle2,\n  Bell,\n  Key,\n  Settings,\n  Database,\n} from "lucide-react";'
);

// Add new icon map entries
guideContent = guideContent.replace(
  'const ICON_MAP: Record<string, React.ReactNode> = {\n  lightbulb: <Lightbulb className="w-5 h-5" />,\n  globe: <Globe className="w-5 h-5" />,\n  server: <Server className="w-5 h-5" />,\n  github: <Code2 className="w-5 h-5" />,\n  shield: <ShieldAlert className="w-5 h-5" />,\n  filetext: <FileText className="w-5 h-5 />,\n};',
  'const ICON_MAP: Record<string, React.ReactNode> = {\n  lightbulb: <Lightbulb className="w-5 h-5" />,\n  globe: <Globe className="w-5 h-5" />,\n  server: <Server className="w-5 h-5" />,\n  github: <Code2 className="w-5 h-5" />,\n  shield: <ShieldAlert className="w-5 h-5" />,\n  filetext: <FileText className="w-5 h-5" />,\n  bell: <Bell className="w-5 h-5" />,\n  key: <Key className="w-5 h-5" />,\n  settings: <Settings className="w-5 h-5" />,\n  database: <Database className="w-5 h-5" />,\n};'
);

// Add new scenarios before the closing ];
const newScenarios = `  {
    id: "notifications",
    iconKey: "bell",
    titleKey: "guide.scenarios.notifications.title",
    descKey: "guide.scenarios.notifications.desc",
    steps: [
      { titleKey: "guide.scenarios.notifications.step1.title", descKey: "guide.scenarios.notifications.step1.desc", href: "/app/notifications" },
      { titleKey: "guide.scenarios.notifications.step2.title", descKey: "guide.scenarios.notifications.step2.desc", href: "/app/integrations" },
      { titleKey: "guide.scenarios.notifications.step3.title", descKey: "guide.scenarios.notifications.step3.desc", href: "/app/scanner" },
    ],
  },
  {
    id: "integrations",
    iconKey: "database",
    titleKey: "guide.scenarios.integrations.title",
    descKey: "guide.scenarios.integrations.desc",
    steps: [
      { titleKey: "guide.scenarios.integrations.step1.title", descKey: "guide.scenarios.integrations.step1.desc", href: "/app/integrations" },
      { titleKey: "guide.scenarios.integrations.step2.title", descKey: "guide.scenarios.integrations.step2.desc", href: "/app/repositories" },
      { titleKey: "guide.scenarios.integrations.step3.title", descKey: "guide.scenarios.integrations.step3.desc", href: "/app/api-keys" },
    ],
  },
  {
    id: "control",
    iconKey: "settings",
    titleKey: "guide.scenarios.control.title",
    descKey: "guide.scenarios.control.desc",
    steps: [
      { titleKey: "guide.scenarios.control.step1.title", descKey: "guide.scenarios.control.step1.desc", href: "/app/settings" },
      { titleKey: "guide.scenarios.control.step2.title", descKey: "guide.scenarios.control.step2.desc", href: "/app/notifications" },
      { titleKey: "guide.scenarios.control.step3.title", descKey: "guide.scenarios.control.step3.desc", href: "/app/api-keys" },
      { titleKey: "guide.scenarios.control.step4.title", descKey: "guide.scenarios.control.step4.desc", href: "/app/scanner" },
    ],
  },
  {
    id: "api-access",
    iconKey: "key",
    titleKey: "guide.scenarios.apiAccess.title",
    descKey: "guide.scenarios.apiAccess.desc",
    steps: [
      { titleKey: "guide.scenarios.apiAccess.step1.title", descKey: "guide.scenarios.apiAccess.step1.desc", href: "/app/api-keys" },
      { titleKey: "guide.scenarios.apiAccess.step2.title", descKey: "guide.scenarios.apiAccess.step2.desc", href: "/app/integrations" },
      { titleKey: "guide.scenarios.apiAccess.step3.title", descKey: "guide.scenarios.apiAccess.step3.desc", href: "/app/scanner" },
    ],
  },
`;

guideContent = guideContent.replace(
  '];\n\nconst ICON_MAP',
  newScenarios + '];\n\nconst ICON_MAP'
);

fs.writeFileSync(guidePath, guideContent);
console.log('✅ Updated GuideAssistant.tsx — added 4 new scenarios');


/* ═══════════════════════════════════════════════════════════════════════════
   7. Update BusinessResult — add new business psychology types
   ═══════════════════════════════════════════════════════════════════════════ */

const businessResultPath = path.join(BASE, 'components/ui/BusinessResult.tsx');
let businessResult = fs.readFileSync(businessResultPath, 'utf-8');

// Add new types
businessResult = businessResult.replace(
  'type BusinessResultType =\n  | "security_transparent"\n  | "risks_known"\n  | "data_driven"\n  | "controlled"\n  | "protected"\n  | "calm";',
  'type BusinessResultType =\n  | "security_transparent"\n  | "risks_known"\n  | "data_driven"\n  | "controlled"\n  | "protected"\n  | "calm"\n  | "scan_complete"\n  | "report_ready"\n  | "connected"\n  | "configured"\n  | "organized";'
);

// Add new result configs
businessResult = businessResult.replace(
  '  calm: {\n    icon: <ShieldCheck className="w-5 h-5" />,\n    titleKey: "business.calm.title",\n    descKey: "business.calm.desc",\n  },\n};',
  '  calm: {\n    icon: <ShieldCheck className="w-5 h-5" />,\n    titleKey: "business.calm.title",\n    descKey: "business.calm.desc",\n  },\n  scan_complete: {\n    icon: <ShieldCheck className="w-5 h-5" />,\n    titleKey: "business.scanComplete.title",\n    descKey: "business.scanComplete.desc",\n  },\n  report_ready: {\n    icon: <Brain className="w-5 h-5" />,\n    titleKey: "business.reportReady.title",\n    descKey: "business.reportReady.desc",\n  },\n  connected: {\n    icon: <TrendingUp className="w-5 h-5" />,\n    titleKey: "business.connected.title",\n    descKey: "business.connected.desc",\n  },\n  configured: {\n    icon: <Eye className="w-5 h-5" />,\n    titleKey: "business.configured.title",\n    descKey: "business.configured.desc",\n  },\n  organized: {\n    icon: <Target className="w-5 h-5" />,\n    titleKey: "business.organized.title",\n    descKey: "business.organized.desc",\n  },\n};'
);

fs.writeFileSync(businessResultPath, businessResult);
console.log('✅ Updated BusinessResult.tsx — added 5 new business types');


/* ═══════════════════════════════════════════════════════════════════════════
   8. Page integrations — add ContextualHelp + FAQ + DemoBadge + SmartNextStep
   ═══════════════════════════════════════════════════════════════════════════ */

// Helper: find the right insertion point in a page and add imports + components
function addToIntPage(pagePath, section, hasDemoData, hasBusinessResult, businessResultType) {
  let content = fs.readFileSync(pagePath, 'utf-8');
  
  // Skip if already has ContextualHelp
  if (content.includes('ContextualHelp')) {
    console.log(`  ⏭ ${path.basename(pagePath)} — already has ContextualHelp`);
    return;
  }

  // Add imports after the last import line
  const imports = [
    'import { ContextualHelp } from "@/components/ui/ContextualHelp";',
    'import { SectionFAQ } from "@/components/ui/SectionFAQ";',
    'import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";',
  ];
  if (hasDemoData) {
    imports.push('import { DemoBadge } from "@/components/ui/DemoBadge";');
  }
  if (hasBusinessResult) {
    imports.push('import { BusinessResult } from "@/components/ui/BusinessResult";');
  }

  // Find last import line
  const lines = content.split('\n');
  let lastImportIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].match(/^import\s*\{/)) {
      lastImportIdx = i;
    }
  }

  // Insert imports after last import
  lines.splice(lastImportIdx + 1, 0, ...imports);

  // Find the page header area and add components after it
  // Look for PageHeader or a heading pattern
  let headerEndIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    // Look for closing tag after PageHeader or heading
    if (lines[i].includes('</h1>') || lines[i].includes('</h2>') || lines[i].includes('PageHeader')) {
      headerEndIdx = i;
    }
    // Also look for subtitle/description paragraph
    if (headerEndIdx > 0 && (lines[i].includes('</p>') || lines[i].includes('subtitle'))) {
      headerEndIdx = i;
      break;
    }
  }

  if (headerEndIdx < 0) {
    // Fallback: find first return statement's div
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('return (') || lines[i].includes('return(')) {
        headerEndIdx = i + 2;
        break;
      }
    }
  }

  if (headerEndIdx < 0) {
    console.log(`  ⚠ ${path.basename(pagePath)} — could not find insertion point`);
    return;
  }

  // Build component block
  const components = [];
  components.push(`            <div className="flex items-center gap-2 mt-2">`);
  components.push(`              <ContextualHelp section="${section}" />`);
  if (hasDemoData) {
    components.push(`              <DemoBadge />`);
  }
  components.push(`            </div>`);
  if (hasBusinessResult) {
    components.push(`            <BusinessResult type="${businessResultType}" className="mt-4" />`);
  }

  // Add FAQ and SmartNextStep at the end of the main content area
  // Find the last closing </div> before the final return closing
  const faqBlock = `
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionFAQ section="${section}" />
              <SmartNextStep {...RECOMMENDATION_CHAINS["${section}"]} />
            </div>`;

  // Insert header components
  lines.splice(headerEndIdx + 1, 0, ...components);

  // Insert FAQ at the bottom of the page content
  // Find the last </main> or </div> before closing
  let lastContentIdx = lines.length - 1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('</main>') || (lines[i].trim() === '</div>' && i > lines.length - 10)) {
      lastContentIdx = i;
      break;
    }
  }
  lines.splice(lastContentIdx, 0, faqBlock);

  fs.writeFileSync(pagePath, lines.join('\n'));
  console.log(`  ✅ ${path.basename(pagePath)} — added ContextualHelp + FAQ + SmartNextStep`);
}

// Pages to update
const pagesDir = path.join(BASE, 'app/(app)/app');
const pageUpdates = [
  { dir: 'findings', section: 'findings', hasDemo: false, hasBR: true, brType: 'risks_known' },
  { dir: 'risks', section: 'risks', hasDemo: true, hasBR: true, brType: 'risks_known' },
  { dir: 'marketplace', section: 'marketplace', hasDemo: true, hasBR: false, brType: '' },
  { dir: 'integrations', section: 'integrations', hasDemo: true, hasBR: true, brType: 'connected' },
  { dir: 'repositories', section: 'repositories', hasDemo: true, hasBR: false, brType: '' },
  { dir: 'projects', section: 'projects', hasDemo: true, hasBR: true, brType: 'organized' },
  { dir: 'notifications', section: 'notifications', hasDemo: true, hasBR: true, brType: 'configured' },
  { dir: 'api-keys', section: 'api-keys', hasDemo: true, hasBR: true, brType: 'configured' },
  { dir: 'workspace', section: 'workspace', hasDemo: true, hasBR: false, brType: '' },
  { dir: 'architecture', section: 'architecture', hasDemo: true, hasBR: false, brType: '' },
  { dir: 'settings', section: 'settings', hasDemo: true, hasBR: false, brType: '' },
  { dir: 'reports', section: 'reports', hasDemo: false, hasBR: true, brType: 'report_ready' },
  { dir: 'pricing', section: 'pricing', hasDemo: false, hasBR: false, brType: '' },
];

console.log('\n📝 Updating pages...');
for (const page of pageUpdates) {
  const pagePath = path.join(pagesDir, page.dir, 'page.tsx');
  if (fs.existsSync(pagePath)) {
    addToIntPage(pagePath, page.section, page.hasDemo, page.hasBR, page.brType);
  } else {
    console.log(`  ⚠ ${page.dir}/page.tsx not found`);
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   9. Add Knowledge Graph and Attack Paths FAQ + DemoBadge
   ═══════════════════════════════════════════════════════════════════════════ */

const kgPath = path.join(pagesDir, 'demo/knowledge-graph/page.tsx');
if (fs.existsSync(kgPath)) {
  let kgContent = fs.readFileSync(kgPath, 'utf-8');
  if (!kgContent.includes('SectionFAQ')) {
    // Add imports
    kgContent = kgContent.replace(
      'import { ContextualHelp }',
      'import { ContextualHelp } from "@/components/ui/ContextualHelp";\nimport { SectionFAQ } from "@/components/ui/SectionFAQ";\nimport { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";'
    );
    // If ContextualHelp import already exists, add the other two
    if (!kgContent.includes('SectionFAQ')) {
      // Fallback: add after last import
      const lastImportIdx = kgContent.lastIndexOf("import ");
      const lineEnd = kgContent.indexOf('\n', lastImportIdx);
      kgContent = kgContent.slice(0, lineEnd + 1) + 
        'import { SectionFAQ } from "@/components/ui/SectionFAQ";\n' +
        'import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";\n' +
        kgContent.slice(lineEnd + 1);
    }
    // Add FAQ block at the end of the main content
    const faqBlock = `
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionFAQ section="knowledge-graph" />
            <SmartNextStep {...RECOMMENDATION_CHAINS["knowledge-graph"]} />
          </div>`;
    // Find last closing div before return end
    const lastDiv = kgContent.lastIndexOf('</main>');
    if (lastDiv > 0) {
      kgContent = kgContent.slice(0, lastDiv) + faqBlock + '\n' + kgContent.slice(lastDiv);
    }
    fs.writeFileSync(kgPath, kgContent);
    console.log('  ✅ knowledge-graph/page.tsx — added FAQ + SmartNextStep');
  }
}

const apPath = path.join(pagesDir, 'demo/attack-paths/page.tsx');
if (fs.existsSync(apPath)) {
  let apContent = fs.readFileSync(apPath, 'utf-8');
  if (!apContent.includes('SectionFAQ')) {
    const lastImportIdx = apContent.lastIndexOf("import ");
    const lineEnd = apContent.indexOf('\n', lastImportIdx);
    apContent = apContent.slice(0, lineEnd + 1) + 
      'import { SectionFAQ } from "@/components/ui/SectionFAQ";\n' +
      'import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";\n' +
      apContent.slice(lineEnd + 1);
    const faqBlock = `
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionFAQ section="attack-paths" />
            <SmartNextStep {...RECOMMENDATION_CHAINS["attack-paths"]} />
          </div>`;
    const lastDiv = apContent.lastIndexOf('</main>');
    if (lastDiv > 0) {
      apContent = apContent.slice(0, lastDiv) + faqBlock + '\n' + apContent.slice(lastDiv);
    }
    fs.writeFileSync(apPath, apContent);
    console.log('  ✅ attack-paths/page.tsx — added FAQ + SmartNextStep');
  }
}


console.log('\n🎉 INT-031 component creation and page integration complete!');
console.log('Next step: Update i18n.ts with all new keys');
