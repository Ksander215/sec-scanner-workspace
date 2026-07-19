/**
 * SIP Server — In-Memory + File Store
 * Persists projects, scans, findings, and plugin registry.
 *
 * Phase 1: File-based JSON storage.
 * Phase 2: SQLite or PostgreSQL migration.
 */

import fs from "fs";
import path from "path";
import type { Project, ScanResult, Finding, InstallStatus } from "../types";
import { BUILTIN_TOOL_IDS } from "../plugins/manifests";

// ─── Storage paths ────────────────────────────────────────────────────────

const DATA_DIR = process.env.SIP_DATA_DIR || "/var/lib/sip";
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const SCANS_FILE = path.join(DATA_DIR, "scans.json");
const REGISTRY_FILE = path.join(DATA_DIR, "registry.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Generic file persistence ─────────────────────────────────────────────

function loadFromFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error(`[SIP Store] Error loading ${filePath}:`, err);
  }
  return defaultValue;
}

function saveToFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`[SIP Store] Error saving ${filePath}:`, err);
  }
}

// ─── Projects ─────────────────────────────────────────────────────────────

let projects: Project[] = loadFromFile<Project[]>(PROJECTS_FILE, getDefaultProjects());

export function getProjects(): Project[] {
  return projects;
}

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function saveProject(project: Project): void {
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    projects.push(project);
  }
  persistProjects();
}

export function createProject(name: string, description: string): Project {
  const project: Project = {
    id: `PRJ-${String(Date.now()).slice(-6)}`,
    name,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    securityScore: 100,
    assets: 0,
    status: "idle",
    members: 1,
    scans: [],
    findings: [],
    installedTools: [...BUILTIN_TOOL_IDS],
    settings: {
      defaultSeverity: "medium",
      autoScan: false,
      notificationChannels: [],
    },
  };
  saveProject(project);
  return project;
}

export function deleteProject(id: string): void {
  projects = projects.filter((p) => p.id !== id);
  persistProjects();
}

function persistProjects() {
  saveToFile(PROJECTS_FILE, projects);
}

// ─── Scan Results ─────────────────────────────────────────────────────────

let scans: ScanResult[] = loadFromFile<ScanResult[]>(SCANS_FILE, []);

export function getScanResults(): ScanResult[] {
  return scans;
}

export function getScanResult(id: string): ScanResult | undefined {
  return scans.find((s) => s.id === id);
}

export function saveScanResult(scan: ScanResult): void {
  scans.unshift(scan);
  if (scans.length > 100) scans.length = 100;
  saveToFile(SCANS_FILE, scans);

  // Update project
  const project = getProject(scan.projectId);
  if (project) {
    project.scans = [scan.id, ...project.scans.filter((s) => s !== scan.id)];
    project.lastScan = scan.completedAt;
    project.securityScore = 100 - scan.riskScore;
    project.assets = new Set(scan.findings.map((f) => f.asset)).size;
    project.status = scan.riskScore >= 80 ? "critical" : scan.riskScore >= 60 ? "warning" : "healthy";
    saveProject(project);
  }
}

export function getProjectScans(projectId: string): ScanResult[] {
  return scans.filter((s) => s.projectId === projectId);
}

export function getLatestFindings(): Finding[] {
  if (scans.length === 0) return [];
  return scans[0].findings;
}

// ─── Plugin Registry ──────────────────────────────────────────────────────

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

let registryState: RegistryState = loadFromFile<RegistryState>(REGISTRY_FILE, { entries: {} });

// Initialize built-in tools
for (const id of BUILTIN_TOOL_IDS) {
  if (!registryState.entries[id]) {
    registryState.entries[id] = {
      status: "installed",
      installedAt: "builtin",
      health: "healthy",
    };
  }
}

export function getRegistryEntries(): RegistryState {
  return registryState;
}

export function isToolInstalled(id: string): boolean {
  if (BUILTIN_TOOL_IDS.has(id)) return true;
  return registryState.entries[id]?.status === "installed";
}

export function getInstalledToolIds(): string[] {
  return Object.entries(registryState.entries)
    .filter(([, entry]) => entry.status === "installed")
    .map(([id]) => id);
}

export function updateRegistryEntry(
  id: string,
  update: Partial<RegistryState["entries"][string]>
): void {
  registryState.entries[id] = {
    ...registryState.entries[id],
    ...update,
  };
  saveToFile(REGISTRY_FILE, registryState);
}

export function removeRegistryEntry(id: string): void {
  if (BUILTIN_TOOL_IDS.has(id)) return;
  delete registryState.entries[id];
  saveToFile(REGISTRY_FILE, registryState);
}

export function updateToolLastRun(id: string): void {
  if (registryState.entries[id]) {
    registryState.entries[id].lastRun = new Date().toISOString();
  } else if (BUILTIN_TOOL_IDS.has(id)) {
    registryState.entries[id] = {
      status: "installed",
      health: "healthy",
      lastRun: new Date().toISOString(),
    };
  }
  saveToFile(REGISTRY_FILE, registryState);
}

// ─── Default projects ─────────────────────────────────────────────────────

function getDefaultProjects(): Project[] {
  return [
    {
      id: "PRJ-001",
      name: "Production",
      description: "Main production infrastructure.",
      createdAt: "2026-01-15T08:00:00Z",
      updatedAt: new Date().toISOString(),
      securityScore: 87,
      assets: 0,
      status: "idle",
      members: 1,
      scans: [],
      findings: [],
      installedTools: [...BUILTIN_TOOL_IDS],
      settings: { defaultSeverity: "medium", autoScan: false, notificationChannels: [] },
    },
  ];
}
