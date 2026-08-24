# Claim Classification Protocol

During the Verification Phase, each substantive AIS claim must be classified along two axes.

---

## Axis 1: Claim Type

### FACT
A statement that can be directly verified against the source code.

**Example:** "The `ExecutionEngine` in `src/core/engine/execution-engine.ts` orchestrates request processing by calling `processQuery()` which retrieves context and invokes the cognitive subsystem."

**Verification method:** Open the file, find the function, check the implementation.

### DERIVED INSIGHT
A conclusion drawn from multiple facts that requires synthesis.

**Example:** "The cognitive subsystem acts as a middleware layer between the engine and the AI provider, handling prompt composition, model routing, and context compression."

**Verification method:** Verify each contributing fact, then assess whether the synthesis is valid.

### HYPOTHESIS
A speculative statement about design intent or future behavior.

**Example:** "The discovery subsystem appears designed for offline analysis rather than runtime queries, given its pipeline-based architecture."

**Verification method:** Check if evidence supports the speculation. Mark as hypothesis regardless of correctness.

### RECOMMENDATION
A suggestion for how to work with or modify the system.

**Example:** "When modifying the engine, changes should be tested against both the pipeline and cognitive subsystems due to their tight coupling."

**Verification method:** Verify that the underlying facts support the recommendation.

### UNCERTAINTY
An explicit expression of doubt or limitation.

**Example:** "The exact boundary between the `context/` and `cognitive/` subsystems is unclear — both appear to handle context building."

**Verification method:** Verify whether the uncertainty is warranted (i.e., the boundary IS unclear) or not.

### CONFLICT
A statement that contradicts another claim (AIS's own or the participant's understanding).

**Example:** "While the discovery pipeline runs independently, it appears to share event types with the main event bus." (potential conflict with independence claim)

**Verification method:** Resolve the conflict by checking source code.

---

## Axis 2: Evidence Support

### SUPPORTED
The claim is fully supported by the source code evidence provided.

**Criteria:**
- Referenced file(s) exist
- Referenced code exists in those files
- The claim accurately describes what the code does
- No cherry-picking or misleading context

### PARTIALLY_SUPPORTED
The claim is mostly correct but has minor inaccuracies or incomplete evidence.

**Criteria:**
- Core assertion is correct
- Some details are wrong, missing, or misleading
- Evidence partially supports but doesn't fully cover the claim

### UNSUPPORTED
The claim lacks sufficient evidence to verify.

**Criteria:**
- No file/code references provided
- References point to wrong files
- Claim is generic and could apply to any project

### CONTRADICTED
The source code directly contradicts the claim.

**Criteria:**
- Referenced code does the opposite of what's claimed
- Dependency direction is reversed
- Stated pattern doesn't exist in the code

### HALLUCINATED
The claim references files, functions, or patterns that do not exist in the codebase.

**Criteria:**
- Referenced file does not exist
- Referenced function/class does not exist
- Fabricated code snippets
- Invented dependency that has no source

---

## Classification Process

For each session:

1. **Extract claims** — read AIS output, identify all substantive architectural claims
2. **Classify** — assign Type (FACT/DERIVED INSIGHT/etc.) and Support (SUPPORTED/etc.)
3. **Verify** — participant checks each claim against the repository
4. **Record participant action** — did they verify? Did they accept without checking?
5. **Record outcome** — VERIFIED / PARTIALLY VERIFIED / REJECTED

---

## Minimum Claims to Classify

Not every sentence needs classification. Focus on **substantive claims** about:

- Architecture boundaries
- Subsystem responsibilities
- Dependencies and interactions
- Design patterns
- Specific code behavior

Skip:
- Generic introductions ("The system has multiple subsystems")
- Formatting/thransition text
- Questions the AIS asks the user

**Target:** 10–20 claims per session for meaningful analysis.

---

## Trust Signals

During verification, also record:

| Signal | Meaning |
|---|---|
| Accepted without verification | Participant trusted AIS without checking |
| Verified and confirmed | Participant checked and agreed |
| Verified and corrected | Participant checked and found error |
| Rejected without verification | Participant disagreed without checking |
| Asked follow-up | Participant probed deeper |
| Expressed doubt | Participant voiced uncertainty about claim |
|