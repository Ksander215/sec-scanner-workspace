/**
 * Universal AI Provider Runtime — Top-Level Metrics
 * TASK-AIS-006A.000
 *
 * Wraps engine metrics + runtime-level metrics (state, provider count, etc.)
 * into a single frozen snapshot.
 */

import type {
  AIProviderMetrics, AIProviderRuntimeState,
} from './types.js';

export interface MetricsSnapshot extends AIProviderMetrics {
  readonly runtimeState: AIProviderRuntimeState;
  readonly providerCount: number;
  readonly modelCount: number;
  readonly activeExecutions: number;
  readonly activeStreams: number;
  readonly timestamp: string;
}

export class Metrics {
  private readonly getEngineMetrics: () => AIProviderMetrics;

  constructor(
    getEngineMetrics: () => AIProviderMetrics,
  ) {
    this.getEngineMetrics = getEngineMetrics;
  }

  getSnapshot(
    runtimeState: AIProviderRuntimeState,
    providerCount: number,
    modelCount: number,
    activeExecutions: number,
    activeStreams: number,
  ): MetricsSnapshot {
    const engine = this.getEngineMetrics();

    return Object.freeze({
      ...engine,
      runtimeState,
      providerCount,
      modelCount,
      activeExecutions,
      activeStreams,
      timestamp: new Date().toISOString(),
    });
  }
}
