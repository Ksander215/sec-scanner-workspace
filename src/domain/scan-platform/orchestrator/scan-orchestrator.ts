/**
 * Scan Platform — Scan Orchestrator
 *
 * The central coordinator of all scanning activity.
 *
 * Responsibilities:
 * 1. Route scan requests to appropriate engines via Registry.
 * 2. Manage Scan Job lifecycle (create → start → complete/fail/cancel).
 * 3. Build ScanContext from Target + Profile.
 * 4. Execute engines concurrently, collecting results.
 * 5. Normalize engine findings into domain Finding objects.
 * 6. Emit domain events for observability.
 *
 * The Orchestrator is the ONLY component that calls engine.scan().
 * Engines never call each other; they only receive ScanContext.
 *
 * Design: No framework dependencies. Pure TypeScript. Testable.
 */

import type { ID, ScanCapability, ScanTriggerType, Timestamp, Severity, StringMap } from '../types/index.ts';
import { ScanJobStatus } from '../types/index.ts';
import type { ScanContext, ScanContextBuilder } from '../scan-context/scan-context.ts';
import type { ScanEnginePlugin, ScanEngineResult, ScanEngineFinding, ScanEngineEvent, EngineEventCallback, ScanEngineEventType } from '../plugin-api/scan-engine-plugin.ts';
import type { EngineRegistry, RegistryEventHandler } from '../registry/engine-registry.ts';
import { ScanJob, type ScanJobSnapshot } from '../scan-job/scan-job.ts';
import type { Finding, Evidence, EvidenceType, FindingLocation, FindingStatus } from '../models/finding.ts';
import type { ScanResult, EngineScanResult, SeverityBreakdown } from '../models/scan-result.ts';
import { computeSeverityBreakdown, toScanSummary } from '../models/scan-result.ts';
import {
  ScanJobNotFoundError,
  ScanJobTerminalError,
  NoCapableEngineError,
  EngineDisabledError,
} from '../errors/scan-errors.ts';

// ─── Finding Normalizer ────────────────────────────────────

/**
 * Converts a raw ScanEngineFinding into a domain Finding.
 * The Orchestrator is responsible for enrichment:
 * - Assigns global ID
 * - Sets targetId, scanJobId, detectedBy
 * - Computes hash for deduplication
 * - Normalizes severity enum
 * - Sets timestamps
 */
function normalizeFinding(
  raw: ScanEngineFinding,
  targetId: string,
  scanJobId: string,
  engineId: string,
  now: Timestamp,
): Finding {
  const location: FindingLocation = {
    url: raw.location?.url,
    method: raw.location?.method,
    parameter: raw.location?.parameter,
    path: raw.location?.path,
    line: raw.location?.line,
    column: raw.location?.column,
    filePath: raw.location?.filePath,
  };

  const evidence: Evidence[] = (raw.evidence ?? []).map((e, i) => ({
    id: `${scanJobId}-ev-${i}`,
    type: (e.type as EvidenceType) ?? 'log',
    content: e.content,
    mimeType: e.mimeType,
    description: e.description,
    capturedAt: now,
  }));

  return {
    id: `${scanJobId}-f-${generateShortId()}`,
    targetId,
    title: raw.title,
    description: raw.description ?? '',
    severity: normalizeSeverity(raw.severity),
    status: 'open' as FindingStatus,
    cweId: raw.cweId,
    owaspCategory: raw.owaspCategory,
    cvssScore: raw.cvssScore,
    cvssVector: raw.cvssVector,
    location,
    evidence,
    remediation: raw.remediation,
    references: raw.references ?? [],
    firstSeenAt: now,
    lastSeenAt: now,
    lastResolvedAt: null,
    resolutionCount: 0,
    confidence: raw.confidence ?? 0.8,
    hash: computeFindingHash(raw),
    detectedBy: engineId,
    scanJobId,
    tags: raw.tags ?? [],
    metadata: raw.templateId ? { templateId: raw.templateId } : undefined,
  };
}

function normalizeSeverity(raw: string): Severity {
  const lower = raw.toLowerCase();
  if (lower === 'critical') return 'critical' as Severity;
  if (lower === 'high') return 'high' as Severity;
  if (lower === 'medium' || lower === 'moderate' || lower === 'warning') return 'medium' as Severity;
  if (lower === 'low' || lower === 'info' || lower === 'informational') return 'low' as Severity;
  return 'info' as Severity;
}

