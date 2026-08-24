# Participant Screening

## Screening Flow

```text
Candidate responds
       ↓
Eligibility Questions (auto/self-report)
       ↓
Technical Experience Assessment
       ↓
Repository Experience Assessment
       ↓
Conflict of Interest Check
       ↓
Accepted / Rejected
```

---

## Screening Questions

### Block 1: Eligibility (must pass ALL)

| # | Question | Accept If | Reject If |
|---|---|---|---|
| E1 | Do you have professional experience working with software systems? | Yes | No |
| E2 | Can you read source code in at least one programming language? | Yes | No |
| E3 | Can you independently investigate an unfamiliar repository? | Yes | No |
| E4 | Are you able to formulate an architectural judgment about a codebase? | Yes / Partially | No |
| E5 | Are you available for a 90–120 minute session? | Yes | No |

### Block 2: Technical Experience

| # | Question | Record |
|---|---|---|
| T1 | What is your current role? | _______________ |
| T2 | How many years of professional software development experience do you have? | _______________ |
| T3 | Which programming languages do you work with? (list all) | _______________ |
| T4 | Do you have experience with TypeScript? (not required but preferred) | Yes / No / Basic |
| T5 | Have you previously analyzed unfamiliar codebases as part of your work? | Yes / No |
| T6 | How often do you perform architectural analysis of codebases? | Daily / Weekly / Monthly / Rarely / Never |

### Block 3: Repository Experience

| # | Question | Record |
|---|---|---|
| R1 | What tools do you typically use to explore unfamiliar code? | _______________ |
| R2 | Have you used AI tools (ChatGPT, Copilot, etc.) for code understanding? | Yes / No |
| R3 | On a scale of 1–5, how comfortable are you navigating large codebases (>50 files)? | _______________ |

### Block 4: Conflict Check (MUST pass ALL)

| # | Question | Accept If | Reject If |
|---|---|---|---|
| C1 | Are you the author of the validation scenario used in this study? | No | Yes |
| C2 | Have you seen the expected answer to the validation question? | No | Yes |
| C3 | Have you been shown the AIS tool's answer to the validation question? | No | Yes |
| C4 | Are you affiliated with the AIS development team? | No | Yes (see note) |

**C4 Note:** If the candidate is affiliated with the AIS team but has NOT worked on `src/core/` architecture, they may participate as a separate participant class ("familiar" marker). Their results must NOT be mixed with unfamiliar participants in aggregate analysis.

---

## Screening Result

```yaml
participant_id: "P00X"  # assigned after acceptance
screening_date: "_______________"
screened_by: "_______________"

eligibility:
  E1_professional_experience: true  # true / false
  E2_can_read_code: true
  E3_can_investigate_independently: true
  E4_can_formulate_judgment: true
  E5_available: true
  all_passed: true

technical:
  role: "_______________"  # Developer / Senior Developer / Tech Lead / Architect / Security Engineer / Other
  experience_years: __
  languages: []
  typescript_experience: "_______________"  # Yes / No / Basic
  analyzed_unfamiliar_repos: true  # true / false
  architecture_analysis_frequency: "_______________"  # Daily / Weekly / Monthly / Rarely / Never

repository:
  exploration_tools: []
  ai_tool_experience: true  # true / false
  large_codebase_comfort: __  # 1-5

conflict_check:
  C1_not_scenario_author: true  # true / false
  C2_not_seen_answer: true
  C3_not_seen_ais_answer: true
  C4_not_ais_team: true  # true / false / FAMILIAR_CLASS
  all_passed: true

decision: "ACCEPTED"  # ACCEPTED / REJECTED / FAMILIAR_CLASS
exclusion_reason: null  # null or reason string
```

---

## Decision Rules

| Condition | Decision |
|---|---|
| All E1–E5 pass AND all C1–C4 pass | **ACCEPTED** |
| Any E fails | **REJECTED** — insufficient capability |
| Any C1–C3 fails | **REJECTED** — conflict of interest |
| C4 fails (AIS team member) | **FAMILIAR_CLASS** — can participate with separate marking |

## Rejection Communication

Do NOT reveal the specific reason for rejection. Use:

> "Thank you for your interest. Unfortunately, we have reached our recruitment target / your profile does not match the study requirements at this time. We appreciate your willingness to participate."
