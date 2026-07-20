"use client";

import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, TrendingUp, Shield } from "lucide-react";
import Link from "next/link";

interface ExecutiveSummaryItem {
  labelKey: string;
}

interface ExecutiveSummaryProps {
  /** What was checked */
  checkedItems: ExecutiveSummaryItem[];
  /** Main conclusion key */
  conclusionKey: string;
  /** Conclusion type: positive or needs_attention */
  conclusionType?: "positive" | "needs_attention";
  /** Next action */
  nextAction?: {
    labelKey: string;
    href: string;
  };
  className?: string;
}

export function ExecutiveSummary({
  checkedItems,
  conclusionKey,
  conclusionType = "positive",
  nextAction,
  className = "",
}: ExecutiveSummaryProps) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-xl bg-surface border border-border ${className}`}
    >
      {/* What was checked */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">
          {t("confidence.summary.checked")}
        </h4>
        <div className="flex flex-wrap gap-2">
          {checkedItems.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="w-3 h-3" />
              {t(item.labelKey)}
            </span>
          ))}
        </div>
      </div>

      {/* Main conclusion */}
      <div className={`p-3 rounded-lg ${
        conclusionType === "positive"
          ? "bg-emerald-500/10 border border-emerald-500/20"
          : "bg-amber-500/10 border border-amber-500/20"
      }`}>
        <div className="flex items-start gap-2">
          {conclusionType === "positive" ? (
            <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <TrendingUp className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-0.5">
              {t("confidence.summary.conclusion")}
            </h4>
            <p className="text-sm text-foreground/80">{t(conclusionKey)}</p>
          </div>
        </div>
      </div>

      {/* Next action */}
      {nextAction && (
        <div className="mt-4 pt-3 border-t border-border">
          <Link
            href={nextAction.href}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
          >
            {t(nextAction.labelKey)}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}
