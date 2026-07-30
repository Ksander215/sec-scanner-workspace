import { describe, it, expect, beforeEach } from 'vitest';
import { StartupRuntime } from '../../../desktop/startup/startup.js';  describe('lifecycle', () => {
    it('should have name', () => { expect(runtime.name).toBe('LocalStorageRuntime'); });
    it('should initialize', () => { expect(runtime.initialized).toBe(true); });
    it('should start', async () => { await runtime.start(); });
    it('should stop', async () => { await runtime.stop(); });
    it('should shutdown', async () => { await runtime.shutdown(); expect(runtime.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof runtime.initialize).toBe('function'); });
  });

describe('StartupRuntime', () => {
  let runtime: StartupRuntime;
  beforeEach(async () => { runtime = new StartupRuntime(); await runtime.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(runtime.name).toBe('LocalStorageRuntime'); });
    it('should initialize', () => { expect(runtime.initialized).toBe(true); });
    it('should start', async () => { await runtime.start(); });
    it('should stop', async () => { await runtime.stop(); });
    it('should shutdown', async () => { await runtime.shutdown(); expect(runtime.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof runtime.initialize).toBe('function'); });
  });

