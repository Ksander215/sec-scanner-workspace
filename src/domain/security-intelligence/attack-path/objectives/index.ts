/**
 * Security Intelligence Attack Path Builder — Attack Objectives
 *
 * Provides factory functions for creating attack objectives
 * aligned with MITRE ATT&CK tactics.
 *
 * 9 supported objectives:
 * Initial Access, Credential Access, Discovery, Lateral Movement,
 * Privilege Escalation, Persistence, Collection, Exfiltration, Impact
 */

import type { AttackObjective, AttackObjectiveType, AttackNodeId } from '../types/index.ts';
import { AttackObjectiveType as AOT } from '../types/index.ts';
import { createAttackObjective } from '../models/index.ts';

// ─── Objective Factory Functions ─────────────────────────────

/** Create an Initial Access objective */
export function createInitialAccessObjective(
  targetNodeIds: readonly AttackNodeId[] = [],
  entryNodeIds: readonly AttackNodeId[] = [],
): AttackObjective {
  return createAttackObjective({
    type: AOT.InitialAccess,
    name: 'Initial Access',
    description: 'Gain initial access to the target infrastructure through exploitation of public-facing applications, credential theft, or other entry vectors',
    targetNodeIds,
    entryNodeIds,
    successCriteria: ['Access to at least one internal asset', 'Valid session established'],
    priority: 0.9,
  });
}

/** Create a Credential Access objective */
export function createCredentialAccessObjective(
  targetNodeIds: readonly AttackNodeId[] = [],
  entryNodeIds: readonly AttackNodeId[] = [],
): AttackObjective {
  return createAttackObjective({
    type: AOT.CredentialAccess,
    name: 'Credential Access',
    description: 'Obtain credentials through brute force, credential dumping, or other techniques to access restricted resources',
    targetNodeIds,
    entryNodeIds,
    successCriteria: ['Valid credentials obtained', 'Authentication token acquired'],
    priority: 0.85,
  });
}

/** Create a Discovery objective */
export function createDiscoveryObjective(
  targetNodeIds: readonly AttackNodeId[] = [],
  entryNodeIds: readonly AttackNodeId[] = [],
): AttackObjective {
  return createAttackObjective({
    type: AOT.Discovery,
    name: 'Discovery',
    description: 'Enumerate network services, accounts, and system information to map the infrastructure',
    targetNodeIds,
    entryNodeIds,
    successCriteria: ['Network topology mapped', 'Account inventory obtained'],
    priority: 0.6,
  });
}

/** Create a Lateral Movement objective */
export function createLateralMovementObjective(
  targetNodeIds: readonly AttackNodeId[] = [],
  entryNodeIds: readonly AttackNodeId[] = [],
): AttackObjective {
  return createAttackObjective({
    type: AOT.LateralMovement,
    name: 'Lateral Movement',
    description: 'Move through the infrastructure using remote services, pass-the-hash, or other lateral movement techniques',
    targetNodeIds,
    entryNodeIds,
    successCriteria: ['Access to target asset achieved', 'Remote session on target established'],
    priority: 0.8,
  });
}

/** Create a Privilege Escalation objective */
export function createPrivilegeEscalationObjective(
  targetNodeIds: readonly AttackNodeId[] = [],
  entryNodeIds: readonly AttackNodeId[] = [],
): AttackObjective {
  return createAttackObjective({
    type: AOT.PrivilegeEscalation,
    name: 'Privilege Escalation',
    description: 'Elevate privileges through exploitation of vulnerabilities, abuse of elevation mechanisms, or token manipulation',
    targetNodeIds,
    entryNodeIds,
    successCriteria: ['Elevated privileges obtained', 'Administrative access achieved'],
    priority: 0.85,
  });
}

/** Create a Persistence objective */
export function createPersistenceObjective(
  targetNodeIds: readonly AttackNodeId[] = [],
  entryNodeIds: readonly AttackNodeId[] = [],
): AttackObjective {
  return createAttackObjective({
    type: AOT.Persistence,
    name: 'Persistence',
    description: 'Establish persistent access through scheduled tasks, account creation, or other persistence mechanisms',
    targetNodeIds,
    entryNodeIds,
    successCriteria: ['Persistent access mechanism created', 'Survival across reboots confirmed'],
    priority: 0.7,
  });
}

/** Create a Collection objective */
export function createCollectionObjective(
  targetNodeIds: readonly AttackNodeId[] = [],
  entryNodeIds: readonly AttackNodeId[] = [],
): AttackObjective {
  return createAttackObjective({
    type: AOT.Collection,
    name: 'Collection',
    description: 'Collect data from local systems, network shares, or other sources before exfiltration',
    targetNodeIds,
    entryNodeIds,
    successCriteria: ['Target data located', 'Data staged for exfiltration'],
    priority: 0.75,
  });
}

/** Create an Exfiltration objective */
export function createExfiltrationObjective(
  targetNodeIds: readonly AttackNodeId[] = [],
  entryNodeIds: readonly AttackNodeId[] = [],
): AttackObjective {
  return createAttackObjective({
    type: AOT.Exfiltration,
    name: 'Exfiltration',
    description: 'Extract collected data through alternative protocols, command and control channels, or physical media',
    targetNodeIds,
    entryNodeIds,
    successCriteria: ['Data transferred to external location', 'Exfiltration confirmed'],
    priority: 0.9,
  });
}

/** Create an Impact objective */
export function createImpactObjective(
  targetNodeIds: readonly AttackNodeId[] = [],
  entryNodeIds: readonly AttackNodeId[] = [],
): AttackObjective {
  return createAttackObjective({
    type: AOT.Impact,
    name: 'Impact',
    description: 'Cause business disruption through data encryption, service destruction, or other impact techniques',
    targetNodeIds,
    entryNodeIds,
    successCriteria: ['Target service disrupted', 'Data integrity compromised'],
    priority: 0.95,
  });
}

/** Create an objective by type */
export function createObjectiveByType(
  type: AttackObjectiveType,
  targetNodeIds: readonly AttackNodeId[] = [],
  entryNodeIds: readonly AttackNodeId[] = [],
): AttackObjective {
  const factories: Record<AttackObjectiveType, (t: readonly AttackNodeId[], e: readonly AttackNodeId[]) => AttackObjective> = {
    [AOT.InitialAccess]: createInitialAccessObjective,
    [AOT.CredentialAccess]: createCredentialAccessObjective,
    [AOT.Discovery]: createDiscoveryObjective,
    [AOT.LateralMovement]: createLateralMovementObjective,
    [AOT.PrivilegeEscalation]: createPrivilegeEscalationObjective,
    [AOT.Persistence]: createPersistenceObjective,
    [AOT.Collection]: createCollectionObjective,
    [AOT.Exfiltration]: createExfiltrationObjective,
    [AOT.Impact]: createImpactObjective,
  };

  const factory = factories[type];
  if (!factory) throw new Error(`Unknown objective type: ${type}`);
  return factory(targetNodeIds, entryNodeIds);
}

/** Get all objective type priorities */
export function getObjectivePriorities(): Readonly<Record<AttackObjectiveType, number>> {
  return Object.freeze({
    [AOT.InitialAccess]: 0.9,
    [AOT.CredentialAccess]: 0.85,
    [AOT.Discovery]: 0.6,
    [AOT.LateralMovement]: 0.8,
    [AOT.PrivilegeEscalation]: 0.85,
    [AOT.Persistence]: 0.7,
    [AOT.Collection]: 0.75,
    [AOT.Exfiltration]: 0.9,
    [AOT.Impact]: 0.95,
  });
}
