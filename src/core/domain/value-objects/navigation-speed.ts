/**
 * NavigationSpeed — DOM-002.000 §1.12
 * Allowed: fast, normal, slow
 */
export enum NavigationSpeedValue {
  Fast = 'fast',
  Normal = 'normal',
  Slow = 'slow',
}

export interface NavigationSpeed {
  readonly value: NavigationSpeedValue;
  readonly clicksPerMinute: number;
  readonly sampleSize: number;
}
