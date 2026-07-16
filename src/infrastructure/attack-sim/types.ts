/** INT-016: Attack Simulation — Types */

export type SimulationType = 'purple-team' | 'bas' | 'mitre-emulation' | 'attack-replay' | 'kill-chain';

export interface AttackSimulation {
  id: string;
  name: string;
  type: SimulationType;
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'cancelled';
  scenarios: AttackScenario[];
  results: SimulationResult;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface AttackScenario {
  id: string;
  name: string;
  technique: string; // MITRE ATT&CK technique ID
  tactic: string;
  description: string;
  steps: AttackStep[];
  expectedDetections: ExpectedDetection[];
  riskLevel: 'safe' | 'moderate' | 'dangerous';
  requiresApproval: boolean;
}

export interface AttackStep {
  order: number;
  action: string;
  command?: string;
  target?: string;
  expectedOutcome: string;
  rollbackCommand?: string;
}

export interface ExpectedDetection {
  ruleId?: string;
  ruleName: string;
  expectedSeverity: string;
  description: string;
}

export interface SimulationResult {
  scenariosExecuted: number;
  scenariosDetected: number;
  scenariosMissed: number;
  detectionRate: number;
  executionTimeMs: number;
  scenarioResults: ScenarioResult[];
}

export interface ScenarioResult {
  scenarioId: string;
  detected: boolean;
  detectionTimeMs?: number;
  detectionRuleId?: string;
  actualSeverity?: string;
  gaps: DetectionGap[];
  notes: string;
}

export interface DetectionGap {
  technique: string;
  tactic: string;
  reason: string;
  recommendation: string;
}

export interface KillChainStep {
  phase: string; // Reconnaissance, Weaponization, Delivery, Exploitation, Installation, C2, Actions
  technique: string;
  description: string;
  detectionPossibility: 'high' | 'medium' | 'low' | 'none';
}

export interface AttackReplayConfig {
  sourceReportId: string;
  modifiedSteps?: AttackStep[];
  targetEnvironment: string;
  dryRun: boolean;
}
