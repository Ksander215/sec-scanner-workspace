/**
 * AIS Execution Pipeline — Public API
 *
 * Conforms to: AIS-003B.000
 *   Goal → Plan → Task → Execute → Result → Finish
 */
export { ExecutionPipeline, type PipelineConfig } from './execution-pipeline.js';
export type { ExecutionRequest, ExecutionResult, Goal, Plan, Step, Task, TaskResult, TaskError } from './types.js';
export { TaskStatus, ExecutionStatus } from './types.js';
export type { CancellationToken } from './types.js';
export type { Variables, MemoryHandle } from './types.js';

export { CancellationTokenImpl } from './cancellation-token.js';

export { type Planner, makeStepId } from './planner/index.js';
export { DeterministicPlanner, type PlanTemplate } from './planner/index.js';

export { type TaskHandler, type TaskHandlerContext, TaskHandlerRegistry, EchoHandler, IdentityHandler, FailHandler, DelayHandler } from './executor/index.js';
export { type PlanExecutorOptions, PlanExecutorResult, PlanExecutor } from './executor/index.js';

export { type Scheduler, type SchedulerOptions, type ScheduledTask, FIFOScheduler } from './scheduler/index.js';

export { type RetryPolicy, type RetryDecision, NoRetryPolicy, FixedRetryPolicy, LimitedRetryPolicy, DEFAULT_RETRY_POLICY } from './recovery/index.js';
export { type RecoveryAction, type RecoveryDecision, type RecoveryPolicy, DefaultRecoveryPolicy } from './recovery/index.js';

export { ExecutionError, PlanningError, TaskExecutionError, TaskTimeoutError, TaskCancelledError, SchedulerError, InvalidTransitionError, PipelineAbortedError, EscalationError, toTaskError } from './errors.js';

export { ExecutionReport, ExecutionReportBuilder, type ExecutionMetrics, type StepReport } from './execution-report.js';

export {
  type GoalCreated, type PlanBuilt, type TaskStarted, type TaskFinished,
  type ExecutionCompleted, type ExecutionFailed, type ExecutionCancelled,
  type ExecutionRetried, type ExecutionStateChange, type PipelineEvent,
} from './events/index.js';

export { TraceCollector, TraceEntryType, type TraceEntry } from '../trace/index.js';

export { createExecutionFSM, type StateMachine, type FSMDefinition, type FSMTransition, TypedStateMachine } from '../fsm/index.js';
export type { TransitionHook } from '../fsm/index.js';
