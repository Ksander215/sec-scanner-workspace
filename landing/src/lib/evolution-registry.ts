/**
 * Evolution Registry — INT-049 Platform Evolution Framework
 *
 * Every feature has: owner center, dependencies, affected centers, impact score.
 * When a feature changes, system automatically builds evolution impact map.
 */

import evolutionData from "@/data/evolution-registry.json";
import type { CenterId } from "@/lib/architecture-registry";

export type EvolutionStars = 1 | 2 | 3 | 4 | 5;

export interface EvolutionFeature {
  id: string;
  name: string;
  category: string;
  status: string;
  owner: CenterId;
  dependencies: string[];
  affectedCenters: Record<CenterId, EvolutionStars>;
  impactScore: number;
  requiredUpdates: string[];
  documentation: string[];
  tests: string[];
  evidence: string;
  version: string;
}

export interface EvolutionRegistry {
  version: string;
  lastUpdated: string;
  productionCommit: string;
  description: string;
  evolutionPipeline: string[];
  synchronizedRegistries: string[];
  features: Record<string, EvolutionFeature>;
}

const registry: EvolutionRegistry = evolutionData as EvolutionRegistry;

export function getEvolutionRegistry(): EvolutionRegistry {
  return registry;
}

export function getAllEvolutionFeatures(): EvolutionFeature[] {
  return Object.values(registry.features);
}

export function getEvolutionFeature(id: string): EvolutionFeature | undefined {
  return registry.features[id];
}

export function getEvolutionByOwner(center: CenterId): EvolutionFeature[] {
  return getAllEvolutionFeatures().filter((f) => f.owner === center);
}

/* --- Evolution Impact Analysis (BLOCK 1, 3) --- */

export interface EvolutionImpactReport {
  featureId: string;
  featureName: string;
  owner: CenterId;
  impactStars: Record<CenterId, EvolutionStars>;
  impactScore: number;
  affectedCentersList: CenterId[];
  requiredUpdates: string[];
  requiredTests: string[];
  affectedKPIs: string[];
  affectedModules: string[];
  evolutionChain: { step: string; description: string }[];
}

export function analyzeEvolutionImpact(featureId: string): EvolutionImpactReport | null {
  const feature = registry.features[featureId];
  if (!feature) return null;

  const affectedCentersList = (Object.keys(feature.affectedCenters) as CenterId[])
    .filter((c) => feature.affectedCenters[c] >= 2)
    .sort((a, b) => feature.affectedCenters[b] - feature.affectedCenters[a]);

  // Build evolution chain (BLOCK 1)
  const chain: { step: string; description: string }[] = [
    { step: "Feature Change", description: `${feature.name} (${feature.id}) modified` },
    { step: "Owner", description: `${feature.owner} center owns this feature` },
  ];

  if (feature.owner === "SIP") {
    chain.push({ step: "AIS", description: "Новые объяснения, уведомления, рекомендации" });
    chain.push({ step: "AI CTO", description: "Изменение Product Readiness, Executive Summary, Product Debt" });
    chain.push({ step: "AIO", description: "Новые проверки, автоматизации, pipeline" });
  } else if (feature.owner === "AIS") {
    chain.push({ step: "AI CTO", description: "Обновление engagement метрик, Product Readiness" });
    chain.push({ step: "AIO", description: "Новые E2E тесты для AIS сценариев" });
  } else if (feature.owner === "AI_CTO") {
    chain.push({ step: "AIO", description: "Trigger verification + deploy" });
    chain.push({ step: "SIP", description: "Обновление dashboard метрик" });
  } else if (feature.owner === "AIO") {
    chain.push({ step: "SIP", description: "Deploy новой версии" });
    chain.push({ step: "AI CTO", description: "Verification отчёт" });
  }

  chain.push({ step: "Verification", description: "Production проверка + evidence update" });
  chain.push({ step: "Platform Updated", description: "Все реестры синхронизированы" });

  // Determine affected KPIs based on owner
  const kpiMap: Record<CenterId, string[]> = {
    SIP: ["Scan success rate", "Average scan time", "Findings accuracy", "Report generation time"],
    AIS: ["Notification engagement rate", "Tip dismissal rate", "Adaptive timing accuracy", "First-visit conversion"],
    AI_CTO: ["Product readiness", "Functional readiness", "Open trust findings", "Roadmap items completed"],
    AIO: ["Deploy success rate", "MTTR", "Regression coverage", "Sync consistency"],
  };

  // Determine affected modules
  const moduleMap: Record<CenterId, string[]> = {
    SIP: ["SIP-SEC", "SIP-RISK", "SIP-REPORTS"],
    AIS: ["AIS-INTEL", "AIS-NOTIF", "AIS-MEMORY"],
    AI_CTO: ["CTO-READINESS", "CTO-DEBT", "CTO-TRUST"],
    AIO: ["AIO-BUILD", "AIO-DEPLOY", "AIO-VERIFY"],
  };

  return {
    featureId,
    featureName: feature.name,
    owner: feature.owner,
    impactStars: feature.affectedCenters,
    impactScore: feature.impactScore,
    affectedCentersList,
    requiredUpdates: feature.requiredUpdates,
    requiredTests: feature.tests,
    affectedKPIs: kpiMap[feature.owner] || [],
    affectedModules: moduleMap[feature.owner] || [],
    evolutionChain: chain,
  };
}

