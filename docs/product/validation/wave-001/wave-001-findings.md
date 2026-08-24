# Wave 1 — Findings

> Updated after each completed session. Findings are observations, not conclusions.
> Conclusions go in the Final Report.

---
## Finding Format

Each finding is recorded as:

```yaml
finding_id: "F-001"
session: "P00X"
category: "_______________"  # See categories below
evidence_level: "E2"  # E0/E1/E2
observation: "_______________"  # What happened (factual)
interpretation: "_______________"  # What it might mean (analytical)
severity: "_______________"  # Critical / High / Medium / Low / Info
hypothesis_ref: "H__"  # Which hypothesis this relates to
gate_ref: "Gate __"  # Which gate this affects
verified_against_code: true  # true / false / n/a
```

---
## Categories

| Category | Description |
|---|---|
| context-advantage | AIS provided information the participant didn't find independently |
| hallucination | AIS made a claim not supported by the codebase |
| trust-failure | Participant accepted an unsupported or wrong claim |
| trust-success | Participant correctly questioned or rejected a claim |
| grounding | Participant successfully verified an AIS claim |
| ai-wrapper | AIS answer was generic (could come from any AI) |
| time-advantage | AIS-assisted understanding was faster without quality loss |
| time-neutral | Same quality, same time |
| quality-loss | AIS-assisted understanding was worse than baseline |
| verification-behavior | How the participant approached claim verification |
| ux-issue | Participant struggled with the tool interface |
| protocol-issue | Deviation from protocol during session |

---
## Findings Log

### F-001

```yaml
finding_id: "F-001"
session: "_______________"
category: "_______________"
evidence_level: "_______________"
observation: |
  
interpretation: |
  
severity: "_______________"
hypothesis_ref: "_______________"
gate_ref: "_______________"
verified_against_code: __
```

---
### F-002

```yaml
finding_id: "F-002"
session: "_______________"
category: "_______________"
evidence_level: "_______________"
observation: |
  
interpretation: |
  
severity: "_______________"
hypothesis_ref: "_______________"
gate_ref: "_______________"
verified_against_code: __
```

---
*[Continue as findings accumulate]*

---
## Failure Mode Summary

| Failure Mode | Frequency | First Seen | Affected Sessions | Severity |
|---|---|---|---|---|
| __ | __ | __ | __ | __ |

---
## Contradictions

| Finding A | Finding B | Nature of Contradiction | Resolution |
|---|---|---|---|
| __ | __ | __ | __ |