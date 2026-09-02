# AIS — Reality Baseline & Minimal Memory/Continuity Vertical Slice

**Task:** TASK-AIS-REALITY-BASELINE-001 · **Type:** Independent Architectural / Product Reality Assessment · **Mode:** AUDIT + DESIGN ONLY — no code changed
**Repository:** `Ksander215/sec-scanner-workspace` at HEAD `d0649c3` (2026-08-29), branch `main` — 304 commits, 28 tags (re-verified for this report)
**Evidence inputs:** (1) direct repository verification performed for this report (file reads, `tsc --noEmit`, targeted `vitest` run, import-graph greps, working-tree diff check); (2) the supplied independent audit `AIS-REPOSITORY-AUDIT.md` (GLM-5.3), treated as baseline input and spot-verified, not as unquestionable truth — all its load-bearing claims used here were re-verified against the repository, and every correction found is registered in §2.4.
**Evidence convention:** `path:line` = verified in the repository at HEAD by this report. "[audit]" = claim taken from the supplied audit document (used only where re-verification was not decision-critical).

---

## 1. Executive Summary

AIS today is **one real, honestly-degraded question-answering vertical slice plus one fully-persisted insight lifecycle, running on top of a ~73k-LOC engine skeleton that is broad, unit-tested, and almost entirely unwired** — and, decisively for this task, the repository already contains a **complete, proven durable-state substrate that nothing feeds**.

The single most important verified fact of this report: the MVP persistence layer (`src/mvp-ui/project-store.ts`, `project-service.ts`, `project-types.ts`) implements the entire durable project model — project identity derived from the repository path (`project-store.ts:224-227`), per-question session records with sanitized question/answer/claims/sources/feedback (`project-service.ts:41-107`), atomic write-through persistence (`project-store.ts:187-201`: `openSync → writeSync → fsyncSync → closeSync → renameSync`), startup reload with corruption handling (`project-store.ts:70-90`, called at `mvp-ui/index.ts:76`), and read-side HTTP routes (`http-adapter.ts:252-255, 477-481, 569-582`). It is tested against a real filesystem (`src/__tests__/mvp-ui/project-store.test.ts`, 361 lines, real tmpdir). **And it is orphaned: `ProjectService.captureSessionAnswer` and `captureSessionFeedback` have zero callers. The two HTTP handlers that produce the data (`handleSubmitQuestion` `http-adapter.ts:386-421`, `handleSubmitFeedback` `:423-445`) never invoke them.** Every question asked, every answer grounded in real source excerpts, every piece of user feedback dies with the process.

This reframes the entire problem. The Memory/Continuity vertical slice is **not a persistence project** ("write JSON to disk" already exists, works, and is tested). It is a **connection project**: 3 wiring points (~30–60 LOC), one new read endpoint (~40 LOC), one SPA panel (~80 LOC), plus a green build. The minimal correct architecture is therefore:

> **CONNECT the existing answer/feedback path to the existing durable ProjectStore, add one reconstruction endpoint, and verify with a real process-restart test.**

Verified along the way, and material to the design:

- **The 4 parallel "storage adapter" interfaces in `src/core` (session, memory, checkpoint, context) have zero file-backed implementations anywhere in `src/`** (verified by whole-tree search). They are future extension points, *not* the continuity substrate. The slice must not build them (§10, §16 Non-Goals).
- **There is no user-reachable project creation at all** (§2.4, D-1): `ensureProject`/`getOrCreate` are only reachable through the dead capture bridge, so on a fresh install even the insight capability — the repo's strongest feature — cannot be exercised from the UI, because the insight project dropdown is populated solely from existing store records (`mvp-ui/index.html:1122-1134`) and `addInsight → requireProject` throws `Project not found` (`project-store.ts:218-222`). One wiring point fixes both insight creation and continuity identity.
- **HEAD is red in a precisely mapped way:** `tsc --noEmit` = 25 errors, of which **16 sit in the MVP runtime path** (evidence-loop 11, interaction-layer 4, engine 1) and 9 in `autonomous-architecture` (2 in `architecture.graph.ts`, which the engine/discovery import; 7 in modules outside the answer path). The 4 failing tests are all in `architecture.graph-analysis.test.ts` — a module **not** imported by the answer path (correcting the supplied audit, §2.4). Green-HEAD restoration is a precondition for release, but only a bounded subset touches the slice (§12).
- The continuity-relevant duplicate-architecture problem is real but **does not block the slice**: 3 incompatible goal engines, 2 decision engines, 3 context stacks, 4 knowledge-contract surfaces, 2 provider stacks (~36k LOC unwired). The slice simply declines to touch them and declares `ProjectStore` the canonical durable-state path (§9).

**Final decision: GO WITH CONDITIONS** — go build the capture-bridge slice, conditional on (1) a green, type-checking HEAD first, (2) responseId-keyed session records so feedback cannot corrupt multi-question history, (3) an acceptance test that survives a real process restart (hermetic, using the verified `OPENAI_BASE_URL` override `real-provider-wrapper.ts:88-91`), (4) no new memory abstraction. **The next engineering task should be: activate the dead session-capture bridge** (`ensureProject` on session start; `captureSessionAnswer`/`captureSessionFeedback` in the question/feedback handlers) **with its restart-durability test.**

---

## 2. AIS Reality Baseline

### 2.1 What is REAL (implemented, wired, and demonstrable)

| Capability | Layers verified | Evidence |
|---|---|---|
| Local web UI server, honest demo policy | Runtime, UI, HTTP, Test | `node dist/mvp-ui/index.js` binds `:3456`; question flow returns **HTTP 503** without credentials ("DEMO != FAKE", `http-adapter.ts:388-395`; test-asserted in `src/__tests__/mvp-ui/http-adapter.test.ts:252-260` [audit]) |
| GitHub repository import with path security | Runtime, UI, Security, Tests | `github-resolver.ts` (GHR-01..07) + `path-security.ts` allow-lists [audit]; wired at `mvp-ui/index.ts:104-111`, `http-adapter.ts:330-362` |
| Discovery → ArchitectureGraph → retrieval → real excerpts → LLM answer | Runtime, Data, Provider, Evidence | Gate `execution-engine.ts:207-213`; fresh graph per request `discovery-pipeline.service.ts:134`; real `readFileSync` excerpts first 40 lines `execution-engine.ts:440-448`; LLM via `cognitiveRuntime.process` `:249-253`; provider honors `OPENAI_BASE_URL` `real-provider-wrapper.ts:88-91` |
| Evidence trace (in-memory) | Runtime, HTTP, Invariants I-01..I-13 | `evidence-loop-service.ts` header `:10-22`; enforcement real (e.g. I-01/I-02 chain at `:153-161`); trace route `http-adapter.ts:230-233, 447-451` |
| **Durable project state substrate (the unused engine of continuity)** | Data model, Persistence, Startup reload, Tests | `project-store.ts:187-201` atomic write; `:70-90` `loadAll` with corruption skip; called at `mvp-ui/index.ts:75-79`; session ops `addSession :102-112`, `updateSessionFeedback :114-124`, `getSessionHistory :126-131`, `getRecentSessions :133-140`; identity `pathToId :224-227`; real-fs tests `project-store.test.ts` (PS-01..PS-06) |
| Insight/Idea lifecycle (10-state FSM, sanitized, user-decides) | Data model, Service, Persistence, HTTP, UI | FSM `insight-service.ts:65-76`, transitions `:136-216`; secret sanitization `:111,154,187`; routes `http-adapter.ts:263-299, 483-566`; SPA screens `mvp-ui/index.html:655` |
| Read-side history/recent endpoints | HTTP (structurally empty — see 2.2) | `handleGetProjectHistory http-adapter.ts:477-481`; `handleGetRecent :569-582` |

