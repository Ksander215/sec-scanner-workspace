/**
 * Evidence Registry — Single Source of Truth for Feature Evidence
 *
 * Reads /data/feature-evidence.json and provides:
 * - Per-feature evidence (screenshots, commit, checks, verification date)
 * - Production consistency check (LOCAL vs GITHUB vs SERVER vs PRODUCTION)
 * - AIS module-level verification
 * - Aggregate evidence stats
 *
 * INT-045 / ADR-024: Status `implemented` is forbidden without evidence.
 * Use `verified` (with evidence) or `implemented_not_verified` (legacy).
 */

import evidenceData from "@/data/feature-evidence.json";

/* ─── Types ──────────────────────────────────────────────────────────── */

export type CheckStatus = "pass" | "fail" | "skip" | "partial";

export type EvidenceFeatureStatus =
  | "verified"
  | "partial"
  | "broken"
  | "missing"
  | "deprecated"
  | "in_progress"
  | "implemented_not_verified" // legacy: implemented but no evidence yet
  | "not_started"
  | "planned"
  | "removed";

export interface FeatureChecks {
  build: CheckStatus;
  production: CheckStatus;
  browser: CheckStatus;
  e2e: CheckStatus;
  regression: CheckStatus;
  visual: CheckStatus;
}

export interface FeatureEvidence {
  id: string;
  name: string;
  status: EvidenceFeatureStatus;
  category: string;
  version: string;
  productionUrl: string;
  pages: string[];
  commit: string;
  screenshots: string[];
  video: string | null;
  changedFiles: string[];
  verifiedAt: string | null;
  verifiedBy: string | null;
  checks: FeatureChecks;
  notes: string;
}

export interface AISModuleEvidence {
  status: EvidenceFeatureStatus;
  productionUrl: string;
  screenshot: string;
  notes: string;
}

export interface EvidenceRegistry {
  version: string;
  lastUpdated: string;
  productionCommit: string;
  githubCommit: string;
  serverBuildCommit: string;
  productionSyncStatus: "in_sync" | "out_of_sync" | "unknown";
  verifiedBy: string;
  aisModules: Record<string, AISModuleEvidence>;
  features: Record<string, FeatureEvidence>;
}

/* ─── Raw data ───────────────────────────────────────────────────────── */

const registry: EvidenceRegistry = evidenceData as EvidenceRegistry;

export function getEvidenceRegistry(): EvidenceRegistry {
  return registry;
}

export function getAllEvidence(): FeatureEvidence[] {
  return Object.values(registry.features);
}

export function getEvidenceById(id: string): FeatureEvidence | undefined {
  return registry.features[id];
}

export function getEvidenceByCategory(category: string): FeatureEvidence[] {
  return getAllEvidence().filter((e) => e.category === category);
}

export function getEvidenceByStatus(status: EvidenceFeatureStatus): FeatureEvidence[] {
  return getAllEvidence().filter((e) => e.status === status);
}

/* ─── AIS module-level evidence ──────────────────────────────────────── */

export function getAISModules(): Record<string, AISModuleEvidence> {
  return registry.aisModules;
}

export function getAISModuleNames(): string[] {
  return Object.keys(registry.aisModules).sort();
}

/* ─── Production consistency ─────────────────────────────────────────── */

export interface ProductionConsistency {
  localCommit: string | null;
  githubCommit: string;
  serverBuildCommit: string;
  productionCommit: string;
  syncStatus: "in_sync" | "out_of_sync" | "unknown";
  lastChecked: string;
}

/**
 * NOTE: This is a build-time snapshot. For real-time verification,
 * the page should fetch from /api/evidence/consistency (TODO: backend).
 */
export function getProductionConsistency(): ProductionConsistency {
  return {
    localCommit: registry.productionCommit, // snapshot from build time
    githubCommit: registry.githubCommit,
    serverBuildCommit: registry.serverBuildCommit,
    productionCommit: registry.productionCommit,
    syncStatus: registry.productionSyncStatus,
    lastChecked: registry.lastUpdated,
  };
}

/* ─── Aggregate stats ────────────────────────────────────────────────── */

export interface EvidenceStats {
  total: number;
  verified: number;
  partial: number;
  broken: number;
  missing: number;
  deprecated: number;
  in_progress: number;
  implemented_not_verified: number;
  not_started: number;
  planned: number;
  removed: number;
  withScreenshots: number;
  withVideo: number;
  passedChecks: number;
  failedChecks: number;
  partialChecks: number;
  skippedChecks: number;
  evidenceCompleteness: number; // percentage of features with all 6 checks passed
}

