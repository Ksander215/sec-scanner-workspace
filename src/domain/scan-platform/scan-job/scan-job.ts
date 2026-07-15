/**
 * Scan Platform — Scan Job
 *
 * Stateful model representing a single scan execution.
 * Implements a strict state machine with validated transitions.
 *
 * Status transitions:
 *   Pending  → Running
 *   Running  → Completed | Failed | Cancelled
 *   Pending  → Cancelled
 *
 * Terminal states: Completed, Failed, Cancelled.
 */

import type { ID, Timestamp, StringMap, ScanTriggerType, ScanCapability, Severity } from '../types/index.ts';
import { ScanJobStatus, TERMINAL_STATUSES } from '../types/index.ts';
import { type ScanContext } from '../scan-context/scan-context.ts';
import { type Finding } from '../models/finding.ts';
import { emptySeverityBreakdown, type SeverityBreakdown } from '../models/scan-result.ts';
import {
  InvalidJobTransitionError,
  ScanJobTerminalError,
} from '../errors/scan-errors.ts';

// ─── Engine Job Progress ───────────────────────────────────

/**
 * Progress tracking for a single engine within a job.
 */
export interface EngineJobProgress {
  /** The engine ID. */
  readonly engineId: string;
  /** Engine name. */
  readonly engineName: string;
  /** Current phase (e.g. "crawling", "testing"). */
  readonly phase: string;
  /** Progress 0–100. */
  readonly progress: number;
  /** Number of requests made. */
  readonly requestsCount: number;
  /** Number of findings so far. */
  readonly findingsCount: number;
  /** Whether this engine has finished. */
  readonly finished: boolean;
  /** Whether this engine encountered an error. */
  readonly error: boolean;
  /** Error message. */
  readonly errorMessage?: string;
}

// ─── Scan Job ──────────────────────────────────────────────

/**
 * A single scan execution.
 * Created by the Orchestrator, updated throughout the lifecycle.
 *
 * This is a MUTABLE model (internal state changes during execution).
 * For immutable snapshots, use toSnapshot().
 */
export class ScanJob {
  // ─── Identity ─────────────────────────────────────────
  readonly id: ID;
  readonly correlationId: ID;
  readonly targetId: string;
  readonly targetUrl: string;
  readonly targetName: string;
  readonly triggerType: ScanTriggerType;
  readonly triggeredBy: string;
  readonly requiredCapabilities: readonly ScanCapability[];
  readonly profileName: string;
  readonly createdAt: Timestamp;

  // ─── Mutable State ────────────────────────────────────
  private _status: ScanJobStatus = ScanJobStatus.Pending;
  private _startedAt: Timestamp | null = null;
  private _completedAt: Timestamp | null = null;
  private _engineIds: string[] = [];
  private _findings: Finding[] = [];
  private _engineProgress: Map<string, EngineJobProgress> = new Map();
  private _overallProgress: number = 0;
  private _overallPhase: string = 'pending';
  private _totalRequests: number = 0;
  private _error: string | null = null;
  private _errorCode: string | null = null;
  private _retryable: boolean = false;
  private _metadata: StringMap = {};

  // ─── Event Callbacks ──────────────────────────────────
  private _onStateChange: Array<(job: ScanJob) => void> = [];

  constructor(params: {
    id: ID;
    correlationId: ID;
    targetId: string;
    targetUrl: string;
    targetName: string;
    triggerType: ScanTriggerType;
    triggeredBy: string;
    requiredCapabilities: readonly ScanCapability[];
    profileName: string;
    metadata?: StringMap;
  }) {
    this.id = params.id;
    this.correlationId = params.correlationId;
    this.targetId = params.targetId;
    this.targetUrl = params.targetUrl;
    this.targetName = params.targetName;
    this.triggerType = params.triggerType;
    this.triggeredBy = params.triggeredBy;
    this.requiredCapabilities = params.requiredCapabilities;
    this.profileName = params.profileName;
    this._metadata = { ...(params.metadata ?? {}) };
  }

  // ─── Getters ──────────────────────────────────────────

