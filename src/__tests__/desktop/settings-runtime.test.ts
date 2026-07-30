import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRuntime } from '../../desktop/settings-runtime/settings-runtime.js';

describe('SettingsRuntime', () => {
  let rt: SettingsRuntime;
  beforeEach(async () => { rt = new SettingsRuntime(); await rt.initialize(); });

  describe('lifecycle', () => {
    it('should initialize', async () => { await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should have name', () => { expect(rt.name).toBe('SettingsRuntime'); });
    it('should start', async () => { await rt.initialize(); await rt.start(); });
    it('should stop', async () => { await rt.initialize(); await rt.stop(); });
    it('should shutdown', async () => { await rt.initialize(); await rt.shutdown(); expect(rt.initialized).toBe(false); });
  });

  describe('methods', () => {
    it('set and get', () => { rt.set("theme", "dark"); expect(rt.get("theme")).toBe("dark"); });
    it('get missing', () => { expect(rt.get("missing")).toBeUndefined(); });
    it('has key', () => { rt.set("x", 1); expect(rt.has("x")).toBe(true); });
    it('delete key', () => { rt.set("x", 1); expect(rt.delete("x")).toBe(true); });
    it('register default', () => { rt.registerDefault("lang", "en"); expect(rt.get("lang")).toBe("en"); });
    it('setting overrides default', () => { rt.registerDefault("lang", "en"); rt.set("lang", "ru"); expect(rt.get("lang")).toBe("ru"); });
    it('getAll', () => { rt.set("a", 1); rt.set("b", 2); expect(rt.getAll().size).toBe(2); });
    it('clear', () => { rt.set("a", 1); rt.clear(); expect(rt.getAll().size).toBe(0); });
    it('export', () => { rt.set("a", 1); const e = rt.exportSettings(); expect(e.a).toBe(1); });
    it('import', () => { rt.importSettings({a:1,b:2}); expect(rt.get("a")).toBe(1); });
    it('getDefaults', () => { rt.registerDefault("x", 42); expect(rt.getDefaults().get("x")).toBe(42); });
    it('has returns false', () => { expect(rt.has("nope")).toBe(false); });
    it('delete returns false', () => { expect(rt.delete("nope")).toBe(false); });
    it('empty export', () => { const e = rt.exportSettings(); expect(Object.keys(e).length).toBe(0); });
    it('import empty', () => { rt.importSettings({}); expect(rt.getAll().size).toBe(0); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await rt.shutdown(); await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle double init', async () => { await rt.initialize(); await rt.initialize(); expect(rt.initialized).toBe(true); });
  });
});
