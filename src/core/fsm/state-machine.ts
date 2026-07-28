/**
 * Finite State Machine — Generic framework for AIS FSMs.
 *
 * Provides type-safe, validated state transitions with event hooks.
 * Used by:
 * - ExecutionFSM (AIS-003B.000)
 * - Potentially future entity FSMs
 *
 * Conforms to: DOM-002.000 §4 (FSM Definitions)
 *
 * Design:
 * - Transitions are declared upfront; any undeclared transition throws.
 * - Transition hooks (before/after) allow side effects (logging, events).
 * - State history is recorded for audit (AL-012).
 */
export type TransitionHook<S> = (from: S, to: S) => void | Promise<void>;

export interface FSMTransition<S> {
  readonly from: S;
  readonly to: S;
}

export interface FSMDefinition<S extends string> {
  readonly initialState: S;
  readonly transitions: readonly FSMTransition<S>[];
  /** States that are terminal (no transitions out). */
  readonly terminalStates?: readonly S[];
}

export interface StateMachine<S extends string> {
  /** Current state. */
  readonly currentState: S;
  /** Transition to a new state. Throws if transition is not allowed. */
  transition(to: S): void;
  /** Check if a transition is allowed. */
  canTransition(to: S): boolean;
  /** Register hook called BEFORE each successful transition. */
  onBeforeTransition(hook: TransitionHook<S>): void;
  /** Register hook called AFTER each successful transition. */
  onAfterTransition(hook: TransitionHook<S>): void;
  /** Get state history (oldest first). */
  getHistory(): readonly { state: S; timestamp: string }[];
  /** Whether the current state is terminal. */
  readonly isTerminal: boolean;
}

export class TypedStateMachine<S extends string> implements StateMachine<S> {
  private _currentState: S;
  private readonly _transitions: ReadonlyMap<string, ReadonlySet<S>>;
  private readonly _terminalStates: ReadonlySet<S>;
  private readonly _beforeHooks: Array<TransitionHook<S>> = [];
  private readonly _afterHooks: Array<TransitionHook<S>> = [];
  private readonly _history: Array<{ state: S; timestamp: string }> = [];

  constructor(definition: FSMDefinition<S>) {
    this._currentState = definition.initialState;

    // Build allowed transitions lookup: from → Set<to>
    const transitionMap = new Map<string, Set<S>>();
    for (const t of definition.transitions) {
      if (!transitionMap.has(t.from)) {
        transitionMap.set(t.from, new Set());
      }
      transitionMap.get(t.from)!.add(t.to);
    }
    this._transitions = transitionMap;
    this._terminalStates = new Set(definition.terminalStates ?? []);

    // Record initial state
    this._history.push({ state: this._currentState, timestamp: new Date().toISOString() });
  }

  get currentState(): S { return this._currentState; }

  get isTerminal(): boolean { return this._terminalStates.has(this._currentState); }

  canTransition(to: S): boolean {
    if (this._terminalStates.has(this._currentState)) return false;
    const allowed = this._transitions.get(this._currentState);
    return allowed?.has(to) ?? false;
  }

  transition(to: S): void {
    if (this._terminalStates.has(this._currentState)) {
      throw new Error(
        `Cannot transition from terminal state '${this._currentState}' to '${to}'`,
      );
    }
    const allowed = this._transitions.get(this._currentState);
    if (!allowed?.has(to)) {
      throw new Error(
        `Transition '${this._currentState}' → '${to}' is not allowed. ` +
        `Allowed: [${allowed ? Array.from(allowed).join(', ') : 'none'}]`,
      );
    }

    const from = this._currentState;

    // Run before hooks
    for (const hook of this._beforeHooks) {
      try { hook(from, to); } catch { /* hooks must not break FSM */ }
    }

    this._currentState = to;
    this._history.push({ state: this._currentState, timestamp: new Date().toISOString() });

    // Run after hooks
    for (const hook of this._afterHooks) {
      try { hook(from, to); } catch { /* hooks must not break FSM */ }
    }
  }

  onBeforeTransition(hook: TransitionHook<S>): void { this._beforeHooks.push(hook); }
  onAfterTransition(hook: TransitionHook<S>): void { this._afterHooks.push(hook); }

  getHistory(): readonly { state: S; timestamp: string }[] {
    return this._history;
  }
}
