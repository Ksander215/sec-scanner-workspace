# Synthetic Validation Wave 001

**Task:** TASK-WAVE1-SYNTHETIC-VALIDATION-001
**Evidence Level:** S1 (Synthetic Agent Evidence)
**AIS Version:** v3.1 frozen (commit `ab42c7a`)
**Status:** COMPLETE (15/15 runs)
**Date Completed:** 2026-08-25

---

## Purpose

Controlled experiment with AI agents in 3 modes to assess AIS v3.1 quality before Human Validation.

**This is NOT Human Validation.** Results are marked S1 and cannot be used as E2 evidence.

---

## Key Results

| Mode | Median (0-25) | Hallucinations | File Refs |
|---|---|---|---|
| CONTROL A (independent) | **25** | 0 | 15-30+ |
| CONTROL B (code + LLM) | **19** | 0 | 3-4 |
| AIS v3.1 | **19** | 0 | 6 |
| Historical AIS v3.0 | 5 | 1 | 0 |

**Context Advantage: NOT DEMONSTRATED**
**AI Wrapper Signal: INCONCLUSIVE — LEANING PRESENT**

---

## Experiment Matrix

| Run | Role | Mode | Score | Status |
|---|---|---|---|---|
| A01 | Developer | CONTROL A | 23 | DONE |
| A02 | Senior Dev | CONTROL A | 25 | DONE |
| A03 | Tech Lead | CONTROL A | 25 | DONE |
| A04 | Architect | CONTROL A | 25 | DONE |
| A05 | Security Eng | CONTROL A | 21 | DONE |
| B01 | Developer | CONTROL B | 17 | DONE |
| B02 | Senior Dev | CONTROL B | 19 | DONE |
| B03 | Tech Lead | CONTROL B | 20 | DONE |
| B04 | Architect | CONTROL B | 21 | DONE |
| B05 | Security Eng | CONTROL B | 16 | DONE |
| C01 | Developer | AIS v3.1 | 23 | DONE |
| C02 | Senior Dev | AIS v3.1 | 19 | DONE |
| C03 | Tech Lead | AIS v3.1 | 20 | DONE |
| C04 | Architect | AIS v3.1 | 18 | DONE |
| C05 | Security Eng | AIS v3.1 | 16 | DONE |

---

## Files

```
synthetic-wave-001/
  README.md                          (this file)
  agent-role-definitions.md           (5 role prompts + mode instructions)
  question-set.md                    (Q1 primary, Q2/Q3 alternatives)
  run-matrix.md                      (all 15 runs with scores)
  evaluation-rubric.md               (S1-S5 scoring + claim classification)
  comparison-report.md               (full cross-mode analysis)
  findings.md                        (F-001 to F-016)
  wave-001-synthetic-final-report.md  (executive summary + gate results)
  runs/
    A01/ response.md                  (CONTROL A, Developer)
    A02/ response.md                  (CONTROL A, Senior Dev)
    A03/ response.md                  (CONTROL A, Tech Lead)
    A04/ response.md                  (CONTROL A, Architect)
    A05/ response.md                  (CONTROL A, Security Eng)
    B01/ response.md                  (CONTROL B, Developer)
    B02/ response.md                  (CONTROL B, Senior Dev)
    B03/ response.md                  (CONTROL B, Tech Lead)
    B04/ response.md                  (CONTROL B, Architect)
    B05/ response.md                  (CONTROL B, Security Eng)
    C01/ response.md                  (AIS v3.1, Developer)
    C02/ response.md                  (AIS v3.1, Senior Dev)
    C03/ response.md                  (AIS v3.1, Tech Lead)
    C04/ response.md                  (AIS v3.1, Architect)
    C05/ response.md                  (AIS v3.1, Security Eng)
```

---

## Frozen Configuration

| Field | Value |
|---|---|
| AIS Commit | `ab42c7a` |
| Scope | `src/core/` |
| Files | 392 |
| LOC | 73,559 |
| Question | Q1 (cognitive/discovery/engine boundaries) |
| Protocol Version | 1.0 |
| LLM Used | GLM-4-Plus via z-ai-web-dev-sdk |