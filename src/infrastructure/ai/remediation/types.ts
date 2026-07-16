/** INT-012: AI Remediation — Types */

export interface AiRemediationRequest {
  findingId: string;
  findingType: string;
  severity: string;
  description: string;
  affectedAsset: string;
  context?: Record<string, unknown>;
}

export interface AiRemediationPlan {
  findingId: string;
  plan: RemediationPhase[];
  playbook: RemediationPlaybook;
  rollbackPlan: RollbackPlan;
  estimatedEffort: string;
  riskReduction: number;
  generatedAt: Date;
  modelUsed: string;
}

export interface RemediationPhase {
  name: string;
  order: number;
  description: string;
  steps: RemediationStep[];
  verification: string;
  estimatedMinutes: number;
}

export interface RemediationStep {
  action: string;
  command?: string;
  target?: string;
  riskLevel: 'safe' | 'moderate' | 'dangerous';
  requiresApproval: boolean;
}

export interface RemediationPlaybook {
  name: string;
  description: string;
  steps: PlaybookStep[];
  preConditions: string[];
  postConditions: string[];
}

export interface PlaybookStep {
  order: number;
  action: string;
  command?: string;
  expectedOutput?: string;
  onFailure: 'stop' | 'continue' | 'rollback';
}

export interface RollbackPlan {
  description: string;
  steps: PlaybookStep[];
  triggers: string[];
}
