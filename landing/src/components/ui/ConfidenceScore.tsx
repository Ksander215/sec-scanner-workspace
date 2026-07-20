"use client";

import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { Shield, TrendingUp, Eye, AlertTriangle, CheckCircle2 } from "lucide-react";

type ConfidenceLevel = "very_high" | "high" | "good" | "needs_attention" | "low";

interface ConfidenceScoreProps {
  /** Score 0-100 */
  score: number;
  /** Additional factors */
  factors?: {
    fixedIssues?: number;
    coveredServices?: number;
    connectedIntegrations?: number;
    automationPercent?: number;
  };
  className?: string;
}

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 90) return "very_high";
  if (score >= 75) return "high";
  if (score >= 55) return "good";
  if (score >= 35) return "needs_attention";
  return "low";
}

const LEVEL_CONFIG: Record<ConfidenceLevel, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  labelKey: string;
  descKey: string;
}> = {
  very_high: {
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    labelKey: "confidence.level.veryHigh",
    descKey: "confidence.level.veryHigh.desc",
  },
  high: {
    icon: Shield,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    labelKey: "confidence.level.high",
    descKey: "confidence.level.high.desc",
  },
  good: {
    icon: Eye,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    labelKey: "confidence.level.good",
    descKey: "confidence.level.good.desc",
  },
  needs_attention: {
    icon: TrendingUp,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    labelKey: "confidence.level.needsAttention",
    descKey: "confidence.level.needsAttention.desc",
  },
  low: {
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    labelKey: "confidence.level.low",
    descKey: "confidence.level.low.desc",
  },
};

export function ConfidenceScore({ score, factors, className = "" }: ConfidenceScoreProps) {
  const { t } = useI18n();
  const level = getConfidenceLevel(score);
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-surface border border-border ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Score circle */}
        <div className={`w-16 h-16 rounded-full ${config.bgColor} ${config.borderColor} border flex flex-col items-center justify-center shrink-0`}>
          <span className={`text-lg font-bold ${config.color}`}>{score}</span>
          <span className="text-[9px] text-muted-2">{t("confidence.outOf")}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className={`text-sm font-semibold ${config.color}`}>{t(config.labelKey)}</span>
          </div>
          <p className="text-xs text-foreground/70 mb-2">{t(config.descKey)}</p>

          {/* Factors */}
          {factors && (
            <div className="flex flex-wrap gap-2 text-[10px]">
              {factors.fixedIssues !== undefined && factors.fixedIssues > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  ✓ {factors.fixedIssues} {t("confidence.fixed")}
                </span>
              )}
              {factors.coveredServices !== undefined && (
                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {factors.coveredServices}% {t("confidence.coverage")}
                </span>
              )}
              {factors.connectedIntegrations !== undefined && factors.connectedIntegrations > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  {factors.connectedIntegrations} {t("confidence.integrations")}
                </span>
              )}
              {factors.automationPercent !== undefined && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  {factors.automationPercent}% {t("confidence.automated")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
