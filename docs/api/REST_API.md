# Security Scanner REST API Documentation

**Version**: 1.0.0  
**Base URL**: `http://localhost:3000`  
**Protocol**: HTTPS recommended for production

---

## Table of Contents

- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Data Transfer Objects (DTOs)](#data-transfer-objects-dtos)
- [Analysis Endpoints](#analysis-endpoints)
- [Report Endpoints](#report-endpoints)
- [Finding Endpoints](#finding-endpoints)
- [Risk Endpoints](#risk-endpoints)
- [Attack Path Endpoints](#attack-path-endpoints)
- [Correlation Endpoints](#correlation-endpoints)
- [Recommendation Endpoints](#recommendation-endpoints)
- [Explanation Endpoints](#explanation-endpoints)
- [Snapshot Endpoints](#snapshot-endpoints)
- [Storage Endpoints](#storage-endpoints)
- [Health & Observability Endpoints](#health--observability-endpoints)
- [Rate Limiting](#rate-limiting)
- [Changelog](#changelog)

---

## Authentication

Authentication is **configurable but not enforced by default**. When enabled, the API supports two authentication methods:

### Bearer Token Authentication

Include a JWT or opaque token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### API Key Authentication

Include a pre-shared key in the `X-API-Key` header:

```
X-API-Key: <your-api-key>
```

Both methods can be used interchangeably. If authentication is enabled and no valid credential is provided, the API returns:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "statusCode": 401
  }
}
```

---

## Error Handling

All errors follow a consistent `ErrorResponseDTO` schema:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "statusCode": 400,
    "details": {}
  }
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request body or parameters are invalid |
| 401 | `UNAUTHORIZED` | Authentication required or failed |
| 404 | `NOT_FOUND` | Requested resource does not exist |
| 409 | `CONFLICT` | Resource state conflict |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Data Transfer Objects (DTOs)

### AnalyzeRequestDTO

```typescript
interface AnalyzeRequestDTO {
  findings: RawFinding[];
  options?: {
    persist?: boolean;              // Save the report to storage (default: true)
    explain?: boolean;              // Generate explanations (default: false)
    includeAttackPaths?: boolean;   // Compute attack paths (default: false)
    includeImpact?: boolean;        // Compute impact analysis (default: false)
  };
}

interface RawFinding {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  resource?: string;
  location?: string;
  evidence?: Record<string, unknown>;
  tags?: string[];
  source?: string;
  timestamp?: string;              // ISO 8601
}
```

### AnalyzeResponseDTO

```typescript
interface AnalyzeResponseDTO {
  runId: string;                   // UUID
  status: "accepted";
  message: string;
  statusUrl: string;               // Poll URL for async status
}
```

### ReportDTO

```typescript
interface ReportDTO {
  id: string;                      // UUID
  createdAt: string;               // ISO 8601 datetime
  updatedAt: string;               // ISO 8601 datetime
  findingCount: number;
  riskScore: number;
  status: "pending" | "processing" | "completed" | "failed";
  summary?: string;
  metadata?: Record<string, unknown>;
}
```

### SecurityIntelligenceReport

```typescript
interface SecurityIntelligenceReport {
  id: string;                      // UUID
  createdAt: string;               // ISO 8601 datetime
  updatedAt: string;               // ISO 8601 datetime
  findings: FindingDTO[];
  risks: RiskDTO[];
  correlations: CorrelationDTO[];
  attackPaths?: AttackPathDTO[];
  recommendations?: RecommendationDTO[];
  explanations?: ExplanationDTO[];
  riskScore: number;
  status: "pending" | "processing" | "completed" | "failed";
  metadata?: Record<string, unknown>;
}
```

### ReportSummary

```typescript
interface ReportSummary {
  reportId: string;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  riskScore: number;
  topCategories: Array<{
    category: string;
    count: number;
  }>;
  topAffectedResources: Array<{
    resource: string;
    count: number;
  }>;
  generatedAt: string;             // ISO 8601 datetime
}
```

### FindingDTO

```typescript
interface FindingDTO {
  id: string;                      // UUID
  reportId: string;                // UUID
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  resource?: string;
  location?: string;
  evidence?: Record<string, unknown>;
  tags?: string[];
  source?: string;
  status?: "open" | "acknowledged" | "remediated" | "false_positive";
  riskScore?: number;
  correlatedFindings?: string[];   // UUIDs of correlated findings
  createdAt: string;               // ISO 8601 datetime
  updatedAt: string;               // ISO 8601 datetime
}
```

### RiskDTO

```typescript
interface RiskDTO {
  id: string;                      // UUID
  reportId: string;                // UUID
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  likelihood: number;              // 0.0 - 1.0
  impact: number;                  // 0.0 - 1.0
  riskScore: number;               // 0.0 - 10.0
  category: string;
  affectedResources: string[];
  relatedFindings: string[];       // UUIDs
  mitigations?: string[];
  createdAt: string;               // ISO 8601 datetime
}
```

### RiskSummaryDTO

```typescript
interface RiskSummaryDTO {
  reportId: string;
  totalRisks: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  averageRiskScore: number;
  maxRiskScore: number;
  topCategories: Array<{
    category: string;
    count: number;
    averageScore: number;
  }>;
}
```

### AttackPathDTO

```typescript
interface AttackPathDTO {
  id: string;                      // UUID
  reportId: string;                // UUID
  name: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  steps: AttackPathStep[];
  riskScore: number;
  entryPoint: string;
  target: string;
  createdAt: string;               // ISO 8601 datetime
}

interface AttackPathStep {
  index: number;
  findingId: string;               // UUID
  action: string;
  resource: string;
  description: string;
}
```

### AttackGraph

```typescript
interface AttackGraph {
  reportId: string;
  nodes: Array<{
    id: string;
    type: "finding" | "resource" | "entry_point" | "target";
    label: string;
    severity?: string;
  }>;
  edges: Array<{
    source: string;                // Node ID
    target: string;                // Node ID
    label?: string;
    weight?: number;
  }>;
  metadata?: Record<string, unknown>;
}
```

### CorrelationDTO

```typescript
interface CorrelationDTO {
  id: string;                      // UUID
  reportId: string;                // UUID
  type: string;                    // e.g., "causal", "temporal", "spatial"
  strength: number;                // 0.0 - 1.0
  findings: string[];              // UUIDs of correlated findings
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;               // ISO 8601 datetime
}
```

### CorrelationGroup

```typescript
interface CorrelationGroup {
  groupId: string;
  reportId: string;
  type: string;
  findingIds: string[];            // UUIDs
  commonAttributes: Record<string, unknown>;
  correlationCount: number;
}
```

### RecommendationDTO

```typescript
interface RecommendationDTO {
  id: string;                      // UUID
  reportId: string;                // UUID
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  affectedFindings: string[];      // UUIDs
  category: string;
  actions: string[];
  references?: string[];
  status?: "proposed" | "accepted" | "implemented" | "dismissed";
  createdAt: string;               // ISO 8601 datetime
}
```

### RemediationPlan

```typescript
interface RemediationPlan {
  reportId: string;
  generatedAt: string;             // ISO 8601 datetime
  phases: Array<{
    phase: number;
    name: string;
    description: string;
    recommendations: RecommendationDTO[];
    estimatedEffort: string;
    riskReduction: number;         // Percentage 0-100
  }>;
  totalRecommendations: number;
  estimatedTotalEffort: string;
  projectedRiskReduction: number;  // Percentage 0-100
}
```

### ExplanationDTO

```typescript
interface ExplanationDTO {
  id: string;                      // UUID
  targetId: string;                // UUID of the explained entity
  targetType: "finding" | "risk" | "attack_path" | "correlation";
  reportId: string;                // UUID
  summary: string;
  details: string;
  confidence: number;              // 0.0 - 1.0
  sources?: string[];
  createdAt: string;               // ISO 8601 datetime
}
```

### Snapshot

```typescript
interface Snapshot {
  id: string;                      // UUID
  reportId: string;                // UUID
  description?: string;
  createdAt: string;               // ISO 8601 datetime
  size: number;                    // Bytes
  findingCount: number;
  riskScore: number;
}
```

### StorageStatistics

```typescript
interface StorageStatistics {
  totalReports: number;
  totalFindings: number;
  totalSnapshots: number;
  storageUsedBytes: number;
  storageAvailableBytes: number;
  oldestReport: string;            // ISO 8601 datetime
  newestReport: string;            // ISO 8601 datetime
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
}
```

### HealthDTO

```typescript
interface HealthDTO {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;                  // Seconds
  components: {
    database: "connected" | "disconnected";
    storage: "available" | "unavailable";
    analyzer: "ready" | "busy" | "error";
  };
}
```

### PaginatedResponse\<T\>

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;                   // Total items across all pages
  limit: number;                   // Items per page
  offset: number;                  // Current offset
}
```

### ErrorResponseDTO

```typescript
interface ErrorResponseDTO {
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
  };
}
```

---

## Analysis Endpoints

### 1. POST /api/v1/analyze

Submit findings for asynchronous security analysis. Returns immediately with a run ID and status URL for polling.

**Authentication**: Optional (Bearer token or API key when enabled)

**Request Body**: `AnalyzeRequestDTO`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `findings` | `RawFinding[]` | Yes | — | Array of raw security findings to analyze |
| `options.persist` | `boolean` | No | `true` | Persist the generated report to storage |
| `options.explain` | `boolean` | No | `false` | Generate natural-language explanations |
| `options.includeAttackPaths` | `boolean` | No | `false` | Compute multi-step attack paths |
| `options.includeImpact` | `boolean` | No | `false` | Compute impact analysis |

**Success Response**: `202 Accepted`

```json
{
  "runId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "accepted",
  "message": "Analysis run accepted and queued for processing",
  "statusUrl": "/api/v1/reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | `findings` array is empty or missing, or contains invalid entries |
| 500 | `INTERNAL_ERROR` | Analysis engine failed to queue the run |

**curl Example**:

```bash
curl -X POST http://localhost:3000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "findings": [
      {
        "id": "f-001",
        "title": "SQL Injection in Login Form",
        "description": "User input is concatenated directly into SQL queries",
        "severity": "critical",
        "category": "injection",
        "resource": "auth-service",
        "location": "src/auth/login.ts:42",
        "tags": ["owasp-a1", "pci-dss"]
      }
    ],
    "options": {
      "persist": true,
      "explain": true,
      "includeAttackPaths": true,
      "includeImpact": true
    }
  }'
```

**TypeScript Example**:

```typescript
const response = await fetch("http://localhost:3000/api/v1/analyze", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    findings: [
      {
        id: "f-001",
        title: "SQL Injection in Login Form",
        description: "User input is concatenated directly into SQL queries",
        severity: "critical",
        category: "injection",
        resource: "auth-service",
        location: "src/auth/login.ts:42",
        tags: ["owasp-a1", "pci-dss"],
      },
    ],
    options: {
      persist: true,
      explain: true,
      includeAttackPaths: true,
      includeImpact: true,
    },
  }),
});

const result: AnalyzeResponseDTO = await response.json();
console.log(`Run ID: ${result.runId}, Status URL: ${result.statusUrl}`);
```

**Python Example**:

```python
import requests

response = requests.post(
    "http://localhost:3000/api/v1/analyze",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    },
    json={
        "findings": [
            {
                "id": "f-001",
                "title": "SQL Injection in Login Form",
                "description": "User input is concatenated directly into SQL queries",
                "severity": "critical",
                "category": "injection",
                "resource": "auth-service",
                "location": "src/auth/login.ts:42",
                "tags": ["owasp-a1", "pci-dss"],
            }
        ],
        "options": {
            "persist": True,
            "explain": True,
            "includeAttackPaths": True,
            "includeImpact": True,
        },
    },
)

result = response.json()
print(f"Run ID: {result['runId']}, Status URL: {result['statusUrl']}")
```

---

### 2. POST /api/v1/analyze/sync

Submit findings for **synchronous** security analysis. Blocks until the analysis is complete and returns the full report. Use for interactive tools; avoid for large finding sets.

**Authentication**: Optional (Bearer token or API key when enabled)

**Request Body**: Same as `POST /api/v1/analyze` — `AnalyzeRequestDTO`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `findings` | `RawFinding[]` | Yes | — | Array of raw security findings to analyze |
| `options.persist` | `boolean` | No | `true` | Persist the generated report to storage |
| `options.explain` | `boolean` | No | `false` | Generate natural-language explanations |
| `options.includeAttackPaths` | `boolean` | No | `false` | Compute multi-step attack paths |
| `options.includeImpact` | `boolean` | No | `false` | Compute impact analysis |

**Success Response**: `200 OK`

Returns a full `SecurityIntelligenceReport` object:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:05Z",
  "findings": [ /* FindingDTO[] */ ],
  "risks": [ /* RiskDTO[] */ ],
  "correlations": [ /* CorrelationDTO[] */ ],
  "attackPaths": [ /* AttackPathDTO[] */ ],
  "recommendations": [ /* RecommendationDTO[] */ ],
  "explanations": [ /* ExplanationDTO[] */ ],
  "riskScore": 8.5,
  "status": "completed",
  "metadata": {}
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | `findings` array is empty or missing |
| 500 | `INTERNAL_ERROR` | Analysis engine failure |

**curl Example**:

```bash
curl -X POST http://localhost:3000/api/v1/analyze/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "findings": [
      {
        "id": "f-001",
        "title": "Exposed S3 Bucket",
        "description": "S3 bucket allows public read access",
        "severity": "high",
        "category": "misconfiguration",
        "resource": "s3://prod-data-bucket"
      }
    ],
    "options": {
      "persist": true,
      "explain": false
    }
  }'
```

**TypeScript Example**:

```typescript
const response = await fetch("http://localhost:3000/api/v1/analyze/sync", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    findings: [
      {
        id: "f-001",
        title: "Exposed S3 Bucket",
        description: "S3 bucket allows public read access",
        severity: "high",
        category: "misconfiguration",
        resource: "s3://prod-data-bucket",
      },
    ],
    options: { persist: true, explain: false },
  }),
});

const report: SecurityIntelligenceReport = await response.json();
console.log(`Report ID: ${report.id}, Risk Score: ${report.riskScore}`);
```

**Python Example**:

```python
import requests

response = requests.post(
    "http://localhost:3000/api/v1/analyze/sync",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    },
    json={
        "findings": [
            {
                "id": "f-001",
                "title": "Exposed S3 Bucket",
                "description": "S3 bucket allows public read access",
                "severity": "high",
                "category": "misconfiguration",
                "resource": "s3://prod-data-bucket",
            }
        ],
        "options": {"persist": True, "explain": False},
    },
)

