/**
 * Cognitive Runtime — Intent Runtime
 * TASK-AIS-003I.000
 *
 * Classifies user input into structured Intent objects.
 * Supports 10 intent types with confidence scoring.
 *
 * Conforms to: ARC-001.001, DOM-002.000, ADR-002
 */

import { IntentType, IntentComplexity } from './types.js';
import type {
  Intent,
  IntentClassification,
  IntentId,
  Timestamp,
} from './types.js';
import { brandIntentId } from './types.js';
import { IntentConfidenceError } from './cognitive-errors.js';

/**
 * Rules for intent classification — pattern-based heuristic matching.
 */
export interface IntentRule {
  readonly type: IntentType;
  readonly patterns: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly defaultComplexity: IntentComplexity;
  readonly priority: number;
}

/**
 * Configuration for the Intent Runtime.
 */
export interface IntentRuntimeConfig {
  readonly minConfidence: number;
  readonly rules: readonly IntentRule[];
}

/**
 * Default intent classification rules.
 */
export const DefaultIntentRules: readonly IntentRule[] = [
  {
    type: IntentType.Question,
    patterns: ['?', 'what', 'how', 'why', 'when', 'where', 'who', 'which', 'explain', 'tell me', 'describe'],
    requiredCapabilities: [],
    defaultComplexity: IntentComplexity.Simple,
    priority: 1,
  },
  {
    type: IntentType.Command,
    patterns: ['do', 'execute', 'run', 'start', 'stop', 'create', 'delete', 'update', 'set', 'configure'],
    requiredCapabilities: [],
    defaultComplexity: IntentComplexity.Moderate,
    priority: 2,
  },
  {
    type: IntentType.Workflow,
    patterns: ['workflow', 'process', 'pipeline', 'automate', 'schedule', 'orchestrate'],
    requiredCapabilities: ['workflow'],
    defaultComplexity: IntentComplexity.Complex,
    priority: 5,
  },
  {
    type: IntentType.ToolInvocation,
    patterns: ['use tool', 'invoke', 'call', 'tool:', 'search', 'calculate', 'compute'],
    requiredCapabilities: ['tool'],
    defaultComplexity: IntentComplexity.Moderate,
    priority: 4,
  },
  {
    type: IntentType.Search,
    patterns: ['search', 'find', 'lookup', 'locate', 'query', 'browse'],
    requiredCapabilities: ['knowledge'],
    defaultComplexity: IntentComplexity.Simple,
    priority: 3,
  },
  {
    type: IntentType.MemoryRecall,
    patterns: ['remember', 'recall', 'previous', 'earlier', 'last time', 'before', 'history'],
    requiredCapabilities: ['memory'],
    defaultComplexity: IntentComplexity.Simple,
    priority: 3,
  },
  {
    type: IntentType.Planning,
    patterns: ['plan', 'design', 'architect', 'strategy', 'roadmap', 'outline', 'structure'],
    requiredCapabilities: [],
    defaultComplexity: IntentComplexity.Complex,
    priority: 4,
  },
  {
    type: IntentType.Conversation,
    patterns: ['hello', 'hi', 'thanks', 'okay', 'sure', 'fine', 'good', 'great', 'bye', 'chat'],
    requiredCapabilities: [],
    defaultComplexity: IntentComplexity.Simple,
    priority: 0,
  },
  {
    type: IntentType.System,
    patterns: ['status', 'health', 'config', 'admin', 'system', 'debug', 'log', 'metrics'],
    requiredCapabilities: [],
    defaultComplexity: IntentComplexity.Moderate,
    priority: 6,
  },
];

/**
 * Default configuration for Intent Runtime.
 */
export const DefaultIntentRuntimeConfig: IntentRuntimeConfig = {
  minConfidence: 0.3,
  rules: DefaultIntentRules,
};

/**
 * IntentRuntime — classifies user input into structured Intent objects.
 */
export class IntentRuntime {
  private readonly _config: IntentRuntimeConfig;

  constructor(config?: Partial<IntentRuntimeConfig>) {
    this._config = {
      ...DefaultIntentRuntimeConfig,
      ...config,
    };
  }

