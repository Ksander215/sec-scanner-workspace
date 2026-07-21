"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  HelpCircle,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Navigation,
  X,
  Clock,
} from "lucide-react";
import Link from "next/link";

/* ─── Types ────────────────────────────────────────────────────────────── */

interface DiscoveredSection {
  id: string;
  label: string;
}

/* ─── Page-level navigation meta (minimal — sections are auto-discovered) */

interface PageNavMeta {
  route: string;
  excluded?: boolean;
  nextStep?: { labelKey: string; href: string };
  completionKey?: string;
  /** Per-section assistant hints (section id → hint keys) */
  sectionHints?: Record<string, { questionKey: string; actionKeyKey: string }>;
}

const PAGE_META: PageNavMeta[] = [
  // ─── Excluded pages (no navigation needed) ────────────────────────
  { route: "/app/dashboard", excluded: true },
  { route: "/app/settings", excluded: true },
  { route: "/app/api-keys", excluded: true },
  { route: "/app/marketplace", excluded: true },
  { route: "/app/login", excluded: true },
  { route: "/app/register", excluded: true },

  // ─── Active pages ──────────────────────────────────────────────────
  {
    route: "/app/scanner",
    nextStep: { labelKey: "scroll.next.findings", href: "/app/findings" },
    completionKey: "scroll.completion.scanner",
    sectionHints: {
      "scanner-source": { questionKey: "scroll.hint.scannerSource", actionKeyKey: "scroll.hint.explain" },
      "scanner-tools": { questionKey: "scroll.hint.scannerTools", actionKeyKey: "scroll.hint.explain" },
      "scanner-results": { questionKey: "scroll.hint.scannerResults", actionKeyKey: "scroll.hint.explain" },
    },
  },
  {
    route: "/app/findings",
    nextStep: { labelKey: "scroll.next.risks", href: "/app/risks" },
    completionKey: "scroll.completion.findings",
    sectionHints: {
      "findings-list": { questionKey: "scroll.hint.findingsList", actionKeyKey: "scroll.hint.explain" },
    },
  },
  {
    route: "/app/risks",
    nextStep: { labelKey: "scroll.next.reports", href: "/app/reports" },
    completionKey: "scroll.completion.risks",
  },
  {
    route: "/app/reports",
    nextStep: { labelKey: "scroll.next.scan", href: "/app/scanner" },
    completionKey: "scroll.completion.reports",
  },
  {
    route: "/app/repositories",
    nextStep: { labelKey: "scroll.next.scanRepo", href: "/app/scanner" },
    completionKey: "scroll.completion.repos",
  },
  {
    route: "/app/integrations",
    nextStep: { labelKey: "scroll.next.repos", href: "/app/repositories" },
    completionKey: "scroll.completion.integrations",
    sectionHints: {
      "integrations-tabs": { questionKey: "scroll.hint.integrationsCatalog", actionKeyKey: "scroll.hint.showStep" },
    },
  },
  {
    route: "/app/notifications",
    nextStep: { labelKey: "scroll.next.integrations", href: "/app/integrations" },
    completionKey: "scroll.completion.notifications",
  },
  {
    route: "/app/projects",
    nextStep: { labelKey: "scroll.next.scan", href: "/app/scanner" },
    completionKey: "scroll.completion.projects",
  },
  {
    route: "/app/workspace",
    nextStep: { labelKey: "scroll.next.scan", href: "/app/scanner" },
    completionKey: "scroll.completion.workspace",
  },
  {
    route: "/app/pricing",
    nextStep: { labelKey: "scroll.next.tryFree", href: "/app/scanner" },
    completionKey: "scroll.completion.pricing",
  },
  {
    route: "/app/demo/knowledge-graph",
    nextStep: { labelKey: "scroll.next.attackPaths", href: "/app/demo/attack-paths" },
    completionKey: "scroll.completion.kg",
    sectionHints: {
      "kg-graph": { questionKey: "scroll.hint.kgGraph", actionKeyKey: "scroll.hint.explain" },
    },
  },
  {
    route: "/app/demo/attack-paths",
    nextStep: { labelKey: "scroll.next.risks", href: "/app/risks" },
    completionKey: "scroll.completion.ap",
    sectionHints: {
      "ap-graph": { questionKey: "scroll.hint.apGraph", actionKeyKey: "scroll.hint.explain" },
    },
  },
  {
    route: "/app/architecture",
    nextStep: { labelKey: "scroll.next.kg", href: "/app/demo/knowledge-graph" },
    completionKey: "scroll.completion.arch",
  },
];

