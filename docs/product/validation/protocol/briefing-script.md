# Participant Briefing Script — Wave 1

## Observer reads this to the participant BEFORE baseline phase.

---

### Introduction

"Thank you for agreeing to participate in this session. I will walk you through what we're going to do today."

---

### Purpose (sanitized)

"We are researching how developers understand the architecture of an unfamiliar software system. We want to learn what helps people form an accurate mental model of a codebase they haven't seen before."

**DO NOT say:**
- "We want to prove AIS is better."
- "We're testing an AI tool against manual exploration."
- "The AI should help you."

---

### What You'll Work With

"You will be working with a TypeScript project located at `src/core/`. This directory contains approximately 393 files and around 73,000 lines of code. It implements several interconnected subsystems."

"The project is a real production codebase. The code is genuine — not synthetic or simplified."

---

### Available Tools — Baseline Phase

"In the first phase, you will have access to:"

- "The repository itself (full read access to `src/core/`)"
- "An IDE or text editor of your choice"
- "Terminal with standard tools (grep, find, rg, etc.)"
- "A file browser"
- "Web browser for general reference (not for looking up this specific project)"

"You will NOT have access to the AIS tool during this phase."

---

### Time

"You have up to **45 minutes** for the baseline phase. I will let you know when time is running out. If you finish early, that's fine — let me know."

---

### The Task

"Your task is to answer the following architecture question based solely on your own exploration:"

> **What are the main architectural boundaries inside `src/core`, and how do the cognitive, discovery, and engine subsystems interact?**

"In your answer, please cover:"

1. "The main subsystems/boundaries you can identify within `src/core/`"
2. "What each major subsystem is responsible for"
3. "How the `cognitive`, `discovery`, and `engine` subsystems interact with each other"
4. "Any important cross-module dependencies you notice"
5. "Your confidence level and what you're uncertain about"
6. "Specific files or code evidence that support your claims"

---

### Important Notes

- "There is no single 'correct' answer — we're interested in your understanding."
- "If you can't answer something, say so — that's valuable information."
- "Please think aloud as much as possible — it helps us understand your reasoning process."
- "I will not help you with the task or answer questions about the architecture."

---

### After Baseline

"After the baseline phase, you will use the AIS tool to explore the same question. I'll explain that part when we get there."

"For now — let's start the baseline. You have 45 minutes. The clock starts now."

---

## Time Check Prompts

Observer should announce at:

| Time Remaining | Prompt |
|---|---|
| 30 min | "30 minutes remaining." |
| 15 min | "15 minutes remaining." |
| 5 min | "5 minutes remaining. Please start wrapping up your answer if you haven't already." |
| 0 min | "Time is up. Please provide your final answer now." |

---

## If Participant Asks Questions During Baseline

| Question Type | Response |
|---|---|
| "What does this file do?" | "I can't help with that — please use your own judgment." |
| "Am I on the right track?" | "There's no right track — go with your understanding." |
| "How much time do I have?" | Provide remaining time. |
| "Can I use [tool X]?" | If it's a standard search/navigation tool — yes. |
| "Is this subsystem important?" | "I can't answer that — use your judgment." |