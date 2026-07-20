"use client";

import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

interface CompanyProgressProps {
  /** Stats to show */
  stats: {
    labelKey: string;
    value: string | number;
    positive?: boolean;
  }[];
  /** Dynamic message key (positive trend) */
  trendKey: string;
  /** Optional next step */
  nextAction?: {
    labelKey: string;
    href: string;
  };
  className?: string;
}

export function CompanyProgress({ stats, trendKey, nextAction, className = "" }: CompanyProgressProps) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/15 ${className}`}
    >
      <h4 className="text-sm font-semibold text-foreground mb-3">
        {t("confidence.progress.title")}
      </h4>

      <ul className="space-y-2 mb-3">
        {stats.map((stat, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2 text-sm text-foreground/80"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-medium text-foreground">{stat.value}</span>
            <span>{t(stat.labelKey)}</span>
          </motion.li>
        ))}
      </ul>

      {/* Positive trend */}
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="w-4 h-4" />
        <span>{t(trendKey)}</span>
      </div>

      {nextAction && (
        <Link
          href={nextAction.href}
          className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {t(nextAction.labelKey)}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </motion.div>
  );
}
