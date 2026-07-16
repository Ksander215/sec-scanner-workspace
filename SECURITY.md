# Security Policy

## Responsible Disclosure

We take the security of the Security Intelligence Platform seriously. If you believe you have found a security vulnerability, we encourage you to report it responsibly.

**Contact:** security@si-platform.dev

**PGP Key:** Available at https://si-platform.dev/.well-known/pgp-key.txt

**Reporting Guidelines:**

1. **Do not** file a public GitHub issue for security vulnerabilities.
2. Email `security@si-platform.dev` with a detailed description of the vulnerability.
3. Include steps to reproduce, affected versions, and potential impact.
4. We will acknowledge receipt within 48 hours and provide an initial assessment within 5 business days.
5. We will keep you informed of progress toward a fix and full disclosure.
6. We ask that you do not disclose the vulnerability publicly until a fix has been released.

We follow coordinated disclosure and credit researchers in our security advisories.

---

## Supported Versions

| Version | Supported | Until | Notes |
|---------|-----------|-------|-------|
| 2.0.x   | Yes       | Active | Current release |
| 1.1.x   | Yes       | 2027-01 | LTS |
| 1.0.x   | Yes       | 2026-10 | Security fixes only |
| < 1.0   | No        | EOL    | End of life |

---

## Threat Model

### Platform Attack Surface

The Security Intelligence Platform exposes the following attack surfaces:

#### 1. REST API (`src/api/`)

- **Threats:** Injection via malformed payloads, authentication bypass, authorization escalation, denial-of-service via large request bodies, CORS misconfiguration
- **Mitigations:** Zod schema validation on all endpoints, Fastify rate limiting (`@fastify/rate-limit`), security headers middleware, payload size validation, input sanitization, CORS whitelist enforcement

#### 2. CLI (`src/cli/`)

- **Threats:** Local privilege escalation, config file tampering, credential exposure in process arguments
- **Mitigations:** Config file permission checks, secret masking in logs, no credential passthrough in command arguments

#### 3. Multi-Tenancy (`src/infrastructure/multi-tenancy/`)

- **Threats:** Tenant data leakage (cross-tenant access), quota bypass, privilege escalation within tenant
- **Mitigations:** Row/schema/database isolation levels per plan, tenant-scoped RBAC with per-tenant roles, quota enforcement on API calls/scans/storage, tenant ID injection in all data access paths

#### 4. AI Layer (`src/infrastructure/ai/`)

- **Threats:** Prompt injection, LLM output manipulation, API key exposure, model data leakage, hallucinated security recommendations
- **Mitigations:** Input sanitization before LLM calls, output validation, API keys stored in secrets providers (not config files), deterministic fallback for critical recommendations, prompt hardening

#### 5. Cloud Connectors (`src/infrastructure/cloud/`)

- **Threats:** Cloud credential leakage, unauthorized cloud API access, SSRF via cloud endpoints
- **Mitigations:** Credential rotation via secrets providers, least-privilege IAM policies, outbound URL allowlisting, VPC-only endpoints where available

#### 6. Enterprise Integrations (`src/infrastructure/enterprise/`)

- **SIEM connectors:** Threat of log injection, credential exposure; mitigated by structured log output, secrets provider for credentials
- **Ticketing connectors:** Threat of unauthorized ticket creation, data exfiltration; mitigated by RBAC-gated API, audit logging
- **CMDB connectors:** Threat of asset data tampering; mitigated by read-only sync mode, audit trail
- **SSO providers (SAML/OIDC/LDAP/AD):** Threat of token forgery, replay attacks; mitigated by signature verification, token expiry enforcement, nonce validation
- **Notification providers:** Threat of notification spam, credential exposure; mitigated by rate limiting, secrets management

#### 7. Event Bus (`src/infrastructure/event-bus/`)

- **Threats:** Event injection, event replay attacks, consumer DoS
- **Mitigations:** Event payload validation, correlation/causation ID tracking, consumer group isolation, dead-letter queues, event store retention limits (7 days default, 100MB max)

#### 8. Plugin System (`src/infrastructure/plugins/`)

- **Threats:** Malicious plugin code, privilege escalation via plugin hooks, data exfiltration
- **Mitigations:** Plugin sandboxing via controlled `PluginContext`, no direct filesystem/database access, explicit extension point registration, plugin manifest validation, auto-load disabled by default

---

## Secrets Management

The platform supports four secrets backend providers, configured via `secrets.backend`:

| Provider | Backend Value | Use Case |
|----------|--------------|----------|
| **HashiCorp Vault** | `vault` | Enterprise deployments, dynamic secrets, PKI |
| **AWS Secrets Manager** | `aws-secrets` | AWS-native deployments, automatic rotation |
| **Azure Key Vault** | `azure-kv` | Azure-native deployments, HSM-backed keys |
| **GCP Secret Manager** | `gcp-secret-manager` | GCP-native deployments, automatic replication |

### Configuration

