import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRuntime } from '../../../desktop/settings-runtime/settings-runtime.js';

describe('SettingsRuntime', () => {
  let st: SettingsRuntime;
  beforeEach(async () => { st = new SettingsRuntime(); await st.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(st.name).toBe('SettingsRuntime'); });
    it('should initialize', () => { expect(st.initialized).toBe(true); });
    it('should start', async () => { await st.start(); });
    it('should stop', async () => { await st.stop(); });
    it('should shutdown', async () => { await st.shutdown(); expect(st.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof st.initialize).toBe('function'); });
  });

  describe('defaults', () => {
    it('should register default', () => { st.registerDefault('theme', 'dark'); expect(st.getDefaults().get('theme')).toBe('dark'); });
    it('should return default when no user value', () => { st.registerDefault('theme', 'dark'); expect(st.get('theme')).toBe('dark'); });
    it('should return undefined for unknown key', () => { expect(st.get('nope')).toBeUndefined(); });
    it('should register multiple defaults', () => { st.registerDefault('a', 1); st.registerDefault('b', 2); expect(st.getDefaults().size).toBe(2); });
  });

  describe('get/set', () => {
    it('should set and get value', () => { st.set('k', 'v'); expect(st.get('k')).toBe('v'); });
    it('should override default', () => { st.registerDefault('theme', 'dark'); st.set('theme', 'light'); expect(st.get('theme')).toBe('light'); });
    it('should get generic type', () => { st.set('k', 42); const v: number = st.get<number>('k')!; expect(v).toBe(42); });
    it('should set object', () => { st.set('cfg', { a: 1 }); expect(st.get('cfg').a).toBe(1); });
  });

  describe('has', () => {
    it('should return true for user-set value', () => { st.set('k', 'v'); expect(st.has('k')).toBe(true); });
    it('should return false for default-only', () => { st.registerDefault('k', 'v'); expect(st.has('k')).toBe(false); });
    it('should return false for unknown', () => { expect(st.has('nope')).toBe(false); });
  });

  describe('delete', () => {
    it('should delete user value', () => { st.set('k', 'v'); expect(st.delete('k')).toBe(true); expect(st.has('k')).toBe(false); });
    it('should return false for missing', () => { expect(st.delete('nope')).toBe(false); });
    it('should fall back to default after delete', () => { st.registerDefault('k', 'default'); st.set('k', 'user'); st.delete('k'); expect(st.get('k')).toBe('default'); });
  });

  describe('getAll', () => {
    it('should return user settings', () => { st.set('a', 1); st.set('b', 2); expect(st.getAll().size).toBe(2); });
    it('should not include defaults', () => { st.registerDefault('d', 1); st.set('a', 2); expect(st.getAll().size).toBe(1); });
  });

  describe('clear', () => {
    it('should clear user settings', () => { st.set('a', 1); st.set('b', 2); st.clear(); expect(st.getAll().size).toBe(0); });
    it('should not clear defaults', () => { st.registerDefault('d', 1); st.set('a', 2); st.clear(); expect(st.get('d')).toBe(1); });
  });

  describe('export/import', () => {
    it('should export settings', () => { st.set('a', 1); st.set('b', 'two'); const data = st.exportSettings(); expect(data.a).toBe(1); expect(data.b).toBe('two'); });
    it('should import settings', () => { st.importSettings({ a: 1, b: 2 }); expect(st.get('a')).toBe(1); expect(st.get('b')).toBe(2); });
    it('should round-trip export/import', () => { st.set('a', 1); st.set('b', 'x'); const data = st.exportSettings(); st.clear(); st.importSettings(data); expect(st.get('a')).toBe(1); expect(st.get('b')).toBe('x'); });
    it('should import into existing', () => { st.set('a', 1); st.importSettings({ b: 2 }); expect(st.get('a')).toBe(1); expect(st.get('b')).toBe(2); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await st.shutdown(); await st.initialize(); expect(st.initialized).toBe(true); });
    it('should handle double init', async () => { await st.initialize(); expect(st.initialized).toBe(true); });
    it('should handle many settings', () => { for (let i = 0; i < 100; i++) st.set(`k${i}`, i); expect(st.getAll().size).toBe(100); });
  });
});
