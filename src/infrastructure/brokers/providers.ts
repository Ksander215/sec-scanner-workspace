/** INT-011B: Message Brokers — Provider Implementations */
import type {
  EventBusProvider, BrokerMessage, BrokerPublishResult,
  BrokerSubscribeOptions, BrokerMessageHandler, BrokerProcessingResult,
  BrokerReplayOptions, BrokerHealth, BrokerMetrics,
  KafkaBrokerConfig, NatsBrokerConfig, RabbitMqBrokerConfig, RedisStreamsBrokerConfig,
} from './types.js';

// ─── Kafka Provider ────────────────────────────────────────────────────────

export class KafkaBrokerProvider implements EventBusProvider {
  readonly name = 'kafka';
  private config: KafkaBrokerConfig;
  private connected = false;
  private topics: Map<string, BrokerMessage[]> = new Map();
  private subscriptions: Map<string, { topic: string; handler: BrokerMessageHandler; options: BrokerSubscribeOptions }> = new Map();
  private metrics: BrokerMetrics = this.emptyMetrics();
  private startTime = Date.now();

  constructor(config: KafkaBrokerConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // In production: kafka.connect()
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async publish(topic: string, message: BrokerMessage): Promise<BrokerPublishResult> {
    const prefixedTopic = `${this.config.topicPrefix ?? ''}${topic}`;
    if (!this.topics.has(prefixedTopic)) this.topics.set(prefixedTopic, []);
    const partition = Math.abs(message.key?.hashCode?.() ?? 0) % (this.config.numPartitions ?? 4);
    const offset = this.topics.get(prefixedTopic)!.length;
    const stored = { ...message, offset, partition };
    this.topics.get(prefixedTopic)!.push(stored);

    this.metrics.messagesPublished++;
    this.metrics.bytesPublished += JSON.stringify(message.payload).length;
    this.ensureTopicMetrics(prefixedTopic);
    this.metrics.byTopic[prefixedTopic].published++;

    return { success: true, offset, partition, timestamp: new Date() };
  }

  async subscribe(topic: string, options: BrokerSubscribeOptions, handler: BrokerMessageHandler): Promise<string> {
    const prefixedTopic = `${this.config.topicPrefix ?? ''}${topic}`;
    const subId = crypto.randomUUID();
    this.subscriptions.set(subId, { topic: prefixedTopic, handler, options });

    // Process existing messages based on startFrom
    const messages = this.topics.get(prefixedTopic) ?? [];
    const startIdx = options.startFrom === 'earliest' ? 0 :
                     options.startFrom === 'latest' ? messages.length :
                     Math.min(options.startFrom as number, messages.length);

    for (let i = startIdx; i < messages.length; i++) {
      try {
        const result = await handler(messages[i]);
        if (result.status === 'ack' || options.autoAck) {
          await this.ack(subId, messages[i].id);
        }
      } catch {
        this.metrics.messagesFailed++;
      }
    }

    return subId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
  }

  async ack(_subscriptionId: string, messageId: string): Promise<void> {
    this.metrics.messagesConsumed++;
    void messageId;
  }

  async nack(_subscriptionId: string, _messageId: string, _reason?: string): Promise<void> {
    this.metrics.messagesFailed++;
  }

  async *replay(topic: string, options: BrokerReplayOptions): AsyncIterable<BrokerMessage> {
    const prefixedTopic = `${this.config.topicPrefix ?? ''}${topic}`;
    const messages = this.topics.get(prefixedTopic) ?? [];
    let count = 0;
    for (const msg of messages) {
      if (msg.timestamp < options.from) continue;
      if (options.to && msg.timestamp > options.to) continue;
      if (options.key && msg.key !== options.key) continue;
      if (options.limit && count >= options.limit) break;
      yield msg;
      count++;
    }
  }

  async health(): Promise<BrokerHealth> {
    return {
      connected: this.connected,
      brokerVersion: 'kafka-3.6',
      endpoint: this.config.brokers[0],
      topics: this.topics.size,
      consumerGroups: new Set([...this.subscriptions.values()].map(s => s.options.consumerGroup)).size,
      uptimeMs: Date.now() - this.startTime,
    };
  }

  metrics(): BrokerMetrics { return { ...this.metrics }; }

  private ensureTopicMetrics(topic: string): void {
    if (!this.metrics.byTopic[topic]) this.metrics.byTopic[topic] = { published: 0, consumed: 0, failed: 0 };
  }

  private emptyMetrics(): BrokerMetrics {
    return { messagesPublished: 0, messagesConsumed: 0, messagesFailed: 0, bytesPublished: 0, bytesConsumed: 0, publishLatencyMs: 0, consumeLatencyMs: 0, byTopic: {} };
  }
}

// ─── NATS JetStream Provider ───────────────────────────────────────────────

export class NatsBrokerProvider implements EventBusProvider {
  readonly name = 'nats';
  private config: NatsBrokerConfig;
  private connected = false;
  private streams: Map<string, BrokerMessage[]> = new Map();
  private subscriptions: Map<string, { topic: string; handler: BrokerMessageHandler; options: BrokerSubscribeOptions }> = new Map();
  private metrics: BrokerMetrics = this.emptyMetrics();
  private startTime = Date.now();

