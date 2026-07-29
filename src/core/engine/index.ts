export { ExecutionEngine } from './execution-engine.js';
export type { EngineConfig } from '../config/engine-config.js';
export { EngineState, AutonomyLevel } from '../types/common.js';

// Execution Pipeline
export {
  ExecutionPipeline,
  type PipelineConfig,
  type ExecutionRequest,
  type ExecutionResult,
  CancellationTokenImpl,
} from '../pipeline/index.js';
export type {
  Goal, Plan, Step, Task, TaskResult, TaskError,
  CancellationToken, Variables, MemoryHandle,
  Planner, PlanTemplate,
  TaskHandler, TaskHandlerContext,
  RetryPolicy, RetryDecision,
  RecoveryAction, RecoveryDecision, RecoveryPolicy,
  Scheduler, SchedulerOptions, ScheduledTask,
  PipelineEvent,
  ExecutionMetrics, StepReport,
  FSMDefinition, FSMTransition, TransitionHook,
  StateMachine,
} from '../pipeline/index.js';
export {
  TaskStatus, ExecutionStatus,
  NoRetryPolicy, FixedRetryPolicy, LimitedRetryPolicy, DEFAULT_RETRY_POLICY,
  DefaultRecoveryPolicy,
  DeterministicPlanner,
  TaskHandlerRegistry, EchoHandler, IdentityHandler, FailHandler, DelayHandler,
  PlanExecutor,
  FIFOScheduler,
  ExecutionError, PlanningError, TaskExecutionError, TaskTimeoutError,
  TaskCancelledError, SchedulerError, InvalidTransitionError,
  PipelineAbortedError, EscalationError, toTaskError,
  ExecutionReport, ExecutionReportBuilder,
  TraceCollector, TraceEntryType,
  createExecutionFSM, TypedStateMachine,
  type GoalCreated, type PlanBuilt, type TaskStarted, type TaskFinished,
  type ExecutionCompleted, type ExecutionFailed, type ExecutionCancelled,
  type ExecutionRetried, type ExecutionStateChange,
  type TraceEntry,
} from '../pipeline/index.js';
