/** Trace span */
export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  status: 'ok' | 'error';
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: Date;
  attributes: Record<string, string | number | boolean>;
}

/** Metric types */
export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  labels: string[];
}

export interface MetricSample {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
}

/** Log entry */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  traceId?: string;
  spanId?: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Observability config */
export interface ObservabilityConfig {
  tracing: { enabled: boolean; provider: string; endpoint: string; sampleRate: number };
  metrics: { enabled: boolean; provider: string; path: string };
  logging: { level: LogLevel; format: 'json' | 'text'; output: 'stdout' | 'file'; filePath: string };
}
