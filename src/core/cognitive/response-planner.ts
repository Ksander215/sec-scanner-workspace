/**
 * Cognitive Runtime — Response Planner
 * TASK-AIS-003I.000
 *
 * Before generating a response, determines what type of response
 * is needed: Answer, Workflow, Tool, Memory, Clarification, Escalation.
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

import { ResponseDecision } from './types.js';
import type {
  ResponsePlan,
  ResponsePlanId,
  Intent,
  CognitiveContext,
} from './types.js';
import { brandResponsePlanId } from './types.js';

/**
 * Configuration for Response Planner.
 */
export interface ResponsePlannerConfig {
  readonly toolInvocationThreshold: number;
  readonly workflowInvocationThreshold: number;
  readonly clarificationThreshold: number;
  readonly escalationThreshold: number;
}

/**
 * Default Response Planner configuration.
 */
export const DefaultResponsePlannerConfig: ResponsePlannerConfig = {
  toolInvocationThreshold: 0.8,
  workflowInvocationThreshold: 0.8,
  clarificationThreshold: 0.5,
  escalationThreshold: 0.9,
};

/**
 * ResponsePlanner — determines the optimal response type.
 */
export class ResponsePlanner {
  private readonly _config: ResponsePlannerConfig;

  constructor(config?: Partial<ResponsePlannerConfig>) {
    this._config = { ...DefaultResponsePlannerConfig, ...config };
  }

  /**
   * Plan the response type based on intent and context.
   */
  plan(intent: Intent, context: CognitiveContext): ResponsePlan {
    const id: ResponsePlanId = brandResponsePlanId(crypto.randomUUID());
    const decision = this.determineDecision(intent, context);
    const confidence = this.calculateConfidence(decision, intent, context);
    const reasoning = this.explainReasoning(decision, intent, context);

    let targetTool: string | undefined;
    let targetWorkflow: string | undefined;
    let targetMemory: string | undefined;
    let clarificationQuestions: readonly string[] | undefined;
    let escalationReason: string | undefined;

    switch (decision) {
      case ResponseDecision.Tool:
        targetTool = this.findBestTool(intent, context);
        break;
      case ResponseDecision.Workflow:
        targetWorkflow = this.findBestWorkflow(intent, context);
        break;
      case ResponseDecision.Memory:
        targetMemory = this.findBestMemoryKey(intent, context);
        break;
      case ResponseDecision.Clarification:
        clarificationQuestions = this.generateClarificationQuestions(intent, context);
        break;
      case ResponseDecision.Escalation:
        escalationReason = 'Query exceeds system capabilities or policy constraints';
        break;
    }

    return Object.freeze({
      id,
      decision,
      confidence,
      reasoning,
      targetTool,
      targetWorkflow,
      targetMemory,
      clarificationQuestions,
      escalationReason,
      createdAt: new Date().toISOString(),
      metadata: Object.freeze({
        intentType: intent.type,
        intentComplexity: intent.complexity,
      }),
    });
  }

  /**
   * Determine the response decision type.
   */
  private determineDecision(intent: Intent, context: CognitiveContext): ResponseDecision {
    // Check escalation first
    if (intent.complexity === 'Critical' && intent.confidence < this._config.escalationThreshold) {
      return ResponseDecision.Escalation;
    }

    // Check tool invocation
    if (intent.type === 'ToolInvocation' && intent.confidence >= this._config.toolInvocationThreshold) {
      if (this.hasAvailableTool(intent, context)) {
        return ResponseDecision.Tool;
      }
    }

    // Check workflow invocation
    if (intent.type === 'Workflow' && intent.confidence >= this._config.workflowInvocationThreshold) {
      if (this.hasAvailableWorkflow(intent, context)) {
        return ResponseDecision.Workflow;
      }
    }

    // Check memory recall
    if (intent.type === 'MemoryRecall' && context.memory.relevantEntries.length > 0) {
      return ResponseDecision.Memory;
    }

    // Check if clarification needed
    if (intent.confidence < this._config.clarificationThreshold) {
      return ResponseDecision.Clarification;
    }

    // Default: generate an answer
    return ResponseDecision.Answer;
  }

  /**
   * Calculate confidence for the decision.
   */
  private calculateConfidence(
    decision: ResponseDecision,
    intent: Intent,
    context: CognitiveContext,
  ): number {
    let confidence = intent.confidence;

    // Boost confidence if we have supporting data
    switch (decision) {
      case ResponseDecision.Answer:
        if (context.knowledge.relevantItems.length > 0) confidence += 0.1;
        if (context.memory.relevantEntries.length > 0) confidence += 0.05;
        break;
      case ResponseDecision.Tool:
        if (context.capabilities.available.length > 0) confidence += 0.1;
        break;
      case ResponseDecision.Workflow:
        break;
      case ResponseDecision.Memory:
        if (context.memory.relevantEntries.length > 3) confidence += 0.2;
        break;
    }

    return Math.min(Math.round(confidence * 1000) / 1000, 1.0);
  }

  /**
   * Explain the reasoning behind the decision.
   */
  private explainReasoning(
    decision: ResponseDecision,
    intent: Intent,
    context: CognitiveContext,
  ): string {
    switch (decision) {
      case ResponseDecision.Answer:
        return `Intent type '${intent.type}' with confidence ${intent.confidence} warrants a direct answer.`;
      case ResponseDecision.Tool:
        return `Intent requires tool invocation. Available capabilities: [${context.capabilities.available.join(', ')}].`;
      case ResponseDecision.Workflow:
        return `Intent requires workflow execution. Goal: '${intent.goal}'.`;
      case ResponseDecision.Memory:
        return `Intent requires memory recall. ${context.memory.relevantEntries.length} relevant entries found.`;
      case ResponseDecision.Clarification:
        return `Intent confidence ${intent.confidence} below threshold ${this._config.clarificationThreshold}. Clarification needed.`;
      case ResponseDecision.Escalation:
        return `Critical complexity with insufficient confidence. Escalation required.`;
    }
  }

  /**
   * Check if an available tool can handle this intent.
   */
  private hasAvailableTool(intent: Intent, context: CognitiveContext): boolean {
    if (intent.requiredCapabilities.length === 0) return true;
    return intent.requiredCapabilities.some(cap => context.capabilities.available.includes(cap));
  }

  /**
   * Check if an available workflow can handle this intent.
   */
  private hasAvailableWorkflow(_intent: Intent, _context: CognitiveContext): boolean {
    return true; // Workflow availability is checked at invocation time
  }

  /**
   * Find the best tool for the intent.
   */
  private findBestTool(intent: Intent, context: CognitiveContext): string {
    if (intent.requiredCapabilities.length > 0) {
      const match = intent.requiredCapabilities.find(cap => context.capabilities.available.includes(cap));
      if (match) return match;
    }
    return 'default';
  }

  /**
   * Find the best workflow for the intent.
   */
  private findBestWorkflow(intent: Intent, _context: CognitiveContext): string {
    return intent.parameters.workflowId as string ?? 'default-workflow';
  }

  /**
   * Find the best memory key for recall.
   */
  private findBestMemoryKey(intent: Intent, context: CognitiveContext): string {
    if (context.memory.relevantEntries.length > 0) {
      return context.memory.relevantEntries[0].key;
    }
    return intent.goal;
  }

  /**
   * Generate clarification questions.
   */
  private generateClarificationQuestions(intent: Intent, _context: CognitiveContext): readonly string[] {
    return [
      `Could you provide more details about: "${intent.goal}"?`,
      'What specific outcome are you expecting?',
      'Are there any constraints or preferences I should consider?',
    ];
  }
}
