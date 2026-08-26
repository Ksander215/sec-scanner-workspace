# CONTROL A02 — Senior Developer — Independent Analysis

**Run ID:** A02
**Role:** Senior Developer (7 years exp)
**Mode:** CONTROL A (independent, no LLM)
**Question:** Q1 — cognitive/discovery/engine boundaries and interaction
**Repository Commit:** ab42c7a
**Timestamp:** 2026-08-24

---

## Files Examined

- All files in src/core/engine/, src/core/cognitive/, src/core/discovery/
- src/core/runtime/runtime.ts, src/core/services/service.ts
- src/core/ai-provider/ai-provider-runtime.ts
- src/core/companion/companion-runtime.ts
- src/core/events/event-bus.ts, src/core/fsm/state-machine.ts
- Import cross-references verified via grep across all src/core/*.ts

---

## Top-Level Boundaries

35+ subdirectories. Grouped into:

### Group A — Infrastructure Layer
- events/, fsm/, types/, domain/, services/, runtime/, config/, zones/, contracts/, trace/
- Shared by all subsystems. Service interface (4 methods) is universal lifecycle contract.

### Group B — Engine Layer
- engine/ (3 files) — top-level orchestrator
- pipeline/ (~16 files) — goal→plan→task execution

### Group C — Cognitive Subsystem
- cognitive/ (~20 files) — intent→context→prompt→LLM→response loop

### Group D — Discovery Subsystem
- discovery/ (2 files) — file scanner → DiscoveryResult + ArchitectureGraph

### Group E — Independent Runtime Subsystems (20+ modules)
- ai-provider/, companion/, memory/, knowledge/, identity/, capability/, workflow/, tool/, compliance/, evolution/, experience/, personal/, personal-intelligence/, autonomous-architecture/, session/, recovery/, context/, plugins/, validation/

---

## Critical Finding: Engine is the SOLE Integration Point

**Confidence: 5/5** — Verified by exhaustive import search.

`engine/execution-engine.ts` is the ONLY file in src/core/ that imports from both cognitive/ and discovery/.

```
DISCOVERY ──has NO import──→ COGNITIVE
COGNITIVE ──has NO import──→ DISCOVERY
COGNITIVE ──has NO import──→ ENGINE
DISCOVERY ──has NO import──→ ENGINE
```

---

## Wave 1 Request Flow

```
1. ExecutionEngine.execute(request)
   if AIS_EXECUTION_REAL=true AND isArchitectureQuestion:
     2. DISCOVERY: new DiscoveryPipelineService() → .discover() → DiscoveryResult + ArchitectureGraph
     3. CONTEXT: buildProjectContext(question, discoveryResult, architectureGraph)
        → keyword extraction → graph node scoring → source excerpt reading
     4. COGNITIVE: CognitiveRuntime.process(fullQuestion + projectContext)
        → IntentRuntime → ContextBuilder → PolicyEngine → PromptComposer
        → ResponsePlanner → ProviderRuntime.generate()
     5. EVIDENCE: extractRelevantSources() → EvidenceStore.storeEvidence()
```

---

## Discovery → Autonomous-Architecture Dependency

`discovery-pipeline.service.ts` imports concrete classes from `autonomous-architecture/`:
- ArchitectureGraphBuilder, ArchitectureGraph, ArchitectureNodeKind, ArchitectureEdgeKind, ArchitectureLayerKind

Discovery calls builder.build() to convert DiscoveryResult into ArchitectureGraph.

**Confidence: 5/5**

---

## Cognitive Contract Pattern

6 contract interfaces in `cognitive/types.ts` (lines 957-1007):
- MemoryRuntimeContract, KnowledgeRuntimeContract, IdentityRuntimeContract
- WorkflowRuntimeContract, ToolRuntimeContract, CapabilityRuntimeContract

Registered via register*Contract() methods on CognitiveRuntime.

**CRITICAL: In Wave 1, NO contracts are registered.** CognitiveRuntime runs in degraded mode with all-null context from memory/knowledge/identity/capability.

**Confidence: 5/5**

---

## Cognitive External Dependencies

Only 2 external imports:
1. `../events/event-bus.js` — EventBus type
2. `../fsm/state-machine.js` — TypedStateMachine

All other imports internal to cognitive/.

**Confidence: 5/5**

---

## Tight Coupling & Hidden Dependencies

### 1. Engine ↔ Cognitive: Tight (Medium severity)
Direct concrete class import. Not interface-based.

### 2. Engine ↔ Discovery: Inline instantiation (Low-Medium)
DiscoveryPipelineService instantiated inline in executeWave1Pipeline(), not from service registry. No lifecycle management (stop/shutdown never called).

### 3. Engine Bypasses Event Bus (Medium-High)
Wave 1 pipeline uses synchronous method calls, not events. Contradicts DR-02 (Event-Driven Coordination).

### 4. Context Building Split (High)
Project context built in Engine (~180 lines), cognitive context built in Cognitive. Two separate paths that never merge. PromptComposer only sees cognitive ContextBuilder output.

### 5. Contracts Unwired (High)
CognitiveRuntime created/started but no register*Contract() calls. Full cognitive loop non-functional.

### 6. Two Parallel LLM Systems
- cognitive/provider-runtime.ts (ProviderAdapter interface)
- ai-provider/ (ProviderSDK interface)
- Independent, no bridge between them.

---

## Change Impact Analysis

| Module Changed | What Breaks | Confidence |
|---|---|---|
| execution-engine.ts constructor | External consumers | 5/5 |
| cognitive-runtime.ts constructor | engine/execution-engine.ts | 5/5 |
| cognitive/types.ts contracts | context-builder, memory-bridge, compression, external registrants | 5/5 |
| discovery-pipeline .discover() return shape | engine (destructures discovery + architectureGraph) | 5/5 |
| discovery-types.ts | engine (uses modules, files, techStack, dependencies) | 5/5 |
| architecture.graph.ts API | engine (nodes, getNeighbors) + discovery (builder.build) | 5/5 |
| event-bus.ts | Nearly every subsystem | 5/5 |
| fsm/state-machine.ts | cognitive, pipeline, identity, workflow, capability, experience | 5/5 |
| types/common.ts | All 35+ modules | 5/5 |

---

## Summary

1. Clean directory-level boundaries with strong internal cohesion
2. Engine is a God-class integration point
3. Discovery and Cognitive properly isolated (zero cross-imports)
4. Contract pattern sound but unwired in Wave 1
5. Two parallel LLM systems with no bridge
6. Event-driven coordination aspirational, not implemented for cross-subsystem
