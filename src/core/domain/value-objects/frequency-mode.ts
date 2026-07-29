/**
 * FrequencyMode — DOM-002.000 §1.13
 * Allowed: rare, normal, frequent
 * DP-013: Frequency Adaptation
 */
export enum FrequencyModeValue {
  Rare = 'rare',
  Normal = 'normal',
  Frequent = 'frequent',
}

export interface FrequencyMode {
  readonly value: FrequencyModeValue;
  readonly cooldownPeriod: number;
  readonly maxPerSession: number;
}
