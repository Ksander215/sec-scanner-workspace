/** INT-011B: Message Brokers — Types */

/** Unified event bus provider interface */
export interface EventBusProvider {
  /** Provider name */
  readonly name: string;
  /** Initialize the provider */
  connect(): Promise<void>;
  /** Graceful shutdown */
  disconnect(): Promise<void>;
  /** Publish a message to a topic */
  publish(topic: string, message: BrokerMessage): Promise<BrokerPublishResult>;
  /** Subscribe to a topic */
  subscribe(topic: string, options: BrokerSubscribeOptions, handler: BrokerMessageHandler): Promise<string>;
  /** Unsubscribe */
  unsubscribe(subscriptionId: string): Promise<void>;
  /** Acknowledge message processing */
  ack(subscriptionId: string, messageId: string): Promise<void>;
  /** Negative acknowledgement */
  nack(subscriptionId: string, messageId: string, reason?: string): Promise<void>;
  /** Replay messages from a given point */
  replay(topic: string, options: BrokerReplayOptions): AsyncIterable<BrokerMessage>;
  /** Get provider health */
  health(): Promise<BrokerHealth>;
  /** Get provider metrics */
  metrics(): BrokerMetrics;
}

/** Message structure for broker communication */
export interface BrokerMessage {
  /** Message ID */
  id: string;
  /** Message key for partitioning */
  key?: string;
  /** Message payload (JSON-serializable) */
  payload: unknown;
  /** Message headers */
  headers: Record<string, string>;
  /** Timestamp */
  timestamp: Date;
  /** Partition offset (set by broker) */
  offset?: number;
  /** Partition number (set by broker) */
  partition?: number;
}

/** Publish result */
export interface BrokerPublishResult {
  success: boolean;
  offset?: number;
  partition?: number;
  timestamp: Date;
  error?: string;
}

/** Subscribe options */
export interface BrokerSubscribeOptions {
  consumerGroup: string;
  startFrom: 'earliest' | 'latest' | number;
  maxInFlight?: number;
  prefetch?: number;
  autoAck?: boolean;
  deadLetterTopic?: string;
}

/** Message handler */
export type BrokerMessageHandler = (message: BrokerMessage) => Promise<BrokerProcessingResult>;

/** Processing result */
export interface BrokerProcessingResult {
  status: 'ack' | 'nack' | 'retry';
  error?: string;
  delayMs?: number;
}

/** Replay options */
export interface BrokerReplayOptions {
  from: Date;
  to?: Date;
  key?: string;
  limit?: number;
}

/** Broker health status */
export interface BrokerHealth {
  connected: boolean;
  brokerVersion?: string;
  endpoint?: string;
  topics?: number;
  consumerGroups?: number;
  lastError?: string;
  uptimeMs?: number;
}

/** Broker metrics */
export interface BrokerMetrics {
  messagesPublished: number;
  messagesConsumed: number;
  messagesFailed: number;
  bytesPublished: number;
  bytesConsumed: number;
  publishLatencyMs: number;
  consumeLatencyMs: number;
  byTopic: Record<string, { published: number; consumed: number; failed: number }>;
}

/** Broker-specific configuration */
export interface KafkaBrokerConfig {
  type: 'kafka';
  brokers: string[];
  clientId: string;
  ssl?: boolean;
  sasl?: { mechanism: string; username: string; password: string };
  topicPrefix?: string;
  replicationFactor?: number;
  numPartitions?: number;
}

export interface NatsBrokerConfig {
  type: 'nats';
  servers: string[];
  clientId: string;
  token?: string;
  clusterId?: string;
  durablePrefix?: string;
}

export interface RabbitMqBrokerConfig {
  type: 'rabbitmq';
  url: string;
  exchange?: string;
  exchangeType?: 'direct' | 'topic' | 'fanout' | 'headers';
  prefetch?: number;
  persistent?: boolean;
}

export interface RedisStreamsBrokerConfig {
  type: 'redis-streams';
  url: string;
  consumerGroupPrefix?: string;
  maxLen?: number;
  readTimeout?: number;
}

export type BrokerConfig = KafkaBrokerConfig | NatsBrokerConfig | RabbitMqBrokerConfig | RedisStreamsBrokerConfig;
