"use client";

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
    <div className={`rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden ${className}`}>
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
                className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 mt-0.5 ${
                  openItems.has(i) ? "rotate-180" : ""
                }`}
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
