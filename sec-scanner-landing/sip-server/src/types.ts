/**
 * SIP Server — Shared Types
 * Mirrors the frontend engine types for consistency.
 */

// ─── Severity ─────────────────────────────────────────────────────────────

export type Severity = "critical" | "high" | "medium" | "low" | "info";

// ─── Unified Finding ──────────────────────────────────────────────────────

export interface Finding {
  id: string;
  tool: string;
  asset: string;
  severity: Severity;
  title: string;
  description: string;
  cvss: number;
  cwe?: string;
  cve?: string;
  evidence: string;
  recommendation: string;
  references: string[];
  mitre?: string;
  status: "open" | "acknowledged" | "remediated" | "false_positive";
  discoveredAt: string;
  metadata?: Record<string, string>;
}

// ─── Plugin Manifest ──────────────────────────────────────────────────────

export type PluginCategory = "network" | "web" | "container" | "code" | "api" | "cloud" | "config";
export type PluginOutputFormat = "json" | "xml" | "sarif" | "text" | "csv";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: { ru: string; en: string };
  category: PluginCategory;
  outputFormat: PluginOutputFormat;
  install: {
    command: string;
    verify: string;
  };
  run: {
    command: string;
    args: string[];
  };
  parser: string;
  sampleOutput: {
    ru: string[];
    en: string[];
  };
  sampleRawOutput: string;
  cliCommand: string;
}

// ─── Plugin Registry Entry ────────────────────────────────────────────────

export type InstallStatus = "not_installed" | "downloading" | "installing" | "verifying" | "installed" | "failed";

export interface RegistryEntry {
  manifest: PluginManifest;
  status: InstallStatus;
  installedAt?: string;
  version?: string;
  lastRun?: string;
  health: "healthy" | "degraded" | "error" | "unknown";
  signature?: string;
}

// ─── Scan ─────────────────────────────────────────────────────────────────

export type ScanStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type SourceType = "git" | "folder" | "docker" | "website" | "api";

export interface ScanConfig {
  projectId: string;
  projectName: string;
  sourceType: SourceType;
  sourceValue: string;
  toolIds: string[];
}

export interface ScanResult {
  id: string;
  projectId: string;
  projectName: string;
  sourceType: SourceType;
  sourceValue: string;
  tools: string[];
  status: ScanStatus;
  startedAt: string;
  completedAt?: string;
  findings: Finding[];
  riskScore: number;
  timeline: TimelineEntry[];
  stdout: string[];
  stderr: string[];
  exitCode: number;
}

export interface TimelineEntry {
  timestamp: string;
  event: string;
  detail?: string;
  tool?: string;
}

// ─── Project ──────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  securityScore: number;
  assets: number;
  lastScan?: string;
  status: "healthy" | "warning" | "critical" | "idle";
  members: number;
  scans: string[];
  findings: string[];
  installedTools: string[];
  settings: ProjectSettings;
}

export interface ProjectSettings {
  defaultSeverity: Severity;
  autoScan: boolean;
  scanSchedule?: string;
  notificationChannels: string[];
}

// ─── SSE Progress ─────────────────────────────────────────────────────────

export interface StageProgress {
  stageIndex: number;
  stageLabel: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  stdout: string[];
  timestamp: string;
}

// ─── Knowledge Graph ──────────────────────────────────────────────────────

export type KGNodeType = "host" | "finding" | "cve" | "service" | "credential" | "asset" | "recommendation" | "port" | "dependency";

export interface KGNode {
  id: string;
  type: KGNodeType;
  label: string;
  severity?: Severity;
  detail?: string;
  nodeType?: KGNodeType;
}

export interface KGEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// ─── Attack Path ──────────────────────────────────────────────────────────

export interface AttackPathNode {
  id: string;
  type: string;
  label: string;
  risk: number;
  detail?: string;
}

export interface AttackPathEdge {
  id: string;
  source: string;
  target: string;
  probability: number;
  criticality: "critical" | "high" | "medium" | "low";
  exploitable: boolean;
  timeToCompromise: string;
  cvss: number;
  businessRisk: string;
  cves: string[];
  techniques: string[];
}

export interface AttackPath {
  name: string;
  description: string;
  nodes: string[];
  edges: AttackPathEdge[];
}

// ─── AI Recommendation ────────────────────────────────────────────────────

export interface AIRecommendation {
  findingId: string;
  riskExplanation: string;
  recommendation: string;
  remediationPlan: string;
  priority: "critical" | "high" | "medium" | "low";
  businessImpact: string;
  estimatedEffort: string;
  confidence: number;
}

// ─── Report ───────────────────────────────────────────────────────────────

export type ReportType = "executive" | "technical" | "compliance";
export type ExportFormat = "pdf" | "html" | "json" | "sarif" | "markdown" | "csv";

export interface Report {
  id: string;
  type: ReportType;
  projectId: string;
  scanId: string;
  createdAt: string;
  findings: number;
  riskScore: number;
  formats: ExportFormat[];
}
