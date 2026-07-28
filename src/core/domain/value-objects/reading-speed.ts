/**
 * ReadingSpeed — DOM-002.000 §1.11
 * Allowed: fast, normal, slow
 */
export enum ReadingSpeedValue {
  Fast = 'fast',
  Normal = 'normal',
  Slow = 'slow',
}

export interface ReadingSpeed {
  readonly value: ReadingSpeedValue;
  readonly wordsPerMinute: number;
  readonly sampleSize: number;
}
