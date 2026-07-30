import { describe, it, expect, beforeEach } from 'vitest';
import { WindowManager } from '../../desktop/window-manager/window-manager.js';
import { WindowState, WindowType } from '../../desktop/window-manager/types.js';
import type { WindowId } from '../../desktop/window-manager/types.js';
import { WindowNotFoundError, WindowLimitExceededError, InvalidWindowTransitionError } from '../../desktop/window-manager/errors.js';

describe('WindowManager', () => {
  let wm: WindowManager;
  beforeEach(() => { wm = new WindowManager({ maxWindows: 5 }); });

  describe('lifecycle', () => {
    it('should initialize', async () => { await wm.initialize(); expect(wm.initialized).toBe(true); });
    it('should start', async () => { await wm.initialize(); await wm.start(); expect(wm.initialized).toBe(true); });
    it('should stop and clear', async () => { wm.create({ type: WindowType.Main }); await wm.stop(); expect(wm.count).toBe(0); });
    it('should shutdown', async () => { await wm.initialize(); await wm.shutdown(); expect(wm.initialized).toBe(false); });
    it('should have correct name', () => { expect(wm.name).toBe('WindowManager'); });
    it('should have 0 windows initially', () => { expect(wm.count).toBe(0); });
    it('should have null focused initially', () => { expect(wm.focusedWindow).toBeNull(); });
  });

  describe('create', () => {
    it('should create main window', () => { const w = wm.create({ type: WindowType.Main, title: 'Test' }); expect(w.title).toBe('Test'); expect(w.type).toBe(WindowType.Main); });
    it('should assign unique IDs', () => { const w1 = wm.create({ type: WindowType.Main }); const w2 = wm.create({ type: WindowType.Main }); expect(w1.id).not.toBe(w2.id); });
    it('should set default bounds', () => { const w = wm.create({ type: WindowType.Main }); expect(w.bounds.width).toBe(1024); });
    it('should apply custom bounds', () => { const w = wm.create({ type: WindowType.Main, bounds: { width: 800, height: 600 } }); expect(w.bounds.width).toBe(800); });
    it('should auto-focus new window', () => { const w = wm.create({ type: WindowType.Main }); expect(w.focused).toBe(true); });
    it('should increment count', () => { wm.create({ type: WindowType.Main }); wm.create({ type: WindowType.Conversation }); expect(wm.count).toBe(2); });
    it('should throw on limit exceeded', () => { for (let i = 0; i < 5; i++) wm.create({ type: WindowType.Main }); expect(() => wm.create({ type: WindowType.Main })).toThrow(WindowLimitExceededError); });
    it('should set timestamps', () => { const w = wm.create({ type: WindowType.Main }); expect(w.createdAt).toBeTruthy(); });
    it('should create floating window', () => { const w = wm.create({ type: WindowType.Floating }); expect(w.type).toBe(WindowType.Floating); });
    it('should create settings window', () => { const w = wm.create({ type: WindowType.Settings }); expect(w.type).toBe(WindowType.Settings); });
    it('should create conversation window', () => { const w = wm.create({ type: WindowType.Conversation }); expect(w.type).toBe(WindowType.Conversation); });
    it('should create project window', () => { const w = wm.create({ type: WindowType.Project }); expect(w.type).toBe(WindowType.Project); });
    it('should create diagnostics window', () => { const w = wm.create({ type: WindowType.Diagnostics }); expect(w.type).toBe(WindowType.Diagnostics); });
    it('should use default title when not provided', () => { const w = wm.create({ type: WindowType.Main }); expect(w.title).toBeTruthy(); });
  });

  describe('get', () => {
    it('should get all', () => { wm.create({ type: WindowType.Main }); wm.create({ type: WindowType.Conversation }); expect(wm.getAll().length).toBe(2); });
    it('should get by ID', () => { const w = wm.create({ type: WindowType.Main }); expect(wm.getById(w.id).id).toBe(w.id); });
    it('should throw on non-existent ID', () => { expect(() => wm.getById('bad' as WindowId)).toThrow(WindowNotFoundError); });
    it('should get by type', () => { wm.create({ type: WindowType.Main }); wm.create({ type: WindowType.Main }); wm.create({ type: WindowType.Conversation }); expect(wm.getByType(WindowType.Main).length).toBe(2); });
    it('should get focused window', () => { const w = wm.create({ type: WindowType.Main }); expect(wm.focusedWindow?.id).toBe(w.id); });
    it('should return null focused when empty', () => { expect(wm.focusedWindow).toBeNull(); });
  });

  describe('focus', () => {
    it('should focus window', () => { const w1 = wm.create({ type: WindowType.Main }); const w2 = wm.create({ type: WindowType.Conversation }); wm.focus(w1.id); expect(wm.focusedWindow?.id).toBe(w1.id); });
    it('should throw on non-existent', () => { expect(() => wm.focus('bad' as WindowId)).toThrow(WindowNotFoundError); });
    it('should update zIndex', () => { const w1 = wm.create({ type: WindowType.Main }); const w2 = wm.create({ type: WindowType.Conversation }); const z = wm.getById(w1.id).zIndex; wm.focus(w1.id); expect(wm.getById(w1.id).zIndex).toBeGreaterThan(z); });
    it('should unfocus others', () => { const w1 = wm.create({ type: WindowType.Main }); const w2 = wm.create({ type: WindowType.Conversation }); wm.focus(w1.id); expect(wm.getById(w2.id).focused).toBe(false); });
  });

  describe('state transitions', () => {
    it('should minimize', () => { const w = wm.create({ type: WindowType.Main }); wm.setState(w.id, WindowState.Minimized); expect(wm.getById(w.id).state).toBe(WindowState.Minimized); });
    it('should maximize', () => { const w = wm.create({ type: WindowType.Main }); wm.setState(w.id, WindowState.Maximized); expect(wm.getById(w.id).state).toBe(WindowState.Maximized); });
    it('should restore from minimized', () => { const w = wm.create({ type: WindowType.Main }); wm.setState(w.id, WindowState.Minimized); wm.setState(w.id, WindowState.Active); });
    it('should throw on invalid transition', () => { const w = wm.create({ type: WindowType.Main }); wm.setState(w.id, WindowState.Minimized); expect(() => wm.setState(w.id, WindowState.Hidden as any)).toThrow(InvalidWindowTransitionError); });
    it('should throw on non-existent', () => { expect(() => wm.setState('bad' as WindowId, WindowState.Active)).toThrow(WindowNotFoundError); });
    it('should maximize from minimized', () => { const w = wm.create({ type: WindowType.Main }); wm.setState(w.id, WindowState.Minimized); wm.setState(w.id, WindowState.Maximized); });
  });

  describe('close', () => {
    it('should close window', () => { const w = wm.create({ type: WindowType.Main }); wm.close(w.id); expect(wm.count).toBe(0); });
    it('should focus next on close', () => { const w1 = wm.create({ type: WindowType.Main }); const w2 = wm.create({ type: WindowType.Conversation }); wm.close(w2.id); expect(wm.focusedWindow?.id).toBe(w1.id); });
    it('should handle no other windows', () => { const w = wm.create({ type: WindowType.Main }); wm.close(w.id); expect(wm.focusedWindow).toBeNull(); });
  });

  describe('bounds', () => {
    it('should update bounds', () => { const w = wm.create({ type: WindowType.Main }); wm.updateBounds(w.id, { width: 800 }); expect(wm.getById(w.id).bounds.width).toBe(800); });
    it('should update position', () => { const w = wm.create({ type: WindowType.Main }); wm.updateBounds(w.id, { x: 100, y: 200 }); expect(wm.getById(w.id).bounds.x).toBe(100); });
    it('should throw on non-existent', () => { expect(() => wm.updateBounds('bad' as WindowId, {})).toThrow(WindowNotFoundError); });
    it('should update timestamp', () => { const w = wm.create({ type: WindowType.Main }); const t = w.updatedAt; wm.updateBounds(w.id, { width: 100 }); expect(wm.getById(w.id).updatedAt).not.toBe(t); });
  });

  describe('layout', () => {
    it('should get layout', () => { wm.create({ type: WindowType.Main }); wm.create({ type: WindowType.Conversation }); expect(wm.getLayout().length).toBe(2); });
    it('should restore layout', () => { const w = wm.create({ type: WindowType.Main, bounds: { width: 800 } }); wm.setState(w.id, WindowState.Minimized); const l = wm.getLayout(); wm.updateBounds(w.id, { width: 1920 }); wm.restoreLayout(l); expect(wm.getById(w.id).bounds.width).toBe(800); });
    it('should handle empty restore', () => { expect(() => wm.restoreLayout([])).not.toThrow(); });
  });

  describe('config', () => {
    it('should respect custom maxWindows', () => { const c = new WindowManager({ maxWindows: 2 }); c.create({ type: WindowType.Main }); c.create({ type: WindowType.Main }); expect(() => c.create({ type: WindowType.Main })).toThrow(WindowLimitExceededError); });
  });
});
