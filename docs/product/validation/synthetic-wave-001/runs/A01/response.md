# CONTROL A01 — Developer — Independent Analysis

**Run ID:** A01
**Role:** Developer (3 years exp)
**Mode:** CONTROL A (independent, no LLM)
**Question:** Q1 — cognitive/discovery/engine boundaries and interaction
**Repository Commit:** ab42c7a
**Timestamp:** 2026-08-24

---

## Files Examined

| File | Purpose |
|------|--------|
| `src/core/index.ts` | Top-level barrel export |
| `src/core/engine/index.ts` | Engine barrel |
| `src/core/engine/execution-engine.ts` | ExecutionEngine class |
| `src/core/cognitive/index.ts` | Cognitive barrel (231 lines) |
| `src/core/cognitive/cognitive-runtime.ts` | CognitiveRuntime |
| `src/core/cognitive/types.ts` | All cognitive types (1024 lines) |
| `src/core/cognitive/context-builder.ts` | Context assembly |
| `src/core/cognitive/memory-bridge.ts` | Memory bridge |
| `src/core/discovery/discovery-types.ts` | Discovery output types |
| `src/core/discovery/discovery-pipeline.service.ts` | File system scanner |
| `src/core/runtime/runtime.ts` | Service registry, lifecycle |
| `src/core/services/service.ts` | Service interface |
| `src/core/pipeline/index.ts` | Pipeline barrel |
| `src/core/validation/evidence-types.ts` | Evidence types |
| `src/core/autonomous-architecture/index.ts` | Architecture graph barrel |

---

## Complete Subsystem Map

36 subdirectories identified. Key subsystems:
- **engine/** (3 files) — Top-level orchestrator, lifecycle, Wave 1 pipeline
- **cognitive/** (~20 files) — LLM conversation loop
- **discovery/** (2 files) — File-system project scanner
- **runtime/** (3 files) — Service registry, event bus, lifecycle
- **pipeline/** (~16 files) — Generic execution pipeline
- **events/** (5 files) — In-process event bus
- **fsm/** (3 files) — Typed state machine
- **ai-provider/** (~22 files) — AI provider infrastructure
- **domain/** (~18 files) — DDD entities, aggregates, value objects
- **autonomous-architecture/** (~21 files) — Architecture graph
- Plus 25 more subsystems (memory, knowledge, workflow, tool, capability, companion, etc.)

---

## Discovery Subsystem

**Boundary:** Minimal, self-contained. Only 2 files, no barrel export.

**What it does (Confidence: 5/5):**
- `DiscoveryPipelineService` implements `Service` interface
- Scans project directory using Node.js `fs` APIs
- Produces `DiscoveryResult` (files, modules, dependencies, entry points, config files, tech stack)
- Converts to `ArchitectureGraph` via `ArchitectureGraphBuilder`

**Dependencies:** `services/service.ts`, `autonomous-architecture/` (graph builder, graph, model), `discovery-types.ts`, `types/common.ts`

**Consumers:** ONLY `engine/execution-engine.ts`

---

## Cognitive Subsystem

**Boundary:** Large (~20 files), comprehensive barrel export (231 lines).

**What it does (Confidence: 5/5):**
Docstring: "central orchestrator that unifies all subsystems into a single Cognitive Loop: Intent → Context → Memory → Knowledge → Identity → Capability → Workflow → Tool → LLM → Execution → Response → Memory Update."

The `process()` method (lines 249-424):
1. Create/continue conversation
2. Classify intent
3. Add user message
4. Build cognitive context via ContextBuilder
5. Evaluate policies
6. Compose prompt
7. Plan response (Answer/Tool/Workflow/Clarification/Escalation/MemoryRecall)
8. Execute (for Answer: ProviderRuntime.generate())
9. Add assistant response
10. Record metrics
11. Bridge to memory

**Internal components:** IntentRuntime, ContextBuilder, ConversationRuntime, PromptComposer, ProviderRuntime, ModelRouter, ResponsePlanner, ContextCompressionRuntime, ConversationMemoryBridge, CognitivePolicyEngine, CognitiveMetricsCollector, CognitiveTrace

**Cross-subsystem integration:** 6 contract interfaces in types.ts (Memory, Knowledge, Identity, Workflow, Tool, Capability). Registered via register*Contract() methods. Currently NONE registered in Wave 1 pipeline.

**External dependencies:** Only `events/event-bus.js` (type) and `fsm/state-machine.js`

---

## Engine Subsystem

**Boundary:** Small (3 files). Entry point for entire platform.

**What it does (Confidence: 5/5):**
- 5-phase lifecycle: initialize() → start() → [execute()] → stop() → shutdown()
- Owns Runtime (service registry + event bus + lifecycle hooks)
- Owns TrustZoneGate
- Wave 1 pipeline: Request → Discovery → buildProjectContext() → CognitiveRuntime.process() → extractRelevantSources() → EvidenceStore → Response

**Direct imports:** runtime, config, zones, types, autonomous-architecture, discovery, cognitive, validation

---

## Interaction Topology

```
ExecutionEngine
  ├─ instantiates → DiscoveryPipelineService (per-request, not lifecycle-managed)
  │     └─ outputs → DiscoveryResult + ArchitectureGraph
  ├─ uses → buildProjectContext(question, discoveryResult, architectureGraph)
  │     └─ keyword extraction → graph node scoring → source excerpt reading
  ├─ calls → CognitiveRuntime.process(fullQuestion + projectContext)
  │     └─ Cognitive has NO awareness it's processing project data
  └─ calls → extractRelevantSources() → EvidenceStore.storeEvidence()
```

**Key findings (Confidence: 5/5):**
- Discovery and Cognitive are COMPLETELY INDEPENDENT — no cross-imports
- Engine is the SOLE integration point
- Engine builds project context as text string, prepends to question, passes to Cognitive
- Cognitive treats input as generic string
- No cognitive contracts registered in Wave 1

---

## Architectural Patterns

1. Barrel Exports (index.ts) — every subsystem except discovery
2. Service Lifecycle (initialize/start/stop/shutdown)
3. Branded Types for type safety
4. FSM-Based State Management (used by cognitive, pipeline, identity, workflow, capability)
5. Feature Flags (AIS_EXECUTION_REAL, AIS_REAL_LLM)
6. Immutable Data (Object.freeze())
7. Dependency Inversion (cognitive defines contracts, external subsystems implement)

## Limitations

- Non-key subsystems analyzed from directory listings only
- Bootstrap/wiring code in src/platform/ not examined
- ai-provider/ relationship to cognitive's ProviderRuntime not fully analyzed
