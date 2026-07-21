/**
 * /app/evolution - Evolution Matrix (INT-049 BLOCK 4)
 *
 * Shows evolution matrix: Feature → Owner → Affected Centers → Status → Evidence → Product Impact.
 * Includes: AI Copilot Intent Detection demo, Evolution Pipeline visualization, Top Impact features.
 */

"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  getEvolutionRegistry,
  getAllEvolutionFeatures,
  getEvolutionStats,
  analyzeEvolutionImpact,
  detectIntent,
  starsToString,
  getStarsColor,
  type EvolutionFeature,
} from "@/lib/evolution-registry";
import type { CenterId } from "@/lib/architecture-registry";
import {
  TrendingUp,
  Sparkles,
  Brain,
  ShieldCheck,
  Cpu,
  GitBranch,
  Activity,
  ArrowRight,
  Search,
  Zap,
} from "lucide-react";

const CENTER_ICON: Record<CenterId, React.ElementType> = {
  SIP: ShieldCheck,
  AIS: Sparkles,
  AI_CTO: Brain,
  AIO: Cpu,
};

const CENTER_COLOR: Record<CenterId, string> = {
  SIP: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  AIS: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  AI_CTO: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  AIO: "text-amber-500 bg-amber-500/10 border-amber-500/20",
};

type TabKey = "matrix" | "impact" | "intent" | "pipeline";

export default function EvolutionPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>("matrix");
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [intentQuery, setIntentQuery] = useState("");

  const registry = getEvolutionRegistry();
  const features = getAllEvolutionFeatures();
  const stats = getEvolutionStats();
  const impactReport = selectedFeature ? analyzeEvolutionImpact(selectedFeature) : null;
  const intentResult = intentQuery ? detectIntent(intentQuery) : null;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "matrix", label: t("evolution.tab.matrix"), count: features.length },
    { key: "impact", label: t("evolution.tab.impact"), count: 0 },
    { key: "intent", label: t("evolution.tab.intent"), count: 0 },
    { key: "pipeline", label: t("evolution.tab.pipeline"), count: registry.evolutionPipeline.length },
  ];

  return (
    <Container>
      <div className="max-w-7xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("evolution.title")}</h1>
              <p className="text-sm text-muted-2">{t("evolution.subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Owner distribution + stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label={t("evolution.stats.total")} value={stats.total} color="text-violet-500" bg="bg-violet-500/10" />
          <StatCard label={t("evolution.stats.avgImpact")} value={`${stats.avgImpactScore}%`} color="text-emerald-500" bg="bg-emerald-500/10" />
          <StatCard label="SIP" value={stats.byOwner.SIP} color="text-blue-500" bg="bg-blue-500/10" />
          <StatCard label="AIS" value={stats.byOwner.AIS} color="text-violet-500" bg="bg-violet-500/10" />
          <StatCard label="AI CTO / AIO" value={`${stats.byOwner.AI_CTO} / ${stats.byOwner.AIO}`} color="text-emerald-500" bg="bg-emerald-500/10" />
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
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-md bg-foreground/5">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === "matrix" && (
          <MatrixTab features={features} onSelect={setSelectedFeature} onSwitchToImpact={() => setActiveTab("impact")} />
        )}
        {activeTab === "impact" && (
          <ImpactTab
            features={features}
            selectedFeature={selectedFeature}
            onSelect={setSelectedFeature}
            report={impactReport}
          />
        )}
        {activeTab === "intent" && (
          <IntentTab query={intentQuery} onQueryChange={setIntentQuery} result={intentResult} />
        )}
        {activeTab === "pipeline" && <PipelineTab pipeline={registry.evolutionPipeline} synced={registry.synchronizedRegistries} />}
      </div>
    </Container>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number | string; color: string; bg: string }) {
  return (
    <div className={`p-3 rounded-lg ${bg} border border-border`}>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-2 mt-1">{label}</div>
    </div>
  );
}

/* --- Matrix Tab --- */

