"use client";

import { motion } from "framer-motion";
import {
  Shield,
  ArrowRight,
  Play,
  CheckCircle2,
  Server,
  Bug,
  Layers,
  Route,
  Wrench,
  Brain,
  Building2,
  Users,
  Code2,
  Cable,
} from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { useI18n } from "@/lib/i18n-context";

export function Hero() {
  const { t, locale } = useI18n();

  const capabilities = [
    { icon: Server, key: "hero.cap.infra" },
    { icon: Bug, key: "hero.cap.vuln" },
    { icon: Layers, key: "hero.cap.collect" },
    { icon: Route, key: "hero.cap.attacks" },
    { icon: Wrench, key: "hero.cap.fix" },
    { icon: Brain, key: "hero.cap.ai" },
  ];

  const audiences = [
    { icon: Building2, key: "hero.aud.companies" },
    { icon: Users, key: "hero.aud.devops" },
    { icon: Shield, key: "hero.aud.security" },
    { icon: Code2, key: "hero.aud.developers" },
    { icon: Cable, key: "hero.aud.integrators" },
  ];

  const whySip = [
    { icon: Layers, key: "hero.why.oneInterface" },
    { icon: Layers, key: "hero.why.allTools" },
    { icon: Brain, key: "hero.why.ai" },
    { icon: Wrench, key: "hero.why.catalog" },
    { icon: Route, key: "hero.why.automation" },
    { icon: Building2, key: "hero.why.enterprise" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan/5 rounded-full blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_70%)]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-20">
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

        {/* Headline — What is SIP? */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
        >
          <span className="text-accent">SIP</span>
          <span className="text-foreground mx-3">—</span>
          <span className="text-gradient-accent">{t("hero.headline1")}</span>
        </motion.h1>

        {/* Tagline — Operating system for business security */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-4 text-xl sm:text-2xl md:text-3xl font-semibold text-muted-foreground max-w-3xl mx-auto"
        >
          {t("hero.taglineShort")}
        </motion.p>

        {/* What does it do? — 6 capability pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
        >
          {capabilities.map((cap) => (
            <span
              key={cap.key}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground"
            >
              <cap.icon className="w-3.5 h-3.5 text-accent" />
              {t(cap.key)}
            </span>
          ))}
        </motion.div>

        {/* For whom? — Audience tags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
          <span className="text-sm text-muted-2">{t("hero.forWhom")}</span>
          {audiences.map((aud) => (
            <span
              key={aud.key}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground"
            >
              <aud.icon className="w-3.5 h-3.5 text-cyan" />
              {t(aud.key)}
            </span>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="/app/marketplace"
            className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold bg-accent text-background rounded-xl hover:bg-accent-hover transition-all glow-accent"
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

        {/* Why SIP? — 6 differentiators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-12 max-w-4xl mx-auto"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t("hero.whyTitle")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {whySip.map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface border border-border text-left"
              >
                <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{t(item.key)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Terminal preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
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

        {/* Stats row — real indicators, not vanity metrics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
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
