"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  MapPin,
  HelpCircle,
  CheckCircle2,
  Circle,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

/* ─── Page section anchor definitions ─────────────────────────────────── */

interface SectionAnchor {
  id: string;
  labelKey: string;
}

interface PageScrollConfig {
  /** Route prefix to match */
  route: string;
  /** Whether smart scroll is enabled on this page */
  enabled: boolean;
  /** Section anchors for this page */
  sections: SectionAnchor[];
  /** Next logical step after viewing this page */
  nextStep?: { labelKey: string; href: string };
  /** Assistant integration question key */
  assistantQuestionKey?: string;
  /** Assistant action label key */
  assistantActionKey?: string;
}

const PAGE_SCROLL_CONFIGS: PageScrollConfig[] = [
  {
    route: "/app/scanner",
    enabled: true,
    sections: [
      { id: "scanner-header", labelKey: "scroll.scanner.project" },
      { id: "scanner-source", labelKey: "scroll.scanner.source" },
      { id: "scanner-tools", labelKey: "scroll.scanner.tools" },
      { id: "scanner-results", labelKey: "scroll.scanner.results" },
      { id: "scanner-next", labelKey: "scroll.scanner.next" },
    ],
    nextStep: { labelKey: "scroll.next.findings", href: "/app/findings" },
    assistantQuestionKey: "scroll.assistant.scanQuestion",
    assistantActionKey: "scroll.assistant.scanAction",
  },
  {
    route: "/app/findings",
    enabled: true,
    sections: [
      { id: "findings-header", labelKey: "scroll.findings.overview" },
      { id: "findings-stats", labelKey: "scroll.findings.stats" },
      { id: "findings-list", labelKey: "scroll.findings.list" },
      { id: "findings-faq", labelKey: "scroll.findings.faq" },
    ],
    nextStep: { labelKey: "scroll.next.risks", href: "/app/risks" },
    assistantQuestionKey: "scroll.assistant.findingsQuestion",
    assistantActionKey: "scroll.assistant.findingsAction",
  },
  {
    route: "/app/risks",
    enabled: true,
    sections: [
      { id: "risks-header", labelKey: "scroll.risks.overview" },
      { id: "risks-list", labelKey: "scroll.risks.list" },
      { id: "risks-faq", labelKey: "scroll.risks.faq" },
    ],
    nextStep: { labelKey: "scroll.next.reports", href: "/app/reports" },
    assistantQuestionKey: "scroll.assistant.risksQuestion",
    assistantActionKey: "scroll.assistant.risksAction",
  },
  {
    route: "/app/reports",
    enabled: true,
    sections: [
      { id: "reports-header", labelKey: "scroll.reports.overview" },
      { id: "reports-list", labelKey: "scroll.reports.list" },
      { id: "reports-faq", labelKey: "scroll.reports.faq" },
    ],
    nextStep: { labelKey: "scroll.next.marketplace", href: "/app/marketplace" },
    assistantQuestionKey: "scroll.assistant.reportsQuestion",
    assistantActionKey: "scroll.assistant.reportsAction",
  },
  {
    route: "/app/repositories",
    enabled: true,
    sections: [
      { id: "repos-header", labelKey: "scroll.repos.overview" },
      { id: "repos-list", labelKey: "scroll.repos.list" },
      { id: "repos-faq", labelKey: "scroll.repos.faq" },
    ],
    nextStep: { labelKey: "scroll.next.scanRepo", href: "/app/scanner" },
    assistantQuestionKey: "scroll.assistant.reposQuestion",
    assistantActionKey: "scroll.assistant.reposAction",
  },
  {
    route: "/app/integrations",
    enabled: true,
    sections: [
      { id: "integrations-header", labelKey: "scroll.integrations.overview" },
      { id: "integrations-tabs", labelKey: "scroll.integrations.catalog" },
      { id: "integrations-faq", labelKey: "scroll.integrations.faq" },
    ],
    nextStep: { labelKey: "scroll.next.repos", href: "/app/repositories" },
    assistantQuestionKey: "scroll.assistant.integrationsQuestion",
    assistantActionKey: "scroll.assistant.integrationsAction",
  },
  {
    route: "/app/notifications",
    enabled: true,
    sections: [
      { id: "notifications-header", labelKey: "scroll.notifications.overview" },
      { id: "notifications-rules", labelKey: "scroll.notifications.rules" },
      { id: "notifications-history", labelKey: "scroll.notifications.history" },
      { id: "notifications-faq", labelKey: "scroll.notifications.faq" },
    ],
    nextStep: { labelKey: "scroll.next.integrations", href: "/app/integrations" },
  },
  {
    route: "/app/projects",
    enabled: true,
    sections: [
      { id: "projects-header", labelKey: "scroll.projects.overview" },
      { id: "projects-list", labelKey: "scroll.projects.list" },
      { id: "projects-faq", labelKey: "scroll.projects.faq" },
    ],
    nextStep: { labelKey: "scroll.next.scan", href: "/app/scanner" },
  },
  {
    route: "/app/workspace",
    enabled: true,
    sections: [
      { id: "workspace-header", labelKey: "scroll.workspace.overview" },
      { id: "workspace-stats", labelKey: "scroll.workspace.stats" },
      { id: "workspace-activity", labelKey: "scroll.workspace.activity" },
      { id: "workspace-actions", labelKey: "scroll.workspace.actions" },
    ],
    nextStep: { labelKey: "scroll.next.scan", href: "/app/scanner" },
  },
  {
    route: "/app/pricing",
    enabled: true,
    sections: [
      { id: "pricing-header", labelKey: "scroll.pricing.overview" },
      { id: "pricing-plans", labelKey: "scroll.pricing.plans" },
      { id: "pricing-comparison", labelKey: "scroll.pricing.comparison" },
      { id: "pricing-faq", labelKey: "scroll.pricing.faq" },
    ],
    nextStep: { labelKey: "scroll.next.tryFree", href: "/app/scanner" },
  },
  {
    route: "/app/demo/knowledge-graph",
    enabled: true,
    sections: [
      { id: "kg-header", labelKey: "scroll.kg.overview" },
      { id: "kg-filters", labelKey: "scroll.kg.filters" },
      { id: "kg-graph", labelKey: "scroll.kg.graph" },
      { id: "kg-faq", labelKey: "scroll.kg.faq" },
    ],
    nextStep: { labelKey: "scroll.next.attackPaths", href: "/app/demo/attack-paths" },
    assistantQuestionKey: "scroll.assistant.kgQuestion",
    assistantActionKey: "scroll.assistant.kgAction",
  },
  {
    route: "/app/demo/attack-paths",
    enabled: true,
    sections: [
      { id: "ap-header", labelKey: "scroll.ap.overview" },
      { id: "ap-paths", labelKey: "scroll.ap.paths" },
      { id: "ap-graph", labelKey: "scroll.ap.graph" },
      { id: "ap-faq", labelKey: "scroll.ap.faq" },
    ],
    nextStep: { labelKey: "scroll.next.risks", href: "/app/risks" },
    assistantQuestionKey: "scroll.assistant.apQuestion",
    assistantActionKey: "scroll.assistant.apAction",
  },
  {
    route: "/app/architecture",
    enabled: true,
    sections: [
      { id: "architecture-header", labelKey: "scroll.arch.overview" },
      { id: "architecture-layers", labelKey: "scroll.arch.layers" },
      { id: "architecture-faq", labelKey: "scroll.arch.faq" },
    ],
    nextStep: { labelKey: "scroll.next.kg", href: "/app/demo/knowledge-graph" },
  },
  // Pages where smart scroll is NOT needed:
  // /app/dashboard, /app/settings, /app/api-keys — short pages
  // /app/login, /app/register — auth pages
];

