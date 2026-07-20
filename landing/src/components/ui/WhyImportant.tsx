"use client";

import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

interface WhyImportantProps {
  /** i18n key for the explanation text */
  textKey: string;
  className?: string;
}

export function WhyImportant({ textKey, className = "" }: WhyImportantProps) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-start gap-2.5 px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/10 ${className}`}
    >
      <Lightbulb className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
      <div>
        <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
          {t("confidence.whyImportant")}
        </span>
        <p className="text-xs text-foreground/70 mt-0.5">{t(textKey)}</p>
      </div>
    </motion.div>
  );
}
