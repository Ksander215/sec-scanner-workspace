import { describe, it, expect } from 'vitest';
import { PipelineStatus, StageStatus, TERMINAL_STAGE_STATUSES } from '../pipeline/types.ts';
import { PipelineEventBusImpl } from '../pipeline/event-bus.ts';
import { ArtifactBusImpl } from '../pipeline/artifact-bus.ts';
import { PipelineState } from '../pipeline/pipeline-state.ts';
import { PipelineExecutor } from '../pipeline/pipeline-executor.ts';

describe('DEBUG: PipelineExecutor', () => {
  it('minimal executor test', async () => {
    const config = {
      pipelineId: 'debug-1',
      scanJobId: 'j-1',
      targetUrl: 'https://example.com',
      targetName: 'Debug',
      stages: [
        { id: 's1', name: 'S1', dependencies: [], requiredCapabilities: [], maxRetries: 0, timeoutMs: 5000, skippable: false },
        { id: 's2', name: 'S2', dependencies: ['s1'], requiredCapabilities: [], maxRetries: 0, timeoutMs: 5000, skippable: false },
      ],
      maxConcurrentStages: 4,
      totalTimeoutMs: 0,
      idleTimeoutMs: 0,
      enablePersistence: false,
    };

    const executor = new PipelineExecutor(config);
    let handlerACalled = false;
    let handlerBCalled = false;

    executor.registerStageHandler('s1', async () => { handlerACalled = true; return; });
    executor.registerStageHandler('s2', async () => { handlerBCalled = true; return; });

    const result = await executor.start();

    console.log('result.status:', result.status);
    console.log('s1 status:', result.stages.get('s1')?.status);
    console.log('s2 status:', result.stages.get('s2')?.status);
    console.log('handlerACalled:', handlerACalled);
    console.log('handlerBCalled:', handlerBCalled);
    console.log('result.errors:', JSON.stringify(result.errors.map(e => e.message)));
    console.log('result.metrics:', JSON.stringify(result.metrics));

    expect(result.status).toBe(PipelineStatus.Completed);
  }, 30_000);