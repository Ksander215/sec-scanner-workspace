/**
 * /app/system-status — Platform Status (реконструировано в INT-044)
 *
 * Источник: production HTML /var/www/sec-scanner.pro/app/system-status.html
 * Сохранена структура: 12 модулей с VERIFIED/PARTIAL/FAIL статусами,
 * блок правил верификации, блок pipeline агента.
 *
 * Принципы INT-044:
 *   Never Trust Code — сначала визуальная проверка на production
 *   No Completion Without E2E — задача не завершена без прохождения сценария
 *   Production Is The Source Of Truth — только production является источником истины
 *   Every Feature Must Have Evidence — каждая функция должна иметь доказательство
 */

"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  Activity,
  Sparkles,
  ShieldCheck,
  Radar,
  Network,
  GitFork,
  FileBarChart,
  Store,
  Briefcase,
  Cable,
  GitBranch,
  Bell,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Check,
  X,
  ChevronRight,
} from "lucide-react";

/* --- Types ------------------------------------------------------------ */

export type VerificationStatus = "VERIFIED" | "PARTIAL" | "FAIL";
export type E2EResult = "PASS" | "FAIL" | null;

export interface ModuleCheck {
  nameKey: string;
  status: VerificationStatus;
}

export interface VerificationModule {
  id: string;
  nameKey: string;
  icon: React.ElementType;
  status: VerificationStatus;
  percentage: number;
  weeklyChange: number;
  lastChecked: string;
  hasScreenshot: boolean;
  e2eResult: E2EResult;
  checks: ModuleCheck[];
}

/* --- Verification Rules ----------------------------------------------- */

const VERIFICATION_RULES: { principleKey: string; principleDescKey: string }[] = [
  {
    principleKey: "registry.rule.neverTrustCode",
    principleDescKey: "registry.rule.neverTrustCode.desc",
  },
  {
    principleKey: "registry.rule.noCompletionWithoutE2E",
    principleDescKey: "registry.rule.noCompletionWithoutE2E.desc",
  },
  {
    principleKey: "registry.rule.productionIsSource",
    principleDescKey: "registry.rule.productionIsSource.desc",
  },
  {
    principleKey: "registry.rule.everyFeatureEvidence",
    principleDescKey: "registry.rule.everyFeatureEvidence.desc",
  },
];

/* --- Agent Pipeline Stages -------------------------------------------- */

const PIPELINE_STAGES: string[] = [
  "registry.pipeline.code",
  "registry.pipeline.build",
  "registry.pipeline.deploy",
  "registry.pipeline.verify",
  "registry.pipeline.e2e",
  "registry.pipeline.updateStatus",
  "registry.pipeline.done",
];

/* --- Modules (реконструировано из production HTML) -------------------- */