/* --- Stars helpers --- */

export function starsToString(stars: EvolutionStars): string {
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export function getStarsColor(stars: EvolutionStars): string {
  if (stars >= 5) return "text-emerald-500";
  if (stars >= 4) return "text-cyan-500";
  if (stars >= 3) return "text-amber-500";
  if (stars >= 2) return "text-orange-500";
  return "text-red-500";
}

/* --- Aggregate stats --- */

export interface EvolutionStats {
  total: number;
  byOwner: Record<CenterId, number>;
  avgImpactScore: number;
  topImpact: EvolutionFeature[];
  synchronizedRegistriesCount: number;
}

export function getEvolutionStats(): EvolutionStats {
  const all = getAllEvolutionFeatures();
  const byOwner = { SIP: 0, AIS: 0, AI_CTO: 0, AIO: 0 } as Record<CenterId, number>;
  for (const f of all) {
    byOwner[f.owner]++;
  }
  const avgImpactScore = all.length > 0 ? Math.round(all.reduce((s, f) => s + f.impactScore, 0) / all.length) : 0;
  const topImpact = [...all].sort((a, b) => b.impactScore - a.impactScore).slice(0, 10);

  return {
    total: all.length,
    byOwner,
    avgImpactScore,
    topImpact,
    synchronizedRegistriesCount: registry.synchronizedRegistries.length,
  };
}

/* --- AI Copilot Intent Detection (BLOCK 7) --- */

export interface IntentResult {
  intent: string;
  center: CenterId;
  confidence: number;
  explanation: string;
}

const INTENT_PATTERNS: { patterns: string[]; intent: string; center: CenterId }[] = [
  { patterns: ["сканируй", "scan", "просканируй", "scan this", "vulnerability scan"], intent: "scan_request", center: "SIP" },
  { patterns: ["риск", "risk", "угроз", "threat"], intent: "risk_inquiry", center: "SIP" },
  { patterns: ["отчёт", "report", "export"], intent: "report_request", center: "SIP" },
  { patterns: ["объясни", "explain", "почему", "why", "что это"], intent: "explain_request", center: "AIS" },
  { patterns: ["подсказ", "tip", "recommend", "посоветуй"], intent: "tip_request", center: "AIS" },
  { patterns: ["цель", "goal", "next step"], intent: "goal_inquiry", center: "AIS" },
  { patterns: ["готовность", "readiness", "debt", "долг"], intent: "readiness_inquiry", center: "AI_CTO" },
  { patterns: ["roadmap", "дорожн", "план", "plan"], intent: "roadmap_inquiry", center: "AI_CTO" },
  { patterns: ["trust", "довер", "fake"], intent: "trust_inquiry", center: "AI_CTO" },
  { patterns: ["деплой", "deploy", "разверни", "build", "сборк"], intent: "deploy_request", center: "AIO" },
  { patterns: ["recover", "восстано", "rollback", "откат"], intent: "recovery_request", center: "AIO" },
  { patterns: ["verify", "провер", "evidence", "доказательств"], intent: "verify_request", center: "AIO" },
];

export function detectIntent(query: string): IntentResult {
  const q = query.toLowerCase();
  for (const rule of INTENT_PATTERNS) {
    if (rule.patterns.some((p) => q.includes(p))) {
      return {
        intent: rule.intent,
        center: rule.center,
        confidence: 0.85,
        explanation: `Обнаружен паттерн: "${rule.patterns[0]}". Маршрутизация в центр ${rule.center}.`,
      };
    }
  }
  return {
    intent: "unknown",
    center: "AI_CTO",
    confidence: 0.3,
    explanation: "Не удалось определить intent. Fallback: AI CTO (как наиболее общий центр).",
  };
}
