/**
 * AIS — BLOCK 3: Intelligent Guidance
 * BLOCK 13: Trust Builder
 * BLOCK 15: AI Personality
 *
 * Enhanced assistant that proactively appears when needed.
 * Calm professional expert personality.
 * Shows "Что произошло / Почему важно / Что изменилось / Что делать дальше" after actions.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { motion, AnimatePresence } from "framer-motion";
import { useAIS, type AISState } from "@/hooks/useAIS";
import {
  Sparkles,
  X,
  ChevronRight,
  Lightbulb,
  ArrowRight,
  Compass,
  Target,
  CheckCircle2,
  Eye,
  Shield,
} from "lucide-react";
import Link from "next/link";

/* ─── Proactive tip definitions per page ─────────────────────────────── */

interface ProactiveTip {
  route: string;
  condition: (ais: AISState) => boolean;
  titleKey: string;
  descKey: string;
  actionLabelKey: string;
  actionHref: string;
}

const PROACTIVE_TIPS: ProactiveTip[] = [
  {
    route: "/app/reports",
    condition: (ais) => ais.isFirstTime,
    titleKey: "ais.tip.reports.title",
    descKey: "ais.tip.reports.desc",
    actionLabelKey: "ais.tip.reports.action",
    actionHref: "/app/reports",
  },
  {
    route: "/app/scanner",
    condition: (ais) => ais.memory.metrics.scansPerformed === 0,
    titleKey: "ais.tip.scanner.title",
    descKey: "ais.tip.scanner.desc",
    actionLabelKey: "ais.tip.scanner.action",
    actionHref: "/app/scanner",
  },
  {
    route: "/app/findings",
    condition: (ais) => ais.isFirstTime,
    titleKey: "ais.tip.findings.title",
    descKey: "ais.tip.findings.desc",
    actionLabelKey: "ais.tip.findings.action",
    actionHref: "/app/findings",
  },
  {
    route: "/app/integrations",
    condition: (ais) => ais.memory.metrics.connectedIntegrations === 0,
    titleKey: "ais.tip.integrations.title",
    descKey: "ais.tip.integrations.desc",
    actionLabelKey: "ais.tip.integrations.action",
    actionHref: "/app/integrations",
  },
  {
    route: "/app/marketplace",
    condition: (ais) => ais.memory.metrics.toolsInstalled === 0,
    titleKey: "ais.tip.marketplace.title",
    descKey: "ais.tip.marketplace.desc",
    actionLabelKey: "ais.tip.marketplace.action",
    actionHref: "/app/marketplace",
  },
  {
    route: "/app/dashboard",
    condition: (ais) => ais.isFirstTime && ais.memory.metrics.totalActions < 5,
    titleKey: "ais.tip.dashboard.title",
    descKey: "ais.tip.dashboard.desc",
    actionLabelKey: "ais.tip.dashboard.action",
    actionHref: "/app/scanner",
  },
  {
    route: "/app/repositories",
    condition: (ais) => ais.isFirstTime,
    titleKey: "ais.tip.repositories.title",
    descKey: "ais.tip.repositories.desc",
    actionLabelKey: "ais.tip.repositories.action",
    actionHref: "/app/repositories",
  },
  {
    route: "/app/architecture",
    condition: (ais) => ais.isFirstTime,
    titleKey: "ais.tip.architecture.title",
    descKey: "ais.tip.architecture.desc",
    actionLabelKey: "ais.tip.architecture.action",
    actionHref: "/app/architecture",
  },
];

/* ─── Trust Builder (BLOCK 13) ───────────────────────────────────────── */

interface TrustBuilderProps {
  /** i18n keys for the 4 answers */
  whatHappenedKey: string;
  whyImportantKey: string;
  whatChangedKey: string;
  whatNextKey: string;
  whatNextHref?: string;
}

