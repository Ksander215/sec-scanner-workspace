/**
 * /app/evidence - Product Evidence Center (INT-045 BLOCK 1)
 *
 * Single source of truth for feature verification with evidence.
 * Shows for each feature:
 *   - Name, ID, status
 *   - Last verification date
 *   - Commit, version
 *   - Production URL
 *   - E2E / Regression / Build / Browser / Visual status
 *   - Screenshots (clickable thumbnails)
 *
 * Plus:
 *   - Production Consistency panel (LOCAL vs GITHUB vs SERVER vs PRODUCTION)
 *   - AIS Module-level verification (10 modules)
 *   - Aggregate stats
 */

"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  getEvidenceRegistry,
  getAllEvidence,
  getEvidenceStats,
  getProductionConsistency,
  getAISModules,
  getAISModuleNames,
  isFullyVerified,
  isBrokenOrMissing,
  hasVisualEvidence,
  getStatusLabel,
  getStatusColor,
  getCheckColor,
  getCheckIcon,
  type FeatureEvidence,
  type EvidenceFeatureStatus,
  type CheckStatus,
} from "@/lib/evidence-registry";
import {
  ShieldCheck,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Circle,
  ExternalLink,
  Sparkles,
  Activity,
  Database,
  Server,
  HardDrive,
  Film,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

/* --- Status icon helper --- */

function StatusBadge({ status }: { status: EvidenceFeatureStatus }) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  const Icon =
    status === "verified" || status === "implemented_not_verified"
      ? CheckCircle2
      : status === "broken" || status === "missing" || status === "removed"
      ? XCircle
      : status === "deprecated" || status === "planned" || status === "not_started"
      ? Circle
      : AlertCircle;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${color} text-[10px] font-bold tracking-wider uppercase`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function CheckIcon({ check }: { check: CheckStatus }) {
  const color = getCheckColor(check);
  const icon = getCheckIcon(check);
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 ${color} text-xs font-bold`}>
      {icon}
    </span>
  );
}

/* --- Tabs --- */

type TabKey = "overview" | "all" | "verified" | "partial" | "broken" | "ais";

