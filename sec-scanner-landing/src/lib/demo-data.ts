/**
 * Shared demo data for all interactive platform pages.
 * Uses realistic domain models matching the Security Intelligence Platform.
 */

// ─── Findings ───────────────────────────────────────────────────────────────

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  cvss: number;
  asset: string;
  service: string;
  description: string;
  recommendation: string;
  cve?: string;
  mitre?: string;
  status: "open" | "acknowledged" | "remediated" | "false_positive";
  discoveredAt: string;
}

export const demoFindings: Finding[] = [
  {
    id: "FND-001",
    title: "SQL Injection in /api/v1/users",
    severity: "critical",
    cvss: 9.8,
    asset: "app.sec-scanner.pro",
    service: "API Gateway",
    description: "User-supplied input in the 'id' parameter of /api/v1/users is directly interpolated into SQL queries without parameterization, allowing unauthenticated attackers to extract database contents.",
    recommendation: "Use parameterized queries or an ORM. Add input validation and a WAF rule to block SQLi patterns.",
    cve: "CVE-2024-23956",
    mitre: "T1190",
    status: "open",
    discoveredAt: "2026-07-17T08:23:00Z",
  },
  {
    id: "FND-002",
    title: "XSS (Reflected) in /search",
    severity: "high",
    cvss: 7.5,
    asset: "app.sec-scanner.pro",
    service: "Web Frontend",
    description: "The search endpoint reflects user input without sanitization, allowing cross-site scripting attacks that can steal session cookies.",
    recommendation: "Apply output encoding and Content-Security-Policy headers. Use a modern framework's built-in XSS protection.",
    cve: "CVE-2024-31027",
    mitre: "T1189",
    status: "open",
    discoveredAt: "2026-07-17T08:23:12Z",
  },
  {
    id: "FND-003",
    title: "Missing Content-Security-Policy Header",
    severity: "medium",
    cvss: 5.3,
    asset: "portal.sec-scanner.pro",
    service: "NGINX",
    description: "No Content-Security-Policy header is set on any response, leaving the application vulnerable to XSS and data injection attacks.",
    recommendation: "Add a strict CSP header: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'.",
    mitre: "T1059",
    status: "acknowledged",
    discoveredAt: "2026-07-16T14:00:00Z",
  },
  {
    id: "FND-004",
    title: "Outdated TLS 1.0 Configuration",
    severity: "high",
    cvss: 6.5,
    asset: "api.sec-scanner.pro",
    service: "NGINX",
    description: "TLS 1.0 is still enabled, which is deprecated by PCI DSS and vulnerable to BEAST and POODLE downgrade attacks.",
    recommendation: "Disable TLS 1.0 and 1.1. Enforce TLS 1.2+ with modern cipher suites.",
    cve: "CVE-2014-3566",
    mitre: "T1573",
    status: "open",
    discoveredAt: "2026-07-16T14:01:00Z",
  },
  {
    id: "FND-005",
    title: "Redis Exposed Without Authentication",
    severity: "critical",
    cvss: 9.1,
    asset: "db-internal.sec-scanner.pro",
    service: "Redis",
    description: "Redis instance on port 6379 is accessible without authentication, allowing full database access and potential RCE via CONFIG SET.",
    recommendation: "Enable requirepass, bind to 127.0.0.1, and use a firewall to restrict access.",
    cve: "CVE-2024-31449",
    mitre: "T1078",
    status: "open",
    discoveredAt: "2026-07-17T08:24:00Z",
  },
  {
    id: "FND-006",
    title: "Kubernetes Dashboard Exposed",
    severity: "critical",
    cvss: 9.6,
    asset: "k8s.sec-scanner.pro",
    service: "Kubernetes",
    description: "Kubernetes dashboard is publicly accessible without authentication, exposing cluster configuration and workloads.",
    recommendation: "Enable RBAC, add authentication proxy, and restrict access to internal networks only.",
    mitre: "T1078",
    status: "open",
    discoveredAt: "2026-07-17T08:25:00Z",
  },
  {
    id: "FND-007",
    title: "Vault Seal Key in Environment Variable",
    severity: "critical",
    cvss: 9.3,
    asset: "vault.sec-scanner.pro",
    service: "HashiCorp Vault",
    description: "Vault unseal key is stored in a plaintext environment variable, defeating the purpose of sealed secret storage.",
    recommendation: "Use auto-unseal with AWS KMS or transit seal. Remove plaintext keys from environment.",
    mitre: "T1552",
    status: "acknowledged",
    discoveredAt: "2026-07-15T20:00:00Z",
  },
  {
    id: "FND-008",
    title: "Information Disclosure via /server-status",
    severity: "low",
    cvss: 2.6,
    asset: "staging.sec-scanner.pro",
    service: "Apache",
    description: "Apache server-status endpoint is publicly accessible, revealing worker statistics and request URIs.",
    recommendation: "Restrict server-status to localhost or internal IPs. Use Require ip directive.",
    mitre: "T1082",
    status: "false_positive",
    discoveredAt: "2026-07-15T20:05:00Z",
  },
  {
    id: "FND-009",
    title: "Default Credentials on PostgreSQL",
    severity: "high",
    cvss: 7.2,
    asset: "db-internal.sec-scanner.pro",
    service: "PostgreSQL",
    description: "PostgreSQL is running with default 'postgres:postgres' credentials, allowing full database access.",
    recommendation: "Change default credentials, use .pgpass or vault integration, enforce password complexity.",
    mitre: "T1078",
    status: "open",
    discoveredAt: "2026-07-17T08:26:00Z",
  },
  {
    id: "FND-010",
    title: "Missing Authentication on /api/v1/admin",
    severity: "high",
    cvss: 7.5,
    asset: "app.sec-scanner.pro",
    service: "API Gateway",
    description: "Admin API endpoints require no authentication token, allowing any user to access administrative functions.",
    recommendation: "Add JWT or API key authentication to all admin routes. Implement rate limiting.",
    mitre: "T1190",
    status: "open",
    discoveredAt: "2026-07-17T08:27:00Z",
  },
  {
    id: "FND-011",
    title: "CORS Allows All Origins",
    severity: "medium",
    cvss: 4.3,
    asset: "api.sec-scanner.pro",
    service: "API Gateway",
    description: "Access-Control-Allow-Origin is set to wildcard (*), allowing any domain to make authenticated cross-origin requests.",
    recommendation: "Restrict CORS to specific trusted origins. Remove wildcard and list allowed domains.",
    mitre: "T1189",
    status: "acknowledged",
    discoveredAt: "2026-07-16T15:00:00Z",
  },
  {
    id: "FND-012",
    title: "SSRF via Webhook URL Parameter",
    severity: "high",
    cvss: 8.6,
    asset: "app.sec-scanner.pro",
    service: "Web Application",
    description: "The webhook registration endpoint allows internal network URLs, enabling Server-Side Request Forgery attacks against internal services.",
    recommendation: "Validate and restrict webhook URLs to public domains. Block private IP ranges (RFC 1918).",
    cve: "CVE-2024-29155",
    mitre: "T1190",
    status: "open",
    discoveredAt: "2026-07-17T08:28:00Z",
  },
];