  get status(): ScanJobStatus { return this._status; }
  get startedAt(): Timestamp | null { return this._startedAt; }
  get completedAt(): Timestamp | null { return this._completedAt; }
  get engineIds(): readonly string[] { return this._engineIds; }
  get findings(): readonly Finding[] { return this._findings; }
  get overallProgress(): number { return this._overallProgress; }
  get overallPhase(): string { return this._overallPhase; }
  get totalRequests(): number { return this._totalRequests; }
  get error(): string | null { return this._error; }
  get errorCode(): string | null { return this._errorCode; }
  get retryable(): boolean { return this._retryable; }
  get metadata(): StringMap { return this._metadata; }

  get findingsCount(): number { return this._findings.length; }

  get findingsBySeverity(): SeverityBreakdown {
    const breakdown = { ...emptySeverityBreakdown() };
    for (const f of this._findings) {
      const key = f.severity as keyof SeverityBreakdown;
      if (key in breakdown) {
        (breakdown as any)[key]++;
      }
    }
    return breakdown;
  }

  get engineProgress(): ReadonlyMap<string, EngineJobProgress> {
    return this._engineProgress;
  }

  get durationMs(): number | null {
    if (!this._startedAt) return null;
    const end = this._completedAt ? new Date(this._completedAt).getTime() : Date.now();
    return end - new Date(this._startedAt).getTime();
  }

  get isTerminal(): boolean {
    return TERMINAL_STATUSES.has(this._status);
  }

  // ─── State Transitions ────────────────────────────────

  /** Assign engines and transition to Running. */
  start(engineIds: string[]): void {
    this.assertTransition(ScanJobStatus.Running);
    this._status = ScanJobStatus.Running;
    this._startedAt = new Date().toISOString();
    this._engineIds = [...engineIds];

    for (const eid of engineIds) {
      this._engineProgress.set(eid, {
        engineId: eid,
        engineName: eid,
        phase: 'initializing',
        progress: 0,
        requestsCount: 0,
        findingsCount: 0,
        finished: false,
        error: false,
      });
    }

    this._overallPhase = 'running';
    this.emitChange();
  }

  /** Transition to Completed. */
  complete(): void {
    this.assertTransition(ScanJobStatus.Completed);
    this._status = ScanJobStatus.Completed;
    this._completedAt = new Date().toISOString();
    this._overallProgress = 100;
    this._overallPhase = 'completed';
    this.emitChange();
  }

  /** Transition to Failed. */
  fail(error: string, errorCode?: string, retryable: boolean = false): void {
    this.assertTransition(ScanJobStatus.Failed);
    this._status = ScanJobStatus.Failed;
    this._completedAt = new Date().toISOString();
    this._error = error;
    this._errorCode = errorCode ?? null;
    this._retryable = retryable;
    this._overallPhase = 'failed';
    this.emitChange();
  }

  /** Transition to Cancelled. */
  cancel(reason?: string): void {
    this.assertTransition(ScanJobStatus.Cancelled);
    this._status = ScanJobStatus.Cancelled;
    this._completedAt = new Date().toISOString();
    this._error = reason ?? null;
    this._overallPhase = 'cancelled';
    this.emitChange();
  }

  // ─── Mutation Methods ─────────────────────────────────

  /** Add findings from an engine. */
  addFindings(findings: readonly Finding[]): void {
    this._findings.push(...findings);
    this.emitChange();
  }

  /** Update progress for a specific engine. */
  updateEngineProgress(engineId: string, update: Partial<EngineJobProgress>): void {
    const existing = this._engineProgress.get(engineId);
    if (existing) {
      this._engineProgress.set(engineId, { ...existing, ...update });
    }
    this.recomputeOverallProgress();
    this.emitChange();
  }

  /** Mark an engine as finished. */
  markEngineFinished(engineId: string, error?: string): void {
    const existing = this._engineProgress.get(engineId);
    if (existing) {
      this._engineProgress.set(engineId, {
        ...existing,
        finished: true,
        error: !!error,
        errorMessage: error,
        progress: 100,
      });
    }
    this.recomputeOverallProgress();
    this.emitChange();
  }

  /** Increment total request counter. */
  incrementRequests(count: number): void {
    this._totalRequests += count;
  }

  // ─── Observers ────────────────────────────────────────