  /**
   * Classify user input into an Intent.
   */
  classify(input: string, context?: Record<string, unknown>): Intent {
    const classification = this.evaluateRules(input, context);

    if (classification.confidence < this._config.minConfidence) {
      throw new IntentConfidenceError(
        `Intent confidence ${classification.confidence} below minimum ${this._config.minConfidence}`,
      );
    }

    return this.createIntent(classification, input);
  }

  /**
   * Evaluate all rules against the input and return the best classification.
   */
  evaluateRules(input: string, context?: Record<string, unknown>): IntentClassification {
    const normalized = input.toLowerCase().trim();
    const classifications: Array<IntentClassification & { rulePriority: number }> = [];

    for (const rule of this._config.rules) {
      const matchCount = this.countMatches(normalized, rule.patterns);
      if (matchCount === 0) continue;

      const confidence = Math.min(matchCount / rule.patterns.length * 0.8 + 0.2, 1.0);
      const complexity = this.assessComplexity(input, rule.defaultComplexity);

      classifications.push({
        type: rule.type,
        confidence,
        complexity,
        requiredCapabilities: rule.requiredCapabilities,
        parameters: this.extractParameters(input, context),
        rulePriority: rule.priority,
      });
    }

    if (classifications.length === 0) {
      return {
        type: IntentType.Conversation,
        confidence: 0.5,
        complexity: IntentComplexity.Simple,
        requiredCapabilities: [],
        parameters: {},
      };
    }

    // Sort by confidence * priority (descending)
    classifications.sort((a, b) => {
      const scoreA = a.confidence * (a.rulePriority + 1);
      const scoreB = b.confidence * (b.rulePriority + 1);
      return scoreB - scoreA;
    });

    const best = classifications[0];
    return {
      type: best.type,
      confidence: best.confidence,
      complexity: best.complexity,
      requiredCapabilities: best.requiredCapabilities,
      parameters: best.parameters,
    };
  }

  /**
   * Validate an intent classification.
   */
  validateClassification(classification: IntentClassification): boolean {
    if (classification.confidence < 0 || classification.confidence > 1) return false;
    if (classification.type === IntentType.System && classification.complexity === IntentComplexity.Critical) {
      return false;
    }
    return true;
  }

  /**
   * Count how many patterns match the input.
   */
  private countMatches(normalizedInput: string, patterns: readonly string[]): number {
    let count = 0;
    for (const pattern of patterns) {
      if (normalizedInput.includes(pattern.toLowerCase())) {
        count++;
      }
    }
    return count;
  }

  /**
   * Assess intent complexity based on input length and structure.
   */
  private assessComplexity(input: string, defaultComplexity: IntentComplexity): IntentComplexity {
    const wordCount = input.split(/\s+/).filter(Boolean).length;

    if (wordCount > 50) return IntentComplexity.Complex;
    if (wordCount > 20) return IntentComplexity.Moderate;
    if (wordCount > 10) return defaultComplexity === IntentComplexity.Simple ? IntentComplexity.Moderate : defaultComplexity;
    return defaultComplexity;
  }

  /**
   * Extract parameters from input and context.
   */
  private extractParameters(input: string, context?: Record<string, unknown>): Record<string, unknown> {
    const parameters: Record<string, unknown> = {};
    parameters.rawInput = input;
    parameters.wordCount = input.split(/\s+/).filter(Boolean).length;
    parameters.characterCount = input.length;

    if (context) {
      parameters.contextKeys = Object.keys(context);
    }

    return Object.freeze(parameters);
  }

  /**
   * Create a full Intent from a classification.
   */
  private createIntent(classification: IntentClassification, input: string): Intent {
    const now: Timestamp = new Date().toISOString();
    const id: IntentId = brandIntentId(crypto.randomUUID());

    return Object.freeze({
      id,
      type: classification.type,
      goal: input.slice(0, 200),
      priority: classification.type === IntentType.System ? 10 : 5,
      complexity: classification.complexity,
      confidence: Math.round(classification.confidence * 1000) / 1000,
      requiredCapabilities: classification.requiredCapabilities,
      parameters: classification.parameters,
      detectedAt: now,
      metadata: Object.freeze({ source: 'intent-runtime' }),
    });
  }
}