// ─── Assets ─────────────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  name: string;
  type: "host" | "service" | "application" | "database" | "container";
  ip: string;
  os?: string;
  criticality: "critical" | "high" | "medium" | "low";
  findingsCount: number;
  riskScore: number;
}

export const demoAssets: Asset[] = [
  { id: "AST-001", name: "app.sec-scanner.pro", type: "application", ip: "10.0.1.10", os: "Ubuntu 24.04", criticality: "critical", findingsCount: 4, riskScore: 92 },
  { id: "AST-002", name: "api.sec-scanner.pro", type: "service", ip: "10.0.1.20", os: "Ubuntu 24.04", criticality: "high", findingsCount: 3, riskScore: 78 },
  { id: "AST-003", name: "portal.sec-scanner.pro", type: "application", ip: "10.0.1.30", os: "Debian 12", criticality: "medium", findingsCount: 1, riskScore: 45 },
  { id: "AST-004", name: "db-internal.sec-scanner.pro", type: "database", ip: "10.0.2.10", os: "Ubuntu 22.04", criticality: "critical", findingsCount: 2, riskScore: 95 },
  { id: "AST-005", name: "k8s.sec-scanner.pro", type: "container", ip: "10.0.3.10", os: "CoreOS", criticality: "critical", findingsCount: 1, riskScore: 88 },
  { id: "AST-006", name: "vault.sec-scanner.pro", type: "service", ip: "10.0.2.20", os: "Alpine 3.19", criticality: "critical", findingsCount: 1, riskScore: 90 },
  { id: "AST-007", name: "staging.sec-scanner.pro", type: "host", ip: "10.0.4.10", os: "Ubuntu 22.04", criticality: "low", findingsCount: 1, riskScore: 22 },
  { id: "AST-008", name: "redis-internal.sec-scanner.pro", type: "database", ip: "10.0.2.30", os: "Alpine 3.19", criticality: "high", findingsCount: 0, riskScore: 15 },
];

// ─── Knowledge Graph Nodes ──────────────────────────────────────────────────

export type KGNodeType = "host" | "finding" | "cve" | "service" | "credential" | "asset" | "recommendation";

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

export const kgNodes: KGNode[] = [
  { id: "host-app", type: "host", label: "app.sec-scanner.pro", detail: "10.0.1.10" },
  { id: "host-api", type: "host", label: "api.sec-scanner.pro", detail: "10.0.1.20" },
  { id: "host-db", type: "host", label: "db-internal", detail: "10.0.2.10" },
  { id: "host-k8s", type: "host", label: "k8s.sec-scanner.pro", detail: "10.0.3.10" },
  { id: "host-vault", type: "host", label: "vault.sec-scanner.pro", detail: "10.0.2.20" },
  { id: "host-staging", type: "host", label: "staging.sec-scanner.pro", detail: "10.0.4.10" },

  { id: "svc-nginx", type: "service", label: "NGINX", detail: "Reverse Proxy" },
  { id: "svc-api-gw", type: "service", label: "API Gateway", detail: "Node.js / Express" },
  { id: "svc-redis", type: "service", label: "Redis", detail: "Cache / Session Store" },
  { id: "svc-pg", type: "service", label: "PostgreSQL", detail: "Primary Database" },
  { id: "svc-vault", type: "service", label: "Vault", detail: "Secret Management" },
  { id: "svc-k8s-dash", type: "service", label: "K8s Dashboard", detail: "Cluster Management" },

  { id: "fnd-sqli", type: "finding", label: "SQL Injection", severity: "critical", detail: "FND-001" },
  { id: "fnd-xss", type: "finding", label: "XSS Reflected", severity: "high", detail: "FND-002" },
  { id: "fnd-csp", type: "finding", label: "Missing CSP", severity: "medium", detail: "FND-003" },
  { id: "fnd-tls", type: "finding", label: "TLS 1.0 Active", severity: "high", detail: "FND-004" },
  { id: "fnd-redis", type: "finding", label: "Redis No Auth", severity: "critical", detail: "FND-005" },
  { id: "fnd-k8s", type: "finding", label: "K8s Dashboard Exposed", severity: "critical", detail: "FND-006" },
  { id: "fnd-vault", type: "finding", label: "Vault Key Exposed", severity: "critical", detail: "FND-007" },
  { id: "fnd-ssrf", type: "finding", label: "SSRF Webhook", severity: "high", detail: "FND-012" },

  { id: "cve-23956", type: "cve", label: "CVE-2024-23956", severity: "critical", detail: "SQL Injection" },
  { id: "cve-31027", type: "cve", label: "CVE-2024-31027", severity: "high", detail: "XSS" },
  { id: "cve-3566", type: "cve", label: "CVE-2014-3566", severity: "medium", detail: "POODLE" },
  { id: "cve-31449", type: "cve", label: "CVE-2024-31449", severity: "critical", detail: "Redis RCE" },
  { id: "cve-29155", type: "cve", label: "CVE-2024-29155", severity: "high", detail: "SSRF" },

  { id: "cred-pg", type: "credential", label: "postgres:postgres", detail: "Default DB Creds" },
  { id: "cred-vault-key", type: "credential", label: "Vault Unseal Key", detail: "In Env Var" },

  { id: "rec-sqli", type: "recommendation", label: "Parameterize SQL Queries", detail: "FND-001" },
  { id: "rec-xss", type: "recommendation", label: "Output Encoding + CSP", detail: "FND-002" },
  { id: "rec-redis", type: "recommendation", label: "Enable Redis Auth", detail: "FND-005" },
  { id: "rec-k8s", type: "recommendation", label: "Enable RBAC + Auth Proxy", detail: "FND-006" },
  { id: "rec-vault", type: "recommendation", label: "Use Auto-Unseal (KMS)", detail: "FND-007" },
  { id: "rec-ssrf", type: "recommendation", label: "Block Private IPs in Webhooks", detail: "FND-012" },
];

