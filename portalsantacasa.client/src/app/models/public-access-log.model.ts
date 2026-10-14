export interface PublicAccessLogCreate {
  name: string;
  re: string;
  employmentType?: 'CLT' | 'PJ';
  sector: string;
  page: string;
  contentId?: number;
  contentTitle?: string;
}

export interface PublicAccessLog {
  id: number;
  name: string;
  re: string;
  employmentType?: 'CLT' | 'PJ';
  sector: string;
  page: string;
  contentId?: number;
  contentTitle?: string;
  accessedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PaginatedPublicAccessLog {
  currentPage: number;
  perPage: number;
  total: number;
  pages: number;
  logs: PublicAccessLog[];
}

export interface PublicAccessLogContentOption {
  id: number;
  title: string;
}