const MODULES: VerificationModule[] = [
  {
    id: "ais",
    nameKey: "registry.ais",
    icon: Sparkles,
    status: "VERIFIED",
    percentage: 92,
    weeklyChange: 0,
    lastChecked: "2026-07-21T21:47:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.ais.cinematic", status: "VERIFIED" },
      { nameKey: "registry.ais.fab", status: "VERIFIED" },
      { nameKey: "registry.ais.notifications", status: "VERIFIED" },
      { nameKey: "registry.ais.memory", status: "VERIFIED" },
      { nameKey: "registry.ais.sound", status: "VERIFIED" },
      { nameKey: "registry.ais.settings", status: "VERIFIED" },
      { nameKey: "registry.ais.learning", status: "VERIFIED" },
      { nameKey: "registry.ais.decision", status: "VERIFIED" },
      { nameKey: "registry.ais.confusion", status: "VERIFIED" },
    ],
  },
  {
    id: "dashboard",
    nameKey: "registry.dashboard",
    icon: Activity,
    status: "VERIFIED",
    percentage: 90,
    weeklyChange: 0,
    lastChecked: "2026-07-21T22:00:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.dash.metrics", status: "VERIFIED" },
      { nameKey: "registry.dash.charts", status: "VERIFIED" },
      { nameKey: "registry.dash.realtime", status: "VERIFIED" },
      { nameKey: "registry.dash.ui", status: "VERIFIED" },
    ],
  },
  {
    id: "scanner",
    nameKey: "registry.scanner",
    icon: Radar,
    status: "VERIFIED",
    percentage: 88,
    weeklyChange: 0,
    lastChecked: "2026-07-21T21:44:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.scanner.form", status: "VERIFIED" },
      { nameKey: "registry.scanner.ui", status: "VERIFIED" },
      { nameKey: "registry.scanner.backend", status: "VERIFIED" },
      { nameKey: "registry.scanner.queue", status: "VERIFIED" },
      { nameKey: "registry.scanner.results", status: "VERIFIED" },
    ],
  },
  {
    id: "knowledge-graph",
    nameKey: "registry.knowledgeGraph",
    icon: Network,
    status: "VERIFIED",
    percentage: 84,
    weeklyChange: 0,
    lastChecked: "2026-07-21T20:30:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.kg.visualization", status: "VERIFIED" },
      { nameKey: "registry.kg.interaction", status: "VERIFIED" },
      { nameKey: "registry.kg.data", status: "VERIFIED" },
    ],
  },
  {
    id: "attack-paths",
    nameKey: "registry.attackPaths",
    icon: GitFork,
    status: "VERIFIED",
    percentage: 82,
    weeklyChange: 0,
    lastChecked: "2026-07-21T19:00:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.ap.visualization", status: "VERIFIED" },
      { nameKey: "registry.ap.interaction", status: "VERIFIED" },
      { nameKey: "registry.ap.data", status: "VERIFIED" },
    ],
  },
  {
    id: "reports",
    nameKey: "registry.reports",
    icon: FileBarChart,
    status: "VERIFIED",
    percentage: 79,
    weeklyChange: 0,
    lastChecked: "2026-07-21T19:15:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.reports.generate", status: "VERIFIED" },
      { nameKey: "registry.reports.download", status: "VERIFIED" },
      { nameKey: "registry.reports.email", status: "VERIFIED" },
      { nameKey: "registry.reports.ui", status: "VERIFIED" },
    ],
  },
  {
    id: "marketplace",
    nameKey: "registry.marketplace",
    icon: Store,
    status: "VERIFIED",
    percentage: 75,
    weeklyChange: 0,
    lastChecked: "2026-07-21T20:00:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.market.ui", status: "VERIFIED" },
      { nameKey: "registry.market.wizard", status: "VERIFIED" },
      { nameKey: "registry.market.install", status: "VERIFIED" },
    ],
  },
  {
    id: "workspace",
    nameKey: "registry.workspace",
    icon: Briefcase,
    status: "VERIFIED",
    percentage: 70,
    weeklyChange: 0,
    lastChecked: "2026-07-21T18:30:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.ws.ui", status: "VERIFIED" },
      { nameKey: "registry.ws.pipelines", status: "VERIFIED" },
      { nameKey: "registry.ws.assets", status: "VERIFIED" },
      { nameKey: "registry.ws.monitoring", status: "VERIFIED" },
    ],
  },
  {
    id: "integrations",
    nameKey: "registry.integrations",
    icon: Cable,
    status: "PARTIAL",
    percentage: 63,
    weeklyChange: 0,
    lastChecked: "2026-07-21T18:00:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.int.ui", status: "VERIFIED" },
      { nameKey: "registry.int.ssh", status: "PARTIAL" },
      { nameKey: "registry.int.apiKeys", status: "PARTIAL" },
      { nameKey: "registry.int.webhook", status: "PARTIAL" },
      { nameKey: "registry.int.sync", status: "PARTIAL" },
    ],
  },
  {
    id: "repositories",
    nameKey: "registry.repositories",
    icon: GitBranch,
    status: "PARTIAL",
    percentage: 61,
    weeklyChange: 0,
    lastChecked: "2026-07-21T17:30:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.repo.ui", status: "VERIFIED" },
      { nameKey: "registry.repo.connect", status: "PARTIAL" },
      { nameKey: "registry.repo.sync", status: "PARTIAL" },
    ],
  },
  {
    id: "notifications",
    nameKey: "registry.notifications",
    icon: Bell,
    status: "PARTIAL",
    percentage: 54,
    weeklyChange: 0,
    lastChecked: "2026-07-21T16:00:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.notif.rules", status: "PARTIAL" },
      { nameKey: "registry.notif.channels", status: "PARTIAL" },
      { nameKey: "registry.notif.delivery", status: "PARTIAL" },
    ],
  },
  {
    id: "pricing",
    nameKey: "registry.pricing",
    icon: CreditCard,
    status: "PARTIAL",
    percentage: 45,
    weeklyChange: -2,
    lastChecked: "2026-07-21T15:00:00+03:00",
    hasScreenshot: true,
    e2eResult: "PASS",
    checks: [
      { nameKey: "registry.price.plans", status: "PARTIAL" },
      { nameKey: "registry.price.checkout", status: "PARTIAL" },
      { nameKey: "registry.price.ui", status: "VERIFIED" },
    ],
  },
];

