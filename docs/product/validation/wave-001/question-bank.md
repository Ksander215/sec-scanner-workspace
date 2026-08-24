# Validation Question Bank — Wave 1

> **FROZEN** — questions cannot be changed after the first session begins.
> If a change is needed after Wave 1 starts, it requires a separate decision record.

---

## Q1 — Primary (All Participants)

> **What are the main architectural boundaries inside `src/core`, and how do the cognitive, discovery, and engine subsystems interact?**

**Rationale:**
- Requires cross-file investigation (no single file contains the full answer)
- Has a verifiable answer (checkable against actual code)
- No obvious answer after reading one file
- Specifically targets the three subsystems mentioned in the task chain
- Baseline vs AIS comparison is meaningful

**Expected investigation scope:**
- `src/core/engine/` — entry point, orchestration
- `src/core/cognitive/` — LLM interaction, prompt building, context
- `src/core/discovery/` — code analysis pipeline
- `src/core/context/` — context engine, context building
- `src/core/ai-provider/` — provider routing, failover
- `src/core/events/` — cross-subsystem communication

**Verification approach:**
- For each claim about a subsystem, open the referenced files
- Check if described responsibilities match actual exports/classes
- Check if stated dependencies match actual imports
- Verify interaction patterns (event-based, direct call, etc.)

---

## Q2 — Alternative (If Q1 is compromised)

> **How does the `engine/` subsystem orchestrate a user query from receipt to LLM response, and what is the role of the `context/` subsystem in this flow?**

**Rationale:**
- Focuses on a specific request flow (more focused than Q1)
- Requires tracing code execution path across subsystems
- `engine/` → `context/` → `cognitive/` → `ai-provider/` chain
- Verifiable: follow the `processQuery()` or equivalent entry point

**Use if:** Q1 was leaked, or a participant saw Q1 before their session.

**Do NOT use for the same participant as Q1.**

---

## Q3 — Alternative (If Q1 and Q2 are compromised)

> **What are the key dependencies between the `pipeline/`, `workflow/`, and `engine/` subsystems, and how do they differ in their execution models?**

**Rationale:**
- Tests understanding of different execution paradigms (pipeline vs workflow vs request)
- Requires comparing FSM-based, pipeline-based, and direct execution patterns
- Verifiable against actual implementations

**Use if:** Both Q1 and Q2 are compromised.

---

## Question Selection Rules

1. **Primary:** All participants receive Q1 unless it is compromised
2. **Consistency:** All valid sessions should use the same question for comparability
3. **Compromise detection:** If any participant saw the question before their session, switch to Q2 for ALL remaining participants
4. **No mixing:** Do not give different participants different questions unless a compromise occurred
5. **Post-change lock:** After switching questions, the new question becomes frozen

---

## Ground Truth Reference

> **IMPORTANT:** The ground truth answer is NOT stored in this file to prevent observer bias.
> The observer verifies claims against the actual source code during/after sessions.
> A separate (observer-only) reference may be created after all sessions are complete for scoring calibration.
