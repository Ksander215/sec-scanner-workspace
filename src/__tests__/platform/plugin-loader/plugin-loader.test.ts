import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformPluginLoader } from '../../../platform/plugin-loader/plugin-loader.js';
import type { PluginManifest } from '../../../platform/types.js';

function makeManifest(id: string): PluginManifest {
  return Object.freeze({
    id, name: `Plugin ${id}`, version: '1.0.0',
    description: 'Test', main: 'index.js', dependencies: [], permissions: [],
  });
}

describe('PlatformPluginLoader', () => {
  let loader: PlatformPluginLoader;
  beforeEach(() => { loader = new PlatformPluginLoader(); });

  it('loads a plugin', async () => {
    const p = await loader.load(makeManifest('p1'));
    expect(p.state).toBe('Loaded');
    expect(p.manifest.id).toBe('p1');
  });
  it('getPlugin returns loaded plugin', async () => {
    await loader.load(makeManifest('p1'));
    expect(loader.getPlugin('p1')).toBeDefined();
  });
  it('getPlugin returns undefined for unknown', () => {
    expect(loader.getPlugin('unknown')).toBeUndefined();
  });
  it('getAllPlugins returns all', async () => {
    await loader.load(makeManifest('p1'));
    await loader.load(makeManifest('p2'));
    expect(loader.getAllPlugins()).toHaveLength(2);
  });
  it('getActivePlugins filters', async () => {
    await loader.load(makeManifest('p1'));
    await loader.load(makeManifest('p2'));
    await loader.activate('p1');
    expect(loader.getActivePlugins()).toHaveLength(1);
  });
  it('activate changes state', async () => {
    await loader.load(makeManifest('p1'));
    await loader.activate('p1');
    expect(loader.getPlugin('p1')?.state).toBe('Active');
  });
  it('deactivate changes state back', async () => {
    await loader.load(makeManifest('p1'));
    await loader.activate('p1');
    await loader.deactivate('p1');
    expect(loader.getPlugin('p1')?.state).toBe('Loaded');
  });
  it('activate throws for unknown', async () => {
    await expect(loader.activate('unknown')).rejects.toThrow();
  });
  it('deactivate throws for unknown', async () => {
    await expect(loader.deactivate('unknown')).rejects.toThrow();
  });
  it('unload removes plugin', async () => {
    await loader.load(makeManifest('p1'));
    expect(await loader.unload('p1')).toBe(true);
    expect(loader.getPlugin('p1')).toBeUndefined();
  });
  it('unload returns false for unknown', async () => {
    expect(await loader.unload('unknown')).toBe(false);
  });
  it('loadedAt is set', async () => {
    const before = Date.now();
    const p = await loader.load(makeManifest('p1'));
    expect(new Date(p.loadedAt).getTime()).toBeGreaterThanOrEqual(before - 1);
  });
});