export const kgEdges: KGEdge[] = [
  { id: "e1", source: "host-app", target: "svc-nginx", label: "runs" },
  { id: "e2", source: "host-app", target: "svc-api-gw", label: "runs" },
  { id: "e3", source: "host-api", target: "svc-api-gw", label: "runs" },
  { id: "e4", source: "host-api", target: "svc-nginx", label: "runs" },
  { id: "e5", source: "host-db", target: "svc-pg", label: "runs" },
  { id: "e6", source: "host-db", target: "svc-redis", label: "runs" },
  { id: "e7", source: "host-vault", target: "svc-vault", label: "runs" },
  { id: "e8", source: "host-k8s", target: "svc-k8s-dash", label: "runs" },

  { id: "e9", source: "fnd-sqli", target: "svc-api-gw", label: "affects" },
  { id: "e10", source: "fnd-xss", target: "svc-api-gw", label: "affects" },
  { id: "e11", source: "fnd-csp", target: "svc-nginx", label: "affects" },
  { id: "e12", source: "fnd-tls", target: "svc-nginx", label: "affects" },
  { id: "e13", source: "fnd-redis", target: "svc-redis", label: "affects" },
  { id: "e14", source: "fnd-k8s", target: "svc-k8s-dash", label: "affects" },
  { id: "e15", source: "fnd-vault", target: "svc-vault", label: "affects" },
  { id: "e16", source: "fnd-ssrf", target: "svc-api-gw", label: "affects" },

  { id: "e17", source: "cve-23956", target: "fnd-sqli", label: "exploits" },
  { id: "e18", source: "cve-31027", target: "fnd-xss", label: "exploits" },
  { id: "e19", source: "cve-3566", target: "fnd-tls", label: "exploits" },
  { id: "e20", source: "cve-31449", target: "fnd-redis", label: "exploits" },
  { id: "e21", source: "cve-29155", target: "fnd-ssrf", label: "exploits" },

  { id: "e22", source: "cred-pg", target: "svc-pg", label: "authenticates" },
  { id: "e23", source: "cred-vault-key", target: "svc-vault", label: "unseals" },

  { id: "e24", source: "rec-sqli", target: "fnd-sqli", label: "remediates" },
  { id: "e25", source: "rec-xss", target: "fnd-xss", label: "remediates" },
  { id: "e26", source: "rec-redis", target: "fnd-redis", label: "remediates" },
  { id: "e27", source: "rec-k8s", target: "fnd-k8s", label: "remediates" },
  { id: "e28", source: "rec-vault", target: "fnd-vault", label: "remediates" },
  { id: "e29", source: "rec-ssrf", target: "fnd-ssrf", label: "remediates" },

  { id: "e30", source: "svc-api-gw", target: "svc-pg", label: "queries" },
  { id: "e31", source: "svc-api-gw", target: "svc-redis", label: "caches" },
  { id: "e32", source: "svc-api-gw", target: "svc-vault", label: "fetches secrets" },
  { id: "e33", source: "svc-nginx", target: "svc-api-gw", label: "proxies" },
  { id: "e34", source: "host-app", target: "host-db", label: "connects" },
];

// ─── Attack Paths ───────────────────────────────────────────────────────────

export interface AttackPathNode {
  id: string;
  label: string;
  type: "internet" | "firewall" | "proxy" | "app" | "cache" | "secrets" | "orchestrator" | "database";
  icon: string;
  risk: number;
  description: string;
}

export interface AttackPathEdge {
  id: string;
  source: string;
  target: string;
  probability: number;
  criticality: Severity;
  techniques: string[];
  cves: string[];
  exploitable: boolean;
  timeToCompromise: string;
  businessRisk: string;
  cvss: number;
}

