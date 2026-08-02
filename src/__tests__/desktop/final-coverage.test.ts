import { describe, it, expect } from 'vitest';
import { HomeScreen } from '../../ui/screens/home.js';
import { ConversationScreen } from '../../ui/screens/conversation.js';
import { ProjectsScreen } from '../../ui/screens/projects.js';
import { MemoryScreen } from '../../ui/screens/memory.js';
import { KnowledgeScreen } from '../../ui/screens/knowledge.js';
import { WorkflowsScreen } from '../../ui/screens/workflows.js';
import { MarketplaceScreen } from '../../ui/screens/marketplace.js';
import { SettingsScreen } from '../../ui/screens/settings.js';
import { DiagnosticsScreen } from '../../ui/screens/diagnostics.js';
import { GoalsScreen } from '../../ui/screens/goals.js';
import { SolutionsScreen } from '../../ui/screens/solutions.js';
import { AnalyticsScreen } from '../../ui/screens/analytics.js';
import { NavigationRuntime } from '../../desktop/navigation-runtime/navigation-runtime.js';
import { ScreenName } from '../../desktop/navigation-runtime/types.js';

describe('Final Coverage — Screen + Navigation Mapping', () => {
  const screenClasses = [HomeScreen, ConversationScreen, ProjectsScreen, MemoryScreen, KnowledgeScreen, WorkflowsScreen, MarketplaceScreen, SettingsScreen, DiagnosticsScreen, GoalsScreen, SolutionsScreen, AnalyticsScreen];
  const screenNames = [ScreenName.Home, ScreenName.Conversation, ScreenName.Projects, ScreenName.Memory, ScreenName.Knowledge, ScreenName.Workflows, ScreenName.Marketplace, ScreenName.Settings, ScreenName.Diagnostics, ScreenName.Goals, ScreenName.Solutions, ScreenName.Analytics];
  const screenPaths = ['/', '/conversation', '/projects', '/memory', '/knowledge', '/workflows', '/marketplace', '/settings', '/diagnostics', '/goals', '/solutions', '/analytics'];

  it('should have exactly 12 screens matching 12 navigation entries', async () => {
    const nav = new NavigationRuntime();
    await nav.initialize();
    expect(screenClasses.length).toBe(12);
    expect(nav.getAllScreens().length).toBe(12);
  });

  it('should have each screen name in navigation', async () => {
    const nav = new NavigationRuntime();
    await nav.initialize();
    for (const name of screenNames) {
      expect(nav.getScreenByName(name)).not.toBeNull();
    }
  });

  it('should have each screen path in navigation', async () => {
    const nav = new NavigationRuntime();
    await nav.initialize();
    for (const path of screenPaths) {
      expect(() => nav.getScreen(path)).not.toThrow();
    }
  });

  it('should map screens to navigation by index', async () => {
    const nav = new NavigationRuntime();
    await nav.initialize();
    const screens = nav.getAllScreens();
    for (let i = 0; i < 12; i++) {
      expect(screens[i]!.name).toBe(screenNames[i]);
      expect(screens[i]!.path).toBe(screenPaths[i]);
    }
  });

  it('should navigate to each screen path successfully', async () => {
    const nav = new NavigationRuntime();
    await nav.initialize();
    nav.start();
    for (const path of screenPaths) {
      nav.navigate(path);
      expect(nav.currentPath).toBe(path);
    }
  });

  it('should create all screen instances with correct screenIds', () => {
    for (let i = 0; i < 12; i++) {
      const s = new screenClasses[i](`screen-${i}`);
      expect(s.screenId).toBe(`screen-${i}`);
      expect(s.isActive).toBe(false);
    }
  });

  it('should activate all screens in sequence', () => {
    const instances = screenClasses.map((Cls, i) => new Cls(`s${i}`));
    for (const s of instances) s.activate();
    for (const s of instances) expect(s.isActive).toBe(true);
    for (const s of instances) s.deactivate();
    for (const s of instances) expect(s.isActive).toBe(false);
  });
});
