/**
 * LifetimePolicy — DOM-002.000 §1.14
 */
export interface LifetimePolicy {
  readonly notificationType: string;
  readonly minSeconds: number;
  readonly maxSeconds: number;
  readonly defaultSeconds: number;
}