export const attackPathNodes: AttackPathNode[] = [
  { id: "internet", label: "Internet", type: "internet", icon: "globe", risk: 100, description: "External attack surface accessible from the public internet." },
  { id: "firewall", label: "Firewall", type: "firewall", icon: "shield", risk: 80, description: "Perimeter firewall with permissive rules allowing traffic to internal services." },
  { id: "nginx", label: "NGINX", type: "proxy", icon: "server", risk: 65, description: "Reverse proxy handling TLS termination and request routing." },
  { id: "app", label: "Application", type: "app", icon: "code", risk: 55, description: "Node.js application with SQL Injection and SSRF vulnerabilities." },
  { id: "redis", label: "Redis", type: "cache", icon: "database", risk: 40, description: "Unauthenticated Redis instance used for caching and sessions." },
  { id: "vault", label: "Vault", type: "secrets", icon: "key", risk: 35, description: "HashiCorp Vault with exposed unseal key in environment variable." },
  { id: "k8s", label: "Kubernetes", type: "orchestrator", icon: "box", risk: 30, description: "Kubernetes cluster with exposed dashboard, no RBAC." },
  { id: "database", label: "Database", type: "database", icon: "hard-drive", risk: 15, description: "PostgreSQL with default credentials containing all application data." },
];

export const attackPaths: { name: string; edges: AttackPathEdge[] }[] = [
  {
    name: "SQL Injection Data Breach",
    edges: [
      { id: "ap1-e1", source: "internet", target: "firewall", probability: 0.95, criticality: "critical", techniques: ["T1190"], cves: [], exploitable: true, timeToCompromise: "<1 hour", businessRisk: "Network breach", cvss: 9.8 },
      { id: "ap1-e2", source: "firewall", target: "nginx", probability: 0.9, criticality: "high", techniques: ["T1190"], cves: [], exploitable: true, timeToCompromise: "<2 hours", businessRisk: "Lateral movement", cvss: 8.5 },
      { id: "ap1-e3", source: "nginx", target: "app", probability: 0.85, criticality: "critical", techniques: ["T1190"], cves: ["CVE-2024-23956"], exploitable: true, timeToCompromise: "<4 hours", businessRisk: "Data exfiltration", cvss: 9.1 },
      { id: "ap1-e4", source: "app", target: "database", probability: 0.8, criticality: "critical", techniques: ["T1555", "T1005"], cves: [], exploitable: true, timeToCompromise: "<6 hours", businessRisk: "Full data breach", cvss: 9.8 },
    ],
  },
  {
    name: "Redis RCE to Cluster Takeover",
    edges: [
      { id: "ap2-e1", source: "internet", target: "firewall", probability: 0.95, criticality: "critical", techniques: ["T1190"], cves: [], exploitable: true, timeToCompromise: "<1 hour", businessRisk: "Network breach", cvss: 9.8 },
      { id: "ap2-e2", source: "firewall", target: "nginx", probability: 0.9, criticality: "high", techniques: ["T1190"], cves: [], exploitable: true, timeToCompromise: "<2 hours", businessRisk: "Lateral movement", cvss: 8.5 },
      { id: "ap2-e3", source: "nginx", target: "app", probability: 0.85, criticality: "high", techniques: ["T1190"], cves: ["CVE-2024-29155"], exploitable: true, timeToCompromise: "<4 hours", businessRisk: "RCE via SSRF", cvss: 8.2 },
      { id: "ap2-e4", source: "app", target: "redis", probability: 0.75, criticality: "critical", techniques: ["T1210", "T1059"], cves: ["CVE-2024-31449"], exploitable: true, timeToCompromise: "<8 hours", businessRisk: "Cache poisoning", cvss: 9.0 },
      { id: "ap2-e5", source: "redis", target: "k8s", probability: 0.6, criticality: "critical", techniques: ["T1078", "T1609"], cves: [], exploitable: true, timeToCompromise: "<12 hours", businessRisk: "Cluster takeover", cvss: 9.5 },
    ],
  },
  {
    name: "Vault Key Exposure to Secret Theft",
    edges: [
      { id: "ap3-e1", source: "internet", target: "firewall", probability: 0.95, criticality: "high", techniques: ["T1190"], cves: [], exploitable: true, timeToCompromise: "<1 hour", businessRisk: "Network breach", cvss: 8.8 },
      { id: "ap3-e2", source: "firewall", target: "nginx", probability: 0.9, criticality: "medium", techniques: ["T1190"], cves: [], exploitable: true, timeToCompromise: "<2 hours", businessRisk: "Service access", cvss: 7.5 },
      { id: "ap3-e3", source: "nginx", target: "app", probability: 0.85, criticality: "high", techniques: ["T1190"], cves: ["CVE-2024-29155"], exploitable: true, timeToCompromise: "<4 hours", businessRisk: "App compromise", cvss: 8.2 },
      { id: "ap3-e4", source: "app", target: "vault", probability: 0.7, criticality: "critical", techniques: ["T1552", "T1078"], cves: [], exploitable: true, timeToCompromise: "<8 hours", businessRisk: "Secret theft", cvss: 9.5 },
    ],
  },
];

// ─── Pipeline Stages ────────────────────────────────────────────────────────

export interface PipelineStage {
  id: string;
  label: string;
  description: string;
  duration: number; // ms
  outputs: string[];
}

