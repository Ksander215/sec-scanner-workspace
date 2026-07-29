/**
 * /app/product-readiness - Product Completeness Audit Center (INT-046)
 *
 * Shows product readiness (not just technical implementation) for every feature.
 * Includes: Product Score, UX Score, Business Score, Evidence Score, 4 statuses,
 * Product Debt, Trust findings, UX findings, User Journey, Accessibility,
 * Executive Summary, Roadmap (TOP-10 priorities).
 */

"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  getReadinessRegistry,
  getAllReadiness,
  getReadinessStats,
  getRoadmap,
  getExecutiveSummary,
  getScoreColor,
  getScoreBg,
  getScoreLabel,
  getFourStatusColor,
  type FeatureReadiness,
  type RoadmapItem,
} from "@/lib/product-readiness";
import {
  Gauge,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Eye,
  Route,
  Accessibility,
  Target,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Rocket,
} from "lucide-react";

type TabKey =
  | "overview"
  | "features"
  | "trust"
  | "ux"
  | "journey"
  | "accessibility"
  | "roadmap";

export default function ProductReadinessPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const registry = getReadinessRegistry();
  const stats = getReadinessStats();
  const roadmap = getRoadmap();
  const summary = getExecutiveSummary();
  const allFeatures = getAllReadiness();

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "overview", label: t("readiness.tab.overview"), count: 0 },
    { key: "features", label: t("readiness.tab.features"), count: stats.total },
    { key: "trust", label: t("readiness.tab.trust"), count: registry.trustFindings.length },
    { key: "ux", label: t("readiness.tab.ux"), count: registry.uxFindings.length },
    { key: "journey", label: t("readiness.tab.journey"), count: registry.userJourney.length },
    { key: "accessibility", label: t("readiness.tab.accessibility"), count: Object.keys(registry.accessibility).length },
    { key: "roadmap", label: t("readiness.tab.roadmap"), count: roadmap.length },
  ];

  return (
    <Container>
      <div className="max-w-7xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {t("readiness.title")}
              </h1>
              <p className="text-sm text-muted-2">{t("readiness.subtitle")}</p>
            </div>
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
        {activeTab === "overview" && <OverviewTab stats={stats} summary={summary} registry={registry} />}
        {activeTab === "features" && (
          <FeaturesTab
            features={allFeatures}
            expandedFeature={expandedFeature}
            onToggleExpand={(id) => setExpandedFeature(expandedFeature === id ? null : id)}
          />
        )}
        {activeTab === "trust" && <TrustTab findings={registry.trustFindings} />}
        {activeTab === "ux" && <UXTab findings={registry.uxFindings} />}
        {activeTab === "journey" && <JourneyTab stages={registry.userJourney} />}
        {activeTab === "accessibility" && <AccessibilityTab audit={registry.accessibility} />}
        {activeTab === "roadmap" && <RoadmapTab items={roadmap} />}
      </div>
    </Container>
  );
}

/* --- Overview Tab --- */

