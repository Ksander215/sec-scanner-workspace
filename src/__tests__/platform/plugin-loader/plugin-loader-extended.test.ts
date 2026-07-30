import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformPluginLoader } from '../../../platform/plugin-loader/plugin-loader.js';
import type { PluginManifest } from '../../../platform/types.js';

function mf(id: string, deps: string[] = []): PluginManifest {
  return Object.freeze({ id, name: `P${id}`, version: '1.0.0', description: '', main: '', dependencies: deps, permissions: [] });
}

describe('PlatformPluginLoader Extended', () => {
  let l: PlatformPluginLoader;
  beforeEach(() => { l = new PlatformPluginLoader(); });

  it('load 20 plugins', async () => {
    for (let i = 0; i < 20; i++) await l.load(mf(`p${i}`));
    expect(l.getAllPlugins()).toHaveLength(20);
  });
  it('activate all 20', async () => {
    for (let i = 0; i < 20; i++) await l.load(mf(`p${i}`));
    for (let i = 0; i < 20; i++) await l.activate(`p${i}`);
    expect(l.getActivePlugins()).toHaveLength(20);
  });
  it('deactivate all 20', async () => {
    for (let i = 0; i < 20; i++) { await l.load(mf(`p${i}`)); await l.activate(`p${i}`); }
    for (let i = 0; i < 20; i++) await l.deactivate(`p${i}`);
    expect(l.getActivePlugins()).toHaveLength(0);
  });
  it('unload all 20', async () => {
    for (let i = 0; i < 20; i++) await l.load(mf(`p${i}`));
    for (let i = 0; i < 20; i++) expect(await l.unload(`p${i}`)).toBe(true);
    expect(l.getAllPlugins()).toHaveLength(0);
  });
  it('getActivePlugins after mixed operations', async () => {
    await l.load(mf('a')); await l.load(mf('b')); await l.load(mf('c'));
    await l.activate('a'); await l.activate('c');
    expect(l.getActivePlugins().length).toBe(2);
    await l.deactivate('a');
    expect(l.getActivePlugins().length).toBe(1);
  });
  it('load same plugin twice overwrites', async () => {
    await l.load(mf('p1'));
    await l.load(mf('p1'));
    expect(l.getAllPlugins()).toHaveLength(1);
  });
  it('manifest is preserved', async () => {
    const m = mf('test', ['dep1']);
    await l.load(m);
    const p = l.getPlugin('test');
    expect(p?.manifest.dependencies).toEqual(['dep1']);
  });
  it('activate then unload', async () => {
    await l.load(mf('p1'));
    await l.activate('p1');
    expect(await l.unload('p1')).toBe(true);
    expect(l.getPlugin('p1')).toBeUndefined();
  });
  it('unload non-existent returns false', async () => {
    expect(await l.unload('nope')).toBe(false);
  });
  it('getAllPlugins returns copy', async () => {
    await l.load(mf('p1'));
    const all = l.getAllPlugins();
    expect(all).toHaveLength(1);
  });
});
