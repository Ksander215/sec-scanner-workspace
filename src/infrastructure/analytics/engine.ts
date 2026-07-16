/** INT-018: Analytics — Engine */
import type {
  Dashboard, DashboardWidget, ExecutiveReport, ReportSection,
  TrendAnalysis, TrendDataPoint, RiskForecast, ComplianceReport,
  ComplianceControl, KpiDefinition, KpiValue,
} from './types.js';

export class AnalyticsEngine {
  private dashboards: Map<string, Dashboard> = new Map();
  private kpis: Map<string, KpiDefinition> = new Map();
  private complianceFrameworks: Map<string, ComplianceReport> = new Map();

  // ─── Dashboards ─────────────────────────────────────────────────────────

  createDashboard(name: string, description: string, widgets: DashboardWidget[], refreshIntervalMs?: number): Dashboard {
    const dashboard: Dashboard = {
      id: crypto.randomUUID(),
      name,
      description,
      widgets,
      filters: [],
      refreshIntervalMs: refreshIntervalMs ?? 30000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.dashboards.set(dashboard.id, dashboard);
    return dashboard;
  }

  getDashboard(id: string): Dashboard | undefined { return this.dashboards.get(id); }

  listDashboards(): Dashboard[] { return [...this.dashboards.values()]; }

  updateDashboard(id: string, updates: Partial<Pick<Dashboard, 'name' | 'description' | 'widgets' | 'filters' | 'refreshIntervalMs'>>): Dashboard | null {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return null;
    Object.assign(dashboard, updates, { updatedAt: new Date() });
    return dashboard;
  }

  deleteDashboard(id: string): boolean { return this.dashboards.delete(id); }

  // ─── Executive Reports ──────────────────────────────────────────────────

  generateExecutiveReport(
    title: string,
    period: { from: Date; to: Date },
    sections: ReportSection[],
    format: 'pdf' | 'html' | 'json' = 'json',
  ): ExecutiveReport {
    return {
      id: crypto.randomUUID(),
      title,
      period,
      sections,
      generatedAt: new Date(),
      format,
    };
  }

  generateDefaultExecutiveReport(period: { from: Date; to: Date }): ExecutiveReport {
    return this.generateExecutiveReport('Security Intelligence Executive Report', period, [
      { title: 'Executive Summary', type: 'summary', content: { overview: 'Security posture summary', topRisks: 3, openFindings: 0 } },
      { title: 'Risk Trends', type: 'risk-trend', content: { direction: 'improving', changePercent: -15 } },
      { title: 'Top Risks', type: 'top-risks', content: { risks: [] } },
      { title: 'Compliance Status', type: 'compliance', content: { score: 85, status: 'partially-compliant' } },
      { title: 'Key Performance Indicators', type: 'kpi', content: { kpis: [] } },
      { title: 'Recommendations', type: 'recommendations', content: { recommendations: [] } },
    ]);
  }

  // ─── Trend Analysis ─────────────────────────────────────────────────────

  analyzeTrend(metric: string, dataPoints: TrendDataPoint[]): TrendAnalysis {
    if (dataPoints.length < 2) {
      return { metric, period: 'unknown', dataPoints, trend: 'stable', changePercent: 0 };
    }

    const first = dataPoints[0].value;
    const last = dataPoints[dataPoints.length - 1].value;
    const changePercent = first !== 0 ? ((last - first) / first) * 100 : 0;

    const trend = changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable';

    return {
      metric,
      period: `${dataPoints[0].timestamp.toISOString()} - ${dataPoints[dataPoints.length - 1].timestamp.toISOString()}`,
      dataPoints,
      trend,
      changePercent,
    };
  }

  // ─── Risk Forecasting ───────────────────────────────────────────────────

  forecastRisk(metric: string, currentValue: number, factors: Array<{ name: string; impact: number; direction: 'increasing' | 'decreasing' | 'stable'; description: string }>): RiskForecast {
    const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
    const forecastValue = Math.max(0, Math.min(100, currentValue + totalImpact));

    return {
      metric,
      currentValue,
      forecastValue,
      forecastDate: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days
      confidence: 0.7,
      factors,
    };
  }

  // ─── Compliance ─────────────────────────────────────────────────────────

  generateComplianceReport(framework: string, version: string, controls: ComplianceControl[]): ComplianceReport {
    const totalControls = controls.filter(c => c.status !== 'not-applicable').length;
    const passingControls = controls.filter(c => c.status === 'pass').length;
    const score = totalControls > 0 ? (passingControls / totalControls) * 100 : 0;

    const report: ComplianceReport = {
      framework,
      version,
      status: score >= 90 ? 'compliant' : score >= 70 ? 'partially-compliant' : 'non-compliant',
      score,
      controls,
      generatedAt: new Date(),
    };

    this.complianceFrameworks.set(`${framework}-${version}`, report);
    return report;
  }

  getComplianceReport(framework: string): ComplianceReport | undefined {
    return this.complianceFrameworks.get(framework);
  }

  // ─── KPIs ───────────────────────────────────────────────────────────────

  defineKpi(kpi: Omit<KpiDefinition, 'id'>): KpiDefinition {
    const definition: KpiDefinition = { ...kpi, id: crypto.randomUUID() };
    this.kpis.set(definition.id, definition);
    return definition;
  }

  calculateKpi(kpiId: string, value: number, period: string): KpiValue | null {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return null;

    const percentageToTarget = kpi.target !== 0 ? (value / kpi.target) * 100 : 0;

    return {
      kpiId,
      value,
      target: kpi.target,
      percentageToTarget,
      trend: kpi.direction === 'higher-is-better'
        ? (value >= kpi.target ? 'up' : 'down')
        : (value <= kpi.target ? 'down' : 'up'),
      period,
      calculatedAt: new Date(),
    };
  }

  listKpis(): KpiDefinition[] { return [...this.kpis.values()]; }

  /** Get default security KPIs */
  getDefaultKpis(): KpiDefinition[] {
    return [
      { id: 'kpi-mttc', name: 'Mean Time to Contain', description: 'Average time to contain a security incident', formula: 'AVG(containment_time)', target: 4 * 3600, unit: 'seconds', direction: 'lower-is-better', category: 'operations' },
      { id: 'kpi-mttd', name: 'Mean Time to Detect', description: 'Average time to detect a security event', formula: 'AVG(detection_time)', target: 1 * 3600, unit: 'seconds', direction: 'lower-is-better', category: 'operations' },
      { id: 'kpi-vuln-rate', name: 'Vulnerability Remediation Rate', description: 'Percentage of vulnerabilities remediated within SLA', formula: 'COUNT(remediated) / COUNT(total) * 100', target: 95, unit: 'percent', direction: 'higher-is-better', category: 'security' },
      { id: 'kpi-risk-score', name: 'Average Risk Score', description: 'Average risk score across all assets', formula: 'AVG(risk_score)', target: 30, unit: 'score', direction: 'lower-is-better', category: 'risk' },
      { id: 'kpi-compliance', name: 'Compliance Score', description: 'Overall compliance score across frameworks', formula: 'AVG(compliance_score)', target: 90, unit: 'percent', direction: 'higher-is-better', category: 'compliance' },
      { id: 'kpi-critical-findings', name: 'Open Critical Findings', description: 'Number of open critical severity findings', formula: 'COUNT(status=open, severity=critical)', target: 0, unit: 'count', direction: 'lower-is-better', category: 'security' },
    ];
  }
}
