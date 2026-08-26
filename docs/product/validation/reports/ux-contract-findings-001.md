# UX Contract Findings — TASK-MVP-FREE-UX-CONTRACT-001

**Task**: TASK-MVP-FREE-UX-CONTRACT-001  
**Date**: 2026-08-26  
**Branch**: `main`  
**HEAD**: `aff2c20`  
**Status**: **PASS — Contract approved, no code changes required**

---

## 1. Reality Check (§33)

### 1.1 Repository State

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD | `aff2c20` |
| Working tree | Clean (mode-only changes on 13 files from 001A/001B, zero content diff) |

### 1.2 Runtime Verification

| Component | Status | Location | Notes |
|---|---|---|---|
| ExecutionEngine | EXISTS | `src/core/engine/execution-engine.ts` (855 lines) | Requires `AIS_EXECUTION_REAL=true` + `OPENAI_API_KEY` |
| CognitiveRuntime | EXISTS | `src/core/cognitive/cognitive-runtime.ts` | Wraps ProviderRuntime, uses RealOpenAIAdapter |
| ProviderRuntime | EXISTS | `src/core/cognitive/provider-runtime.ts` | Reads `OPENAI_API_KEY` from env, supports `OPENAI_BASE_URL` |
| DiscoveryPipelineService | EXISTS | `src/core/discovery/discovery-pipeline.service.ts` | Scans project directory, builds ArchitectureGraph |
| SessionRuntime | EXISTS | `src/core/session/session-runtime.ts` | Session lifecycle management |

### 1.3 Interaction Layer (001B)

| Method | Signature | UX Mapping |
|---|---|---|
| `startInteraction` | `(params: StartInteractionParams) → Promise<SessionView>` | Screen 1: Start/Demo/MyProject |
| `submitQuestion` | `(params: SubmitQuestionParams) → Promise<AnswerView>` | Screen 2: Question → Screen 3: Response |
| `submitFeedback` | `(params: SubmitFeedbackParams) → Promise<FeedbackView>` | Screen 4: Feedback |
| `getTrace` | `(sessionId: string) → TraceView` | Operator trace (not user-facing) |
| `getSessionView` | `(sessionId: string) → SessionView` | State polling |

**Key types exposed**: SessionView, AnswerView, EvidenceSourceView, ClaimView, FeedbackView, TraceView, InteractionState.

**Key types NOT exposed** (internal): Intent, EvidenceLoopResponse, Claim, ClaimEvidence, EvidenceFeedback, QualityFinding. UI cannot create domain entities directly. §29 compliant.

### 1.4 Evidence Loop (001A)

All 13 operations verified in EvidenceLoopService: startSession, completeSession, recordIntent, recordResponse, createClaim, attachEvidence, recordFeedback, createFinding, getSessionTrace, updateClaimVerification, updateFindingStatus, getIntent, getResponse, getClaim, getEvidenceForClaim, getFeedbackForSession, getFinding, getFindingsForSession.

Invariants I-01 through I-13 enforced. 41 tests pass.

### 1.5 Provider Configuration

| Variable | Required | Purpose |
|---|---|---|
| `AIS_EXECUTION_REAL` | Yes (must be `true`) | Enables real pipeline |
| `AIS_REAL_LLM` | Yes | Enables real LLM calls |
| `OPENAI_API_KEY` | Yes | Provider authentication |
| `OPENAI_BASE_URL` | No | Custom endpoint (OpenRouter, etc.) |
| `AIS_EVIDENCE_PATH` | No | Evidence file storage path |

Provider uses OpenAI-compatible API. Supports any vendor via `OPENAI_BASE_URL`.

### 1.6 Project Path Mechanism

`StartInteractionParams.projectPath` (required string) flows to:
1. `EvidenceLoopService.startSession({ projectScope: projectPath })` — stored as session metadata
2. `ExecutionEngine.execute({ projectPath })` — passed to DiscoveryPipelineService for project scanning

