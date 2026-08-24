# Synthetic Validation Wave 001

**Task:** TASK-WAVE1-SYNTHETIC-VALIDATION-001
**Evidence Level:** S1 (Synthetic Agent Evidence)
**AIS Version:** v3.1 frozen (commit `ab42c7a`)
**Status:** IN PROGRESS

---

## Purpose

Controlled experiment with AI agents in 3 modes to assess AIS v3.1 quality before Human Validation.

**This is NOT Human Validation.** Results are marked S1 and cannot be used as E2 evidence.

---

## Experiment Matrix

| Run | Role | Mode | Question |
|---|---|---|---|
| A01 | Developer | CONTROL A (independent) | Q1 |
| A02 | Senior Developer | CONTROL A (independent) | Q1 |
| A03 | Tech Lead | CONTROL A (independent) | Q1 |
| A04 | Architect | CONTROL A (independent) | Q1 |
| A05 | Security Engineer | CONTROL A (independent) | Q1 |
| B01 | Developer | CONTROL B (general LLM) | Q1 |
| B02 | Senior Developer | CONTROL B (general LLM) | Q1 |
| B03 | Tech Lead | CONTROL B (general LLM) | Q1 |
| B04 | Architect | CONTROL B (general LLM) | Q1 |
| B05 | Security Engineer | CONTROL B (general LLM) | Q1 |
| C01 | Developer | AIS v3.1 | Q1 |
| C02 | Senior Developer | AIS v3.1 | Q1 |
| C03 | Tech Lead | AIS v3.1 | Q1 |
| C04 | Architect | AIS v3.1 | Q1 |
| C05 | Security Engineer | AIS v3.1 | Q1 |

---

## Frozen Configuration

| Field | Value |
|---|---|
| AIS Commit | `ab42c7a` |
| Scope | `src/core/` |
| Files | 392 |
| LOC | 73,559 |
| Question | Q1 (see question-bank.md) |
| Protocol Version | 1.0 |

---

## Files

```
synthetic-wave-001/
  README.md
  experiment-protocol.md
  agent-role-definitions.md
  question-set.md
  run-matrix.md
  evaluation-rubric.md
  evidence-schema.yaml
  synthetic-evidence-ledger.yaml
  comparison-report.md
  findings.md
  wave-001-synthetic-final-report.md
  runs/
    A01/  A02/  A03/  A04/  A05/
    B01/  B02/  B03/  B04/  B05/
    C01/  C02/  C03/  C04/  C05/
```
