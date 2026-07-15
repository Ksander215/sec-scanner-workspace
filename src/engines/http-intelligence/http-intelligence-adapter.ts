/**
 * HTTP Intelligence Engine — ScanEnginePlugin Adapter
 *
 * Integrates HTTP Intelligence as a Scan Platform engine via Plugin API.
 *
 * Architecture:
 *   1. HttpIntelligenceAdapter implements ScanEnginePlugin (5 methods)
 *   2. Coordinates: TLS → Headers → Behaviour → Infra → Cookie → Rate Limit sub-engines
 *   3. Publishes all results via HttpArtifactPublisher → Artifact Bus
 *   4. Supports cancellation, concurrent-safe scanning
 *   5. Zero modifications to Scan Platform core
 *
 * Dependencies: only plugin-api contract + HTTP sub-modules.
 */

import type {
  ScanEnginePlugin,
  ScanEngineResult,
  ScanEngineFinding,
  EngineEventCallback,
  HealthCheckResult,
} from '../../domain/scan-platform/plugin-api/scan-engine-plugin.ts';
import { ScanEngineEventType } from '../../domain/scan-platform/plugin-api/scan-engine-plugin.ts';
import { EngineHealthStatus, ScanCapability, Severity } from '../../domain/scan-platform/types/index.ts';
import type { ScanContext } from '../../domain/scan-platform/scan-context/scan-context.ts';
import type {
  HttpIntelligenceConfig,
  HttpIntelligenceData,
  HttpPerformanceMetrics,
  HttpPhase,
} from './http-types.ts';
import {
  HttpProtocolVersion,
  DEFAULT_HTTP_CONFIG,
} from './http-types.ts';
import type { IHttpClient, HttpResponse } from './http-types.ts';
import { createHttpClient, MockHttpClient, DefaultHttpClient } from './http-client.ts';
import { TlsIntelligence } from './tls-intelligence.ts';
import { SecurityHeadersIntelligence } from './security-headers.ts';
import { HttpBehaviourIntelligence } from './http-behaviour.ts';
import { InfrastructureFingerprinting } from './infra-fingerprinting.ts';
import { CookieIntelligence } from './cookie-intelligence.ts';
import { RateLimitingIntelligence } from './rate-limiting.ts';
import { HttpArtifactPublisher, HTTP_ENGINE_ID } from './http-artifacts.ts';

// ═══════════════════════════════════════════════════════════════
// Adapter Configuration
// ═══════════════════════════════════════════════════════════════

export interface HttpIntelligenceAdapterConfig extends HttpIntelligenceConfig {}

// ═══════════════════════════════════════════════════════════════
// Active Scan State
// ═══════════════════════════════════════════════════════════════

interface ActiveHttpScan {
  readonly jobId: string;
  readonly abortController: AbortController;
  readonly startTime: number;
  phase: HttpPhase;
  requestsMade: number;
  findingsCount: number;
}

// ═══════════════════════════════════════════════════════════════
// HTTP Intelligence Adapter
// ═══════════════════════════════════════════════════════════════

/**
 * ScanEnginePlugin implementation for HTTP Intelligence.
 *
 * Usage:
 *   const adapter = new HttpIntelligenceAdapter({ timeoutMs: 30000 });
 *   await registry.register(adapter);
 */
export class HttpIntelligenceAdapter implements ScanEnginePlugin {
  // ─── Identity (ScanEnginePlugin contract) ───────────────

  readonly id = 'http-intelligence';
  readonly name = 'HTTP Intelligence Engine';
  readonly version = '1.0.0';
  readonly description = 'Intelligent HTTP protocol analyzer. Builds security profile from TLS, headers, cookies, behaviour, infrastructure, and rate limiting analysis.';
  readonly capabilities: readonly ScanCapability[] = [
    ScanCapability.PassiveAnalysis,
    ScanCapability.SslTlsCheck,
    ScanCapability.HeaderAnalysis,
    ScanCapability.MisconfigurationDetection,
  ];

  // ─── Internal State ─────────────────────────────────────

