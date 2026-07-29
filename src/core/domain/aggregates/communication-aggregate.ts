/**
 * Communication Aggregate — DOM-002.000 §3.3
 * Root: AISNotification
 * Members: AISNotification, NotificationType, NotificationLifetime, FrequencyMode, LifetimePolicy
 * Invariants: INV-004 (no notification without type), INV-010 (no tip repetition)
 * Entry Point: AISNotification.create(type, content, profile, confidenceResult)
 */
import type { AISNotification } from '../entities/ais-notification.js';
export interface CommunicationAggregate {
  readonly root: AISNotification;
}

/**
 * INV-004: No notification without a NotificationType.
 */
export function assertNotificationHasType(notification: AISNotification): void {
  if (!notification.type) {
    throw new Error('INV-004 violated: notification without NotificationType');
  }
}

/**
 * INV-010: No dismissed notification repeated without meaningful context change.
 */
export function assertNoTipRepetition(
  dismissedTips: ReadonlySet<string>,
  tipContent: string,
  contextChanged: boolean
): void {
  if (!contextChanged && dismissedTips.has(tipContent)) {
    throw new Error('INV-010 violated: tip repeated without context change');
  }
}
