# CONTROL A04 — Architect — Independent Analysis

**Run ID:** A04
**Role:** Architect (10 years exp)
**Mode:** CONTROL A (independent, no LLM)
**Question:** Q1
**Repository Commit:** ab42c7a

## Key Findings

### Overall Pattern (Confidence: 5/5)
Bounded-Context Runtime Architecture with DDD principles and Event-Driven Coordination.
- Service interface (initialize/start/stop/shutdown)
- Runtime container (service registry + event bus)
- Domain model (DDD aggregates, entities, value objects)
- Contract interfaces for inter-runtime DI
- FSM framework reused by 6+ subsystems

### 21 Subsystems in 4 Tiers
- Tier 1: Engine (orchestrator), Runtime (infrastructure)
- Tier 2: Cognitive, AI Provider, Discovery, Pipeline, Workflow, Tool, Capability, Identity, Memory, Knowledge, Session
- Tier 3: Events, Domain, Contracts, Compliance, Evolution
- Tier 4: Experience, Personal, Personal Intelligence, Companion, Autonomous Architecture

### Interaction (Confidence: 5/5)
Strictly sequential pipeline in executeWave1Pipeline():
1. DiscoveryPipelineService.discover() → DiscoveryResult + ArchitectureGraph
2. buildProjectContext() → string context
3. CognitiveRuntime.process(question + context) → response
4. extractRelevantSources() → EvidenceSource[]
5. storeEvidence() → EvidenceRecord

### Coupling Analysis
- Engine→Discovery: Tight, direct instantiation, per-request
- Engine→Cognitive: Moderate, concrete class composition, singleton
- Discovery→Cognitive: ZERO
- Discovery→Autonomous-Architecture: Moderate
- Cognitive→external: Only events/ (type) and fsm/

### Architectural Decisions (from code comments)
- DR-01: Provider-Independent Core
- DR-02: Event-Driven Coordination
- DR-03: Single Memory Authority
- DR-10: Autonomy-Level Aware (L0-L4)
- DR-11: Audit-Log All Side Effects
- ADR-009: Autonomy Levels
- ADR-010: Trust Zones (Z0-Z4)

### Inconsistencies (Confidence: 4/5)
1. Discovery not a 'runtime' — instantiated ad-hoc, not in service registry
2. Dual ExecutionEngine (engine/ + ai-provider/)
3. Feature-flag coupling via shared env vars
4. Cognitive has own ProviderRuntime overlapping with ai-provider/

### Boundary Rationale
- Domain model separate (pure DDD, no runtime deps)
- Contracts separate (IC-01..IC-05)
- Events as cross-cutting infra
- FSM shared framework
- Autonomous Architecture generic graph

## Limitations
- ~30 key files read, not all
- No test files
- No transitive dependency graph
- companion/personal/personal-intelligence overlap not traced
- ai-provider↔cognitive/provider-runtime ambiguity unresolved
- Static analysis only
