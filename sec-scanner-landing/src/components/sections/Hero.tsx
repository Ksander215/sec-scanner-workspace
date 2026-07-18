"use client";

import { motion } from "framer-motion";
import { Shield, ArrowRight, Play } from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { useI18n } from "@/lib/i18n-context";

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan/5 rounded-full blur-[120px]" />

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_70%)]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-20">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-border bg-accent-muted text-accent text-xs font-medium tracking-wide uppercase">
            <Shield className="w-3.5 h-3.5" />
            {t("hero.badge")}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
        >
          <span className="text-accent">SIP</span>
          <br />
          <span className="text-gradient-accent">{t("hero.headline1")}</span>
          <br />
          <span className="text-foreground">{t("hero.headline2")}</span>
        </motion.h1>

        {/* Tagline — The 30-second value proposition */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-muted-2 max-w-2xl mx-auto leading-relaxed"
        >
          {t("hero.tagline")}
        </motion.p>

        {/* What you can do */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
        >
          <span className="text-accent">{t("hero.keyword1")}</span>
          <span className="text-cyan">{t("hero.keyword2")}</span>
          <span className="text-amber">{t("hero.keyword3")}</span>
          <span className="text-purple">{t("hero.keyword4")}</span>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="/app/dashboard"
            className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold bg-accent text-background rounded-xl hover:bg-accent-hover transition-all glow-accent"
          >
            <Play className="w-4 h-4" />
            {t("nav.openPlatform")}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="https://github.com/Ksander215/sec-scanner-workspace"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium border border-border-light text-foreground rounded-xl hover:bg-surface-2 hover:border-muted transition-all"
          >
            <GitHubIcon className="w-4 h-4" />
            GitHub
          </a>
        </motion.div>

        {/* Terminal preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 max-w-2xl mx-auto"
        >
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-2">
              <div className="w-3 h-3 rounded-full bg-red/60" />
              <div className="w-3 h-3 rounded-full bg-amber/60" />
              <div className="w-3 h-3 rounded-full bg-accent/60" />
              <span className="ml-3 text-xs text-muted font-mono">sip cli</span>
            </div>
            <div className="p-4 font-mono text-sm leading-7 text-left">
              <div className="text-muted">
                $ <span className="text-foreground">sip scan</span>{" "}
                --target api.example.com
              </div>
              <div className="text-accent">
                ✓ {t("hero.terminal.findings")}
              </div>
              <div className="text-cyan">
                ✓ {t("hero.terminal.risk")}
              </div>
              <div className="text-amber">
                ✓ {t("hero.terminal.attack")}
              </div>
              <div className="text-purple">
                ✓ {t("hero.terminal.recs")}
              </div>
              <div className="text-muted mt-2">
                $ <span className="text-accent animate-blink">▋</span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <span className="text-xs text-muted">Powered by Sec Scanner Engine</span>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto"
        >
          {[
            { value: 50, suffix: "K+", label: t("hero.stats.scans") },
            { value: 370, suffix: "+", label: t("hero.stats.rules") },
            { value: 99.2, suffix: "%", label: t("hero.stats.accuracy") },
            { value: 3, suffix: "с", label: t("hero.stats.time"), prefix: "<" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gradient-accent">
                {stat.prefix === "<" ? "<" : ""}
                {stat.value % 1 !== 0 ? (
                  <AnimatedCounter value={Math.round(stat.value * 10)} suffix="" duration={2000} />
                ) : (
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={2000} />
                )}
              </div>
              <div className="mt-1 text-xs sm:text-sm text-muted">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
