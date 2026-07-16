/** Attack step in a path */
export interface AttackStep {
  id: string;
  findingId: string;
  name: string;
  description: string;
  riskScore: number;
  technique?: string;
}

/** Attack path — sequence of steps leading to compromise */
export interface AttackPath {
  id: string;
  name: string;
  steps: AttackStep[];
  totalRiskScore: number;
  exploitability: number;
  impact: number;
  description: string;
  entryPoint: string;
  target: string;
}

/** Attack graph — all paths combined */
export interface AttackGraph {
  id: string;
  paths: AttackPath[];
  nodes: AttackGraphNode[];
  edges: AttackGraphEdge[];
  statistics: AttackGraphStatistics;
}

export interface AttackGraphNode {
  id: string;
  type: 'entry' | 'pivot' | 'target';
  label: string;
  riskScore: number;
}

export interface AttackGraphEdge {
  source: string;
  target: string;
  technique: string;
  difficulty: number;
}

export interface AttackGraphStatistics {
  totalPaths: number;
  avgPathLength: number;
  maxRiskScore: number;
  entryPoints: number;
  criticalPaths: number;
}
