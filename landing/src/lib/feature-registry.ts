/**
 * Feature Registry — Single Source of Truth
 *
 * Reads /data/feature-registry.json and provides computed helpers:
 * - Per-page feature status
 * - Per-category readiness percentage
 * - Overall platform readiness
 * - Functional matrix generation
 */

import registryData from "@/data/feature-registry.json";

/* ─── Types ────────────────────────────────────────────────────────────── */

export type FeatureStatus = "implemented" | "in_progress" | "planned";

export interface Feature {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  pages: string[];
  category: string;
  required: boolean;
  version: string;
}

export interface FeatureRegistry {
  version: string;
  lastUpdated: string;
  features: Feature[];
}

/* ─── Raw data ─────────────────────────────────────────────────────────── */

const registry: FeatureRegistry = registryData as FeatureRegistry;

export function getRegistry(): FeatureRegistry {
  return registry;
}

export function getFeatures(): Feature[] {
  return registry.features;
}

/* ─── Filtering ────────────────────────────────────────────────────────── */

export function getFeaturesByCategory(category: string): Feature[] {
  return registry.features.filter((f) => f.category === category);
}

export function getFeaturesByStatus(status: FeatureStatus): Feature[] {
  return registry.features.filter((f) => f.status === status);
}

export function getFeaturesForPage(pagePath: string): Feature[] {
  return registry.features.filter((f) =>
    f.pages.some((p) => pagePath === p || pagePath.startsWith(p + "/"))
  );
}

export function getFeatureById(id: string): Feature | undefined {
  return registry.features.find((f) => f.id === id);
}

/* ─── Categories ───────────────────────────────────────────────────────── */

export function getCategories(): string[] {
  const cats = new Set(registry.features.map((f) => f.category));
  return Array.from(cats).sort();
}

/* ─── Readiness computation ────────────────────────────────────────────── */

export function getCategoryReadiness(category: string): {
  total: number;
  implemented: number;
  inProgress: number;
  planned: number;
  percentage: number;
} {
  const features = getFeaturesByCategory(category);
  const total = features.length;
  const implemented = features.filter((f) => f.status === "implemented").length;
  const inProgress = features.filter((f) => f.status === "in_progress").length;
  const planned = features.filter((f) => f.status === "planned").length;
  const percentage = total > 0 ? Math.round(((implemented + inProgress * 0.5) / total) * 100) : 0;

  return { total, implemented, inProgress, planned, percentage };
}

export function getOverallReadiness(): {
  total: number;
  implemented: number;
  inProgress: number;
  planned: number;
  percentage: number;
} {
  const features = registry.features;
  const total = features.length;
  const implemented = features.filter((f) => f.status === "implemented").length;
  const inProgress = features.filter((f) => f.status === "in_progress").length;
  const planned = features.filter((f) => f.status === "planned").length;
  const percentage = total > 0 ? Math.round(((implemented + inProgress * 0.5) / total) * 100) : 0;

  return { total, implemented, inProgress, planned, percentage };
}

/* ─── Page compliance ──────────────────────────────────────────────────── */

export function getPageCompliance(pagePath: string): {
  total: number;
  implemented: number;
  missing: Feature[];
  compliant: Feature[];
} {
  const features = getFeaturesForPage(pagePath);
  const implemented = features.filter((f) => f.status === "implemented");
  const missing = features.filter((f) => f.status !== "implemented");

  return {
    total: features.length,
    implemented: implemented.length,
    missing,
    compliant: implemented,
  };
}

/* ─── Functional matrix ───────────────────────────────────────────────── */

export interface MatrixCell {
  featureId: string;
  featureName: string;
  statuses: Record<string, FeatureStatus>;
}

const MATRIX_PAGES = [
  "/app/dashboard",
  "/app/scanner",
  "/app/reports",
  "/app/marketplace",
  "/app/findings",
  "/app/risks",
  "/app/architecture",
  "/app/integrations",
  "/app/workspace",
];

const MATRIX_FEATURE_IDS = [
  "AIS-001",
  "UX-002",
  "UX-004",
  "UX-007",
  "UX-006",
  "AIS-002",
  "UX-012",
  "UX-008",
  "UX-003",
  "NTF-001",
  "BIZ-001",
];

export function getFunctionalMatrix(): {
  pages: string[];
  features: MatrixCell[];
} {
  const features: MatrixCell[] = MATRIX_FEATURE_IDS.map((id) => {
    const feature = getFeatureById(id);
    if (!feature) return { featureId: id, featureName: id, statuses: {} };

    const statuses: Record<string, FeatureStatus> = {};
    MATRIX_PAGES.forEach((page) => {
      if (feature.pages.some((p) => page === p || page.startsWith(p + "/"))) {
        statuses[page] = feature.status;
      }
    });

    return {
      featureId: id,
      featureName: feature.name,
      statuses,
    };
  }).filter((f) => Object.keys(f.statuses).length > 0 || true); // keep all rows

  return { pages: MATRIX_PAGES, features };
}

/* ─── Page display names ──────────────────────────────────────────────── */

export const PAGE_DISPLAY_NAMES: Record<string, string> = {
  "/app/dashboard": "Dashboard",
  "/app/scanner": "Scanner",
  "/app/reports": "Reports",
  "/app/marketplace": "Marketplace",
  "/app/findings": "Findings",
  "/app/risks": "Risks",
  "/app/architecture": "Architecture",
  "/app/integrations": "Integrations",
  "/app/workspace": "Workspace",
  "/app/scans": "Scans",
  "/app/projects": "Projects",
  "/app/repositories": "Repositories",
  "/app/settings": "Settings",
  "/app/notifications": "Notifications",
  "/app/api-keys": "API Keys",
  "/app/cloud": "Cloud",
  "/app/pricing": "Pricing",
  "/app/platform-status": "Platform Status",
};

/* ─── Category display order ──────────────────────────────────────────── */

export const CATEGORY_ORDER = [
  "AIS",
  "UX",
  "Dashboard",
  "Scanner",
  "Reports",
  "Marketplace",
  "Repository",
  "Business UX",
  "Integrations",
  "Notifications",
  "Platform",
];
