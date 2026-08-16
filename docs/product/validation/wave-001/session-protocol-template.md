# Wave 1 — Session Protocol Template

**Task:** TASK-PRODUCT-VALIDATION-EXECUTION-001  
**One template per participant.** Copy and fill for each session.

---

## Session Header

| Field | Value |
|-------|-------|
| Participant ID | P-NNN |
| Date | YYYY-MM-DD |
| Duration (planned) | 60-90 min |
| Researcher | [name] |
| Observer | [name, must differ from AIS developer] |
| Recording | ☐ Audio ☐ Video ☐ None |
| Consent obtained | ☐ Yes ☐ No |
| Persona | Developer / Tech Lead / Architect / Security Engineer / CTO |
| Project | [anonymized description] |
| Scenarios assigned | [e.g., A + B] |

---

## Phase 0 — Consent & Setup (5 min)

### Consent Statement (read verbatim)

> «Мы проводим исследование инструмента для понимания программной архитектуры. Сессия будет записана (аудио/видео). Все данные будут анонимизированы — ваше имя и название проекта не будут указаны в отчётах. Вы можете остановить сессию в любой момент. Ваши ответы не будут считаться правильными или неправильными — нам важно, что вы делаете, а не как быстро.»

Consent: ☐ Obtained

### Pre-session check

- ☐ AIS prototype is functional
- ☐ Participant's project is connected and Discovery completed
- ☐ Observer ready with recording
- ☐ Timer ready
- ☐ No description of AIS capabilities given beyond basic intro

---

## Phase 1 — Baseline (15-20 min)

**CRITICAL: Do this BEFORE any AIS exposure.**

### Participant Context

| Field | Response |
|-------|----------|
| Current role | |
| Team size | |
| Project type | |
| Project size | |
| Tech stack | |
| Months on project | |
| Architectural responsibility | |

### Task Introduction

Give the participant their **real task** (selected from their current work, per §14 of Execution Spec).

Task description:
> ___

### Baseline Workflow Recording

| Element | Observation |
|---------|-------------|
| Task: what they try to do | |
| Why the task arose | |
| How often this task occurs | |
| Importance (1-5) | |
| What decision depends on it | |

### Baseline Metrics

| Metric | Value |
|--------|-------|
| Tools used | [list in order] |
| Sources consulted | [count] |
| Steps required | [count] |
| Baseline duration | [min:sec] |
| Uncertainty points | [list] |
| Context switches | [count] |
| Delays encountered | [list with duration] |
| Reliance on memory | [describe] |
| Outcome | [description] |
| Confidence in outcome (1-5) | |
| Friction points | [list] |
| Would verify externally? | ☐ Yes ☐ No |

---

## Phase 2 — AIS Session (20-30 min)

### Introduction

> «Теперь попробуйте решить аналогичную задачу с помощью этого инструмента. Работайте так, как вам удобно. Я не буду подсказывать.»

**Do NOT explain:**
- What AIS is supposed to show
- What capabilities exist
- How to formulate questions
- What a «good» result looks like

### AIS Interaction Log

| Timestamp | Action | Category | Notes |
|-----------|--------|----------|-------|
| | | |

**Categories (from Execution Spec §18):**
- `action` — user action (click, query, navigate)
- `question` — question asked to AIS
- `confusion` — pause >15s, back navigation, reformulation
- `verification` — user checks result externally
- `trust` — user accepts/modifies/rejects recommendation
- `correction` — user corrects AIS
- `decision` — user makes decision based on AIS

### AIS Metrics

| Metric | Value |
|--------|-------|
| AIS duration | [min:sec] |
| Questions asked to AIS | [count] |
| Progressive Disclosure levels used | [list: L1/L2/L3/L4/L5] |
| New information found? | ☐ Yes ☐ No |
| Action taken based on result? | ☐ Yes ☐ No |
| Decision changed? | ☐ Yes ☐ No |
| Confidence in outcome (1-5) | |
| Additional search needed? | ☐ Yes ☐ No |

### Context Advantage Test (§16)

| Step | Detail |
|------|--------|
| Question formulated by user | |
| AIS response quality (1-5) | |
| Generic AI used | [ChatGPT / Claude / Other / N/A] |
| Context given to generic AI | [verbatim what user would normally paste] |
| Generic AI response quality (1-5) | |
| Blind comparison: preference | ☐ AIS ☐ Generic ☐ Equal ☐ Neither |
| Specific difference noted | |
| Difference led to different decision? | ☐ Yes ☐ No |

### AI Wrapper Test (§17)

| Metric | Baseline | AIS | Generic AI Combo |
|--------|----------|-----|------------------|
| Time | | | |
| Quality (observer 1-5) | | | |
| Action taken? | | | |
| AI Wrapper Risk | | LOW / MEDIUM / HIGH / CRITICAL |

---

## Phase 3 — Post-Session Interview (10-15 min)

### Structured Questions (Execution Spec §22)

Ask exactly these questions. Do NOT rephrase to be more positive.

| # | Question | Response (verbatim) |
|---|----------|-------------------|
| 1 | Что было самым сложным в этой задаче? | |
| 2 | Как вы обычно решаете её сейчас? | |
| 3 | Что AIS изменил? | |
| 4 | Что AIS не смог сделать? | |
| 5 | Что оказалось полезным? | |
| 6 | Что было лишним? | |
| 7 | В какой момент вы начали/перестали доверять результату? | |
| 8 | Что вам пришлось проверить самостоятельно? | |
| 9 | Что вы бы сделали без AIS в этой ситуации? | |
| 10 | Использовали бы вы AIS для подобной задачи снова? | |

### Follow-up (only if natural)

| Topic | Response |
|--------|----------|
| Would you recommend to a colleague? (unsolicited only) | |
| What would make you return? | |
| Any frustrations? | |

---

## Phase 4 — Observer Notes (immediately after session)

### Key Observations

| Observation | Category | Evidence Link |
|-------------|----------|-------------|
| | | |

### Positive Signals Observed (§10)

- ☐ User independently formulated next question
- ☐ Used obtained context
- ☐ Checked explanation
- ☐ Changed decision based on evidence
- ☐ Returned to AIS without prompt
- ☐ Used multiple related capabilities
- ☐ Discovered previously unknown information

### Negative Signals Observed (§10)

- ☐ User did not understand response
- ☐ Context did not help
- ☐ AIS did not know necessary information
- ☐ User returned to previous workflow
- ☐ User did not trust response
- ☐ Explanation insufficient
- ☐ User considered AIS an extra step
- ☐ Generic AI solved task equally well

### Explainability Assessment (§18)

| Check | Observation |
|-------|-------------|
| Source of context visible? | |
| Connection to Architecture Model clear? | |
| Dependencies understandable? | |
| Uncertainty visible? | |
| User distinguishes fact from recommendation? | |

### Trust Behavior (§19)

| Behavior | Observed? |
|----------|------------|
| Checked evidence | ☐ |
| Accepted conclusion | ☐ |
| Asked clarifying question | ☐ |
| Ignored response | ☐ |
| Sought confirmation elsewhere | ☐ |

### Uncertainty Test (§20)

| Situation | AIS Response | User Reaction |
|-----------|-------------|---------------|
| | | |

---

## Researcher Notes

[Any observations, deviations from protocol, or context not captured above]

```
Protocol deviations (if any):
- 
```