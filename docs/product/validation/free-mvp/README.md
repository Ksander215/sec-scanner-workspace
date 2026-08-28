# FREE MVP — Usage Evidence Collection

**Task:** TASK-MVP-FREE-USAGE-EVIDENCE-001
**Mode:** STOP CODING
**Code Freeze:** ACTIVE on `src/core/`

---

## What is this

Operational framework for collecting real user evidence from the FREE MVP of AIS (Architecture Intelligence System). This directory contains all protocols, templates, and reports needed to run user sessions, capture evidence, and make evidence-based decisions about the next engineering iteration.

## Key Principle

> Do not improve AIS until you have evidence that a problem exists, unless the problem is a P0 blocker that prevents usage entirely.

## Files

| File | Purpose |
|---|---|
| `README.md` | This file. Operator quick-start guide. |
| `usage-protocol.md` | Complete protocol for providing MVP to a user, running a session, and capturing evidence. |
| `user-session-template.md` | Template for recording one real user session. Copy and fill for each session. |
| `usage-evidence-ledger.yaml` | Structured YAML ledger for all sessions. Single source of truth. |
| `findings-template.md` | Template for recording quality findings with full evidence chain. |
| `batch-001-report.md` | Analysis report after the first batch of 5-10 users. |
| `decision-record.md` | Final decision: CONTINUE / ITERATE / INVESTIGATE / STOP. |

## Current State

```
HEAD:       e971597
Branch:     main
Quality Gate: CONDITION (all 5 gates PASS after discovery fix)
Real inference: confirmed (z-ai proxy, GLM-4 Plus)
Security:    PASS (sanitizeSecrets, PathSecurity, 503 guard)
Regression:  33/33 PASS
Code Freeze: ACTIVE on src/core/
```

## MVP Positioning

AIS is positioned as a **free experimental tool** for exploring and understanding software project architecture. Users must understand:

> AIS helps you explore and understand your project's architecture, but its conclusions must be verified against the actual source code.

## What we do NOT promise

- 100% architectural correctness
- Zero hallucinations
- Automatic architectural decisions
- Replacement for a human architect
- Security certification
- Production-grade architectural governance

## Operator Responsibilities

1. Provide MVP access to the user without suggesting what to ask
2. Do NOT hint, correct, or influence the user's question or feedback
3. Record every session using the session template
4. Classify findings using the findings template
5. Do NOT fabricate or assume feedback
6. Maintain strict separation: HUMAN vs SYNTHETIC vs DEMO evidence
7. After each batch, produce the batch report and decision record

## Provenance Labels

Every session must be tagged with exactly one:

| Label | Meaning |
|---|---|
| `HUMAN` | Real user with their own project or real task |
| `SYNTHETIC` | AI-generated or script-driven validation run |
| `DEMO` | User tried the demo project (not their own code) |

## Decision Gate

After the first meaningful batch, answer:

> **Does AIS create enough real-world value to justify another engineering iteration?**

- **A (YES)**: Repeatable value detected. Plan next engineering iteration.
- **B (UNCLEAR)**: Interest exists but evidence insufficient. Continue collecting.
- **C (NO)**: Users try but do not get significant value. Root-cause analysis needed.

## STOP Conditions

Immediately report BLOCKED if:

1. FREE MVP cannot be launched
2. Real inference does not work
3. User cannot submit a question
4. Response is not saved
5. Evidence cannot be linked to response
6. Feedback cannot be linked to session
7. Secret leak detected
8. Human and synthetic usage cannot be distinguished
