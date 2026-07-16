/** INT-016: Attack Simulation — Engine */
import type {
  AttackSimulation, AttackScenario, SimulationType, SimulationResult,
  ScenarioResult, DetectionGap, AttackStep, KillChainStep, AttackReplayConfig,
} from './types.js';

export class AttackSimulationEngine {
  private simulations: Map<string, AttackSimulation> = new Map();

  /** Create a new attack simulation */
  createSimulation(
    name: string,
    type: SimulationType,
    scenarios: AttackScenario[],
    metadata?: Record<string, unknown>,
  ): AttackSimulation {
    const simulation: AttackSimulation = {
      id: crypto.randomUUID(),
      name,
      type,
      status: 'planning',
      scenarios,
      results: { scenariosExecuted: 0, scenariosDetected: 0, scenariosMissed: 0, detectionRate: 0, executionTimeMs: 0, scenarioResults: [] },
      createdAt: new Date(),
      metadata: metadata ?? {},
    };

    this.simulations.set(simulation.id, simulation);
    return simulation;
  }

  /** Execute a simulation */
  async execute(simulationId: string, options?: { dryRun?: boolean; targetEnvironment?: string }): Promise<SimulationResult> {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) throw new Error(`Simulation ${simulationId} not found`);

    simulation.status = 'executing';
    simulation.startedAt = new Date();

    if (options?.dryRun) {
      simulation.status = 'completed';
      simulation.completedAt = new Date();
      simulation.results = {
        scenariosExecuted: simulation.scenarios.length,
        scenariosDetected: 0,
        scenariosMissed: simulation.scenarios.length,
        detectionRate: 0,
        executionTimeMs: 0,
        scenarioResults: simulation.scenarios.map(s => ({
          scenarioId: s.id,
          detected: false,
          gaps: [],
          notes: 'Dry run - no execution',
        })),
      };
      return simulation.results;
    }

    const startTime = Date.now();
    const scenarioResults: ScenarioResult[] = [];

    for (const scenario of simulation.scenarios) {
      const result = await this.executeScenario(scenario, options?.targetEnvironment);
      scenarioResults.push(result);
    }

    const detected = scenarioResults.filter(r => r.detected).length;
    const missed = scenarioResults.filter(r => !r.detected).length;

    simulation.results = {
      scenariosExecuted: scenarioResults.length,
      scenariosDetected: detected,
      scenariosMissed: missed,
      detectionRate: scenarioResults.length > 0 ? detected / scenarioResults.length : 0,
      executionTimeMs: Date.now() - startTime,
      scenarioResults,
    };

    simulation.status = 'completed';
    simulation.completedAt = new Date();