export const pipelineStages: PipelineStage[] = [
  { id: "normalize", label: "Normalize", description: "Raw findings from scanners are normalized into a unified schema.", duration: 1200, outputs: ["12 raw findings ingested", "Normalized to 8 unique issues"] },
  { id: "correlation", label: "Correlation", description: "Cross-reference findings across scanners to identify duplicates and related issues.", duration: 1800, outputs: ["4 duplicates merged", "3 new correlations found"] },
  { id: "knowledge-graph", label: "Knowledge Graph", description: "Build entity relationships — assets, services, findings, and CVEs.", duration: 2200, outputs: ["34 nodes created", "29 edges mapped"] },
  { id: "risk", label: "Risk Scoring", description: "Compute risk scores based on CVSS, exploitability, asset criticality, and business context.", duration: 1500, outputs: ["Overall risk: 78/100 (HIGH)", "3 critical-risk assets identified"] },
  { id: "attack-paths", label: "Attack Paths", description: "Trace attack paths from internet-facing services to critical assets.", duration: 2000, outputs: ["3 attack paths traced", "Primary path: SQLi → DB"] },
  { id: "recommendations", label: "Recommendations", description: "Generate prioritized remediation steps with code examples.", duration: 1600, outputs: ["6 recommendations generated", "Top: Parameterize SQL queries"] },
  { id: "explainability", label: "Explainability", description: "AI reasoning trace explaining why each finding matters and how it connects.", duration: 1400, outputs: ["Explanation chains built", "Confidence: 94.2%"] },
  { id: "report", label: "Report", description: "Compile findings into a structured report with executive summary and technical details.", duration: 1000, outputs: ["Report generated", "8 findings, 3 attack paths"] },
];

// ─── Risk Distribution ──────────────────────────────────────────────────────

export const riskDistribution = [
  { name: "Critical", value: 4, color: "#ff4444" },
  { name: "High", value: 4, color: "#ffb800" },
  { name: "Medium", value: 2, color: "#ffb800" },
  { name: "Low", value: 1, color: "#00ff88" },
  { name: "Info", value: 1, color: "#00d4ff" },
];

// ─── Time Series ────────────────────────────────────────────────────────────

export const riskTrend = [
  { date: "Jul 11", score: 85, critical: 8, high: 12, medium: 18 },
  { date: "Jul 12", score: 82, critical: 7, high: 11, medium: 16 },
  { date: "Jul 13", score: 80, critical: 6, high: 10, medium: 15 },
  { date: "Jul 14", score: 79, critical: 6, high: 10, medium: 14 },
  { date: "Jul 15", score: 78, critical: 5, high: 9, medium: 13 },
  { date: "Jul 16", score: 76, critical: 4, high: 8, medium: 12 },
  { date: "Jul 17", score: 78, critical: 4, high: 6, medium: 10 },
];

// ─── Compliance ──────────────────────────────────────────────────────────────

export interface ComplianceFramework {
  name: string;
  score: number;
  total: number;
  passed: number;
}

export const complianceData: ComplianceFramework[] = [
  { name: "OWASP Top 10", score: 42, total: 10, passed: 4 },
  { name: "CIS Benchmark", score: 58, total: 15, passed: 9 },
  { name: "PCI DSS", score: 35, total: 12, passed: 4 },
  { name: "NIST 800-53", score: 67, total: 18, passed: 12 },
  { name: "SOC 2", score: 72, total: 8, passed: 6 },
];

// ─── Marketplace Items ──────────────────────────────────────────────────────

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: "plugins" | "rules" | "dashboards" | "templates" | "ai-prompts" | "integrations" | "connectors" | "themes";
  author: string;
  version: string;
  rating: number;
  installs: number;
  license: string;
  verified: boolean;
  tags: string[];
}

export const marketplaceItems: MarketplaceItem[] = [
  { id: "mpl-001", name: "DAST Ultra Engine", description: "Advanced dynamic application security testing with OWASP coverage and custom payload generation.", category: "plugins", author: "SecInt Labs", version: "2.4.1", rating: 4.8, installs: 12540, license: "MIT", verified: true, tags: ["dast", "owasp", "scanning"] },
  { id: "mpl-002", name: "OWASP Rules Pack", description: "Comprehensive detection rules covering OWASP Top 10 with zero false positive guarantee.", category: "rules", author: "Security Alliance", version: "1.8.0", rating: 4.9, installs: 28430, license: "Apache-2.0", verified: true, tags: ["owasp", "rules", "detection"] },
  { id: "mpl-003", name: "Executive Summary Dashboard", description: "C-level security dashboard with KPIs, risk trends, and compliance status at a glance.", category: "dashboards", author: "SecInt Labs", version: "3.1.0", rating: 4.7, installs: 8920, license: "MIT", verified: true, tags: ["dashboard", "executive", "reporting"] },
  { id: "mpl-004", name: "React SPA Template", description: "Pre-built scan template optimized for React single-page applications with API backend.", category: "templates", author: "Community", version: "1.2.3", rating: 4.5, installs: 6780, license: "MIT", verified: false, tags: ["react", "spa", "template"] },
  { id: "mpl-005", name: "Vulnerability Explainer AI", description: "AI prompt pack for detailed vulnerability explanation, impact analysis, and remediation guidance.", category: "ai-prompts", author: "SecInt Labs", version: "1.0.0", rating: 4.6, installs: 4520, license: "Commercial", verified: true, tags: ["ai", "explainability", "remediation"] },
  { id: "mpl-006", name: "GitHub Integration", description: "Sync findings to GitHub Issues and Security tab. Auto-create PRs with fix suggestions.", category: "integrations", author: "Open Source", version: "2.0.4", rating: 4.8, installs: 19230, license: "MIT", verified: true, tags: ["github", "ci-cd", "issues"] },
  { id: "mpl-007", name: "Jira Cloud Connector", description: "Bi-directional sync with Jira Cloud. Map findings to epics, stories, and bugs automatically.", category: "connectors", author: "Atlassian Partner", version: "1.5.2", rating: 4.4, installs: 7890, license: "Commercial", verified: true, tags: ["jira", "project-management", "sync"] },
  { id: "mpl-008", name: "Midnight Neon Theme", description: "Dark cyberpunk theme with neon accents. Easy on the eyes during long security reviews.", category: "themes", author: "Community", version: "1.1.0", rating: 4.3, installs: 3240, license: "MIT", verified: false, tags: ["dark", "neon", "theme"] },
  { id: "mpl-009", name: "SAST CodeQL Engine", description: "Static analysis powered by CodeQL with support for JavaScript, Python, Java, and Go.", category: "plugins", author: "SecInt Labs", version: "1.6.0", rating: 4.7, installs: 15670, license: "MIT", verified: true, tags: ["sast", "codeql", "scanning"] },
  { id: "mpl-010", name: "CIS Benchmark Rules", description: "CIS Benchmark compliance rules for AWS, Azure, GCP, and Kubernetes configurations.", category: "rules", author: "CIS Partner", version: "2.1.0", rating: 4.9, installs: 21340, license: "Commercial", verified: true, tags: ["cis", "compliance", "cloud"] },
  { id: "mpl-011", name: "Risk Heatmap Dashboard", description: "Visual heatmap of risk across assets, services, and environments with drill-down capability.", category: "dashboards", author: "Community", version: "1.3.0", rating: 4.5, installs: 5670, license: "MIT", verified: false, tags: ["heatmap", "risk", "visualization"] },
  { id: "mpl-012", name: "Spring Boot Template", description: "Scan template for Spring Boot applications with Actuator, Security, and Data JPA coverage.", category: "templates", author: "SecInt Labs", version: "2.0.1", rating: 4.6, installs: 8940, license: "MIT", verified: true, tags: ["spring", "java", "template"] },
  { id: "mpl-013", name: "Remediation Planner AI", description: "AI-powered remediation planning with effort estimation, priority ranking, and step-by-step guides.", category: "ai-prompts", author: "SecInt Labs", version: "1.1.0", rating: 4.8, installs: 6230, license: "Commercial", verified: true, tags: ["ai", "remediation", "planning"] },
  { id: "mpl-014", name: "Slack Integration", description: "Real-time alerts in Slack channels with interactive buttons for triage and assignment.", category: "integrations", author: "Open Source", version: "1.4.2", rating: 4.5, installs: 14230, license: "MIT", verified: true, tags: ["slack", "alerts", "triage"] },
  { id: "mpl-015", name: "Splunk Connector", description: "Forward findings to Splunk SIEM for correlation with existing security events.", category: "connectors", author: "Splunk Partner", version: "1.2.0", rating: 4.3, installs: 4560, license: "Commercial", verified: true, tags: ["splunk", "siem", "forwarding"] },
  { id: "mpl-016", name: "Nord Theme", description: "Clean, calm dark theme inspired by the Nord color palette for extended work sessions.", category: "themes", author: "Community", version: "1.0.2", rating: 4.6, installs: 2870, license: "MIT", verified: false, tags: ["nord", "dark", "clean"] },
];

