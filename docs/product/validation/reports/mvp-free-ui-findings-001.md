# TASK-MVP-FREE-UI-001 — Findings Report

**Task**: Minimal Web UI for Free MVP
**Date**: 2026-08-27
**HEAD**: `84a5c51` (+ uncommitted MVP-UI changes)
**Status**: **CONDITION** — BLOCKED on OPENAI_API_KEY

---

## Executive Summary

The MVP UI is architecturally complete and correctly wired:
`SPA → HTTP Adapter → InteractionService → EvidenceLoopService → ExecutionEngine → CognitiveRuntime → OpenAI`.

All code changes respect the Code Freeze (§32): zero modifications to `src/core/`.
Security invariants S-01/S-02/S-03 are enforced. Feedback flows through
InteractionService → EvidenceLoopService (not localStorage). Error responses
never contain stack traces.

**BLOCKER**: Real end-to-end inference requires `OPENAI_API_KEY`, which is not
available in the current environment. The system now **honestly refuses** to
return fake/empty results (503), implementing the DEMO ≠ FAKE principle (§8, §13).

---

## Critical Fix Applied: DEMO ≠ FAKE (§8, §13)

**Before**: When env vars were not set, `ExecutionEngine.execute()` returned `{}` as `T`.
The InteractionService recorded an empty answer (`undefined`), zero claims, zero evidence.
The user saw a blank response — indistinguishable from a real but failed inference.

**After**:
1. `index.ts` validates env vars at startup, logs clear diagnostics
2. `HttpAdapter` accepts `realInferenceAvailable` flag
3. When `realInferenceAvailable=false`, `POST /api/session/:id/question` returns **503**
   with a clear message: "Real inference is not available. Set AIS_EXECUTION_REAL=true, AIS_REAL_LLM=true, and OPENAI_API_KEY."
4. SPA handles 503 and shows the error to the user

---

## Reality Check (§44)

| # | Check | Finding | Status |
|---|-------|---------|--------|
| RC-01 | HEAD | `84a5c51` on `main`, working tree has MVP-UI changes | PASS |
| RC-02 | Existing UI (`src/ui/`) | Desktop stubs — NOT reusable for web | FORBIDDEN |
| RC-03 | Build system | `tsc` only, no bundler for `src/` | PASS |
| RC-04 | HTTP infrastructure | Created `src/mvp-ui/http-adapter.ts` — Node.js built-in `http` | PASS |
| RC-05 | InteractionService | 5 methods, 40 tests pass | PASS |
| RC-06 | Evidence invariants | I-01→I-13, 41 tests pass | PASS |
| RC-07 | Dependencies | ZERO new dependencies added | PASS |
| RC-08 | Demo candidate | AIS self-analysis (37 modules) | PASS |
| RC-09 | Source access | File system — `readFileSync`, `join` from `node:path` | PASS |
| RC-10 | Existing tests | 88 core tests pass, 0 regressions | PASS |

---

## Design Check (§45)

| Component | Decision | Rationale |
|-----------|----------|----------|
| HTTP framework | Node.js `http` (built-in) | ZERO new dependencies (§22, §31) |
| Frontend | Vanilla HTML/CSS/JS | Single HTML file, no build step |
| SPA routing | Screen toggle (`showScreen()`) | 6 screens, no router needed |
| State management | Module-level variables | `currentSessionId`, `isDemo` |

---

## Security (§28-30)

| Invariant | Implementation | Status |
|-----------|---------------|--------|
| S-01 Path traversal | `PathSecurityService` — resolve, normalize, check roots | PASS |
| S-02 Demo isolation | Demo allowlist, separate from allowedRoots | PASS |
| S-03 Pattern blocking | `..`, `%2e%2e`, `%252e`, `\\`, `//` blocked | PASS |
| §19 No stack traces | `mapError()` → safe messages only | PASS |
| §20 Secret sanitization | `sanitizeSecrets()` in EvidenceLoopService | PASS (inherited) |
| Body size limit | 1MB max request body | PASS |
| Input validation | JSON parse, type checks, 10k char limit | PASS |
| 503 guard | Refuses fake results when inference unavailable | PASS |

---

## Test Results (§36)

| Suite | Tests | Status |
|-------|-------|--------|
| Path Security (unit) | 17 | ALL PASS |
| HTTP Adapter (HTTP layer) | 16 | ALL PASS |
| Interaction Layer (core) | 40 | ALL PASS (no regression) |
| Evidence Loop (core) | 41 | ALL PASS (no regression) |
| Execution Engine (core) | 7 | ALL PASS (no regression) |
| **Total** | **121** | **ALL PASS** |

---

## Files

### New Files (MVP-UI only — zero core changes)
- `src/mvp-ui/index.ts` — Entry point, env var validation, component wiring
- `src/mvp-ui/http-adapter.ts` — HTTP server, 7 routes, 503 guard, CORS, error mapping
- `src/mvp-ui/path-security.ts` — Path traversal protection (S-01, S-02, S-03)
- `src/mvp-ui/demo-config.ts` — Demo project (AIS self-analysis)
- `mvp-ui/index.html` — SPA (6 screens: Start, Question, Processing, Response, Feedback, Trace)
- `src/__tests__/mvp-ui/http-adapter.test.ts` — 16 tests (routing, validation, 503 guard)
- `src/__tests__/mvp-ui/path-security.test.ts` — 17 tests (S-01, S-02, S-03)

### NOT Modified (Code Freeze §32)
- `src/core/` — Zero changes

---

## Architecture Boundary Verification

| Check | Result |
|-------|--------|
| mvp-ui imports from `dist/` | NONE — all from `../core/` (source) |
| AIS code duplicated in mvp-ui | NONE |
| UI bypasses InteractionService | NO — all via HTTP adapter |
| Feedback stored in localStorage | NO — via InteractionService → EvidenceLoopService |
| Direct EvidenceLoop/Engine calls from UI | NO — HTTP adapter only |

---

## BLOCKER: Real Inference

**Condition**: `OPENAI_API_KEY` environment variable is not available.

**Impact**:
- AC-03 (Real inference pipeline): **BLOCKED** — cannot verify end-to-end
- AC-05 (Claims from real sources): **BLOCKED** — no real sources without inference
- AC-16 (E2E smoke test): **BLOCKED** — cannot complete full flow

**Mitigation Applied**:
- Server returns 503 with clear diagnostic message
- No fake/mock data returned to user
- Architecture is correct — unblocks when API key is provided

**To unblock**:
```bash
AIS_EXECUTION_REAL=true AIS_REAL_LLM=true OPENAI_API_KEY=sk-... npx tsx src/mvp-ui/index.ts
```

---

## Known Limitations

1. **BLOCKED: No real inference** — requires `OPENAI_API_KEY` (see above)
2. **No persistence** — in-memory sessions only (MVP constraint)
3. **CORS wildcard** — `*` for MVP; restrict in production
4. **No authentication** — acceptable for free MVP
5. **Single question per session** — FSM design (one question → feedback → trace → new session)
6. **No streaming** — full response at once
7. **No automated E2E test** — requires real inference environment

---

## How to Run

```bash
cd ais
npx tsc
AIS_EXECUTION_REAL=true AIS_REAL_LLM=true OPENAI_API_KEY=sk-... npx tsx src/mvp-ui/index.ts
# Open http://localhost:3456
```

Without API key (server starts but returns 503 for questions):
```bash
cd ais
npx tsc
npx tsx src/mvp-ui/index.ts
# Sessions can be created, but questions return 503
```
