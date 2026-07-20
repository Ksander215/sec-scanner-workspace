/**
 * INT-038 — Developer Overlay
 *
 * Debug page showing feature status per page.
 * Accessible via /app/debug/features or Ctrl+Shift+D.
 * For administrators only.
 */

"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  getFeaturesForPage,
  getPageCompliance,
  getOverallReadiness,
  getCategories,
  getCategoryReadiness,
  type FeatureStatus,
  type Feature,
} from "@/lib/feature-registry";
import { useI18n } from "@/lib/i18n-context";
import {
  Bug,
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  Shield,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";

/* ─── Status icon ──────────────────────────────────────────────────────── */

function StatusIcon({ status }: { status: FeatureStatus }) {
  switch (status) {
    case "implemented":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "in_progress":
      return <Clock className="w-4 h-4 text-amber-500" />;
    case "planned":
      return <Circle className="w-4 h-4 text-foreground/30" />;
  }
}

function StatusLabel({ status }: { status: FeatureStatus }) {
  const labels = {
    implemented: "Implemented",
    in_progress: "In Progress",
    planned: "Planned",
  };
  const colors = {
    implemented: "text-emerald-500",
    in_progress: "text-amber-500",
    planned: "text-foreground/40",
  };

  return <span className={`text-xs font-medium ${colors[status]}`}>{labels[status]}</span>;
}

/* ─── Main page ────────────────────────────────────────────────────────── */

export default function DebugFeaturesPage() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [selectedPage, setSelectedPage] = useState<string>("/app/dashboard");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const overall = getOverallReadiness();
  const categories = getCategories();

  // All known pages from feature registry
  const allPages = new Set<string>();
  const { getFeatures } = require("@/lib/feature-registry");
  getFeatures().forEach((f: Feature) => f.pages.forEach((p) => allPages.add(p)));

  const compliance = getPageCompliance(selectedPage);
  const pageFeatures = getFeaturesForPage(selectedPage);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Bug className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Developer Overlay
              </h1>
              <p className="text-sm text-muted-2">
                Feature status registry — admin only
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                DEV MODE
              </span>
              <span className="text-xs text-muted-2">
                v{overall.percentage}% ready
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Page selector */}
          <div className="lg:col-span-1">
            <h2 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3">
              Select Page
            </h2>
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {Array.from(allPages).sort().map((page) => {
                const comp = getPageCompliance(page);
                const isActive = page === selectedPage;
                return (
                  <button
                    key={page}
                    onClick={() => setSelectedPage(page)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                      isActive
                        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                        : "hover:bg-surface-2 text-foreground/70"
                    }`}
                  >
                    <span className="flex-1 truncate">{page}</span>
                    <span className={`text-[10px] font-mono ${
                      comp.implemented === comp.total && comp.total > 0
                        ? "text-emerald-500"
                        : "text-amber-500"
                    }`}>
                      {comp.implemented}/{comp.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feature status for selected page */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {selectedPage}
              </h2>
              {compliance.total > 0 && (
                <span
                  className={`text-xs font-medium ${
                    compliance.implemented === compliance.total
                      ? "text-emerald-500"
                      : "text-amber-500"
                  }`}
                >
                  {compliance.implemented === compliance.total && compliance.total > 0
                    ? "Page fully compliant"
                    : `${compliance.implemented}/${compliance.total} features implemented`}
                </span>
              )}
            </div>

            {pageFeatures.length === 0 ? (
              <div className="p-8 rounded-xl border border-border bg-surface text-center">
                <p className="text-sm text-muted-2">
                  No registered features for this page
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pageFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface"
                  >
                    <StatusIcon status={feature.status} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {feature.name}
                      </span>
                      <p className="text-xs text-muted-2 mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                    <StatusLabel status={feature.status} />
                    <span className="text-[10px] text-muted-2 font-mono">
                      {feature.id}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Missing features */}
            {compliance.missing.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5" />
                  Not Yet Implemented
                </h3>
                <div className="space-y-2">
                  {compliance.missing.map((feature) => (
                    <div
                      key={feature.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-red-500/10 bg-red-500/5"
                    >
                      <StatusIcon status={feature.status} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">
                          {feature.name}
                        </span>
                      </div>
                      <StatusLabel status={feature.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category overview */}
            <div className="mt-6">
              <h2 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3">
                Category Readiness
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => {
                  const readiness = getCategoryReadiness(cat);
                  return (
                    <div
                      key={cat}
                      className="p-3 rounded-lg border border-border bg-surface"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-foreground">{cat}</span>
                        <span className="text-xs font-bold text-foreground/50">
                          {readiness.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-foreground/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            readiness.percentage >= 80
                              ? "bg-emerald-500"
                              : readiness.percentage >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${readiness.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
