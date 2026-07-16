/** Explanation type */
export type ExplanationType = 'risk' | 'attack-path' | 'recommendation' | 'finding' | 'correlation';

/** Evidence item in an explanation */
export interface ExplanationEvidence {
  source: string;
  description: string;
  weight: number;
  data: Record<string, unknown>;
}

/** Step in an explanation chain */
export interface ExplanationStep {
  index: number;
  title: string;
  description: string;
  evidence: ExplanationEvidence[];
  conclusion: string;
}

/** Full explanation */
export interface Explanation {
  id: string;
  type: ExplanationType;
  targetId: string;
  summary: string;
  steps: ExplanationStep[];
  confidence: number;
  timestamp: Date;
}

/** Trace of the analysis pipeline */
export interface AnalysisTrace {
  id: string;
  runId: string;
  stages: TraceStage[];
  totalTimeMs: number;
}

export interface TraceStage {
  name: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  inputCount: number;
  outputCount: number;
  metadata: Record<string, unknown>;
}