**Result**: User-specified project scope = AIS analysis scope. §21 of UX contract is inherently satisfied by existing architecture.

### 1.7 HTTP/API Boundary

**FINDING: NO HTTP/API BOUNDARY EXISTS.**

The AIS project is a pure TypeScript library:
- No HTTP framework in dependencies (only `@types/node`, `typescript`, `vitest`)
- No server entry point (`src/server.ts`, `src/main.ts`, `src/index.ts` — none exist)
- No route/handler/controller files
- No `express`, `fastify`, `hono`, `koa`, `nestjs`, or any HTTP framework

**Implication**: The UI layer (TASK-MVP-FREE-UI-001) will need to introduce an HTTP adapter between the browser and the InteractionService. This is expected and does not violate any STOP CONDITION — the Interaction Layer contract remains unchanged.

### 1.8 Response Safety

InteractionService returns sanitized view models:
- `SessionView`: sessionId, state, createdAt — no internal IDs
- `AnswerView`: responseId, content (sanitized), sources, claims — secrets redacted
- `EvidenceSourceView`: filePath, type, excerpt, relevance — all sanitized
- `ClaimView`: claimId, statement, evidenceCount, isVerified
- `FeedbackView`: feedbackId, verdict, findingCreated
- `TraceView`: full chain with all sub-views

All user-facing data passes through `sanitizeSecrets()` (9 regex patterns). Error types inherit from `InteractionError` with safe messages, no stack traces.

---

## 2. Design Check (§34)

### 2.1 Component Reuse Table

| Existing Component | Action | Rationale |
|---|---|---|
| InteractionService | **REUSE** | Full public API: startInteraction, submitQuestion, submitFeedback, getTrace, getSessionView |
| EvidenceLoopService | **REUSE** | All domain operations, invariants I-01..I-13 |
| ExecutionEngine | **REUSE** | Real AIS pipeline (Discovery → Architecture → Context → LLM → Answer) |
| CognitiveRuntime | **REUSE** | LLM inference via ProviderRuntime |
| ProviderRuntime | **REUSE** | OpenAI-compatible provider abstraction |
| DiscoveryPipelineService | **REUSE** | Project scanning and ArchitectureGraph construction |
| SessionRuntime | **REUSE** | Session lifecycle (via EvidenceLoopService) |
| SecretSanitizer | **REUSE** | Applied to all stored entities automatically |
| InteractionState FSM | **REUSE** | 9-state machine with validated transitions |
| View Models (001B) | **REUSE** | SessionView, AnswerView, EvidenceSourceView, ClaimView, FeedbackView, TraceView |
| Error Types (001B) | **REUSE** | InteractionError, EmptyQuestionError, InteractionStateError, ExecutionFailedError |
| Existing UI screens | **VERIFY** | Desktop UI exists (`src/ui/screens/`) but is NOT suitable for web MVP — it's a desktop application framework |
| New HTTP adapter | **MINIMAL** | Required for UI → InteractionService communication. Not a domain change. |
| New web UI boundary | **MINIMAL** | 4-screen SPA per §26. Next task (TASK-MVP-FREE-UI-001). |
| Demo project | **PREPARE** | Need a pre-configured project path for demo mode (see §3.2) |
| New domain logic | **FORBIDDEN** | No new Session, Evidence, Feedback, Claim, or Finding entities |
| New AI capability | **FORBIDDEN** | No new inference, no new model, no new knowledge system |
| Billing / auth / CRM | **FORBIDDEN** | Per §3 and §5 of UX contract |

### 2.2 Architecture Boundary Compliance (§28)

```
UI (future TASK-MVP-FREE-UI-001)
  ↓
HTTP Adapter (minimal, to be created)
    ↓
InteractionService (REUSE, no changes)
    ↓
EvidenceLoopService (REUSE, no changes)
    ↓
ExecutionEngine (REUSE, no changes)
    ↓
CognitiveRuntime → ProviderRuntime → Provider (REUSE)
```

