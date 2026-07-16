/** INT-012: AI Risk Assistant — Types */

export interface RiskExplanationRequest {
  findingId: string;
  riskScore: number;
  riskLevel: string;
  factors: RiskFactorDetail[];
  context?: Record<string, unknown>;
}

export interface RiskFactorDetail {
  name: string;
  value: number;
  weight: number;
  description: string;
}

export interface RiskExplanation {
  findingId: string;
  question: string;
  explanation: string;
  reasoning: ExplanationReasoning[];
  evidence: string[];
  confidence: number;
  generatedAt: Date;
  modelUsed: string;
  tokenUsage: { prompt: number; completion: number };
}

export interface ExplanationReasoning {
  step: number;
  premise: string;
  inference: string;
  conclusion: string;
}

export interface RiskComparisonRequest {
  findings: Array<{ id: string; riskScore: number; riskLevel: string; summary: string }>;
  question?: string;
}

export interface RiskComparison {
  question: string;
  comparison: string;
  rankings: Array<{ findingId: string; rank: number; reasoning: string }>;
  generatedAt: Date;
}
