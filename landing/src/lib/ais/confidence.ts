/**
 * AIS — Adaptive Intelligence System
 * BLOCK 14: Confidence Engine
 *
 * Calculates user's confidence / trust index based on
 * actions performed, integrations, scans, recommendations.
 * Returns a human-readable narrative, not just a number.
 */

import { getAISMemory, type UserRole } from "./memory";

export interface ConfidenceResult {
  score: number;           // 0-100
  level: "very_high" | "high" | "good" | "needs_attention" | "low";
  narrativeKey: string;    // i18n key for the narrative
  factors: {
    labelKey: string;
    value: number;
    max: number;
    positive: boolean;
  }[];
  nextStepKey: string;     // i18n key for what to do next
  nextStepHref: string;
}

const LEVELS: Array<{ min: number; level: ConfidenceResult["level"] }> = [
  { min: 90, level: "very_high" },
  { min: 75, level: "high" },
  { min: 55, level: "good" },
  { min: 35, level: "needs_attention" },
  { min: 0, level: "low" },
];

export function computeConfidence(): ConfidenceResult {
  const mem = getAISMemory().getMemory();
  const m = mem.metrics;

  // Factor weights
  const scanScore = Math.min(m.scansPerformed / 5, 1) * 25;
  const integrationScore = Math.min(m.connectedIntegrations / 4, 1) * 25;
  const findingsScore = Math.min(m.findingsReviewed / 10, 1) * 20;
  const recScore = Math.min(m.recommendationsFollowed / 5, 1) * 15;
  const reportScore = Math.min(m.reportsGenerated / 3, 1) * 15;

  const total = Math.round(scanScore + integrationScore + findingsScore + recScore + reportScore);
  const level = LEVELS.find((l) => total >= l.min)!.level;

  // Pick narrative and next step based on level and role
  const role = mem.detectedRole || "unknown";
  const narrativeKey = getNarrativeKey(level, role);
  const nextStep = getNextStep(level, m);

  return {
    score: total,
    level,
    narrativeKey,
    factors: [
      { labelKey: "ais.confidence.factor.scans", value: m.scansPerformed, max: 5, positive: m.scansPerformed >= 2 },
      { labelKey: "ais.confidence.factor.integrations", value: m.connectedIntegrations, max: 4, positive: m.connectedIntegrations >= 2 },
      { labelKey: "ais.confidence.factor.findings", value: m.findingsReviewed, max: 10, positive: m.findingsReviewed >= 3 },
      { labelKey: "ais.confidence.factor.recommendations", value: m.recommendationsFollowed, max: 5, positive: m.recommendationsFollowed >= 1 },
      { labelKey: "ais.confidence.factor.reports", value: m.reportsGenerated, max: 3, positive: m.reportsGenerated >= 1 },
    ],
    nextStepKey: nextStep.key,
    nextStepHref: nextStep.href,
  };
}

function getNarrativeKey(
  level: ConfidenceResult["level"],
  role: UserRole
): string {
  if (role === "ceo" || role === "cto") {
    switch (level) {
      case "very_high": return "ais.confidence.narrative.ceo.veryHigh";
      case "high": return "ais.confidence.narrative.ceo.high";
      case "good": return "ais.confidence.narrative.ceo.good";
      case "needs_attention": return "ais.confidence.narrative.ceo.needsAttention";
      case "low": return "ais.confidence.narrative.ceo.low";
    }
  }
  switch (level) {
    case "very_high": return "ais.confidence.narrative.veryHigh";
    case "high": return "ais.confidence.narrative.high";
    case "good": return "ais.confidence.narrative.good";
    case "needs_attention": return "ais.confidence.narrative.needsAttention";
    case "low": return "ais.confidence.narrative.low";
  }
}

function getNextStep(
  level: ConfidenceResult["level"],
  metrics: { scansPerformed: number; connectedIntegrations: number; findingsReviewed: number; recommendationsFollowed: number; reportsGenerated: number }
): { key: string; href: string } {
  if (metrics.scansPerformed === 0) {
    return { key: "ais.confidence.next.scan", href: "/app/scanner" };
  }
  if (metrics.connectedIntegrations === 0) {
    return { key: "ais.confidence.next.integrations", href: "/app/integrations" };
  }
  if (metrics.findingsReviewed === 0) {
    return { key: "ais.confidence.next.findings", href: "/app/findings" };
  }
  if (metrics.reportsGenerated === 0) {
    return { key: "ais.confidence.next.reports", href: "/app/reports" };
  }
  if (level === "needs_attention" || level === "low") {
    return { key: "ais.confidence.next.marketplace", href: "/app/marketplace" };
  }
  return { key: "ais.confidence.next.optimize", href: "/app/dashboard" };
}