function computeFindingHash(f: ScanEngineFinding): string {
  // Deterministic hash from title + location + severity.
  // Real implementation would use a proper hash function.
  const key = `${f.title}|${f.location?.url ?? ''}|${f.location?.parameter ?? ''}|${f.severity}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const chr = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function generateShortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function generateId(): ID {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Orchestrator Event ────────────────────────────────────

export interface OrchestratorEvent {
  readonly type: 'job_created' | 'job_started' | 'job_completed' | 'job_failed' | 'job_cancelled' | 'finding_detected' | 'progress';
  readonly jobId: ID;
  readonly timestamp: Timestamp;
  readonly data?: Record<string, unknown>;
}

export type OrchestratorEventHandler = (event: OrchestratorEvent) => void;

// ─── Scan Orchestrator ─────────────────────────────────────

/**
 * Central scan coordinator.
 *
 * Usage:
 *   const registry = new EngineRegistry();
 *   const orchestrator = new ScanOrchestrator(registry);
 *   orchestrator.start();
 *
 *   const job = await orchestrator.startScan({
 *     targetId: '...',
 *     targetUrl: 'https://example.com',
 *     targetName: 'Example',
 *     triggerType: 'manual',
 *     triggeredBy: 'user-123',
 *     requiredCapabilities: ['vulnerability_detection'],
 *     profileName: 'Full Scan',
 *   });
 */
export class ScanOrchestrator {
  private readonly registry: EngineRegistry;
  private readonly activeJobs = new Map<string, ScanJob>();
  private readonly abortControllers = new Map<string, AbortController>();
  private readonly eventHandlers: OrchestratorEventHandler[] = [];
  private _running = false;

  constructor(registry: EngineRegistry) {
    this.registry = registry;
  }

  // ─── Lifecycle ─────────────────────────────────────────

  /** Start the orchestrator. */
  start(): void {
    if (this._running) return;
    this._running = true;
  }

  /** Graceful shutdown — cancel all active jobs. */
  async stop(): Promise<void> {
    this._running = false;

    const cancellations = Array.from(this.activeJobs.values()).map(async (job) => {
      if (!job.isTerminal) {
        await this.cancelScan(job.id, 'Orchestrator shutdown');
      }
    });

    await Promise.allSettled(cancellations);
  }

  get isRunning(): boolean { return this._running; }

  // ─── Scan Execution ────────────────────────────────────

  /**
   * Start a new scan.
   *
   * @param params  Scan parameters.
   * @param engineIds  Optional specific engines to use. If omitted, selects by capabilities.
   * @returns  The created ScanJob (in Pending → Running state).
   */
  async startScan(
    params: {
      targetId: string;
      targetUrl: string;
      targetName: string;
      triggerType: ScanTriggerType;
      triggeredBy: string;
      requiredCapabilities: readonly ScanCapability[];
      profileName?: string;
      contextOverrides?: Partial<Omit<ScanContext, 'id' | 'scanJobId' | 'correlationId'>>;
    },
    engineIds?: string[],
  ): Promise<ScanJob> {
    if (!this._running) {
      throw new Error('Orchestrator is not started. Call start() first.');
    }

    const jobId = generateId();
    const correlationId = generateId();

    // Create the job.
    const job = new ScanJob({
      id: jobId,
      correlationId,
      targetId: params.targetId,
      targetUrl: params.targetUrl,
      targetName: params.targetName,
      triggerType: params.triggerType,
      triggeredBy: params.triggeredBy,
      requiredCapabilities: params.requiredCapabilities,
      profileName: params.profileName ?? 'default',
    });

    this.activeJobs.set(jobId, job);

    // Select engines.
    const selectedEngines = this.selectEngines(
      params.requiredCapabilities,
      engineIds,
    );

    // Create abort controller for cancellation.
    const abortController = new AbortController();
    this.abortControllers.set(jobId, abortController);

    // Build scan context.
    const context = this.buildContext(job, params, abortController.signal);

    // Transition to Running.
    const engineIdList = selectedEngines.map(e => e.id);
    job.start(engineIdList);

    this.emit({
      type: 'job_started',
      jobId,
      data: { engineIds: engineIdList, targetId: params.targetId },
    });

    // Execute engines concurrently.
    this.executeEngines(job, selectedEngines, context, abortController.signal)
      .then(() => {
        if (!job.isTerminal) {
          job.complete();
          this.emit({ type: 'job_completed', jobId, data: { findingsCount: job.findingsCount } });
        }
      })
      .catch((err) => {
        if (!job.isTerminal) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          const retryable = false;
          job.fail(message, 'ORCHESTRATOR_ERROR', retryable);
          this.emit({ type: 'job_failed', jobId, data: { error: message } });
        }
      });

    return job;
  }

  // ─── Cancellation ──────────────────────────────────────

  /** Cancel a running scan. */
  async cancelScan(jobId: string, reason?: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) throw new ScanJobNotFoundError(jobId);
    if (job.isTerminal) throw new ScanJobTerminalError(jobId, job.status);

    // Signal abort to all engines.
    const controller = this.abortControllers.get(jobId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(jobId);
    }

    // Cancel each engine.
    const engineIds = job.engineIds;
    const cancellations = engineIds.map(async (eid) => {
      try {
        const plugin = this.registry.getPlugin(eid);
        await plugin.cancel(jobId);
      } catch {
        // Engine cancellation errors are non-fatal.
      }
    });

    await Promise.allSettled(cancellations);
    job.cancel(reason);

    this.emit({ type: 'job_cancelled', jobId, data: { reason } });
  }

  // ─── Query ─────────────────────────────────────────────

  /** Get a job by ID. */
  getJob(jobId: string): ScanJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /** Get an immutable snapshot of a job. */
  getJobSnapshot(jobId: string): ScanJobSnapshot | undefined {
    return this.activeJobs.get(jobId)?.toSnapshot();
  }

  /** Get all active (non-terminal) jobs. */
  getActiveJobs(): ScanJobSnapshot[] {
    return Array.from(this.activeJobs.values())
      .filter(j => !j.isTerminal)
      .map(j => j.toSnapshot());
  }

  /** Get all jobs (including terminal). */
  getAllJobs(): ScanJobSnapshot[] {
    return Array.from(this.activeJobs.values())
      .map(j => j.toSnapshot());
  }

  /** Subscribe to orchestrator events. */
  onEvent(handler: OrchestratorEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const idx = this.eventHandlers.indexOf(handler);
      if (idx >= 0) this.eventHandlers.splice(idx, 1);
    };
  }

  // ─── Internal: Engine Selection ─────────────────────────

  private selectEngines(
    capabilities: readonly ScanCapability[],
    preferredEngineIds?: string[],
  ): ScanEnginePlugin[] {
    // If specific engines requested, use them (validate they exist and are enabled).
    if (preferredEngineIds && preferredEngineIds.length > 0) {
      const engines: ScanEnginePlugin[] = [];
      for (const eid of preferredEngineIds) {
        const plugin = this.registry.getPlugin(eid);
        if (!this.registry.isEnabled(eid)) {
          throw new EngineDisabledError(eid);
        }
        engines.push(plugin);
      }
      return engines;
    }

    // Otherwise, find by capabilities.
    const engines = this.registry.findByCapabilities(capabilities);
    if (engines.length === 0 && capabilities.length > 0) {
      throw new NoCapableEngineError(capabilities as unknown as string[]);
    }
    return engines;
  }

  // ─── Internal: Context Building ─────────────────────────

  private buildContext(
    job: ScanJob,
    params: {
      targetUrl: string;
      targetName: string;
      requiredCapabilities: readonly ScanCapability[];
      profileName?: string;
      contextOverrides?: Partial<Omit<ScanContext, 'id' | 'scanJobId' | 'correlationId'>>;
    },
    abortSignal: AbortSignal,
  ): ScanContext {
    // The real implementation would use ScanContextBuilder.
    // Here we construct directly for clarity.
    return Object.freeze({
      id: generateId(),
      scanJobId: job.id,
      correlationId: job.correlationId,
      targetId: job.targetId,
      targetUrl: params.targetUrl,
      targetName: params.targetName,
      authentication: { method: 'none' as const },
      headers: [],
      cookies: [],
      scope: {
        includePaths: [],
        excludePaths: [],
        maxDepth: 0,
        maxUrls: 0,
        followRedirects: true,
        maxRedirects: 10,
      },
      rateLimit: {
        requestsPerSecond: 10,
        delayMs: 100,
        concurrency: 5,
      },
      constraints: {
        maxDurationSeconds: 3600,
        maxFindings: 0,
        maxRequests: 0,
        stopOnCritical: false,
        maxDepth: 0,
        maxUrls: 0,
      },
      profileName: params.profileName ?? 'default',
      requiredCapabilities: [...params.requiredCapabilities],
      triggerType: job.triggerType,
      triggeredBy: job.triggeredBy,
      createdAt: new Date().toISOString(),
      metadata: {},
      abortSignal,
      ...params.contextOverrides,
    } as ScanContext);
  }

  // ─── Internal: Concurrent Engine Execution ──────────────

  private async executeEngines(
    job: ScanJob,
    engines: readonly ScanEnginePlugin[],
    context: ScanContext,
    abortSignal: AbortSignal,
  ): Promise<void> {
    const enginePromises = engines.map(async (engine) => {
      // Update job progress: engine starting.
      job.updateEngineProgress(engine.id, {
        engineName: engine.name,
        phase: 'initializing',
        progress: 0,
      });

      const engineStartTime = Date.now();
      let engineResult: ScanEngineResult | null = null;

      try {
        // Create event callback for this engine.
        const onEvent: EngineEventCallback = (event: ScanEngineEvent) => {
          this.handleEngineEvent(job, engine.id, event);
        };

        // Execute the engine scan.
        engineResult = await engine.scan(context, onEvent);

        // Record statistics.
        this.registry.recordScanExecuted(engine.id);
        if (engineResult.success) {
          const findings = (engineResult.findings ?? []).map(f =>
            normalizeFinding(f, job.targetId, job.id, engine.id, new Date().toISOString()),
          );
          job.addFindings(findings);
          this.registry.recordFindingsProduced(engine.id, findings.length);

          // Emit finding events.
          for (const finding of findings) {
            this.emit({
              type: 'finding_detected',
              jobId: job.id,
              data: {
                findingId: finding.id,
                title: finding.title,
                severity: finding.severity,
                location: finding.location.url ?? finding.location.path ?? '',
              },
            });
          }
        }

        // Mark engine finished.
        job.markEngineFinished(
          engine.id,
          engineResult.success ? undefined : engineResult.errorMessage,
        );

        // Update request count.
        job.incrementRequests(engineResult.requestsCount ?? 0);

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown engine error';
        job.markEngineFinished(engine.id, message);
      }
    });

    // Execute all engines concurrently.
    await Promise.allSettled(enginePromises);
  }

  // ─── Internal: Handle Engine Events ─────────────────────

  private handleEngineEvent(
    job: ScanJob,
    engineId: string,
    event: ScanEngineEvent,
  ): void {
    switch (event.type as string) {
      case 'phase_changed':
        job.updateEngineProgress(engineId, {
          phase: (event.data?.phase as string) ?? 'unknown',
        });
        break;

      case 'progress':
        job.updateEngineProgress(engineId, {
          progress: (event.data?.progress as number) ?? 0,
          requestsCount: (event.data?.requestsCount as number) ?? 0,
        });
        this.emit({
          type: 'progress',
          jobId: job.id,
          data: { engineId, progress: event.data?.progress },
        });
        break;

      case 'finding_detected':
        job.updateEngineProgress(engineId, {
          findingsCount: (job.engineProgress.get(engineId)?.findingsCount ?? 0) + 1,
        });
        break;

      case 'request_made':
        job.incrementRequests(1);
        break;

      case 'error':
        // Non-fatal engine error — log but don't fail the job.
        break;
    }
  }

  // ─── Internal: Event Emission ───────────────────────────

  private emit(event: OrchestratorEvent): void {
    for (const handler of this.eventHandlers) {
      try { handler(event); } catch { /* observer errors don't break orchestrator */ }
    }
  }
}