  /** Subscribe to state changes. Returns unsubscribe function. */
  onStateChange(handler: (job: ScanJob) => void): () => void {
    this._onStateChange.push(handler);
    return () => {
      this._onStateChange = this._onStateChange.filter(h => h !== handler);
    };
  }

  // ─── Snapshot (immutable view) ────────────────────────

  /** Create an immutable snapshot of the current state. */
  toSnapshot(): ScanJobSnapshot {
    return Object.freeze({
      id: this.id,
      correlationId: this.correlationId,
      targetId: this.targetId,
      targetUrl: this.targetUrl,
      targetName: this.targetName,
      triggerType: this.triggerType,
      triggeredBy: this.triggeredBy,
      requiredCapabilities: this.requiredCapabilities,
      profileName: this.profileName,
      status: this._status,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      engineIds: this._engineIds,
      findingsCount: this._findings.length,
      findingsBySeverity: this.findingsBySeverity,
      overallProgress: this._overallProgress,
      overallPhase: this._overallPhase,
      totalRequests: this._totalRequests,
      engineProgress: new Map(this._engineProgress),
      error: this._error,
      errorCode: this._errorCode,
      retryable: this._retryable,
      durationMs: this.durationMs,
      isTerminal: this.isTerminal,
      createdAt: this.createdAt,
      metadata: this._metadata,
    });
  }

  // ─── Internals ────────────────────────────────────────

  private assertTransition(target: ScanJobStatus): void {
    if (this.isTerminal) {
      throw new ScanJobTerminalError(this.id, this._status);
    }
    const validTransitions: Record<ScanJobStatus, ScanJobStatus[]> = {
      [ScanJobStatus.Pending]: [ScanJobStatus.Running, ScanJobStatus.Cancelled],
      [ScanJobStatus.Running]: [ScanJobStatus.Completed, ScanJobStatus.Failed, ScanJobStatus.Cancelled],
      [ScanJobStatus.Completed]: [],
      [ScanJobStatus.Failed]: [],
      [ScanJobStatus.Cancelled]: [],
    };
    const allowed = validTransitions[this._status];
    if (!allowed.includes(target)) {
      throw new InvalidJobTransitionError(this.id, this._status, target);
    }
  }

  private recomputeOverallProgress(): void {
    const entries = Array.from(this._engineProgress.values());
    if (entries.length === 0) {
      this._overallProgress = 0;
      return;
    }
    const total = entries.reduce((sum, e) => sum + e.progress, 0);
    this._overallProgress = Math.round(total / entries.length);

    // Determine overall phase from engine phases
    const phases = entries.map(e => e.phase);
    if (phases.some(p => p === 'failed')) {
      this._overallPhase = 'has_errors';
    } else if (entries.every(e => e.finished)) {
      this._overallPhase = 'finishing';
    } else if (phases.some(p => p === 'testing' || p === 'fuzzing')) {
      this._overallPhase = 'scanning';
    } else if (phases.some(p => p === 'crawling')) {
      this._overallPhase = 'crawling';
    }
  }

  private emitChange(): void {
    for (const handler of this._onStateChange) {
      try {
        handler(this);
      } catch {
        // Observer errors must not break the job.
      }
    }
  }
}

// ─── Immutable Snapshot ────────────────────────────────────

export interface ScanJobSnapshot {
  readonly id: ID;
  readonly correlationId: ID;
  readonly targetId: string;
  readonly targetUrl: string;
  readonly targetName: string;
  readonly triggerType: ScanTriggerType;
  readonly triggeredBy: string;
  readonly requiredCapabilities: readonly ScanCapability[];
  readonly profileName: string;
  readonly status: ScanJobStatus;
  readonly startedAt: Timestamp | null;
  readonly completedAt: Timestamp | null;
  readonly engineIds: readonly string[];
  readonly findingsCount: number;
  readonly findingsBySeverity: SeverityBreakdown;
  readonly overallProgress: number;
  readonly overallPhase: string;
  readonly totalRequests: number;
  readonly engineProgress: ReadonlyMap<string, EngineJobProgress>;
  readonly error: string | null;
  readonly errorCode: string | null;
  readonly retryable: boolean;
  readonly durationMs: number | null;
  readonly isTerminal: boolean;
  readonly createdAt: Timestamp;
  readonly metadata: StringMap;
}