/**
 * Lifecycle Manager Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Manages solution lifecycle state machine:
 *   Draft → Planned → Generated → Validated → Installed → Running
 *   any → Updating → Running
 *   Running → Deprecated → Archived
 * Creates SolutionState entries and LifecycleTransitionRecords.
 * Emits SolutionStateChangedEvent on every transition.
 */
import type { Timestamp, SemVer } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, SolutionState, LifecycleTransition,
  LifecycleTransitionRecord,
} from './types.js';
import { brandSolutionId, brandLifecycleEventId } from './types.js';
import { SolutionState as SState, LifecycleTransition as LTrans } from './types.js';
import type { ILifecycleManager } from './contracts.js';
import type { LifecycleManagerConfig } from './types.js';
import { LifecycleTransitionError, SolutionLimitExceededError, SolutionNotFoundError } from './errors.js';
import type { SolutionStateChangedEvent } from './events.js';

/** Valid state transitions: [fromState, transition] → toState */
const TRANSITIONS: ReadonlyMap<string, SolutionState> = (() => {
  const m = new Map<string, SolutionState>();

  // Normal forward flow
  m.set(`${SState.Draft}:${LTrans.Plan}`, SState.Planned);
  m.set(`${SState.Planned}:${LTrans.Generate}`, SState.Generated);
  m.set(`${SState.Generated}:${LTrans.Validate}`, SState.Validated);
  m.set(`${SState.Validated}:${LTrans.Install}`, SState.Installed);
  m.set(`${SState.Installed}:${LTrans.Start}`, SState.Running);

  // Update flow: any current state → Updating → Running
  for (const state of [SState.Draft, SState.Planned, SState.Generated, SState.Validated, SState.Installed, SState.Running] as const) {
    m.set(`${state}:${LTrans.Update}`, SState.Updating);
  }
  m.set(`${SState.Updating}:${LTrans.Start}`, SState.Running);

  // Deprecation & archival
  m.set(`${SState.Running}:${LTrans.Deprecate}`, SState.Deprecated);
  m.set(`${SState.Deprecated}:${LTrans.Archive}`, SState.Archived);

  // Rollback: any non-Archived state back to previous
  for (const state of [SState.Draft, SState.Planned, SState.Generated, SState.Validated, SState.Installed, SState.Running, SState.Updating, SState.Deprecated] as const) {
    m.set(`${state}:${LTrans.Rollback}`, SState.Draft);
  }

  return Object.freeze(m);
})();

export class LifecycleManager implements ILifecycleManager {
  private readonly config: LifecycleManagerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly states = new Map<string, SolutionState>();
  private readonly history = new Map<string, LifecycleTransitionRecord[]>();
  private transitionCounter = 0;

  constructor(config: LifecycleManagerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async create(name: string, version: SemVer, description: string): Promise<SolutionId> {
    if (this.states.size >= this.config.maxSolutions) {
      throw new SolutionLimitExceededError(this.config.maxSolutions);
    }

    const solutionId = brandSolutionId(crypto.randomUUID());
    const now: Timestamp = new Date().toISOString();

    // Initial state is Draft
    this.states.set(solutionId as string, SState.Draft);
    this.history.set(solutionId as string, []);

    // Create the initial creation record
    const record: LifecycleTransitionRecord = Object.freeze({
      id: brandLifecycleEventId(crypto.randomUUID()),
      solutionId,
      transition: LTrans.Create,
      fromState: SState.Draft,
      toState: SState.Draft,
      reason: `Solution created: ${name}@${version}`,
      timestamp: now,
      metadata: Object.freeze({ name, version, description }),
    });

    const records = this.history.get(solutionId as string)!;
    records.push(record);
    this.transitionCounter++;

    // Emit state changed event for creation
    const event: SolutionStateChangedEvent = Object.freeze({
      eventType: 'solution.state.changed',
      classification: EventClassification.StateChange,
      solutionId,
      fromState: SState.Draft,
      toState: SState.Draft,
      transition: LTrans.Create,
      timestamp: now,
      metadata: Object.freeze({ name, version }),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'Solution');

    return solutionId;
  }

  async transition(solutionId: SolutionId, transition: LifecycleTransition): Promise<LifecycleTransitionRecord> {
    const stateKey = solutionId as string;
    const currentState = this.states.get(stateKey);

    if (!currentState) {
      throw new SolutionNotFoundError(stateKey);
    }

    // Check transition limit
    if (this.transitionCounter >= this.config.maxTransitions) {
      throw new LifecycleTransitionError(stateKey, currentState, String(transition), {
        maxTransitions: this.config.maxTransitions,
      });
    }

    // Validate transition
    const lookupKey = `${currentState}:${transition}`;
    const targetState = TRANSITIONS.get(lookupKey);

    if (!targetState) {
      throw new LifecycleTransitionError(stateKey, currentState, String(transition));
    }

    const now: Timestamp = new Date().toISOString();
    const record: LifecycleTransitionRecord = Object.freeze({
      id: brandLifecycleEventId(crypto.randomUUID()),
      solutionId,
      transition,
      fromState: currentState,
      toState: targetState,
      reason: `Lifecycle transition: ${transition}`,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    // Update state
    this.states.set(stateKey, targetState);

    // Append to history
    const records = this.history.get(stateKey);
    if (records) {
      records.push(record);
    }
    this.transitionCounter++;

    // Emit event
    const event: SolutionStateChangedEvent = Object.freeze({
      eventType: 'solution.state.changed',
      classification: EventClassification.StateChange,
      solutionId,
      fromState: currentState,
      toState: targetState,
      transition,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, stateKey, 'Solution');

    return record;
  }

  async getState(solutionId: SolutionId): Promise<SolutionState | null> {
    return this.states.get(solutionId as string) ?? null;
  }

  async getHistory(solutionId: SolutionId): Promise<readonly LifecycleTransitionRecord[]> {
    const records = this.history.get(solutionId as string);
    if (!records) return Object.freeze([]);
    return Object.freeze([...records]);
  }

  async list(filter?: Partial<{ state: SolutionState }>): Promise<readonly SolutionId[]> {
    let entries = [...this.states.entries()];

    if (filter?.state !== undefined) {
      entries = entries.filter(([, s]) => s === filter.state);
    }

    return Object.freeze(entries.map(([key]) => key as unknown as SolutionId));
  }

  async count(): Promise<number> {
    return this.states.size;
  }

  // ─── Event Publishing ──────────────────────────────────────────────

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