```yaml
secrets:
  backend: vault          # one of: vault, aws-secrets, azure-kv, gcp-secret-manager
  endpoint: https://vault.internal:8200
  token: ${VAULT_TOKEN}   # always use environment variable references
  namespace: si-platform
  mount: secret
```

### Principles

- **Never commit secrets** to source control. All secrets are referenced via environment variables (`${VAR_NAME}`) in configuration files.
- **Secret masking** is applied in logs and API output for any config property marked `secret: true` in the schema.
- **Rotation** is supported through provider-native mechanisms (Vault dynamic secrets, AWS automatic rotation).
- **Least privilege** — each secrets path is scoped to the specific module that requires it.

---

## Authentication

Four authentication providers are supported, configured via `auth.provider`:

### 1. JWT (`jwt`)

- Algorithms: HS256, HS384, HS512, RS256, RS384, RS512
- Access token TTL: configurable (default 15 minutes)
- Refresh token TTL: configurable
- Issuer and audience validation enforced
- Token includes: `sub`, `username`, `email`, `roles`, `iat`, `exp`, `iss`, `aud`

### 2. API Key (`api-key`)

- Header-based: `X-API-Key` (configurable)
- Query parameter fallback: `apiKey` (configurable)
- Keys are stored as SHA-256 hashes (never plaintext)
- Per-key role assignment and expiration
- Last-used tracking for audit

### 3. OAuth2 (`oauth2`)

- Authorization Code Flow with PKCE
- Configurable issuer, client ID, scopes, and redirect URI
- Token validation against OIDC discovery endpoint
- Automatic token refresh

### 4. SSO via Enterprise Providers

Supported protocols:

| Protocol | Use Case |
|----------|----------|
| **SAML 2.0** | Enterprise SSO, federation |
| **OIDC** | Cloud-native identity providers |
| **LDAP** | On-premises directory services |
| **Active Directory** | Windows enterprise environments |

---

## Role-Based Access Control (RBAC)

### Roles

| Role | Description |
|------|-------------|
| **viewer** | Read-only access to reports, findings, risks, attack paths, recommendations, and explanations |
| **operator** | Viewer + report creation, snapshot management |
| **security-analyst** | Operator + finding deletion, recommendation authoring |
| **administrator** | Full access including config, user management, and system administration |

### Permissions (15 total)

| Permission | Description | viewer | operator | security-analyst | administrator |
|-----------|-------------|--------|----------|-----------------|---------------|
| `report.read` | View reports | Yes | Yes | Yes | Yes |
| `report.write` | Create/export reports | No | Yes | Yes | Yes |
| `finding.read` | View findings | Yes | Yes | Yes | Yes |
| `finding.delete` | Delete findings | No | No | Yes | Yes |
| `risk.read` | View risk assessments | Yes | Yes | Yes | Yes |
| `attack.read` | View attack paths | Yes | Yes | Yes | Yes |
| `recommendation.read` | View recommendations | Yes | Yes | Yes | Yes |
| `recommendation.write` | Author recommendations | No | No | Yes | Yes |
| `explanation.read` | View explanations | Yes | Yes | Yes | Yes |
| `snapshot.create` | Create snapshots | No | Yes | Yes | Yes |
| `snapshot.restore` | Restore snapshots | No | Yes | Yes | Yes |
| `config.read` | View configuration | No | No | No | Yes |
| `config.write` | Modify configuration | No | No | No | Yes |
| `admin.users` | Manage users | No | No | No | Yes |
| `admin.roles` | Manage roles | No | No | No | Yes |
| `admin.system` | System administration | No | No | No | Yes |

### RBAC Enforcement

- Every API endpoint validates the authenticated user's permissions via `RbacEngine.hasPermission()`.
- `RbacEngine.requirePermission()` throws `AccessDeniedError` on denial.
- Users may hold multiple roles; permissions are the union of all assigned roles.
- Tenant-scoped RBAC adds per-tenant roles (viewer, analyst, admin) with tenant-specific permissions.

---

## Dependencies Security

### Supply Chain Protection

- **Lockfile integrity:** `bun.lock` is committed and checksummed.
- **Minimal dependencies:** The platform deliberately limits its dependency tree. Core runtime dependencies:
  - `fastify` + plugins (CORS, compress, swagger, rate-limit, websocket)
  - `zod` (validation)
  - `commander` (CLI)
  - `better-sqlite3` (optional persistence)
  - `ioredis` (optional distributed state)
  - `neo4j-driver` (optional graph persistence)
  - `prom-client` (metrics)
- **No transitive shell execution** — dependencies are not allowed to execute shell commands at runtime.
- **Dev/test isolation** — `vitest`, `eslint`, `tsx`, `typescript` are dev-only.

### Vulnerability Scanning

- Run `npm audit` (or `bun audit`) as part of CI.
- Dependabot enabled for automatic dependency updates.
- Critical vulnerability patches are applied within 48 hours of disclosure.

---

## Container Security

### Docker Image Hardening

The Dockerfile implements a multi-stage build with security best practices:

