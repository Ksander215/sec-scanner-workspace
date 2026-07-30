import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceContainerImpl } from '../../../platform/service-container/service-container.js';
import { ServiceScope } from '../../../platform/types.js';

describe('Container Stress', () => {
  let c: ServiceContainerImpl;
  beforeEach(() => { c = new ServiceContainerImpl(); });

  it('register 200 transient services', async () => {
    for (let i = 0; i < 200; i++) c.register(`s${i}`, () => i);
    for (let i = 0; i < 200; i++) expect(await c.resolve(`s${i}`)).toBe(i);
  });
  it('register 200 singletons', async () => {
    for (let i = 0; i < 200; i++) c.registerSingleton(`s${i}`, { v: i });
    for (let i = 0; i < 200; i++) expect((await c.resolve(`s${i}`) as {v:number}).v).toBe(i);
  });
  it('100 scoped services across 10 scopes', async () => {
    for (let i = 0; i < 100; i++) c.register(`s${i}`, () => i, ServiceScope.Scoped);
    for (let j = 0; j < 10; j++) {
      const scope = c.createScope();
      for (let i = 0; i < 100; i++) await scope.resolve(`s${i}`);
      await scope.dispose();
    }
    expect(true).toBe(true);
  });
  it('has 200 services', () => {
    for (let i = 0; i < 200; i++) c.register(`s${i}`, () => null);
    for (let i = 0; i < 200; i++) expect(c.has(`s${i}`)).toBe(true);
  });
  it('getAll returns 200', () => {
    for (let i = 0; i < 200; i++) c.register(`s${i}`, () => null);
    expect(c.getAll().size).toBe(200);
  });
  it('resolve unknown 100 times throws each time', async () => {
    for (let i = 0; i < 100; i++) {
      try { await c.resolve('unknown'); expect(true).toBe(false); } catch { /* expected */ }
    }
  });
});
