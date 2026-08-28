# Future Account Model — Architecture Document

**Task**: TASK-MVP-FREE-ACCOUNT-READINESS-001  
**Status**: Conceptual — NO implementation  
**Code Freeze**: `src/core/` untouched  

---

## 1. Purpose

This document defines the conceptual identity model for future account
support in AIS. It is NOT a specification for implementation. It exists to
confirm that the current architecture can accommodate accounts later without
modifying Core AIS, Evidence Loop, or Interaction Layer.

## 2. Current State — Anonymous Only

### 2.1 How Sessions Work Today

```
User (anonymous)
  |
  | POST /api/session { projectPath }
  |
  v
InteractionService.startInteraction()
  |
  | delegates to
  v
EvidenceLoopService.startSession({ sourceType, projectScope })
  |
  | delegates to
  v
SessionRuntime.createSession(metadata)
  |
  v
Session { id: crypto.randomUUID(), metadata: { sourceType, projectScope } }
```

**Key observations from Reality Check:**

- **Session ID** is a `crypto.randomUUID()` — no dependency on any user identity
- **Session.metadata** is `Record<string, unknown>` — extensible without schema changes
- **projectScope** is stored in metadata (set by EvidenceLoopService)
- **sourceType** (Human/Synthetic) tracked per-session via `sessionSourceTypes` Map
- **All evidence entities** (Intent, Response, Claim, ClaimEvidence, EvidenceFeedback,
  QualityFinding) reference `sessionId` as their sole ownership key
- **No `userId`**, no `accountId`, no authentication concept exists anywhere in Core
- **InMemorySessionStorageAdapter** — sessions live as long as the server process

### 2.2 Repository Identity

| Aspect | Current Implementation | Future Stability |
|--------|----------------------|------------------|
| Local path | `projectPath` string | Transient (server-local) |
| GitHub URL | Parsed by `GitHubResolver` | Stable identifier |
| Owner/Name | Extracted from URL | Stable identifier |
| Commit hash | `git rev-parse HEAD` | Immutable per clone |
| Clone directory | `/tmp/ais-repos/owner--name--hash` | Ephemeral (deleted on shutdown) |

**Finding**: The `projectPath` is a transient local filesystem path. For GitHub
repos, the stable identifiers are `(owner, name, commit)`. A future account
system should link sessions by these stable identifiers, not by `projectPath`.

## 3. Future Identity Model

### 3.1 Conceptual Hierarchy

```
Account (future)
  |
  +-- userId: string
  +-- createdAt: string
  +-- sessions: SessionId[]
  |
  v
Session (existing, unchanged)
  |
  +-- sessionId: SessionId (UUID)
  +-- metadata.sourceType: 'human' | 'synthetic'
  +-- metadata.projectScope: string
  +-- metadata.userId?: string        <-- FUTURE ONLY
  +-- metadata.repoUrl?: string         <-- FUTURE ONLY
  +-- metadata.repoOwner?: string       <-- FUTURE ONLY
  +-- metadata.repoName?: string        <-- FUTURE ONLY
  +-- metadata.repoCommit?: string      <-- FUTURE ONLY
  |
  v
Interaction (existing, unchanged)
  +-- sessionId: SessionId
  +-- projectPath: string
  +-- questions/answers/evidence/feedback
```

### 3.2 Anonymous Session (current, unchanged)

```
Anonymous
  |
  v
Session { id: UUID, metadata: { sourceType: 'human', projectScope: '/path' } }
  |
  v
Interaction → Question → Answer → Evidence → Feedback
```

**Critical property**: Session does NOT depend on Account. The session is
fully functional without any user identity. This is the current state and
it MUST remain unchanged.

### 3.3 Authenticated Session (future)

```
Account { userId: 'usr_abc123' }
  |
  v
Session { id: UUID, metadata: { sourceType: 'human', projectScope: '/path',
                                  userId: 'usr_abc123' } }
  |
  v
Interaction → Question → Answer → Evidence → Feedback
```

**Key insight**: The only difference is `metadata.userId`. All Core entities
remain unchanged because they reference `sessionId`, not `userId`.

