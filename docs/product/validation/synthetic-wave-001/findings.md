# Findings — Synthetic Wave 001

---
## F-001 — CONTROL A agents produce high-quality architecture analysis

```yaml
finding_id: F-001
session: A01-A05
category: context-advantage
evidence_level: S1
observation: All 5 CONTROL A agents independently analyzed src/core/ with high specificity, referencing 15-30 files each, identifying exact import chains, and converging on the same architectural understanding.
interpretation: Independent code exploration by skilled agents produces a strong baseline that AIS must exceed to demonstrate value.
severity: Info
hypothesis_ref: H1 (Problem Exists)
gate_ref: Gate 1
verified_against_code: true
```

---
## F-002 — AIS v3.0 output was dramatically worse than CONTROL A

```yaml
finding_id: F-002
session: historical (13cf11c)
category: ai-wrapper
evidence_level: S1
observation: Historical AIS output scored 5/25 on the same S1-S5 rubric where CONTROL A agents scored 21-25/25. Zero file references, zero function names, 1 hallucination.
interpretation: AIS v3.0 provided no measurable value over independent analysis.
severity: Critical
hypothesis_ref: H4 (AI Is Not Generic Chat)
gate_ref: Gate 3
verified_against_code: true
```

---
## F-003 — Trust zone gate is a logger, not an enforcer

```yaml
finding_id: F-003
session: A05
category: trust-failure
evidence_level: S1
observation: All 6 gate checks in zones/trust-zone-gate.ts return true unconditionally. The _context parameter is ignored.
interpretation: Security architecture has a trust zone model designed but not enforced at runtime.
severity: High
verified_against_code: true
```

---
## F-004 — Cognitive contracts are architecturally sound but unwired

```yaml
finding_id: F-004
session: A01-A04
category: context-advantage
evidence_level: S1
observation: Cognitive defines 6 RuntimeContract interfaces but none are registered in the Wave 1 pipeline. CognitiveRuntime runs in degraded mode.
interpretation: The contract pattern is well-designed but unused.
severity: Medium
hypothesis_ref: H2 (Context Advantage)
gate_ref: Gate 2
verified_against_code: true
```

---
## F-005 — Engine contains ~400 lines of context-building logic that should be elsewhere

```yaml
finding_id: F-005
session: A02, A03
category: quality-loss
evidence_level: S1
observation: execution-engine.ts (855 lines) contains buildProjectContext(), extractRelevantSources(), findRelevantNodes(), segmentSubsequenceScore(), findKeyFiles() — all retrieval logic.
interpretation: Engine violates single-responsibility. This logic should be in cognitive/context or a dedicated retrieval service.
severity: Medium
verified_against_code: true
```

---
## F-006 — Event bus has no access control

```yaml
finding_id: F-006
session: A05
category: trust-failure
evidence_level: S1
observation: InProcessEventBus has no authentication, authorization, input validation, or rate limiting. Handler errors silently swallowed.
interpretation: The event bus is a flat trust-all pub/sub.
severity: Medium
hypothesis_ref: H6 (Trust)
gate_ref: Gate 5
verified_against_code: true
```

---
## F-007 — Role differentiation provides unique value

```yaml
finding_id: F-007
session: A01-A05, B01-B05, C01-C05
category: context-advantage
evidence_level: S1
observation: A05 (Security) found 6 security risks that A01-A04 did not identify. B04 (Architect) scored highest in B mode. Role-specific focus systematically produces different insights across all three modes.
interpretation: Professional perspective affects what aspects of the architecture are discovered.
severity: Info
verified_against_code: true
```

---
## F-008 — Discovery and Cognitive are properly isolated

```yaml
finding_id: F-008
session: A01-A05, B02, B03
category: context-advantage
evidence_level: S1
observation: All agents independently verified zero cross-imports between discovery/ and cognitive/. Communication only flows through engine. Confirmed by import analysis in CONTROL A, dependency chains in CONTROL B, and graph section in AIS.
interpretation: This is a well-executed architectural boundary verified across all 3 modes.
severity: Info
hypothesis_ref: H2
verified_against_code: true
```

---
## F-009 — Two parallel LLM systems exist

```yaml
finding_id: F-009
session: A02, A04
category: quality-loss
evidence_level: S1
observation: cognitive/provider-runtime.ts (ProviderAdapter) and ai-provider/ (ProviderSDK) are independent implementations with no bridge.
interpretation: Architectural duplication or intentional separation.
severity: Low
verified_against_code: true
```

---
## F-010 — CONTROL B ≈ AIS v3.1 (median 19 vs 19)

