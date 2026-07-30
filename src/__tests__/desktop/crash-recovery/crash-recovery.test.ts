import { describe, it, expect, beforeEach } from 'vitest';
import { CrashRecoveryRuntime } from '../../../desktop/crash-recovery-runtime/crash-recovery-runtime.js';

describe('CrashRecoveryRuntime', () => {
  let cr: CrashRecoveryRuntime;
  beforeEach(async () => { cr = new CrashRecoveryRuntime(); await cr.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(cr.name).toBe('CrashRecoveryRuntime'); });
    it('should initialize', () => { expect(cr.initialized).toBe(true); });
    it('should start', async () => { await cr.start(); });
    it('should stop', async () => { await cr.stop(); });
    it('should shutdown', async () => { await cr.shutdown(); expect(cr.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof cr.initialize).toBe('function'); });
  });

  describe('snapshots', () => {
    it('should save snapshot', () => { cr.saveSnapshot('s1', { key: 'val' }); expect(cr.hasSnapshot('s1')).toBe(true); });
    it('should get snapshot', () => { cr.saveSnapshot('s1', { key: 'val' }); expect(cr.getSnapshot('s1')!.key).toBe('val'); });
    it('should return undefined for missing', () => { expect(cr.getSnapshot('nope')).toBeUndefined(); });
    it('should clone state', () => { const state = { a: 1 }; cr.saveSnapshot('s1', state); state.a = 2; expect(cr.getSnapshot('s1')!.a).toBe(1); });
    it('should inject savedAt', () => { cr.saveSnapshot('s1', {}); expect(cr.getSnapshot('s1')!.savedAt).toBeTruthy(); });
    it('should delete snapshot', () => { cr.saveSnapshot('s1', {}); expect(cr.deleteSnapshot('s1')).toBe(true); expect(cr.hasSnapshot('s1')).toBe(false); });
    it('should return false on delete non-existent', () => { expect(cr.deleteSnapshot('nope')).toBe(false); });
    it('should list snapshot ids', () => { cr.saveSnapshot('s1', {}); cr.saveSnapshot('s2', {}); expect(cr.getSnapshotIds().length).toBe(2); });
    it('should clear snapshots', () => { cr.saveSnapshot('s1', {}); cr.saveSnapshot('s2', {}); cr.clearSnapshots(); expect(cr.getSnapshotIds().length).toBe(0); });
    it('should overwrite existing snapshot', () => { cr.saveSnapshot('s1', { v: 1 }); cr.saveSnapshot('s1', { v: 2 }); expect(cr.getSnapshot('s1')!.v).toBe(2); });
  });

  describe('crash log', () => {
    it('should record crash', () => { cr.recordCrash('OOM', { mem: 'full' }); expect(cr.getCrashCount()).toBe(1); });
    it('should get last crash', () => { cr.recordCrash('err1', {}); cr.recordCrash('err2', {}); expect(cr.getLastCrash()!.reason).toBe('err2'); });
    it('should return undefined when no crashes', () => { expect(cr.getLastCrash()).toBeUndefined(); });
    it('should have timestamp', () => { cr.recordCrash('e', {}); expect(cr.getLastCrash()!.timestamp).toBeTruthy(); });
    it('should have state', () => { cr.recordCrash('e', { x: 1 }); expect(cr.getLastCrash()!.state.x).toBe(1); });
    it('should clear crash log', () => { cr.recordCrash('e', {}); cr.clearCrashLog(); expect(cr.getCrashCount()).toBe(0); });
  });

  describe('recovery flag', () => {
    it('should default to false', () => { expect(cr.lastCrashRecovered).toBe(false); });
    it('should set recovered', () => { cr.setCrashRecovered(true); expect(cr.lastCrashRecovered).toBe(true); });
    it('should unset recovered', () => { cr.setCrashRecovered(true); cr.setCrashRecovered(false); expect(cr.lastCrashRecovered).toBe(false); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await cr.shutdown(); await cr.initialize(); expect(cr.initialized).toBe(true); });
    it('should handle double init', async () => { await cr.initialize(); expect(cr.initialized).toBe(true); });
    it('should track multiple snapshots', () => { for (let i = 0; i < 50; i++) cr.saveSnapshot(`s${i}`, { i }); expect(cr.getSnapshotIds().length).toBe(50); });
  });
});
