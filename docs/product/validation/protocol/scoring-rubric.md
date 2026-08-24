# Baseline & AIS Scoring Rubric

Both baseline and AIS-assisted answers are scored on the same dimensions using the same scale, enabling direct comparison.

---

## Scoring Dimensions

### B1 — Correctness (0–5)

| Score | Description |
|---|---|
| 0 | Answer is entirely incorrect or irrelevant |
| 1 | Mostly incorrect; minor fragment of truth |
| 2 | Partially correct; some key elements right, others wrong |
| 3 | Mostly correct; minor errors or omissions |
| 4 | Correct with minor gaps |
| 5 | Fully correct; all identified elements are accurate |

**What to check:**
- Are identified subsystems real (not invented)?
- Are described responsibilities accurate per the code?
- Are stated interactions correct?
- Are dependency directions correct (A → B, not B → A)?

---

### B2 — Completeness (0–5)

| Score | Description |
|---|---|
| 0 | No meaningful architectural elements identified |
| 1 | Identified 1 subsystem with minimal detail |
| 2 | Identified 2–3 subsystems; major gaps |
| 3 | Identified most subsystems; some gaps in interactions |
| 4 | Near-complete coverage; minor omissions |
| 5 | Comprehensive coverage of boundaries, responsibilities, and interactions |

**Reference scope (what a complete answer would cover):**
- `cognitive/` — intent recognition, context building, prompt composition, provider routing
- `discovery/` — pipeline-based code analysis, discovery types
- `engine/` — execution engine, request processing, context retrieval
- `context/` — context engine, context building, caching, serialization
- `pipeline/` — execution pipeline, planning, scheduling, recovery
- `workflow/` — workflow runtime, definitions, scheduling, FSM
- `ai-provider/` — provider SDK, routing, failover, streaming, cost
- `memory/` — working memory, persistent memory, session memory
- `events/` — event bus, dispatching, envelope
- `domain/` — DDD entities, aggregates, value objects, events
- Cross-cutting: compliance, evolution, tool, capability, knowledge, etc.

---

### B3 — Dependency Understanding (0–5)

| Score | Description |
|---|---|
| 0 | No dependencies identified |
| 1 | 1–2 dependencies mentioned; mostly wrong |
| 2 | Some correct dependencies; significant gaps |
| 3 | Key dependencies correct; some missed |
| 4 | Most important dependencies identified and correctly directed |
| 5 | Comprehensive dependency map including cross-cutting concerns |

**Key dependencies to check for (not exhaustive — observer uses code verification):**
- `engine/` depends on `cognitive/` (for LLM calls)
- `engine/` depends on `context/` (for context retrieval)
- `cognitive/` depends on `ai-provider/` (for model routing)
- `discovery/` is relatively standalone (pipeline-based analysis)
- `engine/` orchestrates the overall request flow
- `events/` used by most subsystems
- `domain/` provides shared types used across subsystems
- `context/` feeds into `cognitive/` prompt building

---

### B4 — Architectural Boundary Understanding (0–5)

| Score | Description |
|---|---|
| 0 | No concept of boundaries; flat view of files |
| 1 | Recognizes some directories are different but can't explain why |
| 2 | Identifies some boundaries; confuses others |
| 3 | Correctly identifies most major boundaries; some blurring |
| 4 | Clear boundary identification with accurate responsibility assignment |
| 5 | Precise boundary understanding including internal structure of subsystems |

**What to check:**
- Can participant distinguish `cognitive/` from `ai-provider/`?
- Can participant distinguish `engine/` from `cognitive/`?
- Does participant understand `domain/` is a shared layer, not a subsystem?
- Does participant recognize `discovery/` as a standalone analysis pipeline?

---

### B5 — Evidence Quality (0–5)

| Score | Description |
|---|---|
| 0 | No evidence provided |
| 1 | Vague references ("I saw something in the engine folder") |
| 2 | File names mentioned but no code specifics |
| 3 | File names + code patterns ("uses EventEmitter pattern") |
| 4 | Specific code references (function names, class names, imports) |
| 5 | Precise code references with line-level evidence and correct attribution |

---

### B6 — Confidence Calibration (0–3)

| Score | Description |
|---|---|
| 0 | Confidence level does not match accuracy (over-confident or under-confident) |
| 1 | Roughly calibrated; some misalignment |
| 2 | Well-calibrated; confidence matches demonstrated knowledge |
| 3 | Precisely calibrated; explicitly marks uncertainty where appropriate and is correct where confident |

**What to check:**
- Did participant state uncertainty where they should be uncertain?
- Did participant express high confidence on things they got right?
- Did participant avoid over-claiming?

---

## Scoring Rules

1. **Score independently** — do not look at AIS answer while scoring baseline and vice versa
2. **Use code verification** — if unsure about a claim, check the actual source
3. **Two observers preferred** — if possible, have two people score and resolve differences
4. **Document reasoning** — for each score, note which specific claims influenced the rating
5. **Don't grade effort** — a 45-minute incomplete answer may score higher than a rushed complete one if more accurate

---

## Context Advantage Calculation

```
Context Advantage (per dimension) = AIS_score - Baseline_score

Overall Context Advantage = weighted average across B1–B5
  (B1: 25%, B2: 20%, B3: 20%, B4: 20%, B5: 15%)
```

B6 (Confidence Calibration) is reported separately — it does not factor into the Context Advantage score but is analyzed in the Trust Calibration section.