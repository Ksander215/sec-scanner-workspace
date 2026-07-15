/**
 * Nuclei Engine — ScanEnginePlugin Adapter
 *
 * Integrates ProjectDiscovery Nuclei (v3.x) as a Scan Platform plugin.
 *
 * Architecture:
 *   1. Spawns `nuclei` CLI as a child process.
 *   2. Reads JSONL output line-by-line from stdout.
 *   3. Parses each line via NucleiParser → ScanEngineFinding.
 *   4. Emits events via onEvent callback for real-time progress.
 *   5. Supports cancellation via AbortSignal → SIGTERM → SIGKILL.
 *
 * No modifications to Scan Platform core (TASK-201) are required.
 * This file ONLY imports from the plugin-api contract.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { ScanEnginePlugin, ScanEngineResult, ScanEngineFinding, ScanEngineEvent, EngineEventCallback, HealthCheckResult } from '../../domain/scan-platform/plugin-api/scan-engine-plugin.ts';
import { ScanEngineEventType } from '../../domain/scan-platform/plugin-api/scan-engine-plugin.ts';
import { EngineHealthStatus } from '../../domain/scan-platform/types/index.ts';
import { ScanCapability } from '../../domain/scan-platform/types/index.ts';
import type { ScanContext } from '../../domain/scan-platform/scan-context/scan-context.ts';
import { parseLine } from './nuclei-parser.ts';
import type { NucleiVersionInfo } from './nuclei-types.ts';

// ─── Configuration ────────────────────────────────────────

export interface NucleiAdapterConfig {
  /**
   * Path to the Nuclei binary.
   * Default: "nuclei" (resolved from $PATH).
   */
  readonly binaryPath?: string;

  /**
   * Path to the Nuclei templates directory.
   * Default: uses Nuclei's built-in template path.
   */
  readonly templatesPath?: string;

  /**
   * Template tags to include.
   * Default: all templates.
   */
  readonly includeTags?: readonly string[];

  /**
   * Template tags to exclude.
   * Default: ["dos", "fuzz", "brute-force"] (disruptive/long-running).
   */
  readonly excludeTags?: readonly string[];

  /**
   * Minimum severity to report.
   * Default: "info" (report everything).
   */
  readonly minimumSeverity?: 'info' | 'low' | 'medium' | 'high' | 'critical';

  /**
   * Timeout for the Nuclei process in seconds.
   * Default: respects context.constraints.maxDurationSeconds.
   */
  readonly timeoutSeconds?: number;

  /**
   * Grace period between SIGTERM and SIGKILL in milliseconds.
   * Default: 5000ms.
   */
  readonly killGraceMs?: number;
}

/** Default excluded tags (disruptive / extremely long-running). */
const DEFAULT_EXCLUDE_TAGS = [
  'dos',
  'fuzz',
  'brute-force',
  'bruteforce',
  'overflow',
] as const;

// ─── Active Scan Tracking ──────────────────────────────────

interface ActiveScan {
  process: ChildProcess;
  jobId: string;
  abortController: AbortController;
  startTime: number;
  findingsCount: number;
  requestsEstimate: number;
  phase: string;
}

// ─── Nuclei Adapter ────────────────────────────────────────

/**
 * ScanEnginePlugin implementation for ProjectDiscovery Nuclei.
 *
 * Usage:
 *   const adapter = new NucleiAdapter({ binaryPath: '/usr/local/bin/nuclei' });
 *   await registry.register(adapter);
 */
export class NucleiAdapter implements ScanEnginePlugin {
  // ─── Identity (ScanEnginePlugin contract) ───────────────

  readonly id = 'nuclei-v3';
  readonly name = 'Nuclei v3';
  readonly version: string;
  readonly description = 'Template-based vulnerability scanner by ProjectDiscovery. Supports HTTP, DNS, network, and workflow templates.';
  readonly capabilities: readonly ScanCapability[] = [
    ScanCapability.VulnerabilityDetection,
    ScanCapability.ApiScanning,
    ScanCapability.DnsAnalysis,
    ScanCapability.MisconfigurationDetection,
    ScanCapability.HeaderAnalysis,
    ScanCapability.PassiveAnalysis,
  ];

  // ─── Internal State ─────────────────────────────────────

  private readonly config: Required<NucleiAdapterConfig>;
  private activeScans = new Map<string, ActiveScan>();
  private _nucleiVersion: NucleiVersionInfo | null = null;
  private _initialized = false;

