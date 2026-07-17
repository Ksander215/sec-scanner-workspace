/**
 * Shared demo data for portal pages - project data and workspace data
 */

export interface Project {
  id: string;
  name: string;
  securityScore: number;
  assets: number;
  lastScan: string;
  status: "healthy" | "warning" | "critical" | "idle";
  members: number;
  description: string;
}

export const demoProjects: Project[] = [
  {
    id: "PRJ-001",
    name: "Production",
    securityScore: 87,
    assets: 24,
    lastScan: "2 min ago",
    status: "healthy",
    members: 8,
    description: "Main production infrastructure including API servers, databases, and CDN.",
  },
  {
    id: "PRJ-002",
    name: "Staging",
    securityScore: 72,
    assets: 18,
    lastScan: "1 hour ago",
    status: "warning",
    members: 5,
    description: "Pre-production environment for testing and QA before deployment.",
  },
  {
    id: "PRJ-003",
    name: "Development",
    securityScore: 54,
    assets: 12,
    lastScan: "3 hours ago",
    status: "critical",
    members: 12,
    description: "Development environment with CI/CD pipeline and test infrastructure.",
  },
  {
    id: "PRJ-004",
    name: "Client Portal",
    securityScore: 91,
    assets: 8,
    lastScan: "5 min ago",
    status: "healthy",
    members: 4,
    description: "External-facing client portal with authentication and data access.",
  },
  {
    id: "PRJ-005",
    name: "ML Pipeline",
    securityScore: 68,
    assets: 6,
    lastScan: "1 day ago",
    status: "warning",
    members: 3,
    description: "Machine learning training and inference pipeline with GPU clusters.",
  },
  {
    id: "PRJ-006",
    name: "Internal Tools",
    securityScore: 45,
    assets: 15,
    lastScan: "Never",
    status: "idle",
    members: 6,
    description: "Internal monitoring, logging, and operational tools.",
  },
];

export interface WorkspaceAsset {
  id: string;
  name: string;
  type: "host" | "service" | "database" | "api" | "container" | "cloud";
  status: "active" | "inactive" | "deprecated";
  criticality: "critical" | "high" | "medium" | "low";
  findings: number;
  lastScanned: string;
}

export const workspaceAssets: WorkspaceAsset[] = [
  { id: "AST-001", name: "app.sec-scanner.pro", type: "host", status: "active", criticality: "critical", findings: 4, lastScanned: "2 min ago" },
  { id: "AST-002", name: "api.sec-scanner.pro", type: "api", status: "active", criticality: "critical", findings: 3, lastScanned: "5 min ago" },
  { id: "AST-003", name: "db-primary.internal", type: "database", status: "active", criticality: "critical", findings: 1, lastScanned: "1 hour ago" },
  { id: "AST-004", name: "redis-cache.internal", type: "service", status: "active", criticality: "high", findings: 2, lastScanned: "1 hour ago" },
  { id: "AST-005", name: "k8s-dashboard.internal", type: "container", status: "active", criticality: "high", findings: 1, lastScanned: "30 min ago" },
  { id: "AST-006", name: "cdn.sec-scanner.pro", type: "cloud", status: "active", criticality: "medium", findings: 0, lastScanned: "4 hours ago" },
  { id: "AST-007", name: "mail.sec-scanner.pro", type: "service", status: "deprecated", criticality: "low", findings: 0, lastScanned: "1 day ago" },
  { id: "AST-008", name: "staging.sec-scanner.pro", type: "host", status: "inactive", criticality: "medium", findings: 0, lastScanned: "3 days ago" },
];

export interface ScanJob {
  id: string;
  name: string;
  type: "full" | "quick" | "targeted" | "compliance";
  status: "running" | "completed" | "failed" | "queued";
  progress: number;
  startedAt: string;
  duration: string;
  findings: number;
}

export const scanJobs: ScanJob[] = [
  { id: "SCAN-001", name: "Full Scan — Production", type: "full", status: "running", progress: 67, startedAt: "10 min ago", duration: "—", findings: 4 },
  { id: "SCAN-002", name: "Quick Scan — Staging", type: "quick", status: "completed", progress: 100, startedAt: "1 hour ago", duration: "12 min", findings: 2 },
  { id: "SCAN-003", name: "Compliance Check — PCI-DSS", type: "compliance", status: "completed", progress: 100, startedAt: "3 hours ago", duration: "28 min", findings: 1 },
  { id: "SCAN-004", name: "Targeted — SQL Injection", type: "targeted", status: "queued", progress: 0, startedAt: "—", duration: "—", findings: 0 },
  { id: "SCAN-005", name: "Full Scan — Development", type: "full", status: "failed", progress: 34, startedAt: "5 hours ago", duration: "—", findings: 1 },
];
