/**
 * IC-05: ProviderFactory — ARC-001.001 §6
 * FP-06, Z1/Z3. Creates provider instances behind abstraction interfaces.
 * ADR-003: No FP may import any specific provider SDK.
 */
import { ProviderType } from '../types/common.js';

export interface ProviderConfig {
  readonly type: ProviderType;
  readonly name: string;
  readonly endpoint?: string;
  readonly credentials?: Record<string, string>;
}

export interface ProviderInfo {
  readonly type: ProviderType;
  readonly name: string;
  readonly capabilities: readonly string[];
  readonly available: boolean;
}

export interface Provider<T = unknown> {
  readonly type: ProviderType;
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute<R = unknown>(operation: string, input: T): Promise<R>;
}

export interface ProviderFactory {
  createProvider<T>(type: ProviderType, config: ProviderConfig): Promise<Provider<T>>;
  getAvailableProviders(type: ProviderType): ProviderInfo[];
}
