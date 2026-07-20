"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Minus } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

type FeatureSupport = "yes" | "no" | "partial";

interface Competitor {
  name: string;
  features: FeatureSupport[];
}

export function Comparison() {
  const { t } = useI18n();

  const features = [
    "comparison.feat.unifiedInterface",
    "comparison.feat.vulnScan",
    "comparison.feat.aiAnalysis",
    "comparison.feat.marketplace",
    "comparison.feat.attackPaths",
    "comparison.feat.infraMap",
    "comparison.feat.automation",
    "comparison.feat.reports",
    "comparison.feat.enterprise",
    "comparison.feat.opensource",
  ];

  const competitors: Competitor[] = [
    { name: "SIP", features: ["yes", "yes", "yes", "yes", "yes", "yes", "yes", "yes", "yes", "yes"] },
    { name: "Nmap", features: ["no", "yes", "no", "no", "no", "no", "partial", "partial", "no", "yes"] },
    { name: "Nessus", features: ["no", "yes", "no", "no", "no", "no", "partial", "yes", "yes", "no"] },
    { name: "Burp Suite", features: ["no", "yes", "partial", "no", "no", "no", "partial", "yes", "partial", "no"] },
    { name: "OpenVAS", features: ["no", "yes", "no", "no", "no", "no", "no", "partial", "no", "yes"] },
    { name: "Splunk", features: ["partial", "partial", "partial", "no", "no", "no", "yes", "yes", "yes", "no"] },
    { name: "DefectDojo", features: ["partial", "no", "no", "no", "no", "no", "partial", "yes", "partial", "yes"] },
  ];

  const renderCell = (support: FeatureSupport) => {
    switch (support) {
      case "yes":
        return <CheckCircle2 className="w-5 h-5 text-accent mx-auto" />;
      case "no":
        return <XCircle className="w-5 h-5 text-red/50 mx-auto" />;
      case "partial":
        return <Minus className="w-5 h-5 text-amber/70 mx-auto" />;
    }
  };

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {t("comparison.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-2">
            {t("comparison.subtitle")}
          </p>
        </motion.div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 overflow-x-auto"
        >
          <table className="w-full border-collapse">
            {/* Header */}
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-2 whitespace-nowrap">
                  {t("comparison.feature")}
                </th>
                {competitors.map((c) => (
                  <th
                    key={c.name}
                    className={`px-4 py-3 text-sm font-semibold whitespace-nowrap text-center ${
                      c.name === "SIP"
                        ? "text-accent"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div className={`${c.name === "SIP" ? "px-3 py-1 rounded-lg bg-accent-muted border border-accent-border" : ""}`}>
                      {c.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            {/* Body */}
            <tbody>
              {features.map((feat, i) => (
                <tr
                  key={feat}
                  className={`border-t border-border ${i % 2 === 0 ? "bg-surface" : "bg-surface-2"}`}
                >
                  <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                    {t(feat)}
                  </td>
                  {competitors.map((c) => (
                    <td
                      key={`${c.name}-${feat}`}
                      className={`px-4 py-3 text-center ${
                        c.name === "SIP" ? "bg-accent-muted/30" : ""
                      }`}
                    >
                      {renderCell(c.features[i])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center text-sm text-muted-2"
        >
          {t("comparison.note")}
        </motion.p>
      </div>
    </section>
  );
}
