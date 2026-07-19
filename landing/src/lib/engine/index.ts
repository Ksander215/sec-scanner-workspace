/**
 * SIP Core Engine — Main Export
 *
 * The engine transforms SIP from a demo prototype into a real platform:
 *
 * - Scanner runs real processes through the Plugin Runtime
 * - Marketplace truly installs/removes tools that affect Scanner
 * - All tools return unified Findings (no tool-specific models)
 * - Reports are built from Findings (no demo data)
 * - Knowledge Graph is built automatically from scan results
 * - Attack Paths are generated from Graph + Findings + MITRE
 * - AI Recommendations use real Findings + CVSS + Business Context
 * - Project Workspace persists everything
 * - INT-029: Integrations, Repositories, SSH, API Keys, Team, Notifications
 */

// ─── Types ────────────────────────────────────────────────────────────────
export type {
  Severity,
  Finding,
  PluginManifest,
  PluginCategory,
  PluginOutputFormat,
  RegistryEntry,
  InstallStatus,
  ScanResult,
  ScanStatus,
  TimelineEntry,
  Project,
  ProjectSettings,
  KGNodeType,
  KGNode,
  KGEdge,
  AttackPathNode,
  AttackPathEdge,
  AttackPath,
  Report,
  ReportType,
  ExportFormat,
  ReportContent,
  AIRecommendation,
  Asset,
  AssetType,
  AssetCriticality,
  AssetStatus,
  PortInfo,
  ServiceInfo,
  // INT-029 types
  IntegrationType,
  IntegrationCategory,
  IntegrationStatus,
  Integration,
  RepositoryType,
  RepositoryAuthType,
  Repository,
  DependencyInfo,
  SecretInfo,
  SBOMEntry,
  Contributor,
  SSHServerType,
  SSHKey,
  SSHConnection,
  APIKeyScope,
  APIKey,
  ReportShareChannel,
  EmailReport,
  FindingDiscussionStatus,
  DiscussionComment,
  FindingDiscussion,
  TeamMember,
  Attachment,
  NotificationChannel,
  NotificationTrigger,
  NotificationRule,
  NotificationEvent,
  SubscriptionTier,
  Subscription,
} from "./types";

// ─── Plugin Manifests ─────────────────────────────────────────────────────
export {
  ALL_MANIFESTS,
  MANIFESTS_BY_ID,
  BUILTIN_TOOL_IDS,
  nmapManifest,
  nucleiManifest,
  trivyManifest,
  semgrepManifest,
  zapManifest,
  niktoManifest,
} from "./plugins";

// ─── Registry ─────────────────────────────────────────────────────────────
export {
  getRegistry,
  getInstalledTools,
  getManifest,
  isInstalled,
  installPlugin,
  removePlugin,
  updateLastRun,
  getToolHealth,
  isLegacyMarketplaceInstalled,
  addLegacyInstalled,
  removeLegacyInstalled,
  getLegacyInstalled,
} from "./registry";

// ─── Scanner Engine ───────────────────────────────────────────────────────
export {
  buildPipelineStages,
  executeScan,
  getAvailableTools,
  getMarketplaceAvailable,
} from "./scanner";

export type {
  ScanConfig,
  PipelineStage,
  StageType,
  StageProgress,
  ProgressCallback,
} from "./scanner";

// ─── Parsers ──────────────────────────────────────────────────────────────
export {
  parseOutput,
  getParser,
  registerParser,
  nmapParser,
  nucleiParser,
  trivyParser,
  semgrepParser,
  zapParser,
  niktoParser,
} from "./parsers";

export type { ToolParser } from "./parsers";

// ─── Knowledge Graph ──────────────────────────────────────────────────────
export {
  buildKnowledgeGraph,
} from "./knowledge-graph";

export type { KnowledgeGraph } from "./knowledge-graph";

// ─── Attack Paths ─────────────────────────────────────────────────────────
export {
  buildAttackPaths,
} from "./attack-paths";

// ─── AI Recommendations ───────────────────────────────────────────────────
export {
  generateRecommendations,
} from "./recommendations";

// ─── Reports ──────────────────────────────────────────────────────────────
export {
  generateReport,
  exportAsJSON,
  exportAsSARIF,
  exportAsMarkdown,
  exportAsCSV,
  exportAsHTML,
} from "./reports";

// ─── Projects ─────────────────────────────────────────────────────────────
export {
  getProjects,
  getProject,
  saveProject,
  createProject,
  deleteProject,
  getScanResults,
  saveScanResult,
  getLatestFindings,
  getProjectScans,
  getLegacyHistory,
  clearLegacyHistory,
} from "./projects";
