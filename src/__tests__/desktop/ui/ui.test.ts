import { describe, it, expect } from 'vitest';
import { HomeScreen } from '../../../ui/screens/home.js';
import { ConversationScreen } from '../../../ui/screens/conversation.js';
import { ProjectsScreen } from '../../../ui/screens/projects.js';
import { MemoryScreen } from '../../../ui/screens/memory.js';
import { KnowledgeScreen } from '../../../ui/screens/knowledge.js';
import { WorkflowsScreen } from '../../../ui/screens/workflows.js';
import { MarketplaceScreen } from '../../../ui/screens/marketplace.js';
import { SettingsScreen } from '../../../ui/screens/settings.js';
import { DiagnosticsScreen } from '../../../ui/screens/diagnostics.js';

describe('UI Screens — Lifecycle', () => {
  describe('HomeScreen', () => {
    it('should create with screenId', () => { const s = new HomeScreen('screen-home'); expect(s.screenId).toBe('screen-home'); });
    it('should start inactive', () => { const s = new HomeScreen('screen-home'); expect(s.isActive).toBe(false); });
    it('should activate', () => { const s = new HomeScreen('screen-home'); s.activate(); expect(s.isActive).toBe(true); });
    it('should deactivate', () => { const s = new HomeScreen('screen-home'); s.activate(); s.deactivate(); expect(s.isActive).toBe(false); });
    it('should render', () => { const s = new HomeScreen('screen-home'); expect(s.render()).toBe('home-screen'); });
    it('should get state', () => { const s = new HomeScreen('screen-home'); const st = s.getState(); expect(st.screenId).toBe('screen-home'); expect(st.isActive).toBe(false); expect(st.rendered).toBe('home-screen'); });
    it('should get state when active', () => { const s = new HomeScreen('screen-home'); s.activate(); expect(s.getState().isActive).toBe(true); });
  });

  describe('ConversationScreen', () => {
    it('should create with screenId', () => { const s = new ConversationScreen('screen-conversation'); expect(s.screenId).toBe('screen-conversation'); });
    it('should start inactive', () => { expect(new ConversationScreen('c').isActive).toBe(false); });
    it('should activate', () => { const s = new ConversationScreen('c'); s.activate(); expect(s.isActive).toBe(true); });
    it('should deactivate', () => { const s = new ConversationScreen('c'); s.activate(); s.deactivate(); expect(s.isActive).toBe(false); });
    it('should render', () => { expect(new ConversationScreen('c').render()).toBe('conversation-screen'); });
    it('should get state', () => { const s = new ConversationScreen('c'); const st = s.getState(); expect(st.screenId).toBe('c'); expect(st.isActive).toBe(false); expect(st.rendered).toBe('conversation-screen'); });
  });

  describe('ProjectsScreen', () => {
    it('should create with screenId', () => { const s = new ProjectsScreen('screen-projects'); expect(s.screenId).toBe('screen-projects'); });
    it('should start inactive', () => { expect(new ProjectsScreen('p').isActive).toBe(false); });
    it('should activate', () => { const s = new ProjectsScreen('p'); s.activate(); expect(s.isActive).toBe(true); });
    it('should deactivate', () => { const s = new ProjectsScreen('p'); s.activate(); s.deactivate(); expect(s.isActive).toBe(false); });
    it('should render', () => { expect(new ProjectsScreen('p').render()).toBe('projects-screen'); });
    it('should get state', () => { const st = new ProjectsScreen('p').getState(); expect(st.rendered).toBe('projects-screen'); });
  });

  describe('MemoryScreen', () => {
    it('should create with screenId', () => { const s = new MemoryScreen('screen-memory'); expect(s.screenId).toBe('screen-memory'); });
    it('should start inactive', () => { expect(new MemoryScreen('m').isActive).toBe(false); });
    it('should activate', () => { const s = new MemoryScreen('m'); s.activate(); expect(s.isActive).toBe(true); });
    it('should deactivate', () => { const s = new MemoryScreen('m'); s.activate(); s.deactivate(); expect(s.isActive).toBe(false); });
    it('should render', () => { expect(new MemoryScreen('m').render()).toBe('memory-screen'); });
    it('should get state', () => { const st = new MemoryScreen('m').getState(); expect(st.rendered).toBe('memory-screen'); });
  });

  describe('KnowledgeScreen', () => {
    it('should create with screenId', () => { const s = new KnowledgeScreen('screen-knowledge'); expect(s.screenId).toBe('screen-knowledge'); });
    it('should start inactive', () => { expect(new KnowledgeScreen('k').isActive).toBe(false); });
    it('should activate', () => { const s = new KnowledgeScreen('k'); s.activate(); expect(s.isActive).toBe(true); });
    it('should deactivate', () => { const s = new KnowledgeScreen('k'); s.activate(); s.deactivate(); expect(s.isActive).toBe(false); });
    it('should render', () => { expect(new KnowledgeScreen('k').render()).toBe('knowledge-screen'); });
    it('should get state', () => { const st = new KnowledgeScreen('k').getState(); expect(st.rendered).toBe('knowledge-screen'); });
  });

  describe('WorkflowsScreen', () => {
    it('should create with screenId', () => { const s = new WorkflowsScreen('screen-workflows'); expect(s.screenId).toBe('screen-workflows'); });
    it('should start inactive', () => { expect(new WorkflowsScreen('w').isActive).toBe(false); });
    it('should activate', () => { const s = new WorkflowsScreen('w'); s.activate(); expect(s.isActive).toBe(true); });
    it('should deactivate', () => { const s = new WorkflowsScreen('w'); s.activate(); s.deactivate(); expect(s.isActive).toBe(false); });
    it('should render', () => { expect(new WorkflowsScreen('w').render()).toBe('workflows-screen'); });
    it('should get state', () => { const st = new WorkflowsScreen('w').getState(); expect(st.rendered).toBe('workflows-screen'); });
  });

  describe('MarketplaceScreen', () => {
    it('should create with screenId', () => { const s = new MarketplaceScreen('screen-marketplace'); expect(s.screenId).toBe('screen-marketplace'); });
    it('should start inactive', () => { expect(new MarketplaceScreen('m').isActive).toBe(false); });
    it('should activate', () => { const s = new MarketplaceScreen('m'); s.activate(); expect(s.isActive).toBe(true); });
    it('should deactivate', () => { const s = new MarketplaceScreen('m'); s.activate(); s.deactivate(); expect(s.isActive).toBe(false); });
    it('should render', () => { expect(new MarketplaceScreen('m').render()).toBe('marketplace-screen'); });
    it('should get state', () => { const st = new MarketplaceScreen('m').getState(); expect(st.rendered).toBe('marketplace-screen'); });
  });

  describe('SettingsScreen', () => {
    it('should create with screenId', () => { const s = new SettingsScreen('screen-settings'); expect(s.screenId).toBe('screen-settings'); });
    it('should start inactive', () => { expect(new SettingsScreen('s').isActive).toBe(false); });
    it('should activate', () => { const s = new SettingsScreen('s'); s.activate(); expect(s.isActive).toBe(true); });
    it('should deactivate', () => { const s = new SettingsScreen('s'); s.activate(); s.deactivate(); expect(s.isActive).toBe(false); });
    it('should render', () => { expect(new SettingsScreen('s').render()).toBe('settings-screen'); });
    it('should get state', () => { const st = new SettingsScreen('s').getState(); expect(st.rendered).toBe('settings-screen'); });
  });

  describe('DiagnosticsScreen', () => {
    it('should create with screenId', () => { const s = new DiagnosticsScreen('screen-diagnostics'); expect(s.screenId).toBe('screen-diagnostics'); });
    it('should start inactive', () => { expect(new DiagnosticsScreen('d').isActive).toBe(false); });
    it('should activate', () => { const s = new DiagnosticsScreen('d'); s.activate(); expect(s.isActive).toBe(true); });
    it('should deactivate', () => { const s = new DiagnosticsScreen('d'); s.activate(); s.deactivate(); expect(s.isActive).toBe(false); });
    it('should render', () => { expect(new DiagnosticsScreen('d').render()).toBe('diagnostics-screen'); });
    it('should get state', () => { const st = new DiagnosticsScreen('d').getState(); expect(st.rendered).toBe('diagnostics-screen'); });
  });
});

