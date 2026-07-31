/**
 * Universal AI Provider Runtime — Failover Engine
 * TASK-AIS-006A.000
 *
 * Manages failover chains: ordered sequences of provider+model pairs.
 * Tracks which provider was used in a chain and returns the next one.
 */

import type { IFailoverEngine } from './contracts.js';
import type {
  ProviderId, ModelId, ExecutionId, FailoverChain,
  FailoverEvent, FailoverEngineConfig,
} from './types.js';

export class FailoverEngine implements IFailoverEngine {
  private readonly config: FailoverEngineConfig;
  private readonly chains = new Map<string, FailoverChain>();
  private readonly failovers = new Map<string, FailoverEvent[]>();
  private defaultChainId: string | null = null;

  constructor(config: FailoverEngineConfig) {
    this.config = config;
  }

  async defineChain(chain: FailoverChain): Promise<void> {
    this.chains.set(chain.id, Object.freeze(chain));
    if (this.defaultChainId === null) {
      this.defaultChainId = chain.id;
    }
  }

  async removeChain(chainId: string): Promise<void> {
    this.chains.delete(chainId);
    if (this.defaultChainId === chainId) {
      this.defaultChainId = this.chains.keys().next().value ?? null;
    }
  }

  async getNextProvider(
    executionId: ExecutionId,
    currentProviderId: ProviderId,
  ): Promise<{ providerId: ProviderId; modelId: ModelId } | null> {
    const chain = this.defaultChainId ? this.chains.get(this.defaultChainId) : null;
    if (!chain) return null;

    // Find the current provider in the chain, then return the next enabled one
    const entries = chain.providers;
    let foundIndex = -1;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].providerId === currentProviderId) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex === -1) {
      // Current provider not in chain — return first enabled entry
      for (const entry of entries) {
        if (entry.enabled) {
          return { providerId: entry.providerId, modelId: entry.modelId };
        }
      }
      return null;
    }

    // Look for the next enabled provider after the current one
    for (let i = foundIndex + 1; i < entries.length; i++) {
      if (entries[i].enabled) {
        return { providerId: entries[i].providerId, modelId: entries[i].modelId };
      }
    }

    // Wrap around if chain allows (check max failovers)
    const eid = executionId as string;
    const history = this.failovers.get(eid) ?? [];
    if (history.length < this.config.maxFailovers) {
      for (const entry of entries) {
        if (entry.enabled && entry.providerId !== currentProviderId) {
          return { providerId: entry.providerId, modelId: entry.modelId };
        }
      }
    }

    return null;
  }

  recordFailover(event: FailoverEvent): void {
    const eid = event.executionId as string;
    const list = this.failovers.get(eid) ?? [];
    list.push(event);
    this.failovers.set(eid, list);
  }

  getFailovers(executionId: string): readonly FailoverEvent[] {
    return this.failovers.get(executionId) ?? [];
  }

  getDefaultChain(): FailoverChain | null {
    if (!this.defaultChainId) return null;
    return this.chains.get(this.defaultChainId) ?? null;
  }
}
