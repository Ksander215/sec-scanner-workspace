import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { CliConfig, OutputFormat } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

export class ConfigManager {
  private configPath: string;
  private config: CliConfig;

  constructor(configPath?: string) {
    this.configPath = configPath ?? join(homedir(), '.si', 'config.json');
    this.config = { ...DEFAULT_CONFIG };
  }

  async load(): Promise<CliConfig> {
    try {
      const content = await readFile(this.configPath, 'utf-8');
      this.config = { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    } catch {
      this.config = { ...DEFAULT_CONFIG };
    }
    return this.config;
  }

  async save(): Promise<void> {
    const dir = join(this.configPath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  get(): CliConfig {
    return this.config;
  }

  set(key: string, value: string): void {
    const parts = key.split('.');
    let obj: any = this.config;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
  }

  getApiUrl(): string {
    return this.config.api.url;
  }

  getAuthToken(): string | undefined {
    return this.config.auth.token;
  }

  getOutputFormat(): OutputFormat {
    return this.config.output.format;
  }
}
