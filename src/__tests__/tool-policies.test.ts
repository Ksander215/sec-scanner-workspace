/**
 * Tool Policies Tests
 */
import { describe, it, expect } from 'vitest';
import {
  DefaultCapabilityPolicy,
  DEFAULT_TIMEOUT_POLICY,
  DEFAULT_SECURITY_POLICY,
  DEFAULT_TOOL_RECOVERY_POLICY,
} from '../core/tool/policies.js';
import { ToolCapability, ToolTrustLevel } from '../core/tool/types.js';

describe('DefaultCapabilityPolicy', () => {
  let policy: DefaultCapabilityPolicy;

  beforeEach(() => {
    policy = new DefaultCapabilityPolicy();
  });

  it('Trusted tools get all capabilities', () => {
    const caps = policy.getAllowedCapabilities(ToolTrustLevel.Trusted);
    expect(caps).toContain(ToolCapability.Filesystem);
    expect(caps).toContain(ToolCapability.Network);
    expect(caps).toContain(ToolCapability.Memory);
    expect(caps).toContain(ToolCapability.Shell);
    expect(caps).toContain(ToolCapability.Knowledge);
    expect(caps).toContain(ToolCapability.Planner);
    expect(caps).toHaveLength(6);
  });

  it('Standard tools get filesystem, memory, knowledge', () => {
    const caps = policy.getAllowedCapabilities(ToolTrustLevel.Standard);
    expect(caps).toContain(ToolCapability.Filesystem);
    expect(caps).toContain(ToolCapability.Memory);
    expect(caps).toContain(ToolCapability.Knowledge);
    expect(caps).not.toContain(ToolCapability.Network);
    expect(caps).not.toContain(ToolCapability.Shell);
    expect(caps).not.toContain(ToolCapability.Planner);
  });

  it('Restricted tools get only memory and knowledge', () => {
    const caps = policy.getAllowedCapabilities(ToolTrustLevel.Restricted);
    expect(caps).toContain(ToolCapability.Memory);
    expect(caps).toContain(ToolCapability.Knowledge);
    expect(caps).toHaveLength(2);
  });

  it('Untrusted tools get no capabilities', () => {
    const caps = policy.getAllowedCapabilities(ToolTrustLevel.Untrusted);
    expect(caps).toHaveLength(0);
  });

  it('isCapabilityAllowed returns correct values', () => {
    expect(policy.isCapabilityAllowed(ToolTrustLevel.Trusted, ToolCapability.Shell)).toBe(true);
    expect(policy.isCapabilityAllowed(ToolTrustLevel.Restricted, ToolCapability.Shell)).toBe(false);
    expect(policy.isCapabilityAllowed(ToolTrustLevel.Untrusted, ToolCapability.Memory)).toBe(false);
  });
});

describe('Default Timeout Policy', () => {
  it('should have correct defaults', () => {
    expect(DEFAULT_TIMEOUT_POLICY.defaultTimeoutMs).toBe(30_000);
    expect(DEFAULT_TIMEOUT_POLICY.maxTimeoutMs).toBe(300_000);
  });
});

describe('Default Security Policy', () => {
  it('should have correct defaults', () => {
    expect(DEFAULT_SECURITY_POLICY.maxMemoryBytes).toBe(0);
    expect(DEFAULT_SECURITY_POLICY.enforceSandbox).toBe(true);
    expect(DEFAULT_SECURITY_POLICY.allowedTrustLevels).toContain(ToolTrustLevel.Trusted);
    expect(DEFAULT_SECURITY_POLICY.allowedTrustLevels).toContain(ToolTrustLevel.Standard);
    expect(DEFAULT_SECURITY_POLICY.allowedTrustLevels).toContain(ToolTrustLevel.Restricted);
    expect(DEFAULT_SECURITY_POLICY.allowedTrustLevels).not.toContain(ToolTrustLevel.Untrusted);
  });
});

describe('Default Tool Recovery Policy', () => {
  it('should have correct defaults', () => {
    expect(DEFAULT_TOOL_RECOVERY_POLICY.maxRetries).toBe(2);
    expect(DEFAULT_TOOL_RECOVERY_POLICY.retryOnTimeout).toBe(true);
    expect(DEFAULT_TOOL_RECOVERY_POLICY.retryOnCapabilityDenied).toBe(false);
  });
});