No bypass of Interaction Layer. No direct access to ExecutionEngine from UI. §28 compliant.

### 2.3 Evidence Boundary Compliance (§29)

UI will only call:
- `startInteraction()` — creates session via EvidenceLoopService
- `submitQuestion()` — triggers recordIntent + execute + recordResponse + createClaims + attachEvidence
- `submitFeedback()` — triggers recordFeedback + optionally createFinding
- `getTrace()` / `getSessionView()` — read-only trace retrieval

UI does NOT create: Session, Intent, Response, Claim, Evidence, Feedback, QualityFinding. All domain ownership remains in Evidence Loop. §29 compliant.

---

## 3. Gap Analysis

### 3.1 GAP-01: No HTTP/API Boundary

**Severity**: Expected, not a blocker
**Impact**: UI cannot directly call InteractionService from a browser
**Resolution**: TASK-MVP-FREE-UI-001 must introduce a minimal HTTP adapter (e.g., 4-5 endpoints wrapping InteractionService methods)
**STOP CONDITION check**: Does NOT require changing InteractionService contract. The adapter is a thin transport layer.

### 3.2 GAP-02: No Demo Project

**Severity**: Must resolve before MVP
**Impact**: AC-01 (No Project) and AC-02 (Demo) cannot work without a demo project

**Candidate: AIS self-analysis**

The AIS project itself (`/home/z/my-project/ais/src`) is a strong demo project candidate:

| Criterion | AIS Project | Assessment |
|---|---|---|
| Real module boundaries | 37 modules in `src/core/` | EXCELLENT |
| Real dependencies | Evidence Loop → Session → Engine → Cognitive → Provider | EXCELLENT |
| Architectural complexity | 854 TypeScript files, 214k LoC | HIGH (may be slow for discovery) |
| 3+ architectural questions | Execution flow, module connections, dependency chains, cognitive pipeline | EXCELLENT |
| Verifiable by source code | All source is accessible | YES |
| Same AIS pipeline | Uses the same Discovery → Architecture → Context → LLM pipeline | YES |

**Risk**: 214k LoC may cause slow discovery. Mitigation: the discovery pipeline has a token budget (`CONTEXT_TOKEN_BUDGET = 5000`) and file selection heuristics. Large projects are handled by question-driven retrieval, not full-scan.

**Alternative**: A smaller, dedicated demo project could be prepared. However, per §25, the demo should have "реальную архитектурную неопределённость" — a synthetic small project risks being too simple (§25: "hello-world-with-three-files"). The AIS project avoids this pitfall.

**Recommendation**: Use the AIS project itself as the demo project. Configure demo mode with `projectPath = '/home/z/my-project/ais/src'`. The exact path will be deployment-specific.

### 3.3 GAP-03: Provenance for Demo Sessions

**Severity**: Non-issue (design decision)
**Analysis**: `StartInteractionParams.provenance` accepts `'human' | 'synthetic'`. There is no `'demo'` value.

**Resolution**: Demo sessions use `provenance: 'human'` because a real human is interacting with AIS. The demo nature is tracked by the `projectPath` (demo project path vs user project path) and can be tagged at the UX/reporting layer.

**Why NOT add 'demo' to SourceType**: Adding a new SourceType value would modify Evidence Loop invariants (I-07: Human/Synthetic separation), which triggers STOP CONDITION §38.3. The current design is sufficient — demo sessions are human sessions with a known project scope.

**For evidence analysis**: Demo vs human-with-own-project can be distinguished by `session.projectScope` in the SessionTrace:
- Demo: `projectScope === DEMO_PROJECT_PATH`
- Human: `projectScope !== DEMO_PROJECT_PATH`

### 3.4 GAP-04: Single Question Per Session

**Severity**: Known limitation, acceptable for MVP
**Analysis**: The InteractionState FSM has no transition from `TraceAvailable` back to `Created`. Each session handles exactly one question.

**Impact**: After completing feedback, the user must start a new session for the next question.

