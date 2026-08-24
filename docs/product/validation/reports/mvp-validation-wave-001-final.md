# AIS MVP Validation — Wave 1 Final Report

**Task:** TASK-WAVE1-HUMAN-VALIDATION-SESSION-002  
**Wave:** 001  
**Status:** BLOCKED  
**Date:** _______________

---

## 1. Executive Summary

*To be completed after all sessions.*

| Metric | Value |
|---|---|
| Verdict | PASS / PASS WITH CONDITIONS / INCONCLUSIVE / FAIL / BLOCKED |
| Sessions Completed | __ / 5 minimum |
| Valid Sessions | __ / __
| Evidence Level Achieved | E0 / E1 / E2 / E3 / E4 |
| Recommendation | _______________ |

**One-paragraph summary:**
_______________

---

## 2. Objective

> Does AIS provide meaningful contextual advantage over independent repository exploration?

This Wave 1 study evaluates whether the AIS tool helps developers understand an unfamiliar software architecture better, faster, or deeper than independent code exploration.

**Scope:** `src/core/` directory (~393 files, ~73k LOC)

**Question:** What are the main architectural boundaries inside `src/core`, and how do the cognitive, discovery, and engine subsystems interact?

---

## 3. Participants

| ID | Role | Experience (yrs) | TS Familiarity | Project Familiarity | Valid | Session Date |
|---|---|---|---|---|---|---|
| P001 | __ | __ | __ | __ | __ | __ |
| P002 | __ | __ | __ | __ | __ | __ |
| P003 | __ | __ | __ | __ | __ | __ |
| P004 | __ | __ | __ | __ | __ | __ |
| P005 | __ | __ | __ | __ | __ | __ |
| P006 | __ | __ | __ | __ | __ | __ |
| P007 | __ | __ | __ | __ | __ | __ |
| P008 | __ | __ | __ | __ | __ | __ |

**Participant class notes:** _______________

---

## 4. Protocol

| Element | Value |
|---|---|
| Protocol Version | 1.0 |
| Baseline Timebox | 45 minutes |
| Question | Fixed (see §2) |
| Scope | `src/core/` |
| Scoring | B1–B6 rubric (see protocol/scoring-rubric.md) |
| Interview | Q1–Q9 (see protocol/interview-guide.md) |

**Protocol deviations per session:** _______________

---

## 5. Project Scope

- **Directory:** `src/core/`
- **Files:** ~393
- **LOC:** ~73,000
- **Key subsystems:** cognitive, discovery, engine, context, pipeline, workflow, ai-provider, memory, events, domain, and others
- **Language:** TypeScript

---

## 6. Baseline Results

### 6.1 Scores

| Dimension | P1 | P2 | P3 | P4 | P5 | Median |
|---|---|---|---|---|---|---|
| B1 — Correctness (0–5) | __ | __ | __ | __ | __ | __ |
| B2 — Completeness (0–5) | __ | __ | __ | __ | __ | __ |
| B3 — Dependency (0–5) | __ | __ | __ | __ | __ | __ |
| B4 — Boundary (0–5) | __ | __ | __ | __ | __ | __ |
| B5 — Evidence (0–5) | __ | __ | __ | __ | __ | __ |
| B6 — Calibration (0–3) | __ | __ | __ | __ | __ | __ |
| **Total (B1–B5)** | **__** | **__** | **__** | **__** | **__** | **__** |

### 6.2 Time

| | P1 | P2 | P3 | P4 | P5 | Median |
|---|---|---|---|---|---|---|
| Baseline time (min) | __ | __ | __ | __ | __ | __ |
| Completed within timebox? | __ | __ | __ | __ | __ | __ |

### 6.3 Exploration Patterns

*Summary of common patterns across participants:* _______________

### 6.4 Common Difficulties

*What participants struggled with most:* _______________

---

## 7. AIS Results

### 7.1 Scores

| Dimension | P1 | P2 | P3 | P4 | P5 | Median |
|---|---|---|---|---|---|---|
| Correctness (0–5) | __ | __ | __ | __ | __ | __ |
| Completeness (0–5) | __ | __ | __ | __ | __ | __ |
| Dependency (0–5) | __ | __ | __ | __ | __ | __ |
| Boundary (0–5) | __ | __ | __ | __ | __ | __ |
| Evidence (0–5) | __ | __ | __ | __ | __ | __ |
| **Total** | **__** | **__** | **__** | **__** | **__** | **__** |

---

## 8. Verification Results

### 8.1 Claim-Level Summary

| | P1 | P2 | P3 | P4 | P5 | Total |
|---|---|---|---|---|---|---|
| Total claims | __ | __ | __ | __ | __ | __ |
| Verified | __ | __ | __ | __ | __ | __ |
| Partially verified | __ | __ | __ | __ | __ | __ |
| Rejected | __ | __ | __ | __ | __ | __ |
| Accepted w/o verification | __ | __ | __ | __ | __ | __ |
| Hallucinated | __ | __ | __ | __ | __ | __ |
| Grounding rate | __% | __% | __% | __% | __% | __% |

---

## 9. Context Advantage

### 9.1 Per-Dimension Delta

| Dimension | P1 | P2 | P3 | P4 | P5 | Median Delta |
|---|---|---|---|---|---|---|
| Correctness | __ | __ | __ | __ | __ | __ |
| Completeness | __ | __ | __ | __ | __ | __ |
| Dependency | __ | __ | __ | __ | __ | __ |
| Boundary | __ | __ | __ | __ | __ | __ |
| Evidence | __ | __ | __ | __ | __ | __ |
| **Total (weighted)** | **__** | **__** | **__** | **__** | **__** | **__** |

### 9.2 Participants with Measurable Improvement

