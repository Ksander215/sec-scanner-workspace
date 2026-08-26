# MVP Free Usage Evidence Report 001

**Task**: TASK-MVP-FREE-RELEASE-001
**Date**: 2026-08-26

---

## STATUS: AWAITING HUMAN USAGE

This report will be populated after real users interact with the AIS MVP.

### What We Want to Learn (§25)

| Question | Metric | Current Status |
|---|---|---|
| Do people face tasks where AIS is useful? | Task relevance rate | No data |
| Does AIS help understand architecture? | Feedback correctness rate | No data |
| Does context give AIS an advantage? | Context advantage signal | No data |
| Can users verify and trust the answer? | Evidence check rate, trust score | No data |
| What errors repeat? | Finding category distribution | No data |
| Do users return? | Repeat usage rate | No data |

### Metrics to Collect (§39)

#### Session-level

- Total sessions
- Completed sessions (reached TraceAvailable)
- Failed sessions
- Questions asked
- Average response time
- Feedback submissions
- Claims per session
- Evidence items per session
- Quality findings per session

#### Behavioral

- Repeat usage (sessions per user)
- Evidence inspection rate (users who view sources)
- Correction frequency (incorrect + incomplete rate)
- Acceptance / partial / rejection distribution

### Synthetic Baseline (for comparison)

From TASK-WAVE1-SYNTHETIC-VALIDATION-001 (CONTROL A):

- 5 synthetic users, all scored 21-25/25
- 0 hallucinations in synthetic evaluation
- 10 findings documented (F-001 through F-010)

**Important**: Synthetic results are NOT evidence of product-market fit (§28). They serve as a technical quality baseline only.

### Next Steps

1. Deploy MVP to controlled user group
2. Collect real session data
3. Populate this report with actual metrics
4. Compare human evidence against synthetic baseline
5. Feed findings into product improvement loop (§33)
