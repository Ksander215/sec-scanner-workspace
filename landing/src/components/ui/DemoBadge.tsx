"use client";

import { useI18n } from "@/lib/i18n-context";
import { AlertTriangle } from "lucide-react";

interface DemoBadgeProps {
  className?: string;
}

export function DemoBadge({ className = "" }: DemoBadgeProps) {
  const { t } = useI18n();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 ${className}`}>
      <AlertTriangle className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{t("demo.badge")}</span>
    </div>
  );
}

export function DemoNotice({ className = "" }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div className={`rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-medium text-sm text-amber-700 dark:text-amber-300">
            {t("demo.notice.title")}
          </div>
          <div className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
            {t("demo.notice.desc")}
          </div>
        </div>
      </div>
    </div>
  );
}
