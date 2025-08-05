export interface Document {
  id?: number;
  name: string;
  parent_id?: number;
  file_url?: string;
  file_name?: string;
  isActive: boolean;
  createdAt: string;
}