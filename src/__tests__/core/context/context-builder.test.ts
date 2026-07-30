import { describe, it, expect } from 'vitest';
import { ContextBuilder } from '../../../core/context/context-builder.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';

describe('ContextBuilder', () => {
  it('builds context with no providers', async () => {
    const builder = new ContextBuilder();
    const ctx = await builder.build();
    expect(ctx).not.toBeNull();
    expect(ctx!.entries.size).toBe(0);
  });

  it('builds context with one provider', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({
      source: ContextSource.Session,
      async getEntries() {
        return [{ key: 'k', value: 'v', source: ContextSource.Session, priority: ContextPriority.Normal, createdAt: new Date().toISOString() }];
      },
    });
    const ctx = await builder.build();
    expect(ctx!.entries.size).toBe(1);
    expect(ctx!.entries.get('k')!.value).toBe('v');
  });

  it('builds context with multiple providers', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({
      source: ContextSource.Configuration,
      async getEntries() {
        return [{ key: 'a', value: 1, source: ContextSource.Configuration, priority: ContextPriority.Normal, createdAt: new Date().toISOString() }];
      },
    });
    builder.registerProvider({
      source: ContextSource.Runtime,
      async getEntries() {
        return [{ key: 'b', value: 2, source: ContextSource.Runtime, priority: ContextPriority.High, createdAt: new Date().toISOString() }];
      },
    });
    const ctx = await builder.build();
    expect(ctx!.entries.size).toBe(2);
  });

  it('higher priority wins on key conflict', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({
      source: ContextSource.Configuration,
      async getEntries() {
        return [{ key: 'conflict', value: 'low', source: ContextSource.Configuration, priority: ContextPriority.Low, createdAt: new Date().toISOString() }];
      },
    });
    builder.registerProvider({
      source: ContextSource.Session,
      async getEntries() {
        return [{ key: 'conflict', value: 'high', source: ContextSource.Session, priority: ContextPriority.High, createdAt: new Date().toISOString() }];
      },
    });
    const ctx = await builder.build();
    expect(ctx!.entries.get('conflict')!.value).toBe('high');
  });

  it('continues on provider error', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({
      source: ContextSource.Session,
      async getEntries() { throw new Error('provider fail'); },
    });
    builder.registerProvider({
      source: ContextSource.Runtime,
      async getEntries() {
        return [{ key: 'safe', value: 'ok', source: ContextSource.Runtime, priority: ContextPriority.Normal, createdAt: new Date().toISOString() }];
      },
    });
    const ctx = await builder.build();
    expect(ctx!.entries.size).toBe(1);
    expect(ctx!.entries.get('safe')!.value).toBe('ok');
  });

  it('sets sessionId and executionId', async () => {
    const builder = new ContextBuilder();
    const ctx = await builder.build('sess-1', 'exec-1');
    expect(ctx!.sessionId).toBe('sess-1');
    expect(ctx!.executionId).toBe('exec-1');
  });

  it('contextId is generated', async () => {
    const builder = new ContextBuilder();
    const ctx = await builder.build();
    expect(ctx!.contextId).toBeDefined();
    expect(typeof ctx!.contextId).toBe('string');
  });

  it('version is set', async () => {
    const builder = new ContextBuilder();
    const ctx = await builder.build();
    expect(ctx!.version).toBeDefined();
  });

  it('clearProviders removes all', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({ source: ContextSource.Session, async getEntries() { return []; } });
    builder.clearProviders();
    expect(builder.getProviders()).toHaveLength(0);
  });

  it('getProviders returns registered count', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({ source: ContextSource.Session, async getEntries() { return []; } });
    builder.registerProvider({ source: ContextSource.Runtime, async getEntries() { return []; } });
    expect(builder.getProviders()).toHaveLength(2);
  });
});