    return simulation.results;
  }

  /** Generate MITRE ATT&CK emulation scenarios */
  generateMitreEmulation(techniques: string[]): AttackScenario[] {
    return techniques.map(technique => ({
      id: crypto.randomUUID(),
      name: `MITRE Emulation: ${technique}`,
      technique,
      tactic: this.getTacticForTechnique(technique),
      description: `Automated emulation of MITRE ATT&CK technique ${technique}`,
      steps: [
        { order: 1, action: `Execute ${technique} technique`, expectedOutcome: 'Technique executed successfully', rollbackCommand: 'cleanup' },
      ],
      expectedDetections: [
        { ruleName: `Detection for ${technique}`, expectedSeverity: 'high', description: `Should detect ${technique} execution` },
      ],
      riskLevel: 'moderate' as const,
      requiresApproval: true,
    }));
  }

  /** Generate kill chain simulation */
  generateKillChainSimulation(): AttackScenario[] {
    const killChainSteps: KillChainStep[] = [
      { phase: 'Reconnaissance', technique: 'T1595', description: 'Active scanning of target', detectionPossibility: 'medium' },
      { phase: 'Weaponization', technique: 'T1027', description: 'Obfuscated files or information', detectionPossibility: 'low' },
      { phase: 'Delivery', technique: 'T1566', description: 'Phishing for initial access', detectionPossibility: 'high' },
      { phase: 'Exploitation', technique: 'T1190', description: 'Exploit public-facing application', detectionPossibility: 'high' },
      { phase: 'Installation', technique: 'T1059', description: 'Command and scripting interpreter', detectionPossibility: 'medium' },
      { phase: 'Command & Control', technique: 'T1071', description: 'Application layer protocol C2', detectionPossibility: 'medium' },
      { phase: 'Actions on Objectives', technique: 'T1486', description: 'Data encrypted for impact', detectionPossibility: 'low' },
    ];

    return killChainSteps.map((step, i) => ({
      id: crypto.randomUUID(),
      name: `Kill Chain: ${step.phase}`,
      technique: step.technique,
      tactic: step.phase,
      description: step.description,
      steps: [{ order: 1, action: step.description, expectedOutcome: `Simulated ${step.phase} activity` }],
      expectedDetections: [{ ruleName: `${step.phase} detection`, expectedSeverity: 'medium', description: `Detect ${step.phase} activities` }],
      riskLevel: 'moderate' as const,
      requiresApproval: true,
    }));
  }

  /** Replay an attack from a security report */
  createReplaySimulation(config: AttackReplayConfig): AttackSimulation {
    const scenarios: AttackScenario[] = [{
      id: crypto.randomUUID(),
      name: `Attack Replay: ${config.sourceReportId}`,
      technique: 'replay',
      tactic: 'replay',
      description: `Replay of attack from report ${config.sourceReportId}`,
      steps: config.modifiedSteps ?? [{ order: 1, action: 'Replay attack steps', expectedOutcome: 'Attack reproduced' }],
      expectedDetections: [],
      riskLevel: 'dangerous',
      requiresApproval: !config.dryRun,
    }];

    return this.createSimulation(`Replay ${config.sourceReportId}`, 'attack-replay', scenarios, {
      sourceReportId: config.sourceReportId,
      targetEnvironment: config.targetEnvironment,
      dryRun: config.dryRun,
    });
  }

  /** Get simulation */
  getSimulation(id: string): AttackSimulation | undefined {
    return this.simulations.get(id);
  }

  /** List simulations */
  listSimulations(filter?: { type?: SimulationType; status?: string }): AttackSimulation[] {
    let results = [...this.simulations.values()];
    if (filter?.type) results = results.filter(s => s.type === filter.type);
    if (filter?.status) results = results.filter(s => s.status === filter.status);
    return results;
  }

  /** Cancel a simulation */
  cancelSimulation(id: string): boolean {
    const sim = this.simulations.get(id);
    if (!sim || sim.status !== 'executing') return false;
    sim.status = 'cancelled';
    return true;
  }

  private async executeScenario(scenario: AttackScenario, _targetEnvironment?: string): Promise<ScenarioResult> {
    // Production: execute actual attack steps in isolated environment
    // Here: simulate detection logic
    const detected = Math.random() > 0.3; // 70% detection rate simulation
    const gaps: DetectionGap[] = detected ? [] : [{
      technique: scenario.technique,
      tactic: scenario.tactic,
      reason: `No detection rule matched for technique ${scenario.technique}`,
      recommendation: `Create detection rule for ${scenario.technique} (${scenario.tactic})`,
    }];

    return {
      scenarioId: scenario.id,
      detected,
      detectionTimeMs: detected ? Math.floor(Math.random() * 5000) + 100 : undefined,
      gaps,
      notes: detected ? 'Detected successfully' : 'Detection gap found',
    };
  }

  private getTacticForTechnique(technique: string): string {
    const mapping: Record<string, string> = {
      T1595: 'Reconnaissance', T1566: 'Initial Access', T1190: 'Initial Access',
      T1059: 'Execution', T1078: 'Persistence', T1055: 'Privilege Escalation',
      T1071: 'Command and Control', T1486: 'Impact',
    };
    return mapping[technique] ?? 'Unknown';
  }
}
