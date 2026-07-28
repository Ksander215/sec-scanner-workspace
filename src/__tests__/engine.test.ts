import { describe, it, expect } from 'vitest';
import { ExecutionEngine } from '../core/engine/execution-engine.js';
import { EngineState, AutonomyLevel } from '../core/types/common.js';

describe('ExecutionEngine', () => {
  it('creates with default config', () => {
    const engine = new ExecutionEngine();
    expect(engine.state).toBe(EngineState.Uninitialized);
    expect(engine.autonomyLevel).toBe(AutonomyLevel.Suggest);
  });

  it('creates with custom config', () => {
    const engine = new ExecutionEngine({
      defaultAutonomyLevel: AutonomyLevel.Observe,
      dataRoot: '/tmp/ais-test',
    });
    expect(engine.autonomyLevel).toBe(AutonomyLevel.Observe);
  });

  it('initializes through lifecycle: initialize → start → stop → shutdown', async () => {
    const engine = new ExecutionEngine();
    expect(engine.state).toBe(EngineState.Uninitialized);

    await engine.initialize();
    expect(engine.state).toBe(EngineState.Ready);

    await engine.start();
    expect(engine.state).toBe(EngineState.Running);

    await engine.stop();
    expect(engine.state).toBe(EngineState.Stopped);

    await engine.shutdown();
    expect(engine.state).toBe(EngineState.ShutDown);
  });

  it('rejects execute when not running', async () => {
    const engine = new ExecutionEngine();
    await expect(engine.execute({})).rejects.toThrow('Cannot execute from state');
  });

  it('rejects start when not ready', async () => {
    const engine = new ExecutionEngine();
    await expect(engine.start()).rejects.toThrow('Cannot start from state');
  });

  it('allows setting autonomy level', () => {
    const engine = new ExecutionEngine();
    engine.setAutonomyLevel(AutonomyLevel.ActOnApproval);
    expect(engine.autonomyLevel).toBe(AutonomyLevel.ActOnApproval);
  });

  it('exposes runtime services, event bus, hooks, and zone gate', () => {
    const engine = new ExecutionEngine();
    expect(engine.services).toBeDefined();
    expect(engine.eventBus).toBeDefined();
    expect(engine.hooks).toBeDefined();
    expect(engine.zoneGate).toBeDefined();
  });
});
