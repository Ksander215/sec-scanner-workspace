import { readFile, watch } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PlatformConfiguration, ConfigSource, ConfigChangeEvent, ConfigChangeHandler, ConfigValidationResult, ConfigMigration } from './types.js';
import { DEFAULT_CONFIGURATION } from './defaults.js';
import { PLATFORM_CONFIG_SCHEMA } from './schema.js';
import { ConfigValidator } from './validator.js';
import { SecretsResolver } from './secrets.js';
import { CONFIG_MIGRATIONS } from './migrations.js';

export class ConfigurationEngine {
  private config: PlatformConfiguration;
  private sourceMap: Record<string, ConfigSource> = {};
  private changeHandlers: ConfigChangeHandler[] = [];
  private validator: ConfigValidator;
  private secretsResolver: SecretsResolver;
  private configPath: string;
  private watcher: AbortController | null = null;

  constructor(configPath?: string) {
    this.configPath = configPath ?? './config';
    this.config = this.deepClone(DEFAULT_CONFIGURATION);
    this.validator = new ConfigValidator(PLATFORM_CONFIG_SCHEMA);
    this.secretsResolver = new SecretsResolver();
  }

  /** Load configuration with layered resolution */
  async load(): Promise<PlatformConfiguration> {
    // Layer 1: Defaults (already set)
    this.markSource('defaults', 'defaults');

    // Layer 2: config.yaml
    const baseConfig = await this.loadYamlFile(join(this.configPath, 'config.yaml'));
    if (baseConfig) {
      this.merge(baseConfig, 'config-file');
    }

    // Layer 3: config.local.yaml
    const localConfig = await this.loadYamlFile(join(this.configPath, 'config.local.yaml'));
    if (localConfig) {
      this.merge(localConfig, 'local-override');
    }

    // Layer 4: Environment variables
    this.applyEnvironment('environment');

    // Layer 5: CLI flags are applied externally via applyCliFlags()

    // Resolve secrets
    const resolved = this.secretsResolver.resolveAll(this.config as unknown as Record<string, unknown>);
    Object.assign(this.config, resolved);

    // Run migrations
    await this.runMigrations();

    // Validate
    const result = this.validate();
    if (!result.valid) {
      const errorMessages = result.errors.map(e => `${e.path}: ${e.message}`).join('; ');
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }

    // Update metadata
    this.config.$meta.loadedAt = new Date().toISOString();
    this.config.$meta.source = this.sourceMap;

    return this.config;
  }

  /** Apply CLI flag overrides */
  applyCliFlags(flags: Record<string, unknown>): void {
    this.merge(flags as Partial<PlatformConfiguration>, 'cli-flags');
  }

  /** Get the current configuration */
  get(): Readonly<PlatformConfiguration> {
    return this.config;
  }

  /** Get a specific config value by dot-notation path */
  get<T = unknown>(path: string): T {
    const parts = path.split('.');
    let current: unknown = this.config;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') return undefined as T;
      current = (current as Record<string, unknown>)[part];
    }
    return current as T;
  }

  /** Set a config value (triggers change handlers) */
  set(path: string, value: unknown, source: ConfigSource = 'cli-flags'): void {
    const oldValue = this.get(path);
    const parts = path.split('.');
    let current: Record<string, unknown> = this.config as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
    this.sourceMap[path] = source;

    // Fire change handlers
    const event: ConfigChangeEvent = { key: path, oldValue, newValue: value, source, timestamp: new Date() };
    for (const handler of this.changeHandlers) {
      try { handler(event); } catch { /* ignore handler errors */ }
    }
  }

  /** Validate the current configuration */
  validate(): ConfigValidationResult {
    return this.validator.validate(this.config as unknown as Record<string, unknown>);
  }

  /** Register change handler for hot reload */
  onChange(handler: ConfigChangeHandler): void {
    this.changeHandlers.push(handler);
  }

  /** Enable hot reload watching config files */
  async watchForChanges(): Promise<void> {
    const configDir = this.configPath;
    if (!existsSync(configDir)) return;

    this.watcher = new AbortController();
    try {
      const watcher = watch(configDir, { signal: this.watcher.signal });
      for await (const _event of watcher) {
        await this.load();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Config watcher error:', err);
      }
    }
  }

  /** Stop watching for changes */
  stopWatching(): void {
    this.watcher?.abort();
    this.watcher = null;
  }

  /** Get masked configuration for safe display */
  getMasked(): Record<string, unknown> {
    const secretKeys = new Set<string>();
    for (const [path, schema] of Object.entries(PLATFORM_CONFIG_SCHEMA.properties)) {
      if (schema.secret) secretKeys.add(path);
    }
    return this.secretsResolver.maskForDisplay(this.config as unknown as Record<string, unknown>, secretKeys);
  }

  /** Get config schema */
  getSchema() {
    return PLATFORM_CONFIG_SCHEMA;
  }

  private async loadYamlFile(filePath: string): Promise<Record<string, unknown> | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      // Simple YAML-like parsing (key: value pairs, nested with indentation)
      return this.parseSimpleConfig(content);
    } catch {
      return null;
    }
  }

  private parseSimpleConfig(content: string): Record<string, unknown> {
    // For a full implementation, use a YAML library.
    // Here we do a simplified JSON-like parse as fallback.
    try {
      return JSON.parse(content);
    } catch {
      // Try simple key=value parsing
      const result: Record<string, unknown> = {};
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          result[key] = this.parseValue(val);
        }
      }
      return result;
    }
  }

  private parseValue(val: string): unknown {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null') return null;
    if (/^\d+$/.test(val)) return parseInt(val, 10);
    if (/^\d+\.\d+$/.test(val)) return parseFloat(val);
    if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
    return val;
  }

  private merge(partial: Partial<PlatformConfiguration>, source: ConfigSource): void {
    const merge = (target: Record<string, unknown>, source_: Record<string, unknown>, prefix: string) => {
      for (const [key, value] of Object.entries(source_)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object' && !Array.isArray(value) && typeof target[key] === 'object' && target[key] !== null) {
          merge(target[key] as Record<string, unknown>, value as Record<string, unknown>, fullKey);
        } else {
          target[key] = value;
          this.sourceMap[fullKey] = source;
        }
      }
    };
    merge(this.config as unknown as Record<string, unknown>, partial as Record<string, unknown>, '');
  }

  private applyEnvironment(source: ConfigSource): void {
    for (const [path, schema] of Object.entries(PLATFORM_CONFIG_SCHEMA.properties)) {
      if (schema.env) {
        const envValue = process.env[schema.env];
        if (envValue !== undefined) {
          this.set(path, this.parseValue(envValue), source);
        }
      }
    }
  }

  private async runMigrations(): Promise<void> {
    const currentVersion = this.config.$meta?.version ?? 1;
    let config = this.config as unknown as Record<string, unknown>;

    const sortedMigrations = [...CONFIG_MIGRATIONS].sort((a, b) => a.fromVersion - b.fromVersion);
    for (const migration of sortedMigrations) {
      if (currentVersion <= migration.fromVersion) {
        config = migration.migrate(config);
      }
    }
    this.config = config as PlatformConfiguration;
  }

  private markSource(_source: ConfigSource, prefix: string): void {
    this.sourceMap[prefix] = 'defaults';
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
