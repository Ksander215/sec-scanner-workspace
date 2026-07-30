import { describe, it, expect, beforeEach } from 'vitest';
import { ThreadSafeRuntimeRegistry } from '../../../platform/runtime-registry/runtime-registry.js';
import { BootstrapPhase, HealthStatus } from '../../../platform/types.js';
import type { RuntimeDescriptor } from '../../../platform/types.js';

function rd(id: string): RuntimeDescriptor {
  return Object.freeze({ id, name: id, version: '1.0.0', description: '', dependencies: [], phase: BootstrapPhase.Ready, health: HealthStatus.Healthy, initializedAt: new Date().toISOString(), activatedAt: new Date().toISOString(), instance: null });
}

describe('Registry Stress', () => {
  let r: ThreadSafeRuntimeRegistry;
  beforeEach(() => { r = new ThreadSafeRuntimeRegistry(); });

  it('register 200 runtimes', () => {
    for (let i = 0; i < 200; i++) r.register(rd(`rt${i}`));
    expect(r.count()).toBe(200);
  });
  it('getAll returns 200', () => {
    for (let i = 0; i < 200; i++) r.register(rd(`rt${i}`));
    expect(r.getAll().length).toBe(200);
  });
  it('get each by id', () => {
    for (let i = 0; i < 100; i++) r.register(rd(`rt${i}`));
    for (let i = 0; i < 100; i++) expect(r.get(`rt${i}`)?.id).toBe(`rt${i}`);
  });
  it('get each by name', () => {
    for (let i = 0; i < 100; i++) r.register(rd(`rt${i}`));
    for (let i = 0; i < 100; i++) expect(r.getByName(`rt${i}`)?.id).toBe(`rt${i}`);
  });
  it('has all 200', () => {
    for (let i = 0; i < 200; i++) r.register(rd(`rt${i}`));
    for (let i = 0; i < 200; i++) expect(r.has(`rt${i}`)).toBe(true);
  });
  it('getByPhase filters correctly at scale', () => {
    for (let i = 0; i < 100; i++) r.register(rd(`init${i}`));
    expect(r.getByPhase(BootstrapPhase.Ready).length).toBe(100);
  });
});
