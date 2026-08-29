/**
 * Project Service — Session persistence + continuity
 * TASK-AIS-EVIDENCE-PERSISTENCE-001 + TASK-AIS-INSIGHT-LIFECYCLE-001
 *
 * Captures session answers, feedback, and provides history.
 * Uses ProjectStore for persistence and sanitizes secrets.
 */

import { randomUUID } from 'node:crypto';
import { sanitizeSecrets } from '../core/evidence-loop/secret-sanitizer.js';
import {
  type Project,
  type PersistedSession,
  type PersistedClaim,
  type PersistedEvidence,
  type PersistedFeedback,
  type PersistedFinding,
  MAX_PERSISTED_ANSWER_LENGTH,
  MAX_PERSISTED_EXCERPT_LENGTH,
} from './project-types.js';
import type { ProjectStore } from './project-store.js';

// ═══════════════════════════════════════════════════════════════════
// PROJECT SERVICE
// ═══════════════════════════════════════════════════════════════════

export class ProjectService {
  constructor(private readonly store: ProjectStore) {}

  /** Ensure a project exists, get or create it. */
  ensureProject(projectPath: string, name?: string): Project {
    return this.store.getOrCreate(projectPath, name);
  }

  /** Find project by ID. */
  findById(id: string): Project | undefined {
    return this.store.findById(id);
  }

  /** Capture session answer for persistence. */
  captureSessionAnswer(params: {
    projectPath: string;
    sessionId: string;
    question: string;
    answer: string;
    claims: readonly { claimId: string; statement: string; isVerified: boolean; evidenceCount: number }[];
    sources: readonly { filePath: string; type: string; excerpt: string; relevance: number }[];
  }): Project {
    const project = this.store.getOrCreate(params.projectPath);

    const sanitizedQuestion = sanitizeSecrets(params.question.trim()).substring(0, 5000);
    const sanitizedAnswer = sanitizeSecrets(params.answer).substring(0, MAX_PERSISTED_ANSWER_LENGTH);

    const claims: PersistedClaim[] = (params.claims ?? []).map(c => ({
      claimId: c.claimId,
      statement: sanitizeSecrets(c.statement).substring(0, 1000),
      isVerified: c.isVerified,
      evidenceCount: c.evidenceCount,
    }));

    const sources: PersistedEvidence[] = (params.sources ?? []).map(s => ({
      filePath: s.filePath,
      type: s.type,
      excerpt: sanitizeSecrets(s.excerpt).substring(0, MAX_PERSISTED_EXCERPT_LENGTH),
      relevance: s.relevance,
    }));

    const session: PersistedSession = {
      sessionId: params.sessionId,
      projectPath: params.projectPath,
      createdAt: new Date().toISOString(),
      question: sanitizedQuestion,
      answer: sanitizedAnswer,
      claims,
      sources,
      findings: [],
    };

    return this.store.addSession(project.id, session);
  }

  /** Capture feedback for a session. */
  captureSessionFeedback(params: {
    projectPath: string;
    sessionId: string;
    verdict: string;
    comment?: string;
    findings?: readonly { findingId: string; category: string; severity: string; description: string }[];
  }): Project | undefined {
    const project = this.store.findByPath(params.projectPath);
    if (!project) return undefined;

    const feedback: PersistedFeedback = {
      feedbackId: randomUUID(),
      verdict: params.verdict,
      comment: params.comment ? sanitizeSecrets(params.comment).substring(0, 1000) : undefined,
    };

    const findings: PersistedFinding[] = (params.findings ?? []).map(f => ({
      findingId: f.findingId,
      category: f.category,
      severity: f.severity,
      description: sanitizeSecrets(f.description).substring(0, 2000),
    }));

    return this.store.updateSessionFeedback(project.id, params.sessionId, feedback, findings);
  }

  /** Get session history for a project. */
  getSessionHistory(projectId: string, limit?: number): PersistedSession[] {
    return this.store.getSessionHistory(projectId, limit);
  }

  /** Get recent sessions across all projects. */
  getRecentSessions(limit?: number): PersistedSession[] {
    return this.store.getRecentSessions(limit);
  }

  /** Get project by path. */
  findByPath(projectPath: string): Project | undefined {
    return this.store.findByPath(projectPath);
  }

  /** Get all projects. */
  getAllProjects(): Project[] {
    return this.store.getAll();
  }
}
