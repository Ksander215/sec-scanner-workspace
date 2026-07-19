/**
 * SIP Core Engine — Unified Types
 * All domain models for the Security Intelligence Platform.
 * No tool-specific models — only the unified Finding type.
 * INT-029: Added Integration, Repository, SSH, API Keys, Team, Notification types.
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
  // INT-029: Team collaboration
  assignedTo?: string;    // team member id
  deadline?: string;      // ISO 8601
  discussionCount?: number;
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
  installedBy?: string;             // user who installed
  version?: string;
  lastRun?: string;                 // ISO 8601
  health: "healthy" | "degraded" | "error" | "unknown";
  signature?: string;               // verification hash
  dependencies?: string[];          // required dependencies
  license?: string;                 // license type
  updateAvailable?: string;         // new version available
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
  // INT-029: Business integration
  repository?: Repository;          // connected repository
  servers?: SSHConnection[];        // connected servers
  notificationChannels?: string[];  // active notification channels
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

// ═══════════════════════════════════════════════════════════════════════════
// INT-029 — Business Integration Platform Types
// ═══════════════════════════════════════════════════════════════════════════

// ─── Integration ──────────────────────────────────────────────────────────

export type IntegrationType =
  // Source Control
  | "github" | "gitlab" | "bitbucket" | "azure-devops"
  // Messaging
  | "slack" | "telegram" | "discord" | "teams"
  // Auth
  | "ldap" | "saml"
  // Infrastructure
  | "docker" | "kubernetes" | "aws" | "azure" | "gcp"
  // Issue Tracking
  | "jira" | "linear" | "youtrack"
  // Communication
  | "email" | "webhook"
  // SSH
  | "ssh";

export type IntegrationCategory =
  | "source-control" | "messaging" | "auth" | "infrastructure"
  | "issue-tracking" | "communication" | "ssh";

export type IntegrationStatus = "connected" | "not_connected" | "error" | "syncing";

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  lastSync?: string;                // ISO 8601
  connectedAt?: string;             // ISO 8601
  config: Record<string, string>;   // type-specific config (tokens, URLs, etc.)
  error?: string;
  icon?: string;
}

// ─── Repository ───────────────────────────────────────────────────────────

export type RepositoryType = "github" | "gitlab" | "bitbucket" | "azure-devops" | "local" | "ssh" | "private";
export type RepositoryAuthType = "token" | "ssh" | "basic" | "none";

export interface Repository {
  id: string;
  type: RepositoryType;
  url: string;
  branch: string;
  authType: RepositoryAuthType;
  name: string;
  connectedAt: string;              // ISO 8601
  lastCommit?: string;              // commit hash
  lastCommitDate?: string;          // ISO 8601
  fileCount?: number;
  languages?: string[];
  dependencies?: DependencyInfo[];
  secrets?: SecretInfo[];
  sbom?: SBOMEntry[];
  contributors?: Contributor[];
  status: IntegrationStatus;
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: string;                     // npm, pip, maven, etc.
  vulnerabilities?: number;
}

export interface SecretInfo {
  type: string;                     // api_key, password, token, etc.
  file: string;
  line: number;
  severity: Severity;
}

export interface SBOMEntry {
  name: string;
  version: string;
  supplier?: string;
  license?: string;
  vulnerabilities?: number;
}

export interface Contributor {
  name: string;
  email: string;
  commits: number;
}

// ─── SSH Connection ───────────────────────────────────────────────────────

export type SSHServerType = "ubuntu" | "debian" | "centos" | "docker-host" | "kubernetes" | "windows";

export interface SSHKey {
  id: string;
  name: string;
  type: "ed25519" | "rsa" | "ecdsa";
  publicKey: string;
  createdAt: string;                // ISO 8601
  lastUsed?: string;                // ISO 8601
}

export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: "key" | "password";
  keyId?: string;                   // SSHKey id
  serverType: SSHServerType;
  status: IntegrationStatus;
  connectedAt?: string;             // ISO 8601
  lastUsed?: string;                // ISO 8601
  os?: string;
  uptime?: string;
}

// ─── API Keys ─────────────────────────────────────────────────────────────

export type APIKeyScope = "rest" | "graphql" | "webhook" | "cli" | "sdk" | "admin" | "read" | "write";

export interface APIKey {
  id: string;
  name: string;
  key: string;                      // masked display key
  scopes: APIKeyScope[];
  expiresAt?: string;               // ISO 8601
  createdAt: string;                // ISO 8601
  lastUsed?: string;                // ISO 8601
  status: "active" | "disabled" | "expired" | "rotated";
  createdBy?: string;
}

// ─── Email Reports ────────────────────────────────────────────────────────

export type ReportShareChannel = "email" | "slack" | "telegram" | "teams" | "webhook" | "download";

export interface EmailReport {
  id: string;
  scanId: string;
  reportId: string;
  channel: ReportShareChannel;
  recipients?: string[];            // email addresses
  subject?: string;
  template?: string;
  attachments: ExportFormat[];
  sentAt: string;                   // ISO 8601
  status: "sent" | "failed" | "pending";
  sentBy?: string;
}

// ─── Team Collaboration ───────────────────────────────────────────────────

export type FindingDiscussionStatus = "open" | "in_progress" | "resolved" | "closed";

export interface DiscussionComment {
  id: string;
  findingId: string;
  author: TeamMember;
  content: string;
  createdAt: string;                // ISO 8601
  updatedAt?: string;               // ISO 8601
  attachments?: Attachment[];
  mentions?: string[];              // mentioned member ids
  reactions?: Record<string, string[]>; // emoji → member ids
}

export interface FindingDiscussion {
  findingId: string;
  status: FindingDiscussionStatus;
  assignedTo?: TeamMember;
  deadline?: string;                // ISO 8601
  comments: DiscussionComment[];
  watchers: string[];               // member ids
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "manager" | "member" | "viewer";
  status: "active" | "inactive" | "invited";
  joinedAt: string;                 // ISO 8601
}

export interface Attachment {
  id: string;
  name: string;
  type: string;                     // mime type
  size: number;
  url: string;
  uploadedAt: string;               // ISO 8601
}

// ─── Notifications ────────────────────────────────────────────────────────

export type NotificationChannel = "telegram" | "slack" | "discord" | "teams" | "email" | "webhook";
export type NotificationTrigger = "scan_complete" | "critical_finding" | "high_finding" | "new_finding" | "remediation" | "assignment";

export interface NotificationRule {
  id: string;
  name: string;
  channel: NotificationChannel;
  triggers: NotificationTrigger[];
  config: Record<string, string>;   // channel-specific config
  enabled: boolean;
  createdAt: string;                // ISO 8601
  lastTriggered?: string;           // ISO 8601
}

export interface NotificationEvent {
  id: string;
  ruleId: string;
  channel: NotificationChannel;
  trigger: NotificationTrigger;
  title: string;
  message: string;
  findingId?: string;
  scanId?: string;
  sentAt: string;                   // ISO 8601
  status: "sent" | "failed" | "pending";
}

// ─── Pricing / Subscription ───────────────────────────────────────────────

export type SubscriptionTier = "free" | "professional" | "enterprise";

export interface Subscription {
  tier: SubscriptionTier;
  expiresAt?: string;               // ISO 8601
  features: string[];
  limits: {
    projects: number;               // -1 for unlimited
    users: number;                  // -1 for unlimited
    scans: number;                  // -1 for unlimited
    apiCalls: number;               // -1 for unlimited
  };
}