  constructor(config: NatsBrokerConfig) { this.config = config; }

  async connect(): Promise<void> { this.connected = true; }
  async disconnect(): Promise<void> { this.connected = false; }

  async publish(topic: string, message: BrokerMessage): Promise<BrokerPublishResult> {
    if (!this.streams.has(topic)) this.streams.set(topic, []);
    const seq = this.streams.get(topic)!.length;
    this.streams.get(topic)!.push({ ...message, offset: seq });
    this.metrics.messagesPublished++;
    this.ensureTopicMetrics(topic);
    this.metrics.byTopic[topic].published++;
    return { success: true, offset: seq, timestamp: new Date() };
  }

  async subscribe(topic: string, options: BrokerSubscribeOptions, handler: BrokerMessageHandler): Promise<string> {
    const subId = crypto.randomUUID();
    this.subscriptions.set(subId, { topic, handler, options });
    return subId;
  }

  async unsubscribe(subId: string): Promise<void> { this.subscriptions.delete(subId); }
  async ack(_subId: string, _msgId: string): Promise<void> { this.metrics.messagesConsumed++; }
  async nack(_subId: string, _msgId: string): Promise<void> { this.metrics.messagesFailed++; }

  async *replay(topic: string, options: BrokerReplayOptions): AsyncIterable<BrokerMessage> {
    const msgs = this.streams.get(topic) ?? [];
    let count = 0;
    for (const msg of msgs) {
      if (msg.timestamp < options.from) continue;
      if (options.to && msg.timestamp > options.to) continue;
      if (options.limit && count >= options.limit) break;
      yield msg; count++;
    }
  }

  async health(): Promise<BrokerHealth> {
    return { connected: this.connected, endpoint: this.config.servers[0], topics: this.streams.size, uptimeMs: Date.now() - this.startTime };
  }
  metrics(): BrokerMetrics { return { ...this.metrics }; }

  private ensureTopicMetrics(t: string) { if (!this.metrics.byTopic[t]) this.metrics.byTopic[t] = { published: 0, consumed: 0, failed: 0 }; }
  private emptyMetrics(): BrokerMetrics { return { messagesPublished: 0, messagesConsumed: 0, messagesFailed: 0, bytesPublished: 0, bytesConsumed: 0, publishLatencyMs: 0, consumeLatencyMs: 0, byTopic: {} }; }
}

// ─── RabbitMQ Provider ─────────────────────────────────────────────────────

export class RabbitMqBrokerProvider implements EventBusProvider {
  readonly name = 'rabbitmq';
  private config: RabbitMqBrokerConfig;
  private connected = false;
  private queues: Map<string, BrokerMessage[]> = new Map();
  private subscriptions: Map<string, { topic: string; handler: BrokerMessageHandler }> = new Map();
  private metrics: BrokerMetrics = this.emptyMetrics();
  private startTime = Date.now();

  constructor(config: RabbitMqBrokerConfig) { this.config = config; }

  async connect(): Promise<void> {
    // In production: amqp.connect(this.config.url)
    this.connected = true;
  }
  async disconnect(): Promise<void> { this.connected = false; }

  async publish(topic: string, message: BrokerMessage): Promise<BrokerPublishResult> {
    const queue = `${this.config.exchange ?? 'si-platform'}.${topic}`;
    if (!this.queues.has(queue)) this.queues.set(queue, []);
    this.queues.get(queue)!.push(message);
    this.metrics.messagesPublished++;
    this.ensureTopicMetrics(queue);
    this.metrics.byTopic[queue].published++;
    return { success: true, timestamp: new Date() };
  }

  async subscribe(topic: string, options: BrokerSubscribeOptions, handler: BrokerMessageHandler): Promise<string> {
    const subId = crypto.randomUUID();
    this.subscriptions.set(subId, { topic, handler });
    return subId;
  }
  async unsubscribe(subId: string): Promise<void> { this.subscriptions.delete(subId); }
  async ack(): Promise<void> { this.metrics.messagesConsumed++; }
  async nack(): Promise<void> { this.metrics.messagesFailed++; }

