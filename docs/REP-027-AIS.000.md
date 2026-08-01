# REP-027-AIS.000 — Ecosystem Architecture Report

> **Architecture Report** for TASK-AIS-009A.000
> Capability Marketplace & Ecosystem Foundation

---

## 1. Document Information

| Field | Value |
|---|---|
| **Document ID** | REP-027-AIS.000 |
| **Task** | TASK-AIS-009A.000 |
| **Title** | Ecosystem Architecture Report |
| **Version** | 1.0.0 |
| **Date** | 2026-08-01 |
| **Classification** | Internal |

---

## 2. Executive Summary

The Capability Marketplace & Ecosystem Foundation introduces a complete package management ecosystem for AIS capabilities. This report documents the architectural decisions, trade-offs, and integration patterns that govern the 15-subsystem marketplace runtime.

The central architectural insight is treating a Capability as an independent, first-class artifact — installable, versioned, signed, sandboxed, rated, and composable. This mirrors the app-store pattern proven in mobile and desktop ecosystems, adapted for the unique constraints of an AI agent platform where capabilities may request access to AI providers, workflows, file systems, and desktop resources.

---

## 3. Architectural Decisions

### ADR-MP-001: Map-Based Internal State

**Decision**: Every subsystem uses `Map<string, EntityType>` for internal state storage.

**Rationale**: Maps provide O(1) lookup by ID, natural iteration, and are memory-efficient for the expected scale (thousands of capabilities). Unlike plain objects, Maps handle string keys without prototype pollution risks and support any key type if needed in the future. The Map-based approach is consistent with the Evolution Runtime (TASK-AIS-008A.000) and Compliance Runtime (TASK-AIS-000Z.000).

**Consequences**: State is in-memory only. No persistence layer in this stage. Branded IDs are cast `as string` for Map keys.

### ADR-MP-002: Branded Type Identifiers

**Decision**: All entity IDs use branded types (TypeScript intersection with `__brand`).

**Rationale**: Prevents accidental mixing of IDs from different domains (e.g., passing a PackageId where a CapabilityId is expected). The cost is casting when using IDs as Map keys, but the type safety benefit outweighs this minor inconvenience.

**Consequences**: 13 branded ID types across the marketplace domain. Each has a corresponding `brand` function for creation.

### ADR-MP-003: Frozen Immutable Entities

**Decision**: All domain entities are frozen via `Object.freeze()` at creation time.

**Rationale**: Enforces immutability as an architectural invariant. No entity can be modified after creation — state changes create new frozen objects. This eliminates an entire class of bugs related to unintended mutation and makes the system inherently thread-safe for future concurrent execution.

**Consequences**: Entity updates require full object reconstruction via spread. Memory overhead from duplicate objects during updates is acceptable at the expected scale.

### ADR-MP-004: Event-Driven Communication

**Decision**: All state changes emit domain events through InProcessEventBus.

**Rationale**: Decouples subsystems from each other. Other runtimes (Compliance, Metrics, Trace) can subscribe to marketplace events without direct dependencies. Events provide an audit trail for PHI-007 compliance.

