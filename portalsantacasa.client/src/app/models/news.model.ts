export interface News {
  id?: number;
  title: string;
  summary?: string;
  content?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}
