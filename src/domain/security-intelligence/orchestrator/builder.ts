import { SecurityIntelligenceEngine } from './engine.js';
import { NormalizationEngine } from '../normalization/normalizer.js';
import { CorrelationEngine } from '../correlation/correlator.js';
import { RiskEngine } from '../risk/risk-engine.js';
import type { RiskParameters } from '../risk/types.js';
import type { NormalizationRule } from '../normalization/types.js';
import type { CorrelationRule } from '../correlation/types.js';
import type { PipelineEventHandler } from './types.js';

/**
 * Builder for SecurityIntelligenceEngine with dependency injection
 */
export class SecurityIntelligenceBuilder {
  private normalizer?: NormalizationEngine;
  private correlator?: CorrelationEngine;
  private riskEngine?: RiskEngine;
  private riskParams?: Partial<RiskParameters>;
  private normalizationRules: NormalizationRule[] = [];
  private correlationRules: CorrelationRule[] = [];
  private eventHandlers: PipelineEventHandler[] = [];

  withNormalizer(normalizer: NormalizationEngine): this {
    this.normalizer = normalizer;
    return this;
  }

  withCorrelator(correlator: CorrelationEngine): this {
    this.correlator = correlator;
    return this;
  }

  withRiskEngine(engine: RiskEngine): this {
    this.riskEngine = engine;
    return this;
  }

  withRiskParameters(params: Partial<RiskParameters>): this {
    this.riskParams = params;
    return this;
  }

  addNormalizationRule(rule: NormalizationRule): this {
    this.normalizationRules.push(rule);
    return this;
  }

  addCorrelationRule(rule: CorrelationRule): this {
    this.correlationRules.push(rule);
    return this;
  }

  onEvent(handler: PipelineEventHandler): this {
    this.eventHandlers.push(handler);
    return this;
  }

  build(): SecurityIntelligenceEngine {
    const engine = new SecurityIntelligenceEngine();

    // Apply normalization rules
    for (const rule of this.normalizationRules) {
      engine['normalizer'].addRule(rule);
    }

    // Apply correlation rules
    for (const rule of this.correlationRules) {
      engine['correlator'].addRule(rule);
    }

    // Apply event handlers
    for (const handler of this.eventHandlers) {
      engine.onEvent(handler);
    }

    return engine;
  }
}
