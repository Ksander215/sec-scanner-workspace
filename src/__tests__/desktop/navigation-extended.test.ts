import { describe, it, expect, beforeEach } from 'vitest';
import { NavigationRuntime } from '../../desktop/navigation-runtime/navigation-runtime.js';
import { ScreenName } from '../../desktop/navigation-runtime/types.js';
import { ScreenNotFoundError, NavigationHistoryError, DuplicateScreenError } from '../../desktop/navigation-runtime/errors.js';

describe('NavigationRuntime — Extended', () => {
  let nav: NavigationRuntime;
  beforeEach(async () => { nav = new NavigationRuntime(); await nav.initialize(); });

  describe('screen registration extended', () => {
    it('should register 20 custom screens', () => { for (let i = 0; i < 20; i++) nav.registerScreen({ id: `custom-${i}` as any, name: ScreenName.Home, path: `/custom/${i}`, title: `Custom ${i}`, order: 100 + i }); expect(nav.getAllScreens().length).toBe(29); });
    it('should maintain order after multiple registrations', () => { nav.registerScreen({ id: 'z' as any, name: ScreenName.Home, path: '/z', title: 'Z', order: 50 }); const screens = nav.getAllScreens(); const first = screens.findIndex(s => s.path === '/z'); expect(screens[first]!.title).toBe('Z'); });
    it('should register screen with all properties', () => { nav.registerScreen({ id: 'full' as any, name: ScreenName.Home, path: '/full', title: 'Full Screen', icon: 'star', order: 100 }); const s = nav.getScreen('/full'); expect(s.title).toBe('Full Screen'); });
    it('should handle rapid register/unregister cycles', () => { for (let i = 0; i < 50; i++) { nav.registerScreen({ id: `r${i}` as any, name: ScreenName.Home, path: `/r${i}`, title: `R${i}`, order: i }); nav.unregisterScreen(`/r${i}`); } expect(nav.getAllScreens().length).toBe(9); });
  });

  describe('navigation extended', () => {
    it('should handle 100 navigations', () => { nav.start(); const paths = ['/', '/conversation', '/projects', '/memory', '/knowledge', '/workflows', '/marketplace', '/settings', '/diagnostics']; for (let i = 0; i < 100; i++) nav.navigate(paths[i % paths.length]); expect(nav.historyCount).toBe(101); });
    it('should handle navigation with various params', () => { nav.start(); nav.navigate('/conversation', { id: '1' }); nav.navigate('/conversation', { id: '2' }); nav.navigate('/projects', { filter: 'active' }); expect(nav.historyCount).toBe(4); });
    it('should handle params with special characters', () => { nav.start(); nav.navigate('/conversation', { q: 'hello world' }); expect(nav.getState().history[1]!.params?.q).toBe('hello world'); });
    it('should handle empty params', () => { nav.start(); nav.navigate('/projects', {}); expect(nav.getState().history[1]!.params).toEqual({}); });
    it('should truncate forward history correctly', () => { nav.start(); nav.navigate('/projects'); nav.navigate('/settings'); nav.navigate('/memory'); nav.goBack(); nav.goBack(); nav.navigate('/knowledge'); expect(nav.getState().canGoForward).toBe(false); expect(nav.currentPath).toBe('/knowledge'); });
  });

  describe('history extended', () => {
    it('should handle back/forward cycles', () => { nav.start(); nav.navigate('/projects'); nav.navigate('/settings'); nav.goBack(); nav.goForward(); nav.goBack(); nav.goForward(); expect(nav.currentPath).toBe('/settings'); });
    it('should handle deep back navigation', () => { nav.start(); const paths = ['/conversation', '/projects', '/memory', '/knowledge', '/workflows', '/marketplace', '/settings', '/diagnostics', '/conversation', '/projects']; for (const p of paths) nav.navigate(p); for (let i = 0; i < 10; i++) nav.goBack(); expect(nav.currentPath).toBe('/'); });
    it('should handle deep forward navigation', () => { nav.start(); const paths = ['/conversation', '/projects', '/memory', '/knowledge', '/workflows', '/marketplace', '/settings', '/diagnostics', '/conversation', '/projects']; for (const p of paths) nav.navigate(p); for (let i = 0; i < 5; i++) nav.goBack(); for (let i = 0; i < 5; i++) nav.goForward(); expect(nav.currentPath).toBe('/projects'); });
    it('should report canGoBack/Forward correctly throughout lifecycle', () => { expect(nav.getState().canGoBack).toBe(false); expect(nav.getState().canGoForward).toBe(false); nav.start(); expect(nav.getState().canGoBack).toBe(false); nav.navigate('/projects'); expect(nav.getState().canGoBack).toBe(true); expect(nav.getState().canGoForward).toBe(false); nav.goBack(); expect(nav.getState().canGoForward).toBe(true); });
  });

  describe('getState extended', () => {
    it('should return correct state after complex navigation', async () => { nav.start(); nav.navigate('/projects'); nav.navigate('/settings'); nav.goBack(); nav.navigate('/memory'); const st = nav.getState(); expect(st.current?.path).toBe('/memory'); expect(st.history.length).toBe(3); expect(st.historyIndex).toBe(2); });
    it('should reflect params in state', () => { nav.start(); nav.navigate('/conversation', { id: 'abc' }); const entry = nav.getState().history[1]; expect(entry!.params?.id).toBe('abc'); });
    it('should reflect timestamps in entries', () => { nav.start(); nav.navigate('/projects'); const entry = nav.getState().history[1]; expect(entry!.timestamp).toBeGreaterThan(0); });
  });

  describe('screen lookup extended', () => {
    it('should find all 9 default screens by name', () => { const names = [ScreenName.Home, ScreenName.Conversation, ScreenName.Projects, ScreenName.Memory, ScreenName.Knowledge, ScreenName.Workflows, ScreenName.Marketplace, ScreenName.Settings, ScreenName.Diagnostics]; for (const name of names) { expect(nav.getScreenByName(name)).not.toBeNull(); } });
    it('should return all paths in order', () => { const paths = nav.getAllScreens().map(s => s.path); expect(paths).toEqual(['/', '/conversation', '/projects', '/memory', '/knowledge', '/workflows', '/marketplace', '/settings', '/diagnostics']); });
  });

  describe('edge cases extended', () => {
    it('should handle stop and clear history', async () => { nav.start(); nav.navigate('/projects'); nav.navigate('/settings'); await nav.stop(); expect(nav.historyCount).toBe(0); });
    it('should handle shutdown and clear screens', async () => { await nav.shutdown(); expect(nav.getAllScreens().length).toBe(0); expect(nav.initialized).toBe(false); });
    it('should handle reinitialization', async () => { await nav.shutdown(); await nav.initialize(); expect(nav.getAllScreens().length).toBe(9); });
    it('should handle multiple start calls', async () => { nav.start(); nav.start(); expect(nav.historyCount).toBe(2); });
  });
});
