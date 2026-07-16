/** INT-012: AI Threat Hunting — Types */

export interface ThreatHuntingQuery {
  query: string;
  hunter: string;
  scope?: {
    assets?: string[];
    timeRange?: { from: Date; to: Date };
    techniques?: string[];
  };
}

export interface ThreatHuntingResult {
  query: string;
  answer: string;
  cypherQuery?: string;
  graphPaths: GraphPath[];
  relatedFindings: string[];
  suggestedActions: string[];
  confidence: number;
  generatedAt: Date;
  modelUsed: string;
}

export interface GraphPath {
  startNode: string;
  endNode: string;
  edges: Array<{ from: string; to: string; type: string; properties: Record<string, unknown> }>;
  length: number;
  riskScore: number;
}

export interface LateralMovementResult {
  sourceAsset: string;
  targetAsset: string;
  paths: Array<{
    hops: string[];
    technique: string;
    riskScore: number;
    evidence: string[];
  }>;
  exposureLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  containmentRecommendations: string[];
}
