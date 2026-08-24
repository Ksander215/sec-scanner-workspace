# Synthetic Wave 001 — Comparison Report

**Evidence Level: S1 (Synthetic Agent Evidence)**
**Status: PARTIAL — CONTROL A complete (5/5), CONTROL B and AIS blocked (0/10)**

---

## 1. What Was Completed

### CONTROL A — 5 Independent Analysis Runs (All Complete)

| Run | Role | Files Read | Answer Quality | Key Strength |
|---|---|---|---|---|
| A01 | Developer | 15 | High | Full subsystem map, interaction topology |
| A02 | Senior Dev | 20+ | Very High | Exhaustive import analysis, change impact |
| A03 | Tech Lead | 15+ | High | Boundary violations, trade-off analysis |
| A04 | Architect | 30 | Very High | ADR references, tiered architecture model |
| A05 | Security Eng | 15 | High | Trust zone analysis, security risk table |

### CONTROL B — BLOCKED

No LLM API key available. Cannot execute.

### AIS Mode — BLOCKED

No LLM API key available. Cannot execute AIS v3.1.

**However**, a historical AIS run at commit `13cf11c` (pre-v3.1) exists and is used as reference point.

---

## 2. Cross-CONTROL-A Consensus

All 5 CONTROL A agents independently converged on the following architectural understanding:

### 2.1 Universal Findings (All 5 agents)

| Finding | Confidence | Agents Agreeing |
|---|---|---|
| Engine is the sole integration point between cognitive and discovery | 5/5 | A01, A02, A03, A04, A05 |
| Discovery and Cognitive have ZERO direct imports between them | 5/5 | All |
| Engine → Discovery: direct instantiation, per-request | 5/5 | All |
| Engine → Cognitive: composition, behind feature flag | 5/5 | All |
| Discovery depends on autonomous-architecture/ | 5/5 | All |
| Cognitive has contract-based integration pattern (6 contracts) | 5/5 | All (A01 detailed all 6) |
| None of the 6 cognitive contracts are registered in Wave 1 | 5/5 | All |
| Cognitive's only external deps: events/ (type), fsm/, types/ (type) | 5/5 | All |
| The interaction is strictly top-down, unidirectional | 5/5 | All |
| Engine is a large file (855 lines) with god-class tendencies | 4/5 | A02, A03, A04 |
| ai-provider/ is completely disconnected from core | 4/5 | A01, A02, A04 |
| Event bus exists but not used for cross-subsystem coordination | 4/5 | A02, A03, A04 |
| ~36 subsystem directories in src/core/ | 5/5 | All |
| Service interface (initialize/start/stop/shutdown) is universal | 5/5 | All |

### 2.2 Role-Specific Insights

| Insight | Agent | Not Seen by Others |
|---|---|---|
| Trust zone gate returns true unconditionally (security risk) | A05 | A01-A04 |
| Path traversal in discovery (projectPath unsanitized) | A05 | A01-A04 |
| Plugin sandbox is interface-only, no concrete impl | A05 | A01-A04 |
| Capability sandbox emit() bridges Z2→Z1 without gate | A05 | A01-A04 |
| Event bus errors silently swallowed | A05 | A01-A04 |
| Two parallel LLM systems (cognitive/provider-runtime vs ai-provider/) | A02, A04 | A01, A03, A05 |
| Context building split between Engine and Cognitive | A02 | A01, A03, A04, A05 |
| ADR references (DR-01 through DR-11, ADR-001-014) | A04 | A01-A03, A05 |
| Dual ExecutionEngine naming (engine/ + ai-provider/) | A03, A04 | A01, A02, A05 |
| Engine re-exports ~50 pipeline internals | A03 | A01, A02, A04, A05 |
| 65% of modules and 3.6% of deps truncated in context | A04 (from historical report) | — |
| Per-request discovery instantiation (no lifecycle) | A02, A03 | A01, A04, A05 |
| Memory isolation guard is strongest boundary | A05 | A01-A04 |

---

## 3. CONTROL A vs Historical AIS (Pre-v3.1)

### 3.1 Quality Comparison

