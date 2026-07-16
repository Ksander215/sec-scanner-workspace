# Frequently Asked Questions (FAQ)

## Installation

### Q1: What are the system requirements?

**A:** The platform requires:
- **Node.js** 20.0.0 or later
- **Operating System:** Linux, macOS, or Windows (with WSL2 recommended)
- **RAM:** 512MB minimum, 2GB recommended for production
- **Disk:** 100MB for installation, additional storage for data based on usage
- **Optional:** Docker 20+ for containerized deployment, Kubernetes 1.24+ for Helm deployment

### Q2: How do I install the platform?

**A:** Three installation methods are supported:

```bash
# 1. From npm (recommended)
npm install -g security-intelligence-platform

# 2. From source
git clone <repository>
cd sec-scanner-workspace
npm ci && npm run build
npm link  # makes 'si' command available globally

# 3. Docker
docker pull si-platform:latest
docker run -p 8080:8080 -v ./data:/app/data si-platform:latest
```

### Q3: Can I run the platform without Docker?

**A:** Yes. The platform runs natively on Node.js 20+. Install via npm or build from source. The Docker image is provided for convenience and production deployments. For systemd-managed deployments, use the service file at `deploy/systemd/si-platform.service`.

## Configuration

### Q4: How do I configure the platform?

**A:** Configuration is loaded from multiple sources in priority order (lowest to highest):

1. **Defaults** — Built-in default values
2. **Config file** — `si-config.yaml` in the working directory or `SI_CONFIG_PATH`
3. **Local overrides** — `.si-local.yaml`
4. **Environment variables** — Prefixed with `SI_` (e.g., `SI_SERVER_PORT`, `SI_AUTH_ENABLED`)
5. **CLI flags** — `--port`, `--host`, etc.

Key configuration areas: `server`, `auth`, `persistence`, `analysis`, `observability`, `security`, `plugins`, `audit`, `jobs`.

### Q5: How do I enable authentication?

**A:** Set `auth.enabled: true` and choose a provider:

```yaml
auth:
  enabled: true
  provider: jwt  # or: api-key, oauth2
  jwt:
    secret: ${JWT_SECRET}
    algorithm: HS256
    issuer: si-platform
    accessTokenTtl: 15m
```

Or via environment variables:
```bash
SI_AUTH_ENABLED=true
SI_AUTH_PROVIDER=jwt
SI_JWT_SECRET=your-secret-here
```

### Q6: How do I configure secrets management?

**A:** Set the secrets backend in your configuration:

```yaml
secrets:
  backend: vault  # vault, aws-secrets, azure-kv, gcp-secret-manager
  endpoint: https://vault.internal:8200
  token: ${VAULT_TOKEN}
  namespace: si-platform
  mount: secret
```

All four providers (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager) follow the same interface. Never commit actual secrets to configuration files — always use environment variable references (`${VAR_NAME}`).

## Pipeline

### Q7: What is the 9-stage pipeline and how does it work?

**A:** The Security Intelligence Engine processes raw findings through 9 sequential stages:

1. **Normalize** — Standardize findings from diverse sources into a unified format
2. **Correlate** — Identify relationships between findings using configurable rules
3. **Knowledge Graph** — Build a graph connecting findings, hosts, services, and correlations
4. **Risk** — Assess risk for each finding using severity, confidence, exposure, and correlation multipliers
5. **Attack Path** — Discover multi-step attack chains through the knowledge graph
6. **Impact** — Evaluate business impact of findings and attack paths
7. **Recommendation** — Generate remediation guidance with prioritized action plans
8. **Explain** — Produce full explanations for each finding with evidence and rule traceability
9. **Report** — Aggregate all results into a `SecurityIntelligenceReport`

You can skip optional stages (attack-path, impact, explain) via `AnalysisOptions`.

### Q8: Can I add custom correlation rules?

**A:** Yes, three methods:

1. **Programmatically** via the builder:
```typescript
const engine = new SecurityIntelligenceBuilder()
  .addCorrelationRule({
    id: 'same-cve',
    name: 'Same CVE',
    type: 'shared-root-cause',
    condition: (a, b) => a.cve === b.cve && a.id !== b.id,
    scoreCalculator: () => 0.9,
    description: 'Findings sharing the same CVE',
  })
  .build();
```

2. **Via plugin** — Register a `correlation-rule` extension point in a custom plugin.
3. **Via API** — Submit custom rules through the correlation API endpoint.

