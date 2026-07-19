"use client";

import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, Eye, Brain, Target, ArrowRight } from "lucide-react";

/* ─── Business result message types ────────────────────────────────────── */

type BusinessResultType =
  | "security_transparent"
  | "risks_known"
  | "data_driven"
  | "controlled"
  | "protected"
  | "calm";

interface BusinessResultProps {
  type: BusinessResultType;
  className?: string;
}

const RESULT_CONFIG: Record<BusinessResultType, {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
}> = {
  security_transparent: {
    icon: <Eye className="w-5 h-5" />,
    titleKey: "business.securityTransparent.title",
    descKey: "business.securityTransparent.desc",
  },
  risks_known: {
    icon: <Target className="w-5 h-5" />,
    titleKey: "business.risksKnown.title",
    descKey: "business.risksKnown.desc",
  },
  data_driven: {
    icon: <Brain className="w-5 h-5" />,
    titleKey: "business.dataDriven.title",
    descKey: "business.dataDriven.desc",
  },
  controlled: {
    icon: <ShieldCheck className="w-5 h-5" />,
    titleKey: "business.controlled.title",
    descKey: "business.controlled.desc",
  },
  protected: {
    icon: <TrendingUp className="w-5 h-5" />,
    titleKey: "business.protected.title",
    descKey: "business.protected.desc",
  },
  calm: {
    icon: <ShieldCheck className="w-5 h-5" />,
    titleKey: "business.calm.title",
    descKey: "business.calm.desc",
  },
};

export function BusinessResult({ type, className = "" }: BusinessResultProps) {
  const { t } = useI18n();
  const config = RESULT_CONFIG[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
          {config.icon}
        </div>
        <div>
          <div className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">
            {t(config.titleKey)}
          </div>
          <div className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            {t(config.descKey)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Business-oriented score display ──────────────────────────────────── */

interface BusinessScoreProps {
  score: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  className?: string;
}

export function BusinessScore({ score, critical, high, medium, low, className = "" }: BusinessScoreProps) {
  const { t } = useI18n();

  const getScoreMessage = () => {
    if (score >= 90) return { key: "business.score.excellent", color: "text-emerald-600 dark:text-emerald-400" };
    if (score >= 70) return { key: "business.score.good", color: "text-blue-600 dark:text-blue-400" };
    if (score >= 50) return { key: "business.score.attention", color: "text-amber-600 dark:text-amber-400" };
    return { key: "business.score.critical", color: "text-red-600 dark:text-red-400" };
  };

  const scoreMsg = getScoreMessage();

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-foreground">{score}</span>
        <span className="text-sm text-muted-foreground">{t("business.score.outOf")}</span>
      </div>
      <p className={`text-sm font-medium ${scoreMsg.color}`}>
        {t(scoreMsg.key)}
      </p>

      {/* Business interpretation */}
      <div className="p-3 rounded-lg bg-muted/50 text-sm text-foreground">
        {critical > 0 ? (
          <span>
            {t("business.summary.hasCritical").replace("{count}", String(critical))}
          </span>
        ) : high > 0 ? (
          <span>
            {t("business.summary.hasHigh").replace("{count}", String(high))}
          </span>
        ) : medium > 0 ? (
          <span>
            {t("business.summary.hasMedium").replace("{count}", String(medium))}
          </span>
        ) : (
          <span>{t("business.summary.allGood")}</span>
        )}
      </div>
    </div>
  );
}

/* ─── Business-oriented finding summary ────────────────────────────────── */

interface BusinessFindingSummaryProps {
  totalFindings: number;
  critical: number;
  high: number;
  className?: string;
}

export function BusinessFindingSummary({ totalFindings, critical, high, className = "" }: BusinessFindingSummaryProps) {
  const { t } = useI18n();

  const getMessage = () => {
    if (critical > 0)
      return t("business.findings.criticalAttention").replace("{count}", String(critical));
    if (high > 0)
      return t("business.findings.needReview").replace("{count}", String(high));
    if (totalFindings > 0)
      return t("business.findings.minorIssues").replace("{count}", String(totalFindings));
    return t("business.findings.allClear");
  };

  const getType = () => {
    if (critical > 0) return "risks_known" as BusinessResultType;
    if (high > 0) return "data_driven" as BusinessResultType;
    return "security_transparent" as BusinessResultType;
  };

  return (
    <div className={className}>
      <BusinessResult type={getType()} />
      <p className="mt-2 text-sm text-foreground">{getMessage()}</p>
    </div>
  );
}
