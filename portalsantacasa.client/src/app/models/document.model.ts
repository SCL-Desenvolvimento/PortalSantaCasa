export interface Document {
  id?: number;
  name: string;
  parentId?: number;
  fileUrl?: string | null;
  fileName?: string;
  isActive: boolean;
  createdAt: string;
}
