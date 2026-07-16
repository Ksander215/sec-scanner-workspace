/** INT-011E: Scheduler — Types */

export type ScheduleType = 'cron' | 'interval' | 'one-time' | 'periodic-scan';

export interface ScheduleEntry {
  id: string;
  name: string;
  type: ScheduleType;
  /** Cron expression (for cron type) */
  cronExpression?: string;
  /** Interval in ms (for interval/periodic-scan type) */
  intervalMs?: number;
  /** Execution time (for one-time type) */
  executeAt?: Date;
  /** The task to execute */
  task: ScheduledTask;
  /** Whether the schedule is active */
  enabled: boolean;
  /** Created timestamp */
  createdAt: Date;
  /** Last execution */
  lastExecutedAt?: Date;
  /** Next execution time */
  nextExecutionAt?: Date;
  /** Retry policy */
  retryPolicy: SchedulerRetryPolicy;
  /** Maximum concurrent executions */
  maxConcurrent: number;
  /** Metadata */
  metadata: Record<string, unknown>;
}

export interface ScheduledTask {
  name: string;
  execute(context: TaskContext): Promise<TaskResult>;
}

export interface TaskContext {
  scheduleId: string;
  executionId: string;
  tenantId?: string;
  triggeredAt: Date;
  metadata: Record<string, unknown>;
}

export interface TaskResult {
  status: 'success' | 'failure' | 'skipped';
  output?: unknown;
  error?: string;
  durationMs: number;
}

export interface SchedulerRetryPolicy {
  maxRetries: number;
  backoffMs: number;
  deadLetterAfterMaxRetries: boolean;
}

export interface DeadLetterEntry {
  id: string;
  scheduleId: string;
  executionId: string;
  taskName: string;
  error: string;
  attempts: number;
  failedAt: Date;
  lastError: string;
  payload?: unknown;
}

export interface SchedulerConfig {
  maxConcurrentSchedules: number;
  defaultRetryPolicy: SchedulerRetryPolicy;
  deadLetterQueueSize: number;
  tickIntervalMs: number;
  persistHistory: boolean;
}

export interface SchedulerStatistics {
  activeSchedules: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  deadLetterCount: number;
  byType: Record<ScheduleType, number>;
  avgExecutionMs: number;
}
