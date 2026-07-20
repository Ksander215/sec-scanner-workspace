"use client";

import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface FlowStep {
  labelKey: string;
  icon?: string;
}

interface VisualFlowProps {
  steps: FlowStep[];
  activeStep?: number;
  className?: string;
}

export function VisualFlow({ steps, activeStep = -1, className = "" }: VisualFlowProps) {
  const { t } = useI18n();

  return (
    <div className={`flex items-center gap-1 overflow-x-auto py-2 ${className}`}>
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              i < activeStep
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : i === activeStep
                ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                : "bg-muted/50 text-muted-foreground border border-border"
            }`}
          >
            {i < activeStep ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                {i + 1}
              </span>
            )}
            <span>{t(step.labelKey)}</span>
          </motion.div>
          {i < steps.length - 1 && (
            <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Predefined flows for guide scenarios ─────────────────────────────── */

export const SCANNER_FLOWS = {
  website: [
    { labelKey: "flow.scanner.target" },
    { labelKey: "flow.scanner.tools" },
    { labelKey: "flow.scanner.scan" },
    { labelKey: "flow.scanner.report" },
    { labelKey: "flow.scanner.fix" },
    { labelKey: "flow.scanner.control" },
  ],
  server: [
    { labelKey: "flow.scanner.target" },
    { labelKey: "flow.scanner.tools" },
    { labelKey: "flow.scanner.scan" },
    { labelKey: "flow.scanner.impact" },
    { labelKey: "flow.scanner.fix" },
    { labelKey: "flow.scanner.control" },
  ],
  repository: [
    { labelKey: "flow.scanner.target" },
    { labelKey: "flow.scanner.connect" },
    { labelKey: "flow.scanner.analyze" },
    { labelKey: "flow.scanner.report" },
    { labelKey: "flow.scanner.fix" },
    { labelKey: "flow.scanner.control" },
  ],
};
