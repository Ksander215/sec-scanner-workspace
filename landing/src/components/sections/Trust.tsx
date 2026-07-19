"use client";

import { motion } from "framer-motion";
import {
  Shield,
  GitBranch,
  Users,
  Lock,
  FileCheck,
  Cpu,
  CheckCircle2,
  Server,
  Code2,
  Activity,
  Cloud,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export function Trust() {
  const { t } = useI18n();

  const trustItems = [
    {
      icon: GitBranch,
      title: t("trust.opensource.title"),
      desc: t("trust.opensource.desc"),
    },
    {
      icon: FileCheck,
      title: t("trust.license.title"),
      desc: t("trust.license.desc"),
    },
    {
      icon: Users,
      title: t("trust.community.title"),
      desc: t("trust.community.desc"),
    },
    {
      icon: Cpu,
      title: t("trust.engine.title"),
      desc: t("trust.engine.desc"),
    },
    {
      icon: Shield,
      title: t("trust.verified.title"),
      desc: t("trust.verified.desc"),
    },
    {
      icon: Activity,
      title: t("trust.audit.title"),
      desc: t("trust.audit.desc"),
    },
    {
      icon: Lock,
      title: t("trust.secureStorage"),
      desc: t("trust.secureStorage.desc"),
    },
    {
      icon: Server,
      title: t("trust.localRun"),
      desc: t("trust.localRun.desc"),
    },
    {
      icon: Cloud,
      title: t("trust.selfHosted"),
      desc: t("trust.selfHosted.desc"),
    },
    {
      icon: Code2,
      title: t("trust.api"),
      desc: t("trust.api.desc"),
    },
    {
      icon: Activity,
      title: t("trust.auditLogFeature"),
      desc: t("trust.auditLogFeature.desc"),
    },
  ];

  const indicators = [
    { value: "MIT", label: t("trust.ind.license") },
    { value: "100%", label: t("trust.ind.opensource") },
    { value: "370+", label: t("trust.ind.rules") },
    { value: "0", label: t("trust.ind.tracking") },
  ];

  return (
    <section id="trust" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface to-transparent" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            {t("trust.label")}
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {t("trust.whyTrust")}
          </h2>
          <p className="mt-4 text-lg text-muted-2">
            {t("trust.subtitle")}
          </p>
        </motion.div>

        {/* Trust items grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trustItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-xl border border-border bg-surface hover:bg-surface-2 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent-muted text-accent">
                  <item.icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Real indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
        >
          {indicators.map((ind) => (
            <div
              key={ind.label}
              className="text-center px-4 py-5 rounded-xl border border-border bg-surface"
            >
              <div className="text-2xl font-bold text-accent">{ind.value}</div>
              <div className="mt-1 text-xs text-muted">{ind.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
