/**
 * AI Configuration Runtime Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Configures AI provider settings for solutions with sensible defaults
 * and per-solution overrides (provider, model, temperature, cost strategy).
 * Emits AIConfiguredEvent via the event bus.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, AIConfigId, AIConfiguration,
  AIProviderType, CostStrategy,
} from './types.js';
import { brandAIConfigId, AIProviderType as AIProv, CostStrategy as CStrat } from './types.js';
import type { IAIConfigRuntime, AIConfigOverrides } from './contracts.js';
import type { AIConfigRuntimeConfig } from './types.js';
import { AIConfigurationError } from './errors.js';
import type { AIConfiguredEvent } from './events.js';

/** Default model catalog per provider */
const PROVIDER_MODELS: Readonly<Record<AIProviderType, string>> = Object.freeze({
  [AIProv.OpenAI]: 'gpt-4o',
  [AIProv.Anthropic]: 'claude-sonnet-4-20250514',
  [AIProv.Google]: 'gemini-2.0-flash',
  [AIProv.Local]: 'llama-3.1-70b',
  [AIProv.Custom]: 'custom-model',
});

/** Estimated context window per provider default model (tokens) */
const CONTEXT_WINDOWS: Readonly<Record<AIProviderType, string>> = Object.freeze({
  [AIProv.OpenAI]: '128k',
  [AIProv.Anthropic]: '200k',
  [AIProv.Google]: '1M',
  [AIProv.Local]: '128k',
  [AIProv.Custom]: 'configurable',
});

/** Estimated latency per provider (ms) */
const BASE_LATENCY_MS: Readonly<Record<AIProviderType, number>> = Object.freeze({
  [AIProv.OpenAI]: 800,
  [AIProv.Anthropic]: 900,
  [AIProv.Google]: 600,
  [AIProv.Local]: 200,
  [AIProv.Custom]: 500,
});

/** Estimated monthly cost per provider (USD, 1M tokens) */
const BASE_MONTHLY_COST: Readonly<Record<AIProviderType, number>> = Object.freeze({
  [AIProv.OpenAI]: 30,
  [AIProv.Anthropic]: 36,
  [AIProv.Google]: 20,
  [AIProv.Local]: 2,
  [AIProv.Custom]: 15,
});

/** Privacy level per provider */
const PRIVACY_LEVELS: Readonly<Record<AIProviderType, string>> = Object.freeze({
  [AIProv.OpenAI]: 'Standard',
  [AIProv.Anthropic]: 'Standard',
  [AIProv.Google]: 'Standard',
  [AIProv.Local]: 'Maximum',
  [AIProv.Custom]: 'Configurable',
});

export class AIConfigRuntime implements IAIConfigRuntime {
  private readonly config: AIConfigRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly configurations = new Map<string, AIConfiguration>();
  private readonly solutionIndex = new Map<string, AIConfigId>();

  constructor(config: AIConfigRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async configure(solutionId: SolutionId, overrides?: Partial<AIConfigOverrides>): Promise<AIConfiguration> {
    if (this.configurations.size >= this.config.maxConfigs) {
      throw new AIConfigurationError(
        `Maximum AI configurations exceeded: ${this.config.maxConfigs}`,
        { maxConfigs: this.config.maxConfigs },
      );
    }

    const now: Timestamp = new Date().toISOString();
    const configId = brandAIConfigId(crypto.randomUUID());

    const provider = overrides?.provider ?? this.config.defaultProvider;
    const model = overrides?.model ?? PROVIDER_MODELS[provider];
    const temperature = overrides?.temperature ?? this.config.defaultTemperature;
    const costStrategy = overrides?.costStrategy ?? CStrat.Balanced;

    const contextWindow = CONTEXT_WINDOWS[provider];
    const privacyLevel = PRIVACY_LEVELS[provider];

    // Adjust cost and latency based on cost strategy
    const baseCost = BASE_MONTHLY_COST[provider];
    const baseLatency = BASE_LATENCY_MS[provider];

    const { estimatedMonthlyCost, estimatedLatencyMs } = this.applyCostStrategy(
      baseCost, baseLatency, costStrategy, temperature,
    );

    const configuration: AIConfiguration = Object.freeze({
      id: configId,
      solutionId,
      provider,
      model,
      temperature,
      contextWindow,
      privacyLevel,
      costStrategy,
      estimatedMonthlyCost,
      estimatedLatencyMs,
      configuredAt: now,
      metadata: Object.freeze({}),
    });

    const key = configId as string;
    this.configurations.set(key, configuration);
    this.solutionIndex.set(solutionId as string, configId);

    const event: AIConfiguredEvent = Object.freeze({
      eventType: 'solution.ai.configured',
      classification: EventClassification.Info,
      configId,
      solutionId,
      provider,
      model,
      costStrategy,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'AIConfiguration');

    return configuration;
  }

  async getById(id: AIConfigId): Promise<AIConfiguration | null> {
    return this.configurations.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<AIConfiguration | null> {
    const configId = this.solutionIndex.get(solutionId as string);
    if (!configId) return null;
    return this.configurations.get(configId as string) ?? null;
  }

  async list(): Promise<readonly AIConfiguration[]> {
    return Object.freeze([...this.configurations.values()]);
  }

  async count(): Promise<number> {
    return this.configurations.size;
  }

  // ─── Cost Strategy Application ────────────────────────────────────

  private applyCostStrategy(
    baseCost: number,
    baseLatency: number,
    strategy: CostStrategy,
    temperature: number,
  ): { estimatedMonthlyCost: number; estimatedLatencyMs: number } {
    switch (strategy) {
      case CStrat.MinimizeCost:
        return {
          estimatedMonthlyCost: Math.round(baseCost * 0.5),
          estimatedLatencyMs: Math.round(baseLatency * 1.5),
        };
      case CStrat.MaximizeQuality:
        return {
          estimatedMonthlyCost: Math.round(baseCost * 2.0),
          estimatedLatencyMs: Math.round(baseLatency * 0.8),
        };
      case CStrat.Balanced:
      default: {
        const tempFactor = 1 + (temperature - 0.5) * 0.2;
        return {
          estimatedMonthlyCost: Math.round(baseCost * tempFactor),
          estimatedLatencyMs: Math.round(baseLatency * tempFactor),
        };
      }
    }
  }

  // ─── Event Publishing ────────────────────────────────────────────

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
