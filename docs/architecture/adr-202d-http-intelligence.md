# ADR-202D: HTTP Intelligence Engine as Independent Platform Module

## Status: Accepted
## Date: 2026-07-15
## Author: Principal Application Security Engineer

---

## Context

The Scan Platform Execution Core is complete (TASK-201, 202A-F, 202P). Discovery and Browser Intelligence provide knowledge about application structure and client-side behavior. HTTP Intelligence fills a critical gap: there is no systematic, intelligent analysis of HTTP protocol behavior that builds a comprehensive security profile.

## Decision

Design and implement HTTP Intelligence as a standalone, independent module within the platform. The module must integrate exclusively through existing Plugin API and Artifact Bus interfaces — zero modifications to core.

## Consequences

### Positive
- HTTP Intelligence becomes a reusable, independently deployable component
- Future: can be extracted as a separate commercial product (Continuous Monitoring, Baseline Comparison, Drift Detection, API Security Profiling)
- Teams can use HTTP Intelligence independently or compose it with other engines
- Clean separation of concerns via ScanEnginePlugin interface

### Negative
- Additional module to maintain in the monorepo
- Must synchronize interface changes with core team
- Test suite adds to CI pipeline duration

## Architecture

### Module Structure
```
engines/http-intelligence/
├── index.ts                    # Barrel exports
├── http-types.ts              # All types (TLS, Headers, Cookies, etc.)
├── http-intelligence-adapter.ts # ScanEnginePlugin implementation
├── http-client.ts             # HTTP client with pool, DNS cache, rate limiter
├── tls-intelligence.ts         # TLS analysis, grading (A+ through F)
├── security-headers.ts         # Security header correctness evaluation
├── http-behaviour.ts          # Redirect, caching, compression, error pages
├── infra-fingerprinting.ts     # CDN, WAF, web server, framework, cloud
├── cookie-intelligence.ts      # Cookie security analysis with prefix compliance
├── rate-limiting.ts           # Non-aggressive rate limit detection
├── http-artifacts.ts          # 8 artifact categories → Artifact Bus
├── stage-handler.ts           # Pipeline bridge (StageHandler factory)
└── __tests__/
    └── http-intelligence.test.ts  # 156 tests
```

### Integration Points
- **Plugin API**: HttpIntelligenceAdapter implements ScanEnginePlugin (5 methods)
- **Artifact Bus**: 8 new artifact categories mapped to existing ArtifactCategory enum via key prefixes
- **Pipeline**: StageHandler bridge connects to PipelineExecutor without core changes
- **Shared Context**: Fork-on-write updates via Metadata artifact category

### Key Design Patterns
1. **Strategy Pattern** (implied for future auth extensions)
2. **Fingerprint Rules Engine** — declarative rule arrays for infrastructure detection
3. **Injectable HTTP Client** — IHttpClient interface with MockHttpClient for testing
4. **Connection Pooling** — reuse connections, DNS caching, rate limiting
5. **Immutable Artifacts** — all published data is frozen

### Future Standalone Product Roadmap
- Continuous HTTP Monitoring
- Baseline Comparison & Drift Detection
- API Security Profiling
- Export as separate microservice with gRPC/REST API