/**
 * Architecture Registry — INT-048
 *
 * Unified AI Architecture: SIP + AIS + AI CTO + AIO
 * Each center has: Mission, Responsibilities, Modules, Dependencies, KPIs, Evidence
 */

import architectureData from "@/data/architecture-registry.json";

export type CenterId = "SIP" | "AIS" | "AI_CTO" | "AIO";

export interface ArchitectureModule {
  id: string;
  name: string;
  readiness: number;
  features: string[];
}

export interface ArchitectureKPI {
  name: string;
  value: string;
  target: string;
}

export interface ArchitectureCenter {
  id: CenterId;
  name: string;
  nameRu: string;
  icon: string;
  color: string;
  score: number;
  mission: string;
  responsibilities: string[];
  modules: ArchitectureModule[];
  dependencies: CenterId[];
  inputs: string[];
  outputs: string[];
  kpis: ArchitectureKPI[];
  owner: string;
  evidence: string[];
}

export interface CommunicationLink {
  from: CenterId;
  to: CenterId;
  type: "reads" | "writes" | "triggers" | "deploys" | "reports" | "queries";
  description: string;
}

export interface RoutingRule {
  pattern: string;
  center: CenterId;
  example: string;
}

export interface FutureAgent {
  id: string;
  name: string;
  center: CenterId;
  description: string;
  dataSources: string[];
  status: "planned" | "in_progress" | "verified";
}

export interface ArchitectureRegistry {
  version: string;
  lastUpdated: string;
  productionCommit: string;
  unifiedTerminology: Record<string, string>;
  centers: Record<CenterId, ArchitectureCenter>;
  communicationGraph: CommunicationLink[];
  responsibilityMatrix: Record<string, CenterId>;
  futureAgents: FutureAgent[];
  aiRouting: {
    description: string;
    rules: RoutingRule[];
    fallback: CenterId;
  };
  explainability: {
    description: string;
    examples: Array<{
      question: string;
      center: CenterId;
      answer: string;
      source: string;
    }>;
  };
}

const registry: ArchitectureRegistry = architectureData as ArchitectureRegistry;

export function getArchitectureRegistry(): ArchitectureRegistry {
  return registry;
}

export function getCenter(id: CenterId): ArchitectureCenter | undefined {
  return registry.centers[id];
}

export function getAllCenters(): ArchitectureCenter[] {
  return Object.values(registry.centers);
}

export function getOverallArchitectureScore(): number {
  const centers = getAllCenters();
  return Math.round(centers.reduce((s, c) => s + c.score, 0) / centers.length);
}

/* --- AI Routing Engine (BLOCK 10) --- */

export interface RoutingResult {
  center: CenterId;
  matchedRule?: RoutingRule;
  isFallback: boolean;
  explanation: string;
}

export function routeQuestion(question: string): RoutingResult {
  const q = question.toLowerCase();
  for (const rule of registry.aiRouting.rules) {
    const patterns = rule.pattern.split("|");
    if (patterns.some((p) => q.includes(p.trim()))) {
      return {
        center: rule.center,
        matchedRule: rule,
        isFallback: false,
        explanation: `Запрос соответствует правилу маршрутизации для центра ${rule.center}. Пример: "${rule.example}"`,
      };
    }
  }
  return {
    center: registry.aiRouting.fallback,
    isFallback: true,
    explanation: `Запрос не соответствует ни одному правилу. Перенаправление в fallback центр ${registry.aiRouting.fallback}.`,
  };
}

/* --- Responsibility Matrix --- */

export function getFeatureOwner(featureName: string): CenterId | null {
  const matrix = registry.responsibilityMatrix;
  for (const [key, value] of Object.entries(matrix)) {
    if (featureName.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return null;
}

/* --- Communication Graph helpers --- */

export function getCommunicationsFor(centerId: CenterId): {
  incoming: CommunicationLink[];
  outgoing: CommunicationLink[];
} {
  const incoming = registry.communicationGraph.filter((l) => l.to === centerId);
  const outgoing = registry.communicationGraph.filter((l) => l.from === centerId);
  return { incoming, outgoing };
}

/* --- Center score color --- */

export function getCenterScoreColor(score: number): string {
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-amber-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

export function getCenterScoreBg(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-amber-500";
  if (score >= 50) return "bg-orange-500";
  return "bg-red-500";
}

/* --- Icon mapping (lucide-react names → components resolved in UI) --- */

export const CENTER_ICONS: Record<string, string> = {
  ShieldCheck: "ShieldCheck",
  Sparkles: "Sparkles",
  Brain: "Brain",
  Cpu: "Cpu",
};

/* --- Center metadata shortcuts --- */

export const CENTER_LABELS: Record<CenterId, string> = {
  SIP: "SIP",
  AIS: "AIS",
  AI_CTO: "AI CTO",
  AIO: "AIO",
};

export const CENTER_FULL_NAMES: Record<CenterId, string> = {
  SIP: "Security Intelligence Platform",
  AIS: "Adaptive Intelligence System",
  AI_CTO: "Product Intelligence Center",
  AIO: "Autonomous Operations Center",
};
