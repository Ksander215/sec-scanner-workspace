# Troubleshooting Guide

This guide covers common issues and their solutions for the Security Intelligence Platform.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Docker Problems](#docker-problems)
3. [API Errors](#api-errors)
4. [CLI Issues](#cli-issues)
5. [Persistence Errors](#persistence-errors)
6. [Performance Issues](#performance-issues)
7. [AI Provider Errors](#ai-provider-errors)
8. [Enterprise Connector Errors](#enterprise-connector-errors)

---

## Installation Issues

### `npm install` fails with native module errors

**Symptoms:** Build errors for `better-sqlite3` or other native modules during `npm ci`.

**Cause:** Native modules require a C++ compiler and Python for `node-gyp`.

**Solution:**
```bash
# Install build tools (Ubuntu/Debian)
sudo apt-get install build-headers python3 make g++

# Install build tools (macOS)
xcode-select --install

# Or skip native modules if you don't need SQLite
npm ci --ignore-scripts
```

The platform works without `better-sqlite3` if you use the default JSON persistence backend.

### `npm run build` fails with TypeScript errors

**Symptoms:** `tsc` exits with type errors.

**Cause:** Incompatible TypeScript version or missing type definitions.

**Solution:**
```bash
# Verify TypeScript version (must be 5.7+)
npx tsc --version

# Clear and reinstall
rm -rf node_modules bun.lock
npm ci

# Verify Node.js version (must be 20+)
node --version
```

### `si` command not found after installation

**Symptoms:** `si: command not found` after `npm install -g`.

**Cause:** The global npm bin directory is not in your PATH.

**Solution:**
```bash
# Find the npm global bin directory
npm config get prefix

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$(npm config get prefix)/bin:$PATH"

# Or use npx
npx si --help
```

---

## Docker Problems

### Container exits immediately with code 1

**Symptoms:** `docker run` exits immediately. `docker logs` shows an error.

**Cause:** Missing data directory permissions or port conflict.

**Solution:**
```bash
# Check logs
docker logs <container-id>

# Ensure data directory is writable by UID 1001 (si-user)
mkdir -p ./data && chown -R 1001:1001 ./data

# Run with explicit volume and port
docker run -d \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  si-platform:latest
```

### Permission denied writing to data directory

**Symptoms:** `EACCES: permission denied` when writing JSON files.

**Cause:** The container runs as `si-user` (UID 1001). The mounted volume must be writable by this user.

**Solution:**
```bash
# Option 1: Change ownership
chown -R 1001:1001 ./data

# Option 2: Use a named volume (Docker manages permissions)
docker run -d -v si-data:/app/data si-platform:latest

# Option 3: Run with custom user (not recommended for production)
docker run -d --user root -v $(pwd)/data:/app/data si-platform:latest
```

### Health check fails

**Symptoms:** `HEALTHCHECK` reports unhealthy. `wget: can't connect to remote host` in container logs.

**Cause:** Server not started, wrong port, or startup delay.

**Solution:**
```bash
# Check if server is listening
docker exec <container-id> wget -qO- http://localhost:8080/health

# Verify port configuration
docker exec <container-id> env | grep SI_SERVER_PORT

# Increase start period in Dockerfile or docker-compose
healthcheck:
  start_period: 30s  # increase from default 10s
```

### Container cannot connect to external services

**Symptoms:** Timeouts when calling LLM APIs, Vault, or cloud services.

**Cause:** Docker network isolation or proxy configuration.

**Solution:**
```bash
# Run with host networking (Linux only)
docker run --network host si-platform:latest

# Or configure proxy
docker run -e HTTP_PROXY=http://proxy:8080 -e HTTPS_PROXY=http://proxy:8080 si-platform:latest

# For Docker Compose, use external network
services:
  si-platform:
    networks:
      - external-net
networks:
  external-net:
    external: true
```

---

## API Errors

### 401 Unauthorized

**Symptoms:** API returns `401 Unauthorized` for all requests.

**Cause:** Authentication is enabled but the request lacks valid credentials.

**Solution:**
```bash
# Check if auth is enabled
curl http://localhost:8080/health  # should work without auth

# Verify JWT token
curl -H "Authorization: Bearer <your-token>" http://localhost:8080/api/v1/reports

# Verify API key
curl -H "X-API-Key: <your-key>" http://localhost:8080/api/v1/reports

# Disable auth for development (not for production!)
SI_AUTH_ENABLED=false si server start
```

### 403 Forbidden

**Symptoms:** API returns `403 Forbidden` despite valid authentication.

**Cause:** The authenticated user lacks the required permission for the endpoint.

**Solution:**
- Check the user's roles and permissions via the RBAC engine
- Use an account with the `administrator` role for full access
- Verify specific permissions:
  - `finding.delete` requires `security-analyst` or `administrator` role
  - `config.read`/`config.write` requires `administrator` role
  - `admin.users`/`admin.roles`/`admin.system` requires `administrator` role

### 413 Payload Too Large

**Symptoms:** `413 Payload Too Large` when submitting analysis requests.

**Cause:** Request body exceeds the configured limit (default 10MB).

**Solution:**
```yaml
# Increase request body limit in config
server:
  requestBodyLimit: 50mb
```

Or split large finding sets into smaller batches:
```typescript
// Split findings into chunks of 500
const chunks = splitFindings(findings, 500);
for (const chunk of chunks) {
  await client.analyze({ findings: chunk });
}
```

### 429 Too Many Requests

**Symptoms:** `429 Too Many Requests` during high-volume API usage.

**Cause:** Rate limit exceeded (default 100 requests per window).

**Solution:**
```yaml
# Adjust rate limit
security:
  rateLimit:
    enabled: true
    maxRequests: 1000
    windowMs: 60000
```

Or implement request throttling in your client code.

### 500 Internal Server Error

**Symptoms:** API returns 500 with generic error message.

**Cause:** Unhandled exception in the pipeline or server.

**Solution:**
1. Enable debug logging: `SI_LOG_LEVEL=debug`
2. Check server logs for the full stack trace
3. Verify input data format matches the Zod schemas
4. Check for resource exhaustion (memory, disk space)
5. If the error persists, open an issue with the full error output

---

## CLI Issues

### `si analyze` hangs indefinitely

**Symptoms:** The analyze command starts but never completes.

**Cause:** Large finding count causing long pipeline execution, or a deadlock in the pipeline.

**Solution:**
```bash
# Run with verbose output to see which stage is stuck
si analyze --verbose findings.json

# Set a timeout
si analyze --timeout 300000 findings.json  # 5 minute timeout

# Reduce finding count
si analyze --min-severity high findings.json  # only high/critical

# Skip expensive stages
si analyze --no-attack-paths --no-impact findings.json
```

### `si server start` fails with "port already in use"

**Symptoms:** `EADDRINUSE` error on startup.

**Cause:** Another process is using port 8080.

**Solution:**
```bash
# Find the process using the port
lsof -i :8080  # macOS/Linux
netstat -tlnp | grep 8080  # Linux

# Kill the process
kill -9 <PID>

# Or use a different port
SI_SERVER_PORT=9090 si server start
# or
si server start --port 9090
```

### `si config` shows masked values for secrets

**Symptoms:** Configuration output shows `********` for sensitive values.

**Cause:** This is expected behavior. Config properties marked `secret: true` (JWT secrets, database passwords, API keys) are masked in output to prevent credential exposure.

**Solution:** This is a security feature, not a bug. To verify a secret is configured correctly, check the environment variable directly:
```bash
echo $SI_JWT_SECRET
```

### CLI commands return "access denied"

**Symptoms:** CLI commands fail with permission errors even with valid credentials.

**Cause:** The authenticated user's role doesn't have the required permission.

**Solution:**
```bash
# Check current user info
si config whoami

# Use admin credentials for administrative commands
si --api-key <admin-key> config set ...

# Verify the user has the required role
si config list-roles
```

---

## Persistence Errors

### JSON files not being created

**Symptoms:** Analysis completes but no JSON files appear in the data directory.

**Cause:** `persist: false` in analysis options, or data directory not writable.

**Solution:**
```bash
# Verify data directory exists and is writable
ls -la ./data/si-platform/reports/

# Ensure persist is enabled in analysis options
si analyze --persist findings.json

# Check configuration
si config get persistence.dataDir
si config get persistence.backend
```

### "Cannot read properties of null" when loading reports

**Symptoms:** Error when loading previously saved reports.

**Cause:** Corrupted JSON file (e.g., from a crash during write).

**Solution:**
```bash
# Validate JSON files
for f in data/si-platform/reports/*.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f', 'utf-8'))" || echo "CORRUPTED: $f"
done

# Remove corrupted files
rm data/si-platform/reports/<corrupted-id>.json

# Restore from snapshot if available
si snapshot restore <snapshot-id>
```

### SQLite: "database is locked"

**Symptoms:** `SQLITE_BUSY` errors under concurrent access.

**Cause:** SQLite only supports one writer at a time.

**Solution:**
- Reduce concurrent pipeline count to 1
- Switch to PostgreSQL for multi-process deployments
- Increase SQLite busy timeout:
```yaml
persistence:
  backend: sqlite
  connection:
    busyTimeout: 30000
```

### PostgreSQL connection refused

**Symptoms:** `ECONNREFUSED` or "connection refused" errors.

**Cause:** PostgreSQL not running, wrong host/port, or authentication failure.

**Solution:**
```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -U si_user -d si_platform

# Check configuration
si config get persistence.connection.host
si config get persistence.connection.port
si config get persistence.connection.username
```

---

## Performance Issues

### Pipeline is slow for large finding sets

**Symptoms:** Analysis takes minutes for >1,000 findings.

**Cause:** O(n²) correlation dominates runtime for large finding sets.

**Solution:**
1. **Pre-filter findings** — Remove low-severity findings before analysis:
   ```bash
   si analyze --min-severity medium findings.json
   ```
2. **Reduce correlation rules** — Disable unnecessary rules:
   ```typescript
   // Only use same-host and same-service rules
   engine.addCorrelationRule(sameHostRule);
   engine.addCorrelationRule(sameServiceRule);
   ```
3. **Skip optional stages** — Disable attack-path, impact, or explain stages
4. **Enable distributed pipeline** — Spread stages across multiple services
5. **Increase stage timeout** — For very large analyses:
   ```yaml
   analysis:
     pipeline:
       stageTimeout: 600000  # 10 minutes per stage
   ```

### High memory usage

**Symptoms:** Platform uses excessive memory, OOM kills.

**Cause:** Large finding sets held in memory, or event store growth.

**Solution:**
```bash
# Monitor memory usage
si server status  # shows memory metrics

# Reduce event store size
# Default: 100MB max, 7-day retention
# Lower for memory-constrained environments:
eventBus:
  maxStoreSize: 20971520  # 20MB
  retentionMs: 86400000   # 1 day
```

### Slow API response times

**Symptoms:** API requests take seconds to respond.

**Cause:** Large result sets, missing pagination, or slow persistence backend.

**Solution:**
1. **Use pagination** — Always specify `limit` and `offset` in list endpoints
2. **Switch persistence** — JSON file scanning is slow for many reports; use SQLite or PostgreSQL
3. **Enable compression** — `server.compression: true` reduces response size
4. **Use summary endpoints** — `/reports/{id}/summary` instead of full report for listing

---

## AI Provider Errors

### OpenAI API key is invalid

**Symptoms:** `401 Unauthorized` from OpenAI, or "Invalid API key" error.

**Cause:** Incorrect or expired API key.

**Solution:**
```bash
# Verify API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Ensure the key is set correctly
echo $OPENAI_API_KEY

# Configure in platform
export SI_AI_OPENAI_API_KEY=sk-...
# or in config:
modules:
  ai:
    enabled: true
    provider: openai
    apiKey: ${OPENAI_API_KEY}
```

### Ollama connection refused

**Symptoms:** `ECONNREFUSED` when connecting to Ollama.

**Cause:** Ollama is not running or wrong URL.

**Solution:**
```bash
# Start Ollama
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags

# Configure the platform
modules:
  ai:
    enabled: true
    provider: ollama
    baseUrl: http://localhost:11434
    defaultModel: llama3
```

### LLM responses are empty or nonsensical

**Symptoms:** AI features return empty strings or irrelevant content.

**Cause:** Model too small for the task, incorrect model configuration, or prompt injection.

**Solution:**
1. Use a model with sufficient context window (recommend 8K+ tokens)
2. Verify the model supports JSON mode if `responseFormat: 'json'` is used
3. Check `getModels()` output for model capabilities
4. Try a different provider or model:
   - OpenAI: GPT-4o (128K context, tool support)
   - Anthropic: Claude 3.5 Sonnet (200K context)
   - Ollama: llama3 or mistral (8K+ context)
5. For air-gapped deployments, ensure the GGUF model is appropriate for the task

### vLLM timeout errors

**Symptoms:** Requests to vLLM timeout.

**Cause:** Model loading time or insufficient GPU resources.

**Solution:**
```yaml
modules:
  ai:
    provider: vllm
    baseUrl: http://vllm-server:8000
    defaultModel: meta-llama/Llama-3-8B
    trustRemoteCode: true

# Increase pipeline timeout
analysis:
  pipeline:
    stageTimeout: 600000
```

---

## Enterprise Connector Errors

### SSO: SAML assertion validation fails

**Symptoms:** `SAML assertion validation failed` or `Invalid signature`.

**Cause:** Incorrect certificate, expired assertion, or clock skew.

**Solution:**
1. Verify the IdP certificate matches the configured `cert`
2. Check for clock skew between the platform server and IdP (tolerance: ±60 seconds)
3. Ensure `wantAssertionsSigned: true` if the IdP signs assertions
4. Verify the `issuer` and `callbackUrl` match the IdP configuration

### SSO: OIDC discovery fails

**Symptoms:** `Failed to fetch OIDC discovery document`.

**Cause:** Unreachable issuer URL or network connectivity.

**Solution:**
```bash
# Test discovery endpoint
curl https://your-idp.com/.well-known/openid-configuration

# Verify JWKS URI
curl https://your-idp.com/.well-known/jwks.json

# If behind a proxy, configure HTTP_PROXY
export HTTP_PROXY=http://proxy:8080
export HTTPS_PROXY=http://proxy:8080
```

### LDAP bind fails

**Symptoms:** `Invalid credentials` or ` bind failed`.

**Cause:** Wrong bind DN, password, or LDAP URL.

**Solution:**
```bash
# Test LDAP connection
ldapsearch -x -H ldaps://ldap.example.com \
  -D "cn=service-account,dc=example,dc=com" \
  -w "password" \
  -b "ou=users,dc=example,dc=com"

# Verify TLS configuration for LDAPS
# Ensure CA certificate is trusted
```

### SIEM connector: Connection refused

**Symptoms:** Findings are not forwarded to SIEM. Connection timeout.

**Cause:** SIEM endpoint unreachable or authentication failure.

**Solution:**
1. Verify network connectivity to the SIEM endpoint
2. Check API credentials (stored in secrets provider, not config file)
3. Verify the SIEM API version is compatible with the connector
4. Enable debug logging for the enterprise module:
   ```yaml
   observability:
     logging:
       level: debug
   ```

### Ticketing: Jira returns 401

**Symptoms:** Ticket creation fails with authentication error.

**Cause:** Expired API token or incorrect credentials.

**Solution:**
1. Generate a new API token from Jira account settings
2. Store the token in your secrets provider (Vault, AWS Secrets Manager, etc.)
3. Verify the project key and issue type are correct
4. Test the connection:
   ```bash
   curl -u email@api-token \
     https://your-domain.atlassian.net/rest/api/2/myself
   ```

### CMDB sync fails with "asset not found"

**Symptoms:** CMDB sync reports missing assets.

**Cause:** Asset identifiers in findings don't match CMDB records.

**Solution:**
1. Verify the asset identifier mapping configuration
2. Check that CMDB assets have the expected fields (hostname, IP, service name)
3. Use the CMDB connector's dry-run mode to validate mapping without writing
4. Review the mapping rules and adjust the identifier precedence

### Notification: Slack webhook returns 403

**Symptoms:** Notifications are not delivered to Slack.

**Cause:** Webhook URL expired or app permissions changed.

**Solution:**
1. Regenerate the webhook URL from the Slack app configuration
2. Verify the Slack app has the `incoming-webhook` scope
3. Test the webhook:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test from SI Platform"}' \
     https://hooks.slack.com/services/T.../B.../xxx
   ```

### Secrets provider: Vault seal error

**Symptoms:** `Vault is sealed` error when reading secrets.

**Cause:** Vault instance is sealed (not yet unsealed after restart).

**Solution:**
```bash
# Check Vault status
vault status

# Unseal Vault (requires quorum of unseal keys)
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>

# Verify the platform's Vault token is valid
vault token lookup
```

---

## General Debugging Tips

1. **Enable debug logging** — `SI_LOG_LEVEL=debug` provides the most detailed output
2. **Check health endpoint** — `curl http://localhost:8080/health` shows module status
3. **Verify configuration** — `si config list` shows effective configuration (secrets masked)
4. **Check disk space** — JSON persistence can grow quickly; ensure adequate storage
5. **Review audit logs** — `audit.directory` contains a trail of all operations
6. **Test with minimal input** — Start with a single finding to isolate issues
7. **Check environment variables** — Environment overrides may conflict with config file values
8. **Use the SDK** — The TypeScript SDK provides typed error objects (`SiApiError`) with status codes
