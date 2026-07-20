/**
 * AIS — BLOCK 6: Personal Goal System
 *
 * Displays a personal goal card with progress bar.
 * Shows current goal, progress percentage, and next step.
 */

"use client";

import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { Target, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { AISGoal } from "@/lib/ais/memory";

interface PersonalGoalCardProps {
  goal: AISGoal;
  className?: string;
}

export function PersonalGoalCard({ goal, className = "" }: PersonalGoalCardProps) {
  const { t } = useI18n();
  const progress = goal.targetSteps > 0
    ? Math.round((goal.completedSteps / goal.targetSteps) * 100)
    : 0;
  const isComplete = goal.completedSteps >= goal.targetSteps;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-transparent border border-violet-500/15 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <Target className="w-4 h-4 text-violet-500" />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-bold tracking-[0.12em] text-violet-600 dark:text-violet-400 uppercase">
            {t("ais.goal.label")}
          </span>
          <h4 className="text-sm font-semibold text-foreground leading-tight">
            {t(goal.titleKey)}
          </h4>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-foreground/60">
            {goal.completedSteps} / {goal.targetSteps}
          </span>
          <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
            {progress}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-foreground/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          />
        </div>
      </div>

      {/* Next step or completion */}
      {isComplete ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span className="font-medium">{t("ais.goal.complete")}</span>
        </div>
      ) : (
        <Link
          href={goal.nextStepHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {t(goal.nextStepKey)}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </motion.div>
  );
}
