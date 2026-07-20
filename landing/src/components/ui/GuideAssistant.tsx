"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Globe,
  Server,
  Code2,
  ShieldAlert,
  FileText,
  ChevronRight,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Bell,
  Key,
  Settings,
  Database,
} from "lucide-react";

/* ─── Scenario definitions ────────────────────────────────────────────── */

interface Step {
  titleKey: string;
  descKey: string;
  href?: string;
  highlight?: string;
}

interface Scenario {
  id: string;
  iconKey: string;
  titleKey: string;
  descKey: string;
  steps: Step[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "start",
    iconKey: "lightbulb",
    titleKey: "guide.scenarios.start.title",
    descKey: "guide.scenarios.start.desc",
    steps: [
      { titleKey: "guide.scenarios.start.step1.title", descKey: "guide.scenarios.start.step1.desc", href: "/app/scanner" },
      { titleKey: "guide.scenarios.start.step2.title", descKey: "guide.scenarios.start.step2.desc", href: "/app/scanner" },
      { titleKey: "guide.scenarios.start.step3.title", descKey: "guide.scenarios.start.step3.desc", href: "/app/findings" },
      { titleKey: "guide.scenarios.start.step4.title", descKey: "guide.scenarios.start.step4.desc", href: "/app/reports" },
    ],
  },
  {
    id: "website",
    iconKey: "globe",
    titleKey: "guide.scenarios.website.title",
    descKey: "guide.scenarios.website.desc",
    steps: [
      { titleKey: "guide.scenarios.website.step1.title", descKey: "guide.scenarios.website.step1.desc", href: "/app/scanner" },
      { titleKey: "guide.scenarios.website.step2.title", descKey: "guide.scenarios.website.step2.desc", href: "/app/scanner" },
      { titleKey: "guide.scenarios.website.step3.title", descKey: "guide.scenarios.website.step3.desc", href: "/app/findings" },
    ],
  },
  {
    id: "server",
    iconKey: "server",
    titleKey: "guide.scenarios.server.title",
    descKey: "guide.scenarios.server.desc",
    steps: [
      { titleKey: "guide.scenarios.server.step1.title", descKey: "guide.scenarios.server.step1.desc", href: "/app/scanner" },
      { titleKey: "guide.scenarios.server.step2.title", descKey: "guide.scenarios.server.step2.desc", href: "/app/demo/attack-paths" },
      { titleKey: "guide.scenarios.server.step3.title", descKey: "guide.scenarios.server.step3.desc", href: "/app/risks" },
    ],
  },
  {
    id: "github",
    iconKey: "github",
    titleKey: "guide.scenarios.github.title",
    descKey: "guide.scenarios.github.desc",
    steps: [
      { titleKey: "guide.scenarios.github.step1.title", descKey: "guide.scenarios.github.step1.desc", href: "/app/repositories" },
      { titleKey: "guide.scenarios.github.step2.title", descKey: "guide.scenarios.github.step2.desc", href: "/app/repositories" },
      { titleKey: "guide.scenarios.github.step3.title", descKey: "guide.scenarios.github.step3.desc", href: "/app/findings" },
    ],
  },
  {
    id: "risks",
    iconKey: "shield",
    titleKey: "guide.scenarios.risks.title",
    descKey: "guide.scenarios.risks.desc",
    steps: [
      { titleKey: "guide.scenarios.risks.step1.title", descKey: "guide.scenarios.risks.step1.desc", href: "/app/risks" },
      { titleKey: "guide.scenarios.risks.step2.title", descKey: "guide.scenarios.risks.step2.desc", href: "/app/demo/knowledge-graph" },
      { titleKey: "guide.scenarios.risks.step3.title", descKey: "guide.scenarios.risks.step3.desc", href: "/app/reports" },
    ],
  },
  {
    id: "report",
    iconKey: "filetext",
    titleKey: "guide.scenarios.report.title",
    descKey: "guide.scenarios.report.desc",
    steps: [
      { titleKey: "guide.scenarios.report.step1.title", descKey: "guide.scenarios.report.step1.desc", href: "/app/scanner" },
      { titleKey: "guide.scenarios.report.step2.title", descKey: "guide.scenarios.report.step2.desc", href: "/app/reports" },
      { titleKey: "guide.scenarios.report.step3.title", descKey: "guide.scenarios.report.step3.desc", href: "/app/reports" },
    ],
  },
  {
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
];

const ICON_MAP: Record<string, React.ReactNode> = {
  lightbulb: <Lightbulb className="w-5 h-5" />,
  globe: <Globe className="w-5 h-5" />,
  server: <Server className="w-5 h-5" />,
  github: <Code2 className="w-5 h-5" />,
  shield: <ShieldAlert className="w-5 h-5" />,
  filetext: <FileText className="w-5 h-5" />,
};

/* ─── Component ────────────────────────────────────────────────────────── */

export function GuideAssistant() {
  const [open, setOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const pathname = usePathname();
  const { t } = useI18n();

  // Don't show on landing page
  const isAppPage = pathname?.startsWith("/app");

  const handleScenarioSelect = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setActiveStep(0);
    setCompletedSteps(new Set());
  };

  const handleStepComplete = (stepIndex: number) => {
    setCompletedSteps((prev) => new Set(prev).add(stepIndex));
    if (stepIndex < (activeScenario?.steps.length ?? 0) - 1) {
      setActiveStep(stepIndex + 1);
    }
  };

  const handleNavigate = (href?: string) => {
    if (href) {
      window.location.href = href;
    }
  };

  const handleBack = () => {
    setActiveScenario(null);
    setActiveStep(0);
    setCompletedSteps(new Set());
  };

  if (!isAppPage) return null;

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all flex items-center justify-center group"
        aria-label={t("guide.assistantLabel")}
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
      </motion.button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => { setOpen(false); handleBack(); }}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-6 bottom-24 w-[440px] max-h-[80vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-border bg-gradient-to-r from-violet-500/10 to-indigo-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {activeScenario ? t(activeScenario.titleKey) : t("guide.title")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {activeScenario ? t(activeScenario.descKey) : t("guide.subtitle")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setOpen(false); handleBack(); }}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {!activeScenario ? (
                  /* Scenario selection */
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("guide.chooseScenario")}
                    </p>
                    {SCENARIOS.map((scenario) => (
                      <button
                        key={scenario.id}
                        onClick={() => handleScenarioSelect(scenario)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/80 transition-colors text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0">
                          {ICON_MAP[scenario.iconKey]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground">
                            {t(scenario.titleKey)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {t(scenario.descKey)}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Active scenario steps */
                  <div className="space-y-3">
                    <button
                      onClick={handleBack}
                      className="text-sm text-violet-600 dark:text-violet-400 hover:underline mb-2 inline-flex items-center gap-1"
                    >
                      ← {t("guide.backToScenarios")}
                    </button>

                    <div className="space-y-3">
                      {activeScenario.steps.map((step, i) => {
                        const isActive = i === activeStep;
                        const isCompleted = completedSteps.has(i);

                        return (
                          <motion.div
                            key={i}
                            initial={isActive ? { opacity: 0, x: 20 } : undefined}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-4 rounded-xl border transition-all ${
                              isActive
                                ? "border-violet-500/50 bg-violet-500/5 shadow-sm"
                                : isCompleted
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : "border-border bg-muted/30"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                                  isCompleted
                                    ? "bg-emerald-500 text-white"
                                    : isActive
                                    ? "bg-violet-500 text-white"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm text-foreground">
                                  {t(step.titleKey)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {t(step.descKey)}
                                </div>
                                {isActive && step.href && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <button
                                      onClick={() => handleNavigate(step.href)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
                                    >
                                      {t("guide.goToStep")}
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleStepComplete(i)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      {t("guide.markDone")}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Completion message */}
                    {completedSteps.size === activeScenario.steps.length && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center"
                      >
                        <div className="text-2xl mb-2">🎉</div>
                        <div className="font-medium text-emerald-700 dark:text-emerald-300">
                          {t("guide.congrats")}
                        </div>
                        <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                          {t("guide.congratsDesc")}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
