/**
 * Plugin Host Interface — ADR-006, ARC-001.001 FP-08
 * Plugins run in Z2 sandbox. No elevation path.
 * Lifecycle: Discovery → Validation → Loading → Activation → Monitoring → Deactivation → Removal.
 */
import type { PluginManifest } from '../domain/entities/plugin-manifest.js';
import { TrustZone } from '../types/common.js';

export interface PluginHost {
  readonly zone: TrustZone.PluginSandbox;
  load(manifest: PluginManifest): Promise<void>;
  unload(manifestId: string, reason: string): Promise<void>;
  getLoadedPlugins(): readonly PluginManifest[];
  validateManifest(manifest: PluginManifest): boolean;
}
