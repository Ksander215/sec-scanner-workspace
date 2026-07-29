/**
 * Tool Runtime Integration Tests
 *
 * Tests the full ToolRuntime: register, validate, load, execute, dispose.
 * Covers events, metrics, capability enforcement, trust zones.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRuntime } from '../core/tool/tool-runtime.js';
import { InProcessEventBus } from '../core/events/event-bus.js';
import {
  ToolCapability,
  ToolTrustLevel,
  ToolLifecycleState,
} from '../core/tool/types.js';
import type {
  Tool,
  ToolMetadata,
  ToolValidationResult,
  ToolExecutionContext,
  ToolRequest,
  ToolResponse,
} from '../core/tool/types.js';
import {
  ToolNotFoundError,
  CapabilityDeniedError,
  ToolValidationError,
} from '../core/tool/errors.js';

function createMockTool(
  name: string,
  opts: Partial<{
    trustLevel: ToolTrustLevel;
    capabilities: readonly ToolCapability[];
    executeFn: (req: ToolRequest, ctx: ToolExecutionContext) => Promise<ToolResponse>;
    validateErrors: string[];
  }> = {},
): Tool {
  const metadata: ToolMetadata = {
    name,
    version: '1.0.0',
    description: `Mock tool ${name}`,
    capabilities: opts.capabilities ?? [ToolCapability.Memory],
    trustLevel: opts.trustLevel ?? ToolTrustLevel.Standard,
  };

  let lastContext: ToolExecutionContext | null = null;

  return {
    metadata,
    validate: async () => ({
      valid: (opts.validateErrors?.length ?? 0) === 0,
      errors: opts.validateErrors ?? [],
    }),
    initialize: async (ctx: ToolExecutionContext) => {
      lastContext = ctx;
    },
    execute: async (req: ToolRequest, ctx: ToolExecutionContext) => {
      lastContext = ctx;
      return opts.executeFn
        ? opts.executeFn(req, ctx)
        : { success: true, output: { action: req.action, input: req.input }, durationMs: 0 };
    },
    dispose: async () => {},
    getLastContext: () => lastContext,
  };
}

describe('ToolRuntime', () => {
  let runtime: ToolRuntime;
  let eventBus: InProcessEventBus;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    runtime = new ToolRuntime({ eventBus });
  });

  describe('registerTool', () => {
    it('should register a standard tool', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerTool(tool);
      expect(runtime.tools.has('test-tool')).toBe(true);
    });

    it('should publish ToolRegistered event', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerTool(tool);
      const log = eventBus.getLog();
      const event = log.find(e => e.eventType === 'ToolRegistered');
      expect(event).toBeDefined();
      expect(event!.payload).toMatchObject({ toolName: 'test-tool' });
    });

    it('should reject untrusted tool by security policy', async () => {
      const tool = createMockTool('untrusted', { trustLevel: ToolTrustLevel.Untrusted });
      await expect(runtime.registerTool(tool)).rejects.toThrow(ToolValidationError);
    });

    it('should throw on duplicate registration', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerTool(tool);
      await expect(runtime.registerTool(tool)).rejects.toThrow();
    });
  });

  describe('validateTool', () => {
    it('should validate a valid tool', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerTool(tool);
      await expect(runtime.validateTool('test-tool')).resolves.toBeUndefined();
    });

    it('should publish ToolValidated event', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerTool(tool);
      await runtime.validateTool('test-tool');
      const log = eventBus.getLog();
      const event = log.find(e => e.eventType === 'ToolValidated');
      expect(event).toBeDefined();
      expect((event!.payload as Record<string, unknown>).valid).toBe(true);
    });

    it('should throw on tool with unregistered dependencies', async () => {
      // Create a tool that depends on a non-existent tool
      const toolWithDeps: Tool = {
        metadata: {
          name: 'dep-tool',
          version: '1.0.0',
          description: 'Tool with missing deps',
          capabilities: [ToolCapability.Memory],
          trustLevel: ToolTrustLevel.Standard,
          dependencies: ['non-existent-dep'],
        },
        validate: async () => ({ valid: true, errors: [] }),
        initialize: async () => {},
        execute: async (_req: ToolRequest, _ctx: ToolExecutionContext) => ({ success: true, durationMs: 0 }),
        dispose: async () => {},
      };
      await runtime.registerTool(toolWithDeps);
      await expect(runtime.validateTool('dep-tool')).rejects.toThrow(ToolValidationError);
    });
  });

  describe('loadTool', () => {
    it('should load a validated tool', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerAndLoad(tool);
      expect(runtime.tools.getState('test-tool')).toBe(ToolLifecycleState.Ready);
    });

    it('should publish ToolLoaded event', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerAndLoad(tool);
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'ToolLoaded')).toBe(true);
    });
  });

  describe('executeTool', () => {
    it('should execute a loaded tool successfully', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerAndLoad(tool);

      const response = await runtime.executeTool(
        { toolName: 'test-tool', action: 'test', input: { key: 'value' } },
        { cancelled: false, onCancel: () => {}, cancel: () => {} },
      );

      expect(response.success).toBe(true);
      expect(response.output).toEqual({ action: 'test', input: { key: 'value' } });
    });

    it('should publish ToolStarted and ToolFinished events', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerAndLoad(tool);

      await runtime.executeTool(
        { toolName: 'test-tool', action: 'test', input: {} },
        { cancelled: false, onCancel: () => {}, cancel: () => {} },
      );

      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'ToolStarted')).toBe(true);
      expect(log.some(e => e.eventType === 'ToolFinished')).toBe(true);
    });

    it('should throw ToolNotFoundError for unknown tool', async () => {
      await expect(
        runtime.executeTool(
          { toolName: 'nonexistent', action: 'test', input: {} },
          { cancelled: false, onCancel: () => {}, cancel: () => {} },
        ),
      ).rejects.toThrow(ToolNotFoundError);
    });

    it('should enforce capability policy', async () => {
      // Restricted tool requesting network capability
      const tool = createMockTool('restricted-tool', {
        trustLevel: ToolTrustLevel.Restricted,
        capabilities: [ToolCapability.Network],
      });
      await runtime.registerAndLoad(tool);

      await expect(
        runtime.executeTool(
          { toolName: 'restricted-tool', action: 'connect', input: {} },
          { cancelled: false, onCancel: () => {}, cancel: () => {} },
        ),
      ).rejects.toThrow(CapabilityDeniedError);
    });

    it('should record metrics on success', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerAndLoad(tool);

      await runtime.executeTool(
        { toolName: 'test-tool', action: 'test', input: {} },
        { cancelled: false, onCancel: () => {}, cancel: () => {} },
      );

      const summary = runtime.metricsCollector.getSummary();
      expect(summary.totalExecutions).toBe(1);
      expect(summary.successfulExecutions).toBe(1);
    });

    it('should record metrics on failure', async () => {
      const tool = createMockTool('fail-tool', {
        executeFn: async () => ({
          success: false,
          error: { code: 'FAIL', message: 'intentional', retryable: false },
          durationMs: 0,
        }),
      });
      await runtime.registerAndLoad(tool);

      await runtime.executeTool(
        { toolName: 'fail-tool', action: 'fail', input: {} },
        { cancelled: false, onCancel: () => {}, cancel: () => {} },
      );

      const summary = runtime.metricsCollector.getSummary();
      expect(summary.failedExecutions).toBe(1);
    });

    it('should inject context with trust zone Z2 for standard tool', async () => {
      let capturedCtx: ToolExecutionContext | null = null;
      const tool = createMockTool('standard-tool', {
        trustLevel: ToolTrustLevel.Standard,
        executeFn: async (_req, ctx) => {
          capturedCtx = ctx;
          return { success: true, durationMs: 0 };
        },
      });
      await runtime.registerAndLoad(tool);

      await runtime.executeTool(
        { toolName: 'standard-tool', action: 'test', input: {} },
        { cancelled: false, onCancel: () => {}, cancel: () => {} },
      );

      expect(capturedCtx).not.toBeNull();
      expect(capturedCtx!.trustZone).toBe('Z2');
    });

    it('should inject context with trust zone Z1 for trusted tool', async () => {
      let capturedCtx: ToolExecutionContext | null = null;
      const tool = createMockTool('trusted-tool', {
        trustLevel: ToolTrustLevel.Trusted,
        capabilities: [ToolCapability.Memory, ToolCapability.Network],
        executeFn: async (_req, ctx) => {
          capturedCtx = ctx;
          return { success: true, durationMs: 0 };
        },
      });
      await runtime.registerAndLoad(tool);

      await runtime.executeTool(
        { toolName: 'trusted-tool', action: 'test', input: {} },
        { cancelled: false, onCancel: () => {}, cancel: () => {} },
      );

      expect(capturedCtx!.trustZone).toBe('Z1');
    });
  });

  describe('disposeTool', () => {
    it('should dispose a tool', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerAndLoad(tool);
      await runtime.disposeTool('test-tool');
      expect(runtime.tools.getState('test-tool')).toBe(ToolLifecycleState.Disposed);
    });

    it('should publish ToolDisposed event', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerAndLoad(tool);
      await runtime.disposeTool('test-tool');
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'ToolDisposed')).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('should start and stop', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerAndLoad(tool);
      await runtime.start();
      expect(runtime.isRunning).toBe(true);
      await runtime.stop();
      expect(runtime.isRunning).toBe(false);
    });

    it('should dispose all on stop', async () => {
      const toolA = createMockTool('tool-a');
      const toolB = createMockTool('tool-b');
      await runtime.registerAndLoad(toolA);
      await runtime.registerAndLoad(toolB);
      await runtime.start();
      await runtime.stop();
      expect(runtime.tools.getState('tool-a')).toBe(ToolLifecycleState.Disposed);
      expect(runtime.tools.getState('tool-b')).toBe(ToolLifecycleState.Disposed);
    });
  });

  describe('event publishing', () => {
    it('should publish ToolStateChange events', async () => {
      const tool = createMockTool('test-tool');
      await runtime.registerAndLoad(tool);
      const log = eventBus.getLog();
      const stateChanges = log.filter(e => e.eventType === 'ToolStateChange');
      expect(stateChanges.length).toBeGreaterThanOrEqual(3);
    });
  });
});
