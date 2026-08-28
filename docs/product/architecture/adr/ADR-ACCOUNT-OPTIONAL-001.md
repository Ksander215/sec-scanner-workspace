# ADR-ACCOUNT-OPTIONAL-001: Authentication Is Optional for Free MVP

**Status**: Accepted  
**Date**: 2026-08-28  
**Task**: TASK-MVP-FREE-ACCOUNT-READINESS-001  
**Code Freeze**: `src/core/` untouched

---

## Context

AIS Free MVP allows any visitor to paste a GitHub repository URL and
receive an architecture analysis with evidence. No registration is required.

The question: *Can we add user accounts later without rewriting Core?*

## Decision

**Authentication is optional for Free MVP and must not be a prerequisite
for first-value experience.**

When accounts are eventually implemented:

1. Anonymous access remains fully functional
2. Account creation is offered AFTER value delivery (post-answer)
3. Account identity is stored in `Session.metadata`, not in Core entities
4. All Core entities continue to reference `sessionId`, never `userId`
5. The mapping `userId -> sessionIds` lives outside Core (adapter/middleware layer)

## Evidence

### E1: Session Identity Is Independent

Session IDs are `crypto.randomUUID()` — generated without any user identity
input. Verified in `src/core/session/session-runtime.ts:97`:

```typescript
const id = brandSessionId(crypto.randomUUID());
```

Session.metadata is `Record<string, unknown>` — extensible without schema
changes (verified in `src/core/session/types.ts:30`).

### E2: All Evidence Chains to Session, Not User

Every evidence entity uses `sessionId: SessionId` as its ownership key:

- `Intent.sessionId` (`src/core/evidence-loop/types.ts:162`)
- `EvidenceLoopResponse.sessionId` (types.ts:174)
- `Claim.sessionId` (types.ts:192)
- `ClaimEvidence.sessionId` (types.ts:207)
- `EvidenceFeedback.sessionId` (types.ts:223)
- `QualityFinding.sourceSessionId` (types.ts:239)

No entity references `userId`. This means adding user identity requires
zero entity schema changes.

### E3: Provenance Is About Evidence Source, Not User Identity

`SourceType` (Human/Synthetic/System) classifies the evidence source.
It is NOT a user authentication mechanism. Verified in
`src/core/evidence-loop/types.ts:51-55`.

This invariant (I-07: Human/Synthetic never mixed) is independent of
whether the human is anonymous or authenticated.

### E4: Repository Identity Is Stable

GitHub repositories are identified by `(owner, name, commit)` via
`GitHubResolver` (TASK-MVP-FREE-REPOSITORY-UX-001). The `projectPath`
is transient (temp clone dir), but the stable identifiers are
recorded in `RepoIdentity` and can be stored in `Session.metadata`.

### E5: Storage Is Already Pluggable

`SessionStorageAdapter` (ADR-004) is an interface. The current
`InMemorySessionStorageAdapter` can be replaced with a database adapter
without changing SessionRuntime or any Core code.

## Consequences

### Positive

- Zero changes to Core AIS, Evidence Loop, or Interaction Layer
- Anonymous users get full value without friction
- Account system can be added incrementally at the adapter layer
- Existing evidence invariants (I-01..I-13) are unaffected
- `sanitizeSecrets()` already protects against credential leakage

### Negative

- In-memory sessions are lost on server restart (acceptable for MVP)
- No rate limiting on session creation (acceptable until accounts exist)
- No cross-device session continuity for anonymous users (expected)

### Neutral

- `Session.metadata.userId` is a convention, not enforced by types
- Future account module (`src/account/`) will need its own tests
- Private repository support requires GitHub OAuth (separate future task)

## Compliance

| Rule | Status |
|------|--------|
| FREE MVP works anonymous | Verified |
| Session does not require Account | Verified |
| Core AIS not modified | Verified (0 files) |
| Evidence Loop not modified | Verified (0 files) |
| Interaction Layer not modified | Verified (0 files) |
| Current FREE UX not complicated | Verified (no UI changes) |
| Existing tests pass | Verified (58/58) |
| No authentication implementation | Verified |
| No database implementation | Verified |
| No OAuth implementation | Verified |

## Related

- ADR-004: Persistence is pluggable
- TASK-MVP-EVIDENCE-LOOP-001A: Evidence invariants I-01..I-13
- TASK-MVP-FREE-REPOSITORY-UX-001: GitHub resolver with RepoIdentity
- `docs/product/architecture/future-account-model.md`: Full model document
