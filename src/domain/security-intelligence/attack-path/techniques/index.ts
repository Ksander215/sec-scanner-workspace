/**
 * Security Intelligence Attack Path Builder — Attack Techniques Registry
 *
 * Extensible registry for MITRE ATT&CK techniques.
 * Techniques are NOT hardcoded — they are registered at runtime
 * via the TechniqueRegistry.
 *
 * Provides a set of default techniques that can be extended or replaced.
 */

import type { AttackTechnique, AttackObjectiveType } from '../types/index.ts';
import { AttackObjectiveType as AOT } from '../types/index.ts';

// ─── Technique Registry Implementation ───────────────────────

/**
 * Registry for attack techniques.
 * Implements the TechniqueRegistry interface from types.
 *
 * Usage:
 * ```ts
 * const registry = new AttackTechniqueRegistry();
 * registry.register(myTechnique);
 * const technique = registry.getById('T1190');
 * ```
 */
export class AttackTechniqueRegistry {
  private readonly _techniques: Map<string, AttackTechnique> = new Map();

  /** Register a technique */
  register(technique: AttackTechnique): void {
    if (!technique.id) throw new Error('Technique must have an id');
    this._techniques.set(technique.id, Object.freeze({ ...technique }));
  }

  /** Register multiple techniques */
  registerAll(techniques: readonly AttackTechnique[]): void {
    for (const t of techniques) this.register(t);
  }

  /** Get a technique by ID */
  getById(id: string): AttackTechnique | null {
    return this._techniques.get(id) ?? null;
  }

  /** Get techniques by tactic */
  getByTactic(tactic: AttackObjectiveType): readonly AttackTechnique[] {
    return Object.freeze(
      [...this._techniques.values()].filter(t => t.tactic === tactic)
    );
  }

  /** Get all registered techniques */
  getAll(): readonly AttackTechnique[] {
    return Object.freeze([...this._techniques.values()]);
  }

  /** Check if a technique is registered */
  has(id: string): boolean {
    return this._techniques.has(id);
  }

  /** Get count of registered techniques */
  get size(): number {
    return this._techniques.size;
  }

  /** Clear all techniques */
  clear(): void {
    this._techniques.clear();
  }
}

// ─── Default Techniques (Common MITRE ATT&CK references) ────

/**
 * Default attack techniques based on MITRE ATT&CK.
 * These are reference techniques — users should register
 * their own techniques for domain-specific coverage.
 *
 * NOTE: These are extensible defaults, not hardcoded requirements.
 */
