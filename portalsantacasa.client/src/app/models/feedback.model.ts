export interface Feedback {
  id?: number;
  name: string;
  email?: string;
  department?: string;
  category: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
