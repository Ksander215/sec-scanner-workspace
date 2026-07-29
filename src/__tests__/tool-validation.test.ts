/**
 * Tool Validator Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolValidator } from '../core/tool/validator.js';
import { ToolRegistry } from '../core/tool/tool-registry.js';
import { ToolCapability, ToolTrustLevel, ToolLifecycleState } from '../core/tool/types.js';
import type { Tool, ToolMetadata, ToolValidationResult, ToolExecutionContext, ToolRequest, ToolResponse } from '../core/tool/types.js';

function createTool(overrides: Partial<ToolMetadata> = {}): Tool {
  const metadata: ToolMetadata = {
    name: 'test-tool',
    version: '1.0.0',
    description: 'Test tool',
    capabilities: [ToolCapability.Memory],
    trustLevel: ToolTrustLevel.Standard,
    ...overrides,
  };
  return {
    metadata,
    validate: async () => ({ valid: true, errors: [] }),
    initialize: async () => {},
    execute: async (_req: ToolRequest, _ctx: ToolExecutionContext) => ({ success: true, durationMs: 0 }),
    dispose: async () => {},
  };
}

describe('ToolValidator', () => {
  let registry: ToolRegistry;
  let validator: ToolValidator;

  beforeEach(() => {
    registry = new ToolRegistry();
    validator = new ToolValidator(registry);
  });

  it('should validate a correct tool', () => {
    const tool = createTool();
    const result = validator.validate(tool);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject empty name', () => {
    const tool = createTool({ name: '' });
    const result = validator.validateMetadataOnly(tool.metadata);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tool name must be non-empty');
  });

  it('should reject invalid version format', () => {
    const tool = createTool({ version: 'abc' });
    const result = validator.validateMetadataOnly(tool.metadata);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('MAJOR.MINOR.PATCH'))).toBe(true);
  });

  it('should reject empty description', () => {
    const tool = createTool({ description: '' });
    const result = validator.validateMetadataOnly(tool.metadata);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tool description must be non-empty');
  });

  it('should reject empty capabilities', () => {
    const tool = createTool({ capabilities: [] });
    const result = validator.validateMetadataOnly(tool.metadata);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tool must declare at least one capability');
  });

  it('should reject unknown capabilities', () => {
    const tool = createTool({ capabilities: ['nonexistent' as ToolCapability] });
    const result = validator.validateMetadataOnly(tool.metadata);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Unknown capability'))).toBe(true);
  });

  it('should reject unknown trust level', () => {
    const tool = createTool({ trustLevel: 'nonexistent' as ToolTrustLevel });
    const result = validator.validateMetadataOnly(tool.metadata);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Unknown trust level'))).toBe(true);
  });

  it('should detect missing dependencies', () => {
    const tool = createTool({ dependencies: ['dep-a', 'dep-b'] });
    const result = validator.validate(tool);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('dep-a'))).toBe(true);
    expect(result.errors.some(e => e.includes('dep-b'))).toBe(true);
  });

  it('should pass with satisfied dependencies', () => {
    registry.register(createTool({ name: 'dep-a' }));
    registry.register(createTool({ name: 'dep-b' }));
    const tool = createTool({ dependencies: ['dep-a', 'dep-b'] });
    const result = validator.validate(tool);
    expect(result.valid).toBe(true);
  });

  it('should collect multiple errors', () => {
    const tool = createTool({ name: '', version: 'x', description: '', capabilities: [] });
    const result = validator.validateMetadataOnly(tool.metadata);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});