**UX implication**: The UI should handle this by offering "Ask another question" which starts a new session with the same project.

**STOP CONDITION check**: Does NOT require changing Evidence Loop semantics or Interaction Layer contract. The FSM was designed this way in 001B. Adding multi-question sessions would be a feature addition, which is forbidden by Code Freeze (§32 of TASK-MVP-FREE-RELEASE-001) and §39 of this UX contract.

### 3.5 OBSERVATION-01: `getTrace` is Synchronous

`InteractionService.getTrace(sessionId)` is a synchronous method (returns `TraceView`, not `Promise<TraceView>`). The underlying `EvidenceLoopService.getSessionTrace()` is also synchronous. This is fine for an HTTP adapter but should be noted for the UI implementation.

### 3.6 OBSERVATION-02: Desktop UI Exists But Is Not Suitable

The project has `src/ui/screens/` with 9 desktop UI screens (goals, marketplace, workflows, etc.). These are part of the Desktop Application Foundation (TASK-AIS-004B) and are NOT suitable for the web MVP:
- They're designed for a desktop application context
- They don't implement the evidence loop interaction flow
- They don't have the 4-screen MVP structure
- Rewriting them would violate §3 ("не превращать задачу в redesign всей платформы")

**Resolution**: TASK-MVP-FREE-UI-001 creates a new, minimal web UI. The desktop UI remains untouched.

---

## 4. STOP CONDITIONS Check (§38)

| # | Condition | Status | Evidence |
|---|---|---|---|
| 1 | Необходимость изменения Architecture Model | **NO** | No architecture model changes needed |
| 2 | Необходимость новой AI capability | **NO** | Existing pipeline is sufficient |
| 3 | Необходимость изменения Evidence invariants | **NO** | Demo uses 'human' provenance, no new SourceType |
| 4 | Отсутствие безопасного способа изолировать Demo Project | **NO** | Demo project is just a directory path |
| 5 | Необходимость раскрывать credentials | **NO** | sanitizeSecrets() covers all output paths |
| 6 | Необходимость коммерческой инфраструктуры | **NO** | No billing, auth, CRM needed |
| 7 | Невозможность связать UI с Interaction Layer без изменения контракта | **NO** | Contract is sufficient, needs HTTP transport only |
| 8 | Необходимость существенного изменения Execution Engine | **NO** | Engine already supports the required flow |

**VERDICT: NO STOP CONDITIONS TRIGGERED.**

---

## 5. AC Assessment

| AC | Requirement | Feasibility | Notes |
|---|---|---|---|
| AC-01 | No Project → Demo Session | FEASIBLE | Need demo project path + 'human' provenance |
| AC-02 | Demo Project analysed by real AIS | FEASIBLE | Same pipeline, just different projectPath |
| AC-03 | Free-form question | ALREADY SUPPORTED | `submitQuestion({ question: string })` |
| AC-04 | Real AIS pipeline | ALREADY SUPPORTED | ExecutionEngine → Discovery → Context → LLM |
| AC-05 | User receives response | ALREADY SUPPORTED | `AnswerView` with content + sources + claims |
| AC-06 | Evidence visible | ALREADY SUPPORTED | `EvidenceSourceView[]` in AnswerView |
| AC-07 | User can inspect evidence | FEASIBLE | filePath + excerpt in EvidenceSourceView |
| AC-08 | Feedback recording | ALREADY SUPPORTED | `submitFeedback({ verdict, comment? })` |
| AC-09 | Full session trace | ALREADY SUPPORTED | `getTrace()` → TraceView |
| AC-10 | Error doesn't break flow | ALREADY SUPPORTED | ExecutionFailedError, InteractionState.Failed |
| AC-11 | No secrets displayed | ALREADY SUPPORTED | sanitizeSecrets() on all paths |
| AC-12 | No domain duplication | ALREADY SUPPORTED | UI calls InteractionService only |
| AC-13 | Real project connection | FEASIBLE | User provides projectPath, same flow |
| AC-14 | No dead end without project | FEASIBLE | Demo mode always available as fallback |