### 2.2 What is PARTIAL (exists, but incomplete, degraded, or gated)

| Capability | What works | What is missing / broken | Evidence |
|---|---|---|---|
| Real-mode Q&A | Full pipeline with real inference (OpenRouter documented [audit]) | **Provenance mislabeled by env flags, not actual adapter**: `model: 'gpt-4o'` hardcoded `execution-engine.ts:270`; `provider` from `AIS_REAL_LLM` `:271, 285-286`. With `AIS_REAL_LLM≠true` **no adapter is registered at all** (`cognitive-runtime.ts:188-205`), so the `'openai-stub'` label describes a mode whose Answer decision throws `ProviderUnavailableError`; canned replies only via non-Answer decisions | Answer-path integrity |
| Intent confidence | Formula `min(matches/patterns*0.8+0.2, 1.0)` `intent-runtime.ts:156`, threshold 0.3 `:113` | Below-threshold → 500 (`IntentConfidenceError`); sub-clarification confidence (<0.5) → canned "Please provide more details." without LLM — via `ResponsePlanner` decision (`response-planner.ts:130-132`) rendered at `cognitive-runtime.ts:351-353`, **not** via intent "routing to Planning" (mechanism corrected from [audit]) | §5.1 |
| Claims | One claim per source, fallback statement "AIS references {filePath}" `interaction-service.ts:338-345` | Claims not extracted from answer content; positional claim↔evidence pairing `:363-366` | Evidence quality |
| Insight lifecycle **reachability** | Service + store + routes + SPA complete | **No user-reachable project creation** → on fresh install the SPA insight dropdown is empty (`mvp-ui/index.html:1122-1134` reads only `/api/recent` insightSummary) and `createInsight` throws (`project-store.ts:218-222` via `insight-service.ts:131`) | D-1 below |
| Insight lifecycle tail | `updateStatus` `insight-service.ts:196-216`, `getGoalSuggestions` `:289-301` | **No HTTP routes** for either (verified: no matches in `http-adapter.ts`) | 80% wired |
| Insight revisitable check | Context-snapshot diffing works `insight-service.ts:92-100, 219-246` | Served by a **GET that mutates state** (status flip + disk write as side effect), `http-adapter.ts:554-558` → `insight-service.ts:235-240` | HTTP semantics defect |
| Agent independence | Clean adapter boundary; one OpenAI-compatible adapter real; `OPENAI_BASE_URL` override `real-provider-wrapper.ts:88-91` | Streaming fake single-chunk `:238-253` [audit]; no tool-calling; failover records event but does not re-dispatch [audit] | Breadth = 1 vendor |
| Green HEAD | `dist/` builds (emits despite errors) | `tsc --noEmit` = **25 errors** (re-verified; distribution in §12); `npm run build` exit 2 [audit]; **4 tests fail** (`architecture-graph-analysis.test.ts`: 4 failed / 8 passed, `TypeError: Cannot convert undefined or null to object` at `architecture.graph-analysis.ts:39:31, 56:31` — `Object.values(undefined enum)`) | Releasability |

### 2.3 What is CONTRACT-ONLY, STUB, or MISSING (continuity-relevant)

| Item | Status | Evidence |
|---|---|---|
| `SessionStorageAdapter` file implementation | **CONTRACT_ONLY** — interface `session/session-store.ts:11-16`; only `InMemorySessionStorageAdapter` `:22-54`. ADR-004 header: "File persistence is future scope" | Verified |
| `SessionRuntime` persistence activation | **WIRED BUT WRITE-DEAD** — `autoPersist` defaults **false** (`session-runtime.ts:87`); adapter `.save` reachable only via `maybePersist` `:470-474` if autoPersist, or explicit `saveSession` `:380-387`; production never sets it (`mvp-ui/index.ts:84-87` explicitly passes the in-memory adapter; only a test sets `autoPersist: true`) | Verified — the core session adapter is doubly inert |
| `PersistentMemory` (with flush/loadAll/TTL) | **IMPLEMENTED RUNTIME, UNWIRED** — full class `memory/persistent-memory.ts:61-426`; only in-memory `PersistentStorageAdapter` `:24-42`; zero production importers | Verified |
| `CheckpointStorageAdapter` / `CheckpointEngine` | **CONTRACT_ONLY + UNWIRED** — `checkpoint/checkpoint-store.ts:16-27`; in-memory only; type-only references from `recovery-runtime.ts:17,20` (itself unconstructed) | Verified |
| `ContextLoader` / `UnifiedContext` | **IMPLEMENTED RUNTIME, UNWIRED** — `context/context-loader.ts:59-127` (serializer + validation + errors); no production importer; `ContextStorageAdapter` `:17-23` in-memory only | Verified |
| Evidence-loop persistence | **MISSING** — 11+ in-memory Maps (`evidence-loop-service.ts:61-75`), frozen append-only entities; nothing persists them | Verified |
| Welcome-Back / session reconstruction | **MISSING** — SPA has no welcome/resume/previous-session UI (verified: no matches in `mvp-ui/index.html`); `/api/project/:id/history` exists but the SPA never calls it; `/api/recent` is called only to populate the insights dropdown (`mvp-ui/index.html:1122`) | Verified |
| Session capture bridge | **MISSING (dead bridge)** — `project-service.ts:41-80` (answer) and `:83-107` (feedback) fully implemented, sanitized, length-capped; **zero callers**; `handleStartSession` never calls `ensureProject` | Verified — the pivotal fact of this report |
| Goals / Decisions / Open Questions (runtime) | **CONTRACT_ONLY / STUB / MISSING** — 3 goal engines, 2 decision engines, all unwired (§9); open questions: zero runtime matches repo-wide (docs-only "Open Questions") | Verified |
| `FileEvidenceStoreAdapter` (evidence JSON to disk) | PARTIAL, env-gated — `validation/evidence-store.ts:78-81`, active only with `AIS_EVIDENCE_PATH` (`execution-engine.ts:155-157`); implements `IEvidenceStore`, **not** one of the four storage-adapter interfaces | Verified |

### 2.4 Verification deltas vs. the supplied audit

All load-bearing audit claims re-verified; four corrections (the audit stands corrected by this report, not vice versa):

| # | Audit statement | Verified reality | Effect |
|---|---|---|---|
| K-1 | "4 failing tests in the module that also powers question retrieval (`architecture.graph-analysis.ts`)" | That module is **not imported by the answer path** — engine imports only `architecture.model.ts` / `architecture.graph.ts` (`execution-engine.ts:24-26`); discovery imports `graph-builder` (`discovery-pipeline.service.ts:16-17`); `graph-analysis` is imported only by its own barrel and `architecture.workspace.ts` (tests only) | Shrinks the slice-blocking error set (§12) |
| K-2 | Canned answer caused by "routing to Planning" in intent runtime | Actually: any intent with confidence < `clarificationThreshold` 0.5 → `ResponseDecision.Clarification` (`response-planner.ts:130-132`) → canned reply `cognitive-runtime.ts:351-353` | Same symptom, different fix site |
| K-3 | Stub mode produces answers (implied by `'openai-stub'` labeling) | With `AIS_REAL_LLM≠true` no provider adapter is registered at all (`cognitive-runtime.ts:188-205`); the Answer decision throws `ProviderUnavailableError`; `'openai-stub'` labels a path that cannot answer | Strengthens the provenance-integrity fix |
| K-4 | `wave1-integration.test.ts:165-191` tests ProjectStore durability | It tests `FileEvidenceStoreAdapter` (`validation/evidence-store.ts`), not ProjectStore; ProjectStore durability is tested by `project-store.test.ts` (real fs) | Evidence map correction |

