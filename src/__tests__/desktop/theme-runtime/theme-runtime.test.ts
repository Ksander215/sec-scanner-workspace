import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeRuntime } from '../../../desktop/theme-runtime/theme-runtime.js';
import type { ThemeId } from '../../../desktop/theme-runtime/types.js';
import { ThemeNotFoundError } from '../../../desktop/theme-runtime/errors.js';

describe('ThemeRuntime', () => {
  let tr: ThemeRuntime;
  beforeEach(async () => { tr = new ThemeRuntime(); await tr.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(tr.name).toBe('ThemeRuntime'); });
    it('should initialize', () => { expect(tr.initialized).toBe(true); });
    it('should start', async () => { await tr.start(); });
    it('should stop', async () => { await tr.stop(); });
    it('should shutdown', async () => { await tr.shutdown(); expect(tr.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof tr.initialize).toBe('function'); });
  });

  describe('create', () => {
    it('should create theme', () => { const t = tr.create({ name: 'Dark' }); expect(t.name).toBe('Dark'); });
    it('should generate id', () => { const t = tr.create({ name: 'T' }); expect(t.id).toBeTruthy(); });
    it('should set default colors', () => { const t = tr.create({ name: 'T' }); expect(Object.keys(t.colors).length).toBe(0); });
    it('should set custom colors', () => { const t = tr.create({ name: 'T', colors: { primary: '#000' } }); expect(t.colors.primary).toBe('#000'); });
    it('should set default fontFamily', () => { const t = tr.create({ name: 'T' }); expect(t.fontFamily).toBe('sans-serif'); });
    it('should set custom fontFamily', () => { const t = tr.create({ name: 'T', fontFamily: 'monospace' }); expect(t.fontFamily).toBe('monospace'); });
    it('should set default fontSize', () => { const t = tr.create({ name: 'T' }); expect(t.fontSize).toBe(14); });
    it('should set custom fontSize', () => { const t = tr.create({ name: 'T', fontSize: 18 }); expect(t.fontSize).toBe(18); });
    it('should set default isDark', () => { const t = tr.create({ name: 'T' }); expect(t.isDark).toBe(false); });
    it('should set isDark to true', () => { const t = tr.create({ name: 'T', isDark: true }); expect(t.isDark).toBe(true); });
    it('should set timestamps', () => { const t = tr.create({ name: 'T' }); expect(t.createdAt).toBeTruthy(); expect(t.updatedAt).toBeTruthy(); });
    it('should generate unique ids', () => { const t1 = tr.create({ name: 'a' }); const t2 = tr.create({ name: 'b' }); expect(t1.id).not.toBe(t2.id); });
    it('should increment count', () => { tr.create({ name: 'a' }); tr.create({ name: 'b' }); expect(tr.count).toBe(2); });
    it('should allow duplicate names', () => { tr.create({ name: 'dup' }); expect(() => tr.create({ name: 'dup' })).not.toThrow(); });
  });

  describe('getById', () => {
    it('should get by id', () => { const t = tr.create({ name: 'T' }); expect(tr.getById(t.id).name).toBe('T'); });
    it('should throw on missing', () => { expect(() => tr.getById('bad' as ThemeId)).toThrow(ThemeNotFoundError); });
  });

  describe('getAll', () => {
    it('should return all', () => { tr.create({ name: 'a' }); tr.create({ name: 'b' }); expect(tr.getAll().length).toBe(2); });
    it('should return empty initially', () => { expect(tr.getAll().length).toBe(0); });
  });

  describe('delete', () => {
    it('should delete theme', () => { const t = tr.create({ name: 'T' }); tr.delete(t.id); expect(tr.count).toBe(0); });
    it('should throw on missing', () => { expect(() => tr.delete('bad' as ThemeId)).toThrow(ThemeNotFoundError); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await tr.shutdown(); await tr.initialize(); expect(tr.initialized).toBe(true); });
    it('should handle double init', async () => { await tr.initialize(); expect(tr.initialized).toBe(true); });
    it('should handle many themes', () => { for (let i = 0; i < 50; i++) tr.create({ name: `T${i}`, isDark: i % 2 === 0 }); expect(tr.count).toBe(50); });
    it('should store complex colors', () => { const t = tr.create({ name: 'T', colors: { primary: '#000', secondary: '#fff', bg: '#eee', fg: '#111', accent: '#f00', muted: '#888' } }); expect(Object.keys(tr.getById(t.id).colors).length).toBe(6); });
  });
});
