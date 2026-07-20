/**
 * AIS — BLOCK 11: AI Executive Summary
 *
 * Appears after scan/analysis with a confident,
 * business-language summary — never "Scan complete."
 */

"use client";

import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, ArrowRight, Clock, Shield } from "lucide-react";
import Link from "next/link";

interface AIExecutiveSummaryProps {
  /** Number of findings */
  findingsCount: number;
  /** Number of high-priority items */
  highPriorityCount: number;
  /** Estimated fix time in minutes */
  estimatedFixMinutes: number;
  /** What was scanned (i18n key) */
  scannedTargetKey: string;
  /** Whether user is executive mode */
  isExecutive?: boolean;
  className?: string;
}

export function AIExecutiveSummary({
  findingsCount,
  highPriorityCount,
  estimatedFixMinutes,
  scannedTargetKey,
  isExecutive = false,
  className = "",
}: AIExecutiveSummaryProps) {
  const { t } = useI18n();

  const hasIssues = findingsCount > 0;
  const hasHighPriority = highPriorityCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-xl border ${className} ${
        hasHighPriority
          ? "bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/15"
          : "bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/15"
      }`}
    >
      {/* Main message */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            hasHighPriority
              ? "bg-amber-500/10"
              : "bg-emerald-500/10"
          }`}
        >
          <Shield
            className={`w-5 h-5 ${
              hasHighPriority ? "text-amber-500" : "text-emerald-500"
            }`}
          />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">
            {t(
              hasIssues
                ? isExecutive
                  ? "ais.summary.executive.hasIssues"
                  : "ais.summary.hasIssues"
                : isExecutive
                  ? "ais.summary.executive.clean"
                  : "ais.summary.clean"
            )}
          </h4>
          <p className="text-xs text-foreground/60 leading-relaxed">
            {t(scannedTargetKey)}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
          <div className="text-lg font-bold text-foreground">{findingsCount}</div>
          <div className="text-[10px] text-foreground/50">
            {t(
              isExecutive
                ? "ais.summary.stat.attentionPoints"
                : "ais.summary.stat.findings"
            )}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
          <div className={`text-lg font-bold ${hasHighPriority ? "text-amber-500" : "text-foreground"}`}>
            {highPriorityCount}
          </div>
          <div className="text-[10px] text-foreground/50">
            {t(
              isExecutive
                ? "ais.summary.stat.businessRisk"
                : "ais.summary.stat.highPriority"
            )}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
          <div className="flex items-center gap-1 text-foreground">
            <Clock className="w-3.5 h-3.5 text-foreground/40" />
            <span className="text-lg font-bold">~{estimatedFixMinutes}</span>
          </div>
          <div className="text-[10px] text-foreground/50">
            {t("ais.summary.stat.estimatedTime")}
          </div>
        </div>
      </div>

      {/* Contextualized message */}
      {hasIssues && findingsCount > 3 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10 mb-4">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/60">
            {t("ais.summary.contextualized")
              .replace("{total}", String(findingsCount))
              .replace("{priority}", String(highPriorityCount))}
          </p>
        </div>
      )}

      {/* What changed (BLOCK 13) */}
      <div className="flex items-start gap-2 mb-4">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {t("ais.summary.whatChanged")}
          </span>
          <p className="text-xs text-foreground/70">
            {t(
              hasIssues
                ? "ais.summary.transparencyImproved"
                : "ais.summary.fullyTransparent"
            )}
          </p>
        </div>
      </div>

      {/* Next step */}
      <Link
        href={hasHighPriority ? "/app/findings" : "/app/reports"}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
      >
        {t(hasHighPriority ? "ais.summary.reviewPriority" : "ais.summary.generateReport")}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}