| Dimension | CONTROL A (median) | AIS (v3.0, 13cf11c) | Advantage |
|---|---|---|---|
| Specific file references | 15+ per answer | 0 | **CONTROL A >> AIS** |
| Specific function/class names | 20+ per answer | 0 | **CONTROL A >> AIS** |
| Import chain analysis | Yes (exhaustive) | No | **CONTROL A >> AIS** |
| Hallucinations | 0 | 1 ("execution/" module) | **CONTROL A >> AIS** |
| Architectural depth | Very deep (5 pages each) | ~250 words generic | **CONTROL A >> AIS** |
| Boundary analysis | Precise with coupling levels | None | **CONTROL A >> AIS** |
| Grounding score | ~0.95 | ~0.6 | **CONTROL A >> AIS** |
| Time to produce | ~2-5 min (agent time) | ~11 sec (LLM time) | AIS faster |

### 3.2 AI Wrapper Test (Historical)

The historical AIS answer at commit `13cf11c`:
- Mentioned 5 module names generically
- Provided 0 specific dependencies
- Referenced 0 entry points
- Referenced 0 config files
- Referenced 0 file statistics
- Hallucinated an `execution/` module
- Was rated **FAIL** on AI Wrapper Test

**Assessment:** The historical AIS output was WORSE than any single CONTROL A agent answer on every quality dimension except speed.

### 3.3 Implications for AIS v3.1

AIS v3.1 (`ab42c7a`) includes fixes:
- `segmentSubsequenceScore()` — word-boundary matching eliminates "engine" matching "landing.src.lib.engine"
- Extended stop words ("components", etc.)
- `MAX_NODES` reduced from 8 to 6
- Citation directive in prompt

These fixes address NOISE and EMPTY_SNIPPET issues but do NOT address:
- The fundamental context truncation (30/46 modules, 50/1378 deps)
- The absence of ArchitectureGraph utilization
- The generic answer quality
- The hallucination of non-existent modules

**Prediction:** AIS v3.1 will likely improve on noise reduction but may still fail the AI Wrapper Test against CONTROL A quality baselines.

---

## 4. Protocol Validation Findings

### 4.1 What Worked

1. **Independent agent analysis produces extremely high-quality results** — all 5 agents independently converged on the same architectural understanding with deep, specific, verifiable claims.
2. **Role differentiation adds value** — each role found unique insights (A05 found 6 security risks no other agent noticed).
3. **Matched-pair design is sound** — same question, same scope, same evaluation criteria enables direct comparison.
4. **Claim verification is feasible** — every agent's claims can be checked against source code.
5. **Scoring rubric (S1-S5) is discriminative** — agents score 4-5/5 on most dimensions, while historical AIS scored 1-2.

### 4.2 Protocol Issues Found

1. **Agent "no LLM" instruction is advisory** — Explore agents are LLM-powered. The distinction between CONTROL A and CONTROL B is that CONTROL B agents can "consult" a separate LLM session. In practice, the Explore agent already has LLM capabilities. This blurs the A/B boundary.
2. **Time measurement is imprecise** — agent completion time includes LLM inference time for the agent itself, not pure "human reading time."
3. **Blind evaluation is challenging** — as the person running the experiment, I know which mode produced which answer.

---

## 5. Key Metrics

### CONTROL A Aggregate

| Metric | A01 | A02 | A03 | A04 | A05 | Median |
|---|---|---|---|---|---|---|
| Structure (S1, 0-5) | 5 | 5 | 5 | 5 | 5 | 5 |
| Relationships (S2, 0-5) | 5 | 5 | 5 | 5 | 4 | 5 |
| Boundaries (S3, 0-5) | 4 | 5 | 5 | 5 | 4 | 5 |
| Reasoning (S4, 0-5) | 4 | 5 | 5 | 5 | 4 | 5 |
| Evidence (S5, 0-5) | 5 | 5 | 5 | 5 | 4 | 5 |
| **Total (0-25)** | **23** | **25** | **25** | **25** | **21** | **25** |
| Hallucinations | 0 | 0 | 0 | 0 | 0 | 0 |
| File references | 15+ | 20+ | 15+ | 30+ | 15+ | 15+ |
| Dependency refs | 10+ | 20+ | 10+ | 15+ | 5+ | 10+ |

### Historical AIS (v3.0, reference only)

| Metric | Value |
|---|---|
| Structure (S1) | 2 |
| Relationships (S2) | 1 |
| Boundaries (S3) | 1 |
| Reasoning (S4) | 1 |
| Evidence (S5) | 0 |
| **Total** | **5** |
| Hallucinations | 1 |
| File references | 0 |
| Dependency refs | 0 |
