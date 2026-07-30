import type { PluginManifest, LoadedPlugin } from '../types.js';

export class PlatformPluginLoader {
  private plugins = new Map<string, LoadedPlugin>();

  async load(manifest: PluginManifest): Promise<LoadedPlugin> {
    const loaded: LoadedPlugin = {
      manifest,
      loadedAt: new Date().toISOString(),
      state: 'Loaded',
    };
    this.plugins.set(manifest.id, loaded);
    return loaded;
  }

  async activate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);
    const entry = plugin as { state: 'Loaded' | 'Active' | 'Error' };
    entry.state = 'Active';
  }

  async deactivate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);
    const entry = plugin as { state: 'Loaded' | 'Active' | 'Error' };
    entry.state = 'Loaded';
  }

  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): readonly LoadedPlugin[] {
    return [...this.plugins.values()];
  }

  getActivePlugins(): readonly LoadedPlugin[] {
    return [...this.plugins.values()].filter((p) => p.state === 'Active');
  }

  async unload(pluginId: string): Promise<boolean> {
    return this.plugins.delete(pluginId);
  }
}
