export interface TacticalReportDefinition {
  slug: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  endpoints: string[];
  requiresAgent: boolean;
}

export interface TacticalReportResult {
  report: TacticalReportDefinition;
  configured: boolean;
  generatedAt: string;
  rows: Record<string, unknown>[];
  summary: Record<string, number>;
  presentation: TacticalReportPresentation;
  message?: string;
}

export interface TacticalReportPresentation {
  metrics: TacticalMetric[];
  charts: TacticalChart[];
  insights: TacticalInsight[];
  columns: TacticalColumn[];
  rows: Record<string, unknown>[];
}

export interface TacticalMetric { label: string; value: string; detail: string; tone: string; icon: string; }
export interface TacticalChartPoint { label: string; value: number; color: string; }
export interface TacticalChart { title: string; type: 'bar' | 'donut'; data: TacticalChartPoint[]; }
export interface TacticalInsight { severity: string; title: string; description: string; recommendation: string; }
export interface TacticalColumn { key: string; label: string; format: string; }