**DISCOVERED CAPABILITY / DEFECT (new in this report):**

- **D-1 — No user-reachable project creation.** `ProjectStore.getOrCreate` is called only from `ProjectService.ensureProject` (`project-service.ts:31-33`) and `captureSessionAnswer` (`:49`) — both unreachable from HTTP. Consequence: on a fresh install the SPA cannot create the first insight (empty project dropdown; `requireProject` throws), and `/api/recent` returns `recentSessions: []`, `insightSummary: []` by construction. This is not just a continuity gap — it orphans the repo's strongest implemented capability at the UI boundary.
- **D-2 — Error distribution favors the slice:** 16 of 25 TS errors are in the runtime path and mostly trivial (unused identifiers); only 5 are structural (`IntentId/ResponseId/ClaimId/EvidenceFeedbackId/FindingId` missing type aliases `evidence-loop-service.ts:69-73`, one `FindingStatus` mismatch `:367`).
- **D-3 — Hermetic restart testing is possible:** the real provider honors `OPENAI_BASE_URL` (`real-provider-wrapper.ts:88-91`), so the acceptance test can run Session A against a local mock OpenAI-compatible server with no real credentials.

---

## 3. Current AIS Runtime Model (what is actually user-reachable)

Verified call graph of the only working experience:

```
Browser SPA (mvp-ui/index.html, 10 screens :655)
  │
  ├─ POST /api/resolve-repo ──────────► GitHubResolver.resolve()  (clone to /tmp/ais-repos)
  ├─ POST /api/session ────────► HttpAdapter.handleStartSession :364-384
  │       └─ PathSecurityService.validateProjectPath
  │       └─ InteractionService.startInteraction ─► EvidenceLoopService.startSession
  │               └─ SessionRuntime.createSession + startSession   [IN-MEMORY ONLY]
  │       ✗ DEAD LINK: ProjectService.ensureProject is NEVER called  → no Project record
  │
  ├─ POST /api/session/:id/question ──► handleSubmitQuestion :386-421   (503 w/o credentials)
  │       └─ InteractionService.submitQuestion
  │               ├─ evidenceLoop.recordIntent
  │               ├─ engine.execute  [if AIS_EXECUTION_REAL && architecture question]
  │               │     └─ DiscoveryPipelineService.discover (fresh graph per request)
  │               │     └─ buildProjectContext (graph + real file excerpts, readFileSync)
  │               │     └─ CognitiveRuntime.process ─► RealOpenAIAdapter (OPENAI_API_KEY / OPENAI_BASE_URL)
  │               ├─ evidenceLoop.recordResponse + createClaim + attachEvidence   [IN-MEMORY Maps :61-75]
  │               └─ returns AnswerView {responseId, content, sources, claims}
  │       ✗ DEAD LINK: ProjectService.captureSessionAnswer is NEVER called → Q&A dies with process
  │
  ├─ POST /api/session/:id/feedback ──► handleSubmitFeedback :423-445
  │       └─ evidenceLoop.recordFeedback + createFinding   [IN-MEMORY]
  │       ✗ DEAD LINK: captureSessionFeedback NEVER called
  │
  ├─ GET /api/session/:id/trace ──────► in-memory trace (works until restart)
  ├─ GET /api/recent ─────────────────► ProjectStore (always structurally empty: nothing writes sessions)
  ├─ POST /api/project/:id/insights ──► InsightService.createInsight ─► addInsight ─► requireProject
  │       ✗ BLOCKED on fresh install: no Project record can ever exist (D-1)
  │       └─ (when a record exists) atomic writeToFile :187-201 → SURVIVES RESTART ✓
  └─ GET /api/project/:id/history ────► ProjectStore.getSessionHistory  (SPA never calls it)
```

**Restart behavior (verified):** `ProjectStore.loadAll()` runs at startup (`mvp-ui/index.ts:76`) and prints `Loaded N projects` — so whatever reached disk reloads. In practice only insights can reach disk, and only if a project record was externally seeded. Sessions, intents, responses, claims, evidence links, feedback, findings, interaction FSM state, conversations — all process-local Maps (inventory in §2.3). Shutdown (`mvp-ui/index.ts:131-139`) flushes nothing and even deletes cloned repos (`githubResolver.cleanupAll()`).

**Stateholders that die at restart (complete inventory):** `InteractionService.interactions` (`:60`); `EvidenceLoopService` 6 entity Maps + 5 index Maps + `sessionSourceTypes` (`:61-75`); `SessionRuntime.sessions` (`:79`); `ConversationStore`/`CognitiveRuntime` conversation Maps; provider sandbox Map. The only durable artifacts in the entire system: `.ais-data/projects/*.json` (MVP store) and, if `AIS_EVIDENCE_PATH` is set, evidence JSON (`validation/evidence-store.ts:78-81`).

---

## 4. Fundamental Bottleneck

**The bottleneck is not storage. It is a dead call-chain of three missing invocations in an otherwise complete persistence architecture — plus the absence of a reconstruction surface.**

Everything needed to remember already exists and is proven: the durable aggregate (`Project` = identity + sessions + insights), atomic fsync'd writes, corruption-tolerant reload at startup, secret sanitization, length caps, read-side endpoints, real-fs tests. The system loses its memory for the same reason a warehouse starves next to a full factory: **the conveyor belt was never bolted on.** Three specific unbolted joints, each verified:

1. `handleStartSession` (`http-adapter.ts:364-384`) → does not call `ProjectService.ensureProject` — no durable project identity is established, which also breaks insight creation (D-1).
2. `handleSubmitQuestion` (`:386-421`) → does not call `captureSessionAnswer` — the richest continuity data (question, grounded answer, claims, sources) is discarded.
3. `handleSubmitFeedback` (`:423-445`) → does not call `captureSessionFeedback` — the user's explicit verdicts (the highest-value continuity signal) are discarded.

And one missing surface: nothing composes the durable state back into a user-facing "here is where you left off" (no endpoint, no SPA panel).

This is why the correct strategy is **CONNECT > CREATE**: any proposal that starts by implementing `FileSessionStorageAdapter`, activating `PersistentMemory`, or wiring `ContextLoader` would spend engineering effort building a second memory architecture parallel to the one that already works — reproducing exactly the duplicate-architecture disease the repository already suffers from (§9).

---

## 5. Definition of AIS Memory / Continuity (operational, testable)

**Concept definition.** AIS has memory when the *project*, not the process, is the unit of state: closing the app loses nothing the user expressed or learned with AIS's help, and returning restores a usable working context without the user re-explaining anything.

**Operational definition (each clause is independently testable):**

