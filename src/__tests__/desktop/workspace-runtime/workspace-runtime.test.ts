import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceRuntime } from '../../../desktop/workspace-runtime/workspace-runtime.js';
import { WorkspaceState } from '../../../desktop/workspace-runtime/types.js';
import type { WorkspaceId } from '../../../desktop/workspace-runtime/types.js';
import { WorkspaceNotFoundError, DuplicateWorkspaceError } from '../../../desktop/workspace-runtime/errors.js';

describe('WorkspaceRuntime', () => {
  let ws: WorkspaceRuntime;
  beforeEach(async () => { ws = new WorkspaceRuntime(); await ws.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(ws.name).toBe('WorkspaceRuntime'); });
    it('should initialize', () => { expect(ws.initialized).toBe(true); });
    it('should start', async () => { await ws.start(); });
    it('should stop', async () => { await ws.stop(); });
    it('should shutdown', async () => { await ws.shutdown(); expect(ws.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof ws.initialize).toBe('function'); });
  });

  describe('create', () => {
    it('should create workspace', () => { const w = ws.create({ name: 'ws1' }); expect(w.name).toBe('ws1'); expect(w.id).toBeTruthy(); });
    it('should set default description', () => { const w = ws.create({ name: 'ws1' }); expect(w.description).toBe(''); });
    it('should set custom description', () => { const w = ws.create({ name: 'ws1', description: 'desc' }); expect(w.description).toBe('desc'); });
    it('should set state to Active', () => { const w = ws.create({ name: 'ws1' }); expect(w.state).toBe(WorkspaceState.Active); });
    it('should set timestamps', () => { const w = ws.create({ name: 'ws1' }); expect(w.createdAt).toBeTruthy(); expect(w.updatedAt).toBeTruthy(); });
    it('should set default layout', () => { const w = ws.create({ name: 'ws1' }); expect(Object.keys(w.layout).length).toBe(0); });
    it('should set custom layout', () => { const w = ws.create({ name: 'ws1', layout: { panel: 'left' } }); expect(w.layout.panel).toBe('left'); });
    it('should link to project', () => { const w = ws.create({ name: 'ws1', projectId: 'proj-1' as any }); expect(w.projectId).toBe('proj-1'); });
    it('should auto-set first as active', () => { const w = ws.create({ name: 'ws1' }); expect(ws.getActive()?.id).toBe(w.id); });
    it('should not change active if already set', () => { const w1 = ws.create({ name: 'ws1' }); const w2 = ws.create({ name: 'ws2' }); expect(ws.getActive()?.id).toBe(w1.id); });
    it('should generate unique ids', () => { const w1 = ws.create({ name: 'a' }); const w2 = ws.create({ name: 'b' }); expect(w1.id).not.toBe(w2.id); });
    it('should throw on duplicate name', () => { ws.create({ name: 'dup' }); expect(() => ws.create({ name: 'dup' })).toThrow(DuplicateWorkspaceError); });
    it('should increment count', () => { ws.create({ name: 'a' }); ws.create({ name: 'b' }); expect(ws.count).toBe(2); });
  });

  describe('getById', () => {
    it('should get by id', () => { const w = ws.create({ name: 'ws1' }); expect(ws.getById(w.id).name).toBe('ws1'); });
    it('should throw on missing', () => { expect(() => ws.getById('bad' as WorkspaceId)).toThrow(WorkspaceNotFoundError); });
  });

  describe('getAll', () => {
    it('should return all', () => { ws.create({ name: 'a' }); ws.create({ name: 'b' }); expect(ws.getAll().length).toBe(2); });
    it('should return empty initially', () => { expect(ws.getAll().length).toBe(0); });
  });

  describe('getActive', () => {
    it('should return null initially', () => { expect(ws.getActive()).toBeNull(); });
    it('should return active workspace', () => { const w = ws.create({ name: 'ws1' }); expect(ws.getActive()?.id).toBe(w.id); });
  });

  describe('switch', () => {
    it('should switch active workspace', () => { const w1 = ws.create({ name: 'a' }); const w2 = ws.create({ name: 'b' }); ws.switch(w2.id); expect(ws.getActive()?.id).toBe(w2.id); });
    it('should throw on missing', () => { expect(() => ws.switch('bad' as WorkspaceId)).toThrow(WorkspaceNotFoundError); });
    it('should update activeWorkspace getter', () => { const w1 = ws.create({ name: 'a' }); const w2 = ws.create({ name: 'b' }); ws.switch(w2.id); expect(ws.activeWorkspace?.id).toBe(w2.id); });
  });

  describe('updateLayout', () => {
    it('should update layout', () => { const w = ws.create({ name: 'a' }); ws.updateLayout(w.id, { panel: 'right' }); expect(ws.getById(w.id).layout.panel).toBe('right'); });
    it('should update timestamp', async () => { const w = ws.create({ name: 'a' }); const t = w.updatedAt; await new Promise(r => setTimeout(r, 2)); ws.updateLayout(w.id, {}); expect(ws.getById(w.id).updatedAt).not.toBe(t); });
    it('should throw on missing', () => { expect(() => ws.updateLayout('bad' as WorkspaceId, {})).toThrow(WorkspaceNotFoundError); });
  });

  describe('archive', () => {
    it('should archive workspace', () => { const w = ws.create({ name: 'a' }); ws.archive(w.id); expect(ws.getById(w.id).state).toBe(WorkspaceState.Archived); });
    it('should clear active if archived was active', () => { const w1 = ws.create({ name: 'a' }); const w2 = ws.create({ name: 'b' }); ws.switch(w1.id); ws.archive(w1.id); expect(ws.getActive()?.id).toBe(w2.id); });
    it('should throw on missing', () => { expect(() => ws.archive('bad' as WorkspaceId)).toThrow(WorkspaceNotFoundError); });
  });

  describe('delete', () => {
    it('should delete workspace', () => { const w = ws.create({ name: 'a' }); ws.delete(w.id); expect(ws.count).toBe(0); });
    it('should throw on missing', () => { expect(() => ws.delete('bad' as WorkspaceId)).toThrow(WorkspaceNotFoundError); });
    it('should clear active if deleted was active', () => { const w1 = ws.create({ name: 'a' }); const w2 = ws.create({ name: 'b' }); ws.switch(w1.id); ws.delete(w1.id); expect(ws.getActive()?.id).toBe(w2.id); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await ws.shutdown(); await ws.initialize(); expect(ws.initialized).toBe(true); });
    it('should handle double init', async () => { await ws.initialize(); expect(ws.initialized).toBe(true); });
    it('should handle many workspaces', () => { for (let i = 0; i < 50; i++) ws.create({ name: `ws${i}` }); expect(ws.count).toBe(50); });
    it('stop should clear active', async () => { ws.create({ name: 'a' }); await ws.stop(); expect(ws.activeWorkspace).toBeNull(); });
  });
});
