"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Sparkles } from "lucide-react";
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

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.2] text-foreground mb-5">
            {t("heroV5.headline")}
          </h1>
          <p className="text-base md:text-lg text-muted-2 mb-8 max-w-xl mx-auto leading-relaxed">
            {t("heroV5.subheadline")}
          </p>
        </motion.div>

        {/* Input */}
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
              placeholder={t("heroV5.placeholder")}
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
              {t("heroV5.cta")}
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-muted-2">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {t("heroV5.free")}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-500" /> {t("heroV5.minute")}</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-500" /> {t("heroV5.clear")}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