1. **Identity** — After restart, AIS can resolve the same project record from the same repository path (stable identity: `pathToId` base64url, `project-store.ts:224-227`). *Test: same projectPath before/after restart → same `projectId`.*
2. **Capture** — Every completed Q&A exchange and every user feedback verdict issued during a session exists in durable storage within the request that produced it (write-through, not flush-on-exit). *Test: record count in `.ais-data/projects/<id>.json` increments immediately after each API call.*
3. **Survival** — A full process termination (SIGKILL-grade: no graceful flush) and restart preserves all captured records verbatim. *Test: kill -9 / respawn; assert record equality.*
4. **Reconstruction** — On return, one deterministic query returns a composed view: project identity, previous session summaries (Q&A + evidence file paths), captured insights with status, explicit user decisions (IMPLEMENT_NOW/DEFER/REJECT + revisitCondition), unresolved items (DEFERRED/REVISITABLE/NEW), and activity timeline. *Test: GET continuity endpoint returns all fields populated from disk.*
5. **Continuation** — The reconstructed view offers concrete continuation points (revisitable insights; suggested questions; last activity) without fabricating data that does not exist. *Test: continuation fields sourced only from stored records.*
6. **Honesty** — The view never invents goals, decisions, or "changes" that were not explicitly captured; absent data renders as absent (Goal Integrity: a goal changes only through explicit user action — and today no goal runtime exists, so no goal may be displayed).
7. **Restart verification** — The acceptance demonstration crosses a real durable-store boundary (actual process exit or actual store re-instantiation from disk), **not** an in-memory Map round-trip.