### Q9: How does the pipeline handle large scan results?

**A:** For results with thousands of findings:
- Pair-wise correlation is O(n²) — for >10,000 findings, consider filtering findings before analysis
- The pipeline supports `AbortSignal` for cancellation of long-running analyses
- Per-stage progress events enable monitoring and timeout implementation
- For distributed processing, enable the `distributed-pipeline` feature flag to spread stages across services

## Risk Scoring

### Q10: How are risk scores calculated?

**A:** Risk scores combine multiple weighted factors:

```
riskScore = (severity × severityWeight) +
            (confidence × confidenceWeight) +
            (exposure × exposureWeight) +
            (impact × impactWeight) +
            (exploitability × exploitabilityWeight) +
            (correlationMultiplier)
```

Default weights (configurable):
- Severity: 0.35
- Confidence: 0.15
- Exposure: configurable
- Impact: configurable
- Exploitability: configurable
- Correlation multiplier: `1 + groupSize × 0.1`

Adjust weights via `analysis.risk.*` configuration or the `SecurityIntelligenceBuilder.withRiskParameters()` method.

### Q11: What is the correlation multiplier?

**A:** When findings are grouped together through correlation, their risk is amplified. A correlation group with N findings receives a multiplier of `1 + N × 0.1`. For example, a group of 5 correlated findings gets a 1.5x risk multiplier, reflecting the increased danger of combined vulnerabilities.

## Attack Paths

### Q12: What are attack paths and how are they discovered?

**A:** Attack paths are multi-step chains of vulnerabilities that an attacker could exploit to move through a system. The `AttackPathBuilder` discovers paths through the knowledge graph by:

1. Building a graph from findings, hosts, services, and their relationships
2. Identifying entry points (exposed findings)
3. Traversing the graph to find paths from entry points to high-value targets
4. Scoring paths based on the cumulative risk of constituent findings
5. Limiting results by `maxDepth` and `maxPaths` configuration

Attack path analysis is enabled by default but can be disabled via `AnalysisOptions.includeAttackPaths: false`.

### Q13: How do I configure attack path depth and limits?

**A:** Via the analysis configuration:

```yaml
analysis:
  attackPath:
    maxDepth: 10
    maxPaths: 50
    minRiskScore: 0.5
```

Or programmatically:
```typescript
const report = await engine.analyze(input, {
  includeAttackPaths: true,
});
```

## AI Features

### Q14: What AI features are available?

**A:** Four AI-powered modules are available (all disabled by default):

| Module | Feature Flag | Description |
|--------|-------------|-------------|
| **Risk Assistant** | `ai-risk-assistant` | AI-powered risk analysis and Q&A |
| **Remediation** | `ai-remediation` | AI-generated remediation guidance |
| **Threat Hunting** | `ai-threat-hunting` | Proactive threat discovery and hypothesis testing |
| **Copilot** | `ai-copilot` | Interactive security assistant |

Enable the AI layer and specific modules:

```yaml
features:
  ai-layer: true
  ai-risk-assistant: true
  ai-remediation: true
modules:
  ai:
    enabled: true
    provider: openai  # openai, azure, anthropic, ollama, vllm, local-gguf
```

### Q15: Can I use local/on-premises LLM models?

**A:** Yes. The platform supports three local LLM options:

1. **Ollama** — Run models locally via Ollama (easiest setup)
2. **vLLM** — Self-hosted inference server for production-scale local models
3. **Local GGUF** — Direct GGUF model file loading (no server required)

Configuration:
```yaml
modules:
  ai:
    enabled: true
    provider: ollama
```

This enables air-gapped deployments where no external API calls are made.

### Q16: Which LLM providers are supported?

**A:** Six providers:

| Provider | Type | Use Case |
|----------|------|----------|
| **OpenAI** | Cloud | GPT-4o, GPT-4o Mini |
| **Azure OpenAI** | Cloud | Enterprise Azure deployments |
| **Anthropic** | Cloud | Claude 3.5 Sonnet, Claude 3 Haiku |
| **Ollama** | Local | Development and air-gapped |
| **vLLM** | Local | Self-hosted production inference |
| **Local GGUF** | Local | Single-server without inference server |

## Enterprise Integrations

### Q17: What enterprise integrations are available?

**A:**

