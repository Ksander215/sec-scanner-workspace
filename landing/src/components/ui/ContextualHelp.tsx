"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  X,
  ChevronDown,
  ArrowRight,
  Lightbulb,
  Target,
  Gift,
} from "lucide-react";

/* ─── Section help definitions ─────────────────────────────────────────── */

interface SectionHelp {
  section: string;
  titleKey: string;
  whatKey: string;
  whyKey: string;
  resultKey: string;
  nextKey: string;
  nextHref: string;
}

const SECTION_HELP: SectionHelp[] = [
  {
    section: "dashboard",
    titleKey: "help.dashboard.title",
    whatKey: "help.dashboard.what",
    whyKey: "help.dashboard.why",
    resultKey: "help.dashboard.result",
    nextKey: "help.dashboard.next",
    nextHref: "/app/scanner",
  },
  {
    section: "scanner",
    titleKey: "help.scanner.title",
    whatKey: "help.scanner.what",
    whyKey: "help.scanner.why",
    resultKey: "help.scanner.result",
    nextKey: "help.scanner.next",
    nextHref: "/app/findings",
  },
  {
    section: "findings",
    titleKey: "help.findings.title",
    whatKey: "help.findings.what",
    whyKey: "help.findings.why",
    resultKey: "help.findings.result",
    nextKey: "help.findings.next",
    nextHref: "/app/risks",
  },
  {
    section: "risks",
    titleKey: "help.risks.title",
    whatKey: "help.risks.what",
    whyKey: "help.risks.why",
    resultKey: "help.risks.result",
    nextKey: "help.risks.next",
    nextHref: "/app/reports",
  },
  {
    section: "reports",
    titleKey: "help.reports.title",
    whatKey: "help.reports.what",
    whyKey: "help.reports.why",
    resultKey: "help.reports.result",
    nextKey: "help.reports.next",
    nextHref: "/app/marketplace",
  },
  {
    section: "marketplace",
    titleKey: "help.marketplace.title",
    whatKey: "help.marketplace.what",
    whyKey: "help.marketplace.why",
    resultKey: "help.marketplace.result",
    nextKey: "help.marketplace.next",
    nextHref: "/app/integrations",
  },
  {
    section: "integrations",
    titleKey: "help.integrations.title",
    whatKey: "help.integrations.what",
    whyKey: "help.integrations.why",
    resultKey: "help.integrations.result",
    nextKey: "help.integrations.next",
    nextHref: "/app/repositories",
  },
  {
    section: "repositories",
    titleKey: "help.repositories.title",
    whatKey: "help.repositories.what",
    whyKey: "help.repositories.why",
    resultKey: "help.repositories.result",
    nextKey: "help.repositories.next",
    nextHref: "/app/scanner",
  },
  {
    section: "architecture",
    titleKey: "help.architecture.title",
    whatKey: "help.architecture.what",
    whyKey: "help.architecture.why",
    resultKey: "help.architecture.result",
    nextKey: "help.architecture.next",
    nextHref: "/app/demo/knowledge-graph",
  },
  {
    section: "projects",
    titleKey: "help.projects.title",
    whatKey: "help.projects.what",
    whyKey: "help.projects.why",
    resultKey: "help.projects.result",
    nextKey: "help.projects.next",
    nextHref: "/app/scanner",
  },
  {
    section: "knowledge-graph",
    titleKey: "help.knowledgeGraph.title",
    whatKey: "help.knowledgeGraph.what",
    whyKey: "help.knowledgeGraph.why",
    resultKey: "help.knowledgeGraph.result",
    nextKey: "help.knowledgeGraph.next",
    nextHref: "/app/demo/attack-paths",
  },
  {
    section: "attack-paths",
    titleKey: "help.attackPaths.title",
    whatKey: "help.attackPaths.what",
    whyKey: "help.attackPaths.why",
    resultKey: "help.attackPaths.result",
    nextKey: "help.attackPaths.next",
    nextHref: "/app/risks",
  },
  {
    section: "workspace",
    titleKey: "help.workspace.title",
    whatKey: "help.workspace.what",
    whyKey: "help.workspace.why",
    resultKey: "help.workspace.result",
    nextKey: "help.workspace.next",
    nextHref: "/app/reports",
  },
];

/* ─── Component ────────────────────────────────────────────────────────── */

interface ContextualHelpProps {
  section: string;
}

export function ContextualHelp({ section }: ContextualHelpProps) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  const help = SECTION_HELP.find(
    (h) => h.section === section
  );
  if (!help) return null;

  const sections = [
    { icon: <Lightbulb className="w-4 h-4" />, labelKey: "help.label.what", contentKey: help.whatKey },
    { icon: <Target className="w-4 h-4" />, labelKey: "help.label.why", contentKey: help.whyKey },
    { icon: <Gift className="w-4 h-4" />, labelKey: "help.label.result", contentKey: help.resultKey },
  ];

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        {t("help.button")}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Help panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 dark:bg-violet-500/10 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-violet-500" />
                  {t(help.titleKey)}
                </h4>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {sections.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center flex-shrink-0 text-violet-600 dark:text-violet-400">
                      {s.icon}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-0.5">
                        {t(s.labelKey)}
                      </div>
                      <div className="text-sm text-foreground">
                        {t(s.contentKey)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Next step */}
              <div className="mt-4 pt-3 border-t border-violet-500/10">
                <button
                  onClick={() => {
                    window.location.href = help.nextHref;
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                  {t(help.nextKey)}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
