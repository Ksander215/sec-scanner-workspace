# Run Matrix — Synthetic Wave 001

## Frozen Configuration

| Field | Value |
|---|---|
| AIS Commit | `ab42c7a` (v3.1) |
| Scope | `src/core/` (392 files, 73,559 LOC) |
| Question | Q1 (cognitive/discovery/engine boundaries) |
| Question Bank | wave-001/question-bank.md v1.0 |
| Agent Prompts | agent-role-definitions.md v1.0 |

## Run Status

| Run | Role | Mode | Status | Notes |
|---|---|---|---|---|
| A01 | Developer (3yr) | CONTROL A (independent) | **COMPLETE** | High quality, 15 files examined |
| A02 | Senior Dev (7yr) | CONTROL A (independent) | **COMPLETE** | Excellent, exhaustive import analysis |
| A03 | Tech Lead (8yr) | CONTROL A (independent) | **COMPLETE** | Strong boundary/trade-off analysis |
| A04 | Architect (10yr) | CONTROL A (independent) | **COMPLETE** | Deep pattern analysis, ADR references |
| A05 | Security Eng (5yr) | CONTROL A (independent) | **COMPLETE** | Security-focused, found critical issues |
| B01 | Developer | CONTROL B (general LLM) | **BLOCKED** | No LLM API key in environment |
| B02 | Senior Dev | CONTROL B (general LLM) | **BLOCKED** | No LLM API key in environment |
| B03 | Tech Lead | CONTROL B (general LLM) | **BLOCKED** | No LLM API key in environment |
| B04 | Architect | CONTROL B (general LLM) | **BLOCKED** | No LLM API key in environment |
| B05 | Security Eng | CONTROL B (general LLM) | **BLOCKED** | No LLM API key in environment |
| C01 | Developer | AIS v3.1 | **BLOCKED** | No LLM API key; AIS requires OPENAI_API_KEY + OPENAI_BASE_URL |
| C02 | Senior Dev | AIS v3.1 | **BLOCKED** | Same |
| C03 | Tech Lead | AIS v3.1 | **BLOCKED** | Same |
| C04 | Architect | AIS v3.1 | **BLOCKED** | Same |
| C05 | Security Eng | AIS v3.1 | **BLOCKED** | Same |

## Blocking Issue

CONTROL B and AIS modes require `OPENAI_API_KEY` and `OPENAI_BASE_URL` environment variables. These are not set in the current execution environment.

**Resolution:** Set environment variables and re-run. The 5 CONTROL A runs are complete and valid.

## Historical AIS Reference

A previous AIS run at commit `13cf11c` (pre-v3.1 quality fixes) produced a 250-word generic answer that:
- Hallucinated an `execution/` module (doesn't exist)
- Provided zero specific file paths, function names, or import chains
- Failed the AI Wrapper Test
- Was rated PASS WITH CONDITIONS for pipeline completion but FAIL for answer quality

The current AIS v3.1 (`ab42c7a`) includes fixes for context quality (segmentSubsequenceScore, extended stop words, MAX_NODES=6, citation directive) but has not been executed in this environment.
