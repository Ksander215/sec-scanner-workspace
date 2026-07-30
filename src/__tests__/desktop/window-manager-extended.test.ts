import { describe, it, expect, beforeEach } from 'vitest';
import { WindowManager } from '../../desktop/window-manager/window-manager.js';
import { WindowState, WindowType } from '../../desktop/window-manager/types.js';
import type { WindowId } from '../../desktop/window-manager/types.js';
import { WindowNotFoundError, WindowLimitExceededError, InvalidWindowTransitionError } from '../../desktop/window-manager/errors.js';

describe('WindowManager — Extended', () => {
  let wm: WindowManager;
  beforeEach(() => { wm = new WindowManager({ maxWindows: 10 }); });

  describe('multi-window scenarios', () => {
    it('should create max windows', () => { for (let i = 0; i < 10; i++) wm.create({ type: WindowType.Main }); expect(wm.count).toBe(10); });
    it('should auto-focus last created', () => { wm.create({ type: WindowType.Main, title: 'W1' }); wm.create({ type: WindowType.Main, title: 'W2' }); expect(wm.focusedWindow?.title).toBe('W2'); });
    it('should maintain z-order', () => { const ids: WindowId[] = []; for (let i = 0; i < 5; i++) ids.push(wm.create({ type: WindowType.Main }).id); const sorted = wm.getAll().sort((a, b) => b.zIndex - a.zIndex); expect(sorted[0]!.id).toBe(ids[4]); });
    it('should close all windows', () => { const ids = [wm.create({ type: WindowType.Main }).id, wm.create({ type: WindowType.Main }).id, wm.create({ type: WindowType.Main }).id]; for (const id of ids) wm.close(id); expect(wm.count).toBe(0); });
  });

  describe('focus extended', () => {
    it('should handle focus cycling', () => { const w1 = wm.create({ type: WindowType.Main }); const w2 = wm.create({ type: WindowType.Main }); const w3 = wm.create({ type: WindowType.Main }); wm.focus(w1.id); wm.focus(w2.id); wm.focus(w3.id); wm.focus(w1.id); expect(wm.focusedWindow?.id).toBe(w1.id); });
    it('should increment zIndex on each focus', () => { const w1 = wm.create({ type: WindowType.Main }); const w2 = wm.create({ type: WindowType.Main }); const z1 = wm.getById(w1.id).zIndex; wm.focus(w1.id); expect(wm.getById(w1.id).zIndex).toBeGreaterThan(z1); });
  });

  describe('state transitions extended', () => {
    it('should support full lifecycle: active->minimized->maximized->active->closed', () => { const w = wm.create({ type: WindowType.Main }); wm.setState(w.id, WindowState.Minimized); expect(wm.getById(w.id).state).toBe(WindowState.Minimized); wm.setState(w.id, WindowState.Maximized); expect(wm.getById(w.id).state).toBe(WindowState.Maximized); wm.setState(w.id, WindowState.Active); expect(wm.getById(w.id).state).toBe(WindowState.Active); wm.close(w.id); expect(wm.count).toBe(0); });
    it('should support hidden state', () => { const w = wm.create({ type: WindowType.Main }); wm.setState(w.id, WindowState.Hidden); expect(wm.getById(w.id).state).toBe(WindowState.Hidden); });
    it('should restore from hidden', () => { const w = wm.create({ type: WindowType.Main }); wm.setState(w.id, WindowState.Hidden); wm.setState(w.id, WindowState.Active); expect(wm.getById(w.id).state).toBe(WindowState.Active); });
  });

  describe('bounds extended', () => {
    it('should update multiple bounds at once', () => { const w = wm.create({ type: WindowType.Main }); wm.updateBounds(w.id, { x: 10, y: 20, width: 800, height: 600 }); const b = wm.getById(w.id).bounds; expect(b).toEqual({ x: 10, y: 20, width: 800, height: 600 }); });
    it('should partial update bounds', () => { const w = wm.create({ type: WindowType.Main }); wm.updateBounds(w.id, { width: 500 }); const b = wm.getById(w.id).bounds; expect(b.width).toBe(500); expect(b.height).toBe(768); });
  });

  describe('layout extended', () => {
    it('should restore multiple windows', () => { const w1 = wm.create({ type: WindowType.Main, bounds: { width: 800 } }); const w2 = wm.create({ type: WindowType.Main, bounds: { width: 600 } }); const layout = wm.getLayout(); wm.updateBounds(w1.id, { width: 1920 }); wm.updateBounds(w2.id, { width: 1920 }); wm.restoreLayout(layout); expect(wm.getById(w1.id).bounds.width).toBe(800); expect(wm.getById(w2.id).bounds.width).toBe(600); });
    it('should handle layout with closed windows', () => { const w = wm.create({ type: WindowType.Main, bounds: { width: 800 } }); const layout = wm.getLayout(); wm.close(w.id); wm.restoreLayout(layout); });
  });

  describe('window types', () => {
    it('should filter by type', () => { wm.create({ type: WindowType.Main }); wm.create({ type: WindowType.Main }); wm.create({ type: WindowType.Conversation }); wm.create({ type: WindowType.Settings }); expect(wm.getByType(WindowType.Main).length).toBe(2); expect(wm.getByType(WindowType.Conversation).length).toBe(1); });
    it('should handle all window types', () => { const types = [WindowType.Main, WindowType.Conversation, WindowType.Project, WindowType.Settings, WindowType.Floating, WindowType.Diagnostics]; for (const t of types) wm.create({ type: t }); expect(wm.count).toBe(6); });
  });
});
