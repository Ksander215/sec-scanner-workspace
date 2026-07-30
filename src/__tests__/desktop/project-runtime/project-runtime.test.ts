import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectRuntime } from '../../../desktop/project-runtime/project-runtime.js';
import type { ProjectId } from '../../../desktop/project-runtime/types.js';
import { ProjectNotFoundError } from '../../../desktop/project-runtime/errors.js';

describe('ProjectRuntime', () => {
  let pr: ProjectRuntime;
  beforeEach(async () => { pr = new ProjectRuntime(); await pr.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(pr.name).toBe('ProjectRuntime'); });
    it('should initialize', () => { expect(pr.initialized).toBe(true); });
    it('should start', async () => { await pr.start(); });
    it('should stop', async () => { await pr.stop(); });
    it('should shutdown', async () => { await pr.shutdown(); expect(pr.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof pr.initialize).toBe('function'); });
  });

  describe('create', () => {
    it('should create project', () => { const p = pr.create({ name: 'Proj1' }); expect(p.name).toBe('Proj1'); });
    it('should generate id', () => { const p = pr.create({ name: 'P' }); expect(p.id).toBeTruthy(); });
    it('should set default description', () => { const p = pr.create({ name: 'P' }); expect(p.description).toBe(''); });
    it('should set custom description', () => { const p = pr.create({ name: 'P', description: 'desc' }); expect(p.description).toBe('desc'); });
    it('should set default settings', () => { const p = pr.create({ name: 'P' }); expect(Object.keys(p.settings).length).toBe(0); });
    it('should set custom settings', () => { const p = pr.create({ name: 'P', settings: { theme: 'dark' } }); expect(p.settings.theme).toBe('dark'); });
    it('should set default tags', () => { const p = pr.create({ name: 'P' }); expect(p.tags.length).toBe(0); });
    it('should set custom tags', () => { const p = pr.create({ name: 'P', tags: ['ai', 'ml'] }); expect(p.tags).toEqual(['ai', 'ml']); });
    it('should set timestamps', () => { const p = pr.create({ name: 'P' }); expect(p.createdAt).toBeTruthy(); expect(p.updatedAt).toBeTruthy(); });
    it('should generate unique ids', () => { const p1 = pr.create({ name: 'a' }); const p2 = pr.create({ name: 'b' }); expect(p1.id).not.toBe(p2.id); });
    it('should increment count', () => { pr.create({ name: 'a' }); pr.create({ name: 'b' }); expect(pr.count).toBe(2); });
    it('should allow duplicate names', () => { pr.create({ name: 'dup' }); expect(() => pr.create({ name: 'dup' })).not.toThrow(); });
  });

  describe('getById', () => {
    it('should get by id', () => { const p = pr.create({ name: 'P' }); expect(pr.getById(p.id).name).toBe('P'); });
    it('should throw on missing', () => { expect(() => pr.getById('bad' as ProjectId)).toThrow(ProjectNotFoundError); });
  });

  describe('getAll', () => {
    it('should return all', () => { pr.create({ name: 'a' }); pr.create({ name: 'b' }); expect(pr.getAll().length).toBe(2); });
    it('should return empty initially', () => { expect(pr.getAll().length).toBe(0); });
  });

  describe('delete', () => {
    it('should delete project', () => { const p = pr.create({ name: 'P' }); pr.delete(p.id); expect(pr.count).toBe(0); });
    it('should throw on missing', () => { expect(() => pr.delete('bad' as ProjectId)).toThrow(ProjectNotFoundError); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await pr.shutdown(); await pr.initialize(); expect(pr.initialized).toBe(true); });
    it('should handle double init', async () => { await pr.initialize(); expect(pr.initialized).toBe(true); });
    it('should handle many projects', () => { for (let i = 0; i < 100; i++) pr.create({ name: `P${i}` }); expect(pr.count).toBe(100); });
    it('should store complex settings', () => { const p = pr.create({ name: 'P', settings: { nested: { a: 1 }, arr: [1, 2] } }); expect(pr.getById(p.id).settings.nested.a).toBe(1); });
    it('should handle unicode names', () => { const p = pr.create({ name: 'Проект' }); expect(p.name).toBe('Проект'); });
  });
});
