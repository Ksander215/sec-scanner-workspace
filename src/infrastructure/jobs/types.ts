export type JobStatus = 'queued' | 'running' | 'retry' | 'completed' | 'failed' | 'cancelled';
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Job<T = unknown> {
  id: string;
  type: string;
  payload: T;
  status: JobStatus;
  priority: JobPriority;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  nextRetryAt?: Date;
  result?: unknown;
  error?: string;
  progress: number;
  metadata: Record<string, unknown>;
}

export interface JobHandler<T = unknown> {
  type: string;
  handle(job: Job<T>): Promise<unknown>;
  onProgress?(job: Job<T>, progress: number): void;
}

export interface JobEngineConfig {
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
  cleanupInterval: number;
}

export interface JobStatistics {
  total: number;
  byStatus: Record<JobStatus, number>;
  byType: Record<string, number>;
  avgDurationMs: number;
  successRate: number;
}
