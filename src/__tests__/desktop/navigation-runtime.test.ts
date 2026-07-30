import { describe, it, expect, beforeEach } from 'vitest';
import { NavigationRuntime } from '../../desktop/navigation-runtime/navigation-runtime.js';
import { ScreenName } from '../../desktop/navigation-runtime/types.js';
import { ScreenNotFoundError, NavigationHistoryError, DuplicateScreenError } from '../../desktop/navigation-runtime/errors.js';

describe('NavigationRuntime', () => {
  let nav: NavigationRuntime;
  beforeEach(async () => { nav = new NavigationRuntime(); await nav.initialize(); });

  describe('lifecycle', () => {
    it('should initialize', () => { expect(nav.initialized).toBe(true); });
    it('should have correct name', () => { expect(nav.name).toBe('NavigationRuntime'); });
    it('should start with home', async () => { await nav.start(); expect(nav.currentPath).toBe('/'); });
    it('should stop and clear', async () => { await nav.stop(); expect(nav.historyCount).toBe(0); });
    it('should shutdown and clear', async () => { await nav.shutdown(); expect(nav.getAllScreens().length).toBe(0); });
  });

  describe('screens', () => {
    it('should have 9 default screens', () => { expect(nav.getAllScreens().length).toBe(9); });
    it('should be in order', () => { const s = nav.getAllScreens(); expect(s[0]!.name).toBe(ScreenName.Home); expect(s[8]!.name).toBe(ScreenName.Diagnostics); });
    it('should register custom', () => { nav.registerScreen({ id: 'x' as any, name: ScreenName.Home, path: '/custom', title: 'Custom', order: 10 }); expect(nav.getAllScreens().length).toBe(10); });
    it('should throw on duplicate path', () => { expect(() => nav.registerScreen({ id: 'd' as any, name: ScreenName.Home, path: '/', title: 'D', order: 99 })).toThrow(DuplicateScreenError); });
    it('should unregister', () => { nav.unregisterScreen('/'); expect(nav.getAllScreens().length).toBe(8); });
    it('should get by path', () => { expect(nav.getScreen('/').title).toBe('Home'); });
    it('should throw on missing path', () => { expect(() => nav.getScreen('/no')).toThrow(ScreenNotFoundError); });
    it('should get by name', () => { expect(nav.getScreenByName(ScreenName.Settings)?.path).toBe('/settings'); });
    it('should return null for missing name', () => { expect(nav.getScreenByName('X' as any)).toBeNull(); });
  });

  describe('navigation', () => {
    it('should navigate', () => { nav.navigate('/projects'); expect(nav.currentPath).toBe('/projects'); });
    it('should build history', () => { nav.navigate('/projects'); nav.navigate('/settings'); expect(nav.historyCount).toBe(3); });
    it('should navigate with params', () => { nav.navigate('/conversation', { id: '123' }); expect(nav.getState().history[1]!.params).toEqual({ id: '123' }); });
    it('should truncate forward history', () => { nav.navigate('/projects'); nav.navigate('/settings'); nav.goBack(); nav.navigate('/memory'); expect(nav.getState().canGoForward).toBe(false); });
  });

  describe('history', () => {
    it('should go back', () => { nav.navigate('/projects'); nav.goBack(); expect(nav.currentPath).toBe('/'); });
    it('should throw on goBack at start', () => { expect(() => nav.goBack()).toThrow(NavigationHistoryError); });
    it('should go forward', () => { nav.navigate('/projects'); nav.goBack(); nav.goForward(); expect(nav.currentPath).toBe('/projects'); });
    it('should throw on goForward at end', () => { expect(() => nav.goForward()).toThrow(NavigationHistoryError); });
    it('should report canGoBack', () => { expect(nav.getState().canGoBack).toBe(false); nav.navigate('/projects'); expect(nav.getState().canGoBack).toBe(true); });
    it('should report canGoForward', () => { expect(nav.getState().canGoForward).toBe(false); nav.navigate('/projects'); nav.goBack(); expect(nav.getState().canGoForward).toBe(true); });
  });

  describe('getState', () => {
    it('should return current screen', () => { expect(nav.getState().current?.title).toBe('Home'); });
    it('should return full history', () => { nav.navigate('/projects'); expect(nav.getState().history.length).toBe(2); });
    it('should return correct index', () => { nav.navigate('/projects'); nav.navigate('/settings'); expect(nav.getState().historyIndex).toBe(2); });
    it('should return null before start', () => { const n = new NavigationRuntime(); expect(n.getState().current).toBeNull(); });
  });
});
