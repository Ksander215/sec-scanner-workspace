/**
 * Cognitive Runtime — Model Router
 * TASK-AIS-003I.000
 *
 * Selects the optimal model for a given request based on:
 *   - Cost Policy
 *   - Latency Policy
 *   - Privacy Policy
 *   - Accuracy Policy
 *
 * Also supports custom routing rules and fallback chains.
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

import type {
  ModelDescriptor,
  RoutingPolicyType,
  RoutingRule,
  Intent,
  ModelId,
} from './types.js';
import { NoAvailableModelError } from './cognitive-errors.js';

/**
 * Configuration for Model Router.
 */
export interface ModelRouterConfig {
  readonly defaultModelId: ModelId | null;
  readonly fallbackModelId: ModelId | null;
  readonly rules: readonly RoutingRule[];
}

/**
 * Default Model Router configuration.
 */
export const DefaultModelRouterConfig: ModelRouterConfig = {
  defaultModelId: null,
  fallbackModelId: null,
  rules: [],
};

/**
 * ModelRouter — selects the optimal model based on routing policies.
 */
export class ModelRouter {
  private readonly _config: ModelRouterConfig;
  private readonly _models: Map<string, ModelDescriptor> = new Map();
  private _defaultModel: ModelDescriptor | null = null;
  private _fallbackModel: ModelDescriptor | null = null;

  constructor(config?: Partial<ModelRouterConfig>) {
    this._config = { ...DefaultModelRouterConfig, ...config };
  }

  /**
   * Register a model descriptor.
   */
  registerModel(model: ModelDescriptor): void {
    this._models.set(model.id, model);
    if (this._config.defaultModelId && model.id === this._config.defaultModelId) {
      this._defaultModel = model;
    }
    if (this._config.fallbackModelId && model.id === this._config.fallbackModelId) {
      this._fallbackModel = model;
    }
  }

  /**
   * Unregister a model.
   */
  unregisterModel(modelId: ModelId): void {
    this._models.delete(modelId);
    if (this._defaultModel?.id === modelId) {
      this._defaultModel = null;
    }
    if (this._fallbackModel?.id === modelId) {
      this._fallbackModel = null;
    }
  }

  /**
   * Select the best model for a given intent and policy preferences.
   */
  selectModel(params: {
    intent?: Intent | null;
    policyTypes: readonly RoutingPolicyType[];
    requiredCapabilities?: readonly string[];
    maxTokens?: number;
    privacyRequired?: boolean;
  }): ModelDescriptor {
    const available = this.getAvailableModels(params.requiredCapabilities, params.maxTokens);

    if (available.length === 0) {
      if (this._fallbackModel && this._fallbackModel.available) {
        return this._fallbackModel;
      }
      throw new NoAvailableModelError(
        `requiredCapabilities=[${params.requiredCapabilities?.join(',') ?? 'none'}], maxTokens=${params.maxTokens ?? 'unlimited'}`,
      );
    }

    // Check explicit rules first
    if (params.intent) {
      const ruleMatch = this.matchRules(params.intent, available);
      if (ruleMatch) return ruleMatch;
    }

    // Apply policy-based selection
    if (params.policyTypes.length > 0) {
      return this.selectByPolicy(available, params.policyTypes, params.privacyRequired);
    }

    // Return highest-scoring model
    return this.selectBestScore(available);
  }

  /**
   * Select model by a single policy type.
   */
  selectByPolicyType(
    models: readonly ModelDescriptor[],
    policyType: RoutingPolicyType,
  ): ModelDescriptor {
    const available = models.filter(m => m.available);
    if (available.length === 0) {
      return this._fallbackModel ?? models[0];
    }

    switch (policyType) {
      case 'Cost':
        return available.sort((a, b) => {
          const costA = a.costPer1kInputTokens + a.costPer1kOutputTokens;
          const costB = b.costPer1kInputTokens + b.costPer1kOutputTokens;
          return costA - costB;
        })[0];

      case 'Latency':
        return available.sort((a, b) => a.averageLatencyMs - b.averageLatencyMs)[0];

      case 'Privacy':
        return available.sort((a, b) => b.privacyLevel - a.privacyLevel)[0];

      case 'Accuracy':
        return available.sort((a, b) => b.accuracyScore - a.accuracyScore)[0];

      default:
        return available[0];
    }
  }

  /**
   * Get all registered models.
   */
  listModels(): readonly ModelDescriptor[] {
    return Array.from(this._models.values());
  }

  /**
   * Get a model by ID.
   */
  getModel(modelId: ModelId): ModelDescriptor | undefined {
    return this._models.get(modelId);
  }

  /**
   * Filter models by capabilities and context size.
   */
  private getAvailableModels(
    requiredCapabilities?: readonly string[],
    maxTokens?: number,
  ): ModelDescriptor[] {
    let models = Array.from(this._models.values()).filter(m => m.available);

    if (requiredCapabilities && requiredCapabilities.length > 0) {
      models = models.filter(m =>
        requiredCapabilities.every(cap => m.capabilities.includes(cap)),
      );
    }

    if (maxTokens !== undefined) {
      models = models.filter(m => m.maxContextTokens >= maxTokens);
    }

    return models;
  }

  /**
   * Match explicit routing rules against the intent.
   */
  private matchRules(
    intent: Intent,
    available: ModelDescriptor[],
  ): ModelDescriptor | null {
    for (const rule of this._config.rules) {
      if (this.evaluateCondition(rule.condition, intent)) {
        const model = available.find(m => m.id === rule.modelId);
        if (model) return model;

        if (rule.fallbackModelId) {
          const fallback = available.find(m => m.id === rule.fallbackModelId);
          if (fallback) return fallback;
        }
      }
    }
    return null;
  }

  /**
   * Evaluate a routing condition string against an intent.
   */
  private evaluateCondition(condition: string, intent: Intent): boolean {
    const normalized = condition.toLowerCase();
    return normalized === 'always'
      || intent.type.toString().toLowerCase().includes(normalized)
      || intent.goal.toLowerCase().includes(normalized);
  }

  /**
   * Select model based on multiple policy types (weighted).
   */
  private selectByPolicy(
    models: ModelDescriptor[],
    policyTypes: readonly RoutingPolicyType[],
    privacyRequired?: boolean,
  ): ModelDescriptor {
    if (privacyRequired) {
      const privateModels = models.filter(m => m.privacyLevel >= 3);
      if (privateModels.length > 0) {
        return this.selectBestScore(privateModels);
      }
    }

    const scored = models.map(model => {
      let score = 0;
      for (const policyType of policyTypes) {
        switch (policyType) {
          case 'Cost':
            score -= (model.costPer1kInputTokens + model.costPer1kOutputTokens) * 0.001;
            break;
          case 'Latency':
            score -= model.averageLatencyMs * 0.001;
            break;
          case 'Privacy':
            score += model.privacyLevel * 10;
            break;
          case 'Accuracy':
            score += model.accuracyScore * 10;
            break;
        }
      }
      return { model, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].model;
  }

  /**
   * Select model with best overall score.
   */
  private selectBestScore(models: ModelDescriptor[]): ModelDescriptor {
    return models.sort((a, b) => {
      const scoreA = a.accuracyScore * 0.5 + (1 - a.averageLatencyMs / 10000) * 0.3 + a.privacyLevel * 0.2;
      const scoreB = b.accuracyScore * 0.5 + (1 - b.averageLatencyMs / 10000) * 0.3 + b.privacyLevel * 0.2;
      return scoreB - scoreA;
    })[0];
  }
}
