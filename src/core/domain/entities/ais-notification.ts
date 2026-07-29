/**
 * AISNotification — DOM-002.000 §1.7
 * Owner: Communication Module (FP-COMM)
 * FSM: Created → Displayed → Dismissed | Expired | ActedUpon
 * Aggregate: Communication (Root)
 * INV-004: No notification without a NotificationType.
 */
import type { EntityBase } from './entity-base.js';
import type { AISNotificationId, UserProfileId, ConfidenceResultId, SessionContextId } from '../identifiers.js';
import { NotificationType } from '../value-objects/notification-type.js';
import type { NotificationLifetime } from '../value-objects/notification-lifetime.js';
import { FrequencyModeValue } from '../value-objects/frequency-mode.js';

export enum AISNotificationState {
  Created = 'Created',
  Displayed = 'Displayed',
  Dismissed = 'Dismissed',
  Expired = 'Expired',
  ActedUpon = 'ActedUpon',
}

export interface AISNotification extends EntityBase {
  readonly id: AISNotificationId;
  readonly notificationId: AISNotificationId;
  readonly type: NotificationType;
  readonly content: string;
  readonly lifetime: NotificationLifetime;
  readonly frequencyMode: FrequencyModeValue;
  readonly profileId: UserProfileId;
  readonly confidenceResultId: ConfidenceResultId;
  readonly contextId: SessionContextId;
  readonly createdAt: string;
  readonly displayedAt?: string;
  readonly endedAt?: string;
  readonly outcome?: string;
  readonly state: AISNotificationState;
}
