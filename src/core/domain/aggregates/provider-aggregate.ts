/**
 * Provider Aggregate — DOM-002.000 §3.4
 * Root: ProviderInfo
 * Members: ProviderInfo, ProviderType
 * Invariants: INV-006 (no access without credentials)
 * Entry Point: ProviderInfo.register(type, name, endpoint, credentials)
 */
import type { ProviderInfo } from '../entities/provider-info.js';

export interface ProviderAggregate {
  readonly root: ProviderInfo;
}

/**
 * INV-006: No provider access without valid credentials and declared ProviderType.
 */
export function assertProviderHasCredentials(provider: ProviderInfo): void {
  if (!provider.credentialsRef) {
    throw new Error('INV-006 violated: provider without valid credentials');
  }
}
