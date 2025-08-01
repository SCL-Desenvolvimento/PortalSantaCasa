export interface Document {
  id?: number;
  name: string;
  parent_id?: number;
  file_url?: string;
  file_name?: string;
  is_active: boolean;
  created_at: string;
}