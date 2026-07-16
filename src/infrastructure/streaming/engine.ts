/** INT-011H: Streaming — Engine */
import type {
  StreamProcessor, StreamPipeline, StreamStage, StreamMessage,
  StreamingConfig, StreamingStatistics, StreamStatus,
} from './types.js';

const DEFAULT_CONFIG: StreamingConfig = {
  defaultBatchSize: 100,
  defaultFlushIntervalMs: 1000,
  maxInFlight: 1000,
  backpressureThreshold: 10000,
  retryPolicy: { maxRetries: 3, backoffMs: 1000, deadLetterAfterMax: true },
};

export class StreamingEngine {
  private config: StreamingConfig;
  private pipelines: Map<string, StreamPipeline> = new Map();
  private sources: Map<string, { pipelineId: string; generator: AsyncIterable<StreamMessage> }> = new Map();
  private sinks: Map<string, { pipelineId: string; sink: (messages: StreamMessage[]) => Promise<void> }> = new Map();
  private stats = { totalProcessed: 0, totalErrors: 0, _totalLatency: 0, _startTime: Date.now() };
  private running = false;

  constructor(config?: Partial<StreamingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Create a streaming pipeline */
  createPipeline(
    name: string,
    stages: Array<{ processor: StreamProcessor; parallelism?: number; batchSize?: number; flushIntervalMs?: number }>,
  ): StreamPipeline {
    const pipeline: StreamPipeline = {
      id: crypto.randomUUID(),
      name,
      status: 'creating',
      stages: stages.map(s => ({
        name: s.processor.name,
        processor: s.processor,
        parallelism: s.parallelism ?? 1,
        batchSize: s.batchSize ?? this.config.defaultBatchSize,
        flushIntervalMs: s.flushIntervalMs ?? this.config.defaultFlushIntervalMs,
      })),
      createdAt: new Date(),
    };

    this.pipelines.set(pipeline.id, pipeline);
    return pipeline;
  }

  /** Start a pipeline with a source */
  async startPipeline(
    pipelineId: string,
    source: AsyncIterable<StreamMessage>,
    sink?: (messages: StreamMessage[]) => Promise<void>,
  ): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);

    pipeline.status = 'running';
    pipeline.startedAt = new Date();
    this.running = true;

    // Process messages from source through stages
    (async () => {
      try {
        for await (const message of source) {
          if (!this.running || pipeline.status !== 'running') break;

          let currentMessage = message;
          const start = Date.now();

          for (const stage of pipeline.stages) {
            try {
              const result = await stage.processor.process(currentMessage.payload);
              currentMessage = {
                ...currentMessage,
                payload: result,
                stage: stage.name,
                offset: currentMessage.offset + 1,
              };
            } catch (err) {
              this.stats.totalErrors++;
              break;
            }
          }

          const latency = Date.now() - start;
          this.stats.totalProcessed++;
          this.stats._totalLatency += latency;

          // Write to sink
          if (sink) {
            await sink([currentMessage]);
          }
        }
      } catch {
        pipeline.status = 'error';
      }
    })();
  }

  /** Stop a pipeline */
  async stopPipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (pipeline) {
      pipeline.status = 'stopped';
      pipeline.stoppedAt = new Date();
    }
    this.running = false;
  }

  /** Process a batch of messages through a pipeline */
  async processBatch(
    pipelineId: string,
    messages: StreamMessage[],
  ): Promise<StreamMessage[]> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);

    const results: StreamMessage[] = [];

    for (const message of messages) {
      let current = message;
      for (const stage of pipeline.stages) {
        try {
          const output = await stage.processor.process(current.payload);
          current = { ...current, payload: output, stage: stage.name, offset: current.offset + 1 };
        } catch {
          this.stats.totalErrors++;
          break;
        }
      }
      results.push(current);
      this.stats.totalProcessed++;
    }

    return results;
  }

  /** Get pipeline status */
  getPipelineStatus(pipelineId: string): StreamStatus | undefined {
    return this.pipelines.get(pipelineId)?.status;
  }

  /** Get all pipelines */
  getPipelines(): StreamPipeline[] {
    return [...this.pipelines.values()];
  }

  /** Get statistics */
  getStatistics(): StreamingStatistics {
    const elapsed = (Date.now() - this.stats._startTime) / 1000;
    return {
      pipelines: this.pipelines.size,
      messagesProcessed: this.stats.totalProcessed,
      messagesPerSecond: elapsed > 0 ? this.stats.totalProcessed / elapsed : 0,
      avgLatencyMs: this.stats.totalProcessed > 0 ? this.stats._totalLatency / this.stats.totalProcessed : 0,
      byPipeline: Object.fromEntries(
        [...this.pipelines.values()].map(p => [p.id, { processed: 0, errors: 0, avgLatencyMs: 0 }]),
      ),
    };
  }
}
