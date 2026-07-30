/**
 * MemoryRuntime Tests
 */
import { describe, it, expect } from 'vitest';
import { MemoryRuntime } from '../../../core/memory/memory-runtime.js';

describe('MemoryRuntime', () => {
  it('getWorkingMemory creates new working memory per executionId', () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    const wm1 = rt.getWorkingMemory('exec-1');
    const wm2 = rt.getWorkingMemory('exec-2');
    expect(wm1 !== wm2, 'different executionIds should produce different instances').toBe(true);
  });
  it('getWorkingMemory returns same instance for same executionId', () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    const wm1 = rt.getWorkingMemory('exec-1');
    const wm2 = rt.getWorkingMemory('exec-1');
    expect(wm1 === wm2, 'same executionId should return same instance').toBe(true);
  });
  it('disposeWorkingMemory removes working memory', () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    rt.getWorkingMemory('exec-1').store('k', 'v');
    rt.disposeWorkingMemory('exec-1');
    const stats = rt.getStats();
    expect(stats.workingEntries).toBe(0);
  });
  it('getSessionMemory creates new session memory per sessionId', () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    const sm1 = rt.getSessionMemory('sess-1');
    const sm2 = rt.getSessionMemory('sess-2');
    expect(sm1 !== sm2, 'different sessionIds should produce different instances').toBe(true);
  });
  it('getSessionMemory returns same instance for same sessionId', () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    const sm1 = rt.getSessionMemory('sess-1');
    const sm2 = rt.getSessionMemory('sess-1');
    expect(sm1 === sm2, 'same sessionId should return same instance').toBe(true);
  });
  it('disposeSessionMemory clears session memory', () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    rt.getSessionMemory('sess-1').store('k', 'v');
    const cleared = rt.disposeSessionMemory('sess-1');
    expect(cleared).toBe(1);
  });
  it('getPersistentMemory returns singleton', () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    const pm1 = rt.getPersistentMemory();
    const pm2 = rt.getPersistentMemory();
    expect(pm1 === pm2, 'persistent memory should be a singleton').toBe(true);
  });
  it('store to working layer stores in correct memory', async () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    const entry = await rt.store('working', 'k', 'v', { executionId: 'exec-1' });
    expect(entry.layer).toBe('working');
    const wm = rt.getWorkingMemory('exec-1');
    expect(wm.size()).toBe(1);
  });
  it('store to session layer stores in correct memory', async () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    const entry = await rt.store('session', 'k', 'v', { sessionId: 'sess-1' });
    expect(entry.layer).toBe('session');
    const sm = rt.getSessionMemory('sess-1');
    expect(sm.size()).toBe(1);
  });
  it('store to persistent layer stores in correct memory', async () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    const entry = await rt.store('persistent', 'k', 'v');
    expect(entry.layer).toBe('persistent');
    expect(rt.getPersistentMemory().size()).toBe(1);
  });
  it('retrieve from correct layer (working)', async () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    await rt.store('working', 'k', 'v', { executionId: 'exec-1' });
    const result = await rt.retrieve('working', 'k', { executionId: 'exec-1' });
    expect(result).not.toBeNull();
    expect(result!.value).toBe('v');
  });
  it('retrieve from correct layer (session)', async () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    await rt.store('session', 'k', 'v', { sessionId: 'sess-1' });
    const result = await rt.retrieve('session', 'k', { sessionId: 'sess-1' });
    expect(result).not.toBeNull();
    expect(result!.value).toBe('v');
  });
  it('retrieve from correct layer (persistent)', async () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    await rt.store('persistent', 'k', 'v');
    const result = await rt.retrieve('persistent', 'k');
    expect(result).not.toBeNull();
    expect(result!.value).toBe('v');
  });
  it('delete from correct layer (working)', async () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    await rt.store('working', 'k', 'v', { executionId: 'exec-1' });
    const deleted = await rt.delete('working', 'k', { executionId: 'exec-1' });
    expect(deleted).toBe(true);
    expect(await rt.retrieve('working', 'k', { executionId: 'exec-1' })).toBeNull();
  });
  it('delete from correct layer (session)', async () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    await rt.store('session', 'k', 'v', { sessionId: 'sess-1' });
    const deleted = await rt.delete('session', 'k', { sessionId: 'sess-1' });
    expect(deleted).toBe(true);
  });
  it('query filters by layer', () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    rt.getWorkingMemory('exec-1').store('wk', 'v');
    rt.getSessionMemory('sess-1').store('sk', 'v');
    const results = rt.query({ layer: 'working' });
    expect(results.length).toBe(1);
    expect(results[0].layer).toBe('working');
  });
  it('query filters by sessionId', () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    rt.getSessionMemory('sess-1').store('k1', 'v');
    rt.getSessionMemory('sess-2').store('k2', 'v');
    const results = rt.query({ sessionId: 'sess-1' });
    expect(results.length).toBe(1);
    expect(results[0].key).toBe('k1');
  });
  it('query filters by keyPattern (regex)', () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    rt.getWorkingMemory('exec-1').store('user:1', 'a');
    rt.getWorkingMemory('exec-1').store('user:2', 'b');
    rt.getWorkingMemory('exec-1').store('item:1', 'c');
    const results = rt.query({ keyPattern: '^user:' });
    expect(results.length).toBe(2);
  });
  it('getStats returns correct counts', async () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    rt.getWorkingMemory('exec-1').store('wk1', 'v');
    rt.getWorkingMemory('exec-1').store('wk2', 'v');
    rt.getSessionMemory('sess-1').store('sk', 'v');
    await rt.store('persistent', 'pk', 'v');
    const stats = rt.getStats();
    expect(stats.workingEntries).toBe(2);
    expect(stats.sessionEntries).toBe(1);
    expect(stats.persistentEntries).toBe(1);
    expect(stats.totalEntries).toBe(4);
  });
  it('flush persists all dirty entries', async () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    await rt.store('persistent', 'k', 'v');
    await rt.flush();
    // After flush, dirty count should be 0
    const pmStats = rt.getPersistentMemory().getStats();
    expect(pmStats.dirtyEntries).toBe(0);
  });
  it('purgeExpired removes expired across all layers', async () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    rt.getSessionMemory('sess-1').storeWithTtl('exp', 'v', -1);
    rt.getSessionMemory('sess-1').store('valid', 'v2');
    await new Promise(r => setTimeout(r, 2));
    const purged = await rt.purgeExpired();
    expect(purged).toBe(1);
  });
  it('dispose clears all memories', () => {
    const rt = new MemoryRuntime({ enableIsolation: false });
    rt.getWorkingMemory('exec-1').store('k', 'v');
    rt.getSessionMemory('sess-1').store('k', 'v');
    rt.dispose();
    expect(rt.disposed).toBe(true);
    expect(rt.getStats().totalEntries).toBe(0);
  });
  it('isolation enforced on session memory access', async () => {
    const rt = new MemoryRuntime({ enableIsolation: true });
    await expect(async () => {
      await rt.store('session', 'k', 'v');
    }).rejects.toThrow();
  });
});