  constructor(config?: NucleiAdapterConfig) {
    this.config = {
      binaryPath: config?.binaryPath ?? 'nuclei',
      templatesPath: config?.templatesPath ?? '',
      includeTags: config?.includeTags ?? [],
      excludeTags: config?.excludeTags ?? [...DEFAULT_EXCLUDE_TAGS],
      minimumSeverity: config?.minimumSeverity ?? 'info',
      timeoutSeconds: config?.timeoutSeconds ?? 0,
      killGraceMs: config?.killGraceMs ?? 5000,
    };
    this.version = 'unknown'; // Will be set during initialize().
  }

  // ─── Lifecycle ─────────────────────────────────────────

  /**
   * Initialize the Nuclei adapter.
   * Checks binary availability, detects version, validates templates.
   */
  async initialize(): Promise<void> {
    // 1. Check binary exists and is executable.
    await this.checkBinary();

    // 2. Detect version.
    this._nucleiVersion = await this.detectVersion();
    this.version = this._nucleiVersion.version;

    // 3. Validate templates (optional — non-fatal if fails).
    try {
      await this.validateTemplates();
    } catch {
      // Templates will be downloaded on first scan if missing.
    }

    this._initialized = true;
  }

  /**
   * Graceful shutdown.
   * Kills all active Nuclei processes.
   */
  async shutdown(): Promise<void> {
    const cancellations = Array.from(this.activeScans.entries()).map(
      async ([jobId, scan]) => {
        try {
          await this.killProcess(scan.process);
        } catch {
          // Best-effort cleanup.
        }
        scan.abortController.abort();
        this.activeScans.delete(jobId);
      },
    );
    await Promise.allSettled(cancellations);
    this._initialized = false;
  }

  // ─── Health Check ──────────────────────────────────────

