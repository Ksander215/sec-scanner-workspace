import type { SecurityFinding } from '../normalization/types.js';

/** Correlation strength */
export type CorrelationStrength = 'strong' | 'moderate' | 'weak';

/** Correlation type */
export type CorrelationType = 
  | 'same-host' 
  | 'same-service' 
  | 'causal' 
  | 'temporal' 
  | 'attack-chain'
  | 'shared-root-cause';

/** Correlation between two findings */
export interface Correlation {
  id: string;
  findingA: string; // finding id
  findingB: string; // finding id
  type: CorrelationType;
  strength: CorrelationStrength;
  score: number; // 0-1
  description: string;
  evidence: Record<string, unknown>;
}

/** Correlation group — cluster of related findings */
export interface CorrelationGroup {
  id: string;
  name: string;
  findings: string[]; // finding ids
  correlations: string[]; // correlation ids
  dominantCategory: string;
  riskMultiplier: number;
  description: string;
}

/** Correlation rule */
export interface CorrelationRule {
  id: string;
  name: string;
  type: CorrelationType;
  condition: (a: SecurityFinding, b: SecurityFinding) => boolean;
  scoreCalculator: (a: SecurityFinding, b: SecurityFinding) => number;
  description: string;
}

/** Correlation result */
export interface CorrelationResult {
  correlations: Correlation[];
  groups: CorrelationGroup[];
  statistics: CorrelationStatistics;
}

export interface CorrelationStatistics {
  totalFindings: number;
  totalCorrelations: number;
  totalGroups: number;
  byType: Record<CorrelationType, number>;
  avgGroupSize: number;
}
