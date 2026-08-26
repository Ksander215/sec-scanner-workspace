# Run Matrix — Synthetic Wave 001

## Frozen Configuration

| Field | Value |
|---|---|
| AIS Commit | `ab42c7a` (v3.1) |
| Scope | `src/core/` (392 files, 73,559 LOC) |
| Question | Q1 (cognitive/discovery/engine boundaries) |
| Question Bank | wave-001/question-bank.md v1.0 |
| Agent Prompts | agent-role-definitions.md v1.0 |
| LLM for CONTROL B/AIS | GLM-4-Plus via z-ai-web-dev-sdk |

## Run Status — ALL COMPLETE

| Run | Role | Mode | Status | S1 | S2 | S3 | S4 | S5 | Total | Halluc |
|---|---|---|---|---|---|---|---|---|---|---|
| A01 | Developer (3yr) | CONTROL A | DONE | 5 | 5 | 4 | 4 | 5 | **23** | 0 |
| A02 | Senior Dev (7yr) | CONTROL A | DONE | 5 | 5 | 5 | 5 | 5 | **25** | 0 |
| A03 | Tech Lead (8yr) | CONTROL A | DONE | 5 | 5 | 5 | 5 | 5 | **25** | 0 |
| A04 | Architect (10yr) | CONTROL A | DONE | 5 | 5 | 5 | 5 | 5 | **25** | 0 |
| A05 | Security Eng (5yr) | CONTROL A | DONE | 5 | 4 | 4 | 4 | 4 | **21** | 0 |
| B01 | Developer (3yr) | CONTROL B | DONE | 4 | 3 | 4 | 3 | 3 | **17** | 0 |
| B02 | Senior Dev (7yr) | CONTROL B | DONE | 4 | 4 | 4 | 4 | 3 | **19** | 0 |
| B03 | Tech Lead (8yr) | CONTROL B | DONE | 4 | 4 | 5 | 4 | 3 | **20** | 0 |
| B04 | Architect (10yr) | CONTROL B | DONE | 5 | 4 | 4 | 4 | 4 | **21** | 0 |
| B05 | Security Eng (5yr) | CONTROL B | DONE | 3 | 3 | 3 | 3 | 3 | **16** | 0 |  // Fixed: was duplicate B04
| C01 | Developer (3yr) | AIS v3.1 sim | DONE | 5 | 5 | 4 | 4 | 5 | **23** | 0 |
| C02 | Senior Dev (7yr) | AIS v3.1 sim | DONE | 4 | 4 | 4 | 3 | 4 | **19** | 0 |
| C03 | Tech Lead (8yr) | AIS v3.1 sim | DONE | 4 | 4 | 4 | 4 | 4 | **20** | 0 |
| C04 | Architect (10yr) | AIS v3.1 sim | DONE | 4 | 4 | 4 | 3 | 3 | **18** | 0 |
| C05 | Security Eng (5yr) | AIS v3.1 sim | DONE | 4 | 3 | 3 | 3 | 3 | **16** | 0 |

## Aggregate by Mode

| Mode | Runs | Median | Mean | Min | Max | Halluc Total |
|---|---|---|---|---|---|---|
| CONTROL A | 5 | **25** | 23.8 | 21 | 25 | 0 |
| CONTROL B | 5 | **19** | 18.6 | 16 | 21 | 0 |
| AIS v3.1 | 5 | **19** | 19.2 | 16 | 23 | 0 |
| Historical v3.0 | 1 | **5** | 5.0 | 5 | 5 | 1 |

## AI Wrapper Test

```
AIS_specificity (6 files) > CONTROL_B_specificity (3-4 files) → marginal
AIS_total_score (19) == CONTROL_B_total_score (19) → EQUAL
AI_WRAPPER_SIGNAL: INCONCLUSIVE — LEANING PRESENT
CONTEXT_ADVANTAGE: NOT DEMONSTRATED
```

## Historical Reference

AIS v3.0 at commit `13cf11c`: 250 words, 0 file references, 1 hallucination, AI Wrapper FAIL.
AIS v3.1 at commit `ab42c7a`: median 19/25, 6 file references, 0 hallucinations, AI Wrapper INCONCLUSIVE.
Improvement: +14 points (3.8x), hallucinations eliminated, file references restored.