report = response.json()
print(f"Report ID: {report['id']}, Risk Score: {report['riskScore']}")
```

---

## Report Endpoints

### 3. GET /api/v1/reports

List all persisted reports with pagination.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | `integer` | No | `100` | Maximum number of reports to return |
| `offset` | `integer` | No | `0` | Number of reports to skip |

**Success Response**: `200 OK`

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:05Z",
      "findingCount": 42,
      "riskScore": 8.5,
      "status": "completed",
      "summary": "...",
      "metadata": {}
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `limit` or `offset` values |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/reports?limit=50&offset=0" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const limit = 50;
const offset = 0;
const response = await fetch(
  `http://localhost:3000/api/v1/reports?limit=${limit}&offset=${offset}`,
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);

const result: PaginatedResponse<ReportDTO> = await response.json();
console.log(`Total reports: ${result.total}, Page size: ${result.data.length}`);
```

**Python Example**:

```python
import requests

response = requests.get(
    "http://localhost:3000/api/v1/reports",
    params={"limit": 50, "offset": 0},
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
print(f"Total reports: {result['total']}, Page size: {len(result['data'])}")
```

---

### 4. GET /api/v1/reports/:id

Retrieve a full security intelligence report by ID.

**Authentication**: Optional (Bearer token or API key when enabled)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (UUID)` | Yes | The report ID |

**Success Response**: `200 OK`

Returns a `SecurityIntelligenceReport` object (see DTO section).

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | Report with the given ID does not exist |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/reports/${reportId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

if (response.ok) {
  const report: SecurityIntelligenceReport = await response.json();
  console.log(`Findings: ${report.findings.length}, Risk: ${report.riskScore}`);
} else if (response.status === 404) {
  console.error("Report not found");
}
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.get(
    f"http://localhost:3000/api/v1/reports/{report_id}",
    headers={"Authorization": f"Bearer {token}"},
)

if response.ok:
    report = response.json()
    print(f"Findings: {len(report['findings'])}, Risk: {report['riskScore']}")
elif response.status_code == 404:
    print("Report not found")
```

---

### 5. GET /api/v1/reports/:id/summary

Retrieve a condensed summary of a report, including severity counts and top categories.

**Authentication**: Optional (Bearer token or API key when enabled)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (UUID)` | Yes | The report ID |

**Success Response**: `200 OK`

Returns a `ReportSummary` object:

```json
{
  "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "totalFindings": 42,
  "criticalCount": 3,
  "highCount": 10,
  "mediumCount": 18,
  "lowCount": 8,
  "infoCount": 3,
  "riskScore": 8.5,
  "topCategories": [
    { "category": "injection", "count": 12 },
    { "category": "misconfiguration", "count": 8 }
  ],
  "topAffectedResources": [
    { "resource": "auth-service", "count": 7 },
    { "resource": "api-gateway", "count": 5 }
  ],
  "generatedAt": "2025-01-15T10:30:05Z"
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | Report with the given ID does not exist |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890/summary" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/reports/${reportId}/summary`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const summary: ReportSummary = await response.json();
console.log(`Critical: ${summary.criticalCount}, High: ${summary.highCount}`);
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.get(
    f"http://localhost:3000/api/v1/reports/{report_id}/summary",
    headers={"Authorization": f"Bearer {token}"},
)

summary = response.json()
print(f"Critical: {summary['criticalCount']}, High: {summary['highCount']}")
```

---

### 6. DELETE /api/v1/reports/:id

Delete a report and all associated data (findings, risks, correlations, attack paths, recommendations, explanations).

**Authentication**: Optional (Bearer token or API key when enabled)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (UUID)` | Yes | The report ID |

**Success Response**: `200 OK`

```json
{
  "deleted": true
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | Report with the given ID does not exist |
| 500 | `INTERNAL_ERROR` | Database or storage failure during deletion |

**curl Example**:

```bash
curl -X DELETE "http://localhost:3000/api/v1/reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/reports/${reportId}`,
  {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }
);

const result = await response.json();
console.log(`Deleted: ${result.deleted}`);
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.delete(
    f"http://localhost:3000/api/v1/reports/{report_id}",
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
print(f"Deleted: {result['deleted']}")
```

---

## Finding Endpoints

### 7. GET /api/v1/findings

List findings with optional report filtering and pagination.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `reportId` | `string (UUID)` | No | — | Filter findings by report ID |
| `limit` | `integer` | No | `100` | Maximum number of findings to return |
| `offset` | `integer` | No | `0` | Number of findings to skip |

**Success Response**: `200 OK`

```json
{
  "data": [ /* FindingDTO[] */ ],
  "total": 250,
  "limit": 100,
  "offset": 0
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `limit`, `offset`, or `reportId` |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/findings?reportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890&limit=50&offset=0" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const params = new URLSearchParams({
  reportId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  limit: "50",
  offset: "0",
});

const response = await fetch(
  `http://localhost:3000/api/v1/findings?${params}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const result: PaginatedResponse<FindingDTO> = await response.json();
console.log(`Total findings: ${result.total}`);
```

**Python Example**:

```python
import requests

response = requests.get(
    "http://localhost:3000/api/v1/findings",
    params={
        "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "limit": 50,
        "offset": 0,
    },
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
print(f"Total findings: {result['total']}")
```

---

### 8. GET /api/v1/findings/:id

Retrieve a single finding by ID.

**Authentication**: Optional (Bearer token or API key when enabled)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (UUID)` | Yes | The finding ID |

**Success Response**: `200 OK`

Returns a `FindingDTO` object:

```json
{
  "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
  "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "SQL Injection in Login Form",
  "description": "User input is concatenated directly into SQL queries",
  "severity": "critical",
  "category": "injection",
  "resource": "auth-service",
  "location": "src/auth/login.ts:42",
  "evidence": { "param": "username", "payload": "' OR 1=1 --" },
  "tags": ["owasp-a1", "pci-dss"],
  "source": "sast-scanner",
  "status": "open",
  "riskScore": 9.2,
  "correlatedFindings": ["c3d4e5f6-a7b8-9012-cdef-345678901234"],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:05Z"
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | Finding with the given ID does not exist |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/findings/f1e2d3c4-b5a6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const findingId = "f1e2d3c4-b5a6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/findings/${findingId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

if (response.ok) {
  const finding: FindingDTO = await response.json();
  console.log(`${finding.title} [${finding.severity}]`);
}
```

**Python Example**:

```python
import requests

finding_id = "f1e2d3c4-b5a6-7890-abcd-ef1234567890"
response = requests.get(
    f"http://localhost:3000/api/v1/findings/{finding_id}",
    headers={"Authorization": f"Bearer {token}"},
)

if response.ok:
    finding = response.json()
    print(f"{finding['title']} [{finding['severity']}]")
```

---

### 9. GET /api/v1/findings/search

Full-text search across findings.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | `string` | Yes | — | Search query (searches title, description, category, resource) |
| `limit` | `integer` | No | `100` | Maximum number of findings to return |
| `offset` | `integer` | No | `0` | Number of findings to skip |

**Success Response**: `200 OK`

```json
{
  "data": [ /* FindingDTO[] */ ],
  "total": 15,
  "limit": 100,
  "offset": 0
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or empty `q` parameter, or invalid pagination |
| 500 | `INTERNAL_ERROR` | Search engine failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/findings/search?q=injection&limit=20&offset=0" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const query = "injection";
const response = await fetch(
  `http://localhost:3000/api/v1/findings/search?q=${encodeURIComponent(query)}&limit=20`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const result: PaginatedResponse<FindingDTO> = await response.json();
console.log(`Found ${result.total} matching findings`);
```

**Python Example**:

```python
import requests
from urllib.parse import quote

query = "injection"
response = requests.get(
    "http://localhost:3000/api/v1/findings/search",
    params={"q": query, "limit": 20, "offset": 0},
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
print(f"Found {result['total']} matching findings")
```

---

## Risk Endpoints

### 10. GET /api/v1/risks

List computed risks, optionally filtered by report.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `reportId` | `string (UUID)` | No | — | Filter risks by report ID |

**Success Response**: `200 OK`

```json
{
  "data": [ /* RiskDTO[] */ ],
  "total": 12
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `reportId` format |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/risks?reportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/risks?reportId=${reportId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const result = await response.json();
console.log(`Total risks: ${result.total}`);
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.get(
    "http://localhost:3000/api/v1/risks",
    params={"reportId": report_id},
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
print(f"Total risks: {result['total']}")
```

---

### 11. GET /api/v1/risks/summary

Retrieve an aggregated risk summary for a report.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `reportId` | `string (UUID)` | No | — | Filter risk summary by report ID |

**Success Response**: `200 OK`

Returns a `RiskSummaryDTO` object:

```json
{
  "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "totalRisks": 12,
  "criticalCount": 2,
  "highCount": 4,
  "mediumCount": 4,
  "lowCount": 2,
  "averageRiskScore": 6.8,
  "maxRiskScore": 9.5,
  "topCategories": [
    { "category": "injection", "count": 4, "averageScore": 8.2 },
    { "category": "authentication", "count": 3, "averageScore": 7.1 }
  ]
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `reportId` format |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/risks/summary?reportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/risks/summary?reportId=${reportId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const summary: RiskSummaryDTO = await response.json();
console.log(`Avg risk: ${summary.averageRiskScore}, Max: ${summary.maxRiskScore}`);
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.get(
    "http://localhost:3000/api/v1/risks/summary",
    params={"reportId": report_id},
    headers={"Authorization": f"Bearer {token}"},
)

summary = response.json()
print(f"Avg risk: {summary['averageRiskScore']}, Max: {summary['maxRiskScore']}")
```

---

### 12. GET /api/v1/risks/top

Retrieve the top-scoring risks across all reports or a specific report.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | `integer` | No | `10` | Number of top risks to return |

**Success Response**: `200 OK`

```json
{
  "data": [ /* RiskDTO[] — sorted by riskScore descending */ ]
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `limit` value |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/risks/top?limit=5" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const response = await fetch(
  "http://localhost:3000/api/v1/risks/top?limit=5",
  { headers: { Authorization: `Bearer ${token}` } }
);

const result = await response.json();
result.data.forEach((risk: RiskDTO) => {
  console.log(`${risk.title}: ${risk.riskScore}/10`);
});
```

**Python Example**:

```python
import requests

response = requests.get(
    "http://localhost:3000/api/v1/risks/top",
    params={"limit": 5},
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
for risk in result["data"]:
    print(f"{risk['title']}: {risk['riskScore']}/10")
```

---

## Attack Path Endpoints

### 13. GET /api/v1/attack-paths

List computed attack paths, optionally filtered by report.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `reportId` | `string (UUID)` | No | — | Filter attack paths by report ID |

**Success Response**: `200 OK`

```json
{
  "data": [ /* AttackPathDTO[] */ ],
  "total": 3
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `reportId` format |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/attack-paths?reportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/attack-paths?reportId=${reportId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const result = await response.json();
result.data.forEach((path: AttackPathDTO) => {
  console.log(`${path.name}: ${path.steps.length} steps, entry=${path.entryPoint}`);
});
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.get(
    "http://localhost:3000/api/v1/attack-paths",
    params={"reportId": report_id},
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
for path in result["data"]:
    print(f"{path['name']}: {len(path['steps'])} steps, entry={path['entryPoint']}")
```

---

### 14. GET /api/v1/attack-paths/graph

Retrieve the attack graph as a node-edge structure suitable for visualization.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `reportId` | `string (UUID)` | No | — | Filter attack graph by report ID |

**Success Response**: `200 OK`

Returns an `AttackGraph` object:

```json
{
  "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "nodes": [
    { "id": "n1", "type": "entry_point", "label": "Public API Endpoint", "severity": "high" },
    { "id": "n2", "type": "finding", "label": "SQL Injection", "severity": "critical" },
    { "id": "n3", "type": "target", "label": "Customer Database", "severity": "critical" }
  ],
  "edges": [
    { "source": "n1", "target": "n2", "label": "exploits", "weight": 0.9 },
    { "source": "n2", "target": "n3", "label": "accesses", "weight": 0.85 }
  ],
  "metadata": {}
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `reportId` format |
| 500 | `INTERNAL_ERROR` | Graph computation failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/attack-paths/graph?reportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/attack-paths/graph?reportId=${reportId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const graph: AttackGraph = await response.json();
console.log(`Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.get(
    "http://localhost:3000/api/v1/attack-paths/graph",
    params={"reportId": report_id},
    headers={"Authorization": f"Bearer {token}"},
)

graph = response.json()
print(f"Nodes: {len(graph['nodes'])}, Edges: {len(graph['edges'])}")
```

---

## Correlation Endpoints

### 15. GET /api/v1/correlations

List finding correlations, optionally filtered by report.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `reportId` | `string (UUID)` | No | — | Filter correlations by report ID |

**Success Response**: `200 OK`

```json
{
  "data": [ /* CorrelationDTO[] */ ],
  "total": 8
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `reportId` format |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/correlations?reportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/correlations?reportId=${reportId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const result = await response.json();
result.data.forEach((c: CorrelationDTO) => {
  console.log(`${c.type}: strength=${c.strength}, findings=${c.findings.length}`);
});
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.get(
    "http://localhost:3000/api/v1/correlations",
    params={"reportId": report_id},
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
for c in result["data"]:
    print(f"{c['type']}: strength={c['strength']}, findings={len(c['findings'])}")
```

---

### 16. GET /api/v1/correlations/groups

List correlation groups — clusters of related findings grouped by common attributes.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `reportId` | `string (UUID)` | No | — | Filter correlation groups by report ID |

**Success Response**: `200 OK`

```json
{
  "data": [
    {
      "groupId": "g1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "type": "causal",
      "findingIds": [
        "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
        "c3d4e5f6-a7b8-9012-cdef-345678901234"
      ],
      "commonAttributes": { "category": "injection", "resource": "auth-service" },
      "correlationCount": 2
    }
  ],
  "total": 4
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `reportId` format |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/correlations/groups?reportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/correlations/groups?reportId=${reportId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const result = await response.json();
result.data.forEach((group: CorrelationGroup) => {
  console.log(`Group ${group.groupId}: ${group.findingIds.length} findings (${group.type})`);
});
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.get(
    "http://localhost:3000/api/v1/correlations/groups",
    params={"reportId": report_id},
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
for group in result["data"]:
    print(f"Group {group['groupId']}: {len(group['findingIds'])} findings ({group['type']})")
```

---

## Recommendation Endpoints

### 17. GET /api/v1/recommendations

List remediation recommendations, optionally filtered by report.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `reportId` | `string (UUID)` | No | — | Filter recommendations by report ID |

**Success Response**: `200 OK`

```json
{
  "data": [ /* RecommendationDTO[] */ ],
  "total": 6
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `reportId` format |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/recommendations?reportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/recommendations?reportId=${reportId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const result = await response.json();
result.data.forEach((rec: RecommendationDTO) => {
  console.log(`[${rec.priority}] ${rec.title} — effort: ${rec.effort}`);
});
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.get(
    "http://localhost:3000/api/v1/recommendations",
    params={"reportId": report_id},
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
for rec in result["data"]:
    print(f"[{rec['priority']}] {rec['title']} — effort: {rec['effort']}")
```

---

### 18. POST /api/v1/recommendations/plan

Generate a phased remediation plan for a report. Recommendations are organized into sequential phases based on priority, effort, and risk reduction.

**Authentication**: Optional (Bearer token or API key when enabled)

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reportId` | `string (UUID)` | Yes | The report ID to generate a plan for |

**Success Response**: `200 OK`

Returns a `RemediationPlan` object:

```json
{
  "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "generatedAt": "2025-01-15T10:35:00Z",
  "phases": [
    {
      "phase": 1,
      "name": "Critical Fixes",
      "description": "Address critical-severity findings immediately",
      "recommendations": [ /* RecommendationDTO[] */ ],
      "estimatedEffort": "2-3 days",
      "riskReduction": 45
    },
    {
      "phase": 2,
      "name": "High Priority Remediation",
      "description": "Resolve high-severity vulnerabilities",
      "recommendations": [ /* RecommendationDTO[] */ ],
      "estimatedEffort": "1-2 weeks",
      "riskReduction": 30
    }
  ],
  "totalRecommendations": 6,
  "estimatedTotalEffort": "2-3 weeks",
  "projectedRiskReduction": 75
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `reportId` |
| 404 | `NOT_FOUND` | Report with the given ID does not exist |
| 500 | `INTERNAL_ERROR` | Plan generation failure |

**curl Example**:

```bash
curl -X POST http://localhost:3000/api/v1/recommendations/plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  "http://localhost:3000/api/v1/recommendations/plan",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reportId }),
  }
);

const plan: RemediationPlan = await response.json();
console.log(`Phases: ${plan.phases.length}, Risk reduction: ${plan.projectedRiskReduction}%`);
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.post(
    "http://localhost:3000/api/v1/recommendations/plan",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    },
    json={"reportId": report_id},
)

plan = response.json()
print(f"Phases: {len(plan['phases'])}, Risk reduction: {plan['projectedRiskReduction']}%")
```

---

## Explanation Endpoints

### 19. GET /api/v1/explanations

List generated explanations, optionally filtered by report.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `reportId` | `string (UUID)` | No | — | Filter explanations by report ID |

**Success Response**: `200 OK`

```json
{
  "data": [ /* ExplanationDTO[] */ ],
  "total": 5
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `reportId` format |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/explanations?reportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/explanations?reportId=${reportId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const result = await response.json();
result.data.forEach((exp: ExplanationDTO) => {
  console.log(`${exp.targetType}:${exp.targetId} — confidence: ${exp.confidence}`);
});
```

**Python Example**:

```python
import requests

report_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
response = requests.get(
    "http://localhost:3000/api/v1/explanations",
    params={"reportId": report_id},
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
for exp in result["data"]:
    print(f"{exp['targetType']}:{exp['targetId']} — confidence: {exp['confidence']}")
```

---

### 20. GET /api/v1/explanations/:targetId

Retrieve a detailed explanation for a specific entity (finding, risk, attack path, or correlation).

**Authentication**: Optional (Bearer token or API key when enabled)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `targetId` | `string (UUID)` | Yes | The ID of the entity to explain |

**Success Response**: `200 OK`

Returns an `Explanation` object:

```json
{
  "id": "e1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "targetId": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
  "targetType": "finding",
  "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "summary": "This finding indicates a critical SQL injection vulnerability...",
  "details": "The login form at src/auth/login.ts:42 concatenates user-supplied input directly into a SQL query without parameterization. An attacker can inject arbitrary SQL commands...",
  "confidence": 0.95,
  "sources": ["CWE-89", "OWASP A03:2021"],
  "createdAt": "2025-01-15T10:30:05Z"
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | No explanation exists for the given target ID |
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/explanations/f1e2d3c4-b5a6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const targetId = "f1e2d3c4-b5a6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/explanations/${targetId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

if (response.ok) {
  const explanation: ExplanationDTO = await response.json();
  console.log(`Summary: ${explanation.summary}`);
  console.log(`Confidence: ${(explanation.confidence * 100).toFixed(1)}%`);
}
```

**Python Example**:

```python
import requests

target_id = "f1e2d3c4-b5a6-7890-abcd-ef1234567890"
response = requests.get(
    f"http://localhost:3000/api/v1/explanations/{target_id}",
    headers={"Authorization": f"Bearer {token}"},
)

if response.ok:
    explanation = response.json()
    print(f"Summary: {explanation['summary']}")
    print(f"Confidence: {explanation['confidence'] * 100:.1f}%")
```

---

## Snapshot Endpoints

### 21. POST /api/v1/snapshots

Create a point-in-time snapshot of a report. Snapshots capture the full report state and can be restored later.

**Authentication**: Optional (Bearer token or API key when enabled)

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reportId` | `string (UUID)` | Yes | The report ID to snapshot |
| `description` | `string` | No | Optional description for the snapshot |

**Success Response**: `201 Created`

```json
{
  "snapshotId": "s1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `reportId` |
| 404 | `NOT_FOUND` | Report with the given ID does not exist |
| 500 | `INTERNAL_ERROR` | Snapshot creation failure |

**curl Example**:

```bash
curl -X POST http://localhost:3000/api/v1/snapshots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "description": "Pre-remediation baseline"
  }'
```

**TypeScript Example**:

```typescript
const response = await fetch("http://localhost:3000/api/v1/snapshots", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    reportId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    description: "Pre-remediation baseline",
  }),
});

const result = await response.json();
console.log(`Snapshot created: ${result.snapshotId}`);
```

**Python Example**:

```python
import requests

response = requests.post(
    "http://localhost:3000/api/v1/snapshots",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    },
    json={
        "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "description": "Pre-remediation baseline",
    },
)

result = response.json()
print(f"Snapshot created: {result['snapshotId']}")
```

---

### 22. POST /api/v1/snapshots/:id/restore

Restore a report to the state captured in a snapshot. Returns the full restored `SecurityIntelligenceReport`.

**Authentication**: Optional (Bearer token or API key when enabled)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (UUID)` | Yes | The snapshot ID to restore |

**Request Body**: None

**Success Response**: `200 OK`

Returns the restored `SecurityIntelligenceReport` object (see DTO section).

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | Snapshot with the given ID does not exist |
| 500 | `INTERNAL_ERROR` | Snapshot restoration failure |

**curl Example**:

```bash
curl -X POST "http://localhost:3000/api/v1/snapshots/s1a2b3c4-d5e6-7890-abcd-ef1234567890/restore" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const snapshotId = "s1a2b3c4-d5e6-7890-abcd-ef1234567890";
const response = await fetch(
  `http://localhost:3000/api/v1/snapshots/${snapshotId}/restore`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }
);

const report: SecurityIntelligenceReport = await response.json();
console.log(`Restored report: ${report.id}, findings: ${report.findings.length}`);
```

**Python Example**:

```python
import requests

snapshot_id = "s1a2b3c4-d5e6-7890-abcd-ef1234567890"
response = requests.post(
    f"http://localhost:3000/api/v1/snapshots/{snapshot_id}/restore",
    headers={"Authorization": f"Bearer {token}"},
)

report = response.json()
print(f"Restored report: {report['id']}, findings: {len(report['findings'])}")
```

---

### 23. GET /api/v1/snapshots

List all saved snapshots.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**: None

**Success Response**: `200 OK`

```json
{
  "data": [
    {
      "id": "s1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "reportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "description": "Pre-remediation baseline",
      "createdAt": "2025-01-14T08:00:00Z",
      "size": 102400,
      "findingCount": 42,
      "riskScore": 8.5
    }
  ],
  "total": 1
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 500 | `INTERNAL_ERROR` | Database or storage failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/snapshots" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const response = await fetch("http://localhost:3000/api/v1/snapshots", {
  headers: { Authorization: `Bearer ${token}` },
});

const result = await response.json();
result.data.forEach((snap: Snapshot) => {
  console.log(`${snap.id}: ${snap.description || "No description"} (${snap.findingCount} findings)`);
});
```

**Python Example**:

```python
import requests

response = requests.get(
    "http://localhost:3000/api/v1/snapshots",
    headers={"Authorization": f"Bearer {token}"},
)

result = response.json()
for snap in result["data"]:
    desc = snap.get("description", "No description")
    print(f"{snap['id']}: {desc} ({snap['findingCount']} findings)")
```

---

## Storage Endpoints

### 24. GET /api/v1/storage/statistics

Retrieve aggregate storage statistics across all reports and snapshots.

**Authentication**: Optional (Bearer token or API key when enabled)

**Query Parameters**: None

**Success Response**: `200 OK`

Returns a `StorageStatistics` object:

```json
{
  "totalReports": 150,
  "totalFindings": 6200,
  "totalSnapshots": 23,
  "storageUsedBytes": 52428800,
  "storageAvailableBytes": 1073741824,
  "oldestReport": "2024-06-01T00:00:00Z",
  "newestReport": "2025-01-15T10:30:00Z",
  "byStatus": {
    "completed": 130,
    "pending": 5,
    "processing": 3,
    "failed": 12
  },
  "bySeverity": {
    "critical": 420,
    "high": 1850,
    "medium": 2800,
    "low": 900,
    "info": 230
  }
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 500 | `INTERNAL_ERROR` | Storage query failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/api/v1/storage/statistics" \
  -H "Authorization: Bearer <token>"
```

**TypeScript Example**:

```typescript
const response = await fetch(
  "http://localhost:3000/api/v1/storage/statistics",
  { headers: { Authorization: `Bearer ${token}` } }
);

const stats: StorageStatistics = await response.json();
const usedMB = (stats.storageUsedBytes / (1024 * 1024)).toFixed(2);
const availMB = (stats.storageAvailableBytes / (1024 * 1024)).toFixed(2);
console.log(`Storage: ${usedMB} MB used / ${availMB} MB available`);
```

**Python Example**:

```python
import requests

response = requests.get(
    "http://localhost:3000/api/v1/storage/statistics",
    headers={"Authorization": f"Bearer {token}"},
)

stats = response.json()
used_mb = stats["storageUsedBytes"] / (1024 * 1024)
avail_mb = stats["storageAvailableBytes"] / (1024 * 1024)
print(f"Storage: {used_mb:.2f} MB used / {avail_mb:.2f} MB available")
```

---

## Health & Observability Endpoints

### 25. GET /health

Comprehensive health check returning system status, version, uptime, and component health.

**Authentication**: None required

**Query Parameters**: None

**Success Response**: `200 OK`

Returns a `HealthDTO` object:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "components": {
    "database": "connected",
    "storage": "available",
    "analyzer": "ready"
  }
}
```

| `status` Value | Condition |
|----------------|-----------|
| `healthy` | All components operational |
| `degraded` | Non-critical component degraded |
| `unhealthy` | Critical component failed |

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 500 | `INTERNAL_ERROR` | Health check itself failed |
| 503 | `SERVICE_UNAVAILABLE` | Service is unhealthy |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/health"
```

**TypeScript Example**:

```typescript
const response = await fetch("http://localhost:3000/health");
const health: HealthDTO = await response.json();
console.log(`Status: ${health.status}, Version: ${health.version}`);
console.log(`Database: ${health.components.database}`);
```

**Python Example**:

```python
import requests

response = requests.get("http://localhost:3000/health")
health = response.json()
print(f"Status: {health['status']}, Version: {health['version']}")
print(f"Database: {health['components']['database']}")
```

---

### 26. GET /ready

Kubernetes-style readiness probe. Indicates whether the service is ready to accept traffic.

**Authentication**: None required

**Query Parameters**: None

**Success Response**: `200 OK`

```json
{
  "ready": true
}
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 503 | `SERVICE_UNAVAILABLE` | Service is not ready to accept traffic |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/ready"
```

**TypeScript Example**:

```typescript
const response = await fetch("http://localhost:3000/ready");
if (response.ok) {
  const { ready } = await response.json();
  console.log(`Ready: ${ready}`);
} else {
  console.log("Service not ready (503)");
}
```

**Python Example**:

```python
import requests

response = requests.get("http://localhost:3000/ready")
if response.ok:
    print(f"Ready: {response.json()['ready']}")
else:
    print("Service not ready (503)")
```

---

### 27. GET /live

Kubernetes-style liveness probe. Indicates whether the service process is alive.

**Authentication**: None required

**Query Parameters**: None

**Success Response**: `200 OK`

```json
{
  "alive": true
}
```

**Error Responses**: None expected — if this endpoint is unreachable, the process is considered dead.

**curl Example**:

```bash
curl -X GET "http://localhost:3000/live"
```

**TypeScript Example**:

```typescript
const response = await fetch("http://localhost:3000/live");
const { alive } = await response.json();
console.log(`Alive: ${alive}`);
```

**Python Example**:

```python
import requests

response = requests.get("http://localhost:3000/live")
print(f"Alive: {response.json()['alive']}")
```

---

### 28. GET /metrics

Prometheus-compatible metrics endpoint. Returns metrics in Prometheus text exposition format.

**Authentication**: None required

**Query Parameters**: None

**Success Response**: `200 OK`

**Content-Type**: `text/plain; version=0.0.4; charset=utf-8`

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/v1/reports",status="200"} 1234
http_requests_total{method="POST",path="/api/v1/analyze",status="202"} 567

# HELP analysis_duration_seconds Analysis execution duration
# TYPE analysis_duration_seconds histogram
analysis_duration_seconds_bucket{le="1"} 10
analysis_duration_seconds_bucket{le="5"} 45
analysis_duration_seconds_bucket{le="10"} 78
analysis_duration_seconds_bucket{le="+Inf"} 80
analysis_duration_seconds_sum 345.6
analysis_duration_seconds_count 80

# HELP findings_total Total findings processed
# TYPE findings_total counter
findings_total{severity="critical"} 420
findings_total{severity="high"} 1850
```

**Error Responses**:

| Status | Code | Condition |
|--------|------|-----------|
| 500 | `INTERNAL_ERROR` | Metrics collection failure |

**curl Example**:

```bash
curl -X GET "http://localhost:3000/metrics"
```

**TypeScript Example**:

```typescript
const response = await fetch("http://localhost:3000/metrics");
const metricsText: string = await response.text();
// Parse Prometheus format or forward to monitoring system
console.log(metricsText.substring(0, 200) + "...");
```

**Python Example**:

```python
import requests

response = requests.get("http://localhost:3000/metrics")
metrics_text = response.text
# Parse Prometheus format or forward to monitoring system
print(metrics_text[:200] + "...")
```

---

## Rate Limiting

The API may enforce rate limiting. When active, responses include these headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the rate limit window resets |

When the rate limit is exceeded, the API returns:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Retry after 60 seconds.",
    "statusCode": 429
  }
}
```

---

## Quick Reference

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | POST | `/api/v1/analyze` | Optional | Async analysis — returns run ID |
| 2 | POST | `/api/v1/analyze/sync` | Optional | Sync analysis — returns full report |
| 3 | GET | `/api/v1/reports` | Optional | List reports (paginated) |
| 4 | GET | `/api/v1/reports/:id` | Optional | Get full report |
| 5 | GET | `/api/v1/reports/:id/summary` | Optional | Get report summary |
| 6 | DELETE | `/api/v1/reports/:id` | Optional | Delete report |
| 7 | GET | `/api/v1/findings` | Optional | List findings (paginated, filterable) |
| 8 | GET | `/api/v1/findings/:id` | Optional | Get single finding |
| 9 | GET | `/api/v1/findings/search` | Optional | Search findings |
| 10 | GET | `/api/v1/risks` | Optional | List risks |
| 11 | GET | `/api/v1/risks/summary` | Optional | Risk summary |
| 12 | GET | `/api/v1/risks/top` | Optional | Top risks |
| 13 | GET | `/api/v1/attack-paths` | Optional | List attack paths |
| 14 | GET | `/api/v1/attack-paths/graph` | Optional | Attack graph (nodes & edges) |
| 15 | GET | `/api/v1/correlations` | Optional | List correlations |
| 16 | GET | `/api/v1/correlations/groups` | Optional | List correlation groups |
| 17 | GET | `/api/v1/recommendations` | Optional | List recommendations |
| 18 | POST | `/api/v1/recommendations/plan` | Optional | Generate remediation plan |
| 19 | GET | `/api/v1/explanations` | Optional | List explanations |
| 20 | GET | `/api/v1/explanations/:targetId` | Optional | Get explanation for entity |
| 21 | POST | `/api/v1/snapshots` | Optional | Create snapshot |
| 22 | POST | `/api/v1/snapshots/:id/restore` | Optional | Restore snapshot |
| 23 | GET | `/api/v1/snapshots` | Optional | List snapshots |
| 24 | GET | `/api/v1/storage/statistics` | Optional | Storage statistics |
| 25 | GET | `/health` | None | Health check |
| 26 | GET | `/ready` | None | Readiness probe |
| 27 | GET | `/live` | None | Liveness probe |
| 28 | GET | `/metrics` | None | Prometheus metrics |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-15 | Initial API release — 28 endpoints |
