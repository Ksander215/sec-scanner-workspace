import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlatformScheduler } from '../../../platform/scheduler/scheduler.js';

describe('PlatformScheduler Extended', () => {
  let s: PlatformScheduler;
  beforeEach(() => { s = new PlatformScheduler(); vi.useFakeTimers(); });
  afterEach(async () => { await s.stop(); vi.useRealTimers(); });

  it('schedule 20 tasks', () => {
    for (let i = 0; i < 20; i++) s.schedule(`t${i}`, () => {}, 1000 * (i + 1));
    expect(s.getAllTasks()).toHaveLength(20);
  });

  it('cancel all tasks', () => {
    const ids = [];
    for (let i = 0; i < 10; i++) ids.push(s.schedule(`t${i}`, () => {}, 1000));
    for (const id of ids) s.cancel(id);
    expect(s.getAllTasks()).toHaveLength(0);
  });

  it('cancel non-existent is safe', () => {
    expect(s.cancel('nope')).toBe(false);
  });

  it('getTask returns undefined after cancel', () => {
    const id = s.schedule('t', () => {}, 1000);
    s.cancel(id);
    expect(s.getTask(id)).toBeUndefined();
  });

  it('multiple scheduleOnce', () => {
    for (let i = 0; i < 10; i++) s.scheduleOnce(`t${i}`, () => {}, 1000 * (i + 1));
    expect(s.getAllTasks()).toHaveLength(10);
  });

  it('multiple scheduleCron', () => {
    for (let i = 0; i < 10; i++) s.scheduleCron(`t${i}`, () => {}, `*/${i + 1} * * * *`);
    expect(s.getAllTasks()).toHaveLength(10);
  });

  it('task name is preserved', () => {
    const id = s.schedule('my-task', () => {}, 5000);
    expect(s.getTask(id)?.name).toBe('my-task');
  });

  it('createdAt is populated', () => {
    const id = s.schedule('t', () => {}, 5000);
    expect(s.getTask(id)?.createdAt).toBeDefined();
  });

  it('nextRunAt is populated for interval', () => {
    const id = s.schedule('t', () => {}, 5000);
    expect(s.getTask(id)?.nextRunAt).toBeDefined();
  });

  it('nextRunAt is null for cron with invalid expression', () => {
    const id = s.scheduleCron('t', () => {}, 'invalid');
    expect(s.getTask(id)?.nextRunAt).toBeNull();
  });

  it('start and stop multiple times', async () => {
    s.schedule('t', () => {}, 1000);
    s.start();
    await s.stop();
    s.start();
    await s.stop();
    expect(true).toBe(true);
  });

  it('schedule with very short interval', () => {
    const id = s.schedule('fast', () => {}, 1);
    expect(s.getTask(id)?.intervalMs).toBe(1);
  });

  it('50 scheduleOnce tasks', () => {
    for (let i = 0; i < 50; i++) s.scheduleOnce(`t${i}`, () => {}, 1000 * (i + 1));
    expect(s.getAllTasks()).toHaveLength(50);
  });

  it('task has running false initially', () => {
    const id = s.schedule('t', () => {}, 1000);
    expect(s.getTask(id)?.running).toBe(false);
  });

  it('frozen task returned', () => {
    const id = s.schedule('t', () => {}, 1000);
    const t = s.getTask(id);
    expect(Object.isFrozen(t!)).toBe(true);
  });
});
