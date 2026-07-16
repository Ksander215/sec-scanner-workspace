/**
 * Security Intelligence Platform — Official TypeScript SDK
 */
import type { AnalyzeRequestDTO, AnalyzeResponseDTO, ReportDTO, FindingDTO, RiskDTO, RecommendationDTO, CorrelationDTO, AttackPathDTO, ExplanationDTO, HealthDTO, PaginatedResponse } from '../../../api/dto/types.js';
import type { SecurityIntelligenceReport } from '../../../domain/security-intelligence/orchestrator/types.js';

export interface SdkConfig {
  baseUrl: string;
  timeout?: number;
  authToken?: string;
  apiKey?: string;
}

export class SecurityIntelligenceClient {
  private baseUrl: string;
  private timeout: number;
  private authToken?: string;
  private apiKey?: string;

  constructor(config: SdkConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout ?? 30000;
    this.authToken = config.authToken;
    this.apiKey = config.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new SiApiError(response.status, error.message ?? response.statusText);
      }
      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Analysis
  async analyze(request: AnalyzeRequestDTO): Promise<AnalyzeResponseDTO> {
    return this.request('POST', '/api/v1/analyze', request);
  }

  async analyzeSync(request: AnalyzeRequestDTO): Promise<SecurityIntelligenceReport> {
    return this.request('POST', '/api/v1/analyze/sync', request);
  }

  // Reports
  async listReports(limit = 100, offset = 0): Promise<PaginatedResponse<ReportDTO>> {
    return this.request('GET', `/api/v1/reports?limit=${limit}&offset=${offset}`);
  }

  async getReport(id: string): Promise<SecurityIntelligenceReport> {
    return this.request('GET', `/api/v1/reports/${id}`);
  }

  async getReportSummary(id: string): Promise<Record<string, unknown>> {
    return this.request('GET', `/api/v1/reports/${id}/summary`);
  }

  async deleteReport(id: string): Promise<void> {
    return this.request('DELETE', `/api/v1/reports/${id}`);
  }

  // Findings
  async listFindings(reportId: string, limit = 100, offset = 0): Promise<PaginatedResponse<FindingDTO>> {
    return this.request('GET', `/api/v1/findings?reportId=${reportId}&limit=${limit}&offset=${offset}`);
  }

  async getFinding(id: string): Promise<FindingDTO> {
    return this.request('GET', `/api/v1/findings/${id}`);
  }

  async searchFindings(query: string, limit = 100, offset = 0): Promise<PaginatedResponse<FindingDTO>> {
    return this.request('GET', `/api/v1/findings/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
  }

  // Risk
  async listRisks(reportId: string): Promise<PaginatedResponse<RiskDTO>> {
    return this.request('GET', `/api/v1/risks?reportId=${reportId}`);
  }

  async getRiskSummary(reportId: string): Promise<Record<string, unknown>> {
    return this.request('GET', `/api/v1/risks/summary?reportId=${reportId}`);
  }

  async getTopRisks(limit = 10): Promise<PaginatedResponse<RiskDTO>> {
    return this.request('GET', `/api/v1/risks/top?limit=${limit}`);
  }

  // Attack Paths
  async listAttackPaths(reportId: string): Promise<PaginatedResponse<AttackPathDTO>> {
    return this.request('GET', `/api/v1/attack-paths?reportId=${reportId}`);
  }

  async getAttackGraph(reportId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/attack-paths/graph?reportId=${reportId}`);
  }

  // Recommendations
  async listRecommendations(reportId: string): Promise<PaginatedResponse<RecommendationDTO>> {
    return this.request('GET', `/api/v1/recommendations?reportId=${reportId}`);
  }

  async createRemediationPlan(reportId: string): Promise<unknown> {
    return this.request('POST', '/api/v1/recommendations/plan', { reportId });
  }

  // Explainability
  async listExplanations(reportId: string): Promise<PaginatedResponse<ExplanationDTO>> {
    return this.request('GET', `/api/v1/explanations?reportId=${reportId}`);
  }

  async getExplanation(targetId: string): Promise<ExplanationDTO> {
    return this.request('GET', `/api/v1/explanations/${targetId}`);
  }

  // Health
  async getHealth(): Promise<HealthDTO> {
    return this.request('GET', '/health');
  }

  // Snapshots
  async createSnapshot(reportId: string, description?: string): Promise<{ snapshotId: string }> {
    return this.request('POST', '/api/v1/snapshots', { reportId, description });
  }

  async restoreSnapshot(snapshotId: string): Promise<SecurityIntelligenceReport> {
    return this.request('POST', `/api/v1/snapshots/${snapshotId}/restore`);
  }
}

export class SiApiError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(`API Error ${statusCode}: ${message}`);
    this.name = 'SiApiError';
  }
}
