/**
 * Universal AI Provider Runtime — Token Manager
 * TASK-AIS-006A.000
 *
 * Tracks token usage against a budget. Throws TokenBudgetExceededError
 * at 95% threshold, publishes warning at 80%.
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { EventClassification } from '../types/common.js';
import type { ITokenManager } from './contracts.js';
import type {
  TokenAccountId, ModelId, TokenCountResult, TokenAccount,
  TokenManagerConfig, TokenType,
} from './types.js';
import { TokenType as TT } from './types.js';
import { TokenBudgetExceededError } from './errors.js';
import type { TokenBudgetWarningEvent, BudgetExceededEvent } from './events.js';

const CHARS_PER_TOKEN = 4;

const EMPTY_BY_TYPE: Record<string, number> = {
  [TT.Input]: 0,
  [TT.Output]: 0,
  [TT.Cached]: 0,
  [TT.Reasoning]: 0,
  [TT.Image]: 0,
  [TT.Audio]: 0,
};

export class TokenManager implements ITokenManager {
  private readonly config: TokenManagerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly accountId: TokenAccountId;
  private used = 0;
  private byType: Record<string, number>;
  private byProvider: Record<string, number>;
  private byModel: Record<string, number>;
  private periodStart: string;
  private periodEnd: string;
  private warned = false;

  constructor(config: TokenManagerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
    this.accountId = crypto.randomUUID() as TokenAccountId;
    this.byType = { ...EMPTY_BY_TYPE };
    this.byProvider = {};
    this.byModel = {};
    const now = new Date();
    this.periodStart = now.toISOString();
    const end = new Date(now);
    switch (config.period) {
      case 'hourly': end.setHours(end.getHours() + 1); break;
      case 'daily': end.setDate(end.getDate() + 1); break;
      case 'weekly': end.setDate(end.getDate() + 7); break;
      case 'monthly': end.setMonth(end.getMonth() + 1); break;
    }
    this.periodEnd = end.toISOString();
  }

  private publish(event: DomainEventBase): void {
    if (this.eventBus) { void this.eventBus.publish(event); }
  }

  async count(text: string, modelId: ModelId): Promise<TokenCountResult> {
    const tokens = Math.ceil(text.length / CHARS_PER_TOKEN);
    return Object.freeze({
      inputTokens: tokens,
      outputTokens: 0,
      cachedTokens: 0,
      reasoningTokens: 0,
      imageTokens: 0,
      audioTokens: 0,
      totalTokens: tokens,
      modelId,
      providerId: '' as import('./types.js').ProviderId,
    });
  }

  async record(usage: TokenCountResult): Promise<void> {
    const total = usage.totalTokens;
    const projected = this.used + total;
    const percentage = this.config.defaultBudget > 0 ? projected / this.config.defaultBudget : 0;

    // Warning at warnThreshold (default 0.8)
    if (!this.warned && percentage >= this.config.warnThreshold) {
      this.warned = true;
      this.publish(Object.freeze({
        eventType: 'token.budget-warning',
        classification: EventClassification.StateChange,
        usage: projected,
        budget: this.config.defaultBudget,
        percentage,
        timestamp: new Date().toISOString(),
        metadata: {},
        eventId: crypto.randomUUID(), sequence: 0,
        aggregateId: this.accountId as string,
        aggregateType: 'TokenAccount',
        version: '1.0.0',
      } as TokenBudgetWarningEvent & DomainEventBase));
    }

    // Block at blockThreshold (default 0.95)
    if (percentage >= this.config.blockThreshold) {
      this.publish(Object.freeze({
        eventType: 'budget.exceeded',
        classification: EventClassification.Error,
        budgetLimit: this.config.defaultBudget,
        currentUsage: projected,
        period: this.config.period,
        action: 'block',
        timestamp: new Date().toISOString(),
        metadata: {},
        eventId: crypto.randomUUID(), sequence: 0,
        aggregateId: this.accountId as string,
        aggregateType: 'TokenAccount',
        version: '1.0.0',
      } as BudgetExceededEvent & DomainEventBase));
      throw new TokenBudgetExceededError(this.config.defaultBudget, projected);
    }

    this.used += total;
    this.byType[TT.Input] = (this.byType[TT.Input] ?? 0) + usage.inputTokens;
    this.byType[TT.Output] = (this.byType[TT.Output] ?? 0) + usage.outputTokens;
    this.byType[TT.Cached] = (this.byType[TT.Cached] ?? 0) + usage.cachedTokens;
    this.byType[TT.Reasoning] = (this.byType[TT.Reasoning] ?? 0) + usage.reasoningTokens;
    this.byType[TT.Image] = (this.byType[TT.Image] ?? 0) + usage.imageTokens;
    this.byType[TT.Audio] = (this.byType[TT.Audio] ?? 0) + usage.audioTokens;

    const pid = usage.providerId as string;
    this.byProvider[pid] = (this.byProvider[pid] ?? 0) + total;

    const mid = usage.modelId as string;
    this.byModel[mid] = (this.byModel[mid] ?? 0) + total;
  }

  async getAccount(_id?: TokenAccountId): Promise<TokenAccount> {
    return Object.freeze({
      id: this.accountId,
      name: 'default',
      budget: this.config.defaultBudget,
      used: this.used,
      remaining: this.config.defaultBudget - this.used,
      byType: Object.freeze({ ...this.byType } as Record<TokenType, number>),
      byProvider: Object.freeze({ ...this.byProvider }),
      byModel: Object.freeze({ ...this.byModel }),
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      metadata: {},
    });
  }

  async reset(): Promise<void> {
    this.used = 0;
    this.byType = { ...EMPTY_BY_TYPE };
    this.byProvider = {};
    this.byModel = {};
    this.warned = false;
    this.periodStart = new Date().toISOString();
  }

  async getByType(type: TokenType): Promise<number> {
    return this.byType[type] ?? 0;
  }

  async getByProvider(providerId: string): Promise<number> {
    return this.byProvider[providerId] ?? 0;
  }

  async getByModel(modelId: string): Promise<number> {
    return this.byModel[modelId] ?? 0;
  }

  async getBudget(): Promise<number> {
    return this.config.defaultBudget;
  }

  async getUsed(): Promise<number> {
    return this.used;
  }

  async getRemaining(): Promise<number> {
    return Math.max(0, this.config.defaultBudget - this.used);
  }
}
