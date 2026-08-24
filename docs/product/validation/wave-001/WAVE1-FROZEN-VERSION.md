# WAVE1-FROZEN-VERSION

> This record uniquely identifies the AIS version, configuration, and scope used for Wave 1 Human Validation.

---

## AIS Version

| Field | Value |
|---|---|
| Version Label | **v3.1** |
| Git Commit | `ab42c7a187818e6e56d959ebcb9f0b3136c95f64` |
| Git Branch | `main` |
| Commit Message | `fix(v3.1): trim 400 tokens — add generic nouns to stop words, reduce MAX_NODES 8→6` |
| Commit Date | (recorded at freeze time) |
| Tree SHA | (run `git rev-parse HEAD^{tree}` to verify) |

## Context Quality Baseline (v3.1)

| Metric | Value | Status |
|---|---|---|
| Prompt Tokens | 7,918 | PASS (≤8000) |
| Empty Snippets | 0/11 | PASS |
| Code References | 5+ | PASS |
| Noisy Sources | 0 | PASS |
| Hallucinations | 0 | PASS |
| AI Wrapper Test | FAIL (pre-human) | — |

## Key Implementation Files (frozen)

| File | Lines | Role |
|---|---|---|
| `src/core/engine/execution-engine.ts` | 854 | Context retrieval, token budget, node ranking, LLM prompt |
| `src/core/cognitive/real-provider-wrapper.ts` | — | OpenAI-compatible provider with OPENAI_BASE_URL |
| `src/core/cognitive/cognitive-runtime.ts` | — | Cognitive orchestration |
| `src/core/discovery/discovery-pipeline.service.ts` | — | Code analysis pipeline |
| `src/core/discovery/discovery-types.ts` | — | Discovery type definitions |

## Configuration (frozen)

| Parameter | Value |
|---|---|
| CONTEXT_TOKEN_BUDGET | 5000 |
| CHARS_PER_TOKEN | 3.5 |
| MAX_NODES | 6 |
| MAX_EVIDENCE_SOURCES | 10 |
| Stop words | Extended set (includes `components`, `utils`, `helpers`, etc.) |
| LLM citation directive | Enabled in context preamble |
| Provider | OpenAI-compatible via OPENAI_BASE_URL |

## Validation Scope (frozen)

| Field | Value |
|---|---|
| Directory | `src/core/` |
| Total Files (non-test) | 392 |
| Total LOC (non-test) | 73,559 |
| Subsystem Count | 36 |
| Language | TypeScript |

### Subsystems in Scope

```
ai-provider/       engine/            knowledge/         personal/
autonomous-arch/  events/            memory/            personal-intelligence/
capability/       evolution/         pipeline/          plugins/
checkpoint/       experience/        providers/         recovery/
cognitive/        fsm/               runtime/           services/
companion/        identity/          session/           tool/
compliance/       config/            context/           trace/
contracts/        discovery/         domain/            types/
validation/       workflow/          zones/
```

## Validation Question (frozen)

> **Q1 (Primary):** What are the main architectural boundaries inside `src/core`, and how do the cognitive, discovery, and engine subsystems interact?

Additional questions in Question Bank (see `question-bank.md`).

## Validation Protocol (frozen)

| Document | Location |
|---|---|
| Protocol README | `docs/product/validation/protocol/README.md` |
| Consent Form | `docs/product/validation/protocol/consent-form.md` |
| Briefing Script | `docs/product/validation/protocol/briefing-script.md` |
| Scoring Rubric | `docs/product/validation/protocol/scoring-rubric.md` |
| Claim Classification | `docs/product/validation/protocol/claim-classification.md` |
| Interview Guide | `docs/product/validation/protocol/interview-guide.md` |
| Invalid Conditions | `docs/product/validation/protocol/session-invalid-conditions.md` |

## Environment (frozen)

| Component | Specification |
|---|---|
| Runtime | Node.js / Bun |
| AI Provider | OpenAI-compatible endpoint (OPENAI_BASE_URL) |
| Repository Access | Full read access to `src/core/` |
| Participant Tools | IDE/terminal/browser, standard search tools |
| AIS Interface | (same as MVP prototype interface) |

## Freeze Integrity

To verify the frozen version has not been modified:

```bash
cd /path/to/ais
git rev-parse HEAD  # should return ab42c7a187818e6e56d959ebcb9f0b3136c95f64
git diff ab42c7a -- src/core/engine/execution-engine.ts  # should be empty
git diff ab42c7a -- src/core/cognitive/  # should be empty
```

Any divergence from this commit invalidates the session for Wave 1 purposes unless explicitly documented and approved.

## Freeze Record

| Field | Value |
|---|---|
| Frozen By | _______________ |
| Freeze Date | _______________ |
| Verified By | _______________ |
| Verification Date | _______________ |
