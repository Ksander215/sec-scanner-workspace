/**
 * INT-038 — Platform Status Center
 *
 * Single source of truth page showing:
 * - Overall product readiness
 * - Per-category readiness percentages
 * - Implemented / In Progress / Planned breakdown
 * - Functional matrix
 *
 * All data comes from Feature Registry (no manual editing).
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  getRegistry,
  getCategories,
  getCategoryReadiness,
  getOverallReadiness,
  getFeaturesByStatus,
  getFunctionalMatrix,
  PAGE_DISPLAY_NAMES,
  CATEGORY_ORDER,
  type FeatureStatus,
  type Feature,
} from "@/lib/feature-registry";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  Activity,
  CheckCircle2,
  Clock,
  Circle,
  Shield,
  Sparkles,
  LayoutDashboard,
  Radar,
  FileBarChart,
  Store,
  GitBranch,
  Briefcase,
  Cable,
  Bell,
  Server,
  BarChart3,
  Cpu,
  Eye,
  ArrowRight,
} from "lucide-react";

/* ─── Category icons ───────────────────────────────────────────────────── */

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  AIS: Sparkles,
  UX: Eye,
  Dashboard: LayoutDashboard,
  Scanner: Radar,
  Reports: FileBarChart,
  Marketplace: Store,
  Repository: GitBranch,
  "Business UX": Briefcase,
  Integrations: Cable,
  Notifications: Bell,
  Platform: Server,
};

/* ─── Status badge component ───────────────────────────────────────────── */

function StatusBadge({ status }: { status: FeatureStatus }) {
  const config = {
    implemented: {
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    in_progress: {
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    planned: {
      icon: Circle,
      color: "text-foreground/30",
      bg: "bg-foreground/5",
      border: "border-foreground/10",
    },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${c.bg} ${c.border} border text-xs font-medium ${c.color}`}>
      <Icon className="w-3 h-3" />
      {status === "implemented" ? "Implemented" : status === "in_progress" ? "In Progress" : "Planned"}
    </span>
  );
}

/* ─── Progress bar ─────────────────────────────────────────────────────── */

function ProgressBar({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };
  const colors =
    value >= 80
      ? "bg-emerald-500"
      : value >= 50
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className={`w-full ${heights[size]} rounded-full bg-foreground/5 overflow-hidden`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`h-full rounded-full ${colors}`}
      />
    </div>
  );
}

/* ─── Tab type ─────────────────────────────────────────────────────────── */

type TabKey = "overview" | "implemented" | "in_progress" | "planned" | "matrix";

/* ─── Main page ────────────────────────────────────────────────────────── */

export default function PlatformStatusPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const overall = getOverallReadiness();
  const categories = CATEGORY_ORDER.filter((c) => getCategories().includes(c));
  const implemented = getFeaturesByStatus("implemented");
  const inProgress = getFeaturesByStatus("in_progress");
  const planned = getFeaturesByStatus("planned");
  const matrix = getFunctionalMatrix();

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "overview", label: "Overview", count: 0 },
    { key: "implemented", label: "Implemented", count: implemented.length },
    { key: "in_progress", label: "In Progress", count: inProgress.length },
    { key: "planned", label: "Planned", count: planned.length },
    { key: "matrix", label: "Functional Matrix", count: 0 },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Platform Status
              </h1>
              <p className="text-sm text-muted-2">
                Real-time product readiness — built from Feature Registry
              </p>
            </div>
          </div>

          {/* Overall readiness */}
          <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-transparent border border-violet-500/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">
                Overall Product Readiness
              </span>
              <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {overall.percentage}%
              </span>
            </div>
            <ProgressBar value={overall.percentage} size="lg" />
            <div className="flex items-center gap-6 mt-3 text-xs text-muted-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {overall.implemented} implemented
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {overall.inProgress} in progress
              </span>
              <span className="flex items-center gap-1.5">
                <Circle className="w-3.5 h-3.5 text-foreground/30" />
                {overall.planned} planned
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-surface/30 sticky top-14 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
          <OverviewTab categories={categories} />
        )}
        {activeTab === "implemented" && (
          <FeatureListTab features={implemented} status="implemented" />
        )}
        {activeTab === "in_progress" && (
          <FeatureListTab features={inProgress} status="in_progress" />
        )}
        {activeTab === "planned" && (
          <FeatureListTab features={planned} status="planned" />
        )}
        {activeTab === "matrix" && (
          <MatrixTab matrix={matrix} />
        )}
      </div>
    </div>
  );
}

/* ─── Overview Tab ─────────────────────────────────────────────────────── */

function OverviewTab({ categories }: { categories: string[] }) {
  return (
    <div className="space-y-6">
      {/* Category readiness cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const readiness = getCategoryReadiness(cat);
          const Icon = CATEGORY_ICONS[cat] || Shield;

          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl border border-border bg-surface hover:border-violet-500/20 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-violet-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{cat}</h3>
                  <p className="text-xs text-muted-2">
                    {readiness.implemented}/{readiness.total} features
                  </p>
                </div>
                <span
                  className={`text-lg font-bold ${
                    readiness.percentage >= 80
                      ? "text-emerald-500"
                      : readiness.percentage >= 50
                      ? "text-amber-500"
                      : "text-red-500"
                  }`}
                >
                  {readiness.percentage}%
                </span>
              </div>
              <ProgressBar value={readiness.percentage} />
              <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-2">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {readiness.implemented}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  {readiness.inProgress}
                </span>
                <span className="flex items-center gap-1">
                  <Circle className="w-3 h-3 text-foreground/30" />
                  {readiness.planned}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Feature List Tab ─────────────────────────────────────────────────── */

function FeatureListTab({
  features,
  status,
}: {
  features: Feature[];
  status: FeatureStatus;
}) {
  const byCategory = features.reduce<Record<string, Feature[]>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(byCategory).map(([category, feats]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            {(() => {
              const Icon = CATEGORY_ICONS[category] || Shield;
              return <Icon className="w-4 h-4 text-violet-500" />;
            })()}
            {category}
          </h3>
          <div className="space-y-2">
            {feats.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface"
              >
                <StatusBadge status={f.status} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {f.name}
                  </span>
                  <p className="text-xs text-muted-2 mt-0.5 truncate">
                    {f.description}
                  </p>
                </div>
                <span className="text-[10px] text-muted-2 font-mono shrink-0">
                  {f.id}
                </span>
                {f.version && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-muted-2 shrink-0">
                    {f.version}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Matrix Tab ───────────────────────────────────────────────────────── */

function MatrixTab({
  matrix,
}: {
  matrix: ReturnType<typeof getFunctionalMatrix>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider">
              Feature
            </th>
            {matrix.pages.map((page) => (
              <th
                key={page}
                className="text-center py-3 px-2 text-xs font-semibold text-foreground/50 uppercase tracking-wider whitespace-nowrap"
              >
                {PAGE_DISPLAY_NAMES[page] || page.split("/").pop()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.features.map((row) => (
            <tr key={row.featureId} className="border-b border-border/50 hover:bg-surface/50">
              <td className="py-2.5 px-3 text-xs font-medium text-foreground">
                {row.featureName}
              </td>
              {matrix.pages.map((page) => {
                const status = row.statuses[page];
                return (
                  <td key={page} className="text-center py-2.5 px-2">
                    {status === "implemented" ? (
                      <span className="text-emerald-500 text-base">✅</span>
                    ) : status === "in_progress" ? (
                      <span className="text-amber-500 text-base">🟡</span>
                    ) : status ? (
                      <span className="text-red-500 text-base">🔴</span>
                    ) : (
                      <span className="text-foreground/10">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