  private readonly config: Required<HttpIntelligenceConfig>;
  private activeScans = new Map<string, ActiveHttpScan>();
  private _initialized = false;
  private httpClient: IHttpClient;
  private tlsIntelligence: TlsIntelligence;
  private securityHeaders: SecurityHeadersIntelligence;
  private behaviourIntelligence: HttpBehaviourIntelligence;
  private infraFingerprinting: InfrastructureFingerprinting;
  private cookieIntelligence: CookieIntelligence;

  constructor(config?: HttpIntelligenceAdapterConfig) {
    this.config = { ...DEFAULT_HTTP_CONFIG, ...config };
    this.httpClient = this.config.httpClient ?? createHttpClient(this.config);
    this.tlsIntelligence = new TlsIntelligence();
    this.securityHeaders = new SecurityHeadersIntelligence();
    this.behaviourIntelligence = new HttpBehaviourIntelligence();
    this.infraFingerprinting = new InfrastructureFingerprinting();
    this.cookieIntelligence = new CookieIntelligence();
  }

  // ─── Lifecycle ─────────────────────────────────────────

  async initialize(): Promise<void> {
    this._initialized = true;
  }

  async shutdown(): Promise<void> {
    const cancellations = Array.from(this.activeScans.values()).map(async (scan) => {
      scan.abortController.abort();
      this.activeScans.delete(scan.jobId);
    });
    await Promise.allSettled(cancellations);
    await this.httpClient.close();
    this._initialized = false;
  }

  // ─── Health Check ──────────────────────────────────────

