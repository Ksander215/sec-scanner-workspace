# Architectural Boundaries in src/core and Subsystem Interactions

Based on the provided context, I can identify several key architectural boundaries and subsystem interactions within the src/core module.

## Main Architectural Boundaries

### 1. Cognitive Subsystem Boundary
The cognitive subsystem (src/core/cognitive) forms a distinct boundary with clear responsibilities:
- Manages state through a finite state machine (`TypedStateMachine`)
- Handles intent recognition, context building, conversation management, and response planning
- Coordinates with various runtime components (intent, context, conversation, provider, etc.)
- Confidence: 5 (explicitly defined components and clear responsibilities)

### 2. Discovery Subsystem Boundary
The discovery subsystem (src/core/discovery) operates as a separate boundary:
- Implements a service interface (`DiscoveryPipelineService implements Service`)
- Manages architecture graph building and module boundary detection
- Handles file system operations for discovering components
- Confidence: 5 (clear service contract and implementation)

### 3. Engine Subsystem Boundary
The engine subsystem (src/core/engine) serves as the orchestrator:
- Coordinates between cognitive, discovery, and other subsystems
- Manages execution flow and trust zone boundaries
- Implements the main execution logic with conditional paths
- Confidence: 5 (central role in coordinating other subsystems)

### 4. Events Subsystem Boundary
The events subsystem (src/core/events) provides a communication backbone:
- Implements an event bus pattern (`InProcessEventBus`)
- Facilitates loose coupling between components
- Maintains a log of dispatched events
- Confidence: 4 (supports communication but limited details on usage)

### 5. Finite State Machine (FSM) Subsystem Boundary
The FSM subsystem (src/core/fsm) provides state management:
- Implements a generic typed state machine
- Enforces state transition rules
- Used by cognitive and other subsystems
- Confidence: 4 (clear implementation but limited context on usage patterns)

## Subsystem Interactions

### 1. Engine → Cognitive Interaction
The engine directly depends on and utilizes the cognitive runtime:
```typescript
// src/core/engine/execution-engine.ts
import { CognitiveRuntime } from '../cognitive/cognitive-runtime.js';
private _cognitiveRuntime: CognitiveRuntime | null = null;
```
This interaction allows the engine to delegate cognitive processing tasks to the specialized cognitive subsystem.
- Confidence: 5 (direct import and usage)

### 2. Engine → Discovery Interaction
The engine integrates with the discovery pipeline service:
```typescript
// src/core/engine/execution-engine.ts
import { DiscoveryPipelineService } from '../discovery/discovery-pipeline.service.js';
```
This enables the engine to leverage architecture discovery and module boundary analysis.
- Confidence: 5 (direct import and usage)

### 3. Cognitive → Events Interaction
The cognitive runtime depends on the event bus:
```typescript
// src/core/cognitive/cognitive-runtime.ts
import type { EventBus } from '../events/event-bus.js';
```
This allows cognitive components to publish and subscribe to events for communication.
- Confidence: 4 (import shown but usage details not provided)

### 4. Cognitive → FSM Interaction
The cognitive runtime uses a finite state machine:
```typescript
// src/core/cognitive/cognitive-runtime.ts
import { TypedStateMachine } from '../fsm/state-machine.js';
private _fsm: StateMachine<CognitiveState>;
```
This provides structured state management for cognitive processing.
- Confidence: 5 (explicit import and property declaration)

### 5. Discovery → Autonomous Architecture Interaction
The discovery service depends on autonomous architecture components:
```typescript
// src/core/discovery/discovery-pipeline.service.ts
import { ArchitectureGraphBuilder } from '../autonomous-architecture/services/architecture.graph-builder.js';
import { ArchitectureGraph } from '../autonomous-architecture/architecture.graph.js';
```
This enables discovery to analyze and build architecture models.
- Confidence: 5 (direct import and usage)

### 6. Shared Dependencies
Several subsystems share common dependencies:
- `types` module is widely used across cognitive, discovery, engine, events, and other subsystems
- `autonomous-architecture` is used by both discovery and engine
- This indicates a well-defined type system and architecture model shared across boundaries
- Confidence: 4 (clear dependency pattern but limited details on type definitions)

## Change Impact Analysis

### 1. Changes to Cognitive Runtime
- Would directly impact engine execution
- Might affect event flow patterns
- Could alter state management across the system
- Confidence: 4 (highly connected but some abstraction)

### 2. Changes to Discovery Pipeline
- Would impact architecture analysis capabilities
- Might affect engine's decision-making for architecture-related queries
- Could alter module boundary definitions
- Confidence: 5 (direct dependency from engine)

### 3. Changes to Event Bus
- Would impact all event-driven communications
- Particularly affect cognitive subsystem's internal communication
- Might alter cross-subsystem messaging patterns
- Confidence: 3 (broad impact but limited implementation details)

### 4. Changes to State Machine
- Would impact cognitive state management
- Might affect other subsystems using FSM
- Could alter transition logic across the system
- Confidence: 3 (used by multiple components but limited context)

The architecture demonstrates a well-structured system with clear boundaries between cognitive processing, discovery, and execution orchestration, supported by a shared event system and state management framework.
