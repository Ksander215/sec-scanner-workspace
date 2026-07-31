/**
 * Personal Intelligence Runtime — Prediction Subsystem
 *
 * Generates and validates predictions about the user's next actions,
 * tasks, questions, documents, and workflow continuations.
 * Owns all prediction data and validation history.
 */
import type { Prediction } from './types.js';
import { PredictionType } from './types.js';
import type { PersonalRuntimeContracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import { PredictionError } from './errors.js';

interface ValidationRecord {
  readonly correct: number;
  readonly total: number;
}

export class PredictionRuntime {
  private contracts: PersonalRuntimeContracts;
  private predictions = new Map<string, Prediction>();
  private history = new Map<string, number>();
  private validations = new Map<string, ValidationRecord>();

  constructor(contracts: PersonalRuntimeContracts) {
    this.contracts = contracts;
  }

  // ── Predictions ───────────────────────────────────────────────

  predictNextAction(context: { activities: readonly string[]; timeOfDay: string }): Prediction {
    if (context.activities.length === 0) {
      throw new PredictionError('Cannot predict next action with empty activities');
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Count occurrences of each activity in history
    const counts = new Map<string, number>();
    let totalActions = 0;
    for (const [action, count] of this.history) {
      counts.set(action, count);
      totalActions += count;
    }

    // Also count from the provided context activities (weight them)
    for (const activity of context.activities) {
      counts.set(activity, (counts.get(activity) ?? 0) + 1);
      totalActions += 1;
    }

    // Find the most common action
    let bestAction = context.activities[0];
    let bestCount = 0;
    for (const [action, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestAction = action;
      }
    }

    const confidence = totalActions > 0 ? Math.max(bestCount / totalActions, 0.1) : 0.1;

    const prediction: Prediction = Object.freeze({
      id,
      type: PredictionType.NextAction,
      value: bestAction,
      confidence,
      reasoning: `Most frequent action from ${totalActions} recorded actions; ${bestAction} appeared ${bestCount} times`,
      context: Object.freeze({
        timeOfDay: context.timeOfDay,
        activityCount: context.activities.length,
        totalHistoryActions: totalActions,
      }),
      predictedAt: now,
    });

    this.predictions.set(id, prediction);

    const base = createPersonalEventBase('PredictionGenerated', EventClassification.Info, id);
    void this.contracts.platform.publishEvent('PredictionGenerated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        predictionId: id,
        type: prediction.type,
        value: prediction.value,
        confidence,
        predictedAt: now,
      },
    });

    return prediction;
  }

  predictNextTask(activeGoals: readonly { id: string; title: string; deadline: string | null; priority: number }[]): Prediction {
    if (activeGoals.length === 0) {
      throw new PredictionError('Cannot predict next task with no active goals');
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Sort by deadline proximity then priority
    const sorted = [...activeGoals].sort((a, b) => {
      // Goals with deadlines come first, sorted by proximity
      if (a.deadline && b.deadline) {
        const aTime = new Date(a.deadline).getTime();
        const bTime = new Date(b.deadline).getTime();
        if (aTime !== bTime) return aTime - bTime;
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      // Then by priority descending
      return b.priority - a.priority;
    });

    const top = sorted[0];
    const daysUntilDeadline = top.deadline
      ? Math.max(0, (new Date(top.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : Infinity;
    const confidence = top.deadline ? Math.max(0.1, Math.min(1, 1 - daysUntilDeadline / 30)) : 0.3;

    const prediction: Prediction = Object.freeze({
      id,
      type: PredictionType.NextTask,
      value: top.title,
      confidence,
      reasoning: top.deadline
        ? `Highest-priority task with nearest deadline (${daysUntilDeadline.toFixed(1)} days remaining), priority ${top.priority}`
        : `Highest-priority active task, priority ${top.priority}, no deadline`,
      context: Object.freeze({
        goalId: top.id,
        goalCount: activeGoals.length,
        deadline: top.deadline,
        priority: top.priority,
      }),
      predictedAt: now,
    });

    this.predictions.set(id, prediction);

    const base = createPersonalEventBase('PredictionGenerated', EventClassification.Info, id);
    void this.contracts.platform.publishEvent('PredictionGenerated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        predictionId: id,
        type: prediction.type,
        value: prediction.value,
        confidence,
        predictedAt: now,
      },
    });

    return prediction;
  }

  predictNextQuestion(recentTopics: readonly string[]): Prediction {
    if (recentTopics.length === 0) {
      throw new PredictionError('Cannot predict next question with no recent topics');
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Pick the least-recent topic (assumes array is ordered most-recent first)
    // Use the last element as least recently discussed
    const leastRecent = recentTopics[recentTopics.length - 1] ?? recentTopics[0];
    // Low confidence since we're guessing which topic they'll revisit
    const confidence = 0.2 + (1 / recentTopics.length) * 0.3;

    const prediction: Prediction = Object.freeze({
      id,
      type: PredictionType.NextQuestion,
      value: leastRecent,
      confidence: Math.max(0.1, Math.min(confidence, 0.6)),
      reasoning: `Least recently discussed topic from ${recentTopics.length} recent topics; user may circle back`,
      context: Object.freeze({
        topicCount: recentTopics.length,
        recentTopics: Object.freeze([...recentTopics]),
      }),
      predictedAt: now,
    });

    this.predictions.set(id, prediction);

    const base = createPersonalEventBase('PredictionGenerated', EventClassification.Info, id);
    void this.contracts.platform.publishEvent('PredictionGenerated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        predictionId: id,
        type: prediction.type,
        value: prediction.value,
        confidence: prediction.confidence,
        predictedAt: now,
      },
    });

    return prediction;
  }

  predictNextDocument(recentDocs: readonly string[]): Prediction {
    if (recentDocs.length === 0) {
      throw new PredictionError('Cannot predict next document with no recent documents');
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Count frequency of each document in the recent list
    const freq = new Map<string, number>();
    for (const doc of recentDocs) {
      freq.set(doc, (freq.get(doc) ?? 0) + 1);
    }

    // Pick the most frequent document
    let bestDoc = recentDocs[0];
    let bestFreq = 0;
    for (const [doc, count] of freq) {
      if (count > bestFreq) {
        bestFreq = count;
        bestDoc = doc;
      }
    }

    const confidence = Math.max(0.1, Math.min(bestFreq / recentDocs.length, 0.9));

    const prediction: Prediction = Object.freeze({
      id,
      type: PredictionType.NextDocument,
      value: bestDoc,
      confidence,
      reasoning: `Most frequently referenced document (${bestFreq} occurrences in ${recentDocs.length} recent docs)`,
      context: Object.freeze({
        documentCount: recentDocs.length,
        frequency: bestFreq,
        recentDocs: Object.freeze([...recentDocs]),
      }),
      predictedAt: now,
    });

    this.predictions.set(id, prediction);

    const base = createPersonalEventBase('PredictionGenerated', EventClassification.Info, id);
    void this.contracts.platform.publishEvent('PredictionGenerated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        predictionId: id,
        type: prediction.type,
        value: prediction.value,
        confidence,
        predictedAt: now,
      },
    });

    return prediction;
  }

  predictNextWorkflow(activeWorkflows: number): Prediction {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    if (activeWorkflows <= 0) {
      const prediction: Prediction = Object.freeze({
        id,
        type: PredictionType.NextWorkflow,
        value: 'none',
        confidence: 0.9,
        reasoning: 'No active workflows; user likely to start a new one or remain idle',
        context: Object.freeze({ activeWorkflows: 0 }),
        predictedAt: now,
      });

      this.predictions.set(id, prediction);

      const base = createPersonalEventBase('PredictionGenerated', EventClassification.Info, id);
      void this.contracts.platform.publishEvent('PredictionGenerated', {
        ...base,
        sequence: 0,
        version: '1.0.0',
        payload: {
          predictionId: id,
          type: prediction.type,
          value: prediction.value,
          confidence: prediction.confidence,
          predictedAt: now,
        },
      });

      return prediction;
    }

    const confidence = Math.max(0.1, Math.min(activeWorkflows / 5, 0.95));

    const prediction: Prediction = Object.freeze({
      id,
      type: PredictionType.NextWorkflow,
      value: 'continue',
      confidence,
      reasoning: `${activeWorkflows} active workflow${activeWorkflows === 1 ? '' : 's'} detected; user likely to continue current execution`,
      context: Object.freeze({ activeWorkflows }),
      predictedAt: now,
    });

    this.predictions.set(id, prediction);

    const base = createPersonalEventBase('PredictionGenerated', EventClassification.Info, id);
    void this.contracts.platform.publishEvent('PredictionGenerated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        predictionId: id,
        type: prediction.type,
        value: prediction.value,
        confidence,
        predictedAt: now,
      },
    });

    return prediction;
  }

  // ── Validation ────────────────────────────────────────────────

  recordOutcome(predictionId: string, actualValue: string): void {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) {
      throw new PredictionError(`Prediction not found: ${predictionId}`);
    }

    const correct = prediction.value === actualValue;
    const existing = this.validations.get(prediction.type);

    const updated: ValidationRecord = Object.freeze({
      correct: (existing?.correct ?? 0) + (correct ? 1 : 0),
      total: (existing?.total ?? 0) + 1,
    });

    this.validations.set(prediction.type, updated);

    const now = new Date().toISOString();
    const base = createPersonalEventBase('PredictionValidated', EventClassification.Result, predictionId);
    void this.contracts.platform.publishEvent('PredictionValidated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        predictionId,
        correct,
        actualValue,
        validatedAt: now,
      },
    });
  }

  // ── Queries ──────────────────────────────────────────────────

  getPrediction(id: string): Prediction | undefined {
    return this.predictions.get(id);
  }

  getPredictions(type?: PredictionType): readonly Prediction[] {
    const all = Array.from(this.predictions.values());
    const filtered = type !== undefined
      ? all.filter(p => p.type === type)
      : all;
    return Object.freeze(filtered);
  }

  getAccuracy(): number {
    let totalCorrect = 0;
    let totalAll = 0;
    for (const record of this.validations.values()) {
      totalCorrect += record.correct;
      totalAll += record.total;
    }
    return totalAll > 0 ? totalCorrect / totalAll : 0;
  }

  // ── History ──────────────────────────────────────────────────

  recordAction(action: string): void {
    const trimmed = action.trim();
    if (!trimmed) return;
    this.history.set(trimmed, (this.history.get(trimmed) ?? 0) + 1);
  }

  // ── Dispose ──────────────────────────────────────────────────

  dispose(): void {
    this.predictions.clear();
    this.history.clear();
    this.validations.clear();
  }
}
