/**
 * Plugin: Custom Risk Factor
 *
 * Adds a "Network Exposure" risk factor that increases the risk score
 * for findings on hosts that are publicly reachable, and an
 * "Asset Criticality" factor based on host naming conventions.
 *
 * This plugin uses the 'risk-factor' extension point.
 */

import type {
  SiPlugin,
  PluginManifest,
  PluginContext,
} from '../../src/infrastructure/plugins/types.js';

// ── Plugin Manifest ───────────────────────────────────────────────────────
const manifest: PluginManifest = {
  name: 'network-exposure-risk-factor',
  version: '1.2.0',
  description: 'Adds network exposure and asset criticality risk factors',
  author: 'Security Team',
  entryPoint: __filename,
  extensions: ['risk-factor'],
};

// ── Known public-facing host patterns ─────────────────────────────────────
const PUBLIC_HOST_PATTERNS = [
  /^prod-web/i,
  /^prod-api/i,
  /^lb-/i,
  /^gateway/i,
  /^proxy/i,
  /^cdn/i,
  /^ingress/i,
];

// ── Asset criticality mapping by host prefix ──────────────────────────────
const CRITICALITY_MAP: Record<string, number> = {
  'prod-db':    1.0,   // Database servers — highest
  'prod-app':   0.9,   // Application servers
  'prod-web':   0.85,  // Web servers
  'prod-api':   0.85,  // API servers
  'staging':    0.5,   // Staging environments
  'dev':        0.2,   // Development environments
  'test':       0.1,   // Test environments
};

function getAssetCriticality(host: string): number {
  const prefix = Object.keys(CRITICALITY_MAP).find(k => host.toLowerCase().startsWith(k));
  return prefix ? CRITICALITY_MAP[prefix] : 0.5;
}

function isPublicFacing(host: string): boolean {
  return PUBLIC_HOST_PATTERNS.some(p => p.test(host));
}

// ── Plugin Implementation ─────────────────────────────────────────────────
class NetworkExposureRiskFactorPlugin implements SiPlugin {
  readonly manifest = manifest;

  async initialize(context: PluginContext): Promise<void> {
    context.logger.info('Initializing network exposure risk factor plugin');

    // ── Factor 1: Network Exposure ──────────────────────────────────────
    context.registerRiskFactor({
      id: 'network-exposure',
      name: 'Network Exposure',
      weight: 0.25,
      calculate: (finding) => {
        const host = String(finding.host ?? '');

        if (!host) return 0.3; // Unknown host — moderate exposure assumed

        if (isPublicFacing(host)) {
          // Public-facing: high exposure
          const port = Number(finding.port ?? 0);
          if ([22, 80, 443, 8080, 8443].includes(port)) {
            return 0.95; // Common internet-facing ports
          }
          return 0.8; // Other public ports
        }

        // Internal host: check if in DMZ-like subnet
        const parts = host.split('.');
        if (parts.length >= 4) {
          const thirdOctet = Number(parts[2]);
          if (thirdOctet >= 0 && thirdOctet <= 10) {
            return 0.6; // DMZ-ish range
          }
        }

        return 0.2; // Internal, low exposure
      },
    });

    // ── Factor 2: Asset Criticality ─────────────────────────────────────
    context.registerRiskFactor({
      id: 'asset-criticality',
      name: 'Asset Criticality',
      weight: 0.20,
      calculate: (finding) => {
        const host = String(finding.host ?? '');
        return getAssetCriticality(host);
      },
    });

    // ── Factor 3: Data Sensitivity ──────────────────────────────────────
    context.registerRiskFactor({
      id: 'data-sensitivity',
      name: 'Data Sensitivity',
      weight: 0.15,
      calculate: (finding) => {
        const category = String(finding.category ?? '');
        const path = String(finding.path ?? '');
        const evidence = finding.evidence as Record<string, unknown> | undefined;

        // Secrets are always high-sensitivity
        if (category === 'secret') return 0.95;

        // Database-related findings
        if (path.includes('/db/') || path.includes('/database/')) return 0.9;

        // PII/credentials in evidence
        if (evidence) {
          const keys = Object.keys(evidence);
          if (keys.some(k => /password|credential|token|secret|pii/i.test(k))) {
            return 0.9;
          }
        }

        // Vulnerability on critical services
        if (category === 'vulnerability') {
          const port = Number(finding.port ?? 0);
          if ([3306, 5432, 27017, 6379].includes(port)) return 0.85; // DB ports
        }

        return 0.4; // Default moderate sensitivity
      },
    });

    context.logger.info('Registered 3 risk factors: network-exposure, asset-criticality, data-sensitivity');
  }

  async destroy(): Promise<void> {
    // Cleanup if needed
  }
}

// ── Export ─────────────────────────────────────────────────────────────────
export default new NetworkExposureRiskFactorPlugin();

// ── Usage ──────────────────────────────────────────────────────────────────
//
// Programmatic:
//
//   import { PluginEngine } from './src/infrastructure/plugins/plugin-engine.js';
//   import riskFactorPlugin from './examples/plugin/custom-risk-factor.js';
//
//   const pluginEngine = new PluginEngine();
//   await pluginEngine.loadPlugin(riskFactorPlugin);
//
//   const factors = pluginEngine.getRiskFactors();
//   // → [
//   //     { id: 'network-exposure', name: 'Network Exposure', weight: 0.25 },
//   //     { id: 'asset-criticality', name: 'Asset Criticality', weight: 0.20 },
//   //     { id: 'data-sensitivity', name: 'Data Sensitivity', weight: 0.15 },
//   //   ]
//
// Directly with RiskEngine:
//
//   import { RiskEngine } from './src/domain/security-intelligence/risk/risk-engine.js';
//   import riskFactorPlugin from './examples/plugin/custom-risk-factor.js';
//
//   // The plugin registers risk factors via PluginContext,
//   // which are then consumed by the RiskEngine during assessAll().
