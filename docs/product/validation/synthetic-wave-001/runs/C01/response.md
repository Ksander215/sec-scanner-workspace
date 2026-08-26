# Architectural Boundaries and Subsystem Interactions in src/core

Based on the provided code excerpts and dependency graph, I'll analyze the main architectural boundaries inside src/core and how the cognitive, discovery, and engine subsystems interact.

## Main Architectural Boundaries

### 1. Core Module Boundaries
The system is organized into several clear modules with distinct responsibilities:

- **engine** (`src/core/engine/`): The main execution orchestrator
- **cognitive** (`src/core/cognitive/`): Handles AI/ML processing and reasoning
- **discovery** (`src/core/discovery/`): Manages system discovery and architecture mapping
- **events** (`src/core/events/`): Provides event bus functionality
- **fsm** (`src/core/fsm/`): Implements finite state machine logic
- **types** (`src/core/types/`): Defines shared type definitions
- **services** (`src/core/services/`): Base service interface
- **runtime** (`src/core/runtime/`): Runtime environment management
- **zones** (`src/core/zones/`): Trust zone management
- **validation** (`src/core/validation/`): Evidence validation
- **config** (`src/core/config/`): Configuration management
- **autonomous-architecture** (`src/core/autonomous-architecture/`): Architecture modeling

### 2. Key Dependencies and Boundaries

The `types` module serves as a shared dependency across most other modules:
```typescript
// From dependency graph: types is used by cognitive, discovery, engine, events, pipeline, autonomous-architecture, zones, services
```

This suggests that types form a foundational boundary that other modules depend on but don't modify, following the dependency inversion principle.

The `engine` module has the most dependencies:
```typescript
// From dependency graph: engine depends on runtime, zones, types, autonomous-architecture, cognitive, discovery, validation, config
```

This indicates the engine acts as an orchestrator that coordinates between various subsystems.

## Subsystem Interactions

### 1. Engine Subsystem

The `ExecutionEngine` class in `src/core/engine/execution-engine.ts` is the central coordinator:

```typescript
export class ExecutionEngine {
  private runtime: Runtime;
  private trustZoneGate: TrustZoneGate;
  private _state = EngineState.Uninitialized;
  private _cognitiveRuntime: CognitiveRuntime | null = null;
  
  constructor(config?) {
    const fullConfig = { ...DefaultEngineConfig, ...config };
    this.runtime = new Runtime(fullConfig);
    this.trustZoneGate = new DefaultTrustZoneGate();
  }
  
  async execute<T>(request: unknown): Promise<T> {
    if (process.env.AIS_EXECUTION_REAL === 'true' && this.isArchitectureQuestion(request)) {
      return await this.executeWave1Pipeline(request) as unknown as T;
    }
    return {} as T;
  }
}
```

The engine directly instantiates and coordinates with:
- `Runtime` from the runtime module
- `TrustZoneGate` from the zones module
- `CognitiveRuntime` from the cognitive module
- `DiscoveryPipelineService` from the discovery module

### 2. Cognitive Subsystem

The `CognitiveRuntime` class in `src/core/cognitive/cognitive-runtime.ts` manages AI/ML processing:

```typescript
export class CognitiveRuntime {
  private _config;
  private readonly _fsm: StateMachine<CognitiveState>;
  private readonly _intentRuntime: IntentRuntime;
  private readonly _contextBuilder: ContextBuilder;
  private readonly _conversationRuntime: ConversationRuntime;
  private readonly _promptComposer: PromptComposer;
  private readonly _providerRuntime: ProviderRuntime;
  // ... other components
}
```

The cognitive subsystem depends on:
- `EventBus` from the events module (for event-driven communication)
- `TypedStateMachine` from the fsm module (for state management)
- Various internal cognitive components

### 3. Discovery Subsystem

The `DiscoveryPipelineService` in `src/core/discovery/discovery-pipeline.service.ts` handles system discovery:

```typescript
export class DiscoveryPipelineService implements Service {
  readonly name = 'discovery-pipeline';
  private _config: DiscoveryConfig;
  private _started = false;
  
  constructor(config?) { 
    this._config = { ...DefaultDiscoveryConfig, ...config }; 
  }
  
  async initialize() { 
    statSync(this._config.rootPath); 
  }
  
  async start() { 
    this._started = true; 
  }
}
```

The discovery subsystem depends on:
- `Service` interface from the services module
- Architecture graph components from the autonomous-architecture module

## Interaction Patterns

### 1. Engine as Orchestrator

The engine coordinates between cognitive and discovery subsystems:

```typescript
// From execution-engine.ts
import { DiscoveryPipelineService } from '../discovery/discovery-pipeline.service.js';
import { CognitiveRuntime } from '../cognitive/cognitive-runtime.js';
```

The engine uses both subsystems in its execution pipeline:
```typescript
async execute<T>(request: unknown): Promise<T> {
  if (process.env.AIS_EXECUTION_REAL === 'true' && this.isArchitectureQuestion(request)) {
    return await this.executeWave1Pipeline(request) as unknown as T;
  }
  return {} as T;
}
```

### 2. Event-Driven Communication

The cognitive subsystem uses the event bus for communication:
```typescript
// From cognitive-runtime.ts
import type { EventBus } from '../events/event-bus.js';
```

The `InProcessEventBus` in `src/core/events/event-bus.ts` provides a centralized event mechanism:
```typescript
export class InProcessEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private log: EventEnvelope[] = [];
  
  async dispatch(envelope: EventEnvelope): Promise<void> {
    this.log.push(envelope);
    const handlers = this.handlers.get(envelope.eventType);
    if (handlers) {
      for (const handler of handlers) {
        try { await handler(envelope); } catch { /* subscriber isolation */ }
      }
    }
  }
}
```

### 3. State Management

The cognitive subsystem uses a finite state machine:
```typescript
// From cognitive-runtime.ts
private readonly _fsm: StateMachine<CognitiveState>;
```

The `TypedStateMachine` in `src/core/fsm/state-machine.ts` provides state management:
```typescript
export class TypedStateMachine<S extends string> implements StateMachine<S> {
  private _currentState: S;
  private readonly _transitions: ReadonlyMap<string, ReadonlySet<S>>;
  
  constructor(definition: FSMDefinition<S>) {
    this._currentState = definition.initialState;
  }
  
  transition(to: S): void {
    const allowed = this._transitions.get(this._currentState);
    if (allowed?.has(to)) {
      this._currentState = to;
    } else {
      throw new Error('Transition not allowed');
    }
  }
}
```

## Confidence Assessment

1. **Engine as orchestrator**: Confidence 5 - Direct evidence from execution-engine.ts showing engine imports and uses both cognitive and discovery subsystems.

2. **Event-driven communication**: Confidence 4 - Evidence from cognitive-runtime.ts importing EventBus and event-bus.ts implementation, though we don't see actual usage patterns.

3. **State management in cognitive**: Confidence 5 - Direct evidence from cognitive-runtime.ts showing use of TypedStateMachine.

4. **Discovery service implementation**: Confidence 4 - Evidence from discovery-pipeline.service.ts showing it implements Service interface, but limited visibility into its full functionality.

5. **Type system as shared foundation**: Confidence 5 - Clear dependency graph showing types used by almost all other modules.

The analysis is limited by the provided code excerpts, which don't show all interaction details between subsystems, particularly the exact flow of control during execution.
