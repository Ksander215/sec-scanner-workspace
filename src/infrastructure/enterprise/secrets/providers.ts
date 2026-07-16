/** INT-013: Secrets — Provider Implementations */
import type { SecretsProvider, SecretsBackend, SecretEntry, SecretSetOptions, SecretsConfig } from './types.js';

export class VaultSecretsProvider implements SecretsProvider {
  readonly backend: SecretsBackend = 'vault';
  private config: SecretsConfig;
  private secrets: Map<string, SecretEntry> = new Map();

  constructor(config: SecretsConfig) { this.config = config; }
  async get(path: string): Promise<SecretEntry | null> { return this.secrets.get(path) ?? null; }
  async set(path: string, value: string, options?: SecretSetOptions): Promise<SecretEntry> {
    const existing = this.secrets.get(path);
    const entry: SecretEntry = { path, value, version: (existing?.version ?? 0) + 1, createdAt: existing?.createdAt ?? new Date(), updatedAt: new Date(), metadata: options?.metadata };
    this.secrets.set(path, entry); return entry;
  }
  async delete(path: string): Promise<boolean> { return this.secrets.delete(path); }
  async list(prefix: string): Promise<string[]> { return [...this.secrets.keys()].filter(k => k.startsWith(prefix)); }
  async health() { return { available: true }; }
}

export class AwsSecretsProvider implements SecretsProvider {
  readonly backend: SecretsBackend = 'aws-secrets';
  private config: SecretsConfig;
  private secrets: Map<string, SecretEntry> = new Map();
  constructor(config: SecretsConfig) { this.config = config; }
  async get(path: string): Promise<SecretEntry | null> { return this.secrets.get(path) ?? null; }
  async set(path: string, value: string, options?: SecretSetOptions): Promise<SecretEntry> {
    const existing = this.secrets.get(path);
    const entry: SecretEntry = { path, value, version: (existing?.version ?? 0) + 1, createdAt: existing?.createdAt ?? new Date(), updatedAt: new Date(), metadata: options?.metadata };
    this.secrets.set(path, entry); return entry;
  }
  async delete(path: string): Promise<boolean> { return this.secrets.delete(path); }
  async list(prefix: string): Promise<string[]> { return [...this.secrets.keys()].filter(k => k.startsWith(prefix)); }
  async health() { return { available: true }; }
}

export class AzureKvSecretsProvider implements SecretsProvider {
  readonly backend: SecretsBackend = 'azure-kv';
  private config: SecretsConfig;
  private secrets: Map<string, SecretEntry> = new Map();
  constructor(config: SecretsConfig) { this.config = config; }
  async get(path: string): Promise<SecretEntry | null> { return this.secrets.get(path) ?? null; }
  async set(path: string, value: string, options?: SecretSetOptions): Promise<SecretEntry> {
    const existing = this.secrets.get(path);
    const entry: SecretEntry = { path, value, version: (existing?.version ?? 0) + 1, createdAt: existing?.createdAt ?? new Date(), updatedAt: new Date(), metadata: options?.metadata };
    this.secrets.set(path, entry); return entry;
  }
  async delete(path: string): Promise<boolean> { return this.secrets.delete(path); }
  async list(prefix: string): Promise<string[]> { return [...this.secrets.keys()].filter(k => k.startsWith(prefix)); }
  async health() { return { available: true }; }
}

export class GcpSecretManagerProvider implements SecretsProvider {
  readonly backend: SecretsBackend = 'gcp-secret-manager';
  private config: SecretsConfig;
  private secrets: Map<string, SecretEntry> = new Map();
  constructor(config: SecretsConfig) { this.config = config; }
  async get(path: string): Promise<SecretEntry | null> { return this.secrets.get(path) ?? null; }
  async set(path: string, value: string, options?: SecretSetOptions): Promise<SecretEntry> {
    const existing = this.secrets.get(path);
    const entry: SecretEntry = { path, value, version: (existing?.version ?? 0) + 1, createdAt: existing?.createdAt ?? new Date(), updatedAt: new Date(), metadata: options?.metadata };
    this.secrets.set(path, entry); return entry;
  }
  async delete(path: string): Promise<boolean> { return this.secrets.delete(path); }
  async list(prefix: string): Promise<string[]> { return [...this.secrets.keys()].filter(k => k.startsWith(prefix)); }
  async health() { return { available: true }; }
}

export function createSecretsProvider(config: SecretsConfig): SecretsProvider {
  switch (config.backend) {
    case 'vault': return new VaultSecretsProvider(config);
    case 'aws-secrets': return new AwsSecretsProvider(config);
    case 'azure-kv': return new AzureKvSecretsProvider(config);
    case 'gcp-secret-manager': return new GcpSecretManagerProvider(config);
  }
}
