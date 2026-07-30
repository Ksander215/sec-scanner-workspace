/**
 * Capability Metrics — Runtime metrics collection.
 * TASK-AIS-003G.000
 *
 * Collects and exposes runtime metrics for:
 *   - Pack counts by state
 *   - Capability counts
 *   - Validation checks
 *   - Dependency resolutions
 *   - Sandbox violations
 *   - Permission requests
 *   - Event publications
 */
import type { CapabilityMetrics } from './types.js';

export class CapabilityMetricsCollector {
  private _totalPacks = 0;
  private _activePacks = 0;
  private _disabledPacks = 0;
  private _suspendedPacks = 0;
  private _totalCapabilities = 0;
  private _validationChecks = 0;
  private _dependencyResolutions = 0;
  private _sandboxViolations = 0;
  private _permissionRequests = 0;
  private _permissionGrants = 0;
  private _permissionDenials = 0;
  private _eventsPublished = 0;

  incrementTotalPacks(): void { this._totalPacks++; }
  decrementTotalPacks(): void { this._totalPacks = Math.max(0, this._totalPacks - 1); }
  setActivePacks(count: number): void { this._activePacks = count; }
  setDisabledPacks(count: number): void { this._disabledPacks = count; }
  setSuspendedPacks(count: number): void { this._suspendedPacks = count; }
  addCapabilities(count: number): void { this._totalCapabilities += count; }
  removeCapabilities(count: number): void { this._totalCapabilities = Math.max(0, this._totalCapabilities - count); }
  incrementValidationChecks(): void { this._validationChecks++; }
  incrementDependencyResolutions(): void { this._dependencyResolutions++; }
  incrementSandboxViolations(): void { this._sandboxViolations++; }
  incrementPermissionRequests(): void { this._permissionRequests++; }
  incrementPermissionGrants(): void { this._permissionGrants++; }
  incrementPermissionDenials(): void { this._permissionDenials++; }
  incrementEventsPublished(): void { this._eventsPublished++; }

  getMetrics(): CapabilityMetrics {
    return Object.freeze({
      totalPacks: this._totalPacks,
      activePacks: this._activePacks,
      disabledPacks: this._disabledPacks,
      suspendedPacks: this._suspendedPacks,
      totalCapabilities: this._totalCapabilities,
      validationChecks: this._validationChecks,
      dependencyResolutions: this._dependencyResolutions,
      sandboxViolations: this._sandboxViolations,
      permissionRequests: this._permissionRequests,
      permissionGrants: this._permissionGrants,
      permissionDenials: this._permissionDenials,
      eventsPublished: this._eventsPublished,
    });
  }

  reset(): void {
    this._totalPacks = 0;
    this._activePacks = 0;
    this._disabledPacks = 0;
    this._suspendedPacks = 0;
    this._totalCapabilities = 0;
    this._validationChecks = 0;
    this._dependencyResolutions = 0;
    this._sandboxViolations = 0;
    this._permissionRequests = 0;
    this._permissionGrants = 0;
    this._permissionDenials = 0;
    this._eventsPublished = 0;
  }
}