export const DEFAULT_TECHNIQUES: readonly AttackTechnique[] = Object.freeze([
  Object.freeze({
    id: 'T1190', name: 'Exploit Public-Facing Application',
    tactic: AOT.InitialAccess,
    description: 'Exploits a vulnerability in an internet-facing application to gain initial access',
    subTechniques: ['T1190.001', 'T1190.002'],
    frequency: 0.85, difficulty: 0.3, detectionDifficulty: 0.4,
    references: ['https://attack.mitre.org/techniques/T1190/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1078', name: 'Valid Accounts',
    tactic: AOT.InitialAccess,
    description: 'Uses stolen or default credentials to gain initial access',
    subTechniques: ['T1078.001', 'T1078.002', 'T1078.003'],
    frequency: 0.75, difficulty: 0.2, detectionDifficulty: 0.6,
    references: ['https://attack.mitre.org/techniques/T1078/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1110', name: 'Brute Force',
    tactic: AOT.CredentialAccess,
    description: 'Attempts to guess credentials through systematic trial',
    subTechniques: ['T1110.001', 'T1110.002', 'T1110.003', 'T1110.004'],
    frequency: 0.7, difficulty: 0.15, detectionDifficulty: 0.3,
    references: ['https://attack.mitre.org/techniques/T1110/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1552', name: 'Unsecured Credentials',
    tactic: AOT.CredentialAccess,
    description: 'Searches for unsecured credentials in files, logs, or repositories',
    subTechniques: ['T1552.001', 'T1552.002'],
    frequency: 0.6, difficulty: 0.2, detectionDifficulty: 0.5,
    references: ['https://attack.mitre.org/techniques/T1552/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1046', name: 'Network Service Discovery',
    tactic: AOT.Discovery,
    description: 'Discovers available network services through port scanning or service enumeration',
    subTechniques: [],
    frequency: 0.8, difficulty: 0.1, detectionDifficulty: 0.3,
    references: ['https://attack.mitre.org/techniques/T1046/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1087', name: 'Account Discovery',
    tactic: AOT.Discovery,
    description: 'Discovers accounts on the system or in the domain',
    subTechniques: ['T1087.001', 'T1087.002'],
    frequency: 0.65, difficulty: 0.15, detectionDifficulty: 0.4,
    references: ['https://attack.mitre.org/techniques/T1087/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1021', name: 'Remote Services',
    tactic: AOT.LateralMovement,
    description: 'Uses remote services to move laterally across a network',
    subTechniques: ['T1021.001', 'T1021.002', 'T1021.004', 'T1021.006'],
    frequency: 0.75, difficulty: 0.25, detectionDifficulty: 0.45,
    references: ['https://attack.mitre.org/techniques/T1021/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1534', name: 'Internal Spearphishing',
    tactic: AOT.LateralMovement,
    description: 'Sends spearphishing messages from a compromised internal account',
    subTechniques: [],
    frequency: 0.35, difficulty: 0.4, detectionDifficulty: 0.6,
    references: ['https://attack.mitre.org/techniques/T1534/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1068', name: 'Exploitation for Privilege Escalation',
    tactic: AOT.PrivilegeEscalation,
    description: 'Exploits a vulnerability to elevate privileges',
    subTechniques: [],
    frequency: 0.6, difficulty: 0.35, detectionDifficulty: 0.5,
    references: ['https://attack.mitre.org/techniques/T1068/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1548', name: 'Abuse Elevation Control Mechanism',
    tactic: AOT.PrivilegeEscalation,
    description: 'Abuses mechanisms like sudo or UAC to elevate privileges',
    subTechniques: ['T1548.001', 'T1548.002', 'T1548.003'],
    frequency: 0.55, difficulty: 0.3, detectionDifficulty: 0.45,
    references: ['https://attack.mitre.org/techniques/T1548/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1053', name: 'Scheduled Task/Job',
    tactic: AOT.Persistence,
    description: 'Creates scheduled tasks for persistent execution',
    subTechniques: ['T1053.001', 'T1053.005', 'T1053.006'],
    frequency: 0.6, difficulty: 0.2, detectionDifficulty: 0.35,
    references: ['https://attack.mitre.org/techniques/T1053/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1136', name: 'Create Account',
    tactic: AOT.Persistence,
    description: 'Creates a new account for persistent access',
    subTechniques: ['T1136.001', 'T1136.002'],
    frequency: 0.5, difficulty: 0.25, detectionDifficulty: 0.4,
    references: ['https://attack.mitre.org/techniques/T1136/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1005', name: 'Data from Local System',
    tactic: AOT.Collection,
    description: 'Collects data from the local system',
    subTechniques: [],
    frequency: 0.65, difficulty: 0.15, detectionDifficulty: 0.5,
    references: ['https://attack.mitre.org/techniques/T1005/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1039', name: 'Data from Network Shared Drive',
    tactic: AOT.Collection,
    description: 'Collects data from network shared drives',
    subTechniques: [],
    frequency: 0.5, difficulty: 0.2, detectionDifficulty: 0.45,
    references: ['https://attack.mitre.org/techniques/T1039/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1048', name: 'Exfiltration Over Alternative Protocol',
    tactic: AOT.Exfiltration,
    description: 'Steals data by using a different protocol than the main command channel',
    subTechniques: ['T1048.001', 'T1048.002', 'T1048.003'],
    frequency: 0.45, difficulty: 0.3, detectionDifficulty: 0.6,
    references: ['https://attack.mitre.org/techniques/T1048/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1041', name: 'Exfiltration Over C2 Channel',
    tactic: AOT.Exfiltration,
    description: 'Steals data by encoding it in the command and control channel',
    subTechniques: [],
    frequency: 0.4, difficulty: 0.35, detectionDifficulty: 0.55,
    references: ['https://attack.mitre.org/techniques/T1041/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1486', name: 'Data Encrypted for Impact',
    tactic: AOT.Impact,
    description: 'Encrypts data on target systems to cause business disruption',
    subTechniques: [],
    frequency: 0.5, difficulty: 0.3, detectionDifficulty: 0.5,
    references: ['https://attack.mitre.org/techniques/T1486/'],
    metadata: {},
  }),
  Object.freeze({
    id: 'T1489', name: 'Service Stop',
    tactic: AOT.Impact,
    description: 'Stops or disables services to cause disruption',
    subTechniques: [],
    frequency: 0.4, difficulty: 0.15, detectionDifficulty: 0.3,
    references: ['https://attack.mitre.org/techniques/T1489/'],
    metadata: {},
  }),
]);

/** Create a technique registry pre-populated with default techniques */
export function createDefaultTechniqueRegistry(): AttackTechniqueRegistry {
  const registry = new AttackTechniqueRegistry();
  registry.registerAll(DEFAULT_TECHNIQUES);
  return registry;
}
