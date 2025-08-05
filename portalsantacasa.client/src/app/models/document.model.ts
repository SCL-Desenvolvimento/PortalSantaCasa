export interface Document {
  id?: number;
  name: string;
  parentId?: number;
  fileUrl?: string;
  fileName?: string;
  isActive: boolean;
  createdAt: string;
}
