/**
 * Tool Metrics Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolMetricsCollector } from '../core/tool/metrics.js';
import { ToolLifecycleState } from '../core/tool/types.js';

describe('ToolMetricsCollector', () => {
  let collector: ToolMetricsCollector;

  beforeEach(() => {
    collector = new ToolMetricsCollector();
  });

  it('should record a successful execution', () => {
    collector.record({
      toolName: 'test-tool',
      executionId: 'exec-1',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:01Z',
      durationMs: 1000,
      status: ToolLifecycleState.Completed,
      attempt: 1,
    });

    expect(collector.count).toBe(1);
    const summary = collector.getSummary();
    expect(summary.totalExecutions).toBe(1);
    expect(summary.successfulExecutions).toBe(1);
    expect(summary.failedExecutions).toBe(0);
    expect(summary.totalDurationMs).toBe(1000);
    expect(summary.averageDurationMs).toBe(1000);
  });

  it('should record a failed execution', () => {
    collector.record({
      toolName: 'fail-tool',
      executionId: 'exec-2',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:00.5Z',
      durationMs: 500,
      status: ToolLifecycleState.Failed,
      attempt: 1,
      error: { code: 'ERROR', message: 'failed', retryable: false },
    });

    const summary = collector.getSummary();
    expect(summary.failedExecutions).toBe(1);
    expect(summary.successfulExecutions).toBe(0);
  });

  it('should record a timeout', () => {
    collector.record({
      toolName: 'slow-tool',
      executionId: 'exec-3',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:10Z',
      durationMs: 10000,
      status: ToolLifecycleState.Failed,
      attempt: 1,
      timedOut: true,
    });

    const summary = collector.getSummary();
    expect(summary.timedOutExecutions).toBe(1);
  });

  it('should aggregate across tools', () => {
    collector.record({
      toolName: 'tool-a',
      executionId: 'exec-1',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:01Z',
      durationMs: 1000,
      status: ToolLifecycleState.Completed,
      attempt: 1,
    });
    collector.record({
      toolName: 'tool-b',
      executionId: 'exec-2',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:00.5Z',
      durationMs: 500,
      status: ToolLifecycleState.Completed,
      attempt: 1,
    });

    const summary = collector.getSummary();
    expect(summary.totalExecutions).toBe(2);
    expect(summary.successfulExecutions).toBe(2);
    expect(summary.averageDurationMs).toBe(750);
    expect(summary.registeredToolCount).toBe(2);
  });

  it('should get per-tool stats', () => {
    collector.record({
      toolName: 'tool-a',
      executionId: 'exec-1',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:01Z',
      durationMs: 1000,
      status: ToolLifecycleState.Completed,
      attempt: 1,
    });

    const stats = collector.getToolStats('tool-a');
    expect(stats).toBeDefined();
    expect(stats!.totalExecutions).toBe(1);
    expect(stats!.successfulExecutions).toBe(1);
    expect(stats!.totalDurationMs).toBe(1000);
  });

  it('should return undefined for unknown tool stats', () => {
    expect(collector.getToolStats('nonexistent')).toBeUndefined();
  });

  it('should return all metrics', () => {
    collector.record({
      toolName: 'tool-a',
      executionId: 'exec-1',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:01Z',
      durationMs: 1000,
      status: ToolLifecycleState.Completed,
      attempt: 1,
    });

    const all = collector.getAllMetrics();
    expect(all).toHaveLength(1);
    expect(all[0].toolName).toBe('tool-a');
  });

  it('should clear', () => {
    collector.record({
      toolName: 'tool-a',
      executionId: 'exec-1',
      startedAt: '2026-01-01T00:00:00Z',
      durationMs: 100,
      status: ToolLifecycleState.Completed,
      attempt: 1,
    });
    collector.clear();
    expect(collector.count).toBe(0);
    expect(collector.getSummary().totalExecutions).toBe(0);
  });

  it('should handle empty metrics summary', () => {
    const summary = collector.getSummary();
    expect(summary.totalExecutions).toBe(0);
    expect(summary.averageDurationMs).toBe(0);
  });
});
