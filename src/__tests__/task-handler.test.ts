import { describe, it, expect } from 'vitest';
import {
  TaskHandlerRegistry,
  EchoHandler,
  IdentityHandler,
  FailHandler,
  DelayHandler,
} from '../core/pipeline/executor/task-handler.js';
import type { Task } from '../core/pipeline/types.js';
import { TaskStatus } from '../core/pipeline/types.js';

function makeTask(taskType: string, input: Record<string, unknown> = {}): Task {
  return {
    id: crypto.randomUUID() as unknown as Task['id'],
    stepId: crypto.randomUUID() as unknown as Task['stepId'],
    planId: crypto.randomUUID() as unknown as Task['planId'],
    name: `test-${taskType}`,
    taskType,
    input,
    status: TaskStatus.Running,
    attempt: 1,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
  };
}

const noopCtx = {
  variables: {},
  trace: () => {},
  checkCancelled: () => {},
};

describe('TaskHandlerRegistry', () => {
  it('starts empty', () => {
    const reg = new TaskHandlerRegistry();
    expect(reg.getRegisteredTypes()).toHaveLength(0);
  });

  it('registers and retrieves a handler', () => {
    const reg = new TaskHandlerRegistry();
    reg.register(new EchoHandler());
    expect(reg.has('echo')).toBe(true);
    expect(reg.get('echo')).toBeInstanceOf(EchoHandler);
  });

  it('throws on duplicate registration', () => {
    const reg = new TaskHandlerRegistry();
    reg.register(new EchoHandler());
    expect(() => reg.register(new EchoHandler())).toThrow('already registered');
  });

  it('returns undefined for unknown type', () => {
    const reg = new TaskHandlerRegistry();
    expect(reg.get('nonexistent')).toBeUndefined();
  });

  it('unregister removes handler', () => {
    const reg = new TaskHandlerRegistry();
    reg.register(new EchoHandler());
    expect(reg.has('echo')).toBe(true);
    reg.unregister('echo');
    expect(reg.has('echo')).toBe(false);
  });

  it('getRegisteredTypes returns all types', () => {
    const reg = new TaskHandlerRegistry();
    reg.register(new EchoHandler());
    reg.register(new IdentityHandler());
    expect(reg.getRegisteredTypes()).toContain('echo');
    expect(reg.getRegisteredTypes()).toContain('identity');
    expect(reg.getRegisteredTypes()).toHaveLength(2);
  });
});

describe('EchoHandler', () => {
  it('returns input as output', async () => {
    const handler = new EchoHandler();
    const task = makeTask('echo', { key: 'value' });
    const result = await handler.execute(task, noopCtx);
    expect(result.status).toBe(TaskStatus.Succeeded);
    expect(result.output).toEqual({ key: 'value' });
  });
});

describe('IdentityHandler', () => {
  it('wraps input in { result: ... }', async () => {
    const handler = new IdentityHandler();
    const task = makeTask('identity', { x: 42 });
    const result = await handler.execute(task, noopCtx);
    expect(result.status).toBe(TaskStatus.Succeeded);
    expect(result.output).toEqual({ result: { x: 42 } });
  });
});

describe('FailHandler', () => {
  it('returns failed result with default error', async () => {
    const handler = new FailHandler();
    const task = makeTask('fail');
    const result = await handler.execute(task, noopCtx);
    expect(result.status).toBe(TaskStatus.Failed);
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('INTENTIONAL_FAIL');
    expect(result.error!.retryable).toBe(false);
  });

  it('returns failed result with custom error', async () => {
    const handler = new FailHandler('CUSTOM', 'Custom fail', true);
    const task = makeTask('fail');
    const result = await handler.execute(task, noopCtx);
    expect(result.error!.code).toBe('CUSTOM');
    expect(result.error!.retryable).toBe(true);
  });
});

describe('DelayHandler', () => {
  it('succeeds with zero delay', async () => {
    const handler = new DelayHandler();
    const task = makeTask('delay', { delayMs: 0, output: { done: true } });
    const result = await handler.execute(task, noopCtx);
    expect(result.status).toBe(TaskStatus.Succeeded);
    expect(result.output).toEqual({ done: true });
  }, 1000);

  it('succeeds after delay', async () => {
    const handler = new DelayHandler();
    const task = makeTask('delay', { delayMs: 50, output: { delayed: true } });
    const start = Date.now();
    const result = await handler.execute(task, noopCtx);
    const elapsed = Date.now() - start;
    expect(result.status).toBe(TaskStatus.Succeeded);
    expect(result.output).toEqual({ delayed: true });
    expect(elapsed).toBeGreaterThanOrEqual(40);
  }, 1000);
});