**Summary**: 8 of 14 ACs are ALREADY SUPPORTED by existing code. 6 require UI implementation (which is TASK-MVP-FREE-UI-001, not this task).

---

## 6. UX Flow Mapping to Existing API

### 6.1 Screen 1 — Landing (Start / Project Selection)

```
User sees: "AIS — Understand your software"

Option A: "Explore an example project" (Demo Mode)
  → UI calls: startInteraction({ projectPath: DEMO_PROJECT_PATH, provenance: 'human' })
  → Returns: SessionView { sessionId, state: 'CREATED', createdAt }
  → UI navigates to Screen 2

Option B: "Use my project"
  → UI prompts for project path
  → UI calls: startInteraction({ projectPath: userPath, provenance: 'human' })
  → Returns: SessionView { sessionId, state: 'CREATED', createdAt }
  → UI navigates to Screen 2
```

### 6.2 Screen 2 — Question Input

```
User types: "How are the main components connected?"

UI calls: submitQuestion({ sessionId, question: "How are the main components connected?" })
  → State transitions: CREATED → QUESTION_SUBMITTED → PROCESSING → ANSWER_AVAILABLE → EVIDENCE_AVAILABLE → FEEDBACK_PENDING
  → Returns: AnswerView { responseId, content, sources[], claims[] }
  → UI navigates to Screen 3

Loading state (§20):
  → While Processing: UI shows "Analyzing your project..."
  → Real stages: Discovery → Architecture → Context → LLM → Answer
```

### 6.3 Screen 3 — Response + Evidence

```
UI renders:
  UNDERSTANDING: answerView.content
  KEY COMPONENTS: answerView.claims[].statement
  EVIDENCE: answerView.sources[].filePath + answerView.sources[].excerpt
  VERIFICATION: [Open source] links using filePath
```

### 6.4 Screen 4 — Feedback

```
User clicks: [Yes] / [Partly] / [No]

UI calls: submitFeedback({ sessionId, verdict: 'correct'|'incorrect'|'incomplete', comment?: string })
  → State transitions: FEEDBACK_PENDING → FEEDBACK_RECORDED → TRACE_AVAILABLE
  → Returns: FeedbackView { feedbackId, verdict, findingCreated }

If negative: UI optionally shows "What was wrong?" text field

UI shows: "Thank you."
```

---

## 7. Demo Project Recommendation

### 7.1 Candidate: AIS Self-Analysis

**Project path**: `<deployment-specific>/ais/src`

**Why this project**:
- 37 real modules with clear boundaries (cognitive, engine, evidence-loop, session, discovery, etc.)
- Real dependency chains (InteractionService → EvidenceLoopService → SessionRuntime, ExecutionEngine → CognitiveRuntime → ProviderRuntime)
- Real architectural ambiguity (evolution vs evidence-loop relationship, companion vs personal-intelligence overlap, etc.)
- Source code is accessible for verification
- No artificial construction needed
- Already exists in the deployment environment

**Suggested demo questions** (§7):
1. "How are the main components of this project connected?"
2. "What depends on the cognitive-runtime component?"
3. "What could break if I change the execution engine?"
4. "Where is the main execution flow?"

**Performance consideration**: 854 files / 214k LoC. The discovery pipeline uses question-driven retrieval with `CONTEXT_TOKEN_BUDGET = 5000` tokens. Discovery scans the directory structure but only loads relevant files. This should be manageable.

### 7.2 Demo vs Human Provenance Tracking

For future evidence analysis, sessions can be categorized by `projectScope`:

```typescript
// In usage-evidence analysis
const isDemoSession = (trace: SessionTrace) =>
  trace.session.projectScope === DEMO_PROJECT_PATH;

const isHumanOwnProjectSession = (trace: SessionTrace) =>
  trace.session.sourceType === 'human' &&
  trace.session.projectScope !== DEMO_PROJECT_PATH;
```

