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
observation: Historical AIS output scored 5/25 on the same S1-S5 rubric where CONTROL A agents scored 21-25/25. Zero file references, zero function names, 1 hallucination ("execution/" module).
interpretation: AIS v3.0 provided no measurable value over independent analysis. AI Wrapper signal strongly present.
severity: Critical
hypothesis_ref: H4 (AI Is Not Generic Chat)
gate_ref: Gate 3 (Context Advantage)
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
hypothesis_ref: N/A
verified_against_code: true
```

---
## F-004 — Cognitive contracts are architecturally sound but unwired

```yaml
finding_id: F-004
session: A01-A04
category: context-advantage
evidence_level: S1
observation: Cognitive defines 6 RuntimeContract interfaces (Memory, Knowledge, Identity, Workflow, Tool, Capability) for dependency inversion. None are registered in the Wave 1 pipeline. CognitiveRuntime runs in degraded mode.
interpretation: The contract pattern is well-designed but the Wave 1 pipeline doesn't use it. This means context building, memory bridge, and knowledge retrieval are all no-ops during Wave 1.
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
observation: execution-engine.ts (855 lines) contains buildProjectContext(), extractRelevantSources(), findRelevantNodes(), segmentSubsequenceScore(), buildGraphSection(), buildSourceExcerptsSection(), findKeyFiles() — all retrieval logic.
interpretation: Engine violates single-responsibility. This logic should be in cognitive/context or a dedicated retrieval service.
severity: Medium
hypothesis_ref: N/A
verified_against_code: true
```

---
## F-006 — Event bus has no access control

```yaml
finding_id: F-006
session: A05
category: trust-failure
evidence_level: S1
observation: InProcessEventBus has no authentication, authorization, input validation, or rate limiting. Any component can publish any event type with any payload. Handler errors silently swallowed.
interpretation: The event bus is a flat trust-all pub/sub. Cross-subsystem events cannot be trusted without verification.
severity: Medium
hypothesis_ref: H6 (Trust)
gate_ref: Gate 5
verified_against_code: true
```

---
## F-007 — Role differentiation provides unique value

```yaml
finding_id: F-007
session: A01-A05
category: context-advantage
evidence_level: S1
observation: A05 (Security) found 6 security risks (R1-R10) that A01-A04 did not identify. A04 (Architect) found ADR references and design rules. A02 (Senior Dev) found the context-building split.
interpretation: Different professional perspectives systematically discover different aspects of the architecture. This suggests human validation should include diverse roles.
severity: Info
hypothesis_ref: N/A
verified_against_code: true
```

---
## F-008 — Discovery and Cognitive are properly isolated

```yaml
finding_id: F-008
session: A01-A05
category: context-advantage
evidence_level: S1
observation: All 5 agents independently verified (via grep) that discovery/ and cognitive/ have zero cross-imports. Communication only flows through engine.
interpretation: This is a well-executed architectural boundary. The isolation is real and verifiable.
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
observation: cognitive/provider-runtime.ts (ProviderAdapter interface) and ai-provider/ (ProviderSDK interface) are independent implementations with no bridge. ai-provider/ is unused within core.
interpretation: Architectural duplication or intentional separation. ai-provider/ appears to be a more complete system that was never integrated.
severity: Low
hypothesis_ref: N/A
verified_against_code: true
```

---
## F-010 — CONTROL B and AIS modes blocked by environment

```yaml
finding_id: F-010
session: N/A
category: quality-loss
evidence_level: S1
observation: No OPENAI_API_KEY or OPENAI_BASE_URL set in execution environment. CONTROL B (general LLM) and AIS modes cannot execute.
interpretation: The 15-run experiment design cannot be completed without API access. Partial results from 5 CONTROL A runs are still valuable for protocol validation and baseline establishment.
severity: High
hypothesis_ref: N/A
verified_against_code: false
```