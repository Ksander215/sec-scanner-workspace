/**
 * Tool Registry Tests
 *
 * Tests for: register, unregister, resolve, list, discover, setState.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../core/tool/tool-registry.js';
import { ToolLifecycleState, ToolCapability, ToolTrustLevel } from '../core/tool/types.js';
import type { Tool, ToolMetadata, ToolValidationResult, ToolExecutionContext, ToolRequest, ToolResponse } from '../core/tool/types.js';

function createMockTool(name: string, caps: readonly ToolCapability[] = [ToolCapability.Memory]): Tool {
  const metadata: ToolMetadata = {
    name,
    version: '1.0.0',
    description: `Mock tool ${name}`,
    capabilities: caps,
    trustLevel: ToolTrustLevel.Standard,
  };
  return {
    metadata,
    validate: async (): Promise<ToolValidationResult> => ({ valid: true, errors: [] }),
    initialize: async (): Promise<void> => {},
    execute: async (_req: ToolRequest, _ctx: ToolExecutionContext): Promise<ToolResponse> => ({
      success: true,
      durationMs: 0,
    }),
    dispose: async (): Promise<void> => {},
  };
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register', () => {
    it('should register a tool successfully', () => {
      const tool = createMockTool('tool-a');
      registry.register(tool);
      expect(registry.has('tool-a')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should throw on duplicate registration', () => {
      const tool = createMockTool('tool-a');
      registry.register(tool);
      expect(() => registry.register(tool)).toThrow("Tool 'tool-a' is already registered");
    });

    it('should set initial state to Registered', () => {
      const tool = createMockTool('tool-a');
      registry.register(tool);
      expect(registry.getState('tool-a')).toBe(ToolLifecycleState.Registered);
    });
  });

  describe('unregister', () => {
    it('should remove a registered tool', () => {
      const tool = createMockTool('tool-a');
      registry.register(tool);
      expect(registry.unregister('tool-a')).toBe(true);
      expect(registry.has('tool-a')).toBe(false);
    });

    it('should return false for non-existent tool', () => {
      expect(registry.unregister('nonexistent')).toBe(false);
    });
  });

  describe('resolve', () => {
    it('should resolve a registered tool', () => {
      const tool = createMockTool('tool-a');
      registry.register(tool);
      expect(registry.resolve('tool-a')?.metadata.name).toBe('tool-a');
    });

    it('should return undefined for non-existent tool', () => {
      expect(registry.resolve('nonexistent')).toBeUndefined();
    });

    it('should throw on resolveOrThrow for non-existent tool', () => {
      expect(() => registry.resolveOrThrow('nonexistent')).toThrow("Tool 'nonexistent' not found");
    });
  });

  describe('list', () => {
    it('should list all tool metadata', () => {
      registry.register(createMockTool('tool-a'));
      registry.register(createMockTool('tool-b'));
      const list = registry.list();
      expect(list).toHaveLength(2);
      expect(list.map(m => m.name)).toContain('tool-a');
      expect(list.map(m => m.name)).toContain('tool-b');
    });

    it('should list all tool names', () => {
      registry.register(createMockTool('tool-a'));
      registry.register(createMockTool('tool-b'));
      expect(registry.listNames()).toEqual(['tool-a', 'tool-b']);
    });
  });

  describe('discover', () => {
    it('should discover tools by capability', () => {
      registry.register(createMockTool('tool-a', [ToolCapability.Filesystem, ToolCapability.Memory]));
      registry.register(createMockTool('tool-b', [ToolCapability.Memory]));
      const fsTools = registry.discoverByCapability(ToolCapability.Filesystem);
      expect(fsTools).toHaveLength(1);
      expect(fsTools[0].name).toBe('tool-a');
    });

    it('should discover tools by tag', () => {
      const tool = createMockTool('tool-a');
      registry.register(tool);
      // Tool without tags — no discovery results
      const tagged = registry.discoverByTag('test-tag');
      expect(tagged).toHaveLength(0);
    });
  });

  describe('setState', () => {
    it('should update tool state', () => {
      registry.register(createMockTool('tool-a'));
      registry.setState('tool-a', ToolLifecycleState.Validated);
      expect(registry.getState('tool-a')).toBe(ToolLifecycleState.Validated);
    });

    it('should throw for non-existent tool', () => {
      expect(() => registry.setState('nonexistent', ToolLifecycleState.Validated)).toThrow();
    });
  });

  describe('getAll', () => {
    it('should return all registrations', () => {
      registry.register(createMockTool('tool-a'));
      registry.register(createMockTool('tool-b'));
      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should clear all registrations', () => {
      registry.register(createMockTool('tool-a'));
      registry.register(createMockTool('tool-b'));
      registry.clear();
      expect(registry.size).toBe(0);
    });
  });
});
