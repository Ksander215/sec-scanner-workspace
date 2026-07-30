import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceContainerImpl } from '../../../platform/service-container/service-container.js';
import { ServiceScope } from '../../../platform/types.js';

describe('ServiceContainerImpl Extended', () => {
  let c: ServiceContainerImpl;
  beforeEach(() => { c = new ServiceContainerImpl(); });

  it('resolves same singleton from multiple scopes', async () => {
    let count = 0;
    c.register('s', () => ++count, ServiceScope.Singleton);
    const s1 = c.createScope();
    const s2 = c.createScope();
    await s1.resolve('s');
    await s2.resolve('s');
    await c.resolve('s');
    expect(count).toBe(1);
  });

  it('transient in scope creates new each time', async () => {
    let count = 0;
    c.register('s', () => ++count, ServiceScope.Transient);
    const scope = c.createScope();
    await scope.resolve('s');
    await scope.resolve('s');
    expect(count).toBe(2);
  });

  it('factory scope in scope creates new each time', async () => {
    let count = 0;
    c.register('s', () => ++count, ServiceScope.Factory);
    const scope = c.createScope();
    await scope.resolve('s');
    await scope.resolve('s');
    expect(count).toBe(2);
  });

  it('multiple scopes can coexist', async () => {
    let count = 0;
    c.register('s', () => ++count, ServiceScope.Scoped);
    const scopes = [c.createScope(), c.createScope(), c.createScope()];
    for (const scope of scopes) await scope.resolve('s');
    expect(count).toBe(3);
  });

  it('async factory in scope', async () => {
    c.register('s', async () => 42, ServiceScope.Scoped);
    const scope = c.createScope();
    expect(await scope.resolve('s')).toBe(42);
  });

  it('throws for unregistered in scope', async () => {
    const scope = c.createScope();
    await expect(scope.resolve('missing')).rejects.toThrow();
  });

  it('double dispose is safe', async () => {
    const scope = c.createScope();
    await scope.dispose();
    await scope.dispose();
  });

  it('singleton returns same reference', async () => {
    const obj = { x: 1 };
    c.registerSingleton('s', obj);
    const a = await c.resolve('s');
    const b = await c.resolve('s');
    expect(a).toBe(obj);
    expect(b).toBe(obj);
  });

  it('resolve 50 different services', async () => {
    for (let i = 0; i < 50; i++) c.register(`s${i}`, () => i);
    for (let i = 0; i < 50; i++) expect(await c.resolve(`s${i}`)).toBe(i);
  });

  it('has returns true for singleton', () => {
    c.registerSingleton('s', {});
    expect(c.has('s')).toBe(true);
  });

  it('getAll includes all registered', () => {
    c.register('a', () => null);
    c.register('b', () => null, ServiceScope.Singleton);
    c.register('c', () => null, ServiceScope.Scoped);
    expect(c.getAll().size).toBe(3);
  });

  it('factory that returns promise', async () => {
    c.register('p', () => Promise.resolve('resolved'));
    expect(await c.resolve('p')).toBe('resolved');
  });

  it('factory that throws sync', async () => {
    c.register('throw', () => { throw new Error('sync'); });
    await expect(c.resolve('throw')).rejects.toThrow('sync');
  });

  it('factory that rejects async', async () => {
    c.register('reject', async () => { throw new Error('async'); });
    await expect(c.resolve('reject')).rejects.toThrow('async');
  });

  it('scope dispose and re-resolve singleton works', async () => {
    c.register('s', () => 42, ServiceScope.Singleton);
    const scope = c.createScope();
 await scope.resolve('s');
    await scope.dispose();
    expect(await c.resolve('s')).toBe(42);
  });

  it('100 scopes with scoped service', async () => {
    let count = 0;
    c.register('s', () => ++count, ServiceScope.Scoped);
    for (let i = 0; i < 100; i++) {
      const scope = c.createScope();
      await scope.resolve('s');
    }
    expect(count).toBe(100);
  });
});
