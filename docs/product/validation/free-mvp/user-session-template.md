# User Session Record — Template

**Copy this file for each session. Name: `session-<YYYY-MM-DD>-<NNN>.md`**

---

## Header

| Field | Value |
|---|---|
| Session ID | `sess-<YYYYMMDD>-<NNN>` |
| Date | YYYY-MM-DD HH:MM UTC |
| Operator | (name or ID) |
| Provenance | `HUMAN` / `DEMO` / `SYNTHETIC` |
| Project Type | `USER_PROJECT` / `DEMO_PROJECT` |
| Project Scope | (directory path, or "AIS demo") |

---

## User Intent

### Question 1

**Timestamp:** YYYY-MM-DD HH:MM UTC

**User's exact question (verbatim):**

```

```

**Task category (if obvious):** (leave blank if not obvious)

---

## AIS Response 1

**Latency:** Xs

**Status:** `SUCCESS` / `STUB` / `ERROR`

**Provider/Model:** (e.g., glm-4-plus)

**Full response:**

```

```

---

## Evidence 1

| # | Source Path | Exists? | Snippet Matches? | Relevance | Notes |
|---|---|:---:|:---:|---|---|
| 1 | | Y/N | Y/N | | |
| 2 | | Y/N | Y/N | | |
| 3 | | Y/N | Y/N | | |

---

## Claims 1

| # | Claim Statement | Source Evidence | Verdict |
|---|---|---|---|
| 1 | | | SUPPORTED / UNSUPPORTED / HALLUCINATION / PARTIAL |
| 2 | | | SUPPORTED / UNSUPPORTED / HALLUCINATION / PARTIAL |
| 3 | | | SUPPORTED / UNSUPPORTED / HALLUCINATION / PARTIAL |

---

## Feedback 1

**Response accuracy:** `YES` / `PARTIALLY` / `NO`

**Task solved:** `YES` / `PARTIALLY` / `NO`

**User comment (verbatim):**

```

```

---

## User Behavior

- [ ] Read full response
- [ ] Opened referenced files
- [ ] Asked follow-up question
- [ ] Expressed confusion
- [ ] Expressed satisfaction
- [ ] Abandoned session
- [ ] Returned for another session

**Notes (factual observations only):**

```

```

---

## (Repeat for Question 2, 3, ...)

---

## Session Summary

| Field | Value |
|---|---|
| Outcome | `COMPLETED` / `COMPLETED_NO_FEEDBACK` / `ABANDONED` / `ERROR` / `BLOCKED` |
| Questions asked | N |
| Feedback provided | Y/N |
| Total latency | Xs |
| Errors | (list) |

---

## Operator Notes

(Factual observations only. No interpretations. No assumptions about what the user "meant".)

```

```

---

## Evidence Validation (if negative feedback)

For each negative finding:

```
User claim: "..."
AIS claim: "..."
Evidence source: src/path/to/file.ts
Verification: (actual file content)
Verdict: HALLUCINATION / GROUNDING_ERROR / CONTEXT_ERROR / INTENT_ERROR
```
