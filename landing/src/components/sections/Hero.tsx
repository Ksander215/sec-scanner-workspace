"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";

export function Hero() {
  const { t } = useI18n();
  const router = useRouter();
  const [domain, setDomain] = useState("");

  const handleCheck = () => {
    if (!domain.trim()) return;
    const cleanDomain = domain.trim().replace(/^https?:\/\//, "");
    router.push(`/app/home?domain=${encodeURIComponent(cleanDomain)}`);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_70%)]" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">

        {/* Спокойный вопрос, не маркетинг */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] text-foreground mb-6">
            {t("heroV4.landingHeadline")}
          </h1>
          <p className="text-lg md:text-xl text-muted-2 mb-10 max-w-xl mx-auto">
            {t("heroV4.landingSubheadline")}
          </p>
        </motion.div>

        {/* Input прямо на лендинге */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-md mx-auto"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              placeholder={t("heroV4.domainPlaceholder")}
              className="flex-1 px-4 py-3.5 rounded-xl bg-surface border border-border text-base text-foreground placeholder:text-muted-2 focus:border-violet-500/40 focus:outline-none transition-colors"
              autoFocus
            />
            <button
              onClick={handleCheck}
              disabled={!domain.trim()}
              className={`px-6 py-3.5 rounded-xl text-base font-medium transition-all whitespace-nowrap ${
                domain.trim()
                  ? "bg-foreground text-background hover:opacity-80"
                  : "bg-surface-2 text-muted-2 cursor-not-allowed"
              }`}
            >
              {t("heroV4.domainCta")}
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-2">
            {t("heroV4.trust")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
