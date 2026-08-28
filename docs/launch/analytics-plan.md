# Analytics Plan — FREE MVP Launch

**Task:** TASK-MVP-FREE-LAUNCH-001
**Principle:** Minimal tracking. No vanity metrics.

---

## Tracked Events

| Event | Trigger | Value | Type |
|---|---|---|---|
| `landing_visit` | Page load | interest | E0 |
| `demo_started` | Click "Start Demo Session" | activation | E1 |
| `custom_path_started` | Click "Start with Custom Path" | deeper interest | E1 |
| `question_submitted` | Question API call succeeds | usage | E1 |
| `response_received` | Answer rendered | technical success | E1 |
| `feedback_given` | Feedback API call | perceived value | E2 |
| `follow_up_question` | Second question in same session | engagement | E2 |
| `trace_viewed` | Trace screen shown | evidence interest | E1 |
| `new_session` | Return to start screen | potential return | E2 |
| `503_encountered` | 503 error shown | blocked usage | P0 signal |

## NOT Tracked

- User identity / email / IP
- Question text content (stored server-side in session, not in analytics)
- Keystrokes / mouse movements
- Time on page
- Scroll depth
- Referrer URL
- Browser / OS / device

## Why These Events Only

These 10 events answer the four questions from the task spec:

1. **Who uses AIS?** — `landing_visit` → `demo_started` / `custom_path_started` tells us activation
2. **What problem?** — `question_submitted` + server-side question text (not in analytics)
3. **What's useful?** — `feedback_given` + `follow_up_question`
4. **What next?** — `new_session` (return signal)

## Implementation Note

Analytics should be implemented as server-side event logging in `HttpAdapter`, not client-side JavaScript tracking. This avoids ad blockers and privacy concerns. Each event is a one-line JSON append to a log file.

```typescript
// Example (NOT to be implemented until P0 evidence justifies it)
// const event = { ts: Date.now(), session: sessionId, event: 'question_submitted' };
// appendToFile('analytics.log', JSON.stringify(event) + '\n');
```

**This plan is documentation only. No code changes until evidence justifies the implementation.**

## Danger: Conversion Optimization

Per §24: high conversion means nothing without value.

```
Landing → Demo = 80%        ← good
Demo → Question = 70%       ← good
Question → Answer = 90%     ← good
Answer → Return = 0%        ← PRODUCT FAILURE
```

The ONLY metric that matters for Batch 001 is **return behavior**.
