import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigurationRuntime } from '../../../platform/configuration-runtime/configuration-runtime.js';
import { ConfigSource } from '../../../platform/types.js';

describe('ConfigurationRuntime Extended', () => {
  let c: ConfigurationRuntime;
  beforeEach(() => { c = new ConfigurationRuntime(); });

  it('priorities: Override > User > Environment > Default', () => {
    c.loadFrom(ConfigSource.Default, { k: 'default' });
    expect(c.get('k')).toBe('default');
    c.loadFrom(ConfigSource.Environment, { k: 'env' });
    expect(c.get('k')).toBe('env');
    c.loadFrom(ConfigSource.User, { k: 'user' });
    expect(c.get('k')).toBe('user');
    c.loadFrom(ConfigSource.Override, { k: 'override' });
    expect(c.get('k')).toBe('override');
  });

  it('deleting override falls back to user', () => {
    c.loadFrom(ConfigSource.Default, { k: 'd' });
    c.loadFrom(ConfigSource.User, { k: 'u' });
    c.loadFrom(ConfigSource.Override, { k: 'o' });
    expect(c.get('k')).toBe('o');
    c.delete('k');
    expect(c.has('k')).toBe(false);
  });

  it('deleting user removes from all layers', () => {
    c.loadFrom(ConfigSource.Default, { k: 'd' });
    c.loadFrom(ConfigSource.Environment, { k: 'e' });
    c.loadFrom(ConfigSource.User, { k: 'u' });
    c.delete('k');
    expect(c.get('k')).toBeUndefined();
  });

  it('deleting all sources returns undefined', () => {
    c.loadFrom(ConfigSource.Default, { k: 'd' });
    c.delete('k');
    expect(c.get('k')).toBeUndefined();
  });

  it('loadFrom merges with existing', () => {
    c.loadFrom(ConfigSource.Default, { a: 1 });
    c.loadFrom(ConfigSource.Default, { b: 2 });
    expect(c.get('a')).toBe(1);
    expect(c.get('b')).toBe(2);
  });

  it('loadFrom overrides same source', () => {
    c.loadFrom(ConfigSource.Default, { k: 'v1' });
    c.loadFrom(ConfigSource.Default, { k: 'v2' });
    expect(c.get('k')).toBe('v2');
  });

  it('multiple watchers different keys', () => {
    const log: string[] = [];
    c.onConfigChanged('a', () => log.push('a'));
    c.onConfigChanged('b', () => log.push('b'));
    c.set('a', 1);
    expect(log).toEqual(['a']);
  });

  it('getAll includes all sources', () => {
    c.loadFrom(ConfigSource.Default, { a: 1 });
    c.loadFrom(ConfigSource.User, { b: 2 });
    const all = c.getAll();
    expect(all['a']).toBe(1);
    expect(all['b']).toBe(2);
  });

  it('handles 100 keys', () => {
    for (let i = 0; i < 100; i++) c.set(`k${i}`, i);
    for (let i = 0; i < 100; i++) expect(c.get(`k${i}`)).toBe(i);
  });

  it('set with deeply nested object', () => {
    const deep = { a: { b: { c: { d: { e: 'deep' } } } } };
    c.set('deep', deep);
    expect((c.get('deep') as {a:{b:{c:{d:{e:string}}}}}).a.b.c.d.e).toBe('deep');
  });

  it('get with generic type inference', () => {
    c.set('arr', [1, 2, 3]);
    const arr = c.get<number[]>('arr');
    expect(arr).toEqual([1, 2, 3]);
  });

  it('getSource for override set', () => {
    c.set('k', 'v');
    expect(c.getSource('k')).toBe(ConfigSource.Override);
  });

  it('getSource for user load', () => {
    c.loadFrom(ConfigSource.User, { k: 'v' });
    expect(c.getSource('k')).toBe(ConfigSource.User);
  });

  it('getSource for env load', () => {
    c.loadFrom(ConfigSource.Environment, { k: 'v' });
    expect(c.getSource('k')).toBe(ConfigSource.Environment);
  });

  it('snapshot is independent', () => {
    c.set('k', 'v');
    const snap = c.snapshot();
    c.set('k', 'v2');
    expect(snap['k']).toBe('v');
    expect(c.get('k')).toBe('v2');
  });
});
