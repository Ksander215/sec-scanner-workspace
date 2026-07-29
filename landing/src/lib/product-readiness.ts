/**
 * Product Readiness Registry — INT-046
 *
 * Evaluates each feature by 16 product completeness criteria (not just code presence).
 * Computes: Product Score, UX Score, Business Score, Evidence Score.
 * Generates Product Debt list, Trust findings, UX findings, User Journey, Accessibility.
 *
 * 4 statuses (INT-046 mandatory rule):
 *   - Technical: implemented / not_implemented / broken / deprecated / in_progress
 *   - Evidence: verified / partial / missing
 *   - Product: ready / almost_ready / partial / not_ready
 *   - Production: deployed / broken / not_deployed
 */

import readinessData from "@/data/product-readiness.json";

/* --- Types --- */

export type CriterionValue = true | false | "partial";

export type FourStatuses = {
  technical: "implemented" | "not_implemented" | "broken" | "deprecated" | "in_progress";
  evidence: "verified" | "partial" | "missing";
  product: "ready" | "almost_ready" | "partial" | "not_ready";
  production: "deployed" | "broken" | "not_deployed";
};

export interface FeatureReadiness {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  status: string;
  scores: {
    product: number;
    ux: number;
    business: number;
    evidence: number;
  };
  fourStatuses: FourStatuses;
  criteria: Record<string, CriterionValue>;
  productDebt: string[];
  lastChecked: string;
  responsible: string;
  productionUrl: string;
  remainingWork: string[];
}

export interface TrustFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  page: string;
  finding: string;
  status: "open" | "partial_fixed" | "fixed";
  fix: string;
}

