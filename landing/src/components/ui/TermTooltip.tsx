"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

interface TermTooltipProps {
  termKey: string;
  explainKey: string;
}

export function TermTooltip({ termKey, explainKey }: TermTooltipProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <span className="text-foreground font-medium">{t(termKey)}</span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-muted hover:text-accent hover:bg-accent-muted transition-colors"
        aria-label={t("common.whatIsIt")}
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 p-3 rounded-lg bg-surface border border-border shadow-lg text-xs text-muted-2 leading-relaxed">
          <span className="font-semibold text-foreground">{t(termKey)}</span>{" "}
          — {t(explainKey)}
        </div>
      )}
    </span>
  );
}
