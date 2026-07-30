import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlatformScheduler } from '../../../platform/scheduler/scheduler.js';

describe('PlatformScheduler', () => {
  let scheduler: PlatformScheduler;
  beforeEach(() => { scheduler = new PlatformScheduler(); vi.useFakeTimers(); });
  afterEach(async () => { await scheduler.stop(); vi.useRealTimers(); });

  it('schedules an interval task', () => {
    const id = scheduler.schedule('test', () => {}, 1000);
    expect(id).toBeTruthy();
  });
  it('returns task by id', () => {
    const id = scheduler.schedule('test', () => {}, 1000);
    const task = scheduler.getTask(id);
    expect(task?.name).toBe('test');
  });
  it('returns undefined for unknown task', () => {
    expect(scheduler.getTask('unknown')).toBeUndefined();
  });
  it('getAllTasks returns scheduled', () => {
    scheduler.schedule('a', () => {}, 1000);
    scheduler.schedule('b', () => {}, 2000);
    expect(scheduler.getAllTasks()).toHaveLength(2);
  });
  it('cancel removes a task', () => {
    const id = scheduler.schedule('test', () => {}, 1000);
    expect(scheduler.cancel(id)).toBe(true);
    expect(scheduler.getTask(id)).toBeUndefined();
  });
  it('cancel returns false for unknown', () => {
    expect(scheduler.cancel('unknown')).toBe(false);
  });
  it('scheduleOnce returns id', () => {
    const id = scheduler.scheduleOnce('once', () => {}, 5000);
    expect(id).toBeTruthy();
  });
  it('scheduleCron returns id', () => {
    const id = scheduler.scheduleCron('cron', () => {}, '* * * * *');
    expect(id).toBeTruthy();
  });
  it('start begins running', () => {
    scheduler.schedule('test', () => {}, 100);
    scheduler.start();
    expect(scheduler.getAllTasks()).toHaveLength(1);
  });
  it('stop clears all timers', async () => {
    scheduler.schedule('test', () => {}, 100);
    scheduler.start();
    await scheduler.stop();
    expect(scheduler.getAllTasks()).toHaveLength(1);
  });
  it('interval task has intervalMs', () => {
    const id = scheduler.schedule('test', () => {}, 5000);
    expect(scheduler.getTask(id)?.intervalMs).toBe(5000);
  });
  it('cron task has cronExpression', () => {
    const id = scheduler.scheduleCron('test', () => {}, '* * * * *');
    expect(scheduler.getTask(id)?.cronExpression).toBe('* * * * *');
  });
  it('once task has no intervalMs', () => {
    const id = scheduler.scheduleOnce('test', () => {}, 5000);
    expect(scheduler.getTask(id)?.intervalMs).toBeUndefined();
  });
  it('multiple cancels work', () => {
    const ids = [scheduler.schedule('a', () => {}, 1000), scheduler.schedule('b', () => {}, 2000)];
    expect(scheduler.cancel(ids[0])).toBe(true);
    expect(scheduler.cancel(ids[1])).toBe(true);
    expect(scheduler.getAllTasks()).toHaveLength(0);
  });
  it('handles 50 tasks', () => {
    for (let i = 0; i < 50; i++) scheduler.schedule(`t${i}`, () => {}, 1000 * (i + 1));
    expect(scheduler.getAllTasks()).toHaveLength(50);
  });
  it('tasks have unique ids', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) ids.add(scheduler.schedule(`t${i}`, () => {}, 1000));
    expect(ids.size).toBe(10);
  });
});
