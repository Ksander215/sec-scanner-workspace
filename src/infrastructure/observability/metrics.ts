import type { MetricType, MetricDefinition, MetricSample } from './types.js';

export class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private definitions: Map<string, MetricDefinition> = new Map();
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
    this.registerDefaultMetrics();
  }

  register(definition: MetricDefinition): void {
    this.definitions.set(definition.name, definition);
    if (definition.type === 'counter') this.counters.set(definition.name, 0);
    if (definition.type === 'gauge') this.gauges.set(definition.name, 0);
    if (definition.type === 'histogram') this.histograms.set(definition.name, []);
  }

  increment(name: string, value = 1, labels?: Record<string, string>): void {
    if (!this.enabled) return;
    const current = this.counters.get(name) ?? 0;
    this.counters.set(name, current + value);
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.enabled) return;
    this.gauges.set(name, value);
  }

  observe(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.enabled) return;
    const bucket = this.histograms.get(name) ?? [];
    bucket.push(value);
    this.histograms.set(name, bucket);
  }

  /** Record timing (convenience for histograms) */
  timing(name: string, durationMs: number, labels?: Record<string, string>): void {
    this.observe(name, durationMs, labels);
  }

  /** Export metrics in Prometheus format */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const [name, def] of this.definitions) {
      lines.push(`# HELP ${name} ${def.description}`);
      lines.push(`# TYPE ${name} ${def.type}`);

      if (def.type === 'counter') {
        lines.push(`${name} ${this.counters.get(name) ?? 0}`);
      } else if (def.type === 'gauge') {
        lines.push(`${name} ${this.gauges.get(name) ?? 0}`);
      } else if (def.type === 'histogram') {
        const values = this.histograms.get(name) ?? [];
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          const count = values.length;
          lines.push(`${name}_count ${count}`);
          lines.push(`${name}_sum ${sum}`);
          lines.push(`${name}_bucket{le="0.01"} ${values.filter(v => v <= 0.01).length}`);
          lines.push(`${name}_bucket{le="0.05"} ${values.filter(v => v <= 0.05).length}`);
          lines.push(`${name}_bucket{le="0.1"} ${values.filter(v => v <= 0.1).length}`);
          lines.push(`${name}_bucket{le="0.5"} ${values.filter(v => v <= 0.5).length}`);
          lines.push(`${name}_bucket{le="1"} ${values.filter(v => v <= 1).length}`);
          lines.push(`${name}_bucket{le="5"} ${values.filter(v => v <= 5).length}`);
          lines.push(`${name}_bucket{le="10"} ${values.filter(v => v <= 10).length}`);
          lines.push(`${name}_bucket{le="+Inf"} ${count}`);
        }
      }
    }

    return lines.join('\n');
  }

  /** Get all samples as array */
  getSamples(): MetricSample[] {
    const samples: MetricSample[] = [];
    for (const [name, value] of this.counters) {
      samples.push({ name, value, labels: {}, timestamp: new Date() });
    }
    for (const [name, value] of this.gauges) {
      samples.push({ name, value, labels: {}, timestamp: new Date() });
    }
    return samples;
  }

  private registerDefaultMetrics(): void {
    this.register({ name: 'si_pipeline_duration_ms', type: 'histogram', description: 'Pipeline execution duration', labels: ['stage'] });
    this.register({ name: 'si_requests_total', type: 'counter', description: 'Total API requests', labels: ['method', 'path', 'status'] });
    this.register({ name: 'si_analysis_total', type: 'counter', description: 'Total analyses performed', labels: ['status'] });
    this.register({ name: 'si_findings_total', type: 'counter', description: 'Total findings processed', labels: ['severity'] });
    this.register({ name: 'si_cache_hits_total', type: 'counter', description: 'Cache hit count', labels: [] });
    this.register({ name: 'si_cache_misses_total', type: 'counter', description: 'Cache miss count', labels: [] });
    this.register({ name: 'si_active_jobs', type: 'gauge', description: 'Currently active background jobs', labels: [] });
  }
}
