/**
 * IC-04: NotificationManager — ARC-001.001 §6
 * FP-04, Z1. Delivers adaptive notifications.
 * DR-05: Every notification MUST have dismiss action.
 */
import type { AISNotification } from '../domain/entities/ais-notification.js';
import { FrequencyModeValue } from '../domain/value-objects/frequency-mode.js';
import type { LifetimePolicy } from '../domain/value-objects/lifetime-policy.js';

export interface NotificationManager {
  notify(notification: AISNotification): Promise<void>;
  dismiss(id: string): Promise<void>;
  setFrequency(mode: FrequencyModeValue): Promise<void>;
  setLifetimePolicy(policy: LifetimePolicy): Promise<void>;
}
