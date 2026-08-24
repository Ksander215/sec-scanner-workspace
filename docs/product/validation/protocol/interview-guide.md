# Qualitative Interview Guide — Post-Session

Observer conducts this interview after the Verification Phase. All questions must be asked **neutrally** — no leading language.

---

## Q1 — Difficulty

> **Что было самым сложным в понимании системы?**

**Purpose:** Validates H1 (Problem Exists)

**Follow-ups (if needed):**
- "Can you describe the moment you felt most lost?"
- "Which part of the architecture was hardest to grasp?"

**DO NOT say:** "Was the cognitive subsystem confusing?"

---

## Q2 — AIS Value

> **Что AIS помог понять?**

**Purpose:** Identifies specific value dimensions

**Follow-ups (if needed):**
- "Can you give a specific example of something you learned from AIS?"
- "Was there anything you understood differently after using AIS?"

**DO NOT say:** "AIS helped you understand the engine, right?"

---

## Q3 — AIS Gaps

> **Что AIS не смог объяснить?**

**Purpose:** Identifies AIS limitations

**Follow-ups (if needed):**
- "Was there anything you expected AIS to cover but it didn't?"
- "Were there areas where AIS's answer felt incomplete?"

**DO NOT say:** "AIS probably missed some dependencies, right?"

---

## Q4 — Independent Verification

> **Что пришлось проверять самостоятельно?**

**Purpose:** Assesses grounding and verification behavior

**Follow-ups (if needed):**
- "Did you check the source code for any of AIS's claims?"
- "What triggered you to verify something — or not?"

**DO NOT say:** "You probably had to verify the hallucinations, right?"

---

## Q5 — Comparison

> **Был ли ответ AIS полезнее самостоятельного поиска?**

**Purpose:** Direct comparison signal

**Follow-ups (if needed):**
- "In what way was it more useful — or not?"
- "Would your understanding be the same without AIS?"

**DO NOT say:** "AIS was better than your manual search, wasn't it?"

---

## Q6 — Reuse Intent

> **В какой момент вы бы снова использовали AIS?**

**Purpose:** Assesses perceived utility and adoption potential

**Follow-ups (if needed):**
- "What kind of tasks would you use it for?"
- "When would you prefer not to use it?"

**DO NOT say:** "You'd use it for onboarding, right?"

---

## Q7 — Trust Boundaries

> **В какой ситуации вы бы не стали ему доверять?**

**Purpose:** Assesses trust calibration (H6)

**Follow-ups (if needed):**
- "What would make you skeptical of an AIS answer?"
- "Did you notice anything that reduced your trust during the session?"

**DO NOT say:** "You wouldn't trust it for production decisions, right?"

---

## Q8 — Understanding Reproduction (Critical — §26–§27)

> **Объясните архитектуру своими словами, не читая ответ AIS.**

**Purpose:** Verifies genuine understanding transfer (not copy-paste)

**Protocol:**
1. Ask participant to put the AIS answer away
2. Ask them to explain the architecture from memory
3. Record their answer verbatim
4. Compare with AIS output — check for independent reformulation

**DO NOT:** Show the AIS answer during this question.

---

## Q9 — AI Wrapper Test — Human Version (§30)

> **Could you have obtained this same level of understanding from a generic AI (e.g., ChatGPT) without repository access?**

**Purpose:** Validates H4 (AI Is Not Generic Chat)

**Follow-ups (if needed):**
- "What specific information in the AIS answer could a generic AI not provide?"
- "Were there project-specific details that surprised you?"

**Observer also checks (independently):**
- Did AIS answer contain file paths, function names, or code patterns specific to this codebase?
- Would a generic AI without repository access be able to produce comparable specificity?

---

## Interview Rules

1. **Record everything** — use audio recording if participant consents, or detailed notes
2. **No leading questions** — see negative examples above
3. **No confirmation bias** — if participant praises AIS, probe for negatives; if they criticize, probe for positives
4. **Timebox:** 15–20 minutes maximum for the interview
5. **Separate observation from interpretation** in notes (§43)

---

## Observer Notes Format

```
### Participant P00X Interview Notes

**Q1 — Difficulty:**
  Observation: [what participant said/did]
  Interpretation: [what it might mean — separate section]

**Q2 — AIS Value:**
  Observation: ...
  Interpretation: ...

[continue for all questions]

**Notable moments:**
  - [any unexpected behaviors, quotes, or reactions]
```