function OverviewTab({
  stats,
  summary,
  registry,
}: {
  stats: ReturnType<typeof getReadinessStats>;
  summary: ReturnType<typeof getExecutiveSummary>;
  registry: ReturnType<typeof getReadinessRegistry>;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      {/* Executive Summary (BLOCK 14) */}
      <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-foreground">
            {t("readiness.executiveSummary")}
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          {t("readiness.executiveSummaryText")
            .replace("{{functional}}", String(summary.functionalReadiness))
            .replace("{{product}}", String(summary.productReadiness))}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-2">
              {t("readiness.keyGaps")}
            </div>
            <ul className="space-y-1">
              {summary.keyGaps.map((gap, i) => (
                <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-2">
              {t("readiness.topPriorities")}
            </div>
            <ul className="space-y-1">
              {summary.topPriorities.map((p, i) => (
                <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                  <span className="text-violet-500 mt-0.5">{i + 1}.</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Two scores comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="text-xs text-muted-2 mb-1">{t("readiness.functionalReadiness")}</div>
          <div className={`text-4xl font-bold tabular-nums ${getScoreColor(summary.functionalReadiness)}`}>
            {summary.functionalReadiness}%
          </div>
          <div className="text-[11px] text-muted-2 mt-1">{t("readiness.functionalReadinessDesc")}</div>
          <div className="mt-3 w-full h-2 rounded-full bg-foreground/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${summary.functionalReadiness}%` }}
              transition={{ duration: 1 }}
              className={`h-full ${getScoreBg(summary.functionalReadiness)}`}
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="text-xs text-muted-2 mb-1">{t("readiness.productReadiness")}</div>
          <div className={`text-4xl font-bold tabular-nums ${getScoreColor(summary.productReadiness)}`}>
            {summary.productReadiness}%
          </div>
          <div className="text-[11px] text-muted-2 mt-1">{t("readiness.productReadinessDesc")}</div>
          <div className="mt-3 w-full h-2 rounded-full bg-foreground/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${summary.productReadiness}%` }}
              transition={{ duration: 1 }}
              className={`h-full ${getScoreBg(summary.productReadiness)}`}
            />
          </div>
        </div>
      </div>

      {/* Block scores (BLOCK 13) */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-foreground">
            {t("readiness.blockScores")}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(registry.blockScores).map(([block, score]) => (
            <div key={block} className="p-3 rounded-lg bg-surface-2/50 border border-border">
              <div className="text-[10px] text-muted-2 mb-1 truncate">{block}</div>
              <div className={`text-xl font-bold tabular-nums ${getScoreColor(score)}`}>{score}%</div>
              <div className="mt-2 w-full h-1 rounded-full bg-foreground/5 overflow-hidden">
                <div className={`h-full ${getScoreBg(score)}`} style={{ width: `${score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category scores */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-foreground">
            {t("readiness.categoryScores")}
          </span>
        </div>
        <div className="space-y-2">
          {Object.entries(registry.categoryScores).map(([cat, data]) => (
            <div key={cat} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2/30">
              <div className="w-32 text-xs font-medium text-foreground/80 truncate">{cat}</div>
              <div className="flex-1">
                <div className="w-full h-2 rounded-full bg-foreground/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.score}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full ${getScoreBg(data.score)}`}
                  />
                </div>
              </div>
              <div className={`w-12 text-right text-sm font-bold tabular-nums ${getScoreColor(data.score)}`}>
                {data.score}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t("readiness.stats.ready")} value={stats.ready} color="text-emerald-500" bg="bg-emerald-500/10" />
        <StatCard label={t("readiness.stats.almostReady")} value={stats.almostReady} color="text-amber-500" bg="bg-amber-500/10" />
        <StatCard label={t("readiness.stats.partial")} value={stats.partial} color="text-orange-500" bg="bg-orange-500/10" />
        <StatCard label={t("readiness.stats.notReady")} value={stats.notReady} color="text-red-500" bg="bg-red-500/10" />
        <StatCard label={t("readiness.stats.avgProduct")} value={`${stats.averageProductScore}%`} color="text-violet-500" bg="bg-violet-500/10" />
        <StatCard label={t("readiness.stats.avgUX")} value={`${stats.averageUXScore}%`} color="text-blue-500" bg="bg-blue-500/10" />
        <StatCard label={t("readiness.stats.totalDebt")} value={stats.totalDebtItems} color="text-amber-500" bg="bg-amber-500/10" />
        <StatCard label={t("readiness.stats.criticalTrust")} value={stats.criticalTrustFindings} color="text-red-500" bg="bg-red-500/10" />
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
  value: number | string;
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

/* --- Features Tab --- */

function FeaturesTab({
  features,
  expandedFeature,
  onToggleExpand,
}: {
  features: FeatureReadiness[];
  expandedFeature: string | null;
  onToggleExpand: (id: string) => void;
}) {
  const { t } = useI18n();
  const [sortBy, setSortBy] = useState<"product" | "ux" | "business" | "evidence" | "name">("product");

  const sorted = useMemo(() => {
    const arr = [...features];
    arr.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return b.scores[sortBy] - a.scores[sortBy];
    });
    return arr;
  }, [features, sortBy]);

  return (
    <div className="space-y-3">
      {/* Sort controls */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-2">{t("readiness.sortBy")}:</span>
        {(["product", "ux", "business", "evidence", "name"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium ${
              sortBy === s
                ? "bg-violet-600 text-white"
                : "bg-foreground/5 text-muted-2 hover:text-foreground"
            }`}
          >
            {t(`readiness.sort.${s}`)}
          </button>
        ))}
      </div>

      {sorted.map((f) => {
        const expanded = expandedFeature === f.id;
        return (
          <div
            key={f.id}
            className="rounded-xl border border-border bg-surface overflow-hidden"
          >
            <button
              onClick={() => onToggleExpand(f.id)}
              className="w-full p-4 flex items-center gap-3 hover:bg-surface-2/50 transition-colors text-left"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-muted-2 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-2 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground truncate">{f.name}</span>
                  <code className="text-[10px] text-muted-2 font-mono">{f.id}</code>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-2">
                  <span>{f.category}</span>
                  {f.version && <span className="px-1.5 py-0.5 rounded bg-foreground/5">{f.version}</span>}
                </div>
              </div>
              {/* Scores */}
              <div className="hidden md:flex items-center gap-3 text-xs">
                <ScoreBadge label={t("readiness.score.product")} value={f.scores.product} />
                <ScoreBadge label={t("readiness.score.ux")} value={f.scores.ux} />
                <ScoreBadge label={t("readiness.score.business")} value={f.scores.business} />
                <ScoreBadge label={t("readiness.score.evidence")} value={f.scores.evidence} />
              </div>
            </button>

            {expanded && (
              <div className="border-t border-border p-4 space-y-4">
                {/* 4 statuses (INT-046 mandatory rule) */}
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-2">
                    {t("readiness.fourStatuses")}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {([
                      ["technical", t("readiness.status.technical")],
                      ["evidence", t("readiness.status.evidence")],
                      ["product", t("readiness.status.product")],
                      ["production", t("readiness.status.production")],
                    ] as const).map(([key, label]) => (
                      <div key={key} className={`p-2 rounded-lg border ${getFourStatusColor(f.fourStatuses[key])}`}>
                        <div className="text-[9px] font-bold tracking-wider uppercase opacity-70">{label}</div>
                        <div className="text-[11px] font-semibold mt-0.5">{f.fourStatuses[key].replace(/_/g, " ")}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scores (mobile + details) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <ScoreBlock label={t("readiness.score.product")} value={f.scores.product} />
                  <ScoreBlock label={t("readiness.score.ux")} value={f.scores.ux} />
                  <ScoreBlock label={t("readiness.score.business")} value={f.scores.business} />
                  <ScoreBlock label={t("readiness.score.evidence")} value={f.scores.evidence} />
                </div>

                {/* Product Debt (BLOCK 4) */}
                {f.productDebt.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-2">
                      {t("readiness.productDebt")} ({f.productDebt.length})
                    </div>
                    <ul className="space-y-1">
                      {f.productDebt.map((d, i) => (
                        <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">□</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Production URL */}
                {f.productionUrl && (
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-1">
                      {t("readiness.productionUrl")}
                    </div>
                    <a
                      href={f.productionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-violet-500 hover:text-violet-400 text-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {f.productionUrl}
                    </a>
                  </div>
                )}

                {/* Last checked + responsible */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-1">
                      {t("readiness.lastChecked")}
                    </div>
                    <span className="text-foreground/80">
                      {new Date(f.lastChecked).toLocaleString("ru-RU")}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-1">
                      {t("readiness.responsible")}
                    </div>
                    <span className="text-foreground/80">{f.responsible}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[9px] text-muted-2 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${getScoreColor(value)}`}>{value}</span>
    </div>
  );
}

function ScoreBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg bg-surface-2/50 border border-border">
      <div className="text-[10px] text-muted-2 mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${getScoreColor(value)}`}>{value}%</div>
      <div className="text-[9px] text-muted-2 mt-1">{getScoreLabel(value)}</div>
      <div className="mt-1 w-full h-1 rounded-full bg-foreground/5 overflow-hidden">
        <div className={`h-full ${getScoreBg(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/* --- Trust Tab (BLOCK 8) --- */

function TrustTab({ findings }: { findings: ReturnType<typeof getReadinessRegistry>["trustFindings"] }) {
  const { t } = useI18n();
  const severityColor = (s: string) => {
    if (s === "critical") return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
    if (s === "high") return "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400";
    if (s === "medium") return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
    return "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-foreground">{t("readiness.trust.title")}</span>
      </div>
      {findings.map((f) => (
        <div key={f.id} className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-[10px] font-mono text-muted-2">{f.id}</code>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${severityColor(f.severity)}`}>
                  {f.severity}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  f.status === "open" ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400" :
                  f.status === "partial_fixed" ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" :
                  "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                }`}>
                  {f.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="text-xs text-muted-2 mb-2">
                <code>{f.page}</code>
              </div>
              <p className="text-sm text-foreground/80 mb-2">{f.finding}</p>
              <div className="text-xs text-foreground/60 bg-amber-500/5 border border-amber-500/15 rounded p-2">
                <span className="font-semibold text-amber-600 dark:text-amber-400">Fix: </span>
                {f.fix}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* --- UX Tab (BLOCK 5) --- */

function UXTab({ findings }: { findings: ReturnType<typeof getReadinessRegistry>["uxFindings"] }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-foreground">{t("readiness.ux.title")}</span>
      </div>
      {findings.map((f) => (
        <div key={f.id} className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            <Eye className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-[10px] font-mono text-muted-2">{f.id}</code>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400">
                  {f.severity}
                </span>
                <code className="text-[10px] text-muted-2">{f.page}</code>
              </div>
              <p className="text-sm text-foreground/80">{f.issue}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* --- Journey Tab (BLOCK 7) --- */

function JourneyTab({ stages }: { stages: ReturnType<typeof getReadinessRegistry>["userJourney"] }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Route className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-foreground">{t("readiness.journey.title")}</span>
      </div>
      {stages.map((s, i) => (
        <div key={s.stage} className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getScoreColor(s.score).replace("text-", "bg-").replace("500", "500/10")}`}>
              <span className={`text-sm font-bold ${getScoreColor(s.score)}`}>{i + 1}</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">{s.stage}</div>
            </div>
            <div className={`text-2xl font-bold tabular-nums ${getScoreColor(s.score)}`}>{s.score}%</div>
          </div>
          {s.issues.length > 0 && (
            <ul className="ml-11 space-y-1 mt-2">
              {s.issues.map((issue, j) => (
                <li key={j} className="text-xs text-foreground/70 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/* --- Accessibility Tab (BLOCK 12) --- */

function AccessibilityTab({ audit }: { audit: ReturnType<typeof getReadinessRegistry>["accessibility"] }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Accessibility className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-foreground">{t("readiness.accessibility.title")}</span>
      </div>
      {Object.entries(audit).map(([cat, data]) => (
        <div key={cat} className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-3 mb-2">
            <Accessibility className="w-4 h-4 text-violet-500 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground capitalize">{cat.replace(/_/g, " ")}</div>
            </div>
            <div className={`text-xl font-bold tabular-nums ${getScoreColor(data.score)}`}>{data.score}%</div>
          </div>
          <ul className="space-y-1 mt-2">
            {data.issues.map((issue, j) => (
              <li key={j} className="text-xs text-foreground/70 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* --- Roadmap Tab (BLOCK 15) --- */

function RoadmapTab({ items }: { items: RoadmapItem[] }) {
  const { t } = useI18n();
  const impactColor = (impact: string) => {
    if (impact === "trust") return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
    if (impact === "sales") return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
    if (impact === "retention") return "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
    if (impact === "onboarding") return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
    return "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400";
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Rocket className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-foreground">{t("readiness.roadmap.title")}</span>
      </div>
      {items.map((item) => (
        <div key={item.rank} className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-500/10 shrink-0">
              <span className="text-lg font-bold text-violet-500">{item.rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{item.title}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${impactColor(item.impact)}`}>
                  {item.impact.replace(/_/g, " ")}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-foreground/5 border-foreground/10 text-foreground/60">
                  {t(`readiness.effort.${item.effort}`)}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tabular-nums bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  impact: {item.impactScore}
                </span>
              </div>
              <p className="text-xs text-foreground/70 mb-2">{item.description}</p>
              {item.affectedFeatures.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-muted-2">{t("readiness.affectedFeatures")}:</span>
                  {item.affectedFeatures.map((fid) => (
                    <code key={fid} className="px-1.5 py-0.5 rounded bg-foreground/5 text-[10px] text-foreground/60">
                      {fid}
                    </code>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
