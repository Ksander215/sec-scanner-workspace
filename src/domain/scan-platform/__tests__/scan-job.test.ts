/**
 * Tests: Scan Job — State Machine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScanJob } from '../scan-job/scan-job.ts';
import { ScanJobStatus, ScanCapability, ScanTriggerType } from '../types/index.ts';
import { ScanJobTerminalError, InvalidJobTransitionError } from '../errors/scan-errors.ts';

function createJob(overrides?: Partial<{
  status: ScanJobStatus;
}>): ScanJob {
  return new ScanJob({
    id: 'job-1',
    correlationId: 'corr-1',
    targetId: 'target-1',
    targetUrl: 'https://example.com',
    targetName: 'Example',
    triggerType: ScanTriggerType.Manual,
    triggeredBy: 'user-1',
    requiredCapabilities: [ScanCapability.VulnerabilityDetection],
    profileName: 'Full Scan',
  });
}

describe('ScanJob', () => {
  describe('initial state', () => {
    it('should start in Pending status', () => {
      const job = createJob();
      expect(job.status).toBe(ScanJobStatus.Pending);
      expect(job.isTerminal).toBe(false);
      expect(job.durationMs).toBeNull();
      expect(job.findingsCount).toBe(0);
      expect(job.totalRequests).toBe(0);
    });
  });

  describe('start()', () => {
    it('should transition Pending → Running', () => {
      const job = createJob();
      job.start(['engine-1', 'engine-2']);
      expect(job.status).toBe(ScanJobStatus.Running);
      expect(job.startedAt).not.toBeNull();
      expect(job.engineIds).toEqual(['engine-1', 'engine-2']);
    });

    it('should initialize engine progress for each engine', () => {
      const job = createJob();
      job.start(['nuclei', 'zap']);
      expect(job.engineProgress.size).toBe(2);

      const nucleusProgress = job.engineProgress.get('nuclei');
      expect(nucleusProgress?.phase).toBe('initializing');
      expect(nucleusProgress?.progress).toBe(0);
      expect(nucleusProgress?.finished).toBe(false);
    });

    it('should throw for Completed → Running', () => {
      const job = createJob();
      job.start(['e1']);
      job.complete();
      expect(() => job.start(['e2'])).toThrow(ScanJobTerminalError);
    });

    it('should throw for Failed → Running', () => {
      const job = createJob();
      job.start(['e1']);
      job.fail('error');
      expect(() => job.start(['e2'])).toThrow(ScanJobTerminalError);
    });
  });

  describe('complete()', () => {
    it('should transition Running → Completed', () => {
      const job = createJob();
      job.start(['e1']);
      job.complete();
      expect(job.status).toBe(ScanJobStatus.Completed);
      expect(job.completedAt).not.toBeNull();
      expect(job.isTerminal).toBe(true);
      expect(job.overallProgress).toBe(100);
    });

    it('should throw for Pending → Completed', () => {
      const job = createJob();
      expect(() => job.complete()).toThrow(InvalidJobTransitionError);
    });

    it('should throw for Completed → Completed', () => {
      const job = createJob();
      job.start(['e1']);
      job.complete();
      expect(() => job.complete()).toThrow(ScanJobTerminalError);
    });
  });

  describe('fail()', () => {
    it('should transition Running → Failed with error details', () => {
      const job = createJob();
      job.start(['e1']);
      job.fail('Engine crashed', 'ENGINE_CRASH', true);
      expect(job.status).toBe(ScanJobStatus.Failed);
      expect(job.error).toBe('Engine crashed');
      expect(job.errorCode).toBe('ENGINE_CRASH');
      expect(job.retryable).toBe(true);
      expect(job.isTerminal).toBe(true);
    });

    it('should throw for Pending → Failed', () => {
      const job = createJob();
      expect(() => job.fail('err')).toThrow(InvalidJobTransitionError);
    });
  });

  describe('cancel()', () => {
    it('should transition Pending → Cancelled', () => {
      const job = createJob();
      job.cancel('User requested');
      expect(job.status).toBe(ScanJobStatus.Cancelled);
      expect(job.error).toBe('User requested');
    });

    it('should transition Running → Cancelled', () => {
      const job = createJob();
      job.start(['e1']);
      job.cancel('User requested');
      expect(job.status).toBe(ScanJobStatus.Cancelled);
    });

    it('should throw for Completed → Cancelled', () => {
      const job = createJob();
      job.start(['e1']);
      job.complete();
      expect(() => job.cancel()).toThrow(ScanJobTerminalError);
    });
  });

  describe('findings', () => {
    it('should track findings count', () => {
      const job = createJob();
      job.start(['e1']);
      job.addFindings([{
        id: 'f1', targetId: 't1', title: 'XSS', description: '', severity: 'high' as any,
        status: 'open' as any, location: {}, evidence: [], firstSeenAt: '', lastSeenAt: '',
        lastResolvedAt: null, resolutionCount: 0, confidence: 0.9, hash: 'h1',
        detectedBy: 'e1', scanJobId: 'j1', tags: [],
      }]);
      expect(job.findingsCount).toBe(1);
      expect(job.findingsBySeverity.high).toBe(1);
    });
  });

  describe('progress', () => {
    it('should update engine progress', () => {
      const job = createJob();
      job.start(['nuclei']);
      job.updateEngineProgress('nuclei', { phase: 'crawling', progress: 25 });
      expect(job.overallProgress).toBe(25);
      expect(job.overallPhase).toBe('crawling');
    });

    it('should compute average progress across engines', () => {
      const job = createJob();
      job.start(['e1', 'e2']);
      job.updateEngineProgress('e1', { progress: 50 });
      job.updateEngineProgress('e2', { progress: 100 });
      expect(job.overallProgress).toBe(75); // (50 + 100) / 2
    });

    it('should mark engine as finished', () => {
      const job = createJob();
      job.start(['e1']);
      job.markEngineFinished('e1');
      const progress = job.engineProgress.get('e1');
      expect(progress?.finished).toBe(true);
      expect(progress?.progress).toBe(100);
    });
  });

  describe('snapshot', () => {
    it('should create an immutable snapshot', () => {
      const job = createJob();
      job.start(['e1']);
      job.updateEngineProgress('e1', { progress: 50 });
      const snapshot = job.toSnapshot();

      expect(snapshot.id).toBe('job-1');
      expect(snapshot.status).toBe(ScanJobStatus.Running);
      expect(snapshot.overallProgress).toBe(50);
      expect(snapshot.isTerminal).toBe(false);

      // Snapshot should be frozen.
      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });

  describe('observers', () => {
    it('should notify on state change', () => {
      const job = createJob();
      const changes: string[] = [];
      job.onStateChange(() => changes.push(job.status));

      job.start(['e1']);
      job.complete();

      expect(changes).toEqual([ScanJobStatus.Running, ScanJobStatus.Completed]);
    });

    it('should allow unsubscribing', () => {
      const job = createJob();
      const changes: string[] = [];
      const unsub = job.onStateChange(() => changes.push(job.status));

      job.start(['e1']);
      unsub();
      job.complete();

      expect(changes).toEqual([ScanJobStatus.Running]);
    });

    it('should not break if observer throws', () => {
      const job = createJob();
      job.onStateChange(() => { throw new Error('observer error'); });
      expect(() => job.start(['e1'])).not.toThrow();
    });
  });

  describe('duration', () => {
    it('should return null before start', () => {
      const job = createJob();
      expect(job.durationMs).toBeNull();
    });

    it('should return positive duration after start', () => {
      const job = createJob();
      job.start(['e1']);
      expect(job.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});