export default function EvidencePage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const registry = getEvidenceRegistry();
  const allEvidence = getAllEvidence();
  const stats = getEvidenceStats();
  const consistency = getProductionConsistency();
  const aisModules = getAISModules();
  const aisModuleNames = getAISModuleNames();

  const filteredFeatures = useMemo(() => {
    if (activeTab === "all") return allEvidence;
    if (activeTab === "verified") return allEvidence.filter((e) => e.status === "verified");
    if (activeTab === "partial") return allEvidence.filter((e) => e.status === "partial");
    if (activeTab === "broken")
      return allEvidence.filter((e) => isBrokenOrMissing(e));
    return [];
  }, [activeTab, allEvidence]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "overview", label: t("evidence.tab.overview"), count: 0 },
    { key: "all", label: t("evidence.tab.all"), count: stats.total },
    { key: "verified", label: t("evidence.tab.verified"), count: stats.verified },
    { key: "partial", label: t("evidence.tab.partial"), count: stats.partial },
    { key: "broken", label: t("evidence.tab.broken"), count: stats.broken + stats.missing },
    { key: "ais", label: t("evidence.tab.ais"), count: aisModuleNames.length },
  ];

  return (
    <Container>
      <div className="max-w-7xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {t("evidence.title")}
              </h1>
              <p className="text-sm text-muted-2">{t("evidence.subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Production Consistency (BLOCK 6) */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">
              {t("evidence.consistency.title")}
            </span>
            <span
              className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase border ${
                consistency.syncStatus === "in_sync"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : consistency.syncStatus === "out_of_sync"
                  ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                  : "bg-foreground/5 border-foreground/10 text-foreground/40"
              }`}
            >
              {consistency.syncStatus === "in_sync"
                ? t("evidence.consistency.inSync")
                : consistency.syncStatus === "out_of_sync"
                ? t("evidence.consistency.outOfSync")
                : t("evidence.consistency.unknown")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* LOCAL */}
            <div className="p-3 rounded-lg bg-surface-2/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[10px] font-bold tracking-wider text-foreground/60 uppercase">
                  {t("evidence.consistency.local")}
                </span>
              </div>
              <code className="text-[11px] text-foreground/80 break-all">
                {consistency.localCommit ? consistency.localCommit.slice(0, 12) : "—"}
              </code>
            </div>
            {/* GITHUB */}
            <div className="p-3 rounded-lg bg-surface-2/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[10px] font-bold tracking-wider text-foreground/60 uppercase">
                  {t("evidence.consistency.github")}
                </span>
              </div>
              <code className="text-[11px] text-foreground/80 break-all">
                {consistency.githubCommit.slice(0, 12)}
              </code>
            </div>
            {/* SERVER BUILD */}
            <div className="p-3 rounded-lg bg-surface-2/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[10px] font-bold tracking-wider text-foreground/60 uppercase">
                  {t("evidence.consistency.serverBuild")}
                </span>
              </div>
              <code className="text-[11px] text-foreground/80 break-all">
                {consistency.serverBuildCommit.slice(0, 12)}
              </code>
            </div>
            {/* PRODUCTION */}
            <div className="p-3 rounded-lg bg-surface-2/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[10px] font-bold tracking-wider text-foreground/60 uppercase">
                  {t("evidence.consistency.production")}
                </span>
              </div>
              <code className="text-[11px] text-foreground/80 break-all">
                {consistency.productionCommit.slice(0, 12)}
              </code>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-muted-2">
            {t("evidence.consistency.lastChecked")}:{" "}
            {new Date(consistency.lastChecked).toLocaleString("ru-RU")}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border bg-surface/30 sticky top-14 z-30">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? "text-violet-600 dark:text-violet-400 border-violet-500"
                    : "text-muted-2 hover:text-foreground border-transparent"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-md bg-foreground/5">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === "overview" && (
            <OverviewTab stats={stats} registry={registry} />
          )}

          {activeTab === "ais" && (
            <AISModulesTab aisModules={aisModules} aisModuleNames={aisModuleNames} />
          )}

          {activeTab !== "overview" && activeTab !== "ais" && (
            <FeatureListTab
              features={filteredFeatures}
              expandedFeature={expandedFeature}
              onToggleExpand={(id) =>
                setExpandedFeature(expandedFeature === id ? null : id)
              }
            />
          )}
        </div>
      </div>
    </Container>
  );
}

/* --- Overview Tab --- */

function OverviewTab({
  stats,
  registry,
}: {
  stats: ReturnType<typeof getEvidenceStats>;
  registry: ReturnType<typeof getEvidenceRegistry>;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      {/* Aggregate readiness */}
      <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">
              {t("evidence.overallCompleteness")}
            </span>
          </div>
          <span className="text-2xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
            {stats.evidenceCompleteness}%
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-foreground/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.evidenceCompleteness}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
          />
        </div>
        <div className="mt-3 text-xs text-muted-2">
          {stats.passedChecks}/{stats.total * 6} {t("evidence.checksPassed")}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard
          label={t("evidence.stats.verified")}
          value={stats.verified}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
        />
        <StatCard
          label={t("evidence.stats.partial")}
          value={stats.partial}
          color="text-amber-500"
          bg="bg-amber-500/10"
        />
        <StatCard
          label={t("evidence.stats.broken")}
          value={stats.broken + stats.missing}
          color="text-red-500"
          bg="bg-red-500/10"
        />
        <StatCard
          label={t("evidence.stats.inProgress")}
          value={stats.in_progress}
          color="text-amber-500"
          bg="bg-amber-500/10"
        />
        <StatCard
          label={t("evidence.stats.deprecated")}
          value={stats.deprecated}
          color="text-foreground/40"
          bg="bg-foreground/5"
        />
        <StatCard
          label={t("evidence.stats.withScreenshots")}
          value={stats.withScreenshots}
          color="text-blue-500"
          bg="bg-blue-500/10"
        />
        <StatCard
          label={t("evidence.stats.withVideo")}
          value={stats.withVideo}
          color="text-purple-500"
          bg="bg-purple-500/10"
        />
        <StatCard
          label={t("evidence.stats.passedChecks")}
          value={stats.passedChecks}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
        />
        <StatCard
          label={t("evidence.stats.failedChecks")}
          value={stats.failedChecks}
          color="text-red-500"
          bg="bg-red-500/10"
        />
        <StatCard
          label={t("evidence.stats.total")}
          value={stats.total}
          color="text-violet-500"
          bg="bg-violet-500/10"
        />
      </div>

      {/* Registry metadata */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-foreground">
            {t("evidence.registryMetadata")}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-2">{t("evidence.version")}:</span>
            <code className="text-foreground/80">{registry.version}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-2">{t("evidence.lastUpdated")}:</span>
            <span className="text-foreground/80">
              {new Date(registry.lastUpdated).toLocaleString("ru-RU")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-2">{t("evidence.verifiedBy")}:</span>
            <span className="text-foreground/80">{registry.verifiedBy}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-2">{t("evidence.productionCommit")}:</span>
            <code className="text-foreground/80">{registry.productionCommit.slice(0, 16)}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`p-3 rounded-lg ${bg} border border-border`}>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-2 mt-1">{label}</div>
    </div>
  );
}

/* --- AIS Modules Tab (BLOCK 7) --- */

function AISModulesTab({
  aisModules,
  aisModuleNames,
}: {
  aisModules: Record<string, ReturnType<typeof getAISModules>[string]>;
  aisModuleNames: string[];
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-foreground">
          {t("evidence.aisModules.title")}
        </span>
      </div>
      {aisModuleNames.map((name) => {
        const m = aisModules[name];
        return (
          <div
            key={name}
            className="rounded-xl border border-border bg-surface overflow-hidden"
          >
            <div className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-500/10">
                <Sparkles className="w-5 h-5 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{name}</span>
                  <StatusBadge status={m.status} />
                </div>
                <p className="text-xs text-muted-2 mb-2">{m.notes}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-2">
                  <a
                    href={m.productionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t("evidence.productionUrl")}
                  </a>
                  {m.screenshot && (
                    <span className="inline-flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      {m.screenshot}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* --- Feature List Tab --- */

function FeatureListTab({
  features,
  expandedFeature,
  onToggleExpand,
}: {
  features: FeatureEvidence[];
  expandedFeature: string | null;
  onToggleExpand: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      {features.length === 0 && (
        <div className="text-center py-12 text-muted-2 text-sm">
          {t("evidence.noFeatures")}
        </div>
      )}
      {features.map((e) => {
        const expanded = expandedFeature === e.id;
        return (
          <div
            key={e.id}
            className="rounded-xl border border-border bg-surface overflow-hidden"
          >
            {/* Row header */}
            <button
              onClick={() => onToggleExpand(e.id)}
              className="w-full p-4 flex items-center gap-3 hover:bg-surface-2/50 transition-colors text-left"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-muted-2 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-2 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {e.name}
                  </span>
                  <StatusBadge status={e.status} />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-2">
                  <code className="font-mono">{e.id}</code>
                  <span>{e.category}</span>
                  {e.version && (
                    <span className="px-1.5 py-0.5 rounded bg-foreground/5">{e.version}</span>
                  )}
                </div>
              </div>
              {/* Quick checks */}
              <div className="hidden md:flex items-center gap-1">
                <CheckIcon check={e.checks.build} />
                <CheckIcon check={e.checks.production} />
                <CheckIcon check={e.checks.browser} />
                <CheckIcon check={e.checks.e2e} />
                <CheckIcon check={e.checks.regression} />
                <CheckIcon check={e.checks.visual} />
              </div>
            </button>

            {/* Expanded details */}
            {expanded && (
              <div className="border-t border-border p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left column: metadata */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-1">
                        {t("evidence.detail.commit")}
                      </div>
                      <code className="text-foreground/80 break-all">{e.commit}</code>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-1">
                        {t("evidence.detail.productionUrl")}
                      </div>
                      <a
                        href={e.productionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-violet-500 hover:text-violet-400 break-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {e.productionUrl}
                      </a>
                    </div>
                    {e.verifiedAt && (
                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-1">
                          {t("evidence.detail.verifiedAt")}
                        </div>
                        <span className="text-foreground/80">
                          {new Date(e.verifiedAt).toLocaleString("ru-RU")}
                        </span>
                      </div>
                    )}
                    {e.verifiedBy && (
                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-1">
                          {t("evidence.detail.verifiedBy")}
                        </div>
                        <span className="text-foreground/80">{e.verifiedBy}</span>
                      </div>
                    )}
                    {e.pages.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-1">
                          {t("evidence.detail.pages")}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {e.pages.map((p) => (
                            <code
                              key={p}
                              className="px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/60 text-[10px]"
                            >
                              {p}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right column: checks + screenshots */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-2">
                        {t("evidence.detail.checks")}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          ["build", t("evidence.check.build")],
                          ["production", t("evidence.check.production")],
                          ["browser", t("evidence.check.browser")],
                          ["e2e", t("evidence.check.e2e")],
                          ["regression", t("evidence.check.regression")],
                          ["visual", t("evidence.check.visual")],
                        ] as const).map(([key, label]) => (
                          <div
                            key={key}
                            className="flex items-center gap-1.5 p-2 rounded-lg bg-surface-2/50"
                          >
                            <CheckIcon check={e.checks[key]} />
                            <span className="text-[10px] text-foreground/70">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {e.screenshots.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-2">
                          {t("evidence.detail.screenshots")}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {e.screenshots.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-foreground/5 text-[10px] text-foreground/60"
                            >
                              <Camera className="w-3 h-3" />
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {e.video && (
                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-1">
                          {t("evidence.detail.video")}
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 text-[10px] text-purple-500">
                          <Film className="w-3 h-3" />
                          {e.video}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {e.notes && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                    <div className="text-[10px] font-bold tracking-wider text-amber-500 uppercase mb-1">
                      {t("evidence.detail.notes")}
                    </div>
                    <p className="text-xs text-foreground/70">{e.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
