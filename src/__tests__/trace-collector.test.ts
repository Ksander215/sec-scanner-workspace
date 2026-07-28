import { describe, it, expect } from 'vitest';
import {
  TraceCollector,
  TraceEntryType,
} from '../core/trace/trace-collector.js';

describe('TraceCollector', () => {
  it('starts empty', () => {
    const tc = new TraceCollector();
    expect(tc.length).toBe(0);
    expect(tc.getEntries()).toHaveLength(0);
  });

  it('add() records an entry', () => {
    const tc = new TraceCollector();
    tc.add(TraceEntryType.Info, 'test message');
    expect(tc.length).toBe(1);
    expect(tc.getEntries()[0].type).toBe(TraceEntryType.Info);
    expect(tc.getEntries()[0].message).toBe('test message');
  });

  it('add() records data', () => {
    const tc = new TraceCollector();
    tc.add(TraceEntryType.Error, 'err', { code: 'E001' });
    expect(tc.getEntries()[0].data).toEqual({ code: 'E001' });
  });

  it('traceStateChange records state-change entry', () => {
    const tc = new TraceCollector();
    tc.traceStateChange('exec-1', 'idle' as any, 'planning' as any);
    expect(tc.length).toBe(1);
    expect(tc.getEntries()[0].type).toBe(TraceEntryType.StateChange);
    expect(tc.getEntries()[0].data?.fromState).toBe('idle');
    expect(tc.getEntries()[0].data?.toState).toBe('planning');
  });

  it('traceTaskDispatch records task-dispatch entry', () => {
    const tc = new TraceCollector();
    tc.traceTaskDispatch('task-1', 'step-1', 'echo', 1);
    expect(tc.getEntries()[0].type).toBe(TraceEntryType.TaskDispatch);
    expect(tc.getEntries()[0].data?.taskType).toBe('echo');
  });

  it('traceTaskComplete records task-complete entry', () => {
    const tc = new TraceCollector();
    tc.traceTaskComplete('task-1', 'succeeded' as any, 42, 1);
    expect(tc.getEntries()[0].type).toBe(TraceEntryType.TaskComplete);
    expect(tc.getEntries()[0].data?.durationMs).toBe(42);
  });

  it('traceError records error entry', () => {
    const tc = new TraceCollector();
    tc.traceError('CODE', 'Something failed');
    expect(tc.getEntries()[0].type).toBe(TraceEntryType.Error);
    expect(tc.getEntries()[0].message).toContain('[CODE]');
  });

  it('traceRetry records retry entry', () => {
    const tc = new TraceCollector();
    tc.traceRetry('task-1', 2, 'transient error');
    expect(tc.getEntries()[0].type).toBe(TraceEntryType.Retry);
    expect(tc.getEntries()[0].data?.attempt).toBe(2);
  });

  it('traceInfo records info entry', () => {
    const tc = new TraceCollector();
    tc.traceInfo('Pipeline started');
    expect(tc.getEntries()[0].type).toBe(TraceEntryType.Info);
  });

  it('clear() removes all entries', () => {
    const tc = new TraceCollector();
    tc.add(TraceEntryType.Info, 'a');
    tc.add(TraceEntryType.Info, 'b');
    expect(tc.length).toBe(2);
    tc.clear();
    expect(tc.length).toBe(0);
  });

  it('getEntries returns entries oldest-first', () => {
    const tc = new TraceCollector();
    tc.add(TraceEntryType.Info, 'first');
    tc.add(TraceEntryType.Info, 'second');
    tc.add(TraceEntryType.Info, 'third');
    const entries = tc.getEntries();
    expect(entries[0].message).toBe('first');
    expect(entries[2].message).toBe('third');
  });

  it('timestamps are ISO strings', () => {
    const tc = new TraceCollector();
    tc.add(TraceEntryType.Info, 't');
    const ts = tc.getEntries()[0].timestamp;
    expect(new Date(ts).getTime()).not.toBeNaN();
  });
});
