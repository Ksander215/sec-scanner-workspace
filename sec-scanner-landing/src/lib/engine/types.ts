/**
 * SIP Core Engine — Unified Types
 * All domain models for the Security Intelligence Platform.
 * No tool-specific models — only the unified Finding type.
 */

// ─── Severity ─────────────────────────────────────────────────────────────

export type Severity = "critical" | "high" | "medium" | "low" | "info";

// ─── Unified Finding ──────────────────────────────────────────────────────

export interface Finding {
  id: string;
  tool: string;           // source tool id (e.g. "nmap", "nuclei", "trivy")
  asset: string;          // affected asset (hostname, URL, image)
  severity: Severity;
  title: string;
  description: string;
  cvss: number;           // 0.0 – 10.0
  cwe?: string;           // e.g. "CWE-89"
  cve?: string;           // e.g. "CVE-2024-23956"
  evidence: string;       // raw evidence from tool output
  recommendation: string; // how to fix
  references: string[];   // URLs to advisories, docs
  mitre?: string;         // MITRE ATT&CK technique ID
  status: "open" | "acknowledged" | "remediated" | "false_positive";
  discoveredAt: string;   // ISO 8601
  metadata?: Record<string, string>; // tool-specific extra fields
}

// ─── Plugin Manifest ──────────────────────────────────────────────────────

export type PluginCategory = "network" | "web" | "container" | "code" | "api" | "cloud" | "config";
export type PluginOutputFormat = "json" | "xml" | "sarif" | "text" | "csv";

export interface PluginManifest {
  id: string;                       // unique identifier (e.g. "nmap", "trivy")
  name: string;                     // display name
  version: string;                  // semver
  description: { ru: string; en: string };
  category: PluginCategory;
  outputFormat: PluginOutputFormat;
  install: {
    command: string;                // e.g. "docker pull aquasec/trivy"
    verify: string;                 // e.g. "trivy --version"
  };
  run: {
    command: string;                // e.g. "trivy fs {target} --format json"
    args: string[];                 // default arguments
  };
  parser: string;                   // parser module name (e.g. "trivy")
  sampleOutput: {
    ru: string[];
    en: string[];
  };
  sampleRawOutput: string;          // realistic raw tool output for simulation
  cliCommand: string;               // display CLI command
}

// ─── Plugin Registry Entry ────────────────────────────────────────────────

export type InstallStatus = "not_installed" | "downloading" | "installing" | "verifying" | "installed" | "failed";

export interface RegistryEntry {
  manifest: PluginManifest;
  status: InstallStatus;
  installedAt?: string;             // ISO 8601
  version?: string;
  lastRun?: string;                 // ISO 8601
  health: "healthy" | "degraded" | "error" | "unknown";
  signature?: string;               // verification hash
}

// ─── Scan ─────────────────────────────────────────────────────────────────

export type ScanStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface ScanResult {
  id: string;
  projectId: string;
  projectName: string;
  sourceType: "git" | "folder" | "docker" | "website" | "api";
  sourceValue: string;
  tools: string[];                  // tool IDs
  status: ScanStatus;
  startedAt: string;                // ISO 8601
  completedAt?: string;             // ISO 8601
  findings: Finding[];
  riskScore: number;                // 0-100
  timeline: TimelineEntry[];
  stdout: string[];                 // full stdout lines
  stderr: string[];                 // full stderr lines
  exitCode: number;
}

export interface TimelineEntry {
  timestamp: string;                // ISO 8601
  event: string;
  detail?: string;
  tool?: string;
}

// ─── Project ──────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;                // ISO 8601
  updatedAt: string;                // ISO 8601
  securityScore: number;            // 0-100
  assets: number;
  lastScan?: string;                // ISO 8601
  status: "healthy" | "warning" | "critical" | "idle";
  members: number;
  scans: string[];                  // ScanResult IDs
  findings: string[];               // Finding IDs (latest)
  installedTools: string[];         // PluginManifest IDs
  settings: ProjectSettings;
}

export interface ProjectSettings {
  defaultSeverity: Severity;
  autoScan: boolean;
  scanSchedule?: string;            // cron expression
  notificationChannels: string[];
}

// ─── Knowledge Graph ──────────────────────────────────────────────────────

export type KGNodeType = "host" | "finding" | "cve" | "service" | "credential" | "asset" | "recommendation" | "port" | "dependency";

export interface KGNode {
  id: string;
  type: KGNodeType;
  label: string;
  severity?: Severity;
  detail?: string;
  nodeType?: KGNodeType;  // for ReactFlow compat
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
  risk: number;                     // 0-100
  detail?: string;
}

export interface AttackPathEdge {
  id: string;
  source: string;
  target: string;
  probability: number;              // 0-1
  criticality: "critical" | "high" | "medium" | "low";
  exploitable: boolean;
  timeToCompromise: string;
  cvss: number;
  businessRisk: string;
  cves: string[];
  techniques: string[];             // MITRE ATT&CK
}

export interface AttackPath {
  name: string;
  description: string;
  nodes: string[];                  // AttackPathNode IDs in path
  edges: AttackPathEdge[];
}

// ─── Report ───────────────────────────────────────────────────────────────

export type ReportType = "executive" | "technical" | "compliance";
export type ExportFormat = "pdf" | "html" | "json" | "sarif" | "markdown" | "csv";

export interface Report {
  id: string;
  type: ReportType;
  projectId: string;
  scanId: string;
  createdAt: string;                // ISO 8601
  findings: number;
  riskScore: number;
  formats: ExportFormat[];
  content?: ReportContent;
}

export interface ReportContent {
  executiveSummary?: string;
  technicalDetails?: string;
  complianceStatus?: Record<string, number>;
  findings: Finding[];
  riskScore: number;
  recommendations: AIRecommendation[];
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
  confidence: number;               // 0-1
}

// ─── Asset ────────────────────────────────────────────────────────────────

export type AssetType = "host" | "service" | "database" | "api" | "container" | "cloud";
export type AssetCriticality = "critical" | "high" | "medium" | "low";
export type AssetStatus = "active" | "inactive" | "deprecated";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  criticality: AssetCriticality;
  findings: number;
  lastScanned: string;
  ip?: string;
  os?: string;
  ports?: PortInfo[];
  services?: ServiceInfo[];
}

export interface PortInfo {
  port: number;
  protocol: string;
  service: string;
  state: "open" | "closed" | "filtered";
  version?: string;
}

export interface ServiceInfo {
  name: string;
  version?: string;
  port?: number;
}
