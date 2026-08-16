# Wave 1 — Observer Guide

**Task:** TASK-PRODUCT-VALIDATION-EXECUTION-001
**Audience:** Researcher conducting validation sessions
**Purpose:** Ensure consistent, unbiased observation across all sessions

---

## Role of the Observer

The observer is a **silent witness**, not a facilitator, not a salesperson, not a teacher.

### Core Principle

> **Your job is to record what happens, not to make things happen.**

If the participant struggles, you observe the struggle. If they succeed, you observe the success. You do NOT help them succeed — that would invalidate the evidence.

---

## Before the Session

### Mandatory Preparation

1. Read this guide completely
2. Read the session protocol template
3. Read the participant's screening data (role, project, assigned scenarios)
4. Verify AIS prototype is functional with the participant's project
5. Prepare recording equipment (if consented)
6. Prepare timer
7. Prepare paper/notebook for real-time observation

### Mindset Check

Before each session, ask yourself:

- «Am I hoping AIS performs well?» — If yes, acknowledge it. This is FP-1 (founder bias).
- «Will I be disappointed if the participant doesn't like AIS?» — If yes, you are at risk of FP-2 (confirmation bias).
- «Do I want to explain how AIS works?» — If yes, resist. Explanation = demo effect (FP-4).

---

## During the Session

### Absolute Rules

| # | Rule | Why |
|---|------|-----|
| 1 | **Never explain what AIS «should» show** | Demo effect (FP-4) |
| 2 | **Never suggest what to ask** | Leading question (FP-2) |
| 3 | **Never say «try clicking here»** | You're testing the product, not guiding usage |
| 4 | **Never comment on the quality of AIS responses** | Creates observer effect |
| 5 | **Never express disappointment or excitement** | Contaminates participant's perception |
| 6 | **Never compare AIS to other tools during the session** | Pre-loads comparison |
| 7 | **Never correct the participant's usage** | Protects against usability issues being hidden |
| 8 | **Never skip recording a negative observation** | Survivorship bias (FP-8) |

### What You CAN Do

| Action | When |
|--------|-------|
| Answer factual questions («What does this button do?») | When asked directly |
| Provide technical help if participant is stuck >5 min | Technical issue, not product issue |
| Clarify the task if participant forgot it | Neutral reminder |
| Manage time | If session exceeds planned duration |

### Observation Technique: The Seven Categories

You are watching for seven categories of behaviour (Execution Spec §18):

**1. Actions.** What they do. Every click, every query, every navigation step. Record as a sequence: action → time → result.

**2. Questions.** What they ask AIS. The exact wording reveals their mental model. Record verbatim.

**3. Confusion.** Where they get lost. Pauses >15 seconds, going back, rephrasing the same question. Confusion = UX problem signal.

**4. Verification.** Where they double-check. Opening IDE, asking a colleague, searching docs. Verification is a trust signal.

**5. Trust.** Where they trust or distrust. Accepting a recommendation, ignoring it, or asking «Why?». This is the most important category.

**6. Correction.** Where they fix AIS. Saying «no, that's wrong» or «you missed X». Correction is the most valuable quality signal.

**7. Decision.** What they decide. Did AIS change anything? This is the North Star.

### Real-Time Notation

Use the notation format:

```
[MM:SS] [P-NNN] [Scenario] [category]: [description]
```

Examples:

```
[03:22] [P-001] [A] question: «show me what depends on auth service»
[04:15] [P-001] [A] confusion: stared at response for 20s, rephrased question
[05:01] [P-001] [A] verification: opened IDE to check if dependency exists
[06:30] [P-001] [A] decision: «ok, I'll defer this refactor to next sprint»
[07:45] [P-001] [A] correction: «no, billing doesn't depend on auth directly»
```

### Evidence Tagging in Real-Time

When you see something that maps to a hypothesis, tag it:

```
[06:30] [P-001] [A] EVIDENCE: H3 E1 — user made architecture decision based on AIS analysis
```

But be conservative: if you're not sure, don't tag. Tag during post-session analysis.

---

## After the Session

### Immediate Actions (within 30 min)

1. Complete the Session Protocol Template while memory is fresh
2. Classify all observations into the seven categories
3. Assign preliminary evidence levels
4. Record all negative observations (don't let them fade)
5. Note any protocol deviations

### Evidence Classification Rules

| Observation | E-Level | Weight |
|-------------|---------|--------|
| User stated opinion («this is useful») | E0 | 0.5 |
| User behaviour in real task | E1 | 1.0 |
| Same pattern across 3+ users | E2 | — |
| AIS outperformed baseline measurably | E3 | — |
| User changed workflow / returned / WTP | E4 | — |
| One user, multiple similar observations | E1 total (not E1 × N) | 1.0 |
| Demo-adjacent observation | Downgrade 1 level | 0.5 |

### Fact vs. Interpretation Boundary

This is the most important discipline:

| Level | Example |
|--------|--------|
| **Fact** | «Participant used AIS for 8 minutes, asked 3 questions, then decided to postpone refactoring.» |
| **Observation** | «Participant returned to the dependency explanation twice.» |
| **Interpretation** | «Dependency context probably increased confidence.» |
| **Hypothesis** | «AIS may reduce time spent on architectural investigation.» |

Only Facts and Observations go into the `observation` field of the Evidence Ledger.
Interpretations go into `interpretation` and `researcher_interpretation`.

---

## Common Mistakes

### Mistake 1: «They liked it!»

**Wrong:** Participant said «this is cool» → record as positive evidence.

**Right:** Participant said «this is cool» → record as E0 Claim. Then check: did they take any action? If no → E0 stays. If they used the result for a decision → E1 Observed.

### Mistake 2: Helping Too Much

**Wrong:** Participant can't find how to ask a question → observer shows them.

**Right:** Record the confusion as a UX problem signal. If stuck >5 min, provide minimal technical help and note the usability issue.

### Mistake 3: Ignoring Negative Results

**Wrong:** Participant abandoned AIS and went back to grep → record as «technical issue».

**Right:** Participant abandoned AIS and went back to grep → this is evidence. Record exactly what happened. Why did they abandon? What was missing? This is potentially the most valuable data point of the entire session.

### Mistake 4: Equivocation

**Wrong:** «It was kind of useful, I guess» → record as «positive with reservations».

**Right:** «It was kind of useful, I guess» → this is E0. The hedging language itself is a signal. Record verbatim.

---

## Checklist Per Session

### Before
- [ ] Read participant screening data
- [ ] AIS prototype ready with participant's project
- [ ] Recording ready (if consented)
- [ ] Timer ready
- [ ] Session protocol template ready
- [ ] Mindset check complete

### During
- [ ] Baseline recorded completely
- [ ] All seven observation categories covered
- [ ] No leading questions asked
- [ ] No explanations of AIS given
- [ ] All actions logged with timestamps
- [ ] Negative observations recorded

### After
- [ ] Session protocol completed within 30 min
- [ ] All observations classified
- [ ] Evidence levels assigned conservatively
- [ ] Fact/interpretation boundary maintained
- [ ] Evidence ledger entries created
- [ ] Protocol deviations documented
