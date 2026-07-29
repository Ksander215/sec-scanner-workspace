/**
 * PluginPermission — DOM-002.000 §1.18
 * INV-013: No plugin granted permissions beyond declared manifest scope.
 */
export interface PluginPermission {
  readonly scope: string;
  readonly operations: readonly string[];
  readonly resourcePattern: string;
  readonly maxCallsPerSession: number;
}
