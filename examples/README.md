# Security Intelligence Platform — Examples

Complete, runnable examples for every integration point of the Security Intelligence Platform.

## Quick Start

```bash
# Minimal — run a full analysis locally (no server required)
npx tsx examples/minimal/analyze.ts
```

---

## Directory Index

| Directory | File | Description |
|-----------|------|-------------|
| **minimal/** | [`analyze.ts`](minimal/analyze.ts) | Minimal TypeScript example — create findings, run analysis, print report |
| **docker/** | [`docker-compose.yml`](docker/docker-compose.yml) | Production-like stack with PostgreSQL + Redis + SI Platform |
| **cli/** | [`commands.sh`](cli/commands.sh) | All 10 CLI commands with subcommands and flags |
| **rest/** | [`api-usage.sh`](rest/api-usage.sh) | curl examples for all 28 REST API endpoints |
| **sdk/** | [`typescript-usage.ts`](sdk/typescript-usage.ts) | Full TypeScript SDK — all 21 client methods |
| **sdk/** | [`python-usage.py`](sdk/python-usage.py) | Full Python SDK — all 18 client methods |
| **sdk/** | [`go-usage.go`](sdk/go-usage.go) | Full Go SDK — all 11 client methods |
| **plugin/** | [`custom-correlation-rule.ts`](plugin/custom-correlation-rule.ts) | Plugin adding a lateral-movement correlation rule |
| **plugin/** | [`custom-risk-factor.ts`](plugin/custom-risk-factor.ts) | Plugin adding network exposure + asset criticality risk factors |
| **custom-rule/** | [`sigma-rule.yaml`](custom-rule/sigma-rule.yaml) | Sigma rule for PowerShell download cradle detection |
| **custom-rule/** | [`yara-rule.yar`](custom-rule/yara-rule.yar) | YARA rule for reverse shell pattern detection |
| **pipeline/** | [`custom-pipeline.ts`](pipeline/custom-pipeline.ts) | Custom distributed pipeline with 4 services + event bus |

---

## Detailed Descriptions

### `minimal/analyze.ts`

The simplest way to use the platform. Creates a `SecurityIntelligenceEngine`, feeds it raw scan findings from Trivy/Checkov/Gitleaks/Nuclei, and prints the complete intelligence report including:

- Normalized findings with severity mapping
- Cross-finding correlations and groups
- Risk scores and summaries
- Attack path graphs
- Prioritized recommendations
- Explanations for each finding

**Run:** `npx tsx examples/minimal/analyze.ts`

### `docker/docker-compose.yml`

Production-grade Docker Compose stack including:

- **si-platform** — The Security Intelligence API server (port 8080)
- **postgres** — PostgreSQL 16 for report persistence
- **redis** — Redis 7 for caching and event bus backing
- **pgadmin** — Optional database debug UI (port 5050, profile: `debug`)

**Run:** `cd examples/docker && docker compose up -d`

### `cli/commands.sh`

Reference for all 10 CLI commands:

| Command | Subcommands | Purpose |
|---------|-------------|---------|
| `analyze` | — | Run security analysis on scan results |
| `reports` | `list`, `show`, `export` | Manage analysis reports |
| `findings` | `list`, `search`, `export` | Query security findings |
| `risk` | `summary`, `top`, `show` | Risk assessment |
| `attack` | `list`, `graph`, `simulate` | Attack path analysis |
| `recommend` | `list`, `plan`, `export` | Security recommendations |
| `explain` | `finding`, `risk`, `recommendation` | Explainability |
| `snapshot` | `create`, `restore` | Snapshot management |
| `config` | `init`, `set`, `show` | Configuration management |
| `server` | `start`, `stop`, `status` | API server management |

**Run:** `chmod +x examples/cli/commands.sh && ./examples/cli/commands.sh`

### `rest/api-usage.sh`

curl examples for all 28 REST API endpoints:

| Category | Endpoints | Count |
|----------|-----------|-------|
| Analysis | `POST /api/v1/analyze`, `POST /api/v1/analyze/sync` | 2 |
| Reports | `GET /api/v1/reports`, `GET /reports/:id`, `GET /reports/:id/summary`, `DELETE /reports/:id` | 4 |
| Findings | `GET /api/v1/findings`, `GET /findings/:id`, `GET /findings/search` | 3 |
| Risk | `GET /api/v1/risks`, `GET /risks/summary`, `GET /risks/top` | 3 |
| Attack Paths | `GET /api/v1/attack-paths`, `GET /attack-paths/graph` | 2 |
| Correlations | `GET /api/v1/correlations`, `GET /correlations/groups` | 2 |
| Recommendations | `GET /api/v1/recommendations`, `POST /recommendations/plan` | 2 |
| Explainability | `GET /api/v1/explanations`, `GET /explanations/:targetId` | 2 |
| Snapshots | `POST /api/v1/snapshots`, `POST /snapshots/:id/restore`, `GET /snapshots` | 3 |
| Storage | `GET /api/v1/storage/statistics` | 1 |
| Health | `GET /health`, `GET /ready`, `GET /live`, `GET /metrics` | 4 |

**Run:** `chmod +x examples/rest/api-usage.sh && ./examples/rest/api-usage.sh`

### `sdk/typescript-usage.ts`

Full TypeScript SDK reference using `SecurityIntelligenceClient` with all 21 methods:

```typescript
const client = new SecurityIntelligenceClient({
  baseUrl: 'http://localhost:8080',
  authToken: 'my-jwt-token',
  apiKey: 'si-api-key-dev',
  timeout: 60_000,
});
```

**Run:** `npx tsx examples/sdk/typescript-usage.ts`

### `sdk/python-usage.py`

Full Python SDK reference using `SecurityIntelligenceClient` with all 18 methods:

```python
client = SecurityIntelligenceClient(
    base_url="http://localhost:8080",
    auth_token="my-jwt-token",
    api_key="si-api-key-dev",
    timeout=60,
)
```

**Run:** `python examples/sdk/python-usage.py`

### `sdk/go-usage.go`

Full Go SDK reference using `NewClient(Config{})` with all 11 methods:

```go
client := si.NewClient(si.Config{
    BaseURL:   "http://localhost:8080",
    AuthToken: "my-jwt-token",
    APIKey:    "si-api-key-dev",
    Timeout:   60 * time.Second,
})
```

**Run:** `go run examples/sdk/go-usage.go`

### `plugin/custom-correlation-rule.ts`

Plugin demonstrating the `correlation-rule` extension point. Adds two rules:

1. **Cross-Host Lateral Movement** — Correlates high-severity vulnerabilities across hosts on the same subnet, boosting score for CVSS ≥ 9.0
2. **Shared Misconfiguration Root Cause** — Links misconfigurations on the same host or service path

Uses `PluginEngine.loadPlugin()` and `registerCorrelationRule()` via `PluginContext`.

### `plugin/custom-risk-factor.ts`

Plugin demonstrating the `risk-factor` extension point. Adds three factors:

1. **Network Exposure** (weight: 0.25) — Scores based on whether the host is public-facing
2. **Asset Criticality** (weight: 0.20) — Maps host prefixes (prod-db, prod-app, etc.) to criticality values
3. **Data Sensitivity** (weight: 0.15) — Boosts score for secrets, PII, and database-related findings

Uses `registerRiskFactor()` via `PluginContext`.

### `custom-rule/sigma-rule.yaml`

Sigma rule for detecting PowerShell download cradles — a common initial access technique. Maps to MITRE ATT&CK T1059.001 and T1105. Import via:

```typescript
engine.importSigmaRule(sigmaYaml);
```

### `custom-rule/yara-rule.yar`

YARA rule for detecting reverse shell patterns, credential theft, and persistence mechanisms in shell scripts. Maps to MITRE ATT&CK T1571. Import via:

```typescript
engine.importYaraRule(yaraRule);
```

### `pipeline/custom-pipeline.ts`

Custom distributed pipeline with 4 sequential services and event bus integration:

1. **Ingestion Service** — Validates and enriches raw findings
2. **Normalization Service** — Normalizes severity values and timestamps
3. **Risk Assessment Service** — Calculates risk scores per finding
4. **Notification Service** — Emits critical alerts

Features demonstrated:
- `DistributedPipeline.registerService()` and `execute()`
- `EventBus.publish()`, `subscribe()`, and `replay()`
- Circuit breaker configuration
- Service health checks
- Pipeline topology inspection
