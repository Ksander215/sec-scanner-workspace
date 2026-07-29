/**
 * ConfidenceLevel — DOM-002.000 §1.5
 * INV-002: Confidence is always in range [0, 100].
 * Mapping: [0-20) Very Low, [20-40) Low, [40-60) Moderate, [60-80) High, [80-100] Very High
 */
export enum ConfidenceLevel {
  VeryLow = 'Very Low',
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
  VeryHigh = 'Very High',
}

export function classifyConfidence(score: number): ConfidenceLevel {
  if (score < 0 || score > 100) throw new Error('INV-002: Confidence must be in [0, 100]');
  if (score < 20) return ConfidenceLevel.VeryLow;
  if (score < 40) return ConfidenceLevel.Low;
  if (score < 60) return ConfidenceLevel.Moderate;
  if (score < 80) return ConfidenceLevel.High;
  return ConfidenceLevel.VeryHigh;
}
