/** INT-018: Analytics — Types */

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  refreshIntervalMs: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'line-chart' | 'bar-chart' | 'pie-chart' | 'stat-card' | 'table' | 'heatmap' | 'gauge' | 'treemap';
  title: string;
  dataSource: WidgetDataSource;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}

export interface WidgetDataSource {
  type: 'query' | 'metric' | 'realtime';
  query?: string;
  metricName?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'percentile';
  groupBy?: string;
  timeRange?: string;
}

export interface DashboardFilter {
  name: string;
  field: string;
  type: 'select' | 'multiselect' | 'date-range' | 'text';
  defaultValue?: unknown;
  options?: string[];
}

export interface ExecutiveReport {
  id: string;
  title: string;
  period: { from: Date; to: Date };
  sections: ReportSection[];
  generatedAt: Date;
  format: 'pdf' | 'html' | 'json';
}

export interface ReportSection {
  title: string;
  type: 'summary' | 'findings-table' | 'risk-trend' | 'compliance' | 'top-risks' | 'kpi' | 'recommendations';
  content: Record<string, unknown>;
}

export interface TrendAnalysis {
  metric: string;
  period: string;
  dataPoints: TrendDataPoint[];
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  forecast?: TrendDataPoint[];
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface RiskForecast {
  metric: string;
  currentValue: number;
  forecastValue: number;
  forecastDate: Date;
  confidence: number;
  factors: ForecastFactor[];
}

export interface ForecastFactor {
  name: string;
  impact: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  description: string;
}

export interface ComplianceReport {
  framework: string;
  version: string;
  status: 'compliant' | 'partially-compliant' | 'non-compliant';
  score: number;
  controls: ComplianceControl[];
  generatedAt: Date;
}

export interface ComplianceControl {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'not-applicable' | 'not-assessed';
  evidence: string[];
  remediation?: string;
}

export interface KpiDefinition {
  id: string;
  name: string;
  description: string;
  formula: string;
  target: number;
  unit: string;
  direction: 'higher-is-better' | 'lower-is-better';
  category: 'security' | 'operations' | 'risk' | 'compliance';
}

export interface KpiValue {
  kpiId: string;
  value: number;
  target: number;
  percentageToTarget: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
  calculatedAt: Date;
}
