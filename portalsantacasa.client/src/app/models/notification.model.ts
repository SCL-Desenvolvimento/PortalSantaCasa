export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
  NotificationDate?: string;
}
