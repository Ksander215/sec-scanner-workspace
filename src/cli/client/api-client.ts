import type { CliConfig } from '../config/types.js';
import type { AnalyzeRequestDTO, AnalyzeResponseDTO } from '../../api/dto/types.js';
import type { SecurityIntelligenceReport } from '../../domain/security-intelligence/orchestrator/types.js';

export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private token?: string;

  constructor(config: CliConfig) {
    this.baseUrl = config.api.url;
    this.timeout = config.api.timeout;
    this.token = config.auth.token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

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
        const errorBody = await response.json().catch(() => ({ message: response.statusText })) as Record<string, unknown>;
        throw new Error(`API error ${response.status}: ${(errorBody.message as string) ?? response.statusText}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async analyze(request: AnalyzeRequestDTO): Promise<AnalyzeResponseDTO> {
    return this.request<AnalyzeResponseDTO>('POST', '/api/v1/analyze', request);
  }

  async analyzeSync(request: AnalyzeRequestDTO): Promise<SecurityIntelligenceReport> {
    return this.request<SecurityIntelligenceReport>('POST', '/api/v1/analyze/sync', request);
  }

  async listReports(limit = 100, offset = 0): Promise<any> {
    return this.request<any>('GET', `/api/v1/reports?limit=${limit}&offset=${offset}`);
  }

  async getReport(id: string): Promise<SecurityIntelligenceReport> {
    return this.request<SecurityIntelligenceReport>('GET', `/api/v1/reports/${id}`);
  }

  async getReportSummary(id: string): Promise<any> {
    return this.request<any>('GET', `/api/v1/reports/${id}/summary`);
  }

  async deleteReport(id: string): Promise<any> {
    return this.request<any>('DELETE', `/api/v1/reports/${id}`);
  }

  async listFindings(reportId: string, limit = 100, offset = 0): Promise<any> {
    return this.request<any>('GET', `/api/v1/findings?reportId=${reportId}&limit=${limit}&offset=${offset}`);
  }

  async getFinding(id: string): Promise<any> {
    return this.request<any>('GET', `/api/v1/findings/${id}`);
  }

  async searchFindings(query: string, limit = 100, offset = 0): Promise<any> {
    return this.request<any>('GET', `/api/v1/findings/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
  }

  async getRisks(reportId: string): Promise<any> {
    return this.request<any>('GET', `/api/v1/risks?reportId=${reportId}`);
  }

  async getRiskSummary(reportId: string): Promise<any> {
    return this.request<any>('GET', `/api/v1/risks/summary?reportId=${reportId}`);
  }

  async getTopRisks(limit = 10): Promise<any> {
    return this.request<any>('GET', `/api/v1/risks/top?limit=${limit}`);
  }

  async getAttackPaths(reportId: string): Promise<any> {
    return this.request<any>('GET', `/api/v1/attack-paths?reportId=${reportId}`);
  }

  async getAttackGraph(reportId: string): Promise<any> {
    return this.request<any>('GET', `/api/v1/attack-paths/graph?reportId=${reportId}`);
  }

  async getRecommendations(reportId: string): Promise<any> {
    return this.request<any>('GET', `/api/v1/recommendations?reportId=${reportId}`);
  }

  async createRemediationPlan(reportId: string): Promise<any> {
    return this.request<any>('POST', '/api/v1/recommendations/plan', { reportId });
  }

  async getExplanations(reportId: string): Promise<any> {
    return this.request<any>('GET', `/api/v1/explanations?reportId=${reportId}`);
  }

  async getExplanation(targetId: string): Promise<any> {
    return this.request<any>('GET', `/api/v1/explanations/${targetId}`);
  }

  async createSnapshot(reportId: string, description?: string): Promise<any> {
    return this.request<any>('POST', '/api/v1/snapshots', { reportId, description });
  }

  async restoreSnapshot(snapshotId: string): Promise<any> {
    return this.request<any>('POST', `/api/v1/snapshots/${snapshotId}/restore`);
  }

  async getStorageStatistics(): Promise<any> {
    return this.request<any>('GET', '/api/v1/storage/statistics');
  }

  async getHealth(): Promise<any> {
    return this.request<any>('GET', '/health');
  }
}