describe('UI Screens — Cross-Screen Behavior', () => {
  it('should support multiple screens active simultaneously', () => {
    const home = new HomeScreen('home'); const conv = new ConversationScreen('conv');
    home.activate(); conv.activate();
    expect(home.isActive).toBe(true); expect(conv.isActive).toBe(true);
  });
  it('should support screen switching', () => {
    const home = new HomeScreen('home'); const proj = new ProjectsScreen('proj');
    home.activate(); home.deactivate(); proj.activate();
    expect(home.isActive).toBe(false); expect(proj.isActive).toBe(true);
  });
  it('should have unique screenIds', () => {
    const screens = [
      new HomeScreen('h'), new ConversationScreen('c'), new ProjectsScreen('p'),
      new MemoryScreen('m'), new KnowledgeScreen('k'), new WorkflowsScreen('w'),
      new MarketplaceScreen('mp'), new SettingsScreen('s'), new DiagnosticsScreen('d'),
    ];
    const ids = screens.map(s => s.screenId);
    expect(new Set(ids).size).toBe(9);
  });
  it('should each render distinct output', () => {
    const renders = [
      new HomeScreen('h').render(), new ConversationScreen('c').render(), new ProjectsScreen('p').render(),
      new MemoryScreen('m').render(), new KnowledgeScreen('k').render(), new WorkflowsScreen('w').render(),
      new MarketplaceScreen('mp').render(), new SettingsScreen('s').render(), new DiagnosticsScreen('d').render(),
    ];
    expect(new Set(renders).size).toBe(9);
  });
  it('should handle repeated activate/deactivate', () => {
    const s = new HomeScreen('h');
    for (let i = 0; i < 10; i++) { s.activate(); expect(s.isActive).toBe(true); s.deactivate(); expect(s.isActive).toBe(false); }
  });
  it('should get consistent state after multiple operations', () => {
    const s = new SettingsScreen('s');
    s.activate(); s.deactivate(); s.activate();
    const st = s.getState();
    expect(st.screenId).toBe('s'); expect(st.isActive).toBe(true); expect(st.rendered).toBe('settings-screen');
  });
});
