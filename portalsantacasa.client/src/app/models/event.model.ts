export interface Event {
  id?: number;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  mediaUrl?: string;
  isActive: boolean;
  createdAt: Date;
  responsibleName: string;
}
