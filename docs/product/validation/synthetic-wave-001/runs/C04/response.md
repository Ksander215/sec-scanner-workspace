# Architectural Boundaries and Interactions in src/core

## Main Architectural Boundaries

Based on the provided code and dependency graph, I can identify the following main architectural boundaries within src/core:

1. **Cognitive Subsystem** (confidence: 5)
   - Located in `src/core/cognitive/`
   - Key components: `CognitiveRuntime`, which orchestrates various cognitive operations
   - Depends on: `events`, `fsm`, `types`
   - Boundary: Clear separation of cognitive processing concerns from other subsystems

2. **Discovery Subsystem** (confidence: 5)
   - Located in `src/core/discovery/`
   - Key components: `DiscoveryPipelineService`
   - Depends on: `services`, `autonomous-architecture`
   - Boundary: Handles architectural discovery and analysis, separate from execution concerns

3. **Engine Subsystem** (confidence: 5)
   - Located in `src/core/engine/`
   - Key components: `ExecutionEngine`
   - Depends on: `runtime`, `zones`, `types`, `autonomous-architecture`, `cognitive`, `discovery`, `validation`, `config`
   - Boundary: Central orchestrator that coordinates between other subsystems

4. **Events Subsystem** (confidence: 4)
   - Located in `src/core/events/`
   - Key components: `InProcessEventBus`
   - Depends on: `domain`
   - Boundary: Provides decoupled communication between components

5. **FSM Subsystem** (confidence: 4)
   - Located in `src/core/fsm/`
   - Key components: `TypedStateMachine`
   - Depends on: No direct dependencies shown
   - Boundary: State management functionality

6. **Types Subsystem** (confidence: 5)
   - Located in `src/core/types/`
   - Key components: Various type definitions (not fully shown)
   - Depends on: No direct dependencies shown
   - Boundary: Shared type definitions across the system

## Subsystem Interactions

### Cognitive and Engine Interaction (confidence: 5)
The `ExecutionEngine` directly imports and uses `CognitiveRuntime`:
```typescript
import { CognitiveRuntime } from '../cognitive/cognitive-runtime.js';
```
The engine creates an instance of `CognitiveRuntime` and uses it for processing architecture questions when `AIS_EXECUTION_REAL` is true.

### Discovery and Engine Interaction (confidence: 5)
The `ExecutionEngine` imports and uses `DiscoveryPipelineService`:
```typescript
import { DiscoveryPipelineService } from '../discovery/discovery-pipeline.service.js';
```
This indicates the engine leverages discovery capabilities for architectural analysis.

### Cognitive and Events Interaction (confidence: 4)
The `CognitiveRuntime` depends on `EventBus`:
```typescript
import type { EventBus } from '../events/event-bus.js';
```
This suggests cognitive operations can publish or subscribe to events for decoupled communication.

### Cognitive and FSM Interaction (confidence: 4)
The `CognitiveRuntime` uses `TypedStateMachine`:
```typescript
private _fsm: StateMachine<CognitiveState>;
```
This indicates cognitive operations follow a state machine pattern.

### Types as a Shared Resource (confidence: 5)
The `types` module is widely used across multiple subsystems:
```typescript
import { AutonomyLevel, EngineState } from '../types/common.js';
```
This suggests types provide a common vocabulary and contract between subsystems.

## Consistency Patterns

1. **Service Pattern** (confidence: 4)
   - Both `DiscoveryPipelineService` and the general `Service` interface follow a consistent lifecycle pattern:
   ```typescript
   export interface Service {
     readonly name: string;
     initialize(): Promise<void>;
     start(): Promise<void>;
     stop(): Promise<void>;
     shutdown(): Promise<void>;
   }
   ```

2. **Event-Driven Communication** (confidence: 4)
   - The `InProcessEventBus` provides a consistent way for components to communicate:
   ```typescript
   async dispatch(envelope) {
     this.log.push(envelope);
     const handlers = this.handlers.get(envelope.eventType);
     if (!handlers) return;
     for (const handler of handlers) {
       try { await handler(envelope); } catch { }
     }
   }
   ```

3. **State Machine Pattern** (confidence: 4)
   - The `TypedStateMachine` provides consistent state management:
   ```typescript
   transition(to: S): void {
     const allowed = this._transitions.get(this._currentState);
     if (!allowed?.has(to)) throw new Error('Transition not allowed');
     this._currentState = to;
   }
   ```

4. **Dependency Injection** (confidence: 3)
   - The `ExecutionEngine` constructor accepts a config parameter and creates its dependencies internally:
   ```typescript
   constructor(config?) {
     this.runtime = new Runtime(fullConfig);
     this.trustZoneGate = new DefaultTrustZoneGate();
   }
   ```

The architecture shows clear boundaries between cognitive processing, discovery, and engine subsystems, with the engine serving as the central coordinator. The use of events, state machines, and a service pattern contributes to a consistent architectural approach across these boundaries.
