# Contributing to Security Intelligence Platform

Thank you for your interest in contributing to the Security Intelligence Platform! This document provides everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Style](#coding-style)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Architecture Principles](#architecture-principles)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone. We expect all contributors to:

- Be respectful and constructive in all interactions
- Focus on what is best for the community and the project
- Show empathy toward other community members
- Gracefully accept constructive criticism

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing others' private information without permission
- Any conduct that would be inappropriate in a professional setting

### Enforcement

Report any violations to the project maintainers. All reports will be reviewed and investigated promptly and fairly.

---

## Development Setup

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 20+ | Required. Uses native `fetch`, ESM, and modern APIs. |
| **npm** | 10+ | Comes with Node.js 20+ |
| **TypeScript** | 5.7+ | Installed as dev dependency |
| **Git** | 2.40+ | For version control |

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Ksander215/sec-scanner-workspace.git
cd sec-scanner-workspace

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Run tests
npm test

# 5. Start development server (with hot reload)
npm run dev
```

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `npm run build` | Compile TypeScript to `dist/` |
| `dev` | `npm run dev` | Start CLI in development mode with hot reload |
| `start` | `npm start` | Run the compiled CLI from `dist/` |
| `test` | `npm test` | Run test suite once |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |
| `test:coverage` | `npm run test:coverage` | Run tests with coverage report |
| `lint` | `npm run lint` | Lint source files with ESLint |
| `cli` | `npm run cli` | Run CLI via tsx (dev mode) |
| `server` | `npm run server` | Start the REST API server |

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SI_BASE_URL` | No | `http://localhost:3000` | Platform base URL |
| `SI_AUTH_TOKEN` | No | — | Bearer token for authentication |
| `SI_API_KEY` | No | — | API key for authentication |
| `SI_PORT` | No | `3000` | REST API server port |
| `SI_LOG_LEVEL` | No | `info` | Logging level (debug, info, warn, error) |

---

## Project Structure

```
sec-scanner-workspace/
├── sdk/                              # Client SDKs
│   ├── typescript/                   #   TypeScript SDK (20 methods, zero deps)
│   │   ├── index.ts                  #     Re-exports
│   │   └── client.ts                 #     SecurityIntelligenceClient + SiApiError
│   ├── python/                       #   Python SDK (18 methods, zero deps)
│   │   └── si_client.py              #     SecurityIntelligenceClient + SiApiError
│   └── go/                           #   Go SDK (11 methods, zero deps)
│       ├── go.mod                    #     Module: github.com/Ksander215/sec-scanner-workspace/sdk/go
│       └── client.go                 #     Client + ApiError
│
├── src/                              # Main application source
│   ├── api/                          # REST API layer (Fastify)
│   │   ├── routes/                   #   Route handlers
│   │   │   ├── analyze.ts            #     POST /api/v1/analyze, /api/v1/analyze/sync
│   │   │   ├── reports.ts            #     GET/DELETE /api/v1/reports
│   │   │   ├── findings.ts           #     GET /api/v1/findings, /api/v1/findings/search
│   │   │   ├── risk.ts               #     GET /api/v1/risks
│   │   │   ├── attack-paths.ts       #     GET /api/v1/attack-paths
│   │   │   ├── recommendations.ts    #     GET /api/v1/recommendations
│   │   │   ├── explainability.ts     #     GET /api/v1/explanations
│   │   │   ├── correlation.ts        #     GET /api/v1/correlations
│   │   │   ├── persistence.ts        #     Persistence endpoints
│   │   │   ├── health.ts             #     GET /health
│   │   │   └── metrics.ts            #     GET /metrics
│   │   ├── dto/                      #   Data Transfer Objects
│   │   │   ├── types.ts              #     DTO type definitions
│   │   │   └── mappers.ts            #     Domain ↔ DTO mappers
│   │   ├── validation/               #   Request validation (Zod schemas)
│   │   ├── auth/                     #   Authentication types
│   │   ├── middleware/               #   Fastify middleware
│   │   ├── server/                   #   Server setup and startup
│   │   └── index.ts                  #   API barrel export
│   │
│   ├── cli/                          # CLI layer (Commander.js)
│   │   ├── commands/                 #   CLI command handlers
│   │   │   ├── analyze.ts            #     si analyze
│   │   │   ├── reports.ts            #     si reports
│   │   │   ├── findings.ts           #     si findings
│   │   │   ├── risk.ts               #     si risk
│   │   │   ├── attack.ts             #     si attack
│   │   │   ├── recommendation.ts     #     si recommendation
│   │   │   ├── explain.ts            #     si explain
│   │   │   ├── persistence.ts        #     si persistence
│   │   │   ├── config.ts             #     si config
│   │   │   └── server.ts             #     si server
│   │   ├── output/                   #   Output formatting
│   │   ├── progress/                 #   Progress bar rendering
│   │   ├── config/                   #   CLI config management
│   │   ├── client/                   #   CLI API client wrapper
│   │   └── index.ts                  #   CLI entry point
│   │
│   ├── domain/                       # Domain layer (business logic)
│   │   └── security-intelligence/    #   Core SI engine
│   │       ├── normalization/        #     Finding normalizer
│   │       ├── correlation/          #     Finding correlator
│   │       ├── knowledge-graph/      #     Knowledge graph builder
│   │       ├── risk/                 #     Risk assessment engine
│   │       ├── attack-path/          #     Attack path builder
│   │       ├── impact/               #     Impact assessment engine
│   │       ├── recommendation/       #     Recommendation engine
│   │       ├── explainability/       #     Explainability engine
│   │       ├── persistence/          #     Persistence layer
│   │       ├── orchestrator/         #     Pipeline orchestrator
│   │       └── index.ts              #     Domain barrel export
│   │
│   ├── infrastructure/               # Infrastructure layer
│   │   ├── plugins/                  #   Plugin engine
│   │   │   ├── types.ts              #     Plugin interfaces & extension points
│   │   │   ├── plugin-engine.ts      #     PluginEngine class
│   │   │   └── index.ts              #     Barrel export
│   │   ├── ai/                       #   AI modules
│   │   │   ├── copilot/              #     AI Copilot
│   │   │   ├── risk-assistant/       #     Risk Assistant
│   │   │   ├── threat-hunting/       #     Threat Hunting
│   │   │   ├── remediation/          #     AI Remediation
│   │   │   └── llm/                  #     LLM providers
│   │   ├── auth/                     #   Authentication & RBAC
│   │   ├── config/                   #   Configuration engine
│   │   ├── observability/            #   Logging, metrics, tracing
│   │   ├── streaming/                #   Streaming engine
│   │   ├── event-bus/                #   Event bus
│   │   ├── cluster/                  #   Cluster coordination
│   │   ├── multi-tenancy/            #   Multi-tenancy engine
│   │   ├── scheduler/                #   Job scheduler
│   │   ├── analytics/                #   Analytics engine
│   │   ├── audit/                    #   Audit engine
│   │   ├── saga/                     #   Saga orchestrator
│   │   ├── detection/                #   Detection engine
│   │   ├── attack-sim/               #   Attack simulation
│   │   ├── threat-intel/             #   Threat intelligence
│   │   ├── data-lake/                #   Data lake
│   │   ├── brokers/                  #   Message brokers
│   │   ├── jobs/                     #   Job engine
│   │   ├── security/                 #   Security hardening
│   │   ├── distributed-pipeline/     #   Distributed pipeline
│   │   ├── platform/                 #   Platform engine
│   │   ├── cloud/                    #   Cloud integrations
│   │   ├── enterprise/               #   Enterprise integrations
│   │   │   ├── notification/         #     Notifications
│   │   │   ├── sso/                  #     SSO providers
│   │   │   ├── cmdb/                 #     CMDB connectors
│   │   │   ├── ticketing/            #     Ticketing integrations
│   │   │   ├── siem/                 #     SIEM connectors
│   │   │   └── secrets/              #     Secrets management
│   │   └── ...
│   │
│   └── tests/                        # Test files
│       └── benchmarks/               #   Performance benchmarks
│
├── docs/                             # Documentation
│   ├── sdk/                          #   SDK documentation
│   ├── plugins/                      #   Plugin development guide
│   ├── modules/                      #   Module documentation (INT-001..INT-020)
│   ├── architecture/                 #   Architecture docs
│   ├── 00_governance/                #   Governance docs
│   ├── 01_architecture/              #   Architecture RFCs and reviews
│   ├── diagrams/                     #   SVG diagrams
│   └── assets/                       #   PDF/HTML assets
│
├── deploy/                           # Deployment configs
│   └── systemd/                      #   Systemd service file
├── helm/                             # Kubernetes Helm chart
│   └── si-platform/
├── Dockerfile                        # Container image
├── docker-compose.yml                # Local development stack
├── package.json                      # Node.js project config
├── tsconfig.json                     # TypeScript configuration
├── bun.lock                          # Bun lockfile
├── README.md                         # Project README
├── CHANGELOG.md                      # Release changelog
├── CONTRIBUTING.md                   # This file
└── INDEX.md                          # Documentation index
```

### Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│                     CLI / API                        │  ← Entry points
├─────────────────────────────────────────────────────┤
│                    Domain Layer                      │  ← Business logic
│  (normalization → correlation → risk → attack-path  │
│   → impact → recommendation → explain → report)     │
├─────────────────────────────────────────────────────┤
│                Infrastructure Layer                  │  ← Technical concerns
│  (plugins, auth, config, observability, AI, ...)    │
└─────────────────────────────────────────────────────┘
```

Dependencies flow **downward only**: CLI/API → Domain → Infrastructure. The domain layer must never import from the CLI or API layers.

---

## Coding Style

### TypeScript

We use **strict TypeScript** with all strict-mode checks enabled:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Key rules:

1. **No `any`** — Use `unknown` and type guards instead. If you must use `any`, add a `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment with justification.

2. **Explicit return types** — All public functions and methods must have explicit return type annotations.

3. **Interfaces over type aliases** — Use `interface` for object shapes. Use `type` for unions, intersections, and utility types.

4. **ESM modules** — The project uses ES modules (`"type": "module"` in `package.json`, `"module": "Node16"` in tsconfig). Use `import`/`export` syntax. Add `.js` extensions in imports for TypeScript compatibility.

5. **Barrel exports** — Each module has an `index.ts` that re-exports public APIs. Import from barrel files, not individual files.

6. **Naming conventions**:
   - `PascalCase` for classes, interfaces, types, and enums
   - `camelCase` for functions, methods, variables, and properties
   - `UPPER_SNAKE_CASE` for constants
   - Prefix private fields with `_` only when a public getter exists

7. **Error handling** — Throw custom error classes (e.g., `SiApiError`), not plain `Error`. Always include context in error messages.

8. **Async/await** — Prefer `async/await` over `.then()/.catch()`. Always handle promise rejections.

### ESLint

Run the linter before committing:

```bash
npm run lint
```

The project uses ESLint v9 with the TypeScript plugin. All lint errors must be fixed before merging.

### Import Order

Organize imports in this order:

```typescript
// 1. Node.js built-ins
import { readFileSync } from 'fs';

// 2. External packages
import { FastifyInstance } from 'fastify';

// 3. Internal modules — domain
import type { SecurityIntelligenceReport } from '../../domain/security-intelligence/orchestrator/types.js';

// 4. Internal modules — infrastructure
import { PluginEngine } from '../../infrastructure/plugins/index.js';

// 5. Relative imports
import { formatRisk } from './utils.js';
```

---

## Testing

### Test Framework

We use **Vitest** as the test runner:

```bash
# Run all tests once
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Writing Tests

Test files should be placed alongside the source files they test, with a `.test.ts` extension:

```
src/domain/security-intelligence/risk/
├── risk-engine.ts
├── risk-engine.test.ts    ← Test file
├── types.ts
└── index.ts
```

### Test Structure

Follow the **Arrange-Act-Assert** pattern:

```typescript
import { describe, it, expect } from 'vitest';
import { RiskEngine } from './risk-engine.js';

describe('RiskEngine', () => {
  describe('assess', () => {
    it('should return critical risk for CVSS score >= 9.0', () => {
      // Arrange
      const engine = new RiskEngine();
      const finding = { severity: 'critical', cvssScore: 9.8 };

      // Act
      const result = engine.assess(finding);

      // Assert
      expect(result.level).toBe('critical');
      expect(result.score).toBeGreaterThanOrEqual(0.9);
    });

    it('should handle findings without CVSS scores', () => {
      const engine = new RiskEngine();
      const finding = { severity: 'medium' };

      const result = engine.assess(finding);

      expect(result.level).toBe('medium');
      expect(result.score).toBeGreaterThan(0);
    });
  });
});
```

### Testing Guidelines

1. **Unit tests** — Every public function and class must have unit tests. Aim for >80% code coverage.

2. **Test naming** — Use descriptive test names that read as sentences: `"should return 404 for non-existent report"`.

3. **No test interdependence** — Each test must be independent and idempotent. Use `beforeEach`/`afterEach` for setup and teardown.

4. **Mock external dependencies** — Use `vi.fn()`, `vi.mock()`, and `vi.spyOn()` for mocks. Never call real APIs or databases in unit tests.

5. **Test error paths** — Don't just test the happy path. Test error conditions, edge cases, and boundary values.

6. **Type safety in tests** — Tests are TypeScript too. Avoid `as any` casts in tests; create proper test fixtures.

### Test Coverage

We track code coverage with the following thresholds:

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Functions | 80% |
| Branches | 75% |
| Statements | 80% |

Run coverage with:

```bash
npm run test:coverage
```

---

## Git Workflow

### Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feat/<description>` | `feat/attack-path-graph` |
| Bug fix | `fix/<description>` | `fix/risk-score-overflow` |
| Documentation | `docs/<description>` | `docs/sdk-reference` |
| Refactor | `refactor/<description>` | `refactor/correlation-engine` |
| Test | `test/<description>` | `test/risk-engine-unit` |
| Chore | `chore/<description>` | `chore/update-dependencies` |

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring, no behavior change |
| `test` | Adding or updating tests |
| `chore` | Build, CI, dependencies |
| `perf` | Performance improvement |

Examples:

```
feat(risk): add CVSS v3.1 scoring support
fix(correlation): resolve duplicate finding pairs in correlator
docs(sdk): add Python SDK method reference
test(attack-path): add unit tests for path builder
chore(deps): update fastify to v5.2.0
```

### Commit Hygiene

- **One logical change per commit** — Don't mix features and fixes.
- **Commits must compile** — Every commit on the main branch must pass `npm run build`.
- **Tests must pass** — Every commit must pass `npm test`.

---

## Pull Request Process

### Before Submitting

1. **Rebase on main** — Ensure your branch is up to date:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all checks locally**:
   ```bash
   npm run lint
   npm test
   npm run build
   ```

3. **Write a clear PR description** including:
   - What changes were made and why
   - Link to any related issues
   - Breaking changes (if any)
   - Testing instructions

### PR Checklist

Before a PR can be merged, it must satisfy all of the following:

- [ ] All lint checks pass (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] New code has unit tests
- [ ] Test coverage remains above thresholds
- [ ] No `any` types without justification
- [ ] Public APIs have JSDoc comments
- [ ] Breaking changes are documented
- [ ] CHANGELOG.md updated (for user-facing changes)

### Review Process

1. **Automated checks** — CI must pass before review begins.
2. **Code review** — At least one maintainer must approve.
3. **Address feedback** — Respond to all review comments, even if just acknowledging.
4. **Squash merge** — PRs are squash-merged to maintain a clean history.

### PR Size Guidelines

| Size | Lines Changed | Recommendation |
|------|---------------|----------------|
| Small | < 200 | Ideal — quick to review |
| Medium | 200–500 | Acceptable — may need 2 reviewers |
| Large | 500–1000 | Consider splitting into smaller PRs |
| Extra Large | > 1000 | Must be split before review |

---

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** (X.0.0): Breaking API changes
- **MINOR** (1.X.0): New features, backward-compatible
- **PATCH** (1.0.X): Bug fixes, backward-compatible

### Release Checklist

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with all changes since last release
3. **Run full test suite**: `npm run test:coverage`
4. **Build**: `npm run build`
5. **Create a git tag**: `git tag v1.x.x`
6. **Push tag**: `git push origin v1.x.x`
7. **Create GitHub Release** with changelog entries
8. **Build and push Docker image** (if applicable)

### Changelog Format

```markdown
## [1.2.0] - 2024-01-15

### Added
- Attack graph visualization endpoint
- Python SDK snapshot management methods

### Changed
- Risk engine now uses weighted scoring by default
- Updated Fastify to v5.2.0

### Fixed
- Fixed duplicate correlation pairs in correlator
- Fixed timeout handling in TypeScript SDK

### Breaking
- Removed deprecated `/api/v1/scan` endpoint (use `/api/v1/analyze`)
```

---

## Architecture Principles

### 1. Separation of Concerns

The codebase follows a strict layered architecture:

- **CLI/API layer** — Handles input/output, routing, and HTTP concerns
- **Domain layer** — Pure business logic with no external dependencies
- **Infrastructure layer** — Technical implementations (databases, AI, plugins, auth)

Dependencies flow **downward only**. The domain layer must never import from CLI, API, or infrastructure.

### 2. Pipeline Architecture

The core analysis engine is a pipeline of stages:

```
normalize → correlate → knowledge-graph → risk → attack-path → impact → recommendation → explain → report
```

Each stage:
- Accepts a well-typed input
- Produces a well-typed output
- Emits events for observability
- Is independently testable

### 3. Plugin-First Extensibility

All customization should go through the plugin system rather than modifying core code. The 8 extension points (`correlation-rule`, `risk-factor`, `recommendation-rule`, `cli-command`, `rest-endpoint`, `persistence-provider`, `analysis-stage`, `output-formatter`) cover the full analysis lifecycle.

### 4. Type Safety

We use TypeScript's strict mode with additional compiler checks. Every public API has explicit types. DTOs are used at the API boundary; domain types are used internally. Mappers convert between the two.

### 5. Zero-Dependency SDKs

All three SDKs (TypeScript, Python, Go) are designed to have zero external dependencies. They use only platform-native HTTP clients (`fetch`, `urllib`, `net/http`). This makes them easy to embed in any environment.

### 6. Fail Fast

The platform validates input early (Zod schemas at the API boundary) and reports errors immediately. Use the `SiApiError` class for all API-level errors with proper status codes and messages.

### 7. Observability

All operations are observable through the structured logging, metrics, and tracing infrastructure. Use the `PluginLogger` in plugins and the platform logger in core code.

### 8. Async by Default

All I/O operations are asynchronous. The analysis pipeline uses async generators and event emitters for streaming results. Long-running operations return `202 Accepted` with polling URLs.

---

## Reporting Issues

### Bug Reports

When reporting a bug, please include:

1. **Description** — Clear description of the issue
2. **Steps to reproduce** — Minimal, step-by-step instructions
3. **Expected behavior** — What should have happened
4. **Actual behavior** — What actually happened
5. **Environment** — Node.js version, OS, platform version
6. **Logs** — Relevant log output (sanitize any sensitive data)
7. **Workaround** — If you found one, share it

### Feature Requests

For feature requests, please include:

1. **Use case** — What problem does this solve?
2. **Proposed solution** — How should it work?
3. **Alternatives considered** — What other approaches did you consider?
4. **SDK impact** — Does this require changes to any of the SDKs?

### Security Vulnerabilities

**Do not report security vulnerabilities through public GitHub issues.** Instead, report them privately to the project maintainers. Include:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if available)

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

---

Thank you for contributing to the Security Intelligence Platform! Your efforts help make security analysis more intelligent and accessible for everyone.
