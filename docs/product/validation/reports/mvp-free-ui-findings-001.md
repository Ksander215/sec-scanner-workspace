# TASK-MVP-FREE-UI-001 — Reality Check & Design Check Findings

**Task**: Minimal Web UI for Free MVP
**Date**: 2026-08-27
**HEAD**: `84a5c51`
**Status**: PASS

---

## Reality Check (§44)

| # | Check | Finding | Status |
|---|-------|---------|--------|
| RC-01 | HEAD | `84a5c51` on `main`, clean working tree | PASS |
| RC-02 | Existing UI (`src/ui/`) | Desktop stubs — `render(): string`. NOT reusable for web (wrong paradigm) | FORBIDDEN |
| RC-03 | Build system | `tsc` only, `module: "Node16"`, no bundler for `src/` | PASS |
| RC-04 | HTTP infrastructure | `backend/` = SIP (Express), `landing/` = Next.js landing. NO HTTP for InteractionService | GAP → Created |
| RC-05 | InteractionService | 5 methods, 40 tests pass | PASS |
| RC-06 | Evidence invariants | I-01→I-13, 41 tests pass | PASS |
| RC-07 | Dependencies | `@types/node`, `typescript`, `vitest`, `openai` (optional). ZERO new deps added | PASS |
| RC-08 | Demo candidate | AIS self-analysis (the `ais/` project itself) | PASS |
| RC-09 | Source access | File system — `readFileSync`, `join` from `node:path` | PASS |
| RC-10 | Existing tests | 81 core tests pass, 0 regressions after changes | PASS |

### RC-04 Resolution
Created `src/mvp-ui/http-adapter.ts` — minimal HTTP server using Node.js built-in `http` module. No Express, Hono, or any framework. 6 endpoints.

### RC-02 Decision
Existing `src/ui/` screens are desktop stub classes with `render(): string` returning a label. They use no web APIs, no DOM, no HTTP. **Decision: FORBIDDEN to reuse** — wrong paradigm entirely.

---

## Design Check (§45)

| Component | Decision | Rationale |
|-----------|----------|----------|
| HTTP framework | Node.js `http` (built-in) | ZERO new dependencies. MVP minimalism (§22, §31) |
| Frontend framework | None (vanilla HTML/CSS/JS) | No build step, no bundler, no framework. Single HTML file. |
| CSS framework | None (inline `<style>`) | Embedded in HTML. ~100 lines of CSS. |
| Bundler | None | `tsc` only for TypeScript. HTML served as-is. |
| SPA routing | Hash-based screen toggle | 6 screens, `showScreen()` toggles visibility. No router needed. |
| State management | Module-level variables | `currentSessionId`, `isDemo`. Sufficient for single-session MVP. |

### Component Reuse Summary

| Source | Reusable? | Reason |
|--------|-----------|--------|
| `src/ui/` screens | NO | Desktop stubs, no web API |
| `landing/` (Next.js) | NO | Product landing page, not interactive |
| `backend/` (Express) | NO | SIP server, not AIS |
| `packages/ui/` | NO | React 18 SIP components, not AIS |
| `InteractionService` | YES | Direct use via HTTP adapter |
| `EvidenceLoopService` | YES | Wired through InteractionService |
| `PathSecurityService` | NEW | Required for §28-30 security |

---

## Endpoints (§22 — Minimal Set)

| Method | Path | Maps to | Notes |
|--------|------|---------|-------|
| POST | `/api/session` | `startInteraction()` | Validates path via PathSecurityService |
| POST | `/api/session/:id/question` | `submitQuestion()` | 10k char limit, trim whitespace |
| POST | `/api/session/:id/feedback` | `submitFeedback()` | Validates verdict enum |
| GET | `/api/session/:id/trace` | `getTrace()` | Synchronous method |
| GET | `/api/session/:id` | `getSessionView()` | Session state recovery |
| GET | `/api/demos` | `getAllDemoConfigs()` | Demo project metadata |
| GET | `/` | SPA HTML | Single-page app |
| OPTIONS | `*` | CORS preflight | Configurable origin |

**§22 assessment**: 5 API endpoints + 1 metadata + 1 static + 1 preflight. Cannot reduce further without breaking AC-16 E2E flow.

---

## Security (§28-30)

| Invariant | Implementation | Status |
|-----------|---------------|--------|
| S-01 Path traversal | `PathSecurityService.validateProjectPath()` — resolves, normalizes, checks against allowed roots | PASS |
| S-02 Demo isolation | Demo allowlist, separate from allowedRoots | PASS |
| S-03 Pattern blocking | `..`, `%2e%2e`, `%252e`, `\\`, `//` patterns blocked | PASS |
| §19 No stack traces | `mapError()` maps all errors to safe messages | PASS |
| §20 Secret sanitization | Delegated to `sanitizeSecrets()` in EvidenceLoopService | PASS (inherited) |
| CORS | Configurable `corsOrigin`, defaults to `*` for MVP | PASS |
| Body size limit | 1MB max request body | PASS |
| Input validation | JSON parse, type checks, field requirements | PASS |

---

## Test Results (§36)

| Suite | Tests | Status |
|-------|-------|--------|
| Path Security (unit) | 17 | ALL PASS |
| HTTP Adapter (integration) | 14 | ALL PASS |
| Interaction Layer (existing) | 40 | ALL PASS (no regression) |
| Evidence Loop (existing) | 41 | ALL PASS (no regression) |
| **Total** | **112** | **ALL PASS** |

---

## Files Created/Modified

### New Files
- `src/mvp-ui/path-security.ts` — Path traversal protection (S-01, S-02, S-03)
- `src/mvp-ui/demo-config.ts` — Demo project configuration
- `src/mvp-ui/http-adapter.ts` — HTTP server, 7 routes, CORS, error mapping
- `src/mvp-ui/index.ts` — Entry point, wires SessionRuntime → EvidenceLoop → InteractionService → HttpAdapter
- `mvp-ui/index.html` — Single-page app (4 screens: Start, Question, Response+Feedback, Trace)
- `src/__tests__/mvp-ui/path-security.test.ts` — 17 unit tests
- `src/__tests__/mvp-ui/http-adapter.test.ts` — 14 integration tests

### Modified Files
- `package.json` — Added `test:mvp-ui` and `mvp-ui` scripts

### NOT Modified (Code Freeze §32)
- `src/core/interaction-layer/` — No changes
- `src/core/evidence-loop/` — No changes (I-01→I-13 preserved)
- `src/core/engine/` — No changes
- `src/core/session/` — No changes

---

## Known Limitations

1. **No real inference without env vars** — `AIS_EXECUTION_REAL=true` + `AIS_REAL_LLM=true` + `OPENAI_API_KEY` required for real answers
2. **No persistence** — Sessions are in-memory only (MVP constraint)
3. **CORS wildcard** — `*` origin for MVP; restrict in production
4. **No authentication** — Acceptable for limited free MVP release
5. **Single session** — FSM supports one question per session; "Ask another" creates new session
6. **No streaming** — Full response returned at once
7. **Port hardcoded** — Default 3456, configurable via `MVP_UI_PORT`

---

## How to Run

```bash
cd ais
npm run build
AIS_EXECUTION_REAL=true AIS_REAL_LLM=true OPENAI_API_KEY=sk-... npm run mvp-ui
# Open http://localhost:3456
```

For testing (no real LLM):
```bash
cd ais
npm run build
npm run mvp-ui
# Sessions work but answers will be empty without real LLM
```
