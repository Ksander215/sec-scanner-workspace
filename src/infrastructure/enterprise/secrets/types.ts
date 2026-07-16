/** INT-013: Secrets — Types */
export type SecretsBackend = 'vault' | 'aws-secrets' | 'azure-kv' | 'gcp-secret-manager';

export interface SecretsProvider {
  readonly backend: SecretsBackend;
  get(path: string): Promise<SecretEntry | null>;
  set(path: string, value: string, options?: SecretSetOptions): Promise<SecretEntry>;
  delete(path: string): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
  health(): Promise<{ available: boolean }>;
}

export interface SecretEntry {
  path: string;
  value: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, string>;
}

export interface SecretSetOptions {
  metadata?: Record<string, string>;
  ttl?: number;
  version?: number;
}

export interface SecretsConfig {
  backend: SecretsBackend;
  endpoint?: string;
  token?: string;
  namespace?: string;
  mount?: string;
}
