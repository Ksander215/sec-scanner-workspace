/** INT-013: Notification — Provider Implementations */
import type { NotificationProvider, NotificationChannel, Notification, NotificationResult, NotificationConfig } from './types.js';

abstract class BaseNotificationProvider implements NotificationProvider {
  abstract readonly channel: NotificationChannel;
  protected config: NotificationConfig;

  constructor(config: NotificationConfig) { this.config = config; }

  async send(notification: Notification): Promise<NotificationResult> {
    // Production: HTTP POST to channel-specific API
    return { notificationId: notification.id, success: true, deliveredAt: new Date() };
  }

  async sendBatch(notifications: Notification[]): Promise<NotificationResult[]> {
    return Promise.all(notifications.map(n => this.send(n)));
  }

  abstract health(): Promise<{ available: boolean }>;
}

export class SlackNotificationProvider extends BaseNotificationProvider {
  readonly channel: NotificationChannel = 'slack';
  async health() { return { available: true }; }
}

export class TeamsNotificationProvider extends BaseNotificationProvider {
  readonly channel: NotificationChannel = 'teams';
  async health() { return { available: true }; }
}

export class DiscordNotificationProvider extends BaseNotificationProvider {
  readonly channel: NotificationChannel = 'discord';
  async health() { return { available: true }; }
}

export class TelegramNotificationProvider extends BaseNotificationProvider {
  readonly channel: NotificationChannel = 'telegram';
  async health() { return { available: true }; }
}

export class EmailNotificationProvider extends BaseNotificationProvider {
  readonly channel: NotificationChannel = 'email';
  async health() { return { available: true }; }
}

export class PagerDutyNotificationProvider extends BaseNotificationProvider {
  readonly channel: NotificationChannel = 'pagerduty';
  async health() { return { available: true }; }
}

export class OpsGenieNotificationProvider extends BaseNotificationProvider {
  readonly channel: NotificationChannel = 'opsgenie';
  async health() { return { available: true }; }
}

export class WebhookNotificationProvider extends BaseNotificationProvider {
  readonly channel: NotificationChannel = 'webhook';
  async health() { return { available: true }; }
}

export function createNotificationProvider(config: NotificationConfig): NotificationProvider {
  switch (config.channel) {
    case 'slack': return new SlackNotificationProvider(config);
    case 'teams': return new TeamsNotificationProvider(config);
    case 'discord': return new DiscordNotificationProvider(config);
    case 'telegram': return new TelegramNotificationProvider(config);
    case 'email': return new EmailNotificationProvider(config);
    case 'pagerduty': return new PagerDutyNotificationProvider(config);
    case 'opsgenie': return new OpsGenieNotificationProvider(config);
    case 'webhook': return new WebhookNotificationProvider(config);
  }
}
