# Recruitment Summary — Wave 1

---
## Status

| Metric | Target | Current |
|---|---|---|
| Participants needed | 5 minimum, 8 optimal | __ |
| Invitations sent | __ | __ |
| Responses received | __ | __ |
| Screening completed | __ | __ |
| Accepted | __ | __ |
| Rejected | __ | __ |
| Familiar class | __ | __ |
| Sessions scheduled | __ | __ |
| Sessions completed | __ | __ |
| Valid sessions | __ | __ |
| BLOCKED reason | — | **No real participant access** |

---
## Recruitment Status

**Current Status:** BLOCKED

**Reason:** AI assistant cannot recruit, contact, or interact with real human participants. Recruitment requires a human operator to:

1. Send invitations to real candidates
2. Conduct screening conversations
3. Schedule sessions
4. Obtain informed consent
5. Observe participant behavior in real-time
6. Conduct qualitative interviews

---
## Ready Materials

| Material | Status | Path |
|---|---|---|
| Frozen version record | READY | `WAVE1-FROZEN-VERSION.md` |
| Question bank | READY | `question-bank.md` |
| Participant invitation | READY | `recruitment/participant-invitation.md` |
| Screening flow | READY | `recruitment/participant-screening.md` |
| Participant information | READY | `recruitment/participant-information.md` |
| Consent form | READY | `recruitment/consent-form.md` |
| Scheduling | READY | `recruitment/participant-scheduling.md` |
| Communication log | READY | `recruitment/participant-communication-log.md` |
| Participant roster | READY | `participant-roster.md` |
| Screening results | READY | `screening-results.md` |
| Protocol (7 docs) | READY | `protocol/` |
| Session templates (6 per P) | READY | `P001/` – `P008/` |
| Evidence summary | READY | `wave-001-evidence-summary.md` |
| Gate results | READY | `wave-001-gate-results.md` |
| Findings log | READY | `wave-001-findings.md` |
| Final report template | READY | `reports/mvp-validation-wave-001-final.md` |

---
## What a Human Operator Must Do

### Step 1: Recruit
1. Open `recruitment/participant-invitation.md`
2. Send invitations to 10–15 candidates (expect 30–50% response rate)
3. Log all communication in `recruitment/participant-communication-log.md`

### Step 2: Screen
1. For each respondent, run questions from `recruitment/participant-screening.md`
2. Record results in `screening-results.md`
3. Assign participant IDs (P001, P002, ...)
4. Update `participant-roster.md`

### Step 3: Schedule
1. Use `recruitment/participant-scheduling.md`
2. Confirm session times
3. Send `recruitment/participant-information.md` to each participant

### Step 4: Conduct
1. For each session, follow `protocol/README.md` flow
2. Use `protocol/briefing-script.md` at session start
3. Use `protocol/consent-form.md` for consent
4. Use `protocol/scoring-rubric.md` for scoring
5. Use `protocol/claim-classification.md` for verification
6. Use `protocol/interview-guide.md` for post-session interview
7. Fill in participant's `session-record.md`, `baseline.md`, `ais-interaction.md`, `verification.md`, `evidence-ledger.yaml`, `observer-notes.md`

### Step 5: Aggregate
1. Update `wave-001-evidence-summary.md` after each session
2. Log findings in `wave-001-findings.md`
3. After 5+ valid sessions, evaluate `wave-001-gate-results.md`
4. Write final report using `reports/mvp-validation-wave-001-final.md`

---
## Constraints

- **STOP CODING** is in effect for the duration of Wave 1 (§4)
- AIS version is frozen at `ab42c7a` (v3.1)
- Validation question is frozen (Q1 from question-bank.md)
- No acceptance criteria changes after first session
- No mid-wave AIS optimization
