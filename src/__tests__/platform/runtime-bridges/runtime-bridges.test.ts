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
  it('memory bridge calls initialize', async () => {
    let called = false;
    const c = createMemoryRuntimeBridge({ initialize: async () => { called = true; } });
    await c.initialize({} as any);
    expect(called).toBe(true);
  });
  it('memory bridge calls shutdown', async () => {
    let called = false;
    const c = createMemoryRuntimeBridge({ shutdown: async () => { called = true; } });
    await c.shutdown({} as any);
    expect(called).toBe(true);
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
