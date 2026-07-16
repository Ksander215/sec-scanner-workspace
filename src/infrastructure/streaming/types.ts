/** INT-011H: Streaming — Types */

export type StreamStatus = 'creating' | 'running' | 'paused' | 'error' | 'stopped';

export interface StreamProcessor<TInput = unknown, TOutput = unknown> {
  name: string;
  process(input: TInput): Promise<TOutput>;
}

export interface StreamPipeline {
  id: string;
  name: string;
  status: StreamStatus;
  stages: StreamStage[];
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
}

export interface StreamStage {
  name: string;
  processor: StreamProcessor;
  parallelism: number;
  batchSize: number;
  flushIntervalMs: number;
}

export interface StreamMessage {
  id: string;
  pipelineId: string;
  stage: string;
  key?: string;
  payload: unknown;
  timestamp: Date;
  offset: number;
  metadata: Record<string, unknown>;
}

export interface StreamSink {
  name: string;
  write(messages: StreamMessage[]): Promise<WriteResult>;
}

export interface WriteResult {
  success: boolean;
  writtenCount: number;
  error?: string;
}

export interface StreamSource {
  name: string;
  read(options?: { maxMessages?: number; timeoutMs?: number }): AsyncIterable<StreamMessage>;
  commit(offset: number): Promise<void>;
}

export interface StreamingConfig {
  defaultBatchSize: number;
  defaultFlushIntervalMs: number;
  maxInFlight: number;
  backpressureThreshold: number;
  retryPolicy: StreamRetryPolicy;
}

export interface StreamRetryPolicy {
  maxRetries: number;
  backoffMs: number;
  deadLetterAfterMax: boolean;
}

export interface StreamingStatistics {
  pipelines: number;
  messagesProcessed: number;
  messagesPerSecond: number;
  avgLatencyMs: number;
  byPipeline: Record<string, { processed: number; errors: number; avgLatencyMs: number }>;
}