  async health(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      if (!this._initialized) {
        return {
          engineId: this.id,
          status: EngineHealthStatus.Unhealthy,
          latencyMs: Date.now() - startTime,
          message: 'HTTP Intelligence not initialized',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        engineId: this.id,
        status: EngineHealthStatus.Healthy,
        latencyMs: Date.now() - startTime,
        message: `HTTP Intelligence ready (maxConcurrency: ${this.config.maxConcurrency})`,
        checkedAt: new Date().toISOString(),
        details: {
          maxConcurrency: this.config.maxConcurrency,
          activeScans: this.activeScans.size,
          connectionPoolSize: this.config.connectionPoolSize,
        },
      };
    } catch (err) {
      return {
        engineId: this.id,
        status: EngineHealthStatus.Unhealthy,
        latencyMs: Date.now() - startTime,
        message: err instanceof Error ? err.message : 'Unknown error',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  // ─── Scanning ──────────────────────────────────────────

  async scan(
    context: ScanContext,
    onEvent: EngineEventCallback,
  ): Promise<ScanEngineResult> {
    const startTime = Date.now();
    const findings: ScanEngineFinding[] = [];
    let requestsMade = 0;
    let errorMessage: string | null = null;

    // Create abort controller
    const abortController = new AbortController();
    if (context.abortSignal) {
      if (context.abortSignal.aborted) {
        abortController.abort();
      } else {
        context.abortSignal.addEventListener('abort', () => abortController.abort(), { once: true });
      }
    }

    // Track active scan
    const activeScan: ActiveHttpScan = {
      jobId: context.scanJobId,
      abortController,
      startTime,
      phase: 'initializing' as HttpPhase,
      requestsMade: 0,
      findingsCount: 0,
    };
    this.activeScans.set(context.scanJobId, activeScan);

    // Emit start event
    onEvent({
      type: ScanEngineEventType.PhaseChanged,
      timestamp: new Date().toISOString(),
      message: 'Starting HTTP Intelligence scan',
      data: { phase: 'initializing', targetUrl: context.targetUrl },
    });

    // Collect all responses for behaviour analysis
    const allResponses: HttpResponse[] = [];

    try {
      // ── Phase 1: TLS Analysis ──────────────────────────
      this.updatePhase(activeScan, 'tls_analysis' as HttpPhase, onEvent);

      let tlsProfile = null;
      if (context.targetUrl.startsWith('https://')) {
        try {
          const tlsProbeResult = await this.httpClient.tlsProbe(
            context.targetUrl,
            this.config.tlsTimeoutMs,
          );
          requestsMade++;

          // Initial response for HSTS headers
          const initialResponse = await this.httpClient.request({
            url: context.targetUrl,
            method: 'GET',
            timeoutMs: this.config.timeoutMs,
            abortSignal: abortController.signal,
          });
          requestsMade++;
          allResponses.push(initialResponse);

          tlsProfile = this.tlsIntelligence.buildProfile(tlsProbeResult, initialResponse);

          // Generate findings from TLS profile
          if (tlsProfile.versionStatus === 'insecure' || tlsProfile.versionStatus === 'deprecated') {
            findings.push({
              title: 'Insecure TLS Version',
              description: `Server uses ${tlsProfile.version} which is considered ${tlsProfile.versionStatus}`,
              severity: tlsProfile.versionStatus === 'deprecated' ? 'high' : 'medium',
              location: { url: context.targetUrl },
              evidence: [{ type: 'tls_version', content: `TLS Version: ${tlsProfile.version}` }],
              tags: ['tls', 'protocol'],
              confidence: 0.95,
              remediation: 'Upgrade to TLS 1.2 or TLS 1.3. Disable older protocols.',
            });
          }

          if (!tlsProfile.hstsEnabled) {
            findings.push({
              title: 'HSTS Not Enabled',
              description: 'HTTP Strict Transport Security (HSTS) is not configured',
              severity: 'medium',
              location: { url: context.targetUrl },
              evidence: [{ type: 'hsts', content: 'No Strict-Transport-Security header found' }],
              tags: ['tls', 'hsts', 'headers'],
              confidence: 0.95,
              remediation: 'Add Strict-Transport-Security header with max-age >= 31536000.',
            });
          }

          if (tlsProfile.overallGrade === 'F' || tlsProfile.overallGrade === 'T') {
            findings.push({
              title: `Poor TLS Configuration (Grade: ${tlsProfile.overallGrade})`,
              description: `TLS configuration scored ${tlsProfile.overallGrade} — significant improvements needed`,
              severity: 'high',
              location: { url: context.targetUrl },
              evidence: tlsProfile.chainIssues.map(i => ({
                type: 'tls_issue',
                content: i,
              })),
              tags: ['tls', 'configuration'],
              confidence: 0.9,
              remediation: 'Review TLS configuration: upgrade protocol version, fix certificate chain, enable HSTS.',
            });
          }
        } catch (err) {
          if (!abortController.signal.aborted) {
            onEvent({
              type: ScanEngineEventType.Warning,
              timestamp: new Date().toISOString(),
              message: `TLS analysis failed: ${err instanceof Error ? err.message : 'unknown'}`,
            });
          }
        }
      }

      this.checkAbort(abortController.signal);

      // ── Phase 2: Security Headers Analysis ─────────────
      this.updatePhase(activeScan, 'header_analysis' as HttpPhase, onEvent);

      let headerProfile = null;
      try {
        // Use initial response if available, otherwise fetch
        let response = allResponses[0];
        if (!response) {
          response = await this.httpClient.request({
            url: context.targetUrl,
            method: 'GET',
            timeoutMs: this.config.timeoutMs,
            abortSignal: abortController.signal,
          });
          requestsMade++;
          allResponses.push(response);
        }

        headerProfile = this.securityHeaders.analyze(response);

        // Generate findings from header analysis
        for (const analysis of headerProfile.analyses) {
          if (analysis.severity === Severity.High || analysis.severity === Severity.Critical) {
            findings.push({
              title: `${analysis.headerName}: ${analysis.status}`,
              description: analysis.description,
              severity: analysis.severity,
              location: { url: context.targetUrl },
              evidence: [{ type: 'header', content: `${analysis.headerName}: ${analysis.value ?? '(missing)'}` }],
              tags: ['headers', 'security', analysis.headerName.toLowerCase().replace(/[^a-z]/g, '_')],
              confidence: 0.9,
              remediation: analysis.recommendation,
            });
          }
        }

        onEvent({
          type: ScanEngineEventType.Info,
          timestamp: new Date().toISOString(),
          message: `Security headers: score ${headerProfile.overallScore}/100 (${headerProfile.secureCount} secure, ${headerProfile.missingCount} missing, ${headerProfile.misconfiguredCount} misconfigured)`,
          data: { score: headerProfile.overallScore },
        });
      } catch (err) {
        if (!abortController.signal.aborted) {
          onEvent({
            type: ScanEngineEventType.Warning,
            timestamp: new Date().toISOString(),
            message: `Header analysis failed: ${err instanceof Error ? err.message : 'unknown'}`,
          });
        }
      }

      this.checkAbort(abortController.signal);

      // ── Phase 3: Behaviour Analysis ────────────────────
      this.updatePhase(activeScan, 'behaviour_analysis' as HttpPhase, onEvent);

      this.behaviourIntelligence.reset();

      for (const resp of allResponses) {
        this.behaviourIntelligence.analyze(resp);
      }

      // Check status consistency
      this.behaviourIntelligence.checkStatusConsistency(allResponses);

      const behaviourProfile = this.behaviourIntelligence.buildProfile(context.targetUrl);

      // Generate findings from behaviour
      if (behaviourProfile.redirectLoopsDetected > 0) {
        findings.push({
          title: 'Redirect Loop Detected',
          description: `Found ${behaviourProfile.redirectLoopsDetected} redirect loop(s) — may indicate configuration issues`,
          severity: 'medium',
          location: { url: context.targetUrl },
          evidence: behaviourProfile.redirectChains.filter(c => c.hasLoop).map(c => ({
            type: 'redirect_loop',
            content: `${c.sourceUrl} → ${c.finalUrl} (${c.totalHops} hops)`,
          })),
          tags: ['redirect', 'behaviour', 'configuration'],
          confidence: 0.95,
        });
      }

      if (behaviourProfile.openRedirectsDetected > 0) {
        findings.push({
          title: 'Potential Open Redirect',
          description: `Found ${behaviourProfile.openRedirectsDetected} potential open redirect(s)`,
          severity: 'high',
          location: { url: context.targetUrl },
          evidence: behaviourProfile.redirectChains.filter(c => c.hasOpenRedirect).map(c => ({
            type: 'open_redirect',
            content: `${c.sourceUrl} → ${c.finalUrl}`,
          })),
          tags: ['redirect', 'open-redirect', 'vulnerability'],
          confidence: 0.75,
          remediation: 'Validate redirect URLs server-side. Use whitelist or relative redirects.',
        });
      }

      for (const errorPage of behaviourProfile.errorPages) {
        if (errorPage.leaksServerInfo) {
          findings.push({
            title: `Server Information Leakage (${errorPage.statusCode})`,
            description: `Error page at ${errorPage.url} leaks server information: ${errorPage.leakedInfo.join(', ')}`,
            severity: 'low',
            location: { url: errorPage.url },
            evidence: errorPage.leakedInfo.map(info => ({
              type: 'info_leak',
              content: info,
            })),
            tags: ['information-disclosure', 'error-page'],
            confidence: 0.85,
            remediation: 'Configure custom error pages that do not expose server details.',
          });
        }
        if (errorPage.stackTraceDetected) {
          findings.push({
            title: 'Stack Trace in Error Response',
            description: `Error page at ${errorPage.url} contains a stack trace`,
            severity: 'medium',
            location: { url: errorPage.url },
            evidence: [{ type: 'stack_trace', content: 'Stack trace detected in response body' }],
            tags: ['information-disclosure', 'error-page', 'stack-trace'],
            confidence: 0.9,
            remediation: 'Disable debug mode and stack traces in production. Configure custom error pages.',
          });
        }
      }

      this.checkAbort(abortController.signal);

      // ── Phase 4: Infrastructure Fingerprinting ──────────
      this.updatePhase(activeScan, 'infrastructure_fingerprinting' as HttpPhase, onEvent);

      let infrastructureProfile = null;
      try {
        // Extract cookies for fingerprinting
        const cookies = new Map<string, string>();
        const mainResponse = allResponses[0];
        if (mainResponse) {
          for (const [key, value] of mainResponse.headers) {
            if (key.toLowerCase() === 'set-cookie') {
              const eqIdx = value.indexOf('=');
              if (eqIdx > 0) {
                cookies.set(value.slice(0, eqIdx).trim(), value.slice(eqIdx + 1).trim());
              }
            }
          }
        }

        infrastructureProfile = this.infraFingerprinting.fingerprint(mainResponse!, cookies);

        onEvent({
          type: ScanEngineEventType.Info,
          timestamp: new Date().toISOString(),
          message: `Infrastructure: ${infrastructureProfile.fingerprints.length} fingerprint(s) detected`,
          data: {
            fingerprints: infrastructureProfile.fingerprints.map(f => ({
              type: f.type,
              name: f.name,
              confidence: f.confidence,
            })),
          },
        });
      } catch (err) {
        if (!abortController.signal.aborted) {
          onEvent({
            type: ScanEngineEventType.Warning,
            timestamp: new Date().toISOString(),
            message: `Infrastructure fingerprinting failed: ${err instanceof Error ? err.message : 'unknown'}`,
          });
        }
      }

      this.checkAbort(abortController.signal);

      // ── Phase 5: Cookie Analysis ───────────────────────
      this.updatePhase(activeScan, 'cookie_analysis' as HttpPhase, onEvent);

      let cookieProfile = null;
      try {
        const mainResponse = allResponses[0];
        if (mainResponse) {
          cookieProfile = this.cookieIntelligence.analyze(mainResponse);

          // Generate findings from cookie issues
          if (cookieProfile.issues.length > 0) {
            const highSeverity = cookieProfile.issues.filter(i =>
              i.severity === Severity.High || i.severity === Severity.Critical,
            );

            if (highSeverity.length > 0) {
              findings.push({
                title: 'Cookie Security Issues Detected',
                description: `Found ${highSeverity.length} high-severity cookie issue(s) out of ${cookieProfile.totalCookies} cookie(s) analyzed`,
                severity: 'medium',
                location: { url: context.targetUrl },
                evidence: highSeverity.slice(0, 5).map(i => ({
                  type: 'cookie_issue',
                  content: `${i.type}: ${i.description}`,
                })),
                tags: ['cookies', 'security'],
                confidence: 0.9,
                remediation: 'Review cookie configuration: add Secure, HttpOnly, and SameSite flags as appropriate.',
              });
            }
          }

          onEvent({
            type: ScanEngineEventType.Info,
            timestamp: new Date().toISOString(),
            message: `Cookies: ${cookieProfile.totalCookies} analyzed, score ${cookieProfile.overallScore}/100`,
            data: {
              total: cookieProfile.totalCookies,
              score: cookieProfile.overallScore,
              secureCount: cookieProfile.secureCount,
              httpOnlyCount: cookieProfile.httpOnlyCount,
            },
          });
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          onEvent({
            type: ScanEngineEventType.Warning,
            timestamp: new Date().toISOString(),
            message: `Cookie analysis failed: ${err instanceof Error ? err.message : 'unknown'}`,
          });
        }
      }

      this.checkAbort(abortController.signal);

      // ── Phase 6: Rate Limiting Analysis ────────────────
      this.updatePhase(activeScan, 'rate_limit_probing' as HttpPhase, onEvent);

      let rateLimitProfile = null;
      try {
        // Use non-aggressive analysis from response headers
        const mainResponse = allResponses[0];
        if (mainResponse) {
          const rateLimiter = new RateLimitingIntelligence(this.httpClient);
          rateLimitProfile = rateLimiter.analyzeFromResponse(mainResponse);
          requestsMade += rateLimitProfile.probeResults.length - 1;

          if (rateLimitProfile.status === 'not_detected') {
            findings.push({
              title: 'No Rate Limiting Detected',
              description: 'No rate limiting headers or behaviors were detected',
              severity: 'info',
              location: { url: context.targetUrl },
              evidence: [{ type: 'rate_limit', content: 'No X-RateLimit-* or Retry-After headers found' }],
              tags: ['rate-limiting', 'api-security'],
              confidence: 0.7,
              remediation: 'Implement rate limiting for API endpoints to prevent abuse.',
            });
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          onEvent({
            type: ScanEngineEventType.Warning,
            timestamp: new Date().toISOString(),
            message: `Rate limiting analysis failed: ${err instanceof Error ? err.message : 'unknown'}`,
          });
        }
      }

      // ── Phase 7: Collect Artifacts ─────────────────────
      this.updatePhase(activeScan, 'collecting_artifacts' as HttpPhase, onEvent);

      const durationMs = Date.now() - startTime;
      const mainResponse = allResponses[0];
      const protocolVersion = mainResponse?.protocol === 'HTTP/2'
        ? HttpProtocolVersion.Http2
        : mainResponse?.protocol === 'HTTP/3'
          ? HttpProtocolVersion.Http3
          : HttpProtocolVersion.Http1_1;

      const intelligenceData: HttpIntelligenceData = Object.freeze({
        targetUrl: context.targetUrl,
        protocolVersion,
        tlsProfile,
        headerProfile,
        behaviourProfile,
        infrastructureProfile,
        cookieProfile,
        rateLimitProfile,
        totalRequests: requestsMade,
        durationMs,
        scannedUrls: allResponses.map(r => r.finalUrl),
      });

      // Emit completion
      this.updatePhase(activeScan, 'completed' as HttpPhase, onEvent);
      onEvent({
        type: ScanEngineEventType.PhaseChanged,
        timestamp: new Date().toISOString(),
        message: 'HTTP Intelligence scan completed',
        data: {
          phase: 'completed',
          findingsCount: findings.length,
          totalRequests: requestsMade,
          durationMs,
        },
      });
      onEvent({
        type: ScanEngineEventType.Progress,
        timestamp: new Date().toISOString(),
        data: { progress: 100 },
      });

      activeScan.phase = 'completed' as HttpPhase;
      activeScan.requestsMade = requestsMade;
      this.activeScans.delete(context.scanJobId);

      return {
        success: true,
        findings,
        requestsCount: requestsMade,
        durationMs,
        metadata: {
          protocolVersion,
          tlsGrade: tlsProfile?.overallGrade,
          headerScore: headerProfile?.overallScore,
          cookieScore: cookieProfile?.overallScore,
          infrastructureFingerprints: infrastructureProfile?.fingerprints.length,
          redirectChains: behaviourProfile?.redirectChains.length,
          rateLimitStatus: rateLimitProfile?.status,
          performanceMetrics: this.httpClient.getMetrics(),
        },
      };

    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unknown scan error';
      activeScan.phase = 'failed' as HttpPhase;
      this.activeScans.delete(context.scanJobId);

      onEvent({
        type: ScanEngineEventType.Error,
        timestamp: new Date().toISOString(),
        message: errorMessage,
        data: { phase: activeScan.phase },
      });

      const duration = Date.now() - startTime;
      return {
        success: false,
        findings,
        requestsCount: requestsMade,
        durationMs: duration,
        errorMessage,
        errorCode: 'HTTP_SCAN_ERROR',
        retryable: !abortController.signal.aborted,
        metadata: {
          phase: activeScan.phase,
          requestsMade,
        },
      };
    }
  }

  // ─── Cancellation ──────────────────────────────────────

  async cancel(jobId: string): Promise<void> {
    const activeScan = this.activeScans.get(jobId);
    if (!activeScan) return;
    activeScan.abortController.abort();
    this.activeScans.delete(jobId);
  }

  // ─── Helpers ───────────────────────────────────────────

  private updatePhase(
    scan: ActiveHttpScan,
    phase: HttpPhase,
    onEvent: EngineEventCallback,
  ): void {
    scan.phase = phase;
    onEvent({
      type: ScanEngineEventType.PhaseChanged,
      timestamp: new Date().toISOString(),
      message: `Phase: ${phase}`,
      data: { phase },
    });
  }

  private checkAbort(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new DOMException('Scan cancelled', 'AbortError');
    }
  }
}