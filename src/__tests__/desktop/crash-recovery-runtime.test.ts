import { describe, it, expect, beforeEach } from 'vitest';
import { CrashRecoveryRuntime } from '../../desktop/crash-recovery-runtime/crash-recovery-runtime.js';

describe('CrashRecoveryRuntime', () => {
  let rt: CrashRecoveryRuntime;
  beforeEach(async () => { rt = new CrashRecoveryRuntime(); await rt.initialize(); });

  describe('lifecycle', () => {
    it('should initialize', async () => { await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should have name', () => { expect(rt.name).toBe('CrashRecoveryRuntime'); });
    it('should start', async () => { await rt.initialize(); await rt.start(); });
    it('should stop', async () => { await rt.initialize(); await rt.stop(); });
    it('should shutdown', async () => { await rt.initialize(); await rt.shutdown(); expect(rt.initialized).toBe(false); });
  });

  describe('methods', () => {
    it('save and get snapshot', () => { rt.saveSnapshot("s1", {data:42}); expect(rt.getSnapshot("s1")?.data).toBe(42); });
    it('has snapshot', () => { rt.saveSnapshot("s1", {}); expect(rt.hasSnapshot("s1")).toBe(true); expect(rt.hasSnapshot("m")).toBe(false); });
    it('delete snapshot', () => { rt.saveSnapshot("s1", {}); expect(rt.deleteSnapshot("s1")).toBe(true); });
    it('get missing', () => { expect(rt.getSnapshot("m")).toBeUndefined(); });
    it('snapshot IDs', () => { rt.saveSnapshot("a", {}); rt.saveSnapshot("b", {}); expect(rt.getSnapshotIds().length).toBe(2); });
    it('record crash', () => { rt.recordCrash("oom", {mem:"full"}); expect(rt.getCrashCount()).toBe(1); });
    it('get last crash', () => { rt.recordCrash("err", {}); const c = rt.getLastCrash(); expect(c?.reason).toBe("err"); });
    it('crash recovered flag', () => { expect(rt.lastCrashRecovered).toBe(false); rt.setCrashRecovered(true); expect(rt.lastCrashRecovered).toBe(true); });
    it('clear crash log', () => { rt.recordCrash("a", {}); rt.clearCrashLog(); expect(rt.getCrashCount()).toBe(0); });
    it('clear snapshots', () => { rt.saveSnapshot("a", {}); rt.clearSnapshots(); expect(rt.getSnapshotIds().length).toBe(0); });
    it('snapshot preserves data', () => { rt.saveSnapshot("s", {x:[1,2,3],y:"test"}); const s = rt.getSnapshot("s"); expect(s?.x).toEqual([1,2,3]); });
    it('multiple crashes', () => { rt.recordCrash("a", {}); rt.recordCrash("b", {}); expect(rt.getCrashCount()).toBe(2); });
    it('empty crash log', () => { expect(rt.getCrashCount()).toBe(0); });
    it('no last crash initially', () => { expect(rt.getLastCrash()).toBeUndefined(); });
    it('delete non-existent snapshot', () => { expect(rt.deleteSnapshot("m")).toBe(false); });
    it('overwrite snapshot', () => { rt.saveSnapshot("s", {v:1}); rt.saveSnapshot("s", {v:2}); expect(rt.getSnapshot("s")?.v).toBe(2); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await rt.shutdown(); await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle double init', async () => { await rt.initialize(); await rt.initialize(); expect(rt.initialized).toBe(true); });
  });
});
