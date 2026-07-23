"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ShieldCheck,
  Clock,
  Zap,
  Search,
  ArrowRight,
  Sparkles,
  Lock,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export function Hero() {
  const { t } = useI18n();
  const router = useRouter();
  const [domain, setDomain] = useState("");

  const handleCheck = () => {
    if (!domain.trim()) return;
    // Pass domain to /app/home via query param so it auto-fills and can auto-check
    const cleanDomain = domain.trim().replace(/^https?:\/\//, "");
    router.push(`/app/home?domain=${encodeURIComponent(cleanDomain)}`);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_70%)]" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* Эмоциональный триггер — вопрос, не утверждение */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            <span className="text-gradient-accent">
              {t("landing.heroV3.headline")}
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-2 max-w-2xl mx-auto">
            {t("landing.heroV3.subheadline")}
          </p>
        </motion.div>

        {/* Input прямо на лендинге — захват desire в момент пика */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="max-w-xl mx-auto mb-6"
        >
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-2" />
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                placeholder={t("landing.heroV3.placeholder")}
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-surface border border-border text-base text-foreground placeholder:text-muted-2 focus:border-violet-500/50 focus:outline-none transition-colors shadow-lg"
                autoFocus
              />
            </div>
            <button
              onClick={handleCheck}
              disabled={!domain.trim()}
              className={`px-6 py-3.5 rounded-xl text-base font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                domain.trim()
                  ? "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/20"
                  : "bg-surface-2 text-muted-2 cursor-not-allowed"
              }`}
            >
              {t("landing.heroV3.cta")}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {/* Trust момент — прямо под input */}
          <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-muted-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-500" />
              {t("landing.heroV2.trust1")}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              {t("landing.heroV2.trust2")}
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" />
              {t("landing.heroV2.trust3")}
            </span>
          </div>
        </motion.div>

        {/* Визуальная карточка — "вот что вы увидите" */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-md mx-auto"
        >
          <div className="text-center mb-2">
            <span className="text-[11px] text-muted-2 uppercase tracking-wider">
              {t("landing.heroV3.cardLabel")}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-surface/80 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">your-site.com</div>
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
          {/* First Success Preview */}
          <div className="flex items-center gap-2 flex-wrap justify-center mt-4">
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
