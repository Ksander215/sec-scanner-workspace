/**
 * Notification Runtime — Errors
 */
export class NotificationError extends Error {
  constructor(message: string, public readonly code: string, public readonly notificationId?: string) {
    super(message);
    this.name = 'NotificationError';
  }
}

export class NotificationNotFoundError extends NotificationError {
  constructor(id: string) {
    super('Notification not found: ' + id, 'NOTIFICATION_NOT_FOUND', id);
    this.name = 'NotificationNotFoundError';
  }
}
