"use client";

import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface WhatChangedItem {
  /** i18n key for the capability */
  labelKey: string;
  /** Optional icon */
  icon?: React.ReactNode;
}

interface WhatChangedProps {
  /** "Теперь платформа может:" / "Теперь доступны:" */
  titleKey: string;
  /** List of capabilities gained */
  items: WhatChangedItem[];
  /** Optional next action */
  nextAction?: {
    labelKey: string;
    href: string;
  };
  className?: string;
}

export function WhatChanged({ titleKey, items, nextAction, className = "" }: WhatChangedProps) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/15 ${className}`}
    >
      <h4 className="text-sm font-semibold text-foreground mb-3">{t(titleKey)}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-2 text-sm text-foreground/80"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{t(item.labelKey)}</span>
          </motion.li>
        ))}
      </ul>
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
