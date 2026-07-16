import type { Severity, Confidence } from '../normalization/types.js';

/** Risk level */
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'negligible';

/** Risk factor */
export interface RiskFactor {
  name: string;
  weight: number;
  value: number; // 0-1
  description: string;
}

/** Risk assessment result */
export interface RiskAssessment {
  id: string;
  findingId: string;
  level: RiskLevel;
  score: number; // 0-100
  factors: RiskFactor[];
  confidence: number; // 0-1
  description: string;
  recommendations: string[];
}

/** Risk summary */
export interface RiskSummary {
  totalFindings: number;
  totalAssessed: number;
  averageScore: number;
  byLevel: Record<RiskLevel, number>;
  topRisks: RiskAssessment[];
  riskTrend: 'increasing' | 'stable' | 'decreasing';
}

/** Risk calculation parameters */
export interface RiskParameters {
  severityWeight: number;
  confidenceWeight: number;
  exposureWeight: number;
  impactWeight: number;
  exploitabilityWeight: number;
  correlationMultiplier: number;
}
