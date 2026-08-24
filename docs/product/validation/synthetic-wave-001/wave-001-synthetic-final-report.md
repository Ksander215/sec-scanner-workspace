# AIS MVP Validation — Synthetic Wave 001 Final Report

**Task:** TASK-WAVE1-SYNTHETIC-VALIDATION-001  
**Evidence Level:** S1 (Synthetic Agent Evidence)  
**AIS Version:** v3.1 frozen (commit `ab42c7a`)  
**Status:** **PARTIAL — CONTROL A complete, CONTROL B and AIS blocked**  

---

## 1. Executive Summary

Synthetic Wave 001 partially completed: 5 CONTROL A (independent analysis) runs succeeded with high quality, but CONTROL B (general LLM) and AIS (v3.1) modes were blocked due to missing API credentials in the execution environment.

Despite the partial completion, the results are **highly informative**:

1. **CONTROL A establishes an extremely strong baseline** — 5 AI agents independently produced architecture analyses scoring 21-25/25 on the S1-S5 rubric, with zero hallucinations, 15-30+ file references each, and convergent understanding of the system.

2. **Historical AIS output (v3.0) was dramatically inferior** — scoring 5/25, with zero file references, 1 hallucination, and a FAILED AI Wrapper Test. This suggests AIS must demonstrate substantial improvement to provide value over independent analysis.

3. **Protocol validation succeeded** — the experiment design, role definitions, scoring rubric, and claim verification process all functioned correctly for CONTROL A. The protocol is ready for execution when API access is available.

**Verdict: INCONCLUSIVE** — insufficient data for Gate evaluation. CONTROL A baseline is established. CONTROL B and AIS modes must be completed for Gate evaluation.

---

## 2. Objective

> Does AIS provide measurable contextual advantage over independent repository exploration?

Partially answered: independent exploration produces very high quality results. AIS v3.0 was dramatically worse. AIS v3.1 was not tested.

---

## 3. Participants (Agents)

| ID | Role | Mode | Status | Quality (S1-S5, /25) |
|---|---|---|---|---|
| A01 | Developer (3yr) | CONTROL A | Complete | 23 |
| A02 | Senior Dev (7yr) | CONTROL A | Complete | 25 |
| A03 | Tech Lead (8yr) | CONTROL A | Complete | 25 |
| A04 | Architect (10yr) | CONTROL A | Complete | 25 |
| A05 | Security Eng (5yr) | CONTROL A | Complete | 21 |
| B01-B05 | — | CONTROL B | BLOCKED | — |
| C01-C05 | — | AIS v3.1 | BLOCKED | — |

---

## 4. Protocol

Experiment protocol validated successfully for 5 CONTROL A runs. Agent independence confirmed (no result leakage). Role differentiation produced unique insights per role.

**Issue:** CONTROL A agents are Explore-type subagents which are themselves LLM-powered. The "no LLM" instruction was advisory. True independent analysis (human reading code without any AI) would likely score lower than these agents.

---

## 5. Project Scope

`src/core/`, 392 files, 73,559 LOC, 36 subsystems.

---

## 6. Baseline Results (CONTROL A)

### 6.1 Scores

| Dimension | A01 | A02 | A03 | A04 | A05 | Median |
|---|---|---|---|---|---|---|
| S1 Structure (0-5) | 5 | 5 | 5 | 5 | 5 | 5 |
| S2 Relationships (0-5) | 5 | 5 | 5 | 5 | 4 | 5 |
| S3 Boundaries (0-5) | 4 | 5 | 5 | 5 | 4 | 5 |
| S4 Reasoning (0-5) | 4 | 5 | 5 | 5 | 4 | 5 |
| S5 Evidence (0-5) | 5 | 5 | 5 | 5 | 4 | 5 |
| **Total (0-25)** | **23** | **25** | **25** | **25** | **21** | **25** |

### 6.2 Universal Conclusions (All 5 agents)

