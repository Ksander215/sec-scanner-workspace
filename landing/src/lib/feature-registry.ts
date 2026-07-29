/**
 * Feature Registry — Single Source of Truth
 *
 * Reads /data/feature-registry.json and provides computed helpers:
 * - Per-page feature status
 * - Per-category readiness percentage
 * - Overall platform readiness
 * - Functional matrix generation
 *
 * INT-043: Extended to support 7 statuses per ADR-018:
 *   not_started, in_progress, implemented, verified, broken, missing, deprecated
 * Backward compatible: legacy statuses (implemented/in_progress/planned) still work.
 */

import registryData from "@/data/feature-registry.json";

/* --- Types -------------------------------------------------------------- */

/**
 * All valid feature statuses (INT-044 / ADR-018 expanded).
 * Legacy statuses `planned` and `implemented` kept for backward compat
 * but `implemented` should NOT be used in new code (use `verified` instead).
 */
export type FeatureStatus =
  | "not_started"
  | "in_progress"
  | "implemented" // legacy alias — prefer `verified`
  | "verified"
  | "partial"
  | "broken"
  | "missing"
  | "deprecated"
  // Legacy statuses kept for backward compatibility during migration
  | "planned";

/** Canonical 8 statuses (excluding legacy aliases) */
export const CANONICAL_STATUSES: FeatureStatus[] = [
  "not_started",
  "in_progress",
  "verified",
  "partial",
  "broken",
  "missing",
  "deprecated",
];

/** Normalize legacy statuses */
export function normalizeStatus(status: string): FeatureStatus {
  if (status === "planned") return "not_started";
  // Note: 'implemented' kept as-is for backward compat in JSON, but new code uses 'verified'
  return status as FeatureStatus;
}

/** Is a status considered "production-verified"? Only `verified` */
export function isVerified(status: FeatureStatus): boolean {
  return status === "verified";
}

/** Is a status considered "user-visible working"? (excludes broken/missing/deprecated/not_started) */
export function isWorking(status: FeatureStatus): boolean {
  return (
    status === "verified" ||
    status === "implemented" ||
    status === "partial" ||
    status === "in_progress"
  );
}

/** Is a status considered "broken or absent"? */
export function isBroken(status: FeatureStatus): boolean {
  return status === "broken" || status === "missing" || status === "deprecated";
}

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

/* --- Raw data ----------------------------------------------------------- */

const registry: FeatureRegistry = registryData as FeatureRegistry;

export function getRegistry(): FeatureRegistry {
  return registry;
}

export function getFeatures(): Feature[] {
  return registry.features;
}

/* --- Filtering ---------------------------------------------------------- */

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

/* --- Categories --------------------------------------------------------- */

export function getCategories(): string[] {
  const cats = new Set(registry.features.map((f) => f.category));
  return Array.from(cats).sort();
}

/* --- Readiness computation ---------------------------------------------- */

export function getCategoryReadiness(category: string): {
  total: number;
  implemented: number;
  inProgress: number;
  planned: number;
  broken: number;
  missing: number;
  deprecated: number;
  verified: number;
  notStarted: number;
  percentage: number;
} {
  const features = getFeaturesByCategory(category);
  const total = features.length;
  const implemented = features.filter((f) => normalizeStatus(f.status) === "implemented").length;
  const verified = features.filter((f) => normalizeStatus(f.status) === "verified").length;
  const inProgress = features.filter((f) => normalizeStatus(f.status) === "in_progress").length;
  const planned = features.filter((f) => normalizeStatus(f.status) === "not_started" || f.status === "planned").length;
  const broken = features.filter((f) => normalizeStatus(f.status) === "broken").length;
  const missing = features.filter((f) => normalizeStatus(f.status) === "missing").length;
  const deprecated = features.filter((f) => normalizeStatus(f.status) === "deprecated").length;
  const notStarted = features.filter((f) => normalizeStatus(f.status) === "not_started").length;

  // Readiness formula (INT-043):
  //   verified = 100% weight
  //   implemented = 80% weight (not yet verified on production)
  //   in_progress = 50% weight
  //   not_started / planned = 0% weight
  //   broken / missing / deprecated = -10% penalty (negative contribution)
  const score = verified * 1.0 + implemented * 0.8 + inProgress * 0.5 - (broken + missing + deprecated) * 0.1;
  const percentage = total > 0 ? Math.max(0, Math.min(100, Math.round((score / total) * 100))) : 0;

  return { total, implemented, verified, inProgress, planned, broken, missing, deprecated, notStarted, percentage };
}

export function getOverallReadiness(): {
  total: number;
  implemented: number;
  inProgress: number;
  planned: number;
  broken: number;
  missing: number;
  deprecated: number;
  verified: number;
  notStarted: number;
  percentage: number;
} {
  const features = registry.features;
  const total = features.length;
  const implemented = features.filter((f) => normalizeStatus(f.status) === "implemented").length;
  const verified = features.filter((f) => normalizeStatus(f.status) === "verified").length;
  const inProgress = features.filter((f) => normalizeStatus(f.status) === "in_progress").length;
  const planned = features.filter((f) => normalizeStatus(f.status) === "not_started" || f.status === "planned").length;
  const broken = features.filter((f) => normalizeStatus(f.status) === "broken").length;
  const missing = features.filter((f) => normalizeStatus(f.status) === "missing").length;
  const deprecated = features.filter((f) => normalizeStatus(f.status) === "deprecated").length;
  const notStarted = features.filter((f) => normalizeStatus(f.status) === "not_started").length;

  const score = verified * 1.0 + implemented * 0.8 + inProgress * 0.5 - (broken + missing + deprecated) * 0.1;
  const percentage = total > 0 ? Math.max(0, Math.min(100, Math.round((score / total) * 100))) : 0;

  return { total, implemented, verified, inProgress, planned, broken, missing, deprecated, notStarted, percentage };
}

/* --- Page compliance ---------------------------------------------------- */

export function getPageCompliance(pagePath: string): {
  total: number;
  implemented: number;
  missing: Feature[];
  compliant: Feature[];
  broken: Feature[];
} {
  const features = getFeaturesForPage(pagePath);
  const isCompliantStatus = (s: string) => {
    const n = normalizeStatus(s);
    return n === "implemented" || n === "verified";
  };
  const isBrokenStatus = (s: string) => {
    const n = normalizeStatus(s);
    return n === "broken" || n === "missing" || n === "deprecated";
  };
  const implemented = features.filter((f) => isCompliantStatus(f.status));
  const missing = features.filter((f) => !isCompliantStatus(f.status));
  const broken = features.filter((f) => isBrokenStatus(f.status));

  return {
    total: features.length,
    implemented: implemented.length,
    missing,
    compliant: implemented,
    broken,
  };
}

/* --- Functional matrix ------------------------------------------------- */

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

/* --- Page display names ------------------------------------------------ */

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

/* --- Category display order -------------------------------------------- */

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