| Integration | Module | Description |
|-------------|--------|-------------|
| **SSO** | `enterprise.sso` | SAML 2.0, OIDC, LDAP, Active Directory |
| **SIEM** | `enterprise.siem` | Forward findings to Splunk, QRadar, Sentinel |
| **Ticketing** | `enterprise.ticketing` | Create tickets in Jira, ServiceNow |
| **CMDB** | `enterprise.cmdb` | Sync asset data with ServiceNow, Device42 |
| **Notifications** | `enterprise.notification` | Slack, email, PagerDuty, webhook |
| **Secrets** | `enterprise.secrets` | Vault, AWS, Azure, GCP secrets management |

### Q18: How do I configure SSO?

**A:** Enable SSO and configure your protocol:

```yaml
features:
  sso: true
modules:
  enterprise:
    sso: true
```

Supported protocols:
- **SAML 2.0** — For enterprise identity providers (Okta, OneLogin, Azure AD)
- **OIDC** — For cloud-native providers (Auth0, Keycloak, Google)
- **LDAP** — For on-premises directory services
- **Active Directory** — For Windows enterprise environments

## Deployment

### Q19: How do I deploy with Docker?

**A:**
```bash
# Build the image
docker build -t si-platform .

# Run with default JSON persistence
docker run -d \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -e SI_AUTH_ENABLED=true \
  -e SI_JWT_SECRET=your-secret \
  si-platform:latest
```

Or use Docker Compose:
```bash
docker-compose up -d
```

The Docker image runs as non-root user `si-user` (UID 1001) with a multi-stage build that excludes dev dependencies.

### Q20: How do I deploy on Kubernetes?

**A:** Use the provided Helm chart:

```bash
helm install si-platform ./helm/si-platform \
  --set server.port=8080 \
  --set auth.enabled=true \
  --set persistence.backend=postgres
```

The Helm chart provides:
- `Deployment` with configurable replicas
- `Service` (ClusterIP or LoadBalancer)
- Configurable resource limits and security context
- Environment variable injection for configuration

### Q21: How do I deploy with systemd?

**A:** Copy the service file and enable it:

```bash
sudo cp deploy/systemd/si-platform.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable si-platform
sudo systemctl start si-platform
```

The service includes security hardening: `NoNewPrivileges=true`, `ProtectSystem=strict`, `ProtectHome=true`, `PrivateTmp=true`.

## Performance

### Q22: What is the expected performance?

**A:** Performance depends on finding count and enabled stages:

| Findings | Pipeline Time (approx.) | Memory (approx.) |
|----------|------------------------|-------------------|
| 100 | < 1s | ~50MB |
| 1,000 | 2-5s | ~150MB |
| 10,000 | 30-60s | ~500MB |
| 50,000 | 5-10min | ~2GB |

Bottlenecks:
- **Correlation** — O(n²) pair-wise comparison dominates for large finding sets
- **Knowledge Graph** — Graph construction scales linearly with findings and correlations
- **Attack Path** — Path discovery depth is bounded by `maxDepth` configuration

For large deployments, enable the distributed pipeline to spread stages across multiple services.

### Q23: How can I optimize performance?

**A:**
1. **Reduce finding count** — Filter findings before analysis (by severity, host, or category)
2. **Skip optional stages** — Disable attack-path, impact, or explain if not needed
3. **Adjust correlation rules** — Remove unnecessary rules to reduce pair-wise comparisons
4. **Enable distributed pipeline** — Spread stages across services with `distributed-pipeline: true`
5. **Tune risk weights** — Reduce computational overhead by simplifying risk factors
6. **Use SQLite/Postgres** — Switch from JSON persistence for better query performance
7. **Increase concurrency** — Set `pipeline.maxConcurrent` for parallel pipeline execution

## Troubleshooting

### Q24: How do I enable debug logging?

**A:** Set the log level to `debug` or `trace`:

```yaml
observability:
  logging:
    level: debug  # or trace for maximum verbosity
    format: json  # or text for human-readable
```

Or via environment variable:
```bash
SI_LOG_LEVEL=debug si server start
```

### Q25: Where are logs stored?

**A:** By default, logs are written to stdout. For file-based logging:

```yaml
observability:
  logging:
    output: file
    filePath: /var/log/si-platform/app.log
```

Audit logs are stored separately based on `audit.directory` configuration.

### Q26: How do I report a bug?

**A:** Open an issue on GitHub with:
1. Platform version (`si --version`)
2. Configuration (redacted of secrets)
3. Steps to reproduce
4. Expected vs. actual behavior
5. Relevant logs (debug level if possible)

For security vulnerabilities, email security@si-platform.dev instead of filing a public issue.
