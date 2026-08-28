# User Discovery Protocol

Post-session interview questions. Ask these AFTER the user has completed the AIS flow and provided in-app feedback.

## Rules

1. Do NOT suggest answers or lead the user
2. Record verbatim responses
3. Do NOT correct or defend AIS
4. Ask ALL questions even if the user seems eager to leave
5. If the user gives short answers, use silence to encourage elaboration

## Questions

### Q1 — Task

"What were you trying to do?"

Purpose: Understand the user's original intent, not what AIS interpreted.

### Q2 — Motivation

"Why did you decide to try AIS?"

Purpose: Understand what drove the user to try this tool.

### Q3 — Baseline

"How do you usually solve this kind of task without AIS?"

Purpose: Establish what AIS is competing against (reading code, asking colleagues, using other tools, etc.)

### Q4 — Value

"What did AIS help you do?"

Purpose: Identify concrete actions the user took based on the response.

### Q5 — Failure

"What was useless or incorrect?"

Purpose: Identify specific failures without suggesting what might have been wrong.

### Q6 — Trust

"Was there a moment when you stopped trusting the answer?"

Purpose: Identify the trust-breaking point (if any).

### Q7 — Comparison

"Was there anything AIS showed you faster or better than your usual approach?"

Purpose: Direct comparison with the user's baseline method.

### Q8 — Action

"What did you do after getting the answer?"

Purpose: The most important question. Did the user act on the information?

### Q9 — Return

"In what situation would you use AIS again?"

Purpose: Identify conditions for repeat usage.

## Critical Follow-Up

After Q8, always ask:

> "What happened because of the AIS answer?"

Record the user's action chain:
- No action
- Checked source code
- Changed code
- Found unknown dependency
- Understood architecture
- Asked another question
- Returned later

## Evidence Level Classification

| Level | Type | Weight |
|-------|------|--------|
| E0 | Opinion ("cool stuff") | Lowest |
| E1 | Observation (user used a feature) | Low |
| E2 | Repeating scenario (5+ users did the same) | Medium |
| E3 | Strong pattern (majority for one task) | High |
| E4 | Commercial signal (user wants to pay) | Highest |