// ─── Architecture Layers (Interactive) ──────────────────────────────────────

export interface ArchLayer {
  id: string;
  name: string;
  description: string;
  classes: string[];
  technologies: string[];
  connections: string[];
}

export const architectureLayers: ArchLayer[] = [
  {
    id: "api",
    name: "REST API Layer",
    description: "The API gateway exposes RESTful endpoints for all platform operations. Handles authentication, rate limiting, request validation, and response serialization. Supports OpenAPI 3.1 spec generation.",
    classes: ["ApiController", "AuthMiddleware", "RateLimiter", "RequestValidator", "ResponseSerializer", "OpenApiGenerator"],
    technologies: ["Express.js", "TypeScript", "Zod", "JWT", "OpenAPI 3.1"],
    connections: ["Orchestrator → API via Command Bus", "API → Client via HTTP/2"],
  },
  {
    id: "orchestrator",
    name: "Orchestrator Layer",
    description: "The orchestration engine coordinates scanning pipelines, manages job scheduling, and handles the event-driven correlation bus. Each pipeline stage is a discrete, testable unit.",
    classes: ["PipelineOrchestrator", "JobScheduler", "EventBus", "StageRunner", "CorrelationEngine", "PipelineRegistry"],
    technologies: ["Node.js", "EventEmitter", "Bull Queue", "Redis", "Domain Events"],
    connections: ["API → Orchestrator via Command Bus", "Orchestrator → Domain via Application Services"],
  },
  {
    id: "domain",
    name: "Domain Layer",
    description: "Core business logic implementing Domain-Driven Design patterns. Contains entities, value objects, aggregates, and domain services. No external dependencies — pure business rules.",
    classes: ["Finding", "Asset", "RiskScore", "AttackPath", "KnowledgeGraph", "Recommendation", "ScanResult", "Correlation", "FindingRepository", "AssetRepository"],
    technologies: ["TypeScript", "DDD", "CQRS", "Domain Events", "Aggregate Roots"],
    connections: ["Orchestrator → Domain via Application Services", "Domain → Persistence via Repository Interfaces"],
  },
  {
    id: "persistence",
    name: "Persistence Layer",
    description: "Repository implementations and data access layer. Handles database operations, caching, and data migration. Implements the Repository pattern defined by the domain layer.",
    classes: ["PostgresFindingRepository", "RedisCacheStore", "MigrationRunner", "QueryBuilder", "TransactionManager", "DocumentStore"],
    technologies: ["PostgreSQL", "Redis", "Prisma ORM", "Knex.js", "Database Migrations"],
    connections: ["Domain → Persistence via Repository Interfaces", "Persistence → Infrastructure via Database Drivers"],
  },
  {
    id: "infrastructure",
    name: "Infrastructure Layer",
    description: "External integrations, scanner adapters, and platform-specific implementations. Contains Docker clients, cloud SDKs, and third-party API wrappers. All I/O happens here.",
    classes: ["DockerScannerAdapter", "NmapAdapter", "ZapAdapter", "S3StorageClient", "DockerClient", "KubernetesClient", "CloudProviderAdapter"],
    technologies: ["Docker SDK", "Nmap", "OWASP ZAP", "AWS SDK", "Kubernetes Client", "SSH2"],
    connections: ["Infrastructure → Persistence via Data Mappers", "Orchestrator → Infrastructure via Scanner Interfaces"],
  },
];