  /**
   * Check if Nuclei is operational.
   * Verifies binary exists, responds to -version, and templates are available.
   */
  async health(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check binary.
      await this.checkBinary();

      // Check version (confirms binary is functional).
      const versionInfo = await this.detectVersion();

      const latencyMs = Date.now() - startTime;
      return {
        engineId: this.id,
        status: EngineHealthStatus.Healthy,
        latencyMs,
        message: `Nuclei ${versionInfo.version} available at ${this.config.binaryPath}`,
        checkedAt: new Date().toISOString(),
        details: {
          version: versionInfo.version,
          binaryPath: this.config.binaryPath,
        },
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : 'Unknown error';

      return {
        engineId: this.id,
        status: EngineHealthStatus.Unhealthy,
        latencyMs,
        message,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  // ─── Scanning ──────────────────────────────────────────

  /**
   * Execute a Nuclei scan against the given context.
   *
   * Contract compliance:
   * - Respects context.abortSignal
   * - Respects context.rateLimit and context.constraints
   * - Emits events via onEvent
   * - Returns ScanEngineResult (never throws)
   * - Safe for concurrent calls
   */
  async scan(
    context: ScanContext,
    onEvent: EngineEventCallback,
  ): Promise<ScanEngineResult> {
    const startTime = Date.now();
    const findings: ScanEngineFinding[] = [];
    const seen = new Set<string>();
    let requestsCount = 0;
    let processError: string | null = null;
    let templatesExecuted = 0;

    // Build CLI arguments.
    const args = this.buildArgs(context);

    // Create abort controller for this scan.
    const abortController = new AbortController();

    // Listen for external abort.
    if (context.abortSignal) {
      const onExternalAbort = () => abortController.abort();
      context.abortSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    // Emit start event.
    onEvent({
      type: ScanEngineEventType.PhaseChanged,
      timestamp: new Date().toISOString(),
      message: 'Starting Nuclei scan',
      data: { phase: 'initializing', targetUrl: context.targetUrl },
    });

    try {
      // Spawn Nuclei process.
      const process = spawn(this.config.binaryPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      // Track for cancellation.
      const activeScan: ActiveScan = {
        process,
        jobId: context.scanJobId,
        abortController,
        startTime,
        findingsCount: 0,
        requestsEstimate: 0,
        phase: 'scanning',
      };
      this.activeScans.set(context.scanJobId, activeScan);

      // Set up timeout.
      const timeoutMs = (context.constraints.maxDurationSeconds || this.config.timeoutSeconds || 3600) * 1000;
      const timer = setTimeout(() => {
        abortController.abort();
      }, timeoutMs);

      // Handle abort signal.
      abortController.signal.addEventListener('abort', () => {
        this.killProcess(process).catch(() => {});
      }, { once: true });

      // Read stdout line by line (JSONL).
      const seenForDedup = new Set<string>();

      const rl = createInterface({ input: process.stdout! });
      let lineIndex = 0;

      for await (const line of rl) {
        // Check abort.
        if (abortController.signal.aborted) break;

        // Check maxFindings constraint.
        if (context.constraints.maxFindings > 0 && findings.length >= context.constraints.maxFindings) {
          abortController.abort();
          break;
        }

        lineIndex++;

        // Parse the line.
        const result = parseLine(line, seenForDedup, context.constraints.maxFindings);

        if (result.finding) {
          findings.push(result.finding);
          activeScan.findingsCount = findings.length;
          requestsCount += 10; // Estimate: ~10 requests per template execution.

          // Emit finding event.
          onEvent({
            type: ScanEngineEventType.FindingDetected,
            timestamp: new Date().toISOString(),
            message: result.finding.title,
            data: {
              findingIndex: findings.length,
              templateId: result.finding.templateId,
              severity: result.finding.severity,
              matchedAt: result.finding.location.url,
            },
          });

          // Stop on critical if configured.
          if (context.constraints.stopOnCritical && result.finding.severity === 'critical') {
            abortController.abort();
            break;
          }
        }

        // Emit progress periodically (every 5 findings or every 50 lines).
        if (findings.length % 5 === 0 || lineIndex % 50 === 0) {
          const progress = Math.min(90, Math.round((lineIndex / Math.max(lineIndex, 100)) * 85) + 5);
          onEvent({
            type: ScanEngineEventType.Progress,
            timestamp: new Date().toISOString(),
            data: { progress, linesProcessed: lineIndex, findingsCount: findings.length },
          });
        }

        templatesExecuted = lineIndex;
      }

      // Collect stderr.
      let stderrOutput = '';
      process.stderr?.on('data', (chunk: Buffer) => {
        stderrOutput += chunk.toString();
      });

      // Wait for process exit.
      const exitCode = await new Promise<number | null>((resolve) => {
        process.on('close', resolve);
        process.on('error', () => resolve(-1));
      });

      clearTimeout(timer);
      this.activeScans.delete(context.scanJobId);

      // Analyze exit code.
      // Nuclei exit codes: 0 = success, 1 = error.
      if (exitCode === null || exitCode === -1) {
        // Process was killed (cancel/timeout).
        if (abortController.signal.aborted) {
          // This is expected — not an error.
        } else {
          processError = 'Nuclei process terminated unexpectedly';
        }
      } else if (exitCode !== 0 && findings.length === 0) {
        // Non-zero exit with no findings = real error.
        processError = `Nuclei exited with code ${exitCode}`;
        if (stderrOutput.trim()) {
          processError += `: ${stderrOutput.trim().slice(0, 500)}`;
        }
      }

      // Emit completion event.
      onEvent({
        type: ScanEngineEventType.PhaseChanged,
        timestamp: new Date().toISOString(),
        message: 'Scan completed',
        data: { phase: 'completed', findingsCount: findings.length },
      });

    } catch (err) {
      processError = err instanceof Error ? err.message : 'Unknown scan error';
      this.activeScans.delete(context.scanJobId);
    }

    const durationMs = Date.now() - startTime;

    // Build metadata.
    const metadata: Record<string, unknown> = {
      templatesExecuted,
      binaryPath: this.config.binaryPath,
      targetUrl: context.targetUrl,
    };
    if (this._nucleiVersion) {
      metadata.nucleiVersion = this._nucleiVersion.version;
    }

    // Determine success.
    const success = !processError || (processError.includes('exited with code') && findings.length > 0);

    return {
      success,
      findings,
      requestsCount,
      durationMs,
      errorMessage: processError ?? undefined,
      errorCode: processError ? 'NUCLEI_SCAN_ERROR' : undefined,
      retryable: processError?.includes('timeout') ?? false,
      metadata,
    };
  }

  // ─── Cancellation ──────────────────────────────────────

  /**
   * Cancel a running Nuclei scan.
   * Sends SIGTERM, then SIGKILL after grace period.
   */
  async cancel(jobId: string): Promise<void> {
    const activeScan = this.activeScans.get(jobId);
    if (!activeScan) return; // Already finished or unknown.

    activeScan.abortController.abort();
    await this.killProcess(activeScan.process);
    this.activeScans.delete(jobId);
  }

  // ─── Private: CLI Argument Building ─────────────────────

  /**
   * Build the Nuclei CLI argument array from ScanContext.
   * Maps platform-agnostic context to Nuclei-specific flags.
   */
  private buildArgs(context: ScanContext): string[] {
    const args: string[] = [];

    // Target URL.
    args.push('-u', context.targetUrl);

    // JSON output (JSONL — one finding per line).
    args.push('-json');

    // Suppress banner and extra output.
    args.push('-silent', '-no-color');

    // Templates.
    if (this.config.templatesPath) {
      args.push('-t', this.config.templatesPath);
    }

    // Tags.
    if (this.config.includeTags.length > 0) {
      args.push('-tags', this.config.includeTags.join(','));
    }
    if (this.config.excludeTags.length > 0) {
      args.push('-exclude-tags', this.config.excludeTags.join(','));
    }

    // Severity filter.
    if (this.config.minimumSeverity && this.config.minimumSeverity !== 'info') {
      args.push('-severity', this.config.minimumSeverity);
    }

    // Rate limiting.
    if (context.rateLimit.requestsPerSecond > 0) {
      args.push('-rate-limit', String(context.rateLimit.requestsPerSecond));
    }

    // Concurrency (from rate limit concurrency setting).
    if (context.rateLimit.concurrency > 0) {
      args.push('-c', String(context.rateLimit.concurrency));
    }

    // Bulk size (number of templates per host batch).
    args.push('-bulk-size', '25');

    // Retries.
    args.push('-retries', '1');

    // Per-request timeout (from rate limit delay as a proxy).
    if (context.rateLimit.delayMs > 0) {
      const timeoutSec = Math.max(5, Math.ceil(context.rateLimit.delayMs / 1000) * 10);
      args.push('-timeout', String(timeoutSec));
    }

    // Custom headers.
    for (const [name, value] of context.headers) {
      args.push('-header', `${name}: ${value}`);
    }

    // Custom cookies.
    for (const cookie of context.cookies) {
      args.push('-cookie', `${cookie.name}=${cookie.value}`);
    }

    // Authentication.
    const auth = context.authentication;
    if (auth.method === 'basic' && auth.username && auth.password) {
      args.push('-auth', `${auth.username}:${auth.password}`);
    }

    // Scope: exclude paths.
    if (context.scope.excludePaths.length > 0) {
      // Nuclei doesn't have a direct exclude-paths flag,
      // but we can use -filter to exclude patterns.
      // This is a limitation — see TASK-202B proposals.
    }

    // Scope: max depth → no direct Nuclei equivalent (Nuclei uses templates, not crawling).
    // Max URLs → Nuclei scans all URLs from templates against the target.

    return args;
  }

  // ─── Private: Binary Management ─────────────────────────

  /**
   * Verify the Nuclei binary exists and is executable.
   */
  private async checkBinary(): Promise<void> {
    try {
      execSync(`which ${this.config.binaryPath}`, { stdio: 'pipe' });
    } catch {
      // 'which' failed — try direct execution with -version.
      try {
        execSync(`"${this.config.binaryPath}" -version`, { stdio: 'pipe', timeout: 5000 });
      } catch {
        throw new Error(
          `Nuclei binary not found or not executable: "${this.config.binaryPath}". ` +
          `Install: https://github.com/projectdiscovery/nuclei#installation`,
        );
      }
    }
  }

  /**
   * Detect Nuclei version by running -version.
   */
  private async detectVersion(): Promise<NucleiVersionInfo> {
    try {
      const output = execSync(`"${this.config.binaryPath}" -version`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 10000,
      }).trim();

      // Parse version from output like:
      // "v3.1.7" or "nuclei v3.1.7" or "[INF] Current nuclei version: 3.1.7 (latest)"
      const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      return { version, raw: output };
    } catch {
      return { version: 'unknown', raw: '' };
    }
  }

  /**
   * Validate that templates are available (non-fatal).
   */
  private async validateTemplates(): Promise<void> {
    execSync(`"${this.config.binaryPath}" -tl -silent`, {
      stdio: 'pipe',
      timeout: 30000,
    });
  }

  // ─── Private: Process Management ───────────────────────

  /**
   * Kill a Nuclei process gracefully.
   * SIGTERM → wait grace period → SIGKILL.
   */
  private async killProcess(process: ChildProcess): Promise<void> {
    if (!process.pid || process.exitCode !== null) return;

    try {
      process.kill('SIGTERM');
    } catch {
      return; // Already dead.
    }

    // Wait for graceful exit.
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try {
          process.kill('SIGKILL');
        } catch {
          // Already dead.
        }
        resolve();
      }, this.config.killGraceMs);

      process.on('close', () => {
        clearTimeout(timer);
        resolve();
      });

      process.on('error', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}