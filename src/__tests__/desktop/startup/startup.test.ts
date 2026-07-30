import { describe, it, expect, beforeEach } from 'vitest';
import { StartupRuntime } from '../../../desktop/startup-runtime/startup-runtime.js';

describe('StartupRuntime', () => {
  let rt: StartupRuntime;
  beforeEach(async () => { rt = new StartupRuntime(); await rt.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(rt.name).toBe('StartupRuntime'); });
    it('should initialize', () => { expect(rt.initialized).toBe(true); });
    it('should start', async () => { await rt.start(); });
    it('should stop', async () => { await rt.stop(); });
    it('should shutdown', async () => { await rt.shutdown(); expect(rt.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof rt.initialize).toBe('function'); });
  });

  describe('registerStep', () => {
    it('should register a step', () => { rt.registerStep('s1', async () => {}); expect(rt.getStepCount()).toBe(1); });
    it('should register multiple steps', () => { rt.registerStep('s1', async () => {}); rt.registerStep('s2', async () => {}); expect(rt.getStepCount()).toBe(2); });
    it('should not overwrite — pushes duplicate', () => { rt.registerStep('s1', async () => {}); rt.registerStep('s1', async () => {}); expect(rt.getStepCount()).toBe(2); });
  });

  describe('runStartupSequence', () => {
    it('should run all steps', async () => { const o: string[] = []; rt.registerStep('a', async () => { o.push('a'); }); rt.registerStep('b', async () => { o.push('b'); }); await rt.runStartupSequence(); expect(o).toEqual(['a', 'b']); });
    it('should track completed steps', async () => { rt.registerStep('s1', async () => {}); rt.registerStep('s2', async () => {}); await rt.runStartupSequence(); expect(rt.getCompletedSteps().length).toBe(2); });
    it('should handle empty sequence', async () => { await rt.runStartupSequence(); expect(rt.getCompletedSteps().length).toBe(0); });
    it('should record duration', async () => { await rt.runStartupSequence(); expect(rt.getStartupDuration()).toBeGreaterThanOrEqual(0); });
  });

  describe('isStepCompleted', () => {
    it('should return false before run', () => { rt.registerStep('s1', async () => {}); expect(rt.isStepCompleted('s1')).toBe(false); });
    it('should return true after run', async () => { rt.registerStep('s1', async () => {}); await rt.runStartupSequence(); expect(rt.isStepCompleted('s1')).toBe(true); });
    it('should return false for non-existent', () => { expect(rt.isStepCompleted('nope')).toBe(false); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await rt.shutdown(); await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle double init', async () => { await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle step that throws', async () => { rt.registerStep('fail', async () => { throw new Error('fail'); }); await expect(rt.runStartupSequence()).rejects.toThrow('fail'); });
    it('should reset on new sequence', async () => { rt.registerStep('s1', async () => {}); await rt.runStartupSequence(); await rt.runStartupSequence(); expect(rt.getCompletedSteps().length).toBe(1); });
  });
});
