/** INT-013: Notification — Types */
export type NotificationChannel = 'slack' | 'teams' | 'discord' | 'telegram' | 'email' | 'pagerduty' | 'opsgenie' | 'webhook';

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(notification: Notification): Promise<NotificationResult>;
  sendBatch(notifications: Notification[]): Promise<NotificationResult[]>;
  health(): Promise<{ available: boolean }>;
}

export interface Notification {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title?: string;
  findingId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  notificationId: string;
  success: boolean;
  deliveredAt?: Date;
  error?: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  conditions: NotificationCondition[];
  channels: NotificationChannel[];
  recipients: string[];
  enabled: boolean;
  tenantId?: string;
}

export interface NotificationCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in';
  value: unknown;
}

export interface NotificationConfig {
  channel: NotificationChannel;
  endpoint?: string;
  token?: string;
  from?: string;
  defaultRecipients?: string[];
}