// ─── Roadmap Items (Interactive) ────────────────────────────────────────────

export type RoadmapStatus = "completed" | "in-progress" | "planned" | "community-idea";

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  category: string;
  upvotes: number;
  target: string;
}

export const roadmapItems: RoadmapItem[] = [
  { id: "rm-001", title: "Knowledge Graph Visualization", description: "Interactive graph view for security findings, assets, and attack paths with real-time exploration.", status: "completed", category: "Platform", upvotes: 342, target: "Q2 2026" },
  { id: "rm-002", title: "SBOM Generation", description: "Software Bill of Materials generation from scan results with CycloneDX and SPDX support.", status: "completed", category: "Scanning", upvotes: 287, target: "Q2 2026" },
  { id: "rm-003", title: "Plugin Marketplace v2", description: "Redesigned marketplace with ratings, reviews, verified publisher badges, and one-click install.", status: "completed", category: "Platform", upvotes: 256, target: "Q2 2026" },
  { id: "rm-004", title: "Cloud Scanning Module", description: "AWS, GCP, and Azure misconfiguration detection with CIS benchmark validation.", status: "in-progress", category: "Scanning", upvotes: 412, target: "Q3 2026" },
  { id: "rm-005", title: "AI Remediation Assistant", description: "AI-powered remediation guidance with code examples, step-by-step instructions, and effort estimation.", status: "in-progress", category: "AI/ML", upvotes: 523, target: "Q3 2026" },
  { id: "rm-006", title: "Real-time Collaboration", description: "Multi-user collaboration with live cursors, comments, and shared investigation workspaces.", status: "in-progress", category: "Platform", upvotes: 198, target: "Q3 2026" },
  { id: "rm-007", title: "Mobile App Security", description: "Static and dynamic analysis for iOS and Android applications with OWASP Mobile coverage.", status: "planned", category: "Scanning", upvotes: 367, target: "Q4 2026" },
  { id: "rm-008", title: "Custom Compliance Frameworks", description: "Build and share custom compliance frameworks with requirement mapping and evidence collection.", status: "planned", category: "Compliance", upvotes: 276, target: "Q4 2026" },
  { id: "rm-009", title: "CI/CD Pipeline Integration", description: "Native GitHub Actions, GitLab CI, and Jenkins plugins with gating and quality policies.", status: "planned", category: "Integrations", upvotes: 445, target: "Q4 2026" },
  { id: "rm-010", title: "Team Collaboration v2", description: "Enhanced team features: assignments, SLA tracking, workflows, and role-based dashboards.", status: "planned", category: "Platform", upvotes: 189, target: "Q1 2027" },
  { id: "rm-011", title: "API Security Testing", description: "Automated API security testing with OpenAPI spec fuzzing and schema validation.", status: "community-idea", category: "Scanning", upvotes: 534, target: "TBD" },
  { id: "rm-012", title: "Kubernetes Operator", description: "Native Kubernetes operator for in-cluster scanning with auto-discovery and policy enforcement.", status: "community-idea", category: "Infrastructure", upvotes: 312, target: "TBD" },
  { id: "rm-013", title: "Threat Intel Feed Integration", description: "Auto-enrich findings with threat intelligence from MITRE, NVD, CISA KEV, and commercial feeds.", status: "community-idea", category: "Intelligence", upvotes: 478, target: "TBD" },
];

// ─── AI Copilot Examples ────────────────────────────────────────────────────

export interface CopilotExample {
  question: string;
  icon: string;
}

export const copilotExamples: CopilotExample[] = [
  { question: "Show my highest risks", icon: "alert-triangle" },
  { question: "Explain attack path", icon: "route" },
  { question: "How do I reduce exposure?", icon: "shield" },
  { question: "Why is this finding critical?", icon: "help-circle" },
  { question: "Build remediation plan", icon: "wrench" },
];

export interface CopilotResponse {
  question: string;
  reasoning: string[];
  connections: string[];
  recommendations: string[];
  links: { label: string; id: string }[];
}