export interface UXFinding {
  id: string;
  page: string;
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface UserJourneyStage {
  stage: string;
  score: number;
  issues: string[];
}

export interface AccessibilityAudit {
  [category: string]: {
    score: number;
    issues: string[];
  };
}

export interface ProductReadinessRegistry {
  version: string;
  lastUpdated: string;
  productionCommit: string;
  auditedBy: string;
  blockScores: Record<string, number>;
  categoryScores: Record<string, { score: number; notes: string }>;
  aisModuleScores: Record<string, { score: number; notes: string }>;
  trustFindings: TrustFinding[];
  uxFindings: UXFinding[];
  userJourney: UserJourneyStage[];
  accessibility: AccessibilityAudit;
  features: Record<string, FeatureReadiness>;
}

/* --- Raw data --- */

const registry: ProductReadinessRegistry = readinessData as ProductReadinessRegistry;

export function getReadinessRegistry(): ProductReadinessRegistry {
  return registry;
}

export function getAllReadiness(): FeatureReadiness[] {
  return Object.values(registry.features);
}

export function getReadinessById(id: string): FeatureReadiness | undefined {
  return registry.features[id];
}

export function getReadinessByCategory(category: string): FeatureReadiness[] {
  return getAllReadiness().filter((f) => f.category === category);
}

/* --- Aggregates --- */

export interface ReadinessStats {
  total: number;
  ready: number;
  almostReady: number;
  partial: number;
  notReady: number;
  averageProductScore: number;
  averageUXScore: number;
  averageBusinessScore: number;
  averageEvidenceScore: number;
  totalDebtItems: number;
  criticalTrustFindings: number;
  openTrustFindings: number;
}

export function getReadinessStats(): ReadinessStats {
  const all = getAllReadiness();
  const total = all.length;
  const ready = all.filter((f) => f.fourStatuses.product === "ready").length;
  const almostReady = all.filter((f) => f.fourStatuses.product === "almost_ready").length;
  const partial = all.filter((f) => f.fourStatuses.product === "partial").length;
  const notReady = all.filter((f) => f.fourStatuses.product === "not_ready").length;

  const avg = (sel: (f: FeatureReadiness) => number) =>
    total > 0 ? Math.round(all.reduce((s, f) => s + sel(f), 0) / total) : 0;

  return {
    total,
    ready,
    almostReady,
    partial,
    notReady,
    averageProductScore: avg((f) => f.scores.product),
    averageUXScore: avg((f) => f.scores.ux),
    averageBusinessScore: avg((f) => f.scores.business),
    averageEvidenceScore: avg((f) => f.scores.evidence),
    totalDebtItems: all.reduce((s, f) => s + f.productDebt.length, 0),
    criticalTrustFindings: registry.trustFindings.filter((t) => t.severity === "critical").length,
    openTrustFindings: registry.trustFindings.filter((t) => t.status === "open").length,
  };
}

/* --- Roadmap Generator (BLOCK 15) --- */

export interface RoadmapItem {
  rank: number;
  title: string;
  impact: "trust" | "sales" | "retention" | "onboarding" | "technical_risk";
  impactScore: number;
  effort: "low" | "medium" | "high";
  description: string;
  affectedFeatures: string[];
}

export function getRoadmap(): RoadmapItem[] {
  // TOP-10 priorities by impact (BLOCK 15)
  return [
    {
      rank: 1,
      title: "Реальная аутентификация пользователей (SSO/Auth)",
      impact: "trust",
      impactScore: 95,
      effort: "high",
      description: "Сейчас нет системы аутентификации. Пользователь не может иметь персональный аккаунт. Это блокирует всю персонализацию, retention и продажи.",
      affectedFeatures: ["PLAT-008"],
    },
    {
      rank: 2,
      title: "Реальные интеграции (замена mock toggle на реальные подключения)",
      impact: "trust",
      impactScore: 92,
      effort: "high",
      description: "TRUST-002: toggles 'Connect' показывают success без реального подключения. Это разрушает доверие — пользователь думает что интеграция настроена, но это не так.",
      affectedFeatures: ["INT-001", "INT-002", "INT-003"],
    },
    {
      rank: 3,
      title: "Real-time progress для сканера (SSE от backend)",
      impact: "trust",
      impactScore: 88,
      effort: "medium",
      description: "TRUST-003: progress bar сканирования симулируется. Пользователь не видит реальный прогресс и не доверяет результатам.",
      affectedFeatures: ["SCAN-001"],
    },
    {
      rank: 4,
      title: "Backend persistence (замена localStorage на server-side)",
      impact: "retention",
      impactScore: 85,
      effort: "high",
      description: "Scan history, projects, notification rules — всё в localStorage. При смене устройства/браузера данные теряются. Backend уже работает (sip-server.service), нужно подключить.",
      affectedFeatures: ["SCAN-002", "PLAT-003", "NTF-001"],
    },
    {
      rank: 5,
      title: "Email reporting (реальный SMTP)",
      impact: "sales",
      impactScore: 78,
      effort: "medium",
      description: "TRUST-004: email sending показывает success, но реальная отправка не происходит. Critically важно для B2B sales.",
      affectedFeatures: ["RPT-002"],
    },
    {
      rank: 6,
      title: "Onboarding wizard для новых пользователей",
      impact: "onboarding",
      impactScore: 82,
      effort: "medium",
      description: "Сейчас новый пользователь попадает на dashboard без руководства. AIS first-visit notification есть, но нужен пошаговый wizard.",
      affectedFeatures: ["DASH-001", "AIS-001"],
    },
    {
      rank: 7,
      title: "Empty/Loading/Error states для всех страниц",
      impact: "trust",
      impactScore: 75,
      effort: "medium",
      description: "16 критериев product completeness — empty/loading/error states есть только на части страниц. Это создаёт ощущение незаконченности.",
      affectedFeatures: ["UX-001", "UX-002", "UX-004", "UX-005"],
    },
    {
      rank: 8,
      title: "Mobile-first оптимизация",
      impact: "retention",
      impactScore: 72,
      effort: "high",
      description: "Accessibility mobile score = 65. Responsive есть, но не mobile-first. Таблицы overflow, sidebar жесты не настроены.",
      affectedFeatures: ["I18N-001", "THEME-001", "NAV-001"],
    },
    {
      rank: 9,
      title: "Screen reader поддержка (a11y)",
      impact: "trust",
      impactScore: 68,
      effort: "medium",
      description: "Screen reader score = 55. Многие иконки без aria-label, form labels частичные. Важно для accessibility compliance.",
      affectedFeatures: ["UX-001", "UX-007", "AIS-001"],
    },
    {
      rank: 10,
      title: "RBAC и Audit Trail (для enterprise клиентов)",
      impact: "sales",
      impactScore: 65,
      effort: "high",
      description: "PLAT-010 RBAC и PLAT-012 Audit Trail — not_started. Critically важно для enterprise sales (SOC2 compliance).",
      affectedFeatures: ["PLAT-010", "PLAT-012"],
    },
  ];
}

/* --- Helpers --- */

export function getScoreColor(score: number): string {
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-amber-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

export function getScoreBg(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-amber-500";
  if (score >= 50) return "bg-orange-500";
  return "bg-red-500";
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return "Ready";
  if (score >= 70) return "Almost Ready";
  if (score >= 50) return "Partial";
  return "Not Ready";
}

export function getFourStatusColor(status: string): string {
  switch (status) {
    case "implemented":
    case "verified":
    case "ready":
    case "deployed":
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
    case "almost_ready":
    case "partial":
    case "in_progress":
      return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
    case "not_implemented":
    case "missing":
    case "not_ready":
    case "not_deployed":
      return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
    case "broken":
      return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
    case "deprecated":
      return "bg-foreground/5 border-foreground/10 text-foreground/40";
    default:
      return "bg-foreground/5 border-foreground/10 text-foreground/40";
  }
}

/* --- Executive Summary (BLOCK 14) --- */

export function getExecutiveSummary(): {
  functionalReadiness: number;
  productReadiness: number;
  keyGaps: string[];
  topPriorities: string[];
} {
  const stats = getReadinessStats();
  const roadmap = getRoadmap();

  return {
    functionalReadiness: 91, // функции технически реализованы
    productReadiness: stats.averageProductScore,
    keyGaps: [
      "Завершение UX (empty/loading/error states на всех страницах)",
      "Адаптация мобильной версии (mobile-first вместо responsive)",
      "Повышение доступности (screen reader, keyboard navigation)",
      "Персонализация AIS (ручная настройка роли, server-side persistence)",
      "Реальные интеграции (замена mock toggle на реальные подключения)",
    ],
    topPriorities: roadmap.slice(0, 5).map((r) => r.title),
  };
}
