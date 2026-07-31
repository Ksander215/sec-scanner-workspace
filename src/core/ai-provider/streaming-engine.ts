/**
 * Universal AI Provider Runtime — Streaming Engine
 * TASK-AIS-006A.000
 *
 * Manages active streams, buffer accumulation, pause/resume/cancel.
 * Stores StreamSession objects in a Map keyed by StreamId.
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { EventClassification } from '../types/common.js';
import type { IStreamingEngine } from './contracts.js';
import type {
  ExecutionRequest, StreamChunk, StreamId,
  StreamState, StreamingEngineConfig, ProviderSDK,
} from './types.js';
import { StreamState as SS } from './types.js';
import { StreamError, StreamNotFoundError, StreamAlreadyCompletedError } from './errors.js';
import type {
  StreamStartedEvent, StreamCompletedEvent, StreamPausedEvent,
  StreamResumedEvent, StreamCancelledEvent,
} from './events.js';

interface MutableStreamSession {
  id: StreamId;
  executionId: string;
  state: SS;
  modelId: string;
  providerId: string;
  chunks: StreamChunk[];
  bufferedContent: string;
  startedAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown>;
}

export class StreamingEngine implements IStreamingEngine {
  private readonly config: StreamingEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly getProviderSDK: (providerId: string) => Promise<ProviderSDK | null>;
  private readonly streams = new Map<string, MutableStreamSession>();

  constructor(
    config: StreamingEngineConfig,
    deps: {
      eventBus?: InProcessEventBus | null;
      getProviderSDK: (providerId: string) => Promise<ProviderSDK | null>;
    },
  ) {
    this.config = config;
    this.eventBus = deps.eventBus ?? null;
    this.getProviderSDK = deps.getProviderSDK;
  }

  private publish(event: DomainEventBase): void {
    if (this.eventBus) { void this.eventBus.publish(event); }
  }

  async *stream(request: ExecutionRequest): AsyncIterable<StreamChunk> {
    const streamId = crypto.randomUUID() as StreamId;

    if (this.streams.size >= this.config.maxConcurrentStreams) {
      throw new StreamError(streamId as string, `Max concurrent streams reached: ${this.config.maxConcurrentStreams}`);
    }
    const modelId = request.modelId ?? '';
    const providerId = request.providerId ?? '';
    const executionId = request.id as string;

    const session: MutableStreamSession = {
      id: streamId,
      executionId,
      state: SS.Active,
      modelId,
      providerId,
      chunks: [],
      bufferedContent: '',
      startedAt: new Date().toISOString(),
      completedAt: null,
      metadata: { ...request.metadata } as Record<string, unknown>,
    };
    this.streams.set(streamId as string, session);

    this.publish(Object.freeze({
      eventType: 'stream.started', classification: EventClassification.Action,
      streamId, executionId: request.id, modelId: modelId as import('./types.js').ModelId,
      providerId: providerId as import('./types.js').ProviderId,
      timestamp: new Date().toISOString(), metadata: { ...request.metadata },
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: streamId as string, aggregateType: 'Stream', version: '1.0.0',
    } as StreamStartedEvent & DomainEventBase));

    const sdk = await this.getProviderSDK(providerId);
    if (!sdk) {
      session.state = SS.Errored;
      session.completedAt = new Date().toISOString();
      throw new StreamNotFoundError(streamId as string);
    }

    try {
      const stream = sdk.stream(request);
      for await (const chunk of stream) {
        const current = this.streams.get(streamId as string);
        if (!current || current.state === SS.Cancelled) break;
        if (current.state === SS.Paused) {
          await new Promise<void>(resolve => {
            const check = (): void => {
              const s = this.streams.get(streamId as string);
              if (!s || s.state !== SS.Paused) resolve();
              else setTimeout(check, 50);
            };
            setTimeout(check, 50);
          });
        }
        session.chunks.push(chunk);
        session.bufferedContent += chunk.content;
        yield chunk;
      }
      session.state = SS.Completed;
      session.completedAt = new Date().toISOString();
    } catch (err) {
      session.state = SS.Errored;
      session.completedAt = new Date().toISOString();
      this.publish(Object.freeze({
        eventType: 'stream.cancelled', classification: EventClassification.Error,
        streamId, reason: String(err),
        timestamp: new Date().toISOString(), metadata: {},
        eventId: crypto.randomUUID(), sequence: 0,
        aggregateId: streamId as string, aggregateType: 'Stream', version: '1.0.0',
      } as StreamCancelledEvent & DomainEventBase));
      throw err;
    } finally {
      const totalTokens = session.chunks.reduce((sum, c) => sum + c.tokenCount, 0);
      const durationMs = session.completedAt
        ? new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()
        : 0;
      this.publish(Object.freeze({
        eventType: 'stream.completed', classification: EventClassification.Result,
        streamId, executionId: request.id, state: session.state,
        totalChunks: session.chunks.length, totalTokens, durationMs,
        timestamp: new Date().toISOString(), metadata: {},
        eventId: crypto.randomUUID(), sequence: 0,
        aggregateId: streamId as string, aggregateType: 'Stream', version: '1.0.0',
      } as StreamCompletedEvent & DomainEventBase));
      this.streams.delete(streamId as string);
    }
  }

  async cancel(streamId: StreamId): Promise<void> {
    const id = streamId as string;
    const session = this.streams.get(id);
    if (!session) throw new StreamNotFoundError(id);
    if (session.state === SS.Completed) throw new StreamAlreadyCompletedError(id);
    session.state = SS.Cancelled;
    session.completedAt = new Date().toISOString();
    this.publish(Object.freeze({
      eventType: 'stream.cancelled', classification: EventClassification.Action,
      streamId, reason: 'User cancelled',
      timestamp: new Date().toISOString(), metadata: {},
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: id, aggregateType: 'Stream', version: '1.0.0',
    } as StreamCancelledEvent & DomainEventBase));
  }

  async pause(streamId: StreamId): Promise<void> {
    const id = streamId as string;
    const session = this.streams.get(id);
    if (!session) throw new StreamNotFoundError(id);
    if (session.state === SS.Completed || session.state === SS.Cancelled) {
      throw new StreamAlreadyCompletedError(id);
    }
    session.state = SS.Paused;
    this.publish(Object.freeze({
      eventType: 'stream.paused', classification: EventClassification.StateChange,
      streamId, reason: 'User paused',
      timestamp: new Date().toISOString(), metadata: {},
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: id, aggregateType: 'Stream', version: '1.0.0',
    } as StreamPausedEvent & DomainEventBase));
  }

  async resume(streamId: StreamId): Promise<void> {
    const id = streamId as string;
    const session = this.streams.get(id);
    if (!session) throw new StreamNotFoundError(id);
    session.state = SS.Active;
    this.publish(Object.freeze({
      eventType: 'stream.resumed', classification: EventClassification.StateChange,
      streamId,
      timestamp: new Date().toISOString(), metadata: {},
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: id, aggregateType: 'Stream', version: '1.0.0',
    } as StreamResumedEvent & DomainEventBase));
  }

  async getBuffer(streamId: StreamId): Promise<string> {
    const session = this.streams.get(streamId as string);
    if (!session) throw new StreamNotFoundError(streamId as string);
    return session.bufferedContent;
  }

  merge(chunks: readonly StreamChunk[]): string {
    return chunks.map(c => c.content).join('');
  }

  async getStatus(streamId: StreamId): Promise<StreamState | null> {
    const session = this.streams.get(streamId as string);
    return session ? session.state as StreamState : null;
  }

  async listActive(): Promise<readonly StreamId[]> {
    const result: StreamId[] = [];
    for (const [id, session] of this.streams) {
      if (session.state === SS.Active || session.state === SS.Paused || session.state === SS.Resumed) {
        result.push(id as StreamId);
      }
    }
    return result;
  }
}