export const copilotResponses: Record<string, CopilotResponse> = {
  "Show my highest risks": {
    question: "Show my highest risks",
    reasoning: [
      "Analyzing all findings by CVSS score and asset criticality...",
      "Cross-referencing with known exploit availability (CISA KEV)...",
      "Computing composite risk scores incorporating business impact...",
    ],
    connections: [
      "FND-005 (Redis No Auth) → AST-004 (db-internal) — Critical database exposed",
      "FND-001 (SQL Injection) → AST-001 (app.sec-scanner.pro) — Internet-facing application",
      "FND-006 (K8s Dashboard) → AST-005 (k8s.sec-scanner.pro) — Full cluster access",
      "FND-007 (Vault Key) → AST-006 (vault.sec-scanner.pro) — Secrets compromised",
    ],
    recommendations: [
      "PRIORITY 1: Enable Redis authentication immediately — 5-minute fix, eliminates 1 attack path",
      "PRIORITY 2: Parameterize SQL queries in /api/v1/users — blocks the primary data breach path",
      "PRIORITY 3: Enable RBAC on Kubernetes dashboard — prevents cluster takeover",
      "PRIORITY 4: Migrate Vault unseal to KMS auto-unseal — removes key exposure",
    ],
    links: [
      { label: "FND-005", id: "FND-005" },
      { label: "FND-001", id: "FND-001" },
      { label: "FND-006", id: "FND-006" },
      { label: "FND-007", id: "FND-007" },
    ],
  },
  "Explain attack path": {
    question: "Explain attack path",
    reasoning: [
      "Tracing attack paths from internet-facing services to critical assets...",
      "Found 3 viable attack paths. Primary path has 80% success probability.",
      "Cross-referencing with MITRE ATT&CK techniques and known exploits...",
    ],
    connections: [
      "Internet → Firewall (95%) → NGINX (90%) → App (85%) → Database (80%)",
      "This path exploits CVE-2024-23956 (SQL Injection) to reach PostgreSQL",
      "Firewall rules allow unrestricted traffic to app.sec-scanner.pro:443",
      "App uses string concatenation for SQL queries in the users endpoint",
    ],
    recommendations: [
      "Block: Parameterize all SQL queries — stops this path at the Application layer",
      "Detect: Add WAF rule for SQLi patterns on /api/v1/users",
      "Contain: Move database to a private subnet with no internet route",
      "Monitor: Alert on unusual SQL patterns in application logs",
    ],
    links: [
      { label: "Attack Path 1", id: "ap1" },
      { label: "CVE-2024-23956", id: "cve-23956" },
      { label: "FND-001", id: "FND-001" },
    ],
  },
  "How do I reduce exposure?": {
    question: "How do I reduce exposure?",
    reasoning: [
      "Analyzing external attack surface and exposure vectors...",
      "Identifying services that don't need to be internet-facing...",
      "Calculating risk reduction for each remediation action...",
    ],
    connections: [
      "4 services are exposed to the internet that shouldn't be",
      "Redis (6379) and PostgreSQL (5432) have no business being publicly accessible",
      "Kubernetes dashboard should be behind a VPN or auth proxy",
      "Vault unseal key in env var means any code execution = secret access",
    ],
    recommendations: [
      "Move Redis and PostgreSQL to private subnets — reduces attack surface by 40%",
      "Enable authentication on all internet-facing services — eliminates 3 attack paths",
      "Add VPN/bastion host for internal service access — zero-trust access model",
      "Implement network segmentation between application tiers — limits lateral movement",
    ],
    links: [
      { label: "FND-005", id: "FND-005" },
      { label: "FND-006", id: "FND-006" },
      { label: "FND-009", id: "FND-009" },
    ],
  },
  "Why is this finding critical?": {
    question: "Why is this finding critical?",
    reasoning: [
      "Analyzing FND-005 (Redis Exposed Without Authentication)...",
      "CVSS base score is 9.1 — but let me explain why it's actually worse...",
      "This Redis instance is on the same network as Kubernetes and Vault...",
    ],
    connections: [
      "Redis can be exploited via CONFIG SET to write files (RCE)",
      "Same-network access to Kubernetes API server (6443)",
      "Redis session data includes active user tokens",
      "Attack chain: Redis RCE → K8s API → Full cluster compromise",
    ],
    recommendations: [
      "Immediate: Enable requirepass in redis.conf and restart",
      "Short-term: Bind Redis to 127.0.0.1, use firewall rules",
      "Medium-term: Migrate to Redis with TLS and ACLs (Redis 6+)",
      "Long-term: Use Redis as a sidecar with network policies",
    ],
    links: [
      { label: "FND-005", id: "FND-005" },
      { label: "CVE-2024-31449", id: "cve-31449" },
      { label: "Attack Path 2", id: "ap2" },
    ],
  },
  "Build remediation plan": {
    question: "Build remediation plan",
    reasoning: [
      "Prioritizing all open findings by risk score and remediation effort...",
      "Grouping related findings that can be fixed together...",
      "Estimating effort and impact for each remediation task...",
    ],
    connections: [
      "4 findings can be resolved in under 1 hour each (quick wins)",
      "2 findings require code changes (medium effort, 1-2 days)",
      "2 findings require infrastructure changes (high effort, 3-5 days)",
      "Fixing Redis auth + Vault key migration blocks 2 of 3 attack paths",
    ],
    recommendations: [
      "WEEK 1 (Quick Wins): Enable Redis auth, remove Vault key from env, add CSP header, disable TLS 1.0",
      "WEEK 2 (Code Fixes): Parameterize SQL queries, add output encoding for XSS, validate webhook URLs",
      "WEEK 3 (Infra): Enable K8s RBAC, move DBs to private subnets, add auth proxy to K8s dashboard",
      "WEEK 4 (Verify): Re-scan all assets, validate remediation, update compliance reports",
    ],
    links: [
      { label: "All Findings", id: "findings" },
      { label: "All Attack Paths", id: "attack-paths" },
      { label: "Compliance Report", id: "compliance" },
    ],
  },
};

// ─── Cloud Workspace ────────────────────────────────────────────────────────

export interface CloudProject {
  id: string;
  name: string;
  status: "active" | "paused" | "completed";
  assets: number;
  findings: number;
  lastScan: string;
}

export const cloudProjects: CloudProject[] = [
  { id: "prj-001", name: "Production Environment", status: "active", assets: 8, findings: 12, lastScan: "2 min ago" },
  { id: "prj-002", name: "Staging Cluster", status: "active", assets: 4, findings: 3, lastScan: "1 hour ago" },
  { id: "prj-003", name: "Payment Services", status: "completed", assets: 6, findings: 0, lastScan: "3 hours ago" },
  { id: "prj-004", name: "Legacy Infrastructure", status: "paused", assets: 12, findings: 28, lastScan: "2 days ago" },
];

// ─── Animated Metrics ───────────────────────────────────────────────────────

export const platformMetrics = [
  { label: "Modules", value: 20, suffix: "" },
  { label: "Source Files", value: 370, suffix: "+", prefix: "" },
  { label: "Lines of Code", value: 73, suffix: "k" },
  { label: "Tests", value: 2350, suffix: "" },
  { label: "TypeScript Errors", value: 0, suffix: "" },
  { label: "Open Source", value: 100, suffix: "%" },
];
