/**
 * /app/command-center - Command Center (INT-049 BLOCK 5)
 *
 * Replaces the old Dashboard. Shows aggregated view across all 4 AI centers:
 * Security Health (SIP), Platform Health (AI CTO), AIS Status, Automation Status (AIO),
 * Recent Activity, Recommendations, Next Actions, Current Goals.
 */

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import { getArchitectureRegistry, getOverallArchitectureScore, getCenterScoreColor, getCenterScoreBg } from "@/lib/architecture-registry";
import { getReadinessStats } from "@/lib/product-readiness";
import { getEvidenceStats } from "@/lib/evidence-registry";
import {
  ShieldCheck,
  Sparkles,
  Brain,
  Cpu,
  Activity,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Zap,
  Bell,
  Rocket,
} from "lucide-react";

const CENTER_ICON: Record<string, React.ElementType> = {
  SIP: ShieldCheck,
  AIS: Sparkles,
  AI_CTO: Brain,
  AIO: Cpu,
};

const CENTER_LINK: Record<string, string> = {
  SIP: "/app/architecture/sip",
  AIS: "/app/architecture/ais",
  AI_CTO: "/app/architecture/cto",
  AIO: "/app/architecture/aio",
};

export default function CommandCenterPage() {
  const { t } = useI18n();
  const archRegistry = getArchitectureRegistry();
  const centers = Object.values(archRegistry.centers);
  const overallScore = getOverallArchitectureScore();
  const readinessStats = getReadinessStats();
  const evidenceStats = getEvidenceStats();

  const securityHealth = centers.find((c) => c.id === "SIP")?.score ?? 0;
  const platformHealth = readinessStats.averageProductScore;
  const aisStatus = centers.find((c) => c.id === "AIS")?.score ?? 0;
  const automationStatus = centers.find((c) => c.id === "AIO")?.score ?? 0;

  const recentActivity = [
    { time: "23:50", event: "INT-049 Platform Evolution Framework deployed", center: "AI_CTO" as const, severity: "info" },
    { time: "23:30", event: "Architecture Registry synchronized (4 centers)", center: "AI_CTO" as const, severity: "info" },
    { time: "22:00", event: "Product Readiness Dashboard verified on production", center: "AI_CTO" as const, severity: "success" },
    { time: "21:00", event: "Trust Audit completed: 7 findings (2 critical)", center: "AI_CTO" as const, severity: "warning" },
    { time: "20:30", event: "AIS Cinematic Notification v2 deployed", center: "AIS" as const, severity: "success" },
    { time: "19:00", event: "System Status page reconstructed from production", center: "AI_CTO" as const, severity: "info" },
  ];

  const recommendations = [
    { priority: 1, title: "Real Authentication (SSO)", impact: "Critical for trust", center: "AI_CTO" as const },
    { priority: 2, title: "Real Integrations (replace mock toggles)", impact: "Critical for trust", center: "SIP" as const },
    { priority: 3, title: "Real-time scanner progress (SSE)", impact: "Critical for trust", center: "SIP" as const },
    { priority: 4, title: "Backend persistence (replace localStorage)", impact: "High for retention", center: "AIO" as const },
    { priority: 5, title: "Onboarding wizard for new users", impact: "High for onboarding", center: "AIS" as const },
  ];

  const nextActions = [
    { label: "Open Architecture Map", href: "/app/architecture", icon: Brain },
    { label: "View Product Readiness", href: "/app/product-readiness", icon: Target },
    { label: "Check Evidence Center", href: "/app/evidence", icon: CheckCircle2 },
    { label: "Run Evolution Analysis", href: "/app/evolution", icon: Zap },
    { label: "View System Status", href: "/app/system-status", icon: Activity },
  ];

  const currentGoals = [
    { title: "Reach 70% product readiness", current: 55, target: 70, center: "AI_CTO" as const },
    { title: "Close all critical trust findings", current: 5, target: 0, center: "AI_CTO" as const, inverse: true },
    { title: "Achieve AIO automation 60%+", current: 37, target: 60, center: "AIO" as const },
    { title: "Sync backend to INT-049", current: 0, target: 100, center: "AIO" as const },
  ];

  return (
    <Container>
      <div className="max-w-7xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("command.title")}</h1>
              <p className="text-sm text-muted-2">{t("command.subtitle")}</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-2">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t("command.live")}
            </div>
            <div>commit 13489fe</div>
          </div>
        </div>

        {/* 4 Health indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HealthCard
            label={t("command.securityHealth")}
            value={securityHealth}
            icon={ShieldCheck}
            color="from-blue-500 to-cyan-500"
            href={CENTER_LINK.SIP}
          />
          <HealthCard
            label={t("command.platformHealth")}
            value={platformHealth}
            icon={Brain}
            color="from-emerald-500 to-teal-500"
            href="/app/product-readiness"
          />
          <HealthCard
            label={t("command.aisStatus")}
            value={aisStatus}
            icon={Sparkles}
            color="from-violet-500 to-fuchsia-500"
            href={CENTER_LINK.AIS}
          />
          <HealthCard
            label={t("command.automationStatus")}
            value={automationStatus}
            icon={Cpu}
            color="from-amber-500 to-orange-500"
            href={CENTER_LINK.AIO}
          />
        </div>

        {/* Overall score */}
        <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-foreground">{t("command.overallArchitecture")}</span>
            </div>
            <span className={`text-3xl font-bold tabular-nums ${getCenterScoreColor(overallScore)}`}>{overallScore}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-foreground/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full ${getCenterScoreBg(overallScore)}`}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-muted-2">{t("command.functionalReadiness")}</div>
              <div className="text-emerald-500 font-bold">91%</div>
            </div>
            <div>
              <div className="text-muted-2">{t("command.productReadiness")}</div>
              <div className="text-amber-500 font-bold">55%</div>
            </div>
            <div>
              <div className="text-muted-2">{t("command.featuresVerified")}</div>
              <div className="text-foreground font-bold">{evidenceStats.verified} / {evidenceStats.total}</div>
            </div>
            <div>
              <div className="text-muted-2">{t("command.criticalFindings")}</div>
              <div className="text-red-500 font-bold">{readinessStats.criticalTrustFindings}</div>
            </div>
          </div>
        </div>

        {/* Recommendations + Next Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recommendations */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">{t("command.recommendations")}</span>
            </div>
            <div className="space-y-2">
              {recommendations.map((r) => {
                const Icon = CENTER_ICON[r.center];
                return (
                  <Link
                    key={r.priority}
                    href={CENTER_LINK[r.center]}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2/50 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[11px] font-bold text-amber-500 shrink-0">
                      {r.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{r.title}</div>
                      <div className="text-[10px] text-muted-2">{r.impact}</div>
                    </div>
                    <Icon className="w-3.5 h-3.5 text-muted-2 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Next Actions */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-foreground">{t("command.nextActions")}</span>
            </div>
            <div className="space-y-2">
              {nextActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-2/50 border border-border hover:border-violet-500/30 transition-colors group"
                  >
                    <Icon className="w-4 h-4 text-violet-500 shrink-0" />
                    <span className="flex-1 text-sm text-foreground">{a.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-2 group-hover:text-violet-500 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Current Goals */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">{t("command.currentGoals")}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentGoals.map((g, i) => {
              const Icon = CENTER_ICON[g.center];
              const progress = g.inverse
                ? Math.max(0, 100 - (g.current / Math.max(g.target + 1, 1)) * 100)
                : Math.min(100, (g.current / g.target) * 100);
              return (
                <div key={i} className="p-3 rounded-lg bg-surface-2/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span className="text-xs font-medium text-foreground flex-1">{g.title}</span>
                    <span className="text-xs font-bold tabular-nums text-foreground/80">
                      {g.current}{g.inverse ? " open" : `/${g.target}`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-foreground/5 overflow-hidden">
                    <div
                      className={`h-full ${progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">{t("command.recentActivity")}</span>
          </div>
          <div className="space-y-2">
            {recentActivity.map((a, i) => {
              const Icon = CENTER_ICON[a.center];
              const severityColor =
                a.severity === "success" ? "text-emerald-500" :
                a.severity === "warning" ? "text-amber-500" :
                "text-blue-500";
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2/50">
                  <code className="text-[10px] text-muted-2 font-mono w-12 shrink-0">{a.time}</code>
                  <Icon className={`w-3.5 h-3.5 ${severityColor} shrink-0`} />
                  <span className="text-xs text-foreground/80 flex-1">{a.event}</span>
                  <span className="text-[10px] text-muted-2 px-1.5 py-0.5 rounded bg-foreground/5 shrink-0">
                    {a.center === "AI_CTO" ? "CTO" : a.center}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA: Explore AI Architecture */}
        <Link
          href="/app/architecture"
          className="block rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10 p-5 hover:border-violet-500/40 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">{t("command.exploreArchitecture")}</div>
              <div className="text-xs text-muted-2">{t("command.exploreArchitectureDesc")}</div>
            </div>
            <ArrowRight className="w-5 h-5 text-violet-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </Container>
  );
}

function HealthCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  href: string;
}) {
  const valueColor = value >= 85 ? "text-emerald-500" : value >= 70 ? "text-amber-500" : value >= 50 ? "text-orange-500" : "text-red-500";
  const barColor = value >= 85 ? "bg-emerald-500" : value >= 70 ? "bg-amber-500" : value >= 50 ? "bg-orange-500" : "bg-red-500";
  return (
    <Link
      href={href}
      className="block rounded-xl border border-border bg-surface p-4 hover:border-violet-500/30 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-[10px] text-muted-2 uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}%</div>
      <div className="mt-2 w-full h-1.5 rounded-full bg-foreground/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8 }}
          className={`h-full ${barColor}`}
        />
      </div>
    </Link>
  );
}
