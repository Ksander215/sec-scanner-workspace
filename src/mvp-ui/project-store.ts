/**
 * Project Store — File-based persistence with atomic writes
 * TASK-AIS-EVIDENCE-PERSISTENCE-001 + TASK-AIS-INSIGHT-LIFECYCLE-001
 *
 * One JSON file per project: .ais-data/projects/<project-id>.json
 * Project is the aggregate root — sessions and insights nested within.
 *
 * Atomic write: openSync -> writeSync -> fsyncSync -> closeSync -> renameSync
 * Corruption handling: .tmp skip, empty skip, invalid JSON skip, missing fields skip
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  openSync,
  closeSync,
  writeSync,
  fsyncSync,
} from 'node:fs';
import { resolve, basename } from 'node:path';

import type {
  Project,
  PersistedSession,
  PersistedInsight,
} from './project-types.js';

export class ProjectStore {
  private readonly dataDir: string;
  private readonly projects = new Map<string, Project>();

  constructor(dataDir?: string) {
    this.dataDir = resolve(dataDir ?? '.ais-data/projects');
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getOrCreate(projectPath: string, name?: string): Project {
    const existing = this.findByPath(projectPath);
    if (existing) return existing;
    const project: Project = {
      id: this.pathToId(projectPath),
      name: name ?? basename(projectPath),
      projectPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessions: [],
      insights: [],
    };
    this.projects.set(project.id, project);
    this.writeToFile(project);
    return project;
  }

  findByPath(projectPath: string): Project | undefined {
    for (const p of this.projects.values()) {
      if (p.projectPath === projectPath) return p;
    }
    return undefined;
  }

  findById(id: string): Project | undefined {
    return this.projects.get(id);
  }

  loadAll(): void {
    if (!existsSync(this.dataDir)) return;
    const files = readdirSync(this.dataDir);
    for (const file of files) {
      if (file.endsWith('.tmp')) continue;
      if (!file.endsWith('.json')) continue;
      const filePath = resolve(this.dataDir, file);
      const raw = readFileSync(filePath, 'utf-8');
      if (!raw.trim()) continue;
      let data: unknown;
      try { data = JSON.parse(raw); } catch { continue; }
      if (!this.isValidProject(data)) continue;
      const project = data as Project;
      const safe: Project = {
        ...project,
        sessions: Array.isArray(project.sessions) ? project.sessions : [],
        insights: Array.isArray(project.insights) ? project.insights : [],
      };
      this.projects.set(safe.id, safe);
    }
  }

  getAll(): Project[] {
    return Array.from(this.projects.values());
  }

  getWithInsights(): Project[] {
    return this.getAll().filter(p => p.insights.length > 0);
  }

  // ─── SESSION OPERATIONS ─────────────────────────────────────

  addSession(projectId: string, session: PersistedSession): Project {
    const project = this.requireProject(projectId);
    const updated: Project = {
      ...project,
      sessions: [...project.sessions, session],
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(projectId, updated);
    this.writeToFile(updated);
    return updated;
  }

  updateSessionFeedback(projectId: string, sessionId: string, feedback: PersistedSession['feedback'], findings: PersistedSession['findings']): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    const sessions = project.sessions.map(s =>
      s.sessionId === sessionId ? { ...s, feedback, findings } : s
    );
    const updated: Project = { ...project, sessions, updatedAt: new Date().toISOString() };
    this.projects.set(projectId, updated);
    this.writeToFile(updated);
    return updated;
  }

  getSessionHistory(projectId: string, limit?: number): PersistedSession[] {
    const project = this.projects.get(projectId);
    if (!project) return [];
    const sessions = [...project.sessions].reverse();
    return limit ? sessions.slice(0, limit) : sessions;
  }

  getRecentSessions(limit?: number): PersistedSession[] {
    const all: PersistedSession[] = [];
    for (const p of this.projects.values()) {
      all.push(...p.sessions);
    }
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? all.slice(0, limit) : all;
  }

  // ─── INSIGHT OPERATIONS ─────────────────────────────────────

  addInsight(projectId: string, insight: PersistedInsight): Project {
    const project = this.requireProject(projectId);
    const updated: Project = {
      ...project,
      insights: [...project.insights, insight],
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(projectId, updated);
    this.writeToFile(updated);
    return updated;
  }

  updateInsight(projectId: string, insightId: string, patch: Partial<PersistedInsight>): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    const insights = project.insights.map(i =>
      i.id === insightId ? { ...i, ...patch } as PersistedInsight : i
    );
    const updated: Project = { ...project, insights, updatedAt: new Date().toISOString() };
    this.projects.set(projectId, updated);
    this.writeToFile(updated);
    return updated;
  }

  getInsight(projectId: string, insightId: string): PersistedInsight | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    return project.insights.find(i => i.id === insightId);
  }

  getInsights(projectId: string): PersistedInsight[] {
    const project = this.projects.get(projectId);
    if (!project) return [];
    return [...project.insights].reverse();
  }

  getRevisitableInsights(projectId: string): PersistedInsight[] {
    const insights = this.getInsights(projectId);
    return insights.filter(i => i.status === 'REVISITABLE' as any);
  }

  // ─── PERSISTENCE ────────────────────────────────────────────

  private writeToFile(project: Project): void {
    const data = this.serialize(project);
    const json = JSON.stringify(data, null, 2);
    const targetPath = this.filePath(project.id);
    const tmpPath = targetPath + '.tmp';
    const fd = openSync(tmpPath, 'w', 0o600);
    try {
      const buffer = Buffer.from(json, 'utf-8');
      writeSync(fd, buffer, 0, buffer.length, 0);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmpPath, targetPath);
  }

  private filePath(projectId: string): string {
    return resolve(this.dataDir, `${projectId}.json`);
  }

  private serialize(project: Project): unknown {
    return { ...project };
  }

  private isValidProject(data: unknown): data is Project {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;
    return typeof obj.id === 'string' && obj.id.length > 0
      && typeof obj.name === 'string' && obj.name.length > 0;
  }

  private requireProject(id: string): Project {
    const project = this.projects.get(id);
    if (!project) throw new Error(`Project not found: ${id}`);
    return project;
  }

  private pathToId(projectPath: string): string {
    const hash = Buffer.from(projectPath).toString('base64url').replace(/=/g, '');
    return hash.substring(0, 32);
  }
}
