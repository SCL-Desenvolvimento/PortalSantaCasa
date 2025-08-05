export interface News {
  id?: number;
  title: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}
