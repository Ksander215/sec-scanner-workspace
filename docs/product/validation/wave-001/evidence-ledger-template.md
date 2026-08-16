# Wave 1 — Evidence Ledger Template

**Task:** TASK-PRODUCT-VALIDATION-EXECUTION-001  
**Format:** One entry per observation. Copy template for each evidence item.

---

## Ledger Entry Template

```yaml
evidence_id: EVD-NNN
participant: P-NNN
persona: [Developer / Tech Lead / Architect / Security Engineer / CTO]
scenario: [A / B / C / D / E / F / G / H]
hypothesis: [H1-H12]  # from Hypothesis Mapping (Execution Spec §21)

# --- Fact Layer ---
observation: |-
  [Verbatim description of what happened. Observable behaviour only.
   No interpretation. No "probably" or "seems like".]

task_outcome: |
  [What the user actually did with the result. Or did nothing.]

# --- Evidence Classification ---
evidence_level: [E0 / E1 / E2 / E3 / E4]
evidence_weight: [0 / 0.5 / 1.0 / 1.5]  # per Independence rules (§6)

# Evidence level justification:
# E0 = Claim (user stated, no behaviour)
# E1 = Observed (single user, single session)
# E2 = Repeated (3+ users, 2+ scenarios)
# E3 = Comparative (AIS > baseline, 5+ users)
# E4 = Behavioral/Commercial (workflow change, return, WTP)

# --- Interpretation Layer ---
interpretation: |-
  [What this might mean. Separated from fact.
   Must reference specific principle/hypothesis.]

confidence: [high / medium / low]

# --- Contradiction ---
contradiction: null  # or EVD-NNN of contradicting evidence
contradiction_cause: |-
  [If contradiction exists: persona difference / task difference /
   context difference / experience difference / genuine product contradiction]

# --- Quality Signals (from Execution Spec §19) ---
quality_signal: [null / Positive / Correction / Rejection / Confirmation / Missing Context / Decision]
quality_signal_verbatim: |
  [Exact user statement if signal is verbal]

# --- Architecture Validation ---
architecture_decision: [D1-D10 or null]
ad_validation: [Confirm / Contradict / Neutral]

# --- UX Validation ---
ux_principle: [null / Intent-First / Minimal Sufficient / Progressive Disclosure /
  Context Before Presentation / Model Before Interpretation /
  Explain Before Recommend / Human Decision Boundary /
  No False Certainty / AI Not Source of Truth / Generic Chat Boundary]
ux_validation: [Confirm / Contradict / Neutral]

# --- Product Decision ---
decision: [Keep / Refine / Remove / Defer / Investigate]
decision_rationale: |
  [Why this decision]

# --- Context ---
timestamp: YYYY-MM-DD
session_phase: [Baseline / AIS / Post-Session / Follow-up]
researcher_interpretation: |
  [Researcher's interpretation. Clearly labeled as interpretation, not fact.]

# --- AI Wrapper Test ---
ai_wrapper_relevant: [yes / no]
ai_wrapper_observation: |
  [If relevant: what generic AI could/could not do]
``n
---

## Evidence Ledger Index

| EVD ID | Participant | Persona | Scenario | Hypothesis | E-Level | Weight | Decision |
|--------|------------|---------|----------|------------|---------|--------|----------|
| | | | | | | | |

---

## Aggregation Summary

### Per Hypothesis

| Hyp | Total Evidence | Independent (≥1.0) | E0 | E1 | E2 | E3 | E4 | Verdict |
|-----|----------------|---------------------|----|----|----|----|----|---------|
| H1 | | | | | | | | |
| H2 | | | | | | | | |
| H3 | | | | | | | | |
| H4 | | | | | | | | |
| H5 | | | | | | | | |
| H6 | | | | | | | | |
| H7 | | | | | | | | |
| H8 | | | | | | | | |
| H9 | | | | | | | | |
| H10 | | | | | | | | |
| H11 | | | | | | | | |
| H12 | | | | | | | | |

### Per Persona

| Persona | Participants | Evidence Count | Positive | Negative | Inconclusive |
|---------|-------------|----------------|----------|----------|-------------|
| Developer | | | | | |
| Tech Lead | | | | | |
| Architect | | | | | |
| Security Engineer | | | | | |
| CTO | | | | | |

### Per Scenario

| Scenario | Times Used | Avg Baseline Time | Avg AIS Time | Delta | Positive | Negative |
|----------|------------|-------------------|--------------|-------|----------|----------|
| A (Understand) | | | | | | |
| B (Dependency) | | | | | | |
| C (Change Impact) | | | | | | |
| D (Security) | | | | | | |
| G (Architecture Decision) | | | | | | |
| H (Unknown System) | | | | | | |