/* ─── FAB Action types ────────────────────────────────────────────────── */

type FabAction = "top" | "section" | "assistant" | "nextStep";

/* ─── Component ────────────────────────────────────────────────────────── */

interface SmartScrollNavigatorProps {
  /** Callback to open the assistant (GuideAssistant) */
  onOpenAssistant?: () => void;
}

export function SmartScrollNavigator({ onOpenAssistant }: SmartScrollNavigatorProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  // Scroll state
  const [scrollY, setScrollY] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [fabVisible, setFabVisible] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [showQuestionsPrompt, setShowQuestionsPrompt] = useState(false);
  const [showNextStep, setShowNextStep] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  // Find page config
  const pageConfig = useMemo(() => {
    if (!pathname) return null;
    const sorted = [...PAGE_SCROLL_CONFIGS].sort((a, b) => b.route.length - a.route.length);
    return sorted.find((cfg) => pathname === cfg.route || pathname.startsWith(cfg.route + "/")) ?? null;
  }, [pathname]);

  const isEnabled = pageConfig?.enabled ?? false;

  // Scroll progress (0-1)
  const scrollProgress = useMemo(() => {
    if (pageHeight <= viewportHeight) return 0;
    const maxScroll = pageHeight - viewportHeight;
    return maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;
  }, [scrollY, pageHeight, viewportHeight]);

  // Is page long enough (>2 screens)?
  const isLongPage = pageHeight > viewportHeight * 2;

  // Has scrolled past 30%?
  const hasScrolledEnough = scrollProgress > 0.3;

  // Near bottom (>85%)?
  const isNearBottom = scrollProgress > 0.85;

  // Determine current section based on scroll
  const currentSectionIndex = useMemo(() => {
    if (!pageConfig || typeof document === "undefined") return -1;
    for (let i = pageConfig.sections.length - 1; i >= 0; i--) {
      try {
        const el = document.getElementById(pageConfig.sections[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= viewportHeight * 0.4) return i;
        }
      } catch {
        // SSR safety — ignore if document not available
      }
    }
    return 0;
  }, [scrollY, pageConfig, viewportHeight]);

  // Measure page dimensions
  const measurePage = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    try {
      const main = document.querySelector("main") as HTMLElement;
      if (main) {
        mainRef.current = main;
        setPageHeight(main.scrollHeight);
        setViewportHeight(window.innerHeight);
      }
    } catch {
      // SSR safety
    }
  }, []);

  // Scroll handler
  const handleScroll = useCallback(() => {
    if (typeof window === "undefined") return;
    setScrollY(window.scrollY);
    setIsScrolling(true);

    // Clear previous timeout
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    // Set timeout to detect scroll stop
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Set up scroll listener
  useEffect(() => {
    if (!isEnabled) return;

    measurePage();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", measurePage, { passive: true });

    // Also observe DOM changes (for dynamic content)
    let observer: MutationObserver | null = null;
    if (typeof document !== "undefined") {
      observer = new MutationObserver(measurePage);
      const main = document.querySelector("main");
      if (main) observer.observe(main, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", measurePage);
      if (observer) observer.disconnect();
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isEnabled, handleScroll, measurePage]);

  // FAB visibility logic (BLOCK 1 + BLOCK 6)
  useEffect(() => {
    if (!isEnabled || !isLongPage) {
      setFabVisible(false);
      setProgressVisible(false);
      return;
    }

    if (hasScrolledEnough) {
      setFabVisible(true);
      setProgressVisible(true);
    } else {
      setFabVisible(false);
      setProgressVisible(false);
    }
  }, [isEnabled, isLongPage, hasScrolledEnough]);

  // Auto-hide FAB after 2 seconds of no scrolling (BLOCK 6)
  useEffect(() => {
    if (!fabVisible) return;

    if (!isScrolling) {
      hideTimeoutRef.current = setTimeout(() => {
        setFabExpanded(false);
        // Don't hide completely — just make it smaller
      }, 2000);
    } else {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    }

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [fabVisible, isScrolling]);

  // Show "Остались вопросы?" near bottom (BLOCK 7)
  useEffect(() => {
    if (!isEnabled || !isLongPage) return;
    setShowQuestionsPrompt(isNearBottom && !!pageConfig?.assistantQuestionKey);
  }, [isEnabled, isLongPage, isNearBottom, pageConfig]);

  // Show next step after scrolling back to top (BLOCK 8)
  useEffect(() => {
    if (!isEnabled || !isLongPage) return;
    // Show next step when user scrolls back to top after having been further down
    setShowNextStep(scrollProgress < 0.15 && scrollProgress > 0 && !!pageConfig?.nextStep);
  }, [isEnabled, isLongPage, scrollProgress, pageConfig]);

  // Show completion message (BLOCK 9)
  useEffect(() => {
    if (!isEnabled || !isLongPage) return;
    setShowCompletion(scrollProgress > 0.92);
  }, [isEnabled, isLongPage, scrollProgress]);

  // Scroll to element
  const scrollToElement = useCallback((id: string) => {
    if (typeof document === "undefined") return;
    try {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setFabExpanded(false);
      }
    } catch {
      // SSR safety
    }
  }, []);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setFabExpanded(false);
  }, []);

  // Don't render if not enabled
  if (!isEnabled || !isLongPage) return null;

  return (
    <>
      {/* ─── BLOCK 5: Progress indicator (right side) ─────────────── */}
      <AnimatePresence>
        {progressVisible && pageConfig && pageConfig.sections.length > 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5"
          >
            {pageConfig.sections.map((section, i) => {
              const isPast = i < currentSectionIndex;
              const isCurrent = i === currentSectionIndex;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToElement(section.id)}
                  className="group relative flex items-center"
                  title={t(section.labelKey)}
                >
                  {/* Label tooltip on hover */}
                  <span className="absolute right-6 whitespace-nowrap px-2 py-1 rounded-md bg-zinc-800 dark:bg-zinc-700 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {t(section.labelKey)}
                  </span>
                  {isPast ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  ) : isCurrent ? (
                    <div className="w-3 h-3 rounded-full bg-violet-500 ring-2 ring-violet-500/30" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground/40" />
                  )}
                </button>
              );
            })}
            {/* Scroll progress bar */}
            <div className="w-0.5 h-8 bg-muted/30 rounded-full mt-1 overflow-hidden">
              <div
                className="w-full bg-violet-500/60 rounded-full transition-all duration-300"
                style={{ height: `${scrollProgress * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BLOCK 3: Floating Navigation FAB ────────────────────── */}
      <AnimatePresence>
        {fabVisible && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2"
          >
            {/* Expanded actions */}
            <AnimatePresence>
              {fabExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="mb-2 w-56 rounded-xl bg-white dark:bg-zinc-900 border border-border shadow-xl overflow-hidden"
                >
                  {/* Back to top */}
                  <button
                    onClick={scrollToTop}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4 text-violet-500" />
                    {t("scroll.toTop")}
                  </button>

                  {/* Section anchors (BLOCK 4) */}
                  {pageConfig && pageConfig.sections.length > 1 && (
                    <div className="border-t border-border">
                      <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground">
                        {t("scroll.sections")}
                      </div>
                      {pageConfig.sections.map((section, i) => {
                        const isPast = i < currentSectionIndex;
                        const isCurrent = i === currentSectionIndex;
                        return (
                          <button
                            key={section.id}
                            onClick={() => scrollToElement(section.id)}
                            className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                              isCurrent
                                ? "text-violet-600 dark:text-violet-400 bg-violet-500/5"
                                : "text-foreground hover:bg-muted/50"
                            }`}
                          >
                            {isPast ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            {t(section.labelKey)}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Assistant integration (BLOCK 7) */}
                  {pageConfig?.assistantQuestionKey && onOpenAssistant && (
                    <div className="border-t border-border">
                      <button
                        onClick={() => {
                          onOpenAssistant();
                          setFabExpanded(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-500/5 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        {t("scroll.assistant")}
                      </button>
                    </div>
                  )}

                  {/* Next logical step (BLOCK 8) */}
                  {pageConfig?.nextStep && (
                    <div className="border-t border-border">
                      <Link
                        href={pageConfig.nextStep.href}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <ArrowRight className="w-4 h-4 text-emerald-500" />
                        {t(pageConfig.nextStep.labelKey)}
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main FAB button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFabExpanded(!fabExpanded)}
              className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
                fabExpanded
                  ? "bg-zinc-700 dark:bg-zinc-600 text-white"
                  : "bg-white dark:bg-zinc-800 border border-border text-foreground hover:shadow-xl"
              }`}
              aria-label={t("scroll.navigator")}
            >
              {fabExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BLOCK 7: "Остались вопросы?" near bottom ─────────────── */}
      <AnimatePresence>
        {showQuestionsPrompt && pageConfig?.assistantQuestionKey && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <button
              onClick={() => {
                if (onOpenAssistant) onOpenAssistant();
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{t(pageConfig.assistantQuestionKey)}</span>
              <span className="text-sm text-white/80">→</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BLOCK 8: Next logical step after scrolling to top ────── */}
      <AnimatePresence>
        {showNextStep && pageConfig?.nextStep && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                {t("scroll.nextStepTitle")}
              </span>
              <Link
                href={pageConfig.nextStep.href}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                {t(pageConfig.nextStep.labelKey)}
                <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setShowNextStep(false)}
                className="text-xs text-muted-foreground hover:text-foreground ml-1"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BLOCK 9: Business UX completion message ──────────────── */}
      <AnimatePresence>
        {showCompletion && pageConfig?.nextStep && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-40 max-w-xs"
          >
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 shadow-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {t("scroll.allViewed")}
                  </div>
                  <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                    {t("scroll.completionMessage")}
                  </div>
                  <Link
                    href={pageConfig.nextStep.href}
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {t(pageConfig.nextStep.labelKey)}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
