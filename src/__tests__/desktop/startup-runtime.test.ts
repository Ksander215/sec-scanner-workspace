import { describe, it, expect, beforeEach } from 'vitest';
import { StartupRuntime } from '../../desktop/startup-runtime/startup-runtime.js';

describe('StartupRuntime', () => {
  let rt: StartupRuntime;
  beforeEach(async () => { rt = new StartupRuntime(); await rt.initialize(); });

  describe('lifecycle', () => {
    it('should initialize', async () => { await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should have name', () => { expect(rt.name).toBe('StartupRuntime'); });
    it('should start', async () => { await rt.initialize(); await rt.start(); });
    it('should stop', async () => { await rt.initialize(); await rt.stop(); });
    it('should shutdown', async () => { await rt.initialize(); await rt.shutdown(); expect(rt.initialized).toBe(false); });
  });

  describe('methods', () => {
    it('register step', () => { rt.registerStep("s1", async () => {}); expect(rt.getStepCount()).toBe(1); });
    it('register multiple', () => { rt.registerStep("s1", async () => {}); rt.registerStep("s2", async () => {}); expect(rt.getStepCount()).toBe(2); });
    it('run sequence', () => { let ran = false; rt.registerStep("s1", async () => { ran = true; }); await rt.runStartupSequence(); expect(ran).toBe(true); });
    it('completed steps', () => { rt.registerStep("s1", async () => {}); rt.registerStep("s2", async () => {}); await rt.runStartupSequence(); expect(rt.getCompletedSteps().length).toBe(2); });
    it('startup duration', () => { await rt.runStartupSequence(); expect(rt.getStartupDuration()).toBeGreaterThanOrEqual(0); });
    it('step completed', () => { rt.registerStep("s1", async () => {}); await rt.runStartupSequence(); expect(rt.isStepCompleted("s1")).toBe(true); });
    it('step not completed before run', () => { rt.registerStep("s1", async () => {}); expect(rt.isStepCompleted("s1")).toBe(false); });
    it('empty sequence', () => { await rt.runStartupSequence(); expect(rt.getCompletedSteps().length).toBe(0); });
    it('steps in order', () => { const o: string[] = []; rt.registerStep("a", async () => { o.push("a"); }); rt.registerStep("b", async () => { o.push("b"); }); await rt.runStartupSequence(); expect(o).toEqual(["a","b"]); });
    it('step count', () => { rt.registerStep("a", async () => {}); expect(rt.getStepCount()).toBe(1); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await rt.shutdown(); await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle double init', async () => { await rt.initialize(); await rt.initialize(); expect(rt.initialized).toBe(true); });
  });
});