/* ─── Component ────────────────────────────────────────────────────────── */

interface SmartScrollNavigatorProps {
  onOpenAssistant?: () => void;
  onSectionChange?: (sectionId: string, sectionLabel: string) => void;
}

export function SmartScrollNavigator({ onOpenAssistant, onSectionChange }: SmartScrollNavigatorProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  // ─── State ───────────────────────────────────────────────────────────
  const [scrollY, setScrollY] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);
  const [sections, setSections] = useState<DiscoveredSection[]>([]);
  const [viewedSections, setViewedSections] = useState<Set<string>>(new Set());
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showIdleHint, setShowIdleHint] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const sectionEnterTimeRef = useRef<number>(0);
  const lastScrollYRef = useRef(0);

  // ─── Page meta ──────────────────────────────────────────────────────
  const pageMeta = useMemo(() => {
    if (!pathname) return null;
    const sorted = [...PAGE_META].sort((a, b) => b.route.length - a.route.length);
    return sorted.find((m) => pathname === m.route || pathname.startsWith(m.route + "/")) ?? null;
  }, [pathname]);

  const isExcluded = pageMeta?.excluded ?? false;

  // ─── Scroll progress (0–1) ──────────────────────────────────────────
  const scrollProgress = useMemo(() => {
    if (pageHeight <= viewportHeight) return 0;
    const maxScroll = pageHeight - viewportHeight;
    return maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;
  }, [scrollY, pageHeight, viewportHeight]);

  // Is page long enough? (>2.5 viewports as per INT-033.1)
  const isLongPage = pageHeight > viewportHeight * 2.5;

  // Has scrolled past 30%?
  const hasScrolledEnough = scrollProgress > 0.3;

  // Near bottom (>92%)?
  const isNearBottom = scrollProgress > 0.92;

  // ─── Auto-discover sections from DOM ────────────────────────────────
  const discoverSections = useCallback(() => {
    if (typeof document === "undefined") return;

    const main = document.querySelector("main");
    if (!main) return;

    const discovered: DiscoveredSection[] = [];

    // Primary: elements with data-scroll-section attribute
    const explicitSections = main.querySelectorAll("[data-scroll-section]");
    if (explicitSections.length >= 2) {
      explicitSections.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const id = htmlEl.id || `scroll-section-${discovered.length}`;
        if (!htmlEl.id) htmlEl.id = id;
        discovered.push({
          id,
          label: htmlEl.getAttribute("data-scroll-section") || id,
        });
      });
    } else {
      // Fallback: h2 and h3 headings with IDs inside main
      const headings = main.querySelectorAll("h2[id], h3[id]");
      headings.forEach((heading) => {
        const htmlEl = heading as HTMLElement;
        const text = htmlEl.textContent?.trim();
        if (!text) return;
        discovered.push({ id: htmlEl.id, label: text });
      });
    }

    setSections(discovered);
  }, []);

  // ─── Measure page ───────────────────────────────────────────────────
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

  // ─── Scroll handler ─────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    if (typeof window === "undefined") return;
    const currentScrollY = window.scrollY;
    setScrollY(currentScrollY);
    lastScrollYRef.current = currentScrollY;
    setIsScrolling(true);

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 150);
  }, []);

  // ─── Setup listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (isExcluded) return;

    // Delay initial discovery to let page render
    const initTimeout = setTimeout(() => {
      measurePage();
      discoverSections();
    }, 300);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", measurePage, { passive: true });

    // Observe DOM changes for dynamic content
    let observer: MutationObserver | null = null;
    if (typeof document !== "undefined") {
      const main = document.querySelector("main");
      if (main) {
        observer = new MutationObserver(() => {
          measurePage();
          discoverSections();
        });
        observer.observe(main, { childList: true, subtree: true });
      }
    }

    return () => {
      clearTimeout(initTimeout);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", measurePage);
      if (observer) observer.disconnect();
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [isExcluded, handleScroll, measurePage, discoverSections]);

  // ─── Navigation visibility (BLOCK 1 — auto-detection) ──────────────
  useEffect(() => {
    if (isExcluded || !isLongPage || sections.length < 2) {
      setNavVisible(false);
      return;
    }
    setNavVisible(hasScrolledEnough);
  }, [isExcluded, isLongPage, hasScrolledEnough, sections.length]);

  // ─── Auto-collapse expanded panel after 2s of no scrolling ──────────
  useEffect(() => {
    if (!navVisible || !navExpanded) return;

    if (!isScrolling) {
      hideTimeoutRef.current = setTimeout(() => setNavExpanded(false), 2000);
    } else {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    }

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [navVisible, navExpanded, isScrolling]);

  // ─── Current section detection ──────────────────────────────────────
  useEffect(() => {
    if (sections.length === 0) return;

    let newCurrentId: string | null = null;
    for (let i = sections.length - 1; i >= 0; i--) {
      try {
        const el = document.getElementById(sections[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= viewportHeight * 0.35) {
            newCurrentId = sections[i].id;
            break;
          }
        }
      } catch {
        // SSR safety
      }
    }

    if (newCurrentId && newCurrentId !== currentSectionId) {
      setCurrentSectionId(newCurrentId);
      sectionEnterTimeRef.current = Date.now();
      setShowIdleHint(false);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

      // Notify parent about section change
      const section = sections.find((s) => s.id === newCurrentId);
      if (section && onSectionChange) {
        onSectionChange(newCurrentId, section.label);
      }

      // Start idle timer for intelligent hint (40 seconds)
      if (pageMeta?.sectionHints?.[newCurrentId]) {
        idleTimeoutRef.current = setTimeout(() => {
          setShowIdleHint(true);
        }, 40000);
      }
    }
  }, [scrollY, sections, viewportHeight, currentSectionId, pageMeta, onSectionChange]);

  // ─── Track viewed sections ──────────────────────────────────────────
  useEffect(() => {
    if (!currentSectionId) return;
    setViewedSections((prev) => {
      if (prev.has(currentSectionId)) return prev;
      return new Set([...prev, currentSectionId]);
    });
  }, [currentSectionId]);

  // ─── Completion detection ───────────────────────────────────────────
  useEffect(() => {
    if (isExcluded || !isLongPage) return;
    const allViewed = sections.length > 0 && sections.every((s) => viewedSections.has(s.id));
    setShowCompletion((scrollProgress > 0.92 || allViewed) && !!pageMeta?.nextStep);
  }, [isExcluded, isLongPage, scrollProgress, sections, viewedSections, pageMeta]);

  // ─── Scroll to section with micro-animation ─────────────────────────
  const scrollToSection = useCallback((id: string) => {
    if (typeof document === "undefined") return;
    try {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setNavExpanded(false);

        // Micro-animation: brief section highlight
        setHighlightedSection(id);
        el.classList.add("scroll-nav-highlight");
        setTimeout(() => {
          el.classList.remove("scroll-nav-highlight");
          setHighlightedSection(null);
        }, 1500);
      }
    } catch {
      // SSR safety
    }
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setNavExpanded(false);
  }, []);

  // ─── Don't render if not applicable ─────────────────────────────────
  if (isExcluded || !isLongPage || sections.length < 2) return null;

  const progressPercent = Math.round(scrollProgress * 100);
  const currentSectionHint = currentSectionId ? pageMeta?.sectionHints?.[currentSectionId] : null;

  return (
    <>
      {/* ─── CSS for section highlight micro-animation ──────────────── */}
      <style>{`
        .scroll-nav-highlight {
          animation: scrollNavHighlight 1.5s ease-out;
          border-radius: 12px;
        }
        @keyframes scrollNavHighlight {
          0% { box-shadow: inset 0 0 0 2px rgba(139, 92, 246, 0.4); }
          30% { box-shadow: inset 0 0 0 2px rgba(139, 92, 246, 0.15); background-color: rgba(139, 92, 246, 0.03); }
          100% { box-shadow: none; background-color: transparent; }
        }
      `}</style>

      {/* ─── Progress indicator (right side) ──────────────────────────── */}
      <AnimatePresence>
        {navVisible && sections.length > 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-3 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-1.5"
          >
            {sections.map((section) => {
              const isViewed = viewedSections.has(section.id);
              const isCurrent = section.id === currentSectionId;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="group relative flex items-center"
                  title={section.label}
                >
                  {/* Label tooltip on hover */}
                  <span className="absolute right-6 whitespace-nowrap px-2.5 py-1 rounded-md bg-zinc-800 dark:bg-zinc-700 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none max-w-[220px] truncate shadow-lg">
                    {section.label}
                  </span>
                  {isViewed && !isCurrent ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 transition-transform group-hover:scale-125" />
                  ) : isCurrent ? (
                    <div className="w-3 h-3 rounded-full bg-violet-500 ring-2 ring-violet-500/30 transition-transform group-hover:scale-125" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground/40 transition-transform group-hover:scale-125" />
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

      {/* ─── Compact Navigation FAB (bottom-right) ────────────────────── */}
      <AnimatePresence>
        {navVisible && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-20 right-6 z-50 flex flex-col items-end gap-2"
          >
            {/* Expanded navigation panel */}
            <AnimatePresence>
              {navExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="mb-2 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-border shadow-xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-border bg-surface/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-violet-500" />
                        {t("scroll.navigator")}
                      </span>
                      <button
                        onClick={() => setNavExpanded(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Section list with progress tracking */}
                  <div className="py-1 max-h-[50vh] overflow-y-auto">
                    {sections.map((section) => {
                      const isViewed = viewedSections.has(section.id);
                      const isCurrent = section.id === currentSectionId;
                      return (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                            isCurrent
                              ? "text-violet-600 dark:text-violet-400 bg-violet-500/5"
                              : isViewed
                                ? "text-foreground/80 hover:bg-muted/50"
                                : "text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {isViewed && !isCurrent ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          ) : isCurrent ? (
                            <div className="w-3.5 h-3.5 rounded-full bg-violet-500 ring-2 ring-violet-500/30 flex-shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                          )}
                          <span className="truncate">{section.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Separator */}
                  <div className="border-t border-border" />

                  {/* Actions */}
                  <div className="py-1">
                    {/* ↑ Back to top */}
                    <button
                      onClick={scrollToTop}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <ArrowUp className="w-4 h-4 text-violet-500" />
                      {t("scroll.toTop")}
                    </button>

                    {/* ❓ Your assistant */}
                    {onOpenAssistant && (
                      <button
                        onClick={() => {
                          onOpenAssistant();
                          setNavExpanded(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-500/5 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        {t("scroll.assistant")}
                      </button>
                    )}

                    {/* ➡ Next step */}
                    {pageMeta?.nextStep && (
                      <Link
                        href={pageMeta.nextStep.href}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <ArrowRight className="w-4 h-4 text-emerald-500" />
                        {t(pageMeta.nextStep.labelKey)}
                      </Link>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compact FAB button with circular progress ring */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setNavExpanded(!navExpanded)}
              className={`relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
                navExpanded
                  ? "bg-zinc-700 dark:bg-zinc-600 text-white"
                  : "bg-white dark:bg-zinc-800 border border-border text-foreground hover:shadow-xl"
              }`}
              aria-label={t("scroll.navigator")}
            >
              {/* Circular progress ring */}
              {!navExpanded && (
                <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted/20"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - scrollProgress)}`}
                    strokeLinecap="round"
                    className="text-violet-500 transition-all duration-300"
                  />
                </svg>
              )}
              <span className="relative z-10 text-xs font-bold">
                {navExpanded ? <X className="w-4 h-4" /> : `${progressPercent}%`}
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Intelligent idle hint (40s on a section) ─────────────────── */}
      <AnimatePresence>
        {showIdleHint && currentSectionHint && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className="fixed bottom-20 right-6 z-50 max-w-xs"
          >
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-violet-500/20 shadow-lg shadow-violet-500/5">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-foreground leading-relaxed">
                    {t(currentSectionHint.questionKey)}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => {
                        if (onOpenAssistant) onOpenAssistant();
                        setShowIdleHint(false);
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
                    >
                      {t(currentSectionHint.actionKeyKey)}
                    </button>
                    <button
                      onClick={() => setShowIdleHint(false)}
                      className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t("scroll.hint.later")}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowIdleHint(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── "Остались вопросы?" near bottom ──────────────────────────── */}
      <AnimatePresence>
        {isNearBottom && onOpenAssistant && (
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
              <span className="text-sm font-medium">{t("scroll.assistantQuestion")}</span>
              <span className="text-sm text-white/80">&rarr;</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Business completion message ──────────────────────────────── */}
      <AnimatePresence>
        {showCompletion && pageMeta?.nextStep && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-6 z-40 max-w-sm"
          >
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 shadow-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {t("scroll.allViewed")}
                  </div>
                  <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 leading-relaxed">
                    {pageMeta.completionKey ? t(pageMeta.completionKey) : t("scroll.completionMessage")}
                  </div>
                  <Link
                    href={pageMeta.nextStep.href}
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {t(pageMeta.nextStep.labelKey)}
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
