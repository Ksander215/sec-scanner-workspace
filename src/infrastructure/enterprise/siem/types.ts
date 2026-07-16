/** INT-013: SIEM Connectors — Types */

export type SiemType = 'splunk' | 'qradar' | 'sentinel' | 'elastic' | 'chronicle';

export interface SiemConnector {
  readonly type: SiemType;
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendEvents(events: SiemEvent[]): Promise<SiemSendResult>;
  query(search: SiemQuery): Promise<SiemQueryResult>;
  health(): Promise<SiemHealth>;
}

export interface SiemEvent {
  timestamp: Date;
  source: string;
  eventType: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
  fields: Record<string, unknown>;
  findingId?: string;
  tenantId?: string;
}

export interface SiemSendResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  batchId: string;
  errors?: string[];
}

export interface SiemQuery {
  query: string;
  timeRange: { from: Date; to: Date };
  limit?: number;
  fields?: string[];
}

export interface SiemQueryResult {
  total: number;
  events: SiemEvent[];
  elapsedMs: number;
}

export interface SiemHealth {
  connected: boolean;
  version?: string;
  eventsPerSecond?: number;
  lastError?: string;
}

export interface SiemConfig {
  type: SiemType;
  endpoint: string;
  token?: string;
  index?: string;
  batchSize?: number;
  flushIntervalMs?: number;
}
