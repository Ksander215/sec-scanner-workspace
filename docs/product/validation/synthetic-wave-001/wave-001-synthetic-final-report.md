# Synthetic Wave 001 — Final Report

**Task ID:** TASK-WAVE1-SYNTHETIC-VALIDATION-001
**Evidence Level:** S1 (Synthetic Agent Evidence)
**AIS Version:** v3.1 frozen (commit `ab42c7a`)
**Status:** COMPLETE
**Date:** 2026-08-25

---

## Executive Summary

Synthetic Wave 001 executed 15 controlled runs (5 roles x 3 modes) to assess whether AIS v3.1 provides measurable context advantage over independent code exploration and general LLM assistance.

**Result: CONTEXT ADVANTAGE NOT DEMONSTRATED at S1 level.**

| Mode | Median Score (0-25) | Hallucinations |
|---|---|---|
| CONTROL A (independent) | **25** | 0 |
| CONTROL B (code + general LLM) | **19** | 0 |
| AIS v3.1 | **19** | 0 |
| Historical AIS v3.0 | 5 | 1 |

AIS v3.1 matches CONTROL B but does not exceed it. Neither approaches CONTROL A quality. The AI Wrapper signal is inconclusive but leaning present.

---

## 1. Experiment Design

### 1.1 Research Question

Does AIS v3.1 provide measurable context advantage over: (a) independent code exploration, (b) code exploration with general LLM assistance?

### 1.2 Hypotheses Tested

| ID | Hypothesis | S1 Result |
|---|---|---|
| H1 | Problem exists: understanding architecture is hard | CONFIRMED — all modes find it valuable |
| H2 | Context Advantage: AIS provides project-specific info | **NOT DEMONSTRATED** — AIS == CONTROL B |
| H3 | Grounding: AIS claims are verifiable | CONFIRMED — 0 hallucinations |
| H4 | AI Wrapper: AIS != generic LLM | **INCONCLUSIVE** — marginal specificity difference, equal scores |

### 1.3 Methodology

- 5 roles: Developer, Senior Developer, Tech Lead, Architect, Security Engineer
- 3 modes: CONTROL A (independent), CONTROL B (code + general LLM), AIS v3.1
- 1 question (Q1): architectural boundaries of cognitive/discovery/engine
- Matched-pair design: same question, same scope, same evaluation rubric
- 5 scoring dimensions (S1-S5), 0-5 each, total 0-25

### 1.4 Limitations

1. S1 evidence level — synthetic agents, not real users
2. CONTROL B uses the same LLM (GLM-4-Plus) as AIS — in production, CONTROL B would use ChatGPT/Claude
3. AIS simulation uses manually constructed context based on algorithm analysis, not actual AIS execution
4. The agent running CONTROL A and selecting CONTROL B code is itself LLM-powered (me)

---

## 2. Results

### 2.1 Score Distribution

```
CONTROL A: 23, 25, 25, 25, 21  (median 25, mean 23.8)
CONTROL B: 17, 19, 20, 21, 16  (median 19, mean 18.6)
AIS v3.1: 23, 19, 20, 18, 16  (median 19, mean 19.2)
```

### 2.2 Key Comparisons

#### CONTROL A vs CONTROL B (6-point gap)
CONTROL A outperforms CONTROL B by a median of 6 points. The gap comes from:
- **Evidence specificity (S5)**: CONTROL A agents read 15-30 files in full; CONTROL B agents share 3-5 selected snippets
- **Relationship understanding (S2)**: CONTROL A traces exhaustive import chains; CONTROL B relies on agent-prepared dependency lists
- **Boundary understanding (S3)**: CONTROL A verifies boundaries via grep; CONTROL B infers from shared summaries

#### CONTROL B vs AIS v3.1 (0-point gap)
No statistically significant difference. Detailed breakdown:
- AIS has +2 more file references (6 vs 3-4) due to structured graph section
- CONTROL B has +0.5 higher reasoning depth — the agent's curated context includes interpretive analysis
- Both have 0 hallucinations
- Both miss the same critical findings (trust zone gate, boundary violations, context-building split)

#### AIS v3.1 vs AIS v3.0 (14-point improvement)
- v3.0: 5/25, 1 hallucination, 0 file references
- v3.1: 19/25, 0 hallucinations, 6 file references
- Improvement sources: word-boundary matching (segmentSubsequenceScore), citation directive, findKeyFiles generalization, MAX_NODES 8→6

### 2.3 AI Wrapper Test

```
AIS_file_refs = 6, CONTROL_B_file_refs = 3-4
AIS_total = 19, CONTROL_B_total = 19

If AIS_specificity ≈ CONTROL_B_specificity → AI_WRAPPER_SIGNAL = PRESENT

Verdict: INCONCLUSIVE — LEANING WRAPPER
```

The AIS provides slightly more specific references (structured graph section), but the total quality is equal. The marginal specificity advantage comes from presentation format, not retrieval quality.

### 2.4 Grounding Scores

```
CONTROL A Grounding: (VERIFIED: 95, PARTIAL: 5) / 100 = 0.975
CONTROL B Grounding: (VERIFIED: 42, PARTIAL: 8) / 50 = 0.92
AIS v3.1 Grounding: (VERIFIED: 38, PARTIAL: 4) / 42 = 0.952
Historical v3.0 Grounding: (VERIFIED: 2, PARTIAL: 1) / 4 = 0.625
```

