/**
 * Tool Sandbox Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolSandbox, DEFAULT_SANDBOX_CONFIG } from '../core/tool/sandbox.js';
import { ToolCapability, ToolTrustLevel } from '../core/tool/types.js';
import type { Tool, ToolMetadata, ToolExecutionContext, ToolRequest, ToolResponse, CancellationToken } from '../core/tool/types.js';

function createSimpleTool(response: ToolResponse): Tool {
  const metadata: ToolMetadata = {
    name: 'simple-tool',
    version: '1.0.0',
    description: 'Simple test tool',
    capabilities: [ToolCapability.Memory],
    trustLevel: ToolTrustLevel.Standard,
  };
  return {
    metadata,
    validate: async () => ({ valid: true, errors: [] }),
    initialize: async () => {},
    execute: async () => response,
    dispose: async () => {},
  };
}

function createThrowingTool(error: Error): Tool {
  const metadata: ToolMetadata = {
    name: 'throwing-tool',
    version: '1.0.0',
    description: 'Throwing test tool',
    capabilities: [ToolCapability.Memory],
    trustLevel: ToolTrustLevel.Standard,
  };
  return {
    metadata,
    validate: async () => ({ valid: true, errors: [] }),
    initialize: async () => {},
    execute: async () => { throw error; },
    dispose: async () => {},
  };
}

function createMockContext(overrides: Partial<ToolExecutionContext> = {}): ToolExecutionContext {
  return {
    executionId: 'test-exec-1',
    toolName: 'test-tool',
    cancellationToken: { cancelled: false, onCancel: () => {}, cancel: () => {} },
    logger: { toolName: 'test-tool', info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    eventPublisher: { publish: async () => ({ eventId: '', eventType: '', classification: 'info' as const, timestamp: '', sequence: 0, aggregateId: '', aggregateType: '', version: '' }) },
    configuration: {},
    clock: { now: '2026-01-01T00:00:00Z', epochMs: 0 },
    memory: { toolName: 'test-tool', scope: 'execution' as const, get: () => null, set: () => {}, has: () => false, delete: () => false },
    trustZone: 'Z1' as const,
    ...overrides,
  };
}

describe('ToolSandbox', () => {
  let sandbox: ToolSandbox;

  beforeEach(() => {
    sandbox = new ToolSandbox();
  });

  it('should execute a successful tool', async () => {
    const tool = createSimpleTool({ success: true, output: { result: 'ok' }, durationMs: 0 });
    const request: ToolRequest = { toolName: 'simple-tool', action: 'test', input: {} };
    const ctx = createMockContext();

    const response = await sandbox.execute(tool, request, ctx);
    expect(response.success).toBe(true);
    expect(response.output).toEqual({ result: 'ok' });
    expect(response.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should capture tool errors and return as response', async () => {
    const tool = createThrowingTool(new Error('boom'));
    const request: ToolRequest = { toolName: 'throwing-tool', action: 'test', input: {} };
    const ctx = createMockContext();

    const response = await sandbox.execute(tool, request, ctx);
    expect(response.success).toBe(false);
    expect(response.error?.message).toBe('boom');
    expect(response.error?.code).toBe('UNKNOWN_ERROR');
  });

  it('should return cancelled response if already cancelled', async () => {
    const tool = createSimpleTool({ success: true, durationMs: 0 });
    const request: ToolRequest = { toolName: 'simple-tool', action: 'test', input: {} };
    const ctx = createMockContext({
      cancellationToken: { cancelled: true, onCancel: () => {}, cancel: () => {}, reason: 'user cancel' },
    });

    const response = await sandbox.execute(tool, request, ctx);
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('TOOL_CANCELLED');
  });

  it('should enforce timeout', async () => {
    const slowTool: Tool = {
      metadata: {
        name: 'slow-tool', version: '1.0.0', description: 'Slow',
        capabilities: [ToolCapability.Memory], trustLevel: ToolTrustLevel.Standard,
      },
      validate: async () => ({ valid: true, errors: [] }),
      initialize: async () => {},
      execute: async () => { await new Promise(r => setTimeout(r, 5000)); return { success: true, durationMs: 0 }; },
      dispose: async () => {},
    };
    const request: ToolRequest = { toolName: 'slow-tool', action: 'test', input: {}, timeoutMs: 50 };
    const ctx = createMockContext();

    const sandboxWithTimeout = new ToolSandbox({ enforceTimeout: true, timeoutMs: 50 });
    const response = await sandboxWithTimeout.execute(slowTool, request, ctx);
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('TOOL_TIMEOUT');
  });

  it('should return config', () => {
    expect(sandbox.getConfig()).toEqual(DEFAULT_SANDBOX_CONFIG);
  });

  it('should respect custom config', () => {
    const custom = new ToolSandbox({ timeoutMs: 10000, enforceTimeout: false });
    expect(custom.getConfig().timeoutMs).toBe(10000);
    expect(custom.getConfig().enforceTimeout).toBe(false);
  });

  it('should propagate tool failure response', async () => {
    const failingTool = createSimpleTool({
      success: false,
      error: { code: 'CUSTOM_ERROR', message: 'custom failure', retryable: true },
      durationMs: 0,
    });
    const request: ToolRequest = { toolName: 'simple-tool', action: 'test', input: {} };
    const ctx = createMockContext();

    const response = await sandbox.execute(failingTool, request, ctx);
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('CUSTOM_ERROR');
    expect(response.error?.retryable).toBe(true);
  });
});
