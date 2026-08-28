# Quality Finding — Template

**Copy this section for each finding. File in batch report or separately.**

---

## Finding F-NNN

| Field | Value |
|---|---|
| ID | F-NNN |
| Category | `INTENT_ERROR` / `CONTEXT_ERROR` / `HALLUCINATION` / `GROUNDING_ERROR` / `INCOMPLETE` / `UX_ERROR` / `VALUE_FAILURE` / `SUCCESS` |
| Severity | `P0` / `P1` / `P2` / `P3` |
| Frequency | N occurrences across M sessions |
| First seen | sess-YYYYMMDD-NNN |

### Description

(Factual description of what went wrong. No speculation about root cause unless verified.)

```

```

### Evidence Chain

```
User claim: "..." (verbatim)
     |
     v
AIS claim: "..." (verbatim)
     |
     v
Evidence source: src/path/to/file.ts
     |
     v
File exists: YES / NO
     |
     v
Snippet matches actual file: YES / NO / PARTIAL
     |
     v
Verdict: SUPPORTED / UNSUPPORTED / HALLUCINATION / PARTIAL
```

### User Impact

`LOW` / `MEDIUM` / `HIGH` / `CRITICAL`

(What did the user do as a result? Did they abandon? Work around? Ignore?)

### Reproducibility

`ALWAYS` / `SOMETIMES` / `ONCE` / `UNKNOWN`

(Can the same question produce the same error?)

### Sessions Affected

| Session | Question | Outcome |
|---|---|---|
| sess-YYYYMMDD-NNN | (excerpt) | |

### Recommendation

(Only if there is evidence to support it. Not a wishlist.)

```
Evidence suggests: ...
Therefore: ...
Priority justification: ...
```

### Engineering Decision

`NO_ACTION` / `P0_FIX` / `P1_TASK` / `P2_TASK` / `P3_TASK` / `INVESTIGATE`

(Rationale:)