function MatrixTab({
  features,
  onSelect,
  onSwitchToImpact,
}: {
  features: EvolutionFeature[];
  onSelect: (id: string | null) => void;
  onSwitchToImpact: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      {features.map((f) => {
        const Icon = CENTER_ICON[f.owner];
        const colorClass = CENTER_COLOR[f.owner];
        return (
          <button
            key={f.id}
            onClick={() => {
              onSelect(f.id);
              onSwitchToImpact();
            }}
            className="w-full rounded-xl border border-border bg-surface p-4 hover:border-violet-500/30 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colorClass} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground truncate">{f.name}</span>
                  <code className="text-[10px] text-muted-2 font-mono">{f.id}</code>
                  <span className="text-[10px] text-muted-2 px-1.5 py-0.5 rounded bg-foreground/5">{f.category}</span>
                </div>
                {/* Affected centers stars */}
                <div className="flex items-center gap-3 text-[11px]">
                  {(Object.keys(f.affectedCenters) as CenterId[]).map((c) => (
                    <span key={c} className="inline-flex items-center gap-1">
                      <span className="text-muted-2">{c === "AI_CTO" ? "CTO" : c}</span>
                      <span className={`font-mono ${getStarsColor(f.affectedCenters[c])}`}>
                        {starsToString(f.affectedCenters[c])}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-muted-2 uppercase tracking-wider">{t("evolution.impact")}</div>
                <div className={`text-lg font-bold tabular-nums ${f.impactScore >= 80 ? "text-emerald-500" : f.impactScore >= 60 ? "text-amber-500" : "text-orange-500"}`}>
                  {f.impactScore}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* --- Impact Tab --- */

function ImpactTab({
  features,
  selectedFeature,
  onSelect,
  report,
}: {
  features: EvolutionFeature[];
  selectedFeature: string | null;
  onSelect: (id: string | null) => void;
  report: ReturnType<typeof analyzeEvolutionImpact> | null;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      {/* Feature selector */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="text-xs text-muted-2 mb-2">{t("evolution.selectFeature")}</div>
        <select
          value={selectedFeature || ""}
          onChange={(e) => onSelect(e.target.value === "" ? null : e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground"
        >
          <option value="">— {t("evolution.selectFeature")} —</option>
          {features.map((f) => (
            <option key={f.id} value={f.id}>
              {f.id} — {f.name} (owner: {f.owner})
            </option>
          ))}
        </select>
      </div>

      {report && (
        <>
          {/* Impact stars */}
          <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-foreground">
                {t("evolution.impactAnalysis")}: {report.featureName}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(report.impactStars) as CenterId[]).map((c) => {
                const Icon = CENTER_ICON[c];
                const stars = report.impactStars[c];
                return (
                  <div key={c} className={`p-3 rounded-lg border ${CENTER_COLOR[c]}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold">{c === "AI_CTO" ? "AI CTO" : c}</span>
                    </div>
                    <div className={`text-lg font-mono ${getStarsColor(stars)}`}>{starsToString(stars)}</div>
                    <div className="text-[10px] text-muted-2 mt-1">{stars}/5 {t("evolution.stars")}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evolution chain */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-foreground">{t("evolution.evolutionChain")}</span>
            </div>
            <div className="space-y-2">
              {report.evolutionChain.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-500 shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{step.step}</div>
                    <div className="text-xs text-muted-2">{step.description}</div>
                  </div>
                  {i < report.evolutionChain.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-2 mt-1.5 rotate-90" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Required updates + tests + affected modules/KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">{t("evolution.requiredUpdates")}</span>
              </div>
              <ul className="space-y-1">
                {report.requiredUpdates.map((u, i) => (
                  <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <code className="font-mono text-[11px]">{u}</code>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-foreground">{t("evolution.requiredTests")}</span>
              </div>
              <ul className="space-y-1">
                {report.requiredTests.map((test, i) => (
                  <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span>{test}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Affected KPIs + Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-2">{t("evolution.affectedKPIs")}</div>
              <div className="flex flex-wrap gap-1.5">
                {report.affectedKPIs.map((k) => (
                  <span key={k} className="px-2 py-0.5 rounded-md bg-foreground/5 text-[10px] text-foreground/70">{k}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-2">{t("evolution.affectedModules")}</div>
              <div className="flex flex-wrap gap-1.5">
                {report.affectedModules.map((m) => (
                  <code key={m} className="px-2 py-0.5 rounded-md bg-foreground/5 text-[10px] text-muted-2 font-mono">{m}</code>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* --- Intent Tab (BLOCK 7) --- */

function IntentTab({
  query,
  onQueryChange,
  result,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  result: ReturnType<typeof detectIntent> | null;
}) {
  const { t } = useI18n();
  const examples = [
    "Просканируй сайт",
    "Почему готовность продукта 55%?",
    "Разверни новую сборку",
    "Объясни результаты сканирования",
    "Покажи roadmap",
    "Сделай rollback",
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-foreground">{t("evolution.intentTitle")}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-2" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("evolution.intentPlaceholder")}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-2"
          />
        </div>

        {/* Examples */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-2">{t("evolution.examples")}:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => onQueryChange(ex)}
              className="px-2 py-1 rounded-md bg-foreground/5 text-[11px] text-foreground/70 hover:bg-foreground/10 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${CENTER_COLOR[result.center]}`}>
              {(() => {
                const Icon = CENTER_ICON[result.center];
                return <Icon className="w-5 h-5" />;
              })()}
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase">{t("evolution.routedTo")}</div>
              <div className="text-lg font-bold text-foreground">{result.center === "AI_CTO" ? "AI CTO" : result.center}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-2">{t("evolution.confidence")}</div>
              <div className={`text-lg font-bold tabular-nums ${result.confidence >= 0.7 ? "text-emerald-500" : "text-amber-500"}`}>
                {Math.round(result.confidence * 100)}%
              </div>
            </div>
          </div>
          <div className="text-xs text-foreground/70 bg-surface-2/50 p-3 rounded-lg border border-border">
            <span className="font-semibold text-foreground">{t("evolution.intent")}:</span> <code className="font-mono">{result.intent}</code>
            <br />
            <span className="font-semibold text-foreground">{t("evolution.explanation")}:</span> {result.explanation}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Pipeline Tab --- */

function PipelineTab({ pipeline, synced }: { pipeline: string[]; synced: string[] }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-foreground">{t("evolution.pipelineTitle")}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pipeline.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-600 dark:text-violet-400">
                {step}
              </div>
              {i < pipeline.length - 1 && <ArrowRight className="w-3 h-3 text-muted-2" />}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-foreground">{t("evolution.syncedRegistries")}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {synced.map((r) => (
            <div key={r} className="flex items-center gap-2 p-2 rounded-lg bg-surface-2/50 text-xs">
              <span className="text-emerald-500">✓</span>
              <code className="font-mono text-foreground/70">{r}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
