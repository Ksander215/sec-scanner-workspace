# Security Intelligence Platform

[![CI](https://img.shields.io/github/actions/workflow/status/Ksander215/sec-scanner-workspace/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Ksander215/sec-scanner-workspace/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/v/release/Ksander215/sec-scanner-workspace?style=flat-square&label=Release)](https://github.com/Ksander215/sec-scanner-workspace/releases)
[![Docker](https://img.shields.io/docker/v/si-platform/latest?style=flat-square&label=Docker)](https://hub.docker.com/r/si-platform)
[![Docs](https://img.shields.io/badge/Documentation-latest-green?style=flat-square)](https://ksander215.github.io/sec-scanner-workspace/)

**AI-native web application security analysis engine** — correlate findings, build knowledge graphs, score risks, trace attack paths, and deliver explainable recommendations through a 9-stage intelligence pipeline.

---

## Overview

Security Intelligence Platform is not another DAST scanner. It is an **intelligence layer** that ingests raw findings from any scanner, correlates them into a unified Security Knowledge Graph, computes contextual risk scores, traces multi-step attack paths, and produces actionable, explainable remediation plans.

The core pipeline:

```
Knowledge → Intelligence → Explainability → Action
```

**Key capabilities:**

- **Correlation Engine** — deduplicate and link findings across scanners by vulnerability type, asset, and data-flow proximity
- **Security Knowledge Graph** — represent assets, vulnerabilities, and their relationships as a queryable graph
- **Risk Engine** — score findings with configurable weights for severity, confidence, exposure, impact, exploitability, and correlation multiplier
- **Attack Path Builder** — trace multi-step exploit chains through the knowledge graph with depth and score thresholds
- **Impact Engine** — assess business impact of attack paths (data exposure, service disruption, compliance violation)
- **Recommendation Engine** — generate prioritized, contextual remediation guidance per finding and attack path
- **Explainability Engine** — produce human-readable explanations of why each risk score and attack path exists
- **AI Layer** — 6 LLM providers, Risk Assistant, Remediation Advisor, Threat Hunting, SOC Copilot

**Access modes:** CLI (`si`), REST API (Fastify), SDK (TypeScript / Python / Go)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              ACCESS LAYER                                            │
│  ┌─────────────┐  ┌──────────────────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │  CLI (si)   │  │  REST API (Fastify)  │  │   SDKs   │  │  WebSocket / Stream  │  │
│  │ Commander   │  │  28 routes · 12 grps │  │ TS/Py/Go │  │                      │  │
│  └──────┬──────┘  └──────────┬───────────┘  └────┬─────┘  └──────────┬───────────┘  │
│         │                    │                   │                    │               │
├─────────┼────────────────────┼───────────────────┼────────────────────┼───────────────┤
│         │         API LAYER (INT-008)            │                    │               │
│         │  ┌─────────────────────────────────────┘                    │               │
│         │  │  Zod Validation · DTO Mapping · Auth (JWT/OAuth2/API-Key)│              │
│         │  │  Rate Limiting · CORS · Compression · Swagger UI         │              │
│         ▼  ▼                                                         ▼               │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │              ORCHESTRATOR (INT-006.5)                                        │    │
│  │                                                                              │    │
│  │  SecurityIntelligenceEngine ── 9-Stage Pipeline                             │    │
│  │                                                                              │    │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌──────┐  ┌────────────┐    │    │
│  │  │ Normalize│─▶│ Correlate │─▶│ Knowledge    │─▶│ Risk │─▶│ Attack     │    │    │
│  │  │          │  │           │  │ Graph        │  │      │  │ Path       │    │    │
│  │  └──────────┘  └───────────┘  └──────────────┘  └──────┘  └────────────┘    │    │
│  │        │                                              │                     │    │
│  │        ▼                                              ▼                     │    │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐           │    │
│  │  │ Impact   │─▶│ Recommend    │─▶│ Explain      │─▶│ Report     │           │    │
│  │  │          │  │              │  │              │  │            │           │    │
│  │  └──────────┘  └──────────────┘  └──────────────┘  └────────────┘           │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                           DOMAIN LAYER (INT-001..006)                                │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────────┐ ┌────────────┐               │
│  │Normalization│ │ Correlation │ │ Knowledge Graph  │ │ Risk       │               │
│  │Engine       │ │ Engine      │ │ Builder          │ │ Engine     │               │
│  └────────────┘ └─────────────┘ └──────────────────┘ └────────────┘               │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────────┐ ┌────────────┐               │
│  │Attack Path │ │ Impact      │ │ Recommendation   │ │Explainabil-│               │
│  │Builder     │ │ Engine      │ │ Engine           │ │ity Engine  │               │
│  └────────────┘ └─────────────┘ └──────────────────┘ └────────────┘               │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                        PERSISTENCE LAYER (INT-007)                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐     │
│  │ PersistenceEngine · JsonPersistenceProvider                                 │     │
│  │ 8 Repositories: Report · Finding · Risk · Correlation · AttackPath         │     │
│  │                 Recommendation · Explainability · Snapshot                  │     │
│  │ Backends: JSON │ SQLite │ PostgreSQL │ Neo4j │ Redis                        │     │
│  └─────────────────────────────────────────────────────────────────────────────┘     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE LAYER (INT-010..020)                              │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐         │
│  │Event Bus │ │ Message  │ │ Distributed│ │   Saga     │ │  Scheduler   │         │
│  │          │ │ Brokers  │ │  Pipeline  │ │  Engine    │ │  Engine      │         │
│  └──────────┘ └──────────┘ └────────────┘ └────────────┘ └──────────────┘         │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐         │
│  │ Cluster  │ │Multi-    │ │ Streaming  │ │ AI Layer   │ │ Enterprise   │         │
│  │ Coord.   │ │ tenancy  │ │ Engine     │ │ 6 LLMs     │ │ SSO/SIEM/... │         │
│  └──────────┘ └──────────┘ └────────────┘ └────────────┘ └──────────────┘         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐     │
│  │ Threat Intel │ │ Detection    │ │ Attack   │ │ Data Lake│ │ Analytics    │     │
│  │ Engine       │ │ Engineering  │ │ Sim.     │ │ Engine   │ │ Engine       │     │
│  └──────────────┘ └──────────────┘ └──────────┘ └──────────┘ └──────────────┘     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────────────────────┐  │
│  │ Cloud Engine │ │ Platform 2.0 │ │ Plugins  │ │ Observability                │  │
│  │ AWS/AZ/GCP/K8│ │              │ │ Engine   │ │ Tracing · Metrics · Logging  │  │
│  └──────────────┘ └──────────────┘ └──────────┘ └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Matrix

| Module | ID | Components | Description |
|--------|----|------------|-------------|
| **Normalization** | INT-001 | NormalizationEngine | Normalize findings from heterogeneous scanners into a unified schema |
| **Correlation** | INT-002 | CorrelationEngine | Deduplicate, link, and score relationships between findings |
| **Knowledge Graph** | INT-003 | KnowledgeGraphBuilder | Build a queryable Security Knowledge Graph of assets and vulnerabilities |
| **Risk Scoring** | INT-004 | RiskEngine | Contextual risk scoring with configurable weights (severity, confidence, exposure, impact, exploitability, correlation) |
| **Attack Paths** | INT-005 | AttackPathBuilder | Trace multi-step exploit chains through the knowledge graph |
| **Impact Analysis** | INT-005.5 | ImpactEngine | Assess business impact: data exposure, service disruption, compliance violations |
| **Recommendations** | INT-006 | RecommendationEngine | Generate prioritized, contextual remediation guidance |
| **Explainability** | INT-006.5 | ExplainabilityEngine | Produce human-readable explanations for risk scores and attack paths |
| **Orchestrator** | INT-006.5 | SecurityIntelligenceEngine, Builder | 9-stage pipeline coordinator with progress tracking |
| **Persistence** | INT-007 | PersistenceEngine, JsonPersistenceProvider | 8 repository interfaces (Report, Finding, Risk, Correlation, AttackPath, Recommendation, Explainability, Snapshot) |
| **API** | INT-008 | Fastify Server | 28 routes across 12 route groups with Zod validation and DTO mapping |
| **CLI** | INT-009 | Commander | 10 command groups, 6 output formats (table/json/yaml/csv/jsonl/markdown) |
| **Event Bus** | INT-010 | EventBus | In-process publish/subscribe with typed events |
| **Message Brokers** | INT-011 | Kafka, NATS, RabbitMQ, Redis providers | Pluggable message broker abstraction |
| **Distributed Pipeline** | INT-012 | DistributedPipelineEngine | Partition analysis workloads across nodes |
| **Saga** | INT-013 | SagaEngine | Orchestrate long-running distributed transactions with compensation |
| **Scheduler** | INT-014 | SchedulerEngine | Cron-based recurring analysis and maintenance jobs |
| **Cluster** | INT-015 | ClusterCoordinator | Leader election, node discovery, work distribution |
| **Multi-tenancy** | INT-016 | MultiTenancyEngine | Tenant isolation, per-tenant configuration and quotas |
| **Streaming** | INT-017 | StreamingEngine | Real-time finding ingestion via WebSocket and SSE |
| **AI Layer** | INT-018 | 6 LLM Providers, RiskAssistant, Remediation, ThreatHunting, SOCCopilot | AI-powered analysis, remediation, and co-pilot capabilities |
| **Enterprise** | INT-019 | SSO, SIEM, Ticketing, Notification, CMDB, Secrets | Enterprise integration layer |
| **Threat Intel** | INT-020 | ThreatIntelEngine | Ingest and correlate external threat intelligence feeds |
| **Detection Engineering** | INT-020 | DetectionEngine | Custom detection rule authoring and management |
| **Attack Simulation** | INT-020 | AttackSimEngine | Safe attack chain simulation for validation |
| **Data Lake** | INT-020 | DataLakeEngine | Long-term storage, archival, and replay |
| **Analytics** | INT-020 | AnalyticsEngine | Trend analysis, statistical dashboards |
| **Cloud** | INT-020 | CloudEngine | AWS, Azure, GCP, Kubernetes integration |
| **Platform 2.0** | INT-020 | PlatformEngine | Extended platform capabilities |

---

## Quick Start

```bash
# Install globally
npm install -g security-intelligence-platform

# Analyze a scan results file
si analyze scan-results.json --format table --explain

# Start the API server
si server start --port 8080

# Or use Docker
docker run -p 8080:8080 si-platform:latest
```

---

## Installation

### npm

```bash
# Global CLI install
npm install -g security-intelligence-platform

# Or as a project dependency
npm install security-intelligence-platform
```

Requires **Node.js 20+**.

### Docker

```bash
# Build
docker build -t si-platform:latest .

# Run with JSON persistence
docker run -d \
  --name si-platform \
  -p 8080:8080 \
  -v si-data:/app/data \
  -e SI_PERSISTENCE_BACKEND=json \
  -e SI_DATA_DIR=/app/data \
  si-platform:latest
```

The image uses a multi-stage build on `node:20-alpine`, runs as a non-root user (`si-user`), and includes an embedded health check.

### Docker Compose (Postgres + Redis + Jaeger)

```bash
docker-compose up -d
```

This starts:

| Service | Port | Purpose |
|---------|------|---------|
| `si-server` | 8080 | Platform API (JSON persistence) |
| `si-server-postgres` | 8081 | Platform API (PostgreSQL persistence) |
| `postgres` | 5432 | PostgreSQL 16 database |
| `redis` | 6379 | Redis 7 cache / broker |
| `jaeger` | 16686 | Distributed tracing UI |

### Helm (Kubernetes)

```bash
helm install si-platform ./helm/si-platform \
  --set config.persistence.backend=postgres \
  --set config.auth.enabled=true \
  --set config.auth.provider=jwt
```

**Values** (`helm/si-platform/values.yaml`):

| Key | Default | Description |
|-----|---------|-------------|
| `replicaCount` | 1 | Pod replicas |
| `image.repository` | `si-platform` | Container image |
| `service.port` | 8080 | Service port |
| `ingress.enabled` | false | Enable Ingress |
| `resources.limits.cpu` | 1000m | CPU limit |
| `resources.limits.memory` | 512Mi | Memory limit |
| `autoscaling.enabled` | false | HPA |
| `config.persistence.backend` | json | Persistence backend |
| `config.auth.enabled` | false | Enable authentication |
| `persistence.size` | 10Gi | PVC size |

### systemd

```bash
sudo cp deploy/systemd/si-platform.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now si-platform
```

---

## CLI Usage

The `si` CLI supports 10 command groups with 6 output formats:

```bash
si <command> [options]

Global options:
  --format <format>   Output format: table|json|yaml|csv|jsonl|markdown
  --remote            Use remote REST API instead of local engine
```

### analyze

```bash
# Run full analysis with explanations
si analyze scan-results.json --explain --format table

# Persist results and output to file
si analyze findings.json --persist --output report.json --format json

# Use remote API
si analyze findings.json --remote --format markdown

# Skip explanations for faster analysis
si analyze findings.json --no-explain
```

### reports

```bash
si reports list                          # List all reports
si reports get <report-id>               # Get report details
si reports summary <report-id>           # Report summary
si reports delete <report-id>            # Delete a report
```

### findings

```bash
si findings list --report <id>           # List findings for a report
si findings get <finding-id>             # Get finding details
si findings search "SQL injection"       # Search findings
```

### risk

```bash
si risk list --report <id>               # List risks
si risk summary --report <id>            # Risk summary
si risk top --limit 10                   # Top risks across reports
```

### attack

```bash
si attack list --report <id>             # List attack paths
si attack graph --report <id>            # Visualize attack graph
```

### recommend

```bash
si recommend list --report <id>          # List recommendations
si recommend plan --report <id>          # Generate remediation plan
```

### explain

```bash
si explain list --report <id>            # List explanations
si explain get <target-id>               # Get explanation for a specific target
```

### snapshot

```bash
si snapshot create --report <id>         # Create snapshot
si snapshot restore <snapshot-id>        # Restore from snapshot
```

### config

```bash
si config show                           # Show current configuration
si config set <key> <value>              # Set a configuration value
si config validate                       # Validate configuration
```

### server

```bash
si server start [--port 8080]            # Start API server
```

---

## REST API

The Fastify-based REST API exposes 28 routes across 12 route groups with Zod request validation, DTO response mapping, and Swagger UI documentation.

Base URL: `http://localhost:8080`

### Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| **Analyze** | | |
| `POST` | `/api/v1/analyze` | Start async analysis (returns `202 Accepted`) |
| `POST` | `/api/v1/analyze/sync` | Synchronous analysis (waits for completion) |
| **Reports** | | |
| `GET` | `/api/v1/reports` | List reports (paginated) |
| `GET` | `/api/v1/reports/:id` | Get report by ID |
| `GET` | `/api/v1/reports/:id/summary` | Report summary |
| `DELETE` | `/api/v1/reports/:id` | Delete report |
| **Findings** | | |
| `GET` | `/api/v1/findings` | List findings (filterable by report) |
| `GET` | `/api/v1/findings/:id` | Get finding by ID |
| `GET` | `/api/v1/findings/search` | Search findings by query |
| **Correlation** | | |
| `GET` | `/api/v1/correlations` | List correlations |
| **Risk** | | |
| `GET` | `/api/v1/risks` | List risks (filterable by report) |
| `GET` | `/api/v1/risks/summary` | Risk summary |
| `GET` | `/api/v1/risks/top` | Top risks across reports |
| **Attack Paths** | | |
| `GET` | `/api/v1/attack-paths` | List attack paths |
| `GET` | `/api/v1/attack-paths/graph` | Attack graph visualization data |
| **Recommendations** | | |
| `GET` | `/api/v1/recommendations` | List recommendations |
| `POST` | `/api/v1/recommendations/plan` | Create remediation plan |
| **Explainability** | | |
| `GET` | `/api/v1/explanations` | List explanations |
| `GET` | `/api/v1/explanations/:targetId` | Get explanation for target |
| **Persistence** | | |
| `GET` | `/api/v1/persistence/status` | Persistence backend status |
| `POST` | `/api/v1/persistence/migrate` | Run migrations |
| **Snapshots** | | |
| `POST` | `/api/v1/snapshots` | Create snapshot |
| `POST` | `/api/v1/snapshots/:id/restore` | Restore from snapshot |
| **Health & Metrics** | | |
| `GET` | `/health` | Health check |
| `GET` | `/metrics` | Prometheus metrics |

### Authentication

All `/api/v1/*` endpoints support three authentication modes:

| Provider | Header | Configuration |
|----------|--------|---------------|
| JWT Bearer | `Authorization: Bearer <token>` | `SI_AUTH_PROVIDER=jwt`, `SI_JWT_SECRET` |
| API Key | `X-API-Key: <key>` | `SI_AUTH_PROVIDER=api-key` |
| OAuth2 | `Authorization: Bearer <token>` | `SI_AUTH_PROVIDER=oauth2` |

Set `SI_AUTH_ENABLED=false` to disable authentication (default for local development).

---

## SDK

### TypeScript (20 methods)

```bash
npm install security-intelligence-platform
```

```typescript
import { SecurityIntelligenceClient, SiApiError } from 'security-intelligence-platform/sdk';

const client = new SecurityIntelligenceClient({
  baseUrl: 'http://localhost:8080',
  authToken: process.env.SI_AUTH_TOKEN,   // or apiKey: '...'
  timeout: 30000,
});

// Run synchronous analysis
const report = await client.analyzeSync({
  findings: [
    {
      id: 'f-001',
      title: 'SQL Injection in login endpoint',
      severity: 'critical',
      confidence: 0.95,
      asset: { id: 'a-1', name: 'web-app', type: 'application' },
      location: { file: 'auth.ts', line: 42 },
    },
  ],
});

console.log(`Risk score: ${report.riskScore}`);
console.log(`Attack paths: ${report.attackPaths.length}`);

// List and query
const reports = await client.listReports(50, 0);
const risks = await client.listRisks(report.id);
const topRisks = await client.getTopRisks(10);
const attackPaths = await client.listAttackPaths(report.id);
const attackGraph = await client.getAttackGraph(report.id);
const recommendations = await client.listRecommendations(report.id);
const explanations = await client.listExplanations(report.id);
const plan = await client.createRemediationPlan(report.id);

// Snapshots
const { snapshotId } = await client.createSnapshot(report.id, 'pre-remediation baseline');
const restored = await client.restoreSnapshot(snapshotId);

// Health check
const health = await client.getHealth();
```

### Python (18 methods, zero dependencies)

```python
from si_client import SecurityIntelligenceClient, SiApiError

client = SecurityIntelligenceClient(
    base_url="http://localhost:8080",
    auth_token="...",  # or api_key="..."
    timeout=30,
)

# Synchronous analysis
report = client.analyze_sync(findings=[
    {
        "id": "f-001",
        "title": "XSS in search endpoint",
        "severity": "high",
        "confidence": 0.9,
        "asset": {"id": "a-1", "name": "web-app", "type": "application"},
    },
])

# Query results
reports = client.list_reports(limit=50)
risks = client.list_risks(report_id=report["id"])
top_risks = client.get_top_risks(limit=10)
attack_paths = client.list_attack_paths(report_id=report["id"])
recommendations = client.list_recommendations(report_id=report["id"])
explanations = client.list_explanations(report_id=report["id"])
plan = client.create_remediation_plan(report_id=report["id"])

# Snapshots
snapshot = client.create_snapshot(report_id=report["id"], description="baseline")
restored = client.restore_snapshot(snapshot_id=snapshot["snapshotId"])

# Health
health = client.get_health()
```

### Go (11 methods, zero dependencies)

```go
package main

import (
    "context"
    "fmt"
    "time"

    si "github.com/ksander215/sec-scanner-workspace/sdk/go"
)

func main() {
    client := si.NewClient(si.Config{
        BaseURL:   "http://localhost:8080",
        AuthToken: "...",
        Timeout:   30 * time.Second,
    })

    ctx := context.Background()

    // Synchronous analysis
    report, _ := client.AnalyzeSync(ctx, []map[string]interface{}{
        {
            "id":         "f-001",
            "title":      "CSRF on settings endpoint",
            "severity":   "medium",
            "confidence": 0.85,
        },
    })

    // Query results
    reports, _ := client.ListReports(ctx, 50, 0)
    risks, _ := client.ListRisks(ctx, "report-id")
    summary, _ := client.GetRiskSummary(ctx, "report-id")
    paths, _ := client.ListAttackPaths(ctx, "report-id")
    recs, _ := client.ListRecommendations(ctx, "report-id")
    health, _ := client.GetHealth(ctx)

    snapshot, _ := client.CreateSnapshot(ctx, "report-id", "baseline")

    fmt.Println(report, reports, risks, summary, paths, recs, health, snapshot)
}
```

---

## Configuration

Configuration is loaded with the following priority (lowest to highest):

1. **Defaults** — built-in sensible defaults
2. **Config file** — `si-config.json` or path from `SI_CONFIG_FILE`
3. **Local override** — `.si-config.local.json`
4. **Environment variables** — `SI_*` prefix (e.g., `SI_SERVER_PORT`, `SI_DB_HOST`)
5. **CLI flags** — `--port`, `--format`, etc.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SI_SERVER_PORT` | `8080` | API server port |
| `SI_SERVER_HOST` | `0.0.0.0` | API server bind address |
| `SI_PERSISTENCE_BACKEND` | `json` | Backend: `json` \| `sqlite` \| `postgres` \| `neo4j` \| `redis` |
| `SI_DATA_DIR` | `./data` | Data directory (JSON/SQLite) |
| `SI_DB_HOST` | `localhost` | Database host |
| `SI_DB_PORT` | `5432` | Database port |
| `SI_DB_USER` | — | Database user |
| `SI_DB_PASSWORD` | — | Database password |
| `SI_DB_NAME` | `siplatform` | Database name |
| `SI_AUTH_ENABLED` | `false` | Enable authentication |
| `SI_AUTH_PROVIDER` | `none` | Auth provider: `none` \| `jwt` \| `api-key` \| `oauth2` |
| `SI_JWT_SECRET` | — | JWT signing secret |
| `SI_JWT_ALGORITHM` | `HS256` | JWT algorithm: `HS256` \| `HS384` \| `HS512` \| `RS256` \| `RS384` \| `RS512` |
| `SI_LOG_LEVEL` | `info` | Log level: `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |
| `SI_LOG_FORMAT` | `json` | Log format: `json` \| `text` |
| `SI_TRACING_ENABLED` | `false` | Enable distributed tracing |
| `SI_TRACING_PROVIDER` | `none` | Tracing provider: `none` \| `jaeger` \| `otlp` |
| `SI_TRACING_ENDPOINT` | `http://localhost:14268/api/traces` | Tracing collector endpoint |
| `SI_METRICS_ENABLED` | `true` | Enable Prometheus metrics |
| `SI_METRICS_PATH` | `/metrics` | Metrics scrape path |
| `SI_RATE_LIMIT_ENABLED` | `false` | Enable rate limiting |
| `SI_RATE_LIMIT_MAX` | `100` | Max requests per window |
| `SI_RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `SI_CONFIG_FILE` | — | Path to config file |

### Configuration Schema

The full configuration object (`PlatformConfiguration`) includes sections for server, auth, persistence, analysis pipeline, observability, security, plugins, audit, and background jobs. See [`src/infrastructure/config/types.ts`](src/infrastructure/config/types.ts) for the complete TypeScript interface.

### Analysis Pipeline Configuration

```json
{
  "analysis": {
    "defaultOptions": {
      "explain": true,
      "includeAttackPaths": true,
      "includeImpact": true,
      "persist": false
    },
    "pipeline": {
      "maxConcurrent": 4,
      "stageTimeout": 30000,
      "retryAttempts": 3,
      "retryDelay": 1000
    },
    "risk": {
      "severityWeight": 0.30,
      "confidenceWeight": 0.15,
      "exposureWeight": 0.20,
      "impactWeight": 0.20,
      "exploitabilityWeight": 0.15,
      "correlationMultiplier": 1.5
    },
    "attackPath": {
      "maxDepth": 8,
      "maxPaths": 20,
      "minRiskScore": 0.4
    }
  }
}
```

### Hot Reload

Configuration supports hot reload — changes to the config file are detected and emitted as `ConfigChangeEvent` objects without requiring a server restart.

---

## Plugins

The platform provides a plugin engine with 8 extension points:

| Extension Point | Interface | Description |
|----------------|-----------|-------------|
| `correlation-rule` | `CorrelationRuleExtension` | Custom finding correlation logic |
| `risk-factor` | `RiskFactorExtension` | Additional risk scoring factors |
| `recommendation-rule` | `RecommendationRuleExtension` | Custom recommendation generators |
| `cli-command` | `CliCommandExtension` | Additional CLI commands |
| `rest-endpoint` | `RestEndpointExtension` | Additional REST endpoints |
| `persistence-provider` | `PersistenceProviderExtension` | New storage backends |
| `analysis-stage` | `AnalysisStageExtension` | Custom pipeline stages |
| `output-formatter` | `OutputFormatterExtension` | New output formats |

### Plugin Structure

```typescript
import type { SiPlugin, PluginContext, PluginManifest } from './types.js';

export class MyCustomPlugin implements SiPlugin {
  readonly manifest: PluginManifest = {
    name: 'my-custom-plugin',
    version: '1.0.0',
    description: 'Custom correlation rules for my environment',
    author: 'security-team',
    entryPoint: __filename,
    extensions: ['correlation-rule', 'risk-factor'],
  };

  async initialize(context: PluginContext): Promise<void> {
    context.registerCorrelationRule({
      id: 'custom-sqli-correlation',
      name: 'SQLi + Auth Bypass Chain',
      condition: (a, b) => a['type'] === 'sqli' && b['type'] === 'auth-bypass',
      scoreCalculator: (a, b) => 0.95,
    });

    context.registerRiskFactor({
      id: 'public-facing',
      name: 'Public-Facing Asset',
      weight: 0.25,
      calculate: (finding) => finding['exposure'] === 'public' ? 1.0 : 0.0,
    });
  }

  async destroy(): Promise<void> {}
}
```

### Plugin Configuration

```json
{
  "plugins": {
    "directory": "./plugins",
    "autoLoad": true,
    "enabled": ["my-custom-plugin"],
    "disabled": []
  }
}
```

---

## Observability

### Logging

Structured JSON logging with trace correlation:

```json
{
  "level": "info",
  "message": "Analysis completed",
  "traceId": "abc123",
  "spanId": "def456",
  "requestId": "req-789",
  "context": { "reportId": "r-001", "durationMs": 1234 }
}
```

| Setting | Values | Env |
|---------|--------|-----|
| Level | `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` | `SI_LOG_LEVEL` |
| Format | `json` \| `text` | `SI_LOG_FORMAT` |
| Output | `stdout` \| `file` | `SI_LOG_OUTPUT` |

### Tracing

Distributed tracing with OpenTelemetry-compatible providers:

| Provider | Env Config |
|----------|------------|
| Jaeger | `SI_TRACING_PROVIDER=jaeger`, `SI_TRACING_ENDPOINT=http://jaeger:14268/api/traces` |
| OTLP | `SI_TRACING_PROVIDER=otlp`, `SI_TRACING_ENDPOINT=http://otel-collector:4318/v1/traces` |

Trace spans are created for each pipeline stage, persistence operation, and API request.

### Metrics

Prometheus-compatible metrics exposed at `/metrics`:

| Metric | Type | Description |
|--------|------|-------------|
| `si_analysis_total` | Counter | Total analyses started |
| `si_analysis_duration_seconds` | Histogram | Analysis pipeline duration |
| `si_findings_total` | Counter | Total findings processed |
| `si_risk_score_distribution` | Histogram | Risk score distribution |
| `si_attack_paths_total` | Counter | Attack paths discovered |
| `si_pipeline_stage_duration_seconds` | Histogram | Per-stage pipeline timing |

### Health Check

```bash
curl http://localhost:8080/health
```

```json
{
  "status": "ok",
  "uptime": 3600,
  "version": "2.0.0",
  "persistence": { "backend": "json", "status": "connected" }
}
```

---

## Security

The platform is built with a security-first approach across all layers:

### Transport & Headers

- **Security headers** applied to every response: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: no-store`
- **CORS** with configurable origins, methods, and credentials
- **Rate limiting** via `@fastify/rate-limit` with configurable window and max requests
- **Payload size validation** — rejects oversized request bodies with `413`
- **Input sanitization** — strips script tags and HTML from string inputs
- **Request ID validation** — enforces `^[a-zA-Z0-9\-]{1,64}$` format on `X-Request-ID`

### Authentication & Authorization

- **4 auth providers**: None, JWT (HS256/HS384/HS512/RS256/RS384/RS512), API Key, OAuth2
- **RBAC** with 4 roles and 15 fine-grained permissions:

| Role | Permissions |
|------|-------------|
| `viewer` | Read reports, findings, risks, attack paths, recommendations, explanations |
| `operator` | Viewer + write reports, create/restore snapshots |
| `security-analyst` | Operator + delete findings, write recommendations |
| `administrator` | Full access including user/role management and system config |

### Container Security

- Multi-stage Docker build minimizes attack surface
- Runs as non-root user (`si-user`, UID 1001)
- `node:20-alpine` base image
- No dev dependencies in production image
- Built-in health check with `wget`

### Audit

All configuration changes and administrative actions are recorded in the audit log:

| Setting | Values | Env |
|---------|--------|-----|
| Enabled | `true` \| `false` | `SI_AUDIT_ENABLED` |
| Backend | `json` \| `database` | `SI_AUDIT_BACKEND` |
| Retention | Days | `SI_AUDIT_RETENTION` |

---

## Development

### Prerequisites

- **Node.js** 20+
- **npm** 10+
- **TypeScript** 5.7+

### Setup

```bash
git clone https://github.com/Ksander215/sec-scanner-workspace.git
cd sec-scanner-workspace
npm install
```

### Build

```bash
npm run build          # Compile TypeScript to dist/
```

### Development Mode

```bash
npm run dev            # Watch mode with tsx
npm run cli            # Run CLI via tsx (no build)
npm run server         # Run API server via tsx
```

### Linting

```bash
npm run lint           # ESLint on src/
```

### Project Structure

```
src/
├── domain/
│   └── security-intelligence/
│       ├── normalization/       # INT-001: NormalizationEngine
│       ├── correlation/         # INT-002: CorrelationEngine
│       ├── knowledge-graph/     # INT-003: KnowledgeGraphBuilder
│       ├── risk/                # INT-004: RiskEngine
│       ├── attack-path/         # INT-005: AttackPathBuilder
│       ├── impact/              # INT-005.5: ImpactEngine
│       ├── recommendation/      # INT-006: RecommendationEngine
│       ├── explainability/      # INT-006.5: ExplainabilityEngine
│       ├── orchestrator/        # INT-006.5: SecurityIntelligenceEngine, Builder
│       └── persistence/         # INT-007: PersistenceEngine, repositories
├── api/
│   ├── routes/                 # INT-008: 12 route groups
│   ├── dto/                    # DTO types and mappers
│   ├── validation/             # Zod schemas
│   ├── auth/                   # JWT, API Key, OAuth2 providers
│   ├── middleware/              # Security headers, compression, CORS
│   └── server/                 # Fastify server builder
├── cli/
│   ├── commands/               # INT-009: 10 command groups
│   ├── output/                 # 6 output format formatters
│   ├── progress/               # Terminal progress renderer
│   ├── config/                 # CLI configuration manager
│   └── client/                 # Remote API client
└── infrastructure/
    ├── ai/                     # INT-018: LLM providers, assistants
    ├── analytics/              # Analytics engine
    ├── attack-sim/             # Attack simulation
    ├── audit/                  # Audit logging
    ├── brokers/                # Kafka, NATS, RabbitMQ, Redis
    ├── cloud/                  # AWS, Azure, GCP, K8s
    ├── cluster/                # Cluster coordinator
    ├── config/                 # Configuration engine
    ├── data-lake/              # Data lake engine
    ├── detection/              # Detection engineering
    ├── distributed-pipeline/   # Distributed pipeline
    ├── enterprise/             # SSO, SIEM, Ticketing, Notification, CMDB, Secrets
    ├── event-bus/              # In-process event bus
    ├── jobs/                   # Background job engine
    ├── multi-tenancy/          # Multi-tenancy engine
    ├── observability/          # Tracing, metrics, logging
    ├── platform/               # Platform 2.0
    ├── plugins/                # Plugin engine (8 extension points)
    ├── saga/                   # Saga engine
    ├── scheduler/              # Scheduler engine
    ├── security/               # Hardening middleware
    ├── streaming/              # Streaming engine
    └── threat-intel/           # Threat intelligence engine
```

**Statistics:** 153 TypeScript files, 56 exported classes, 211 interfaces, ~120 public methods.

---

## Testing

```bash
npm test               # Run all tests (Vitest)
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

### Performance Benchmarks

Benchmarks are located in `src/tests/benchmarks/performance.ts` and measure pipeline throughput, stage latency, and memory allocation under load.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

---

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| **v1.0** | Core intelligence pipeline (normalize → correlate → knowledge graph → risk → attack path → impact → recommend → explain → report) | Complete |
| **v1.1** | Persistence layer, REST API, CLI, JSON provider | Complete |
| **v2.0** | Infrastructure layer: event bus, message brokers, distributed pipeline, saga, scheduler, cluster, multi-tenancy, streaming, AI layer, enterprise integrations, threat intel, detection engineering, attack simulation, data lake, analytics, cloud, platform 2.0, plugins, observability | Complete |
| **v2.1** | PostgreSQL and Neo4j persistence providers, HPA autoscaling, advanced AI remediation workflows | Planned |
| **v2.2** | Web dashboard, real-time WebSocket streaming UI, custom detection rule IDE | Planned |
| **v3.0** | Multi-cluster federation, compliance automation (SOC 2, ISO 27001), threat landscape mapping | Planned |

---

> **Knowledge → Intelligence → Explainability → Action**
