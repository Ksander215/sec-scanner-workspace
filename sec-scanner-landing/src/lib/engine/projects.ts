/**
 * SIP Core Engine — Project Workspace
 * Project becomes a full entity storing:
 *   scan history, findings, reports, graph, attack paths,
 *   installed tools, and settings.
 *
 * Persistence via localStorage.
 */

import type { Project, ScanResult, Finding, ProjectSettings } from "./types";

const PROJECTS_KEY = "sip_projects";
const SCANS_KEY = "sip_scans";
const FINDINGS_KEY = "sip_findings_latest";

// ─── Project CRUD ─────────────────────────────────────────────────────────

export function getProjects(): Project[] {
  if (typeof window === "undefined") return getDefaultProjects();
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return getDefaultProjects();
}

export function getProject(id: string): Project | undefined {
  return getProjects().find((p) => p.id === id);
}

export function saveProject(project: Project): void {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    projects.push(project);
  }
  persistProjects(projects);
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
    installedTools: [],
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
  const projects = getProjects().filter((p) => p.id !== id);
  persistProjects(projects);
}

// ─── Scan Results ─────────────────────────────────────────────────────────

export function getScanResults(): ScanResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SCANS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function saveScanResult(scan: ScanResult): void {
  const scans = getScanResults();
  // Keep last 50 scans
  scans.unshift(scan);
  if (scans.length > 50) scans.length = 50;
  localStorage.setItem(SCANS_KEY, JSON.stringify(scans));

  // Update project with scan info
  const project = getProject(scan.projectId);
  if (project) {
    project.scans = [scan.id, ...project.scans.filter((s) => s !== scan.id)];
    project.lastScan = scan.completedAt;
    project.securityScore = 100 - scan.riskScore;
    project.assets = new Set(scan.findings.map((f) => f.asset)).size;
    project.status = scan.riskScore >= 80 ? "critical" : scan.riskScore >= 60 ? "warning" : "healthy";
    saveProject(project);
  }

  // Save latest findings
  localStorage.setItem(FINDINGS_KEY, JSON.stringify(scan.findings));
}

export function getLatestFindings(): Finding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FINDINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function getProjectScans(projectId: string): ScanResult[] {
  return getScanResults().filter((s) => s.projectId === projectId);
}

// ─── Legacy scan history compat ───────────────────────────────────────────

const HISTORY_KEY = "sip_scan_history";

export function getLegacyHistory(): Array<{
  id: string;
  projectName: string;
  sourceType: string;
  sourceValue: string;
  tools: string[];
  startedAt: string;
  completedAt: string;
  findingsCount: number;
  riskScore: number;
  status: string;
}> {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearLegacyHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

// ─── Default projects ─────────────────────────────────────────────────────

function getDefaultProjects(): Project[] {
  return [
    {
      id: "PRJ-001",
      name: "Production",
      description: "Main production infrastructure including API servers, databases, and CDN.",
      createdAt: "2026-01-15T08:00:00Z",
      updatedAt: new Date().toISOString(),
      securityScore: 87,
      assets: 24,
      lastScan: "2 min ago",
      status: "healthy",
      members: 8,
      scans: [],
      findings: [],
      installedTools: ["nmap", "nuclei", "trivy"],
      settings: { defaultSeverity: "medium", autoScan: true, notificationChannels: ["email", "slack"] },
    },
    {
      id: "PRJ-002",
      name: "Staging",
      description: "Pre-production environment for testing and QA before deployment.",
      createdAt: "2026-02-10T10:00:00Z",
      updatedAt: new Date().toISOString(),
      securityScore: 72,
      assets: 18,
      lastScan: "1 hour ago",
      status: "warning",
      members: 5,
      scans: [],
      findings: [],
      installedTools: ["nmap", "nuclei"],
      settings: { defaultSeverity: "medium", autoScan: false, notificationChannels: [] },
    },
    {
      id: "PRJ-003",
      name: "Development",
      description: "Development environment with CI/CD pipeline and test infrastructure.",
      createdAt: "2026-03-05T14:00:00Z",
      updatedAt: new Date().toISOString(),
      securityScore: 54,
      assets: 12,
      lastScan: "3 hours ago",
      status: "critical",
      members: 12,
      scans: [],
      findings: [],
      installedTools: ["nmap"],
      settings: { defaultSeverity: "low", autoScan: false, notificationChannels: [] },
    },
    {
      id: "PRJ-004",
      name: "Client Portal",
      description: "External-facing client portal with authentication and data access.",
      createdAt: "2026-04-20T09:00:00Z",
      updatedAt: new Date().toISOString(),
      securityScore: 91,
      assets: 8,
      lastScan: "5 min ago",
      status: "healthy",
      members: 4,
      scans: [],
      findings: [],
      installedTools: ["nmap", "nuclei", "trivy"],
      settings: { defaultSeverity: "high", autoScan: true, notificationChannels: ["email"] },
    },
  ];
}

// ─── Persistence ──────────────────────────────────────────────────────────

function persistProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}
