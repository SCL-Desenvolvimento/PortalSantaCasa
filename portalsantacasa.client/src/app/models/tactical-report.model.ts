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
  message?: string;
}
