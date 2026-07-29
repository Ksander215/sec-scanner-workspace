/**
 * Plugin Aggregate — DOM-002.000 §3.5
 * Root: PluginManifest
 * Members: PluginManifest, PluginPermission
 * Invariants: INV-005 (no run without manifest), INV-013 (no permission beyond scope)
 * Entry Point: PluginManifest.register(pluginName, capabilities, permissions, trustZone)
 */
import type { PluginManifest } from '../entities/plugin-manifest.js';

export interface PluginAggregate {
  readonly root: PluginManifest;
}

/**
 * INV-005: No plugin runs without registered/validated PluginManifest.
 */
export function assertPluginHasManifest(manifest: PluginManifest | undefined): void {
  if (!manifest) {
    throw new Error('INV-005 violated: plugin without registered PluginManifest');
  }
}

/**
 * INV-013: No plugin granted permissions beyond declared manifest scope.
 */
export function assertPermissionsWithinScope(
  declaredScopes: readonly string[],
  requestedScopes: readonly string[]
): void {
  const scopeSet = new Set(declaredScopes);
  for (const scope of requestedScopes) {
    if (!scopeSet.has(scope)) {
      throw new Error(`INV-013 violated: permission '${scope}' beyond manifest scope`);
    }
  }
}
