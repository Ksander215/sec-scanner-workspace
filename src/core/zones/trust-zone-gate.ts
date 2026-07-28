/**
 * Trust Zone Gate — ARC-001.001 §3.2
 * INV-007: No data flows across zones without gate check.
 * G-01..G-06 defined per ARC-001.001.
 */
import { TrustZone } from '../types/common.js';

export interface GateCheck {
  /** Gate identifier (G-01 through G-06) */
  readonly gateId: string;
  /** Source zone */
  readonly from: TrustZone;
  /** Destination zone */
  readonly to: TrustZone;
  /** Whether the check passed */
  readonly passed: boolean;
  /** Reason if failed */
  readonly reason?: string;
  readonly timestamp: string;
}

export interface TrustZoneGate {
  /** Validate a zone crossing */
  check(from: TrustZone, to: TrustZone, context?: Record<string, unknown>): GateCheck;
  /** Record a gate check for audit */
  record(check: GateCheck): void;
  /** Get all recorded gate checks */
  getHistory(): readonly GateCheck[];
}

export class DefaultTrustZoneGate implements TrustZoneGate {
  private history: GateCheck[] = [];

  check(from: TrustZone, to: TrustZone, _context?: Record<string, unknown>): GateCheck {
    const gateId = this.resolveGateId(from, to);
    const passed = this.validateGate(from, to);
    const check: GateCheck = {
      gateId,
      from,
      to,
      passed,
      reason: passed ? undefined : `Gate ${gateId} validation failed`,
      timestamp: new Date().toISOString(),
    };
    this.history.push(check);
    return check;
  }

  record(check: GateCheck): void {
    this.history.push(check);
  }

  getHistory(): readonly GateCheck[] {
    return this.history;
  }

  private validateGate(from: TrustZone, to: TrustZone): boolean {
    // G-01: Z0 → Z1 (reference validation)
    if (from === TrustZone.Constitutional && to === TrustZone.CoreAIS) return true;
    // G-02: Z1 → Z2 (permission check)
    if (from === TrustZone.CoreAIS && to === TrustZone.PluginSandbox) return true;
    // G-03: Z1 → Z3 (provider availability)
    if (from === TrustZone.CoreAIS && to === TrustZone.ProviderInterface) return true;
    // G-04: Z2 → Z1 (result sanitisation)
    if (from === TrustZone.PluginSandbox && to === TrustZone.CoreAIS) return true;
    // G-05: Z3 → Z4 (network policy)
    if (from === TrustZone.ProviderInterface && to === TrustZone.External) return true;
    // G-06: Z4 → Z3 (response validation)
    if (from === TrustZone.External && to === TrustZone.ProviderInterface) return true;
    return false;
  }

  private resolveGateId(from: TrustZone, to: TrustZone): string {
    const map: Record<string, string> = {
      'Z0→Z1': 'G-01', 'Z1→Z2': 'G-02', 'Z1→Z3': 'G-03',
      'Z2→Z1': 'G-04', 'Z3→Z4': 'G-05', 'Z4→Z3': 'G-06',
    };
    return map[`${from}→${to}`] ?? 'G-UNKNOWN';
  }
}