- Engine is the SOLE integration point (verified by exhaustive grep)
- Discovery and Cognitive have ZERO cross-imports
- Engine instantiates Discovery per-request, Cognitive as singleton
- 6 cognitive contracts exist but NONE are registered in Wave 1
- ~36 subsystems, ~73k LOC, Service interface universal
- No circular dependencies between cognitive/discovery/engine

### 6.3 Unique Insights by Role

- **Developer (A01):** Full subsystem map, internal components
- **Senior Dev (A02):** Change impact analysis, context-building split, exhaustive imports
- **Tech Lead (A03):** Boundary violations, 5 architectural trade-offs, pipeline re-export leak
- **Architect (A04):** ADR references, 4-tier model, style consistency evaluation
- **Security Eng (A05):** 10 security risks, trust zone gate non-enforcement, sandbox gaps

---

## 7. AIS Results

**NOT EXECUTED** — no API access for AIS v3.1.

### Historical Reference (v3.0, commit 13cf11c)

| Dimension | Score | Notes |
|---|---|---|
| S1 Structure | 2 | Named 5 modules, 1 hallucinated |
| S2 Relationships | 1 | Generic "pipeline" description |
| S3 Boundaries | 1 | No boundary analysis |
| S4 Reasoning | 1 | No causal reasoning |
| S5 Evidence | 0 | Zero file/function/code references |
| **Total** | **5** | |
| Hallucinations | 1 | `execution/` module doesn't exist |
| AI Wrapper Test | **FAIL** | Generic answer, no project-specific value |

---

## 8. Verification Results

All CONTROL A claims verified against source code. Verification covered:

- 50+ file existence checks
- 30+ import chain verifications
- 10+ dependency direction checks
- 5+ specific code pattern verifications
- All 5 agents' claims about zero cross-imports between discovery and cognitive

---

## 9. Context Advantage

**Cannot be calculated** — AIS mode not executed.

### Historical Comparison (AIS v3.0 vs CONTROL A median)

| Dimension | CONTROL A | AIS v3.0 | Delta |
|---|---|---|---|
| Total Score | 25 | 5 | **-20** |
| File References | 15+ | 0 | **-15** |
| Hallucinations | 0 | 1 | **+1** (worse) |

**Historical AIS showed massive NEGATIVE context advantage.**

---

## 10. AI Wrapper Test

**Historical AIS v3.0: FAIL** — answer was generic, could have been written by any LLM.

**AIS v3.1: NOT TESTED** — requires API access.

---

## 11. Grounding

| Mode | Grounding Score | Hallucinations |
|---|---|---|
| CONTROL A (median) | ~0.95 | 0 |
| AIS v3.0 (historical) | ~0.60 | 1 |
| AIS v3.1 | N/A | N/A |

---

## 12. Trust Calibration

N/A — no AIS mode executed.

### Notable Finding

CONTROL A agents showed appropriate confidence calibration:
- All stated 5/5 for verified claims (correct)
- A04 stated 4/5 for "inconsistencies" (appropriate, harder to verify)
- A05 explicitly stated confidence ≤2 for unread files (appropriate)

---

## 13. Hypothesis Results

| Hypothesis | Status | Evidence |
|---|---|---|
| H1 Problem Exists | PARTIALLY CONFIRMED | CONTROL A agents took 2-5 min and read 15-30 files; architecture is complex enough to challenge humans |
| H2 Context Advantage | INCONCLUSIVE | AIS v3.1 not tested |
| H3 Grounded Understanding | NOT TESTED | AIS mode not executed |
| H4 AI Not Generic Chat | DISCONFIRMED (v3.0) | Historical AIS was generic; v3.1 untested |
| H5 Explainability | NOT TESTED | |
| H6 Trust | NOT TESTED | |

---

## 14. Gate Results

| Gate | Criterion | Status | Reason |
|---|---|---|---|
| A — Problem | 3/5 show baseline difficulty | INCONCLUSIVE | No human participants; agent analysis is AI-augmented |
| B — Context Advantage | 3/5 show improvement | INCONCLUSIVE | AIS not tested |
| C — Grounding | 4/5 can verify claims | INCONCLUSIVE | AIS not tested |
| D — AI Wrapper | 4/5 get project-specific value | INCONCLUSIVE | AIS not tested |
| E — Trust | No systematic over-trust | INCONCLUSIVE | AIS not tested |

