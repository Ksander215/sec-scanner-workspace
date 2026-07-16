import type { Job, JobHandler, JobStatus, JobPriority, JobEngineConfig, JobStatistics } from './types.js';

export class JobEngine {
  private queue: Job[] = [];
  private handlers: Map<string, JobHandler> = new Map();
  private running: Map<string, Job> = new Map();
  private completed: Job[] = [];
  private config: JobEngineConfig;
  private processing = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<JobEngineConfig>) {
    this.config = {
      concurrency: 4,
      retryAttempts: 3,
      retryDelay: 5000,
      cleanupInterval: 60000,
      ...config,
    };
  }

  async start(): Promise<void> {
    this.processing = true;
    this.processQueue();
    this.cleanupInterval = setInterval(() => this.cleanup(), this.config.cleanupInterval);
  }

  async stop(): Promise<void> {
    this.processing = false;
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    // Wait for running jobs to complete (with timeout)
    const timeout = 10000;
    const start = Date.now();
    while (this.running.size > 0 && Date.now() - start < timeout) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  registerHandler(handler: JobHandler): void {
    this.handlers.set(handler.type, handler);
  }

  enqueue<T>(type: string, payload: T, options?: { priority?: JobPriority; maxAttempts?: number; metadata?: Record<string, unknown> }): string {
    const job: Job<T> = {
      id: crypto.randomUUID(),
      type,
      payload,
      status: 'queued',
      priority: options?.priority ?? 'normal',
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? this.config.retryAttempts,
      createdAt: new Date(),
      progress: 0,
      metadata: options?.metadata ?? {},
    };

    this.queue.push(job);
    this.sortQueue();
    this.processQueue();
    return job.id;
  }

  cancel(jobId: string): boolean {
    const queueIdx = this.queue.findIndex(j => j.id === jobId);
    if (queueIdx >= 0) {
      this.queue[queueIdx].status = 'cancelled';
      this.queue.splice(queueIdx, 1);
      return true;
    }
    const runningJob = this.running.get(jobId);
    if (runningJob) {
      runningJob.status = 'cancelled';
      return true;
    }
    return false;
  }

  getJob(jobId: string): Job | undefined {
    return this.queue.find(j => j.id === jobId) ??
           this.running.get(jobId) ??
           this.completed.find(j => j.id === jobId);
  }

  getStatistics(): JobStatistics {
    const byStatus: Record<JobStatus, number> = { queued: 0, running: 0, retry: 0, completed: 0, failed: 0, cancelled: 0 };
    const byType: Record<string, number> = {};
    let totalDuration = 0;
    let successCount = 0;
    let totalCount = 0;

    for (const list of [this.queue, [...this.running.values()], this.completed]) {
      for (const job of list) {
        byStatus[job.status] = (byStatus[job.status] ?? 0) + 1;
        byType[job.type] = (byType[job.type] ?? 0) + 1;
        totalCount++;
        if (job.status === 'completed') {
          successCount++;
          if (job.startedAt && job.completedAt) {
            totalDuration += job.completedAt.getTime() - job.startedAt.getTime();
          }
        }
      }
    }

    return {
      total: totalCount,
      byStatus,
      byType,
      avgDurationMs: successCount > 0 ? totalDuration / successCount : 0,
      successRate: totalCount > 0 ? successCount / totalCount : 0,
    };
  }

  private async processQueue(): Promise<void> {
    if (!this.processing) return;

    while (this.running.size < this.config.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()!;
      if (job.status === 'cancelled') continue;
      this.executeJob(job);
    }
  }

  private async executeJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'failed';
      job.error = `No handler registered for job type: ${job.type}`;
      this.completed.push(job);
      return;
    }

    job.status = 'running';
    job.startedAt = new Date();
    job.attempts++;
    this.running.set(job.id, job);

    try {
      job.result = await handler.handle(job);
      job.status = 'completed';
      job.completedAt = new Date();
      this.running.delete(job.id);
      this.completed.push(job);
    } catch (err) {
      this.running.delete(job.id);
      if (job.attempts < job.maxAttempts) {
        job.status = 'retry';
        job.nextRetryAt = new Date(Date.now() + this.config.retryDelay * job.attempts);
        this.queue.push(job);
        this.sortQueue();
      } else {
        job.status = 'failed';
        job.error = (err as Error).message;
        job.completedAt = new Date();
        this.completed.push(job);
      }
    }

    this.processQueue();
  }

  private sortQueue(): void {
    const priorityOrder: Record<JobPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    this.queue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  private cleanup(): void {
    const maxAge = 3600000; // 1 hour
    const now = Date.now();
    this.completed = this.completed.filter(j => j.completedAt && now - j.completedAt.getTime() < maxAge);
  }
}
