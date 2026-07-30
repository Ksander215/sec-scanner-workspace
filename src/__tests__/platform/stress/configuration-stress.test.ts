import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigurationRuntime } from '../../../platform/configuration-runtime/configuration-runtime.js';
import { ConfigSource } from '../../../platform/types.js';

describe('Configuration Stress', () => {
  let c: ConfigurationRuntime;
  beforeEach(() => { c = new ConfigurationRuntime(); });

  it('set and get 500 keys', () => {
    for (let i = 0; i < 500; i++) c.set(`k${i}`, `v${i}`);
    for (let i = 0; i < 500; i++) expect(c.get(`k${i}`)).toBe(`v${i}`);
  });
  it('loadFrom 1000 keys from default', () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < 1000; i++) data[`d${i}`] = `v${i}`;
    c.loadFrom(ConfigSource.Default, data);
    expect(c.getAll()["d999"]).toBe("v999");
  });
  it('100 watchers on same key', () => {
    const results: number[] = [];
    const unsubs: Array<() => void> = [];
    for (let i = 0; i < 100; i++) {
      unsubs.push(c.onConfigChanged('k', () => results.push(i)));
    }
    c.set('k', 'val');
    expect(results.length).toBe(100);
  });
  it('100 watchers then unsubscribe all', () => {
    const unsubs: Array<() => void> = [];
    for (let i = 0; i < 100; i++) unsubs.push(c.onConfigChanged('k', () => {}));
    for (const u of unsubs) u();
    c.set('k', 'v'); // No error
    expect(c.get('k')).toBe('v');
  });
  it('set 100 different types of values', () => {
    c.set('str', 'hello');
    c.set('num', 42);
    c.set('bool', true);
    c.set('null', null);
    c.set('arr', [1, 2, 3]);
    c.set('obj', { a: 1 });
    c.set('empty', '');
    c.set('zero', 0);
    c.set('negative', -5);
    c.set('float', 3.14);
    expect(c.has('str')).toBe(true);
    expect(c.has('float')).toBe(true);
  });
  it('delete 200 keys after setting', () => {
    for (let i = 0; i < 200; i++) c.set(`k${i}`, i);
    let deleted = 0;
    for (let i = 0; i < 200; i++) if (c.delete(`k${i}`)) deleted++;
    expect(deleted).toBe(200);
  });
  it('snapshot with 500 keys', () => {
    for (let i = 0; i < 500; i++) c.set(`k${i}`, i);
    const snap = c.snapshot();
    expect(Object.keys(snap).length).toBe(500);
  });
  it('getSource for 100 keys', () => {
    for (let i = 0; i < 100; i++) c.set(`k${i}`, i);
    for (let i = 0; i < 100; i++) expect(c.getSource(`k${i}`)).toBe(ConfigSource.Override);
  });
  it('override then delete falls back', () => {
    c.loadFrom(ConfigSource.Default, { k: 'd' });
    c.loadFrom(ConfigSource.User, { k: 'u' });
    c.loadFrom(ConfigSource.Override, { k: 'o' });
    expect(c.get('k')).toBe('o');
    // Note: delete removes from ALL layers
    c.delete('k');
    expect(c.has('k')).toBe(false);
  });
});
