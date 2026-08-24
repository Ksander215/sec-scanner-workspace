# AIS MVP Validation — Wave 1 Protocol

## Directory Structure

```
docs/product/validation/
├── protocol/
│   ├── README.md                  # This file
│   ├── consent-form.md            # Informed consent
│   ├── briefing-script.md         # Observer briefing script
│   ├── scoring-rubric.md          # B1–B6 scoring dimensions
│   ├── claim-classification.md    # Claim type & evidence support taxonomy
│   ├── interview-guide.md         # Q1–Q9 qualitative interview
│   ├── session-invalid-conditions.md  # What invalidates a session
│   └── templates/
│       ├── session-record.md      # Session metadata & validity
│       ├── baseline.md            # Baseline phase recording
│       ├── ais-interaction.md     # AIS phase recording
│       ├── verification.md        # Verification phase recording
│       ├── evidence-ledger.yaml   # Structured evidence per participant
│       └── observer-notes.md      # Observer observations
├── wave-001/
│   ├── P001/  # Session record, baseline, AIS, verification, ledger, notes
│   ├── P002/
│   ├── P003/
│   ├── P004/
│   ├── P005/
│   ├── P006/
│   ├── P007/
│   └── P008/
└── reports/
    └── mvp-validation-wave-001-final.md  # Final report (filled after all sessions)
```

---

## Quick Reference: Session Flow

```
Consent → Briefing → Baseline (45 min) → AIS → Verification → Comparison → Interview → Debrief
```

## Quick Reference: Gates

| Gate | Criterion | Required |
|---|---|---|
| A — Problem | Baseline difficulty | 3/5 participants |
| B — Context Advantage | Measurable improvement | 3/5 participants |
| C — Grounding | Can verify AIS claims | 4/5 participants |
| D — AI Wrapper | Project-specific value | 4/5 participants |
| E — Trust | No systematic over-trust | 0 violations |

## Quick Reference: Scoring

| Dimension | Scale | Weight in Context Advantage |
|---|---|---|
| B1 — Correctness | 0–5 | 25% |
| B2 — Completeness | 0–5 | 20% |
| B3 — Dependency Understanding | 0–5 | 20% |
| B4 — Boundary Understanding | 0–5 | 20% |
| B5 — Evidence Quality | 0–5 | 15% |
| B6 — Confidence Calibration | 0–3 | Separate (trust analysis) |

## Quick Reference: Claim Classification

**Type:** FACT / DERIVED INSIGHT / HYPOTHESIS / RECOMMENDATION / UNCERTAINTY / CONFLICT

**Support:** SUPPORTED / PARTIALLY_SUPPORTED / UNSUPPORTED / CONTRADICTED / HALLUCINATED

---

## Task Reference

- **Current Task:** TASK-WAVE1-HUMAN-VALIDATION-SESSION-002
- **Task Spec:** 55 sections covering full protocol
- **Evidence Target:** E2 (first observed real user evidence)
- **Status:** BLOCKED (no real participants available)

## Unblocking

To unblock this task, you need:
1. **5–8 real participants** (Developer, Tech Lead, Architect, or Security Engineer)
2. **An observer** who can conduct sessions without leading participants
3. **AIS running** with the v3.1 context quality improvements
4. **90–120 minutes** per participant session
5. **No code changes** during the validation wave (§3, §39, §55)
