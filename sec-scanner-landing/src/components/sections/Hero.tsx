"use client";

import { motion } from "framer-motion";
import {
  Shield,
  ArrowRight,
  Play,
  CheckCircle2,
  Server,
  Bug,
  Eye,
  Wrench,
  Brain,
  Building2,
  Users,
  Code2,
  Layers,
  Search,
  FileBarChart,
  Zap,
} from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { useI18n } from "@/lib/i18n-context";

export function Hero() {
  const { t } = useI18n();

  const whatDoes = [
    { icon: Bug, key: "hero.whatDoes.find", color: "text-red" },
    { icon: Eye, key: "hero.whatDoes.risks", color: "text-amber" },
    { icon: Wrench, key: "hero.whatDoes.fix", color: "text-accent" },
  ];

  const whySip = [
    { icon: Layers, key: "hero.whySip.platform" },
    { icon: Search, key: "hero.whySip.scan" },
    { icon: Server, key: "hero.whySip.catalog" },
    { icon: Brain, key: "hero.whySip.ai" },
    { icon: FileBarChart, key: "hero.whySip.reports" },
    { icon: Zap, key: "hero.whySip.automation" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Minimal background */}
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_70%)]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* 1. Что это? */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-border bg-accent-muted text-accent text-xs font-medium tracking-wide uppercase">
            <Shield className="w-3.5 h-3.5" />
            {t("hero.whatIsItAnswer")}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] text-center"
        >
          <span className="text-accent">SIP</span>
          <span className="text-foreground mx-3">—</span>
          <span className="text-gradient-accent">{t("hero.whatIsItAnswer")}</span>
        </motion.h1>

        {/* 2. Для кого? */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-6 text-lg sm:text-xl text-muted-2 text-center max-w-2xl mx-auto"
        >
          {t("hero.forWhomAnswer")}
        </motion.p>

        {/* 3. Что делает? */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 flex flex-col items-center"
        >
          <span className="text-sm font-medium text-muted-2 uppercase tracking-wider mb-4">
            {t("hero.whatDoes")}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {whatDoes.map((item, i) => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  <span className="text-base font-semibold text-foreground">{t(item.key)}</span>
                </div>
                {i < whatDoes.length - 1 && (
                  <span className="text-muted text-xl hidden sm:inline">·</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="/app/marketplace"
            className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold bg-accent text-background rounded-xl hover:bg-accent-hover transition-all"
          >
            <Play className="w-4 h-4" />
            {t("hero.cta.primary")}
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

        {/* 4. Почему именно SIP? */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <h3 className="text-sm font-medium text-muted-2 uppercase tracking-wider mb-4 text-center">
            {t("hero.whySip")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {whySip.map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface border border-border"
              >
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{t(item.key)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-accent font-semibold">
            {t("hero.whySip.allTogether")}
          </p>
        </motion.div>

        {/* Terminal preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-14 max-w-2xl mx-auto"
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
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto"
        >
          {[
            { value: 370, suffix: "+", label: t("hero.stats.rules") },
            { value: 12, suffix: "", label: t("hero.stats.modules") },
            { value: 100, suffix: "%", label: t("hero.stats.opensource") },
            { value: 1, suffix: "", label: t("hero.stats.command"), prefix: "" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gradient-accent">
                {stat.prefix || ""}
                <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={2000} />
              </div>
              <div className="mt-1 text-xs sm:text-sm text-muted">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
