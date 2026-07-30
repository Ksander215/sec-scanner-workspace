/**
 * Intent Runtime — Tests
 * TASK-AIS-003I.000
 */
import { describe, it, expect, vi } from 'vitest';
import {
  IntentRuntime,
  DefaultIntentRuntimeConfig,
  DefaultIntentRules,
} from '../../../core/cognitive/intent-runtime.js';
import {
  IntentType,
  IntentComplexity,
} from '../../../core/cognitive/types.js';
import { IntentConfidenceError } from '../../../core/cognitive/cognitive-errors.js';

describe('IntentRuntime', () => {
  describe('classify', () => {
    it('should classify a question intent', () => {
      const runtime = new IntentRuntime();
      const intent = runtime.classify('What is the weather today?');
      expect(intent.type).toBe(IntentType.Question);
      expect(intent.confidence).toBeGreaterThan(0.3);
      expect(intent.id).toBeDefined();
    });

    it('should classify a command intent', () => {
      const runtime = new IntentRuntime({ minConfidence: 0.1 });
      const intent = runtime.classify('Execute the deployment script now');
      expect(intent.type).toBe(IntentType.Command);
    });

    it('should classify a workflow intent', () => {
      const runtime = new IntentRuntime();
      const intent = runtime.classify('Start the data pipeline workflow');
      expect(intent.type).toBe(IntentType.Workflow);
      expect(intent.requiredCapabilities).toContain('workflow');
    });

    it('should classify a tool invocation intent', () => {
      const runtime = new IntentRuntime();
      const intent = runtime.classify('Invoke the search tool for documentation lookup');
      expect(intent.type).toBe(IntentType.ToolInvocation);
    });

    it('should classify a search intent', () => {
      const runtime = new IntentRuntime();
      const intent = runtime.classify('Find and search for API documentation resources');
      expect(intent.type).toBe(IntentType.Search);
    });

    it('should classify a memory recall intent', () => {
      const runtime = new IntentRuntime();
      const intent = runtime.classify('Remember what we discussed last time');
      expect(intent.type).toBe(IntentType.MemoryRecall);
    });

    it('should classify a planning intent', () => {
      const runtime = new IntentRuntime();
      const intent = runtime.classify('Plan the architecture for the new feature');
      expect(intent.type).toBe(IntentType.Planning);
      expect(intent.complexity).toBe(IntentComplexity.Complex);
    });

    it('should classify a conversation intent', () => {
      const runtime = new IntentRuntime();
      const intent = runtime.classify('hello, thanks, that is great');
      expect(intent.type).toBe(IntentType.Conversation);
    });

    it('should classify a system intent', () => {
      const runtime = new IntentRuntime();
      const intent = runtime.classify('Show system status and health');
      expect(intent.type).toBe(IntentType.System);
    });

    it('should throw if confidence is below minimum', () => {
      const runtime = new IntentRuntime({ minConfidence: 1.0 });
      expect(() => runtime.classify('xyz')).toThrow(IntentConfidenceError);
    });

    it('should default to Conversation for unrecognized input', () => {
      const runtime = new IntentRuntime({ minConfidence: 0.1 });
      const intent = runtime.classify('xyz');
      expect(intent.type).toBe(IntentType.Conversation);
    });

    it('should return a frozen intent object', () => {
      const runtime = new IntentRuntime();
      const intent = runtime.classify('What is AI?');
      expect(Object.isFrozen(intent)).toBe(true);
    });

    it('should include detection timestamp', () => {
      const runtime = new IntentRuntime({ minConfidence: 0.1 });
      const intent = runtime.classify('How does this work?');
      expect(intent.detectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should set priority based on intent type', () => {
      const runtime = new IntentRuntime();
      const systemIntent = runtime.classify('Show system debug logs');
      expect(systemIntent.priority).toBeGreaterThan(5);
    });
  });

  describe('evaluateRules', () => {
    it('should return classification with type, confidence, complexity', () => {
      const runtime = new IntentRuntime();
      const result = runtime.evaluateRules('What is the meaning of life?');
      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.complexity).toBeDefined();
      expect(result.requiredCapabilities).toBeDefined();
      expect(result.parameters).toBeDefined();
    });

    it('should return Conversation for empty input', () => {
      const runtime = new IntentRuntime();
      const result = runtime.evaluateRules('');
      expect(result.type).toBe(IntentType.Conversation);
      expect(result.confidence).toBe(0.5);
    });

    it('should score higher for multi-pattern matches', () => {
      const runtime = new IntentRuntime();
      const questionResult = runtime.evaluateRules('What is the question and how to explain the what where when why?');
      expect(questionResult.confidence).toBeGreaterThan(0.5);
    });

    it('should return empty capabilities for simple intents', () => {
      const runtime = new IntentRuntime();
      const result = runtime.evaluateRules('Hello!');
      expect(result.requiredCapabilities).toEqual([]);
    });

    it('should include raw input in parameters', () => {
      const runtime = new IntentRuntime();
      const input = 'Test question?';
      const result = runtime.evaluateRules(input);
      expect(result.parameters.rawInput).toBe(input);
    });
  });

  describe('validateClassification', () => {
    it('should validate a correct classification', () => {
      const runtime = new IntentRuntime();
      const classification = {
        type: IntentType.Question,
        confidence: 0.8,
        complexity: IntentComplexity.Simple,
        requiredCapabilities: [],
        parameters: {},
      };
      expect(runtime.validateClassification(classification)).toBe(true);
    });

    it('should reject confidence > 1', () => {
      const runtime = new IntentRuntime();
      const classification = {
        type: IntentType.Question,
        confidence: 1.5,
        complexity: IntentComplexity.Simple,
        requiredCapabilities: [],
        parameters: {},
      };
      expect(runtime.validateClassification(classification)).toBe(false);
    });

    it('should reject confidence < 0', () => {
      const runtime = new IntentRuntime();
      const classification = {
        type: IntentType.Question,
        confidence: -0.5,
        complexity: IntentComplexity.Simple,
        requiredCapabilities: [],
        parameters: {},
      };
      expect(runtime.validateClassification(classification)).toBe(false);
    });

    it('should reject System + Critical combination', () => {
      const runtime = new IntentRuntime();
      const classification = {
        type: IntentType.System,
        confidence: 0.9,
        complexity: IntentComplexity.Critical,
        requiredCapabilities: [],
        parameters: {},
      };
      expect(runtime.validateClassification(classification)).toBe(false);
    });

    it('should accept all other valid combinations', () => {
      const runtime = new IntentRuntime();
      const classification = {
        type: IntentType.Planning,
        confidence: 0.7,
        complexity: IntentComplexity.Complex,
        requiredCapabilities: [],
        parameters: {},
      };
      expect(runtime.validateClassification(classification)).toBe(true);
    });
  });

  describe('complexity assessment', () => {
    it('should increase complexity for longer inputs', () => {
      const runtime = new IntentRuntime({ minConfidence: 0.05 });
      const longInput = 'What ' + 'is '.repeat(60) + 'the weather and how does it impact our daily life today?';
      const intent = runtime.classify(longInput);
      expect(intent.complexity).toBe(IntentComplexity.Complex);
    });

    it('should use default complexity for medium inputs', () => {
      const runtime = new IntentRuntime({ minConfidence: 0.1 });
      const mediumInput = 'What is the weather today and how does it affect crops?';
      const intent = runtime.classify(mediumInput);
      expect(intent.complexity).toBe(IntentComplexity.Moderate);
    });

    it('should keep Simple complexity for short inputs', () => {
      const runtime = new IntentRuntime({ minConfidence: 0.1 });
      const intent = runtime.classify('Hi!');
      expect(intent.complexity).toBe(IntentComplexity.Simple);
    });
  });

  describe('custom config', () => {
    it('should use custom min confidence', () => {
      const runtime = new IntentRuntime({ minConfidence: 0.1 });
      const intent = runtime.classify('random text');
      expect(intent.confidence).toBeGreaterThan(0.1);
    });

    it('should use custom rules', () => {
      const customRules = [
        {
          type: IntentType.ToolInvocation,
          patterns: ['calculate', 'compute'],
          requiredCapabilities: ['math'],
          defaultComplexity: IntentComplexity.Simple,
          priority: 10,
        },
      ];
      const runtime = new IntentRuntime({ rules: customRules, minConfidence: 0.1 });
      const intent = runtime.classify('calculate the sum');
      expect(intent.type).toBe(IntentType.ToolInvocation);
    });
  });
});
