/**
 * NotificationLifetime — DOM-002.000 §1.9
 * DP-012: Lifetime Adaptation (adapts to reading speed)
 */
export interface NotificationLifetime {
  readonly minDuration: number;
  readonly maxDuration: number;
  readonly adaptiveDuration: number;
  readonly readingSpeedFactor: number;
}
