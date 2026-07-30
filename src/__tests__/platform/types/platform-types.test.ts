import { describe, it, expect } from 'vitest';
import {
  PlatformState, BootstrapPhase, HealthStatus, ConfigSource, ServiceScope,
  PlatformError, BootstrapError, DependencyCycleError, RuntimeRegistrationError, SecurityValidationError,
} from '../../../platform/types.js';

describe('Platform Types', () => {
  describe('PlatformState', () => {
    it('has all expected values', () => {
      expect(PlatformState.Uninitialized).toBe('Uninitialized');
      expect(PlatformState.Ready).toBe('Ready');
      expect(PlatformState.Running).toBe('Running');
      expect(PlatformState.Stopped).toBe('Stopped');
      expect(PlatformState.Error).toBe('Error');
      expect(PlatformState.Restarting).toBe('Restarting');
    });
  });
  describe('BootstrapPhase', () => {
    it('has all expected values', () => {
      expect(BootstrapPhase.Discovery).toBe('Discovery');
      expect(BootstrapPhase.Validation).toBe('Validation');
      expect(BootstrapPhase.Registration).toBe('Registration');
      expect(BootstrapPhase.Initialization).toBe('Initialization');
      expect(BootstrapPhase.Activation).toBe('Activation');
      expect(BootstrapPhase.Ready).toBe('Ready');
    });
  });
  describe('HealthStatus', () => {
    it('has all expected values', () => {
      expect(HealthStatus.Healthy).toBe('Healthy');
      expect(HealthStatus.Warning).toBe('Warning');
      expect(HealthStatus.Failed).toBe('Failed');
      expect(HealthStatus.Unknown).toBe('Unknown');
    });
  });
  describe('ConfigSource', () => {
    it('has all expected values', () => {
      expect(ConfigSource.Default).toBe('Default');
      expect(ConfigSource.User).toBe('User');
      expect(ConfigSource.Environment).toBe('Environment');
      expect(ConfigSource.Override).toBe('Override');
    });
  });
  describe('ServiceScope', () => {
    it('has all expected values', () => {
      expect(ServiceScope.Singleton).toBe('Singleton');
      expect(ServiceScope.Scoped).toBe('Scoped');
      expect(ServiceScope.Transient).toBe('Transient');
      expect(ServiceScope.Factory).toBe('Factory');
    });
  });
  describe('Errors', () => {
    it('PlatformError has code', () => {
      const e = new PlatformError('test', 'CODE');
      expect(e.code).toBe('CODE');
      expect(e.message).toBe('test');
      expect(e.name).toBe('PlatformError');
    });
    it('BootstrapError has phase', () => {
      const e = new BootstrapError('test', BootstrapPhase.Initialization);
      expect(e.phase).toBe(BootstrapPhase.Initialization);
      expect(e.name).toBe('BootstrapError');
    });
    it('DependencyCycleError has path', () => {
      const e = new DependencyCycleError('cycle', ['a', 'b', 'a']);
      expect(e.cyclePath).toEqual(['a', 'b', 'a']);
    });
    it('RuntimeRegistrationError has runtimeId', () => {
      const e = new RuntimeRegistrationError('dup', 'rt-1');
      expect(e.runtimeId).toBe('rt-1');
    });
    it('SecurityValidationError has reason', () => {
      const e = new SecurityValidationError('sec', 'rt-1', 'INVALID');
      expect(e.reason).toBe('INVALID');
    });
  });
});
