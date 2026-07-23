"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  AlertCircle,
  ShieldCheck,
  Clock,
  Zap,
  Search,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_70%)]" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* BLOCK 1: Эмоциональный триггер */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            <span className="text-gradient-accent">
              {t("landing.heroV2.headline")}
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-2 max-w-2xl mx-auto">
            {t("landing.heroV2.subheadline")}
          </p>
        </motion.div>

        {/* BLOCK 2: Визуальная карточка — что увидит пользователь */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-md mx-auto mb-8"
        >
          <div className="rounded-xl border border-border bg-surface/80 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">example.com</div>
                <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
                  {t("landing.heroV2.riskHigh")}
                </div>
              </div>
            </div>
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2 text-xs text-foreground/70">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {t("landing.heroV2.risk1")}
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/70">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                {t("landing.heroV2.risk2")}
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/70">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {t("landing.heroV2.risk3")}
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-[11px] text-violet-500">
                <Sparkles className="w-3 h-3" />
                <span>{t("landing.heroV2.aiRecommendation")}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* BLOCK 3: Момент доверия */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center gap-4 text-[11px] text-muted-2 mb-6"
        >
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-500" />
            {t("landing.heroV2.trust1")}
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            {t("landing.heroV2.trust2")}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-500" />
            {t("landing.heroV2.trust3")}
          </span>
        </motion.div>

        {/* BLOCK 4: Усиленный CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-col items-center gap-4"
        >
          <Link
            href="/app/home"
            className="group inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20"
          >
            <Search className="w-4 h-4" />
            {t("landing.heroV2.cta")}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* BLOCK 5: First Success Preview */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-[11px] text-muted-2">{t("landing.heroV2.preview")}:</span>
            {["AI Summary", t("landing.heroV2.previewCritical"), t("landing.heroV2.previewPlan"), t("landing.heroV2.previewReport")].map((item) => (
              <span key={item} className="px-2 py-0.5 rounded-md bg-foreground/5 text-[10px] text-foreground/50">
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
