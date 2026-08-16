# Wave 1 — Participant Screening Questionnaire

**Task:** TASK-PRODUCT-VALIDATION-EXECUTION-001  
**Purpose:** Screening candidates for AIS MVP validation  
**Method:** Self-administered or brief interview (5-7 min)  
**Language:** Russian or English (participant's choice)

---

## Instructions for Researcher

This questionnaire is used **before** inviting a participant. Do NOT describe AIS in detail before screening. Say only: «We are researching tools for understanding software architecture. Your participation involves working with a prototype on a real task from your work.»

If the candidate asks «What is AIS?», answer: «A tool that builds an architectural model of your project and answers questions about it. We want to see if it helps with real tasks.»

**Do NOT:** explain advantages, show demos, or create positive expectations.

---

## Section A — Role & Experience

| # | Question | Response | Pass Criteria |
|---|----------|----------|--------------|
| A1 | What is your current role? | ___ | Must match target persona: Developer, Tech Lead, Architect, Security Engineer, CTO |
| A2 | How many years of experience in software development? | ___ | ≥ 2 years (exclude juniors per Execution Spec §8) |
| A3 | Team size? | ___ | Record for persona matching |
| A4 | What is your level of architectural responsibility? (none / informal / formal) | ___ | Must have some architectural responsibility |

## Section B — Project Context

| # | Question | Response | Pass Criteria |
|---|----------|----------|--------------|
| B1 | Do you have a real, ongoing project you can use for testing? | ___ | YES required (§8) |
| B2 | Project type: (monolith / microservices / monorepo / other) | ___ | Record |
| B3 | Approximate project size: (files / components / services) | ___ | Record |
| B4 | Tech stack (primary language, framework)? | ___ | Record |
| B5 | How long have you been working on this project? | ___ | ≥ 1 month preferred |

## Section C — Problem Experience

| # | Question | Response | Pass Criteria |
|---|----------|----------|--------------|
| C1 | Have you experienced a situation where you needed to understand an unfamiliar part of the system? How often? | ___ | Must have experienced (H1) |
| C2 | Have you encountered regressions or unexpected breakage due to misunderstood dependencies? | ___ | Record severity |
| C3 | How much time do you typically spend searching for architectural information (dependencies, component purpose, impact of changes)? | ___ | Record for baseline |
| C4 | What tools do you currently use for understanding architecture? | ___ | Record for AI Wrapper Test |
| C5 | Have you onboarded to an existing project in the last 3 months? | ___ | Record for Scenario H relevance |
| C6 | Do you analyze security findings in the context of your architecture? | ___ | Record for Scenario D relevance |

## Section D — Exclusion Checks

| # | Check | Response | Action if YES |
|---|-------|----------|----------------|
| D1 | Do you use AI tools (ChatGPT, Copilot, etc.) for most of your daily work? | ___ | Flag: AI enthusiasm (FP-3 risk). Not automatic exclude, but note. |
| D2 | Are you personally acquainted with anyone on the AIS team? | ___ | EXCLUDE (§8: courtesy feedback risk) |
| D3 | Are you already familiar with AIS or have you seen a demo? | ___ | EXCLUDE (FP-4: demo effect) |
| D4 | Is your project a demo/tutorial/toy project? | ___ | EXCLUDE (§8: not a real project) |
| D5 | Do you consider yourself an AI enthusiast who actively follows AI developments? | ___ | Flag: AI novelty contamination. Not automatic exclude. |

---

## Screening Decision

| Criterion | Met? |
|-----------|-------|
| Role matches target persona | ☐ Yes ☐ No |
| Experience ≥ 2 years | ☐ Yes ☐ No |
| Has real ongoing project | ☐ Yes ☐ No |
| Has architectural responsibility | ☐ Yes ☐ No |
| Has experienced understanding problem | ☐ Yes ☐ No |
| No exclusion criteria triggered | ☐ Yes ☐ No |

**Decision:** ☐ ACCEPT ☐ REJECT  
**Persona Assignment:** ___  
**Assigned Scenarios:** ___  
**Notes:** ___

---

## Data for Session Preparation

If ACCEPTED, record:

```
Participant ID: P-NNN
Persona: [assigned]
Project description: [brief, anonymized]
Project type: [monolith/microservices/etc.]
Project size: [approximate]
Tech stack: [primary]
Team size: [number]
Architectural responsibility level: [none/informal/formal]
Problem areas mentioned: [from C1-C6]
Current tools for architecture understanding: [from C4]
AI usage level: [none/light/moderate/heavy]
Screening date: [date]
```