  async *replay(topic: string, options: BrokerReplayOptions): AsyncIterable<BrokerMessage> {
    const queue = `${this.config.exchange ?? 'si-platform'}.${topic}`;
    const msgs = this.queues.get(queue) ?? [];
    let count = 0;
    for (const msg of msgs) {
      if (msg.timestamp < options.from) continue;
      if (options.to && msg.timestamp > options.to) continue;
      if (options.limit && count >= options.limit) break;
      yield msg; count++;
    }
  }

  async health(): Promise<BrokerHealth> {
    return { connected: this.connected, endpoint: this.config.url, topics: this.queues.size, uptimeMs: Date.now() - this.startTime };
  }
  metrics(): BrokerMetrics { return { ...this.metrics }; }

  private ensureTopicMetrics(t: string) { if (!this.metrics.byTopic[t]) this.metrics.byTopic[t] = { published: 0, consumed: 0, failed: 0 }; }
  private emptyMetrics(): BrokerMetrics { return { messagesPublished: 0, messagesConsumed: 0, messagesFailed: 0, bytesPublished: 0, bytesConsumed: 0, publishLatencyMs: 0, consumeLatencyMs: 0, byTopic: {} }; }
}

// ─── Redis Streams Provider ────────────────────────────────────────────────

export class RedisStreamsBrokerProvider implements EventBusProvider {
  readonly name = 'redis-streams';
  private config: RedisStreamsBrokerConfig;
  private connected = false;
  private streams: Map<string, BrokerMessage[]> = new Map();
  private subscriptions: Map<string, { topic: string; handler: BrokerMessageHandler }> = new Map();
  private metrics: BrokerMetrics = this.emptyMetrics();
  private startTime = Date.now();

  constructor(config: RedisStreamsBrokerConfig) { this.config = config; }

  async connect(): Promise<void> { this.connected = true; }
  async disconnect(): Promise<void> { this.connected = false; }

  async publish(topic: string, message: BrokerMessage): Promise<BrokerPublishResult> {
    if (!this.streams.has(topic)) this.streams.set(topic, []);
    const offset = this.streams.get(topic)!.length;
    this.streams.get(topic)!.push({ ...message, offset });
    // Trim to maxLen
    const maxLen = this.config.maxLen ?? 10000;
    if (this.streams.get(topic)!.length > maxLen) {
      this.streams.get(topic)!.splice(0, this.streams.get(topic)!.length - maxLen);
    }
    this.metrics.messagesPublished++;
    this.ensureTopicMetrics(topic);
    this.metrics.byTopic[topic].published++;
    return { success: true, offset, timestamp: new Date() };
  }

  async subscribe(topic: string, options: BrokerSubscribeOptions, handler: BrokerMessageHandler): Promise<string> {
    const subId = crypto.randomUUID();
    this.subscriptions.set(subId, { topic, handler });
    return subId;
  }
  async unsubscribe(subId: string): Promise<void> { this.subscriptions.delete(subId); }
  async ack(): Promise<void> { this.metrics.messagesConsumed++; }
  async nack(): Promise<void> { this.metrics.messagesFailed++; }

  async *replay(topic: string, options: BrokerReplayOptions): AsyncIterable<BrokerMessage> {
    const msgs = this.streams.get(topic) ?? [];
    let count = 0;
    for (const msg of msgs) {
      if (msg.timestamp < options.from) continue;
      if (options.to && msg.timestamp > options.to) continue;
      if (options.limit && count >= options.limit) break;
      yield msg; count++;
    }
  }

  async health(): Promise<BrokerHealth> {
    return { connected: this.connected, endpoint: this.config.url, topics: this.streams.size, uptimeMs: Date.now() - this.startTime };
  }
  metrics(): BrokerMetrics { return { ...this.metrics }; }

  private ensureTopicMetrics(t: string) { if (!this.metrics.byTopic[t]) this.metrics.byTopic[t] = { published: 0, consumed: 0, failed: 0 }; }
  private emptyMetrics(): BrokerMetrics { return { messagesPublished: 0, messagesConsumed: 0, messagesFailed: 0, bytesPublished: 0, bytesConsumed: 0, publishLatencyMs: 0, consumeLatencyMs: 0, byTopic: {} }; }
}

// ─── Provider Factory ──────────────────────────────────────────────────────

export function createBrokerProvider(config: KafkaBrokerConfig | NatsBrokerConfig | RabbitMqBrokerConfig | RedisStreamsBrokerConfig): EventBusProvider {
  switch (config.type) {
    case 'kafka': return new KafkaBrokerProvider(config);
    case 'nats': return new NatsBrokerProvider(config);
    case 'rabbitmq': return new RabbitMqBrokerProvider(config);
    case 'redis-streams': return new RedisStreamsBrokerProvider(config);
  }
}