## 4. Anonymous to Account Migration

### 4.1 Claim Existing Session

```
1. User creates account (email, GitHub OAuth, etc.)
2. User provides their existing sessionId (from browser localStorage, URL param, etc.)
3. Server validates: session exists, no existing userId
4. Server updates: session.metadata.userId = newUserId
5. All existing evidence, feedback, findings remain linked to session
6. No data loss
```

### 4.2 What Is Preserved

| Data | Preserved? | Mechanism |
|------|-----------|-----------|
| Questions | Yes | Intent.sessionId unchanged |
| Answers | Yes | Response.sessionId unchanged |
| Evidence | Yes | ClaimEvidence.sessionId unchanged |
| Claims | Yes | Claim.sessionId unchanged |
| Feedback | Yes | EvidenceFeedback.sessionId unchanged |
| Findings | Yes | QualityFinding.sourceSessionId unchanged |
| Repository context | Yes | Session.metadata.projectScope unchanged |

### 4.3 No Core Changes Required

The migration works because:
- All entities use `sessionId` as their foreign key
- `Session.metadata` is already `Record<string, unknown>`
- Adding `userId` to metadata is a write operation, not a schema change
- No entity needs a new column or field

## 5. Repository Ownership Model

### 5.1 Public Repository (current)

```
Anyone (anonymous or authenticated)
  |
  v
GitHubResolver.resolve('https://github.com/owner/repo')
  |
  v
Clone → Analyze → Session
```

No ownership. No restrictions. Current behavior.

### 5.2 User-Owned Repository (future)

```
Authenticated user
  |
  v
POST /api/repositories { url, label? }
  |
  v
Repository { id, userId, url, owner, name, lastCommit, savedAt }
  |
  v
Linked to sessions via metadata.repoUrl
```

This allows:
- "My repositories" list
- Re-analysis without re-cloning
- Cross-session history for a repository

### 5.3 Private Repository (future, NOT now)

```
Authenticated user + GitHub OAuth token
  |
  v
GitHubResolver.resolve(url, { githubToken: 'ghp_...' })
  |
  v
Clone with authentication → Analyze → Session
```

**Boundaries**:
- Requires GitHub OAuth scope `repo`
- Token MUST be stored securely (encrypted at rest)
- Token MUST never appear in evidence, feedback, or traces
- `sanitizeSecrets()` already catches `ghp_` patterns — verified
- Private repos are isolated per user — no cross-user access

## 6. Privacy and Security

### 6.1 Session Isolation

**Current state**: All sessions are in-memory on a single server. No isolation
needed — there is only one "user" (the anonymous visitor).

**Future requirement**: When accounts exist, session isolation MUST be enforced:
- A user MUST only access their own sessions
- A user MUST never see another user's sessionId, evidence, or feedback
- This is enforced at the adapter/middleware layer, NOT in Core

### 6.2 Existing Protections

| Protection | Mechanism | Status |
|------------|-----------|--------|
| API key redaction | `sanitizeSecrets()` | Active |
| GitHub PAT redaction | Pattern `ghp_[a-zA-Z0-9]{36}` | Active |
| Password redaction | Pattern `password\s*[=:]` | Active |
| No stack traces | `HttpAdapter.mapError()` | Active |
| Path traversal | `PathSecurityService` | Active |
| Body size limit | 1MB | Active |
| Question length limit | 10,000 chars | Active |
| CORS | Configurable origin | Active |

### 6.3 Future Risks

| Risk | Mitigation |
|------|-----------|
| Session enumeration | Use unguessable UUIDs (already done) |
| Cross-user session access | Enforce userId match at adapter layer |
| Token leakage in evidence | `sanitizeSecrets()` + never log tokens |
| Repository URL as user fingerprint | URLs are public by definition |
| Local path disclosure | Paths are server-side, never sent to client |

## 7. Future Account Triggers

Registration MUST NOT be shown on first visit. Triggers for showing
"Create account" prompt:

| Trigger | User Intent Signal | Priority |
|--------|-------------------|----------|
| Save analysis | Wants to return to this result | High |
| Save repository | Wants to re-analyze without re-typing URL | High |
| View history | Wants to see past analyses | High |
| Second question in same session | Engaged user, value recognized | Medium |
| Return visit (detected via localStorage) | Repeat user | Medium |
| Private repository | Needs auth for access | High (forced) |

### 7.1 Conversion Funnel Metrics

```
Anonymous visitors
  |
  v  [repository analyzed]
Repository analyzed
  |
  v  [question asked]
Question asked
  |
  v  [useful answer — feedback: correct]
Useful answer
  |
  v  [second question in session]
Second interaction
  |
  v  [save intent triggered]
Save intent
  |
  v  [account created]
Account created
  |
  v  [return visit authenticated]
Return visit
```

**Key metric**: Conversion from first answer to second question. If a user
asks a second question, they found value. This is the strongest signal.

### 7.2 UX Contract for Account Prompt

```
[Answer displayed]
[Evidence displayed]

Your analysis is ready.

Want to save this analysis for later?

[Create free account]  [Continue without account]
```

Rules:
- Prompt appears AFTER value is delivered (post-answer, not pre-analysis)
- "Continue without account" is always available and prominent
- Dismissing the prompt does NOT re-show it in the same session
- The prompt is NOT a modal, NOT a popup, NOT a wall

## 8. Conceptual Interface Proposals

These are NOT to be implemented now. They exist only to verify that the
type system can accommodate the future model.

```typescript
// Future identity — NOT implemented
type UserIdentity =
  | { type: 'anonymous' }
  | { type: 'authenticated'; userId: string };

// Future repository record — NOT implemented
interface SavedRepository {
  readonly id: string;
  readonly userId: string;
  readonly url: string;
  readonly owner: string;
  readonly name: string;
  readonly lastCommit: string;
  readonly savedAt: string;
}
```

**Why these are safe**: They live entirely outside Core. They would be
implemented in a new `src/account/` module or in the MVP UI adapter layer.

## 9. What Must NOT Change

The following are ARCHITECTURAL INVARIANTS verified by this task:

1. **Session does not require Account** — a session is fully functional without userId
2. **All Core entities reference sessionId, not userId** — no schema migration needed
3. **Session.metadata is extensible** — adding fields requires zero Core changes
4. **Evidence invariants (I-01..I-13) are independent of identity** — provenance (Human/Synthetic)
   is about evidence source, not about who the user is
5. **Feedback != Truth (I-05)** — remains true regardless of authentication
6. **sanitizeSecrets()** — already protects against credential leakage
7. **PathSecurityService** — already enforces filesystem boundaries
8. **Code Freeze on src/core/** — maintained, zero files modified

## 10. Architectural Findings

| ID | Finding | Severity | Action |
|----|---------|----------|--------|
| AF-001 | Session.metadata is the correct extension point for userId | Info | No action now |
| AF-002 | projectPath is transient for cloned repos; stable ID = (owner, name, commit) | Info | Document for future |
| AF-003 | SessionStorageAdapter is already pluggable (ADR-004) — future DB adapter possible | Info | No action now |
| AF-004 | InMemorySessionStorageAdapter does not survive restart — sessions are ephemeral | Info | Expected for MVP |
| AF-005 | No rate limiting on session creation — future DOS vector | Low | Monitor, address with accounts |
| AF-006 | sanitizeSecrets() catches ghp_ patterns but future GitHub token storage needs encryption | Medium | Address when implementing accounts |

## 11. Conclusion

**The current architecture is ready for future account support without any
changes to Core AIS, Evidence Loop, or Interaction Layer.**

The key reason: all entities use `sessionId` as their ownership reference,
not `userId`. User identity can be added as an orthogonal concern at the
adapter/middleware layer, using `Session.metadata` as the bridge.

**Next step: return to the main experiment.**

```
GitHub repository
        |
      AIS
        |
   User explores
        |
    Questions
        |
      Value
        |
    Feedback
        |
     Evidence
```
