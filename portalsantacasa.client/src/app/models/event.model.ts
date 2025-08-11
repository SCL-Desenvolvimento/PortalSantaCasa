export interface Event {
  id?: number;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  isActive: boolean;
  createdAt: Date;
}
