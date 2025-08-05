export interface Event {
  id?: number;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
}