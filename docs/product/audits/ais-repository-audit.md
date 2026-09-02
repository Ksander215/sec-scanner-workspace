# AIS — Independent Repository Audit Report

**Repository:** `Ksander215/sec-scanner-workspace` (cloned from GitHub, HEAD `d0649c3`, branch `main`)
**Audit date:** 2026-09-02 · **Audit type:** Deep / Comprehensive · **Method:** Evidence-only, read-only; no source, architecture, or repository state modified
**Verification actually performed by the auditor:** full clone (304 commits, 28 tags), `npm install`, `npx tsc --noEmit`, `npm run build`, `npx vitest run` (full suite), live execution of the MVP-UI HTTP server and probing of its endpoints, module-by-module source tracing with file:line citations.

> Classification vocabulary used throughout: `IMPLEMENTED` · `PARTIAL` · `CONTRACT_ONLY` · `DOCUMENTED_ONLY` · `STUB` · `MISSING` · `UNKNOWN`. "Wired" = reachable from a user-facing runtime path (MVP-UI server → interaction layer → execution engine). Evidence marked `file:line` refers to repository paths at HEAD.

---

## 1. Executive Summary

The repository is **not** a conventional "AIS product repo". It is a multi-product workspace: (a) the **SIP Security Intelligence Platform** (`landing/`, `backend/`, `plugins/`, `packages/` — a security scanner with its own README, live site sec-scanner.pro), (b) the **AIS Execution Engine** (`src/` — root `package.json` is `@ais/core` 0.1.0, "AIS Execution Engine — Adaptive Intelligence System core runtime"), (c) an extensive **specification and validation corpus** (`docs/` — 4 AIS architecture specs, 12 product capability specs, 30+ validation reports), (d) agent skills (`skills/`, 1,053 files — coding-agent tooling, not AIS product code), and (e) launch materials.

**AIS today is one real vertical slice on top of a large, mostly unwired engine skeleton.** The verified-real capabilities are:

1. **A runnable local web UI** (`node dist/mvp-ui/index.js` — verified by the auditor: serves "AIS — Understand Any Codebase" at `http://localhost:3456`, responds to `/api/demos`, `/api/session`, insight routes) — with an enforced `DEMO != FAKE` policy: question-answering returns HTTP 503 unless real inference credentials are configured (`src/mvp-ui/http-adapter.ts:388-395`).
2. **A real, end-to-end question-answering pipeline in "real mode"** (3 env flags + OpenAI-compatible key): discovery scan of the actual filesystem → question-driven ArchitectureGraph retrieval → **real source-code excerpts read from disk** → OpenAI chat completion → evidence record with the actual snippets → retrievable trace. A real inference run through OpenRouter is documented in `docs/product/validation/reports/wave1-real-inference-execution-002.md` ("PASS WITH CONDITIONS" — the report itself states answer quality was below the honest-validation threshold).
3. **A fully implemented and persisted Insight/Idea lifecycle** (10-state FSM, atomic JSON file persistence, 7 HTTP routes, SPA screen, the strongest test file in the repo) — the single capability where backend, persistence, UI, and tests all agree.
4. **A large body of real-but-unwired engine code**: 73,159 LOC in `src/core` across ~40 modules, 18,591 tests (18,587 passing) — session/memory/checkpoint/context/knowledge/evolution/compliance/experience/provider runtimes that are exercised only by their own unit tests and by nothing user-facing.

**Verified defects at HEAD:** `tsc --noEmit` fails with **25 errors** (evidence-loop 11, autonomous-architecture 9, interaction-layer 4, engine 1) — including non-existent identifiers (`IntentId`, `FindingId`…) in `evidence-loop-service.ts`; `npm run build` exits 2; **4 tests fail** (`architecture-graph-analysis.test.ts`). The worklog's historical claim of "TypeScript Strict: ZERO errors, ZERO warnings" is a **CONFLICT WITH HISTORICAL CLAIM**.

