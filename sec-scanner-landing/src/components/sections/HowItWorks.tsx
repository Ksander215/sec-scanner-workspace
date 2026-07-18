"use client";

import { motion } from "framer-motion";
import { FolderPlus, Store, Zap, Sparkles, ArrowDown } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    {
      icon: FolderPlus,
      key: "howItWorks.step1",
      color: "accent",
    },
    {
      icon: Store,
      key: "howItWorks.step2",
      color: "cyan",
    },
    {
      icon: Zap,
      key: "howItWorks.step3",
      color: "amber",
    },
    {
      icon: Sparkles,
      key: "howItWorks.step4",
      color: "purple",
    },
  ];

  const colorStyles: Record<string, { bg: string; text: string; ring: string }> = {
    accent: { bg: "bg-accent-muted", text: "text-accent", ring: "ring-accent/30" },
    cyan: { bg: "bg-cyan-muted", text: "text-cyan", ring: "ring-cyan/30" },
    amber: { bg: "bg-amber-muted", text: "text-amber", ring: "ring-amber/30" },
    purple: { bg: "bg-purple-muted", text: "text-purple", ring: "ring-purple/30" },
  };

  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface to-transparent" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            {t("howItWorks.label")}
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {t("howItWorks.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-2">
            {t("howItWorks.subtitle")}
          </p>
        </motion.div>

        {/* Steps — vertical flow with arrows */}
        <div className="mt-16 flex flex-col gap-0">
          {steps.map((step, i) => {
            const styles = colorStyles[step.color];
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="flex items-center gap-6">
                  {/* Step number + icon */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-2xl ${styles.bg} ${styles.text} ring-4 ${styles.ring}`}>
                      <step.icon className="w-6 h-6" />
                    </div>
                  </div>
                  {/* Text */}
                  <div className="flex-1 p-5 rounded-xl border border-border bg-surface">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold ${styles.text} uppercase tracking-wider`}>
                        {i + 1}
                      </span>
                      <h3 className="text-base font-semibold text-foreground">
                        {t(`${step.key}.title`)}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-muted-2 leading-relaxed">
                      {t(`${step.key}.desc`)}
                    </p>
                  </div>
                </div>

                {/* Arrow between steps */}
                {i < steps.length - 1 && (
                  <div className="flex justify-center py-3 pl-7">
                    <ArrowDown className="w-5 h-5 text-muted" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
