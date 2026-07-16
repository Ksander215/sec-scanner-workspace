/**
 * Plugin: Custom Correlation Rule
 *
 * Adds a cross-host lateral-movement correlation rule that links findings
 * on different hosts when they share the same vulnerability and the
 * destination host is reachable from the source.
 *
 * This plugin uses the 'correlation-rule' extension point.
 */

import type {
  SiPlugin,
  PluginManifest,
  PluginContext,
} from '../../src/infrastructure/plugins/types.js';

// ── Plugin Manifest ───────────────────────────────────────────────────────
const manifest: PluginManifest = {
  name: 'lateral-movement-correlation',
  version: '1.0.0',
  description: 'Correlates findings across hosts to detect lateral movement patterns',
  author: 'Security Team',
  entryPoint: __filename,
  extensions: ['correlation-rule'],
};

// ── Plugin Implementation ─────────────────────────────────────────────────
class LateralMovementCorrelationPlugin implements SiPlugin {
  readonly manifest = manifest;

  async initialize(context: PluginContext): Promise<void> {
    context.logger.info('Initializing lateral-movement correlation plugin');

    // Register the cross-host lateral movement correlation rule
    context.registerCorrelationRule({
      id: 'lateral-movement-cross-host',
      name: 'Cross-Host Lateral Movement',
      condition: (a, b) => {
        // Findings must be on different hosts
        const hostA = String(a.host ?? '');
        const hostB = String(b.host ?? '');
        if (!hostA || !hostB || hostA === hostB) return false;

        // Same vulnerability category (e.g., both are RCE-class)
        const catA = String(a.category ?? '');
        const catB = String(b.category ?? '');
        if (catA !== catB || catA !== 'vulnerability') return false;

        // Both must be high/critical severity
        const sevA = String(a.severity ?? '');
        const sevB = String(b.severity ?? '');
        if (!['critical', 'high'].includes(sevA) || !['critical', 'high'].includes(sevB)) return false;

        // Evidence of network proximity (same subnet / port overlap)
        const portA = Number(a.port ?? 0);
        const portB = Number(b.port ?? 0);
        const sameSubnet = hostA.split('.').slice(0, 3).join('.')
          === hostB.split('.').slice(0, 3).join('.');
        const portOverlap = portA > 0 && portB > 0
          && Math.abs(portA - portB) < 10;

        return sameSubnet || portOverlap;
      },
      scoreCalculator: (a, b) => {
        let score = 0.5;

        // Boost for same subnet
        const hostA = String(a.host ?? '');
        const hostB = String(b.host ?? '');
        const sameSubnet = hostA.split('.').slice(0, 3).join('.')
          === hostB.split('.').slice(0, 3).join('.');
        if (sameSubnet) score += 0.2;

        // Boost for critical severity
        if (String(a.severity) === 'critical' && String(b.severity) === 'critical') {
          score += 0.2;
        }

        // Boost if both have exploit evidence
        const hasExploitA = Number(a.cvssScore ?? 0) >= 9.0;
        const hasExploitB = Number(b.cvssScore ?? 0) >= 9.0;
        if (hasExploitA && hasExploitB) score += 0.1;

        return Math.min(score, 1.0);
      },
    });

    // Register a second rule: shared-root-cause for misconfigurations
    context.registerCorrelationRule({
      id: 'shared-misconfiguration-root',
      name: 'Shared Misconfiguration Root Cause',
      condition: (a, b) => {
        // Both must be misconfigurations
        if (String(a.category) !== 'misconfiguration' || String(b.category) !== 'misconfiguration') {
          return false;
        }
        // Same host or same service
        const sameHost = String(a.host) === String(b.host);
        const sameService = String(a.path ?? '').split('/').slice(0, 3).join('/')
          === String(b.path ?? '').split('/').slice(0, 3).join('/');
        return sameHost || sameService;
      },
      scoreCalculator: (_a, _b) => 0.7,
    });

    context.logger.info('Registered 2 correlation rules');
  }

  async destroy(): Promise<void> {
    // Cleanup if needed
  }
}

// ── Export ─────────────────────────────────────────────────────────────────
export default new LateralMovementCorrelationPlugin();

// ── Usage ──────────────────────────────────────────────────────────────────
//
// Programmatic:
//
//   import { PluginEngine } from './src/infrastructure/plugins/plugin-engine.js';
//   import lateralMovementPlugin from './examples/plugin/custom-correlation-rule.js';
//
//   const pluginEngine = new PluginEngine();
//   await pluginEngine.loadPlugin(lateralMovementPlugin);
//
//   const rules = pluginEngine.getCorrelationRules();
//   // → [ { id: 'lateral-movement-cross-host', ... }, { id: 'shared-misconfiguration-root', ... } ]
//
// With Builder:
//
//   import { SecurityIntelligenceBuilder } from './src/domain/security-intelligence/orchestrator/builder.js';
//
//   const engine = new SecurityIntelligenceBuilder()
//     .addCorrelationRule({
//       id: 'lateral-movement-cross-host',
//       name: 'Cross-Host Lateral Movement',
//       type: 'attack-chain',
//       condition: (a, b) => { /* ... */ },
//       scoreCalculator: (a, b) => 0.8,
//       description: 'Links findings across hosts indicating lateral movement',
//     })
//     .build();
