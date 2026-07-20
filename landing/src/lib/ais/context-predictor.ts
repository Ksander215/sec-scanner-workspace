/**
 * AIS — Adaptive Intelligence System
 * BLOCK 12: Context Prediction
 *
 * Predicts what the user might want to do next based on
 * current page, time spent, and recent actions.
 */

import { getAISMemory } from "./memory";

export interface ContextPrediction {
  /** i18n key for the prompt message */
  promptKey: string;
  /** Suggested actions */
  actions: {
    labelKey: string;
    href: string;
  }[];
  /** How confident the prediction is (0-1) */
  confidence: number;
}

/* ─── Prediction rules ──────────────────────────────────────────────── */

interface PredictionRule {
  /** Current page route pattern */
  pagePattern: string | RegExp;
  /** Minimum time on page in ms before triggering */
  minTimeMs: number;
  /** Additional condition */
  condition?: (ctx: PredictionContext) => boolean;
  /** The prediction */
  predict: () => ContextPrediction;
}

interface PredictionContext {
  pageVisits: Record<string, number>;
  metrics: {
    scansPerformed: number;
    connectedIntegrations: number;
    reportsGenerated: number;
    findingsReviewed: number;
    toolsInstalled: number;
    recommendationsFollowed: number;
  };
  recentActionTypes: string[];
}

const PREDICTION_RULES: PredictionRule[] = [
  // User is on Reports for 5 min without exporting
  {
    pagePattern: "/app/reports",
    minTimeMs: 5 * 60 * 1000,
    condition: (ctx) => !ctx.recentActionTypes.includes("export"),
    predict: () => ({
      promptKey: "ais.prediction.reports.share",
      actions: [
        { labelKey: "ais.prediction.reports.email", href: "/app/reports/email" },
        { labelKey: "ais.prediction.reports.telegram", href: "/app/reports" },
      ],
      confidence: 0.7,
    }),
  },
  // User is on Dashboard and hasn't scanned yet
  {
    pagePattern: "/app/dashboard",
    minTimeMs: 2 * 60 * 1000,
    condition: (ctx) => ctx.metrics.scansPerformed === 0,
    predict: () => ({
      promptKey: "ais.prediction.dashboard.firstScan",
      actions: [
        { labelKey: "ais.prediction.dashboard.startScan", href: "/app/scanner" },
      ],
      confidence: 0.85,
    }),
  },
  // User on Findings, hasn't reviewed
  {
    pagePattern: "/app/findings",
    minTimeMs: 3 * 60 * 1000,
    condition: (ctx) => ctx.metrics.findingsReviewed === 0,
    predict: () => ({
      promptKey: "ais.prediction.findings.review",
      actions: [
        { labelKey: "ais.prediction.findings.startReview", href: "/app/findings" },
      ],
      confidence: 0.75,
    }),
  },
  // User on Integrations, hasn't connected anything
  {
    pagePattern: "/app/integrations",
    minTimeMs: 3 * 60 * 1000,
    condition: (ctx) => ctx.metrics.connectedIntegrations === 0,
    predict: () => ({
      promptKey: "ais.prediction.integrations.first",
      actions: [
        { labelKey: "ais.prediction.integrations.connect", href: "/app/integrations" },
      ],
      confidence: 0.8,
    }),
  },
  // User on Marketplace, hasn't installed tools
  {
    pagePattern: "/app/marketplace",
    minTimeMs: 3 * 60 * 1000,
    condition: (ctx) => ctx.metrics.toolsInstalled === 0,
    predict: () => ({
      promptKey: "ais.prediction.marketplace.first",
      actions: [
        { labelKey: "ais.prediction.marketplace.install", href: "/app/marketplace" },
      ],
      confidence: 0.8,
    }),
  },
  // User on Scanner after completing a scan
  {
    pagePattern: "/app/scanner",
    minTimeMs: 30 * 1000,
    condition: (ctx) => ctx.metrics.scansPerformed > 0 && ctx.metrics.reportsGenerated === 0,
    predict: () => ({
      promptKey: "ais.prediction.scanner.report",
      actions: [
        { labelKey: "ais.prediction.scanner.generateReport", href: "/app/reports" },
      ],
      confidence: 0.75,
    }),
  },
  // User on Repositories, hasn't connected any
  {
    pagePattern: "/app/repositories",
    minTimeMs: 2 * 60 * 1000,
    condition: (ctx) => ctx.metrics.connectedIntegrations === 0,
    predict: () => ({
      promptKey: "ais.prediction.repositories.connect",
      actions: [
        { labelKey: "ais.prediction.repositories.addGit", href: "/app/repositories" },
      ],
      confidence: 0.8,
    }),
  },
];

/* ─── Engine ─────────────────────────────────────────────────────────── */

export function predictContext(currentRoute: string, timeOnPageMs: number): ContextPrediction | null {
  const mem = getAISMemory().getMemory();
  const recentActionTypes = mem.recentActions
    .slice(-20)
    .map((a) => a.type);

  const ctx: PredictionContext = {
    pageVisits: mem.pageVisits,
    metrics: mem.metrics,
    recentActionTypes,
  };

  for (const rule of PREDICTION_RULES) {
    const matches =
      typeof rule.pagePattern === "string"
        ? currentRoute.startsWith(rule.pagePattern)
        : rule.pagePattern.test(currentRoute);

    if (!matches) continue;
    if (timeOnPageMs < rule.minTimeMs) continue;
    if (rule.condition && !rule.condition(ctx)) continue;

    return rule.predict();
  }

  return null;
}