```dockerfile
# Stage 1: Build (discarded)
FROM node:20-alpine AS builder
# ... build steps ...

# Stage 2: Production (minimal)
FROM node:20-alpine AS production
# Dedicated non-root user
RUN addgroup -g 1001 -S si-group && adduser -S si-user -u 1001 -G si-group
# Production dependencies only
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
# Run as non-root
USER si-user
```

**Key controls:**

| Control | Implementation |
|---------|---------------|
| **Non-root user** | `si-user` (UID 1001) — never runs as root |
| **No dev dependencies** | `npm ci --omit=dev` in production stage |
| **No build tools** | Multi-stage build discards compiler, source maps |
| **Cache cleanup** | `npm cache clean --force` removes install artifacts |
| **Health check** | Built-in `wget` health check on `/health` endpoint |
| **Minimal base** | `node:20-alpine` — reduced attack surface |

### systemd Hardening

When deployed via systemd (`deploy/systemd/si-platform.service`):

| Directive | Value | Purpose |
|-----------|-------|---------|
| `User` | `si-platform` | Non-root execution |
| `Group` | `si-platform` | Non-root group |
| `NoNewPrivileges` | `true` | Prevent privilege escalation via setuid |
| `ProtectSystem` | `strict` | Read-only filesystem except explicit paths |
| `ProtectHome` | `true` | Prevent access to home directories |
| `ReadWritePaths` | `/var/lib/si-platform /var/log/si-platform` | Only writable paths |
| `PrivateTmp` | `true` | Isolated temporary directory |

---

## Audit Logging

The platform maintains a comprehensive audit trail for all security-relevant operations.

### Audited Actions

| Category | Actions |
|----------|---------|
| **Authentication** | `auth.login`, `auth.logout`, `auth.token.refresh` |
| **Reports** | `report.create`, `report.read`, `report.delete`, `report.export` |
| **Findings** | `finding.read`, `finding.delete`, `finding.search` |
| **Analysis** | `analysis.start`, `analysis.complete`, `analysis.fail` |
| **Risk & Attack** | `risk.read`, `attack.read` |
| **Recommendations** | `recommendation.read`, `recommendation.update` |
| **Snapshots** | `snapshot.create`, `snapshot.restore` |
| **Configuration** | `config.read`, `config.update` |
| **User Management** | `user.create`, `user.update`, `user.delete`, `user.role.assign` |
| **Plugins** | `plugin.load`, `plugin.unload` |
| **System** | `system.start`, `system.stop`, `system.health` |

### Audit Event Fields

Each audit event captures:

- `id` — Unique event identifier
- `timestamp` — UTC timestamp
- `actor` — Authenticated user or system identity
- `action` — The audited action type
- `resource` — Resource type affected
- `resourceId` — Specific resource identifier
- `ip` — Source IP address
- `requestId` — Correlation request ID
- `result` — `success`, `failure`, or `error`
- `duration` — Operation duration in ms
- `details` — Additional context (optional)

### Configuration

```yaml
audit:
  enabled: true
  backend: json          # json or database
  directory: /var/log/si-platform/audit
  retention: 90          # days
  logInternal: true      # log internal system events
```

---

## Reporting a Vulnerability

### Process

1. **Report** — Email `security@si-platform.dev` with full details.
2. **Acknowledge** — We confirm receipt within 48 hours.
3. **Triage** — We assess severity using CVSS v3.1 and assign a priority.
4. **Fix** — We develop and test a patch. Critical vulnerabilities target 72-hour resolution.
5. **Release** — We publish a patched release and security advisory.
6. **Disclose** — After 90 days or patch release (whichever is sooner), we publish a full CVE.

### Severity Classification

| Severity | CVSS Score | Response Time |
|----------|-----------|---------------|
| Critical | 9.0–10.0 | 24 hours |
| High | 7.0–8.9 | 72 hours |
| Medium | 4.0–6.9 | 7 days |
| Low | 0.1–3.9 | 30 days |

### Out of Scope

- Vulnerabilities in third-party services not managed by this project
- Social engineering attacks
- Denial-of-service attacks against publicly available instances
- Issues in development-only dependencies not present in production builds

---

## Security Headers

All API responses include the following security headers (enforced by `registerSecurityHardening`):

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `0` (disabled, prevention via CSP) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Cache-Control` | `no-store` |
| `Pragma` | `no-cache` |

---

## Security Configuration Checklist

- [ ] `auth.enabled: true` — Never run in production without authentication
- [ ] `auth.provider` set to `jwt`, `api-key`, or `oauth2` (not `none`)
- [ ] JWT secret is at least 256 bits and loaded from secrets provider
- [ ] `security.rateLimit.enabled: true`
- [ ] `audit.enabled: true` with appropriate backend
- [ ] Secrets backend configured (not plaintext in config)
- [ ] TLS enabled for all external communications
- [ ] Container runs as non-root (`si-user`)
- [ ] systemd hardening directives applied (or equivalent Kubernetes security context)
- [ ] Plugin auto-load disabled (`plugins.autoLoad: false`)
- [ ] CORS origins restricted to known domains
- [ ] Request body limits configured appropriately
