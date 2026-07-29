import { describe, it, expect } from 'vitest';
import { ExecutionReportBuilder } from '../core/pipeline/execution-report.js';
import { ExecutionStatus, TaskStatus } from '../core/pipeline/types.js';

describe('ExecutionReportBuilder', () => {
  it('builds empty report with defaults', () => {
    const report = new ExecutionReportBuilder().build();
    expect(report.executionId).toBe('');
    expect(report.goalId).toBe('');
    expect(report.status).toBe(ExecutionStatus.Idle);
    expect(report.metrics.totalSteps).toBe(0);
    expect(report.metrics.succeededCount).toBe(0);
  });

  it('builds report with execution metadata', () => {
    const builder = new ExecutionReportBuilder()
      .setExecution('exec-1', 'goal-1', 'plan-1')
      .setStatus(ExecutionStatus.Completed)
      .setTiming('2025-01-01T00:00:00Z', '2025-01-01T00:00:05Z');

    const report = builder.build();
    expect(report.executionId).toBe('exec-1');
    expect(report.goalId).toBe('goal-1');
    expect(report.planId).toBe('plan-1');
    expect(report.status).toBe(ExecutionStatus.Completed);
    expect(report.durationMs).toBe(5000);
  });

  it('adds step reports', () => {
    const stepError = { code: 'E', message: 'err', retryable: false };
    const builder = new ExecutionReportBuilder()
      .setExecution('e1', 'g1', 'p1')
      .addStep({ stepName: 's1', taskType: 'echo', status: 'succeeded' as any, attempts: 1, durationMs: 10 })
      .addStep({ stepName: 's2', taskType: 'fail', status: 'failed' as any, attempts: 1, durationMs: 5, error: stepError })
      .addError(stepError);

    const report = builder.build();
    expect(report.steps).toHaveLength(2);
    expect(report.metrics.succeededCount).toBe(1);
    expect(report.metrics.failedCount).toBe(1);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].code).toBe('E');
  });

  it('counts skipped and cancelled steps', () => {
    const builder = new ExecutionReportBuilder()
      .addStep({ stepName: 's1', taskType: 'echo', status: 'succeeded' as any, attempts: 1, durationMs: 0 })
      .addStep({ stepName: 's2', taskType: 'echo', status: 'skipped' as any, attempts: 0, durationMs: 0 })
      .addStep({ stepName: 's3', taskType: 'echo', status: 'cancelled' as any, attempts: 0, durationMs: 0 });

    const report = builder.build();
    expect(report.metrics.succeededCount).toBe(1);
    expect(report.metrics.skippedCount).toBe(1);
    expect(report.metrics.cancelledCount).toBe(1);
  });

  it('calculates total retries', () => {
    const builder = new ExecutionReportBuilder()
      .addStep({ stepName: 's1', taskType: 'echo', status: 'succeeded' as any, attempts: 3, durationMs: 100 })
      .addStep({ stepName: 's2', taskType: 'echo', status: 'succeeded' as any, attempts: 1, durationMs: 50 });

    const report = builder.build();
    expect(report.metrics.totalRetries).toBe(2); // step1: 3-1=2, step2: 1-1=0
  });

  it('calculates totalTaskDurationMs', () => {
    const builder = new ExecutionReportBuilder()
      .addStep({ stepName: 's1', taskType: 'echo', status: 'succeeded' as any, attempts: 1, durationMs: 100 })
      .addStep({ stepName: 's2', taskType: 'echo', status: 'succeeded' as any, attempts: 1, durationMs: 200 });

    const report = builder.build();
    expect(report.metrics.totalTaskDurationMs).toBe(300);
  });

  it('adds trace entries', () => {
    const builder = new ExecutionReportBuilder()
      .setExecution('e1', 'g1', 'p1')
      .addTraceEntries([
        { type: 'info' as any, timestamp: 't1', message: 'started' },
        { type: 'info' as any, timestamp: 't2', message: 'finished' },
      ]);

    const report = builder.build();
    expect(report.traceEntries).toHaveLength(2);
  });

  it('sets variables', () => {
    const builder = new ExecutionReportBuilder()
      .setVariables({ key1: 'value1', key2: 42 });
    const report = builder.build();
    expect(report.variables.key1).toBe('value1');
    expect(report.variables.key2).toBe(42);
  });

  it('sets eventsPublished', () => {
    const builder = new ExecutionReportBuilder()
      .setEventsPublished(15);
    const report = builder.build();
    expect(report.eventsPublished).toBe(15);
  });

  it('builder is chainable', () => {
    const report = new ExecutionReportBuilder()
      .setExecution('e', 'g', 'p')
      .setStatus(ExecutionStatus.Completed)
      .setTiming('t1', 't2')
      .setEventsPublished(5)
      .build();
    expect(report.executionId).toBe('e');
    expect(report.eventsPublished).toBe(5);
  });
});