```yaml
finding_id: F-010
session: B01-B05, C01-C05
category: ai-wrapper
evidence_level: S1
observation: CONTROL B (agent reads code + consults general LLM) scored median 19/25. AIS v3.1 simulation scored median 19/25. The 5-role matched-pair comparison shows no statistically significant difference.
interpretation: AIS v3.1 does not provide a measurable quality advantage over a developer reading code and consulting a general LLM. The AI Wrapper signal is present — AIS specificity (6 file refs) is marginally higher than CONTROL B (3-4 file refs), but total scores are identical.
severity: Critical
hypothesis_ref: H4 (AI Is Not Generic Chat)
gate_ref: Gate 3 (Context Advantage)
verified_against_code: true
```

---
## F-011 — AIS v3.1 >> AIS v3.0 (19 vs 5) but still << CONTROL A (19 vs 25)

```yaml
finding_id: F-011
session: C01-C05, A01-A05, historical
category: context-advantage
evidence_level: S1
observation: AIS v3.1 scored median 19/25, a 3.8x improvement over v3.0 (5/25). However, CONTROL A scored median 25/25. The 6-point gap (19 vs 25) persists and is primarily caused by the 5000-token context budget and MAX_NODES=6 limitation.
interpretation: The v3.1 quality fixes (word-boundary matching, citation directive, findKeyFiles generalization) are effective at eliminating noise and hallucinations but do not address the fundamental context quantity limitation.
severity: High
hypothesis_ref: H2 (Context Advantage)
gate_ref: Gate 3
verified_against_code: true
```

---
## F-012 — AIS citation directive produces verifiable but shallow claims

```yaml
finding_id: F-012
session: C01-C05
category: ai-wrapper
evidence_level: S1
observation: The AIS v3.1 citation directive ("you MUST cite specific source files") successfully produces code-grounded responses. C01 quoted 5 code blocks. However, the claims are factual restatements of what the code shows rather than architectural analysis.
interpretation: Citation directive addresses AC-03 (concrete references) and AC-07 (verifiability) but does not by itself produce deep architectural insight. The LLM reads code and describes it rather than analyzing it.
severity: Medium
hypothesis_ref: H4
gate_ref: Gate 3
verified_against_code: true
```

---
## F-013 — CONTROL B quality depends on agent's code selection skill

```yaml
finding_id: F-013
session: B01-B05
category: context-advantage
evidence_level: S1
observation: B04 (Architect) scored 21/25 — highest in CONTROL B — because the agent shared architecture model + design rules + FSM + trust zone info (pre-analyzed, curated context). B05 (Security) scored only 16/25 despite the agent sharing security-specific findings, because the LLM added no new analysis beyond what the agent already stated.
interpretation: CONTROL B quality is a function of (a) what the agent chooses to share and (b) whether the LLM can add interpretive value. For well-understood findings, the LLM adds marginal value.
severity: Info
verified_against_code: false
```

---
## F-014 — Security analysis requires full file access, not excerpts

```yaml
finding_id: F-014
session: A05, B05, C05
category: quality-loss
evidence_level: S1
observation: A05 (CONTROL A, full access) scored 21/25 and found 6 security risks. B05 (selected snippets) scored 16/25. C05 (AIS 40-line excerpts) scored 16/25. Both B05 and C05 missed the trust zone gate unconditional-return pattern because neither saw the full validateGate() method.
interpretation: Security analysis requires reading complete functions, not 40-line excerpts. The EXCERPT_MAX_LINES=40 limitation is particularly damaging for security review.
severity: Medium
hypothesis_ref: N/A
verified_against_code: true
```

---
## F-015 — AIS context building retrieves correct nodes but misses depth

```yaml
finding_id: F-015
session: C01-C05
category: context-advantage
evidence_level: S1
observation: AIS v3.1 correctly retrieved cognitive, discovery, and engine as top-3 nodes for Q1. The 1-hop expansion added events, fsm, types. All 6 nodes are relevant. However, the 5000-token budget means each node gets ~1-2 file excerpts of 40 lines, missing critical details like the trust zone gate implementation.
interpretation: The retrieval algorithm (segmentSubsequenceScore + word-boundary matching) works correctly for node selection. The bottleneck is the context budget, not retrieval accuracy.
severity: Medium
hypothesis_ref: H2 (Context Advantage)
verified_against_code: true
```

---
## F-016 — Context Advantage not demonstrated at S1 level

```yaml
finding_id: F-016
session: All
category: context-advantage
evidence_level: S1
observation: AIS v3.1 (median 19) does not outperform CONTROL B (median 19). Neither mode approaches CONTROL A (median 25). The context that AIS automatically builds is equivalent in value to what a developer manually curates for a general LLM.
interpretation: At S1 evidence level, no measurable context advantage is demonstrated. This finding is subject to human validation (E2) for confirmation.
severity: Critical
hypothesis_ref: H2 (Context Advantage)
gate_ref: Gate 2, Gate 3
verified_against_code: false  # This is a comparative finding, not code-verifiable
```
