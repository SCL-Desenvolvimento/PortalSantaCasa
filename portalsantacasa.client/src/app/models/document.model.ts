export interface Document {
  id?: number;
  name: string;
  parentId?: number;
  fileUrl?: string | null;
  fileName?: string;
  isActive: boolean;
  createdAt: string;

  // campos auxiliares
  expanded?: boolean;     // controla se a pasta está expandida
  children?: Document[];  // estrutura em árvore
}
