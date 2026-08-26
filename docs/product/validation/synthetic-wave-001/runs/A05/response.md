# CONTROL A05 — Security Engineer — Independent Analysis

**Run ID:** A05
**Role:** Security Engineer (5 years exp)
**Mode:** CONTROL A (independent, no LLM)
**Question:** Q1
**Repository Commit:** ab42c7a

## Key Findings

### Trust Zones (Confidence: 5/5)
Five zones defined: Z0 (Constitutional) → Z1 (Core AIS) → Z2 (Plugin Sandbox) → Z3 (Provider Interface) → Z4 (External)
Six gates (G-01 through G-06) enforce transitions.

### CRITICAL: Trust Zone Gate Never Blocks (Confidence: 5/5)
File: `zones/trust-zone-gate.ts` lines 57-70
All 6 gate checks return `true` unconditionally. The gate is a **logger, not an enforcer**.

### Interaction Pattern (Confidence: 5/5)
- Engine instantiates Discovery per-request (projectPath flows unsanitized to readdirSync/readFileSync — path traversal risk)
- Engine passes discovery output as string context to Cognitive
- Cognitive crosses Z1→Z3→Z4 for LLM calls WITHOUT calling trustZoneGate.check()
- Cognitive does NOT call gate before provider invocation

### Event Bus Security (Confidence: 5/5)
- No access control on subscribe/publish
- No input validation on payloads (unknown)
- No rate limiting
- Errors silently swallowed (catch { })
- Any component can publish any event type

### Sandboxing (Confidence: 5/5)
- Plugin Sandbox: interface only, no concrete implementation found
- Tool Sandbox: logical only (timeout + exception boundary), no OS isolation, memory limits disabled
- Capability Sandbox: permission checking + violation logging, but emit() bridges Z2→Z1 without gate enforcement

### Memory Isolation (Confidence: 5/5)
MemoryIsolationGuard is strongest boundary — enforces session boundaries across working/session/persistent layers. Entries without sessionId accessible to everyone.

### Discovery Security (Confidence: 5/5)
- Synchronous fs APIs
- No size limit on individual file reads
- Regex-based import parsing (safe)
- Dependency extraction capped at 5000

### Compliance Engine (Confidence: 5/5)
Static regex-based analysis (SEC-001..SEC-004, PRIV-001..PRIV-003). Build-time only, not runtime. Bypassable. Empty content passes silently.

### Risk Summary
| Risk | Severity |
|---|---|
| Trust zone gate never blocks | HIGH |
| Path traversal in discovery | HIGH |
| Event bus no access control | MEDIUM |
| Plugin sandbox interface-only | MEDIUM |
| Tool sandbox no OS isolation | MEDIUM |
| Capability emit bridges Z2→Z1 | MEDIUM |

## Limitations
- ~15 files read, many key files unread
- cognitive/provider-runtime.ts unread
- tool/policies.ts, validator.ts unread
- Static analysis only
- Some confidence ≤2 claims clearly marked
