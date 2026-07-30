/**
 * Configuration Runtime — Unified platform configuration
 * TASK-AIS-005A.000 — Platform Integration Foundation
 *
 * Layers: Default → Environment → User → Override
 * Higher-priority sources override lower-priority ones.
 */
import type { ConfigValue, ConfigSource as ConfigSourceEnum } from '../types.js';
import { ConfigSource } from '../types.js';

export class ConfigurationRuntime implements ConfigurationRuntime {
  private readonly layers = new Map<ConfigSource, Map<string, ConfigValue>>([
    [ConfigSource.Default, new Map()],
    [ConfigSource.Environment, new Map()],
    [ConfigSource.User, new Map()],
    [ConfigSource.Override, new Map()],
  ]);
  private readonly watchers = new Map<string, Set<(newVal: ConfigValue, oldVal: ConfigValue | undefined) => void>>();

  get<T extends ConfigValue>(key: string, defaultValue?: T): T | undefined {
    for (const source of [ConfigSource.Override, ConfigSource.User, ConfigSource.Environment, ConfigSource.Default]) {
      const layer = this.layers.get(source);
      if (layer?.has(key)) {
        return layer.get(key) as T;
      }
    }
    return defaultValue;
  }

  set(key: string, value: ConfigValue): void {
    const oldValue = this.get(key);
    const layer = this.layers.get(ConfigSource.Override);
    layer?.set(key, value);
    this.notifyWatchers(key, value, oldValue);
  }

  has(key: string): boolean {
    for (const layer of this.layers.values()) {
      if (layer.has(key)) return true;
    }
    return false;
  }

  delete(key: string): boolean {
    let deleted = false;
    for (const layer of this.layers.values()) {
      if (layer.delete(key)) deleted = true;
    }
    return deleted;
  }

  getAll(): Readonly<Record<string, ConfigValue>> {
    const result: Record<string, ConfigValue> = {};
    for (const source of [ConfigSource.Default, ConfigSource.Environment, ConfigSource.User, ConfigSource.Override]) {
      const layer = this.layers.get(source);
      if (layer) {
        for (const [k, v] of layer) {
          if (!(k in result)) {
            result[k] = v;
          }
        }
      }
    }
    return Object.freeze(result);
  }

  getSource(key: string): ConfigSourceEnum {
    for (const source of [ConfigSource.Override, ConfigSource.User, ConfigSource.Environment, ConfigSource.Default]) {
      const layer = this.layers.get(source);
      if (layer?.has(key)) return source;
    }
    return ConfigSource.Default;
  }

  loadFrom(source: ConfigSource, data: Readonly<Record<string, ConfigValue>>): void {
    const layer = this.layers.get(source);
    if (!layer) return;
    for (const [k, v] of Object.entries(data)) {
      const oldValue = this.get(k);
      layer.set(k, v);
      this.notifyWatchers(k, v, oldValue);
    }
  }

  snapshot(): Readonly<Record<string, ConfigValue>> {
    return this.getAll();
  }

  onConfigChanged(key: string, callback: (newValue: ConfigValue, oldValue: ConfigValue | undefined) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    this.watchers.get(key)!.add(callback);
    return () => {
      this.watchers.get(key)?.delete(callback);
    };
  }

  private notifyWatchers(key: string, newValue: ConfigValue, oldValue: ConfigValue | undefined): void {
    const cbs = this.watchers.get(key);
    if (!cbs) return;
    for (const cb of cbs) {
      try { cb(newValue, oldValue); } catch { /* watcher isolation */ }
    }
  }
}