function TrustBuilderBlock({
  whatHappenedKey,
  whyImportantKey,
  whatChangedKey,
  whatNextKey,
  whatNextHref,
}: TrustBuilderProps) {
  const { t } = useI18n();

  const items = [
    { icon: Eye, labelKey: "ais.trust.whatHappened", valueKey: whatHappenedKey },
    { icon: Lightbulb, labelKey: "ais.trust.whyImportant", valueKey: whyImportantKey },
    { icon: CheckCircle2, labelKey: "ais.trust.whatChanged", valueKey: whatChangedKey },
    { icon: Compass, labelKey: "ais.trust.whatNext", valueKey: whatNextKey, href: whatNextHref },
  ];

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-2"
          >
            <Icon className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">
                {t(item.labelKey)}
              </span>
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  {t(item.valueKey)}
                </Link>
              ) : (
                <p className="text-xs text-foreground/70">{t(item.valueKey)}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Main AIS Assistant Component ───────────────────────────────────── */

interface AISAssistantProps {
  /** External trigger to open (from AppLayout) */
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

export function AISAssistant({ externalOpen, onExternalClose }: AISAssistantProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const ais = useAIS();

  const [internalOpen, setInternalOpen] = useState(false);
  const [proactiveTip, setProactiveTip] = useState<ProactiveTip | null>(null);
  const [showProactive, setShowProactive] = useState(false);
  const [activeTab, setActiveTab] = useState<"guide" | "goal" | "confidence">("guide");
  const tipShownRef = useRef<Record<string, boolean>>({});

  const isOpen = externalOpen || internalOpen;

  // BLOCK 3: Proactive appearance
  useEffect(() => {
    if (!pathname) return;

    // Skip if detail level is minimal (BLOCK 5)
    if (ais.detailLevel === 0) return;

    // Skip if assistant was already shown for this page this session
    if (ais.wasAssistantShown(pathname)) return;

    // Find matching tip
    const tip = PROACTIVE_TIPS.find(
      (tip) => pathname.startsWith(tip.route) && tip.condition(ais)
    );

    if (tip && !tipShownRef.current[tip.route]) {
      tipShownRef.current[tip.route] = true;
      setProactiveTip(tip);
      // Delay appearance slightly for natural feel
      const timer = setTimeout(() => {
        setShowProactive(true);
        ais.markAssistantShown(pathname);
        ais.playSound("tip");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pathname, ais]);

  // BLOCK 12: Context prediction prompt
  useEffect(() => {
    if (!ais.prediction || ais.detailLevel === 0) return;

    // Show prediction as a proactive tip
    const pred = ais.prediction;
    if (pred.confidence > 0.6) {
      setProactiveTip({
        route: pathname || "",
        condition: () => true,
        titleKey: pred.promptKey,
        descKey: "",
        actionLabelKey: pred.actions[0]?.labelKey || "ais.prediction.default",
        actionHref: pred.actions[0]?.href || "/app/dashboard",
      });
      setShowProactive(true);
    }
  }, [ais.prediction, pathname, ais.detailLevel]);

  const handleClose = useCallback(() => {
    setInternalOpen(false);
    onExternalClose?.();
  }, [onExternalClose]);

  const handleDismissProactive = useCallback(() => {
    setShowProactive(false);
    ais.recordTipDismissed();
  }, [ais]);

  const handleEngageProactive = useCallback(() => {
    setShowProactive(false);
    setInternalOpen(true);
    ais.recordTipEngaged();
  }, [ais]);

  // Role-based greeting
  const getGreetingKey = useCallback((): string => {
    if (ais.isExecutive) return "ais.greeting.executive";
    if (ais.isEngineer) return "ais.greeting.engineer";
    return "ais.greeting.default";
  }, [ais.isExecutive, ais.isEngineer]);

  return (
    <>
      {/* ── Proactive tip (BLOCK 3) ────────────────────────────────── */}
      <AnimatePresence>
        {showProactive && proactiveTip && !isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-20 right-6 z-[150] w-80"
          >
            <div className="rounded-xl bg-surface/95 backdrop-blur-md border border-violet-500/20 shadow-lg shadow-violet-500/5 overflow-hidden">
              {/* Glow line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.12em] text-violet-600 dark:text-violet-400 uppercase">
                    {t("ais.assistant.label")}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={handleDismissProactive}
                    className="text-foreground/30 hover:text-foreground/60 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Message */}
                <p className="text-sm text-foreground mb-3">
                  {t(proactiveTip.titleKey)}
                </p>
                {proactiveTip.descKey && (
                  <p className="text-xs text-foreground/60 mb-3">
                    {t(proactiveTip.descKey)}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={proactiveTip.actionHref}
                    onClick={() => {
                      setShowProactive(false);
                      ais.recordTipEngaged();
                    }}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 transition-colors"
                  >
                    {t(proactiveTip.actionLabelKey)}
                  </Link>
                  <button
                    onClick={handleEngageProactive}
                    className="text-xs text-foreground/50 hover:text-foreground/70 transition-colors"
                  >
                    {t("ais.tip.later")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating button ─────────────────────────────────────────── */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.5 }}
          onClick={() => setInternalOpen(true)}
          className="fixed bottom-6 right-6 z-[140] w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 flex items-center justify-center transition-shadow group"
        >
          <Sparkles className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" />
        </motion.button>
      )}

      {/* ── Main panel ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-0 right-0 bottom-0 z-[140] w-96 max-w-[calc(100vw-2rem)] bg-surface/98 backdrop-blur-xl border-l border-border shadow-2xl flex flex-col"
          >
            {/* Panel header */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("ais.assistant.title")}
                </h3>
                <p className="text-[10px] text-foreground/50">
                  {t(getGreetingKey())}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-foreground/40 hover:text-foreground/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {[
                { key: "guide" as const, labelKey: "ais.tab.guide", icon: Compass },
                { key: "goal" as const, labelKey: "ais.tab.goal", icon: Target },
                { key: "confidence" as const, labelKey: "ais.tab.confidence", icon: Shield },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                      activeTab === tab.key
                        ? "text-violet-600 dark:text-violet-400 border-b-2 border-violet-500"
                        : "text-foreground/50 hover:text-foreground/70"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="wait">
                {activeTab === "guide" && (
                  <GuideTab ais={ais} pathname={pathname} />
                )}
                {activeTab === "goal" && (
                  <GoalTab ais={ais} />
                )}
                {activeTab === "confidence" && (
                  <ConfidenceTab ais={ais} />
                )}
              </AnimatePresence>
            </div>

            {/* Role indicator */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-foreground/50">
                  {t(`ais.role.${ais.role}`)}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => ais.toggleSound()}
                  className="text-foreground/30 hover:text-foreground/60 transition-colors"
                >
                  {ais.soundEnabled ? "🔊" : "🔇"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Guide Tab ──────────────────────────────────────────────────────── */

function GuideTab({ ais, pathname }: { ais: AISState; pathname: string | null }) {
  const { t } = useI18n();

  // Find proactive tips relevant to current page
  const pageTips = PROACTIVE_TIPS.filter(
    (tip) => pathname?.startsWith(tip.route)
  );

  return (
    <motion.div
      key="guide"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Current page tip */}
      {pageTips.length > 0 && (
        <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs font-semibold text-foreground">
              {t("ais.guide.currentPage")}
            </span>
          </div>
          {pageTips.map((tip, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <p className="text-xs text-foreground/70 mb-1">
                {t(tip.titleKey)}
              </p>
              <Link
                href={tip.actionHref}
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
              >
                {t(tip.actionLabelKey)}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Trust Builder — always show on guide tab */}
      <div className="p-3 rounded-lg bg-surface border border-border">
        <h4 className="text-xs font-semibold text-foreground mb-3">
          {t("ais.trust.title")}
        </h4>
        <TrustBuilderBlock
          whatHappenedKey="ais.trust.default.whatHappened"
          whyImportantKey="ais.trust.default.whyImportant"
          whatChangedKey="ais.trust.default.whatChanged"
          whatNextKey="ais.trust.default.whatNext"
          whatNextHref="/app/scanner"
        />
      </div>

      {/* Favorite pages */}
      {ais.detailLevel >= 1 && (
        <div className="p-3 rounded-lg bg-surface border border-border">
          <h4 className="text-xs font-semibold text-foreground mb-2">
            {t("ais.guide.favorites")}
          </h4>
          <div className="space-y-1">
            {ais.memory.pageVisits &&
              Object.entries(ais.memory.pageVisits)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([route, count]) => (
                  <Link
                    key={route}
                    href={route}
                    className="flex items-center gap-2 text-xs text-foreground/60 hover:text-foreground/80 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3" />
                    {route.replace("/app/", "")}
                    <span className="text-foreground/30">({count})</span>
                  </Link>
                ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Goal Tab ───────────────────────────────────────────────────────── */

function GoalTab({ ais }: { ais: AISState }) {
  const { t } = useI18n();

  return (
    <motion.div
      key="goal"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {ais.goals.map((goal) => (
        <div key={goal.id}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-foreground">
              {t(goal.titleKey)}
            </h4>
          </div>

          {/* Progress */}
          <div className="mb-2">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-foreground/50">
                {goal.completedSteps}/{goal.targetSteps}
              </span>
              <span className="text-xs font-bold text-violet-500">
                {goal.targetSteps > 0
                  ? Math.round((goal.completedSteps / goal.targetSteps) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-foreground/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${goal.targetSteps > 0 ? (goal.completedSteps / goal.targetSteps) * 100 : 0}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              />
            </div>
          </div>

          {/* Next step */}
          {goal.completedSteps < goal.targetSteps && (
            <Link
              href={goal.nextStepHref}
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
            >
              {t(goal.nextStepKey)}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      ))}

      {/* Achievements summary */}
      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
        <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
          {t("ais.goal.achievements")}
        </h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { value: ais.memory.metrics.scansPerformed, key: "ais.goal.stat.scans" },
            { value: ais.memory.metrics.connectedIntegrations, key: "ais.goal.stat.integrations" },
            { value: ais.memory.metrics.reportsGenerated, key: "ais.goal.stat.reports" },
          ].map((stat, i) => (
            <div key={i} className="p-2 rounded-lg bg-emerald-500/5">
              <div className="text-lg font-bold text-foreground">{stat.value}</div>
              <div className="text-[10px] text-foreground/50">{t(stat.key)}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Confidence Tab ─────────────────────────────────────────────────── */

function ConfidenceTab({ ais }: { ais: AISState }) {
  const { t } = useI18n();
  const { confidence } = ais;

  return (
    <motion.div
      key="confidence"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Score circle */}
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border-2 border-violet-500/20 flex flex-col items-center justify-center mb-3">
          <span className="text-2xl font-bold text-foreground">{confidence.score}</span>
          <span className="text-[9px] text-foreground/40">{t("confidence.outOf")}</span>
        </div>
        <span className="text-sm font-semibold text-foreground">
          {t(`confidence.level.${confidence.level === "very_high" ? "veryHigh" : confidence.level === "needs_attention" ? "needsAttention" : confidence.level}`)}
        </span>
      </div>

      {/* Narrative */}
      <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
        <p className="text-xs text-foreground/70 leading-relaxed">
          {t(confidence.narrativeKey)}
        </p>
      </div>

      {/* Factors */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground">
          {t("ais.confidence.factors")}
        </h4>
        {confidence.factors.map((factor, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex justify-between mb-0.5">
                <span className="text-xs text-foreground/60">{t(factor.labelKey)}</span>
                <span className="text-xs text-foreground/40">
                  {factor.value}/{factor.max}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-foreground/5">
                <div
                  className={`h-full rounded-full ${
                    factor.positive ? "bg-emerald-500" : "bg-foreground/20"
                  }`}
                  style={{ width: `${factor.max > 0 ? (factor.value / factor.max) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Next step */}
      <Link
        href={confidence.nextStepHref}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
      >
        {t(confidence.nextStepKey)}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}

export { TrustBuilderBlock, type TrustBuilderProps };
