/**
 * Universal AI Provider Runtime — Provider Router
 * TASK-AIS-006A.000
 *
 * Routes execution requests to providers based on priority-sorted rules.
 */

import type { IProviderRouter } from './contracts.js';
import type {
  ProviderId, ModelId, ExecutionRequest,
} from './types.js';

/** Routing rule for provider selection */
interface RoutingRule {
  readonly id: string;
  readonly name: string;
  readonly condition: (request: ExecutionRequest) => boolean;
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
  readonly priority: number;
}

export type { RoutingRule };

export class ProviderRouter implements IProviderRouter {
  private readonly defaultProviderId: ProviderId | undefined;
  private readonly defaultModelId: ModelId | undefined;
  private readonly rules: RoutingRule[] = [];

  constructor(
    defaultProviderId?: string,
    defaultModelId?: string,
  ) {
    this.defaultProviderId = defaultProviderId as ProviderId | undefined;
    this.defaultModelId = defaultModelId as ModelId | undefined;
  }

  async route(
    request: ExecutionRequest,
  ): Promise<{ providerId: ProviderId; modelId: ModelId }> {
    // Sort rules by priority (lower number = higher priority)
    const sorted = [...this.rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sorted) {
      if (rule.condition(request)) {
        return {
          providerId: rule.providerId,
          modelId: rule.modelId,
        };
      }
    }

    // Fall back to request's own provider/model, then defaults
    return {
      providerId: request.providerId ?? this.defaultProviderId ?? ('' as ProviderId),
      modelId: request.modelId ?? this.defaultModelId ?? ('' as ModelId),
    };
  }

  addRule(rule: RoutingRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    const idx = this.rules.findIndex(r => r.id === ruleId);
    if (idx !== -1) {
      this.rules.splice(idx, 1);
    }
  }

  listRules(): readonly RoutingRule[] {
    return this.rules;
  }
}
