/**
 * Tool Error Hierarchy Tests
 */
import { describe, it, expect } from 'vitest';
import {
  ToolRuntimeError,
  ToolNotFoundError,
  CapabilityDeniedError,
  SandboxViolationError,
  ToolTimeoutError,
  ToolExecutionError,
  ToolValidationError,
  ToolLifecycleError,
  RuntimeFailureError,
  toToolResponseError,
} from '../core/tool/errors.js';

describe('Tool Runtime Errors', () => {
  it('ToolRuntimeError has correct properties', () => {
    const error = new ToolRuntimeError('TEST_CODE', 'test message', true, 'cause-data', 'my-tool');
    expect(error.name).toBe('ToolRuntimeError');
    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('test message');
    expect(error.retryable).toBe(true);
    expect(error.cause).toBe('cause-data');
    expect(error.toolName).toBe('my-tool');
  });

  it('ToolNotFoundError formats correctly', () => {
    const error = new ToolNotFoundError('missing-tool');
    expect(error.code).toBe('TOOL_NOT_FOUND');
    expect(error.toolName).toBe('missing-tool');
    expect(error.retryable).toBe(false);
    expect(error.message).toContain('missing-tool');
  });

  it('CapabilityDeniedError formats correctly', () => {
    const error = new CapabilityDeniedError('my-tool', 'filesystem', 'restricted');
    expect(error.code).toBe('CAPABILITY_DENIED');
    expect(error.toolName).toBe('my-tool');
    expect(error.capability).toBe('filesystem');
    expect(error.trustLevel).toBe('restricted');
    expect(error.retryable).toBe(false);
  });

  it('SandboxViolationError formats correctly', () => {
    const error = new SandboxViolationError('my-tool', 'memory exceeded');
    expect(error.code).toBe('SANDBOX_VIOLATION');
    expect(error.toolName).toBe('my-tool');
    expect(error.message).toContain('memory exceeded');
  });

  it('ToolTimeoutError formats correctly', () => {
    const error = new ToolTimeoutError('slow-tool', 5000);
    expect(error.code).toBe('TOOL_TIMEOUT');
    expect(error.toolName).toBe('slow-tool');
    expect(error.timeoutMs).toBe(5000);
    expect(error.retryable).toBe(true);
  });

  it('ToolExecutionError formats correctly', () => {
    const error = new ToolExecutionError('failing-tool', 'something broke', 2, true, new Error('inner'));
    expect(error.code).toBe('TOOL_EXECUTION_ERROR');
    expect(error.toolName).toBe('failing-tool');
    expect(error.attempt).toBe(2);
    expect(error.retryable).toBe(true);
    expect(error.cause).toBeInstanceOf(Error);
  });

  it('ToolValidationError formats correctly', () => {
    const error = new ToolValidationError('bad-tool', ['error1', 'error2']);
    expect(error.code).toBe('TOOL_VALIDATION_ERROR');
    expect(error.toolName).toBe('bad-tool');
    expect(error.validationErrors).toEqual(['error1', 'error2']);
    expect(error.message).toContain('error1');
    expect(error.message).toContain('error2');
  });

  it('ToolLifecycleError formats correctly', () => {
    const error = new ToolLifecycleError('my-tool', 'registered', 'executing');
    expect(error.code).toBe('TOOL_LIFECYCLE_ERROR');
    expect(error.toolName).toBe('my-tool');
    expect(error.fromState).toBe('registered');
    expect(error.toState).toBe('executing');
  });

  it('RuntimeFailureError formats correctly', () => {
    const error = new RuntimeFailureError('catastrophic', new Error('cause'));
    expect(error.code).toBe('RUNTIME_FAILURE');
    expect(error.cause).toBeInstanceOf(Error);
    expect(error.retryable).toBe(false);
  });

  it('toToolResponseError converts ToolRuntimeError', () => {
    const error = new ToolTimeoutError('slow', 1000);
    const response = error.toResponseError();
    expect(response.code).toBe('TOOL_TIMEOUT');
    expect(response.retryable).toBe(true);
    expect(response.message).toContain('1000ms');
  });

  it('toToolResponseError converts Error', () => {
    const error = new Error('regular error');
    const response = toToolResponseError(error);
    expect(response.code).toBe('UNKNOWN_ERROR');
    expect(response.message).toBe('regular error');
    expect(response.retryable).toBe(false);
  });

  it('toToolResponseError converts string', () => {
    const response = toToolResponseError('string error');
    expect(response.code).toBe('UNKNOWN_ERROR');
    expect(response.message).toBe('string error');
  });

  it('toToolResponseError converts unknown', () => {
    const response = toToolResponseError(42);
    expect(response.code).toBe('UNKNOWN_ERROR');
    expect(response.message).toBe('An unknown error occurred');
  });
});
