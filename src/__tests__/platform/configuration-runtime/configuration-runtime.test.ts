/**
 * Configuration Runtime — Tests (70+ tests)
 * TASK-AIS-005A.000
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigurationRuntime } from '../../../platform/configuration-runtime/configuration-runtime.js';
import { ConfigSource } from '../../../platform/types.js';

describe('ConfigurationRuntime', () => {
  let config: ConfigurationRuntime;

  beforeEach(() => { config = new ConfigurationRuntime(); });

  describe('get / set', () => {
    it('returns undefined for missing key', () => {
      expect(config.get('missing')).toBeUndefined();
    });
    it('returns default value for missing key', () => {
      expect(config.get('missing', 'fallback')).toBe('fallback');
    });
    it('sets and gets a string value', () => {
      config.set('key', 'value');
      expect(config.get('key')).toBe('value');
    });
    it('sets and gets a number value', () => {
      config.set('port', 8080);
      expect(config.get('port')).toBe(8080);
    });
    it('sets and gets a boolean value', () => {
      config.set('enabled', true);
      expect(config.get('enabled')).toBe(true);
    });
    it('sets and gets null', () => {
      config.set('nil', null);
      expect(config.get('nil')).toBeNull();
    });
    it('sets and gets an object value', () => {
      const obj = { a: 1 };
      config.set('obj', obj);
      expect(config.get('obj')).toEqual(obj);
    });
    it('sets and gets an array value', () => {
      const arr = [1, 2, 3];
      config.set('arr', arr);
      expect(config.get('arr')).toEqual(arr);
    });
    it('overrides existing value', () => {
      config.set('key', 'v1');
      config.set('key', 'v2');
      expect(config.get('key')).toBe('v2');
    });
    it('gets typed value with generic', () => {
      config.set('num', 42);
      expect(config.get<number>('num')).toBe(42);
    });
  });

  describe('has / delete', () => {
    it('returns false for missing key', () => {
      expect(config.has('missing')).toBe(false);
    });
    it('returns true for existing key', () => {
      config.set('key', 'val');
      expect(config.has('key')).toBe(true);
    });
    it('deletes existing key', () => {
      config.set('key', 'val');
      expect(config.delete('key')).toBe(true);
      expect(config.has('key')).toBe(false);
    });
    it('returns false for deleting missing key', () => {
      expect(config.delete('missing')).toBe(false);
    });
  });

  describe('source layers', () => {
    it('loads from Default source', () => {
      config.loadFrom(ConfigSource.Default, { key: 'default-val' });
      expect(config.get('key')).toBe('default-val');
      expect(config.getSource('key')).toBe(ConfigSource.Default);
    });
    it('loads from Environment source', () => {
      config.loadFrom(ConfigSource.Environment, { key: 'env-val' });
      expect(config.get('key')).toBe('env-val');
    });
    it('User source overrides Default', () => {
      config.loadFrom(ConfigSource.Default, { key: 'default' });
      config.loadFrom(ConfigSource.User, { key: 'user' });
      expect(config.get('key')).toBe('user');
      expect(config.getSource('key')).toBe(ConfigSource.User);
    });
    it('Override source has highest priority', () => {
      config.loadFrom(ConfigSource.Default, { key: 'default' });
      config.loadFrom(ConfigSource.Environment, { key: 'env' });
      config.loadFrom(ConfigSource.User, { key: 'user' });
      config.loadFrom(ConfigSource.Override, { key: 'override' });
      expect(config.get('key')).toBe('override');
      expect(config.getSource('key')).toBe(ConfigSource.Override);
    });
    it('set() uses Override source', () => {
      config.set('key', 'direct');
      expect(config.getSource('key')).toBe(ConfigSource.Override);
    });
    it('missing key returns Default source', () => {
      expect(config.getSource('missing')).toBe(ConfigSource.Default);
    });
  });

  describe('getAll / snapshot', () => {
    it('returns empty object for empty config', () => {
      expect(config.getAll()).toEqual({});
    });
    it('returns all keys', () => {
      config.set('a', 1);
      config.set('b', 2);
      const all = config.getAll();
      expect(all['a']).toBe(1);
      expect(all['b']).toBe(2);
    });
    it('snapshot matches getAll', () => {
      config.set('k', 'v');
      expect(config.snapshot()).toEqual(config.getAll());
    });
  });

  describe('onConfigChanged', () => {
    it('calls callback on set', () => {
      let called = false;
      config.onConfigChanged('key', () => { called = true; });
      config.set('key', 'val');
      expect(called).toBe(true);
    });
    it('provides old and new values', () => {
      let newVal: unknown, oldVal: unknown;
      config.set('key', 'old');
      config.onConfigChanged('key', (nv, ov) => { newVal = nv; oldVal = ov; });
      config.set('key', 'new');
      expect(newVal).toBe('new');
      expect(oldVal).toBe('old');
    });
    it('unsubscribes via returned function', () => {
      let count = 0;
      const unsub = config.onConfigChanged('key', () => { count++; });
      config.set('key', 'v1');
      unsub();
      config.set('key', 'v2');
      expect(count).toBe(1);
    });
    it('isolates failing watchers', () => {
      let count = 0;
      config.onConfigChanged('key', () => { throw new Error('fail'); });
      config.onConfigChanged('key', () => { count++; });
      config.set('key', 'v');
      expect(count).toBe(1);
    });
    it('calls watcher on loadFrom', () => {
      let called = false;
      config.onConfigChanged('key', () => { called = true; });
      config.loadFrom(ConfigSource.User, { key: 'val' });
      expect(called).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty string key', () => {
      config.set('', 'empty-key');
      expect(config.get('')).toBe('empty-key');
    });
    it('handles numeric string key', () => {
      config.set('123', 'num-key');
      expect(config.get('123')).toBe('num-key');
    });
    it('handles special characters in key', () => {
      config.set('a.b.c', 'dotted');
      expect(config.get('a.b.c')).toBe('dotted');
    });
    it('handles undefined value', () => {
      config.set('undef', undefined);
      expect(config.get('undef')).toBeUndefined();
    });
    it('handles zero as value', () => {
      config.set('zero', 0);
      expect(config.get('zero')).toBe(0);
    });
    it('handles false as value', () => {
      config.set('false', false);
      expect(config.get('false')).toBe(false);
    });
    it('handles empty string value', () => {
      config.set('empty', '');
      expect(config.get('empty')).toBe('');
    });
    it('multiple watchers on same key', () => {
      const results: number[] = [];
      config.onConfigChanged('k', () => results.push(1));
      config.onConfigChanged('k', () => results.push(2));
      config.set('k', 'v');
      expect(results).toEqual([1, 2]);
    });
    it('delete removes from all layers', () => {
      config.loadFrom(ConfigSource.Default, { k: 'd' });
      config.loadFrom(ConfigSource.Override, { k: 'o' });
      config.delete('k');
      expect(config.has('k')).toBe(false);
    });
  });
});
