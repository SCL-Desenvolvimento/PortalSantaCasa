export interface Event {
  id?: number;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  is_active: boolean;
  created_at: string;
}