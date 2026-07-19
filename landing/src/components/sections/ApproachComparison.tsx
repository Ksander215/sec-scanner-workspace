"use client";

import { motion } from "framer-motion";
import { ArrowRight, Layers, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export function ApproachComparison() {
  const { t } = useI18n();

  const tools = [
    { key: "approachComparison.tools.nmap", name: "Nmap" },
    { key: "approachComparison.tools.nessus", name: "Nessus" },
    { key: "approachComparison.tools.burp", name: "Burp Suite" },
    { key: "approachComparison.tools.defectDojo", name: "DefectDojo" },
    { key: "approachComparison.tools.excel", name: "Excel" },
  ];

  return (
    <section id="approach" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            {t("approachComparison.label")}
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {t("approachComparison.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-2">
            {t("approachComparison.subtitle")}
          </p>
        </motion.div>

        {/* Comparison layout */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mt-16"
        >
          <div className="flex flex-col lg:flex-row items-stretch gap-6">
            {/* Left: scattered tools */}
            <div className="flex-1">
              <h3 className="text-sm font-medium text-muted-2 uppercase tracking-wider mb-4">
                {t("approachComparison.instead")}
              </h3>
              <div className="space-y-3">
                {tools.map((tool, i) => (
                  <motion.div
                    key={tool.key}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface"
                  >
                    <div className="w-2 h-2 rounded-full bg-muted-2 shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{tool.name}</span>
                    <span className="text-xs text-muted-2 ml-auto">{t(tool.key)}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Center arrow */}
            <div className="flex items-center justify-center py-4 lg:py-0">
              <div className="flex flex-col items-center gap-2">
                <ArrowRight className="w-8 h-8 text-accent hidden lg:block" />
                <div className="lg:hidden flex items-center gap-2 text-accent">
                  <span className="text-sm font-semibold">{t("approachComparison.arrow")}</span>
                </div>
              </div>
            </div>

            {/* Right: SIP unified */}
            <div className="flex-1">
              <h3 className="text-sm font-medium text-accent uppercase tracking-wider mb-4">
                {t("approachComparison.unified")}
              </h3>
              <div className="p-6 rounded-2xl border-2 border-accent/30 bg-accent-muted/30 h-full flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <Layers className="w-6 h-6 text-accent" />
                  <span className="text-lg font-bold text-accent">SIP</span>
                </div>
                <div className="space-y-2">
                  {tools.map((tool) => (
                    <div key={tool.key} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      <span className="text-sm text-foreground">{t(tool.key)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm text-muted-2 leading-relaxed">
                  {t("approachComparison.result")}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
