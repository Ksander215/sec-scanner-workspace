/**
 * Scheduler — Background task scheduling
 * TASK-AIS-005A.000 — Platform Integration Foundation
 */
import type { ScheduledTask, Scheduler } from '../types.js';

interface MutableTask {
  id: string;
  name: string;
  handler: () => Promise<void> | void;
  createdAt: string;
  nextRunAt: string | null;
  intervalMs?: number;
  cronExpression?: string;
  running: boolean;
}

class CronParser {
  static nextRun(expression: string, from: Date): Date | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5) return null;
    const next = new Date(from);
    const minutePart = parts.length > 5 ? parts[1] : parts[0];
    const hourPart = parts.length > 5 ? parts[2] : parts[1];
    if (minutePart.startsWith('*/')) {
      const interval = parseInt(minutePart.slice(2), 10);
      if (!isNaN(interval) && interval > 0) { next.setMinutes(next.getMinutes() + interval, 0, 0); return next; }
    }
    if (hourPart.startsWith('*/')) {
      const interval = parseInt(hourPart.slice(2), 10);
      if (!isNaN(interval) && interval > 0) { next.setHours(next.getHours() + interval, 0, 0, 0); return next; }
    }
    next.setMinutes(next.getMinutes() + 1, 0, 0);
    return next;
  }
}

function toScheduledTask(t: MutableTask): ScheduledTask {
  return Object.freeze({ ...t });
}

export class PlatformScheduler implements Scheduler {
  private tasks = new Map<string, MutableTask>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private intervals = new Map<string, ReturnType<typeof setInterval>>();
  private running = false;
  private taskCounter = 0;

  schedule(name: string, handler: () => Promise<void> | void, intervalMs: number): string {
    const id = `task-${++this.taskCounter}`;
    this.tasks.set(id, {
      id, name, handler, createdAt: new Date().toISOString(),
      nextRunAt: new Date(Date.now() + intervalMs).toISOString(), intervalMs, running: false,
    });
    if (this.running) this.startIntervalTask(id, intervalMs);
    return id;
  }

  scheduleOnce(name: string, handler: () => Promise<void> | void, delayMs: number): string {
    const id = `task-once-${++this.taskCounter}`;
    this.tasks.set(id, {
      id, name, handler, createdAt: new Date().toISOString(),
      nextRunAt: new Date(Date.now() + delayMs).toISOString(), running: false,
    });
    if (this.running) {
      this.timers.set(id, setTimeout(async () => { await this.executeTask(id); this.tasks.delete(id); }, delayMs));
    }
    return id;
  }

  scheduleCron(name: string, handler: () => Promise<void> | void, cronExpression: string): string {
    const nextRun = CronParser.nextRun(cronExpression, new Date());
    const id = `task-cron-${++this.taskCounter}`;
    this.tasks.set(id, {
      id, name, handler, createdAt: new Date().toISOString(),
      nextRunAt: nextRun?.toISOString() ?? null, cronExpression, running: false,
    });
    if (this.running && nextRun) this.scheduleCronLoop(id, cronExpression, nextRun.getTime() - Date.now());
    return id;
  }

  cancel(taskId: string): boolean {
    if (!this.tasks.has(taskId)) return false;
    this.tasks.delete(taskId);
    const timer = this.timers.get(taskId); if (timer) { clearTimeout(timer); this.timers.delete(taskId); }
    const interval = this.intervals.get(taskId); if (interval) { clearInterval(interval); this.intervals.delete(taskId); }
    return true;
  }

  getTask(taskId: string): ScheduledTask | undefined {
    const t = this.tasks.get(taskId);
    return t ? toScheduledTask(t) : undefined;
  }

  getAllTasks(): readonly ScheduledTask[] {
    return [...this.tasks.values()].map(toScheduledTask);
  }

  start(): void {
    this.running = true;
    for (const [id, task] of this.tasks) {
      if (task.intervalMs) this.startIntervalTask(id, task.intervalMs);
      else if (task.cronExpression) {
        const nextRun = CronParser.nextRun(task.cronExpression, new Date());
        if (nextRun) this.scheduleCronLoop(id, task.cronExpression, nextRun.getTime() - Date.now());
      }
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    for (const [, timer] of this.timers) clearTimeout(timer);
    for (const [, interval] of this.intervals) clearInterval(interval);
    this.timers.clear(); this.intervals.clear();
  }

  private startIntervalTask(id: string, intervalMs: number): void {
    const existing = this.intervals.get(id); if (existing) clearInterval(existing);
    this.intervals.set(id, setInterval(() => { void this.executeTask(id); }, intervalMs));
  }

  private scheduleCronLoop(id: string, cronExpression: string, initialDelay: number): void {
    this.timers.set(id, setTimeout(async () => {
      await this.executeTask(id);
      if (this.running && this.tasks.has(id)) {
        const nextRun = CronParser.nextRun(cronExpression, new Date());
        if (nextRun) this.scheduleCronLoop(id, cronExpression, Math.max(0, nextRun.getTime() - Date.now()));
      }
    }, Math.max(0, initialDelay)));
  }

  private async executeTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task || task.running) return;
    task.running = true;
    try { await task.handler(); } catch { /* task isolation */ } finally { task.running = false; }
  }
}