This provides the 3-way separation required by §30 (Demo / Human / Synthetic) without modifying Evidence Loop types.

---

## 8. Metrics Mapping (§22, §23)

### 8.1 Primary: Time to First Understanding (TTFU)

```
TTFU = timestamp(AnswerView received) - timestamp(Landing page loaded)
```

Measurable from: session.createdAt → response.createdAt (latencyMs in EvidenceLoopResponse).

### 8.2 Operational Metrics

| Metric | Source | Collection Point |
|---|---|---|
| Question Completion Rate | SessionTrace (has response?) | getSessionTrace() |
| Evidence Inspection Rate | UX event (user clicks [Open source]) | UI layer |
| Feedback Completion Rate | SessionTrace (has feedback?) | getSessionTrace() |
| Correct / Partly / Incorrect | EvidenceFeedback.type | getSessionTrace() |
| Session Abandonment | Session state = FEEDBACK_PENDING, no feedback | InteractionState |
| Repeat Question Rate | Multiple sessions from same user | UX layer (cookie/localStorage) |
| Demo vs Own Project | projectScope comparison | getSessionTrace() |

### 8.3 Research Questions (§23) Mapping

| Question | Metric | Data Source |
|---|---|---|
| Q1: Понимает ли человек, что делать? | Demo selection rate, time to first question | UX events |
| Q2: Может ли он сформулировать вопрос? | Question submission rate, empty question errors | InteractionService |
| Q3: Понимает ли ответ? | Feedback distribution (correct/partial/incorrect) | EvidenceLoopService |
| Q4: Доверяет ли он ответу? | Evidence inspection rate, feedback vs evidence correlation | UX + EvidenceLoop |
| Q5: Проверяет ли evidence? | Evidence source click rate, time on evidence section | UX events |
| Q6: Замечает ли ошибки? | Incorrect feedback rate, finding creation rate | EvidenceLoopService |
| Q7: Хочет ли задать второй вопрос? | New session creation rate | UX + SessionRuntime |

---

## 9. Limitations

1. **No HTTP/API boundary**: Must be created in TASK-MVP-FREE-UI-001. The InteractionService contract is sufficient — only a thin transport adapter is needed.

2. **Single question per session**: The FSM doesn't support returning to ask another question in the same session. "Ask another question" must create a new session.

3. **In-memory storage**: All evidence loop data is lost on process restart. Acceptable for MVP evidence collection.

4. **No `demo` provenance type**: Demo sessions use `human` provenance. Demo vs human-with-own-project is distinguished by `projectScope` in SessionTrace.

5. **Demo project performance**: Using the AIS project (214k LoC) as demo may have slower discovery. Mitigated by question-driven context retrieval.

6. **No user identification**: No accounts, no cookies, no sessions persistence. User tracking for metrics (repeat usage, TTFU) must be handled at the UI/deployment level.

7. **`getTrace` is synchronous**: May need async wrapper in HTTP adapter.

---

## 10. Verdict

### UX Contract: APPROVED

The existing Interaction Layer (001B) + Evidence Loop (001A) + Execution Engine provide a complete foundation for the UX contract. 8 of 14 ACs are already supported. The remaining 6 require UI implementation (TASK-MVP-FREE-UI-001).

### No Code Changes Required

This task (TASK-MVP-FREE-UX-CONTRACT-001) does not require any code modifications to the AIS codebase. The UX contract is a specification and analysis document that maps the existing API to the desired user experience.

### Next Step

**TASK-MVP-FREE-UI-001** — Implement minimal web UI per this approved UX contract:
- Introduce HTTP adapter (4-5 endpoints wrapping InteractionService)
- Build 4-screen SPA (Landing, Question, Response, Feedback)
- Configure demo project path
- Deploy with `AIS_EXECUTION_REAL=true` + `OPENAI_API_KEY`

### STOP CONDITIONS: NONE TRIGGERED
