export interface Event {
  id?: number;
  title: string;
  description?: string;
  eventDate: Date;
  location?: string;
  isActive: boolean;
  createdAt: Date;
}
