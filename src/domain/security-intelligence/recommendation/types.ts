/** Recommendation priority */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

/** Recommendation status */
export type RecommendationStatus = 'open' | 'in-progress' | 'implemented' | 'accepted-risk' | 'dismissed';

/** Remediation action */
export interface RemediationAction {
  id: string;
  description: string;
  type: 'patch' | 'config' | 'network' | 'credential' | 'process' | 'architectural';
  effort: 'low' | 'medium' | 'high';
  riskReduction: number; // 0-1
  prerequisites: string[];
}

/** Recommendation */
export interface Recommendation {
  id: string;
  findingIds: string[];
  title: string;
  description: string;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  actions: RemediationAction[];
  estimatedRiskReduction: number;
  relatedRecommendations: string[];
  tags: string[];
}

/** Remediation plan */
export interface RemediationPlan {
  id: string;
  name: string;
  recommendations: Recommendation[];
  totalEstimatedRiskReduction: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  phases: RemediationPhase[];
}

export interface RemediationPhase {
  name: string;
  recommendations: string[]; // recommendation ids
  priority: RecommendationPriority;
}