/* --- Status visual config --------------------------------------------- */

const STATUS_CONFIG: Record<
  VerificationStatus,
  {
    icon: React.ElementType;
    bg: string;
    border: string;
    text: string;
    bgSolid: string;
    barColor: string;
    checkIcon: string;
  }
> = {
  VERIFIED: {
    icon: CheckCircle2,
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    bgSolid: "bg-emerald-600 text-white",
    barColor: "bg-emerald-500",
    checkIcon: "text-emerald-500",
  },
  PARTIAL: {
    icon: AlertCircle,
    bg: "bg-amber-500/10",
    border: "border-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    bgSolid: "bg-amber-600 text-white",
    barColor: "bg-amber-500",
    checkIcon: "text-amber-500",
  },
  FAIL: {
    icon: XCircle,
    bg: "bg-red-500/10",
    border: "border-red-500/15",
    text: "text-red-600 dark:text-red-400",
    bgSolid: "bg-red-600 text-white",
    barColor: "bg-red-500",
    checkIcon: "text-red-500",
  },
};

/* --- Format date ------------------------------------------------------ */

function formatCheckDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return { date, time };
}

/* --- Main page -------------------------------------------------------- */

export default function SystemStatusPage() {
  const { t } = useI18n();
  const [activeFilter, setActiveFilter] = useState<VerificationStatus | "ALL">("ALL");

  const stats = useMemo(() => {
    const total = MODULES.length;
    const verified = MODULES.filter((m) => m.status === "VERIFIED").length;
    const partial = MODULES.filter((m) => m.status === "PARTIAL").length;
    const fail = MODULES.filter((m) => m.status === "FAIL").length;
    const avgPercentage = Math.round(MODULES.reduce((s, m) => s + m.percentage, 0) / total);
    const totalChecks = MODULES.reduce((s, m) => s + m.checks.length, 0);
    const passedChecks = MODULES.reduce(
      (s, m) => s + m.checks.filter((c) => c.status === "VERIFIED").length,
      0
    );
    return { total, verified, partial, fail, avgPercentage, totalChecks, passedChecks };
  }, []);

  const filteredModules = useMemo(() => {
    if (activeFilter === "ALL") return MODULES;
    return MODULES.filter((m) => m.status === activeFilter);
  }, [activeFilter]);

  const filters: { key: VerificationStatus | "ALL"; label: string; count: number }[] = [
    { key: "ALL", label: t("registry.filter.all"), count: stats.total },
    { key: "VERIFIED", label: t("registry.status.verified"), count: stats.verified },
    { key: "PARTIAL", label: t("registry.status.partial"), count: stats.partial },
    { key: "FAIL", label: t("registry.status.fail"), count: stats.fail },
  ];

  return (
    <Container>
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {t("registry.title")}
              </h1>
              <p className="text-sm text-muted-2">
                {t("registry.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Overall readiness */}
        <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">
              {t("registry.overallReadiness")}
            </span>
          </div>
          <div className="flex items-center gap-6 mb-3">
            <div className="text-4xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
              {stats.avgPercentage}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("registry.status.verified")} {stats.verified}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t("registry.status.partial")} {stats.partial}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                  <XCircle className="w-3.5 h-3.5" />
                  {t("registry.status.fail")} {stats.fail}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full h-2.5 rounded-full bg-foreground/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.avgPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
            />
          </div>
        </div>

        {/* Summary stats */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">
              {t("registry.checksSummary")}
            </span>
            <span className="text-xs text-muted-2">
              {stats.passedChecks} / {stats.totalChecks} {t("registry.passed")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeFilter === f.key
                    ? f.key === "VERIFIED"
                      ? "bg-emerald-600 text-white"
                      : f.key === "PARTIAL"
                      ? "bg-amber-600 text-white"
                      : f.key === "FAIL"
                      ? "bg-red-600 text-white"
                      : "bg-foreground text-background"
                    : "text-muted-2 hover:text-foreground"
                }`}
              >
                {f.label} {f.count}
              </button>
            ))}
          </div>
        </div>

        {/* Modules list */}
        <div className="space-y-3">
          {filteredModules.map((m) => {
            const cfg = STATUS_CONFIG[m.status];
            const Icon = m.icon;
            const StatusIcon = cfg.icon;
            const { date, time } = formatCheckDate(m.lastChecked);

            return (
              <div
                key={m.id}
                className={`rounded-xl border ${cfg.border} bg-surface overflow-hidden`}
              >
                <div className="p-4 cursor-pointer hover:bg-surface-2/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                      <Icon className={`w-5 h-5 ${cfg.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {t(m.nameKey)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${cfg.bg} ${cfg.text}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {m.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`flex-1 h-1.5 rounded-full bg-foreground/5 overflow-hidden`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${m.percentage}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full ${cfg.barColor}`}
                          />
                        </div>
                        <span className="text-sm font-bold text-foreground tabular-nums">
                          {m.percentage}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-2">
                        <span>
                          {date} {time}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 ${
                            m.weeklyChange > 0 ? "text-emerald-500" : m.weeklyChange < 0 ? "text-red-500" : "text-muted-2"
                          }`}
                        >
                          {m.weeklyChange > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : m.weeklyChange < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : null}
                          {m.weeklyChange > 0 ? `+${m.weeklyChange}` : m.weeklyChange}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 ${m.hasScreenshot ? "text-emerald-500" : "text-foreground/30"}`}>
                          <ExternalLink className="w-3 h-3" />
                          {m.hasScreenshot ? t("registry.screenshot") : t("registry.noScreenshot")}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 ${
                            m.e2eResult === "PASS"
                              ? "text-emerald-500"
                              : m.e2eResult === "FAIL"
                              ? "text-red-500"
                              : "text-foreground/30"
                          }`}
                        >
                          {m.e2eResult === "PASS" ? (
                            <Check className="w-3 h-3" />
                          ) : m.e2eResult === "FAIL" ? (
                            <X className="w-3 h-3" />
                          ) : null}
                          E2E: {m.e2eResult ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Sub-checks */}
                <div className="border-t border-border p-4 space-y-3">
                  {m.checks.map((c) => {
                    const ccfg = STATUS_CONFIG[c.status];
                    const CIcon = ccfg.icon;
                    return (
                      <div key={c.nameKey} className="flex items-center gap-2.5 py-1.5">
                        <CIcon className={`w-3.5 h-3.5 ${ccfg.checkIcon}`} />
                        <span className="text-xs text-foreground/70 flex-1">{t(c.nameKey)}</span>
                        <span
                          className={`text-[10px] font-bold tracking-wider uppercase ${ccfg.text}`}
                        >
                          {c.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Verification rules */}
        <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">
              {t("registry.rulesTitle")}
            </span>
          </div>
          <div className="space-y-3">
            {VERIFICATION_RULES.map((r) => (
              <div key={r.principleKey} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-foreground">{t(r.principleKey)}</div>
                  <div className="text-xs text-muted-2">{t(r.principleDescKey)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent pipeline */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">
              {t("registry.pipelineTitle")}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-md bg-foreground/5 text-foreground/60 font-medium">
                  {t(stage)}
                </span>
                {i < PIPELINE_STAGES.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