**The decisive pattern:** specification quality is high, engine plumbing is broad and internally tested, but **continuity does not survive a process restart** (sessions, evidence loop, memory, checkpoints, goals, decisions are all in-memory; the one disk store's session-capture bridge is dead code), and **most of the 16 capability areas exist as isolated, unwired runtimes** rather than product behavior.

---

## 2. Capability Inventory

Baseline = the 16 capability areas supplied in the audit task, verified against repository evidence. MVP boundary per spec = 8 capabilities (`docs/product/capability-map.md §5`, confirmed by `ais-capability-interaction-architecture-specification.md §3`).

| # | Capability | Verdict | Wired to user? | Persistence | Core evidence |
|---|---|---|---|---|---|
| 1 | Project/context understanding | **PARTIAL** | Yes (real mode only) | Discovery output in-memory per request | `discovery-pipeline.service.ts:141-378`; `execution-engine.ts:233-239, 623-697` |
| 2 | Repository Intelligence | **PARTIAL** (two rival stacks) | Partially | In-memory | engine's graph+excerpts (`execution-engine.ts:329-541`); `KnowledgeRuntime` unwired, fake-fs storage (`knowledge/storage.ts:359-429`) |
| 3 | Evidence & Trust | **PARTIAL** | Trace endpoint only | In-memory (append-only) | `evidence-loop-service.ts:60-75, 127-301`; claims heuristic `interaction-service.ts:330-351` |
| 4 | Goal Intelligence / Integrity | **CONTRACT_ONLY** (at runtime) | No | None (3 parallel in-memory engines) | `personal/goal-runtime.ts` (real FSM, unwired); `goal-planner.ts`; `companion/goal-center.ts` |
| 5 | Context Continuity / Memory | **STUB / PARTIAL** | No | **In-memory only by explicit design** | `mvp-ui/index.ts:84-87` ("no persistence for MVP"); `persistent-memory.ts:24-42` (only Map adapter exists) |
| 6 | Decisions | **STUB** | No | None | `personal/decision-runtime.ts:40-314`, `decision-advisor.ts` — both unwired |
| 7 | Open Questions | **MISSING** (runtime) | No | — | 0 runtime matches for open-question entities; OQ-1..OQ-14 exist only in specs |
| 8 | Insight / Idea Lifecycle | **IMPLEMENTED** | **Yes** | **Atomic JSON files** | `insight-service.ts:65-246`; `project-store.ts:187-201` (fsync+rename); 7 routes `http-adapter.ts:252-306`; tests `insight-lifecycle.test.ts` (508 lines, real tmpdir) |
| 9 | Project Evolution Intelligence | **STUB** | No | In-memory | `bottleneck-detector.ts:30-91` (`detect({})` fabricates one bottleneck); `architecture-optimizer.ts:48` (`Math.random()` impact); zero importers outside `src/core/evolution` |
| 10 | Contextual Web Intelligence | **MISSING** | No | — | No web fetch in `src/core` (grep: only URL regexes in validators); only GitHub repo clone exists (`github-resolver.ts:20,76`) |
| 11 | Adaptation | **STUB** (sandbox FSMs) | No | In-memory | `adaptation-engine.ts:58-212` (apply changes nothing; no consumer); org-adaptation spec unimplemented in runtime |
| 12 | Human Explanation | **PARTIAL** | Trace/evidence yes; explainers no | In-memory | explainability modules templated + standalone (`explainability-center.ts:152-155`); real grounding lives in evidence trace |
| 13 | Convenience / Cognitive Load | **PARTIAL** | UI yes; compression no | In-memory | SPA flow + suggested questions (`mvp-ui/index.html`, 1,347 lines); `context-compression.ts` strategies never called in production (`compressIfNeeded` definition-only) |
| 14 | Goal / Ecological Safety | **CONTRACT_ONLY** (enforcement) | No | — | 20 compliance files real but zero importers; zone gate returns hardcoded `true` (`zones/trust-zone-gate.ts:57-71`); `assertActionWithinAutonomy` never invoked |
| 15 | Agent Independence | **PARTIAL** | Yes (OpenAI-compatible only) | Config only | `real-provider-wrapper.ts` (chat+embeddings real, streaming fake :238-253, no tools); other vendors = named stubs (`provider-adapters.ts:146-431`); failover never re-dispatches (`ai-provider/execution-engine.ts:168-197`) |
| 16 | Repeated-use value | **PARTIAL** | Insights yes; history no | Insights only | `/api/recent` returns `recentSessions: []` structurally always (capture path dead: `project-service.ts:41,83` have 0 callers) |

**DISCOVERED CAPABILITY (reported separately, not added to baseline):** *GitHub repository import with path security* — `src/mvp-ui/github-resolver.ts` (GHR-01..GHR-07: URL allow-list, shallow clone, size/time/count limits, no code execution) + `path-security.ts` (allowed-roots + demo allow-list). This is real, tested infrastructure that materially serves capability #1. Also discovered: a **desktop shell foundation** (`src/desktop`, 61 files, ~900 tests, 15 subsystems per `docs/REP-020-AIS.000.md`) — implemented code, unwired to MVP-UI, outside the audited baseline.

## 3. Repository Reality (Concept vs Specification vs Reality)

### 3.1 The three layers

| Layer | Content | Evidence |
|---|---|---|
| **Concept** | "Adaptive project intelligence and memory system that understands a project, preserves context/decisions/ideas, maintains session continuity, reduces cognitive load, adapts, and is agent-independent" (audit brief; mirrored in `docs/architecture/ais-architecture-foundation-specification.md`, PHI-001..004) | Documents only |
| **Specification** | 11 capabilities, 52-section interaction spec with invariants/anti-patterns, 12 product specs, MVP definition with 27-point release checklist, quality & feedback architecture | `docs/architecture/ais-*.md` (6,825 lines), `docs/product/specifications/*.md` (9,000+ lines), `docs/product/mvp-definition.md` |
| **Reality** | One user-reachable vertical slice (repo import → scan → LLM answer with evidence trace), one persisted capability (insights), and ~40 unwired engine runtimes with 18.6k unit tests | Verified by auditor: build/test/server execution + module tracing |

### 3.2 Verified runtime state (executed by the auditor, not taken from reports)

| Check | Result | Evidence |
|---|---|---|
| `npm install` | OK (75 packages; `openai` optional) | — |
| `npx tsc --noEmit` | **FAIL — 25 errors** | evidence-loop 11 (incl. `Cannot find name 'IntentId'/'FindingId'` — code references identifiers that do not exist), autonomous-architecture 9 (unexported types, duplicate `model`), interaction-layer 4, engine 1 |
| `npm run build` | **exit 2** (emits `dist/` anyway since `noEmitOnError` is unset) | — |
| `npx vitest run` | **18,591 tests: 18,587 pass, 4 FAIL** (`src/__tests__/core/autonomous-architecture/architecture-graph-analysis.test.ts` — `ArchitectureNodeKind` not exported; `TypeError: Cannot convert undefined or null to object`) | exit 1 |
| `node dist/mvp-ui/index.js` | **RUNS** — binds `:3456`, prints real-inference diagnostics, demo project "AIS Self-Analysis", clone root `/tmp/ais-repos` | `/tmp/mvpui.log` |
| `GET /` | 200, HTML SPA "AIS — Understand Any Codebase" | 1,347-line `mvp-ui/index.html` |
| `GET /api/demos` | 200, demo metadata + suggested questions | — |
| `GET /api/recent` | 200, `recentSessions: []`, `insightSummary: []` | empty by construction (see §2 #16) |
| Question flow, demo mode | **HTTP 503** by design ("DEMO != FAKE", `http-adapter.ts:388-395`); test-asserted in `src/__tests__/mvp-ui/http-adapter.test.ts:252-260` | — |

### 3.3 What is genuinely user-accessible today

A user who clones the repo can: run the local server, see the SPA, add a GitHub repo URL (public repos; shallow-cloned to `/tmp/ais-repos`), create a session, **and receive real answers only if** they supply `AIS_EXECUTION_REAL=true AIS_REAL_LLM=true OPENAI_API_KEY=…`. Without credentials the server honestly refuses (503) rather than faking. Insight capture/evaluate/decide flows work and survive restart (atomic JSON under `.ais-data/projects/`). Everything else — memory, goals, decisions, evolution, adaptation, safety enforcement, provider failover, knowledge graph intelligence — has **no user-reachable path**.

Two structural user-facing defects found in the real-mode answer path (arithmetic from code, not speculation):
1. **Intent-confidence math blocks or bypasses the LLM.** Confidence = `matches/patterns*0.8 + 0.2` (`intent-runtime.ts:156`), threshold 0.3 (`:113`). A question matching 1 of 11 patterns scores 0.273 → `IntentConfidenceError` → 500. A question like "What is the overall architecture…?" can route to Planning (higher priority, `:179-183`) → canned "Please provide more details." **without ever calling the LLM even in real mode**.
2. **Provenance mislabeling is structural.** Evidence records label the provider/model from env flags (`'openai-real'/'gpt-4o'` vs `'openai-stub'/'stub'`), not from the adapter actually used (`engine/execution-engine.ts:271, 285-286`) — canned non-LLM answers get labeled as if the model produced them.

---

## 4. Gap Analysis (what exists / what does not / why it matters)

Format per brief: exists → missing → why it matters to the user → evidence → priority. P0 = fundamental to AIS identity or blocks the one working flow; P1 = important for the defined product; P2 = valuable but not blocking; P3 = hypothesis-grade.

### G-1 · Continuity does not survive restart — **P0**
- **Exists:** Complete storage-adapter interfaces (`session-store.ts:11`, `persistent-memory.ts:15`, `checkpoint-store.ts:16`, `context-loader.ts:17`); one proven atomic-write pattern (`project-store.ts:187-201`).
- **Missing:** Any file-backed adapter for sessions/memory/checkpoints/context. MVP-UI literally comments "in-memory, no persistence for MVP" (`mvp-ui/index.ts:84-87`) and its shutdown handler flushes nothing (`:131-139`). The dead bridge `ProjectService.captureSessionAnswer` (`project-service.ts:41`) is never called, so `/api/project/:id/history` and `/api/recent` can only return externally seeded data.
- **Why it matters:** "Maintains continuity between sessions" is the defining AIS promise; today every Q&A, evidence trail, and intent dies with the process. Repeated-use value (capability #16) is structurally limited to insights.
- **Evidence:** §2 rows 3/5/16; tests never assert durability (only in-memory round-trips; exceptions: `project-store.test.ts`, `wave1-integration.test.ts:165-191`).

### G-2 · HEAD is red: build broken, tests failing — **P0**
- **Exists:** Historical claims of strict-zero TS and all-green suites (`worklog.md`, Task 10: "5803 tests, all passing; TS strict zero errors").
- **Missing:** 25 TS errors incl. non-existent identifier types in the **newest** commit's module (`evidence-loop-service.ts:69-73`), 4 failing tests in the module that also powers question retrieval (`architecture.graph-analysis.ts`).
- **Why it matters:** The engine's answer path depends on `ArchitectureGraph` (`execution-engine.ts:26`); the pipeline cannot be packaged/released while `tsc` fails, and red tests invalidate every "all green" assurance.
- **Evidence:** §3.2. **CONFLICT WITH HISTORICAL CLAIM** (worklog zero-errors claim vs. auditor-executed `tsc`).

### G-3 · Evidence & Trust loop is in-memory and claim-quality is heuristic — **P0**
- **Exists:** Append-only evidence orchestrator enforcing I-01..I-13 (`evidence-loop-service.ts`), trace endpoint, evidence records containing **real source snippets**.
- **Missing:** Persistence (Map stores, `:60-75`); claims are not extracted from the answer — they are one-per-source with statement = source description ("AIS references {filePath}", `interaction-service.ts:330-351`); provider/model mislabeling (§3.3.2); the module does not typecheck (G-2).
- **Why it matters:** "Evidence & Trust" is AIS's differentiator vs. a generic LLM wrapper; unverifiable, unpersisted evidence undercuts exactly that promise.

### G-4 · Two rival "intelligence" stacks; neither is complete — **P1**
- **Exists:** Stack A (wired): discovery → engine-built ArchitectureGraph → keyword-scored retrieval + real excerpts. Stack B (unwired): `KnowledgeRuntime` + BFS/cycle logic + versioning + retrieval (`knowledge/`), fed by nothing; its "file" storage adapter is a simulated Map ("In a real implementation this would use `fs.writeFile`", `knowledge/storage.ts:393`).
- **Missing:** Any connection: discovery does not feed `KnowledgeGraph`; graph layer assignment is a name-regex (`discovery-pipeline.service.ts:414`); no AST/export parsing ("Wave 1: no export parsing", `:231`).
- **Why it matters:** "Repository Intelligence" currently means regex heuristics over file names + LLM reading of excerpts — acceptable for a prototype, below the spec's Architecture Modeling contract.

### G-5 · Goal, Decision, and Open-Question capabilities are not products — **P1**
- **Exists:** Three parallel, mutually inconsistent in-memory goal engines (§2 #4), two decision engines, rich specs.
- **Missing:** Wiring, persistence, a canonical model; open questions have no runtime existence at all.
- **Why it matters:** Core AIS concept items (preserve decisions/ideas, goal integrity) are currently demonstrable only in unit tests. **Recommendation per brief §"hypotheses":** keep goal/open-question unification as design decisions, not implementation tasks, until one canonical model is chosen.

### G-6 · Evolution "intelligence" is synthetic — **P2, hypothesis-grade**
- **Exists:** 20 evolution files, orchestration `analyze()` (14 subsystems), tests.
- **Missing:** Any real input: `detect({})` with empty params (`evolution-runtime.ts:204`), one fabricated bottleneck per call, `estimatedImpact = 50 + Math.random()*50` (`architecture-optimizer.ts:48`); zero importers outside the module.
- **Why it matters:** The module *looks* like Project Evolution Intelligence but measures nothing; consumers would be misled. Should remain a hypothesis or be explicitly labeled simulation.

### G-7 · Safety is designed, not enforced — **P2**
- **Exists:** Trust-zone gate instantiated in engine (`execution-engine.ts:115`), autonomy L0-L4 enum, 5.7k lines of compliance validators with real heuristics, 1,816-line identity runtime.
- **Missing:** Enforcement: `zoneGate.check()` never called; `setAutonomyLevel` is a field write (`execution-engine.ts:843-846`); `assertActionWithinAutonomy` never invoked; compliance modules have zero production importers; gate returns hardcoded `true` (`trust-zone-gate.ts:57-71`).
- **Why it matters:** "Goal/Ecological Safety" is a claimed architectural pillar (23 immutable principles in GOV-008); currently no runtime rule protects the user or the repo from an ill-advised autonomous action. (Mitigating reality: the only user-reachable action today is read-only analysis + 503-on-missing-credentials, so exposure is currently low.)

### G-8 · Agent independence is one-vendor-deep — **P2**
- **Exists:** Clean `ProviderAdapter`/`ProviderSDK` interfaces; OpenAI-compatible chat + embeddings (worked via OpenRouter per validation report); provider-agnostic design docs (ADR-003); OpenRouter success is itself evidence the abstraction holds for OpenAI-compatible endpoints.
- **Missing:** Any second true vendor adapter (Anthropic/Google/Ollama = named stubs returning canned text, `provider-adapters.ts:146-431`); streaming (fake single-chunk, `real-provider-wrapper.ts:238-253`); tool-calling (absent from the SDK surface, `provider-sdk.ts` interface); failover that actually re-dispatches (records event then fails, `ai-provider/execution-engine.ts:168-197`); the 25-file `ai-provider/*` runtime is standalone (not exported via `src/core/index.ts`, no production constructor).
- **Why it matters:** The abstraction is real but breadth is thin; "independent of a particular AI agent/provider" holds today for OpenAI-compatible APIs only.

### G-9 · README/documentation drift — **P2**
- **Exists:** README promises 14 docs ("start here" onboarding path: HANDOFF, CURRENT_STATE, PRODUCT_PRINCIPLES, AIS_SPECIFICATION, DECISIONS, GLOSSARY, api.md…).
- **Missing:** All 14 files (verified by existence check). The README describes SIP, not AIS; AIS has no top-level entry document.
- **Why it matters:** A new user/developer cannot onboard via the documented path; the repo's self-description and its content disagree.

### G-10 · Insight lifecycle tail is not user-reachable — **P2**
- **Exists:** FSM states TESTING→VALIDATED→IMPLEMENTED with transitions (`insight-service.ts:196-216`), goal suggestions (`:289-301`).
- **Missing:** HTTP routes for `updateStatus` and `getGoalSuggestions`; also `GET …/insights/revisitable` mutates state as a side effect of a GET (`http-adapter.ts:557`).
- **Why it matters:** The one fully-built capability is 80% wired; the post-decision tail (test → validate → implement) is service/test-only.

### G-11 · Cognitive context assembly runs empty in production — **P1**
- **Exists:** Real context-builder/compression algorithms with contract injection points (`context-builder.ts:63-66`).
- **Missing:** Any production registration: `ExecutionEngine.initialize()` creates `CognitiveRuntime` with no contracts (`execution-engine.ts:158-164`), so `resolveMemory/resolveKnowledge` return empty and token estimation is hardcoded 100 (`:275-277`). Compression strategies are never invoked in production.
- **Why it matters:** The "cognitive" layer's contribution to answers is currently policy routing + prompt shape; all real grounding comes from the engine's own Wave-1 pipeline.

---

## 5. Evidence Map

### 5.1 Primary evidence by verification type

| Type | Evidence collected |
|---|---|
| **Executed by auditor** | `npm install` (75 pkgs); `tsc --noEmit` → 25 errors; `npm run build` → exit 2; `vitest run` → 18,591 tests / 4 fail; `node dist/mvp-ui/index.js` → live server; HTTP probes (`/`, `/api/demos`, `/api/recent`, `/api/session` 400-with-validation-error, question route) |
| **Source tracing** | ~40 `src/core` modules read/traced (engine, cognitive, evidence-loop, interaction-layer, session, memory, checkpoint, context, knowledge, discovery, evolution, capability, workflow, companion, personal, personal-intelligence, experience, compliance, identity, ai-provider, zones, mvp-ui); import-graph checked with repo-wide greps |
| **Documentation** | 4 AIS architecture specs (6,825 lines), 12 product specs, `capability-map.md`, `mvp-definition.md`, 30+ validation/task reports, PHI/GOV/SRC/TST/REP doc series, `worklog.md` (431 lines) |
| **History** | 304 commits (2026-07-15 → 2026-08-29), 28 tags (`v0.8.0-evolution` … `v1.1.0-ais-companion`, `repository-baseline-v2.0`, backups), task-report commit messages cross-checked against artifacts |

### 5.2 CONFLICT WITH HISTORICAL CLAIM (explicit register)

| # | Historical claim | Repository reality at HEAD | Classification |
|---|---|---|---|
| C-1 | `worklog.md` Task 10: "TypeScript Strict now has ZERO errors, ZERO warnings"; repeated in REP/TST docs | `tsc --noEmit` = 25 errors; `npm run build` exit 2 | **CONFLICT** |
| C-2 | `worklog.md` Task 10: "5803 total tests, all passing" | Now 18,591 tests; 4 fail (`architecture-graph-analysis.test.ts`) | **CONFLICT** (superseded count + current red state) |
| C-3 | Commit `d0649c3` (insight lifecycle) implies session capture/persistence layer | `ProjectService.captureSessionAnswer/captureSessionFeedback` have **zero callers** → session history endpoints are structurally empty | **CONFLICT** (partial) |
| C-4 | Prior self-audit (`docs/product/audits/prototype-reality-audit.md`, 2026-08-17): "flow cannot execute — five of six stages STUB or MISSING" | Wave-1 slice landed 2026-08-17+; real OpenRouter inference executed and documented 2026-08-22 | **Historical claim superseded** — was accurate at its HEAD, no longer true |
| C-5 | Synthetic validation commit `753924f`: "CONTROL A >> historical AIS v3.0 (25/25 vs 5/25)" | Same report's own verdict: **INCONCLUSIVE** (10 of 15 runs blocked, no OPENAI_API_KEY; CONTROL B and AIS mode never ran) | **CONFLICT** (headline vs. own verdict) |
| C-6 | README "For New Developers" onboarding path (5 docs) + Documentation section (14 docs) | All 14 referenced docs missing | **CONFLICT** |
| C-7 | Validation report `wave1-real-inference-execution-002.md` status "PASS WITH CONDITIONS", quality below honest-validation threshold | Consistent with code state; no conflict — noted as an honest report | Consistent |

### 5.3 Source-conflict note (per audit method §4)

The repo presents three different "product selves": the README (SIP security platform), the docs corpus (AIS 11-capability product with MVP boundary), and the code (`@ais/core` execution engine + MVP-UI). They are not contradictory so much as **asynchronous**: the code lags the specs; the README describes a sibling product. This is reported as a structural documentation/reality conflict rather than a defect of any single claim.

---

## 6. Missing Capabilities

Capabilities from the baseline with **no runtime existence** (as opposed to partial/unwired implementations):

| Capability | Status | Nearest existing assets |
|---|---|---|
| Open Questions (runtime capture/tracking/resolution) | **MISSING** | OQ-1..OQ-14 in specs only; insight `revisitCondition` is the closest persisted analog |
| Contextual Web Intelligence | **MISSING** | No HTTP client anywhere in `src/core`; only GitHub clone for local analysis; launch docs mention the intent |
| Session-continuity persistence | **MISSING** (adapters absent) | Interfaces exist; atomic-write pattern exists in `project-store.ts` |
| Provider failover (effective) | **MISSING** (event-only) | Failover chain bookkeeping exists; re-dispatch not implemented |
| Streaming answers | **MISSING** (single-chunk fake) | `stream()` delegates to `generate()` |
| Tool-calling / agentic actions | **MISSING** | Not in SDK surface; consistent with MVP's "no auto-fix" scope |
| Real vendor #2 (Anthropic/Google/local) | **MISSING** | Named stub adapters only |
| Organization adaptation (runtime) | **MISSING** | 1,155-line spec; `experience/*` code targets a different (personalization) concept and is unwired |

---

## 7. Priority Classification

**P0 — fundamental to AIS identity or blocking the working flow**
1. Restore green HEAD: fix 25 TS errors (evidence-loop/autonomous-architecture/interaction-layer) + 4 failing tests (G-2).
2. Make continuity real: file-backed session/evidence persistence; activate the dead `captureSession*` bridge so history/recent endpoints populate (G-1, G-3).
3. Answer-path integrity: fix intent-confidence 500s/canned-bypass, derive provenance from the actual adapter, register a deterministic default adapter or fail fast with a clear flag error (§3.3).

**P1 — important for the defined product concept**
4. Unify repository intelligence: feed `KnowledgeGraph` from discovery; decide Stack A vs B; implement real `knowledge` file storage or remove the simulated adapter (G-4).
5. Register production contracts into `CognitiveRuntime` (memory/knowledge) so context assembly is not empty (G-11).
6. Choose one canonical goal/decision model before any further goal-code is written; expose insight lifecycle tail routes (G-5, G-10).

**P2 — valuable but not yet necessary**
7. Safety enforcement: either wire zone-gate/autonomy/compliance checks into `execute()` or explicitly mark them design-only (G-7).
8. Provider breadth: failover re-dispatch, true streaming, second vendor adapter (G-8).
9. Documentation reality: restore or de-reference the 14 missing docs; give AIS a top-level README section (G-9).

**P3 — should remain hypotheses, not implementation tasks (per brief question 7)**
10. Project Evolution Intelligence as currently designed (synthetic inputs) — redefine against real metrics or label as simulation (G-6).
11. Contextual Web Intelligence — no runtime foundation exists; keep as concept.
12. Organization Adaptation runtime — spec-complete, concept-unproven; keep as hypothesis.
13. Multi-vendor provider breadth beyond one OpenAI-compatible endpoint — abstraction first, breadth later.
14. Desktop shell (`src/desktop`) — keep as foundation; do not treat as MVP progress.

---

## 8. What AIS Is Today (repository-evidence definition)

AIS today is **a local, TypeScript "Adaptive Intelligence System" execution-engine skeleton (≈73k LOC core, 18.6k unit tests) with exactly one end-to-end user experience and one persisted capability**:

> A user can start a local web server that clones a public GitHub repository, scans its structure with heuristic discovery, and — only when supplied external LLM credentials via environment flags — asks architecture questions and receives LLM answers grounded in a question-driven architecture-graph context with **real source-code excerpts**, an inspectable evidence trace, and per-source claims. Refusal without credentials is honest (503, "DEMO != FAKE"). Separately, the user can capture, evaluate, decide, and revisit **insights/ideas**, which persist atomically to disk and survive restarts.

Everything else the specifications describe — persistent memory and cross-session continuity, goal intelligence, decision records, open questions, project evolution intelligence, web intelligence, behavioral adaptation, enforced safety/autonomy, multi-provider independence — exists as **specifications, interfaces, in-memory runtimes exercised only by unit tests, or stubs**. The system is honest about demo mode but structurally incapable of remembering anything between restarts except insights. Its newest code does not typecheck, and its own validation corpus records that answer quality has not yet met the project's honest-validation bar.

Measured against the repo's own MVP Definition success criteria (§7 of `mvp-definition.md`): criteria 7.2/7.3 (finds explainable problems) are *partially* demonstrable via the LLM answer path; 7.1 (understands architecture) is heuristic-grade; 7.4 (change impact) is post-MVP by the repo's own boundary; **7.5 (user returns — repeated value) is structurally blocked by absent continuity**; 7.6 (applied decisions) is only reached by the insight workflow.

---

## 9. What AIS Still Needs (to match the defined product concept)

In dependency order, derived strictly from the evidence above:

1. **Green, releasable HEAD** — type-check and tests restored (P0-1). Nothing else is trustworthy until the pipeline is buildable.
2. **Memory that survives restart** — one file-backed adapter per storage interface, wired through MVP-UI shutdown/startup; activate session capture so "project history" becomes real (P0-2). This single step converts AIS from "stateless analyzer with an idea board" into the beginning of a memory system.
3. **A trustworthy answer path** — provenance from the adapter, deterministic degradation (no silent canned answers labeled as model output), intent routing that cannot 500 or bypass the LLM arbitrarily (P0-3).
4. **One repository-intelligence stack** — discovery feeding a persistent architecture model with real dependency semantics (at minimum export/AST-level edges), replacing the name-regex layer assignment (P1-4/5).
5. **Canonical decision/goal/open-question model** — one entity set, persisted, wired to the UI; until then these remain contract-level (P1-6).
6. **Evidence loop with durable, verifiable claims** — persist evidence; extract claims from answer content (or verify them) rather than emitting one claim per source (P0-3/G-3).
7. **Documentation that matches the repo** — AIS entry-point docs; SIP/AIS relationship explained (P2-9).
8. **Then, and only then**: safety enforcement as runtime checks, provider breadth/streaming/failover, and the hypothesis-grade capabilities (evolution, web intelligence, organization adaptation) — each promoted only when a real data source exists to feed it (P2/P3).

---

## 10. Final Verdict

**Question: "What is AIS actually capable of today, based on repository evidence, and what is still missing before it can deliver the intended AIS experience?"**

**Capable today (all auditor-verified):** run a local AIS web UI; import a public GitHub repository safely; heuristic project discovery (files, modules, dependency edges via import regex, tech stack, entry points); LLM architecture Q&A grounded in a real architecture-graph context with genuine source excerpts and an inspectable evidence trace (requires user-supplied OpenAI-compatible credentials); honest 503 degradation without credentials; full insight/idea lifecycle (create → evaluate → decide → revisit) with atomic disk persistence; per-project insight counts/summaries. No agent lock-in at the architecture level: the provider boundary is clean and one OpenAI-compatible adapter is real.

**Still missing before the intended AIS experience exists:** durable memory and session continuity (the defining feature — currently zero survival across restarts for anything except insights); a type-clean, all-green codebase (25 TS errors, 4 failing tests at HEAD); truthful provenance and reliable intent routing in the answer path; a single fed-and-persisted repository-intelligence stack (today: regex heuristics feeding the LLM, plus an unwired knowledge runtime with simulated file storage); any runtime existence for goals, decisions, open questions, evolution, web intelligence, adaptation, or safety enforcement; and documentation that describes the system a user actually gets.

**Bottom line:** the specification layer is mature, the engine skeleton is broad and honestly tested at unit level, and one vertical slice plus the idea-capture capability are real products. But by the repository's own definition — *adaptive project intelligence and memory that preserves context across sessions* — AIS today is a **prototype: an evidence-grounded codebase question-answerer with an idea board, not yet a memory system**. The fastest path to the intended experience is not more capability code: it is persistence for what already exists, a green build, and one honest memory loop.

---

*Audit trail: clone, build, tests, and server probes executed in `/home/z/my-project/audit/sec-scanner-workspace`; no repository state modified; no files written into the audited repo. All file:line references verifiable at HEAD `d0649c3`.*
