/**
 * Universal AI Provider Runtime — Model Router
 * TASK-AIS-006A.000
 *
 * Selects models based on capabilities, token limit, family,
 * and preference weights.
 */

import type { IModelRouter } from './contracts.js';
import type {
  ProviderId, ModelId, ModelDescriptor,
} from './types.js';

/** Model preference for routing */
interface ModelPreference {
  readonly modelId: ModelId;
  readonly providerId: ProviderId;
  readonly weight: number;
  readonly capabilities: readonly string[];
}

export type { ModelPreference };

export class ModelRouter implements IModelRouter {
  private readonly getModelDescriptors: (providerId: ProviderId) => Promise<readonly ModelDescriptor[]>;
  private readonly preferences: ModelPreference[] = [];

  constructor(
    getModelDescriptors: (providerId: ProviderId) => Promise<readonly ModelDescriptor[]>,
  ) {
    this.getModelDescriptors = getModelDescriptors;
  }

  async selectModel(
    providerId: ProviderId,
    requirements: Readonly<Record<string, unknown>>,
  ): Promise<ModelDescriptor | null> {
    const models = await this.getModelDescriptors(providerId);
    if (models.length === 0) return null;

    let candidates = [...models];

    // Filter by capabilities
    const reqCapabilities = requirements['capabilities'] as readonly string[] | undefined;
    if (reqCapabilities) {
      candidates = candidates.filter(m =>
        reqCapabilities.every(cap =>
          m.capabilities.some(mc => (mc as string) === cap),
        ),
      );
    }

    // Filter by token limit
    const minTokens = requirements['minTokens'] as number | undefined;
    if (minTokens !== undefined) {
      candidates = candidates.filter(m => m.tokenLimit >= minTokens);
    }

    // Filter by family
    const family = requirements['family'] as string | undefined;
    if (family) {
      candidates = candidates.filter(m => m.family === family);
    }

    // Filter available only
    const availableOnly = requirements['availableOnly'] as boolean | undefined;
    if (availableOnly) {
      candidates = candidates.filter(m => m.available);
    }

    if (candidates.length === 0) return null;

    // Sort by preference weight (higher weight = preferred)
    candidates.sort((a, b) => {
      const aWeight = this.getPreferenceWeight(a.id);
      const bWeight = this.getPreferenceWeight(b.id);
      return bWeight - aWeight;
    });

    return candidates[0];
  }

  addPreference(preference: ModelPreference): void {
    this.preferences.push(preference);
  }

  removePreference(modelId: ModelId): void {
    const mid = modelId as string;
    const idx = this.preferences.findIndex(p => (p.modelId as string) === mid);
    if (idx !== -1) {
      this.preferences.splice(idx, 1);
    }
  }

  getPreferences(): readonly ModelPreference[] {
    return this.preferences;
  }

  private getPreferenceWeight(modelId: ModelId): number {
    const mid = modelId as string;
    for (const pref of this.preferences) {
      if ((pref.modelId as string) === mid) {
        return pref.weight;
      }
    }
    return 0;
  }
}
