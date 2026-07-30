import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceContainerImpl } from '../../../platform/service-container/service-container.js';
import { ServiceScope } from '../../../platform/types.js';

describe('ServiceContainerImpl', () => {
  let container: ServiceContainerImpl;
  beforeEach(() => { container = new ServiceContainerImpl(); });

  it('registers and resolves a transient', async () => {
    container.register('svc', () => 'instance', ServiceScope.Transient);
    const result = await container.resolve<string>('svc');
    expect(result).toBe('instance');
  });
  it('transient creates new instance each time', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Transient);
    await container.resolve('svc');
    await container.resolve('svc');
    expect(count).toBe(2);
  });
  it('registers and resolves a singleton', async () => {
    container.register('svc', () => ({ val: 1 }), ServiceScope.Singleton);
    const a = await container.resolve<{val: number}>('svc');
    const b = await container.resolve<{val: number}>('svc');
    expect(a).toBe(b);
  });
  it('registerSingleton directly', async () => {
    const obj = { x: 42 };
    container.registerSingleton('svc', obj);
    expect(await container.resolve('svc')).toBe(obj);
  });
  it('singleton uses factory only once', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Singleton);
    await container.resolve('svc');
    await container.resolve('svc');
    expect(count).toBe(1);
  });
  it('has returns false for unknown', () => {
    expect(container.has('unknown')).toBe(false);
  });
  it('has returns true after register', () => {
    container.register('svc', () => null);
    expect(container.has('svc')).toBe(true);
  });
  it('getAll returns registered descriptors', () => {
    container.register('a', () => null);
    container.register('b', () => null);
    expect(container.getAll().size).toBe(2);
  });
  it('throws for unregistered resolve', async () => {
    await expect(container.resolve('nope')).rejects.toThrow();
  });
  it('creates a scope', () => {
    const scope = container.createScope();
    expect(scope).toBeDefined();
  });
  it('scoped instance is shared within scope', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Scoped);
    const scope = container.createScope();
    await scope.resolve('svc');
    await scope.resolve('svc');
    expect(count).toBe(1);
  });
  it('scoped instances are different across scopes', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Scoped);
    const s1 = container.createScope();
    const s2 = container.createScope();
    await s1.resolve('svc');
    await s2.resolve('svc');
    expect(count).toBe(2);
  });
  it('scoped container delegates to singleton', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Singleton);
    const s1 = container.createScope();
    const s2 = container.createScope();
    await s1.resolve('svc');
    await s2.resolve('svc');
    expect(count).toBe(1);
  });
  it('disposed scope rejects', async () => {
    container.register('svc', () => 1, ServiceScope.Scoped);
    const scope = container.createScope();
    await scope.dispose();
    await expect(scope.resolve('svc')).rejects.toThrow();
  });
  it('async factory works', async () => {
    container.register('svc', async () => 42);
    expect(await container.resolve('svc')).toBe(42);
  });
  it('factory scope (same as transient)', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Factory);
    await container.resolve('svc');
    await container.resolve('svc');
    expect(count).toBe(2);
  });
  it('default scope is Transient', async () => {
    let count = 0;
    container.register('svc', () => ++count);
    await container.resolve('svc');
    await container.resolve('svc');
    expect(count).toBe(2);
  });
  it('handles 100 services', async () => {
    for (let i = 0; i < 100; i++) container.register(`s${i}`, () => i);
    for (let i = 0; i < 100; i++) expect(await container.resolve(`s${i}`)).toBe(i);
  });
});
