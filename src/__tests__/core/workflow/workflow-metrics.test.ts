/**
 * Workflow Runtime — Metrics Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowMetricsCollector } from '../../../core/workflow/workflow-metrics.js';

describe('WorkflowMetricsCollector', () => {
  let metrics: WorkflowMetricsCollector;

  beforeEach(() => {
    metrics = new WorkflowMetricsCollector();
  });

  it('should start with zero values', () => {
    const m = metrics.getMetrics();
    expect(m.totalWorkflows).toBe(0);
    expect(m.runningWorkflows).toBe(0);
    expect(m.completedWorkflows).toBe(0);
    expect(m.failedWorkflows).toBe(0);
    expect(m.pausedWorkflows).toBe(0);
    expect(m.cancelledWorkflows).toBe(0);
    expect(m.successRate).toBe(0);
  });

  describe('Workflow counters', () => {
    it('should increment total workflows', () => {
      metrics.incrementTotalWorkflows();
      metrics.incrementTotalWorkflows();
      expect(metrics.getMetrics().totalWorkflows).toBe(2);
    });

    it('should track running workflows', () => {
      metrics.incrementRunning();
      expect(metrics.getMetrics().runningWorkflows).toBe(1);
      metrics.incrementRunning();
      expect(metrics.getMetrics().runningWorkflows).toBe(2);
      metrics.decrementRunning();
      expect(metrics.getMetrics().runningWorkflows).toBe(1);
    });

    it('should not go below zero', () => {
      metrics.decrementRunning();
      expect(metrics.getMetrics().runningWorkflows).toBe(0);
    });

    it('should track completed workflows', () => {
      metrics.incrementCompleted();
      expect(metrics.getMetrics().completedWorkflows).toBe(1);
    });

    it('should track failed workflows', () => {
      metrics.incrementFailed();
      expect(metrics.getMetrics().failedWorkflows).toBe(1);
    });

    it('should track paused workflows', () => {
      metrics.incrementPaused();
      metrics.incrementPaused();
      expect(metrics.getMetrics().pausedWorkflows).toBe(2);
      metrics.decrementPaused();
      expect(metrics.getMetrics().pausedWorkflows).toBe(1);
    });

    it('should track cancelled workflows', () => {
      metrics.incrementCancelled();
      expect(metrics.getMetrics().cancelledWorkflows).toBe(1);
    });
  });

  describe('Stage counters', () => {
    it('should track total stages', () => {
      metrics.incrementTotalStages();
      metrics.incrementTotalStages();
      expect(metrics.getMetrics().totalStages).toBe(2);
    });

    it('should track completed stages', () => {
      metrics.incrementCompletedStages();
      expect(metrics.getMetrics().completedStages).toBe(1);
    });

    it('should track failed stages', () => {
      metrics.incrementFailedStages();
      expect(metrics.getMetrics().failedStages).toBe(1);
    });
  });

  describe('Execution time', () => {
    it('should record execution time', () => {
      metrics.recordExecutionTime(100);
      metrics.recordExecutionTime(200);
      expect(metrics.getMetrics().totalExecutionTimeMs).toBe(300);
    });

    it('should calculate average execution time', () => {
      metrics.incrementCompleted();
      metrics.recordExecutionTime(100);
      expect(metrics.getMetrics().averageExecutionTimeMs).toBe(100);
      metrics.incrementCompleted();
      metrics.recordExecutionTime(300);
      expect(metrics.getMetrics().averageExecutionTimeMs).toBe(200);
    });

    it('should return 0 average when no completions', () => {
      metrics.recordExecutionTime(100);
      expect(metrics.getMetrics().averageExecutionTimeMs).toBe(0);
    });
  });

  describe('Retry and recovery', () => {
    it('should track retry count', () => {
      metrics.incrementRetryCount();
      metrics.incrementRetryCount();
      expect(metrics.getMetrics().totalRetryCount).toBe(2);
    });

    it('should track recovery count', () => {
      metrics.incrementRecoveryCount();
      expect(metrics.getMetrics().totalRecoveryCount).toBe(1);
    });

    it('should track checkpoint count', () => {
      metrics.incrementCheckpointCount();
      metrics.incrementCheckpointCount();
      expect(metrics.getMetrics().totalCheckpointCount).toBe(2);
    });

    it('should track events published', () => {
      metrics.incrementEventsPublished();
      expect(metrics.getMetrics().eventsPublished).toBe(1);
    });
  });

  describe('Success rate', () => {
    it('should calculate success rate', () => {
      metrics.incrementCompleted();
      metrics.incrementCompleted();
      metrics.incrementFailed();
      expect(metrics.getMetrics().successRate).toBe(67); // 2/3 = 66.6% rounded
    });

    it('should return 0 when no workflows finished', () => {
      metrics.incrementTotalWorkflows();
      expect(metrics.getMetrics().successRate).toBe(0);
    });

    it('should count cancelled in total finished', () => {
      metrics.incrementCompleted();
      metrics.incrementCancelled();
      expect(metrics.getMetrics().successRate).toBe(50);
    });
  });

  describe('Reset', () => {
    it('should reset all metrics to zero', () => {
      metrics.incrementTotalWorkflows();
      metrics.incrementRunning();
      metrics.incrementCompleted();
      metrics.incrementFailed();
      metrics.incrementPaused();
      metrics.incrementCancelled();
      metrics.incrementTotalStages();
      metrics.recordExecutionTime(100);

      metrics.reset();
      const m = metrics.getMetrics();
      expect(m.totalWorkflows).toBe(0);
      expect(m.runningWorkflows).toBe(0);
      expect(m.completedWorkflows).toBe(0);
    });
  });

  describe('Immutable metrics', () => {
    it('should return frozen objects', () => {
      const m = metrics.getMetrics();
      expect(Object.isFrozen(m)).toBe(true);
    });
  });
});
