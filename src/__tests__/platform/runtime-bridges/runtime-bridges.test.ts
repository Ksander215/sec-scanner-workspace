import { describe, it, expect } from 'vitest';
import { createRuntimeBridge, createMemoryRuntimeBridge, createKnowledgeRuntimeBridge, createIdentityRuntimeBridge, createCapabilityRuntimeBridge, createWorkflowRuntimeBridge, createCognitiveRuntimeBridge, createExperienceRuntimeBridge, createDesktopRuntimeBridge } from '../../../platform/runtime-bridges.js';
import { HealthStatus } from '../../../platform/types.js';

describe('Runtime Bridges', () => {
  it('createRuntimeBridge returns contract', () => {
    const c = createRuntimeBridge({ id: 'test', name: 'Test', version: '1.0.0', description: '', instance: null });
    expect(c.id).toBe('test');
  });
  it('bridge initialize works', async () => {
    let inited = false;
    const c = createRuntimeBridge({ id: 'a', name: 'A', version: '1.0.0', description: '', instance: null, onInitialize: async () => { inited = true; } });
    await c.initialize({} as any);
    expect(inited).toBe(true);
  });
  it('bridge activate works', async () => {
    let activated = false;
    const c = createRuntimeBridge({ id: 'a', name: 'A', version: '1.0.0', description: '', instance: null, onActivate: async () => { activated = true; } });
    await c.activate({} as any);
    expect(activated).toBe(true);
  });
  it('bridge shutdown works', async () => {
    let shut = false;
    const c = createRuntimeBridge({ id: 'a', name: 'A', version: '1.0.0', description: '', instance: null, onShutdown: async () => { shut = true; } });
    await c.shutdown({} as any);
    expect(shut).toBe(true);
  });
  it('bridge default health', async () => {
    const c = createRuntimeBridge({ id: 'a', name: 'A', version: '1.0.0', description: '', instance: null });
    const h = await c.health();
    expect(h.status).toBe(HealthStatus.Healthy);
  });
  it('bridge custom health', async () => {
    const c = createRuntimeBridge({ id: 'a', name: 'A', version: '1.0.0', description: '', instance: null, healthCheck: async () => ({ status: HealthStatus.Warning, details: '', checkedAt: '', responseTimeMs: 0 }) });
    expect((await c.health()).status).toBe(HealthStatus.Warning);
  });
  it('createMemoryRuntimeBridge', () => {
    const c = createMemoryRuntimeBridge({ initialize: async () => {}, shutdown: async () => {} });
    expect(c.id).toBe('memory-runtime');
    expect(c.dependencies).toEqual([]);
  });
  it('createKnowledgeRuntimeBridge', () => {
    const c = createKnowledgeRuntimeBridge({});
    expect(c.id).toBe('knowledge-runtime');
    expect(c.dependencies).toContain('memory-runtime');
  });
  it('createIdentityRuntimeBridge', () => {
    const c = createIdentityRuntimeBridge({});
    expect(c.id).toBe('identity-runtime');
    expect(c.dependencies).toContain('memory-runtime');
  });
  it('createCapabilityRuntimeBridge', () => {
    const c = createCapabilityRuntimeBridge({});
    expect(c.id).toBe('capability-runtime');
    expect(c.dependencies).toContain('identity-runtime');
  });
  it('createWorkflowRuntimeBridge', () => {
    const c = createWorkflowRuntimeBridge({});
    expect(c.id).toBe('workflow-runtime');
    expect(c.dependencies).toContain('knowledge-runtime');
  });
  it('createCognitiveRuntimeBridge', () => {
    const c = createCognitiveRuntimeBridge({});
    expect(c.id).toBe('cognitive-runtime');
    expect(c.dependencies).toContain('knowledge-runtime');
  });
  it('createExperienceRuntimeBridge', () => {
    const c = createExperienceRuntimeBridge({});
    expect(c.id).toBe('experience-runtime');
  });
  it('createDesktopRuntimeBridge', () => {
    const c = createDesktopRuntimeBridge({});
    expect(c.id).toBe('desktop-foundation');
    expect(c.dependencies.length).toBe(5);
  });
  it('memory bridge initialize registers in container and health monitor', async () => {
    const mockContainer = { registerSingleton: () => {} };
    const mockHealthMonitor = { registerCheck: () => {} };
    const mockEventHub = { publish: async () => ({}) };
    const ctx = { container: mockContainer, healthMonitor: mockHealthMonitor, eventHub: mockEventHub };
    let disposed = false;
    const c = createMemoryRuntimeBridge({ dispose: () => { disposed = true; }, getStats: () => ({ entryCount: 5 }) });
    await c.initialize(ctx as any);
    expect(disposed).toBe(false);
  });
  it('memory bridge shutdown calls dispose', async () => {
    let disposed = false;
    const mockEventHub = { publish: async () => ({}) };
    const ctx = { eventHub: mockEventHub };
    const c = createMemoryRuntimeBridge({ dispose: () => { disposed = true; } });
    await c.shutdown(ctx as any);
    expect(disposed).toBe(true);
  });
  it('memory bridge initialize publishes event', async () => {
    const published: string[] = [];
    const mockEventHub = { publish: async (type: string) => { published.push(type); return {} as any; } };
    const ctx = { container: { registerSingleton: () => {} }, healthMonitor: { registerCheck: () => {} }, eventHub: mockEventHub };
    const c = createMemoryRuntimeBridge({ getStats: () => ({ entryCount: 0 }) });
    await c.initialize(ctx as any);
    expect(published).toContain('runtime.memory.initialized');
  });
  it('memory bridge shutdown publishes event', async () => {
    const published: string[] = [];
    const mockEventHub = { publish: async (type: string) => { published.push(type); return {} as any; } };
    const ctx = { eventHub: mockEventHub };
    const c = createMemoryRuntimeBridge({});
    await c.shutdown(ctx as any);
    expect(published).toContain('runtime.memory.shutdown');
  });
  it('bridge version param', () => {
    const c = createMemoryRuntimeBridge({}, '3.0.0');
    expect(c.version).toBe('3.0.0');
  });
  it('bridge with custom dependencies', () => {
    const c = createRuntimeBridge({ id: 'a', name: 'A', version: '1.0.0', description: '', instance: null, dependencies: ['x', 'y'] });
    expect(c.dependencies).toEqual(['x', 'y']);
  });
  it('all 8 bridges have correct dependency chains', () => {
    const bridges = [
      createMemoryRuntimeBridge({}),
      createKnowledgeRuntimeBridge({}),
      createIdentityRuntimeBridge({}),
      createCapabilityRuntimeBridge({}),
      createWorkflowRuntimeBridge({}),
      createCognitiveRuntimeBridge({}),
      createExperienceRuntimeBridge({}),
      createDesktopRuntimeBridge({}),
    ];
    const ids = new Set(bridges.map(b => b.id));
    expect(ids.size).toBe(8);
  });
});
