"use client";

import { motion } from "framer-motion";
import { ShieldAlert, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { BusinessResult } from "@/components/ui/BusinessResult";

const risks = [
  { id: "RISK-001", name: "Unpatched Critical Vulnerabilities", severity: "critical", score: 9.2, trend: "up", affectedAssets: 3, description: "Multiple critical CVEs remain unpatched across production infrastructure." },
  { id: "RISK-002", name: "Exposed Internal Services", severity: "high", score: 7.8, trend: "down", affectedAssets: 2, description: "Internal services accessible from external networks without authentication." },
  { id: "RISK-003", name: "Insecure API Authentication", severity: "high", score: 7.5, trend: "stable", affectedAssets: 1, description: "API endpoints using weak or deprecated authentication mechanisms." },
  { id: "RISK-004", name: "Missing Encryption in Transit", severity: "medium", score: 5.5, trend: "down", affectedAssets: 4, description: "Several services communicate over unencrypted channels." },
  { id: "RISK-005", name: "Insufficient Logging", severity: "medium", score: 4.8, trend: "up", affectedAssets: 6, description: "Critical systems lack proper audit logging for security events." },
];

const severityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red", bg: "bg-red-muted" },
  high: { color: "text-amber", bg: "bg-amber-muted" },
  medium: { color: "text-cyan", bg: "bg-cyan-muted" },
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-red" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-accent" />;
  return <Minus className="w-4 h-4 text-muted" />;
};

export default function RisksPage() {
  return (
    <div className="animate-page-in">
      <div id="risks-header" className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Risks</h1>
        <p className="mt-2 text-muted-2">Risk assessment and management for your security posture.</p>
        <div className="flex items-center gap-2 mt-2">
          <ContextualHelp section="risks" />
          <DemoBadge />
        </div>
        <BusinessResult type="risks_known" className="mt-4" />
      </div>

      <div id="risks-list" className="space-y-3">
        {risks.map((risk, i) => {
          const config = severityConfig[risk.severity] || severityConfig.medium;
          return (
            <motion.div
              key={risk.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                  <ShieldAlert className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{risk.name}</h3>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase ${config.bg} ${config.color}`}>
                      {risk.severity}
                    </span>
                    <TrendIcon trend={risk.trend} />
                  </div>
                  <p className="text-xs text-muted-2 mt-1">{risk.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                    <span>Risk Score: <span className="font-mono font-medium text-foreground">{risk.score}</span></span>
                    <span>Affected Assets: <span className="font-medium text-foreground">{risk.affectedAssets}</span></span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div id="risks-faq" className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionFAQ section="risks" />
        <SmartNextStep {...RECOMMENDATION_CHAINS["risks"]} />
      </div>
    </div>
  );
}
