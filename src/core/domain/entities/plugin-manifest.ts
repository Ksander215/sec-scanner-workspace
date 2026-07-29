/**
 * PluginManifest — DOM-002.000 §1.17
 * Owner: Plugin Module (FP-PLUGIN)
 * FSM: Registered → Active → Suspended → Unregistered
 * Aggregate: Plugin (Root)
 * INV-005: No plugin runs without registered PluginManifest.
 */
import type { EntityBase } from './entity-base.js';
import type { PluginManifestId } from '../identifiers.js';
import type { PluginPermission } from '../value-objects/plugin-permission.js';
import { TrustZone } from '../../types/common.js';

export enum PluginManifestState {
  Registered = 'Registered',
  Active = 'Active',
  Suspended = 'Suspended',
  Unregistered = 'Unregistered',
}

export interface PluginManifest extends EntityBase {
  readonly id: PluginManifestId;
  readonly manifestId: PluginManifestId;
  readonly pluginName: string;
  readonly manifestVersion: string;
  readonly capabilities: readonly string[];
  readonly permissions: readonly PluginPermission[];
  readonly trustZone: TrustZone;
  readonly registeredAt: string;
  readonly state: PluginManifestState;
}
