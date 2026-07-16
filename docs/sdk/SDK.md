# Security Intelligence Platform — SDK Reference

Official client libraries for the Security Intelligence Platform REST API. Three SDKs are provided with varying coverage levels:

| SDK | Language | Methods | External Dependencies | Package |
|-----|----------|---------|-----------------------|---------|
| TypeScript | TypeScript / Node.js | 20 | None (uses native `fetch`) | `sdk/typescript/` |
| Python | Python 3.8+ | 18 | Zero (stdlib `urllib`) | `sdk/python/` |
| Go | Go 1.22+ | 11 | Zero (stdlib `net/http`) | `github.com/Ksander215/sec-scanner-workspace/sdk/go` |

---

## Table of Contents

- [TypeScript SDK](#typescript-sdk)
  - [Installation](#typescript-installation)
  - [Configuration](#typescript-configuration)
  - [Authentication](#typescript-authentication)
  - [API Methods](#typescript-api-methods)
  - [Error Handling](#typescript-error-handling)
  - [Code Examples](#typescript-code-examples)
- [Python SDK](#python-sdk)
  - [Installation](#python-installation)
  - [Configuration](#python-configuration)
  - [Authentication](#python-authentication)
  - [API Methods](#python-api-methods)
  - [Error Handling](#python-error-handling)
  - [Code Examples](#python-code-examples)
- [Go SDK](#go-sdk)
  - [Installation](#go-installation)
  - [Configuration](#go-configuration)
  - [Authentication](#go-authentication)
  - [API Methods](#go-api-methods)
  - [Error Handling](#go-error-handling)
  - [Code Examples](#go-code-examples)
- [Feature Parity Matrix](#feature-parity-matrix)
- [Streaming Analysis](#streaming-analysis)

---

# TypeScript SDK

## TypeScript Installation

```bash
# Copy the SDK into your project
cp -r sdk/typescript/ ./si-sdk/

# Or import directly if in a monorepo
import { SecurityIntelligenceClient, SiApiError } from './sdk/typescript/index.js';
```

The TypeScript SDK has **zero runtime dependencies** — it uses the native `fetch` API (Node.js 18+). No `npm install` is required beyond your project's existing toolchain.

## TypeScript Configuration

```typescript
import { SecurityIntelligenceClient } from './sdk/typescript/index.js';

const client = new SecurityIntelligenceClient({
  baseUrl: 'https://si-platform.example.com',  // Required — base URL of the SI Platform
  timeout: 30000,                               // Optional — request timeout in ms (default: 30000)
  authToken: 'eyJhbGciOiJIUzI1NiIs...',         // Optional — Bearer token
  apiKey: 'si_k_live_abc123',                   // Optional — API key
});
```

### SdkConfig Interface

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `baseUrl` | `string` | Yes | — | Base URL of the SI Platform server. Trailing slash is stripped automatically. |
| `timeout` | `number` | No | `30000` | Request timeout in milliseconds. Uses `AbortController` internally. |
| `authToken` | `string` | No | — | Bearer token sent as `Authorization: Bearer <token>` header. |
| `apiKey` | `string` | No | — | API key sent as `X-API-Key` header. |

## TypeScript Authentication

The SDK supports two authentication mechanisms, which can be used independently or together:

1. **Bearer Token** — Set `authToken` in config. Sent as `Authorization: Bearer <token>` on every request.
2. **API Key** — Set `apiKey` in config. Sent as `X-API-Key: <key>` on every request.

```typescript
// Bearer token only
const client = new SecurityIntelligenceClient({
  baseUrl: 'https://si.example.com',
  authToken: process.env.SI_AUTH_TOKEN!,
});

// API key only
const client = new SecurityIntelligenceClient({
  baseUrl: 'https://si.example.com',
  apiKey: process.env.SI_API_KEY!,
});

// Both (dual auth)
const client = new SecurityIntelligenceClient({
  baseUrl: 'https://si.example.com',
  authToken: process.env.SI_AUTH_TOKEN!,
  apiKey: process.env.SI_API_KEY!,
});
```

## TypeScript API Methods

### Analysis

#### `analyze(request: AnalyzeRequestDTO): Promise<AnalyzeResponseDTO>`

Starts an asynchronous analysis run. Returns immediately with a `202 Accepted` response containing the run ID and a status polling URL.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `request.findings` | `Array<FindingInput>` | Yes | Raw security findings to analyze |
| `request.findings[].id` | `string` | Yes | Unique finding identifier |
| `request.findings[].source` | `string` | Yes | Scanner source (e.g., `"nmap"`, `"trivy"`) |
| `request.findings[].sourceId` | `string` | Yes | Source-specific ID |
| `request.findings[].name` | `string` | Yes | Finding name |
| `request.findings[].description` | `string` | Yes | Finding description |
| `request.findings[].severity` | `string` | Yes | Severity level (e.g., `"critical"`, `"high"`) |
| `request.findings[].category` | `string` | No | Finding category |
| `request.findings[].host` | `string` | No | Affected host |
| `request.findings[].port` | `number` | No | Affected port |
| `request.findings[].protocol` | `string` | No | Protocol |
| `request.findings[].path` | `string` | No | File/resource path |
| `request.findings[].evidence` | `Record<string, unknown>` | No | Raw evidence data |
| `request.findings[].metadata` | `Record<string, unknown>` | No | Additional metadata |
| `request.findings[].timestamp` | `string` | Yes | ISO 8601 timestamp |
| `request.options` | `AnalyzeOptions` | No | Analysis options |
| `request.options.persist` | `boolean` | No | Whether to persist the report |
| `request.options.explain` | `boolean` | No | Generate explanations |
| `request.options.includeAttackPaths` | `boolean` | No | Include attack path analysis |
| `request.options.includeImpact` | `boolean` | No | Include impact assessment |

**Returns:** `AnalyzeResponseDTO`

| Field | Type | Description |
|-------|------|-------------|
| `runId` | `string` | Unique run identifier |
| `status` | `'accepted'` | Always `'accepted'` |
| `message` | `string` | Human-readable status message |
| `statusUrl` | `string` | URL to poll for status |

---

#### `analyzeSync(request: AnalyzeRequestDTO): Promise<SecurityIntelligenceReport>`

Runs a synchronous (blocking) analysis. Waits for the full pipeline to complete and returns the complete `SecurityIntelligenceReport`.

**Parameters:** Same as `analyze()`.

**Returns:** `SecurityIntelligenceReport` — the full analysis result containing findings, correlations, risk assessments, attack paths, impacts, recommendations, remediation plan, explanations, and pipeline metrics.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Report ID |
| `runId` | `string` | Run identifier |
| `timestamp` | `Date` | Report timestamp |
| `findings` | `SecurityFinding[]` | Normalized findings |
| `normalization` | `NormalizationStatistics` | Normalization stats |
| `correlation` | `CorrelationStatistics` | Correlation stats |
| `knowledgeGraph` | `KGStatistics` | Knowledge graph stats |
| `riskSummary` | `RiskSummary` | Risk summary |
| `risks` | `RiskAssessment[]` | Risk assessments |
| `attackGraph` | `AttackGraphStatistics` | Attack graph stats |
| `attackPaths` | `AttackGraph[]` | Attack path details |
| `impacts` | `ImpactAssessment[]` | Impact assessments |
| `recommendations` | `Recommendation[]` | Recommendations |
| `remediationPlan` | `RemediationPlan` | Remediation plan |
| `explanations` | `Explanation[]` | Explanations |
| `trace` | `AnalysisTrace` | Full pipeline trace |
| `metrics` | `PipelineMetrics` | Pipeline performance metrics |

---

### Reports

#### `listReports(limit?: number, offset?: number): Promise<PaginatedResponse<ReportDTO>>`

Lists all reports with pagination.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | `number` | `100` | Maximum number of reports to return |
| `offset` | `number` | `0` | Number of reports to skip |

**Returns:** `PaginatedResponse<ReportDTO>` with fields `data`, `total`, `limit`, `offset`.

**ReportDTO fields:** `id`, `runId`, `timestamp`, `findingsCount`, `riskSummary`, `metrics`.

---

#### `getReport(id: string): Promise<SecurityIntelligenceReport>`

Retrieves a full report by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | Report ID |

**Returns:** `SecurityIntelligenceReport`

---

#### `getReportSummary(id: string): Promise<Record<string, unknown>>`

Retrieves a summary of a report by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | Report ID |

**Returns:** `Record<string, unknown>` — summary object.

---

#### `deleteReport(id: string): Promise<void>`

Deletes a report by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | Report ID |

**Returns:** `void`

---

### Findings

#### `listFindings(reportId: string, limit?: number, offset?: number): Promise<PaginatedResponse<FindingDTO>>`

Lists findings for a specific report.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `reportId` | `string` | — | Report ID to filter by |
| `limit` | `number` | `100` | Maximum results |
| `offset` | `number` | `0` | Results to skip |

**FindingDTO fields:** `id`, `source`, `name`, `description`, `severity`, `category`, `confidence`, `host`, `port`, `protocol`, `path`, `tags`, `cve`, `cwe`, `cvssScore`.

---

#### `getFinding(id: string): Promise<FindingDTO>`

Retrieves a single finding by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | Finding ID |

**Returns:** `FindingDTO`

---

#### `searchFindings(query: string, limit?: number, offset?: number): Promise<PaginatedResponse<FindingDTO>>`

Full-text search across findings. The query string is URL-encoded automatically.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | `string` | — | Search query string |
| `limit` | `number` | `100` | Maximum results |
| `offset` | `number` | `0` | Results to skip |

**Returns:** `PaginatedResponse<FindingDTO>`

---

### Risk

#### `listRisks(reportId: string): Promise<PaginatedResponse<RiskDTO>>`

Lists risk assessments for a report.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | `string` | Yes | Report ID |

**RiskDTO fields:** `id`, `findingId`, `level`, `score`, `confidence`, `description`, `recommendations`.

---

#### `getRiskSummary(reportId: string): Promise<Record<string, unknown>>`

Retrieves a risk summary for a report.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | `string` | Yes | Report ID |

**Returns:** `Record<string, unknown>` — risk summary object.

---

#### `getTopRisks(limit?: number): Promise<PaginatedResponse<RiskDTO>>`

Retrieves the top risks across all reports.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | `number` | `10` | Maximum results |

**Returns:** `PaginatedResponse<RiskDTO>`

---

### Attack Paths

#### `listAttackPaths(reportId: string): Promise<PaginatedResponse<AttackPathDTO>>`

Lists attack paths for a report.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | `string` | Yes | Report ID |

**AttackPathDTO fields:** `id`, `name`, `stepsCount`, `totalRiskScore`, `exploitability`, `impact`, `entryPoint`.

---

#### `getAttackGraph(reportId: string): Promise<unknown>`

Retrieves the full attack graph for a report.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | `string` | Yes | Report ID |

**Returns:** `unknown` — the attack graph structure.

---

### Recommendations

#### `listRecommendations(reportId: string): Promise<PaginatedResponse<RecommendationDTO>>`

Lists recommendations for a report.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | `string` | Yes | Report ID |

**RecommendationDTO fields:** `id`, `title`, `description`, `priority`, `status`, `actionsCount`, `estimatedRiskReduction`, `tags`.

---

#### `createRemediationPlan(reportId: string): Promise<unknown>`

Creates a remediation plan from a report's recommendations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | `string` | Yes | Report ID |

**Returns:** `unknown` — the remediation plan.

---

### Explainability

#### `listExplanations(reportId: string): Promise<PaginatedResponse<ExplanationDTO>>`

Lists explanations for a report.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | `string` | Yes | Report ID |

**ExplanationDTO fields:** `id`, `type`, `targetId`, `summary`, `stepsCount`, `confidence`.

---

#### `getExplanation(targetId: string): Promise<ExplanationDTO>`

Retrieves a specific explanation by target ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `targetId` | `string` | Yes | Target ID to explain |

**Returns:** `ExplanationDTO`

---

### Health

#### `getHealth(): Promise<HealthDTO>`

Checks the platform health status.

**Returns:** `HealthDTO` with fields: `status` (`'healthy' | 'degraded' | 'unhealthy'`), `version`, `uptime`, `components`.

---

### Snapshots

#### `createSnapshot(reportId: string, description?: string): Promise<{ snapshotId: string }>`

Creates a snapshot of a report for point-in-time recovery.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | `string` | Yes | Report ID to snapshot |
| `description` | `string` | No | Human-readable snapshot description |

**Returns:** `{ snapshotId: string }`

---

#### `restoreSnapshot(snapshotId: string): Promise<SecurityIntelligenceReport>`

Restores a report from a snapshot.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `snapshotId` | `string` | Yes | Snapshot ID to restore |

**Returns:** `SecurityIntelligenceReport`

---

## TypeScript Error Handling

All API errors are wrapped in the `SiApiError` class:

```typescript
export class SiApiError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(`API Error ${statusCode}: ${message}`);
    this.name = 'SiApiError';
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `statusCode` | `number` | HTTP status code (e.g., 400, 401, 404, 500) |
| `message` | `string` | Error message from the API or HTTP status text |
| `name` | `string` | Always `'SiApiError'` |

Common error codes:

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request — invalid input |
| 401 | Unauthorized — missing or invalid auth |
| 403 | Forbidden — insufficient permissions |
| 404 | Not Found — resource does not exist |
| 409 | Conflict — resource already exists |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

Network-level errors (DNS failure, connection refused, timeout) will throw native `TypeError` or `AbortError` from `fetch`.

## TypeScript Code Examples

### Example 1: Basic Client Setup and Health Check

```typescript
import { SecurityIntelligenceClient, SiApiError } from './sdk/typescript/index.js';

const client = new SecurityIntelligenceClient({
  baseUrl: process.env.SI_BASE_URL ?? 'http://localhost:3000',
  authToken: process.env.SI_AUTH_TOKEN,
  apiKey: process.env.SI_API_KEY,
});

try {
  const health = await client.getHealth();
  console.log(`Platform status: ${health.status} (v${health.version})`);
  console.log(`Uptime: ${health.uptime}s`);
  for (const [component, status] of Object.entries(health.components)) {
    console.log(`  ${component}: ${status}`);
  }
} catch (err) {
  if (err instanceof SiApiError) {
    console.error(`API Error ${err.statusCode}: ${err.message}`);
  } else {
    console.error('Network error:', err);
  }
}
```

### Example 2: Asynchronous Analysis

```typescript
// Start an async analysis and poll for results
const response = await client.analyze({
  findings: [
    {
      id: 'f-001',
      source: 'trivy',
      sourceId: 'trivy-2024-001',
      name: 'CVE-2024-1234 in openssl',
      description: 'Critical vulnerability in OpenSSL 3.1.x',
      severity: 'critical',
      host: 'web-server-01',
      port: 443,
      protocol: 'tcp',
      timestamp: new Date().toISOString(),
    },
  ],
  options: {
    persist: true,
    explain: true,
    includeAttackPaths: true,
    includeImpact: true,
  },
});

console.log(`Analysis started: runId=${response.runId}`);
console.log(`Status URL: ${response.statusUrl}`);

// Poll for completion using the report endpoint
const report = await client.getReport(response.runId);
```

### Example 3: Synchronous Analysis with Full Report

```typescript
// Blocking analysis — waits for the full pipeline
const report = await client.analyzeSync({
  findings: scanResults.map((f) => ({
    id: f.id,
    source: 'nmap',
    sourceId: f.id,
    name: f.name,
    description: f.description,
    severity: f.severity,
    host: f.host,
    port: f.port,
    timestamp: new Date().toISOString(),
  })),
});

console.log(`Report: ${report.id}`);
console.log(`  Findings: ${report.findings.length}`);
console.log(`  Risks: ${report.risks.length}`);
console.log(`  Attack paths: ${report.attackPaths.length}`);
console.log(`  Recommendations: ${report.recommendations.length}`);
console.log(`  Total duration: ${report.metrics.totalDurationMs}ms`);
```

### Example 4: Paginated Findings Search with Error Handling

```typescript
async function searchAndExport(query: string): Promise<void> {
  let offset = 0;
  const limit = 50;
  let total = 0;

  try {
    do {
      const page = await client.searchFindings(query, limit, offset);
      total = page.total;

      for (const finding of page.data) {
        console.log(`[${finding.severity}] ${finding.name} on ${finding.host}`);
        if (finding.cve?.length) {
          console.log(`  CVEs: ${finding.cve.join(', ')}`);
        }
      }

      offset += limit;
    } while (offset < total);

    console.log(`Total findings matching "${query}": ${total}`);
  } catch (err) {
    if (err instanceof SiApiError) {
      if (err.statusCode === 401) {
        console.error('Authentication failed — check your token and API key');
      } else if (err.statusCode === 400) {
        console.error('Invalid search query:', err.message);
      } else {
        console.error(`Unexpected API error: ${err.statusCode} ${err.message}`);
      }
    }
    throw err;
  }
}
```

### Example 5: Snapshot Management

```typescript
// Create a snapshot before making changes
const { snapshotId } = await client.createSnapshot(
  'report-abc-123',
  'Pre-remediation baseline snapshot'
);
console.log(`Created snapshot: ${snapshotId}`);

// ... perform remediation ...

// Restore if needed
const restored = await client.restoreSnapshot(snapshotId);
console.log(`Restored report from snapshot: ${restored.id}`);
console.log(`  Findings: ${restored.findings.length}`);
console.log(`  Risks: ${restored.risks.length}`);
```

### Example 6: Risk Analysis and Remediation Plan

```typescript
// Get risk summary
const riskSummary = await client.getRiskSummary('report-abc-123');
console.log('Risk Summary:', JSON.stringify(riskSummary, null, 2));

// Get top risks
const topRisks = await client.getTopRisks(5);
for (const risk of topRisks.data) {
  console.log(`[${risk.level}] Score: ${risk.score} — ${risk.description}`);
}

// Create remediation plan
const plan = await client.createRemediationPlan('report-abc-123');
console.log('Remediation Plan:', JSON.stringify(plan, null, 2));
```

---

# Python SDK

## Python Installation

```bash
# Copy the SDK into your project
cp sdk/python/si_client.py ./si_client.py

# Or add the directory to your Python path
import sys
sys.path.insert(0, 'sdk/python')
from si_client import SecurityIntelligenceClient, SiApiError
```

The Python SDK has **zero external dependencies** — it uses only the Python standard library (`urllib.request`, `urllib.error`, `urllib.parse`, `json`, `uuid`). Compatible with Python 3.8+.

## Python Configuration

```python
from si_client import SecurityIntelligenceClient

client = SecurityIntelligenceClient(
    base_url='https://si-platform.example.com',  # Required
    auth_token='eyJhbGciOiJIUzI1NiIs...',         # Optional — Bearer token
    api_key='si_k_live_abc123',                   # Optional — API key
    timeout=30,                                   # Optional — timeout in seconds (default: 30)
)
```

### Constructor Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `base_url` | `str` | Yes | — | Base URL of the SI Platform. Trailing slash is stripped. |
| `auth_token` | `Optional[str]` | No | `None` | Bearer token for `Authorization` header |
| `api_key` | `Optional[str]` | No | `None` | API key for `X-API-Key` header |
| `timeout` | `int` | No | `30` | Request timeout in seconds |

## Python Authentication

Same dual-auth mechanism as the TypeScript SDK:

```python
import os

# Bearer token only
client = SecurityIntelligenceClient(
    base_url=os.environ['SI_BASE_URL'],
    auth_token=os.environ.get('SI_AUTH_TOKEN'),
)

# API key only
client = SecurityIntelligenceClient(
    base_url=os.environ['SI_BASE_URL'],
    api_key=os.environ.get('SI_API_KEY'),
)

# Both
client = SecurityIntelligenceClient(
    base_url=os.environ['SI_BASE_URL'],
    auth_token=os.environ.get('SI_AUTH_TOKEN'),
    api_key=os.environ.get('SI_API_KEY'),
)
```

## Python API Methods

### Analysis

#### `analyze(findings: List[Dict], **options) -> Dict`

Starts an asynchronous analysis.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `findings` | `List[Dict]` | Yes | List of finding dicts with keys: `id`, `source`, `sourceId`, `name`, `description`, `severity`, `timestamp`, and optional `category`, `host`, `port`, `protocol`, `path`, `evidence`, `metadata` |
| `**options` | keyword args | No | Analysis options: `persist`, `explain`, `includeAttackPaths`, `includeImpact` |

**Returns:** `Dict` with `runId`, `status`, `message`, `statusUrl`.

---

#### `analyze_sync(findings: List[Dict], **options) -> Dict`

Synchronous blocking analysis. Same parameters as `analyze()`.

**Returns:** `Dict` — the full `SecurityIntelligenceReport`.

---

### Reports

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `list_reports` | `(limit: int = 100, offset: int = 0) -> Dict` | Paginated report list | List all reports |
| `get_report` | `(report_id: str) -> Dict` | Full report | Get report by ID |
| `delete_report` | `(report_id: str) -> Dict` | Response dict | Delete report by ID |

> **Note:** The Python SDK does **not** include `getReportSummary`. Use `get_report()` and extract the `riskSummary` field from the full report.

---

### Findings

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `list_findings` | `(report_id: str, limit: int = 100, offset: int = 0) -> Dict` | Paginated findings | List findings for a report |
| `search_findings` | `(query: str, limit: int = 100, offset: int = 0) -> Dict` | Paginated findings | Full-text search across findings |

> **Note:** The Python SDK does **not** include `getFinding` (single finding by ID). Use `search_findings()` or `list_findings()` and filter client-side.

---

### Risk

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `list_risks` | `(report_id: str) -> Dict` | Paginated risks | List risks for a report |
| `get_risk_summary` | `(report_id: str) -> Dict` | Risk summary dict | Get risk summary |
| `get_top_risks` | `(limit: int = 10) -> Dict` | Paginated risks | Get top risks across all reports |

---

### Attack Paths

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `list_attack_paths` | `(report_id: str) -> Dict` | Paginated attack paths | List attack paths for a report |

> **Note:** The Python SDK does **not** include `getAttackGraph`. Use the TypeScript SDK for full graph retrieval.

---

### Recommendations

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `list_recommendations` | `(report_id: str) -> Dict` | Paginated recommendations | List recommendations |
| `create_remediation_plan` | `(report_id: str) -> Dict` | Remediation plan dict | Create a remediation plan |

---

### Explainability

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `list_explanations` | `(report_id: str) -> Dict` | Paginated explanations | List explanations for a report |
| `get_explanation` | `(target_id: str) -> Dict` | Explanation dict | Get a specific explanation |

---

### Health

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `get_health` | `() -> Dict` | Health dict | Check platform health |

---

### Snapshots

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `create_snapshot` | `(report_id: str, description: Optional[str] = None) -> Dict` | `{ snapshotId: str }` | Create a report snapshot |
| `restore_snapshot` | `(snapshot_id: str) -> Dict` | Full report | Restore a report from snapshot |

---

## Python Error Handling

All API errors raise `SiApiError`:

```python
class SiApiError(Exception):
    status_code: int
    message: str
```

| Property | Type | Description |
|----------|------|-------------|
| `status_code` | `int` | HTTP status code |
| `message` | `str` | Error message from the API |

## Python Code Examples

### Example 1: Basic Client Setup and Health Check

```python
from si_client import SecurityIntelligenceClient, SiApiError
import os

client = SecurityIntelligenceClient(
    base_url=os.environ.get('SI_BASE_URL', 'http://localhost:3000'),
    auth_token=os.environ.get('SI_AUTH_TOKEN'),
    api_key=os.environ.get('SI_API_KEY'),
)

try:
    health = client.get_health()
    print(f"Platform status: {health['status']} (v{health['version']})")
    print(f"Uptime: {health['uptime']}s")
    for component, status in health.get('components', {}).items():
        print(f"  {component}: {status}")
except SiApiError as e:
    print(f"API Error {e.status_code}: {e.message}")
```

### Example 2: Asynchronous Analysis

```python
response = client.analyze(
    findings=[
        {
            'id': 'f-001',
            'source': 'trivy',
            'sourceId': 'trivy-2024-001',
            'name': 'CVE-2024-1234 in openssl',
            'description': 'Critical vulnerability in OpenSSL 3.1.x',
            'severity': 'critical',
            'host': 'web-server-01',
            'port': 443,
            'protocol': 'tcp',
            'timestamp': '2024-01-15T10:30:00Z',
        },
    ],
    persist=True,
    explain=True,
    includeAttackPaths=True,
)

print(f"Analysis started: runId={response['runId']}")
print(f"Status URL: {response['statusUrl']}")
```

### Example 3: Synchronous Analysis with Full Report

```python
report = client.analyze_sync(
    findings=scan_results,
    persist=True,
    explain=True,
)

print(f"Report: {report['id']}")
print(f"  Findings: {len(report['findings'])}")
print(f"  Risks: {len(report['risks'])}")
print(f"  Attack paths: {len(report['attackPaths'])}")
print(f"  Recommendations: {len(report['recommendations'])}")
print(f"  Duration: {report['metrics']['totalDurationMs']}ms")
```

### Example 4: Paginated Finding Search with Error Handling

```python
def search_findings(query: str) -> list:
    all_findings = []
    offset = 0
    limit = 50

    try:
        while True:
            page = client.search_findings(query, limit=limit, offset=offset)
            all_findings.extend(page['data'])
            if offset + limit >= page['total']:
                break
            offset += limit

        print(f"Total findings matching '{query}': {len(all_findings)}")
        return all_findings

    except SiApiError as e:
        if e.status_code == 401:
            print('Authentication failed — check your credentials')
        elif e.status_code == 400:
            print(f'Invalid search query: {e.message}')
        else:
            print(f'API Error {e.status_code}: {e.message}')
        raise
```

### Example 5: Snapshot and Remediation Workflow

```python
# Create a snapshot before remediation
snapshot = client.create_snapshot(
    report_id='report-abc-123',
    description='Pre-remediation baseline'
)
snapshot_id = snapshot['snapshotId']
print(f"Created snapshot: {snapshot_id}")

# Get top risks
top_risks = client.get_top_risks(limit=5)
for risk in top_risks['data']:
    print(f"[{risk['level']}] Score: {risk['score']} — {risk['description']}")

# Create remediation plan
plan = client.create_remediation_plan('report-abc-123')
print(f"Remediation plan created with {plan.get('actionsCount', 0)} actions")

# Restore snapshot if needed
restored = client.restore_snapshot(snapshot_id)
print(f"Restored report: {restored['id']}")
```

### Example 6: Iterating All Reports and Explanations

```python
# List all reports with pagination
offset = 0
while True:
    page = client.list_reports(limit=25, offset=offset)
    for report in page['data']:
        print(f"Report {report['id']}: {report['findingsCount']} findings")

        # Get explanations for each report
        explanations = client.list_explanations(report['id'])
        for exp in explanations['data']:
            print(f"  Explanation for {exp['targetId']}: {exp['summary']}")

    if offset + 25 >= page['total']:
        break
    offset += 25
```

---

# Go SDK

## Go Installation

```bash
go get github.com/Ksander215/sec-scanner-workspace/sdk/go
```

Import in your code:

```go
import si "github.com/Ksander215/sec-scanner-workspace/sdk/go"
```

The Go SDK has **zero external dependencies** — it uses only the Go standard library (`net/http`, `encoding/json`, `context`, etc.). Requires Go 1.22+.

## Go Configuration

```go
client := si.NewClient(si.Config{
    BaseURL:   "https://si-platform.example.com",  // Required
    AuthToken: "eyJhbGciOiJIUzI1NiIs...",           // Optional — Bearer token
    APIKey:    "si_k_live_abc123",                  // Optional — API key
    Timeout:   30 * time.Second,                    // Optional — defaults to 30s
})
```

### Config Struct

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `BaseURL` | `string` | Yes | — | Base URL of the SI Platform |
| `AuthToken` | `string` | No | `""` | Bearer token for `Authorization` header |
| `APIKey` | `string` | No | `""` | API key for `X-API-Key` header |
| `Timeout` | `time.Duration` | No | `30s` | HTTP client timeout |

## Go Authentication

```go
// Bearer token only
client := si.NewClient(si.Config{
    BaseURL:   os.Getenv("SI_BASE_URL"),
    AuthToken: os.Getenv("SI_AUTH_TOKEN"),
})

// API key only
client := si.NewClient(si.Config{
    BaseURL: os.Getenv("SI_BASE_URL"),
    APIKey:  os.Getenv("SI_API_KEY"),
})

// Both
client := si.NewClient(si.Config{
    BaseURL:   os.Getenv("SI_BASE_URL"),
    AuthToken: os.Getenv("SI_AUTH_TOKEN"),
    APIKey:    os.Getenv("SI_API_KEY"),
})
```

## Go API Methods

All Go SDK methods accept a `context.Context` as the first parameter for cancellation and timeout control.

### Analysis

#### `AnalyzeSync(ctx context.Context, findings []map[string]interface{}) (map[string]interface{}, error)`

Synchronous blocking analysis.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ctx` | `context.Context` | Yes | Context for cancellation/timeout |
| `findings` | `[]map[string]interface{}` | Yes | Slice of finding maps |

**Returns:** `(map[string]interface{}, error)` — the full report or an error.

> **Note:** The Go SDK only provides `AnalyzeSync` (no async `Analyze`). For async analysis, use the TypeScript or Python SDK.

---

### Reports

#### `GetReport(ctx context.Context, reportID string) (map[string]interface{}, error)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ctx` | `context.Context` | Yes | Context |
| `reportID` | `string` | Yes | Report ID |

---

#### `ListReports(ctx context.Context, limit, offset int) (map[string]interface{}, error)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ctx` | `context.Context` | Yes | Context |
| `limit` | `int` | Yes | Maximum results |
| `offset` | `int` | Yes | Results to skip |

---

#### `DeleteReport(ctx context.Context, reportID string) error`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ctx` | `context.Context` | Yes | Context |
| `reportID` | `string` | Yes | Report ID |

**Returns:** `error` only (no response body).

---

### Findings

#### `ListFindings(ctx context.Context, reportID string, limit, offset int) (map[string]interface{}, error)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ctx` | `context.Context` | Yes | Context |
| `reportID` | `string` | Yes | Report ID |
| `limit` | `int` | Yes | Maximum results |
| `offset` | `int` | Yes | Results to skip |

---

### Risk

| Method | Signature | Description |
|--------|-----------|-------------|
| `ListRisks` | `(ctx, reportID string) (map[string]interface{}, error)` | List risks for a report |
| `GetRiskSummary` | `(ctx, reportID string) (map[string]interface{}, error)` | Get risk summary for a report |

---

### Attack Paths

| Method | Signature | Description |
|--------|-----------|-------------|
| `ListAttackPaths` | `(ctx, reportID string) (map[string]interface{}, error)` | List attack paths for a report |

---

### Recommendations

| Method | Signature | Description |
|--------|-----------|-------------|
| `ListRecommendations` | `(ctx, reportID string) (map[string]interface{}, error)` | List recommendations for a report |

---

### Health

| Method | Signature | Description |
|--------|-----------|-------------|
| `GetHealth` | `(ctx) (map[string]interface{}, error)` | Check platform health |

---

### Snapshots

| Method | Signature | Description |
|--------|-----------|-------------|
| `CreateSnapshot` | `(ctx, reportID string, description string) (map[string]interface{}, error)` | Create a report snapshot |

> **Note:** The Go SDK does **not** include `RestoreSnapshot`. Use the TypeScript or Python SDK for snapshot restoration.

---

## Go Error Handling

All Go SDK methods return `error`, which may be:

1. **`*ApiError`** — API-level errors with `StatusCode` and `Message` fields:

```go
type ApiError struct {
    StatusCode int
    Message    string
}

func (e *ApiError) Error() string {
    return fmt.Sprintf("API Error %d: %s", e.StatusCode, e.Message)
}
```

2. **Standard `error`** — Network errors, context cancellation, JSON unmarshaling failures.

```go
result, err := client.GetReport(ctx, "report-abc-123")
if err != nil {
    var apiErr *si.ApiError
    if errors.As(err, &apiErr) {
        log.Printf("API Error %d: %s", apiErr.StatusCode, apiErr.Message)
    } else {
        log.Printf("Network/transport error: %v", err)
    }
    return
}
```

## Go Code Examples

### Example 1: Basic Client Setup and Health Check

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    si "github.com/Ksander215/sec-scanner-workspace/sdk/go"
)

func main() {
    client := si.NewClient(si.Config{
        BaseURL:   os.Getenv("SI_BASE_URL"),
        AuthToken: os.Getenv("SI_AUTH_TOKEN"),
        APIKey:    os.Getenv("SI_API_KEY"),
        Timeout:   30 * time.Second,
    })

    health, err := client.GetHealth(context.Background())
    if err != nil {
        log.Fatalf("Health check failed: %v", err)
    }
    fmt.Printf("Platform status: %v (v%v)\n", health["status"], health["version"])
    fmt.Printf("Uptime: %vs\n", health["uptime"])
}
```

### Example 2: Synchronous Analysis

```go
findings := []map[string]interface{}{
    {
        "id":          "f-001",
        "source":      "trivy",
        "sourceId":    "trivy-2024-001",
        "name":        "CVE-2024-1234 in openssl",
        "description": "Critical vulnerability in OpenSSL 3.1.x",
        "severity":    "critical",
        "host":        "web-server-01",
        "port":        443,
        "timestamp":   "2024-01-15T10:30:00Z",
    },
}

report, err := client.AnalyzeSync(context.Background(), findings)
if err != nil {
    log.Fatalf("Analysis failed: %v", err)
}
fmt.Printf("Report ID: %v\n", report["id"])
fmt.Printf("Findings: %v\n", len(report["findings"].([]interface{})))
```

### Example 3: Paginated Report Listing

```go
func listAllReports(client *si.Client) error {
    ctx := context.Background()
    offset := 0
    limit := 50

    for {
        result, err := client.ListReports(ctx, limit, offset)
        if err != nil {
            return fmt.Errorf("listing reports: %w", err)
        }

        data, ok := result["data"].([]interface{})
        if !ok {
            break
        }

        for _, r := range data {
            report := r.(map[string]interface{})
            fmt.Printf("Report %v: %v findings\n",
                report["id"], report["findingsCount"])
        }

        total, _ := result["total"].(float64)
        if offset+limit >= int(total) {
            break
        }
        offset += limit
    }
    return nil
}
```

### Example 4: Context Timeout and Error Handling

```go
func getRiskWithTimeout(client *si.Client, reportID string) {
    // 10-second timeout for this specific call
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    summary, err := client.GetRiskSummary(ctx, reportID)
    if err != nil {
        var apiErr *si.ApiError
        if errors.As(err, &apiErr) {
            switch apiErr.StatusCode {
            case 401:
                log.Println("Authentication failed — check credentials")
            case 404:
                log.Printf("Report %s not found", reportID)
            default:
                log.Printf("API Error %d: %s", apiErr.StatusCode, apiErr.Message)
            }
        } else if ctx.Err() == context.DeadlineExceeded {
            log.Println("Request timed out")
        } else {
            log.Printf("Unexpected error: %v", err)
        }
        return
    }

    fmt.Printf("Risk summary: %+v\n", summary)
}
```

### Example 5: Snapshot and Recommendation Workflow

```go
// Create snapshot
snapshot, err := client.CreateSnapshot(ctx, "report-abc-123", "Pre-remediation baseline")
if err != nil {
    log.Fatalf("Failed to create snapshot: %v", err)
}
fmt.Printf("Snapshot created: %v\n", snapshot["snapshotId"])

// List recommendations
recs, err := client.ListRecommendations(ctx, "report-abc-123")
if err != nil {
    log.Fatalf("Failed to list recommendations: %v", err)
}
if data, ok := recs["data"].([]interface{}); ok {
    for _, r := range data {
        rec := r.(map[string]interface{})
        fmt.Printf("[%v] %v — risk reduction: %.0f%%\n",
            rec["priority"], rec["title"], rec["estimatedRiskReduction"])
    }
}
```

### Example 6: Attack Path Analysis

```go
paths, err := client.ListAttackPaths(ctx, "report-abc-123")
if err != nil {
    log.Fatalf("Failed to list attack paths: %v", err)
}

if data, ok := paths["data"].([]interface{}); ok {
    fmt.Printf("Found %d attack paths\n", len(data))
    for _, p := range data {
        path := p.(map[string]interface{})
        fmt.Printf("  Path: %s (steps: %.0f, risk: %.1f, exploitability: %.1f)\n",
            path["name"], path["stepsCount"], path["totalRiskScore"], path["exploitability"])
    }
}
```

---

# Feature Parity Matrix

| Method | TypeScript | Python | Go |
|--------|:----------:|:------:|:--:|
| `analyze` (async) | Yes | Yes | — |
| `analyzeSync` | Yes | Yes | Yes |
| `listReports` | Yes | Yes | Yes |
| `getReport` | Yes | Yes | Yes |
| `getReportSummary` | Yes | — | — |
| `deleteReport` | Yes | Yes | Yes |
| `listFindings` | Yes | Yes | Yes |
| `getFinding` | Yes | — | — |
| `searchFindings` | Yes | Yes | — |
| `listRisks` | Yes | Yes | Yes |
| `getRiskSummary` | Yes | Yes | Yes |
| `getTopRisks` | Yes | Yes | — |
| `listAttackPaths` | Yes | Yes | Yes |
| `getAttackGraph` | Yes | — | — |
| `listRecommendations` | Yes | Yes | Yes |
| `createRemediationPlan` | Yes | Yes | — |
| `listExplanations` | Yes | Yes | — |
| `getExplanation` | Yes | Yes | — |
| `getHealth` | Yes | Yes | Yes |
| `createSnapshot` | Yes | Yes | Yes |
| `restoreSnapshot` | Yes | Yes | — |
| **Total methods** | **20** | **18** | **11** |

---

# Streaming Analysis

The `analyze` method is designed for asynchronous workflows. Here is the recommended pattern for polling the analysis status:

### TypeScript

```typescript
async function waitForReport(runId: string, pollIntervalMs = 2000): Promise<SecurityIntelligenceReport> {
  while (true) {
    try {
      const report = await client.getReport(runId);
      return report;
    } catch (err) {
      if (err instanceof SiApiError && err.statusCode === 404) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      }
      throw err;
    }
  }
}

// Usage
const { runId } = await client.analyze({ findings, options: { persist: true } });
const report = await waitForReport(runId);
```

### Python

```python
import time

def wait_for_report(run_id: str, poll_interval: float = 2.0) -> dict:
    while True:
        try:
            return client.get_report(run_id)
        except SiApiError as e:
            if e.status_code == 404:
                time.sleep(poll_interval)
                continue
            raise

# Usage
response = client.analyze(findings, persist=True)
report = wait_for_report(response['runId'])
```

### Go

The Go SDK does not provide an async `Analyze` method. Use `AnalyzeSync` for synchronous analysis, or implement a custom polling loop using `GetReport` with a `time.Ticker`.
