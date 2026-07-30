/**
 * Workflow Runtime — Variables Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { VariablesRuntime } from '../../../core/workflow/variables.js';
import { brandStageId, brandExecutionId } from '../../../core/workflow/types.js';
import { VariableScope } from '../../../core/workflow/types.js';

describe('VariablesRuntime', () => {
  let vars: VariablesRuntime;
  const stageId = brandStageId('stage-1');
  const execId = brandExecutionId('exec-1');

  beforeEach(() => {
    vars = new VariablesRuntime();
  });

  describe('Global scope', () => {
    it('should set and get global variables', () => {
      vars.setGlobal('key', 'value');
      expect(vars.getGlobal('key')).toBe('value');
    });

    it('should return undefined for missing keys', () => {
      expect(vars.getGlobal('missing')).toBeUndefined();
    });

    it('should return all global variables as ReadonlyMap', () => {
      vars.setGlobal('a', 1);
      vars.setGlobal('b', 2);
      const all = vars.getAllGlobal();
      expect(all.size).toBe(2);
      expect(all.get('a')).toBe(1);
      expect(all.get('b')).toBe(2);
    });

    it('should overwrite existing values', () => {
      vars.setGlobal('key', 'old');
      vars.setGlobal('key', 'new');
      expect(vars.getGlobal('key')).toBe('new');
    });

    it('should store various types', () => {
      vars.setGlobal('string', 'hello');
      vars.setGlobal('number', 42);
      vars.setGlobal('boolean', true);
      vars.setGlobal('object', { nested: true });
      vars.setGlobal('array', [1, 2, 3]);
      vars.setGlobal('null', null);
      expect(vars.getGlobal('object')).toEqual({ nested: true });
      expect(vars.getGlobal('array')).toEqual([1, 2, 3]);
    });
  });

  describe('Stage scope', () => {
    it('should set and get stage variables', () => {
      vars.setStage(stageId, 'key', 'value');
      expect(vars.getStage(stageId, 'key')).toBe('value');
    });

    it('should isolate variables between stages', () => {
      const stage2 = brandStageId('stage-2');
      vars.setStage(stageId, 'key', 'stage1-value');
      vars.setStage(stage2, 'key', 'stage2-value');
      expect(vars.getStage(stageId, 'key')).toBe('stage1-value');
      expect(vars.getStage(stage2, 'key')).toBe('stage2-value');
    });

    it('should return undefined for missing stage', () => {
      expect(vars.getStage(brandStageId('nonexistent'), 'key')).toBeUndefined();
    });

    it('should return all stage variables', () => {
      vars.setStage(stageId, 'a', 1);
      vars.setStage(stageId, 'b', 2);
      const all = vars.getAllStage(stageId);
      expect(all.size).toBe(2);
    });
  });

  describe('Execution scope', () => {
    it('should set and get execution variables', () => {
      vars.setExecution(execId, 'key', 'value');
      expect(vars.getExecution(execId, 'key')).toBe('value');
    });

    it('should isolate variables between executions', () => {
      const exec2 = brandExecutionId('exec-2');
      vars.setExecution(execId, 'key', 'exec1');
      vars.setExecution(exec2, 'key', 'exec2');
      expect(vars.getExecution(execId, 'key')).toBe('exec1');
    });

    it('should return all execution variables', () => {
      vars.setExecution(execId, 'a', 'b');
      expect(vars.getAllExecution(execId).size).toBe(1);
    });
  });

  describe('Temporary scope', () => {
    it('should set and get temporary variables', () => {
      vars.setTemporary('key', 'value');
      expect(vars.getTemporary('key')).toBe('value');
    });

    it('should clear all temporary variables', () => {
      vars.setTemporary('a', 1);
      vars.setTemporary('b', 2);
      vars.clearTemporary();
      expect(vars.getTemporary('a')).toBeUndefined();
      expect(vars.getTemporary('b')).toBeUndefined();
    });
  });

  describe('Output scope', () => {
    it('should set and get output variables', () => {
      vars.setOutput('result', 'done');
      expect(vars.getOutput('result')).toBe('done');
    });

    it('should return all output variables', () => {
      vars.setOutput('a', 1);
      vars.setOutput('b', 2);
      const all = vars.getAllOutput();
      expect(all.size).toBe(2);
    });
  });

  describe('Scoped access', () => {
    it('should return global variables for Global scope', () => {
      vars.setGlobal('key', 'global-value');
      const result = vars.getVariablesForScope(VariableScope.Global);
      expect(result.get('key')).toBe('global-value');
    });

    it('should return stage variables for Stage scope', () => {
      vars.setStage(stageId, 'key', 'stage-value');
      const result = vars.getVariablesForScope(VariableScope.Stage, stageId);
      expect(result.get('key')).toBe('stage-value');
    });

    it('should return empty for Stage scope without stageId', () => {
      const result = vars.getVariablesForScope(VariableScope.Stage);
      expect(result.size).toBe(0);
    });

    it('should return execution variables for Execution scope', () => {
      vars.setExecution(execId, 'key', 'exec-value');
      const result = vars.getVariablesForScope(VariableScope.Execution, null, execId);
      expect(result.get('key')).toBe('exec-value');
    });

    it('should return temporary for Temporary scope', () => {
      vars.setTemporary('key', 'temp-value');
      const result = vars.getVariablesForScope(VariableScope.Temporary);
      expect(result.get('key')).toBe('temp-value');
    });

    it('should return output for Output scope', () => {
      vars.setOutput('key', 'output-value');
      const result = vars.getVariablesForScope(VariableScope.Output);
      expect(result.get('key')).toBe('output-value');
    });
  });

  describe('Reset', () => {
    it('should clear all scopes', () => {
      vars.setGlobal('a', 1);
      vars.setStage(stageId, 'b', 2);
      vars.setExecution(execId, 'c', 3);
      vars.setTemporary('d', 4);
      vars.setOutput('e', 5);
      vars.reset();
      expect(vars.getGlobal('a')).toBeUndefined();
      expect(vars.getStage(stageId, 'b')).toBeUndefined();
      expect(vars.getExecution(execId, 'c')).toBeUndefined();
      expect(vars.getTemporary('d')).toBeUndefined();
      expect(vars.getOutput('e')).toBeUndefined();
    });
  });
});
