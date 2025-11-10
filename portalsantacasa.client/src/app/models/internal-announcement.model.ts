export interface InternalAnnouncement {
  id?: number;
  title: string;
  content: string;
  publishDate: Date;
  expirationDate?: Date;
  isActive: boolean;
  userId: number;
  userName?: string;
  showMask: boolean;
}

export interface PaginatedInternalAnnouncement {
  items: InternalAnnouncement[];
  currentPage: number;
  perPage: number;
  totalPages: number;
  totalCount: number;
}
