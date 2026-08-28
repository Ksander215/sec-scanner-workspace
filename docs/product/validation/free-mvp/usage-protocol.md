# Usage Protocol — FREE MVP Session Operator Guide

**Task:** TASK-MVP-FREE-USAGE-EVIDENCE-001

---

## 1. Before the Session

### 1.1 Verify MVP is Running

```bash
cd /home/z/my-project/ais
AIS_EXECUTION_REAL=true node dist/mvp-ui/index.js
```

Confirm the server starts and logs the port. If it fails or returns 503 on question submission, the session is BLOCKED. Do not proceed.

### 1.2 Prepare Session Record

Copy `user-session-template.md` to a new file named:

```
session-<YYYY-MM-DD>-<NNN>.md
```

Example: `session-2026-08-28-001.md`

Fill in the header (session ID, timestamp, operator) BEFORE the session starts.

### 1.3 What NOT to Do

- Do NOT suggest what question the user should ask
- Do NOT explain AIS architecture, Cognitive Runtime, Discovery Pipeline, or Evidence Loop
- Do NOT show example questions
- Do NOT say "try asking about dependencies" or similar
- Do NOT correct the user's question phrasing

The user's first interaction must be self-directed.

---

## 2. Providing Access

### 2.1 User Has Their Own Project

Tell the user:

> You can analyze your own project. Enter the path to your project directory.

The "My Project" input in the UI accepts a local directory path. Path security is enforced: the path must be under an allowed root or must be a valid existing directory.

### 2.2 User Does Not Have a Project

Tell the user:

> You can try the demo project to see how the tool works.

The demo project uses the AIS codebase itself as the analysis target.

### 2.3 Provenance Tag

Immediately tag the session:

- User with own project: `HUMAN`
- User using demo: `DEMO`
- Automated/script run: `SYNTHETIC`

Record this in the session template BEFORE any questions are asked.

---

## 3. During the Session

### 3.1 Record the User's Question

Capture the EXACT question text as typed by the user. Do not paraphrase, correct grammar, or rephrase.

### 3.2 Record the AIS Response

Capture:
- Full response text
- Response latency (seconds)
- Whether the response was a real LLM answer or a stub (e.g., "Workflow execution requested")
- Any error messages

### 3.3 Record Evidence Sources

From the evidence/trace, capture for each source:
- File path
- Code snippet or reference
- Whether the file actually exists
- Whether the snippet matches the actual file content

### 3.4 Observe User Behavior (Non-Intrusive)

Without interfering, note:
- Did the user read the full response?
- Did the user open any referenced files?
- Did the user ask a follow-up question?
- Did the user express confusion or satisfaction?
- Did the user abandon the session?

### 3.5 Do NOT

- Tell the user their question is "wrong" or "could be better"
- Explain what AIS "meant to say"
- Suggest a different question
- Defend AIS if the user says the answer is wrong
- Fill in feedback on the user's behalf

---

## 4. Collecting Feedback

### 4.1 Mandatory Questions

After the user receives a response, ask these two questions exactly as written:

**Question 1:**
> Naskol'ko otvet sootvetstvuyet vashemu ponimaniyu? (How well does the response match your understanding?)

Options:
- Yes
- Partially
- No

**Question 2:**
> Udalos' li vam reshit' iskhodnuyu zadachu? (Were you able to solve your original task?)

Options:
- Yes
- Partially
- No

### 4.2 Optional Follow-Up

If the user gave negative feedback, ask:

> Chto bylo nepravil'nym, neponyatnym ili chego ne khvatilo? (What was wrong, unclear, or missing?)

### 4.3 Critical Rule: No Leading Questions

FORBIDDEN:
- "Was the response helpful because of the context retrieval?"
- "Did you like how AIS found the relevant files?"
- "Was the evidence useful?"

ALLOWED:
- "What, if anything, did you do after getting the answer?"
- "Was anything in the response confusing or wrong?"

---

## 5. After the Session

### 5.1 Complete the Session Template

Fill all remaining fields:
- Session outcome (completed, abandoned, error)
- Full feedback (verbatim)
- Behavior observations
- Operator notes (factual only, no interpretations)

### 5.2 Validate Evidence (If Negative Feedback)

For each negative finding, perform evidence validation:

```
User claim
    |
    v
AIS claim
    |
    v
Evidence source (file path)
    |
    v
Actual source code (read the file)
    |
    v
Verdict: SUPPORTED / UNSUPPORTED / HALLUCINATION
```

Example:

```
User says: "There is no execution module"
AIS claims: "execution module handles workflow orchestration"
Evidence: src/core/engine/execution-engine.ts
Verification: File exists, contains ExecutionEngine class
Verdict: GROUNDING_ERROR (wrong module name, but concept exists)
```

### 5.3 Add to Ledger

Add the session summary to `usage-evidence-ledger.yaml`.

### 5.4 Classify Any Findings

If the session revealed a problem, create an entry using `findings-template.md`.

---

## 6. Session Outcome Codes

| Code | Meaning |
|---|---|
| `COMPLETED` | User asked at least one question, received response, provided feedback |
| `COMPLETED_NO_FEEDBACK` | User asked and received response but did not provide feedback |
| `ABANDONED` | User started but did not complete the flow |
| `ERROR` | Technical error prevented completion |
| `BLOCKED` | P0 issue prevented session from starting |

---

## 7. Retention Signal

The most valuable signal is:

> Did the user return voluntarily and ask a second question?

Record this as a separate field in the session template. If the user returns for Session N+1, link the sessions.

---

## 8. Privacy

- Collect the MINIMUM information necessary for improving AIS
- Do NOT collect personal data
- Do NOT collect the user's full project content
- Do NOT collect secrets, credentials, or .env files
- Evidence should be sufficient to reproduce the finding, not to archive the user's project
- The `sanitizeSecrets()` function in the evidence loop strips API keys, tokens, and passwords from responses before they reach the user or are stored

---

## 9. Security Reminders

Before each session, verify:
- Server is running with `AIS_EXECUTION_REAL=true`
- No API keys in console output
- No PAT in logs
- No stack traces exposed to user
- Path security is active (user cannot escape allowed roots)
- 503 guard is active (no silent empty responses)

If any security issue is found, STOP and report BLOCKED.