**What memory is NOT (anti-pattern guard):** a `SerializableSession` row with an FSM state but no content (that is the current `session/types.ts:38-52` shape — it cannot reconstruct anything user-visible); a flush-on-shutdown handler (violates clause 2; the process may die ungracefully); a generic key-value memory populated with synthetic entries (that is `PersistentMemory`'s current status — implemented, unfed, unused); a "history" endpoint returning externally seeded data.

---

## 6. Direct Answers to the Mandatory Questions (Q1–Q15)

**Q1. What exactly is AIS today?** A local TypeScript "Adaptive Intelligence System" execution-engine skeleton (~73k LOC core, 18.6k unit tests [audit]) with one user-reachable experience — safe GitHub import → heuristic discovery → real-LLM architecture Q&A grounded in real source excerpts with an inspectable in-memory evidence trace, honest 503 without credentials — plus a fully persisted insight lifecycle that is UI-orphaned on fresh install (D-1), on top of a durable project store that nothing feeds. It is an evidence-grounded codebase question-answerer with an idea board, not yet a memory system.

**Q2. The single most important missing capability?** Cross-session continuity: the capture chain from the live answer path into the durable ProjectStore (§4). Everything else in the AIS vision depends on this boundary being crossed.

**Q3. What does Memory/Continuity mean operationally for AIS?** The seven testable clauses of §5 — identity, capture (write-through), survival, reconstruction, continuation, honesty, restart verification — anchored on the project as the unit of durable state.

**Q4. Minimum state to persist after a user session?** Exactly the existing `Project` aggregate (`project-types.ts:147-155`): identity `{id, name, projectPath, createdAt, updatedAt}`; per-Q&A `PersistedSession` records `{recordId(responseId-keyed), interactionSessionId, projectPath, createdAt, question, answer(≤2000 chars), claims[], sources[](filePath/type/excerpt ≤500/relevance), feedback?, findings[]}` (`:23-64`); `PersistedInsight` records with status FSM, evaluation, `userDecision`, `revisitCondition`, history (`:107-131`). Nothing more is required for the slice.

**Q5. What must NOT be persisted automatically?** (a) Goals — none exist as runtime entities; per Goal Integrity they may enter durable state only by explicit user action (today: no goal capture at all; do not fabricate). (b) Raw LLM conversation transcripts — only the sanitized, length-capped answer summary (sanitization already enforced, `project-service.ts:51-66`). (c) Unsanitized user text — `sanitizeSecrets` on every field (already implemented). (d) Cloned repository contents — ephemeral by design (`githubResolver.cleanupAll()`, `mvp-ui/index.ts:134`). (e) Full evidence-loop Maps and telemetry — privacy/size; the compressed PersistedSession projection suffices for the slice. (f) In-memory FSM states — meaningless across restarts.

**Q6. What should happen when the user returns?** The SPA landing/insights area resolves the project (from `/api/recent` + continuity endpoint), renders the §5-clause-4 view, and routes the user into the existing question/insight screens with prior context visible — zero re-explanation required. No new interaction paradigm.

**Q7. Minimum user-visible Welcome Back?** One panel, one screen: project name + path, "last activity <date>, N questions answered, M insights (X revisitable)", last Q&A preview, explicit decisions list, unresolved list, 2–3 continuation suggestions (revisitable insights + demo suggested questions). All fields from disk or explicitly absent. (~80 LOC in `mvp-ui/index.html`.)

**Q8. Which existing components can be reused?** §8 reuse matrix — headline: ProjectStore (as-is), ProjectService.capture* (as-is, just called), project-types models (as-is + 2 optional fields), InsightService (as-is), history/recent routes (as-is), PathSecurity/GitHubResolver (as-is), EvidenceLoopService (as-is for slice). No new storage code.

**Q9. Which components are misleading, duplicated, dead, simulated, or dangerous?** Dead: capture bridge (`project-service.ts:41,83`), session adapter (autoPersist=false, in-memory), `ProjectService.ensureProject` (0 callers). Simulated: `FileKnowledgeStorageAdapter` (`knowledge/storage.ts:391-403` writes to a Map "in a real implementation…"); evolution intelligence inputs (`detect({})` [audit]). Duplicated: 3 goal engines, 2 decision engines, 3 context stacks, 4 knowledge-contract surfaces, 2 provider stacks (with `ExecutionEngine` name collision), 2 SessionRuntimes (core vs desktop), 2 recovery modules, 2 governance stacks. Misleading: env-flag provenance labels (`execution-engine.ts:270,285-286`); GET-that-mutates (`http-adapter.ts:554-558`); the four unwired core storage interfaces *look* like the memory system but are not (§5 anti-pattern). Dangerous if trusted: none user-reachable today (read-only analysis + honest 503), but compliance/safety is designed-not-enforced [audit].

**Q10. Smallest end-to-end vertical slice?** §10: the six-step capture-bridge slice (S-1..S-6) + restart test (S-7), producing: import → ask → answer persisted → feedback persisted → insight persisted → restart → Welcome Back with full reconstruction.

**Q11. Exact dependencies of that slice?** §11: green in-path build (18 errors) → project identity wiring → capture wiring (responseId keying) → continuity endpoint → SPA panel → restart test. Only `project-store/service/types`, `http-adapter`, `mvp-ui/index.html`, and error-fix files are touched.

**Q12. What must be fixed before implementing continuity?** The 16 in-path TS errors (they sit in the very modules the slice wires: evidence-loop, interaction-layer, engine) and, for a releasable HEAD, the remaining 9 + 4 failing tests (§12). Nothing else.

**Q13. What can safely remain broken/deferred without blocking the slice?** All unwired runtimes (knowledge, context, memory, checkpoint, personal*/companion, compliance, evolution, ai-provider, desktop); insight tail routes; provenance labels; GET-mutation semantics; README drift [audit]; streaming/failover/tool-calling; 7 of the autonomous-architecture errors (module absent from the answer path — but fix for green CI, see §12 split).

**Q14. Tests that prove continuity is real?** §13: T1 capture unit tests (real tmpdir fs), T2 store re-instantiation across a durable boundary, **T3 the acceptance test — two live server processes with SIGTERM between them, hermetic LLM via `OPENAI_BASE_URL` mock** (`real-provider-wrapper.ts:88-91`), T4 optional real-key script. In-memory round-trips explicitly do not qualify.

**Q15. Evidence of crossing from "stateless repository analyzer" to "memory system"?** A green CI run containing T3 passing end-to-end; `.ais-data/projects/<id>.json` bytes changing after each Q&A (write-through proof); a second process reading the same file into a composed Welcome Back view; and the SPA showing that view after restart with zero user re-input. That artifact chain is the demarcation line.

---

## 7. Minimum Durable Project State

The durable state model **already exists in code and is correct for the slice** — one JSON file per project, project as aggregate root (`project-types.ts:5-16`):

```jsonc
// .ais-data/projects/<projectId>.json        (projectId = base64url(projectPath)[:32], :224-227)
{
  "id": "…", "name": "…", "projectPath": "…",           // identity — stable across restarts
  "createdAt": "…", "updatedAt": "…",
  "sessions": [                                          // per-Q&A records (PersistedSession :54-64)
    { "sessionId": "<responseId>",                       // ★ keying decision, see S-3
      "interactionSessionId": "<uuid>",                  // ★ optional new field
      "projectPath": "…", "createdAt": "…",
      "question": "…≤5000", "answer": "…≤2000",
      "claims":   [{ "claimId","statement","isVerified","evidenceCount" }],
      "sources":  [{ "filePath","type","excerpt ≤500","relevance" }],
      "feedback": { "feedbackId","verdict","comment?" }, // captured on POST /feedback
      "findings": [] }
  ],
  "insights": [ /* PersistedInsight :107-131 — status FSM, evaluation,
                     userDecision (explicit user choice), revisitCondition, history[] */ ]
}
```

Design properties worth naming (all verified): **write-through** on every mutation (`writeToFile` called from `addSession`/`addInsight`/`updateInsight`/`updateSessionFeedback` — no flush dependency); **atomic** (tmp + fsync + rename); **corruption-tolerant** reload (skips `.tmp`/empty/invalid, `:70-90`); **secret-sanitized** at capture time; **size-capped** (`MAX_PERSISTED_ANSWER_LENGTH` 2000, excerpts 500); **backward-compatible** validation (`isValidProject` requires only `id`+`name`, `:211-216` — the two optional fields above are safe).

Derived (computed at read time, never stored): insight status counts, revisitable list (read-only variant), "new since previous visit" (client-side via `localStorage.lastVisitAt` for the slice — no server state), continuation suggestions. Explicitly **absent** from the minimum model: goals, decisions as standalone entities, open questions, embeddings, knowledge graphs — each is either an explicit-user-action entity (goals) or a later wave (§16).

---

## 8. Existing Components Reuse Analysis

| Component | Current State | Reuse? | Why | Required Change |
|---|---|---|---|---|
| `ProjectStore` (`mvp-ui/project-store.ts`) | IMPLEMENTED, atomic, tested (real fs) | **YES — canonical durable store** | Already persists sessions+insights with identity, reload, corruption handling | None for slice; optional: `updateSessionFeedback` match by responseId (S-3) |
| `ProjectService.captureSessionAnswer/Feedback` (`project-service.ts:41-107`) | IMPLEMENTED, sanitized, **0 callers (dead)** | **YES** | Exact data shape needed; sanitization + caps built in | Call it from `http-adapter` (S-2/S-3) |
| `ProjectService.ensureProject` (`:31-33`) | IMPLEMENTED, **0 callers** | **YES** | Establishes durable project identity; fixes D-1 | Call it from `handleStartSession` (S-1) |
| `project-types.ts` models | IMPLEMENTED | **YES** | Minimum durable state already modeled | Add optional `interactionSessionId`/`responseId` fields (backward-safe) |
| `InsightService` (`insight-service.ts`) | IMPLEMENTED, routes+UI present | **YES** | Strongest capability; becomes visible once identity exists (D-1 fix) | None for slice; read-only revisitable variant (P1) |
| HTTP routes `history` / `recent` (`http-adapter.ts:477-481, 569-582`) | IMPLEMENTED, structurally empty | **YES** | Read-side ready | None; feed them via S-2 |
| `SessionRuntime` + `SessionStorageAdapter` (`core/session/`) | WIRED but write-dead (`autoPersist=false` :87) | **NO (defer untouched)** | `SerializableSession` carries FSM state, not content — cannot reconstruct user context; building a file adapter now = second memory architecture | Leave exactly as is (P2 wave) |
| `PersistentMemory` (`memory/persistent-memory.ts`) | IMPLEMENTED, unwired, no file adapter | **NO (defer)** | Generic KV memory; unfed; duplicates ProjectStore role for slice | Leave untouched (P2/P3) |
| `ContextLoader`/`UnifiedContext`, `CheckpointEngine` | IMPLEMENTED/CONTRACT, unwired, no file adapters | **NO (defer)** | No producer populates them; wiring them is a separate, larger wave | Leave untouched |
| `EvidenceLoopService` (`evidence-loop/`) | WIRED, in-memory, invariants enforced | **YES (as-is)** | Source of the AnswerView data that S-2 captures; its full persistence is *not* needed for slice (PersistedSession is the honest projection) | None (fix its 11 TS errors, §12) |
| `InteractionService` | WIRED; holds `projectPath` on `InteractionSession` (`interaction-layer/types.ts:156-164`) | **YES** | Route to project identity at capture time | Optionally expose projectPath on session view (S-2 alt) |
| `ExecutionEngine` + discovery + excerpts | WIRED, flag-gated | **YES (as-is)** | The content generator; no changes for continuity | Fix TS errors only |
| SPA `mvp-ui/index.html` | 10 screens; `/api/recent` already fetched (:1122) | **YES** | Welcome Back is an additive panel on an existing fetch pattern | Add continuity panel + fetch (S-5) |
| `PathSecurityService`, `GitHubResolver`, `demo-config` | IMPLEMENTED, tested | **YES (as-is)** | Identity normalization + safe paths | None |
| `KnowledgeRuntime` stack | UNWIRED; storage simulated (`storage.ts:391-403`) | **NO** | Would be Stack-B duplication; simulated persistence | Leave; do not feed (P3 decision) |
| 3 goal engines / 2 decision engines | UNWIRED, mutually incompatible FSMs | **NO** | Canonical-model decision is a P3 design task, not slice work | Leave untouched |
| `ai-provider/` (25 files, 5,637 LOC) | UNWIRED; `ExecutionEngine` name collision | **NO** | `cognitive/` provider stack is canonical for the wired path | Leave untouched |
| `compliance/`, `zones/`, `evolution/`, `desktop/`, `personal*` | UNWIRED / synthetic-input / parallel shell | **NO** | Zero importers; not on slice path | Leave untouched |

---

## 9. Competing / Duplicate Architecture (and the canonical recommendation)

Verified duplicate clusters (paths abbreviated under `src/`):

| Cluster | Members | Canonical for the slice | Rationale |
|---|---|---|---|
| Durable state | `mvp-ui/project-store.ts` **vs** `session/session-store.ts` + `memory/persistent-memory.ts` + `context/context-loader.ts` + `checkpoint/checkpoint-store.ts` | **ProjectStore** | Only one with real fs persistence, reload, tests, and content-bearing models. The four core interfaces have zero file-backed implementations repo-wide. Do **not** create a fifth adapter now |
| Repository intelligence | Stack A: `discovery/` + `autonomous-architecture/` (graph) + engine retrieval **vs** Stack B: `knowledge/` (5,353 LOC, simulated fs) | **Stack A** | Only Stack A is fed and wired. Stack B stays unwired until a real decision to unify (P1 later, not slice) |
| Providers | `cognitive/` provider stack (wired: `provider-runtime`, `real-provider-wrapper`) **vs** `ai-provider/` (25 files, unwired, collides on `ExecutionEngine`/`ModelRouter`/`ContextManager` names) | **cognitive/** | The only registered adapter path (`cognitive-runtime.ts:188-205`) |
| Context | `context/` (UnifiedContext) **vs** `cognitive/context-builder.ts` (wired) **vs** `personal/context-runtime.ts` (second UnifiedContext) | **cognitive/context-builder** | Only one on the answer path |
| Goals | `personal/goal-runtime.ts` (FSM w/ Archived) **vs** `personal-intelligence/goal-planner.ts` (FSM w/ InProgress + cycle detection) **vs** `companion/goal-center.ts` (enum w/ Abandoned, no guards) | **None — deliberately undecided** | Three incompatible state machines = a P3 design decision. The slice persists only explicit user decisions (`userDecision` on insights) and fabricates no goal |
| Decisions | `personal/decision-runtime.ts` **vs** `personal-intelligence/decision-advisor.ts` | **None** | Same treatment |
| Session runtimes | `core/session/session-runtime.ts` (wired) **vs** `desktop/session-runtime/session-runtime.ts` (Map-backed, unrelated) | **core/session** | Desktop is an unwired shell |
| Recovery | `core/recovery/` (unwired) **vs** `core/pipeline/recovery/` (wired) | **pipeline/recovery** | Already the wired one |
| Governance | `zones/` (82 LOC, wired) **vs** `compliance/` (5,709 LOC, zero importers, duplicated test trees) | **zones/ (status quo)** | No enforcement change in this wave |
| Memory contracts | 4 parallel knowledge-contract surfaces (`cognitive/types.ts:967`, `ai-provider/types.ts:875`, `experience/contracts.ts:66`, `platform/runtime-bridges.ts:95`) | **None consumed** | Slice registers no contracts; flagged for the later unification wave |

**Canonical-path declaration for this wave:** `HttpAdapter → InteractionService/EvidenceLoop → ExecutionEngine` for runtime; `ProjectStore (.ais-data/projects/*.json)` for durable state; `core/session` remains the ephemeral session FSM. Any future file-backed `SessionStorageAdapter` must be justified against this declaration, not built by default.

---

## 10. Minimal Memory Vertical Slice

**Slice name: "Project Remembers" — capture, survive, reconstruct.**

### 10.1 Slice flow (user action → verification)

```
USER ACTION                 RUNTIME                                   STATE CAPTURE              PERSISTENCE                     RESTART              RECONSTRUCTION                UI                        VERIFICATION
─────────────────────────   ───────────────────────────────────────   ────────────────────────   ─────────────────────────────   ──────────────────   ───────────────────────────   ───────────────────────   ──────────────────────
S-1 Import / open project   POST /api/session                         projectPath (validated)    ensureProject → Project file    (any)                (identity ready)              landing screen            T1
  "analyze this repo"       handleStartSession :364                   InteractionSession holds   .ais-data/projects/<id>.json
                            + ensureProject  ★NEW                     projectPath
S-2 Ask question            POST /api/session/:id/question            AnswerView{responseId,     captureSessionAnswer ★WIRED     write-through fsync  file bytes changed            answer screen unchanged   T1
                            → engine → real LLM answer                content, claims, sources}  → addSession (responseId-keyed) immediately         after each Q&A
S-3 Give feedback           POST /api/session/:id/feedback            verdict, comment           captureSessionFeedback ★WIRED   write-through        feedback attached to          feedback UI unchanged     T1
                            → evidenceLoop.recordFeedback                                        → updateSessionFeedback         immediately          correct record
S-4 Capture insight         POST /api/project/:id/insights            sanitized text             addInsight (existing)           write-through        insights reload at boot       insights screen NOW       T1
                                                                                                                  
SYSTEM RESTART (kill -TERM / kill -9 → respawn `node dist/mvp-ui/index.js`)                                                          loadAll() reloads    store re-instantiated         "Loaded N projects"       
                                                                                                                                                                                     from disk
S-5 Return to project       GET /api/project/:id/continuity ★NEW      —                          read-only compose:              —                    one query returns all         WELCOME BACK panel ★NEW   T3 (acceptance)
                            (or GET /api/recent)                                                 identity, last Q&A, insights,                        fields from disk              (project, last activity,
                                                                                                  decisions, unresolved, changes,                                                    Q&A, insights, decisions,
                                                                                                  suggestions                                                                        unresolved, next steps)
S-6 Continue working        existing question/insight flows           —                          —                               —                    —                             zero re-explanation       —
S-7 Prove it                T3 acceptance test: two processes, SIGTERM between, hermetic LLM via OPENAI_BASE_URL mock; assert all §5 clauses                                                                                                                     
```

### 10.2 The slice in implementation terms (no code — exact anchors only)

- **S-0 · Green in-path build.** Fix the 16 runtime-path TS errors + the 2 errors in `architecture.graph.ts` (engine/discovery import it) + trivially the remaining 7; fix the 4 failing tests (enum import in `architecture.graph-analysis.ts`). Split rationale in §12.
- **S-1 · Project identity wiring.** In `handleStartSession` (`http-adapter.ts:364-384`, after path validation `:372`): call `this.projectService.ensureProject(projectPath)`. ~3 LOC. Effect: durable identity exists from the first user action; D-1 resolved; insights become creatable from the UI on fresh installs.
- **S-2 · Answer capture.** In `handleSubmitQuestion` (`:386-421`, after `submitQuestion` returns `answerView`): call `captureSessionAnswer({ projectPath, sessionId: responseId, question, answer: answerView.content, claims, sources })`. Field mapping: `answerView.sources` → `PersistedEvidence` is 1:1 (`{filePath, type, excerpt, relevance}`, built at `interaction-service.ts:376-381`); `answerView.claims` → `PersistedClaim` with `isVerified:false, evidenceCount:0` defaults unless present. projectPath resolution: from `InteractionService` (it holds it, `interaction-layer/types.ts:156-164`) via session view, or a `sessionId→projectPath` map filled in S-1. ~10 LOC.
- **S-3 · Feedback capture + keying fix.** In `handleSubmitFeedback` (`:423-445`): call `captureSessionFeedback` with `sessionId: responseId`. **Keying decision (condition of GO):** `PersistedSession.sessionId` must be the **responseId** (unique per Q&A), with `interactionSessionId` as an optional reference field — otherwise `updateSessionFeedback` (`project-store.ts:114-124`, matches by `s.sessionId`) would overwrite feedback onto *every* Q&A record of the same interaction session. ~10 LOC + 2 optional type fields.
- **S-4 · Reconstruction endpoint.** New `GET /api/project/:id/continuity` composing existing read methods only: `getSessionHistory`, `getInsights`/`getInsightCounts`, `getRevisitable` (**read-only** — deliberately *not* `checkRevisitability`, which mutates), project identity, `updatedAt` timeline, continuation suggestions (revisitable insights + demo suggested questions). Honest absences: `goal: null` unless a decision-bearing insight exists; `changesSinceLastVisit` computed client-side from `localStorage.lastVisitAt` (no server state in slice). ~40 LOC.
- **S-5 · Welcome Back panel.** In `mvp-ui/index.html`: fetch continuity on project open (same pattern as `loadRecentForInsights` `:1122-1134`); render identity/last-activity/last-Q&A/insights/decisions/unresolved/next-steps; all values from the endpoint, absent values rendered as absent. ~80 LOC.
- **S-6 · Restart test** — see §13 T3 (the acceptance gate).
- **Explicitly NOT in the slice:** any `src/core` storage adapter; evidence-loop persistence; provenance relabeling (P1, immediately after); goal/decision entities; knowledge stack; server-side visit tracking.

### 10.3 Final Design Test — scenario walkthrough

**SESSION A:** user imports repo (S-1 identity persisted) → asks questions (S-2 each Q&A on disk within its request) → receives grounded answers (existing path, unchanged) → gives feedback (S-3 persisted, correctly keyed) → captures an insight (existing flow, now unblocked) → states/confirms a goal (**honest boundary: no goal runtime exists; the slice persists no goal and the UI shows no goal — Goal Integrity preserved by refusal-to-fabricate**) → ends session (no flush needed; everything already durable).
**SYSTEM RESTART:** SIGTERM/kill -9 → respawn. `loadAll()` reloads the store (`mvp-ui/index.ts:76`).
**SESSION B:** user opens the project → continuity endpoint returns: what project this is (identity ✓), what happened previously (Q&A history with sources ✓), what the user was working on (last activity + last question ✓), captured insights ✓, explicit user choices (`userDecision`, `revisitCondition` ✓), unresolved items (DEFERRED/REVISITABLE/NEW ✓), changes since previous session (client-computed record delta ✓), continuation points (suggestions ✓). The user re-explains nothing. **The scenario is demonstrable end-to-end — therefore the slice is a valid Memory/Continuity vertical slice.**

---

## 11. Dependency Graph (exact implementation order)

```
 [S-0] Green in-path HEAD ──────────────────────────────────────────────┐
   fix 18 tsc errors in runtime path (evidence-loop 11,                 │ prerequisite for
   interaction-layer 4, engine 1, architecture.graph.ts 2)              │ trusting & shipping
   + remaining 7 tsc errors + 4 failing tests (release gate)            │ anything below
                                                                        ▼
 [S-1] Project identity wiring (ensureProject @ session start) ──► fixes D-1 (unblocks insights too)
        │
        ▼
 [S-2] Answer capture (captureSessionAnswer @ question handler, responseId-keyed)   ┐
        │                                                                            │ S-2/S-3 need S-1's
        ▼                                                                            │ sessionId→projectPath
 [S-3] Feedback capture (captureSessionFeedback @ feedback handler)                  ┘ binding + S-0 types
        │
        ▼
 [S-4] Continuity read endpoint (GET /api/project/:id/continuity)   ── needs S-1..S-3 data
        │
        ▼
 [S-5] Welcome Back SPA panel                                       ── needs S-4
        │
        ▼
 [S-6] Acceptance restart test T3 (+ T1/T2 unit/durability tests)   ── needs S-4 (S-5 for UI assertion)

 Parallel-safe: S-0 ∥ S-4 endpoint skeleton ∥ S-5 markup (all merge after S-3).
 Post-slice (immediately after, not blocking): provenance relabeling (P1-a), read-only revisitable (P1-b).
```

Touched files only: `src/core/{evidence-loop,evidence-loop types,interaction-layer,engine,autonomous-architecture/architecture.graph.ts}` (error fixes), `src/mvp-ui/{http-adapter.ts, project-service.ts, project-types.ts}` (S-1..S-4), `mvp-ui/index.html` (S-5), `src/__tests__/mvp-ui/*` + one integration test (S-6). **No `src/core` storage, engine, or runtime behavior changes.**

---

## 12. Stabilization Boundary

**A. Must fix now (slice-blocking / release-blocking):**

| Item | Count | Why it blocks | Nature |
|---|---|---|---|
| `evidence-loop-service.ts` errors | 11 | The module whose data S-2 persists; blocks `tsc`/build | 5 unused imports, **5 missing type aliases** (`IntentId/ResponseId/ClaimId/EvidenceFeedbackId/FindingId` `:69-73` — add or import type aliases), 1 `FindingStatus` mismatch `:367` |
| `interaction-layer` errors | 4 | On the slice's capture path | 3 unused vars + 1 unused import — trivial |
| `execution-engine.ts:849` | 1 | The engine is the slice's content source | Unused `formatBytes` — trivial |
| `architecture.graph.ts` duplicate `model` | 2 | Imported by engine (`:26`) and discovery (`:17`) — type-integrity of the answer path | 1 field dedup |
| Remaining `tsc` errors (graph-analysis 4, graph-validator 2, aa/index 1) | 7 | Not on the answer path (K-1) but block a clean `tsc --noEmit` = releasable HEAD | Unused/export/duplicate fixes |
| 4 failing tests (`architecture-graph-analysis.test.ts`) | 4 | Green CI is the trust baseline; also the root cause (broken `ArchitectureNodeKind`/`ArchitectureEdgeKind` import → `Object.values(undefined)`) is one import/export fix | Module-local |

**B. Should fix soon (integrity, immediately after the slice, not blocking it):** provenance labels from the actual adapter result (`execution-engine.ts:270,285-286`) so persisted history isn't born mislabeled; GET-revisitable → read-only + explicit POST (`http-adapter.ts:554-558`); register deterministic provider behavior (clear error when flags unset — already partially honest via 503).

**C. Can defer without blocking the slice:** insight tail routes (`updateStatus`, `getGoalSuggestions`); `knowledge/` unification or deletion; all four core file-backed adapters; `PersistentMemory`/`ContextLoader`/`CheckpointEngine` wiring; compliance enforcement; provider breadth/streaming/failover; README/AIS entry docs [audit]; the entire unwired ~36k LOC inventory (§9); server-side `lastVisitAt`; evidence-loop full persistence.

---

## 13. Validation Strategy (proving continuity is real, not merely implemented)

**T1 — Capture unit tests (fast, hermetic).** HttpAdapter-level with a stubbed `InteractionService` returning a fixed AnswerView; **real** `ProjectStore` on `mkdtempSync(tmpdir())` (pattern already proven: `project-store.test.ts:11-20`). Assert: after N questions, N `PersistedSession` records exist **on disk** (read the JSON file directly); feedback lands on exactly the targeted record (responseId keying — guards the S-3 wrinkle); sanitization + length caps hold; `ensureProject` created identity on first session.

**T2 — Durable-store boundary test (no HTTP).** Build store + records in process A-state; destroy all in-memory objects; re-instantiate `ProjectStore` → `loadAll()` from the same directory; assert full record equality (sessions, insights, feedback, findings, identity). This is the exact corruption-handling + reload path `mvp-ui/index.ts:76` exercises.

**T3 — Acceptance test: real process restart (the GO condition).**
1. Start a local **mock OpenAI-compatible server** (20-line Node http handler returning a fixed completion) — feasible because `real-provider-wrapper.ts:88-91` honors `OPENAI_BASE_URL`.
2. Spawn `node dist/mvp-ui/index.js` (or `npx tsx src/mvp-ui/index.ts`) as a **child process** with `AIS_EXECUTION_REAL=true AIS_REAL_LLM=true OPENAI_API_KEY=test-key OPENAI_BASE_URL=http://127.0.0.1:<mock>/v1 MVP_UI_PORT=<p>` and **cwd = temp dir** (so `.ais-data/` is isolated).
3. SESSION A via HTTP: `POST /api/session` (demo project) → 2× `POST question` → `POST feedback` (correct) → `POST insight` + `evaluate` + `decide(DEFER, revisitCondition)`.
4. `SIGTERM` the child; assert process exit; assert `.ais-data/projects/<id>.json` contains 2 session records + feedback + insight (write-through proof — file was already complete *before* the signal).
5. Respawn the child (same cwd). SESSION B: `GET /api/project/:id/continuity` → assert every §5-clause-4 field populated from disk (identity, 2 Q&A with sources, feedback verdict, insight w/ userDecision + revisitCondition, unresolved = DEFERRED insight, suggestions); `GET /api/project/:id/history` → 2 records; re-ask a question → new record appends without disturbing old ones (keying proof).
6. Repeat the kill with `SIGKILL` in a second run to prove no graceful-flush dependency.

**T4 — Manual real-credential script (optional, non-CI).** Same scenario with a real key; validates answer *quality*, not continuity — explicitly out of the acceptance gate (consistent with the repo's own honest-validation stance [audit]).

**Disqualifiers (per brief):** any test whose "restart" is object-destruction + Map re-creation; any assertion satisfied by externally seeded JSON; any pass that depends on `flush()` in a shutdown handler. T1–T3 as specified contain none of these.

---

## 14. P0 / P1 / P2 / P3 Roadmap

| Pri | Item | Rationale |
|---|---|---|
| **P0-1** | Green HEAD: 25 tsc errors + 4 failing tests (§12-A) | Nothing releasable or trustworthy ships red; 18 of 25 touch the slice path |
| **P0-2** | Slice S-1..S-5: identity wiring, capture bridge (responseId-keyed), continuity endpoint, Welcome Back panel | The product-identity boundary: stateless analyzer → memory system |
| **P0-3** | T1–T3 validation, incl. real process-restart acceptance test | Without it, "continuity" is a claim, not a capability |
| **P1-a** | Provenance from actual adapter result (fix `execution-engine.ts:270,285-286`) | Persisted history must not be born mislabeled; answer-path trust |
| **P1-b** | Revisitable: read-only GET + explicit POST; expose insight tail routes (`updateStatus`, `getGoalSuggestions`) | HTTP semantics integrity; completes the strongest capability (80%→100% wired) |
| **P1-c** | Deterministic provider degradation: explicit `ProviderUnavailableError` surfacing (no-adapter mode), intent-confidence 500 → graceful 4xx | Answer-path reliability (§2.2) |
| **P2-a** | File-backed `SessionStorageAdapter` with `autoPersist` for FSM-level session resume — **only if** a cross-restart *interactive session* (not just project continuity) is actually wanted | Extends the canonical path after the slice proves the aggregate model |
| **P2-b** | Evidence-loop durable projection v2 (per-claim evidence chains), server-side visit tracking | Deepens continuity once v1 ships |
| **P2-c** | Documentation reality: AIS top-level entry doc; de-reference or restore the 14 missing README docs [audit] | Onboarding integrity |
| **P2-d** | Decision: unify or quarantine the `knowledge/` stack (delete vs feed) | Resolves Stack A/B duplication (~5.4k LOC) |
| **P3-a** | Canonical goal/decision/open-question model (one entity set, explicit-user-action capture) — design task first, no code until decided | 3 goal engines + 2 decision engines is 2 too many; slice deliberately does not choose |
| **P3-b** | Evolution intelligence redefinition against real metrics (currently synthetic [audit]); web intelligence; organization adaptation; provider breadth/streaming/tools; compliance enforcement; desktop shell integration | Hypothesis-grade or later waves; none feed the core loop yet |

---

## 15. Explicit Non-Goals (this wave)

1. **No new memory abstraction** — no fifth storage adapter, no generic "MemoryService". The ProjectStore path is canonical (§9).
2. **No implementation of the four `src/core` storage interfaces** (session/memory/checkpoint/context file adapters) — they stay as contracts; P2-a at the earliest.
3. **No goal, decision, or open-question runtime** — nothing may auto-create goals; only explicit user choices (`userDecision`) are persisted, as they already are.
4. **No knowledge-stack wiring or unification** — Stack B remains untouched; the A/B decision is P2-d.
5. **No Web Intelligence, Organization Adaptation, or Project Evolution Intelligence** work — P3.
6. **No multi-provider breadth, streaming, tool-calling, or autonomous actions** — the one OpenAI-compatible adapter suffices for the slice; `OPENAI_BASE_URL` mock covers testing.
7. **No engine re-architecture** — `ExecutionEngine`, discovery, cognitive runtime keep their structure; only error fixes.
8. **No SIP (`landing/`, `backend/`, `plugins/`, `packages/`) changes** and no `skills/` changes.
9. **No deletion sweeps in this wave** (even of the ~36k unwired LOC) — quarantine-by-inaction first; deletion is a separate, explicitly-scoped decision.
10. **No silent state changes** — the GET-that-mutates pattern is *not* replicated by the new endpoint; the continuity endpoint is strictly read-only.
11. **No test-count theater** — the 18.6k suite is not the maturity metric; T3 is.

---

## 16. Final Verdict

**Q: What is the smallest coherent change that would make AIS genuinely remember and continue a project across sessions?**

**A: Bolt the existing answer/feedback path onto the existing durable project store, and give that store a face.** Concretely: (1) a green in-path HEAD; (2) three wiring points — `ensureProject` at session start, `captureSessionAnswer` after each answer keyed by `responseId`, `captureSessionFeedback` after each verdict; (3) one read-only continuity endpoint composing the already-persisted identity, Q&A, insights, decisions, and unresolved items; (4) one Welcome Back panel rendering it; (5) a two-process restart test (hermetic via `OPENAI_BASE_URL`) as the acceptance gate. No new storage subsystem, no new models beyond two optional fields, no engine changes. Everything heavy — adapters, runtimes, tests, atomic writes, sanitization, identity — already exists and is verified; the slice is the connection.

**DECISION: GO WITH CONDITIONS.**

Conditions (all necessary to proceed):
1. **C-1 Green in-path HEAD first** — the 18 runtime-path tsc errors fixed and, for release, all 25 + the 4 failing tests (§12-A).
2. **C-2 responseId-keyed session records** (with optional `interactionSessionId`) — feedback must never overwrite sibling Q&A records (`project-store.ts:114-124` semantics).
3. **C-3 T3 passes as specified** — real process restart, hermetic provider, write-through proof, full §5 reconstruction; no in-memory round-trip substitutes.
4. **C-4 No new memory architecture** — slice touches only the listed files; the four core storage interfaces remain unwired contracts.
5. **C-5 Read-only continuity endpoint** — no state mutation from GET, ever.

**THE NEXT ENGINEERING TASK SHOULD BE:** **Activate the dead session-capture bridge** — in `HttpAdapter`, call `ProjectService.ensureProject(projectPath)` in `handleStartSession` and `ProjectService.captureSessionAnswer/captureSessionFeedback` in the question/feedback handlers (records keyed by `responseId`, secret-sanitized as already implemented), plus the T1 unit test and T2 durable-store test proving the records reach `.ais-data/projects/<id>.json` and reload across a store re-instantiation. This single task (~30–60 LOC across `http-adapter.ts`, `project-service.ts`, `project-types.ts` + tests) converts the repository's verified-but-orphaned persistence layer into real memory, unblocks UI insight creation (D-1), and is the only hard prerequisite for every remaining continuity step (endpoint, Welcome Back, restart acceptance).

---

*Verification trail (this report): direct file reads of the continuity-critical modules; `npx tsc --noEmit` re-run (25 errors, per-file distribution computed); targeted `npx vitest run` on the failing test file (4 failed / 8 passed); whole-tree import-graph and `node:fs` usage greps; SPA fetch-path greps; working-tree diff check (mode-level changes only, no source drift). Repository unmodified. Audit-derived items are marked "[audit]" and were used only where non-decision-critical; four audit corrections are registered in §2.4 (K-1..K-4). No credentials or tokens appear in this document.*
