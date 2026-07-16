/** INT-011E: Scheduler — Engine */
import type {
  ScheduleEntry, ScheduleType, SchedulerConfig, SchedulerStatistics,
  DeadLetterEntry, TaskContext, TaskResult, SchedulerRetryPolicy,
} from './types.js';

const DEFAULT_CONFIG: SchedulerConfig = {
  maxConcurrentSchedules: 50,
  defaultRetryPolicy: { maxRetries: 3, backoffMs: 5000, deadLetterAfterMaxRetries: true },
  deadLetterQueueSize: 10000,
  tickIntervalMs: 1000,
  persistHistory: true,
};

export class SchedulerEngine {
  private config: SchedulerConfig;
  private schedules: Map<string, ScheduleEntry> = new Map();
  private running: Map<string, NodeJS.Timeout> = new Map();
  private deadLetterQueue: DeadLetterEntry[] = [];
  private stats = { total: 0, success: 0, failed: 0, totalDurationMs: 0 };
  private tickInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Start the scheduler */
  async start(): Promise<void> {
    this.tickInterval = setInterval(() => this.tick(), this.config.tickIntervalMs);
    // Start interval-based schedules
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) this.activateSchedule(schedule);
    }
  }

  /** Stop the scheduler */
  async stop(): Promise<void> {
    if (this.tickInterval) clearInterval(this.tickInterval);
    for (const [id, timer] of this.running) {
      clearInterval(timer);
      this.running.delete(id);
    }
  }

  /** Add a schedule */
  addSchedule(
    name: string,
    type: ScheduleType,
    task: ScheduleEntry['task'],
    options?: {
      cronExpression?: string;
      intervalMs?: number;
      executeAt?: Date;
      enabled?: boolean;
      retryPolicy?: Partial<SchedulerRetryPolicy>;
      maxConcurrent?: number;
      metadata?: Record<string, unknown>;
      tenantId?: string;
    },
  ): ScheduleEntry {
    const entry: ScheduleEntry = {
      id: crypto.randomUUID(),
      name,
      type,
      cronExpression: options?.cronExpression,
      intervalMs: options?.intervalMs,
      executeAt: options?.executeAt,
      task,
      enabled: options?.enabled ?? true,
      createdAt: new Date(),
      retryPolicy: { ...this.config.defaultRetryPolicy, ...options?.retryPolicy },
      maxConcurrent: options?.maxConcurrent ?? 1,
      metadata: options?.metadata ?? {},
    };

    this.schedules.set(entry.id, entry);
    if (entry.enabled) this.activateSchedule(entry);
    return entry;
  }

  /** Remove a schedule */
  removeSchedule(id: string): boolean {
    const timer = this.running.get(id);
    if (timer) { clearInterval(timer); this.running.delete(id); }
    return this.schedules.delete(id);
  }

  /** Enable/disable a schedule */
  toggleSchedule(id: string, enabled: boolean): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;
    schedule.enabled = enabled;
    if (enabled) {
      this.activateSchedule(schedule);
    } else {
      const timer = this.running.get(id);
      if (timer) { clearInterval(timer); this.running.delete(id); }
    }
    return true;
  }

  /** Get dead letter queue */
  getDeadLetterQueue(limit?: number): DeadLetterEntry[] {
    return limit ? this.deadLetterQueue.slice(-limit) : [...this.deadLetterQueue];
  }

  /** Retry a dead letter entry */
  async retryDeadLetter(deadLetterId: string): Promise<boolean> {
    const idx = this.deadLetterQueue.findIndex(d => d.id === deadLetterId);
    if (idx === -1) return false;
    const entry = this.deadLetterQueue[idx];

    const schedule = this.schedules.get(entry.scheduleId);
    if (!schedule) return false;

    const context: TaskContext = {
      scheduleId: schedule.id,
      executionId: crypto.randomUUID(),
      tenantId: schedule.metadata.tenantId as string | undefined,
      triggeredAt: new Date(),
      metadata: schedule.metadata,
    };

    try {
      await schedule.task.execute(context);
      this.deadLetterQueue.splice(idx, 1);
      return true;
    } catch {
      return false;
    }
  }

  /** Get statistics */
  getStatistics(): SchedulerStatistics {
    const byType: Record<ScheduleType, number> = { cron: 0, interval: 0, 'one-time': 0, 'periodic-scan': 0 };
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) byType[schedule.type]++;
    }
    return {
      activeSchedules: [...this.schedules.values()].filter(s => s.enabled).length,
      totalExecutions: this.stats.total,
      successfulExecutions: this.stats.success,
      failedExecutions: this.stats.failed,
      deadLetterCount: this.deadLetterQueue.length,
      byType,
      avgExecutionMs: this.stats.total > 0 ? this.stats.totalDurationMs / this.stats.total : 0,
    };
  }

  // --- Private ---

  private activateSchedule(schedule: ScheduleEntry): void {
    switch (schedule.type) {
      case 'interval':
      case 'periodic-scan':
        if (schedule.intervalMs) {
          const timer = setInterval(() => this.executeSchedule(schedule), schedule.intervalMs);
          this.running.set(schedule.id, timer);
          schedule.nextExecutionAt = new Date(Date.now() + schedule.intervalMs);
        }
        break;
      case 'one-time':
        if (schedule.executeAt) {
          const delay = schedule.executeAt.getTime() - Date.now();
          if (delay > 0) {
            const timer = setTimeout(() => {
              this.executeSchedule(schedule);
              this.running.delete(schedule.id);
            }, delay) as unknown as NodeJS.Timeout;
            this.running.set(schedule.id, timer);
            schedule.nextExecutionAt = schedule.executeAt;
          }
        }
        break;
      case 'cron':
        // Cron evaluation via tick
        schedule.nextExecutionAt = this.getNextCronExecution(schedule.cronExpression ?? '');
        break;
    }
  }

  private async executeSchedule(schedule: ScheduleEntry): Promise<void> {
    const context: TaskContext = {
      scheduleId: schedule.id,
      executionId: crypto.randomUUID(),
      tenantId: schedule.metadata.tenantId as string | undefined,
      triggeredAt: new Date(),
      metadata: schedule.metadata,
    };

    let attempts = 0;
    let lastError: string | undefined;

    while (attempts <= schedule.retryPolicy.maxRetries) {
      const start = Date.now();
      try {
        await schedule.task.execute(context);
        this.stats.total++;
        this.stats.success++;
        this.stats.totalDurationMs += Date.now() - start;
        schedule.lastExecutedAt = new Date();
        return;
      } catch (err) {
        lastError = (err as Error).message;
        attempts++;
        this.stats.total++;
        this.stats.failed++;
        this.stats.totalDurationMs += Date.now() - start;

        if (attempts <= schedule.retryPolicy.maxRetries) {
          await new Promise(r => setTimeout(r, schedule.retryPolicy.backoffMs * attempts));
        }
      }
    }

    // Dead letter
    if (schedule.retryPolicy.deadLetterAfterMaxRetries) {
      this.deadLetterQueue.push({
        id: crypto.randomUUID(),
        scheduleId: schedule.id,
        executionId: context.executionId,
        taskName: schedule.task.name,
        error: lastError ?? 'Unknown error',
        attempts,
        failedAt: new Date(),
        lastError: lastError ?? 'Unknown error',
      });

      // Enforce DLQ size
      if (this.deadLetterQueue.length > this.config.deadLetterQueueSize) {
        this.deadLetterQueue.shift();
      }
    }
  }

  private tick(): void {
    const now = new Date();
    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled || schedule.type !== 'cron') continue;
      if (schedule.nextExecutionAt && now >= schedule.nextExecutionAt) {
        this.executeSchedule(schedule);
        schedule.nextExecutionAt = this.getNextCronExecution(schedule.cronExpression ?? '');
      }
    }
  }

  private getNextCronExecution(_expression: string): Date {
    // Simplified: next minute. Production: use cron-parser library
    return new Date(Date.now() + 60000);
  }
}
