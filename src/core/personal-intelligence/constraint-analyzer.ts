/**
 * Personal Intelligence Pack — Constraint Analyzer
 * TASK-AIS-007A.000
 *
 * Detects, analyzes, and tracks constraints following The Goal (TOC)
 * philosophy and PHI-003.000 FOCUS process.
 */
import type { PersonalIntelligenceContracts } from './contracts.js';
import type { PackConstraint, PackConstraintId, ConstraintSeverity, ConstraintLifecycle, PackGoalId } from './types.js';
import { ConstraintLifecycle as CL } from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import { ConstraintNotFoundError, ConstraintAnalysisError } from './errors.js';

export class ConstraintAnalyzer {
  private contracts: PersonalIntelligenceContracts;
  private constraints = new Map<string, PackConstraint>();
  private readonly maxConstraints: number;

  constructor(contracts: PersonalIntelligenceContracts, maxConstraints = 100) {
    this.contracts = contracts;
    this.maxConstraints = maxConstraints;
  }

  detectConstraint(title: string, description: string, severity: ConstraintSeverity, goalId?: string, impact?: string): PackConstraint {
    if (!title.trim()) throw new ConstraintAnalysisError('title is required');
    if (this.constraints.size >= this.maxConstraints) throw new ConstraintAnalysisError('Maximum constraint count reached');

    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID() as unknown as PackConstraintId;

    const constraint: PackConstraint = Object.freeze({
      id, title: title.trim(), description: description.trim(),
      severity, lifecycle: CL.Detected,
      goalId: (goalId ?? null) as unknown as PackGoalId | null,
      impact: impact ?? '',
      evidence: Object.freeze([]),
      actionSteps: Object.freeze([]),
      createdAt: now, updatedAt: now, resolvedAt: null,
    });

    this.constraints.set(id as unknown as string, constraint);

    const base = createPackEventBase('ConstraintDetected', EventClassification.Info, id as unknown as string);
    void this.contracts.platform.publishEvent('ConstraintDetected', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { constraintId: id, title, severity, goalId: goalId ?? null, detectedAt: now },
    });

    return constraint;
  }

  advanceLifecycle(id: string, newLifecycle: ConstraintLifecycle): PackConstraint {
    const existing = this.getOrThrow(id);
    const now = new Date().toISOString() as Timestamp;
    const oldLifecycle = existing.lifecycle;
    const resolvedAt = newLifecycle === CL.Resolved ? now : existing.resolvedAt;

    const updated: PackConstraint = Object.freeze({
      ...existing, lifecycle: newLifecycle, updatedAt: now, resolvedAt,
    });

    this.constraints.set(id, updated);

    if (newLifecycle === CL.Resolved) {
      const base = createPackEventBase('ConstraintResolved', EventClassification.Result, id);
      void this.contracts.platform.publishEvent('ConstraintResolved', {
        ...base, sequence: 0, version: '1.0.0',
        payload: { constraintId: id, title: updated.title, resolvedAt: now },
      });
    } else {
      const base = createPackEventBase('ConstraintLifecycleChanged', EventClassification.StateChange, id);
      void this.contracts.platform.publishEvent('ConstraintLifecycleChanged', {
        ...base, sequence: 0, version: '1.0.0',
        payload: { constraintId: id, oldLifecycle, newLifecycle, changedAt: now },
      });
    }

    return updated;
  }

  addEvidence(id: string, evidence: string): PackConstraint {
    const existing = this.getOrThrow(id);
    const updated: PackConstraint = Object.freeze({
      ...existing, evidence: Object.freeze([...existing.evidence, evidence]),
      updatedAt: new Date().toISOString() as Timestamp,
    });
    this.constraints.set(id, updated);
    return updated;
  }

  addActionSteps(id: string, steps: readonly string[]): PackConstraint {
    const existing = this.getOrThrow(id);
    const updated: PackConstraint = Object.freeze({
      ...existing, actionSteps: Object.freeze([...existing.actionSteps, ...steps]),
      updatedAt: new Date().toISOString() as Timestamp,
    });
    this.constraints.set(id, updated);
    return updated;
  }

  getConstraint(id: string): PackConstraint { return this.getOrThrow(id); }

  getBySeverity(severity: ConstraintSeverity): readonly PackConstraint[] {
    return Object.freeze(Array.from(this.constraints.values()).filter(c => c.severity === severity));
  }

  getByLifecycle(lifecycle: ConstraintLifecycle): readonly PackConstraint[] {
    return Object.freeze(Array.from(this.constraints.values()).filter(c => c.lifecycle === lifecycle));
  }

  getMainConstraint(): PackConstraint | null {
    const active = Array.from(this.constraints.values()).filter(c => c.lifecycle !== CL.Resolved);
    if (active.length === 0) return null;
    const severityOrder: Record<string, number> = { Systemic: 0, Major: 1, Moderate: 2, Minor: 3 };
    active.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
    return active[0];
  }

  getAllConstraints(): readonly PackConstraint[] { return Object.freeze(Array.from(this.constraints.values())); }
  getConstraintCount(): number { return this.constraints.size; }
  getResolvedCount(): number { return this.getByLifecycle(CL.Resolved).length; }
  getActiveCount(): number { return this.constraints.size - this.getResolvedCount(); }

  dispose(): void { this.constraints.clear(); }

  // ── Private ───────────────────────────────────────────────

  private getOrThrow(id: string): PackConstraint {
    const c = this.constraints.get(id);
    if (!c) throw new ConstraintNotFoundError(id);
    return c;
  }
}