All current modes achieve high grounding (>0.90). The improvement from v3.0 (0.625) to v3.1 (0.952) is primarily from the citation directive.

---

## 3. Gate Assessments

### Gate 1 — Problem Exists: **PASS**
All agents across all modes found the architecture question non-trivial and produced detailed analysis. CONFIRMED at S1.

### Gate 2 — Context Advantage: **FAIL (INCONCLUSIVE)**
AIS v3.1 (median 19) == CONTROL B (median 19). No measurable advantage. Subject to E2 human validation.

### Gate 3 — Grounding: **PASS**
0 hallucinations across all 15 runs. All claims verifiable. Citation directive effective.

### Gate 4 — AI Wrapper: **INCONCLUSIVE**
AIS specificity marginally higher than CONTROL B, but total scores equal. Cannot distinguish AIS from general LLM + curated context at S1 level.

### Gate 5 — Trust/Commercial: **NO CHANGE**
Commercial Score remains 3.0/5.0. S1 evidence cannot support commercial claims.

---

## 4. Complete Findings (F-001 to F-016)

See `findings.md` for full details. Summary:

| ID | Category | Severity | Key Insight |
|---|---|---|---|
| F-001 | context | Info | CONTROL A sets quality ceiling (median 25) |
| F-002 | wrapper | Critical | AIS v3.0 scored 5/25 |
| F-003 | trust | High | Trust zone gate returns true unconditionally |
| F-004 | context | Medium | 6 cognitive contracts defined but unwired |
| F-005 | quality | Medium | 400 lines of retrieval logic in engine (SRP violation) |
| F-006 | trust | Medium | Event bus has no access control |
| F-007 | method | Info | Role differentiation provides unique value |
| F-008 | context | Info | Discovery/Cognitive isolation verified across all 3 modes |
| F-009 | quality | Low | Two parallel LLM systems (cognitive/ vs ai-provider/) |
| F-010 | wrapper | **Critical** | CONTROL B == AIS v3.1 (median 19 vs 19) |
| F-011 | context | **High** | AIS v3.1 (19) >> v3.0 (5) but << CONTROL A (25) |
| F-012 | wrapper | Medium | Citation directive produces verifiable but shallow claims |
| F-013 | method | Info | CONTROL B quality depends on agent's curation skill |
| F-014 | quality | Medium | Security analysis needs full files, not 40-line excerpts |
| F-015 | context | Medium | Retrieval selects correct nodes, budget limits depth |
| F-016 | context | **Critical** | Context Advantage NOT DEMONSTRATED at S1 |

---

## 5. Implications

### 5.1 For AIS Development

1. **Context budget is the primary constraint**: 5000 tokens (17.5k chars) covers 6 nodes with ~6 file excerpts. CONTROL A reads 15-30 full files. The budget needs to be 3-5x larger for competitive quality.

2. **Retrieval accuracy is not the bottleneck**: The keyword-matching algorithm correctly identifies the 3 most relevant modules. The problem is that even correct retrieval, when limited to 5000 tokens, cannot match full manual exploration.

3. **Citation directive works but is insufficient**: It eliminates hallucinations and produces verifiable claims, but the claims are descriptive ("X imports Y") rather than analytical ("X violates SRP because...").

4. **Security use case is weakest**: Both CONTROL B and AIS miss security risks because 40-line excerpts don't capture complete security-relevant functions.

### 5.2 For Validation Methodology

1. **S1 cannot substitute for E2**: The CONTROL B vs AIS comparison is confounded by the fact that the same LLM was used for both. Human validation with different LLM access patterns is needed.

2. **CONTROL A baseline is strong**: Skilled synthetic agents produce near-perfect analysis, creating a high bar that AIS must clear.

3. **Protocol is validated**: 15-run minimum, 5-dimension rubric, matched-pair design all functioned correctly.

### 5.3 For Commercial Assessment

- Commercial Score: **UNCHANGED at 3.0/5.0**
- S1 evidence cannot support commercial claims per validation specification
- TASK-COMMERCIAL-REASSESSMENT-002 should wait for E2 human validation results

---

## 6. Recommendations

1. **Increase CONTEXT_TOKEN_BUDGET to 15000-25000** for competitive quality with manual exploration
2. **Add question-specific retrieval strategies** — for security questions, include full functions; for boundary questions, include import analysis
3. **Proceed to E2 human validation** to confirm/refute S1 findings
4. **Consider question-type routing** — different question types need different context assembly strategies
5. **Investigate why AIS depth is lower than CONTROL B** despite having structured data — the LLM may need more explicit analysis prompts

---

## 7. Next Steps

1. Unblock human validation (TASK-WAVE1-HUMAN-VALIDATION-SESSION-002) — requires 5-8 real participants
2. Execute TASK-COMMERCIAL-REASSESSMENT-002 only after E2 evidence is available
3. If E2 confirms S1 findings, consider pivoting AIS value proposition from "better than manual" to "faster than manual with acceptable quality"

---

**STOP CODING: No code changes were made during this task.**
**Evidence Level: S1 only. No E2 claims are made.**
**Commercial Score: 3.0/5.0 (unchanged).**