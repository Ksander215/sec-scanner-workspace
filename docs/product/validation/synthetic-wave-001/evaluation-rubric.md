# Evaluation Rubric — Synthetic Wave 001

---
## Scoring Dimensions (0–5 each)

### S1 — Structure Understanding
| Score | Description |
|---|---|
| 0 | No understanding of system structure |
| 1 | Identifies 1–2 modules without accuracy |
| 2 | Identifies some modules; significant errors |
| 3 | Correctly identifies most major subsystems |
| 4 | Comprehensive subsystem identification with roles |
| 5 | Complete structural map including internal organization |

### S2 — Relationship Understanding
| Score | Description |
|---|---|
| 0 | No dependency/interaction understanding |
| 1 | Mentions 1–2 relationships; mostly wrong |
| 2 | Some correct dependencies; significant gaps |
| 3 | Key dependencies correct; some missed |
| 4 | Most important dependencies identified and directed |
| 5 | Comprehensive dependency map |

### S3 — Boundary Understanding
| Score | Description |
|---|---|
| 0 | No boundary concept |
| 1 | Recognizes directories differ but can't explain |
| 2 | Some boundaries correct; others confused |
| 3 | Most major boundaries correct |
| 4 | Clear boundary identification with accurate roles |
| 5 | Precise boundaries including internal structure |

### S4 — Reasoning Quality
| Score | Description |
|---|---|
| 0 | No architectural reasoning |
| 1 | Surface-level description only |
| 2 | Some reasoning; lacks depth |
| 3 | Sound reasoning with supported conclusions |
| 4 | Strong reasoning with evidence-based insights |
| 5 | Deep reasoning with causal chains and impact analysis |

### S5 — Evidence Specificity
| Score | Description |
|---|---|
| 0 | No file/code references |
| 1 | Vague references ("in the engine folder") |
| 2 | File names without code specifics |
| 3 | File names + code patterns |
| 4 | Specific code references (functions, classes, imports) |
| 5 | Precise references with line-level evidence |

---
## Claim Classification

| Category | Code | Description |
|---|---|---|
| VERIFIED | V | Confirmed by source code |
| PARTIALLY_VERIFIED | PV | Mostly correct, minor issues |
| UNVERIFIED | UV | Cannot be confirmed or denied |
| CONTRADICTED | C | Source code shows the opposite |
| HALLUCINATED | H | References non-existent files/modules/dependencies |

---
## Grounding Score

```
Grounding = (VERIFIED + 0.5 * PARTIALLY_VERIFIED) / ALL_VERIFIABLE_CLAIMS
```

---
## Context Advantage

AIS run gets Context Advantage if:
1. It contains project-specific information confirmed by repository
2. CONTROL A and/or CONTROL B did not achieve comparable specificity
3. The advantage relates to AIS context/retrieval, not just better writing

---
## AI Wrapper Test

```
If AIS_specificity ≈ CONTROL_B_specificity:
    AI_WRAPPER_SIGNAL = PRESENT
    CONTEXT_ADVANTAGE = 0
Else if AIS_specificity > CONTROL_B_specificity AND grounded:
    CONTEXT_ADVANTAGE_SIGNAL = PRESENT
```