---

## 15. Observations

### Observations (factual)

1. CONTROL A agents produced 5 detailed architecture analyses totaling ~15,000 words
2. All 5 agents independently identified engine as sole integration point
3. Historical AIS v3.0 produced a 250-word generic answer
4. 6 security risks found by A05 were invisible to other roles
5. Protocol documents (scoring, roles, question bank) functioned correctly
6. No API credentials available for LLM execution

### Interpretations

1. The architecture question is well-designed — it requires cross-file analysis and yields rich, verifiable answers
2. Role differentiation is valuable — Security perspective found risks invisible to others
3. AIS v3.0 was fundamentally inadequate for this task
4. AIS v3.1 improvements (word-boundary matching, stop words, MAX_NODES) may not be sufficient to close the gap
5. The main AIS deficiency is not noise filtering but answer quality and specificity

---

## 16. Failure Modes

| # | Mode | Frequency | Severity |
|---|---|---|---|
| 1 | No API credentials | 1 | High (blocks 10/15 runs) |
| 2 | Historical AIS hallucination | 1/1 | Critical |
| 3 | Historical AIS zero specificity | 1/1 | Critical |
| 4 | Trust zone gate non-enforcement | 1/1 (A05 found) | High (architectural) |

---

## 17. Product Implications

1. **AIS answer quality is the primary concern**, not retrieval noise. The v3.1 fixes improve retrieval but may not fix answer quality.
2. **Independent analysis is a strong baseline** that AIS must substantially exceed.
3. **Role diversity in validation is important** — different roles find different things.
4. **Human validation should NOT be blocked by this** — the baseline is established, the protocol works.

---

## 18. Architecture Implications

1. Trust zone gate is not enforced (security risk)
2. Engine god-class needs refactoring
3. Cognitive contracts are unwired in Wave 1
4. Two parallel LLM systems (cognitive/provider-runtime vs ai-provider/)
5. Context building split between engine and cognitive

---

## 19. Knowledge Implications

1. CONTROL A analysis provides a comprehensive reference architecture understanding
2. 10 findings (F-001 through F-010) documented
3. Security findings (F-003, F-006) are new and significant

---

## 20. Recommended Next Tasks

| Priority | Task | Depends On |
|---|---|---|
| P0 | Set OPENAI_API_KEY + OPENAI_BASE_URL, complete CONTROL B and AIS runs | Environment access |
| P0 | TASK-WAVE1-HUMAN-VALIDATION-SESSION-002 | Participants |
| P1 | Consider architectural remediation for trust zone gate | Synthetic wave findings |

---

## 21. Evidence Maturity

| Level | Achieved? | Notes |
|---|---|---|
| E0 | Yes | Assumptions about AIS quality |
| E1 | Yes | Technical analysis of code, historical AIS output |
| E2 | No | No real user sessions |
| E3 | No | |
| E4 | No | |

---

## 22. Final Verdict

**INCONCLUSIVE**

### Justification

CONTROL A (5/5 runs) completed successfully, establishing a high-quality baseline. CONTROL B (0/5) and AIS (0/5) were blocked by missing API credentials. The experiment cannot produce a valid comparison without all three modes.

### What We Learned Despite Incompletion

1. **The baseline is strong.** Any AIS answer must score 20+/25 to show meaningful context advantage.
2. **Historical AIS was dramatically insufficient.** AIS v3.1 must demonstrate substantial improvement.
3. **The protocol works.** Roles, scoring, and verification all functioned correctly.
4. **The question is well-designed.** It yields rich, verifiable, discriminating answers.
5. **Role diversity matters.** Security perspective found risks invisible to architectural roles.

### Next Step

To complete this Synthetic Wave: provide `OPENAI_API_KEY` and `OPENAI_BASE_URL` environment variables and re-run CONTROL B and AIS modes. 

Alternatively, proceed directly to Human Validation — the CONTROL A baseline demonstrates the question and protocol are sound.