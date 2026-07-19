/**
 * SIP Core Engine — Plugin Registry
 * Manages installed plugins. Marketplace install/remove affects Scanner
 * automatically through this registry.
 *
 * After Install:
 *   download → install → registry update → Scanner sees new tool
 *
 * After Remove:
 *   registry update → Scanner no longer shows tool
 *
 * All without page reload.
 */

import type { RegistryEntry, InstallStatus, PluginManifest } from "./types";
import { ALL_MANIFESTS, MANIFESTS_BY_ID, BUILTIN_TOOL_IDS } from "./plugins";

const REGISTRY_KEY = "sip_plugin_registry";

// ─── Registry persistence ─────────────────────────────────────────────────

interface RegistryState {
  entries: Record<string, {
    status: InstallStatus;
    installedAt?: string;
    version?: string;
    lastRun?: string;
    health: "healthy" | "degraded" | "error" | "unknown";
    signature?: string;
  }>;
}

function loadState(): RegistryState {
  if (typeof window === "undefined") {
    return { entries: {} };
  }
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { entries: {} };
}

function saveState(state: RegistryState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(state));
}

// ─── Public API ───────────────────────────────────────────────────────────

/** Get all registry entries (combines manifests + persisted state) */
export function getRegistry(): RegistryEntry[] {
  const state = loadState();

  return ALL_MANIFESTS.map((manifest) => {
    const saved = state.entries[manifest.id];
    const isBuiltin = BUILTIN_TOOL_IDS.has(manifest.id);

    return {
      manifest,
      status: isBuiltin
        ? "installed"
        : (saved?.status || "not_installed") as InstallStatus,
      installedAt: isBuiltin ? "builtin" : saved?.installedAt,
      version: isBuiltin ? manifest.version : saved?.version,
      lastRun: saved?.lastRun,
      health: isBuiltin ? "healthy" : (saved?.health || "unknown") as RegistryEntry["health"],
      signature: saved?.signature,
    };
  });
}

/** Get only installed tools */
export function getInstalledTools(): RegistryEntry[] {
  return getRegistry().filter((e) => e.status === "installed");
}

/** Get manifest by ID */
export function getManifest(id: string): PluginManifest | undefined {
  return MANIFESTS_BY_ID[id];
}

/** Check if a tool is installed */
export function isInstalled(id: string): boolean {
  if (BUILTIN_TOOL_IDS.has(id)) return true;
  const state = loadState();
  return state.entries[id]?.status === "installed";
}

/** Install a plugin (simulates download → install → verify) */
export async function installPlugin(
  id: string,
  onProgress?: (status: InstallStatus) => void
): Promise<boolean> {
  const manifest = MANIFESTS_BY_ID[id];
  if (!manifest) return false;
  if (BUILTIN_TOOL_IDS.has(id)) return true; // already builtin

  const state = loadState();

  // Step 1: Downloading
  state.entries[id] = { status: "downloading", health: "unknown" };
  saveState(state);
  onProgress?.("downloading");
  await delay(600);

  // Step 2: Installing
  state.entries[id] = { status: "installing", health: "unknown" };
  saveState(state);
  onProgress?.("installing");
  await delay(800);

  // Step 3: Verifying
  state.entries[id] = { status: "verifying", health: "unknown" };
  saveState(state);
  onProgress?.("verifying");
  await delay(400);

  // Step 4: Installed
  state.entries[id] = {
    status: "installed",
    installedAt: new Date().toISOString(),
    version: manifest.version,
    health: "healthy",
    signature: `sha256:${id}-${Date.now()}`,
  };
  saveState(state);
  onProgress?.("installed");

  // Also update legacy marketplace key for backward compat
  addLegacyMarketplaceInstalled(id);

  return true;
}

/** Remove a plugin */
export function removePlugin(id: string): boolean {
  if (BUILTIN_TOOL_IDS.has(id)) return false; // cannot remove builtins

  const state = loadState();
  delete state.entries[id];
  saveState(state);

  // Also update legacy marketplace key
  removeLegacyMarketplaceInstalled(id);

  return true;
}

/** Update last run timestamp */
export function updateLastRun(id: string) {
  const state = loadState();
  if (state.entries[id]) {
    state.entries[id].lastRun = new Date().toISOString();
    saveState(state);
  } else if (BUILTIN_TOOL_IDS.has(id)) {
    state.entries[id] = {
      status: "installed",
      health: "healthy",
      lastRun: new Date().toISOString(),
    };
    saveState(state);
  }
}

/** Get tool health info */
export function getToolHealth(id: string): RegistryEntry | undefined {
  return getRegistry().find((e) => e.manifest.id === id);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Legacy marketplace compatibility ─────────────────────────────────────
// The old marketplace page used sip_marketplace_installed in localStorage.
// We maintain compat so both old and new code can coexist during migration.

const LEGACY_KEY = "sip_marketplace_installed";

/** Map from engine plugin ID → legacy marketplace item ID */
const ENGINE_TO_LEGACY: Record<string, string> = {
  "owasp-zap": "mpl-001",
  "semgrep": "mpl-009",
  "nikto": "mpl-010",
  "nmap": "mpl-003",
  "nuclei": "mpl-004",
  "trivy": "mpl-005",
};

/** Map from legacy marketplace item ID → engine plugin ID */
const LEGACY_TO_ENGINE: Record<string, string> = Object.fromEntries(
  Object.entries(ENGINE_TO_LEGACY).map(([k, v]) => [v, k])
);

function addLegacyMarketplaceInstalled(engineId: string) {
  const legacyId = ENGINE_TO_LEGACY[engineId];
  if (!legacyId) return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(legacyId);
    localStorage.setItem(LEGACY_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

function removeLegacyMarketplaceInstalled(engineId: string) {
  const legacyId = ENGINE_TO_LEGACY[engineId];
  if (!legacyId) return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.delete(legacyId);
    localStorage.setItem(LEGACY_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

/** Check if a legacy marketplace ID maps to an installed engine plugin */
export function isLegacyMarketplaceInstalled(legacyId: string): boolean {
  const engineId = LEGACY_TO_ENGINE[legacyId];
  if (engineId) return isInstalled(engineId);
  // For non-engine marketplace items (rules, dashboards, etc.), check legacy
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    return set.has(legacyId);
  } catch {
    return false;
  }
}

/** Install a legacy marketplace item (non-engine items like rules, dashboards) */
export function addLegacyInstalled(legacyId: string) {
  const engineId = LEGACY_TO_ENGINE[legacyId];
  if (engineId) {
    // Engine plugin — use full install flow
    installPlugin(engineId);
    return;
  }
  // Non-engine item — just save to legacy key
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(legacyId);
    localStorage.setItem(LEGACY_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

/** Remove a legacy marketplace item */
export function removeLegacyInstalled(legacyId: string) {
  const engineId = LEGACY_TO_ENGINE[legacyId];
  if (engineId) {
    removePlugin(engineId);
    return;
  }
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.delete(legacyId);
    localStorage.setItem(LEGACY_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

/** Get all legacy installed IDs */
export function getLegacyInstalled(): Set<string> {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}
