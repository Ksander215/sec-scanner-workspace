"use client";

import { motion } from "framer-motion";
import { FolderPlus, Store, Zap, Sparkles } from "lucide-react";
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

  const colorStyles: Record<string, { bg: string; text: string; ring: string; num: string }> = {
    accent: { bg: "bg-accent-muted", text: "text-accent", ring: "ring-accent/30", num: "text-accent" },
    cyan: { bg: "bg-cyan-muted", text: "text-cyan", ring: "ring-cyan/30", num: "text-cyan" },
    amber: { bg: "bg-amber-muted", text: "text-amber", ring: "ring-amber/30", num: "text-amber" },
    purple: { bg: "bg-purple-muted", text: "text-purple", ring: "ring-purple/30", num: "text-purple" },
  };

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface to-transparent" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

        {/* Steps — horizontal on desktop, vertical on mobile */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
          {steps.map((step, i) => {
            const styles = colorStyles[step.color];
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative group"
              >
                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-border" />
                )}

                <div className="relative flex flex-col items-center text-center p-6 rounded-2xl border border-border bg-surface hover:bg-surface-2 transition-all duration-300">
                  {/* Step number */}
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${styles.bg} ${styles.text} ring-4 ${styles.ring} font-bold text-lg`}>
                    {i + 1}
                  </div>

                  {/* Icon */}
                  <div className={`mt-4 inline-flex items-center justify-center w-10 h-10 rounded-lg ${styles.bg} ${styles.text}`}>
                    <step.icon className="w-5 h-5" />
                  </div>

                  {/* Text */}
                  <h3 className="mt-3 text-base font-semibold text-foreground">
                    {t(`${step.key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm text-muted-2 leading-relaxed">
                    {t(`${step.key}.desc`)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