| Participant | Improved? | Dimension(s) | Delta |
|---|---|---|---|
| P001 | Yes / No | _______________ | __ |
| P002 | Yes / No | _______________ | __ |
| P003 | Yes / No | _______________ | __ |
| P004 | Yes / No | _______________ | __ |
| P005 | Yes / No | _______________ | __ |

---

## 10. Time Advantage

| | P1 | P2 | P3 | P4 | P5 | Median |
|---|---|---|---|---|---|---|
| Baseline time (min) | __ | __ | __ | __ | __ | __ |
| AIS-assisted time (min) | __ | __ | __ | __ | __ | __ |
| AIS response time (sec) | __ | __ | __ | __ | __ | __ |
| Verification time (min) | __ | __ | __ | __ | __ | __ |
| Time delta (min) | __ | __ | __ | __ | __ | __ |

---

## 11. Grounding

### Per-Participant Grounding Rate

| Participant | Grounding Rate | Claims Verified | Claims Rejected |
|---|---|---|---|
| P001 | __% | __ / __ | __ |
| P002 | __% | __ / __ | __ |
| P003 | __% | __ / __ | __ |
| P004 | __% | __ / __ | __ |
| P005 | __% | __ / __ | __ |

---

## 12. Hallucination Analysis

| Session | Hallucinated Claims | Severity | Impact on Understanding |
|---|---|---|---|
| P001 | __ | __ | __ |
| P002 | __ | __ | __ |
| P003 | __ | __ | __ |
| P004 | __ | __ | __ |
| P005 | __ | __ | __ |

**Overall hallucination rate:** __%

---

## 13. AI Wrapper Test

| Participant | Result | Reasoning |
|---|---|---|
| P001 | PASS / FAIL | _______________ |
| P002 | PASS / FAIL | _______________ |
| P003 | PASS / FAIL | _______________ |
| P004 | PASS / FAIL | _______________ |
| P005 | PASS / FAIL | _______________ |

**AI Wrapper pass rate:** __ / __ (__%)

---

## 14. Trust Calibration

| Participant | Calibration | Accepted Unsupported | Noticed Hallucination | Challenged AIS |
|---|---|---|---|---|
| P001 | _______________ | __ | __ | __ |
| P002 | _______________ | __ | __ | __ |
| P003 | _______________ | __ | __ | __ |
| P004 | _______________ | __ | __ | __ |
| P005 | _______________ | __ | __ | __ |

**Systematic over-trust pattern?** Yes / No

---

## 15. Hypothesis Results

| Hypothesis | Status | Evidence |
|---|---|---|
| H1 — Problem Exists | __ | _______________ |
| H2 — AIS Provides Context Advantage | __ | _______________ |
| H3 — Grounded Understanding | __ | _______________ |
| H4 — AI Is Not Generic Chat | __ | _______________ |
| H5 — Explainability | __ | _______________ |
| H6 — Trust | __ | _______________ |

Status values: CONFIRMED / PARTIALLY_CONFIRMED / NOT_CONFIRMED / DISCONFIRMED

---

## 16. Gate Results

| Gate | Criterion | Required | Achieved | Status |
|---|---|---|---|---|
| A — Problem | Participants showing baseline difficulty | 3/5 | __ / 5 | __ |
| B — Context Advantage | Measurable improvement in >=1 dimension | 3/5 | __ / 5 | __ |
| C — Grounding | Can verify key AIS claims | 4/5 | __ / 5 | __ |
| D — AI Wrapper | Project-specific value vs generic AI | 4/5 | __ / 5 | __ |
| E — Trust | No systematic over-trust | 0 violations | __ | __ |

---

## 17. Cross-Participant Analysis

### 17.1 Aggregate Metrics

| Metric | Value |
|---|---|
| Median baseline time | __ min |
| Median AIS-assisted time | __ min |
| Mean score delta (B1–B5) | __ |
| Median score delta (B1–B5) | __ |
| Mean grounding rate | __% |
| Mean hallucination rate | __% |
| AI Wrapper pass rate | __% |

### 17.2 Outliers

*Do not hide outliers — report them explicitly.*

_______________

---

## 18. Observations

*Separate observations from interpretations (§43).*

### Observations (factual)

1. _______________
2. _______________
3. _______________

### Interpretations (analytical)

1. _______________
2. _______________
3. _______________

---

## 19. Failure Modes

| # | Failure Mode | Frequency | Severity | Affected Sessions |
|---|---|---|---|---|
| 1 | _______________ | __ | __ | __ |
| 2 | _______________ | __ | __ | __ |
| 3 | _______________ | __ | __ | __ |

---

## 20. Product Implications

*What does Wave 1 mean for the product?* _______________

---

## 21. Architecture Implications

*What does Wave 1 mean for the architecture?* _______________

---

## 22. Knowledge Implications

*What does Wave 1 mean for architecture knowledge?* _______________

---

## 23. Recommended Next Tasks

| Priority | Task | Depends On |
|---|---|---|
| __ | _______________ | _______________ |
| __ | _______________ | _______________ |
| __ | _______________ | _______________ |

---

## 24. Evidence Maturity

| Level | Description | Achieved? |
|---|---|---|
| E0 | Assumption | Yes / No |
| E1 | Internal/technical evidence | Yes / No |
| E2 | Observed real user evidence | Yes / No |
| E3 | Repeated validation across users | Yes / No |
| E4 | Commercial/behavioral evidence | Yes / No |

---

## 25. Final Verdict

**Verdict:** PASS / PASS WITH CONDITIONS / INCONCLUSIVE / FAIL / BLOCKED

**Justification:** _______________

**Next step (per §53):** _______________

---

## Appendices

- A: Individual session records (P001/ – P008/)
- B: Raw AIS outputs
- C: Interview transcripts
- D: Protocol documents
