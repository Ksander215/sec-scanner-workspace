# Plugin Development Guide

This guide covers everything you need to build, test, and deploy plugins for the Security Intelligence Platform.

---

## Table of Contents

- [Overview](#overview)
- [Plugin Architecture](#plugin-architecture)
- [Plugin Interface](#plugin-interface)
- [Plugin Manifest](#plugin-manifest)
- [Plugin Lifecycle](#plugin-lifecycle)
- [Plugin Context](#plugin-context)
- [Extension Points](#extension-points)
  - [correlation-rule](#correlation-rule)
  - [risk-factor](#risk-factor)
  - [recommendation-rule](#recommendation-rule)
  - [cli-command](#cli-command)
  - [rest-endpoint](#rest-endpoint)
  - [persistence-provider](#persistence-provider)
  - [analysis-stage](#analysis-stage)
  - [output-formatter](#output-formatter)
- [Plugin Logger](#plugin-logger)
- [Building a Plugin](#building-a-plugin)
- [Full Example Plugins](#full-example-plugins)
- [Testing Plugins](#testing-plugins)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Security Intelligence Platform plugin system allows you to extend the platform's behavior without modifying core code. Plugins hook into **8 extension points** that cover the entire analysis pipeline — from correlation logic to output formatting.

Key design principles:
- **Zero-trust**: Plugins are isolated; they receive only what the context provides.
- **Async-first**: All plugin operations (`initialize`, `destroy`, `execute`, `process`) are async.
- **Declarative registration**: Plugins declare their extensions in the manifest; the engine validates and loads them.
- **Composable**: Multiple plugins can register extensions at the same extension point. Analysis stages are ordered; other extensions are additive.

---

## Plugin Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Plugin Engine                       │
│                                                       │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Plugin A │  │ Plugin B │  │     Plugin C          │ │
│  │         │  │          │  │                       │ │
│  │ correl. │  │ risk-    │  │ cli-cmd  rest-ep     │ │
│  │ rule    │  │ factor   │  │ output-fmt           │ │
│  └─────────┘  └──────────┘  └──────────────────────┘ │
│                                                       │
│  Extension Registries:                                │
│  ┌────────────────┬──────────────┬─────────────────┐  │
│  │ correlation-   │ risk-        │ recommend-      │  │
│  │ rules[]        │ factors[]    │ ation-rules[]   │  │
│  ├────────────────┼──────────────┼─────────────────┤  │
│  │ cli-commands[] │ rest-        │ persistence-    │  │
│  │                │ endpoints[]  │ providers[]     │  │
│  ├────────────────┼──────────────┼─────────────────┤  │
│  │ analysis-      │ output-     │                 │  │
│  │ stages[]       │ formatters[] │                 │  │
│  └────────────────┴──────────────┴─────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Plugin Interface

Every plugin must implement the `SiPlugin` interface:

```typescript
interface SiPlugin {
  readonly manifest: PluginManifest;
  initialize(context: PluginContext): Promise<void>;
  destroy(): Promise<void>;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `manifest` | `PluginManifest` | Static metadata about the plugin. Must be a readonly property. |
| `initialize(context)` | `async function` | Called once when the plugin is loaded. Use this to register extensions via the context. |
| `destroy()` | `async function` | Called once when the plugin is unloaded. Clean up resources, connections, timers, etc. |

---

## Plugin Manifest

```typescript
interface PluginManifest {
  name: string;                        // Unique plugin identifier (e.g., "com.example.custom-correlation")
  version: string;                     // Semver version (e.g., "1.0.0")
  description: string;                 // Human-readable description
  author: string;                      // Author name or organization
  entryPoint: string;                  // Entry module path (e.g., "./index.js")
  extensions: PluginExtensionPoint[];  // Extension points this plugin uses
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique identifier. Must not conflict with other loaded plugins. |
| `version` | `string` | Yes | Semantic version. |
| `description` | `string` | Yes | Short description of what the plugin does. |
| `author` | `string` | Yes | Author or organization. |
| `entryPoint` | `string` | Yes | Relative path to the plugin's main module. |
| `extensions` | `PluginExtensionPoint[]` | Yes | Array of extension point names this plugin registers. |

### PluginExtensionPoint

One of the 8 string literal types:

```typescript
type PluginExtensionPoint =
  | 'correlation-rule'
  | 'risk-factor'
  | 'recommendation-rule'
  | 'cli-command'
  | 'rest-endpoint'
  | 'persistence-provider'
  | 'analysis-stage'
  | 'output-formatter';
```

---

## Plugin Lifecycle

Plugins follow a strict lifecycle managed by the `PluginEngine`:

```
  ┌──────┐     ┌───────────┐     ┌──────────┐     ┌──────┐     ┌─────────┐
  │ LOAD │────▶│ INITIALIZE │────▶│ REGISTER │────▶│ RUN  │────▶│ DESTROY │
  └──────┘     └───────────┘     └──────────┘     └──────┘     └─────────┘
```

1. **LOAD** — The `PluginEngine.loadPlugin(plugin, config)` is called. The engine checks for duplicate plugin names and throws if the plugin is already loaded.

2. **INITIALIZE** — The engine creates a `PluginContext` for the plugin and calls `plugin.initialize(context)`. During initialization, the plugin should call context registration methods to register its extensions.

3. **REGISTER** — As the plugin calls `registerCorrelationRule()`, `registerRiskFactor()`, etc., the engine stores these extensions in their respective registries. Each registration is logged.

4. **RUN** — The plugin's extensions are now active. Correlation rules will be evaluated, risk factors will be applied, CLI commands will be available, etc.

5. **DESTROY** — When `PluginEngine.unloadPlugin(name)` is called, the engine calls `plugin.destroy()` and removes the plugin from the registry. Note: extension registrations are currently **not** automatically removed on destroy — see [Best Practices](#best-practices).

### Loading a Plugin

```typescript
import { PluginEngine } from './infrastructure/plugins/index.js';

const engine = new PluginEngine();

// Load with default config
await engine.loadPlugin(myPlugin);

// Load with custom config
await engine.loadPlugin(myPlugin, {
  threshold: 0.85,
  maxResults: 100,
});
```

### Unloading a Plugin

```typescript
await engine.unloadPlugin('com.example.my-plugin');
```

### Inspecting Loaded Plugins

```typescript
// Get a specific plugin
const entry = engine.getPlugin('com.example.my-plugin');
// entry.manifest, entry.instance, entry.enabled, entry.loadedAt

// List all loaded plugins
const plugins = engine.listPlugins();
for (const p of plugins) {
  console.log(`${p.manifest.name} v${p.manifest.version} — ${p.manifest.description}`);
}
```

---

## Plugin Context

The `PluginContext` is passed to `initialize()` and provides everything a plugin needs:

```typescript
interface PluginContext {
  logger: PluginLogger;
  config: Record<string, unknown>;
  registerCorrelationRule(rule: CorrelationRuleExtension): void;
  registerRiskFactor(factor: RiskFactorExtension): void;
  registerRecommendationRule(rule: RecommendationRuleExtension): void;
  registerCliCommand(command: CliCommandExtension): void;
  registerRestEndpoint(endpoint: RestEndpointExtension): void;
  registerPersistenceProvider(provider: PersistenceProviderExtension): void;
  registerAnalysisStage(stage: AnalysisStageExtension): void;
  registerOutputFormatter(formatter: OutputFormatterExtension): void;
}
```

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `logger` | `PluginLogger` | Namespaced logger instance for this plugin. |
| `config` | `Record<string, unknown>` | Plugin-specific configuration passed during `loadPlugin()`. |
| `registerCorrelationRule()` | method | Register a correlation rule extension. |
| `registerRiskFactor()` | method | Register a risk factor extension. |
| `registerRecommendationRule()` | method | Register a recommendation rule extension. |
| `registerCliCommand()` | method | Register a CLI command extension. |
| `registerRestEndpoint()` | method | Register a REST endpoint extension. |
| `registerPersistenceProvider()` | method | Register a persistence provider extension. |
| `registerAnalysisStage()` | method | Register an analysis stage extension. |
| `registerOutputFormatter()` | method | Register an output formatter extension. |

---

## Extension Points

### correlation-rule

Custom logic for determining whether two findings are correlated and how strongly.

```typescript
interface CorrelationRuleExtension {
  id: string;
  name: string;
  condition(a: Record<string, unknown>, b: Record<string, unknown>): boolean;
  scoreCalculator(a: Record<string, unknown>, b: Record<string, unknown>): number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique rule identifier |
| `name` | `string` | Human-readable rule name |
| `condition(a, b)` | `function` | Returns `true` if findings `a` and `b` are correlated by this rule |
| `scoreCalculator(a, b)` | `function` | Returns a numeric correlation score (0.0–1.0) for the pair |

**When it runs:** During the correlation pipeline stage, for each pair of findings.

**Example:** Correlate findings that share the same CVE:

```typescript
context.registerCorrelationRule({
  id: 'same-cve-correlation',
  name: 'Same CVE Correlation',
  condition: (a, b) => {
    const cvesA = a.cve as string[] ?? [];
    const cvesB = b.cve as string[] ?? [];
    return cvesA.some(cve => cvesB.includes(cve));
  },
  scoreCalculator: (a, b) => {
    const cvesA = new Set(a.cve as string[] ?? []);
    const cvesB = b.cve as string[] ?? [];
    const shared = cvesB.filter(c => cvesA.has(c)).length;
    return Math.min(shared / 3, 1.0); // Normalize: 3 shared CVEs = score 1.0
  },
});
```

---

### risk-factor

Custom risk scoring logic that contributes to the overall risk assessment.

```typescript
interface RiskFactorExtension {
  id: string;
  name: string;
  weight: number;
  calculate(finding: Record<string, unknown>): number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique factor identifier |
| `name` | `string` | Human-readable factor name |
| `weight` | `number` | Weight multiplier applied to the factor's score in the overall risk calculation |
| `calculate(finding)` | `function` | Returns a numeric score (0.0–1.0) for the given finding |

**When it runs:** During the risk assessment pipeline stage, for each finding.

**Example:** Score based on network exposure:

```typescript
context.registerRiskFactor({
  id: 'network-exposure-factor',
  name: 'Network Exposure Factor',
  weight: 0.3,
  calculate: (finding) => {
    const port = finding.port as number;
    const exposedPorts = [22, 80, 443, 3389, 8080];
    if (exposedPorts.includes(port)) return 0.8;
    if (port < 1024) return 0.5;
    return 0.1;
  },
});
```

---

### recommendation-rule

Custom logic for generating security recommendations based on findings and their risk assessments.

```typescript
interface RecommendationRuleExtension {
  id: string;
  name: string;
  appliesTo(finding: Record<string, unknown>): boolean;
  generate(finding: Record<string, unknown>, risk: Record<string, unknown>): RecommendationOutput;
}

interface RecommendationOutput {
  title: string;
  description: string;
  priority: string;
  actions: Array<{
    description: string;
    type: string;
    effort: string;
    riskReduction: number;
  }>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique rule identifier |
| `name` | `string` | Human-readable rule name |
| `appliesTo(finding)` | `function` | Returns `true` if this rule should generate a recommendation for the finding |
| `generate(finding, risk)` | `function` | Returns a `RecommendationOutput` for the finding/risk pair |

**When it runs:** During the recommendation pipeline stage.

**Example:** Recommend patching for critical CVEs:

```typescript
context.registerRecommendationRule({
  id: 'critical-cve-patch-rule',
  name: 'Critical CVE Patch Rule',
  appliesTo: (finding) => {
    const severity = finding.severity as string;
    const cves = finding.cve as string[] ?? [];
    return severity === 'critical' && cves.length > 0;
  },
  generate: (finding, risk) => ({
    title: `Patch critical vulnerability: ${(finding.cve as string[]).join(', ')}`,
    description: `Critical vulnerability detected on ${(finding.host as string)}. Immediate patching required.`,
    priority: 'critical',
    actions: [
      {
        description: `Apply security patch for ${(finding.cve as string[])[0]}`,
        type: 'patch',
        effort: 'low',
        riskReduction: 0.9,
      },
      {
        description: 'Verify patch application and run validation scan',
        type: 'validation',
        effort: 'medium',
        riskReduction: 0.1,
      },
    ],
  }),
});
```

---

### cli-command

Add custom commands to the SI Platform CLI.

```typescript
interface CliCommandExtension {
  name: string;
  description: string;
  arguments: Array<{ name: string; description: string; required: boolean }>;
  options: Array<{ flags: string; description: string; defaultValue?: unknown }>;
  execute(args: Record<string, unknown>): Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Command name (e.g., `"custom-scan"`) |
| `description` | `string` | Help text for the command |
| `arguments` | `Array` | Positional arguments |
| `arguments[].name` | `string` | Argument name |
| `arguments[].description` | `string` | Argument help text |
| `arguments[].required` | `boolean` | Whether the argument is required |
| `options` | `Array` | Named options/flags |
| `options[].flags` | `string` | Option flags (e.g., `"-v, --verbose"`) |
| `options[].description` | `string` | Option help text |
| `options[].defaultValue` | `unknown` | Default value if not provided |
| `execute(args)` | `async function` | Command handler. `args` contains parsed arguments and options. |

**Example:** Custom compliance check command:

```typescript
context.registerCliCommand({
  name: 'compliance-check',
  description: 'Run compliance checks against current findings',
  arguments: [
    { name: 'framework', description: 'Compliance framework (e.g., NIST, CIS)', required: true },
  ],
  options: [
    { flags: '-o, --output <file>', description: 'Output file path' },
    { flags: '--strict', description: 'Treat warnings as failures', defaultValue: false },
  ],
  execute: async (args) => {
    const framework = args.framework as string;
    const strict = args.strict as boolean;
    console.log(`Running ${framework} compliance check (strict: ${strict})...`);
    // ... compliance logic ...
  },
});
```

---

### rest-endpoint

Add custom REST API endpoints to the platform server.

```typescript
interface RestEndpointExtension {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (request: unknown, reply: unknown) => Promise<void>;
  schema?: Record<string, unknown>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `method` | `string` | HTTP method |
| `path` | `string` | URL path (e.g., `"/api/v1/plugins/custom-metrics"`) |
| `handler(request, reply)` | `async function` | Request handler. Signature matches Fastify's handler pattern. |
| `schema` | `Record<string, unknown>` | Optional request/response validation schema (Fastify-compatible). |

**Example:** Custom metrics endpoint:

```typescript
context.registerRestEndpoint({
  method: 'GET',
  path: '/api/v1/plugins/custom-metrics',
  handler: async (request: any, reply: any) => {
    const metrics = {
      customScansRun: 42,
      lastScanTime: new Date().toISOString(),
    };
    reply.send(metrics);
  },
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          customScansRun: { type: 'number' },
          lastScanTime: { type: 'string' },
        },
      },
    },
  },
});
```

---

### persistence-provider

Custom storage backends for persisting analysis results.

```typescript
interface PersistenceProviderExtension {
  type: string;
  initialize(config: Record<string, unknown>): Promise<void>;
  shutdown(): Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Provider type identifier (e.g., `"postgresql"`, `"mongodb"`) |
| `initialize(config)` | `async function` | Initialize the provider with its configuration. |
| `shutdown()` | `async function` | Gracefully shut down the provider and release resources. |

**Example:** PostgreSQL persistence provider:

```typescript
context.registerPersistenceProvider({
  type: 'postgresql',
  initialize: async (config) => {
    const host = config.host as string;
    const port = config.port as number;
    const database = config.database as string;
    console.log(`Connecting to PostgreSQL at ${host}:${port}/${database}...`);
    // ... connection logic ...
  },
  shutdown: async () => {
    console.log('Closing PostgreSQL connection...');
    // ... cleanup logic ...
  },
});
```

---

### analysis-stage

Custom processing stages that run in the analysis pipeline. Stages are **ordered** — the engine sorts them by the `order` field before execution.

```typescript
interface AnalysisStageExtension {
  name: string;
  order: number;
  process(input: Record<string, unknown>): Promise<Record<string, unknown>>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Stage name (must be unique across all plugins) |
| `order` | `number` | Execution order — lower numbers run first. Built-in stages: normalize(10), correlate(20), knowledge-graph(30), risk(40), attack-path(50), impact(60), recommendation(70), explain(80), report(90). Use values between these for custom insertion. |
| `process(input)` | `async function` | Process the pipeline data and return the modified result. |

**When it runs:** Between the built-in pipeline stages, ordered by the `order` field.

**Example:** Insert a custom enrichment stage between correlation and risk:

```typescript
context.registerAnalysisStage({
  name: 'threat-intel-enrichment',
  order: 25, // Between correlate(20) and knowledge-graph(30)
  process: async (input) => {
    const findings = input.findings as Record<string, unknown>[];
    for (const finding of findings) {
      // Enrich with threat intelligence data
      finding.threatIntel = {
        lastSeen: new Date().toISOString(),
        threatActors: ['APT29'],
        campaigns: ['Operation Something'],
      };
    }
    return input;
  },
});
```

---

### output-formatter

Custom output formats for findings, risks, and reports.

```typescript
interface OutputFormatterExtension {
  format: string;
  formatFindings(findings: unknown[]): string;
  formatRisks(risks: unknown[]): string;
  formatReport(report: unknown): string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `format` | `string` | Format identifier (e.g., `"sarif"`, `"junit"`, `"html"`) |
| `formatFindings(findings)` | `function` | Format an array of findings to a string |
| `formatRisks(risks)` | `function` | Format an array of risks to a string |
| `formatReport(report)` | `function` | Format a full report to a string |

**Example:** SARIF output formatter:

```typescript
context.registerOutputFormatter({
  format: 'sarif',
  formatFindings: (findings) => {
    const sarif = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [{
        results: findings.map((f: any) => ({
          ruleId: f.id,
          message: { text: f.description },
          level: f.severity === 'critical' ? 'error' : 'warning',
        })),
      }],
    };
    return JSON.stringify(sarif, null, 2);
  },
  formatRisks: (risks) => {
    return JSON.stringify({ risks }, null, 2);
  },
  formatReport: (report) => {
    return JSON.stringify(report, null, 2);
  },
});
```

---

## Plugin Logger

Each plugin receives a namespaced logger via `context.logger`:

```typescript
interface PluginLogger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}
```

Log output is prefixed with `[plugin:<name>]`:

```
[plugin:com.example.custom-correlation] Registered correlation rule: Same CVE Correlation
[plugin:com.example.custom-correlation] Debug: Checking pair f-001 ↔ f-002 { score: 0.85 }
```

**Usage:**

```typescript
async initialize(context: PluginContext): Promise<void> {
  context.logger.info('Initializing plugin', { version: this.manifest.version });
  context.logger.debug('Config received', { config: context.config });

  // ... register extensions ...

  context.logger.info('Plugin initialized successfully');
}
```

---

## Building a Plugin

### Step 1: Create the Plugin Class

```typescript
// my-plugin/index.ts
import type { SiPlugin, PluginManifest, PluginContext } from '../../src/infrastructure/plugins/types.js';

export class MyCustomPlugin implements SiPlugin {
  readonly manifest: PluginManifest = {
    name: 'com.example.my-custom-plugin',
    version: '1.0.0',
    description: 'Custom correlation and risk extensions',
    author: 'Security Team',
    entryPoint: './index.js',
    extensions: ['correlation-rule', 'risk-factor'],
  };

  async initialize(context: PluginContext): Promise<void> {
    context.logger.info('Initializing MyCustomPlugin');

    // Register your extensions here
    context.registerCorrelationRule({ /* ... */ });
    context.registerRiskFactor({ /* ... */ });

    context.logger.info('MyCustomPlugin initialized');
  }

  async destroy(): Promise<void> {
    // Clean up resources
  }
}
```

### Step 2: Export the Plugin

```typescript
// my-plugin/index.ts (at the bottom)
export default MyCustomPlugin;
```

### Step 3: Load the Plugin

```typescript
import { PluginEngine } from './infrastructure/plugins/index.js';
import { MyCustomPlugin } from './my-plugin/index.js';

const engine = new PluginEngine();
const plugin = new MyCustomPlugin();

await engine.loadPlugin(plugin, {
  // Plugin-specific config
  threshold: 0.7,
});
```

---

## Full Example Plugins

### Example 1: Network Topology Correlation Plugin

A plugin that correlates findings based on network proximity.

```typescript
import type { SiPlugin, PluginManifest, PluginContext, CorrelationRuleExtension, RiskFactorExtension } from '../../src/infrastructure/plugins/types.js';

export class NetworkTopologyPlugin implements SiPlugin {
  readonly manifest: PluginManifest = {
    name: 'com.example.network-topology',
    version: '1.0.0',
    description: 'Correlates findings based on network topology proximity',
    author: 'Network Security Team',
    entryPoint: './index.js',
    extensions: ['correlation-rule', 'risk-factor'],
  };

  async initialize(context: PluginContext): Promise<void> {
    const subnetThreshold = (context.config.subnetThreshold as number) ?? 0.5;

    context.registerCorrelationRule({
      id: 'network-proximity',
      name: 'Network Proximity Correlation',
      condition: (a, b) => {
        const hostA = a.host as string;
        const hostB = b.host as string;
        return hostA !== hostB && this.sameSubnet(hostA, hostB);
      },
      scoreCalculator: (a, b) => {
        const portA = a.port as number;
        const portB = b.port as number;
        let score = subnetThreshold;
        if (portA === portB) score += 0.2;
        if (a.severity === b.severity) score += 0.1;
        return Math.min(score, 1.0);
      },
    });

    context.registerRiskFactor({
      id: 'lateral-movement-risk',
      name: 'Lateral Movement Risk',
      weight: 0.4,
      calculate: (finding) => {
        const port = finding.port as number;
        const lateralPorts = [22, 3389, 5985, 5986, 445];
        return lateralPorts.includes(port) ? 0.9 : 0.1;
      },
    });

    context.logger.info('NetworkTopologyPlugin initialized', { subnetThreshold });
  }

  private sameSubnet(a: string, b: string): boolean {
    const subnetA = a.split('.').slice(0, 3).join('.');
    const subnetB = b.split('.').slice(0, 3).join('.');
    return subnetA === subnetB;
  }

  async destroy(): Promise<void> {
    // No resources to clean up
  }
}
```

### Example 2: Compliance Reporting Plugin

A plugin that adds a CLI command and output formatter for compliance reporting.

```typescript
import type { SiPlugin, PluginManifest, PluginContext, CliCommandExtension, OutputFormatterExtension } from '../../src/infrastructure/plugins/types.js';

export class CompliancePlugin implements SiPlugin {
  readonly manifest: PluginManifest = {
    name: 'com.example.compliance',
    version: '2.1.0',
    description: 'Compliance reporting for NIST 800-53 and CIS benchmarks',
    author: 'Compliance Team',
    entryPoint: './index.js',
    extensions: ['cli-command', 'output-formatter'],
  };

  async initialize(context: PluginContext): Promise<void> {
    context.registerCliCommand({
      name: 'compliance',
      description: 'Generate compliance report for a given framework',
      arguments: [
        { name: 'framework', description: 'Framework name (nist, cis, pci)', required: true },
      ],
      options: [
        { flags: '-r, --report <id>', description: 'Report ID to check against' },
        { flags: '--format <type>', description: 'Output format', defaultValue: 'table' },
      ],
      execute: async (args) => {
        const framework = args.framework as string;
        const reportId = args.report as string | undefined;
        context.logger.info(`Running ${framework} compliance check`, { reportId });
        // ... compliance logic ...
      },
    });

    context.registerOutputFormatter({
      format: 'compliance-csv',
      formatFindings: (findings) => {
        const header = 'ID,Severity,Host,Status,Control';
        const rows = findings.map((f: any) =>
          `${f.id},${f.severity},${f.host},${f.status},${f.control ?? 'N/A'}`
        );
        return [header, ...rows].join('\n');
      },
      formatRisks: (risks) => {
        return risks.map((r: any) => `${r.level}: ${r.description}`).join('\n');
      },
      formatReport: (report: any) => {
        return this.formatFindings(report.findings ?? []);
      },
    });

    context.logger.info('CompliancePlugin initialized');
  }

  private formatFindings(findings: any[]): string {
    const header = 'ID,Severity,Host,Status,Control';
    const rows = findings.map((f) =>
      `${f.id},${f.severity},${f.host},${f.status},${f.control ?? 'N/A'}`
    );
    return [header, ...rows].join('\n');
  }

  async destroy(): Promise<void> {}
}
```

### Example 3: Threat Intelligence Enrichment Plugin

A plugin that adds a custom analysis stage to enrich findings with threat intel data.

```typescript
import type { SiPlugin, PluginManifest, PluginContext, AnalysisStageExtension, RestEndpointExtension } from '../../src/infrastructure/plugins/types.js';

export class ThreatIntelPlugin implements SiPlugin {
  readonly manifest: PluginManifest = {
    name: 'com.example.threat-intel',
    version: '1.2.0',
    description: 'Enriches findings with threat intelligence data',
    author: 'Threat Intelligence Team',
    entryPoint: './index.js',
    extensions: ['analysis-stage', 'rest-endpoint'],
  };

  async initialize(context: PluginContext): Promise<void> {
    context.registerAnalysisStage({
      name: 'threat-intel-enrichment',
      order: 25, // Between correlate(20) and knowledge-graph(30)
      process: async (input) => {
        const findings = input.findings as Record<string, unknown>[];
        for (const finding of findings) {
          const cves = finding.cve as string[] ?? [];
          if (cves.length > 0) {
            finding.threatIntel = {
              enriched: true,
              actorCount: Math.floor(Math.random() * 5),
              exploitAvailable: Math.random() > 0.5,
              lastObserved: new Date().toISOString(),
            };
          }
        }
        return input;
      },
    });

    context.registerRestEndpoint({
      method: 'GET',
      path: '/api/v1/plugins/threat-intel/status',
      handler: async (request: any, reply: any) => {
        reply.send({ status: 'active', version: this.manifest.version });
      },
    });

    context.logger.info('ThreatIntelPlugin initialized');
  }

  async destroy(): Promise<void> {
    // Close any open connections to threat intel feeds
  }
}
```

---

## Testing Plugins

### Unit Testing

Use Vitest to test plugin extensions in isolation:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { MyCustomPlugin } from './index.js';

describe('MyCustomPlugin', () => {
  it('should register extensions during initialization', async () => {
    const plugin = new MyCustomPlugin();

    const registeredRules: any[] = [];
    const registeredFactors: any[] = [];

    const mockContext = {
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      config: {},
      registerCorrelationRule: (rule: any) => registeredRules.push(rule),
      registerRiskFactor: (factor: any) => registeredFactors.push(factor),
      registerRecommendationRule: vi.fn(),
      registerCliCommand: vi.fn(),
      registerRestEndpoint: vi.fn(),
      registerPersistenceProvider: vi.fn(),
      registerAnalysisStage: vi.fn(),
      registerOutputFormatter: vi.fn(),
    };

    await plugin.initialize(mockContext);

    expect(registeredRules).toHaveLength(1);
    expect(registeredRules[0].id).toBe('network-proximity');
    expect(registeredFactors).toHaveLength(1);
    expect(registeredFactors[0].id).toBe('lateral-movement-risk');
  });

  it('should detect same-subnet correlation', async () => {
    const plugin = new MyCustomPlugin();
    // ... test correlation rule condition ...
  });
});
```

### Integration Testing with PluginEngine

```typescript
import { PluginEngine } from '../../src/infrastructure/plugins/index.js';

describe('PluginEngine integration', () => {
  it('should load and list a plugin', async () => {
    const engine = new PluginEngine();
    const plugin = new MyCustomPlugin();

    await engine.loadPlugin(plugin);

    const plugins = engine.listPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].manifest.name).toBe('com.example.my-custom-plugin');

    const rules = engine.getCorrelationRules();
    expect(rules).toHaveLength(1);
  });

  it('should throw on duplicate plugin name', async () => {
    const engine = new PluginEngine();
    await engine.loadPlugin(new MyCustomPlugin());

    await expect(engine.loadPlugin(new MyCustomPlugin())).rejects.toThrow(
      'Plugin "com.example.my-custom-plugin" is already loaded'
    );
  });

  it('should unload a plugin and call destroy', async () => {
    const engine = new PluginEngine();
    const plugin = new MyCustomPlugin();
    const destroySpy = vi.spyOn(plugin, 'destroy');

    await engine.loadPlugin(plugin);
    await engine.unloadPlugin('com.example.my-custom-plugin');

    expect(destroySpy).toHaveBeenCalledOnce();
    expect(engine.listPlugins()).toHaveLength(0);
  });
});
```

---

## Best Practices

1. **Namespace your plugin name**: Use reverse-domain notation (e.g., `com.example.plugin-name`) to avoid collisions.

2. **Declare only the extensions you use**: The `manifest.extensions` array should exactly match the extension points your plugin registers. This helps the engine validate plugins.

3. **Keep `initialize` fast**: Avoid long-running operations in `initialize`. If you need to connect to external services, do so lazily or in the background.

4. **Implement `destroy` properly**: Close connections, clear timers, and release resources. A plugin that doesn't clean up can cause memory leaks.

5. **Use the logger**: Always use `context.logger` instead of `console.log`. The logger is namespaced and can be configured by the platform.

6. **Handle errors gracefully**: Extension functions should not throw unhandled exceptions. Catch errors, log them, and return safe defaults.

7. **Order analysis stages carefully**: Use the `order` field to position your stage relative to built-in stages. Document the expected order in your plugin's README.

8. **Make plugins configurable**: Accept configuration through the `context.config` object rather than hardcoding values. Provide sensible defaults.

9. **Test with mock contexts**: Always test plugins using a mock `PluginContext` to ensure isolation.

10. **Document your extensions**: Each extension should have clear documentation on what it does, when it triggers, and what inputs it expects.

---

## Troubleshooting

### Plugin fails to load with "already loaded" error

A plugin with the same `manifest.name` is already registered. Either unload the existing plugin first or change your plugin's name.

```typescript
await engine.unloadPlugin('com.example.my-plugin');
await engine.loadPlugin(myUpdatedPlugin);
```

### Extensions not being called

Verify that:
1. You called the correct registration method in `initialize`.
2. Your `manifest.extensions` array includes the extension point.
3. Your extension's condition/appliesTo function is returning `true` for the expected inputs.

### Plugin throws during initialization

The `PluginEngine.loadPlugin()` will propagate the error. Wrap your initialization logic in try/catch and use the logger:

```typescript
async initialize(context: PluginContext): Promise<void> {
  try {
    // ... setup ...
    context.registerCorrelationRule({ /* ... */ });
  } catch (err) {
    context.logger.error('Failed to initialize', { error: String(err) });
    throw err; // Re-throw to prevent partially-loaded plugins
  }
}
```

### Analysis stages not running in expected order

The engine sorts analysis stages by `order` ascending. Check that your `order` value is correct relative to the built-in stages:

| Built-in Stage | Order |
|---------------|-------|
| normalize | 10 |
| correlate | 20 |
| knowledge-graph | 30 |
| risk | 40 |
| attack-path | 50 |
| impact | 60 |
| recommendation | 70 |
| explain | 80 |
| report | 90 |

Use values like 15, 25, 35, etc. to insert custom stages between built-in ones.
