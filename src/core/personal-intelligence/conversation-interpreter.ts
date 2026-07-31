/**
 * Personal Intelligence Pack — Conversation Interpreter
 * TASK-AIS-007A.000
 *
 * Interprets user conversations to extract intent, entities,
 * and suggested actions for the pack.
 */
import type { PersonalIntelligenceContracts } from './contracts.js';
import type { ConversationInterpretation, ConversationIntent, ConversationEntity } from './types.js';
import { ConversationIntent as CI } from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import { ConversationInterpretError } from './errors.js';

export class ConversationInterpreter {
  private contracts: PersonalIntelligenceContracts;
  private interpretations = new Map<string, ConversationInterpretation>();

  constructor(contracts: PersonalIntelligenceContracts) {
    this.contracts = contracts;
  }

  interpret(input: string, _context?: Readonly<Record<string, unknown>>): ConversationInterpretation {
    if (!input.trim()) throw new ConversationInterpretError('input is required');
    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID();
    const intent = this.detectIntent(input);
    const entities = this.extractEntities(input);
    const suggestedActions = this.generateSuggestedActions(intent, entities);
    const summary = this.generateSummary(intent, entities);

    const interpretation: ConversationInterpretation = Object.freeze({
      id, intent, confidence: this.calculateConfidence(intent, entities),
      entities: Object.freeze(entities),
      goalIds: Object.freeze([]), decisionIds: Object.freeze([]), constraintIds: Object.freeze([]),
      summary, suggestedActions: Object.freeze(suggestedActions),
      interpretedAt: now,
    });

    this.interpretations.set(id, interpretation);

    const base = createPackEventBase('ConversationInterpreted', EventClassification.Info, id);
    void this.contracts.platform.publishEvent('ConversationInterpreted', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { interpretationId: id, intent, confidence: interpretation.confidence, interpretedAt: now },
    });

    return interpretation;
  }

  getInterpretation(id: string): ConversationInterpretation {
    const i = this.interpretations.get(id);
    if (!i) throw new ConversationInterpretError(`Interpretation not found: ${id}`);
    return i;
  }

  getByIntent(intent: ConversationIntent): readonly ConversationInterpretation[] {
    return Object.freeze(Array.from(this.interpretations.values()).filter(i => i.intent === intent));
  }

  getAllInterpretations(): readonly ConversationInterpretation[] {
    return Object.freeze(Array.from(this.interpretations.values()));
  }

  getInterpretationCount(): number { return this.interpretations.size; }

  dispose(): void { this.interpretations.clear(); }

  // ── Private helpers ──────────────────────────────────────

  private detectIntent(input: string): ConversationIntent {
    const lower = input.toLowerCase();
    if (lower.includes('goal') || lower.includes('цель') || lower.includes('vision')) return CI.GoalSetting;
    if (lower.includes('decide') || lower.includes('choose') || lower.includes('реш')) return CI.DecisionMaking;
    if (lower.includes('reflect') || lower.includes('review') || lower.includes('итог')) return CI.Reflection;
    if (lower.includes('plan') || lower.includes('schedule') || lower.includes('план')) return CI.Planning;
    if (lower.includes('constraint') || lower.includes('bottleneck') || lower.includes('ограничен')) return CI.ConstraintExploration;
    if (lower.includes('value') || lower.includes('ценност') || lower.includes('worth')) return CI.ValueInquiry;
    if (lower.includes('feedback') || lower.includes('фидбек') || lower.includes('opinion')) return CI.Feedback;
    return CI.General;
  }

  private extractEntities(input: string): ConversationEntity[] {
    const entities: ConversationEntity[] = [];
    const goalMatch = input.match(/goal[:\s]+([\w\s]+)/i);
    if (goalMatch) entities.push({ type: 'goal', value: goalMatch[1].trim(), confidence: 0.8 });
    const decisionMatch = input.match(/decision[:\s]+([\w\s]+)/i);
    if (decisionMatch) entities.push({ type: 'decision', value: decisionMatch[1].trim(), confidence: 0.8 });
    if (entities.length === 0) {
      entities.push({ type: 'text', value: input.substring(0, 100), confidence: 0.5 });
    }
    return entities;
  }

  private generateSuggestedActions(intent: ConversationIntent, _entities: readonly ConversationEntity[]): string[] {
    const actions: string[] = [];
    switch (intent) {
      case CI.GoalSetting:
        actions.push('Create a new goal from this conversation');
        actions.push('Link to existing vision or strategy');
        break;
      case CI.DecisionMaking:
        actions.push('Create a structured decision analysis');
        actions.push('Add pros/cons for each option');
        break;
      case CI.Reflection:
        actions.push('Generate a reflection for the current period');
        break;
      default:
        actions.push('Continue the conversation');
        break;
    }
    return actions;
  }

  private generateSummary(intent: ConversationIntent, entities: readonly ConversationEntity[]): string {
    const entityStr = entities.map(e => e.value).join(', ');
    return `Intent: ${intent}. Entities: ${entityStr}`;
  }

  private calculateConfidence(intent: ConversationIntent, entities: readonly ConversationEntity[]): number {
    if (entities.length > 0 && intent !== CI.General) return 0.85;
    if (intent !== CI.General) return 0.6;
    return 0.4;
  }
}