**Consequences**: 35 event types across the marketplace domain. Event emission is async but fire-and-forget (errors in event bus don't fail the operation).

### ADR-MP-005: Capability as Independent Unit

**Decision**: A Capability is the atomic unit of the ecosystem — it can exist independently of any specific workflow, runtime, or user context.

**Rationale**: This mirrors the app-store model where an application is self-contained. A capability declares its own permissions, dependencies, and compatibility requirements. The ecosystem provides the infrastructure for distribution, installation, and composition.

**Consequences**: Capabilities must be self-describing (manifest). The permission system must be explicit and granular. Composition requires careful interface contracts.

### ADR-MP-006: Sandbox Isolation

**Decision**: Every installed capability runs in a sandbox with configurable isolation level.

**Rationale**: Capabilities from third-party publishers could theoretically violate platform security. Sandboxing with resource limits (memory, CPU, disk, network, execution time) provides defense in depth.

**Consequences**: 4 isolation levels (Full, Restricted, Minimal, None). Resource limits are configurable per-sandbox instance. Sandbox violations emit events for monitoring.

### ADR-MP-007: Explicit Permission Model

**Decision**: Capabilities must explicitly declare all permissions they need. Required permissions (Network, FileSystem, Desktop) need user approval.

**Rationale**: Following the principle of least privilege. Users should understand exactly what a capability can access before installation. The permission request/grant/deny lifecycle provides a clear audit trail.

**Consequences**: 8 permission types. Auto-grant for safe permissions (SystemMetrics, UserSettings) is configurable. Explicit grant required for dangerous permissions.

---

## 4. Subsystem Design Patterns

### 4.1 Constructor Pattern
All subsystems follow: `constructor(config: XxxConfig, eventBus?: InProcessEventBus | null)`. Config is stored as `private readonly`. EventBus defaults to null (disabled).

### 4.2 Publish Event Pattern
All subsystems share the same `publishEvent` helper that constructs a `DomainEventBase` with `eventId`, `sequence`, `aggregateId`, `aggregateType`, and `version`.

### 4.3 Error Handling Pattern
Each subsystem throws specific error classes from the marketplace error hierarchy. NotFound errors include the missing ID. LimitExceeded errors include the configured maximum. State errors include current and target states.

### 4.4 Filter Pattern
All `list()` methods accept an optional partial filter object. Multiple filters are combined with AND logic. Unspecified filter keys are ignored.

---

## 5. Security Considerations

### 5.1 Signature Verification
Package signatures use configurable algorithms (Ed25519, RSA256, HMAC256) with expiration dates. Revocation is supported. Verification status is tracked per-signature.

### 5.2 Sandbox Resource Limits
Default limits: 512MB memory, 50% CPU, 1024MB disk, 10 network connections, 60s execution. All configurable per-instance.

### 5.3 Permission Enforcement
Permissions are checked before capability execution. Sandbox violations emit events. The permission model is deny-by-default for dangerous operations.

---

## 6. Scalability Analysis

| Dimension | Default Limit | Notes |
|-----------|--------------|-------|
| Capabilities | 10,000 | Sufficient for early ecosystem |
| Packages | 50,000 | Supports multiple versions per capability |
| Concurrent installations | 5 | Conservative to prevent resource exhaustion |
| Sandbox instances | 100 | Limited by memory/CPU |
| Signatures | 100,000 | Accumulates over time |
| Compositions | 500 | Pipeline complexity grows exponentially |
| Publishers | 1,000 | Expected to grow slowly |

---

## 7. Trade-offs and Known Limitations

1. **No persistence**: All state is in-memory. A restart loses all marketplace state. This is acceptable for Stage IX — persistence will be added when the cloud catalog is implemented.

2. **No actual sandboxing**: The SandboxRuntime manages sandbox metadata and state but does not execute capabilities in an actual isolated process. Real sandboxing (e.g., Worker threads, VM2, Docker) is deferred to future stages.

3. **No cryptographic signing**: The SignatureEngine manages signature metadata but does not perform actual cryptographic operations. Real signing will use Web Crypto API.

4. **No network operations**: The MarketplaceRuntime is local-only. Cloud catalog integration, download, and upload are deferred to future stages.

5. **No real dependency resolution**: The DependencyResolver works with the dependency metadata in CapabilityEntry but does not download or resolve packages from external sources.

---

## 8. Evolution Path

- **Stage X**: Add persistence layer (SQLite or file-based)
- **Stage X+1**: Cloud catalog integration with authentication
- **Stage X+2**: Real cryptographic signing via Web Crypto API
- **Stage X+3**: Real sandbox execution via Worker threads
- **Stage X+4**: Marketplace UI for browsing and installing capabilities
- **Stage X+5**: Monetization and publisher revenue sharing
