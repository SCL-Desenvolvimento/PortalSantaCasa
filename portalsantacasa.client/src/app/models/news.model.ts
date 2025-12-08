export interface News {
  id?: number;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  isActive: boolean;
  isQualityMinute: boolean;
  createdAt: string;
  authorName?: string;
  department?: string;
  category: string;
}