export function getEvidenceStats(): EvidenceStats {
  const all = getAllEvidence();
  const total = all.length;

  const count = (s: EvidenceFeatureStatus) =>
    all.filter((e) => e.status === s).length;

  const withScreenshots = all.filter((e) => e.screenshots.length > 0).length;
  const withVideo = all.filter((e) => e.video !== null).length;

  // Count checks
  let passedChecks = 0, failedChecks = 0, partialChecks = 0, skippedChecks = 0;
  for (const e of all) {
    for (const k of Object.keys(e.checks) as (keyof FeatureChecks)[]) {
      const s = e.checks[k];
      if (s === "pass") passedChecks++;
      else if (s === "fail") failedChecks++;
      else if (s === "partial") partialChecks++;
      else skippedChecks++;
    }
  }
  const totalChecks = total * 6;
  const evidenceCompleteness = totalChecks > 0
    ? Math.round((passedChecks / totalChecks) * 100)
    : 0;

  return {
    total,
    verified: count("verified"),
    partial: count("partial"),
    broken: count("broken"),
    missing: count("missing"),
    deprecated: count("deprecated"),
    in_progress: count("in_progress"),
    implemented_not_verified: count("implemented_not_verified"),
    not_started: count("not_started"),
    planned: count("planned"),
    removed: count("removed"),
    withScreenshots,
    withVideo,
    passedChecks,
    failedChecks,
    partialChecks,
    skippedChecks,
    evidenceCompleteness,
  };
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

/** Is this feature fully verified (all 6 checks pass)? */
export function isFullyVerified(evidence: FeatureEvidence): boolean {
  return Object.values(evidence.checks).every((s) => s === "pass");
}

/** Is this feature considered broken or absent? */
export function isBrokenOrMissing(evidence: FeatureEvidence): boolean {
  return evidence.status === "broken" || evidence.status === "missing" || evidence.status === "removed";
}

/** Has at least one screenshot? */
export function hasVisualEvidence(evidence: FeatureEvidence): boolean {
  return evidence.screenshots.length > 0;
}

/* ─── Canonical status list (INT-045 BLOCK 3) ────────────────────────── */

export const CANONICAL_EVIDENCE_STATUSES: EvidenceFeatureStatus[] = [
  "planned",
  "in_progress",
  "implemented_not_verified",
  "verified",
  "broken",
  "deprecated",
  "removed",
];

/**
 * Migrate legacy statuses to canonical INT-045 statuses.
 * - "implemented" → "implemented_not_verified" (no evidence)
 * - "verified" → "verified" (with evidence)
 * - "partial" → "partial" (kept as-is,介于 in_progress and verified)
 * - "missing" → "broken" (BLOCK 3: only broken allowed, missing merged)
 * - "not_started" → "planned"
 * - "planned" → "planned"
 */
export function migrateToCanonicalStatus(status: string): EvidenceFeatureStatus {
  switch (status) {
    case "verified":
    case "partial":
    case "broken":
    case "deprecated":
    case "in_progress":
    case "planned":
    case "removed":
      return status as EvidenceFeatureStatus;
    case "implemented":
      return "implemented_not_verified";
    case "not_started":
      return "planned";
    case "missing":
      return "broken";
    default:
      return "planned";
  }
}

/** Display label for status */
export function getStatusLabel(status: EvidenceFeatureStatus): string {
  const labels: Record<EvidenceFeatureStatus, string> = {
    verified: "Verified",
    partial: "Partial",
    broken: "Broken",
    missing: "Missing",
    deprecated: "Deprecated",
    in_progress: "In Progress",
    implemented_not_verified: "Implemented (Not Verified)",
    not_started: "Planned",
    planned: "Planned",
    removed: "Removed",
  };
  return labels[status] ?? status;
}

/** Color classes for status badges */
export function getStatusColor(status: EvidenceFeatureStatus): string {
  const colors: Record<EvidenceFeatureStatus, string> = {
    verified: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    partial: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    broken: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
    missing: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
    deprecated: "bg-foreground/5 border-foreground/10 text-foreground/40",
    in_progress: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    implemented_not_verified: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    not_started: "bg-foreground/5 border-foreground/10 text-foreground/40",
    planned: "bg-foreground/5 border-foreground/10 text-foreground/40",
    removed: "bg-foreground/5 border-foreground/10 text-foreground/40",
  };
  return colors[status] ?? colors.planned;
}

/** Check status visual config */
export function getCheckColor(check: CheckStatus): string {
  switch (check) {
    case "pass":
      return "text-emerald-500";
    case "fail":
      return "text-red-500";
    case "partial":
      return "text-amber-500";
    case "skip":
      return "text-foreground/30";
  }
}

export function getCheckIcon(check: CheckStatus): string {
  switch (check) {
    case "pass":
      return "✓";
    case "fail":
      return "✗";
    case "partial":
      return "◐";
    case "skip":
      return "—";
  }
}
